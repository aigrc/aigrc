import { Command } from "commander";
import chalk from "chalk";
import ora from "ora";
import path from "path";
import {
  scan,
  suggestAssetCard,
  initializePatterns,
  type ScanOptions,
  type ScanResult,
} from "@aigrc/core";
import {
  printHeader,
  printScanSummary,
  printDetections,
  printAssetSuggestion,
  printRiskFactors,
} from "../utils/output.js";

// ─────────────────────────────────────────────────────────────────
// SCAN COMMAND
// ─────────────────────────────────────────────────────────────────

interface ScanCommandOptions {
  output?: "text" | "json" | "yaml";
  verbose?: boolean;
  include?: string[];
  exclude?: string[];
  maxDepth?: number;
  suggest?: boolean;
  noProgress?: boolean;
}

export const scanCommand = new Command("scan")
  .description("Scan a directory for AI/ML frameworks and generate risk assessments")
  .argument("[directory]", "Directory to scan", ".")
  .option("-o, --output <format>", "Output format (text, json, yaml)", "text")
  .option("-v, --verbose", "Show detailed detection information")
  .option("-i, --include <patterns...>", "Include glob patterns")
  .option("-e, --exclude <patterns...>", "Exclude glob patterns")
  .option("-d, --max-depth <depth>", "Maximum directory depth", parseInt)
  .option("-s, --suggest", "Generate asset card suggestion from detections")
  .option("--no-progress", "Disable progress spinner")
  .action(async (directory: string, options: ScanCommandOptions) => {
    await runScan(directory, options);
  });

async function runScan(directory: string, options: ScanCommandOptions): Promise<void> {
  const targetDir = path.resolve(process.cwd(), directory);

  if (options.output === "text") {
    printHeader();
    console.log(chalk.dim(`Scanning: ${targetDir}\n`));
  }

  // Initialize pattern registry
  initializePatterns();

  // Build scan options
  const scanOptions: ScanOptions = {
    directory: targetDir,
    ignorePatterns: options.exclude,
  };

  let spinner: ReturnType<typeof ora> | undefined;
  let lastFile = "";

  if (options.output === "text" && options.noProgress !== false) {
    spinner = ora("Scanning...").start();
  }

  try {
    const result = await scan(scanOptions, (progress) => {
      if (spinner && progress.currentFile !== lastFile) {
        lastFile = progress.currentFile;
        const pct = Math.round((progress.scannedFiles / Math.max(progress.totalFiles, 1)) * 100);
        spinner.text = `Scanning (${pct}%): ${path.basename(progress.currentFile)}`;
      }
    });

    spinner?.succeed(`Scanned ${result.scannedFiles} files`);

    // Output results
    if (options.output === "json") {
      outputJson(result);
    } else if (options.output === "yaml") {
      await outputYaml(result);
    } else {
      outputText(result, options);
    }

    // Generate asset card suggestion if requested
    if (options.suggest && result.detections.length > 0) {
      const suggestion = suggestAssetCard(result);

      if (options.output === "json") {
        console.log(JSON.stringify({ suggestion }, null, 2));
      } else if (options.output === "yaml") {
        const { stringify } = await import("yaml");
        console.log(stringify({ suggestion }));
      } else {
        console.log();
        printAssetSuggestion(suggestion);
      }
    }

    // Exit with error code if high-risk detections found
    if (result.summary.byConfidence.high > 0) {
      process.exitCode = 1;
    }
  } catch (error) {
    spinner?.fail("Scan failed");

    if (error instanceof Error) {
      console.error(chalk.red(`\nError: ${error.message}`));
      if (options.verbose) {
        console.error(chalk.dim(error.stack));
      }
    }

    process.exit(1);
  }
}

function outputText(result: ScanResult, options: ScanCommandOptions): void {
  console.log();
  printScanSummary(result);

  if (result.detections.length > 0) {
    console.log();
    printDetections(result.detections, options.verbose);
  } else {
    console.log(chalk.dim("\nNo AI/ML frameworks detected."));
  }

  // Show inferred risk factors if there are detections
  if (result.inferredRiskFactors && Object.keys(result.inferredRiskFactors).length > 0) {
    console.log();
    printRiskFactors(result.inferredRiskFactors);
  }
}

function outputJson(result: ScanResult): void {
  console.log(JSON.stringify(result, null, 2));
}

async function outputYaml(result: ScanResult): Promise<void> {
  const { stringify } = await import("yaml");
  console.log(stringify(result));
}
