/**
 * I2E Supply Chain Firewall - Checker Tests
 */

import { describe, it, expect } from "vitest";
import {
  checkVendor,
  checkModel,
  checkRegion,
  createConstraintChecker,
  ConstraintChecker,
} from "../src/checkers";
import type { AIR } from "@aigrc/core";

// Helper to create a minimal AIR for testing
function createTestAIR(overrides: Partial<AIR["registry"]> = {}): AIR {
  return {
    version: "1.0",
    id: "test-air-id",
    name: "Test AIR",
    policy_sources: [],
    registry: {
      allowed_vendors: [],
      blocked_vendors: [],
      allowed_regions: [],
      blocked_regions: [],
      allowed_models: [],
      blocked_models: [],
      require_vendor_approval: true,
      require_model_approval: true,
      unknown_vendor_behavior: "request_approval",
      unknown_model_behavior: "request_approval",
      ...overrides,
    },
    runtime: {
      data_retention_days: 90,
      watermark_enabled: false,
      logging_level: "all",
      human_approval_required: [],
    },
    build: {
      require_golden_thread: true,
      require_asset_card: true,
      require_risk_classification: true,
      require_model_card: false,
      require_security_review: false,
      security_review_risk_levels: ["high", "unacceptable"],
      require_governance_lock: true,
      require_lock_signature: false,
      block_on_failure: true,
      generate_sarif: true,
      required_approvals: [],
      allowed_environments: ["development", "staging", "production"],
    },
    metadata: {
      generated_at: new Date().toISOString(),
      generated_by: "test",
      compiler_version: "1.0.0",
      tags: [],
    },
    signatures: [],
  };
}

describe("checkVendor", () => {
  it("should pass when vendor is in allowed list", () => {
    const air = createTestAIR({
      allowed_vendors: [
        { id: "openai", status: "approved" },
        { id: "anthropic", status: "approved" },
      ],
    });

    const result = checkVendor("openai", air);

    expect(result.passed).toBe(true);
    expect(result.isApproved).toBe(true);
    expect(result.isBlocked).toBe(false);
    expect(result.violations).toHaveLength(0);
  });

  it("should fail when vendor is blocked", () => {
    const air = createTestAIR({
      allowed_vendors: [{ id: "openai", status: "approved" }],
      blocked_vendors: ["badvendor"],
    });

    const result = checkVendor("badvendor", air);

    expect(result.passed).toBe(false);
    expect(result.isBlocked).toBe(true);
    expect(result.violations).toHaveLength(1);
    expect(result.violations[0].type).toBe("blocked_vendor");
  });

  it("should fail when vendor is not in allowed list", () => {
    const air = createTestAIR({
      allowed_vendors: [
        { id: "openai", status: "approved" },
        { id: "anthropic", status: "approved" },
      ],
    });

    const result = checkVendor("cohere", air);

    expect(result.passed).toBe(false);
    expect(result.isApproved).toBe(false);
    expect(result.violations).toHaveLength(1);
    expect(result.violations[0].type).toBe("unapproved_vendor");
    expect(result.violations[0].alternatives).toContain("openai");
    expect(result.violations[0].alternatives).toContain("anthropic");
  });

  it("should pass when no allowed list is defined (implicit allow)", () => {
    const air = createTestAIR({
      allowed_vendors: [],
    });

    const result = checkVendor("anyvendor", air);

    expect(result.passed).toBe(true);
    expect(result.info).toHaveLength(1);
    expect(result.info[0].message).toContain("implicitly allowed");
  });

  it("should be case-insensitive", () => {
    const air = createTestAIR({
      allowed_vendors: [{ id: "OpenAI", status: "approved" }],
    });

    const result = checkVendor("openai", air);
    expect(result.passed).toBe(true);
    expect(result.isApproved).toBe(true);
  });
});

