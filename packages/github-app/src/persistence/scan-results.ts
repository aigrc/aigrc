// ─────────────────────────────────────────────────────────────────
// PangoGuard — Scan Results Persistence
// CRUD operations for the scan_results table
// ─────────────────────────────────────────────────────────────────

import { getSupabase, isPersistenceEnabled } from "./client.js";
import { createLogger } from "../utils/logger.js";
import { PersistenceError } from "../utils/errors.js";
import type { ScanResultRecord, AppScanResult } from "../types.js";

const log = createLogger("persistence:scan-results");

/**
 * Save a scan result record.
 */
export async function saveScanResult(
  record: ScanResultRecord
): Promise<ScanResultRecord | null> {
  if (!isPersistenceEnabled()) return null;

  const supabase = getSupabase()!;

  const { data, error } = await supabase
    .from("scan_results")
    .insert(record)
    .select()
    .single();

  if (error) {
    throw new PersistenceError(`Failed to save scan result: ${error.message}`, {
      repo: record.repo_full_name,
      prNumber: record.pr_number,
    });
  }

  log.info("Scan result saved", { id: data.id, repo: record.repo_full_name });
  return data as ScanResultRecord;
}

/**
 * Convert an AppScanResult to a ScanResultRecord for persistence.
 */
export function toScanResultRecord(
  installationId: string,
  repoFullName: string,
  commitSha: string,
  scanType: ScanResultRecord["scan_type"],
  appResult: AppScanResult,
  prNumber?: number
): ScanResultRecord {
  return {
    installation_id: installationId,
    repo_full_name: repoFullName,
    pr_number: prNumber,
    commit_sha: commitSha,
    scan_type: scanType,
    detections: {
      totalDetections: appResult.scanResult.summary.totalDetections,
      byFramework: appResult.scanResult.summary.byFramework,
      detections: appResult.scanResult.detections.map((d) => ({
        filePath: d.filePath,
        framework: d.framework,
        category: d.category,
        confidence: d.confidence,
        line: d.line,
      })),
    },
    risk_summary: {
      tier: appResult.tier,
      tierLabel: appResult.tierLabel,
      riskLevel: appResult.classification.riskLevel,
      reasons: appResult.classification.reasons,
      agenticElevations: appResult.agenticElevations.map((e) => ({
        pattern: e.pattern,
        indicator: e.indicator,
        riskElevation: e.riskElevation,
        critical: e.critical,
      })),
      capabilities: appResult.detectedCapabilities,
    },
    created_at: new Date().toISOString(),
  };
}

/**
 * Get recent scan results for a repository.
 */
export async function getRecentScans(
  repoFullName: string,
  limit: number = 10
): Promise<ScanResultRecord[]> {
  if (!isPersistenceEnabled()) return [];

  const supabase = getSupabase()!;

  const { data, error } = await supabase
    .from("scan_results")
    .select("*")
    .eq("repo_full_name", repoFullName)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    throw new PersistenceError(`Failed to get scan results: ${error.message}`);
  }

  return (data ?? []) as ScanResultRecord[];
}
