/**
 * Kill Switch Receiver (SPEC-RT-005)
 * Multi-channel remote termination receiver with SSE, polling, and file support
 */

import type { RuntimeIdentity, KillSwitchCommand } from "@aigrc/core";
import type {
  KillSwitchConfig,
  KillSwitchEvent,
  KillSwitchEventHandler,
  ConnectionState,
  CommandExecutionResult,
  CommandVerificationResult,
  ChannelListener,
} from "./types.js";

// ─────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────

/** Default configuration */
const DEFAULT_CONFIG: KillSwitchConfig = {
  enabled: false,
  channel: "polling",
  pollingInterval: 5000,
  connectionTimeout: 10000,
  reconnectDelay: 3000,
  maxReconnectAttempts: 10,
  eventHandlers: [],
};

/** Maximum time allowed for kill switch execution (SPEC requirement: 60 seconds) */
const MAX_EXECUTION_TIME_MS = 60000;

// ─────────────────────────────────────────────────────────────────
// KILL SWITCH RECEIVER CLASS
// ─────────────────────────────────────────────────────────────────

/**
 * Kill Switch Receiver - listens for remote termination commands
 * AIGOS-701 through AIGOS-710
 */
export class KillSwitchReceiver {
  private config: KillSwitchConfig;
  private identity: RuntimeIdentity | null = null;
  private state: ConnectionState = "disconnected";
  private listener: ChannelListener | null = null;
  private processedCommands: Set<string> = new Set();
  private reconnectAttempts = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private paused = false;

  constructor(config: Partial<KillSwitchConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Start the kill switch receiver
   * AIGOS-702
   */
  async start(identity: RuntimeIdentity): Promise<void> {
    if (!this.config.enabled) {
      return;
    }

    this.identity = identity;
    this.state = "connecting";

    try {
      // Create appropriate listener based on channel type
      this.listener = this.createListener();
      this.listener.onCommand((command) => this.handleCommand(command));

      await this.listener.connect();
      this.state = "connected";
      this.reconnectAttempts = 0;

      await this.emitEvent({
        type: "connected",
        timestamp: new Date().toISOString(),
        channel: this.config.channel,
        endpoint: this.config.endpoint,
      });
    } catch (error) {
      this.state = "error";
      await this.emitEvent({
        type: "error",
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : String(error),
        recoverable: true,
      });

      // Start reconnection
      this.scheduleReconnect();
    }
  }

  /**
   * Stop the kill switch receiver
   */
  stop(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.listener) {
      this.listener.disconnect();
      this.listener = null;
    }

    this.state = "disconnected";
    this.emitEvent({
      type: "disconnected",
      timestamp: new Date().toISOString(),
      reason: "stopped",
    });
  }

  /**
   * Create a channel listener based on configuration
   * AIGOS-703, AIGOS-704, AIGOS-705
   */
  private createListener(): ChannelListener {
    switch (this.config.channel) {
      case "sse":
        return new SSEListener(this.config);
      case "polling":
        return new PollingListener(this.config);
      case "file":
        return new FileListener(this.config);
      default:
        throw new KillSwitchError(
          "INVALID_CHANNEL",
          `Unknown channel type: ${this.config.channel}`
        );
    }
  }

