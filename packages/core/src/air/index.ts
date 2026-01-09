/**
 * AIGRC Intermediate Representation (AIR)
 *
 * The AIR is a JSON/YAML schema that represents compiled policy constraints
 * in a format consumable by enforcement endpoints. It is the output of the
 * Policy Compiler and the input to the Supply Chain Firewall.
 *
 * @see I2E_Engine_Specification_v1.md Section 4.2.2
 * @module @aigrc/core/air
 */

import { z } from "zod";

// ─────────────────────────────────────────────────────────────────
// VENDOR SCHEMA
// Defines an approved/blocked AI vendor
// ─────────────────────────────────────────────────────────────────

export const AIRVendorSchema = z.object({
  /** Vendor identifier (e.g., "openai", "anthropic", "google") */
  id: z.string().min(1),
  /** Human-readable vendor name */
  name: z.string().optional(),
  /** Status of this vendor */
  status: z.enum(["approved", "pending", "blocked"]).default("pending"),
  /** Optional approval ticket ID (Golden Thread) */
  approval_ticket: z.string().optional(),
  /** When approval was granted */
  approved_at: z.string().datetime().optional(),
  /** Who approved this vendor */
  approved_by: z.string().email().optional(),
  /** Expiration date for approval */
  expires_at: z.string().datetime().optional(),
  /** Vendor-specific notes */
  notes: z.string().optional(),
});

export type AIRVendor = z.infer<typeof AIRVendorSchema>;

// ─────────────────────────────────────────────────────────────────
// MODEL SCHEMA
// Defines an approved/blocked AI model
// ─────────────────────────────────────────────────────────────────

export const AIRModelSchema = z.object({
  /** Model identifier (e.g., "gpt-4", "claude-3-opus") */
  id: z.string().min(1),
  /** Vendor that provides this model */
  vendor_id: z.string().min(1),
  /** Human-readable model name */
  name: z.string().optional(),
  /** Model version pattern (supports wildcards like "gpt-4*") */
  version_pattern: z.string().optional(),
  /** Status of this model */
  status: z.enum(["approved", "pending", "blocked"]).default("pending"),
  /** Maximum allowed parameters (for on-premise deployment considerations) */
  max_parameters: z.number().positive().optional(),
  /** Risk level assigned to this model */
  risk_level: z.enum(["minimal", "limited", "high", "unacceptable"]).optional(),
  /** Optional approval ticket ID */
  approval_ticket: z.string().optional(),
  /** When approval was granted */
  approved_at: z.string().datetime().optional(),
  /** Expiration date for approval */
  expires_at: z.string().datetime().optional(),
  /** Model-specific notes */
  notes: z.string().optional(),
});

export type AIRModel = z.infer<typeof AIRModelSchema>;

// ─────────────────────────────────────────────────────────────────
// REGION SCHEMA
// Defines allowed/blocked deployment regions
// ─────────────────────────────────────────────────────────────────

export const AIRRegionSchema = z.object({
  /** Region code (e.g., "us-east-1", "eu-west-1", "EU", "US") */
  code: z.string().min(1),
  /** Human-readable region name */
  name: z.string().optional(),
  /** Status of this region */
  status: z.enum(["allowed", "restricted", "blocked"]).default("allowed"),
  /** Jurisdictions this region falls under (e.g., ["GDPR", "EU-AI-ACT"]) */
  jurisdictions: z.array(z.string()).default([]),
  /** Data residency requirements */
  data_residency: z.enum(["required", "preferred", "none"]).default("none"),
  /** Notes about this region */
  notes: z.string().optional(),
});

export type AIRRegion = z.infer<typeof AIRRegionSchema>;

// ─────────────────────────────────────────────────────────────────
// REGISTRY CONSTRAINTS SCHEMA
// Controls vendor/model/region governance at procurement time
// ─────────────────────────────────────────────────────────────────

