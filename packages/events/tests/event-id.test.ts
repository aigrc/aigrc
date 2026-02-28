import { describe, it, expect } from "vitest";
import {
  computeEventId,
  floorTimestamp10ms,
  floorTimestamp1ms,
  isValidEventId,
} from "../src/event-id";
import type { StandardIdComponents, HighFrequencyIdComponents } from "../src/event-id";

describe("floorTimestamp10ms", () => {
  it("floors to nearest 10ms", () => {
    // 123ms → 120ms
    const result = floorTimestamp10ms("2026-01-15T10:30:00.123Z");
    expect(result % 10).toBe(0);
  });

  it("timestamps within 10ms produce the same floor", () => {
    const a = floorTimestamp10ms("2026-01-15T10:30:00.123Z");
    const b = floorTimestamp10ms("2026-01-15T10:30:00.125Z");
    expect(a).toBe(b);
  });

  it("timestamps 10ms apart produce different floors", () => {
    const a = floorTimestamp10ms("2026-01-15T10:30:00.119Z");
    const b = floorTimestamp10ms("2026-01-15T10:30:00.120Z");
    expect(a).not.toBe(b);
  });

  it("accepts Date objects", () => {
    const ts = new Date("2026-01-15T10:30:00.123Z");
    const result = floorTimestamp10ms(ts);
    expect(result % 10).toBe(0);
  });
});

describe("floorTimestamp1ms", () => {
  it("floors to nearest 1ms (integer)", () => {
    const result = floorTimestamp1ms("2026-01-15T10:30:00.123Z");
    expect(Number.isInteger(result)).toBe(true);
  });

  it("preserves millisecond precision", () => {
    const a = floorTimestamp1ms("2026-01-15T10:30:00.123Z");
    const b = floorTimestamp1ms("2026-01-15T10:30:00.124Z");
    expect(b - a).toBe(1);
  });
});

describe("computeEventId — Standard Path", () => {
  const baseComponents: StandardIdComponents = {
    orgId: "org-pangolabs",
    tool: "cli",
    type: "aigrc.asset.created",
    assetId: "aigrc-2024-a1b2c3d4",
    timestamp: "2026-02-24T12:00:00.100Z",
  };

  it("produces a valid event ID format", () => {
    const id = computeEventId(baseComponents);
    expect(id).toMatch(/^evt_[a-f0-9]{32}$/);
  });

  it("is deterministic — same inputs produce same ID", () => {
    const id1 = computeEventId(baseComponents);
    const id2 = computeEventId(baseComponents);
    expect(id1).toBe(id2);
  });

  it("different orgId produces different ID", () => {
    const id1 = computeEventId(baseComponents);
    const id2 = computeEventId({ ...baseComponents, orgId: "org-other" });
    expect(id1).not.toBe(id2);
  });

  it("different type produces different ID", () => {
    const id1 = computeEventId(baseComponents);
    const id2 = computeEventId({ ...baseComponents, type: "aigrc.asset.updated" });
    expect(id1).not.toBe(id2);
  });

  it("timestamps within 10ms produce same ID", () => {
    const id1 = computeEventId({
      ...baseComponents,
      timestamp: "2026-02-24T12:00:00.101Z",
    });
    const id2 = computeEventId({
      ...baseComponents,
      timestamp: "2026-02-24T12:00:00.105Z",
    });
    expect(id1).toBe(id2);
  });

  it("timestamps in different 10ms windows produce different IDs", () => {
    const id1 = computeEventId({
      ...baseComponents,
      timestamp: "2026-02-24T12:00:00.099Z",
    });
    const id2 = computeEventId({
      ...baseComponents,
      timestamp: "2026-02-24T12:00:00.100Z",
    });
    expect(id1).not.toBe(id2);
  });
});

describe("computeEventId — High-Frequency Path", () => {
  const baseComponents: HighFrequencyIdComponents = {
    instanceId: "inst-runtime-001",
    type: "aigrc.enforcement.decision",
    assetId: "aigrc-2024-a1b2c3d4",
    timestamp: "2026-02-24T12:00:00.123Z",
    localSeq: 1,
  };

  it("produces a valid event ID format", () => {
    const id = computeEventId(baseComponents);
    expect(id).toMatch(/^evt_[a-f0-9]{32}$/);
  });

  it("is deterministic", () => {
    const id1 = computeEventId(baseComponents);
    const id2 = computeEventId(baseComponents);
    expect(id1).toBe(id2);
  });

  it("different localSeq produces different ID", () => {
    const id1 = computeEventId(baseComponents);
    const id2 = computeEventId({ ...baseComponents, localSeq: 2 });
    expect(id1).not.toBe(id2);
  });

  it("uses 1ms precision (not 10ms)", () => {
    // These two are 1ms apart — should produce different IDs
    const id1 = computeEventId({
      ...baseComponents,
      timestamp: "2026-02-24T12:00:00.123Z",
    });
    const id2 = computeEventId({
      ...baseComponents,
      timestamp: "2026-02-24T12:00:00.124Z",
    });
    expect(id1).not.toBe(id2);
  });

  it("generates unique IDs for 1000 sequential events", () => {
    const ids = new Set<string>();
    for (let i = 0; i < 1000; i++) {
      ids.add(computeEventId({ ...baseComponents, localSeq: i }));
    }
    expect(ids.size).toBe(1000);
  });
});

describe("isValidEventId", () => {
  it("accepts valid event ID", () => {
    expect(isValidEventId("evt_a3f8c2e1d94b7f63a2891c04e5d6b7f8")).toBe(true);
  });

  it("rejects missing prefix", () => {
    expect(isValidEventId("a3f8c2e1d94b7f63a2891c04e5d6b7f8")).toBe(false);
  });

  it("rejects wrong prefix", () => {
    expect(isValidEventId("evx_a3f8c2e1d94b7f63a2891c04e5d6b7f8")).toBe(false);
  });

  it("rejects too short hex", () => {
    expect(isValidEventId("evt_a3f8c2e1")).toBe(false);
  });

  it("rejects uppercase hex", () => {
    expect(isValidEventId("evt_A3F8C2E1D94B7F63A2891C04E5D6B7F8")).toBe(false);
  });
});
