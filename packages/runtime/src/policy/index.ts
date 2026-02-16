/**
 * Policy Engine Module - "The Bouncer"
 * AIGOS-E5: Policy Engine (SPEC-RT-003)
 */

// Types
export type {
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

export { DENIAL_CODES } from "./types.js";

// Policy Engine
export { PolicyEngine, createPolicyEngine } from "./policy-engine.js";
