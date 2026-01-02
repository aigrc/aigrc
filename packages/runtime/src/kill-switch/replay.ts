import type { KillSwitchCommand } from "@aigrc/core";

// ─────────────────────────────────────────────────────────────────
// REPLAY PREVENTION (AIG-75)
// Prevents replay attacks on kill switch commands
// Uses nonce tracking and timestamp validation
// ─────────────────────────────────────────────────────────────────

/**
 * Replay prevention configuration
 */
export interface ReplayPreventionConfig {
  /** Maximum age of commands in seconds */
  maxCommandAgeSeconds?: number;
  /** Maximum number of nonces to track */
  maxNonceCache?: number;
  /** Whether to persist nonces to disk */
  persistNonces?: boolean;
  /** File path for nonce persistence */
  noncePersistencePath?: string;
}

/**
 * Replay check result
 */
export interface ReplayCheckResult {
  /** Whether command passes replay check */
  valid: boolean;
  /** Error message if check failed */
  error?: string;
  /** Whether this is a replay attempt */
  isReplay?: boolean;
}

/**
 * Nonce entry for tracking
 */
interface NonceEntry {
  commandId: string;
  timestamp: Date;
  commandType: string;
}

/**
 * Replay Prevention Guard
 *
 * Prevents replay attacks by:
 * 1. Tracking command IDs (nonces) to detect duplicates
 * 2. Validating command timestamps to reject old commands
 * 3. Automatic cleanup of old nonces to prevent memory growth
 */
export class ReplayPreventionGuard {
  private readonly config: ReplayPreventionConfig;
  private readonly processedNonces: Map<string, NonceEntry>;
  private cleanupTimer: ReturnType<typeof setInterval> | null = null;

  constructor(config: ReplayPreventionConfig = {}) {
    this.config = {
      maxCommandAgeSeconds: 300, // 5 minutes default
      maxNonceCache: 10000,
      persistNonces: false,
      ...config,
    };

    this.processedNonces = new Map();

    // Start cleanup timer
    this.startCleanupTimer();

    // Load persisted nonces if enabled
    if (this.config.persistNonces) {
      this.loadPersistedNonces();
    }
  }

  /**
   * Check if a command is a replay attack
   */
  public checkCommand(command: KillSwitchCommand): ReplayCheckResult {
    // Check timestamp age
    const ageResult = this.checkTimestamp(command);
    if (!ageResult.valid) {
      return ageResult;
    }

    // Check for duplicate command ID (nonce)
    const nonceResult = this.checkNonce(command);
    if (!nonceResult.valid) {
      return nonceResult;
    }

    return { valid: true };
  }

  /**
   * Mark a command as processed
   */
  public markProcessed(command: KillSwitchCommand): void {
    const entry: NonceEntry = {
      commandId: command.command_id,
      timestamp: new Date(),
      commandType: command.type,
    };

    this.processedNonces.set(command.command_id, entry);

    // Enforce cache size limit
    if (this.processedNonces.size > this.config.maxNonceCache!) {
      this.pruneOldestNonces();
    }

    // Persist if enabled
    if (this.config.persistNonces) {
      this.persistNonces();
    }
  }

  /**
   * Check command timestamp
   */
  private checkTimestamp(command: KillSwitchCommand): ReplayCheckResult {
    try {
      const commandTime = new Date(command.timestamp).getTime();
      const now = Date.now();
      const ageSeconds = (now - commandTime) / 1000;

      // Reject future timestamps
      if (ageSeconds < 0) {
        return {
          valid: false,
          error: "Command timestamp is in the future",
          isReplay: false,
        };
      }

      // Reject old commands
      if (ageSeconds > this.config.maxCommandAgeSeconds!) {
        return {
          valid: false,
          error: `Command too old (${Math.round(ageSeconds)}s > ${this.config.maxCommandAgeSeconds}s)`,
          isReplay: true,
        };
      }

      return { valid: true };
    } catch (error) {
      return {
        valid: false,
        error: `Invalid timestamp: ${error instanceof Error ? error.message : String(error)}`,
        isReplay: false,
      };
    }
  }

  /**
   * Check command nonce (command ID)
   */
  private checkNonce(command: KillSwitchCommand): ReplayCheckResult {
    // Check if command ID has been processed
    if (this.processedNonces.has(command.command_id)) {
      const entry = this.processedNonces.get(command.command_id)!;
      return {
        valid: false,
        error: `Duplicate command ID (processed at ${entry.timestamp.toISOString()})`,
        isReplay: true,
      };
    }

    return { valid: true };
  }

  /**
   * Prune oldest nonces to maintain cache size
   */
  private pruneOldestNonces(): void {
    const entries = Array.from(this.processedNonces.entries());

    // Sort by timestamp (oldest first)
    entries.sort((a, b) => a[1].timestamp.getTime() - b[1].timestamp.getTime());

    // Remove oldest 10%
    const removeCount = Math.floor(this.config.maxNonceCache! * 0.1);
    for (let i = 0; i < removeCount; i++) {
      this.processedNonces.delete(entries[i][0]);
    }

    console.log(`[KillSwitch:Replay] Pruned ${removeCount} old nonces`);
  }

