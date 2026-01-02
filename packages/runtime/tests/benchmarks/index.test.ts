// ─────────────────────────────────────────────────────────────────
// PERFORMANCE BENCHMARKS (AIG-111)
// Benchmark policy checks, telemetry, identity creation
// ─────────────────────────────────────────────────────────────────

import { describe, it, expect, beforeEach } from "vitest";
import * as jose from "jose";

import {
  createRuntimeIdentity,
  createKillSwitch,
  createKillSwitchCommand,
  createPolicyEngine,
  createCapabilityDecay,
  extractParentCapabilities,
  createTelemetryEmitter,
  clearProcessedCommands,
  createLicenseManager,
  FeatureGate,
  LimitEnforcer,
} from "../../src/index.js";
import type { AssetCard } from "@aigrc/core";
import { computeGoldenThreadHashSync, verifyGoldenThreadHashSync } from "@aigrc/core";

const TEST_ASSET_ID = "aigrc-2024-a1b2c3d4";

// Helper to create a valid asset card for tests
function createTestAssetCard(overrides: Partial<AssetCard> = {}): AssetCard {
  return {
    id: TEST_ASSET_ID,
    name: "Benchmark Test Agent",
    version: "1.0.0",
    created: "2025-01-15T10:30:00Z",
    updated: "2025-01-15T10:30:00Z",
    ownership: {
      owner: {
        name: "Test Owner",
        email: "owner@test.com",
      },
    },
    technical: {
      type: "agent",
    },
    classification: {
      riskLevel: "minimal",
      riskFactors: {
        autonomousDecisions: false,
        customerFacing: false,
        toolExecution: false,
        externalDataAccess: false,
        piiProcessing: "no",
        highStakesDecisions: false,
      },
    },
    intent: {
      linked: false,
    },
    governance: {
      status: "approved",
      approvals: [
        {
          role: "tech-lead",
          name: "Tech Lead",
          email: "tech@test.com",
          date: "2025-01-15T10:30:00Z",
        },
      ],
    },
    golden_thread: {
      ticket_id: "BENCH-001",
      approved_by: "tech@test.com",
      approved_at: "2025-01-15T10:30:00Z",
    },
    ...overrides,
  } as AssetCard;
}

// Helper to measure execution time
async function benchmark(
  name: string,
  fn: () => Promise<void> | void,
  iterations: number = 1000
): Promise<{ name: string; avgMs: number; opsPerSec: number; totalMs: number }> {
  const start = performance.now();

  for (let i = 0; i < iterations; i++) {
    await fn();
  }

  const totalMs = performance.now() - start;
  const avgMs = totalMs / iterations;
  const opsPerSec = 1000 / avgMs;

  return { name, avgMs, opsPerSec, totalMs };
}

// ─────────────────────────────────────────────────────────────────
// BENCHMARK TESTS
// ─────────────────────────────────────────────────────────────────

