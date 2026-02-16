/**
 * AIGOS Semantic Conventions (SPEC-PRT-002)
 * OpenTelemetry attribute names for AIGOS governance telemetry
 * AIGOS-602
 */

// ─────────────────────────────────────────────────────────────────
// IDENTITY ATTRIBUTES
// ─────────────────────────────────────────────────────────────────

/** Agent instance UUID */
export const AIGOS_INSTANCE_ID = "aigos.instance_id";

/** Asset ID from Asset Card */
export const AIGOS_ASSET_ID = "aigos.asset_id";

/** Human-readable asset name */
export const AIGOS_ASSET_NAME = "aigos.asset_name";

/** Asset version */
export const AIGOS_ASSET_VERSION = "aigos.asset_version";

/** Risk level: minimal, limited, high, unacceptable */
export const AIGOS_RISK_LEVEL = "aigos.risk_level";

/** Whether Golden Thread verified */
export const AIGOS_IDENTITY_VERIFIED = "aigos.identity.verified";

/** Operating mode: NORMAL, SANDBOX, RESTRICTED */
export const AIGOS_MODE = "aigos.mode";

/** Golden Thread hash */
export const AIGOS_GOLDEN_THREAD_HASH = "aigos.golden_thread.hash";

/** Ticket ID from Golden Thread */
export const AIGOS_TICKET_ID = "aigos.golden_thread.ticket_id";

/** Approver from Golden Thread */
export const AIGOS_APPROVED_BY = "aigos.golden_thread.approved_by";

// ─────────────────────────────────────────────────────────────────
// LINEAGE ATTRIBUTES
// ─────────────────────────────────────────────────────────────────

/** Parent instance ID (null for root) */
export const AIGOS_PARENT_INSTANCE_ID = "aigos.lineage.parent_instance_id";

/** Root instance ID of the chain */
export const AIGOS_ROOT_INSTANCE_ID = "aigos.lineage.root_instance_id";

/** Generation depth (0 for root) */
export const AIGOS_GENERATION_DEPTH = "aigos.lineage.generation_depth";

/** Maximum allowed spawn depth */
export const AIGOS_MAX_CHILD_DEPTH = "aigos.lineage.max_child_depth";

// ─────────────────────────────────────────────────────────────────
// DECISION ATTRIBUTES
// ─────────────────────────────────────────────────────────────────

/** Decision result: ALLOWED, DENIED, WOULD_DENY */
export const AIGOS_DECISION_RESULT = "aigos.decision.result";

/** Action being evaluated */
export const AIGOS_DECISION_ACTION = "aigos.decision.action";

/** Resource being accessed */
export const AIGOS_DECISION_RESOURCE = "aigos.decision.resource";

/** Denial reason (if denied) */
export const AIGOS_DECISION_REASON = "aigos.decision.reason";

/** Denial code (machine-readable) */
export const AIGOS_DECISION_CODE = "aigos.decision.code";

/** Which check denied: KILL_SWITCH, CAPABILITY, RESOURCE, BUDGET, CUSTOM */
export const AIGOS_DECISION_DENIED_BY = "aigos.decision.denied_by";

/** Decision duration in milliseconds */
export const AIGOS_DECISION_DURATION_MS = "aigos.decision.duration_ms";

/** Whether this was a dry-run decision */
export const AIGOS_DECISION_DRY_RUN = "aigos.decision.dry_run";

// ─────────────────────────────────────────────────────────────────
// VIOLATION ATTRIBUTES
// ─────────────────────────────────────────────────────────────────

/** Violation code */
export const AIGOS_VIOLATION_CODE = "aigos.violation.code";

/** Violation severity: warning, error, critical */
export const AIGOS_VIOLATION_SEVERITY = "aigos.violation.severity";

/** Violation message */
export const AIGOS_VIOLATION_MESSAGE = "aigos.violation.message";

// ─────────────────────────────────────────────────────────────────
// BUDGET ATTRIBUTES
// ─────────────────────────────────────────────────────────────────

/** Cost incurred by this action */
export const AIGOS_BUDGET_COST_INCURRED = "aigos.budget.cost_incurred";

/** Total session cost so far */
export const AIGOS_BUDGET_SESSION_TOTAL = "aigos.budget.session_total";

/** Total daily cost so far */
export const AIGOS_BUDGET_DAILY_TOTAL = "aigos.budget.daily_total";

/** Remaining session budget */
export const AIGOS_BUDGET_SESSION_REMAINING = "aigos.budget.session_remaining";

