/**
 * Policy Commands
 *
 * CLI commands for I2E Policy Bridge operations:
 * - policy ingest: Extract text from policy documents
 * - policy compile: Compile policies into AIR and governance.lock
 *
 * @module @aigrc/cli/commands/policy
 */

import { Command } from "commander";
import chalk from "chalk";
import ora from "ora";
import path from "path";
import fs from "fs/promises";
import YAML from "yaml";
import {
  extractorRegistry,
  PdfExtractor,
  DocxExtractor,
  UrlExtractor,
  ManualExtractor,
  PolicyCompiler,
  createCompiler,
  type PolicySourceInput,
  type PolicySourceType,
  type ExtractionResult,
  type CompilationResult,
  type ExtractedConstraint,
} from "@aigrc/i2e-bridge";
import {
  loadGovernanceLock,
  CodeScanner,
  Reporter,
  generateSarifReportString,
  type ReportFormat,
} from "@aigrc/i2e-firewall";
import {
  getDaysUntilExpiration,
  isGovernanceLockExpired,
} from "@aigrc/core";
import { printHeader } from "../utils/output.js";
import { ExitCode, exit } from "../utils/exit-codes.js";

// ─────────────────────────────────────────────────────────────────
// POLICY COMMAND GROUP
// ─────────────────────────────────────────────────────────────────

export const policyCommand = new Command("policy")
  .description("Policy document ingestion and compilation (I2E Bridge)");

// ─────────────────────────────────────────────────────────────────
// POLICY INGEST SUBCOMMAND
// ─────────────────────────────────────────────────────────────────

interface IngestOptions {
  output?: "text" | "json";
  outputFile?: string;
  type?: PolicySourceType;
  title?: string;
}

policyCommand
  .command("ingest")
  .description("Extract text from policy documents (PDF, DOCX, URL)")
  .argument("<source>", "Path to document or URL")
  .option("-o, --output <format>", "Output format (text, json)", "text")
  .option("-f, --output-file <path>", "Write extracted text to file")
  .option("-t, --type <type>", "Source type (pdf, docx, url, manual)")
  .option("--title <title>", "Document title override")
  .action(async (source: string, options: IngestOptions) => {
    await runIngest(source, options);
  });

