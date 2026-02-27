/**
 * GitHub Action Event Push Module
 *
 * Builds governance events from scan/validate/policy results
 * and pushes them to AIGOS via Sync Channel.
 *
 * Per AIG-218, Sprint 5.
 */

import crypto from "crypto";
import {
  GovernanceEventBuilder,
  AigosClient,
  type BuilderConfig,
  type GovernanceEvent,
  type GoldenThreadRef,
} from "@aigrc/events";
import type { ScanResult, AssetCard, ClassificationResult } from "@aigrc/core";

// ─────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────

export interface CardValidationResultForPush {
  path: string;
  card: AssetCard;
  valid: boolean;
  errors: string[];
  classification: ClassificationResult;
}

export interface PolicyResultForPush {
  passed: boolean;
  violations: Array<{
    rule: string;
    severity: string;
    message: string;
    file?: string;
    line?: number;
  }>;
}

export interface BatchResponse {
  accepted: number;
  rejected: number;
  warnings: string[];
}

// ─────────────────────────────────────────────────────────────────
// BUILDER FACTORY
// ─────────────────────────────────────────────────────────────────

/**
 * Create a GovernanceEventBuilder configured for GitHub Action context.
 */
export function createActionBuilder(orgId: string): GovernanceEventBuilder {
  const config: BuilderConfig = {
    source: {
      tool: "github-action",
      version: "0.2.0",
      orgId,
      instanceId: `github-action-${process.env.GITHUB_RUN_ID || "local"}`,
      identity: {
        type: "service-token",
        subject: `github-action@${process.env.GITHUB_REPOSITORY || "unknown"}`,
      },
      environment: "ci",
    },
  };
  return new GovernanceEventBuilder(config);
}

// ─────────────────────────────────────────────────────────────────
// EVENT BUILDERS
// ─────────────────────────────────────────────────────────────────

/**
 * Build scan.started + scan.completed events from scan results.
 */
export function buildScanEvents(
  scanResult: ScanResult,
  builder: GovernanceEventBuilder,
  goldenThread: GoldenThreadRef,
  correlationId?: string,
): GovernanceEvent[] {
  const events: GovernanceEvent[] = [];
  const scanId = `scan_${crypto.randomBytes(8).toString("hex")}`;

  // scan.started
  events.push(
    builder.scanStarted({
      assetId: "repository",
      goldenThread,
      correlationId,
      data: {
        scanId,
        scanType: "framework-detection",
        targetAssetId: "repository",
        toolName: "aigrc-github-action",
        toolVersion: "0.2.0",
      },
    }),
  );

  // scan.completed
  events.push(
    builder.scanCompleted({
      assetId: "repository",
      goldenThread,
      correlationId,
      data: {
        scanId,
        scanType: "framework-detection",
        targetAssetId: "repository",
        toolName: "aigrc-github-action",
        toolVersion: "0.2.0",
        findingsCount: scanResult.detections.length,
        criticalCount: scanResult.summary.byConfidence.high,
        duration: 0,
        passed: true,
      },
    }),
  );

  return events;
}

/**
 * Build asset.registered events for each validated card.
 */
export function buildCardEvents(
  cardResults: CardValidationResultForPush[],
  builder: GovernanceEventBuilder,
  goldenThread: GoldenThreadRef,
  correlationId?: string,
): GovernanceEvent[] {
  const events: GovernanceEvent[] = [];

  for (const card of cardResults) {
    if (!card.valid) continue;

    const assetId =
      card.card.assetId || card.card.name || card.path.split("/").pop() || "unknown";

    events.push(
      builder.assetCreated({
        assetId,
        goldenThread,
        correlationId,
        data: {
          cardId: assetId,
          cardVersion: (card.card as any).version || "1.0.0",
        },
      }),
    );
  }

  return events;
}

/**
 * Build compliance.evaluated event from policy check results.
 */
export function buildPolicyEvents(
  policyResult: PolicyResultForPush,
  builder: GovernanceEventBuilder,
  goldenThread: GoldenThreadRef,
  correlationId?: string,
): GovernanceEvent[] {
  const events: GovernanceEvent[] = [];
  const evaluationId = `eval_${crypto.randomBytes(8).toString("hex")}`;

  events.push(
    builder.complianceEvaluated({
      assetId: "repository",
      goldenThread,
      correlationId,
      data: {
        evaluationId,
        framework: "aigrc-governance-lock",
        frameworkVersion: "1.0.0",
        scope: "repository",
        overallResult: policyResult.passed ? "pass" : "fail",
        findingsCount: policyResult.violations.length,
        criticalFindings: policyResult.violations.filter(
          (v) => v.severity === "error",
        ).length,
      },
    }),
  );

  return events;
}

// ─────────────────────────────────────────────────────────────────
// PUSH
// ─────────────────────────────────────────────────────────────────

/**
 * Push all events to AIGOS via batch endpoint.
 */
export async function pushAllEvents(
  events: GovernanceEvent[],
  apiUrl: string,
  apiKey: string,
  orgId: string,
): Promise<BatchResponse> {
  if (events.length === 0) {
    return { accepted: 0, rejected: 0, warnings: [] };
  }

  const client = new AigosClient({ apiUrl: apiUrl, apiKey });
  const response = await client.pushBatch(events);

  return {
    accepted: response.accepted ?? events.length,
    rejected: response.rejected ?? 0,
    warnings: response.warnings ?? [],
  };
}

/**
 * Build a PR-linked golden thread reference.
 */
export function buildPrGoldenThread(
  owner: string,
  repo: string,
  prNumber: number,
): GoldenThreadRef {
  return {
    type: "linked",
    system: "github",
    ref: `${owner}/${repo}#${prNumber}`,
    url: `https://github.com/${owner}/${repo}/pull/${prNumber}`,
    status: "active",
  };
}

/**
 * Build an orphan golden thread for non-PR contexts.
 */
export function buildOrphanGoldenThread(): GoldenThreadRef {
  const now = new Date().toISOString();
  return {
    type: "orphan",
    reason: "discovery",
    declaredBy: "github-action",
    declaredAt: now,
    remediationDeadline: new Date(
      Date.now() + 30 * 24 * 60 * 60 * 1000,
    ).toISOString(),
    remediationNote:
      "Event pushed via GitHub Action without PR context. Assign a golden thread reference.",
  };
}
