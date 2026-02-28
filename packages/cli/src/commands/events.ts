// ─────────────────────────────────────────────────────────────────
// EVENTS COMMAND - Governance event management
// ─────────────────────────────────────────────────────────────────

import { Command } from "commander";
import chalk from "chalk";
import ora from "ora";
import path from "path";
import fs from "fs/promises";
import crypto from "crypto";
import {
  GovernanceEventBuilder,
  AigosClient,
  EventBuffer,
  type BuilderConfig,
  type ClientConfig,
  type GovernanceEvent,
  type PushResponse,
  type BatchResponse,
  type EventListFilters,
} from "@aigrc/events";
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

interface EventsPushOptions {
  apiUrl?: string;
  apiKey?: string;
  dryRun?: boolean;
  watch?: boolean;
  batch?: boolean;
  verbose?: boolean;
  org?: string;
}

interface EventsListOptions {
  apiUrl?: string;
  apiKey?: string;
  asset?: string;
  type?: string;
  criticality?: string;
  since?: string;
  limit?: string;
  offset?: string;
  json?: boolean;
  live?: boolean;
  verbose?: boolean;
  org?: string;
}

interface PushState {
  lastPush: string;
  files: Record<string, string>; // filename → sha256 hash
}

interface FileChange {
  file: string;
  type: "created" | "updated";
  hash: string;
}

// ─────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────

const DEFAULT_CARDS_DIR = ".aigrc/cards";
const PUSH_STATE_FILE = ".aigrc/.push-state.json";
const DEFAULT_API_URL = "https://api.aigos.dev";
const WATCH_DEBOUNCE_MS = 2000;

// ─────────────────────────────────────────────────────────────────
// COMMAND DEFINITION
// ─────────────────────────────────────────────────────────────────

export const eventsCommand = new Command("events")
  .description("Governance event management");

// ─── events push ──────────────────────────────────────────────

eventsCommand
  .command("push [files...]")
  .description("Push governance events to AIGOS control plane")
  .option("--api-url <url>", "AIGOS API URL", DEFAULT_API_URL)
  .option("--api-key <key>", "AIGOS API key (or set AIGRC_API_KEY env)")
  .option("--org <id>", "Organization ID (or set AIGRC_ORG_ID env)")
  .option("--dry-run", "Preview events without pushing")
  .option("--watch", "Watch .aigrc/ directory for changes")
  .option("--batch", "Force batch mode for all events")
  .option("-v, --verbose", "Show detailed output")
  .action(async (files: string[], options: EventsPushOptions) => {
    await runEventsPush(files, options);
  });

// ─── events list ─────────────────────────────────────────────

eventsCommand
  .command("list")
  .description("List governance events from AIGOS")
  .option("--api-url <url>", "AIGOS API URL", DEFAULT_API_URL)
  .option("--api-key <key>", "AIGOS API key (or set AIGRC_API_KEY env)")
  .option("--org <id>", "Organization ID (or set AIGRC_ORG_ID env)")
  .option("--asset <id>", "Filter by asset ID")
  .option("--type <type>", "Filter by event type")
  .option("--criticality <level>", "Filter by criticality")
  .option("--since <date>", "Events since ISO 8601 date")
  .option("--limit <n>", "Maximum results (default: 20)")
  .option("--offset <n>", "Pagination offset")
  .option("--json", "Output raw JSON")
  .option("--live", "Poll for new events (colored output)")
  .option("-v, --verbose", "Show detailed output")
  .action(async (options: EventsListOptions) => {
    await runEventsList(options);
  });

// ─────────────────────────────────────────────────────────────────
// MAIN PUSH FUNCTION
// ─────────────────────────────────────────────────────────────────

