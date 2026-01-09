/**
 * I2E Policy Bridge - Compiler Tests
 *
 * Tests for PolicyCompiler, conflict detection, and constraint merging
 */

import { describe, it, expect } from "vitest";
import {
  PolicyCompiler,
  createCompiler,
  detectConflicts,
  mergeConstraints,
  type ExtractedConstraint,
  type ExtractionResult,
  type PolicySourceInput,
} from "../src/index";

// Helper to create mock extraction result
function mockExtraction(contentHash?: string): ExtractionResult {
  return {
    success: true,
    content: "Mock content",
    source: { type: "manual", uri: "mock.yaml" },
    contentHash: contentHash || `sha256:${"a".repeat(64)}`,
    extractedAt: new Date().toISOString(),
    warnings: [],
  };
}

// Helper to create mock constraint
function mockConstraint(
  type: string,
  category: "registry" | "runtime" | "build",
  value: unknown,
  id?: string
): ExtractedConstraint {
  return {
    id: id || `constraint-${Math.random().toString(36).substr(2, 9)}`,
    type: type as any,
    category,
    value,
    sourceText: `Mock ${type} constraint`,
    confidence: 0.9,
    sourceId: "mock-source",
    extractionMethod: "manual",
  };
}

describe("PolicyCompiler", () => {
  describe("compile", () => {
    it("should compile empty sources to empty AIR", async () => {
      const compiler = new PolicyCompiler();
      const result = await compiler.compile([]);

      expect(result.success).toBe(true);
      expect(result.air).toBeDefined();
      expect(result.appliedConstraints).toHaveLength(0);
      expect(result.stats.totalConstraints).toBe(0);
    });

    it("should compile constraints from single source", async () => {
      const compiler = new PolicyCompiler();
      const constraints: ExtractedConstraint[] = [
        mockConstraint("allowed_vendor", "registry", "openai"),
        mockConstraint("pii_filter", "runtime", { enabled: true }),
        mockConstraint("require_golden_thread", "build", true),
      ];

      const result = await compiler.compile([{
        source: { type: "manual", uri: "policy.yaml" },
        extraction: mockExtraction(),
        constraints,
      }]);

      expect(result.success).toBe(true);
      expect(result.appliedConstraints.length).toBe(3);
      expect(result.stats.appliedConstraints).toBe(3);
    });

    it("should filter low-confidence constraints", async () => {
      const compiler = createCompiler({ minConfidence: 0.8 });
      const constraints: ExtractedConstraint[] = [
        { ...mockConstraint("allowed_vendor", "registry", "openai"), confidence: 0.9 },
        { ...mockConstraint("pii_filter", "runtime", { enabled: true }), confidence: 0.5 },
      ];

      const result = await compiler.compile([{
        source: { type: "manual", uri: "policy.yaml" },
        extraction: mockExtraction(),
        constraints,
      }]);

      expect(result.appliedConstraints.length).toBe(1);
      expect(result.skippedConstraints.length).toBe(1);
    });

    it("should include policy sources in AIR", async () => {
      const compiler = new PolicyCompiler();
      const source: PolicySourceInput = {
        type: "manual",
        uri: "/path/to/policy.yaml",
        title: "Corporate AI Policy",
        version: "1.0",
      };

      const result = await compiler.compile([{
        source,
        extraction: mockExtraction(),
        constraints: [],
      }]);

      expect(result.sources.length).toBe(1);
      expect(result.sources[0].uri).toBe(source.uri);
      expect(result.sources[0].title).toBe(source.title);
    });

    it("should set compilation statistics", async () => {
      const compiler = new PolicyCompiler();
      const constraints: ExtractedConstraint[] = [
        mockConstraint("allowed_vendor", "registry", "openai"),
        mockConstraint("blocked_vendor", "registry", "badai"),
      ];

      const result = await compiler.compile([{
        source: { type: "manual", uri: "policy.yaml" },
        extraction: mockExtraction(),
        constraints,
      }]);

      expect(result.stats.totalConstraints).toBe(2);
      expect(result.stats.appliedConstraints).toBe(2);
      expect(result.stats.compilationTimeMs).toBeGreaterThanOrEqual(0);
    });
  });

  describe("createLock", () => {
    it("should create governance.lock from AIR", async () => {
      const compiler = new PolicyCompiler();
      const compileResult = await compiler.compile([{
        source: { type: "manual", uri: "policy.yaml" },
        extraction: mockExtraction(),
        constraints: [
          mockConstraint("require_golden_thread", "build", true),
        ],
      }]);

      expect(compileResult.air).toBeDefined();
      const lock = await compiler.createLock(compileResult.air!);

      expect(lock.version).toBe("1.0");
      expect(lock.policy_hash).toMatch(/^sha256:[a-f0-9]{64}$/);
      expect(lock.expires_at).toBeDefined();
    });
  });
});

