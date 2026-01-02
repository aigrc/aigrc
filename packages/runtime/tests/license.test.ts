import { describe, it, expect, beforeEach, vi } from "vitest";
import * as jose from "jose";
import {
  // Types
  type LicenseClaims,
  type ParsedLicense,
  type FeatureId,
  type LicenseTier,
  DEFAULT_LIMITS,
  FEATURES_BY_TIER,

  // Parser (AIG-103)
  parseLicenseToken,
  parseLicenseClaims,
  parseUnverifiedLicense,
  calculateLicenseStatus,
  isValidJwtFormat,

  // Verification (AIG-104)
  verifyLicense,
  clearJWKSCache,
  isSupportedAlgorithm,

  // Claims (AIG-105)
  validateLicenseClaims,
  isInGracePeriod,
  getDaysRemaining,
  getGraceDaysRemaining,
  getLicenseStatus,

  // Features (AIG-106)
  FeatureGate,
  getRequiredTier,
  getFeaturesForTier,
  tierHasFeature,
  createCommunityFeatureGate,
  createStrictFeatureGate,

  // Limits (AIG-107)
  LimitEnforcer,
  createCommunityLimitEnforcer,
  isUnlimited,
  formatLimit,
  formatUsageVsLimit,

  // Unified Manager
  LicenseManager,
  createLicenseManager,
} from "../src/license/index.js";

// ─────────────────────────────────────────────────────────────────
// TEST HELPERS
// ─────────────────────────────────────────────────────────────────

const TEST_UUID = "11111111-1111-1111-1111-111111111111";

function createTestClaims(overrides: Partial<LicenseClaims> = {}): LicenseClaims {
  const now = Math.floor(Date.now() / 1000);
  return {
    iss: "aigos-license",
    sub: "test-license-001",
    aud: "test-org",
    exp: now + 30 * 24 * 60 * 60, // 30 days from now
    iat: now,
    nbf: now,
    jti: TEST_UUID,
    aigos_license: {
      tier: "pro",
      organization: "Test Organization",
      organization_id: "org-test-001",
      features: ["asset_cards", "risk_classification", "golden_thread", "detection", "cli_basic", "kill_switch", "capability_decay"],
      limits: {
        maxAgents: 25,
        maxAssets: 100,
        maxUsers: 10,
        maxApiCallsPerDay: 10000,
        maxConcurrentInstances: 10,
      },
      trial: false,
    },
    ...overrides,
  };
}

async function createTestToken(claims: LicenseClaims): Promise<string> {
  // Create a test key pair
  const { privateKey } = await jose.generateKeyPair("RS256");

  // Sign the token
  const token = await new jose.SignJWT(claims as unknown as jose.JWTPayload)
    .setProtectedHeader({ alg: "RS256" })
    .sign(privateKey);

  return token;
}

function createMockParsedLicense(overrides: Partial<ParsedLicense> = {}): ParsedLicense {
  const claims = createTestClaims();
  return {
    token: "mock-token",
    claims,
    status: "valid",
    expiresAt: new Date(claims.exp * 1000),
    daysUntilExpiration: 30,
    signatureVerified: true,
    errors: [],
    ...overrides,
  };
}

// ─────────────────────────────────────────────────────────────────
// JWT PARSING TESTS (AIG-103)
// ─────────────────────────────────────────────────────────────────

