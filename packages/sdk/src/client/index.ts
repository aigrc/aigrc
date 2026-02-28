/**
 * @aigos/sdk - Control Plane Client
 *
 * Client for communicating with the AIGOS Control Plane.
 * Handles registration, heartbeat, policy sync, telemetry, and kill-switch.
 */

import { EventEmitter } from "eventemitter3";
import type { RuntimeIdentity, PolicyFile } from "@aigrc/core";

import type {
  ControlPlaneClient,
  RegistrationResult,
  ApprovalRequest,
  ApprovalResult,
  TelemetryData,
  KillSwitchCommand,
} from "../types/index.js";

/**
 * Configuration for Control Plane client
 */
export interface ControlPlaneClientConfig {
  /** Control Plane API endpoint */
  endpoint?: string;

  /** API key for authentication */
  apiKey?: string;

  /** Agent runtime identity */
  identity: RuntimeIdentity;

  /** Heartbeat interval in milliseconds (default: 30000) */
  heartbeatIntervalMs?: number;

  /** Request timeout in milliseconds (default: 10000) */
  requestTimeoutMs?: number;

  /** Retry attempts for failed requests (default: 3) */
  retryAttempts?: number;

  /** Enable offline mode caching */
  offlineCache?: boolean;
}

/**
 * Events emitted by the Control Plane client
 */
interface ControlPlaneEvents {
  connected: () => void;
  disconnected: () => void;
  error: (error: Error) => void;
  "kill-switch": (command: KillSwitchCommand) => void;
  "policy-update": (policies: PolicyFile[]) => void;
}

/**
 * Implementation of Control Plane client
 */
