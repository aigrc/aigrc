/**
 * Identity Manager Module
 * AIGOS-E4: Identity Manager (SPEC-RT-002)
 */

// Core types
export type {
  RuntimeIdentity,
  CapabilitiesManifest,
  Lineage,
  GoldenThread,
  RiskLevel,
  OperatingMode,
  CreateIdentityOptions,
  VerificationResult,
  SpawnChildOptions,
  ModeTransitionRequest,
  ModeTransitionResult,
  IdentityEvent,
  IdentityEventHandler,
  IdentityManagerConfig,
} from "./types.js";

// Identity Manager
export {
  IdentityManager,
  IdentityError,
  createIdentityManager,
  createRuntimeIdentity,
} from "./identity-manager.js";

// Guard decorator and utilities
export {
  guard,
  configureGuard,
  getCurrentIdentity,
  checkGuard,
  guardAsync,
  GovernanceError,
  type GuardContext,
  type GuardCheckResult,
  type PolicyChecker,
} from "./guard.js";
