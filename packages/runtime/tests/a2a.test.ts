/**
 * A2A (Agent-to-Agent) Module Tests - SPEC-PRT-003
 */

import { describe, it, expect, vi, beforeEach, beforeAll } from "vitest";
import type { RuntimeIdentity, Lineage, GoldenThread, CapabilitiesManifest } from "@aigrc/core";
import {
  // Token
  createGovernanceTokenGenerator,
  createGovernanceTokenValidator,
  generateES256KeyPair,
  AIGOS_TOKEN_TYPE,
  DEFAULT_TTL_SECONDS,
  validateAigosClaims,
  validateIdentityClaims,
  validateGovernanceClaims,
  validateControlClaims,
  validateCapabilityClaims,
  validateLineageClaims,
  isCapabilitySubset,
  decodeTokenClaims,
  decodeTokenHeader,
  type TokenGenerationInput,
  type IGovernanceTokenGenerator,
  type IGovernanceTokenValidator,
  // Handshake
  createHandshakeClient,
  createHandshakeServer,
  AIGOS_TOKEN_HEADER,
  AIGOS_PROTOCOL_VERSION_HEADER,
  AIGOS_PROTOCOL_VERSION,
  // Policy
  createInboundPolicy,
  createOutboundPolicy,
  createRestrictiveInboundPolicy,
  createPermissiveInboundPolicy,
  createRestrictiveOutboundPolicy,
  createPermissiveOutboundPolicy,
} from "../src/index.js";

// Helper to create a mock RuntimeIdentity
function createMockIdentity(overrides: Partial<RuntimeIdentity> = {}): RuntimeIdentity {
  const lineage: Lineage = {
    parent_instance_id: null,
    generation_depth: 0,
    ancestor_chain: [],
    root_instance_id: "00000000-0000-0000-0000-000000000001",
  };

  const goldenThread: GoldenThread = {
    hash: "sha256:0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
    ticket_id: "TKT-001",
    approval_status: "approved",
    classification_version: "1.0.0",
  };

  const capabilities: CapabilitiesManifest = {
    tools: ["web_search", "database_read"],
    domains: ["*.example.com"],
    max_budget_usd: 100,
    can_spawn: true,
    max_child_depth: 3,
  };

  return {
    instance_id: "00000000-0000-0000-0000-000000000001",
    asset_id: "aigrc-2024-a1b2c3d4",
    asset_name: "Test Agent",
    asset_version: "1.0.0",
    golden_thread_hash: "sha256:0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
    golden_thread: goldenThread,
    risk_level: "limited",
    lineage,
    capabilities_manifest: capabilities,
    created_at: new Date().toISOString(),
    verified: true,
    mode: "NORMAL",
    ...overrides,
  };
}

// Helper to create token generation input
function createTokenInput(identity: RuntimeIdentity): TokenGenerationInput {
  return {
    identity,
    goldenThread: {
      hash: identity.golden_thread_hash,
      verified: identity.verified,
      ticket_id: identity.golden_thread.ticket_id,
    },
    mode: identity.mode,
    killSwitch: {
      enabled: true,
      channel: "sse",
    },
    capabilities: {
      hash: "sha256:cap123",
      tools: identity.capabilities_manifest.tools ?? [],
      maxBudgetUsd: identity.capabilities_manifest.max_budget_usd ?? null,
      canSpawn: identity.capabilities_manifest.can_spawn ?? false,
      maxChildDepth: identity.capabilities_manifest.max_child_depth ?? 0,
    },
  };
}

