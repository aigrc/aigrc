// ─────────────────────────────────────────────────────────────────
// PULL COMMAND — Bidirectional sync: pull asset data from AIGOS
// AIG-215 — CLI Pull Command
// ─────────────────────────────────────────────────────────────────

import { Command } from "commander";
import chalk from "chalk";
import ora from "ora";
import path from "path";
import fs from "fs/promises";
import {
  AigosClient,
  type ClientConfig,
  type EventListFilters,
  type AssetSummary,
  type GovernanceEvent,
} from "@aigrc/events";
import { stringify as stringifyYaml } from "yaml";
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

interface PullOptions {
  apiUrl?: string;
  apiKey?: string;
  status?: boolean;
  policies?: boolean;
  localWins?: boolean;
  verbose?: boolean;
  org?: string;
}

interface AssetDiff {
  assetId: string;
  status: "new" | "modified" | "unchanged" | "local-only";
  remoteEventCount?: number;
  remoteLastEvent?: string;
  localExists: boolean;
}

// ─────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────

const DEFAULT_CARDS_DIR = ".aigrc/cards";
const DEFAULT_API_URL = "https://api.aigos.dev";

// ─────────────────────────────────────────────────────────────────
// COMMAND DEFINITION
// ─────────────────────────────────────────────────────────────────

export const pullCommand = new Command("pull")
  .description("Pull asset cards and compliance status from AIGOS")
  .argument("[assetId]", "Specific asset ID to pull")
  .option("--api-url <url>", "AIGOS API URL", DEFAULT_API_URL)
  .option("--api-key <key>", "AIGOS API key (or set AIGRC_API_KEY env)")
  .option("--org <id>", "Organization ID (or set AIGRC_ORG_ID env)")
  .option("--status", "Show compliance status only (don't modify files)")
  .option("--policies", "Download active policy bundle")
  .option("--local-wins", "Keep local version on conflict")
  .option("-v, --verbose", "Show detailed output")
  .action(async (assetId: string | undefined, options: PullOptions) => {
    await runPull(assetId, options);
  });

// ─────────────────────────────────────────────────────────────────
// MAIN PULL FUNCTION
// ─────────────────────────────────────────────────────────────────

async function runPull(
  assetId: string | undefined,
  options: PullOptions,
): Promise<void> {
  const startTime = Date.now();

  printHeader();
  console.log(chalk.cyan("Pull Assets from AIGOS\n"));

  // ─── Resolve configuration ──────────────────────────────────

  const apiUrl = options.apiUrl || process.env.AIGRC_API_URL || DEFAULT_API_URL;
  const apiKey = options.apiKey || process.env.AIGRC_API_KEY;
  const orgId = options.org || process.env.AIGRC_ORG_ID || process.env.AIGOS_ORG_ID;

  if (!apiKey) {
    printError("API key is required for pulling from AIGOS.");
    printInfo(
      "Set AIGRC_API_KEY environment variable or use --api-key option.",
    );
    exit(ExitCode.INVALID_ARGUMENTS);
  }

  if (!orgId) {
    printError("Organization ID is required.");
    printInfo("Set AIGRC_ORG_ID environment variable or use --org option.");
    exit(ExitCode.INVALID_ARGUMENTS);
  }

  if (options.verbose) {
    console.log(chalk.dim("Configuration:"));
    console.log(chalk.dim(`  API URL: ${apiUrl}`));
    console.log(chalk.dim(`  Org ID:  ${orgId}`));
    console.log(chalk.dim(`  API Key: ***${apiKey.slice(-4)}`));
    console.log();
  }

  // ─── Create client ────────────────────────────────────────────

  const clientConfig: ClientConfig = {
    apiUrl,
    apiKey,
    timeout: 30_000,
    maxRetries: 3,
  };

  const client = new AigosClient(clientConfig);

  // ─── Policies mode ────────────────────────────────────────────

  if (options.policies) {
    printInfo("Policy bundle download is not yet supported.");
    printInfo("Policy bundles will be available in a future release.");
    return;
  }

  // ─── Fetch remote assets ──────────────────────────────────────

  const spinner = ora("Fetching assets from AIGOS...").start();

  try {
    let remoteAssets: AssetSummary[];

    if (assetId) {
      // Fetch events for specific asset to check it exists
      const result = await client.listEvents({ assetId, limit: 1 });
      if (result.events.length === 0) {
        spinner.fail(`Asset '${assetId}' not found on AIGOS platform`);
        exit(ExitCode.FILE_NOT_FOUND);
      }
      remoteAssets = [{
        assetId,
        lastEventAt: result.events[0].producedAt,
        eventCount: result.total,
        latestType: result.events[0].type,
      }];
    } else {
      const result = await client.listAssets({ limit: 100 });
      remoteAssets = result.assets;
    }

    spinner.succeed(`Found ${remoteAssets.length} asset(s) on AIGOS`);

    // ─── Compare with local files ─────────────────────────────

    const cwd = process.cwd();
    const cardsDir = path.resolve(cwd, DEFAULT_CARDS_DIR);

    // Ensure cards directory exists
    await fs.mkdir(cardsDir, { recursive: true });

    const diffs = await compareAssets(remoteAssets, cardsDir);

    // ─── Status-only mode ─────────────────────────────────────

    if (options.status) {
      displayStatus(diffs, options);
      return;
    }

    // ─── Apply changes ────────────────────────────────────────

    const applied = await applyDiffs(
      diffs,
      client,
      cardsDir,
      options,
    );

    // ─── Summary ──────────────────────────────────────────────

    const durationMs = Date.now() - startTime;
    console.log();

    const newCount = applied.filter((d) => d.status === "new").length;
    const modifiedCount = applied.filter((d) => d.status === "modified").length;
    const skippedCount = applied.filter((d) => d.status === "unchanged" || d.status === "local-only").length;

    if (newCount > 0) printSuccess(`${newCount} new asset(s) pulled`);
    if (modifiedCount > 0) printSuccess(`${modifiedCount} asset(s) updated`);
    if (skippedCount > 0) printInfo(`${skippedCount} asset(s) unchanged/local-only`);

    printSuccess(`Pull completed in ${durationMs}ms`);
  } catch (error) {
    spinner.fail("Failed to pull from AIGOS");
    printError(error instanceof Error ? error.message : String(error));
    exit(ExitCode.RUNTIME_ERROR);
  }
}

