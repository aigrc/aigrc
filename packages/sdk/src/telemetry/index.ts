/**
 * @aigrc/sdk - Telemetry Manager
 *
 * OpenTelemetry integration for agent observability.
 * Handles tracing, metrics, and audit event collection.
 */

import type { RuntimeIdentity } from "@aigrc/core";
import type { TelemetryConfig, TelemetryData } from "../types/index.js";

/**
 * Telemetry manager for collecting and exporting observability data
 */
export interface TelemetryManager {
  /** Record an action event */
  recordAction: (name: string, attributes?: Record<string, unknown>) => void;

  /** Record a decision event */
  recordDecision: (
    action: string,
    allowed: boolean,
    reason?: string
  ) => void;

  /** Record an error event */
  recordError: (error: Error, context?: Record<string, unknown>) => void;

  /** Record a metric */
  recordMetric: (
    name: string,
    value: number,
    attributes?: Record<string, unknown>
  ) => void;

  /** Start a span for tracing */
  startSpan: (name: string, attributes?: Record<string, unknown>) => Span;

  /** Get current trace context */
  getTraceContext: () => TraceContext | null;

  /** Flush pending telemetry data */
  flush: () => Promise<void>;

  /** Shutdown telemetry collection */
  shutdown: () => Promise<void>;
}

/**
 * Span interface for tracing
 */
export interface Span {
  /** Span ID */
  spanId: string;

  /** Add attributes to the span */
  setAttributes: (attributes: Record<string, unknown>) => void;

  /** Record an event within the span */
  addEvent: (name: string, attributes?: Record<string, unknown>) => void;

  /** Set span status */
  setStatus: (code: SpanStatusCode, message?: string) => void;

  /** End the span */
  end: () => void;
}

/**
 * Span status codes
 */
export type SpanStatusCode = "OK" | "ERROR" | "UNSET";

/**
 * Trace context for distributed tracing
 */
export interface TraceContext {
  traceId: string;
  spanId: string;
  traceFlags: number;
}

/**
 * Internal telemetry buffer entry
 */
interface TelemetryEntry extends TelemetryData {
  id: string;
  queued: boolean;
}

/**
 * Create a telemetry manager instance
 */
