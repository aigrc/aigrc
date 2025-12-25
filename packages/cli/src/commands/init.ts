import { Command } from "commander";
import chalk from "chalk";
import ora from "ora";
import path from "path";
import fs from "fs/promises";
import { stringify } from "yaml";
import {
  scan,
  suggestAssetCard,
  initializePatterns,
  createAssetCard,
  saveAssetCard,
} from "@aigrc/core";
import {
  printHeader,
  printAssetSuggestion,
} from "../utils/output.js";
import { promptForRegistration } from "../utils/prompts.js";

// ─────────────────────────────────────────────────────────────────
// INIT COMMAND
// ─────────────────────────────────────────────────────────────────

interface InitCommandOptions {
  force?: boolean;
  yes?: boolean;
  output?: string;
}

const DEFAULT_CONFIG_FILE = ".aigrc.yaml";
const DEFAULT_CARDS_DIR = ".aigrc/cards";

export const initCommand = new Command("init")
  .description("Initialize AIGRC in a project - scan, detect, and create asset card")
  .argument("[directory]", "Directory to initialize", ".")
  .option("-f, --force", "Overwrite existing configuration")
  .option("-y, --yes", "Accept all defaults without prompting")
  .option("-o, --output <path>", "Output path for asset card")
  .action(async (directory: string, options: InitCommandOptions) => {
    await runInit(directory, options);
  });

async function runInit(directory: string, options: InitCommandOptions): Promise<void> {
  const targetDir = path.resolve(process.cwd(), directory);

  printHeader();
  console.log(chalk.cyan("Initializing AIGRC in:"), targetDir);
  console.log();

  // Check for existing config
  const configPath = path.join(targetDir, DEFAULT_CONFIG_FILE);
  const configExists = await fileExists(configPath);

  if (configExists && !options.force) {
    console.log(chalk.yellow("⚠ AIGRC already initialized in this directory."));
    console.log(chalk.dim(`  Config file: ${configPath}`));
    console.log(chalk.dim("  Use --force to reinitialize."));
    return;
  }

  // Initialize patterns and scan
  initializePatterns();

  const spinner = ora("Scanning for AI/ML frameworks...").start();

  try {
    const result = await scan({
      directory: targetDir,
      ignorePatterns: ["node_modules", ".git", "dist", "build", "__pycache__", ".venv", "venv"],
    });

    spinner.succeed(`Found ${result.detections.length} AI/ML detections`);

    if (result.detections.length === 0) {
      console.log();
      console.log(chalk.yellow("No AI/ML frameworks detected."));
      console.log(chalk.dim("You can still create an asset card manually using:"));
      console.log(chalk.dim("  aigrc register --manual"));
      return;
    }

    // Generate suggestion
    const suggestion = suggestAssetCard(result);

    console.log();
    printAssetSuggestion(suggestion);
    console.log();

    let registrationData;

    if (options.yes) {
      // Use defaults
      registrationData = {
        name: suggestion.name,
        description: suggestion.description,
        owner: {
          name: process.env.USER || process.env.USERNAME || "Unknown",
          email: `${process.env.USER || process.env.USERNAME || "user"}@example.com`,
        },
        confirmRiskFactors: true,
      };
    } else {
      // Interactive prompts
      registrationData = await promptForRegistration(suggestion);
    }

    // Create asset card
    const riskFactors = registrationData.confirmRiskFactors
      ? suggestion.riskFactors
      : { ...suggestion.riskFactors, ...registrationData.riskFactorOverrides };

    const assetCard = createAssetCard({
      name: registrationData.name,
      description: registrationData.description,
      owner: registrationData.owner,
      technical: {
        type: suggestion.technical.type,
        framework: suggestion.technical.framework,
      },
      riskFactors: {
        autonomousDecisions: riskFactors.autonomousDecisions ?? false,
        customerFacing: riskFactors.customerFacing ?? false,
        toolExecution: riskFactors.toolExecution ?? false,
        externalDataAccess: riskFactors.externalDataAccess ?? false,
        piiProcessing: riskFactors.piiProcessing ?? "unknown",
        highStakesDecisions: riskFactors.highStakesDecisions ?? false,
      },
    });

    // Create cards directory
    const cardsDir = path.join(targetDir, DEFAULT_CARDS_DIR);
    await fs.mkdir(cardsDir, { recursive: true });

    // Write asset card
    const cardFileName = `${sanitizeFileName(assetCard.name)}.yaml`;
    const cardPath = options.output || path.join(cardsDir, cardFileName);
    saveAssetCard(assetCard, cardPath);

    console.log();
    console.log(chalk.green("✓ Asset card created:"), chalk.cyan(cardPath));

    // Create config file
    const config = {
      version: "1.0",
      cardsDir: DEFAULT_CARDS_DIR,
      scan: {
        exclude: ["node_modules", ".git", "dist", "build", "__pycache__", ".venv", "venv"],
      },
    };

    await fs.writeFile(configPath, stringify(config), "utf-8");
    console.log(chalk.green("✓ Config file created:"), chalk.cyan(configPath));

    console.log();
    console.log(chalk.green("AIGRC initialized successfully!"));
    console.log();
    console.log(chalk.dim("Next steps:"));
    console.log(chalk.dim("  1. Review and edit the asset card: ") + chalk.cyan(cardPath));
    console.log(chalk.dim("  2. Run ") + chalk.cyan("aigrc validate") + chalk.dim(" to check compliance"));
    console.log(chalk.dim("  3. Run ") + chalk.cyan("aigrc status") + chalk.dim(" to see current status"));
  } catch (error) {
    spinner.fail("Initialization failed");

    if (error instanceof Error) {
      console.error(chalk.red(`\nError: ${error.message}`));
    }

    process.exit(1);
  }
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

function sanitizeFileName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}