// ─────────────────────────────────────────────────────────────────
// COMPARISON LOGIC
// ─────────────────────────────────────────────────────────────────

/**
 * Compare remote assets against local YAML files
 */
async function compareAssets(
  remoteAssets: AssetSummary[],
  cardsDir: string,
): Promise<AssetDiff[]> {
  const diffs: AssetDiff[] = [];

  // Get local YAML files
  const localFiles = new Set<string>();
  try {
    const entries = await fs.readdir(cardsDir, { withFileTypes: true });
    for (const entry of entries) {
      if (
        entry.isFile() &&
        (entry.name.endsWith(".yaml") || entry.name.endsWith(".yml"))
      ) {
        const assetName = path.basename(
          entry.name,
          path.extname(entry.name),
        );
        localFiles.add(assetName);
      }
    }
  } catch {
    // Directory doesn't exist yet
  }

  // Check remote assets
  for (const asset of remoteAssets) {
    const localName = sanitizeFilename(asset.assetId);
    const localPath = path.join(cardsDir, `${localName}.yaml`);

    let localExists = false;
    try {
      await fs.access(localPath);
      localExists = true;
    } catch {
      // File doesn't exist
    }

    if (!localExists) {
      diffs.push({
        assetId: asset.assetId,
        status: "new",
        remoteEventCount: asset.eventCount,
        remoteLastEvent: asset.latestType,
        localExists: false,
      });
    } else {
      // For now, treat remote assets with matching local files as "modified"
      // In a full implementation, we'd compare content hashes
      diffs.push({
        assetId: asset.assetId,
        status: "modified",
        remoteEventCount: asset.eventCount,
        remoteLastEvent: asset.latestType,
        localExists: true,
      });
    }

    localFiles.delete(localName);
  }

  // Local-only files (not on platform)
  for (const localName of localFiles) {
    diffs.push({
      assetId: localName,
      status: "local-only",
      localExists: true,
    });
  }

  return diffs;
}

// ─────────────────────────────────────────────────────────────────
// STATUS DISPLAY
// ─────────────────────────────────────────────────────────────────

/**
 * Display compliance status table
 */
