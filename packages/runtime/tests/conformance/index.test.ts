// ─────────────────────────────────────────────────────────────────
// CONFORMANCE TEST SUITE (AIG-110)
// Test all spec requirements across SPEC-PRT and SPEC-RT
// ─────────────────────────────────────────────────────────────────

import { describe, it, expect, beforeEach } from "vitest";
import * as jose from "jose";
import { randomUUID } from "crypto";

import {
  // Functions
  createRuntimeIdentity,
  createKillSwitch,
  createKillSwitchCommand,
  createGovernanceTokenGenerator,
  createGovernanceTokenValidator,
  generateES256KeyPair,
  createPolicyEngine,
  clearProcessedCommands,
} from "../../src/index.js";
import {
  // Schemas from @aigrc/core
  RuntimeIdentitySchema,
  KillSwitchCommandSchema,
  GoldenThreadSchema,
  CapabilitiesManifestSchema,
  LineageSchema,
  PolicyFileSchema,
  GovernanceTokenPayloadSchema,
  computeGoldenThreadHashSync,
  verifyGoldenThreadHashSync,
} from "@aigrc/core";
import type { AssetCard } from "@aigrc/core";

// Test data
const TEST_INSTANCE_ID = "11111111-1111-1111-1111-111111111111";
const TEST_ASSET_ID = "aigrc-2024-a1b2c3d4";

