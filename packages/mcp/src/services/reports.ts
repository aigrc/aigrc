/**
 * Reports Service
 *
 * Generates compliance reports and audit packages.
 */

import { type AssetCard } from "@aigrc/core";
import { AIGRCConfig } from "../config.js";
import { CardsService } from "./cards.js";
import { ComplianceService, ComplianceStatus } from "./compliance.js";
import { RedTeamService, RedTeamStatus } from "./redteam.js";

export interface ComplianceReport {
  generatedAt: string;
  workspace: string;
  profiles: string[];
  summary: ReportSummary;
  assets: AssetReport[];
  recommendations: string[];
}

export interface ReportSummary {
  totalAssets: number;
  byRiskLevel: Record<string, number>;
  overallCompliance: number;
  profileCompliance: Record<string, number>;
  criticalGaps: number;
}

export interface AssetReport {
  assetId: string;
  assetName: string;
  riskLevel: string;
  compliance: Record<string, ComplianceStatus>;
  redTeamStatus?: RedTeamStatus;
  criticalIssues: string[];
}

export interface AuditPackage {
  profile: string;
  generatedAt: string;
  assets: AuditAsset[];
  controlMatrix: ControlMatrixEntry[];
  artifactInventory: ArtifactEntry[];
  executiveSummary: string;
}

export interface AuditAsset {
  id: string;
  name: string;
  riskLevel: string;
  compliant: boolean;
  gaps: string[];
  artifacts: string[];
}

export interface ControlMatrixEntry {
  controlId: string;
  controlName: string;
  assetsCovered: number;
  assetsTotal: number;
  status: "full" | "partial" | "none";
}

export interface ArtifactEntry {
  artifactId: string;
  artifactName: string;
  required: boolean;
  present: boolean;
  lastUpdated?: string;
  assetId: string;
}

export class ReportsService {
  constructor(
    private config: AIGRCConfig,
    private cardsService: CardsService,
    private complianceService: ComplianceService,
    private redTeamService: RedTeamService
  ) {}

  /**
   * Generate a comprehensive compliance report
   */
  async generateComplianceReport(
    directory?: string,
    options?: {
      profiles?: string[];
      includeRedTeam?: boolean;
    }
  ): Promise<ComplianceReport> {
    const profiles = options?.profiles || this.config.profiles;
    const includeRedTeam = options?.includeRedTeam ?? this.config.redTeamEnabled;

    // Get all cards
    const cards = await this.cardsService.list(directory);

    // Build asset reports
    const assetReports: AssetReport[] = [];
    const profileCompliance: Record<string, number[]> = {};

    for (const card of cards) {
      const compliance: Record<string, ComplianceStatus> = {};
      const criticalIssues: string[] = [];

      for (const profileId of profiles) {
        try {
          const status = this.complianceService.checkCompliance(card, profileId);
          compliance[profileId] = status;

          if (!profileCompliance[profileId]) {
            profileCompliance[profileId] = [];
          }
          profileCompliance[profileId].push(status.percentage);

          // Track critical gaps
          for (const gap of status.gaps) {
            if (gap.toLowerCase().includes("critical") || gap.toLowerCase().includes("art-9") || gap.toLowerCase().includes("art-14")) {
              criticalIssues.push(`${profileId}: ${gap}`);
            }
          }
        } catch {
          // Skip failed profile checks
        }
      }

      let redTeamStatus: RedTeamStatus | undefined;
      if (includeRedTeam) {
        redTeamStatus = await this.redTeamService.getStatus(
          card.id || card.name
        );
        if (redTeamStatus.findings.critical > 0) {
          criticalIssues.push(
            `Red Team: ${redTeamStatus.findings.critical} critical finding(s)`
          );
        }
      }

      assetReports.push({
        assetId: card.id || card.name,
        assetName: card.name,
        riskLevel: card.classification.riskLevel,
        compliance,
        redTeamStatus,
        criticalIssues,
      });
    }

    // Calculate summary
    const byRiskLevel: Record<string, number> = {
      minimal: 0,
      limited: 0,
      high: 0,
      unacceptable: 0,
    };

    for (const card of cards) {
      byRiskLevel[card.classification.riskLevel] =
        (byRiskLevel[card.classification.riskLevel] || 0) + 1;
    }

    const profileComplianceAvg: Record<string, number> = {};
    for (const [profileId, percentages] of Object.entries(profileCompliance)) {
      const avg =
        percentages.reduce((a, b) => a + b, 0) / percentages.length || 0;
      profileComplianceAvg[profileId] = Math.round(avg);
    }

    const overallCompliance =
      Object.values(profileComplianceAvg).reduce((a, b) => a + b, 0) /
        Object.keys(profileComplianceAvg).length || 0;

    const criticalGaps = assetReports.reduce(
      (count, asset) => count + asset.criticalIssues.length,
      0
    );

    // Generate recommendations
    const recommendations = this.generateRecommendations(
      assetReports,
      byRiskLevel,
      criticalGaps
    );

    return {
      generatedAt: new Date().toISOString(),
      workspace: directory || this.config.workspace,
      profiles,
      summary: {
        totalAssets: cards.length,
        byRiskLevel,
        overallCompliance: Math.round(overallCompliance),
        profileCompliance: profileComplianceAvg,
        criticalGaps,
      },
      assets: assetReports,
      recommendations,
    };
  }

