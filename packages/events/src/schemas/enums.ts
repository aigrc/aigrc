import { z } from "zod";

// ─────────────────────────────────────────────────────────────────
// SOURCE TOOL (§8 — Producer Tools)
// ─────────────────────────────────────────────────────────────────

export const SourceToolSchema = z.enum([
  "cli",
  "vscode",
  "github-action",
  "mcp-server",
  "runtime-sdk",
  "i2e-bridge",
  "i2e-firewall",
  "platform",
]);
export type SourceTool = z.infer<typeof SourceToolSchema>;

// ─────────────────────────────────────────────────────────────────
// EVENT CATEGORY (§5 — Eight Governance Domains)
// ─────────────────────────────────────────────────────────────────

export const EventCategorySchema = z.enum([
  "asset",
  "scan",
  "classification",
  "compliance",
  "enforcement",
  "lifecycle",
  "policy",
  "audit",
]);
export type EventCategory = z.infer<typeof EventCategorySchema>;

// ─────────────────────────────────────────────────────────────────
// EVENT TYPE (Appendix B — Full Taxonomy, 31 Types)
// ─────────────────────────────────────────────────────────────────

export const EventTypeSchema = z.enum([
  // Asset (5)
  "aigrc.asset.created",
  "aigrc.asset.updated",
  "aigrc.asset.registered",
  "aigrc.asset.retired",
  "aigrc.asset.discovered",

  // Scan (3)
  "aigrc.scan.started",
  "aigrc.scan.completed",
  "aigrc.scan.finding",

  // Classification (3)
  "aigrc.classification.applied",
  "aigrc.classification.changed",
  "aigrc.classification.disputed",

  // Compliance (4)
  "aigrc.compliance.evaluated",
  "aigrc.compliance.passed",
  "aigrc.compliance.failed",
  "aigrc.compliance.gap",

  // Enforcement (4)
  "aigrc.enforcement.decision",
  "aigrc.enforcement.violation",
  "aigrc.enforcement.override",
  "aigrc.enforcement.killswitch",

  // Lifecycle (6)
  "aigrc.lifecycle.orphan.declared",
  "aigrc.lifecycle.orphan.resolved",
  "aigrc.lifecycle.orphan.overdue",
  "aigrc.lifecycle.decay.warned",
  "aigrc.lifecycle.decay.expired",
  "aigrc.lifecycle.decay.renewed",

  // Policy (3)
  "aigrc.policy.compiled",
  "aigrc.policy.published",
  "aigrc.policy.deprecated",

  // Audit (3)
  "aigrc.audit.report.generated",
  "aigrc.audit.chain.verified",
  "aigrc.audit.chain.broken",
]);
export type EventType = z.infer<typeof EventTypeSchema>;

// ─────────────────────────────────────────────────────────────────
// CRITICALITY (§3.6)
// ─────────────────────────────────────────────────────────────────

export const CriticalitySchema = z.enum(["normal", "high", "critical"]);
export type Criticality = z.infer<typeof CriticalitySchema>;

// ─────────────────────────────────────────────────────────────────
// IDENTITY TYPE (§8.3 — Authentication Methods)
// ─────────────────────────────────────────────────────────────────

export const IdentityTypeSchema = z.enum([
  "api-key",
  "oauth",
  "agent-token",
  "service-token",
]);
export type IdentityType = z.infer<typeof IdentityTypeSchema>;

// ─────────────────────────────────────────────────────────────────
// ENVIRONMENT
// ─────────────────────────────────────────────────────────────────

export const EnvironmentSchema = z.enum([
  "development",
  "staging",
  "production",
  "ci",
]);
export type Environment = z.infer<typeof EnvironmentSchema>;

// ─────────────────────────────────────────────────────────────────
// VALIDATION ERROR CODES (Appendix C)
// ─────────────────────────────────────────────────────────────────

export const EventErrorCodeSchema = z.enum([
  "EVT_ID_INVALID",
  "EVT_SCHEMA_VERSION_UNKNOWN",
  "EVT_TYPE_INVALID",
  "EVT_CATEGORY_MISMATCH",
  "EVT_GOLDEN_THREAD_MISSING",
  "EVT_GOLDEN_THREAD_INVALID",
  "EVT_ORPHAN_NOTE_TOO_SHORT",
  "EVT_HASH_MISSING",
  "EVT_HASH_INVALID",
  "EVT_HASH_FORMAT",
  "EVT_SIGNATURE_INVALID",
  "EVT_RECEIVED_AT_REJECTED",
  "EVT_DATA_EMPTY",
  "EVT_DUPLICATE",
  "EVT_RATE_LIMITED",
]);
export type EventErrorCode = z.infer<typeof EventErrorCodeSchema>;
