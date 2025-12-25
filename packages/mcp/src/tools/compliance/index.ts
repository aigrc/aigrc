/**
 * Compliance Tools
 *
 * Profile management, compliance checking, gap analysis, and crosswalk tools.
 */

import { AIGRCConfig } from "../../config.js";
import { Services } from "../../services/index.js";
import { ToolDefinition, ToolResult } from "../index.js";

export const complianceTools: ToolDefinition[] = [
  {
    name: "list_compliance_profiles",
    description: "List all available compliance profiles",
    inputSchema: {
      type: "object",
      properties: {
        activeOnly: {
          type: "boolean",
          description: "Only show active profiles",
        },
      },
    },
  },
  {
    name: "get_compliance_profile",
    description: "Get details of a specific compliance profile",
    inputSchema: {
      type: "object",
      properties: {
        profileId: {
          type: "string",
          description: "Profile ID (e.g., eu-ai-act, us-omb-m24)",
        },
      },
      required: ["profileId"],
    },
  },
  {
    name: "check_compliance",
    description: "Check an asset's compliance against one or more profiles",
    inputSchema: {
      type: "object",
      properties: {
        assetId: {
          type: "string",
          description: "Asset card ID",
        },
        profileId: {
          type: "string",
          description: "Specific profile to check (default: all active)",
        },
        directory: {
          type: "string",
          description: "Workspace directory",
        },
      },
      required: ["assetId"],
    },
  },
  {
    name: "gap_analysis",
    description: "Perform gap analysis for an asset across profiles",
    inputSchema: {
      type: "object",
      properties: {
        assetId: {
          type: "string",
          description: "Asset card ID",
        },
        profiles: {
          type: "array",
          items: { type: "string" },
          description: "Profiles to analyze (default: all active)",
        },
        directory: {
          type: "string",
          description: "Workspace directory",
        },
      },
      required: ["assetId"],
    },
  },
  {
    name: "get_crosswalk",
    description: "Get cross-framework mapping for an asset",
    inputSchema: {
      type: "object",
      properties: {
        assetId: {
          type: "string",
          description: "Asset card ID",
        },
        profiles: {
          type: "array",
          items: { type: "string" },
          description: "Profiles to include in crosswalk",
        },
        directory: {
          type: "string",
          description: "Workspace directory",
        },
      },
      required: ["assetId"],
    },
  },
  {
    name: "get_control_mapping",
    description: "Get control mappings across frameworks for a category",
    inputSchema: {
      type: "object",
      properties: {
        category: {
          type: "string",
          description: "Control category (e.g., risk_management, human_oversight, transparency)",
        },
      },
      required: ["category"],
    },
  },
];

export async function executeComplianceTools(
  name: string,
  args: Record<string, unknown>,
  services: Services,
  config: AIGRCConfig
): Promise<ToolResult | null> {
  switch (name) {
    case "list_compliance_profiles": {
      const activeOnly = args.activeOnly === true;
      const profiles = activeOnly
        ? services.profiles.getActive()
        : services.profiles.list();

      const formatted = services.profiles.formatProfilesList();
      return {
        content: [{ type: "text", text: formatted }],
      };
    }

    case "get_compliance_profile": {
      const profileId = args.profileId as string;
      const profile = services.profiles.get(profileId);

      if (!profile) {
        return {
          content: [
            { type: "text", text: `Profile not found: ${profileId}` },
          ],
          isError: true,
        };
      }

      const formatted = services.profiles.formatProfile(profile);
      return {
        content: [{ type: "text", text: formatted }],
      };
    }

    case "check_compliance": {
      const assetId = args.assetId as string;
      const profileId = args.profileId as string | undefined;
      const directory = args.directory as string | undefined;

      const card = await services.cards.get(assetId, directory);
      if (!card) {
        return {
          content: [{ type: "text", text: `Asset card not found: ${assetId}` }],
          isError: true,
        };
      }

      if (profileId) {
        const status = services.compliance.checkCompliance(card, profileId);
        const formatted = services.compliance.formatComplianceStatus(status);
        return {
          content: [{ type: "text", text: formatted }],
        };
      }

      // Check all active profiles
      const statuses = services.compliance.checkAllProfiles(card);
      let output = `## Compliance Status: ${card.metadata.name}\n\n`;
      output += "| Profile | Compliant | Percentage | Gaps |\n";
      output += "|---------|-----------|------------|------|\n";

      for (const status of statuses) {
        output += `| ${status.profileName} | ${status.compliant ? "Yes" : "No"} | ${status.percentage}% | ${status.gaps.length} |\n`;
      }

      output += "\n---\n";
      for (const status of statuses) {
        output += "\n" + services.compliance.formatComplianceStatus(status);
      }

      return {
        content: [{ type: "text", text: output }],
      };
    }

    case "gap_analysis": {
      const assetId = args.assetId as string;
      const profiles = args.profiles as string[] | undefined;
      const directory = args.directory as string | undefined;

      const card = await services.cards.get(assetId, directory);
      if (!card) {
        return {
          content: [{ type: "text", text: `Asset card not found: ${assetId}` }],
          isError: true,
        };
      }

      const analysis = services.compliance.gapAnalysis(card, profiles);
      const formatted = services.compliance.formatGapAnalysis(analysis);

      return {
        content: [{ type: "text", text: formatted }],
      };
    }

    case "get_crosswalk": {
      const assetId = args.assetId as string;
      const profiles = args.profiles as string[] | undefined;
      const directory = args.directory as string | undefined;

      const card = await services.cards.get(assetId, directory);
      if (!card) {
        return {
          content: [{ type: "text", text: `Asset card not found: ${assetId}` }],
          isError: true,
        };
      }

      const crosswalk = services.crosswalk.getCrosswalk(card, profiles);
      const formatted = services.crosswalk.formatCrosswalk(crosswalk);

      return {
        content: [{ type: "text", text: formatted }],
      };
    }

    case "get_control_mapping": {
      const category = args.category as string;
      const mapping = services.crosswalk.getControlCrosswalk(category);

      if (Object.keys(mapping).length === 0) {
        return {
          content: [
            {
              type: "text",
              text: `No control mapping found for category: ${category}\n\nAvailable categories: risk_management, human_oversight, transparency, testing, data_governance, documentation, logging, equity, appeal_process`,
            },
          ],
        };
      }

      let output = `## Control Mapping: ${category.replace(/_/g, " ")}\n\n`;
      output += "| Framework | Controls |\n";
      output += "|-----------|----------|\n";

      for (const [framework, controls] of Object.entries(mapping)) {
        output += `| ${framework} | ${controls.join(", ")} |\n`;
      }

      return {
        content: [{ type: "text", text: output }],
      };
    }

    default:
      return null;
  }
}
