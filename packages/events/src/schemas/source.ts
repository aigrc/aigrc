import { z } from "zod";
import { SourceToolSchema, IdentityTypeSchema, EnvironmentSchema } from "./enums";

// ─────────────────────────────────────────────────────────────────
// SOURCE IDENTITY (§8.3 — Authenticated Principal)
// ─────────────────────────────────────────────────────────────────

export const SourceIdentitySchema = z.object({
  /** Authentication method used by the producer */
  type: IdentityTypeSchema,
  /**
   * Authenticated principal identifier. Never raw credentials.
   * - api-key: developer email or API key alias
   * - oauth: email address
   * - agent-token: agent instance ID
   * - service-token: service name or client ID
   */
  subject: z.string().min(1),
});
export type SourceIdentity = z.infer<typeof SourceIdentitySchema>;

// ─────────────────────────────────────────────────────────────────
// EVENT SOURCE (§8 — Producer Provenance)
// ─────────────────────────────────────────────────────────────────

export const EventSourceSchema = z.object({
  /** Which tool produced this event */
  tool: SourceToolSchema,
  /** Semantic version of the producing tool (e.g., "0.4.2") */
  version: z.string().min(1),
  /** Organization identifier */
  orgId: z.string().min(1),
  /** Unique instance identifier for the producer */
  instanceId: z.string().min(1),
  /** Authenticated principal who triggered the event */
  identity: SourceIdentitySchema,
  /** Deployment environment */
  environment: EnvironmentSchema,
});
export type EventSource = z.infer<typeof EventSourceSchema>;
