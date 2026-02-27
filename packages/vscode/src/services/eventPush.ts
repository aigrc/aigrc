/**
 * Event Push Service for VS Code Extension
 *
 * Manages bidirectional event push to AIGOS control plane:
 * - Foreground push: sync channel with full feedback
 * - Background push: buffered, best-effort via EventBuffer
 *
 * Per AIG-217, Sprint 5.
 */

import * as vscode from "vscode";
import {
  GovernanceEventBuilder,
  AigosClient,
  EventBuffer,
  type GovernanceEvent,
  type BuilderConfig,
} from "@aigrc/events";

// ─────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────

export type PushStatus =
  | "idle"
  | "pushing"
  | "synced"
  | "warning"
  | "error"
  | "disconnected";

export interface PushStatusEvent {
  status: PushStatus;
  message?: string;
  acceptedCount?: number;
  warningCount?: number;
}

export interface PushFeedback {
  accepted: number;
  rejected: number;
  warnings: string[];
  errors: string[];
}

// ─────────────────────────────────────────────────────────────────
// EVENT PUSH SERVICE
// ─────────────────────────────────────────────────────────────────

export class EventPushService implements vscode.Disposable {
  private builder: GovernanceEventBuilder | undefined;
  private client: AigosClient | undefined;
  private buffer: EventBuffer | undefined;
  private readonly _onStatusChange = new vscode.EventEmitter<PushStatusEvent>();
  public readonly onStatusChange = this._onStatusChange.event;
  private _currentStatus: PushStatus = "disconnected";
  private _syncedCount = 0;

  constructor() {
    this.reconfigure();
  }

  /**
   * Reconfigure the service based on current VS Code settings.
   */
  reconfigure(): void {
    const config = vscode.workspace.getConfiguration("aigrc");
    const apiUrl = config.get<string>("push.apiUrl");
    const apiKey = config.get<string>("push.apiKey");
    const orgId = config.get<string>("push.orgId") || "org-default";
    const batchInterval = config.get<number>("push.batchInterval") || 5000;

    if (!apiUrl || !apiKey) {
      this.builder = undefined;
      this.client = undefined;
      this.buffer = undefined;
      this.updateStatus("disconnected", "AIGOS API not configured");
      return;
    }

    const builderConfig: BuilderConfig = {
      source: {
        tool: "vscode",
        version: "0.2.0",
        orgId,
        instanceId: `vscode-${vscode.env.machineId?.slice(0, 16) || "unknown"}`,
        identity: {
          type: "api-key",
          subject: vscode.env.machineId || "vscode-user",
        },
        environment: "development",
      },
    };

    this.builder = new GovernanceEventBuilder(builderConfig);
    this.client = new AigosClient({ apiUrl: apiUrl, apiKey });
    this.buffer = new EventBuffer({
      maxSize: 100,
      flushIntervalMs: batchInterval,
      onFlush: async (events) => {
        try {
          await this.client!.pushBatch(events);
          this._syncedCount += events.length;
          this.updateStatus("synced", `${this._syncedCount} events synced`);
        } catch {
          this.updateStatus("error", "Background push failed");
        }
      },
    });

    this.updateStatus("idle", "Connected to AIGOS");
  }

  /**
   * Check if the service is configured and ready for push.
   */
  isEnabled(): boolean {
    return !!this.client && !!this.builder;
  }

  /**
   * Get the builder for constructing governance events.
   */
  getBuilder(): GovernanceEventBuilder | undefined {
    return this.builder;
  }

  /**
   * Current push status.
   */
  get status(): PushStatus {
    return this._currentStatus;
  }

  /**
   * Total synced event count for this session.
   */
  get syncedCount(): number {
    return this._syncedCount;
  }

  /**
   * Foreground push: Sync Channel with full feedback.
   * Shows progress in VS Code and returns detailed response.
   */
  async pushForeground(events: GovernanceEvent[]): Promise<PushFeedback> {
    if (!this.client) {
      return { accepted: 0, rejected: events.length, warnings: [], errors: ["Not connected"] };
    }

    this.updateStatus("pushing", `Pushing ${events.length} event(s)...`);

    try {
      const response = await this.client.pushBatch(events);
      const accepted = response.accepted ?? events.length;
      const rejected = response.rejected ?? 0;
      const warnings = response.warnings ?? [];

      this._syncedCount += accepted;

      if (warnings.length > 0) {
        this.updateStatus("warning", `${accepted} pushed, ${warnings.length} warning(s)`);
      } else {
        this.updateStatus("synced", `${this._syncedCount} events synced`);
      }

      return { accepted, rejected, warnings, errors: [] };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.updateStatus("error", `Push failed: ${message}`);
      return { accepted: 0, rejected: events.length, warnings: [], errors: [message] };
    }
  }

  /**
   * Background push: adds event to buffer for best-effort delivery.
   */
  pushBackground(event: GovernanceEvent): void {
    if (!this.buffer) return;
    this.buffer.add(event);
  }

  /**
   * Flush pending events and clean up.
   */
  async dispose(): Promise<void> {
    if (this.buffer) {
      await this.buffer.flush();
    }
    this._onStatusChange.dispose();
  }

  private updateStatus(status: PushStatus, message?: string): void {
    this._currentStatus = status;
    this._onStatusChange.fire({
      status,
      message,
      acceptedCount: this._syncedCount,
    });
  }
}
