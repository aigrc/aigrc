/**
 * Express Application Factory
 *
 * Creates and configures the Express app for the event ingestion service.
 * Separated from server binary to enable testing without starting a real server.
 */

import express from "express";
import cors from "cors";
import helmet from "helmet";
import { createEventRouter, type EventRouterConfig } from "./routes/events.js";
import { requireBearerAuth, type AuthConfig } from "./middleware/auth.js";
import { eventRateLimit, type RateLimitConfig } from "./middleware/rate-limit.js";

// ─────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────

export interface AppConfig {
  /** CORS origins (default: "*") */
  corsOrigins?: string | string[];
  /** JSON body size limit (default: "1mb") */
  bodyLimit?: string;
  /** Event store configuration */
  eventRouter: EventRouterConfig;
  /** Authentication configuration */
  auth?: AuthConfig;
  /** Rate limiting configuration for sync channel */
  syncRateLimit?: RateLimitConfig;
  /** Rate limiting configuration for batch channel */
  batchRateLimit?: RateLimitConfig;
}

// ─────────────────────────────────────────────────────────────────
// APP FACTORY
// ─────────────────────────────────────────────────────────────────

/**
 * Create and configure the Express application.
 *
 * Middleware stack:
 * 1. helmet (security headers)
 * 2. cors
 * 3. express.json (body parsing)
 * 4. requireBearerAuth (authentication) — on /v1/events routes
 * 5. eventRateLimit (rate limiting) — on /v1/events routes
 * 6. Event routes
 */
export function createApp(config: AppConfig): express.Application {
  const app = express();

  // Security middleware
  app.use(helmet());
  app.use(
    cors({
      origin: config.corsOrigins ?? "*",
      methods: ["GET", "POST"],
      allowedHeaders: ["Content-Type", "Authorization", "X-API-Key"],
    }),
  );

  // Body parsing
  app.use(express.json({ limit: config.bodyLimit ?? "1mb" }));

  // Health check (no auth required)
  app.get("/v1/health", (_req, res) => {
    res.status(200).json({
      status: "ok",
      service: "aigrc-event-service",
      version: "0.1.0",
      timestamp: new Date().toISOString(),
    });
  });

  // Auth middleware for event routes
  const authMiddleware = requireBearerAuth(config.auth);

  // Rate limiting middleware
  const syncRL = config.syncRateLimit
    ? eventRateLimit({ ...config.syncRateLimit, channel: "sync" })
    : null;
  const batchRL = config.batchRateLimit
    ? eventRateLimit({ ...config.batchRateLimit, channel: "batch" })
    : null;

  // Create event router
  const eventRouter = createEventRouter(config.eventRouter);

  // Mount event routes with auth and rate limiting
  if (syncRL) {
    app.post("/v1/events", authMiddleware, syncRL, (req, res, next) => next());
  } else {
    app.post("/v1/events", authMiddleware, (req, res, next) => next());
  }

  if (batchRL) {
    app.post("/v1/events/batch", authMiddleware, batchRL, (req, res, next) => next());
  } else {
    app.post("/v1/events/batch", authMiddleware, (req, res, next) => next());
  }

  // Mount the event router at /v1
  app.use("/v1", eventRouter);

  // Auth middleware for GET routes
  app.get("/v1/events", authMiddleware, (req, res, next) => next());
  app.get("/v1/events/:id", authMiddleware, (req, res, next) => next());
  app.get("/v1/assets", authMiddleware, (req, res, next) => next());
  app.get("/v1/assets/:assetId/events", authMiddleware, (req, res, next) => next());

  // Root endpoint
  app.get("/", (_req, res) => {
    res.json({
      service: "AIGRC Event Ingestion Service",
      version: "0.2.0",
      endpoints: {
        health: "GET /v1/health",
        pushEvent: "POST /v1/events",
        pushBatch: "POST /v1/events/batch",
        listEvents: "GET /v1/events",
        getEvent: "GET /v1/events/:id",
        listAssets: "GET /v1/assets",
        getAssetEvents: "GET /v1/assets/:assetId/events",
      },
    });
  });

  // Error handler
  app.use(
    (
      err: Error,
      _req: express.Request,
      res: express.Response,
      _next: express.NextFunction,
    ) => {
      res.status(500).json({
        error: {
          code: "EVT_INTERNAL",
          message:
            process.env.NODE_ENV === "development"
              ? err.message
              : "Internal server error",
        },
      });
    },
  );

  return app;
}