async function runIngest(source: string, options: IngestOptions): Promise<void> {
  if (options.output === "text" && !options.outputFile) {
    printHeader();
    console.log(chalk.bold("Policy Document Ingestion"));
    console.log(chalk.dim("─".repeat(50)));
    console.log();
  }

  // Register extractors
  registerExtractors();

  // Determine source type
  const sourceType = options.type ?? inferSourceType(source);
  if (!sourceType) {
    const errorMsg = `Could not determine source type for: ${source}. Use --type to specify.`;
    if (options.output === "json") {
      console.log(JSON.stringify({ error: errorMsg }));
    } else {
      console.error(chalk.red(`Error: ${errorMsg}`));
    }
    exit(ExitCode.INVALID_ARGUMENTS);
  }

  // Get extractor
  const extractor = extractorRegistry.getExtractor(sourceType);
  if (!extractor) {
    const errorMsg = `No extractor available for source type: ${sourceType}`;
    if (options.output === "json") {
      console.log(JSON.stringify({ error: errorMsg }));
    } else {
      console.error(chalk.red(`Error: ${errorMsg}`));
    }
    exit(ExitCode.RUNTIME_ERROR);
  }

  if (!extractor.isAvailable()) {
    const errorMsg = `Extractor '${extractor.name}' dependencies not installed.`;
    if (options.output === "json") {
      console.log(JSON.stringify({ error: errorMsg }));
    } else {
      console.error(chalk.red(`Error: ${errorMsg}`));
      console.log(chalk.dim("Install the required dependencies and try again."));
    }
    exit(ExitCode.RUNTIME_ERROR);
  }

  const spinner = options.output === "text" && !options.outputFile
    ? ora(`Extracting text from ${path.basename(source)}...`).start()
    : undefined;

  try {
    const policySource: PolicySourceInput = {
      type: sourceType,
      uri: source.startsWith("http") ? source : path.resolve(process.cwd(), source),
      title: options.title,
    };

    const result = await extractor.extract(policySource);

    if (!result.success) {
      spinner?.fail(`Extraction failed: ${result.error}`);
      if (options.output === "json") {
        console.log(JSON.stringify({
          success: false,
          error: result.error,
          warnings: result.warnings,
        }));
      }
      exit(ExitCode.RUNTIME_ERROR);
    }

    spinner?.succeed(`Extracted ${result.content.length} characters`);

    // Output results
    if (options.output === "json") {
      const output = JSON.stringify({
        success: true,
        source: policySource,
        contentHash: result.contentHash,
        contentLength: result.content.length,
        pageCount: result.pageCount,
        warnings: result.warnings,
        metadata: result.documentMetadata,
        content: result.content,
      }, null, 2);

      if (options.outputFile) {
        await fs.writeFile(options.outputFile, output, "utf-8");
        console.log(chalk.green(`✓ Output written to ${options.outputFile}`));
      } else {
        console.log(output);
      }
    } else {
      // Text output
      if (options.outputFile) {
        await fs.writeFile(options.outputFile, result.content, "utf-8");
        console.log(chalk.green(`✓ Extracted text written to ${options.outputFile}`));
      } else {
        console.log();
        console.log(chalk.bold("Document Information:"));
        console.log(`  Source: ${source}`);
        console.log(`  Type: ${sourceType}`);
        console.log(`  Hash: ${result.contentHash.substring(0, 20)}...`);
        console.log(`  Length: ${result.content.length} characters`);
        if (result.pageCount) {
          console.log(`  Pages: ${result.pageCount}`);
        }
        if (result.documentMetadata?.title) {
          console.log(`  Title: ${result.documentMetadata.title}`);
        }
        if (result.warnings.length > 0) {
          console.log();
          console.log(chalk.yellow("Warnings:"));
          for (const warning of result.warnings) {
            console.log(chalk.yellow(`  ⚠ ${warning}`));
          }
        }
        console.log();
        console.log(chalk.bold("Extracted Content:"));
        console.log(chalk.dim("─".repeat(50)));
        console.log(result.content.substring(0, 2000));
        if (result.content.length > 2000) {
          console.log(chalk.dim(`\n... (${result.content.length - 2000} more characters)`));
        }
      }
    }

    exit(ExitCode.SUCCESS);
  } catch (error) {
    spinner?.fail("Extraction failed");
    const errorMsg = error instanceof Error ? error.message : String(error);
    if (options.output === "json") {
      console.log(JSON.stringify({ success: false, error: errorMsg }));
    } else {
      console.error(chalk.red(`Error: ${errorMsg}`));
    }
    exit(ExitCode.RUNTIME_ERROR);
  }
}

// ─────────────────────────────────────────────────────────────────
// POLICY COMPILE SUBCOMMAND
// ─────────────────────────────────────────────────────────────────

interface CompileOptions {
  output?: "text" | "json" | "yaml";
  outputFile?: string;
  name?: string;
  lockFile?: string;
  strict?: boolean;
  minConfidence?: number;
  expirationDays?: number;
}

policyCommand
  .command("compile")
  .description("Compile policy documents into AIR and governance.lock")
  .argument("<sources...>", "Paths to policy documents or URLs")
  .option("-o, --output <format>", "Output format (text, json, yaml)", "text")
  .option("-f, --output-file <path>", "Write AIR output to file")
  .option("--lock-file <path>", "Write governance.lock to file")
  .option("-n, --name <name>", "Policy name", "Compiled AI Governance Policy")
  .option("-s, --strict", "Fail on unresolved conflicts", false)
  .option("--min-confidence <number>", "Minimum confidence threshold (0-1)", "0.7")
  .option("--expiration-days <number>", "Policy expiration in days", "30")
  .action(async (sources: string[], options: CompileOptions) => {
    await runCompile(sources, options);
  });

