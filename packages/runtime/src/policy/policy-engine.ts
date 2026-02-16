/**
 * Policy Engine - "The Bouncer" (SPEC-RT-003)
 * Real-time permission evaluation with <2ms P99 latency
 */

import type {
  RuntimeIdentity,
  CapabilitiesManifest,
  OperatingMode,
} from "@aigrc/core";

import type {
  PolicyDecision,
  DenialStage,
  BudgetState,
  BudgetLimits,
  KillSwitchState,
  CustomCheck,
  RegisteredCustomCheck,
  PolicyEngineConfig,
  EvaluationContext,
  PolicyEvent,
  PolicyEventHandler,
  PatternCache,
  CacheStats,
} from "./types.js";

import { DENIAL_CODES } from "./types.js";

// ─────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────

const DEFAULT_CONFIG: PolicyEngineConfig = {
  dryRun: false,
  verbose: false,
  defaultAllow: false,
  maxCacheSize: 1000,
  customChecks: [],
};

// ─────────────────────────────────────────────────────────────────
// POLICY ENGINE CLASS
// ─────────────────────────────────────────────────────────────────

/**
 * Policy Engine - "The Bouncer"
 * Evaluates permissions with short-circuit evaluation for performance
 */
export class PolicyEngine {
  private config: PolicyEngineConfig;
  private budgetStates: Map<string, BudgetState> = new Map();
  private killSwitchState: KillSwitchState;
  private patternCache: PatternCache;
  private cacheStats: CacheStats;
  private eventHandlers: PolicyEventHandler[] = [];

  constructor(config: Partial<PolicyEngineConfig> = {}) {
    this.config = {
      ...DEFAULT_CONFIG,
      ...config,
      // Deep copy arrays to avoid shared references
      customChecks: [...(config.customChecks ?? DEFAULT_CONFIG.customChecks)],
    };

    // Initialize kill switch state
    this.killSwitchState = config.killSwitchState ?? {
      global_kill: false,
      terminated_instances: new Set(),
      terminated_assets: new Set(),
      paused_instances: new Set(),
      paused_assets: new Set(),
    };

    // Initialize pattern cache
    this.patternCache = {
      allowedTools: new Map(),
      deniedTools: new Map(),
      allowedDomains: new Map(),
      deniedDomains: new Map(),
    };

    this.cacheStats = {
      hits: 0,
      misses: 0,
      size: 0,
      maxSize: this.config.maxCacheSize,
    };

    // Register custom checks
    for (const check of this.config.customChecks) {
      this.registerCustomCheck(check.name, check.check, check.priority);
    }
  }

