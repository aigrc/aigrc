/**
 * Profile Service
 *
 * Manages compliance profile loading and configuration.
 */

import { AIGRCConfig } from "../config.js";

export interface ComplianceProfile {
  id: string;
  name: string;
  version: string;
  jurisdiction: string;
  description: string;
  effectiveDate?: string;
  controls: ControlDefinition[];
  riskLevels: string[];
  artifactTemplates: ArtifactTemplate[];
}

export interface ControlDefinition {
  id: string;
  name: string;
  description: string;
  applicableRiskLevels: string[];
  required: boolean;
  category: string;
}

export interface ArtifactTemplate {
  id: string;
  name: string;
  description: string;
  format: "markdown" | "yaml" | "json" | "pdf";
  requiredFor: string[];
}

// Built-in profiles
const BUILTIN_PROFILES: ComplianceProfile[] = [
  {
    id: "eu-ai-act",
    name: "EU AI Act",
    version: "2024.1",
    jurisdiction: "EU",
    description: "European Union Artificial Intelligence Act",
    effectiveDate: "2024-08-01",
    riskLevels: ["minimal", "limited", "high", "unacceptable"],
    controls: [
      {
        id: "eu-art-9",
        name: "Risk Management System",
        description: "Establish and maintain a risk management system",
        applicableRiskLevels: ["high"],
        required: true,
        category: "Risk Management",
      },
      {
        id: "eu-art-10",
        name: "Data Governance",
        description: "Training, validation and testing data governance",
        applicableRiskLevels: ["high"],
        required: true,
        category: "Data Governance",
      },
      {
        id: "eu-art-11",
        name: "Technical Documentation",
        description: "Comprehensive technical documentation",
        applicableRiskLevels: ["high"],
        required: true,
        category: "Documentation",
      },
      {
        id: "eu-art-12",
        name: "Record Keeping",
        description: "Automatic logging and record keeping",
        applicableRiskLevels: ["high"],
        required: true,
        category: "Logging",
      },
      {
        id: "eu-art-13",
        name: "Transparency",
        description: "Transparency and provision of information to deployers",
        applicableRiskLevels: ["high", "limited"],
        required: true,
        category: "Transparency",
      },
      {
        id: "eu-art-14",
        name: "Human Oversight",
        description: "Human oversight measures",
        applicableRiskLevels: ["high"],
        required: true,
        category: "Oversight",
      },
      {
        id: "eu-art-15",
        name: "Accuracy and Robustness",
        description: "Accuracy, robustness and cybersecurity",
        applicableRiskLevels: ["high"],
        required: true,
        category: "Technical",
      },
      {
        id: "eu-art-50",
        name: "Transparency Obligations",
        description: "Inform users of AI interaction",
        applicableRiskLevels: ["limited"],
        required: true,
        category: "Transparency",
      },
    ],
    artifactTemplates: [
      {
        id: "risk-management-plan",
        name: "Risk Management Plan",
        description: "Article 9 compliant risk management documentation",
        format: "markdown",
        requiredFor: ["high"],
      },
      {
        id: "technical-documentation",
        name: "Technical Documentation",
        description: "Article 11 compliant technical documentation",
        format: "markdown",
        requiredFor: ["high"],
      },
      {
        id: "conformity-declaration",
        name: "EU Declaration of Conformity",
        description: "Self-declaration of conformity",
        format: "pdf",
        requiredFor: ["high"],
      },
    ],
  },
  {
    id: "us-omb-m24",
    name: "US OMB M-24-10/M-24-18",
    version: "2024.1",
    jurisdiction: "US",
    description: "US Federal AI governance memoranda",
    effectiveDate: "2024-12-01",
    riskLevels: ["neither", "rights-impacting", "safety-impacting"],
    controls: [
      {
        id: "us-aia",
        name: "AI Impact Assessment",
        description: "Documented AI Impact Assessment",
        applicableRiskLevels: ["rights-impacting", "safety-impacting"],
        required: true,
        category: "Assessment",
      },
      {
        id: "us-human-oversight",
        name: "Human Oversight",
        description: "Meaningful human oversight mechanisms",
        applicableRiskLevels: ["rights-impacting", "safety-impacting"],
        required: true,
        category: "Oversight",
      },
      {
        id: "us-equity",
        name: "Equity Assessment",
        description: "Assessment of disparate impacts",
        applicableRiskLevels: ["rights-impacting"],
        required: true,
        category: "Equity",
      },
      {
        id: "us-notice",
        name: "Affected Individual Notice",
        description: "Notice to individuals affected by AI decisions",
        applicableRiskLevels: ["rights-impacting"],
        required: true,
        category: "Transparency",
      },
      {
        id: "us-appeal",
        name: "Appeal Process",
        description: "Process for affected individuals to appeal",
        applicableRiskLevels: ["rights-impacting"],
        required: true,
        category: "Remediation",
      },
      {
        id: "us-safety-testing",
        name: "Safety Testing",
        description: "Comprehensive safety testing documentation",
        applicableRiskLevels: ["safety-impacting"],
        required: true,
        category: "Testing",
      },
    ],
    artifactTemplates: [
      {
        id: "ai-impact-assessment",
        name: "AI Impact Assessment",
        description: "OMB required impact assessment",
        format: "markdown",
        requiredFor: ["rights-impacting", "safety-impacting"],
      },
      {
        id: "equity-assessment",
        name: "Equity Assessment",
        description: "Disparate impact analysis",
        format: "markdown",
        requiredFor: ["rights-impacting"],
      },
    ],
  },
  {
    id: "nist-ai-rmf",
    name: "NIST AI RMF",
    version: "1.0",
    jurisdiction: "US",
    description: "NIST AI Risk Management Framework",
    riskLevels: ["minimal", "low", "moderate", "high", "critical"],
    controls: [
      {
        id: "nist-govern",
        name: "GOVERN Function",
        description: "AI governance policies and procedures",
        applicableRiskLevels: ["minimal", "low", "moderate", "high", "critical"],
        required: true,
        category: "Governance",
      },
      {
        id: "nist-map",
        name: "MAP Function",
        description: "Context and risk mapping",
        applicableRiskLevels: ["low", "moderate", "high", "critical"],
        required: true,
        category: "Risk Mapping",
      },
      {
        id: "nist-measure",
        name: "MEASURE Function",
        description: "Risk measurement and monitoring",
        applicableRiskLevels: ["low", "moderate", "high", "critical"],
        required: true,
        category: "Measurement",
      },
      {
        id: "nist-manage",
        name: "MANAGE Function",
        description: "Risk treatment and response",
        applicableRiskLevels: ["low", "moderate", "high", "critical"],
        required: true,
        category: "Management",
      },
    ],
    artifactTemplates: [
      {
        id: "nist-profile",
        name: "NIST AI RMF Profile",
        description: "Organization-specific AI RMF profile",
        format: "yaml",
        requiredFor: ["moderate", "high", "critical"],
      },
    ],
  },
  {
    id: "iso-42001",
    name: "ISO/IEC 42001",
    version: "2023",
    jurisdiction: "International",
    description: "AI Management System Standard",
    riskLevels: ["low", "medium", "high", "critical"],
    controls: [
      {
        id: "iso-a5",
        name: "Leadership and commitment",
        description: "Top management commitment to AIMS",
        applicableRiskLevels: ["low", "medium", "high", "critical"],
        required: true,
        category: "Leadership",
      },
      {
        id: "iso-a6",
        name: "Planning",
        description: "AI risk and opportunity planning",
        applicableRiskLevels: ["low", "medium", "high", "critical"],
        required: true,
        category: "Planning",
      },
      {
        id: "iso-a7",
        name: "Support",
        description: "Resources, competence, awareness",
        applicableRiskLevels: ["medium", "high", "critical"],
        required: true,
        category: "Support",
      },
      {
        id: "iso-a8",
        name: "Operation",
        description: "Operational planning and control",
        applicableRiskLevels: ["medium", "high", "critical"],
        required: true,
        category: "Operations",
      },
      {
        id: "iso-a9",
        name: "Performance evaluation",
        description: "Monitoring, measurement, analysis",
        applicableRiskLevels: ["medium", "high", "critical"],
        required: true,
        category: "Performance",
      },
      {
        id: "iso-a10",
        name: "Improvement",
        description: "Continual improvement",
        applicableRiskLevels: ["high", "critical"],
        required: true,
        category: "Improvement",
      },
    ],
    artifactTemplates: [
      {
        id: "aims-policy",
        name: "AIMS Policy",
        description: "AI Management System Policy",
        format: "markdown",
        requiredFor: ["low", "medium", "high", "critical"],
      },
    ],
  },
];

