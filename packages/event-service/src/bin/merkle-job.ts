#!/usr/bin/env node
/**
 * Merkle Root Checkpoint Job
 *
 * Scheduled daily at UTC midnight to compute Merkle root checkpoints
 * for all organizations that had events on the previous day.
 *
 * Usage:
 *   node dist/bin/merkle-job.js               # Process yesterday
 *   node dist/bin/merkle-job.js 2026-02-23     # Process specific date
 *
 * Environment:
 *   SUPABASE_URL  — Supabase project URL
 *   SUPABASE_KEY  — Supabase service role key
 */

import { createClient } from "@supabase/supabase-js";
import { EventStore } from "../services/event-store.js";
import {
  IntegrityCheckpointService,
  createPlatformBuilder,
} from "../services/integrity-checkpoint.js";

// ─────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error("Error: SUPABASE_URL and SUPABASE_KEY must be set");
    process.exit(1);
  }

  // Determine target date (default: yesterday UTC)
  const dateArg = process.argv[2];
  const targetDate = dateArg ?? getYesterdayUTC();

  console.log(`[merkle-job] Computing checkpoints for date: ${targetDate}`);

  // Initialize services
  const supabase = createClient(supabaseUrl, supabaseKey);
  const eventStore = new EventStore({ supabase });

  // Get all orgs that had events on this date
  const orgIds = await eventStore.getOrgsWithEventsOnDate(targetDate);

  if (orgIds.length === 0) {
    console.log("[merkle-job] No organizations had events on this date.");
    return;
  }

  console.log(`[merkle-job] Found ${orgIds.length} organization(s) to process`);

  // Process each org
  let successCount = 0;
  let errorCount = 0;

  for (const orgId of orgIds) {
    try {
      const builder = createPlatformBuilder(orgId);
      const service = new IntegrityCheckpointService({
        eventStore,
        supabase,
        builder,
      });

      const result = await service.computeDailyCheckpoint(orgId, targetDate);

      console.log(
        `[merkle-job] ✓ ${orgId}: ${result.eventCount} events → ${result.merkleRoot.slice(0, 20)}...`,
      );

      // Optionally store the verification event
      if (result.verificationEvent) {
        await eventStore.store(result.verificationEvent, orgId);
      }

      successCount++;
    } catch (error) {
      console.error(
        `[merkle-job] ✗ ${orgId}: ${error instanceof Error ? error.message : String(error)}`,
      );
      errorCount++;
    }
  }

  console.log(
    `[merkle-job] Complete: ${successCount} succeeded, ${errorCount} failed`,
  );

  if (errorCount > 0) {
    process.exit(1);
  }
}

function getYesterdayUTC(): string {
  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setUTCDate(yesterday.getUTCDate() - 1);
  return yesterday.toISOString().split("T")[0];
}

main().catch((err) => {
  console.error("[merkle-job] Fatal error:", err);
  process.exit(1);
});
