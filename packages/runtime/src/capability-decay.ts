import type { RuntimeIdentity, RiskLevel, OperatingMode, CapabilitiesManifest } from "@aigrc/core";

// ─────────────────────────────────────────────────────────────────
// CAPABILITY DECAY (SPEC-RT-006)
// Enforces: capabilities(child) ⊆ capabilities(parent)
// ─────────────────────────────────────────────────────────────────

/** Decay mode for child capabilities */
export type DecayMode = "decay" | "explicit" | "inherit";

/** Violation types for capability decay */
export type DecayViolationType = "PRIVILEGE_ESCALATION" | "BUDGET_ESCALATION" | "DEPTH_EXCEEDED";

/** Spawn request for creating child agents */
export interface SpawnRequest {
  /** Requested child asset ID */
  assetId: string;
  /** Requested capabilities (partial) */
  capabilities: Partial<ChildCapabilities>;
  /** Decay mode to use */
  decayMode?: DecayMode;
}

/** Child capabilities that can be requested */
export interface ChildCapabilities {
  /** Allowed tools */
  allowedTools: string[];
  /** Allowed domains */
  allowedDomains: string[];
  /** Denied domains (inherited from parent + additional) */
  deniedDomains: string[];
  /** Budget limits */
  budgets: {
    maxCostPerSession?: number;
    maxCostPerDay?: number;
    maxCostPerMonth?: number;
    maxTokensPerCall?: number;
  };
  /** Whether child may spawn grandchildren */
  maySpawnChildren: boolean;
  /** Risk level (cannot exceed parent) */
  riskLevel?: RiskLevel;
}

/** Validation result from capability decay check */
export interface DecayValidationResult {
  /** Whether validation passed */
  valid: boolean;
  /** Reason for failure */
  reason?: string;
  /** Type of violation */
  violation?: DecayViolationType;
  /** List of all violations found */
  violations: DecayViolation[];
  /** Adjusted capabilities (if auto-correct enabled) */
  adjustedCapabilities?: ChildCapabilities;
}

/** Individual violation */
export interface DecayViolation {
  /** Type of violation */
  type: DecayViolationType;
  /** Description */
  message: string;
  /** The capability that caused the violation */
  capability?: string;
  /** Expected value (from parent) */
  parentValue?: unknown;
  /** Requested value (for child) */
  requestedValue?: unknown;
}

/** Decay rules configuration */
export interface DecayRules {
  /** Capabilities to remove from children */
  removeFromChildren: string[];
  /** Budget decay factors (0.0 - 1.0) */
  budgetDecay: {
    maxCostPerSession: number;
    maxCostPerDay: number;
    maxCostPerMonth: number;
    maxTokensPerCall: number;
  };
  /** Rate limit decay factors */
  rateLimitDecay?: {
    maxCallsPerMinute?: number;
    maxCallsPerHour?: number;
  };
  /** Whether to auto-adjust invalid requests instead of failing */
  autoAdjust: boolean;
}

/** Default decay rules */
export const DEFAULT_DECAY_RULES: DecayRules = {
  removeFromChildren: [],
  budgetDecay: {
    maxCostPerSession: 0.5,
    maxCostPerDay: 0.5,
    maxCostPerMonth: 0.5,
    maxTokensPerCall: 0.75,
  },
  rateLimitDecay: {
    maxCallsPerMinute: 0.5,
    maxCallsPerHour: 0.5,
  },
  autoAdjust: true,
};

/** Parent capabilities extracted from RuntimeIdentity */
export interface ParentCapabilities {
  /** Allowed tools */
  allowedTools: string[];
  /** Allowed domains */
  allowedDomains: string[];
  /** Denied domains */
  deniedDomains: string[];
  /** Budgets */
  budgets: {
    maxCostPerSession?: number;
    maxCostPerDay?: number;
    maxCostPerMonth?: number;
    maxTokensPerCall?: number;
  };
  /** Max child depth */
  maxChildDepth: number;
  /** Current generation depth */
  currentDepth: number;
  /** May spawn children */
  maySpawnChildren: boolean;
  /** Risk level */
  riskLevel: RiskLevel;
}

