/**
 * @aigrc/i2e-firewall - I2E Supply Chain Firewall
 *
 * The Supply Chain Firewall enforces AIR (AIGRC Intermediate Representation)
 * constraints across the development lifecycle: IDE, CI/CD, and runtime.
 *
 * @module @aigrc/i2e-firewall
 *
 * @example
 * ```typescript
 * import {
 *   ConstraintChecker,
 *   CodeScanner,
 *   Reporter,
 *   loadGovernanceLock
 * } from "@aigrc/i2e-firewall";
 *
 * // Load governance.lock
 * const lock = await loadGovernanceLock("./governance.lock");
 *
 * // Check a specific vendor
 * const checker = new ConstraintChecker(lock.air);
 * const result = checker.checkVendor("openai");
 * if (!result.passed) {
 *   console.error("Vendor not allowed:", result.violations);
 * }
 *
 * // Scan entire project
 * const scanner = new CodeScanner(lock.air);
 * const scanResult = await scanner.scanProject("./src");
 *
 * // Generate SARIF report for GitHub Security
 * const reporter = new Reporter({ format: "sarif" });
 * const sarifReport = reporter.generate(scanResult);
 * ```
 */

// Types
export * from "./types";

// Checkers
export {
  // Functions
  createViolation,
  checkVendor,
  checkModel,
  checkRegion,
  createConstraintChecker,
  // Class
  ConstraintChecker,
} from "./checkers";

// Scanners
export {
  // Functions
  scanFile,
  scanDirectory,
  scanProject,
  createCodeScanner,
  // Class
  CodeScanner,
} from "./scanners";

// Reporters
export {
  // Functions
  generateSarifReport,
  generateSarifReportString,
  generateJsonReport,
  generateTextReport,
  createReporter,
  // Class
  Reporter,
  // Types
  type ReportFormat,
  type ReporterOptions,
  type JsonReportOptions,
  type TextReportOptions,
} from "./reporters";

// Re-export core types
export type {
  AIR,
  AIRRegistryConstraints,
  AIRRuntimeConstraints,
  AIRBuildConstraints,
  GovernanceLock,
} from "@aigrc/core";

// ─────────────────────────────────────────────────────────────────
// GOVERNANCE LOCK UTILITIES
// ─────────────────────────────────────────────────────────────────

import { readFile } from "fs/promises";
import { parse as parseYaml } from "yaml";
import { GovernanceLockSchema } from "@aigrc/core";
import type { GovernanceLock, AIR } from "@aigrc/core";
import type { GovernanceLockValidation } from "./types";

/**
 * Convert GovernanceLock constraints to AIR format for use with checkers
 * This creates a minimal AIR-compatible structure from the lock file
 */
function lockConstraintsToAIR(lock: GovernanceLock): AIR {
  const registry = lock.constraints.registry;
  const runtime = lock.constraints.runtime;
  const build = lock.constraints.build;

  return {
    version: "1.0",
    id: lock.air_reference?.id ?? crypto.randomUUID(),
    name: lock.name ?? "governance.lock",
    hash: lock.policy_hash,
    policy_sources: lock.policy_sources.map((s) => ({
      id: s.id,
      type: s.type,
      uri: s.uri,
      content_hash: s.content_hash,
      fetched_at: s.fetched_at,
      title: s.title,
      version: s.version,
    })),
    registry: {
      allowed_vendors: registry.allowed_vendor_ids.map((id) => ({
        id,
        status: "approved" as const,
      })),
      blocked_vendors: registry.blocked_vendor_ids,
      allowed_regions: registry.allowed_region_codes.map((code) => ({
        code,
        status: "allowed" as const,
        jurisdictions: [],
        data_residency: "none" as const,
      })),
      blocked_regions: registry.blocked_region_codes,
      allowed_models: registry.allowed_model_patterns.map((id) => ({
        id,
        vendor_id: "unknown",
        status: "approved" as const,
      })),
      blocked_models: registry.blocked_model_patterns,
      max_model_parameters: registry.max_model_parameters,
      require_vendor_approval: true,
      require_model_approval: true,
      unknown_vendor_behavior: "request_approval" as const,
      unknown_model_behavior: "request_approval" as const,
    },
    runtime: {
      pii_filter: runtime.pii_filter_enabled
        ? {
            enabled: true,
            filter_types: [],
            action: runtime.pii_filter_action ?? "warn",
            custom_patterns: [],
          }
        : undefined,
      toxicity_filter: runtime.toxicity_filter_enabled
        ? {
            enabled: true,
            threshold: runtime.toxicity_threshold ?? 0.7,
            categories: [],
            action: "warn" as const,
          }
        : undefined,
      data_retention_days: runtime.data_retention_days,
      watermark_enabled: runtime.watermark_enabled,
      logging_level: runtime.logging_level,
      max_tokens_per_request: runtime.max_tokens_per_request,
      max_cost_per_day_usd: runtime.max_cost_per_day_usd,
      human_approval_required: [],
      kill_switch: runtime.kill_switch_enabled
        ? {
            enabled: true,
            channel: "sse" as const,
            poll_interval_ms: 5000,
          }
        : undefined,
    },
    build: {
      require_golden_thread: build.require_golden_thread,
      require_asset_card: build.require_asset_card,
      require_risk_classification: build.require_risk_classification,
      require_model_card: build.require_model_card,
      require_security_review: build.require_security_review,
      security_review_risk_levels: ["high", "unacceptable"],
      require_governance_lock: true,
      require_lock_signature: false,
      block_on_failure: build.block_on_failure,
      generate_sarif: build.generate_sarif,
      required_approvals: [],
      allowed_environments: build.allowed_environments,
    },
    metadata: {
      generated_at: lock.generated_at,
      generated_by: lock.generated_by,
      compiler_version: lock.generator_version,
      organization: lock.organization,
      environment: lock.environment,
      tags: [],
    },
    expires_at: lock.expires_at,
    signatures: [],
  };
}

