import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { AigosClient, AigosClientError, AigosRateLimitError } from "../src/client";
import type { ClientConfig } from "../src/client";
import type { GovernanceEvent } from "../src/schemas/event-envelope";

// ─────────────────────────────────────────────────────────────────
// MOCKS
// ─────────────────────────────────────────────────────────────────

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

const CLIENT_CONFIG: ClientConfig = {
  apiUrl: "https://api.aigos.dev",
  apiKey: "ak_test_key_123",
  timeout: 5000,
  maxRetries: 2,
};

function makePushResponse(eventId: string) {
  return {
    status: "accepted",
    eventId,
    receivedAt: "2026-02-24T12:00:01Z",
  };
}

function makeBatchResponse(count: number) {
  return {
    accepted: count,
    rejected: 0,
    duplicate: 0,
    results: Array.from({ length: count }, (_, i) => ({
      id: `evt_${"a".repeat(32).slice(0, 30)}${String(i).padStart(2, "0")}`,
      status: "created",
      receivedAt: "2026-02-24T12:00:01Z",
    })),
  };
}

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

function mockResponse(status: number, body: unknown, headers?: Record<string, string>) {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: new Map(Object.entries(headers ?? {})),
    json: vi.fn().mockResolvedValue(body),
  };
}

// ─────────────────────────────────────────────────────────────────
// SETUP
// ─────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

// ─────────────────────────────────────────────────────────────────
// PUSH (Sync Channel)
// ─────────────────────────────────────────────────────────────────

describe("AigosClient — push()", () => {
  it("sends POST to /v1/events with correct headers", async () => {
    const response = makePushResponse("evt_a3f8c2e1d94b7f63a2891c04e5d6b7f8");
    mockFetch.mockResolvedValueOnce(mockResponse(201, response));

    const client = new AigosClient(CLIENT_CONFIG);
    const event = makeEvent();
    await client.push(event);

    expect(mockFetch).toHaveBeenCalledOnce();
    const [url, options] = mockFetch.mock.calls[0];
    expect(url).toBe("https://api.aigos.dev/v1/events");
    expect(options.method).toBe("POST");
    expect(options.headers["Content-Type"]).toBe("application/json");
    expect(options.headers["Authorization"]).toBe("Bearer ak_test_key_123");
  });

  it("returns parsed PushResponse", async () => {
    const response = makePushResponse("evt_a3f8c2e1d94b7f63a2891c04e5d6b7f8");
    mockFetch.mockResolvedValueOnce(mockResponse(201, response));

    const client = new AigosClient(CLIENT_CONFIG);
    const result = await client.push(makeEvent());

    expect(result.status).toBe("accepted");
    expect(result.eventId).toBe("evt_a3f8c2e1d94b7f63a2891c04e5d6b7f8");
    expect(result.receivedAt).toBe("2026-02-24T12:00:01Z");
  });

  it("treats 200 OK (duplicate) as success", async () => {
    const response = makePushResponse("evt_a3f8c2e1d94b7f63a2891c04e5d6b7f8");
    mockFetch.mockResolvedValueOnce(mockResponse(200, response));

    const client = new AigosClient(CLIENT_CONFIG);
    const result = await client.push(makeEvent());
    expect(result.status).toBe("accepted");
  });

  it("includes custom headers", async () => {
    const response = makePushResponse("evt_a3f8c2e1d94b7f63a2891c04e5d6b7f8");
    mockFetch.mockResolvedValueOnce(mockResponse(201, response));

    const client = new AigosClient({
      ...CLIENT_CONFIG,
      headers: { "X-Custom": "value" },
    });
    await client.push(makeEvent());

    const [, options] = mockFetch.mock.calls[0];
    expect(options.headers["X-Custom"]).toBe("value");
  });
});

// ─────────────────────────────────────────────────────────────────
// PUSH BATCH (Batch Channel)
// ─────────────────────────────────────────────────────────────────

describe("AigosClient — pushBatch()", () => {
  it("sends POST to /v1/events/batch", async () => {
    const response = makeBatchResponse(3);
    mockFetch.mockResolvedValueOnce(mockResponse(200, response));

    const client = new AigosClient(CLIENT_CONFIG);
    const events = [makeEvent(), makeEvent(), makeEvent()];
    await client.pushBatch(events);

    const [url, options] = mockFetch.mock.calls[0];
    expect(url).toBe("https://api.aigos.dev/v1/events/batch");
    expect(options.method).toBe("POST");
  });

  it("returns parsed BatchResponse", async () => {
    const response = makeBatchResponse(3);
    mockFetch.mockResolvedValueOnce(mockResponse(200, response));

    const client = new AigosClient(CLIENT_CONFIG);
    const result = await client.pushBatch([makeEvent(), makeEvent(), makeEvent()]);

    expect(result.accepted).toBe(3);
    expect(result.rejected).toBe(0);
    expect(result.results).toHaveLength(3);
  });

  it("rejects batch > 1000 events", async () => {
    const client = new AigosClient(CLIENT_CONFIG);
    const events = Array.from({ length: 1001 }, () => makeEvent());

    await expect(client.pushBatch(events)).rejects.toThrow("exceeds maximum of 1000");
  });
});

