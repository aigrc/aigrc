import { describe, it, expect, vi, beforeEach } from "vitest";
import express from "express";
import { createEventRouter } from "../src/routes/events.js";
import { requireBearerAuth } from "../src/middleware/auth.js";
import type { EventStore } from "../src/services/event-store.js";
import type { GovernanceEvent, PushResponse, BatchResponse } from "@aigrc/events";

// ─────────────────────────────────────────────────────────────────
// HELPERS
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

function createMockEventStore(): EventStore {
  return {
    store: vi.fn(),
    storeMany: vi.fn(),
    findById: vi.fn(),
    clearCache: vi.fn(),
  } as unknown as EventStore;
}

/**
 * Create a test app with auth bypass (sets req.auth directly)
 */
function createTestApp(eventStore: EventStore, orgId = "org-pangolabs") {
  const app = express();
  app.use(express.json());

  // Inject auth for testing
  app.use((req, _res, next) => {
    (req as any).auth = { orgId, type: "bearer" };
    next();
  });

  const router = createEventRouter({ eventStore });
  app.use("/v1", router);
  return app;
}

/**
 * Make an HTTP request to the test app
 */
async function request(
  app: express.Application,
  method: "get" | "post",
  path: string,
  body?: unknown,
): Promise<{ status: number; body: any }> {
  // Use a simple in-process approach: create a mock req/res
  return new Promise((resolve) => {
    const req = {
      method: method.toUpperCase(),
      url: path,
      headers: { "content-type": "application/json" },
      body,
    };

    let statusCode = 200;
    let responseBody: unknown;
    const res = {
      status(code: number) {
        statusCode = code;
        return this;
      },
      json(body: unknown) {
        responseBody = body;
        resolve({ status: statusCode, body: responseBody });
      },
      set() { return this; },
    };

    // We need a real HTTP test. Let's use native http.
    const http = require("http");
    const server = http.createServer(app);
    server.listen(0, () => {
      const port = server.address().port;
      const reqBody = body ? JSON.stringify(body) : undefined;
      const options = {
        hostname: "localhost",
        port,
        path,
        method: method.toUpperCase(),
        headers: {
          "Content-Type": "application/json",
          ...(reqBody ? { "Content-Length": Buffer.byteLength(reqBody) } : {}),
        },
      };

      const httpReq = http.request(options, (httpRes: any) => {
        let data = "";
        httpRes.on("data", (chunk: string) => (data += chunk));
        httpRes.on("end", () => {
          server.close();
          try {
            resolve({ status: httpRes.statusCode, body: JSON.parse(data) });
          } catch {
            resolve({ status: httpRes.statusCode, body: data });
          }
        });
      });

      httpReq.on("error", (err: Error) => {
        server.close();
        resolve({ status: 500, body: { error: err.message } });
      });

      if (reqBody) httpReq.write(reqBody);
      httpReq.end();
    });
  });
}

// ─────────────────────────────────────────────────────────────────
// TESTS: POST /v1/events — Sync Channel
// ─────────────────────────────────────────────────────────────────

describe("POST /v1/events — Sync Channel", () => {
  let eventStore: EventStore;
  let app: express.Application;

  beforeEach(() => {
    eventStore = createMockEventStore();
    app = createTestApp(eventStore);
  });

  it("returns 201 Created for a new valid event", async () => {
    const event = makeEvent();
    const pushResponse: PushResponse = {
      status: "accepted",
      eventId: event.id,
      receivedAt: "2026-02-24T12:00:01Z",
    };
    (eventStore.store as any).mockResolvedValue({
      response: pushResponse,
      isNew: true,
    });

    const res = await request(app, "post", "/v1/events", event);
    expect(res.status).toBe(201);
    expect(res.body.status).toBe("accepted");
    expect(res.body.eventId).toBe(event.id);
  });

  it("returns 200 OK for a duplicate event", async () => {
    const event = makeEvent();
    (eventStore.store as any).mockResolvedValue({
      response: {
        status: "accepted",
        eventId: event.id,
        receivedAt: "2026-02-24T12:00:01Z",
      },
      isNew: false,
    });

    const res = await request(app, "post", "/v1/events", event);
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("accepted");
  });

  it("returns 400 for an invalid event", async () => {
    const res = await request(app, "post", "/v1/events", {
      id: "not-valid-id",
      type: "invalid",
    });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("EVT_SCHEMA_INVALID");
  });

  it("returns 403 when event orgId does not match authenticated org", async () => {
    const event = makeEvent({ orgId: "org-other" } as any);
    const res = await request(app, "post", "/v1/events", event);
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("EVT_ORG_MISMATCH");
  });

  it("returns 400 when receivedAt is set by producer", async () => {
    const event = makeEvent({ receivedAt: "2026-02-24T12:00:00Z" } as any);
    const res = await request(app, "post", "/v1/events", event);
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("EVT_RECEIVED_AT_SET");
  });

  it("returns 500 on internal error", async () => {
    const event = makeEvent();
    (eventStore.store as any).mockRejectedValue(new Error("DB connection failed"));

    const res = await request(app, "post", "/v1/events", event);
    expect(res.status).toBe(500);
    expect(res.body.error.code).toBe("EVT_INTERNAL");
  });
});

