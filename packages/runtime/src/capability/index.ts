/**
 * Capability Module (SPEC-RT-006)
 * Capability decay and inheritance for spawned child agents
 *
 * AIGOS-E8: Full capability decay implementation
 *
 * Features:
 * - Three capability modes: decay, explicit, inherit (AIGOS-801)
 * - Tool and domain intersection/union logic (AIGOS-802)
 * - Cost limit decay per generation (AIGOS-803)
 * - Explicit capability specification (AIGOS-804)
 * - Inheritance mode for worker patterns (AIGOS-805)
 * - Capability comparison utilities (AIGOS-806)
 * - Escalation detection and prevention
 * - Global deny lists
 *
 * @example
 * ```typescript
 * import { createCapabilityDecayManager } from '@aigrc/runtime';
 *
 * const capabilityManager = createCapabilityDecayManager({
 *   defaultMode: 'decay',
 *   costDecayFactor: 0.8, // 20% reduction per generation
 *   globalDenyTools: ['delete_files', 'execute_code'],
 * });
 *
 * // Compute child capabilities
 * const result = capabilityManager.computeChildCapabilities(
 *   parentIdentity,
 *   {
 *     allowedTools: ['read_file', 'write_file'],
 *     maxCostPerSession: 10.00,
 *   }
 * );
 *
 * if (result.valid) {
 *   // Use result.effectiveCapabilities for child agent
 * } else {
 *   console.error('Capability errors:', result.errors);
 * }
 *
 * // Compare capabilities
 * const comparison = capabilityManager.compareCapabilities(parentCaps, childCaps);
 * if (comparison.hasEscalation) {
 *   console.warn('Child attempted privilege escalation!');
 * }
 * ```
 */

// ─────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────

export type {
  // Modes
  CapabilityMode,
  // Configuration
  CapabilityDecayConfig,
  SpawnCapabilityOptions,
  // Validation
  CapabilityValidationResult,
  CapabilityWarning,
  CapabilityError,
  // Events
  CapabilityEventType,
  CapabilityEvent,
  CapabilityEventHandler,
  CapabilityComputedEvent,
  CapabilityValidatedEvent,
  CapabilityEscalationDeniedEvent,
  CapabilityDecayAppliedEvent,
  // Comparison
  CapabilityComparison,
} from "./types.js";

// ─────────────────────────────────────────────────────────────────
// CLASSES AND FUNCTIONS
// ─────────────────────────────────────────────────────────────────

export {
  CapabilityDecayManager,
  createCapabilityDecayManager,
} from "./capability-decay.js";
