/**
 * Event Store — Supabase storage layer for governance events
 *
 * Handles:
 * - Single event storage (Sync channel)
 * - Batch event storage (Batch channel)
 * - Deduplication via PK + in-memory LRU cache
 * - Server-side receivedAt assignment
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { GovernanceEvent } from "@aigrc/events";
import { verifyEventHash } from "@aigrc/events";

// ─────────────────────────────────────────────────────────────────
// RESPONSE TYPES (server-side, broader than SDK types)
// ─────────────────────────────────────────────────────────────────

/**
 * Server-side push response.
 * Broader than the SDK's PushResponse — allows additional error codes.
 */
export interface StorePushResponse {
  status: "accepted" | "rejected";
  eventId: string;
  receivedAt: string;
  error?: { code: string; message: string; detail?: string };
}

/**
 * Server-side batch event result.
 */
export interface StoreBatchEventResult {
  id: string;
  status: "created" | "duplicate" | "rejected";
  receivedAt?: string;
  error?: { code: string; message: string; detail?: string };
}

/**
 * Server-side batch response.
 */
export interface StoreBatchResponse {
  accepted: number;
  rejected: number;
  duplicate: number;
  results: StoreBatchEventResult[];
}

// ─────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────

const TABLE_NAME = "governance_events";
const DEDUP_CACHE_MAX = 10_000;

// ─────────────────────────────────────────────────────────────────
// LRU DEDUP CACHE
// ─────────────────────────────────────────────────────────────────

/**
 * Simple LRU cache for recent event IDs.
 * Avoids hitting the database for every dedup check.
 */
class LRUSet {
  private readonly cache: Set<string>;
  private readonly maxSize: number;

  constructor(maxSize: number) {
    this.cache = new Set();
    this.maxSize = maxSize;
  }

  has(key: string): boolean {
    return this.cache.has(key);
  }

  add(key: string): void {
    if (this.cache.size >= this.maxSize) {
      // Remove the oldest entry (first inserted)
      const first = this.cache.values().next().value;
      if (first !== undefined) {
        this.cache.delete(first);
      }
    }
    this.cache.add(key);
  }

  clear(): void {
    this.cache.clear();
  }
}

// ─────────────────────────────────────────────────────────────────
// EVENT STORE
// ─────────────────────────────────────────────────────────────────

export interface EventStoreConfig {
  /** Supabase client instance */
  supabase: SupabaseClient;
  /** Maximum dedup cache size (default: 10000) */
  dedupCacheSize?: number;
}

export class EventStore {
  private readonly supabase: SupabaseClient;
  private readonly dedupCache: LRUSet;

  constructor(config: EventStoreConfig) {
    this.supabase = config.supabase;
    this.dedupCache = new LRUSet(config.dedupCacheSize ?? DEDUP_CACHE_MAX);
  }

  /**
   * Store a single governance event (Sync channel).
   *
   * Flow:
   * 1. Check dedup cache → if hit, return 200 OK (duplicate)
   * 2. Verify hash integrity
   * 3. Insert into database
   * 4. If PK conflict (duplicate) → return 200 OK
   * 5. Otherwise → return 201 Created
   */
  async store(event: GovernanceEvent, orgId: string): Promise<{ response: StorePushResponse; isNew: boolean }> {
    const receivedAt = new Date().toISOString();

    // Fast dedup check via in-memory cache
    if (this.dedupCache.has(event.id)) {
      return {
        response: {
          status: "accepted",
          eventId: event.id,
          receivedAt,
        },
        isNew: false,
      };
    }

    // Verify hash integrity
    const hashResult = verifyEventHash(event);
    if (!hashResult.verified) {
      return {
        response: {
          status: "rejected",
          eventId: event.id,
          receivedAt,
          error: {
            code: "EVT_HASH_INVALID",
            message: `Hash verification failed: declared=${event.hash}, computed=${hashResult.computed}`,
          },
        },
        isNew: false,
      };
    }

    // Map event to database row
    const row = this.eventToRow(event, orgId, receivedAt);

    // Insert into Supabase
    const { error } = await this.supabase
      .from(TABLE_NAME)
      .insert(row);

    if (error) {
      // Check for duplicate key violation (23505 = unique_violation in Postgres)
      if (error.code === "23505") {
        this.dedupCache.add(event.id);
        return {
          response: {
            status: "accepted",
            eventId: event.id,
            receivedAt,
          },
          isNew: false,
        };
      }

      // Other database errors
      throw new Error(`Failed to store event: ${error.message}`);
    }

    // Success: add to dedup cache
    this.dedupCache.add(event.id);

    return {
      response: {
        status: "accepted",
        eventId: event.id,
        receivedAt,
      },
      isNew: true,
    };
  }

