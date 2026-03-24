// ─────────────────────────────────────────────────────────────────
// PangoGuard — GitHub Permissions Helper
// Checks App permissions and provides guidance on missing permissions
// ─────────────────────────────────────────────────────────────────

import type { Octokit } from "@octokit/rest";
import { createLogger } from "../utils/logger.js";

const log = createLogger("permissions");

/**
 * Required permissions for PangoGuard.
 */
export const REQUIRED_PERMISSIONS = {
  // Read PR diffs and file contents
  contents: "read",
  // Post PR comments
  issues: "write",
  // Create Check Runs
  checks: "write",
  // Read PR metadata
  pull_requests: "read",
  // Read org members for CISO alerts
  members: "read",
} as const;

/**
 * Required webhook events.
 */
export const REQUIRED_EVENTS = [
  "pull_request",
  "push",
  "installation",
  "installation_repositories",
] as const;

/**
 * Validate that the app has the required permissions for a given installation.
 */
export async function validatePermissions(
  octokit: Octokit,
  installationId: number
): Promise<{
  valid: boolean;
  missing: string[];
}> {
  try {
    const { data } = await octokit.apps.getInstallation({
      installation_id: installationId,
    });

    const permissions = data.permissions ?? {};
    const missing: string[] = [];

    for (const [perm, level] of Object.entries(REQUIRED_PERMISSIONS)) {
      const actual = (permissions as Record<string, string>)[perm];
      if (!actual) {
        missing.push(`${perm}: ${level} (not granted)`);
      } else if (level === "write" && actual === "read") {
        missing.push(`${perm}: needs write, has read`);
      }
    }

    if (missing.length > 0) {
      log.warn("Missing permissions", { installationId, missing });
    }

    return { valid: missing.length === 0, missing };
  } catch (error) {
    log.error("Failed to validate permissions", {
      error: error instanceof Error ? error.message : String(error),
    });
    return { valid: false, missing: ["Unable to check permissions"] };
  }
}
