// ─────────────────────────────────────────────────────────────────
// PUSH COMMAND - Sync asset cards to Control Plane
// ─────────────────────────────────────────────────────────────────

import { Command } from "commander";
import chalk from "chalk";
import ora from "ora";
import path from "path";
import fs from "fs/promises";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { loadAssetCard, type AssetCard } from "@aigrc/core";
import { parse as parseYaml } from "yaml";
import {
  printHeader,
  printSubheader,
  printSuccess,
  printError,
  printWarning,
  printInfo,
} from "../utils/output.js";
import { exit, ExitCode } from "../utils/exit-codes.js";

// ─────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────

interface PushCommandOptions {
  all?: boolean;
  organization?: string;
  project?: string;
  supabaseUrl?: string;
  supabaseKey?: string;
  dryRun?: boolean;
  verbose?: boolean;
  output?: string;
  force?: boolean;
}

interface PushResult {
  assetId: string;
  assetName: string;
  status: "created" | "updated" | "unchanged" | "failed";
  error?: string;
}

interface PushSummary {
  timestamp: string;
  supabaseUrl: string;
  organizationId: string;
  projectId: string | null;
  totalCards: number;
  created: number;
  updated: number;
  unchanged: number;
  failed: number;
  results: PushResult[];
  durationMs: number;
}

// ─────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────

const DEFAULT_CARDS_DIR = ".aigrc/cards";
const DEFAULT_CONFIG_FILE = ".aigrc.yaml";
const DEFAULT_SUPABASE_URL = "https://wfsxgrxkdmpcaakntfjy.supabase.co";
const DEFAULT_ORG_ID = "11111111-1111-1111-1111-111111111111";

// ─────────────────────────────────────────────────────────────────
// COMMAND DEFINITION
// ─────────────────────────────────────────────────────────────────

export const pushCommand = new Command("push")
  .description("Push asset cards to Control Plane for synchronization")
  .argument("[path]", "Path to asset card YAML file or cards directory")
  .option("-a, --all", "Push all cards from .aigrc/cards directory")
  .option(
    "--organization <id>",
    "Organization ID (or set AIGRC_ORG_ID env var)"
  )
  .option(
    "-p, --project <name-or-id>",
    "Project name or ID to assign assets to (or set AIGRC_PROJECT_ID env var)"
  )
  .option(
    "--supabase-url <url>",
    "Supabase URL (or set SUPABASE_URL env var)"
  )
  .option(
    "--supabase-key <key>",
    "Supabase anon key (or set SUPABASE_ANON_KEY env var)"
  )
  .option("--dry-run", "Preview changes without pushing")
  .option("-v, --verbose", "Show detailed output")
  .option("-o, --output <path>", "Save sync results to JSON file")
  .option("-f, --force", "Force update even if unchanged")
  .action(async (cardPath: string | undefined, options: PushCommandOptions) => {
    await runPush(cardPath, options);
  });

// ─────────────────────────────────────────────────────────────────
// MAIN PUSH FUNCTION
// ─────────────────────────────────────────────────────────────────

