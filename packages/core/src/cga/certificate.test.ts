/**
 * CGA Certificate Tests
 */

import { describe, it, expect } from 'vitest';
import {
  CGACertificateSchema,
  CGACertificateCompactSchema,
  CGALevelSchema,
  GovernanceAttestationSchema,
  ComplianceAttestationSchema,
  SecurityPostureSchema,
  OperationalHealthSchema,
  LEVEL_REQUIREMENTS,
  levelMeetsRequirement,
  type CGALevel,
  type CGACertificate,
  type CGACertificateCompact,
} from './certificate';

describe('CGA Certificate Schema', () => {
  describe('CGALevelSchema', () => {
    it('should accept valid levels', () => {
      expect(CGALevelSchema.parse('BRONZE')).toBe('BRONZE');
      expect(CGALevelSchema.parse('SILVER')).toBe('SILVER');
      expect(CGALevelSchema.parse('GOLD')).toBe('GOLD');
      expect(CGALevelSchema.parse('PLATINUM')).toBe('PLATINUM');
    });

    it('should reject invalid levels', () => {
      expect(() => CGALevelSchema.parse('INVALID')).toThrow();
      expect(() => CGALevelSchema.parse('bronze')).toThrow();
      expect(() => CGALevelSchema.parse('')).toThrow();
    });
  });

  describe('GovernanceAttestationSchema', () => {
    it('should validate complete governance attestation', () => {
      const attestation = {
        kill_switch: {
          status: 'VERIFIED',
          verified_at: '2025-01-15T10:00:00Z',
          sla: {
            target_ms: 1000,
            measured_ms: 450,
            percentile: 'p99',
          },
          channels: [
            {
              type: 'SSE',
              endpoint: 'https://agent.example.com/kill-switch',
              verified: true,
            },
          ],
        },
        policy_engine: {
          status: 'VERIFIED',
          verified_at: '2025-01-15T10:00:00Z',
          enforcement: 'STRICT',
        },
        golden_thread: {
          status: 'VERIFIED',
          verified_at: '2025-01-15T10:00:00Z',
          hash: {
            algorithm: 'SHA-256',
            value: 'abc123',
            verified: true,
          },
        },
        capability_bounds: {
          status: 'NOT_APPLICABLE',
        },
        telemetry: {
          status: 'VERIFIED',
          protocol: 'OTLP',
        },
      };

      const result = GovernanceAttestationSchema.safeParse(attestation);
      expect(result.success).toBe(true);
    });

    it('should validate minimal governance attestation', () => {
      const minimal = {
        kill_switch: { status: 'NOT_VERIFIED' },
        policy_engine: { status: 'NOT_VERIFIED' },
        golden_thread: { status: 'NOT_VERIFIED' },
        capability_bounds: { status: 'NOT_APPLICABLE' },
        telemetry: { status: 'NOT_APPLICABLE' },
      };

      const result = GovernanceAttestationSchema.safeParse(minimal);
      expect(result.success).toBe(true);
    });
  });

  describe('ComplianceAttestationSchema', () => {
    it('should validate compliance frameworks', () => {
      const compliance = {
        frameworks: [
          {
            framework: 'EU AI Act',
            status: 'COMPLIANT',
            risk_category: 'LIMITED',
            articles_addressed: [
              { article: 52, title: 'Transparency' },
            ],
          },
          {
            framework: 'NIST AI RMF',
            status: 'ALIGNED',
            functions_addressed: [
              { function: 'GOVERN', subcategories: ['GV.1', 'GV.2'] },
            ],
          },
        ],
      };

      const result = ComplianceAttestationSchema.safeParse(compliance);
      expect(result.success).toBe(true);
    });
  });

  describe('CGACertificateSchema', () => {
    it('should validate a complete certificate', () => {
      const certificate: CGACertificate = {
        apiVersion: 'aigos.io/v1',
        kind: 'CGACertificate',
        metadata: {
          id: 'cga-20250115-agent-silver',
          version: 1,
          schema_version: '1.0.0',
        },
        spec: {
          agent: {
            id: 'urn:aigos:agent:org:my-agent:v1',
            version: '1.0.0',
            organization: {
              id: 'org-123',
              name: 'Acme Corp',
              domain: 'acme.com',
            },
            golden_thread: {
              hash: 'sha256:abc123def456',
              algorithm: 'SHA-256',
              asset_card_version: '1.0.0',
            },
          },
          certification: {
            level: 'SILVER',
            issuer: {
              id: 'org-123',
              name: 'Acme Corp',
            },
            issued_at: '2025-01-15T10:00:00Z',
            expires_at: '2025-04-15T10:00:00Z',
            renewal: {
              auto_renew: false,
              grace_period_days: 14,
            },
          },
          governance: {
            kill_switch: { status: 'VERIFIED', verified_at: '2025-01-15T10:00:00Z' },
            policy_engine: { status: 'VERIFIED', verified_at: '2025-01-15T10:00:00Z' },
            golden_thread: { status: 'VERIFIED', verified_at: '2025-01-15T10:00:00Z' },
            capability_bounds: { status: 'NOT_APPLICABLE' },
            telemetry: { status: 'VERIFIED' },
          },
        },
        signature: {
          algorithm: 'ES256',
          key_id: 'key-001',
          value: 'base64signature',
        },
      };

      const result = CGACertificateSchema.safeParse(certificate);
      expect(result.success).toBe(true);
    });

    it('should reject certificate with wrong apiVersion', () => {
      const badCert = {
        apiVersion: 'v1',
        kind: 'CGACertificate',
        metadata: { id: 'test' },
        spec: {},
        signature: {},
      };

      const result = CGACertificateSchema.safeParse(badCert);
      expect(result.success).toBe(false);
    });
  });

  describe('CGACertificateCompactSchema', () => {
    it('should validate compact certificate', () => {
      const compact: CGACertificateCompact = {
        apiVersion: 'aigos.io/v1',
        kind: 'CGACertificateCompact',
        spec: {
          id: 'cga-20250115-agent-silver',
          agent_id: 'urn:aigos:agent:org:my-agent:v1',
          level: 'SILVER',
          issuer: 'org-123',
          issued_at: '2025-01-15T10:00:00Z',
          expires_at: '2025-04-15T10:00:00Z',
          golden_thread_hash: 'sha256:abc123',
          gov: {
            ks: true,
            pe: true,
            gt: true,
            cb: false,
            tm: true,
          },
          compliance: ['EU AI Act', 'NIST AI RMF'],
          full_cert_url: 'https://certs.example.com/cga-001',
        },
        signature: {
          alg: 'ES256',
          kid: 'key-001',
          sig: 'base64sig',
        },
      };

      const result = CGACertificateCompactSchema.safeParse(compact);
      expect(result.success).toBe(true);
    });
  });

  describe('LEVEL_REQUIREMENTS', () => {
    it('should have correct validity days', () => {
      expect(LEVEL_REQUIREMENTS.BRONZE.validity_days).toBe(30);
      expect(LEVEL_REQUIREMENTS.SILVER.validity_days).toBe(90);
      expect(LEVEL_REQUIREMENTS.GOLD.validity_days).toBe(180);
      expect(LEVEL_REQUIREMENTS.PLATINUM.validity_days).toBe(365);
    });

    it('should have correct CA requirements', () => {
      expect(LEVEL_REQUIREMENTS.BRONZE.requires_ca).toBe(false);
      expect(LEVEL_REQUIREMENTS.SILVER.requires_ca).toBe(true);
      expect(LEVEL_REQUIREMENTS.GOLD.requires_ca).toBe(true);
      expect(LEVEL_REQUIREMENTS.PLATINUM.requires_ca).toBe(true);
    });

    it('should have correct manual review requirements', () => {
      expect(LEVEL_REQUIREMENTS.BRONZE.requires_manual_review).toBe(false);
      expect(LEVEL_REQUIREMENTS.SILVER.requires_manual_review).toBe(false);
      expect(LEVEL_REQUIREMENTS.GOLD.requires_manual_review).toBe(false);
      expect(LEVEL_REQUIREMENTS.PLATINUM.requires_manual_review).toBe(true);
    });
  });

  describe('levelMeetsRequirement', () => {
    it('should return true when level meets requirement', () => {
      expect(levelMeetsRequirement('BRONZE', 'BRONZE')).toBe(true);
      expect(levelMeetsRequirement('SILVER', 'BRONZE')).toBe(true);
      expect(levelMeetsRequirement('GOLD', 'SILVER')).toBe(true);
      expect(levelMeetsRequirement('PLATINUM', 'GOLD')).toBe(true);
      expect(levelMeetsRequirement('PLATINUM', 'BRONZE')).toBe(true);
    });

    it('should return false when level does not meet requirement', () => {
      expect(levelMeetsRequirement('BRONZE', 'SILVER')).toBe(false);
      expect(levelMeetsRequirement('BRONZE', 'GOLD')).toBe(false);
      expect(levelMeetsRequirement('SILVER', 'GOLD')).toBe(false);
      expect(levelMeetsRequirement('GOLD', 'PLATINUM')).toBe(false);
    });
  });
});
