/**
 * AIGRC MCP Server
 *
 * Model Context Protocol server for AI Governance, Risk, and Compliance.
 * Enables AI assistants to interact with governance data and perform compliance tasks.
 */

// Stdio transport (Claude Desktop, Cursor, VS Code)
export { createServer, AIGRCServer } from "./server.js";

// HTTP/SSE transport (Lovable, Bolt, cloud deployments)
export {
  createHttpServer,
  HttpServerConfig,
  DEFAULT_HTTP_CONFIG,
  AIGRCHttpServer,
} from "./http-server.js";

// Configuration
export { AIGRCConfig, loadConfig } from "./config.js";

// Authentication
export * from "./auth/index.js";

// Telemetry
export {
  TelemetryService,
  TelemetryEvent,
  TelemetryEventType,
  TelemetryHook,
  createTelemetryService,
  createNoOpTelemetryService,
  createConsoleHook,
} from "./telemetry.js";

// Re-export tool definitions for programmatic access
export * from "./tools/index.js";
export * from "./resources/index.js";
export * from "./prompts/index.js";
