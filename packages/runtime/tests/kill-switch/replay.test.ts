import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  ReplayPreventionGuard,
  resetGlobalReplayGuard,
} from "../../src/kill-switch/replay.js";
import { createKillSwitchCommand } from "../../src/kill-switch.js";

describe("Kill Switch Replay Prevention (AIG-75)", () => {
  let guard: ReplayPreventionGuard;

  beforeEach(() => {
    guard = new ReplayPreventionGuard({
      maxCommandAgeSeconds: 300,
      maxNonceCache: 100,
    });
  });

  afterEach(() => {
    guard.stop();
    resetGlobalReplayGuard();
  });

  describe("Nonce Tracking", () => {
    it("should accept first command", () => {
      const command = createKillSwitchCommand("TERMINATE", {
        reason: "Test",
        issuedBy: "admin@test.com",
      });

      const result = guard.checkCommand(command);

      expect(result.valid).toBe(true);
      expect(result.isReplay).toBeUndefined();
    });

    it("should reject duplicate command IDs", () => {
      const command = createKillSwitchCommand("TERMINATE", {
        reason: "Test",
        issuedBy: "admin@test.com",
      });

      guard.checkCommand(command);
      guard.markProcessed(command);

      const replayResult = guard.checkCommand(command);

      expect(replayResult.valid).toBe(false);
      expect(replayResult.isReplay).toBe(true);
      expect(replayResult.error).toContain("Duplicate command ID");
    });

    it("should track processed commands", () => {
      const command = createKillSwitchCommand("TERMINATE", {
        reason: "Test",
        issuedBy: "admin@test.com",
      });

      expect(guard.hasProcessed(command.command_id)).toBe(false);

      guard.markProcessed(command);

      expect(guard.hasProcessed(command.command_id)).toBe(true);
    });

    it("should get nonce count", () => {
      expect(guard.getNonceCount()).toBe(0);

      const cmd1 = createKillSwitchCommand("TERMINATE", { reason: "1", issuedBy: "admin" });
      const cmd2 = createKillSwitchCommand("PAUSE", { reason: "2", issuedBy: "admin" });

      guard.markProcessed(cmd1);
      guard.markProcessed(cmd2);

      expect(guard.getNonceCount()).toBe(2);
    });
  });

  describe("Timestamp Validation", () => {
    it("should reject old commands", () => {
      const command = createKillSwitchCommand("TERMINATE", {
        reason: "Test",
        issuedBy: "admin@test.com",
      });

      // Set timestamp to 10 minutes ago (exceeds 5 minute default)
      const oldTimestamp = new Date(Date.now() - 10 * 60 * 1000);
      command.timestamp = oldTimestamp.toISOString();

      const result = guard.checkCommand(command);

      expect(result.valid).toBe(false);
      expect(result.isReplay).toBe(true);
      expect(result.error).toContain("too old");
    });

    it("should reject future timestamps", () => {
      const command = createKillSwitchCommand("TERMINATE", {
        reason: "Test",
        issuedBy: "admin@test.com",
      });

      // Set timestamp to future
      const futureTimestamp = new Date(Date.now() + 60 * 1000);
      command.timestamp = futureTimestamp.toISOString();

      const result = guard.checkCommand(command);

      expect(result.valid).toBe(false);
      expect(result.error).toContain("future");
    });

    it("should accept recent commands", () => {
      const command = createKillSwitchCommand("TERMINATE", {
        reason: "Test",
        issuedBy: "admin@test.com",
      });

      // Current timestamp (default)
      const result = guard.checkCommand(command);

      expect(result.valid).toBe(true);
    });
  });

  describe("Cache Management", () => {
    it("should enforce cache size limit", () => {
      const smallGuard = new ReplayPreventionGuard({
        maxNonceCache: 10,
      });

      // Add 20 commands
      for (let i = 0; i < 20; i++) {
        const cmd = createKillSwitchCommand("PAUSE", {
          reason: `Command ${i}`,
          issuedBy: "admin",
        });
        smallGuard.markProcessed(cmd);
      }

      // Should have pruned to stay under limit
      expect(smallGuard.getNonceCount()).toBeLessThanOrEqual(10);

      smallGuard.stop();
    });

    it("should clear all nonces", () => {
      const cmd1 = createKillSwitchCommand("TERMINATE", { reason: "1", issuedBy: "admin" });
      const cmd2 = createKillSwitchCommand("PAUSE", { reason: "2", issuedBy: "admin" });

      guard.markProcessed(cmd1);
      guard.markProcessed(cmd2);

      expect(guard.getNonceCount()).toBe(2);

      guard.clear();

      expect(guard.getNonceCount()).toBe(0);
    });
  });

  describe("Nonce Export/Import", () => {
    it("should export nonces", () => {
      const cmd1 = createKillSwitchCommand("TERMINATE", { reason: "1", issuedBy: "admin" });
      const cmd2 = createKillSwitchCommand("PAUSE", { reason: "2", issuedBy: "admin" });

      guard.markProcessed(cmd1);
      guard.markProcessed(cmd2);

      const exported = guard.exportNonces();

      expect(exported).toHaveLength(2);
      expect(exported[0].commandId).toBe(cmd1.command_id);
      expect(exported[1].commandId).toBe(cmd2.command_id);
    });

    it("should import nonces", () => {
      const nonces = [
        {
          commandId: "11111111-1111-1111-1111-111111111111",
          timestamp: new Date().toISOString(),
          commandType: "TERMINATE",
        },
        {
          commandId: "22222222-2222-2222-2222-222222222222",
          timestamp: new Date().toISOString(),
          commandType: "PAUSE",
        },
      ];

      guard.importNonces(nonces);

      expect(guard.getNonceCount()).toBe(2);
      expect(guard.hasProcessed("11111111-1111-1111-1111-111111111111")).toBe(true);
      expect(guard.hasProcessed("22222222-2222-2222-2222-222222222222")).toBe(true);
    });
  });

  describe("Performance", () => {
    it("should handle high volume of nonces", () => {
      const startTime = Date.now();
      const count = 1000;

      for (let i = 0; i < count; i++) {
        const cmd = createKillSwitchCommand("PAUSE", {
          reason: `Command ${i}`,
          issuedBy: "admin",
        });
        guard.checkCommand(cmd);
        guard.markProcessed(cmd);
      }

      const elapsed = Date.now() - startTime;

      // Should process 1000 commands in under 1 second
      expect(elapsed).toBeLessThan(1000);

      // Check a random command
      expect(guard.getNonceCount()).toBeGreaterThan(0);
    });
  });
});
