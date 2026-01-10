/**
 * CGA Certificate Generator
 *
 * Generates CGA certificates from verification reports.
 * @see SPEC-CGA-001 Section 6.1 for self-certification flow
 */

import { CGACertificate, CGALevel, LEVEL_REQUIREMENTS } from './certificate';
import { VerificationReport } from './verification-engine';

export interface CertificateGeneratorOptions {
  /** Organization ID */
  organizationId: string;
  /** Organization name */
  organizationName: string;
  /** Organization domain */
  organizationDomain?: string;
  /** Private key for signing (PEM format) */
  privateKey: string;
  /** Key ID for signature */
  keyId: string;
}

/**
 * Certificate Generator
 *
 * Generates self-signed CGA certificates for BRONZE level
 * or prepares submissions for CA-signed certificates.
 */
export class CertificateGenerator {
  constructor(private options: CertificateGeneratorOptions) {}

  /**
   * Generate certificate from verification report
   */
  async generate(
    report: VerificationReport,
    agentId: string,
    agentVersion: string,
    goldenThreadHash: string
  ): Promise<CGACertificate> {
    if (!report.achieved_level) {
      throw new Error('Cannot generate certificate: verification did not achieve target level');
    }

    const now = new Date();
    const validityDays = LEVEL_REQUIREMENTS[report.achieved_level].validity_days;
    const expiresAt = new Date(now.getTime() + validityDays * 24 * 60 * 60 * 1000);

    const certificate: CGACertificate = {
      apiVersion: 'aigos.io/v1',
      kind: 'CGACertificate',
      metadata: {
        id: this.generateCertificateId(agentId, report.achieved_level),
        version: 1,
        schema_version: '1.0.0',
      },
      spec: {
        agent: {
          id: agentId,
          version: agentVersion,
          organization: {
            id: this.options.organizationId,
            name: this.options.organizationName,
            domain: this.options.organizationDomain,
          },
          golden_thread: {
            hash: goldenThreadHash,
            algorithm: 'SHA-256',
          },
        },
        certification: {
          level: report.achieved_level,
          issuer: {
            id: this.options.organizationId, // Self-signed for BRONZE
            name: this.options.organizationName,
          },
          issued_at: now.toISOString(),
          expires_at: expiresAt.toISOString(),
          renewal: {
            auto_renew: false,
            grace_period_days: 14,
          },
        },
        governance: this.extractGovernanceAttestations(report),
      },
      signature: {
        algorithm: 'ES256',
        key_id: this.options.keyId,
        value: '', // Will be filled by sign()
      },
    };

    // Sign the certificate
    certificate.signature.value = await this.sign(certificate);

    return certificate;
  }

  /**
   * Generate unique certificate ID
   */
  private generateCertificateId(agentId: string, level: CGALevel): string {
    const date = new Date().toISOString().split('T')[0].replace(/-/g, '');
    const agentShort = agentId.split(':').pop() || 'agent';
    return `cga-${date}-${agentShort}-${level.toLowerCase()}`;
  }

  /**
   * Extract governance attestations from verification report
   */
  private extractGovernanceAttestations(report: VerificationReport) {
    const now = new Date().toISOString();

    const findCheck = (prefix: string) =>
      report.checks.find((c) => c.check.startsWith(prefix));

    return {
      kill_switch: {
        status: findCheck('kill_switch')?.status === 'PASS' ? 'VERIFIED' : 'NOT_VERIFIED',
        verified_at: now,
      },
      policy_engine: {
        status: findCheck('policy_engine')?.status === 'PASS' ? 'VERIFIED' : 'NOT_VERIFIED',
        verified_at: now,
      },
      golden_thread: {
        status: findCheck('identity.golden_thread')?.status === 'PASS' ? 'VERIFIED' : 'NOT_VERIFIED',
        verified_at: now,
      },
      capability_bounds: {
        status: findCheck('capability')?.status === 'PASS' ? 'VERIFIED' : 'NOT_APPLICABLE',
        verified_at: now,
      },
      telemetry: {
        status: findCheck('telemetry')?.status === 'PASS' ? 'VERIFIED' : 'NOT_APPLICABLE',
        verified_at: now,
      },
    } as const;
  }

  /**
   * Sign the certificate
   */
  private async sign(certificate: CGACertificate): Promise<string> {
    // TODO: Implement ES256 signing
    // For now, return placeholder
    return 'PLACEHOLDER_SIGNATURE';
  }
}
