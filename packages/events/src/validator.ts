import { GovernanceEventSchema } from "./schemas/event-envelope";
import type { GovernanceEvent } from "./schemas/event-envelope";
import type { ValidationError } from "./schemas/responses";
import type { EventErrorCode } from "./schemas/enums";
import { createValidationError } from "./schemas/errors";
import { EVENT_TYPE_CATEGORY_MAP, HASH_PATTERN, EVENT_ID_PATTERN } from "./constants";
import { verifyEventHash } from "./event-hash";

// ─────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────

export interface ValidationResult {
  /** Whether the event passed all validation checks */
  valid: boolean;
  /** List of validation errors (empty if valid) */
  errors: ValidationError[];
}

// ─────────────────────────────────────────────────────────────────
// VALIDATOR (§10 — JSON Schema Validation)
// ─────────────────────────────────────────────────────────────────

/**
 * Validates GovernanceEvents against the EVT-001 specification.
 *
 * Performs a multi-step validation sequence:
 * 1. Structural validation via Zod schema
 * 2. Format validation (id, hash, schemaVersion patterns)
 * 3. Semantic validation (category/type match, golden thread integrity)
 * 4. Integrity validation (hash recomputation)
 * 5. Producer constraint validation (receivedAt rejection)
 */
export class AigrcEventValidator {
  /**
   * Validate a governance event against EVT-001.
   * Returns all errors found (does not stop at first error).
   */
  validate(event: unknown): ValidationResult {
    const errors: ValidationError[] = [];

    // Guard: must be an object
    if (typeof event !== "object" || event === null) {
      errors.push(
        createValidationError("EVT_ID_INVALID", "Event must be a non-null object")
      );
      return { valid: false, errors };
    }

    const raw = event as Record<string, unknown>;

    // ── Step 1: Check receivedAt (producer must not set) ──
    if ("receivedAt" in raw && raw.receivedAt !== undefined && raw.receivedAt !== null) {
      errors.push(
        createValidationError(
          "EVT_RECEIVED_AT_REJECTED",
          "Producer must not set receivedAt; this field is server-set only",
          { field: "receivedAt" }
        )
      );
    }

    // ── Step 2: Structural validation via Zod ──
    // Remove receivedAt before Zod parse (it's optional and server-set)
    const forParsing = { ...raw };
    delete forParsing.receivedAt;

    const parseResult = GovernanceEventSchema.safeParse(forParsing);

    if (!parseResult.success) {
      // Map Zod errors to EVT error codes
      for (const issue of parseResult.error.issues) {
        const path = issue.path.join(".");
        const code = mapZodErrorToCode(path, issue.message, raw);
        errors.push(
          createValidationError(code, issue.message, {
            field: path || undefined,
            schemaPath: path ? `#/properties/${path}` : undefined,
          })
        );
      }
      return { valid: false, errors };
    }

    const parsed = parseResult.data;

    // ── Step 3: Category/type consistency ──
    const expectedCategory = EVENT_TYPE_CATEGORY_MAP[parsed.type];
    if (expectedCategory && parsed.category !== expectedCategory) {
      errors.push(
        createValidationError(
          "EVT_CATEGORY_MISMATCH",
          `Category "${parsed.category}" does not match expected category "${expectedCategory}" for type "${parsed.type}"`,
          { field: "category" }
        )
      );
    }

    // ── Step 4: OrphanDeclaration remediationNote min length ──
    if (parsed.goldenThread.type === "orphan") {
      if (parsed.goldenThread.remediationNote.length < 10) {
        errors.push(
          createValidationError(
            "EVT_ORPHAN_NOTE_TOO_SHORT",
            `remediationNote must be at least 10 characters (got ${parsed.goldenThread.remediationNote.length})`,
            { field: "goldenThread.remediationNote" }
          )
        );
      }
    }

    // ── Step 5: Hash integrity verification ──
    const hashResult = verifyEventHash(parsed);
    if (!hashResult.verified) {
      errors.push(
        createValidationError(
          "EVT_HASH_INVALID",
          `Hash verification failed: computed ${hashResult.computed}, declared ${hashResult.expected}`,
          { field: "hash" }
        )
      );
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validate and throw on first error. Convenience method for strict contexts.
   * @throws Error with the first validation error message
   */
  validateOrThrow(event: unknown): GovernanceEvent {
    const result = this.validate(event);
    if (!result.valid) {
      const first = result.errors[0];
      throw new Error(`[${first.code}] ${first.message}`);
    }

    // Return the parsed event (safe to cast since validation passed)
    const raw = event as Record<string, unknown>;
    const forParsing = { ...raw };
    delete forParsing.receivedAt;
    return GovernanceEventSchema.parse(forParsing);
  }
}

// ─────────────────────────────────────────────────────────────────
// ERROR CODE MAPPING
// ─────────────────────────────────────────────────────────────────

/**
 * Map a Zod validation error path to the appropriate EVT error code.
 */
function mapZodErrorToCode(
  path: string,
  message: string,
  raw: Record<string, unknown>
): EventErrorCode {
  // ID validation
  if (path === "id" || path === "") {
    if (!raw.id || typeof raw.id !== "string") return "EVT_ID_INVALID";
    if (!EVENT_ID_PATTERN.test(raw.id as string)) return "EVT_ID_INVALID";
  }
  if (path === "id") return "EVT_ID_INVALID";

  // Schema version
  if (path === "schemaVersion") return "EVT_SCHEMA_VERSION_UNKNOWN";

  // Type validation
  if (path === "type") return "EVT_TYPE_INVALID";

  // Category mismatch
  if (path === "category") return "EVT_CATEGORY_MISMATCH";

  // Golden thread
  if (path === "goldenThread" || path.startsWith("goldenThread")) {
    if (!raw.goldenThread) return "EVT_GOLDEN_THREAD_MISSING";
    if (
      path.includes("remediationNote") &&
      message.includes("at least")
    ) {
      return "EVT_ORPHAN_NOTE_TOO_SHORT";
    }
    return "EVT_GOLDEN_THREAD_INVALID";
  }

  // Hash
  if (path === "hash") {
    if (!raw.hash) return "EVT_HASH_MISSING";
    if (!HASH_PATTERN.test(raw.hash as string)) return "EVT_HASH_FORMAT";
    return "EVT_HASH_FORMAT";
  }

  // Signature
  if (path === "signature") return "EVT_SIGNATURE_INVALID";

  // Data
  if (path === "data") return "EVT_DATA_EMPTY";

  // Default: return the most specific code we can
  if (path === "specVersion") return "EVT_SCHEMA_VERSION_UNKNOWN";

  return "EVT_ID_INVALID"; // Fallback for unmapped paths
}