/** Remaining daily budget */
export const AIGOS_BUDGET_DAILY_REMAINING = "aigos.budget.daily_remaining";

/** Budget limit type: session, daily, monthly */
export const AIGOS_BUDGET_LIMIT_TYPE = "aigos.budget.limit_type";

// ─────────────────────────────────────────────────────────────────
// TERMINATION ATTRIBUTES
// ─────────────────────────────────────────────────────────────────

/** Termination source: kill_switch, budget_exceeded, policy_violation, graceful, error */
export const AIGOS_TERMINATE_SOURCE = "aigos.terminate.source";

/** Session duration in seconds */
export const AIGOS_TERMINATE_SESSION_DURATION_S = "aigos.terminate.session_duration_s";

/** Final session cost */
export const AIGOS_TERMINATE_FINAL_SESSION_COST = "aigos.terminate.final_session_cost";

/** Final daily cost */
export const AIGOS_TERMINATE_FINAL_DAILY_COST = "aigos.terminate.final_daily_cost";

// ─────────────────────────────────────────────────────────────────
// SPAWN ATTRIBUTES
// ─────────────────────────────────────────────────────────────────

/** Child instance ID */
export const AIGOS_SPAWN_CHILD_INSTANCE_ID = "aigos.spawn.child_instance_id";

/** Child asset ID */
export const AIGOS_SPAWN_CHILD_ASSET_ID = "aigos.spawn.child_asset_id";

/** Capability mode: decay, explicit, inherit */
export const AIGOS_SPAWN_CAPABILITY_MODE = "aigos.spawn.capability_mode";

// ─────────────────────────────────────────────────────────────────
// KILL SWITCH ATTRIBUTES
// ─────────────────────────────────────────────────────────────────

/** Kill switch command type: TERMINATE, PAUSE, RESUME */
export const AIGOS_KILL_SWITCH_COMMAND = "aigos.kill_switch.command";

/** Kill switch command ID */
export const AIGOS_KILL_SWITCH_COMMAND_ID = "aigos.kill_switch.command_id";

/** Kill switch command timestamp */
export const AIGOS_KILL_SWITCH_TIMESTAMP = "aigos.kill_switch.timestamp";

/** Kill switch command issuer */
export const AIGOS_KILL_SWITCH_ISSUER = "aigos.kill_switch.issuer";

// ─────────────────────────────────────────────────────────────────
// SPAN NAMES
// ─────────────────────────────────────────────────────────────────

export const SPAN_NAME_IDENTITY = "aigos.governance.identity";
export const SPAN_NAME_DECISION = "aigos.governance.decision";
export const SPAN_NAME_VIOLATION = "aigos.governance.violation";
export const SPAN_NAME_BUDGET = "aigos.governance.budget";
export const SPAN_NAME_TERMINATE = "aigos.governance.terminate";
export const SPAN_NAME_SPAWN = "aigos.governance.spawn";
export const SPAN_NAME_KILL_SWITCH = "aigos.governance.kill_switch";

// ─────────────────────────────────────────────────────────────────
// METRIC NAMES
// ─────────────────────────────────────────────────────────────────

export const METRIC_DECISIONS_TOTAL = "aigos.decisions.total";
export const METRIC_VIOLATIONS_TOTAL = "aigos.violations.total";
export const METRIC_SPAWNS_TOTAL = "aigos.spawns.total";
export const METRIC_TERMINATIONS_TOTAL = "aigos.terminations.total";
export const METRIC_BUDGET_SESSION_USED = "aigos.budget.session_used";
export const METRIC_BUDGET_DAILY_USED = "aigos.budget.daily_used";
export const METRIC_AGENTS_ACTIVE = "aigos.agents.active";
export const METRIC_DECISION_DURATION = "aigos.decision.duration";

// ─────────────────────────────────────────────────────────────────
// ATTRIBUTE COLLECTIONS (for convenience)
// ─────────────────────────────────────────────────────────────────

