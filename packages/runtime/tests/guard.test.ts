import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  guardCheck,
  withGuard,
  guardedScope,
  setGuardContext,
  getGuardContext,
  clearGuardContext,
  createGuardContext,
  GuardDeniedError,
} from "../src/guard.js";
import { createRuntimeContext, type RuntimeContext, type RuntimeContextConfig } from "../src/context.js";
import type { RuntimeIdentity, AssetCard } from "@aigrc/core";

// Test fixtures
const TEST_ASSET_ID = "aigrc-2024-a1b2c3d4";
const TEST_INSTANCE_ID = "11111111-1111-1111-1111-111111111111";

function createTestAssetCard(overrides: Partial<AssetCard> = {}): AssetCard {
  return {
    id: TEST_ASSET_ID,
    name: "Test Agent",
    description: "A test agent for unit tests",
    version: "1.0.0",
    created: "2024-01-01T00:00:00Z",
    updated: "2024-01-01T00:00:00Z",
    ownership: {
      owner: { name: "Test Owner", email: "test@example.com" },
    },
    technical: {
      type: "agent",
      framework: "test-framework",
      frameworkVersion: "1.0.0",
    },
    classification: {
      riskLevel: "minimal",
      euAiActCategory: "minimal",
      reasoning: "Test agent",
    },
    intent: {
      linked: true,
      ticketSystem: "jira",
      ticketId: "TEST-123",
      ticketUrl: "https://jira.example.com/TEST-123",
    },
    governance: {
      humanOversight: "notification",
      approvals: [
        { name: "Approver", email: "approver@example.com", date: "2024-01-01T00:00:00Z" },
      ],
    },
    ...overrides,
  } as AssetCard;
}

function createTestIdentity(overrides: Partial<RuntimeIdentity> = {}): RuntimeIdentity {
  return {
    instance_id: TEST_INSTANCE_ID,
    asset_id: TEST_ASSET_ID,
    asset_name: "Test Agent",
    asset_version: "1.0.0",
    golden_thread_hash: "sha256:abc123def456abc123def456abc123def456abc123def456abc123def456abc1",
    golden_thread: {
      ticket_id: "TEST-123",
      approved_by: "approver@example.com",
      approved_at: "2024-01-01T00:00:00Z",
    },
    risk_level: "minimal",
    lineage: {
      parent_instance_id: null,
      generation_depth: 0,
      ancestor_chain: [],
      spawned_at: "2024-01-01T00:00:00Z",
      root_instance_id: TEST_INSTANCE_ID,
    },
    capabilities_manifest: {
      allowed_tools: ["read_file", "write_file", "execute_tool"],
      denied_tools: ["dangerous_tool"],
      allowed_domains: ["api.example.com", "*.trusted.com"],
      denied_domains: ["malicious.com"],
      max_cost_per_session: 10.0,
      max_cost_per_day: 100.0,
      max_tokens_per_call: 4096,
      may_spawn_children: true,
      max_child_depth: 2,
      capability_mode: "decay",
    },
    created_at: "2024-01-01T00:00:00Z",
    verified: true,
    mode: "NORMAL",
    ...overrides,
  };
}

