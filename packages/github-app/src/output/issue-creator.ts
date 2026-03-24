// ─────────────────────────────────────────────────────────────────
// PangoGuard — GitHub Issue Creator
// Creates governance alert Issues (ungoverned, inventory, CISO, weekly)
// ─────────────────────────────────────────────────────────────────

import type { Octokit } from "@octokit/rest";
import type { AppScanResult, IssueType } from "../types.js";
import { TIER_ICONS } from "../types.js";
import { createLogger } from "../utils/logger.js";

const log = createLogger("issue-creator");

/** Issue label prefix for PangoGuard governance */
const LABEL_PREFIX = "pangoguard";

/** Standard labels applied to all governance issues */
const BASE_LABELS = [LABEL_PREFIX, "ai-governance"];

/**
 * Create a governance-related GitHub Issue.
 *
 * Supports 4 issue types:
 * - ungoverned_asset: AI asset pushed to main without governance card
 * - shadow_inventory: Inventory scan results on installation
 * - ciso_alert: L3 UNACCEPTABLE risk detection
 * - weekly_report: Scheduled scan summary report
 *
 * @param octokit - Authenticated Octokit instance
 * @param owner - Repository owner
 * @param repo - Repository name
 * @param type - Issue type to create
 * @param data - Issue-specific data
 */
export async function createGovernanceIssue(
  octokit: Octokit,
  owner: string,
  repo: string,
  type: IssueType,
  data: Record<string, any>
): Promise<void> {
  const { title, body, labels } = buildIssueContent(type, data, owner, repo);

  // Ensure labels exist
  await ensureLabelsExist(octokit, owner, repo, labels);

  // Check for existing issue to avoid duplicates
  const isDuplicate = await checkForDuplicateIssue(octokit, owner, repo, title);
  if (isDuplicate) {
    log.info(`Duplicate issue detected, skipping: ${title}`);
    return;
  }

  try {
    const issue = await octokit.issues.create({
      owner,
      repo,
      title,
      body,
      labels,
    });

    log.info(`Created governance issue #${issue.data.number}: ${title}`, {
      type,
      issueNumber: issue.data.number,
    });
  } catch (error) {
    log.error(`Failed to create governance issue: ${title}`, {
      error: error instanceof Error ? error.message : String(error),
      type,
    });
  }
}

// ─────────────────────────────────────────────────────────────────
// ISSUE CONTENT BUILDERS
// ─────────────────────────────────────────────────────────────────

function buildIssueContent(
  type: IssueType,
  data: Record<string, any>,
  owner: string,
  repo: string
): { title: string; body: string; labels: string[] } {
  switch (type) {
    case "ungoverned_asset":
      return buildUngovernedAssetIssue(data, owner, repo);
    case "shadow_inventory":
      return buildShadowInventoryIssue(data);
    case "ciso_alert":
      return buildCisoAlertIssue(data, owner, repo);
    case "weekly_report":
      return buildWeeklyReportIssue(data, owner, repo);
  }
}

function buildUngovernedAssetIssue(
  data: Record<string, any>,
  owner: string,
  repo: string
): { title: string; body: string; labels: string[] } {
  const result: AppScanResult = data.scanResult;
  const commitSha: string = data.commitSha ?? "unknown";
  const icon = TIER_ICONS[result.tier];

  const detectionList = result.scanResult.detections
    .slice(0, 10)
    .map((d) => `- **${d.framework}** (${d.category}) in \`${d.filePath}:${d.line}\``)
    .join("\n");

  const title = `${icon} Ungoverned AI Asset Detected \u2014 ${result.tier} ${result.tierLabel}`;

  const body = `## Ungoverned AI Asset Pushed to Default Branch

An AI/ML component was pushed to the default branch without a governance Asset Card.

### Details

| Property | Value |
|----------|-------|
| **Risk Tier** | ${result.tier} ${result.tierLabel} |
| **Commit** | \`${commitSha.substring(0, 8)}\` |
| **Detections** | ${result.scanResult.summary.totalDetections} |
| **Primary Framework** | ${result.scanResult.summary.primaryFramework ?? "N/A"} |
| **Capabilities** | ${result.detectedCapabilities.join(", ") || "N/A"} |

### Detected Components

${detectionList}

### Required Actions

1. Create an AI Asset Card: \`aigrc init\`
2. Link a business justification (Jira/ADO ticket)
3. Submit for governance review if tier \u2265 L2

---
<sub>\uD83E\uDD94 Powered by <a href="https://pangoguard.dev">PangoGuard</a></sub>`;

  return {
    title,
    body,
    labels: [...BASE_LABELS, `risk:${result.tier.toLowerCase()}`, "ungoverned"],
  };
}