  /**
   * Check if an action is allowed
   * AIGOS-501: Core Policy Check Function
   */
  async checkPermission(
    identity: RuntimeIdentity,
    action: string,
    resource?: string,
    context?: Record<string, unknown>
  ): Promise<PolicyDecision> {
    const startTime = performance.now();
    const checkedAt = new Date().toISOString();

    // Build evaluation context
    const evalContext: EvaluationContext = {
      timestamp: checkedAt,
      riskLevel: identity.risk_level,
      mode: identity.mode,
      custom: context,
    };

    // Short-circuit evaluation chain (AIGOS-502)
    let decision: PolicyDecision | null = null;

    // 1. Kill Switch Check [O(1)] (AIGOS-503)
    decision = this.checkKillSwitch(identity);
    if (decision && !decision.allowed) {
      return this.finalizeDecision(decision, startTime, checkedAt, identity, action, resource);
    }

    // 2. Mode Check [O(1)]
    decision = this.checkMode(identity, action);
    if (decision && !decision.allowed) {
      return this.finalizeDecision(decision, startTime, checkedAt, identity, action, resource);
    }

    // 3. Capability Check [O(n)] (AIGOS-504)
    decision = this.checkCapability(identity, action);
    if (decision && !decision.allowed) {
      return this.finalizeDecision(decision, startTime, checkedAt, identity, action, resource);
    }

    // 4. Resource Deny Check [O(n)] (AIGOS-505)
    if (resource) {
      decision = this.checkResourceDeny(identity, resource);
      if (decision && !decision.allowed) {
        return this.finalizeDecision(decision, startTime, checkedAt, identity, action, resource);
      }
    }

    // 5. Resource Allow Check [O(n)]
    if (resource) {
      decision = this.checkResourceAllow(identity, resource);
      if (decision && !decision.allowed) {
        return this.finalizeDecision(decision, startTime, checkedAt, identity, action, resource);
      }
    }

    // 6. Budget Check [O(1)] (AIGOS-506)
    decision = this.checkBudget(identity, context?.cost as number | undefined);
    if (decision && !decision.allowed) {
      return this.finalizeDecision(decision, startTime, checkedAt, identity, action, resource);
    }

    // 7. Custom Checks [O(k)] (AIGOS-507)
    decision = await this.checkCustom(identity, action, resource, context);
    if (decision && !decision.allowed) {
      return this.finalizeDecision(decision, startTime, checkedAt, identity, action, resource);
    }

    // All checks passed
    const allowDecision: PolicyDecision = {
      allowed: true,
      checked_at: checkedAt,
      duration_ms: performance.now() - startTime,
    };

    return this.finalizeDecision(allowDecision, startTime, checkedAt, identity, action, resource);
  }

  /**
   * Synchronous permission check (for decorators)
   */
  checkPermissionSync(
    identity: RuntimeIdentity,
    action: string,
    resource?: string,
    context?: Record<string, unknown>
  ): PolicyDecision {
    const startTime = performance.now();
    const checkedAt = new Date().toISOString();

    // Kill Switch Check
    let decision = this.checkKillSwitch(identity);
    if (decision && !decision.allowed) {
      return this.finalizeSyncDecision(decision, startTime, checkedAt);
    }

    // Mode Check
    decision = this.checkMode(identity, action);
    if (decision && !decision.allowed) {
      return this.finalizeSyncDecision(decision, startTime, checkedAt);
    }

    // Capability Check
    decision = this.checkCapability(identity, action);
    if (decision && !decision.allowed) {
      return this.finalizeSyncDecision(decision, startTime, checkedAt);
    }

    // Resource Checks
    if (resource) {
      decision = this.checkResourceDeny(identity, resource);
      if (decision && !decision.allowed) {
        return this.finalizeSyncDecision(decision, startTime, checkedAt);
      }

      decision = this.checkResourceAllow(identity, resource);
      if (decision && !decision.allowed) {
        return this.finalizeSyncDecision(decision, startTime, checkedAt);
      }
    }

    // Budget Check
    decision = this.checkBudget(identity, context?.cost as number | undefined);
    if (decision && !decision.allowed) {
      return this.finalizeSyncDecision(decision, startTime, checkedAt);
    }

    // All passed
    return {
      allowed: true,
      checked_at: checkedAt,
      duration_ms: performance.now() - startTime,
    };
  }

  // ─────────────────────────────────────────────────────────────────
  // INDIVIDUAL CHECK METHODS
  // ─────────────────────────────────────────────────────────────────

  /**
   * Kill Switch Check - O(1)
   * AIGOS-503
   */
  private checkKillSwitch(identity: RuntimeIdentity): PolicyDecision | null {
    // Global kill switch
    if (this.killSwitchState.global_kill) {
      return this.deny("TERMINATED", DENIAL_CODES.TERMINATED, "KILL_SWITCH");
    }

    // Instance-specific termination
    if (this.killSwitchState.terminated_instances.has(identity.instance_id)) {
      return this.deny("TERMINATED", DENIAL_CODES.TERMINATED, "KILL_SWITCH");
    }

    // Asset-specific termination
    if (this.killSwitchState.terminated_assets.has(identity.asset_id)) {
      return this.deny("TERMINATED", DENIAL_CODES.TERMINATED, "KILL_SWITCH");
    }

    // Instance-specific pause
    if (this.killSwitchState.paused_instances.has(identity.instance_id)) {
      return this.deny("PAUSED", DENIAL_CODES.PAUSED, "KILL_SWITCH");
    }

    // Asset-specific pause
    if (this.killSwitchState.paused_assets.has(identity.asset_id)) {
      return this.deny("PAUSED", DENIAL_CODES.PAUSED, "KILL_SWITCH");
    }

    return null; // Passed
  }

