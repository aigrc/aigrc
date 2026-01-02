import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  createTelemetryEmitter,
  createNoopTelemetryEmitter,
  createConsoleTelemetryEmitter,
  AIGOS_CONVENTIONS,
  type IdentityEvent,
  type DecisionEvent,
  type ViolationEvent,
  type BudgetEvent,
  type TerminateEvent,
  type SpawnEvent,
  type ITelemetryEmitter,
} from "../src/telemetry.js";

describe("Telemetry Emitter (SPEC-RT-004)", () => {
  describe("createTelemetryEmitter", () => {
    let emitter: ITelemetryEmitter;
    let capturedEvents: Array<{ spanName: string; attributes: Record<string, unknown> }>;

    beforeEach(() => {
      capturedEvents = [];
      emitter = createTelemetryEmitter({
        serviceName: "test-agent",
        onEvent: (spanName, attributes) => {
          capturedEvents.push({ spanName, attributes });
        },
      });
    });

    describe("emitIdentity", () => {
      it("should emit identity event with correct span name", () => {
        const event: IdentityEvent = {
          instanceId: "abc-123",
          assetId: "agent-001",
          riskLevel: "limited",
          mode: "NORMAL",
          depth: 0,
        };

        emitter.emitIdentity(event);

        expect(capturedEvents).toHaveLength(1);
        expect(capturedEvents[0].spanName).toBe(AIGOS_CONVENTIONS.SPAN_IDENTITY);
      });

      it("should include all identity attributes", () => {
        const event: IdentityEvent = {
          instanceId: "abc-123",
          assetId: "agent-001",
          riskLevel: "limited",
          mode: "NORMAL",
          depth: 0,
          parentId: "parent-456",
          goldenHash: "sha256:abc123",
          capabilities: {
            tools: ["web_search", "database_read"],
            domains: ["*.example.com"],
          },
        };

        emitter.emitIdentity(event);

        const attrs = capturedEvents[0].attributes;
        expect(attrs[AIGOS_CONVENTIONS.INSTANCE_ID]).toBe("abc-123");
        expect(attrs[AIGOS_CONVENTIONS.ASSET_ID]).toBe("agent-001");
        expect(attrs[AIGOS_CONVENTIONS.RISK_LEVEL]).toBe("limited");
        expect(attrs[AIGOS_CONVENTIONS.MODE]).toBe("NORMAL");
        expect(attrs[AIGOS_CONVENTIONS.DEPTH]).toBe(0);
        expect(attrs[AIGOS_CONVENTIONS.PARENT_ID]).toBe("parent-456");
        expect(attrs[AIGOS_CONVENTIONS.GOLDEN_HASH]).toBe("sha256:abc123");
      });
    });

    describe("emitDecision", () => {
      it("should emit decision event with ALLOW", () => {
        const event: DecisionEvent = {
          instanceId: "abc-123",
          action: "read_file",
          resource: "/etc/passwd",
          decision: "ALLOW",
          reason: "Policy allows file read",
          checkChain: ["kill_switch", "capability", "budget"],
          latencyMs: 1.5,
        };

        emitter.emitDecision(event);

        expect(capturedEvents).toHaveLength(1);
        expect(capturedEvents[0].spanName).toBe(AIGOS_CONVENTIONS.SPAN_DECISION);

        const attrs = capturedEvents[0].attributes;
        expect(attrs[AIGOS_CONVENTIONS.ACTION]).toBe("read_file");
        expect(attrs[AIGOS_CONVENTIONS.RESOURCE]).toBe("/etc/passwd");
        expect(attrs[AIGOS_CONVENTIONS.DECISION]).toBe("ALLOW");
        expect(attrs[AIGOS_CONVENTIONS.LATENCY_MS]).toBe(1.5);
      });

      it("should emit decision event with DENY", () => {
        const event: DecisionEvent = {
          instanceId: "abc-123",
          action: "shell_exec",
          resource: "rm -rf /",
          decision: "DENY",
          reason: "Tool not in capabilities",
          checkChain: ["kill_switch", "capability"],
          latencyMs: 0.8,
          matchedRule: "deny_shell",
        };

        emitter.emitDecision(event);

        const attrs = capturedEvents[0].attributes;
        expect(attrs[AIGOS_CONVENTIONS.DECISION]).toBe("DENY");
        expect(attrs["aigos.matched_rule"]).toBe("deny_shell");
      });
    });

    describe("emitViolation", () => {
      it("should emit violation event", () => {
        const event: ViolationEvent = {
          instanceId: "abc-123",
          type: "POLICY_VIOLATION",
          severity: "HIGH",
          action: "unauthorized_access",
          resource: "/admin/secrets",
          rule: "admin_access_denied",
          details: "Attempted to access admin endpoint without permission",
          timestamp: new Date().toISOString(),
        };

        emitter.emitViolation(event);

        expect(capturedEvents).toHaveLength(1);
        expect(capturedEvents[0].spanName).toBe(AIGOS_CONVENTIONS.SPAN_VIOLATION);

        const attrs = capturedEvents[0].attributes;
        expect(attrs[AIGOS_CONVENTIONS.VIOLATION_TYPE]).toBe("POLICY_VIOLATION");
        expect(attrs[AIGOS_CONVENTIONS.VIOLATION_SEVERITY]).toBe("HIGH");
        expect(attrs[AIGOS_CONVENTIONS.VIOLATION_RULE]).toBe("admin_access_denied");
      });

      it("should emit capability escalation violation", () => {
        const event: ViolationEvent = {
          instanceId: "abc-123",
          type: "CAPABILITY_ESCALATION",
          severity: "CRITICAL",
          action: "spawn_child",
          details: "Child requested tool not in parent capabilities",
          timestamp: new Date().toISOString(),
        };

        emitter.emitViolation(event);

        const attrs = capturedEvents[0].attributes;
        expect(attrs[AIGOS_CONVENTIONS.VIOLATION_TYPE]).toBe("CAPABILITY_ESCALATION");
        expect(attrs[AIGOS_CONVENTIONS.VIOLATION_SEVERITY]).toBe("CRITICAL");
      });
    });

    describe("emitBudget", () => {
      it("should emit budget event", () => {
        const event: BudgetEvent = {
          instanceId: "abc-123",
          budgetType: "session",
          limit: 100,
          used: 45,
          remaining: 55,
          percentUsed: 45,
        };

        emitter.emitBudget(event);

        expect(capturedEvents).toHaveLength(1);
        expect(capturedEvents[0].spanName).toBe(AIGOS_CONVENTIONS.SPAN_BUDGET);

        const attrs = capturedEvents[0].attributes;
        expect(attrs[AIGOS_CONVENTIONS.BUDGET_TYPE]).toBe("session");
        expect(attrs[AIGOS_CONVENTIONS.BUDGET_LIMIT]).toBe(100);
        expect(attrs[AIGOS_CONVENTIONS.BUDGET_USED]).toBe(45);
        expect(attrs[AIGOS_CONVENTIONS.BUDGET_REMAINING]).toBe(55);
      });

      it("should emit budget threshold warning", () => {
        const event: BudgetEvent = {
          instanceId: "abc-123",
          budgetType: "daily",
          limit: 1000,
          used: 800,
          remaining: 200,
          percentUsed: 80,
          thresholdWarning: true,
          thresholdPercent: 75,
        };

        emitter.emitBudget(event);

        const attrs = capturedEvents[0].attributes;
        expect(attrs["aigos.budget.threshold_warning"]).toBe(true);
        expect(attrs["aigos.budget.threshold_percent"]).toBe(75);
      });
    });

    describe("emitTerminate", () => {
      it("should emit termination event for kill switch", () => {
        const event: TerminateEvent = {
          instanceId: "abc-123",
          reason: "KILL_SWITCH",
          source: "REMOTE",
          command: "TERMINATE",
          scope: "CASCADE",
          childrenTerminated: ["child-1", "child-2"],
        };

        emitter.emitTerminate(event);

        expect(capturedEvents).toHaveLength(1);
        expect(capturedEvents[0].spanName).toBe(AIGOS_CONVENTIONS.SPAN_TERMINATE);

        const attrs = capturedEvents[0].attributes;
        expect(attrs["aigos.terminate.reason"]).toBe("KILL_SWITCH");
        expect(attrs[AIGOS_CONVENTIONS.KILL_SWITCH_SOURCE]).toBe("REMOTE");
        expect(attrs[AIGOS_CONVENTIONS.KILL_SWITCH_COMMAND]).toBe("TERMINATE");
        expect(attrs[AIGOS_CONVENTIONS.KILL_SWITCH_SCOPE]).toBe("CASCADE");
      });

      it("should emit graceful termination", () => {
        const event: TerminateEvent = {
          instanceId: "abc-123",
          reason: "GRACEFUL",
          source: "SELF",
        };

        emitter.emitTerminate(event);

        const attrs = capturedEvents[0].attributes;
        expect(attrs["aigos.terminate.reason"]).toBe("GRACEFUL");
        expect(attrs[AIGOS_CONVENTIONS.KILL_SWITCH_SOURCE]).toBe("SELF");
      });
    });

    describe("emitSpawn", () => {
      it("should emit spawn event", () => {
        const event: SpawnEvent = {
          parentId: "parent-123",
          childId: "child-456",
          childAssetId: "child-agent",
          childRiskLevel: "limited",
          depth: 1,
          decayMode: "decay",
          capabilities: {
            tools: ["web_search"],
            domains: ["*.example.com"],
          },
        };

        emitter.emitSpawn(event);

        expect(capturedEvents).toHaveLength(1);
        expect(capturedEvents[0].spanName).toBe(AIGOS_CONVENTIONS.SPAN_SPAWN);

        const attrs = capturedEvents[0].attributes;
        expect(attrs[AIGOS_CONVENTIONS.PARENT_ID]).toBe("parent-123");
        expect(attrs["aigos.child_id"]).toBe("child-456");
        expect(attrs["aigos.child_asset_id"]).toBe("child-agent");
        expect(attrs["aigos.child_risk_level"]).toBe("limited");
        expect(attrs[AIGOS_CONVENTIONS.DEPTH]).toBe(1);
        expect(attrs["aigos.decay_mode"]).toBe("decay");
      });
    });

    describe("sampling", () => {
      it("should respect sample rate of 0 (no events)", () => {
        const sampledEmitter = createTelemetryEmitter({
          sampleRate: 0,
          onEvent: (spanName, attributes) => {
            capturedEvents.push({ spanName, attributes });
          },
        });

        sampledEmitter.emitIdentity({
          instanceId: "abc-123",
          assetId: "agent-001",
          riskLevel: "limited",
          mode: "NORMAL",
          depth: 0,
        });

        expect(capturedEvents).toHaveLength(0);
      });

      it("should always emit terminate events regardless of sampling", () => {
        const sampledEmitter = createTelemetryEmitter({
          sampleRate: 0,
          onEvent: (spanName, attributes) => {
            capturedEvents.push({ spanName, attributes });
          },
        });

        sampledEmitter.emitTerminate({
          instanceId: "abc-123",
          reason: "KILL_SWITCH",
          source: "REMOTE",
        });

        // Terminate events bypass sampling
        expect(capturedEvents).toHaveLength(1);
      });
    });

    describe("flush and shutdown", () => {
      it("should flush without errors", async () => {
        await expect(emitter.flush()).resolves.not.toThrow();
      });

      it("should shutdown without errors", async () => {
        await expect(emitter.shutdown()).resolves.not.toThrow();
      });
    });
  });

  describe("createNoopTelemetryEmitter", () => {
    it("should create emitter that does nothing", () => {
      const emitter = createNoopTelemetryEmitter();

      // All methods should work without errors
      expect(() =>
        emitter.emitIdentity({
          instanceId: "abc",
          assetId: "agent",
          riskLevel: "limited",
          mode: "NORMAL",
          depth: 0,
        })
      ).not.toThrow();

      expect(() =>
        emitter.emitDecision({
          instanceId: "abc",
          action: "read",
          resource: "file",
          decision: "ALLOW",
          reason: "ok",
          checkChain: [],
          latencyMs: 1,
        })
      ).not.toThrow();
    });

    it("should return context", () => {
      const emitter = createNoopTelemetryEmitter();
      const ctx = emitter.getContext();
      expect(ctx).toBeDefined();
    });
  });

  describe("createConsoleTelemetryEmitter", () => {
    it("should create emitter that logs to console", () => {
      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

      const emitter = createConsoleTelemetryEmitter();
      emitter.emitIdentity({
        instanceId: "abc-123",
        assetId: "agent-001",
        riskLevel: "limited",
        mode: "NORMAL",
        depth: 0,
      });

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  describe("AIGOS_CONVENTIONS", () => {
    it("should define all required span names", () => {
      expect(AIGOS_CONVENTIONS.SPAN_IDENTITY).toBe("aigos.governance.identity");
      expect(AIGOS_CONVENTIONS.SPAN_DECISION).toBe("aigos.governance.decision");
      expect(AIGOS_CONVENTIONS.SPAN_VIOLATION).toBe("aigos.governance.violation");
      expect(AIGOS_CONVENTIONS.SPAN_BUDGET).toBe("aigos.governance.budget");
      expect(AIGOS_CONVENTIONS.SPAN_TERMINATE).toBe("aigos.governance.terminate");
      expect(AIGOS_CONVENTIONS.SPAN_SPAWN).toBe("aigos.governance.spawn");
    });

    it("should define all required attribute names", () => {
      expect(AIGOS_CONVENTIONS.INSTANCE_ID).toBe("aigos.instance_id");
      expect(AIGOS_CONVENTIONS.ASSET_ID).toBe("aigos.asset_id");
      expect(AIGOS_CONVENTIONS.RISK_LEVEL).toBe("aigos.risk_level");
      expect(AIGOS_CONVENTIONS.MODE).toBe("aigos.mode");
      expect(AIGOS_CONVENTIONS.ACTION).toBe("aigos.action");
      expect(AIGOS_CONVENTIONS.RESOURCE).toBe("aigos.resource");
      expect(AIGOS_CONVENTIONS.DECISION).toBe("aigos.decision");
    });
  });
});
