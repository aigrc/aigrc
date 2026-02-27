// @aigrc/event-service — Governance Event Ingestion Service
// AIGRC-EVT-001 §12 — Sync & Batch Channel Endpoints

export { createApp } from "./app.js";
export { createEventRouter } from "./routes/events.js";
export {
  EventStore,
  type StorePushResponse,
  type StoreBatchResponse,
  type StoreBatchEventResult,
} from "./services/event-store.js";
export { requireBearerAuth, type AuthInfo } from "./middleware/auth.js";
export {
  eventRateLimit,
  type RateLimitConfig,
} from "./middleware/rate-limit.js";

// ── Policy Evaluation (Sprint 4 — AIG-212) ──
export {
  PolicyEvaluator,
  type EvaluationResult,
  type PolicyResult,
  type PolicyViolation,
  type GovernanceWarning,
  type Suggestion,
  type ActiveWaiver,
} from "./services/policy-evaluator.js";
export {
  InMemoryPolicyBundleStore,
  SupabasePolicyBundleStore,
  type PolicyBundleStore,
  type PolicyBundle,
  type PolicyRule,
  type PolicyWaiver,
} from "./services/policy-bundle-store.js";

// ── Integrity Checkpoints (Sprint 5 — AIG-213) ──
export {
  buildMerkleTree,
  EMPTY_MERKLE_ROOT,
} from "./services/merkle-tree.js";
export {
  IntegrityCheckpointService,
  createPlatformBuilder,
  type CheckpointResult,
  type IntegrityCheckpointConfig,
} from "./services/integrity-checkpoint.js";
