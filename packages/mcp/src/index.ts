/**
 * AIGRC MCP Server
 *
 * Model Context Protocol server for AI Governance, Risk, and Compliance.
 * Enables AI assistants to interact with governance data and perform compliance tasks.
 */

export { createServer, AIGRCServer } from "./server.js";
export { AIGRCConfig, loadConfig } from "./config.js";

// Re-export tool definitions for programmatic access
export * from "./tools/index.js";
export * from "./resources/index.js";
export * from "./prompts/index.js";
