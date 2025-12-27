/**
 * Stacked Profile Service
 *
 * Combines multiple compliance profiles using "strictest wins" conflict resolution.
 * Enables organizations to comply with multiple regulatory frameworks simultaneously.
 */

import { ProfileService } from "./profiles.js";
import {
  ComplianceProfile,
  ControlDefinition,
  ArtifactTemplate,
} from "../schemas/profile.js";

/**
 * Represents a conflict between profiles that was resolved
 */
export interface ProfileConflict {
  type: "risk_level" | "control" | "artifact";
  profiles: string[];
  description: string;
  resolution: string;
  resolvedValue: unknown;
}

/**
 * A stacked profile combining multiple source profiles
 */
export interface StackedProfile {
  /** Composite ID like "eu-ai-act+us-omb-m24" */
  id: string;
  /** Combined name */
  name: string;
  /** Source profile IDs */
  sourceProfiles: string[];
  /** All unique risk levels from source profiles */
  riskLevels: string[];
  /** Merged controls (union) */
  controls: ControlDefinition[];
  /** Merged artifacts (union) */
  artifacts: ArtifactTemplate[];
  /** Conflicts that were resolved */
  conflicts: ProfileConflict[];
  /** Combined trustworthiness characteristics */
  trustworthinessCharacteristics: string[];
}

/**
 * Classification result for a stacked profile
 */
export interface StackedClassification {
  stackedProfileId: string;
  sourceClassifications: {
    profileId: string;
    profileName: string;
    riskLevel: string;
    category?: string;
  }[];
  /** Strictest risk level across all profiles */
  strictestRiskLevel: string;
  /** All applicable controls from all profiles */
  applicableControls: ControlDefinition[];
  /** All required artifacts from all profiles */
  requiredArtifacts: ArtifactTemplate[];
}

/**
 * Risk level ordering from least to most strict
 */
const RISK_LEVEL_ORDER: string[] = [
  // Minimal/none categories
  "minimal",
  "neither",
  "low",
  // Limited/moderate categories
  "limited",
  "medium",
  "moderate",
  // High categories
  "high",
  "rights-impacting",
  // Critical/maximum categories
  "critical",
  "safety-impacting",
  "unacceptable",
];

export class StackedProfileService {
  constructor(private profileService: ProfileService) {}

  /**
   * Stack multiple profiles using "strictest wins" conflict resolution
   */
  stack(profileIds: string[]): StackedProfile {
    const profiles: ComplianceProfile[] = [];

    for (const id of profileIds) {
      const profile = this.profileService.get(id);
      if (profile) {
        profiles.push(profile);
      }
    }

    if (profiles.length === 0) {
      throw new Error("No valid profiles to stack");
    }

    if (profiles.length === 1) {
      return this.singleProfileAsStacked(profiles[0]);
    }

    const conflicts: ProfileConflict[] = [];

    // Merge controls (union with deduplication)
    const mergedControls = this.mergeControls(profiles, conflicts);

    // Merge artifacts (union with deduplication)
    const mergedArtifacts = this.mergeArtifacts(profiles, conflicts);

    // Collect all risk levels
    const allRiskLevels = this.collectRiskLevels(profiles);

    // Collect trustworthiness characteristics
    const trustworthiness = this.collectTrustworthiness(profiles);

    return {
      id: profileIds.join("+"),
      name: profiles.map((p) => p.name).join(" + "),
      sourceProfiles: profileIds,
      riskLevels: allRiskLevels,
      controls: mergedControls,
      artifacts: mergedArtifacts,
      conflicts,
      trustworthinessCharacteristics: trustworthiness,
    };
  }

