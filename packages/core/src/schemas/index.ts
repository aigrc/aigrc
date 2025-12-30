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
// JURISDICTION CLASSIFICATION SCHEMA
// ─────────────────────────────────────────────────────────────────

export const ControlStatusSchema = z.object({
  controlId: z.string(),
  status: z.enum(["implemented", "partial", "not_implemented", "not_applicable"]),
  evidence: z.string().optional(),
  notes: z.string().optional(),
  lastUpdated: z.string().datetime().optional(),
});

export type ControlStatus = z.infer<typeof ControlStatusSchema>;

export const JurisdictionClassificationSchema = z.object({
  /** Profile/jurisdiction ID (e.g., "eu-ai-act", "us-omb-m24") */
  jurisdictionId: z.string(),
  /** Risk level mapped to this jurisdiction's terminology */
  riskLevel: z.string(),
  /** Jurisdiction-specific category (e.g., EU AI Act category) */
  category: z.string().optional(),
  /** Status of controls for this jurisdiction */
  controlStatuses: z.array(ControlStatusSchema).optional(),
  /** Required artifacts for this jurisdiction */
  requiredArtifacts: z
    .array(
      z.object({
        artifactId: z.string(),
        status: z.enum(["pending", "complete", "not_applicable"]),
        path: z.string().optional(),
      })
    )
    .optional(),
  /** Last compliance check date */
  lastChecked: z.string().datetime().optional(),
  /** Compliance percentage for this jurisdiction */
  compliancePercentage: z.number().min(0).max(100).optional(),
});

export type JurisdictionClassification = z.infer<typeof JurisdictionClassificationSchema>;

// ─────────────────────────────────────────────────────────────────
// TRUSTWORTHINESS CHARACTERISTICS SCHEMA (NIST AI RMF)
// ─────────────────────────────────────────────────────────────────

export const TrustworthinessCharacteristicSchema = z.object({
  score: z.number().min(0).max(100).optional(),
  notes: z.string().optional(),
  lastAssessed: z.string().datetime().optional(),
  assessedBy: z.string().optional(),
});

export type TrustworthinessCharacteristic = z.infer<typeof TrustworthinessCharacteristicSchema>;

export const TrustworthinessSchema = z.object({
  /** Valid and reliable: produces accurate, consistent results */
  valid: TrustworthinessCharacteristicSchema.optional(),
  reliable: TrustworthinessCharacteristicSchema.optional(),
  /** Safe: minimizes harm and risk */
  safe: TrustworthinessCharacteristicSchema.optional(),
  /** Secure: protected against threats */
  secure: TrustworthinessCharacteristicSchema.optional(),
  /** Accountable: clear responsibility and oversight */
  accountable: TrustworthinessCharacteristicSchema.optional(),
  /** Transparent: understandable and open about limitations */
  transparent: TrustworthinessCharacteristicSchema.optional(),
  /** Explainable: decisions can be understood */
  explainable: TrustworthinessCharacteristicSchema.optional(),
  /** Privacy-enhanced: protects personal information */
  privacyEnhanced: TrustworthinessCharacteristicSchema.optional(),
  /** Fair: avoids bias and discrimination */
  fair: TrustworthinessCharacteristicSchema.optional(),
});

export type Trustworthiness = z.infer<typeof TrustworthinessSchema>;

// ─────────────────────────────────────────────────────────────────
// CLASSIFICATION SCHEMA
// ─────────────────────────────────────────────────────────────────

