import { describe, it, expect, beforeEach } from "vitest";
import { CommandExecutor, type KillSwitchState } from "../../src/kill-switch/commands.js";
import { createKillSwitchCommand } from "../../src/kill-switch.js";
import type { RuntimeIdentity } from "@aigrc/core";

describe("Kill Switch Commands", () => {
  let executor: CommandExecutor;
  const mockIdentity: RuntimeIdentity = {
    instance_id: "11111111-1111-1111-1111-111111111111",
    asset_id: "aigrc-2024-test1234",
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
      root_instance_id: "11111111-1111-1111-1111-111111111111",
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
  };

  beforeEach(() => {
    executor = new CommandExecutor();
  });

  describe("State Management", () => {
    it("should start in ACTIVE state", () => {
      expect(executor.getState()).toBe("ACTIVE");
      expect(executor.shouldContinue()).toBe(true);
    });

    it("should support custom initial state", () => {
      const pausedExecutor = new CommandExecutor({ initialState: "PAUSED" });
      expect(pausedExecutor.getState()).toBe("PAUSED");
      expect(pausedExecutor.shouldContinue()).toBe(false);
    });
  });

  describe("TERMINATE Command (AIG-71)", () => {
    it("should terminate agent", async () => {
      const command = createKillSwitchCommand("TERMINATE", {
        reason: "Emergency shutdown",
        issuedBy: "admin@test.com",
      });

      const result = await executor.executeCommand(command);

      expect(result.success).toBe(true);
      expect(result.previousState).toBe("ACTIVE");
      expect(result.newState).toBe("TERMINATED");
      expect(executor.getState()).toBe("TERMINATED");
      expect(executor.shouldContinue()).toBe(false);
      expect(executor.isTerminated()).toBe(true);
    });

    it("should call termination callback", async () => {
      let callbackCalled = false;
      const command = createKillSwitchCommand("TERMINATE", {
        reason: "Test",
        issuedBy: "admin@test.com",
      });

      const executorWithCallback = new CommandExecutor({
        onBeforeTerminate: async () => {
          callbackCalled = true;
        },
      });

      await executorWithCallback.executeCommand(command);

      expect(callbackCalled).toBe(true);
    });

    it("should be irreversible", async () => {
      await executor.executeCommand(
        createKillSwitchCommand("TERMINATE", {
          reason: "Terminate",
          issuedBy: "admin@test.com",
        })
      );

      const resumeResult = await executor.executeCommand(
        createKillSwitchCommand("RESUME", {
          reason: "Try to resume",
          issuedBy: "admin@test.com",
        })
      );

      expect(executor.getState()).toBe("TERMINATED");
      expect(resumeResult.newState).toBe("TERMINATED");
    });
  });

  describe("PAUSE Command (AIG-72)", () => {
    it("should pause agent", async () => {
      const command = createKillSwitchCommand("PAUSE", {
        reason: "Temporary pause",
        issuedBy: "admin@test.com",
      });

      const result = await executor.executeCommand(command);

      expect(result.success).toBe(true);
      expect(result.previousState).toBe("ACTIVE");
      expect(result.newState).toBe("PAUSED");
      expect(executor.getState()).toBe("PAUSED");
      expect(executor.shouldContinue()).toBe(false);
      expect(executor.isPaused()).toBe(true);
    });

    it("should not pause terminated agent", async () => {
      await executor.executeCommand(
        createKillSwitchCommand("TERMINATE", {
          reason: "Terminate",
          issuedBy: "admin@test.com",
        })
      );

      const pauseResult = await executor.executeCommand(
        createKillSwitchCommand("PAUSE", {
          reason: "Try to pause",
          issuedBy: "admin@test.com",
        })
      );

      expect(pauseResult.newState).toBe("TERMINATED");
    });
  });

  describe("RESUME Command (AIG-73)", () => {
    it("should resume paused agent", async () => {
      await executor.executeCommand(
        createKillSwitchCommand("PAUSE", {
          reason: "Pause",
          issuedBy: "admin@test.com",
        })
      );

      const resumeResult = await executor.executeCommand(
        createKillSwitchCommand("RESUME", {
          reason: "Resume",
          issuedBy: "admin@test.com",
        })
      );

      expect(resumeResult.success).toBe(true);
      expect(resumeResult.previousState).toBe("PAUSED");
      expect(resumeResult.newState).toBe("ACTIVE");
      expect(executor.getState()).toBe("ACTIVE");
      expect(executor.shouldContinue()).toBe(true);
    });

    it("should not resume terminated agent", async () => {
      await executor.executeCommand(
        createKillSwitchCommand("TERMINATE", {
          reason: "Terminate",
          issuedBy: "admin@test.com",
        })
      );

      const resumeResult = await executor.executeCommand(
        createKillSwitchCommand("RESUME", {
          reason: "Try to resume",
          issuedBy: "admin@test.com",
        })
      );

      expect(resumeResult.newState).toBe("TERMINATED");
    });

    it("should respect allowResume config", async () => {
      const noResumeExecutor = new CommandExecutor({ allowResume: false });

      await noResumeExecutor.executeCommand(
        createKillSwitchCommand("PAUSE", {
          reason: "Pause",
          issuedBy: "admin@test.com",
        })
      );

      const resumeResult = await noResumeExecutor.executeCommand(
        createKillSwitchCommand("RESUME", {
          reason: "Try to resume",
          issuedBy: "admin@test.com",
        })
      );

      expect(noResumeExecutor.getState()).toBe("PAUSED");
      expect(resumeResult.newState).toBe("PAUSED");
    });
  });

  describe("State Change Callbacks", () => {
    it("should call state change callback", async () => {
      let callbackInvoked = false;
      let oldState: KillSwitchState | undefined;
      let newState: KillSwitchState | undefined;

      const executorWithCallback = new CommandExecutor({
        onStateChange: (old, newS) => {
          callbackInvoked = true;
          oldState = old;
          newState = newS;
        },
      });

      await executorWithCallback.executeCommand(
        createKillSwitchCommand("PAUSE", {
          reason: "Test",
          issuedBy: "admin@test.com",
        })
      );

      expect(callbackInvoked).toBe(true);
      expect(oldState).toBe("ACTIVE");
      expect(newState).toBe("PAUSED");
    });

    it("should not call callback if state unchanged", async () => {
      let callbackCount = 0;

      const executorWithCallback = new CommandExecutor({
        initialState: "PAUSED",
        onStateChange: () => {
          callbackCount++;
        },
      });

      await executorWithCallback.executeCommand(
        createKillSwitchCommand("PAUSE", {
          reason: "Pause again",
          issuedBy: "admin@test.com",
        })
      );

      expect(callbackCount).toBe(0);
    });
  });

  describe("State History", () => {
    it("should track state history", async () => {
      await executor.executeCommand(
        createKillSwitchCommand("PAUSE", {
          reason: "Pause",
          issuedBy: "admin@test.com",
        })
      );

      await executor.executeCommand(
        createKillSwitchCommand("RESUME", {
          reason: "Resume",
          issuedBy: "admin@test.com",
        })
      );

      await executor.executeCommand(
        createKillSwitchCommand("TERMINATE", {
          reason: "Terminate",
          issuedBy: "admin@test.com",
        })
      );

      const history = executor.getStateHistory();

      expect(history).toHaveLength(3);
      expect(history[0].state).toBe("PAUSED");
      expect(history[1].state).toBe("ACTIVE");
      expect(history[2].state).toBe("TERMINATED");
    });

    it("should limit history size", async () => {
      for (let i = 0; i < 150; i++) {
        const cmd =
          i % 2 === 0
            ? createKillSwitchCommand("PAUSE", { reason: "P", issuedBy: "a" })
            : createKillSwitchCommand("RESUME", { reason: "R", issuedBy: "a" });
        await executor.executeCommand(cmd);
      }

      const history = executor.getStateHistory();
      expect(history.length).toBeLessThanOrEqual(100);
    });
  });

  describe("Command Applies", () => {
    it("should check instance targeting", () => {
      const command = createKillSwitchCommand("TERMINATE", {
        reason: "Test",
        issuedBy: "admin",
        instanceId: mockIdentity.instance_id,
      });

      expect(CommandExecutor.commandApplies(command, mockIdentity)).toBe(true);
    });

    it("should reject non-matching instance", () => {
      const command = createKillSwitchCommand("TERMINATE", {
        reason: "Test",
        issuedBy: "admin",
        instanceId: "99999999-9999-9999-9999-999999999999",
      });

      expect(CommandExecutor.commandApplies(command, mockIdentity)).toBe(false);
    });

    it("should check asset targeting", () => {
      const command = createKillSwitchCommand("TERMINATE", {
        reason: "Test",
        issuedBy: "admin",
        assetId: mockIdentity.asset_id,
      });

      expect(CommandExecutor.commandApplies(command, mockIdentity)).toBe(true);
    });

    it("should accept global commands", () => {
      const command = createKillSwitchCommand("TERMINATE", {
        reason: "Global kill",
        issuedBy: "admin",
      });

      expect(CommandExecutor.commandApplies(command, mockIdentity)).toBe(true);
    });
  });
});
