import type { KillSwitchCommand } from "@aigrc/core";
import { KillSwitchCommandSchema } from "@aigrc/core";
import { BaseKillSwitchListener, type KillSwitchListenerConfig } from "./listener.js";

// ─────────────────────────────────────────────────────────────────
// SSE KILL SWITCH LISTENER (AIG-68)
// Server-Sent Events listener with automatic reconnection
// Primary transport for real-time kill switch commands
// ─────────────────────────────────────────────────────────────────

/**
 * Configuration for SSE listener
 */
export interface SSEListenerConfig extends KillSwitchListenerConfig {
  /** SSE endpoint URL */
  endpoint: string;
  /** Maximum reconnection attempts (0 = infinite) */
  maxReconnectAttempts?: number;
  /** Initial reconnection delay in ms */
  reconnectDelayMs?: number;
  /** Maximum reconnection delay in ms */
  maxReconnectDelayMs?: number;
  /** Request headers */
  headers?: Record<string, string>;
  /** Request timeout in ms */
  timeoutMs?: number;
}

/**
 * SSE Listener for kill switch commands.
 *
 * Features:
 * - Real-time command delivery via Server-Sent Events
 * - Automatic reconnection with exponential backoff
 * - Heartbeat monitoring
 * - Error recovery
 *
 * Performance:
 * - Sub-second command delivery
 * - < 5s reconnection on network issues
 * - Contributes to <60s kill switch SLA
 */
export class SSEListener extends BaseKillSwitchListener {
  private readonly endpoint: string;
  private readonly maxReconnectAttempts: number;
  private readonly reconnectDelayMs: number;
  private readonly maxReconnectDelayMs: number;
  private readonly headers: Record<string, string>;
  private readonly timeoutMs: number;

  private eventSource: EventSource | null = null;
  private reconnectCount = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private lastHeartbeat = 0;
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;

  constructor(config: SSEListenerConfig) {
    super(config);
    this.endpoint = config.endpoint;
    this.maxReconnectAttempts = config.maxReconnectAttempts ?? 0; // 0 = infinite
    this.reconnectDelayMs = config.reconnectDelayMs ?? 1000;
    this.maxReconnectDelayMs = config.maxReconnectDelayMs ?? 30000;
    this.headers = config.headers ?? {};
    this.timeoutMs = config.timeoutMs ?? 60000;
  }

  getType(): string {
    return "SSE";
  }

  async start(): Promise<void> {
    if (this.active) {
      return;
    }

    this.active = true;
    this.reconnectCount = 0;
    await this.connect();
  }

  async stop(): Promise<void> {
    if (!this.active) {
      return;
    }

    this.active = false;
    this.disconnect();
    this.clearReconnectTimer();
    this.stopHeartbeatMonitor();
  }

  /**
   * Establish SSE connection
   */
  private async connect(): Promise<void> {
    if (!this.active) {
      return;
    }

    try {
      // For Node.js environments, we need to use a polyfill or fetch with streaming
      // In browsers, we can use native EventSource
      if (typeof EventSource !== "undefined") {
        this.connectBrowser();
      } else {
        // Node.js implementation using fetch with streaming
        await this.connectNode();
      }

      this.reconnectCount = 0;
      this.notifyConnectionChange(true);
      this.startHeartbeatMonitor();
    } catch (error) {
      this.handleError(error instanceof Error ? error : new Error(String(error)));
      this.scheduleReconnect();
    }
  }

  /**
   * Browser EventSource implementation
   */
  private connectBrowser(): void {
    this.eventSource = new EventSource(this.endpoint);

    this.eventSource.onopen = () => {
      console.log("[KillSwitch:SSE] Connection established");
      this.lastHeartbeat = Date.now();
    };

    this.eventSource.onmessage = (event) => {
      this.lastHeartbeat = Date.now();
      this.handleSSEMessage(event.data);
    };

    this.eventSource.onerror = (error) => {
      console.error("[KillSwitch:SSE] Connection error:", error);
      this.disconnect();
      this.notifyConnectionChange(false);
      this.scheduleReconnect();
    };

    // Listen for specific event types
    this.eventSource.addEventListener("kill-switch", (event) => {
      this.lastHeartbeat = Date.now();
      this.handleSSEMessage((event as MessageEvent).data);
    });

    this.eventSource.addEventListener("heartbeat", () => {
      this.lastHeartbeat = Date.now();
    });
  }

