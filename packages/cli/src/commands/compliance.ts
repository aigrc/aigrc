import { Command } from "commander";
import chalk from "chalk";
import ora from "ora";
import { existsSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";
import YAML from "yaml";
import { printHeader, printSubheader, printSuccess, printError, printInfo } from "../utils/output.js";

// ─────────────────────────────────────────────────────────────────
// COMPLIANCE COMMAND
// ─────────────────────────────────────────────────────────────────

interface ListOptions {
  active?: boolean;
  output?: "text" | "json" | "yaml";
}

interface ShowOptions {
  output?: "text" | "json" | "yaml";
}

interface SetOptions {
  stack?: boolean;
}

// Inline profile data since we can't easily import MCP services in CLI
const BUILTIN_PROFILES = [
  {
    id: "eu-ai-act",
    name: "EU AI Act",
    version: "2024.1",
    jurisdiction: "EU",
    description: "European Union Artificial Intelligence Act",
  },
  {
    id: "us-omb-m24",
    name: "US OMB M-24-10/M-24-18",
    version: "2024.1",
    jurisdiction: "US",
    description: "US Federal AI governance memoranda",
  },
  {
    id: "nist-ai-rmf",
    name: "NIST AI RMF",
    version: "1.0",
    jurisdiction: "US",
    description: "NIST AI Risk Management Framework",
  },
  {
    id: "iso-42001",
    name: "ISO/IEC 42001",
    version: "2023",
    jurisdiction: "International",
    description: "AI Management System Standard",
  },
];

export const complianceCommand = new Command("compliance")
  .description("Manage compliance profiles")
  .addCommand(
    new Command("list")
      .description("List available compliance profiles")
      .option("-a, --active", "Show only active profiles")
      .option("-o, --output <format>", "Output format (text, json, yaml)", "text")
      .action(async (options: ListOptions) => {
        await listProfiles(options);
      })
  )
  .addCommand(
    new Command("show")
      .description("Show details of a profile")
      .argument("<profileId>", "Profile ID (e.g., eu-ai-act, us-omb-m24)")
      .option("-o, --output <format>", "Output format (text, json, yaml)", "text")
      .action(async (profileId: string, options: ShowOptions) => {
        await showProfile(profileId, options);
      })
  )
  .addCommand(
    new Command("set")
      .description("Set active profiles in .aigrc.yaml")
      .argument("<profiles...>", "Profile IDs to activate")
      .option("--stack", "Enable profile stacking (strictest wins)")
      .action(async (profiles: string[], options: SetOptions) => {
        await setProfiles(profiles, options);
      })
  );

async function listProfiles(options: ListOptions): Promise<void> {
  if (options.output === "text") {
    printHeader();
    printSubheader("Available Compliance Profiles");
  }

  // Load active profiles from config
  const activeProfiles = loadActiveProfiles();

  const profiles = options.active
    ? BUILTIN_PROFILES.filter((p) => activeProfiles.includes(p.id))
    : BUILTIN_PROFILES;

  if (options.output === "json") {
    console.log(JSON.stringify(profiles, null, 2));
    return;
  }

  if (options.output === "yaml") {
    console.log(YAML.stringify(profiles));
    return;
  }

  // Text output
  console.log();
  console.log(
    chalk.dim("  ID".padEnd(16)) +
      chalk.dim("Name".padEnd(28)) +
      chalk.dim("Jurisdiction".padEnd(16)) +
      chalk.dim("Active")
  );
  console.log(chalk.dim("  " + "─".repeat(70)));

  for (const profile of profiles) {
    const isActive = activeProfiles.includes(profile.id);
    const activeIndicator = isActive ? chalk.green("✓") : chalk.gray("·");
    console.log(
      `  ${chalk.cyan(profile.id.padEnd(14))} ` +
        `${profile.name.padEnd(26)} ` +
        `${chalk.dim(profile.jurisdiction.padEnd(14))} ` +
        `${activeIndicator}`
    );
  }

  console.log();
  printInfo(`${profiles.length} profile(s) available, ${activeProfiles.length} active`);
}

async function showProfile(profileId: string, options: ShowOptions): Promise<void> {
  const profile = BUILTIN_PROFILES.find((p) => p.id === profileId);

  if (!profile) {
    printError(`Profile not found: ${profileId}`);
    console.log();
    printInfo(`Available profiles: ${BUILTIN_PROFILES.map((p) => p.id).join(", ")}`);
    process.exit(1);
  }

  if (options.output === "json") {
    console.log(JSON.stringify(profile, null, 2));
    return;
  }

  if (options.output === "yaml") {
    console.log(YAML.stringify(profile));
    return;
  }

  // Text output
  printHeader();
  console.log(chalk.bold.cyan(`Profile: ${profile.name}`));
  console.log();
  console.log(`  ${chalk.dim("ID:")}           ${profile.id}`);
  console.log(`  ${chalk.dim("Version:")}      ${profile.version}`);
  console.log(`  ${chalk.dim("Jurisdiction:")} ${profile.jurisdiction}`);
  console.log(`  ${chalk.dim("Description:")}  ${profile.description}`);

  // Load active status
  const activeProfiles = loadActiveProfiles();
  const isActive = activeProfiles.includes(profile.id);
  console.log();
  console.log(
    `  ${chalk.dim("Status:")}       ${isActive ? chalk.green("Active") : chalk.gray("Inactive")}`
  );
}

async function setProfiles(profiles: string[], options: SetOptions): Promise<void> {
  printHeader();

  // Validate profiles
  const invalidProfiles = profiles.filter(
    (p) => !BUILTIN_PROFILES.find((bp) => bp.id === p)
  );

  if (invalidProfiles.length > 0) {
    printError(`Unknown profile(s): ${invalidProfiles.join(", ")}`);
    console.log();
    printInfo(`Available profiles: ${BUILTIN_PROFILES.map((p) => p.id).join(", ")}`);
    process.exit(1);
  }

  const spinner = ora("Updating configuration...").start();

  try {
    const configPath = join(process.cwd(), ".aigrc.yaml");
    let config: Record<string, unknown> = {};

    if (existsSync(configPath)) {
      const content = readFileSync(configPath, "utf-8");
      config = YAML.parse(content) || {};
    }

    config.profiles = profiles;
    if (options.stack) {
      config.stackProfiles = true;
    }

    writeFileSync(configPath, YAML.stringify(config, { indent: 2 }), "utf-8");

    spinner.succeed("Configuration updated");
    console.log();
    printSuccess(`Active profiles: ${profiles.join(", ")}`);

    if (options.stack) {
      printInfo("Profile stacking enabled (strictest requirements apply)");
    }
  } catch (error) {
    spinner.fail("Failed to update configuration");
    printError(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

function loadActiveProfiles(): string[] {
  const configPath = join(process.cwd(), ".aigrc.yaml");

  if (!existsSync(configPath)) {
    return ["eu-ai-act"]; // Default
  }

  try {
    const content = readFileSync(configPath, "utf-8");
    const config = YAML.parse(content);
    return config?.profiles || ["eu-ai-act"];
  } catch {
    return ["eu-ai-act"];
  }
}
