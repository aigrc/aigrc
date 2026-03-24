// ─────────────────────────────────────────────────────────────────
// PangoGuard — Artifact Generator Tests
// ─────────────────────────────────────────────────────────────────

import { describe, it, expect } from "vitest";
import { generateAssetCardYaml, generateAigrcConfig } from "../../src/output/artifact-generator.js";
import type { AppScanResult } from "../../src/types.js";

function createMockResult(overrides: Partial<AppScanResult> = {}): AppScanResult {
  return {
    scanResult: {
      detections: [
        {
          filePath: "src/agent.ts",
          framework: "OpenAI",
          category: "llm_provider",
          confidence: "high",
          line: 1,
          matchedPattern: 'import OpenAI from "openai"',
          riskFactors: ["uses_external_api"],
        },
      ],
      summary: {
        totalDetections: 1,
        primaryFramework: "OpenAI",
        byFramework: { OpenAI: 1 },
        byCategory: { llm_provider: 1 },
        byConfidence: { high: 1 },
      },
    } as any,
    classification: {
      riskLevel: "high",
      reasons: ["LLM provider detected"],
      recommendations: [],
    } as any,
    tier: "L2",
    tierLabel: "HIGH",
    agenticElevations: [],
    regulatoryMapping: {
      euAiAct: { classification: "High-Risk", articles: ["Art. 9"], obligations: [] },
      nistRmf: { functions: ["MAP"], subcategories: [], actions: [] },
      iso42001: { clauses: ["8.3"], obligations: [], controls: [] },
    },
    detectedCapabilities: ["LLM API access"],
    governanceStatus: "ungoverned",
    ...overrides,
  };
}

describe("generateAssetCardYaml", () => {
  it("should generate valid YAML with risk level", () => {
    const yaml = generateAssetCardYaml(createMockResult());
    expect(yaml).toContain('riskLevel: "high"');
    expect(yaml).toContain("AIGRC Asset Card");
  });

  it("should include detected framework", () => {
    const yaml = generateAssetCardYaml(createMockResult());
    expect(yaml).toContain("OpenAI");
  });

  it("should include risk factors section", () => {
    const yaml = generateAssetCardYaml(createMockResult());
    expect(yaml).toContain("riskFactors:");
    expect(yaml).toContain("toolExecution:");
    expect(yaml).toContain("piiProcessing:");
  });

  it("should include source file paths", () => {
    const yaml = generateAssetCardYaml(createMockResult());
    expect(yaml).toContain("src/agent.ts");
  });
});

describe("generateAigrcConfig", () => {
  it("should generate valid YAML config", () => {
    const config = generateAigrcConfig();
    expect(config).toContain("AIGRC Configuration");
    expect(config).toContain("policy_paths");
  });
});
