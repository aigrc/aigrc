import { describe, it, expect } from "vitest";
import {
  resolvePolicy,
  mergePolicies,
  evaluatePolicy,
  isToolAllowed,
  isDomainAllowed,
  createPolicyRepository,
  PolicyResolutionError,
  MAX_INHERITANCE_DEPTH,
} from "../src/policy";
import type { PolicyFile, PolicyCapabilities } from "../src/schemas";

describe("Policy Inheritance", () => {
  // Helper to create a minimal policy
  function createPolicy(
    id: string,
    overrides: Partial<PolicyFile> = {}
  ): PolicyFile {
    return {
      version: "1.0",
      id,
      name: `Policy ${id}`,
      applies_to: ["*"],
      rules: [],
      ...overrides,
    };
  }

  describe("resolvePolicy", () => {
    it("should resolve a policy without inheritance", () => {
      const policy = createPolicy("simple");
      const repo = createPolicyRepository(new Map([["simple", policy]]));

      const result = resolvePolicy("simple", repo);

      expect(result.policy.id).toBe("simple");
      expect(result.inheritanceChain).toEqual(["simple"]);
      expect(result.depth).toBe(1);
    });

    it("should resolve a single-level inheritance", () => {
      const parent = createPolicy("parent", {
        capabilities: {
          default_effect: "deny",
          allowed_tools: ["read_file"],
          denied_tools: [],
          allowed_domains: [],
          denied_domains: [],
          may_spawn: false,
          max_spawn_depth: 0,
        },
      });
      const child = createPolicy("child", {
        extends: "parent",
        capabilities: {
          default_effect: "deny",
          allowed_tools: ["write_file"],
          denied_tools: [],
          allowed_domains: [],
          denied_domains: [],
          may_spawn: false,
          max_spawn_depth: 0,
        },
      });
      const repo = createPolicyRepository(
        new Map([
          ["parent", parent],
          ["child", child],
        ])
      );

      const result = resolvePolicy("child", repo);

      expect(result.inheritanceChain).toEqual(["parent", "child"]);
      expect(result.depth).toBe(2);
      expect(result.policy.capabilities?.allowed_tools).toContain("read_file");
      expect(result.policy.capabilities?.allowed_tools).toContain("write_file");
    });

    it("should resolve multi-level inheritance", () => {
      const grandparent = createPolicy("grandparent", {
        rules: [{ id: "rule-1", effect: "allow", actions: ["*"], resources: ["*"], priority: 0 }],
      });
      const parent = createPolicy("parent", {
        extends: "grandparent",
        rules: [{ id: "rule-2", effect: "deny", actions: ["delete_*"], resources: ["*"], priority: 1 }],
      });
      const child = createPolicy("child", {
        extends: "parent",
        rules: [{ id: "rule-3", effect: "allow", actions: ["delete_temp"], resources: ["*"], priority: 2 }],
      });
      const repo = createPolicyRepository(
        new Map([
          ["grandparent", grandparent],
          ["parent", parent],
          ["child", child],
        ])
      );

      const result = resolvePolicy("child", repo);

      expect(result.inheritanceChain).toEqual(["grandparent", "parent", "child"]);
      expect(result.depth).toBe(3);
      expect(result.policy.rules).toHaveLength(3);
      // Rules should be sorted by priority
      expect(result.policy.rules[0].id).toBe("rule-3");
      expect(result.policy.rules[1].id).toBe("rule-2");
      expect(result.policy.rules[2].id).toBe("rule-1");
    });

    it("should throw on circular inheritance", () => {
      const policyA = createPolicy("a", { extends: "b" });
      const policyB = createPolicy("b", { extends: "a" });
      const repo = createPolicyRepository(
        new Map([
          ["a", policyA],
          ["b", policyB],
        ])
      );

      expect(() => resolvePolicy("a", repo)).toThrow(PolicyResolutionError);
      expect(() => resolvePolicy("a", repo)).toThrow("Circular inheritance");
    });

    it("should throw on missing parent policy", () => {
      const child = createPolicy("child", { extends: "nonexistent" });
      const repo = createPolicyRepository(new Map([["child", child]]));

      expect(() => resolvePolicy("child", repo)).toThrow(PolicyResolutionError);
      expect(() => resolvePolicy("child", repo)).toThrow("Policy not found: nonexistent");
    });

    it("should throw when max depth exceeded", () => {
      // Create a chain longer than MAX_INHERITANCE_DEPTH
      const policies = new Map<string, PolicyFile>();
      for (let i = 0; i <= MAX_INHERITANCE_DEPTH + 1; i++) {
        policies.set(
          `policy-${i}`,
          createPolicy(`policy-${i}`, {
            extends: i > 0 ? `policy-${i - 1}` : undefined,
          })
        );
      }
      const repo = createPolicyRepository(policies);

      expect(() => resolvePolicy(`policy-${MAX_INHERITANCE_DEPTH + 1}`, repo)).toThrow(
        "Maximum inheritance depth"
      );
    });
  });

  describe("mergePolicies", () => {
    it("should merge capabilities with child overriding", () => {
      const parent = createPolicy("parent", {
        capabilities: {
          default_effect: "deny",
          allowed_tools: ["read_file"],
          denied_tools: [],
          allowed_domains: ["*.safe.com"],
          denied_domains: [],
          max_budget_per_day: 100,
          may_spawn: false,
          max_spawn_depth: 0,
        },
      });
      const child = createPolicy("child", {
        capabilities: {
          default_effect: "allow",
          allowed_tools: ["write_file"],
          denied_tools: ["delete_file"],
          allowed_domains: [],
          denied_domains: [],
          max_budget_per_day: 50,
          may_spawn: true,
          max_spawn_depth: 2,
        },
      });

      const merged = mergePolicies(parent, child);

      expect(merged.capabilities?.default_effect).toBe("allow"); // child wins
      expect(merged.capabilities?.allowed_tools).toContain("read_file"); // merged
      expect(merged.capabilities?.allowed_tools).toContain("write_file"); // merged
      expect(merged.capabilities?.denied_tools).toContain("delete_file");
      expect(merged.capabilities?.allowed_domains).toContain("*.safe.com");
      expect(merged.capabilities?.max_budget_per_day).toBe(50); // child wins
      expect(merged.capabilities?.may_spawn).toBe(true); // child wins
    });

    it("should append child rules after parent rules", () => {
      const parent = createPolicy("parent", {
        rules: [
          { id: "parent-1", effect: "allow", actions: ["read_*"], resources: ["*"], priority: 0 },
        ],
      });
      const child = createPolicy("child", {
        rules: [
          { id: "child-1", effect: "deny", actions: ["read_secret"], resources: ["*"], priority: 10 },
        ],
      });

      const merged = mergePolicies(parent, child);

      expect(merged.rules).toHaveLength(2);
      // Sorted by priority
      expect(merged.rules[0].id).toBe("child-1");
      expect(merged.rules[1].id).toBe("parent-1");
    });

    it("should use child applies_to if non-default", () => {
      const parent = createPolicy("parent", { applies_to: ["aigrc-2024-*"] });
      const child = createPolicy("child", { applies_to: ["aigrc-2025-*"] });

      const merged = mergePolicies(parent, child);

      expect(merged.applies_to).toEqual(["aigrc-2025-*"]);
    });

    it("should inherit parent applies_to if child uses wildcard", () => {
      const parent = createPolicy("parent", { applies_to: ["aigrc-2024-*"] });
      const child = createPolicy("child", { applies_to: ["*"] });

      const merged = mergePolicies(parent, child);

      expect(merged.applies_to).toEqual(["aigrc-2024-*"]);
    });
  });
});

