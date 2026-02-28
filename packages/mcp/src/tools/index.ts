/**
 * AIGRC MCP Tools Registry
 *
 * All tools available through the MCP server.
 * Organized with Value-First tools as the primary interface.
 */

import { AIGRCConfig } from "../config.js";
import { Services } from "../services/index.js";
import { EventPushService, formatFeedbackSection } from "../services/event-push.js";

// Import tool modules - Value-First tools come first
import { valueFirstTools, executeValueFirstTools } from "./value-first/index.js";
import { checkpointTools, executeCheckpointTools } from "./checkpoint/index.js";
import { goldenThreadTools, executeGoldenThreadTools } from "./golden-thread/index.js";
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
 *
 * Tools are ordered with Value-First tools first to emphasize
 * developer value over governance compliance.
 */
export function getTools(config: AIGRCConfig): ToolDefinition[] {
  // Value-First tools come first - these are the primary interface
  const tools: ToolDefinition[] = [
    ...valueFirstTools,
    ...checkpointTools,
    ...goldenThreadTools,
    ...coreTools,
    ...complianceTools,
    ...reportTools,
  ];

  // Add red team tools if enabled
  if (config.redTeamEnabled) {
    tools.push(...redteamTools);
  }

  return tools;
}

/**
 * Execute a tool by name
 *
 * Tools are checked in order: Value-First, Checkpoint, Core, Compliance, Reports, RedTeam
 */
export async function executeTool(
  name: string,
  args: Record<string, unknown>,
  services: Services,
  config: AIGRCConfig,
  eventPushService?: EventPushService,
): Promise<ToolResult> {
  try {
    // Try Value-First tools first (primary interface)
    let result: ToolResult | null = null;

    result = await executeValueFirstTools(name, args, services, config);
    if (!result) result = await executeCheckpointTools(name, args, services, config);
    if (!result) result = await executeGoldenThreadTools(name, args, services, config);
    if (!result) result = await executeCoreTools(name, args, services, config);
    if (!result) result = await executeComplianceTools(name, args, services, config);
    if (!result) result = await executeReportTools(name, args, services, config);

    // Try red team tools (if enabled)
    if (!result && config.redTeamEnabled) {
      result = await executeRedteamTools(name, args, services, config);
    }

    if (!result) {
      return {
        content: [{ type: "text", text: `Unknown tool: ${name}` }],
        isError: true,
      };
    }

    // AIGOS Event Push — push governance event for mapped tools (AIG-219)
    if (eventPushService?.isEnabled() && !result.isError) {
      try {
        const toolResultText = result.content.map((c) => c.text).join("\n");
        const feedback = await eventPushService.pushForTool(name, args, toolResultText);
        if (feedback) {
          const feedbackSection = formatFeedbackSection(feedback);
          result.content.push({ type: "text", text: feedbackSection });
        }
      } catch {
        // Non-blocking: event push failure should never break tool execution
      }
    }

    return result;
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
