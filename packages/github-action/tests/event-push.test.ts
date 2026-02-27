import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  GovernanceEventBuilder,
  type BuilderConfig,
  type GovernanceEvent,
} from "@aigrc/events";
import {
  createActionBuilder,
  buildScanEvents,
  buildCardEvents,
  buildPolicyEvents,
  buildPrGoldenThread,
  buildOrphanGoldenThread,
} from "../src/event-push.js";

// ─────────────────────────────────────────────────────────────────
// TESTS: createActionBuilder
// ─────────────────────────────────────────────────────────────────

describe("GitHub Action EventPush — Builder Factory", () => {
  it("creates builder with github-action tool source", () => {
    const builder = createActionBuilder("org-acme");

    const event = builder.assetCreated({
      assetId: "test-asset",
      goldenThread: {
        type: "orphan",
        reason: "discovery",
        declaredBy: "github-action",
        declaredAt: new Date().toISOString(),
        remediationDeadline: new Date(
          Date.now() + 30 * 24 * 60 * 60 * 1000,
        ).toISOString(),
        remediationNote: "Test event from GitHub Action builder.",
      },
      data: { cardId: "test-asset", cardVersion: "1.0.0" },
    });

    expect(event.source.tool).toBe("github-action");
    expect(event.source.orgId).toBe("org-acme");
    expect(event.source.identity.type).toBe("service-token");
    expect(event.source.environment).toBe("ci");
  });
});

// ─────────────────────────────────────────────────────────────────
// TESTS: buildScanEvents
// ─────────────────────────────────────────────────────────────────

describe("GitHub Action EventPush — Scan Events", () => {
  it("produces scan.started + scan.completed events", () => {
    const builder = createActionBuilder("org-test");
    const goldenThread = buildOrphanGoldenThread();

    const scanResult = {
      detections: [
        { framework: "openai", category: "llm", confidence: "high" as const, file: "src/index.ts", line: 1, column: 1, snippet: "import OpenAI" },
        { framework: "langchain", category: "agent", confidence: "medium" as const, file: "src/agent.ts", line: 5, column: 1, snippet: "from langchain" },
      ],
      scannedFiles: 50,
      summary: {
        byFramework: { openai: 1, langchain: 1 },
        byConfidence: { high: 1, medium: 1, low: 0 },
        byCategory: { llm: 1, agent: 1 },
      },
      inferredRiskFactors: {},
    } as any;

    const events = buildScanEvents(scanResult, builder, goldenThread, "corr_test");

    expect(events).toHaveLength(2);
    expect(events[0].type).toBe("aigrc.scan.started");
    expect(events[1].type).toBe("aigrc.scan.completed");
    expect(events[0].correlationId).toBe("corr_test");
    expect(events[1].correlationId).toBe("corr_test");
    expect((events[1].data as any).findingsCount).toBe(2);
  });
});

// ─────────────────────────────────────────────────────────────────
// TESTS: buildCardEvents
// ─────────────────────────────────────────────────────────────────

describe("GitHub Action EventPush — Card Events", () => {
  it("produces asset.created for each valid card", () => {
    const builder = createActionBuilder("org-test");
    const goldenThread = buildPrGoldenThread("owner", "repo", 42);

    const cardResults = [
      {
        path: "/cards/agent.yaml",
        card: { name: "My Agent", assetId: "agent-001" } as any,
        valid: true,
        errors: [],
        classification: { riskLevel: "high", reasons: [], euAiActCategory: "", requiredArtifacts: [] },
      },
      {
        path: "/cards/model.yaml",
        card: { name: "My Model", assetId: "model-001" } as any,
        valid: true,
        errors: [],
        classification: { riskLevel: "limited", reasons: [], euAiActCategory: "", requiredArtifacts: [] },
      },
      {
        path: "/cards/invalid.yaml",
        card: { name: "Invalid" } as any,
        valid: false,
        errors: ["Missing required field"],
        classification: { riskLevel: "minimal", reasons: [], euAiActCategory: "", requiredArtifacts: [] },
      },
    ];

    const events = buildCardEvents(cardResults, builder, goldenThread, "corr_pr_42");

    // Should only include valid cards (2 of 3)
    expect(events).toHaveLength(2);
    expect(events[0].type).toBe("aigrc.asset.created");
    expect(events[0].assetId).toBe("agent-001");
    expect(events[1].assetId).toBe("model-001");
    expect(events[0].correlationId).toBe("corr_pr_42");
  });
});

