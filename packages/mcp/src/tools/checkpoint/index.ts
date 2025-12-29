/**
 * Checkpoint Acceleration Tools
 *
 * Tools for preparing code to pass GitHub/GitLab/CI checkpoints.
 * Helps developers understand what will block their PR before they push.
 */

import { AIGRCConfig } from "../../config.js";
import { Services } from "../../services/index.js";
import { ToolDefinition, ToolResult } from "../index.js";
import type { AssetCard } from "@aigrc/core";

export const checkpointTools: ToolDefinition[] = [
  {
    name: "preview_checkpoint_issues",
    description:
      "Preview what a checkpoint (GitHub App, GitLab webhook, or CI gate) will flag before pushing. Shows blocking issues and warnings with fix commands.",
    inputSchema: {
      type: "object",
      properties: {
        directory: {
          type: "string",
          description: "Workspace directory (default: current)",
        },
        targetCheckpoint: {
          type: "string",
          enum: ["github-app", "gitlab-webhook", "ci-gate"],
          description: "Target checkpoint type (default: github-app)",
        },
        checkpointConfig: {
          type: "object",
          properties: {
            requireGoldenThread: { type: "boolean" },
            minCompliancePercentage: { type: "number" },
            failOnHighRisk: { type: "boolean" },
            failOnUnregistered: { type: "boolean" },
            profiles: {
              type: "array",
              items: { type: "string" },
            },
          },
          description: "Checkpoint configuration overrides",
        },
      },
    },
  },
  {
    name: "generate_checkpoint_artifacts",
    description:
      "Auto-generate missing artifacts required to pass checkpoints. Creates asset cards, impact assessments, and other compliance documents.",
    inputSchema: {
      type: "object",
      properties: {
        directory: {
          type: "string",
          description: "Workspace directory (default: current)",
        },
        assetId: {
          type: "string",
          description: "Specific asset (or omit for all assets with missing artifacts)",
        },
        artifactTypes: {
          type: "array",
          items: {
            type: "string",
            enum: [
              "asset_card",
              "ai_impact_assessment",
              "risk_management_plan",
              "technical_documentation",
              "human_oversight_procedures",
              "testing_report",
            ],
          },
          description: "Specific artifacts to generate (default: all missing)",
        },
        dryRun: {
          type: "boolean",
          description: "Preview without creating files (default: false)",
        },
      },
    },
  },
  {
    name: "prepare_for_checkpoint",
    description:
      "Comprehensive checkpoint readiness report with prioritized action plan. Shows current status, gaps, and estimated time to pass.",
    inputSchema: {
      type: "object",
      properties: {
        directory: {
          type: "string",
          description: "Workspace directory (default: current)",
        },
        targetCheckpoint: {
          type: "string",
          enum: ["github-app", "gitlab-webhook", "ci-gate"],
          description: "Target checkpoint type (default: github-app)",
        },
      },
    },
  },
  {
    name: "check_policy",
    description:
      "Real-time policy query for governance decisions during development. Check if a specific action (using a library, model, accessing data) is allowed.",
    inputSchema: {
      type: "object",
      properties: {
        action: {
          type: "string",
          enum: [
            "use_library",
            "use_model",
            "access_pii",
            "call_external_api",
            "deploy_to_production",
            "process_financial_data",
          ],
          description: "Action being considered",
        },
        context: {
          type: "object",
          properties: {
            library: { type: "string" },
            model: { type: "string" },
            dataType: { type: "string" },
            endpoint: { type: "string" },
            environment: { type: "string" },
          },
          description: "Context for the action",
        },
        directory: {
          type: "string",
          description: "Workspace directory (default: current)",
        },
      },
      required: ["action", "context"],
    },
  },
];

// Default checkpoint configuration
const DEFAULT_CHECKPOINT_CONFIG = {
  requireGoldenThread: true,
  minCompliancePercentage: 80,
  failOnHighRisk: false,
  failOnUnregistered: true,
  profiles: ["eu-ai-act"],
};

