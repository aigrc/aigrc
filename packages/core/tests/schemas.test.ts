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
  PolicyFileSchema,
  PolicyRuleSchema,
  PolicyCapabilitiesSchema,
  AigrcConfigSchema,
  AigrcRuntimeConfigSchema,
  AigrcIntegrationsConfigSchema,
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

  describe("PolicyRuleSchema", () => {
    it("should accept minimal rule", () => {
      const result = PolicyRuleSchema.parse({
        id: "rule-1",
        effect: "allow",
      });
      expect(result.id).toBe("rule-1");
      expect(result.effect).toBe("allow");
      expect(result.actions).toEqual(["*"]);
      expect(result.resources).toEqual(["*"]);
      expect(result.priority).toBe(0);
    });

    it("should accept full rule with conditions", () => {
      const result = PolicyRuleSchema.parse({
        id: "high-risk-deny",
        description: "Deny all actions for high-risk agents",
        effect: "deny",
        actions: ["execute_shell", "write_file"],
        resources: ["/**"],
        conditions: {
          risk_levels: ["high", "unacceptable"],
          modes: ["RESTRICTED"],
          time_ranges: [{ start: "00:00", end: "06:00" }],
        },
        priority: 100,
      });
      expect(result.id).toBe("high-risk-deny");
      expect(result.effect).toBe("deny");
      expect(result.conditions?.risk_levels).toEqual(["high", "unacceptable"]);
      expect(result.priority).toBe(100);
    });

    it("should accept audit effect", () => {
      const result = PolicyRuleSchema.parse({
        id: "audit-all",
        effect: "audit",
      });
      expect(result.effect).toBe("audit");
    });

    it("should reject invalid effect", () => {
      expect(() => PolicyRuleSchema.parse({
        id: "rule-1",
        effect: "invalid",
      })).toThrow();
    });
  });

  describe("PolicyCapabilitiesSchema", () => {
    it("should accept minimal capabilities", () => {
      const result = PolicyCapabilitiesSchema.parse({});
      expect(result.default_effect).toBe("deny");
      expect(result.allowed_tools).toEqual([]);
      expect(result.may_spawn).toBe(false);
    });

    it("should accept full capabilities", () => {
      const result = PolicyCapabilitiesSchema.parse({
        default_effect: "allow",
        allowed_tools: ["read_file", "write_file"],
        denied_tools: ["execute_shell"],
        allowed_domains: ["*.example.com"],
        denied_domains: ["*.evil.com"],
        max_budget_per_session: 10.0,
        max_budget_per_day: 100.0,
        may_spawn: true,
        max_spawn_depth: 3,
      });
      expect(result.default_effect).toBe("allow");
      expect(result.allowed_tools).toContain("read_file");
      expect(result.may_spawn).toBe(true);
      expect(result.max_spawn_depth).toBe(3);
    });
  });

  describe("PolicyFileSchema", () => {
    it("should accept minimal policy", () => {
      const result = PolicyFileSchema.parse({
        version: "1.0",
        id: "default-policy",
        name: "Default Policy",
      });
      expect(result.version).toBe("1.0");
      expect(result.id).toBe("default-policy");
      expect(result.applies_to).toEqual(["*"]);
      expect(result.rules).toEqual([]);
    });

    it("should accept full policy with inheritance", () => {
      const result = PolicyFileSchema.parse({
        version: "1.0",
        id: "production-policy",
        name: "Production Policy",
        description: "Strict policy for production environment",
        extends: "default-policy",
        applies_to: ["aigrc-2024-*"],
        capabilities: {
          default_effect: "deny",
          allowed_tools: ["read_file"],
          max_budget_per_day: 50.0,
        },
        rules: [
          {
            id: "allow-read",
            effect: "allow",
            actions: ["read_file"],
          },
        ],
        metadata: {
          created_at: "2025-01-15T10:30:00Z",
          updated_at: "2025-01-15T10:30:00Z",
          created_by: "admin@corp.com",
          tags: ["production", "restricted"],
        },
      });
      expect(result.extends).toBe("default-policy");
      expect(result.capabilities?.default_effect).toBe("deny");
      expect(result.rules).toHaveLength(1);
      expect(result.metadata?.tags).toContain("production");
    });

    it("should reject invalid version", () => {
      expect(() => PolicyFileSchema.parse({
        version: "2.0",
        id: "test",
        name: "Test",
      })).toThrow();
    });

    it("should reject empty id", () => {
      expect(() => PolicyFileSchema.parse({
        version: "1.0",
        id: "",
        name: "Test",
      })).toThrow();
    });
  });

  describe("AigrcRuntimeConfigSchema", () => {
    it("should accept minimal config", () => {
      const result = AigrcRuntimeConfigSchema.parse({});
      expect(result.policy_paths).toEqual([".aigrc/policies"]);
      expect(result.asset_paths).toEqual([".aigrc/assets"]);
      expect(result.verification_failure_mode).toBe("SANDBOX");
    });

    it("should accept full config", () => {
      const result = AigrcRuntimeConfigSchema.parse({
        default_policy: "production",
        policy_paths: ["policies", ".aigrc/policies"],
        asset_paths: ["assets"],
        verification_failure_mode: "FAIL",
        telemetry: {
          enabled: true,
          endpoint: "https://telemetry.example.com",
          sample_rate: 0.5,
        },
        kill_switch: {
          enabled: true,
          channel: "polling",
          endpoint: "https://ks.example.com",
          poll_interval_ms: 10000,
        },
      });
      expect(result.default_policy).toBe("production");
      expect(result.telemetry?.sample_rate).toBe(0.5);
      expect(result.kill_switch?.channel).toBe("polling");
    });
  });

  describe("AigrcIntegrationsConfigSchema", () => {
    it("should accept minimal integrations", () => {
      const result = AigrcIntegrationsConfigSchema.parse({});
      expect(result.jira).toBeUndefined();
      expect(result.github).toBeUndefined();
    });

    it("should accept full integrations", () => {
      const result = AigrcIntegrationsConfigSchema.parse({
        jira: {
          enabled: true,
          url: "https://company.atlassian.net",
          project_key: "AI",
        },
        azure_devops: {
          enabled: true,
          organization: "company",
          project: "ai-governance",
        },
        github: {
          enabled: true,
          owner: "company",
          repo: "ai-assets",
        },
      });
      expect(result.jira?.enabled).toBe(true);
      expect(result.azure_devops?.organization).toBe("company");
      expect(result.github?.repo).toBe("ai-assets");
    });
  });

  describe("AigrcConfigSchema", () => {
    it("should accept minimal config", () => {
      const result = AigrcConfigSchema.parse({
        version: "1.0",
      });
      expect(result.version).toBe("1.0");
      expect(result.runtime).toBeUndefined();
    });

    it("should accept full config with environments", () => {
      const result = AigrcConfigSchema.parse({
        version: "1.0",
        name: "My AI Project",
        description: "AI governance configuration",
        runtime: {
          default_policy: "default",
          verification_failure_mode: "SANDBOX",
        },
        integrations: {
          jira: {
            enabled: true,
            url: "https://company.atlassian.net",
          },
        },
        environments: {
          production: {
            runtime: {
              verification_failure_mode: "FAIL",
            },
          },
          development: {
            runtime: {
              verification_failure_mode: "SANDBOX",
            },
          },
        },
      });
      expect(result.name).toBe("My AI Project");
      expect(result.environments?.production?.runtime?.verification_failure_mode).toBe("FAIL");
      expect(result.environments?.development?.runtime?.verification_failure_mode).toBe("SANDBOX");
    });

    it("should reject invalid version", () => {
      expect(() => AigrcConfigSchema.parse({
        version: "2.0",
      })).toThrow();
    });
  });
});
