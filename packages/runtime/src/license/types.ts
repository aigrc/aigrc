// ─────────────────────────────────────────────────────────────────
// LICENSE VALIDATION TYPES (AIG-11)
// JWT-based commercial license validation for AIGOS
// ─────────────────────────────────────────────────────────────────

import { z } from "zod";

/**
 * License tiers for AIGOS
 */
export const LicenseTierSchema = z.enum([
  "community",   // Free tier - basic features
  "pro",         // Pro tier - advanced features
  "enterprise",  // Enterprise tier - full features
]);
export type LicenseTier = z.infer<typeof LicenseTierSchema>;

/**
 * License status
 */
export const LicenseStatusSchema = z.enum([
  "valid",       // License is valid and active
  "expired",     // License has expired (within grace period)
  "grace",       // License is in grace period (14 days after expiration)
  "invalid",     // License is invalid (signature or format)
  "revoked",     // License has been revoked
]);
export type LicenseStatus = z.infer<typeof LicenseStatusSchema>;

/**
 * Feature identifiers for gating
 */
export const FeatureIdSchema = z.enum([
  // Core features (all tiers)
  "asset_cards",
  "risk_classification",
  "golden_thread",
  "detection",
  "cli_basic",

  // Pro features
  "kill_switch",
  "capability_decay",
  "telemetry",
  "policy_engine",
  "a2a_auth",

  // Enterprise features
  "multi_jurisdiction",
  "custom_policies",
  "sso",
  "audit_logs",
  "white_label",
]);
export type FeatureId = z.infer<typeof FeatureIdSchema>;

/**
 * License limits
 */
export const LicenseLimitsSchema = z.object({
  /** Maximum number of registered agents */
  maxAgents: z.number().int().min(0).nullable(),
  /** Maximum number of registered assets */
  maxAssets: z.number().int().min(0).nullable(),
  /** Maximum number of users */
  maxUsers: z.number().int().min(0).nullable(),
  /** Maximum API calls per day */
  maxApiCallsPerDay: z.number().int().min(0).nullable(),
  /** Maximum concurrent agent instances */
  maxConcurrentInstances: z.number().int().min(0).nullable(),
});
export type LicenseLimits = z.infer<typeof LicenseLimitsSchema>;

/**
 * License JWT claims
 */
export const LicenseClaimsSchema = z.object({
  // Standard JWT claims
  /** Issuer: "aigos-license" */
  iss: z.literal("aigos-license"),
  /** Subject: license ID */
  sub: z.string().min(1),
  /** Audience: organization ID or "self-hosted" */
  aud: z.union([z.string(), z.array(z.string())]),
  /** Expiration timestamp (Unix epoch) */
  exp: z.number().int().positive(),
  /** Issued at timestamp (Unix epoch) */
  iat: z.number().int().positive(),
  /** Not before timestamp (Unix epoch) */
  nbf: z.number().int().positive(),
  /** Unique JWT ID */
  jti: z.string().uuid(),

  // AIGOS license claims
  aigos_license: z.object({
    /** License tier */
    tier: LicenseTierSchema,
    /** Organization name */
    organization: z.string().min(1),
    /** Organization ID */
    organization_id: z.string().min(1),
    /** Enabled features for this license */
    features: z.array(FeatureIdSchema),
    /** License limits */
    limits: LicenseLimitsSchema,
    /** Support email */
    support_email: z.string().email().optional(),
    /** Whether this is a trial license */
    trial: z.boolean().default(false),
    /** License metadata */
    metadata: z.record(z.unknown()).optional(),
  }),
});
export type LicenseClaims = z.infer<typeof LicenseClaimsSchema>;

/**
 * Parsed license with validation state
 */
export interface ParsedLicense {
  /** Raw JWT token */
  token: string;
  /** Parsed claims */
  claims: LicenseClaims;
  /** Current status */
  status: LicenseStatus;
  /** Expiration date */
  expiresAt: Date;
  /** Days until expiration (negative if expired) */
  daysUntilExpiration: number;
  /** Whether signature was verified */
  signatureVerified: boolean;
  /** Validation errors, if any */
  errors: string[];
}

/**
 * License validation result
 */
export interface LicenseValidationResult {
  valid: boolean;
  license: ParsedLicense | null;
  errors: string[];
}

/**
 * Feature gating result
 */
export interface FeatureGateResult {
  allowed: boolean;
  reason?: string;
  tier?: LicenseTier;
}

/**
 * Limit check result
 */
export interface LimitCheckResult {
  allowed: boolean;
  current: number;
  limit: number | null;
  reason?: string;
}

/**
 * License configuration
 */
export interface LicenseConfig {
  /** Path to license file or license key */
  licenseKey?: string;
  /** JWKS endpoint for key rotation */
  jwksEndpoint?: string;
  /** Public key for signature verification (PEM format) */
  publicKey?: string;
  /** Grace period in days after expiration (default: 14) */
  gracePeriodDays?: number;
  /** Allow offline validation with cached license */
  allowOffline?: boolean;
  /** Callback when license expires */
  onExpire?: (license: ParsedLicense) => void;
  /** Callback when entering grace period */
  onGracePeriod?: (license: ParsedLicense, daysRemaining: number) => void;
}

/**
 * Default limits by tier
 */
export const DEFAULT_LIMITS: Record<LicenseTier, LicenseLimits> = {
  community: {
    maxAgents: 3,
    maxAssets: 10,
    maxUsers: 1,
    maxApiCallsPerDay: 100,
    maxConcurrentInstances: 1,
  },
  pro: {
    maxAgents: 25,
    maxAssets: 100,
    maxUsers: 10,
    maxApiCallsPerDay: 10000,
    maxConcurrentInstances: 10,
  },
  enterprise: {
    maxAgents: null, // unlimited
    maxAssets: null, // unlimited
    maxUsers: null, // unlimited
    maxApiCallsPerDay: null, // unlimited
    maxConcurrentInstances: null, // unlimited
  },
};

/**
 * Features by tier
 */
export const FEATURES_BY_TIER: Record<LicenseTier, FeatureId[]> = {
  community: [
    "asset_cards",
    "risk_classification",
    "golden_thread",
    "detection",
    "cli_basic",
  ],
  pro: [
    "asset_cards",
    "risk_classification",
    "golden_thread",
    "detection",
    "cli_basic",
    "kill_switch",
    "capability_decay",
    "telemetry",
    "policy_engine",
    "a2a_auth",
  ],
  enterprise: [
    "asset_cards",
    "risk_classification",
    "golden_thread",
    "detection",
    "cli_basic",
    "kill_switch",
    "capability_decay",
    "telemetry",
    "policy_engine",
    "a2a_auth",
    "multi_jurisdiction",
    "custom_policies",
    "sso",
    "audit_logs",
    "white_label",
  ],
};
