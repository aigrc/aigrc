// ─────────────────────────────────────────────────────────────────
// PangoGuard — Push Webhook Handler
// Detects ungoverned AI assets pushed to default branch
// ─────────────────────────────────────────────────────────────────

import type { Context } from "probot";
import { scanPullRequestDiff } from "../detection/diff-scanner.js";
import { createGovernanceIssue } from "../output/issue-creator.js";
import { isPersistenceEnabled } from "../persistence/client.js";
import { getInstallation } from "../persistence/installations.js";
import { saveScanResult, toScanResultRecord } from "../persistence/scan-results.js";
import { upsertInventory } from "../persistence/inventory.js";
import { createLogger } from "../utils/logger.js";
import { serializeError } from "../utils/errors.js";
import type { PushEventData } from "../types.js";

const log = createLogger("push");

/**
 * Handle push events to the default branch.
 *
 * When ungoverned AI assets are pushed directly to main/master,
 * create a GitHub Issue alerting the repository owner.
 */
export async function handlePush(context: Context): Promise<void> {
  const payload = context.payload as any;

  // Only process pushes to the default branch
  const defaultBranch = payload.repository.default_branch;
  const ref = payload.ref;
  if (ref !== `refs/heads/${defaultBranch}`) {
    log.debug(`Ignoring push to non-default branch: ${ref}`);
    return;
  }

  const eventData: PushEventData = {
    owner: payload.repository.owner.login ?? payload.repository.owner.name,
    repo: payload.repository.name,
    ref: payload.ref,
    headSha: payload.after,
    defaultBranch,
    installationId: payload.installation?.id ?? 0,
    commits: payload.commits?.map((c: any) => ({
      id: c.id,
      added: c.added ?? [],
      modified: c.modified ?? [],
      removed: c.removed ?? [],
    })) ?? [],
  };

  // Collect all changed files from the push
  const changedFiles = new Set<string>();
  for (const commit of eventData.commits) {
    for (const file of [...commit.added, ...commit.modified]) {
      changedFiles.add(file);
    }
  }

  if (changedFiles.size === 0) {
    log.debug("No changed files in push, skipping");
    return;
  }

  log.info(`Processing push to ${eventData.owner}/${eventData.repo}:${defaultBranch}`, {
    changedFiles: changedFiles.size,
    commits: eventData.commits.length,
  });

  try {
    // Quick scan of changed files
    // For push events, we use the diff scanner but with limited scope
    const scanResult = await scanPullRequestDiff(
      context.octokit,
      eventData.owner,
      eventData.repo,
      0, // No PR number for push events — uses commit diff
      Array.from(changedFiles)
    );

    if (scanResult.scanResult.detections.length === 0) {
      log.info("No AI/ML detections in push");
      return;
    }

    // Filter to ungoverned detections only
    if (scanResult.governanceStatus === "ungoverned") {
      log.info("Ungoverned AI asset detected in push to default branch", {
        detections: scanResult.scanResult.detections.length,
        tier: scanResult.tier,
      });

      await createGovernanceIssue(
        context.octokit,
        eventData.owner,
        eventData.repo,
        "ungoverned_asset",
        {
          scanResult,
          commitSha: eventData.headSha,
          changedFiles: Array.from(changedFiles),
        }
      );

      // Create CISO alert for L3 detections on default branch
      if (scanResult.tier === "L3") {
        await createGovernanceIssue(
          context.octokit,
          eventData.owner,
          eventData.repo,
          "ciso_alert",
          { scanResult }
        );
      }
    }

    // Persist to Supabase (if enabled)
    if (isPersistenceEnabled() && scanResult.scanResult.detections.length > 0) {
      try {
        const installation = await getInstallation(eventData.installationId);
        if (installation?.id) {
          const repoFullName = `${eventData.owner}/${eventData.repo}`;

          const scanRecord = toScanResultRecord(
            installation.id,
            repoFullName,
            eventData.headSha,
            "push",
            scanResult
          );
          await saveScanResult(scanRecord);
          await upsertInventory(installation.id, repoFullName, scanResult);

          log.info("Push scan results persisted to Supabase");
        }
      } catch (persistError) {
        log.warn("Persistence failed (non-fatal)", serializeError(persistError));
      }
    }
  } catch (error) {
    log.error(`Failed to process push to ${eventData.owner}/${eventData.repo}`, serializeError(error));
  }
}
