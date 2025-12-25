import chalk from "chalk";
import type {
  ScanResult,
  DetectionResult,
  ConfidenceLevel,
  AssetCardSuggestion,
  RiskFactors,
} from "@aigrc/core";

// ─────────────────────────────────────────────────────────────────
// OUTPUT FORMATTING UTILITIES
// ─────────────────────────────────────────────────────────────────

export function printHeader(): void {
  console.log();
  console.log(chalk.cyan.bold("AIGRC") + chalk.dim(" - AI Governance, Risk, Compliance"));
  console.log(chalk.dim("─".repeat(50)));
  console.log();
}

export function printSubheader(text: string): void {
  console.log();
  console.log(chalk.bold.cyan(`▸ ${text}`));
  console.log(chalk.cyan("─".repeat(40)));
}

export function printSuccess(text: string): void {
  console.log(chalk.green(`✓ ${text}`));
}

export function printWarning(text: string): void {
  console.log(chalk.yellow(`⚠ ${text}`));
}

export function printError(text: string): void {
  console.log(chalk.red(`✗ ${text}`));
}

export function printInfo(text: string): void {
  console.log(chalk.gray(`ℹ ${text}`));
}

// ─────────────────────────────────────────────────────────────────
// SCAN RESULT FORMATTING
// ─────────────────────────────────────────────────────────────────

export function printScanSummary(result: ScanResult): void {
  const { summary, scannedFiles, skippedFiles, duration } = result;

  printSubheader("Scan Summary");

  console.log(`  Files scanned: ${chalk.bold(scannedFiles)}`);
  if (skippedFiles > 0) {
    console.log(`  Files skipped: ${chalk.yellow(skippedFiles)}`);
  }
  console.log(`  Duration: ${chalk.gray(`${duration}ms`)}`);
  console.log();

  if (summary.totalDetections === 0) {
    printInfo("No AI frameworks or models detected.");
    return;
  }

  console.log(`  ${chalk.bold("Total detections:")} ${summary.totalDetections}`);
  console.log();

  // By confidence
  console.log(chalk.dim("  By confidence:"));
  if (summary.byConfidence.high > 0) {
    console.log(`    ${confidenceLabel("high")}: ${summary.byConfidence.high}`);
  }
  if (summary.byConfidence.medium > 0) {
    console.log(`    ${confidenceLabel("medium")}: ${summary.byConfidence.medium}`);
  }
  if (summary.byConfidence.low > 0) {
    console.log(`    ${confidenceLabel("low")}: ${summary.byConfidence.low}`);
  }
  console.log();

  // By framework
  if (Object.keys(summary.byFramework).length > 0) {
    console.log(chalk.dim("  By framework:"));
    for (const [framework, count] of Object.entries(summary.byFramework)) {
      console.log(`    ${chalk.bold(framework)}: ${count}`);
    }
    console.log();
  }

  // Primary detection
  if (summary.primaryFramework) {
    console.log(
      `  ${chalk.bold("Primary framework:")} ${chalk.cyan(summary.primaryFramework)}`
    );
  }
  if (summary.primaryCategory) {
    console.log(
      `  ${chalk.bold("Primary category:")} ${formatCategory(summary.primaryCategory)}`
    );
  }
}

export function printDetections(detections: DetectionResult[], verbose = false, limit = 20): void {
  if (detections.length === 0) {
    return;
  }

  printSubheader(`Detections (${detections.length} total)`);

  const toShow = detections.slice(0, limit);

  for (const detection of toShow) {
    const confidence = confidenceLabel(detection.confidence);
    const location = chalk.gray(`${detection.filePath}:${detection.line}`);
    const framework = chalk.bold(detection.framework);

    console.log(`  ${confidence} ${framework}`);
    console.log(`     ${location}`);
    console.log(`     ${chalk.dim(truncate(detection.match, 60))}`);

    if (verbose) {
      console.log(`     ${chalk.dim(`Strategy: ${detection.strategy}`)}`);
      if (detection.implies.length > 0) {
        console.log(
          `     ${chalk.dim(`Implies: ${detection.implies.map((i) => i.factor).join(", ")}`)}`
        );
      }
    }

    console.log();
  }

  if (detections.length > limit) {
    printInfo(`... and ${detections.length - limit} more detections`);
  }
}

