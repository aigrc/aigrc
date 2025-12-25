import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs";
import { createAssetCard, saveAssetCard } from "@aigrc/core";

export async function createCardCommand(context: vscode.ExtensionContext): Promise<void> {
  const workspaceFolders = vscode.workspace.workspaceFolders;
  if (!workspaceFolders) {
    vscode.window.showErrorMessage("No workspace folder open");
    return;
  }

  const rootPath = workspaceFolders[0].uri.fsPath;
  const cardsDir = path.join(rootPath, ".aigrc", "cards");

  // Prompt for asset name
  const assetName = await vscode.window.showInputBox({
    prompt: "Asset name",
    validateInput: (value) => (value.length > 0 ? null : "Name is required"),
  });

  if (!assetName) return;

  // Prompt for description
  const description = await vscode.window.showInputBox({
    prompt: "Description (optional)",
  });

  // Prompt for asset type
  const assetType = await vscode.window.showQuickPick(
    [
      { label: "API Client", value: "api_client" as const, description: "Uses external AI APIs (OpenAI, Anthropic, etc.)" },
      { label: "Framework", value: "framework" as const, description: "Uses AI/ML frameworks (LangChain, etc.)" },
      { label: "Agent", value: "agent" as const, description: "Autonomous AI agent" },
      { label: "Model", value: "model" as const, description: "Custom trained model" },
      { label: "Pipeline", value: "pipeline" as const, description: "ML pipeline or workflow" },
    ],
    { placeHolder: "Select asset type" }
  );

  if (!assetType) return;

  // Prompt for framework
  const framework = await vscode.window.showInputBox({
    prompt: "Primary framework (e.g., openai, langchain, pytorch)",
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

  // Prompt for risk factors
  const riskFactors = await promptForRiskFactors();

  // Create the asset card
  try {
    const assetCard = createAssetCard({
      name: assetName,
      description: description || undefined,
      owner: {
        name: ownerName,
        email: ownerEmail,
      },
      technical: {
        type: assetType.value,
        framework: framework || undefined,
      },
      riskFactors,
    });

    // Ensure cards directory exists
    fs.mkdirSync(cardsDir, { recursive: true });

    // Save the card
    const cardFileName = sanitizeFileName(assetCard.name) + ".yaml";
    const cardPath = path.join(cardsDir, cardFileName);
    saveAssetCard(assetCard, cardPath);

    // Open the created card
    const action = await vscode.window.showInformationMessage(
      `Asset card created: ${cardFileName}`,
      "Open Card"
    );

    if (action === "Open Card") {
      const doc = await vscode.workspace.openTextDocument(cardPath);
      await vscode.window.showTextDocument(doc);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    vscode.window.showErrorMessage(`Failed to create asset card: ${message}`);
  }
}

async function promptForRiskFactors(): Promise<{
  autonomousDecisions: boolean;
  customerFacing: boolean;
  toolExecution: boolean;
  externalDataAccess: boolean;
  piiProcessing: "yes" | "no" | "unknown";
  highStakesDecisions: boolean;
}> {
  const selectedFactors = await vscode.window.showQuickPick(
    [
      { label: "Autonomous Decisions", value: "autonomousDecisions", picked: false },
      { label: "Customer Facing", value: "customerFacing", picked: false },
      { label: "Tool Execution", value: "toolExecution", picked: false },
      { label: "External Data Access", value: "externalDataAccess", picked: false },
      { label: "High-Stakes Decisions", value: "highStakesDecisions", picked: false },
    ],
    {
      canPickMany: true,
      placeHolder: "Select applicable risk factors",
    }
  );

  const factors = new Set(selectedFactors?.map((f) => f.value) || []);

  // Ask about PII separately
  const piiAnswer = await vscode.window.showQuickPick(
    [
      { label: "Yes", value: "yes" as const },
      { label: "No", value: "no" as const },
      { label: "Unknown", value: "unknown" as const },
    ],
    { placeHolder: "Does this asset process PII (personal data)?" }
  );

  return {
    autonomousDecisions: factors.has("autonomousDecisions"),
    customerFacing: factors.has("customerFacing"),
    toolExecution: factors.has("toolExecution"),
    externalDataAccess: factors.has("externalDataAccess"),
    piiProcessing: piiAnswer?.value || "unknown",
    highStakesDecisions: factors.has("highStakesDecisions"),
  };
}

function sanitizeFileName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}
