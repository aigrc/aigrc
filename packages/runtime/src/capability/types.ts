/**
 * Capability Decay Types (SPEC-RT-006)
 * Types for capability inheritance and decay
 */

import type { CapabilitiesManifest, RuntimeIdentity } from "@aigrc/core";

// ─────────────────────────────────────────────────────────────────
// CAPABILITY MODES
// ─────────────────────────────────────────────────────────────────

/**
 * Capability inheritance mode
 * AIGOS-801
 */
export type CapabilityMode = "decay" | "explicit" | "inherit";

/**
 * Decay mode: Child capabilities are intersection of parent and child definitions
 * - Child cannot have more permissions than parent
 * - Denied lists are merged (union)
 * - Limits are minimum of parent and child
 *
 * Explicit mode: Child capabilities are exactly as specified in spawn options
 * - No automatic inheritance from parent
 * - Child must explicitly request all capabilities
 * - Parent can still restrict but not expand
 *
 * Inherit mode: Child capabilities are copied from parent
 * - Child gets same capabilities as parent (minus spawn depth decrement)
 * - Useful for worker/delegate patterns
 */

// ─────────────────────────────────────────────────────────────────
// CAPABILITY DECAY CONFIGURATION
// ─────────────────────────────────────────────────────────────────

/**
 * Configuration for capability decay
 */
export interface CapabilityDecayConfig {
  /** Default capability mode for child agents */
  defaultMode: CapabilityMode;

  /** Whether to automatically reduce tool access with each generation */
  autoReduceTools: boolean;

  /** Tools to always deny for child agents (regardless of parent) */
  globalDenyTools: string[];

  /** Domains to always deny for child agents */
  globalDenyDomains: string[];

  /** Maximum cost multiplier reduction per generation (0-1) */
  costDecayFactor: number;

  /** Minimum tools a child must have (prevents over-decay) */
  minChildTools: string[];

  /** Whether to emit events on capability changes */
  emitEvents: boolean;

  /** Event handlers */
  eventHandlers: CapabilityEventHandler[];
}

// ─────────────────────────────────────────────────────────────────
// SPAWN CAPABILITY OPTIONS
// ─────────────────────────────────────────────────────────────────

/**
 * Options for specifying child capabilities during spawn
 * AIGOS-802
 */
export interface SpawnCapabilityOptions {
  /** Capability mode for this child */
  mode?: CapabilityMode;

  /** Specific tools to allow (explicit mode) */
  allowedTools?: string[];

  /** Additional tools to deny */
  deniedTools?: string[];

  /** Specific domains to allow (explicit mode) */
  allowedDomains?: string[];

  /** Additional domains to deny */
  deniedDomains?: string[];

  /** Override max cost per session */
  maxCostPerSession?: number;

  /** Override max cost per day */
  maxCostPerDay?: number;

  /** Override max tokens per call */
  maxTokensPerCall?: number;

  /** Whether this child can spawn its own children */
  maySpawnChildren?: boolean;

  /** Max depth this child can spawn to (relative to its own depth) */
  maxChildDepth?: number;
}

// ─────────────────────────────────────────────────────────────────
// CAPABILITY VALIDATION
// ─────────────────────────────────────────────────────────────────

/**
 * Result of capability validation
 */
export interface CapabilityValidationResult {
  valid: boolean;
  effectiveCapabilities: CapabilitiesManifest;
  warnings: CapabilityWarning[];
  errors: CapabilityError[];
}

/**
 * Capability warning (non-blocking)
 */
export interface CapabilityWarning {
  code: string;
  message: string;
  field: string;
  originalValue: unknown;
  adjustedValue: unknown;
}

/**
 * Capability error (blocking in strict mode)
 */
export interface CapabilityError {
  code: string;
  message: string;
  field: string;
  requestedValue: unknown;
  parentValue: unknown;
}

// ─────────────────────────────────────────────────────────────────
// EVENTS
// ─────────────────────────────────────────────────────────────────

/**
 * Capability event types
 */
export type CapabilityEventType =
  | "capability.computed"
  | "capability.validated"
  | "capability.escalation_denied"
  | "capability.decay_applied";

/**
 * Base capability event
 */
export interface BaseCapabilityEvent {
  type: CapabilityEventType;
  timestamp: string;
  parentIdentity: RuntimeIdentity;
}

/**
 * Capability computed event
 */
export interface CapabilityComputedEvent extends BaseCapabilityEvent {
  type: "capability.computed";
  mode: CapabilityMode;
  requestedCapabilities: SpawnCapabilityOptions;
  effectiveCapabilities: CapabilitiesManifest;
}

/**
 * Capability validated event
 */
export interface CapabilityValidatedEvent extends BaseCapabilityEvent {
  type: "capability.validated";
  validation: CapabilityValidationResult;
}

/**
 * Escalation denied event
 */
export interface CapabilityEscalationDeniedEvent extends BaseCapabilityEvent {
  type: "capability.escalation_denied";
  field: string;
  requestedValue: unknown;
  parentValue: unknown;
  reason: string;
}

/**
 * Decay applied event
 */
export interface CapabilityDecayAppliedEvent extends BaseCapabilityEvent {
  type: "capability.decay_applied";
  generation: number;
  decayFactor: number;
  originalLimits: Partial<CapabilitiesManifest>;
  decayedLimits: Partial<CapabilitiesManifest>;
}

/**
 * Union of all capability events
 */
export type CapabilityEvent =
  | CapabilityComputedEvent
  | CapabilityValidatedEvent
  | CapabilityEscalationDeniedEvent
  | CapabilityDecayAppliedEvent;

/**
 * Capability event handler
 */
export type CapabilityEventHandler = (event: CapabilityEvent) => void | Promise<void>;

// ─────────────────────────────────────────────────────────────────
// CAPABILITY COMPARISON
// ─────────────────────────────────────────────────────────────────

/**
 * Comparison of two capability manifests
 */
export interface CapabilityComparison {
  /** Tools added in child (should be empty in decay mode) */
  addedTools: string[];

  /** Tools removed in child */
  removedTools: string[];

  /** Domains added in child (should be empty in decay mode) */
  addedDomains: string[];

  /** Domains removed in child */
  removedDomains: string[];

  /** Limits that were increased (escalation) */
  increasedLimits: string[];

  /** Limits that were decreased (decay) */
  decreasedLimits: string[];

  /** Whether child has equal or lesser capabilities */
  isDecayed: boolean;

  /** Whether child attempted privilege escalation */
  hasEscalation: boolean;
}