  /**
   * Handle incoming command
   * AIGOS-706, AIGOS-707, AIGOS-708
   */
  private async handleCommand(command: KillSwitchCommand): Promise<void> {
    if (!this.identity) return;

    // Check for duplicate command
    if (this.processedCommands.has(command.command_id)) {
      return;
    }

    await this.emitEvent({
      type: "command.received",
      timestamp: new Date().toISOString(),
      command,
    });

    // Verify command targets this agent (AIGOS-707)
    if (!this.isTargeted(command)) {
      return;
    }

    // Verify command signature if verification key is configured (AIGOS-706)
    if (this.config.verificationKey) {
      const verification = await this.verifyCommand(command);

      await this.emitEvent({
        type: "command.verified",
        timestamp: new Date().toISOString(),
        command,
        verified: verification.verified,
      });

      if (!verification.verified) {
        await this.emitEvent({
          type: "verification.failed",
          timestamp: new Date().toISOString(),
          command,
          reason: verification.reason ?? "Signature verification failed",
        });
        return;
      }
    }

    // Execute command (AIGOS-708)
    const result = await this.executeCommand(command);

    if (result.success) {
      this.processedCommands.add(command.command_id);
      await this.emitEvent({
        type: "command.executed",
        timestamp: new Date().toISOString(),
        command,
        executionTime: result.executionTime,
      });
    } else {
      await this.emitEvent({
        type: "command.failed",
        timestamp: new Date().toISOString(),
        command,
        error: result.error ?? "Unknown error",
      });
    }
  }

  /**
   * Check if command targets this agent
   * AIGOS-707: Targeting validation
   */
  private isTargeted(command: KillSwitchCommand): boolean {
    if (!this.identity) return false;

    // Check instance_id target
    if (command.instance_id) {
      if (command.instance_id !== this.identity.instance_id) {
        return false;
      }
    }

    // Check asset_id target
    if (command.asset_id) {
      if (command.asset_id !== this.identity.asset_id) {
        return false;
      }
    }

    // Check organization target
    // Note: organization check would require additional identity field
    // For now, if organization is specified and doesn't match, skip
    // (organization would be in a config or identity extension)

    // If no specific target, command targets all agents
    return true;
  }