// Policy defaults - these would come from a policy service in production
const APPROVED_MODELS = [
  "gpt-4o",
  "gpt-4o-mini",
  "gpt-4-turbo",
  "claude-3-5-sonnet",
  "claude-3-5-haiku",
  "claude-3-opus",
  "gemini-1.5-pro",
  "gemini-1.5-flash",
];

const APPROVED_LIBRARIES = [
  "openai",
  "anthropic",
  "@anthropic-ai/sdk",
  "langchain",
  "@langchain/core",
  "llamaindex",
  "@google/generative-ai",
  "ai", // Vercel AI SDK
  "cohere-ai",
];

export async function executeCheckpointTools(
  name: string,
  args: Record<string, unknown>,
  services: Services,
  config: AIGRCConfig
): Promise<ToolResult | null> {
  switch (name) {
    case "preview_checkpoint_issues": {
      const directory = (args.directory as string) || config.workspace;
      const targetCheckpoint = (args.targetCheckpoint as string) || "github-app";
      const checkpointConfig = {
        ...DEFAULT_CHECKPOINT_CONFIG,
        ...(args.checkpointConfig as object || {}),
      };

      const validation = await validateCheckpoint(
        directory,
        checkpointConfig,
        services,
        config
      );

      const verdict = validation.blockers.length > 0
        ? "WOULD FAIL 🚫"
        : validation.warnings.length > 0
        ? "WOULD PASS WITH WARNINGS ⚠️"
        : "WOULD PASS ✅";

      let output = `## Checkpoint Preview: ${targetCheckpoint}\n\n`;
      output += `### Verdict: ${verdict}\n\n`;

      if (validation.blockers.length > 0) {
        output += `### Blocking Issues (${validation.blockers.length})\n\n`;
        validation.blockers.forEach((b, i) => {
          output += `${i + 1}. **${b.issue}**\n`;
          if (b.asset) output += `   - Asset: \`${b.asset}\`\n`;
          if (b.file) output += `   - File: \`${b.file}\`\n`;
          output += `   - Fix: \`${b.fix}\`\n`;
          output += `   - Auto-fixable: ${b.autoFixable ? "✅ Yes" : "❌ No"}\n\n`;
        });
      }

      if (validation.warnings.length > 0) {
        output += `### Warnings (${validation.warnings.length})\n\n`;
        validation.warnings.forEach((w) => {
          output += `- ${w}\n`;
        });
        output += "\n";
      }

      if (validation.blockers.some((b) => b.autoFixable)) {
        output += `### Quick Fix\n`;
        output += `Run \`aigrc checkpoint-fix\` to auto-resolve fixable issues.\n`;
      }

      return {
        content: [{ type: "text", text: output }],
        _meta: {
          wouldPass: validation.blockers.length === 0,
          blockers: validation.blockers,
          warnings: validation.warnings,
        },
      } as ToolResult;
    }

    case "generate_checkpoint_artifacts": {
      const directory = (args.directory as string) || config.workspace;
      const assetId = args.assetId as string | undefined;
      const artifactTypes = args.artifactTypes as string[] | undefined;
      const dryRun = args.dryRun === true;

      const cards = assetId
        ? [await services.cards.get(assetId, directory)].filter(Boolean)
        : await services.cards.list(directory);

      if (cards.length === 0) {
        return {
          content: [
            {
              type: "text",
              text: assetId
                ? `Asset card not found: ${assetId}`
                : "No asset cards found in workspace",
            },
          ],
          isError: true,
        };
      }

      const created: Array<{ type: string; asset: string; path: string }> = [];
      const skipped: Array<{ type: string; asset: string; reason: string }> = [];
      const cannotCreate: Array<{ type: string; asset: string; reason: string }> = [];

      for (const card of cards) {
        if (!card) continue;
        const requiredArtifacts = getRequiredArtifacts(card);
        const existingArtifacts = card.classification?.requiredArtifacts?.map((a: { type: string }) => a.type) || [];

        for (const artifactType of requiredArtifacts) {
          // Skip if not in requested types
          if (artifactTypes && !artifactTypes.includes(artifactType)) {
            continue;
          }

          // Skip if already exists
          if (existingArtifacts.includes(artifactType)) {
            skipped.push({
              type: artifactType,
              asset: card.name,
              reason: "Already exists",
            });
            continue;
          }

          // Check if we can auto-generate
          if (canAutoGenerate(artifactType)) {
            if (!dryRun) {
              const path = await generateArtifact(
                card,
                artifactType,
                directory,
                services
              );
              created.push({ type: artifactType, asset: card.name, path });
            } else {
              created.push({
                type: artifactType,
                asset: card.name,
                path: `.aigrc/artifacts/${card.name}/${artifactType}.md`,
              });
            }
          } else {
            cannotCreate.push({
              type: artifactType,
              asset: card.name,
              reason: "Requires manual input",
            });
          }
        }
      }

      let output = `## Artifacts ${dryRun ? "Preview" : "Generated"}\n\n`;

      if (dryRun) {
        output += `*Dry run - no files created*\n\n`;
      }

      if (created.length > 0) {
        output += `### ${dryRun ? "Would Create" : "Created"} (${created.length})\n`;
        output += `| Artifact | Asset | Path |\n`;
        output += `|----------|-------|------|\n`;
        created.forEach((c) => {
          output += `| ${formatArtifactType(c.type)} | ${c.asset} | \`${c.path}\` |\n`;
        });
        output += "\n";
      }

      if (cannotCreate.length > 0) {
        output += `### Cannot Auto-Generate (${cannotCreate.length})\n`;
        output += `| Artifact | Asset | Reason |\n`;
        output += `|----------|-------|--------|\n`;
        cannotCreate.forEach((c) => {
          output += `| ${formatArtifactType(c.type)} | ${c.asset} | ${c.reason} |\n`;
        });
        output += "\n";
      }

      // Show checkpoint status change
      const beforeValidation = await validateCheckpoint(
        directory,
        DEFAULT_CHECKPOINT_CONFIG,
        services,
        config
      );
      const wouldPassBefore = beforeValidation.blockers.length === 0;

      output += `### Checkpoint Status\n`;
      output += `**Before:** ${wouldPassBefore ? "WOULD PASS" : "WOULD FAIL"}\n`;
      if (!dryRun && created.length > 0) {
        output += `**After:** Run \`preview_checkpoint_issues\` to verify\n`;
      }

      return {
        content: [{ type: "text", text: output }],
      };
    }

    case "prepare_for_checkpoint": {
      const directory = (args.directory as string) || config.workspace;
      const targetCheckpoint = (args.targetCheckpoint as string) || "github-app";

      const cards = await services.cards.list(directory);
      const scanResult = await services.scanner.scan(directory);
      const validation = await validateCheckpoint(
        directory,
        DEFAULT_CHECKPOINT_CONFIG,
        services,
        config
      );

      // Calculate readiness score
      let score = 100;
      score -= validation.blockers.length * 15;
      score -= validation.warnings.length * 5;
      score = Math.max(0, score);

      const status = score >= 80
        ? "READY ✅"
        : score >= 50
        ? "NEEDS WORK 🔧"
        : "NOT READY ❌";

      let output = `## Checkpoint Readiness Report\n\n`;
      output += `### Overall Status: ${status}\n\n`;
      output += `**Readiness Score:** ${score}/100\n\n`;

      // Summary table
      const registeredCount = cards.length;
      const detectedCount = scanResult.detections.filter((d) => d.confidence === "high").length;
      const withGoldenThread = cards.filter((c) => c.intent?.ticketId).length;
      const avgCompliance = cards.length > 0
        ? Math.round(
            cards.reduce((acc, card) => {
              const statuses = services.compliance.checkAllProfiles(card);
              return (
                acc +
                (statuses.length > 0
                  ? statuses.reduce((a, s) => a + s.percentage, 0) / statuses.length
                  : 0)
              );
            }, 0) / cards.length
          )
        : 0;

      output += `### Summary\n`;
      output += `| Metric | Current | Required |\n`;
      output += `|--------|---------|----------|\n`;
      output += `| Assets Detected | ${detectedCount} | - |\n`;
      output += `| Assets Registered | ${registeredCount} | ${detectedCount} |\n`;
      output += `| With Golden Thread | ${withGoldenThread} | ${registeredCount} |\n`;
      output += `| Avg Compliance | ${avgCompliance}% | 80% |\n\n`;

      // Action plan
      if (validation.blockers.length > 0 || validation.warnings.length > 0) {
        output += `### Action Plan (Priority Order)\n\n`;

        let step = 1;

        // Group blockers by type
        const unregistered = validation.blockers.filter((b) =>
          b.issue.includes("Unregistered")
        );
        const missingGoldenThread = validation.blockers.filter((b) =>
          b.issue.includes("Golden Thread")
        );
        const complianceIssues = validation.blockers.filter((b) =>
          b.issue.includes("Compliance")
        );
        const artifactIssues = validation.blockers.filter((b) =>
          b.issue.includes("artifact")
        );

        if (unregistered.length > 0) {
          output += `${step}. **Register undetected AI** (~${unregistered.length * 5} min)\n`;
          output += `   \`\`\`bash\n`;
          unregistered.slice(0, 3).forEach((u) => {
            output += `   aigrc register --file ${u.file || "detected-file"}\n`;
          });
          if (unregistered.length > 3) {
            output += `   # ... and ${unregistered.length - 3} more\n`;
          }
          output += `   \`\`\`\n\n`;
          step++;
        }

        if (missingGoldenThread.length > 0) {
          output += `${step}. **Link to Jira tickets** (~${missingGoldenThread.length * 2} min)\n`;
          output += `   \`\`\`bash\n`;
          missingGoldenThread.slice(0, 3).forEach((m) => {
            output += `   aigrc link ${m.asset} PROJ-XXXX\n`;
          });
          output += `   \`\`\`\n\n`;
          step++;
        }

        if (artifactIssues.length > 0 || complianceIssues.length > 0) {
          output += `${step}. **Generate missing artifacts** (~5 min)\n`;
          output += `   \`\`\`bash\n`;
          output += `   aigrc generate-artifacts\n`;
          output += `   \`\`\`\n\n`;
          step++;
        }
      }

      // Estimated time
      const totalMinutes =
        validation.blockers.reduce((acc, b) => {
          if (b.issue.includes("Unregistered")) return acc + 5;
          if (b.issue.includes("Golden Thread")) return acc + 2;
          if (b.issue.includes("artifact")) return acc + 5;
          return acc + 10;
        }, 0) + validation.warnings.length * 2;

      output += `### Estimated Time to Pass: ~${totalMinutes} minutes\n`;

      return {
        content: [{ type: "text", text: output }],
      };
    }

    case "check_policy": {
      const action = args.action as string;
      const context = args.context as {
        library?: string;
        model?: string;
        dataType?: string;
        endpoint?: string;
        environment?: string;
      };

      let allowed = true;
      const conditions: string[] = [];
      const alternatives: string[] = [];
      let details = "";

      switch (action) {
        case "use_model": {
          const model = context.model || "";
          const isApproved = APPROVED_MODELS.some(
            (m) => m.toLowerCase() === model.toLowerCase()
          );

          if (isApproved) {
            allowed = true;
            details = `Model \`${model}\` is on the approved list.`;

            // Add conditions based on data type
            if (context.dataType === "pii") {
              conditions.push("Must enable audit logging");
              conditions.push("Must not use for automated employment decisions");
            }

            // Suggest alternatives
            APPROVED_MODELS.filter(
              (m) => m !== model && !m.includes("opus")
            ).forEach((m) => alternatives.push(m));
          } else {
            allowed = false;
            details = `Model \`${model}\` is not on the approved list.`;
            alternatives.push(...APPROVED_MODELS.slice(0, 3));
          }
          break;
        }

        case "use_library": {
          const library = context.library || "";
          const isApproved = APPROVED_LIBRARIES.some(
            (l) => l.toLowerCase() === library.toLowerCase()
          );

          if (isApproved) {
            allowed = true;
            details = `Library \`${library}\` is approved for use.`;
          } else {
            allowed = false;
            details = `Library \`${library}\` is not on the approved list. Contact governance team for review.`;
            alternatives.push(...APPROVED_LIBRARIES.slice(0, 3));
          }
          break;
        }

        case "access_pii": {
          allowed = true;
          details = "PII access is allowed with appropriate controls.";
          conditions.push("Must implement data retention policy (max 30 days)");
          conditions.push("Must enable PII masking in logs");
          conditions.push("Must document in asset card");
          conditions.push("Requires HIGH risk classification");
          break;
        }

        case "call_external_api": {
          allowed = true;
          details = "External API calls are allowed with appropriate controls.";
          conditions.push("Must validate and sanitize all inputs");
          conditions.push("Must not expose internal data in requests");
          conditions.push("Must handle API failures gracefully");
          break;
        }

        case "deploy_to_production": {
          const env = context.environment || "production";
          if (env === "production") {
            allowed = true;
            details = "Production deployment allowed with governance compliance.";
            conditions.push("Asset must be registered with owner");
            conditions.push("Golden Thread must be established");
            conditions.push("Compliance must be >= 80%");
            conditions.push("No critical security findings");
          } else {
            allowed = true;
            details = `Deployment to ${env} allowed with reduced requirements.`;
          }
          break;
        }

        case "process_financial_data": {
          allowed = true;
          details = "Financial data processing requires additional controls.";
          conditions.push("Must classify as HIGH risk");
          conditions.push("Must implement human-in-the-loop for decisions");
          conditions.push("Must maintain audit trail");
          conditions.push("Must not make autonomous financial decisions");
          break;
        }
      }

      const verdict = allowed
        ? conditions.length > 0
          ? "✅ ALLOWED (with conditions)"
          : "✅ ALLOWED"
        : "❌ NOT ALLOWED";

      let output = `## Policy Check: ${action}\n\n`;

      // Show context
      const contextEntries = Object.entries(context).filter(([_, v]) => v);
      if (contextEntries.length > 0) {
        output += `**Context:**\n`;
        contextEntries.forEach(([k, v]) => {
          output += `- ${k}: \`${v}\`\n`;
        });
        output += "\n";
      }

      output += `**Verdict:** ${verdict}\n\n`;
      output += `### Details\n${details}\n\n`;

      if (conditions.length > 0) {
        output += `### Conditions\n`;
        conditions.forEach((c) => {
          output += `- ${c}\n`;
        });
        output += "\n";
      }

      if (alternatives.length > 0 && !allowed) {
        output += `### Approved Alternatives\n`;
        alternatives.slice(0, 5).forEach((a) => {
          output += `- \`${a}\`\n`;
        });
      } else if (alternatives.length > 0 && action === "use_model") {
        output += `### Alternative Models\n`;
        alternatives.slice(0, 3).forEach((a) => {
          output += `- \`${a}\`\n`;
        });
      }

      return {
        content: [{ type: "text", text: output }],
        _meta: {
          allowed,
          conditions,
          alternatives,
        },
      } as ToolResult;
    }

    default:
      return null;
  }
}

