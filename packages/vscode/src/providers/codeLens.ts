import * as vscode from "vscode";
import * as path from "path";
import { loadAssetCard, classifyRisk } from "@aigrc/core";

export class CodeLensProvider implements vscode.CodeLensProvider {
  private _onDidChangeCodeLenses: vscode.EventEmitter<void> = new vscode.EventEmitter<void>();
  public readonly onDidChangeCodeLenses: vscode.Event<void> = this._onDidChangeCodeLenses.event;

  constructor() {
    // Refresh code lenses when asset cards change
    vscode.workspace.onDidChangeTextDocument((e) => {
      if (this.isAssetCardFile(e.document.uri)) {
        this._onDidChangeCodeLenses.fire();
      }
    });
  }

  private isAssetCardFile(uri: vscode.Uri): boolean {
    const filePath = uri.fsPath;
    return (
      (filePath.endsWith(".yaml") || filePath.endsWith(".yml")) &&
      filePath.includes(path.join(".aigrc", "cards"))
    );
  }

  public provideCodeLenses(
    document: vscode.TextDocument,
    _token: vscode.CancellationToken
  ): vscode.CodeLens[] | Thenable<vscode.CodeLens[]> {
    if (!this.isAssetCardFile(document.uri)) {
      return [];
    }

    const codeLenses: vscode.CodeLens[] = [];
    const topOfFile = new vscode.Range(0, 0, 0, 0);

    try {
      const card = loadAssetCard(document.uri.fsPath);
      const classification = classifyRisk(card.classification.riskFactors);

      // Risk level code lens
      const riskIcon = this.getRiskIcon(classification.riskLevel);
      codeLenses.push(
        new vscode.CodeLens(topOfFile, {
          title: `${riskIcon} Risk Level: ${classification.riskLevel.toUpperCase()}`,
          command: "aigrc.showRiskDetails",
          arguments: [document.uri.fsPath],
        })
      );

      // EU AI Act category if applicable
      if (classification.euAiActCategory) {
        codeLenses.push(
          new vscode.CodeLens(topOfFile, {
            title: `🇪🇺 EU AI Act: ${classification.euAiActCategory}`,
            command: "aigrc.showEuAiActInfo",
            arguments: [classification.euAiActCategory],
          })
        );
      }

      // Validate command
      codeLenses.push(
        new vscode.CodeLens(topOfFile, {
          title: "✓ Validate",
          command: "aigrc.validateCard",
          arguments: [document.uri.fsPath],
        })
      );

      // Active risk factors summary
      const activeRisks = this.getActiveRiskFactors(card.classification.riskFactors);
      if (activeRisks.length > 0) {
        codeLenses.push(
          new vscode.CodeLens(topOfFile, {
            title: `⚠ Risk Factors: ${activeRisks.join(", ")}`,
            command: "",
          })
        );
      }
    } catch {
      // Show error lens for invalid cards
      codeLenses.push(
        new vscode.CodeLens(topOfFile, {
          title: "❌ Invalid asset card - click to validate",
          command: "aigrc.validate",
        })
      );
    }

    return codeLenses;
  }

  private getRiskIcon(level: string): string {
    switch (level) {
      case "minimal":
        return "🟢";
      case "limited":
        return "🟡";
      case "high":
        return "🟠";
      case "unacceptable":
        return "🔴";
      default:
        return "⚪";
    }
  }

  private getActiveRiskFactors(riskFactors: {
    autonomousDecisions?: boolean;
    customerFacing?: boolean;
    toolExecution?: boolean;
    externalDataAccess?: boolean;
    piiProcessing?: "yes" | "no" | "unknown";
    highStakesDecisions?: boolean;
  }): string[] {
    const active: string[] = [];

    if (riskFactors.autonomousDecisions) active.push("Autonomous");
    if (riskFactors.customerFacing) active.push("Customer-Facing");
    if (riskFactors.toolExecution) active.push("Tool Execution");
    if (riskFactors.externalDataAccess) active.push("External Data");
    if (riskFactors.piiProcessing === "yes") active.push("PII");
    if (riskFactors.highStakesDecisions) active.push("High-Stakes");

    return active;
  }
}
