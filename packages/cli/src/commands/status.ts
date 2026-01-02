import { Command } from "commander";
import chalk from "chalk";
import path from "path";
import fs from "fs/promises";
import {
  loadAssetCard,
  classifyRisk,
  extractGoldenThreadComponents,
  verifyGoldenThreadHashSync,
  type AssetCard,
  type ClassificationResult,
} from "@aigrc/core";
import { printHeader } from "../utils/output.js";

// ─────────────────────────────────────────────────────────────────
// STATUS COMMAND
// ─────────────────────────────────────────────────────────────────

interface StatusCommandOptions {
  output?: "text" | "json";
}

const DEFAULT_CARDS_DIR = ".aigrc/cards";
const DEFAULT_CONFIG_FILE = ".aigrc.yaml";

export const statusCommand = new Command("status")
  .description("Show the current AIGRC status and registered assets")
  .option("-o, --output <format>", "Output format (text, json)", "text")
  .action(async (options: StatusCommandOptions) => {
    await runStatus(options);
  });

async function runStatus(options: StatusCommandOptions): Promise<void> {
  const cwd = process.cwd();

  if (options.output === "text") {
    printHeader();
  }

  // Check for AIGRC initialization
  const configPath = path.join(cwd, DEFAULT_CONFIG_FILE);
  const cardsDir = path.join(cwd, DEFAULT_CARDS_DIR);

  const configExists = await fileExists(configPath);
  const cardsDirExists = await directoryExists(cardsDir);

  if (!configExists && !cardsDirExists) {
    if (options.output === "text") {
      console.log(chalk.yellow("AIGRC is not initialized in this directory."));
      console.log(chalk.dim("\nRun `aigrc init` to get started."));
    } else {
      console.log(JSON.stringify({ initialized: false }));
    }
    return;
  }

  // Load and display asset cards
  const cards: Array<{
    path: string;
    card: AssetCard;
    classification: ClassificationResult;
  }> = [];

  if (cardsDirExists) {
    try {
      const files = await fs.readdir(cardsDir);
      const yamlFiles = files.filter((f) => f.endsWith(".yaml") || f.endsWith(".yml"));

      for (const file of yamlFiles) {
        try {
          const filePath = path.join(cardsDir, file);
          const card = loadAssetCard(filePath);
          const classification = classifyRisk(card.classification.riskFactors);

          cards.push({ path: filePath, card, classification });
        } catch {
          // Skip invalid cards in status view
        }
      }
    } catch {
      // Cards directory read error
    }
  }

  if (options.output === "json") {
    console.log(
      JSON.stringify(
        {
          initialized: true,
          configPath,
          cardsDir,
          cards: cards.map((c) => ({
            path: c.path,
            name: c.card.name,
            id: c.card.id,
            riskLevel: c.classification.riskLevel,
            euAiActCategory: c.classification.euAiActCategory,
          })),
        },
        null,
        2
      )
    );
    return;
  }

  // Text output
  console.log(chalk.bold("AIGRC Status"));
  console.log(chalk.dim("─".repeat(50)));
  console.log();

  console.log(chalk.dim("Config:"), configExists ? chalk.green("✓") : chalk.red("✗"), configPath);
  console.log(chalk.dim("Cards:"), cardsDirExists ? chalk.green("✓") : chalk.red("✗"), cardsDir);
  console.log();

  // Show Golden Thread status for cards with Golden Thread
  printGoldenThreadStatus(cards);
  console.log();

  if (cards.length === 0) {
    console.log(chalk.yellow("No asset cards registered."));
    console.log(chalk.dim("\nRun `aigrc init` or `aigrc register` to create an asset card."));
    return;
  }

  console.log(chalk.bold(`Registered Assets (${cards.length})`));
  console.log(chalk.dim("─".repeat(50)));
  console.log();

  // Group by risk level
  const byLevel = groupByRiskLevel(cards);

  for (const level of ["unacceptable", "high", "limited", "minimal"]) {
    const levelCards = byLevel.get(level);
    if (!levelCards || levelCards.length === 0) continue;

    const levelColor = getRiskLevelColor(level);
    console.log(levelColor(`${level.toUpperCase()} (${levelCards.length})`));
    console.log();

    for (const { card, classification } of levelCards) {
      console.log(`  ${chalk.bold(card.name)}`);
      console.log(chalk.dim(`    ID: ${card.id}`));
      console.log(chalk.dim(`    Risk Level: ${classification.riskLevel}`));

      if (classification.euAiActCategory) {
        console.log(chalk.dim(`    EU AI Act: `) + chalk.yellow(classification.euAiActCategory));
      }

      if (card.ownership?.owner) {
        console.log(chalk.dim(`    Owner: ${card.ownership.owner.name} <${card.ownership.owner.email}>`));
      }

      // Show key risk factors
      const activeRisks = getActiveRiskFactors(card);
      if (activeRisks.length > 0) {
        console.log(chalk.dim(`    Risks: `) + activeRisks.join(", "));
      }

      console.log();
    }
  }

  // Summary
  printStatusSummary(cards);
}

