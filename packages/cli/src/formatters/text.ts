// ─────────────────────────────────────────────────────────────────
// TEXT OUTPUT FORMATTER
// Enhanced text output formatting for validation results
// ─────────────────────────────────────────────────────────────────

import chalk from "chalk";
import path from "path";
import type { AssetCard, ClassificationResult } from "@aigrc/core";

/**
 * Validation result for text formatting
 */
export interface ValidationResult {
  path: string;
  card?: AssetCard;
  validation: {
    valid: boolean;
    errors: string[];
  };
  classification?: ClassificationResult;
  fixed?: boolean;
  fixedFields?: string[];
}

/**
 * Print validation summary in text format
 */
export function printValidationSummary(results: ValidationResult[]): void {
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

      if (result.fixed && result.fixedFields && result.fixedFields.length > 0) {
        console.log(chalk.yellow(`    Fixed: ${result.fixedFields.join(", ")}`));
      }
    } else {
      console.log(chalk.green(`✓ ${fileName}`));

      if (result.fixed && result.fixedFields && result.fixedFields.length > 0) {
        console.log(chalk.yellow(`    Fixed: ${result.fixedFields.join(", ")}`));
      }

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
  const fixed = results.filter((r) => r.fixed).length;

  console.log(chalk.dim("─".repeat(50)));
  console.log(
    `Total: ${results.length} | ` +
      chalk.green(`Valid: ${valid}`) +
      ` | ` +
      chalk.red(`Invalid: ${invalid}`) +
      (fixed > 0 ? ` | ${chalk.yellow(`Fixed: ${fixed}`)}` : "")
  );
}

/**
 * Get color function for risk level
 */
export function getRiskLevelColor(level: string): (text: string) => string {
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