  /**
   * Operating Mode Check - O(1)
   */
  private checkMode(identity: RuntimeIdentity, action: string): PolicyDecision | null {
    // RESTRICTED mode - very limited actions
    if (identity.mode === "RESTRICTED") {
      const restrictedAllowed = ["log", "report", "status", "heartbeat"];
      if (!restrictedAllowed.includes(action)) {
        return this.deny("MODE_RESTRICTED", DENIAL_CODES.MODE_RESTRICTED, "CAPABILITY");
      }
    }

    // SANDBOX mode - allow but log (handled in finalize)
    return null;
  }

  /**
   * Capability Check - O(n)
   * AIGOS-504
   */
  private checkCapability(identity: RuntimeIdentity, action: string): PolicyDecision | null {
    const caps = identity.capabilities_manifest;

    // In RESTRICTED mode, essential actions bypass capability checks
    // These actions were already validated by checkMode
    if (identity.mode === "RESTRICTED") {
      const restrictedAllowed = ["log", "report", "status", "heartbeat"];
      if (restrictedAllowed.includes(action)) {
        return null; // Allowed - essential action in RESTRICTED mode
      }
    }

    // Check denied_tools first (deny-overrides-allow)
    if (caps.denied_tools.length > 0) {
      if (this.matchesPattern(action, caps.denied_tools, "deniedTools")) {
        return this.deny("CAPABILITY_DENIED", DENIAL_CODES.CAPABILITY_DENIED, "CAPABILITY");
      }
    }

    // Check allowed_tools
    if (caps.allowed_tools.length > 0) {
      // Wildcard allows everything
      if (caps.allowed_tools.includes("*")) {
        return null; // Passed
      }

      if (!this.matchesPattern(action, caps.allowed_tools, "allowedTools")) {
        return this.deny("CAPABILITY_DENIED", DENIAL_CODES.CAPABILITY_DENIED, "CAPABILITY");
      }
    }

    return null; // Passed
  }

  /**
   * Resource Deny Check - O(n)
   * AIGOS-505
   */
  private checkResourceDeny(identity: RuntimeIdentity, resource: string): PolicyDecision | null {
    const caps = identity.capabilities_manifest;

    if (caps.denied_domains.length > 0) {
      const domain = this.extractDomain(resource);
      if (this.matchesDomainPattern(domain, caps.denied_domains, "deniedDomains")) {
        return this.deny("RESOURCE_DENIED", DENIAL_CODES.RESOURCE_DENIED, "RESOURCE_DENY");
      }
    }

    return null; // Passed
  }

  /**
   * Resource Allow Check - O(n)
   */
  private checkResourceAllow(identity: RuntimeIdentity, resource: string): PolicyDecision | null {
    const caps = identity.capabilities_manifest;

    // If allowed_domains is empty or contains "*", allow all
    if (caps.allowed_domains.length === 0 || caps.allowed_domains.includes("*")) {
      return null; // Passed
    }

    const domain = this.extractDomain(resource);
    if (!this.matchesDomainPattern(domain, caps.allowed_domains, "allowedDomains")) {
      return this.deny("RESOURCE_NOT_ALLOWED", DENIAL_CODES.RESOURCE_NOT_ALLOWED, "RESOURCE_ALLOW");
    }

    return null; // Passed
  }

