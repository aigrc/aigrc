/**
 * AIGRC MCP Server Configuration
 */

import { z } from "zod";

export const AIGRCConfigSchema = z.object({
  // Workspace settings
  workspace: z.string().default("."),
  cardsDir: z.string().default(".aigrc/cards"),

  // Logging
  logLevel: z.enum(["debug", "info", "warn", "error"]).default("info"),

  // Enterprise telemetry hooks
  telemetryEnabled: z.boolean().default(false),
  telemetryEndpoint: z.string().optional(),
  telemetryApiKey: z.string().optional(),
  telemetryBatchSize: z.number().default(100),
  telemetryFlushInterval: z.number().default(5000), // ms

  // Cache settings
  cacheTtl: z.number().default(300),

  // Compliance profiles
  profiles: z.array(z.string()).default(["eu-ai-act"]),

  // Custom profile paths (files or directories containing YAML profiles)
  customProfilePaths: z.array(z.string()).default([]),

  // Enable profile stacking (combine multiple profiles with strictest-wins)
  stackProfiles: z.boolean().default(false),

  // Red team integration
  redTeamEnabled: z.boolean().default(false),
  aigosApiUrl: z.string().optional(),
  aigosApiKey: z.string().optional(),
  aigosOrgId: z.string().optional(),

  // Golden Thread - Jira Integration
  jiraApiUrl: z.string().optional(),
  jiraApiToken: z.string().optional(),
  jiraProject: z.string().optional(),

  // Golden Thread - Azure DevOps Integration
  adoOrgUrl: z.string().optional(),
  adoApiToken: z.string().optional(),
  adoProject: z.string().optional(),

  // HTTP Server Settings (for SSE/Streamable HTTP transport)
  httpPort: z.number().default(3000),
  httpHost: z.string().default("0.0.0.0"),
  httpCors: z.boolean().default(true),
  httpCorsOrigins: z.array(z.string()).default(["*"]),
  httpAuthEnabled: z.boolean().default(false),
  httpAllowAnonymous: z.boolean().default(true),
  httpOAuthIssuer: z.string().optional(),
  httpOAuthAudience: z.string().optional(),
  httpRequestsPerMinute: z.number().default(120),
  httpToolCallsPerHour: z.number().default(1000),
  httpStateful: z.boolean().default(true),
});

export type AIGRCConfig = z.infer<typeof AIGRCConfigSchema>;

/**
 * Load configuration from environment variables
 */
export function loadConfig(): AIGRCConfig {
  const profilesRaw = process.env.AIGRC_PROFILES || "eu-ai-act";
  const customPathsRaw = process.env.AIGRC_CUSTOM_PROFILE_PATHS || "";

  return AIGRCConfigSchema.parse({
    workspace: process.env.AIGRC_WORKSPACE || ".",
    cardsDir: process.env.AIGRC_CARDS_DIR || ".aigrc/cards",
    logLevel: process.env.AIGRC_LOG_LEVEL || "info",
    // Enterprise telemetry
    telemetryEnabled: process.env.AIGRC_TELEMETRY_ENABLED === "true",
    telemetryEndpoint: process.env.AIGRC_TELEMETRY_ENDPOINT,
    telemetryApiKey: process.env.AIGRC_TELEMETRY_API_KEY,
    telemetryBatchSize: parseInt(process.env.AIGRC_TELEMETRY_BATCH_SIZE || "100", 10),
    telemetryFlushInterval: parseInt(process.env.AIGRC_TELEMETRY_FLUSH_INTERVAL || "5000", 10),
    cacheTtl: parseInt(process.env.AIGRC_CACHE_TTL || "300", 10),
    profiles: profilesRaw.split(",").map((p) => p.trim()),
    customProfilePaths: customPathsRaw
      ? customPathsRaw.split(",").map((p) => p.trim())
      : [],
    stackProfiles: process.env.AIGRC_STACK_PROFILES === "true",
    redTeamEnabled: process.env.AIGRC_REDTEAM_ENABLED === "true",
    aigosApiUrl: process.env.AIGOS_API_URL,
    aigosApiKey: process.env.AIGOS_API_KEY,
    aigosOrgId: process.env.AIGOS_ORG_ID,
    // Golden Thread - Jira
    jiraApiUrl: process.env.JIRA_API_URL,
    jiraApiToken: process.env.JIRA_API_TOKEN,
    jiraProject: process.env.JIRA_PROJECT,
    // Golden Thread - Azure DevOps
    adoOrgUrl: process.env.ADO_ORG_URL,
    adoApiToken: process.env.ADO_API_TOKEN,
    adoProject: process.env.ADO_PROJECT,
    // HTTP Server
    httpPort: parseInt(process.env.AIGRC_HTTP_PORT || "3000", 10),
    httpHost: process.env.AIGRC_HTTP_HOST || "0.0.0.0",
    httpCors: process.env.AIGRC_HTTP_CORS !== "false",
    httpCorsOrigins: (process.env.AIGRC_HTTP_CORS_ORIGINS || "*")
      .split(",")
      .map((o) => o.trim()),
    httpAuthEnabled: process.env.AIGRC_HTTP_AUTH_ENABLED === "true",
    httpAllowAnonymous: process.env.AIGRC_HTTP_ALLOW_ANONYMOUS !== "false",
    httpOAuthIssuer: process.env.AIGRC_HTTP_OAUTH_ISSUER,
    httpOAuthAudience: process.env.AIGRC_HTTP_OAUTH_AUDIENCE,
    httpRequestsPerMinute: parseInt(
      process.env.AIGRC_HTTP_REQUESTS_PER_MINUTE || "120",
      10
    ),
    httpToolCallsPerHour: parseInt(
      process.env.AIGRC_HTTP_TOOL_CALLS_PER_HOUR || "1000",
      10
    ),
    httpStateful: process.env.AIGRC_HTTP_STATEFUL !== "false",
  });
}

/**
 * Get configuration value with type safety
 */
export function getConfigValue<K extends keyof AIGRCConfig>(
  config: AIGRCConfig,
  key: K
): AIGRCConfig[K] {
  return config[key];
}
