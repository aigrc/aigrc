// @aigrc/events — Governance Event Architecture
// AIGRC-EVT-001 Implementation

// ── Schemas & Types ──
export * from "./schemas";

// ── Constants ──
export * from "./constants";

// ── Event ID computation (§4.1) ──
export {
  computeEventId,
  floorTimestamp10ms,
  floorTimestamp1ms,
  isValidEventId,
  type StandardIdComponents,
  type HighFrequencyIdComponents,
} from "./event-id";

// ── Event hashing (§13) ──
export {
  computeEventHash,
  verifyEventHash,
  type EventHashResult,
  type HashVerificationResult,
} from "./event-hash";

// ── Validator (§10) ──
export { AigrcEventValidator, type ValidationResult } from "./validator";

// ── Utilities ──
export { canonicalize, sortKeysDeep } from "./utils";

// ── Builder (Sprint 2) ──
export {
  GovernanceEventBuilder,
  GovernanceEventValidationError,
  type BuilderConfig,
  type BaseEventParams,
  type AssetEventParams,
  type ScanEventParams,
  type ClassificationEventParams,
  type ComplianceEventParams,
  type EnforcementEventParams,
  type LifecycleEventParams,
  type PolicyEventParams,
  type AuditEventParams,
} from "./builder";

// ── Client (Sprint 2 + Sprint 4 retrieval) ──
export {
  AigosClient,
  AigosClientError,
  AigosRateLimitError,
  type ClientConfig,
  type EventListFilters,
  type AssetListFilters,
} from "./client";

// ── Buffer (Sprint 3) ──
export { EventBuffer, type BufferConfig } from "./buffer";