/** ICapabilityDecay interface per SPEC-RT-006 */
export interface ICapabilityDecay {
  /**
   * Validates that child capabilities don't exceed parent.
   *
   * @param parent - Parent capabilities
   * @param childRequest - Requested capabilities for child
   * @returns Validation result
   */
  validate(parent: ParentCapabilities, childRequest: SpawnRequest): DecayValidationResult;

  /**
   * Applies decay rules to generate child capabilities.
   *
   * @param parent - Parent capabilities
   * @param mode - Decay mode (decay, explicit, inherit)
   * @param explicitCapabilities - For explicit mode, the specific capabilities to grant
   * @returns Decayed capabilities for child
   */
  applyDecay(
    parent: ParentCapabilities,
    mode: DecayMode,
    explicitCapabilities?: Partial<ChildCapabilities>
  ): ChildCapabilities;

  /**
   * Gets the current decay rules.
   */
  getDecayRules(): DecayRules;

  /**
   * Sets new decay rules.
   */
  setDecayRules(rules: Partial<DecayRules>): void;
}

/** Configuration for capability decay */
export interface CapabilityDecayConfig {
  /** Decay rules */
  rules?: Partial<DecayRules>;
  /** Capabilities that children may NEVER have */
  childDeniedCapabilities?: string[];
  /** Global max depth for all agents */
  globalMaxDepth?: number;
}

/**
 * Creates a Capability Decay enforcer per SPEC-RT-006.
 *
 * @example
 * ```typescript
 * const decay = createCapabilityDecay({
 *   rules: {
 *     removeFromChildren: ["send_email", "shell_exec"],
 *     budgetDecay: { maxCostPerSession: 0.5 },
 *     autoAdjust: true,
 *   },
 * });
 *
 * const parent: ParentCapabilities = {
 *   allowedTools: ["web_search", "database_read", "send_email"],
 *   allowedDomains: ["*.example.com"],
 *   deniedDomains: [],
 *   budgets: { maxCostPerSession: 100 },
 *   maxChildDepth: 3,
 *   currentDepth: 0,
 *   maySpawnChildren: true,
 *   riskLevel: "limited",
 * };
 *
 * const childCaps = decay.applyDecay(parent, "decay");
 * // childCaps.allowedTools = ["web_search", "database_read"] (send_email removed)
 * // childCaps.budgets.maxCostPerSession = 50 (50% decay)
 * ```
 */
