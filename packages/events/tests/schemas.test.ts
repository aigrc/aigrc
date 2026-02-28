import { describe, it, expect } from "vitest";
import {
  GovernanceEventSchema,
  GoldenThreadRefSchema,
  LinkedThreadSchema,
  OrphanDeclarationSchema,
  EventSourceSchema,
  PushResponseSchema,
  BatchResponseSchema,
  AssetEventPayloadSchema,
  ScanEventPayloadSchema,
  EventTypeSchema,
  EventCategorySchema,
  CriticalitySchema,
  SourceToolSchema,
} from "../src/schemas";

// ─────────────────────────────────────────────────────────────────
// TEST FIXTURES
// ─────────────────────────────────────────────────────────────────

const VALID_SOURCE = {
  tool: "cli" as const,
  version: "0.4.2",
  orgId: "org-pangolabs",
  instanceId: "inst-001",
  identity: {
    type: "api-key" as const,
    subject: "dev@pangolabs.cloud",
  },
  environment: "production" as const,
};

const VALID_LINKED_THREAD = {
  type: "linked" as const,
  system: "jira",
  ref: "AIG-199",
  url: "https://aigos.atlassian.net/browse/AIG-199",
  status: "active" as const,
};

const VALID_ORPHAN = {
  type: "orphan" as const,
  reason: "discovery" as const,
  declaredBy: "dev@pangolabs.cloud",
  declaredAt: "2026-02-24T12:00:00Z",
  remediationDeadline: "2026-03-10T12:00:00Z",
  remediationNote: "Will link to AIG-200 once sprint begins",
};

const VALID_EVENT = {
  id: "evt_a3f8c2e1d94b7f63a2891c04e5d6b7f8",
  specVersion: "1.0" as const,
  schemaVersion: "aigrc-events@0.1.0",
  type: "aigrc.asset.created" as const,
  category: "asset" as const,
  criticality: "normal" as const,
  source: VALID_SOURCE,
  orgId: "org-pangolabs",
  assetId: "aigrc-2024-a1b2c3d4",
  producedAt: "2026-02-24T12:00:00Z",
  goldenThread: VALID_LINKED_THREAD,
  hash: "sha256:a3f8c2e1d94b7f63a2891c04e5d6b7f8a3f8c2e1d94b7f63a2891c04e5d6b7f8",
  data: { cardId: "card-001", cardVersion: "1.0.0" },
};

// ─────────────────────────────────────────────────────────────────
// ENUM SCHEMAS
// ─────────────────────────────────────────────────────────────────

describe("Enum Schemas", () => {
  it("validates all 31 event types", () => {
    const types = EventTypeSchema.options;
    expect(types).toHaveLength(31);
    expect(types).toContain("aigrc.asset.created");
    expect(types).toContain("aigrc.enforcement.killswitch");
    expect(types).toContain("aigrc.audit.chain.broken");
  });

  it("validates all 8 event categories", () => {
    const cats = EventCategorySchema.options;
    expect(cats).toHaveLength(8);
    expect(cats).toContain("asset");
    expect(cats).toContain("audit");
  });

  it("validates criticality levels", () => {
    expect(CriticalitySchema.parse("normal")).toBe("normal");
    expect(CriticalitySchema.parse("high")).toBe("high");
    expect(CriticalitySchema.parse("critical")).toBe("critical");
    expect(() => CriticalitySchema.parse("low")).toThrow();
  });

  it("validates all 8 source tools", () => {
    const tools = SourceToolSchema.options;
    expect(tools).toHaveLength(8);
    expect(tools).toContain("cli");
    expect(tools).toContain("runtime-sdk");
    expect(tools).toContain("platform");
  });

  it("rejects invalid event type", () => {
    expect(() => EventTypeSchema.parse("aigrc.invalid.type")).toThrow();
  });
});

// ─────────────────────────────────────────────────────────────────
// EVENT SOURCE
// ─────────────────────────────────────────────────────────────────

