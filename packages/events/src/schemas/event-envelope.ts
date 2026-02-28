import { z } from "zod";
import { EventTypeSchema, EventCategorySchema, CriticalitySchema } from "./enums";
import { EventSourceSchema } from "./source";
import { GoldenThreadRefSchema } from "./golden-thread-ref";

// ─────────────────────────────────────────────────────────────────
// GOVERNANCE EVENT ENVELOPE (§3 — Core Schema)
// The single schema shared by every tool in the AIGRC ecosystem.
// ─────────────────────────────────────────────────────────────────

export const GovernanceEventSchema = z.object({
  // ── Identity ──

  /** Deterministic event ID: evt_{32 hex chars}. Never random UUID. */
  id: z.string().regex(/^evt_[a-f0-9]{32}$/),
  /** Event specification version (fixed) */
  specVersion: z.literal("1.0"),
  /** Schema version for forward compatibility */
  schemaVersion: z.string().regex(/^aigrc-events@\d+\.\d+\.\d+$/),

  // ── Classification ──

  /** Fully qualified event type (e.g., "aigrc.asset.created") */
  type: EventTypeSchema,
  /** Event category for routing and filtering */
  category: EventCategorySchema,
  /** Event criticality level */
  criticality: CriticalitySchema,

  // ── Provenance ──

  /** Structured source provenance */
  source: EventSourceSchema,
  /** Organization identifier */
  orgId: z.string().min(1),
  /** Governed asset ID, or "platform" for org-level events */
  assetId: z.string().min(1),

  // ── Temporality ──

  /** ISO 8601 timestamp when event was produced (producer-set) */
  producedAt: z.string().datetime(),
  /** ISO 8601 timestamp when event was received (server-set only, never from producer) */
  receivedAt: z.string().datetime().optional(),

  // ── Accountability ──

  /** Golden Thread reference: linked to authorization OR orphan declaration. REQUIRED. */
  goldenThread: GoldenThreadRefSchema,

  // ── Integrity ──

  /** SHA-256 hash of canonical event form: sha256:{64 hex chars} */
  hash: z.string().regex(/^sha256:[a-f0-9]{64}$/),
  /** Hash of the previous event in chain (runtime-sdk, i2e-firewall) */
  previousHash: z
    .string()
    .regex(/^sha256:[a-f0-9]{64}$/)
    .nullable()
    .optional(),
  /** HMAC-SHA256 signature (required at SILVER+ conformance) */
  signature: z.string().nullable().optional(),

  // ── Chain Linking ──

  /** Causal parent event ID */
  parentEventId: z
    .string()
    .regex(/^evt_[a-f0-9]{32}$/)
    .optional(),
  /** Logical flow grouping ID */
  correlationId: z.string().optional(),

  // ── Payload ──

  /** Event-specific data. Must have at least one field. */
  data: z.record(z.unknown()).refine((val) => Object.keys(val).length > 0, {
    message: "Event data must contain at least one field",
  }),
});
export type GovernanceEvent = z.infer<typeof GovernanceEventSchema>;
