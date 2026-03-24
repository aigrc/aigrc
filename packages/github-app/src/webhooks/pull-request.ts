// ─────────────────────────────────────────────────────────────────
// PangoGuard — Pull Request Webhook Handler
// Full scan → classify → comment → check run pipeline
// ─────────────────────────────────────────────────────────────────

import type { Context } from "probot";
import { scanPullRequestDiff } from "../detection/diff-scanner.js";
import { mapToTier } from "../classification/tier-mapper.js";
import { mapToRegulations } from "../classification/regulatory-mapper.js";
import { detectAgenticPatterns } from "../detection/agentic-patterns.js";
import { renderComment } from "../output/comment-renderer.js";
import { createCheckRun } from "../output/check-run.js";
import { createGovernanceIssue } from "../output/issue-creator.js";
import { generateInstrumentation } from "../instrumentation/instrumentor.js";
import { isPersistenceEnabled } from "../persistence/client.js";
import { getInstallation } from "../persistence/installations.js";
import { saveScanResult, toScanResultRecord } from "../persistence/scan-results.js";
import { upsertInventory } from "../persistence/inventory.js";
import { createLogger } from "../utils/logger.js";
import { serializeError } from "../utils/errors.js";
import type { AppScanResult, PullRequestEventData } from "../types.js";

const log = createLogger("pull-request");

/** HTML marker for idempotent comment updates */
const COMMENT_MARKER = "<!-- pangoguard-governance-check -->";

/**
 * Handle pull_request.opened, pull_request.synchronize, and pull_request.reopened events.
 *
 * Pipeline:
 * 1. Extract event data from webhook payload
 * 2. Scan PR diff for AI/ML framework usage
 * 3. Detect agentic behavioral patterns
 * 4. Classify risk tier (L0-L3) with agentic elevation
 * 5. Map to regulatory frameworks (EU AI Act, NIST, ISO 42001)
 * 6. Render and post/update PR comment
 * 7. Create GitHub Check Run
 * 8. Persist results to Supabase (if enabled)
 */
export async function handlePullRequest(context: Context): Promise<void> {
  const payload = context.payload as any;

  const eventData: PullRequestEventData = {
    owner: payload.repository.owner.login,
    repo: payload.repository.name,
    prNumber: payload.pull_request.number,
    headSha: payload.pull_request.head.sha,
    action: payload.action,
    installationId: payload.installation?.id ?? 0,
  };

  log.info(`Processing PR #${eventData.prNumber} on ${eventData.owner}/${eventData.repo}`, {
    action: eventData.action,
    sha: eventData.headSha.substring(0, 8),
  });

  try {
    // ── Step 1: Scan PR diff ─────────────────────────────────────
    log.info("Scanning PR diff...");
    const scanResult = await scanPullRequestDiff(
      context.octokit,
      eventData.owner,
      eventData.repo,
      eventData.prNumber
    );

    // If no AI/ML detections found, post a clean check and skip comment
    if (scanResult.scanResult.detections.length === 0) {
      log.info("No AI/ML detections found in PR diff");
      await createCheckRun(
        context.octokit,
        eventData.owner,
        eventData.repo,
        eventData.headSha,
        scanResult
      );
      return;
    }

    log.info(`Found ${scanResult.scanResult.detections.length} AI/ML detections`, {
      frameworks: Object.keys(scanResult.scanResult.summary.byFramework),
      tier: scanResult.tier,
    });

    // ── Step 2: Render PR comment ────────────────────────────────
    const commentBody = renderComment(scanResult);
    const fullComment = `${COMMENT_MARKER}\n${commentBody}`;

    // ── Step 3: Post or update comment (idempotent) ──────────────
    await postOrUpdateComment(context, eventData, fullComment);

    // ── Step 4: Create Check Run ─────────────────────────────────
    await createCheckRun(
      context.octokit,
      eventData.owner,
      eventData.repo,
      eventData.headSha,
      scanResult
    );

    // ── Step 5: Generate auto-instrumentation wrappers ─────────
    try {
      const wrappers = generateInstrumentation(scanResult);
      if (wrappers.length > 0) {
        log.info(`Generated ${wrappers.length} instrumentation wrappers`, {
          frameworks: wrappers.map((w) => w.framework),
        });
      }
    } catch (instrError) {
      log.warn("Auto-instrumentation generation failed (non-fatal)", serializeError(instrError));
    }

    // ── Step 6: Create CISO alert for L3 detections ────────────
    if (scanResult.tier === "L3") {
      try {
        await createGovernanceIssue(
          context.octokit,
          eventData.owner,
          eventData.repo,
          "ciso_alert",
          { scanResult }
        );
        log.info("CISO alert issue created for L3 detection");
      } catch (cisoError) {
        log.warn("Failed to create CISO alert issue (non-fatal)", serializeError(cisoError));
      }
    }

    // ── Step 7: Persist to Supabase (if enabled) ───────────────
    if (isPersistenceEnabled()) {
      try {
        const installation = await getInstallation(eventData.installationId);
        if (installation?.id) {
          const repoFullName = `${eventData.owner}/${eventData.repo}`;

          // Save scan result
          const scanRecord = toScanResultRecord(
            installation.id,
            repoFullName,
            eventData.headSha,
            "pr_diff",
            scanResult,
            eventData.prNumber
          );
          await saveScanResult(scanRecord);

          // Update asset inventory
          await upsertInventory(installation.id, repoFullName, scanResult);

          log.info("Scan results persisted to Supabase");
        }
      } catch (persistError) {
        log.warn("Persistence failed (non-fatal)", serializeError(persistError));
      }
    }

    log.info(`PR #${eventData.prNumber} governance check complete`, {
      tier: scanResult.tier,
      tierLabel: scanResult.tierLabel,
      detections: scanResult.scanResult.detections.length,
      capabilities: scanResult.detectedCapabilities,
    });
  } catch (error) {
    log.error(`Failed to process PR #${eventData.prNumber}`, serializeError(error));

    // Post error comment so developer knows something went wrong
    try {
      await context.octokit.issues.createComment({
        owner: eventData.owner,
        repo: eventData.repo,
        issue_number: eventData.prNumber,
        body: `${COMMENT_MARKER}\n\n> **PangoGuard** encountered an error during scanning. The governance team has been notified.\n\n_This does not block your PR._`,
      });
    } catch {
      log.error("Failed to post error comment");
    }
  }
}

/**
 * Post a new comment or update an existing one (idempotent via HTML marker).
 */
async function postOrUpdateComment(
  context: Context,
  eventData: PullRequestEventData,
  body: string
): Promise<void> {
  const { owner, repo, prNumber } = eventData;

  // Find existing AIGRC comment
  const comments = await context.octokit.issues.listComments({
    owner,
    repo,
    issue_number: prNumber,
    per_page: 100,
  });

  const existingComment = comments.data.find(
    (comment) => comment.body?.includes(COMMENT_MARKER)
  );

  if (existingComment) {
    log.info("Updating existing governance comment", { commentId: existingComment.id });
    await context.octokit.issues.updateComment({
      owner,
      repo,
      comment_id: existingComment.id,
      body,
    });
  } else {
    log.info("Creating new governance comment");
    await context.octokit.issues.createComment({
      owner,
      repo,
      issue_number: prNumber,
      body,
    });
  }
}
