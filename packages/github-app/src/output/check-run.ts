// ─────────────────────────────────────────────────────────────────
// PangoGuard — GitHub Check Run
// Creates/updates Check Runs for governance scan results
// ─────────────────────────────────────────────────────────────────

import type { Octokit } from "@octokit/rest";
import type { AppScanResult } from "../types.js";
import { TIER_ICONS, TIER_MAP } from "../types.js";
import { createLogger } from "../utils/logger.js";

const log = createLogger("check-run");

/**
 * Create a GitHub Check Run for the governance scan result.
 *
 * - Status: always `completed`
 * - Conclusion: `neutral` (warn-only, doesn't block merge)
 * - For paid tier: conclusion can be `failure` for L3 (merge blocking)
 *
 * @param octokit - Authenticated Octokit instance
 * @param owner - Repository owner
 * @param repo - Repository name
 * @param sha - Commit SHA to attach the check run to
 * @param result - Full scan result
 */
export async function createCheckRun(
  octokit: Octokit,
  owner: string,
  repo: string,
  sha: string,
  result: AppScanResult
): Promise<void> {
  const detectionCount = result.scanResult.summary.totalDetections;
  const hasDetections = detectionCount > 0;

  // Build check run title
  const title = hasDetections
    ? `${TIER_ICONS[result.tier]} ${result.tier} ${result.tierLabel} \u2014 ${detectionCount} AI component${detectionCount !== 1 ? "s" : ""} detected`
    : "\u2705 No AI components detected";

  // Build summary
  const summary = hasDetections
    ? buildSummary(result)
    : "No AI/ML frameworks or components were detected in the changed files.";

  // Determine conclusion (warn-only for free tier)
  const conclusion: "neutral" | "success" | "failure" = hasDetections ? "neutral" : "success";

  try {
    await octokit.checks.create({
      owner,
      repo,
      name: "PangoGuard",
      head_sha: sha,
      status: "completed",
      conclusion,
      output: {
        title,
        summary,
        text: hasDetections ? buildDetailedText(result) : undefined,
      },
    });

    log.info("Check Run created", { sha: sha.substring(0, 8), conclusion, tier: result.tier });
  } catch (error) {
    log.error("Failed to create Check Run", {
      error: error instanceof Error ? error.message : String(error),
      sha: sha.substring(0, 8),
    });
  }
}

function buildSummary(result: AppScanResult): string {
  const lines: string[] = [];

  lines.push(`**Risk Tier:** ${result.tier} ${result.tierLabel}`);
  lines.push(`**Detections:** ${result.scanResult.summary.totalDetections}`);

  if (result.scanResult.summary.primaryFramework) {
    lines.push(`**Primary Framework:** ${result.scanResult.summary.primaryFramework}`);
  }

  if (result.detectedCapabilities.length > 0) {
    lines.push(`**Capabilities:** ${result.detectedCapabilities.join(", ")}`);
  }

  const frameworks = Object.keys(result.scanResult.summary.byFramework);
  if (frameworks.length > 0) {
    lines.push(`**Frameworks:** ${frameworks.join(", ")}`);
  }

  // Regulatory frameworks
  const regs: string[] = [];
  if (result.regulatoryMapping.euAiAct.articles.length > 0) regs.push("EU AI Act");
  if (result.regulatoryMapping.nistRmf.functions.length > 0) regs.push("NIST AI RMF");
  if (result.regulatoryMapping.iso42001.clauses.length > 0) regs.push("ISO 42001");
  if (result.regulatoryMapping.sectorSpecific && result.regulatoryMapping.sectorSpecific.length > 0) {
    regs.push(...result.regulatoryMapping.sectorSpecific.map((s) => s.regulation));
  }
  if (regs.length > 0) {
    lines.push(`**Applicable Regulations:** ${regs.join(", ")}`);
  }

  return lines.join("\n");
}

function buildDetailedText(result: AppScanResult): string {
  const lines: string[] = [];

  // Detection details
  lines.push("## Detection Details\n");
  for (const d of result.scanResult.detections.slice(0, 30)) {
    lines.push(`- **${d.framework}** (${d.category}) in \`${d.filePath}:${d.line}\` \u2014 ${d.confidence} confidence`);
  }

  // Agentic elevations
  if (result.agenticElevations.length > 0) {
    lines.push("\n## Agentic Risk Elevations\n");
    for (const e of result.agenticElevations) {
      const prefix = e.critical ? "\u{1F6A8}" : "\u26A0\uFE0F";
      lines.push(`${prefix} **${e.pattern}**: ${e.indicator} \u2014 +${e.riskElevation} tier`);
    }
  }

  return lines.join("\n");
}
