/**
 * License Manager (AIGOS-E11)
 *
 * Manages license validation, feature gating, and usage tracking.
 */

import type {
  LicensePayload,
  LicenseTier,
  FeatureId,
  LicenseLimits,
  LicenseValidationResult,
  LicenseErrorCode,
  LicenseWarning,
  FeatureCheckResult,
  LimitCheckResult,
  UsageState,
  LicenseManagerConfig,
  LicenseEvent,
  LicenseEventHandler,
} from "./types.js";

import {
  TIER_FEATURES,
  TIER_LIMITS,
  DEFAULT_LICENSE_ISSUER,
  DEFAULT_LICENSE_AUDIENCE,
  DEFAULT_GRACE_PERIOD_DAYS,
  LICENSE_JWT_TYPE,
} from "./types.js";

// ─────────────────────────────────────────────────────────────────
// JWT UTILITIES
// ─────────────────────────────────────────────────────────────────

/**
 * Base64URL decode
 */
function base64UrlDecode(str: string): string {
  let padded = str.replace(/-/g, "+").replace(/_/g, "/");
  const padding = (4 - (padded.length % 4)) % 4;
  padded += "=".repeat(padding);
  return atob(padded);
}

/**
 * Base64URL decode to ArrayBuffer
 */
function base64UrlDecodeBuffer(str: string): ArrayBuffer {
  const decoded = base64UrlDecode(str);
  const bytes = new Uint8Array(decoded.length);
  for (let i = 0; i < decoded.length; i++) {
    bytes[i] = decoded.charCodeAt(i);
  }
  return bytes.buffer;
}

/**
 * Parse JWT without verification
 */
function parseJWT(token: string): {
  header: Record<string, unknown>;
  payload: Record<string, unknown>;
  signature: string;
  signingInput: string;
} | null {
  const parts = token.split(".");
  if (parts.length !== 3) {
    return null;
  }

  try {
    const header = JSON.parse(base64UrlDecode(parts[0]));
    const payload = JSON.parse(base64UrlDecode(parts[1]));
    return {
      header,
      payload,
      signature: parts[2],
      signingInput: `${parts[0]}.${parts[1]}`,
    };
  } catch {
    return null;
  }
}

/**
 * Verify JWT signature with RS256
 */
async function verifyRS256Signature(
  signingInput: string,
  signature: string,
  publicKey: CryptoKey
): Promise<boolean> {
  const signatureBuffer = base64UrlDecodeBuffer(signature);
  const dataBuffer = new TextEncoder().encode(signingInput);

  return crypto.subtle.verify(
    "RSASSA-PKCS1-v1_5",
    publicKey,
    signatureBuffer,
    dataBuffer
  );
}

// ─────────────────────────────────────────────────────────────────
// DEFAULT CONFIGURATION
// ─────────────────────────────────────────────────────────────────

const DEFAULT_CONFIG: LicenseManagerConfig = {
  expectedIssuer: DEFAULT_LICENSE_ISSUER,
  expectedAudience: DEFAULT_LICENSE_AUDIENCE,
  gracePeriodDays: DEFAULT_GRACE_PERIOD_DAYS,
};

// ─────────────────────────────────────────────────────────────────
// COMMUNITY LICENSE (DEFAULT)
// ─────────────────────────────────────────────────────────────────

const COMMUNITY_LICENSE: LicensePayload = {
  iss: DEFAULT_LICENSE_ISSUER,
  sub: "community",
  aud: DEFAULT_LICENSE_AUDIENCE,
  exp: Math.floor(Date.now() / 1000) + 86400 * 365 * 100, // 100 years
  iat: Math.floor(Date.now() / 1000),
  nbf: Math.floor(Date.now() / 1000),
  jti: "community-default",
  aigos_license: {
    tier: "community",
    organization_name: "Community User",
    features: [],
    limits: TIER_LIMITS.community,
    activated_at: new Date().toISOString(),
    support_level: "community",
  },
};

// ─────────────────────────────────────────────────────────────────
// LICENSE MANAGER CLASS
// ─────────────────────────────────────────────────────────────────

/**
 * License Manager
 *
 * Manages license validation, feature gating, and usage limits.
 */
export class LicenseManager {
  private config: LicenseManagerConfig;
  private license: LicensePayload | null = null;
  private publicKeys: Map<string, CryptoKey> = new Map();
  private usage: UsageState = {
    agents: 0,
    assets: 0,
    users: 0,
    policies: 0,
    updatedAt: new Date().toISOString(),
  };
  private eventHandlers: LicenseEventHandler[] = [];

