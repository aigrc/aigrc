/**
 * AIGRC MCP Server Implementation
 *
 * Uses the official MCP SDK to create a standards-compliant server.
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
  ListPromptsRequestSchema,
  GetPromptRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

import { AIGRCConfig, loadConfig } from "./config.js";
import { getTools, executeTool } from "./tools/index.js";
import { getResources, readResource } from "./resources/index.js";
import { getPrompts, getPrompt } from "./prompts/index.js";
import { createServices, Services } from "./services/index.js";

export interface AIGRCServer {
  server: Server;
  config: AIGRCConfig;
  services: Services;
  start: () => Promise<void>;
}

/**
 * Create and configure the AIGRC MCP Server
 */
export function createServer(config?: Partial<AIGRCConfig>): AIGRCServer {
  const fullConfig = { ...loadConfig(), ...config };
  const services = createServices(fullConfig);

  const server = new Server(
    {
      name: "aigrc",
      version: "2.0.0",
    },
    {
      capabilities: {
        tools: {},
        resources: { subscribe: true },
        prompts: {},
      },
    }
  );

  // Register tool handlers
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return { tools: getTools(fullConfig) };
  });

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    return executeTool(name, args || {}, services, fullConfig);
  });

  // Register resource handlers
  server.setRequestHandler(ListResourcesRequestSchema, async () => {
    return { resources: await getResources(services, fullConfig) };
  });

  server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
    const { uri } = request.params;
    return readResource(uri, services, fullConfig);
  });

  // Register prompt handlers
  server.setRequestHandler(ListPromptsRequestSchema, async () => {
    return { prompts: getPrompts(fullConfig) };
  });

  server.setRequestHandler(GetPromptRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    return getPrompt(name, args || {}, services, fullConfig);
  });

  const start = async () => {
    const transport = new StdioServerTransport();
    await server.connect(transport);

    if (fullConfig.logLevel === "debug" || fullConfig.logLevel === "info") {
      console.error(`AIGRC MCP Server v2.0.0 started`);
      console.error(`Workspace: ${fullConfig.workspace}`);
      console.error(`Profiles: ${fullConfig.profiles.join(", ")}`);
      console.error(`Red Team: ${fullConfig.redTeamEnabled ? "enabled" : "disabled"}`);
    }
  };

  return {
    server,
    config: fullConfig,
    services,
    start,
  };
}
