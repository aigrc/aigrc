// ─────────────────────────────────────────────────────────────────
// LIMIT ENFORCEMENT (AIG-107)
// Track agents, assets, users against license limits
// ─────────────────────────────────────────────────────────────────

import type {
  LicenseLimits,
  LimitCheckResult,
  ParsedLicense,
  LicenseTier,
} from "./types.js";
import { DEFAULT_LIMITS } from "./types.js";

/**
 * Usage metrics for limit tracking
 */
export interface UsageMetrics {
  /** Number of registered agents */
  agents: number;
  /** Number of registered assets */
  assets: number;
  /** Number of users */
  users: number;
  /** API calls made today */
  apiCallsToday: number;
  /** Current concurrent agent instances */
  concurrentInstances: number;
}

/**
 * Limit type identifiers
 */
export type LimitType = keyof LicenseLimits;

/**
 * Limit enforcement manager
 */
export class LimitEnforcer {
  private license: ParsedLicense | null = null;
  private usage: UsageMetrics = {
    agents: 0,
    assets: 0,
    users: 0,
    apiCallsToday: 0,
    concurrentInstances: 0,
  };
  private lastApiCallReset: Date = new Date();

  constructor() {
    // Reset API call count at midnight
    this.scheduleApiCallReset();
  }

  /**
   * Schedule daily API call count reset
   */
  private scheduleApiCallReset(): void {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);

    const msUntilMidnight = tomorrow.getTime() - now.getTime();

