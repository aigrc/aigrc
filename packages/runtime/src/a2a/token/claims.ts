/**
 * Token Claims Validation - SPEC-PRT-003
 *
 * Deep validation of AIGOS-specific claims in governance tokens.
 */

import type { RiskLevel } from "@aigrc/core";
import type {
  AigosTokenClaims,
  TokenIdentityClaims,
  TokenGovernanceClaims,
  TokenControlClaims,
  TokenCapabilityClaims,
  TokenLineageClaims,
} from "./generator.js";

/**
 * Claims validation error
 */
export interface ClaimsValidationError {
  field: string;
  message: string;
}

/**
 * Result of claims validation
 */
export interface ClaimsValidationResult {
  valid: boolean;
  errors: ClaimsValidationError[];
}

/**
 * Validate identity claims
 */
export function validateIdentityClaims(
  claims: TokenIdentityClaims
): ClaimsValidationResult {
  const errors: ClaimsValidationError[] = [];

  if (!claims.instance_id || typeof claims.instance_id !== "string") {
    errors.push({
      field: "aigos.identity.instance_id",
      message: "instance_id is required and must be a string",
    });
  }

  if (!claims.asset_id || typeof claims.asset_id !== "string") {
    errors.push({
      field: "aigos.identity.asset_id",
      message: "asset_id is required and must be a string",
    });
  }

  if (!claims.asset_name || typeof claims.asset_name !== "string") {
    errors.push({
      field: "aigos.identity.asset_name",
      message: "asset_name is required and must be a string",
    });
  }

  if (!claims.asset_version || typeof claims.asset_version !== "string") {
    errors.push({
      field: "aigos.identity.asset_version",
      message: "asset_version is required and must be a string",
    });
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Validate governance claims
 */
export function validateGovernanceClaims(
  claims: TokenGovernanceClaims
): ClaimsValidationResult {
  const errors: ClaimsValidationError[] = [];
  const validRiskLevels: RiskLevel[] = ["minimal", "limited", "high", "unacceptable"];
  const validModes = ["NORMAL", "SANDBOX", "RESTRICTED"];

  if (!claims.risk_level || !validRiskLevels.includes(claims.risk_level)) {
    errors.push({
      field: "aigos.governance.risk_level",
      message: `risk_level must be one of: ${validRiskLevels.join(", ")}`,
    });
  }

  if (!claims.mode || !validModes.includes(claims.mode)) {
    errors.push({
      field: "aigos.governance.mode",
      message: `mode must be one of: ${validModes.join(", ")}`,
    });
  }

  if (!claims.golden_thread) {
    errors.push({
      field: "aigos.governance.golden_thread",
      message: "golden_thread is required",
    });
  } else {
    if (typeof claims.golden_thread.hash !== "string") {
      errors.push({
        field: "aigos.governance.golden_thread.hash",
        message: "golden_thread.hash is required and must be a string",
      });
    }
    if (typeof claims.golden_thread.verified !== "boolean") {
      errors.push({
        field: "aigos.governance.golden_thread.verified",
        message: "golden_thread.verified is required and must be a boolean",
      });
    }
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Validate control claims
 */
export function validateControlClaims(
  claims: TokenControlClaims
): ClaimsValidationResult {
  const errors: ClaimsValidationError[] = [];
  const validChannels = ["sse", "polling", "file"];

  if (!claims.kill_switch) {
    errors.push({
      field: "aigos.control.kill_switch",
      message: "kill_switch is required",
    });
  } else {
    if (typeof claims.kill_switch.enabled !== "boolean") {
      errors.push({
        field: "aigos.control.kill_switch.enabled",
        message: "kill_switch.enabled is required and must be a boolean",
      });
    }
    if (!claims.kill_switch.channel || !validChannels.includes(claims.kill_switch.channel)) {
      errors.push({
        field: "aigos.control.kill_switch.channel",
        message: `kill_switch.channel must be one of: ${validChannels.join(", ")}`,
      });
    }
  }

  if (typeof claims.paused !== "boolean") {
    errors.push({
      field: "aigos.control.paused",
      message: "paused is required and must be a boolean",
    });
  }

  if (typeof claims.termination_pending !== "boolean") {
    errors.push({
      field: "aigos.control.termination_pending",
      message: "termination_pending is required and must be a boolean",
    });
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Validate capability claims
 */
export function validateCapabilityClaims(
  claims: TokenCapabilityClaims
): ClaimsValidationResult {
  const errors: ClaimsValidationError[] = [];

  if (typeof claims.hash !== "string") {
    errors.push({
      field: "aigos.capabilities.hash",
      message: "capabilities.hash is required and must be a string",
    });
  }

  if (!Array.isArray(claims.tools)) {
    errors.push({
      field: "aigos.capabilities.tools",
      message: "capabilities.tools is required and must be an array",
    });
  } else if (!claims.tools.every((t) => typeof t === "string")) {
    errors.push({
      field: "aigos.capabilities.tools",
      message: "all tools must be strings",
    });
  }

  if (claims.max_budget_usd !== null && typeof claims.max_budget_usd !== "number") {
    errors.push({
      field: "aigos.capabilities.max_budget_usd",
      message: "max_budget_usd must be null or a number",
    });
  }

  if (typeof claims.can_spawn !== "boolean") {
    errors.push({
      field: "aigos.capabilities.can_spawn",
      message: "can_spawn is required and must be a boolean",
    });
  }

  if (typeof claims.max_child_depth !== "number" || claims.max_child_depth < 0) {
    errors.push({
      field: "aigos.capabilities.max_child_depth",
      message: "max_child_depth is required and must be a non-negative number",
    });
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Validate lineage claims
 */
export function validateLineageClaims(
  claims: TokenLineageClaims
): ClaimsValidationResult {
  const errors: ClaimsValidationError[] = [];

  if (typeof claims.generation_depth !== "number" || claims.generation_depth < 0) {
    errors.push({
      field: "aigos.lineage.generation_depth",
      message: "generation_depth is required and must be a non-negative number",
    });
  }

  if (claims.parent_instance_id !== null && typeof claims.parent_instance_id !== "string") {
    errors.push({
      field: "aigos.lineage.parent_instance_id",
      message: "parent_instance_id must be null or a string",
    });
  }

  if (!claims.root_instance_id || typeof claims.root_instance_id !== "string") {
    errors.push({
      field: "aigos.lineage.root_instance_id",
      message: "root_instance_id is required and must be a string",
    });
  }

  // Root agents should have depth 0 and no parent
  if (claims.generation_depth === 0) {
    if (claims.parent_instance_id !== null) {
      errors.push({
        field: "aigos.lineage.parent_instance_id",
        message: "root agent (depth 0) should have null parent_instance_id",
      });
    }
  } else {
    // Non-root agents must have a parent
    if (claims.parent_instance_id === null) {
      errors.push({
        field: "aigos.lineage.parent_instance_id",
        message: "non-root agent must have parent_instance_id",
      });
    }
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Validate all AIGOS claims
 */
export function validateAigosClaims(
  claims: AigosTokenClaims
): ClaimsValidationResult {
  const allErrors: ClaimsValidationError[] = [];

  if (!claims.version) {
    allErrors.push({
      field: "aigos.version",
      message: "version is required",
    });
  }

  const identityResult = validateIdentityClaims(claims.identity);
  allErrors.push(...identityResult.errors);

  const governanceResult = validateGovernanceClaims(claims.governance);
  allErrors.push(...governanceResult.errors);

  const controlResult = validateControlClaims(claims.control);
  allErrors.push(...controlResult.errors);

  const capabilityResult = validateCapabilityClaims(claims.capabilities);
  allErrors.push(...capabilityResult.errors);

  const lineageResult = validateLineageClaims(claims.lineage);
  allErrors.push(...lineageResult.errors);

  return { valid: allErrors.length === 0, errors: allErrors };
}

/**
 * Check if capabilities are a subset (for capability decay validation)
 */
export function isCapabilitySubset(
  child: TokenCapabilityClaims,
  parent: TokenCapabilityClaims
): { valid: boolean; violations: string[] } {
  const violations: string[] = [];

  // Check tools are subset
  const parentTools = new Set(parent.tools);
  for (const tool of child.tools) {
    if (!parentTools.has(tool)) {
      violations.push(`Tool "${tool}" not in parent capabilities`);
    }
  }

  // Check budget is not higher
  if (child.max_budget_usd !== null && parent.max_budget_usd !== null) {
    if (child.max_budget_usd > parent.max_budget_usd) {
      violations.push(
        `Child budget ${child.max_budget_usd} exceeds parent budget ${parent.max_budget_usd}`
      );
    }
  }

  // Child cannot spawn if parent cannot
  if (child.can_spawn && !parent.can_spawn) {
    violations.push("Child cannot have spawn capability if parent does not");
  }

  // Check depth limit
  if (child.max_child_depth > parent.max_child_depth) {
    violations.push(
      `Child max_child_depth ${child.max_child_depth} exceeds parent ${parent.max_child_depth}`
    );
  }

  return { valid: violations.length === 0, violations };
}
