/**
 * Checkpoint Service
 *
 * Validates workspace against checkpoint requirements.
 * Used by GitHub App, GitLab webhook, and CI gates.
 */

import { Services } from "./index.js";
import { AIGRCConfig } from "../config.js";

export interface CheckpointConfig {
  requireGoldenThread: boolean;
  minCompliancePercentage: number;
  failOnHighRisk: boolean;
  failOnUnregistered: boolean;
  failOnCriticalFindings: boolean;
  profiles: string[];
}

export interface CheckpointValidation {
  // Layer 1: Detection
  detection: {
    passed: boolean;
    aiFrameworksFound: string[];
    highConfidenceDetections: number;
  };

  // Layer 2: Registration
  registration: {
    passed: boolean;
    unregisteredAssets: string[];
    orphanedCards: string[];
  };

  // Layer 3: Golden Thread
  goldenThread: {
    passed: boolean;
    assetsWithoutTickets: string[];
    invalidTicketLinks: string[];
    staleLinks: string[];
  };

  // Layer 4: Risk Classification
  risk: {
    passed: boolean;
    highRiskAssets: string[];
    unacceptableRiskAssets: string[];
  };

  // Layer 5: Compliance
  compliance: {
    passed: boolean;
    belowThreshold: Array<{
      assetId: string;
      profile: string;
      percentage: number;
      required: number;
    }>;
    missingArtifacts: Array<{
      assetId: string;
      artifactType: string;
      requiredBy: string[];
    }>;
  };

  // Layer 6: Security (if red team enabled)
  security?: {
    passed: boolean;
    criticalFindings: number;
    highFindings: number;
    assetsWithCritical: string[];
  };

  // Final Result
  verdict: "PASS" | "WARN" | "FAIL";
  score: number;
  blockers: string[];
  warnings: string[];
}

export const DEFAULT_CHECKPOINT_CONFIG: CheckpointConfig = {
  requireGoldenThread: true,
  minCompliancePercentage: 80,
  failOnHighRisk: false,
  failOnUnregistered: true,
  failOnCriticalFindings: true,
  profiles: ["eu-ai-act"],
};

export interface CheckpointService {
  validate(
    directory: string,
    config?: Partial<CheckpointConfig>
  ): Promise<CheckpointValidation>;
  getDefaultConfig(): CheckpointConfig;
  formatValidation(validation: CheckpointValidation): string;
}

