/**
 * Capability Decay Manager (SPEC-RT-006)
 * Enforces capability inheritance rules for spawned child agents
 */

import type { CapabilitiesManifest, RuntimeIdentity } from "@aigrc/core";
import type {
  CapabilityMode,
  CapabilityDecayConfig,
  SpawnCapabilityOptions,
  CapabilityValidationResult,
  CapabilityWarning,
  CapabilityError,
  CapabilityEvent,
  CapabilityEventHandler,
  CapabilityComparison,
} from "./types.js";

// ─────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────

/** Default configuration */
const DEFAULT_CONFIG: CapabilityDecayConfig = {
  defaultMode: "decay",
  autoReduceTools: false,
  globalDenyTools: [],
  globalDenyDomains: [],
  costDecayFactor: 0.8, // 20% reduction per generation
  minChildTools: [],
  emitEvents: true,
  eventHandlers: [],
};

/** Default wildcard for "all allowed" */
const WILDCARD = "*";

// ─────────────────────────────────────────────────────────────────
// CAPABILITY DECAY MANAGER CLASS
// ─────────────────────────────────────────────────────────────────

/**
 * Capability Decay Manager - enforces capability inheritance rules
 * AIGOS-801 through AIGOS-808
 */
export class CapabilityDecayManager {
  private config: CapabilityDecayConfig;