export const AIRRegistryConstraintsSchema = z.object({
  /** List of approved vendors */
  allowed_vendors: z.array(AIRVendorSchema).default([]),
  /** List of blocked vendors */
  blocked_vendors: z.array(z.string()).default([]),
  /** List of approved regions */
  allowed_regions: z.array(AIRRegionSchema).default([]),
  /** List of blocked regions */
  blocked_regions: z.array(z.string()).default([]),
  /** List of approved models */
  allowed_models: z.array(AIRModelSchema).default([]),
  /** List of blocked models (patterns supported) */
  blocked_models: z.array(z.string()).default([]),
  /** Maximum model parameters allowed */
  max_model_parameters: z.number().positive().optional(),
  /** Require vendor approval before use */
  require_vendor_approval: z.boolean().default(true),
  /** Require model approval before use */
  require_model_approval: z.boolean().default(true),
  /** Default behavior for unknown vendors: "block" or "request_approval" */
  unknown_vendor_behavior: z.enum(["block", "request_approval"]).default("request_approval"),
  /** Default behavior for unknown models */
  unknown_model_behavior: z.enum(["block", "request_approval"]).default("request_approval"),
});

export type AIRRegistryConstraints = z.infer<typeof AIRRegistryConstraintsSchema>;

// ─────────────────────────────────────────────────────────────────
// RUNTIME CONSTRAINTS SCHEMA
// Controls runtime behavior of AI systems
// ─────────────────────────────────────────────────────────────────

export const AIRPIIFilterConfigSchema = z.object({
  /** Whether PII filtering is enabled */
  enabled: z.boolean().default(false),
  /** PII types to filter (e.g., ["email", "phone", "ssn", "credit_card"]) */
  filter_types: z.array(z.string()).default([]),
  /** Action when PII is detected: "redact", "block", "warn", "audit" */
  action: z.enum(["redact", "block", "warn", "audit"]).default("warn"),
  /** Custom patterns to detect (regex) */
  custom_patterns: z.array(z.object({
    name: z.string(),
    pattern: z.string(),
    action: z.enum(["redact", "block", "warn", "audit"]).optional(),
  })).default([]),
});

export type AIRPIIFilterConfig = z.infer<typeof AIRPIIFilterConfigSchema>;

export const AIRToxicityFilterConfigSchema = z.object({
  /** Whether toxicity filtering is enabled */
  enabled: z.boolean().default(false),
  /** Toxicity threshold (0-1) */
  threshold: z.number().min(0).max(1).default(0.7),
  /** Categories to filter (e.g., ["hate", "violence", "sexual"]) */
  categories: z.array(z.string()).default([]),
  /** Action when toxicity is detected */
  action: z.enum(["block", "warn", "audit"]).default("warn"),
});

export type AIRToxicityFilterConfig = z.infer<typeof AIRToxicityFilterConfigSchema>;

export const AIRRuntimeConstraintsSchema = z.object({
  /** PII filtering configuration */
  pii_filter: AIRPIIFilterConfigSchema.optional(),
  /** Toxicity filtering configuration */
  toxicity_filter: AIRToxicityFilterConfigSchema.optional(),
  /** Data retention period in days (0 = no retention) */
  data_retention_days: z.number().int().min(0).default(90),
  /** Whether to enable output watermarking */
  watermark_enabled: z.boolean().default(false),
  /** Logging level: "none", "errors", "all" */
  logging_level: z.enum(["none", "errors", "all"]).default("all"),
  /** Maximum tokens per request */
  max_tokens_per_request: z.number().int().positive().optional(),
  /** Maximum requests per minute */
  max_requests_per_minute: z.number().int().positive().optional(),
  /** Maximum cost per request in USD */
  max_cost_per_request_usd: z.number().positive().optional(),
  /** Maximum cost per day in USD */
  max_cost_per_day_usd: z.number().positive().optional(),
  /** Session timeout in seconds */
  session_timeout_seconds: z.number().int().positive().optional(),
  /** Require human approval for specific actions */
  human_approval_required: z.array(z.string()).default([]),
  /** Kill switch configuration */
  kill_switch: z.object({
    enabled: z.boolean().default(true),
    channel: z.enum(["sse", "polling", "file"]).default("sse"),
    poll_interval_ms: z.number().int().positive().default(5000),
  }).optional(),
  /** Grounding check configuration (prevent hallucination) */
  grounding_check: z.object({
    enabled: z.boolean().default(false),
    confidence_threshold: z.number().min(0).max(1).default(0.8),
    action: z.enum(["block", "warn", "audit"]).default("warn"),
  }).optional(),
});

