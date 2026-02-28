/**
 * CGA OCSP Responder Service
 *
 * Implements Online Certificate Status Protocol for real-time
 * certificate revocation checking.
 *
 * @see RFC 6960 for OCSP specification
 */

import { CADatabase, CertificateRecord } from "../db/client.js";
import { SigningService } from "./signing.js";
import { createHash } from "crypto";

/**
 * OCSP Response Status
 */
export enum OCSPResponseStatus {
  SUCCESSFUL = 0,
  MALFORMED_REQUEST = 1,
  INTERNAL_ERROR = 2,
  TRY_LATER = 3,
  SIG_REQUIRED = 5,
  UNAUTHORIZED = 6,
}

/**
 * Certificate Status in OCSP response
 */
export enum CertificateStatus {
  GOOD = "good",
  REVOKED = "revoked",
  UNKNOWN = "unknown",
}

/**
 * OCSP Request (simplified for CGA)
 */
export interface OCSPRequest {
  certificateId: string;
  nonce?: string;
}

/**
 * OCSP Response
 */
export interface OCSPResponse {
  status: OCSPResponseStatus;
  producedAt: string;
  responses: SingleResponse[];
  signature?: string;
  nonce?: string;
}

/**
 * Single response for one certificate
 */
export interface SingleResponse {
  certificateId: string;
  certStatus: CertificateStatus;
  thisUpdate: string;
  nextUpdate: string;
  revocationTime?: string;
  revocationReason?: string;
}

export interface OCSPServiceOptions {
  db: CADatabase;
  signingService: SigningService;
  /** Response validity period in seconds */
  responseValiditySeconds?: number;
  /** Cache responses */
  enableCache?: boolean;
}

/**
 * OCSP Responder Service
 *
 * Provides real-time certificate status checking for CGA certificates.
 */
export class OCSPService {
  private db: CADatabase;
  private signingService: SigningService;
  private responseValiditySeconds: number;
  private enableCache: boolean;

  constructor(options: OCSPServiceOptions) {
    this.db = options.db;
    this.signingService = options.signingService;
    this.responseValiditySeconds = options.responseValiditySeconds ?? 3600; // 1 hour default
    this.enableCache = options.enableCache ?? true;
  }

  /**
   * Process OCSP request and return response
   */
  async processRequest(request: OCSPRequest): Promise<OCSPResponse> {
    const now = new Date();
    const producedAt = now.toISOString();

    try {
      // Validate request
      if (!request.certificateId) {
        return {
          status: OCSPResponseStatus.MALFORMED_REQUEST,
          producedAt,
          responses: [],
        };
      }

      // Check cache first
      if (this.enableCache) {
        const cached = this.getCachedResponse(request.certificateId);
        if (cached) {
          return {
            status: OCSPResponseStatus.SUCCESSFUL,
            producedAt: cached.thisUpdate,
            responses: [cached],
            nonce: request.nonce,
          };
        }
      }

      // Get certificate status
      const singleResponse = await this.getCertificateStatus(request.certificateId);

      // Cache the response
      if (this.enableCache && singleResponse.certStatus !== CertificateStatus.UNKNOWN) {
        this.cacheResponse(request.certificateId, singleResponse);
      }

      // Build response
      const response: OCSPResponse = {
        status: OCSPResponseStatus.SUCCESSFUL,
        producedAt,
        responses: [singleResponse],
        nonce: request.nonce,
      };

      // Sign response
      response.signature = await this.signResponse(response);

      return response;
    } catch (error) {
      return {
        status: OCSPResponseStatus.INTERNAL_ERROR,
        producedAt,
        responses: [],
      };
    }
  }

  /**
   * Process batch OCSP request
   */
  async processBatchRequest(requests: OCSPRequest[]): Promise<OCSPResponse> {
    const now = new Date();
    const producedAt = now.toISOString();
    const responses: SingleResponse[] = [];

    for (const request of requests) {
      const singleResponse = await this.getCertificateStatus(request.certificateId);
      responses.push(singleResponse);
    }

    const response: OCSPResponse = {
      status: OCSPResponseStatus.SUCCESSFUL,
      producedAt,
      responses,
    };

    response.signature = await this.signResponse(response);

    return response;
  }

