#!/usr/bin/env node
/**
 * AIGRC MCP HTTP Server Entry Point
 *
 * Starts the MCP server with HTTP/SSE transport for cloud deployments.
 *
 * Usage:
 *   aigrc-mcp-http [--port PORT] [--host HOST] [--auth] [--stateless]
 *
 * Environment Variables:
 *   AIGRC_HTTP_PORT          - Port to listen on (default: 3000)
 *   AIGRC_HTTP_HOST          - Host to bind to (default: 0.0.0.0)
 *   AIGRC_HTTP_AUTH_ENABLED  - Enable authentication (default: false)
 *   AIGRC_HTTP_STATEFUL      - Enable stateful sessions (default: true)
 *   See config.ts for all environment variables
 */

import { createHttpServer } from "../src/http-server.js";
import { loadConfig } from "../src/config.js";

// Parse command line arguments
const args = process.argv.slice(2);
const options: { port?: number; host?: string; auth?: boolean; stateless?: boolean } = {};

for (let i = 0; i < args.length; i++) {
  switch (args[i]) {
    case "--port":
    case "-p":
      options.port = parseInt(args[++i], 10);
      break;
    case "--host":
    case "-h":
      options.host = args[++i];
      break;
    case "--auth":
      options.auth = true;
      break;
    case "--stateless":
      options.stateless = true;
      break;
    case "--help":
      console.log(`
AIGRC MCP HTTP Server v3.0.0

Usage: aigrc-mcp-http [options]

Options:
  -p, --port PORT    Port to listen on (default: 3000)
  -h, --host HOST    Host to bind to (default: 0.0.0.0)
  --auth             Enable authentication
  --stateless        Disable session management
  --help             Show this help message

Environment Variables:
  AIGRC_WORKSPACE              Workspace directory
  AIGRC_PROFILES               Comma-separated compliance profiles
  AIGRC_REDTEAM_ENABLED        Enable red team features
  AIGRC_HTTP_PORT              HTTP port
  AIGRC_HTTP_HOST              HTTP host
  AIGRC_HTTP_AUTH_ENABLED      Enable authentication
  AIGRC_HTTP_OAUTH_ISSUER      OAuth issuer URL
  AIGRC_HTTP_OAUTH_AUDIENCE    OAuth audience
  AIGRC_HTTP_STATEFUL          Enable stateful sessions

Endpoints:
  GET  /           Server info
  GET  /health     Health check
  *    /mcp        MCP endpoint (StreamableHTTP transport)
  GET  /sessions   List active sessions
  DEL  /sessions/:id  Delete a session

Examples:
  aigrc-mcp-http --port 8080
  aigrc-mcp-http --auth --port 3000
  AIGRC_HTTP_AUTH_ENABLED=true aigrc-mcp-http
`);
      process.exit(0);
  }
}

// Load configuration
const config = loadConfig();

// Create and start HTTP server
const server = createHttpServer(config, {
  port: options.port ?? config.httpPort,
  host: options.host ?? config.httpHost,
  authEnabled: options.auth ?? config.httpAuthEnabled,
  stateful: options.stateless ? false : config.httpStateful,
});

// Handle graceful shutdown
process.on("SIGINT", () => {
  console.log("\nShutting down AIGRC MCP HTTP Server...");
  process.exit(0);
});

process.on("SIGTERM", () => {
  console.log("Received SIGTERM, shutting down...");
  process.exit(0);
});

// Start the server
server.start().catch((error) => {
  console.error("Failed to start AIGRC MCP HTTP Server:", error);
  process.exit(1);
});