// Helper: Validate checkpoint
async function validateCheckpoint(
  directory: string,
  checkpointConfig: typeof DEFAULT_CHECKPOINT_CONFIG,
  services: Services,
  config: AIGRCConfig
): Promise<{
  blockers: Array<{
    issue: string;
    asset?: string;
    file?: string;
    fix: string;
    autoFixable: boolean;
  }>;
  warnings: string[];
}> {
  const blockers: Array<{
    issue: string;
    asset?: string;
    file?: string;
    fix: string;
    autoFixable: boolean;
  }> = [];
  const warnings: string[] = [];

  const cards = await services.cards.list(directory);
  const scanResult = await services.scanner.scan(directory);

  // Layer 1: Check for unregistered AI
  if (checkpointConfig.failOnUnregistered) {
    for (const detection of scanResult.detections) {
      if (detection.confidence === "high") {
        const isRegistered = cards.some(
          (c) =>
            (c.technical.framework?.toLowerCase() || "") ===
              detection.framework.toLowerCase() ||
            c.name.toLowerCase().includes(detection.framework.toLowerCase())
        );
        if (!isRegistered) {
          blockers.push({
            issue: "Unregistered AI Detected",
            file: detection.filePath,
            fix: `aigrc register --file ${detection.filePath}`,
            autoFixable: true,
          });
        }
      }
    }
  }

  // Layer 2: Check each registered asset
  for (const card of cards) {
    // Golden Thread check (intent.ticketId)
    if (checkpointConfig.requireGoldenThread && !card.intent?.ticketId) {
      blockers.push({
        issue: "Missing Golden Thread",
        asset: card.name,
        fix: `aigrc link ${card.name} PROJ-XXXX`,
        autoFixable: false,
      });
    }

    // Compliance check
    const complianceStatuses = services.compliance.checkAllProfiles(card);
    for (const status of complianceStatuses) {
      if (status.percentage < checkpointConfig.minCompliancePercentage) {
        blockers.push({
          issue: `Compliance below ${checkpointConfig.minCompliancePercentage}% (${status.profileName}: ${status.percentage}%)`,
          asset: card.name,
          fix: `aigrc generate-artifacts --asset ${card.name}`,
          autoFixable: true,
        });
      }
    }

    // High risk check
    if (checkpointConfig.failOnHighRisk && card.classification?.riskLevel === "high") {
      const hasRequiredDocs = card.classification?.requiredArtifacts?.some(
        (a) => a.type === "ai_impact_assessment" && a.status === "complete"
      );
      if (!hasRequiredDocs) {
        blockers.push({
          issue: "HIGH risk asset missing Impact Assessment",
          asset: card.name,
          fix: `aigrc generate-artifact --asset ${card.name} --type ai_impact_assessment`,
          autoFixable: true,
        });
      }
    }

    // Warnings for non-blocking issues
    if (!card.ownership?.owner?.email) {
      warnings.push(`${card.name}: Missing owner email`);
    }

    if (card.classification?.riskLevel === "high" && !card.constraints) {
      warnings.push(`${card.name}: HIGH risk without constraints defined`);
    }
  }

  return { blockers, warnings };
}

