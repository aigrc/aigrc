// ─────────────────────────────────────────────────────────────────
// CGA SARIF OUTPUT FORMATTER (AC-10)
// Generate SARIF 2.1.0 compliant output for CGA verification results
// ─────────────────────────────────────────────────────────────────

import type { cga } from "@aigrc/core";
import type { SarifLog, SarifResult, SarifRule, SarifArtifact } from "./sarif.js";

/**
 * CGA-specific rule definitions for SARIF output
 */
const CGA_RULES: SarifRule[] = [
  {
    id: "CGA-IDENTITY-001",
    name: "AssetCardValid",
    shortDescription: {
      text: "Agent asset card must be valid",
    },
    fullDescription: {
      text: "Validates that the agent's asset card conforms to AIGRC schema and contains required governance metadata.",
    },
    defaultConfiguration: { level: "error" },
  },
  {
    id: "CGA-IDENTITY-002",
    name: "GoldenThreadHash",
    shortDescription: {
      text: "Golden Thread hash must be valid",
    },
    fullDescription: {
      text: "Verifies that the agent's Golden Thread hash is properly computed and matches the expected value.",
    },
    defaultConfiguration: { level: "error" },
  },
  {
    id: "CGA-KILLSWITCH-001",
    name: "KillSwitchEndpoint",
    shortDescription: {
      text: "Kill switch endpoint must be declared",
    },
    fullDescription: {
      text: "Verifies that the agent has declared a kill switch endpoint for emergency shutdown.",
    },
    defaultConfiguration: { level: "error" },
  },
  {
    id: "CGA-KILLSWITCH-002",
    name: "KillSwitchLiveTest",
    shortDescription: {
      text: "Kill switch must respond to live test",
    },
    fullDescription: {
      text: "Performs a live test of the kill switch endpoint to verify it responds correctly.",
    },
    defaultConfiguration: { level: "error" },
  },
  {
    id: "CGA-POLICY-001",
    name: "PolicyEngineStrict",
    shortDescription: {
      text: "Policy engine must be in STRICT mode",
    },
    fullDescription: {
      text: "Verifies that the agent's policy engine is configured in STRICT mode for production use.",
    },
    defaultConfiguration: { level: "error" },
  },
  {
    id: "CGA-COMPLIANCE-001",
    name: "ComplianceFramework",
    shortDescription: {
      text: "Compliance framework must be mapped",
    },
    fullDescription: {
      text: "Verifies that the agent is mapped to relevant compliance frameworks (EU AI Act, NIST, etc.).",
    },
    defaultConfiguration: { level: "warning" },
  },
];

/**
 * Map CGA check names to SARIF rule IDs
 */
function mapCheckToRuleId(checkName: string): string {
  const mappings: Record<string, string> = {
    "identity.asset_card_valid": "CGA-IDENTITY-001",
    "identity.golden_thread_hash": "CGA-IDENTITY-002",
    "kill_switch.endpoint_declared": "CGA-KILLSWITCH-001",
    "kill_switch.live_test": "CGA-KILLSWITCH-002",
    "policy_engine.strict_mode": "CGA-POLICY-001",
    "compliance.framework_mapped": "CGA-COMPLIANCE-001",
  };
  return mappings[checkName] || `CGA-CUSTOM-${checkName.replace(/[^a-zA-Z0-9]/g, "-")}`;
}

/**
 * Map CGA check status to SARIF level
 */
function mapStatusToLevel(status: cga.VerificationResult["status"]): SarifResult["level"] {
  switch (status) {
    case "PASS":
      return "none";
    case "FAIL":
      return "error";
    case "WARN":
      return "warning";
    case "SKIP":
      return "note";
  }
}

/**
 * Generate SARIF 2.1.0 output from CGA verification report
 */
export function formatCgaSarif(
  report: cga.VerificationReport,
  assetCardPath: string,
  version = "1.0.0"
): SarifLog {
  const sarifResults: SarifResult[] = [];
  const artifacts: SarifArtifact[] = [
    {
      location: {
        uri: assetCardPath,
      },
      mimeType: "application/x-yaml",
    },
  ];

  // Convert each verification check to SARIF result
  for (const check of report.checks) {
    const ruleId = mapCheckToRuleId(check.check);

    sarifResults.push({
      ruleId,
      level: mapStatusToLevel(check.status),
      message: {
        text: check.message,
      },
      locations: [
        {
          physicalLocation: {
            artifactLocation: {
              uri: assetCardPath,
            },
          },
        },
      ],
      properties: {
        cgaCheck: check.check,
        status: check.status,
        durationMs: check.duration_ms,
        evidence: check.evidence,
        targetLevel: report.target_level,
        achievedLevel: report.achieved_level,
      },
    });
  }

  // Build rules list including any custom checks not in predefined list
  const seenRuleIds = new Set(sarifResults.map((r) => r.ruleId));
  const rules = [...CGA_RULES];

  // Add rules for any custom checks
  for (const ruleId of seenRuleIds) {
    if (!CGA_RULES.some((r) => r.id === ruleId)) {
      const check = report.checks.find((c) => mapCheckToRuleId(c.check) === ruleId);
      if (check) {
        rules.push({
          id: ruleId,
          name: check.check,
          shortDescription: {
            text: check.message,
          },
          defaultConfiguration: {
            level: check.status === "WARN" ? "warning" : "error",
          },
        });
      }
    }
  }

  const sarif: SarifLog = {
    version: "2.1.0",
    $schema:
      "https://raw.githubusercontent.com/oasis-tcs/sarif-spec/master/Schemata/sarif-schema-2.1.0.json",
    runs: [
      {
        tool: {
          driver: {
            name: "AIGRC CGA Verifier",
            version,
            informationUri: "https://aigos.io/cga",
            rules,
          },
        },
        results: sarifResults,
        artifacts,
      },
    ],
  };

  return sarif;
}

/**
 * Convert CGA SARIF log to JSON string
 */
export function cgaSarifToJson(sarif: SarifLog, pretty = true): string {
  return JSON.stringify(sarif, null, pretty ? 2 : 0);
}

/**
 * Generate SARIF summary for display
 */
export function formatCgaSarifSummary(report: cga.VerificationReport): string {
  const lines: string[] = [
    `CGA Verification Report`,
    `─────────────────────────────────────────────`,
    `Target Level: ${report.target_level}`,
    `Achieved Level: ${report.achieved_level ?? "NONE"}`,
    `Timestamp: ${report.timestamp}`,
    ``,
    `Summary:`,
    `  Total: ${report.summary.total}`,
    `  Passed: ${report.summary.passed}`,
    `  Failed: ${report.summary.failed}`,
    `  Warnings: ${report.summary.warnings}`,
    `  Skipped: ${report.summary.skipped}`,
  ];

  if (report.certificate) {
    lines.push(``);
    lines.push(`Certificate:`);
    lines.push(`  ID: ${report.certificate.metadata.id}`);
    lines.push(`  Issued: ${report.certificate.spec.certification.issued_at}`);
    lines.push(`  Expires: ${report.certificate.spec.certification.expires_at}`);
  }

  return lines.join("\n");
}
