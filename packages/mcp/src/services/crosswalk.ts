/**
 * Crosswalk Service
 *
 * Maps classifications across different regulatory frameworks.
 */

import { type AssetCard } from "@aigrc/core";
import { AIGRCConfig } from "../config.js";
import { ProfileService } from "./profiles.js";

export interface CrosswalkMapping {
  assetId: string;
  assetName: string;
  classifications: {
    profileId: string;
    profileName: string;
    riskLevel: string;
    category?: string;
  }[];
  equivalences: Equivalence[];
  conflicts: Conflict[];
}

export interface Equivalence {
  profiles: string[];
  description: string;
  controlIds: string[];
}

export interface Conflict {
  profiles: string[];
  description: string;
  resolution: string;
}

// Cross-framework control mappings
const CONTROL_MAPPINGS: Record<string, Record<string, string[]>> = {
  "risk_management": {
    "eu-ai-act": ["eu-art-9"],
    "us-omb-m24": ["us-aia"],
    "nist-ai-rmf": ["nist-govern", "nist-manage"],
    "iso-42001": ["iso-a6"],
  },
  "human_oversight": {
    "eu-ai-act": ["eu-art-14"],
    "us-omb-m24": ["us-human-oversight"],
    "nist-ai-rmf": ["nist-govern"],
    "iso-42001": ["iso-a8"],
  },
  "transparency": {
    "eu-ai-act": ["eu-art-13", "eu-art-50"],
    "us-omb-m24": ["us-notice"],
    "nist-ai-rmf": ["nist-govern"],
    "iso-42001": ["iso-a7"],
  },
  "testing": {
    "eu-ai-act": ["eu-art-15"],
    "us-omb-m24": ["us-safety-testing"],
    "nist-ai-rmf": ["nist-measure"],
    "iso-42001": ["iso-a9"],
  },
  "data_governance": {
    "eu-ai-act": ["eu-art-10"],
    "nist-ai-rmf": ["nist-map"],
    "iso-42001": ["iso-a8"],
  },
  "documentation": {
    "eu-ai-act": ["eu-art-11"],
    "nist-ai-rmf": ["nist-map"],
    "iso-42001": ["iso-a7"],
  },
  "logging": {
    "eu-ai-act": ["eu-art-12"],
    "nist-ai-rmf": ["nist-measure"],
    "iso-42001": ["iso-a9"],
  },
  "equity": {
    "us-omb-m24": ["us-equity"],
    "nist-ai-rmf": ["nist-manage"],
  },
  "appeal_process": {
    "us-omb-m24": ["us-appeal"],
  },
};

// Risk level equivalences across frameworks
const RISK_LEVEL_MAPPINGS: Record<string, Record<string, string[]>> = {
  "eu-ai-act": {
    "minimal": ["nist:minimal", "iso:low"],
    "limited": ["nist:low", "iso:medium", "us:neither"],
    "high": ["nist:high", "iso:high", "us:rights-impacting"],
    "unacceptable": ["nist:critical", "iso:critical", "us:safety-impacting"],
  },
  "us-omb-m24": {
    "neither": ["eu:minimal", "eu:limited", "nist:minimal", "nist:low"],
    "rights-impacting": ["eu:high", "nist:high", "iso:high"],
    "safety-impacting": ["eu:unacceptable", "nist:critical", "iso:critical"],
  },
  "nist-ai-rmf": {
    "minimal": ["eu:minimal", "iso:low"],
    "low": ["eu:limited", "iso:low", "us:neither"],
    "moderate": ["eu:limited", "iso:medium"],
    "high": ["eu:high", "iso:high", "us:rights-impacting"],
    "critical": ["eu:unacceptable", "iso:critical", "us:safety-impacting"],
  },
};

export class CrosswalkService {
  constructor(
    private config: AIGRCConfig,
    private profileService: ProfileService
  ) {}

  /**
   * Generate crosswalk mapping for an asset
   */
  getCrosswalk(card: AssetCard, profileIds?: string[]): CrosswalkMapping {
    const profiles = profileIds || this.config.profiles;
    const classifications: CrosswalkMapping["classifications"] = [];

    // Get classification for each profile
    for (const profileId of profiles) {
      const profile = this.profileService.get(profileId);
      if (!profile) continue;

      const riskLevel = this.mapRiskLevel(
        card.classification.riskLevel,
        profileId
      );

      classifications.push({
        profileId,
        profileName: profile.name,
        riskLevel,
        category: this.getCategory(card, profileId),
      });
    }

    // Find equivalences
    const equivalences = this.findEquivalences(classifications);

    // Find conflicts
    const conflicts = this.findConflicts(classifications);

    return {
      assetId: card.id || card.name,
      assetName: card.name,
      classifications,
      equivalences,
      conflicts,
    };
  }

  /**
   * Get control mapping across frameworks
   */
  getControlCrosswalk(controlCategory: string): Record<string, string[]> {
    return CONTROL_MAPPINGS[controlCategory] || {};
  }

  /**
   * Find equivalent controls across profiles
   */
  findEquivalentControls(
    controlId: string,
    sourceProfile: string
  ): { profileId: string; controlIds: string[] }[] {
    const results: { profileId: string; controlIds: string[] }[] = [];

    // Find the category this control belongs to
    for (const [category, mappings] of Object.entries(CONTROL_MAPPINGS)) {
      const sourceControls = mappings[sourceProfile] || [];
      if (sourceControls.includes(controlId)) {
        // Found the category, now get equivalents from other profiles
        for (const [profileId, controls] of Object.entries(mappings)) {
          if (profileId !== sourceProfile) {
            results.push({ profileId, controlIds: controls });
          }
        }
        break;
      }
    }

    return results;
  }