async function runEventsPush(
  files: string[],
  options: EventsPushOptions,
): Promise<void> {
  const startTime = Date.now();

  printHeader();
  console.log(chalk.cyan("Push Governance Events to AIGOS\n"));

  // ─── Resolve configuration ──────────────────────────────────

  const apiUrl = options.apiUrl || process.env.AIGRC_API_URL || DEFAULT_API_URL;
  const apiKey = options.apiKey || process.env.AIGRC_API_KEY;
  const orgId = options.org || process.env.AIGRC_ORG_ID || process.env.AIGOS_ORG_ID;

  if (!apiKey && !options.dryRun) {
    printError("API key is required for pushing events.");
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
    if (apiKey) {
      console.log(chalk.dim(`  API Key: ***${apiKey.slice(-4)}`));
    }
    console.log();
  }

  // ─── Watch mode ─────────────────────────────────────────────

  if (options.watch) {
    await runWatchMode(apiUrl, apiKey!, orgId, options);
    return;
  }

  // ─── Discover changed files ─────────────────────────────────

  const cwd = process.cwd();
  const cardsDir = path.resolve(cwd, DEFAULT_CARDS_DIR);

  // Check if cards directory exists
  try {
    await fs.access(cardsDir);
  } catch {
    printError(`Cards directory not found: ${cardsDir}`);
    printInfo("Run 'aigrc init' to create the project structure.");
    exit(ExitCode.FILE_NOT_FOUND);
  }

  const pushState = await loadPushState(cwd);
  const changes = await discoverChanges(
    cardsDir,
    pushState,
    files.length > 0 ? files : undefined,
  );

  if (changes.length === 0) {
    printInfo("No changes detected. All files are up to date.");
    return;
  }

  console.log(
    chalk.cyan(`Found ${changes.length} change(s):\n`),
  );

  for (const change of changes) {
    const icon = change.type === "created" ? "+" : "~";
    const color = change.type === "created" ? chalk.green : chalk.yellow;
    console.log(color(`  ${icon} ${change.file}`));
  }
  console.log();

  // ─── Build governance events ────────────────────────────────

  const spinner = ora("Building governance events...").start();

  const builderConfig: BuilderConfig = {
    source: {
      tool: "cli",
      version: "0.2.0",
      orgId,
      instanceId: `cli-${process.pid}`,
      identity: { type: "api-key", subject: apiKey ?? "dry-run" },
      environment: process.env.NODE_ENV === "production" ? "production" : "development",
    },
  };

  let events: GovernanceEvent[];
  try {
    events = await buildEvents(builderConfig, changes, cardsDir, orgId);
    spinner.succeed(`Built ${events.length} governance event(s)`);
  } catch (error) {
    spinner.fail("Failed to build governance events");
    printError(error instanceof Error ? error.message : String(error));
    exit(ExitCode.RUNTIME_ERROR);
  }

  // ─── Dry run: preview only ──────────────────────────────────

  if (options.dryRun) {
    printSubheader("Dry Run — Events Preview");
    for (const event of events) {
      console.log(chalk.dim("───"));
      console.log(chalk.cyan(`Type: `) + event.type);
      console.log(chalk.cyan(`ID:   `) + event.id);
      console.log(chalk.cyan(`Asset:`) + ` ${event.assetId}`);
      console.log(
        chalk.cyan(`Hash: `) + chalk.dim(event.hash.slice(0, 20) + "..."),
      );
      if (options.verbose) {
        console.log(chalk.dim(JSON.stringify(event, null, 2)));
      }
    }
    console.log();
    printInfo(
      `${events.length} event(s) would be pushed. Use without --dry-run to push.`,
    );
    return;
  }

  // ─── Push events ────────────────────────────────────────────

  const pushSpinner = ora("Pushing events to AIGOS...").start();

  const clientConfig: ClientConfig = {
    apiUrl,
    apiKey: apiKey!,
    timeout: 30_000,
    maxRetries: 3,
  };

  try {
    const client = new AigosClient(clientConfig);
    let result: PushResponse | BatchResponse;

    if (events.length === 1 && !options.batch) {
      result = await client.push(events[0]);
    } else {
      result = await client.pushBatch(events);
    }

    pushSpinner.succeed("Events pushed successfully");

    // Display result
    displayPushResult(result, options);

    // Update push state
    await savePushState(cwd, pushState, changes);

    const durationMs = Date.now() - startTime;
    console.log();
    printSuccess(
      `Push completed in ${durationMs}ms`,
    );
  } catch (error) {
    pushSpinner.fail("Failed to push events");
    printError(error instanceof Error ? error.message : String(error));
    exit(ExitCode.RUNTIME_ERROR);
  }
}

