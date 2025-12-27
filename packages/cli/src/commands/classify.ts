import { Command } from "commander";
import chalk from "chalk";
import ora from "ora";
import { existsSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";
import YAML from "yaml";
import { loadAssetCard, saveAssetCard, type AssetCard } from "@aigrc/core";
import { printHeader, printSubheader, printSuccess, printError, printInfo } from "../utils/output.js";

// ─────────────────────────────────────────────────────────────────
// CLASSIFY COMMAND
// ─────────────────────────────────────────────────────────────────

interface ClassifyOptions {
  profiles?: string[];
  all?: boolean;
  output?: "text" | "json" | "yaml";
  update?: boolean;
}

// Risk level mapping per profile
const RISK_MAPPINGS: Record<string, Record<string, string>> = {
  "eu-ai-act": {
    minimal: "minimal",
    limited: "limited",
    high: "high",
    unacceptable: "unacceptable",
  },
  "us-omb-m24": {
    minimal: "neither",
    limited: "neither",
    high: "rights-impacting",
    unacceptable: "safety-impacting",
  },
  "nist-ai-rmf": {
    minimal: "minimal",
    limited: "low",
    high: "high",
    unacceptable: "critical",
  },
  "iso-42001": {
    minimal: "low",
    limited: "medium",
    high: "high",
    unacceptable: "critical",
  },
};

const PROFILE_NAMES: Record<string, string> = {
  "eu-ai-act": "EU AI Act",
  "us-omb-m24": "US OMB M-24",
  "nist-ai-rmf": "NIST AI RMF",
  "iso-42001": "ISO/IEC 42001",
};

export const classifyCommand = new Command("classify")
  .description("Classify an asset against compliance profiles")
  .argument("<assetPath>", "Path to asset card YAML file")
  .option("-p, --profiles <profiles...>", "Profile IDs to classify against")
  .option("-a, --all", "Classify against all available profiles")
  .option("-o, --output <format>", "Output format (text, json, yaml)", "text")
  .option("-u, --update", "Update asset card with classification results")
  .action(async (assetPath: string, options: ClassifyOptions) => {
    await runClassify(assetPath, options);
  });

async function runClassify(assetPath: string, options: ClassifyOptions): Promise<void> {
  if (options.output === "text") {
    printHeader();
  }

  // Load asset card
  if (!existsSync(assetPath)) {
    printError(`Asset card not found: ${assetPath}`);
    process.exit(1);
  }

  const spinner = ora("Loading asset card...").start();

  let card: AssetCard;
  try {
    card = loadAssetCard(assetPath);
    spinner.succeed(`Loaded: ${card.name}`);
  } catch (error) {
    spinner.fail("Failed to load asset card");
    printError(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }

  // Determine profiles to classify against
  let profileIds: string[];
  if (options.all) {
    profileIds = Object.keys(RISK_MAPPINGS);
  } else if (options.profiles && options.profiles.length > 0) {
    profileIds = options.profiles;
  } else {
    profileIds = loadActiveProfiles();
  }

  // Validate profiles
  const invalidProfiles = profileIds.filter((p) => !RISK_MAPPINGS[p]);
  if (invalidProfiles.length > 0) {
    printError(`Unknown profile(s): ${invalidProfiles.join(", ")}`);
    process.exit(1);
  }

  // Classify against each profile
  const classifications: {
    profileId: string;
    profileName: string;
    aigrcLevel: string;
    mappedLevel: string;
  }[] = [];

  const aigrcLevel = card.classification.riskLevel;

  for (const profileId of profileIds) {
    const mapping = RISK_MAPPINGS[profileId];
    const mappedLevel = mapping[aigrcLevel] || aigrcLevel;

    classifications.push({
      profileId,
      profileName: PROFILE_NAMES[profileId] || profileId,
      aigrcLevel,
      mappedLevel,
    });
  }

  // Output results
  if (options.output === "json") {
    console.log(
      JSON.stringify(
        {
          asset: card.name,
          aigrcRiskLevel: aigrcLevel,
          classifications,
        },
        null,
        2
      )
    );
    return;
  }

  if (options.output === "yaml") {
    console.log(
      YAML.stringify({
        asset: card.name,
        aigrcRiskLevel: aigrcLevel,
        classifications,
      })
    );
    return;
  }

  // Text output
  console.log();
  printSubheader(`Classification: ${card.name}`);
  console.log();
  console.log(`  ${chalk.dim("AIGRC Risk Level:")} ${formatRiskLevel(aigrcLevel)}`);
  console.log();

  console.log(
    chalk.dim("  Profile".padEnd(24)) +
      chalk.dim("Mapped Risk Level")
  );
  console.log(chalk.dim("  " + "─".repeat(50)));

  for (const c of classifications) {
    console.log(
      `  ${c.profileName.padEnd(22)} ` +
        `${formatRiskLevel(c.mappedLevel)}`
    );
  }

  // Determine strictest level
  const riskOrder = ["minimal", "neither", "low", "limited", "medium", "moderate", "high", "rights-impacting", "critical", "safety-impacting", "unacceptable"];
  let strictestLevel = classifications[0]?.mappedLevel || aigrcLevel;
  let strictestIndex = riskOrder.indexOf(strictestLevel);

  for (const c of classifications) {
    const idx = riskOrder.indexOf(c.mappedLevel);
    if (idx > strictestIndex) {
      strictestIndex = idx;
      strictestLevel = c.mappedLevel;
    }
  }

  console.log();
  console.log(`  ${chalk.dim("Strictest:")} ${formatRiskLevel(strictestLevel)}`);

  // Update asset card if requested
  if (options.update) {
    const updateSpinner = ora("Updating asset card...").start();

    try {
      // Add jurisdiction classifications
      const jurisdictions = classifications.map((c) => ({
        jurisdictionId: c.profileId,
        riskLevel: c.mappedLevel,
        lastChecked: new Date().toISOString(),
      }));

      card.classification.jurisdictions = jurisdictions;
      saveAssetCard(card, assetPath);

      updateSpinner.succeed("Asset card updated with classifications");
    } catch (error) {
      updateSpinner.fail("Failed to update asset card");
      printError(error instanceof Error ? error.message : String(error));
    }
  }
}

function formatRiskLevel(level: string): string {
  const colors: Record<string, (text: string) => string> = {
    minimal: chalk.green,
    neither: chalk.green,
    low: chalk.green,
    limited: chalk.yellow,
    medium: chalk.yellow,
    moderate: chalk.yellow,
    high: chalk.red,
    "rights-impacting": chalk.red,
    critical: chalk.magenta,
    "safety-impacting": chalk.magenta,
    unacceptable: chalk.magenta.bold,
  };

  const colorFn = colors[level] || chalk.white;
  return colorFn(level.toUpperCase());
}

function loadActiveProfiles(): string[] {
  const configPath = join(process.cwd(), ".aigrc.yaml");

  if (!existsSync(configPath)) {
    return ["eu-ai-act"];
  }

  try {
    const content = readFileSync(configPath, "utf-8");
    const config = YAML.parse(content);
    return config?.profiles || ["eu-ai-act"];
  } catch {
    return ["eu-ai-act"];
  }
}
