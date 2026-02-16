/**
 * License Validation Types (AIGOS-E11)
 *
 * SPEC-LIC-001: JWT-based license key validation
 *
 * This module defines types for:
 * - License JWT structure
 * - License tiers and features
 * - Usage limits and tracking
 */

// ─────────────────────────────────────────────────────────────────
// LICENSE TIERS
// ─────────────────────────────────────────────────────────────────

/**
 * License tier levels
 */
export type LicenseTier = "community" | "professional" | "enterprise";

/**
 * Feature identifiers
 */
export type FeatureId =
  | "kill_switch"
  | "capability_decay"
  | "multi_jurisdiction"
  | "a2a_auth"
  | "telemetry_export"
  | "custom_policies"
  | "sso"
  | "audit_logs"
  | "compliance_reports"
  | "priority_support";

/**
 * Features available per tier
 */
export const TIER_FEATURES: Record<LicenseTier, FeatureId[]> = {
  community: [],
  professional: [
    "kill_switch",
    "capability_decay",
    "multi_jurisdiction",
    "a2a_auth",
    "telemetry_export",
    "custom_policies",
  ],
  enterprise: [
    "kill_switch",
    "capability_decay",
    "multi_jurisdiction",
    "a2a_auth",
    "telemetry_export",
    "custom_policies",
    "sso",
    "audit_logs",
    "compliance_reports",
    "priority_support",
  ],
};

// ─────────────────────────────────────────────────────────────────
// LICENSE LIMITS
// ─────────────────────────────────────────────────────────────────

/**
 * Default limits per tier
 */
export const TIER_LIMITS: Record<LicenseTier, LicenseLimits> = {
  community: {
    max_agents: 3,
    max_assets: 5,
    max_users: 1,
    max_policies: 3,
  },
  professional: {
    max_agents: 25,
    max_assets: 50,
    max_users: 10,
    max_policies: 25,
  },
  enterprise: {
    max_agents: -1, // Unlimited
    max_assets: -1,
    max_users: -1,
    max_policies: -1,
  },
};

/**
 * License usage limits
 */
export interface LicenseLimits {
  /** Maximum number of concurrent agents (-1 = unlimited) */
  max_agents: number;
  /** Maximum number of asset cards (-1 = unlimited) */
  max_assets: number;
  /** Maximum number of users (-1 = unlimited) */
  max_users: number;
  /** Maximum number of custom policies (-1 = unlimited) */
  max_policies: number;
}

// ─────────────────────────────────────────────────────────────────
// LICENSE JWT STRUCTURE
// ─────────────────────────────────────────────────────────────────

/**
 * License JWT payload
 */
export interface LicensePayload {
  // Standard JWT claims
  /** Issuer: "https://license.aigos.dev" */
  iss: string;
  /** Subject: Organization ID or customer ID */
  sub: string;
  /** Audience: "aigrc" */
  aud: string;
  /** Expiration timestamp (Unix epoch) */
  exp: number;
  /** Issued at timestamp (Unix epoch) */
  iat: number;
  /** Not before timestamp (Unix epoch) */
  nbf: number;
  /** Unique license ID */
  jti: string;

  // AIGOS License claims
  aigos_license: {
    /** License tier */
    tier: LicenseTier;
    /** Organization name */
    organization_name: string;
    /** Enabled features (overrides tier defaults) */
    features: FeatureId[];
    /** Usage limits (overrides tier defaults) */
    limits: Partial<LicenseLimits>;
    /** License activation date */
    activated_at: string;
    /** Support level */
    support_level: "community" | "standard" | "priority" | "dedicated";
    /** Custom domains allowed (for on-premise) */
    custom_domains?: string[];
    /** Additional metadata */
    metadata?: Record<string, unknown>;
  };
}

// ─────────────────────────────────────────────────────────────────
// LICENSE VALIDATION
// ─────────────────────────────────────────────────────────────────

/**
 * License validation result
 */
export interface LicenseValidationResult {
  /** Whether the license is valid */
  valid: boolean;
  /** The validated license payload */
  license?: LicensePayload;
  /** Error code if invalid */
  errorCode?: LicenseErrorCode;
  /** Human-readable error message */
  errorMessage?: string;
  /** Warnings that don't invalidate the license */
  warnings?: LicenseWarning[];
  /** Days until expiration (if valid) */
  daysUntilExpiration?: number;
  /** Whether in grace period */
  inGracePeriod?: boolean;
}

/**
 * License error codes
 */
export type LicenseErrorCode =
  | "INVALID_FORMAT"
  | "INVALID_SIGNATURE"
  | "EXPIRED"
  | "NOT_YET_VALID"
  | "INVALID_ISSUER"
  | "INVALID_AUDIENCE"
  | "INVALID_CLAIMS"
  | "KEY_NOT_FOUND"
  | "REVOKED";

/**
 * License warning
 */
export interface LicenseWarning {
  code: string;
  message: string;
}

