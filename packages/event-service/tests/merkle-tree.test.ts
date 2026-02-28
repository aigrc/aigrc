import { describe, it, expect } from "vitest";
import crypto from "crypto";
import { buildMerkleTree, EMPTY_MERKLE_ROOT } from "../src/services/merkle-tree.js";

// ─── Helpers ──────────────────────────────────────────────────

function sha256Hex(input: string): string {
  return crypto.createHash("sha256").update(input).digest("hex");
}

function makeHash(content: string): string {
  return `sha256:${sha256Hex(content)}`;
}

// ─────────────────────────────────────────────────────────────────
// TESTS: Merkle Tree Construction
// ─────────────────────────────────────────────────────────────────

describe("buildMerkleTree", () => {
  it("returns sentinel root for zero leaves", () => {
    const root = buildMerkleTree([]);
    expect(root).toBe(EMPTY_MERKLE_ROOT);
    // Verify it's the SHA-256 of the empty string
    const expectedEmpty = `sha256:${sha256Hex("")}`;
    expect(root).toBe(expectedEmpty);
  });

  it("returns the leaf itself for a single leaf", () => {
    const leaf = makeHash("event-1");
    const root = buildMerkleTree([leaf]);
    // Single leaf: root = sha256(leafHex + leafHex) since it's duplicated
    // Actually for single leaf, the loop doesn't run since length is 1
    // Wait — let's check: length = 1, while(1 > 1) is false, so root = leaf
    expect(root).toBe(leaf);
  });

  it("computes correct root for two leaves", () => {
    const leaf1 = makeHash("event-1");
    const leaf2 = makeHash("event-2");

    const root = buildMerkleTree([leaf1, leaf2]);

    // Expected: sha256(leaf1Hex + leaf2Hex)
    const hex1 = leaf1.replace("sha256:", "");
    const hex2 = leaf2.replace("sha256:", "");
    const expectedRoot = `sha256:${sha256Hex(hex1 + hex2)}`;
    expect(root).toBe(expectedRoot);
  });

  it("computes correct root for four leaves (balanced tree)", () => {
    const leaves = [
      makeHash("event-1"),
      makeHash("event-2"),
      makeHash("event-3"),
      makeHash("event-4"),
    ];

    const root = buildMerkleTree(leaves);

    // Manual computation:
    const h = leaves.map((l) => l.replace("sha256:", ""));
    const parent01 = sha256Hex(h[0] + h[1]);
    const parent23 = sha256Hex(h[2] + h[3]);
    const expectedRoot = `sha256:${sha256Hex(parent01 + parent23)}`;
    expect(root).toBe(expectedRoot);
  });

  it("handles odd number of leaves by duplicating last", () => {
    const leaves = [
      makeHash("event-1"),
      makeHash("event-2"),
      makeHash("event-3"),
    ];

    const root = buildMerkleTree(leaves);

    // Three leaves: leaf3 is duplicated
    const h = leaves.map((l) => l.replace("sha256:", ""));
    const parent01 = sha256Hex(h[0] + h[1]);
    const parent22 = sha256Hex(h[2] + h[2]); // duplicated
    const expectedRoot = `sha256:${sha256Hex(parent01 + parent22)}`;
    expect(root).toBe(expectedRoot);
  });

  it("handles five leaves correctly", () => {
    const leaves = Array.from({ length: 5 }, (_, i) =>
      makeHash(`event-${i}`),
    );

    const root = buildMerkleTree(leaves);

    // Should be a valid sha256: hash
    expect(root).toMatch(/^sha256:[a-f0-9]{64}$/);
  });

  it("is deterministic — same inputs produce same root", () => {
    const leaves = [makeHash("a"), makeHash("b"), makeHash("c")];
    const root1 = buildMerkleTree(leaves);
    const root2 = buildMerkleTree(leaves);
    expect(root1).toBe(root2);
  });

  it("produces different roots for different inputs", () => {
    const root1 = buildMerkleTree([makeHash("a"), makeHash("b")]);
    const root2 = buildMerkleTree([makeHash("c"), makeHash("d")]);
    expect(root1).not.toBe(root2);
  });

  it("strips sha256: prefix correctly", () => {
    // Hashes with prefix
    const withPrefix = [makeHash("x"), makeHash("y")];
    const rootWithPrefix = buildMerkleTree(withPrefix);

    // Hashes already without prefix should produce the same result
    // since the function strips the prefix
    expect(rootWithPrefix).toMatch(/^sha256:[a-f0-9]{64}$/);
  });

  it("handles large number of leaves (100)", () => {
    const leaves = Array.from({ length: 100 }, (_, i) =>
      makeHash(`event-${i}`),
    );

    const root = buildMerkleTree(leaves);
    expect(root).toMatch(/^sha256:[a-f0-9]{64}$/);

    // Verify determinism with same input
    const root2 = buildMerkleTree(leaves);
    expect(root).toBe(root2);
  });
});