  /**
   * Generate audit package for a specific profile
   */
  async generateAuditPackage(
    profileId: string,
    directory?: string,
    assetId?: string
  ): Promise<AuditPackage> {
    const cards = assetId
      ? [await this.cardsService.get(assetId, directory)].filter(
          (c): c is AssetCard => c !== null
        )
      : await this.cardsService.list(directory);

    const auditAssets: AuditAsset[] = [];
    const controlCoverage: Map<string, { covered: number; total: number }> =
      new Map();
    const artifacts: ArtifactEntry[] = [];

    for (const card of cards) {
      const compliance = this.complianceService.checkCompliance(card, profileId);

      // Track control coverage
      for (const control of compliance.controls) {
        const existing = controlCoverage.get(control.controlId) || {
          covered: 0,
          total: 0,
        };
        existing.total++;
        if (
          control.status === "implemented" ||
          control.status === "not_applicable"
        ) {
          existing.covered++;
        }
        controlCoverage.set(control.controlId, existing);
      }

      // Track artifacts from intent
      const intentData = (card.intent || {}) as Record<string, unknown>;
      for (const [key, value] of Object.entries(intentData)) {
        if (typeof value === "object" && value !== null) {
          const docValue = value as { document?: string; lastUpdated?: string };
          artifacts.push({
            artifactId: key,
            artifactName: key.replace(/([A-Z])/g, " $1").trim(),
            required: true,
            present: !!docValue.document,
            lastUpdated: docValue.lastUpdated,
            assetId: card.id || card.name,
          });
        }
      }

      auditAssets.push({
        id: card.id || card.name,
        name: card.name,
        riskLevel: compliance.riskLevel,
        compliant: compliance.compliant,
        gaps: compliance.gaps,
        artifacts: Object.keys(intentData),
      });
    }

    // Build control matrix
    const controlMatrix: ControlMatrixEntry[] = [];
    for (const [controlId, coverage] of controlCoverage.entries()) {
      const control = this.findControlName(controlId, profileId);
      controlMatrix.push({
        controlId,
        controlName: control,
        assetsCovered: coverage.covered,
        assetsTotal: coverage.total,
        status:
          coverage.covered === coverage.total
            ? "full"
            : coverage.covered > 0
              ? "partial"
              : "none",
      });
    }

    // Generate executive summary
    const compliantCount = auditAssets.filter((a) => a.compliant).length;
    const executiveSummary = this.generateExecutiveSummary(
      profileId,
      auditAssets,
      compliantCount,
      controlMatrix
    );

    return {
      profile: profileId,
      generatedAt: new Date().toISOString(),
      assets: auditAssets,
      controlMatrix,
      artifactInventory: artifacts,
      executiveSummary,
    };
  }

  /**
   * Format compliance report as markdown
   */
  formatComplianceReport(report: ComplianceReport): string {
    const lines: string[] = [];

    lines.push("# AIGRC Compliance Report\n");
    lines.push(`**Generated:** ${report.generatedAt}`);
    lines.push(`**Workspace:** ${report.workspace}`);
    lines.push(`**Profiles:** ${report.profiles.join(", ")}\n`);

    // Executive Summary
    lines.push("## Executive Summary\n");
    lines.push(`- **Total Assets:** ${report.summary.totalAssets}`);
    lines.push(`- **Overall Compliance:** ${report.summary.overallCompliance}%`);
    lines.push(`- **Critical Gaps:** ${report.summary.criticalGaps}\n`);

    // Risk Distribution
    lines.push("### Risk Distribution\n");
    lines.push("| Risk Level | Count |");
    lines.push("|------------|-------|");
    for (const [level, count] of Object.entries(report.summary.byRiskLevel)) {
      if (count > 0) {
        lines.push(`| ${level.toUpperCase()} | ${count} |`);
      }
    }

    // Profile Compliance
    lines.push("\n### Compliance by Profile\n");
    lines.push("| Profile | Compliance |");
    lines.push("|---------|------------|");
    for (const [profile, pct] of Object.entries(
      report.summary.profileCompliance
    )) {
      lines.push(`| ${profile} | ${pct}% |`);
    }

    // Asset Details
    lines.push("\n## Asset Details\n");
    for (const asset of report.assets) {
      lines.push(`### ${asset.assetName}\n`);
      lines.push(`- **ID:** ${asset.assetId}`);
      lines.push(`- **Risk Level:** ${asset.riskLevel.toUpperCase()}`);

      if (Object.keys(asset.compliance).length > 0) {
        lines.push("\n**Compliance:**");
        for (const [profileId, status] of Object.entries(asset.compliance)) {
          lines.push(`- ${profileId}: ${status.percentage}%`);
        }
      }

      if (asset.criticalIssues.length > 0) {
        lines.push("\n**Critical Issues:**");
        for (const issue of asset.criticalIssues) {
          lines.push(`- ${issue}`);
        }
      }

      lines.push("");
    }

    // Recommendations
    if (report.recommendations.length > 0) {
      lines.push("## Recommendations\n");
      for (let i = 0; i < report.recommendations.length; i++) {
        lines.push(`${i + 1}. ${report.recommendations[i]}`);
      }
    }

    return lines.join("\n");
  }

