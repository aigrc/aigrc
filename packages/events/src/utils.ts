// ─────────────────────────────────────────────────────────────────
// CANONICAL FORM UTILITIES (§13 — Tamper Evidence)
// ─────────────────────────────────────────────────────────────────

/**
 * Deep-sorts object keys alphabetically at every nesting level.
 * Arrays preserve their element order but contained objects are sorted.
 */
export function sortKeysDeep(obj: unknown): unknown {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(sortKeysDeep);
  }

  if (typeof obj === "object" && obj !== null) {
    const sorted: Record<string, unknown> = {};
    const keys = Object.keys(obj as Record<string, unknown>).sort();
    for (const key of keys) {
      sorted[key] = sortKeysDeep((obj as Record<string, unknown>)[key]);
    }
    return sorted;
  }

  return obj;
}

/**
 * Produces a canonical JSON string from an object.
 *
 * Rules per EVT-001 §13:
 * 1. Exclude specified keys (default: hash, signature, receivedAt)
 * 2. Sort all keys alphabetically at every nesting level
 * 3. Compact JSON with no whitespace
 *
 * @param obj - The object to canonicalize
 * @param excludeKeys - Keys to exclude from the canonical form
 */
export function canonicalize(
  obj: Record<string, unknown>,
  excludeKeys: readonly string[] = ["hash", "signature", "receivedAt"]
): string {
  // Shallow copy and remove excluded keys
  const filtered: Record<string, unknown> = {};
  for (const key of Object.keys(obj)) {
    if (!excludeKeys.includes(key)) {
      filtered[key] = obj[key];
    }
  }

  // Sort keys deeply and serialize with no whitespace
  const sorted = sortKeysDeep(filtered);
  return JSON.stringify(sorted);
}