export type AIRRuntimeConstraints = z.infer<typeof AIRRuntimeConstraintsSchema>;

// ─────────────────────────────────────────────────────────────────
// BUILD CONSTRAINTS SCHEMA
// Controls CI/CD and build-time governance
// ─────────────────────────────────────────────────────────────────

export const AIRBuildConstraintsSchema = z.object({
  /** Require Golden Thread linkage (business justification) */
  require_golden_thread: z.boolean().default(true),
  /** Require asset card for all AI assets */
  require_asset_card: z.boolean().default(true),
  /** Require risk classification */
  require_risk_classification: z.boolean().default(true),
  /** Require model card documentation */
  require_model_card: z.boolean().default(false),
  /** Require security review for high-risk assets */
  require_security_review: z.boolean().default(false),
  /** Minimum risk levels that require security review */
  security_review_risk_levels: z.array(z.enum(["high", "unacceptable"])).default(["high", "unacceptable"]),
  /** Require governance.lock file */
  require_governance_lock: z.boolean().default(true),
  /** governance.lock must be signed */
  require_lock_signature: z.boolean().default(false),
  /** Block merge on validation failure */
  block_on_failure: z.boolean().default(true),
  /** Generate SARIF report for GitHub Security tab */
  generate_sarif: z.boolean().default(true),
  /** Required approvals before deployment */
  required_approvals: z.array(z.object({
    role: z.string(),
    count: z.number().int().positive().default(1),
  })).default([]),
  /** Allowed deployment environments */
  allowed_environments: z.array(z.string()).default(["development", "staging", "production"]),
  /** Environment-specific constraints */
  environment_constraints: z.record(z.object({
    require_approval: z.boolean().default(false),
    approvers: z.array(z.string()).default([]),
    require_testing: z.boolean().default(false),
    test_coverage_threshold: z.number().min(0).max(100).optional(),
  })).optional(),
});

export type AIRBuildConstraints = z.infer<typeof AIRBuildConstraintsSchema>;

// ─────────────────────────────────────────────────────────────────
// POLICY SOURCE SCHEMA
// References to source policy documents
// ─────────────────────────────────────────────────────────────────

export const AIRPolicySourceSchema = z.object({
  /** Unique identifier for this source */
  id: z.string().min(1),
  /** Type of source: "pdf", "url", "confluence", "jira", "manual" */
  type: z.enum(["pdf", "url", "confluence", "jira", "manual"]),
  /** URI to the source document */
  uri: z.string(),
  /** SHA-256 hash of the source content */
  content_hash: z.string().regex(/^sha256:[a-f0-9]{64}$/),
  /** When the source was last fetched */
  fetched_at: z.string().datetime(),
  /** Title of the policy document */
  title: z.string().optional(),
  /** Version of the policy document */
  version: z.string().optional(),
  /** Confidence score of extraction (0-1) */
  extraction_confidence: z.number().min(0).max(1).optional(),
});

export type AIRPolicySource = z.infer<typeof AIRPolicySourceSchema>;

// ─────────────────────────────────────────────────────────────────
// AIR METADATA SCHEMA
// Metadata about the AIR compilation
// ─────────────────────────────────────────────────────────────────

export const AIRMetadataSchema = z.object({
  /** When this AIR was generated */
  generated_at: z.string().datetime(),
  /** Tool/system that generated this AIR */
  generated_by: z.string().default("aigrc-policy-compiler"),
  /** Version of the policy compiler */
  compiler_version: z.string(),
  /** Organization this AIR belongs to */
  organization: z.string().optional(),
  /** Environment this AIR is for (e.g., "production", "staging") */
  environment: z.string().optional(),
  /** Human-readable description */
  description: z.string().optional(),
  /** Tags for categorization */
  tags: z.array(z.string()).default([]),
  /** Custom metadata fields */
  custom: z.record(z.unknown()).optional(),
});

export type AIRMetadata = z.infer<typeof AIRMetadataSchema>;

// ─────────────────────────────────────────────────────────────────
// AIGRC INTERMEDIATE REPRESENTATION (AIR) SCHEMA
// The complete AIR document format
// ─────────────────────────────────────────────────────────────────