  /**
   * Budget Check - O(1)
   * AIGOS-506
   */
  private checkBudget(identity: RuntimeIdentity, cost?: number): PolicyDecision | null {
    const caps = identity.capabilities_manifest;
    const state = this.getOrCreateBudgetState(identity.instance_id);

    // Reset counters if needed
    this.resetBudgetCounters(state);

    // Check rate limit
    const limits = this.config.budgetLimits;
    if (limits?.max_calls_per_minute) {
      if (state.calls_this_minute >= limits.max_calls_per_minute) {
        return this.deny("RATE_LIMITED", DENIAL_CODES.RATE_LIMITED, "BUDGET");
      }
    }

    // Check cost limits
    if (cost !== undefined && cost > 0) {
      const newSessionCost = state.session_cost + cost;
      const newDailyCost = state.daily_cost + cost;
      const newMonthlyCost = state.monthly_cost + cost;

      if (caps.max_cost_per_session != null && caps.max_cost_per_session !== Infinity) {
        if (newSessionCost > caps.max_cost_per_session) {
          return this.deny("BUDGET_EXCEEDED", DENIAL_CODES.BUDGET_EXCEEDED, "BUDGET");
        }
      }

      if (limits?.max_cost_per_day !== undefined) {
        if (newDailyCost > limits.max_cost_per_day) {
          return this.deny("BUDGET_EXCEEDED", DENIAL_CODES.BUDGET_EXCEEDED, "BUDGET");
        }
      }

      if (limits?.max_cost_per_month !== undefined) {
        if (newMonthlyCost > limits.max_cost_per_month) {
          return this.deny("BUDGET_EXCEEDED", DENIAL_CODES.BUDGET_EXCEEDED, "BUDGET");
        }
      }
    }

    return null; // Passed
  }

  /**
   * Custom Checks - O(k)
   * AIGOS-507
   */
  private async checkCustom(
    identity: RuntimeIdentity,
    action: string,
    resource?: string,
    context?: Record<string, unknown>
  ): Promise<PolicyDecision | null> {
    // Sort by priority (higher first)
    const sortedChecks = [...this.config.customChecks].sort((a, b) => b.priority - a.priority);

    for (const registered of sortedChecks) {
      try {
        const result = registered.check(identity, action, resource, context);
        if (result && !result.allowed) {
          return {
            ...result,
            denied_by: "CUSTOM",
            checked_at: new Date().toISOString(),
            duration_ms: 0,
          };
        }
      } catch (error) {
        console.error(`Custom check "${registered.name}" failed:`, error);
        // Continue to next check
      }
    }

    return null; // All passed
  }

  // ─────────────────────────────────────────────────────────────────
  // HELPER METHODS
  // ─────────────────────────────────────────────────────────────────

  private deny(code: string, reason: string, stage: DenialStage): PolicyDecision {
    return {
      allowed: false,
      code,
      reason,
      denied_by: stage,
      checked_at: "",
      duration_ms: 0,
    };
  }

  private finalizeDecision(
    decision: PolicyDecision,
    startTime: number,
    checkedAt: string,
    identity: RuntimeIdentity,
    action: string,
    resource?: string
  ): PolicyDecision {
    const durationMs = performance.now() - startTime;

    const finalDecision: PolicyDecision = {
      ...decision,
      checked_at: checkedAt,
      duration_ms: durationMs,
    };

    // Handle dry-run mode (AIGOS-508)
    if (this.config.dryRun && !decision.allowed) {
      finalDecision.allowed = true;
      finalDecision.dry_run = true;
      finalDecision.would_deny = true;
    }

    // Update budget state on success
    if (finalDecision.allowed && !finalDecision.dry_run) {
      const state = this.getOrCreateBudgetState(identity.instance_id);
      state.calls_this_minute++;
    }

    // Emit events
    this.emitEvent({
      type: "policy.check",
      identity,
      action,
      resource,
      decision: finalDecision,
    });

    if (!decision.allowed) {
      this.emitEvent({
        type: "policy.denied",
        identity,
        action,
        resource,
        decision: finalDecision,
      });
    }

    return finalDecision;
  }