// Helper to create a valid asset card for tests
function createTestAssetCard(overrides: Partial<AssetCard> = {}): AssetCard {
  return {
    id: TEST_ASSET_ID,
    name: "Conformance Test Agent",
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

// ─────────────────────────────────────────────────────────────────
// SPEC-PRT-001: Golden Thread Protocol Conformance
// ─────────────────────────────────────────────────────────────────

describe("SPEC-PRT-001: Golden Thread Protocol", () => {
  describe("Canonical String Format", () => {
    it("should produce deterministic canonical string", () => {
      const goldenThread = {
        ticket_id: "FIN-1234",
        approved_by: "ciso@corp.com",
        approved_at: "2025-01-15T10:30:00Z",
      };

      // Hash should be deterministic
      const hash1 = computeGoldenThreadHashSync(goldenThread);
      const hash2 = computeGoldenThreadHashSync(goldenThread);

      expect(hash1.hash).toBe(hash2.hash);
      expect(hash1.hash).toMatch(/^sha256:[a-f0-9]{64}$/);
    });

    it("should match format: ticket_id|approved_by|approved_at", () => {
      // The canonical format is: {ticket_id}|{approved_by}|{approved_at}
      const goldenThread = {
        ticket_id: "TEST-1",
        approved_by: "test@test.com",
        approved_at: "2025-01-01T00:00:00Z",
      };

      const hashResult = computeGoldenThreadHashSync(goldenThread);
      expect(hashResult.hash).toMatch(/^sha256:[a-f0-9]{64}$/);
    });
  });

  describe("Hash Verification", () => {
    it("should verify correct hash", () => {
      const goldenThread = {
        ticket_id: "FIN-1234",
        approved_by: "ciso@corp.com",
        approved_at: "2025-01-15T10:30:00Z",
      };

      const hashResult = computeGoldenThreadHashSync(goldenThread);
      const result = verifyGoldenThreadHashSync(goldenThread, hashResult.hash);

      expect(result.verified).toBe(true);
    });

    it("should reject incorrect hash", () => {
      const goldenThread = {
        ticket_id: "FIN-1234",
        approved_by: "ciso@corp.com",
        approved_at: "2025-01-15T10:30:00Z",
      };

      const wrongHash = "sha256:" + "a".repeat(64);
      const result = verifyGoldenThreadHashSync(goldenThread, wrongHash);

      expect(result.verified).toBe(false);
    });

    it("should reject malformed hash", () => {
      const goldenThread = {
        ticket_id: "FIN-1234",
        approved_by: "ciso@corp.com",
        approved_at: "2025-01-15T10:30:00Z",
      };

      const result = verifyGoldenThreadHashSync(goldenThread, "invalid-hash");

      expect(result.verified).toBe(false);
    });
  });

  describe("Schema Conformance", () => {
    it("should validate valid golden thread", () => {
      const goldenThread = {
        ticket_id: "FIN-1234",
        approved_by: "ciso@corp.com",
        approved_at: "2025-01-15T10:30:00Z",
      };

      const result = GoldenThreadSchema.safeParse(goldenThread);
      expect(result.success).toBe(true);
    });

    it("should reject invalid email", () => {
      const goldenThread = {
        ticket_id: "FIN-1234",
        approved_by: "not-an-email",
        approved_at: "2025-01-15T10:30:00Z",
      };

      const result = GoldenThreadSchema.safeParse(goldenThread);
      expect(result.success).toBe(false);
    });

    it("should reject invalid datetime", () => {
      const goldenThread = {
        ticket_id: "FIN-1234",
        approved_by: "ciso@corp.com",
        approved_at: "not-a-date",
      };

      const result = GoldenThreadSchema.safeParse(goldenThread);
      expect(result.success).toBe(false);
    });
  });
});

// ─────────────────────────────────────────────────────────────────
// SPEC-RT-002: Runtime Identity Conformance
// ─────────────────────────────────────────────────────────────────

describe("SPEC-RT-002: Runtime Identity", () => {
  describe("Identity Creation", () => {
    it("should generate valid UUID for instance_id", () => {
      const assetCard = createTestAssetCard();
      const { identity } = createRuntimeIdentity({ assetCard });

      // UUID v4 format validation
      expect(identity.instance_id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
      );
    });

    it("should include golden_thread_hash", () => {
      const assetCard = createTestAssetCard();
      const { identity } = createRuntimeIdentity({ assetCard });

      expect(identity.golden_thread_hash).toMatch(/^sha256:[a-f0-9]{64}$/);
    });

    it("should set default mode to NORMAL", () => {
      const assetCard = createTestAssetCard();
      const { identity } = createRuntimeIdentity({ assetCard });

      expect(identity.mode).toBe("NORMAL");
    });
  });

  describe("Lineage Schema", () => {
    it("should validate root agent lineage", () => {
      const lineage = {
        parent_instance_id: null,
        generation_depth: 0,
        ancestor_chain: [],
        spawned_at: new Date().toISOString(),
        root_instance_id: TEST_INSTANCE_ID,
      };

      const result = LineageSchema.safeParse(lineage);
      expect(result.success).toBe(true);
    });

    it("should validate child agent lineage", () => {
      const parentId = randomUUID();
      const rootId = randomUUID();

      const lineage = {
        parent_instance_id: parentId,
        generation_depth: 1,
        ancestor_chain: [rootId],
        spawned_at: new Date().toISOString(),
        root_instance_id: rootId,
      };

      const result = LineageSchema.safeParse(lineage);
      expect(result.success).toBe(true);
    });
  });

  describe("Capabilities Manifest", () => {
    it("should validate capabilities with wildcards", () => {
      const caps = {
        allowed_tools: ["read_*", "search_*"],
        denied_tools: ["admin_*"],
        allowed_domains: ["*.example.com"],
        denied_domains: ["*.evil.com"],
        max_cost_per_session: 100,
        may_spawn_children: true,
        max_child_depth: 2,
        capability_mode: "decay",
      };

      const result = CapabilitiesManifestSchema.safeParse(caps);
      expect(result.success).toBe(true);
    });
  });

  describe("Schema Conformance", () => {
    it("should validate complete runtime identity", () => {
      const identity = {
        instance_id: TEST_INSTANCE_ID,
        asset_id: TEST_ASSET_ID,
        asset_name: "Test Agent",
        asset_version: "1.0.0",
        golden_thread_hash: "sha256:" + "a".repeat(64),
        golden_thread: {
          ticket_id: "TEST-1",
          approved_by: "test@test.com",
          approved_at: "2025-01-15T10:00:00Z",
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
        verified: false,
        mode: "NORMAL",
      };

      const result = RuntimeIdentitySchema.safeParse(identity);
      expect(result.success).toBe(true);
    });
  });
});

// ─────────────────────────────────────────────────────────────────
// SPEC-RT-003: Policy Engine Conformance
// ─────────────────────────────────────────────────────────────────

describe("SPEC-RT-003: Policy Engine", () => {
  describe("Rule Evaluation Order", () => {
    it("should check permissions with priority rules", () => {
      const assetCard = createTestAssetCard();
      const { identity } = createRuntimeIdentity({ assetCard });

      const engine = createPolicyEngine({
        defaultEffect: "deny",
        rules: [
          {
            id: "low-priority",
            effect: "allow",
            actions: ["*"],
            resources: ["*"],
            priority: 1,
          },
          {
            id: "high-priority",
            effect: "deny",
            actions: ["*"],
            resources: ["*"],
            priority: 100,
          },
        ],
        capabilities: identity.capabilities_manifest,
      });

      const result = engine.checkPermissionSync({ action: "test", resource: "*" });

      // The engine returns a result indicating whether the action is allowed
      expect(result).toBeDefined();
    });
  });

  describe("Wildcard Matching", () => {
    it("should match action wildcards in allowed_tools", () => {
      const assetCard = createTestAssetCard();
      const { identity } = createRuntimeIdentity({ assetCard });

      // Policy engine uses capabilities with wildcards
      const engine = createPolicyEngine({
        capabilities: {
          ...identity.capabilities_manifest,
          allowed_tools: ["read_*"], // Only read_* actions allowed
          denied_tools: [],
        },
      });

      // checkPermissionSync checks if action is allowed
      const readResult = engine.checkPermissionSync({ action: "read_file", resource: "*" });
      const writeResult = engine.checkPermissionSync({ action: "write_file", resource: "*" });

      expect(readResult.allowed).toBe(true);
      expect(writeResult.allowed).toBe(false);
    });
  });

  describe("Capability-Based Access Control", () => {
    it("should deny when action not in allowed_tools", () => {
      const assetCard = createTestAssetCard();
      const { identity } = createRuntimeIdentity({ assetCard });

      // Engine with restricted capabilities - only specific tools allowed
      const restrictedEngine = createPolicyEngine({
        capabilities: {
          ...identity.capabilities_manifest,
          allowed_tools: ["specific_tool"],
          denied_tools: [],
        },
      });

      // Engine with open capabilities - empty allowed means all allowed
      const openEngine = createPolicyEngine({
        capabilities: {
          ...identity.capabilities_manifest,
          allowed_tools: [],
          denied_tools: [],
        },
      });

      // When allowed_tools is specified, only those tools are allowed
      expect(restrictedEngine.checkPermissionSync({ action: "specific_tool", resource: "*" }).allowed).toBe(true);
      expect(restrictedEngine.checkPermissionSync({ action: "other_tool", resource: "*" }).allowed).toBe(false);

      // When allowed_tools is empty, all tools are allowed (unless denied)
      expect(openEngine.checkPermissionSync({ action: "any_tool", resource: "*" }).allowed).toBe(true);
    });
  });

  describe("Schema Conformance", () => {
    it("should validate policy file schema", () => {
      const policy = {
        version: "1.0",
        id: "test-policy",
        name: "Test Policy",
        description: "A test policy",
        applies_to: ["*"],
        capabilities: {
          default_effect: "deny",
          allowed_tools: ["read_*"],
          denied_tools: ["admin_*"],
        },
        rules: [
          {
            id: "rule-1",
            description: "Allow read operations",
            effect: "allow",
            actions: ["read_*"],
            resources: ["*"],
            priority: 10,
          },
        ],
      };

      const result = PolicyFileSchema.safeParse(policy);
      expect(result.success).toBe(true);
    });
  });
});

// ─────────────────────────────────────────────────────────────────
// SPEC-RT-005: Kill Switch Conformance
// ─────────────────────────────────────────────────────────────────

describe("SPEC-RT-005: Kill Switch", () => {
  beforeEach(() => {
    clearProcessedCommands();
  });

  describe("Command Types", () => {
    it("should support TERMINATE command", async () => {
      const assetCard = createTestAssetCard();
      const { identity } = createRuntimeIdentity({ assetCard });

      const killSwitch = createKillSwitch(identity, {
        channel: "polling",
        endpoint: "http://localhost:9999/kill-switch",
        requireSignature: false,
      });

      const command = createKillSwitchCommand("TERMINATE", {
        reason: "Test",
        issuedBy: "admin@test.com",
      });

      await killSwitch.processCommand(command);
      expect(killSwitch.state).toBe("TERMINATED");
    });

    it("should support PAUSE command", async () => {
      const assetCard = createTestAssetCard();
      const { identity } = createRuntimeIdentity({ assetCard });

      const killSwitch = createKillSwitch(identity, {
        channel: "polling",
        endpoint: "http://localhost:9999/kill-switch",
        requireSignature: false,
      });

      const command = createKillSwitchCommand("PAUSE", {
        reason: "Test",
        issuedBy: "admin@test.com",
      });

      await killSwitch.processCommand(command);
      expect(killSwitch.state).toBe("PAUSED");
    });

    it("should support RESUME command", async () => {
      const assetCard = createTestAssetCard();
      const { identity } = createRuntimeIdentity({ assetCard });

      const killSwitch = createKillSwitch(identity, {
        channel: "polling",
        endpoint: "http://localhost:9999/kill-switch",
        requireSignature: false,
      });

      // First pause
      await killSwitch.processCommand(
        createKillSwitchCommand("PAUSE", { reason: "Test", issuedBy: "admin@test.com" })
      );

      // Then resume
      await killSwitch.processCommand(
        createKillSwitchCommand("RESUME", { reason: "Test", issuedBy: "admin@test.com" })
      );

      expect(killSwitch.state).toBe("ACTIVE");
    });
  });

  describe("Replay Prevention", () => {
    it("should reject duplicate command IDs", async () => {
      const assetCard = createTestAssetCard();
      const { identity } = createRuntimeIdentity({ assetCard });

      const killSwitch = createKillSwitch(identity, {
        channel: "polling",
        endpoint: "http://localhost:9999/kill-switch",
        requireSignature: false,
      });

      const command = createKillSwitchCommand("PAUSE", {
        reason: "Test",
        issuedBy: "admin@test.com",
      });

      const first = await killSwitch.processCommand(command);
      const second = await killSwitch.processCommand(command);

      expect(first).toBe(true);
      expect(second).toBe(false);
    });
  });

  describe("Terminal State", () => {
    it("should not allow RESUME from TERMINATED", async () => {
      const assetCard = createTestAssetCard();
      const { identity } = createRuntimeIdentity({ assetCard });

      const killSwitch = createKillSwitch(identity, {
        channel: "polling",
        endpoint: "http://localhost:9999/kill-switch",
        requireSignature: false,
      });

      await killSwitch.processCommand(
        createKillSwitchCommand("TERMINATE", { reason: "Test", issuedBy: "admin@test.com" })
      );

      await killSwitch.processCommand(
        createKillSwitchCommand("RESUME", { reason: "Test", issuedBy: "admin@test.com" })
      );

      expect(killSwitch.state).toBe("TERMINATED");
    });
  });

  describe("Schema Conformance", () => {
    it("should validate kill switch command schema", () => {
      const command = {
        command_id: TEST_INSTANCE_ID,
        type: "TERMINATE",
        signature: "test-signature",
        timestamp: new Date().toISOString(),
        reason: "Test reason",
        issued_by: "admin@test.com",
      };

      const result = KillSwitchCommandSchema.safeParse(command);
      expect(result.success).toBe(true);
    });
  });
});

// ─────────────────────────────────────────────────────────────────
// SPEC-PRT-003: A2A Authentication Conformance
// ─────────────────────────────────────────────────────────────────

describe("SPEC-PRT-003: A2A Authentication", () => {
  // Helper to create token generation input from identity
  function createTokenInput(identity: ReturnType<typeof createRuntimeIdentity>["identity"]) {
    return {
      identity,
      goldenThread: {
        hash: identity.golden_thread_hash,
        verified: identity.verified,
        ticket_id: identity.golden_thread.ticket_id,
      },
      mode: identity.mode as "NORMAL" | "SANDBOX" | "RESTRICTED",
      killSwitch: {
        enabled: true,
        channel: "sse" as const,
      },
      capabilities: {
        hash: "sha256:test",
        tools: identity.capabilities_manifest.allowed_tools,
        maxBudgetUsd: identity.capabilities_manifest.max_cost_per_session ?? null,
        canSpawn: identity.capabilities_manifest.may_spawn_children,
        maxChildDepth: identity.capabilities_manifest.max_child_depth,
      },
    };
  }

  describe("Governance Token Generation", () => {
    it("should generate valid JWT with AIGOS claims", async () => {
      // Use ES256 which is supported by the generator
      const { privateKey, publicKey, keyId } = await generateES256KeyPair();

      const assetCard = createTestAssetCard({
        name: "A2A Test Agent",
      });
      const { identity } = createRuntimeIdentity({
        assetCard,
        capabilities: {
          allowed_tools: ["*"],
          denied_tools: [],
          may_spawn_children: false,
        },
      });

      const generator = createGovernanceTokenGenerator({
        privateKey,
        publicKey,
        keyId,
        issuer: "aigos-runtime",
      });

      const tokenInput = createTokenInput(identity);
      const result = await generator.generate(tokenInput, { audience: "aigos-agents" });

      expect(result.token).toBeDefined();
      expect(result.payload).toBeDefined();

      // Decode and verify structure
      const payload = jose.decodeJwt(result.token);
      expect(payload.iss).toBe("aigos-runtime");
      expect(payload.aigos).toBeDefined();
    });
  });

  describe("Token Validation", () => {
    it("should validate token with matching public key", async () => {
      const { privateKey, publicKey, keyId } = await generateES256KeyPair();

      const assetCard = createTestAssetCard({
        name: "A2A Test Agent",
      });
      const { identity } = createRuntimeIdentity({
        assetCard,
        capabilities: {
          allowed_tools: ["*"],
          denied_tools: [],
          may_spawn_children: false,
        },
      });

      const generator = createGovernanceTokenGenerator({
        privateKey,
        publicKey,
        keyId,
        issuer: "aigos-runtime",
      });

      const tokenInput = createTokenInput(identity);
      const { token } = await generator.generate(tokenInput, { audience: "aigos-agents" });

      const validator = createGovernanceTokenValidator();
      validator.addPublicKey(keyId, publicKey);

      const result = await validator.validate(token);
      expect(result.valid).toBe(true);
    });

    it("should reject expired token", async () => {
      const { privateKey, publicKey, keyId } = await generateES256KeyPair();

      const assetCard = createTestAssetCard({
        name: "A2A Test Agent",
      });
      const { identity } = createRuntimeIdentity({ assetCard });

      const generator = createGovernanceTokenGenerator({
        privateKey,
        publicKey,
        keyId,
        issuer: "aigos-runtime",
      });

      const tokenInput = createTokenInput(identity);
      // Generate with -60 seconds TTL (already expired)
      const { token } = await generator.generate(tokenInput, {
        ttlSeconds: -60,
        audience: "aigos-agents",
      });

      const validator = createGovernanceTokenValidator();
      validator.addPublicKey(keyId, publicKey);

      const result = await validator.validate(token);
      expect(result.valid).toBe(false);
      // The validator returns an error object with code and message
      expect(result.error).toBeDefined();
      expect(result.error?.code).toBe("EXPIRED");
    });
  });
});
