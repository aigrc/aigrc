// ─────────────────────────────────────────────────────────────────
// PangoGuard — Main Entrypoint
// Layered AI governance that scales with your code
// ─────────────────────────────────────────────────────────────────

import { Probot, Server } from "probot";
import { initializePatterns } from "@aigrc/core";
import { loadConfig, validateConfig } from "./config.js";
import { handlePullRequest } from "./webhooks/pull-request.js";
import { handlePush } from "./webhooks/push.js";
import { handleInstallation } from "./webhooks/installation.js";
import { registerExtendedSignatures } from "./detection/extended-signatures.js";
import { registerMcpPatterns } from "./detection/mcp-patterns.js";
import { registerFileSignatures } from "./detection/file-signatures.js";
import { logger } from "./utils/logger.js";
import type { LogLevel } from "./utils/logger.js";

/**
 * Initialize PangoGuard.
 *
 * This function:
 * 1. Initializes the @aigrc/core pattern registry
 * 2. Registers 30+ extended AI framework signatures
 * 3. Registers MCP-specific detection patterns
 * 4. Registers file signature patterns
 * 5. Wires up webhook event handlers
 */
function pangoGuardApp(app: Probot): void {
  // ── Initialize detection patterns ──────────────────────────────
  logger.info("Initializing @aigrc/core pattern registry...");
  initializePatterns();

  logger.info("Registering extended AI framework signatures...");
  registerExtendedSignatures();

  logger.info("Registering MCP-specific detection patterns...");
  registerMcpPatterns();

  logger.info("Registering file signature detection patterns...");
  registerFileSignatures();

  logger.info("All detection patterns registered successfully");

  // ── Register webhook event handlers ────────────────────────────

  // PR opened or updated — run full scan→classify→comment→checkrun pipeline
  app.on(
    ["pull_request.opened", "pull_request.synchronize", "pull_request.reopened"],
    async (context) => {
      logger.info("Received pull_request event", {
        action: context.payload.action,
        repo: context.payload.repository.full_name,
        pr: context.payload.pull_request.number,
      });
      await handlePullRequest(context);
    }
  );

  // Push to default branch — detect ungoverned assets
  app.on("push", async (context) => {
    logger.info("Received push event", {
      repo: context.payload.repository.full_name,
      ref: context.payload.ref,
    });
    await handlePush(context);
  });

  // App installed on org — scan all repos, build inventory
  app.on(
    ["installation.created", "installation_repositories.added"],
    async (context) => {
      logger.info("Received installation event", {
        action: context.payload.action,
        account: (context.payload as any).installation?.account?.login,
      });
      await handleInstallation(context);
    }
  );

  logger.info("PangoGuard webhook handlers registered");
}

/**
 * Start the PangoGuard server.
 */
async function main(): Promise<void> {
  try {
    // Load and validate configuration
    const config = loadConfig();
    logger.setLevel(config.server.logLevel as LogLevel);

    const warnings = validateConfig(config);
    for (const warning of warnings) {
      logger.warn(warning);
    }

    logger.info("Starting PangoGuard...", {
      port: config.server.port,
      nodeEnv: config.server.nodeEnv,
      confidenceThreshold: config.scan.confidenceThreshold,
      autoInstrumentation: config.features.autoInstrumentation,
      persistence: config.features.persistence,
    });

    // Create and start the Probot server
    const server = new Server({
      Probot: Probot.defaults({
        appId: config.github.appId,
        privateKey: config.github.privateKey,
        secret: config.github.webhookSecret,
      }),
    });

    await server.load(pangoGuardApp);

    // Health check endpoint
    server.expressApp.get("/health", (_req, res) => {
      res.status(200).json({
        status: "healthy",
        version: "1.0.0",
        uptime: process.uptime(),
      });
    });

    await server.start();

    logger.info(`PangoGuard is running on port ${config.server.port}`);
  } catch (error) {
    logger.error("Failed to start PangoGuard", {
      error: error instanceof Error ? error.message : String(error),
    });
    process.exit(1);
  }
}

// Start the server
main();

// Export for testing
export { pangoGuardApp };
