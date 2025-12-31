// @aigos/runtime - Policy Engine (The Bouncer)
// Implements SPEC-RT-003: Policy Engine Specification

import type {
  RuntimeIdentity,
  PolicyFile,
  CapabilitiesManifest,
} from "@aigrc/core";

// ─────────────────────────────────────────────────────────────────
// TYPES & INTERFACES
// ─────────────────────────────────────────────────────────────────

/**
 * Permission request for policy evaluation
 */
export interface PermissionRequest {
  /** The action being requested (e.g., "tool_call", "api_request") */
  action: string;
  /** The specific tool or API (e.g., "web_search", "https://api.com") */
  resource: string;
  /** Additional parameters for context */
  params?: Record<string, unknown>;
  /** Estimated cost of this action (USD) */
  estimatedCost?: number;
  /** Estimated tokens for this action */
  estimatedTokens?: number;
}

/**
 * Result of a permission check
 */
export interface PermissionResult {
  /** Whether the action is allowed */
  allowed: boolean;
  /** If denied, why */
  reason?: string;
  /** Which check denied (for debugging) */
  deniedBy?:
    | "kill_switch"
    | "capability"
    | "resource"
    | "budget"
    | "rate_limit"
    | "custom";
  /** Evaluation time in milliseconds */
  evaluationTimeMs: number;
  /** Whether this was a dry-run evaluation */
  dryRun: boolean;
  /** Recommendations if denied */
  recommendations?: string[];
}

/**
 * Budget status tracking
 */
export interface BudgetStatus {
  /** Cost incurred this session */
  sessionCost: number;
  /** Cost incurred today */
  dailyCost: number;
  /** Maximum allowed per session */
  sessionLimit: number | null;
  /** Maximum allowed per day */
  dailyLimit: number | null;
  /** Remaining session budget */
  sessionRemaining: number | null;
  /** Remaining daily budget */
  dailyRemaining: number | null;
  /** Calls this minute (for rate limiting) */
  callsThisMinute: number;
  /** Maximum calls per minute */
  callsPerMinuteLimit: number | null;
}

/**
 * Policy engine configuration
 */
export interface PolicyEngineConfig {
  /** The agent's capabilities manifest */
  capabilities: CapabilitiesManifest;
  /** Whether kill switch is active */
  killSwitchActive?: boolean;
  /** Kill switch reason if active */
  killSwitchReason?: string;
  /** Policy file for extended rules */
  policy?: PolicyFile;
  /** Enable dry-run mode (log only, don't block) */
  dryRun?: boolean;
  /** Fail-open mode (allow if evaluation fails) */
  failOpen?: boolean;
  /** Custom check functions */
  customChecks?: CustomCheck[];
}

/**
 * Custom check function type
 */
export type CustomCheck = (
  request: PermissionRequest
) => PermissionResult | Promise<PermissionResult>;

/**
 * Policy Engine interface (The Bouncer)
 */
export interface IPolicyEngine {
  /**
   * Checks if an action is permitted.
   * Target: < 2ms P99 latency
   *
   * @param request - The permission check request
   * @returns The permission decision
   * @throws AgentTerminatedException if kill switch is active
   */
  checkPermission(request: PermissionRequest): Promise<PermissionResult>;

  /**
   * Synchronous permission check for hot path.
   * Use when async is not acceptable.
   */
  checkPermissionSync(request: PermissionRequest): PermissionResult;

  /**
   * Records cost incurred by an action.
   *
   * @param cost - The cost in USD
   */
  recordCost(cost: number): void;

  /**
   * Records a call for rate limiting.
   */
  recordCall(): void;

  /**
   * Gets current budget status.
   */
  getBudgetStatus(): BudgetStatus;

  /**
   * Reloads policies from disk.
   */
  reloadPolicies(): Promise<void>;

  /**
   * Sets dry-run mode.
   */
  setDryRun(enabled: boolean): void;

  /**
   * Checks if engine is in dry-run mode.
   */
  isDryRun(): boolean;

  /**
   * Sets kill switch status.
   */
  setKillSwitchActive(active: boolean, reason?: string): void;

