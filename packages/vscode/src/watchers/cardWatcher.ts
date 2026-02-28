/**
 * Card File Watcher — Background auto-push on card changes
 *
 * Watches .aigrc/cards/*.{yaml,yml} for create/change events.
 * On change: builds aigrc.asset.updated event, pushes via background buffer.
 * On create: builds aigrc.asset.created event.
 *
 * Respects aigrc.push.auto setting (false = disabled).
 *
 * Per AIG-217, Sprint 5.
 */

import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs";
import { parse } from "yaml";
import type { EventPushService } from "../services/eventPush";

export class CardWatcher implements vscode.Disposable {
  private readonly watcher: vscode.FileSystemWatcher;
  private readonly knownFiles = new Set<string>();
  private readonly disposables: vscode.Disposable[] = [];

  constructor(private readonly pushService: EventPushService) {
    // Watch for YAML card files
    this.watcher = vscode.workspace.createFileSystemWatcher(
      "**/.aigrc/cards/*.{yaml,yml}",
    );

    this.disposables.push(
      this.watcher.onDidCreate((uri) => this.handleCreate(uri)),
      this.watcher.onDidChange((uri) => this.handleChange(uri)),
      this.watcher,
    );

    // Seed known files from existing cards
    this.seedKnownFiles();
  }

  private async seedKnownFiles(): Promise<void> {
    const pattern = "**/.aigrc/cards/*.{yaml,yml}";
    const files = await vscode.workspace.findFiles(pattern);
    for (const file of files) {
      this.knownFiles.add(file.fsPath);
    }
  }

  private handleCreate(uri: vscode.Uri): void {
    if (!this.isAutoPushEnabled()) return;
    if (!this.pushService.isEnabled()) return;

    this.knownFiles.add(uri.fsPath);
    const event = this.buildCardEvent(uri.fsPath, "created");
    if (event) {
      this.pushService.pushBackground(event);
    }
  }

  private handleChange(uri: vscode.Uri): void {
    if (!this.isAutoPushEnabled()) return;
    if (!this.pushService.isEnabled()) return;

    const type = this.knownFiles.has(uri.fsPath) ? "updated" : "created";
    this.knownFiles.add(uri.fsPath);

    const event = this.buildCardEvent(uri.fsPath, type);
    if (event) {
      this.pushService.pushBackground(event);
    }
  }

  /**
   * Build a governance event from a card file.
   * Exported as pure function for testing.
   */
  private buildCardEvent(
    filePath: string,
    changeType: "created" | "updated",
  ): ReturnType<typeof import("@aigrc/events").GovernanceEventBuilder.prototype.assetCreated> | undefined {
    const builder = this.pushService.getBuilder();
    if (!builder) return undefined;

    try {
      const content = fs.readFileSync(filePath, "utf-8");
      const card = parse(content) as Record<string, unknown>;
      const assetId =
        (card.assetId as string) ||
        (card.name as string) ||
        path.basename(filePath, path.extname(filePath));
      const now = new Date().toISOString();

      const goldenThread = card.goldenThread
        ? (card.goldenThread as Parameters<typeof builder.assetCreated>[0]["goldenThread"])
        : {
            type: "orphan" as const,
            reason: "discovery" as const,
            declaredBy: "vscode-auto-push",
            declaredAt: now,
            remediationDeadline: new Date(
              Date.now() + 30 * 24 * 60 * 60 * 1000,
            ).toISOString(),
            remediationNote:
              "Auto-pushed via VS Code card watcher. Assign a golden thread reference.",
          };

      const params = {
        assetId,
        goldenThread,
        data: {
          cardId: assetId,
          cardVersion: (card.version as string) || "1.0.0",
        },
      };

      return changeType === "created"
        ? builder.assetCreated(params)
        : builder.assetUpdated(params);
    } catch {
      return undefined;
    }
  }

  private isAutoPushEnabled(): boolean {
    const config = vscode.workspace.getConfiguration("aigrc");
    return config.get<boolean>("push.auto", true);
  }

  dispose(): void {
    for (const d of this.disposables) {
      d.dispose();
    }
  }
}