export const AIRSchema = z.object({
  /** Schema version for forward compatibility */
  version: z.literal("1.0"),
  /** Unique identifier for this AIR */
  id: z.string().uuid(),
  /** Human-readable name */
  name: z.string().min(1).max(200),
  /** SHA-256 hash of this AIR (computed after serialization) */
  hash: z.string().regex(/^sha256:[a-f0-9]{64}$/).optional(),
  /** Policy sources that contributed to this AIR */
  policy_sources: z.array(AIRPolicySourceSchema).default([]),
  /** Registry constraints (vendor/model/region governance) */
  registry: AIRRegistryConstraintsSchema.default({}),
  /** Runtime constraints (execution-time governance) */
  runtime: AIRRuntimeConstraintsSchema.default({}),
  /** Build constraints (CI/CD governance) */
  build: AIRBuildConstraintsSchema.default({}),
  /** Metadata about this AIR */
  metadata: AIRMetadataSchema,
  /** When this AIR expires (forces re-compilation) */
  expires_at: z.string().datetime().optional(),
  /** Digital signatures for verification */
  signatures: z.array(z.object({
    /** Signer identity (email or system ID) */
    signer: z.string(),
    /** Algorithm used (RS256, ES256) */
    algorithm: z.enum(["RS256", "ES256"]),
    /** Base64-encoded signature */
    signature: z.string(),
    /** When the signature was created */
    signed_at: z.string().datetime(),
    /** Key ID for verification */
    key_id: z.string().optional(),
  })).default([]),
});

export type AIR = z.infer<typeof AIRSchema>;

// ─────────────────────────────────────────────────────────────────
// HELPER FUNCTIONS
// ─────────────────────────────────────────────────────────────────

/**
 * Creates an empty AIR with default values
 */
export function createEmptyAIR(name: string, compilerVersion: string = "1.0.0"): AIR {
  return {
    version: "1.0",
    id: crypto.randomUUID(),
    name,
    policy_sources: [],
    registry: {
      allowed_vendors: [],
      blocked_vendors: [],
      allowed_regions: [],
      blocked_regions: [],
      allowed_models: [],
      blocked_models: [],
      require_vendor_approval: true,
      require_model_approval: true,
      unknown_vendor_behavior: "request_approval",
      unknown_model_behavior: "request_approval",
    },
    runtime: {
      data_retention_days: 90,
      watermark_enabled: false,
      logging_level: "all",
      human_approval_required: [],
    },
    build: {
      require_golden_thread: true,
      require_asset_card: true,
      require_risk_classification: true,
      require_model_card: false,
      require_security_review: false,
      security_review_risk_levels: ["high", "unacceptable"],
      require_governance_lock: true,
      require_lock_signature: false,
      block_on_failure: true,
      generate_sarif: true,
      required_approvals: [],
      allowed_environments: ["development", "staging", "production"],
    },
    metadata: {
      generated_at: new Date().toISOString(),
      generated_by: "aigrc-policy-compiler",
      compiler_version: compilerVersion,
      tags: [],
    },
    signatures: [],
  };
}

/**
 * Validates an AIR document
 */
export function validateAIR(air: unknown): { valid: boolean; errors: string[] } {
  const result = AIRSchema.safeParse(air);
  if (result.success) {
    return { valid: true, errors: [] };
  }
  return {
    valid: false,
    errors: result.error.errors.map(e => `${e.path.join(".")}: ${e.message}`),
  };
}

/**
 * Checks if a vendor is allowed by registry constraints
 */
export function isVendorAllowed(vendorId: string, registry: AIRRegistryConstraints): {
  allowed: boolean;
  reason: string;
  requiresApproval: boolean;
} {
  // Check blocked list first
  if (registry.blocked_vendors.includes(vendorId)) {
    return { allowed: false, reason: "Vendor is blocked", requiresApproval: false };
  }

  // Check allowed list
  const allowedVendor = registry.allowed_vendors.find(v => v.id === vendorId);
  if (allowedVendor) {
    if (allowedVendor.status === "approved") {
      // Check expiration
      if (allowedVendor.expires_at && new Date(allowedVendor.expires_at) < new Date()) {
        return { allowed: false, reason: "Vendor approval has expired", requiresApproval: true };
      }
      return { allowed: true, reason: "Vendor is approved", requiresApproval: false };
    }
    if (allowedVendor.status === "pending") {
      return { allowed: false, reason: "Vendor approval is pending", requiresApproval: true };
    }
    return { allowed: false, reason: "Vendor is blocked", requiresApproval: false };
  }

  // Unknown vendor
  if (registry.unknown_vendor_behavior === "block") {
    return { allowed: false, reason: "Unknown vendor (blocked by policy)", requiresApproval: false };
  }
  return { allowed: false, reason: "Unknown vendor (requires approval)", requiresApproval: true };
}