async function runCompile(sources: string[], options: CompileOptions): Promise<void> {
  if (options.output === "text" && !options.outputFile) {
    printHeader();
    console.log(chalk.bold("Policy Compilation"));
    console.log(chalk.dim("─".repeat(50)));
    console.log();
  }

  // Register extractors
  registerExtractors();

  const spinner = options.output === "text" && !options.outputFile
    ? ora("Analyzing policy sources...").start()
    : undefined;

  try {
    // Prepare policy sources
    const policySources: Array<{
      source: PolicySourceInput;
      extraction: ExtractionResult;
    }> = [];

    for (const source of sources) {
      const sourceType = inferSourceType(source);
      if (!sourceType) {
        spinner?.warn(`Skipping unknown source type: ${source}`);
        continue;
      }

      const extractor = extractorRegistry.getExtractor(sourceType);
      if (!extractor || !extractor.isAvailable()) {
        spinner?.warn(`No available extractor for: ${source}`);
        continue;
      }

      if (spinner) {
        spinner.text = `Extracting: ${path.basename(source)}`;
      }

      const policySource: PolicySourceInput = {
        type: sourceType,
        uri: source.startsWith("http") ? source : path.resolve(process.cwd(), source),
      };

      const extraction = await extractor.extract(policySource);
      if (!extraction.success) {
        spinner?.warn(`Extraction failed for ${source}: ${extraction.error}`);
        continue;
      }

      policySources.push({ source: policySource, extraction });
    }

    if (policySources.length === 0) {
      spinner?.fail("No policy sources could be processed");
      exit(ExitCode.FILE_NOT_FOUND);
    }

    if (spinner) {
      spinner.text = `Compiling ${policySources.length} policy sources...`;
    }

    // Create compiler
    const compiler = createCompiler({
      strictMode: options.strict ?? false,
      minConfidence: parseFloat(String(options.minConfidence ?? "0.7")),
      defaultExpirationDays: parseInt(String(options.expirationDays ?? "30"), 10),
    });

    // For manual sources, parse constraints directly
    const manualExtractor = new ManualExtractor();
    const compileSources: Array<{
      source: PolicySourceInput;
      extraction: ExtractionResult;
      constraints: ExtractedConstraint[];
    }> = [];

    for (const ps of policySources) {
      if (ps.source.type === "manual") {
        const parsed = await manualExtractor.parseConstraintFile(ps.source);
        compileSources.push({
          source: ps.source,
          extraction: ps.extraction,
          constraints: parsed.constraints,
        });
      } else {
        // For non-manual sources, we need pattern or LLM extraction
        // For now, just include as a source with no auto-extracted constraints
        compileSources.push({
          source: ps.source,
          extraction: ps.extraction,
          constraints: [],
        });
      }
    }

    // Compile
    const result = await compiler.compile(compileSources);

    spinner?.succeed(`Compiled ${result.appliedConstraints.length} constraints from ${policySources.length} sources`);

    // Output results
    await outputCompileResults(result, options);

    if (!result.success) {
      exit(ExitCode.VALIDATION_ERRORS);
    }
    exit(ExitCode.SUCCESS);
  } catch (error) {
    spinner?.fail("Compilation failed");
    const errorMsg = error instanceof Error ? error.message : String(error);
    if (options.output === "json") {
      console.log(JSON.stringify({ success: false, error: errorMsg }));
    } else {
      console.error(chalk.red(`Error: ${errorMsg}`));
    }
    exit(ExitCode.RUNTIME_ERROR);
  }
}

async function outputCompileResults(
  result: CompilationResult,
  options: CompileOptions
): Promise<void> {
  const { output = "text", outputFile, lockFile } = options;

  // Write AIR
  if (result.air) {
    let airOutput: string;
    if (output === "yaml") {
      airOutput = YAML.stringify(result.air);
    } else if (output === "json") {
      airOutput = JSON.stringify(result.air, null, 2);
    } else {
      // Text output - summarize
      airOutput = formatAirSummary(result);
    }

    if (outputFile) {
      await fs.writeFile(outputFile, airOutput, "utf-8");
      console.log(chalk.green(`✓ AIR written to ${outputFile}`));
    } else if (output !== "text") {
      console.log(airOutput);
    } else {
      console.log(airOutput);
    }

    // Write governance.lock
    if (lockFile && result.air) {
      const compiler = createCompiler();
      const lock = await compiler.createLock(result.air);
      const lockContent = YAML.stringify(lock);
      await fs.writeFile(lockFile, lockContent, "utf-8");
      console.log(chalk.green(`✓ governance.lock written to ${lockFile}`));
    }
  }
}

