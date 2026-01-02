/**
 * Outbound A2A Policy - SPEC-PRT-003
 *
 * Controls which agents this agent can call.
 */

import type { RiskLevel } from "@aigrc/core";
import type { GovernanceTokenPayload } from "../token/generator.js";
import type { PolicyDecision } from "./inbound.js";

/**
 * Outbound policy configuration
 */
export interface OutboundPolicyConfig {
  /** Maximum risk level allowed for targets */
  maxTargetRiskLevel?: RiskLevel;
  /** Require targets to have kill switch enabled */
  requireTargetKillSwitch?: boolean;
  /** Blocked target instance IDs (deny list) */
  blockedTargetInstances?: string[];
  /** Blocked target asset IDs (deny list) */
  blockedTargetAssets?: string[];
  /** Allowed target instance IDs (allow list - if set, only these are allowed) */
  allowedTargetInstances?: string[];
  /** Allowed target asset IDs (allow list - if set, only these are allowed) */
  allowedTargetAssets?: string[];
  /** Allowed domains for outbound calls */
  allowedDomains?: string[];
  /** Blocked domains for outbound calls */
  blockedDomains?: string[];
  /** Require target to have verified golden thread */
  requireTargetGoldenThreadVerified?: boolean;
  /** Custom validation function */
  customValidator?: (
    targetPayload: GovernanceTokenPayload,
    targetUrl?: string
  ) => PolicyDecision | Promise<PolicyDecision>;
}

/**
 * Interface for outbound policy
 */
export interface IA2AOutboundPolicy {
  /**
   * Evaluate if we can call a target based on their token
   */
  evaluateTarget(targetPayload: GovernanceTokenPayload): Promise<PolicyDecision>;

  /**
   * Evaluate if we can call a target URL before making the request
   */
  evaluateUrl(url: string): PolicyDecision;

  /**
   * Update the policy configuration
   */
  updateConfig(config: Partial<OutboundPolicyConfig>): void;

  /**
   * Get the current policy configuration
   */
  getConfig(): OutboundPolicyConfig;
}

// Risk level ordering for comparison
const RISK_LEVEL_ORDER: Record<RiskLevel, number> = {
  minimal: 0,
  limited: 1,
  high: 2,
  unacceptable: 3,
};

/**
 * Extract domain from URL
 */
function extractDomain(url: string): string | null {
  try {
    const parsed = new URL(url);
    return parsed.hostname;
  } catch {
    return null;
  }
}

/**
 * Check if domain matches a pattern (supports wildcard *)
 */
function domainMatches(domain: string, pattern: string): boolean {
  if (pattern === "*") return true;
  if (pattern.startsWith("*.")) {
    const suffix = pattern.slice(2);
    return domain === suffix || domain.endsWith("." + suffix);
  }
  return domain === pattern;
}

/**
 * Creates an outbound A2A policy
 */