describe("License JWT Parsing (AIG-103)", () => {
  describe("parseLicenseToken", () => {
    it("should parse valid JWT token parts", async () => {
      const claims = createTestClaims();
      const token = await createTestToken(claims);

      const { header, payload, signature } = parseLicenseToken(token);

      expect(header.alg).toBe("RS256");
      expect(payload).toBeDefined();
      expect(signature).toBeDefined();
    });

    it("should throw on invalid JWT format", () => {
      expect(() => parseLicenseToken("not-a-jwt")).toThrow("Invalid JWT format");
      expect(() => parseLicenseToken("only.two")).toThrow("Invalid JWT format");
    });

    it("should throw on malformed base64", () => {
      expect(() => parseLicenseToken("!!!.@@@.###")).toThrow();
    });
  });

  describe("parseLicenseClaims", () => {
    it("should parse valid license claims", () => {
      const claims = createTestClaims();
      const parsed = parseLicenseClaims(claims);

      expect(parsed.iss).toBe("aigos-license");
      expect(parsed.aigos_license.tier).toBe("pro");
      expect(parsed.aigos_license.organization).toBe("Test Organization");
    });

    it("should throw on invalid claims", () => {
      expect(() => parseLicenseClaims({})).toThrow("Invalid license claims");
      expect(() => parseLicenseClaims({ iss: "wrong" })).toThrow();
    });
  });

  describe("calculateLicenseStatus", () => {
    it("should return valid for non-expired license", () => {
      const claims = createTestClaims();
      const result = calculateLicenseStatus(claims);

      expect(result.status).toBe("valid");
      expect(result.daysUntilExpiration).toBeGreaterThan(0);
    });

    it("should return grace for recently expired license", () => {
      const now = Math.floor(Date.now() / 1000);
      const claims = createTestClaims({
        exp: now - 5 * 24 * 60 * 60, // 5 days ago
      });
      const result = calculateLicenseStatus(claims);

      expect(result.status).toBe("grace");
      expect(result.daysUntilExpiration).toBeLessThan(0);
    });

    it("should return expired for license beyond grace period", () => {
      const now = Math.floor(Date.now() / 1000);
      const claims = createTestClaims({
        exp: now - 20 * 24 * 60 * 60, // 20 days ago
      });
      const result = calculateLicenseStatus(claims);

      expect(result.status).toBe("expired");
    });

    it("should return invalid for not-yet-valid license", () => {
      const now = Math.floor(Date.now() / 1000);
      const claims = createTestClaims({
        nbf: now + 24 * 60 * 60, // Tomorrow
      });
      const result = calculateLicenseStatus(claims);

      expect(result.status).toBe("invalid");
    });
  });

  describe("parseUnverifiedLicense", () => {
    it("should parse token without verification", async () => {
      const claims = createTestClaims();
      const token = await createTestToken(claims);
      const parsed = parseUnverifiedLicense(token);

      expect(parsed.claims.aigos_license.tier).toBe("pro");
      expect(parsed.signatureVerified).toBe(false);
    });
  });

  describe("isValidJwtFormat", () => {
    it("should return true for valid JWT", async () => {
      const claims = createTestClaims();
      const token = await createTestToken(claims);
      expect(isValidJwtFormat(token)).toBe(true);
    });

    it("should return false for invalid JWT", () => {
      expect(isValidJwtFormat("not-valid")).toBe(false);
    });
  });
});

// ─────────────────────────────────────────────────────────────────
// SIGNATURE VERIFICATION TESTS (AIG-104)
// ─────────────────────────────────────────────────────────────────

