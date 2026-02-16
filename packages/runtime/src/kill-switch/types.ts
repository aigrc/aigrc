/**
 * Kill Switch Types (SPEC-RT-005)
 * Remote termination command types and interfaces
 */

import type { RuntimeIdentity, KillSwitchCommand } from "@aigrc/core";

// Re-export from core
export type { KillSwitchCommand };

// ─────────────────────────────────────────────────────────────────
// CHANNEL TYPES
// ─────────────────────────────────────────────────────────────────

/** Kill switch channel type */
export type KillSwitchChannelType = "sse" | "polling" | "file";

/** Kill switch connection state */
export type ConnectionState = "disconnected" | "connecting" | "connected" | "reconnecting" | "error";

// ─────────────────────────────────────────────────────────────────
// CONFIGURATION
// ─────────────────────────────────────────────────────────────────

/**
 * Kill Switch configuration
 * AIGOS-701
 */
export interface KillSwitchConfig {
  /** Enable kill switch monitoring */
  enabled: boolean;

  /** Primary channel type */
  channel: KillSwitchChannelType;

  /** SSE/Polling endpoint URL */
  endpoint?: string;

  /** File path for file-based kill switch (local dev) */
  filePath?: string;

  /** Polling interval in milliseconds (for polling channel) */
  pollingInterval: number;

  /** Connection timeout in milliseconds */
  connectionTimeout: number;

  /** Reconnection delay in milliseconds */
  reconnectDelay: number;

  /** Maximum reconnection attempts */
  maxReconnectAttempts: number;

  /** Authentication token for API calls */
  authToken?: string;

  /** Public key for command signature verification */
  verificationKey?: string;

  /** Handler called when agent should terminate */
  onTerminate?: KillSwitchTerminateHandler;

  /** Handler called when agent should pause */
  onPause?: KillSwitchPauseHandler;

  /** Handler called when agent should resume */
  onResume?: KillSwitchResumeHandler;

  /** Event handlers for monitoring */
  eventHandlers: KillSwitchEventHandler[];
}

// ─────────────────────────────────────────────────────────────────
// COMMAND HANDLERS
// ─────────────────────────────────────────────────────────────────

/** Terminate handler */
export type KillSwitchTerminateHandler = (
  identity: RuntimeIdentity,
  command: KillSwitchCommand,
  reason: string
) => void | Promise<void>;

/** Pause handler */
export type KillSwitchPauseHandler = (
  identity: RuntimeIdentity,
  command: KillSwitchCommand
) => void | Promise<void>;

/** Resume handler */
export type KillSwitchResumeHandler = (
  identity: RuntimeIdentity,
  command: KillSwitchCommand
) => void | Promise<void>;

// ─────────────────────────────────────────────────────────────────
// EVENTS
// ─────────────────────────────────────────────────────────────────

/** Kill switch event types */
export type KillSwitchEventType =
  | "connected"
  | "disconnected"
  | "reconnecting"
  | "command.received"
  | "command.verified"
  | "command.executed"
  | "command.failed"
  | "verification.failed"
  | "error";

/** Base kill switch event */
export interface BaseKillSwitchEvent {
  type: KillSwitchEventType;
  timestamp: string;
}

/** Connected event */
export interface KillSwitchConnectedEvent extends BaseKillSwitchEvent {
  type: "connected";
  channel: KillSwitchChannelType;
  endpoint?: string;
}

/** Disconnected event */
export interface KillSwitchDisconnectedEvent extends BaseKillSwitchEvent {
  type: "disconnected";
  reason?: string;
}

/** Reconnecting event */
export interface KillSwitchReconnectingEvent extends BaseKillSwitchEvent {
  type: "reconnecting";
  attempt: number;
  maxAttempts: number;
}

/** Command received event */
export interface KillSwitchCommandReceivedEvent extends BaseKillSwitchEvent {
  type: "command.received";
  command: KillSwitchCommand;
}

/** Command verified event */
export interface KillSwitchCommandVerifiedEvent extends BaseKillSwitchEvent {
  type: "command.verified";
  command: KillSwitchCommand;
  verified: boolean;
}

/** Command executed event */
export interface KillSwitchCommandExecutedEvent extends BaseKillSwitchEvent {
  type: "command.executed";
  command: KillSwitchCommand;
  executionTime: number;
}

/** Command failed event */
export interface KillSwitchCommandFailedEvent extends BaseKillSwitchEvent {
  type: "command.failed";
  command: KillSwitchCommand;
  error: string;
}

/** Verification failed event */
export interface KillSwitchVerificationFailedEvent extends BaseKillSwitchEvent {
  type: "verification.failed";
  command: KillSwitchCommand;
  reason: string;
}

/** Error event */
export interface KillSwitchErrorEvent extends BaseKillSwitchEvent {
  type: "error";
  error: string;
  recoverable: boolean;
}

/** Union of all kill switch events */
export type KillSwitchEvent =
  | KillSwitchConnectedEvent
  | KillSwitchDisconnectedEvent
  | KillSwitchReconnectingEvent
  | KillSwitchCommandReceivedEvent
  | KillSwitchCommandVerifiedEvent
  | KillSwitchCommandExecutedEvent
  | KillSwitchCommandFailedEvent
  | KillSwitchVerificationFailedEvent
  | KillSwitchErrorEvent;

/** Kill switch event handler */
export type KillSwitchEventHandler = (event: KillSwitchEvent) => void | Promise<void>;

// ─────────────────────────────────────────────────────────────────
// COMMAND PROCESSING
// ─────────────────────────────────────────────────────────────────

/** Command execution result */
export interface CommandExecutionResult {
  success: boolean;
  command: KillSwitchCommand;
  executionTime: number;
  error?: string;
}

/** Verification result */
export interface CommandVerificationResult {
  verified: boolean;
  command: KillSwitchCommand;
  reason?: string;
}

// ─────────────────────────────────────────────────────────────────
// LISTENER INTERFACES
// ─────────────────────────────────────────────────────────────────

/** Channel listener interface */
export interface ChannelListener {
  /** Connect to the channel */
  connect(): Promise<void>;

  /** Disconnect from the channel */
  disconnect(): void;

  /** Check if connected */
  isConnected(): boolean;

  /** Register command callback */
  onCommand(callback: (command: KillSwitchCommand) => void): void;
}
