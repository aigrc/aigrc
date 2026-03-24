// ─────────────────────────────────────────────────────────────────
// PangoGuard — PR Diff Scanner
// Scans only changed files from a PR diff (not the whole repo)
// ─────────────────────────────────────────────────────────────────

import { tmpdir } from "node:os";
import { join } from "node:path";
import { mkdir, writeFile, rm } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import type { Octokit } from "@octokit/rest";
import { scan, classifyRisk, inferRiskFactors } from "@aigrc/core";
import type { ScanResult, DetectionResult } from "@aigrc/core";
import { detectAgenticPatterns } from "./agentic-patterns.js";
import { mapToTier } from "../classification/tier-mapper.js";
import { mapToRegulations } from "../classification/regulatory-mapper.js";
import { createLogger } from "../utils/logger.js";
import { ScanError, ScanTimeoutError } from "../utils/errors.js";
import type { AppScanResult } from "../types.js";

const log = createLogger("diff-scanner");

/**
 * Scan only the changed files in a PR diff.
 *
 * @param octokit - Authenticated Octokit instance
 * @param owner - Repository owner
 * @param repo - Repository name
 * @param prNumber - PR number (0 for push events)
 * @param fileFilter - Optional list of file paths to limit scanning to
 * @returns AppScanResult with full classification and regulatory mapping
 */
