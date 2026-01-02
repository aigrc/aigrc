import type { KillSwitchCommand } from "@aigrc/core";
import { KillSwitchCommandSchema } from "@aigrc/core";
import { BaseKillSwitchListener, type KillSwitchListenerConfig } from "./listener.js";

// ─────────────────────────────────────────────────────────────────
// POLLING KILL SWITCH LISTENER (AIG-69)
// HTTP polling fallback when SSE is unavailable
// ─────────────────────────────────────────────────────────────────

/**
 * Configuration for polling listener
 */
export interface PollingListenerConfig extends KillSwitchListenerConfig {
  /** Polling endpoint URL */
  endpoint: string;
  /** Polling interval in milliseconds */
  pollIntervalMs?: number;
  /** Request headers */
  headers?: Record<string, string>;
  /** Request timeout in ms */
  timeoutMs?: number;
  /** Instance ID to include in requests */
  instanceId?: string;
  /** Asset ID to include in requests */
  assetId?: string;
}

/**
 * Polling Listener for kill switch commands.
 *
 * Features:
 * - Regular HTTP polling for commands
 * - Configurable polling interval (default 30s)
 * - Automatic error recovery
 * - Request deduplication
 *
 * Performance:
 * - Default 30s polling interval
 * - Contributes to <60s kill switch SLA
 * - Suitable for environments where SSE is blocked
 */
export class PollingListener extends BaseKillSwitchListener {
  private readonly endpoint: string;
  private readonly pollIntervalMs: number;
  private readonly headers: Record<string, string>;
  private readonly timeoutMs: number;
  private readonly instanceId?: string;
  private readonly assetId?: string;

  private pollTimer: ReturnType<typeof setInterval> | null = null;
  private lastPollTime = 0;
  private consecutiveErrors = 0;
  private readonly maxConsecutiveErrors = 5;

  constructor(config: PollingListenerConfig) {
    super(config);
    this.endpoint = config.endpoint;
    this.pollIntervalMs = config.pollIntervalMs ?? 30000; // Default 30s
    this.headers = config.headers ?? {};
    this.timeoutMs = config.timeoutMs ?? 10000; // 10s request timeout
    this.instanceId = config.instanceId;
    this.assetId = config.assetId;
  }

  getType(): string {
    return "Polling";
  }

  async start(): Promise<void> {
    if (this.active) {
      return;
    }

    this.active = true;
    this.consecutiveErrors = 0;
    console.log(`[KillSwitch:Polling] Starting polling (interval: ${this.pollIntervalMs}ms)`);

    // Immediate first poll
    await this.poll();

    // Schedule regular polling
    this.pollTimer = setInterval(() => {
      this.poll();
    }, this.pollIntervalMs);

    this.notifyConnectionChange(true);
  }

  async stop(): Promise<void> {
    if (!this.active) {
      return;
    }

    this.active = false;
    console.log("[KillSwitch:Polling] Stopping polling");

    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }

    this.notifyConnectionChange(false);
  }

  /**
   * Execute a single poll request
   */
  private async poll(): Promise<void> {
    if (!this.active) {
      return;
    }

    const startTime = Date.now();
    this.lastPollTime = startTime;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

      try {
        // Build query parameters
        const params = new URLSearchParams();
        if (this.instanceId) {
          params.set("instance_id", this.instanceId);
        }
        if (this.assetId) {
          params.set("asset_id", this.assetId);
        }
        params.set("last_poll", new Date(this.lastPollTime).toISOString());

        const url = `${this.endpoint}?${params.toString()}`;

        const response = await fetch(url, {
          method: "GET",
          headers: {
            Accept: "application/json",
            ...this.headers,
          },
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(`Polling request failed: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();

        // Handle response
        await this.handlePollResponse(data);

        // Reset error counter on success
        this.consecutiveErrors = 0;

        const elapsed = Date.now() - startTime;
        if (elapsed > 5000) {
          console.warn(`[KillSwitch:Polling] Slow poll response: ${elapsed}ms`);
        }
      } catch (error) {
        clearTimeout(timeoutId);
        throw error;
      }
    } catch (error) {
      this.consecutiveErrors++;
      this.handleError(error instanceof Error ? error : new Error(String(error)));

      // If too many consecutive errors, notify disconnection
      if (this.consecutiveErrors >= this.maxConsecutiveErrors) {
        console.error(
          `[KillSwitch:Polling] ${this.maxConsecutiveErrors} consecutive errors, marking as disconnected`
        );
        this.notifyConnectionChange(false);
      }
    }
  }

  /**
   * Handle poll response data
   */
  private async handlePollResponse(data: any): Promise<void> {
    // Handle empty response (no commands)
    if (!data || (Array.isArray(data) && data.length === 0)) {
      return;
    }

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

    // Handle wrapped response
    if (data.commands && Array.isArray(data.commands)) {
      for (const command of data.commands) {
        await this.processCommand(command);
      }
      return;
    }

    // Handle single command in wrapper
    if (data.command) {
      await this.processCommand(data.command);
      return;
    }
  }

  /**
   * Process and validate a single command
   */
  private async processCommand(data: any): Promise<void> {
    try {
      // Validate command schema
      const command = KillSwitchCommandSchema.parse(data);

      // Dispatch to handler
      await this.handleCommand(command);
    } catch (error) {
      this.handleError(
        error instanceof Error
          ? error
          : new Error(`Failed to parse poll response: ${String(error)}`)
      );
    }
  }

  /**
   * Get the last poll timestamp
   */
  public getLastPollTime(): number {
    return this.lastPollTime;
  }

  /**
   * Get the number of consecutive errors
   */
  public getConsecutiveErrors(): number {
    return this.consecutiveErrors;
  }

  /**
   * Trigger an immediate poll (useful for testing or manual refresh)
   */
  public async pollNow(): Promise<void> {
    await this.poll();
  }
}