export class ControlPlaneClientImpl
  extends EventEmitter<ControlPlaneEvents>
  implements ControlPlaneClient
{
  private config: Required<ControlPlaneClientConfig>;
  private authToken: string | null = null;
  private agentId: string | null = null;
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private sseConnection: EventSource | null = null;
  private cachedPolicies: PolicyFile[] = [];
  private _isConnected = false;

  constructor(config: ControlPlaneClientConfig) {
    super();
    this.config = {
      endpoint: config.endpoint || "",
      apiKey: config.apiKey || "",
      identity: config.identity,
      heartbeatIntervalMs: config.heartbeatIntervalMs || 30000,
      requestTimeoutMs: config.requestTimeoutMs || 10000,
      retryAttempts: config.retryAttempts || 3,
      offlineCache: config.offlineCache ?? true,
    };
  }

  get isConnected(): boolean {
    return this._isConnected;
  }

  /**
   * Register agent with Control Plane
   */
  async register(): Promise<RegistrationResult> {
    if (!this.config.endpoint || !this.config.apiKey) {
      throw new Error("Control Plane endpoint and API key are required");
    }

    const response = await this.request<RegistrationResult>(
      "POST",
      "/api/v1/agents/register",
      {
        identity: this.config.identity,
      }
    );

    this.authToken = response.authToken;
    this.agentId = response.agentId;
    this.cachedPolicies = response.policies;
    this._isConnected = true;

    // Start heartbeat
    this.startHeartbeat();

    this.emit("connected");

    return response;
  }

  /**
   * Send heartbeat to Control Plane
   */
  async heartbeat(): Promise<void> {
    if (!this.agentId || !this.authToken) {
      throw new Error("Agent not registered");
    }

    await this.request("POST", `/api/v1/agents/${this.agentId}/heartbeat`, {
      timestamp: new Date().toISOString(),
      status: "active",
    });
  }

  /**
   * Fetch latest policies from Control Plane
   */
  async fetchPolicies(): Promise<PolicyFile[]> {
    if (!this.agentId || !this.authToken) {
      // Return cached policies if not connected
      return this.cachedPolicies;
    }

    const policies = await this.request<PolicyFile[]>(
      "GET",
      `/api/v1/agents/${this.agentId}/policies`
    );

    this.cachedPolicies = policies;
    return policies;
  }

  /**
   * Report telemetry data to Control Plane
   */
  async reportTelemetry(data: TelemetryData): Promise<void> {
    if (!this.agentId || !this.authToken) {
      // Queue for later if offline caching enabled
      if (this.config.offlineCache) {
        // TODO: Implement offline queue
        return;
      }
      throw new Error("Agent not registered");
    }

    await this.request("POST", "/api/v1/telemetry/ingest", {
      agentId: this.agentId,
      ...data,
    });
  }

  /**
   * Subscribe to kill switch commands via SSE
   */
  subscribeKillSwitch(
    handler: (cmd: KillSwitchCommand) => void
  ): () => void {
    if (!this.config.endpoint || !this.authToken) {
      // Return no-op unsubscribe
      return () => {};
    }

    // Use native EventSource for SSE
    const url = `${this.config.endpoint}/api/v1/kill-switch/subscribe`;

    // Note: In browser, use native EventSource
    // In Node.js, use eventsource package
    if (typeof EventSource !== "undefined") {
      this.sseConnection = new EventSource(url, {
        // Custom headers not supported in browser EventSource
        // Auth handled via query param or cookie
      });

      this.sseConnection.onmessage = (event) => {
        try {
          const command = JSON.parse(event.data) as KillSwitchCommand;
          command.issuedAt = new Date(command.issuedAt);
          handler(command);
          this.emit("kill-switch", command);
        } catch (error) {
          console.error("Failed to parse kill-switch command:", error);
        }
      };

      this.sseConnection.onerror = () => {
        // Reconnect logic handled by EventSource
      };
    }

    // Return unsubscribe function
    return () => {
      if (this.sseConnection) {
        this.sseConnection.close();
        this.sseConnection = null;
      }
    };
  }

  /**
   * Request HITL approval
   */
  async requestHITL(request: ApprovalRequest): Promise<ApprovalResult> {
    if (!this.agentId || !this.authToken) {
      // Apply fallback if not connected
      return {
        approved: request.fallback === "allow",
        timedOut: true,
      };
    }

    // Create HITL request
    const hitlResponse = await this.request<{
      requestId: string;
      status: "pending" | "approved" | "denied";
    }>("POST", "/api/v1/hitl/request", {
      agentId: this.agentId,
      action: request.action,
      resource: request.resource,
      context: request.context,
      priority: request.priority || "medium",
    });

    // Poll for result (or use SSE for push)
    const timeout = request.timeoutMs || 300000; // 5 minutes default
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      const statusResponse = await this.request<{
        status: "pending" | "approved" | "denied";
        approvedBy?: string;
        approvedAt?: string;
        comments?: string;
      }>("GET", `/api/v1/hitl/${hitlResponse.requestId}/status`);

      if (statusResponse.status !== "pending") {
        return {
          approved: statusResponse.status === "approved",
          approvedBy: statusResponse.approvedBy,
          approvedAt: statusResponse.approvedAt
            ? new Date(statusResponse.approvedAt)
            : undefined,
          comments: statusResponse.comments,
        };
      }

      // Wait before polling again
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }

    // Timeout - apply fallback
    return {
      approved: request.fallback === "allow",
      timedOut: true,
    };
  }

  /**
   * Disconnect from Control Plane
   */
  async disconnect(): Promise<void> {
    // Stop heartbeat
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }

    // Close SSE connection
    if (this.sseConnection) {
      this.sseConnection.close();
      this.sseConnection = null;
    }

    this._isConnected = false;
    this.emit("disconnected");
  }

  /**
   * Start heartbeat interval
   */
  private startHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
    }

    this.heartbeatTimer = setInterval(async () => {
      try {
        await this.heartbeat();
      } catch (error) {
        console.error("Heartbeat failed:", error);
        this._isConnected = false;
        this.emit("disconnected");
      }
    }, this.config.heartbeatIntervalMs);
  }

  /**
   * Make authenticated request to Control Plane
   */
  private async request<T>(
    method: string,
    path: string,
    body?: unknown
  ): Promise<T> {
    const url = `${this.config.endpoint}${path}`;
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    if (this.authToken) {
      headers["Authorization"] = `Bearer ${this.authToken}`;
    } else if (this.config.apiKey) {
      headers["X-API-Key"] = this.config.apiKey;
    }

    let lastError: Error | null = null;

    for (let attempt = 0; attempt < this.config.retryAttempts; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(
          () => controller.abort(),
          this.config.requestTimeoutMs
        );

        const response = await fetch(url, {
          method,
          headers,
          body: body ? JSON.stringify(body) : undefined,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        return (await response.json()) as T;
      } catch (error) {
        lastError = error as Error;

        // Don't retry on 4xx errors
        if (
          error instanceof Error &&
          error.message.startsWith("HTTP 4")
        ) {
          throw error;
        }

        // Wait before retry with exponential backoff
        if (attempt < this.config.retryAttempts - 1) {
          await new Promise((resolve) =>
            setTimeout(resolve, Math.pow(2, attempt) * 1000)
          );
        }
      }
    }

    throw lastError || new Error("Request failed");
  }
}

/**
 * Create a Control Plane client instance
 */
export function createControlPlaneClient(
  config: ControlPlaneClientConfig
): ControlPlaneClient {
  return new ControlPlaneClientImpl(config);
}

export type { ControlPlaneClient };