export function createTelemetryManager(
  config: TelemetryConfig,
  identity: RuntimeIdentity
): TelemetryManager {
  // Buffer for telemetry data
  const buffer: TelemetryEntry[] = [];
  let flushTimer: NodeJS.Timeout | null = null;
  let currentTraceId: string | null = null;
  let currentSpanId: string | null = null;

  // Start flush interval
  const flushIntervalMs = config.flushIntervalMs || 10000;
  const batchSize = config.batchSize || 100;

  if (config.enabled) {
    flushTimer = setInterval(() => {
      flushBuffer();
    }, flushIntervalMs);
  }

  /**
   * Generate a random ID
   */
  function generateId(length: number = 16): string {
    const chars = "0123456789abcdef";
    let result = "";
    for (let i = 0; i < length; i++) {
      result += chars[Math.floor(Math.random() * chars.length)];
    }
    return result;
  }

  /**
   * Add entry to buffer
   */
  function addToBuffer(data: Omit<TelemetryData, "timestamp">): void {
    if (!config.enabled) return;

    // Apply sampling
    if (config.samplingRate && Math.random() > config.samplingRate) {
      return;
    }

    const entry: TelemetryEntry = {
      ...data,
      timestamp: new Date(),
      traceId: currentTraceId || undefined,
      spanId: currentSpanId || undefined,
      id: generateId(),
      queued: false,
    };

    buffer.push(entry);

    // Flush if buffer is full
    if (buffer.length >= batchSize) {
      flushBuffer();
    }
  }

  /**
   * Flush buffer to endpoint
   */
  async function flushBuffer(): Promise<void> {
    if (buffer.length === 0) return;

    const toFlush = buffer.splice(0, batchSize);

    if (!config.endpoint) {
      // No endpoint configured, just clear buffer
      return;
    }

    try {
      await fetch(config.endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          agentId: identity.instance_id,
          assetId: identity.asset_id,
          events: toFlush,
        }),
      });
    } catch (error) {
      // Re-add to buffer on failure
      buffer.unshift(...toFlush);
      console.error("Failed to flush telemetry:", error);
    }
  }

  /**
   * Record an action event
   */
  function recordAction(
    name: string,
    attributes?: Record<string, unknown>
  ): void {
    addToBuffer({
      type: "action",
      name,
      attributes: {
        ...attributes,
        agentId: identity.instance_id,
        assetId: identity.asset_id,
      },
    });
  }

  /**
   * Record a decision event
   */
  function recordDecision(
    action: string,
    allowed: boolean,
    reason?: string
  ): void {
    addToBuffer({
      type: "decision",
      name: `decision:${action}`,
      attributes: {
        action,
        allowed,
        reason,
        agentId: identity.instance_id,
      },
    });
  }

  /**
   * Record an error event
   */
  function recordError(
    error: Error,
    context?: Record<string, unknown>
  ): void {
    addToBuffer({
      type: "error",
      name: error.name,
      attributes: {
        message: error.message,
        stack: error.stack,
        ...context,
        agentId: identity.instance_id,
      },
    });
  }

  /**
   * Record a metric
   */
  function recordMetric(
    name: string,
    value: number,
    attributes?: Record<string, unknown>
  ): void {
    addToBuffer({
      type: "metric",
      name,
      attributes: {
        value,
        ...attributes,
        agentId: identity.instance_id,
      },
    });
  }

  /**
   * Start a span for tracing
   */
  function startSpan(
    name: string,
    attributes?: Record<string, unknown>
  ): Span {
    const spanId = generateId();
    const previousSpanId = currentSpanId;

    // Create new trace if needed
    if (!currentTraceId) {
      currentTraceId = generateId(32);
    }

    currentSpanId = spanId;

    let spanAttributes: Record<string, unknown> = { ...attributes };
    let spanStatus: SpanStatusCode = "UNSET";
    let spanMessage: string | undefined;
    const events: Array<{ name: string; attributes?: Record<string, unknown>; timestamp: Date }> = [];

    const span: Span = {
      spanId,

      setAttributes(attrs: Record<string, unknown>): void {
        spanAttributes = { ...spanAttributes, ...attrs };
      },

      addEvent(eventName: string, eventAttrs?: Record<string, unknown>): void {
        events.push({
          name: eventName,
          attributes: eventAttrs,
          timestamp: new Date(),
        });
      },

      setStatus(code: SpanStatusCode, message?: string): void {
        spanStatus = code;
        spanMessage = message;
      },

      end(): void {
        // Record span as telemetry
        addToBuffer({
          type: "action",
          name: `span:${name}`,
          traceId: currentTraceId || undefined,
          spanId,
          attributes: {
            ...spanAttributes,
            status: spanStatus,
            statusMessage: spanMessage,
            events,
            agentId: identity.instance_id,
          },
        });

        // Restore previous span
        currentSpanId = previousSpanId;
      },
    };

    return span;
  }

  /**
   * Get current trace context
   */
  function getTraceContext(): TraceContext | null {
    if (!currentTraceId || !currentSpanId) {
      return null;
    }

    return {
      traceId: currentTraceId,
      spanId: currentSpanId,
      traceFlags: 1, // Sampled
    };
  }

  /**
   * Flush all pending telemetry
   */
  async function flush(): Promise<void> {
    await flushBuffer();
  }

  /**
   * Shutdown telemetry collection
   */
  async function shutdown(): Promise<void> {
    if (flushTimer) {
      clearInterval(flushTimer);
      flushTimer = null;
    }

    await flush();
  }

  return {
    recordAction,
    recordDecision,
    recordError,
    recordMetric,
    startSpan,
    getTraceContext,
    flush,
    shutdown,
  };
}

export type { TelemetryConfig, TelemetryData };