export const AIGOS_ATTR = {
  // Identity
  INSTANCE_ID: AIGOS_INSTANCE_ID,
  ASSET_ID: AIGOS_ASSET_ID,
  ASSET_NAME: AIGOS_ASSET_NAME,
  ASSET_VERSION: AIGOS_ASSET_VERSION,
  RISK_LEVEL: AIGOS_RISK_LEVEL,
  IDENTITY_VERIFIED: AIGOS_IDENTITY_VERIFIED,
  MODE: AIGOS_MODE,
  GOLDEN_THREAD_HASH: AIGOS_GOLDEN_THREAD_HASH,
  TICKET_ID: AIGOS_TICKET_ID,
  APPROVED_BY: AIGOS_APPROVED_BY,

  // Lineage
  PARENT_INSTANCE_ID: AIGOS_PARENT_INSTANCE_ID,
  ROOT_INSTANCE_ID: AIGOS_ROOT_INSTANCE_ID,
  GENERATION_DEPTH: AIGOS_GENERATION_DEPTH,
  MAX_CHILD_DEPTH: AIGOS_MAX_CHILD_DEPTH,

  // Decision
  DECISION_RESULT: AIGOS_DECISION_RESULT,
  DECISION_ACTION: AIGOS_DECISION_ACTION,
  DECISION_RESOURCE: AIGOS_DECISION_RESOURCE,
  DECISION_REASON: AIGOS_DECISION_REASON,
  DECISION_CODE: AIGOS_DECISION_CODE,
  DECISION_DENIED_BY: AIGOS_DECISION_DENIED_BY,
  DECISION_DURATION_MS: AIGOS_DECISION_DURATION_MS,
  DECISION_DRY_RUN: AIGOS_DECISION_DRY_RUN,

  // Violation
  VIOLATION_CODE: AIGOS_VIOLATION_CODE,
  VIOLATION_SEVERITY: AIGOS_VIOLATION_SEVERITY,
  VIOLATION_MESSAGE: AIGOS_VIOLATION_MESSAGE,

  // Budget
  BUDGET_COST_INCURRED: AIGOS_BUDGET_COST_INCURRED,
  BUDGET_SESSION_TOTAL: AIGOS_BUDGET_SESSION_TOTAL,
  BUDGET_DAILY_TOTAL: AIGOS_BUDGET_DAILY_TOTAL,
  BUDGET_SESSION_REMAINING: AIGOS_BUDGET_SESSION_REMAINING,
  BUDGET_DAILY_REMAINING: AIGOS_BUDGET_DAILY_REMAINING,
  BUDGET_LIMIT_TYPE: AIGOS_BUDGET_LIMIT_TYPE,

  // Termination
  TERMINATE_SOURCE: AIGOS_TERMINATE_SOURCE,
  TERMINATE_SESSION_DURATION_S: AIGOS_TERMINATE_SESSION_DURATION_S,
  TERMINATE_FINAL_SESSION_COST: AIGOS_TERMINATE_FINAL_SESSION_COST,
  TERMINATE_FINAL_DAILY_COST: AIGOS_TERMINATE_FINAL_DAILY_COST,

  // Spawn
  SPAWN_CHILD_INSTANCE_ID: AIGOS_SPAWN_CHILD_INSTANCE_ID,
  SPAWN_CHILD_ASSET_ID: AIGOS_SPAWN_CHILD_ASSET_ID,
  SPAWN_CAPABILITY_MODE: AIGOS_SPAWN_CAPABILITY_MODE,

  // Kill Switch
  KILL_SWITCH_COMMAND: AIGOS_KILL_SWITCH_COMMAND,
  KILL_SWITCH_COMMAND_ID: AIGOS_KILL_SWITCH_COMMAND_ID,
  KILL_SWITCH_TIMESTAMP: AIGOS_KILL_SWITCH_TIMESTAMP,
  KILL_SWITCH_ISSUER: AIGOS_KILL_SWITCH_ISSUER,
} as const;

export const SPAN_NAMES = {
  IDENTITY: SPAN_NAME_IDENTITY,
  DECISION: SPAN_NAME_DECISION,
  VIOLATION: SPAN_NAME_VIOLATION,
  BUDGET: SPAN_NAME_BUDGET,
  TERMINATE: SPAN_NAME_TERMINATE,
  SPAWN: SPAN_NAME_SPAWN,
  KILL_SWITCH: SPAN_NAME_KILL_SWITCH,
} as const;

export const METRIC_NAMES = {
  DECISIONS_TOTAL: METRIC_DECISIONS_TOTAL,
  VIOLATIONS_TOTAL: METRIC_VIOLATIONS_TOTAL,
  SPAWNS_TOTAL: METRIC_SPAWNS_TOTAL,
  TERMINATIONS_TOTAL: METRIC_TERMINATIONS_TOTAL,
  BUDGET_SESSION_USED: METRIC_BUDGET_SESSION_USED,
  BUDGET_DAILY_USED: METRIC_BUDGET_DAILY_USED,
  AGENTS_ACTIVE: METRIC_AGENTS_ACTIVE,
  DECISION_DURATION: METRIC_DECISION_DURATION,
} as const;
