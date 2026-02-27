#!/usr/bin/env node
/**
 * AIGRC Event Ingestion Server
 *
 * Standalone HTTP server for governance event ingestion.
 * Provides Sync and Batch channel endpoints per EVT-001 §12.
 */

import pino from "pino";
import pinoHttp from "pino-http";
import { createClient } from "@supabase/supabase-js";
import { createApp } from "../app.js";
import { EventStore } from "../services/event-store.js";

// ─────────────────────────────────────────────────────────────────
// Configuration
// ─────────────────────────────────────────────────────────────────

interface ServerConfig {
  port: number;
  host: string;
  supabaseUrl: string;
  supabaseKey: string;
  corsOrigins: string[];
  logLevel: string;
  syncRateLimit: number;
  batchRateLimit: number;
}

function loadConfig(): ServerConfig {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error(
      "SUPABASE_URL and SUPABASE_KEY environment variables are required",
    );
  }

  return {
    port: parseInt(process.env.EVT_PORT ?? "3001", 10),
    host: process.env.EVT_HOST ?? "0.0.0.0",
    supabaseUrl,
    supabaseKey,
    corsOrigins: (process.env.EVT_CORS_ORIGINS ?? "*").split(","),
    logLevel: process.env.EVT_LOG_LEVEL ?? "info",
    syncRateLimit: parseInt(process.env.EVT_SYNC_RATE_LIMIT ?? "100", 10),
    batchRateLimit: parseInt(process.env.EVT_BATCH_RATE_LIMIT ?? "10", 10),
  };
}

// ─────────────────────────────────────────────────────────────────
// Server Setup
// ─────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const config = loadConfig();

  // Setup logger
  const isPrettyAvailable = (() => {
    try {
      require.resolve("pino-pretty");
      return true;
    } catch {
      return false;
    }
  })();

  const logger = pino({
    level: config.logLevel,
    ...(process.env.NODE_ENV !== "production" && isPrettyAvailable
      ? {
          transport: {
            target: "pino-pretty",
            options: { colorize: true },
          },
        }
      : {}),
  });

  logger.info("Starting AIGRC Event Ingestion Server...");

  // Initialize Supabase client
  const supabase = createClient(config.supabaseUrl, config.supabaseKey);
  logger.info("Supabase client initialized");

  // Initialize event store
  const eventStore = new EventStore({ supabase });

  // Create Express app
  const app = createApp({
    corsOrigins: config.corsOrigins.includes("*")
      ? "*"
      : config.corsOrigins,
    eventRouter: { eventStore },
    syncRateLimit: {
      limit: config.syncRateLimit,
      windowMs: 60_000,
      criticalExempt: true,
    },
    batchRateLimit: {
      limit: config.batchRateLimit,
      windowMs: 60_000,
      criticalExempt: true,
    },
  });

  // Add request logging
  app.use(pinoHttp({ logger }));

  // Start server
  const server = app.listen(config.port, config.host, () => {
    logger.info(
      { port: config.port, host: config.host },
      "Event Ingestion Server listening",
    );
    console.log(`
╔═══════════════════════════════════════════════════════════════╗
║          AIGRC Event Ingestion Service                        ║
╠═══════════════════════════════════════════════════════════════╣
║  Listening:  http://${config.host}:${config.port}${" ".repeat(Math.max(0, 41 - (config.host + config.port.toString()).length))}║
║  Sync:       POST /v1/events                                  ║
║  Batch:      POST /v1/events/batch                            ║
║  Health:     GET  /v1/health                                  ║
╚═══════════════════════════════════════════════════════════════╝
    `);
  });

  // Graceful shutdown
  const shutdown = async () => {
    logger.info("Shutting down...");
    server.close(() => {
      logger.info("Server closed");
      process.exit(0);
    });
  };

  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);
}

// Run
main().catch((error) => {
  console.error("Failed to start server:", error);
  process.exit(1);
});
