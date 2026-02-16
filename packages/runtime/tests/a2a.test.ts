/**
 * A2A Tests (AIGOS-910)
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  A2ATokenGenerator,
  A2ATokenValidator,
  InboundPolicyChecker,
  OutboundPolicyChecker,
  A2AHandshakeHandler,
  A2AManager,
  A2A_HEADERS,
  A2A_PROTOCOL_VERSION,
  DEFAULT_INBOUND_POLICY,
  DEFAULT_OUTBOUND_POLICY,
  createA2AManager,
} from "../src/a2a/index.js";
import type { RuntimeIdentity } from "@aigrc/core";

// Mock identity
const mockIdentity: RuntimeIdentity = {
  instance_id: "550e8400-e29b-41d4-a716-446655440000",
  asset_id: "aigrc-2024-a1b2c3d4",
  asset_name: "Test Agent",
  asset_version: "1.0.0",
  golden_thread_hash: "sha256:7d865e959b2466918c9863afca942d0fb89d7c9ac0c99bafc3749504ded97730",
  golden_thread: {
    ticket_id: "TEST-123",
    approved_by: "approver@test.com",
    approved_at: "2025-01-15T10:00:00Z",
  },
  risk_level: "limited",
  lineage: {
    parent_instance_id: null,
    generation_depth: 0,
    ancestor_chain: [],
    spawned_at: "2025-01-15T10:00:00Z",
    root_instance_id: "550e8400-e29b-41d4-a716-446655440000",
  },
  capabilities_manifest: {
    allowed_tools: ["read_file", "write_file"],
    denied_tools: [],
    allowed_domains: ["*.example.com"],
    denied_domains: ["malicious.com"],
    max_cost_per_session: 100,
    max_cost_per_day: 1000,
    may_spawn_children: true,
    max_child_depth: 3,
    capability_mode: "decay",
  },
  created_at: "2025-01-15T10:00:00Z",
  verified: true,
  mode: "NORMAL",
};

// Test secret for HS256
const testSecret = "test-secret-key-for-jwt-signing-256-bits";

describe("A2ATokenGenerator", () => {
  let generator: A2ATokenGenerator;

  beforeEach(() => {
    generator = new A2ATokenGenerator({
      signingKey: {
        kid: "test-key-1",
        alg: "HS256",
        secret: testSecret,
      },
    });
  });

  it("should generate a valid JWT token", async () => {
    const result = await generator.generate({
      identity: mockIdentity,
    });

    expect(result.token).toBeDefined();
    expect(result.jti).toBeDefined();
    expect(result.expiresAt).toBeGreaterThan(Date.now() / 1000);
    expect(result.payload.iss).toBe("aigos-runtime");
    expect(result.payload.sub).toBe(mockIdentity.instance_id);
  });

  it("should include AIGOS claims", async () => {
    const result = await generator.generate({
      identity: mockIdentity,
    });

    const { aigos } = result.payload;
    expect(aigos.identity.instance_id).toBe(mockIdentity.instance_id);
    expect(aigos.identity.asset_id).toBe(mockIdentity.asset_id);
    expect(aigos.governance.risk_level).toBe(mockIdentity.risk_level);
    expect(aigos.governance.golden_thread.verified).toBe(true);
    expect(aigos.lineage.generation_depth).toBe(0);
  });

  it("should include control claims", async () => {
    const result = await generator.generate({
      identity: mockIdentity,
      paused: true,
      terminationPending: false,
      killSwitch: { enabled: true, channel: "sse" },
    });

    expect(result.payload.aigos.control.paused).toBe(true);
    expect(result.payload.aigos.control.termination_pending).toBe(false);
    expect(result.payload.aigos.control.kill_switch.enabled).toBe(true);
  });

  it("should respect custom TTL", async () => {
    const result = await generator.generate({
      identity: mockIdentity,
      ttlSeconds: 60,
    });

    const expectedExp = Math.floor(Date.now() / 1000) + 60;
    expect(result.expiresAt).toBeGreaterThanOrEqual(expectedExp - 1);
    expect(result.expiresAt).toBeLessThanOrEqual(expectedExp + 1);
  });

  it("should set custom audience", async () => {
    const result = await generator.generate({
      identity: mockIdentity,
      audience: "partner-agent.com",
    });

    expect(result.payload.aud).toBe("partner-agent.com");
  });
});

describe("A2ATokenValidator", () => {
  let generator: A2ATokenGenerator;
  let validator: A2ATokenValidator;

  beforeEach(() => {
    generator = new A2ATokenGenerator({
      signingKey: {
        kid: "test-key-1",
        alg: "HS256",
        secret: testSecret,
      },
    });

    validator = new A2ATokenValidator({
      trustedKeys: new Map([
        [
          "test-key-1",
          {
            kid: "test-key-1",
            alg: "HS256",
            secret: testSecret,
          },
        ],
      ]),
    });
  });

  it("should validate a valid token", async () => {
    const { token } = await generator.generate({
      identity: mockIdentity,
    });

    const result = await validator.validate(token);

    expect(result.valid).toBe(true);
    expect(result.payload).toBeDefined();
    expect(result.payload?.aigos.identity.instance_id).toBe(mockIdentity.instance_id);
  });

  it("should reject an invalid signature", async () => {
    const { token } = await generator.generate({
      identity: mockIdentity,
    });

    // Tamper with the token
    const tamperedToken = token.slice(0, -5) + "XXXXX";

    const result = await validator.validate(tamperedToken);

    expect(result.valid).toBe(false);
    expect(result.errorCode).toBe("INVALID_SIGNATURE");
  });

  it("should reject an expired token", async () => {
    const expiredGenerator = new A2ATokenGenerator({
      signingKey: {
        kid: "test-key-1",
        alg: "HS256",
        secret: testSecret,
      },
      defaultTtlSeconds: -120, // Already expired
    });

    const { token } = await expiredGenerator.generate({
      identity: mockIdentity,
    });

    const result = await validator.validate(token);

    expect(result.valid).toBe(false);
    expect(result.errorCode).toBe("EXPIRED");
  });

  it("should reject a paused agent when configured", async () => {
    const { token } = await generator.generate({
      identity: mockIdentity,
      paused: true,
    });

    const strictValidator = new A2ATokenValidator({
      trustedKeys: new Map([
        [
          "test-key-1",
          {
            kid: "test-key-1",
            alg: "HS256",
            secret: testSecret,
          },
        ],
      ]),
      rejectPausedAgents: true,
    });

    const result = await strictValidator.validate(token);

    expect(result.valid).toBe(false);
    expect(result.errorCode).toBe("PAUSED_AGENT");
  });

  it("should return KEY_NOT_FOUND for unknown kid", async () => {
    const unknownKeyGenerator = new A2ATokenGenerator({
      signingKey: {
        kid: "unknown-key",
        alg: "HS256",
        secret: testSecret,
      },
    });

    const { token } = await unknownKeyGenerator.generate({
      identity: mockIdentity,
    });

    const result = await validator.validate(token);

    expect(result.valid).toBe(false);
    expect(result.errorCode).toBe("KEY_NOT_FOUND");
  });
});

describe("InboundPolicyChecker", () => {
  let checker: InboundPolicyChecker;

  beforeEach(() => {
    checker = new InboundPolicyChecker({
      maxRiskLevel: "high",
      requireKillSwitch: true,
      requireGoldenThreadVerified: true,
    });
  });

  it("should allow valid payload", async () => {
    const payload = {
      iss: "aigos-runtime" as const,
      sub: mockIdentity.instance_id,
      aud: "aigos-agents",
      exp: Math.floor(Date.now() / 1000) + 300,
      iat: Math.floor(Date.now() / 1000),
      nbf: Math.floor(Date.now() / 1000),
      jti: "test-jti",
      aigos: {
        identity: {
          instance_id: mockIdentity.instance_id,
          asset_id: mockIdentity.asset_id,
          asset_name: mockIdentity.asset_name,
          asset_version: mockIdentity.asset_version,
        },
        governance: {
          risk_level: "limited" as const,
          golden_thread: {
            hash: "sha256:abc123",
            verified: true,
            ticket_id: "TEST-123",
          },
          mode: "NORMAL" as const,
        },
        control: {
          kill_switch: { enabled: true, channel: "sse" as const },
          paused: false,
          termination_pending: false,
        },
        capabilities: {
          hash: "sha256:caps",
          tools: ["read_file"],
          max_budget_usd: 100,
          can_spawn: true,
          max_child_depth: 3,
        },
        lineage: {
          generation_depth: 0,
          parent_instance_id: null,
          root_instance_id: mockIdentity.instance_id,
        },
      },
    };

    const result = await checker.check(payload, {
      headers: {},
      method: "POST",
      path: "/api/action",
      timestamp: new Date(),
    });

    expect(result.allowed).toBe(true);
  });

  it("should reject unacceptable risk level", async () => {
    const payload = {
      iss: "aigos-runtime" as const,
      sub: mockIdentity.instance_id,
      aud: "aigos-agents",
      exp: Math.floor(Date.now() / 1000) + 300,
      iat: Math.floor(Date.now() / 1000),
      nbf: Math.floor(Date.now() / 1000),
      jti: "test-jti",
      aigos: {
        identity: {
          instance_id: mockIdentity.instance_id,
          asset_id: mockIdentity.asset_id,
          asset_name: mockIdentity.asset_name,
          asset_version: mockIdentity.asset_version,
        },
        governance: {
          risk_level: "unacceptable" as const, // Exceeds max
          golden_thread: {
            hash: "sha256:abc123",
            verified: true,
            ticket_id: "TEST-123",
          },
          mode: "NORMAL" as const,
        },
        control: {
          kill_switch: { enabled: true, channel: "sse" as const },
          paused: false,
          termination_pending: false,
        },
        capabilities: {
          hash: "sha256:caps",
          tools: ["read_file"],
          max_budget_usd: 100,
          can_spawn: true,
          max_child_depth: 3,
        },
        lineage: {
          generation_depth: 0,
          parent_instance_id: null,
          root_instance_id: mockIdentity.instance_id,
        },
      },
    };

    const result = await checker.check(payload, {
      headers: {},
      method: "POST",
      path: "/api/action",
      timestamp: new Date(),
    });

    expect(result.allowed).toBe(false);
    expect(result.code).toBe("RISK_LEVEL_EXCEEDED");
  });

  it("should reject missing kill switch when required", async () => {
    const payload = {
      iss: "aigos-runtime" as const,
      sub: mockIdentity.instance_id,
      aud: "aigos-agents",
      exp: Math.floor(Date.now() / 1000) + 300,
      iat: Math.floor(Date.now() / 1000),
      nbf: Math.floor(Date.now() / 1000),
      jti: "test-jti",
      aigos: {
        identity: {
          instance_id: mockIdentity.instance_id,
          asset_id: mockIdentity.asset_id,
          asset_name: mockIdentity.asset_name,
          asset_version: mockIdentity.asset_version,
        },
        governance: {
          risk_level: "limited" as const,
          golden_thread: {
            hash: "sha256:abc123",
            verified: true,
            ticket_id: "TEST-123",
          },
          mode: "NORMAL" as const,
        },
        control: {
          kill_switch: { enabled: false, channel: "sse" as const }, // Disabled
          paused: false,
          termination_pending: false,
        },
        capabilities: {
          hash: "sha256:caps",
          tools: ["read_file"],
          max_budget_usd: 100,
          can_spawn: true,
          max_child_depth: 3,
        },
        lineage: {
          generation_depth: 0,
          parent_instance_id: null,
          root_instance_id: mockIdentity.instance_id,
        },
      },
    };

    const result = await checker.check(payload, {
      headers: {},
      method: "POST",
      path: "/api/action",
      timestamp: new Date(),
    });

    expect(result.allowed).toBe(false);
    expect(result.code).toBe("KILL_SWITCH_REQUIRED");
  });
});

describe("OutboundPolicyChecker", () => {
  let checker: OutboundPolicyChecker;

  beforeEach(() => {
    checker = new OutboundPolicyChecker(
      {
        blockedDomains: ["evil.com", "*.malicious.org"],
        allowedDomains: ["*.trusted.com", "partner.example.com"],
      },
      mockIdentity.instance_id
    );
  });

  it("should allow requests to allowed domains", () => {
    const result = checker.checkPreFlight({
      url: "https://api.trusted.com/endpoint",
      domain: "api.trusted.com",
    });

    expect(result.allowed).toBe(true);
  });

  it("should block requests to blocked domains", () => {
    const result = checker.checkPreFlight({
      url: "https://evil.com/attack",
      domain: "evil.com",
    });

    expect(result.allowed).toBe(false);
    expect(result.code).toBe("DOMAIN_BLOCKED");
  });

  it("should block requests to domains not in allowed list", () => {
    const result = checker.checkPreFlight({
      url: "https://random-domain.net/api",
      domain: "random-domain.net",
    });

    expect(result.allowed).toBe(false);
    expect(result.code).toBe("DOMAIN_NOT_ALLOWED");
  });
});

describe("A2AManager", () => {
  let manager: A2AManager;

  beforeEach(() => {
    manager = createA2AManager({
      identity: mockIdentity,
      tokenGeneratorConfig: {
        signingKey: {
          kid: "test-key-1",
          alg: "HS256",
          secret: testSecret,
        },
      },
      tokenValidatorConfig: {
        trustedKeys: new Map([
          [
            "test-key-1",
            {
              kid: "test-key-1",
              alg: "HS256",
              secret: testSecret,
            },
          ],
        ]),
      },
      inboundPolicy: {
        requireToken: true,
      },
      outboundPolicy: {
        includeToken: true,
      },
    });
  });

  it("should generate and validate tokens", async () => {
    const generated = await manager.generateToken();
    expect(generated.token).toBeDefined();

    const validated = await manager.validateToken(generated.token);
    expect(validated.valid).toBe(true);
    expect(validated.payload?.aigos.identity.instance_id).toBe(
      mockIdentity.instance_id
    );
  });

  it("should prepare outbound request headers", async () => {
    const result = await manager.prepareOutboundRequest(
      "https://partner-agent.com/api"
    );

    expect(result.allowed).toBe(true);
    expect(result.headers[A2A_HEADERS.TOKEN]).toBeDefined();
    expect(result.headers[A2A_HEADERS.PROTOCOL_VERSION]).toBe(
      A2A_PROTOCOL_VERSION
    );
  });

  it("should handle inbound request", async () => {
    const { token } = await manager.generateToken();

    const result = await manager.handleInboundRequest({
      headers: {
        [A2A_HEADERS.TOKEN]: token,
      },
      method: "POST",
      path: "/api/action",
      timestamp: new Date(),
    });

    expect(result.success).toBe(true);
    expect(result.inboundIdentity).toBeDefined();
    expect(result.responseToken).toBeDefined();
  });

  it("should reject inbound request without token when required", async () => {
    const result = await manager.handleInboundRequest({
      headers: {},
      method: "POST",
      path: "/api/action",
      timestamp: new Date(),
    });

    expect(result.success).toBe(false);
    expect(result.errorCode).toBe("MISSING_CLAIMS");
  });

  it("should create client middleware", () => {
    const middleware = manager.createClientMiddleware();
    expect(middleware).toBeDefined();
    expect(typeof middleware.fetch).toBe("function");
  });

  it("should create server middleware", () => {
    const middleware = manager.createServerMiddleware();
    expect(middleware).toBeDefined();
    expect(typeof middleware.processRequest).toBe("function");
  });

  it("should emit events", async () => {
    const events: unknown[] = [];
    manager.onEvent((e) => events.push(e));

    await manager.generateToken();

    expect(events.length).toBeGreaterThan(0);
    expect(events[0]).toHaveProperty("type", "token.generated");
  });

  it("should extract AIGOS headers", () => {
    const headers = {
      [A2A_HEADERS.TOKEN]: "test-token",
      [A2A_HEADERS.PROTOCOL_VERSION]: "1.0",
      [A2A_HEADERS.REQUEST_ID]: "request-123",
    };

    const extracted = A2AManager.extractHeaders(headers);

    expect(extracted.token).toBe("test-token");
    expect(extracted.protocolVersion).toBe("1.0");
    expect(extracted.requestId).toBe("request-123");
  });

  it("should detect A2A auth presence", () => {
    expect(A2AManager.hasA2AAuth({ [A2A_HEADERS.TOKEN]: "token" })).toBe(true);
    expect(A2AManager.hasA2AAuth({})).toBe(false);
  });
});
