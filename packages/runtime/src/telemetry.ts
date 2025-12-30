import type { RuntimeIdentity } from "@aigrc/core";

// ─────────────────────────────────────────────────────────────────
// TELEMETRY
// Governance telemetry and audit logging
// ─────────────────────────────────────────────────────────────────

/** Telemetry event types */
export type TelemetryEventType =
  | "identity_created"
  | "identity_verified"
  | "action_allowed"
  | "action_denied"
  | "action_audited"
  | "kill_switch_activated"
  | "mode_changed"
  | "policy_evaluated"
  | "spawn_child"
  | "error";

/** Base telemetry event */
export interface TelemetryEvent {
  /** Event type */
  type: TelemetryEventType;
  /** Timestamp */
  timestamp: string;
  /** Instance ID */
  instanceId: string;
  /** Asset ID */
  assetId: string;
  /** Risk level */
  riskLevel: string;
  /** Operating mode */
  mode: string;
  /** Event-specific data */
  data: Record<string, unknown>;
}

/** Telemetry configuration */
export interface TelemetryConfig {
  /** Whether telemetry is enabled */
  enabled: boolean;
  /** Telemetry endpoint URL */
  endpoint?: string;
  /** Sample rate (0-1) */
  sampleRate?: number;
  /** Batch size for sending */
  batchSize?: number;
  /** Flush interval in milliseconds */
  flushIntervalMs?: number;
  /** Custom event handler */
  onEvent?: (event: TelemetryEvent) => void;
}

/** Telemetry client interface */
export interface TelemetryClient {
  /** Record an event */
  record(type: TelemetryEventType, data: Record<string, unknown>): void;
  /** Flush pending events */
  flush(): Promise<void>;
  /** Stop the telemetry client */
  stop(): void;
}

/**
 * Creates a telemetry client for an agent.
 *
 * @param identity The agent's runtime identity
 * @param config Telemetry configuration
 * @returns Telemetry client
 */
export function createTelemetryClient(
  identity: RuntimeIdentity,
  config: TelemetryConfig
): TelemetryClient {
  const eventQueue: TelemetryEvent[] = [];
  let flushTimer: ReturnType<typeof setInterval> | null = null;

  const {
    enabled,
    sampleRate = 1.0,
    batchSize = 100,
    flushIntervalMs = 30000,
  } = config;

  // Start flush timer if enabled
  if (enabled && flushIntervalMs > 0) {
    flushTimer = setInterval(() => {
      flush().catch(console.error);
    }, flushIntervalMs);
  }

  function record(type: TelemetryEventType, data: Record<string, unknown>): void {
    if (!enabled) return;

    // Apply sampling
    if (sampleRate < 1.0 && Math.random() > sampleRate) {
      return;
    }

    const event: TelemetryEvent = {
      type,
      timestamp: new Date().toISOString(),
      instanceId: identity.instance_id,
      assetId: identity.asset_id,
      riskLevel: identity.risk_level,
      mode: identity.mode,
      data,
    };

    // Call custom handler if provided
    config.onEvent?.(event);

    // Add to queue
    eventQueue.push(event);

    // Flush if batch size reached
    if (eventQueue.length >= batchSize) {
      flush().catch(console.error);
    }
  }

  async function flush(): Promise<void> {
    if (eventQueue.length === 0) return;

    const events = eventQueue.splice(0, batchSize);

    if (config.endpoint) {
      try {
        // In real implementation, would POST to endpoint
        console.log(`[Telemetry] Would send ${events.length} events to ${config.endpoint}`);
      } catch (err) {
        // Re-queue events on failure
        eventQueue.unshift(...events);
        console.error("[Telemetry] Failed to send events:", err);
      }
    }
  }

  function stop(): void {
    if (flushTimer) {
      clearInterval(flushTimer);
      flushTimer = null;
    }
    // Final flush
    flush().catch(console.error);
  }

  return {
    record,
    flush,
    stop,
  };
}

/**
 * Creates a no-op telemetry client for when telemetry is disabled.
 */
export function createNoopTelemetryClient(): TelemetryClient {
  return {
    record: () => {},
    flush: async () => {},
    stop: () => {},
  };
}

/**
 * Creates a console-logging telemetry client for debugging.
 */
export function createConsoleTelemetryClient(
  identity: RuntimeIdentity
): TelemetryClient {
  return createTelemetryClient(identity, {
    enabled: true,
    sampleRate: 1.0,
    onEvent: (event) => {
      console.log(`[Telemetry] ${event.type}:`, JSON.stringify(event.data, null, 2));
    },
  });
}

// ─────────────────────────────────────────────────────────────────
// AUDIT LOG
// Structured audit logging for governance events
// ─────────────────────────────────────────────────────────────────

/** Audit log entry */
export interface AuditLogEntry {
  /** Unique entry ID */
  id: string;
  /** Timestamp */
  timestamp: string;
  /** Instance ID */
  instanceId: string;
  /** Asset ID */
  assetId: string;
  /** Action performed */
  action: string;
  /** Resource accessed */
  resource: string;
  /** Decision (allowed/denied) */
  decision: "allowed" | "denied";
  /** Reason for decision */
  reason: string;
  /** Risk level at time of action */
  riskLevel: string;
  /** Operating mode at time of action */
  mode: string;
  /** Policy rule that matched (if any) */
  matchedRule?: string;
  /** Additional context */
  context?: Record<string, unknown>;
}

/** Audit logger interface */
export interface AuditLogger {
  /** Log an audit entry */
  log(entry: Omit<AuditLogEntry, "id" | "timestamp">): void;
  /** Get recent entries */
  getRecent(limit?: number): AuditLogEntry[];
  /** Clear log */
  clear(): void;
}

/**
 * Creates an in-memory audit logger.
 */
export function createAuditLogger(maxEntries: number = 1000): AuditLogger {
  const entries: AuditLogEntry[] = [];
  let idCounter = 0;

  return {
    log(entry) {
      const fullEntry: AuditLogEntry = {
        ...entry,
        id: `audit-${++idCounter}`,
        timestamp: new Date().toISOString(),
      };
      entries.push(fullEntry);

      // Trim if over max
      if (entries.length > maxEntries) {
        entries.shift();
      }
    },
    getRecent(limit = 100) {
      return entries.slice(-limit);
    },
    clear() {
      entries.length = 0;
    },
  };
}
