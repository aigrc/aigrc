/**
 * CGA Token Tests
 */

import { describe, it, expect } from 'vitest';
import {
  CGATokenGenerator,
  CGATokenVerifier,
  CGATokenClaimsSchema,
  createTestToken,
  type CGATokenClaims,
} from './token';
import { CGACertificateCompactSchema, type CGACertificateCompact } from './certificate';

describe('CGA Token', () => {
  const mockCertificate: CGACertificateCompact = {
    apiVersion: 'aigos.io/v1',
    kind: 'CGACertificateCompact',
    spec: {
      id: 'cga-20250115-agent-silver',
      agent_id: 'urn:aigos:agent:org:my-agent:v1',
      level: 'SILVER',
      issuer: 'aigos-ca',
      issued_at: '2025-01-15T10:00:00Z',
      expires_at: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
      golden_thread_hash: 'sha256:abc123def456',
      gov: {
        ks: true,
        pe: true,
        gt: true,
        cb: false,
        tm: true,
      },
      compliance: ['SOC2', 'ISO27001'],
    },
    signature: {
      alg: 'ES256',
      kid: 'key-001',
      sig: 'base64sig',
    },
  };

  describe('CGATokenClaimsSchema', () => {
    it('should validate complete claims', () => {
      const claims: CGATokenClaims = {
        iss: 'urn:aigos:agent:org:my-agent:v1',
        sub: 'urn:aigos:agent:org:my-agent:v1',
        aud: 'urn:aigos:agent:org:target:v1',
        exp: Math.floor(Date.now() / 1000) + 3600,
        iat: Math.floor(Date.now() / 1000),
        jti: 'jwt-001',
        cga: {
          certificate_id: 'cga-001',
          level: 'SILVER',
          issuer: 'aigos-ca',
          expires_at: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
          governance_verified: {
            kill_switch: true,
            policy_engine: true,
            golden_thread: true,
            capability_bounds: false,
            telemetry: true,
          },
          compliance_frameworks: ['SOC2'],
        },
        aigos: {
          asset_id: 'asset-001',
          golden_thread_hash: 'sha256:abc123',
          risk_level: 'LIMITED',
          capabilities: ['read', 'write'],
        },
      };

      const result = CGATokenClaimsSchema.safeParse(claims);
      expect(result.success).toBe(true);
    });

    it('should accept array audience', () => {
      const claims = {
        iss: 'urn:aigos:agent:org:my-agent:v1',
        sub: 'urn:aigos:agent:org:my-agent:v1',
        aud: ['service-a', 'service-b'],
        exp: Math.floor(Date.now() / 1000) + 3600,
        iat: Math.floor(Date.now() / 1000),
        jti: 'jwt-001',
        cga: {
          certificate_id: 'cga-001',
          level: 'BRONZE',
          issuer: 'self',
          expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          governance_verified: {
            kill_switch: true,
            policy_engine: true,
            golden_thread: true,
            capability_bounds: false,
            telemetry: false,
          },
          compliance_frameworks: [],
        },
        aigos: {
          asset_id: 'asset-001',
          golden_thread_hash: 'sha256:abc123',
          risk_level: 'MINIMAL',
          capabilities: ['read'],
        },
      };

      const result = CGATokenClaimsSchema.safeParse(claims);
      expect(result.success).toBe(true);
    });
  });

  describe('CGATokenGenerator', () => {
    it('should create generator with options', () => {
      const generator = new CGATokenGenerator({
        privateKey: 'test-key',
        keyId: 'key-001',
      });
      expect(generator).toBeDefined();
    });

    it('should generate token from certificate', async () => {
      const generator = new CGATokenGenerator({
        privateKey: 'test-key',
        keyId: 'key-001',
        validitySeconds: 3600,
      });

      const result = await generator.generate({
        certificate: mockCertificate,
        audience: 'urn:aigos:agent:org:target:v1',
        assetId: 'asset-001',
        goldenThreadHash: 'sha256:abc123',
        riskLevel: 'LIMITED',
        capabilities: ['read', 'write'],
      });

      expect(result.token).toBeDefined();
      expect(result.claims).toBeDefined();
      expect(result.expires_at).toBeInstanceOf(Date);
    });

    it('should generate valid JWT format', async () => {
      const generator = new CGATokenGenerator({
        privateKey: 'test-key',
        keyId: 'key-001',
      });

      const result = await generator.generate({
        certificate: mockCertificate,
        audience: 'target-service',
        assetId: 'asset-001',
        goldenThreadHash: 'sha256:abc123',
        riskLevel: 'LIMITED',
        capabilities: ['read'],
      });

      const parts = result.token.split('.');
      expect(parts).toHaveLength(3);
    });

    it('should include CGA claims in token', async () => {
      const generator = new CGATokenGenerator({
        privateKey: 'test-key',
        keyId: 'key-001',
      });

      const result = await generator.generate({
        certificate: mockCertificate,
        audience: 'target-service',
        assetId: 'asset-001',
        goldenThreadHash: 'sha256:abc123',
        riskLevel: 'LIMITED',
        capabilities: ['read'],
      });

      expect(result.claims.cga.certificate_id).toBe(mockCertificate.spec.id);
      expect(result.claims.cga.level).toBe('SILVER');
      expect(result.claims.cga.governance_verified.kill_switch).toBe(true);
    });

    it('should include AIGOS claims in token', async () => {
      const generator = new CGATokenGenerator({
        privateKey: 'test-key',
        keyId: 'key-001',
      });

      const result = await generator.generate({
        certificate: mockCertificate,
        audience: 'target-service',
        assetId: 'asset-001',
        goldenThreadHash: 'sha256:abc123',
        riskLevel: 'LIMITED',
        capabilities: ['read', 'write'],
        policyVersion: '1.0.0',
      });

      expect(result.claims.aigos.asset_id).toBe('asset-001');
      expect(result.claims.aigos.golden_thread_hash).toBe('sha256:abc123');
      expect(result.claims.aigos.risk_level).toBe('LIMITED');
      expect(result.claims.aigos.capabilities).toEqual(['read', 'write']);
      expect(result.claims.aigos.policy_version).toBe('1.0.0');
    });

    it('should set correct expiration', async () => {
      const generator = new CGATokenGenerator({
        privateKey: 'test-key',
        keyId: 'key-001',
        validitySeconds: 7200, // 2 hours
      });

      const before = Date.now();
      const result = await generator.generate({
        certificate: mockCertificate,
        audience: 'target-service',
        assetId: 'asset-001',
        goldenThreadHash: 'sha256:abc123',
        riskLevel: 'LIMITED',
        capabilities: ['read'],
      });
      const after = Date.now();

      const expectedMin = new Date(before + 7200 * 1000);
      const expectedMax = new Date(after + 7200 * 1000);

      expect(result.expires_at.getTime()).toBeGreaterThanOrEqual(
        expectedMin.getTime() - 1000
      );
      expect(result.expires_at.getTime()).toBeLessThanOrEqual(
        expectedMax.getTime() + 1000
      );
    });
  });

  describe('CGATokenVerifier', () => {
    const trustedCAs = new Map([
      ['aigos-ca', 'public-key-pem'],
      ['self', 'self-signed-key'],
    ]);

    it('should create verifier with options', () => {
      const verifier = new CGATokenVerifier({
        trustedCAs,
      });
      expect(verifier).toBeDefined();
    });

    it('should verify valid token', async () => {
      const token = createTestToken();
      const verifier = new CGATokenVerifier({ trustedCAs });

      const result = await verifier.verify(token);
      expect(result.valid).toBe(true);
      expect(result.claims).toBeDefined();
    });

    it('should reject malformed token', async () => {
      const verifier = new CGATokenVerifier({ trustedCAs });
      const result = await verifier.verify('not-a-valid-token');

      expect(result.valid).toBe(false);
      expect(result.error).toContain('Invalid token format');
    });

    it('should reject expired token', async () => {
      const expiredToken = createTestToken({
        exp: Math.floor(Date.now() / 1000) - 3600, // Expired 1 hour ago
      });
      const verifier = new CGATokenVerifier({ trustedCAs });

      const result = await verifier.verify(expiredToken);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('expired');
    });

    it('should reject token with expired certificate', async () => {
      const token = createTestToken({
        cga: {
          certificate_id: 'cga-001',
          level: 'BRONZE',
          issuer: 'self',
          expires_at: new Date(Date.now() - 1000).toISOString(), // Expired
          governance_verified: {
            kill_switch: true,
            policy_engine: true,
            golden_thread: true,
            capability_bounds: false,
            telemetry: false,
          },
          compliance_frameworks: [],
        },
      });
      const verifier = new CGATokenVerifier({ trustedCAs });

      const result = await verifier.verify(token);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('certificate expired');
      expect(result.certificate_status).toBe('EXPIRED');
    });

    it('should warn when certificate expiring soon', async () => {
      const token = createTestToken({
        cga: {
          certificate_id: 'cga-001',
          level: 'BRONZE',
          issuer: 'self',
          expires_at: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days
          governance_verified: {
            kill_switch: true,
            policy_engine: true,
            golden_thread: true,
            capability_bounds: false,
            telemetry: false,
          },
          compliance_frameworks: [],
        },
      });
      const verifier = new CGATokenVerifier({ trustedCAs });

      const result = await verifier.verify(token);
      expect(result.valid).toBe(true);
      expect(result.warnings.some((w) => w.includes('expiring'))).toBe(true);
    });

    it('should extract CGA level', async () => {
      const token = createTestToken({
        cga: {
          certificate_id: 'cga-001',
          level: 'GOLD',
          issuer: 'self',
          expires_at: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString(),
          governance_verified: {
            kill_switch: true,
            policy_engine: true,
            golden_thread: true,
            capability_bounds: true,
            telemetry: true,
          },
          compliance_frameworks: ['SOC2', 'ISO27001'],
        },
      });
      const verifier = new CGATokenVerifier({ trustedCAs });

      const result = await verifier.verify(token);
      expect(result.cga_level).toBe('GOLD');
    });
  });

  describe('extractClaims', () => {
    it('should extract claims without verification', () => {
      const token = createTestToken();
      const verifier = new CGATokenVerifier({
        trustedCAs: new Map(),
      });

      const claims = verifier.extractClaims(token);
      expect(claims).not.toBeNull();
      expect(claims?.iss).toBe('urn:aigos:agent:test-agent');
    });

    it('should return null for invalid token', () => {
      const verifier = new CGATokenVerifier({
        trustedCAs: new Map(),
      });

      const claims = verifier.extractClaims('invalid');
      expect(claims).toBeNull();
    });
  });

  describe('createTestToken', () => {
    it('should create valid test token', () => {
      const token = createTestToken();
      expect(token).toBeDefined();

      const parts = token.split('.');
      expect(parts).toHaveLength(3);
    });

    it('should allow overriding claims', () => {
      const token = createTestToken({
        sub: 'custom-subject',
        aud: 'custom-audience',
      });

      const verifier = new CGATokenVerifier({ trustedCAs: new Map() });
      const claims = verifier.extractClaims(token);

      expect(claims?.sub).toBe('custom-subject');
      expect(claims?.aud).toBe('custom-audience');
    });

    it('should include default CGA claims', () => {
      const token = createTestToken();
      const verifier = new CGATokenVerifier({ trustedCAs: new Map() });
      const claims = verifier.extractClaims(token);

      expect(claims?.cga.level).toBe('BRONZE');
      expect(claims?.cga.governance_verified.kill_switch).toBe(true);
    });
  });
});
