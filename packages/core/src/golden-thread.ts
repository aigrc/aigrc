import type { AssetCard, Intent } from "./schemas";

export interface TicketInfo {
  system: "jira" | "ado" | "github" | "gitlab";
  id: string;
  url: string;
  title: string;
  status: string;
  assignee?: string;
  reporter?: string;
  businessJustification?: string;
  riskTolerance?: "low" | "medium" | "high";
}

export interface LinkResult {
  success: boolean;
  intent: Intent;
  warnings?: string[];
}

export function linkAssetToTicket(asset: AssetCard, ticket: TicketInfo): LinkResult {
  const warnings: string[] = [];

  const intent: Intent = {
    linked: true,
    ticketSystem: ticket.system,
    ticketId: ticket.id,
    ticketUrl: ticket.url,
    businessJustification: ticket.businessJustification,
    riskTolerance: ticket.riskTolerance,
    importedAt: new Date().toISOString(),
  };

  // Check for risk mismatch
  if (ticket.riskTolerance && asset.classification.riskLevel) {
    const toleranceMap: Record<string, number> = { low: 0, medium: 1, high: 2 };
    const levelMap: Record<string, number> = { minimal: 0, limited: 1, high: 2, unacceptable: 3 };

    if (levelMap[asset.classification.riskLevel] > toleranceMap[ticket.riskTolerance]) {
      warnings.push(
        `Asset risk (${asset.classification.riskLevel}) exceeds ticket tolerance (${ticket.riskTolerance})`
      );
    }
  }

  return {
    success: true,
    intent,
    warnings: warnings.length > 0 ? warnings : undefined,
  };
}

export function validateGoldenThread(asset: AssetCard): {
  valid: boolean;
  healthScore: number;
  issues: string[];
} {
  const issues: string[] = [];
  let score = 100;

  if (!asset.intent.linked) {
    issues.push("Asset is not linked to any ticket");
    score -= 50;
    return { valid: false, healthScore: score, issues };
  }

  if (!asset.intent.businessJustification) {
    issues.push("Missing business justification");
    score -= 20;
  }

  if (asset.classification.riskLevel === "high" && asset.governance.approvals.length === 0) {
    issues.push("High-risk asset missing approvals");
    score -= 30;
  }

  return {
    valid: issues.length === 0,
    healthScore: Math.max(0, score),
    issues,
  };
}