describe("Policy Evaluation", () => {
  function createPolicy(
    id: string,
    overrides: Partial<PolicyFile> = {}
  ): PolicyFile {
    return {
      version: "1.0",
      id,
      name: `Policy ${id}`,
      applies_to: ["*"],
      rules: [],
      ...overrides,
    };
  }

  const defaultContext = {
    riskLevel: "limited" as const,
    mode: "NORMAL" as const,
  };

  describe("evaluatePolicy", () => {
    it("should allow action when rule matches with allow effect", () => {
      const policy = createPolicy("test", {
        rules: [
          { id: "allow-read", effect: "allow", actions: ["read_file"], resources: ["*"], priority: 0 },
        ],
      });

      const result = evaluatePolicy(policy, "read_file", "/any/path", defaultContext);

      expect(result.allowed).toBe(true);
      expect(result.effect).toBe("allow");
      expect(result.matched).toBe(true);
      expect(result.matchedRule?.id).toBe("allow-read");
    });

    it("should deny action when rule matches with deny effect", () => {
      const policy = createPolicy("test", {
        rules: [
          { id: "deny-delete", effect: "deny", actions: ["delete_*"], resources: ["*"], priority: 0 },
        ],
      });

      const result = evaluatePolicy(policy, "delete_file", "/any/path", defaultContext);

      expect(result.allowed).toBe(false);
      expect(result.effect).toBe("deny");
      expect(result.matched).toBe(true);
    });

    it("should use default effect when no rule matches", () => {
      const policy = createPolicy("test", {
        capabilities: {
          default_effect: "allow",
          allowed_tools: [],
          denied_tools: [],
          allowed_domains: [],
          denied_domains: [],
          may_spawn: false,
          max_spawn_depth: 0,
        },
      });

      const result = evaluatePolicy(policy, "some_action", "/path", defaultContext);

      expect(result.allowed).toBe(true);
      expect(result.matched).toBe(false);
    });

    it("should default to deny when no capabilities defined", () => {
      const policy = createPolicy("test");

      const result = evaluatePolicy(policy, "some_action", "/path", defaultContext);

      expect(result.allowed).toBe(false);
      expect(result.matched).toBe(false);
    });

    it("should match wildcard patterns", () => {
      const policy = createPolicy("test", {
        rules: [
          { id: "allow-read-all", effect: "allow", actions: ["read_*"], resources: ["/public/*"], priority: 0 },
        ],
      });

      expect(evaluatePolicy(policy, "read_file", "/public/doc.txt", defaultContext).allowed).toBe(true);
      expect(evaluatePolicy(policy, "read_db", "/public/data", defaultContext).allowed).toBe(true);
      expect(evaluatePolicy(policy, "write_file", "/public/doc.txt", defaultContext).allowed).toBe(false);
      expect(evaluatePolicy(policy, "read_file", "/private/doc.txt", defaultContext).allowed).toBe(false);
    });

    it("should evaluate risk level conditions", () => {
      const policy = createPolicy("test", {
        rules: [
          {
            id: "high-risk-deny",
            effect: "deny",
            actions: ["*"],
            resources: ["*"],
            conditions: { risk_levels: ["high", "unacceptable"] },
            priority: 0,
          },
        ],
        capabilities: { default_effect: "allow", allowed_tools: [], denied_tools: [], allowed_domains: [], denied_domains: [], may_spawn: false, max_spawn_depth: 0 },
      });

      // High risk - should match deny rule
      expect(evaluatePolicy(policy, "any_action", "/path", { riskLevel: "high", mode: "NORMAL" }).allowed).toBe(false);

      // Limited risk - should use default (allow)
      expect(evaluatePolicy(policy, "any_action", "/path", { riskLevel: "limited", mode: "NORMAL" }).allowed).toBe(true);
    });

    it("should evaluate mode conditions", () => {
      const policy = createPolicy("test", {
        rules: [
          {
            id: "sandbox-audit",
            effect: "audit",
            actions: ["*"],
            resources: ["*"],
            conditions: { modes: ["SANDBOX"] },
            priority: 0,
          },
        ],
      });

      const sandboxResult = evaluatePolicy(policy, "action", "/path", { riskLevel: "minimal", mode: "SANDBOX" });
      expect(sandboxResult.effect).toBe("audit");

      const normalResult = evaluatePolicy(policy, "action", "/path", { riskLevel: "minimal", mode: "NORMAL" });
      expect(normalResult.matched).toBe(false);
    });

    it("should evaluate first matching rule", () => {
      const policy = createPolicy("test", {
        rules: [
          { id: "specific-deny", effect: "deny", actions: ["delete_critical"], resources: ["*"], priority: 10 },
          { id: "general-allow", effect: "allow", actions: ["delete_*"], resources: ["*"], priority: 5 },
        ],
      });

      // Specific rule matches first (higher priority)
      expect(evaluatePolicy(policy, "delete_critical", "/path", defaultContext).matchedRule?.id).toBe("specific-deny");
      // General rule for non-critical
      expect(evaluatePolicy(policy, "delete_temp", "/path", defaultContext).matchedRule?.id).toBe("general-allow");
    });
  });

  describe("isToolAllowed", () => {
    it("should return false when no capabilities defined", () => {
      expect(isToolAllowed("any_tool", undefined)).toBe(false);
    });

    it("should check allowed list", () => {
      const caps: PolicyCapabilities = {
        default_effect: "deny",
        allowed_tools: ["read_file", "write_*"],
        denied_tools: [],
        allowed_domains: [],
        denied_domains: [],
        may_spawn: false,
        max_spawn_depth: 0,
      };

      expect(isToolAllowed("read_file", caps)).toBe(true);
      expect(isToolAllowed("write_log", caps)).toBe(true);
      expect(isToolAllowed("delete_file", caps)).toBe(false);
    });

    it("should check denied list takes precedence", () => {
      const caps: PolicyCapabilities = {
        default_effect: "allow",
        allowed_tools: ["*"],
        denied_tools: ["execute_shell", "delete_*"],
        allowed_domains: [],
        denied_domains: [],
        may_spawn: false,
        max_spawn_depth: 0,
      };

      expect(isToolAllowed("read_file", caps)).toBe(true);
      expect(isToolAllowed("execute_shell", caps)).toBe(false);
      expect(isToolAllowed("delete_file", caps)).toBe(false);
    });
  });

  describe("isDomainAllowed", () => {
    it("should return false when no capabilities defined", () => {
      expect(isDomainAllowed("example.com", undefined)).toBe(false);
    });

    it("should match exact domains", () => {
      const caps: PolicyCapabilities = {
        default_effect: "deny",
        allowed_tools: [],
        denied_tools: [],
        allowed_domains: ["example.com", "api.internal.com"],
        denied_domains: [],
        may_spawn: false,
        max_spawn_depth: 0,
      };

      expect(isDomainAllowed("example.com", caps)).toBe(true);
      expect(isDomainAllowed("other.com", caps)).toBe(false);
    });

    it("should match wildcard subdomains", () => {
      const caps: PolicyCapabilities = {
        default_effect: "deny",
        allowed_tools: [],
        denied_tools: [],
        allowed_domains: ["*.example.com"],
        denied_domains: [],
        may_spawn: false,
        max_spawn_depth: 0,
      };

      expect(isDomainAllowed("api.example.com", caps)).toBe(true);
      expect(isDomainAllowed("sub.api.example.com", caps)).toBe(true);
      expect(isDomainAllowed("example.com", caps)).toBe(true); // Base domain matches too
      expect(isDomainAllowed("other.com", caps)).toBe(false);
    });

    it("should deny takes precedence over allow", () => {
      const caps: PolicyCapabilities = {
        default_effect: "allow",
        allowed_tools: [],
        denied_tools: [],
        allowed_domains: ["*.example.com"],
        denied_domains: ["evil.example.com"],
        may_spawn: false,
        max_spawn_depth: 0,
      };

      expect(isDomainAllowed("api.example.com", caps)).toBe(true);
      expect(isDomainAllowed("evil.example.com", caps)).toBe(false);
    });
  });
});
