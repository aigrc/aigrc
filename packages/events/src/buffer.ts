/**
 * Event Buffer — Producer-side buffering for governance events
 *
 * Wraps AigosClient with in-memory buffering and automatic flush.
 * Implements Tier 2 (Best-Effort) buffering per EVT-001 §4.4:
 * - In-memory buffer (no disk persistence)
 * - Auto-flush on size threshold, timer, or critical event
 * - Best-effort delivery: failed events are NOT re-buffered
 *
 * @example
 * ```typescript
 * const buffer = new EventBuffer({
 *   client: new AigosClient({ apiUrl: "...", apiKey: "..." }),
 *   maxSize: 50,
 *   flushIntervalMs: 10_000,
 * });
 *
 * buffer.add(event);  // Buffered
 * await buffer.flush(); // Manual flush
 * await buffer.dispose(); // Flush remaining + stop timer
 * ```
 */

import type { GovernanceEvent } from "./schemas/event-envelope";
import type { PushResponse, BatchResponse } from "./schemas/responses";
import { AigosClient, type ClientConfig } from "./client";

// ─────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────

/**
 * Configuration for the EventBuffer.
 */
export interface BufferConfig {
  /** AigosClient instance or ClientConfig to create one */
  client: AigosClient | ClientConfig;

  /** Maximum buffer size before auto-flush (default: 50) */
  maxSize?: number;

  /** Flush interval in milliseconds (default: 10_000 = 10 seconds) */
  flushIntervalMs?: number;

  /** Whether to immediately flush critical events (default: true) */
  flushOnCritical?: boolean;

  /** Maximum batch size per flush (default: 1000) */
  maxBatchSize?: number;

  /** Error handler for background flush failures */
  onFlushError?: (error: Error, events: GovernanceEvent[]) => void;
}

// ─────────────────────────────────────────────────────────────────
// DEFAULTS
// ─────────────────────────────────────────────────────────────────

const DEFAULT_MAX_SIZE = 50;
const DEFAULT_FLUSH_INTERVAL_MS = 10_000;
const DEFAULT_MAX_BATCH_SIZE = 1000;

// ─────────────────────────────────────────────────────────────────
// EVENT BUFFER
// ─────────────────────────────────────────────────────────────────

/**
 * In-memory event buffer with automatic flush.
 *
 * Tier 2 (Best-Effort) buffering:
 * - Events are held in memory until flushed
 * - Flush triggers: buffer size threshold, timer interval, critical event
 * - Failed flushes invoke onFlushError (events are NOT re-buffered)
 * - dispose() flushes remaining events and stops the timer
 */
export class EventBuffer {
  private readonly client: AigosClient;
  private readonly maxSize: number;
  private readonly maxBatchSize: number;
  private readonly flushOnCritical: boolean;
  private readonly onFlushError?: (error: Error, events: GovernanceEvent[]) => void;
  private readonly flushIntervalMs: number;

  private buffer: GovernanceEvent[] = [];
  private inFlightCount = 0;
  private flushTimer: ReturnType<typeof setInterval> | null = null;
  private disposed = false;

  constructor(config: BufferConfig) {
    // Create or use provided client
    this.client =
      config.client instanceof AigosClient
        ? config.client
        : new AigosClient(config.client);

    this.maxSize = config.maxSize ?? DEFAULT_MAX_SIZE;
    this.flushIntervalMs = config.flushIntervalMs ?? DEFAULT_FLUSH_INTERVAL_MS;
    this.flushOnCritical = config.flushOnCritical ?? true;
    this.maxBatchSize = config.maxBatchSize ?? DEFAULT_MAX_BATCH_SIZE;
    this.onFlushError = config.onFlushError;

    // Start periodic flush timer
    this.startTimer();
  }

  // ─── Public API ─────────────────────────────────────────────

  /**
   * Add a single event to the buffer.
   *
   * If the event is critical and flushOnCritical is enabled,
   * the entire buffer (including this event) is flushed immediately.
   *
   * If the buffer reaches maxSize, it is flushed automatically.
   */
  add(event: GovernanceEvent): void {
    if (this.disposed) {
      throw new Error("EventBuffer has been disposed");
    }

    this.buffer.push(event);

    // Critical events trigger immediate flush
    if (this.flushOnCritical && event.criticality === "critical") {
      void this.flushInternal();
      return;
    }

    // Auto-flush when buffer reaches maxSize
    if (this.buffer.length >= this.maxSize) {
      void this.flushInternal();
    }
  }