function formatAirSummary(result: CompilationResult): string {
  const lines: string[] = [];

  lines.push(chalk.bold("Compilation Summary"));
  lines.push("─".repeat(50));
  lines.push("");

  if (result.air) {
    lines.push(`${chalk.bold("Policy ID:")} ${result.air.id}`);
    lines.push(`${chalk.bold("Name:")} ${result.air.name}`);
    lines.push(`${chalk.bold("Version:")} ${result.air.version}`);
    lines.push("");
  }

  // Stats
  lines.push(chalk.bold("Statistics:"));
  lines.push(`  Total constraints: ${result.stats.totalConstraints}`);
  lines.push(`  Applied: ${result.stats.appliedConstraints}`);
  lines.push(`  Skipped: ${result.stats.skippedConstraints}`);
  lines.push(`  Conflicts detected: ${result.stats.totalConflicts}`);
  lines.push(`  Conflicts resolved: ${result.stats.resolvedConflicts}`);
  lines.push(`  Compilation time: ${result.stats.compilationTimeMs}ms`);
  lines.push("");

  // Sources
  if (result.sources.length > 0) {
    lines.push(chalk.bold("Policy Sources:"));
    for (const source of result.sources) {
      lines.push(`  • ${source.title || source.uri} (${source.type})`);
    }
    lines.push("");
  }

  // Registry constraints
  if (result.air?.registry) {
    const r = result.air.registry;
    const hasRegistry = (r.allowed_vendors?.length ?? 0) > 0 ||
      (r.blocked_vendors?.length ?? 0) > 0 ||
      (r.allowed_models?.length ?? 0) > 0 ||
      (r.blocked_models?.length ?? 0) > 0;

    if (hasRegistry) {
      lines.push(chalk.bold("Registry Constraints:"));
      if (r.allowed_vendors?.length) {
        lines.push(`  Allowed vendors: ${r.allowed_vendors.map(v => v.name || v.id).join(", ")}`);
      }
      if (r.blocked_vendors?.length) {
        // blocked_vendors is string[], not AIRVendor[]
        lines.push(`  Blocked vendors: ${r.blocked_vendors.join(", ")}`);
      }
      if (r.allowed_models?.length) {
        lines.push(`  Allowed models: ${r.allowed_models.map(m => m.name || m.id).join(", ")}`);
      }
      if (r.blocked_models?.length) {
        // blocked_models is string[], not AIRModel[]
        lines.push(`  Blocked models: ${r.blocked_models.join(", ")}`);
      }
      lines.push("");
    }
  }

  // Runtime constraints
  if (result.air?.runtime) {
    const rt = result.air.runtime;
    const hasRuntime = rt.pii_filter || rt.toxicity_filter ||
      rt.data_retention_days !== undefined || rt.kill_switch !== undefined;

    if (hasRuntime) {
      lines.push(chalk.bold("Runtime Constraints:"));
      if (rt.pii_filter) {
        lines.push(`  PII Filter: ${rt.pii_filter.enabled ? "enabled" : "disabled"}`);
      }
      if (rt.toxicity_filter) {
        lines.push(`  Toxicity Filter: ${rt.toxicity_filter.enabled ? "enabled" : "disabled"}`);
      }
      if (rt.data_retention_days !== undefined) {
        lines.push(`  Data Retention: ${rt.data_retention_days} days`);
      }
      if (rt.kill_switch !== undefined) {
        lines.push(`  Kill Switch: ${rt.kill_switch ? "enabled" : "disabled"}`);
      }
      lines.push("");
    }
  }

  // Build constraints
  if (result.air?.build) {
    const b = result.air.build;
    const hasBuild = b.require_golden_thread || b.require_asset_card ||
      b.require_risk_classification || b.block_on_failure;

    if (hasBuild) {
      lines.push(chalk.bold("Build Constraints:"));
      if (b.require_golden_thread) lines.push("  ✓ Require Golden Thread");
      if (b.require_asset_card) lines.push("  ✓ Require Asset Card");
      if (b.require_risk_classification) lines.push("  ✓ Require Risk Classification");
      if (b.block_on_failure) lines.push("  ✓ Block on Failure");
      lines.push("");
    }
  }

  // Warnings and errors
  if (result.warnings.length > 0) {
    lines.push(chalk.yellow("Warnings:"));
    for (const warning of result.warnings) {
      lines.push(chalk.yellow(`  ⚠ ${warning}`));
    }
    lines.push("");
  }

  if (result.errors.length > 0) {
    lines.push(chalk.red("Errors:"));
    for (const error of result.errors) {
      lines.push(chalk.red(`  ✗ ${error}`));
    }
    lines.push("");
  }

  // Unresolved conflicts
  if (result.unresolvedConflicts.length > 0) {
    lines.push(chalk.red("Unresolved Conflicts:"));
    for (const conflict of result.unresolvedConflicts) {
      lines.push(chalk.red(`  ✗ ${conflict.description}`));
    }
    lines.push("");
  }

  lines.push("─".repeat(50));
  const statusIcon = result.success ? chalk.green("✓") : chalk.red("✗");
  lines.push(`${statusIcon} Compilation ${result.success ? "successful" : "failed"}`);

  return lines.join("\n");
}

