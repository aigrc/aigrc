import inquirer from "inquirer";
import type { AssetCardSuggestion } from "@aigrc/core";

// ─────────────────────────────────────────────────────────────────
// INTERACTIVE PROMPTS
// ─────────────────────────────────────────────────────────────────

export interface OwnerInfo {
  name: string;
  email: string;
  team?: string;
}

export interface RegistrationAnswers {
  name: string;
  description: string;
  owner: OwnerInfo;
  confirmRiskFactors: boolean;
  riskFactorOverrides?: {
    autonomousDecisions?: boolean;
    customerFacing?: boolean;
    toolExecution?: boolean;
    externalDataAccess?: boolean;
    piiProcessing?: "yes" | "no" | "unknown";
    highStakesDecisions?: boolean;
  };
}

export async function promptForOwner(): Promise<OwnerInfo> {
  const answers = await inquirer.prompt([
    {
      type: "input",
      name: "name",
      message: "Owner name:",
      validate: (input: string) => input.length > 0 || "Name is required",
    },
    {
      type: "input",
      name: "email",
      message: "Owner email:",
      validate: (input: string) =>
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input) || "Valid email is required",
    },
    {
      type: "input",
      name: "team",
      message: "Team name (optional):",
    },
  ]);

  return {
    name: answers.name,
    email: answers.email,
    team: answers.team || undefined,
  };
}

export async function promptForRegistration(
  suggestion: AssetCardSuggestion
): Promise<RegistrationAnswers> {
  console.log();

  const basicAnswers = await inquirer.prompt([
    {
      type: "input",
      name: "name",
      message: "Asset name:",
      default: suggestion.name,
      validate: (input: string) => input.length > 0 || "Name is required",
    },
    {
      type: "input",
      name: "description",
      message: "Description:",
      default: suggestion.description,
    },
  ]);

  console.log("\n-- Owner Information --\n");
  const owner = await promptForOwner();

  console.log("\n-- Risk Factors --\n");
  console.log("Based on the scan, the following risk factors were inferred:");
  console.log();

  const riskFactorLabels = [
    { key: "autonomousDecisions", label: "Autonomous Decisions", value: suggestion.riskFactors.autonomousDecisions },
    { key: "customerFacing", label: "Customer Facing", value: suggestion.riskFactors.customerFacing },
    { key: "toolExecution", label: "Tool Execution", value: suggestion.riskFactors.toolExecution },
    { key: "externalDataAccess", label: "External Data Access", value: suggestion.riskFactors.externalDataAccess },
    { key: "piiProcessing", label: "PII Processing", value: suggestion.riskFactors.piiProcessing },
    { key: "highStakesDecisions", label: "High-Stakes Decisions", value: suggestion.riskFactors.highStakesDecisions },
  ];

  for (const factor of riskFactorLabels) {
    const value = factor.value === true || factor.value === "yes"
      ? "Yes"
      : factor.value === false || factor.value === "no"
      ? "No"
      : "Unknown";
    console.log(`  ${factor.label}: ${value}`);
  }
  console.log();

  const { confirmRiskFactors } = await inquirer.prompt([
    {
      type: "confirm",
      name: "confirmRiskFactors",
      message: "Are these risk factors correct?",
      default: true,
    },
  ]);

  let riskFactorOverrides;

  if (!confirmRiskFactors) {
    riskFactorOverrides = await promptForRiskFactorOverrides(suggestion.riskFactors);
  }

  return {
    name: basicAnswers.name,
    description: basicAnswers.description,
    owner,
    confirmRiskFactors,
    riskFactorOverrides,
  };
}

async function promptForRiskFactorOverrides(
  current: AssetCardSuggestion["riskFactors"]
): Promise<RegistrationAnswers["riskFactorOverrides"]> {
  const answers = await inquirer.prompt([
    {
      type: "confirm",
      name: "autonomousDecisions",
      message: "Does this AI make autonomous decisions?",
      default: current.autonomousDecisions ?? false,
    },
    {
      type: "confirm",
      name: "customerFacing",
      message: "Is this AI customer-facing?",
      default: current.customerFacing ?? false,
    },
    {
      type: "confirm",
      name: "toolExecution",
      message: "Does this AI execute tools or functions?",
      default: current.toolExecution ?? false,
    },
    {
      type: "confirm",
      name: "externalDataAccess",
      message: "Does this AI access external data?",
      default: current.externalDataAccess ?? false,
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
      default: current.piiProcessing ?? "unknown",
    },
    {
      type: "confirm",
      name: "highStakesDecisions",
      message: "Does this AI make high-stakes decisions (medical, legal, financial, hiring)?",
      default: current.highStakesDecisions ?? false,
    },
  ]);

  return answers;
}

export async function confirmAction(message: string): Promise<boolean> {
  const { confirmed } = await inquirer.prompt([
    {
      type: "confirm",
      name: "confirmed",
      message,
      default: false,
    },
  ]);

  return confirmed;
}
