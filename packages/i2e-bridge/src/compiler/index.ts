/**
 * I2E Policy Compiler
 *
 * Compiles extracted constraints into an AIR document and governance.lock file.
 *
 * @module @aigrc/i2e-bridge/compiler
 */

import {
  createEmptyAIR,
  type AIR,
  type AIRPolicySource,
  type AIRVendor,
  type AIRModel,
  type AIRRegion,
  createGovernanceLock,
  type GovernanceLock,
} from "@aigrc/core";
import type {
  ExtractedConstraint,
  ConstraintConflict,
  CompilerConfig,
  CompilationResult,
  PolicySourceInput,
  ExtractionResult,
  ConflictResolutionStrategy,
} from "../types";
import { DEFAULT_COMPILER_CONFIG } from "../types";

// ─────────────────────────────────────────────────────────────────
// CONFLICT DETECTION
// ─────────────────────────────────────────────────────────────────

/**
 * Detects conflicts between constraints
 */
export function detectConflicts(constraints: ExtractedConstraint[]): ConstraintConflict[] {
  const conflicts: ConstraintConflict[] = [];
  let conflictIndex = 0;

  // Group constraints by type
  const byType = new Map<string, ExtractedConstraint[]>();
  for (const c of constraints) {
    const existing = byType.get(c.type) ?? [];
    existing.push(c);
    byType.set(c.type, existing);
  }

  // Check for conflicts within each type
  for (const [type, typeConstraints] of byType) {
    // Check for vendor allow/block conflicts
    if (type === "allowed_vendor") {
      const blockedVendors = constraints.filter(c => c.type === "blocked_vendor");
      for (const allowed of typeConstraints) {
        for (const blocked of blockedVendors) {
          if (allowed.value === blocked.value) {
            conflicts.push({
              id: `conflict-${conflictIndex++}`,
              constraints: [allowed, blocked],
              description: `Vendor "${allowed.value}" is both allowed and blocked`,
              severity: "error",
              suggestedResolution: "manual",
              resolved: false,
            });
          }
        }
      }
    }

    // Check for region allow/block conflicts
    if (type === "allowed_region") {
      const blockedRegions = constraints.filter(c => c.type === "blocked_region");
      for (const allowed of typeConstraints) {
        for (const blocked of blockedRegions) {
          if (allowed.value === blocked.value) {
            conflicts.push({
              id: `conflict-${conflictIndex++}`,
              constraints: [allowed, blocked],
              description: `Region "${allowed.value}" is both allowed and blocked`,
              severity: "error",
              suggestedResolution: "manual",
              resolved: false,
            });
          }
        }
      }
    }

    // Check for model allow/block conflicts
    if (type === "allowed_model") {
      const blockedModels = constraints.filter(c => c.type === "blocked_model");
      for (const allowed of typeConstraints) {
        for (const blocked of blockedModels) {
          // Check for pattern matches
          if (matchesPattern(String(allowed.value), String(blocked.value)) ||
              matchesPattern(String(blocked.value), String(allowed.value))) {
            conflicts.push({
              id: `conflict-${conflictIndex++}`,
              constraints: [allowed, blocked],
              description: `Model "${allowed.value}" conflicts with blocked pattern "${blocked.value}"`,
              severity: "error",
              suggestedResolution: "manual",
              resolved: false,
            });
          }
        }
      }
    }

    // Check for duplicate constraints (same type, different values)
    if (typeConstraints.length > 1) {
      // Check for scalar constraints that should only have one value
      const scalarTypes = [
        "max_model_parameters",
        "data_retention",
        "logging_level",
        "max_tokens",
        "max_cost",
      ];
      if (scalarTypes.includes(type)) {
        const uniqueValues = new Set(typeConstraints.map(c => JSON.stringify(c.value)));
        if (uniqueValues.size > 1) {
          conflicts.push({
            id: `conflict-${conflictIndex++}`,
            constraints: typeConstraints,
            description: `Multiple conflicting values for "${type}"`,
            severity: "warning",
            suggestedResolution: "most_strict",
            resolved: false,
          });
        }
      }
    }
  }

  return conflicts;
}

/**
 * Simple pattern matching for model names
 */
