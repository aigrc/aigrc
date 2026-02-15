/**
 * CGA Certificate Auto-Renewal Service
 *
 * Handles automatic renewal of CGA certificates before expiration.
 * Supports webhook notifications and renewal policies.
 */

import { cga } from "@aigrc/core";
import { CADatabase, CertificateRecord } from "../db/client.js";
import { SigningService } from "./signing.js";
import YAML from "yaml";

export interface RenewalConfig {
  /** Days before expiration to start renewal process */
  renewalWindowDays: number;
  /** Whether to auto-renew without verification */
  autoRenewEnabled: boolean;
  /** Webhook URL for renewal notifications */
  webhookUrl?: string;
  /** Maximum level for auto-renewal (higher levels require re-verification) */
  maxAutoRenewLevel: cga.CGALevel;
}

export interface RenewalResult {
  certificateId: string;
  success: boolean;
  newCertificateId?: string;
  error?: string;
  requiresVerification?: boolean;
}

export interface RenewalServiceOptions {
  db: CADatabase;
  signingService: SigningService;
  config: RenewalConfig;
}

/**
 * Certificate Renewal Service
 */
export class RenewalService {
  private db: CADatabase;
  private signingService: SigningService;
  private config: RenewalConfig;

  constructor(options: RenewalServiceOptions) {
    this.db = options.db;
    this.signingService = options.signingService;
    this.config = options.config;
  }

  /**
   * Process renewals for all expiring certificates
   */
  async processRenewals(): Promise<RenewalResult[]> {
    const results: RenewalResult[] = [];

    // Get certificates expiring within renewal window
    const expiring = this.db.getExpiringCertificates(this.config.renewalWindowDays);

    for (const cert of expiring) {
      const result = await this.processCertificateRenewal(cert);
      results.push(result);
    }

    return results;
  }

