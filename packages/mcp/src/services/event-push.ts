/**
 * MCP Server Event Push Service
 *
 * Maps governance-relevant MCP tool calls to events
 * and pushes them to AIGOS via Sync Channel.
 *
 * Per AIG-219, Sprint 5.
 */

import crypto from "crypto";
import {
  GovernanceEventBuilder,
  AigosClient,
  type BuilderConfig,
  type GovernanceEvent,
} from "@aigrc/events";
import type { AIGRCConfig } from "../config.js";

// ─────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────

export interface PushFeedback {
  policyResult?: "pass" | "fail";
  warnings?: string[];
  suggestions?: string[];
  pushFailed?: boolean;
}

/**
 * Mapping from MCP tool name to governance event type.
 * Tools not listed here are read-only and produce no events.
 */
const TOOL_EVENT_MAP: Record<string, string> = {
  scan_directory: "aigrc.scan.completed",
  create_asset_card: "aigrc.asset.created",
  validate_asset_card: "aigrc.compliance.evaluated",
  classify_risk: "aigrc.classification.applied",
};

// Read-only tools that do NOT produce events
const READ_ONLY_TOOLS = new Set([
  "list_asset_cards",
  "get_asset_card",
  "check_compliance",
  "generate_report",
  "list_frameworks",
  "get_risk_classification",
  "search_crosswalk",
  "check_checkpoint",
  "list_checkpoints",
]);

// ─────────────────────────────────────────────────────────────────
// EVENT PUSH SERVICE
// ─────────────────────────────────────────────────────────────────

export class EventPushService {
  private readonly builder: GovernanceEventBuilder | undefined;
  private readonly client: AigosClient | undefined;
  private readonly _enabled: boolean;

  constructor(config: AIGRCConfig) {
    const { aigosApiUrl, aigosApiKey } = config;

    if (!aigosApiUrl || !aigosApiKey) {
      this._enabled = false;
      return;
    }

    this._enabled = true;

    const orgId = (config as any).aigosOrgId || "org-default";

    const builderConfig: BuilderConfig = {
      source: {
        tool: "mcp-server",
        version: "0.2.0",
        orgId,
        instanceId: `mcp-server-${process.pid}`,
        identity: {
          type: "service-token",
          subject: "mcp-server@aigos.dev",
        },
        environment: "development",
      },
    };

    this.builder = new GovernanceEventBuilder(builderConfig);
    this.client = new AigosClient({ apiUrl: aigosApiUrl, apiKey: aigosApiKey });
  }

  /**
   * Check if the service is configured and ready for push.
   */
  isEnabled(): boolean {
    return this._enabled;
  }

  /**
   * Push a governance event for a tool call.
   * Returns null for read-only tools or when not enabled.
   * Non-blocking: catches all errors and returns pushFailed.
   */
  async pushForTool(
    toolName: string,
    args: Record<string, unknown>,
    toolResult: unknown,
  ): Promise<PushFeedback | null> {
    if (!this._enabled || !this.builder || !this.client) return null;

    // Skip read-only tools
    if (READ_ONLY_TOOLS.has(toolName)) return null;

    // Check if tool is mapped
    const eventType = TOOL_EVENT_MAP[toolName];
    if (!eventType) return null;

    try {
      const event = this.buildEventForTool(toolName, args, toolResult);
      if (!event) return null;

      const response = await this.client.push(event);

      return {
        policyResult: (response as any)?.policyResult?.overallResult,
        warnings: (response as any)?.warnings ?? [],
        suggestions: (response as any)?.suggestions ?? [],
      };
    } catch {
      return { pushFailed: true };
    }
  }

  /**
   * Build a governance event based on the tool call.
   */
  private buildEventForTool(
    toolName: string,
    args: Record<string, unknown>,
    toolResult: unknown,
  ): GovernanceEvent | null {
    if (!this.builder) return null;

    const now = new Date().toISOString();
    const assetId = (args.assetId as string) || (args.name as string) || "unknown-asset";

    const goldenThread = (args as any).goldenThread || {
      type: "orphan" as const,
      reason: "discovery" as const,
      declaredBy: "mcp-server",
      declaredAt: now,
      remediationDeadline: new Date(
        Date.now() + 30 * 24 * 60 * 60 * 1000,
      ).toISOString(),
      remediationNote:
        "Event pushed via MCP Server tool call. Assign a golden thread reference.",
    };

    switch (toolName) {
      case "scan_directory": {
        const scanId = `scan_${crypto.randomBytes(8).toString("hex")}`;
        const result = toolResult as Record<string, unknown>;
        return this.builder.scanCompleted({
          assetId: "repository",
          goldenThread,
          data: {
            scanId,
            scanType: "framework-detection",
            targetAssetId: "repository",
            toolName: "mcp-server",
            toolVersion: "0.2.0",
            findingsCount: (result?.detections as any[])?.length ?? 0,
            criticalCount: 0,
            duration: 0,
            passed: true,
          },
        });
      }

      case "create_asset_card":
        return this.builder.assetCreated({
          assetId,
          goldenThread,
          data: {
            cardId: assetId,
            cardVersion: (args.version as string) || "1.0.0",
          },
        });

      case "validate_asset_card": {
        const evalId = `eval_${crypto.randomBytes(8).toString("hex")}`;
        const validationResult = toolResult as Record<string, unknown>;
        return this.builder.complianceEvaluated({
          assetId,
          goldenThread,
          data: {
            evaluationId: evalId,
            framework: "aigrc-asset-card-validation",
            frameworkVersion: "1.0.0",
            scope: "asset-card",
            overallResult: (validationResult?.valid as boolean) ? "pass" : "fail",
            findingsCount: ((validationResult?.errors as any[])?.length) ?? 0,
            criticalFindings: 0,
          },
        });
      }

      case "classify_risk":
        return this.builder.classificationApplied({
          assetId,
          goldenThread,
          data: {
            classificationId: `class_${crypto.randomBytes(8).toString("hex")}`,
            classificationType: "risk-level",
            classifiedBy: "mcp-server",
            previousClassification: "unclassified",
            newClassification:
              (toolResult as Record<string, unknown>)?.riskLevel as string ??
              "minimal",
            reason: "Automated risk classification via MCP server tool call.",
          },
        });

      default:
        return null;
    }
  }
}

/**
 * Format push feedback as a compliance section for tool result text.
 */
export function formatFeedbackSection(feedback: PushFeedback): string {
  const lines: string[] = [
    "",
    "---",
    "## AIGOS Compliance Feedback",
  ];

  if (feedback.pushFailed) {
    lines.push("- Status: Push failed (non-blocking)");
    return lines.join("\n");
  }

  if (feedback.policyResult) {
    lines.push(
      `- Policy: ${feedback.policyResult === "pass" ? "PASSED" : "FAILED"}`,
    );
  }

  if (feedback.warnings && feedback.warnings.length > 0) {
    lines.push(`- Warnings: ${feedback.warnings.length}`);
    for (const w of feedback.warnings) {
      lines.push(`  - ${w}`);
    }
  }

  if (feedback.suggestions && feedback.suggestions.length > 0) {
    lines.push(`- Suggestions:`);
    for (const s of feedback.suggestions) {
      lines.push(`  - ${s}`);
    }
  }

  if (!feedback.policyResult && (!feedback.warnings || feedback.warnings.length === 0)) {
    lines.push("- Status: Event pushed successfully");
  }

  return lines.join("\n");
}
