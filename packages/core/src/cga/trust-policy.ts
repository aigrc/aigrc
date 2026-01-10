/**
 * CGA Trust Policy
 *
 * Defines trust requirements for A2A communication with CGA.
 * @see SPEC-CGA-001 Section 7.2 for trust policy specification
 */

import { z } from 'zod';
import { CGALevel, CGALevelSchema, levelMeetsRequirement } from './certificate';

/**
 * Action-specific CGA requirement
 */
export const ActionRequirementSchema = z.object({
  pattern: z.string(),
  require_cga: z.boolean().default(true),
  minimum_level: CGALevelSchema,
  require_compliance: z.array(z.string()).optional(),
  require_pentest: z.boolean().optional(),
  max_violations_30d: z.number().optional(),
});

/**
 * Organization-specific override
 */
export const OrganizationOverrideSchema = z.object({
  id: z.string(),
  minimum_level: CGALevelSchema.optional(),
  skip_compliance_check: z.boolean().optional(),
  trusted: z.boolean().default(true),
});

/**
 * Trusted CA configuration
 */
export const TrustedCASchema = z.object({
  id: z.string(),
  name: z.string().optional(),
  trust_level: z.enum(['FULL', 'LIMITED']).default('FULL'),
  cross_signed_by: z.string().optional(),
});

/**
 * Revocation checking configuration
 */
export const RevocationConfigSchema = z.object({
  check_ocsp: z.boolean().default(true),
  check_crl: z.boolean().default(false),
  crl_cache_hours: z.number().default(24),
  fail_open: z.boolean().default(false),
});

/**
 * Health requirement configuration
 */
export const HealthConfigSchema = z.object({
  require_recent_health_check: z.boolean().default(true),
  max_health_check_age_hours: z.number().default(24),
  min_uptime_30d: z.number().default(99.0),
  max_violations_30d: z.number().default(5),
});

/**
 * A2A Trust Policy Schema
 */
export const A2ATrustPolicySchema = z.object({
  apiVersion: z.literal('aigos.io/v1').default('aigos.io/v1'),
  kind: z.literal('A2ATrustPolicy').default('A2ATrustPolicy'),
  metadata: z
    .object({
      name: z.string(),
    })
    .optional(),
  spec: z.object({
    // Default requirements
    default: z.object({
      require_cga: z.boolean().default(true),
      minimum_level: CGALevelSchema.default('SILVER'),
    }),

    // Trusted CAs
    trusted_cas: z.array(TrustedCASchema).default([]),

    // Action-specific requirements
    actions: z.array(ActionRequirementSchema).optional(),

    // Organization overrides
    organizations: z.array(OrganizationOverrideSchema).optional(),

    // Revocation checking
    revocation: RevocationConfigSchema.optional(),

    // Health requirements
    health: HealthConfigSchema.optional(),
  }),
});

export type A2ATrustPolicy = z.infer<typeof A2ATrustPolicySchema>;

/**
 * CGA claims from token
 */
export interface CGAClaims {
  certificate_id: string;
  level: CGALevel;
  issuer: string;
  expires_at: string;
  governance_verified: {
    kill_switch: boolean;
    policy_engine: boolean;
    golden_thread: boolean;
    capability_bounds: boolean;
    telemetry: boolean;
  };
  compliance_frameworks: string[];
  operational_health?: {
    uptime_30d: number;
    violations_30d: number;
    last_health_check?: string;
  };
}

/**
 * Trust evaluation result
 */
export interface TrustEvaluationResult {
  trusted: boolean;
  reason?: string;
  warnings: string[];
  cga_level: CGALevel | null;
  trust_score: number;
}

/**
 * Trust Policy Evaluator
 *
 * Evaluates CGA claims against trust policy.
 */
export class TrustPolicyEvaluator {
  constructor(private policy: A2ATrustPolicy) {}

