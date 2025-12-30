import {
  type RuntimeIdentity,
  type PolicyFile,
  type RiskLevel,
  type OperatingMode,
  evaluatePolicy,
  resolvePolicy,
  createPolicyRepository,
  discoverConfig,
  discoverPolicies,
  type PolicyEvaluationContext,
} from "@aigrc/core";
import { type KillSwitchHandler, createKillSwitch, type KillSwitchConfig } from "./kill-switch.js";

// ─────────────────────────────────────────────────────────────────
// RUNTIME CONTEXT
// Central context for runtime governance
// ─────────────────────────────────────────────────────────────────

/** Runtime context configuration */
export interface RuntimeContextConfig {
  /** The agent's identity */
  identity: RuntimeIdentity;
  /** Kill switch configuration */
  killSwitch?: KillSwitchConfig;
  /** Policy to use (or discover from config) */
  policy?: PolicyFile;
  /** Base directory for config discovery */
  baseDir?: string;
}

/** Action check result */
export interface ActionCheckResult {
  /** Whether the action is allowed */
  allowed: boolean;
  /** Reason for the decision */
  reason: string;
  /** Effect that was applied */
  effect: "allow" | "deny" | "audit";
  /** Whether audit logging is required */
  requiresAudit: boolean;
}

/** Runtime context interface */
export interface RuntimeContext {
  /** The agent's identity */
  readonly identity: RuntimeIdentity;
  /** Current operating mode */
  readonly mode: OperatingMode;
  /** Risk level */
  readonly riskLevel: RiskLevel;
  /** Kill switch handler */
  readonly killSwitch: KillSwitchHandler | null;
  /** Active policy */
  readonly policy: PolicyFile | null;

  /** Check if an action is allowed */
  checkAction(action: string, resource: string): ActionCheckResult;
  /** Check if a tool is allowed */
  checkTool(toolName: string): boolean;
  /** Check if a domain is allowed */
  checkDomain(domain: string): boolean;
  /** Check if agent should continue running */
  shouldContinue(): boolean;
  /** Start runtime services (kill switch, etc.) */
  start(): void;
  /** Stop runtime services */
  stop(): void;
  /** Get current evaluation context */
  getEvaluationContext(): PolicyEvaluationContext;
}

/**
 * Creates a runtime context for an agent.
 *
 * The runtime context centralizes all governance decisions
 * and provides a unified API for checking permissions.
 *
 * @param config Context configuration
 * @returns Runtime context
 */
