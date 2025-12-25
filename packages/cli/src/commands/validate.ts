import { Command } from "commander";
import chalk from "chalk";
import ora from "ora";
import path from "path";
import fs from "fs/promises";
import {
  loadAssetCard,
  classifyRisk,
  validateAssetCard,
  type AssetCard,
  type ClassificationResult,
} from "@aigrc/core";
import { printHeader } from "../utils/output.js";

// ─────────────────────────────────────────────────────────────────
// VALIDATE COMMAND
// ─────────────────────────────────────────────────────────────────

interface ValidateCommandOptions {
  strict?: boolean;
  output?: "text" | "json";
  all?: boolean;
}

const DEFAULT_CARDS_DIR = ".aigrc/cards";

export const validateCommand = new Command("validate")
  .description("Validate asset cards against compliance requirements")
  .argument("[path]", "Path to asset card or cards directory")
  .option("-s, --strict", "Fail on warnings as well as errors")
  .option("-o, --output <format>", "Output format (text, json)", "text")
  .option("-a, --all", "Validate all cards in the cards directory")
  .action(async (cardPath: string | undefined, options: ValidateCommandOptions) => {
    await runValidate(cardPath, options);
  });

async function runValidate(
  cardPath: string | undefined,
  options: ValidateCommandOptions
): Promise<void> {
  if (options.output === "text") {
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
    } catch {
      if (options.output === "text") {
        console.log(chalk.yellow("No cards directory found."));
        console.log(chalk.dim(`Expected: ${cardsDir}`));
        console.log(chalk.dim("Run `aigrc init` to initialize AIGRC."));
      } else {
        console.log(JSON.stringify({ error: "No cards directory found" }));
      }
      process.exit(1);
    }
  } else {
    cardsToValidate.push(path.resolve(process.cwd(), cardPath));
  }

  if (cardsToValidate.length === 0) {
    if (options.output === "text") {
      console.log(chalk.yellow("No asset cards found to validate."));
    } else {
      console.log(JSON.stringify({ error: "No asset cards found" }));
    }
    process.exit(1);
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
  }> = [];

  let hasErrors = false;

  for (const cardFile of cardsToValidate) {
    const spinner = options.output === "text"
      ? ora(`Validating ${path.basename(cardFile)}...`).start()
      : undefined;

    try {
      const card = loadAssetCard(cardFile);
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
      });

      if (!validation.valid) {
        hasErrors = true;
        spinner?.fail(`${path.basename(cardFile)}: Invalid`);
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

  // Output results
  if (options.output === "json") {
    console.log(JSON.stringify({ results }, null, 2));
  } else {
    console.log();
    printValidationSummary(results);
  }

  // Exit code
  if (hasErrors) {
    process.exit(1);
  }
}

function printValidationSummary(
  results: Array<{
    path: string;
    card?: AssetCard;
    validation: { valid: boolean; errors: string[] };
    classification?: ClassificationResult;
  }>
): void {
  console.log(chalk.bold("Validation Summary"));
  console.log(chalk.dim("─".repeat(50)));
  console.log();

  for (const result of results) {
    const fileName = path.basename(result.path);

    if (!result.validation.valid) {
      console.log(chalk.red(`✗ ${fileName}`));

      for (const error of result.validation.errors) {
        console.log(chalk.red(`    Error: ${error}`));
      }
    } else {
      console.log(chalk.green(`✓ ${fileName}`));

      if (result.card && result.classification) {
        const tierColor = getRiskLevelColor(result.classification.riskLevel);
        console.log(
          chalk.dim("    Risk Level: ") +
            tierColor(result.classification.riskLevel)
        );

        if (result.classification.euAiActCategory) {
          console.log(
            chalk.dim("    EU AI Act: ") +
              chalk.yellow(result.classification.euAiActCategory)
          );
        }
      }
    }

    console.log();
  }

  // Summary counts
  const valid = results.filter((r) => r.validation.valid).length;
  const invalid = results.filter((r) => !r.validation.valid).length;

  console.log(chalk.dim("─".repeat(50)));
  console.log(
    `Total: ${results.length} | ` +
      chalk.green(`Valid: ${valid}`) +
      ` | ` +
      chalk.red(`Invalid: ${invalid}`)
  );
}

function getRiskLevelColor(level: string): (text: string) => string {
  switch (level) {
    case "minimal":
      return chalk.green;
    case "limited":
      return chalk.yellow;
    case "high":
      return chalk.red;
    case "unacceptable":
      return chalk.magenta;
    default:
      return chalk.white;
  }
}
