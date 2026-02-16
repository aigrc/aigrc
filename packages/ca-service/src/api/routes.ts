/**
 * CGA CA API Routes
 *
 * REST API endpoints for the Certificate Authority service.
 */

import { Router, Request, Response, NextFunction } from "express";
import { z } from "zod";
import { cga } from "@aigrc/core";
import { CADatabase } from "../db/client.js";
import { SigningService } from "../services/signing.js";
import { OCSPService, OCSPRequest, CertificateStatus } from "../services/ocsp.js";
import YAML from "yaml";

// ─────────────────────────────────────────────────────────────────
// Request Schemas
// ─────────────────────────────────────────────────────────────────

const SignCertificateRequestSchema = z.object({
  certificate: z.object({
    apiVersion: z.literal("aigos.io/v1"),
    kind: z.literal("CGACertificate"),
    metadata: z.object({
      id: z.string(),
      version: z.number(),
      schema_version: z.string(),
    }),
    spec: z.any(),
  }),
  verification_report: z.any().optional(),
});

const RevokeCertificateRequestSchema = z.object({
  certificate_id: z.string(),
  reason: z.string(),
  incident_id: z.string().optional(),
});

const OCSPRequestSchema = z.object({
  certificate_id: z.string(),
  nonce: z.string().optional(),
});

const VerifyRequestSchema = z.object({
  certificate_id: z.string().optional(),
  token: z.string().optional(),
  action: z.string().optional(),
});

// ─────────────────────────────────────────────────────────────────
// Router Factory
// ─────────────────────────────────────────────────────────────────

export interface APIRouterOptions {
  db: CADatabase;
  signingService: SigningService;
  ocspService: OCSPService;
}