describe("License Signature Verification (AIG-104)", () => {
  beforeEach(() => {
    clearJWKSCache();
  });

  describe("verifyLicense", () => {
    it("should verify license with public key", async () => {
      const { publicKey, privateKey } = await jose.generateKeyPair("RS256");
      const publicKeyPem = await jose.exportSPKI(publicKey);

      const claims = createTestClaims();
      const token = await new jose.SignJWT(claims as unknown as jose.JWTPayload)
        .setProtectedHeader({ alg: "RS256" })
        .sign(privateKey);

      const result = await verifyLicense(token, {
        publicKey: publicKeyPem,
      });

      expect(result.valid).toBe(true);
      expect(result.license?.signatureVerified).toBe(true);
    });

    it("should fail with wrong key", async () => {
      const { privateKey } = await jose.generateKeyPair("RS256");
      const { publicKey: wrongPublicKey } = await jose.generateKeyPair("RS256");
      const wrongPublicKeyPem = await jose.exportSPKI(wrongPublicKey);

      const claims = createTestClaims();
      const token = await new jose.SignJWT(claims as unknown as jose.JWTPayload)
        .setProtectedHeader({ alg: "RS256" })
        .sign(privateKey);

      const result = await verifyLicense(token, {
        publicKey: wrongPublicKeyPem,
      });

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it("should allow offline mode without verification", async () => {
      const claims = createTestClaims();
      const token = await createTestToken(claims);

      const result = await verifyLicense(token, {
        allowOffline: true,
      });

      expect(result.valid).toBe(true);
      expect(result.license?.signatureVerified).toBe(false);
    });

    it("should fail without any key configuration", async () => {
      const claims = createTestClaims();
      const token = await createTestToken(claims);

      const result = await verifyLicense(token, {});

      expect(result.valid).toBe(false);
    });
  });

  describe("isSupportedAlgorithm", () => {
    it("should accept RS256", async () => {
      const { privateKey } = await jose.generateKeyPair("RS256");
      const token = await new jose.SignJWT({})
        .setProtectedHeader({ alg: "RS256" })
        .sign(privateKey);

      expect(isSupportedAlgorithm(token)).toBe(true);
    });

    it("should accept ES256", async () => {
      const { privateKey } = await jose.generateKeyPair("ES256");
      const token = await new jose.SignJWT({})
        .setProtectedHeader({ alg: "ES256" })
        .sign(privateKey);

      expect(isSupportedAlgorithm(token)).toBe(true);
    });
  });
});

// ─────────────────────────────────────────────────────────────────
// CLAIMS VALIDATION TESTS (AIG-105)
// ─────────────────────────────────────────────────────────────────

describe("License Claims Validation (AIG-105)", () => {
  describe("validateLicenseClaims", () => {
    it("should validate correct claims", () => {
      const claims = createTestClaims();
      const result = validateLicenseClaims(claims);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("should reject wrong issuer", () => {
      const claims = createTestClaims({ iss: "wrong-issuer" as "aigos-license" });
      const result = validateLicenseClaims(claims as LicenseClaims, { expectedIssuer: "aigos-license" });

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes("issuer"))).toBe(true);
    });

    it("should reject wrong audience", () => {
      const claims = createTestClaims({ aud: "wrong-org" });
      const result = validateLicenseClaims(claims, { expectedAudience: "test-org" });

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes("audience"))).toBe(true);
    });

    it("should warn for grace period", () => {
      const now = Math.floor(Date.now() / 1000);
      const claims = createTestClaims({ exp: now - 5 * 24 * 60 * 60 });
      const result = validateLicenseClaims(claims);

      expect(result.valid).toBe(true);
      expect(result.warnings.some((w) => w.includes("grace period"))).toBe(true);
    });

    it("should reject expired beyond grace", () => {
      const now = Math.floor(Date.now() / 1000);
      const claims = createTestClaims({ exp: now - 20 * 24 * 60 * 60 });
      const result = validateLicenseClaims(claims);

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes("expired"))).toBe(true);
    });

    it("should reject trial when not allowed", () => {
      const claims = createTestClaims();
      claims.aigos_license.trial = true;
      const result = validateLicenseClaims(claims, { allowTrial: false });

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes("Trial"))).toBe(true);
    });

    it("should reject insufficient tier", () => {
      const claims = createTestClaims();
      claims.aigos_license.tier = "community";
      const result = validateLicenseClaims(claims, { minimumTier: "enterprise" });

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes("tier"))).toBe(true);
    });
  });

  describe("isInGracePeriod", () => {
    it("should return true for recently expired license", () => {
      const now = Math.floor(Date.now() / 1000);
      const claims = createTestClaims({ exp: now - 5 * 24 * 60 * 60 });
      expect(isInGracePeriod(claims)).toBe(true);
    });

    it("should return false for valid license", () => {
      const claims = createTestClaims();
      expect(isInGracePeriod(claims)).toBe(false);
    });
  });

  describe("getDaysRemaining", () => {
    it("should return positive for valid license", () => {
      const claims = createTestClaims();
      expect(getDaysRemaining(claims)).toBeGreaterThan(0);
    });

    it("should return negative for expired license", () => {
      const now = Math.floor(Date.now() / 1000);
      const claims = createTestClaims({ exp: now - 5 * 24 * 60 * 60 });
      expect(getDaysRemaining(claims)).toBeLessThan(0);
    });
  });

  describe("getGraceDaysRemaining", () => {
    it("should return full grace period for valid license", () => {
      const claims = createTestClaims();
      expect(getGraceDaysRemaining(claims)).toBe(14);
    });

    it("should return remaining grace days for expired license", () => {
      const now = Math.floor(Date.now() / 1000);
      const claims = createTestClaims({ exp: now - 5 * 24 * 60 * 60 });
      expect(getGraceDaysRemaining(claims)).toBe(9);
    });
  });

  describe("getLicenseStatus", () => {
    it("should return invalid if signature not verified", () => {
      const claims = createTestClaims();
      expect(getLicenseStatus(claims, false)).toBe("invalid");
    });

    it("should return valid for verified non-expired license", () => {
      const claims = createTestClaims();
      expect(getLicenseStatus(claims, true)).toBe("valid");
    });
  });
});

// ─────────────────────────────────────────────────────────────────
// FEATURE GATING TESTS (AIG-106)
// ─────────────────────────────────────────────────────────────────

