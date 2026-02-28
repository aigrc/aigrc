import { describe, it, expect } from "vitest";
import { computeEventHash, verifyEventHash } from "../src/event-hash";
import { canonicalize, sortKeysDeep } from "../src/utils";
import type { GovernanceEvent } from "../src/schemas/event-envelope";

// ─────────────────────────────────────────────────────────────────
// TEST FIXTURES
// ─────────────────────────────────────────────────────────────────

function makeEvent(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: "evt_a3f8c2e1d94b7f63a2891c04e5d6b7f8",
    specVersion: "1.0",
    schemaVersion: "aigrc-events@0.1.0",
    type: "aigrc.asset.created",
    category: "asset",
    criticality: "normal",
    source: {
      tool: "cli",
      version: "0.4.2",
      orgId: "org-pangolabs",
      instanceId: "inst-001",
      identity: { type: "api-key", subject: "dev@pangolabs.cloud" },
      environment: "production",
    },
    orgId: "org-pangolabs",
    assetId: "aigrc-2024-a1b2c3d4",
    producedAt: "2026-02-24T12:00:00Z",
    goldenThread: {
      type: "linked",
      system: "jira",
      ref: "AIG-199",
      url: "https://aigos.atlassian.net/browse/AIG-199",
      status: "active",
    },
    data: { cardId: "card-001", cardVersion: "1.0.0" },
    ...overrides,
  };
}

// ─────────────────────────────────────────────────────────────────
// sortKeysDeep
// ─────────────────────────────────────────────────────────────────

describe("sortKeysDeep", () => {
  it("sorts top-level keys alphabetically", () => {
    const result = sortKeysDeep({ z: 1, a: 2, m: 3 }) as Record<string, number>;
    expect(Object.keys(result)).toEqual(["a", "m", "z"]);
  });

  it("sorts nested object keys", () => {
    const result = sortKeysDeep({ outer: { z: 1, a: 2 } }) as Record<
      string,
      Record<string, number>
    >;
    expect(Object.keys(result.outer)).toEqual(["a", "z"]);
  });

  it("preserves array order but sorts contained objects", () => {
    const result = sortKeysDeep([{ z: 1, a: 2 }, { y: 3, b: 4 }]) as Array<
      Record<string, number>
    >;
    expect(Object.keys(result[0])).toEqual(["a", "z"]);
    expect(Object.keys(result[1])).toEqual(["b", "y"]);
  });

  it("handles null and primitives", () => {
    expect(sortKeysDeep(null)).toBeNull();
    expect(sortKeysDeep(42)).toBe(42);
    expect(sortKeysDeep("hello")).toBe("hello");
    expect(sortKeysDeep(true)).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────
// canonicalize
// ─────────────────────────────────────────────────────────────────

describe("canonicalize", () => {
  it("excludes hash, signature, and receivedAt by default", () => {
    const event = makeEvent({
      hash: "sha256:abc",
      signature: "sig",
      receivedAt: "2026-02-24T12:00:01Z",
    });
    const canonical = canonicalize(event);
    expect(canonical).not.toContain('"hash"');
    expect(canonical).not.toContain('"signature"');
    expect(canonical).not.toContain('"receivedAt"');
  });

  it("produces compact JSON (no whitespace)", () => {
    const canonical = canonicalize(makeEvent());
    expect(canonical).not.toContain(" ");
    expect(canonical).not.toContain("\n");
  });

  it("sorts keys alphabetically", () => {
    const canonical = canonicalize({ z: 1, a: 2, m: 3 });
    const parsed = JSON.parse(canonical);
    expect(Object.keys(parsed)).toEqual(["a", "m", "z"]);
  });

  it("allows custom exclude keys", () => {
    const event = { a: 1, b: 2, c: 3 };
    const canonical = canonicalize(event, ["b"]);
    expect(canonical).not.toContain('"b"');
    expect(canonical).toContain('"a"');
    expect(canonical).toContain('"c"');
  });
});

// ─────────────────────────────────────────────────────────────────
// computeEventHash
// ─────────────────────────────────────────────────────────────────

describe("computeEventHash", () => {
  it("produces hash in sha256:{64 hex} format", () => {
    const event = makeEvent();
    const result = computeEventHash(event);
    expect(result.hash).toMatch(/^sha256:[a-f0-9]{64}$/);
  });

  it("is deterministic — same event produces same hash", () => {
    const event = makeEvent();
    const h1 = computeEventHash(event);
    const h2 = computeEventHash(event);
    expect(h1.hash).toBe(h2.hash);
    expect(h1.canonicalForm).toBe(h2.canonicalForm);
  });

  it("excludes hash field from canonical form", () => {
    const withHash = makeEvent({ hash: "sha256:will_be_excluded" });
    const withoutHash = makeEvent();
    expect(computeEventHash(withHash).hash).toBe(computeEventHash(withoutHash).hash);
  });

  it("excludes signature from canonical form", () => {
    const withSig = makeEvent({ signature: "hmac-sha256:abc123" });
    const withoutSig = makeEvent();
    expect(computeEventHash(withSig).hash).toBe(computeEventHash(withoutSig).hash);
  });

  it("excludes receivedAt from canonical form", () => {
    const withReceived = makeEvent({ receivedAt: "2026-02-24T12:00:01Z" });
    const withoutReceived = makeEvent();
    expect(computeEventHash(withReceived).hash).toBe(
      computeEventHash(withoutReceived).hash
    );
  });

  it("different data produces different hash", () => {
    const event1 = makeEvent({ data: { cardId: "a" } });
    const event2 = makeEvent({ data: { cardId: "b" } });
    expect(computeEventHash(event1).hash).not.toBe(computeEventHash(event2).hash);
  });
});

// ─────────────────────────────────────────────────────────────────
// verifyEventHash
// ─────────────────────────────────────────────────────────────────

describe("verifyEventHash", () => {
  it("passes for correctly hashed event", () => {
    const event = makeEvent();
    const { hash } = computeEventHash(event);
    const fullEvent = { ...event, hash } as GovernanceEvent;

    const result = verifyEventHash(fullEvent);
    expect(result.verified).toBe(true);
    expect(result.computed).toBe(result.expected);
  });

  it("fails for tampered event (modified field after hashing)", () => {
    const event = makeEvent();
    const { hash } = computeEventHash(event);
    const tampered = { ...event, hash, orgId: "tampered-org" } as GovernanceEvent;

    const result = verifyEventHash(tampered);
    expect(result.verified).toBe(false);
    expect(result.mismatchReason).toBeDefined();
  });

  it("fails for tampered nested data", () => {
    const event = makeEvent();
    const { hash } = computeEventHash(event);
    const tampered = {
      ...event,
      hash,
      data: { cardId: "tampered" },
    } as GovernanceEvent;

    const result = verifyEventHash(tampered);
    expect(result.verified).toBe(false);
  });
});
