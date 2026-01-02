import type { KillSwitchCommand } from "@aigrc/core";

// ─────────────────────────────────────────────────────────────────
// KILL SWITCH LISTENER ABSTRACTION
// Transport-agnostic interface for receiving kill switch commands
// ─────────────────────────────────────────────────────────────────

/**
 * Callback function invoked when a kill switch command is received
 * Returns boolean indicating if command was processed successfully
 */
export type KillSwitchCommandHandler = (command: KillSwitchCommand) => void | boolean | Promise<void> | Promise<boolean>;

/**
 * Callback function invoked when a listener error occurs
 */
export type KillSwitchErrorHandler = (error: Error) => void;

/**
 * Callback function invoked when listener connection state changes
 */
export type KillSwitchConnectionHandler = (connected: boolean) => void;

/**
 * Configuration options for kill switch listeners
 */
export interface KillSwitchListenerConfig {
  /** Callback when command is received */
  onCommand: KillSwitchCommandHandler;
  /** Callback when error occurs */
  onError?: KillSwitchErrorHandler;
  /** Callback when connection state changes */
  onConnectionChange?: KillSwitchConnectionHandler;
}

/**
 * Abstract interface for kill switch command listeners.
 *
 * Implementations:
 * - SSEListener: Real-time Server-Sent Events (primary)
 * - PollingListener: HTTP polling fallback
 * - FileListener: Local file watching (air-gapped environments)
 */
export interface KillSwitchListener {
  /**
   * Start listening for commands
   */
  start(): void | Promise<void>;

  /**
   * Stop listening for commands
   */
  stop(): void | Promise<void>;

  /**
   * Check if listener is currently active
   */
  isActive(): boolean;

  /**
   * Get the listener type name
   */
  getType(): string;
}

/**
 * Base class for kill switch listeners providing common functionality
 */
export abstract class BaseKillSwitchListener implements KillSwitchListener {
  protected active = false;
  protected config: KillSwitchListenerConfig;

  constructor(config: KillSwitchListenerConfig) {
    this.config = config;
  }

  abstract start(): void | Promise<void>;
  abstract stop(): void | Promise<void>;
  abstract getType(): string;

  isActive(): boolean {
    return this.active;
  }

  /**
   * Helper to handle received commands safely
   */
  protected async handleCommand(command: KillSwitchCommand): Promise<void> {
    try {
      await this.config.onCommand(command);
    } catch (error) {
      this.handleError(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Helper to handle errors safely
   */
  protected handleError(error: Error): void {
    if (this.config.onError) {
      this.config.onError(error);
    } else {
      console.error(`[KillSwitch:${this.getType()}] Error:`, error);
    }
  }

  /**
   * Helper to notify connection state changes
   */
  protected notifyConnectionChange(connected: boolean): void {
    if (this.config.onConnectionChange) {
      this.config.onConnectionChange(connected);
    }
  }
}
