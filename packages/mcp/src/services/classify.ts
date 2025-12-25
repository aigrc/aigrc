/**
 * Classification Service
 *
 * Risk classification with multi-jurisdiction support.
 */

import {
  classifyRisk as coreClassifyRisk,
  type RiskFactors,
  type ClassificationResult,
} from "@aigrc/core";
import { AIGRCConfig } from "../config.js";

export interface MultiJurisdictionClassification {
  euAiAct: ClassificationResult;
  usOmbM24?: USClassification;
  nistAiRmf?: NISTClassification;
  iso42001?: ISO42001Classification;
}

export interface USClassification {
  classification: "safety-impacting" | "rights-impacting" | "neither";
  ombMemorandum: "M-24-10" | "M-24-18";
  requiresAIA: boolean;
  requirements: string[];
}

export interface NISTClassification {
  riskLevel: "minimal" | "low" | "moderate" | "high" | "critical";
  functions: string[];
  categories: string[];
}

export interface ISO42001Classification {
  riskLevel: "low" | "medium" | "high" | "critical";
  controlObjectives: string[];
}

export interface ExtendedRiskFactors extends RiskFactors {
  // US-specific factors
  affectsSafety?: boolean;
  affectsRights?: boolean;
  principalBasisForDecision?: boolean;
  federalAgencyUse?: boolean;

  // Domain context
  domain?: string;
}

export class ClassifyService {
  constructor(private config: AIGRCConfig) {}

  /**
   * Classify risk using EU AI Act framework (default)
   */
  classifyEU(factors: RiskFactors): ClassificationResult {
    return coreClassifyRisk(factors);
  }

  /**
   * Classify using US OMB M-24 framework
   */
  classifyUS(factors: ExtendedRiskFactors): USClassification {
    const isSafetyImpacting = factors.affectsSafety || false;
    const isRightsImpacting =
      factors.affectsRights ||
      (factors.highStakesDecisions && factors.piiProcessing === "yes");

    let classification: USClassification["classification"] = "neither";
    if (isSafetyImpacting) {
      classification = "safety-impacting";
    } else if (isRightsImpacting) {
      classification = "rights-impacting";
    }

    const requirements: string[] = [];
    if (classification !== "neither") {
      requirements.push("AI Impact Assessment");
      requirements.push("Human Oversight Procedures");

      if (classification === "rights-impacting") {
        requirements.push("Equity Assessment");
        requirements.push("Affected Individual Notice");
        requirements.push("Appeal Process Documentation");
      }

      if (classification === "safety-impacting") {
        requirements.push("Safety Testing Report");
        requirements.push("Incident Response Plan");
      }
    }

    return {
      classification,
      ombMemorandum: factors.federalAgencyUse ? "M-24-10" : "M-24-18",
      requiresAIA: classification !== "neither",
      requirements,
    };
  }

  /**
   * Classify using NIST AI RMF framework
   */
  classifyNIST(factors: ExtendedRiskFactors): NISTClassification {
    // Calculate risk level based on factors
    let riskScore = 0;
    if (factors.autonomousDecisions) riskScore += 2;
    if (factors.highStakesDecisions) riskScore += 3;
    if (factors.affectsSafety) riskScore += 3;
    if (factors.affectsRights) riskScore += 2;
    if (factors.piiProcessing === "yes") riskScore += 2;
    if (factors.toolExecution) riskScore += 1;
    if (factors.externalDataAccess) riskScore += 1;

    let riskLevel: NISTClassification["riskLevel"];
    if (riskScore >= 10) riskLevel = "critical";
    else if (riskScore >= 7) riskLevel = "high";
    else if (riskScore >= 4) riskLevel = "moderate";
    else if (riskScore >= 2) riskLevel = "low";
    else riskLevel = "minimal";

    // Map to NIST AI RMF functions
    const functions: string[] = ["GOVERN"];
    if (riskLevel !== "minimal") {
      functions.push("MAP", "MEASURE", "MANAGE");
    }

    // Suggest categories based on factors
    const categories: string[] = [];
    if (factors.piiProcessing === "yes") {
      categories.push("Privacy Risk");
    }
    if (factors.affectsSafety) {
      categories.push("Safety Risk");
    }
    if (factors.affectsRights || factors.highStakesDecisions) {
      categories.push("Civil Liberties Risk");
    }
    if (factors.autonomousDecisions) {
      categories.push("Accountability Risk");
    }
    if (factors.externalDataAccess) {
      categories.push("Security Risk");
    }

    return { riskLevel, functions, categories };
  }