describe("detectConflicts", () => {
  it("should detect no conflicts in empty list", () => {
    const conflicts = detectConflicts([]);
    expect(conflicts).toHaveLength(0);
  });

  it("should detect no conflicts in non-conflicting constraints", () => {
    const constraints: ExtractedConstraint[] = [
      mockConstraint("allowed_vendor", "registry", "openai"),
      mockConstraint("pii_filter", "runtime", { enabled: true }),
    ];

    const conflicts = detectConflicts(constraints);
    expect(conflicts).toHaveLength(0);
  });

  it("should detect vendor allow/block conflict", () => {
    const constraints: ExtractedConstraint[] = [
      mockConstraint("allowed_vendor", "registry", "openai"),
      mockConstraint("blocked_vendor", "registry", "openai"),
    ];

    const conflicts = detectConflicts(constraints);
    expect(conflicts.length).toBeGreaterThan(0);
    expect(conflicts[0].severity).toBe("error");
  });

  it("should detect model allow/block conflict", () => {
    const constraints: ExtractedConstraint[] = [
      mockConstraint("allowed_model", "registry", "gpt-4"),
      mockConstraint("blocked_model", "registry", "gpt-4"),
    ];

    const conflicts = detectConflicts(constraints);
    expect(conflicts.length).toBeGreaterThan(0);
  });

  it("should detect region allow/block conflict", () => {
    const constraints: ExtractedConstraint[] = [
      mockConstraint("allowed_region", "registry", "us-east-1"),
      mockConstraint("blocked_region", "registry", "us-east-1"),
    ];

    const conflicts = detectConflicts(constraints);
    expect(conflicts.length).toBeGreaterThan(0);
  });

  it("should detect duplicate constraints with different values", () => {
    const constraints: ExtractedConstraint[] = [
      mockConstraint("data_retention", "runtime", 30),
      mockConstraint("data_retention", "runtime", 90),
    ];

    const conflicts = detectConflicts(constraints);
    expect(conflicts.length).toBeGreaterThan(0);
    expect(conflicts[0].description).toContain("data_retention");
  });
});

describe("mergeConstraints", () => {
  it("should merge constraints from multiple sources", () => {
    const set1: ExtractedConstraint[] = [
      mockConstraint("allowed_vendor", "registry", "openai"),
    ];
    const set2: ExtractedConstraint[] = [
      mockConstraint("allowed_vendor", "registry", "anthropic"),
    ];

    const result = mergeConstraints([set1, set2], {
      conflictResolution: "most_strict",
      minConfidence: 0.5,
      strictMode: false,
      defaultExpirationDays: 30,
    });

    expect(result.merged.length).toBe(2);
    expect(result.conflicts).toHaveLength(0);
  });

  it("should apply first_wins resolution strategy", () => {
    const set1: ExtractedConstraint[] = [
      mockConstraint("data_retention", "runtime", 30),
    ];
    const set2: ExtractedConstraint[] = [
      mockConstraint("data_retention", "runtime", 90),
    ];

    const result = mergeConstraints([set1, set2], {
      conflictResolution: "first_wins",
      minConfidence: 0.5,
      strictMode: false,
      defaultExpirationDays: 30,
    });

    const retentionConstraints = result.merged.filter(c => c.type === "data_retention");
    expect(retentionConstraints.length).toBe(1);
    expect(retentionConstraints[0].value).toBe(30);
  });

  it("should apply last_wins resolution strategy", () => {
    const set1: ExtractedConstraint[] = [
      mockConstraint("data_retention", "runtime", 30),
    ];
    const set2: ExtractedConstraint[] = [
      mockConstraint("data_retention", "runtime", 90),
    ];

    const result = mergeConstraints([set1, set2], {
      conflictResolution: "last_wins",
      minConfidence: 0.5,
      strictMode: false,
      defaultExpirationDays: 30,
    });

    const retentionConstraints = result.merged.filter(c => c.type === "data_retention");
    expect(retentionConstraints.length).toBe(1);
    expect(retentionConstraints[0].value).toBe(90);
  });

  it("should apply most_strict resolution for numeric values", () => {
    const set1: ExtractedConstraint[] = [
      mockConstraint("data_retention", "runtime", 90),
    ];
    const set2: ExtractedConstraint[] = [
      mockConstraint("data_retention", "runtime", 30),
    ];

    const result = mergeConstraints([set1, set2], {
      conflictResolution: "most_strict",
      minConfidence: 0.5,
      strictMode: false,
      defaultExpirationDays: 30,
    });

    const retentionConstraints = result.merged.filter(c => c.type === "data_retention");
    expect(retentionConstraints.length).toBe(1);
    // Most strict = lowest retention period
    expect(retentionConstraints[0].value).toBe(30);
  });
});

describe("createCompiler", () => {
  it("should create compiler with default config", () => {
    const compiler = createCompiler();
    expect(compiler).toBeInstanceOf(PolicyCompiler);
  });

  it("should create compiler with custom config", () => {
    const compiler = createCompiler({
      minConfidence: 0.9,
      strictMode: true,
      defaultExpirationDays: 7,
    });
    expect(compiler).toBeInstanceOf(PolicyCompiler);
  });
});