export function createCheckpointService(
  services: Services,
  aigrcConfig: AIGRCConfig
): CheckpointService {
  return {
    async validate(
      directory: string,
      config?: Partial<CheckpointConfig>
    ): Promise<CheckpointValidation> {
      const checkpointConfig = { ...DEFAULT_CHECKPOINT_CONFIG, ...config };

      const cards = await services.cards.list(directory);
      const scanResult = await services.scanner.scan(directory);

      // Layer 1: Detection
      const highConfidenceDetections = scanResult.detections.filter(
        (d) => d.confidence === "high"
      );
      const detection = {
        passed: true,
        aiFrameworksFound: highConfidenceDetections.map((d) => d.framework),
        highConfidenceDetections: highConfidenceDetections.length,
      };

      // Layer 2: Registration
      const unregisteredAssets: string[] = [];
      for (const detection of highConfidenceDetections) {
        const isRegistered = cards.some(
          (c) =>
            (c.technical.framework?.toLowerCase() || "") === detection.framework.toLowerCase()
        );
        if (!isRegistered) {
          unregisteredAssets.push(`${detection.framework} (${detection.filePath})`);
        }
      }

      const registration = {
        passed: checkpointConfig.failOnUnregistered
          ? unregisteredAssets.length === 0
          : true,
        unregisteredAssets,
        orphanedCards: [], // Cards without matching code - would need deeper analysis
      };

      // Layer 3: Golden Thread (intent.ticketId)
      const assetsWithoutTickets = cards
        .filter((c) => !c.intent?.ticketId)
        .map((c) => c.name);

      const goldenThread = {
        passed: checkpointConfig.requireGoldenThread
          ? assetsWithoutTickets.length === 0
          : true,
        assetsWithoutTickets,
        invalidTicketLinks: [], // Would need Jira API to validate
        staleLinks: [], // Would need Jira API to check ticket status
      };

      // Layer 4: Risk Classification
      const highRiskAssets = cards
        .filter((c) => c.classification?.riskLevel === "high")
        .map((c) => c.name);
      const unacceptableRiskAssets = cards
        .filter((c) => c.classification?.riskLevel === "unacceptable")
        .map((c) => c.name);

      const risk = {
        passed: checkpointConfig.failOnHighRisk
          ? highRiskAssets.length === 0 && unacceptableRiskAssets.length === 0
          : unacceptableRiskAssets.length === 0,
        highRiskAssets,
        unacceptableRiskAssets,
      };

      // Layer 5: Compliance
      const belowThreshold: CheckpointValidation["compliance"]["belowThreshold"] = [];
      const missingArtifacts: CheckpointValidation["compliance"]["missingArtifacts"] = [];

      for (const card of cards) {
        const statuses = services.compliance.checkAllProfiles(card);
        for (const status of statuses) {
          if (status.percentage < checkpointConfig.minCompliancePercentage) {
            belowThreshold.push({
              assetId: card.name,
              profile: status.profileId,
              percentage: status.percentage,
              required: checkpointConfig.minCompliancePercentage,
            });
          }
        }

        // Check for missing required artifacts
        if (card.classification?.riskLevel === "high") {
          const existingTypes = card.classification?.requiredArtifacts?.filter(a => a.status === "complete").map((a) => a.type) || [];
          const requiredTypes = ["ai_impact_assessment", "risk_management_plan"];

          for (const reqType of requiredTypes) {
            if (!existingTypes.includes(reqType)) {
              missingArtifacts.push({
                assetId: card.name,
                artifactType: reqType,
                requiredBy: ["eu-ai-act"],
              });
            }
          }
        }
      }

      const compliance = {
        passed: belowThreshold.length === 0 && missingArtifacts.length === 0,
        belowThreshold,
        missingArtifacts,
      };

      // Layer 6: Security (optional)
      let security: CheckpointValidation["security"];
      if (aigrcConfig.redTeamEnabled) {
        let criticalFindings = 0;
        let highFindings = 0;
        const assetsWithCritical: string[] = [];

        for (const card of cards) {
          const status = await services.redTeam.getStatus(card.name);
          // RedTeamStatus has findings as summary object with critical, high counts
          criticalFindings += status.findings.critical;
          highFindings += status.findings.high;

          if (status.findings.critical > 0) {
            assetsWithCritical.push(card.name);
          }
        }

        security = {
          passed: checkpointConfig.failOnCriticalFindings
            ? criticalFindings === 0
            : true,
          criticalFindings,
          highFindings,
          assetsWithCritical,
        };
      }

      // Calculate blockers and warnings
      const blockers: string[] = [];
      const warnings: string[] = [];

      if (!registration.passed) {
        blockers.push(...unregisteredAssets.map((a) => `Unregistered: ${a}`));
      }

      if (!goldenThread.passed) {
        blockers.push(
          ...assetsWithoutTickets.map((a) => `Missing Golden Thread: ${a}`)
        );
      }

      if (!risk.passed) {
        if (unacceptableRiskAssets.length > 0) {
          blockers.push(
            ...unacceptableRiskAssets.map((a) => `UNACCEPTABLE risk: ${a}`)
          );
        }
        if (checkpointConfig.failOnHighRisk && highRiskAssets.length > 0) {
          blockers.push(...highRiskAssets.map((a) => `HIGH risk: ${a}`));
        }
      }

      if (!compliance.passed) {
        blockers.push(
          ...belowThreshold.map(
            (b) => `Compliance below ${b.required}%: ${b.assetId} (${b.profile}: ${b.percentage}%)`
          )
        );
        blockers.push(
          ...missingArtifacts.map(
            (m) => `Missing ${m.artifactType}: ${m.assetId}`
          )
        );
      }

      if (security && !security.passed) {
        blockers.push(
          ...security.assetsWithCritical.map((a) => `Critical security findings: ${a}`)
        );
      }

      // Add warnings for non-blocking issues
      if (highRiskAssets.length > 0 && !checkpointConfig.failOnHighRisk) {
        warnings.push(...highRiskAssets.map((a) => `HIGH risk asset: ${a}`));
      }

      if (security && security.highFindings > 0) {
        warnings.push(`${security.highFindings} high severity security findings`);
      }

      // Calculate score
      let score = 100;
      score -= blockers.length * 15;
      score -= warnings.length * 5;
      score = Math.max(0, Math.min(100, score));

      // Determine verdict
      const verdict: "PASS" | "WARN" | "FAIL" =
        blockers.length > 0 ? "FAIL" : warnings.length > 0 ? "WARN" : "PASS";

      return {
        detection,
        registration,
        goldenThread,
        risk,
        compliance,
        security,
        verdict,
        score,
        blockers,
        warnings,
      };
    },

    getDefaultConfig(): CheckpointConfig {
      return { ...DEFAULT_CHECKPOINT_CONFIG };
    },

    formatValidation(validation: CheckpointValidation): string {
      let output = `## Checkpoint Validation\n\n`;
      output += `### Verdict: ${validation.verdict}\n`;
      output += `**Score:** ${validation.score}/100\n\n`;

      // Layer summary
      output += `### Validation Layers\n`;
      output += `| Layer | Status |\n`;
      output += `|-------|--------|\n`;
      output += `| Detection | ${validation.detection.passed ? "✅" : "❌"} |\n`;
      output += `| Registration | ${validation.registration.passed ? "✅" : "❌"} |\n`;
      output += `| Golden Thread | ${validation.goldenThread.passed ? "✅" : "❌"} |\n`;
      output += `| Risk | ${validation.risk.passed ? "✅" : "❌"} |\n`;
      output += `| Compliance | ${validation.compliance.passed ? "✅" : "❌"} |\n`;
      if (validation.security) {
        output += `| Security | ${validation.security.passed ? "✅" : "❌"} |\n`;
      }
      output += "\n";

      if (validation.blockers.length > 0) {
        output += `### Blockers (${validation.blockers.length})\n`;
        validation.blockers.forEach((b) => {
          output += `- ❌ ${b}\n`;
        });
        output += "\n";
      }

      if (validation.warnings.length > 0) {
        output += `### Warnings (${validation.warnings.length})\n`;
        validation.warnings.forEach((w) => {
          output += `- ⚠️ ${w}\n`;
        });
      }

      return output;
    },
  };
}
