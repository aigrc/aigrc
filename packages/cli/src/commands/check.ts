import { Command } from "commander";
import chalk from "chalk";
import ora from "ora";
import { existsSync, readFileSync } from "fs";
import { join } from "path";
import YAML from "yaml";
import { loadAssetCard, type AssetCard } from "@aigrc/core";
import { printHeader, printSubheader, printSuccess, printError, printInfo, printWarning } from "../utils/output.js";

// ─────────────────────────────────────────────────────────────────
// CHECK COMMAND
// ─────────────────────────────────────────────────────────────────

interface CheckOptions {
  profiles?: string[];
  stack?: boolean;
  output?: "text" | "json" | "yaml";
  verbose?: boolean;
}

// Control definitions per profile (simplified for CLI)
const PROFILE_CONTROLS: Record<string, { id: string; name: string; category: string; riskLevels: string[] }[]> = {
  "eu-ai-act": [
    { id: "eu-art-9", name: "Risk Management System", category: "Risk Management", riskLevels: ["high"] },
    { id: "eu-art-10", name: "Data Governance", category: "Data Governance", riskLevels: ["high"] },
    { id: "eu-art-11", name: "Technical Documentation", category: "Documentation", riskLevels: ["high"] },
    { id: "eu-art-12", name: "Record Keeping", category: "Logging", riskLevels: ["high"] },
    { id: "eu-art-13", name: "Transparency", category: "Transparency", riskLevels: ["high", "limited"] },
    { id: "eu-art-14", name: "Human Oversight", category: "Oversight", riskLevels: ["high"] },
    { id: "eu-art-15", name: "Accuracy and Robustness", category: "Technical", riskLevels: ["high"] },
    { id: "eu-art-50", name: "Transparency Obligations", category: "Transparency", riskLevels: ["limited"] },
  ],
  "us-omb-m24": [
    { id: "us-aia", name: "AI Impact Assessment", category: "Assessment", riskLevels: ["rights-impacting", "safety-impacting"] },
    { id: "us-human-oversight", name: "Human Oversight", category: "Oversight", riskLevels: ["rights-impacting", "safety-impacting"] },
    { id: "us-equity", name: "Equity Assessment", category: "Equity", riskLevels: ["rights-impacting"] },
    { id: "us-notice", name: "Affected Individual Notice", category: "Transparency", riskLevels: ["rights-impacting"] },
    { id: "us-appeal", name: "Appeal Process", category: "Remediation", riskLevels: ["rights-impacting"] },
    { id: "us-safety-testing", name: "Safety Testing", category: "Testing", riskLevels: ["safety-impacting"] },
  ],
  "nist-ai-rmf": [
    { id: "nist-govern", name: "GOVERN Function", category: "Governance", riskLevels: ["minimal", "low", "moderate", "high", "critical"] },
    { id: "nist-map", name: "MAP Function", category: "Risk Mapping", riskLevels: ["low", "moderate", "high", "critical"] },
    { id: "nist-measure", name: "MEASURE Function", category: "Measurement", riskLevels: ["low", "moderate", "high", "critical"] },
    { id: "nist-manage", name: "MANAGE Function", category: "Management", riskLevels: ["low", "moderate", "high", "critical"] },
  ],
  "iso-42001": [
    { id: "iso-a5", name: "Leadership and Commitment", category: "Leadership", riskLevels: ["low", "medium", "high", "critical"] },
    { id: "iso-a6", name: "Planning", category: "Planning", riskLevels: ["low", "medium", "high", "critical"] },
    { id: "iso-a7", name: "Support", category: "Support", riskLevels: ["medium", "high", "critical"] },
    { id: "iso-a8", name: "Operation", category: "Operations", riskLevels: ["medium", "high", "critical"] },
    { id: "iso-a9", name: "Performance Evaluation", category: "Performance", riskLevels: ["medium", "high", "critical"] },
    { id: "iso-a10", name: "Improvement", category: "Improvement", riskLevels: ["high", "critical"] },
  ],
};

const RISK_MAPPINGS: Record<string, Record<string, string>> = {
  "eu-ai-act": { minimal: "minimal", limited: "limited", high: "high", unacceptable: "unacceptable" },
  "us-omb-m24": { minimal: "neither", limited: "neither", high: "rights-impacting", unacceptable: "safety-impacting" },
  "nist-ai-rmf": { minimal: "minimal", limited: "low", high: "high", unacceptable: "critical" },
  "iso-42001": { minimal: "low", limited: "medium", high: "high", unacceptable: "critical" },
};

const PROFILE_NAMES: Record<string, string> = {
  "eu-ai-act": "EU AI Act",
  "us-omb-m24": "US OMB M-24",
  "nist-ai-rmf": "NIST AI RMF",
  "iso-42001": "ISO/IEC 42001",
};

