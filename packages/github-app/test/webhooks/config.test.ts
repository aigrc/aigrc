// ─────────────────────────────────────────────────────────────────
// @aigrc/github-app — Config Tests
// ─────────────────────────────────────────────────────────────────

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { loadConfig, validateConfig } from "../../src/config.js";

describe("loadConfig", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = {
      ...originalEnv,
      GITHUB_APP_ID: "123456",
      GITHUB_PRIVATE_KEY: "-----BEGIN RSA PRIVATE KEY-----\ntest\n-----END RSA PRIVATE KEY-----",
      GITHUB_WEBHOOK_SECRET: "test-secret",
    };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("should load required GitHub config", () => {
    const config = loadConfig();
    expect(config.github.appId).toBe("123456");
    expect(config.github.webhookSecret).toBe("test-secret");
  });

  it("should throw on missing required env var", () => {
    delete process.env.GITHUB_APP_ID;
    expect(() => loadConfig()).toThrow("Missing required environment variable: GITHUB_APP_ID");
  });

  it("should use default values for optional config", () => {
    const config = loadConfig();
    expect(config.server.port).toBe(3000);
    expect(config.server.logLevel).toBe("info");
    expect(config.scan.confidenceThreshold).toBe("medium");
    expect(config.scan.maxFilesPerScan).toBe(500);
    expect(config.features.autoInstrumentation).toBe(true);
  });

  it("should parse integer env vars", () => {
    process.env.PORT = "8080";
    process.env.SCAN_TIMEOUT_MS = "30000";
    const config = loadConfig();
    expect(config.server.port).toBe(8080);
    expect(config.scan.timeoutMs).toBe(30000);
  });

  it("should parse boolean env vars", () => {
    process.env.ENABLE_AUTO_INSTRUMENTATION = "false";
    process.env.ENABLE_PERSISTENCE = "0";
    const config = loadConfig();
    expect(config.features.autoInstrumentation).toBe(false);
    expect(config.features.persistence).toBe(false);
  });

  it("should reject invalid confidence threshold", () => {
    process.env.CONFIDENCE_THRESHOLD = "invalid";
    expect(() => loadConfig()).toThrow("Invalid CONFIDENCE_THRESHOLD");
  });
});

describe("validateConfig", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = {
      ...originalEnv,
      GITHUB_APP_ID: "123456",
      GITHUB_PRIVATE_KEY: "-----BEGIN RSA PRIVATE KEY-----\ntest\n-----END RSA PRIVATE KEY-----",
      GITHUB_WEBHOOK_SECRET: "test-secret",
    };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("should warn when persistence enabled without Supabase URL", () => {
    const config = loadConfig();
    config.features.persistence = true;
    config.supabase.url = "";

    const warnings = validateConfig(config);
    expect(warnings.some((w) => w.includes("SUPABASE_URL"))).toBe(true);
  });

  it("should return no warnings when properly configured", () => {
    const config = loadConfig();
    config.features.persistence = false;

    const warnings = validateConfig(config);
    expect(warnings).toHaveLength(0);
  });
});
