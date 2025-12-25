import * as vscode from "vscode";
import * as path from "path";
import { scan, initializePatterns, suggestAssetCard, createAssetCard, saveAssetCard } from "@aigrc/core";
import { stringify } from "yaml";
import * as fs from "fs";

export async function initCommand(context: vscode.ExtensionContext): Promise<void> {
  const workspaceFolders = vscode.workspace.workspaceFolders;
  if (!workspaceFolders) {
    vscode.window.showErrorMessage("No workspace folder open");
    return;
  }

  const rootPath = workspaceFolders[0].uri.fsPath;
  const configPath = path.join(rootPath, ".aigrc.yaml");

  // Check if already initialized
  if (fs.existsSync(configPath)) {
    const overwrite = await vscode.window.showWarningMessage(
      "AIGRC is already initialized in this workspace. Reinitialize?",
      "Yes",
      "No"
    );
    if (overwrite !== "Yes") return;
  }

  await vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: "AIGRC: Initializing",
      cancellable: false,
    },
    async (progress) => {
      try {
        progress.report({ message: "Scanning for AI/ML frameworks..." });

        initializePatterns();

        const result = await scan({
          directory: rootPath,
          ignorePatterns: ["node_modules", ".git", "dist", "build", "__pycache__", ".venv"],
        });

        if (result.detections.length === 0) {
          // Create empty config anyway
          const config = {
            version: "1.0",
            cardsDir: ".aigrc/cards",
            scan: {
              exclude: ["node_modules", ".git", "dist", "build", "__pycache__", ".venv"],
            },
          };

          fs.writeFileSync(configPath, stringify(config), "utf-8");

          vscode.window.showInformationMessage(
            "AIGRC initialized. No AI/ML frameworks detected - you can add asset cards manually."
          );

          vscode.commands.executeCommand("setContext", "aigrc.initialized", true);
          return;
        }

        progress.report({ message: "Generating asset card suggestion..." });

        const suggestion = suggestAssetCard(result);

        // Prompt for asset name
        const assetName = await vscode.window.showInputBox({
          prompt: "Asset name",
          value: suggestion.name,
          validateInput: (value) => (value.length > 0 ? null : "Name is required"),
        });

        if (!assetName) return;

        // Prompt for description
        const description = await vscode.window.showInputBox({
          prompt: "Description",
          value: suggestion.description,
        });

        // Prompt for owner name
        const ownerName = await vscode.window.showInputBox({
          prompt: "Owner name",
          value: process.env.USER || process.env.USERNAME || "",
          validateInput: (value) => (value.length > 0 ? null : "Owner name is required"),
        });

        if (!ownerName) return;

        // Prompt for owner email
        const ownerEmail = await vscode.window.showInputBox({
          prompt: "Owner email",
          validateInput: (value) => {
            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
              return "Valid email is required";
            }
            return null;
          },
        });

        if (!ownerEmail) return;

        progress.report({ message: "Creating asset card..." });

        // Create asset card
        const assetCard = createAssetCard({
          name: assetName,
          description: description || undefined,
          owner: {
            name: ownerName,
            email: ownerEmail,
          },
          technical: {
            type: suggestion.technical.type,
            framework: suggestion.technical.framework,
          },
          riskFactors: {
            autonomousDecisions: suggestion.riskFactors.autonomousDecisions ?? false,
            customerFacing: suggestion.riskFactors.customerFacing ?? false,
            toolExecution: suggestion.riskFactors.toolExecution ?? false,
            externalDataAccess: suggestion.riskFactors.externalDataAccess ?? false,
            piiProcessing: suggestion.riskFactors.piiProcessing ?? "unknown",
            highStakesDecisions: suggestion.riskFactors.highStakesDecisions ?? false,
          },
        });

        // Create directories
        const cardsDir = path.join(rootPath, ".aigrc", "cards");
        fs.mkdirSync(cardsDir, { recursive: true });

        // Save asset card
        const cardFileName = sanitizeFileName(assetCard.name) + ".yaml";
        const cardPath = path.join(cardsDir, cardFileName);
        saveAssetCard(assetCard, cardPath);

        // Create config file
        const config = {
          version: "1.0",
          cardsDir: ".aigrc/cards",
          scan: {
            exclude: ["node_modules", ".git", "dist", "build", "__pycache__", ".venv"],
          },
        };

        fs.writeFileSync(configPath, stringify(config), "utf-8");

        // Update context
        vscode.commands.executeCommand("setContext", "aigrc.initialized", true);
        context.workspaceState.update("aigrc.initialized", true);

        // Show success message
        const action = await vscode.window.showInformationMessage(
          `AIGRC initialized successfully! Asset card created: ${cardFileName}`,
          "Open Asset Card"
        );

        if (action === "Open Asset Card") {
          const doc = await vscode.workspace.openTextDocument(cardPath);
          await vscode.window.showTextDocument(doc);
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        vscode.window.showErrorMessage(`AIGRC: Initialization failed - ${message}`);
      }
    }
  );
}

function sanitizeFileName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}
