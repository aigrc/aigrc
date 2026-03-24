// ─────────────────────────────────────────────────────────────────
// PangoGuard — Regulatory Framework Mapper
// Maps risk tiers to EU AI Act, NIST AI RMF, ISO 42001 obligations
// ─────────────────────────────────────────────────────────────────

import type { DetectionResult } from "@aigrc/core";
import type {
  RiskTier,
  RegulatoryMapping,
  EuAiActMapping,
  NistRmfMapping,
  Iso42001Mapping,
  SectorMapping,
} from "../types.js";
import { createLogger } from "../utils/logger.js";

const log = createLogger("regulatory-mapper");

/**
 * Map a risk tier + detection context to regulatory framework obligations.
 *
 * @param tier - L0/L1/L2/L3 risk tier
 * @param detections - Detection results for sector-specific auto-elevation
 * @returns Complete regulatory mapping across all frameworks
 */
export function mapToRegulations(
  tier: RiskTier,
  detections: DetectionResult[]
): RegulatoryMapping {
  return {
    euAiAct: mapEuAiAct(tier),
    nistRmf: mapNistRmf(tier),
    iso42001: mapIso42001(tier),
    sectorSpecific: detectSectorRegulations(detections),
  };
}

// ─────────────────────────────────────────────────────────────────
// EU AI ACT MAPPING (Section 4.2)
// ─────────────────────────────────────────────────────────────────

function mapEuAiAct(tier: RiskTier): EuAiActMapping {
  switch (tier) {
    case "L0":
      return {
        classification: "Minimal Risk",
        articles: ["Art. 52 — Transparency"],
        obligations: [
          "No mandatory requirements",
          "Voluntary codes of conduct encouraged",
          "Transparency if interacting with humans (chatbots)",
        ],
      };
    case "L1":
      return {
        classification: "Limited Risk",
        articles: [
          "Art. 52 — Transparency obligations",
        ],
        obligations: [
          "Users must be informed they are interacting with AI",
          "AI-generated content must be labeled",
          "Emotional recognition / biometric categorization disclosure",
          "Register in EU database if applicable",
        ],
      };
    case "L2":
      return {
        classification: "High Risk",
        articles: [
          "Art. 9 — Risk management system",
          "Art. 10 — Data and data governance",
          "Art. 11 — Technical documentation",
          "Art. 13 — Transparency and provision of information",
          "Art. 14 — Human oversight",
          "Art. 17 — Quality management system",
        ],
        obligations: [
          "Implement risk management system throughout lifecycle",
          "Ensure data governance and training data quality",
          "Maintain technical documentation before market placement",
          "Design for effective human oversight",
          "Achieve appropriate accuracy, robustness, cybersecurity",
          "Establish quality management system",
          "Register in EU database",
          "Undergo conformity assessment",
        ],
      };
    case "L3":
      return {
        classification: "Unacceptable Risk",
        articles: [
          "Art. 5 — Prohibited AI practices",
        ],
        obligations: [
          "PROHIBITED under EU AI Act",
          "Includes: social scoring, real-time biometric surveillance, subliminal manipulation",
          "Immediate legal review required",
          "Must be decommissioned or fundamentally redesigned",
          "Penalties up to 35M EUR or 7% global turnover",
        ],
      };
  }
}

// ─────────────────────────────────────────────────────────────────
// NIST AI RMF MAPPING (Section 4.3)
// ─────────────────────────────────────────────────────────────────