function matchesPattern(value: string, pattern: string): boolean {
  if (pattern === "*") return true;
  if (pattern.endsWith("*")) {
    return value.startsWith(pattern.slice(0, -1));
  }
  if (pattern.startsWith("*")) {
    return value.endsWith(pattern.slice(1));
  }
  return value === pattern;
}

/**
 * Resolves a conflict based on the specified strategy
 */
export function resolveConflict(
  conflict: ConstraintConflict,
  strategy: ConflictResolutionStrategy,
  winningConstraintId?: string
): ConstraintConflict {
  if (strategy === "fail") {
    return conflict; // Don't resolve, let compilation fail
  }

  let winningId: string | undefined = winningConstraintId;

  if (!winningId) {
    if (strategy === "first_wins") {
      winningId = conflict.constraints[0]?.id;
    } else if (strategy === "last_wins") {
      winningId = conflict.constraints[conflict.constraints.length - 1]?.id;
    } else if (strategy === "most_strict") {
      // For most_strict, prefer blocked over allowed, lower limits over higher
      const sorted = [...conflict.constraints].sort((a, b) => {
        // Blocked constraints are more strict
        if (a.type.includes("blocked") && !b.type.includes("blocked")) return -1;
        if (!a.type.includes("blocked") && b.type.includes("blocked")) return 1;

        // For numeric values, lower is more strict
        if (typeof a.value === "number" && typeof b.value === "number") {
          return (a.value as number) - (b.value as number);
        }

        return 0;
      });
      winningId = sorted[0]?.id;
    }
  }

  return {
    ...conflict,
    resolved: true,
    resolution: {
      strategy,
      winningConstraintId: winningId,
      resolvedAt: new Date().toISOString(),
    },
  };
}

// ─────────────────────────────────────────────────────────────────
// CONSTRAINT MERGING
// ─────────────────────────────────────────────────────────────────

/**
 * Merges constraints from multiple sources
 */
export function mergeConstraints(
  constraintSets: ExtractedConstraint[][],
  config: CompilerConfig
): {
  merged: ExtractedConstraint[];
  conflicts: ConstraintConflict[];
} {
  // Flatten all constraints
  const allConstraints = constraintSets.flat();

  // Detect conflicts
  const conflicts = detectConflicts(allConstraints);

  // Resolve conflicts if not in strict mode or if strategy is not "fail"
  const resolvedConflicts = conflicts.map(c => {
    if (config.conflictResolution === "fail") {
      return c;
    }
    return resolveConflict(c, config.conflictResolution);
  });

  // Filter constraints based on confidence
  const filteredConstraints = allConstraints.filter(c => c.confidence >= config.minConfidence);

  // Remove losing constraints from conflicts
  const losingIds = new Set<string>();
  for (const conflict of resolvedConflicts) {
    if (conflict.resolved && conflict.resolution?.winningConstraintId) {
      for (const c of conflict.constraints) {
        if (c.id !== conflict.resolution.winningConstraintId) {
          losingIds.add(c.id);
        }
      }
    }
  }

  const merged = filteredConstraints.filter(c => !losingIds.has(c.id));

  return { merged, conflicts: resolvedConflicts };
}

// ─────────────────────────────────────────────────────────────────
// POLICY COMPILER
// ─────────────────────────────────────────────────────────────────

/**
 * Policy Compiler
 *
 * Compiles extracted constraints into AIR and governance.lock.
 */
export class PolicyCompiler {
  private config: CompilerConfig;

  constructor(config: Partial<CompilerConfig> = {}) {
    this.config = { ...DEFAULT_COMPILER_CONFIG, ...config };
  }

