import * as vscode from "vscode";
import { scan, initializePatterns, suggestAssetCard } from "@aigrc/core";
import type { DiagnosticProvider } from "../providers/diagnostics";

export async function scanCommand(
  context: vscode.ExtensionContext,
  diagnosticProvider: DiagnosticProvider
): Promise<void> {
  const workspaceFolders = vscode.workspace.workspaceFolders;
  if (!workspaceFolders) {
    vscode.window.showErrorMessage("No workspace folder open");
    return;
  }

  const rootPath = workspaceFolders[0].uri.fsPath;

  await vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: "AIGRC: Scanning workspace",
      cancellable: false,
    },
    async (progress) => {
      try {
        initializePatterns();

        progress.report({ message: "Scanning files..." });

        const result = await scan({
          directory: rootPath,
          ignorePatterns: ["node_modules", ".git", "dist", "build", "__pycache__", ".venv"],
        });

        progress.report({ message: "Processing results..." });

        // Store scan results in workspace state
        context.workspaceState.update("aigrc.lastScanResult", result);
        context.workspaceState.update("aigrc.lastScanTime", Date.now());

        // Update diagnostics
        diagnosticProvider.updateFromScanResult(result);

        // Show summary
        if (result.detections.length === 0) {
          vscode.window.showInformationMessage(
            `AIGRC: No AI/ML frameworks detected in ${result.scannedFiles} files`
          );
        } else {
          const suggestion = suggestAssetCard(result);
          const message = `AIGRC: Found ${result.detections.length} AI detections in ${result.scannedFiles} files`;

          const action = await vscode.window.showInformationMessage(
            message,
            "View Details",
            "Create Asset Card"
          );

          if (action === "View Details") {
            showScanResults(result);
          } else if (action === "Create Asset Card") {
            vscode.commands.executeCommand("aigrc.createCard");
          }
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        vscode.window.showErrorMessage(`AIGRC: Scan failed - ${message}`);
      }
    }
  );
}

function showScanResults(result: Awaited<ReturnType<typeof scan>>): void {
  const panel = vscode.window.createWebviewPanel(
    "aigrcScanResults",
    "AIGRC Scan Results",
    vscode.ViewColumn.One,
    {}
  );

  const detectionsHtml = result.detections
    .slice(0, 50)
    .map(
      (d) => `
      <tr>
        <td>${escapeHtml(d.framework)}</td>
        <td>${escapeHtml(d.category)}</td>
        <td>${d.confidence}</td>
        <td><a href="#" onclick="openFile('${escapeHtml(d.filePath)}', ${d.line})">${escapeHtml(d.filePath)}:${d.line}</a></td>
      </tr>
    `
    )
    .join("");

  const riskFactorsHtml = Object.entries(result.inferredRiskFactors)
    .map(([key, value]) => {
      const displayValue =
        value === true || value === "yes"
          ? '<span class="risk-yes">Yes</span>'
          : value === false || value === "no"
            ? '<span class="risk-no">No</span>'
            : '<span class="risk-unknown">Unknown</span>';
      return `<tr><td>${formatKey(key)}</td><td>${displayValue}</td></tr>`;
    })
    .join("");

  panel.webview.html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: var(--vscode-font-family); padding: 20px; }
        h1 { color: var(--vscode-foreground); }
        h2 { color: var(--vscode-foreground); margin-top: 30px; }
        table { width: 100%; border-collapse: collapse; margin-top: 10px; }
        th, td { padding: 8px; text-align: left; border-bottom: 1px solid var(--vscode-panel-border); }
        th { background: var(--vscode-editor-background); }
        .summary { display: flex; gap: 30px; margin: 20px 0; }
        .stat { text-align: center; }
        .stat-value { font-size: 24px; font-weight: bold; }
        .stat-label { color: var(--vscode-descriptionForeground); }
        .risk-yes { color: #f44336; }
        .risk-no { color: #4caf50; }
        .risk-unknown { color: #ff9800; }
        a { color: var(--vscode-textLink-foreground); }
      </style>
    </head>
    <body>
      <h1>AIGRC Scan Results</h1>

      <div class="summary">
        <div class="stat">
          <div class="stat-value">${result.scannedFiles}</div>
          <div class="stat-label">Files Scanned</div>
        </div>
        <div class="stat">
          <div class="stat-value">${result.detections.length}</div>
          <div class="stat-label">Detections</div>
        </div>
        <div class="stat">
          <div class="stat-value">${result.summary.byConfidence.high}</div>
          <div class="stat-label">High Confidence</div>
        </div>
      </div>

      <h2>Inferred Risk Factors</h2>
      <table>
        <thead><tr><th>Factor</th><th>Value</th></tr></thead>
        <tbody>${riskFactorsHtml}</tbody>
      </table>

      <h2>Detections (showing first 50)</h2>
      <table>
        <thead>
          <tr>
            <th>Framework</th>
            <th>Category</th>
            <th>Confidence</th>
            <th>Location</th>
          </tr>
        </thead>
        <tbody>${detectionsHtml}</tbody>
      </table>
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

function formatKey(key: string): string {
  return key.replace(/([A-Z])/g, " $1").replace(/^./, (str) => str.toUpperCase());
}