// Helper: Get required artifacts for a card
function getRequiredArtifacts(card: AssetCard): string[] {
  const required: string[] = ["asset_card"];

  if (card.classification?.riskLevel === "high") {
    required.push(
      "ai_impact_assessment",
      "risk_management_plan",
      "technical_documentation"
    );
  }

  if (card.classification?.riskFactors?.autonomousDecisions) {
    required.push("human_oversight_procedures");
  }

  return required;
}

// Helper: Check if artifact can be auto-generated
function canAutoGenerate(artifactType: string): boolean {
  const autoGeneratable = [
    "asset_card",
    "ai_impact_assessment",
    "risk_management_plan",
    "technical_documentation",
  ];
  return autoGeneratable.includes(artifactType);
}

// Helper: Generate artifact
async function generateArtifact(
  card: AssetCard,
  artifactType: string,
  directory: string,
  services: Services
): Promise<string> {
  // In a real implementation, this would use a template engine
  // For now, return the path where it would be created
  const path = `.aigrc/artifacts/${card.name}/${artifactType.replace(/_/g, "-")}.md`;

  // The actual generation would be handled by the reports service
  // This is a placeholder that would be filled in Phase 2

  return path;
}

// Helper: Format artifact type for display
function formatArtifactType(type: string): string {
  return type
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}