  /**
   * Format audit package as markdown
   */
  formatAuditPackage(pkg: AuditPackage): string {
    const lines: string[] = [];

    lines.push(`# Audit Package: ${pkg.profile}\n`);
    lines.push(`**Generated:** ${pkg.generatedAt}\n`);

    lines.push("## Executive Summary\n");
    lines.push(pkg.executiveSummary);

    lines.push("\n## Assets\n");
    lines.push("| Asset | Risk Level | Compliant | Gaps |");
    lines.push("|-------|------------|-----------|------|");
    for (const asset of pkg.assets) {
      lines.push(
        `| ${asset.name} | ${asset.riskLevel} | ${asset.compliant ? "Yes" : "No"} | ${asset.gaps.length} |`
      );
    }

    lines.push("\n## Control Matrix\n");
    lines.push("| Control | Coverage | Status |");
    lines.push("|---------|----------|--------|");
    for (const control of pkg.controlMatrix) {
      const pct = Math.round(
        (control.assetsCovered / control.assetsTotal) * 100
      );
      lines.push(
        `| ${control.controlName} | ${control.assetsCovered}/${control.assetsTotal} (${pct}%) | ${control.status.toUpperCase()} |`
      );
    }

    lines.push("\n## Artifact Inventory\n");
    lines.push("| Artifact | Asset | Present | Last Updated |");
    lines.push("|----------|-------|---------|--------------|");
    for (const artifact of pkg.artifactInventory) {
      lines.push(
        `| ${artifact.artifactName} | ${artifact.assetId} | ${artifact.present ? "Yes" : "No"} | ${artifact.lastUpdated || "-"} |`
      );
    }

    return lines.join("\n");
  }

  // Private helpers

  private generateRecommendations(
    assets: AssetReport[],
    byRiskLevel: Record<string, number>,
    criticalGaps: number
  ): string[] {
    const recommendations: string[] = [];

    if (criticalGaps > 0) {
      recommendations.push(
        `Address ${criticalGaps} critical gap(s) as highest priority`
      );
    }

    if (byRiskLevel["unacceptable"] > 0) {
      recommendations.push(
        `Review ${byRiskLevel["unacceptable"]} asset(s) classified as unacceptable risk`
      );
    }

    if (byRiskLevel["high"] > 0) {
      recommendations.push(
        `Ensure ${byRiskLevel["high"]} high-risk asset(s) have complete conformity documentation`
      );
    }

    const lowCompliance = assets.filter((a) => {
      const pcts = Object.values(a.compliance).map((c) => c.percentage);
      return pcts.length > 0 && Math.min(...pcts) < 50;
    });

    if (lowCompliance.length > 0) {
      recommendations.push(
        `Prioritize compliance improvements for ${lowCompliance.length} asset(s) below 50% compliance`
      );
    }

    const missingRedTeam = assets.filter(
      (a) => a.riskLevel === "high" && !a.redTeamStatus?.enabled
    );
    if (missingRedTeam.length > 0) {
      recommendations.push(
        `Enable red team verification for ${missingRedTeam.length} high-risk asset(s)`
      );
    }

    return recommendations;
  }

  private findControlName(controlId: string, profileId: string): string {
    // Simple mapping - in production this would query ProfileService
    const names: Record<string, string> = {
      "eu-art-9": "Risk Management System",
      "eu-art-10": "Data Governance",
      "eu-art-11": "Technical Documentation",
      "eu-art-12": "Record Keeping",
      "eu-art-13": "Transparency",
      "eu-art-14": "Human Oversight",
      "eu-art-15": "Accuracy & Robustness",
      "us-aia": "AI Impact Assessment",
      "us-human-oversight": "Human Oversight",
      "us-equity": "Equity Assessment",
    };
    return names[controlId] || controlId;
  }

  private generateExecutiveSummary(
    profileId: string,
    assets: AuditAsset[],
    compliantCount: number,
    controlMatrix: ControlMatrixEntry[]
  ): string {
    const totalAssets = assets.length;
    const complianceRate = Math.round((compliantCount / totalAssets) * 100);
    const fullControls = controlMatrix.filter(
      (c) => c.status === "full"
    ).length;
    const totalControls = controlMatrix.length;
    const controlRate = Math.round((fullControls / totalControls) * 100);

    return `This audit package covers ${totalAssets} AI asset(s) against the ${profileId} compliance framework.

**Key Findings:**
- ${compliantCount} of ${totalAssets} assets (${complianceRate}%) are fully compliant
- ${fullControls} of ${totalControls} controls (${controlRate}%) have full coverage
- ${assets.filter((a) => a.riskLevel === "high").length} high-risk assets require enhanced documentation

**Audit Readiness:** ${complianceRate >= 80 ? "Ready" : complianceRate >= 50 ? "Partial" : "Not Ready"}`;
  }
}