function mapNistRmf(tier: RiskTier): NistRmfMapping {
  switch (tier) {
    case "L0":
      return {
        functions: ["GOVERN"],
        subcategories: [
          "GV-1.1 — Legal and regulatory requirements identified",
          "GV-1.2 — Trustworthy AI characteristics integrated",
        ],
        actions: [
          "Document AI system in organizational inventory",
          "Assign initial risk category",
        ],
      };
    case "L1":
      return {
        functions: ["GOVERN", "MAP"],
        subcategories: [
          "GV-1.1 — Legal and regulatory requirements identified",
          "GV-1.2 — Trustworthy AI characteristics integrated",
          "MAP-1.1 — Intended purpose and context documented",
          "MAP-1.5 — Organizational risk tolerance determined",
          "MAP-2.1 — Intended users and affected groups identified",
        ],
        actions: [
          "Document purpose, users, and deployment context",
          "Map stakeholders and potential impacts",
          "Establish transparency controls",
          "Create basic monitoring plan",
        ],
      };
    case "L2":
      return {
        functions: ["GOVERN", "MAP", "MEASURE"],
        subcategories: [
          "GV-1.1 — Legal and regulatory requirements identified",
          "GV-1.2 — Trustworthy AI characteristics integrated",
          "GV-3.1 — Decision-making processes documented",
          "MAP-1.1 — Intended purpose and context documented",
          "MAP-1.5 — Organizational risk tolerance determined",
          "MAP-2.1 — Intended users and affected groups identified",
          "MAP-2.3 — Scientific integrity maintained",
          "MS-1.1 — Approaches for measurement identified",
          "MS-2.1 — Evaluations conducted for trustworthiness",
          "MS-2.6 — Performance metrics documented",
        ],
        actions: [
          "Implement comprehensive risk management process",
          "Conduct impact assessment and bias testing",
          "Establish human oversight mechanisms",
          "Deploy continuous monitoring and measurement",
          "Create incident response procedures",
          "Document all decision-making processes",
        ],
      };
    case "L3":
      return {
        functions: ["GOVERN", "MAP", "MEASURE", "MANAGE"],
        subcategories: [
          "GV-1.1 — Full legal compliance review",
          "GV-3.1 — Decision-making accountability",
          "MAP-1.1 — Complete context mapping",
          "MAP-3.1 — Benefits and costs documented",
          "MS-1.1 — Full measurement suite",
          "MS-2.1 — Comprehensive trustworthiness evaluation",
          "MG-1.1 — Risk treatment decisions documented",
          "MG-2.1 — Risk responses planned and implemented",
          "MG-3.1 — Pre-deployment risk mitigation complete",
          "MG-4.1 — Post-deployment monitoring active",
        ],
        actions: [
          "Full AI RMF implementation required",
          "Immediate executive and legal review",
          "Comprehensive impact assessment mandatory",
          "Third-party audit recommended",
          "Ongoing real-time monitoring required",
          "Incident response and rollback capability mandatory",
        ],
      };
  }
}

// ─────────────────────────────────────────────────────────────────
// ISO 42001 MAPPING (Section 4.4)
// ─────────────────────────────────────────────────────────────────

