import { Command } from "commander";
import chalk from "chalk";
import ora from "ora";
import path from "path";
import fs from "fs/promises";
import YAML from "yaml";
import {
  cga,
  loadAssetCard,
  computeGoldenThreadHashSync,
} from "@aigrc/core";
import { printHeader } from "../utils/output.js";
import { ExitCode, exit } from "../utils/exit-codes.js";
import { formatCgaSarif, cgaSarifToJson } from "../formatters/cga-sarif.js";

// ─────────────────────────────────────────────────────────────────
// CERTIFY COMMAND (AC-9: CGA Certification)
// ─────────────────────────────────────────────────────────────────

interface CertifyCommandOptions {
  level?: "BRONZE" | "SILVER" | "GOLD" | "PLATINUM";
  output?: "text" | "json" | "sarif";
  config?: string;
  outputFile?: string;
  dryRun?: boolean;
  verbose?: boolean;
  organizationId?: string;
  organizationName?: string;
}

const DEFAULT_CARDS_DIR = ".aigrc/cards";
const DEFAULT_CONFIG_FILE = ".aigrc/runtime.yaml";

export const certifyCommand = new Command("certify")
  .description("Run CGA (Certified Governed Agent) certification for an agent")
  .argument("[asset-card]", "Path to agent asset card")
  .option("-l, --level <level>", "Target certification level (BRONZE, SILVER, GOLD, PLATINUM)", "BRONZE")
  .option("-o, --output <format>", "Output format (text, json, sarif)", "text")
  .option("-c, --config <path>", "Path to runtime config file")
  .option("--output-file <path>", "Write output to file instead of stdout")
  .option("--dry-run", "Verify only, do not generate certificate")
  .option("-v, --verbose", "Show detailed check output")
  .option("--organization-id <id>", "Organization ID for certificate")
  .option("--organization-name <name>", "Organization name for certificate")
  .action(async (assetCardPath: string | undefined, options: CertifyCommandOptions) => {
    await runCertify(assetCardPath, options);
  });

async function runCertify(
  assetCardPath: string | undefined,
  options: CertifyCommandOptions
): Promise<void> {
  // Validate level option
  const validLevels: cga.CGALevel[] = ["BRONZE", "SILVER", "GOLD", "PLATINUM"];
  const targetLevel = (options.level?.toUpperCase() ?? "BRONZE") as cga.CGALevel;

  if (!validLevels.includes(targetLevel)) {
    console.error(chalk.red(`Error: Invalid level "${options.level}". Must be one of: ${validLevels.join(", ")}`));
    exit(ExitCode.INVALID_ARGUMENTS);
  }

  if (options.output === "text" && !options.outputFile) {
    printHeader();
    console.log(chalk.bold("CGA Certification"));
    console.log(chalk.dim("─".repeat(50)));
    console.log();
  }

  // Find asset card
  const resolvedCardPath = await findAssetCard(assetCardPath, options);
  if (!resolvedCardPath) {
    if (options.output === "text" && !options.outputFile) {
      console.log(chalk.red("Error: No asset card found"));
      console.log(chalk.dim("Provide a path to an asset card or run from a directory with .aigrc/cards/"));
    } else {
      const output = JSON.stringify({ error: "No asset card found" });
      await writeOutput(output, options);
    }
    exit(ExitCode.FILE_NOT_FOUND);
  }

  if (options.output === "text" && !options.outputFile) {
    console.log(`Asset Card: ${chalk.cyan(path.basename(resolvedCardPath))}`);
    console.log(`Target Level: ${chalk.bold(formatLevel(targetLevel))}`);
    console.log();
  }

  // Load runtime config if provided
  let runtimeConfig: Record<string, unknown> | undefined;
  const configPath = options.config ?? DEFAULT_CONFIG_FILE;
  try {
    const configContent = await fs.readFile(configPath, "utf-8");
    runtimeConfig = YAML.parse(configContent);
  } catch {
    // Config file optional
  }

  // Run verification
  const spinner = options.output === "text" && !options.outputFile
    ? ora("Running certification checks...").start()
    : undefined;

  const engine = new cga.VerificationEngine();

  let report: cga.VerificationReport;
  try {
    report = await engine.verify({
      assetCardPath: resolvedCardPath,
      targetLevel,
      runtimeConfig,
    });
    spinner?.stop();
  } catch (error) {
    spinner?.fail("Verification failed");
    const errorMessage = error instanceof Error ? error.message : String(error);

    if (options.output === "text" && !options.outputFile) {
      console.log(chalk.red(`Error: ${errorMessage}`));
    } else {
      const output = JSON.stringify({ error: errorMessage });
      await writeOutput(output, options);
    }
    exit(ExitCode.RUNTIME_ERROR);
  }

  // Display or output results based on format
  if (options.output === "text" && !options.outputFile) {
    await displayTextReport(report, options, resolvedCardPath);
  } else {
    const output = await formatReport(report, options, resolvedCardPath);
    await writeOutput(output, options);
  }

  // Generate certificate if verification passed and not dry-run
  if (report.achieved_level && !options.dryRun) {
    await generateCertificate(report, resolvedCardPath, options);
  }

  // Exit with appropriate code
  if (report.summary.failed > 0) {
    exit(ExitCode.VALIDATION_ERRORS);
  }
  exit(ExitCode.SUCCESS);
}

