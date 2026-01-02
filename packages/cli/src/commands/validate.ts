import { Command } from "commander";
import chalk from "chalk";
import ora from "ora";
import path from "path";
import fs from "fs/promises";
import YAML from "yaml";
import {
  loadAssetCard,
  classifyRisk,
  validateAssetCard,
  type AssetCard,
  type ClassificationResult,
} from "@aigrc/core";
import { printHeader } from "../utils/output.js";
import { ExitCode, exit } from "../utils/exit-codes.js";
import { formatSarif, sarifToJson, type ValidationResult as SarifValidationResult } from "../formatters/sarif.js";
import { printValidationSummary as printTextSummary, type ValidationResult as TextValidationResult } from "../formatters/text.js";
import { autoFixAssetCard } from "../fixers/auto-fix.js";

// ─────────────────────────────────────────────────────────────────
// VALIDATE COMMAND (Enhanced for AIG-97, AIG-98, AIG-99)
// ─────────────────────────────────────────────────────────────────

interface ValidateCommandOptions {
  strict?: boolean;
  output?: "text" | "json" | "sarif";
  all?: boolean;
  fix?: boolean;
  dryRun?: boolean;
  outputFile?: string;
}

const DEFAULT_CARDS_DIR = ".aigrc/cards";

export const validateCommand = new Command("validate")
  .description("Validate asset cards against compliance requirements")
  .argument("[path]", "Path to asset card or cards directory")
  .option("-s, --strict", "Fail on warnings as well as errors")
  .option("-o, --output <format>", "Output format (text, json, sarif)", "text")
  .option("-a, --all", "Validate all cards in the cards directory")
  .option("--fix", "Automatically fix common issues")
  .option("--dry-run", "Preview fixes without saving (requires --fix)")
  .option("--output-file <path>", "Write output to file instead of stdout")
  .action(async (cardPath: string | undefined, options: ValidateCommandOptions) => {
    await runValidate(cardPath, options);
  });

async function runValidate(
  cardPath: string | undefined,
  options: ValidateCommandOptions
): Promise<void> {
  // Validate options
  if (options.dryRun && !options.fix) {
    if (options.output === "text") {
      console.error(chalk.red("Error: --dry-run requires --fix"));
    } else {
      console.error(JSON.stringify({ error: "--dry-run requires --fix" }));
    }
    exit(ExitCode.INVALID_ARGUMENTS);
  }

  if (options.output === "text" && !options.outputFile) {
    printHeader();
  }

  const cardsToValidate: string[] = [];

  if (options.all || !cardPath) {
    // Find all cards in the cards directory
    const cardsDir = path.join(process.cwd(), DEFAULT_CARDS_DIR);

    try {
      const files = await fs.readdir(cardsDir);
      const yamlFiles = files.filter((f) => f.endsWith(".yaml") || f.endsWith(".yml"));

      for (const file of yamlFiles) {
        cardsToValidate.push(path.join(cardsDir, file));
      }
    } catch (error) {
      if (options.output === "text" && !options.outputFile) {
        console.log(chalk.yellow("No cards directory found."));
        console.log(chalk.dim(`Expected: ${cardsDir}`));
        console.log(chalk.dim("Run `aigrc init` to initialize AIGRC."));
      } else {
        const output = JSON.stringify({ error: "No cards directory found" });
        if (options.outputFile) {
          await fs.writeFile(options.outputFile, output);
        } else {
          console.log(output);
        }
      }
      exit(ExitCode.FILE_NOT_FOUND);
    }
  } else {
    const resolvedPath = path.resolve(process.cwd(), cardPath);
    try {
      await fs.access(resolvedPath);
      cardsToValidate.push(resolvedPath);
    } catch {
      if (options.output === "text" && !options.outputFile) {
        console.log(chalk.red(`Error: File not found: ${cardPath}`));
      } else {
        const output = JSON.stringify({ error: `File not found: ${cardPath}` });
        if (options.outputFile) {
          await fs.writeFile(options.outputFile, output);
        } else {
          console.log(output);
        }
      }
      exit(ExitCode.FILE_NOT_FOUND);
    }
  }

  if (cardsToValidate.length === 0) {
    if (options.output === "text" && !options.outputFile) {
      console.log(chalk.yellow("No asset cards found to validate."));
    } else {
      const output = JSON.stringify({ error: "No asset cards found" });
      if (options.outputFile) {
        await fs.writeFile(options.outputFile, output);
      } else {
        console.log(output);
      }
    }
    exit(ExitCode.FILE_NOT_FOUND);
  }

  interface ValidationResult {
    valid: boolean;
    errors: string[];
  }

  const results: Array<{
    path: string;
    card?: AssetCard;
    validation: ValidationResult;
    classification?: ClassificationResult;
    fixed?: boolean;
    fixedFields?: string[];
  }> = [];

  let hasErrors = false;

  for (const cardFile of cardsToValidate) {
    const spinner = options.output === "text" && !options.outputFile
      ? ora(`Validating ${path.basename(cardFile)}...`).start()
      : undefined;

    try {
      let card = loadAssetCard(cardFile);
      let fixed = false;
      let fixedFields: string[] = [];

      // Apply auto-fix if requested
      if (options.fix) {
        const fixResult = autoFixAssetCard(card);
        if (fixResult.fixed) {
          fixed = true;
          fixedFields = fixResult.fixedFields;
          card = fixResult.card;

          // Save fixed card unless dry-run
          if (!options.dryRun) {
            const yamlContent = YAML.stringify(card);
            await fs.writeFile(cardFile, yamlContent, "utf-8");
          }
        }
      }

      const validation = validateAssetCard(card);
      const classification = classifyRisk(card.classification.riskFactors);

      results.push({
        path: cardFile,
        card,
        validation: {
          valid: validation.valid,
          errors: validation.errors ?? [],
        },
        classification,
        fixed,
        fixedFields,
      });

      if (!validation.valid) {
        hasErrors = true;
        spinner?.fail(`${path.basename(cardFile)}: Invalid`);
      } else if (fixed) {
        spinner?.succeed(`${path.basename(cardFile)}: Valid (fixed ${fixedFields.length} issues)`);
      } else {
        spinner?.succeed(`${path.basename(cardFile)}: Valid`);
      }
    } catch (error) {
      hasErrors = true;

      const errorMessage = error instanceof Error ? error.message : "Unknown error";

      results.push({
        path: cardFile,
        validation: {
          valid: false,
          errors: [errorMessage],
        },
      });

      spinner?.fail(`${path.basename(cardFile)}: Parse error`);
    }
  }

  // Format and output results
  await outputResults(results, options);

  // Exit with appropriate code
  if (hasErrors) {
    exit(ExitCode.VALIDATION_ERRORS);
  }
  exit(ExitCode.SUCCESS);
}

