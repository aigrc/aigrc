import type { RuntimeIdentity, RiskLevel, OperatingMode } from "@aigrc/core";
import {
  trace,
  context as otelContext,
  SpanStatusCode,
  type Tracer,
  type Span,
  type SpanContext,
  type Context,
} from "@opentelemetry/api";
import { BatchSpanProcessor, SimpleSpanProcessor } from "@opentelemetry/sdk-trace-base";
import { NodeTracerProvider } from "@opentelemetry/sdk-trace-node";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";

// ─────────────────────────────────────────────────────────────────
// TELEMETRY EMITTER (SPEC-RT-004)
// OpenTelemetry-based governance telemetry
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

// ─────────────────────────────────────────────────────────────────
// OPENTELEMETRY TELEMETRY EMITTER (SPEC-RT-004)
// Governance-specific OpenTelemetry integration
// ─────────────────────────────────────────────────────────────────

/** AIGOS OpenTelemetry semantic conventions */
export const AIGOS_CONVENTIONS = {
  // Core identity attributes
  INSTANCE_ID: "aigos.instance_id",
  ASSET_ID: "aigos.asset_id",
  RISK_LEVEL: "aigos.risk_level",
  MODE: "aigos.mode",
  PARENT_ID: "aigos.parent_id",
  DEPTH: "aigos.depth",
  GOLDEN_HASH: "aigos.golden_hash",

  // Decision attributes
  ACTION: "aigos.action",
  RESOURCE: "aigos.resource",
  DECISION: "aigos.decision",
  REASON: "aigos.reason",
  CHECK_CHAIN: "aigos.check_chain",
  LATENCY_MS: "aigos.latency_ms",

  // Violation attributes
  VIOLATION_TYPE: "aigos.violation.type",
  VIOLATION_SEVERITY: "aigos.violation.severity",
  VIOLATION_RULE: "aigos.violation.rule",

  // Budget attributes
  BUDGET_TYPE: "aigos.budget.type",
  BUDGET_LIMIT: "aigos.budget.limit",
  BUDGET_USED: "aigos.budget.used",
  BUDGET_REMAINING: "aigos.budget.remaining",

  // Kill switch attributes
  KILL_SWITCH_COMMAND: "aigos.kill_switch.command",
  KILL_SWITCH_SOURCE: "aigos.kill_switch.source",
  KILL_SWITCH_SCOPE: "aigos.kill_switch.scope",

  // Span names
  SPAN_IDENTITY: "aigos.governance.identity",
  SPAN_DECISION: "aigos.governance.decision",
  SPAN_VIOLATION: "aigos.governance.violation",
  SPAN_BUDGET: "aigos.governance.budget",
  SPAN_TERMINATE: "aigos.governance.terminate",
  SPAN_SPAWN: "aigos.governance.spawn",
} as const;

/** Identity event for emitIdentity */
export interface IdentityEvent {
  /** Instance ID (UUIDv4) */
  instanceId: string;
  /** Asset ID from governance manifest */
  assetId: string;
  /** Risk classification level */
  riskLevel: RiskLevel;
  /** Operating mode */
  mode: OperatingMode;
  /** Parent instance ID (if spawned) */
  parentId?: string;
  /** Spawn depth */
  depth: number;
  /** Golden Thread hash */
  goldenHash?: string;
  /** Capabilities summary */
  capabilities?: {
    tools: string[];
    domains: string[];
    budgets?: Record<string, number>;
  };
}

/** Decision event for emitDecision */
export interface DecisionEvent {
  /** Instance ID */
  instanceId: string;
  /** Action being evaluated */
  action: string;
  /** Resource being accessed */
  resource: string;
  /** Decision result */
  decision: "ALLOW" | "DENY" | "AUDIT";
  /** Reason for decision */
  reason: string;
  /** Check chain that was evaluated */
  checkChain: string[];
  /** Latency in milliseconds */
  latencyMs: number;
  /** Policy rule that matched */
  matchedRule?: string;
  /** Additional context */
  context?: Record<string, unknown>;
}

/** Violation event for emitViolation */
export interface ViolationEvent {
  /** Instance ID */
  instanceId: string;
  /** Violation type */
  type: "POLICY_VIOLATION" | "BUDGET_EXCEEDED" | "CAPABILITY_ESCALATION" | "KILL_SWITCH" | "UNAUTHORIZED_ACCESS";
  /** Severity level */
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  /** Action that caused violation */
  action: string;
  /** Resource involved */
  resource?: string;
  /** Rule that was violated */
  rule?: string;
  /** Violation details */
  details: string;
  /** Timestamp */
  timestamp: string;
}

