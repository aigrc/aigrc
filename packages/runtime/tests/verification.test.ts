import { describe, it, expect, vi } from "vitest";
import {
  verifyRuntimeGoldenThread,
  verifyAssetGoldenThread,
  verifyRuntimeGoldenThreadAsync,
  createVerificationReport,
  type VerificationOptions,
} from "../src/verification";
import type { RuntimeIdentity, AssetCard } from "@aigrc/core";
import { computeGoldenThreadHashSync } from "@aigrc/core";

// Valid UUIDs for testing
const TEST_INSTANCE_ID = "11111111-1111-1111-1111-111111111111";
const TEST_ASSET_ID = "aigrc-2024-a1b2c3d4";

// Helper to create a valid Golden Thread hash
function createValidHash(ticketId: string, approvedBy: string, approvedAt: string): string {
  const result = computeGoldenThreadHashSync({
    ticket_id: ticketId,
    approved_by: approvedBy,
    approved_at: approvedAt,
  });
  return result.hash;
}

// Helper to create a mock runtime identity
function createMockIdentity(
  overrides: Partial<RuntimeIdentity> = {}
): RuntimeIdentity {
  const ticketId = "TEST-123";
  const approvedBy = "approver@test.com";
  const approvedAt = "2025-01-15T10:30:00Z";
  const hash = createValidHash(ticketId, approvedBy, approvedAt);

  return {
    instance_id: TEST_INSTANCE_ID,
    asset_id: TEST_ASSET_ID,
    asset_name: "Test Agent",
    asset_version: "1.0.0",
    golden_thread_hash: hash,
    golden_thread: {
      ticket_id: ticketId,
      approved_by: approvedBy,
      approved_at: approvedAt,
      hash,
    },
    risk_level: "minimal",
    lineage: {
      parent_instance_id: null,
      generation_depth: 0,
      ancestor_chain: [],
      spawned_at: "2025-01-15T10:00:00Z",
      root_instance_id: TEST_INSTANCE_ID,
    },
    capabilities_manifest: {
      allowed_tools: [],
      denied_tools: [],
      allowed_domains: [],
      denied_domains: [],
      max_cost_per_session: null,
      max_cost_per_day: null,
      max_tokens_per_call: null,
      may_spawn_children: false,
      max_child_depth: 0,
      capability_mode: "decay",
    },
    created_at: "2025-01-15T10:00:00Z",
    verified: true,
    mode: "NORMAL",
    ...overrides,
  };
}

// Helper to create a mock asset card
function createMockAssetCard(
  overrides: Partial<AssetCard> = {}
): AssetCard {
  return {
    id: TEST_ASSET_ID,
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
      linked: true,
      ticketId: "TEST-123",
    },
    governance: {
      status: "approved",
      approvals: [
        {
          role: "tech-lead",
          name: "Tech Lead",
          email: "approver@test.com",
          date: "2025-01-15T10:30:00Z",
        },
      ],
    },
    golden_thread: {
      ticket_id: "TEST-123",
      approved_by: "approver@test.com",
      approved_at: "2025-01-15T10:30:00Z",
      hash: createValidHash("TEST-123", "approver@test.com", "2025-01-15T10:30:00Z"),
    },
    ...overrides,
  } as AssetCard;
}