// ─────────────────────────────────────────────────────────────────
// FILE DISCOVERY & DIFFING
// ─────────────────────────────────────────────────────────────────

/**
 * Load push state from .aigrc/.push-state.json
 */
async function loadPushState(cwd: string): Promise<PushState> {
  const stateFile = path.resolve(cwd, PUSH_STATE_FILE);

  try {
    const content = await fs.readFile(stateFile, "utf-8");
    return JSON.parse(content) as PushState;
  } catch {
    return { lastPush: "", files: {} };
  }
}

/**
 * Save push state after successful push
 */
async function savePushState(
  cwd: string,
  state: PushState,
  changes: FileChange[],
): Promise<void> {
  const stateFile = path.resolve(cwd, PUSH_STATE_FILE);
  const stateDir = path.dirname(stateFile);

  // Ensure directory exists
  await fs.mkdir(stateDir, { recursive: true });

  // Update state with new hashes
  const newState: PushState = {
    lastPush: new Date().toISOString(),
    files: { ...state.files },
  };

  for (const change of changes) {
    newState.files[change.file] = change.hash;
  }

  await fs.writeFile(stateFile, JSON.stringify(newState, null, 2), "utf-8");
}

/**
 * Compute SHA-256 hash of file contents
 */
async function hashFile(filePath: string): Promise<string> {
  const content = await fs.readFile(filePath);
  const hash = crypto.createHash("sha256").update(content).digest("hex");
  return `sha256:${hash}`;
}

/**
 * Discover changed files by comparing against push state
 */
async function discoverChanges(
  cardsDir: string,
  pushState: PushState,
  specificFiles?: string[],
): Promise<FileChange[]> {
  const changes: FileChange[] = [];

  // If specific files are provided, only check those
  let filesToCheck: string[];

  if (specificFiles && specificFiles.length > 0) {
    filesToCheck = specificFiles.map((f) =>
      path.isAbsolute(f) ? f : path.resolve(cardsDir, f),
    );
  } else {
    // Discover all YAML files in cards directory
    try {
      const entries = await fs.readdir(cardsDir, { withFileTypes: true });
      filesToCheck = entries
        .filter(
          (entry) =>
            entry.isFile() &&
            (entry.name.endsWith(".yaml") || entry.name.endsWith(".yml")),
        )
        .map((entry) => path.resolve(cardsDir, entry.name));
    } catch {
      return [];
    }
  }

  for (const filePath of filesToCheck) {
    try {
      const hash = await hashFile(filePath);
      const relativePath = path.relative(
        path.dirname(cardsDir),
        filePath,
      );

      const previousHash = pushState.files[relativePath];

      if (!previousHash) {
        changes.push({ file: relativePath, type: "created", hash });
      } else if (previousHash !== hash) {
        changes.push({ file: relativePath, type: "updated", hash });
      }
      // Unchanged files are skipped
    } catch {
      // File not found or unreadable — skip
    }
  }

  return changes;
}

// ─────────────────────────────────────────────────────────────────
// EVENT BUILDING
// ─────────────────────────────────────────────────────────────────

/**
 * Build governance events from file changes
 */
