/**
 * Core Tools
 *
 * Basic scanning, card management, and classification tools.
 */

import { AIGRCConfig } from "../../config.js";
import { Services } from "../../services/index.js";
import { ToolDefinition, ToolResult } from "../index.js";

export const coreTools: ToolDefinition[] = [
  {
    name: "scan_directory",
    description: "Scan a directory for AI/ML frameworks and generate detection results",
    inputSchema: {
      type: "object",
      properties: {
        directory: {
          type: "string",
          description: "Directory path to scan (absolute or relative to workspace)",
        },
        exclude: {
          type: "array",
          items: { type: "string" },
          description: "Patterns to exclude from scan",
        },
        include: {
          type: "array",
          items: { type: "string" },
          description: "Patterns to include in scan",
        },
      },
      required: ["directory"],
    },
  },
  {
    name: "get_asset_cards",
    description: "List all registered asset cards with optional filtering",
    inputSchema: {
      type: "object",
      properties: {
        directory: {
          type: "string",
          description: "Workspace directory",
        },
        riskLevel: {
          type: "string",
          enum: ["minimal", "limited", "high", "unacceptable"],
          description: "Filter by risk level",
        },
        type: {
          type: "string",
          description: "Filter by asset type",
        },
        framework: {
          type: "string",
          description: "Filter by AI framework",
        },
      },
    },
  },
  {
    name: "get_asset_card",
    description: "Get details of a specific asset card",
    inputSchema: {
      type: "object",
      properties: {
        id: {
          type: "string",
          description: "Asset card ID or name",
        },
        directory: {
          type: "string",
          description: "Workspace directory",
        },
        includeCompliance: {
          type: "boolean",
          description: "Include compliance status for all active profiles",
        },
        includeRedTeam: {
          type: "boolean",
          description: "Include red team findings",
        },
      },
      required: ["id"],
    },
  },
  {
    name: "create_asset_card",
    description: "Create a new asset card with risk classification",
    inputSchema: {
      type: "object",
      properties: {
        name: {
          type: "string",
          description: "Asset name",
        },
        description: {
          type: "string",
          description: "Asset description",
        },
        type: {
          type: "string",
          enum: ["api_client", "framework", "agent", "model", "pipeline"],
          description: "Asset type",
        },
        framework: {
          type: "string",
          description: "Primary AI framework",
        },
        owner: {
          type: "object",
          properties: {
            name: { type: "string" },
            email: { type: "string" },
          },
          required: ["name", "email"],
        },
        riskFactors: {
          type: "object",
          properties: {
            autonomousDecisions: { type: "boolean" },
            customerFacing: { type: "boolean" },
            toolExecution: { type: "boolean" },
            externalDataAccess: { type: "boolean" },
            piiProcessing: { type: "string", enum: ["yes", "no", "unknown"] },
            highStakesDecisions: { type: "boolean" },
          },
        },
        directory: {
          type: "string",
          description: "Workspace directory",
        },
      },
      required: ["name", "type", "framework", "owner", "riskFactors"],
    },
  },
  {
    name: "validate_asset_card",
    description: "Validate an asset card against the schema",
    inputSchema: {
      type: "object",
      properties: {
        id: {
          type: "string",
          description: "Asset card ID to validate",
        },
        directory: {
          type: "string",
          description: "Workspace directory",
        },
      },
      required: ["id"],
    },
  },
  {
    name: "classify_risk",
    description: "Classify AI risk based on factors with multi-jurisdiction support",
    inputSchema: {
      type: "object",
      properties: {
        autonomousDecisions: {
          type: "boolean",
          description: "Does the AI make decisions without human review?",
        },
        customerFacing: {
          type: "boolean",
          description: "Does the AI interact directly with customers?",
        },
        toolExecution: {
          type: "boolean",
          description: "Can the AI execute tools or take actions?",
        },
        externalDataAccess: {
          type: "boolean",
          description: "Does the AI access external data sources?",
        },
        piiProcessing: {
          type: "string",
          enum: ["yes", "no", "unknown"],
          description: "Does the AI process personal data?",
        },
        highStakesDecisions: {
          type: "boolean",
          description: "Do AI outputs affect important life decisions?",
        },
        affectsSafety: {
          type: "boolean",
          description: "Could the AI affect physical safety? (US OMB)",
        },
        affectsRights: {
          type: "boolean",
          description: "Could the AI affect individual rights? (US OMB)",
        },
        domain: {
          type: "string",
          description: "Application domain (e.g., employment, healthcare, finance)",
        },
        profiles: {
          type: "array",
          items: { type: "string" },
          description: "Specific profiles to classify against",
        },
      },
      required: ["autonomousDecisions", "customerFacing", "toolExecution", "externalDataAccess", "piiProcessing", "highStakesDecisions"],
    },
  },
];

