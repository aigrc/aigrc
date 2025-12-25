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

  // Cache settings
  cacheTtl: z.number().default(300),

  // Compliance profiles
  profiles: z.array(z.string()).default(["eu-ai-act"]),

  // Red team integration
  redTeamEnabled: z.boolean().default(false),
  aigosApiUrl: z.string().optional(),
  aigosApiKey: z.string().optional(),
});

export type AIGRCConfig = z.infer<typeof AIGRCConfigSchema>;

/**
 * Load configuration from environment variables
 */
export function loadConfig(): AIGRCConfig {
  const profilesRaw = process.env.AIGRC_PROFILES || "eu-ai-act";

  return AIGRCConfigSchema.parse({
    workspace: process.env.AIGRC_WORKSPACE || ".",
    cardsDir: process.env.AIGRC_CARDS_DIR || ".aigrc/cards",
    logLevel: process.env.AIGRC_LOG_LEVEL || "info",
    cacheTtl: parseInt(process.env.AIGRC_CACHE_TTL || "300", 10),
    profiles: profilesRaw.split(",").map((p) => p.trim()),
    redTeamEnabled: process.env.AIGRC_REDTEAM_ENABLED === "true",
    aigosApiUrl: process.env.AIGOS_API_URL,
    aigosApiKey: process.env.AIGOS_API_KEY,
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