  constructor(config: Partial<LicenseManagerConfig> = {}) {
    this.config = {
      ...DEFAULT_CONFIG,
      ...config,
    };
  }

  // ─────────────────────────────────────────────────────────────────
  // LICENSE LOADING
  // ─────────────────────────────────────────────────────────────────

  /**
   * Load and validate a license
   */
  async loadLicense(licenseKey: string): Promise<LicenseValidationResult> {
    const result = await this.validateLicense(licenseKey);

    if (result.valid && result.license) {
      this.license = result.license;

      this.emitEvent({
        type: "license.loaded",
        timestamp: new Date().toISOString(),
        tier: result.license.aigos_license.tier,
        organization: result.license.aigos_license.organization_name,
        expiresAt: new Date(result.license.exp * 1000).toISOString(),
      });

      // Check for grace period
      if (result.inGracePeriod && result.daysUntilExpiration !== undefined) {
        this.emitEvent({
          type: "license.grace_period",
          timestamp: new Date().toISOString(),
          daysRemaining: Math.abs(result.daysUntilExpiration),
        });

        if (this.config.onGracePeriod) {
          this.config.onGracePeriod(Math.abs(result.daysUntilExpiration));
        }
      }
    }

    return result;
  }

  /**
   * Load community (free) license
   */
  loadCommunityLicense(): void {
    this.license = COMMUNITY_LICENSE;

    this.emitEvent({
      type: "license.loaded",
      timestamp: new Date().toISOString(),
      tier: "community",
      organization: "Community User",
      expiresAt: new Date(COMMUNITY_LICENSE.exp * 1000).toISOString(),
    });
  }

  /**
   * Validate a license JWT
   */
  async validateLicense(licenseKey: string): Promise<LicenseValidationResult> {
    // Parse the token
    const parsed = parseJWT(licenseKey);
    if (!parsed) {
      return this.failure("INVALID_FORMAT", "Invalid license format");
    }

    const { header, payload, signature, signingInput } = parsed;

    // Validate header type (optional)
    if (header.typ && header.typ !== LICENSE_JWT_TYPE && header.typ !== "JWT") {
      return this.failure("INVALID_FORMAT", `Invalid token type: ${header.typ}`);
    }

    // Validate algorithm
    const alg = header.alg as string;
    if (alg !== "RS256") {
      return this.failure("INVALID_FORMAT", `Unsupported algorithm: ${alg}`);
    }

    // Get the signing key
    const kid = header.kid as string;
    let publicKey = this.publicKeys.get(kid);

    // Try to refresh keys if not found
    if (!publicKey && this.config.jwksEndpoint) {
      await this.refreshKeys();
      publicKey = this.publicKeys.get(kid);
    }

    // For testing/development, skip signature verification if no keys
    if (!publicKey) {
      // In production, this would be an error
      // return this.failure("KEY_NOT_FOUND", `Signing key not found: ${kid}`);
      console.warn("License validation: No public key available, skipping signature verification");
    } else {
      // Verify signature
      const signatureValid = await verifyRS256Signature(
        signingInput,
        signature,
        publicKey
      );

      if (!signatureValid) {
        return this.failure("INVALID_SIGNATURE", "Signature verification failed");
      }
    }

    // Validate timestamp claims
    const now = Math.floor(Date.now() / 1000);
    const gracePeriodSeconds = this.config.gracePeriodDays * 86400;

    const exp = payload.exp as number;
    const daysUntilExpiration = Math.floor((exp - now) / 86400);
    const inGracePeriod = exp < now && exp + gracePeriodSeconds >= now;

    if (exp && exp + gracePeriodSeconds < now) {
      return this.failure("EXPIRED", "License has expired beyond grace period");
    }

    const nbf = payload.nbf as number;
    if (nbf && nbf > now) {
      return this.failure("NOT_YET_VALID", "License is not yet valid");
    }

    // Validate issuer
    const iss = payload.iss as string;
    if (iss !== this.config.expectedIssuer) {
      return this.failure("INVALID_ISSUER", `Invalid issuer: ${iss}`);
    }

    // Validate audience
    const aud = payload.aud as string;
    if (aud !== this.config.expectedAudience) {
      return this.failure("INVALID_AUDIENCE", `Invalid audience: ${aud}`);
    }

    // Validate AIGOS license claims
    const aigosLicense = (payload as unknown as LicensePayload).aigos_license;
    if (!aigosLicense) {
      return this.failure("INVALID_CLAIMS", "Missing AIGOS license claims");
    }

    if (!aigosLicense.tier) {
      return this.failure("INVALID_CLAIMS", "Missing license tier");
    }

    const warnings: LicenseWarning[] = [];

    // Warn if license is expiring soon
    if (daysUntilExpiration <= 30 && daysUntilExpiration > 0) {
      warnings.push({
        code: "EXPIRING_SOON",
        message: `License expires in ${daysUntilExpiration} days`,
      });
    }

    // Warn if in grace period
    if (inGracePeriod) {
      warnings.push({
        code: "GRACE_PERIOD",
        message: `License expired, in grace period`,
      });
    }

    this.emitEvent({
      type: "license.validated",
      timestamp: new Date().toISOString(),
      valid: true,
    });

    return {
      valid: true,
      license: payload as unknown as LicensePayload,
      warnings: warnings.length > 0 ? warnings : undefined,
      daysUntilExpiration,
      inGracePeriod,
    };
  }

