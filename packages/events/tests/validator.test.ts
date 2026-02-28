import { describe, it, expect } from "vitest";
import { AigrcEventValidator } from "../src/validator";
import { computeEventHash } from "../src/event-hash";
import type { GovernanceEvent } from "../src/schemas/event-envelope";

const validator = new AigrcEventValidator();

// ─────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────

function makeValidEvent(): Record<string, unknown> {
  const event = {
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
  };

  // Compute and assign the correct hash
  const { hash } = computeEventHash(event);
  return { ...event, hash };
}

// ─────────────────────────────────────────────────────────────────
// VALID EVENT
// ─────────────────────────────────────────────────────────────────

describe("AigrcEventValidator — Valid Events", () => {
  it("validates a correctly constructed event", () => {
    const event = makeValidEvent();
    const result = validator.validate(event);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("validates event with orphan golden thread", () => {
    const event = makeValidEvent();
    event.goldenThread = {
      type: "orphan",
      reason: "discovery",
      declaredBy: "dev@pangolabs.cloud",
      declaredAt: "2026-02-24T12:00:00Z",
      remediationDeadline: "2026-03-10T12:00:00Z",
      remediationNote: "Will link to AIG-200 once sprint begins and work is assigned",
    };
    // Recompute hash with new goldenThread
    const { hash } = computeEventHash(event);
    event.hash = hash;

    const result = validator.validate(event);
    expect(result.valid).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────
// ERROR CODE TESTS
// ─────────────────────────────────────────────────────────────────

describe("AigrcEventValidator — Error Codes", () => {
  it("EVT_ID_INVALID: rejects malformed id", () => {
    const event = makeValidEvent();
    event.id = "bad-id";
    // Recompute hash
    const { hash } = computeEventHash(event);
    event.hash = hash;

    const result = validator.validate(event);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.code === "EVT_ID_INVALID")).toBe(true);
  });

  it("EVT_SCHEMA_VERSION_UNKNOWN: rejects bad schemaVersion", () => {
    const event = makeValidEvent();
    event.schemaVersion = "1.0.0"; // Wrong format
    const { hash } = computeEventHash(event);
    event.hash = hash;

    const result = validator.validate(event);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.code === "EVT_SCHEMA_VERSION_UNKNOWN")).toBe(true);
  });

  it("EVT_TYPE_INVALID: rejects unknown event type", () => {
    const event = makeValidEvent();
    event.type = "aigrc.invalid.type";
    const { hash } = computeEventHash(event);
    event.hash = hash;

    const result = validator.validate(event);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.code === "EVT_TYPE_INVALID")).toBe(true);
  });

  it("EVT_CATEGORY_MISMATCH: rejects wrong category for type", () => {
    const event = makeValidEvent();
    event.category = "scan"; // Should be "asset" for aigrc.asset.created
    // Recompute hash with wrong category
    const { hash } = computeEventHash(event);
    event.hash = hash;

    const result = validator.validate(event);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.code === "EVT_CATEGORY_MISMATCH")).toBe(true);
  });

  it("EVT_GOLDEN_THREAD_MISSING: rejects missing goldenThread", () => {
    const event = makeValidEvent();
    delete event.goldenThread;
    const { hash } = computeEventHash(event);
    event.hash = hash;

    const result = validator.validate(event);
    expect(result.valid).toBe(false);
    expect(
      result.errors.some(
        (e) => e.code === "EVT_GOLDEN_THREAD_MISSING" || e.code === "EVT_GOLDEN_THREAD_INVALID"
      )
    ).toBe(true);
  });

  it("EVT_GOLDEN_THREAD_INVALID: rejects invalid goldenThread", () => {
    const event = makeValidEvent();
    event.goldenThread = { type: "unknown" };
    const { hash } = computeEventHash(event);
    event.hash = hash;

    const result = validator.validate(event);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.code === "EVT_GOLDEN_THREAD_INVALID")).toBe(true);
  });

  it("EVT_HASH_FORMAT: rejects malformed hash", () => {
    const event = makeValidEvent();
    event.hash = "md5:abcdef";

    const result = validator.validate(event);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.code === "EVT_HASH_FORMAT")).toBe(true);
  });

  it("EVT_HASH_INVALID: rejects hash that doesn't match content", () => {
    const event = makeValidEvent();
    // Set a valid-format but wrong hash
    event.hash = "sha256:0000000000000000000000000000000000000000000000000000000000000000";

    const result = validator.validate(event);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.code === "EVT_HASH_INVALID")).toBe(true);
  });

  it("EVT_RECEIVED_AT_REJECTED: rejects client-set receivedAt", () => {
    const event = makeValidEvent();
    event.receivedAt = "2026-02-24T12:00:01Z";

    const result = validator.validate(event);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.code === "EVT_RECEIVED_AT_REJECTED")).toBe(true);
  });

  it("EVT_DATA_EMPTY: rejects empty data object", () => {
    const event = makeValidEvent();
    event.data = {};
    const { hash } = computeEventHash(event);
    event.hash = hash;

    const result = validator.validate(event);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.code === "EVT_DATA_EMPTY")).toBe(true);
  });

  it("rejects null input", () => {
    const result = validator.validate(null);
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });
});

// ─────────────────────────────────────────────────────────────────
// validateOrThrow
// ─────────────────────────────────────────────────────────────────

describe("AigrcEventValidator — validateOrThrow", () => {
  it("returns parsed event when valid", () => {
    const event = makeValidEvent();
    const parsed = validator.validateOrThrow(event);
    expect(parsed.id).toBe(event.id);
    expect(parsed.type).toBe("aigrc.asset.created");
  });

  it("throws on invalid event", () => {
    expect(() => validator.validateOrThrow({ invalid: true })).toThrow();
  });

  it("throws with error code in message", () => {
    try {
      validator.validateOrThrow({ id: "bad" });
      expect.unreachable("should have thrown");
    } catch (e) {
      expect((e as Error).message).toContain("EVT_");
    }
  });
});
