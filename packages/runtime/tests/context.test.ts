import { describe, it, expect, beforeEach } from "vitest";
import { createRuntimeContext, type RuntimeContextConfig } from "../src/context";
import { createKillSwitchCommand } from "../src/kill-switch";
import type { RuntimeIdentity, PolicyFile } from "@aigrc/core";

// Valid UUIDs for testing
const TEST_INSTANCE_ID = "11111111-1111-1111-1111-111111111111";
const TEST_ASSET_ID = "aigrc-2024-a1b2c3d4";

// Helper to create a mock runtime identity
// Note: These values don't need to match schema validation in context tests
// since we're passing identity directly without going through createRuntimeIdentity
function createMockIdentity(overrides: Partial<RuntimeIdentity> = {}): RuntimeIdentity {
  return {
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
    verified: true,
    mode: "NORMAL",
    ...overrides,
  };
}

// Helper to create a mock policy
function createMockPolicy(overrides: Partial<PolicyFile> = {}): PolicyFile {
  return {
    version: "1.0",
    id: "test-policy",
    name: "Test Policy",
    applies_to: ["*"],
    rules: [],
    ...overrides,
  };
}

describe("Runtime Context", () => {
  describe("createRuntimeContext", () => {
    it("should create context with identity", () => {
      const identity = createMockIdentity();
      const context = createRuntimeContext({ identity });

      expect(context.identity).toBe(identity);
      expect(context.mode).toBe("NORMAL");
      expect(context.riskLevel).toBe("minimal");
    });

    it("should allow actions with no policy and no restrictions", () => {
      const identity = createMockIdentity();
      const context = createRuntimeContext({ identity });

      const result = context.checkAction("read_file", "/some/path");

      expect(result.allowed).toBe(true);
      expect(result.effect).toBe("allow");
    });

    it("should check tools with capabilities", () => {
      const identity = createMockIdentity({
        capabilities_manifest: {
          allowed_tools: ["read_*", "write_*"],
          denied_tools: ["delete_*"],
          allowed_domains: [],
          denied_domains: [],
          max_cost_per_session: null,
          max_cost_per_day: null,
          max_tokens_per_call: null,
          may_spawn_children: false,
          max_child_depth: 0,
          capability_mode: "decay",
        },
      });
      const context = createRuntimeContext({ identity });

      expect(context.checkTool("read_file")).toBe(true);
      expect(context.checkTool("write_file")).toBe(true);
      expect(context.checkTool("delete_file")).toBe(false);
      expect(context.checkTool("execute_command")).toBe(false); // Not in allowed list
    });

    it("should check domains with capabilities", () => {
      const identity = createMockIdentity({
        capabilities_manifest: {
          allowed_tools: [],
          denied_tools: [],
          allowed_domains: ["*.example.com", "api.service.io"],
          denied_domains: ["*.dangerous.com"],
          max_cost_per_session: null,
          max_cost_per_day: null,
          max_tokens_per_call: null,
          may_spawn_children: false,
          max_child_depth: 0,
          capability_mode: "decay",
        },
      });
      const context = createRuntimeContext({ identity });

      expect(context.checkDomain("api.example.com")).toBe(true);
      expect(context.checkDomain("example.com")).toBe(true);
      expect(context.checkDomain("api.service.io")).toBe(true);
      expect(context.checkDomain("evil.dangerous.com")).toBe(false);
      expect(context.checkDomain("random.com")).toBe(false); // Not in allowed list
    });

    it("should use policy for action checks when provided", () => {
      const identity = createMockIdentity();
      const policy = createMockPolicy({
        rules: [
          {
            id: "allow-read",
            effect: "allow",
            actions: ["read_*"],
            resources: ["*"],
          },
          {
            id: "deny-write",
            effect: "deny",
            actions: ["write_*"],
            resources: ["*"],
          },
        ],
      });

      const context = createRuntimeContext({ identity, policy });

      const readResult = context.checkAction("read_file", "/path");
      expect(readResult.allowed).toBe(true);

      const writeResult = context.checkAction("write_file", "/path");
      expect(writeResult.allowed).toBe(false);
    });

    it("should require audit for high risk identity", () => {
      const identity = createMockIdentity({ risk_level: "high" });
      const policy = createMockPolicy({
        rules: [
          {
            id: "allow-all",
            effect: "allow",
            actions: ["*"],
            resources: ["*"],
          },
        ],
      });

      const context = createRuntimeContext({ identity, policy });
      const result = context.checkAction("any_action", "/any/resource");

      expect(result.requiresAudit).toBe(true);
    });

    it("should deny all when kill switch is triggered", async () => {
      const identity = createMockIdentity();
      const context = createRuntimeContext({
        identity,
        killSwitch: { channel: "polling", endpoint: "http://localhost:9999/kill-switch", requireSignature: false },
      });

      // Start and manually trigger kill switch
      context.start();

      // Process a terminate command via the kill switch
      const cmd = createKillSwitchCommand("TERMINATE", {
        reason: "Emergency",
        issuedBy: "admin@test.com",
      });
      await context.killSwitch!.processCommand(cmd);

      // Now check action
      const result = context.checkAction("read_file", "/path");

      expect(result.allowed).toBe(false);
      expect(result.reason).toContain("terminated or paused");
      expect(context.shouldContinue()).toBe(false);

      context.stop();
    });

    it("should provide evaluation context", () => {
      const identity = createMockIdentity({
        risk_level: "limited",
        mode: "SANDBOX",
      });

      const context = createRuntimeContext({ identity });
      const evalContext = context.getEvaluationContext();

      expect(evalContext.riskLevel).toBe("limited");
      expect(evalContext.mode).toBe("SANDBOX");
      expect(evalContext.timestamp).toBeDefined();
    });
  });

  describe("pattern matching", () => {
    it("should match wildcard suffix patterns", () => {
      const identity = createMockIdentity({
        capabilities_manifest: {
          allowed_tools: ["file_*"],
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
      });
      const context = createRuntimeContext({ identity });

      expect(context.checkTool("file_read")).toBe(true);
      expect(context.checkTool("file_write")).toBe(true);
      expect(context.checkTool("database_read")).toBe(false);
    });

    it("should match wildcard prefix patterns", () => {
      const identity = createMockIdentity({
        capabilities_manifest: {
          allowed_tools: ["*_safe"],
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
      });
      const context = createRuntimeContext({ identity });

      expect(context.checkTool("read_safe")).toBe(true);
      expect(context.checkTool("write_safe")).toBe(true);
      expect(context.checkTool("delete_dangerous")).toBe(false);
    });

    it("should match wildcard subdomain patterns", () => {
      const identity = createMockIdentity({
        capabilities_manifest: {
          allowed_tools: [],
          denied_tools: [],
          allowed_domains: ["*.mycompany.com"],
          denied_domains: [],
          max_cost_per_session: null,
          max_cost_per_day: null,
          max_tokens_per_call: null,
          may_spawn_children: false,
          max_child_depth: 0,
          capability_mode: "decay",
        },
      });
      const context = createRuntimeContext({ identity });

      expect(context.checkDomain("api.mycompany.com")).toBe(true);
      expect(context.checkDomain("www.mycompany.com")).toBe(true);
      expect(context.checkDomain("mycompany.com")).toBe(true);
      expect(context.checkDomain("api.othercompany.com")).toBe(false);
    });
  });

  describe("lifecycle", () => {
    it("should start and stop without errors", () => {
      const identity = createMockIdentity();
      const context = createRuntimeContext({
        identity,
        killSwitch: { channel: "polling", endpoint: "http://localhost:9999/kill-switch" },
      });

      expect(() => context.start()).not.toThrow();
      expect(() => context.stop()).not.toThrow();
    });

    it("should continue when no kill switch", () => {
      const identity = createMockIdentity();
      const context = createRuntimeContext({ identity });

      expect(context.shouldContinue()).toBe(true);
      expect(context.killSwitch).toBeNull();
    });
  });
});
