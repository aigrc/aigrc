import { describe, it, expect } from "vitest";
import {
  AIRSchema,
  AIR,
  AIRRegistryConstraintsSchema,
  AIRRuntimeConstraintsSchema,
  AIRBuildConstraintsSchema,
  AIRPolicySourceSchema,
  AIRVendorSchema,
  AIRModelSchema,
  AIRRegionSchema,
  createEmptyAIR,
  validateAIR,
  isVendorAllowed,
  isModelAllowed,
  isRegionAllowed,
  AIRRegistryConstraints,
} from "../src/air";

describe("AIR Schema", () => {
  describe("AIRVendorSchema", () => {
    it("should validate a valid vendor", () => {
      const vendor = {
        id: "openai",
        name: "OpenAI",
        status: "approved",
        approval_ticket: "JIRA-123",
        approved_at: "2026-01-01T00:00:00Z",
        approved_by: "ciso@company.com",
      };
      expect(AIRVendorSchema.parse(vendor)).toMatchObject(vendor);
    });

    it("should reject vendor without id", () => {
      const vendor = { name: "OpenAI", status: "approved" };
      expect(() => AIRVendorSchema.parse(vendor)).toThrow();
    });

    it("should default status to pending", () => {
      const vendor = { id: "anthropic" };
      const parsed = AIRVendorSchema.parse(vendor);
      expect(parsed.status).toBe("pending");
    });
  });

  describe("AIRModelSchema", () => {
    it("should validate a valid model", () => {
      const model = {
        id: "gpt-4",
        vendor_id: "openai",
        name: "GPT-4",
        status: "approved",
        risk_level: "limited",
        max_parameters: 1000000000000,
      };
      expect(AIRModelSchema.parse(model)).toMatchObject(model);
    });

    it("should support version patterns", () => {
      const model = {
        id: "gpt-4-*",
        vendor_id: "openai",
        version_pattern: "gpt-4-*",
        status: "approved",
      };
      const parsed = AIRModelSchema.parse(model);
      expect(parsed.version_pattern).toBe("gpt-4-*");
    });
  });

  describe("AIRRegionSchema", () => {
    it("should validate a valid region", () => {
      const region = {
        code: "eu-west-1",
        name: "EU West 1 (Ireland)",
        status: "allowed",
        jurisdictions: ["GDPR", "EU-AI-ACT"],
        data_residency: "required",
      };
      expect(AIRRegionSchema.parse(region)).toMatchObject(region);
    });

    it("should default status to allowed", () => {
      const region = { code: "us-east-1" };
      const parsed = AIRRegionSchema.parse(region);
      expect(parsed.status).toBe("allowed");
    });
  });

  describe("AIRRegistryConstraintsSchema", () => {
    it("should validate valid registry constraints", () => {
      const registry = {
        allowed_vendors: [{ id: "openai", status: "approved" }],
        blocked_vendors: ["malicious-vendor"],
        allowed_regions: [{ code: "EU", status: "allowed" }],
        blocked_regions: ["cn-north-1"],
        allowed_models: [{ id: "gpt-4", vendor_id: "openai", status: "approved" }],
        blocked_models: ["llama-uncensored-*"],
        require_vendor_approval: true,
        require_model_approval: true,
      };
      const parsed = AIRRegistryConstraintsSchema.parse(registry);
      expect(parsed.allowed_vendors).toHaveLength(1);
      expect(parsed.blocked_models).toContain("llama-uncensored-*");
    });

    it("should use defaults for empty constraints", () => {
      const parsed = AIRRegistryConstraintsSchema.parse({});
      expect(parsed.allowed_vendors).toEqual([]);
      expect(parsed.require_vendor_approval).toBe(true);
      expect(parsed.unknown_vendor_behavior).toBe("request_approval");
    });
  });

  describe("AIRRuntimeConstraintsSchema", () => {
    it("should validate valid runtime constraints", () => {
      const runtime = {
        pii_filter: {
          enabled: true,
          filter_types: ["email", "ssn"],
          action: "redact",
        },
        toxicity_filter: {
          enabled: true,
          threshold: 0.8,
          categories: ["hate", "violence"],
          action: "block",
        },
        data_retention_days: 30,
        watermark_enabled: true,
        logging_level: "all",
        max_tokens_per_request: 4096,
        max_cost_per_day_usd: 100.0,
      };
      const parsed = AIRRuntimeConstraintsSchema.parse(runtime);
      expect(parsed.pii_filter?.enabled).toBe(true);
      expect(parsed.toxicity_filter?.threshold).toBe(0.8);
    });

    it("should have sensible defaults", () => {
      const parsed = AIRRuntimeConstraintsSchema.parse({});
      expect(parsed.data_retention_days).toBe(90);
      expect(parsed.logging_level).toBe("all");
      expect(parsed.watermark_enabled).toBe(false);
    });
  });

  describe("AIRBuildConstraintsSchema", () => {
    it("should validate valid build constraints", () => {
      const build = {
        require_golden_thread: true,
        require_asset_card: true,
        require_risk_classification: true,
        require_model_card: true,
        require_security_review: true,
        security_review_risk_levels: ["high", "unacceptable"],
        require_governance_lock: true,
        require_lock_signature: true,
        block_on_failure: true,
        generate_sarif: true,
        required_approvals: [{ role: "CISO", count: 1 }],
        allowed_environments: ["staging", "production"],
        environment_constraints: {
          production: {
            require_approval: true,
            approvers: ["ciso@company.com"],
            require_testing: true,
            test_coverage_threshold: 80,
          },
        },
      };
      const parsed = AIRBuildConstraintsSchema.parse(build);
      expect(parsed.require_golden_thread).toBe(true);
      expect(parsed.environment_constraints?.production.test_coverage_threshold).toBe(80);
    });
  });

  describe("AIRPolicySourceSchema", () => {
    it("should validate a valid policy source", () => {
      const source = {
        id: "ai-policy-2026",
        type: "pdf",
        uri: "file:///policies/ai-policy.pdf",
        content_hash: "sha256:" + "a".repeat(64),
        fetched_at: "2026-01-01T00:00:00Z",
        title: "Corporate AI Policy",
        version: "2.0",
        extraction_confidence: 0.95,
      };
      const parsed = AIRPolicySourceSchema.parse(source);
      expect(parsed.type).toBe("pdf");
      expect(parsed.extraction_confidence).toBe(0.95);
    });

    it("should reject invalid hash format", () => {
      const source = {
        id: "test",
        type: "url",
        uri: "https://example.com/policy",
        content_hash: "invalid-hash",
        fetched_at: "2026-01-01T00:00:00Z",
      };
      expect(() => AIRPolicySourceSchema.parse(source)).toThrow();
    });
  });

  describe("AIRSchema (full document)", () => {
    it("should validate a complete AIR document", () => {
      const air: AIR = {
        version: "1.0",
        id: "550e8400-e29b-41d4-a716-446655440000",
        name: "Production AI Governance Policy",
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
          generated_at: "2026-01-08T00:00:00Z",
          generated_by: "aigrc-policy-compiler",
          compiler_version: "1.0.0",
          tags: ["production", "ai-governance"],
        },
        signatures: [],
      };
      const parsed = AIRSchema.parse(air);
      expect(parsed.version).toBe("1.0");
      expect(parsed.name).toBe("Production AI Governance Policy");
    });

    it("should reject invalid version", () => {
      const air = {
        version: "2.0", // Invalid
        id: "550e8400-e29b-41d4-a716-446655440000",
        name: "Test",
        metadata: {
          generated_at: "2026-01-08T00:00:00Z",
          compiler_version: "1.0.0",
        },
      };
      expect(() => AIRSchema.parse(air)).toThrow();
    });
  });

  describe("createEmptyAIR", () => {
    it("should create a valid empty AIR", () => {
      const air = createEmptyAIR("Test Policy");
      const validation = validateAIR(air);
      expect(validation.valid).toBe(true);
      expect(air.name).toBe("Test Policy");
      expect(air.version).toBe("1.0");
    });

    it("should use provided compiler version", () => {
      const air = createEmptyAIR("Test", "2.0.0");
      expect(air.metadata.compiler_version).toBe("2.0.0");
    });
  });

  describe("validateAIR", () => {
    it("should return valid: true for valid AIR", () => {
      const air = createEmptyAIR("Test");
      const result = validateAIR(air);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("should return errors for invalid AIR", () => {
      const invalidAir = { version: "invalid", name: "" };
      const result = validateAIR(invalidAir);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe("isVendorAllowed", () => {
    const registry: AIRRegistryConstraints = {
      allowed_vendors: [
        { id: "openai", status: "approved" },
        { id: "anthropic", status: "pending" },
        {
          id: "expired-vendor",
          status: "approved",
          expires_at: "2020-01-01T00:00:00Z",
        },
      ],
      blocked_vendors: ["malicious-ai"],
      allowed_regions: [],
      blocked_regions: [],
      allowed_models: [],
      blocked_models: [],
      require_vendor_approval: true,
      require_model_approval: true,
      unknown_vendor_behavior: "request_approval",
      unknown_model_behavior: "request_approval",
    };

    it("should allow approved vendors", () => {
      const result = isVendorAllowed("openai", registry);
      expect(result.allowed).toBe(true);
      expect(result.requiresApproval).toBe(false);
    });

    it("should block blocked vendors", () => {
      const result = isVendorAllowed("malicious-ai", registry);
      expect(result.allowed).toBe(false);
      expect(result.requiresApproval).toBe(false);
    });

    it("should require approval for pending vendors", () => {
      const result = isVendorAllowed("anthropic", registry);
      expect(result.allowed).toBe(false);
      expect(result.requiresApproval).toBe(true);
    });

    it("should handle expired approvals", () => {
      const result = isVendorAllowed("expired-vendor", registry);
      expect(result.allowed).toBe(false);
      expect(result.requiresApproval).toBe(true);
    });

    it("should require approval for unknown vendors", () => {
      const result = isVendorAllowed("unknown-vendor", registry);
      expect(result.allowed).toBe(false);
      expect(result.requiresApproval).toBe(true);
    });

    it("should block unknown vendors when configured", () => {
      const strictRegistry = { ...registry, unknown_vendor_behavior: "block" as const };
      const result = isVendorAllowed("unknown-vendor", strictRegistry);
      expect(result.allowed).toBe(false);
      expect(result.requiresApproval).toBe(false);
    });
  });

  describe("isModelAllowed", () => {
    const registry: AIRRegistryConstraints = {
      allowed_vendors: [],
      blocked_vendors: [],
      allowed_regions: [],
      blocked_regions: [],
      allowed_models: [
        { id: "gpt-4", vendor_id: "openai", status: "approved" },
        { id: "claude-3-*", vendor_id: "anthropic", version_pattern: "claude-3-*", status: "approved" },
      ],
      blocked_models: ["llama-uncensored*"],
      require_vendor_approval: true,
      require_model_approval: true,
      unknown_vendor_behavior: "request_approval",
      unknown_model_behavior: "request_approval",
    };

    it("should allow approved models", () => {
      const result = isModelAllowed("gpt-4", "openai", registry);
      expect(result.allowed).toBe(true);
    });

    it("should block blocked model patterns", () => {
      const result = isModelAllowed("llama-uncensored-v2", "meta", registry);
      expect(result.allowed).toBe(false);
      expect(result.requiresApproval).toBe(false);
    });

    it("should match version patterns", () => {
      const result = isModelAllowed("claude-3-opus", "anthropic", registry);
      expect(result.allowed).toBe(true);
    });

    it("should require approval for unknown models", () => {
      const result = isModelAllowed("new-model", "new-vendor", registry);
      expect(result.allowed).toBe(false);
      expect(result.requiresApproval).toBe(true);
    });
  });

  describe("isRegionAllowed", () => {
    const registry: AIRRegistryConstraints = {
      allowed_vendors: [],
      blocked_vendors: [],
      allowed_regions: [
        { code: "eu-west-1", status: "allowed", data_residency: "required", jurisdictions: [] },
        { code: "us-gov-west-1", status: "restricted", data_residency: "required", jurisdictions: [] },
      ],
      blocked_regions: ["cn-north-1"],
      allowed_models: [],
      blocked_models: [],
      require_vendor_approval: true,
      require_model_approval: true,
      unknown_vendor_behavior: "request_approval",
      unknown_model_behavior: "request_approval",
    };

    it("should allow allowed regions", () => {
      const result = isRegionAllowed("eu-west-1", registry);
      expect(result.allowed).toBe(true);
      expect(result.dataResidency).toBe("required");
    });

    it("should block blocked regions", () => {
      const result = isRegionAllowed("cn-north-1", registry);
      expect(result.allowed).toBe(false);
    });

    it("should mark restricted regions as allowed with note", () => {
      const result = isRegionAllowed("us-gov-west-1", registry);
      expect(result.allowed).toBe(true);
      expect(result.reason).toContain("restricted");
    });

    it("should not allow regions not in allowed list", () => {
      const result = isRegionAllowed("ap-southeast-1", registry);
      expect(result.allowed).toBe(false);
    });

    it("should allow all regions when no restrictions", () => {
      const emptyRegistry = { ...registry, allowed_regions: [], blocked_regions: [] };
      const result = isRegionAllowed("any-region", emptyRegistry);
      expect(result.allowed).toBe(true);
    });
  });
});
