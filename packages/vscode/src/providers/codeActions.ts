import * as vscode from "vscode";
import type { DiagnosticWithViolation } from "./policyDiagnostics";

/**
 * Code action provider for policy violations
 * Shows quick fixes like "Replace with approved alternative"
 */
export class PolicyCodeActionProvider implements vscode.CodeActionProvider {
  public static readonly providedCodeActionKinds = [
    vscode.CodeActionKind.QuickFix,
    vscode.CodeActionKind.Refactor,
  ];

  provideCodeActions(
    document: vscode.TextDocument,
    range: vscode.Range | vscode.Selection,
    context: vscode.CodeActionContext,
    _token: vscode.CancellationToken
  ): vscode.ProviderResult<(vscode.CodeAction | vscode.Command)[]> {
    const actions: vscode.CodeAction[] = [];

    for (const diagnostic of context.diagnostics) {
      if (diagnostic.source !== "AIGRC Policy") continue;

      const violation = (diagnostic as DiagnosticWithViolation).violation;
      if (!violation) continue;

      // Add quick fix for each alternative
      if (violation.alternatives && violation.alternatives.length > 0) {
        for (const alternative of violation.alternatives) {
          const action = this.createReplaceAction(document, diagnostic, violation, alternative);
          if (action) {
            actions.push(action);
          }
        }

        // Add action to show all alternatives
        const showAlternativesAction = new vscode.CodeAction(
          `Show all approved ${violation.type === "unapproved_vendor" ? "vendors" : "models"}`,
          vscode.CodeActionKind.QuickFix
        );
        showAlternativesAction.command = {
          command: "aigrc.showApprovedAlternatives",
          title: "Show Approved Alternatives",
          arguments: [violation],
        };
        showAlternativesAction.diagnostics = [diagnostic];
        actions.push(showAlternativesAction);
      }

      // Add action to request approval
      const requestApprovalAction = new vscode.CodeAction(
        `Request approval for "${violation.violatingValue}"`,
        vscode.CodeActionKind.QuickFix
      );
      requestApprovalAction.command = {
        command: "aigrc.requestApproval",
        title: "Request Approval",
        arguments: [violation],
      };
      requestApprovalAction.diagnostics = [diagnostic];
      requestApprovalAction.isPreferred = false;
      actions.push(requestApprovalAction);

      // Add action to suppress this warning
      const suppressAction = new vscode.CodeAction(
        "Suppress this warning (add AIGRC ignore comment)",
        vscode.CodeActionKind.QuickFix
      );
      suppressAction.edit = new vscode.WorkspaceEdit();
      const line = diagnostic.range.start.line;
      const lineText = document.lineAt(line).text;
      const indent = lineText.match(/^\s*/)?.[0] || "";
      const ignoreComment = this.getIgnoreComment(document.languageId, violation.ruleId || violation.type);
      suppressAction.edit.insert(document.uri, new vscode.Position(line, 0), `${indent}${ignoreComment}\n`);
      suppressAction.diagnostics = [diagnostic];
      actions.push(suppressAction);

      // Add action to learn more
      if (violation.helpUri) {
        const learnMoreAction = new vscode.CodeAction("Learn more about this policy", vscode.CodeActionKind.QuickFix);
        learnMoreAction.command = {
          command: "vscode.open",
          title: "Open Documentation",
          arguments: [vscode.Uri.parse(violation.helpUri)],
        };
        learnMoreAction.diagnostics = [diagnostic];
        actions.push(learnMoreAction);
      }
    }

    return actions;
  }

  private createReplaceAction(
    document: vscode.TextDocument,
    diagnostic: vscode.Diagnostic,
    violation: DiagnosticWithViolation["violation"],
    alternative: string
  ): vscode.CodeAction | undefined {
    if (!violation?.violatingValue) return undefined;

    const action = new vscode.CodeAction(
      `Replace with "${alternative}"`,
      vscode.CodeActionKind.QuickFix
    );

    // Try to find the exact text to replace
    const line = document.lineAt(diagnostic.range.start.line);
    const lineText = line.text;
    const violatingValue = violation.violatingValue;

    // Find the violating value in the line
    const index = lineText.indexOf(violatingValue);
    if (index === -1) return undefined;

    const replaceRange = new vscode.Range(
      diagnostic.range.start.line,
      index,
      diagnostic.range.start.line,
      index + violatingValue.length
    );

    action.edit = new vscode.WorkspaceEdit();
    action.edit.replace(document.uri, replaceRange, alternative);
    action.diagnostics = [diagnostic];
    action.isPreferred = violation.alternatives?.[0] === alternative;

    return action;
  }

  private getIgnoreComment(languageId: string, ruleId: string): string {
    const comment = `aigrc-ignore ${ruleId}`;

    switch (languageId) {
      case "python":
        return `# ${comment}`;
      case "typescript":
      case "javascript":
      case "typescriptreact":
      case "javascriptreact":
        return `// ${comment}`;
      case "java":
      case "cpp":
      case "c":
      case "csharp":
      case "go":
      case "rust":
        return `// ${comment}`;
      default:
        return `// ${comment}`;
    }
  }
}
