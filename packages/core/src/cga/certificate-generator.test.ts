/**
 * CGA Certificate Generator Tests
 */

import { describe, it, expect } from 'vitest';
import { CertificateGenerator, type CertificateGeneratorOptions } from './certificate-generator';
import { VerificationEngine } from './verification-engine';
import { CGACertificateSchema, LEVEL_REQUIREMENTS } from './certificate';

describe('CGA Certificate Generator', () => {
  const defaultOptions: CertificateGeneratorOptions = {
    organizationId: 'org-test-123',
    organizationName: 'Test Organization',
    organizationDomain: 'test.example.com',
    privateKey: 'test-private-key-pem',
    keyId: 'key-001',
  };

  describe('CertificateGenerator', () => {
    it('should create generator with options', () => {
      const generator = new CertificateGenerator(defaultOptions);
      expect(generator).toBeDefined();
    });

    it('should generate certificate from verification report', async () => {
      const engine = new VerificationEngine();
      const report = await engine.verify({
        assetCardPath: './test-asset.yaml',
        targetLevel: 'BRONZE',
      });

      const generator = new CertificateGenerator(defaultOptions);
      const certificate = await generator.generate(
        report,
        'urn:aigos:agent:org:my-agent:v1',
        '1.0.0',
        'sha256:abc123def456'
      );

      expect(certificate).toBeDefined();
      expect(certificate.apiVersion).toBe('aigos.io/v1');
      expect(certificate.kind).toBe('CGACertificate');
    });

    it('should generate valid certificate schema', async () => {
      const engine = new VerificationEngine();
      const report = await engine.verify({
        assetCardPath: './test-asset.yaml',
        targetLevel: 'BRONZE',
      });

      const generator = new CertificateGenerator(defaultOptions);
      const certificate = await generator.generate(
        report,
        'urn:aigos:agent:org:my-agent:v1',
        '1.0.0',
        'sha256:abc123def456'
      );

      const result = CGACertificateSchema.safeParse(certificate);
      expect(result.success).toBe(true);
    });

    it('should set correct agent information', async () => {
      const engine = new VerificationEngine();
      const report = await engine.verify({
        assetCardPath: './test-asset.yaml',
        targetLevel: 'BRONZE',
      });

      const generator = new CertificateGenerator(defaultOptions);
      const certificate = await generator.generate(
        report,
        'urn:aigos:agent:org:my-agent:v1',
        '2.0.0',
        'sha256:test123'
      );

      expect(certificate.spec.agent.id).toBe('urn:aigos:agent:org:my-agent:v1');
      expect(certificate.spec.agent.version).toBe('2.0.0');
      expect(certificate.spec.agent.golden_thread.hash).toBe('sha256:test123');
      expect(certificate.spec.agent.organization.id).toBe('org-test-123');
      expect(certificate.spec.agent.organization.name).toBe('Test Organization');
    });

    it('should set correct certification level', async () => {
      const engine = new VerificationEngine();
      const report = await engine.verify({
        assetCardPath: './test-asset.yaml',
        targetLevel: 'SILVER',
      });

      const generator = new CertificateGenerator(defaultOptions);
      const certificate = await generator.generate(
        report,
        'urn:aigos:agent:org:my-agent:v1',
        '1.0.0',
        'sha256:abc123'
      );

      expect(certificate.spec.certification.level).toBe('SILVER');
    });

    it('should calculate correct expiration based on level', async () => {
      const engine = new VerificationEngine();
      const report = await engine.verify({
        assetCardPath: './test-asset.yaml',
        targetLevel: 'BRONZE',
      });

      const generator = new CertificateGenerator(defaultOptions);
      const certificate = await generator.generate(
        report,
        'urn:aigos:agent:org:my-agent:v1',
        '1.0.0',
        'sha256:abc123'
      );

      const issuedAt = new Date(certificate.spec.certification.issued_at);
      const expiresAt = new Date(certificate.spec.certification.expires_at);
      const diffDays = (expiresAt.getTime() - issuedAt.getTime()) / (1000 * 60 * 60 * 24);

      expect(Math.round(diffDays)).toBe(LEVEL_REQUIREMENTS.BRONZE.validity_days);
    });

    it('should include governance attestations', async () => {
      const engine = new VerificationEngine();
      const report = await engine.verify({
        assetCardPath: './test-asset.yaml',
        targetLevel: 'BRONZE',
      });

      const generator = new CertificateGenerator(defaultOptions);
      const certificate = await generator.generate(
        report,
        'urn:aigos:agent:org:my-agent:v1',
        '1.0.0',
        'sha256:abc123'
      );

      expect(certificate.spec.governance).toBeDefined();
      expect(certificate.spec.governance.kill_switch).toBeDefined();
      expect(certificate.spec.governance.policy_engine).toBeDefined();
      expect(certificate.spec.governance.golden_thread).toBeDefined();
      expect(certificate.spec.governance.capability_bounds).toBeDefined();
      expect(certificate.spec.governance.telemetry).toBeDefined();
    });

    it('should include signature', async () => {
      const engine = new VerificationEngine();
      const report = await engine.verify({
        assetCardPath: './test-asset.yaml',
        targetLevel: 'BRONZE',
      });

      const generator = new CertificateGenerator(defaultOptions);
      const certificate = await generator.generate(
        report,
        'urn:aigos:agent:org:my-agent:v1',
        '1.0.0',
        'sha256:abc123'
      );

      expect(certificate.signature).toBeDefined();
      expect(certificate.signature.algorithm).toBe('ES256');
      expect(certificate.signature.key_id).toBe('key-001');
      expect(certificate.signature.value).toBeDefined();
    });

    it('should throw when verification did not achieve level', async () => {
      const report = {
        agent_id: 'test',
        timestamp: new Date().toISOString(),
        target_level: 'SILVER' as const,
        achieved_level: null,
        checks: [
          { check: 'test', status: 'FAIL' as const, message: 'Test failed' },
        ],
        summary: { total: 1, passed: 0, failed: 1, skipped: 0, warnings: 0 },
      };

      const generator = new CertificateGenerator(defaultOptions);

      await expect(
        generator.generate(
          report,
          'urn:aigos:agent:org:my-agent:v1',
          '1.0.0',
          'sha256:abc123'
        )
      ).rejects.toThrow('Cannot generate certificate');
    });

    it('should generate unique certificate IDs', async () => {
      const engine = new VerificationEngine();
      const report = await engine.verify({
        assetCardPath: './test-asset.yaml',
        targetLevel: 'BRONZE',
      });

      const generator = new CertificateGenerator(defaultOptions);
      const cert1 = await generator.generate(
        report,
        'urn:aigos:agent:org:trading-bot',
        '1.0.0',
        'sha256:abc123'
      );
      const cert2 = await generator.generate(
        report,
        'urn:aigos:agent:org:customer-service',
        '1.0.0',
        'sha256:def456'
      );

      // IDs should differ in the agent part
      expect(cert1.metadata.id).not.toBe(cert2.metadata.id);
      expect(cert1.metadata.id).toContain('trading-bot');
      expect(cert2.metadata.id).toContain('customer-service');
    });

    it('should include organization domain when provided', async () => {
      const engine = new VerificationEngine();
      const report = await engine.verify({
        assetCardPath: './test-asset.yaml',
        targetLevel: 'BRONZE',
      });

      const generator = new CertificateGenerator(defaultOptions);
      const certificate = await generator.generate(
        report,
        'urn:aigos:agent:org:my-agent:v1',
        '1.0.0',
        'sha256:abc123'
      );

      expect(certificate.spec.agent.organization.domain).toBe('test.example.com');
    });
  });
});