  /**
   * Get certificate status
   */
  private async getCertificateStatus(certificateId: string): Promise<SingleResponse> {
    const now = new Date();
    const thisUpdate = now.toISOString();
    const nextUpdate = new Date(
      now.getTime() + this.responseValiditySeconds * 1000
    ).toISOString();

    // Get certificate from database
    const cert = this.db.getCertificate(certificateId);

    if (!cert) {
      return {
        certificateId,
        certStatus: CertificateStatus.UNKNOWN,
        thisUpdate,
        nextUpdate,
      };
    }

    // Check if revoked
    if (cert.status === "revoked") {
      const revocation = this.db.getRevocation(certificateId);
      return {
        certificateId,
        certStatus: CertificateStatus.REVOKED,
        thisUpdate,
        nextUpdate,
        revocationTime: revocation?.revoked_at ?? cert.revoked_at ?? undefined,
        revocationReason: revocation?.reason ?? cert.revocation_reason ?? undefined,
      };
    }

    // Check if expired
    if (new Date(cert.expires_at) < now) {
      return {
        certificateId,
        certStatus: CertificateStatus.REVOKED,
        thisUpdate,
        nextUpdate,
        revocationTime: cert.expires_at,
        revocationReason: "certificate_expired",
      };
    }

    // Certificate is good
    return {
      certificateId,
      certStatus: CertificateStatus.GOOD,
      thisUpdate,
      nextUpdate,
    };
  }

  /**
   * Get cached OCSP response
   */
  private getCachedResponse(certificateId: string): SingleResponse | null {
    // Note: This would query the ocsp_cache table
    // For now, return null (no cache hit)
    return null;
  }

  /**
   * Cache OCSP response
   */
  private cacheResponse(certificateId: string, response: SingleResponse): void {
    // Note: This would insert into the ocsp_cache table
    // Implementation would use:
    // this.db.insertOcspCache(certificateId, response);
  }

  /**
   * Sign OCSP response
   */
  private async signResponse(response: OCSPResponse): Promise<string> {
    const payload = JSON.stringify({
      producedAt: response.producedAt,
      responses: response.responses,
      nonce: response.nonce,
    });

    const hash = createHash("sha256").update(payload).digest("hex");

    // In production, this would use the signing service
    // For now, return a placeholder
    return `ocsp-sig-${hash.substring(0, 16)}`;
  }

  /**
   * Revoke a certificate
   */
  async revokeCertificate(
    certificateId: string,
    reason: string,
    revokedBy: string,
    incidentId?: string
  ): Promise<void> {
    this.db.transaction(() => {
      // Update certificate status
      this.db.updateCertificateStatus(certificateId, "revoked", reason);

      // Add revocation record
      this.db.addRevocation(certificateId, reason, revokedBy, incidentId);

      // Audit log
      this.db.audit(
        "certificate_revoked",
        "certificate",
        certificateId,
        "admin",
        revokedBy,
        JSON.stringify({ reason, incidentId })
      );
    });

    // Invalidate OCSP cache for this certificate
    this.invalidateCache(certificateId);
  }

  /**
   * Invalidate cached OCSP response
   */
  private invalidateCache(certificateId: string): void {
    // Note: This would delete from ocsp_cache table
  }

  /**
   * Get revocation list (CRL-style)
   */
  async getRevocationList(): Promise<{
    issuer: string;
    thisUpdate: string;
    nextUpdate: string;
    revokedCertificates: Array<{
      certificateId: string;
      revocationDate: string;
      reason: string;
    }>;
  }> {
    const now = new Date();

    // Get all revoked certificates
    // This would need to be added to the db client
    const revocations: Array<{
      certificateId: string;
      revocationDate: string;
      reason: string;
    }> = [];

    return {
      issuer: await this.signingService.getKeyId(),
      thisUpdate: now.toISOString(),
      nextUpdate: new Date(
        now.getTime() + this.responseValiditySeconds * 1000
      ).toISOString(),
      revokedCertificates: revocations,
    };
  }
}