// ─────────────────────────────────────────────────────────────────
// FEATURE GATING
// ─────────────────────────────────────────────────────────────────

/**
 * Feature check result
 */
export interface FeatureCheckResult {
  /** Whether the feature is enabled */
  enabled: boolean;
  /** The tier required for this feature */
  requiredTier?: LicenseTier;
  /** Reason if disabled */
  reason?: string;
}

/**
 * Limit check result
 */
export interface LimitCheckResult {
  /** Whether the limit is exceeded */
  exceeded: boolean;
  /** Current usage count */
  current: number;
  /** Maximum allowed */
  limit: number;
  /** Reason if exceeded */
  reason?: string;
}

// ─────────────────────────────────────────────────────────────────
// USAGE TRACKING
// ─────────────────────────────────────────────────────────────────

/**
 * Current usage state
 */
export interface UsageState {
  /** Number of active agents */
  agents: number;
  /** Number of registered assets */
  assets: number;
  /** Number of users (if applicable) */
  users: number;
  /** Number of custom policies */
  policies: number;
  /** Last updated timestamp */
  updatedAt: string;
}

// ─────────────────────────────────────────────────────────────────
// LICENSE MANAGER CONFIGURATION
// ─────────────────────────────────────────────────────────────────

/**
 * License manager configuration
 */
export interface LicenseManagerConfig {
  /** Path to license file or license key string */
  licenseSource?: string;
  /** JWKS endpoint for public keys */
  jwksEndpoint?: string;
  /** Expected issuer */
  expectedIssuer: string;
  /** Expected audience */
  expectedAudience: string;
  /** Grace period in days after expiration */
  gracePeriodDays: number;
  /** Callback when license expires */
  onExpiration?: (license: LicensePayload) => void;
  /** Callback when entering grace period */
  onGracePeriod?: (daysRemaining: number) => void;
  /** Callback when limit is exceeded */
  onLimitExceeded?: (limit: keyof LicenseLimits, current: number, max: number) => void;
}

// ─────────────────────────────────────────────────────────────────
// LICENSE EVENTS
// ─────────────────────────────────────────────────────────────────

/**
 * License event types
 */
export type LicenseEventType =
  | "license.loaded"
  | "license.validated"
  | "license.expired"
  | "license.grace_period"
  | "license.feature_check"
  | "license.limit_check"
  | "license.limit_exceeded";

/**
 * Base license event
 */
export interface BaseLicenseEvent {
  type: LicenseEventType;
  timestamp: string;
}

/**
 * License loaded event
 */
export interface LicenseLoadedEvent extends BaseLicenseEvent {
  type: "license.loaded";
  tier: LicenseTier;
  organization: string;
  expiresAt: string;
}

/**
 * License validated event
 */
export interface LicenseValidatedEvent extends BaseLicenseEvent {
  type: "license.validated";
  valid: boolean;
  errorCode?: LicenseErrorCode;
}

/**
 * License expired event
 */
export interface LicenseExpiredEvent extends BaseLicenseEvent {
  type: "license.expired";
  expiredAt: string;
  inGracePeriod: boolean;
}

/**
 * Grace period event
 */
export interface LicenseGracePeriodEvent extends BaseLicenseEvent {
  type: "license.grace_period";
  daysRemaining: number;
}

/**
 * Feature check event
 */
export interface LicenseFeatureCheckEvent extends BaseLicenseEvent {
  type: "license.feature_check";
  feature: FeatureId;
  enabled: boolean;
}

/**
 * Limit check event
 */
export interface LicenseLimitCheckEvent extends BaseLicenseEvent {
  type: "license.limit_check";
  limit: keyof LicenseLimits;
  current: number;
  max: number;
  exceeded: boolean;
}

/**
 * Limit exceeded event
 */
export interface LicenseLimitExceededEvent extends BaseLicenseEvent {
  type: "license.limit_exceeded";
  limit: keyof LicenseLimits;
  current: number;
  max: number;
}

/**
 * Union of all license events
 */
export type LicenseEvent =
  | LicenseLoadedEvent
  | LicenseValidatedEvent
  | LicenseExpiredEvent
  | LicenseGracePeriodEvent
  | LicenseFeatureCheckEvent
  | LicenseLimitCheckEvent
  | LicenseLimitExceededEvent;

/**
 * License event handler
 */
export type LicenseEventHandler = (event: LicenseEvent) => void | Promise<void>;

// ─────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────

/**
 * Default license issuer
 */
export const DEFAULT_LICENSE_ISSUER = "https://license.aigos.dev";

/**
 * Default license audience
 */
export const DEFAULT_LICENSE_AUDIENCE = "aigrc";

/**
 * Default grace period in days
 */
export const DEFAULT_GRACE_PERIOD_DAYS = 14;

/**
 * License JWT type header
 */
export const LICENSE_JWT_TYPE = "AIGOS-LIC+jwt";
