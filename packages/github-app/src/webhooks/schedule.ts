// ─────────────────────────────────────────────────────────────────
// PangoGuard — Scheduled Scan Handler
// Opt-in weekly full-repo scan via .aigrc.yaml config
// ─────────────────────────────────────────────────────────────────

import { createLogger } from "../utils/logger.js";

const log = createLogger("schedule");

/**
 * Handle scheduled scan events (opt-in via .aigrc.yaml).
 *
 * This performs a deep full-repo scan and produces a summary
 * report Issue with inventory delta since last scan.
 *
 * TODO: Implement scheduled scan handler
 * - Read .aigrc.yaml for schedule config
 * - Deep full-repo scan (not just diff)
 * - Produce summary Issue with delta since last scan
 */
export async function handleScheduledScan(): Promise<void> {
  log.info("Scheduled scan handler not yet implemented");
}
