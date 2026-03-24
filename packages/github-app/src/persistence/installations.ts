// ─────────────────────────────────────────────────────────────────
// PangoGuard — Installations Persistence
// CRUD operations for the installations table
// ─────────────────────────────────────────────────────────────────

import { getSupabase, isPersistenceEnabled } from "./client.js";
import { createLogger } from "../utils/logger.js";
import { PersistenceError } from "../utils/errors.js";
import type { InstallationRecord } from "../types.js";

const log = createLogger("persistence:installations");

/**
 * Upsert an installation record.
 */
export async function upsertInstallation(
  record: InstallationRecord
): Promise<InstallationRecord | null> {
  if (!isPersistenceEnabled()) return null;

  const supabase = getSupabase()!;

  const { data, error } = await supabase
    .from("installations")
    .upsert(
      {
        github_installation_id: record.github_installation_id,
        github_org_login: record.github_org_login,
        github_org_type: record.github_org_type,
        plan: record.plan,
        installed_at: record.installed_at,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "github_installation_id" }
    )
    .select()
    .single();

  if (error) {
    throw new PersistenceError(`Failed to upsert installation: ${error.message}`, {
      installationId: record.github_installation_id,
    });
  }

  log.info("Installation upserted", { id: data.id });
  return data as InstallationRecord;
}

/**
 * Get an installation by GitHub installation ID.
 */
export async function getInstallation(
  githubInstallationId: number
): Promise<InstallationRecord | null> {
  if (!isPersistenceEnabled()) return null;

  const supabase = getSupabase()!;

  const { data, error } = await supabase
    .from("installations")
    .select("*")
    .eq("github_installation_id", githubInstallationId)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null; // Not found
    throw new PersistenceError(`Failed to get installation: ${error.message}`);
  }

  return data as InstallationRecord;
}

/**
 * Delete an installation record.
 */
export async function deleteInstallation(
  githubInstallationId: number
): Promise<void> {
  if (!isPersistenceEnabled()) return;

  const supabase = getSupabase()!;

  const { error } = await supabase
    .from("installations")
    .delete()
    .eq("github_installation_id", githubInstallationId);

  if (error) {
    throw new PersistenceError(`Failed to delete installation: ${error.message}`);
  }

  log.info("Installation deleted", { githubInstallationId });
}