  /**
   * Format crosswalk as markdown
   */
  formatCrosswalk(crosswalk: CrosswalkMapping): string {
    const lines: string[] = [];

    lines.push(`## Cross-Framework Mapping: ${crosswalk.assetName}\n`);

    // Classifications table
    lines.push("### Classifications Across Frameworks\n");
    lines.push("| Framework | Risk Level | Category |");
    lines.push("|-----------|------------|----------|");

    for (const c of crosswalk.classifications) {
      lines.push(
        `| ${c.profileName} | ${c.riskLevel.toUpperCase()} | ${c.category || "-"} |`
      );
    }

    // Equivalences
    if (crosswalk.equivalences.length > 0) {
      lines.push("\n### Equivalences\n");
      for (const eq of crosswalk.equivalences) {
        lines.push(`**${eq.profiles.join(" ↔ ")}**`);
        lines.push(`- ${eq.description}`);
        if (eq.controlIds.length > 0) {
          lines.push(`- Related controls: ${eq.controlIds.join(", ")}`);
        }
        lines.push("");
      }
    }

    // Conflicts
    if (crosswalk.conflicts.length > 0) {
      lines.push("\n### Potential Conflicts\n");
      for (const conflict of crosswalk.conflicts) {
        lines.push(`**${conflict.profiles.join(" vs ")}**`);
        lines.push(`- Issue: ${conflict.description}`);
        lines.push(`- Resolution: ${conflict.resolution}`);
        lines.push("");
      }
    }

    // Control crosswalk
    lines.push("\n### Control Crosswalk\n");
    lines.push("| Category | EU AI Act | US OMB | NIST | ISO 42001 |");
    lines.push("|----------|-----------|--------|------|-----------|");

    for (const [category, mappings] of Object.entries(CONTROL_MAPPINGS)) {
      const eu = mappings["eu-ai-act"]?.join(", ") || "-";
      const us = mappings["us-omb-m24"]?.join(", ") || "-";
      const nist = mappings["nist-ai-rmf"]?.join(", ") || "-";
      const iso = mappings["iso-42001"]?.join(", ") || "-";
      lines.push(
        `| ${category.replace(/_/g, " ")} | ${eu} | ${us} | ${nist} | ${iso} |`
      );
    }

    return lines.join("\n");
  }

  // Private helpers

  private mapRiskLevel(aigrcLevel: string, profileId: string): string {
    if (profileId === "eu-ai-act") {
      return aigrcLevel;
    }

    if (profileId === "us-omb-m24") {
      const mapping: Record<string, string> = {
        minimal: "neither",
        limited: "neither",
        high: "rights-impacting",
        unacceptable: "safety-impacting",
      };
      return mapping[aigrcLevel] || "neither";
    }

    if (profileId === "nist-ai-rmf") {
      const mapping: Record<string, string> = {
        minimal: "minimal",
        limited: "low",
        high: "high",
        unacceptable: "critical",
      };
      return mapping[aigrcLevel] || aigrcLevel;
    }

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

  private getCategory(card: AssetCard, profileId: string): string | undefined {
    if (profileId === "eu-ai-act") {
      return card.classification?.euAiAct?.category;
    }

    // US categories
    if (profileId === "us-omb-m24") {
      if (card.classification?.riskFactors?.highStakesDecisions) {
        return "Rights-impacting use";
      }
      return undefined;
    }

    return undefined;
  }

  private findEquivalences(
    classifications: CrosswalkMapping["classifications"]
  ): Equivalence[] {
    const equivalences: Equivalence[] = [];

    // Check for high-risk equivalences
    const highRiskProfiles = classifications.filter((c) =>
      ["high", "rights-impacting", "safety-impacting", "critical"].includes(
        c.riskLevel.toLowerCase()
      )
    );

    if (highRiskProfiles.length > 1) {
      equivalences.push({
        profiles: highRiskProfiles.map((p) => p.profileId),
        description:
          "These frameworks classify this asset as high-risk, requiring similar controls",
        controlIds: ["human_oversight", "risk_management", "testing"],
      });
    }

    // Check for transparency requirements
    const transparencyProfiles = classifications.filter((c) =>
      ["limited", "high", "rights-impacting"].includes(c.riskLevel.toLowerCase())
    );

    if (transparencyProfiles.length > 1) {
      equivalences.push({
        profiles: transparencyProfiles.map((p) => p.profileId),
        description: "These frameworks require transparency measures",
        controlIds: ["transparency"],
      });
    }

    return equivalences;
  }

  private findConflicts(
    classifications: CrosswalkMapping["classifications"]
  ): Conflict[] {
    const conflicts: Conflict[] = [];

    // Check for level mismatches that might cause confusion
    const euClass = classifications.find((c) => c.profileId === "eu-ai-act");
    const usClass = classifications.find((c) => c.profileId === "us-omb-m24");

    if (euClass && usClass) {
      // EU "limited" doesn't have a direct US equivalent
      if (euClass.riskLevel === "limited" && usClass.riskLevel === "neither") {
        conflicts.push({
          profiles: ["eu-ai-act", "us-omb-m24"],
          description:
            "EU AI Act requires transparency for 'limited' risk, but US OMB has no equivalent category",
          resolution:
            "Apply EU transparency requirements proactively for US deployments",
        });
      }
    }

    return conflicts;
  }
}