// ─────────────────────────────────────────────────────────────────
// TESTS: POST /v1/events/batch — Batch Channel
// ─────────────────────────────────────────────────────────────────

describe("POST /v1/events/batch — Batch Channel", () => {
  let eventStore: EventStore;
  let app: express.Application;

  beforeEach(() => {
    eventStore = createMockEventStore();
    app = createTestApp(eventStore);
  });

  it("returns batch response for valid events", async () => {
    const events = [makeEvent(), makeEvent()];
    const batchResponse: BatchResponse = {
      accepted: 2,
      rejected: 0,
      duplicate: 0,
      results: events.map((e) => ({
        id: e.id,
        status: "created" as const,
        receivedAt: "2026-02-24T12:00:01Z",
      })),
    };
    (eventStore.storeMany as any).mockResolvedValue(batchResponse);

    const res = await request(app, "post", "/v1/events/batch", events);
    expect(res.status).toBe(200);
    expect(res.body.accepted).toBe(2);
    expect(res.body.rejected).toBe(0);
  });

  it("returns 400 when body is not an array", async () => {
    const res = await request(app, "post", "/v1/events/batch", { not: "array" });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("EVT_SCHEMA_INVALID");
  });

  it("returns 413 when batch exceeds 1000 events", async () => {
    // Create a small event to reduce payload size, with unique IDs to hit 1001
    const smallEvent = { ...makeEvent() };
    const events = Array.from({ length: 1001 }, (_, i) => ({
      ...smallEvent,
      id: `evt_${String(i).padStart(32, "0")}`,
    }));

    // Need to increase body limit for this test to reach the handler
    const bigApp = express();
    bigApp.use(express.json({ limit: "10mb" }));
    bigApp.use((req, _res, next) => {
      (req as any).auth = { orgId: "org-pangolabs", type: "bearer" };
      next();
    });
    const router = createEventRouter({ eventStore });
    bigApp.use("/v1", router);

    const res = await request(bigApp, "post", "/v1/events/batch", events);
    expect(res.status).toBe(413);
    expect(res.body.error.code).toBe("EVT_BATCH_TOO_LARGE");
  });

  it("rejects individual invalid events without blocking valid ones", async () => {
    const validEvent = makeEvent();
    const invalidEvent = { id: "bad", type: "nope" };

    const batchResponse: BatchResponse = {
      accepted: 1,
      rejected: 0,
      duplicate: 0,
      results: [{ id: validEvent.id, status: "created", receivedAt: "2026-02-24T12:00:01Z" }],
    };
    (eventStore.storeMany as any).mockResolvedValue(batchResponse);

    const res = await request(app, "post", "/v1/events/batch", [invalidEvent, validEvent]);
    expect(res.status).toBe(200);
    // 1 rejected (invalid) + 1 accepted (valid)
    expect(res.body.accepted).toBe(1);
    expect(res.body.rejected).toBe(1);
  });

  it("rejects events with mismatched orgId", async () => {
    const event = makeEvent({ orgId: "org-other" } as any);
    const res = await request(app, "post", "/v1/events/batch", [event]);
    expect(res.status).toBe(200);
    expect(res.body.rejected).toBe(1);
    expect(res.body.results[0].error.code).toBe("EVT_ORG_MISMATCH");
  });
});

// ─────────────────────────────────────────────────────────────────
// TESTS: GET /v1/health
// ─────────────────────────────────────────────────────────────────

describe("GET /v1/health", () => {
  it("returns 200 with status ok", async () => {
    const eventStore = createMockEventStore();
    const app = createTestApp(eventStore);

    const res = await request(app, "get", "/v1/health");
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("ok");
    expect(res.body.service).toBe("aigrc-event-service");
  });
});

// ─────────────────────────────────────────────────────────────────
// TESTS: Authentication
// ─────────────────────────────────────────────────────────────────

describe("Authentication", () => {
  it("returns 401 when no auth is provided", async () => {
    const eventStore = createMockEventStore();
    // Create app WITHOUT auth injection
    const app = express();
    app.use(express.json());
    const router = createEventRouter({ eventStore });
    app.use("/v1", router);

    const event = makeEvent();
    const res = await request(app, "post", "/v1/events", event);
    expect(res.status).toBe(401);
  });
});
