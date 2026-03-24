// ─────────────────────────────────────────────────────────────────
// PangoGuard — PR Comment Renderer
// Generates Markdown PR comments per risk tier
// ─────────────────────────────────────────────────────────────────

import type { AppScanResult } from "../types.js";
import { TIER_ICONS } from "../types.js";
import {
  renderL0Comment,
  renderL1Comment,
  renderL2Comment,
  renderL3Comment,
  renderGovernedComment,
} from "./comment-templates.js";
import { createLogger } from "../utils/logger.js";

const log = createLogger("comment-renderer");

/**
 * Render the full PR governance comment based on scan results.
 *
 * Selects the appropriate template based on tier and governance status.
 * Comment is designed to be scannable in 10 seconds by a developer.
 *
 * @param result - Full scan result with tier and regulatory mapping
 * @returns Markdown string for the PR comment
 */
export function renderComment(result: AppScanResult): string {
  // Already governed — short confirmation
  if (result.governanceStatus === "approved") {
    return renderGovernedComment(result);
  }

  // Select template by tier
  switch (result.tier) {
    case "L0":
      return renderL0Comment(result);
    case "L1":
      return renderL1Comment(result);
    case "L2":
      return renderL2Comment(result);
    case "L3":
      return renderL3Comment(result);
    default:
      log.warn(`Unknown tier: ${result.tier}, defaulting to L2`);
      return renderL2Comment(result);
  }
}

/**
 * Render the detection table used in multiple comment templates.
 */
export function renderDetectionTable(result: AppScanResult): string {
  const detections = result.scanResult.detections;

  if (detections.length === 0) return "";

  const rows = detections.slice(0, 20).map((d) => {
    const confidence = d.confidence === "high" ? "\u{1F7E2}" :
                       d.confidence === "medium" ? "\u{1F7E1}" : "\u{1F534}";
    return `| \`${d.filePath}\` | ${d.framework} | ${d.category} | ${confidence} ${d.confidence} |`;
  });

  const truncated = detections.length > 20
    ? `\n_...and ${detections.length - 20} more detections_`
    : "";

  return [
    "| File | Framework | Category | Confidence |",
    "|------|-----------|----------|------------|",
    ...rows,
    truncated,
  ].join("\n");
}

/**
 * Render the regulatory mapping section.
 */
export function renderRegulatorySection(result: AppScanResult): string {
  const { euAiAct, nistRmf, iso42001, sectorSpecific } = result.regulatoryMapping;

  const sections: string[] = [];

  // EU AI Act
  sections.push(`**EU AI Act** — ${euAiAct.classification}`);
  for (const article of euAiAct.articles) {
    sections.push(`  - ${article}`);
  }

  // NIST AI RMF
  sections.push(`\n**NIST AI RMF** — Functions: ${nistRmf.functions.join(", ")}`);
  for (const action of nistRmf.actions.slice(0, 4)) {
    sections.push(`  - ${action}`);
  }

  // ISO 42001
  sections.push(`\n**ISO 42001** — ${iso42001.clauses.length} applicable clauses`);
  for (const clause of iso42001.clauses.slice(0, 3)) {
    sections.push(`  - ${clause}`);
  }

  // Sector-specific
  if (sectorSpecific && sectorSpecific.length > 0) {
    sections.push(`\n**Sector-Specific Regulations**`);
    for (const sector of sectorSpecific) {
      sections.push(`  - **${sector.regulation}**: ${sector.triggerReason}`);
    }
  }

  return sections.join("\n");
}

/**
 * Render the capabilities summary line.
 */
export function renderCapabilities(result: AppScanResult): string {
  if (result.detectedCapabilities.length === 0) return "";
  return `**Detected capabilities:** ${result.detectedCapabilities.join(" \u{2022} ")}`;
}

/**
 * Render agentic elevation warnings.
 */
export function renderAgenticWarnings(result: AppScanResult): string {
  if (result.agenticElevations.length === 0) return "";

  const warnings = result.agenticElevations.map((e) => {
    const prefix = e.critical ? "\u{1F6A8} **CRITICAL**" : "\u26A0\uFE0F";
    return `${prefix} ${e.indicator} _(${e.filePath}:${e.line})_ \u2014 Risk +${e.riskElevation}`;
  });

  return [
    "### Agentic Risk Elevations",
    "",
    ...warnings,
  ].join("\n");
}