export function createCapabilityDecay(config: CapabilityDecayConfig = {}): ICapabilityDecay {
  const {
    childDeniedCapabilities = [],
    globalMaxDepth = 10,
  } = config;

  // Merge with defaults
  let rules: DecayRules = {
    ...DEFAULT_DECAY_RULES,
    ...config.rules,
    budgetDecay: {
      ...DEFAULT_DECAY_RULES.budgetDecay,
      ...config.rules?.budgetDecay,
    },
    rateLimitDecay: {
      ...DEFAULT_DECAY_RULES.rateLimitDecay,
      ...config.rules?.rateLimitDecay,
    },
  };

  /** Risk level ordinal for comparison */
  function getRiskOrdinal(level: RiskLevel): number {
    const ordinals: Record<RiskLevel, number> = {
      minimal: 0,
      limited: 1,
      high: 2,
      unacceptable: 3,
    };
    return ordinals[level];
  }

  /** Check if a domain pattern is covered by parent patterns */
  function isDomainCovered(childDomain: string, parentDomains: string[]): boolean {
    // Wildcard parent covers everything
    if (parentDomains.includes("*")) return true;

    // Exact match
    if (parentDomains.includes(childDomain)) return true;

    // Check pattern matching (e.g., "*.example.com" covers "api.example.com")
    for (const parentPattern of parentDomains) {
      if (parentPattern.startsWith("*.")) {
        const suffix = parentPattern.slice(1); // ".example.com"
        if (childDomain.endsWith(suffix) || childDomain === parentPattern.slice(2)) {
          return true;
        }
      }
      // Child pattern is more specific (e.g., child="api.example.com", parent="*.example.com")
      if (childDomain.startsWith("*.")) {
        // Child wildcard can only be granted if parent has same or broader wildcard
        if (parentPattern === childDomain) return true;
        if (parentPattern === "*") return true;
      }
    }

    return false;
  }

  /** Validate tool capabilities */
  function validateTools(
    parent: ParentCapabilities,
    child: Partial<ChildCapabilities>,
    violations: DecayViolation[]
  ): void {
    const parentTools = new Set(parent.allowedTools);
    const hasWildcard = parentTools.has("*");

    for (const tool of child.allowedTools ?? []) {
      // Check if tool is in child denied list
      if (childDeniedCapabilities.includes(tool)) {
        violations.push({
          type: "PRIVILEGE_ESCALATION",
          message: `Tool '${tool}' is in child-denied capabilities list`,
          capability: tool,
        });
        continue;
      }

      // Check if parent has this tool
      if (!hasWildcard && !parentTools.has(tool)) {
        violations.push({
          type: "PRIVILEGE_ESCALATION",
          message: `Child requested tool '${tool}' not in parent capabilities`,
          capability: tool,
          parentValue: parent.allowedTools,
          requestedValue: tool,
        });
      }
    }
  }

  /** Validate domain capabilities */
  function validateDomains(
    parent: ParentCapabilities,
    child: Partial<ChildCapabilities>,
    violations: DecayViolation[]
  ): void {
    for (const domain of child.allowedDomains ?? []) {
      if (!isDomainCovered(domain, parent.allowedDomains)) {
        violations.push({
          type: "PRIVILEGE_ESCALATION",
          message: `Child domain pattern '${domain}' not covered by parent`,
          capability: domain,
          parentValue: parent.allowedDomains,
          requestedValue: domain,
        });
      }
    }

    // Check that child inherits all parent denied domains
    const parentDenied = new Set(parent.deniedDomains);
    for (const denied of parentDenied) {
      if (!child.deniedDomains?.includes(denied)) {
        // This is auto-corrected, not a violation
      }
    }
  }

  /** Validate budget capabilities */
  function validateBudgets(
    parent: ParentCapabilities,
    child: Partial<ChildCapabilities>,
    violations: DecayViolation[]
  ): void {
    const childBudgets = child.budgets ?? {};
    const parentBudgets = parent.budgets;

    // Check each budget type
    if (parentBudgets.maxCostPerSession !== undefined) {
      if (
        childBudgets.maxCostPerSession !== undefined &&
        childBudgets.maxCostPerSession > parentBudgets.maxCostPerSession
      ) {
        violations.push({
          type: "BUDGET_ESCALATION",
          message: `Child session budget (${childBudgets.maxCostPerSession}) exceeds parent (${parentBudgets.maxCostPerSession})`,
          capability: "maxCostPerSession",
          parentValue: parentBudgets.maxCostPerSession,
          requestedValue: childBudgets.maxCostPerSession,
        });
      }
    }

    if (parentBudgets.maxCostPerDay !== undefined) {
      if (
        childBudgets.maxCostPerDay !== undefined &&
        childBudgets.maxCostPerDay > parentBudgets.maxCostPerDay
      ) {
        violations.push({
          type: "BUDGET_ESCALATION",
          message: `Child daily budget (${childBudgets.maxCostPerDay}) exceeds parent (${parentBudgets.maxCostPerDay})`,
          capability: "maxCostPerDay",
          parentValue: parentBudgets.maxCostPerDay,
          requestedValue: childBudgets.maxCostPerDay,
        });
      }
    }

    if (parentBudgets.maxTokensPerCall !== undefined) {
      if (
        childBudgets.maxTokensPerCall !== undefined &&
        childBudgets.maxTokensPerCall > parentBudgets.maxTokensPerCall
      ) {
        violations.push({
          type: "BUDGET_ESCALATION",
          message: `Child tokens per call (${childBudgets.maxTokensPerCall}) exceeds parent (${parentBudgets.maxTokensPerCall})`,
          capability: "maxTokensPerCall",
          parentValue: parentBudgets.maxTokensPerCall,
          requestedValue: childBudgets.maxTokensPerCall,
        });
      }
    }
  }

  /** Validate generation depth */
  function validateDepth(
    parent: ParentCapabilities,
    violations: DecayViolation[]
  ): boolean {
    const maxDepth = Math.min(parent.maxChildDepth, globalMaxDepth);

    if (parent.currentDepth >= maxDepth) {
      violations.push({
        type: "DEPTH_EXCEEDED",
        message: `Max generation depth (${maxDepth}) reached`,
        capability: "depth",
        parentValue: maxDepth,
        requestedValue: parent.currentDepth + 1,
      });
      return false;
    }

    if (!parent.maySpawnChildren) {
      violations.push({
        type: "DEPTH_EXCEEDED",
        message: "Parent is not allowed to spawn children",
        capability: "maySpawnChildren",
        parentValue: false,
        requestedValue: true,
      });
      return false;
    }

    return true;
  }

  /** Validate risk level */
  function validateRiskLevel(
    parent: ParentCapabilities,
    child: Partial<ChildCapabilities>,
    violations: DecayViolation[]
  ): void {
    if (child.riskLevel) {
      const parentOrdinal = getRiskOrdinal(parent.riskLevel);
      const childOrdinal = getRiskOrdinal(child.riskLevel);

      if (childOrdinal > parentOrdinal) {
        violations.push({
          type: "PRIVILEGE_ESCALATION",
          message: `Child risk level '${child.riskLevel}' exceeds parent '${parent.riskLevel}'`,
          capability: "riskLevel",
          parentValue: parent.riskLevel,
          requestedValue: child.riskLevel,
        });
      }
    }
  }

  /** Auto-adjust capabilities to fix violations */
  function autoAdjust(
    parent: ParentCapabilities,
    child: Partial<ChildCapabilities>,
    mode: DecayMode
  ): ChildCapabilities {
    const parentTools = new Set(parent.allowedTools);
    const hasToolWildcard = parentTools.has("*");

    // Filter tools to only those parent has (minus removed)
    const removedTools = new Set(rules.removeFromChildren);
    const adjustedTools = (child.allowedTools ?? parent.allowedTools).filter((tool) => {
      if (childDeniedCapabilities.includes(tool)) return false;
      if (mode === "decay" && removedTools.has(tool)) return false;
      if (hasToolWildcard) return true;
      return parentTools.has(tool);
    });

    // Filter domains to only those covered by parent
    const adjustedDomains = (child.allowedDomains ?? parent.allowedDomains).filter((domain) =>
      isDomainCovered(domain, parent.allowedDomains)
    );

    // Merge denied domains (parent + child)
    const deniedDomains = [
      ...new Set([...parent.deniedDomains, ...(child.deniedDomains ?? [])]),
    ];

    // Apply budget decay
    const decayFactors = rules.budgetDecay;
    const adjustedBudgets = {
      maxCostPerSession:
        parent.budgets.maxCostPerSession !== undefined
          ? Math.min(
              child.budgets?.maxCostPerSession ?? Infinity,
              parent.budgets.maxCostPerSession * decayFactors.maxCostPerSession
            )
          : child.budgets?.maxCostPerSession,
      maxCostPerDay:
        parent.budgets.maxCostPerDay !== undefined
          ? Math.min(
              child.budgets?.maxCostPerDay ?? Infinity,
              parent.budgets.maxCostPerDay * decayFactors.maxCostPerDay
            )
          : child.budgets?.maxCostPerDay,
      maxCostPerMonth:
        parent.budgets.maxCostPerMonth !== undefined
          ? Math.min(
              child.budgets?.maxCostPerMonth ?? Infinity,
              parent.budgets.maxCostPerMonth * decayFactors.maxCostPerMonth
            )
          : child.budgets?.maxCostPerMonth,
      maxTokensPerCall:
        parent.budgets.maxTokensPerCall !== undefined
          ? Math.min(
              child.budgets?.maxTokensPerCall ?? Infinity,
              parent.budgets.maxTokensPerCall * decayFactors.maxTokensPerCall
            )
          : child.budgets?.maxTokensPerCall,
    };

    // Determine if child can spawn (based on depth)
    const maxDepth = Math.min(parent.maxChildDepth, globalMaxDepth);
    const canSpawn = parent.currentDepth + 1 < maxDepth && (child.maySpawnChildren ?? true);

    return {
      allowedTools: adjustedTools,
      allowedDomains: adjustedDomains,
      deniedDomains,
      budgets: adjustedBudgets,
      maySpawnChildren: canSpawn,
      riskLevel: child.riskLevel ?? parent.riskLevel,
    };
  }

  return {
    validate(parent: ParentCapabilities, childRequest: SpawnRequest): DecayValidationResult {
      const violations: DecayViolation[] = [];
      const childCaps = childRequest.capabilities;

      // Check depth first (if failed, no point checking other things)
      const depthValid = validateDepth(parent, violations);

      if (depthValid) {
        // Validate all capability types
        validateTools(parent, childCaps, violations);
        validateDomains(parent, childCaps, violations);
        validateBudgets(parent, childCaps, violations);
        validateRiskLevel(parent, childCaps, violations);
      }

      const valid = violations.length === 0;

      // If auto-adjust is enabled and there are violations, compute adjusted capabilities
      let adjustedCapabilities: ChildCapabilities | undefined;
      if (!valid && rules.autoAdjust && depthValid) {
        adjustedCapabilities = autoAdjust(
          parent,
          childCaps,
          childRequest.decayMode ?? "decay"
        );
      }

      return {
        valid,
        reason: valid ? undefined : violations[0]?.message,
        violation: valid ? undefined : violations[0]?.type,
        violations,
        adjustedCapabilities,
      };
    },

    applyDecay(
      parent: ParentCapabilities,
      mode: DecayMode,
      explicitCapabilities?: Partial<ChildCapabilities>
    ): ChildCapabilities {
      const removedTools = new Set(rules.removeFromChildren);
      const decayFactors = rules.budgetDecay;

      // Calculate new depth
      const maxDepth = Math.min(parent.maxChildDepth, globalMaxDepth);
      const childDepth = parent.currentDepth + 1;
      const canSpawn = childDepth < maxDepth && parent.maySpawnChildren;

      switch (mode) {
        case "inherit": {
          // DANGER: Child gets exact same capabilities as parent
          return {
            allowedTools: [...parent.allowedTools],
            allowedDomains: [...parent.allowedDomains],
            deniedDomains: [...parent.deniedDomains],
            budgets: { ...parent.budgets },
            maySpawnChildren: canSpawn,
            riskLevel: parent.riskLevel,
          };
        }

        case "explicit": {
          // Only grant explicitly requested capabilities (intersected with parent)
          const explicit = explicitCapabilities ?? {};
          const parentTools = new Set(parent.allowedTools);
          const hasToolWildcard = parentTools.has("*");

          // Intersect tools
          const tools = (explicit.allowedTools ?? []).filter((tool) => {
            if (childDeniedCapabilities.includes(tool)) return false;
            return hasToolWildcard || parentTools.has(tool);
          });

          // Intersect domains
          const domains = (explicit.allowedDomains ?? []).filter((domain) =>
            isDomainCovered(domain, parent.allowedDomains)
          );

          // Merge denied domains
          const denied = [
            ...new Set([...parent.deniedDomains, ...(explicit.deniedDomains ?? [])]),
          ];

          // Apply budget limits (capped at parent)
          const budgets = {
            maxCostPerSession:
              explicit.budgets?.maxCostPerSession !== undefined
                ? Math.min(
                    explicit.budgets.maxCostPerSession,
                    parent.budgets.maxCostPerSession ?? Infinity
                  )
                : undefined,
            maxCostPerDay:
              explicit.budgets?.maxCostPerDay !== undefined
                ? Math.min(
                    explicit.budgets.maxCostPerDay,
                    parent.budgets.maxCostPerDay ?? Infinity
                  )
                : undefined,
            maxCostPerMonth:
              explicit.budgets?.maxCostPerMonth !== undefined
                ? Math.min(
                    explicit.budgets.maxCostPerMonth,
                    parent.budgets.maxCostPerMonth ?? Infinity
                  )
                : undefined,
            maxTokensPerCall:
              explicit.budgets?.maxTokensPerCall !== undefined
                ? Math.min(
                    explicit.budgets.maxTokensPerCall,
                    parent.budgets.maxTokensPerCall ?? Infinity
                  )
                : undefined,
          };

          return {
            allowedTools: tools,
            allowedDomains: domains,
            deniedDomains: denied,
            budgets,
            maySpawnChildren: explicit.maySpawnChildren ?? false,
            riskLevel: explicit.riskLevel ?? parent.riskLevel,
          };
        }

        case "decay":
        default: {
          // Automatic reduction based on decay rules
          const tools = parent.allowedTools.filter((tool) => {
            if (childDeniedCapabilities.includes(tool)) return false;
            return !removedTools.has(tool);
          });

          const budgets = {
            maxCostPerSession:
              parent.budgets.maxCostPerSession !== undefined
                ? parent.budgets.maxCostPerSession * decayFactors.maxCostPerSession
                : undefined,
            maxCostPerDay:
              parent.budgets.maxCostPerDay !== undefined
                ? parent.budgets.maxCostPerDay * decayFactors.maxCostPerDay
                : undefined,
            maxCostPerMonth:
              parent.budgets.maxCostPerMonth !== undefined
                ? parent.budgets.maxCostPerMonth * decayFactors.maxCostPerMonth
                : undefined,
            maxTokensPerCall:
              parent.budgets.maxTokensPerCall !== undefined
                ? parent.budgets.maxTokensPerCall * decayFactors.maxTokensPerCall
                : undefined,
          };

          return {
            allowedTools: tools,
            allowedDomains: [...parent.allowedDomains],
            deniedDomains: [...parent.deniedDomains],
            budgets,
            maySpawnChildren: canSpawn,
            riskLevel: parent.riskLevel,
          };
        }
      }
    },

    getDecayRules(): DecayRules {
      return { ...rules };
    },

    setDecayRules(newRules: Partial<DecayRules>): void {
      rules = {
        ...rules,
        ...newRules,
        budgetDecay: {
          ...rules.budgetDecay,
          ...newRules.budgetDecay,
        },
        rateLimitDecay: {
          ...rules.rateLimitDecay,
          ...newRules.rateLimitDecay,
        },
      };
    },
  };
}

