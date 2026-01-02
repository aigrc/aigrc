import { describe, it, expect, beforeEach } from "vitest";
import {
  createCapabilityDecay,
  createNoopCapabilityDecay,
  DEFAULT_DECAY_RULES,
  type ICapabilityDecay,
  type ParentCapabilities,
  type SpawnRequest,
  type DecayMode,
} from "../src/capability-decay.js";

describe("Capability Decay (SPEC-RT-006)", () => {
  let decay: ICapabilityDecay;

  // Helper to create parent capabilities
  function createParent(overrides: Partial<ParentCapabilities> = {}): ParentCapabilities {
    return {
      allowedTools: ["web_search", "database_read", "send_email"],
      allowedDomains: ["*.example.com", "api.test.com"],
      deniedDomains: ["evil.com"],
      budgets: {
        maxCostPerSession: 100,
        maxCostPerDay: 500,
        maxTokensPerCall: 4096,
      },
      maxChildDepth: 3,
      currentDepth: 0,
      maySpawnChildren: true,
      riskLevel: "limited",
      ...overrides,
    };
  }

  // Helper to create spawn request
  function createSpawnRequest(
    overrides: Partial<SpawnRequest["capabilities"]> = {},
    decayMode: DecayMode = "decay"
  ): SpawnRequest {
    return {
      assetId: "child-agent",
      capabilities: overrides,
      decayMode,
    };
  }

  describe("validate", () => {
    beforeEach(() => {
      decay = createCapabilityDecay({
        rules: {
          removeFromChildren: ["send_email"],
          budgetDecay: {
            maxCostPerSession: 0.5,
            maxCostPerDay: 0.5,
            maxCostPerMonth: 0.5,
            maxTokensPerCall: 0.75,
          },
          autoAdjust: true,
        },
        childDeniedCapabilities: ["shell_exec", "admin_commands"],
      });
    });

    describe("tool validation", () => {
      it("should allow child with subset of parent tools", () => {
        const parent = createParent();
        const request = createSpawnRequest({
          allowedTools: ["web_search", "database_read"],
        });

        const result = decay.validate(parent, request);
        expect(result.valid).toBe(true);
        expect(result.violations).toHaveLength(0);
      });

      it("should reject child with tool parent doesn't have", () => {
        const parent = createParent();
        const request = createSpawnRequest({
          allowedTools: ["web_search", "file_write"], // file_write not in parent
        });

        const result = decay.validate(parent, request);
        expect(result.valid).toBe(false);
        expect(result.violations).toHaveLength(1);
        expect(result.violations[0].type).toBe("PRIVILEGE_ESCALATION");
        expect(result.violations[0].capability).toBe("file_write");
      });

      it("should reject child with globally denied tool", () => {
        const parent = createParent({
          allowedTools: ["*"], // Parent has wildcard
        });
        const request = createSpawnRequest({
          allowedTools: ["shell_exec"], // In childDeniedCapabilities
        });

        const result = decay.validate(parent, request);
        expect(result.valid).toBe(false);
        expect(result.violations.some((v) => v.capability === "shell_exec")).toBe(true);
      });

      it("should allow all tools when parent has wildcard", () => {
        const parent = createParent({
          allowedTools: ["*"],
        });
        const request = createSpawnRequest({
          allowedTools: ["web_search", "database_read", "any_tool"],
        });

        // Only shell_exec is denied globally
        const result = decay.validate(parent, request);
        expect(result.valid).toBe(true);
      });
    });

    describe("domain validation", () => {
      it("should allow child with subset of parent domains", () => {
        const parent = createParent();
        const request = createSpawnRequest({
          allowedDomains: ["api.test.com"], // Exact match
        });

        const result = decay.validate(parent, request);
        expect(result.valid).toBe(true);
      });

      it("should allow child with domain covered by parent wildcard", () => {
        const parent = createParent({
          allowedDomains: ["*.example.com"],
        });
        const request = createSpawnRequest({
          allowedDomains: ["api.example.com", "www.example.com"],
        });

        const result = decay.validate(parent, request);
        expect(result.valid).toBe(true);
      });

      it("should reject child with domain not covered by parent", () => {
        const parent = createParent({
          allowedDomains: ["*.example.com"],
        });
        const request = createSpawnRequest({
          allowedDomains: ["malicious.com"],
        });

        const result = decay.validate(parent, request);
        expect(result.valid).toBe(false);
        expect(result.violations[0].type).toBe("PRIVILEGE_ESCALATION");
      });
    });

    describe("budget validation", () => {
      it("should allow child with lower budget", () => {
        const parent = createParent();
        const request = createSpawnRequest({
          budgets: {
            maxCostPerSession: 50, // Less than parent's 100
          },
        });

        const result = decay.validate(parent, request);
        expect(result.valid).toBe(true);
      });

      it("should reject child with higher budget than parent", () => {
        const parent = createParent();
        const request = createSpawnRequest({
          budgets: {
            maxCostPerSession: 200, // More than parent's 100
          },
        });

        const result = decay.validate(parent, request);
        expect(result.valid).toBe(false);
        expect(result.violations[0].type).toBe("BUDGET_ESCALATION");
      });

      it("should provide adjusted capabilities when auto-adjust enabled", () => {
        const parent = createParent();
        const request = createSpawnRequest({
          allowedTools: ["web_search", "file_write"], // file_write invalid
          budgets: {
            maxCostPerSession: 200, // exceeds parent
          },
        });

        const result = decay.validate(parent, request);
        expect(result.valid).toBe(false);
        expect(result.adjustedCapabilities).toBeDefined();
        expect(result.adjustedCapabilities?.allowedTools).not.toContain("file_write");
        expect(result.adjustedCapabilities?.budgets.maxCostPerSession).toBeLessThanOrEqual(100);
      });
    });

    describe("depth validation", () => {
      it("should reject spawn when at max depth", () => {
        const parent = createParent({
          maxChildDepth: 2,
          currentDepth: 2, // Already at max
        });
        const request = createSpawnRequest();

        const result = decay.validate(parent, request);
        expect(result.valid).toBe(false);
        expect(result.violations[0].type).toBe("DEPTH_EXCEEDED");
      });

      it("should reject spawn when parent cannot spawn", () => {
        const parent = createParent({
          maySpawnChildren: false,
        });
        const request = createSpawnRequest();

        const result = decay.validate(parent, request);
        expect(result.valid).toBe(false);
        expect(result.violations[0].type).toBe("DEPTH_EXCEEDED");
      });

      it("should allow spawn when depth is valid", () => {
        const parent = createParent({
          maxChildDepth: 3,
          currentDepth: 1,
        });
        const request = createSpawnRequest({
          allowedTools: ["web_search"],
        });

        const result = decay.validate(parent, request);
        expect(result.valid).toBe(true);
      });
    });

    describe("risk level validation", () => {
      it("should reject child with higher risk level", () => {
        const parent = createParent({
          riskLevel: "limited",
        });
        const request = createSpawnRequest({
          riskLevel: "high", // Exceeds parent
        });

        const result = decay.validate(parent, request);
        expect(result.valid).toBe(false);
        expect(result.violations[0].type).toBe("PRIVILEGE_ESCALATION");
      });

      it("should allow child with same or lower risk level", () => {
        const parent = createParent({
          riskLevel: "high",
        });
        const request = createSpawnRequest({
          riskLevel: "limited", // Lower than parent
          allowedTools: ["web_search"],
        });

        const result = decay.validate(parent, request);
        expect(result.valid).toBe(true);
      });
    });
  });

  describe("applyDecay", () => {
    beforeEach(() => {
      decay = createCapabilityDecay({
        rules: {
          removeFromChildren: ["send_email", "database_write"],
          budgetDecay: {
            maxCostPerSession: 0.5,
            maxCostPerDay: 0.5,
            maxCostPerMonth: 0.5,
            maxTokensPerCall: 0.75,
          },
          autoAdjust: true,
        },
        childDeniedCapabilities: ["shell_exec"],
      });
    });

    describe("decay mode", () => {
      it("should remove tools in removeFromChildren list", () => {
        const parent = createParent({
          allowedTools: ["web_search", "send_email", "database_write", "database_read"],
        });

        const childCaps = decay.applyDecay(parent, "decay");

        expect(childCaps.allowedTools).toContain("web_search");
        expect(childCaps.allowedTools).toContain("database_read");
        expect(childCaps.allowedTools).not.toContain("send_email");
        expect(childCaps.allowedTools).not.toContain("database_write");
      });

      it("should apply budget decay factors", () => {
        const parent = createParent({
          budgets: {
            maxCostPerSession: 100,
            maxCostPerDay: 500,
            maxTokensPerCall: 4096,
          },
        });

        const childCaps = decay.applyDecay(parent, "decay");

        expect(childCaps.budgets.maxCostPerSession).toBe(50); // 100 * 0.5
        expect(childCaps.budgets.maxCostPerDay).toBe(250); // 500 * 0.5
        expect(childCaps.budgets.maxTokensPerCall).toBe(3072); // 4096 * 0.75
      });

      it("should inherit domains", () => {
        const parent = createParent({
          allowedDomains: ["*.example.com", "api.test.com"],
          deniedDomains: ["evil.com"],
        });

        const childCaps = decay.applyDecay(parent, "decay");

        expect(childCaps.allowedDomains).toEqual(parent.allowedDomains);
        expect(childCaps.deniedDomains).toEqual(parent.deniedDomains);
      });

      it("should disable spawn at max depth", () => {
        const parent = createParent({
          maxChildDepth: 2,
          currentDepth: 1, // Child will be at depth 2 (max)
        });

        const childCaps = decay.applyDecay(parent, "decay");

        expect(childCaps.maySpawnChildren).toBe(false);
      });
    });

    describe("explicit mode", () => {
      it("should only grant explicitly requested capabilities", () => {
        const parent = createParent({
          allowedTools: ["web_search", "database_read", "send_email"],
        });

        const childCaps = decay.applyDecay(parent, "explicit", {
          allowedTools: ["web_search"], // Only request one tool
        });

        expect(childCaps.allowedTools).toEqual(["web_search"]);
        expect(childCaps.allowedTools).not.toContain("database_read");
      });

      it("should intersect with parent capabilities", () => {
        const parent = createParent({
          allowedTools: ["web_search", "database_read"],
        });

        const childCaps = decay.applyDecay(parent, "explicit", {
          allowedTools: ["web_search", "file_write"], // file_write not in parent
        });

        expect(childCaps.allowedTools).toEqual(["web_search"]);
        expect(childCaps.allowedTools).not.toContain("file_write");
      });

      it("should cap budgets at parent levels", () => {
        const parent = createParent({
          budgets: {
            maxCostPerSession: 100,
          },
        });

        const childCaps = decay.applyDecay(parent, "explicit", {
          budgets: {
            maxCostPerSession: 200, // Exceeds parent
          },
        });

        expect(childCaps.budgets.maxCostPerSession).toBe(100);
      });

      it("should merge denied domains", () => {
        const parent = createParent({
          deniedDomains: ["evil.com"],
        });

        const childCaps = decay.applyDecay(parent, "explicit", {
          deniedDomains: ["malware.com"],
        });

        expect(childCaps.deniedDomains).toContain("evil.com");
        expect(childCaps.deniedDomains).toContain("malware.com");
      });

      it("should default maySpawnChildren to false", () => {
        const parent = createParent();

        const childCaps = decay.applyDecay(parent, "explicit", {
          allowedTools: ["web_search"],
        });

        expect(childCaps.maySpawnChildren).toBe(false);
      });
    });

    describe("inherit mode", () => {
      it("should copy all parent capabilities", () => {
        const parent = createParent({
          allowedTools: ["web_search", "database_read", "send_email"],
          allowedDomains: ["*.example.com"],
          budgets: {
            maxCostPerSession: 100,
            maxCostPerDay: 500,
          },
        });

        const childCaps = decay.applyDecay(parent, "inherit");

        expect(childCaps.allowedTools).toEqual(parent.allowedTools);
        expect(childCaps.allowedDomains).toEqual(parent.allowedDomains);
        expect(childCaps.budgets.maxCostPerSession).toBe(100);
        expect(childCaps.budgets.maxCostPerDay).toBe(500);
      });

      it("should still respect depth limits", () => {
        const parent = createParent({
          maxChildDepth: 2,
          currentDepth: 1,
        });

        const childCaps = decay.applyDecay(parent, "inherit");

        expect(childCaps.maySpawnChildren).toBe(false);
      });

      it("should inherit risk level", () => {
        const parent = createParent({
          riskLevel: "high",
        });

        const childCaps = decay.applyDecay(parent, "inherit");

        expect(childCaps.riskLevel).toBe("high");
      });
    });
  });

  describe("getDecayRules and setDecayRules", () => {
    beforeEach(() => {
      decay = createCapabilityDecay();
    });

    it("should return current rules", () => {
      const rules = decay.getDecayRules();

      expect(rules.removeFromChildren).toBeDefined();
      expect(rules.budgetDecay).toBeDefined();
      expect(rules.autoAdjust).toBeDefined();
    });

    it("should update rules", () => {
      decay.setDecayRules({
        removeFromChildren: ["new_tool"],
        budgetDecay: {
          maxCostPerSession: 0.25,
          maxCostPerDay: 0.25,
          maxCostPerMonth: 0.25,
          maxTokensPerCall: 0.5,
        },
      });

      const rules = decay.getDecayRules();
      expect(rules.removeFromChildren).toContain("new_tool");
      expect(rules.budgetDecay.maxCostPerSession).toBe(0.25);
    });
  });

  describe("DEFAULT_DECAY_RULES", () => {
    it("should have sensible defaults", () => {
      expect(DEFAULT_DECAY_RULES.autoAdjust).toBe(true);
      expect(DEFAULT_DECAY_RULES.budgetDecay.maxCostPerSession).toBe(0.5);
      expect(DEFAULT_DECAY_RULES.budgetDecay.maxCostPerDay).toBe(0.5);
      expect(DEFAULT_DECAY_RULES.budgetDecay.maxTokensPerCall).toBe(0.75);
    });
  });

  describe("createNoopCapabilityDecay", () => {
    it("should always validate as true", () => {
      const noopDecay = createNoopCapabilityDecay();
      const parent = createParent();
      const request = createSpawnRequest({
        allowedTools: ["anything", "goes"],
        budgets: { maxCostPerSession: 99999 },
      });

      const result = noopDecay.validate(parent, request);
      expect(result.valid).toBe(true);
    });

    it("should copy parent capabilities in applyDecay", () => {
      const noopDecay = createNoopCapabilityDecay();
      const parent = createParent();

      const childCaps = noopDecay.applyDecay(parent, "decay");

      expect(childCaps.allowedTools).toEqual(parent.allowedTools);
      expect(childCaps.budgets).toEqual(parent.budgets);
    });
  });

  describe("global max depth", () => {
    it("should enforce global max depth even if parent has higher", () => {
      decay = createCapabilityDecay({
        globalMaxDepth: 2,
      });

      const parent = createParent({
        maxChildDepth: 10, // High limit
        currentDepth: 2, // But global max is 2
      });

      const result = decay.validate(parent, createSpawnRequest());
      expect(result.valid).toBe(false);
      expect(result.violations[0].type).toBe("DEPTH_EXCEEDED");
    });
  });

  describe("mathematical rule: capabilities(child) ⊆ capabilities(parent)", () => {
    beforeEach(() => {
      decay = createCapabilityDecay();
    });

    it("should ensure child tools are subset of parent", () => {
      const parent = createParent({
        allowedTools: ["a", "b", "c"],
      });

      const childCaps = decay.applyDecay(parent, "decay");

      // Every child tool must be in parent
      for (const tool of childCaps.allowedTools) {
        expect(parent.allowedTools).toContain(tool);
      }
    });

    it("should ensure child budgets do not exceed parent", () => {
      const parent = createParent({
        budgets: {
          maxCostPerSession: 100,
          maxCostPerDay: 500,
        },
      });

      const childCaps = decay.applyDecay(parent, "decay");

      expect(childCaps.budgets.maxCostPerSession).toBeLessThanOrEqual(
        parent.budgets.maxCostPerSession!
      );
      expect(childCaps.budgets.maxCostPerDay).toBeLessThanOrEqual(parent.budgets.maxCostPerDay!);
    });

    it("should ensure child inherits parent denied domains", () => {
      const parent = createParent({
        deniedDomains: ["evil.com", "malware.net"],
      });

      const childCaps = decay.applyDecay(parent, "decay");

      for (const denied of parent.deniedDomains) {
        expect(childCaps.deniedDomains).toContain(denied);
      }
    });
  });
});
