#!/usr/bin/env node
/**
 * AIGRC MCP Server CLI Entry Point
 *
 * Usage: aigrc-mcp
 *
 * Environment Variables:
 *   AIGRC_WORKSPACE     - Workspace directory (default: .)
 *   AIGRC_CARDS_DIR     - Asset cards directory (default: .aigrc/cards)
 *   AIGRC_LOG_LEVEL     - Log level: debug, info, warn, error (default: info)
 *   AIGRC_PROFILES      - Comma-separated profiles (default: eu-ai-act)
 *   AIGRC_REDTEAM_ENABLED - Enable red team integration (default: false)
 *   AIGOS_API_URL       - AIGOS platform API URL
 *   AIGOS_API_KEY       - AIGOS API key
 */

import { createServer } from "../src/index.js";

async function main() {
  try {
    const server = createServer();
    await server.start();
  } catch (error) {
    console.error("Failed to start AIGRC MCP Server:", error);
    process.exit(1);
  }
}

main();
