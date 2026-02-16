/**
 * Telemetry Emitter (SPEC-RT-004)
 * OpenTelemetry integration for AIGOS governance observability
 */

import type { RuntimeIdentity } from "@aigrc/core";
import type { PolicyDecision } from "../policy/types.js";
import {
  AIGOS_ATTR,
  SPAN_NAMES,
  METRIC_NAMES,
} from "./semantic-conventions.js";

// ─────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────

/**
 * Telemetry configuration
 */
export interface TelemetryConfig {
  /** Enable telemetry */
  enabled: boolean;
  /** Service name for resource */
  serviceName: string;
  /** Service version */
  serviceVersion?: string;
  /** OTLP endpoint (HTTP) */
  otlpEndpoint?: string;
  /** OTLP headers (e.g., auth) */
  otlpHeaders?: Record<string, string>;
  /** Additional resource attributes */
  resourceAttributes?: Record<string, string>;
  /** Sampling rate for decisions (0-1) */
  decisionSamplingRate: number;
  /** Sampling rate for budget events (0-1) */
  budgetSamplingRate: number;
  /** Console logging (for debugging) */
  consoleLogging: boolean;
}

/** Decision result type */
export type DecisionResult = "ALLOWED" | "DENIED" | "WOULD_DENY";

/** Violation severity */
export type ViolationSeverity = "warning" | "error" | "critical";

/** Termination source */
export type TerminationSource =
  | "kill_switch"
  | "budget_exceeded"
  | "policy_violation"
  | "graceful"
  | "error";

/** OpenTelemetry Span interface (minimal for type safety without hard dep) */
interface OTelSpan {
  setAttribute(key: string, value: string | number | boolean): void;
  setAttributes(attrs: Record<string, string | number | boolean>): void;
  recordException(error: Error): void;
  setStatus(status: { code: number; message?: string }): void;
  end(): void;
}

/** OpenTelemetry Tracer interface */
interface OTelTracer {
  startSpan(name: string, options?: { attributes?: Record<string, string | number | boolean> }): OTelSpan;
}

/** OpenTelemetry Counter interface */
interface OTelCounter {
  add(value: number, attributes?: Record<string, string | number | boolean>): void;
}

/** OpenTelemetry Histogram interface */
interface OTelHistogram {
  record(value: number, attributes?: Record<string, string | number | boolean>): void;
}

/** OpenTelemetry Gauge interface */
interface OTelGauge {
  record(value: number, attributes?: Record<string, string | number | boolean>): void;
}

// ─────────────────────────────────────────────────────────────────
// DEFAULT CONFIG
// ─────────────────────────────────────────────────────────────────

const DEFAULT_CONFIG: TelemetryConfig = {
  enabled: true,
  serviceName: "aigos-runtime",
  decisionSamplingRate: 0.1, // 10% sampling for decisions
  budgetSamplingRate: 0.1, // 10% sampling for budget
  consoleLogging: false,
};

// ─────────────────────────────────────────────────────────────────
// TELEMETRY EMITTER CLASS
// ─────────────────────────────────────────────────────────────────

/**
 * Telemetry Emitter - OpenTelemetry integration for AIGOS
 */
export class TelemetryEmitter {
  private config: TelemetryConfig;
  private tracer: OTelTracer | null = null;
  private counters: Map<string, OTelCounter> = new Map();
  private histograms: Map<string, OTelHistogram> = new Map();
  private gauges: Map<string, OTelGauge> = new Map();
  private initialized = false;

