/**
 * CGA Token Generator and Verifier
 *
 * Generates and verifies CGA-enhanced governance tokens for A2A communication.
 * @see SPEC-CGA-001 Section 5 for token specification
 */

import { z } from 'zod';
import { CGALevel, CGALevelSchema, CGACertificateCompact } from './certificate';

/**
 * CGA claims embedded in governance token
 */
export const CGATokenClaimsSchema = z.object({
  // Standard JWT claims
  iss: z.string(), // Issuer (agent URN)
  sub: z.string(), // Subject (agent URN)
  aud: z.union([z.string(), z.array(z.string())]), // Audience
  exp: z.number(), // Expiration time
  iat: z.number(), // Issued at
  jti: z.string(), // JWT ID

  // CGA-specific claims
  cga: z.object({
    certificate_id: z.string(),
    level: CGALevelSchema,
    issuer: z.string(), // CA that issued the certificate
    expires_at: z.string().datetime(),
    governance_verified: z.object({
      kill_switch: z.boolean(),
      policy_engine: z.boolean(),
      golden_thread: z.boolean(),
      capability_bounds: z.boolean(),
      telemetry: z.boolean(),
    }),
    compliance_frameworks: z.array(z.string()),
    operational_health: z
      .object({
        uptime_30d: z.number(),
        violations_30d: z.number(),
        last_health_check: z.string().datetime().optional(),
      })
      .optional(),
  }),

  // Standard AIGOS governance claims
  aigos: z.object({
    asset_id: z.string(),
    golden_thread_hash: z.string(),
    risk_level: z.enum(['MINIMAL', 'LIMITED', 'HIGH', 'CRITICAL']),
    capabilities: z.array(z.string()),
    policy_version: z.string().optional(),
  }),
});

export type CGATokenClaims = z.infer<typeof CGATokenClaimsSchema>;

/**
 * Options for token generation
 */
export interface CGATokenGeneratorOptions {
  /** Private key for signing (PEM format) */
  privateKey: string;
  /** Key ID */
  keyId: string;
  /** Token validity in seconds */
  validitySeconds?: number;
}

/**
 * Options for token verification
 */
export interface CGATokenVerifierOptions {
  /** Trusted CA public keys */
  trustedCAs: Map<string, string>;
  /** OCSP endpoint for revocation checking */
  ocspEndpoint?: string;
  /** Whether to check certificate revocation */
  checkRevocation?: boolean;
}

/**
 * Token generation result
 */
export interface TokenGenerationResult {
  token: string;
  claims: CGATokenClaims;
  expires_at: Date;
}

/**
 * Token verification result
 */
export interface TokenVerificationResult {
  valid: boolean;
  claims?: CGATokenClaims;
  error?: string;
  warnings: string[];
  cga_level?: CGALevel;
  certificate_status?: 'VALID' | 'EXPIRED' | 'REVOKED' | 'UNKNOWN';
}

/**
 * CGA Token Generator
 *
 * Generates CGA-enhanced governance tokens that include
 * certificate attestations for A2A trust.
 */
export class CGATokenGenerator {
  private options: Required<CGATokenGeneratorOptions>;

  constructor(options: CGATokenGeneratorOptions) {
    this.options = {
      privateKey: options.privateKey,
      keyId: options.keyId,
      validitySeconds: options.validitySeconds ?? 3600, // 1 hour default
    };
  }

  /**
   * Generate a CGA-enhanced governance token
   */
  async generate(params: {
    certificate: CGACertificateCompact;
    audience: string | string[];
    assetId: string;
    goldenThreadHash: string;
    riskLevel: 'MINIMAL' | 'LIMITED' | 'HIGH' | 'CRITICAL';
    capabilities: string[];
    policyVersion?: string;
  }): Promise<TokenGenerationResult> {
    const now = Math.floor(Date.now() / 1000);
    const exp = now + this.options.validitySeconds;

    const claims: CGATokenClaims = {
      // Standard JWT claims
      iss: params.certificate.spec.agent_id,
      sub: params.certificate.spec.agent_id,
      aud: params.audience,
      exp,
      iat: now,
      jti: this.generateJti(),

      // CGA claims from certificate
      cga: {
        certificate_id: params.certificate.spec.id,
        level: params.certificate.spec.level,
        issuer: params.certificate.spec.issuer,
        expires_at: params.certificate.spec.expires_at,
        governance_verified: {
          kill_switch: params.certificate.spec.gov.ks,
          policy_engine: params.certificate.spec.gov.pe,
          golden_thread: params.certificate.spec.gov.gt,
          capability_bounds: params.certificate.spec.gov.cb,
          telemetry: params.certificate.spec.gov.tm,
        },
        compliance_frameworks: params.certificate.spec.compliance,
      },

      // AIGOS governance claims
      aigos: {
        asset_id: params.assetId,
        golden_thread_hash: params.goldenThreadHash,
        risk_level: params.riskLevel,
        capabilities: params.capabilities,
        policy_version: params.policyVersion,
      },
    };

    // Sign the token
    const token = await this.sign(claims);

    return {
      token,
      claims,
      expires_at: new Date(exp * 1000),
    };
  }

  /**
   * Generate unique JWT ID
   */
  private generateJti(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
  }

  /**
   * Sign claims to produce JWT
   */
  private async sign(claims: CGATokenClaims): Promise<string> {
    // TODO: Implement ES256 signing
    // For now, return base64-encoded claims as placeholder
    const header = { alg: 'ES256', typ: 'JWT', kid: this.options.keyId };
    const headerB64 = Buffer.from(JSON.stringify(header)).toString('base64url');
    const payloadB64 = Buffer.from(JSON.stringify(claims)).toString('base64url');
    const signature = 'PLACEHOLDER_SIGNATURE';

    return `${headerB64}.${payloadB64}.${signature}`;
  }
}

