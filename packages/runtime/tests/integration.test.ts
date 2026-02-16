/**
 * Integration Tests (AIGOS-E12)
 *
 * These tests verify that all runtime modules work together correctly.
 * They simulate real-world agent scenarios with multiple components.
 */

import { describe, it, expect, beforeEach } from "vitest";

// Import specific modules
import { PolicyEngine, createPolicyEngine } from "../src/policy/index.js";
import { createKillSwitchReceiver } from "../src/kill-switch/index.js";
import { createCapabilityDecayManager } from "../src/capability/index.js";
import { createLicenseManager, TIER_FEATURES, TIER_LIMITS } from "../src/license/index.js";
import { A2ATokenGenerator, A2ATokenValidator } from "../src/a2a/index.js";
import type { RuntimeIdentity, CapabilitiesManifest, Lineage } from "@aigrc/core";

// Helper to generate a proper UUID v4
function generateUUID(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// Create a proper mock RuntimeIdentity matching the real structure
function createMockIdentity(overrides?: Partial<RuntimeIdentity>): RuntimeIdentity {
  const instanceId = generateUUID();

  const capabilities: CapabilitiesManifest = {
    allowed_tools: ["read_file", "write_file", "call_api"],
    denied_tools: ["delete_system", "format_disk"],
    allowed_domains: ["*.example.com", "api.safe.com"],
    denied_domains: ["malicious.com", "*.evil.org"],
    max_cost_per_session: 100,
    max_cost_per_day: 1000,
    max_tokens_per_call: 10000,
    may_spawn_children: true,
    max_child_depth: 3,
    capability_mode: "decay",
  };

  const lineage: Lineage = {
    parent_instance_id: null,
    generation_depth: 0,
    ancestor_chain: [],
    spawned_at: new Date().toISOString(),
    root_instance_id: instanceId,
  };

  return {
    instance_id: instanceId,
    asset_id: "test-asset-001",
    asset_name: "Test Agent",
    asset_version: "1.0.0",
    golden_thread_hash: "sha256:abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890",
    golden_thread: {
      ticket_id: "TEST-123",
      approved_by: "approver@test.com",
      approved_at: "2025-01-15T10:00:00Z",
      hash: "sha256:abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890",
    },
    risk_level: "limited",
    lineage,
    capabilities_manifest: capabilities,
    created_at: new Date().toISOString(),
    verified: true,
    mode: "NORMAL",
    ...overrides,
  };
}

describe("Integration Tests", () => {
  describe("Policy Engine with Identity", () => {
    let policyEngine: PolicyEngine;
    let identity: RuntimeIdentity;

    beforeEach(() => {
      policyEngine = createPolicyEngine();
      identity = createMockIdentity();
    });

    it("should allow actions in allowed_tools", async () => {
      const decision = await policyEngine.checkPermission(identity, "read_file");
      expect(decision.allowed).toBe(true);
    });

    it("should deny actions in denied_tools", async () => {
      const decision = await policyEngine.checkPermission(identity, "delete_system");
      expect(decision.allowed).toBe(false);
      expect(decision.code).toBe("CAPABILITY_DENIED");
    });

    it("should deny unknown actions not in allowed_tools", async () => {
      const decision = await policyEngine.checkPermission(identity, "unknown_action");
      expect(decision.allowed).toBe(false);
    });
  });

  describe("Capability Decay Manager", () => {
    let capabilityManager: ReturnType<typeof createCapabilityDecayManager>;
    let parentIdentity: RuntimeIdentity;

    beforeEach(() => {
      capabilityManager = createCapabilityDecayManager();
      parentIdentity = createMockIdentity({
        asset_id: "parent-agent-001",
        asset_name: "Parent Agent",
        risk_level: "high",
        capabilities_manifest: {
          allowed_tools: ["spawn_agent", "read_file", "write_file", "call_api"],
          denied_tools: [],
          allowed_domains: ["*"],
          denied_domains: [],
          max_cost_per_session: 100,
          max_cost_per_day: 1000,
          max_tokens_per_call: 10000,
          may_spawn_children: true,
          max_child_depth: 3,
          capability_mode: "decay",
        },
      });
    });

    it("should compute decayed capabilities for child", () => {
      const result = capabilityManager.computeChildCapabilities(
        parentIdentity,
        {
          mode: "decay",
          allowedTools: ["read_file", "write_file"],
        }
      );

      expect(result).toBeDefined();
      expect(result.effectiveCapabilities).toBeDefined();
      expect(result.effectiveCapabilities.allowed_tools).toContain("read_file");
      expect(result.effectiveCapabilities.allowed_tools).toContain("write_file");
      expect(result.effectiveCapabilities.allowed_tools).not.toContain("spawn_agent");
    });
  });

  describe("License Manager Integration", () => {
    let licenseManager: ReturnType<typeof createLicenseManager>;

    beforeEach(() => {
      licenseManager = createLicenseManager();
    });

    it("should gate kill switch to professional tier", () => {
      licenseManager.loadCommunityLicense();
      const check = licenseManager.isFeatureEnabled("kill_switch");
      expect(check.enabled).toBe(false);
      expect(check.requiredTier).toBe("professional");
    });

    it("should gate SSO to enterprise tier", () => {
      licenseManager.loadCommunityLicense();
      const check = licenseManager.isFeatureEnabled("sso");
      expect(check.enabled).toBe(false);
      expect(check.requiredTier).toBe("enterprise");
    });

    it("should enforce agent limits for community tier", () => {
      licenseManager.loadCommunityLicense();

      // Community tier allows 3 agents
      licenseManager.incrementUsage("agents");
      licenseManager.incrementUsage("agents");
      licenseManager.incrementUsage("agents");

      const check = licenseManager.checkLimit("max_agents");
      expect(check.exceeded).toBe(true);
      expect(check.limit).toBe(TIER_LIMITS.community.max_agents);
    });
  });

  describe("A2A Token Integration", () => {
    it("should generate and validate tokens", async () => {
      const identity = createMockIdentity();
      const secret = "test-secret-key-at-least-32-bytes-long!";

      const generator = new A2ATokenGenerator({
        signingKey: {
          kid: "test-key-1",
          alg: "HS256",
          secret,
        },
      });

      const validator = new A2ATokenValidator({
        trustedKeys: new Map([
          ["test-key-1", { kid: "test-key-1", alg: "HS256", secret }],
        ]),
      });

      // Generate token
      const { token, expiresAt } = await generator.generate({ identity });
      expect(token).toBeDefined();
      expect(expiresAt).toBeDefined();

      // Validate the token
      const validation = await validator.validate(token);
      if (!validation.valid) {
        console.error("Validation error:", validation.errorCode, validation.errorMessage);
      }
      expect(validation.valid).toBe(true);
      expect(validation.payload).toBeDefined();
      expect(validation.payload!.aigos.identity.instance_id).toBe(identity.instance_id);
    });
  });

  describe("Event Propagation", () => {
    it("should emit events from license manager", () => {
      const events: Array<{ type: string }> = [];
      const licenseManager = createLicenseManager();
      licenseManager.onEvent((e) => events.push({ type: e.type }));

      licenseManager.loadCommunityLicense();

      expect(events.some((e) => e.type === "license.loaded")).toBe(true);
    });
  });

  describe("Kill Switch Integration", () => {
    it("should create kill switch receiver", () => {
      const killSwitch = createKillSwitchReceiver({
        enabled: true,
        channel: "polling",
      });

      expect(killSwitch).toBeDefined();
      expect(typeof killSwitch.start).toBe("function");
      expect(typeof killSwitch.stop).toBe("function");
    });
  });
});

describe("Conformance Tests", () => {
  describe("AIGOS Level 1: Minimal Conformance", () => {
    it("SPEC-RT-003: Should evaluate basic permission checks", async () => {
      const policyEngine = createPolicyEngine();
      const identity = createMockIdentity();

      const decision = await policyEngine.checkPermission(identity, "read_file");

      expect(decision).toHaveProperty("allowed");
      // Decision always has allowed property
    });
  });

  describe("AIGOS Level 2: Standard Conformance", () => {
    it("SPEC-RT-003: Should enforce capability boundaries", async () => {
      const policyEngine = createPolicyEngine();
      const identity = createMockIdentity({
        capabilities_manifest: {
          allowed_tools: ["read_file"],
          denied_tools: [],
          allowed_domains: [],
          denied_domains: [],
          max_cost_per_session: 10,
          max_cost_per_day: 100,
          max_tokens_per_call: 1000,
          may_spawn_children: false,
          max_child_depth: 0,
          capability_mode: "decay",
        },
      });

      // Allowed capability
      const allowed = await policyEngine.checkPermission(identity, "read_file");
      expect(allowed.allowed).toBe(true);

      // Disallowed capability
      const disallowed = await policyEngine.checkPermission(identity, "write_file");
      expect(disallowed.allowed).toBe(false);
    });

    it("SPEC-RT-003: Should meet latency requirements (< 2ms avg)", async () => {
      const policyEngine = createPolicyEngine();
      const identity = createMockIdentity();

      // Warm up
      await policyEngine.checkPermission(identity, "read_file");

      // Measure latency
      const iterations = 100;
      const start = performance.now();

      for (let i = 0; i < iterations; i++) {
        await policyEngine.checkPermission(identity, "read_file");
      }

      const end = performance.now();
      const avgLatency = (end - start) / iterations;

      // Should be under 2ms average
      expect(avgLatency).toBeLessThan(2);
    });
  });

  describe("AIGOS Level 3: Full Conformance", () => {
    it("SPEC-RT-005: Should implement Kill Switch", () => {
      const killSwitch = createKillSwitchReceiver({
        enabled: true,
        channel: "polling",
      });

      expect(killSwitch).toBeDefined();
      expect(typeof killSwitch.start).toBe("function");
      expect(typeof killSwitch.stop).toBe("function");
    });

    it("SPEC-RT-006: Should implement Capability Decay", () => {
      const capabilityManager = createCapabilityDecayManager();

      expect(capabilityManager).toBeDefined();
      expect(typeof capabilityManager.computeChildCapabilities).toBe("function");
    });
  });

  describe("License Key Format (SPEC-LIC-001)", () => {
    it("Level 1: Should validate JWT structure", async () => {
      const licenseManager = createLicenseManager();

      // Create a mock JWT
      const mockPayload = {
        iss: "https://license.aigos.dev",
        sub: "org-123",
        aud: "aigrc",
        exp: Math.floor(Date.now() / 1000) + 86400,
        iat: Math.floor(Date.now() / 1000),
        nbf: Math.floor(Date.now() / 1000),
        jti: "lic-test-123",
        aigos_license: {
          tier: "professional",
          organization_name: "Test Org",
          features: [],
          limits: {},
          activated_at: new Date().toISOString(),
          support_level: "standard",
        },
      };

      const header = btoa(JSON.stringify({ alg: "RS256", typ: "AIGOS-LIC+jwt" }))
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=+$/, "");
      const payload = btoa(JSON.stringify(mockPayload))
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=+$/, "");
      const mockJWT = `${header}.${payload}.fake_signature`;

      const result = await licenseManager.validateLicense(mockJWT);
      expect(result).toHaveProperty("valid");
    });

    it("Level 2: Should check expiration", async () => {
      const licenseManager = createLicenseManager();

      // Test expired license (beyond grace period)
      const expiredPayload = {
        iss: "https://license.aigos.dev",
        sub: "org-123",
        aud: "aigrc",
        exp: Math.floor(Date.now() / 1000) - 86400 * 30,
        iat: Math.floor(Date.now() / 1000) - 86400 * 60,
        nbf: Math.floor(Date.now() / 1000) - 86400 * 60,
        jti: "lic-expired",
        aigos_license: {
          tier: "professional",
          organization_name: "Test Org",
          features: [],
          limits: {},
          activated_at: new Date().toISOString(),
          support_level: "standard",
        },
      };

      const header = btoa(JSON.stringify({ alg: "RS256", typ: "AIGOS-LIC+jwt" }))
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=+$/, "");
      const payload = btoa(JSON.stringify(expiredPayload))
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=+$/, "");
      const expiredJWT = `${header}.${payload}.fake_signature`;

      const result = await licenseManager.validateLicense(expiredJWT);
      expect(result.valid).toBe(false);
      expect(result.errorCode).toBe("EXPIRED");
    });

    it("Level 3: Should support grace periods", async () => {
      const licenseManager = createLicenseManager();

      // License expired 7 days ago (within 14-day grace period)
      const gracePayload = {
        iss: "https://license.aigos.dev",
        sub: "org-123",
        aud: "aigrc",
        exp: Math.floor(Date.now() / 1000) - 86400 * 7,
        iat: Math.floor(Date.now() / 1000) - 86400 * 37,
        nbf: Math.floor(Date.now() / 1000) - 86400 * 37,
        jti: "lic-grace",
        aigos_license: {
          tier: "professional",
          organization_name: "Test Org",
          features: [],
          limits: {},
          activated_at: new Date().toISOString(),
          support_level: "standard",
        },
      };

      const header = btoa(JSON.stringify({ alg: "RS256", typ: "AIGOS-LIC+jwt" }))
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=+$/, "");
      const payload = btoa(JSON.stringify(gracePayload))
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=+$/, "");
      const graceJWT = `${header}.${payload}.fake_signature`;

      const result = await licenseManager.validateLicense(graceJWT);
      expect(result.valid).toBe(true);
      expect(result.inGracePeriod).toBe(true);
    });
  });

  describe("Tier Feature Verification", () => {
    it("should have correct community features (empty)", () => {
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
