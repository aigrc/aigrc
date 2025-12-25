/**
 * Report Tools
 *
 * Compliance reporting and audit package generation.
 */

import { AIGRCConfig } from "../../config.js";
import { Services } from "../../services/index.js";
import { ToolDefinition, ToolResult } from "../index.js";

export const reportTools: ToolDefinition[] = [
  {
    name: "generate_compliance_report",
    description: "Generate a comprehensive compliance report for all assets",
    inputSchema: {
      type: "object",
      properties: {
        directory: {
          type: "string",
          description: "Workspace directory",
        },
        format: {
          type: "string",
          enum: ["markdown", "json"],
          description: "Output format",
        },
        profiles: {
          type: "array",
          items: { type: "string" },
          description: "Profiles to include (default: all active)",
        },
        includeRedTeam: {
          type: "boolean",
          description: "Include red team verification status",
        },
      },
    },
  },
  {
    name: "generate_audit_package",
    description: "Generate a complete audit package for a specific framework",
    inputSchema: {
      type: "object",
      properties: {
        profile: {
          type: "string",
          description: "Profile to generate audit package for",
        },
        assetId: {
          type: "string",
          description: "Specific asset (or omit for all)",
        },
        directory: {
          type: "string",
          description: "Workspace directory",
        },
      },
      required: ["profile"],
    },
  },
];

export async function executeReportTools(
  name: string,
  args: Record<string, unknown>,
  services: Services,
  config: AIGRCConfig
): Promise<ToolResult | null> {
  switch (name) {
    case "generate_compliance_report": {
      const directory = args.directory as string | undefined;
      const format = (args.format as "markdown" | "json") || "markdown";
      const profiles = args.profiles as string[] | undefined;
      const includeRedTeam = args.includeRedTeam as boolean | undefined;

      const report = await services.reports.generateComplianceReport(directory, {
        profiles,
        includeRedTeam,
      });

      if (format === "json") {
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(report, null, 2),
            },
          ],
        };
      }

      const formatted = services.reports.formatComplianceReport(report);
      return {
        content: [{ type: "text", text: formatted }],
      };
    }

    case "generate_audit_package": {
      const profile = args.profile as string;
      const assetId = args.assetId as string | undefined;
      const directory = args.directory as string | undefined;

      const pkg = await services.reports.generateAuditPackage(
        profile,
        directory,
        assetId
      );

      const formatted = services.reports.formatAuditPackage(pkg);
      return {
        content: [{ type: "text", text: formatted }],
      };
    }

    default:
      return null;
  }
}