async function buildEvents(
  builderConfig: BuilderConfig,
  changes: FileChange[],
  cardsDir: string,
  orgId: string,
): Promise<GovernanceEvent[]> {
  const builder = new GovernanceEventBuilder(builderConfig);
  const events: GovernanceEvent[] = [];

  for (const change of changes) {
    const filePath = path.resolve(path.dirname(cardsDir), change.file);

    // Read and parse the YAML file to extract asset card data
    const content = await fs.readFile(filePath, "utf-8");
    let cardData: Record<string, unknown>;
    try {
      cardData = parseYaml(content) as Record<string, unknown>;
    } catch {
      throw new Error(`Failed to parse YAML: ${change.file}`);
    }

    const assetId =
      (cardData.assetId as string) ??
      (cardData.asset_id as string) ??
      path.basename(change.file, path.extname(change.file));

    const goldenThread = (cardData.goldenThread as any) ??
      (cardData.golden_thread as any) ?? {
        type: "orphan" as const,
        reason: "discovery",
        declaredBy: apiKey ?? "cli-user",
        declaredAt: new Date().toISOString(),
        remediationDeadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        remediationNote: "Event pushed via CLI without linked authorization. Assign a golden thread reference.",
      };

    const eventData: Record<string, unknown> = {
      cardId: assetId,
      cardVersion: (cardData.version as string) ?? "1.0.0",
    };

    // Add optional fields from card
    if (cardData.assetType || cardData.asset_type) {
      eventData.assetType = cardData.assetType ?? cardData.asset_type;
    }
    if (cardData.riskLevel || cardData.risk_level) {
      eventData.riskLevel = cardData.riskLevel ?? cardData.risk_level;
    }

    if (change.type === "created") {
      const event = builder.assetCreated({
        assetId,
        goldenThread,
        data: eventData as any,
      });
      events.push(event);
    } else {
      const event = builder.assetUpdated({
        assetId,
        goldenThread,
        data: eventData as any,
      });
      events.push(event);
    }
  }

  return events;
}

// ─────────────────────────────────────────────────────────────────
// RESULT DISPLAY
// ─────────────────────────────────────────────────────────────────

/**
 * Display push result to console
 */
function displayPushResult(
  result: PushResponse | BatchResponse,
  options: EventsPushOptions,
): void {
  console.log();

  if ("eventId" in result) {
    // Single event PushResponse
    const pr = result as PushResponse;
    printSuccess(`Event ${pr.eventId} ${pr.status}`);

    if (pr.warnings && pr.warnings.length > 0) {
      printSubheader("Warnings");
      for (const warning of pr.warnings) {
        printWarning(`[${warning.severity}] ${warning.message}`);
      }
    }

    if (pr.complianceGaps && pr.complianceGaps.length > 0) {
      printSubheader("Compliance Gaps");
      for (const gap of pr.complianceGaps) {
        printWarning(
          `${gap.severity === "blocking" ? "🚫" : "⚠"} ${gap.ruleName}: ${gap.description}`,
        );
      }
    }

    if (pr.suggestions && pr.suggestions.length > 0) {
      printSubheader("Suggestions");
      for (const suggestion of pr.suggestions) {
        printInfo(`💡 ${suggestion.message}`);
      }
    }
  } else {
    // BatchResponse
    const br = result as BatchResponse;
    console.log(chalk.cyan("  Batch Results:"));
    console.log(chalk.green(`    Accepted:  ${br.accepted}`));
    if (br.duplicate > 0) {
      console.log(chalk.yellow(`    Duplicate: ${br.duplicate}`));
    }
    if (br.rejected > 0) {
      console.log(chalk.red(`    Rejected:  ${br.rejected}`));
    }

    if (options.verbose && br.results) {
      console.log();
      for (const r of br.results) {
        const icon =
          r.status === "created"
            ? chalk.green("✓")
            : r.status === "duplicate"
              ? chalk.yellow("~")
              : chalk.red("✗");
        console.log(`  ${icon} ${r.id} — ${r.status}`);
      }
    }
  }
}

// ─────────────────────────────────────────────────────────────────
// WATCH MODE
// ─────────────────────────────────────────────────────────────────

/**
 * Watch .aigrc/ directory for changes and push events automatically
 */