// ─────────────────────────────────────────────────────────────────
// SEND (Auto Channel Selection)
// ─────────────────────────────────────────────────────────────────

describe("AigosClient — send()", () => {
  it("single event uses Sync channel", async () => {
    const response = makePushResponse("evt_a3f8c2e1d94b7f63a2891c04e5d6b7f8");
    mockFetch.mockResolvedValueOnce(mockResponse(201, response));

    const client = new AigosClient(CLIENT_CONFIG);
    await client.send(makeEvent());

    const [url] = mockFetch.mock.calls[0];
    expect(url).toBe("https://api.aigos.dev/v1/events");
  });

  it("array of events uses Batch channel", async () => {
    const response = makeBatchResponse(3);
    mockFetch.mockResolvedValueOnce(mockResponse(200, response));

    const client = new AigosClient(CLIENT_CONFIG);
    await client.send([makeEvent(), makeEvent(), makeEvent()]);

    const [url] = mockFetch.mock.calls[0];
    expect(url).toBe("https://api.aigos.dev/v1/events/batch");
  });

  it("critical events extracted and sent via Sync", async () => {
    // Critical event gets Sync, non-critical get Batch
    const pushResponse = makePushResponse("evt_critical");
    const batchResponse = makeBatchResponse(2);
    mockFetch
      .mockResolvedValueOnce(mockResponse(201, pushResponse))   // Critical sync
      .mockResolvedValueOnce(mockResponse(200, batchResponse)); // Batch

    const client = new AigosClient(CLIENT_CONFIG);
    const criticalEvent = makeEvent({ criticality: "critical", id: "evt_critical000000000000000000000" } as any);
    const normalEvent1 = makeEvent();
    const normalEvent2 = makeEvent();

    await client.send([criticalEvent, normalEvent1, normalEvent2]);

    // First call: Sync for critical
    expect(mockFetch.mock.calls[0][0]).toBe("https://api.aigos.dev/v1/events");
    // Second call: Batch for the rest
    expect(mockFetch.mock.calls[1][0]).toBe("https://api.aigos.dev/v1/events/batch");
  });

  it("empty array returns empty batch response", async () => {
    const client = new AigosClient(CLIENT_CONFIG);
    const result = await client.send([]);

    expect(result).toEqual({ accepted: 0, rejected: 0, duplicate: 0, results: [] });
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("single-element array uses Sync channel", async () => {
    const response = makePushResponse("evt_a3f8c2e1d94b7f63a2891c04e5d6b7f8");
    mockFetch.mockResolvedValueOnce(mockResponse(201, response));

    const client = new AigosClient(CLIENT_CONFIG);
    await client.send([makeEvent()]);

    const [url] = mockFetch.mock.calls[0];
    expect(url).toBe("https://api.aigos.dev/v1/events");
  });
});

// ─────────────────────────────────────────────────────────────────
// ERROR HANDLING
// ─────────────────────────────────────────────────────────────────

describe("AigosClient — Error Handling", () => {
  it("throws AigosClientError on 401", async () => {
    mockFetch.mockResolvedValueOnce(
      mockResponse(401, { error: "Unauthorized" })
    );

    const client = new AigosClient(CLIENT_CONFIG);
    await expect(client.push(makeEvent())).rejects.toThrow(AigosClientError);
  });

  it("throws AigosClientError on 400 with response body", async () => {
    const body = { error: { code: "EVT_ID_INVALID", message: "Bad ID" } };
    mockFetch.mockResolvedValueOnce(mockResponse(400, body));

    const client = new AigosClient(CLIENT_CONFIG);

    try {
      await client.push(makeEvent());
      expect.unreachable("should have thrown");
    } catch (e) {
      expect(e).toBeInstanceOf(AigosClientError);
      const err = e as AigosClientError;
      expect(err.statusCode).toBe(400);
      expect(err.response).toEqual(body);
    }
  });

  it("throws AigosRateLimitError on 429 with Retry-After", async () => {
    mockFetch.mockResolvedValueOnce(
      mockResponse(429, { error: "rate limited" }, { "Retry-After": "30" })
    );

    const client = new AigosClient(CLIENT_CONFIG);

    try {
      await client.push(makeEvent());
      expect.unreachable("should have thrown");
    } catch (e) {
      expect(e).toBeInstanceOf(AigosRateLimitError);
      const err = e as AigosRateLimitError;
      expect(err.retryAfter).toBe(30);
      expect(err.statusCode).toBe(429);
    }
  });
});

// ─────────────────────────────────────────────────────────────────
// RETRY LOGIC
// ─────────────────────────────────────────────────────────────────

describe("AigosClient — Retry Logic", () => {
  it("retries on 500 with exponential backoff", async () => {
    vi.useRealTimers(); // Use real timers for this test

    const successResponse = makePushResponse("evt_a3f8c2e1d94b7f63a2891c04e5d6b7f8");

    // Override sleep to not actually wait
    const originalSleep = AigosClient.prototype["sleep" as keyof AigosClient];
    const sleepSpy = vi.fn().mockResolvedValue(undefined);
    (AigosClient.prototype as any).sleep = sleepSpy;

    mockFetch
      .mockResolvedValueOnce(mockResponse(500, { error: "Internal Server Error" }))
      .mockResolvedValueOnce(mockResponse(201, successResponse));

    const client = new AigosClient(CLIENT_CONFIG);
    const result = await client.push(makeEvent());

    expect(result.status).toBe("accepted");
    expect(mockFetch).toHaveBeenCalledTimes(2);
    expect(sleepSpy).toHaveBeenCalledWith(1000); // 2^0 * 1000

    // Restore
    (AigosClient.prototype as any).sleep = originalSleep;
  });

  it("throws after max retries exhausted", async () => {
    vi.useRealTimers(); // Use real timers for this test

    // Override sleep to not actually wait
    const originalSleep = AigosClient.prototype["sleep" as keyof AigosClient];
    const sleepSpy = vi.fn().mockResolvedValue(undefined);
    (AigosClient.prototype as any).sleep = sleepSpy;

    // 3 attempts total (1 initial + 2 retries)
    mockFetch
      .mockResolvedValueOnce(mockResponse(503, { error: "Service Unavailable" }))
      .mockResolvedValueOnce(mockResponse(503, { error: "Service Unavailable" }))
      .mockResolvedValueOnce(mockResponse(503, { error: "Service Unavailable" }));

    const client = new AigosClient(CLIENT_CONFIG);

    await expect(client.push(makeEvent())).rejects.toThrow(AigosClientError);
    expect(mockFetch).toHaveBeenCalledTimes(3);
    expect(sleepSpy).toHaveBeenCalledTimes(2); // 2 backoff sleeps

    // Restore
    (AigosClient.prototype as any).sleep = originalSleep;
  });
});

// ─────────────────────────────────────────────────────────────────
// HEALTH CHECK
// ─────────────────────────────────────────────────────────────────

describe("AigosClient — healthCheck()", () => {
  it("returns true when GET /v1/health returns 200", async () => {
    mockFetch.mockResolvedValueOnce(mockResponse(200, { status: "ok" }));

    const client = new AigosClient(CLIENT_CONFIG);
    const healthy = await client.healthCheck();

    expect(healthy).toBe(true);
    const [url] = mockFetch.mock.calls[0];
    expect(url).toBe("https://api.aigos.dev/v1/health");
  });

  it("returns false when health check fails", async () => {
    mockFetch.mockResolvedValueOnce(mockResponse(503, { status: "unhealthy" }));

    const client = new AigosClient(CLIENT_CONFIG);
    const healthy = await client.healthCheck();
    expect(healthy).toBe(false);
  });

  it("returns false on network error", async () => {
    mockFetch.mockRejectedValueOnce(new Error("network error"));

    const client = new AigosClient(CLIENT_CONFIG);
    const healthy = await client.healthCheck();
    expect(healthy).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────
// LIFECYCLE
// ─────────────────────────────────────────────────────────────────

describe("AigosClient — Lifecycle", () => {
  it("dispose() is callable", () => {
    const client = new AigosClient(CLIENT_CONFIG);
    expect(() => client.dispose()).not.toThrow();
  });

  it("strips trailing slash from apiUrl", async () => {
    mockFetch.mockResolvedValueOnce(
      mockResponse(201, makePushResponse("evt_test"))
    );

    const client = new AigosClient({ ...CLIENT_CONFIG, apiUrl: "https://api.aigos.dev/" });
    await client.push(makeEvent());

    const [url] = mockFetch.mock.calls[0];
    expect(url).toBe("https://api.aigos.dev/v1/events");
  });
});
