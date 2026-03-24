// ─────────────────────────────────────────────────────────────────
// PangoGuard — Artifact Generator
// Generates governance artifacts (Asset Card YAML stubs, PR templates)
// ─────────────────────────────────────────────────────────────────

import type { AppScanResult } from "../types.js";
import { createLogger } from "../utils/logger.js";

const log = createLogger("artifact-generator");

/**
 * Generate an Asset Card YAML stub from scan results.
 */
export function generateAssetCardYaml(result: AppScanResult): string {
  const primary = result.scanResult.summary.primaryFramework ?? "unknown";
  const now = new Date().toISOString();
  const hasToolExec = result.detectedCapabilities.includes("tool execution");
  const hasExternal = result.detectedCapabilities.includes("external API access");
  const hasPii = result.detectedCapabilities.includes("PII processing");

  // Determine technical type from detections
  const categories = Object.keys(result.scanResult.summary.byCategory ?? {});
  let techType = "framework";
  if (categories.includes("agent_framework")) techType = "agent";
  else if (categories.includes("llm_provider")) techType = "api_client";
  else if (categories.includes("ml_framework")) techType = "model";

  // Collect source files
  const sourceFiles = [
    ...new Set(result.scanResult.detections.map((d) => d.filePath)),
  ].slice(0, 10);

  return `# AIGRC Asset Card — Auto-generated stub
# Save to: .aigrc/cards/<asset-name>.yaml
# Documentation: https://aigrc.dev/docs/asset-cards

$schema: "https://aigrc.dev/schemas/asset-card/v3.json"
id: "aigrc-2024-PLACEHOLDER"
name: "${primary} Integration"
description: "TODO: Describe this AI component's purpose"
version: "1.0.0"
created: "${now}"
updated: "${now}"

ownership:
  owner:
    name: "TODO: Owner Name"
    email: "TODO: owner@company.com"
  team: "TODO: Team Name"

technical:
  type: "${techType}"
  framework: "${primary}"
  sourceFiles:
${sourceFiles.map((f) => `    - "${f}"`).join("\n")}

classification:
  riskLevel: "${result.classification.riskLevel}"
  riskFactors:
    autonomousDecisions: ${result.detectedCapabilities.includes("autonomous decisions")}
    customerFacing: false
    toolExecution: ${hasToolExec}
    externalDataAccess: ${hasExternal}
    piiProcessing: "${hasPii ? "yes" : "unknown"}"
    highStakesDecisions: false

intent:
  linked: false
  ticketSystem: null
  ticketId: null
  businessJustification: null

governance:
  status: "draft"
  approvals: []
`;
}

/**
 * Generate a .aigrc.yaml configuration stub.
 */
export function generateAigrcConfig(): string {
  return `# AIGRC Configuration
# Documentation: https://aigrc.dev/docs/configuration

version: "1.0"
name: "TODO: Project Name"

runtime:
  default_policy: ".aigrc/policies/default.yaml"
  policy_paths:
    - ".aigrc/policies"
  asset_paths:
    - ".aigrc/cards"
  telemetry:
    enabled: true
`;
}
