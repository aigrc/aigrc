import { Command } from "commander";
import chalk from "chalk";
import ora from "ora";
import path from "path";
import {
  loadAssetCard,
  extractGoldenThreadComponents,
  computeGoldenThreadHashSync,
  verifyGoldenThreadHashSync,
  computeCanonicalString,
  type GoldenThreadComponents,
} from "@aigrc/core";
import { printHeader } from "../utils/output.js";

// ─────────────────────────────────────────────────────────────────
// HASH COMMAND (AIG-102)
// Compute and verify Golden Thread hashes with simplified output
// ─────────────────────────────────────────────────────────────────

interface HashCommandOptions {
  verify?: boolean;
  output?: "text" | "json";
  ticketId?: string;
  approvedBy?: string;
  approvedAt?: string;
}

interface HashResult {
  success: boolean;
  canonical_string?: string;
  hash?: string;
  verified?: boolean;
  expected_hash?: string;
  error?: string;
}

export const hashCommand = new Command("hash")
  .description("Compute or verify Golden Thread hashes")
  .argument("[path]", "Path to asset card file")
  .option("-v, --verify", "Verify the hash in the asset card")
  .option("-o, --output <format>", "Output format (text, json)", "text")
  .option("--ticket-id <id>", "Ticket ID for manual hash computation")
  .option("--approved-by <email>", "Approver email for manual hash computation")
  .option("--approved-at <datetime>", "Approval timestamp (ISO 8601) for manual hash computation")
  .action(async (cardPath: string | undefined, options: HashCommandOptions) => {
    await runHash(cardPath, options);
  });

async function runHash(
  cardPath: string | undefined,
  options: HashCommandOptions
): Promise<void> {
  if (options.output === "text") {
    printHeader();
  }

  // Check if manual components provided
  if (options.ticketId && options.approvedBy && options.approvedAt) {
    await runManualHash(options);
    return;
  }

  if (!cardPath) {
    if (options.output === "json") {
      console.log(JSON.stringify({
        success: false,
        error: "No asset card path provided. Use --ticket-id, --approved-by, --approved-at for manual computation.",
      }));
    } else {
      console.log(chalk.red("Error: No asset card path provided."));
      console.log(chalk.gray("Usage: aigrc hash <path-to-card>"));
      console.log(chalk.gray("   or: aigrc hash --ticket-id <id> --approved-by <email> --approved-at <datetime>"));
    }
    process.exit(1);
  }

  const spinner = options.output === "text" ? ora("Loading asset card...").start() : null;

  try {
    const resolvedPath = path.resolve(process.cwd(), cardPath);
    const asset = loadAssetCard(resolvedPath);
    spinner?.succeed("Asset card loaded");

    // Extract Golden Thread components
    const components = extractGoldenThreadComponents(asset);
    if (!components) {
      const result: HashResult = {
        success: false,
        error: "Asset card does not have Golden Thread components (missing ticket_id, approved_by, or approved_at)",
      };
      outputResult(result, options.output);
      process.exit(1);
    }

    if (options.verify) {
      await runVerify(components, asset.golden_thread?.hash, options);
    } else {
      await runCompute(components, options);
    }
  } catch (error) {
    spinner?.fail("Failed to load asset card");
    const result: HashResult = {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
    outputResult(result, options.output);
    process.exit(1);
  }
}

async function runManualHash(options: HashCommandOptions): Promise<void> {
  const components: GoldenThreadComponents = {
    ticket_id: options.ticketId!,
    approved_by: options.approvedBy!,
    approved_at: options.approvedAt!,
  };

  const spinner = options.output === "text" ? ora("Computing hash...").start() : null;

  try {
    const { canonical_string, hash } = computeGoldenThreadHashSync(components);
    spinner?.succeed("Hash computed");

    const result: HashResult = {
      success: true,
      canonical_string,
      hash,
    };
    outputResult(result, options.output);
  } catch (error) {
    spinner?.fail("Failed to compute hash");
    const result: HashResult = {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
    outputResult(result, options.output);
    process.exit(1);
  }
}

async function runCompute(
  components: GoldenThreadComponents,
  options: HashCommandOptions
): Promise<void> {
  const spinner = options.output === "text" ? ora("Computing hash...").start() : null;

  try {
    const { canonical_string, hash } = computeGoldenThreadHashSync(components);
    spinner?.succeed("Hash computed");

    const result: HashResult = {
      success: true,
      canonical_string,
      hash,
    };
    outputResult(result, options.output);
  } catch (error) {
    spinner?.fail("Failed to compute hash");
    const result: HashResult = {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
    outputResult(result, options.output);
    process.exit(1);
  }
}

async function runVerify(
  components: GoldenThreadComponents,
  expectedHash: string | undefined,
  options: HashCommandOptions
): Promise<void> {
  const spinner = options.output === "text" ? ora("Verifying hash...").start() : null;

  if (!expectedHash) {
    spinner?.fail("No hash to verify");
    const result: HashResult = {
      success: false,
      error: "Asset card does not have a hash in golden_thread.hash",
    };
    outputResult(result, options.output);
    process.exit(1);
  }

  try {
    const verification = verifyGoldenThreadHashSync(components, expectedHash);

    if (verification.verified) {
      spinner?.succeed("Hash verified successfully");
    } else {
      spinner?.fail("Hash verification failed");
    }

    const result: HashResult = {
      success: verification.verified,
      canonical_string: computeCanonicalString(components),
      hash: verification.computed,
      verified: verification.verified,
      expected_hash: verification.expected,
      error: verification.mismatch_reason,
    };
    outputResult(result, options.output);

    if (!verification.verified) {
      process.exit(1);
    }
  } catch (error) {
    spinner?.fail("Failed to verify hash");
    const result: HashResult = {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
    outputResult(result, options.output);
    process.exit(1);
  }
}

function outputResult(result: HashResult, format?: "text" | "json"): void {
  if (format === "json") {
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  // Simplified text output for AIG-102
  if (result.success) {
    if (result.verified !== undefined) {
      // For --verify mode
      if (result.verified) {
        console.log(chalk.green("✓ Golden Thread hash verified"));
      } else {
        console.log(chalk.red("✗ Golden Thread hash verification failed"));
        if (result.expected_hash) {
          console.log(chalk.dim(`Expected: ${result.expected_hash}`));
        }
        if (result.hash) {
          console.log(chalk.dim(`Computed: ${result.hash}`));
        }
      }
    } else {
      // For compute mode - just print the hash
      if (result.hash) {
        console.log(result.hash);
      }
    }
  } else {
    console.log(chalk.red("Error: ") + result.error);
  }
}