// ─────────────────────────────────────────────────────────────────
// TESTS: buildPolicyEvents
// ─────────────────────────────────────────────────────────────────

describe("GitHub Action EventPush — Policy Events", () => {
  it("produces compliance.evaluated event", () => {
    const builder = createActionBuilder("org-test");
    const goldenThread = buildOrphanGoldenThread();

    const policyResult = {
      passed: false,
      violations: [
        { rule: "no-openai", severity: "error", message: "OpenAI not allowed" },
        { rule: "approved-models", severity: "warning", message: "Model not approved" },
      ],
    };

    const events = buildPolicyEvents(policyResult, builder, goldenThread, "corr_test");

    expect(events).toHaveLength(1);
    expect(events[0].type).toBe("aigrc.compliance.evaluated");
    expect((events[0].data as any).overallResult).toBe("fail");
    expect((events[0].data as any).findingsCount).toBe(2);
    expect((events[0].data as any).criticalFindings).toBe(1);
  });

  it("produces pass result when policy passes", () => {
    const builder = createActionBuilder("org-test");
    const goldenThread = buildOrphanGoldenThread();

    const policyResult = {
      passed: true,
      violations: [],
    };

    const events = buildPolicyEvents(policyResult, builder, goldenThread);

    expect(events).toHaveLength(1);
    expect((events[0].data as any).overallResult).toBe("pass");
    expect((events[0].data as any).findingsCount).toBe(0);
    expect((events[0].data as any).criticalFindings).toBe(0);
  });
});

// ─────────────────────────────────────────────────────────────────
// TESTS: Golden Thread
// ─────────────────────────────────────────────────────────────────

describe("GitHub Action EventPush — Golden Thread", () => {
  it("PR golden thread has correct format", () => {
    const gt = buildPrGoldenThread("myorg", "myrepo", 123);

    expect(gt.type).toBe("linked");
    expect((gt as any).system).toBe("github");
    expect((gt as any).ref).toBe("myorg/myrepo#123");
    expect((gt as any).url).toBe("https://github.com/myorg/myrepo/pull/123");
    expect((gt as any).status).toBe("active");
  });

  it("orphan golden thread has correct structure", () => {
    const gt = buildOrphanGoldenThread();

    expect(gt.type).toBe("orphan");
    expect((gt as any).reason).toBe("discovery");
    expect((gt as any).declaredBy).toBe("github-action");
    expect((gt as any).remediationDeadline).toBeTruthy();
  });
});

// ─────────────────────────────────────────────────────────────────
// TESTS: All Events Have CorrelationId
// ─────────────────────────────────────────────────────────────────

describe("GitHub Action EventPush — Correlation", () => {
  it("all events share the same correlationId", () => {
    const builder = createActionBuilder("org-test");
    const goldenThread = buildPrGoldenThread("o", "r", 1);
    const correlationId = "corr_pr_1_governance_check";

    const scanEvents = buildScanEvents(
      { detections: [], scannedFiles: 0, summary: { byFramework: {}, byConfidence: { high: 0, medium: 0, low: 0 }, byCategory: {} }, inferredRiskFactors: {} } as any,
      builder,
      goldenThread,
      correlationId,
    );

    const cardEvents = buildCardEvents(
      [{ path: "x.yaml", card: { name: "X", assetId: "x" } as any, valid: true, errors: [], classification: { riskLevel: "minimal", reasons: [], euAiActCategory: "", requiredArtifacts: [] } }],
      builder,
      goldenThread,
      correlationId,
    );

    const policyEvents = buildPolicyEvents(
      { passed: true, violations: [] },
      builder,
      goldenThread,
      correlationId,
    );

    const allEvents = [...scanEvents, ...cardEvents, ...policyEvents];

    for (const event of allEvents) {
      expect(event.correlationId).toBe(correlationId);
    }
  });
});
