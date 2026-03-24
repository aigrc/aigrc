// ─────────────────────────────────────────────────────────────────
// PangoGuard — MCP-Specific Detection Patterns
// Specialized patterns for Model Context Protocol servers
// ─────────────────────────────────────────────────────────────────

import { registerPattern, createImplication } from "@aigrc/core";
import type { PatternDefinition } from "@aigrc/core";

/**
 * Register all MCP-specific detection patterns into @aigrc/core's pattern registry.
 */
export function registerMcpPatterns(): void {
  for (const pattern of MCP_PATTERNS) {
    registerPattern(pattern);
  }
}

// ─────────────────────────────────────────────────────────────────
// MCP SERVER PATTERNS
// ─────────────────────────────────────────────────────────────────

const mcpSdkTs: PatternDefinition = {
  id: "mcp-sdk-ts",
  name: "MCP SDK (TypeScript)",
  category: "agent_framework",
  language: "typescript",
  patterns: [
    { type: "import", pattern: "@modelcontextprotocol/sdk", confidence: "high", description: "MCP TypeScript SDK import" },
    { type: "regex", pattern: "new Server\\(\\{", confidence: "medium", description: "MCP Server instantiation" },
    { type: "regex", pattern: "server\\.setRequestHandler\\(", confidence: "high", description: "MCP request handler registration" },
    { type: "regex", pattern: "ListToolsRequestSchema|CallToolRequestSchema", confidence: "high", description: "MCP tool schemas" },
    { type: "regex", pattern: "ListResourcesRequestSchema|ReadResourceRequestSchema", confidence: "high", description: "MCP resource schemas" },
    { type: "regex", pattern: "ListPromptsRequestSchema|GetPromptRequestSchema", confidence: "high", description: "MCP prompt schemas" },
  ],
  implies: [
    createImplication("toolExecution", true, "MCP server exposes tools for AI agents"),
    createImplication("autonomousDecisions", true, "MCP tools enable autonomous agent actions"),
    createImplication("externalDataAccess", true, "MCP server provides external data access"),
  ],
};

const mcpSdkPy: PatternDefinition = {
  id: "mcp-sdk-py",
  name: "MCP SDK (Python)",
  category: "agent_framework",
  language: "python",
  patterns: [
    { type: "import", pattern: "from mcp.server", confidence: "high", description: "MCP Python SDK import" },
    { type: "import", pattern: "from mcp import", confidence: "high", description: "MCP Python SDK import" },
    { type: "regex", pattern: "Server\\(name=", confidence: "high", description: "MCP Server instantiation" },
    { type: "regex", pattern: "@server\\.(?:list_tools|call_tool|list_resources|read_resource)", confidence: "high", description: "MCP Python decorators" },
  ],
  implies: [
    createImplication("toolExecution", true, "MCP server exposes tools for AI agents"),
    createImplication("autonomousDecisions", true, "MCP tools enable autonomous agent actions"),
    createImplication("externalDataAccess", true, "MCP server provides external data access"),
  ],
};

const fastMcp: PatternDefinition = {
  id: "fastmcp",
  name: "FastMCP",
  category: "agent_framework",
  language: "python",
  patterns: [
    { type: "import", pattern: "from fastmcp", confidence: "high", description: "FastMCP import" },
    { type: "import", pattern: "import fastmcp", confidence: "high", description: "FastMCP import" },
    { type: "regex", pattern: "FastMCP\\(", confidence: "high", description: "FastMCP server creation" },
    { type: "regex", pattern: "@mcp\\.tool\\(", confidence: "high", description: "FastMCP tool decorator" },
    { type: "regex", pattern: "@mcp\\.resource\\(", confidence: "high", description: "FastMCP resource decorator" },
    { type: "regex", pattern: "@mcp\\.prompt\\(", confidence: "high", description: "FastMCP prompt decorator" },
  ],
  implies: [
    createImplication("toolExecution", true, "FastMCP server exposes tools"),
    createImplication("autonomousDecisions", true, "FastMCP tools enable agent actions"),
    createImplication("externalDataAccess", true, "FastMCP server provides external data access"),
  ],
};