// ─────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────

function registerExtractors(): void {
  // Extractors register themselves when imported,
  // but we can also manually register them
  const pdf = new PdfExtractor();
  const docx = new DocxExtractor();
  const url = new UrlExtractor();
  const manual = new ManualExtractor();

  // Note: extractors auto-register via their constructors
  // This is just to ensure they're loaded
  void pdf;
  void docx;
  void url;
  void manual;
}

function inferSourceType(source: string): PolicySourceType | null {
  const lowerSource = source.toLowerCase();

  if (lowerSource.startsWith("http://") || lowerSource.startsWith("https://")) {
    return "url";
  }

  if (lowerSource.endsWith(".pdf")) {
    return "pdf";
  }

  if (lowerSource.endsWith(".docx") || lowerSource.endsWith(".doc")) {
    return "docx";
  }

  if (lowerSource.endsWith(".yaml") || lowerSource.endsWith(".yml") || lowerSource.endsWith(".json")) {
    return "manual";
  }

  if (lowerSource.endsWith(".html") || lowerSource.endsWith(".htm")) {
    return "url";
  }

  return null;
}

// ─────────────────────────────────────────────────────────────────
// POLICY STATUS SUBCOMMAND (AIG-152)
// Shows the status of the governance.lock file
// ─────────────────────────────────────────────────────────────────

interface StatusOptions {
  lock?: string;
  output?: "text" | "json";
}

policyCommand
  .command("status")
  .description("Show governance.lock status and policy summary")
  .option("-l, --lock <path>", "Path to governance.lock", "governance.lock")
  .option("-o, --output <format>", "Output format (text, json)", "text")
  .action(async (options: StatusOptions) => {
    await runStatus(options);
  });

