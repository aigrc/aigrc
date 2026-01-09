import { describe, it, expect } from "vitest";
import {
  GovernanceLockSchema,
  GovernanceLock,
  GovernanceLockSignatureSchema,
  GovernanceLockConstraintsSchema,
  validateGovernanceLock,
  createGovernanceLock,
  parseGovernanceLockYAML,
  parseGovernanceLockJSON,
  serializeGovernanceLockYAML,
  serializeGovernanceLockJSON,
  isGovernanceLockExpired,
  getDaysUntilExpiration,
  isVendorAllowedByLock,
  isModelAllowedByLock,
  isRegionAllowedByLock,
  createSigningPayload,
  addSignature,
} from "../src/governance-lock";
import { createEmptyAIR, AIR } from "../src/air";

describe("governance.lock", () => {
  const validLock: GovernanceLock = {
    version: "1.0",
    generated_at: "2026-01-01T00:00:00Z",
    policy_hash: "sha256:" + "a".repeat(64),
    name: "Production AI Governance Policy",
    policy_sources: [],
    constraints: {
      registry: {
        allowed_vendor_ids: ["openai", "anthropic"],
        blocked_vendor_ids: ["malicious-ai"],
        allowed_region_codes: ["us-east-1", "eu-west-1"],
        blocked_region_codes: ["cn-north-1"],
        allowed_model_patterns: ["gpt-4*", "claude-3*"],
        blocked_model_patterns: ["*-uncensored"],
      },
      runtime: {
        pii_filter_enabled: true,
        pii_filter_action: "redact",
        toxicity_filter_enabled: true,
        toxicity_threshold: 0.8,
        data_retention_days: 90,
        watermark_enabled: false,
        logging_level: "all",
        kill_switch_enabled: true,
      },
      build: {
        require_golden_thread: true,
        require_asset_card: true,
        require_risk_classification: true,
        require_model_card: false,
        require_security_review: false,
        block_on_failure: true,
        generate_sarif: true,
        allowed_environments: ["development", "staging", "production"],
      },
    },
    signatures: [],
    expires_at: "2026-12-31T23:59:59Z",
    generated_by: "aigrc-policy-compiler",
    generator_version: "1.0.0",
  };

  describe("GovernanceLockSchema", () => {
    it("should validate a valid governance.lock", () => {
      const parsed = GovernanceLockSchema.parse(validLock);
      expect(parsed.version).toBe("1.0");
      expect(parsed.policy_hash).toMatch(/^sha256:[a-f0-9]{64}$/);
    });

    it("should reject invalid version", () => {
      const invalid = { ...validLock, version: "2.0" };
      expect(() => GovernanceLockSchema.parse(invalid)).toThrow();
    });

    it("should reject invalid policy hash format", () => {
      const invalid = { ...validLock, policy_hash: "invalid" };
      expect(() => GovernanceLockSchema.parse(invalid)).toThrow();
    });

    it("should have sensible defaults for constraints", () => {
      const minimal = {
        version: "1.0",
        generated_at: "2026-01-01T00:00:00Z",
        policy_hash: "sha256:" + "a".repeat(64),
        expires_at: "2026-12-31T23:59:59Z",
      };
      const parsed = GovernanceLockSchema.parse(minimal);
      expect(parsed.constraints.build.require_golden_thread).toBe(true);
      expect(parsed.constraints.runtime.kill_switch_enabled).toBe(true);
    });
  });

  describe("GovernanceLockSignatureSchema", () => {
    it("should validate a valid signature", () => {
      const signature = {
        signer: "ciso@company.com",
        role: "CISO",
        algorithm: "ES256",
        signature: "base64encodedSignature==",
        signed_at: "2026-01-01T00:00:00Z",
        key_id: "key-2026-001",
      };
      const parsed = GovernanceLockSignatureSchema.parse(signature);
      expect(parsed.algorithm).toBe("ES256");
    });

    it("should reject invalid algorithm", () => {
      const invalid = {
        signer: "test@test.com",
        algorithm: "MD5",
        signature: "test",
        signed_at: "2026-01-01T00:00:00Z",
      };
      expect(() => GovernanceLockSignatureSchema.parse(invalid)).toThrow();
    });
  });

  describe("validateGovernanceLock", () => {
    it("should return valid for a valid lock", () => {
      const result = validateGovernanceLock(validLock, { checkExpiration: false });
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("should detect expired lock files", () => {
      const expiredLock = {
        ...validLock,
        expires_at: "2020-01-01T00:00:00Z",
      };
      const result = validateGovernanceLock(expiredLock, { checkExpiration: true });
      expect(result.valid).toBe(false);
      expect(result.expired).toBe(true);
      expect(result.errors.some(e => e.includes("expired"))).toBe(true);
    });

    it("should warn about soon-to-expire locks", () => {
      const soonToExpire = new Date();
      soonToExpire.setDate(soonToExpire.getDate() + 3);
      const soonLock = {
        ...validLock,
        expires_at: soonToExpire.toISOString(),
      };
      const result = validateGovernanceLock(soonLock);
      expect(result.warnings.some(w => w.includes("expires in"))).toBe(true);
    });

    it("should require signatures when specified", () => {
      const result = validateGovernanceLock(validLock, {
        requireSignatures: true,
        checkExpiration: false,
      });
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes("signature"))).toBe(true);
    });

    it("should validate policy hash when specified", () => {
      const result = validateGovernanceLock(validLock, {
        expectedPolicyHash: "sha256:" + "b".repeat(64),
        checkExpiration: false,
      });
      expect(result.valid).toBe(false);
      expect(result.policyHashValid).toBe(false);
    });

    it("should return schema errors for invalid lock", () => {
      const invalid = { version: "invalid" };
      const result = validateGovernanceLock(invalid);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe("createGovernanceLock", () => {
    it("should create a valid lock from AIR", async () => {
      const air = createEmptyAIR("Test Policy", "1.0.0");
      const lock = await createGovernanceLock(air);

      const validation = validateGovernanceLock(lock, { checkExpiration: false });
      expect(validation.valid).toBe(true);
      expect(lock.name).toBe("Test Policy");
      expect(lock.policy_hash).toMatch(/^sha256:[a-f0-9]{64}$/);
    });

    it("should use custom expiration", async () => {
      const air = createEmptyAIR("Test");
      const lock = await createGovernanceLock(air, { expiresInDays: 7 });

      const daysUntil = getDaysUntilExpiration(lock);
      expect(daysUntil).toBeLessThanOrEqual(7);
      expect(daysUntil).toBeGreaterThan(0);
    });

    it("should include AIR reference", async () => {
      const air = createEmptyAIR("Test");
      const lock = await createGovernanceLock(air);

      expect(lock.air_reference).toBeDefined();
      expect(lock.air_reference?.id).toBe(air.id);
    });

    it("should extract constraints from AIR", async () => {
      const air = createEmptyAIR("Test");
      air.registry.blocked_vendors = ["bad-vendor"];
      air.runtime.pii_filter = { enabled: true, filter_types: [], action: "redact", custom_patterns: [] };
      air.build.require_golden_thread = true;

      const lock = await createGovernanceLock(air);

      expect(lock.constraints.registry.blocked_vendor_ids).toContain("bad-vendor");
      expect(lock.constraints.runtime.pii_filter_enabled).toBe(true);
      expect(lock.constraints.build.require_golden_thread).toBe(true);
    });
  });

  describe("YAML/JSON serialization", () => {
    it("should serialize and parse YAML", () => {
      const yamlStr = serializeGovernanceLockYAML(validLock);
      expect(yamlStr).toContain("version:");

      const parsed = parseGovernanceLockYAML(yamlStr);
      expect(parsed.version).toBe("1.0");
      expect(parsed.policy_hash).toBe(validLock.policy_hash);
    });

    it("should serialize and parse JSON", () => {
      const jsonStr = serializeGovernanceLockJSON(validLock);
      expect(jsonStr).toContain('"version"');

      const parsed = parseGovernanceLockJSON(jsonStr);
      expect(parsed.version).toBe("1.0");
      expect(parsed.policy_hash).toBe(validLock.policy_hash);
    });

    it("should support compact JSON serialization", () => {
      const compact = serializeGovernanceLockJSON(validLock, false);
      expect(compact).not.toContain("\n");
    });
  });

  describe("expiration utilities", () => {
    it("should detect expired locks", () => {
      const expired = { ...validLock, expires_at: "2020-01-01T00:00:00Z" };
      expect(isGovernanceLockExpired(expired)).toBe(true);
    });

    it("should detect non-expired locks", () => {
      expect(isGovernanceLockExpired(validLock)).toBe(false);
    });

    it("should calculate days until expiration", () => {
      const days = getDaysUntilExpiration(validLock);
      expect(days).toBeGreaterThan(0);
    });

    it("should return negative days for expired locks", () => {
      const expired = { ...validLock, expires_at: "2020-01-01T00:00:00Z" };
      const days = getDaysUntilExpiration(expired);
      expect(days).toBeLessThan(0);
    });
  });

  describe("vendor allowlist", () => {
    it("should allow listed vendors", () => {
      expect(isVendorAllowedByLock("openai", validLock)).toBe(true);
      expect(isVendorAllowedByLock("anthropic", validLock)).toBe(true);
    });

    it("should block blocked vendors", () => {
      expect(isVendorAllowedByLock("malicious-ai", validLock)).toBe(false);
    });

    it("should block unlisted vendors when allowlist exists", () => {
      expect(isVendorAllowedByLock("unknown-vendor", validLock)).toBe(false);
    });

    it("should allow all vendors when no allowlist", () => {
      const noAllowlist: GovernanceLock = {
        ...validLock,
        constraints: {
          ...validLock.constraints,
          registry: {
            ...validLock.constraints.registry,
            allowed_vendor_ids: [],
          },
        },
      };
      expect(isVendorAllowedByLock("any-vendor", noAllowlist)).toBe(true);
    });
  });

  describe("model allowlist", () => {
    it("should allow pattern-matched models", () => {
      expect(isModelAllowedByLock("gpt-4-turbo", validLock)).toBe(true);
      expect(isModelAllowedByLock("claude-3-opus", validLock)).toBe(true);
    });

    it("should block blocked patterns", () => {
      expect(isModelAllowedByLock("llama-uncensored", validLock)).toBe(false);
    });

    it("should block unmatched models", () => {
      expect(isModelAllowedByLock("unknown-model", validLock)).toBe(false);
    });
  });

  describe("region allowlist", () => {
    it("should allow listed regions", () => {
      expect(isRegionAllowedByLock("us-east-1", validLock)).toBe(true);
      expect(isRegionAllowedByLock("eu-west-1", validLock)).toBe(true);
    });

    it("should block blocked regions", () => {
      expect(isRegionAllowedByLock("cn-north-1", validLock)).toBe(false);
    });

    it("should block unlisted regions", () => {
      expect(isRegionAllowedByLock("ap-southeast-1", validLock)).toBe(false);
    });
  });

  describe("signing utilities", () => {
    it("should create deterministic signing payload", () => {
      const payload1 = createSigningPayload(validLock);
      const payload2 = createSigningPayload(validLock);
      expect(payload1).toBe(payload2);
    });

    it("should exclude signatures from signing payload", () => {
      const signedLock: GovernanceLock = {
        ...validLock,
        signatures: [{
          signer: "test@test.com",
          algorithm: "ES256",
          signature: "test",
          signed_at: "2026-01-01T00:00:00Z",
        }],
      };
      const payload = createSigningPayload(signedLock);
      expect(payload).not.toContain("test@test.com");
    });

    it("should add signature to lock", () => {
      const signature = {
        signer: "ciso@company.com",
        algorithm: "ES256" as const,
        signature: "base64signature",
        signed_at: new Date().toISOString(),
      };
      const signedLock = addSignature(validLock, signature);

      expect(signedLock.signatures).toHaveLength(1);
      expect(signedLock.signatures[0].signer).toBe("ciso@company.com");
      // Original should be unchanged
      expect(validLock.signatures).toHaveLength(0);
    });
  });
});
