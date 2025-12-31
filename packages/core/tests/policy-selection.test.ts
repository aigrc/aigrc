import { describe, it, expect, beforeEach } from "vitest";
import {
  selectPolicy,
  createPolicySelector,
  createPolicyRepository,
  type PolicyRepository,
  type PolicySelectionCriteria,
} from "../src/policy";
import type { PolicyFile, RiskLevel, OperatingMode } from "../src/schemas";

// Helper to create a test policy
function createTestPolicy(
  id: string,
  appliesTo: string[],
  options: {
    riskLevelCondition?: RiskLevel[];
    tags?: string[];
    rulePriority?: number;
  } = {}
): PolicyFile {
  return {
    version: "1.0",
    id,
    name: `${id} Policy`,
    applies_to: appliesTo,
    rules: [
      {
        id: `${id}-rule`,
        effect: "allow",
        actions: ["*"],
        resources: ["*"],
        conditions: options.riskLevelCondition
          ? { risk_levels: options.riskLevelCondition }
          : undefined,
        priority: options.rulePriority,
      },
    ],
    metadata: {
      tags: options.tags,
    },
  };
}

// Helper to create a mock repository with policies exposed
function createTestRepository(policies: PolicyFile[]): PolicyRepository & { policies: Map<string, PolicyFile> } {
  const map = new Map<string, PolicyFile>();
  for (const policy of policies) {
    map.set(policy.id, policy);
  }
  return {
    get: (id) => map.get(id),
    has: (id) => map.has(id),
    policies: map,
  };
}

// Default criteria for tests
const baseCriteria: PolicySelectionCriteria = {
  assetId: "aigrc-2024-a1b2c3d4",
  riskLevel: "minimal",
  mode: "NORMAL",
};