function mapIso42001(tier: RiskTier): Iso42001Mapping {
  switch (tier) {
    case "L0":
      return {
        clauses: ["Clause 6.1 — Actions to address risks and opportunities"],
        obligations: [
          "Include AI system in organizational risk register",
          "Document basic risk assessment",
        ],
        controls: [
          "A.6.1.1 — AI system risk identification",
        ],
      };
    case "L1":
      return {
        clauses: [
          "Clause 6.1 — Actions to address risks and opportunities",
          "Clause 8.4 — AI system impact assessment",
        ],
        obligations: [
          "Conduct AI impact assessment",
          "Document stakeholder impacts",
          "Establish transparency mechanisms",
        ],
        controls: [
          "A.6.1.1 — AI system risk identification",
          "A.8.4.1 — AI impact assessment process",
          "A.6.2.2 — Stakeholder engagement",
        ],
      };
    case "L2":
      return {
        clauses: [
          "Clause 6.1 — Actions to address risks and opportunities",
          "Clause 8.3 — AI risk treatment",
          "Clause 8.4 — AI system impact assessment",
          "Clause 9.1 — Monitoring, measurement, analysis, evaluation",
        ],
        obligations: [
          "Implement AI risk treatment plan",
          "Conduct comprehensive impact assessment",
          "Establish continuous monitoring",
          "Implement human oversight controls",
          "Document risk treatment effectiveness",
        ],
        controls: [
          "A.6.1.1 — AI system risk identification",
          "A.6.1.2 — Risk treatment planning",
          "A.8.3.1 — Risk treatment implementation",
          "A.8.4.1 — Impact assessment process",
          "A.9.1.1 — Monitoring and measurement",
          "A.9.1.2 — Internal audit of AI systems",
        ],
      };
    case "L3":
      return {
        clauses: [
          "Clause 6.1 — Actions to address risks and opportunities",
          "Clause 7.5 — Documented information",
          "Clause 8.3 — AI risk treatment",
          "Clause 8.4 — AI system impact assessment",
          "Clause 9.1 — Monitoring, measurement, analysis, evaluation",
          "Clause 10.1 — Continual improvement",
        ],
        obligations: [
          "Full AIMS (AI Management System) implementation required",
          "Complete documentation of all AI governance processes",
          "Executive-level risk review mandatory",
          "Third-party conformity assessment recommended",
          "Continuous improvement cycle required",
          "Incident response and remediation procedures",
        ],
        controls: [
          "A.6.1.1 — Full risk identification and assessment",
          "A.6.1.2 — Comprehensive risk treatment",
          "A.7.5.1 — Complete documented information",
          "A.8.3.1 — Risk treatment verification",
          "A.8.4.1 — Full impact assessment",
          "A.9.1.1 — Continuous monitoring",
          "A.9.1.2 — Regular internal audit",
          "A.10.1.1 — Continual improvement processes",
        ],
      };
  }
}

// ─────────────────────────────────────────────────────────────────
// SECTOR-SPECIFIC AUTO-ELEVATION (Section 4.5)
// ─────────────────────────────────────────────────────────────────

function detectSectorRegulations(
  detections: DetectionResult[]
): SectorMapping[] {
  const sectorMappings: SectorMapping[] = [];

  // Collect all implied risk factors from detections
  const allImplications = detections.flatMap((d) => d.implies);

  // Check for PII processing → potential HIPAA, GDPR
  const hasPii = allImplications.some(
    (impl) => impl.factor === "piiProcessing" && impl.value === "yes"
  );

  if (hasPii) {
    sectorMappings.push({
      regulation: "HIPAA",
      applicableStandards: [
        "HIPAA Privacy Rule (45 CFR 164)",
        "HIPAA Security Rule",
        "HITECH Act",
      ],
      requirements: [
        "PHI handling requires BAA with AI provider",
        "Minimum necessary standard applies",
        "Audit trail for all PHI access required",
        "Risk analysis under Security Rule 164.308(a)(1)",
      ],
      triggerReason: "PII processing detected — may include Protected Health Information",
    });

    sectorMappings.push({
      regulation: "GDPR",
      applicableStandards: [
        "GDPR Art. 22 — Automated decision-making",
        "GDPR Art. 35 — Data Protection Impact Assessment",
      ],
      requirements: [
        "Right to explanation for automated decisions",
        "Data Protection Impact Assessment required",
        "Lawful basis for processing personal data",
        "Data minimization principle applies",
      ],
      triggerReason: "Personal data processing detected in AI system",
    });
  }

  // Check for financial patterns
  const hasExternalData = allImplications.some(
    (impl) => impl.factor === "externalDataAccess" && impl.value === true
  );

  const hasHighStakes = allImplications.some(
    (impl) => impl.factor === "highStakesDecisions" && impl.value === true
  );

  if (hasHighStakes && hasExternalData) {
    sectorMappings.push({
      regulation: "SOX",
      applicableStandards: [
        "SOX Section 302 — Corporate Responsibility",
        "SOX Section 404 — Internal Controls",
      ],
      requirements: [
        "AI decisions affecting financial reporting require internal controls",
        "Management assertion of control effectiveness",
        "External auditor attestation may be required",
      ],
      triggerReason: "High-stakes AI decisions with external data access detected",
    });
  }

  return sectorMappings;
}
