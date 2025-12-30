import { describe, it, expect, beforeEach } from "vitest";
import {
  createRuntimeIdentity,
  validateIdentity,
  spawnChildIdentity,
  type CreateIdentityOptions,
} from "../src/identity";
import type { AssetCard, RuntimeIdentity } from "@aigrc/core";

// Helper to create a valid asset card for testing
// Note: Asset ID must match pattern ^aigrc-\d{4}-[a-f0-9]{8}$
function createTestAssetCard(overrides: Partial<AssetCard> = {}): AssetCard {
  return {
    id: "aigrc-2024-a1b2c3d4",
    name: "Test Agent",
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
      ticket_id: "TEST-123",
      approved_by: "tech@test.com",
      approved_at: "2025-01-15T10:30:00Z",
    },
    ...overrides,
  } as AssetCard;
}

describe("Runtime Identity", () => {
  describe("createRuntimeIdentity", () => {
    it("should create identity with valid asset card", () => {
      const assetCard = createTestAssetCard();
      const result = createRuntimeIdentity({ assetCard });

      expect(result.identity).toBeDefined();
      expect(result.identity.instance_id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      );
      expect(result.identity.asset_id).toBe("aigrc-2024-a1b2c3d4");
      expect(result.identity.asset_name).toBe("Test Agent");
      expect(result.identity.risk_level).toBe("minimal");
      expect(result.warnings).toHaveLength(0);
    });

    it("should use golden thread from asset card", () => {
      const assetCard = createTestAssetCard();
      const result = createRuntimeIdentity({ assetCard });

      expect(result.identity.golden_thread.ticket_id).toBe("TEST-123");
      expect(result.identity.golden_thread_hash).toBeDefined();
      expect(result.identity.golden_thread_hash.length).toBeGreaterThan(0);
    });

    it("should create placeholder when no golden thread", () => {
      const assetCard = createTestAssetCard({
        golden_thread: undefined,
        governance: {
          status: "draft",
          approvals: [],
        },
      });

      const result = createRuntimeIdentity({ assetCard });

      expect(result.warnings).toContain(
        "No Golden Thread found in asset card - using placeholder"
      );
      expect(result.identity.golden_thread.ticket_id).toBe("MISSING");
    });

    it("should set NORMAL mode for verified minimal risk", () => {
      const assetCard = createTestAssetCard();
      const result = createRuntimeIdentity({
        assetCard,
        mode: "NORMAL",
      });

      expect(result.identity.mode).toBe("NORMAL");
    });

    it("should force SANDBOX mode for high risk even if NORMAL requested", () => {
      const assetCard = createTestAssetCard({
        classification: {
          riskLevel: "high",
          riskFactors: {
            autonomousDecisions: true,
            customerFacing: true,
            toolExecution: true,
            externalDataAccess: true,
            piiProcessing: "yes_sensitive",
            highStakesDecisions: true,
          },
        },
      });

      const result = createRuntimeIdentity({
        assetCard,
        mode: "NORMAL",
      });

      expect(result.identity.mode).toBe("SANDBOX");
    });

    it("should force RESTRICTED mode for unacceptable risk", () => {
      const assetCard = createTestAssetCard({
        classification: {
          riskLevel: "unacceptable",
          riskFactors: {
            autonomousDecisions: true,
            customerFacing: true,
            toolExecution: true,
            externalDataAccess: true,
            piiProcessing: "yes_sensitive",
            highStakesDecisions: true,
          },
        },
      });

      const result = createRuntimeIdentity({ assetCard });

      expect(result.identity.mode).toBe("RESTRICTED");
    });

    it("should create root lineage for first agent", () => {
      const assetCard = createTestAssetCard();
      const result = createRuntimeIdentity({ assetCard });

      expect(result.identity.lineage.generation_depth).toBe(0);
      expect(result.identity.lineage.parent_instance_id).toBeNull();
      expect(result.identity.lineage.ancestor_chain).toHaveLength(0);
      expect(result.identity.lineage.root_instance_id).toBe(
        result.identity.instance_id
      );
    });

    it("should build capabilities manifest from asset card", () => {
      const assetCard = createTestAssetCard({
        constraints: {
          runtime: {
            maxCostPerRequestUsd: 1.0,
            maxTokensPerRequest: 4096,
          },
        },
      });

      const result = createRuntimeIdentity({ assetCard });

      expect(result.identity.capabilities_manifest.max_cost_per_session).toBe(1.0);
      expect(result.identity.capabilities_manifest.max_tokens_per_call).toBe(4096);
    });
  });

  describe("validateIdentity", () => {
    it("should validate correct identity", () => {
      const assetCard = createTestAssetCard();
      const { identity } = createRuntimeIdentity({ assetCard });

      const result = validateIdentity(identity);

      expect(result.valid).toBe(true);
      expect(result.issues).toHaveLength(0);
    });

    it("should detect lineage inconsistency", () => {
      const assetCard = createTestAssetCard();
      const { identity } = createRuntimeIdentity({ assetCard });

      // Manually corrupt the lineage
      const corrupted: RuntimeIdentity = {
        ...identity,
        lineage: {
          ...identity.lineage,
          generation_depth: 2, // Should be 0 for root
        },
      };

      const result = validateIdentity(corrupted);

      expect(result.valid).toBe(false);
      expect(result.issues).toContain(
        "Lineage depth doesn't match ancestor chain length"
      );
    });
  });

  describe("spawnChildIdentity", () => {
    let parentIdentity: RuntimeIdentity;

    beforeEach(() => {
      const parentAsset = createTestAssetCard({
        id: "aigrc-2024-aaaa0001",
        name: "Parent Agent",
      });

      // Create parent with spawn capability
      const result = createRuntimeIdentity({
        assetCard: parentAsset,
        capabilities: {
          may_spawn_children: true,
          max_child_depth: 3,
        },
      });

      parentIdentity = result.identity;
    });

    it("should create child with correct lineage", () => {
      const childAsset = createTestAssetCard({
        id: "aigrc-2024-bbbb0001",
        name: "Child Agent",
      });

      const result = spawnChildIdentity(parentIdentity, childAsset);

      expect(result.identity.lineage.generation_depth).toBe(1);
      expect(result.identity.lineage.parent_instance_id).toBe(
        parentIdentity.instance_id
      );
      expect(result.identity.lineage.ancestor_chain).toContain(
        parentIdentity.instance_id
      );
      expect(result.identity.lineage.root_instance_id).toBe(
        parentIdentity.lineage.root_instance_id
      );
    });

    it("should apply capability decay", () => {
      const childAsset = createTestAssetCard();

      // Parent has a cost limit
      parentIdentity.capabilities_manifest.max_cost_per_session = 10.0;
      parentIdentity.capabilities_manifest.capability_mode = "decay";

      const result = spawnChildIdentity(parentIdentity, childAsset);

      // Child should have reduced limit
      expect(result.identity.capabilities_manifest.max_cost_per_session).toBe(5.0);
    });

    it("should throw if parent cannot spawn", () => {
      const parentAsset = createTestAssetCard();
      const { identity: noSpawnParent } = createRuntimeIdentity({
        assetCard: parentAsset,
        capabilities: {
          may_spawn_children: false,
        },
      });

      const childAsset = createTestAssetCard();

      expect(() => spawnChildIdentity(noSpawnParent, childAsset)).toThrow(
        "Parent identity cannot spawn children"
      );
    });

    it("should throw if max depth reached", () => {
      const parentAsset = createTestAssetCard();
      const { identity: depthLimitParent } = createRuntimeIdentity({
        assetCard: parentAsset,
        capabilities: {
          may_spawn_children: true,
          max_child_depth: 0,
        },
      });

      const childAsset = createTestAssetCard();

      expect(() => spawnChildIdentity(depthLimitParent, childAsset)).toThrow(
        "Maximum spawn depth reached"
      );
    });

    it("should inherit RESTRICTED mode from parent", () => {
      // Force parent to RESTRICTED
      parentIdentity = { ...parentIdentity, mode: "RESTRICTED" };

      const childAsset = createTestAssetCard();
      const result = spawnChildIdentity(parentIdentity, childAsset, {
        mode: "NORMAL",
      });

      expect(result.identity.mode).toBe("RESTRICTED");
    });
  });
});