describe("Golden Thread Verification", () => {
  describe("verifyRuntimeGoldenThread", () => {
    it("should verify valid identity", () => {
      const identity = createMockIdentity();
      const result = verifyRuntimeGoldenThread(identity);

      expect(result.verified).toBe(true);
      expect(result.message).toContain("verified successfully");
      expect(result.computedHash).toBeDefined();
      expect(result.expectedHash).toBeDefined();
    });

    it("should skip verification when option is set", () => {
      const identity = createMockIdentity();
      const result = verifyRuntimeGoldenThread(identity, {
        skipVerification: true,
      });

      expect(result.verified).toBe(true);
      expect(result.message).toContain("skipped");
    });

    it("should fail when golden thread is missing", () => {
      const identity = createMockIdentity({
        golden_thread: undefined as unknown as RuntimeIdentity["golden_thread"],
      });

      const result = verifyRuntimeGoldenThread(identity);

      expect(result.verified).toBe(false);
      expect(result.reason).toBe("missing_golden_thread");
    });

    it("should fail when ticket ID is MISSING placeholder", () => {
      const identity = createMockIdentity({
        golden_thread: {
          ticket_id: "MISSING",
          approved_by: "unknown@placeholder.local",
          approved_at: "2025-01-15T10:30:00Z",
        },
      });

      const result = verifyRuntimeGoldenThread(identity);

      expect(result.verified).toBe(false);
      expect(result.reason).toBe("missing_ticket");
    });

    it("should fail when hash mismatches", () => {
      const identity = createMockIdentity({
        golden_thread_hash: "sha256:" + "0".repeat(64), // Wrong hash
      });

      const result = verifyRuntimeGoldenThread(identity);

      expect(result.verified).toBe(false);
      expect(result.reason).toBe("hash_mismatch");
      expect(result.computedHash).toBeDefined();
      expect(result.expectedHash).toBe("sha256:" + "0".repeat(64));
    });

    it("should fail when approval is expired", () => {
      // Create identity with old approval date
      const oldDate = "2020-01-15T10:30:00Z";
      const hash = createValidHash("TEST-123", "approver@test.com", oldDate);

      const identity = createMockIdentity({
        golden_thread_hash: hash,
        golden_thread: {
          ticket_id: "TEST-123",
          approved_by: "approver@test.com",
          approved_at: oldDate,
          hash,
        },
      });

      const result = verifyRuntimeGoldenThread(identity, {
        approvalGracePeriodDays: 365, // 1 year grace
      });

      expect(result.verified).toBe(false);
      expect(result.reason).toBe("expired_approval");
    });

    it("should allow expired approvals when option is set", () => {
      const oldDate = "2020-01-15T10:30:00Z";
      const hash = createValidHash("TEST-123", "approver@test.com", oldDate);

      const identity = createMockIdentity({
        golden_thread_hash: hash,
        golden_thread: {
          ticket_id: "TEST-123",
          approved_by: "approver@test.com",
          approved_at: oldDate,
          hash,
        },
      });

      const result = verifyRuntimeGoldenThread(identity, {
        allowExpiredApprovals: true,
      });

      expect(result.verified).toBe(true);
    });
  });

  describe("verifyAssetGoldenThread", () => {
    it("should verify valid asset card", () => {
      const asset = createMockAssetCard();
      const result = verifyAssetGoldenThread(asset);

      expect(result.verified).toBe(true);
      expect(result.computedHash).toBeDefined();
    });

    it("should fail when golden thread cannot be extracted", () => {
      const asset = createMockAssetCard({
        golden_thread: undefined,
        intent: { linked: false },
        governance: { status: "draft", approvals: [] },
      });

      const result = verifyAssetGoldenThread(asset);

      expect(result.verified).toBe(false);
      expect(result.reason).toBe("missing_golden_thread");
    });

    it("should detect hash mismatch in asset", () => {
      const asset = createMockAssetCard({
        golden_thread: {
          ticket_id: "TEST-123",
          approved_by: "approver@test.com",
          approved_at: "2025-01-15T10:30:00Z",
          hash: "sha256:" + "f".repeat(64), // Wrong hash
        },
      });

      const result = verifyAssetGoldenThread(asset);

      expect(result.verified).toBe(false);
      expect(result.reason).toBe("hash_mismatch");
    });

    it("should skip verification when option is set", () => {
      const asset = createMockAssetCard();
      const result = verifyAssetGoldenThread(asset, {
        skipVerification: true,
      });

      expect(result.verified).toBe(true);
      expect(result.message).toContain("skipped");
    });
  });

  describe("verifyRuntimeGoldenThreadAsync", () => {
    it("should verify with external verifier", async () => {
      const identity = createMockIdentity();
      const externalVerifier = vi.fn().mockResolvedValue(true);

      const result = await verifyRuntimeGoldenThreadAsync(identity, {
        externalVerifier,
      });

      expect(result.verified).toBe(true);
      expect(externalVerifier).toHaveBeenCalledWith({
        ticket_id: "TEST-123",
        approved_by: "approver@test.com",
        approved_at: "2025-01-15T10:30:00Z",
      });
    });

    it("should fail when external verifier returns false", async () => {
      const identity = createMockIdentity();
      const externalVerifier = vi.fn().mockResolvedValue(false);

      const result = await verifyRuntimeGoldenThreadAsync(identity, {
        externalVerifier,
      });

      expect(result.verified).toBe(false);
      expect(result.reason).toBe("external_verification_failed");
    });

    it("should handle external verifier errors", async () => {
      const identity = createMockIdentity();
      const externalVerifier = vi
        .fn()
        .mockRejectedValue(new Error("Ticket system unavailable"));

      const result = await verifyRuntimeGoldenThreadAsync(identity, {
        externalVerifier,
      });

      expect(result.verified).toBe(false);
      expect(result.reason).toBe("external_verification_failed");
      expect(result.message).toContain("Ticket system unavailable");
    });

    it("should still do basic verification before external", async () => {
      const identity = createMockIdentity({
        golden_thread_hash: "sha256:" + "0".repeat(64), // Wrong hash
      });
      const externalVerifier = vi.fn().mockResolvedValue(true);

      const result = await verifyRuntimeGoldenThreadAsync(identity, {
        externalVerifier,
      });

      expect(result.verified).toBe(false);
      expect(result.reason).toBe("hash_mismatch");
      expect(externalVerifier).not.toHaveBeenCalled(); // Should not call if basic fails
    });
  });

  describe("createVerificationReport", () => {
    it("should create report with all fields", () => {
      const identity = createMockIdentity();
      const verificationResult = verifyRuntimeGoldenThread(identity);

      const report = createVerificationReport(identity, verificationResult, "sync");

      expect(report.instanceId).toBe(TEST_INSTANCE_ID);
      expect(report.assetId).toBe(TEST_ASSET_ID);
      expect(report.result).toBe(verificationResult);
      expect(report.riskLevel).toBe("minimal");
      expect(report.mode).toBe("NORMAL");
      expect(report.method).toBe("sync");
    });
  });
});
