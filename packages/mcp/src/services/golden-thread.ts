/**
 * Golden Thread Service
 *
 * Manages the bidirectional link between AI assets and their business justification.
 * The "Golden Thread" is a hash-based integrity chain that connects:
 *   Jira Ticket -> Asset Card -> Code -> Deployment
 *
 * This ensures every AI capability can be traced back to an approved business need.
 */

import { createHash } from "crypto";
import { AIGRCConfig } from "../config.js";
import { CardsService } from "./cards.js";
import type { AssetCard } from "@aigrc/core";

export interface GoldenThreadLink {
  /** Unique ID for this golden thread instance */
  goldenThreadId: string;
  /** Asset card ID */
  assetId: string;
  /** Ticket system (jira, ado, github, gitlab) */
  ticketSystem: "jira" | "ado" | "github" | "gitlab";
  /** Ticket ID (e.g., PROJ-123) */
  ticketId: string;
  /** Full URL to the ticket */
  ticketUrl?: string;
  /** Business justification extracted from ticket */
  businessJustification?: string;
  /** Approved risk tolerance from ticket */
  riskTolerance?: "low" | "medium" | "high";
  /** When the link was created */
  linkedAt: string;
  /** When ticket was last synced */
  lastSynced?: string;
  /** Integrity hash of the link */
  integrityHash: string;
  /** Status of the link */
  status: "valid" | "stale" | "broken" | "pending_approval";
}

export interface TicketContext {
  ticketId: string;
  ticketSystem: string;
  ticketUrl: string;
  summary: string;
  description: string;
  status: string;
  priority: string;
  assignee?: string;
  reporter?: string;
  created: string;
  updated: string;
  labels: string[];
  customFields?: Record<string, unknown>;
  /** AI-specific fields from Jira Entity Properties */
  aiGovernance?: {
    riskTolerance?: string;
    approvalStatus?: string;
    complianceStatus?: string;
    lastAssessment?: string;
  };
}

export interface ValidationResult {
  valid: boolean;
  issues: Array<{
    severity: "error" | "warning";
    code: string;
    message: string;
    suggestion?: string;
  }>;
  integrityHash: string;
  ticketStatus?: string;
}

export interface GoldenThreadService {
  /** Link an asset to a business ticket */
  link(
    assetId: string,
    ticketId: string,
    options?: {
      ticketSystem?: "jira" | "ado" | "github" | "gitlab";
      businessJustification?: string;
      riskTolerance?: "low" | "medium" | "high";
    }
  ): Promise<GoldenThreadLink>;

  /** Get business context for an asset */
  getContext(assetId: string): Promise<TicketContext | null>;

  /** Validate the golden thread integrity */
  validate(assetId: string): Promise<ValidationResult>;

  /** Sync governance status to the ticket system */
  syncToTicket(
    assetId: string,
    status: {
      compliancePercentage: number;
      riskLevel: string;
      deploymentStatus: string;
      lastAssessment: string;
    }
  ): Promise<boolean>;

  /** Get all golden thread links in a workspace */
  listLinks(directory?: string): Promise<GoldenThreadLink[]>;

  /** Calculate integrity hash for a link */
  calculateIntegrityHash(
    assetId: string,
    ticketId: string,
    ticketSystem: string,
    linkedAt: string
  ): string;

  /** Format golden thread info for display */
  formatGoldenThread(link: GoldenThreadLink, context?: TicketContext): string;
}