async function findAssetCard(
  cardPath: string | undefined,
  options: CertifyCommandOptions
): Promise<string | null> {
  if (cardPath) {
    const resolved = path.resolve(process.cwd(), cardPath);
    try {
      await fs.access(resolved);
      return resolved;
    } catch {
      return null;
    }
  }

  // Look in default cards directory
  const cardsDir = path.join(process.cwd(), DEFAULT_CARDS_DIR);
  try {
    const files = await fs.readdir(cardsDir);
    const yamlFiles = files.filter((f) =>
      (f.endsWith(".yaml") || f.endsWith(".yml")) &&
      f.includes("agent")
    );
    if (yamlFiles.length > 0) {
      return path.join(cardsDir, yamlFiles[0]);
    }
    // Fallback to any yaml file
    const anyYaml = files.find((f) => f.endsWith(".yaml") || f.endsWith(".yml"));
    if (anyYaml) {
      return path.join(cardsDir, anyYaml);
    }
  } catch {
    // Directory doesn't exist
  }

  return null;
}

async function displayTextReport(
  report: cga.VerificationReport,
  options: CertifyCommandOptions,
  assetCardPath: string
): Promise<void> {
  console.log(chalk.bold("Verification Results"));
  console.log(chalk.dim("─".repeat(50)));
  console.log();

  // Display each check
  for (const check of report.checks) {
    const statusIcon = getStatusIcon(check.status);
    const statusColor = getStatusColor(check.status);

    console.log(`${statusIcon} ${chalk.bold(check.check)}`);
    console.log(`   ${statusColor(check.message)}`);

    if (options.verbose && check.evidence) {
      console.log(`   ${chalk.dim("Evidence:")} ${JSON.stringify(check.evidence)}`);
    }
    if (check.duration_ms !== undefined) {
      console.log(`   ${chalk.dim(`Duration: ${check.duration_ms}ms`)}`);
    }
    console.log();
  }

  // Summary
  console.log(chalk.bold("Summary"));
  console.log(chalk.dim("─".repeat(50)));
  console.log(`  Total Checks: ${report.summary.total}`);
  console.log(`  ${chalk.green("✓")} Passed: ${report.summary.passed}`);
  console.log(`  ${chalk.red("✗")} Failed: ${report.summary.failed}`);
  console.log(`  ${chalk.yellow("⚠")} Warnings: ${report.summary.warnings}`);
  console.log(`  ${chalk.gray("○")} Skipped: ${report.summary.skipped}`);
  console.log();

  // Achievement
  if (report.achieved_level) {
    console.log(
      chalk.green.bold(`✓ Agent qualifies for ${formatLevel(report.achieved_level)} certification`)
    );
  } else {
    console.log(
      chalk.red.bold(`✗ Agent does not meet ${formatLevel(report.target_level)} requirements`)
    );
    console.log(chalk.dim("  Fix the failing checks and re-run certification"));
  }
  console.log();
}

async function formatReport(
  report: cga.VerificationReport,
  options: CertifyCommandOptions,
  assetCardPath: string
): Promise<string> {
  switch (options.output) {
    case "sarif":
      return formatSarifReport(report, assetCardPath);
    case "json":
    default:
      return JSON.stringify({
        verification: report,
        asset_card: path.basename(assetCardPath),
        timestamp: new Date().toISOString(),
      }, null, 2);
  }
}

function formatSarifReport(
  report: cga.VerificationReport,
  assetCardPath: string
): string {
  const sarif = formatCgaSarif(report, assetCardPath);
  return cgaSarifToJson(sarif);
}

