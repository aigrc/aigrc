import type { EventType, EventCategory, Criticality, SourceTool } from "./schemas/enums";

// ─────────────────────────────────────────────────────────────────
// SPEC CONSTANTS
// ─────────────────────────────────────────────────────────────────

export const SPEC_VERSION = "1.0" as const;
export const SCHEMA_VERSION = "aigrc-events@0.1.0" as const;
export const EVENT_ID_PREFIX = "evt_" as const;
export const EVENT_ID_HEX_LENGTH = 32 as const;
export const EVENT_ID_PATTERN = /^evt_[a-f0-9]{32}$/;
export const HASH_PATTERN = /^sha256:[a-f0-9]{64}$/;

// ─────────────────────────────────────────────────────────────────
// TOOL FREQUENCY CLASSIFICATION
// ─────────────────────────────────────────────────────────────────

/** Standard-frequency tools: 10ms timestamp flooring */
export const STANDARD_FREQUENCY_TOOLS: readonly SourceTool[] = [
  "cli",
  "vscode",
  "github-action",
  "mcp-server",
  "i2e-bridge",
  "platform",
] as const;

/** High-frequency tools: 1ms timestamp flooring + localSeq */
export const HIGH_FREQUENCY_TOOLS: readonly SourceTool[] = [
  "runtime-sdk",
  "i2e-firewall",
] as const;

/**
 * Returns true if the given tool is a high-frequency producer
 * requiring instanceId/localSeq-based event IDs.
 */
export function isHighFrequencyTool(tool: SourceTool): boolean {
  return (HIGH_FREQUENCY_TOOLS as readonly string[]).includes(tool);
}

// ─────────────────────────────────────────────────────────────────
// EVENT TYPE → CATEGORY MAP (Appendix B)
// ─────────────────────────────────────────────────────────────────

export const EVENT_TYPE_CATEGORY_MAP: Record<EventType, EventCategory> = {
  // Asset
  "aigrc.asset.created": "asset",
  "aigrc.asset.updated": "asset",
  "aigrc.asset.registered": "asset",
  "aigrc.asset.retired": "asset",
  "aigrc.asset.discovered": "asset",

  // Scan
  "aigrc.scan.started": "scan",
  "aigrc.scan.completed": "scan",
  "aigrc.scan.finding": "scan",

  // Classification
  "aigrc.classification.applied": "classification",
  "aigrc.classification.changed": "classification",
  "aigrc.classification.disputed": "classification",

  // Compliance
  "aigrc.compliance.evaluated": "compliance",
  "aigrc.compliance.passed": "compliance",
  "aigrc.compliance.failed": "compliance",
  "aigrc.compliance.gap": "compliance",

  // Enforcement
  "aigrc.enforcement.decision": "enforcement",
  "aigrc.enforcement.violation": "enforcement",
  "aigrc.enforcement.override": "enforcement",
  "aigrc.enforcement.killswitch": "enforcement",

  // Lifecycle
  "aigrc.lifecycle.orphan.declared": "lifecycle",
  "aigrc.lifecycle.orphan.resolved": "lifecycle",
  "aigrc.lifecycle.orphan.overdue": "lifecycle",
  "aigrc.lifecycle.decay.warned": "lifecycle",
  "aigrc.lifecycle.decay.expired": "lifecycle",
  "aigrc.lifecycle.decay.renewed": "lifecycle",

  // Policy
  "aigrc.policy.compiled": "policy",
  "aigrc.policy.published": "policy",
  "aigrc.policy.deprecated": "policy",

  // Audit
  "aigrc.audit.report.generated": "audit",
  "aigrc.audit.chain.verified": "audit",
  "aigrc.audit.chain.broken": "audit",
};

// ─────────────────────────────────────────────────────────────────
// DEFAULT CRITICALITY MAP (Appendix B)
// ─────────────────────────────────────────────────────────────────

export const DEFAULT_CRITICALITY_MAP: Record<EventType, Criticality> = {
  // Asset
  "aigrc.asset.created": "normal",
  "aigrc.asset.updated": "normal",
  "aigrc.asset.registered": "normal",
  "aigrc.asset.retired": "normal",
  "aigrc.asset.discovered": "high",

  // Scan
  "aigrc.scan.started": "normal",
  "aigrc.scan.completed": "normal",
  "aigrc.scan.finding": "normal",

  // Classification
  "aigrc.classification.applied": "normal",
  "aigrc.classification.changed": "high",
  "aigrc.classification.disputed": "normal",

  // Compliance
  "aigrc.compliance.evaluated": "normal",
  "aigrc.compliance.passed": "normal",
  "aigrc.compliance.failed": "high",
  "aigrc.compliance.gap": "normal",

  // Enforcement
  "aigrc.enforcement.decision": "normal",
  "aigrc.enforcement.violation": "high",
  "aigrc.enforcement.override": "high",
  "aigrc.enforcement.killswitch": "critical",

  // Lifecycle
  "aigrc.lifecycle.orphan.declared": "normal",
  "aigrc.lifecycle.orphan.resolved": "normal",
  "aigrc.lifecycle.orphan.overdue": "high",
  "aigrc.lifecycle.decay.warned": "high",
  "aigrc.lifecycle.decay.expired": "high",
  "aigrc.lifecycle.decay.renewed": "normal",

  // Policy
  "aigrc.policy.compiled": "normal",
  "aigrc.policy.published": "normal",
  "aigrc.policy.deprecated": "normal",

  // Audit
  "aigrc.audit.report.generated": "normal",
  "aigrc.audit.chain.verified": "normal",
  "aigrc.audit.chain.broken": "critical",
};

// ─────────────────────────────────────────────────────────────────
// FIELDS EXCLUDED FROM CANONICAL HASH (§13)
// ─────────────────────────────────────────────────────────────────

export const HASH_EXCLUDED_FIELDS = ["hash", "signature", "receivedAt"] as const;