  /**
   * Compiles constraints from multiple sources into an AIR document
   */
  async compile(
    sources: Array<{
      source: PolicySourceInput;
      extraction: ExtractionResult;
      constraints: ExtractedConstraint[];
    }>,
    options?: {
      name?: string;
      description?: string;
    }
  ): Promise<CompilationResult> {
    const startTime = Date.now();
    const warnings: string[] = [];
    const errors: string[] = [];

    // Collect all constraints
    const constraintSets = sources.map(s => s.constraints);

    // Merge and resolve conflicts
    const { merged, conflicts } = mergeConstraints(constraintSets, this.config);

    // Check for unresolved conflicts in strict mode
    const unresolvedConflicts = conflicts.filter(c => !c.resolved);
    if (this.config.strictMode && unresolvedConflicts.length > 0) {
      errors.push(`${unresolvedConflicts.length} unresolved conflict(s) in strict mode`);
      for (const conflict of unresolvedConflicts) {
        errors.push(`- ${conflict.description}`);
      }

      return {
        success: false,
        sources: [],
        appliedConstraints: [],
        skippedConstraints: [],
        conflicts,
        unresolvedConflicts,
        warnings,
        errors,
        stats: {
          totalConstraints: constraintSets.flat().length,
          appliedConstraints: 0,
          skippedConstraints: 0,
          totalConflicts: conflicts.length,
          resolvedConflicts: conflicts.filter(c => c.resolved).length,
          compilationTimeMs: Date.now() - startTime,
        },
      };
    }

    // Create AIR document
    const air = this.buildAIR(merged, sources, options);

    // Build policy sources for AIR
    // Map source types to AIRPolicySource types (docx -> pdf for compatibility)
    const mapSourceType = (type: string): "pdf" | "url" | "confluence" | "jira" | "manual" => {
      if (type === "docx") return "pdf"; // DOCX treated as document like PDF
      return type as "pdf" | "url" | "confluence" | "jira" | "manual";
    };

    const policySources: AIRPolicySource[] = sources.map(s => ({
      id: s.source.uri,
      type: mapSourceType(s.source.type),
      uri: s.source.uri,
      content_hash: s.extraction.contentHash || `sha256:${"0".repeat(64)}`,
      fetched_at: s.extraction.extractedAt,
      title: s.source.title ?? s.extraction.documentMetadata?.title,
      version: s.source.version,
      extraction_confidence: s.constraints.length > 0
        ? s.constraints.reduce((sum, c) => sum + c.confidence, 0) / s.constraints.length
        : undefined,
    }));

    air.policy_sources = policySources;

    // Calculate skipped constraints (below confidence threshold)
    const allConstraints = constraintSets.flat();
    const skipped = allConstraints.filter(c => c.confidence < this.config.minConfidence);
    if (skipped.length > 0) {
      warnings.push(`${skipped.length} constraint(s) skipped due to low confidence`);
    }

    return {
      success: true,
      air,
      sources: policySources,
      appliedConstraints: merged,
      skippedConstraints: skipped,
      conflicts,
      unresolvedConflicts,
      warnings,
      errors,
      stats: {
        totalConstraints: allConstraints.length,
        appliedConstraints: merged.length,
        skippedConstraints: skipped.length,
        totalConflicts: conflicts.length,
        resolvedConflicts: conflicts.filter(c => c.resolved).length,
        compilationTimeMs: Date.now() - startTime,
      },
    };
  }

  /**
   * Builds an AIR document from constraints
   */
  private buildAIR(
    constraints: ExtractedConstraint[],
    _sources: Array<{ source: PolicySourceInput }>,
    options?: {
      name?: string;
      description?: string;
    }
  ): AIR {
    const air = createEmptyAIR(
      options?.name ?? "Compiled AI Governance Policy",
      "1.0.0"
    );

    air.metadata.organization = this.config.organization;
    air.metadata.environment = this.config.environment;
    air.metadata.description = options?.description;

    // Apply registry constraints
    for (const c of constraints.filter(c => c.category === "registry")) {
      this.applyRegistryConstraint(air, c);
    }

    // Apply runtime constraints
    for (const c of constraints.filter(c => c.category === "runtime")) {
      this.applyRuntimeConstraint(air, c);
    }

    // Apply build constraints
    for (const c of constraints.filter(c => c.category === "build")) {
      this.applyBuildConstraint(air, c);
    }

    return air;
  }

  /**
   * Applies a registry constraint to the AIR
   */
  private applyRegistryConstraint(air: AIR, constraint: ExtractedConstraint): void {
    switch (constraint.type) {
      case "allowed_vendor": {
        const vendor: AIRVendor = {
          id: String(constraint.value),
          status: "approved",
          notes: constraint.notes,
        };
        air.registry.allowed_vendors.push(vendor);
        break;
      }
      case "blocked_vendor":
        air.registry.blocked_vendors.push(String(constraint.value));
        break;
      case "allowed_region": {
        const region: AIRRegion = {
          code: String(constraint.value),
          status: "allowed",
          jurisdictions: [],
          data_residency: "none",
        };
        air.registry.allowed_regions.push(region);
        break;
      }
      case "blocked_region":
        air.registry.blocked_regions.push(String(constraint.value));
        break;
      case "allowed_model": {
        const model: AIRModel = {
          id: String(constraint.value),
          vendor_id: "unknown",
          status: "approved",
        };
        air.registry.allowed_models.push(model);
        break;
      }
      case "blocked_model":
        air.registry.blocked_models.push(String(constraint.value));
        break;
      case "max_model_parameters":
        air.registry.max_model_parameters = Number(constraint.value);
        break;
    }
  }

