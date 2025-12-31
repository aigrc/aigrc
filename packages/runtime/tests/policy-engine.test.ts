import { describe, it, expect, beforeEach } from "vitest";
import {
  createPolicyEngine,
  createPolicyEngineFromIdentity,
  BudgetTracker,
  PatternMatcher,
  AigosPolicyViolation,
  AgentTerminatedException,
  AigosBudgetExceeded,
  type IPolicyEngine,
  type PermissionRequest,
} from "../src/policy-engine.js";
import type { RuntimeIdentity, CapabilitiesManifest } from "@aigrc/core";

// ─────────────────────────────────────────────────────────────────
// TEST FIXTURES
// ─────────────────────────────────────────────────────────────────

const TEST_ASSET_ID = "aigrc-2024-a1b2c3d4";
const TEST_INSTANCE_ID = "11111111-1111-1111-1111-111111111111";

function createTestCapabilities(
  overrides: Partial<CapabilitiesManifest> = {}
): CapabilitiesManifest {
  return {
    allowed_tools: ["web_search", "calculator", "database_read"],
    denied_tools: ["shell_exec", "file_write", "admin_commands"],
    allowed_domains: ["api.example.com", "*.trusted.com", "https://api.example.com*"],
    denied_domains: ["malicious.com", "*.gov"],
    max_cost_per_session: 10.0,
    max_cost_per_day: 100.0,
    max_tokens_per_call: 4096,
    may_spawn_children: true,
    max_child_depth: 2,
    capability_mode: "decay",
    ...overrides,
  };
}

function createTestIdentity(
  overrides: Partial<RuntimeIdentity> = {}
): RuntimeIdentity {
  return {
    instance_id: TEST_INSTANCE_ID,
    asset_id: TEST_ASSET_ID,
    asset_name: "Test Agent",
    asset_version: "1.0.0",
    golden_thread_hash:
      "sha256:abc123def456abc123def456abc123def456abc123def456abc123def456abc1",
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
    capabilities_manifest: createTestCapabilities(),
    created_at: "2024-01-01T00:00:00Z",
    verified: true,
    mode: "NORMAL",
    ...overrides,
  };
}

// ─────────────────────────────────────────────────────────────────
// PATTERN MATCHER TESTS
// ─────────────────────────────────────────────────────────────────

describe("PatternMatcher", () => {
  it("should match exact patterns", () => {
    const matcher = new PatternMatcher(["web_search", "calculator"]);
    expect(matcher.matches("web_search")).toBe(true);
    expect(matcher.matches("calculator")).toBe(true);
    expect(matcher.matches("unknown")).toBe(false);
  });

  it("should match wildcard patterns", () => {
    const matcher = new PatternMatcher(["db_*", "*_admin"]);
    expect(matcher.matches("db_read")).toBe(true);
    expect(matcher.matches("db_write")).toBe(true);
    expect(matcher.matches("super_admin")).toBe(true);
    expect(matcher.matches("admin_user")).toBe(false);
  });

  it("should match domain patterns", () => {
    const matcher = new PatternMatcher(["*.example.com", "api.trusted.com"]);
    expect(matcher.matches("api.example.com")).toBe(true);
    expect(matcher.matches("sub.example.com")).toBe(true);
    expect(matcher.matches("api.trusted.com")).toBe(true);
    expect(matcher.matches("other.trusted.com")).toBe(false);
  });

  it("should match regex patterns", () => {
    const matcher = new PatternMatcher(["^https://api\\.company\\.com/.*"]);
    expect(matcher.matches("https://api.company.com/v1/data")).toBe(true);
    expect(matcher.matches("https://api.company.com/")).toBe(true);
    expect(matcher.matches("https://api.other.com/")).toBe(false);
  });

  it("should return first matching pattern", () => {
    const matcher = new PatternMatcher(["first_*", "*_last", "middle"]);
    expect(matcher.getFirstMatch("first_test")).toBe("first_*");
    expect(matcher.getFirstMatch("test_last")).toBe("*_last");
    expect(matcher.getFirstMatch("middle")).toBe("middle");
    expect(matcher.getFirstMatch("unknown")).toBeNull();
  });

  it("should perform matching in under 0.1ms per pattern", () => {
    const patterns = Array.from({ length: 100 }, (_, i) => `pattern_${i}`);
    const matcher = new PatternMatcher(patterns);

    const iterations = 1000;
    const start = performance.now();

    for (let i = 0; i < iterations; i++) {
      matcher.matches(`pattern_${i % 100}`);
    }

    const elapsed = performance.now() - start;
    const perMatch = elapsed / iterations;

    // Should be well under 0.1ms per match
    expect(perMatch).toBeLessThan(0.1);
  });
});