async function runWatchMode(
  apiUrl: string,
  apiKey: string,
  orgId: string,
  options: EventsPushOptions,
): Promise<void> {
  const cwd = process.cwd();
  const cardsDir = path.resolve(cwd, DEFAULT_CARDS_DIR);

  console.log(
    chalk.cyan(`Watching ${DEFAULT_CARDS_DIR} for changes...\n`),
  );
  printInfo("Press Ctrl+C to stop watching.");
  console.log();

  const clientConfig: ClientConfig = {
    apiUrl,
    apiKey,
    timeout: 30_000,
    maxRetries: 3,
  };

  const buffer = new EventBuffer({
    client: clientConfig,
    maxSize: 50,
    flushIntervalMs: 10_000,
    flushOnCritical: true,
    onFlushError: (error) => {
      printError(`Flush failed: ${error.message}`);
    },
  });

  const builderConfig: BuilderConfig = {
    source: {
      tool: "cli",
      version: "0.2.0",
      orgId,
      instanceId: `cli-watch-${process.pid}`,
      identity: { type: "api-key", subject: apiKey },
      environment: process.env.NODE_ENV === "production" ? "production" : "development",
    },
  };

  let debounceTimer: ReturnType<typeof setTimeout> | null = null;

  const watcher = fs.watch(cardsDir, { recursive: true });

  try {
    for await (const event of watcher) {
      if (!event.filename) continue;
      if (
        !event.filename.endsWith(".yaml") &&
        !event.filename.endsWith(".yml")
      ) {
        continue;
      }

      // Debounce: wait for changes to settle
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(async () => {
        try {
          const pushState = await loadPushState(cwd);
          const changes = await discoverChanges(cardsDir, pushState);

          if (changes.length === 0) return;

          const spinner = ora(
            `Detected ${changes.length} change(s), building events...`,
          ).start();

          const events = await buildEvents(
            builderConfig,
            changes,
            cardsDir,
            orgId,
          );

          buffer.addMany(events);
          spinner.succeed(
            `Buffered ${events.length} event(s) (buffer size: ${buffer.size})`,
          );

          // Update push state
          await savePushState(cwd, pushState, changes);
        } catch (error) {
          printError(
            error instanceof Error ? error.message : String(error),
          );
        }
      }, WATCH_DEBOUNCE_MS);
    }
  } finally {
    await buffer.dispose();
  }
}

// ─────────────────────────────────────────────────────────────────
// LIST EVENTS FUNCTION (AIG-216)
// ─────────────────────────────────────────────────────────────────

