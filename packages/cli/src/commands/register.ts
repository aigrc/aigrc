import { Command } from "commander";
import chalk from "chalk";
import path from "path";
import fs from "fs/promises";
import inquirer from "inquirer";
import {
  createAssetCard,
  saveAssetCard,
  type RiskFactors,
} from "@aigrc/core";
import { printHeader } from "../utils/output.js";
import { promptForOwner } from "../utils/prompts.js";

// ─────────────────────────────────────────────────────────────────
// REGISTER COMMAND
// ─────────────────────────────────────────────────────────────────

interface RegisterCommandOptions {
  output?: string;
  manual?: boolean;
}

const DEFAULT_CARDS_DIR = ".aigrc/cards";

export const registerCommand = new Command("register")
  .description("Manually register an AI asset without scanning")
  .option("-o, --output <path>", "Output path for asset card")
  .option("-m, --manual", "Skip detection and enter all details manually")
  .action(async (options: RegisterCommandOptions) => {
    await runRegister(options);
  });

async function runRegister(options: RegisterCommandOptions): Promise<void> {
  printHeader();
  console.log(chalk.cyan("Register a new AI asset\n"));

  // Get basic information
  const basicInfo = await inquirer.prompt([
    {
      type: "input",
      name: "name",
      message: "Asset name:",
      validate: (input: string) => input.length > 0 || "Name is required",
    },
    {
      type: "input",
      name: "description",
      message: "Description:",
      validate: (input: string) => input.length > 0 || "Description is required",
    },
    {
      type: "input",
      name: "purpose",
      message: "Business purpose:",
    },
  ]);

  console.log("\n-- Owner Information --\n");
  const owner = await promptForOwner();

  console.log("\n-- Risk Factors --\n");
  const riskFactors = await promptForRiskFactors();

  console.log("\n-- Framework Information --\n");
  const frameworks = await promptForFrameworks();

  // Determine primary framework type based on selection
  const frameworkTypes: Record<string, "model" | "agent" | "api_client" | "framework" | "pipeline"> = {
    openai: "api_client",
    anthropic: "api_client",
    langchain: "framework",
    llamaindex: "framework",
    "vercel-ai-sdk": "framework",
    pytorch: "model",
    tensorflow: "model",
    huggingface: "model",
    crewai: "agent",
    autogen: "agent",
  };

  const primaryFramework = frameworks[0] || "unknown";
  const technicalType = frameworkTypes[primaryFramework] || "framework";

  // Create asset card
  const assetCard = createAssetCard({
    name: basicInfo.name,
    description: basicInfo.description,
    owner,
    technical: {
      type: technicalType,
      framework: primaryFramework,
    },
    riskFactors,
  });

  // Determine output path
  const cardsDir = path.join(process.cwd(), DEFAULT_CARDS_DIR);
  await fs.mkdir(cardsDir, { recursive: true });

  const cardFileName = `${sanitizeFileName(assetCard.name)}.yaml`;
  const cardPath = options.output || path.join(cardsDir, cardFileName);

  // Write asset card
  saveAssetCard(assetCard, cardPath);

  console.log();
  console.log(chalk.green("✓ Asset card created:"), chalk.cyan(cardPath));
  console.log();
  console.log(chalk.dim("Next steps:"));
  console.log(chalk.dim("  1. Review and edit the asset card"));
  console.log(chalk.dim("  2. Run ") + chalk.cyan("aigrc validate") + chalk.dim(" to check compliance"));
}

async function promptForRiskFactors(): Promise<RiskFactors> {
  const answers = await inquirer.prompt([
    {
      type: "confirm",
      name: "autonomousDecisions",
      message: "Does this AI make autonomous decisions?",
      default: false,
    },
    {
      type: "confirm",
      name: "customerFacing",
      message: "Is this AI customer-facing?",
      default: false,
    },
    {
      type: "confirm",
      name: "toolExecution",
      message: "Does this AI execute tools or functions?",
      default: false,
    },
    {
      type: "confirm",
      name: "externalDataAccess",
      message: "Does this AI access external data?",
      default: false,
    },
    {
      type: "list",
      name: "piiProcessing",
      message: "Does this AI process PII (personal data)?",
      choices: [
        { name: "Yes", value: "yes" },
        { name: "No", value: "no" },
        { name: "Unknown", value: "unknown" },
      ],
      default: "unknown",
    },
    {
      type: "confirm",
      name: "highStakesDecisions",
      message: "Does this AI make high-stakes decisions (medical, legal, financial, hiring)?",
      default: false,
    },
  ]);

  return answers;
}

async function promptForFrameworks(): Promise<string[]> {
  const { hasFrameworks } = await inquirer.prompt([
    {
      type: "confirm",
      name: "hasFrameworks",
      message: "Do you want to specify AI/ML frameworks used?",
      default: true,
    },
  ]);

  if (!hasFrameworks) {
    return [];
  }

  const { frameworkList } = await inquirer.prompt([
    {
      type: "checkbox",
      name: "frameworkList",
      message: "Select frameworks used:",
      choices: [
        { name: "OpenAI API", value: "openai" },
        { name: "Anthropic API", value: "anthropic" },
        { name: "LangChain", value: "langchain" },
        { name: "LlamaIndex", value: "llamaindex" },
        { name: "Vercel AI SDK", value: "vercel-ai-sdk" },
        { name: "PyTorch", value: "pytorch" },
        { name: "TensorFlow", value: "tensorflow" },
        { name: "Hugging Face", value: "huggingface" },
        { name: "CrewAI", value: "crewai" },
        { name: "AutoGen", value: "autogen" },
        { name: "Other", value: "other" },
      ],
    },
  ]);

  if (frameworkList.includes("other")) {
    const { otherFrameworks } = await inquirer.prompt([
      {
        type: "input",
        name: "otherFrameworks",
        message: "Enter other frameworks (comma-separated):",
      },
    ]);

    const others = otherFrameworks
      .split(",")
      .map((f: string) => f.trim())
      .filter((f: string) => f.length > 0);

    return [...frameworkList.filter((f: string) => f !== "other"), ...others];
  }

  return frameworkList;
}

function sanitizeFileName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}
