// ─────────────────────────────────────────────────────────────────
// LICENSE JWT PARSING (AIG-103)
// Parse JWT header and payload for license keys
// ─────────────────────────────────────────────────────────────────

import * as jose from "jose";
import type { LicenseClaims, ParsedLicense, LicenseStatus } from "./types.js";
import { LicenseClaimsSchema } from "./types.js";

/**
 * Grace period in days (default 14)
 */
const DEFAULT_GRACE_PERIOD_DAYS = 14;

/**
 * Parse a license JWT token without verification
 * Used for initial parsing before signature verification
 */
export function parseLicenseToken(token: string): {
  header: jose.JWTHeaderParameters;
  payload: unknown;
  signature: string;
} {
  const parts = token.split(".");
  if (parts.length !== 3) {
    throw new Error("Invalid JWT format: expected 3 parts");
  }

  const [headerB64, payloadB64, signatureB64] = parts;

  try {
    const header = JSON.parse(
      Buffer.from(headerB64, "base64url").toString("utf-8")
    ) as jose.JWTHeaderParameters;

    const payload = JSON.parse(
      Buffer.from(payloadB64, "base64url").toString("utf-8")
    );

    return {
      header,
      payload,
      signature: signatureB64,
    };
  } catch (error) {
    throw new Error(`Failed to parse JWT: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Validate and parse license claims from JWT payload
 */
export function parseLicenseClaims(payload: unknown): LicenseClaims {
  const result = LicenseClaimsSchema.safeParse(payload);
  if (!result.success) {
    const errors = result.error.issues.map(
      (issue) => `${issue.path.join(".")}: ${issue.message}`
    );
    throw new Error(`Invalid license claims: ${errors.join("; ")}`);
  }
  return result.data;
}

/**
 * Calculate license status based on expiration
 */
export function calculateLicenseStatus(
  claims: LicenseClaims,
  gracePeriodDays: number = DEFAULT_GRACE_PERIOD_DAYS
): { status: LicenseStatus; daysUntilExpiration: number; expiresAt: Date } {
  const now = Math.floor(Date.now() / 1000);
  const expiresAt = new Date(claims.exp * 1000);
  const daysUntilExpiration = Math.floor((claims.exp - now) / (24 * 60 * 60));

  // Check not-before
  if (now < claims.nbf) {
    return {
      status: "invalid",
      daysUntilExpiration,
      expiresAt,
    };
  }

  // Check expiration with grace period
  if (now > claims.exp) {
    const daysSinceExpiration = Math.floor((now - claims.exp) / (24 * 60 * 60));
    if (daysSinceExpiration <= gracePeriodDays) {
      return {
        status: "grace",
        daysUntilExpiration: -daysSinceExpiration,
        expiresAt,
      };
    }
    return {
      status: "expired",
      daysUntilExpiration: -daysSinceExpiration,
      expiresAt,
    };
  }

  return {
    status: "valid",
    daysUntilExpiration,
    expiresAt,
  };
}

/**
 * Parse a license token into a structured ParsedLicense
 * Does not verify signature - use verifyLicense for full validation
 */
export function parseUnverifiedLicense(
  token: string,
  gracePeriodDays: number = DEFAULT_GRACE_PERIOD_DAYS
): ParsedLicense {
  const errors: string[] = [];
  let claims: LicenseClaims;
  let status: LicenseStatus = "invalid";
  let expiresAt = new Date();
  let daysUntilExpiration = 0;

  try {
    const { payload } = parseLicenseToken(token);
    claims = parseLicenseClaims(payload);
    const statusInfo = calculateLicenseStatus(claims, gracePeriodDays);
    status = statusInfo.status;
    expiresAt = statusInfo.expiresAt;
    daysUntilExpiration = statusInfo.daysUntilExpiration;
  } catch (error) {
    errors.push(error instanceof Error ? error.message : String(error));
    // Return minimal invalid license
    return {
      token,
      claims: null as unknown as LicenseClaims,
      status: "invalid",
      expiresAt: new Date(),
      daysUntilExpiration: 0,
      signatureVerified: false,
      errors,
    };
  }

  return {
    token,
    claims,
    status,
    expiresAt,
    daysUntilExpiration,
    signatureVerified: false, // Not verified yet
    errors,
  };
}

/**
 * Get the algorithm from JWT header
 */
export function getTokenAlgorithm(token: string): string {
  const { header } = parseLicenseToken(token);
  return header.alg || "RS256";
}

/**
 * Get the key ID from JWT header (for JWKS lookup)
 */
export function getTokenKeyId(token: string): string | undefined {
  const { header } = parseLicenseToken(token);
  return header.kid;
}

/**
 * Check if token is a valid JWT format
 */
export function isValidJwtFormat(token: string): boolean {
  try {
    parseLicenseToken(token);
    return true;
  } catch {
    return false;
  }
}
