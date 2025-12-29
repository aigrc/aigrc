/**
 * Compliance Service
 *
 * Checks asset compliance against profiles and identifies gaps.
 * Supports both individual profiles and stacked multi-profile compliance.
 */

import { type AssetCard } from "@aigrc/core";
import { AIGRCConfig } from "../config.js";
import { ProfileService, ControlDefinition, ArtifactTemplate } from "./profiles.js";
import {
  StackedProfileService,
  StackedProfile,
  StackedClassification,
} from "./stacked-profiles.js";

export interface ControlStatus {
  controlId: string;
  controlName: string;
  status: "implemented" | "partial" | "not_implemented" | "not_applicable";
  evidence?: string;
  notes?: string;
}

export interface ComplianceStatus {
  profileId: string;
  profileName: string;
  riskLevel: string;
  compliant: boolean;
  percentage: number;
  controls: ControlStatus[];
  missingArtifacts: string[];
  gaps: string[];
}

export interface GapAnalysis {
  assetId: string;
  profiles: {
    profileId: string;
    gaps: Gap[];
    recommendations: string[];
  }[];
  priority: "critical" | "high" | "medium" | "low";
  estimatedEffort: string;
}

export interface Gap {
  type: "control" | "artifact" | "documentation";
  id: string;
  name: string;
  description: string;
  severity: "critical" | "high" | "medium" | "low";
  remediation: string;
}

/**
 * Stacked compliance status combining multiple profiles
 */
export interface StackedComplianceStatus {
  stackedProfileId: string;
  sourceProfiles: string[];
  strictestRiskLevel: string;
  overallCompliant: boolean;
  overallPercentage: number;
  profileStatuses: ComplianceStatus[];
  allGaps: string[];
  allMissingArtifacts: string[];
}

export class ComplianceService {
  private stackedProfileService: StackedProfileService;

  constructor(
    private config: AIGRCConfig,
    private profileService: ProfileService
  ) {
    this.stackedProfileService = new StackedProfileService(profileService);
  }

  /**
   * Check compliance for an asset against a specific profile
   */
  checkCompliance(card: AssetCard, profileId: string): ComplianceStatus {
    const profile = this.profileService.get(profileId);
    if (!profile) {
      throw new Error(`Profile not found: ${profileId}`);
    }

    // Map AIGRC risk level to profile risk level
    const riskLevel = this.mapRiskLevel(card.classification.riskLevel, profileId);

    // Get applicable controls
    const applicableControls = this.profileService.getApplicableControls(
      profileId,
      riskLevel
    );

    // Check each control
    const controlStatuses: ControlStatus[] = applicableControls.map((control) => {
      const status = this.evaluateControl(card, control);
      return {
        controlId: control.id,
        controlName: control.name,
        ...status,
      };
    });

    // Get required artifacts
    const requiredArtifacts = this.profileService.getRequiredArtifacts(
      profileId,
      riskLevel
    );

    // Check missing artifacts
    const missingArtifacts = this.checkMissingArtifacts(card, requiredArtifacts);

    // Calculate compliance percentage
    const implementedCount = controlStatuses.filter(
      (c) => c.status === "implemented" || c.status === "not_applicable"
    ).length;
    const totalRequired = controlStatuses.filter(
      (c) => c.status !== "not_applicable"
    ).length;
    const percentage =
      totalRequired > 0 ? Math.round((implementedCount / totalRequired) * 100) : 100;

    // Identify gaps
    const gaps: string[] = [];
    for (const control of controlStatuses) {
      if (control.status === "not_implemented") {
        gaps.push(`Missing: ${control.controlName}`);
      } else if (control.status === "partial") {
        gaps.push(`Partial: ${control.controlName}`);
      }
    }
    for (const artifact of missingArtifacts) {
      gaps.push(`Missing artifact: ${artifact}`);
    }

    return {
      profileId,
      profileName: profile.name,
      riskLevel,
      compliant: percentage === 100 && missingArtifacts.length === 0,
      percentage,
      controls: controlStatuses,
      missingArtifacts,
      gaps,
    };
  }

  /**
   * Check compliance against all active profiles
   */
  checkAllProfiles(card: AssetCard): ComplianceStatus[] {
    return this.config.profiles
      .map((profileId) => {
        try {
          return this.checkCompliance(card, profileId);
        } catch {
          return null;
        }
      })
      .filter((s): s is ComplianceStatus => s !== null);
  }