// ─────────────────────────────────────────────────────────────────
// BUDGET TRACKER TESTS
// ─────────────────────────────────────────────────────────────────

describe("BudgetTracker", () => {
  let tracker: BudgetTracker;

  beforeEach(() => {
    tracker = new BudgetTracker(10.0, 100.0, 60);
  });

  it("should track session cost", () => {
    tracker.recordCost(5.0);
    expect(tracker.getStatus().sessionCost).toBe(5.0);

    tracker.recordCost(3.0);
    expect(tracker.getStatus().sessionCost).toBe(8.0);
  });

  it("should allow costs within budget", () => {
    const result = tracker.checkBudget(5.0);
    expect(result.allowed).toBe(true);
  });

  it("should deny costs exceeding session budget", () => {
    tracker.recordCost(8.0);
    const result = tracker.checkBudget(3.0);
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain("Session budget exceeded");
  });

  it("should track daily cost", () => {
    tracker.recordCost(50.0);
    expect(tracker.getStatus().dailyCost).toBe(50.0);
  });

  it("should deny costs exceeding daily budget", () => {
    // Use a tracker with higher session limit to test daily limit
    const highSessionTracker = new BudgetTracker(1000.0, 100.0, 60);
    highSessionTracker.recordCost(95.0);
    const result = highSessionTracker.checkBudget(10.0);
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain("Daily budget exceeded");
  });

  it("should track remaining budget", () => {
    tracker.recordCost(3.0);
    const status = tracker.getStatus();

    expect(status.sessionRemaining).toBe(7.0);
    expect(status.dailyRemaining).toBe(97.0);
  });

  it("should track rate limits", () => {
    for (let i = 0; i < 60; i++) {
      tracker.recordCall();
    }

    const result = tracker.checkRateLimit();
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain("Rate limit exceeded");
  });

  it("should reset budget", () => {
    tracker.recordCost(5.0);
    tracker.recordCall();
    tracker.reset();

    const status = tracker.getStatus();
    expect(status.sessionCost).toBe(0);
    expect(status.dailyCost).toBe(0);
    expect(status.callsThisMinute).toBe(0);
  });

  it("should handle null limits", () => {
    const unlimitedTracker = new BudgetTracker(null, null, null);

    // Should always allow
    unlimitedTracker.recordCost(1000000);
    const budgetResult = unlimitedTracker.checkBudget(1000000);
    expect(budgetResult.allowed).toBe(true);

    // Rate limit should also allow
    for (let i = 0; i < 1000; i++) {
      unlimitedTracker.recordCall();
    }
    const rateResult = unlimitedTracker.checkRateLimit();
    expect(rateResult.allowed).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────
// POLICY ENGINE TESTS
// ─────────────────────────────────────────────────────────────────

describe("PolicyEngine", () => {
  let engine: IPolicyEngine;

  beforeEach(() => {
    engine = createPolicyEngine({
      capabilities: createTestCapabilities(),
    });
  });

  describe("Permission Checks", () => {
    it("should allow actions in allowed_tools", async () => {
      const result = await engine.checkPermission({
        action: "web_search",
        resource: "https://api.example.com",
      });

      expect(result.allowed).toBe(true);
      expect(result.dryRun).toBe(false);
    });

    it("should deny actions not in allowed_tools", async () => {
      const result = await engine.checkPermission({
        action: "unknown_action",
        resource: "*",
      });

      expect(result.allowed).toBe(false);
      expect(result.deniedBy).toBe("capability");
      expect(result.reason).toContain("not in allowed_tools");
    });

    it("should deny actions in denied_tools", async () => {
      // First add shell_exec to allowed to test deny override
      const engineWithBoth = createPolicyEngine({
        capabilities: createTestCapabilities({
          allowed_tools: ["shell_exec", "web_search"],
        }),
      });

      const result = await engineWithBoth.checkPermission({
        action: "shell_exec",
        resource: "*",
      });

      expect(result.allowed).toBe(false);
      expect(result.deniedBy).toBe("capability");
      expect(result.reason).toContain("denied_tools");
    });

    it("should allow resources in allowed_domains", async () => {
      const result = await engine.checkPermission({
        action: "web_search",
        resource: "api.example.com",
      });

      expect(result.allowed).toBe(true);
    });

    it("should allow wildcard domain matches", async () => {
      const result = await engine.checkPermission({
        action: "web_search",
        resource: "sub.trusted.com",
      });

      expect(result.allowed).toBe(true);
    });

    it("should deny resources not in allowed_domains", async () => {
      const result = await engine.checkPermission({
        action: "web_search",
        resource: "https://unknown.com",
      });

      expect(result.allowed).toBe(false);
      expect(result.deniedBy).toBe("resource");
    });

    it("should deny resources in denied_domains", async () => {
      const result = await engine.checkPermission({
        action: "web_search",
        resource: "malicious.com",
      });

      expect(result.allowed).toBe(false);
      expect(result.deniedBy).toBe("resource");
      expect(result.reason).toContain("denied_domains");
    });

    it("should allow wildcard resource", async () => {
      const result = await engine.checkPermission({
        action: "calculator",
        resource: "*",
      });

      expect(result.allowed).toBe(true);
    });
  });

  describe("Budget Enforcement", () => {
    it("should allow actions within budget", async () => {
      const result = await engine.checkPermission({
        action: "web_search",
        resource: "api.example.com",
        estimatedCost: 5.0,
      });

      expect(result.allowed).toBe(true);
    });

    it("should deny actions exceeding session budget", async () => {
      engine.recordCost(9.0); // Near limit of 10.0

      const result = await engine.checkPermission({
        action: "web_search",
        resource: "api.example.com",
        estimatedCost: 2.0,
      });

      expect(result.allowed).toBe(false);
      expect(result.deniedBy).toBe("budget");
      expect(result.reason).toContain("Session budget exceeded");
    });

    it("should deny actions exceeding token limit", async () => {
      const result = await engine.checkPermission({
        action: "web_search",
        resource: "api.example.com",
        estimatedTokens: 10000, // Exceeds 4096 limit
      });

      expect(result.allowed).toBe(false);
      expect(result.deniedBy).toBe("budget");
      expect(result.reason).toContain("Token limit exceeded");
    });

    it("should track costs after recording", () => {
      engine.recordCost(3.0);
      engine.recordCost(2.0);

      const status = engine.getBudgetStatus();
      expect(status.sessionCost).toBe(5.0);
      expect(status.sessionRemaining).toBe(5.0);
    });

    it("should reset budget", () => {
      engine.recordCost(5.0);
      engine.resetBudget();

      const status = engine.getBudgetStatus();
      expect(status.sessionCost).toBe(0);
    });
  });

  describe("Kill Switch", () => {
    it("should deny all actions when kill switch is active", async () => {
      engine.setKillSwitchActive(true, "Emergency shutdown");

      const result = await engine.checkPermission({
        action: "web_search",
        resource: "api.example.com",
      });

      expect(result.allowed).toBe(false);
      expect(result.deniedBy).toBe("kill_switch");
      expect(result.reason).toContain("Emergency shutdown");
    });

    it("should allow actions after kill switch deactivation", async () => {
      engine.setKillSwitchActive(true);
      engine.setKillSwitchActive(false);

      const result = await engine.checkPermission({
        action: "web_search",
        resource: "api.example.com",
      });

      expect(result.allowed).toBe(true);
    });

    it("should report kill switch status", () => {
      expect(engine.isKillSwitchActive()).toBe(false);

      engine.setKillSwitchActive(true);
      expect(engine.isKillSwitchActive()).toBe(true);

      engine.setKillSwitchActive(false);
      expect(engine.isKillSwitchActive()).toBe(false);
    });
  });

  describe("Dry-Run Mode", () => {
    it("should allow denied actions in dry-run mode", async () => {
      engine.setDryRun(true);

      const result = await engine.checkPermission({
        action: "shell_exec", // Normally denied
        resource: "*",
      });

      expect(result.allowed).toBe(true); // Allowed in dry-run
      expect(result.dryRun).toBe(true);
      expect(result.reason).toContain("WOULD_DENY");
      expect(result.deniedBy).toBe("capability");
    });

    it("should report dry-run status", () => {
      expect(engine.isDryRun()).toBe(false);

      engine.setDryRun(true);
      expect(engine.isDryRun()).toBe(true);

      engine.setDryRun(false);
      expect(engine.isDryRun()).toBe(false);
    });

    it("should mark allowed actions with dry-run flag", async () => {
      engine.setDryRun(true);

      const result = await engine.checkPermission({
        action: "web_search",
        resource: "api.example.com",
      });

      expect(result.allowed).toBe(true);
      expect(result.dryRun).toBe(true);
    });
  });

  describe("Performance Requirements", () => {
    it("should complete permission check in under 2ms (P99)", async () => {
      const iterations = 1000;
      const times: number[] = [];

      for (let i = 0; i < iterations; i++) {
        const start = performance.now();
        await engine.checkPermission({
          action: "web_search",
          resource: "api.example.com",
          estimatedCost: 0.1,
          estimatedTokens: 100,
        });
        times.push(performance.now() - start);
      }

      // Sort for percentile calculation
      times.sort((a, b) => a - b);
      const p99Index = Math.floor(iterations * 0.99);
      const p99 = times[p99Index];

      expect(p99).toBeLessThan(2); // < 2ms P99
    });

    it("should complete sync permission check in under 1ms (P99)", () => {
      const iterations = 1000;
      const times: number[] = [];

      for (let i = 0; i < iterations; i++) {
        const start = performance.now();
        engine.checkPermissionSync({
          action: "web_search",
          resource: "api.example.com",
        });
        times.push(performance.now() - start);
      }

      times.sort((a, b) => a - b);
      const p99Index = Math.floor(iterations * 0.99);
      const p99 = times[p99Index];

      expect(p99).toBeLessThan(1); // < 1ms P99
    });

    it("should include evaluation time in result", async () => {
      const result = await engine.checkPermission({
        action: "web_search",
        resource: "api.example.com",
      });

      expect(result.evaluationTimeMs).toBeGreaterThan(0);
      expect(result.evaluationTimeMs).toBeLessThan(10); // Sanity check
    });
  });

  describe("createPolicyEngineFromIdentity", () => {
    it("should create engine from RuntimeIdentity", async () => {
      const identity = createTestIdentity();
      const engine = createPolicyEngineFromIdentity(identity);

      const result = await engine.checkPermission({
        action: "web_search",
        resource: "api.example.com",
      });

      expect(result.allowed).toBe(true);
    });

    it("should respect identity capabilities", async () => {
      const identity = createTestIdentity({
        capabilities_manifest: createTestCapabilities({
          allowed_tools: ["special_tool"],
          denied_tools: [],
        }),
      });
      const engine = createPolicyEngineFromIdentity(identity);

      const allowed = await engine.checkPermission({
        action: "special_tool",
        resource: "*",
      });
      expect(allowed.allowed).toBe(true);

      const denied = await engine.checkPermission({
        action: "web_search",
        resource: "*",
      });
      expect(denied.allowed).toBe(false);
    });

    it("should accept additional options", async () => {
      const identity = createTestIdentity();
      const engine = createPolicyEngineFromIdentity(identity, {
        dryRun: true,
      });

      expect(engine.isDryRun()).toBe(true);
    });
  });

  describe("Custom Checks", () => {
    it("should run custom async checks", async () => {
      const engine = createPolicyEngine({
        capabilities: createTestCapabilities(),
        customChecks: [
          async (request) => ({
            allowed: request.params?.approved === true,
            reason: "Custom approval required",
            evaluationTimeMs: 0,
            dryRun: false,
          }),
        ],
      });

      const denied = await engine.checkPermission({
        action: "web_search",
        resource: "api.example.com",
        params: { approved: false },
      });
      expect(denied.allowed).toBe(false);

      const allowed = await engine.checkPermission({
        action: "web_search",
        resource: "api.example.com",
        params: { approved: true },
      });
      expect(allowed.allowed).toBe(true);
    });
  });

  describe("Recommendations", () => {
    it("should provide recommendations on denial", async () => {
      const result = await engine.checkPermission({
        action: "unknown_action",
        resource: "*",
      });

      expect(result.allowed).toBe(false);
      expect(result.recommendations).toBeDefined();
      expect(result.recommendations!.length).toBeGreaterThan(0);
    });
  });
});

// ─────────────────────────────────────────────────────────────────
// ERROR TESTS
// ─────────────────────────────────────────────────────────────────

describe("Error Classes", () => {
  describe("AigosPolicyViolation", () => {
    it("should contain action and resource", () => {
      const error = new AigosPolicyViolation(
        "shell_exec",
        "/bin/rm",
        "Action denied",
        "capability"
      );

      expect(error.action).toBe("shell_exec");
      expect(error.resource).toBe("/bin/rm");
      expect(error.reason).toBe("Action denied");
      expect(error.deniedBy).toBe("capability");
      expect(error.name).toBe("AigosPolicyViolation");
    });
  });

  describe("AgentTerminatedException", () => {
    it("should contain termination reason", () => {
      const error = new AgentTerminatedException("Kill switch activated");

      expect(error.reason).toBe("Kill switch activated");
      expect(error.name).toBe("AgentTerminatedException");
      expect(error.message).toContain("Kill switch activated");
    });
  });

  describe("AigosBudgetExceeded", () => {
    it("should contain cost information", () => {
      const error = new AigosBudgetExceeded("api_call", "https://api.com", 15.0, 10.0);

      expect(error.currentCost).toBe(15.0);
      expect(error.limit).toBe(10.0);
      expect(error.deniedBy).toBe("budget");
      expect(error.name).toBe("AigosBudgetExceeded");
    });
  });
});