    // Only schedule in non-test environments
    if (typeof setTimeout !== "undefined" && process.env.NODE_ENV !== "test") {
      setTimeout(() => {
        this.resetApiCallCount();
        this.scheduleApiCallReset();
      }, msUntilMidnight);
    }
  }

  /**
   * Set the current license
   */
  setLicense(license: ParsedLicense | null): void {
    this.license = license;
  }

  /**
   * Get current limits based on license
   */
  getLimits(): LicenseLimits {
    if (!this.license || this.license.status === "invalid" || this.license.status === "revoked") {
      return DEFAULT_LIMITS.community;
    }

    // Use license-defined limits or fall back to tier defaults
    const licenseLimits = this.license.claims.aigos_license.limits;
    const tierDefaults = DEFAULT_LIMITS[this.license.claims.aigos_license.tier];

    return {
      maxAgents: licenseLimits.maxAgents ?? tierDefaults.maxAgents,
      maxAssets: licenseLimits.maxAssets ?? tierDefaults.maxAssets,
      maxUsers: licenseLimits.maxUsers ?? tierDefaults.maxUsers,
      maxApiCallsPerDay: licenseLimits.maxApiCallsPerDay ?? tierDefaults.maxApiCallsPerDay,
      maxConcurrentInstances: licenseLimits.maxConcurrentInstances ?? tierDefaults.maxConcurrentInstances,
    };
  }

  /**
   * Get current usage metrics
   */
  getUsage(): UsageMetrics {
    return { ...this.usage };
  }

  /**
   * Update usage metrics
   */
  updateUsage(metrics: Partial<UsageMetrics>): void {
    this.usage = { ...this.usage, ...metrics };
  }

  /**
   * Increment a specific usage counter
   */
  incrementUsage(metric: keyof UsageMetrics, amount: number = 1): void {
    this.usage[metric] += amount;
  }

  /**
   * Decrement a specific usage counter
   */
  decrementUsage(metric: keyof UsageMetrics, amount: number = 1): void {
    this.usage[metric] = Math.max(0, this.usage[metric] - amount);
  }

  /**
   * Reset API call count (called daily)
   */
  resetApiCallCount(): void {
    this.usage.apiCallsToday = 0;
    this.lastApiCallReset = new Date();
  }

  /**
   * Check if a specific limit would be exceeded
   */
  checkLimit(limitType: LimitType): LimitCheckResult {
    const limits = this.getLimits();
    const limit = limits[limitType];

    // null means unlimited
    if (limit === null) {
      return {
        allowed: true,
        current: this.getUsageForLimit(limitType),
        limit: null,
      };
    }

    const current = this.getUsageForLimit(limitType);
    const allowed = current < limit;

    return {
      allowed,
      current,
      limit,
      reason: allowed ? undefined : `Limit exceeded: ${limitType} (${current}/${limit})`,
    };
  }

  /**
   * Check if adding one more would exceed limit
   */
  canAdd(limitType: LimitType): LimitCheckResult {
    const limits = this.getLimits();
    const limit = limits[limitType];

    if (limit === null) {
      return {
        allowed: true,
        current: this.getUsageForLimit(limitType),
        limit: null,
      };
    }

    const current = this.getUsageForLimit(limitType);
    const allowed = current + 1 <= limit;

    return {
      allowed,
      current,
      limit,
      reason: allowed ? undefined : `Adding would exceed ${limitType} limit (${current + 1}/${limit})`,
    };
  }

  /**
   * Get current usage for a limit type
   */
  private getUsageForLimit(limitType: LimitType): number {
    switch (limitType) {
      case "maxAgents":
        return this.usage.agents;
      case "maxAssets":
        return this.usage.assets;
      case "maxUsers":
        return this.usage.users;
      case "maxApiCallsPerDay":
        return this.usage.apiCallsToday;
      case "maxConcurrentInstances":
        return this.usage.concurrentInstances;
    }
  }

  /**
   * Check all limits and return summary
   */
  checkAllLimits(): Record<LimitType, LimitCheckResult> {
    return {
      maxAgents: this.checkLimit("maxAgents"),
      maxAssets: this.checkLimit("maxAssets"),
      maxUsers: this.checkLimit("maxUsers"),
      maxApiCallsPerDay: this.checkLimit("maxApiCallsPerDay"),
      maxConcurrentInstances: this.checkLimit("maxConcurrentInstances"),
    };
  }

  /**
   * Get limits that are near capacity (>80%)
   */
  getNearLimitWarnings(threshold: number = 0.8): { limitType: LimitType; usage: number; percentage: number }[] {
    const limits = this.getLimits();
    const warnings: { limitType: LimitType; usage: number; percentage: number }[] = [];

    for (const [key, limit] of Object.entries(limits)) {
      if (limit === null) continue;

      const limitType = key as LimitType;
      const current = this.getUsageForLimit(limitType);
      const percentage = current / limit;

      if (percentage >= threshold) {
        warnings.push({ limitType, usage: current, percentage });
      }
    }

    return warnings;
  }

  /**
   * Get usage percentage for a limit
   */
  getUsagePercentage(limitType: LimitType): number | null {
    const limits = this.getLimits();
    const limit = limits[limitType];

    if (limit === null) return null;

    return this.getUsageForLimit(limitType) / limit;
  }

  /**
   * Get remaining capacity for a limit
   */
  getRemainingCapacity(limitType: LimitType): number | null {
    const limits = this.getLimits();
    const limit = limits[limitType];

    if (limit === null) return null;

    return Math.max(0, limit - this.getUsageForLimit(limitType));
  }
}

/**
 * Create a limit enforcer with default community limits
 */
export function createCommunityLimitEnforcer(): LimitEnforcer {
  return new LimitEnforcer();
}

/**
 * Create a limit enforcer from a parsed license
 */
export function createLimitEnforcerFromLicense(license: ParsedLicense): LimitEnforcer {
  const enforcer = new LimitEnforcer();
  enforcer.setLicense(license);
  return enforcer;
}

/**
 * Check if tier has unlimited access to a resource
 */
export function isUnlimited(tier: LicenseTier, limitType: LimitType): boolean {
  return DEFAULT_LIMITS[tier][limitType] === null;
}

/**
 * Get default limit for a tier
 */
export function getDefaultLimit(tier: LicenseTier, limitType: LimitType): number | null {
  return DEFAULT_LIMITS[tier][limitType];
}

/**
 * Format limit for display
 */
export function formatLimit(limit: number | null): string {
  return limit === null ? "Unlimited" : limit.toLocaleString();
}

/**
 * Format usage vs limit for display
 */
export function formatUsageVsLimit(current: number, limit: number | null): string {
  if (limit === null) {
    return `${current.toLocaleString()} (unlimited)`;
  }
  return `${current.toLocaleString()} / ${limit.toLocaleString()}`;
}