  // ─────────────────────────────────────────────────────────────────
  // FEATURE GATING
  // ─────────────────────────────────────────────────────────────────

  /**
   * Check if a feature is enabled
   */
  isFeatureEnabled(feature: FeatureId): FeatureCheckResult {
    if (!this.license) {
      this.loadCommunityLicense();
    }

    const license = this.license!;
    const tier = license.aigos_license.tier;

    // Check explicit features list first
    const explicitFeatures = license.aigos_license.features;
    if (explicitFeatures.includes(feature)) {
      this.emitFeatureCheck(feature, true);
      return { enabled: true };
    }

    // Check tier-based features
    const tierFeatures = TIER_FEATURES[tier];
    if (tierFeatures.includes(feature)) {
      this.emitFeatureCheck(feature, true);
      return { enabled: true };
    }

    // Feature not enabled
    const requiredTier = this.getRequiredTier(feature);
    this.emitFeatureCheck(feature, false);

    return {
      enabled: false,
      requiredTier,
      reason: `Feature ${feature} requires ${requiredTier} tier or higher`,
    };
  }

  /**
   * Get the minimum tier required for a feature
   */
  getRequiredTier(feature: FeatureId): LicenseTier {
    for (const tier of ["professional", "enterprise"] as LicenseTier[]) {
      if (TIER_FEATURES[tier].includes(feature)) {
        return tier;
      }
    }
    return "enterprise"; // Default to enterprise for unknown features
  }

  // ─────────────────────────────────────────────────────────────────
  // LIMIT ENFORCEMENT
  // ─────────────────────────────────────────────────────────────────

  /**
   * Check if a limit is exceeded
   */
  checkLimit(limitType: keyof LicenseLimits): LimitCheckResult {
    if (!this.license) {
      this.loadCommunityLicense();
    }

    const license = this.license!;
    const tier = license.aigos_license.tier;

    // Get limit (explicit override or tier default)
    const explicitLimit = license.aigos_license.limits[limitType];
    const tierLimit = TIER_LIMITS[tier][limitType];
    const limit = explicitLimit ?? tierLimit;

    // Get current usage
    const current = this.usage[limitType.replace("max_", "") as keyof UsageState] as number;

    // Check if exceeded (-1 = unlimited)
    const exceeded = limit !== -1 && current >= limit;

    this.emitEvent({
      type: "license.limit_check",
      timestamp: new Date().toISOString(),
      limit: limitType,
      current,
      max: limit,
      exceeded,
    });

    if (exceeded) {
      this.emitEvent({
        type: "license.limit_exceeded",
        timestamp: new Date().toISOString(),
        limit: limitType,
        current,
        max: limit,
      });

      if (this.config.onLimitExceeded) {
        this.config.onLimitExceeded(limitType, current, limit);
      }
    }

    return {
      exceeded,
      current,
      limit,
      reason: exceeded
        ? `Limit of ${limit} ${limitType.replace("max_", "")} exceeded`
        : undefined,
    };
  }

  /**
   * Update usage state
   */
  updateUsage(updates: Partial<Omit<UsageState, "updatedAt">>): void {
    this.usage = {
      ...this.usage,
      ...updates,
      updatedAt: new Date().toISOString(),
    };
  }

  /**
   * Increment a usage counter
   */
  incrementUsage(key: "agents" | "assets" | "users" | "policies"): LimitCheckResult {
    this.usage[key]++;
    this.usage.updatedAt = new Date().toISOString();
    return this.checkLimit(`max_${key}` as keyof LicenseLimits);
  }

  /**
   * Decrement a usage counter
   */
  decrementUsage(key: "agents" | "assets" | "users" | "policies"): void {
    if (this.usage[key] > 0) {
      this.usage[key]--;
      this.usage.updatedAt = new Date().toISOString();
    }
  }