  /**
   * Perform gap analysis for an asset
   */
  gapAnalysis(card: AssetCard, profileIds?: string[]): GapAnalysis {
    const profiles = profileIds || this.config.profiles;
    const profileGaps: GapAnalysis["profiles"] = [];

    let maxSeverity: Gap["severity"] = "low";

    for (const profileId of profiles) {
      try {
        const compliance = this.checkCompliance(card, profileId);
        const gaps: Gap[] = [];

        // Control gaps
        for (const control of compliance.controls) {
          if (control.status === "not_implemented") {
            const gap: Gap = {
              type: "control",
              id: control.controlId,
              name: control.controlName,
              description: `Control ${control.controlId} is not implemented`,
              severity: this.getControlSeverity(control.controlId, profileId),
              remediation: this.getRemediationGuidance(control.controlId, profileId),
            };
            gaps.push(gap);
            if (this.compareSeverity(gap.severity, maxSeverity) > 0) {
              maxSeverity = gap.severity;
            }
          }
        }

        // Artifact gaps
        for (const artifact of compliance.missingArtifacts) {
          gaps.push({
            type: "artifact",
            id: artifact,
            name: artifact,
            description: `Required artifact "${artifact}" is missing`,
            severity: "medium",
            remediation: `Create ${artifact} documentation using the provided template`,
          });
        }

        // Generate recommendations
        const recommendations = this.generateRecommendations(gaps, profileId);

        profileGaps.push({
          profileId,
          gaps,
          recommendations,
        });
      } catch {
        // Skip profiles that fail
      }
    }

    return {
      assetId: card.id || card.name,
      profiles: profileGaps,
      priority: maxSeverity,
      estimatedEffort: this.estimateEffort(profileGaps),
    };
  }

  /**
   * Format compliance status as markdown
   */
  formatComplianceStatus(status: ComplianceStatus): string {
    const lines: string[] = [];

    lines.push(`## Compliance: ${status.profileName}\n`);
    lines.push(`**Risk Level:** ${status.riskLevel}`);
    lines.push(`**Compliant:** ${status.compliant ? "Yes" : "No"}`);
    lines.push(`**Compliance Percentage:** ${status.percentage}%\n`);

    if (status.controls.length > 0) {
      lines.push("### Controls\n");
      lines.push("| Control | Status | Notes |");
      lines.push("|---------|--------|-------|");

      for (const control of status.controls) {
        const statusIcon =
          control.status === "implemented"
            ? "[OK]"
            : control.status === "partial"
              ? "[PARTIAL]"
              : control.status === "not_applicable"
                ? "[N/A]"
                : "[MISSING]";
        lines.push(
          `| ${control.controlName} | ${statusIcon} | ${control.notes || "-"} |`
        );
      }
    }

    if (status.gaps.length > 0) {
      lines.push("\n### Gaps\n");
      for (const gap of status.gaps) {
        lines.push(`- ${gap}`);
      }
    }

    return lines.join("\n");
  }

  /**
   * Format gap analysis as markdown
   */
  formatGapAnalysis(analysis: GapAnalysis): string {
    const lines: string[] = [];

    lines.push(`## Gap Analysis: ${analysis.assetId}\n`);
    lines.push(`**Priority:** ${analysis.priority.toUpperCase()}`);
    lines.push(`**Estimated Effort:** ${analysis.estimatedEffort}\n`);

    for (const profile of analysis.profiles) {
      lines.push(`### ${profile.profileId}\n`);

      if (profile.gaps.length === 0) {
        lines.push("No gaps identified.\n");
        continue;
      }

      lines.push("| Gap | Severity | Type | Remediation |");
      lines.push("|-----|----------|------|-------------|");

      for (const gap of profile.gaps) {
        lines.push(
          `| ${gap.name} | ${gap.severity.toUpperCase()} | ${gap.type} | ${gap.remediation} |`
        );
      }

      if (profile.recommendations.length > 0) {
        lines.push("\n**Recommendations:**");
        for (const rec of profile.recommendations) {
          lines.push(`- ${rec}`);
        }
      }

      lines.push("");
    }

    return lines.join("\n");
  }

  // Private helpers

  private mapRiskLevel(aigrcLevel: string, profileId: string): string {
    // Map AIGRC risk levels to profile-specific levels
    const profile = this.profileService.get(profileId);
    if (!profile) return aigrcLevel;

    // For EU AI Act, levels match
    if (profileId === "eu-ai-act") {
      return aigrcLevel;
    }

    // For US OMB, map to rights/safety
    if (profileId === "us-omb-m24") {
      if (aigrcLevel === "high" || aigrcLevel === "unacceptable") {
        return "rights-impacting";
      }
      return "neither";
    }

    // For NIST, map minimal/limited/high/unacceptable to NIST levels
    if (profileId === "nist-ai-rmf") {
      const mapping: Record<string, string> = {
        minimal: "minimal",
        limited: "low",
        high: "high",
        unacceptable: "critical",
      };
      return mapping[aigrcLevel] || aigrcLevel;
    }

    // For ISO 42001
    if (profileId === "iso-42001") {
      const mapping: Record<string, string> = {
        minimal: "low",
        limited: "medium",
        high: "high",
        unacceptable: "critical",
      };
      return mapping[aigrcLevel] || aigrcLevel;
    }

    return aigrcLevel;
  }