describe("checkModel", () => {
  it("should pass when model is in allowed list", () => {
    const air = createTestAIR({
      allowed_models: [
        { id: "gpt-4", vendor_id: "openai", status: "approved" },
      ],
    });

    const result = checkModel("gpt-4", air, "openai");

    expect(result.passed).toBe(true);
    expect(result.isApproved).toBe(true);
    expect(result.isBlocked).toBe(false);
  });

  it("should fail when model is blocked", () => {
    const air = createTestAIR({
      blocked_models: ["gpt-3.5-turbo"],
    });

    const result = checkModel("gpt-3.5-turbo", air);

    expect(result.passed).toBe(false);
    expect(result.isBlocked).toBe(true);
    expect(result.violations).toHaveLength(1);
    expect(result.violations[0].type).toBe("blocked_model");
  });

  it("should fail when model is not in allowed list", () => {
    const air = createTestAIR({
      allowed_models: [
        { id: "gpt-4", vendor_id: "openai", status: "approved" },
      ],
    });

    const result = checkModel("claude-3-opus", air);

    expect(result.passed).toBe(false);
    expect(result.isApproved).toBe(false);
    expect(result.violations).toHaveLength(1);
    expect(result.violations[0].type).toBe("unapproved_model");
  });

  it("should pass when no allowed list is defined (implicit allow)", () => {
    const air = createTestAIR({
      allowed_models: [],
    });

    const result = checkModel("any-model", air);

    expect(result.passed).toBe(true);
    expect(result.info).toHaveLength(1);
  });
});

describe("checkRegion", () => {
  it("should pass when region is in allowed list", () => {
    const air = createTestAIR({
      allowed_regions: [
        { code: "us-east-1", status: "allowed", jurisdictions: [], data_residency: "none" },
        { code: "eu-west-1", status: "allowed", jurisdictions: ["GDPR"], data_residency: "required" },
      ],
    });

    const result = checkRegion("us-east-1", air);

    expect(result.passed).toBe(true);
    expect(result.isAllowed).toBe(true);
    expect(result.isBlocked).toBe(false);
  });

  it("should fail when region is blocked", () => {
    const air = createTestAIR({
      blocked_regions: ["cn-north-1"],
    });

    const result = checkRegion("cn-north-1", air);

    expect(result.passed).toBe(false);
    expect(result.isBlocked).toBe(true);
    expect(result.violations).toHaveLength(1);
    expect(result.violations[0].type).toBe("blocked_region");
  });

  it("should fail when region is not in allowed list", () => {
    const air = createTestAIR({
      allowed_regions: [
        { code: "us-east-1", status: "allowed", jurisdictions: [], data_residency: "none" },
      ],
    });

    const result = checkRegion("ap-southeast-1", air);

    expect(result.passed).toBe(false);
    expect(result.isAllowed).toBe(false);
    expect(result.violations).toHaveLength(1);
    expect(result.violations[0].type).toBe("unapproved_region");
  });

  it("should pass when no allowed list is defined (implicit allow)", () => {
    const air = createTestAIR({
      allowed_regions: [],
    });

    const result = checkRegion("any-region", air);

    expect(result.passed).toBe(true);
    expect(result.info).toHaveLength(1);
  });

  it("should be case-insensitive for region codes", () => {
    const air = createTestAIR({
      allowed_regions: [
        { code: "US-EAST-1", status: "allowed", jurisdictions: [], data_residency: "none" },
      ],
    });

    const result = checkRegion("us-east-1", air);
    expect(result.passed).toBe(true);
  });
});

describe("ConstraintChecker", () => {
  it("should create a checker from AIR", () => {
    const air = createTestAIR({
      allowed_vendors: [{ id: "openai", status: "approved" }],
    });

    const checker = createConstraintChecker(air);

    expect(checker).toBeInstanceOf(ConstraintChecker);
    expect(checker.getAIR()).toBe(air);
  });

  it("should check multiple vendors", () => {
    const air = createTestAIR({
      allowed_vendors: [{ id: "openai", status: "approved" }],
    });

    const checker = createConstraintChecker(air);
    const results = checker.checkVendors(["openai", "anthropic"]);

    expect(results).toHaveLength(2);
    expect(results[0].passed).toBe(true);
    expect(results[1].passed).toBe(false);
  });

  it("should check multiple models", () => {
    const air = createTestAIR({
      allowed_models: [
        { id: "gpt-4", vendor_id: "openai", status: "approved" },
      ],
    });

    const checker = createConstraintChecker(air);
    const results = checker.checkModels(["gpt-4", "gpt-3.5-turbo"]);

    expect(results).toHaveLength(2);
    expect(results[0].passed).toBe(true);
    expect(results[1].passed).toBe(false);
  });

  it("should check multiple regions", () => {
    const air = createTestAIR({
      allowed_regions: [
        { code: "us-east-1", status: "allowed", jurisdictions: [], data_residency: "none" },
      ],
    });

    const checker = createConstraintChecker(air);
    const results = checker.checkRegions(["us-east-1", "eu-west-1"]);

    expect(results).toHaveLength(2);
    expect(results[0].passed).toBe(true);
    expect(results[1].passed).toBe(false);
  });
});