async function runEventsList(options: EventsListOptions): Promise<void> {
  printHeader();
  console.log(chalk.cyan("List Governance Events\n"));

  // ─── Resolve configuration ──────────────────────────────────

  const apiUrl = options.apiUrl || process.env.AIGRC_API_URL || DEFAULT_API_URL;
  const apiKey = options.apiKey || process.env.AIGRC_API_KEY;
  const orgId = options.org || process.env.AIGRC_ORG_ID || process.env.AIGOS_ORG_ID;

  if (!apiKey) {
    printError("API key is required for listing events.");
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

  // ─── Build filters ────────────────────────────────────────────

  const filters: EventListFilters = {};
  if (options.asset) filters.assetId = options.asset;
  if (options.type) filters.type = options.type;
  if (options.criticality) filters.criticality = options.criticality;
  if (options.since) filters.since = options.since;
  if (options.limit) filters.limit = parseInt(options.limit, 10);
  if (options.offset) filters.offset = parseInt(options.offset, 10);

  // Default limit
  if (!filters.limit) filters.limit = 20;

  // ─── Create client ────────────────────────────────────────────

  const clientConfig: ClientConfig = {
    apiUrl,
    apiKey,
    timeout: 30_000,
    maxRetries: 3,
  };

  const client = new AigosClient(clientConfig);

  // ─── Live mode ────────────────────────────────────────────────

  if (options.live) {
    await runLiveMode(client, filters, options);
    return;
  }

  // ─── Fetch events ─────────────────────────────────────────────

  const spinner = ora("Fetching events...").start();

  try {
    const result = await client.listEvents(filters);
    spinner.succeed(`Fetched ${result.events.length} event(s) (${result.total} total)`);

    if (result.events.length === 0) {
      printInfo("No events found matching the specified filters.");
      return;
    }

    // ─── Output ───────────────────────────────────────────────

    if (options.json) {
      console.log(JSON.stringify(result, null, 2));
      return;
    }

    displayEventsTable(result.events, options);

    // Pagination info
    const page = Math.floor((filters.offset ?? 0) / filters.limit) + 1;
    const totalPages = Math.ceil(result.total / filters.limit);
    console.log();
    printInfo(
      `Page ${page} of ${totalPages} (${result.total} total events)`,
    );

    if (page < totalPages) {
      const nextOffset = (filters.offset ?? 0) + filters.limit;
      printInfo(
        `Use --offset ${nextOffset} to see the next page`,
      );
    }
  } catch (error) {
    spinner.fail("Failed to fetch events");
    printError(error instanceof Error ? error.message : String(error));
    exit(ExitCode.RUNTIME_ERROR);
  }
}

// ─────────────────────────────────────────────────────────────────
// EVENT TABLE DISPLAY
// ─────────────────────────────────────────────────────────────────

function displayEventsTable(
  events: GovernanceEvent[],
  options: EventsListOptions,
): void {
  console.log();

  // Table header
  console.log(
    chalk.bold(
      `  ${"Time".padEnd(22)} ${"Type".padEnd(28)} ${"Asset".padEnd(20)} ${"Crit".padEnd(8)} ${"ID".padEnd(36)}`,
    ),
  );
  console.log(chalk.dim("  " + "─".repeat(114)));

  for (const event of events) {
    const time = formatTime(event.producedAt);
    const type = formatEventType(event.type);
    const asset = event.assetId.length > 18
      ? event.assetId.slice(0, 17) + "…"
      : event.assetId;
    const crit = formatCriticality(event.criticality);
    const id = event.id;

    console.log(
      `  ${chalk.dim(time.padEnd(22))} ${type.padEnd(28)} ${asset.padEnd(20)} ${crit.padEnd(8)} ${chalk.dim(id)}`,
    );

    if (options.verbose) {
      console.log(chalk.dim(`    Thread: ${event.goldenThread.type} | Hash: ${event.hash.slice(0, 20)}...`));
    }
  }
}

function formatTime(isoString: string): string {
  try {
    const date = new Date(isoString);
    return date.toISOString().replace("T", " ").slice(0, 19);
  } catch {
    return isoString.slice(0, 19);
  }
}

function formatEventType(type: string): string {
  // Strip "aigrc." prefix for display
  const short = type.replace(/^aigrc\./, "");
  return short;
}

function formatCriticality(criticality: string): string {
  switch (criticality) {
    case "critical":
      return chalk.red("CRIT");
    case "high":
      return chalk.yellow("HIGH");
    case "normal":
      return chalk.green("NORM");
    case "low":
      return chalk.gray("LOW");
    default:
      return criticality;
  }
}

// ─────────────────────────────────────────────────────────────────
// LIVE MODE
// ─────────────────────────────────────────────────────────────────

async function runLiveMode(
  client: AigosClient,
  filters: EventListFilters,
  options: EventsListOptions,
): Promise<void> {
  console.log(chalk.cyan("Live event stream (Ctrl+C to stop)\n"));

  // Table header
  console.log(
    chalk.bold(
      `  ${"Time".padEnd(22)} ${"Type".padEnd(28)} ${"Asset".padEnd(20)} ${"Crit".padEnd(8)}`,
    ),
  );
  console.log(chalk.dim("  " + "─".repeat(78)));

  let lastSeen = filters.since ?? new Date().toISOString();
  const pollInterval = 5000; // 5 seconds

  const poll = async () => {
    try {
      const result = await client.listEvents({
        ...filters,
        since: lastSeen,
        limit: 50,
      });

      for (const event of result.events) {
        const time = formatTime(event.producedAt);
        const type = formatEventType(event.type);
        const asset = event.assetId.length > 18
          ? event.assetId.slice(0, 17) + "…"
          : event.assetId;
        const crit = formatCriticality(event.criticality);

        console.log(
          `  ${chalk.dim(time.padEnd(22))} ${type.padEnd(28)} ${asset.padEnd(20)} ${crit}`,
        );

        // Update lastSeen to the latest event timestamp
        if (event.producedAt > lastSeen) {
          lastSeen = event.producedAt;
        }
      }
    } catch (error) {
      printWarning(`Poll failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  // Initial poll
  await poll();

  // Continuous polling
  const intervalId = setInterval(poll, pollInterval);

  // Wait for Ctrl+C
  await new Promise<void>((resolve) => {
    process.on("SIGINT", () => {
      clearInterval(intervalId);
      console.log();
      printInfo("Live stream stopped.");
      resolve();
    });
  });
}
