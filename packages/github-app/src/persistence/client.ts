// ─────────────────────────────────────────────────────────────────
// PangoGuard — Supabase Persistence Client
// ─────────────────────────────────────────────────────────────────

import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { createLogger } from "../utils/logger.js";
import { PersistenceError } from "../utils/errors.js";

const log = createLogger("persistence");

let client: SupabaseClient | null = null;

/**
 * Initialize the Supabase client.
 * Returns null if credentials are not configured (persistence disabled).
 */
export function initSupabase(url: string, serviceRoleKey: string): SupabaseClient | null {
  if (!url || !serviceRoleKey) {
    log.warn("Supabase credentials not configured — persistence disabled");
    return null;
  }

  try {
    client = createClient(url, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    log.info("Supabase client initialized");
    return client;
  } catch (error) {
    throw new PersistenceError(
      `Failed to initialize Supabase: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Get the Supabase client instance.
 * Returns null if persistence is not configured.
 */
export function getSupabase(): SupabaseClient | null {
  return client;
}

/**
 * Check if persistence is available.
 */
export function isPersistenceEnabled(): boolean {
  return client !== null;
}