  /**
   * Checks if kill switch is active.
   */
  isKillSwitchActive(): boolean;

  /**
   * Resets budget tracking (for testing or session reset).
   */
  resetBudget(): void;

  /**
   * Resets rate limit counter.
   */
  resetRateLimit(): void;
}

// ─────────────────────────────────────────────────────────────────
// ERRORS
// ─────────────────────────────────────────────────────────────────

/**
 * Thrown when permission is denied
 */
export class AigosPolicyViolation extends Error {
  constructor(
    public readonly action: string,
    public readonly resource: string,
    public readonly reason: string,
    public readonly deniedBy: string
  ) {
    super(`Policy violation: ${reason}`);
    this.name = "AigosPolicyViolation";
  }
}

/**
 * Thrown when kill switch is active
 */
export class AgentTerminatedException extends Error {
  constructor(public readonly reason: string) {
    super(`Agent terminated: ${reason}`);
    this.name = "AgentTerminatedException";
  }
}

/**
 * Thrown when budget is exceeded
 */
export class AigosBudgetExceeded extends AigosPolicyViolation {
  constructor(
    action: string,
    resource: string,
    public readonly currentCost: number,
    public readonly limit: number
  ) {
    super(action, resource, "Budget exceeded", "budget");
    this.name = "AigosBudgetExceeded";
  }
}

/**
 * Thrown when policy evaluation fails
 */
export class PolicyEvaluationError extends Error {
  constructor(
    public readonly cause: Error,
    public readonly failOpen: boolean
  ) {
    super(`Policy evaluation failed: ${cause.message}`);
    this.name = "PolicyEvaluationError";
  }
}

// ─────────────────────────────────────────────────────────────────
// BUDGET TRACKER
// ─────────────────────────────────────────────────────────────────

/**
 * Tracks budget and rate limits
 */
export class BudgetTracker {
  private sessionCost = 0;
  private dailyCost = 0;
  private callsThisMinute = 0;
  private lastMinuteReset: number;
  private lastDayReset: number;

  constructor(
    private readonly sessionLimit: number | null,
    private readonly dailyLimit: number | null,
    private readonly callsPerMinuteLimit: number | null
  ) {
    this.lastMinuteReset = Date.now();
    this.lastDayReset = this.getStartOfDay();
  }

  private getStartOfDay(): number {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  }

  recordCost(cost: number): void {
    this.maybeResetDaily();
    this.sessionCost += cost;
    this.dailyCost += cost;
  }

  recordCall(): void {
    this.maybeResetMinute();
    this.callsThisMinute++;
  }

  private maybeResetMinute(): void {
    const now = Date.now();
    if (now - this.lastMinuteReset >= 60000) {
      this.callsThisMinute = 0;
      this.lastMinuteReset = now;
    }
  }

  private maybeResetDaily(): void {
    const startOfToday = this.getStartOfDay();
    if (startOfToday > this.lastDayReset) {
      this.dailyCost = 0;
      this.lastDayReset = startOfToday;
    }
  }

  checkBudget(estimatedCost: number): { allowed: boolean; reason?: string } {
    this.maybeResetDaily();

    if (
      this.sessionLimit !== null &&
      this.sessionCost + estimatedCost > this.sessionLimit
    ) {
      return {
        allowed: false,
        reason: `Session budget exceeded: ${this.sessionCost + estimatedCost} > ${this.sessionLimit}`,
      };
    }

    if (
      this.dailyLimit !== null &&
      this.dailyCost + estimatedCost > this.dailyLimit
    ) {
      return {
        allowed: false,
        reason: `Daily budget exceeded: ${this.dailyCost + estimatedCost} > ${this.dailyLimit}`,
      };
    }

    return { allowed: true };
  }

  checkRateLimit(): { allowed: boolean; reason?: string } {
    this.maybeResetMinute();

    if (
      this.callsPerMinuteLimit !== null &&
      this.callsThisMinute >= this.callsPerMinuteLimit
    ) {
      return {
        allowed: false,
        reason: `Rate limit exceeded: ${this.callsThisMinute} >= ${this.callsPerMinuteLimit} calls/minute`,
      };
    }

    return { allowed: true };
  }

