/**
 * CGA Certificate Schema
 *
 * Defines the structure for Certified Governed Agent certificates.
 * @see SPEC-CGA-001 Section 2 for full specification
 */

import { z } from 'zod';

/**
 * CGA Certification Levels
 */
export const CGALevelSchema = z.enum(['BRONZE', 'SILVER', 'GOLD', 'PLATINUM']);
export type CGALevel = z.infer<typeof CGALevelSchema>;

/**
 * Governance attestation status
 */
export const AttestationStatusSchema = z.enum([
  'VERIFIED',
  'NOT_VERIFIED',
  'NOT_APPLICABLE',
]);

/**
 * Kill Switch attestation
 */
export const KillSwitchAttestationSchema = z.object({
  status: AttestationStatusSchema,
  verified_at: z.string().datetime().optional(),
  sla: z
    .object({
      target_ms: z.number(),
      measured_ms: z.number(),
      percentile: z.string(),
    })
    .optional(),
  channels: z
    .array(
      z.object({
        type: z.enum(['SSE', 'WEBSOCKET', 'POLLING', 'LOCAL_FILE']),
        endpoint: z.string().optional(),
        interval_ms: z.number().optional(),
        verified: z.boolean(),
      })
    )
    .optional(),
  test_results: z
    .object({
      total_tests: z.number(),
      passed: z.number(),
      failed: z.number(),
      last_test: z.string().datetime(),
    })
    .optional(),
});

/**
 * Policy Engine attestation
 */
export const PolicyEngineAttestationSchema = z.object({
  status: AttestationStatusSchema,
  verified_at: z.string().datetime().optional(),
  latency: z
    .object({
      target_ms: z.number(),
      measured_p50_ms: z.number(),
      measured_p99_ms: z.number(),
    })
    .optional(),
  policy: z
    .object({
      version: z.string(),
      hash: z.string(),
      rules_count: z.number(),
    })
    .optional(),
  enforcement: z.enum(['STRICT', 'PERMISSIVE', 'AUDIT_ONLY']).optional(),
});

/**
 * Golden Thread attestation
 */
export const GoldenThreadAttestationSchema = z.object({
  status: AttestationStatusSchema,
  verified_at: z.string().datetime().optional(),
  hash: z
    .object({
      algorithm: z.string(),
      value: z.string(),
      verified: z.boolean(),
    })
    .optional(),
  signature: z
    .object({
      algorithm: z.string(),
      verified: z.boolean(),
      signer: z.string(),
    })
    .optional(),
});

/**
 * Capability Bounds attestation
 */
export const CapabilityBoundsAttestationSchema = z.object({
  status: AttestationStatusSchema,
  verified_at: z.string().datetime().optional(),
  decay: z
    .object({
      mode: z.enum(['EXPLICIT', 'PROPORTIONAL', 'NONE']),
      verified: z.boolean(),
    })
    .optional(),
  hierarchy: z
    .object({
      max_generation_depth: z.number(),
      verified: z.boolean(),
    })
    .optional(),
  capabilities: z.array(z.string()).optional(),
  max_budget_usd: z.number().optional(),
});

/**
 * Telemetry attestation
 */
export const TelemetryAttestationSchema = z.object({
  status: AttestationStatusSchema,
  verified_at: z.string().datetime().optional(),
  protocol: z.string().optional(),
  endpoint: z.string().optional(),
  retention: z
    .object({
      traces_days: z.number(),
      metrics_days: z.number(),
      logs_days: z.number(),
    })
    .optional(),
  required_spans: z.array(z.string()).optional(),
});

/**
 * Combined governance attestations
 */
export const GovernanceAttestationSchema = z.object({
  kill_switch: KillSwitchAttestationSchema,
  policy_engine: PolicyEngineAttestationSchema,
  golden_thread: GoldenThreadAttestationSchema,
  capability_bounds: CapabilityBoundsAttestationSchema,
  telemetry: TelemetryAttestationSchema,
});
export type GovernanceAttestation = z.infer<typeof GovernanceAttestationSchema>;

/**
 * Compliance framework attestation
 */
export const ComplianceFrameworkAttestationSchema = z.object({
  framework: z.string(),
  status: z.enum(['COMPLIANT', 'ALIGNED', 'CERTIFIED', 'NOT_ASSESSED']),
  risk_category: z.string().optional(),
  articles_addressed: z
    .array(
      z.object({
        article: z.union([z.number(), z.string()]),
        title: z.string().optional(),
        evidence: z.string().optional(),
      })
    )
    .optional(),
  functions_addressed: z
    .array(
      z.object({
        function: z.string(),
        subcategories: z.array(z.string()).optional(),
      })
    )
    .optional(),
  clauses_addressed: z.array(z.union([z.number(), z.string()])).optional(),
  maturity_level: z.number().optional(),
  certification_body: z.string().optional(),
  certificate_number: z.string().optional(),
  conformity_declaration: z
    .object({
      url: z.string(),
      hash: z.string(),
    })
    .optional(),
});

export const ComplianceAttestationSchema = z.object({
  frameworks: z.array(ComplianceFrameworkAttestationSchema),
});
export type ComplianceAttestation = z.infer<typeof ComplianceAttestationSchema>;

/**
 * Security posture
 */
