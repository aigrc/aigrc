import { describe, it, expect } from "vitest";
import {
  RuntimeIdentitySchema,
  CapabilitiesManifestSchema,
  KillSwitchCommandSchema,
  GovernanceTokenPayloadSchema,
  LineageSchema,
  GoldenThreadSchema,
  RiskLevelSchema,
  OperatingModeSchema,
  AssetCardRuntimeSchema,
} from "../src/schemas";

describe("Runtime Schemas", () => {
  describe("RiskLevelSchema", () => {
    it("should accept valid risk levels", () => {
      expect(RiskLevelSchema.parse("minimal")).toBe("minimal");
      expect(RiskLevelSchema.parse("limited")).toBe("limited");
      expect(RiskLevelSchema.parse("high")).toBe("high");
      expect(RiskLevelSchema.parse("unacceptable")).toBe("unacceptable");
    });

    it("should reject invalid risk levels", () => {
      expect(() => RiskLevelSchema.parse("invalid")).toThrow();
      expect(() => RiskLevelSchema.parse("")).toThrow();
    });
  });

  describe("OperatingModeSchema", () => {
    it("should accept valid operating modes", () => {
      expect(OperatingModeSchema.parse("NORMAL")).toBe("NORMAL");
      expect(OperatingModeSchema.parse("SANDBOX")).toBe("SANDBOX");
      expect(OperatingModeSchema.parse("RESTRICTED")).toBe("RESTRICTED");
    });

    it("should reject invalid operating modes", () => {
      expect(() => OperatingModeSchema.parse("invalid")).toThrow();
    });
  });

  describe("GoldenThreadSchema", () => {
    it("should accept valid Golden Thread data", () => {
      const result = GoldenThreadSchema.parse({
        ticket_id: "FIN-1234",
        approved_by: "ciso@corp.com",
        approved_at: "2025-01-15T10:30:00Z",
      });
      expect(result.ticket_id).toBe("FIN-1234");
      expect(result.approved_by).toBe("ciso@corp.com");
    });

    it("should accept Golden Thread with hash", () => {
      const result = GoldenThreadSchema.parse({
        ticket_id: "FIN-1234",
        approved_by: "ciso@corp.com",
        approved_at: "2025-01-15T10:30:00Z",
        hash: "sha256:7d865e959b2466918c9863afca942d0fb89d7c9ac0c99bafc3749504ded97730",
      });
      expect(result.hash).toBe("sha256:7d865e959b2466918c9863afca942d0fb89d7c9ac0c99bafc3749504ded97730");
    });

    it("should reject invalid hash format", () => {
      expect(() => GoldenThreadSchema.parse({
        ticket_id: "FIN-1234",
        approved_by: "ciso@corp.com",
        approved_at: "2025-01-15T10:30:00Z",
        hash: "invalid-hash",
      })).toThrow();
    });

    it("should reject invalid email", () => {
      expect(() => GoldenThreadSchema.parse({
        ticket_id: "FIN-1234",
        approved_by: "not-an-email",
        approved_at: "2025-01-15T10:30:00Z",
      })).toThrow();
    });
  });

  describe("LineageSchema", () => {
    it("should accept valid root agent lineage", () => {
      const rootId = "550e8400-e29b-41d4-a716-446655440000";
      const result = LineageSchema.parse({
        parent_instance_id: null,
        generation_depth: 0,
        ancestor_chain: [],
        spawned_at: "2025-01-15T10:30:00Z",
        root_instance_id: rootId,
      });
      expect(result.generation_depth).toBe(0);
      expect(result.parent_instance_id).toBeNull();
    });

    it("should accept valid child agent lineage", () => {
      const rootId = "550e8400-e29b-41d4-a716-446655440000";
      const parentId = "550e8400-e29b-41d4-a716-446655440001";
      const result = LineageSchema.parse({
        parent_instance_id: parentId,
        generation_depth: 1,
        ancestor_chain: [rootId],
        spawned_at: "2025-01-15T10:30:00Z",
        root_instance_id: rootId,
      });
      expect(result.generation_depth).toBe(1);
      expect(result.ancestor_chain).toEqual([rootId]);
    });

    it("should reject negative generation depth", () => {
      expect(() => LineageSchema.parse({
        parent_instance_id: null,
        generation_depth: -1,
        ancestor_chain: [],
        spawned_at: "2025-01-15T10:30:00Z",
        root_instance_id: "550e8400-e29b-41d4-a716-446655440000",
      })).toThrow();
    });
  });

  describe("CapabilitiesManifestSchema", () => {
    it("should accept minimal capabilities", () => {
      const result = CapabilitiesManifestSchema.parse({});
      expect(result.allowed_tools).toEqual([]);
      expect(result.denied_tools).toEqual([]);
      expect(result.may_spawn_children).toBe(false);
    });

    it("should accept full capabilities", () => {
      const result = CapabilitiesManifestSchema.parse({
        allowed_tools: ["read_file", "write_file"],
        denied_tools: ["execute_shell"],
        allowed_domains: ["*.example.com"],
        denied_domains: ["*.evil.com"],
        max_cost_per_session: 10.0,
        max_cost_per_day: 100.0,
        max_tokens_per_call: 4096,
        may_spawn_children: true,
        max_child_depth: 3,
        capability_mode: "decay",
      });
      expect(result.allowed_tools).toEqual(["read_file", "write_file"]);
      expect(result.may_spawn_children).toBe(true);
      expect(result.capability_mode).toBe("decay");
    });

    it("should default capability_mode to decay", () => {
      const result = CapabilitiesManifestSchema.parse({});
      expect(result.capability_mode).toBe("decay");
    });
  });

  describe("KillSwitchCommandSchema", () => {
    it("should accept valid TERMINATE command", () => {
      const result = KillSwitchCommandSchema.parse({
        command_id: "550e8400-e29b-41d4-a716-446655440000",
        type: "TERMINATE",
        signature: "valid-signature",
        timestamp: "2025-01-15T10:30:00Z",
        reason: "Emergency shutdown",
        issued_by: "admin@corp.com",
      });
      expect(result.type).toBe("TERMINATE");
    });

    it("should accept PAUSE command with instance target", () => {
      const result = KillSwitchCommandSchema.parse({
        command_id: "550e8400-e29b-41d4-a716-446655440000",
        type: "PAUSE",
        instance_id: "550e8400-e29b-41d4-a716-446655440001",
        signature: "valid-signature",
        timestamp: "2025-01-15T10:30:00Z",
        reason: "Pausing for investigation",
        issued_by: "admin@corp.com",
      });
      expect(result.type).toBe("PAUSE");
      expect(result.instance_id).toBe("550e8400-e29b-41d4-a716-446655440001");
    });

    it("should accept RESUME command", () => {
      const result = KillSwitchCommandSchema.parse({
        command_id: "550e8400-e29b-41d4-a716-446655440000",
        type: "RESUME",
        signature: "valid-signature",
        timestamp: "2025-01-15T10:30:00Z",
        reason: "Resuming after investigation",
        issued_by: "admin@corp.com",
      });
      expect(result.type).toBe("RESUME");
    });

    it("should reject invalid command type", () => {
      expect(() => KillSwitchCommandSchema.parse({
        command_id: "550e8400-e29b-41d4-a716-446655440000",
        type: "INVALID",
        signature: "valid-signature",
        timestamp: "2025-01-15T10:30:00Z",
        reason: "Test",
        issued_by: "admin@corp.com",
      })).toThrow();
    });
  });

  describe("RuntimeIdentitySchema", () => {
    const validIdentity = {
      instance_id: "550e8400-e29b-41d4-a716-446655440000",
      asset_id: "aigrc-2024-a1b2c3d4",
      asset_name: "Test Agent",
      asset_version: "1.0.0",
      golden_thread_hash: "sha256:7d865e959b2466918c9863afca942d0fb89d7c9ac0c99bafc3749504ded97730",
      golden_thread: {
        ticket_id: "FIN-1234",
        approved_by: "ciso@corp.com",
        approved_at: "2025-01-15T10:30:00Z",
      },
      risk_level: "limited",
      lineage: {
        parent_instance_id: null,
        generation_depth: 0,
        ancestor_chain: [],
        spawned_at: "2025-01-15T10:30:00Z",
        root_instance_id: "550e8400-e29b-41d4-a716-446655440000",
      },
      capabilities_manifest: {
        allowed_tools: ["read_file"],
        denied_tools: [],
      },
      created_at: "2025-01-15T10:30:00Z",
    };

    it("should accept valid runtime identity", () => {
      const result = RuntimeIdentitySchema.parse(validIdentity);
      expect(result.instance_id).toBe("550e8400-e29b-41d4-a716-446655440000");
      expect(result.verified).toBe(false); // default
      expect(result.mode).toBe("NORMAL"); // default
    });

    it("should accept identity with verified and mode", () => {
      const result = RuntimeIdentitySchema.parse({
        ...validIdentity,
        verified: true,
        mode: "SANDBOX",
      });
      expect(result.verified).toBe(true);
      expect(result.mode).toBe("SANDBOX");
    });

    it("should reject invalid asset_id format", () => {
      expect(() => RuntimeIdentitySchema.parse({
        ...validIdentity,
        asset_id: "invalid-format",
      })).toThrow();
    });

    it("should reject invalid version format", () => {
      expect(() => RuntimeIdentitySchema.parse({
        ...validIdentity,
        asset_version: "v1",
      })).toThrow();
    });
  });

  describe("GovernanceTokenPayloadSchema", () => {
    const validPayload = {
      iss: "aigos-runtime",
      sub: "550e8400-e29b-41d4-a716-446655440000",
      aud: "aigos-agents",
      exp: 1737000600,
      iat: 1736999700,
      nbf: 1736999700,
      jti: "550e8400-e29b-41d4-a716-446655440001",
      aigos: {
        identity: {
          instance_id: "550e8400-e29b-41d4-a716-446655440000",
          asset_id: "aigrc-2024-a1b2c3d4",
          asset_name: "Test Agent",
          asset_version: "1.0.0",
        },
        governance: {
          risk_level: "limited",
          golden_thread: {
            hash: "sha256:7d865e959b2466918c9863afca942d0fb89d7c9ac0c99bafc3749504ded97730",
            verified: true,
            ticket_id: "FIN-1234",
          },
          mode: "NORMAL",
        },
        control: {
          kill_switch: {
            enabled: true,
            channel: "sse",
          },
          paused: false,
          termination_pending: false,
        },
        capabilities: {
          hash: "sha256:abc123",
          tools: ["read_file", "write_file"],
          max_budget_usd: 100.0,
          can_spawn: true,
          max_child_depth: 3,
        },
        lineage: {
          generation_depth: 0,
          parent_instance_id: null,
          root_instance_id: "550e8400-e29b-41d4-a716-446655440000",
        },
      },
    };

    it("should accept valid governance token payload", () => {
      const result = GovernanceTokenPayloadSchema.parse(validPayload);
      expect(result.iss).toBe("aigos-runtime");
      expect(result.aigos.identity.asset_name).toBe("Test Agent");
    });

    it("should reject invalid issuer", () => {
      expect(() => GovernanceTokenPayloadSchema.parse({
        ...validPayload,
        iss: "wrong-issuer",
      })).toThrow();
    });

    it("should accept array audience", () => {
      const result = GovernanceTokenPayloadSchema.parse({
        ...validPayload,
        aud: ["agent1", "agent2"],
      });
      expect(result.aud).toEqual(["agent1", "agent2"]);
    });
  });

  describe("AssetCardRuntimeSchema", () => {
    it("should accept minimal runtime config", () => {
      const result = AssetCardRuntimeSchema.parse({});
      expect(result.verification_failure_mode).toBe("SANDBOX");
      expect(result.telemetry_enabled).toBe(true);
    });

    it("should accept full runtime config", () => {
      const result = AssetCardRuntimeSchema.parse({
        policy_path: ".aigrc/policies/default.yaml",
        verification_failure_mode: "FAIL",
        telemetry_enabled: false,
        kill_switch: {
          enabled: true,
          channel: "sse",
          endpoint: "https://ks.example.com/events",
        },
      });
      expect(result.policy_path).toBe(".aigrc/policies/default.yaml");
      expect(result.verification_failure_mode).toBe("FAIL");
      expect(result.kill_switch?.channel).toBe("sse");
    });
  });
});