async function generateCertificate(
  report: cga.VerificationReport,
  assetCardPath: string,
  options: CertifyCommandOptions
): Promise<void> {
  if (!report.achieved_level) {
    return;
  }

  const spinner = options.output === "text" && !options.outputFile
    ? ora("Generating certificate...").start()
    : undefined;

  try {
    // Load asset card for agent info
    const card = loadAssetCard(assetCardPath);
    const agentId = card.id ?? card.name ?? "unknown-agent";
    const agentVersion = card.version ?? "1.0.0";

    // Compute golden thread hash from governance data if available
    let goldenThreadHash = "sha256:placeholder";
    try {
      if (card.golden_thread?.hash) {
        goldenThreadHash = card.golden_thread.hash;
      } else if (card.golden_thread) {
        // Compute hash from golden_thread components
        const gtResult = computeGoldenThreadHashSync({
          ticket_id: card.golden_thread.ticket_id,
          approved_by: card.golden_thread.approved_by,
          approved_at: card.golden_thread.approved_at,
        });
        goldenThreadHash = gtResult.hash;
      } else if (card.governance?.approvals?.length) {
        const approval = card.governance.approvals[0];
        const gtResult = computeGoldenThreadHashSync({
          ticket_id: card.id,
          approved_by: approval.email ?? approval.name,
          approved_at: approval.date,
        });
        goldenThreadHash = gtResult.hash;
      }
    } catch {
      // Golden thread computation optional for self-signed certs
    }

    // Create certificate generator
    const generator = new cga.CertificateGenerator({
      organizationId: options.organizationId ?? "self-signed",
      organizationName: options.organizationName ?? "Self-Signed",
      privateKey: "", // Placeholder for self-signed
      keyId: "self-signed-key-1",
    });

    const certificate = await generator.generate(
      report,
      agentId,
      agentVersion,
      goldenThreadHash
    );

    // Save certificate
    const certDir = path.join(path.dirname(assetCardPath), "../certificates");
    await fs.mkdir(certDir, { recursive: true });

    const certFileName = `${certificate.metadata.id}.yaml`;
    const certPath = path.join(certDir, certFileName);

    await fs.writeFile(certPath, YAML.stringify(certificate), "utf-8");

    spinner?.succeed(`Certificate generated: ${certFileName}`);

    if (options.output === "text" && !options.outputFile) {
      console.log();
      console.log(chalk.bold("Certificate Details"));
      console.log(chalk.dim("─".repeat(50)));
      console.log(`  ID: ${chalk.cyan(certificate.metadata.id)}`);
      console.log(`  Level: ${formatLevel(certificate.spec.certification.level)}`);
      console.log(`  Issued: ${certificate.spec.certification.issued_at}`);
      console.log(`  Expires: ${certificate.spec.certification.expires_at}`);
      console.log(`  Path: ${chalk.dim(certPath)}`);
      console.log();
    }
  } catch (error) {
    spinner?.fail("Certificate generation failed");
    if (options.output === "text" && !options.outputFile) {
      console.log(chalk.yellow(`Warning: ${error instanceof Error ? error.message : String(error)}`));
    }
  }
}

async function writeOutput(output: string, options: CertifyCommandOptions): Promise<void> {
  if (options.outputFile) {
    await fs.writeFile(options.outputFile, output, "utf-8");
    if (options.output === "text") {
      console.log(chalk.green(`✓ Output written to ${options.outputFile}`));
    }
  } else {
    console.log(output);
  }
}

function getStatusIcon(status: cga.VerificationResult["status"]): string {
  switch (status) {
    case "PASS":
      return chalk.green("✓");
    case "FAIL":
      return chalk.red("✗");
    case "WARN":
      return chalk.yellow("⚠");
    case "SKIP":
      return chalk.gray("○");
  }
}

function getStatusColor(status: cga.VerificationResult["status"]): (s: string) => string {
  switch (status) {
    case "PASS":
      return chalk.green;
    case "FAIL":
      return chalk.red;
    case "WARN":
      return chalk.yellow;
    case "SKIP":
      return chalk.gray;
  }
}

function formatLevel(level: cga.CGALevel): string {
  const colors: Record<cga.CGALevel, (s: string) => string> = {
    BRONZE: chalk.hex("#CD7F32"),
    SILVER: chalk.hex("#C0C0C0"),
    GOLD: chalk.hex("#FFD700"),
    PLATINUM: chalk.hex("#E5E4E2"),
  };
  return colors[level](level);
}