  /**
   * Verify command signature
   * AIGOS-706: Command verification
   */
  private async verifyCommand(command: KillSwitchCommand): Promise<CommandVerificationResult> {
    // Check for required signature
    if (!command.signature) {
      return {
        verified: false,
        command,
        reason: "Command missing signature",
      };
    }

    // Check timestamp is within acceptable window (5 minutes)
    const commandTime = new Date(command.timestamp).getTime();
    const now = Date.now();
    const maxAge = 5 * 60 * 1000; // 5 minutes

    if (now - commandTime > maxAge) {
      return {
        verified: false,
        command,
        reason: "Command timestamp too old",
      };
    }

    // Verify signature using Web Crypto API
    try {
      const encoder = new TextEncoder();
      const data = encoder.encode(
        JSON.stringify({
          command_id: command.command_id,
          type: command.type,
          instance_id: command.instance_id,
          asset_id: command.asset_id,
          organization: command.organization,
          timestamp: command.timestamp,
        })
      );

      // Import verification key
      const keyData = this.base64ToArrayBuffer(this.config.verificationKey!);
      const key = await crypto.subtle.importKey(
        "spki",
        keyData,
        { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
        false,
        ["verify"]
      );

      // Verify signature
      const signatureData = this.base64ToArrayBuffer(command.signature);
      const valid = await crypto.subtle.verify(
        "RSASSA-PKCS1-v1_5",
        key,
        signatureData,
        data
      );

      return {
        verified: valid,
        command,
        reason: valid ? undefined : "Invalid signature",
      };
    } catch (error) {
      return {
        verified: false,
        command,
        reason: `Signature verification error: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  /**
   * Execute a kill switch command
   * AIGOS-708
   */
  private async executeCommand(command: KillSwitchCommand): Promise<CommandExecutionResult> {
    if (!this.identity) {
      return {
        success: false,
        command,
        executionTime: 0,
        error: "No identity configured",
      };
    }

    const startTime = performance.now();

    try {
      // Set execution timeout
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(new Error(`Execution timeout exceeded (${MAX_EXECUTION_TIME_MS}ms)`));
        }, MAX_EXECUTION_TIME_MS);
      });

      // Execute based on command type
      const executionPromise = (async () => {
        switch (command.type) {
          case "TERMINATE":
            await this.executeTerminate(command);
            break;

          case "PAUSE":
            await this.executePause(command);
            break;

          case "RESUME":
            await this.executeResume(command);
            break;

          default:
            throw new Error(`Unknown command type: ${(command as KillSwitchCommand).type}`);
        }
      })();

      await Promise.race([executionPromise, timeoutPromise]);

      return {
        success: true,
        command,
        executionTime: performance.now() - startTime,
      };
    } catch (error) {
      return {
        success: false,
        command,
        executionTime: performance.now() - startTime,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Execute TERMINATE command
   */
  private async executeTerminate(command: KillSwitchCommand): Promise<void> {
    if (!this.identity) return;

    const reason = command.reason ?? "Kill switch triggered";

    if (this.config.onTerminate) {
      await this.config.onTerminate(this.identity, command, reason);
    }

    // Stop the receiver
    this.stop();

    // In a real implementation, this would trigger process exit
    // process.exit(0);
  }

  /**
   * Execute PAUSE command
   */
  private async executePause(command: KillSwitchCommand): Promise<void> {
    if (!this.identity) return;

    this.paused = true;

    if (this.config.onPause) {
      await this.config.onPause(this.identity, command);
    }
  }

  /**
   * Execute RESUME command
   */
  private async executeResume(command: KillSwitchCommand): Promise<void> {
    if (!this.identity) return;

    this.paused = false;

    if (this.config.onResume) {
      await this.config.onResume(this.identity, command);
    }
  }

  /**
   * Schedule reconnection attempt
   */
  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.config.maxReconnectAttempts) {
      this.emitEvent({
        type: "error",
        timestamp: new Date().toISOString(),
        error: `Max reconnection attempts (${this.config.maxReconnectAttempts}) reached`,
        recoverable: false,
      });
      return;
    }

    this.reconnectAttempts++;
    this.state = "reconnecting";

    this.emitEvent({
      type: "reconnecting",
      timestamp: new Date().toISOString(),
      attempt: this.reconnectAttempts,
      maxAttempts: this.config.maxReconnectAttempts,
    });

    // Exponential backoff
    const delay = this.config.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);

    this.reconnectTimer = setTimeout(async () => {
      if (this.identity) {
        await this.start(this.identity);
      }
    }, delay);
  }

  /**
   * Emit event to all handlers
   */
  private async emitEvent(event: KillSwitchEvent): Promise<void> {
    for (const handler of this.config.eventHandlers) {
      try {
        await handler(event);
      } catch (error) {
        console.error("[KILL_SWITCH] Event handler error:", error);
      }
    }
  }

  /**
   * Convert base64 to ArrayBuffer
   */
  private base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
  }

  /**
   * Register event handler
   */
  onEvent(handler: KillSwitchEventHandler): void {
    this.config.eventHandlers.push(handler);
  }

  /**
   * Get current connection state
   */
  getState(): ConnectionState {
    return this.state;
  }

  /**
   * Check if agent is paused
   */
  isPaused(): boolean {
    return this.paused;
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.state === "connected";
  }
}

// ─────────────────────────────────────────────────────────────────
// SSE LISTENER (AIGOS-703)
// ─────────────────────────────────────────────────────────────────

/**
 * Server-Sent Events listener for real-time commands
 */
class SSEListener implements ChannelListener {
  private config: KillSwitchConfig;
  private eventSource: EventSource | null = null;
  private commandCallback: ((command: KillSwitchCommand) => void) | null = null;

  constructor(config: KillSwitchConfig) {
    this.config = config;
  }

  async connect(): Promise<void> {
    if (!this.config.endpoint) {
      throw new KillSwitchError("SSE_NO_ENDPOINT", "SSE endpoint not configured");
    }

    return new Promise((resolve, reject) => {
      const url = new URL(this.config.endpoint!);
      if (this.config.authToken) {
        url.searchParams.set("token", this.config.authToken);
      }

      this.eventSource = new EventSource(url.toString());

      const timeout = setTimeout(() => {
        this.eventSource?.close();
        reject(new KillSwitchError("SSE_TIMEOUT", "SSE connection timeout"));
      }, this.config.connectionTimeout);

      this.eventSource.onopen = () => {
        clearTimeout(timeout);
        resolve();
      };

      this.eventSource.onerror = (error) => {
        clearTimeout(timeout);
        reject(new KillSwitchError("SSE_ERROR", `SSE connection error: ${error}`));
      };

      this.eventSource.onmessage = (event) => {
        try {
          const command = JSON.parse(event.data) as KillSwitchCommand;
          this.commandCallback?.(command);
        } catch {
          console.error("[KILL_SWITCH] Failed to parse SSE message:", event.data);
        }
      };

      // Listen for specific kill-switch events
      this.eventSource.addEventListener("kill-switch", (event) => {
        try {
          const command = JSON.parse((event as MessageEvent).data) as KillSwitchCommand;
          this.commandCallback?.(command);
        } catch {
          console.error("[KILL_SWITCH] Failed to parse kill-switch event");
        }
      });
    });
  }

  disconnect(): void {
    this.eventSource?.close();
    this.eventSource = null;
  }

  isConnected(): boolean {
    return this.eventSource?.readyState === EventSource.OPEN;
  }

  onCommand(callback: (command: KillSwitchCommand) => void): void {
    this.commandCallback = callback;
  }
}

// ─────────────────────────────────────────────────────────────────
// POLLING LISTENER (AIGOS-704)
// ─────────────────────────────────────────────────────────────────

/**
 * HTTP Polling listener for environments where SSE is not available
 */
class PollingListener implements ChannelListener {
  private config: KillSwitchConfig;
  private pollTimer: ReturnType<typeof setInterval> | null = null;
  private commandCallback: ((command: KillSwitchCommand) => void) | null = null;
  private lastCheckpoint: string | null = null;
  private connected = false;

  constructor(config: KillSwitchConfig) {
    this.config = config;
  }

  async connect(): Promise<void> {
    if (!this.config.endpoint) {
      throw new KillSwitchError("POLLING_NO_ENDPOINT", "Polling endpoint not configured");
    }

    // Initial connection test
    await this.poll();
    this.connected = true;

    // Start polling loop
    this.pollTimer = setInterval(() => {
      this.poll().catch((error) => {
        console.error("[KILL_SWITCH] Poll error:", error);
      });
    }, this.config.pollingInterval);
  }

  disconnect(): void {
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
    this.connected = false;
  }

  isConnected(): boolean {
    return this.connected;
  }

  onCommand(callback: (command: KillSwitchCommand) => void): void {
    this.commandCallback = callback;
  }

  private async poll(): Promise<void> {
    const url = new URL(this.config.endpoint!);
    if (this.lastCheckpoint) {
      url.searchParams.set("since", this.lastCheckpoint);
    }

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (this.config.authToken) {
      headers["Authorization"] = `Bearer ${this.config.authToken}`;
    }

    const response = await fetch(url.toString(), {
      method: "GET",
      headers,
      signal: AbortSignal.timeout(this.config.connectionTimeout),
    });

    if (!response.ok) {
      throw new KillSwitchError(
        "POLLING_ERROR",
        `Polling request failed: ${response.status} ${response.statusText}`
      );
    }

    const data = await response.json() as {
      commands?: KillSwitchCommand[];
      checkpoint?: string;
    };

    if (data.checkpoint) {
      this.lastCheckpoint = data.checkpoint;
    }

    if (data.commands && Array.isArray(data.commands)) {
      for (const command of data.commands) {
        this.commandCallback?.(command);
      }
    }
  }
}

// ─────────────────────────────────────────────────────────────────
// FILE LISTENER (AIGOS-705)
// ─────────────────────────────────────────────────────────────────

/**
 * File-based listener for local development and testing
 */
class FileListener implements ChannelListener {
  private config: KillSwitchConfig;
  private watchTimer: ReturnType<typeof setInterval> | null = null;
  private commandCallback: ((command: KillSwitchCommand) => void) | null = null;
  private lastModified: number | null = null;
  private connected = false;

  constructor(config: KillSwitchConfig) {
    this.config = config;
  }

  async connect(): Promise<void> {
    if (!this.config.filePath) {
      throw new KillSwitchError("FILE_NO_PATH", "File path not configured");
    }

    // Check if we're in Node.js environment
    if (typeof process === "undefined" || !process.versions?.node) {
      throw new KillSwitchError(
        "FILE_NOT_SUPPORTED",
        "File listener only supported in Node.js environment"
      );
    }

    this.connected = true;

    // Poll file for changes (simple approach that works cross-platform)
    this.watchTimer = setInterval(() => {
      this.checkFile().catch((error) => {
        console.error("[KILL_SWITCH] File check error:", error);
      });
    }, this.config.pollingInterval);
  }

  disconnect(): void {
    if (this.watchTimer) {
      clearInterval(this.watchTimer);
      this.watchTimer = null;
    }
    this.connected = false;
  }

  isConnected(): boolean {
    return this.connected;
  }

  onCommand(callback: (command: KillSwitchCommand) => void): void {
    this.commandCallback = callback;
  }

  private async checkFile(): Promise<void> {
    try {
      // Dynamic import for Node.js fs module
      const fs = await import("fs/promises");
      const path = this.config.filePath!;

      try {
        const stat = await fs.stat(path);
        const modified = stat.mtimeMs;

        if (this.lastModified !== null && modified > this.lastModified) {
          // File was modified, read commands
          const content = await fs.readFile(path, "utf-8");
          const commands = JSON.parse(content) as KillSwitchCommand[];

          if (Array.isArray(commands)) {
            for (const command of commands) {
              this.commandCallback?.(command);
            }
          } else if (typeof commands === "object") {
            // Single command
            this.commandCallback?.(commands);
          }
        }

        this.lastModified = modified;
      } catch {
        // File doesn't exist yet, that's ok
        this.lastModified = null;
      }
    } catch {
      // fs module not available
    }
  }
}

// ─────────────────────────────────────────────────────────────────
// ERROR CLASS
// ─────────────────────────────────────────────────────────────────

/**
 * Kill Switch error with error code
 */
export class KillSwitchError extends Error {
  constructor(
    public readonly code: string,
    message: string
  ) {
    super(message);
    this.name = "KillSwitchError";
  }
}

// ─────────────────────────────────────────────────────────────────
// FACTORY FUNCTION
// ─────────────────────────────────────────────────────────────────

/**
 * Create a Kill Switch Receiver instance
 */
export function createKillSwitchReceiver(
  config?: Partial<KillSwitchConfig>
): KillSwitchReceiver {
  return new KillSwitchReceiver(config);
}

// ─────────────────────────────────────────────────────────────────
// STANDALONE FUNCTIONS
// ─────────────────────────────────────────────────────────────────

/**
 * Execute a kill switch command on an identity
 * Synchronous command execution for direct invocation
 */
export function executeKillSwitch(
  identity: RuntimeIdentity,
  command: KillSwitchCommand,
  handlers?: {
    onTerminate?: KillSwitchConfig["onTerminate"];
    onPause?: KillSwitchConfig["onPause"];
    onResume?: KillSwitchConfig["onResume"];
  }
): { success: boolean; message: string } {
  try {
    switch (command.type) {
      case "TERMINATE":
        if (handlers?.onTerminate) {
          handlers.onTerminate(identity, command, command.reason ?? "Kill switch triggered");
        }
        return {
          success: true,
          message: `Agent ${identity.instance_id} terminated`,
        };

      case "PAUSE":
        if (handlers?.onPause) {
          handlers.onPause(identity, command);
        }
        return {
          success: true,
          message: `Agent ${identity.instance_id} paused`,
        };

      case "RESUME":
        if (handlers?.onResume) {
          handlers.onResume(identity, command);
        }
        return {
          success: true,
          message: `Agent ${identity.instance_id} resumed`,
        };

      default:
        return {
          success: false,
          message: `Unknown command type: ${(command as KillSwitchCommand).type}`,
        };
    }
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : String(error),
    };
  }
}