export class ProfileService {
  private profiles: Map<string, ComplianceProfile> = new Map();

  constructor(private config: AIGRCConfig) {
    // Load built-in profiles
    for (const profile of BUILTIN_PROFILES) {
      this.profiles.set(profile.id, profile);
    }
  }

  /**
   * Get all available profiles
   */
  list(): ComplianceProfile[] {
    return Array.from(this.profiles.values());
  }

  /**
   * Get active profiles based on configuration
   */
  getActive(): ComplianceProfile[] {
    return this.config.profiles
      .map((id) => this.profiles.get(id))
      .filter((p): p is ComplianceProfile => p !== undefined);
  }

  /**
   * Get a specific profile by ID
   */
  get(id: string): ComplianceProfile | undefined {
    return this.profiles.get(id);
  }

  /**
   * Add a custom profile
   */
  add(profile: ComplianceProfile): void {
    this.profiles.set(profile.id, profile);
  }

  /**
   * Get controls applicable to a risk level for a profile
   */
  getApplicableControls(
    profileId: string,
    riskLevel: string
  ): ControlDefinition[] {
    const profile = this.profiles.get(profileId);
    if (!profile) return [];

    return profile.controls.filter((c) =>
      c.applicableRiskLevels.includes(riskLevel)
    );
  }

