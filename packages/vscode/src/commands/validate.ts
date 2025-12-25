import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs";
import { loadAssetCard, validateAssetCard, classifyRisk } from "@aigrc/core";

export async function validateCommand(context: vscode.ExtensionContext): Promise<void> {
  const workspaceFolders = vscode.workspace.workspaceFolders;
  if (!workspaceFolders) {
    vscode.window.showErrorMessage("No workspace folder open");
    return;
  }

  const rootPath = workspaceFolders[0].uri.fsPath;
  const cardsDir = path.join(rootPath, ".aigrc", "cards");

  if (!fs.existsSync(cardsDir)) {
    vscode.window.showWarningMessage("No asset cards directory found. Run AIGRC: Initialize first.");
    return;
  }

  const files = fs.readdirSync(cardsDir);
  const yamlFiles = files.filter((f) => f.endsWith(".yaml") || f.endsWith(".yml"));

  if (yamlFiles.length === 0) {
    vscode.window.showWarningMessage("No asset cards found to validate.");
    return;
  }

  const results: Array<{
    file: string;
    valid: boolean;
    errors: string[];
    riskLevel?: string;
  }> = [];

  for (const file of yamlFiles) {
    const cardPath = path.join(cardsDir, file);
    try {
      const card = loadAssetCard(cardPath);
      const validation = validateAssetCard(card);
      const classification = classifyRisk(card.classification.riskFactors);

      results.push({
        file,
        valid: validation.valid,
        errors: validation.errors || [],
        riskLevel: classification.riskLevel,
      });
    } catch (error) {
      results.push({
        file,
        valid: false,
        errors: [error instanceof Error ? error.message : "Unknown error"],
      });
    }
  }

  const validCount = results.filter((r) => r.valid).length;
  const invalidCount = results.filter((r) => !r.valid).length;

  if (invalidCount === 0) {
    vscode.window.showInformationMessage(`AIGRC: All ${validCount} asset cards are valid`);
  } else {
    const panel = vscode.window.createWebviewPanel(
      "aigrcValidation",
      "AIGRC Validation Results",
      vscode.ViewColumn.One,
      {}
    );

    const resultsHtml = results
      .map((r) => {
        const statusIcon = r.valid ? "✓" : "✗";
        const statusClass = r.valid ? "valid" : "invalid";
        const errorsHtml = r.errors.map((e) => `<div class="error">${escapeHtml(e)}</div>`).join("");

        return `
        <div class="result ${statusClass}">
          <div class="result-header">
            <span class="status-icon">${statusIcon}</span>
            <span class="file-name">${escapeHtml(r.file)}</span>
            ${r.riskLevel ? `<span class="risk-badge ${r.riskLevel}">${r.riskLevel.toUpperCase()}</span>` : ""}
          </div>
          ${errorsHtml}
        </div>
      `;
      })
      .join("");

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
            margin-bottom: 20px;
            padding: 15px;
            background: var(--vscode-input-background);
            border-radius: 8px;
          }
          .result {
            margin-bottom: 10px;
            padding: 15px;
            background: var(--vscode-input-background);
            border-radius: 8px;
            border-left: 4px solid;
          }
          .result.valid { border-left-color: #4caf50; }
          .result.invalid { border-left-color: #f44336; }
          .result-header {
            display: flex;
            align-items: center;
            gap: 10px;
          }
          .status-icon { font-size: 18px; }
          .result.valid .status-icon { color: #4caf50; }
          .result.invalid .status-icon { color: #f44336; }
          .file-name { font-weight: bold; }
          .risk-badge {
            padding: 2px 8px;
            border-radius: 4px;
            font-size: 11px;
            font-weight: bold;
            margin-left: auto;
          }
          .risk-badge.minimal { background: #4caf5022; color: #4caf50; }
          .risk-badge.limited { background: #ff980022; color: #ff9800; }
          .risk-badge.high { background: #f4433622; color: #f44336; }
          .error {
            margin-top: 10px;
            padding: 8px;
            background: #f4433622;
            color: #f44336;
            border-radius: 4px;
            font-size: 13px;
          }
        </style>
      </head>
      <body>
        <h1>AIGRC Validation Results</h1>
        <div class="summary">
          <strong>Summary:</strong> ${validCount} valid, ${invalidCount} invalid
        </div>
        ${resultsHtml}
      </body>
      </html>
    `;
  }
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
