/**
 * I2E Supply Chain Firewall - Constraint Checkers
 *
 * Checkers validate specific values (vendors, models, regions) against
 * AIR constraints defined in the governance.lock file.
 *
 * @module @aigrc/i2e-firewall/checkers
 */

import { v4 as uuid } from "uuid";
import type { AIR, AIRVendor, AIRModel, AIRRegion } from "@aigrc/core";
import type {
  Violation,
  ViolationType,
  ViolationSeverity,
  CheckResult,
  VendorCheckResult,
  ModelCheckResult,
  RegionCheckResult,
} from "../types";

// ─────────────────────────────────────────────────────────────────
// HELPER FUNCTIONS
// ─────────────────────────────────────────────────────────────────

/**
 * Create a violation object
 */
export function createViolation(
  type: ViolationType,
  severity: ViolationSeverity,
  message: string,
  options?: Partial<Omit<Violation, "id" | "type" | "severity" | "message">>
): Violation {
  return {
    id: uuid(),
    type,
    severity,
    message,
    ...options,
  };
}

/**
 * Create a base check result
 */
function createBaseCheckResult(
  checkedValue: string,
  startTime: number
): Omit<CheckResult, "passed"> {
  return {
    violations: [],
    warnings: [],
    info: [],
    checkedValue,
    timestamp: new Date().toISOString(),
    durationMs: Date.now() - startTime,
  };
}

// ─────────────────────────────────────────────────────────────────
// VENDOR CHECKER
// ─────────────────────────────────────────────────────────────────

/**
 * Check if a vendor is allowed according to AIR constraints
 */
export function checkVendor(vendorId: string, air: AIR): VendorCheckResult {
  const startTime = Date.now();
  const base = createBaseCheckResult(vendorId, startTime);

  const registry = air.registry;
  const normalizedVendorId = vendorId.toLowerCase().trim();

  // Check if vendor is explicitly blocked
  const isBlocked = registry.blocked_vendors.some(
    (v: string) => v.toLowerCase() === normalizedVendorId
  );

  if (isBlocked) {
    const violation = createViolation(
      "blocked_vendor",
      "error",
      `Vendor '${vendorId}' is explicitly blocked by governance policy`,
      {
        violatingValue: vendorId,
        ruleId: "vendor-blocked",
        helpUri: "https://docs.aigrc.dev/constraints/vendors#blocked",
      }
    );
    base.violations.push(violation);

    // Add approved alternatives if available
    if (registry.allowed_vendors.length > 0) {
      violation.alternatives = registry.allowed_vendors.map((v: AIRVendor) => v.id);
    }

    return {
      ...base,
      passed: false,
      vendorId,
      isApproved: false,
      isBlocked: true,
      durationMs: Date.now() - startTime,
    };
  }

  // Check if vendor is in allowed list
  let approvedVendor: AIRVendor | undefined;
  const isApproved = registry.allowed_vendors.some((v: AIRVendor) => {
    if (v.id.toLowerCase() === normalizedVendorId) {
      approvedVendor = v;
      return true;
    }
    return false;
  });

  if (!isApproved && registry.allowed_vendors.length > 0) {
    const violation = createViolation(
      "unapproved_vendor",
      "error",
      `Vendor '${vendorId}' is not in the approved vendor list`,
      {
        violatingValue: vendorId,
        alternatives: registry.allowed_vendors.map((v: AIRVendor) => v.id),
        ruleId: "vendor-unapproved",
        helpUri: "https://docs.aigrc.dev/constraints/vendors#approved",
      }
    );
    base.violations.push(violation);

    return {
      ...base,
      passed: false,
      vendorId,
      isApproved: false,
      isBlocked: false,
      durationMs: Date.now() - startTime,
    };
  }

  // If no allowed_vendors list is defined, vendor is implicitly allowed
  if (registry.allowed_vendors.length === 0) {
    base.info.push(
      createViolation(
        "constraint_violation",
        "info",
        `No vendor allowlist defined - vendor '${vendorId}' is implicitly allowed`,
        { violatingValue: vendorId }
      )
    );
  }

  return {
    ...base,
    passed: true,
    vendorId,
    isApproved: isApproved ?? true,
    isBlocked: false,
    approvedVendor,
    durationMs: Date.now() - startTime,
  };
}

// ─────────────────────────────────────────────────────────────────
// MODEL CHECKER
// ─────────────────────────────────────────────────────────────────

/**
 * Check if a model is allowed according to AIR constraints
 */
