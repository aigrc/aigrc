/**
 * Identity Manager Types (SPEC-RT-002)
 * Types for runtime identity management
 */

import type {
  RuntimeIdentity,
  CapabilitiesManifest,
  Lineage,
  GoldenThread,
  RiskLevel,
  OperatingMode,
} from "@aigrc/core";

// Re-export core types
export type { RuntimeIdentity, CapabilitiesManifest, Lineage, GoldenThread, RiskLevel, OperatingMode };

/**
 * Options for creating a RuntimeIdentity
 */
export interface CreateIdentityOptions {
  /** Path to the asset card YAML file */
  assetCardPath: string;
  /** Parent identity for child agents (optional for root agents) */
  parentIdentity?: RuntimeIdentity;
  /** Override operating mode (default: NORMAL) */
  mode?: OperatingMode;
  /** Custom instance ID (default: auto-generated UUID) */
  instanceId?: string;
  /** Skip Golden Thread verification (for testing) */
  skipVerification?: boolean;
}

/**
 * Result of Golden Thread verification
 */
export interface VerificationResult {
  /** Whether verification passed */
  verified: boolean;
  /** The computed hash */
  computedHash: string;
  /** The expected hash from the asset card */
  expectedHash?: string;
  /** Reason for failure (if any) */
  reason?: string;
  /** Signature verification result (if signature present) */
  signatureVerified?: boolean;
}

/**
 * Options for creating a child identity
 */
export interface SpawnChildOptions {
  /** Path to the child's asset card */
  assetCardPath: string;
  /** Capabilities to grant (subset of parent) */
  capabilities?: Partial<CapabilitiesManifest>;
  /** Operating mode for child (cannot exceed parent) */
  mode?: OperatingMode;
  /** Custom instance ID for child */
  instanceId?: string;
}

/**
 * Mode transition request
 */
export interface ModeTransitionRequest {
  /** Target mode */
  targetMode: OperatingMode;
  /** Reason for transition */
  reason: string;
  /** Authorization token (required for escalating transitions) */
  authToken?: string;
}

/**
 * Mode transition result
 */
export interface ModeTransitionResult {
  /** Whether transition succeeded */
  success: boolean;
  /** Previous mode */
  previousMode: OperatingMode;
  /** Current mode */
  currentMode: OperatingMode;
  /** Reason for failure (if any) */
  reason?: string;
}

/**
 * Identity Manager events
 */
export type IdentityEvent =
  | { type: "identity.created"; identity: RuntimeIdentity }
  | { type: "identity.verified"; identity: RuntimeIdentity; result: VerificationResult }
  | { type: "identity.mode_changed"; identity: RuntimeIdentity; from: OperatingMode; to: OperatingMode }
  | { type: "identity.child_spawned"; parent: RuntimeIdentity; child: RuntimeIdentity }
  | { type: "identity.terminated"; identity: RuntimeIdentity; reason: string };

/**
 * Identity Manager event handler
 */
export type IdentityEventHandler = (event: IdentityEvent) => void | Promise<void>;

/**
 * Identity Manager configuration
 */
export interface IdentityManagerConfig {
  /** Maximum allowed spawn depth (default: 5) */
  maxSpawnDepth: number;
  /** Verification failure mode: SANDBOX or FAIL */
  verificationFailureMode: "SANDBOX" | "FAIL";
  /** Enable telemetry for identity events */
  telemetryEnabled: boolean;
  /** Event handlers */
  eventHandlers: IdentityEventHandler[];
}
