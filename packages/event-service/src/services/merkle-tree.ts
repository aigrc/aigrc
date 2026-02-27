/**
 * Merkle Tree — Binary hash tree for daily integrity checkpoints
 *
 * Per EVT-001 §13.3: builds a binary Merkle tree from event hashes
 * and returns a single root hash for tamper-evident verification.
 */

import crypto from "crypto";

// ─────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────

/** SHA-256 of the empty string — sentinel root for zero-event days */
export const EMPTY_MERKLE_ROOT =
  "sha256:e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855";

// ─────────────────────────────────────────────────────────────────
// MERKLE TREE
// ─────────────────────────────────────────────────────────────────

/**
 * Build a binary Merkle tree from leaf hashes and return the root.
 *
 * Algorithm:
 * 1. Strip `sha256:` prefix from each leaf
 * 2. If zero leaves, return the sentinel root (SHA-256 of empty string)
 * 3. If odd number of leaves, duplicate the last leaf
 * 4. Pair adjacent leaves, concatenate hex strings, SHA-256 hash
 * 5. Repeat until a single root remains
 * 6. Return root with `sha256:` prefix
 *
 * @param leafHashes — Array of hashes in `sha256:{64hex}` format
 * @returns Root hash in `sha256:{64hex}` format
 */
export function buildMerkleTree(leafHashes: string[]): string {
  if (leafHashes.length === 0) {
    return EMPTY_MERKLE_ROOT;
  }

  // Strip sha256: prefix from each leaf
  let currentLevel = leafHashes.map(stripPrefix);

  while (currentLevel.length > 1) {
    const nextLevel: string[] = [];

    for (let i = 0; i < currentLevel.length; i += 2) {
      const left = currentLevel[i];
      // If odd count, duplicate the last leaf
      const right = currentLevel[i + 1] ?? currentLevel[i];
      const combined = sha256Hex(left + right);
      nextLevel.push(combined);
    }

    currentLevel = nextLevel;
  }

  return `sha256:${currentLevel[0]}`;
}

/**
 * Compute a SHA-256 hash of a hex string and return the hex digest.
 */
function sha256Hex(input: string): string {
  return crypto.createHash("sha256").update(input).digest("hex");
}

/**
 * Strip the `sha256:` prefix from a hash string.
 * If no prefix, return as-is.
 */
function stripPrefix(hash: string): string {
  return hash.replace(/^sha256:/, "");
}
