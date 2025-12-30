import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  createTelemetryClient,
  createNoopTelemetryClient,
  createConsoleTelemetryClient,
  createAuditLogger,
  type TelemetryConfig,
  type TelemetryEvent,
} from "../src/telemetry";
import type { RuntimeIdentity, RiskLevel, OperatingMode } from "@aigrc/core";

// Valid UUIDs for testing
const TEST_INSTANCE_ID = "11111111-1111-1111-1111-111111111111";
const TEST_ASSET_ID = "aigrc-2024-a1b2c3d4";

// Helper to create a mock runtime identity with override support
function createMockIdentity(overrides: {
  risk_level?: RiskLevel;
  mode?: OperatingMode;
} = {}): RuntimeIdentity {
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
    risk_level: overrides.risk_level ?? "minimal",
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
    mode: overrides.mode ?? "NORMAL",
  };
}

describe("Telemetry", () => {
  describe("createTelemetryClient", () => {
    it("should create client when enabled", () => {
      const identity = createMockIdentity();
      const config: TelemetryConfig = { enabled: true };

      const client = createTelemetryClient(identity, config);

      expect(client).toBeDefined();
      expect(client.record).toBeInstanceOf(Function);
      expect(client.flush).toBeInstanceOf(Function);
      expect(client.stop).toBeInstanceOf(Function);
    });

    it("should record events when enabled", () => {
      const identity = createMockIdentity();
      const events: TelemetryEvent[] = [];
      const config: TelemetryConfig = {
        enabled: true,
        onEvent: (event) => events.push(event),
      };

      const client = createTelemetryClient(identity, config);
      client.record("action_allowed", { action: "read_file" });
      client.stop();

      expect(events).toHaveLength(1);
      expect(events[0].type).toBe("action_allowed");
      expect(events[0].instanceId).toBe(TEST_INSTANCE_ID);
      expect(events[0].data).toEqual({ action: "read_file" });
    });

    it("should not record events when disabled", () => {
      const identity = createMockIdentity();
      const events: TelemetryEvent[] = [];
      const config: TelemetryConfig = {
        enabled: false,
        onEvent: (event) => events.push(event),
      };

      const client = createTelemetryClient(identity, config);
      client.record("action_allowed", { action: "read_file" });

      expect(events).toHaveLength(0);
    });

    it("should apply sampling rate", () => {
      const identity = createMockIdentity();
      const events: TelemetryEvent[] = [];
      const config: TelemetryConfig = {
        enabled: true,
        sampleRate: 0.5,
        onEvent: (event) => events.push(event),
      };

      const client = createTelemetryClient(identity, config);

      // Record many events
      for (let i = 0; i < 100; i++) {
        client.record("action_allowed", { action: `action_${i}` });
      }
      client.stop();

      // Should have roughly half (with some variance)
      expect(events.length).toBeGreaterThan(20);
      expect(events.length).toBeLessThan(80);
    });

    it("should include identity context in events", () => {
      const identity = createMockIdentity({
        risk_level: "high",
        mode: "SANDBOX",
      });
      const events: TelemetryEvent[] = [];
      const config: TelemetryConfig = {
        enabled: true,
        onEvent: (event) => events.push(event),
      };

      const client = createTelemetryClient(identity, config);
      client.record("mode_changed", { newMode: "RESTRICTED" });
      client.stop();

      expect(events[0].riskLevel).toBe("high");
      expect(events[0].mode).toBe("SANDBOX");
      expect(events[0].assetId).toBe(TEST_ASSET_ID);
    });

    it("should flush events when batch size reached", async () => {
      const identity = createMockIdentity();
      const config: TelemetryConfig = {
        enabled: true,
        batchSize: 5,
        flushIntervalMs: 0, // Disable interval flush
      };

      const client = createTelemetryClient(identity, config);

      // Record enough to trigger flush
      for (let i = 0; i < 6; i++) {
        client.record("action_allowed", { action: `action_${i}` });
      }

      // Flush should have been triggered automatically
      await client.flush();
      client.stop();
    });
  });

  describe("createNoopTelemetryClient", () => {
    it("should create noop client", () => {
      const client = createNoopTelemetryClient();

      expect(() => client.record("action_allowed", {})).not.toThrow();
      expect(() => client.flush()).not.toThrow();
      expect(() => client.stop()).not.toThrow();
    });
  });

  describe("createConsoleTelemetryClient", () => {
    it("should create console client", () => {
      const identity = createMockIdentity();
      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

      const client = createConsoleTelemetryClient(identity);
      client.record("action_denied", { reason: "Policy violation" });
      client.stop();

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });
});

describe("Audit Logger", () => {
  describe("createAuditLogger", () => {
    it("should create logger with default max entries", () => {
      const logger = createAuditLogger();

      expect(logger).toBeDefined();
      expect(logger.getRecent()).toHaveLength(0);
    });

    it("should log entries with auto-generated id and timestamp", () => {
      const logger = createAuditLogger();

      logger.log({
        instanceId: "instance-123",
        assetId: "asset-456",
        action: "read_file",
        resource: "/path/to/file",
        decision: "allowed",
        reason: "Allowed by policy",
        riskLevel: "minimal",
        mode: "NORMAL",
      });

      const entries = logger.getRecent();
      expect(entries).toHaveLength(1);
      expect(entries[0].id).toMatch(/^audit-\d+$/);
      expect(entries[0].timestamp).toBeDefined();
      expect(entries[0].action).toBe("read_file");
    });

    it("should maintain order of entries", () => {
      const logger = createAuditLogger();

      logger.log({
        instanceId: "i1",
        assetId: "a1",
        action: "action1",
        resource: "r1",
        decision: "allowed",
        reason: "",
        riskLevel: "minimal",
        mode: "NORMAL",
      });

      logger.log({
        instanceId: "i2",
        assetId: "a2",
        action: "action2",
        resource: "r2",
        decision: "denied",
        reason: "",
        riskLevel: "minimal",
        mode: "NORMAL",
      });

      const entries = logger.getRecent();
      expect(entries).toHaveLength(2);
      expect(entries[0].action).toBe("action1");
      expect(entries[1].action).toBe("action2");
    });

    it("should respect limit in getRecent", () => {
      const logger = createAuditLogger();

      for (let i = 0; i < 10; i++) {
        logger.log({
          instanceId: "i",
          assetId: "a",
          action: `action${i}`,
          resource: "r",
          decision: "allowed",
          reason: "",
          riskLevel: "minimal",
          mode: "NORMAL",
        });
      }

      const limited = logger.getRecent(3);
      expect(limited).toHaveLength(3);
      // Should get the most recent
      expect(limited[0].action).toBe("action7");
      expect(limited[2].action).toBe("action9");
    });

    it("should trim entries when max exceeded", () => {
      const logger = createAuditLogger(5);

      for (let i = 0; i < 10; i++) {
        logger.log({
          instanceId: "i",
          assetId: "a",
          action: `action${i}`,
          resource: "r",
          decision: "allowed",
          reason: "",
          riskLevel: "minimal",
          mode: "NORMAL",
        });
      }

      const entries = logger.getRecent(100);
      expect(entries).toHaveLength(5);
      // Should have kept the most recent 5
      expect(entries[0].action).toBe("action5");
      expect(entries[4].action).toBe("action9");
    });

    it("should clear entries", () => {
      const logger = createAuditLogger();

      logger.log({
        instanceId: "i",
        assetId: "a",
        action: "action",
        resource: "r",
        decision: "allowed",
        reason: "",
        riskLevel: "minimal",
        mode: "NORMAL",
      });

      expect(logger.getRecent()).toHaveLength(1);

      logger.clear();

      expect(logger.getRecent()).toHaveLength(0);
    });

    it("should include optional context and matched rule", () => {
      const logger = createAuditLogger();

      logger.log({
        instanceId: "i",
        assetId: "a",
        action: "write_file",
        resource: "/sensitive/data",
        decision: "denied",
        reason: "Sensitive path denied",
        riskLevel: "high",
        mode: "SANDBOX",
        matchedRule: "deny-sensitive-paths",
        context: { userId: "user-123", sessionId: "session-456" },
      });

      const entries = logger.getRecent();
      expect(entries[0].matchedRule).toBe("deny-sensitive-paths");
      expect(entries[0].context).toEqual({
        userId: "user-123",
        sessionId: "session-456",
      });
    });
  });
});