/**
 * Helper to extract parent capabilities from RuntimeIdentity.
 */
export function extractParentCapabilities(identity: RuntimeIdentity): ParentCapabilities {
  const manifest = identity.capabilities_manifest;

  return {
    allowedTools: manifest.allowed_tools ?? [],
    allowedDomains: manifest.allowed_domains ?? [],
    deniedDomains: manifest.denied_domains ?? [],
    budgets: {
      maxCostPerSession: manifest.max_cost_per_session ?? undefined,
      maxCostPerDay: manifest.max_cost_per_day ?? undefined,
      maxCostPerMonth: undefined, // Not in current schema, reserved for future
      maxTokensPerCall: manifest.max_tokens_per_call ?? undefined,
    },
    maxChildDepth: manifest.max_child_depth ?? 3,
    currentDepth: identity.lineage?.generation_depth ?? 0,
    maySpawnChildren: manifest.may_spawn_children ?? true,
    riskLevel: identity.risk_level,
  };
}

/**
 * Creates a no-op capability decay for testing (allows everything).
 */
export function createNoopCapabilityDecay(): ICapabilityDecay {
  return {
    validate: () => ({
      valid: true,
      violations: [],
    }),
    applyDecay: (parent) => ({
      allowedTools: [...parent.allowedTools],
      allowedDomains: [...parent.allowedDomains],
      deniedDomains: [...parent.deniedDomains],
      budgets: { ...parent.budgets },
      maySpawnChildren: parent.maySpawnChildren,
      riskLevel: parent.riskLevel,
    }),
    getDecayRules: () => DEFAULT_DECAY_RULES,
    setDecayRules: () => {},
  };
}
