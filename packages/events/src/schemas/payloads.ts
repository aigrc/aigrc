import { z } from "zod";

// ─────────────────────────────────────────────────────────────────
// ASSET EVENT PAYLOAD (§5.1)
// ─────────────────────────────────────────────────────────────────

export const FieldChangeSchema = z.object({
  /** Dot-notation path to the changed field */
  field: z.string().min(1),
  /** Previous value */
  previous: z.unknown(),
  /** New value */
  current: z.unknown(),
  /** Who made the change */
  changedBy: z.string().min(1),
});
export type FieldChange = z.infer<typeof FieldChangeSchema>;

export const AssetEventPayloadSchema = z.object({
  /** Asset Card ID */
  cardId: z.string().min(1),
  /** Semantic version of the Asset Card */
  cardVersion: z.string().min(1),
  /** Type of AI asset */
  assetType: z.enum(["model", "agent", "pipeline", "tool", "swarm"]),
  /** AIGRC risk level */
  riskLevel: z.enum(["minimal", "limited", "high", "unacceptable"]),
  /** AI framework (e.g., "langchain", "openai", "anthropic") */
  framework: z.string().optional(),
  /** Conformance level if evaluated */
  conformanceLevel: z.enum(["bronze", "silver", "gold", "platinum"]).optional(),
  /** Field changes for .updated events only */
  changes: z.array(FieldChangeSchema).optional(),
});
export type AssetEventPayload = z.infer<typeof AssetEventPayloadSchema>;

// ─────────────────────────────────────────────────────────────────
// SCAN EVENT PAYLOAD (§5.2)
// ─────────────────────────────────────────────────────────────────

export const ScanFindingSchema = z.object({
  /** File path relative to repo root */
  file: z.string().min(1),
  /** Line number of the finding */
  line: z.number().int().min(1),
  /** AI framework identified */
  framework: z.string().min(1),
  /** Detection pattern matched */
  pattern: z.string().min(1),
  /** Confidence score 0.0 to 1.0 */
  confidence: z.number().min(0).max(1),
  /** Whether this asset has a registered Asset Card */
  governed: z.boolean(),
});
export type ScanFinding = z.infer<typeof ScanFindingSchema>;

export const ScanEventPayloadSchema = z.object({
  /** Unique scan identifier */
  scanId: z.string().min(1),
  /** What triggered the scan */
  trigger: z.enum(["manual", "file-save", "commit", "pr", "scheduled"]),
  /** Repository name or path */
  repository: z.string().optional(),
  /** Git branch name */
  branch: z.string().optional(),
  /** Full 40-character commit SHA */
  commitSha: z.string().optional(),
  /** Total files scanned */
  filesScanned: z.number().int().min(0),
  /** Total findings count */
  findingCount: z.number().int().min(0),
  /** Individual findings (may be omitted for summary events) */
  findings: z.array(ScanFindingSchema).optional(),
  /** Scan duration in milliseconds */
  durationMs: z.number().int().min(0),
});
export type ScanEventPayload = z.infer<typeof ScanEventPayloadSchema>;

// ─────────────────────────────────────────────────────────────────
// CLASSIFICATION EVENT PAYLOAD (§5.3)
// ─────────────────────────────────────────────────────────────────

export const ClassificationFactorSchema = z.object({
  /** Factor name (e.g., "handles-pii", "financial-decision") */
  factor: z.string().min(1),
  /** Factor weight in classification */
  weight: z.number(),
  /** Evidence supporting this factor */
  evidence: z.string().min(1),
});
export type ClassificationFactor = z.infer<typeof ClassificationFactorSchema>;

export const ClassificationEventPayloadSchema = z.object({
  /** Previous risk level (null for first-time classification) */
  previousLevel: z.enum(["minimal", "limited", "high", "unacceptable"]).nullable().optional(),
  /** Current assigned risk level */
  currentLevel: z.enum(["minimal", "limited", "high", "unacceptable"]),
  /** Factors that determined the classification */
  classificationBasis: z.array(ClassificationFactorSchema),
  /** How the classification was determined */
  classifiedBy: z.enum(["automated", "human-review", "human-override"]),
  /** Dispute note for .disputed events */
  disputeNote: z.string().optional(),
});
export type ClassificationEventPayload = z.infer<typeof ClassificationEventPayloadSchema>;

// ─────────────────────────────────────────────────────────────────
// COMPLIANCE EVENT PAYLOAD (§5.4)
// ─────────────────────────────────────────────────────────────────

export const ComplianceGapSchema = z.object({
  /** Policy rule that was not met */
  ruleId: z.string().min(1),
  /** Human-readable rule name */
  ruleName: z.string().min(1),
  /** Severity of the gap */
  severity: z.enum(["blocking", "warning", "informational"]),
  /** Description of what's missing */
  description: z.string().min(1),
  /** Recommended remediation */
  remediation: z.string().min(1),
  /** Evidence of the gap */
  evidence: z.string().optional(),
});
export type ComplianceGap = z.infer<typeof ComplianceGapSchema>;

export const ComplianceEventPayloadSchema = z.object({
  /** ID of the scan.completed event that triggered evaluation */
  scanEventId: z.string().min(1),
  /** Active policy bundle used for evaluation */
  policyBundleId: z.string().min(1),
  /** SHA-256 hash of the policy bundle */
  policyBundleHash: z.string().regex(/^sha256:[a-f0-9]{64}$/),
  /** Target conformance level */
  conformanceTarget: z.enum(["bronze", "silver", "gold", "platinum"]),
  /** Evaluation result */
  result: z.enum(["passed", "failed", "warning"]),
  /** Number of compliance gaps found */
  gapCount: z.number().int().min(0),
  /** Individual gaps (populated for .failed events) */
  gaps: z.array(ComplianceGapSchema).optional(),
});
export type ComplianceEventPayload = z.infer<typeof ComplianceEventPayloadSchema>;

