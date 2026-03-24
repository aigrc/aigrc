// ─────────────────────────────────────────────────────────────────
// PangoGuard — Check Run Tests
// ─────────────────────────────────────────────────────────────────

import { describe, it, expect, vi } from "vitest";
import { createCheckRun } from "../../src/output/check-run.js";
import type { AppScanResult } from "../../src/types.js";

function createMockOctokit() {
  return {
    checks: {
      create: vi.fn().mockResolvedValue({ data: { id: 1 } }),
    },
  } as any;
}

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

describe("createCheckRun", () => {
  it("should create a check run with PangoGuard name", async () => {
    const octokit = createMockOctokit();
    const result = createMockResult();

    await createCheckRun(octokit, "owner", "repo", "abc123", result);

    expect(octokit.checks.create).toHaveBeenCalledOnce();
    const call = octokit.checks.create.mock.calls[0][0];
    expect(call.name).toBe("PangoGuard");
    expect(call.head_sha).toBe("abc123");
    expect(call.status).toBe("completed");
  });

  it("should use neutral conclusion for detections (warn-only)", async () => {
    const octokit = createMockOctokit();
    const result = createMockResult();

    await createCheckRun(octokit, "owner", "repo", "abc123", result);

    const call = octokit.checks.create.mock.calls[0][0];
    expect(call.conclusion).toBe("neutral");
  });

  it("should use success conclusion when no detections", async () => {
    const octokit = createMockOctokit();
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
      tier: "L0",
      tierLabel: "MINIMAL",
    });

    await createCheckRun(octokit, "owner", "repo", "abc123", result);

    const call = octokit.checks.create.mock.calls[0][0];
    expect(call.conclusion).toBe("success");
  });

  it("should include tier and detection count in summary", async () => {
    const octokit = createMockOctokit();
    const result = createMockResult();

    await createCheckRun(octokit, "owner", "repo", "abc123", result);

    const call = octokit.checks.create.mock.calls[0][0];
    expect(call.output.summary).toContain("L2");
    expect(call.output.summary).toContain("1");
  });
});