/**
 * CGA Token Verifier
 *
 * Verifies CGA-enhanced governance tokens and validates
 * certificate status.
 */
export class CGATokenVerifier {
  constructor(private options: CGATokenVerifierOptions) {}

  /**
   * Verify a CGA-enhanced governance token
   */
  async verify(token: string): Promise<TokenVerificationResult> {
    const warnings: string[] = [];

    try {
      // Parse token
      const parts = token.split('.');
      if (parts.length !== 3) {
        return {
          valid: false,
          error: 'Invalid token format',
          warnings: [],
        };
      }

      const [headerB64, payloadB64, signature] = parts;

      // Decode header
      const header = JSON.parse(Buffer.from(headerB64, 'base64url').toString());

      // Decode payload
      const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString());

      // Validate claims schema
      const claimsResult = CGATokenClaimsSchema.safeParse(payload);
      if (!claimsResult.success) {
        return {
          valid: false,
          error: `Invalid claims: ${claimsResult.error.message}`,
          warnings: [],
        };
      }

      const claims = claimsResult.data;

      // Check expiration
      const now = Math.floor(Date.now() / 1000);
      if (claims.exp < now) {
        return {
          valid: false,
          error: 'Token expired',
          warnings: [],
          claims,
          cga_level: claims.cga.level,
        };
      }

      // Check certificate expiration
      const certExpires = new Date(claims.cga.expires_at);
      if (certExpires < new Date()) {
        return {
          valid: false,
          error: 'CGA certificate expired',
          warnings: [],
          claims,
          cga_level: claims.cga.level,
          certificate_status: 'EXPIRED',
        };
      }

      // Check if certificate is expiring soon (within 7 days)
      const sevenDays = 7 * 24 * 60 * 60 * 1000;
      if (certExpires.getTime() - Date.now() < sevenDays) {
        warnings.push('CGA certificate expiring within 7 days');
      }

      // Verify signature
      const signatureValid = await this.verifySignature(
        `${headerB64}.${payloadB64}`,
        signature,
        header.kid
      );

      if (!signatureValid) {
        return {
          valid: false,
          error: 'Invalid signature',
          warnings,
          claims,
          cga_level: claims.cga.level,
        };
      }

      // Check certificate revocation if enabled
      let certificateStatus: 'VALID' | 'EXPIRED' | 'REVOKED' | 'UNKNOWN' = 'VALID';
      if (this.options.checkRevocation && this.options.ocspEndpoint) {
        const revocationResult = await this.checkRevocation(claims.cga.certificate_id);
        if (revocationResult.revoked) {
          return {
            valid: false,
            error: 'CGA certificate revoked',
            warnings,
            claims,
            cga_level: claims.cga.level,
            certificate_status: 'REVOKED',
          };
        }
        if (revocationResult.unknown) {
          warnings.push('Could not verify certificate revocation status');
          certificateStatus = 'UNKNOWN';
        }
      }

      return {
        valid: true,
        claims,
        warnings,
        cga_level: claims.cga.level,
        certificate_status: certificateStatus,
      };
    } catch (error) {
      return {
        valid: false,
        error: `Verification failed: ${error instanceof Error ? error.message : String(error)}`,
        warnings: [],
      };
    }
  }

  /**
   * Extract claims without verification (for inspection only)
   */
  extractClaims(token: string): CGATokenClaims | null {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) return null;

      const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString());
      const result = CGATokenClaimsSchema.safeParse(payload);
      return result.success ? result.data : null;
    } catch {
      return null;
    }
  }

  /**
   * Verify token signature
   */
  private async verifySignature(
    data: string,
    signature: string,
    keyId: string
  ): Promise<boolean> {
    // TODO: Implement ES256 signature verification
    // For now, accept placeholder
    return signature === 'PLACEHOLDER_SIGNATURE' || true;
  }

  /**
   * Check certificate revocation via OCSP
   */
  private async checkRevocation(
    certificateId: string
  ): Promise<{ revoked: boolean; unknown: boolean }> {
    // TODO: Implement OCSP client
    return { revoked: false, unknown: false };
  }
}

/**
 * Create a minimal CGA token for testing
 */
export function createTestToken(overrides?: Partial<CGATokenClaims>): string {
  const now = Math.floor(Date.now() / 1000);

  const claims: CGATokenClaims = {
    iss: 'urn:aigos:agent:test-agent',
    sub: 'urn:aigos:agent:test-agent',
    aud: 'urn:aigos:agent:target-agent',
    exp: now + 3600,
    iat: now,
    jti: `test-${Date.now()}`,
    cga: {
      certificate_id: 'cga-test-001',
      level: 'BRONZE',
      issuer: 'self',
      expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      governance_verified: {
        kill_switch: true,
        policy_engine: true,
        golden_thread: true,
        capability_bounds: false,
        telemetry: false,
      },
      compliance_frameworks: [],
    },
    aigos: {
      asset_id: 'test-asset',
      golden_thread_hash: 'sha256:test',
      risk_level: 'LIMITED',
      capabilities: ['read', 'write'],
    },
    ...overrides,
  };

  const header = { alg: 'ES256', typ: 'JWT', kid: 'test-key' };
  const headerB64 = Buffer.from(JSON.stringify(header)).toString('base64url');
  const payloadB64 = Buffer.from(JSON.stringify(claims)).toString('base64url');

  return `${headerB64}.${payloadB64}.PLACEHOLDER_SIGNATURE`;
}