export async function executeCoreTools(
  name: string,
  args: Record<string, unknown>,
  services: Services,
  config: AIGRCConfig
): Promise<ToolResult | null> {
  switch (name) {
    case "scan_directory": {
      const directory = args.directory as string;
      const exclude = args.exclude as string[] | undefined;
      const include = args.include as string[] | undefined;

      const result = await services.scanner.scan(directory, { ignorePatterns: exclude, extensions: include });
      const formatted = services.scanner.formatScanResults(result);

      return {
        content: [{ type: "text", text: formatted }],
      };
    }

    case "get_asset_cards": {
      const directory = args.directory as string | undefined;
      const filter = {
        riskLevel: args.riskLevel as "minimal" | "limited" | "high" | "unacceptable" | undefined,
        type: args.type as string | undefined,
        framework: args.framework as string | undefined,
      };

      const cards = await services.cards.list(directory, filter);
      const formatted = services.cards.formatCardsList(cards);

      return {
        content: [{ type: "text", text: formatted }],
      };
    }

    case "get_asset_card": {
      const id = args.id as string;
      const directory = args.directory as string | undefined;
      const includeCompliance = args.includeCompliance !== false;
      const includeRedTeam = args.includeRedTeam === true;

      const card = await services.cards.get(id, directory);
      if (!card) {
        return {
          content: [{ type: "text", text: `Asset card not found: ${id}` }],
          isError: true,
        };
      }

      let output = services.cards.formatCard(card);

      if (includeCompliance) {
        output += "\n\n---\n\n## Compliance Status\n";
        const statuses = services.compliance.checkAllProfiles(card);
        for (const status of statuses) {
          output += `\n### ${status.profileName}: ${status.percentage}%`;
          if (status.gaps.length > 0) {
            output += `\n- Gaps: ${status.gaps.slice(0, 3).join(", ")}`;
          }
        }
      }

      if (includeRedTeam && config.redTeamEnabled) {
        const redTeamStatus = await services.redTeam.getStatus(id);
        output += "\n\n---\n\n" + services.redTeam.formatStatus(redTeamStatus);
      }

      return {
        content: [{ type: "text", text: output }],
      };
    }

    case "create_asset_card": {
      const directory = args.directory as string | undefined;

      // Build risk factors
      const riskFactors = args.riskFactors as {
        autonomousDecisions?: boolean;
        customerFacing?: boolean;
        toolExecution?: boolean;
        externalDataAccess?: boolean;
        piiProcessing?: "yes" | "no" | "unknown";
        highStakesDecisions?: boolean;
      };

      // Classify risk
      const classification = services.classify.classifyEU({
        autonomousDecisions: riskFactors.autonomousDecisions || false,
        customerFacing: riskFactors.customerFacing || false,
        toolExecution: riskFactors.toolExecution || false,
        externalDataAccess: riskFactors.externalDataAccess || false,
        piiProcessing: riskFactors.piiProcessing || "unknown",
        highStakesDecisions: riskFactors.highStakesDecisions || false,
      });

      const createOptions = {
        name: args.name as string,
        description: args.description as string | undefined,
        owner: args.owner as { name: string; email: string },
        type: args.type as "api_client" | "framework" | "agent" | "model" | "pipeline",
        framework: args.framework as string | undefined,
        riskFactors: {
          autonomousDecisions: riskFactors.autonomousDecisions || false,
          customerFacing: riskFactors.customerFacing || false,
          toolExecution: riskFactors.toolExecution || false,
          externalDataAccess: riskFactors.externalDataAccess || false,
          piiProcessing: riskFactors.piiProcessing || ("unknown" as const),
          highStakesDecisions: riskFactors.highStakesDecisions || false,
        },
      };

      const cardId = await services.cards.create(createOptions, directory);

      return {
        content: [
          {
            type: "text",
            text: `## Asset Card Created\n\n**ID:** ${cardId}\n**Risk Level:** ${classification?.riskLevel?.toUpperCase() || "MINIMAL"}\n**EU AI Act Category:** ${classification?.euAiActCategory || "N/A"}\n\nThe asset card has been saved to \`.aigrc/cards/${cardId}.yaml\``,
          },
        ],
      };
    }

    case "validate_asset_card": {
      const id = args.id as string;
      const directory = args.directory as string | undefined;

      const card = await services.cards.get(id, directory);
      if (!card) {
        return {
          content: [{ type: "text", text: `Asset card not found: ${id}` }],
          isError: true,
        };
      }

      const validation = services.cards.validate(card);

      if (validation.valid) {
        return {
          content: [
            {
              type: "text",
              text: `## Validation: ${id}\n\n**Status:** Valid\n\nThe asset card passes all schema validations.`,
            },
          ],
        };
      }

      return {
        content: [
          {
            type: "text",
            text: `## Validation: ${id}\n\n**Status:** Invalid\n\n**Errors:**\n${validation.errors.map((e) => `- ${e}`).join("\n")}`,
          },
        ],
        isError: true,
      };
    }

    case "classify_risk": {
      const factors = {
        autonomousDecisions: args.autonomousDecisions as boolean,
        customerFacing: args.customerFacing as boolean,
        toolExecution: args.toolExecution as boolean,
        externalDataAccess: args.externalDataAccess as boolean,
        piiProcessing: args.piiProcessing as "yes" | "no" | "unknown",
        highStakesDecisions: args.highStakesDecisions as boolean,
        affectsSafety: args.affectsSafety as boolean | undefined,
        affectsRights: args.affectsRights as boolean | undefined,
      };

      const profiles = args.profiles as string[] | undefined;
      const classification = services.classify.classifyMultiJurisdiction(
        factors,
        profiles
      );

      const formatted = services.classify.formatClassification(
        classification,
        factors
      );

      return {
        content: [{ type: "text", text: formatted }],
      };
    }

    default:
      return null;
  }
}
