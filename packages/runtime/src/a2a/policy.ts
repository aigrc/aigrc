/**
 * A2A Policy Engine (AIGOS-905, AIGOS-906)
 *
 * Implements inbound and outbound A2A policies for controlling
 * agent-to-agent communication.
 */

import type { RiskLevel, GovernanceTokenPayload } from "@aigrc/core";

import type {
  InboundA2APolicy,
  OutboundA2APolicy,
  PolicyCheckResult,
  A2ARequestContext,
  OutboundTarget,
  A2AEvent,
  A2AEventHandler,
} from "./types.js";

// ─────────────────────────────────────────────────────────────────
// RISK LEVEL UTILITIES
// ─────────────────────────────────────────────────────────────────

const RISK_LEVEL_ORDER: Record<RiskLevel, number> = {
  minimal: 0,
  limited: 1,
  high: 2,
  unacceptable: 3,
};

/**
 * Compare risk levels
 */
function compareRiskLevels(a: RiskLevel, b: RiskLevel): number {
  return RISK_LEVEL_ORDER[a] - RISK_LEVEL_ORDER[b];
}

/**
 * Check if risk level exceeds maximum
 */
function exceedsRiskLevel(actual: RiskLevel, max: RiskLevel): boolean {
  return compareRiskLevels(actual, max) > 0;
}

// ─────────────────────────────────────────────────────────────────
// DEFAULT POLICIES
// ─────────────────────────────────────────────────────────────────

/**
 * Default inbound policy - restrictive by default
 */
export const DEFAULT_INBOUND_POLICY: InboundA2APolicy = {
  requireToken: true,
  maxRiskLevel: "high",
  requireKillSwitch: true,
  requireGoldenThreadVerified: true,
  minGenerationDepth: 0,
  maxGenerationDepth: 10,
  blockedOrganizations: [],
  blockedAssets: [],
  allowedModes: ["NORMAL", "SANDBOX"],
};

/**
 * Default outbound policy - restrictive by default
 */
export const DEFAULT_OUTBOUND_POLICY: OutboundA2APolicy = {
  includeToken: true,
  maxTargetRiskLevel: "high",
  requireTargetKillSwitch: true,
  requireTargetGoldenThreadVerified: true,
  blockedDomains: [],
  blockedTargetAssets: [],
  validateResponseTokens: true,
};

// ─────────────────────────────────────────────────────────────────
// INBOUND POLICY CHECKER
// ─────────────────────────────────────────────────────────────────

/**
 * Inbound A2A Policy Checker
 *
 * Evaluates whether an incoming request from another agent should be allowed.
 */
export class InboundPolicyChecker {
  private policy: InboundA2APolicy;
  private eventHandlers: A2AEventHandler[] = [];

  constructor(policy: Partial<InboundA2APolicy>) {
    this.policy = {
      ...DEFAULT_INBOUND_POLICY,
      ...policy,
    };
  }

