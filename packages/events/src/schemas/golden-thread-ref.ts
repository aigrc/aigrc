import { z } from "zod";

// ─────────────────────────────────────────────────────────────────
// LINKED THREAD (§7.1 — Active Business Authorization)
// ─────────────────────────────────────────────────────────────────

export const LinkedThreadSchema = z.object({
  /** Discriminator: this event has an active golden thread link */
  type: z.literal("linked"),
  /** Ticket tracking system (e.g., "jira", "ado", "linear", "github_issue", "custom") */
  system: z.string().min(1),
  /** Work item reference identifier (e.g., "PROJ-1234") */
  ref: z.string().min(1),
  /** Valid URI to the work item */
  url: z.string().url(),
  /** Current status of the linked authorization */
  status: z.enum(["active", "completed", "cancelled", "unknown"]),
  /** ISO 8601 timestamp when the producer last verified status */
  verifiedAt: z.string().datetime().optional(),
});
export type LinkedThread = z.infer<typeof LinkedThreadSchema>;

// ─────────────────────────────────────────────────────────────────
// ORPHAN DECLARATION (§7.2 — Missing Authorization)
// ─────────────────────────────────────────────────────────────────

export const OrphanDeclarationSchema = z.object({
  /** Discriminator: this event declares an orphan status */
  type: z.literal("orphan"),
  /** Reason for orphan status */
  reason: z.enum(["discovery", "pre-authorization", "legacy-migration", "emergency-deploy"]),
  /** Email or system identifier of the declarer */
  declaredBy: z.string().min(1),
  /** ISO 8601 timestamp when orphan status was declared */
  declaredAt: z.string().datetime(),
  /** ISO 8601 deadline for remediation (REQUIRED) */
  remediationDeadline: z.string().datetime(),
  /** Specific remediation action (min 10 chars) */
  remediationNote: z.string().min(10),
});
export type OrphanDeclaration = z.infer<typeof OrphanDeclarationSchema>;

// ─────────────────────────────────────────────────────────────────
// GOLDEN THREAD REF (§7 — Discriminated Union)
// Every governance event MUST have a golden thread reference.
// It is either linked to a business authorization or declares orphan status.
// ─────────────────────────────────────────────────────────────────

export const GoldenThreadRefSchema = z.discriminatedUnion("type", [
  LinkedThreadSchema,
  OrphanDeclarationSchema,
]);
export type GoldenThreadRef = z.infer<typeof GoldenThreadRefSchema>;
