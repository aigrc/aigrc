import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  createKillSwitch,
  createKillSwitchCommand,
  clearProcessedCommands,
  type KillSwitchConfig,
} from "../src/kill-switch";
import type { RuntimeIdentity, KillSwitchCommand } from "@aigrc/core";

// Valid UUIDs for testing
const TEST_INSTANCE_ID = "11111111-1111-1111-1111-111111111111";
const OTHER_INSTANCE_ID = "22222222-2222-2222-2222-222222222222";
const TEST_ASSET_ID = "aigrc-2024-a1b2c3d4";

// Helper to create a mock runtime identity
// Note: For kill switch tests, the identity doesn't go through schema validation
// but commands do - so we use valid formats for consistency
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

describe("Kill Switch", () => {
  beforeEach(() => {
    clearProcessedCommands();
  });

  describe("createKillSwitch", () => {
    it("should create handler with ACTIVE state", () => {
      const identity = createMockIdentity();
      const config: KillSwitchConfig = { channel: "polling" };

      const handler = createKillSwitch(identity, config);

      expect(handler.state).toBe("ACTIVE");
      expect(handler.shouldContinue()).toBe(true);
    });

    it("should process TERMINATE command", () => {
      const identity = createMockIdentity();
      let stateChangeCalled = false;
      const config: KillSwitchConfig = {
        channel: "polling",
        onStateChange: (state) => {
          stateChangeCalled = true;
          expect(state).toBe("TERMINATED");
        },
      };

      const handler = createKillSwitch(identity, config);
      const command = createKillSwitchCommand("TERMINATE", {
        reason: "Emergency shutdown",
        issuedBy: "admin@test.com",
        instanceId: TEST_INSTANCE_ID,
      });

      const result = handler.processCommand(command);

      expect(result).toBe(true);
      expect(handler.state).toBe("TERMINATED");
      expect(handler.shouldContinue()).toBe(false);
      expect(stateChangeCalled).toBe(true);
    });

    it("should process PAUSE command", () => {
      const identity = createMockIdentity();
      const config: KillSwitchConfig = { channel: "polling" };

      const handler = createKillSwitch(identity, config);
      const command = createKillSwitchCommand("PAUSE", {
        reason: "Temporary pause for review",
        issuedBy: "admin@test.com",
      });

      handler.processCommand(command);

      expect(handler.state).toBe("PAUSED");
      expect(handler.shouldContinue()).toBe(false);
    });

    it("should process RESUME command", () => {
      const identity = createMockIdentity();
      const config: KillSwitchConfig = { channel: "polling" };

      const handler = createKillSwitch(identity, config);

      // First pause
      handler.processCommand(
        createKillSwitchCommand("PAUSE", {
          reason: "Pause",
          issuedBy: "admin@test.com",
        })
      );
      expect(handler.state).toBe("PAUSED");

      // Then resume
      handler.processCommand(
        createKillSwitchCommand("RESUME", {
          reason: "Resume operations",
          issuedBy: "admin@test.com",
        })
      );
      expect(handler.state).toBe("ACTIVE");
      expect(handler.shouldContinue()).toBe(true);
    });

    it("should not allow RESUME from TERMINATED state", () => {
      const identity = createMockIdentity();
      const config: KillSwitchConfig = { channel: "polling" };

      const handler = createKillSwitch(identity, config);

      // Terminate
      handler.processCommand(
        createKillSwitchCommand("TERMINATE", {
          reason: "Terminated",
          issuedBy: "admin@test.com",
        })
      );

      // Try to resume
      handler.processCommand(
        createKillSwitchCommand("RESUME", {
          reason: "Trying to resume",
          issuedBy: "admin@test.com",
        })
      );

      expect(handler.state).toBe("TERMINATED"); // Should stay terminated
    });

    it("should reject duplicate commands (replay protection)", () => {
      const identity = createMockIdentity();
      const config: KillSwitchConfig = { channel: "polling" };

      const handler = createKillSwitch(identity, config);
      const command = createKillSwitchCommand("PAUSE", {
        reason: "Pause",
        issuedBy: "admin@test.com",
      });

      const firstResult = handler.processCommand(command);
      const secondResult = handler.processCommand(command);

      expect(firstResult).toBe(true);
      expect(secondResult).toBe(false);
    });

    it("should only apply commands targeting this instance", () => {
      const identity = createMockIdentity({ instance_id: TEST_INSTANCE_ID });
      const config: KillSwitchConfig = { channel: "polling" };

      const handler = createKillSwitch(identity, config);

      // Command targeting different instance (valid UUID but different)
      const command = createKillSwitchCommand("TERMINATE", {
        reason: "Terminate other",
        issuedBy: "admin@test.com",
        instanceId: OTHER_INSTANCE_ID,
      });

      const result = handler.processCommand(command);

      expect(result).toBe(false);
      expect(handler.state).toBe("ACTIVE");
    });

    it("should apply commands targeting this asset", () => {
      const identity = createMockIdentity({ asset_id: TEST_ASSET_ID });
      const config: KillSwitchConfig = { channel: "polling" };

      const handler = createKillSwitch(identity, config);

      const command = createKillSwitchCommand("TERMINATE", {
        reason: "Terminate by asset",
        issuedBy: "admin@test.com",
        assetId: TEST_ASSET_ID,
      });

      const result = handler.processCommand(command);

      expect(result).toBe(true);
      expect(handler.state).toBe("TERMINATED");
    });

    it("should reject commands without valid signature", () => {
      const identity = createMockIdentity();
      const config: KillSwitchConfig = { channel: "polling" };

      const handler = createKillSwitch(identity, config);

      const command: KillSwitchCommand = {
        command_id: "33333333-3333-3333-3333-333333333333",
        type: "TERMINATE",
        signature: "", // Empty signature
        timestamp: new Date().toISOString(),
        reason: "Test",
        issued_by: "admin@test.com",
      };

      const result = handler.processCommand(command);

      expect(result).toBe(false);
      expect(handler.state).toBe("ACTIVE");
    });

    it("should store last command", () => {
      const identity = createMockIdentity();
      const config: KillSwitchConfig = { channel: "polling" };

      const handler = createKillSwitch(identity, config);

      expect(handler.getLastCommand()).toBeUndefined();

      const command = createKillSwitchCommand("PAUSE", {
        reason: "Pause for review",
        issuedBy: "admin@test.com",
      });

      handler.processCommand(command);

      expect(handler.getLastCommand()).toBeDefined();
      expect(handler.getLastCommand()?.reason).toBe("Pause for review");
    });

    it("should support custom verification", () => {
      const identity = createMockIdentity();
      const config: KillSwitchConfig = {
        channel: "polling",
        verifyCommand: (cmd) => {
          // Only accept commands from specific issuer
          return cmd.issued_by === "trusted@admin.com";
        },
      };

      const handler = createKillSwitch(identity, config);

      // Untrusted command
      const untrustedCmd = createKillSwitchCommand("TERMINATE", {
        reason: "Untrusted",
        issuedBy: "hacker@evil.com",
      });

      expect(handler.processCommand(untrustedCmd)).toBe(false);

      // Trusted command
      const trustedCmd = createKillSwitchCommand("TERMINATE", {
        reason: "Trusted",
        issuedBy: "trusted@admin.com",
      });

      expect(handler.processCommand(trustedCmd)).toBe(true);
      expect(handler.state).toBe("TERMINATED");
    });
  });

  describe("createKillSwitchCommand", () => {
    it("should create valid command", () => {
      const command = createKillSwitchCommand("TERMINATE", {
        reason: "Test reason",
        issuedBy: "test@test.com",
      });

      expect(command.command_id).toBeDefined();
      expect(command.type).toBe("TERMINATE");
      expect(command.reason).toBe("Test reason");
      expect(command.issued_by).toBe("test@test.com");
      expect(command.timestamp).toBeDefined();
      expect(command.signature).toBeDefined();
    });

    it("should include optional targeting fields", () => {
      const command = createKillSwitchCommand("PAUSE", {
        reason: "Targeted pause",
        issuedBy: "admin@test.com",
        instanceId: TEST_INSTANCE_ID,
        assetId: TEST_ASSET_ID,
        organization: "org-123",
      });

      expect(command.instance_id).toBe(TEST_INSTANCE_ID);
      expect(command.asset_id).toBe(TEST_ASSET_ID);
      expect(command.organization).toBe("org-123");
    });
  });
});
