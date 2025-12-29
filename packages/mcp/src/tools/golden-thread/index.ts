/**
 * Golden Thread Tools
 *
 * Tools for establishing and managing the bidirectional link between
 * AI assets and their business justification.
 */

import { AIGRCConfig } from "../../config.js";
import { Services } from "../../services/index.js";
import { ToolDefinition, ToolResult } from "../index.js";

export const goldenThreadTools: ToolDefinition[] = [
  {
    name: "link_business_intent",
    description:
      "Link an AI asset to a Jira/ADO ticket to establish the Golden Thread. This connects the asset to its business justification, enabling full traceability from business need to deployed AI.",
    inputSchema: {
      type: "object",
      properties: {
        assetId: {
          type: "string",
          description: "Asset card ID or name to link",
        },
        ticketId: {
          type: "string",
          description: "Ticket ID (e.g., PROJ-123, AB#456, #789)",
        },
        ticketSystem: {
          type: "string",
          enum: ["jira", "ado", "github", "gitlab"],
          description: "Ticket system (auto-detected if not specified)",
        },
        businessJustification: {
          type: "string",
          description: "Business justification for this AI capability",
        },
        riskTolerance: {
          type: "string",
          enum: ["low", "medium", "high"],
          description: "Approved risk tolerance from business stakeholders",
        },
        directory: {
          type: "string",
          description: "Workspace directory (default: current)",
        },
      },
      required: ["assetId", "ticketId"],
    },
  },
  {
    name: "get_business_context",
    description:
      "Get business context for an AI asset from its linked ticket. Returns ticket details, approval status, and AI governance properties.",
    inputSchema: {
      type: "object",
      properties: {
        assetId: {
          type: "string",
          description: "Asset card ID or name",
        },
        directory: {
          type: "string",
          description: "Workspace directory (default: current)",
        },
      },
      required: ["assetId"],
    },
  },
  {
    name: "validate_golden_thread",
    description:
      "Validate the Golden Thread integrity for an asset or the entire workspace. Checks for missing links, stale links, integrity hash mismatches, and risk tolerance violations.",
    inputSchema: {
      type: "object",
      properties: {
        assetId: {
          type: "string",
          description: "Asset card ID (or 'all' for entire workspace)",
        },
        directory: {
          type: "string",
          description: "Workspace directory (default: current)",
        },
      },
      required: ["assetId"],
    },
  },
  {
    name: "sync_governance_to_jira",
    description:
      "Sync AI governance status back to the linked Jira ticket. Updates Entity Properties with compliance status, risk level, and deployment info.",
    inputSchema: {
      type: "object",
      properties: {
        assetId: {
          type: "string",
          description: "Asset card ID (or 'all' for entire workspace)",
        },
        directory: {
          type: "string",
          description: "Workspace directory (default: current)",
        },
      },
      required: ["assetId"],
    },
  },
];