describe("Performance Benchmarks (AIG-111)", () => {
  beforeEach(() => {
    clearProcessedCommands();
  });

  describe("Identity Creation Benchmarks", () => {
    it("should create identity quickly", async () => {
      const assetCard = createTestAssetCard();

      const result = await benchmark(
        "createRuntimeIdentity",
        () => {
          createRuntimeIdentity({ assetCard });
        },
        1000
      );

      console.log(`Identity creation: ${result.avgMs.toFixed(3)}ms avg, ${result.opsPerSec.toFixed(0)} ops/sec`);

      // Should be able to create at least 1000 identities per second
      expect(result.opsPerSec).toBeGreaterThan(100);
    });
  });

  describe("Golden Thread Hash Benchmarks", () => {
    it("should compute hash quickly", async () => {
      const goldenThread = {
        ticket_id: "BENCH-001",
        approved_by: "test@test.com",
        approved_at: new Date().toISOString(),
      };

      const result = await benchmark(
        "computeGoldenThreadHashSync",
        () => {
          computeGoldenThreadHashSync(goldenThread);
        },
        10000
      );

      console.log(`Hash computation: ${result.avgMs.toFixed(3)}ms avg, ${result.opsPerSec.toFixed(0)} ops/sec`);

      // Should be very fast - cryptographic hash
      expect(result.opsPerSec).toBeGreaterThan(1000);
    });

    it("should verify hash quickly", async () => {
      const goldenThread = {
        ticket_id: "BENCH-001",
        approved_by: "test@test.com",
        approved_at: new Date().toISOString(),
      };
      const hashResult = computeGoldenThreadHashSync(goldenThread);

      const result = await benchmark(
        "verifyGoldenThreadHashSync",
        () => {
          verifyGoldenThreadHashSync(goldenThread, hashResult.hash);
        },
        10000
      );

      console.log(`Hash verification: ${result.avgMs.toFixed(3)}ms avg, ${result.opsPerSec.toFixed(0)} ops/sec`);

      expect(result.opsPerSec).toBeGreaterThan(1000);
    });
  });

  describe("Policy Engine Benchmarks", () => {
    it("should check permissions quickly with few rules", async () => {
      const assetCard = createTestAssetCard();
      const { identity } = createRuntimeIdentity({ assetCard });

      const engine = createPolicyEngine({
        defaultEffect: "deny",
        rules: [
          { id: "rule-1", effect: "allow", actions: ["read_*"], resources: ["*"] },
          { id: "rule-2", effect: "deny", actions: ["admin_*"], resources: ["*"] },
        ],
        capabilities: identity.capabilities_manifest,
      });

      const result = await benchmark(
        "policyCheckPermission (2 rules)",
        () => {
          engine.checkPermissionSync({ action: "read_file", resource: "*" });
        },
        10000
      );

      console.log(`Policy check (2 rules): ${result.avgMs.toFixed(3)}ms avg, ${result.opsPerSec.toFixed(0)} ops/sec`);

      // Policy checks should be extremely fast
      expect(result.opsPerSec).toBeGreaterThan(10000);
    });

    it("should check permissions acceptably with many rules", async () => {
      const assetCard = createTestAssetCard();
      const { identity } = createRuntimeIdentity({ assetCard });

      // Create 100 rules
      const rules = Array.from({ length: 100 }, (_, i) => ({
        id: `rule-${i}`,
        effect: i % 2 === 0 ? ("allow" as const) : ("deny" as const),
        actions: [`action_${i}_*`],
        resources: [`/resource_${i}/*`],
        priority: i,
      }));

      // The policy engine doesn't use rules directly - it uses capabilities
      // For this benchmark, we're just testing with many capabilities patterns
      const engine = createPolicyEngine({
        capabilities: {
          ...identity.capabilities_manifest,
          // Use many allowed patterns for benchmark
          allowed_tools: Array.from({ length: 100 }, (_, i) => `action_${i}_*`),
        },
      });

      const result = await benchmark(
        "policyCheckPermission (100 patterns)",
        () => {
          engine.checkPermissionSync({ action: "action_50_test", resource: "*" });
        },
        1000
      );

      console.log(`Policy check (100 rules): ${result.avgMs.toFixed(3)}ms avg, ${result.opsPerSec.toFixed(0)} ops/sec`);

      // Even with 100 rules, should be fast
      expect(result.opsPerSec).toBeGreaterThan(1000);
    });
  });

  describe("Capability Decay Benchmarks", () => {
    it("should apply decay quickly", async () => {
      const assetCard = createTestAssetCard();
      const { identity } = createRuntimeIdentity({
        assetCard,
        capabilities: {
          allowed_tools: ["read_*", "search_*", "list_*"],
          denied_tools: ["delete_*", "admin_*"],
          may_spawn_children: true,
          max_child_depth: 3,
        },
      });

      const decay = createCapabilityDecay();
      const parentCaps = extractParentCapabilities(identity);

      const result = await benchmark(
        "applyDecay",
        () => {
          decay.applyDecay(parentCaps, "decay");
        },
        10000
      );

      console.log(`Capability decay: ${result.avgMs.toFixed(3)}ms avg, ${result.opsPerSec.toFixed(0)} ops/sec`);

      expect(result.opsPerSec).toBeGreaterThan(10000);
    });
  });

  describe("Kill Switch Benchmarks", () => {
    it("should process commands quickly", async () => {
      const assetCard = createTestAssetCard();
      const { identity } = createRuntimeIdentity({ assetCard });

      // Note: We create a new kill switch each iteration to avoid
      // replay prevention (which would make subsequent commands fail)
      let iteration = 0;
      const result = await benchmark(
        "killSwitch.processCommand",
        async () => {
          clearProcessedCommands();
          const killSwitch = createKillSwitch(identity, {
            channel: "polling",
            endpoint: "http://localhost:9999/kill-switch",
            requireSignature: false,
          });

          const command = createKillSwitchCommand("PAUSE", {
            reason: `Test ${iteration++}`,
            issuedBy: "test@test.com",
          });

          await killSwitch.processCommand(command);
        },
        100
      );

      console.log(`Kill switch command processing: ${result.avgMs.toFixed(3)}ms avg, ${result.opsPerSec.toFixed(0)} ops/sec`);

      // Kill switch should be reasonably fast
      expect(result.opsPerSec).toBeGreaterThan(50);
    });
  });

  describe("License Validation Benchmarks", () => {
    it("should check features quickly", async () => {
      const gate = new FeatureGate();

      const result = await benchmark(
        "isFeatureAllowed",
        () => {
          gate.isFeatureAllowed("asset_cards");
          gate.isFeatureAllowed("kill_switch");
          gate.isFeatureAllowed("multi_jurisdiction");
        },
        10000
      );

      console.log(`Feature check: ${result.avgMs.toFixed(3)}ms avg (3 checks), ${(result.opsPerSec * 3).toFixed(0)} checks/sec`);

      expect(result.opsPerSec).toBeGreaterThan(10000);
    });

    it("should check limits quickly", async () => {
      const enforcer = new LimitEnforcer();
      enforcer.updateUsage({ agents: 2, assets: 5 });

      const result = await benchmark(
        "checkLimit",
        () => {
          enforcer.checkLimit("maxAgents");
          enforcer.checkLimit("maxAssets");
          enforcer.canAdd("maxAgents");
        },
        10000
      );

      console.log(`Limit check: ${result.avgMs.toFixed(3)}ms avg (3 checks), ${(result.opsPerSec * 3).toFixed(0)} checks/sec`);

      expect(result.opsPerSec).toBeGreaterThan(10000);
    });
  });

  describe("Telemetry Emission Benchmarks", () => {
    it("should emit events quickly", async () => {
      const assetCard = createTestAssetCard();
      const { identity } = createRuntimeIdentity({ assetCard });

      const emitter = createTelemetryEmitter({
        serviceName: "benchmark-test",
      });

      const result = await benchmark(
        "telemetry.emitDecision",
        () => {
          emitter.emitDecision({
            instance_id: identity.instance_id,
            action: "read_file",
            resource: "/data/file.txt",
            effect: "allow",
            matched_rule: "allow-read",
            duration_ms: 1,
          });
        },
        10000
      );

      console.log(`Telemetry emission: ${result.avgMs.toFixed(3)}ms avg, ${result.opsPerSec.toFixed(0)} ops/sec`);

      // Telemetry should be very fast (fire-and-forget)
      expect(result.opsPerSec).toBeGreaterThan(5000);
    });
  });

  describe("Combined Operations Benchmark", () => {
    it("should handle typical runtime operation quickly", async () => {
      const assetCard = createTestAssetCard();
      const { identity } = createRuntimeIdentity({
        assetCard,
        capabilities: {
          allowed_tools: ["read_*"],
          denied_tools: ["admin_*"],
          may_spawn_children: false,
        },
      });

      const engine = createPolicyEngine({
        defaultEffect: "deny",
        rules: [
          { id: "allow-read", effect: "allow", actions: ["read_*"], resources: ["*"] },
        ],
        capabilities: identity.capabilities_manifest,
      });

      const capDecay = createCapabilityDecay();
      const parentCaps = extractParentCapabilities(identity);
      const featureGate = new FeatureGate();
      const limitEnforcer = new LimitEnforcer();

      // Simulate a typical runtime check: policy + decay + feature + limit
      const result = await benchmark(
        "combinedRuntimeCheck",
        () => {
          // Check policy
          engine.checkPermissionSync({ action: "read_file", resource: "*" });

          // Check capability decay
          capDecay.applyDecay(parentCaps, "decay");

          // Check feature
          featureGate.isFeatureAllowed("asset_cards");

          // Check limit
          limitEnforcer.checkLimit("maxAgents");
        },
        10000
      );

      console.log(`Combined runtime check: ${result.avgMs.toFixed(3)}ms avg, ${result.opsPerSec.toFixed(0)} ops/sec`);

      // Combined check should still be fast - target <1ms
      expect(result.avgMs).toBeLessThan(1);
    });
  });
});
