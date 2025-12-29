/**
 * Policy Service
 *
 * Manages governance policies and provides real-time policy queries.
 * In production, this would integrate with a policy engine or AIGOS backend.
 */

import { AIGRCConfig } from "../config.js";

export interface PolicyDecision {
  allowed: boolean;
  conditions: string[];
  alternatives: string[];
  reasoning: string;
}

export interface PolicyConfig {
  approvedModels: string[];
  approvedLibraries: string[];
  approvedProviders: string[];
  dataRetentionDays: number;
  requireAuditLogging: boolean;
  requireHumanApprovalFor: string[];
  blockedDomains: string[];
}

// Default policy configuration
const DEFAULT_POLICY: PolicyConfig = {
  approvedModels: [
    "gpt-4o",
    "gpt-4o-mini",
    "gpt-4-turbo",
    "gpt-3.5-turbo",
    "claude-3-5-sonnet",
    "claude-3-5-haiku",
    "claude-3-opus",
    "gemini-1.5-pro",
    "gemini-1.5-flash",
    "command-r-plus",
    "command-r",
  ],
  approvedLibraries: [
    "openai",
    "@openai/api",
    "anthropic",
    "@anthropic-ai/sdk",
    "langchain",
    "@langchain/core",
    "@langchain/openai",
    "@langchain/anthropic",
    "llamaindex",
    "@google/generative-ai",
    "ai", // Vercel AI SDK
    "@ai-sdk/openai",
    "@ai-sdk/anthropic",
    "cohere-ai",
    "transformers",
    "torch",
    "tensorflow",
    "scikit-learn",
  ],
  approvedProviders: [
    "openai",
    "anthropic",
    "google",
    "cohere",
    "azure",
    "aws-bedrock",
  ],
  dataRetentionDays: 30,
  requireAuditLogging: true,
  requireHumanApprovalFor: [
    "employment_decisions",
    "credit_decisions",
    "healthcare_recommendations",
    "financial_transactions",
    "legal_advice",
  ],
  blockedDomains: [
    "weapons",
    "illegal_content",
    "child_safety",
  ],
};

export interface PolicyService {
  checkModel(model: string, context?: Record<string, any>): PolicyDecision;
  checkLibrary(library: string): PolicyDecision;
  checkAction(
    action: string,
    context: Record<string, any>
  ): PolicyDecision;
  getPolicy(): PolicyConfig;
  getApprovedModels(): string[];
  getApprovedLibraries(): string[];
  formatDecision(decision: PolicyDecision): string;
}