/**
 * Checks if a model is allowed by registry constraints
 */
export function isModelAllowed(modelId: string, vendorId: string, registry: AIRRegistryConstraints): {
  allowed: boolean;
  reason: string;
  requiresApproval: boolean;
} {
  // Check blocked models first (supports patterns)
  for (const pattern of registry.blocked_models) {
    if (matchesPattern(modelId, pattern)) {
      return { allowed: false, reason: `Model matches blocked pattern: ${pattern}`, requiresApproval: false };
    }
  }

  // Check allowed models
  const allowedModel = registry.allowed_models.find(m =>
    m.id === modelId && m.vendor_id === vendorId
  );
  if (allowedModel) {
    if (allowedModel.status === "approved") {
      if (allowedModel.expires_at && new Date(allowedModel.expires_at) < new Date()) {
        return { allowed: false, reason: "Model approval has expired", requiresApproval: true };
      }
      return { allowed: true, reason: "Model is approved", requiresApproval: false };
    }
    if (allowedModel.status === "pending") {
      return { allowed: false, reason: "Model approval is pending", requiresApproval: true };
    }
    return { allowed: false, reason: "Model is blocked", requiresApproval: false };
  }

  // Check version patterns for allowed models
  const matchingModel = registry.allowed_models.find(m =>
    m.vendor_id === vendorId &&
    m.version_pattern &&
    matchesPattern(modelId, m.version_pattern)
  );
  if (matchingModel && matchingModel.status === "approved") {
    return { allowed: true, reason: `Model matches approved pattern: ${matchingModel.version_pattern}`, requiresApproval: false };
  }

  // Unknown model
  if (registry.unknown_model_behavior === "block") {
    return { allowed: false, reason: "Unknown model (blocked by policy)", requiresApproval: false };
  }
  return { allowed: false, reason: "Unknown model (requires approval)", requiresApproval: true };
}

/**
 * Checks if a region is allowed by registry constraints
 */
export function isRegionAllowed(regionCode: string, registry: AIRRegistryConstraints): {
  allowed: boolean;
  reason: string;
  dataResidency: "required" | "preferred" | "none";
} {
  // Check blocked regions first
  if (registry.blocked_regions.includes(regionCode)) {
    return { allowed: false, reason: "Region is blocked", dataResidency: "none" };
  }

  // Check allowed regions
  const allowedRegion = registry.allowed_regions.find(r => r.code === regionCode);
  if (allowedRegion) {
    if (allowedRegion.status === "blocked") {
      return { allowed: false, reason: "Region is blocked", dataResidency: "none" };
    }
    if (allowedRegion.status === "restricted") {
      return { allowed: true, reason: "Region is restricted (requires approval)", dataResidency: allowedRegion.data_residency };
    }
    return { allowed: true, reason: "Region is allowed", dataResidency: allowedRegion.data_residency };
  }

  // If no regions are explicitly allowed, allow all (except blocked)
  if (registry.allowed_regions.length === 0) {
    return { allowed: true, reason: "No region restrictions", dataResidency: "none" };
  }

  // Region not in allowed list
  return { allowed: false, reason: "Region not in allowed list", dataResidency: "none" };
}

/**
 * Simple pattern matching (supports wildcards)
 */
function matchesPattern(value: string, pattern: string): boolean {
  if (pattern === "*") {
    return true;
  }
  if (pattern.endsWith("*")) {
    return value.startsWith(pattern.slice(0, -1));
  }
  if (pattern.startsWith("*")) {
    return value.endsWith(pattern.slice(1));
  }
  return value === pattern;
}