async function runPush(
  cardPath: string | undefined,
  options: PushCommandOptions
): Promise<void> {
  const startTime = Date.now();

  printHeader();
  console.log(chalk.cyan("Push Asset Cards to Control Plane\n"));

  // ─────────────────────────────────────────────────────────────────
  // LOAD CONFIGURATION
  // ─────────────────────────────────────────────────────────────────

  const supabaseUrl =
    options.supabaseUrl ||
    process.env.SUPABASE_URL ||
    process.env.VITE_SUPABASE_URL ||
    DEFAULT_SUPABASE_URL;

  const supabaseKey =
    options.supabaseKey ||
    process.env.SUPABASE_ANON_KEY ||
    process.env.VITE_SUPABASE_ANON_KEY;

  const organizationId =
    options.organization ||
    process.env.AIGRC_ORG_ID ||
    process.env.AIGOS_ORG_ID ||
    DEFAULT_ORG_ID;

  if (!supabaseKey) {
    printError("Supabase anon key is required.");
    printInfo("Set SUPABASE_ANON_KEY environment variable or use --supabase-key option.");
    exit(ExitCode.INVALID_ARGS);
  }

  // Create Supabase client
  const supabase = createClient(supabaseUrl, supabaseKey);

  // ─────────────────────────────────────────────────────────────────
  // RESOLVE PROJECT
  // ─────────────────────────────────────────────────────────────────

  let projectId: string | null = null;
  const projectInput =
    options.project ||
    process.env.AIGRC_PROJECT_ID ||
    await getDefaultProjectFromConfig();

  if (projectInput) {
    projectId = await resolveProjectId(supabase, organizationId, projectInput);
    if (!projectId) {
      printWarning(`Project not found: ${projectInput}`);
      printInfo("Use 'aigrc projects list' to see available projects.");
    }
  }

  if (options.verbose) {
    console.log(chalk.dim("Configuration:"));
    console.log(chalk.dim(`  Supabase URL: ${supabaseUrl}`));
    console.log(chalk.dim(`  Organization: ${organizationId}`));
    console.log(chalk.dim(`  Project: ${projectId || "(none)"}`));
    console.log(chalk.dim(`  Supabase Key: ***${supabaseKey.slice(-4)}`));
    console.log();
  }

  // ─────────────────────────────────────────────────────────────────
  // RESOLVE CARDS TO PUSH
  // ─────────────────────────────────────────────────────────────────

  const cardsToPush: string[] = [];
  const cwd = process.cwd();

  if (options.all || !cardPath) {
    // Push all cards from default directory
    const cardsDir = path.join(cwd, DEFAULT_CARDS_DIR);

    try {
      await fs.access(cardsDir);
      const files = await fs.readdir(cardsDir);
      const yamlFiles = files.filter(
        (f) => f.endsWith(".yaml") || f.endsWith(".yml")
      );
      cardsToPush.push(...yamlFiles.map((f) => path.join(cardsDir, f)));
    } catch {
      printError(`Cards directory not found: ${cardsDir}`);
      printInfo(`Run 'aigrc init' to initialize AIGRC in this project.`);
      exit(ExitCode.FILE_NOT_FOUND);
    }
  } else {
    // Push specific card or directory
    const resolvedPath = path.resolve(cwd, cardPath);

    try {
      const stat = await fs.stat(resolvedPath);

      if (stat.isDirectory()) {
        const files = await fs.readdir(resolvedPath);
        const yamlFiles = files.filter(
          (f) => f.endsWith(".yaml") || f.endsWith(".yml")
        );
        cardsToPush.push(...yamlFiles.map((f) => path.join(resolvedPath, f)));
      } else {
        cardsToPush.push(resolvedPath);
      }
    } catch {
      printError(`Path not found: ${resolvedPath}`);
      exit(ExitCode.FILE_NOT_FOUND);
    }
  }

  if (cardsToPush.length === 0) {
    printWarning("No asset cards found to push.");
    printInfo(
      `Create asset cards with 'aigrc init' or 'aigrc register'.`
    );
    return;
  }

  console.log(`Found ${chalk.bold(cardsToPush.length)} asset card(s) to push.\n`);

  // ─────────────────────────────────────────────────────────────────
  // LOAD AND VALIDATE CARDS
  // ─────────────────────────────────────────────────────────────────

  const cards: Array<{ path: string; card: AssetCard }> = [];

  for (const cardFile of cardsToPush) {
    try {
      const card = loadAssetCard(cardFile);
      cards.push({ path: cardFile, card });

      if (options.verbose) {
        console.log(chalk.dim(`  Loaded: ${path.basename(cardFile)} (${card.id})`));
      }
    } catch (error) {
      printError(
        `Failed to load ${path.basename(cardFile)}: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  if (cards.length === 0) {
    printError("No valid asset cards could be loaded.");
    exit(ExitCode.VALIDATION_ERRORS);
  }

  // ─────────────────────────────────────────────────────────────────
  // DRY RUN MODE
  // ─────────────────────────────────────────────────────────────────

  if (options.dryRun) {
    printSubheader("Dry Run Preview");
    console.log(chalk.yellow("The following cards would be pushed:\n"));

    if (projectId) {
      console.log(`  ${chalk.dim("Target Project:")} ${projectInput}\n`);
    }

    for (const { card } of cards) {
      console.log(`  ${chalk.cyan("●")} ${chalk.bold(card.name)}`);
      console.log(`    ID: ${chalk.dim(card.id)}`);
      console.log(`    Version: ${chalk.dim(card.version)}`);
      console.log(
        `    Risk Level: ${formatRiskLevel(card.classification?.riskLevel || "unknown")}`
      );
      console.log();
    }

    console.log(chalk.yellow("No changes made (dry run mode)."));
    return;
  }

  // ─────────────────────────────────────────────────────────────────
  // PUSH CARDS TO CONTROL PLANE
  // ─────────────────────────────────────────────────────────────────

  printSubheader("Pushing to Control Plane");

  const spinner = ora({
    text: `Pushing ${cards.length} asset card(s)...`,
    spinner: "dots",
  }).start();

  const results: PushResult[] = [];
  let created = 0;
  let updated = 0;
  let unchanged = 0;
  let failed = 0;

  for (const { path: cardFilePath, card } of cards) {
    try {
      spinner.text = `Pushing: ${card.name}`;

      const result = await syncAssetCardToSupabase(
        supabase,
        organizationId,
        card,
        projectId,
        options.force
      );

      results.push({
        assetId: card.id,
        assetName: card.name,
        status: result.status,
      });

      switch (result.status) {
        case "created":
          created++;
          break;
        case "updated":
          updated++;
          break;
        case "unchanged":
          unchanged++;
          break;
      }
    } catch (error) {
      failed++;
      results.push({
        assetId: card.id,
        assetName: card.name,
        status: "failed",
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  const durationMs = Date.now() - startTime;

  if (failed === 0) {
    spinner.succeed("Push complete!");
  } else if (failed < cards.length) {
    spinner.warn("Push completed with some errors.");
  } else {
    spinner.fail("Push failed.");
  }

  // ─────────────────────────────────────────────────────────────────
  // PRINT SUMMARY
  // ─────────────────────────────────────────────────────────────────

  console.log();
  printSubheader("Push Summary");

  console.log(`  ${chalk.green("Created:")}   ${created}`);
  console.log(`  ${chalk.yellow("Updated:")}   ${updated}`);
  console.log(`  ${chalk.dim("Unchanged:")} ${unchanged}`);
  console.log(`  ${chalk.red("Failed:")}    ${failed}`);
  console.log();
  console.log(`  ${chalk.dim(`Duration: ${durationMs}ms`)}`);
  console.log(`  ${chalk.dim(`Supabase: ${supabaseUrl}`)}`);

  // Show errors in verbose mode
  if (failed > 0 && options.verbose) {
    console.log();
    console.log(chalk.red("Errors:"));
    for (const result of results) {
      if (result.status === "failed") {
        console.log(`  ${chalk.red("✗")} ${result.assetName}: ${result.error}`);
      }
    }
  }

  // ─────────────────────────────────────────────────────────────────
  // SAVE RESULTS TO FILE
  // ─────────────────────────────────────────────────────────────────

  if (options.output) {
    const summary: PushSummary = {
      timestamp: new Date().toISOString(),
      supabaseUrl,
      organizationId,
      projectId,
      totalCards: cards.length,
      created,
      updated,
      unchanged,
      failed,
      results,
      durationMs,
    };

    try {
      await fs.writeFile(options.output, JSON.stringify(summary, null, 2));
      console.log();
      printSuccess(`Results saved to: ${options.output}`);
    } catch (error) {
      printWarning(
        `Failed to save results: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  // Exit with error if any failed
  if (failed > 0) {
    exit(ExitCode.RUNTIME_ERROR);
  }
}

// ─────────────────────────────────────────────────────────────────
// SUPABASE SYNC FUNCTIONS
// ─────────────────────────────────────────────────────────────────

interface SyncResult {
  status: "created" | "updated" | "unchanged";
  id?: string;
  message?: string;
}

async function syncAssetCardToSupabase(
  supabase: SupabaseClient,
  organizationId: string,
  card: AssetCard,
  projectId: string | null,
  force?: boolean
): Promise<SyncResult> {
  const now = new Date().toISOString();

  // Check if asset already exists
  const { data: existing, error: fetchError } = await supabase
    .from("asset_cards")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("asset_id", card.id)
    .single();

  if (fetchError && fetchError.code !== "PGRST116") {
    // PGRST116 = not found, which is fine
    throw new Error(`Failed to check existing asset: ${fetchError.message}`);
  }

  // Prepare the asset card data
  const assetData: Record<string, unknown> = {
    organization_id: organizationId,
    asset_id: card.id,
    name: card.name,
    description: card.description || null,
    version: card.version,
    owner_name: card.ownership?.owner?.name || null,
    owner_email: card.ownership?.owner?.email || null,
    owner_team: card.ownership?.owner?.team || null,
    risk_level: card.classification?.riskLevel || "unknown",
    risk_factors: card.classification?.riskFactors || {},
    technical: card.technical || {},
    governance: card.governance || {},
    golden_thread: card.golden_thread || null,
    synced_from: "cli",
    last_synced_at: now,
  };

  // Add project_id if specified
  if (projectId) {
    assetData.project_id = projectId;
  }

  if (existing) {
    // Asset exists - check if we should update
    const hasChanges =
      force ||
      existing.version !== card.version ||
      existing.risk_level !== assetData.risk_level ||
      existing.name !== card.name ||
      JSON.stringify(existing.risk_factors) !== JSON.stringify(assetData.risk_factors);

    if (!hasChanges) {
      // No changes, just update last_synced_at
      await supabase
        .from("asset_cards")
        .update({ last_synced_at: now })
        .eq("id", existing.id);

      return {
        status: "unchanged",
        id: existing.id,
        message: "Asset card is up to date",
      };
    }

    // Update existing asset
    const { data: updated, error: updateError } = await supabase
      .from("asset_cards")
      .update({
        ...assetData,
        updated_at: now,
      })
      .eq("id", existing.id)
      .select()
      .single();

    if (updateError) {
      throw new Error(`Failed to update asset: ${updateError.message}`);
    }

    return {
      status: "updated",
      id: updated.id,
      message: "Asset card updated successfully",
    };
  }

  // Create new asset
  const { data: created, error: createError } = await supabase
    .from("asset_cards")
    .insert(assetData)
    .select()
    .single();

  if (createError) {
    throw new Error(`Failed to create asset: ${createError.message}`);
  }

  return {
    status: "created",
    id: created.id,
    message: "Asset card created successfully",
  };
}

// ─────────────────────────────────────────────────────────────────
// UTILITY FUNCTIONS
// ─────────────────────────────────────────────────────────────────

function formatRiskLevel(level: string): string {
  switch (level) {
    case "minimal":
      return chalk.green("MINIMAL");
    case "limited":
      return chalk.yellow("LIMITED");
    case "high":
      return chalk.red("HIGH");
    case "unacceptable":
      return chalk.bgRed.white(" UNACCEPTABLE ");
    default:
      return chalk.gray(level.toUpperCase());
  }
}

// ─────────────────────────────────────────────────────────────────
// PROJECT HELPER FUNCTIONS
// ─────────────────────────────────────────────────────────────────

/**
 * Get default project from .aigrc.yaml config
 */
async function getDefaultProjectFromConfig(): Promise<string | undefined> {
  const cwd = process.cwd();
  const configPath = path.join(cwd, DEFAULT_CONFIG_FILE);

  try {
    const configContent = await fs.readFile(configPath, "utf-8");
    const config = parseYaml(configContent) as Record<string, unknown>;
    return config.defaultProject as string | undefined;
  } catch {
    return undefined;
  }
}

/**
 * Resolve a project name or ID to a UUID
 */
async function resolveProjectId(
  supabase: SupabaseClient,
  organizationId: string,
  projectInput: string
): Promise<string | null> {
  // Check if it's already a UUID
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (uuidRegex.test(projectInput)) {
    // Verify the UUID exists
    const { data, error } = await supabase
      .from("projects")
      .select("id")
      .eq("id", projectInput)
      .eq("organization_id", organizationId)
      .single();

    if (error || !data) {
      return null;
    }
    return data.id;
  }

  // Search by name (case-insensitive)
  const { data, error } = await supabase
    .from("projects")
    .select("id, name")
    .eq("organization_id", organizationId)
    .ilike("name", projectInput)
    .limit(1);

  if (error || !data || data.length === 0) {
    return null;
  }

  return data[0].id;
}