  /**
   * Clean up expired nonces
   */
  private cleanupExpiredNonces(): void {
    const now = Date.now();
    const expiryMs = this.config.maxCommandAgeSeconds! * 1000;
    let removed = 0;

    for (const [commandId, entry] of this.processedNonces.entries()) {
      const age = now - entry.timestamp.getTime();
      if (age > expiryMs * 2) {
        // Keep for 2x the command age for extra safety
        this.processedNonces.delete(commandId);
        removed++;
      }
    }

    if (removed > 0) {
      console.log(`[KillSwitch:Replay] Cleaned up ${removed} expired nonces`);
    }
  }

  /**
   * Start periodic cleanup timer
   */
  private startCleanupTimer(): void {
    // Run cleanup every minute
    this.cleanupTimer = setInterval(() => {
      this.cleanupExpiredNonces();
    }, 60000);
  }

  /**
   * Stop cleanup timer
   */
  public stop(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
  }

  /**
   * Clear all processed nonces (for testing)
   */
  public clear(): void {
    this.processedNonces.clear();
    console.log("[KillSwitch:Replay] Cleared all nonces");
  }

  /**
   * Get number of tracked nonces
   */
  public getNonceCount(): number {
    return this.processedNonces.size;
  }

  /**
   * Check if a command ID has been processed
   */
  public hasProcessed(commandId: string): boolean {
    return this.processedNonces.has(commandId);
  }

  /**
   * Get all processed command IDs
   */
  public getProcessedCommandIds(): string[] {
    return Array.from(this.processedNonces.keys());
  }

  /**
   * Load persisted nonces from disk
   */
  private loadPersistedNonces(): void {
    if (!this.config.noncePersistencePath) {
      return;
    }

    try {
      const fs = require("fs");
      if (!fs.existsSync(this.config.noncePersistencePath)) {
        return;
      }

      const content = fs.readFileSync(this.config.noncePersistencePath, "utf-8");
      const data = JSON.parse(content);

      if (Array.isArray(data)) {
        for (const item of data) {
          this.processedNonces.set(item.commandId, {
            commandId: item.commandId,
            timestamp: new Date(item.timestamp),
            commandType: item.commandType,
          });
        }

        console.log(
          `[KillSwitch:Replay] Loaded ${this.processedNonces.size} persisted nonces`
        );
      }
    } catch (error) {
      console.error("[KillSwitch:Replay] Failed to load persisted nonces:", error);
    }
  }

  /**
   * Persist nonces to disk
   */
  private persistNonces(): void {
    if (!this.config.noncePersistencePath) {
      return;
    }

    try {
      const fs = require("fs");
      const path = require("path");

      const data = Array.from(this.processedNonces.values()).map((entry) => ({
        commandId: entry.commandId,
        timestamp: entry.timestamp.toISOString(),
        commandType: entry.commandType,
      }));

      const dir = path.dirname(this.config.noncePersistencePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      fs.writeFileSync(this.config.noncePersistencePath, JSON.stringify(data, null, 2));
    } catch (error) {
      console.error("[KillSwitch:Replay] Failed to persist nonces:", error);
    }
  }

  /**
   * Export nonces for backup/migration
   */
  public exportNonces(): Array<{ commandId: string; timestamp: string; commandType: string }> {
    return Array.from(this.processedNonces.values()).map((entry) => ({
      commandId: entry.commandId,
      timestamp: entry.timestamp.toISOString(),
      commandType: entry.commandType,
    }));
  }

  /**
   * Import nonces from backup/migration
   */
  public importNonces(
    nonces: Array<{ commandId: string; timestamp: string; commandType: string }>
  ): void {
    for (const item of nonces) {
      this.processedNonces.set(item.commandId, {
        commandId: item.commandId,
        timestamp: new Date(item.timestamp),
        commandType: item.commandType,
      });
    }

    console.log(`[KillSwitch:Replay] Imported ${nonces.length} nonces`);
  }
}

/**
 * Global replay prevention guard instance
 * Shared across all kill switch instances in the same process
 */
let globalGuard: ReplayPreventionGuard | null = null;

/**
 * Get or create the global replay prevention guard
 */
export function getGlobalReplayGuard(config?: ReplayPreventionConfig): ReplayPreventionGuard {
  if (!globalGuard) {
    globalGuard = new ReplayPreventionGuard(config);
  }
  return globalGuard;
}

/**
 * Reset the global replay prevention guard (for testing)
 */
export function resetGlobalReplayGuard(): void {
  if (globalGuard) {
    globalGuard.stop();
    globalGuard = null;
  }
}