/**
 * Load and validate a governance.lock file
 */
export async function loadGovernanceLock(
  lockFilePath: string
): Promise<GovernanceLockValidation & { lock?: GovernanceLock }> {
  const validation: GovernanceLockValidation = {
    valid: false,
    exists: false,
    expired: false,
    errors: [],
    warnings: [],
  };

  try {
    const content = await readFile(lockFilePath, "utf-8");
    validation.exists = true;
    validation.path = lockFilePath;

    // Parse YAML or JSON
    let parsed: unknown;
    try {
      parsed = parseYaml(content);
    } catch (parseError) {
      validation.errors.push(
        `Failed to parse governance.lock: ${parseError instanceof Error ? parseError.message : String(parseError)}`
      );
      return validation;
    }

    // Validate against schema
    const result = GovernanceLockSchema.safeParse(parsed);
    if (!result.success) {
      for (const issue of result.error.issues) {
        validation.errors.push(`${issue.path.join(".")}: ${issue.message}`);
      }
      return validation;
    }

    const lock = result.data;

    // Check expiration
    const expiresAt = new Date(lock.expires_at);
    const now = new Date();
    if (expiresAt < now) {
      validation.expired = true;
      validation.errors.push(
        `Governance lock expired at ${lock.expires_at}`
      );
      return { ...validation, lock };
    }

    // Warning if expiring soon (7 days)
    const sevenDays = 7 * 24 * 60 * 60 * 1000;
    if (expiresAt.getTime() - now.getTime() < sevenDays) {
      validation.warnings.push(
        `Governance lock will expire soon (${lock.expires_at})`
      );
    }

    validation.valid = true;
    // Convert lock constraints to AIR format for use with checkers
    validation.air = lockConstraintsToAIR(lock);

    return { ...validation, lock };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      validation.errors.push(`Governance lock file not found: ${lockFilePath}`);
    } else {
      validation.errors.push(
        `Failed to read governance.lock: ${error instanceof Error ? error.message : String(error)}`
      );
    }
    return validation;
  }
}

/**
 * Validate a governance.lock file without loading AIR
 */
export async function validateGovernanceLock(
  lockFilePath: string
): Promise<GovernanceLockValidation> {
  const result = await loadGovernanceLock(lockFilePath);
  // Return without the lock object
  const { lock: _, ...validation } = result;
  return validation;
}

/**
 * Quick check if governance.lock exists and is valid
 */
export async function checkGovernanceLock(
  lockFilePath: string
): Promise<{ valid: boolean; air?: AIR; error?: string }> {
  const result = await loadGovernanceLock(lockFilePath);
  if (result.valid && result.air) {
    return { valid: true, air: result.air };
  }
  return { valid: false, error: result.errors[0] };
}
