// ─────────────────────────────────────────────────────────────────
// PangoGuard — Issue Creator Tests
// ─────────────────────────────────────────────────────────────────

import { describe, it, expect, vi, beforeEach } from "vitest";
import { createGovernanceIssue } from "../../src/output/issue-creator.js";
import type { AppScanResult } from "../../src/types.js";

function createMockOctokit() {
  return {
    issues: {
      create: vi.fn().mockResolvedValue({ data: { number: 42 } }),
      getLabel: vi.fn().mockRejectedValue(new Error("Not found")),
      createLabel: vi.fn().mockResolvedValue({}),
      listForRepo: vi.fn().mockResolvedValue({ data: [] }),
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
      euAiAct: { classification: "High-Risk", articles: ["Art. 9"], obligations: ["Comply with Art. 9-14"] },
      nistRmf: { functions: ["MAP"], subcategories: [], actions: [] },
      iso42001: { clauses: [], obligations: [], controls: [] },
    },
    detectedCapabilities: ["LLM API access"],
    governanceStatus: "ungoverned",
    ...overrides,
  };
}

describe("createGovernanceIssue", () => {
  let octokit: ReturnType<typeof createMockOctokit>;

  beforeEach(() => {
    octokit = createMockOctokit();
  });

  it("should create an ungoverned_asset issue with correct labels", async () => {
    await createGovernanceIssue(octokit, "owner", "repo", "ungoverned_asset", {
      scanResult: createMockResult(),
      commitSha: "abc12345",
      changedFiles: ["src/agent.ts"],
    });

    expect(octokit.issues.create).toHaveBeenCalledOnce();
    const call = octokit.issues.create.mock.calls[0][0];
    expect(call.labels).toContain("pangoguard");
    expect(call.labels).toContain("ai-governance");
    expect(call.labels).toContain("ungoverned");
    expect(call.body).toContain("Ungoverned AI Asset");
    expect(call.body).toContain("PangoGuard");
  });

  it("should create a shadow_inventory issue", async () => {
    await createGovernanceIssue(octokit, "owner", "repo", "shadow_inventory", {
      scanResult: createMockResult(),
      repoFullName: "owner/repo",
    });

    expect(octokit.issues.create).toHaveBeenCalledOnce();
    const call = octokit.issues.create.mock.calls[0][0];
    expect(call.title).toContain("Shadow AI Inventory");
    expect(call.body).toContain("PangoGuard has scanned");
    expect(call.labels).toContain("shadow-inventory");
  });

  it("should create a ciso_alert issue for L3 detections", async () => {
    await createGovernanceIssue(octokit, "owner", "repo", "ciso_alert", {
      scanResult: createMockResult({ tier: "L3", tierLabel: "UNACCEPTABLE" }),
    });

    expect(octokit.issues.create).toHaveBeenCalledOnce();
    const call = octokit.issues.create.mock.calls[0][0];
    expect(call.title).toContain("CISO ALERT");
    expect(call.title).toContain("L3 UNACCEPTABLE");
    expect(call.labels).toContain("ciso-alert");
    expect(call.labels).toContain("urgent");
    expect(call.body).toContain("IMMEDIATE ATTENTION REQUIRED");
  });

  it("should skip duplicate issues", async () => {
    octokit.issues.listForRepo.mockResolvedValue({
      data: [{ title: "⚠️ Ungoverned AI Asset Detected — L2 HIGH" }],
    });

    await createGovernanceIssue(octokit, "owner", "repo", "ungoverned_asset", {
      scanResult: createMockResult(),
      commitSha: "abc12345",
    });

    expect(octokit.issues.create).not.toHaveBeenCalled();
  });

  it("should ensure labels exist before creating issue", async () => {
    await createGovernanceIssue(octokit, "owner", "repo", "ungoverned_asset", {
      scanResult: createMockResult(),
      commitSha: "abc12345",
    });

    // Should try to get each label and create if not found
    expect(octokit.issues.getLabel).toHaveBeenCalled();
    expect(octokit.issues.createLabel).toHaveBeenCalled();
  });
});