// ─────────────────────────────────────────────────────────────────
// ENFORCEMENT EVENT PAYLOAD (§5.5)
// ─────────────────────────────────────────────────────────────────

export const EnforcementContextSchema = z.object({
  /** Agent instance ID */
  agentId: z.string().min(1),
  /** Tool being invoked */
  tool: z.string().optional(),
  /** Data category involved */
  dataCategory: z.string().optional(),
  /** Target of the action */
  target: z.string().optional(),
  /** Reasoning for the decision */
  reasoning: z.string().optional(),
});
export type EnforcementContext = z.infer<typeof EnforcementContextSchema>;

export const EnforcementEventPayloadSchema = z.object({
  /** Unique decision identifier */
  decisionId: z.string().min(1),
  /** Policy rule that was evaluated */
  ruleId: z.string().min(1),
  /** Human-readable rule name */
  ruleName: z.string().min(1),
  /** Natural language description of the action */
  action: z.string().min(1),
  /** Decision outcome */
  outcome: z.enum(["allow", "deny", "warn", "kill"]),
  /** Decision latency in milliseconds (P99 target: < 2ms) */
  latencyMs: z.number().min(0),
  /** Policy bundle source */
  policySource: z.string().min(1),
  /** Decision confidence 0.0 to 1.0 */
  confidence: z.number().min(0).max(1),
  /** Additional enforcement context */
  context: EnforcementContextSchema.optional(),
});
export type EnforcementEventPayload = z.infer<typeof EnforcementEventPayloadSchema>;

// ─────────────────────────────────────────────────────────────────
// LIFECYCLE EVENT PAYLOAD (§5.6)
// ─────────────────────────────────────────────────────────────────

export const LifecycleEventPayloadSchema = z.object({
  /** Reason for the lifecycle event */
  reason: z.string().min(1),
  /** What triggered the event */
  triggeredBy: z.enum(["platform", "schedule", "manual", "threshold"]),
  /** Human actor if manually triggered */
  actor: z.string().optional(),
  /** Detailed description */
  details: z.string().min(1),
  /** Action taken by the platform */
  actionTaken: z.string().optional(),
  /** ISO 8601 deadline (orphan/decay related) */
  deadline: z.string().datetime().optional(),
  /** Previous lifecycle state */
  previousState: z.string().optional(),
  /** New lifecycle state */
  newState: z.string().optional(),
});
export type LifecycleEventPayload = z.infer<typeof LifecycleEventPayloadSchema>;

// ─────────────────────────────────────────────────────────────────
// POLICY EVENT PAYLOAD (§5.7)
// ─────────────────────────────────────────────────────────────────

export const PolicyEventPayloadSchema = z.object({
  /** Policy identifier */
  policyId: z.string().min(1),
  /** Human-readable policy name */
  policyName: z.string().min(1),
  /** Semantic version of the policy */
  policyVersion: z.string().min(1),
  /** Compiled bundle ID */
  bundleId: z.string().optional(),
  /** SHA-256 hash of the compiled bundle */
  bundleHash: z.string().optional(),
  /** SHA-256 hash of the source policy */
  sourceHash: z.string().optional(),
  /** Number of rules in the policy */
  ruleCount: z.number().int().min(0).optional(),
  /** Number of compilation warnings */
  warningCount: z.number().int().min(0).optional(),
  /** Target asset IDs (empty = all assets) */
  targetAssets: z.array(z.string()).optional(),
  /** ISO 8601 effective date */
  effectiveDate: z.string().datetime().optional(),
  /** ISO 8601 deprecation date */
  deprecationDate: z.string().datetime().optional(),
});
export type PolicyEventPayload = z.infer<typeof PolicyEventPayloadSchema>;

// ─────────────────────────────────────────────────────────────────
// AUDIT EVENT PAYLOAD (§5.8)
// ─────────────────────────────────────────────────────────────────

export const AuditEventPayloadSchema = z.object({
  /** Unique audit identifier */
  auditId: z.string().min(1),
  /** Type of audit operation */
  auditType: z.enum(["compliance-report", "chain-verification", "integrity-check"]),
  /** Report ID (for compliance-report) */
  reportId: z.string().optional(),
  /** Reporting period */
  reportPeriod: z
    .object({
      from: z.string().datetime(),
      to: z.string().datetime(),
    })
    .optional(),
  /** Number of assets covered */
  assetCount: z.number().int().min(0).optional(),
  /** Report format */
  reportFormat: z.enum(["pdf", "json", "csv"]).optional(),
  /** URI to the generated report */
  reportUri: z.string().url().optional(),
  /** First event ID in verified chain */
  chainStartId: z.string().optional(),
  /** Last event ID in verified chain */
  chainEndId: z.string().optional(),
  /** Number of events in the chain */
  eventCount: z.number().int().min(0).optional(),
  /** Merkle root hash */
  merkleRoot: z.string().optional(),
  /** Whether the chain verified successfully */
  verified: z.boolean().optional(),
  /** Event ID where the chain break was detected */
  brokenAt: z.string().optional(),
  /** Reason for the chain break */
  brokenReason: z.string().optional(),
});
export type AuditEventPayload = z.infer<typeof AuditEventPayloadSchema>;
