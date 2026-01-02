import * as fs from "fs";
import * as path from "path";
import type { KillSwitchCommand } from "@aigrc/core";
import { KillSwitchCommandSchema } from "@aigrc/core";
import { BaseKillSwitchListener, type KillSwitchListenerConfig } from "./listener.js";

// ─────────────────────────────────────────────────────────────────
// FILE KILL SWITCH LISTENER (AIG-70)
// File-based kill switch for air-gapped environments
// ─────────────────────────────────────────────────────────────────

/**
 * Configuration for file listener
 */
export interface FileListenerConfig extends KillSwitchListenerConfig {
  /** Path to kill switch command file */
  filePath: string;
  /** Polling interval for file changes in ms */
  pollIntervalMs?: number;
  /** Whether to delete file after processing */
  deleteAfterProcessing?: boolean;
}

/**
 * File Listener for kill switch commands.
 *
 * Features:
 * - File-based kill switch for air-gapped environments
 * - Watches local file system for command files
 * - JSON-based command format
 * - Optional file deletion after processing
 *
 * Use Cases:
 * - Air-gapped environments without network connectivity
 * - High-security environments with network restrictions
 * - Testing and development
 *
 * File Format:
 * - Single command: JSON object matching KillSwitchCommand schema
 * - Multiple commands: JSON array of KillSwitchCommand objects
 */
export class FileListener extends BaseKillSwitchListener {
  private readonly filePath: string;
  private readonly pollIntervalMs: number;
  private readonly deleteAfterProcessing: boolean;

  private watcher: fs.FSWatcher | null = null;
  private pollTimer: ReturnType<typeof setInterval> | null = null;
  private lastModifiedTime = 0;
  private processedCommands = new Set<string>();

  constructor(config: FileListenerConfig) {
    super(config);
    this.filePath = path.resolve(config.filePath);
    this.pollIntervalMs = config.pollIntervalMs ?? 5000; // Default 5s
    this.deleteAfterProcessing = config.deleteAfterProcessing ?? false;
  }

  getType(): string {
    return "File";
  }

  async start(): Promise<void> {
    if (this.active) {
      return;
    }

    this.active = true;
    console.log(`[KillSwitch:File] Watching file: ${this.filePath}`);

    // Ensure directory exists
    const dir = path.dirname(this.filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // Try to use fs.watch for real-time updates
    try {
      this.startFileWatcher();
    } catch (error) {
      console.warn("[KillSwitch:File] File watcher unavailable, using polling");
      this.startFilePolling();
    }

    // Initial check
    await this.checkFile();

    this.notifyConnectionChange(true);
  }

  async stop(): Promise<void> {
    if (!this.active) {
      return;
    }

    this.active = false;
    console.log("[KillSwitch:File] Stopping file watch");

    this.stopFileWatcher();
    this.stopFilePolling();

    this.notifyConnectionChange(false);
  }

  /**
   * Start file system watcher (preferred method)
   */
  private startFileWatcher(): void {
    try {
      this.watcher = fs.watch(this.filePath, (eventType) => {
        if (eventType === "change" || eventType === "rename") {
          this.checkFile();
        }
      });

      this.watcher.on("error", (error) => {
        console.warn("[KillSwitch:File] Watcher error, falling back to polling:", error);
        this.stopFileWatcher();
        this.startFilePolling();
      });
    } catch (error) {
      throw new Error(`Failed to start file watcher: ${error}`);
    }
  }

  /**
   * Stop file system watcher
   */
  private stopFileWatcher(): void {
    if (this.watcher) {
      this.watcher.close();
      this.watcher = null;
    }
  }

  /**
   * Start file polling (fallback method)
   */
  private startFilePolling(): void {
    this.pollTimer = setInterval(() => {
      this.checkFile();
    }, this.pollIntervalMs);
  }

  /**
   * Stop file polling
   */
  private stopFilePolling(): void {
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
  }

  /**
   * Check file for new commands
   */
  private async checkFile(): Promise<void> {
    if (!this.active) {
      return;
    }

    try {
      // Check if file exists
      if (!fs.existsSync(this.filePath)) {
        return;
      }

      // Check modification time to avoid re-processing
      const stats = fs.statSync(this.filePath);
      const modifiedTime = stats.mtimeMs;

      if (modifiedTime <= this.lastModifiedTime) {
        return; // No changes
      }

      this.lastModifiedTime = modifiedTime;

      // Read and process file
      const content = fs.readFileSync(this.filePath, "utf-8");
      if (!content.trim()) {
        return; // Empty file
      }

      await this.processFileContent(content);

      // Delete file if configured
      if (this.deleteAfterProcessing) {
        try {
          fs.unlinkSync(this.filePath);
          console.log("[KillSwitch:File] Deleted processed file");
        } catch (error) {
          console.warn("[KillSwitch:File] Failed to delete file:", error);
        }
      }
    } catch (error) {
      this.handleError(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Process file content
   */
  private async processFileContent(content: string): Promise<void> {
    try {
      const data = JSON.parse(content);

      // Handle single command
      if (data.command_id) {
        await this.processCommand(data);
        return;
      }

      // Handle array of commands
      if (Array.isArray(data)) {
        for (const command of data) {
          await this.processCommand(command);
        }
        return;
      }

      // Handle wrapped format
      if (data.command) {
        await this.processCommand(data.command);
        return;
      }

      if (data.commands && Array.isArray(data.commands)) {
        for (const command of data.commands) {
          await this.processCommand(command);
        }
        return;
      }

      throw new Error("Unrecognized file format");
    } catch (error) {
      this.handleError(
        error instanceof Error
          ? error
          : new Error(`Failed to process file content: ${String(error)}`)
      );
    }
  }

  /**
   * Process a single command
   */
  private async processCommand(data: any): Promise<void> {
    try {
      // Validate command schema
      const command = KillSwitchCommandSchema.parse(data);

      // Check if already processed (prevent duplicates on file re-reads)
      if (this.processedCommands.has(command.command_id)) {
        return;
      }

      this.processedCommands.add(command.command_id);

      // Limit processed commands cache to prevent memory growth
      if (this.processedCommands.size > 1000) {
        const firstKey = this.processedCommands.values().next().value;
        if (firstKey) {
          this.processedCommands.delete(firstKey);
        }
      }

      // Dispatch to handler
      await this.handleCommand(command);
    } catch (error) {
      this.handleError(
        error instanceof Error
          ? error
          : new Error(`Failed to process command: ${String(error)}`)
      );
    }
  }

  /**
   * Write a command to the file (for testing/manual control)
   */
  public static async writeCommand(
    filePath: string,
    command: KillSwitchCommand | KillSwitchCommand[]
  ): Promise<void> {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const content = JSON.stringify(command, null, 2);
    fs.writeFileSync(filePath, content, "utf-8");
  }

  /**
   * Clear processed commands cache
   */
  public clearProcessedCache(): void {
    this.processedCommands.clear();
  }
}