  private finalizeSyncDecision(
    decision: PolicyDecision,
    startTime: number,
    checkedAt: string
  ): PolicyDecision {
    return {
      ...decision,
      checked_at: checkedAt,
      duration_ms: performance.now() - startTime,
      dry_run: this.config.dryRun ? true : undefined,
      would_deny: this.config.dryRun && !decision.allowed ? true : undefined,
      allowed: this.config.dryRun ? true : decision.allowed,
    };
  }

  // ─────────────────────────────────────────────────────────────────
  // PATTERN MATCHING (with caching - AIGOS-509)
  // ─────────────────────────────────────────────────────────────────

  private matchesPattern(
    value: string,
    patterns: string[],
    cacheKey: keyof PatternCache
  ): boolean {
    for (const pattern of patterns) {
      if (pattern === "*") return true;

      // Check cache
      const cache = this.patternCache[cacheKey] as Map<string, RegExp>;
      let regex = cache.get(pattern);

      if (!regex) {
        this.cacheStats.misses++;
        regex = this.compilePattern(pattern);
        if (cache.size < this.cacheStats.maxSize) {
          cache.set(pattern, regex);
          this.cacheStats.size++;
        }
      } else {
        this.cacheStats.hits++;
      }

      if (regex.test(value)) return true;
    }

    return false;
  }

  private matchesDomainPattern(
    domain: string,
    patterns: string[],
    cacheKey: keyof PatternCache
  ): boolean {
    for (const pattern of patterns) {
      if (pattern === "*") return true;

      // Check cache
      const cache = this.patternCache[cacheKey] as Map<string, RegExp>;
      let regex = cache.get(pattern);

      if (!regex) {
        this.cacheStats.misses++;
        regex = this.compileDomainPattern(pattern);
        if (cache.size < this.cacheStats.maxSize) {
          cache.set(pattern, regex);
          this.cacheStats.size++;
        }
      } else {
        this.cacheStats.hits++;
      }

      if (regex.test(domain)) return true;
    }

    return false;
  }

  private compilePattern(pattern: string): RegExp {
    // Convert glob pattern to regex
    const escaped = pattern
      .replace(/[.+^${}()|[\]\\]/g, "\\$&")
      .replace(/\*/g, ".*")
      .replace(/\?/g, ".");
    return new RegExp(`^${escaped}$`, "i");
  }

  private compileDomainPattern(pattern: string): RegExp {
    if (pattern.startsWith("*.")) {
      // Wildcard subdomain: *.example.com matches foo.example.com
      const base = pattern.slice(2);
      const escaped = base.replace(/[.+^${}()|[\]\\]/g, "\\$&");
      return new RegExp(`^(.*\\.)?${escaped}$`, "i");
    }
    const escaped = pattern.replace(/[.+^${}()|[\]\\]/g, "\\$&");
    return new RegExp(`^${escaped}$`, "i");
  }

  private extractDomain(resource: string): string {
    try {
      const url = new URL(resource);
      return url.hostname;
    } catch {
      // Not a URL, return as-is
      return resource;
    }
  }

  // ─────────────────────────────────────────────────────────────────
  // BUDGET STATE MANAGEMENT
  // ─────────────────────────────────────────────────────────────────

  private getOrCreateBudgetState(instanceId: string): BudgetState {
    let state = this.budgetStates.get(instanceId);

    if (!state) {
      const now = new Date().toISOString();
      state = {
        session_cost: 0,
        daily_cost: 0,
        monthly_cost: 0,
        session_start: now,
        day_start: this.getStartOfDay(now),
        month_start: this.getStartOfMonth(now),
        calls_this_minute: 0,
        minute_start: this.getStartOfMinute(now),
      };
      this.budgetStates.set(instanceId, state);
    }

    return state;
  }