  private evaluateControl(
    card: AssetCard,
    control: ControlDefinition
  ): { status: ControlStatus["status"]; evidence?: string; notes?: string } {
    // Check if control is documented in intent/governance
    const intent = card.intent || {};

    // Simple heuristic: check if there's evidence in goldenThread
    // In a real implementation, this would check specific fields

    // Map control categories to expected goldenThread fields
    const categoryMapping: Record<string, string[]> = {
      "Risk Management": ["riskManagement", "riskAssessment"],
      "Data Governance": ["dataGovernance", "dataQuality"],
      Documentation: ["technicalDocumentation", "documentation"],
      Logging: ["logging", "auditLog"],
      Transparency: ["transparency", "userNotice"],
      Oversight: ["humanOversight", "oversight"],
      Technical: ["testing", "accuracy", "robustness"],
      Assessment: ["impactAssessment", "aiImpactAssessment"],
      Equity: ["equityAssessment", "fairness"],
      Governance: ["governance", "policy"],
    };

    const expectedFields = categoryMapping[control.category] || [];
    const intentRecord = intent as Record<string, unknown>;
    const hasEvidence = expectedFields.some((field) => {
      const value = intentRecord[field];
      return value !== undefined && value !== null;
    });

    if (hasEvidence) {
      return {
        status: "implemented",
        evidence: expectedFields.find((f) => intentRecord[f])?.toString(),
        notes: "Evidence found in intent",
      };
    }

    // Check if partially implemented
    const hasPartialEvidence = expectedFields.some((field) => {
      const value = intentRecord[field];
      return typeof value === "object" && value !== null;
    });

    if (hasPartialEvidence) {
      return {
        status: "partial",
        notes: "Partial evidence found",
      };
    }

    return {
      status: "not_implemented",
      notes: "No evidence found in asset card",
    };
  }

  private checkMissingArtifacts(
    card: AssetCard,
    required: ArtifactTemplate[]
  ): string[] {
    const missing: string[] = [];
    const intentData = (card.intent || {}) as Record<string, unknown>;

    for (const template of required) {
      // Check if artifact is referenced in intent
      const hasArtifact = Object.keys(intentData).some((key) =>
        key.toLowerCase().includes(template.id.toLowerCase().replace(/-/g, ""))
      );

      if (!hasArtifact) {
        missing.push(template.name);
      }
    }

    return missing;
  }

  private getControlSeverity(
    controlId: string,
    profileId: string
  ): Gap["severity"] {
    // High-risk controls
    const criticalControls = [
      "eu-art-9",
      "eu-art-14",
      "us-aia",
      "us-human-oversight",
    ];
    if (criticalControls.includes(controlId)) {
      return "critical";
    }

    const highControls = [
      "eu-art-10",
      "eu-art-15",
      "us-equity",
      "nist-govern",
    ];
    if (highControls.includes(controlId)) {
      return "high";
    }

    return "medium";
  }

  private getRemediationGuidance(controlId: string, profileId: string): string {
    const guidance: Record<string, string> = {
      "eu-art-9": "Implement risk management system with continuous monitoring",
      "eu-art-10": "Document data sources, quality measures, and governance",
      "eu-art-11": "Create comprehensive technical documentation",
      "eu-art-12": "Implement automatic logging of AI system operations",
      "eu-art-13": "Provide clear user information and transparency notices",
      "eu-art-14": "Establish human oversight mechanisms and procedures",
      "eu-art-15": "Conduct accuracy testing and implement security measures",
      "us-aia": "Complete AI Impact Assessment documentation",
      "us-human-oversight": "Implement human review process for AI decisions",
      "us-equity": "Conduct disparate impact analysis",
    };

    return guidance[controlId] || "Implement required control";
  }

  private generateRecommendations(gaps: Gap[], profileId: string): string[] {
    const recommendations: string[] = [];

    const criticalGaps = gaps.filter((g) => g.severity === "critical");
    const highGaps = gaps.filter((g) => g.severity === "high");

    if (criticalGaps.length > 0) {
      recommendations.push(
        `Address ${criticalGaps.length} critical gap(s) immediately`
      );
    }

    if (highGaps.length > 0) {
      recommendations.push(
        `Plan remediation for ${highGaps.length} high-priority gap(s)`
      );
    }

    if (gaps.some((g) => g.type === "artifact")) {
      recommendations.push("Generate missing documentation using aigrc templates");
    }

    if (gaps.some((g) => g.id.includes("oversight"))) {
      recommendations.push("Establish human oversight committee or process");
    }

    return recommendations;
  }