export function checkModel(
  modelId: string,
  air: AIR,
  vendorId?: string
): ModelCheckResult {
  const startTime = Date.now();
  const base = createBaseCheckResult(modelId, startTime);

  const registry = air.registry;
  const normalizedModelId = modelId.toLowerCase().trim();

  // Check if model is explicitly blocked
  const isBlocked = registry.blocked_models.some(
    (m: string) => m.toLowerCase() === normalizedModelId
  );

  if (isBlocked) {
    const violation = createViolation(
      "blocked_model",
      "error",
      `Model '${modelId}' is explicitly blocked by governance policy`,
      {
        violatingValue: modelId,
        ruleId: "model-blocked",
        helpUri: "https://docs.aigrc.dev/constraints/models#blocked",
      }
    );
    base.violations.push(violation);

    // Add approved alternatives if available
    if (registry.allowed_models.length > 0) {
      violation.alternatives = registry.allowed_models.map((m: AIRModel) => m.id);
    }

    return {
      ...base,
      passed: false,
      modelId,
      vendorId,
      isApproved: false,
      isBlocked: true,
      durationMs: Date.now() - startTime,
    };
  }

  // Check if model is in allowed list
  let approvedModel: AIRModel | undefined;
  const isApproved = registry.allowed_models.some((m: AIRModel) => {
    if (m.id.toLowerCase() === normalizedModelId) {
      approvedModel = m;
      return true;
    }
    return false;
  });

  if (!isApproved && registry.allowed_models.length > 0) {
    const violation = createViolation(
      "unapproved_model",
      "error",
      `Model '${modelId}' is not in the approved model list`,
      {
        violatingValue: modelId,
        alternatives: registry.allowed_models.map((m: AIRModel) => m.id),
        ruleId: "model-unapproved",
        helpUri: "https://docs.aigrc.dev/constraints/models#approved",
      }
    );
    base.violations.push(violation);

    return {
      ...base,
      passed: false,
      modelId,
      vendorId,
      isApproved: false,
      isBlocked: false,
      durationMs: Date.now() - startTime,
    };
  }

  // If no allowed_models list is defined, model is implicitly allowed
  if (registry.allowed_models.length === 0) {
    base.info.push(
      createViolation(
        "constraint_violation",
        "info",
        `No model allowlist defined - model '${modelId}' is implicitly allowed`,
        { violatingValue: modelId }
      )
    );
  }

  return {
    ...base,
    passed: true,
    modelId,
    vendorId,
    isApproved: isApproved ?? true,
    isBlocked: false,
    approvedModel,
    durationMs: Date.now() - startTime,
  };
}

// ─────────────────────────────────────────────────────────────────
// REGION CHECKER
// ─────────────────────────────────────────────────────────────────

/**
 * Check if a region is allowed according to AIR constraints
 */
export function checkRegion(regionCode: string, air: AIR): RegionCheckResult {
  const startTime = Date.now();
  const base = createBaseCheckResult(regionCode, startTime);

  const registry = air.registry;
  const normalizedRegionCode = regionCode.toUpperCase().trim();

  // Check if region is explicitly blocked
  const isBlocked = registry.blocked_regions.some(
    (r: string) => r.toUpperCase() === normalizedRegionCode
  );

  if (isBlocked) {
    const violation = createViolation(
      "blocked_region",
      "error",
      `Region '${regionCode}' is explicitly blocked by governance policy`,
      {
        violatingValue: regionCode,
        ruleId: "region-blocked",
        helpUri: "https://docs.aigrc.dev/constraints/regions#blocked",
      }
    );
    base.violations.push(violation);

    // Add approved alternatives if available
    if (registry.allowed_regions.length > 0) {
      violation.alternatives = registry.allowed_regions.map((r: AIRRegion) => r.code);
    }

    return {
      ...base,
      passed: false,
      regionCode,
      isAllowed: false,
      isBlocked: true,
      durationMs: Date.now() - startTime,
    };
  }

  // Check if region is in allowed list
  let region: AIRRegion | undefined;
  const isAllowed = registry.allowed_regions.some((r: AIRRegion) => {
    if (r.code.toUpperCase() === normalizedRegionCode) {
      region = r;
      return true;
    }
    return false;
  });

  if (!isAllowed && registry.allowed_regions.length > 0) {
    const violation = createViolation(
      "unapproved_region",
      "error",
      `Region '${regionCode}' is not in the allowed region list`,
      {
        violatingValue: regionCode,
        alternatives: registry.allowed_regions.map((r: AIRRegion) => r.code),
        ruleId: "region-unapproved",
        helpUri: "https://docs.aigrc.dev/constraints/regions#approved",
      }
    );
    base.violations.push(violation);

    return {
      ...base,
      passed: false,
      regionCode,
      isAllowed: false,
      isBlocked: false,
      durationMs: Date.now() - startTime,
    };
  }

  // If no allowed_regions list is defined, region is implicitly allowed
  if (registry.allowed_regions.length === 0) {
    base.info.push(
      createViolation(
        "constraint_violation",
        "info",
        `No region allowlist defined - region '${regionCode}' is implicitly allowed`,
        { violatingValue: regionCode }
      )
    );
  }

  return {
    ...base,
    passed: true,
    regionCode,
    isAllowed: isAllowed ?? true,
    isBlocked: false,
    region,
    durationMs: Date.now() - startTime,
  };
}

// ─────────────────────────────────────────────────────────────────
// CONSTRAINT CHECKER CLASS
// ─────────────────────────────────────────────────────────────────

/**
 * Unified constraint checker that validates values against AIR
 */
export class ConstraintChecker {
  constructor(private readonly air: AIR) {}

  /**
   * Check a vendor against constraints
   */
  checkVendor(vendorId: string): VendorCheckResult {
    return checkVendor(vendorId, this.air);
  }

  /**
   * Check a model against constraints
   */
  checkModel(modelId: string, vendorId?: string): ModelCheckResult {
    return checkModel(modelId, this.air, vendorId);
  }

  /**
   * Check a region against constraints
   */
  checkRegion(regionCode: string): RegionCheckResult {
    return checkRegion(regionCode, this.air);
  }

  /**
   * Check multiple vendors at once
   */
  checkVendors(vendorIds: string[]): VendorCheckResult[] {
    return vendorIds.map((id) => this.checkVendor(id));
  }

  /**
   * Check multiple models at once
   */
  checkModels(modelIds: string[], vendorId?: string): ModelCheckResult[] {
    return modelIds.map((id) => this.checkModel(id, vendorId));
  }

  /**
   * Check multiple regions at once
   */
  checkRegions(regionCodes: string[]): RegionCheckResult[] {
    return regionCodes.map((code) => this.checkRegion(code));
  }

  /**
   * Get the AIR constraints
   */
  getAIR(): AIR {
    return this.air;
  }
}

/**
 * Create a constraint checker from AIR
 */
export function createConstraintChecker(air: AIR): ConstraintChecker {
  return new ConstraintChecker(air);
}
