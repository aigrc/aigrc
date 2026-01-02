/**
 * Inbound A2A Policy - SPEC-PRT-003
 *
 * Controls which agents can call this agent.
 */

import type { RiskLevel } from "@aigrc/core";
import type { GovernanceTokenPayload } from "../token/generator.js";

/**
 * Policy decision result
 */
export interface PolicyDecision {
  allowed: boolean;
  reason?: string;
  matchedRule?: string;
}

/**
 * Inbound policy configuration
 */
export interface InboundPolicyConfig {
  /** Maximum risk level allowed for callers */
  maxRiskLevel?: RiskLevel;
  /** Require callers to have kill switch enabled */
  requireKillSwitch?: boolean;
  /** Blocked instance IDs (deny list) */
  blockedInstances?: string[];
  /** Blocked asset IDs (deny list) */
  blockedAssets?: string[];
  /** Trusted instance IDs (allow list - if set, only these are allowed) */
  trustedInstances?: string[];
  /** Trusted asset IDs (allow list - if set, only these are allowed) */
  trustedAssets?: string[];
  /** Required capabilities (caller must have these) */
  requiredCapabilities?: string[];
  /** Maximum generation depth allowed */
  maxGenerationDepth?: number;
  /** Require golden thread verification */
  requireGoldenThreadVerified?: boolean;
  /** Custom validation function */
  customValidator?: (payload: GovernanceTokenPayload) => PolicyDecision | Promise<PolicyDecision>;
}

/**
 * Interface for inbound policy
 */
export interface IA2AInboundPolicy {
  /**
   * Evaluate a caller's token against the policy
   */
  evaluate(callerPayload: GovernanceTokenPayload): Promise<PolicyDecision>;

  /**
   * Update the policy configuration
   */
  updateConfig(config: Partial<InboundPolicyConfig>): void;

  /**
   * Get the current policy configuration
   */
  getConfig(): InboundPolicyConfig;
}

// Risk level ordering for comparison
const RISK_LEVEL_ORDER: Record<RiskLevel, number> = {
  minimal: 0,
  limited: 1,
  high: 2,
  unacceptable: 3,
};

/**
 * Creates an inbound A2A policy
 */
export function createInboundPolicy(
  initialConfig: InboundPolicyConfig = {}
): IA2AInboundPolicy {
  let config = { ...initialConfig };

  return {
    async evaluate(callerPayload: GovernanceTokenPayload): Promise<PolicyDecision> {
      const aigos = callerPayload.aigos;
      const instanceId = aigos.identity.instance_id;
      const assetId = aigos.identity.asset_id;

      // Check blocked lists first (deny takes precedence)
      if (config.blockedInstances?.includes(instanceId)) {
        return {
          allowed: false,
          reason: `Instance ${instanceId} is blocked`,
          matchedRule: "blocked_instance",
        };
      }

      if (config.blockedAssets?.includes(assetId)) {
        return {
          allowed: false,
          reason: `Asset ${assetId} is blocked`,
          matchedRule: "blocked_asset",
        };
      }

      // Check trusted lists (if set, only trusted are allowed)
      if (config.trustedInstances && config.trustedInstances.length > 0) {
        if (!config.trustedInstances.includes(instanceId)) {
          return {
            allowed: false,
            reason: `Instance ${instanceId} is not in trusted list`,
            matchedRule: "trusted_instances_only",
          };
        }
      }

      if (config.trustedAssets && config.trustedAssets.length > 0) {
        if (!config.trustedAssets.includes(assetId)) {
          return {
            allowed: false,
            reason: `Asset ${assetId} is not in trusted list`,
            matchedRule: "trusted_assets_only",
          };
        }
      }

      // Check risk level
      if (config.maxRiskLevel) {
        const callerRisk = aigos.governance.risk_level;
        if (RISK_LEVEL_ORDER[callerRisk] > RISK_LEVEL_ORDER[config.maxRiskLevel]) {
          return {
            allowed: false,
            reason: `Caller risk level ${callerRisk} exceeds maximum ${config.maxRiskLevel}`,
            matchedRule: "max_risk_level",
          };
        }
      }

      // Check kill switch requirement
      if (config.requireKillSwitch && !aigos.control.kill_switch.enabled) {
        return {
          allowed: false,
          reason: "Caller must have kill switch enabled",
          matchedRule: "require_kill_switch",
        };
      }

      // Check generation depth
      if (
        config.maxGenerationDepth !== undefined &&
        aigos.lineage.generation_depth > config.maxGenerationDepth
      ) {
        return {
          allowed: false,
          reason: `Caller generation depth ${aigos.lineage.generation_depth} exceeds maximum ${config.maxGenerationDepth}`,
          matchedRule: "max_generation_depth",
        };
      }

      // Check golden thread verification
      if (config.requireGoldenThreadVerified && !aigos.governance.golden_thread.verified) {
        return {
          allowed: false,
          reason: "Caller must have verified golden thread",
          matchedRule: "require_golden_thread_verified",
        };
      }

      // Check required capabilities
      if (config.requiredCapabilities && config.requiredCapabilities.length > 0) {
        const callerTools = new Set(aigos.capabilities.tools);
        for (const required of config.requiredCapabilities) {
          if (!callerTools.has(required)) {
            return {
              allowed: false,
              reason: `Caller missing required capability: ${required}`,
              matchedRule: "required_capabilities",
            };
          }
        }
      }

      // Run custom validator if provided
      if (config.customValidator) {
        const customResult = await config.customValidator(callerPayload);
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

    updateConfig(newConfig: Partial<InboundPolicyConfig>): void {
      config = { ...config, ...newConfig };
    },

    getConfig(): InboundPolicyConfig {
      return { ...config };
    },
  };
}

/**
 * Creates a restrictive inbound policy (deny by default)
 */
export function createRestrictiveInboundPolicy(
  trustedAssets: string[],
  additionalConfig: Partial<InboundPolicyConfig> = {}
): IA2AInboundPolicy {
  return createInboundPolicy({
    trustedAssets,
    requireKillSwitch: true,
    requireGoldenThreadVerified: true,
    maxRiskLevel: "limited",
    ...additionalConfig,
  });
}

/**
 * Creates a permissive inbound policy (allow most agents)
 */
export function createPermissiveInboundPolicy(
  blockedAssets: string[] = [],
  additionalConfig: Partial<InboundPolicyConfig> = {}
): IA2AInboundPolicy {
  return createInboundPolicy({
    blockedAssets,
    maxRiskLevel: "high",
    ...additionalConfig,
  });
}