function displayStatus(
  diffs: AssetDiff[],
  options: PullOptions,
): void {
  printSubheader("Compliance Status");

  if (diffs.length === 0) {
    printInfo("No assets found.");
    return;
  }

  // Table header
  console.log(
    chalk.bold(
      `  ${"Asset ID".padEnd(30)} ${"Status".padEnd(12)} ${"Events".padEnd(8)} ${"Latest Type".padEnd(25)}`,
    ),
  );
  console.log(chalk.dim("  " + "─".repeat(75)));

  for (const diff of diffs) {
    const statusColor =
      diff.status === "new"
        ? chalk.green
        : diff.status === "modified"
          ? chalk.yellow
          : diff.status === "local-only"
            ? chalk.cyan
            : chalk.gray;

    const statusIcon =
      diff.status === "new"
        ? "+"
        : diff.status === "modified"
          ? "~"
          : diff.status === "local-only"
            ? "L"
            : "=";

    console.log(
      `  ${diff.assetId.padEnd(30)} ${statusColor(`${statusIcon} ${diff.status}`.padEnd(12))} ${String(diff.remoteEventCount ?? "-").padEnd(8)} ${(diff.remoteLastEvent ?? "-").padEnd(25)}`,
    );
  }

  console.log();
  const newCount = diffs.filter((d) => d.status === "new").length;
  const modifiedCount = diffs.filter((d) => d.status === "modified").length;
  const localOnlyCount = diffs.filter((d) => d.status === "local-only").length;

  if (newCount > 0) printInfo(`${newCount} new asset(s) on platform`);
  if (modifiedCount > 0) printInfo(`${modifiedCount} asset(s) with remote updates`);
  if (localOnlyCount > 0) printWarning(`${localOnlyCount} local-only asset(s) not on platform`);
}

// ─────────────────────────────────────────────────────────────────
// APPLY CHANGES
// ─────────────────────────────────────────────────────────────────

/**
 * Apply diffs: write/update YAML files
 */
async function applyDiffs(
  diffs: AssetDiff[],
  client: AigosClient,
  cardsDir: string,
  options: PullOptions,
): Promise<AssetDiff[]> {
  const applied: AssetDiff[] = [];

  for (const diff of diffs) {
    if (diff.status === "local-only" || diff.status === "unchanged") {
      applied.push(diff);
      continue;
    }

    if (diff.status === "modified" && options.localWins) {
      if (options.verbose) {
        printInfo(`Skipping ${diff.assetId} (--local-wins)`);
      }
      applied.push({ ...diff, status: "unchanged" });
      continue;
    }

    // Fetch latest events for this asset
    try {
      const eventsResult = await client.listEvents({
        assetId: diff.assetId,
        limit: 5,
      });

      const latestEvent = eventsResult.events[0];
      if (!latestEvent) {
        applied.push(diff);
        continue;
      }

      // Build YAML card from event data
      const cardData = buildCardFromEvent(latestEvent, diff);

      const localName = sanitizeFilename(diff.assetId);
      const localPath = path.join(cardsDir, `${localName}.yaml`);

      await fs.writeFile(localPath, stringifyYaml(cardData), "utf-8");

      const icon = diff.status === "new" ? chalk.green("+") : chalk.yellow("~");
      console.log(`  ${icon} ${diff.assetId} → ${localName}.yaml`);

      if (options.verbose && eventsResult.events.length > 0) {
        console.log(chalk.dim(`    Latest: ${latestEvent.type} at ${latestEvent.producedAt}`));
        console.log(chalk.dim(`    Events: ${eventsResult.total} total`));
      }

      applied.push(diff);
    } catch (error) {
      printWarning(
        `Failed to pull ${diff.assetId}: ${error instanceof Error ? error.message : String(error)}`,
      );
      applied.push({ ...diff, status: "unchanged" });
    }
  }

  return applied;
}

// ─────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────

/**
 * Build a YAML card structure from an event
 */
function buildCardFromEvent(
  event: GovernanceEvent,
  diff: AssetDiff,
): Record<string, unknown> {
  const card: Record<string, unknown> = {
    assetId: event.assetId,
    version: (event.data as any)?.cardVersion ?? "1.0.0",
    lastEventAt: event.producedAt,
    lastEventType: event.type,
    eventCount: diff.remoteEventCount,
  };

  // Add golden thread info
  if (event.goldenThread) {
    card.goldenThread = event.goldenThread;
  }

  // Add data fields
  if (event.data) {
    const { cardId, cardVersion, ...restData } = event.data as Record<string, unknown>;
    if (Object.keys(restData).length > 0) {
      card.data = restData;
    }
  }

  // Add source info
  if (event.source) {
    card.source = {
      tool: event.source.tool,
      environment: event.source.environment,
    };
  }

  return card;
}

/**
 * Sanitize an asset ID for use as a filename
 */
function sanitizeFilename(assetId: string): string {
  return assetId.replace(/[^a-zA-Z0-9._-]/g, "-");
}
