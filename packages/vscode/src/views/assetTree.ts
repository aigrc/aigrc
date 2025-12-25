import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs";
import { loadAssetCard, classifyRisk, type AssetCard, type ClassificationResult } from "@aigrc/core";

export class AssetTreeProvider implements vscode.TreeDataProvider<AssetTreeItem> {
  private _onDidChangeTreeData: vscode.EventEmitter<AssetTreeItem | undefined | null | void> =
    new vscode.EventEmitter<AssetTreeItem | undefined | null | void>();
  readonly onDidChangeTreeData: vscode.Event<AssetTreeItem | undefined | null | void> =
    this._onDidChangeTreeData.event;

  private fileWatcher: vscode.FileSystemWatcher | undefined;

  constructor(context: vscode.ExtensionContext) {
    // Watch for changes to asset cards
    this.fileWatcher = vscode.workspace.createFileSystemWatcher("**/.aigrc/cards/*.{yaml,yml}");

    this.fileWatcher.onDidChange(() => this.refresh());
    this.fileWatcher.onDidCreate(() => this.refresh());
    this.fileWatcher.onDidDelete(() => this.refresh());

    context.subscriptions.push(this.fileWatcher);
  }

  refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(element: AssetTreeItem): vscode.TreeItem {
    return element;
  }

  async getChildren(element?: AssetTreeItem): Promise<AssetTreeItem[]> {
    if (element) {
      // No nested children for now
      return [];
    }

    // Root level - load all asset cards
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders) {
      return [new AssetTreeItem("No workspace open", "info", vscode.TreeItemCollapsibleState.None)];
    }

    const items: AssetTreeItem[] = [];

    for (const folder of workspaceFolders) {
      const cardsDir = path.join(folder.uri.fsPath, ".aigrc", "cards");

      if (!fs.existsSync(cardsDir)) {
        continue;
      }

      try {
        const files = fs.readdirSync(cardsDir);
        const yamlFiles = files.filter((f) => f.endsWith(".yaml") || f.endsWith(".yml"));

        for (const file of yamlFiles) {
          const filePath = path.join(cardsDir, file);

          try {
            const card = loadAssetCard(filePath);
            const classification = classifyRisk(card.classification.riskFactors);

            items.push(
              new AssetTreeItem(
                card.name,
                "asset",
                vscode.TreeItemCollapsibleState.None,
                card,
                classification,
                filePath
              )
            );
          } catch {
            // Show invalid cards with error state
            items.push(
              new AssetTreeItem(
                file,
                "error",
                vscode.TreeItemCollapsibleState.None,
                undefined,
                undefined,
                filePath
              )
            );
          }
        }
      } catch {
        // Ignore directory read errors
      }
    }

    if (items.length === 0) {
      return [
        new AssetTreeItem(
          "No asset cards found",
          "info",
          vscode.TreeItemCollapsibleState.None
        ),
      ];
    }

    // Sort by risk level (highest first)
    const riskOrder = { unacceptable: 0, high: 1, limited: 2, minimal: 3 };
    items.sort((a, b) => {
      const aRisk = a.classification?.riskLevel || "minimal";
      const bRisk = b.classification?.riskLevel || "minimal";
      return (riskOrder[aRisk as keyof typeof riskOrder] || 3) -
        (riskOrder[bRisk as keyof typeof riskOrder] || 3);
    });

    return items;
  }

  dispose(): void {
    this.fileWatcher?.dispose();
  }
}

export class AssetTreeItem extends vscode.TreeItem {
  constructor(
    public readonly label: string,
    public readonly itemType: "asset" | "error" | "info",
    public readonly collapsibleState: vscode.TreeItemCollapsibleState,
    public readonly card?: AssetCard,
    public readonly classification?: ClassificationResult,
    public readonly filePath?: string
  ) {
    super(label, collapsibleState);

    this.contextValue = itemType;

    if (itemType === "asset" && card && classification) {
      this.tooltip = this.buildTooltip(card, classification);
      this.iconPath = this.getRiskIcon(classification.riskLevel);
      this.description = `${classification.riskLevel}${card.technical?.type ? ` • ${card.technical.type}` : ""}`;

      if (filePath) {
        this.command = {
          command: "vscode.open",
          title: "Open Asset Card",
          arguments: [vscode.Uri.file(filePath)],
        };
      }
    } else if (itemType === "error") {
      this.tooltip = "Invalid asset card - click to open and fix";
      this.iconPath = new vscode.ThemeIcon("error", new vscode.ThemeColor("errorForeground"));

      if (filePath) {
        this.command = {
          command: "vscode.open",
          title: "Open Asset Card",
          arguments: [vscode.Uri.file(filePath)],
        };
      }
    } else if (itemType === "info") {
      this.iconPath = new vscode.ThemeIcon("info");
    }
  }

  private buildTooltip(card: AssetCard, classification: ClassificationResult): vscode.MarkdownString {
    const md = new vscode.MarkdownString();

    md.appendMarkdown(`## ${card.name}\n\n`);

    if (card.description) {
      md.appendMarkdown(`${card.description}\n\n`);
    }

    md.appendMarkdown(`**Risk Level:** ${classification.riskLevel}\n\n`);

    if (classification.euAiActCategory) {
      md.appendMarkdown(`**EU AI Act:** ${classification.euAiActCategory}\n\n`);
    }

    if (card.technical?.type) {
      md.appendMarkdown(`**Type:** ${card.technical.type}\n\n`);
    }

    if (card.technical?.framework) {
      md.appendMarkdown(`**Framework:** ${card.technical.framework}\n\n`);
    }

    if (card.ownership?.owner) {
      md.appendMarkdown(`**Owner:** ${card.ownership.owner.name} <${card.ownership.owner.email}>\n\n`);
    }

    // Show active risk factors
    const factors = this.getActiveFactors(card.classification.riskFactors);
    if (factors.length > 0) {
      md.appendMarkdown(`**Risk Factors:** ${factors.join(", ")}\n`);
    }

    return md;
  }

  private getActiveFactors(riskFactors: AssetCard["classification"]["riskFactors"]): string[] {
    const active: string[] = [];

    if (riskFactors.autonomousDecisions) active.push("Autonomous Decisions");
    if (riskFactors.customerFacing) active.push("Customer Facing");
    if (riskFactors.toolExecution) active.push("Tool Execution");
    if (riskFactors.externalDataAccess) active.push("External Data Access");
    if (riskFactors.piiProcessing === "yes") active.push("PII Processing");
    if (riskFactors.highStakesDecisions) active.push("High-Stakes Decisions");

    return active;
  }

  private getRiskIcon(level: string): vscode.ThemeIcon {
    switch (level) {
      case "minimal":
        return new vscode.ThemeIcon("pass", new vscode.ThemeColor("charts.green"));
      case "limited":
        return new vscode.ThemeIcon("warning", new vscode.ThemeColor("charts.yellow"));
      case "high":
        return new vscode.ThemeIcon("flame", new vscode.ThemeColor("charts.orange"));
      case "unacceptable":
        return new vscode.ThemeIcon("error", new vscode.ThemeColor("charts.red"));
      default:
        return new vscode.ThemeIcon("circle-outline");
    }
  }
}