  /**
   * Classify an AIGRC risk level against a stacked profile
   */
  classify(
    aigrcRiskLevel: string,
    stackedProfile: StackedProfile
  ): StackedClassification {
    const sourceClassifications: StackedClassification["sourceClassifications"] =
      [];
    let strictestLevel = aigrcRiskLevel;
    let strictestIndex = this.getRiskLevelIndex(aigrcRiskLevel);

    // Get classification from each source profile
    for (const profileId of stackedProfile.sourceProfiles) {
      const profile = this.profileService.get(profileId);
      if (!profile) continue;

      const mappedLevel = this.profileService.mapRiskLevel(
        profileId,
        aigrcRiskLevel
      );

      sourceClassifications.push({
        profileId,
        profileName: profile.name,
        riskLevel: mappedLevel,
      });

      // Track strictest
      const idx = this.getRiskLevelIndex(mappedLevel);
      if (idx > strictestIndex) {
        strictestIndex = idx;
        strictestLevel = mappedLevel;
      }
    }

    // Get applicable controls from all profiles at their mapped risk levels
    const applicableControls: ControlDefinition[] = [];
    const seenControlIds = new Set<string>();

    for (const sc of sourceClassifications) {
      const controls = this.profileService.getApplicableControls(
        sc.profileId,
        sc.riskLevel
      );
      for (const control of controls) {
        if (!seenControlIds.has(control.id)) {
          seenControlIds.add(control.id);
          applicableControls.push(control);
        }
      }
    }

    // Get required artifacts from all profiles
    const requiredArtifacts: ArtifactTemplate[] = [];
    const seenArtifactIds = new Set<string>();

    for (const sc of sourceClassifications) {
      const artifacts = this.profileService.getRequiredArtifacts(
        sc.profileId,
        sc.riskLevel
      );
      for (const artifact of artifacts) {
        if (!seenArtifactIds.has(artifact.id)) {
          seenArtifactIds.add(artifact.id);
          requiredArtifacts.push(artifact);
        }
      }
    }

    return {
      stackedProfileId: stackedProfile.id,
      sourceClassifications,
      strictestRiskLevel: strictestLevel,
      applicableControls,
      requiredArtifacts,
    };
  }

  /**
   * Get the strictest risk level from a set of levels
   */
  getStrictestRiskLevel(levels: string[]): string {
    let strictest = levels[0] || "minimal";
    let strictestIndex = this.getRiskLevelIndex(strictest);

    for (const level of levels) {
      const idx = this.getRiskLevelIndex(level);
      if (idx > strictestIndex) {
        strictestIndex = idx;
        strictest = level;
      }
    }

    return strictest;
  }

  /**
   * Format stacked profile as markdown
   */
  formatStackedProfile(stacked: StackedProfile): string {
    const lines: string[] = [];

    lines.push(`## Stacked Profile: ${stacked.name}\n`);
    lines.push(`**ID:** ${stacked.id}`);
    lines.push(
      `**Source Profiles:** ${stacked.sourceProfiles.join(", ")}`
    );

    lines.push("\n### Combined Risk Levels\n");
    lines.push(stacked.riskLevels.map((l) => `- ${l}`).join("\n"));

    lines.push("\n### Merged Controls\n");
    lines.push("| ID | Name | Category | Applies To |");
    lines.push("|----|------|----------|------------|");
    for (const control of stacked.controls) {
      lines.push(
        `| ${control.id} | ${control.name} | ${control.category} | ${control.applicableRiskLevels.join(", ")} |`
      );
    }

    lines.push("\n### Required Artifacts\n");
    for (const artifact of stacked.artifacts) {
      lines.push(`- **${artifact.name}** (${artifact.format})`);
      lines.push(`  - Required for: ${artifact.requiredFor.join(", ")}`);
    }

    if (stacked.conflicts.length > 0) {
      lines.push("\n### Resolved Conflicts\n");
      for (const conflict of stacked.conflicts) {
        lines.push(`- **${conflict.type}** (${conflict.profiles.join(" vs ")})`);
        lines.push(`  - ${conflict.description}`);
        lines.push(`  - Resolution: ${conflict.resolution}`);
      }
    }

    if (stacked.trustworthinessCharacteristics.length > 0) {
      lines.push("\n### Trustworthiness Characteristics\n");
      lines.push(
        stacked.trustworthinessCharacteristics.map((c) => `- ${c}`).join("\n")
      );
    }

    return lines.join("\n");
  }