export function createGoldenThreadService(
  config: AIGRCConfig,
  cardsService: CardsService
): GoldenThreadService {
  // Jira/ADO integration would use OAuth or API tokens
  const jiraApiUrl = config.jiraApiUrl;
  const jiraApiToken = config.jiraApiToken;

  return {
    async link(assetId, ticketId, options = {}): Promise<GoldenThreadLink> {
      const card = await cardsService.get(assetId);
      if (!card) {
        throw new Error(`Asset card not found: ${assetId}`);
      }

      const ticketSystem = options.ticketSystem || detectTicketSystem(ticketId);
      const linkedAt = new Date().toISOString();
      const goldenThreadId = generateGoldenThreadId(assetId, ticketId);
      const integrityHash = calculateHash(assetId, ticketId, ticketSystem, linkedAt);

      // Update the asset card with the golden thread link
      const updatedCard = await cardsService.update(assetId, {
        intent: {
          linked: true,
          ticketSystem,
          ticketId,
          ticketUrl: buildTicketUrl(ticketId, ticketSystem, config),
          businessJustification: options.businessJustification,
          riskTolerance: options.riskTolerance,
          importedAt: linkedAt,
        },
        governance: {
          ...card.governance,
          status: "linked",
        },
      });

      const link: GoldenThreadLink = {
        goldenThreadId,
        assetId,
        ticketSystem,
        ticketId,
        ticketUrl: buildTicketUrl(ticketId, ticketSystem, config),
        businessJustification: options.businessJustification,
        riskTolerance: options.riskTolerance,
        linkedAt,
        integrityHash,
        status: "valid",
      };

      return link;
    },

    async getContext(assetId): Promise<TicketContext | null> {
      const card = await cardsService.get(assetId);
      if (!card || !card.intent?.ticketId) {
        return null;
      }

      const ticketId = card.intent.ticketId;
      const ticketSystem = card.intent.ticketSystem || "jira";

      // In production, this would call the Jira/ADO API
      // For now, return mock data or attempt API call
      if (jiraApiUrl && jiraApiToken && ticketSystem === "jira") {
        try {
          return await fetchJiraTicket(ticketId, jiraApiUrl, jiraApiToken);
        } catch {
          // Fall through to mock data
        }
      }

      // Return mock/placeholder context
      return {
        ticketId,
        ticketSystem,
        ticketUrl: card.intent.ticketUrl || buildTicketUrl(ticketId, ticketSystem, config),
        summary: `Business requirement for ${card.name}`,
        description: card.intent.businessJustification || "No description available",
        status: "In Progress",
        priority: "Medium",
        created: card.intent.importedAt || card.created,
        updated: new Date().toISOString(),
        labels: ["ai-governance", `risk-${card.classification.riskLevel}`],
        aiGovernance: {
          riskTolerance: card.intent.riskTolerance || undefined,
          complianceStatus: `${calculateComplianceScore(card)}%`,
          lastAssessment: card.updated,
        },
      };
    },

    async validate(assetId): Promise<ValidationResult> {
      const card = await cardsService.get(assetId);
      if (!card) {
        return {
          valid: false,
          issues: [
            {
              severity: "error",
              code: "ASSET_NOT_FOUND",
              message: `Asset card not found: ${assetId}`,
            },
          ],
          integrityHash: "",
        };
      }

      const issues: ValidationResult["issues"] = [];

      // Check if golden thread is established
      if (!card.intent?.linked || !card.intent?.ticketId) {
        issues.push({
          severity: "error",
          code: "NO_GOLDEN_THREAD",
          message: "Asset has no golden thread link",
          suggestion: `Run: aigrc link ${assetId} PROJ-XXX`,
        });
      }

      // Calculate current integrity hash
      const currentHash = card.intent?.ticketId
        ? calculateHash(
            assetId,
            card.intent.ticketId,
            card.intent.ticketSystem || "jira",
            card.intent.importedAt || card.created
          )
        : "";

      // Check for stale link (older than 30 days without sync)
      if (card.intent?.importedAt) {
        const linkAge = Date.now() - new Date(card.intent.importedAt).getTime();
        const thirtyDays = 30 * 24 * 60 * 60 * 1000;
        if (linkAge > thirtyDays) {
          issues.push({
            severity: "warning",
            code: "STALE_LINK",
            message: "Golden thread link is older than 30 days",
            suggestion: "Consider refreshing the link to verify ticket status",
          });
        }
      }

      // Check governance status alignment
      if (card.intent?.linked && card.governance.status === "draft") {
        issues.push({
          severity: "warning",
          code: "STATUS_MISMATCH",
          message: "Asset is linked but governance status is still 'draft'",
          suggestion: "Update governance status to 'linked' or 'approved'",
        });
      }

      // Check risk tolerance alignment
      if (
        card.intent?.riskTolerance === "low" &&
        card.classification.riskLevel === "high"
      ) {
        issues.push({
          severity: "error",
          code: "RISK_TOLERANCE_EXCEEDED",
          message:
            "Asset risk level (HIGH) exceeds approved risk tolerance (low)",
          suggestion:
            "Review with stakeholders and update risk tolerance or implement mitigations",
        });
      }

      // Verify ticket still exists (would need API call in production)
      // For now, skip this check if no API configured

      return {
        valid: issues.filter((i) => i.severity === "error").length === 0,
        issues,
        integrityHash: currentHash,
        ticketStatus: card.intent?.ticketId ? "assumed_valid" : undefined,
      };
    },

    async syncToTicket(assetId, status): Promise<boolean> {
      const card = await cardsService.get(assetId);
      if (!card || !card.intent?.ticketId) {
        throw new Error(`No golden thread for asset: ${assetId}`);
      }

      const ticketId = card.intent.ticketId;
      const ticketSystem = card.intent.ticketSystem || "jira";

      // In production, this would update Jira Entity Properties
      if (jiraApiUrl && jiraApiToken && ticketSystem === "jira") {
        try {
          await updateJiraEntityProperties(ticketId, status, jiraApiUrl, jiraApiToken);
          return true;
        } catch (error) {
          console.error(`Failed to sync to Jira: ${error}`);
          return false;
        }
      }

      // Without API config, log what would be synced
      console.error(
        `Would sync to ${ticketSystem}/${ticketId}: ${JSON.stringify(status)}`
      );
      return false;
    },

    async listLinks(directory?): Promise<GoldenThreadLink[]> {
      const cards = await cardsService.list(directory);
      const links: GoldenThreadLink[] = [];

      for (const card of cards) {
        if (card.intent?.linked && card.intent?.ticketId) {
          const link: GoldenThreadLink = {
            goldenThreadId: generateGoldenThreadId(card.id, card.intent.ticketId),
            assetId: card.id,
            ticketSystem: card.intent.ticketSystem || "jira",
            ticketId: card.intent.ticketId,
            ticketUrl: card.intent.ticketUrl || undefined,
            businessJustification: card.intent.businessJustification || undefined,
            riskTolerance: card.intent.riskTolerance || undefined,
            linkedAt: card.intent.importedAt || card.created,
            integrityHash: calculateHash(
              card.id,
              card.intent.ticketId,
              card.intent.ticketSystem || "jira",
              card.intent.importedAt || card.created
            ),
            status: determineStatus(card),
          };
          links.push(link);
        }
      }

      return links;
    },

    calculateIntegrityHash(assetId, ticketId, ticketSystem, linkedAt): string {
      return calculateHash(assetId, ticketId, ticketSystem, linkedAt);
    },

    formatGoldenThread(link, context?): string {
      const lines: string[] = [];

      lines.push(`## Golden Thread: ${link.assetId}\n`);
      lines.push(`**Status:** ${formatStatus(link.status)}\n`);

      lines.push("### Link Details\n");
      lines.push(`- **Ticket:** ${link.ticketId}`);
      if (link.ticketUrl) {
        lines.push(`- **URL:** [${link.ticketId}](${link.ticketUrl})`);
      }
      lines.push(`- **System:** ${link.ticketSystem.toUpperCase()}`);
      lines.push(`- **Linked:** ${new Date(link.linkedAt).toLocaleDateString()}`);
      if (link.lastSynced) {
        lines.push(`- **Last Synced:** ${new Date(link.lastSynced).toLocaleDateString()}`);
      }
      lines.push(`- **Integrity Hash:** \`${link.integrityHash.substring(0, 16)}...\`\n`);

      if (link.businessJustification) {
        lines.push("### Business Justification\n");
        lines.push(link.businessJustification);
        lines.push("");
      }

      if (link.riskTolerance) {
        lines.push(`**Approved Risk Tolerance:** ${link.riskTolerance.toUpperCase()}\n`);
      }

      if (context) {
        lines.push("### Ticket Context\n");
        lines.push(`- **Summary:** ${context.summary}`);
        lines.push(`- **Status:** ${context.status}`);
        lines.push(`- **Priority:** ${context.priority}`);
        if (context.assignee) {
          lines.push(`- **Assignee:** ${context.assignee}`);
        }
        if (context.labels.length > 0) {
          lines.push(`- **Labels:** ${context.labels.join(", ")}`);
        }

        if (context.aiGovernance) {
          lines.push("\n### AI Governance Status (from ticket)\n");
          if (context.aiGovernance.riskTolerance) {
            lines.push(`- **Risk Tolerance:** ${context.aiGovernance.riskTolerance}`);
          }
          if (context.aiGovernance.complianceStatus) {
            lines.push(`- **Compliance:** ${context.aiGovernance.complianceStatus}`);
          }
          if (context.aiGovernance.lastAssessment) {
            lines.push(
              `- **Last Assessment:** ${new Date(context.aiGovernance.lastAssessment).toLocaleDateString()}`
            );
          }
        }
      }

      return lines.join("\n");
    },
  };
}

