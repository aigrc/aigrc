// ─────────────────────────────────────────────────────────────────
// FEATURE GATING (AIG-106)
// Gate features by tier (Kill Switch, Capability Decay = Pro+)
// ─────────────────────────────────────────────────────────────────

import type {
  FeatureId,
  FeatureGateResult,
  LicenseTier,
  ParsedLicense,
  LicenseClaims,
} from "./types.js";
import { FEATURES_BY_TIER } from "./types.js";

/**
 * Feature gate configuration
 */
export interface FeatureGateConfig {
  /** Default behavior when no license is provided */
  defaultBehavior?: "allow_community" | "deny_all";
  /** Override features (for testing or grace mode) */
  overrideFeatures?: FeatureId[];
  /** Whether to enforce strictly (no fallback) */
  strictMode?: boolean;
}

/**
 * Feature gate manager
 */
export class FeatureGate {
  private license: ParsedLicense | null = null;
  private config: FeatureGateConfig;

  constructor(config: FeatureGateConfig = {}) {
    this.config = {
      defaultBehavior: "allow_community",
      strictMode: false,
      ...config,
    };
  }

  /**
   * Set the current license
   */
  setLicense(license: ParsedLicense | null): void {
    this.license = license;
  }

  /**
   * Get the current license
   */
  getLicense(): ParsedLicense | null {
    return this.license;
  }

  /**
   * Check if a feature is allowed
   */
  isFeatureAllowed(featureId: FeatureId): FeatureGateResult {
    // Check override features first
    if (this.config.overrideFeatures?.includes(featureId)) {
      return {
        allowed: true,
        reason: "Feature override",
      };
    }

    // No license case
    if (!this.license) {
      if (this.config.defaultBehavior === "deny_all") {
        return {
          allowed: false,
          reason: "No license provided",
        };
      }

      // Allow community features
      const communityFeatures = FEATURES_BY_TIER.community;
      if (communityFeatures.includes(featureId)) {
        return {
          allowed: true,
          reason: "Community feature (no license required)",
          tier: "community",
        };
      }

      return {
        allowed: false,
        reason: `Feature "${featureId}" requires a license`,
      };
    }

    // Check license status
    if (this.license.status === "invalid" || this.license.status === "revoked") {
      if (this.config.strictMode) {
        return {
          allowed: false,
          reason: `License is ${this.license.status}`,
        };
      }
      // Fall back to community features
      const communityFeatures = FEATURES_BY_TIER.community;
      if (communityFeatures.includes(featureId)) {
        return {
          allowed: true,
          reason: "Community feature (license invalid, fallback mode)",
          tier: "community",
        };
      }
      return {
        allowed: false,
        reason: `License is ${this.license.status}`,
      };
    }

    // Check if feature is in license
    const licensedFeatures = this.license.claims.aigos_license.features;
    if (licensedFeatures.includes(featureId)) {
      return {
        allowed: true,
        tier: this.license.claims.aigos_license.tier,
      };
    }

    // Feature not in license
    return {
      allowed: false,
      reason: `Feature "${featureId}" not included in ${this.license.claims.aigos_license.tier} license`,
      tier: this.license.claims.aigos_license.tier,
    };
  }

  /**
   * Get all allowed features
   */
  getAllowedFeatures(): FeatureId[] {
    if (!this.license) {
      if (this.config.defaultBehavior === "deny_all") {
        return this.config.overrideFeatures ?? [];
      }
      return [
        ...FEATURES_BY_TIER.community,
        ...(this.config.overrideFeatures ?? []),
      ];
    }

    if (this.license.status === "invalid" || this.license.status === "revoked") {
      if (this.config.strictMode) {
        return this.config.overrideFeatures ?? [];
      }
      return [
        ...FEATURES_BY_TIER.community,
        ...(this.config.overrideFeatures ?? []),
      ];
    }

    return [
      ...this.license.claims.aigos_license.features,
      ...(this.config.overrideFeatures ?? []),
    ];
  }

  /**
   * Get the current tier
   */
  getCurrentTier(): LicenseTier {
    if (!this.license || this.license.status === "invalid" || this.license.status === "revoked") {
      return "community";
    }
    return this.license.claims.aigos_license.tier;
  }

  /**
   * Check if running in degraded mode
   */
  isDegradedMode(): boolean {
    if (!this.license) {
      return this.config.defaultBehavior === "allow_community";
    }
    return this.license.status === "grace" ||
           this.license.status === "expired" ||
           (this.license.status === "invalid" && !this.config.strictMode);
  }

  /**
   * Get degraded mode reason
   */
  getDegradedModeReason(): string | null {
    if (!this.license) {
      return this.config.defaultBehavior === "allow_community"
        ? "No license - running with community features"
        : null;
    }

    switch (this.license.status) {
      case "grace":
        return `License in grace period - ${Math.abs(this.license.daysUntilExpiration)} days since expiration`;
      case "expired":
        return "License expired beyond grace period";
      case "invalid":
        return this.config.strictMode ? null : "License invalid - running with community features";
      default:
        return null;
    }
  }
}

/**
 * Check if a feature requires a specific tier
 */
export function getRequiredTier(featureId: FeatureId): LicenseTier {
  if (FEATURES_BY_TIER.community.includes(featureId)) {
    return "community";
  }
  if (FEATURES_BY_TIER.pro.includes(featureId)) {
    return "pro";
  }
  return "enterprise";
}

/**
 * Get features available for a tier
 */
export function getFeaturesForTier(tier: LicenseTier): FeatureId[] {
  return [...FEATURES_BY_TIER[tier]];
}

/**
 * Check if tier has access to feature
 */
export function tierHasFeature(tier: LicenseTier, featureId: FeatureId): boolean {
  return FEATURES_BY_TIER[tier].includes(featureId);
}

/**
 * Get features requiring upgrade from current tier
 */
export function getUpgradeFeatures(
  currentTier: LicenseTier
): { feature: FeatureId; requiredTier: LicenseTier }[] {
  const currentFeatures = new Set(FEATURES_BY_TIER[currentTier]);
  const result: { feature: FeatureId; requiredTier: LicenseTier }[] = [];

  // Add pro features not in current
  for (const feature of FEATURES_BY_TIER.pro) {
    if (!currentFeatures.has(feature)) {
      result.push({ feature, requiredTier: "pro" });
    }
  }

  // Add enterprise features not in current
  for (const feature of FEATURES_BY_TIER.enterprise) {
    if (!currentFeatures.has(feature) && !FEATURES_BY_TIER.pro.includes(feature)) {
      result.push({ feature, requiredTier: "enterprise" });
    }
  }

  return result;
}

/**
 * Create a feature gate from license claims
 */
export function createFeatureGateFromClaims(
  claims: LicenseClaims,
  config: FeatureGateConfig = {}
): FeatureGate {
  const gate = new FeatureGate(config);

  // Create a minimal ParsedLicense from claims
  const license: ParsedLicense = {
    token: "",
    claims,
    status: "valid",
    expiresAt: new Date(claims.exp * 1000),
    daysUntilExpiration: Math.floor((claims.exp - Date.now() / 1000) / (24 * 60 * 60)),
    signatureVerified: true,
    errors: [],
  };

  gate.setLicense(license);
  return gate;
}

/**
 * Create a community-only feature gate
 */
export function createCommunityFeatureGate(): FeatureGate {
  return new FeatureGate({ defaultBehavior: "allow_community" });
}

/**
 * Create a strict feature gate (deny all without license)
 */
export function createStrictFeatureGate(): FeatureGate {
  return new FeatureGate({ defaultBehavior: "deny_all", strictMode: true });
}
