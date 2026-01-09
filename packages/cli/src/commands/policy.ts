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
