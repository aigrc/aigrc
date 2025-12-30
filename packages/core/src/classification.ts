import type { RiskFactors, RiskLevel } from "./schemas";

export interface ClassificationResult {
  riskLevel: RiskLevel;
  reasons: string[];
  euAiActCategory: string;
  requiredArtifacts: string[];
}

export function classifyRisk(factors: RiskFactors): ClassificationResult {
  const reasons: string[] = [];
  let riskLevel: RiskLevel = "minimal";

  // High risk factors
  if (factors.highStakesDecisions) {
    riskLevel = "high";
    reasons.push("Makes high-stakes decisions affecting individuals");
  }

  if (factors.autonomousDecisions && factors.toolExecution) {
    riskLevel = "high";
    reasons.push("Autonomous agent with tool execution capability");
  }

  // Limited risk factors
  if (factors.customerFacing && riskLevel === "minimal") {
    riskLevel = "limited";
    reasons.push("Customer-facing AI requires transparency");
  }

  if (factors.piiProcessing === "yes" && riskLevel === "minimal") {
    riskLevel = "limited";
    reasons.push("Processes personal data");
  }

  // Determine EU AI Act category
  const euAiActCategory = mapToEuAiAct(riskLevel, factors);

  // Determine required artifacts
  const requiredArtifacts = getRequiredArtifacts(riskLevel, factors);

  return {
    riskLevel,
    reasons,
    euAiActCategory,
    requiredArtifacts,
  };
}

function mapToEuAiAct(level: RiskLevel, factors: RiskFactors): string {
  if (level === "unacceptable") return "prohibited";
  if (level === "high") return "high_risk";
  if (level === "limited" || factors.customerFacing) return "limited_risk";
  return "minimal_risk";
}

function getRequiredArtifacts(level: RiskLevel, factors: RiskFactors): string[] {
  const artifacts = ["ai_asset_card"];

  if (level === "limited" || level === "high") {
    if (factors.customerFacing) {
      artifacts.push("transparency_notice");
    }
  }

  if (level === "high") {
    artifacts.push("risk_assessment");
    artifacts.push("human_oversight_plan");

    if (factors.toolExecution) {
      artifacts.push("tool_inventory");
    }
  }

  return artifacts;
}
export function validateRiskFactors(factors: RiskFactors): boolean {
    // Check for required properties in RiskFactors
    const requiredProperties = [
        'highStakesDecisions',
        'autonomousDecisions',
        'toolExecution',
        'customerFacing',
        'piiProcessing'
    ];

    for (const prop of requiredProperties) {
        if (!(prop in factors)) {
            console.error(`Missing required property: ${prop}`);
            return false;
        }
    }

    // Additional validation logic can be added here
    return true;
}