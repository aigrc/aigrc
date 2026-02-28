import type { GovernanceEvent } from "./schemas/event-envelope";
import type {
  PushResponse,
  BatchResponse,
  EventListResponse,
  AssetListResponse,
} from "./schemas/responses";

// ─────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────

/**
 * Configuration for the AigosClient.
 */
export interface ClientConfig {
  /** Base URL of the AIGOS control plane (e.g., "https://api.aigos.dev") */
  apiUrl: string;
  /** API key for authentication (sent as Bearer token) */
  apiKey: string;
  /** Request timeout in milliseconds (default: 30000) */
  timeout?: number;
  /** Maximum retries for 5xx errors (default: 3) */
  maxRetries?: number;
  /** Custom headers to include on every request */
  headers?: Record<string, string>;
}

// ─────────────────────────────────────────────────────────────────
// ERRORS
// ─────────────────────────────────────────────────────────────────

/**
 * Generic AIGOS API error.
 */
export class AigosClientError extends Error {
  public readonly statusCode: number;
  public readonly response?: unknown;

  constructor(statusCode: number, response?: unknown, message?: string) {
    super(message ?? `AIGOS API error: ${statusCode}`);
    this.name = "AigosClientError";
    this.statusCode = statusCode;
    this.response = response;
  }
}

/**
 * Rate limit error (429). Includes retry-after duration.
 */
export class AigosRateLimitError extends AigosClientError {
  public readonly retryAfter: number;

  constructor(retryAfter: number, response?: unknown) {
    super(429, response, `Rate limited. Retry after ${retryAfter}s`);
    this.name = "AigosRateLimitError";
    this.retryAfter = retryAfter;
  }
}

// ─────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────

const DEFAULT_TIMEOUT = 30_000;
const DEFAULT_MAX_RETRIES = 3;
const MAX_BATCH_SIZE = 1000;
const SYNC_ENDPOINT = "/v1/events";
const BATCH_ENDPOINT = "/v1/events/batch";
const EVENTS_ENDPOINT = "/v1/events";
const ASSETS_ENDPOINT = "/v1/assets";
const HEALTH_ENDPOINT = "/v1/health";

/**
 * Filters for listing governance events.
 */
export interface EventListFilters {
  /** Filter by asset ID */
  assetId?: string;
  /** Filter by event type */
  type?: string;
  /** Filter by criticality */
  criticality?: string;
  /** Filter events since this ISO 8601 timestamp */
  since?: string;
  /** Maximum number of events to return (default: 20, max: 100) */
  limit?: number;
  /** Offset for pagination */
  offset?: number;
}

/**
 * Filters for listing assets.
 */
export interface AssetListFilters {
  /** Maximum number of assets to return (default: 20, max: 100) */
  limit?: number;
  /** Offset for pagination */
  offset?: number;
}

// ─────────────────────────────────────────────────────────────────
// CLIENT
// ─────────────────────────────────────────────────────────────────

/**
 * HTTP client for pushing governance events to the AIGOS control plane.
 *
 * Supports three delivery modes:
 * - **push()** — Sync Channel: single event via POST /v1/events
 * - **pushBatch()** — Batch Channel: multiple events via POST /v1/events/batch
 * - **send()** — Auto-selects channel based on event count and criticality
 *
 * Features:
 * - Exponential backoff retry on 5xx errors
 * - Rate limit handling (429 with Retry-After)
 * - Dedup-safe: 200 OK (duplicate) treated as success
 * - Request timeout via AbortController
 * - No external dependencies (uses native fetch)
 *
 * @example
 * ```typescript
 * const client = new AigosClient({
 *   apiUrl: "https://api.aigos.dev",
 *   apiKey: "ak_...",
 * });
 *
 * const response = await client.push(event);
 * console.log(response.status); // "accepted"
 * ```
 */
export class AigosClient {
  private readonly apiUrl: string;
  private readonly apiKey: string;
  private readonly timeout: number;
  private readonly maxRetries: number;
  private readonly customHeaders: Record<string, string>;
  private abortController: AbortController | null = null;

  constructor(config: ClientConfig) {
    // Normalize base URL (strip trailing slash)
    this.apiUrl = config.apiUrl.replace(/\/+$/, "");
    this.apiKey = config.apiKey;
    this.timeout = config.timeout ?? DEFAULT_TIMEOUT;
    this.maxRetries = config.maxRetries ?? DEFAULT_MAX_RETRIES;
    this.customHeaders = config.headers ?? {};
  }

  // ─── Public API ───────────────────────────────────────────────

  /**
   * Push a single event via the Sync Channel (POST /v1/events).
   * Returns the PushResponse with policy feedback.
   *
   * HTTP status mapping:
   * - 201 Created → success
   * - 200 OK → duplicate (treated as success)
   * - 400 → AigosClientError with validation details
   * - 401 → AigosClientError (unauthorized)
   * - 429 → AigosRateLimitError with retryAfter
   * - 5xx → retried with exponential backoff
   */
  async push(event: GovernanceEvent): Promise<PushResponse> {
    const response = await this.request<PushResponse>(
      SYNC_ENDPOINT,
      "POST",
      event
    );
    return response;
  }