  constructor(config: Partial<TelemetryConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Initialize OpenTelemetry SDK
   * AIGOS-601
   */
  async initialize(): Promise<void> {
    if (!this.config.enabled || this.initialized) {
      return;
    }

    try {
      // Dynamic import of OpenTelemetry to avoid hard dependency
      const otelApi = await import("@opentelemetry/api");

      // Get or create tracer
      this.tracer = otelApi.trace.getTracer(
        this.config.serviceName,
        this.config.serviceVersion
      ) as unknown as OTelTracer;

      // Get meter for metrics
      const meter = otelApi.metrics.getMeter(
        this.config.serviceName,
        this.config.serviceVersion
      );

      // Create counters (AIGOS-610)
      this.counters.set(
        METRIC_NAMES.DECISIONS_TOTAL,
        meter.createCounter(METRIC_NAMES.DECISIONS_TOTAL, {
          description: "Total number of policy decisions",
        }) as unknown as OTelCounter
      );
      this.counters.set(
        METRIC_NAMES.VIOLATIONS_TOTAL,
        meter.createCounter(METRIC_NAMES.VIOLATIONS_TOTAL, {
          description: "Total number of policy violations",
        }) as unknown as OTelCounter
      );
      this.counters.set(
        METRIC_NAMES.SPAWNS_TOTAL,
        meter.createCounter(METRIC_NAMES.SPAWNS_TOTAL, {
          description: "Total number of agent spawns",
        }) as unknown as OTelCounter
      );
      this.counters.set(
        METRIC_NAMES.TERMINATIONS_TOTAL,
        meter.createCounter(METRIC_NAMES.TERMINATIONS_TOTAL, {
          description: "Total number of agent terminations",
        }) as unknown as OTelCounter
      );

      // Create histogram for decision duration
      this.histograms.set(
        METRIC_NAMES.DECISION_DURATION,
        meter.createHistogram(METRIC_NAMES.DECISION_DURATION, {
          description: "Decision evaluation duration in milliseconds",
          unit: "ms",
        }) as unknown as OTelHistogram
      );

      // Create gauges
      this.gauges.set(
        METRIC_NAMES.BUDGET_SESSION_USED,
        meter.createObservableGauge(METRIC_NAMES.BUDGET_SESSION_USED, {
          description: "Session budget used",
        }) as unknown as OTelGauge
      );
      this.gauges.set(
        METRIC_NAMES.BUDGET_DAILY_USED,
        meter.createObservableGauge(METRIC_NAMES.BUDGET_DAILY_USED, {
          description: "Daily budget used",
        }) as unknown as OTelGauge
      );

      this.initialized = true;
    } catch {
      // OpenTelemetry not available, use no-op mode
      if (this.config.consoleLogging) {
        console.log("[TELEMETRY] OpenTelemetry SDK not available, using no-op mode");
      }
    }
  }

  /**
   * Check if telemetry should be emitted
   * AIGOS-609: No-Op Telemetry
   */
  private shouldEmit(): boolean {
    return this.config.enabled;
  }

  /**
   * Emit identity span
   * AIGOS-603
   */
  emitIdentity(identity: RuntimeIdentity): void {
    if (!this.shouldEmit()) return;

    const attributes = this.buildIdentityAttributes(identity);

    if (this.tracer) {
      const span = this.tracer.startSpan(SPAN_NAMES.IDENTITY, { attributes });
      span.end();
    }

    if (this.config.consoleLogging) {
      console.log(`[TELEMETRY] ${SPAN_NAMES.IDENTITY}`, {
        instance_id: identity.instance_id,
        asset_id: identity.asset_id,
        verified: identity.verified,
        mode: identity.mode,
      });
    }
  }

  /**
   * Emit decision span
   * AIGOS-604
   */
  emitDecision(
    identity: RuntimeIdentity,
    action: string,
    resource: string | undefined,
    decision: PolicyDecision
  ): void {
    if (!this.shouldEmit()) return;

    // Apply sampling for decisions
    if (Math.random() > this.config.decisionSamplingRate) return;

    const result: DecisionResult = decision.dry_run && decision.would_deny
      ? "WOULD_DENY"
      : decision.allowed
        ? "ALLOWED"
        : "DENIED";

    const attributes: Record<string, string | number | boolean> = {
      ...this.buildIdentityAttributes(identity),
      [AIGOS_ATTR.DECISION_RESULT]: result,
      [AIGOS_ATTR.DECISION_ACTION]: action,
      [AIGOS_ATTR.DECISION_DURATION_MS]: decision.duration_ms,
    };

    if (resource) {
      attributes[AIGOS_ATTR.DECISION_RESOURCE] = resource;
    }
    if (decision.reason) {
      attributes[AIGOS_ATTR.DECISION_REASON] = decision.reason;
    }
    if (decision.code) {
      attributes[AIGOS_ATTR.DECISION_CODE] = decision.code;
    }
    if (decision.denied_by) {
      attributes[AIGOS_ATTR.DECISION_DENIED_BY] = decision.denied_by;
    }
    if (decision.dry_run) {
      attributes[AIGOS_ATTR.DECISION_DRY_RUN] = true;
    }

    if (this.tracer) {
      const span = this.tracer.startSpan(SPAN_NAMES.DECISION, { attributes });
      span.end();
    }

    // Update metrics
    this.counters.get(METRIC_NAMES.DECISIONS_TOTAL)?.add(1, {
      result,
      action,
    });
    this.histograms.get(METRIC_NAMES.DECISION_DURATION)?.record(decision.duration_ms);

    if (this.config.consoleLogging) {
      console.log(`[TELEMETRY] ${SPAN_NAMES.DECISION}`, {
        result,
        action,
        resource,
        duration_ms: decision.duration_ms,
      });
    }
  }

  /**
   * Emit violation span
   * AIGOS-605
   */
  emitViolation(
    identity: RuntimeIdentity,
    code: string,
    severity: ViolationSeverity,
    action: string,
    resource: string | undefined,
    message: string
  ): void {
    if (!this.shouldEmit()) return;

    // 100% sampling for violations
    const attributes: Record<string, string | number | boolean> = {
      ...this.buildIdentityAttributes(identity),
      [AIGOS_ATTR.VIOLATION_CODE]: code,
      [AIGOS_ATTR.VIOLATION_SEVERITY]: severity,
      [AIGOS_ATTR.VIOLATION_MESSAGE]: message,
      [AIGOS_ATTR.DECISION_ACTION]: action,
    };

    if (resource) {
      attributes[AIGOS_ATTR.DECISION_RESOURCE] = resource;
    }

    if (this.tracer) {
      const span = this.tracer.startSpan(SPAN_NAMES.VIOLATION, { attributes });
      span.end();
    }

    // Update metrics
    this.counters.get(METRIC_NAMES.VIOLATIONS_TOTAL)?.add(1, {
      code,
      severity,
    });

    if (this.config.consoleLogging) {
      console.log(`[TELEMETRY] ${SPAN_NAMES.VIOLATION}`, {
        code,
        severity,
        action,
        resource,
        message,
      });
    }
  }

  /**
   * Emit budget span
   * AIGOS-606
   */
  emitBudget(
    identity: RuntimeIdentity,
    costIncurred: number,
    sessionTotal: number,
    dailyTotal: number,
    sessionRemaining?: number,
    dailyRemaining?: number
  ): void {
    if (!this.shouldEmit()) return;

    // Apply sampling for budget
    if (Math.random() > this.config.budgetSamplingRate) return;

    const attributes: Record<string, string | number | boolean> = {
      ...this.buildIdentityAttributes(identity),
      [AIGOS_ATTR.BUDGET_COST_INCURRED]: costIncurred,
      [AIGOS_ATTR.BUDGET_SESSION_TOTAL]: sessionTotal,
      [AIGOS_ATTR.BUDGET_DAILY_TOTAL]: dailyTotal,
    };

    if (sessionRemaining !== undefined) {
      attributes[AIGOS_ATTR.BUDGET_SESSION_REMAINING] = sessionRemaining;
    }
    if (dailyRemaining !== undefined) {
      attributes[AIGOS_ATTR.BUDGET_DAILY_REMAINING] = dailyRemaining;
    }

    if (this.tracer) {
      const span = this.tracer.startSpan(SPAN_NAMES.BUDGET, { attributes });
      span.end();
    }

    if (this.config.consoleLogging) {
      console.log(`[TELEMETRY] ${SPAN_NAMES.BUDGET}`, {
        cost_incurred: costIncurred,
        session_total: sessionTotal,
        daily_total: dailyTotal,
      });
    }
  }

  /**
   * Emit termination span
   * AIGOS-607
   */
  emitTerminate(
    identity: RuntimeIdentity,
    source: TerminationSource,
    sessionDurationSeconds: number,
    finalSessionCost: number,
    finalDailyCost: number
  ): void {
    if (!this.shouldEmit()) return;

    // 100% sampling for terminations
    const attributes: Record<string, string | number | boolean> = {
      ...this.buildIdentityAttributes(identity),
      [AIGOS_ATTR.TERMINATE_SOURCE]: source,
      [AIGOS_ATTR.TERMINATE_SESSION_DURATION_S]: sessionDurationSeconds,
      [AIGOS_ATTR.TERMINATE_FINAL_SESSION_COST]: finalSessionCost,
      [AIGOS_ATTR.TERMINATE_FINAL_DAILY_COST]: finalDailyCost,
    };

    if (this.tracer) {
      const span = this.tracer.startSpan(SPAN_NAMES.TERMINATE, { attributes });
      span.end();
    }

    // Update metrics
    this.counters.get(METRIC_NAMES.TERMINATIONS_TOTAL)?.add(1, { source });

    if (this.config.consoleLogging) {
      console.log(`[TELEMETRY] ${SPAN_NAMES.TERMINATE}`, {
        source,
        session_duration_s: sessionDurationSeconds,
        final_session_cost: finalSessionCost,
      });
    }
  }

  /**
   * Emit spawn span
   * AIGOS-608
   */
  emitSpawn(
    parentIdentity: RuntimeIdentity,
    childIdentity: RuntimeIdentity,
    capabilityMode: "decay" | "explicit" | "inherit"
  ): void {
    if (!this.shouldEmit()) return;

    // 100% sampling for spawns
    const attributes: Record<string, string | number | boolean> = {
      ...this.buildIdentityAttributes(parentIdentity),
      [AIGOS_ATTR.SPAWN_CHILD_INSTANCE_ID]: childIdentity.instance_id,
      [AIGOS_ATTR.SPAWN_CHILD_ASSET_ID]: childIdentity.asset_id,
      [AIGOS_ATTR.SPAWN_CAPABILITY_MODE]: capabilityMode,
      [AIGOS_ATTR.GENERATION_DEPTH]: childIdentity.lineage.generation_depth,
    };

    if (this.tracer) {
      const span = this.tracer.startSpan(SPAN_NAMES.SPAWN, { attributes });
      span.end();
    }

    // Update metrics
    this.counters.get(METRIC_NAMES.SPAWNS_TOTAL)?.add(1, {
      capability_mode: capabilityMode,
    });

    if (this.config.consoleLogging) {
      console.log(`[TELEMETRY] ${SPAN_NAMES.SPAWN}`, {
        parent_id: parentIdentity.instance_id,
        child_id: childIdentity.instance_id,
        capability_mode: capabilityMode,
        depth: childIdentity.lineage.generation_depth,
      });
    }
  }

  /**
   * Emit kill switch span
   */
  emitKillSwitch(
    identity: RuntimeIdentity,
    command: "TERMINATE" | "PAUSE" | "RESUME",
    commandId: string,
    issuer?: string
  ): void {
    if (!this.shouldEmit()) return;

    // 100% sampling for kill switch
    const attributes: Record<string, string | number | boolean> = {
      ...this.buildIdentityAttributes(identity),
      [AIGOS_ATTR.KILL_SWITCH_COMMAND]: command,
      [AIGOS_ATTR.KILL_SWITCH_COMMAND_ID]: commandId,
      [AIGOS_ATTR.KILL_SWITCH_TIMESTAMP]: new Date().toISOString(),
    };

    if (issuer) {
      attributes[AIGOS_ATTR.KILL_SWITCH_ISSUER] = issuer;
    }

    if (this.tracer) {
      const span = this.tracer.startSpan(SPAN_NAMES.KILL_SWITCH, { attributes });
      span.end();
    }

    if (this.config.consoleLogging) {
      console.log(`[TELEMETRY] ${SPAN_NAMES.KILL_SWITCH}`, {
        command,
        command_id: commandId,
        issuer,
      });
    }
  }

  /**
   * Build common identity attributes
   */
  private buildIdentityAttributes(
    identity: RuntimeIdentity
  ): Record<string, string | number | boolean> {
    return {
      [AIGOS_ATTR.INSTANCE_ID]: identity.instance_id,
      [AIGOS_ATTR.ASSET_ID]: identity.asset_id,
      [AIGOS_ATTR.ASSET_NAME]: identity.asset_name,
      [AIGOS_ATTR.ASSET_VERSION]: identity.asset_version,
      [AIGOS_ATTR.RISK_LEVEL]: identity.risk_level,
      [AIGOS_ATTR.IDENTITY_VERIFIED]: identity.verified,
      [AIGOS_ATTR.MODE]: identity.mode,
      [AIGOS_ATTR.GOLDEN_THREAD_HASH]: identity.golden_thread_hash,
      [AIGOS_ATTR.TICKET_ID]: identity.golden_thread.ticket_id,
      [AIGOS_ATTR.PARENT_INSTANCE_ID]: identity.lineage.parent_instance_id ?? "root",
      [AIGOS_ATTR.ROOT_INSTANCE_ID]: identity.lineage.root_instance_id,
      [AIGOS_ATTR.GENERATION_DEPTH]: identity.lineage.generation_depth,
    };
  }

  /**
   * Flush telemetry buffers (blocking)
   */
  async flush(): Promise<void> {
    if (!this.initialized) return;

    try {
      const otelApi = await import("@opentelemetry/api");
      const provider = otelApi.trace.getTracerProvider();
      if ("forceFlush" in provider) {
        await (provider as { forceFlush(): Promise<void> }).forceFlush();
      }
    } catch {
      // Ignore flush errors
    }
  }

  /**
   * Shutdown telemetry
   */
  async shutdown(): Promise<void> {
    await this.flush();
    this.initialized = false;
  }

  /**
   * Check if telemetry is enabled
   */
  isEnabled(): boolean {
    return this.config.enabled;
  }
}

// ─────────────────────────────────────────────────────────────────
// FACTORY FUNCTION
// ─────────────────────────────────────────────────────────────────

/**
 * Create a Telemetry Emitter instance
 */
export function createTelemetryEmitter(
  config?: Partial<TelemetryConfig>
): TelemetryEmitter {
  return new TelemetryEmitter(config);
}
