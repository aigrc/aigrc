// ─────────────────────────────────────────────────────────────────
// PangoGuard — Environment Configuration
// ─────────────────────────────────────────────────────────────────

import type { ConfidenceLevel } from "@aigrc/core";

export interface AppConfig {
  // GitHub App credentials
  github: {
    appId: string;
    privateKey: string;
    webhookSecret: string;
  };

  // Supabase persistence
  supabase: {
    url: string;
    serviceRoleKey: string;
  };

  // Server
  server: {
    port: number;
    logLevel: string;
    nodeEnv: string;
  };

  // Scan configuration
  scan: {
    timeoutMs: number;
    confidenceThreshold: ConfidenceLevel;
    maxFilesPerScan: number;
    maxFileSizeBytes: number;
  };

  // Feature flags
  features: {
    autoInstrumentation: boolean;
    persistence: boolean;
    scheduledScans: boolean;
  };
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function optionalEnv(name: string, defaultValue: string): string {
  return process.env[name] || defaultValue;
}

function optionalEnvInt(name: string, defaultValue: number): number {
  const raw = process.env[name];
  if (!raw) return defaultValue;
  const parsed = parseInt(raw, 10);
  if (isNaN(parsed)) {
    throw new Error(`Environment variable ${name} must be a valid integer, got: ${raw}`);
  }
  return parsed;
}

function optionalEnvBool(name: string, defaultValue: boolean): boolean {
  const raw = process.env[name];
  if (!raw) return defaultValue;
  return raw.toLowerCase() === "true" || raw === "1";
}

function validateConfidenceLevel(value: string): ConfidenceLevel {
  const valid: ConfidenceLevel[] = ["high", "medium", "low"];
  if (!valid.includes(value as ConfidenceLevel)) {
    throw new Error(
      `Invalid CONFIDENCE_THRESHOLD: "${value}". Must be one of: ${valid.join(", ")}`
    );
  }
  return value as ConfidenceLevel;
}

/**
 * Load and validate all configuration from environment variables.
 * Throws on missing required vars or invalid values.
 */
export function loadConfig(): AppConfig {
  return {
    github: {
      appId: requireEnv("GITHUB_APP_ID"),
      privateKey: requireEnv("GITHUB_PRIVATE_KEY"),
      webhookSecret: requireEnv("GITHUB_WEBHOOK_SECRET"),
    },
    supabase: {
      url: optionalEnv("SUPABASE_URL", ""),
      serviceRoleKey: optionalEnv("SUPABASE_SERVICE_ROLE_KEY", ""),
    },
    server: {
      port: optionalEnvInt("PORT", 3000),
      logLevel: optionalEnv("LOG_LEVEL", "info"),
      nodeEnv: optionalEnv("NODE_ENV", "development"),
    },
    scan: {
      timeoutMs: optionalEnvInt("SCAN_TIMEOUT_MS", 10000),
      confidenceThreshold: validateConfidenceLevel(
        optionalEnv("CONFIDENCE_THRESHOLD", "medium")
      ),
      maxFilesPerScan: optionalEnvInt("MAX_FILES_PER_SCAN", 500),
      maxFileSizeBytes: optionalEnvInt("MAX_FILE_SIZE_BYTES", 1048576),
    },
    features: {
      autoInstrumentation: optionalEnvBool("ENABLE_AUTO_INSTRUMENTATION", true),
      persistence: optionalEnvBool("ENABLE_PERSISTENCE", true),
      scheduledScans: optionalEnvBool("ENABLE_SCHEDULED_SCANS", false),
    },
  };
}

/**
 * Validate that persistence config is available when persistence is enabled.
 */
export function validateConfig(config: AppConfig): string[] {
  const warnings: string[] = [];

  if (config.features.persistence) {
    if (!config.supabase.url) {
      warnings.push("SUPABASE_URL not set — persistence will be disabled");
    }
    if (!config.supabase.serviceRoleKey) {
      warnings.push("SUPABASE_SERVICE_ROLE_KEY not set — persistence will be disabled");
    }
  }

  return warnings;
}
