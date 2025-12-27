/**
 * Profile Service
 *
 * Manages compliance profile loading and configuration.
 * Supports loading profiles from YAML files and custom paths.
 */

import { AIGRCConfig } from "../config.js";
import { ProfileLoader, createProfileLoader } from "./profile-loader.js";
import {
  ComplianceProfile,
  ControlDefinition,
  ArtifactTemplate,
} from "../schemas/profile.js";

// Re-export types for backward compatibility
export type { ComplianceProfile, ControlDefinition, ArtifactTemplate };

export class ProfileService {
  private profiles: Map<string, ComplianceProfile> = new Map();
  private loader: ProfileLoader;
  private initialized = false;

  constructor(private config: AIGRCConfig) {
    this.loader = createProfileLoader({
      customProfilePaths: config.customProfilePaths,
      verbose: config.logLevel === "debug",
    });
  }

  /**
   * Initialize the service by loading all profiles.
   * Must be called before using other methods.
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    const result = this.loader.loadAll();
    this.profiles = result.profiles;

    if (result.errors.length > 0 && this.config.logLevel === "debug") {
      console.warn("Profile loading errors:", result.errors);
    }

    this.initialized = true;
  }

  /**
   * Ensure service is initialized (sync fallback using loader)
   */
  private ensureInitialized(): void {
    if (!this.initialized) {
      const result = this.loader.loadAll();
      this.profiles = result.profiles;
      this.initialized = true;
    }
  }

  /**
   * Get all available profiles
   */
  list(): ComplianceProfile[] {
    this.ensureInitialized();
    return Array.from(this.profiles.values());
  }

  /**
   * Get active profiles based on configuration
   */
  getActive(): ComplianceProfile[] {
    this.ensureInitialized();
    return this.config.profiles
      .map((id) => this.profiles.get(id))
      .filter((p): p is ComplianceProfile => p !== undefined);
  }

  /**
   * Get active profile IDs
   */
  getActiveIds(): string[] {
    return this.config.profiles;
  }

  /**
   * Get a specific profile by ID
   */
  get(id: string): ComplianceProfile | undefined {
    this.ensureInitialized();
    return this.profiles.get(id);
  }

  /**
   * Check if a profile exists
   */
  has(id: string): boolean {
    this.ensureInitialized();
    return this.profiles.has(id);
  }

  /**
   * Add a custom profile (runtime only)
   */
  add(profile: ComplianceProfile): void {
    this.ensureInitialized();
    this.profiles.set(profile.id, profile);
  }

  /**
   * Get controls applicable to a risk level for a profile
   */
  getApplicableControls(
    profileId: string,
    riskLevel: string
  ): ControlDefinition[] {
    const profile = this.get(profileId);
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
    const profile = this.get(profileId);
    if (!profile) return [];

    return profile.artifactTemplates.filter((t) =>
      t.requiredFor.includes(riskLevel)
    );
  }

  /**
   * Map AIGRC risk level to profile-specific risk level
   */
  mapRiskLevel(profileId: string, aigrcLevel: string): string {
    const profile = this.get(profileId);
    if (!profile) return aigrcLevel;

    // Use explicit mapping if available
    if (profile.riskLevelMapping && profile.riskLevelMapping[aigrcLevel]) {
      return profile.riskLevelMapping[aigrcLevel];
    }

    // Default: return same level if it exists in profile
    if (profile.riskLevels.includes(aigrcLevel)) {
      return aigrcLevel;
    }

    // Fallback mappings for common cases
    const fallbackMappings: Record<string, Record<string, string>> = {
      "us-omb-m24": {
        minimal: "neither",
        limited: "neither",
        high: "rights-impacting",
        unacceptable: "safety-impacting",
      },
      "nist-ai-rmf": {
        minimal: "minimal",
        limited: "low",
        high: "high",
        unacceptable: "critical",
      },
      "iso-42001": {
        minimal: "low",
        limited: "medium",
        high: "high",
        unacceptable: "critical",
      },
    };

    const profileMapping = fallbackMappings[profileId];
    if (profileMapping && profileMapping[aigrcLevel]) {
      return profileMapping[aigrcLevel];
    }

    return aigrcLevel;
  }

  /**
   * Format profiles list as markdown
   */
  formatProfilesList(): string {
    this.ensureInitialized();
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

    if (profile.riskLevelMapping) {
      lines.push("\n### Risk Level Mapping (AIGRC → Profile)\n");
      lines.push("| AIGRC Level | Profile Level |");
      lines.push("|-------------|---------------|");
      for (const [from, to] of Object.entries(profile.riskLevelMapping)) {
        lines.push(`| ${from} | ${to} |`);
      }
    }

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

    if (profile.trustworthinessCharacteristics) {
      lines.push("\n### Trustworthiness Characteristics\n");
      lines.push(
        profile.trustworthinessCharacteristics.map((c) => `- ${c}`).join("\n")
      );
    }

    return lines.join("\n");
  }
}