/** Budget event for emitBudget */
export interface BudgetEvent {
  /** Instance ID */
  instanceId: string;
  /** Budget type (session, daily, monthly, tokens, cost) */
  budgetType: string;
  /** Budget limit */
  limit: number;
  /** Amount used */
  used: number;
  /** Remaining amount */
  remaining: number;
  /** Percentage used */
  percentUsed: number;
  /** Whether threshold warning triggered */
  thresholdWarning?: boolean;
  /** Threshold percentage that triggered */
  thresholdPercent?: number;
}

/** Terminate event for emitTerminate */
export interface TerminateEvent {
  /** Instance ID */
  instanceId: string;
  /** Termination reason */
  reason: "KILL_SWITCH" | "BUDGET_EXHAUSTED" | "ERROR" | "GRACEFUL" | "PARENT_TERMINATED";
  /** Source of termination */
  source: "REMOTE" | "LOCAL" | "PARENT" | "SELF";
  /** Kill switch command (if applicable) */
  command?: "TERMINATE" | "PAUSE" | "RESUME";
  /** Scope of termination */
  scope?: "SINGLE" | "CASCADE" | "GLOBAL";
  /** Child instances terminated */
  childrenTerminated?: string[];
  /** Final state */
  finalState?: Record<string, unknown>;
}

/** Spawn event for emitSpawn */
export interface SpawnEvent {
  /** Parent instance ID */
  parentId: string;
  /** Child instance ID */
  childId: string;
  /** Child asset ID */
  childAssetId: string;
  /** Child risk level */
  childRiskLevel: RiskLevel;
  /** Spawn depth */
  depth: number;
  /** Capability decay mode used */
  decayMode: "decay" | "explicit" | "inherit";
  /** Capabilities granted to child */
  capabilities?: {
    tools: string[];
    domains: string[];
    budgets?: Record<string, number>;
  };
}

/** ITelemetryEmitter interface per SPEC-RT-004 */
export interface ITelemetryEmitter {
  /** Emit identity creation/verification event */
  emitIdentity(event: IdentityEvent): void;
  /** Emit policy decision event */
  emitDecision(event: DecisionEvent): void;
  /** Emit policy violation event */
  emitViolation(event: ViolationEvent): void;
  /** Emit budget status event */
  emitBudget(event: BudgetEvent): void;
  /** Emit termination event */
  emitTerminate(event: TerminateEvent): void;
  /** Emit spawn event */
  emitSpawn(event: SpawnEvent): void;
  /** Flush pending telemetry */
  flush(): Promise<void>;
  /** Shutdown the emitter */
  shutdown(): Promise<void>;
  /** Get current OTel context for propagation */
  getContext(): Context;
}

/** Telemetry emitter configuration */
export interface TelemetryEmitterConfig {
  /** Service name for OTel */
  serviceName?: string;
  /** OTLP endpoint URL */
  endpoint?: string;
  /** Whether to use batch processor (recommended for production) */
  useBatchProcessor?: boolean;
  /** Batch export interval in ms (default: 5000) */
  batchIntervalMs?: number;
  /** Max batch size (default: 512) */
  maxBatchSize?: number;
  /** Sample rate 0-1 (default: 1.0) */
  sampleRate?: number;
  /** Custom event handler for testing/debugging */
  onEvent?: (spanName: string, attributes: Record<string, unknown>) => void;
}

/**
 * Creates an OpenTelemetry-based telemetry emitter per SPEC-RT-004.
 * All emit* methods are non-blocking (< 0.1ms target).
 *
 * @example
 * ```typescript
 * const emitter = createTelemetryEmitter({
 *   serviceName: "my-agent",
 *   endpoint: "http://localhost:4318/v1/traces",
 * });
 *
 * emitter.emitIdentity({
 *   instanceId: "abc-123",
 *   assetId: "agent-001",
 *   riskLevel: "limited",
 *   mode: "NORMAL",
 *   depth: 0,
 * });
 * ```
 */
