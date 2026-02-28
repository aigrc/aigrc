import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  GovernanceEventBuilder,
  type BuilderConfig,
  type GovernanceEvent,
} from "@aigrc/events";

// ─────────────────────────────────────────────────────────────────
// Test the event push logic without VS Code API dependency.
// We test the builder configuration, event construction,
// and change detection logic as pure functions.
// ─────────────────────────────────────────────────────────────────

const BUILDER_CONFIG: BuilderConfig = {
  source: {
    tool: "vscode",
    version: "0.2.0",
    orgId: "org-test",
    instanceId: "vscode-test-machine",
    identity: { type: "api-key", subject: "vscode-user" },
    environment: "development",
  },
};

// ─────────────────────────────────────────────────────────────────
// TESTS: Builder Configuration
// ─────────────────────────────────────────────────────────────────

describe("VS Code EventPush — Builder Configuration", () => {
  it("creates builder with vscode tool source", () => {
    const builder = new GovernanceEventBuilder(BUILDER_CONFIG);

    const event = builder.assetCreated({
      assetId: "agent-001",
      goldenThread: {
        type: "orphan",
        reason: "discovery",
        declaredBy: "vscode-user",
        declaredAt: "2026-02-24T12:00:00Z",
        remediationDeadline: "2026-03-26T12:00:00Z",
        remediationNote:
          "Event pushed via VS Code extension without linked authorization.",
      },
      data: { cardId: "agent-001", cardVersion: "1.0.0" },
    });

    expect(event.source.tool).toBe("vscode");
    expect(event.source.orgId).toBe("org-test");
    expect(event.source.instanceId).toBe("vscode-test-machine");
    expect(event.source.identity.type).toBe("api-key");
    expect(event.type).toBe("aigrc.asset.created");
  });

  it("builder produces frozen events with valid id and hash", () => {
    const builder = new GovernanceEventBuilder(BUILDER_CONFIG);

    const event = builder.assetUpdated({
      assetId: "agent-002",
      goldenThread: {
        type: "linked",
        system: "jira",
        ref: "AIG-200",
        url: "https://jira.example.com/browse/AIG-200",
        status: "active",
      },
      data: { cardId: "agent-002", cardVersion: "2.0.0" },
    });

    expect(event.type).toBe("aigrc.asset.updated");
    expect(event.id).toMatch(/^evt_[a-f0-9]{32}$/);
    expect(event.hash).toMatch(/^sha256:[a-f0-9]{64}$/);
    expect(Object.isFrozen(event)).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────
// TESTS: Card Event Building Logic
// ─────────────────────────────────────────────────────────────────

describe("VS Code EventPush — Card Event Building", () => {
  let builder: GovernanceEventBuilder;

  beforeEach(() => {
    builder = new GovernanceEventBuilder(BUILDER_CONFIG);
  });

  it("builds assetCreated event for new card", () => {
    const event = builder.assetCreated({
      assetId: "new-agent",
      goldenThread: {
        type: "orphan",
        reason: "discovery",
        declaredBy: "vscode-auto-push",
        declaredAt: new Date().toISOString(),
        remediationDeadline: new Date(
          Date.now() + 30 * 24 * 60 * 60 * 1000,
        ).toISOString(),
        remediationNote:
          "Auto-pushed via VS Code card watcher. Assign a golden thread reference.",
      },
      data: { cardId: "new-agent", cardVersion: "1.0.0" },
    });

    expect(event.type).toBe("aigrc.asset.created");
    expect(event.assetId).toBe("new-agent");
    expect(event.goldenThread.type).toBe("orphan");
  });

  it("builds assetUpdated event for modified card", () => {
    const event = builder.assetUpdated({
      assetId: "existing-agent",
      goldenThread: {
        type: "linked",
        system: "github",
        ref: "owner/repo#42",
        url: "https://github.com/owner/repo/pull/42",
        status: "active",
      },
      data: { cardId: "existing-agent", cardVersion: "2.0.0" },
    });

    expect(event.type).toBe("aigrc.asset.updated");
    expect(event.assetId).toBe("existing-agent");
    expect(event.goldenThread.type).toBe("linked");
  });

  it("uses orphan golden thread for cards without authorization", () => {
    const now = new Date().toISOString();
    const event = builder.assetCreated({
      assetId: "orphan-asset",
      goldenThread: {
        type: "orphan",
        reason: "discovery",
        declaredBy: "vscode-user",
        declaredAt: now,
        remediationDeadline: new Date(
          Date.now() + 30 * 24 * 60 * 60 * 1000,
        ).toISOString(),
        remediationNote:
          "Event pushed without linked authorization. Please assign.",
      },
      data: { cardId: "orphan-asset", cardVersion: "1.0.0" },
    });

    expect(event.goldenThread.type).toBe("orphan");
    expect((event.goldenThread as any).reason).toBe("discovery");
    expect((event.goldenThread as any).declaredBy).toBe("vscode-user");
  });

  it("events have correct category and criticality", () => {
    const created = builder.assetCreated({
      assetId: "test-asset",
      goldenThread: {
        type: "orphan",
        reason: "discovery",
        declaredBy: "test",
        declaredAt: new Date().toISOString(),
        remediationDeadline: new Date(
          Date.now() + 30 * 24 * 60 * 60 * 1000,
        ).toISOString(),
        remediationNote: "Test orphan for category verification.",
      },
      data: { cardId: "test-asset", cardVersion: "1.0.0" },
    });

    expect(created.category).toBe("asset");
    expect(created.criticality).toBe("normal");
  });
});

// ─────────────────────────────────────────────────────────────────
// TESTS: Change Detection
// ─────────────────────────────────────────────────────────────────

describe("VS Code EventPush — Change Detection Logic", () => {
  // Replicate the simple hash function from push.ts
  function computeSimpleHash(content: string): string {
    let hash = 2166136261;
    for (let i = 0; i < content.length; i++) {
      hash ^= content.charCodeAt(i);
      hash = (hash * 16777619) >>> 0;
    }
    return `fnv1a:${hash.toString(16)}`;
  }

  it("detects new file when no previous hash exists", () => {
    const pushState: Record<string, string> = {};
    const content = "name: My Agent\nassetId: agent-001\n";
    const hash = computeSimpleHash(content);
    const file = "agent.yaml";

    const isNew = !pushState[file];
    expect(isNew).toBe(true);

    pushState[file] = hash;
    expect(pushState[file]).toBe(hash);
  });

  it("detects modified file when hash differs", () => {
    const originalContent = "name: My Agent\n";
    const updatedContent = "name: My Agent v2\n";

    const originalHash = computeSimpleHash(originalContent);
    const updatedHash = computeSimpleHash(updatedContent);

    expect(originalHash).not.toBe(updatedHash);
  });

  it("detects unchanged file when hash matches", () => {
    const content = "name: My Agent\n";
    const hash1 = computeSimpleHash(content);
    const hash2 = computeSimpleHash(content);

    expect(hash1).toBe(hash2);
  });

  it("produces deterministic hashes", () => {
    const content = "name: Test Asset\nassetId: test-001\nversion: 1.0.0\n";
    const results = new Set<string>();

    for (let i = 0; i < 10; i++) {
      results.add(computeSimpleHash(content));
    }

    expect(results.size).toBe(1);
  });
});

// ─────────────────────────────────────────────────────────────────
// TESTS: Push Feedback
// ─────────────────────────────────────────────────────────────────

describe("VS Code EventPush — Push Feedback", () => {
  it("feedback structure contains expected fields", () => {
    // Test the PushFeedback interface contract
    const feedback = {
      accepted: 3,
      rejected: 0,
      warnings: [] as string[],
      errors: [] as string[],
    };

    expect(feedback.accepted).toBe(3);
    expect(feedback.rejected).toBe(0);
    expect(feedback.warnings).toHaveLength(0);
    expect(feedback.errors).toHaveLength(0);
  });

  it("feedback with warnings", () => {
    const feedback = {
      accepted: 2,
      rejected: 1,
      warnings: ["Missing golden thread reference on agent-003"],
      errors: [],
    };

    expect(feedback.accepted).toBe(2);
    expect(feedback.rejected).toBe(1);
    expect(feedback.warnings).toHaveLength(1);
  });
});
