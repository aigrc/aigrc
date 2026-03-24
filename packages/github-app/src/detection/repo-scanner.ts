// ─────────────────────────────────────────────────────────────────
// PangoGuard — Full Repository Scanner
// Shallow clone + full scan for installation/scheduled events
// ─────────────────────────────────────────────────────────────────

import { tmpdir } from "node:os";
import { join } from "node:path";
import { rm } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import type { Octokit } from "@octokit/rest";
import simpleGit from "simple-git";
import { scan, classifyRisk } from "@aigrc/core";
import { detectAgenticPatterns } from "./agentic-patterns.js";
import { mapToTier } from "../classification/tier-mapper.js";
import { mapToRegulations } from "../classification/regulatory-mapper.js";
import { createLogger } from "../utils/logger.js";
import { ScanError } from "../utils/errors.js";
import type { AppScanResult } from "../types.js";

const log = createLogger("repo-scanner");

/**
 * Perform a full repository scan via shallow clone.
 *
 * Used for:
 * - Installation events (inventory all repos)
 * - Scheduled weekly scans
 *
 * @param octokit - Authenticated Octokit instance
 * @param owner - Repository owner
 * @param repo - Repository name
 * @returns AppScanResult with full classification
 */
export async function scanRepository(
  octokit: Octokit,
  owner: string,
  repo: string
): Promise<AppScanResult> {
  const scanId = randomUUID().substring(0, 8);
  const cloneDir = join(tmpdir(), `aigrc-repo-${scanId}`);

  try {
    // ── Step 1: Get clone URL with installation token ──────────
    log.info(`[${scanId}] Preparing to clone ${owner}/${repo}...`);

    // Get the repository info to build the clone URL
    const repoInfo = await octokit.repos.get({ owner, repo });
    const cloneUrl = repoInfo.data.clone_url;

    // ── Step 2: Shallow clone ──────────────────────────────────
    log.info(`[${scanId}] Shallow cloning ${owner}/${repo}...`);

    const git = simpleGit();
    await git.clone(cloneUrl, cloneDir, [
      "--depth", "1",
      "--single-branch",
    ]);

    // ── Step 3: Run @aigrc/core scan ───────────────────────────
    log.info(`[${scanId}] Running full repository scan...`);

    const scanResult = await scan({
      directory: cloneDir,
      recursive: true,
      maxFileSize: 1048576,
      maxFiles: 1000,
      ignorePatterns: [
        "node_modules",
        ".git",
        "dist",
        "build",
        "__pycache__",
        ".venv",
        "venv",
      ],
    });

    if (scanResult.detections.length === 0) {
      log.info(`[${scanId}] No AI/ML detections in ${owner}/${repo}`);
      return createEmptyRepoScanResult();
    }

    // ── Step 4: Run agentic pattern detection ──────────────────
    // For full repo scans, we read file contents from disk
    const fileContents = new Map<string, string>();
    // Note: In full repo scans, agentic detection uses detection results only
    const agenticElevations = detectAgenticPatterns(
      scanResult.detections,
      fileContents
    );

    // ── Step 5: Classify and map ───────────────────────────────
    const classification = classifyRisk(scanResult.inferredRiskFactors as any);
    const tierResult = mapToTier(classification, agenticElevations);
    const regulatoryMapping = mapToRegulations(tierResult.tier, scanResult.detections);

    const detectedCapabilities: string[] = [];
    for (const d of scanResult.detections) {
      if (d.category === "agent_framework") detectedCapabilities.push("agent orchestration");
      if (d.category === "llm_provider") detectedCapabilities.push("LLM API access");
    }

    const appResult: AppScanResult = {
      scanResult,
      classification,
      tier: tierResult.tier,
      tierLabel: tierResult.tierLabel,
      agenticElevations,
      regulatoryMapping,
      detectedCapabilities: [...new Set(detectedCapabilities)],
      governanceStatus: "ungoverned",
      confidenceThreshold: "medium",
    };

    log.info(`[${scanId}] Repo scan complete for ${owner}/${repo}`, {
      detections: scanResult.detections.length,
      tier: appResult.tier,
    });

    return appResult;
  } catch (error) {
    throw new ScanError(
      `Failed to scan repository ${owner}/${repo}: ${error instanceof Error ? error.message : String(error)}`,
      { owner, repo }
    );
  } finally {
    try {
      await rm(cloneDir, { recursive: true, force: true });
    } catch {
      log.warn(`[${scanId}] Failed to clean up clone directory: ${cloneDir}`);
    }
  }
}

function createEmptyRepoScanResult(): AppScanResult {
  return {
    scanResult: {
      detections: [],
      summary: {
        totalDetections: 0,
        byFramework: {},
        byCategory: {} as any,
        byConfidence: {} as any,
      },
      inferredRiskFactors: {},
      suggestedTechnical: {},
      scannedFiles: 0,
      skippedFiles: 0,
      duration: 0,
    },
    classification: {
      riskLevel: "minimal",
      reasons: [],
      euAiActCategory: "minimal_risk",
      requiredArtifacts: [],
    },
    tier: "L0",
    tierLabel: "MINIMAL",
    agenticElevations: [],
    regulatoryMapping: {
      euAiAct: { classification: "minimal_risk", articles: [], obligations: [] },
      nistRmf: { functions: [], subcategories: [], actions: [] },
      iso42001: { clauses: [], obligations: [], controls: [] },
    },
    detectedCapabilities: [],
    governanceStatus: "ungoverned",
    confidenceThreshold: "medium",
  };
}
