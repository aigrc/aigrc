// ─────────────────────────────────────────────────────────────────
// LICENSE CLAIMS VALIDATION (AIG-105)
// Validate issuer, audience, expiration with 14-day grace
// ─────────────────────────────────────────────────────────────────

import type { LicenseClaims, ParsedLicense, LicenseStatus } from "./types.js";
import { LicenseClaimsSchema, LicenseTierSchema } from "./types.js";

/**
 * License claims validation result
 */
export interface LicenseClaimsValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Claims validation options
 */
export interface ClaimsValidationOptions {
  /** Expected issuer (default: "aigos-license") */
  expectedIssuer?: string;
  /** Expected audience (organization ID) */
  expectedAudience?: string;
  /** Grace period in days (default: 14) */
  gracePeriodDays?: number;
  /** Clock tolerance in seconds (default: 60) */
  clockToleranceSeconds?: number;
  /** Whether to allow trial licenses */
  allowTrial?: boolean;
  /** Minimum required tier */
  minimumTier?: "community" | "pro" | "enterprise";
}

/**
 * Tier hierarchy for comparison
 */
const TIER_HIERARCHY: Record<string, number> = {
  community: 0,
  pro: 1,
  enterprise: 2,
};

/**
 * Validate license claims
 */
export function validateLicenseClaims(
  claims: LicenseClaims,
  options: ClaimsValidationOptions = {}
): LicenseClaimsValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  const {
    expectedIssuer = "aigos-license",
    expectedAudience,
    gracePeriodDays = 14,
    clockToleranceSeconds = 60,
    allowTrial = true,
    minimumTier,
  } = options;

  const now = Math.floor(Date.now() / 1000);

  // 1. Validate issuer
  if (claims.iss !== expectedIssuer) {
    errors.push(`Invalid issuer: expected "${expectedIssuer}", got "${claims.iss}"`);
  }

  // 2. Validate audience if specified
  if (expectedAudience) {
    const audiences = Array.isArray(claims.aud) ? claims.aud : [claims.aud];
    if (!audiences.includes(expectedAudience) && !audiences.includes("*")) {
      errors.push(
        `Invalid audience: expected "${expectedAudience}", got "${audiences.join(", ")}"`
      );
    }
  }

  // 3. Validate not-before (nbf)
  if (claims.nbf > now + clockToleranceSeconds) {
    errors.push(
      `License not yet valid: nbf is ${new Date(claims.nbf * 1000).toISOString()}`
    );
  }

  // 4. Validate expiration (exp) with grace period
  const expWithGrace = claims.exp + gracePeriodDays * 24 * 60 * 60;
  if (now > expWithGrace) {
    errors.push(
      `License expired beyond grace period: expired ${new Date(claims.exp * 1000).toISOString()}`
    );
  } else if (now > claims.exp) {
    const daysSinceExpiry = Math.floor((now - claims.exp) / (24 * 60 * 60));
    const daysRemaining = gracePeriodDays - daysSinceExpiry;
    warnings.push(
      `License in grace period: expired ${daysSinceExpiry} days ago, ${daysRemaining} days remaining`
    );
  }

  // 5. Validate issued-at (iat)
  if (claims.iat > now + clockToleranceSeconds) {
    warnings.push(`License issued in the future: iat is ${new Date(claims.iat * 1000).toISOString()}`);
  }

  // 6. Validate license-specific claims
  const licenseClaims = claims.aigos_license;

  // 6a. Validate tier
  const tierResult = LicenseTierSchema.safeParse(licenseClaims.tier);
  if (!tierResult.success) {
    errors.push(`Invalid license tier: ${licenseClaims.tier}`);
  }

  // 6b. Check minimum tier requirement
  if (minimumTier) {
    const requiredLevel = TIER_HIERARCHY[minimumTier];
    const actualLevel = TIER_HIERARCHY[licenseClaims.tier] ?? -1;
    if (actualLevel < requiredLevel) {
      errors.push(
        `Insufficient license tier: requires "${minimumTier}", got "${licenseClaims.tier}"`
      );
    }
  }

  // 6c. Validate trial license
  if (licenseClaims.trial && !allowTrial) {
    errors.push("Trial licenses are not allowed");
  }

  // 6d. Validate organization
  if (!licenseClaims.organization || licenseClaims.organization.trim() === "") {
    errors.push("Missing organization name in license");
  }

  if (!licenseClaims.organization_id || licenseClaims.organization_id.trim() === "") {
    errors.push("Missing organization ID in license");
  }

  // 6e. Validate features array
  if (!Array.isArray(licenseClaims.features)) {
    errors.push("Invalid features: must be an array");
  } else if (licenseClaims.features.length === 0) {
    warnings.push("License has no enabled features");
  }

  // 6f. Validate limits
  if (!licenseClaims.limits) {
    warnings.push("License has no limits defined");
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Check if license is currently in grace period
 */
export function isInGracePeriod(
  claims: LicenseClaims,
  gracePeriodDays: number = 14
): boolean {
  const now = Math.floor(Date.now() / 1000);
  return now > claims.exp && now <= claims.exp + gracePeriodDays * 24 * 60 * 60;
}

/**
 * Get days remaining in license (negative if expired)
 */
export function getDaysRemaining(claims: LicenseClaims): number {
  const now = Math.floor(Date.now() / 1000);
  return Math.floor((claims.exp - now) / (24 * 60 * 60));
}

/**
 * Get days remaining in grace period (0 if not in grace period)
 */
export function getGraceDaysRemaining(
  claims: LicenseClaims,
  gracePeriodDays: number = 14
): number {
  const now = Math.floor(Date.now() / 1000);
  if (now <= claims.exp) {
    return gracePeriodDays; // Not yet in grace period
  }
  const daysSinceExpiry = Math.floor((now - claims.exp) / (24 * 60 * 60));
  return Math.max(0, gracePeriodDays - daysSinceExpiry);
}

/**
 * Determine the overall license status from claims
 */
export function getLicenseStatus(
  claims: LicenseClaims,
  signatureVerified: boolean,
  gracePeriodDays: number = 14
): LicenseStatus {
  if (!signatureVerified) {
    return "invalid";
  }

  const now = Math.floor(Date.now() / 1000);

  // Check not-before
  if (now < claims.nbf) {
    return "invalid";
  }

  // Check expiration with grace
  if (now > claims.exp) {
    const expWithGrace = claims.exp + gracePeriodDays * 24 * 60 * 60;
    if (now <= expWithGrace) {
      return "grace";
    }
    return "expired";
  }

  return "valid";
}

/**
 * Compare two licenses by expiration
 */
export function compareLicenseExpiration(a: ParsedLicense, b: ParsedLicense): number {
  return a.claims.exp - b.claims.exp;
}

/**
 * Get the most permissive license from a list
 * (highest tier, then latest expiration)
 */
export function getMostPermissiveLicense(licenses: ParsedLicense[]): ParsedLicense | null {
  if (licenses.length === 0) return null;

  return licenses.reduce((best, current) => {
    const bestTierLevel = TIER_HIERARCHY[best.claims.aigos_license.tier] ?? 0;
    const currentTierLevel = TIER_HIERARCHY[current.claims.aigos_license.tier] ?? 0;

    // Higher tier wins
    if (currentTierLevel > bestTierLevel) return current;
    if (currentTierLevel < bestTierLevel) return best;

    // Same tier: later expiration wins
    return current.claims.exp > best.claims.exp ? current : best;
  });
}

/**
 * Extract organization info from license
 */
export function getOrganizationInfo(claims: LicenseClaims): {
  name: string;
  id: string;
  supportEmail?: string;
} {
  return {
    name: claims.aigos_license.organization,
    id: claims.aigos_license.organization_id,
    supportEmail: claims.aigos_license.support_email,
  };
}
