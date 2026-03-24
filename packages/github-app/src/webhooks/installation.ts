// ─────────────────────────────────────────────────────────────────
// PangoGuard — Installation Webhook Handler
// Runs inventory scan when App is installed on an org
// ─────────────────────────────────────────────────────────────────

import type { Context } from "probot";
import { scanRepository } from "../detection/repo-scanner.js";
import { createGovernanceIssue } from "../output/issue-creator.js";
import { upsertInstallation, deleteInstallation, getInstallation } from "../persistence/installations.js";
import { isPersistenceEnabled } from "../persistence/client.js";
import { saveScanResult, toScanResultRecord } from "../persistence/scan-results.js";
import { upsertInventory } from "../persistence/inventory.js";
import { createLogger } from "../utils/logger.js";
import { serializeError } from "../utils/errors.js";
import type { InstallationEventData } from "../types.js";

const log = createLogger("installation");

/**
 * Handle installation.created events.
 *
 * When an org admin installs PangoGuard:
 * 1. Record the installation in Supabase
 * 2. Queue async inventory scans for each accessible repository
 * 3. Create "Shadow AI Inventory" issues listing all detected assets
 */
export async function handleInstallation(context: Context): Promise<void> {
  const payload = context.payload as any;

  const eventData: InstallationEventData = {
    installationId: payload.installation.id,
    action: payload.action,
    account: {
      login: payload.installation.account.login,
      type: payload.installation.account.type,
    },
    repositories: (payload.repositories ?? payload.repositories_added ?? []).map(
      (r: any) => ({
        id: r.id,
        name: r.name,
        fullName: r.full_name,
        private: r.private,
      })
    ),
  };

  log.info(
    `App ${eventData.action} on ${eventData.account.login} (${eventData.account.type})`,
    {
      installationId: eventData.installationId,
      repoCount: eventData.repositories.length,
    }
  );

  // ── Persist installation record ─────────────────────────────
  if (isPersistenceEnabled()) {
    try {
      if (eventData.action === "deleted") {
        await deleteInstallation(eventData.installationId);
        log.info("Installation record deleted from Supabase");
        return;
      }

      await upsertInstallation({
        github_installation_id: eventData.installationId,
        github_org_login: eventData.account.login,
        github_org_type: eventData.account.type as "Organization" | "User",
        plan: {},
        installed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
      log.info("Installation record saved to Supabase");
    } catch (persistError) {
      log.warn("Installation persistence failed (non-fatal)", serializeError(persistError));
    }
  } else if (eventData.action === "deleted") {
    log.info("Installation deleted (persistence not enabled)");
    return;
  }

  // Process each repository asynchronously
  for (const repo of eventData.repositories) {
    try {
      log.info(`Scanning repository: ${repo.fullName}`);

      const scanResult = await scanRepository(
        context.octokit,
        eventData.account.login,
        repo.name
      );

      if (scanResult.scanResult.detections.length > 0) {
        log.info(
          `Found ${scanResult.scanResult.detections.length} AI/ML assets in ${repo.fullName}`,
          { tier: scanResult.tier }
        );

        await createGovernanceIssue(
          context.octokit,
          eventData.account.login,
          repo.name,
          "shadow_inventory",
          {
            scanResult,
            repoFullName: repo.fullName,
          }
        );

        // Persist scan results and inventory
        if (isPersistenceEnabled()) {
          try {
            const installation = await getInstallation(eventData.installationId);
            if (installation?.id) {
              const record = toScanResultRecord(
                installation.id,
                repo.fullName,
                "installation-scan",
                "full_repo",
                scanResult
              );
              await saveScanResult(record);
              await upsertInventory(installation.id, repo.fullName, scanResult);
            }
          } catch (persistError) {
            log.warn(`Persistence failed for ${repo.fullName} (non-fatal)`, serializeError(persistError));
          }
        }
      } else {
        log.info(`No AI/ML assets found in ${repo.fullName}`);
      }
    } catch (error) {
      log.error(`Failed to scan repository: ${repo.fullName}`, serializeError(error));
    }
  }

  log.info(`Installation scan complete for ${eventData.account.login}`);
}
