/**
 * Policy Engine Types (SPEC-RT-003)
 * Types for runtime policy evaluation - "The Bouncer"
 */

import type { RuntimeIdentity, RiskLevel, OperatingMode } from "@aigrc/core";

// ─────────────────────────────────────────────────────────────────
// DECISION TYPES
// ─────────────────────────────────────────────────────────────────

/**
 * Policy decision result
 * AIGOS-501: Core Policy Check Function
 */
export interface PolicyDecision {
  /** Whether the action is allowed */
  allowed: boolean;
  /** Human-readable reason */
  reason?: string;
  /** Machine-readable code */
  code?: string;
  /** When the check was performed */
  checked_at: string;
  /** How long the check took (ms) */
  duration_ms: number;
  /** Which check stage denied (if denied) */
  denied_by?: DenialStage;
  /** Whether this was a dry-run decision */
  dry_run?: boolean;
  /** What would have been denied in dry-run mode */
  would_deny?: boolean;
}

/**
 * Stages in the evaluation chain
 * AIGOS-502: Evaluation Chain
 */
export type DenialStage =
  | "KILL_SWITCH"       // O(1) - Check if agent is terminated/paused
  | "CAPABILITY"        // O(n) - Check allowed/denied tools
  | "RESOURCE_DENY"     // O(n) - Check denied domains/resources
  | "RESOURCE_ALLOW"    // O(n) - Check allowed domains/resources
  | "BUDGET"            // O(1) - Check cost limits
  | "SCHEDULE"          // O(1) - Check time-based rules
  | "CUSTOM";           // O(k) - Custom checks

/**
 * Denial reasons by code
 */
export const DENIAL_CODES = {
  TERMINATED: "Agent has been terminated via kill switch",
  PAUSED: "Agent has been paused via kill switch",
  CAPABILITY_DENIED: "Action not allowed by capabilities",
  RESOURCE_DENIED: "Resource access denied",
  RESOURCE_NOT_ALLOWED: "Resource not in allowed list",
  BUDGET_EXCEEDED: "Budget limit exceeded",
  RATE_LIMITED: "Rate limit exceeded",
  SCHEDULE_BLOCKED: "Action not allowed at this time",
  CUSTOM_DENIED: "Denied by custom check",
  MODE_RESTRICTED: "Action not allowed in current mode",
} as const;

// ─────────────────────────────────────────────────────────────────
// BUDGET TRACKING
// ─────────────────────────────────────────────────────────────────

/**
 * Budget state for an identity
 * AIGOS-506: Budget Check
 */
export interface BudgetState {
  /** Cost accumulated this session */
  session_cost: number;
  /** Cost accumulated today */
  daily_cost: number;
  /** Cost accumulated this month */
  monthly_cost: number;
  /** Session start time */
  session_start: string;
  /** Day start time (for daily reset) */
  day_start: string;
  /** Month start time (for monthly reset) */
  month_start: string;
  /** Number of API calls this minute (for rate limiting) */
  calls_this_minute: number;
  /** Start of current minute */
  minute_start: string;
}

/**
 * Budget limits from policy
 */
export interface BudgetLimits {
  max_cost_per_session?: number;
  max_cost_per_day?: number;
  max_cost_per_month?: number;
  max_calls_per_minute?: number;
}

// ─────────────────────────────────────────────────────────────────
// KILL SWITCH STATE
// ─────────────────────────────────────────────────────────────────

/**
 * Kill switch state
 * AIGOS-503: Kill Switch Check
 */
export interface KillSwitchState {
  /** Global kill switch engaged */
  global_kill: boolean;
  /** Terminated instance IDs */
  terminated_instances: Set<string>;
  /** Terminated asset IDs */
  terminated_assets: Set<string>;
  /** Paused instance IDs */
  paused_instances: Set<string>;
  /** Paused asset IDs */
  paused_assets: Set<string>;
}

// ─────────────────────────────────────────────────────────────────
// CUSTOM CHECKS
// ─────────────────────────────────────────────────────────────────

/**
 * Custom check function type
 * AIGOS-507: Custom Checks
 */
export type CustomCheck = (
  identity: RuntimeIdentity,
  action: string,
  resource?: string,
  context?: Record<string, unknown>
) => PolicyDecision | null;

/**
 * Custom check registration
 */
export interface RegisteredCustomCheck {
  name: string;
  check: CustomCheck;
  priority: number;
}

// ─────────────────────────────────────────────────────────────────
// CONFIGURATION
// ─────────────────────────────────────────────────────────────────

/**
 * Policy Engine configuration
 */
export interface PolicyEngineConfig {
  /** Enable dry-run mode (log but don't enforce) */
  dryRun: boolean;
  /** Enable verbose logging */
  verbose: boolean;
  /** Default decision when no rules match */
  defaultAllow: boolean;
  /** Maximum cache size for compiled patterns */
  maxCacheSize: number;
  /** Custom checks to register */
  customChecks: RegisteredCustomCheck[];
  /** Kill switch state (external state) */
  killSwitchState?: KillSwitchState;
  /** Budget limits */
  budgetLimits?: BudgetLimits;
}

// ─────────────────────────────────────────────────────────────────
// EVALUATION CONTEXT
// ─────────────────────────────────────────────────────────────────

/**
 * Context for policy evaluation
 */
export interface EvaluationContext {
  /** Current timestamp */
  timestamp: string;
  /** Current risk level */
  riskLevel: RiskLevel;
  /** Current operating mode */
  mode: OperatingMode;
  /** Custom context values */
  custom?: Record<string, unknown>;
}

// ─────────────────────────────────────────────────────────────────
// EVENTS
// ─────────────────────────────────────────────────────────────────

/**
 * Policy Engine events
 */
export type PolicyEvent =
  | { type: "policy.check"; identity: RuntimeIdentity; action: string; resource?: string; decision: PolicyDecision }
  | { type: "policy.denied"; identity: RuntimeIdentity; action: string; resource?: string; decision: PolicyDecision }
  | { type: "policy.budget_warning"; identity: RuntimeIdentity; usage: number; limit: number; budgetType: "session" | "daily" | "monthly" }
  | { type: "policy.kill_switch"; identity: RuntimeIdentity; command: "TERMINATE" | "PAUSE" | "RESUME" };

/**
 * Policy event handler
 */
export type PolicyEventHandler = (event: PolicyEvent) => void | Promise<void>;

// ─────────────────────────────────────────────────────────────────
// CACHE TYPES
// ─────────────────────────────────────────────────────────────────

/**
 * Pattern cache for compiled regex
 * AIGOS-509: Policy Engine Caching
 */
export interface PatternCache {
  allowedTools: Map<string, RegExp>;
  deniedTools: Map<string, RegExp>;
  allowedDomains: Map<string, RegExp>;
  deniedDomains: Map<string, RegExp>;
}

/**
 * Cache statistics
 */
export interface CacheStats {
  hits: number;
  misses: number;
  size: number;
  maxSize: number;
}
