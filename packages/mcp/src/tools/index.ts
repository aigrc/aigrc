/**
 * AIGRC MCP Tools Registry
 *
 * All tools available through the MCP server.
 */

import { AIGRCConfig } from "../config.js";
import { Services } from "../services/index.js";

// Import tool modules
import { coreTools, executeCoreTools } from "./core/index.js";
import { complianceTools, executeComplianceTools } from "./compliance/index.js";
import { redteamTools, executeRedteamTools } from "./redteam/index.js";
import { reportTools, executeReportTools } from "./reports/index.js";

export interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: {
    type: "object";
    properties: Record<string, unknown>;
    required?: string[];
  };
}

export interface ToolResult {
  content: Array<{
    type: "text";
    text: string;
  }>;
  isError?: boolean;
}

/**
 * Get all available tools based on configuration
 */
export function getTools(config: AIGRCConfig): ToolDefinition[] {
  const tools: ToolDefinition[] = [...coreTools, ...complianceTools, ...reportTools];

  // Add red team tools if enabled
  if (config.redTeamEnabled) {
    tools.push(...redteamTools);
  }

  return tools;
}

/**
 * Execute a tool by name
 */
export async function executeTool(
  name: string,
  args: Record<string, unknown>,
  services: Services,
  config: AIGRCConfig
): Promise<ToolResult> {
  try {
    // Try core tools
    const coreResult = await executeCoreTools(name, args, services, config);
    if (coreResult) return coreResult;

    // Try compliance tools
    const complianceResult = await executeComplianceTools(name, args, services, config);
    if (complianceResult) return complianceResult;

    // Try report tools
    const reportResult = await executeReportTools(name, args, services, config);
    if (reportResult) return reportResult;

    // Try red team tools (if enabled)
    if (config.redTeamEnabled) {
      const redteamResult = await executeRedteamTools(name, args, services, config);
      if (redteamResult) return redteamResult;
    }

    return {
      content: [{ type: "text", text: `Unknown tool: ${name}` }],
      isError: true,
    };
  } catch (error) {
    return {
      content: [
        {
          type: "text",
          text: `Error executing tool ${name}: ${error instanceof Error ? error.message : String(error)}`,
        },
      ],
      isError: true,
    };
  }
}
