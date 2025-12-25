import { z } from "zod";

// ─────────────────────────────────────────────────────────────────
// OWNER SCHEMA
// ─────────────────────────────────────────────────────────────────

export const OwnerSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  team: z.string().optional(),
});

export type Owner = z.infer<typeof OwnerSchema>;

// ─────────────────────────────────────────────────────────────────
// TECHNICAL SCHEMA
// ─────────────────────────────────────────────────────────────────

export const TechnicalSchema = z.object({
  type: z.enum(["model", "agent", "api_client", "framework", "pipeline"]),
  framework: z.string().optional(),
  frameworkVersion: z.string().optional(),
  components: z
    .array(
      z.object({
        type: z.string(),
        provider: z.string().optional(),
        model: z.string().optional(),
      })
    )
    .optional(),
  sourceFiles: z.array(z.string()).optional(),
});

export type Technical = z.infer<typeof TechnicalSchema>;

// ─────────────────────────────────────────────────────────────────
// RISK FACTORS SCHEMA
// ─────────────────────────────────────────────────────────────────

export const RiskFactorsSchema = z.object({
  autonomousDecisions: z.boolean().default(false),
  customerFacing: z.boolean().default(false),
  toolExecution: z.boolean().default(false),
  externalDataAccess: z.boolean().default(false),
  piiProcessing: z.enum(["yes", "no", "unknown"]).default("unknown"),
  highStakesDecisions: z.boolean().default(false),
});

export type RiskFactors = z.infer<typeof RiskFactorsSchema>;

// ─────────────────────────────────────────────────────────────────
// CLASSIFICATION SCHEMA
// ─────────────────────────────────────────────────────────────────

export const ClassificationSchema = z.object({
  riskLevel: z.enum(["minimal", "limited", "high", "unacceptable"]),
  riskFactors: RiskFactorsSchema,
  euAiAct: z
    .object({
      category: z.string(),
      transparencyRequired: z.boolean().default(false),
    })
    .optional(),
  requiredArtifacts: z
    .array(
      z.object({
        type: z.string(),
        status: z.enum(["pending", "complete", "not_applicable"]),
        path: z.string().optional(),
      })
    )
    .optional(),
});

export type Classification = z.infer<typeof ClassificationSchema>;

// ─────────────────────────────────────────────────────────────────
// INTENT SCHEMA (Golden Thread)
// ─────────────────────────────────────────────────────────────────

export const IntentSchema = z.object({
  linked: z.boolean().default(false),
  ticketSystem: z.enum(["jira", "ado", "github", "gitlab"]).nullable().optional(),
  ticketId: z.string().nullable().optional(),
  ticketUrl: z.string().url().nullable().optional(),
  businessJustification: z.string().nullable().optional(),
  riskTolerance: z.enum(["low", "medium", "high"]).nullable().optional(),
  importedAt: z.string().datetime().nullable().optional(),
});

export type Intent = z.infer<typeof IntentSchema>;

// ─────────────────────────────────────────────────────────────────
// GOVERNANCE SCHEMA
// ─────────────────────────────────────────────────────────────────

export const ApprovalSchema = z.object({
  role: z.string(),
  name: z.string(),
  email: z.string().email().optional(),
  date: z.string(),
  source: z.string().optional(),
});

export const GovernanceSchema = z.object({
  status: z.enum(["draft", "linked", "approved", "production", "deprecated", "revoked"]),
  approvals: z.array(ApprovalSchema).default([]),
  deployment: z
    .object({
      environments: z.array(z.string()).default([]),
      lastDeployed: z.string().datetime().nullable().optional(),
    })
    .optional(),
});

export type Governance = z.infer<typeof GovernanceSchema>;

// ─────────────────────────────────────────────────────────────────
// CONSTRAINTS SCHEMA
// ─────────────────────────────────────────────────────────────────

export const ConstraintsSchema = z.object({
  runtime: z
    .object({
      maxIterations: z.number().positive().optional(),
      timeoutSeconds: z.number().positive().optional(),
      maxTokensPerRequest: z.number().positive().optional(),
      maxCostPerRequestUsd: z.number().positive().optional(),
    })
    .optional(),
  humanApprovalRequired: z.array(z.string()).optional(),
  monitoring: z
    .object({
      logAllDecisions: z.boolean().default(true),
      logToolInvocations: z.boolean().default(true),
    })
    .optional(),
});

export type Constraints = z.infer<typeof ConstraintsSchema>;

// ─────────────────────────────────────────────────────────────────
// ASSET CARD SCHEMA (Main Schema)
// ─────────────────────────────────────────────────────────────────

export const AssetCardSchema = z.object({
  $schema: z.string().optional(),
  id: z.string().regex(/^aigrc-\d{4}-[a-f0-9]{8}$/),
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  version: z.string().default("1.0.0"),
  created: z.string().datetime(),
  updated: z.string().datetime(),
  ownership: z.object({
    owner: OwnerSchema,
    team: z.string().optional(),
  }),
  technical: TechnicalSchema,
  classification: ClassificationSchema,
  intent: IntentSchema,
  governance: GovernanceSchema,
  constraints: ConstraintsSchema.optional(),
});

export type AssetCard = z.infer<typeof AssetCardSchema>;