export function createRuntimeContext(config: RuntimeContextConfig): RuntimeContext {
  const { identity, baseDir = process.cwd() } = config;

  // Initialize kill switch if configured
  let killSwitch: KillSwitchHandler | null = null;
  if (config.killSwitch) {
    killSwitch = createKillSwitch(identity, config.killSwitch);
  }

  // Load or discover policy
  let policy: PolicyFile | null = config.policy ?? null;
  if (!policy) {
    try {
      const configResult = discoverConfig({ startDir: baseDir });
      if (configResult) {
        const policiesResult = discoverPolicies({
          config: configResult.config,
          baseDir: configResult.configDir,
        });

        // Get default policy or first available
        const defaultPolicyId = configResult.config.runtime?.default_policy;
        if (defaultPolicyId && policiesResult.policies.has(defaultPolicyId)) {
          const repo = createPolicyRepository(policiesResult.policies);
          const resolved = resolvePolicy(defaultPolicyId, repo);
          policy = resolved.policy;
        } else if (policiesResult.policies.size > 0) {
          // Use first policy
          const firstId = policiesResult.policies.keys().next().value;
          if (firstId) {
            const repo = createPolicyRepository(policiesResult.policies);
            const resolved = resolvePolicy(firstId, repo);
            policy = resolved.policy;
          }
        }
      }
    } catch {
      // Policy discovery failed, continue without policy
    }
  }

  function getEvaluationContext(): PolicyEvaluationContext {
    return {
      riskLevel: identity.risk_level,
      mode: identity.mode,
      timestamp: new Date().toISOString(),
    };
  }

  function checkAction(action: string, resource: string): ActionCheckResult {
    // If terminated, deny everything
    if (killSwitch && !killSwitch.shouldContinue()) {
      return {
        allowed: false,
        reason: "Agent is terminated or paused",
        effect: "deny",
        requiresAudit: true,
      };
    }

    // If no policy, use capabilities-based check
    if (!policy) {
      return checkWithCapabilities(action, resource);
    }

    // Evaluate against policy
    const result = evaluatePolicy(policy, action, resource, getEvaluationContext());

    return {
      allowed: result.allowed,
      reason: result.reason,
      effect: result.effect,
      requiresAudit: result.effect === "audit" || identity.risk_level === "high",
    };
  }

  function checkWithCapabilities(action: string, resource: string): ActionCheckResult {
    const caps = identity.capabilities_manifest;

    // Check denied tools
    for (const pattern of caps.denied_tools) {
      if (matchesPattern(action, pattern)) {
        return {
          allowed: false,
          reason: `Action "${action}" is denied by capability rules`,
          effect: "deny",
          requiresAudit: false,
        };
      }
    }

    // Check allowed tools
    if (caps.allowed_tools.length > 0) {
      for (const pattern of caps.allowed_tools) {
        if (matchesPattern(action, pattern)) {
          return {
            allowed: true,
            reason: `Action "${action}" is allowed by capability rules`,
            effect: "allow",
            requiresAudit: false,
          };
        }
      }
      // Not in allowed list
      return {
        allowed: false,
        reason: `Action "${action}" is not in allowed tools list`,
        effect: "deny",
        requiresAudit: false,
      };
    }

    // Default allow if no restrictions
    return {
      allowed: true,
      reason: "No capability restrictions",
      effect: "allow",
      requiresAudit: false,
    };
  }

  function checkTool(toolName: string): boolean {
    return checkAction(toolName, "*").allowed;
  }

  function checkDomain(domain: string): boolean {
    const caps = identity.capabilities_manifest;

    // Check denied domains
    for (const pattern of caps.denied_domains) {
      if (matchesDomainPattern(domain, pattern)) {
        return false;
      }
    }

    // Check allowed domains
    if (caps.allowed_domains.length > 0) {
      for (const pattern of caps.allowed_domains) {
        if (matchesDomainPattern(domain, pattern)) {
          return true;
        }
      }
      return false;
    }

    return true;
  }

  function shouldContinue(): boolean {
    return !killSwitch || killSwitch.shouldContinue();
  }

  function start(): void {
    killSwitch?.start();
  }

  function stop(): void {
    killSwitch?.stop();
  }

  return {
    get identity() {
      return identity;
    },
    get mode() {
      return identity.mode;
    },
    get riskLevel() {
      return identity.risk_level;
    },
    get killSwitch() {
      return killSwitch;
    },
    get policy() {
      return policy;
    },
    checkAction,
    checkTool,
    checkDomain,
    shouldContinue,
    start,
    stop,
    getEvaluationContext,
  };
}

/**
 * Matches a value against a pattern (supports wildcards)
 */
function matchesPattern(value: string, pattern: string): boolean {
  if (pattern === "*") return true;
  if (pattern.endsWith("*")) {
    return value.startsWith(pattern.slice(0, -1));
  }
  if (pattern.startsWith("*")) {
    return value.endsWith(pattern.slice(1));
  }
  return value === pattern;
}

/**
 * Matches a domain against a pattern (supports wildcard subdomains)
 */
function matchesDomainPattern(domain: string, pattern: string): boolean {
  if (pattern === "*") return true;
  if (pattern.startsWith("*.")) {
    const suffix = pattern.slice(1);
    return domain === pattern.slice(2) || domain.endsWith(suffix);
  }
  return domain === pattern;
}