export function createOutboundPolicy(
  initialConfig: OutboundPolicyConfig = {}
): IA2AOutboundPolicy {
  let config = { ...initialConfig };

  return {
    async evaluateTarget(
      targetPayload: GovernanceTokenPayload
    ): Promise<PolicyDecision> {
      const aigos = targetPayload.aigos;
      const instanceId = aigos.identity.instance_id;
      const assetId = aigos.identity.asset_id;

      // Check blocked lists first
      if (config.blockedTargetInstances?.includes(instanceId)) {
        return {
          allowed: false,
          reason: `Target instance ${instanceId} is blocked`,
          matchedRule: "blocked_target_instance",
        };
      }

      if (config.blockedTargetAssets?.includes(assetId)) {
        return {
          allowed: false,
          reason: `Target asset ${assetId} is blocked`,
          matchedRule: "blocked_target_asset",
        };
      }

      // Check allowed lists
      if (config.allowedTargetInstances && config.allowedTargetInstances.length > 0) {
        if (!config.allowedTargetInstances.includes(instanceId)) {
          return {
            allowed: false,
            reason: `Target instance ${instanceId} is not in allowed list`,
            matchedRule: "allowed_target_instances_only",
          };
        }
      }

      if (config.allowedTargetAssets && config.allowedTargetAssets.length > 0) {
        if (!config.allowedTargetAssets.includes(assetId)) {
          return {
            allowed: false,
            reason: `Target asset ${assetId} is not in allowed list`,
            matchedRule: "allowed_target_assets_only",
          };
        }
      }

      // Check target risk level
      if (config.maxTargetRiskLevel) {
        const targetRisk = aigos.governance.risk_level;
        if (RISK_LEVEL_ORDER[targetRisk] > RISK_LEVEL_ORDER[config.maxTargetRiskLevel]) {
          return {
            allowed: false,
            reason: `Target risk level ${targetRisk} exceeds maximum ${config.maxTargetRiskLevel}`,
            matchedRule: "max_target_risk_level",
          };
        }
      }

      // Check kill switch requirement
      if (config.requireTargetKillSwitch && !aigos.control.kill_switch.enabled) {
        return {
          allowed: false,
          reason: "Target must have kill switch enabled",
          matchedRule: "require_target_kill_switch",
        };
      }

      // Check golden thread verification
      if (
        config.requireTargetGoldenThreadVerified &&
        !aigos.governance.golden_thread.verified
      ) {
        return {
          allowed: false,
          reason: "Target must have verified golden thread",
          matchedRule: "require_target_golden_thread_verified",
        };
      }

      // Run custom validator if provided
      if (config.customValidator) {
        const customResult = await config.customValidator(targetPayload);
        if (!customResult.allowed) {
          return {
            ...customResult,
            matchedRule: customResult.matchedRule ?? "custom_validator",
          };
        }
      }

      return {
        allowed: true,
        matchedRule: "default_allow",
      };
    },

    evaluateUrl(url: string): PolicyDecision {
      const domain = extractDomain(url);
      if (!domain) {
        return {
          allowed: false,
          reason: "Invalid URL",
          matchedRule: "invalid_url",
        };
      }

      // Check blocked domains first
      if (config.blockedDomains) {
        for (const pattern of config.blockedDomains) {
          if (domainMatches(domain, pattern)) {
            return {
              allowed: false,
              reason: `Domain ${domain} matches blocked pattern ${pattern}`,
              matchedRule: "blocked_domain",
            };
          }
        }
      }

      // Check allowed domains (if set, only these are allowed)
      if (config.allowedDomains && config.allowedDomains.length > 0) {
        const isAllowed = config.allowedDomains.some((pattern) =>
          domainMatches(domain, pattern)
        );
        if (!isAllowed) {
          return {
            allowed: false,
            reason: `Domain ${domain} is not in allowed domains`,
            matchedRule: "allowed_domains_only",
          };
        }
      }

      return {
        allowed: true,
        matchedRule: "default_allow",
      };
    },

    updateConfig(newConfig: Partial<OutboundPolicyConfig>): void {
      config = { ...config, ...newConfig };
    },

    getConfig(): OutboundPolicyConfig {
      return { ...config };
    },
  };
}

/**
 * Creates a restrictive outbound policy
 */
export function createRestrictiveOutboundPolicy(
  allowedDomains: string[],
  additionalConfig: Partial<OutboundPolicyConfig> = {}
): IA2AOutboundPolicy {
  return createOutboundPolicy({
    allowedDomains,
    requireTargetKillSwitch: true,
    requireTargetGoldenThreadVerified: true,
    maxTargetRiskLevel: "limited",
    ...additionalConfig,
  });
}

/**
 * Creates a permissive outbound policy
 */
export function createPermissiveOutboundPolicy(
  blockedDomains: string[] = [],
  additionalConfig: Partial<OutboundPolicyConfig> = {}
): IA2AOutboundPolicy {
  return createOutboundPolicy({
    blockedDomains,
    maxTargetRiskLevel: "high",
    ...additionalConfig,
  });
}
