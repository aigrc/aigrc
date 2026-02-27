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
import { EventPushService } from "./services/event-push.js";
import {
  TelemetryService,
  createTelemetryService,
  createConsoleHook,
} from "./telemetry.js";

export interface AIGRCServer {
  server: Server;
  config: AIGRCConfig;
  services: Services;
  telemetry: TelemetryService;
  start: () => Promise<void>;
  shutdown: () => Promise<void>;
}

/**
 * Create and configure the AIGRC MCP Server
 */
export function createServer(config?: Partial<AIGRCConfig>): AIGRCServer {
  const fullConfig = { ...loadConfig(), ...config };
  const services = createServices(fullConfig);

  // Initialize event push service (AIG-219)
  const eventPushService = new EventPushService(fullConfig);

  // Initialize telemetry
  const telemetry = createTelemetryService(fullConfig);

  // Add console hook for debug logging
  if (fullConfig.logLevel === "debug" || fullConfig.logLevel === "info") {
    telemetry.addHook(createConsoleHook(fullConfig.logLevel));
  }

  const server = new Server(
    {
      name: "aigrc",
      version: "3.0.0",
    },
    {
      capabilities: {
        tools: { listChanged: true },
        resources: { subscribe: true, listChanged: true },
        prompts: { listChanged: true },
        logging: {},
      },
    }
  );

  // Register tool handlers
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  server.setRequestHandler(ListToolsRequestSchema, async (): Promise<any> => {
    return { tools: getTools(fullConfig) };
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  server.setRequestHandler(CallToolRequestSchema, async (request, _extra): Promise<any> => {
    const { name, arguments: args } = request.params;
    const startTime = Date.now();

    try {
      const result = await executeTool(name, args || {}, services, fullConfig, eventPushService);
      telemetry.record({
        type: "tool_call",
        toolName: name,
        duration: Date.now() - startTime,
        success: true,
        metadata: { args: Object.keys(args || {}) },
      });
      return result;
    } catch (error) {
      telemetry.record({
        type: "tool_call",
        toolName: name,
        duration: Date.now() - startTime,
        success: false,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  });

  // Register resource handlers
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  server.setRequestHandler(ListResourcesRequestSchema, async (_request, _extra): Promise<any> => {
    return { resources: await getResources(services, fullConfig) };
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  server.setRequestHandler(ReadResourceRequestSchema, async (request, _extra): Promise<any> => {
    const { uri } = request.params;
    return readResource(uri, services, fullConfig);
  });

  // Register prompt handlers
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  server.setRequestHandler(ListPromptsRequestSchema, async (_request, _extra): Promise<any> => {
    return { prompts: getPrompts(fullConfig) };
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  server.setRequestHandler(GetPromptRequestSchema, async (request, _extra): Promise<any> => {
    const { name, arguments: args } = request.params;
    return getPrompt(name, args || {}, services, fullConfig);
  });

  const start = async () => {
    const transport = new StdioServerTransport();
    await server.connect(transport);

    if (fullConfig.logLevel === "debug" || fullConfig.logLevel === "info") {
      console.error(`AIGRC MCP Server v3.0.0 started`);
      console.error(`Workspace: ${fullConfig.workspace}`);
      console.error(`Profiles: ${fullConfig.profiles.join(", ")}`);
      console.error(`Red Team: ${fullConfig.redTeamEnabled ? "enabled" : "disabled"}`);
      console.error(`Telemetry: ${fullConfig.telemetryEnabled ? "enabled" : "disabled"}`);
      console.error(`Extensions: Value-First, Checkpoint, Golden Thread, Multi-Jurisdiction`);
    }
  };

  const shutdown = async () => {
    await telemetry.shutdown();
    await server.close();
  };

  return {
    server,
    config: fullConfig,
    services,
    telemetry,
    start,
    shutdown,
  };
}