describe("EventSourceSchema", () => {
  it("validates a complete source", () => {
    const result = EventSourceSchema.safeParse(VALID_SOURCE);
    expect(result.success).toBe(true);
  });

  it("rejects missing tool", () => {
    const { tool, ...missing } = VALID_SOURCE;
    expect(EventSourceSchema.safeParse(missing).success).toBe(false);
  });

  it("rejects invalid tool", () => {
    expect(
      EventSourceSchema.safeParse({ ...VALID_SOURCE, tool: "invalid" }).success
    ).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────
// GOLDEN THREAD REF (Discriminated Union)
// ─────────────────────────────────────────────────────────────────

describe("GoldenThreadRefSchema", () => {
  it("validates a linked thread", () => {
    const result = GoldenThreadRefSchema.safeParse(VALID_LINKED_THREAD);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.type).toBe("linked");
    }
  });

  it("validates an orphan declaration", () => {
    const result = GoldenThreadRefSchema.safeParse(VALID_ORPHAN);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.type).toBe("orphan");
    }
  });

  it("rejects orphan with short remediationNote", () => {
    const short = { ...VALID_ORPHAN, remediationNote: "too short" };
    expect(OrphanDeclarationSchema.safeParse(short).success).toBe(false);
  });

  it("rejects linked thread with invalid URL", () => {
    const bad = { ...VALID_LINKED_THREAD, url: "not-a-url" };
    expect(LinkedThreadSchema.safeParse(bad).success).toBe(false);
  });

  it("rejects unknown discriminator type", () => {
    const unknown = { type: "unknown", system: "jira" };
    expect(GoldenThreadRefSchema.safeParse(unknown).success).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────
// GOVERNANCE EVENT ENVELOPE
// ─────────────────────────────────────────────────────────────────

describe("GovernanceEventSchema", () => {
  it("validates a complete event", () => {
    const result = GovernanceEventSchema.safeParse(VALID_EVENT);
    expect(result.success).toBe(true);
  });

  it("rejects missing id", () => {
    const { id, ...missing } = VALID_EVENT;
    expect(GovernanceEventSchema.safeParse(missing).success).toBe(false);
  });

  it("rejects malformed id", () => {
    expect(
      GovernanceEventSchema.safeParse({ ...VALID_EVENT, id: "bad-id" }).success
    ).toBe(false);
  });

  it("rejects wrong specVersion", () => {
    expect(
      GovernanceEventSchema.safeParse({ ...VALID_EVENT, specVersion: "2.0" }).success
    ).toBe(false);
  });

  it("rejects invalid schemaVersion format", () => {
    expect(
      GovernanceEventSchema.safeParse({ ...VALID_EVENT, schemaVersion: "1.0.0" }).success
    ).toBe(false);
  });

  it("rejects empty data object", () => {
    expect(
      GovernanceEventSchema.safeParse({ ...VALID_EVENT, data: {} }).success
    ).toBe(false);
  });

  it("rejects invalid hash format", () => {
    expect(
      GovernanceEventSchema.safeParse({ ...VALID_EVENT, hash: "md5:abc123" }).success
    ).toBe(false);
  });

  it("accepts optional previousHash", () => {
    const withPrev = {
      ...VALID_EVENT,
      previousHash: "sha256:b4f9d3a2c85e1f74b3982d15f6e7c8a9b4f9d3a2c85e1f74b3982d15f6e7c8a9",
    };
    expect(GovernanceEventSchema.safeParse(withPrev).success).toBe(true);
  });

  it("accepts optional correlationId", () => {
    const withCorr = { ...VALID_EVENT, correlationId: "corr-flow-001" };
    expect(GovernanceEventSchema.safeParse(withCorr).success).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────
// PAYLOAD SCHEMAS
// ─────────────────────────────────────────────────────────────────

describe("Payload Schemas", () => {
  it("validates AssetEventPayload", () => {
    const payload = {
      cardId: "card-001",
      cardVersion: "1.0.0",
      assetType: "agent",
      riskLevel: "high",
    };
    expect(AssetEventPayloadSchema.safeParse(payload).success).toBe(true);
  });

  it("validates ScanEventPayload", () => {
    const payload = {
      scanId: "scan-001",
      trigger: "commit",
      filesScanned: 42,
      findingCount: 3,
      durationMs: 1250,
    };
    expect(ScanEventPayloadSchema.safeParse(payload).success).toBe(true);
  });

  it("rejects AssetEventPayload with invalid risk level", () => {
    const bad = {
      cardId: "card-001",
      cardVersion: "1.0.0",
      assetType: "agent",
      riskLevel: "unknown",
    };
    expect(AssetEventPayloadSchema.safeParse(bad).success).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────
// RESPONSE SCHEMAS
// ─────────────────────────────────────────────────────────────────

describe("Response Schemas", () => {
  it("validates PushResponse", () => {
    const response = {
      status: "accepted",
      eventId: "evt_a3f8c2e1d94b7f63a2891c04e5d6b7f8",
      receivedAt: "2026-02-24T12:00:01Z",
    };
    expect(PushResponseSchema.safeParse(response).success).toBe(true);
  });

  it("validates BatchResponse", () => {
    const response = {
      accepted: 8,
      rejected: 1,
      duplicate: 1,
      results: [
        {
          id: "evt_a3f8c2e1d94b7f63a2891c04e5d6b7f8",
          status: "created",
          receivedAt: "2026-02-24T12:00:01Z",
        },
      ],
    };
    expect(BatchResponseSchema.safeParse(response).success).toBe(true);
  });
});