  /**
   * Check if an incoming request is allowed
   */
  async check(
    payload: GovernanceTokenPayload,
    context: A2ARequestContext
  ): Promise<PolicyCheckResult> {
    const instanceId = payload.aigos.identity.instance_id;

    // Check risk level
    const riskLevel = payload.aigos.governance.risk_level;
    if (exceedsRiskLevel(riskLevel, this.policy.maxRiskLevel)) {
      return this.deny(
        "RISK_LEVEL_EXCEEDED",
        `Risk level ${riskLevel} exceeds maximum ${this.policy.maxRiskLevel}`,
        instanceId
      );
    }

    // Check kill switch requirement
    if (
      this.policy.requireKillSwitch &&
      !payload.aigos.control.kill_switch.enabled
    ) {
      return this.deny(
        "KILL_SWITCH_REQUIRED",
        "Kill switch is required but not enabled",
        instanceId
      );
    }

    // Check Golden Thread verification
    if (
      this.policy.requireGoldenThreadVerified &&
      !payload.aigos.governance.golden_thread.verified
    ) {
      return this.deny(
        "GOLDEN_THREAD_NOT_VERIFIED",
        "Golden Thread verification is required",
        instanceId
      );
    }

    // Check generation depth
    const depth = payload.aigos.lineage.generation_depth;
    if (depth < this.policy.minGenerationDepth) {
      return this.deny(
        "GENERATION_DEPTH_TOO_LOW",
        `Generation depth ${depth} is below minimum ${this.policy.minGenerationDepth}`,
        instanceId
      );
    }
    if (depth > this.policy.maxGenerationDepth) {
      return this.deny(
        "GENERATION_DEPTH_TOO_HIGH",
        `Generation depth ${depth} exceeds maximum ${this.policy.maxGenerationDepth}`,
        instanceId
      );
    }

    // Check operating mode
    const mode = payload.aigos.governance.mode;
    if (!this.policy.allowedModes.includes(mode)) {
      return this.deny(
        "MODE_NOT_ALLOWED",
        `Operating mode ${mode} is not allowed`,
        instanceId
      );
    }

    // Check blocked assets
    const assetId = payload.aigos.identity.asset_id;
    if (this.policy.blockedAssets.includes(assetId)) {
      return this.deny(
        "ASSET_BLOCKED",
        `Asset ${assetId} is blocked`,
        instanceId
      );
    }

    // Check trusted assets (if set)
    if (
      this.policy.trustedAssets &&
      this.policy.trustedAssets.length > 0 &&
      !this.policy.trustedAssets.includes(assetId)
    ) {
      return this.deny(
        "ASSET_NOT_TRUSTED",
        `Asset ${assetId} is not in trusted list`,
        instanceId
      );
    }

    // Run custom checks
    if (this.policy.customChecks) {
      for (const check of this.policy.customChecks) {
        const result = await check(payload, context);
        if (!result.allowed) {
          return this.deny(
            result.code ?? "CUSTOM_CHECK_FAILED",
            result.reason ?? "Custom policy check failed",
            instanceId
          );
        }
      }
    }

    // All checks passed
    this.emitEvent({
      type: "policy.checked",
      timestamp: new Date().toISOString(),
      instanceId,
      direction: "inbound",
      peerInstanceId: payload.aigos.identity.instance_id,
      allowed: true,
    });

    return { allowed: true };
  }

  /**
   * Update the policy
   */
  updatePolicy(updates: Partial<InboundA2APolicy>): void {
    this.policy = {
      ...this.policy,
      ...updates,
    };
  }

  /**
   * Get current policy
   */
  getPolicy(): InboundA2APolicy {
    return { ...this.policy };
  }

  /**
   * Register an event handler
   */
  onEvent(handler: A2AEventHandler): () => void {
    this.eventHandlers.push(handler);
    return () => {
      const index = this.eventHandlers.indexOf(handler);
      if (index >= 0) {
        this.eventHandlers.splice(index, 1);
      }
    };
  }

  private deny(
    code: string,
    reason: string,
    instanceId: string
  ): PolicyCheckResult {
    this.emitEvent({
      type: "policy.violated",
      timestamp: new Date().toISOString(),
      instanceId,
      direction: "inbound",
      violationCode: code,
      violationMessage: reason,
    });

    return {
      allowed: false,
      code,
      reason,
    };
  }

  private emitEvent(event: A2AEvent): void {
    for (const handler of this.eventHandlers) {
      try {
        handler(event);
      } catch (error) {
        console.error("A2A event handler error:", error);
      }
    }
  }
}

// ─────────────────────────────────────────────────────────────────
// OUTBOUND POLICY CHECKER
// ─────────────────────────────────────────────────────────────────

/**
 * Outbound A2A Policy Checker
 *
 * Evaluates whether an outgoing request to another agent should be allowed.
 */
export class OutboundPolicyChecker {
  private policy: OutboundA2APolicy;
  private instanceId: string;
  private eventHandlers: A2AEventHandler[] = [];

  constructor(policy: Partial<OutboundA2APolicy>, instanceId: string) {
    this.policy = {
      ...DEFAULT_OUTBOUND_POLICY,
      ...policy,
    };
    this.instanceId = instanceId;
  }

  /**
   * Check if an outgoing request is allowed (pre-flight)
   */
  checkPreFlight(target: OutboundTarget): PolicyCheckResult {
    // Check blocked domains
    for (const blockedDomain of this.policy.blockedDomains) {
      if (this.matchesDomain(target.domain, blockedDomain)) {
        return this.deny(
          "DOMAIN_BLOCKED",
          `Domain ${target.domain} is blocked`
        );
      }
    }

    // Check allowed domains (if set)
    if (this.policy.allowedDomains && this.policy.allowedDomains.length > 0) {
      const isAllowed = this.policy.allowedDomains.some((allowed) =>
        this.matchesDomain(target.domain, allowed)
      );
      if (!isAllowed) {
        return this.deny(
          "DOMAIN_NOT_ALLOWED",
          `Domain ${target.domain} is not in allowed list`
        );
      }
    }

    return { allowed: true };
  }