export const ClassificationSchema = z.object({
  /** Primary AIGRC risk level */
  riskLevel: z.enum(["minimal", "limited", "high", "unacceptable"]),
  /** Risk factors that influenced the classification */
  riskFactors: RiskFactorsSchema,
  /** EU AI Act specific classification (legacy, prefer jurisdictions) */
  euAiAct: z
    .object({
      category: z.string(),
      transparencyRequired: z.boolean().default(false),
    })
    .optional(),
  /** Required artifacts based on classification */
  requiredArtifacts: z
    .array(
      z.object({
        type: z.string(),
        status: z.enum(["pending", "complete", "not_applicable"]),
        path: z.string().optional(),
      })
    )
    .optional(),
  /** Per-jurisdiction classifications for multi-jurisdiction compliance */
  jurisdictions: z.array(JurisdictionClassificationSchema).optional(),
  /** NIST AI RMF trustworthiness characteristics */
  trustworthiness: TrustworthinessSchema.optional(),
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
// RISK LEVEL SCHEMA (for runtime governance)
// ─────────────────────────────────────────────────────────────────

export const RiskLevelSchema = z.enum(["minimal", "limited", "high", "unacceptable"]);
export type RiskLevel = z.infer<typeof RiskLevelSchema>;

// ─────────────────────────────────────────────────────────────────
// GOLDEN THREAD SCHEMA (SPEC-PRT-001)
// Cryptographic linking from runtime to business authorization
// ─────────────────────────────────────────────────────────────────

export const GoldenThreadSchema = z.object({
  /** Ticket ID from approval system (e.g., "FIN-1234") */
  ticket_id: z.string().min(1),
  /** Email of approver (e.g., "ciso@corp.com") */
  approved_by: z.string().email(),
  /** ISO 8601 timestamp of approval (e.g., "2025-01-15T10:30:00Z") */
  approved_at: z.string().datetime(),
  /** SHA-256 hash of canonical string: sha256:{64 hex chars} */
  hash: z.string().regex(/^sha256:[a-f0-9]{64}$/).optional(),
  /** Optional cryptographic signature: {ALGORITHM}:{BASE64_SIGNATURE} */
  signature: z.string().regex(/^(RSA-SHA256|ECDSA-P256):[A-Za-z0-9+/=]+$/).optional(),
});

export type GoldenThread = z.infer<typeof GoldenThreadSchema>;

// ─────────────────────────────────────────────────────────────────
// LINEAGE SCHEMA (SPEC-RT-002: Agent Hierarchy)
// Tracks parent-child relationships for spawned agents
// ─────────────────────────────────────────────────────────────────

export const LineageSchema = z.object({
  /** Parent agent's instance_id, null for root agents */
  parent_instance_id: z.string().uuid().nullable(),
  /** Depth in spawn tree: 0 for root, 1 for first child, etc. */
  generation_depth: z.number().int().min(0),
  /** Chain of ancestor instance_ids from root to parent */
  ancestor_chain: z.array(z.string().uuid()),
  /** When this agent was spawned */
  spawned_at: z.string().datetime(),
  /** Root agent's instance_id for tracing entire tree */
  root_instance_id: z.string().uuid(),
});

export type Lineage = z.infer<typeof LineageSchema>;

// ─────────────────────────────────────────────────────────────────
// CAPABILITIES MANIFEST SCHEMA (SPEC-RT-002)
// Defines what actions/resources an agent is allowed
// ─────────────────────────────────────────────────────────────────

export const CapabilitiesManifestSchema = z.object({
  /** List of allowed tool/action identifiers (supports wildcards: *, prefix_*) */
  allowed_tools: z.array(z.string()).default([]),
  /** List of explicitly denied tools (takes precedence over allowed) */
  denied_tools: z.array(z.string()).default([]),
  /** Allowed domain patterns (regex) for external resources */
  allowed_domains: z.array(z.string()).default([]),
  /** Denied domain patterns (takes precedence over allowed) */
  denied_domains: z.array(z.string()).default([]),
  /** Maximum cost per session in USD */
  max_cost_per_session: z.number().positive().nullable().optional(),
  /** Maximum cost per day in USD */
  max_cost_per_day: z.number().positive().nullable().optional(),
  /** Maximum tokens per single API call */
  max_tokens_per_call: z.number().int().positive().nullable().optional(),
  /** Whether this agent can spawn child agents */
  may_spawn_children: z.boolean().default(false),
  /** Maximum depth of child agent spawning (0 = cannot spawn) */
  max_child_depth: z.number().int().min(0).default(0),
  /** Capability decay mode for children: decay, explicit, inherit */
  capability_mode: z.enum(["decay", "explicit", "inherit"]).default("decay"),
  /** Custom extension fields */
  custom: z.record(z.unknown()).optional(),
});

export type CapabilitiesManifest = z.infer<typeof CapabilitiesManifestSchema>;

// ─────────────────────────────────────────────────────────────────
// OPERATING MODE SCHEMA (SPEC-RT-002)
// ─────────────────────────────────────────────────────────────────

export const OperatingModeSchema = z.enum(["NORMAL", "SANDBOX", "RESTRICTED"]);
export type OperatingMode = z.infer<typeof OperatingModeSchema>;

// ─────────────────────────────────────────────────────────────────
// RUNTIME IDENTITY SCHEMA (SPEC-RT-002)
// Cryptographic identity established at agent startup
// ─────────────────────────────────────────────────────────────────

export const RuntimeIdentitySchema = z.object({
  /** Unique UUIDv4 for this runtime instance */
  instance_id: z.string().uuid(),
  /** Asset ID from the Asset Card (e.g., "aigrc-2024-a1b2c3d4") */
  asset_id: z.string().regex(/^aigrc-\d{4}-[a-f0-9]{8}$/),
  /** Human-readable name from Asset Card */
  asset_name: z.string().min(1).max(100),
  /** Semantic version from Asset Card */
  asset_version: z.string().regex(/^\d+\.\d+\.\d+/),
  /** SHA-256 hash of Golden Thread data */
  golden_thread_hash: z.string().regex(/^sha256:[a-f0-9]{64}$/),
  /** Full Golden Thread authorization data */
  golden_thread: GoldenThreadSchema,
  /** Risk level from classification */
  risk_level: RiskLevelSchema,
  /** Agent lineage for spawned agents */
  lineage: LineageSchema,
  /** Capabilities manifest defining permissions */
  capabilities_manifest: CapabilitiesManifestSchema,
  /** When this identity was created */
  created_at: z.string().datetime(),
  /** Whether Golden Thread hash has been verified */
  verified: z.boolean().default(false),
  /** Current operating mode */
  mode: OperatingModeSchema.default("NORMAL"),
});

export type RuntimeIdentity = z.infer<typeof RuntimeIdentitySchema>;

// ─────────────────────────────────────────────────────────────────
// KILL SWITCH COMMAND SCHEMA (SPEC-RT-005)
// Remote termination command structure
// ─────────────────────────────────────────────────────────────────

export const KillSwitchCommandTypeSchema = z.enum(["TERMINATE", "PAUSE", "RESUME"]);
export type KillSwitchCommandType = z.infer<typeof KillSwitchCommandTypeSchema>;

export const KillSwitchCommandSchema = z.object({
  /** Unique command ID for idempotency and replay prevention */
  command_id: z.string().uuid(),
  /** Type of command */
  type: KillSwitchCommandTypeSchema,
  /** Target instance_id (optional, for specific instance) */
  instance_id: z.string().uuid().optional(),
  /** Target asset_id (optional, for all instances of an asset) */
  asset_id: z.string().regex(/^aigrc-\d{4}-[a-f0-9]{8}$/).optional(),
  /** Target organization (optional, for org-wide kill) */
  organization: z.string().optional(),
  /** Cryptographic signature for verification */
  signature: z.string(),
  /** ISO 8601 timestamp for replay prevention */
  timestamp: z.string().datetime(),
  /** Human-readable reason for audit trail */
  reason: z.string().max(500),
  /** Issuer of the command (email or system ID) */
  issued_by: z.string(),
});

export type KillSwitchCommand = z.infer<typeof KillSwitchCommandSchema>;

// ─────────────────────────────────────────────────────────────────
// GOVERNANCE TOKEN PAYLOAD SCHEMA (SPEC-PRT-003: A2A)
// JWT payload for agent-to-agent mutual authentication
// ─────────────────────────────────────────────────────────────────

export const GovernanceTokenIdentityClaimsSchema = z.object({
  instance_id: z.string().uuid(),
  asset_id: z.string(),
  asset_name: z.string(),
  asset_version: z.string(),
});

export const GovernanceTokenGovernanceClaimsSchema = z.object({
  risk_level: RiskLevelSchema,
  golden_thread: z.object({
    hash: z.string().regex(/^sha256:[a-f0-9]{64}$/),
    verified: z.boolean(),
    ticket_id: z.string(),
  }),
  mode: OperatingModeSchema,
});

export const GovernanceTokenControlClaimsSchema = z.object({
  kill_switch: z.object({
    enabled: z.boolean(),
    channel: z.enum(["sse", "polling", "file"]),
  }),
  paused: z.boolean(),
  termination_pending: z.boolean(),
});

export const GovernanceTokenCapabilityClaimsSchema = z.object({
  hash: z.string(),
  tools: z.array(z.string()),
  max_budget_usd: z.number().nullable(),
  can_spawn: z.boolean(),
  max_child_depth: z.number().int().min(0),
});

export const GovernanceTokenLineageClaimsSchema = z.object({
  generation_depth: z.number().int().min(0),
  parent_instance_id: z.string().uuid().nullable(),
  root_instance_id: z.string().uuid(),
});

export const GovernanceTokenPayloadSchema = z.object({
  // Standard JWT claims
  /** Issuer: "aigos-runtime" */
  iss: z.literal("aigos-runtime"),
  /** Subject: instance_id of the agent */
  sub: z.string().uuid(),
  /** Audience: "aigos-agents" or specific agent */
  aud: z.union([z.string(), z.array(z.string())]),
  /** Expiration timestamp (Unix epoch) */
  exp: z.number().int().positive(),
  /** Issued at timestamp (Unix epoch) */
  iat: z.number().int().positive(),
  /** Not before timestamp (Unix epoch) */
  nbf: z.number().int().positive(),
  /** Unique JWT ID */
  jti: z.string().uuid(),

  // AIGOS-specific claims
  aigos: z.object({
    identity: GovernanceTokenIdentityClaimsSchema,
    governance: GovernanceTokenGovernanceClaimsSchema,
    control: GovernanceTokenControlClaimsSchema,
    capabilities: GovernanceTokenCapabilityClaimsSchema,
    lineage: GovernanceTokenLineageClaimsSchema,
  }),
});

export type GovernanceTokenPayload = z.infer<typeof GovernanceTokenPayloadSchema>;
export type GovernanceTokenIdentityClaims = z.infer<typeof GovernanceTokenIdentityClaimsSchema>;
export type GovernanceTokenGovernanceClaims = z.infer<typeof GovernanceTokenGovernanceClaimsSchema>;
export type GovernanceTokenControlClaims = z.infer<typeof GovernanceTokenControlClaimsSchema>;
export type GovernanceTokenCapabilityClaims = z.infer<typeof GovernanceTokenCapabilityClaimsSchema>;
export type GovernanceTokenLineageClaims = z.infer<typeof GovernanceTokenLineageClaimsSchema>;

// ─────────────────────────────────────────────────────────────────
// ASSET CARD RUNTIME EXTENSION (SPEC-FMT-002)
// Optional runtime section for Asset Cards
// ─────────────────────────────────────────────────────────────────

export const AssetCardRuntimeSchema = z.object({
  /** Path to policy file for this asset */
  policy_path: z.string().optional(),
  /** Behavior when Golden Thread verification fails */
  verification_failure_mode: z.enum(["SANDBOX", "FAIL"]).default("SANDBOX"),
  /** Whether telemetry is enabled for this asset */
  telemetry_enabled: z.boolean().default(true),
  /** Kill switch configuration */
  kill_switch: z.object({
    enabled: z.boolean().default(true),
    channel: z.enum(["sse", "polling", "file"]).default("sse"),
    endpoint: z.string().url().optional(),
  }).optional(),
});

export type AssetCardRuntime = z.infer<typeof AssetCardRuntimeSchema>;

// ─────────────────────────────────────────────────────────────────
// POLICY FILE SCHEMA (SPEC-RT-003)
// Defines runtime governance policies for AI agents
// ─────────────────────────────────────────────────────────────────

export const PolicyRuleEffectSchema = z.enum(["allow", "deny", "audit"]);
export type PolicyRuleEffect = z.infer<typeof PolicyRuleEffectSchema>;

export const PolicyRuleSchema = z.object({
  /** Unique identifier for this rule */
  id: z.string().min(1),
  /** Human-readable description */
  description: z.string().optional(),
  /** Effect when rule matches: allow, deny, or audit */
  effect: PolicyRuleEffectSchema,
  /** Actions/tools this rule applies to (supports wildcards) */
  actions: z.array(z.string()).default(["*"]),
  /** Resources/domains this rule applies to (supports patterns) */
  resources: z.array(z.string()).default(["*"]),
  /** Conditions that must be true for rule to apply */
  conditions: z.object({
    /** Required risk levels for this rule to apply */
    risk_levels: z.array(RiskLevelSchema).optional(),
    /** Required operating modes */
    modes: z.array(OperatingModeSchema).optional(),
    /** Time-based conditions (ISO 8601 time ranges) */
    time_ranges: z.array(z.object({
      start: z.string(),
      end: z.string(),
    })).optional(),
    /** Custom condition expressions */
    custom: z.record(z.unknown()).optional(),
  }).optional(),
  /** Priority for rule ordering (higher = evaluated first) */
  priority: z.number().int().default(0),
});

export type PolicyRule = z.infer<typeof PolicyRuleSchema>;

export const PolicyCapabilitiesSchema = z.object({
  /** Default effect when no rule matches */
  default_effect: PolicyRuleEffectSchema.default("deny"),
  /** Allowed tools (supports wildcards: *, prefix_*) */
  allowed_tools: z.array(z.string()).default([]),
  /** Denied tools (takes precedence) */
  denied_tools: z.array(z.string()).default([]),
  /** Allowed domain patterns */
  allowed_domains: z.array(z.string()).default([]),
  /** Denied domain patterns */
  denied_domains: z.array(z.string()).default([]),
  /** Maximum budget per session in USD */
  max_budget_per_session: z.number().positive().nullable().optional(),
  /** Maximum budget per day in USD */
  max_budget_per_day: z.number().positive().nullable().optional(),
  /** Whether agent can spawn children */
  may_spawn: z.boolean().default(false),
  /** Maximum spawn depth */
  max_spawn_depth: z.number().int().min(0).default(0),
});

export type PolicyCapabilities = z.infer<typeof PolicyCapabilitiesSchema>;

export const PolicyFileSchema = z.object({
  /** Schema version for forward compatibility */
  version: z.literal("1.0"),
  /** Unique policy identifier */
  id: z.string().min(1),
  /** Human-readable name */
  name: z.string().min(1).max(100),
  /** Description of this policy */
  description: z.string().max(500).optional(),
  /** Parent policy to inherit from */
  extends: z.string().optional(),
  /** Target asset IDs or patterns this policy applies to */
  applies_to: z.array(z.string()).default(["*"]),
  /** Default capabilities when no rules match */
  capabilities: PolicyCapabilitiesSchema.optional(),
  /** Ordered list of policy rules */
  rules: z.array(PolicyRuleSchema).default([]),
  /** Metadata */
  metadata: z.object({
    created_at: z.string().datetime().optional(),
    updated_at: z.string().datetime().optional(),
    created_by: z.string().optional(),
    tags: z.array(z.string()).optional(),
  }).optional(),
});

export type PolicyFile = z.infer<typeof PolicyFileSchema>;

// ─────────────────────────────────────────────────────────────────
// AIGRC CONFIGURATION SCHEMA (.aigrc.yaml)
// Root configuration file for AIGRC projects
// ─────────────────────────────────────────────────────────────────

export const AigrcRuntimeConfigSchema = z.object({
  /** Default policy file path */
  default_policy: z.string().optional(),
  /** Policy search paths */
  policy_paths: z.array(z.string()).default([".aigrc/policies"]),
  /** Asset card search paths */
  asset_paths: z.array(z.string()).default([".aigrc/assets"]),
  /** Default verification failure mode */
  verification_failure_mode: z.enum(["SANDBOX", "FAIL"]).default("SANDBOX"),
  /** Telemetry configuration */
  telemetry: z.object({
    enabled: z.boolean().default(true),
    endpoint: z.string().url().optional(),
    sample_rate: z.number().min(0).max(1).default(1.0),
  }).optional(),
  /** Kill switch configuration */
  kill_switch: z.object({
    enabled: z.boolean().default(true),
    channel: z.enum(["sse", "polling", "file"]).default("sse"),
    endpoint: z.string().url().optional(),
    poll_interval_ms: z.number().int().positive().default(5000),
  }).optional(),
});

export type AigrcRuntimeConfig = z.infer<typeof AigrcRuntimeConfigSchema>;

export const AigrcIntegrationsConfigSchema = z.object({
  /** JIRA integration */
  jira: z.object({
    enabled: z.boolean().default(false),
    url: z.string().url().optional(),
    project_key: z.string().optional(),
  }).optional(),
  /** Azure DevOps integration */
  azure_devops: z.object({
    enabled: z.boolean().default(false),
    organization: z.string().optional(),
    project: z.string().optional(),
  }).optional(),
  /** GitHub integration */
  github: z.object({
    enabled: z.boolean().default(false),
    owner: z.string().optional(),
    repo: z.string().optional(),
  }).optional(),
});

export type AigrcIntegrationsConfig = z.infer<typeof AigrcIntegrationsConfigSchema>;

export const AigrcConfigSchema = z.object({
  /** Schema version */
  version: z.literal("1.0"),
  /** Project name */
  name: z.string().min(1).max(100).optional(),
  /** Project description */
  description: z.string().max(500).optional(),
  /** Runtime governance configuration */
  runtime: AigrcRuntimeConfigSchema.optional(),
  /** External integrations */
  integrations: AigrcIntegrationsConfigSchema.optional(),
  /** Environment-specific overrides */
  environments: z.record(z.object({
    runtime: AigrcRuntimeConfigSchema.partial().optional(),
    integrations: AigrcIntegrationsConfigSchema.partial().optional(),
  })).optional(),
});

export type AigrcConfig = z.infer<typeof AigrcConfigSchema>;

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
  /** Golden Thread authorization data (SPEC-PRT-001) */
  golden_thread: GoldenThreadSchema.optional(),
  /** Runtime governance configuration (SPEC-RT) */
  runtime: AssetCardRuntimeSchema.optional(),
});

export type AssetCard = z.infer<typeof AssetCardSchema>;