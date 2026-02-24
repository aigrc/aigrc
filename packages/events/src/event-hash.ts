import { canonicalize } from "./utils";
import { HASH_EXCLUDED_FIELDS } from "./constants";
import type { GovernanceEvent } from "./schemas/event-envelope";

// eslint-disable-next-line @typescript-eslint/no-require-imports
const crypto = require("crypto");

// ─────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────

export interface EventHashResult {
  /** The canonical JSON string that was hashed */
  canonicalForm: string;
  /** The SHA-256 hash in format sha256:{64 lowercase hex chars} */
  hash: string;
}

export interface HashVerificationResult {
  /** Whether the declared hash matches the computed hash */
  verified: boolean;
  /** The hash computed from the canonical form */
  computed: string;
  /** The hash declared on the event */
  expected: string;
  /** Reason for mismatch if verification failed */
  mismatchReason?: string;
}

// ─────────────────────────────────────────────────────────────────
// HASH COMPUTATION (§13.1)
// ─────────────────────────────────────────────────────────────────

/**
 * Compute the SHA-256 hash of a governance event's canonical form.
 *
 * Canonical form rules (§13):
 * 1. Exclude: hash, signature, receivedAt
 * 2. Sort all keys alphabetically at every nesting level
 * 3. Compact JSON (no whitespace)
 * 4. UTF-8 encode
 * 5. SHA-256 → "sha256:{64 lowercase hex characters}"
 *
 * Uses Node.js crypto.createHash("sha256") synchronously.
 */
export function computeEventHash(
  event: Record<string, unknown>
): EventHashResult {
  const canonicalForm = canonicalize(event, HASH_EXCLUDED_FIELDS);
  const hashHex: string = crypto.createHash("sha256").update(canonicalForm).digest("hex");

  return {
    canonicalForm,
    hash: `sha256:${hashHex}`,
  };
}

// ─────────────────────────────────────────────────────────────────
// HASH VERIFICATION (§13.2)
// ─────────────────────────────────────────────────────────────────

/**
 * Constant-time string comparison to prevent timing attacks.
 * Same pattern as @aigrc/core/src/golden-thread.ts.
 */
function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

/**
 * Verify an event's hash by recomputing from canonical form and comparing.
 * Uses constant-time comparison to prevent timing attacks.
 */
export function verifyEventHash(
  event: GovernanceEvent
): HashVerificationResult {
  const { hash: computed } = computeEventHash(event as unknown as Record<string, unknown>);
  const expected = event.hash;
  const verified = constantTimeEqual(computed, expected);

  return {
    verified,
    computed,
    expected,
    mismatchReason: verified ? undefined : "Recomputed hash does not match declared hash",
  };
}
