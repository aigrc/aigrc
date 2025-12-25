import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs";
import { loadAssetCard, validateAssetCard, classifyRisk, type ScanResult, type DetectionResult } from "@aigrc/core";

export class DiagnosticProvider {
  public readonly diagnosticCollection: vscode.DiagnosticCollection;
  private fileWatcher: vscode.FileSystemWatcher | undefined;
  private scanDetections: Map<string, DetectionResult[]> = new Map();

  constructor() {
    this.diagnosticCollection = vscode.languages.createDiagnosticCollection("aigrc");
  }

  public activate(context: vscode.ExtensionContext): void {
    // Watch for YAML file changes in .aigrc/cards
    this.fileWatcher = vscode.workspace.createFileSystemWatcher("**/.aigrc/cards/*.{yaml,yml}");

    this.fileWatcher.onDidChange((uri) => this.validateCard(uri));
    this.fileWatcher.onDidCreate((uri) => this.validateCard(uri));
    this.fileWatcher.onDidDelete((uri) => this.diagnosticCollection.delete(uri));

    context.subscriptions.push(this.fileWatcher);
    context.subscriptions.push(this.diagnosticCollection);

    // Validate existing cards on activation
    this.validateAllCards();

    // Also validate on document save
    context.subscriptions.push(
      vscode.workspace.onDidSaveTextDocument((doc) => {
        if (this.isAssetCardFile(doc.uri)) {
          this.validateCard(doc.uri);
        }
      })
    );
  }

  private isAssetCardFile(uri: vscode.Uri): boolean {
    const filePath = uri.fsPath;
    return (
      (filePath.endsWith(".yaml") || filePath.endsWith(".yml")) &&
      filePath.includes(path.join(".aigrc", "cards"))
    );
  }

  private async validateAllCards(): Promise<void> {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders) return;

    for (const folder of workspaceFolders) {
      const cardsDir = path.join(folder.uri.fsPath, ".aigrc", "cards");

      if (!fs.existsSync(cardsDir)) continue;

      try {
        const files = fs.readdirSync(cardsDir);
        for (const file of files) {
          if (file.endsWith(".yaml") || file.endsWith(".yml")) {
            const uri = vscode.Uri.file(path.join(cardsDir, file));
            await this.validateCard(uri);
          }
        }
      } catch {
        // Ignore read errors
      }
    }
  }

  private async validateCard(uri: vscode.Uri): Promise<void> {
    const diagnostics: vscode.Diagnostic[] = [];

    try {
      const card = loadAssetCard(uri.fsPath);
      const validation = validateAssetCard(card);

      if (!validation.valid && validation.errors) {
        for (const error of validation.errors) {
          const diagnostic = new vscode.Diagnostic(
            new vscode.Range(0, 0, 0, 0),
            error,
            vscode.DiagnosticSeverity.Error
          );
          diagnostic.source = "AIGRC";
          diagnostics.push(diagnostic);
        }
      }

      // Add warnings for high-risk classifications
      const classification = classifyRisk(card.classification.riskFactors);

      if (classification.riskLevel === "unacceptable") {
        const diagnostic = new vscode.Diagnostic(
          new vscode.Range(0, 0, 0, 0),
          `Unacceptable risk level: ${classification.euAiActCategory || "Review required"}`,
          vscode.DiagnosticSeverity.Error
        );
        diagnostic.source = "AIGRC";
        diagnostic.code = "unacceptable-risk";
        diagnostics.push(diagnostic);
      } else if (classification.riskLevel === "high") {
        const diagnostic = new vscode.Diagnostic(
          new vscode.Range(0, 0, 0, 0),
          `High risk level detected. EU AI Act category: ${classification.euAiActCategory || "High-risk AI system"}`,
          vscode.DiagnosticSeverity.Warning
        );
        diagnostic.source = "AIGRC";
        diagnostic.code = "high-risk";
        diagnostics.push(diagnostic);
      }

      // Check for missing recommended fields
      if (!card.description) {
        const diagnostic = new vscode.Diagnostic(
          new vscode.Range(0, 0, 0, 0),
          "Missing description field (recommended)",
          vscode.DiagnosticSeverity.Information
        );
        diagnostic.source = "AIGRC";
        diagnostics.push(diagnostic);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Invalid asset card";
      const diagnostic = new vscode.Diagnostic(
        new vscode.Range(0, 0, 0, 0),
        `Parse error: ${message}`,
        vscode.DiagnosticSeverity.Error
      );
      diagnostic.source = "AIGRC";
      diagnostics.push(diagnostic);
    }

    this.diagnosticCollection.set(uri, diagnostics);
  }

  /**
   * Update diagnostics from scan results - shows warnings for files with AI detections
   */
  public updateFromScanResult(result: ScanResult): void {
    // Clear previous scan diagnostics
    this.scanDetections.clear();

    // Group detections by file
    for (const detection of result.detections) {
      const existing = this.scanDetections.get(detection.filePath) || [];
      existing.push(detection);
      this.scanDetections.set(detection.filePath, existing);
    }

    // Update diagnostics for each file
    for (const [filePath, detections] of this.scanDetections) {
      const uri = vscode.Uri.file(filePath);
      const diagnostics: vscode.Diagnostic[] = [];

      for (const detection of detections) {
        const line = Math.max(0, detection.line - 1);
        const range = new vscode.Range(line, 0, line, 100);

        const diagnostic = new vscode.Diagnostic(
          range,
          `AI Framework detected: ${detection.framework} (${detection.category})`,
          detection.confidence === "high"
            ? vscode.DiagnosticSeverity.Warning
            : vscode.DiagnosticSeverity.Information
        );
        diagnostic.source = "AIGRC";
        diagnostic.code = detection.confidence;
        diagnostics.push(diagnostic);
      }

      this.diagnosticCollection.set(uri, diagnostics);
    }
  }

  /**
   * Update diagnostics for a single file (when file is edited)
   */
  public updateDiagnostics(uri: vscode.Uri): void {
    // If we have scan detections for this file, re-apply them
    const detections = this.scanDetections.get(uri.fsPath);
    if (detections) {
      const diagnostics: vscode.Diagnostic[] = [];

      for (const detection of detections) {
        const line = Math.max(0, detection.line - 1);
        const range = new vscode.Range(line, 0, line, 100);

        const diagnostic = new vscode.Diagnostic(
          range,
          `AI Framework detected: ${detection.framework} (${detection.category})`,
          detection.confidence === "high"
            ? vscode.DiagnosticSeverity.Warning
            : vscode.DiagnosticSeverity.Information
        );
        diagnostic.source = "AIGRC";
        diagnostic.code = detection.confidence;
        diagnostics.push(diagnostic);
      }

      this.diagnosticCollection.set(uri, diagnostics);
    }
  }

  public dispose(): void {
    this.diagnosticCollection.dispose();
    this.fileWatcher?.dispose();
  }
}
