import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { EventBuffer } from "../src/buffer";
import { AigosClient } from "../src/client";
import type { GovernanceEvent } from "../src/schemas/event-envelope";
import type { PushResponse, BatchResponse } from "../src/schemas/responses";

// ─────────────────────────────────────────────────────────────────
// MOCKS
// ─────────────────────────────────────────────────────────────────

function makeEvent(overrides: Partial<GovernanceEvent> = {}): GovernanceEvent {
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
    hash: "sha256:a3f8c2e1d94b7f63a2891c04e5d6b7f8a3f8c2e1d94b7f63a2891c04e5d6b7f8",
    data: { cardId: "card-001", cardVersion: "1.0.0" },
    ...overrides,
  } as GovernanceEvent;
}

function makePushResponse(eventId: string): PushResponse {
  return {
    status: "accepted",
    eventId,
    receivedAt: "2026-02-24T12:00:01Z",
  };
}

function makeBatchResponse(count: number): BatchResponse {
  return {
    accepted: count,
    rejected: 0,
    duplicate: 0,
    results: Array.from({ length: count }, (_, i) => ({
      id: `evt_${"a".repeat(30)}${String(i).padStart(2, "0")}`,
      status: "created" as const,
      receivedAt: "2026-02-24T12:00:01Z",
    })),
  };
}

function createMockClient(): AigosClient {
  const client = Object.create(AigosClient.prototype);
  client.push = vi.fn().mockResolvedValue(makePushResponse("evt_test00000000000000000000000000"));
  client.pushBatch = vi.fn().mockImplementation((events: GovernanceEvent[]) =>
    Promise.resolve(makeBatchResponse(events.length))
  );
  client.send = vi.fn();
  client.healthCheck = vi.fn();
  client.dispose = vi.fn();
  return client;
}

// ─────────────────────────────────────────────────────────────────
// TESTS
// ─────────────────────────────────────────────────────────────────

