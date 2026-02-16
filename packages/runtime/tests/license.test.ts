/**
 * License Manager Tests (AIGOS-1106)
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  LicenseManager,
  createLicenseManager,
  TIER_FEATURES,
  TIER_LIMITS,
} from "../src/license/index.js";
import type { LicensePayload } from "../src/license/index.js";

// Helper to create a mock license JWT (unsigned)
function createMockLicenseJWT(payload: Partial<LicensePayload>): string {
  const header = {
    alg: "RS256",
    typ: "AIGOS-LIC+jwt",
    kid: "test-key-1",
  };

  const fullPayload: LicensePayload = {
    iss: "https://license.aigos.dev",
    sub: "org-123",
    aud: "aigrc",
    exp: Math.floor(Date.now() / 1000) + 86400 * 30, // 30 days
    iat: Math.floor(Date.now() / 1000),
    nbf: Math.floor(Date.now() / 1000),
    jti: "lic-" + Math.random().toString(36).substring(7),
    aigos_license: {
      tier: "professional",
      organization_name: "Test Organization",
      features: [],
      limits: {},
      activated_at: new Date().toISOString(),
      support_level: "standard",
    },
    ...payload,
  };

  // Update nested aigos_license if provided
  if (payload.aigos_license) {
    fullPayload.aigos_license = {
      ...fullPayload.aigos_license,
      ...payload.aigos_license,
    };
  }

  const headerB64 = btoa(JSON.stringify(header))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
  const payloadB64 = btoa(JSON.stringify(fullPayload))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

  // Fake signature (won't validate but allows parsing)
  const fakeSignature = "fake_signature_for_testing";

  return `${headerB64}.${payloadB64}.${fakeSignature}`;
}

describe("LicenseManager", () => {
  let manager: LicenseManager;

  beforeEach(() => {
    manager = createLicenseManager();
  });

  describe("Community License", () => {
    it("should load community license by default", () => {
      manager.loadCommunityLicense();
      const info = manager.getLicenseInfo();

      expect(info).toBeDefined();
      expect(info?.tier).toBe("community");
      expect(info?.organization).toBe("Community User");
      expect(info?.isValid).toBe(true);
    });

    it("should have community limits", () => {
      manager.loadCommunityLicense();
      const info = manager.getLicenseInfo();

      expect(info?.limits.max_agents).toBe(TIER_LIMITS.community.max_agents);
      expect(info?.limits.max_assets).toBe(TIER_LIMITS.community.max_assets);
    });

    it("should not have professional features", () => {
      manager.loadCommunityLicense();

      const killSwitch = manager.isFeatureEnabled("kill_switch");
      expect(killSwitch.enabled).toBe(false);
      expect(killSwitch.requiredTier).toBe("professional");

      const a2a = manager.isFeatureEnabled("a2a_auth");
      expect(a2a.enabled).toBe(false);
    });
  });

  describe("Professional License", () => {
    it("should validate professional license JWT", async () => {
      const licenseKey = createMockLicenseJWT({
        aigos_license: {
          tier: "professional",
          organization_name: "Acme Corp",
          features: [],
          limits: {},
          activated_at: new Date().toISOString(),
          support_level: "standard",
        },
      });

      const result = await manager.loadLicense(licenseKey);

      // Signature validation is skipped when no public key available
      expect(result.valid).toBe(true);
      expect(result.license?.aigos_license.tier).toBe("professional");
    });

    it("should have professional features", async () => {
      const licenseKey = createMockLicenseJWT({
        aigos_license: {
          tier: "professional",
          organization_name: "Acme Corp",
          features: [],
          limits: {},
          activated_at: new Date().toISOString(),
          support_level: "standard",
        },
      });

      await manager.loadLicense(licenseKey);

      expect(manager.isFeatureEnabled("kill_switch").enabled).toBe(true);
      expect(manager.isFeatureEnabled("capability_decay").enabled).toBe(true);
      expect(manager.isFeatureEnabled("a2a_auth").enabled).toBe(true);
    });

    it("should not have enterprise-only features", async () => {
      const licenseKey = createMockLicenseJWT({
        aigos_license: {
          tier: "professional",
          organization_name: "Acme Corp",
          features: [],
          limits: {},
          activated_at: new Date().toISOString(),
          support_level: "standard",
        },
      });

      await manager.loadLicense(licenseKey);

      expect(manager.isFeatureEnabled("sso").enabled).toBe(false);
      expect(manager.isFeatureEnabled("audit_logs").enabled).toBe(false);
    });
  });

  describe("Enterprise License", () => {
    it("should have all features", async () => {
      const licenseKey = createMockLicenseJWT({
        aigos_license: {
          tier: "enterprise",
          organization_name: "BigCorp Inc",
          features: [],
          limits: {},
          activated_at: new Date().toISOString(),
          support_level: "dedicated",
        },
      });

      await manager.loadLicense(licenseKey);

      expect(manager.isFeatureEnabled("kill_switch").enabled).toBe(true);
      expect(manager.isFeatureEnabled("sso").enabled).toBe(true);
      expect(manager.isFeatureEnabled("audit_logs").enabled).toBe(true);
      expect(manager.isFeatureEnabled("priority_support").enabled).toBe(true);
    });

    it("should have unlimited limits", async () => {
      const licenseKey = createMockLicenseJWT({
        aigos_license: {
          tier: "enterprise",
          organization_name: "BigCorp Inc",
          features: [],
          limits: {},
          activated_at: new Date().toISOString(),
          support_level: "dedicated",
        },
      });

      await manager.loadLicense(licenseKey);
      const info = manager.getLicenseInfo();

      expect(info?.limits.max_agents).toBe(-1);
      expect(info?.limits.max_assets).toBe(-1);
    });
  });

  describe("Limit Enforcement", () => {
    it("should track usage and check limits", () => {
      manager.loadCommunityLicense();

      // Initial check
      const initial = manager.checkLimit("max_agents");
      expect(initial.exceeded).toBe(false);
      expect(initial.current).toBe(0);
      expect(initial.limit).toBe(TIER_LIMITS.community.max_agents);

      // Increment usage
      manager.incrementUsage("agents");
      manager.incrementUsage("agents");
      manager.incrementUsage("agents");

      // Should be at limit
      const atLimit = manager.checkLimit("max_agents");
      expect(atLimit.exceeded).toBe(true);
      expect(atLimit.current).toBe(3);
    });

    it("should not exceed for enterprise (unlimited)", async () => {
      const licenseKey = createMockLicenseJWT({
        aigos_license: {
          tier: "enterprise",
          organization_name: "BigCorp Inc",
          features: [],
          limits: {},
          activated_at: new Date().toISOString(),
          support_level: "dedicated",
        },
      });

      await manager.loadLicense(licenseKey);

      // Add many agents
      for (let i = 0; i < 100; i++) {
        manager.incrementUsage("agents");
      }

      const check = manager.checkLimit("max_agents");
      expect(check.exceeded).toBe(false);
      expect(check.current).toBe(100);
      expect(check.limit).toBe(-1); // Unlimited
    });

    it("should decrement usage", () => {
      manager.loadCommunityLicense();

      manager.incrementUsage("agents");
      manager.incrementUsage("agents");
      expect(manager.getUsage().agents).toBe(2);

      manager.decrementUsage("agents");
      expect(manager.getUsage().agents).toBe(1);
    });
  });

  describe("License Expiration", () => {
    it("should detect expired license (beyond grace)", async () => {
      const licenseKey = createMockLicenseJWT({
        exp: Math.floor(Date.now() / 1000) - 86400 * 30, // Expired 30 days ago
        aigos_license: {
          tier: "professional",
          organization_name: "Acme Corp",
          features: [],
          limits: {},
          activated_at: new Date().toISOString(),
          support_level: "standard",
        },
      });

      const result = await manager.validateLicense(licenseKey);

      expect(result.valid).toBe(false);
      expect(result.errorCode).toBe("EXPIRED");
    });

    it("should allow grace period", async () => {
      // Expired 7 days ago (within 14-day grace)
      const licenseKey = createMockLicenseJWT({
        exp: Math.floor(Date.now() / 1000) - 86400 * 7,
        aigos_license: {
          tier: "professional",
          organization_name: "Acme Corp",
          features: [],
          limits: {},
          activated_at: new Date().toISOString(),
          support_level: "standard",
        },
      });

      const result = await manager.validateLicense(licenseKey);

      expect(result.valid).toBe(true);
      expect(result.inGracePeriod).toBe(true);
    });

    it("should warn when expiring soon", async () => {
      // Expires in 15 days
      const licenseKey = createMockLicenseJWT({
        exp: Math.floor(Date.now() / 1000) + 86400 * 15,
        aigos_license: {
          tier: "professional",
          organization_name: "Acme Corp",
          features: [],
          limits: {},
          activated_at: new Date().toISOString(),
          support_level: "standard",
        },
      });

      const result = await manager.validateLicense(licenseKey);

      expect(result.valid).toBe(true);
      expect(result.warnings).toBeDefined();
      expect(result.warnings?.some((w) => w.code === "EXPIRING_SOON")).toBe(true);
    });
  });

  describe("Custom Features and Limits", () => {
    it("should allow explicit feature grants", async () => {
      // Community tier with explicitly granted SSO
      const licenseKey = createMockLicenseJWT({
        aigos_license: {
          tier: "community",
          organization_name: "Special Partner",
          features: ["sso"], // Explicitly granted
          limits: {},
          activated_at: new Date().toISOString(),
          support_level: "standard",
        },
      });

      await manager.loadLicense(licenseKey);

      // SSO should be enabled even on community tier
      expect(manager.isFeatureEnabled("sso").enabled).toBe(true);

      // But other enterprise features should not
      expect(manager.isFeatureEnabled("audit_logs").enabled).toBe(false);
    });

    it("should allow explicit limit overrides", async () => {
      const licenseKey = createMockLicenseJWT({
        aigos_license: {
          tier: "community",
          organization_name: "Special Partner",
          features: [],
          limits: {
            max_agents: 100, // Override community limit
          },
          activated_at: new Date().toISOString(),
          support_level: "standard",
        },
      });

      await manager.loadLicense(licenseKey);
      const info = manager.getLicenseInfo();

      expect(info?.limits.max_agents).toBe(100);
      expect(info?.limits.max_assets).toBe(TIER_LIMITS.community.max_assets); // Not overridden
    });
  });

  describe("Events", () => {
    it("should emit license.loaded event", () => {
      const events: unknown[] = [];
      manager.onEvent((e) => events.push(e));

      manager.loadCommunityLicense();

      expect(events.length).toBeGreaterThan(0);
      expect(events[0]).toHaveProperty("type", "license.loaded");
    });

    it("should emit license.feature_check event", () => {
      manager.loadCommunityLicense();

      const events: unknown[] = [];
      manager.onEvent((e) => events.push(e));

      manager.isFeatureEnabled("kill_switch");

      expect(events.some((e) => (e as { type: string }).type === "license.feature_check")).toBe(true);
    });

    it("should emit license.limit_exceeded event", () => {
      manager.loadCommunityLicense();

      const events: unknown[] = [];
      manager.onEvent((e) => events.push(e));

      // Exceed agent limit
      for (let i = 0; i <= TIER_LIMITS.community.max_agents; i++) {
        manager.incrementUsage("agents");
      }

      expect(events.some((e) => (e as { type: string }).type === "license.limit_exceeded")).toBe(true);
    });
  });

  describe("Tier Constants", () => {
    it("should have correct community features", () => {
      expect(TIER_FEATURES.community).toEqual([]);
    });

    it("should have correct professional features", () => {
      expect(TIER_FEATURES.professional).toContain("kill_switch");
      expect(TIER_FEATURES.professional).toContain("capability_decay");
      expect(TIER_FEATURES.professional).toContain("a2a_auth");
      expect(TIER_FEATURES.professional).not.toContain("sso");
    });

    it("should have correct enterprise features", () => {
      expect(TIER_FEATURES.enterprise).toContain("sso");
      expect(TIER_FEATURES.enterprise).toContain("audit_logs");
      expect(TIER_FEATURES.enterprise).toContain("priority_support");
    });

    it("should have correct tier limits", () => {
      expect(TIER_LIMITS.community.max_agents).toBe(3);
      expect(TIER_LIMITS.professional.max_agents).toBe(25);
      expect(TIER_LIMITS.enterprise.max_agents).toBe(-1);
    });
  });
});
