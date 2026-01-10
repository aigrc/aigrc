/**
 * CGA Trust Policy Tests
 */

import { describe, it, expect } from 'vitest';
import {
  A2ATrustPolicySchema,
  TrustPolicyEvaluator,
  type A2ATrustPolicy,
  type CGAClaims,
} from './trust-policy';

describe('CGA Trust Policy', () => {
  const basePolicy: A2ATrustPolicy = {
    apiVersion: 'aigos.io/v1',
    kind: 'A2ATrustPolicy',
    metadata: { name: 'test-policy' },
    spec: {
      default: {
        require_cga: true,
        minimum_level: 'SILVER',
      },
      trusted_cas: [
        { id: 'aigos-ca', name: 'AIGOS CA', trust_level: 'FULL' },
        { id: 'partner-ca', name: 'Partner CA', trust_level: 'LIMITED' },
      ],
      actions: [
        {
          pattern: 'payments.*',
          require_cga: true,
          minimum_level: 'GOLD',
          require_compliance: ['SOC2'],
        },
        {
          pattern: 'read.*',
          require_cga: false,
          minimum_level: 'BRONZE',
        },
      ],
      organizations: [
        {
          id: 'org-trusted',
          minimum_level: 'BRONZE',
          trusted: true,
        },
      ],
      health: {
        require_recent_health_check: true,
        max_health_check_age_hours: 24,
        min_uptime_30d: 99.0,
        max_violations_30d: 5,
      },
    },
  };

  const validClaims: CGAClaims = {
    certificate_id: 'cga-001',
    level: 'SILVER',
    issuer: 'aigos-ca',
    expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    governance_verified: {
      kill_switch: true,
      policy_engine: true,
      golden_thread: true,
      capability_bounds: true,
      telemetry: true,
    },
    compliance_frameworks: ['SOC2', 'ISO27001'],
    operational_health: {
      uptime_30d: 99.9,
      violations_30d: 0,
      last_health_check: new Date().toISOString(),
    },
  };

  describe('A2ATrustPolicySchema', () => {
    it('should validate a complete policy', () => {
      const result = A2ATrustPolicySchema.safeParse(basePolicy);
      expect(result.success).toBe(true);
    });

    it('should validate minimal policy', () => {
      const minimal = {
        spec: {
          default: {
            require_cga: true,
            minimum_level: 'BRONZE',
          },
          trusted_cas: [],
        },
      };

      const result = A2ATrustPolicySchema.safeParse(minimal);
      expect(result.success).toBe(true);
    });

    it('should set default apiVersion', () => {
      const policy = {
        spec: {
          default: { require_cga: true, minimum_level: 'SILVER' },
          trusted_cas: [],
        },
      };

      const result = A2ATrustPolicySchema.parse(policy);
      expect(result.apiVersion).toBe('aigos.io/v1');
    });
  });

  describe('TrustPolicyEvaluator', () => {
    it('should create evaluator with policy', () => {
      const evaluator = new TrustPolicyEvaluator(basePolicy);
      expect(evaluator).toBeDefined();
    });

    describe('evaluate', () => {
      it('should trust valid CGA claims', () => {
        const evaluator = new TrustPolicyEvaluator(basePolicy);
        const result = evaluator.evaluate(validClaims, {
          action: 'some.action',
        });

        expect(result.trusted).toBe(true);
        expect(result.cga_level).toBe('SILVER');
      });

      it('should reject when CGA required but not present', () => {
        const evaluator = new TrustPolicyEvaluator(basePolicy);
        const result = evaluator.evaluate(null, {
          action: 'some.action',
        });

        expect(result.trusted).toBe(false);
        expect(result.reason).toContain('required but not present');
      });

      it('should allow when CGA not required and not present', () => {
        const evaluator = new TrustPolicyEvaluator(basePolicy);
        const result = evaluator.evaluate(null, {
          action: 'read.data',
        });

        expect(result.trusted).toBe(true);
        expect(result.warnings).toContain('No CGA attestation present');
      });

      it('should reject untrusted CA', () => {
        const evaluator = new TrustPolicyEvaluator(basePolicy);
        const claims = { ...validClaims, issuer: 'untrusted-ca' };
        const result = evaluator.evaluate(claims, {
          action: 'some.action',
        });

        expect(result.trusted).toBe(false);
        expect(result.reason).toContain('Untrusted CA');
      });

      it('should reject expired certificate', () => {
        const evaluator = new TrustPolicyEvaluator(basePolicy);
        const claims = {
          ...validClaims,
          expires_at: new Date(Date.now() - 1000).toISOString(),
        };
        const result = evaluator.evaluate(claims, {
          action: 'some.action',
        });

        expect(result.trusted).toBe(false);
        expect(result.reason).toContain('expired');
      });

      it('should reject insufficient level', () => {
        const evaluator = new TrustPolicyEvaluator(basePolicy);
        const claims = { ...validClaims, level: 'BRONZE' as const };
        const result = evaluator.evaluate(claims, {
          action: 'some.action',
        });

        expect(result.trusted).toBe(false);
        expect(result.reason).toContain('below required');
      });

      it('should apply action-specific level requirements', () => {
        const evaluator = new TrustPolicyEvaluator(basePolicy);
        const silverClaims = { ...validClaims, level: 'SILVER' as const };
        const result = evaluator.evaluate(silverClaims, {
          action: 'payments.transfer',
        });

        // payments.* requires GOLD
        expect(result.trusted).toBe(false);
        expect(result.reason).toContain('SILVER');
        expect(result.reason).toContain('GOLD');
      });

      it('should accept GOLD level for payments action', () => {
        const evaluator = new TrustPolicyEvaluator(basePolicy);
        const goldClaims = { ...validClaims, level: 'GOLD' as const };
        const result = evaluator.evaluate(goldClaims, {
          action: 'payments.transfer',
        });

        expect(result.trusted).toBe(true);
      });

      it('should check compliance requirements', () => {
        const evaluator = new TrustPolicyEvaluator(basePolicy);
        const claims = {
          ...validClaims,
          level: 'GOLD' as const,
          compliance_frameworks: [], // Missing SOC2
        };
        const result = evaluator.evaluate(claims, {
          action: 'payments.transfer',
        });

        expect(result.trusted).toBe(false);
        expect(result.reason).toContain('Missing compliance');
        expect(result.reason).toContain('SOC2');
      });

      it('should apply organization override', () => {
        const evaluator = new TrustPolicyEvaluator(basePolicy);
        const bronzeClaims = { ...validClaims, level: 'BRONZE' as const };
        const result = evaluator.evaluate(bronzeClaims, {
          action: 'some.action',
          source_organization: 'org-trusted',
        });

        // org-trusted has minimum_level: BRONZE
        expect(result.trusted).toBe(true);
      });

      it('should reject too many violations', () => {
        const evaluator = new TrustPolicyEvaluator(basePolicy);
        const claims = {
          ...validClaims,
          operational_health: {
            uptime_30d: 99.9,
            violations_30d: 10, // Exceeds max_violations_30d: 5
          },
        };
        const result = evaluator.evaluate(claims, {
          action: 'some.action',
        });

        expect(result.trusted).toBe(false);
        expect(result.reason).toContain('violations');
      });

      it('should warn on low uptime', () => {
        const evaluator = new TrustPolicyEvaluator(basePolicy);
        const claims = {
          ...validClaims,
          operational_health: {
            uptime_30d: 98.0, // Below min_uptime_30d: 99.0
            violations_30d: 0,
          },
        };
        const result = evaluator.evaluate(claims, {
          action: 'some.action',
        });

        expect(result.trusted).toBe(true);
        expect(result.warnings.some((w) => w.includes('Uptime'))).toBe(true);
      });
    });

    describe('trust score', () => {
      it('should calculate higher score for higher levels', () => {
        const evaluator = new TrustPolicyEvaluator(basePolicy);

        const bronzeResult = evaluator.evaluate(
          { ...validClaims, level: 'BRONZE' as const },
          { action: 'read.data' }
        );
        const silverResult = evaluator.evaluate(
          { ...validClaims, level: 'SILVER' as const },
          { action: 'some.action' }
        );
        const goldResult = evaluator.evaluate(
          { ...validClaims, level: 'GOLD' as const },
          { action: 'some.action' }
        );
        const platinumResult = evaluator.evaluate(
          { ...validClaims, level: 'PLATINUM' as const },
          { action: 'some.action' }
        );

        expect(silverResult.trust_score).toBeGreaterThan(bronzeResult.trust_score);
        expect(goldResult.trust_score).toBeGreaterThan(silverResult.trust_score);
        expect(platinumResult.trust_score).toBeGreaterThan(goldResult.trust_score);
      });

      it('should return 0 trust score for untrusted claims', () => {
        const evaluator = new TrustPolicyEvaluator(basePolicy);
        const result = evaluator.evaluate(null, {
          action: 'some.action',
        });

        expect(result.trust_score).toBe(0);
      });

      it('should return 0.5 trust score when CGA not present but not required', () => {
        const evaluator = new TrustPolicyEvaluator(basePolicy);
        const result = evaluator.evaluate(null, {
          action: 'read.data',
        });

        expect(result.trust_score).toBe(0.5);
      });
    });

    describe('pattern matching', () => {
      it('should match wildcard patterns', () => {
        const evaluator = new TrustPolicyEvaluator(basePolicy);

        const result1 = evaluator.evaluate(validClaims, {
          action: 'read.users',
        });
        const result2 = evaluator.evaluate(validClaims, {
          action: 'read.documents',
        });

        // Both should be trusted (read.* doesn't require CGA)
        // But we're sending valid claims, so should be trusted
        expect(result1.trusted).toBe(true);
        expect(result2.trusted).toBe(true);
      });

      it('should match exact patterns', () => {
        const policy: A2ATrustPolicy = {
          ...basePolicy,
          spec: {
            ...basePolicy.spec,
            actions: [
              {
                pattern: 'admin.delete',
                require_cga: true,
                minimum_level: 'PLATINUM',
              },
            ],
          },
        };

        const evaluator = new TrustPolicyEvaluator(policy);
        const goldClaims = { ...validClaims, level: 'GOLD' as const };
        const result = evaluator.evaluate(goldClaims, {
          action: 'admin.delete',
        });

        expect(result.trusted).toBe(false);
        expect(result.reason).toContain('PLATINUM');
      });
    });
  });
});