export function createTelemetryEmitter(config: TelemetryEmitterConfig = {}): ITelemetryEmitter {
  const {
    serviceName = "aigos-agent",
    endpoint,
    useBatchProcessor = true,
    batchIntervalMs = 5000,
    maxBatchSize = 512,
    sampleRate = 1.0,
    onEvent,
  } = config;

  // Create provider and tracer
  const provider = new NodeTracerProvider();

  // Configure exporter if endpoint provided
  if (endpoint) {
    const exporter = new OTLPTraceExporter({ url: endpoint });
    const processor = useBatchProcessor
      ? new BatchSpanProcessor(exporter, {
          scheduledDelayMillis: batchIntervalMs,
          maxExportBatchSize: maxBatchSize,
        })
      : new SimpleSpanProcessor(exporter);
    provider.addSpanProcessor(processor);
  }

  provider.register();
  const tracer = trace.getTracer(serviceName, "1.0.0");

  // Current context for propagation
  let currentContext = otelContext.active();

  // Helper to check sampling
  function shouldSample(): boolean {
    return sampleRate >= 1.0 || Math.random() < sampleRate;
  }

  // Helper to create span with attributes (non-blocking)
  function createSpan(
    name: string,
    attributes: Record<string, string | number | boolean | string[]>
  ): Span {
    const span = tracer.startSpan(name, { attributes }, currentContext);
    onEvent?.(name, attributes);
    return span;
  }

  return {
    emitIdentity(event: IdentityEvent): void {
      if (!shouldSample()) return;

      const span = createSpan(AIGOS_CONVENTIONS.SPAN_IDENTITY, {
        [AIGOS_CONVENTIONS.INSTANCE_ID]: event.instanceId,
        [AIGOS_CONVENTIONS.ASSET_ID]: event.assetId,
        [AIGOS_CONVENTIONS.RISK_LEVEL]: event.riskLevel,
        [AIGOS_CONVENTIONS.MODE]: event.mode,
        [AIGOS_CONVENTIONS.DEPTH]: event.depth,
        ...(event.parentId && { [AIGOS_CONVENTIONS.PARENT_ID]: event.parentId }),
        ...(event.goldenHash && { [AIGOS_CONVENTIONS.GOLDEN_HASH]: event.goldenHash }),
        ...(event.capabilities && {
          "aigos.capabilities.tools": event.capabilities.tools,
          "aigos.capabilities.domains": event.capabilities.domains,
        }),
      });
      span.setStatus({ code: SpanStatusCode.OK });
      span.end();
    },

    emitDecision(event: DecisionEvent): void {
      if (!shouldSample()) return;

      const span = createSpan(AIGOS_CONVENTIONS.SPAN_DECISION, {
        [AIGOS_CONVENTIONS.INSTANCE_ID]: event.instanceId,
        [AIGOS_CONVENTIONS.ACTION]: event.action,
        [AIGOS_CONVENTIONS.RESOURCE]: event.resource,
        [AIGOS_CONVENTIONS.DECISION]: event.decision,
        [AIGOS_CONVENTIONS.REASON]: event.reason,
        [AIGOS_CONVENTIONS.CHECK_CHAIN]: event.checkChain,
        [AIGOS_CONVENTIONS.LATENCY_MS]: event.latencyMs,
        ...(event.matchedRule && { "aigos.matched_rule": event.matchedRule }),
      });

      // Set status based on decision
      if (event.decision === "DENY") {
        span.setStatus({ code: SpanStatusCode.ERROR, message: event.reason });
      } else {
        span.setStatus({ code: SpanStatusCode.OK });
      }
      span.end();
    },

    emitViolation(event: ViolationEvent): void {
      if (!shouldSample()) return;

      const span = createSpan(AIGOS_CONVENTIONS.SPAN_VIOLATION, {
        [AIGOS_CONVENTIONS.INSTANCE_ID]: event.instanceId,
        [AIGOS_CONVENTIONS.VIOLATION_TYPE]: event.type,
        [AIGOS_CONVENTIONS.VIOLATION_SEVERITY]: event.severity,
        [AIGOS_CONVENTIONS.ACTION]: event.action,
        ...(event.resource && { [AIGOS_CONVENTIONS.RESOURCE]: event.resource }),
        ...(event.rule && { [AIGOS_CONVENTIONS.VIOLATION_RULE]: event.rule }),
        "aigos.violation.details": event.details,
        "aigos.violation.timestamp": event.timestamp,
      });
      span.setStatus({ code: SpanStatusCode.ERROR, message: event.details });
      span.end();
    },

    emitBudget(event: BudgetEvent): void {
      if (!shouldSample()) return;

      const span = createSpan(AIGOS_CONVENTIONS.SPAN_BUDGET, {
        [AIGOS_CONVENTIONS.INSTANCE_ID]: event.instanceId,
        [AIGOS_CONVENTIONS.BUDGET_TYPE]: event.budgetType,
        [AIGOS_CONVENTIONS.BUDGET_LIMIT]: event.limit,
        [AIGOS_CONVENTIONS.BUDGET_USED]: event.used,
        [AIGOS_CONVENTIONS.BUDGET_REMAINING]: event.remaining,
        "aigos.budget.percent_used": event.percentUsed,
        ...(event.thresholdWarning && { "aigos.budget.threshold_warning": event.thresholdWarning }),
        ...(event.thresholdPercent && { "aigos.budget.threshold_percent": event.thresholdPercent }),
      });

      // Set warning status if near limit
      if (event.percentUsed >= 90) {
        span.setStatus({ code: SpanStatusCode.ERROR, message: "Budget near exhaustion" });
      } else if (event.percentUsed >= 75) {
        span.setStatus({ code: SpanStatusCode.OK, message: "Budget threshold warning" });
      } else {
        span.setStatus({ code: SpanStatusCode.OK });
      }
      span.end();
    },

    emitTerminate(event: TerminateEvent): void {
      // Always emit termination events (no sampling)
      const span = createSpan(AIGOS_CONVENTIONS.SPAN_TERMINATE, {
        [AIGOS_CONVENTIONS.INSTANCE_ID]: event.instanceId,
        "aigos.terminate.reason": event.reason,
        [AIGOS_CONVENTIONS.KILL_SWITCH_SOURCE]: event.source,
        ...(event.command && { [AIGOS_CONVENTIONS.KILL_SWITCH_COMMAND]: event.command }),
        ...(event.scope && { [AIGOS_CONVENTIONS.KILL_SWITCH_SCOPE]: event.scope }),
        ...(event.childrenTerminated && { "aigos.terminate.children": event.childrenTerminated }),
      });

      if (event.reason === "GRACEFUL") {
        span.setStatus({ code: SpanStatusCode.OK });
      } else {
        span.setStatus({ code: SpanStatusCode.ERROR, message: `Terminated: ${event.reason}` });
      }
      span.end();
    },

    emitSpawn(event: SpawnEvent): void {
      if (!shouldSample()) return;

      const span = createSpan(AIGOS_CONVENTIONS.SPAN_SPAWN, {
        [AIGOS_CONVENTIONS.PARENT_ID]: event.parentId,
        "aigos.child_id": event.childId,
        "aigos.child_asset_id": event.childAssetId,
        "aigos.child_risk_level": event.childRiskLevel,
        [AIGOS_CONVENTIONS.DEPTH]: event.depth,
        "aigos.decay_mode": event.decayMode,
        ...(event.capabilities && {
          "aigos.child.tools": event.capabilities.tools,
          "aigos.child.domains": event.capabilities.domains,
        }),
      });
      span.setStatus({ code: SpanStatusCode.OK });
      span.end();
    },

    async flush(): Promise<void> {
      await provider.forceFlush();
    },

    async shutdown(): Promise<void> {
      await provider.shutdown();
    },

    getContext(): Context {
      return currentContext;
    },
  };
}

/**
 * Creates a no-op telemetry emitter for testing or when telemetry is disabled.
 */
export function createNoopTelemetryEmitter(): ITelemetryEmitter {
  const noopContext = otelContext.active();
  return {
    emitIdentity: () => {},
    emitDecision: () => {},
    emitViolation: () => {},
    emitBudget: () => {},
    emitTerminate: () => {},
    emitSpawn: () => {},
    flush: async () => {},
    shutdown: async () => {},
    getContext: () => noopContext,
  };
}

/**
 * Creates a console-logging telemetry emitter for debugging.
 */
export function createConsoleTelemetryEmitter(): ITelemetryEmitter {
  return createTelemetryEmitter({
    onEvent: (spanName, attributes) => {
      console.log(`[OTel] ${spanName}:`, JSON.stringify(attributes, null, 2));
    },
  });
}