  /**
   * Store multiple governance events (Batch channel).
   *
   * Each event is processed independently — invalid events don't block valid ones.
   */
  async storeMany(
    events: GovernanceEvent[],
    orgId: string,
  ): Promise<StoreBatchResponse> {
    const results: StoreBatchEventResult[] = [];
    let accepted = 0;
    let rejected = 0;
    let duplicate = 0;

    for (const event of events) {
      try {
        const { response, isNew } = await this.store(event, orgId);

        if (response.status === "rejected") {
          rejected++;
          results.push({
            id: event.id,
            status: "rejected",
            error: response.error,
          });
        } else if (isNew) {
          accepted++;
          results.push({
            id: event.id,
            status: "created",
            receivedAt: response.receivedAt,
          });
        } else {
          duplicate++;
          results.push({
            id: event.id,
            status: "duplicate",
            receivedAt: response.receivedAt,
          });
        }
      } catch (error) {
        rejected++;
        results.push({
          id: event.id,
          status: "rejected",
          error: {
            code: "EVT_INTERNAL",
            message: error instanceof Error ? error.message : "Unknown error",
          },
        });
      }
    }

    return { accepted, rejected, duplicate, results };
  }

  /**
   * Look up an event by ID (for dedup and retrieval).
   */
  async findById(id: string): Promise<GovernanceEvent | null> {
    const { data, error } = await this.supabase
      .from(TABLE_NAME)
      .select("raw_event")
      .eq("id", id)
      .single();

    if (error || !data) {
      return null;
    }

    return data.raw_event as GovernanceEvent;
  }

  /**
   * Clear the in-memory dedup cache. Used for testing.
   */
  clearCache(): void {
    this.dedupCache.clear();
  }

  // ─── Retrieval API (Sprint 4) ────────────────────────────────

  /**
   * Query filters for listing events.
   */
  async listEvents(
    orgId: string,
    filters: {
      assetId?: string;
      type?: string;
      criticality?: string;
      since?: string;
      limit?: number;
      offset?: number;
    } = {},
  ): Promise<{ events: GovernanceEvent[]; total: number }> {
    const limit = Math.min(filters.limit ?? 20, 100);
    const offset = filters.offset ?? 0;

    // Build count query
    let countQuery = this.supabase
      .from(TABLE_NAME)
      .select("id", { count: "exact", head: true })
      .eq("org_id", orgId);

    // Build data query
    let dataQuery = this.supabase
      .from(TABLE_NAME)
      .select("raw_event")
      .eq("org_id", orgId)
      .order("produced_at", { ascending: false })
      .range(offset, offset + limit - 1);

    // Apply filters to both queries
    if (filters.assetId) {
      countQuery = countQuery.eq("asset_id", filters.assetId);
      dataQuery = dataQuery.eq("asset_id", filters.assetId);
    }
    if (filters.type) {
      countQuery = countQuery.eq("type", filters.type);
      dataQuery = dataQuery.eq("type", filters.type);
    }
    if (filters.criticality) {
      countQuery = countQuery.eq("criticality", filters.criticality);
      dataQuery = dataQuery.eq("criticality", filters.criticality);
    }
    if (filters.since) {
      countQuery = countQuery.gte("produced_at", filters.since);
      dataQuery = dataQuery.gte("produced_at", filters.since);
    }

    const [countResult, dataResult] = await Promise.all([
      countQuery,
      dataQuery,
    ]);

    const total = countResult.count ?? 0;
    const events = (dataResult.data ?? []).map(
      (row: { raw_event: unknown }) => row.raw_event as GovernanceEvent,
    );

    return { events, total };
  }