async function runStatus(options: StatusOptions): Promise<void> {
  const lockPath = options.lock ?? "governance.lock";

  if (options.output !== "json") {
    printHeader();
    console.log(chalk.bold("Policy Status"));
    console.log(chalk.dim("─".repeat(50)));
    console.log();
  }

  const spinner = options.output !== "json" ? ora("Loading governance.lock...").start() : null;

  try {
    const result = await loadGovernanceLock(lockPath);

    if (spinner) spinner.stop();

    if (options.output === "json") {
      const jsonOutput = {
        valid: result.valid,
        exists: result.exists,
        expired: result.expired,
        path: result.path,
        errors: result.errors,
        warnings: result.warnings,
        lock: result.lock ? {
          name: result.lock.name,
          version: result.lock.version,
          generated_at: result.lock.generated_at,
          expires_at: result.lock.expires_at,
          policy_hash: result.lock.policy_hash,
          policy_sources: result.lock.policy_sources.length,
          signatures: result.lock.signatures.length,
          constraints: {
            registry: {
              allowed_vendors: result.lock.constraints.registry.allowed_vendor_ids.length,
              blocked_vendors: result.lock.constraints.registry.blocked_vendor_ids.length,
              allowed_regions: result.lock.constraints.registry.allowed_region_codes.length,
              blocked_regions: result.lock.constraints.registry.blocked_region_codes.length,
              allowed_models: result.lock.constraints.registry.allowed_model_patterns.length,
              blocked_models: result.lock.constraints.registry.blocked_model_patterns.length,
            },
          },
        } : null,
      };
      console.log(JSON.stringify(jsonOutput, null, 2));

      if (!result.valid) {
        exit(ExitCode.VALIDATION_ERRORS);
      }
      return;
    }

    // Text output
    if (!result.exists) {
      console.log(chalk.red("✗ governance.lock not found"));
      console.log(chalk.dim(`  Expected at: ${lockPath}`));
      console.log();
      console.log("Run", chalk.cyan("aigrc policy compile"), "to generate one.");
      exit(ExitCode.FILE_NOT_FOUND);
    }

    if (!result.valid) {
      console.log(chalk.red("✗ governance.lock is invalid"));
      for (const error of result.errors) {
        console.log(chalk.red(`  • ${error}`));
      }
      exit(ExitCode.VALIDATION_ERRORS);
    }

    const lock = result.lock!;

    // Header
    console.log(chalk.green("✓ governance.lock is valid"));
    console.log();

    // Basic info
    console.log(chalk.bold("Policy:"), lock.name || "(unnamed)");
    console.log(chalk.bold("Version:"), lock.version);
    console.log(chalk.bold("Generated:"), new Date(lock.generated_at).toLocaleString());
    console.log(chalk.bold("Generator:"), `${lock.generated_by} v${lock.generator_version}`);
    console.log();

    // Expiration
    const daysUntil = getDaysUntilExpiration(lock);
    const isExpired = isGovernanceLockExpired(lock);

    if (isExpired) {
      console.log(chalk.red("✗ Expired:"), new Date(lock.expires_at).toLocaleString());
      console.log(chalk.red("  Policy refresh required!"));
    } else if (daysUntil <= 7) {
      console.log(chalk.yellow("⚠ Expires:"), new Date(lock.expires_at).toLocaleString());
      console.log(chalk.yellow(`  Expires in ${daysUntil} days - consider refreshing soon`));
    } else {
      console.log(chalk.bold("Expires:"), new Date(lock.expires_at).toLocaleString());
      console.log(chalk.dim(`  (${daysUntil} days remaining)`));
    }
    console.log();

    // Signatures
    if (lock.signatures.length > 0) {
      console.log(chalk.bold("Signatures:"));
      for (const sig of lock.signatures) {
        const sigExpired = sig.expires_at && new Date(sig.expires_at) < new Date();
        const icon = sigExpired ? chalk.yellow("⚠") : chalk.green("✓");
        console.log(`  ${icon} ${sig.signer} (${sig.algorithm})${sig.role ? ` [${sig.role}]` : ""}`);
      }
    } else {
      console.log(chalk.dim("No signatures"));
    }
    console.log();

    // Policy sources
    if (lock.policy_sources.length > 0) {
      console.log(chalk.bold("Policy Sources:"));
      for (const source of lock.policy_sources) {
        console.log(`  • ${source.title || source.uri} (${source.type})`);
      }
      console.log();
    }

    // Constraints summary
    const reg = lock.constraints.registry;
    const rt = lock.constraints.runtime;
    const build = lock.constraints.build;

    console.log(chalk.bold("Constraints:"));
    console.log(`  Registry:`);
    console.log(`    Allowed vendors: ${reg.allowed_vendor_ids.length}`);
    console.log(`    Blocked vendors: ${reg.blocked_vendor_ids.length}`);
    console.log(`    Allowed models: ${reg.allowed_model_patterns.length}`);
    console.log(`    Blocked models: ${reg.blocked_model_patterns.length}`);
    console.log(`    Allowed regions: ${reg.allowed_region_codes.length}`);
    console.log(`    Blocked regions: ${reg.blocked_region_codes.length}`);
    console.log();

    console.log(`  Runtime:`);
    console.log(`    PII filter: ${rt.pii_filter_enabled ? "enabled" : "disabled"}`);
    console.log(`    Toxicity filter: ${rt.toxicity_filter_enabled ? "enabled" : "disabled"}`);
    console.log(`    Data retention: ${rt.data_retention_days} days`);
    console.log(`    Kill switch: ${rt.kill_switch_enabled ? "enabled" : "disabled"}`);
    console.log();

    console.log(`  Build:`);
    if (build.require_golden_thread) console.log(`    ✓ Require Golden Thread`);
    if (build.require_asset_card) console.log(`    ✓ Require Asset Card`);
    if (build.require_risk_classification) console.log(`    ✓ Require Risk Classification`);
    if (build.block_on_failure) console.log(`    ✓ Block on Failure`);
    if (build.generate_sarif) console.log(`    ✓ Generate SARIF`);
    console.log();

    // Warnings
    if (result.warnings.length > 0) {
      console.log(chalk.yellow("Warnings:"));
      for (const warning of result.warnings) {
        console.log(chalk.yellow(`  ⚠ ${warning}`));
      }
    }

  } catch (error) {
    if (spinner) spinner.fail("Failed to load governance.lock");
    console.error(chalk.red(`Error: ${error instanceof Error ? error.message : String(error)}`));
    exit(ExitCode.RUNTIME_ERROR);
  }
}

