/**
 * Push Command — Foreground event push to AIGOS
 *
 * Reads asset cards from .aigrc/cards, detects changes,
 * builds governance events, and pushes via Sync Channel.
 *
 * Per AIG-217, Sprint 5.
 */

import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs";
import { parse } from "yaml";
import type { EventPushService } from "../services/eventPush";
import type { GovernanceEvent } from "@aigrc/events";

// ─────────────────────────────────────────────────────────────────

export async function pushCommand(
  context: vscode.ExtensionContext,
  pushService: EventPushService,
): Promise<void> {
  if (!pushService.isEnabled()) {
    const configure = "Configure Settings";
    const choice = await vscode.window.showWarningMessage(
      "AIGOS push is not configured. Set aigrc.push.apiUrl and aigrc.push.apiKey in settings.",
      configure,
    );
    if (choice === configure) {
      vscode.commands.executeCommand("workbench.action.openSettings", "aigrc.push");
    }
    return;
  }

  const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
  if (!workspaceFolder) {
    vscode.window.showWarningMessage("No workspace folder open.");
    return;
  }

  await vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: "AIGRC: Pushing events to AIGOS",
      cancellable: false,
    },
    async (progress) => {
      progress.report({ increment: 10, message: "Discovering card changes..." });

      const builder = pushService.getBuilder()!;
      const cardsDir = getCardsDirectory(workspaceFolder.uri.fsPath);
      const events: GovernanceEvent[] = [];

      if (!fs.existsSync(cardsDir)) {
        vscode.window.showInformationMessage("No asset cards found. Run 'AIGRC: Create Asset Card' first.");
        return;
      }

      // Read cards and build events
      const files = fs.readdirSync(cardsDir).filter(
        (f) => f.endsWith(".yaml") || f.endsWith(".yml"),
      );

      const stateKey = "aigrc.pushState";
      const pushState: Record<string, string> =
        context.workspaceState.get(stateKey) || {};

      progress.report({ increment: 20, message: `Processing ${files.length} card(s)...` });

      for (const file of files) {
        const filePath = path.join(cardsDir, file);
        const content = fs.readFileSync(filePath, "utf-8");
        const hash = computeSimpleHash(content);
        const previousHash = pushState[file];

        let card: Record<string, unknown>;
        try {
          card = parse(content) as Record<string, unknown>;
        } catch {
          continue; // skip unparseable
        }

        const assetId = (card.assetId as string) || (card.name as string) || path.basename(file, path.extname(file));
        const now = new Date().toISOString();

        const goldenThread = card.goldenThread
          ? (card.goldenThread as Parameters<typeof builder.assetCreated>[0]["goldenThread"])
          : {
              type: "orphan" as const,
              reason: "discovery" as const,
              declaredBy: "vscode-user",
              declaredAt: now,
              remediationDeadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
              remediationNote: "Event pushed via VS Code extension without linked authorization. Assign a golden thread reference.",
            };

        if (!previousHash) {
          // New card
          events.push(
            builder.assetCreated({
              assetId,
              goldenThread,
              data: { cardId: assetId, cardVersion: (card.version as string) || "1.0.0" },
            }),
          );
        } else if (previousHash !== hash) {
          // Updated card
          events.push(
            builder.assetUpdated({
              assetId,
              goldenThread,
              data: { cardId: assetId, cardVersion: (card.version as string) || "1.0.0" },
            }),
          );
        }
        // else: unchanged, skip

        pushState[file] = hash;
      }

      if (events.length === 0) {
        vscode.window.showInformationMessage("No card changes to push.");
        return;
      }

      progress.report({ increment: 30, message: `Pushing ${events.length} event(s)...` });

      const feedback = await pushService.pushForeground(events);

      // Save push state on success
      if (feedback.accepted > 0) {
        context.workspaceState.update(stateKey, pushState);
      }

      progress.report({ increment: 40, message: "Done" });

      // Show result
      if (feedback.errors.length > 0) {
        vscode.window.showErrorMessage(
          `Push failed: ${feedback.errors.join(", ")}`,
        );
      } else if (feedback.warnings.length > 0) {
        vscode.window.showWarningMessage(
          `Pushed ${feedback.accepted} event(s) with ${feedback.warnings.length} warning(s).`,
        );
      } else {
        vscode.window.showInformationMessage(
          `Successfully pushed ${feedback.accepted} event(s) to AIGOS.`,
        );
      }
    },
  );
}

// ─────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────

function getCardsDirectory(workspacePath: string): string {
  const config = vscode.workspace.getConfiguration("aigrc");
  const cardsDir = config.get<string>("cardsDirectory") || ".aigrc/cards";
  return path.resolve(workspacePath, cardsDir);
}

function computeSimpleHash(content: string): string {
  // Simple FNV-1a hash for change detection (not cryptographic)
  let hash = 2166136261;
  for (let i = 0; i < content.length; i++) {
    hash ^= content.charCodeAt(i);
    hash = (hash * 16777619) >>> 0;
  }
  return `fnv1a:${hash.toString(16)}`;
}