async function outputResults(
  results: Array<{
    path: string;
    card?: AssetCard;
    validation: { valid: boolean; errors: string[] };
    classification?: ClassificationResult;
    fixed?: boolean;
    fixedFields?: string[];
  }>,
  options: ValidateCommandOptions
): Promise<void> {
  let output: string;

  switch (options.output) {
    case "sarif": {
      const sarif = formatSarif(results);
      output = sarifToJson(sarif);
      break;
    }
    case "json": {
      output = JSON.stringify({ results }, null, 2);
      break;
    }
    case "text":
    default: {
      if (options.outputFile) {
        // For text output to file, create a simple text representation
        output = formatTextOutput(results);
      } else {
        // For stdout, use the fancy formatted output
        console.log();
        printTextSummary(results);
        return;
      }
    }
  }

  // Write to file or stdout
  if (options.outputFile) {
    await fs.writeFile(options.outputFile, output, "utf-8");
    if (options.output === "text") {
      console.log(chalk.green(`✓ Output written to ${options.outputFile}`));
    }
  } else {
    console.log(output);
  }
}

function formatTextOutput(
  results: Array<{
    path: string;
    card?: AssetCard;
    validation: { valid: boolean; errors: string[] };
    classification?: ClassificationResult;
    fixed?: boolean;
    fixedFields?: string[];
  }>
): string {
  const lines: string[] = [];
  lines.push("Validation Summary");
  lines.push("─".repeat(50));
  lines.push("");

  for (const result of results) {
    const fileName = path.basename(result.path);

    if (!result.validation.valid) {
      lines.push(`✗ ${fileName}`);
      for (const error of result.validation.errors) {
        lines.push(`    Error: ${error}`);
      }
    } else {
      lines.push(`✓ ${fileName}`);
      if (result.fixed && result.fixedFields && result.fixedFields.length > 0) {
        lines.push(`    Fixed: ${result.fixedFields.join(", ")}`);
      }
      if (result.card && result.classification) {
        lines.push(`    Risk Level: ${result.classification.riskLevel}`);
        if (result.classification.euAiActCategory) {
          lines.push(`    EU AI Act: ${result.classification.euAiActCategory}`);
        }
      }
    }
    lines.push("");
  }

  const valid = results.filter((r) => r.validation.valid).length;
  const invalid = results.filter((r) => !r.validation.valid).length;
  const fixed = results.filter((r) => r.fixed).length;

  lines.push("─".repeat(50));
  lines.push(
    `Total: ${results.length} | Valid: ${valid} | Invalid: ${invalid}` +
      (fixed > 0 ? ` | Fixed: ${fixed}` : "")
  );

  return lines.join("\n");
}