describe("Feature Gating (AIG-106)", () => {
  describe("FeatureGate", () => {
    it("should allow community features without license", () => {
      const gate = new FeatureGate();
      const result = gate.isFeatureAllowed("asset_cards");

      expect(result.allowed).toBe(true);
      expect(result.tier).toBe("community");
    });

    it("should deny pro features without license", () => {
      const gate = new FeatureGate();
      const result = gate.isFeatureAllowed("kill_switch");

      expect(result.allowed).toBe(false);
    });

    it("should allow pro features with pro license", () => {
      const gate = new FeatureGate();
      gate.setLicense(createMockParsedLicense());
      const result = gate.isFeatureAllowed("kill_switch");

      expect(result.allowed).toBe(true);
      expect(result.tier).toBe("pro");
    });

    it("should deny enterprise features with pro license", () => {
      const gate = new FeatureGate();
      gate.setLicense(createMockParsedLicense());
      const result = gate.isFeatureAllowed("multi_jurisdiction");

      expect(result.allowed).toBe(false);
    });

    it("should support override features", () => {
      const gate = new FeatureGate({
        overrideFeatures: ["multi_jurisdiction"],
      });
      const result = gate.isFeatureAllowed("multi_jurisdiction");

      expect(result.allowed).toBe(true);
    });

    it("should deny all in strict mode without license", () => {
      const gate = new FeatureGate({
        defaultBehavior: "deny_all",
        strictMode: true,
      });
      const result = gate.isFeatureAllowed("asset_cards");

      expect(result.allowed).toBe(false);
    });

    it("should report degraded mode correctly", () => {
      const gate = new FeatureGate();
      expect(gate.isDegradedMode()).toBe(true);
      expect(gate.getDegradedModeReason()).toContain("community");

      gate.setLicense(createMockParsedLicense());
      expect(gate.isDegradedMode()).toBe(false);
    });
  });

  describe("getRequiredTier", () => {
    it("should return community for asset_cards", () => {
      expect(getRequiredTier("asset_cards")).toBe("community");
    });

    it("should return pro for kill_switch", () => {
      expect(getRequiredTier("kill_switch")).toBe("pro");
    });

    it("should return enterprise for multi_jurisdiction", () => {
      expect(getRequiredTier("multi_jurisdiction")).toBe("enterprise");
    });
  });

  describe("getFeaturesForTier", () => {
    it("should return correct features for community", () => {
      const features = getFeaturesForTier("community");
      expect(features).toContain("asset_cards");
      expect(features).not.toContain("kill_switch");
    });

    it("should return correct features for enterprise", () => {
      const features = getFeaturesForTier("enterprise");
      expect(features).toContain("multi_jurisdiction");
    });
  });

  describe("tierHasFeature", () => {
    it("should return true for community feature in all tiers", () => {
      expect(tierHasFeature("community", "asset_cards")).toBe(true);
      expect(tierHasFeature("pro", "asset_cards")).toBe(true);
      expect(tierHasFeature("enterprise", "asset_cards")).toBe(true);
    });

    it("should return false for pro feature in community", () => {
      expect(tierHasFeature("community", "kill_switch")).toBe(false);
    });
  });

  describe("createCommunityFeatureGate", () => {
    it("should create gate with community defaults", () => {
      const gate = createCommunityFeatureGate();
      expect(gate.isFeatureAllowed("asset_cards").allowed).toBe(true);
      expect(gate.isFeatureAllowed("kill_switch").allowed).toBe(false);
    });
  });

  describe("createStrictFeatureGate", () => {
    it("should create gate that denies all without license", () => {
      const gate = createStrictFeatureGate();
      expect(gate.isFeatureAllowed("asset_cards").allowed).toBe(false);
    });
  });
});

// ─────────────────────────────────────────────────────────────────
// LIMIT ENFORCEMENT TESTS (AIG-107)
// ─────────────────────────────────────────────────────────────────