describe("Guard Decorator API", () => {
  let context: RuntimeContext;
  let identity: RuntimeIdentity;

  beforeEach(() => {
    identity = createTestIdentity();
    const config: RuntimeContextConfig = { identity };
    context = createRuntimeContext(config);
    setGuardContext(context);
  });

  afterEach(() => {
    clearGuardContext();
  });

  describe("setGuardContext / getGuardContext", () => {
    it("should set and get context", () => {
      expect(getGuardContext()).toBe(context);
    });

    it("should clear context", () => {
      clearGuardContext();
      expect(getGuardContext()).toBeNull();
    });

    it("should create context from identity", () => {
      const newContext = createGuardContext(identity);
      expect(newContext.identity).toEqual(identity);
    });
  });

  describe("guardCheck (functional)", () => {
    it("should allow action when permitted", async () => {
      const result = await guardCheck(context, { action: "read_file" });
      expect(result.allowed).toBe(true);
    });

    it("should deny action when not permitted", async () => {
      const result = await guardCheck(context, {
        requiredTools: ["dangerous_tool"],
      });
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain("denied");
    });

    it("should check required tools", async () => {
      const result = await guardCheck(context, {
        requiredTools: ["read_file", "write_file"],
      });
      expect(result.allowed).toBe(true);
    });

    it("should check required domains", async () => {
      const result = await guardCheck(context, {
        requiredDomains: ["api.example.com"],
      });
      expect(result.allowed).toBe(true);
    });

    it("should deny when domain not allowed", async () => {
      const result = await guardCheck(context, {
        requiredDomains: ["malicious.com"],
      });
      expect(result.allowed).toBe(false);
    });

    it("should check risk level", async () => {
      const result = await guardCheck(context, {
        maxRiskLevel: "limited",
      });
      expect(result.allowed).toBe(true);
    });

    it("should deny when risk level exceeds maximum", async () => {
      const highRiskIdentity = createTestIdentity({ risk_level: "high" });
      const highRiskContext = createRuntimeContext({ identity: highRiskIdentity });

      const result = await guardCheck(highRiskContext, {
        maxRiskLevel: "limited",
      });
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain("exceeds");
    });

    it("should check operating mode", async () => {
      const result = await guardCheck(context, {
        allowedModes: ["NORMAL", "SANDBOX"],
      });
      expect(result.allowed).toBe(true);
    });

    it("should deny when mode not allowed", async () => {
      const result = await guardCheck(context, {
        allowedModes: ["RESTRICTED"],
      });
      expect(result.allowed).toBe(false);
    });

    it("should run custom check", async () => {
      const result = await guardCheck(context, {
        customCheck: async (ctx, args) => ({
          allowed: args.length > 0,
          reason: args.length > 0 ? "Args present" : "No args",
        }),
      }, ["arg1"]);
      expect(result.allowed).toBe(true);
    });

    it("should deny on failed custom check", async () => {
      const result = await guardCheck(context, {
        customCheck: async () => ({
          allowed: false,
          reason: "Custom denial",
        }),
      });
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain("Custom denial");
    });
  });

  describe("withGuard (higher-order function)", () => {
    it("should wrap function with guard checks", async () => {
      const fn = (x: number) => x * 2;
      // Use "read_file" which is in the allowed_tools list for the test identity
      const guarded = withGuard(fn, { action: "read_file" });

      const result = await guarded(context, 5);
      expect(result).toBe(10);
    });

    it("should throw on guard denial", async () => {
      const fn = () => "result";
      const guarded = withGuard(fn, {
        requiredTools: ["dangerous_tool"],
      });

      await expect(guarded(context)).rejects.toThrow(GuardDeniedError);
    });

    it("should return undefined when throwOnDeny is false", async () => {
      const fn = () => "result";
      const guarded = withGuard(fn, {
        requiredTools: ["dangerous_tool"],
        throwOnDeny: false,
      });

      const result = await guarded(context);
      expect(result).toBeUndefined();
    });
  });

  describe("guardedScope", () => {
    it("should set context for scope duration", async () => {
      clearGuardContext();
      expect(getGuardContext()).toBeNull();

      await guardedScope(context, () => {
        expect(getGuardContext()).toBe(context);
      });

      expect(getGuardContext()).toBeNull();
    });

    it("should restore previous context after scope", async () => {
      const context2 = createRuntimeContext({
        identity: createTestIdentity({
          instance_id: "22222222-2222-2222-2222-222222222222",
        }),
      });

      setGuardContext(context);

      await guardedScope(context2, () => {
        expect(getGuardContext()).toBe(context2);
      });

      expect(getGuardContext()).toBe(context);
    });

    it("should return scope result", async () => {
      const result = await guardedScope(context, () => 42);
      expect(result).toBe(42);
    });

    it("should handle async scopes", async () => {
      const result = await guardedScope(context, async () => {
        await new Promise((r) => setTimeout(r, 10));
        return "async result";
      });
      expect(result).toBe("async result");
    });
  });

  describe("GuardDeniedError", () => {
    it("should contain result and action", async () => {
      try {
        await guardCheck(context, {
          action: "test_action",
          requiredTools: ["dangerous_tool"],
        }).then((result) => {
          if (!result.allowed) {
            throw new GuardDeniedError("Denied", result, "test_action");
          }
        });
        expect.fail("Should have thrown");
      } catch (error) {
        expect(error).toBeInstanceOf(GuardDeniedError);
        const gde = error as GuardDeniedError;
        expect(gde.action).toBe("test_action");
        expect(gde.result.allowed).toBe(false);
      }
    });
  });

  // Note: @guard decorator tests require experimentalDecorators enabled
  // The decorator is tested indirectly through the functional APIs (guardCheck, withGuard, guardedScope)
  // For decorator usage in production, enable experimentalDecorators in tsconfig.json
});