export const checkCommand = new Command("check")
  .description("Check compliance status for an asset")
  .argument("<assetPath>", "Path to asset card YAML file")
  .option("-p, --profiles <profiles...>", "Profile IDs to check")
  .option("-s, --stack", "Check against stacked profiles (strictest wins)")
  .option("-o, --output <format>", "Output format (text, json, yaml)", "text")
  .option("-v, --verbose", "Show detailed control status")
  .action(async (assetPath: string, options: CheckOptions) => {
    await runCheck(assetPath, options);
  });

interface ControlStatus {
  controlId: string;
  controlName: string;
  status: "implemented" | "partial" | "not_implemented" | "not_applicable";
  notes?: string;
}

interface ComplianceResult {
  profileId: string;
  profileName: string;
  riskLevel: string;
  compliant: boolean;
  percentage: number;
  controls: ControlStatus[];
  gaps: string[];
}

async function runCheck(assetPath: string, options: CheckOptions): Promise<void> {
  if (options.output === "text") {
    printHeader();
  }

  // Load asset card
  if (!existsSync(assetPath)) {
    printError(`Asset card not found: ${assetPath}`);
    process.exit(1);
  }

  const spinner = ora("Loading asset card...").start();

  let card: AssetCard;
  try {
    card = loadAssetCard(assetPath);
    spinner.succeed(`Loaded: ${card.name}`);
  } catch (error) {
    spinner.fail("Failed to load asset card");
    printError(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }

  // Determine profiles to check
  let profileIds: string[];
  if (options.profiles && options.profiles.length > 0) {
    profileIds = options.profiles;
  } else {
    profileIds = loadActiveProfiles();
  }

  // Check compliance for each profile
  const results: ComplianceResult[] = [];

  for (const profileId of profileIds) {
    const result = checkProfile(card, profileId);
    if (result) {
      results.push(result);
    }
  }

  // Output results
  if (options.output === "json") {
    console.log(JSON.stringify({ asset: card.name, results }, null, 2));
    return;
  }

  if (options.output === "yaml") {
    console.log(YAML.stringify({ asset: card.name, results }));
    return;
  }

  // Text output
  console.log();
  printSubheader(`Compliance Check: ${card.name}`);

  // Summary table
  console.log();
  console.log(
    chalk.dim("  Profile".padEnd(20)) +
      chalk.dim("Risk Level".padEnd(20)) +
      chalk.dim("Compliant".padEnd(12)) +
      chalk.dim("Score")
  );
  console.log(chalk.dim("  " + "─".repeat(60)));

  for (const r of results) {
    const compliantIcon = r.compliant ? chalk.green("✓ Yes") : chalk.red("✗ No");
    const scoreColor = r.percentage >= 80 ? chalk.green : r.percentage >= 50 ? chalk.yellow : chalk.red;
    console.log(
      `  ${r.profileName.padEnd(18)} ` +
        `${formatRiskLevel(r.riskLevel).padEnd(28)} ` +
        `${compliantIcon.padEnd(20)} ` +
        `${scoreColor(r.percentage + "%")}`
    );
  }

  // Stacked summary if multiple profiles
  if (options.stack && results.length > 1) {
    console.log();
    const allCompliant = results.every((r) => r.compliant);
    const avgPercentage = Math.round(results.reduce((acc, r) => acc + r.percentage, 0) / results.length);

    console.log(
      `  ${chalk.bold("STACKED")}`.padEnd(18) +
        `${chalk.dim("(strictest)")}`.padEnd(28) +
        `${allCompliant ? chalk.green("✓ Yes") : chalk.red("✗ No")}`.padEnd(20) +
        `${avgPercentage}%`
    );
  }

  // Detailed output
  if (options.verbose) {
    for (const r of results) {
      console.log();
      printSubheader(`${r.profileName} Details`);
      console.log();

      console.log(
        chalk.dim("  Control".padEnd(32)) +
          chalk.dim("Status")
      );
      console.log(chalk.dim("  " + "─".repeat(50)));

      for (const c of r.controls) {
        const statusIcon = getStatusIcon(c.status);
        console.log(`  ${c.controlName.padEnd(30)} ${statusIcon}`);
      }

      if (r.gaps.length > 0) {
        console.log();
        printWarning(`${r.gaps.length} gap(s) identified:`);
        for (const gap of r.gaps) {
          console.log(chalk.yellow(`    - ${gap}`));
        }
      }
    }
  } else {
    // Show gaps summary
    const allGaps: string[] = [];
    for (const r of results) {
      allGaps.push(...r.gaps);
    }

    if (allGaps.length > 0) {
      console.log();
      printWarning(`${allGaps.length} total gap(s) identified. Use --verbose for details.`);
    }
  }
}

function checkProfile(card: AssetCard, profileId: string): ComplianceResult | null {
  const controls = PROFILE_CONTROLS[profileId];
  const mapping = RISK_MAPPINGS[profileId];

  if (!controls || !mapping) {
    return null;
  }

  const aigrcLevel = card.classification.riskLevel;
  const mappedLevel = mapping[aigrcLevel] || aigrcLevel;

  // Get applicable controls for this risk level
  const applicableControls = controls.filter((c) => c.riskLevels.includes(mappedLevel));

  // Evaluate each control (simplified - check if evidence exists)
  const controlStatuses: ControlStatus[] = applicableControls.map((control) => {
    const status = evaluateControl(card, control);
    return {
      controlId: control.id,
      controlName: control.name,
      status,
      notes: status === "not_implemented" ? "No evidence found" : undefined,
    };
  });

  // Calculate compliance
  const implemented = controlStatuses.filter((c) => c.status === "implemented" || c.status === "not_applicable").length;
  const total = controlStatuses.filter((c) => c.status !== "not_applicable").length;
  const percentage = total > 0 ? Math.round((implemented / total) * 100) : 100;

  // Identify gaps
  const gaps: string[] = [];
  for (const c of controlStatuses) {
    if (c.status === "not_implemented") {
      gaps.push(`Missing: ${c.controlName}`);
    } else if (c.status === "partial") {
      gaps.push(`Partial: ${c.controlName}`);
    }
  }

  return {
    profileId,
    profileName: PROFILE_NAMES[profileId] || profileId,
    riskLevel: mappedLevel,
    compliant: percentage === 100,
    percentage,
    controls: controlStatuses,
    gaps,
  };
}

function evaluateControl(
  card: AssetCard,
  control: { id: string; name: string; category: string }
): ControlStatus["status"] {
  // Simple heuristic: check for evidence in governance, intent, or constraints
  const hasApprovals = card.governance.approvals.length > 0;
  const hasIntent = card.intent.linked;
  const hasConstraints = !!card.constraints;

  // Map categories to what we'd expect to find
  const categoryEvidence: Record<string, boolean> = {
    "Risk Management": hasApprovals || hasIntent,
    "Data Governance": hasConstraints,
    Documentation: hasIntent && !!card.intent.businessJustification,
    Logging: hasConstraints && !!card.constraints?.monitoring?.logAllDecisions,
    Transparency: card.intent.linked,
    Oversight: hasApprovals || (hasConstraints && !!card.constraints?.humanApprovalRequired?.length),
    Technical: hasConstraints,
    Assessment: hasIntent && !!card.intent.businessJustification,
    Governance: hasApprovals,
    Planning: hasIntent,
    Leadership: hasApprovals,
    Support: card.ownership.team !== undefined,
    Operations: hasConstraints,
    Performance: hasConstraints && !!card.constraints?.monitoring?.logAllDecisions,
    Improvement: hasApprovals && card.governance.status !== "draft",
    Equity: hasIntent && !!card.intent.businessJustification,
    Remediation: hasApprovals,
    Testing: hasConstraints,
    Measurement: hasConstraints && !!card.constraints?.monitoring,
    Management: hasApprovals || hasIntent,
    "Risk Mapping": hasIntent,
  };

  const hasEvidence = categoryEvidence[control.category] ?? false;

  if (hasEvidence) {
    return "implemented";
  }

  return "not_implemented";
}

function getStatusIcon(status: ControlStatus["status"]): string {
  switch (status) {
    case "implemented":
      return chalk.green("✓ Implemented");
    case "partial":
      return chalk.yellow("◐ Partial");
    case "not_implemented":
      return chalk.red("✗ Missing");
    case "not_applicable":
      return chalk.gray("- N/A");
  }
}

function formatRiskLevel(level: string): string {
  const colors: Record<string, (text: string) => string> = {
    minimal: chalk.green,
    neither: chalk.green,
    low: chalk.green,
    limited: chalk.yellow,
    medium: chalk.yellow,
    moderate: chalk.yellow,
    high: chalk.red,
    "rights-impacting": chalk.red,
    critical: chalk.magenta,
    "safety-impacting": chalk.magenta,
    unacceptable: chalk.magenta.bold,
  };

  const colorFn = colors[level] || chalk.white;
  return colorFn(level.toUpperCase());
}

function loadActiveProfiles(): string[] {
  const configPath = join(process.cwd(), ".aigrc.yaml");

  if (!existsSync(configPath)) {
    return ["eu-ai-act"];
  }

  try {
    const content = readFileSync(configPath, "utf-8");
    const config = YAML.parse(content);
    return config?.profiles || ["eu-ai-act"];
  } catch {
    return ["eu-ai-act"];
  }
}
