/**
 * Integrity Checkpoint Service — Daily Merkle root computation
 *
 * Per EVT-001 §13.3: at UTC midnight, for each organization:
 * 1. Select all events for the completed day
 * 2. Sort by received_at
 * 3. Compute leaf hashes from each event's hash field
 * 4. Build binary Merkle tree
 * 5. Store root in integrity_checkpoints table
 * 6. Emit aigrc.audit.chain.verified event
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { GovernanceEvent } from "@aigrc/events";
import { GovernanceEventBuilder, type BuilderConfig } from "@aigrc/events";
import { EventStore } from "./event-store.js";
import { buildMerkleTree, EMPTY_MERKLE_ROOT } from "./merkle-tree.js";

// ─────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────

export interface CheckpointResult {
  /** Organization ID */
  orgId: string;
  /** Date of the checkpoint (YYYY-MM-DD) */
  date: string;
  /** Merkle root hash */
  merkleRoot: string;
  /** Number of events included in the tree */
  eventCount: number;
  /** ISO 8601 timestamp when checkpoint was computed */
  computedAt: string;
  /** The audit.chain.verified event emitted (if builder provided) */
  verificationEvent?: GovernanceEvent;
}

export interface IntegrityCheckpointConfig {
  /** Event store for querying events */
  eventStore: EventStore;
  /** Supabase client for writing checkpoints (optional, skipped in tests) */
  supabase?: SupabaseClient;
  /** Builder for emitting verification events (optional) */
  builder?: GovernanceEventBuilder;
}

// ─────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────

const CHECKPOINTS_TABLE = "integrity_checkpoints";
const SYSTEM_ASSET_ID = "system-integrity";

// ─────────────────────────────────────────────────────────────────
// INTEGRITY CHECKPOINT SERVICE
// ─────────────────────────────────────────────────────────────────

export class IntegrityCheckpointService {
  private readonly eventStore: EventStore;
  private readonly supabase?: SupabaseClient;
  private readonly builder?: GovernanceEventBuilder;

  constructor(config: IntegrityCheckpointConfig) {
    this.eventStore = config.eventStore;
    this.supabase = config.supabase;
    this.builder = config.builder;
  }

  /**
   * Compute the daily Merkle root checkpoint for an organization.
   *
   * @param orgId — Organization ID
   * @param date — Target date in YYYY-MM-DD format (completed day)
   * @returns CheckpointResult with merkle root and metadata
   */
  async computeDailyCheckpoint(
    orgId: string,
    date: string,
  ): Promise<CheckpointResult> {
    const computedAt = new Date().toISOString();

    // 1. Query all events for the date, sorted by received_at ASC
    const events = await this.eventStore.listEventsForDate(orgId, date);

    // 2. Extract leaf hashes
    const leafHashes = events.map((e) => e.hash);

    // 3. Build Merkle tree
    const merkleRoot = buildMerkleTree(leafHashes);

    // 4. Store checkpoint in database (if Supabase client provided)
    if (this.supabase) {
      await this.storeCheckpoint(orgId, date, merkleRoot, events.length, computedAt);
    }

    // 5. Emit audit.chain.verified event (if builder provided)
    let verificationEvent: GovernanceEvent | undefined;
    if (this.builder) {
      verificationEvent = this.builder.auditChainVerified({
        assetId: SYSTEM_ASSET_ID,
        goldenThread: {
          type: "orphan" as const,
          reason: "discovery" as const,
          declaredBy: "platform-integrity-service",
          declaredAt: computedAt,
          remediationDeadline: new Date(
            Date.now() + 365 * 24 * 60 * 60 * 1000,
          ).toISOString(),
          remediationNote:
            "System-generated integrity checkpoint. No business authorization required for automated platform operations.",
        },
        data: {
          auditId: `checkpoint_${orgId}_${date}`,
          auditType: "chain-verification" as const,
          merkleRoot,
          eventCount: events.length,
          verified: true,
        },
      });
    }

    return {
      orgId,
      date,
      merkleRoot,
      eventCount: events.length,
      computedAt,
      verificationEvent,
    };
  }

  /**
   * Store a checkpoint in the integrity_checkpoints table.
   */
  private async storeCheckpoint(
    orgId: string,
    date: string,
    merkleRoot: string,
    eventCount: number,
    computedAt: string,
  ): Promise<void> {
    const { error } = await this.supabase!
      .from(CHECKPOINTS_TABLE)
      .upsert(
        {
          org_id: orgId,
          date,
          merkle_root: merkleRoot,
          event_count: eventCount,
          computed_at: computedAt,
        },
        { onConflict: "org_id,date" },
      );

    if (error) {
      throw new Error(`Failed to store checkpoint: ${error.message}`);
    }
  }
}

/**
 * Create a GovernanceEventBuilder configured for platform integrity operations.
 */
export function createPlatformBuilder(orgId: string): GovernanceEventBuilder {
  const config: BuilderConfig = {
    source: {
      tool: "platform",
      version: "0.2.0",
      orgId,
      instanceId: "integrity-checkpoint-service",
      identity: {
        type: "service-token",
        subject: "integrity-service@aigos.dev",
      },
      environment: "production",
    },
  };
  return new GovernanceEventBuilder(config);
}
