/**
 * Identity Manager Tests (AIGOS-408)
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  IdentityManager,
  IdentityError,
  createIdentityManager,
} from "../src/identity/identity-manager.js";
import type { RuntimeIdentity } from "@aigrc/core";

// Mock loadAssetCard - define mock data inline to avoid hoisting issues
vi.mock("@aigrc/core", async () => {
  const actual = await vi.importActual("@aigrc/core");

  // Mock asset card defined inside the factory
  const mockAssetCard = {
    id: "test-agent-001",
    name: "Test Agent",
    version: "1.0.0",
    classification: {
      riskLevel: "limited",
      euAiActCategory: "limited_risk",
    },
    intent: {
      linked: true,
      ticketId: "TEST-123",
    },
    governance: {
      approvals: [
        {
          name: "Test Approver",
          email: "approver@test.com",
          date: "2025-01-15T10:00:00Z",
        },
      ],
      reviews: [],
      complianceChecks: [],
      jurisdictions: [],
    },
    runtime: {
      allowed_tools: ["*"],
      denied_tools: [],
      allowed_domains: ["*.example.com"],
      denied_domains: ["malicious.com"],
      budget: {
        session: 100,
        daily: 1000,
      },
      spawning: {
        enabled: true,
        max_depth: 3,
      },
    },
    golden_thread: {
      ticket_id: "TEST-123",
      approved_by: "approver@test.com",
      approved_at: "2025-01-15T10:00:00Z",
      hash: "sha256:abc123",
    },
  };

  return {
    ...actual,
    loadAssetCard: vi.fn().mockReturnValue(mockAssetCard),
    extractGoldenThreadComponents: vi.fn().mockReturnValue({
      ticket_id: "TEST-123",
      approved_by: "approver@test.com",
      approved_at: "2025-01-15T10:00:00Z",
    }),
    verifyGoldenThreadHashSync: vi.fn().mockReturnValue({
      verified: true,
      computed: "sha256:abc123",
      expected: "sha256:abc123",
    }),
    RuntimeIdentitySchema: {
      safeParse: vi.fn().mockImplementation((data) => ({
        success: true,
        data,
      })),
    },
  };
});

describe("IdentityManager", () => {
  let manager: IdentityManager;

  beforeEach(() => {
    manager = createIdentityManager({
      maxSpawnDepth: 5,
      verificationFailureMode: "SANDBOX",
    });
  });

  describe("createIdentity", () => {
    it("should create a root identity", async () => {
      const identity = await manager.createIdentity({
        assetCardPath: ".aigrc/cards/test.yaml",
      });

      expect(identity).toBeDefined();
      expect(identity.instance_id).toBeDefined();
      expect(identity.asset_id).toBe("test-agent-001");
      expect(identity.asset_name).toBe("Test Agent");
      expect(identity.lineage.generation_depth).toBe(0);
      expect(identity.lineage.parent_instance_id).toBeNull();
    });

    it("should set verified=true when Golden Thread passes", async () => {
      const identity = await manager.createIdentity({
        assetCardPath: ".aigrc/cards/test.yaml",
      });

      expect(identity.verified).toBe(true);
    });

    it("should use SANDBOX mode when verification fails", async () => {
      vi.mocked(
        await import("@aigrc/core").then((m) => m.verifyGoldenThreadHashSync)
      ).mockReturnValueOnce({
        verified: false,
        computed: "sha256:different",
        expected: "sha256:abc123",
        mismatch_reason: "Hash mismatch",
      });

      const identity = await manager.createIdentity({
        assetCardPath: ".aigrc/cards/test.yaml",
      });

      expect(identity.verified).toBe(false);
      expect(identity.mode).toBe("SANDBOX");
    });

    it("should respect custom instance ID", async () => {
      const customId = "custom-uuid-12345";
      const identity = await manager.createIdentity({
        assetCardPath: ".aigrc/cards/test.yaml",
        instanceId: customId,
      });

      expect(identity.instance_id).toBe(customId);
    });
  });

  describe("spawnChild", () => {
    it("should create child with correct lineage", async () => {
      const parent = await manager.createIdentity({
        assetCardPath: ".aigrc/cards/parent.yaml",
      });

      const child = await manager.spawnChild(parent, {
        assetCardPath: ".aigrc/cards/child.yaml",
      });

      expect(child.lineage.generation_depth).toBe(1);
      expect(child.lineage.parent_instance_id).toBe(parent.instance_id);
      expect(child.lineage.root_instance_id).toBe(parent.instance_id);
      expect(child.lineage.ancestor_chain).toContain(parent.instance_id);
    });

    it("should reject spawning beyond max depth", async () => {
      const mgr = createIdentityManager({ maxSpawnDepth: 1 });

      const parent = await mgr.createIdentity({
        assetCardPath: ".aigrc/cards/parent.yaml",
      });

      const child = await mgr.spawnChild(parent, {
        assetCardPath: ".aigrc/cards/child.yaml",
      });

      await expect(
        mgr.spawnChild(child, {
          assetCardPath: ".aigrc/cards/grandchild.yaml",
        })
      ).rejects.toThrow(/Spawn would exceed max depth/);
    });
  });

  describe("requestModeTransition", () => {
    it("should allow de-escalation without auth", async () => {
      const identity = await manager.createIdentity({
        assetCardPath: ".aigrc/cards/test.yaml",
        mode: "NORMAL",
      });

      const result = await manager.requestModeTransition(identity, {
        targetMode: "SANDBOX",
        reason: "Testing",
      });

      expect(result.success).toBe(true);
      expect(result.currentMode).toBe("SANDBOX");
    });

    it("should require auth for escalation", async () => {
      const identity = await manager.createIdentity({
        assetCardPath: ".aigrc/cards/test.yaml",
        mode: "SANDBOX",
      });

      const result = await manager.requestModeTransition(identity, {
        targetMode: "NORMAL",
        reason: "Testing",
      });

      expect(result.success).toBe(false);
      expect(result.reason).toContain("authorization");
    });
  });

  describe("event handling", () => {
    it("should emit identity.created event", async () => {
      const handler = vi.fn();
      manager.onEvent(handler);

      await manager.createIdentity({
        assetCardPath: ".aigrc/cards/test.yaml",
      });

      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "identity.created",
        })
      );
    });
  });
});