export function createAPIRouter(options: APIRouterOptions): Router {
  const router = Router();
  const { db, signingService, ocspService } = options;

  // ─────────────────────────────────────────────────────────────────
  // Health & Info
  // ─────────────────────────────────────────────────────────────────

  /**
   * Health check
   */
  router.get("/health", (_req: Request, res: Response) => {
    res.json({
      status: "healthy",
      service: "cga-ca",
      timestamp: new Date().toISOString(),
    });
  });

  /**
   * CA Info
   */
  router.get("/info", async (_req: Request, res: Response) => {
    try {
      const publicKey = await signingService.getPublicKey();
      const keyId = await signingService.getKeyId();

      res.json({
        issuer: "cga.aigos.io",
        version: "1.0.0",
        key_id: keyId,
        public_key: JSON.parse(publicKey),
        supported_levels: ["BRONZE", "SILVER", "GOLD", "PLATINUM"],
        endpoints: {
          sign: "/api/v1/certificates/sign",
          verify: "/api/v1/certificates/verify",
          revoke: "/api/v1/certificates/revoke",
          ocsp: "/api/v1/ocsp",
          status: "/api/v1/certificates/:id/status",
        },
      });
    } catch (error) {
      res.status(500).json({
        error: "Failed to retrieve CA info",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  // ─────────────────────────────────────────────────────────────────
  // Certificate Signing
  // ─────────────────────────────────────────────────────────────────

  /**
   * Sign a certificate
   * POST /api/v1/certificates/sign
   */
  router.post("/certificates/sign", async (req: Request, res: Response) => {
    try {
      const body = SignCertificateRequestSchema.parse(req.body);

      // Sign certificate
      const signedCert = await signingService.signCertificate(
        body.certificate as cga.CGACertificate
      );

      // Store in registry
      db.insertCertificate({
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
      db.audit(
        "certificate_signed",
        "certificate",
        signedCert.metadata.id,
        "api",
        signedCert.spec.agent.organization.id,
        JSON.stringify({
          level: signedCert.spec.certification.level,
          agent_id: signedCert.spec.agent.id,
        }),
        req.ip
      );

      res.status(201).json({
        success: true,
        certificate: signedCert,
        certificate_yaml: YAML.stringify(signedCert),
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          error: "Invalid request",
          details: error.errors,
        });
      } else {
        res.status(500).json({
          error: "Signing failed",
          message: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }
  });

  // ─────────────────────────────────────────────────────────────────
  // Certificate Verification
  // ─────────────────────────────────────────────────────────────────

  /**
   * Verify a certificate
   * POST /api/v1/certificates/verify
   */
  router.post("/certificates/verify", async (req: Request, res: Response) => {
    const startTime = Date.now();

    try {
      const body = VerifyRequestSchema.parse(req.body);

      if (!body.certificate_id && !body.token) {
        res.status(400).json({
          error: "Either certificate_id or token must be provided",
        });
        return;
      }

      let certificateId = body.certificate_id;

      // If token provided, extract certificate ID
      if (body.token && !certificateId) {
        // This would decode the JWT and extract certificate ID
        // For now, return error
        res.status(400).json({
          error: "Token verification not yet implemented. Provide certificate_id.",
        });
        return;
      }

      // Get certificate
      const cert = db.getCertificate(certificateId!);
      if (!cert) {
        db.logVerification({
          certificate_id: null,
          agent_id: "unknown",
          request_ip: req.ip ?? null,
          request_action: body.action ?? null,
          request_timestamp: new Date().toISOString(),
          result: "unknown",
          result_details: "Certificate not found",
          duration_ms: Date.now() - startTime,
        });

        res.status(404).json({
          valid: false,
          status: "unknown",
          message: "Certificate not found",
        });
        return;
      }

      // Check status
      const now = new Date();
      let status: "valid" | "invalid" | "revoked" | "expired" = "valid";
      let message = "Certificate is valid";

      if (cert.status === "revoked") {
        status = "revoked";
        message = `Certificate revoked: ${cert.revocation_reason}`;
      } else if (new Date(cert.expires_at) < now) {
        status = "expired";
        message = "Certificate has expired";
      }

      // Log verification
      db.logVerification({
        certificate_id: certificateId!,
        agent_id: cert.agent_id,
        request_ip: req.ip ?? null,
        request_action: body.action ?? null,
        request_timestamp: new Date().toISOString(),
        result: status,
        result_details: message,
        duration_ms: Date.now() - startTime,
      });

      res.json({
        valid: status === "valid",
        status,
        message,
        certificate: {
          id: cert.id,
          agent_id: cert.agent_id,
          level: cert.level,
          issued_at: cert.issued_at,
          expires_at: cert.expires_at,
          organization: {
            id: cert.organization_id,
            name: cert.organization_name,
          },
        },
      });
    } catch (error) {
      res.status(500).json({
        error: "Verification failed",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  // ─────────────────────────────────────────────────────────────────
  // Certificate Status & Lookup
  // ─────────────────────────────────────────────────────────────────

  /**
   * Get certificate by ID
   * GET /api/v1/certificates/:id
   */
  router.get("/certificates/:id", (req: Request, res: Response) => {
    const cert = db.getCertificate(req.params.id);

    if (!cert) {
      res.status(404).json({ error: "Certificate not found" });
      return;
    }

    res.json({
      id: cert.id,
      agent_id: cert.agent_id,
      agent_version: cert.agent_version,
      level: cert.level,
      status: cert.status,
      organization: {
        id: cert.organization_id,
        name: cert.organization_name,
        domain: cert.organization_domain,
      },
      issued_at: cert.issued_at,
      expires_at: cert.expires_at,
      golden_thread: {
        hash: cert.golden_thread_hash,
        algorithm: cert.golden_thread_algorithm,
      },
    });
  });

  /**
   * Get certificate status
   * GET /api/v1/certificates/:id/status
   */
  router.get("/certificates/:id/status", (req: Request, res: Response) => {
    const cert = db.getCertificate(req.params.id);

    if (!cert) {
      res.status(404).json({ status: "unknown" });
      return;
    }

    const now = new Date();
    let status = cert.status;

    if (status === "active" && new Date(cert.expires_at) < now) {
      status = "expired";
    }

    res.json({
      certificate_id: cert.id,
      status,
      revoked_at: cert.revoked_at,
      revocation_reason: cert.revocation_reason,
      expires_at: cert.expires_at,
    });
  });

  /**
   * Get certificates for an agent
   * GET /api/v1/agents/:agentId/certificates
   */
  router.get("/agents/:agentId/certificates", (req: Request, res: Response) => {
    const certs = db.getActiveCertificatesForAgent(req.params.agentId);

    res.json({
      agent_id: req.params.agentId,
      certificates: certs.map((cert) => ({
        id: cert.id,
        version: cert.agent_version,
        level: cert.level,
        status: cert.status,
        issued_at: cert.issued_at,
        expires_at: cert.expires_at,
      })),
    });
  });

  // ─────────────────────────────────────────────────────────────────
  // Certificate Revocation
  // ─────────────────────────────────────────────────────────────────

  /**
   * Revoke a certificate
   * POST /api/v1/certificates/revoke
   */
  router.post("/certificates/revoke", async (req: Request, res: Response) => {
    try {
      const body = RevokeCertificateRequestSchema.parse(req.body);

      // Check certificate exists
      const cert = db.getCertificate(body.certificate_id);
      if (!cert) {
        res.status(404).json({ error: "Certificate not found" });
        return;
      }

      if (cert.status === "revoked") {
        res.status(400).json({ error: "Certificate already revoked" });
        return;
      }

      // Revoke certificate
      await ocspService.revokeCertificate(
        body.certificate_id,
        body.reason,
        req.ip ?? "unknown",
        body.incident_id
      );

      res.json({
        success: true,
        certificate_id: body.certificate_id,
        revoked_at: new Date().toISOString(),
        reason: body.reason,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          error: "Invalid request",
          details: error.errors,
        });
      } else {
        res.status(500).json({
          error: "Revocation failed",
          message: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }
  });

  // ─────────────────────────────────────────────────────────────────
  // OCSP
  // ─────────────────────────────────────────────────────────────────

  /**
   * OCSP endpoint
   * POST /api/v1/ocsp
   */
  router.post("/ocsp", async (req: Request, res: Response) => {
    try {
      const body = OCSPRequestSchema.parse(req.body);

      const request: OCSPRequest = {
        certificateId: body.certificate_id,
        nonce: body.nonce,
      };

      const response = await ocspService.processRequest(request);

      res.json(response);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          error: "Invalid OCSP request",
          details: error.errors,
        });
      } else {
        res.status(500).json({
          error: "OCSP request failed",
          message: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }
  });

  /**
   * OCSP GET endpoint (simplified)
   * GET /api/v1/ocsp/:certificateId
   */
  router.get("/ocsp/:certificateId", async (req: Request, res: Response) => {
    try {
      const response = await ocspService.processRequest({
        certificateId: req.params.certificateId,
      });

      res.json(response);
    } catch (error) {
      res.status(500).json({
        error: "OCSP request failed",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  // ─────────────────────────────────────────────────────────────────
  // Expiring Certificates
  // ─────────────────────────────────────────────────────────────────

  /**
   * Get certificates expiring soon
   * GET /api/v1/certificates/expiring
   */
  router.get("/certificates/expiring", (req: Request, res: Response) => {
    const days = parseInt(req.query.days as string) || 14;
    const certs = db.getExpiringCertificates(days);

    res.json({
      within_days: days,
      count: certs.length,
      certificates: certs.map((cert) => ({
        id: cert.id,
        agent_id: cert.agent_id,
        level: cert.level,
        expires_at: cert.expires_at,
        organization: cert.organization_name,
      })),
    });
  });

  return router;
}
