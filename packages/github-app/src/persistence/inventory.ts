// ─────────────────────────────────────────────────────────────────
// PangoGuard — AI Asset Inventory Persistence
// CRUD operations for the ai_asset_inventory table
// ─────────────────────────────────────────────────────────────────

import { getSupabase, isPersistenceEnabled } from "./client.js";
import { createLogger } from "../utils/logger.js";
import { PersistenceError } from "../utils/errors.js";
import type { AssetInventoryRecord, AppScanResult, RiskTier } from "../types.js";

const log = createLogger("persistence:inventory");

/**
 * Upsert AI asset inventory records from a scan result.
 * Creates or updates one record per unique (repo, file_path, framework) tuple.
 */
export async function upsertInventory(
  installationId: string,
  repoFullName: string,
  appResult: AppScanResult
): Promise<void> {
  if (!isPersistenceEnabled()) return;

  const supabase = getSupabase()!;

  // Deduplicate by file + framework
  const assetMap = new Map<string, AssetInventoryRecord>();

  for (const detection of appResult.scanResult.detections) {
    const key = `${detection.filePath}::${detection.framework}`;

    if (!assetMap.has(key)) {
      assetMap.set(key, {
        installation_id: installationId,
        repo_full_name: repoFullName,
        file_path: detection.filePath,
        asset_type: detection.category,
        framework: detection.framework,
        risk_tier: appResult.tier,
        governance_status: appResult.governanceStatus,
        first_detected_at: new Date().toISOString(),
        last_seen_at: new Date().toISOString(),
        metadata: {
          confidence: detection.confidence,
          capabilities: appResult.detectedCapabilities,
        },
      });
    }
  }

  const records = Array.from(assetMap.values());

  if (records.length === 0) return;

  // Upsert each record (on conflict: repo + file_path + framework)
  for (const record of records) {
    const { error } = await supabase
      .from("ai_asset_inventory")
      .upsert(record, {
        onConflict: "repo_full_name,file_path,framework",
      });

    if (error) {
      log.warn(`Failed to upsert inventory record: ${error.message}`, {
        filePath: record.file_path,
        framework: record.framework,
      });
    }
  }

  log.info(`Inventory updated: ${records.length} assets`, {
    repo: repoFullName,
  });
}

/**
 * Get the full AI asset inventory for an installation.
 */
export async function getInventory(
  installationId: string
): Promise<AssetInventoryRecord[]> {
  if (!isPersistenceEnabled()) return [];

  const supabase = getSupabase()!;

  const { data, error } = await supabase
    .from("ai_asset_inventory")
    .select("*")
    .eq("installation_id", installationId)
    .order("last_seen_at", { ascending: false });

  if (error) {
    throw new PersistenceError(`Failed to get inventory: ${error.message}`);
  }

  return (data ?? []) as AssetInventoryRecord[];
}

/**
 * Get inventory grouped by risk tier.
 */
export async function getInventoryByTier(
  installationId: string
): Promise<Record<RiskTier, AssetInventoryRecord[]>> {
  const inventory = await getInventory(installationId);

  const grouped: Record<RiskTier, AssetInventoryRecord[]> = {
    L0: [],
    L1: [],
    L2: [],
    L3: [],
  };

  for (const record of inventory) {
    grouped[record.risk_tier].push(record);
  }

  return grouped;
}

/**
 * Get ungoverned assets for an installation.
 */
export async function getUngovernedAssets(
  installationId: string
): Promise<AssetInventoryRecord[]> {
  if (!isPersistenceEnabled()) return [];

  const supabase = getSupabase()!;

  const { data, error } = await supabase
    .from("ai_asset_inventory")
    .select("*")
    .eq("installation_id", installationId)
    .eq("governance_status", "ungoverned")
    .order("risk_tier", { ascending: false });

  if (error) {
    throw new PersistenceError(`Failed to get ungoverned assets: ${error.message}`);
  }

  return (data ?? []) as AssetInventoryRecord[];
}
