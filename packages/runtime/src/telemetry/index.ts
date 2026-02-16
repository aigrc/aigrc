/**
 * Telemetry Module (SPEC-RT-004)
 * OpenTelemetry integration for AIGOS runtime governance
 *
 * AIGOS-E6: Full OpenTelemetry implementation
 *
 * Features:
 * - Semantic conventions for AIGOS spans and metrics (AIGOS-602)
 * - Identity, decision, violation, budget, spawn, termination spans
 * - Configurable sampling rates
 * - No-op mode when OTel SDK not available
 * - Console logging for debugging
 *
 * @example
 * ```typescript
 * import { createTelemetryEmitter, AIGOS_ATTR, SPAN_NAMES } from '@aigos/runtime';
 *
 * const telemetry = createTelemetryEmitter({
 *   enabled: true,
 *   serviceName: 'my-agent',
 *   otlpEndpoint: 'http://localhost:4317',
 * });
 *
 * await telemetry.initialize();
 *
 * // Emit identity span
 * telemetry.emitIdentity(identity);
 *
 * // Emit decision span with sampling
 * telemetry.emitDecision(identity, 'call_api', 'https://example.com', decision);
 * ```
 */

// ─────────────────────────────────────────────────────────────────
// SEMANTIC CONVENTIONS (AIGOS-602)
// ─────────────────────────────────────────────────────────────────

export {
  // Individual attribute constants
  AIGOS_INSTANCE_ID,
  AIGOS_ASSET_ID,
  AIGOS_ASSET_NAME,
  AIGOS_ASSET_VERSION,
  AIGOS_RISK_LEVEL,
  AIGOS_IDENTITY_VERIFIED,
  AIGOS_MODE,
  AIGOS_GOLDEN_THREAD_HASH,
  AIGOS_TICKET_ID,
  AIGOS_APPROVED_BY,
  AIGOS_PARENT_INSTANCE_ID,
  AIGOS_ROOT_INSTANCE_ID,
  AIGOS_GENERATION_DEPTH,
  AIGOS_MAX_CHILD_DEPTH,
  AIGOS_DECISION_RESULT,
  AIGOS_DECISION_ACTION,
  AIGOS_DECISION_RESOURCE,
  AIGOS_DECISION_REASON,
  AIGOS_DECISION_CODE,
  AIGOS_DECISION_DENIED_BY,
  AIGOS_DECISION_DURATION_MS,
  AIGOS_DECISION_DRY_RUN,
  AIGOS_VIOLATION_CODE,
  AIGOS_VIOLATION_SEVERITY,
  AIGOS_VIOLATION_MESSAGE,
  AIGOS_BUDGET_COST_INCURRED,
  AIGOS_BUDGET_SESSION_TOTAL,
  AIGOS_BUDGET_DAILY_TOTAL,
  AIGOS_BUDGET_SESSION_REMAINING,
  AIGOS_BUDGET_DAILY_REMAINING,
  AIGOS_BUDGET_LIMIT_TYPE,
  AIGOS_TERMINATE_SOURCE,
  AIGOS_TERMINATE_SESSION_DURATION_S,
  AIGOS_TERMINATE_FINAL_SESSION_COST,
  AIGOS_TERMINATE_FINAL_DAILY_COST,
  AIGOS_SPAWN_CHILD_INSTANCE_ID,
  AIGOS_SPAWN_CHILD_ASSET_ID,
  AIGOS_SPAWN_CAPABILITY_MODE,
  AIGOS_KILL_SWITCH_COMMAND,
  AIGOS_KILL_SWITCH_COMMAND_ID,
  AIGOS_KILL_SWITCH_TIMESTAMP,
  AIGOS_KILL_SWITCH_ISSUER,
  // Span names
  SPAN_NAME_IDENTITY,
  SPAN_NAME_DECISION,
  SPAN_NAME_VIOLATION,
  SPAN_NAME_BUDGET,
  SPAN_NAME_TERMINATE,
  SPAN_NAME_SPAWN,
  SPAN_NAME_KILL_SWITCH,
  // Metric names
  METRIC_DECISIONS_TOTAL,
  METRIC_VIOLATIONS_TOTAL,
  METRIC_SPAWNS_TOTAL,
  METRIC_TERMINATIONS_TOTAL,
  METRIC_BUDGET_SESSION_USED,
  METRIC_BUDGET_DAILY_USED,
  METRIC_AGENTS_ACTIVE,
  METRIC_DECISION_DURATION,
  // Collection objects for convenience
  AIGOS_ATTR,
  SPAN_NAMES,
  METRIC_NAMES,
} from "./semantic-conventions.js";

// ─────────────────────────────────────────────────────────────────
// TELEMETRY EMITTER (AIGOS-601, 603-610)
// ─────────────────────────────────────────────────────────────────

export {
  // Types
  type TelemetryConfig,
  type DecisionResult,
  type ViolationSeverity,
  type TerminationSource,
  // Classes
  TelemetryEmitter,
  // Factory functions
  createTelemetryEmitter,
} from "./telemetry-emitter.js";