export async function executeGoldenThreadTools(
  name: string,
  args: Record<string, unknown>,
  services: Services,
  config: AIGRCConfig
): Promise<ToolResult | null> {
  switch (name) {
    case "link_business_intent": {
      const assetId = args.assetId as string;
      const ticketId = args.ticketId as string;
      const ticketSystem = args.ticketSystem as "jira" | "ado" | "github" | "gitlab" | undefined;
      const businessJustification = args.businessJustification as string | undefined;
      const riskTolerance = args.riskTolerance as "low" | "medium" | "high" | undefined;
      const directory = (args.directory as string) || config.workspace;

      try {
        // Verify asset exists
        const card = await services.cards.get(assetId, directory);
        if (!card) {
          return {
            content: [
              {
                type: "text",
                text: `## Golden Thread Error\n\n**Asset not found:** ${assetId}\n\nRun \`aigrc scan\` to detect AI assets or \`aigrc register\` to create one.`,
              },
            ],
            isError: true,
          };
        }

        // Check if already linked
        if (card.intent?.linked && card.intent?.ticketId) {
          const existingTicket = card.intent.ticketId;
          if (existingTicket !== ticketId) {
            return {
              content: [
                {
                  type: "text",
                  text: `## Golden Thread Warning\n\n**Asset already linked to:** ${existingTicket}\n\nTo relink to ${ticketId}, first unlink the existing connection.\n\n### Current Link\n- Ticket: ${existingTicket}\n- System: ${card.intent.ticketSystem || "jira"}\n- Linked: ${card.intent.importedAt || "unknown"}`,
                },
              ],
            };
          }
        }

        // Create the link
        const link = await services.goldenThread.link(assetId, ticketId, {
          ticketSystem,
          businessJustification,
          riskTolerance,
        });

        let output = `## Golden Thread Established ✅\n\n`;
        output += `**Asset:** ${card.name} (\`${assetId}\`)\n`;
        output += `**Ticket:** [${ticketId}](${link.ticketUrl || "#"})\n`;
        output += `**System:** ${link.ticketSystem.toUpperCase()}\n\n`;

        output += `### Link Details\n`;
        output += `- **Golden Thread ID:** \`${link.goldenThreadId}\`\n`;
        output += `- **Linked At:** ${new Date(link.linkedAt).toLocaleString()}\n`;
        output += `- **Integrity Hash:** \`${link.integrityHash.substring(0, 16)}...\`\n\n`;

        if (businessJustification) {
          output += `### Business Justification\n${businessJustification}\n\n`;
        }

        if (riskTolerance) {
          output += `**Approved Risk Tolerance:** ${riskTolerance.toUpperCase()}\n\n`;
        }

        output += `### Next Steps\n`;
        output += `1. Verify compliance: \`aigrc check-compliance ${assetId}\`\n`;
        output += `2. Generate artifacts: \`aigrc generate-artifacts ${assetId}\`\n`;
        output += `3. Sync to Jira: \`sync_governance_to_jira ${assetId}\`\n`;

        return {
          content: [{ type: "text", text: output }],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `## Golden Thread Error\n\n${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    }

    case "get_business_context": {
      const assetId = args.assetId as string;
      const directory = (args.directory as string) || config.workspace;

      const card = await services.cards.get(assetId, directory);
      if (!card) {
        return {
          content: [
            {
              type: "text",
              text: `Asset not found: ${assetId}`,
            },
          ],
          isError: true,
        };
      }

      if (!card.intent?.linked || !card.intent?.ticketId) {
        return {
          content: [
            {
              type: "text",
              text: `## Business Context: ${card.name}\n\n**Status:** No Golden Thread\n\nThis asset is not linked to a business ticket.\n\n### Establish Golden Thread\n\`\`\`\naigrc link ${assetId} PROJ-XXX\n\`\`\`\n\nOr use: \`link_business_intent\``,
            },
          ],
        };
      }

      const context = await services.goldenThread.getContext(assetId);
      if (!context) {
        return {
          content: [
            {
              type: "text",
              text: `## Business Context: ${card.name}\n\n**Status:** Unable to fetch context\n\n**Linked Ticket:** ${card.intent.ticketId}\n\nConfigure Jira API credentials to fetch ticket details.`,
            },
          ],
        };
      }

      // Get golden thread link info
      const links = await services.goldenThread.listLinks(directory);
      const link = links.find((l) => l.assetId === card.id);

      let output = `## Business Context: ${card.name}\n\n`;

      // Link status
      if (link) {
        output += `**Golden Thread:** ${formatLinkStatus(link.status)}\n\n`;
      }

      // Ticket info
      output += `### Linked Ticket\n`;
      output += `- **ID:** [${context.ticketId}](${context.ticketUrl})\n`;
      output += `- **Summary:** ${context.summary}\n`;
      output += `- **Status:** ${context.status}\n`;
      output += `- **Priority:** ${context.priority}\n`;
      if (context.assignee) {
        output += `- **Assignee:** ${context.assignee}\n`;
      }
      output += `\n`;

      // Description
      if (context.description) {
        output += `### Description\n${context.description.substring(0, 500)}${context.description.length > 500 ? "..." : ""}\n\n`;
      }

      // AI Governance from ticket
      if (context.aiGovernance) {
        output += `### AI Governance (from ticket)\n`;
        if (context.aiGovernance.riskTolerance) {
          output += `- **Risk Tolerance:** ${context.aiGovernance.riskTolerance}\n`;
        }
        if (context.aiGovernance.complianceStatus) {
          output += `- **Compliance Status:** ${context.aiGovernance.complianceStatus}\n`;
        }
        if (context.aiGovernance.approvalStatus) {
          output += `- **Approval Status:** ${context.aiGovernance.approvalStatus}\n`;
        }
        output += `\n`;
      }

      // Labels
      if (context.labels.length > 0) {
        output += `### Labels\n${context.labels.map((l) => `\`${l}\``).join(" ")}\n\n`;
      }

      // Asset compliance summary
      output += `### Asset Compliance\n`;
      output += `- **Risk Level:** ${card.classification.riskLevel.toUpperCase()}\n`;
      output += `- **Governance Status:** ${card.governance.status}\n`;
      const complianceStatuses = services.compliance.checkAllProfiles(card);
      if (complianceStatuses.length > 0) {
        const avgCompliance = Math.round(
          complianceStatuses.reduce((a, s) => a + s.percentage, 0) /
            complianceStatuses.length
        );
        output += `- **Compliance:** ${avgCompliance}%\n`;
      }

      return {
        content: [{ type: "text", text: output }],
      };
    }

    case "validate_golden_thread": {
      const assetId = args.assetId as string;
      const directory = (args.directory as string) || config.workspace;

      if (assetId === "all") {
        // Validate entire workspace
        const cards = await services.cards.list(directory);
        const results: Array<{
          assetId: string;
          name: string;
          valid: boolean;
          issues: number;
          status: string;
        }> = [];

        for (const card of cards) {
          const validation = await services.goldenThread.validate(card.id);
          results.push({
            assetId: card.id,
            name: card.name,
            valid: validation.valid,
            issues: validation.issues.length,
            status: validation.valid ? "✅" : validation.issues.some(i => i.severity === "error") ? "❌" : "⚠️",
          });
        }

        const valid = results.filter((r) => r.valid).length;
        const warnings = results.filter((r) => !r.valid && r.status === "⚠️").length;
        const errors = results.filter((r) => r.status === "❌").length;

        let output = `## Golden Thread Validation: Workspace\n\n`;
        output += `**Assets:** ${cards.length}\n`;
        output += `**Valid:** ${valid}\n`;
        output += `**Warnings:** ${warnings}\n`;
        output += `**Errors:** ${errors}\n\n`;

        output += `### Summary\n`;
        output += `| Asset | Status | Issues |\n`;
        output += `|-------|--------|--------|\n`;
        for (const result of results) {
          output += `| ${result.name} | ${result.status} | ${result.issues} |\n`;
        }

        if (errors > 0) {
          output += `\n### Action Required\n`;
          output += `${errors} asset(s) have broken or missing Golden Threads.\n`;
          output += `Run \`validate_golden_thread <assetId>\` for details.\n`;
        }

        return {
          content: [{ type: "text", text: output }],
        };
      }

      // Validate single asset
      const validation = await services.goldenThread.validate(assetId);
      const card = await services.cards.get(assetId, directory);

      let output = `## Golden Thread Validation: ${card?.name || assetId}\n\n`;
      output += `**Status:** ${validation.valid ? "✅ Valid" : "❌ Invalid"}\n`;
      output += `**Integrity Hash:** \`${validation.integrityHash.substring(0, 16)}...\`\n\n`;

      if (validation.issues.length === 0) {
        output += `### Result\nNo issues found. Golden Thread is intact.\n`;
      } else {
        output += `### Issues (${validation.issues.length})\n\n`;

        const errors = validation.issues.filter((i) => i.severity === "error");
        const warnings = validation.issues.filter((i) => i.severity === "warning");

        if (errors.length > 0) {
          output += `#### Errors\n`;
          for (const issue of errors) {
            output += `- **${issue.code}:** ${issue.message}\n`;
            if (issue.suggestion) {
              output += `  - *Fix:* ${issue.suggestion}\n`;
            }
          }
          output += `\n`;
        }

        if (warnings.length > 0) {
          output += `#### Warnings\n`;
          for (const issue of warnings) {
            output += `- **${issue.code}:** ${issue.message}\n`;
            if (issue.suggestion) {
              output += `  - *Fix:* ${issue.suggestion}\n`;
            }
          }
        }
      }

      return {
        content: [{ type: "text", text: output }],
      };
    }

    case "sync_governance_to_jira": {
      const assetId = args.assetId as string;
      const directory = (args.directory as string) || config.workspace;

      const syncOne = async (id: string, card: any) => {
        const complianceStatuses = services.compliance.checkAllProfiles(card);
        const avgCompliance =
          complianceStatuses.length > 0
            ? Math.round(
                complianceStatuses.reduce((a, s) => a + s.percentage, 0) /
                  complianceStatuses.length
              )
            : 0;

        const status = {
          compliancePercentage: avgCompliance,
          riskLevel: card.classification.riskLevel,
          deploymentStatus: card.governance.status,
          lastAssessment: new Date().toISOString(),
        };

        const success = await services.goldenThread.syncToTicket(id, status);
        return { id, card, status, success };
      };

      if (assetId === "all") {
        const cards = await services.cards.list(directory);
        const linkedCards = cards.filter((c) => c.intent?.linked && c.intent?.ticketId);

        if (linkedCards.length === 0) {
          return {
            content: [
              {
                type: "text",
                text: `## Sync to Jira\n\nNo assets with Golden Thread links found.`,
              },
            ],
          };
        }

        const results: Array<{ name: string; ticketId: string; success: boolean }> = [];
        for (const card of linkedCards) {
          try {
            const result = await syncOne(card.id, card);
            results.push({
              name: card.name,
              ticketId: card.intent!.ticketId!,
              success: result.success,
            });
          } catch {
            results.push({
              name: card.name,
              ticketId: card.intent!.ticketId!,
              success: false,
            });
          }
        }

        const synced = results.filter((r) => r.success).length;

        let output = `## Sync to Jira: Workspace\n\n`;
        output += `**Assets Synced:** ${synced}/${results.length}\n\n`;

        output += `### Results\n`;
        output += `| Asset | Ticket | Status |\n`;
        output += `|-------|--------|--------|\n`;
        for (const result of results) {
          output += `| ${result.name} | ${result.ticketId} | ${result.success ? "✅" : "❌"} |\n`;
        }

        if (synced < results.length) {
          output += `\n### Notes\n`;
          output += `Some syncs failed. Ensure Jira API is configured:\n`;
          output += `- \`AIGRC_JIRA_API_URL\`: Jira REST API URL\n`;
          output += `- \`AIGRC_JIRA_API_TOKEN\`: Jira API token\n`;
        }

        return {
          content: [{ type: "text", text: output }],
        };
      }

      // Sync single asset
      const card = await services.cards.get(assetId, directory);
      if (!card) {
        return {
          content: [
            {
              type: "text",
              text: `Asset not found: ${assetId}`,
            },
          ],
          isError: true,
        };
      }

      if (!card.intent?.linked || !card.intent?.ticketId) {
        return {
          content: [
            {
              type: "text",
              text: `## Sync to Jira\n\n**Error:** Asset has no Golden Thread link.\n\nFirst establish a link:\n\`\`\`\naigrc link ${assetId} PROJ-XXX\n\`\`\``,
            },
          ],
          isError: true,
        };
      }

      try {
        const result = await syncOne(card.id, card);

        let output = `## Sync to Jira: ${card.name}\n\n`;

        if (result.success) {
          output += `**Status:** ✅ Synced successfully\n\n`;
          output += `### Synced Data\n`;
          output += `- **Ticket:** ${card.intent.ticketId}\n`;
          output += `- **Compliance:** ${result.status.compliancePercentage}%\n`;
          output += `- **Risk Level:** ${result.status.riskLevel}\n`;
          output += `- **Deployment Status:** ${result.status.deploymentStatus}\n`;
          output += `- **Synced At:** ${new Date().toLocaleString()}\n`;
        } else {
          output += `**Status:** ⚠️ Sync not configured\n\n`;
          output += `Jira API credentials not configured. Would have synced:\n\n`;
          output += `\`\`\`json\n${JSON.stringify(result.status, null, 2)}\n\`\`\`\n\n`;
          output += `### Configure Jira API\n`;
          output += `Set these environment variables:\n`;
          output += `- \`AIGRC_JIRA_API_URL\`: Your Jira REST API URL\n`;
          output += `- \`AIGRC_JIRA_API_TOKEN\`: Your Jira API token\n`;
        }

        return {
          content: [{ type: "text", text: output }],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `## Sync Error\n\n${error instanceof Error ? error.message : String(error)}`,
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

// Helper function
function formatLinkStatus(status: string): string {
  switch (status) {
    case "valid":
      return "✅ Valid";
    case "stale":
      return "⚠️ Stale";
    case "broken":
      return "❌ Broken";
    case "pending_approval":
      return "⏳ Pending Approval";
    default:
      return status;
  }
}
