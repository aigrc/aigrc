import { describe, it, expect, vi, beforeEach } from "vitest";
import express from "express";
import { createEventRouter } from "../src/routes/events.js";
import type { EventStore } from "../src/services/event-store.js";
import type { GovernanceEvent } from "@aigrc/events";

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
    listEvents: vi.fn(),
    listAssets: vi.fn(),
    getAssetEvents: vi.fn(),
  } as unknown as EventStore;
}

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

async function request(
  app: express.Application,
  method: "get" | "post",
  path: string,
  body?: unknown,
): Promise<{ status: number; body: any }> {
  return new Promise((resolve) => {
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
// TESTS: GET /v1/events — List Events
// ─────────────────────────────────────────────────────────────────

describe("GET /v1/events — List Events", () => {
  let eventStore: EventStore;
  let app: express.Application;

  beforeEach(() => {
    eventStore = createMockEventStore();
    app = createTestApp(eventStore);
  });

  it("returns paginated events", async () => {
    const events = [makeEvent(), makeEvent({ id: "evt_b3f8c2e1d94b7f63a2891c04e5d6b7f8" } as any)];
    (eventStore.listEvents as any).mockResolvedValue({ events, total: 2 });

    const res = await request(app, "get", "/v1/events");
    expect(res.status).toBe(200);
    expect(res.body.events).toHaveLength(2);
    expect(res.body.total).toBe(2);
    expect(res.body.limit).toBe(20);
    expect(res.body.offset).toBe(0);
  });

  it("passes filter parameters to EventStore", async () => {
    (eventStore.listEvents as any).mockResolvedValue({ events: [], total: 0 });

    await request(app, "get", "/v1/events?asset_id=my-asset&type=aigrc.asset.created&criticality=high&since=2026-01-01T00:00:00Z&limit=10&offset=5");

    expect(eventStore.listEvents).toHaveBeenCalledWith(
      "org-pangolabs",
      expect.objectContaining({
        assetId: "my-asset",
        type: "aigrc.asset.created",
        criticality: "high",
        since: "2026-01-01T00:00:00Z",
        limit: 10,
        offset: 5,
      }),
    );
  });

  it("returns empty list with total 0 when no events", async () => {
    (eventStore.listEvents as any).mockResolvedValue({ events: [], total: 0 });

    const res = await request(app, "get", "/v1/events");
    expect(res.status).toBe(200);
    expect(res.body.events).toHaveLength(0);
    expect(res.body.total).toBe(0);
  });

  it("returns 401 when no auth", async () => {
    const noAuthApp = express();
    noAuthApp.use(express.json());
    const router = createEventRouter({ eventStore });
    noAuthApp.use("/v1", router);

    const res = await request(noAuthApp, "get", "/v1/events");
    expect(res.status).toBe(401);
  });
});

// ─────────────────────────────────────────────────────────────────
// TESTS: GET /v1/events/:id — Single Event
// ─────────────────────────────────────────────────────────────────

describe("GET /v1/events/:id — Single Event", () => {
  let eventStore: EventStore;
  let app: express.Application;

  beforeEach(() => {
    eventStore = createMockEventStore();
    app = createTestApp(eventStore);
  });

  it("returns event by ID", async () => {
    const event = makeEvent();
    (eventStore.findById as any).mockResolvedValue(event);

    const res = await request(app, "get", `/v1/events/${event.id}`);
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(event.id);
    expect(res.body.type).toBe("aigrc.asset.created");
  });

  it("returns 404 for unknown event", async () => {
    (eventStore.findById as any).mockResolvedValue(null);

    const res = await request(app, "get", "/v1/events/evt_00000000000000000000000000000000");
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe("EVT_NOT_FOUND");
  });

  it("returns 404 when event belongs to different org", async () => {
    const event = makeEvent({ orgId: "org-other" } as any);
    (eventStore.findById as any).mockResolvedValue(event);

    const res = await request(app, "get", `/v1/events/${event.id}`);
    expect(res.status).toBe(404); // 404 not 403 to prevent enumeration
  });
});

// ─────────────────────────────────────────────────────────────────
// TESTS: GET /v1/assets — List Assets
// ─────────────────────────────────────────────────────────────────

describe("GET /v1/assets — List Assets", () => {
  let eventStore: EventStore;
  let app: express.Application;

  beforeEach(() => {
    eventStore = createMockEventStore();
    app = createTestApp(eventStore);
  });

  it("returns asset summaries", async () => {
    (eventStore.listAssets as any).mockResolvedValue({
      assets: [
        {
          assetId: "asset-001",
          lastEventAt: "2026-02-24T12:00:00Z",
          eventCount: 5,
          latestType: "aigrc.asset.updated",
        },
      ],
      total: 1,
    });

    const res = await request(app, "get", "/v1/assets");
    expect(res.status).toBe(200);
    expect(res.body.assets).toHaveLength(1);
    expect(res.body.assets[0].assetId).toBe("asset-001");
    expect(res.body.assets[0].eventCount).toBe(5);
    expect(res.body.total).toBe(1);
  });

  it("passes pagination parameters", async () => {
    (eventStore.listAssets as any).mockResolvedValue({ assets: [], total: 0 });

    await request(app, "get", "/v1/assets?limit=5&offset=10");

    expect(eventStore.listAssets).toHaveBeenCalledWith(
      "org-pangolabs",
      expect.objectContaining({ limit: 5, offset: 10 }),
    );
  });
});

// ─────────────────────────────────────────────────────────────────
// TESTS: GET /v1/assets/:assetId/events — Asset Events
// ─────────────────────────────────────────────────────────────────

describe("GET /v1/assets/:assetId/events — Asset Events", () => {
  let eventStore: EventStore;
  let app: express.Application;

  beforeEach(() => {
    eventStore = createMockEventStore();
    app = createTestApp(eventStore);
  });

  it("returns events for specific asset", async () => {
    const events = [makeEvent()];
    (eventStore.getAssetEvents as any).mockResolvedValue({ events, total: 1 });

    const res = await request(app, "get", "/v1/assets/aigrc-2024-a1b2c3d4/events");
    expect(res.status).toBe(200);
    expect(res.body.events).toHaveLength(1);
    expect(res.body.total).toBe(1);
  });

  it("passes assetId and filters to EventStore", async () => {
    (eventStore.getAssetEvents as any).mockResolvedValue({ events: [], total: 0 });

    await request(app, "get", "/v1/assets/my-asset/events?type=aigrc.scan.completed&limit=5");

    expect(eventStore.getAssetEvents).toHaveBeenCalledWith(
      "org-pangolabs",
      "my-asset",
      expect.objectContaining({ type: "aigrc.scan.completed", limit: 5 }),
    );
  });
});
