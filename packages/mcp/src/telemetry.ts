/**
 * AIGRC Enterprise Telemetry
 *
 * Provides hooks for enterprise logging and metrics collection.
 * Sends events to a configurable endpoint for audit and monitoring.
 */

import { AIGRCConfig } from "./config.js";

/**
 * Telemetry event types
 */
export type TelemetryEventType =
  | "tool_call"
  | "resource_access"
  | "prompt_render"
  | "compliance_check"
  | "card_change"
  | "classification_change"
  | "golden_thread_sync"
  | "checkpoint_pass"
  | "checkpoint_fail"
  | "error";

/**
 * Telemetry event structure
 */
export interface TelemetryEvent {
  type: TelemetryEventType;
  timestamp: string;
  sessionId?: string;
  tenantId?: string;
  userId?: string;
  assetId?: string;
  toolName?: string;
  resourceUri?: string;
  promptName?: string;
  profile?: string;
  riskLevel?: string;
  duration?: number;
  success: boolean;
  error?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Telemetry hook function type
 */
export type TelemetryHook = (event: TelemetryEvent) => void | Promise<void>;

/**
 * Telemetry service for enterprise logging
 */
export interface TelemetryService {
  /** Record a telemetry event */
  record(event: Omit<TelemetryEvent, "timestamp">): void;

  /** Register a hook to receive events */
  addHook(hook: TelemetryHook): void;

  /** Remove a hook */
  removeHook(hook: TelemetryHook): void;

  /** Flush any buffered events */
  flush(): Promise<void>;

  /** Shutdown the telemetry service */
  shutdown(): Promise<void>;
}

/**
 * Create the telemetry service
 */
export function createTelemetryService(config: AIGRCConfig): TelemetryService {
  const hooks: Set<TelemetryHook> = new Set();
  const buffer: TelemetryEvent[] = [];
  let flushTimer: ReturnType<typeof setTimeout> | null = null;

  /**
   * Send events to the telemetry endpoint
   */
  async function sendToEndpoint(events: TelemetryEvent[]): Promise<void> {
    if (!config.telemetryEndpoint) return;

    try {
      const response = await fetch(config.telemetryEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(config.telemetryApiKey && {
            Authorization: `Bearer ${config.telemetryApiKey}`,
          }),
        },
        body: JSON.stringify({ events }),
      });

      if (!response.ok) {
        console.error(`Telemetry send failed: ${response.status}`);
      }
    } catch (error) {
      console.error("Telemetry send error:", error);
    }
  }

  /**
   * Flush the buffer
   */
  async function flush(): Promise<void> {
    if (buffer.length === 0) return;

    const events = [...buffer];
    buffer.length = 0;

    // Send to endpoint if configured
    if (config.telemetryEnabled && config.telemetryEndpoint) {
      await sendToEndpoint(events);
    }
  }

  /**
   * Schedule a flush
   */
  function scheduleFlush(): void {
    if (flushTimer) return;
    flushTimer = setTimeout(async () => {
      flushTimer = null;
      await flush();
    }, config.telemetryFlushInterval);
  }

  /**
   * Record an event
   */
  function record(event: Omit<TelemetryEvent, "timestamp">): void {
    const fullEvent: TelemetryEvent = {
      ...event,
      timestamp: new Date().toISOString(),
    };

    // Call all hooks synchronously (best effort)
    for (const hook of hooks) {
      try {
        const result = hook(fullEvent);
        if (result instanceof Promise) {
          result.catch((error) =>
            console.error("Telemetry hook error:", error)
          );
        }
      } catch (error) {
        console.error("Telemetry hook error:", error);
      }
    }

    // Buffer for batch sending
    if (config.telemetryEnabled) {
      buffer.push(fullEvent);

      if (buffer.length >= config.telemetryBatchSize) {
        flush().catch((error) =>
          console.error("Telemetry flush error:", error)
        );
      } else {
        scheduleFlush();
      }
    }
  }

  return {
    record,
    addHook: (hook: TelemetryHook) => hooks.add(hook),
    removeHook: (hook: TelemetryHook) => hooks.delete(hook),
    flush,
    shutdown: async () => {
      if (flushTimer) {
        clearTimeout(flushTimer);
        flushTimer = null;
      }
      await flush();
    },
  };
}

/**
 * No-op telemetry service for when telemetry is disabled
 */
export function createNoOpTelemetryService(): TelemetryService {
  return {
    record: () => {},
    addHook: () => {},
    removeHook: () => {},
    flush: async () => {},
    shutdown: async () => {},
  };
}

/**
 * Create console logging hook for development
 */
export function createConsoleHook(logLevel: string): TelemetryHook {
  return (event: TelemetryEvent) => {
    if (logLevel === "debug") {
      console.log(`[AIGRC] ${event.type}:`, JSON.stringify(event, null, 2));
    } else if (logLevel === "info") {
      const summary = event.success
        ? `${event.type} completed`
        : `${event.type} failed: ${event.error}`;
      console.log(`[AIGRC] ${summary}`);
    }
  };
}
