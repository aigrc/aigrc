// ─────────────────────────────────────────────────────────────────
// PangoGuard — Instrumentation Engine Tests
// ─────────────────────────────────────────────────────────────────

import { describe, it, expect } from "vitest";
import { generateInstrumentation, SUPPORTED_FRAMEWORKS } from "../../src/instrumentation/instrumentor.js";
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
          riskFactors: [],
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
      euAiAct: { classification: "High-Risk", articles: [], obligations: [] },
      nistRmf: { functions: ["MAP"], subcategories: [], actions: [] },
      iso42001: { clauses: [], obligations: [], controls: [] },
    },
    detectedCapabilities: ["LLM API access"],
    governanceStatus: "ungoverned",
    ...overrides,
  };
}

describe("generateInstrumentation", () => {
  it("should generate OpenAI wrapper for OpenAI detection", () => {
    const result = createMockResult();
    const wrappers = generateInstrumentation(result);

    expect(wrappers).toHaveLength(1);
    expect(wrappers[0].framework).toBe("openai");
    expect(wrappers[0].language).toBe("typescript");
    expect(wrappers[0].filePath).toContain("openai.governed.ts");
    expect(wrappers[0].content).toContain("governedCall");
    expect(wrappers[0].content).toContain("@aigrc/runtime-sdk");
  });

  it("should generate Anthropic wrapper for Anthropic SDK detection", () => {
    const result = createMockResult({
      scanResult: {
        detections: [
          {
            filePath: "src/chat.ts",
            framework: "Anthropic SDK",
            category: "llm_provider",
            confidence: "high",
            line: 1,
            matchedPattern: 'import Anthropic from "@anthropic-ai/sdk"',
            riskFactors: [],
          },
        ],
        summary: {
          totalDetections: 1,
          primaryFramework: "Anthropic SDK",
          byFramework: { "Anthropic SDK": 1 },
          byCategory: { llm_provider: 1 },
          byConfidence: { high: 1 },
        },
      } as any,
    });

    const wrappers = generateInstrumentation(result);
    expect(wrappers).toHaveLength(1);
    expect(wrappers[0].framework).toBe("anthropic-sdk");
    expect(wrappers[0].content).toContain("Anthropic");
  });

  it("should generate Python wrapper for LangChain detection", () => {
    const result = createMockResult({
      scanResult: {
        detections: [
          {
            filePath: "agent.py",
            framework: "LangChain",
            category: "agent_framework",
            confidence: "high",
            line: 1,
            matchedPattern: "from langchain import",
            riskFactors: [],
          },
        ],
        summary: {
          totalDetections: 1,
          primaryFramework: "LangChain",
          byFramework: { LangChain: 1 },
          byCategory: { agent_framework: 1 },
          byConfidence: { high: 1 },
        },
      } as any,
    });

    const wrappers = generateInstrumentation(result);
    expect(wrappers).toHaveLength(1);
    expect(wrappers[0].framework).toBe("langchain");
    expect(wrappers[0].language).toBe("python");
    expect(wrappers[0].filePath).toContain(".py");
  });

  it("should deduplicate wrappers — one per framework", () => {
    const result = createMockResult({
      scanResult: {
        detections: [
          {
            filePath: "src/a.ts",
            framework: "OpenAI",
            category: "llm_provider",
            confidence: "high",
            line: 1,
            matchedPattern: "import",
            riskFactors: [],
          },
          {
            filePath: "src/b.ts",
            framework: "OpenAI",
            category: "llm_provider",
            confidence: "high",
            line: 5,
            matchedPattern: "import",
            riskFactors: [],
          },
        ],
        summary: {
          totalDetections: 2,
          primaryFramework: "OpenAI",
          byFramework: { OpenAI: 2 },
          byCategory: { llm_provider: 2 },
          byConfidence: { high: 2 },
        },
      } as any,
    });

    const wrappers = generateInstrumentation(result);
    expect(wrappers).toHaveLength(1);
  });

  it("should skip unsupported frameworks", () => {
    const result = createMockResult({
      scanResult: {
        detections: [
          {
            filePath: "src/custom.ts",
            framework: "Unknown AI Framework",
            category: "other",
            confidence: "low",
            line: 1,
            matchedPattern: "import",
            riskFactors: [],
          },
        ],
        summary: {
          totalDetections: 1,
          primaryFramework: "Unknown AI Framework",
          byFramework: { "Unknown AI Framework": 1 },
          byCategory: { other: 1 },
          byConfidence: { low: 1 },
        },
      } as any,
    });

    const wrappers = generateInstrumentation(result);
    expect(wrappers).toHaveLength(0);
  });

  it("should return empty array when no detections", () => {
    const result = createMockResult({
      scanResult: {
        detections: [],
        summary: {
          totalDetections: 0,
          primaryFramework: undefined,
          byFramework: {},
          byCategory: {},
          byConfidence: {},
        },
      } as any,
    });

    const wrappers = generateInstrumentation(result);
    expect(wrappers).toHaveLength(0);
  });

  it("should include risk tier in generated wrapper content", () => {
    const result = createMockResult({ tier: "L3", tierLabel: "UNACCEPTABLE" });
    const wrappers = generateInstrumentation(result);

    expect(wrappers[0].content).toContain("L3");
    expect(wrappers[0].content).toContain("UNACCEPTABLE");
  });
});

describe("SUPPORTED_FRAMEWORKS", () => {
  it("should include 10 supported frameworks", () => {
    expect(SUPPORTED_FRAMEWORKS.size).toBe(10);
  });

  it("should include MCP frameworks", () => {
    expect(SUPPORTED_FRAMEWORKS.has("mcp-sdk-ts")).toBe(true);
    expect(SUPPORTED_FRAMEWORKS.has("mcp-sdk-py")).toBe(true);
    expect(SUPPORTED_FRAMEWORKS.has("fastmcp")).toBe(true);
  });

  it("should include agent frameworks", () => {
    expect(SUPPORTED_FRAMEWORKS.has("langchain")).toBe(true);
    expect(SUPPORTED_FRAMEWORKS.has("crewai")).toBe(true);
    expect(SUPPORTED_FRAMEWORKS.has("mastra")).toBe(true);
  });
});