describe("A2A Module (SPEC-PRT-003)", () => {
  let keyPair: Awaited<ReturnType<typeof generateES256KeyPair>>;
  let generator: IGovernanceTokenGenerator;
  let validator: IGovernanceTokenValidator;
  let mockIdentity: RuntimeIdentity;

  beforeAll(async () => {
    keyPair = await generateES256KeyPair();
    generator = createGovernanceTokenGenerator({
      privateKey: keyPair.privateKey,
      publicKey: keyPair.publicKey,
      keyId: keyPair.keyId,
    });
  });

  beforeEach(() => {
    mockIdentity = createMockIdentity();
    validator = createGovernanceTokenValidator();
    validator.addPublicKey(keyPair.keyId, keyPair.publicKey);
  });

  describe("Token Generation (AIG-87)", () => {
    it("should generate a valid JWT with AIGOS-GOV+jwt type", async () => {
      const input = createTokenInput(mockIdentity);
      const result = await generator.generate(input);

      expect(result.token).toBeDefined();
      expect(result.payload).toBeDefined();
      expect(result.expiresAt).toBeInstanceOf(Date);

      const header = decodeTokenHeader(result.token);
      expect(header?.typ).toBe(AIGOS_TOKEN_TYPE);
      expect(header?.alg).toBe("ES256");
      expect(header?.kid).toBe(keyPair.keyId);
    });

    it("should include all identity claims", async () => {
      const input = createTokenInput(mockIdentity);
      const result = await generator.generate(input);

      expect(result.payload.aigos.identity.instance_id).toBe(mockIdentity.instance_id);
      expect(result.payload.aigos.identity.asset_id).toBe(mockIdentity.asset_id);
      expect(result.payload.aigos.identity.asset_name).toBe(mockIdentity.asset_name);
      expect(result.payload.aigos.identity.asset_version).toBe(mockIdentity.asset_version);
    });

    it("should include governance claims", async () => {
      const input = createTokenInput(mockIdentity);
      const result = await generator.generate(input);

      expect(result.payload.aigos.governance.risk_level).toBe(mockIdentity.risk_level);
      expect(result.payload.aigos.governance.golden_thread.hash).toBe(mockIdentity.golden_thread_hash);
      expect(result.payload.aigos.governance.golden_thread.verified).toBe(mockIdentity.verified);
      expect(result.payload.aigos.governance.mode).toBe(mockIdentity.mode);
    });

    it("should include control claims", async () => {
      const input = createTokenInput(mockIdentity);
      const result = await generator.generate(input);

      expect(result.payload.aigos.control.kill_switch.enabled).toBe(true);
      expect(result.payload.aigos.control.kill_switch.channel).toBe("sse");
      expect(result.payload.aigos.control.paused).toBe(false);
      expect(result.payload.aigos.control.termination_pending).toBe(false);
    });

    it("should include capability claims", async () => {
      const input = createTokenInput(mockIdentity);
      const result = await generator.generate(input);

      expect(result.payload.aigos.capabilities.tools).toEqual(["web_search", "database_read"]);
      expect(result.payload.aigos.capabilities.can_spawn).toBe(true);
      expect(result.payload.aigos.capabilities.max_child_depth).toBe(3);
    });

    it("should include lineage claims", async () => {
      const input = createTokenInput(mockIdentity);
      const result = await generator.generate(input);

      expect(result.payload.aigos.lineage.generation_depth).toBe(0);
      expect(result.payload.aigos.lineage.parent_instance_id).toBeNull();
      expect(result.payload.aigos.lineage.root_instance_id).toBe(mockIdentity.lineage.root_instance_id);
    });

    it("should use default TTL of 5 minutes", async () => {
      const input = createTokenInput(mockIdentity);
      const result = await generator.generate(input);

      const ttl = result.payload.exp - result.payload.iat;
      expect(ttl).toBe(DEFAULT_TTL_SECONDS);
    });

    it("should allow custom TTL", async () => {
      const input = createTokenInput(mockIdentity);
      const result = await generator.generate(input, { ttlSeconds: 60 });

      const ttl = result.payload.exp - result.payload.iat;
      expect(ttl).toBe(60);
    });

    it("should generate unique token IDs", async () => {
      const input = createTokenInput(mockIdentity);
      const result1 = await generator.generate(input);
      const result2 = await generator.generate(input);

      expect(result1.payload.jti).not.toBe(result2.payload.jti);
    });
  });

  describe("Token Validation (AIG-88)", () => {
    it("should validate a valid token", async () => {
      const input = createTokenInput(mockIdentity);
      const { token } = await generator.generate(input);

      const result = await validator.validate(token);

      expect(result.valid).toBe(true);
      expect(result.payload).toBeDefined();
    });

    it("should reject token with unknown key ID", async () => {
      const otherKeyPair = await generateES256KeyPair();
      const otherGenerator = createGovernanceTokenGenerator({
        privateKey: otherKeyPair.privateKey,
        publicKey: otherKeyPair.publicKey,
        keyId: otherKeyPair.keyId,
      });

      const input = createTokenInput(mockIdentity);
      const { token } = await otherGenerator.generate(input);

      const result = await validator.validate(token);

      expect(result.valid).toBe(false);
      expect(result.error?.code).toBe("INVALID_SIGNATURE");
    });

    it("should reject expired token", async () => {
      const input = createTokenInput(mockIdentity);
      // Use -60 seconds to exceed the default 30-second clock tolerance
      const { token } = await generator.generate(input, { ttlSeconds: -60 });

      const result = await validator.validate(token, { clockToleranceSeconds: 0 });

      expect(result.valid).toBe(false);
      expect(result.error?.code).toBe("EXPIRED");
    });

    it("should enforce max risk level", async () => {
      const highRiskIdentity = createMockIdentity({ risk_level: "high" });
      const input = createTokenInput(highRiskIdentity);
      const { token } = await generator.generate(input);

      const result = await validator.validate(token, { maxRiskLevel: "limited" });

      expect(result.valid).toBe(false);
      expect(result.error?.code).toBe("RISK_TOO_HIGH");
    });

    it("should enforce kill switch requirement", async () => {
      const input = createTokenInput(mockIdentity);
      input.killSwitch.enabled = false;
      const { token } = await generator.generate(input);

      const result = await validator.validate(token, { requireKillSwitch: true });

      expect(result.valid).toBe(false);
      expect(result.error?.code).toBe("KILL_SWITCH_DISABLED");
    });

    it("should reject paused agents", async () => {
      const input = createTokenInput(mockIdentity);
      input.paused = true;
      const { token } = await generator.generate(input);

      const result = await validator.validate(token);

      expect(result.valid).toBe(false);
      expect(result.error?.code).toBe("AGENT_PAUSED");
    });

    it("should reject agents with termination pending", async () => {
      const input = createTokenInput(mockIdentity);
      input.terminationPending = true;
      const { token } = await generator.generate(input);

      const result = await validator.validate(token);

      expect(result.valid).toBe(false);
      expect(result.error?.code).toBe("TERMINATION_PENDING");
    });
  });

  describe("Claims Validation (AIG-93)", () => {
    it("should validate identity claims", () => {
      const claims = {
        instance_id: "abc-123",
        asset_id: "agent-001",
        asset_name: "Test",
        asset_version: "1.0.0",
      };

      const result = validateIdentityClaims(claims);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("should reject invalid identity claims", () => {
      const claims = {
        instance_id: "",
        asset_id: "agent-001",
        asset_name: "Test",
        asset_version: "1.0.0",
      };

      const result = validateIdentityClaims(claims);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it("should validate governance claims", () => {
      const claims = {
        risk_level: "limited" as const,
        golden_thread: { hash: "sha256:abc", verified: true },
        mode: "NORMAL" as const,
      };

      const result = validateGovernanceClaims(claims);
      expect(result.valid).toBe(true);
    });

    it("should validate control claims", () => {
      const claims = {
        kill_switch: { enabled: true, channel: "sse" as const },
        paused: false,
        termination_pending: false,
      };

      const result = validateControlClaims(claims);
      expect(result.valid).toBe(true);
    });

    it("should validate capability claims", () => {
      const claims = {
        hash: "sha256:abc",
        tools: ["web_search"],
        max_budget_usd: 100,
        can_spawn: true,
        max_child_depth: 3,
      };

      const result = validateCapabilityClaims(claims);
      expect(result.valid).toBe(true);
    });

    it("should validate lineage claims", () => {
      const claims = {
        generation_depth: 0,
        parent_instance_id: null,
        root_instance_id: "root-123",
      };

      const result = validateLineageClaims(claims);
      expect(result.valid).toBe(true);
    });

    it("should detect capability escalation", () => {
      const parent = {
        hash: "sha256:parent",
        tools: ["web_search"],
        max_budget_usd: 100,
        can_spawn: true,
        max_child_depth: 3,
      };

      const child = {
        hash: "sha256:child",
        tools: ["web_search", "shell_exec"], // Not in parent
        max_budget_usd: 200, // Higher than parent
        can_spawn: true,
        max_child_depth: 3,
      };

      const result = isCapabilitySubset(child, parent);
      expect(result.valid).toBe(false);
      expect(result.violations.length).toBeGreaterThan(0);
    });
  });

  describe("Inbound Policy (AIG-91)", () => {
    it("should allow by default", async () => {
      const policy = createInboundPolicy();
      const input = createTokenInput(mockIdentity);
      const { token } = await generator.generate(input);
      const { payload } = await validator.validate(token);

      const decision = await policy.evaluate(payload!);
      expect(decision.allowed).toBe(true);
    });

    it("should block by instance ID", async () => {
      const policy = createInboundPolicy({
        blockedInstances: [mockIdentity.instance_id],
      });
      const input = createTokenInput(mockIdentity);
      const { token } = await generator.generate(input);
      const { payload } = await validator.validate(token);

      const decision = await policy.evaluate(payload!);
      expect(decision.allowed).toBe(false);
      expect(decision.matchedRule).toBe("blocked_instance");
    });

    it("should block by asset ID", async () => {
      const policy = createInboundPolicy({
        blockedAssets: [mockIdentity.asset_id],
      });
      const input = createTokenInput(mockIdentity);
      const { token } = await generator.generate(input);
      const { payload } = await validator.validate(token);

      const decision = await policy.evaluate(payload!);
      expect(decision.allowed).toBe(false);
      expect(decision.matchedRule).toBe("blocked_asset");
    });

    it("should enforce trusted list", async () => {
      const policy = createInboundPolicy({
        trustedAssets: ["other-asset"],
      });
      const input = createTokenInput(mockIdentity);
      const { token } = await generator.generate(input);
      const { payload } = await validator.validate(token);

      const decision = await policy.evaluate(payload!);
      expect(decision.allowed).toBe(false);
      expect(decision.matchedRule).toBe("trusted_assets_only");
    });

    it("should enforce max risk level", async () => {
      const policy = createInboundPolicy({
        maxRiskLevel: "minimal",
      });
      const input = createTokenInput(mockIdentity); // risk_level: "limited"
      const { token } = await generator.generate(input);
      const { payload } = await validator.validate(token);

      const decision = await policy.evaluate(payload!);
      expect(decision.allowed).toBe(false);
      expect(decision.matchedRule).toBe("max_risk_level");
    });

    it("should create restrictive policy", async () => {
      const policy = createRestrictiveInboundPolicy([mockIdentity.asset_id]);
      const input = createTokenInput(mockIdentity);
      const { token } = await generator.generate(input);
      const { payload } = await validator.validate(token);

      const decision = await policy.evaluate(payload!);
      expect(decision.allowed).toBe(true);
    });

    it("should support custom validator", async () => {
      const policy = createInboundPolicy({
        customValidator: (payload) => ({
          allowed: false,
          reason: "Custom rejection",
        }),
      });
      const input = createTokenInput(mockIdentity);
      const { token } = await generator.generate(input);
      const { payload } = await validator.validate(token);

      const decision = await policy.evaluate(payload!);
      expect(decision.allowed).toBe(false);
      expect(decision.reason).toBe("Custom rejection");
    });
  });

  describe("Outbound Policy (AIG-92)", () => {
    it("should allow by default", async () => {
      const policy = createOutboundPolicy();
      const input = createTokenInput(mockIdentity);
      const { token } = await generator.generate(input);
      const { payload } = await validator.validate(token);

      const decision = await policy.evaluateTarget(payload!);
      expect(decision.allowed).toBe(true);
    });

    it("should evaluate URLs", () => {
      const policy = createOutboundPolicy({
        blockedDomains: ["evil.com"],
      });

      expect(policy.evaluateUrl("https://example.com/api").allowed).toBe(true);
      expect(policy.evaluateUrl("https://evil.com/api").allowed).toBe(false);
    });

    it("should support wildcard domains", () => {
      const policy = createOutboundPolicy({
        allowedDomains: ["*.example.com"],
      });

      expect(policy.evaluateUrl("https://api.example.com/v1").allowed).toBe(true);
      expect(policy.evaluateUrl("https://other.com/api").allowed).toBe(false);
    });

    it("should block targets by asset ID", async () => {
      const policy = createOutboundPolicy({
        blockedTargetAssets: [mockIdentity.asset_id],
      });
      const input = createTokenInput(mockIdentity);
      const { token } = await generator.generate(input);
      const { payload } = await validator.validate(token);

      const decision = await policy.evaluateTarget(payload!);
      expect(decision.allowed).toBe(false);
      expect(decision.matchedRule).toBe("blocked_target_asset");
    });

    it("should enforce max target risk level", async () => {
      const highRiskIdentity = createMockIdentity({ risk_level: "high" });
      const policy = createOutboundPolicy({
        maxTargetRiskLevel: "limited",
      });
      const input = createTokenInput(highRiskIdentity);
      const { token } = await generator.generate(input);
      const { payload } = await validator.validate(token);

      const decision = await policy.evaluateTarget(payload!);
      expect(decision.allowed).toBe(false);
      expect(decision.matchedRule).toBe("max_target_risk_level");
    });

    it("should create restrictive outbound policy", () => {
      const policy = createRestrictiveOutboundPolicy(["*.internal.com"]);

      expect(policy.evaluateUrl("https://api.internal.com/v1").allowed).toBe(true);
      expect(policy.evaluateUrl("https://external.com/api").allowed).toBe(false);
    });
  });

  describe("Handshake Client (AIG-89)", () => {
    it("should generate request headers", async () => {
      const client = createHandshakeClient({
        tokenGenerator: generator,
        tokenValidator: validator,
        tokenInput: createTokenInput(mockIdentity),
      });

      const headers = await client.generateRequestHeaders();

      expect(headers[AIGOS_TOKEN_HEADER]).toBeDefined();
      expect(headers[AIGOS_PROTOCOL_VERSION_HEADER]).toBe(AIGOS_PROTOCOL_VERSION);
    });

    it("should validate response headers", async () => {
      const input = createTokenInput(mockIdentity);
      const { token } = await generator.generate(input);

      const client = createHandshakeClient({
        tokenGenerator: generator,
        tokenValidator: validator,
        tokenInput: input,
      });

      const result = await client.validateResponseHeaders({
        [AIGOS_TOKEN_HEADER]: token,
      });

      expect(result.success).toBe(true);
      expect(result.responsePayload).toBeDefined();
    });

    it("should fail on missing response token", async () => {
      const client = createHandshakeClient({
        tokenGenerator: generator,
        tokenValidator: validator,
        tokenInput: createTokenInput(mockIdentity),
      });

      const result = await client.validateResponseHeaders({});

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe("MISSING_RESPONSE_TOKEN");
    });
  });

  describe("Handshake Server (AIG-90)", () => {
    it("should handle valid request", async () => {
      const input = createTokenInput(mockIdentity);
      const { token } = await generator.generate(input);

      const server = createHandshakeServer({
        tokenGenerator: generator,
        tokenValidator: validator,
        tokenInput: input,
      });

      const result = await server.handleRequest({
        [AIGOS_TOKEN_HEADER]: token,
        [AIGOS_PROTOCOL_VERSION_HEADER]: AIGOS_PROTOCOL_VERSION,
      });

      expect(result.valid).toBe(true);
      expect(result.callerPayload).toBeDefined();
      expect(result.responseHeaders?.[AIGOS_TOKEN_HEADER]).toBeDefined();
    });

    it("should reject missing token", async () => {
      const server = createHandshakeServer({
        tokenGenerator: generator,
        tokenValidator: validator,
        tokenInput: createTokenInput(mockIdentity),
      });

      const result = await server.handleRequest({});

      expect(result.valid).toBe(false);
      expect(result.error?.code).toBe("MISSING_TOKEN");
      expect(result.error?.httpStatus).toBe(401);
    });

    it("should reject wrong protocol version", async () => {
      const input = createTokenInput(mockIdentity);
      const { token } = await generator.generate(input);

      const server = createHandshakeServer({
        tokenGenerator: generator,
        tokenValidator: validator,
        tokenInput: input,
      });

      const result = await server.handleRequest({
        [AIGOS_TOKEN_HEADER]: token,
        [AIGOS_PROTOCOL_VERSION_HEADER]: "2.0",
      });

      expect(result.valid).toBe(false);
      expect(result.error?.code).toBe("PROTOCOL_VERSION_MISMATCH");
    });

    it("should apply inbound policy", async () => {
      const input = createTokenInput(mockIdentity);
      const { token } = await generator.generate(input);

      const inboundPolicy = createInboundPolicy({
        blockedAssets: [mockIdentity.asset_id],
      });

      const server = createHandshakeServer({
        tokenGenerator: generator,
        tokenValidator: validator,
        tokenInput: input,
        inboundPolicy,
      });

      const result = await server.handleRequest({
        [AIGOS_TOKEN_HEADER]: token,
      });

      expect(result.valid).toBe(false);
      expect(result.error?.code).toBe("POLICY_DENIED");
      expect(result.error?.httpStatus).toBe(403);
    });
  });

  describe("Token Decode Helpers", () => {
    it("should decode token claims without validation", async () => {
      const input = createTokenInput(mockIdentity);
      const { token } = await generator.generate(input);

      const claims = decodeTokenClaims(token);

      expect(claims).toBeDefined();
      expect(claims?.aigos.identity.instance_id).toBe(mockIdentity.instance_id);
    });

    it("should decode token header", async () => {
      const input = createTokenInput(mockIdentity);
      const { token } = await generator.generate(input);

      const header = decodeTokenHeader(token);

      expect(header?.typ).toBe(AIGOS_TOKEN_TYPE);
      expect(header?.alg).toBe("ES256");
    });

    it("should return null for invalid token", () => {
      expect(decodeTokenClaims("invalid")).toBeNull();
      expect(decodeTokenHeader("invalid")).toBeNull();
    });
  });

  describe("Key Management", () => {
    it("should export public key as JWK", async () => {
      const jwk = await generator.getPublicKey();

      expect(jwk.kty).toBe("EC");
      expect(jwk.crv).toBe("P-256");
    });

    it("should support multiple public keys", async () => {
      const keyPair2 = await generateES256KeyPair();
      const generator2 = createGovernanceTokenGenerator({
        privateKey: keyPair2.privateKey,
        publicKey: keyPair2.publicKey,
        keyId: keyPair2.keyId,
      });

      validator.addPublicKey(keyPair2.keyId, keyPair2.publicKey);

      const input = createTokenInput(mockIdentity);
      const { token } = await generator2.generate(input);

      const result = await validator.validate(token);
      expect(result.valid).toBe(true);
    });

    it("should allow key removal", async () => {
      const input = createTokenInput(mockIdentity);
      const { token } = await generator.generate(input);

      validator.removePublicKey(keyPair.keyId);

      const result = await validator.validate(token);
      expect(result.valid).toBe(false);
      expect(result.error?.code).toBe("INVALID_SIGNATURE");
    });
  });
});