describe("Policy Selection Algorithm", () => {
  describe("selectPolicy", () => {
    it("should return no_policy_found when repository is empty", () => {
      const repository = createTestRepository([]);
      const result = selectPolicy(baseCriteria, repository);

      expect(result.policy).toBeNull();
      expect(result.policyId).toBeNull();
      expect(result.selectionReason).toBe("no_policy_found");
    });

    it("should match explicit asset ID", () => {
      const repository = createTestRepository([
        createTestPolicy("policy-1", ["aigrc-2024-a1b2c3d4"]),
        createTestPolicy("policy-2", ["*"]),
      ]);

      const result = selectPolicy(baseCriteria, repository);

      expect(result.policyId).toBe("policy-1");
      expect(result.selectionReason).toBe("explicit_match");
      expect(result.score?.explicitMatch).toBe(100);
    });

    it("should match wildcard applies_to", () => {
      const repository = createTestRepository([
        createTestPolicy("wildcard-policy", ["*"]),
      ]);

      const result = selectPolicy(baseCriteria, repository);

      expect(result.policyId).toBe("wildcard-policy");
      expect(result.selectionReason).toBe("wildcard_match");
      expect(result.score?.explicitMatch).toBe(0);
    });

    it("should match wildcard prefix pattern", () => {
      const repository = createTestRepository([
        createTestPolicy("prefix-policy", ["aigrc-2024-*"]),
      ]);

      const result = selectPolicy(baseCriteria, repository);

      expect(result.policyId).toBe("prefix-policy");
      expect(result.selectionReason).toBe("wildcard_match");
    });

    it("should prefer explicit match over wildcard", () => {
      const repository = createTestRepository([
        createTestPolicy("wildcard-policy", ["*"]),
        createTestPolicy("explicit-policy", ["aigrc-2024-a1b2c3d4"]),
      ]);

      const result = selectPolicy(baseCriteria, repository);

      expect(result.policyId).toBe("explicit-policy");
      expect(result.selectionReason).toBe("explicit_match");
    });

    it("should score risk level match", () => {
      const repository = createTestRepository([
        createTestPolicy("minimal-policy", ["*"], { riskLevelCondition: ["minimal"] }),
        createTestPolicy("high-policy", ["*"], { riskLevelCondition: ["high"] }),
      ]);

      const result = selectPolicy(baseCriteria, repository);

      expect(result.policyId).toBe("minimal-policy");
      expect(result.selectionReason).toBe("risk_level_match");
      expect(result.score?.riskLevelMatch).toBe(50);
    });

    it("should score tag matches", () => {
      const repository = createTestRepository([
        createTestPolicy("tagged-policy", ["*"], { tags: ["production", "critical"] }),
        createTestPolicy("other-policy", ["*"], { tags: ["development"] }),
      ]);

      const criteria: PolicySelectionCriteria = {
        ...baseCriteria,
        tags: ["production", "critical"],
      };

      const result = selectPolicy(criteria, repository);

      expect(result.policyId).toBe("tagged-policy");
      expect(result.selectionReason).toBe("tag_match");
      expect(result.score?.tagMatches).toBe(2); // Two tags matched
    });

    it("should combine scores correctly", () => {
      const repository = createTestRepository([
        createTestPolicy("complete-policy", ["aigrc-2024-a1b2c3d4"], {
          riskLevelCondition: ["minimal"],
          tags: ["production"],
          rulePriority: 10,
        }),
      ]);

      const criteria: PolicySelectionCriteria = {
        ...baseCriteria,
        tags: ["production"],
      };

      const result = selectPolicy(criteria, repository);

      expect(result.policyId).toBe("complete-policy");
      // Total = 100 (explicit) + 50 (risk) + 10 (tag) + 10 (priority)
      expect(result.score?.total).toBe(170);
      expect(result.score?.explicitMatch).toBe(100);
      expect(result.score?.riskLevelMatch).toBe(50);
      expect(result.score?.tagMatches).toBe(1);
      expect(result.score?.priority).toBe(10);
    });

    it("should use default policy when no match found", () => {
      const repository = createTestRepository([
        createTestPolicy("default-policy", ["aigrc-9999-other"]),
        createTestPolicy("fallback", ["*"]),
      ]);

      // Remove the wildcard policy to test fallback
      repository.policies.delete("fallback");

      const result = selectPolicy(baseCriteria, repository, "default-policy");

      expect(result.policyId).toBe("default-policy");
      expect(result.selectionReason).toBe("default_policy");
    });

    it("should not match if applies_to doesn't include asset", () => {
      const repository = createTestRepository([
        createTestPolicy("other-policy", ["aigrc-2024-different"]),
      ]);

      const result = selectPolicy(baseCriteria, repository);

      expect(result.policy).toBeNull();
      expect(result.selectionReason).toBe("no_policy_found");
      expect(result.candidatePolicies).toContain("other-policy");
    });

    it("should list all candidate policies", () => {
      const repository = createTestRepository([
        createTestPolicy("policy-1", ["aigrc-2024-a1b2c3d4"]),
        createTestPolicy("policy-2", ["*"]),
        createTestPolicy("policy-3", ["aigrc-2024-other"]),
      ]);

      const result = selectPolicy(baseCriteria, repository);

      expect(result.candidatePolicies).toHaveLength(3);
      expect(result.candidatePolicies).toContain("policy-1");
      expect(result.candidatePolicies).toContain("policy-2");
      expect(result.candidatePolicies).toContain("policy-3");
    });

    it("should handle policies with multiple applies_to patterns", () => {
      const repository = createTestRepository([
        createTestPolicy("multi-policy", [
          "aigrc-2024-a1b2c3d4",
          "aigrc-2024-other",
          "aigrc-2025-*",
        ]),
      ]);

      const result = selectPolicy(baseCriteria, repository);

      expect(result.policyId).toBe("multi-policy");
      expect(result.selectionReason).toBe("explicit_match");
    });
  });

  describe("createPolicySelector", () => {
    it("should create selector with cache", () => {
      const repository = createTestRepository([
        createTestPolicy("policy-1", ["*"]),
      ]);

      const selector = createPolicySelector(repository);

      expect(selector.select).toBeInstanceOf(Function);
      expect(selector.clearCache).toBeInstanceOf(Function);
      expect(selector.getCacheStats).toBeInstanceOf(Function);
    });

    it("should cache results", () => {
      const repository = createTestRepository([
        createTestPolicy("policy-1", ["*"]),
      ]);

      const selector = createPolicySelector(repository);

      // First call - miss
      selector.select(baseCriteria);
      let stats = selector.getCacheStats();
      expect(stats.misses).toBe(1);
      expect(stats.hits).toBe(0);
      expect(stats.size).toBe(1);

      // Second call with same criteria - hit
      selector.select(baseCriteria);
      stats = selector.getCacheStats();
      expect(stats.hits).toBe(1);
      expect(stats.misses).toBe(1);
    });

    it("should return correct result from cache", () => {
      const repository = createTestRepository([
        createTestPolicy("policy-1", ["*"]),
      ]);

      const selector = createPolicySelector(repository);

      const result1 = selector.select(baseCriteria);
      const result2 = selector.select(baseCriteria);

      expect(result1).toEqual(result2);
      expect(result1.policyId).toBe("policy-1");
    });

    it("should have separate cache entries for different criteria", () => {
      const repository = createTestRepository([
        createTestPolicy("policy-1", ["*"]),
      ]);

      const selector = createPolicySelector(repository);

      selector.select({ ...baseCriteria, riskLevel: "minimal" });
      selector.select({ ...baseCriteria, riskLevel: "high" });

      const stats = selector.getCacheStats();
      expect(stats.size).toBe(2);
      expect(stats.misses).toBe(2);
    });

    it("should clear cache", () => {
      const repository = createTestRepository([
        createTestPolicy("policy-1", ["*"]),
      ]);

      const selector = createPolicySelector(repository);

      selector.select(baseCriteria);
      expect(selector.getCacheStats().size).toBe(1);

      selector.clearCache();
      expect(selector.getCacheStats().size).toBe(0);
    });

    it("should evict oldest entry when cache is full", () => {
      const repository = createTestRepository([
        createTestPolicy("policy-1", ["*"]),
      ]);

      // Create selector with tiny cache
      const selector = createPolicySelector(repository, undefined, 2);

      // Fill cache
      selector.select({ ...baseCriteria, riskLevel: "minimal" });
      selector.select({ ...baseCriteria, riskLevel: "limited" });

      expect(selector.getCacheStats().size).toBe(2);

      // Add one more - should evict first
      selector.select({ ...baseCriteria, riskLevel: "high" });

      expect(selector.getCacheStats().size).toBe(2);
    });

    it("should use default policy ID", () => {
      const repository = createTestRepository([
        createTestPolicy("default-policy", ["aigrc-9999-other"]),
      ]);

      const selector = createPolicySelector(repository, "default-policy");
      const result = selector.select(baseCriteria);

      expect(result.policyId).toBe("default-policy");
      expect(result.selectionReason).toBe("default_policy");
    });

    it("should handle tags in cache key", () => {
      const repository = createTestRepository([
        createTestPolicy("policy-1", ["*"], { tags: ["production"] }),
      ]);

      const selector = createPolicySelector(repository);

      // Different tag orders should produce same cache key
      selector.select({ ...baseCriteria, tags: ["b", "a"] });
      selector.select({ ...baseCriteria, tags: ["a", "b"] });

      // Should be cache hit since tags are sorted
      const stats = selector.getCacheStats();
      expect(stats.hits).toBe(1);
    });

    it("should handle environment in cache key", () => {
      const repository = createTestRepository([
        createTestPolicy("policy-1", ["*"]),
      ]);

      const selector = createPolicySelector(repository);

      selector.select({ ...baseCriteria, environment: "production" });
      selector.select({ ...baseCriteria, environment: "staging" });

      expect(selector.getCacheStats().size).toBe(2);
    });
  });
});
