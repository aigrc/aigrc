/**
 * License Module (AIGOS-E11)
 *
 * JWT-based license validation for AIGOS runtime.
 *
 * @example
 * ```typescript
 * import { createLicenseManager, TIER_FEATURES } from '@aigrc/runtime/license';
 *
 * const licenseManager = createLicenseManager({
 *   jwksEndpoint: 'https://license.aigos.dev/.well-known/jwks.json',
 * });
 *
 * // Load license from key
 * const result = await licenseManager.loadLicense(process.env.AIGOS_LICENSE_KEY);
 *
 * // Or use community (free) license
 * licenseManager.loadCommunityLicense();
 *
 * // Check feature availability
 * const killSwitchCheck = licenseManager.isFeatureEnabled('kill_switch');
 * if (!killSwitchCheck.enabled) {
 *   console.log(`Kill switch requires ${killSwitchCheck.requiredTier} tier`);
 * }
 *
 * // Check usage limits
 * const limitCheck = licenseManager.checkLimit('max_agents');
 * if (limitCheck.exceeded) {
 *   console.log(`Agent limit exceeded: ${limitCheck.current}/${limitCheck.limit}`);
 * }
 *
 * // Get license info
 * const info = licenseManager.getLicenseInfo();
 * console.log(`License: ${info?.tier} (expires in ${info?.daysUntilExpiration} days)`);
 * ```
 *
 * @packageDocumentation
 */

// ─────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────

export type {
  // License structure
  LicenseTier,
  FeatureId,
  LicenseLimits,
  LicensePayload,

  // Validation
  LicenseValidationResult,
  LicenseErrorCode,
  LicenseWarning,

  // Feature gating
  FeatureCheckResult,
  LimitCheckResult,

  // Usage
  UsageState,

  // Configuration
  LicenseManagerConfig,

  // Events
  LicenseEventType,
  LicenseEvent,
  LicenseEventHandler,
  BaseLicenseEvent,
  LicenseLoadedEvent,
  LicenseValidatedEvent,
  LicenseExpiredEvent,
  LicenseGracePeriodEvent,
  LicenseFeatureCheckEvent,
  LicenseLimitCheckEvent,
  LicenseLimitExceededEvent,
} from "./types.js";

// ─────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────

export {
  TIER_FEATURES,
  TIER_LIMITS,
  DEFAULT_LICENSE_ISSUER,
  DEFAULT_LICENSE_AUDIENCE,
  DEFAULT_GRACE_PERIOD_DAYS,
  LICENSE_JWT_TYPE,
} from "./types.js";

// ─────────────────────────────────────────────────────────────────
// LICENSE MANAGER
// ─────────────────────────────────────────────────────────────────

export { LicenseManager, createLicenseManager } from "./license-manager.js";
