// ─────────────────────────────────────────────────────────────────
// @aigrc/github-app — Tier Mapper Tests
// ─────────────────────────────────────────────────────────────────

import { describe, it, expect } from "vitest";
import { mapToTier } from "../../src/classification/tier-mapper.js";
import type { ClassificationResult } from "@aigrc/core";
import type { AgenticElevation } from "../../src/types.js";

describe("mapToTier", () => {
  const minimalClassification: ClassificationResult = {
    riskLevel: "minimal",
    reasons: ["No significant risk factors"],
    euAiActCategory: "minimal_risk",
    requiredArtifacts: [],
  };

  const limitedClassification: ClassificationResult = {
    riskLevel: "limited",
    reasons: ["Customer-facing AI requires transparency"],
    euAiActCategory: "limited_risk",
    requiredArtifacts: ["transparency_notice"],
  };

  const highClassification: ClassificationResult = {
    riskLevel: "high",
    reasons: ["Makes high-stakes decisions"],
    euAiActCategory: "high_risk",
    requiredArtifacts: ["risk_assessment", "human_oversight_plan"],
  };

  it("should map minimal risk to L0", () => {
    const result = mapToTier(minimalClassification, []);
    expect(result.tier).toBe("L0");
    expect(result.tierLabel).toBe("MINIMAL");
    expect(result.baseTier).toBe("L0");
    expect(result.elevatedBy).toBe(0);
  });

  it("should map limited risk to L1", () => {
    const result = mapToTier(limitedClassification, []);
    expect(result.tier).toBe("L1");
    expect(result.tierLabel).toBe("LIMITED");
  });

  it("should map high risk to L2", () => {
    const result = mapToTier(highClassification, []);
    expect(result.tier).toBe("L2");
    expect(result.tierLabel).toBe("HIGH");
  });

  it("should elevate minimal to L1 with +1 agentic elevation", () => {
    const elevations: AgenticElevation[] = [
      {
        pattern: "tool_execution_loop",
        indicator: "Tool execution in a loop",
        riskElevation: 1,
        critical: false,
        filePath: "test.ts",
        line: 10,
      },
    ];

    const result = mapToTier(minimalClassification, elevations);
    expect(result.tier).toBe("L1");
    expect(result.baseTier).toBe("L0");
    expect(result.elevatedBy).toBe(1);
  });

  it("should elevate minimal to L2 with +2 agentic elevation", () => {
    const elevations: AgenticElevation[] = [
      {
        pattern: "hitl_bypass",
        indicator: "HITL bypass detected",
        riskElevation: 2,
        critical: true,
        filePath: "test.ts",
        line: 5,
      },
    ];

    const result = mapToTier(minimalClassification, elevations);
    expect(result.tier).toBe("L2");
    expect(result.baseTier).toBe("L0");
    expect(result.elevatedBy).toBe(2);
  });

  it("should clamp at L3 when elevation exceeds max", () => {
    const elevations: AgenticElevation[] = [
      {
        pattern: "hitl_bypass",
        indicator: "HITL bypass",
        riskElevation: 2,
        critical: true,
        filePath: "a.ts",
        line: 1,
      },
      {
        pattern: "agent_spawning_agents",
        indicator: "Agent spawning",
        riskElevation: 2,
        critical: true,
        filePath: "b.ts",
        line: 1,
      },
    ];

    const result = mapToTier(highClassification, elevations);
    expect(result.tier).toBe("L3");
    expect(result.tierLabel).toBe("UNACCEPTABLE");
    expect(result.baseTier).toBe("L2");
    expect(result.elevatedBy).toBe(4);
  });

  it("should include elevation reasons in result", () => {
    const elevations: AgenticElevation[] = [
      {
        pattern: "tool_execution_loop",
        indicator: "Tool execution within a loop",
        riskElevation: 1,
        critical: false,
        filePath: "test.ts",
        line: 10,
      },
    ];

    const result = mapToTier(minimalClassification, elevations);
    expect(result.reasons).toContain("No significant risk factors");
    expect(result.reasons.some((r) => r.includes("+1 tier elevation"))).toBe(true);
  });

  it("should mark critical elevations in reasons", () => {
    const elevations: AgenticElevation[] = [
      {
        pattern: "hitl_bypass",
        indicator: "HITL bypass",
        riskElevation: 2,
        critical: true,
        filePath: "test.ts",
        line: 1,
      },
    ];

    const result = mapToTier(minimalClassification, elevations);
    expect(result.reasons.some((r) => r.includes("[CRITICAL]"))).toBe(true);
  });
});