  private resetBudgetCounters(state: BudgetState): void {
    const now = new Date().toISOString();
    const currentDay = this.getStartOfDay(now);
    const currentMonth = this.getStartOfMonth(now);
    const currentMinute = this.getStartOfMinute(now);

    // Reset daily
    if (state.day_start !== currentDay) {
      state.daily_cost = 0;
      state.day_start = currentDay;
    }

    // Reset monthly
    if (state.month_start !== currentMonth) {
      state.monthly_cost = 0;
      state.month_start = currentMonth;
    }

    // Reset minute
    if (state.minute_start !== currentMinute) {
      state.calls_this_minute = 0;
      state.minute_start = currentMinute;
    }
  }

  private getStartOfDay(iso: string): string {
    return iso.slice(0, 10) + "T00:00:00.000Z";
  }

  private getStartOfMonth(iso: string): string {
    return iso.slice(0, 7) + "-01T00:00:00.000Z";
  }

  private getStartOfMinute(iso: string): string {
    return iso.slice(0, 16) + ":00.000Z";
  }

  // ─────────────────────────────────────────────────────────────────
  // PUBLIC API
  // ─────────────────────────────────────────────────────────────────

  /**
   * Register a custom check
   * AIGOS-507
   */
  registerCustomCheck(name: string, check: CustomCheck, priority: number = 0): void {
    this.config.customChecks.push({ name, check, priority });
  }

  /**
   * Update kill switch state
   * AIGOS-503
   */
  updateKillSwitch(
    command: "TERMINATE" | "PAUSE" | "RESUME",
    target: { instanceId?: string; assetId?: string; global?: boolean }
  ): void {
    if (target.global) {
      if (command === "TERMINATE") {
        this.killSwitchState.global_kill = true;
      }
      return;
    }

    const targetId = target.instanceId ?? target.assetId;
    if (!targetId) return;

    if (command === "RESUME") {
      // Remove from both paused sets
      this.killSwitchState.paused_instances.delete(targetId);
      this.killSwitchState.paused_assets.delete(targetId);
      return;
    }

    const targetSet =
      command === "TERMINATE"
        ? target.instanceId
          ? this.killSwitchState.terminated_instances
          : this.killSwitchState.terminated_assets
        : target.instanceId
          ? this.killSwitchState.paused_instances
          : this.killSwitchState.paused_assets;

    targetSet.add(targetId);
  }

  /**
   * Record cost for budget tracking
   * AIGOS-506
   */
  recordCost(instanceId: string, cost: number): void {
    const state = this.getOrCreateBudgetState(instanceId);
    this.resetBudgetCounters(state);
    state.session_cost += cost;
    state.daily_cost += cost;
    state.monthly_cost += cost;
  }

  /**
   * Get cache statistics
   * AIGOS-509
   */
  getCacheStats(): CacheStats {
    return { ...this.cacheStats };
  }

  /**
   * Clear pattern cache
   */
  clearCache(): void {
    this.patternCache.allowedTools.clear();
    this.patternCache.deniedTools.clear();
    this.patternCache.allowedDomains.clear();
    this.patternCache.deniedDomains.clear();
    this.cacheStats.size = 0;
  }

  /**
   * Register event handler
   */
  onEvent(handler: PolicyEventHandler): void {
    this.eventHandlers.push(handler);
  }

  private emitEvent(event: PolicyEvent): void {
    for (const handler of this.eventHandlers) {
      try {
        handler(event);
      } catch (error) {
        console.error("Policy event handler error:", error);
      }
    }
  }
}

// ─────────────────────────────────────────────────────────────────
// FACTORY FUNCTION
// ─────────────────────────────────────────────────────────────────

/**
 * Create a Policy Engine instance
 */
export function createPolicyEngine(config?: Partial<PolicyEngineConfig>): PolicyEngine {
  return new PolicyEngine(config);
}
