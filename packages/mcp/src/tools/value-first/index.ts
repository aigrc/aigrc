/**
 * Value-First Tools
 *
 * Tools that lead with developer value; governance is the byproduct.
 * These are the primary interface for developers - compliance happens invisibly.
 */

import { AIGRCConfig } from "../../config.js";
import { Services } from "../../services/index.js";
import { ToolDefinition, ToolResult } from "../index.js";
import type { AssetCard } from "@aigrc/core";

export const valueFirstTools: ToolDefinition[] = [
  {
    name: "get_deployment_readiness",
    description:
      "Check if an AI asset is ready for deployment. Returns a clear GO/NO-GO with any blocking issues and warnings. This is the primary tool for developers asking 'Am I ready to deploy?'",
    inputSchema: {
      type: "object",
      properties: {
        assetId: {
          type: "string",
          description: "Asset to check (or 'all' for entire workspace)",
        },
        targetEnvironment: {
          type: "string",
          enum: ["development", "staging", "production"],
          description: "Target deployment environment (default: production)",
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
    name: "get_blockers",
    description:
      "Identify what's blocking a PR or deployment. Returns prioritized list of issues with fix commands and time estimates.",
    inputSchema: {
      type: "object",
      properties: {
        directory: {
          type: "string",
          description: "Workspace directory (default: current)",
        },
        context: {
          type: "string",
          enum: ["pr", "deployment", "audit"],
          description: "What are we trying to unblock? (default: pr)",
        },
      },
    },
  },
  {
    name: "estimate_api_costs",
    description:
      "Estimate API costs for AI operations. Detects model from code and projects monthly costs based on usage patterns.",
    inputSchema: {
      type: "object",
      properties: {
        assetId: {
          type: "string",
          description: "Asset to estimate costs for",
        },
        usage: {
          type: "object",
          properties: {
            requestsPerDay: { type: "number" },
            avgInputTokens: { type: "number" },
            avgOutputTokens: { type: "number" },
          },
          description: "Expected usage (optional - will use defaults if not provided)",
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
    name: "check_security_risks",
    description:
      "Check for security risks in AI implementation. Includes red team findings if available.",
    inputSchema: {
      type: "object",
      properties: {
        assetId: {
          type: "string",
          description: "Asset to check",
        },
        includeRedTeam: {
          type: "boolean",
          description: "Include red team findings if available (default: true)",
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

// Model pricing (per 1M tokens) - approximate as of Dec 2025
const MODEL_PRICING: Record<string, { input: number; output: number }> = {
  "gpt-4o": { input: 2.5, output: 10 },
  "gpt-4o-mini": { input: 0.15, output: 0.6 },
  "gpt-4-turbo": { input: 10, output: 30 },
  "gpt-3.5-turbo": { input: 0.5, output: 1.5 },
  "claude-3-5-sonnet": { input: 3, output: 15 },
  "claude-3-5-haiku": { input: 0.25, output: 1.25 },
  "claude-3-opus": { input: 15, output: 75 },
  "gemini-1.5-pro": { input: 1.25, output: 5 },
  "gemini-1.5-flash": { input: 0.075, output: 0.3 },
};

export async function executeValueFirstTools(
  name: string,
  args: Record<string, unknown>,
  services: Services,
  config: AIGRCConfig
): Promise<ToolResult | null> {
  switch (name) {
    case "get_deployment_readiness": {
      const assetId = args.assetId as string;
      const targetEnvironment = (args.targetEnvironment as string) || "production";
      const directory = (args.directory as string) || config.workspace;

      // Check if asking for all assets
      if (assetId === "all") {
        const cards = await services.cards.list(directory);
        if (cards.length === 0) {
          return {
            content: [
              {
                type: "text",
                text: "## Deployment Readiness: Workspace\n\n**Status: NO AI ASSETS FOUND**\n\nNo registered AI assets found in this workspace.\n\n### Next Steps\n1. Run `aigrc scan` to detect AI frameworks\n2. Run `aigrc init` to register detected assets",
              },
            ],
          };
        }

        let allReady = true;
        let hasWarnings = false;
        const assetStatuses: string[] = [];

        for (const card of cards) {
          const status = await getAssetReadiness(card, targetEnvironment, services, config);
          if (!status.ready) allReady = false;
          if (status.warnings.length > 0) hasWarnings = true;
          assetStatuses.push(
            `| ${card.name} | ${status.ready ? "✅" : "❌"} | ${status.blockers.length} | ${status.warnings.length} |`
          );
        }

        const overallStatus = allReady
          ? hasWarnings
            ? "READY WITH WARNINGS ✅⚠️"
            : "READY ✅"
          : "NOT READY ❌";

        return {
          content: [
            {
              type: "text",
              text: `## Deployment Readiness: Workspace\n\n**Status: ${overallStatus}**\n**Environment:** ${targetEnvironment}\n**Assets:** ${cards.length}\n\n### Asset Summary\n| Asset | Ready | Blockers | Warnings |\n|-------|-------|----------|----------|\n${assetStatuses.join("\n")}\n\nUse \`get_deployment_readiness\` with a specific asset ID for details.`,
            },
          ],
        };
      }

      // Single asset check
      const card = await services.cards.get(assetId, directory);
      if (!card) {
        return {
          content: [
            {
              type: "text",
              text: `## Deployment Readiness: ${assetId}\n\n**Status: ASSET NOT FOUND** ❌\n\nNo asset card found with ID: ${assetId}\n\n### Next Steps\n1. Run \`aigrc scan\` to detect AI frameworks\n2. Run \`aigrc register\` to create an asset card`,
            },
          ],
          isError: true,
        };
      }

      const status = await getAssetReadiness(card, targetEnvironment, services, config);
      return {
        content: [{ type: "text", text: status.formatted }],
      };
    }

    case "get_blockers": {
      const directory = (args.directory as string) || config.workspace;
      const context = (args.context as string) || "pr";

      const cards = await services.cards.list(directory);
      const scanResult = await services.scanner.scan(directory);

      const blockers: Array<{
        severity: "blocking" | "warning";
        issue: string;
        asset?: string;
        file?: string;
        fix: string;
        time: string;
        autoFixable: boolean;
      }> = [];

      // Check for unregistered AI
      for (const detection of scanResult.detections) {
        if (detection.confidence === "high") {
          const isRegistered = cards.some(
            (c) =>
              (c.technical.framework?.toLowerCase() || "") === detection.framework.toLowerCase() ||
              c.name.toLowerCase().includes(detection.framework.toLowerCase())
          );
          if (!isRegistered) {
            blockers.push({
              severity: "blocking",
              issue: "Unregistered AI Detected",
              file: detection.filePath,
              fix: `aigrc register --file ${detection.filePath}`,
              time: "~5 min",
              autoFixable: true,
            });
          }
        }
      }

      // Check each asset
      for (const card of cards) {
        // Check for missing Golden Thread (intent.linked and intent.ticketId)
        if (!card.intent?.ticketId) {
          blockers.push({
            severity: context === "audit" ? "blocking" : "warning",
            issue: "Missing Golden Thread",
            asset: card.name,
            fix: `aigrc link ${card.name} PROJ-XXXX`,
            time: "~2 min",
            autoFixable: false,
          });
        }

        // Check compliance
        const complianceStatuses = services.compliance.checkAllProfiles(card);
        for (const status of complianceStatuses) {
          if (status.percentage < 80) {
            blockers.push({
              severity: context === "production" ? "blocking" : "warning",
              issue: `Compliance below 80% (${status.profileName})`,
              asset: card.name,
              fix: `aigrc generate-artifacts --asset ${card.name}`,
              time: "~10 min",
              autoFixable: true,
            });
          }
        }

        // Check for high-risk without documentation
        if (card.classification?.riskLevel === "high") {
          const hasImpactAssessment = card.classification?.requiredArtifacts?.some(
            (a) => a.type === "ai_impact_assessment" && a.status === "complete"
          );
          if (!hasImpactAssessment) {
            blockers.push({
              severity: "blocking",
              issue: "HIGH risk asset missing Impact Assessment",
              asset: card.name,
              fix: `aigrc generate-artifact --asset ${card.name} --type ai_impact_assessment`,
              time: "~15 min",
              autoFixable: true,
            });
          }
        }
      }

      // Sort by severity
      const blocking = blockers.filter((b) => b.severity === "blocking");
      const warnings = blockers.filter((b) => b.severity === "warning");

      const contextLabel = context === "pr" ? "PR" : context === "deployment" ? "Deployment" : "Audit";

      if (blocking.length === 0 && warnings.length === 0) {
        return {
          content: [
            {
              type: "text",
              text: `## ${contextLabel} Blockers\n\n### ✅ No Blockers Found\n\nYour ${context} is ready to proceed!\n\n**Assets Checked:** ${cards.length}\n**AI Detections:** ${scanResult.detections.length}`,
            },
          ],
        };
      }

      let output = `## ${contextLabel} Blockers\n\n`;

      if (blocking.length > 0) {
        output += `### 🚫 Blocking Issues (${blocking.length})\n\n`;
        blocking.forEach((b, i) => {
          output += `${i + 1}. **${b.issue}**${b.asset ? ` - \`${b.asset}\`` : ""}${b.file ? ` - \`${b.file}\`` : ""}\n`;
          output += `   - Fix: \`${b.fix}\`\n`;
          output += `   - Time: ${b.time}${b.autoFixable ? " (auto-fixable)" : ""}\n\n`;
        });
      }

      if (warnings.length > 0) {
        output += `### ⚠️ Warnings (${warnings.length})\n\n`;
        warnings.forEach((w, i) => {
          output += `${i + 1}. **${w.issue}**${w.asset ? ` - \`${w.asset}\`` : ""}\n`;
          output += `   - Fix: \`${w.fix}\`\n`;
        });
        output += "\n";
      }

      // Calculate total time
      const totalMinutes = blockers
        .filter((b) => b.severity === "blocking")
        .reduce((acc, b) => {
          const match = b.time.match(/~?(\d+)/);
          return acc + (match ? parseInt(match[1]) : 5);
        }, 0);

      output += `### Estimated Time to Clear: ~${totalMinutes} minutes`;

      return {
        content: [{ type: "text", text: output }],
      };
    }

    case "estimate_api_costs": {
      const assetId = args.assetId as string;
      const usage = args.usage as {
        requestsPerDay?: number;
        avgInputTokens?: number;
        avgOutputTokens?: number;
      } | undefined;
      const directory = (args.directory as string) || config.workspace;

      const card = await services.cards.get(assetId, directory);
      if (!card) {
        return {
          content: [
            {
              type: "text",
              text: `Asset card not found: ${assetId}`,
            },
          ],
          isError: true,
        };
      }

      // Detect model from card framework
      const modelName = detectModelFromFramework(card.technical.framework || "openai");
      const pricing = MODEL_PRICING[modelName] || MODEL_PRICING["gpt-4o"];

      // Use provided usage or defaults
      const requestsPerDay = usage?.requestsPerDay || 1000;
      const avgInputTokens = usage?.avgInputTokens || 500;
      const avgOutputTokens = usage?.avgOutputTokens || 100;

      // Calculate monthly costs
      const monthlyRequests = requestsPerDay * 30;
      const monthlyInputTokens = monthlyRequests * avgInputTokens;
      const monthlyOutputTokens = monthlyRequests * avgOutputTokens;

      const inputCost = (monthlyInputTokens / 1_000_000) * pricing.input;
      const outputCost = (monthlyOutputTokens / 1_000_000) * pricing.output;
      const totalCost = inputCost + outputCost;

      // Find cheaper alternatives
      const alternatives: Array<{ model: string; savings: string }> = [];
      for (const [model, price] of Object.entries(MODEL_PRICING)) {
        if (model !== modelName) {
          const altInputCost = (monthlyInputTokens / 1_000_000) * price.input;
          const altOutputCost = (monthlyOutputTokens / 1_000_000) * price.output;
          const altTotal = altInputCost + altOutputCost;
          if (altTotal < totalCost * 0.7) {
            const savings = Math.round((1 - altTotal / totalCost) * 100);
            alternatives.push({ model, savings: `-${savings}%` });
          }
        }
      }

      alternatives.sort((a, b) => parseInt(b.savings) - parseInt(a.savings));

      let output = `## Cost Estimate: ${card.name}\n\n`;
      output += `**Model:** ${modelName} (detected from framework: ${card.technical.framework || "unknown"})\n\n`;
      output += `### Monthly Projection\n`;
      output += `| Metric | Value |\n`;
      output += `|--------|-------|\n`;
      output += `| Requests | ${monthlyRequests.toLocaleString()} |\n`;
      output += `| Input Tokens | ${(monthlyInputTokens / 1_000_000).toFixed(1)}M |\n`;
      output += `| Output Tokens | ${(monthlyOutputTokens / 1_000_000).toFixed(1)}M |\n`;
      output += `| **Estimated Cost** | **$${totalCost.toFixed(2)}/month** |\n\n`;

      if (alternatives.length > 0) {
        output += `### Cost Optimization Tips\n`;
        alternatives.slice(0, 3).forEach((alt) => {
          output += `- Consider \`${alt.model}\` (${alt.savings} cost)\n`;
        });
        output += `\n`;
      }

      output += `*Governance note: Cost tracked in asset card for CFO reporting*`;

      return {
        content: [{ type: "text", text: output }],
      };
    }

    case "check_security_risks": {
      const assetId = args.assetId as string;
      const includeRedTeam = args.includeRedTeam !== false;
      const directory = (args.directory as string) || config.workspace;

      const card = await services.cards.get(assetId, directory);
      if (!card) {
        return {
          content: [
            {
              type: "text",
              text: `Asset card not found: ${assetId}`,
            },
          ],
          isError: true,
        };
      }

      const risks: Array<{
        severity: "critical" | "high" | "medium" | "low";
        category: string;
        description: string;
        mitigation: string;
      }> = [];

      // Analyze risk factors from classification.riskFactors
      const riskFactors = card.classification?.riskFactors;
      if (riskFactors) {
        if (riskFactors.toolExecution) {
          risks.push({
            severity: "high",
            category: "Tool Execution",
            description: "AI can execute tools or take actions",
            mitigation: "Implement tool allowlisting and rate limiting",
          });
        }

        if (riskFactors.externalDataAccess) {
          risks.push({
            severity: "medium",
            category: "Data Access",
            description: "AI accesses external data sources",
            mitigation: "Implement data source validation and output filtering",
          });
        }

        if (riskFactors.piiProcessing === "yes") {
          risks.push({
            severity: "high",
            category: "PII Processing",
            description: "AI processes personal identifiable information",
            mitigation: "Implement PII masking and data retention policies",
          });
        }

        if (riskFactors.autonomousDecisions && riskFactors.highStakesDecisions) {
          risks.push({
            severity: "critical",
            category: "Autonomous High-Stakes",
            description: "AI makes autonomous decisions on high-stakes matters",
            mitigation: "Require human-in-the-loop for all decisions",
          });
        }

        if (riskFactors.customerFacing) {
          risks.push({
            severity: "medium",
            category: "Prompt Injection",
            description: "Customer-facing AI is vulnerable to prompt injection",
            mitigation: "Implement input validation and output guardrails",
          });
        }
      }

      // Check for missing constraints
      if (!card.constraints?.humanApprovalRequired) {
        risks.push({
          severity: "medium",
          category: "Missing Constraints",
          description: "No human approval requirements defined",
          mitigation: "Define humanApprovalRequired in asset card",
        });
      }

      let output = `## Security Risks: ${card.name}\n\n`;

      // Red team section
      if (includeRedTeam && config.redTeamEnabled) {
        const redTeamStatus = await services.redTeam.getStatus(assetId);
        if (redTeamStatus.enabled && redTeamStatus.lastAssessment) {
          output += `### Red Team Status\n`;
          output += `- **Last Assessment:** ${redTeamStatus.lastAssessment.date}\n`;
          output += `- **Critical Findings:** ${redTeamStatus.findings.critical}\n`;
          output += `- **High Findings:** ${redTeamStatus.findings.high}\n\n`;
        } else {
          output += `### Red Team Status\n`;
          output += `⚠️ No red team scan on record. Consider running \`aigrc redteam ${assetId}\`\n\n`;
        }
      }

      // Sort risks by severity
      const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      risks.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

      const critical = risks.filter((r) => r.severity === "critical");
      const high = risks.filter((r) => r.severity === "high");
      const medium = risks.filter((r) => r.severity === "medium");
      const low = risks.filter((r) => r.severity === "low");

      if (risks.length === 0) {
        output += `### ✅ No Significant Risks Identified\n\n`;
        output += `The asset has low risk factors and appropriate constraints defined.`;
      } else {
        output += `### Risk Summary\n`;
        output += `| Severity | Count |\n`;
        output += `|----------|-------|\n`;
        output += `| Critical | ${critical.length} |\n`;
        output += `| High | ${high.length} |\n`;
        output += `| Medium | ${medium.length} |\n`;
        output += `| Low | ${low.length} |\n\n`;

        if (critical.length > 0) {
          output += `### 🔴 Critical Risks\n\n`;
          critical.forEach((r) => {
            output += `**${r.category}**\n`;
            output += `- ${r.description}\n`;
            output += `- *Mitigation:* ${r.mitigation}\n\n`;
          });
        }

        if (high.length > 0) {
          output += `### 🟠 High Risks\n\n`;
          high.forEach((r) => {
            output += `**${r.category}**\n`;
            output += `- ${r.description}\n`;
            output += `- *Mitigation:* ${r.mitigation}\n\n`;
          });
        }

        if (medium.length > 0) {
          output += `### 🟡 Medium Risks\n\n`;
          medium.forEach((r) => {
            output += `- **${r.category}:** ${r.description}\n`;
          });
        }
      }

      return {
        content: [{ type: "text", text: output }],
      };
    }

    default:
      return null;
  }
}

// Helper function to get asset readiness
async function getAssetReadiness(
  card: AssetCard,
  targetEnvironment: string,
  services: Services,
  config: AIGRCConfig
): Promise<{
  ready: boolean;
  blockers: string[];
  warnings: string[];
  formatted: string;
}> {
  const blockers: string[] = [];
  const warnings: string[] = [];
  const checks: Array<{ name: string; passed: boolean; detail?: string }> = [];

  // Check: Asset registered with owner
  if (card.ownership?.owner?.email) {
    checks.push({ name: "Asset registered with owner", passed: true });
  } else {
    checks.push({ name: "Asset registered with owner", passed: false });
    blockers.push("Missing owner information");
  }

  // Check: Golden Thread (intent.linked and intent.ticketId)
  if (card.intent?.ticketId) {
    checks.push({
      name: `Linked to business ticket (${card.intent.ticketId})`,
      passed: true,
    });
  } else {
    checks.push({ name: "Linked to business ticket", passed: false });
    if (targetEnvironment === "production") {
      blockers.push("Missing Golden Thread - no business justification linked");
    } else {
      warnings.push("Missing Golden Thread (required for production)");
    }
  }

  // Check: Risk classification
  if (card.classification?.riskLevel) {
    checks.push({
      name: `Risk classification complete (${card.classification.riskLevel.toUpperCase()})`,
      passed: true,
    });
  } else {
    checks.push({ name: "Risk classification complete", passed: false });
    blockers.push("Risk classification not complete");
  }

  // Check: Compliance
  const complianceStatuses = services.compliance.checkAllProfiles(card);
  const avgCompliance = complianceStatuses.length > 0
    ? Math.round(
        complianceStatuses.reduce((acc, s) => acc + s.percentage, 0) /
          complianceStatuses.length
      )
    : 0;
  const threshold = targetEnvironment === "production" ? 80 : 60;

  if (avgCompliance >= threshold) {
    checks.push({
      name: `Compliance at ${avgCompliance}% (target: ${threshold}%)`,
      passed: true,
    });
  } else {
    checks.push({
      name: `Compliance at ${avgCompliance}% (target: ${threshold}%)`,
      passed: false,
    });
    if (avgCompliance < threshold) {
      blockers.push(`Compliance below ${threshold}% threshold`);
    }
  }

  // Check: Red Team (for high risk)
  if (card.classification?.riskLevel === "high" && config.redTeamEnabled) {
    const redTeamStatus = await services.redTeam.getStatus(card.name);
    if (redTeamStatus.findings.critical > 0) {
      checks.push({
        name: `Critical security findings (${redTeamStatus.findings.critical})`,
        passed: false,
      });
      blockers.push(`${redTeamStatus.findings.critical} critical security findings`);
    } else {
      checks.push({ name: "No critical security findings", passed: true });
    }
  }

  const ready = blockers.length === 0;
  const status = ready
    ? warnings.length > 0
      ? "READY WITH WARNINGS ✅⚠️"
      : "READY ✅"
    : "NOT READY ❌";

  let formatted = `## Deployment Readiness: ${card.name}\n\n`;
  formatted += `**Status: ${status}**\n`;
  formatted += `**Environment:** ${targetEnvironment}\n\n`;

  formatted += `### Checklist\n`;
  checks.forEach((c) => {
    formatted += `- ${c.passed ? "✅" : "❌"} ${c.name}\n`;
  });

  if (blockers.length > 0) {
    formatted += `\n### Blockers\n`;
    blockers.forEach((b) => {
      formatted += `- ❌ ${b}\n`;
    });
  }

  if (warnings.length > 0) {
    formatted += `\n### Warnings\n`;
    warnings.forEach((w) => {
      formatted += `- ⚠️ ${w}\n`;
    });
  }

  if (!ready) {
    formatted += `\n### Next Steps\n`;
    if (blockers.some((b) => b.includes("Golden Thread"))) {
      formatted += `1. Link to a Jira ticket: \`aigrc link ${card.name} PROJ-XXXX\`\n`;
    }
    if (blockers.some((b) => b.includes("Compliance"))) {
      formatted += `2. Generate missing artifacts: \`aigrc generate-artifacts --asset ${card.name}\`\n`;
    }
    if (blockers.some((b) => b.includes("security"))) {
      formatted += `3. Address security findings: \`aigrc redteam-status ${card.name}\`\n`;
    }
  } else {
    formatted += `\n### Next Steps\n`;
    formatted += `Ready to deploy to ${targetEnvironment}!\n`;
  }

  return { ready, blockers, warnings, formatted };
}

// Helper to detect model from framework
function detectModelFromFramework(framework: string): string {
  const frameworkToModel: Record<string, string> = {
    openai: "gpt-4o",
    anthropic: "claude-3-5-sonnet",
    langchain: "gpt-4o",
    llamaindex: "gpt-4o",
    "vercel-ai": "gpt-4o",
    google: "gemini-1.5-pro",
    cohere: "command-r-plus",
  };
  return frameworkToModel[framework.toLowerCase()] || "gpt-4o";
}
