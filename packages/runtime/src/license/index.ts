// ─────────────────────────────────────────────────────────────────
// LICENSE VALIDATION MODULE (AIG-11)
// JWT-based commercial license validation for AIGOS
// ─────────────────────────────────────────────────────────────────

// Types
export * from "./types.js";

// JWT Parsing (AIG-103)
export * from "./parser.js";

// Signature Verification (AIG-104)
export * from "./verification.js";

// Claims Validation (AIG-105)
export * from "./claims.js";

// Feature Gating (AIG-106)
export * from "./features.js";

// Limit Enforcement (AIG-107)
export * from "./limits.js";

// ─────────────────────────────────────────────────────────────────
// UNIFIED LICENSE MANAGER
// High-level API for license validation
// ─────────────────────────────────────────────────────────────────

import type {
  LicenseConfig,
  ParsedLicense,
  FeatureId,
  FeatureGateResult,
  LimitCheckResult,
  LicenseTier,
  LicenseStatus,
} from "./types.js";
import { verifyLicense, clearJWKSCache } from "./verification.js";
import { FeatureGate, type FeatureGateConfig } from "./features.js";
import { LimitEnforcer, type UsageMetrics, type LimitType } from "./limits.js";
import { validateLicenseClaims, type ClaimsValidationOptions } from "./claims.js";

/**
 * License manager configuration
 */
export interface LicenseManagerConfig extends LicenseConfig {
  /** Feature gate configuration */
  featureGate?: FeatureGateConfig;
  /** Claims validation options */
  claimsValidation?: ClaimsValidationOptions;
  /** Refresh interval in milliseconds (0 = no refresh) */
  refreshIntervalMs?: number;
  /** Callback on license refresh */
  onRefresh?: (license: ParsedLicense | null) => void;
  /** Callback on license error */
  onError?: (error: Error) => void;
}

/**
 * Unified license manager
 */
export class LicenseManager {
  private config: LicenseManagerConfig;
  private license: ParsedLicense | null = null;
  private featureGate: FeatureGate;
  private limitEnforcer: LimitEnforcer;
  private refreshTimer: NodeJS.Timeout | null = null;

  constructor(config: LicenseManagerConfig = {}) {
    this.config = config;
    this.featureGate = new FeatureGate(config.featureGate);
    this.limitEnforcer = new LimitEnforcer();

    if (config.refreshIntervalMs && config.refreshIntervalMs > 0) {
      this.startRefreshTimer();
    }
  }

  /**
   * Initialize license from token
   */
  async initialize(token: string): Promise<ParsedLicense | null> {
    try {
      const result = await verifyLicense(token, this.config);

      if (result.valid && result.license) {
        // Validate claims
        const claimsResult = validateLicenseClaims(
          result.license.claims,
          this.config.claimsValidation
        );

        if (!claimsResult.valid) {
          result.license.errors.push(...claimsResult.errors);
          if (this.config.onError) {
            this.config.onError(new Error(`Claims validation failed: ${claimsResult.errors.join("; ")}`));
          }
        }

        this.license = result.license;
        this.featureGate.setLicense(result.license);
        this.limitEnforcer.setLicense(result.license);
      } else {
        this.license = result.license;
        this.featureGate.setLicense(null);
        this.limitEnforcer.setLicense(null);

        if (this.config.onError && result.errors.length > 0) {
          this.config.onError(new Error(result.errors.join("; ")));
        }
      }

      return this.license;
    } catch (error) {
      if (this.config.onError) {
        this.config.onError(error instanceof Error ? error : new Error(String(error)));
      }
      return null;
    }
  }

  /**
   * Start periodic license refresh
   */
  private startRefreshTimer(): void {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
    }

    this.refreshTimer = setInterval(async () => {
      if (this.license?.token) {
        const refreshed = await this.initialize(this.license.token);
        if (this.config.onRefresh) {
          this.config.onRefresh(refreshed);
        }
      }
    }, this.config.refreshIntervalMs);
  }

  /**
   * Stop periodic license refresh
   */
  stopRefresh(): void {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
      this.refreshTimer = null;
    }
  }

  /**
   * Get current license
   */
  getLicense(): ParsedLicense | null {
    return this.license;
  }

  /**
   * Get current license status
   */
  getStatus(): LicenseStatus {
    return this.license?.status ?? "invalid";
  }

  /**
   * Get current tier
   */
  getTier(): LicenseTier {
    return this.featureGate.getCurrentTier();
  }

  /**
   * Check if license is valid (including grace period)
   */
  isValid(): boolean {
    const status = this.getStatus();
    return status === "valid" || status === "grace";
  }

  /**
   * Check if a feature is allowed
   */
  isFeatureAllowed(featureId: FeatureId): FeatureGateResult {
    return this.featureGate.isFeatureAllowed(featureId);
  }

  /**
   * Get all allowed features
   */
  getAllowedFeatures(): FeatureId[] {
    return this.featureGate.getAllowedFeatures();
  }

  /**
   * Check a usage limit
   */
  checkLimit(limitType: LimitType): LimitCheckResult {
    return this.limitEnforcer.checkLimit(limitType);
  }

  /**
   * Check if adding one more would exceed limit
   */
  canAdd(limitType: LimitType): LimitCheckResult {
    return this.limitEnforcer.canAdd(limitType);
  }

  /**
   * Update usage metrics
   */
  updateUsage(metrics: Partial<UsageMetrics>): void {
    this.limitEnforcer.updateUsage(metrics);
  }

  /**
   * Increment usage counter
   */
  incrementUsage(metric: keyof UsageMetrics, amount: number = 1): void {
    this.limitEnforcer.incrementUsage(metric, amount);
  }

  /**
   * Decrement usage counter
   */
  decrementUsage(metric: keyof UsageMetrics, amount: number = 1): void {
    this.limitEnforcer.decrementUsage(metric, amount);
  }

  /**
   * Get current usage metrics
   */
  getUsage(): UsageMetrics {
    return this.limitEnforcer.getUsage();
  }

  /**
   * Check all limits
   */
  checkAllLimits(): Record<LimitType, LimitCheckResult> {
    return this.limitEnforcer.checkAllLimits();
  }

  /**
   * Get warnings for limits near capacity
   */
  getNearLimitWarnings(threshold?: number): { limitType: LimitType; usage: number; percentage: number }[] {
    return this.limitEnforcer.getNearLimitWarnings(threshold);
  }

  /**
   * Check if running in degraded mode
   */
  isDegradedMode(): boolean {
    return this.featureGate.isDegradedMode();
  }

  /**
   * Get degraded mode reason
   */
  getDegradedModeReason(): string | null {
    return this.featureGate.getDegradedModeReason();
  }

  /**
   * Get days until expiration
   */
  getDaysUntilExpiration(): number | null {
    return this.license?.daysUntilExpiration ?? null;
  }

  /**
   * Get organization info
   */
  getOrganization(): { name: string; id: string; supportEmail?: string } | null {
    if (!this.license) return null;

    return {
      name: this.license.claims.aigos_license.organization,
      id: this.license.claims.aigos_license.organization_id,
      supportEmail: this.license.claims.aigos_license.support_email,
    };
  }

  /**
   * Clear license
   */
  clear(): void {
    this.license = null;
    this.featureGate.setLicense(null);
    this.limitEnforcer.setLicense(null);
  }

  /**
   * Dispose of the manager
   */
  dispose(): void {
    this.stopRefresh();
    this.clear();
    clearJWKSCache();
  }
}

/**
 * Create a license manager
 */
export function createLicenseManager(config: LicenseManagerConfig = {}): LicenseManager {
  return new LicenseManager(config);
}