  private compareSeverity(a: Gap["severity"], b: Gap["severity"]): number {
    const order = { critical: 4, high: 3, medium: 2, low: 1 };
    return order[a] - order[b];
  }

  private estimateEffort(
    profileGaps: GapAnalysis["profiles"]
  ): string {
    let totalGaps = 0;
    let criticalCount = 0;

    for (const profile of profileGaps) {
      totalGaps += profile.gaps.length;
      criticalCount += profile.gaps.filter((g) => g.severity === "critical").length;
    }

    if (totalGaps === 0) return "None required";
    if (criticalCount > 2) return "4-6 weeks (critical items)";
    if (totalGaps > 10) return "3-4 weeks";
    if (totalGaps > 5) return "1-2 weeks";
    return "A few days";
  }

  // ─────────────────────────────────────────────────────────────────
  // STACKED PROFILE COMPLIANCE
  // ─────────────────────────────────────────────────────────────────

  /**
   * Get the stacked profile service for advanced operations
   */
  getStackedProfileService(): StackedProfileService {
    return this.stackedProfileService;
  }

  /**
   * Check compliance against a stacked (combined) profile
   */
  checkStackedCompliance(
    card: AssetCard,
    profileIds?: string[]
  ): StackedComplianceStatus {
    const profiles = profileIds || this.config.profiles;

    // Create stacked profile
    const stacked = this.stackedProfileService.stack(profiles);

    // Check compliance against each source profile
    const profileStatuses: ComplianceStatus[] = [];
    for (const profileId of stacked.sourceProfiles) {
      try {
        const status = this.checkCompliance(card, profileId);
        profileStatuses.push(status);
      } catch {
        // Skip profiles that fail
      }
    }

    // Aggregate results
    const allGaps: string[] = [];
    const allMissingArtifacts: string[] = [];
    let totalPercentage = 0;

    for (const status of profileStatuses) {
      allGaps.push(...status.gaps);
      allMissingArtifacts.push(...status.missingArtifacts);
      totalPercentage += status.percentage;
    }

    // Deduplicate
    const uniqueGaps = [...new Set(allGaps)];
    const uniqueArtifacts = [...new Set(allMissingArtifacts)];

    // Calculate overall percentage
    const overallPercentage =
      profileStatuses.length > 0
        ? Math.round(totalPercentage / profileStatuses.length)
        : 100;

    // Get strictest risk level
    const classification = this.stackedProfileService.classify(
      card.classification.riskLevel,
      stacked
    );

    return {
      stackedProfileId: stacked.id,
      sourceProfiles: stacked.sourceProfiles,
      strictestRiskLevel: classification.strictestRiskLevel,
      overallCompliant: profileStatuses.every((s) => s.compliant),
      overallPercentage,
      profileStatuses,
      allGaps: uniqueGaps,
      allMissingArtifacts: uniqueArtifacts,
    };
  }

  /**
   * Format stacked compliance status as markdown
   */
  formatStackedComplianceStatus(status: StackedComplianceStatus): string {
    const lines: string[] = [];

    lines.push(`## Stacked Compliance: ${status.stackedProfileId}\n`);
    lines.push(`**Source Profiles:** ${status.sourceProfiles.join(", ")}`);
    lines.push(`**Strictest Risk Level:** ${status.strictestRiskLevel.toUpperCase()}`);
    lines.push(`**Overall Compliant:** ${status.overallCompliant ? "Yes" : "No"}`);
    lines.push(`**Overall Percentage:** ${status.overallPercentage}%\n`);

    // Summary table
    lines.push("### Per-Profile Summary\n");
    lines.push("| Profile | Risk Level | Compliant | Percentage |");
    lines.push("|---------|------------|-----------|------------|");

    for (const ps of status.profileStatuses) {
      lines.push(
        `| ${ps.profileName} | ${ps.riskLevel} | ${ps.compliant ? "Yes" : "No"} | ${ps.percentage}% |`
      );
    }

    // Combined gaps
    if (status.allGaps.length > 0) {
      lines.push("\n### All Gaps (Combined)\n");
      for (const gap of status.allGaps) {
        lines.push(`- ${gap}`);
      }
    }

    // Missing artifacts
    if (status.allMissingArtifacts.length > 0) {
      lines.push("\n### Missing Artifacts (Combined)\n");
      for (const artifact of status.allMissingArtifacts) {
        lines.push(`- ${artifact}`);
      }
    }

    // Detailed per-profile
    lines.push("\n---\n");
    lines.push("### Detailed Per-Profile Status\n");

    for (const ps of status.profileStatuses) {
      lines.push(this.formatComplianceStatus(ps));
      lines.push("\n");
    }

    return lines.join("\n");
  }
}