export const SecurityPostureSchema = z.object({
  pentest: z
    .object({
      last_test: z.string(),
      provider: z.string(),
      scope: z.array(z.string()),
      findings: z.object({
        critical: z.number(),
        high: z.number(),
        medium: z.number(),
        low: z.number(),
      }),
      remediation_status: z.enum(['COMPLETE', 'IN_PROGRESS', 'NOT_STARTED']),
    })
    .optional(),
  vulnerabilities: z
    .object({
      scan_date: z.string(),
      open: z.number(),
      accepted_risk: z.number(),
      accepted_risk_details: z
        .array(
          z.object({
            id: z.string(),
            severity: z.string(),
            justification: z.string(),
            expires: z.string().optional(),
          })
        )
        .optional(),
    })
    .optional(),
  controls: z
    .object({
      token_signing: z.string(),
      token_encryption: z.string().optional(),
      key_rotation_days: z.number(),
      mTLS_required: z.boolean(),
    })
    .optional(),
});

/**
 * Operational health
 */
export const OperationalHealthSchema = z.object({
  availability: z
    .object({
      uptime_30d_percent: z.number(),
      last_outage: z.string().optional(),
      mttr_minutes: z.number().optional(),
    })
    .optional(),
  governance_health: z
    .object({
      policy_violations_30d: z.number(),
      kill_switch_tests_30d: z.number(),
      kill_switch_tests_passed: z.number(),
    })
    .optional(),
  health_check: z
    .object({
      timestamp: z.string().datetime(),
      status: z.enum(['HEALTHY', 'DEGRADED', 'UNHEALTHY']),
      checks: z.array(
        z.object({
          name: z.string(),
          status: z.enum(['PASS', 'FAIL', 'WARN']),
        })
      ),
    })
    .optional(),
});

/**
 * Full CGA Certificate Schema
 */
export const CGACertificateSchema = z.object({
  apiVersion: z.literal('aigos.io/v1'),
  kind: z.literal('CGACertificate'),
  metadata: z.object({
    id: z.string(),
    version: z.number().default(1),
    schema_version: z.string().default('1.0.0'),
  }),
  spec: z.object({
    // Agent identity
    agent: z.object({
      id: z.string(),
      version: z.string(),
      organization: z.object({
        id: z.string(),
        name: z.string(),
        domain: z.string().optional(),
      }),
      golden_thread: z.object({
        hash: z.string(),
        algorithm: z.string(),
        asset_card_version: z.string().optional(),
      }),
      public_key: z
        .object({
          algorithm: z.string(),
          jwk: z.record(z.unknown()),
          key_id: z.string(),
        })
        .optional(),
    }),

    // Certification metadata
    certification: z.object({
      level: CGALevelSchema,
      issuer: z.object({
        id: z.string(),
        name: z.string(),
        url: z.string().optional(),
      }),
      issued_at: z.string().datetime(),
      expires_at: z.string().datetime(),
      renewal: z
        .object({
          url: z.string().optional(),
          auto_renew: z.boolean().default(false),
          grace_period_days: z.number().default(14),
        })
        .optional(),
      certificate_chain: z.array(z.string()).optional(),
    }),

    // Governance attestations
    governance: GovernanceAttestationSchema,

    // Compliance attestations
    compliance: ComplianceAttestationSchema.optional(),

    // Security posture
    security: SecurityPostureSchema.optional(),

    // Operational health
    operational: OperationalHealthSchema.optional(),
  }),

  // Cryptographic signature
  signature: z.object({
    algorithm: z.string(),
    key_id: z.string(),
    value: z.string(),
    timestamp: z
      .object({
        authority: z.string(),
        value: z.string(),
      })
      .optional(),
  }),
});

export type CGACertificate = z.infer<typeof CGACertificateSchema>;

/**
 * Compact CGA Certificate for token embedding
 */
export const CGACertificateCompactSchema = z.object({
  apiVersion: z.literal('aigos.io/v1'),
  kind: z.literal('CGACertificateCompact'),
  spec: z.object({
    id: z.string(),
    agent_id: z.string(),
    level: CGALevelSchema,
    issuer: z.string(),
    issued_at: z.string().datetime(),
    expires_at: z.string().datetime(),
    golden_thread_hash: z.string(),
    gov: z.object({
      ks: z.boolean(), // kill_switch
      pe: z.boolean(), // policy_engine
      gt: z.boolean(), // golden_thread
      cb: z.boolean(), // capability_bounds
      tm: z.boolean(), // telemetry
    }),
    compliance: z.array(z.string()),
    full_cert_url: z.string().optional(),
  }),
  signature: z.object({
    alg: z.string(),
    kid: z.string(),
    sig: z.string(),
  }),
});

export type CGACertificateCompact = z.infer<typeof CGACertificateCompactSchema>;

/**
 * Level requirements for certification
 */
export const LEVEL_REQUIREMENTS: Record<
  CGALevel,
  {
    validity_days: number;
    requires_ca: boolean;
    requires_manual_review: boolean;
  }
> = {
  BRONZE: {
    validity_days: 30,
    requires_ca: false,
    requires_manual_review: false,
  },
  SILVER: {
    validity_days: 90,
    requires_ca: true,
    requires_manual_review: false,
  },
  GOLD: {
    validity_days: 180,
    requires_ca: true,
    requires_manual_review: false,
  },
  PLATINUM: {
    validity_days: 365,
    requires_ca: true,
    requires_manual_review: true,
  },
};

/**
 * Check if a level meets a requirement
 */
export function levelMeetsRequirement(
  actual: CGALevel,
  required: CGALevel
): boolean {
  const levels: CGALevel[] = ['BRONZE', 'SILVER', 'GOLD', 'PLATINUM'];
  return levels.indexOf(actual) >= levels.indexOf(required);
}