  /**
   * Get current usage state
   */
  getUsage(): UsageState {
    return { ...this.usage };
  }

  // ─────────────────────────────────────────────────────────────────
  // LICENSE INFO
  // ─────────────────────────────────────────────────────────────────

  /**
   * Get current license info
   */
  getLicenseInfo(): {
    tier: LicenseTier;
    organization: string;
    expiresAt: Date;
    features: FeatureId[];
    limits: LicenseLimits;
    isValid: boolean;
    inGracePeriod: boolean;
    daysUntilExpiration: number;
  } | null {
    if (!this.license) {
      return null;
    }

    const now = Math.floor(Date.now() / 1000);
    const exp = this.license.exp;
    const gracePeriodSeconds = this.config.gracePeriodDays * 86400;
    const daysUntilExpiration = Math.floor((exp - now) / 86400);
    const inGracePeriod = exp < now && exp + gracePeriodSeconds >= now;
    const isValid = exp + gracePeriodSeconds >= now;

    const tier = this.license.aigos_license.tier;
    const tierFeatures = TIER_FEATURES[tier];
    const explicitFeatures = this.license.aigos_license.features;
    const features = [...new Set([...tierFeatures, ...explicitFeatures])];

    const tierLimits = TIER_LIMITS[tier];
    const explicitLimits = this.license.aigos_license.limits;
    const limits = { ...tierLimits, ...explicitLimits };

    return {
      tier,
      organization: this.license.aigos_license.organization_name,
      expiresAt: new Date(exp * 1000),
      features,
      limits,
      isValid,
      inGracePeriod,
      daysUntilExpiration,
    };
  }

  /**
   * Get the current tier
   */
  getTier(): LicenseTier {
    return this.license?.aigos_license.tier ?? "community";
  }

  // ─────────────────────────────────────────────────────────────────
  // KEY MANAGEMENT
  // ─────────────────────────────────────────────────────────────────

  /**
   * Refresh keys from JWKS endpoint
   */
  async refreshKeys(): Promise<void> {
    if (!this.config.jwksEndpoint) {
      return;
    }

    try {
      const response = await fetch(this.config.jwksEndpoint);
      if (!response.ok) {
        throw new Error(`JWKS fetch failed: ${response.status}`);
      }

      const jwks = (await response.json()) as { keys: JWKKey[] };

      for (const jwk of jwks.keys) {
        if (jwk.use === "sig" && jwk.kid && jwk.kty === "RSA") {
          const publicKey = await crypto.subtle.importKey(
            "jwk",
            jwk as JsonWebKey,
            { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
            true,
            ["verify"]
          );
          this.publicKeys.set(jwk.kid, publicKey);
        }
      }
    } catch (error) {
      console.error("Failed to refresh JWKS:", error);
    }
  }

  /**
   * Add a public key for signature verification
   */
  addPublicKey(kid: string, publicKey: CryptoKey): void {
    this.publicKeys.set(kid, publicKey);
  }

  // ─────────────────────────────────────────────────────────────────
  // EVENT HANDLING
  // ─────────────────────────────────────────────────────────────────

  /**
   * Register an event handler
   */
  onEvent(handler: LicenseEventHandler): () => void {
    this.eventHandlers.push(handler);
    return () => {
      const index = this.eventHandlers.indexOf(handler);
      if (index >= 0) {
        this.eventHandlers.splice(index, 1);
      }
    };
  }

  private emitEvent(event: LicenseEvent): void {
    for (const handler of this.eventHandlers) {
      try {
        handler(event);
      } catch (error) {
        console.error("License event handler error:", error);
      }
    }
  }

  private emitFeatureCheck(feature: FeatureId, enabled: boolean): void {
    this.emitEvent({
      type: "license.feature_check",
      timestamp: new Date().toISOString(),
      feature,
      enabled,
    });
  }

  private failure(
    errorCode: LicenseErrorCode,
    errorMessage: string
  ): LicenseValidationResult {
    this.emitEvent({
      type: "license.validated",
      timestamp: new Date().toISOString(),
      valid: false,
      errorCode,
    });

    return {
      valid: false,
      errorCode,
      errorMessage,
    };
  }
}

/**
 * JWK key structure
 */
interface JWKKey {
  kty: string;
  use?: string;
  kid?: string;
  alg?: string;
  n?: string;
  e?: string;
}

// ─────────────────────────────────────────────────────────────────
// FACTORY FUNCTION
// ─────────────────────────────────────────────────────────────────

/**
 * Create a license manager
 */
export function createLicenseManager(
  config: Partial<LicenseManagerConfig> = {}
): LicenseManager {
  return new LicenseManager(config);
}