  /**
   * Node.js fetch-based streaming implementation
   */
  private async connectNode(): Promise<void> {
    const controller = new AbortController();
    const signal = controller.signal;

    try {
      const response = await fetch(this.endpoint, {
        headers: {
          Accept: "text/event-stream",
          ...this.headers,
        },
        signal,
      });

      if (!response.ok) {
        throw new Error(`SSE connection failed: ${response.status} ${response.statusText}`);
      }

      if (!response.body) {
        throw new Error("Response body is null");
      }

      console.log("[KillSwitch:SSE] Connection established");
      this.lastHeartbeat = Date.now();

      // Process SSE stream
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (this.active) {
        const { done, value } = await reader.read();

        if (done) {
          console.log("[KillSwitch:SSE] Stream ended");
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            this.lastHeartbeat = Date.now();
            const data = line.substring(6);
            if (data.trim()) {
              this.handleSSEMessage(data);
            }
          } else if (line.startsWith("event: heartbeat")) {
            this.lastHeartbeat = Date.now();
          }
        }
      }
    } catch (error) {
      if ((error as Error).name !== "AbortError") {
        throw error;
      }
    } finally {
      controller.abort();
    }
  }

  /**
   * Handle incoming SSE message
   */
  private handleSSEMessage(data: string): void {
    try {
      const message = JSON.parse(data);

      // Validate command schema
      const command = KillSwitchCommandSchema.parse(message);

      // Dispatch to handler
      this.handleCommand(command);
    } catch (error) {
      this.handleError(
        error instanceof Error
          ? error
          : new Error(`Failed to parse SSE message: ${String(error)}`)
      );
    }
  }

  /**
   * Disconnect SSE connection
   */
  private disconnect(): void {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
  }

  /**
   * Schedule reconnection with exponential backoff
   */
  private scheduleReconnect(): void {
    if (!this.active) {
      return;
    }

    if (this.maxReconnectAttempts > 0 && this.reconnectCount >= this.maxReconnectAttempts) {
      console.error(
        `[KillSwitch:SSE] Max reconnection attempts (${this.maxReconnectAttempts}) reached`
      );
      this.active = false;
      this.notifyConnectionChange(false);
      return;
    }

    // Exponential backoff with jitter
    const baseDelay = Math.min(
      this.reconnectDelayMs * Math.pow(2, this.reconnectCount),
      this.maxReconnectDelayMs
    );
    const jitter = Math.random() * 1000;
    const delay = baseDelay + jitter;

    console.log(
      `[KillSwitch:SSE] Reconnecting in ${Math.round(delay)}ms (attempt ${this.reconnectCount + 1})`
    );

    this.reconnectTimer = setTimeout(() => {
      this.reconnectCount++;
      this.connect();
    }, delay);
  }

  /**
   * Clear reconnection timer
   */
  private clearReconnectTimer(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  /**
   * Start monitoring heartbeat
   */
  private startHeartbeatMonitor(): void {
    this.lastHeartbeat = Date.now();

    this.heartbeatTimer = setInterval(() => {
      const elapsed = Date.now() - this.lastHeartbeat;

      // If no heartbeat for 2x timeout, reconnect
      if (elapsed > this.timeoutMs * 2) {
        console.warn("[KillSwitch:SSE] Heartbeat timeout, reconnecting");
        this.disconnect();
        this.notifyConnectionChange(false);
        this.scheduleReconnect();
      }
    }, this.timeoutMs);
  }

  /**
   * Stop heartbeat monitoring
   */
  private stopHeartbeatMonitor(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }
}
