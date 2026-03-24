// ─────────────────────────────────────────────────────────────────
// @aigrc/github-app — Comment Template Tests
// ─────────────────────────────────────────────────────────────────

import { describe, it, expect } from "vitest";
import { renderComment } from "../../src/output/comment-renderer.js";
import type { AppScanResult } from "../../src/types.js";

function createMockResult(overrides: Partial<AppScanResult> = {}): AppScanResult {
  return {
    scanResult: {
      detections: [
        {
          filePath: "src/agent.ts",
          line: 5,
          match: "import OpenAI",
          framework: "OpenAI",
          category: "llm_provider",
          confidence: "high",
          strategy: "import",
          implies: [],
        },
      ],
      summary: {
        totalDetections: 1,
        byFramework: { OpenAI: 1 },
        byCategory: { llm_provider: 1 } as any,
        byConfidence: { high: 1 } as any,
        primaryFramework: "OpenAI",
      },
      inferredRiskFactors: {},
      suggestedTechnical: {},
      scannedFiles: 5,
      skippedFiles: 0,
      duration: 100,
    },
    classification: {
      riskLevel: "minimal",
      reasons: ["No significant risk"],
      euAiActCategory: "minimal_risk",
      requiredArtifacts: [],
    },
    tier: "L0",
    tierLabel: "MINIMAL",
    agenticElevations: [],
    regulatoryMapping: {
      euAiAct: { classification: "Minimal Risk", articles: [], obligations: [] },
      nistRmf: { functions: ["GOVERN"], subcategories: [], actions: [] },
      iso42001: { clauses: [], obligations: [], controls: [] },
    },
    detectedCapabilities: ["LLM API access"],
    governanceStatus: "ungoverned",
    confidenceThreshold: "medium",
    ...overrides,
  };
}

describe("renderComment", () => {
  it("should render L0 MINIMAL comment", () => {
    const result = createMockResult({ tier: "L0", tierLabel: "MINIMAL" });
    const comment = renderComment(result);

    expect(comment).toContain("L0 MINIMAL");
    expect(comment).toContain("1 AI component");
    expect(comment).toContain("no action required");
    expect(comment).toContain("PangoGuard");
  });

  it("should render L1 LIMITED comment with checklist", () => {
    const result = createMockResult({
      tier: "L1",
      tierLabel: "LIMITED",
      classification: {
        riskLevel: "limited",
        reasons: ["Customer-facing"],
        euAiActCategory: "limited_risk",
        requiredArtifacts: [],
      },
    });
    const comment = renderComment(result);

    expect(comment).toContain("L1 LIMITED");
    expect(comment).toContain("Required Actions");
    expect(comment).toContain("30 days");
    expect(comment).toContain("aigrc init");
  });

  it("should render L2 HIGH comment with governance steps", () => {
    const result = createMockResult({
      tier: "L2",
      tierLabel: "HIGH",
      classification: {
        riskLevel: "high",
        reasons: ["Autonomous decisions"],
        euAiActCategory: "high_risk",
        requiredArtifacts: ["risk_assessment"],
      },
    });
    const comment = renderComment(result);

    expect(comment).toContain("L2 HIGH");
    expect(comment).toContain("Required Steps");
    expect(comment).toContain("Asset Card");
    expect(comment).toContain("Human Oversight");
    expect(comment).toContain("Auto-Instrumentation");
  });

  it("should render L3 UNACCEPTABLE comment with CISO alert", () => {
    const result = createMockResult({
      tier: "L3",
      tierLabel: "UNACCEPTABLE",
      classification: {
        riskLevel: "unacceptable",
        reasons: ["Agent spawns agents without oversight"],
        euAiActCategory: "prohibited",
        requiredArtifacts: [],
      },
    });
    const comment = renderComment(result);

    expect(comment).toContain("L3 UNACCEPTABLE");
    expect(comment).toContain("DO NOT MERGE");
    expect(comment).toContain("CISO");
    expect(comment).toContain("Legal Review");
  });

  it("should render governed comment for approved assets", () => {
    const result = createMockResult({
      governanceStatus: "approved",
      existingCard: {
        id: "aigrc-2024-abcd1234",
      } as any,
    });
    const comment = renderComment(result);

    expect(comment).toContain("GOVERNED");
    expect(comment).toContain("aigrc-2024-abcd1234");
    expect(comment).toContain("can proceed");
  });

  it("should include agentic warnings when elevations present", () => {
    const result = createMockResult({
      tier: "L2",
      tierLabel: "HIGH",
      agenticElevations: [
        {
          pattern: "hitl_bypass",
          indicator: "HITL bypass detected",
          riskElevation: 2,
          critical: true,
          filePath: "agent.ts",
          line: 10,
        },
      ],
    });
    const comment = renderComment(result);

    expect(comment).toContain("Agentic Risk Elevations");
    expect(comment).toContain("CRITICAL");
    expect(comment).toContain("HITL bypass");
  });

  it("should include detection table", () => {
    const result = createMockResult();
    const comment = renderComment(result);

    expect(comment).toContain("src/agent.ts");
    expect(comment).toContain("OpenAI");
  });
});