  constructor(config: Partial<CapabilityDecayConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Compute capabilities for a child agent
   * AIGOS-801: Mode-based computation
   *
   * @param parentIdentity - Parent agent's identity
   * @param options - Child capability options
   * @returns Validated capability manifest for the child
   */
  computeChildCapabilities(
    parentIdentity: RuntimeIdentity,
    options: SpawnCapabilityOptions = {}
  ): CapabilityValidationResult {
    const mode = options.mode ?? this.config.defaultMode;
    const parentCaps = parentIdentity.capabilities_manifest;

    let effectiveCapabilities: CapabilitiesManifest;
    const warnings: CapabilityWarning[] = [];
    const errors: CapabilityError[] = [];

    switch (mode) {
      case "decay":
        effectiveCapabilities = this.computeDecayCapabilities(
          parentCaps,
          options,
          parentIdentity.lineage.generation_depth,
          warnings,
          errors
        );
        break;

      case "explicit":
        effectiveCapabilities = this.computeExplicitCapabilities(
          parentCaps,
          options,
          warnings,
          errors
        );
        break;

      case "inherit":
        effectiveCapabilities = this.computeInheritCapabilities(
          parentCaps,
          parentIdentity.lineage.generation_depth,
          warnings
        );
        break;
    }

    // Apply global denials
    effectiveCapabilities = this.applyGlobalDenials(effectiveCapabilities);

    const result: CapabilityValidationResult = {
      valid: errors.length === 0,
      effectiveCapabilities,
      warnings,
      errors,
    };

    // Emit events
    if (this.config.emitEvents) {
      this.emitEvent({
        type: "capability.computed",
        timestamp: new Date().toISOString(),
        parentIdentity,
        mode,
        requestedCapabilities: options,
        effectiveCapabilities,
      });

      this.emitEvent({
        type: "capability.validated",
        timestamp: new Date().toISOString(),
        parentIdentity,
        validation: result,
      });
    }

    return result;
  }

  /**
   * Compute capabilities in DECAY mode
   * AIGOS-802: Intersection-based capability decay
   */
  private computeDecayCapabilities(
    parentCaps: CapabilitiesManifest,
    options: SpawnCapabilityOptions,
    generation: number,
    warnings: CapabilityWarning[],
    errors: CapabilityError[]
  ): CapabilitiesManifest {
    // Start with parent capabilities
    const childCaps: CapabilitiesManifest = {
      ...parentCaps,
      capability_mode: "decay",
    };

    // Compute allowed tools (intersection)
    if (options.allowedTools && options.allowedTools.length > 0) {
      childCaps.allowed_tools = this.intersectArrays(
        parentCaps.allowed_tools,
        options.allowedTools
      );

      // Check for escalation attempts
      const attempted = this.findEscalation(
        parentCaps.allowed_tools,
        options.allowedTools
      );
      if (attempted.length > 0) {
        errors.push({
          code: "TOOL_ESCALATION",
          message: `Attempted to grant tools not available to parent: ${attempted.join(", ")}`,
          field: "allowed_tools",
          requestedValue: options.allowedTools,
          parentValue: parentCaps.allowed_tools,
        });
      }
    }

    // Merge denied tools (union)
    if (options.deniedTools && options.deniedTools.length > 0) {
      childCaps.denied_tools = this.unionArrays(
        parentCaps.denied_tools,
        options.deniedTools
      );
    }

    // Compute allowed domains (intersection)
    if (options.allowedDomains && options.allowedDomains.length > 0) {
      childCaps.allowed_domains = this.intersectArrays(
        parentCaps.allowed_domains,
        options.allowedDomains
      );

      const attempted = this.findEscalation(
        parentCaps.allowed_domains,
        options.allowedDomains
      );
      if (attempted.length > 0) {
        errors.push({
          code: "DOMAIN_ESCALATION",
          message: `Attempted to grant domains not available to parent: ${attempted.join(", ")}`,
          field: "allowed_domains",
          requestedValue: options.allowedDomains,
          parentValue: parentCaps.allowed_domains,
        });
      }
    }

    // Merge denied domains (union)
    if (options.deniedDomains && options.deniedDomains.length > 0) {
      childCaps.denied_domains = this.unionArrays(
        parentCaps.denied_domains,
        options.deniedDomains
      );
    }

    // Apply cost decay (AIGOS-803)
    const decayFactor = Math.pow(this.config.costDecayFactor, generation);
    this.applyLimitDecay(childCaps, parentCaps, options, decayFactor, warnings, errors);

    // Spawn depth decrement
    childCaps.max_child_depth = Math.max(
      0,
      parentCaps.max_child_depth - 1
    );

    // Handle spawn permission
    if (options.maySpawnChildren === false) {
      childCaps.may_spawn_children = false;
    } else if (options.maySpawnChildren === true && !parentCaps.may_spawn_children) {
      // Cannot grant spawn permission if parent doesn't have it
      warnings.push({
        code: "SPAWN_PERMISSION_DENIED",
        message: "Cannot grant spawn permission when parent lacks it",
        field: "may_spawn_children",
        originalValue: true,
        adjustedValue: false,
      });
      childCaps.may_spawn_children = false;
    }

    return childCaps;
  }

  /**
   * Compute capabilities in EXPLICIT mode
   * AIGOS-804: Explicit capability specification
   */
  private computeExplicitCapabilities(
    parentCaps: CapabilitiesManifest,
    options: SpawnCapabilityOptions,
    warnings: CapabilityWarning[],
    errors: CapabilityError[]
  ): CapabilitiesManifest {
    // Start with minimal capabilities
    const childCaps: CapabilitiesManifest = {
      allowed_tools: options.allowedTools ?? [],
      denied_tools: options.deniedTools ?? [],
      allowed_domains: options.allowedDomains ?? [],
      denied_domains: options.deniedDomains ?? [],
      may_spawn_children: options.maySpawnChildren ?? false,
      max_child_depth: options.maxChildDepth ?? 0,
      capability_mode: "explicit",
    };

    // Validate against parent (cannot exceed parent capabilities)

    // Tools: child's allowed must be subset of parent's allowed
    const toolEscalation = this.findEscalation(
      parentCaps.allowed_tools,
      childCaps.allowed_tools
    );
    if (toolEscalation.length > 0) {
      errors.push({
        code: "TOOL_ESCALATION",
        message: `Child cannot have tools parent lacks: ${toolEscalation.join(", ")}`,
        field: "allowed_tools",
        requestedValue: childCaps.allowed_tools,
        parentValue: parentCaps.allowed_tools,
      });
      // Filter out escalated tools
      childCaps.allowed_tools = childCaps.allowed_tools.filter(
        (t) => !toolEscalation.includes(t)
      );
    }

    // Domains: child's allowed must be subset of parent's allowed
    const domainEscalation = this.findEscalation(
      parentCaps.allowed_domains,
      childCaps.allowed_domains
    );
    if (domainEscalation.length > 0) {
      errors.push({
        code: "DOMAIN_ESCALATION",
        message: `Child cannot have domains parent lacks: ${domainEscalation.join(", ")}`,
        field: "allowed_domains",
        requestedValue: childCaps.allowed_domains,
        parentValue: parentCaps.allowed_domains,
      });
      childCaps.allowed_domains = childCaps.allowed_domains.filter(
        (d) => !domainEscalation.includes(d)
      );
    }

    // Must also include parent's denied items
    childCaps.denied_tools = this.unionArrays(
      childCaps.denied_tools,
      parentCaps.denied_tools
    );
    childCaps.denied_domains = this.unionArrays(
      childCaps.denied_domains,
      parentCaps.denied_domains
    );

    // Validate and apply limits (cannot exceed parent)
    this.applyLimitConstraints(childCaps, parentCaps, options, warnings, errors);

    // Spawn depth cannot exceed parent's remaining depth
    const maxAllowedDepth = parentCaps.max_child_depth - 1;
    if (childCaps.max_child_depth > maxAllowedDepth) {
      warnings.push({
        code: "DEPTH_EXCEEDED",
        message: `Requested depth ${childCaps.max_child_depth} exceeds max ${maxAllowedDepth}`,
        field: "max_child_depth",
        originalValue: childCaps.max_child_depth,
        adjustedValue: maxAllowedDepth,
      });
      childCaps.max_child_depth = Math.max(0, maxAllowedDepth);
    }

    // Spawn permission
    if (childCaps.may_spawn_children && !parentCaps.may_spawn_children) {
      warnings.push({
        code: "SPAWN_PERMISSION_DENIED",
        message: "Cannot grant spawn permission when parent lacks it",
        field: "may_spawn_children",
        originalValue: true,
        adjustedValue: false,
      });
      childCaps.may_spawn_children = false;
    }

    return childCaps;
  }

  /**
   * Compute capabilities in INHERIT mode
   * AIGOS-805: Copy parent capabilities
   */
  private computeInheritCapabilities(
    parentCaps: CapabilitiesManifest,
    generation: number,
    warnings: CapabilityWarning[]
  ): CapabilitiesManifest {
    const childCaps: CapabilitiesManifest = {
      ...parentCaps,
      capability_mode: "inherit",
      // Always decrement max_child_depth
      max_child_depth: Math.max(0, parentCaps.max_child_depth - 1),
    };

    // Optionally apply cost decay even in inherit mode
    if (this.config.costDecayFactor < 1) {
      const decayFactor = Math.pow(this.config.costDecayFactor, generation);

      if (parentCaps.max_cost_per_session != null) {
        const original = parentCaps.max_cost_per_session;
        childCaps.max_cost_per_session = original * decayFactor;
        if (childCaps.max_cost_per_session !== original) {
          warnings.push({
            code: "COST_DECAYED",
            message: `Session cost limit decayed by factor ${decayFactor.toFixed(2)}`,
            field: "max_cost_per_session",
            originalValue: original,
            adjustedValue: childCaps.max_cost_per_session,
          });
        }
      }

      if (parentCaps.max_cost_per_day != null) {
        const original = parentCaps.max_cost_per_day;
        childCaps.max_cost_per_day = original * decayFactor;
      }
    }

    return childCaps;
  }

  /**
   * Apply limit decay based on generation
   * AIGOS-803
   */
  private applyLimitDecay(
    childCaps: CapabilitiesManifest,
    parentCaps: CapabilitiesManifest,
    options: SpawnCapabilityOptions,
    decayFactor: number,
    warnings: CapabilityWarning[],
    errors: CapabilityError[]
  ): void {
    // Session cost limit
    if (options.maxCostPerSession !== undefined) {
      const parentLimit = parentCaps.max_cost_per_session;
      if (parentLimit != null && options.maxCostPerSession > parentLimit) {
        errors.push({
          code: "COST_ESCALATION",
          message: `Requested session cost ${options.maxCostPerSession} exceeds parent limit ${parentLimit}`,
          field: "max_cost_per_session",
          requestedValue: options.maxCostPerSession,
          parentValue: parentLimit,
        });
        childCaps.max_cost_per_session = parentLimit * decayFactor;
      } else {
        childCaps.max_cost_per_session = Math.min(
          options.maxCostPerSession,
          (parentLimit ?? options.maxCostPerSession) * decayFactor
        );
      }
    } else if (parentCaps.max_cost_per_session != null) {
      childCaps.max_cost_per_session = parentCaps.max_cost_per_session * decayFactor;
      warnings.push({
        code: "COST_DECAYED",
        message: `Session cost auto-decayed by factor ${decayFactor.toFixed(2)}`,
        field: "max_cost_per_session",
        originalValue: parentCaps.max_cost_per_session,
        adjustedValue: childCaps.max_cost_per_session,
      });
    }

    // Daily cost limit
    if (options.maxCostPerDay !== undefined) {
      const parentLimit = parentCaps.max_cost_per_day;
      if (parentLimit != null && options.maxCostPerDay > parentLimit) {
        errors.push({
          code: "COST_ESCALATION",
          message: `Requested daily cost ${options.maxCostPerDay} exceeds parent limit ${parentLimit}`,
          field: "max_cost_per_day",
          requestedValue: options.maxCostPerDay,
          parentValue: parentLimit,
        });
        childCaps.max_cost_per_day = parentLimit * decayFactor;
      } else {
        childCaps.max_cost_per_day = Math.min(
          options.maxCostPerDay,
          (parentLimit ?? options.maxCostPerDay) * decayFactor
        );
      }
    } else if (parentCaps.max_cost_per_day != null) {
      childCaps.max_cost_per_day = parentCaps.max_cost_per_day * decayFactor;
    }

    // Token limit (no decay, just constraint)
    if (options.maxTokensPerCall !== undefined) {
      const parentLimit = parentCaps.max_tokens_per_call;
      if (parentLimit != null && options.maxTokensPerCall > parentLimit) {
        errors.push({
          code: "TOKEN_ESCALATION",
          message: `Requested token limit ${options.maxTokensPerCall} exceeds parent limit ${parentLimit}`,
          field: "max_tokens_per_call",
          requestedValue: options.maxTokensPerCall,
          parentValue: parentLimit,
        });
        childCaps.max_tokens_per_call = parentLimit;
      } else {
        childCaps.max_tokens_per_call = options.maxTokensPerCall;
      }
    }
  }

  /**
   * Apply limit constraints without decay (for explicit mode)
   */
  private applyLimitConstraints(
    childCaps: CapabilitiesManifest,
    parentCaps: CapabilitiesManifest,
    options: SpawnCapabilityOptions,
    warnings: CapabilityWarning[],
    errors: CapabilityError[]
  ): void {
    // Session cost
    if (options.maxCostPerSession !== undefined) {
      const parentLimit = parentCaps.max_cost_per_session;
      if (parentLimit != null && options.maxCostPerSession > parentLimit) {
        errors.push({
          code: "COST_ESCALATION",
          message: `Session cost ${options.maxCostPerSession} exceeds parent ${parentLimit}`,
          field: "max_cost_per_session",
          requestedValue: options.maxCostPerSession,
          parentValue: parentLimit,
        });
        childCaps.max_cost_per_session = parentLimit;
      } else {
        childCaps.max_cost_per_session = options.maxCostPerSession;
      }
    }

    // Daily cost
    if (options.maxCostPerDay !== undefined) {
      const parentLimit = parentCaps.max_cost_per_day;
      if (parentLimit != null && options.maxCostPerDay > parentLimit) {
        errors.push({
          code: "COST_ESCALATION",
          message: `Daily cost ${options.maxCostPerDay} exceeds parent ${parentLimit}`,
          field: "max_cost_per_day",
          requestedValue: options.maxCostPerDay,
          parentValue: parentLimit,
        });
        childCaps.max_cost_per_day = parentLimit;
      } else {
        childCaps.max_cost_per_day = options.maxCostPerDay;
      }
    }

    // Token limit
    if (options.maxTokensPerCall !== undefined) {
      const parentLimit = parentCaps.max_tokens_per_call;
      if (parentLimit != null && options.maxTokensPerCall > parentLimit) {
        errors.push({
          code: "TOKEN_ESCALATION",
          message: `Token limit ${options.maxTokensPerCall} exceeds parent ${parentLimit}`,
          field: "max_tokens_per_call",
          requestedValue: options.maxTokensPerCall,
          parentValue: parentLimit,
        });
        childCaps.max_tokens_per_call = parentLimit;
      } else {
        childCaps.max_tokens_per_call = options.maxTokensPerCall;
      }
    }
  }

  /**
   * Apply global denials from configuration
   */
  private applyGlobalDenials(caps: CapabilitiesManifest): CapabilitiesManifest {
    return {
      ...caps,
      denied_tools: this.unionArrays(
        caps.denied_tools,
        this.config.globalDenyTools
      ),
      denied_domains: this.unionArrays(
        caps.denied_domains,
        this.config.globalDenyDomains
      ),
    };
  }

  /**
   * Compare two capability manifests
   * AIGOS-806: Capability comparison
   */
  compareCapabilities(
    parentCaps: CapabilitiesManifest,
    childCaps: CapabilitiesManifest
  ): CapabilityComparison {
    const addedTools = this.findEscalation(
      parentCaps.allowed_tools,
      childCaps.allowed_tools
    );
    const removedTools = this.findRemoved(
      parentCaps.allowed_tools,
      childCaps.allowed_tools
    );

    const addedDomains = this.findEscalation(
      parentCaps.allowed_domains,
      childCaps.allowed_domains
    );
    const removedDomains = this.findRemoved(
      parentCaps.allowed_domains,
      childCaps.allowed_domains
    );

    const increasedLimits: string[] = [];
    const decreasedLimits: string[] = [];

    // Check limits
    if (
      childCaps.max_cost_per_session != null &&
      parentCaps.max_cost_per_session != null &&
      childCaps.max_cost_per_session > parentCaps.max_cost_per_session
    ) {
      increasedLimits.push("max_cost_per_session");
    } else if (
      childCaps.max_cost_per_session != null &&
      parentCaps.max_cost_per_session != null &&
      childCaps.max_cost_per_session < parentCaps.max_cost_per_session
    ) {
      decreasedLimits.push("max_cost_per_session");
    }

    if (
      childCaps.max_cost_per_day != null &&
      parentCaps.max_cost_per_day != null &&
      childCaps.max_cost_per_day > parentCaps.max_cost_per_day
    ) {
      increasedLimits.push("max_cost_per_day");
    } else if (
      childCaps.max_cost_per_day != null &&
      parentCaps.max_cost_per_day != null &&
      childCaps.max_cost_per_day < parentCaps.max_cost_per_day
    ) {
      decreasedLimits.push("max_cost_per_day");
    }

    if (childCaps.max_child_depth > parentCaps.max_child_depth) {
      increasedLimits.push("max_child_depth");
    } else if (childCaps.max_child_depth < parentCaps.max_child_depth) {
      decreasedLimits.push("max_child_depth");
    }

    const hasEscalation =
      addedTools.length > 0 ||
      addedDomains.length > 0 ||
      increasedLimits.length > 0 ||
      (childCaps.may_spawn_children && !parentCaps.may_spawn_children);

    const isDecayed =
      !hasEscalation &&
      (removedTools.length > 0 ||
        removedDomains.length > 0 ||
        decreasedLimits.length > 0);

    return {
      addedTools,
      removedTools,
      addedDomains,
      removedDomains,
      increasedLimits,
      decreasedLimits,
      isDecayed,
      hasEscalation,
    };
  }

  /**
   * Register event handler
   */
  onEvent(handler: CapabilityEventHandler): void {
    this.config.eventHandlers.push(handler);
  }

  /**
   * Emit event to all handlers
   */
  private async emitEvent(event: CapabilityEvent): Promise<void> {
    for (const handler of this.config.eventHandlers) {
      try {
        await handler(event);
      } catch (error) {
        console.error("[CAPABILITY] Event handler error:", error);
      }
    }
  }

  // ─────────────────────────────────────────────────────────────────
  // UTILITY METHODS
  // ─────────────────────────────────────────────────────────────────

  /**
   * Intersect two arrays, handling wildcards
   */
  private intersectArrays(parent: string[], child: string[]): string[] {
    // Wildcard in parent means child can have anything
    if (parent.includes(WILDCARD)) {
      return child;
    }
    // Wildcard in child means inherit all from parent
    if (child.includes(WILDCARD)) {
      return parent;
    }
    // Normal intersection
    const parentSet = new Set(parent);
    return child.filter((item) => parentSet.has(item));
  }

  /**
   * Union two arrays
   */
  private unionArrays(a: string[], b: string[]): string[] {
    return [...new Set([...a, ...b])];
  }

  /**
   * Find items in child that are not in parent (escalation)
   */
  private findEscalation(parent: string[], child: string[]): string[] {
    // Wildcard in parent means no escalation possible
    if (parent.includes(WILDCARD)) {
      return [];
    }
    // Wildcard in child when parent doesn't have it is escalation
    if (child.includes(WILDCARD) && !parent.includes(WILDCARD)) {
      return [WILDCARD];
    }
    const parentSet = new Set(parent);
    return child.filter((item) => !parentSet.has(item));
  }

  /**
   * Find items in parent that are not in child (removed)
   */
  private findRemoved(parent: string[], child: string[]): string[] {
    // Wildcard in child means nothing removed
    if (child.includes(WILDCARD)) {
      return [];
    }
    // If parent had wildcard but child doesn't, "everything" was removed
    if (parent.includes(WILDCARD)) {
      return [WILDCARD]; // Symbolic - wildcard was removed
    }
    const childSet = new Set(child);
    return parent.filter((item) => !childSet.has(item));
  }
}

// ─────────────────────────────────────────────────────────────────
// FACTORY FUNCTION
// ─────────────────────────────────────────────────────────────────

/**
 * Create a Capability Decay Manager instance
 */
export function createCapabilityDecayManager(
  config?: Partial<CapabilityDecayConfig>
): CapabilityDecayManager {
  return new CapabilityDecayManager(config);
}
