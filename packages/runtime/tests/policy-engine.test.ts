/**
 * Policy Engine Tests (AIGOS-511)
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { PolicyEngine, createPolicyEngine } from "../src/policy/policy-engine.js";
import type { RuntimeIdentity, CapabilitiesManifest, Lineage } from "@aigrc/core";

// Helper to create mock identity
function createMockIdentity(overrides?: Partial<RuntimeIdentity>): RuntimeIdentity {
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
    root_instance_id: "test-instance-123",
  };

  return {
    instance_id: "test-instance-123",
    asset_id: "test-asset-001",
    asset_name: "Test Agent",
    asset_version: "1.0.0",
    golden_thread_hash: "sha256:abc123",
    golden_thread: {
      ticket_id: "TEST-123",
      approved_by: "approver@test.com",
      approved_at: "2025-01-15T10:00:00Z",
      hash: "sha256:abc123",
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

describe("PolicyEngine", () => {
  let engine: PolicyEngine;
  let identity: RuntimeIdentity;

  beforeEach(() => {
    engine = createPolicyEngine();
    identity = createMockIdentity();
  });

  describe("checkPermission - Capability Checks (AIGOS-504)", () => {
    it("should allow actions in allowed_tools", async () => {
      const decision = await engine.checkPermission(identity, "read_file");
      expect(decision.allowed).toBe(true);
    });

    it("should deny actions in denied_tools", async () => {
      const decision = await engine.checkPermission(identity, "delete_system");
      expect(decision.allowed).toBe(false);
      expect(decision.code).toBe("CAPABILITY_DENIED");
      expect(decision.denied_by).toBe("CAPABILITY");
    });

    it("should deny actions not in allowed_tools", async () => {
      const decision = await engine.checkPermission(identity, "unknown_action");
      expect(decision.allowed).toBe(false);
    });

    it("should allow all with wildcard", async () => {
      const wildcardIdentity = createMockIdentity({
        capabilities_manifest: {
          ...identity.capabilities_manifest,
          allowed_tools: ["*"],
        },
      });

      const decision = await engine.checkPermission(wildcardIdentity, "any_action");
      expect(decision.allowed).toBe(true);
    });
  });

  describe("checkPermission - Resource Checks (AIGOS-505)", () => {
    it("should allow resources matching allowed_domains", async () => {
      const decision = await engine.checkPermission(
        identity,
        "call_api",
        "https://api.example.com/data"
      );
      expect(decision.allowed).toBe(true);
    });

    it("should deny resources matching denied_domains", async () => {
      const decision = await engine.checkPermission(
        identity,
        "call_api",
        "https://malicious.com/hack"
      );
      expect(decision.allowed).toBe(false);
      expect(decision.code).toBe("RESOURCE_DENIED");
      expect(decision.denied_by).toBe("RESOURCE_DENY");
    });

    it("should handle wildcard subdomains", async () => {
      const decision = await engine.checkPermission(
        identity,
        "call_api",
        "https://api.evil.org/data"
      );
      expect(decision.allowed).toBe(false);
    });
  });

  describe("checkPermission - Kill Switch (AIGOS-503)", () => {
    it("should deny when instance is terminated", async () => {
      engine.updateKillSwitch("TERMINATE", { instanceId: identity.instance_id });

      const decision = await engine.checkPermission(identity, "read_file");
      expect(decision.allowed).toBe(false);
      expect(decision.code).toBe("TERMINATED");
      expect(decision.denied_by).toBe("KILL_SWITCH");
    });

    it("should deny when instance is paused", async () => {
      engine.updateKillSwitch("PAUSE", { instanceId: identity.instance_id });

      const decision = await engine.checkPermission(identity, "read_file");
      expect(decision.allowed).toBe(false);
      expect(decision.code).toBe("PAUSED");
    });

    it("should allow after resume", async () => {
      engine.updateKillSwitch("PAUSE", { instanceId: identity.instance_id });
      engine.updateKillSwitch("RESUME", { instanceId: identity.instance_id });

      const decision = await engine.checkPermission(identity, "read_file");
      expect(decision.allowed).toBe(true);
    });
  });

  describe("checkPermission - Mode Checks", () => {
    it("should restrict actions in RESTRICTED mode", async () => {
      const restrictedIdentity = createMockIdentity({ mode: "RESTRICTED" });

      const decision = await engine.checkPermission(restrictedIdentity, "read_file");
      expect(decision.allowed).toBe(false);
      expect(decision.code).toBe("MODE_RESTRICTED");
    });

    it("should allow status checks in RESTRICTED mode", async () => {
      const restrictedIdentity = createMockIdentity({ mode: "RESTRICTED" });

      const decision = await engine.checkPermission(restrictedIdentity, "status");
      expect(decision.allowed).toBe(true);
    });
  });

  describe("checkPermission - Budget Checks (AIGOS-506)", () => {
    it("should track costs per session", async () => {
      engine.recordCost(identity.instance_id, 50);
      engine.recordCost(identity.instance_id, 40);

      // Next 20 would exceed 100 limit
      const decision = await engine.checkPermission(identity, "read_file", undefined, {
        cost: 20,
      });
      expect(decision.allowed).toBe(false);
      expect(decision.code).toBe("BUDGET_EXCEEDED");
    });
  });

  describe("checkPermission - Custom Checks (AIGOS-507)", () => {
    it("should call custom checks", async () => {
      const customCheck = vi.fn().mockReturnValue(null);
      engine.registerCustomCheck("test-check", customCheck, 10);

      await engine.checkPermission(identity, "read_file");

      expect(customCheck).toHaveBeenCalledWith(
        identity,
        "read_file",
        undefined,
        undefined
      );
    });

    it("should deny when custom check denies", async () => {
      engine.registerCustomCheck(
        "pii-check",
        (_id, _action, resource) => {
          if (resource?.includes("pii")) {
            return {
              allowed: false,
              code: "PII_ACCESS",
              reason: "PII access denied",
              checked_at: new Date().toISOString(),
              duration_ms: 0,
            };
          }
          return null;
        },
        10
      );

      // Use a domain that passes the resource allow check but triggers our custom pii check
      const decision = await engine.checkPermission(identity, "read_file", "https://api.example.com/pii/users.csv");
      expect(decision.allowed).toBe(false);
      expect(decision.code).toBe("PII_ACCESS");
    });
  });

  describe("checkPermission - Dry Run Mode (AIGOS-508)", () => {
    it("should allow but mark would_deny in dry-run mode", async () => {
      const dryRunEngine = createPolicyEngine({ dryRun: true });

      const decision = await dryRunEngine.checkPermission(identity, "delete_system");

      expect(decision.allowed).toBe(true);
      expect(decision.dry_run).toBe(true);
      expect(decision.would_deny).toBe(true);
    });
  });

  describe("performance", () => {
    it("should complete checks in < 2ms", async () => {
      const start = performance.now();

      for (let i = 0; i < 100; i++) {
        await engine.checkPermission(identity, "read_file", "https://api.example.com/data");
      }

      const avg = (performance.now() - start) / 100;
      expect(avg).toBeLessThan(2); // < 2ms average
    });
  });

  describe("caching (AIGOS-509)", () => {
    it("should cache pattern compilations", async () => {
      // Warm up cache
      await engine.checkPermission(identity, "read_file", "https://api.example.com/data");

      const stats = engine.getCacheStats();
      expect(stats.size).toBeGreaterThan(0);
    });

    it("should track cache hits/misses", async () => {
      await engine.checkPermission(identity, "read_file", "https://api.example.com/data");
      await engine.checkPermission(identity, "read_file", "https://api.example.com/data");

      const stats = engine.getCacheStats();
      expect(stats.hits).toBeGreaterThan(0);
    });
  });

  describe("event handling", () => {
    it("should emit policy.denied event", async () => {
      const handler = vi.fn();
      engine.onEvent(handler);

      await engine.checkPermission(identity, "delete_system");

      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "policy.denied",
        })
      );
    });
  });
});