describe("Limit Enforcement (AIG-107)", () => {
  describe("LimitEnforcer", () => {
    it("should use community limits without license", () => {
      const enforcer = new LimitEnforcer();
      const limits = enforcer.getLimits();

      expect(limits.maxAgents).toBe(DEFAULT_LIMITS.community.maxAgents);
    });

    it("should use license limits with license", () => {
      const enforcer = new LimitEnforcer();
      enforcer.setLicense(createMockParsedLicense());
      const limits = enforcer.getLimits();

      expect(limits.maxAgents).toBe(25);
    });

    it("should track usage correctly", () => {
      const enforcer = new LimitEnforcer();
      enforcer.updateUsage({ agents: 2, assets: 5 });

      const usage = enforcer.getUsage();
      expect(usage.agents).toBe(2);
      expect(usage.assets).toBe(5);
    });

    it("should increment and decrement usage", () => {
      const enforcer = new LimitEnforcer();
      enforcer.incrementUsage("agents", 3);
      expect(enforcer.getUsage().agents).toBe(3);

      enforcer.decrementUsage("agents", 1);
      expect(enforcer.getUsage().agents).toBe(2);
    });

    it("should check limits correctly", () => {
      const enforcer = new LimitEnforcer();
      enforcer.updateUsage({ agents: 2 });

      const result = enforcer.checkLimit("maxAgents");
      expect(result.allowed).toBe(true);
      expect(result.current).toBe(2);
      expect(result.limit).toBe(3);
    });

    it("should block when limit exceeded", () => {
      const enforcer = new LimitEnforcer();
      enforcer.updateUsage({ agents: 5 });

      const result = enforcer.checkLimit("maxAgents");
      expect(result.allowed).toBe(false);
    });

    it("should check canAdd correctly", () => {
      const enforcer = new LimitEnforcer();
      enforcer.updateUsage({ agents: 2 });

      const result = enforcer.canAdd("maxAgents");
      expect(result.allowed).toBe(true);

      enforcer.updateUsage({ agents: 3 });
      const result2 = enforcer.canAdd("maxAgents");
      expect(result2.allowed).toBe(false);
    });

    it("should detect near-limit warnings", () => {
      const enforcer = new LimitEnforcer();
      enforcer.updateUsage({ agents: 3, assets: 8 }); // 100% and 80%

      const warnings = enforcer.getNearLimitWarnings(0.8);
      expect(warnings.length).toBe(2);
    });

    it("should return null for unlimited resources", () => {
      const enforcer = new LimitEnforcer();
      const license = createMockParsedLicense();
      license.claims.aigos_license.tier = "enterprise";
      license.claims.aigos_license.limits.maxAgents = null;
      enforcer.setLicense(license);

      const result = enforcer.checkLimit("maxAgents");
      expect(result.allowed).toBe(true);
      expect(result.limit).toBeNull();
    });
  });

  describe("isUnlimited", () => {
    it("should return true for enterprise limits", () => {
      expect(isUnlimited("enterprise", "maxAgents")).toBe(true);
    });

    it("should return false for community limits", () => {
      expect(isUnlimited("community", "maxAgents")).toBe(false);
    });
  });

  describe("formatLimit", () => {
    it("should format number limits", () => {
      expect(formatLimit(100)).toBe("100");
    });

    it("should format unlimited", () => {
      expect(formatLimit(null)).toBe("Unlimited");
    });
  });

  describe("formatUsageVsLimit", () => {
    it("should format usage vs limit", () => {
      expect(formatUsageVsLimit(5, 10)).toBe("5 / 10");
    });

    it("should format usage with unlimited", () => {
      expect(formatUsageVsLimit(100, null)).toBe("100 (unlimited)");
    });
  });
});

// ─────────────────────────────────────────────────────────────────
// LICENSE MANAGER TESTS
// ─────────────────────────────────────────────────────────────────

describe("LicenseManager", () => {
  it("should initialize with valid license", async () => {
    const { publicKey, privateKey } = await jose.generateKeyPair("RS256");
    const publicKeyPem = await jose.exportSPKI(publicKey);

    const claims = createTestClaims();
    const token = await new jose.SignJWT(claims as unknown as jose.JWTPayload)
      .setProtectedHeader({ alg: "RS256" })
      .sign(privateKey);

    const manager = createLicenseManager({ publicKey: publicKeyPem });
    await manager.initialize(token);

    expect(manager.isValid()).toBe(true);
    expect(manager.getTier()).toBe("pro");
    expect(manager.isFeatureAllowed("kill_switch").allowed).toBe(true);
  });

  it("should track usage across operations", async () => {
    const manager = createLicenseManager({ allowOffline: true });
    const claims = createTestClaims();
    const token = await createTestToken(claims);
    await manager.initialize(token);

    manager.incrementUsage("agents", 2);
    expect(manager.getUsage().agents).toBe(2);

    const limitResult = manager.checkLimit("maxAgents");
    expect(limitResult.current).toBe(2);
  });

  it("should report degraded mode without license", () => {
    const manager = createLicenseManager();
    expect(manager.isDegradedMode()).toBe(true);
    expect(manager.getDegradedModeReason()).toContain("community");
  });

  it("should dispose cleanly", async () => {
    const manager = createLicenseManager({ allowOffline: true });
    const claims = createTestClaims();
    const token = await createTestToken(claims);
    await manager.initialize(token);

    manager.dispose();
    expect(manager.getLicense()).toBeNull();
  });
});
