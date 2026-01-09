import * as vscode from "vscode";
import * as path from "path";
import type { ScanResult, Violation } from "@aigrc/i2e-firewall";

/**
 * Diagnostic provider for policy violations
 * Shows violations in the Problems panel with severity-based icons
 */
export class PolicyDiagnosticProvider {
  public readonly diagnosticCollection: vscode.DiagnosticCollection;
  private violations: Map<string, Violation[]> = new Map();

  constructor() {
    this.diagnosticCollection = vscode.languages.createDiagnosticCollection("aigrc-policy");
  }

  public activate(context: vscode.ExtensionContext): void {
    context.subscriptions.push(this.diagnosticCollection);
  }

  /**
   * Update diagnostics from scan results
   */
  public updateFromScanResult(result: ScanResult): void {
    // Clear previous diagnostics
    this.diagnosticCollection.clear();
    this.violations.clear();

    // Group violations by file
    for (const violation of result.violations) {
      if (!violation.file) continue;

      const existing = this.violations.get(violation.file) || [];
      existing.push(violation);
      this.violations.set(violation.file, existing);
    }

    // Create diagnostics for each file
    for (const [filePath, fileViolations] of this.violations) {
      const uri = vscode.Uri.file(filePath);
      const diagnostics: vscode.Diagnostic[] = [];

      for (const violation of fileViolations) {
        const line = Math.max(0, (violation.line || 1) - 1);
        const column = Math.max(0, (violation.column || 1) - 1);
        const range = new vscode.Range(line, column, line, column + 50);

        const severity = this.mapSeverity(violation.severity);
        const diagnostic = new vscode.Diagnostic(range, violation.message, severity);

        diagnostic.source = "AIGRC Policy";
        diagnostic.code = {
          value: violation.type,
          target: violation.helpUri
            ? vscode.Uri.parse(violation.helpUri)
            : vscode.Uri.parse("https://docs.aigrc.dev/policy-violations"),
        };

        // Add related information if alternatives are available
        if (violation.alternatives && violation.alternatives.length > 0) {
          diagnostic.relatedInformation = [
            new vscode.DiagnosticRelatedInformation(
              new vscode.Location(uri, range),
              `Approved alternatives: ${violation.alternatives.join(", ")}`
            ),
          ];
        }

        // Store violation data for code actions
        (diagnostic as DiagnosticWithViolation).violation = violation;

        diagnostics.push(diagnostic);
      }

      this.diagnosticCollection.set(uri, diagnostics);
    }
  }

  /**
   * Get violations for a specific file
   */
  public getViolationsForFile(filePath: string): Violation[] {
    return this.violations.get(filePath) || [];
  }

  /**
   * Get all violations
   */
  public getAllViolations(): Map<string, Violation[]> {
    return this.violations;
  }

  /**
   * Clear all diagnostics
   */
  public clear(): void {
    this.diagnosticCollection.clear();
    this.violations.clear();
  }

  private mapSeverity(severity: string): vscode.DiagnosticSeverity {
    switch (severity) {
      case "error":
        return vscode.DiagnosticSeverity.Error;
      case "warning":
        return vscode.DiagnosticSeverity.Warning;
      case "info":
        return vscode.DiagnosticSeverity.Information;
      default:
        return vscode.DiagnosticSeverity.Hint;
    }
  }

  public dispose(): void {
    this.diagnosticCollection.dispose();
  }
}

/**
 * Extended diagnostic type that includes the original violation
 */
export interface DiagnosticWithViolation extends vscode.Diagnostic {
  violation?: Violation;
}