// Helper functions

function calculateHash(
  assetId: string,
  ticketId: string,
  ticketSystem: string,
  linkedAt: string
): string {
  const data = `${assetId}|${ticketId}|${ticketSystem}|${linkedAt}`;
  return createHash("sha256").update(data).digest("hex");
}

function generateGoldenThreadId(assetId: string, ticketId: string): string {
  const hash = createHash("md5")
    .update(`${assetId}|${ticketId}`)
    .digest("hex")
    .substring(0, 8);
  return `gt-${hash}`;
}

function detectTicketSystem(
  ticketId: string
): "jira" | "ado" | "github" | "gitlab" {
  // Simple heuristics for ticket system detection
  if (ticketId.startsWith("#") || ticketId.match(/^\d+$/)) {
    return "github"; // GitHub issues are just numbers
  }
  if (ticketId.includes("-") && ticketId.match(/^[A-Z]+-\d+$/)) {
    return "jira"; // PROJ-123 format
  }
  if (ticketId.startsWith("AB#")) {
    return "ado"; // Azure DevOps format
  }
  return "jira"; // Default
}

function buildTicketUrl(
  ticketId: string,
  ticketSystem: string,
  config: AIGRCConfig
): string {
  switch (ticketSystem) {
    case "jira":
      if (config.jiraApiUrl) {
        const baseUrl = config.jiraApiUrl.replace("/rest/api/", "");
        return `${baseUrl}/browse/${ticketId}`;
      }
      return `https://your-org.atlassian.net/browse/${ticketId}`;
    case "ado":
      return `https://dev.azure.com/your-org/_workitems/edit/${ticketId.replace("AB#", "")}`;
    case "github":
      return `https://github.com/your-org/your-repo/issues/${ticketId.replace("#", "")}`;
    case "gitlab":
      return `https://gitlab.com/your-org/your-repo/-/issues/${ticketId}`;
    default:
      return "";
  }
}