const mcpManifest: PatternDefinition = {
  id: "mcp-manifest",
  name: "MCP Manifest (mcp.json)",
  category: "agent_framework",
  language: "any",
  patterns: [
    { type: "literal", pattern: "mcp.json", confidence: "high", description: "MCP manifest file" },
    { type: "regex", pattern: "\"mcpServers\"\\s*:", confidence: "high", description: "MCP servers config in manifest" },
    { type: "regex", pattern: "\"tools\"\\s*:\\s*\\[", confidence: "medium", description: "Tools array in manifest" },
  ],
  implies: [
    createImplication("toolExecution", true, "MCP manifest defines available tools"),
  ],
};

const kongVolcano: PatternDefinition = {
  id: "kong-volcano",
  name: "Kong Volcano SDK",
  category: "agent_framework",
  language: "any",
  patterns: [
    { type: "import", pattern: "@kong/volcano-sdk", confidence: "high", description: "Kong Volcano SDK import" },
    { type: "import", pattern: "from kong_volcano", confidence: "high", description: "Kong Volcano Python import" },
    { type: "regex", pattern: "new MCPServer\\(", confidence: "high", description: "Kong Volcano MCP server creation" },
    { type: "regex", pattern: "volcano\\.createServer\\(", confidence: "high", description: "Kong Volcano server factory" },
    { type: "regex", pattern: "kong\\.yaml", confidence: "medium", description: "Kong configuration file" },
    { type: "regex", pattern: "volcano\\.(?:tool|resource|prompt)\\(", confidence: "high", description: "Kong Volcano decorators" },
  ],
  implies: [
    createImplication("toolExecution", true, "Kong Volcano exposes MCP tools through API gateway"),
    createImplication("autonomousDecisions", true, "Kong Volcano enables agent actions via API gateway"),
    createImplication("externalDataAccess", true, "Kong Volcano routes through external API gateway"),
  ],
};

const mcpTransportSse: PatternDefinition = {
  id: "mcp-transport-sse",
  name: "MCP SSE Transport",
  category: "agent_framework",
  language: "any",
  patterns: [
    { type: "regex", pattern: "SSEServerTransport|SSEClientTransport", confidence: "high", description: "MCP SSE transport" },
    { type: "regex", pattern: "/sse['\"]|['\"]sse['\"]\\s*:\\s*true", confidence: "medium", description: "SSE endpoint pattern" },
    { type: "regex", pattern: "text/event-stream", confidence: "low", description: "SSE content type (may be MCP)" },
  ],
  implies: [
    createImplication("externalDataAccess", true, "MCP SSE transport for remote connections"),
  ],
};

const mcpTransportStdio: PatternDefinition = {
  id: "mcp-transport-stdio",
  name: "MCP Stdio Transport",
  category: "agent_framework",
  language: "any",
  patterns: [
    { type: "regex", pattern: "StdioServerTransport|StdioClientTransport", confidence: "high", description: "MCP stdio transport" },
    { type: "regex", pattern: "stdio_server\\(|run_stdio\\(", confidence: "high", description: "MCP Python stdio server" },
  ],
  implies: [
    createImplication("toolExecution", true, "MCP stdio transport for local tool execution"),
  ],
};

const mcpResourcesToolsPrompts: PatternDefinition = {
  id: "mcp-capabilities-config",
  name: "MCP Capabilities Configuration",
  category: "agent_framework",
  language: "any",
  patterns: [
    {
      type: "regex",
      pattern: "(?:resources|tools|prompts)\\s*:\\s*\\[\\s*\\{",
      confidence: "medium",
      description: "MCP capabilities array in YAML/JSON config",
    },
    {
      type: "regex",
      pattern: "capabilities\\s*:\\s*\\{[^}]*(?:tools|resources|prompts)",
      confidence: "medium",
      description: "MCP capabilities object",
    },
  ],
  implies: [
    createImplication("toolExecution", true, "MCP capabilities configuration"),
  ],
};

// ─────────────────────────────────────────────────────────────────
// ALL MCP PATTERNS
// ─────────────────────────────────────────────────────────────────

export const MCP_PATTERNS: PatternDefinition[] = [
  mcpSdkTs,
  mcpSdkPy,
  fastMcp,
  mcpManifest,
  kongVolcano,
  mcpTransportSse,
  mcpTransportStdio,
  mcpResourcesToolsPrompts,
];
