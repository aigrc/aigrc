#!/usr/bin/env node
/**
 * CGA Certificate Authority Server
 *
 * Standalone HTTP server for the CGA CA service.
 * Provides certificate signing, verification, and OCSP services.
 */

import express from "express";
import cors from "cors";
import helmet from "helmet";
import pino from "pino";
import pinoHttp from "pino-http";
import { CADatabase } from "../db/client.js";
import { SigningService } from "../services/signing.js";
import { OCSPService } from "../services/ocsp.js";
import { createAPIRouter } from "../api/routes.js";

// ─────────────────────────────────────────────────────────────────
// Configuration
// ─────────────────────────────────────────────────────────────────

interface ServerConfig {
  port: number;
  host: string;
  dbPath: string;
  keyEncryptionPassword: string;
  issuerId: string;
  issuerName: string;
  corsOrigins: string[];
  logLevel: string;
}

function loadConfig(): ServerConfig {
  return {
    port: parseInt(process.env.CA_PORT ?? "3000", 10),
    host: process.env.CA_HOST ?? "0.0.0.0",
    dbPath: process.env.CA_DB_PATH ?? "./data/cga-ca.db",
    keyEncryptionPassword: process.env.CA_KEY_PASSWORD ?? "development-only-password",
    issuerId: process.env.CA_ISSUER_ID ?? "cga.aigos.io",
    issuerName: process.env.CA_ISSUER_NAME ?? "AIGOS CGA Certificate Authority",
    corsOrigins: (process.env.CA_CORS_ORIGINS ?? "*").split(","),
    logLevel: process.env.CA_LOG_LEVEL ?? "info",
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

  logger.info("Starting CGA Certificate Authority Server...");
  logger.info({ config: { ...config, keyEncryptionPassword: "[REDACTED]" } }, "Configuration loaded");

  // Initialize database
  const db = new CADatabase(config.dbPath);
  logger.info({ dbPath: config.dbPath }, "Database initialized");

  // Initialize signing service
  const signingService = new SigningService({
    db,
    keyEncryptionPassword: config.keyEncryptionPassword,
    issuerId: config.issuerId,
    issuerName: config.issuerName,
  });

  // Check if CA key exists, generate if not
  const existingKey = db.getActiveKey();
  if (!existingKey) {
    logger.info("No CA signing key found, generating new key...");
    const keyResult = await signingService.generateKey();
    logger.info({ keyId: keyResult.keyId }, "CA signing key generated");
  } else {
    logger.info({ keyId: existingKey.id }, "CA signing key loaded");
  }

  // Initialize OCSP service
  const ocspService = new OCSPService({
    db,
    signingService,
    responseValiditySeconds: 3600,
    enableCache: true,
  });

  // Create Express app
  const app = express();

  // Security middleware
  app.use(helmet());
  app.use(cors({
    origin: config.corsOrigins.includes("*") ? "*" : config.corsOrigins,
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type", "Authorization", "X-CGA-Token"],
  }));

  // Request parsing
  app.use(express.json({ limit: "1mb" }));

  // Request logging
  app.use(pinoHttp({ logger }));

  // Mount API routes
  app.use("/api/v1", createAPIRouter({
    db,
    signingService,
    ocspService,
  }));

  // Root endpoint
  app.get("/", (_req, res) => {
    res.json({
      service: "CGA Certificate Authority",
      version: "1.0.0",
      issuer: config.issuerId,
      documentation: "https://aigos.io/docs/cga",
      endpoints: {
        health: "/api/v1/health",
        info: "/api/v1/info",
        sign: "/api/v1/certificates/sign",
        verify: "/api/v1/certificates/verify",
        ocsp: "/api/v1/ocsp",
      },
    });
  });

  // Error handler
  app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    logger.error({ err }, "Unhandled error");
    res.status(500).json({
      error: "Internal server error",
      message: process.env.NODE_ENV === "development" ? err.message : undefined,
    });
  });

  // Start server
  const server = app.listen(config.port, config.host, () => {
    logger.info({ port: config.port, host: config.host }, "CGA CA Server listening");
    console.log(`
╔═══════════════════════════════════════════════════════════════╗
║             CGA Certificate Authority Server                  ║
╠═══════════════════════════════════════════════════════════════╣
║  Issuer:     ${config.issuerId.padEnd(47)}║
║  Listening:  http://${config.host}:${config.port}${" ".repeat(41 - (config.host + config.port.toString()).length)}║
║  API Docs:   /api/v1/info                                     ║
╚═══════════════════════════════════════════════════════════════╝
    `);
  });

  // Graceful shutdown
  const shutdown = async () => {
    logger.info("Shutting down...");
    server.close(() => {
      db.close();
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
