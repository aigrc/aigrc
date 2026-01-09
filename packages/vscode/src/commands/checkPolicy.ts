import * as vscode from "vscode";
import * as path from "path";
import {
  loadGovernanceLock,
  scanDirectory,
  createReporter,
  type ScanResult,
  type Violation,
} from "@aigrc/i2e-firewall";
import type { PolicyDiagnosticProvider } from "../providers/policyDiagnostics";

export async function checkPolicyCommand(
  context: vscode.ExtensionContext,
  policyDiagnosticProvider: PolicyDiagnosticProvider
): Promise<void> {
  const workspaceFolders = vscode.workspace.workspaceFolders;
  if (!workspaceFolders) {
    vscode.window.showErrorMessage("No workspace folder open");
    return;
  }

  const rootPath = workspaceFolders[0].uri.fsPath;
  const config = vscode.workspace.getConfiguration("aigrc");
  const lockPath = config.get<string>("governanceLockPath", "governance.lock");
  const fullLockPath = path.join(rootPath, lockPath);

  await vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: "AIGRC: Checking policy violations",
      cancellable: false,
    },
    async (progress) => {
      try {
        progress.report({ message: "Loading governance.lock..." });

        // Load governance.lock
        const lockResult = await loadGovernanceLock(fullLockPath);

        if (!lockResult.valid || !lockResult.air) {
          const errorMsg = lockResult.errors[0] || "Invalid governance.lock";
          vscode.window.showWarningMessage(
            `AIGRC: ${errorMsg}. Run 'aigrc policy compile' to generate.`
          );
          return;
        }

        // Show warnings if any
        for (const warning of lockResult.warnings) {
          vscode.window.showWarningMessage(`AIGRC: ${warning}`);
        }

        progress.report({ message: "Scanning for policy violations..." });

        // Scan for violations
        const scanResult = await scanDirectory(rootPath, lockResult.air, {
          includePatterns: ["**/*.ts", "**/*.js", "**/*.py", "**/*.tsx", "**/*.jsx"],
          excludePatterns: ["**/node_modules/**", "**/dist/**", "**/.git/**", "**/build/**"],
        });

        // Store scan results
        context.workspaceState.update("aigrc.lastPolicyScan", scanResult);
        context.workspaceState.update("aigrc.lastPolicyScanTime", Date.now());

        // Update diagnostics
        policyDiagnosticProvider.updateFromScanResult(scanResult);

        // Show summary
        if (scanResult.violations.length === 0) {
          vscode.window.showInformationMessage(
            `AIGRC: No policy violations found in ${scanResult.filesScanned} files`
          );
        } else {
          const errorCount = scanResult.violations.filter((v) => v.severity === "error").length;
          const warningCount = scanResult.violations.filter((v) => v.severity === "warning").length;

          const message = scanResult.passed
            ? `AIGRC: ${warningCount} warnings in ${scanResult.filesScanned} files`
            : `AIGRC: ${errorCount} errors, ${warningCount} warnings in ${scanResult.filesScanned} files`;

          const action = await vscode.window.showWarningMessage(
            message,
            "View Report",
            "Show Problems"
          );

          if (action === "View Report") {
            showPolicyReport(scanResult);
          } else if (action === "Show Problems") {
            vscode.commands.executeCommand("workbench.actions.view.problems");
          }
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        vscode.window.showErrorMessage(`AIGRC: Policy check failed - ${message}`);
      }
    }
  );
}

function showPolicyReport(scanResult: ScanResult): void {
  const panel = vscode.window.createWebviewPanel(
    "aigrcPolicyReport",
    "AIGRC Policy Report",
    vscode.ViewColumn.One,
    {}
  );

  const violationsHtml = scanResult.violations
    .slice(0, 50)
    .map(
      (v) => `
      <tr class="severity-${v.severity}">
        <td><span class="severity ${v.severity}">${v.severity.toUpperCase()}</span></td>
        <td>${escapeHtml(v.type)}</td>
        <td>${escapeHtml(v.message)}</td>
        <td>${escapeHtml(v.file || "")}:${v.line || ""}</td>
        <td>${v.alternatives?.map(escapeHtml).join(", ") || "-"}</td>
      </tr>
    `
    )
    .join("");

  const errorCount = scanResult.violations.filter((v) => v.severity === "error").length;
  const warningCount = scanResult.violations.filter((v) => v.severity === "warning").length;
  const infoCount = scanResult.violations.filter((v) => v.severity === "info").length;

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
        .severity { padding: 2px 8px; border-radius: 4px; font-size: 12px; }
        .severity.error { background: #f44336; color: white; }
        .severity.warning { background: #ff9800; color: white; }
        .severity.info { background: #2196f3; color: white; }
        .passed { color: #4caf50; }
        .failed { color: #f44336; }
        a { color: var(--vscode-textLink-foreground); }
      </style>
    </head>
    <body>
      <h1>AIGRC Policy Report</h1>

      <p>Status: <strong class="${scanResult.passed ? "passed" : "failed"}">${scanResult.passed ? "PASSED" : "FAILED"}</strong></p>

      <div class="summary">
        <div class="stat">
          <div class="stat-value">${scanResult.filesScanned}</div>
          <div class="stat-label">Files Scanned</div>
        </div>
        <div class="stat">
          <div class="stat-value" style="color: #f44336;">${errorCount}</div>
          <div class="stat-label">Errors</div>
        </div>
        <div class="stat">
          <div class="stat-value" style="color: #ff9800;">${warningCount}</div>
          <div class="stat-label">Warnings</div>
        </div>
        <div class="stat">
          <div class="stat-value" style="color: #2196f3;">${infoCount}</div>
          <div class="stat-label">Info</div>
        </div>
      </div>

      <h2>Violations (showing first 50)</h2>
      <table>
        <thead>
          <tr>
            <th>Severity</th>
            <th>Type</th>
            <th>Message</th>
            <th>Location</th>
            <th>Alternatives</th>
          </tr>
        </thead>
        <tbody>${violationsHtml}</tbody>
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