  /**
   * Applies a runtime constraint to the AIR
   */
  private applyRuntimeConstraint(air: AIR, constraint: ExtractedConstraint): void {
    switch (constraint.type) {
      case "pii_filter": {
        const value = constraint.value as { enabled?: boolean; action?: string; filter_types?: string[] };
        air.runtime.pii_filter = {
          enabled: value?.enabled ?? false,
          action: (value?.action as "redact" | "block" | "warn" | "audit") ?? "warn",
          filter_types: value?.filter_types ?? [],
          custom_patterns: [],
        };
        break;
      }
      case "toxicity_filter": {
        const value = constraint.value as { enabled?: boolean; threshold?: number; action?: string };
        air.runtime.toxicity_filter = {
          enabled: value?.enabled ?? false,
          threshold: value?.threshold ?? 0.7,
          categories: [],
          action: (value?.action as "block" | "warn" | "audit") ?? "warn",
        };
        break;
      }
      case "data_retention":
        air.runtime.data_retention_days = Number(constraint.value);
        break;
      case "watermark":
        air.runtime.watermark_enabled = Boolean(constraint.value);
        break;
      case "logging_level":
        air.runtime.logging_level = constraint.value as "none" | "errors" | "all";
        break;
      case "max_tokens":
        air.runtime.max_tokens_per_request = Number(constraint.value);
        break;
      case "max_cost":
        air.runtime.max_cost_per_day_usd = Number(constraint.value);
        break;
      case "kill_switch":
        air.runtime.kill_switch = {
          enabled: Boolean(constraint.value),
          channel: "sse",
          poll_interval_ms: 5000,
        };
        break;
    }
  }

  /**
   * Applies a build constraint to the AIR
   */
  private applyBuildConstraint(air: AIR, constraint: ExtractedConstraint): void {
    switch (constraint.type) {
      case "require_golden_thread":
        air.build.require_golden_thread = Boolean(constraint.value);
        break;
      case "require_asset_card":
        air.build.require_asset_card = Boolean(constraint.value);
        break;
      case "require_risk_classification":
        air.build.require_risk_classification = Boolean(constraint.value);
        break;
      case "require_model_card":
        air.build.require_model_card = Boolean(constraint.value);
        break;
      case "require_security_review": {
        const value = constraint.value as { enabled?: boolean; risk_levels?: string[] };
        air.build.require_security_review = value?.enabled ?? Boolean(constraint.value);
        if (value?.risk_levels) {
          air.build.security_review_risk_levels = value.risk_levels as ("high" | "unacceptable")[];
        }
        break;
      }
      case "block_on_failure":
        air.build.block_on_failure = Boolean(constraint.value);
        break;
      case "generate_sarif":
        air.build.generate_sarif = Boolean(constraint.value);
        break;
      case "allowed_environment":
        if (!air.build.allowed_environments.includes(String(constraint.value))) {
          air.build.allowed_environments.push(String(constraint.value));
        }
        break;
      case "required_approval": {
        const value = constraint.value as { role: string; count?: number };
        air.build.required_approvals.push({
          role: value.role,
          count: value.count ?? 1,
        });
        break;
      }
    }
  }

  /**
   * Creates a governance.lock from a compiled AIR
   */
  async createLock(air: AIR): Promise<GovernanceLock> {
    return createGovernanceLock(air, {
      expiresInDays: this.config.defaultExpirationDays,
      organization: this.config.organization,
      environment: this.config.environment,
    });
  }
}

// ─────────────────────────────────────────────────────────────────
// CONVENIENCE FUNCTIONS
// ─────────────────────────────────────────────────────────────────

/**
 * Creates a compiler with default configuration
 */
export function createCompiler(config?: Partial<CompilerConfig>): PolicyCompiler {
  return new PolicyCompiler(config);
}