  /**
   * Get required artifacts for a risk level
   */
  getRequiredArtifacts(
    profileId: string,
    riskLevel: string
  ): ArtifactTemplate[] {
    const profile = this.profiles.get(profileId);
    if (!profile) return [];

    return profile.artifactTemplates.filter((t) =>
      t.requiredFor.includes(riskLevel)
    );
  }

  /**
   * Format profiles list as markdown
   */
  formatProfilesList(): string {
    const lines: string[] = [];
    lines.push("## Available Compliance Profiles\n");
    lines.push("| ID | Name | Jurisdiction | Version | Active |");
    lines.push("|----|------|--------------|---------|--------|");

    for (const profile of this.profiles.values()) {
      const isActive = this.config.profiles.includes(profile.id);
      lines.push(
        `| ${profile.id} | ${profile.name} | ${profile.jurisdiction} | ${profile.version} | ${isActive ? "Yes" : "No"} |`
      );
    }

    return lines.join("\n");
  }

  /**
   * Format single profile as markdown
   */
  formatProfile(profile: ComplianceProfile): string {
    const lines: string[] = [];

    lines.push(`## ${profile.name}\n`);
    lines.push(`**ID:** ${profile.id}`);
    lines.push(`**Version:** ${profile.version}`);
    lines.push(`**Jurisdiction:** ${profile.jurisdiction}`);
    lines.push(`**Description:** ${profile.description}`);
    if (profile.effectiveDate) {
      lines.push(`**Effective Date:** ${profile.effectiveDate}`);
    }

    lines.push("\n### Risk Levels\n");
    lines.push(profile.riskLevels.map((l) => `- ${l}`).join("\n"));

    lines.push("\n### Controls\n");
    lines.push("| ID | Name | Category | Required |");
    lines.push("|----|------|----------|----------|");
    for (const control of profile.controls) {
      lines.push(
        `| ${control.id} | ${control.name} | ${control.category} | ${control.required ? "Yes" : "No"} |`
      );
    }

    lines.push("\n### Artifact Templates\n");
    for (const template of profile.artifactTemplates) {
      lines.push(`- **${template.name}** (${template.format})`);
      lines.push(`  - ${template.description}`);
      lines.push(`  - Required for: ${template.requiredFor.join(", ")}`);
    }

    return lines.join("\n");
  }
}