function buildShadowInventoryIssue(
  data: Record<string, any>
): { title: string; body: string; labels: string[] } {
  const result: AppScanResult = data.scanResult;
  const repoFullName: string = data.repoFullName ?? "unknown";

  const detectionList = result.scanResult.detections
    .map((d) => `| \`${d.filePath}\` | ${d.framework} | ${d.category} | ${d.confidence} |`)
    .join("\n");

  const title = `\uD83D\uDDC2\uFE0F Shadow AI Inventory \u2014 ${result.scanResult.summary.totalDetections} assets discovered`;

  const body = `## Shadow AI Inventory Report

PangoGuard has scanned **${repoFullName}** and discovered the following AI/ML components.

### Summary

- **Total detections:** ${result.scanResult.summary.totalDetections}
- **Highest risk tier:** ${result.tier} ${result.tierLabel}
- **Frameworks found:** ${Object.keys(result.scanResult.summary.byFramework).join(", ")}

### Inventory

| File | Framework | Category | Confidence |
|------|-----------|----------|------------|
${detectionList}

### Next Steps

1. Review each detected component
2. Create Asset Cards for components that require governance
3. Prioritize L2+ components for immediate governance review

---
<sub>\uD83E\uDD94 Powered by <a href="https://pangoguard.dev">PangoGuard</a></sub>`;

  return {
    title,
    body,
    labels: [...BASE_LABELS, "shadow-inventory"],
  };
}

function buildCisoAlertIssue(
  data: Record<string, any>,
  owner: string,
  repo: string
): { title: string; body: string; labels: string[] } {
  const result: AppScanResult = data.scanResult;

  const title = `\uD83D\uDEA8 CISO ALERT \u2014 L3 UNACCEPTABLE Risk Detected in ${owner}/${repo}`;

  const body = `## CISO Alert \u2014 Unacceptable Risk Detection

**IMMEDIATE ATTENTION REQUIRED**

An AI component classified as **L3 UNACCEPTABLE** has been detected.

### Risk Summary

| Property | Value |
|----------|-------|
| **Risk Tier** | L3 UNACCEPTABLE |
| **Repository** | ${owner}/${repo} |
| **Detections** | ${result.scanResult.summary.totalDetections} |
| **Primary Framework** | ${result.scanResult.summary.primaryFramework ?? "N/A"} |

### Classification Reasons

${result.classification.reasons.map((r) => `- ${r}`).join("\n")}

### Regulatory Impact

**EU AI Act:** ${result.regulatoryMapping.euAiAct.classification}
${result.regulatoryMapping.euAiAct.obligations.map((o) => `- ${o}`).join("\n")}

### Required Actions

1. **Legal Review** \u2014 mandatory before any deployment
2. **Risk Assessment** \u2014 full impact analysis required
3. **Decommission or Redesign** \u2014 L3 assets cannot proceed to production
4. **Document Decision** \u2014 whether to redesign, decommission, or escalate

---
<sub>\uD83E\uDD94 Powered by <a href="https://pangoguard.dev">PangoGuard</a></sub>`;

  return {
    title,
    body,
    labels: [...BASE_LABELS, "risk:l3", "ciso-alert", "urgent"],
  };
}

function buildWeeklyReportIssue(
  data: Record<string, any>,
  owner: string,
  repo: string
): { title: string; body: string; labels: string[] } {
  const title = `\uD83D\uDCCA Weekly AI Governance Report \u2014 ${new Date().toISOString().substring(0, 10)}`;

  const body = `## Weekly AI Governance Scan Report

**Repository:** ${owner}/${repo}
**Scan Date:** ${new Date().toISOString()}

_Weekly report implementation pending._

---
<sub>\uD83E\uDD94 Powered by <a href="https://pangoguard.dev">PangoGuard</a></sub>`;

  return {
    title,
    body,
    labels: [...BASE_LABELS, "weekly-report"],
  };
}

// ─────────────────────────────────────────────────────────────────
// UTILITY FUNCTIONS
// ─────────────────────────────────────────────────────────────────

async function ensureLabelsExist(
  octokit: Octokit,
  owner: string,
  repo: string,
  labels: string[]
): Promise<void> {
  for (const label of labels) {
    try {
      await octokit.issues.getLabel({ owner, repo, name: label });
    } catch {
      try {
        await octokit.issues.createLabel({
          owner,
          repo,
          name: label,
          color: getLabelColor(label),
          description: getLabelDescription(label),
        });
      } catch {
        // Label creation may fail if concurrent, ignore
      }
    }
  }
}

function getLabelColor(label: string): string {
  if (label.startsWith("risk:l3")) return "d73a4a";
  if (label.startsWith("risk:l2")) return "e4e669";
  if (label.startsWith("risk:l1")) return "0075ca";
  if (label.startsWith("risk:l0")) return "0e8a16";
  if (label === "ciso-alert") return "d73a4a";
  if (label === "urgent") return "b60205";
  if (label === "pangoguard") return "5319e7";
  if (label === "ai-governance") return "7057ff";
  return "ededed";
}

function getLabelDescription(label: string): string {
  if (label === "pangoguard") return "PangoGuard governance label";
  if (label === "ai-governance") return "AI governance tracking";
  if (label.startsWith("risk:")) return `Risk tier ${label.replace("risk:", "").toUpperCase()}`;
  if (label === "ungoverned") return "Ungoverned AI asset";
  if (label === "ciso-alert") return "CISO attention required";
  return "";
}

async function checkForDuplicateIssue(
  octokit: Octokit,
  owner: string,
  repo: string,
  title: string
): Promise<boolean> {
  try {
    const issues = await octokit.issues.listForRepo({
      owner,
      repo,
      state: "open",
      labels: LABEL_PREFIX,
      per_page: 100,
    });

    return issues.data.some((issue) => issue.title === title);
  } catch {
    return false;
  }
}
