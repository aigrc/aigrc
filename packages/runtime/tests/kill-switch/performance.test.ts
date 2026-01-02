import { describe, it, expect } from "vitest";
import { createKillSwitch, createKillSwitchCommand } from "../../src/kill-switch.js";
import { generateKeyPair, signCommand } from "../../src/kill-switch/signature.js";
import type { RuntimeIdentity } from "@aigrc/core";
import * as path from "path";
import * as os from "os";

describe("Kill Switch Performance (AIG-77)", () => {
  const mockIdentity: RuntimeIdentity = {
    instance_id: "11111111-1111-1111-1111-111111111111",
    asset_id: "aigrc-2024-test1234",
    asset_name: "Performance Test Agent",
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

  describe("<60s Kill Switch SLA", () => {
    it("should process TERMINATE command in <60s with signature verification", async () => {
      const keys = generateKeyPair("Ed25519");

      const killSwitch = createKillSwitch(mockIdentity, {
        channel: "file",
        filePath: path.join(os.tmpdir(), `kill-switch-perf-${Date.now()}.json`),
        trustedKeys: [
          {
            algorithm: "Ed25519",
            publicKey: keys.publicKey,
            keyId: "perf-test",
          },
        ],
        requireSignature: true,
      });

      const command = createKillSwitchCommand("TERMINATE", {
        reason: "Performance test",
        issuedBy: "admin@test.com",
      });

      command.signature = signCommand(command, keys.privateKey, "Ed25519", "perf-test");

      const startTime = Date.now();

      const result = await killSwitch.processCommand(command);

      const elapsed = Date.now() - startTime;

      expect(result).toBe(true);
      expect(killSwitch.state).toBe("TERMINATED");
      expect(elapsed).toBeLessThan(60000); // <60s
      expect(elapsed).toBeLessThan(1000); // Should actually be <1s for local processing

      console.log(`[Performance] Command processed in ${elapsed}ms (SLA: <60s)`);
    });

    it("should process PAUSE command in <100ms", async () => {
      const killSwitch = createKillSwitch(mockIdentity, {
        channel: "file",
        filePath: path.join(os.tmpdir(), `kill-switch-perf-pause-${Date.now()}.json`),
        requireSignature: false, // Skip signature for speed test
      });

      const command = createKillSwitchCommand("PAUSE", {
        reason: "Fast pause test",
        issuedBy: "admin@test.com",
      });

      const startTime = Date.now();

      const result = await killSwitch.processCommand(command);

      const elapsed = Date.now() - startTime;

      expect(result).toBe(true);
      expect(elapsed).toBeLessThan(100);

      console.log(`[Performance] PAUSE processed in ${elapsed}ms`);
    });

    it("should handle burst of commands efficiently", async () => {
      const killSwitch = createKillSwitch(mockIdentity, {
        channel: "file",
        filePath: path.join(os.tmpdir(), `kill-switch-perf-burst-${Date.now()}.json`),
        requireSignature: false,
      });

      const commands = [];
      for (let i = 0; i < 10; i++) {
        commands.push(
          createKillSwitchCommand(i % 2 === 0 ? "PAUSE" : "RESUME", {
            reason: `Burst command ${i}`,
            issuedBy: "admin@test.com",
          })
        );
      }

      const startTime = Date.now();

      for (const cmd of commands) {
        await killSwitch.processCommand(cmd);
      }

      const elapsed = Date.now() - startTime;
      const avgTime = elapsed / commands.length;

      expect(elapsed).toBeLessThan(1000); // 10 commands in <1s
      expect(avgTime).toBeLessThan(100); // <100ms per command

      console.log(`[Performance] ${commands.length} commands in ${elapsed}ms (avg: ${avgTime}ms)`);
    });
  });

  describe("Signature Verification Performance", () => {
    it("should verify Ed25519 signatures quickly", async () => {
      const keys = generateKeyPair("Ed25519");

      const killSwitch = createKillSwitch(mockIdentity, {
        channel: "file",
        filePath: path.join(os.tmpdir(), `kill-switch-perf-ed25519-${Date.now()}.json`),
        trustedKeys: [
          {
            algorithm: "Ed25519",
            publicKey: keys.publicKey,
            keyId: "ed25519-perf",
          },
        ],
      });

      const command = createKillSwitchCommand("TERMINATE", {
        reason: "Ed25519 perf test",
        issuedBy: "admin@test.com",
      });

      command.signature = signCommand(command, keys.privateKey, "Ed25519", "ed25519-perf");

      const startTime = Date.now();

      const result = await killSwitch.processCommand(command);

      const elapsed = Date.now() - startTime;

      expect(result).toBe(true);
      expect(elapsed).toBeLessThan(100);

      console.log(`[Performance] Ed25519 verification in ${elapsed}ms`);
    });

    it("should verify RSA signatures within acceptable time", async () => {
      const keys = generateKeyPair("RSA-SHA256");

      const killSwitch = createKillSwitch(mockIdentity, {
        channel: "file",
        filePath: path.join(os.tmpdir(), `kill-switch-perf-rsa-${Date.now()}.json`),
        trustedKeys: [
          {
            algorithm: "RSA-SHA256",
            publicKey: keys.publicKey,
            keyId: "rsa-perf",
          },
        ],
      });

      const command = createKillSwitchCommand("TERMINATE", {
        reason: "RSA perf test",
        issuedBy: "admin@test.com",
      });

      command.signature = signCommand(command, keys.privateKey, "RSA-SHA256", "rsa-perf");

      const startTime = Date.now();

      const result = await killSwitch.processCommand(command);

      const elapsed = Date.now() - startTime;

      expect(result).toBe(true);
      expect(elapsed).toBeLessThan(200); // RSA is slower but still fast

      console.log(`[Performance] RSA verification in ${elapsed}ms`);
    });
  });

  describe("Cascading Termination Performance", () => {
    it("should cascade to multiple children efficiently", async () => {
      const childIdentity: RuntimeIdentity = {
        ...mockIdentity,
        capabilities_manifest: {
          ...mockIdentity.capabilities_manifest,
          may_spawn_children: true,
          max_child_depth: 2,
        },
      };

      const killSwitch = createKillSwitch(childIdentity, {
        channel: "file",
        filePath: path.join(os.tmpdir(), `kill-switch-perf-cascade-${Date.now()}.json`),
        requireSignature: false,
      });

      // Register 10 children
      for (let i = 0; i < 10; i++) {
        killSwitch.registerChild({
          instanceId: `child-${i}-${Date.now()}`,
          assetId: "aigrc-2024-child",
          generationDepth: 1,
          spawnedAt: new Date(),
          terminate: async () => {
            // Simulate child termination delay
            await new Promise((resolve) => setTimeout(resolve, 10));
          },
        });
      }

      const command = createKillSwitchCommand("TERMINATE", {
        reason: "Cascade perf test",
        issuedBy: "admin@test.com",
      });

      const startTime = Date.now();

      const result = await killSwitch.processCommand(command);

      const elapsed = Date.now() - startTime;

      expect(result).toBe(true);
      expect(elapsed).toBeLessThan(5000); // Should handle 10 children in <5s

      console.log(`[Performance] Cascaded to 10 children in ${elapsed}ms`);
    });
  });

  describe("Replay Prevention Performance", () => {
    it("should handle replay checks efficiently", async () => {
      const killSwitch = createKillSwitch(mockIdentity, {
        channel: "file",
        filePath: path.join(os.tmpdir(), `kill-switch-perf-replay-${Date.now()}.json`),
        requireSignature: false,
        replayPrevention: {
          maxNonceCache: 10000,
        },
      });

      // Pre-populate with many commands
      for (let i = 0; i < 100; i++) {
        const cmd = createKillSwitchCommand("PAUSE", {
          reason: `Preload ${i}`,
          issuedBy: "admin",
        });
        await killSwitch.processCommand(cmd);
      }

      // Now test replay check performance
      const newCommand = createKillSwitchCommand("RESUME", {
        reason: "Check after many nonces",
        issuedBy: "admin",
      });

      const startTime = Date.now();

      const result = await killSwitch.processCommand(newCommand);

      const elapsed = Date.now() - startTime;

      expect(result).toBe(true);
      expect(elapsed).toBeLessThan(50); // Should be <50ms even with many nonces

      console.log(`[Performance] Replay check with 100 nonces in ${elapsed}ms`);
    });
  });

  describe("Memory Usage", () => {
    it("should not leak memory with many commands", async () => {
      const killSwitch = createKillSwitch(mockIdentity, {
        channel: "file",
        filePath: path.join(os.tmpdir(), `kill-switch-perf-memory-${Date.now()}.json`),
        requireSignature: false,
      });

      const initialMemory = process.memoryUsage().heapUsed;

      // Process many commands
      for (let i = 0; i < 500; i++) {
        const cmd = createKillSwitchCommand("PAUSE", {
          reason: `Memory test ${i}`,
          issuedBy: "admin",
        });
        await killSwitch.processCommand(cmd);
      }

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryGrowth = (finalMemory - initialMemory) / 1024 / 1024; // MB

      // Memory growth should be reasonable (<10MB for 500 commands)
      expect(memoryGrowth).toBeLessThan(10);

      console.log(`[Performance] Memory growth for 500 commands: ${memoryGrowth.toFixed(2)} MB`);
    });
  });
});