  /**
   * Push multiple events via the Batch Channel (POST /v1/events/batch).
   * Returns the BatchResponse with per-event results.
   *
   * @throws Error if events.length > 1000
   */
  async pushBatch(events: GovernanceEvent[]): Promise<BatchResponse> {
    if (events.length > MAX_BATCH_SIZE) {
      throw new Error(
        `Batch size ${events.length} exceeds maximum of ${MAX_BATCH_SIZE}`
      );
    }

    const response = await this.request<BatchResponse>(
      BATCH_ENDPOINT,
      "POST",
      events
    );
    return response;
  }

  /**
   * Auto-select channel based on event properties (EVT-001 §12.4):
   *
   * 1. Critical events → always Sync (extracted from arrays)
   * 2. Single event → Sync Channel
   * 3. Multiple events → Batch Channel
   *
   * Returns PushResponse for single events or BatchResponse for batches.
   * When critical events are extracted from a batch, they are pushed
   * individually via Sync before the remaining batch.
   */
  async send(
    events: GovernanceEvent | GovernanceEvent[]
  ): Promise<PushResponse | BatchResponse> {
    // Single event → always Sync
    if (!Array.isArray(events)) {
      return this.push(events);
    }

    // Empty array → return empty batch response
    if (events.length === 0) {
      return { accepted: 0, rejected: 0, duplicate: 0, results: [] };
    }

    // Single element array → Sync
    if (events.length === 1) {
      return this.push(events[0]);
    }

    // Separate critical events (must go via Sync)
    const critical: GovernanceEvent[] = [];
    const nonCritical: GovernanceEvent[] = [];

    for (const event of events) {
      if (event.criticality === "critical") {
        critical.push(event);
      } else {
        nonCritical.push(event);
      }
    }

    // Push critical events individually via Sync
    for (const event of critical) {
      await this.push(event);
    }

    // Push remaining via Batch (if any)
    if (nonCritical.length === 0) {
      // All were critical, return a synthetic batch response
      return {
        accepted: critical.length,
        rejected: 0,
        duplicate: 0,
        results: critical.map((e) => ({
          id: e.id,
          status: "created" as const,
          receivedAt: new Date().toISOString(),
        })),
      };
    }

    if (nonCritical.length === 1) {
      // Only one non-critical remaining → Sync
      const pushResult = await this.push(nonCritical[0]);
      return {
        accepted: critical.length + (pushResult.status === "accepted" ? 1 : 0),
        rejected: pushResult.status === "rejected" ? 1 : 0,
        duplicate: 0,
        results: [
          ...critical.map((e) => ({
            id: e.id,
            status: "created" as const,
            receivedAt: new Date().toISOString(),
          })),
          {
            id: nonCritical[0].id,
            status: pushResult.status === "accepted" ? ("created" as const) : ("rejected" as const),
            receivedAt: pushResult.receivedAt,
          },
        ],
      };
    }

    // Batch the non-critical events
    const batchResult = await this.pushBatch(nonCritical);

    // Merge critical sync results with batch results
    return {
      accepted: batchResult.accepted + critical.length,
      rejected: batchResult.rejected,
      duplicate: batchResult.duplicate,
      results: [
        ...critical.map((e) => ({
          id: e.id,
          status: "created" as const,
          receivedAt: new Date().toISOString(),
        })),
        ...batchResult.results,
      ],
    };
  }

  /**
   * Check if the AIGOS control plane is healthy.
   * Returns true if GET /v1/health returns 200.
   */
  async healthCheck(): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      const response = await fetch(`${this.apiUrl}${HEALTH_ENDPOINT}`, {
        method: "GET",
        headers: this.buildHeaders(),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      return response.ok;
    } catch {
      return false;
    }
  }

  // ─── Retrieval API (Sprint 4) ─────────────────────────────────

  /**
   * List governance events for the authenticated org.
   *
   * @param filters — Optional filters (assetId, type, criticality, since, limit, offset)
   */
  async listEvents(filters?: EventListFilters): Promise<EventListResponse> {
    const params = this.buildQueryString(filters);
    return this.requestGet<EventListResponse>(`${EVENTS_ENDPOINT}${params}`);
  }

  /**
   * Get a single governance event by ID.
   *
   * @throws AigosClientError with status 404 if not found
   */
  async getEvent(eventId: string): Promise<GovernanceEvent> {
    return this.requestGet<GovernanceEvent>(`${EVENTS_ENDPOINT}/${eventId}`);
  }

  /**
   * List unique assets for the authenticated org.
   *
   * @param filters — Optional pagination (limit, offset)
   */
  async listAssets(filters?: AssetListFilters): Promise<AssetListResponse> {
    const params = this.buildQueryString(filters);
    return this.requestGet<AssetListResponse>(`${ASSETS_ENDPOINT}${params}`);
  }

  /**
   * Cancel any in-flight requests and clean up resources.
   */
  dispose(): void {
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
  }

