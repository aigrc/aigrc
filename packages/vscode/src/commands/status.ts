import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs";
import { loadAssetCard, classifyRisk } from "@aigrc/core";

export async function statusCommand(context: vscode.ExtensionContext): Promise<void> {
  const workspaceFolders = vscode.workspace.workspaceFolders;
  if (!workspaceFolders) {
    vscode.window.showErrorMessage("No workspace folder open");
    return;
  }

  const rootPath = workspaceFolders[0].uri.fsPath;
  const configPath = path.join(rootPath, ".aigrc.yaml");
  const cardsDir = path.join(rootPath, ".aigrc", "cards");

  // Check initialization
  if (!fs.existsSync(configPath)) {
    const action = await vscode.window.showWarningMessage(
      "AIGRC is not initialized in this workspace",
      "Initialize Now"
    );
    if (action === "Initialize Now") {
      vscode.commands.executeCommand("aigrc.init");
    }
    return;
  }

  // Load asset cards
  const cards: Array<{
    path: string;
    name: string;
    id: string;
    riskLevel: string;
    euAiActCategory: string;
  }> = [];

  if (fs.existsSync(cardsDir)) {
    const files = fs.readdirSync(cardsDir);
    for (const file of files) {
      if (file.endsWith(".yaml") || file.endsWith(".yml")) {
        try {
          const cardPath = path.join(cardsDir, file);
          const card = loadAssetCard(cardPath);
          const classification = classifyRisk(card.classification.riskFactors);
          cards.push({
            path: cardPath,
            name: card.name,
            id: card.id,
            riskLevel: classification.riskLevel,
            euAiActCategory: classification.euAiActCategory,
          });
        } catch {
          // Skip invalid cards
        }
      }
    }
  }

  // Show status panel
  const panel = vscode.window.createWebviewPanel(
    "aigrcStatus",
    "AIGRC Status",
    vscode.ViewColumn.One,
    { enableScripts: true }
  );

  const cardsHtml =
    cards.length > 0
      ? cards
          .map(
            (card) => `
        <div class="card ${card.riskLevel}">
          <div class="card-header">
            <span class="card-name">${escapeHtml(card.name)}</span>
            <span class="risk-badge ${card.riskLevel}">${card.riskLevel.toUpperCase()}</span>
          </div>
          <div class="card-id">${escapeHtml(card.id)}</div>
          <div class="card-eu">EU AI Act: ${escapeHtml(card.euAiActCategory)}</div>
        </div>
      `
          )
          .join("")
      : '<div class="empty">No asset cards registered. Run "AIGRC: Initialize" to get started.</div>';

  // Count by risk level
  const minimal = cards.filter((c) => c.riskLevel === "minimal").length;
  const limited = cards.filter((c) => c.riskLevel === "limited").length;
  const high = cards.filter((c) => c.riskLevel === "high").length;
  const unacceptable = cards.filter((c) => c.riskLevel === "unacceptable").length;

  panel.webview.html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body {
          font-family: var(--vscode-font-family);
          padding: 20px;
          background: var(--vscode-editor-background);
          color: var(--vscode-foreground);
        }
        h1 { margin-bottom: 20px; }
        .summary {
          display: flex;
          gap: 20px;
          margin-bottom: 30px;
        }
        .stat {
          background: var(--vscode-input-background);
          padding: 15px 25px;
          border-radius: 8px;
          text-align: center;
        }
        .stat-value { font-size: 28px; font-weight: bold; }
        .stat-label { color: var(--vscode-descriptionForeground); font-size: 12px; }
        .stat.minimal .stat-value { color: #4caf50; }
        .stat.limited .stat-value { color: #ff9800; }
        .stat.high .stat-value { color: #f44336; }
        .stat.unacceptable .stat-value { color: #9c27b0; }

        .cards { display: flex; flex-direction: column; gap: 10px; }
        .card {
          background: var(--vscode-input-background);
          border-radius: 8px;
          padding: 15px;
          border-left: 4px solid;
        }
        .card.minimal { border-left-color: #4caf50; }
        .card.limited { border-left-color: #ff9800; }
        .card.high { border-left-color: #f44336; }
        .card.unacceptable { border-left-color: #9c27b0; }

        .card-header { display: flex; justify-content: space-between; align-items: center; }
        .card-name { font-weight: bold; font-size: 16px; }
        .risk-badge {
          padding: 2px 8px;
          border-radius: 4px;
          font-size: 11px;
          font-weight: bold;
        }
        .risk-badge.minimal { background: #4caf5022; color: #4caf50; }
        .risk-badge.limited { background: #ff980022; color: #ff9800; }
        .risk-badge.high { background: #f4433622; color: #f44336; }
        .risk-badge.unacceptable { background: #9c27b022; color: #9c27b0; }

        .card-id { color: var(--vscode-descriptionForeground); font-size: 12px; margin-top: 5px; }
        .card-eu { font-size: 13px; margin-top: 5px; }

        .empty {
          color: var(--vscode-descriptionForeground);
          font-style: italic;
          padding: 40px;
          text-align: center;
        }
      </style>
    </head>
    <body>
      <h1>AIGRC Status</h1>

      <div class="summary">
        <div class="stat">
          <div class="stat-value">${cards.length}</div>
          <div class="stat-label">TOTAL ASSETS</div>
        </div>
        <div class="stat minimal">
          <div class="stat-value">${minimal}</div>
          <div class="stat-label">MINIMAL</div>
        </div>
        <div class="stat limited">
          <div class="stat-value">${limited}</div>
          <div class="stat-label">LIMITED</div>
        </div>
        <div class="stat high">
          <div class="stat-value">${high}</div>
          <div class="stat-label">HIGH</div>
        </div>
        <div class="stat unacceptable">
          <div class="stat-value">${unacceptable}</div>
          <div class="stat-label">UNACCEPTABLE</div>
        </div>
      </div>

      <h2>Registered Assets</h2>
      <div class="cards">
        ${cardsHtml}
      </div>
    </body>
    </html>
  `;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