  /**
   * Classify using ISO 42001 framework
   */
  classifyISO42001(factors: ExtendedRiskFactors): ISO42001Classification {
    // Similar scoring to NIST but with ISO-specific controls
    let riskScore = 0;
    if (factors.autonomousDecisions) riskScore += 2;
    if (factors.highStakesDecisions) riskScore += 3;
    if (factors.affectsSafety) riskScore += 2;
    if (factors.piiProcessing === "yes") riskScore += 2;

    let riskLevel: ISO42001Classification["riskLevel"];
    if (riskScore >= 7) riskLevel = "critical";
    else if (riskScore >= 5) riskLevel = "high";
    else if (riskScore >= 3) riskLevel = "medium";
    else riskLevel = "low";

    // Map to ISO 42001 control objectives
    const controlObjectives: string[] = [
      "A.5 - Leadership and commitment",
      "A.6 - Planning",
    ];

    if (riskLevel !== "low") {
      controlObjectives.push(
        "A.7 - Support",
        "A.8 - Operation",
        "A.9 - Performance evaluation"
      );
    }

    if (riskLevel === "critical" || riskLevel === "high") {
      controlObjectives.push("A.10 - Improvement");
    }

    return { riskLevel, controlObjectives };
  }

  /**
   * Multi-jurisdiction classification
   */
  classifyMultiJurisdiction(
    factors: ExtendedRiskFactors,
    profiles?: string[]
  ): MultiJurisdictionClassification {
    const activeProfiles = profiles || this.config.profiles;

    const result: MultiJurisdictionClassification = {
      euAiAct: this.classifyEU(factors),
    };

    if (activeProfiles.includes("us-omb-m24")) {
      result.usOmbM24 = this.classifyUS(factors);
    }

    if (activeProfiles.includes("nist-ai-rmf")) {
      result.nistAiRmf = this.classifyNIST(factors);
    }

    if (activeProfiles.includes("iso-42001")) {
      result.iso42001 = this.classifyISO42001(factors);
    }

    return result;
  }

  /**
   * Format classification as markdown
   */
  formatClassification(
    classification: MultiJurisdictionClassification,
    factors: ExtendedRiskFactors
  ): string {
    const lines: string[] = [];

    lines.push("## Multi-Jurisdiction Risk Classification\n");

    // Summary table
    lines.push("| Profile | Classification | Key Requirement |");
    lines.push("|---------|---------------|-----------------|");

    lines.push(
      `| EU AI Act | ${classification.euAiAct.riskLevel.toUpperCase()} | ${classification.euAiAct.euAiActCategory || "N/A"} |`
    );

    if (classification.usOmbM24) {
      lines.push(
        `| US OMB ${classification.usOmbM24.ombMemorandum} | ${classification.usOmbM24.classification.toUpperCase()} | ${classification.usOmbM24.requiresAIA ? "AI Impact Assessment" : "N/A"} |`
      );
    }

    if (classification.nistAiRmf) {
      lines.push(
        `| NIST AI RMF | ${classification.nistAiRmf.riskLevel.toUpperCase()} | ${classification.nistAiRmf.functions.join(", ")} |`
      );
    }

    if (classification.iso42001) {
      lines.push(
        `| ISO 42001 | ${classification.iso42001.riskLevel.toUpperCase()} | AIMS Controls |`
      );
    }

    // Details
    lines.push("\n### EU AI Act Details\n");
    lines.push(`- **Risk Level:** ${classification.euAiAct.riskLevel}`);
    lines.push(`- **Reasons:** ${classification.euAiAct.reasons.join(", ")}`);
    if (classification.euAiAct.requiredArtifacts.length > 0) {
      lines.push(
        `- **Required Artifacts:** ${classification.euAiAct.requiredArtifacts.join(", ")}`
      );
    }

    if (classification.usOmbM24) {
      lines.push("\n### US OMB M-24 Details\n");
      lines.push(
        `- **Classification:** ${classification.usOmbM24.classification}`
      );
      lines.push(
        `- **Memorandum:** ${classification.usOmbM24.ombMemorandum}`
      );
      if (classification.usOmbM24.requirements.length > 0) {
        lines.push(
          `- **Requirements:** ${classification.usOmbM24.requirements.join(", ")}`
        );
      }
    }

    if (classification.nistAiRmf) {
      lines.push("\n### NIST AI RMF Details\n");
      lines.push(`- **Risk Level:** ${classification.nistAiRmf.riskLevel}`);
      lines.push(
        `- **Functions:** ${classification.nistAiRmf.functions.join(", ")}`
      );
      if (classification.nistAiRmf.categories.length > 0) {
        lines.push(
          `- **Risk Categories:** ${classification.nistAiRmf.categories.join(", ")}`
        );
      }
    }

    // Union of required artifacts
    const allArtifacts = new Set<string>();
    classification.euAiAct.requiredArtifacts.forEach((a) => allArtifacts.add(a));
    if (classification.usOmbM24) {
      classification.usOmbM24.requirements.forEach((a) => allArtifacts.add(a));
    }

    if (allArtifacts.size > 0) {
      lines.push("\n### Combined Required Artifacts\n");
      for (const artifact of allArtifacts) {
        lines.push(`- ${artifact}`);
      }
    }

    return lines.join("\n");
  }
}