  /**
   * Evaluate CGA claims against policy for a given action
   */
  evaluate(
    claims: CGAClaims | null,
    context: {
      action: string;
      source_organization?: string;
    }
  ): TrustEvaluationResult {
    const warnings: string[] = [];

    // Check if CGA is required
    const cgaRequired = this.isCGARequired(context.action);
    if (cgaRequired && !claims) {
      return {
        trusted: false,
        reason: 'CGA attestation required but not present',
        warnings: [],
        cga_level: null,
        trust_score: 0,
      };
    }

    if (!claims) {
      // CGA not required and not present
      return {
        trusted: true,
        warnings: ['No CGA attestation present'],
        cga_level: null,
        trust_score: 0.5,
      };
    }

    // Verify issuer is trusted
    const trustedCA = this.policy.spec.trusted_cas.find(
      (ca) => ca.id === claims.issuer
    );
    if (!trustedCA) {
      return {
        trusted: false,
        reason: `Untrusted CA: ${claims.issuer}`,
        warnings: [],
        cga_level: claims.level,
        trust_score: 0,
      };
    }

    // Check certificate expiration
    const expiresAt = new Date(claims.expires_at);
    if (expiresAt < new Date()) {
      return {
        trusted: false,
        reason: 'CGA certificate expired',
        warnings: [],
        cga_level: claims.level,
        trust_score: 0,
      };
    }

    // Get required level for action
    const requiredLevel = this.getRequiredLevel(context.action, context.source_organization);
    if (!levelMeetsRequirement(claims.level, requiredLevel)) {
      return {
        trusted: false,
        reason: `CGA level ${claims.level} below required ${requiredLevel}`,
        warnings: [],
        cga_level: claims.level,
        trust_score: 0,
      };
    }

    // Check compliance requirements
    const complianceResult = this.checkCompliance(claims, context.action);
    if (!complianceResult.satisfied) {
      return {
        trusted: false,
        reason: `Missing compliance: ${complianceResult.missing.join(', ')}`,
        warnings: [],
        cga_level: claims.level,
        trust_score: 0,
      };
    }

    // Check health requirements
    if (this.policy.spec.health && claims.operational_health) {
      const healthConfig = this.policy.spec.health;

      if (claims.operational_health.uptime_30d < healthConfig.min_uptime_30d) {
        warnings.push(
          `Uptime ${claims.operational_health.uptime_30d}% below ${healthConfig.min_uptime_30d}%`
        );
      }

      if (claims.operational_health.violations_30d > healthConfig.max_violations_30d) {
        return {
          trusted: false,
          reason: `${claims.operational_health.violations_30d} violations exceed max ${healthConfig.max_violations_30d}`,
          warnings,
          cga_level: claims.level,
          trust_score: 0,
        };
      }
    }

    // Calculate trust score
    const trustScore = this.calculateTrustScore(claims);

    return {
      trusted: true,
      warnings,
      cga_level: claims.level,
      trust_score: trustScore,
    };
  }

  /**
   * Check if CGA is required for action
   */
  private isCGARequired(action: string): boolean {
    // Check action-specific rules
    const actionRule = this.policy.spec.actions?.find((a) =>
      this.matchPattern(action, a.pattern)
    );
    if (actionRule) {
      return actionRule.require_cga;
    }

    // Fall back to default
    return this.policy.spec.default.require_cga;
  }

  /**
   * Get required CGA level for action
   */
  private getRequiredLevel(action: string, organization?: string): CGALevel {
    // Check organization override
    if (organization) {
      const orgOverride = this.policy.spec.organizations?.find(
        (o) => o.id === organization
      );
      if (orgOverride?.minimum_level) {
        return orgOverride.minimum_level;
      }
    }

    // Check action-specific rules
    const actionRule = this.policy.spec.actions?.find((a) =>
      this.matchPattern(action, a.pattern)
    );
    if (actionRule) {
      return actionRule.minimum_level;
    }

    // Fall back to default
    return this.policy.spec.default.minimum_level;
  }

  /**
   * Check compliance requirements
   */
  private checkCompliance(
    claims: CGAClaims,
    action: string
  ): { satisfied: boolean; missing: string[] } {
    const actionRule = this.policy.spec.actions?.find((a) =>
      this.matchPattern(action, a.pattern)
    );

    if (!actionRule?.require_compliance) {
      return { satisfied: true, missing: [] };
    }

    const missing = actionRule.require_compliance.filter(
      (req) => !claims.compliance_frameworks.some((f) => f.includes(req))
    );

    return {
      satisfied: missing.length === 0,
      missing,
    };
  }

  /**
   * Calculate trust score (0-1)
   */
  private calculateTrustScore(claims: CGAClaims): number {
    const levelScores: Record<CGALevel, number> = {
      BRONZE: 0.25,
      SILVER: 0.5,
      GOLD: 0.75,
      PLATINUM: 1.0,
    };

    let score = levelScores[claims.level];

    // Adjust for health
    if (claims.operational_health) {
      if (claims.operational_health.violations_30d > 0) {
        score -= 0.1;
      }
      if (claims.operational_health.uptime_30d >= 99.9) {
        score += 0.05;
      }
    }

    return Math.max(0, Math.min(1, score));
  }

  /**
   * Match action against glob pattern
   */
  private matchPattern(action: string, pattern: string): boolean {
    const regex = new RegExp(
      '^' + pattern.replace(/\*/g, '.*').replace(/\?/g, '.') + '$'
    );
    return regex.test(action);
  }
}