  /**
   * Format stacked classification as markdown
   */
  formatStackedClassification(classification: StackedClassification): string {
    const lines: string[] = [];

    lines.push(`## Stacked Classification\n`);
    lines.push(`**Stacked Profile:** ${classification.stackedProfileId}`);
    lines.push(
      `**Strictest Risk Level:** ${classification.strictestRiskLevel.toUpperCase()}`
    );

    lines.push("\n### Per-Profile Classifications\n");
    lines.push("| Profile | Risk Level |");
    lines.push("|---------|------------|");
    for (const sc of classification.sourceClassifications) {
      lines.push(`| ${sc.profileName} | ${sc.riskLevel.toUpperCase()} |`);
    }

    lines.push("\n### Applicable Controls\n");
    if (classification.applicableControls.length === 0) {
      lines.push("No controls required at this risk level.");
    } else {
      lines.push("| Control | Category |");
      lines.push("|---------|----------|");
      for (const control of classification.applicableControls) {
        lines.push(`| ${control.name} | ${control.category} |`);
      }
    }

    lines.push("\n### Required Artifacts\n");
    if (classification.requiredArtifacts.length === 0) {
      lines.push("No artifacts required at this risk level.");
    } else {
      for (const artifact of classification.requiredArtifacts) {
        lines.push(`- ${artifact.name} (${artifact.format})`);
      }
    }

    return lines.join("\n");
  }

  // Private helpers

  private singleProfileAsStacked(profile: ComplianceProfile): StackedProfile {
    return {
      id: profile.id,
      name: profile.name,
      sourceProfiles: [profile.id],
      riskLevels: profile.riskLevels,
      controls: profile.controls,
      artifacts: profile.artifactTemplates,
      conflicts: [],
      trustworthinessCharacteristics:
        profile.trustworthinessCharacteristics || [],
    };
  }

  private mergeControls(
    profiles: ComplianceProfile[],
    conflicts: ProfileConflict[]
  ): ControlDefinition[] {
    const controlMap = new Map<string, ControlDefinition>();

    for (const profile of profiles) {
      for (const control of profile.controls) {
        const existing = controlMap.get(control.id);
        if (existing) {
          // Merge: union of applicable risk levels, strictest required
          const mergedLevels = [
            ...new Set([
              ...existing.applicableRiskLevels,
              ...control.applicableRiskLevels,
            ]),
          ];

          // If required differs, use strictest (true wins)
          if (existing.required !== control.required) {
            conflicts.push({
              type: "control",
              profiles: [profile.id],
              description: `Control ${control.id} has different 'required' values`,
              resolution: "Using required=true (strictest)",
              resolvedValue: true,
            });
          }

          controlMap.set(control.id, {
            ...existing,
            applicableRiskLevels: mergedLevels,
            required: existing.required || control.required,
          });
        } else {
          controlMap.set(control.id, { ...control });
        }
      }
    }

    return Array.from(controlMap.values());
  }

  private mergeArtifacts(
    profiles: ComplianceProfile[],
    conflicts: ProfileConflict[]
  ): ArtifactTemplate[] {
    const artifactMap = new Map<string, ArtifactTemplate>();

    for (const profile of profiles) {
      for (const artifact of profile.artifactTemplates) {
        const existing = artifactMap.get(artifact.id);
        if (existing) {
          // Merge: union of requiredFor levels
          const mergedRequiredFor = [
            ...new Set([...existing.requiredFor, ...artifact.requiredFor]),
          ];

          artifactMap.set(artifact.id, {
            ...existing,
            requiredFor: mergedRequiredFor,
          });
        } else {
          artifactMap.set(artifact.id, { ...artifact });
        }
      }
    }

    return Array.from(artifactMap.values());
  }

  private collectRiskLevels(profiles: ComplianceProfile[]): string[] {
    const levels = new Set<string>();
    for (const profile of profiles) {
      for (const level of profile.riskLevels) {
        levels.add(level);
      }
    }
    return Array.from(levels);
  }

  private collectTrustworthiness(profiles: ComplianceProfile[]): string[] {
    const characteristics = new Set<string>();
    for (const profile of profiles) {
      if (profile.trustworthinessCharacteristics) {
        for (const c of profile.trustworthinessCharacteristics) {
          characteristics.add(c);
        }
      }
    }
    return Array.from(characteristics);
  }

  private getRiskLevelIndex(level: string): number {
    const idx = RISK_LEVEL_ORDER.indexOf(level.toLowerCase());
    return idx >= 0 ? idx : 0;
  }
}
