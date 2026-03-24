// ─────────────────────────────────────────────────────────────────
// PangoGuard — GitHub Authentication Helper
// Utilities for GitHub App authentication and Octokit instantiation
// ─────────────────────────────────────────────────────────────────

import { createLogger } from "../utils/logger.js";

const log = createLogger("auth");

/**
 * Parse a GitHub App private key from environment variable.
 * Supports both direct PEM content and base64-encoded PEM.
 */
export function parsePrivateKey(raw: string): string {
  // If it already looks like a PEM key, return as-is
  if (raw.startsWith("-----BEGIN")) {
    return raw;
  }

  // Try base64 decoding
  try {
    const decoded = Buffer.from(raw, "base64").toString("utf-8");
    if (decoded.startsWith("-----BEGIN")) {
      return decoded;
    }
  } catch {
    // Not valid base64, fall through
  }

  // Handle escaped newlines (common in env vars)
  const unescaped = raw.replace(/\\n/g, "\n");
  if (unescaped.startsWith("-----BEGIN")) {
    return unescaped;
  }

  log.warn("Private key format not recognized — using raw value");
  return raw;
}

/**
 * Get the GitHub App's installation URL for a given org.
 */
export function getInstallationUrl(appSlug: string): string {
  return `https://github.com/apps/${appSlug}/installations/new`;
}

/**
 * Get the app settings URL.
 */
export function getAppSettingsUrl(appSlug: string): string {
  return `https://github.com/settings/apps/${appSlug}`;
}