export function createPolicyService(config: AIGRCConfig): PolicyService {
  // In production, this would load from a policy file or AIGOS API
  const policy = { ...DEFAULT_POLICY };

  return {
    checkModel(model: string, context?: Record<string, any>): PolicyDecision {
      const normalizedModel = model.toLowerCase().trim();
      const isApproved = policy.approvedModels.some(
        (m) => m.toLowerCase() === normalizedModel
      );

      if (!isApproved) {
        return {
          allowed: false,
          conditions: [],
          alternatives: policy.approvedModels.slice(0, 5),
          reasoning: `Model "${model}" is not on the approved list. Contact the governance team for review if this model is required.`,
        };
      }

      const conditions: string[] = [];

      // Add conditions based on context
      if (context?.dataType === "pii" || context?.piiProcessing) {
        conditions.push("Must enable audit logging for all API calls");
        conditions.push("Must implement PII masking in logs");
        conditions.push("Data retention must not exceed 30 days");
      }

      if (context?.domain === "employment" || context?.domain === "credit") {
        conditions.push("Must not use for automated decision-making");
        conditions.push("Human review required for all outputs");
      }

      if (context?.customerFacing) {
        conditions.push("Must implement output guardrails");
        conditions.push("Must log all interactions for audit");
      }

      // Suggest alternatives
      const alternatives = policy.approvedModels
        .filter((m) => m.toLowerCase() !== normalizedModel)
        .slice(0, 3);

      return {
        allowed: true,
        conditions,
        alternatives,
        reasoning: `Model "${model}" is approved for use.`,
      };
    },

    checkLibrary(library: string): PolicyDecision {
      const normalizedLib = library.toLowerCase().trim();
      const isApproved = policy.approvedLibraries.some(
        (l) => l.toLowerCase() === normalizedLib
      );

      if (!isApproved) {
        // Check if it's a variant we might recognize
        const possibleMatch = policy.approvedLibraries.find((l) =>
          normalizedLib.includes(l.toLowerCase()) ||
          l.toLowerCase().includes(normalizedLib)
        );

        return {
          allowed: false,
          conditions: [],
          alternatives: possibleMatch
            ? [possibleMatch]
            : policy.approvedLibraries.slice(0, 5),
          reasoning: possibleMatch
            ? `Library "${library}" is not approved, but "${possibleMatch}" is. Consider using the approved variant.`
            : `Library "${library}" is not on the approved list. Contact the governance team for security review.`,
        };
      }

      return {
        allowed: true,
        conditions: [],
        alternatives: [],
        reasoning: `Library "${library}" is approved for use.`,
      };
    },

    checkAction(action: string, context: Record<string, any>): PolicyDecision {
      const conditions: string[] = [];
      let allowed = true;
      let reasoning = "";

      switch (action) {
        case "use_model":
          return this.checkModel(context.model || "", context);

        case "use_library":
          return this.checkLibrary(context.library || "");

        case "access_pii":
          conditions.push(
            `Data retention must not exceed ${policy.dataRetentionDays} days`
          );
          conditions.push("Must implement PII masking in logs");
          conditions.push("Must document in asset card riskFactors.piiProcessing");
          conditions.push("Asset must be classified as HIGH risk minimum");
          reasoning = "PII access is allowed with appropriate data protection controls.";
          break;

        case "call_external_api":
          conditions.push("Must validate and sanitize all inputs");
          conditions.push("Must not expose internal data in request payloads");
          conditions.push("Must handle API failures gracefully");
          conditions.push("Must log external API calls for audit");
          reasoning = "External API calls are allowed with appropriate controls.";
          break;

        case "deploy_to_production":
          conditions.push("Asset must be registered with owner");
          conditions.push("Golden Thread must be established");
          conditions.push("Compliance must be >= 80%");
          conditions.push("No critical security findings");
          if (context.riskLevel === "high") {
            conditions.push("Impact Assessment must be completed");
            conditions.push("Risk Management Plan must be documented");
          }
          reasoning = "Production deployment requires full governance compliance.";
          break;

        case "process_financial_data":
          conditions.push("Asset must be classified as HIGH risk");
          conditions.push("Human-in-the-loop required for all decisions");
          conditions.push("Must maintain immutable audit trail");
          conditions.push("Must not make autonomous financial decisions");
          conditions.push("Must implement transaction limits");
          reasoning =
            "Financial data processing requires strict controls and human oversight.";
          break;

        case "make_employment_decision":
          conditions.push("Human review required for all outputs");
          conditions.push("Must document decision rationale");
          conditions.push("Must provide appeal mechanism");
          conditions.push("Cannot be sole basis for adverse decisions");
          conditions.push("Must comply with local employment laws");
          reasoning =
            "AI cannot make autonomous employment decisions. Human oversight is mandatory.";
          break;

        case "process_healthcare_data":
          conditions.push("Must comply with HIPAA/relevant health data regulations");
          conditions.push("Must implement encryption at rest and in transit");
          conditions.push("Access must be logged and auditable");
          conditions.push("Must not make autonomous treatment decisions");
          conditions.push("Healthcare professional oversight required");
          reasoning =
            "Healthcare data processing requires strict regulatory compliance.";
          break;

        default:
          // Check if action relates to a blocked domain
          const isBlocked = policy.blockedDomains.some((d) =>
            action.toLowerCase().includes(d)
          );
          if (isBlocked) {
            allowed = false;
            reasoning = `Action "${action}" relates to a blocked domain.`;
          } else {
            reasoning = `Action "${action}" is allowed. No specific policy restrictions.`;
          }
      }

      return {
        allowed,
        conditions,
        alternatives: [],
        reasoning,
      };
    },

    getPolicy(): PolicyConfig {
      return { ...policy };
    },

    getApprovedModels(): string[] {
      return [...policy.approvedModels];
    },

    getApprovedLibraries(): string[] {
      return [...policy.approvedLibraries];
    },

    formatDecision(decision: PolicyDecision): string {
      const status = decision.allowed
        ? decision.conditions.length > 0
          ? "✅ ALLOWED (with conditions)"
          : "✅ ALLOWED"
        : "❌ NOT ALLOWED";

      let output = `**Verdict:** ${status}\n\n`;
      output += `**Reasoning:** ${decision.reasoning}\n\n`;

      if (decision.conditions.length > 0) {
        output += `### Conditions\n`;
        decision.conditions.forEach((c) => {
          output += `- ${c}\n`;
        });
        output += "\n";
      }

      if (decision.alternatives.length > 0) {
        output += `### Alternatives\n`;
        decision.alternatives.forEach((a) => {
          output += `- \`${a}\`\n`;
        });
      }

      return output;
    },
  };
}