  /**
   * Check target identity after receiving response token
   */
  async checkTarget(
    target: OutboundTarget,
    responsePayload: GovernanceTokenPayload
  ): Promise<PolicyCheckResult> {
    // Check risk level
    const riskLevel = responsePayload.aigos.governance.risk_level;
    if (exceedsRiskLevel(riskLevel, this.policy.maxTargetRiskLevel)) {
      return this.deny(
        "TARGET_RISK_LEVEL_EXCEEDED",
        `Target risk level ${riskLevel} exceeds maximum ${this.policy.maxTargetRiskLevel}`
      );
    }

    // Check kill switch requirement
    if (
      this.policy.requireTargetKillSwitch &&
      !responsePayload.aigos.control.kill_switch.enabled
    ) {
      return this.deny(
        "TARGET_KILL_SWITCH_REQUIRED",
        "Target agent does not have kill switch enabled"
      );
    }

    // Check Golden Thread verification
    if (
      this.policy.requireTargetGoldenThreadVerified &&
      !responsePayload.aigos.governance.golden_thread.verified
    ) {
      return this.deny(
        "TARGET_GOLDEN_THREAD_NOT_VERIFIED",
        "Target agent Golden Thread is not verified"
      );
    }

    // Check blocked assets
    const assetId = responsePayload.aigos.identity.asset_id;
    if (this.policy.blockedTargetAssets.includes(assetId)) {
      return this.deny(
        "TARGET_ASSET_BLOCKED",
        `Target asset ${assetId} is blocked`
      );
    }

    // Run custom checks
    if (this.policy.customChecks) {
      // Custom checks would need access to identity - simplified for now
      for (const check of this.policy.customChecks) {
        const result = await check(target, null as never);
        if (!result.allowed) {
          return this.deny(
            result.code ?? "CUSTOM_CHECK_FAILED",
            result.reason ?? "Custom policy check failed"
          );
        }
      }
    }

    // All checks passed
    this.emitEvent({
      type: "policy.checked",
      timestamp: new Date().toISOString(),
      instanceId: this.instanceId,
      direction: "outbound",
      peerInstanceId: responsePayload.aigos.identity.instance_id,
      allowed: true,
    });

    return { allowed: true };
  }

  /**
   * Update the policy
   */
  updatePolicy(updates: Partial<OutboundA2APolicy>): void {
    this.policy = {
      ...this.policy,
      ...updates,
    };
  }

  /**
   * Get current policy
   */
  getPolicy(): OutboundA2APolicy {
    return { ...this.policy };
  }

  /**
   * Register an event handler
   */
  onEvent(handler: A2AEventHandler): () => void {
    this.eventHandlers.push(handler);
    return () => {
      const index = this.eventHandlers.indexOf(handler);
      if (index >= 0) {
        this.eventHandlers.splice(index, 1);
      }
    };
  }

  private matchesDomain(domain: string, pattern: string): boolean {
    if (pattern.startsWith("*.")) {
      const suffix = pattern.slice(1); // Remove *
      return domain.endsWith(suffix) || domain === pattern.slice(2);
    }
    return domain === pattern;
  }

  private deny(code: string, reason: string): PolicyCheckResult {
    this.emitEvent({
      type: "policy.violated",
      timestamp: new Date().toISOString(),
      instanceId: this.instanceId,
      direction: "outbound",
      violationCode: code,
      violationMessage: reason,
    });

    return {
      allowed: false,
      code,
      reason,
    };
  }

  private emitEvent(event: A2AEvent): void {
    for (const handler of this.eventHandlers) {
      try {
        handler(event);
      } catch (error) {
        console.error("A2A event handler error:", error);
      }
    }
  }
}

// ─────────────────────────────────────────────────────────────────
// FACTORY FUNCTIONS
// ─────────────────────────────────────────────────────────────────

/**
 * Create an inbound policy checker
 */
export function createInboundPolicyChecker(
  policy: Partial<InboundA2APolicy>
): InboundPolicyChecker {
  return new InboundPolicyChecker(policy);
}

/**
 * Create an outbound policy checker
 */
export function createOutboundPolicyChecker(
  policy: Partial<OutboundA2APolicy>,
  instanceId: string
): OutboundPolicyChecker {
  return new OutboundPolicyChecker(policy, instanceId);
}