  /**
   * Process renewal for a single certificate
   */
  async processCertificateRenewal(cert: CertificateRecord): Promise<RenewalResult> {
    // Check if level allows auto-renewal
    const levelOrder: cga.CGALevel[] = ["BRONZE", "SILVER", "GOLD", "PLATINUM"];
    const certLevelIndex = levelOrder.indexOf(cert.level);
    const maxLevelIndex = levelOrder.indexOf(this.config.maxAutoRenewLevel);

    if (certLevelIndex > maxLevelIndex) {
      // Level too high for auto-renewal, requires re-verification
      await this.sendRenewalNotification(cert, "verification_required");

      return {
        certificateId: cert.id,
        success: false,
        requiresVerification: true,
        error: `Level ${cert.level} requires re-verification for renewal`,
      };
    }

    if (!this.config.autoRenewEnabled) {
      // Auto-renewal disabled, send notification only
      await this.sendRenewalNotification(cert, "expiring_soon");

      return {
        certificateId: cert.id,
        success: false,
        error: "Auto-renewal disabled",
      };
    }

    try {
      // Parse existing certificate
      const existingCert = YAML.parse(cert.certificate_yaml) as cga.CGACertificate;

      // Create renewed certificate
      const renewedCert = await this.createRenewedCertificate(existingCert);

      // Sign the renewed certificate
      const signedCert = await this.signingService.signCertificate(renewedCert);

      // Mark old certificate as superseded
      this.db.updateCertificateStatus(cert.id, "superseded", "Renewed");

      // Store new certificate
      this.db.insertCertificate({
        id: signedCert.metadata.id,
        agent_id: signedCert.spec.agent.id,
        agent_version: signedCert.spec.agent.version,
        organization_id: signedCert.spec.agent.organization.id,
        organization_name: signedCert.spec.agent.organization.name,
        organization_domain: signedCert.spec.agent.organization.domain ?? null,
        level: signedCert.spec.certification.level,
        golden_thread_hash: signedCert.spec.agent.golden_thread.hash,
        golden_thread_algorithm: signedCert.spec.agent.golden_thread.algorithm,
        issued_at: signedCert.spec.certification.issued_at,
        expires_at: signedCert.spec.certification.expires_at,
        certificate_yaml: YAML.stringify(signedCert),
        signature_algorithm: signedCert.signature.algorithm,
        signature_key_id: signedCert.signature.key_id,
        signature_value: signedCert.signature.value,
        status: "active",
        revoked_at: null,
        revocation_reason: null,
      });

      // Audit log
      this.db.audit(
        "certificate_renewed",
        "certificate",
        signedCert.metadata.id,
        "system",
        undefined,
        JSON.stringify({
          previousCertificateId: cert.id,
          newCertificateId: signedCert.metadata.id,
          level: signedCert.spec.certification.level,
        })
      );

      // Send success notification
      await this.sendRenewalNotification(cert, "renewed", signedCert.metadata.id);

      return {
        certificateId: cert.id,
        success: true,
        newCertificateId: signedCert.metadata.id,
      };
    } catch (error) {
      // Audit log failure
      this.db.audit(
        "certificate_renewal_failed",
        "certificate",
        cert.id,
        "system",
        undefined,
        JSON.stringify({
          error: error instanceof Error ? error.message : "Unknown error",
        })
      );

      return {
        certificateId: cert.id,
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Create a renewed certificate from existing one
   */
  private async createRenewedCertificate(
    existing: cga.CGACertificate
  ): Promise<cga.CGACertificate> {
    const now = new Date();
    const validityDays = cga.LEVEL_REQUIREMENTS[existing.spec.certification.level].validity_days;
    const expiresAt = new Date(now.getTime() + validityDays * 24 * 60 * 60 * 1000);

    // Generate new certificate ID
    const dateStr = now.toISOString().split("T")[0].replace(/-/g, "");
    const agentShort = existing.spec.agent.id.split(":").pop() || "agent";
    const newId = `cga-${dateStr}-${agentShort}-${existing.spec.certification.level.toLowerCase()}-renew`;

    const renewed: cga.CGACertificate = {
      ...existing,
      metadata: {
        ...existing.metadata,
        id: newId,
        version: existing.metadata.version + 1,
      },
      spec: {
        ...existing.spec,
        certification: {
          ...existing.spec.certification,
          issued_at: now.toISOString(),
          expires_at: expiresAt.toISOString(),
          renewal: {
            auto_renew: true,
            grace_period_days: 14,
          },
        },
      },
      signature: {
        algorithm: "ES256",
        key_id: "",
        value: "",
      },
    };

    return renewed;
  }

  /**
   * Send renewal notification webhook
   */
  private async sendRenewalNotification(
    cert: CertificateRecord,
    event: "expiring_soon" | "renewed" | "verification_required",
    newCertificateId?: string
  ): Promise<void> {
    if (!this.config.webhookUrl) {
      return;
    }

    try {
      const payload = {
        event: `cga.certificate.${event}`,
        timestamp: new Date().toISOString(),
        certificate: {
          id: cert.id,
          agent_id: cert.agent_id,
          level: cert.level,
          expires_at: cert.expires_at,
          organization_id: cert.organization_id,
        },
        new_certificate_id: newCertificateId,
      };

      await fetch(this.config.webhookUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
    } catch (error) {
      // Log but don't fail
      console.error("Failed to send renewal notification:", error);
    }
  }

  /**
   * Get certificates that will expire within window
   */
  getExpiringCertificates(): CertificateRecord[] {
    return this.db.getExpiringCertificates(this.config.renewalWindowDays);
  }

  /**
   * Request manual renewal (for high-level certificates)
   */
  async requestManualRenewal(certificateId: string): Promise<{
    success: boolean;
    verificationUrl?: string;
    error?: string;
  }> {
    const cert = this.db.getCertificate(certificateId);
    if (!cert) {
      return { success: false, error: "Certificate not found" };
    }

    // Generate verification URL
    const verificationUrl = `https://cga.aigos.io/renew/${certificateId}`;

    // Audit log
    this.db.audit(
      "manual_renewal_requested",
      "certificate",
      certificateId,
      "api",
      undefined,
      JSON.stringify({ verificationUrl })
    );

    return {
      success: true,
      verificationUrl,
    };
  }
}