  getStatus(): BudgetStatus {
    this.maybeResetMinute();
    this.maybeResetDaily();

    return {
      sessionCost: this.sessionCost,
      dailyCost: this.dailyCost,
      sessionLimit: this.sessionLimit,
      dailyLimit: this.dailyLimit,
      sessionRemaining:
        this.sessionLimit !== null
          ? Math.max(0, this.sessionLimit - this.sessionCost)
          : null,
      dailyRemaining:
        this.dailyLimit !== null
          ? Math.max(0, this.dailyLimit - this.dailyCost)
          : null,
      callsThisMinute: this.callsThisMinute,
      callsPerMinuteLimit: this.callsPerMinuteLimit,
    };
  }

  reset(): void {
    this.sessionCost = 0;
    this.dailyCost = 0;
    this.callsThisMinute = 0;
    this.lastMinuteReset = Date.now();
    this.lastDayReset = this.getStartOfDay();
  }

  resetRateLimit(): void {
    this.callsThisMinute = 0;
    this.lastMinuteReset = Date.now();
  }
}

// ─────────────────────────────────────────────────────────────────
// PATTERN MATCHER (Pre-compiled for performance)
// ─────────────────────────────────────────────────────────────────

/**
 * Pattern matcher with pre-compiled regex for performance
 */
export class PatternMatcher {
  private readonly compiledPatterns: Map<string, RegExp> = new Map();

  /**
   * Compiles patterns on construction for fast matching
   */
  constructor(patterns: string[]) {
    for (const pattern of patterns) {
      try {
        // Detect if this is already a regex pattern (starts with ^ or contains regex syntax)
        const isRegex = pattern.startsWith("^") ||
                       pattern.includes("\\") ||
                       pattern.includes("$") ||
                       pattern.includes("(") ||
                       pattern.includes(")") ||
                       pattern.includes("[") ||
                       pattern.includes("]") ||
                       pattern.includes("{") ||
                       pattern.includes("}") ||
                       pattern.includes("+") ||
                       pattern.includes("?");

        if (isRegex) {
          // Already a regex pattern - use as-is
          this.compiledPatterns.set(pattern, new RegExp(pattern));
        } else if (pattern.includes("*")) {
          // Simple wildcard pattern - convert to regex
          const regexPattern = pattern
            .replace(/[.+^${}()|[\]\\]/g, "\\$&") // Escape special chars
            .replace(/\*/g, ".*"); // Convert * to .*
          this.compiledPatterns.set(pattern, new RegExp(`^${regexPattern}$`));
        } else {
          // Literal match
          this.compiledPatterns.set(
            pattern,
            new RegExp(`^${pattern.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`)
          );
        }
      } catch {
        // Invalid regex, store as literal match
        this.compiledPatterns.set(
          pattern,
          new RegExp(`^${pattern.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`)
        );
      }
    }
  }

  /**
   * Checks if a value matches any pattern
   * Target: < 0.1ms per pattern
   */
  matches(value: string): boolean {
    for (const regex of this.compiledPatterns.values()) {
      if (regex.test(value)) {
        return true;
      }
    }
    return false;
  }

