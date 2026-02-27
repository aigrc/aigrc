/**
 * Status Bar Manager — AIGOS sync status indicator
 *
 * Displays push status in VS Code status bar:
 *   $(check) AIGRC: Synced (N)
 *   $(sync~spin) Pushing...
 *   $(warning) N warnings
 *   $(error) Failed
 *   $(gear) Not Connected
 *
 * Per AIG-217, Sprint 5.
 */

import * as vscode from "vscode";
import type { EventPushService, PushStatusEvent } from "../services/eventPush";

export class StatusBarManager implements vscode.Disposable {
  private readonly statusBarItem: vscode.StatusBarItem;
  private readonly disposables: vscode.Disposable[] = [];

  constructor(
    private readonly pushService: EventPushService,
    private readonly outputChannel: vscode.OutputChannel,
  ) {
    this.statusBarItem = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Left,
      50,
    );
    this.statusBarItem.command = "aigrc.showComplianceOutput";
    this.statusBarItem.show();

    // Listen for status changes
    this.disposables.push(
      pushService.onStatusChange((event) => this.handleStatusChange(event)),
    );

    // Set initial state
    this.updateDisplay(pushService.status, undefined);
  }

  private handleStatusChange(event: PushStatusEvent): void {
    this.updateDisplay(event.status, event.message);

    // Log to output channel
    if (event.message) {
      this.outputChannel.appendLine(
        `[${new Date().toLocaleTimeString()}] ${event.message}`,
      );
    }
  }

  private updateDisplay(status: string, message?: string): void {
    switch (status) {
      case "synced":
        this.statusBarItem.text = `$(check) AIGRC: Synced (${this.pushService.syncedCount})`;
        this.statusBarItem.tooltip = message || "Events synced to AIGOS";
        this.statusBarItem.backgroundColor = undefined;
        break;

      case "pushing":
        this.statusBarItem.text = "$(sync~spin) AIGRC: Pushing...";
        this.statusBarItem.tooltip = message || "Pushing events to AIGOS";
        this.statusBarItem.backgroundColor = undefined;
        break;

      case "warning":
        this.statusBarItem.text = `$(warning) AIGRC: Warnings`;
        this.statusBarItem.tooltip = message || "Push completed with warnings";
        this.statusBarItem.backgroundColor = new vscode.ThemeColor(
          "statusBarItem.warningBackground",
        );
        break;

      case "error":
        this.statusBarItem.text = "$(error) AIGRC: Failed";
        this.statusBarItem.tooltip = message || "Push failed";
        this.statusBarItem.backgroundColor = new vscode.ThemeColor(
          "statusBarItem.errorBackground",
        );
        break;

      case "idle":
        this.statusBarItem.text = "$(check) AIGRC: Connected";
        this.statusBarItem.tooltip = message || "Connected to AIGOS";
        this.statusBarItem.backgroundColor = undefined;
        break;

      case "disconnected":
      default:
        this.statusBarItem.text = "$(gear) AIGRC: Not Connected";
        this.statusBarItem.tooltip = "Configure aigrc.push settings to connect to AIGOS";
        this.statusBarItem.backgroundColor = undefined;
        break;
    }
  }

  dispose(): void {
    this.statusBarItem.dispose();
    for (const d of this.disposables) {
      d.dispose();
    }
  }
}
