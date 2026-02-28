import * as vscode from "vscode";
import { scanCommand } from "./commands/scan";
import { initCommand } from "./commands/init";
import { statusCommand } from "./commands/status";
import { validateCommand } from "./commands/validate";
import { createCardCommand } from "./commands/createCard";
import { checkPolicyCommand } from "./commands/checkPolicy";
import { AssetTreeProvider } from "./views/assetTree";
import { DiagnosticProvider } from "./providers/diagnostics";
import { PolicyDiagnosticProvider } from "./providers/policyDiagnostics";
import { PolicyCodeActionProvider } from "./providers/codeActions";
import { CodeLensProvider } from "./providers/codeLens";
import { StatusBarManager } from "./providers/statusBar";
import { EventPushService } from "./services/eventPush";
import { CardWatcher } from "./watchers/cardWatcher";
import { pushCommand } from "./commands/push";

// ─────────────────────────────────────────────────────────────────
// EXTENSION ACTIVATION
// ─────────────────────────────────────────────────────────────────

let diagnosticProvider: DiagnosticProvider | undefined;
let policyDiagnosticProvider: PolicyDiagnosticProvider | undefined;
let assetTreeProvider: AssetTreeProvider | undefined;
let eventPushService: EventPushService | undefined;
let statusBarManager: StatusBarManager | undefined;
let cardWatcher: CardWatcher | undefined;

export function activate(context: vscode.ExtensionContext) {
  console.log("AIGRC extension is now active");

  // Initialize providers
  diagnosticProvider = new DiagnosticProvider();
  policyDiagnosticProvider = new PolicyDiagnosticProvider();
  assetTreeProvider = new AssetTreeProvider(context);

  // Register tree view
  const treeView = vscode.window.createTreeView("aigrcAssets", {
    treeDataProvider: assetTreeProvider,
    showCollapseAll: true,
  });
  context.subscriptions.push(treeView);

  // Initialize event push service + status bar + card watcher (AIG-217)
  eventPushService = new EventPushService();
  const complianceOutput = vscode.window.createOutputChannel("AIGRC Compliance");
  statusBarManager = new StatusBarManager(eventPushService, complianceOutput);
  cardWatcher = new CardWatcher(eventPushService);
  context.subscriptions.push(complianceOutput, statusBarManager, cardWatcher);

  // Register commands
  context.subscriptions.push(
    vscode.commands.registerCommand("aigrc.scan", () => scanCommand(context, diagnosticProvider!)),
    vscode.commands.registerCommand("aigrc.init", () => initCommand(context)),
    vscode.commands.registerCommand("aigrc.showStatus", () => statusCommand(context)),
    vscode.commands.registerCommand("aigrc.validateCard", () => validateCommand(context)),
    vscode.commands.registerCommand("aigrc.createCard", () => createCardCommand(context)),
    vscode.commands.registerCommand("aigrc.checkPolicy", () => checkPolicyCommand(context, policyDiagnosticProvider!)),
    vscode.commands.registerCommand("aigrc.pushToAigos", () => pushCommand(context, eventPushService!)),
    vscode.commands.registerCommand("aigrc.showComplianceOutput", () => complianceOutput.show()),
    vscode.commands.registerCommand("aigrc.showApprovedAlternatives", (violation) => {
      if (violation?.alternatives) {
        vscode.window.showQuickPick(violation.alternatives, {
          title: `Approved alternatives for "${violation.violatingValue}"`,
          placeHolder: "Select an approved alternative",
        });
      }
    }),
    vscode.commands.registerCommand("aigrc.requestApproval", async (violation) => {
      const reason = await vscode.window.showInputBox({
        title: `Request approval for "${violation?.violatingValue}"`,
        prompt: "Enter a reason for this approval request",
        placeHolder: "Business justification...",
      });
      if (reason) {
        vscode.window.showInformationMessage(
          `Approval request submitted for "${violation?.violatingValue}". Check with your governance team.`
        );
      }
    })
  );

  // Register code lens provider for YAML asset cards
  const codeLensProvider = new CodeLensProvider();
  context.subscriptions.push(
    vscode.languages.registerCodeLensProvider(
      { scheme: "file", language: "yaml" },
      codeLensProvider
    )
  );

  // Register code action provider for policy violations
  const policyCodeActionProvider = new PolicyCodeActionProvider();
  context.subscriptions.push(
    vscode.languages.registerCodeActionsProvider(
      [
        { scheme: "file", language: "typescript" },
        { scheme: "file", language: "javascript" },
        { scheme: "file", language: "typescriptreact" },
        { scheme: "file", language: "javascriptreact" },
        { scheme: "file", language: "python" },
      ],
      policyCodeActionProvider,
      {
        providedCodeActionKinds: PolicyCodeActionProvider.providedCodeActionKinds,
      }
    )
  );

  // Activate diagnostics providers
  diagnosticProvider.activate(context);
  policyDiagnosticProvider.activate(context);

  // Check if workspace is initialized
  checkInitialization(context);

  // Auto-scan if enabled
  const config = vscode.workspace.getConfiguration("aigrc");
  if (config.get<boolean>("autoScan", true)) {
    vscode.commands.executeCommand("aigrc.scan");
  }

  // Auto-check policy if enabled and governance.lock exists
  if (config.get<boolean>("showPolicyViolations", true)) {
    vscode.commands.executeCommand("aigrc.checkPolicy");
  }

  // Watch for file changes
  const watcher = vscode.workspace.createFileSystemWatcher("**/*.{py,js,ts,jsx,tsx}");
  watcher.onDidChange((uri) => {
    if (diagnosticProvider) {
      diagnosticProvider.updateDiagnostics(uri);
    }
  });
  context.subscriptions.push(watcher);
}

export async function deactivate() {
  if (eventPushService) {
    await eventPushService.dispose();
  }
  if (statusBarManager) {
    statusBarManager.dispose();
  }
  if (cardWatcher) {
    cardWatcher.dispose();
  }
  if (diagnosticProvider) {
    diagnosticProvider.dispose();
  }
  if (policyDiagnosticProvider) {
    policyDiagnosticProvider.dispose();
  }
}

// ─────────────────────────────────────────────────────────────────
// HELPER FUNCTIONS
// ─────────────────────────────────────────────────────────────────

async function checkInitialization(context: vscode.ExtensionContext) {
  const workspaceFolders = vscode.workspace.workspaceFolders;
  if (!workspaceFolders) return;

  const configPath = vscode.Uri.joinPath(workspaceFolders[0].uri, ".aigrc.yaml");

  try {
    await vscode.workspace.fs.stat(configPath);
    vscode.commands.executeCommand("setContext", "aigrc.initialized", true);
    context.workspaceState.update("aigrc.initialized", true);
  } catch {
    vscode.commands.executeCommand("setContext", "aigrc.initialized", false);
    context.workspaceState.update("aigrc.initialized", false);
  }
}