export async function scanPullRequestDiff(
  octokit: Octokit,
  owner: string,
  repo: string,
  prNumber: number,
  fileFilter?: string[]
): Promise<AppScanResult> {
  const scanId = randomUUID().substring(0, 8);
  const tempDir = join(tmpdir(), `aigrc-scan-${scanId}`);

  try {
    // ── Step 1: Fetch changed files ────────────────────────────
    log.info(`[${scanId}] Fetching changed files...`);

    let changedFiles: Array<{ filename: string; status: string; patch?: string }>;

    if (prNumber > 0) {
      // PR diff mode
      const response = await octokit.pulls.listFiles({
        owner,
        repo,
        pull_number: prNumber,
        per_page: 300,
      });
      changedFiles = response.data.map((f) => ({
        filename: f.filename,
        status: f.status,
        patch: f.patch,
      }));
    } else {
      // Push mode — use provided file filter
      changedFiles = (fileFilter ?? []).map((f) => ({
        filename: f,
        status: "modified",
      }));
    }

    // Apply file filter if provided
    if (fileFilter && fileFilter.length > 0) {
      const filterSet = new Set(fileFilter);
      changedFiles = changedFiles.filter((f) => filterSet.has(f.filename));
    }

    // Filter to scannable extensions
    const scannableExtensions = new Set([
      ".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs",
      ".py", ".pyw",
      ".yaml", ".yml",
      ".json",
      ".toml",
      ".go",
      ".rs",
      ".java", ".kt", ".scala",
      ".rb",
      ".cs",
      ".swift",
      ".r", ".R",
    ]);

    changedFiles = changedFiles.filter((f) => {
      const ext = f.filename.substring(f.filename.lastIndexOf("."));
      return scannableExtensions.has(ext) || f.filename.endsWith("Dockerfile") || f.filename.endsWith("Modelfile");
    });

    if (changedFiles.length === 0) {
      log.info(`[${scanId}] No scannable files in diff`);
      return createEmptyScanResult();
    }

    log.info(`[${scanId}] Found ${changedFiles.length} scannable files`);

    // ── Step 2: Fetch file contents and write to temp dir ──────
    await mkdir(tempDir, { recursive: true });

    const fileContents = new Map<string, string>();

    await Promise.all(
      changedFiles.map(async (file) => {
        if (file.status === "removed") return;

        try {
          const response = await octokit.repos.getContent({
            owner,
            repo,
            path: file.filename,
            ref: prNumber > 0 ? undefined : undefined, // Uses default branch
          });

          if ("content" in response.data && response.data.type === "file") {
            const content = Buffer.from(
              response.data.content,
              "base64"
            ).toString("utf-8");

            // Write to temp directory preserving path structure
            const filePath = join(tempDir, file.filename);
            const fileDir = filePath.substring(0, filePath.lastIndexOf("/"));
            await mkdir(fileDir, { recursive: true });
            await writeFile(filePath, content, "utf-8");

            fileContents.set(file.filename, content);
          }
        } catch (error) {
          log.warn(`[${scanId}] Failed to fetch file: ${file.filename}`, {
            error: error instanceof Error ? error.message : String(error),
          });
        }
      })
    );

    if (fileContents.size === 0) {
      log.info(`[${scanId}] No file contents fetched`);
      return createEmptyScanResult();
    }

    // ── Step 3: Run @aigrc/core scan ───────────────────────────
    log.info(`[${scanId}] Running @aigrc/core scan on ${fileContents.size} files...`);

    const scanResult: ScanResult = await scan({
      directory: tempDir,
      recursive: true,
      maxFileSize: 1048576,
      maxFiles: 500,
    });

    if (scanResult.detections.length === 0) {
      log.info(`[${scanId}] No detections from core scan`);
      return createEmptyScanResult();
    }

    // ── Step 4: Run agentic pattern detection ──────────────────
    log.info(`[${scanId}] Detecting agentic patterns...`);
    const agenticElevations = detectAgenticPatterns(
      scanResult.detections,
      fileContents
    );

    // ── Step 5: Classify risk and map tier ─────────────────────
    const classification = classifyRisk(
      scanResult.inferredRiskFactors as any
    );

    const tierResult = mapToTier(classification, agenticElevations);

    // ── Step 6: Map to regulatory frameworks ───────────────────
    const regulatoryMapping = mapToRegulations(
      tierResult.tier,
      scanResult.detections
    );

    // ── Step 7: Determine detected capabilities ────────────────
    const detectedCapabilities = extractCapabilities(scanResult.detections);

    // ── Step 8: Build AppScanResult ────────────────────────────
    const appResult: AppScanResult = {
      scanResult,
      classification,
      tier: tierResult.tier,
      tierLabel: tierResult.tierLabel,
      agenticElevations,
      regulatoryMapping,
      detectedCapabilities,
      governanceStatus: "ungoverned",
      confidenceThreshold: "medium",
    };

    log.info(`[${scanId}] Scan complete`, {
      detections: scanResult.detections.length,
      tier: appResult.tier,
      tierLabel: appResult.tierLabel,
      capabilities: detectedCapabilities,
    });

    return appResult;
  } catch (error) {
    if (error instanceof ScanTimeoutError) throw error;
    throw new ScanError(
      `Failed to scan PR diff: ${error instanceof Error ? error.message : String(error)}`,
      { owner, repo, prNumber }
    );
  } finally {
    // Clean up temp directory
    try {
      await rm(tempDir, { recursive: true, force: true });
    } catch {
      log.warn(`[${scanId}] Failed to clean up temp directory: ${tempDir}`);
    }
  }
}

/**
 * Extract detected AI capabilities from detections.
 */
function extractCapabilities(detections: DetectionResult[]): string[] {
  const capabilities = new Set<string>();

  for (const d of detections) {
    // Map categories to capabilities
    if (d.category === "agent_framework") capabilities.add("agent orchestration");
    if (d.category === "llm_provider") capabilities.add("LLM API access");
    if (d.category === "ml_framework") capabilities.add("model inference");
    if (d.category === "model_file") capabilities.add("local model execution");

    // Map risk implications to capabilities
    for (const impl of d.implies) {
      if (impl.factor === "toolExecution" && impl.value === true) {
        capabilities.add("tool execution");
      }
      if (impl.factor === "externalDataAccess" && impl.value === true) {
        capabilities.add("external API access");
      }
      if (impl.factor === "autonomousDecisions" && impl.value === true) {
        capabilities.add("autonomous decisions");
      }
      if (impl.factor === "piiProcessing" && impl.value === "yes") {
        capabilities.add("PII processing");
      }
    }
  }

  return Array.from(capabilities);
}

/**
 * Create an empty scan result for when no detections are found.
 */
function createEmptyScanResult(): AppScanResult {
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
