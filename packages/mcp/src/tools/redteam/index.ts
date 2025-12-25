/**
 * Red Team Tools
 *
 * Security verification and red team integration tools.
 */

import { AIGRCConfig } from "../../config.js";
import { Services } from "../../services/index.js";
import { ToolDefinition, ToolResult } from "../index.js";
import { AttackVector } from "../../services/redteam.js";

export const redteamTools: ToolDefinition[] = [
  {
    name: "get_redteam_status",
    description: "Get red team verification status for an asset",
    inputSchema: {
      type: "object",
      properties: {
        assetId: {
          type: "string",
          description: "Asset to check",
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
    name: "get_redteam_findings",
    description: "Get detailed red team findings for an asset",
    inputSchema: {
      type: "object",
      properties: {
        assetId: {
          type: "string",
          description: "Asset to get findings for",
        },
        severity: {
          type: "string",
          enum: ["critical", "high", "medium", "low", "all"],
          description: "Filter by severity",
        },
        status: {
          type: "string",
          enum: ["open", "remediated", "accepted", "in_progress", "all"],
          description: "Filter by status",
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
    name: "trigger_redteam_scan",
    description: "Trigger a red team scan for an asset (requires AIGOS connection)",
    inputSchema: {
      type: "object",
      properties: {
        assetId: {
          type: "string",
          description: "Asset to scan",
        },
        vectors: {
          type: "array",
          items: {
            type: "string",
            enum: [
              "prompt_injection",
              "memory_manipulation",
              "tool_hijacking",
              "capability_escalation",
              "context_poisoning",
              "goal_manipulation",
              "multi_agent_exploitation",
              "encoding_bypass",
            ],
          },
          description: "Specific attack vectors to test (default: all)",
        },
        environment: {
          type: "string",
          enum: ["sandbox", "staging"],
          description: "Environment to run scan in",
        },
        constraints: {
          type: "array",
          items: { type: "string" },
          description: "Specific constraints to verify from asset card",
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
    name: "verify_constraint",
    description: "Verify a specific asset card constraint using red team techniques",
    inputSchema: {
      type: "object",
      properties: {
        assetId: {
          type: "string",
          description: "Asset containing the constraint",
        },
        constraint: {
          type: "string",
          description: "Constraint to verify (e.g., 'humanApprovalRequired.data_export')",
        },
        directory: {
          type: "string",
          description: "Workspace directory",
        },
      },
      required: ["assetId", "constraint"],
    },
  },
  {
    name: "update_finding_status",
    description: "Update the status of a red team finding",
    inputSchema: {
      type: "object",
      properties: {
        findingId: {
          type: "string",
          description: "Finding ID (e.g., 'RT-2025-0042')",
        },
        status: {
          type: "string",
          enum: ["open", "in_progress", "remediated", "accepted", "false_positive"],
        },
        notes: {
          type: "string",
          description: "Status update notes",
        },
        evidence: {
          type: "string",
          description: "Path to remediation evidence",
        },
        directory: {
          type: "string",
          description: "Workspace directory",
        },
      },
      required: ["findingId", "status"],
    },
  },
];

export async function executeRedteamTools(
  name: string,
  args: Record<string, unknown>,
  services: Services,
  config: AIGRCConfig
): Promise<ToolResult | null> {
  // Check if red team is enabled
  if (!config.redTeamEnabled) {
    return {
      content: [
        {
          type: "text",
          text: "Red team integration is not enabled.\n\nTo enable, set `AIGRC_REDTEAM_ENABLED=true` and configure `AIGOS_API_URL`.",
        },
      ],
      isError: true,
    };
  }

  switch (name) {
    case "get_redteam_status": {
      const assetId = args.assetId as string;
      const status = await services.redTeam.getStatus(assetId);
      const formatted = services.redTeam.formatStatus(status);

      return {
        content: [{ type: "text", text: formatted }],
      };
    }

    case "get_redteam_findings": {
      const assetId = args.assetId as string;
      const severity = args.severity as "critical" | "high" | "medium" | "low" | "all" | undefined;
      const status = args.status as "open" | "remediated" | "accepted" | "in_progress" | "all" | undefined;

      const findings = await services.redTeam.getFindings(assetId, {
        severity,
        status,
      });

      const formatted = services.redTeam.formatFindings(findings);
      return {
        content: [{ type: "text", text: formatted }],
      };
    }

    case "trigger_redteam_scan": {
      const assetId = args.assetId as string;
      const vectors = args.vectors as AttackVector[] | undefined;
      const environment = (args.environment as "sandbox" | "staging") || "sandbox";
      const constraints = args.constraints as string[] | undefined;

      try {
        const result = await services.redTeam.triggerScan({
          assetId,
          vectors,
          environment,
          constraints,
        });

        return {
          content: [
            {
              type: "text",
              text: `## Red Team Scan Triggered\n\n**Scan ID:** ${result.scanId}\n**Status:** ${result.status}\n**Environment:** ${environment}\n\nThe scan has been queued. Use \`get_redteam_status\` to check progress.`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Failed to trigger scan: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    }

    case "verify_constraint": {
      const assetId = args.assetId as string;
      const constraint = args.constraint as string;

      const result = await services.redTeam.verifyConstraint(assetId, constraint);

      let output = `## Constraint Verification: ${constraint}\n\n`;
      output += `**Asset:** ${assetId}\n`;
      output += `**Verified:** ${result.verified ? "Yes" : "No"}\n`;
      output += `**Attempts:** ${result.attempts}\n`;
      output += `**Last Attempt:** ${result.lastAttempt}\n`;

      if (result.findings.length > 0) {
        output += "\n### Related Findings\n\n";
        output += services.redTeam.formatFindings(result.findings);
      }

      return {
        content: [{ type: "text", text: output }],
      };
    }

    case "update_finding_status": {
      const findingId = args.findingId as string;
      const status = args.status as "open" | "in_progress" | "remediated" | "accepted" | "false_positive";
      const notes = args.notes as string | undefined;
      const evidence = args.evidence as string | undefined;

      try {
        const finding = await services.redTeam.updateFindingStatus(
          findingId,
          status,
          notes,
          evidence
        );

        return {
          content: [
            {
              type: "text",
              text: `## Finding Updated\n\n**Finding ID:** ${finding.id}\n**New Status:** ${finding.status.toUpperCase()}\n**Updated:** ${finding.updatedAt}`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Failed to update finding: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    }

    default:
      return null;
  }
}