export function printRiskFactors(
  riskFactors: ScanResult["inferredRiskFactors"]
): void {
  printSubheader("Inferred Risk Factors");

  const factors = [
    { key: "autonomousDecisions", label: "Autonomous Decisions", value: riskFactors.autonomousDecisions },
    { key: "customerFacing", label: "Customer Facing", value: riskFactors.customerFacing },
    { key: "toolExecution", label: "Tool Execution", value: riskFactors.toolExecution },
    { key: "externalDataAccess", label: "External Data Access", value: riskFactors.externalDataAccess },
    { key: "piiProcessing", label: "PII Processing", value: riskFactors.piiProcessing },
    { key: "highStakesDecisions", label: "High-Stakes Decisions", value: riskFactors.highStakesDecisions },
  ];

  for (const factor of factors) {
    const icon = factor.value === true || factor.value === "yes"
      ? chalk.red("●")
      : factor.value === false || factor.value === "no"
      ? chalk.green("○")
      : chalk.yellow("◐");

    const valueStr = factor.value === true
      ? chalk.red("Yes")
      : factor.value === false
      ? chalk.green("No")
      : factor.value === "yes"
      ? chalk.red("Yes")
      : factor.value === "no"
      ? chalk.green("No")
      : chalk.yellow("Unknown");

    console.log(`  ${icon} ${factor.label}: ${valueStr}`);
  }
}

// ─────────────────────────────────────────────────────────────────
// HELPER FUNCTIONS
// ─────────────────────────────────────────────────────────────────

function confidenceLabel(confidence: ConfidenceLevel): string {
  switch (confidence) {
    case "high":
      return chalk.green("HIGH  ");
    case "medium":
      return chalk.yellow("MEDIUM");
    case "low":
      return chalk.gray("LOW   ");
  }
}

function formatCategory(category: string): string {
  const labels: Record<string, string> = {
    llm_provider: "LLM Provider",
    framework: "Framework",
    agent_framework: "Agent Framework",
    ml_framework: "ML Framework",
    ml_ops: "ML Ops",
    model_file: "Model File",
  };
  return labels[category] ?? category;
}

function truncate(text: string, maxLength: number): string {
  const cleaned = text.replace(/\s+/g, " ").trim();
  if (cleaned.length <= maxLength) {
    return cleaned;
  }
  return cleaned.slice(0, maxLength - 3) + "...";
}

// ─────────────────────────────────────────────────────────────────
// ASSET CARD SUGGESTION FORMATTING
// ─────────────────────────────────────────────────────────────────

export function printAssetSuggestion(suggestion: AssetCardSuggestion): void {
  printSubheader("Asset Card Suggestion");

  console.log(`  ${chalk.bold("Name:")} ${chalk.cyan(suggestion.name)}`);
  console.log(`  ${chalk.bold("Description:")} ${suggestion.description}`);
  console.log(`  ${chalk.bold("Type:")} ${suggestion.technical.type}`);
  console.log(`  ${chalk.bold("Framework:")} ${suggestion.technical.framework}`);
  console.log(`  ${chalk.bold("Confidence:")} ${confidenceLabel(suggestion.confidence)}`);
  console.log();

  if (suggestion.technical.components.length > 0) {
    console.log(chalk.dim("  Components:"));
    for (const comp of suggestion.technical.components) {
      const details = [comp.type];
      if (comp.provider) details.push(`provider: ${comp.provider}`);
      if (comp.model) details.push(`model: ${comp.model}`);
      console.log(`    - ${details.join(", ")}`);
    }
    console.log();
  }

  if (Object.keys(suggestion.riskFactors).length > 0) {
    console.log(chalk.dim("  Risk Factors:"));
    printRiskFactorsInline(suggestion.riskFactors);
  }
}

function printRiskFactorsInline(riskFactors: Partial<RiskFactors>): void {
  const factors = [
    { key: "autonomousDecisions" as const, label: "Autonomous", value: riskFactors.autonomousDecisions },
    { key: "customerFacing" as const, label: "Customer-Facing", value: riskFactors.customerFacing },
    { key: "toolExecution" as const, label: "Tool Execution", value: riskFactors.toolExecution },
    { key: "externalDataAccess" as const, label: "External Data", value: riskFactors.externalDataAccess },
    { key: "piiProcessing" as const, label: "PII", value: riskFactors.piiProcessing },
    { key: "highStakesDecisions" as const, label: "High-Stakes", value: riskFactors.highStakesDecisions },
  ];

  for (const factor of factors) {
    if (factor.value === undefined) continue;

    const icon =
      factor.value === true || factor.value === "yes"
        ? chalk.red("●")
        : factor.value === false || factor.value === "no"
          ? chalk.green("○")
          : chalk.yellow("◐");

    const valueStr =
      factor.value === true || factor.value === "yes"
        ? chalk.red("Yes")
        : factor.value === false || factor.value === "no"
          ? chalk.green("No")
          : chalk.yellow("Unknown");

    console.log(`    ${icon} ${factor.label}: ${valueStr}`);
  }
}
