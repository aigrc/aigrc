import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  GovernanceEventBuilder,
  type BuilderConfig,
  type GovernanceEvent,
} from "@aigrc/events";
import { EventPushService, formatFeedbackSection } from "../src/services/event-push.js";
import type { AIGRCConfig } from "../src/config.js";

// ─────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────

function makeConfig(overrides: Partial<AIGRCConfig> = {}): AIGRCConfig {
  return {
    workspace: ".",
    cardsDir: ".aigrc/cards",
    logLevel: "error",
    telemetryEnabled: false,
    telemetryBatchSize: 100,
    telemetryFlushInterval: 5000,
    cacheTtl: 300,
    profiles: ["eu-ai-act"],
    customProfilePaths: [],
    stackProfiles: false,
    redTeamEnabled: false,
    httpPort: 3000,
    httpHost: "0.0.0.0",
    httpCors: true,
    httpCorsOrigins: ["*"],
    httpAuthEnabled: false,
    httpAllowAnonymous: true,
    httpRequestsPerMinute: 120,
    httpToolCallsPerHour: 1000,
    httpStateful: true,
    ...overrides,
  } as AIGRCConfig;
}

// ─────────────────────────────────────────────────────────────────
// TESTS: Service Enablement
// ─────────────────────────────────────────────────────────────────

describe("MCP EventPush — Service Enablement", () => {
  it("isEnabled() returns false without config", () => {
    const config = makeConfig();
    const service = new EventPushService(config);

    expect(service.isEnabled()).toBe(false);
  });

  it("isEnabled() returns false with only apiUrl", () => {
    const config = makeConfig({ aigosApiUrl: "https://api.aigos.dev/v1" });
    const service = new EventPushService(config);

    expect(service.isEnabled()).toBe(false);
  });

  it("isEnabled() returns true with both apiUrl and apiKey", () => {
    const config = makeConfig({
      aigosApiUrl: "https://api.aigos.dev/v1",
      aigosApiKey: "test-key-123",
    });
    const service = new EventPushService(config);

    expect(service.isEnabled()).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────
// TESTS: Tool-to-Event Mapping
// ─────────────────────────────────────────────────────────────────

describe("MCP EventPush — Tool-to-Event Mapping", () => {
  it("read-only tools return null (no event)", async () => {
    const config = makeConfig({
      aigosApiUrl: "https://api.aigos.dev/v1",
      aigosApiKey: "test-key",
    });
    const service = new EventPushService(config);

    // These are read-only, should return null without attempting push
    const readOnlyTools = [
      "list_asset_cards",
      "get_asset_card",
      "check_compliance",
      "generate_report",
    ];

    for (const tool of readOnlyTools) {
      const result = await service.pushForTool(tool, {}, {});
      expect(result).toBeNull();
    }
  });

  it("unmapped tools return null", async () => {
    const config = makeConfig({
      aigosApiUrl: "https://api.aigos.dev/v1",
      aigosApiKey: "test-key",
    });
    const service = new EventPushService(config);

    const result = await service.pushForTool("some_unknown_tool", {}, {});
    expect(result).toBeNull();
  });

  it("pushForTool returns null when not enabled", async () => {
    const config = makeConfig();
    const service = new EventPushService(config);

    const result = await service.pushForTool("scan_directory", {}, {});
    expect(result).toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────────
// TESTS: Builder Configuration
// ─────────────────────────────────────────────────────────────────

describe("MCP EventPush — Builder Configuration", () => {
  it("mcp-server builder creates events with correct source", () => {
    const builderConfig: BuilderConfig = {
      source: {
        tool: "mcp-server",
        version: "0.2.0",
        orgId: "org-test",
        instanceId: "mcp-server-test",
        identity: {
          type: "service-token",
          subject: "mcp-server@aigos.dev",
        },
        environment: "development",
      },
    };

    const builder = new GovernanceEventBuilder(builderConfig);
    const event = builder.assetCreated({
      assetId: "test-asset",
      goldenThread: {
        type: "orphan",
        reason: "discovery",
        declaredBy: "mcp-server",
        declaredAt: new Date().toISOString(),
        remediationDeadline: new Date(
          Date.now() + 30 * 24 * 60 * 60 * 1000,
        ).toISOString(),
        remediationNote: "Test event from MCP server builder.",
      },
      data: { cardId: "test-asset", cardVersion: "1.0.0" },
    });

    expect(event.source.tool).toBe("mcp-server");
    expect(event.source.identity.type).toBe("service-token");
    expect(event.type).toBe("aigrc.asset.created");
  });
});

// ─────────────────────────────────────────────────────────────────
// TESTS: Feedback Formatting
// ─────────────────────────────────────────────────────────────────

describe("MCP EventPush — Feedback Formatting", () => {
  it("formats push failure feedback", () => {
    const feedback = formatFeedbackSection({ pushFailed: true });

    expect(feedback).toContain("AIGOS Compliance Feedback");
    expect(feedback).toContain("Push failed");
  });

  it("formats successful push with warnings", () => {
    const feedback = formatFeedbackSection({
      policyResult: "pass",
      warnings: ["Missing golden thread on agent-001"],
      suggestions: [],
    });

    expect(feedback).toContain("Policy: PASSED");
    expect(feedback).toContain("Warnings: 1");
    expect(feedback).toContain("Missing golden thread");
  });

  it("formats policy failure", () => {
    const feedback = formatFeedbackSection({
      policyResult: "fail",
      warnings: [],
      suggestions: ["Consider adding risk classification"],
    });

    expect(feedback).toContain("Policy: FAILED");
    expect(feedback).toContain("Suggestions:");
    expect(feedback).toContain("Consider adding risk classification");
  });

  it("formats clean success", () => {
    const feedback = formatFeedbackSection({
      warnings: [],
      suggestions: [],
    });

    expect(feedback).toContain("Event pushed successfully");
  });
});