  /**
   * Add multiple events to the buffer.
   *
   * Same auto-flush rules as add() — checks for critical events
   * and maxSize threshold after all events are added.
   */
  addMany(events: GovernanceEvent[]): void {
    if (this.disposed) {
      throw new Error("EventBuffer has been disposed");
    }

    this.buffer.push(...events);

    // Check for critical events
    if (this.flushOnCritical && events.some((e) => e.criticality === "critical")) {
      void this.flushInternal();
      return;
    }

    // Auto-flush when buffer reaches maxSize
    if (this.buffer.length >= this.maxSize) {
      void this.flushInternal();
    }
  }

  /**
   * Manually flush all buffered events.
   *
   * Returns the response from the AigosClient, or null if buffer was empty.
   * For multiple events, uses pushBatch() (respecting maxBatchSize chunks).
   * For a single event, uses push().
   */
  async flush(): Promise<PushResponse | BatchResponse | null> {
    return this.flushInternal();
  }

  /**
   * Get the number of events currently in the buffer.
   */
  get size(): number {
    return this.buffer.length;
  }

  /**
   * Get the total number of pending events (buffer + in-flight).
   */
  get pending(): number {
    return this.buffer.length + this.inFlightCount;
  }

  /**
   * Stop the flush timer and flush remaining events.
   *
   * After dispose(), add() and addMany() will throw.
   * Returns when the final flush completes (or fails).
   */
  async dispose(): Promise<void> {
    if (this.disposed) return;
    this.disposed = true;
    this.stopTimer();

    if (this.buffer.length > 0) {
      await this.flushInternal();
    }
  }

  // ─── Internal ──────────────────────────────────────────────

  /**
   * Internal flush implementation.
   * Drains the buffer, sends events via client, handles errors.
   */
  private async flushInternal(): Promise<PushResponse | BatchResponse | null> {
    if (this.buffer.length === 0) {
      return null;
    }

    // Take all events from buffer
    const events = this.buffer.splice(0);
    this.inFlightCount += events.length;

    try {
      let result: PushResponse | BatchResponse;

      if (events.length === 1) {
        // Single event → Sync channel
        result = await this.client.push(events[0]);
      } else if (events.length <= this.maxBatchSize) {
        // Fits in one batch
        result = await this.client.pushBatch(events);
      } else {
        // Split into chunks and send multiple batches
        result = await this.flushChunked(events);
      }

      return result;
    } catch (error) {
      // Best-effort: events are NOT re-buffered
      const err = error instanceof Error ? error : new Error(String(error));

      if (this.onFlushError) {
        this.onFlushError(err, events);
      }

      throw err;
    } finally {
      this.inFlightCount -= events.length;
    }
  }

  /**
   * Flush events in chunks of maxBatchSize.
   * Returns a merged BatchResponse.
   */
  private async flushChunked(events: GovernanceEvent[]): Promise<BatchResponse> {
    let totalAccepted = 0;
    let totalRejected = 0;
    let totalDuplicate = 0;
    const allResults: BatchResponse["results"] = [];

    for (let i = 0; i < events.length; i += this.maxBatchSize) {
      const chunk = events.slice(i, i + this.maxBatchSize);
      const response = await this.client.pushBatch(chunk);

      totalAccepted += response.accepted;
      totalRejected += response.rejected;
      totalDuplicate += response.duplicate;
      allResults.push(...response.results);
    }

    return {
      accepted: totalAccepted,
      rejected: totalRejected,
      duplicate: totalDuplicate,
      results: allResults,
    };
  }

  /**
   * Start the periodic flush timer.
   */
  private startTimer(): void {
    if (this.flushIntervalMs > 0) {
      this.flushTimer = setInterval(() => {
        if (this.buffer.length > 0) {
          void this.flushInternal();
        }
      }, this.flushIntervalMs);

      // Unref the timer so it doesn't prevent Node.js process exit
      if (typeof this.flushTimer === "object" && "unref" in this.flushTimer) {
        this.flushTimer.unref();
      }
    }
  }

  /**
   * Stop the periodic flush timer.
   */
  private stopTimer(): void {
    if (this.flushTimer !== null) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
  }
}