  /**
   * List unique assets for an org with summary info.
   */
  async listAssets(
    orgId: string,
    pagination: { limit?: number; offset?: number } = {},
  ): Promise<{
    assets: Array<{
      assetId: string;
      lastEventAt: string;
      eventCount: number;
      latestType: string;
    }>;
    total: number;
  }> {
    const limit = Math.min(pagination.limit ?? 20, 100);
    const offset = pagination.offset ?? 0;

    // Use RPC or aggregate query to get asset summaries
    // Since Supabase doesn't support GROUP BY directly via client,
    // we use a workaround: get distinct asset_ids then fetch latest for each
    const { data: distinctAssets, error } = await this.supabase
      .from(TABLE_NAME)
      .select("asset_id")
      .eq("org_id", orgId)
      .order("asset_id");

    if (error || !distinctAssets) {
      return { assets: [], total: 0 };
    }

    // Deduplicate asset_ids
    const uniqueAssetIds = [
      ...new Set(distinctAssets.map((r: { asset_id: string }) => r.asset_id)),
    ];
    const total = uniqueAssetIds.length;

    // Apply pagination
    const paginatedIds = uniqueAssetIds.slice(offset, offset + limit);

    // For each asset, get the latest event info
    const assets = await Promise.all(
      paginatedIds.map(async (assetId) => {
        const { data: events, count } = await this.supabase
          .from(TABLE_NAME)
          .select("type, produced_at", { count: "exact" })
          .eq("org_id", orgId)
          .eq("asset_id", assetId)
          .order("produced_at", { ascending: false })
          .limit(1);

        const latest = events?.[0];
        return {
          assetId,
          lastEventAt: latest?.produced_at ?? "",
          eventCount: count ?? 0,
          latestType: latest?.type ?? "",
        };
      }),
    );

    return { assets, total };
  }

  // ─── Integrity Checkpoint queries (Sprint 5) ──────────────────

  /**
   * List all events for a specific org and date, sorted by received_at ASC.
   * Used by the Merkle tree checkpoint service.
   *
   * @param orgId — Organization ID
   * @param date — Date in YYYY-MM-DD format
   */
  async listEventsForDate(
    orgId: string,
    date: string,
  ): Promise<GovernanceEvent[]> {
    const startOfDay = `${date}T00:00:00.000Z`;
    const endOfDay = `${date}T23:59:59.999Z`;

    const { data, error } = await this.supabase
      .from(TABLE_NAME)
      .select("raw_event")
      .eq("org_id", orgId)
      .gte("received_at", startOfDay)
      .lte("received_at", endOfDay)
      .order("received_at", { ascending: true });

    if (error) {
      throw new Error(`Failed to query events for date: ${error.message}`);
    }

    return (data ?? []).map(
      (row: { raw_event: unknown }) => row.raw_event as GovernanceEvent,
    );
  }

  /**
   * Get distinct organization IDs that had events on a specific date.
   *
   * @param date — Date in YYYY-MM-DD format
   */
  async getOrgsWithEventsOnDate(date: string): Promise<string[]> {
    const startOfDay = `${date}T00:00:00.000Z`;
    const endOfDay = `${date}T23:59:59.999Z`;

    const { data, error } = await this.supabase
      .from(TABLE_NAME)
      .select("org_id")
      .gte("received_at", startOfDay)
      .lte("received_at", endOfDay);

    if (error) {
      throw new Error(`Failed to query orgs for date: ${error.message}`);
    }

    const uniqueOrgIds = [
      ...new Set((data ?? []).map((r: { org_id: string }) => r.org_id)),
    ];
    return uniqueOrgIds;
  }

  /**
   * Get events for a specific asset.
   */
  async getAssetEvents(
    orgId: string,
    assetId: string,
    filters: {
      type?: string;
      criticality?: string;
      since?: string;
      limit?: number;
      offset?: number;
    } = {},
  ): Promise<{ events: GovernanceEvent[]; total: number }> {
    return this.listEvents(orgId, { ...filters, assetId });
  }

  // ─── Internal ──────────────────────────────────────────────────

  /**
   * Map a GovernanceEvent to a database row matching 001_governance_events.sql
   */
  private eventToRow(
    event: GovernanceEvent,
    orgId: string,
    receivedAt: string,
  ): Record<string, unknown> {
    return {
      id: event.id,
      spec_version: event.specVersion,
      schema_version: event.schemaVersion,
      type: event.type,
      category: event.category,
      criticality: event.criticality,
      org_id: orgId,
      asset_id: event.assetId,
      produced_at: event.producedAt,
      received_at: receivedAt,
      hash: event.hash,
      previous_hash: event.previousHash ?? null,
      signature: event.signature ?? null,
      parent_event_id: event.parentEventId ?? null,
      correlation_id: event.correlationId ?? null,
      golden_thread: event.goldenThread,
      source: event.source,
      data: event.data,
      raw_event: event,
    };
  }
}