function groupByRiskLevel(
  cards: Array<{
    path: string;
    card: AssetCard;
    classification: ClassificationResult;
  }>
): Map<string, typeof cards> {
  const byLevel = new Map<string, typeof cards>();

  for (const item of cards) {
    const level = item.classification.riskLevel;
    if (!byLevel.has(level)) {
      byLevel.set(level, []);
    }
    byLevel.get(level)!.push(item);
  }

  return byLevel;
}

function printStatusSummary(
  cards: Array<{
    path: string;
    card: AssetCard;
    classification: ClassificationResult;
  }>
): void {
  console.log(chalk.dim("─".repeat(50)));

  const minimal = cards.filter((c) => c.classification.riskLevel === "minimal").length;
  const limited = cards.filter((c) => c.classification.riskLevel === "limited").length;
  const high = cards.filter((c) => c.classification.riskLevel === "high").length;
  const unacceptable = cards.filter((c) => c.classification.riskLevel === "unacceptable").length;

  console.log(
    `Total: ${cards.length} | ` +
      chalk.green(`Minimal: ${minimal}`) +
      ` | ` +
      chalk.yellow(`Limited: ${limited}`) +
      ` | ` +
      chalk.red(`High: ${high}`) +
      ` | ` +
      chalk.magenta(`Unacceptable: ${unacceptable}`)
  );

  // High-risk warning
  if (high > 0 || unacceptable > 0) {
    console.log();
    console.log(chalk.yellow("⚠ High-risk assets detected. Review compliance requirements."));
  }
}

function getActiveRiskFactors(card: AssetCard): string[] {
  const risks: string[] = [];
  const rf = card.classification?.riskFactors;
  if (!rf) return risks;

  if (rf.autonomousDecisions) risks.push("Autonomous");
  if (rf.customerFacing) risks.push("Customer-Facing");
  if (rf.toolExecution) risks.push("Tool Execution");
  if (rf.externalDataAccess) risks.push("External Data");
  if (rf.piiProcessing === "yes") risks.push("PII");
  if (rf.highStakesDecisions) risks.push("High-Stakes");

  return risks;
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

async function fileExists(filePath: string): Promise<boolean> {
  try {
    const stat = await fs.stat(filePath);
    return stat.isFile();
  } catch {
    return false;
  }
}

async function directoryExists(dirPath: string): Promise<boolean> {
  try {
    const stat = await fs.stat(dirPath);
    return stat.isDirectory();
  } catch {
    return false;
  }
}

/**
 * Print Golden Thread status for cards (AIG-100)
 */
function printGoldenThreadStatus(
  cards: Array<{
    path: string;
    card: AssetCard;
    classification: ClassificationResult;
  }>
): void {
  const cardsWithGoldenThread = cards.filter((c) => {
    const components = extractGoldenThreadComponents(c.card);
    return components && c.card.golden_thread?.hash;
  });

  if (cardsWithGoldenThread.length === 0) {
    return;
  }

  console.log(chalk.bold("Golden Thread"));
  console.log(chalk.dim("─".repeat(50)));
  console.log();

  for (const { card } of cardsWithGoldenThread) {
    const components = extractGoldenThreadComponents(card);
    if (!components || !card.golden_thread?.hash) continue;

    console.log(chalk.bold(card.name));
    console.log(chalk.dim(`  Hash: ${card.golden_thread.hash}`));

    // Verify hash
    try {
      const verification = verifyGoldenThreadHashSync(components, card.golden_thread.hash);
      if (verification.verified) {
        console.log(chalk.dim("  Status: ") + chalk.green("✓ Verified"));
      } else {
        console.log(chalk.dim("  Status: ") + chalk.red("✗ Verification Failed"));
        if (verification.mismatch_reason) {
          console.log(chalk.dim("  Reason: ") + chalk.yellow(verification.mismatch_reason));
        }
      }
    } catch (error) {
      console.log(chalk.dim("  Status: ") + chalk.red("✗ Error"));
    }

    // Show signature if present
    if (card.golden_thread?.signature) {
      console.log(chalk.dim("  Signature: ") + chalk.green("✓ RSA-SHA256"));
    }

    console.log();
  }
}