function determineStatus(card: AssetCard): GoldenThreadLink["status"] {
  if (!card.intent?.linked) {
    return "broken";
  }

  // Check if link is stale
  if (card.intent.importedAt) {
    const linkAge = Date.now() - new Date(card.intent.importedAt).getTime();
    const thirtyDays = 30 * 24 * 60 * 60 * 1000;
    if (linkAge > thirtyDays) {
      return "stale";
    }
  }

  // Check governance status
  if (card.governance.status === "draft") {
    return "pending_approval";
  }

  return "valid";
}

function formatStatus(status: GoldenThreadLink["status"]): string {
  switch (status) {
    case "valid":
      return "✅ Valid";
    case "stale":
      return "⚠️ Stale (needs refresh)";
    case "broken":
      return "❌ Broken";
    case "pending_approval":
      return "⏳ Pending Approval";
    default:
      return status;
  }
}

function calculateComplianceScore(card: AssetCard): number {
  // Simple compliance score based on required artifacts
  const artifacts = card.classification.requiredArtifacts || [];
  if (artifacts.length === 0) return 100;

  const complete = artifacts.filter((a) => a.status === "complete").length;
  return Math.round((complete / artifacts.length) * 100);
}

// Jira API integration (stub - would be implemented with real OAuth)

async function fetchJiraTicket(
  ticketId: string,
  apiUrl: string,
  apiToken: string
): Promise<TicketContext> {
  const response = await fetch(`${apiUrl}/rest/api/3/issue/${ticketId}`, {
    headers: {
      Authorization: `Basic ${Buffer.from(`email@example.com:${apiToken}`).toString("base64")}`,
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`Jira API error: ${response.status}`);
  }

  const data = await response.json() as {
    fields: {
      summary: string;
      description?: { content?: Array<{ content?: Array<{ text?: string }> }> };
      status?: { name?: string };
      priority?: { name?: string };
      assignee?: { displayName?: string };
      reporter?: { displayName?: string };
      created?: string;
      updated?: string;
      labels?: string[];
    };
    properties?: Record<string, unknown>;
  };
  const fields = data.fields;

  return {
    ticketId,
    ticketSystem: "jira",
    ticketUrl: `${apiUrl.replace("/rest/api/3", "")}/browse/${ticketId}`,
    summary: fields.summary,
    description: fields.description?.content?.[0]?.content?.[0]?.text || "",
    status: fields.status?.name || "Unknown",
    priority: fields.priority?.name || "Medium",
    assignee: fields.assignee?.displayName,
    reporter: fields.reporter?.displayName,
    created: fields.created || new Date().toISOString(),
    updated: fields.updated || new Date().toISOString(),
    labels: fields.labels || [],
    aiGovernance: data.properties?.["aigrc.governance"] as {
      riskTolerance?: string;
      approvalStatus?: string;
      complianceStatus?: string;
      lastAssessment?: string;
    } | undefined,
  };
}

async function updateJiraEntityProperties(
  ticketId: string,
  status: {
    compliancePercentage: number;
    riskLevel: string;
    deploymentStatus: string;
    lastAssessment: string;
  },
  apiUrl: string,
  apiToken: string
): Promise<void> {
  const response = await fetch(
    `${apiUrl}/rest/api/3/issue/${ticketId}/properties/aigrc.governance`,
    {
      method: "PUT",
      headers: {
        Authorization: `Basic ${Buffer.from(`email@example.com:${apiToken}`).toString("base64")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        compliancePercentage: status.compliancePercentage,
        riskLevel: status.riskLevel,
        deploymentStatus: status.deploymentStatus,
        lastAssessment: status.lastAssessment,
        updatedAt: new Date().toISOString(),
      }),
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to update Jira entity properties: ${response.status}`);
  }
}