  /**
   * Gets the first matching pattern (for debugging)
   */
  getFirstMatch(value: string): string | null {
    for (const [pattern, regex] of this.compiledPatterns) {
      if (regex.test(value)) {
        return pattern;
      }
    }
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────
// POLICY ENGINE IMPLEMENTATION
// ─────────────────────────────────────────────────────────────────

/**
 * Creates a new Policy Engine instance.
 *
 * The Policy Engine (The Bouncer) evaluates whether runtime actions
 * are permitted based on capabilities, policies, and budgets.
 *
 * @param config Policy engine configuration
 * @returns Policy engine instance
 *
 * @example
 * ```typescript
 * const engine = createPolicyEngine({
 *   capabilities: identity.capabilities_manifest,
 * });
 *
 * const result = await engine.checkPermission({
 *   action: 'web_search',
 *   resource: 'https://api.example.com',
 * });
 *
 * if (!result.allowed) {
 *   console.log(`Denied: ${result.reason}`);
 * }
 * ```
 */
export function createPolicyEngine(config: PolicyEngineConfig): IPolicyEngine {
  const { capabilities } = config;

  // State
  let dryRun = config.dryRun ?? false;
  let killSwitchActive = config.killSwitchActive ?? false;
  let killSwitchReason = config.killSwitchReason ?? "";
  const failOpen = config.failOpen ?? false;
  const customChecks = config.customChecks ?? [];

  // Pre-compile patterns for performance
  const allowedToolsMatcher = new PatternMatcher(capabilities.allowed_tools);
  const deniedToolsMatcher = new PatternMatcher(capabilities.denied_tools);
  const allowedDomainsMatcher = new PatternMatcher(capabilities.allowed_domains);
  const deniedDomainsMatcher = new PatternMatcher(capabilities.denied_domains);

  // Budget tracker
  const budgetTracker = new BudgetTracker(
    capabilities.max_cost_per_session ?? null,
    capabilities.max_cost_per_day ?? null,
    null // Rate limit from policy if needed
  );

  /**
   * Core evaluation algorithm - 7-step short-circuit chain
   * Target: < 2ms P99 latency
   */
  function evaluate(request: PermissionRequest): PermissionResult {
    const startTime = performance.now();

    try {
      // Step 1: Kill Switch Check [O(1)]
      if (killSwitchActive) {
        return createDenied(
          "kill_switch",
          killSwitchReason || "Kill switch is active",
          startTime
        );
      }

      // Step 2: Capability Check [O(n)]
      // If allowed_tools is specified, action must be in the list
      if (
        capabilities.allowed_tools.length > 0 &&
        !allowedToolsMatcher.matches(request.action)
      ) {
        return createDenied(
          "capability",
          `Action "${request.action}" is not in allowed_tools`,
          startTime,
          ["Add action to allowed_tools in capabilities manifest"]
        );
      }

      // Step 3: Deny List Check [O(n)]
      if (deniedToolsMatcher.matches(request.action)) {
        const matchedPattern = deniedToolsMatcher.getFirstMatch(request.action);
        return createDenied(
          "capability",
          `Action "${request.action}" is in denied_tools (matched: ${matchedPattern})`,
          startTime,
          ["Remove action from denied_tools to allow"]
        );
      }

      // Step 4: Resource Deny Check [O(n)] - DENY overrides ALLOW per spec
      if (
        request.resource &&
        request.resource !== "*" &&
        deniedDomainsMatcher.matches(request.resource)
      ) {
        const matchedPattern = deniedDomainsMatcher.getFirstMatch(
          request.resource
        );
        return createDenied(
          "resource",
          `Resource "${request.resource}" is in denied_domains (matched: ${matchedPattern})`,
          startTime,
          ["Remove domain pattern from denied_domains to allow"]
        );
      }

      // Step 5: Resource Allow Check [O(n)]
      if (request.resource && request.resource !== "*") {
        if (
          capabilities.allowed_domains.length > 0 &&
          !allowedDomainsMatcher.matches(request.resource)
        ) {
          return createDenied(
            "resource",
            `Resource "${request.resource}" is not in allowed_domains`,
            startTime,
            ["Add domain pattern to allowed_domains"]
          );
        }
      }

      // Step 6: Budget Check [O(1)]
      if (request.estimatedCost !== undefined && request.estimatedCost > 0) {
        const budgetCheck = budgetTracker.checkBudget(request.estimatedCost);
        if (!budgetCheck.allowed) {
          return createDenied("budget", budgetCheck.reason!, startTime, [
            "Wait for budget reset or increase limits",
          ]);
        }
      }

      // Step 7: Token Check [O(1)]
      const maxTokens = capabilities.max_tokens_per_call;
      if (
        request.estimatedTokens !== undefined &&
        maxTokens !== undefined &&
        maxTokens !== null &&
        request.estimatedTokens > maxTokens
      ) {
        return createDenied(
          "budget",
          `Token limit exceeded: ${request.estimatedTokens} > ${maxTokens}`,
          startTime,
          ["Reduce tokens per call or increase max_tokens_per_call"]
        );
      }

      // Step 8: Rate Limit Check [O(1)]
      const rateLimitCheck = budgetTracker.checkRateLimit();
      if (!rateLimitCheck.allowed) {
        return createDenied("rate_limit", rateLimitCheck.reason!, startTime, [
          "Wait for rate limit window to reset",
        ]);
      }

      // All checks passed!
      return createAllowed(startTime);
    } catch (error) {
      // Handle evaluation errors
      if (failOpen) {
        return createAllowed(startTime);
      }
      throw new PolicyEvaluationError(
        error instanceof Error ? error : new Error(String(error)),
        failOpen
      );
    }
  }

  /**
   * Creates an ALLOWED result
   */
  function createAllowed(startTime: number): PermissionResult {
    const evaluationTimeMs = performance.now() - startTime;
    return {
      allowed: true,
      evaluationTimeMs,
      dryRun,
    };
  }

  /**
   * Creates a DENIED result (or WOULD_DENY in dry-run mode)
   */
  function createDenied(
    deniedBy: PermissionResult["deniedBy"],
    reason: string,
    startTime: number,
    recommendations?: string[]
  ): PermissionResult {
    const evaluationTimeMs = performance.now() - startTime;

    if (dryRun) {
      return {
        allowed: true, // Always true in dry-run
        reason: `WOULD_DENY: ${reason}`,
        deniedBy,
        evaluationTimeMs,
        dryRun: true,
        recommendations,
      };
    }

    return {
      allowed: false,
      reason,
      deniedBy,
      evaluationTimeMs,
      dryRun: false,
      recommendations,
    };
  }

  // ─────────────────────────────────────────────────────────────────
  // PUBLIC API
  // ─────────────────────────────────────────────────────────────────

  async function checkPermission(
    request: PermissionRequest
  ): Promise<PermissionResult> {
    // Run sync checks first
    const result = checkPermissionSync(request);

    // If denied by sync checks, return early
    if (!result.allowed && !dryRun) {
      return result;
    }

    // Run custom async checks
    for (const check of customChecks) {
      const customResult = await check(request);
      if (!customResult.allowed) {
        if (dryRun) {
          return {
            ...customResult,
            allowed: true,
            reason: `WOULD_DENY: ${customResult.reason}`,
            dryRun: true,
          };
        }
        return customResult;
      }
    }

    return result;
  }

  function checkPermissionSync(request: PermissionRequest): PermissionResult {
    return evaluate(request);
  }

  function recordCost(cost: number): void {
    budgetTracker.recordCost(cost);
  }

  function recordCall(): void {
    budgetTracker.recordCall();
  }

  function getBudgetStatus(): BudgetStatus {
    return budgetTracker.getStatus();
  }

  async function reloadPolicies(): Promise<void> {
    // TODO: Implement hot reload from disk
    // This would re-read .aigrc/policies/ and update matchers
  }

  function setDryRun(enabled: boolean): void {
    dryRun = enabled;
  }

  function isDryRunFn(): boolean {
    return dryRun;
  }

  function setKillSwitchActive(active: boolean, reason?: string): void {
    killSwitchActive = active;
    killSwitchReason = reason ?? "";
  }

  function isKillSwitchActive(): boolean {
    return killSwitchActive;
  }

  function resetBudget(): void {
    budgetTracker.reset();
  }

  function resetRateLimit(): void {
    budgetTracker.resetRateLimit();
  }

  return {
    checkPermission,
    checkPermissionSync,
    recordCost,
    recordCall,
    getBudgetStatus,
    reloadPolicies,
    setDryRun,
    isDryRun: isDryRunFn,
    setKillSwitchActive,
    isKillSwitchActive,
    resetBudget,
    resetRateLimit,
  };
}

/**
 * Creates a Policy Engine from a RuntimeIdentity
 */
export function createPolicyEngineFromIdentity(
  identity: RuntimeIdentity,
  options: Partial<PolicyEngineConfig> = {}
): IPolicyEngine {
  return createPolicyEngine({
    capabilities: identity.capabilities_manifest,
    ...options,
  });
}