// ─────────────────────────────────────────────────────────────────
// POLICY CHECK SUBCOMMAND (AIG-153)
// Scans code for policy violations
// ─────────────────────────────────────────────────────────────────

interface CheckOptions {
  lock?: string;
  output?: "text" | "json" | "sarif";
  outputFile?: string;
  include?: string[];
  exclude?: string[];
  failOnWarnings?: boolean;
}

policyCommand
  .command("check")
  .description("Scan code for policy violations against governance.lock")
  .argument("[directory]", "Directory to scan", ".")
  .option("-l, --lock <path>", "Path to governance.lock", "governance.lock")
  .option("-o, --output <format>", "Output format (text, json, sarif)", "text")
  .option("-f, --output-file <path>", "Write report to file")
  .option("-i, --include <patterns...>", "File patterns to include")
  .option("-e, --exclude <patterns...>", "File patterns to exclude")
  .option("--fail-on-warnings", "Exit with error on warnings")
  .action(async (directory: string, options: CheckOptions) => {
    await runCheck(directory, options);
  });

async function runCheck(directory: string, options: CheckOptions): Promise<void> {
  const lockPath = options.lock ?? "governance.lock";
  const targetDir = path.resolve(directory);

  if (options.output === "text" && !options.outputFile) {
    printHeader();
    console.log(chalk.bold("Policy Check"));
    console.log(chalk.dim("─".repeat(50)));
    console.log();
  }

  const spinner = options.output === "text" && !options.outputFile
    ? ora("Loading governance.lock...").start()
    : null;

  try {
    // Load governance.lock
    const lockResult = await loadGovernanceLock(lockPath);

    if (!lockResult.valid || !lockResult.air) {
      if (spinner) spinner.fail("Invalid governance.lock");

      if (options.output === "json") {
        console.log(JSON.stringify({
          error: "Invalid governance.lock",
          details: lockResult.errors,
        }));
      } else if (options.output !== "sarif") {
        console.error(chalk.red("Error: Invalid governance.lock"));
        for (const error of lockResult.errors) {
          console.error(chalk.red(`  • ${error}`));
        }
      }
      exit(ExitCode.VALIDATION_ERRORS);
    }

    if (spinner) spinner.text = `Scanning ${targetDir}...`;

    // Create scanner and scan
    const scanner = new CodeScanner(lockResult.air, {
      includePatterns: options.include,
      excludePatterns: options.exclude,
      failOnWarnings: options.failOnWarnings,
    });

    const scanResult = await scanner.scanDirectory(targetDir);

    if (spinner) spinner.stop();

    // Generate report
    const reporter = new Reporter({
      colors: options.output === "text" && !options.outputFile,
      showAlternatives: true,
    });

    let report: string;
    if (options.output === "sarif") {
      report = generateSarifReportString(scanResult, {
        baseDir: targetDir,
        pretty: true,
      });
    } else if (options.output === "json") {
      report = reporter.json(scanResult);
    } else {
      report = reporter.text(scanResult);
    }

    // Output
    if (options.outputFile) {
      await fs.writeFile(options.outputFile, report, "utf-8");
      console.log(chalk.green(`✓ Report written to ${options.outputFile}`));
    } else {
      console.log(report);
    }

    // Exit code
    if (!scanResult.passed) {
      exit(ExitCode.VALIDATION_ERRORS);
    }

  } catch (error) {
    if (spinner) spinner.fail("Scan failed");

    if (options.output === "json") {
      console.log(JSON.stringify({
        error: error instanceof Error ? error.message : String(error),
      }));
    } else if (options.output !== "sarif") {
      console.error(chalk.red(`Error: ${error instanceof Error ? error.message : String(error)}`));
    }
    exit(ExitCode.RUNTIME_ERROR);
  }
}
