import { describe, it, expect, vi, beforeEach } from "vitest";
import express from "express";
import http from "http";
import { eventRateLimit, resetRateLimitState } from "../src/middleware/rate-limit.js";

// ─────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────

function createTestApp(options: {
  limit: number;
  windowMs?: number;
  criticalExempt?: boolean;
  channel?: string;
}) {
  const app = express();
  app.use(express.json());

  // Inject auth
  app.use((req, _res, next) => {
    (req as any).auth = { orgId: "org-test", type: "bearer" };
    next();
  });

  // Apply rate limiting
  app.use(eventRateLimit(options));

  // Test endpoint
  app.post("/test", (_req, res) => {
    res.status(200).json({ ok: true });
  });

  return app;
}

async function postRequest(
  app: express.Application,
  path: string,
  body?: unknown,
): Promise<{ status: number; body: any; headers: Record<string, string> }> {
  return new Promise((resolve) => {
    const server = http.createServer(app);
    server.listen(0, () => {
      const port = (server.address() as any).port;
      const reqBody = body ? JSON.stringify(body) : "{}";
      const options = {
        hostname: "localhost",
        port,
        path,
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(reqBody),
        },
      };

      const req = http.request(options, (res) => {
        let data = "";
        res.on("data", (chunk: string) => (data += chunk));
        res.on("end", () => {
          server.close();
          const headers: Record<string, string> = {};
          for (const [key, value] of Object.entries(res.headers)) {
            if (typeof value === "string") headers[key] = value;
          }
          try {
            resolve({ status: res.statusCode!, body: JSON.parse(data), headers });
          } catch {
            resolve({ status: res.statusCode!, body: data, headers });
          }
        });
      });

      req.on("error", (err: Error) => {
        server.close();
        resolve({ status: 500, body: { error: err.message }, headers: {} });
      });

      req.write(reqBody);
      req.end();
    });
  });
}

// ─────────────────────────────────────────────────────────────────
// TESTS
// ─────────────────────────────────────────────────────────────────

describe("Rate Limiting Middleware", () => {
  beforeEach(() => {
    resetRateLimitState();
  });

  it("allows requests under the limit", async () => {
    const app = createTestApp({ limit: 5, windowMs: 60_000 });

    const res = await postRequest(app, "/test");
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });

  it("sets X-RateLimit-* headers on success", async () => {
    const app = createTestApp({ limit: 10, windowMs: 60_000 });

    const res = await postRequest(app, "/test");
    expect(res.status).toBe(200);
    expect(res.headers["x-ratelimit-limit"]).toBe("10");
    expect(res.headers["x-ratelimit-remaining"]).toBe("9");
    expect(res.headers["x-ratelimit-reset"]).toBeDefined();
  });

  it("returns 429 when limit is exceeded", async () => {
    const app = createTestApp({ limit: 2, windowMs: 60_000 });

    // Use up the limit
    await postRequest(app, "/test");
    await postRequest(app, "/test");

    // Third request should be rate limited
    const res = await postRequest(app, "/test");
    expect(res.status).toBe(429);
    expect(res.body.error).toBe("rate_limit_exceeded");
  });

  it("includes Retry-After header on 429", async () => {
    const app = createTestApp({ limit: 1, windowMs: 60_000 });

    await postRequest(app, "/test");
    const res = await postRequest(app, "/test");

    expect(res.status).toBe(429);
    expect(res.headers["retry-after"]).toBeDefined();
    const retryAfter = parseInt(res.headers["retry-after"], 10);
    expect(retryAfter).toBeGreaterThan(0);
    expect(retryAfter).toBeLessThanOrEqual(60);
  });

  it("includes X-RateLimit-Remaining: 0 on 429", async () => {
    const app = createTestApp({ limit: 1, windowMs: 60_000 });

    await postRequest(app, "/test");
    const res = await postRequest(app, "/test");

    expect(res.status).toBe(429);
    expect(res.headers["x-ratelimit-remaining"]).toBe("0");
  });

  it("exempts critical events when criticalExempt is true", async () => {
    const app = createTestApp({ limit: 1, windowMs: 60_000, criticalExempt: true });

    // Use up the limit
    await postRequest(app, "/test", { criticality: "normal" });

    // Critical event should bypass
    const res = await postRequest(app, "/test", { criticality: "critical" });
    expect(res.status).toBe(200);
  });

  it("does NOT exempt critical events when criticalExempt is false", async () => {
    const app = createTestApp({ limit: 1, windowMs: 60_000, criticalExempt: false });

    await postRequest(app, "/test", { criticality: "normal" });

    const res = await postRequest(app, "/test", { criticality: "critical" });
    expect(res.status).toBe(429);
  });

  it("resets window after expiry", async () => {
    // Use a very short window
    const app = createTestApp({ limit: 1, windowMs: 50 });

    await postRequest(app, "/test");

    // Wait for window to expire
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Should be allowed again
    const res = await postRequest(app, "/test");
    expect(res.status).toBe(200);
  });

  it("tracks different channels independently", async () => {
    const app = express();
    app.use(express.json());
    app.use((req, _res, next) => {
      (req as any).auth = { orgId: "org-test", type: "bearer" };
      next();
    });

    // Different channel rate limiters
    const syncRL = eventRateLimit({ limit: 1, windowMs: 60_000, channel: "sync" });
    const batchRL = eventRateLimit({ limit: 1, windowMs: 60_000, channel: "batch" });

    app.post("/sync", syncRL, (_req, res) => res.json({ ok: true }));
    app.post("/batch", batchRL, (_req, res) => res.json({ ok: true }));

    // Use up sync limit
    await postRequest(app, "/sync");
    const syncRes = await postRequest(app, "/sync");
    expect(syncRes.status).toBe(429);

    // Batch should still work
    const batchRes = await postRequest(app, "/batch");
    expect(batchRes.status).toBe(200);
  });
});