  // ─── Internal HTTP ────────────────────────────────────────────

  /**
   * Make an HTTP request with retry logic and error handling.
   */
  private async request<T>(
    path: string,
    method: string,
    body: unknown
  ): Promise<T> {
    let lastError: Error | undefined;

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        this.abortController = new AbortController();
        const timeoutId = setTimeout(
          () => this.abortController?.abort(),
          this.timeout
        );

        const response = await fetch(`${this.apiUrl}${path}`, {
          method,
          headers: this.buildHeaders(),
          body: JSON.stringify(body),
          signal: this.abortController.signal,
        });

        clearTimeout(timeoutId);

        // Success: 200 OK (duplicate) or 201 Created
        if (response.ok) {
          return (await response.json()) as T;
        }

        // Rate limited: 429
        if (response.status === 429) {
          const retryAfter = parseInt(
            response.headers.get("Retry-After") ?? "60",
            10
          );
          throw new AigosRateLimitError(retryAfter, await this.safeJson(response));
        }

        // Client errors: 4xx (no retry)
        if (response.status >= 400 && response.status < 500) {
          const responseBody = await this.safeJson(response);
          throw new AigosClientError(response.status, responseBody);
        }

        // Server errors: 5xx (retry with backoff)
        if (response.status >= 500) {
          lastError = new AigosClientError(
            response.status,
            await this.safeJson(response)
          );

          // Don't retry on last attempt
          if (attempt < this.maxRetries) {
            const backoff = Math.pow(2, attempt) * 1000; // 1s, 2s, 4s
            await this.sleep(backoff);
            continue;
          }
        }
      } catch (error) {
        // Re-throw our custom errors directly
        if (error instanceof AigosClientError) {
          throw error;
        }

        // AbortError = timeout
        if (error instanceof DOMException && error.name === "AbortError") {
          lastError = new AigosClientError(
            0,
            undefined,
            `Request timed out after ${this.timeout}ms`
          );
        } else {
          lastError = error instanceof Error ? error : new Error(String(error));
        }

        // Don't retry on last attempt
        if (attempt < this.maxRetries) {
          const backoff = Math.pow(2, attempt) * 1000;
          await this.sleep(backoff);
          continue;
        }
      }
    }

    throw lastError ?? new Error("Request failed after retries");
  }

  /**
   * Make a GET request with retry logic and error handling.
   */
  private async requestGet<T>(path: string): Promise<T> {
    let lastError: Error | undefined;

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        this.abortController = new AbortController();
        const timeoutId = setTimeout(
          () => this.abortController?.abort(),
          this.timeout
        );

        const response = await fetch(`${this.apiUrl}${path}`, {
          method: "GET",
          headers: this.buildHeaders(),
          signal: this.abortController.signal,
        });

        clearTimeout(timeoutId);

        if (response.ok) {
          return (await response.json()) as T;
        }

        if (response.status === 429) {
          const retryAfter = parseInt(
            response.headers.get("Retry-After") ?? "60",
            10
          );
          throw new AigosRateLimitError(retryAfter, await this.safeJson(response));
        }

        if (response.status >= 400 && response.status < 500) {
          throw new AigosClientError(response.status, await this.safeJson(response));
        }

        if (response.status >= 500) {
          lastError = new AigosClientError(
            response.status,
            await this.safeJson(response)
          );
          if (attempt < this.maxRetries) {
            await this.sleep(Math.pow(2, attempt) * 1000);
            continue;
          }
        }
      } catch (error) {
        if (error instanceof AigosClientError) throw error;
        if (error instanceof DOMException && error.name === "AbortError") {
          lastError = new AigosClientError(0, undefined, `Request timed out after ${this.timeout}ms`);
        } else {
          lastError = error instanceof Error ? error : new Error(String(error));
        }
        if (attempt < this.maxRetries) {
          await this.sleep(Math.pow(2, attempt) * 1000);
          continue;
        }
      }
    }

    throw lastError ?? new Error("Request failed after retries");
  }

  /**
   * Build a query string from filter parameters.
   */
  private buildQueryString(filters?: EventListFilters | AssetListFilters): string {
    if (!filters) return "";
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(filters as Record<string, unknown>)) {
      if (value !== undefined && value !== null) {
        // Convert camelCase to snake_case for API
        const apiKey = key.replace(/[A-Z]/g, (m) => `_${m.toLowerCase()}`);
        params.set(apiKey, String(value));
      }
    }
    const str = params.toString();
    return str ? `?${str}` : "";
  }

  /**
   * Build request headers.
   */
  private buildHeaders(): Record<string, string> {
    return {
      "Content-Type": "application/json",
      Authorization: `Bearer ${this.apiKey}`,
      ...this.customHeaders,
    };
  }

  /**
   * Safely parse JSON response body (returns undefined on failure).
   */
  private async safeJson(response: Response): Promise<unknown> {
    try {
      return await response.json();
    } catch {
      return undefined;
    }
  }

  /**
   * Sleep for the given number of milliseconds.
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