describe("EventBuffer", () => {
  let mockClient: AigosClient;

  beforeEach(() => {
    vi.useFakeTimers();
    mockClient = createMockClient();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // ─── Basic Buffering ─────────────────────────────────────────

  it("buffers events without flushing when under maxSize", async () => {
    const buffer = new EventBuffer({
      client: mockClient,
      maxSize: 10,
      flushIntervalMs: 0, // Disable timer
    });

    buffer.add(makeEvent());
    buffer.add(makeEvent());

    expect(buffer.size).toBe(2);
    expect(mockClient.push).not.toHaveBeenCalled();
    expect(mockClient.pushBatch).not.toHaveBeenCalled();

    await buffer.dispose();
  });

  it("reports correct size after add", () => {
    const buffer = new EventBuffer({
      client: mockClient,
      maxSize: 100,
      flushIntervalMs: 0,
    });

    expect(buffer.size).toBe(0);
    buffer.add(makeEvent());
    expect(buffer.size).toBe(1);
    buffer.add(makeEvent());
    expect(buffer.size).toBe(2);

    // Don't wait for flush
    void buffer.dispose();
  });

  it("addMany adds multiple events", () => {
    const buffer = new EventBuffer({
      client: mockClient,
      maxSize: 100,
      flushIntervalMs: 0,
    });

    buffer.addMany([makeEvent(), makeEvent(), makeEvent()]);
    expect(buffer.size).toBe(3);

    void buffer.dispose();
  });

  // ─── Auto-Flush on maxSize ──────────────────────────────────

  it("auto-flushes when buffer reaches maxSize", async () => {
    const buffer = new EventBuffer({
      client: mockClient,
      maxSize: 3,
      flushIntervalMs: 0,
    });

    buffer.add(makeEvent());
    buffer.add(makeEvent());

    expect(mockClient.pushBatch).not.toHaveBeenCalled();

    // This should trigger flush
    buffer.add(makeEvent());

    // Wait for the async flush to complete
    await vi.advanceTimersByTimeAsync(0);

    expect(mockClient.pushBatch).toHaveBeenCalledOnce();
    expect((mockClient.pushBatch as any).mock.calls[0][0]).toHaveLength(3);
    expect(buffer.size).toBe(0);

    await buffer.dispose();
  });

  // ─── Auto-Flush on Timer ────────────────────────────────────

  it("auto-flushes on timer interval", async () => {
    const buffer = new EventBuffer({
      client: mockClient,
      maxSize: 100, // Won't trigger on size
      flushIntervalMs: 5000,
    });

    buffer.add(makeEvent());
    buffer.add(makeEvent());

    expect(mockClient.pushBatch).not.toHaveBeenCalled();

    // Advance timer
    await vi.advanceTimersByTimeAsync(5000);

    expect(mockClient.pushBatch).toHaveBeenCalledOnce();
    expect(buffer.size).toBe(0);

    await buffer.dispose();
  });

  it("does not flush on timer if buffer is empty", async () => {
    const buffer = new EventBuffer({
      client: mockClient,
      maxSize: 100,
      flushIntervalMs: 5000,
    });

    await vi.advanceTimersByTimeAsync(5000);

    expect(mockClient.push).not.toHaveBeenCalled();
    expect(mockClient.pushBatch).not.toHaveBeenCalled();

    await buffer.dispose();
  });

  // ─── Critical Event Flush ──────────────────────────────────

  it("immediately flushes on critical event when flushOnCritical is true", async () => {
    const buffer = new EventBuffer({
      client: mockClient,
      maxSize: 100,
      flushIntervalMs: 0,
      flushOnCritical: true,
    });

    buffer.add(makeEvent()); // Normal event buffered
    buffer.add(makeEvent({ criticality: "critical" } as any));

    // Wait for async flush
    await vi.advanceTimersByTimeAsync(0);

    // Both events flushed together
    expect(mockClient.pushBatch).toHaveBeenCalledOnce();
    expect((mockClient.pushBatch as any).mock.calls[0][0]).toHaveLength(2);

    await buffer.dispose();
  });

  it("does NOT immediately flush critical events when flushOnCritical is false", () => {
    const buffer = new EventBuffer({
      client: mockClient,
      maxSize: 100,
      flushIntervalMs: 0,
      flushOnCritical: false,
    });

    buffer.add(makeEvent({ criticality: "critical" } as any));

    expect(mockClient.push).not.toHaveBeenCalled();
    expect(mockClient.pushBatch).not.toHaveBeenCalled();
    expect(buffer.size).toBe(1);

    void buffer.dispose();
  });

  // ─── Manual Flush ──────────────────────────────────────────

  it("flush() sends single event via push()", async () => {
    const buffer = new EventBuffer({
      client: mockClient,
      maxSize: 100,
      flushIntervalMs: 0,
    });

    buffer.add(makeEvent());
    const result = await buffer.flush();

    expect(mockClient.push).toHaveBeenCalledOnce();
    expect(mockClient.pushBatch).not.toHaveBeenCalled();
    expect(result).toBeDefined();
    expect(buffer.size).toBe(0);

    await buffer.dispose();
  });

  it("flush() sends multiple events via pushBatch()", async () => {
    const buffer = new EventBuffer({
      client: mockClient,
      maxSize: 100,
      flushIntervalMs: 0,
    });

    buffer.addMany([makeEvent(), makeEvent(), makeEvent()]);
    const result = await buffer.flush();

    expect(mockClient.pushBatch).toHaveBeenCalledOnce();
    expect(mockClient.push).not.toHaveBeenCalled();
    expect(result).toBeDefined();
    expect((result as BatchResponse).accepted).toBe(3);

    await buffer.dispose();
  });

  it("flush() returns null for empty buffer", async () => {
    const buffer = new EventBuffer({
      client: mockClient,
      maxSize: 100,
      flushIntervalMs: 0,
    });

    const result = await buffer.flush();
    expect(result).toBeNull();

    await buffer.dispose();
  });

  // ─── Chunked Flush ─────────────────────────────────────────

  it("splits large batches into chunks of maxBatchSize", async () => {
    const buffer = new EventBuffer({
      client: mockClient,
      maxSize: 2500, // High so auto-flush doesn't trigger
      flushIntervalMs: 0,
      maxBatchSize: 100,
    });

    // Add 250 events
    const events = Array.from({ length: 250 }, () => makeEvent());
    buffer.addMany(events);

    await buffer.flush();

    // Should be called 3 times (100, 100, 50)
    expect(mockClient.pushBatch).toHaveBeenCalledTimes(3);
    expect((mockClient.pushBatch as any).mock.calls[0][0]).toHaveLength(100);
    expect((mockClient.pushBatch as any).mock.calls[1][0]).toHaveLength(100);
    expect((mockClient.pushBatch as any).mock.calls[2][0]).toHaveLength(50);

    await buffer.dispose();
  });

  // ─── Error Handling ────────────────────────────────────────

  it("calls onFlushError when flush fails", async () => {
    const onFlushError = vi.fn();
    const flushError = new Error("Network error");
    (mockClient.push as any).mockRejectedValueOnce(flushError);

    const buffer = new EventBuffer({
      client: mockClient,
      maxSize: 100,
      flushIntervalMs: 0,
      onFlushError,
    });

    buffer.add(makeEvent());

    await expect(buffer.flush()).rejects.toThrow("Network error");
    expect(onFlushError).toHaveBeenCalledOnce();
    expect(onFlushError).toHaveBeenCalledWith(flushError, expect.any(Array));

    await buffer.dispose();
  });

  it("does not re-buffer events after flush failure", async () => {
    (mockClient.push as any).mockRejectedValueOnce(new Error("fail"));

    const buffer = new EventBuffer({
      client: mockClient,
      maxSize: 100,
      flushIntervalMs: 0,
      onFlushError: vi.fn(),
    });

    buffer.add(makeEvent());
    expect(buffer.size).toBe(1);

    try {
      await buffer.flush();
    } catch {
      // Expected
    }

    // Buffer should be empty — events are NOT re-buffered
    expect(buffer.size).toBe(0);

    await buffer.dispose();
  });

  // ─── Dispose ──────────────────────────────────────────────

  it("dispose() flushes remaining events", async () => {
    const buffer = new EventBuffer({
      client: mockClient,
      maxSize: 100,
      flushIntervalMs: 0,
    });

    buffer.add(makeEvent());
    buffer.add(makeEvent());
    expect(buffer.size).toBe(2);

    await buffer.dispose();

    expect(mockClient.pushBatch).toHaveBeenCalledOnce();
    expect(buffer.size).toBe(0);
  });

  it("dispose() stops the timer", async () => {
    const buffer = new EventBuffer({
      client: mockClient,
      maxSize: 100,
      flushIntervalMs: 5000,
    });

    await buffer.dispose();

    // Add an event after dispose should throw
    expect(() => buffer.add(makeEvent())).toThrow("disposed");
  });

  it("add() throws after dispose()", async () => {
    const buffer = new EventBuffer({
      client: mockClient,
      maxSize: 100,
      flushIntervalMs: 0,
    });

    await buffer.dispose();

    expect(() => buffer.add(makeEvent())).toThrow("EventBuffer has been disposed");
  });

  it("addMany() throws after dispose()", async () => {
    const buffer = new EventBuffer({
      client: mockClient,
      maxSize: 100,
      flushIntervalMs: 0,
    });

    await buffer.dispose();

    expect(() => buffer.addMany([makeEvent()])).toThrow("EventBuffer has been disposed");
  });

  it("multiple dispose() calls are safe", async () => {
    const buffer = new EventBuffer({
      client: mockClient,
      maxSize: 100,
      flushIntervalMs: 0,
    });

    await buffer.dispose();
    await buffer.dispose(); // Should not throw
  });

  // ─── Pending Count ─────────────────────────────────────────

  it("pending includes buffer + in-flight count", () => {
    const buffer = new EventBuffer({
      client: mockClient,
      maxSize: 100,
      flushIntervalMs: 0,
    });

    buffer.add(makeEvent());
    buffer.add(makeEvent());
    expect(buffer.pending).toBe(2);

    void buffer.dispose();
  });

  // ─── ClientConfig Constructor ──────────────────────────────

  it("accepts ClientConfig instead of AigosClient instance", async () => {
    // Stub global fetch for this test
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 201,
      headers: new Map(),
      json: () => Promise.resolve(makePushResponse("evt_test00000000000000000000000000")),
    });
    vi.stubGlobal("fetch", mockFetch);

    const buffer = new EventBuffer({
      client: {
        apiUrl: "https://api.aigos.dev",
        apiKey: "ak_test_key",
      },
      maxSize: 100,
      flushIntervalMs: 0,
    });

    buffer.add(makeEvent());
    await buffer.flush();

    expect(mockFetch).toHaveBeenCalled();

    vi.unstubAllGlobals();
    await buffer.dispose();
  });
});
