import { z } from "zod";
import { EventErrorCodeSchema } from "./enums";

// ─────────────────────────────────────────────────────────────────
// VALIDATION ERROR (Appendix C)
// ─────────────────────────────────────────────────────────────────

export const ValidationErrorSchema = z.object({
  /** Error code from Appendix C */
  code: EventErrorCodeSchema,
  /** Human-readable error message */
  message: z.string().min(1),
  /** Additional context about the error */
  detail: z.string().optional(),
  /** Field name if the error is field-specific */
  field: z.string().optional(),
  /** JSON Schema path if applicable */
  schemaPath: z.string().optional(),
});
export type ValidationError = z.infer<typeof ValidationErrorSchema>;

// ─────────────────────────────────────────────────────────────────
// POLICY VIOLATION (§12.5 — PushResponse Feedback)
// ─────────────────────────────────────────────────────────────────

export const PolicyViolationSchema = z.object({
  /** Policy rule ID */
  ruleId: z.string().min(1),
  /** Human-readable rule name */
  ruleName: z.string().min(1),
  /** Violation severity */
  severity: z.enum(["blocking", "warning"]),
  /** Description of the violation */
  description: z.string().min(1),
  /** Recommended remediation */
  remediation: z.string().min(1),
});
export type PolicyViolation = z.infer<typeof PolicyViolationSchema>;

// ─────────────────────────────────────────────────────────────────
// ACTIVE WAIVER
// ─────────────────────────────────────────────────────────────────

export const ActiveWaiverSchema = z.object({
  /** Waived rule ID */
  ruleId: z.string().min(1),
  /** Who authorized the waiver */
  waivedBy: z.string().min(1),
  /** ISO 8601 expiration timestamp */
  expiresAt: z.string().datetime(),
  /** Reason for the waiver */
  reason: z.string().min(1),
});
export type ActiveWaiver = z.infer<typeof ActiveWaiverSchema>;

// ─────────────────────────────────────────────────────────────────
// GOVERNANCE WARNING (Non-blocking)
// ─────────────────────────────────────────────────────────────────

export const GovernanceWarningSchema = z.object({
  /** Warning code */
  code: z.string().min(1),
  /** Warning message */
  message: z.string().min(1),
  /** Affected asset */
  asset: z.string().min(1),
  /** Warning severity */
  severity: z.enum(["info", "warning", "urgent"]),
  /** Suggested action */
  action: z.string().optional(),
});
export type GovernanceWarning = z.infer<typeof GovernanceWarningSchema>;

// ─────────────────────────────────────────────────────────────────
// SUGGESTION (Platform Intelligence)
// ─────────────────────────────────────────────────────────────────

export const SuggestionSchema = z.object({
  /** Suggestion code */
  code: z.string().min(1),
  /** Suggestion message */
  message: z.string().min(1),
  /** Confidence score 0.0 to 1.0 */
  confidence: z.number().min(0).max(1),
  /** Source of the suggestion */
  source: z.enum(["fleet-analysis", "regulatory-update", "best-practice"]),
});
export type Suggestion = z.infer<typeof SuggestionSchema>;

// ─────────────────────────────────────────────────────────────────
// PUSH RESPONSE (§12.5 — Sync Channel Response)
// ─────────────────────────────────────────────────────────────────

export const PolicyResultSchema = z.object({
  /** Whether policy was evaluated */
  evaluated: z.boolean(),
  /** Whether all policies passed */
  passed: z.boolean(),
  /** Policy bundle used for evaluation */
  bundleId: z.string().min(1),
  /** Policy violations found */
  violations: z.array(PolicyViolationSchema),
  /** Active waivers applied */
  waivers: z.array(ActiveWaiverSchema),
});
export type PolicyResult = z.infer<typeof PolicyResultSchema>;

export const PushResponseSchema = z.object({
  /** Whether the event was accepted or rejected */
  status: z.enum(["accepted", "rejected"]),
  /** The event ID that was processed */
  eventId: z.string().regex(/^evt_[a-f0-9]{32}$/),
  /** ISO 8601 timestamp when the event was received */
  receivedAt: z.string().datetime(),
  /** Policy evaluation result (optional, triggered by specific event types) */
  policyResult: PolicyResultSchema.optional(),
  /** Compliance gaps relative to conformance target */
  complianceGaps: z.array(PolicyViolationSchema).optional(),
  /** Non-blocking governance warnings */
  warnings: z.array(GovernanceWarningSchema).optional(),
  /** Platform suggestions (never blocking) */
  suggestions: z.array(SuggestionSchema).optional(),
  /** Validation error (only when status is "rejected") */
  error: ValidationErrorSchema.optional(),
});
export type PushResponse = z.infer<typeof PushResponseSchema>;

// ─────────────────────────────────────────────────────────────────
// BATCH RESPONSE (§12.4 — Batch Channel Response)
// ─────────────────────────────────────────────────────────────────

export const BatchEventResultSchema = z.object({
  /** Event's deterministic ID */
  id: z.string().regex(/^evt_[a-f0-9]{32}$/),
  /** Per-event status */
  status: z.enum(["created", "duplicate", "rejected"]),
  /** ISO 8601 received timestamp (present for "created") */
  receivedAt: z.string().datetime().optional(),
  /** Validation error (present for "rejected") */
  error: ValidationErrorSchema.optional(),
});
export type BatchEventResult = z.infer<typeof BatchEventResultSchema>;

export const BatchResponseSchema = z.object({
  /** Number of events accepted */
  accepted: z.number().int().min(0),
  /** Number of events rejected */
  rejected: z.number().int().min(0),
  /** Number of duplicate events */
  duplicate: z.number().int().min(0),
  /** Per-event results */
  results: z.array(BatchEventResultSchema),
});
export type BatchResponse = z.infer<typeof BatchResponseSchema>;
