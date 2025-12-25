/**
 * AIGRC MCP Prompts
 *
 * Pre-built prompts for common governance tasks.
 */

import { AIGRCConfig } from "../config.js";
import { Services } from "../services/index.js";

export interface PromptDefinition {
  name: string;
  description: string;
  arguments?: Array<{
    name: string;
    description: string;
    required: boolean;
  }>;
}

export interface PromptResult {
  description: string;
  messages: Array<{
    role: "user" | "assistant";
    content: {
      type: "text";
      text: string;
    };
  }>;
}

/**
 * Get all available prompts
 */
export function getPrompts(config: AIGRCConfig): PromptDefinition[] {
  const prompts: PromptDefinition[] = [
    {
      name: "compliance_review",
      description: "Review an asset for multi-jurisdiction compliance",
      arguments: [
        {
          name: "assetId",
          description: "Asset to review",
          required: true,
        },
        {
          name: "profiles",
          description: "Specific profiles to review against (comma-separated)",
          required: false,
        },
      ],
    },
    {
      name: "risk_assessment",
      description: "Perform a comprehensive risk assessment for an asset",
      arguments: [
        {
          name: "assetId",
          description: "Asset to assess",
          required: true,
        },
      ],
    },
    {
      name: "gap_remediation",
      description: "Generate a remediation plan for compliance gaps",
      arguments: [
        {
          name: "assetId",
          description: "Asset with gaps",
          required: true,
        },
        {
          name: "profile",
          description: "Primary framework to remediate for",
          required: false,
        },
      ],
    },
    {
      name: "audit_preparation",
      description: "Prepare for a compliance audit",
      arguments: [
        {
          name: "profile",
          description: "Primary framework being audited",
          required: true,
        },
        {
          name: "scope",
          description: "Audit scope (all, high-risk, specific asset)",
          required: false,
        },
      ],
    },
    {
      name: "generate_documentation",
      description: "Generate compliance documentation for an asset",
      arguments: [
        {
          name: "assetId",
          description: "Asset to document",
          required: true,
        },
        {
          name: "documentType",
          description: "Type of document (risk_management, technical_doc, impact_assessment)",
          required: true,
        },
      ],
    },
  ];

  // Add security review prompt if red team is enabled
  if (config.redTeamEnabled) {
    prompts.push({
      name: "security_review",
      description: "Review security posture based on red team findings",
      arguments: [
        {
          name: "assetId",
          description: "Asset to review",
          required: true,
        },
      ],
    });
  }

  return prompts;
}

/**
 * Get a prompt with arguments filled in
 */
export async function getPrompt(
  name: string,
  args: Record<string, string>,
  services: Services,
  config: AIGRCConfig
): Promise<PromptResult> {
  switch (name) {
    case "compliance_review":
      return await complianceReviewPrompt(args, services, config);

    case "risk_assessment":
      return await riskAssessmentPrompt(args, services, config);

    case "gap_remediation":
      return await gapRemediationPrompt(args, services, config);

    case "audit_preparation":
      return await auditPreparationPrompt(args, services, config);

    case "generate_documentation":
      return await generateDocumentationPrompt(args, services, config);

    case "security_review":
      return await securityReviewPrompt(args, services, config);

    default:
      throw new Error(`Unknown prompt: ${name}`);
  }
}

async function complianceReviewPrompt(
  args: Record<string, string>,
  services: Services,
  config: AIGRCConfig
): Promise<PromptResult> {
  const assetId = args.assetId;
  const profilesArg = args.profiles;
  const profiles = profilesArg ? profilesArg.split(",").map((p) => p.trim()) : config.profiles;

  const card = await services.cards.get(assetId);
  if (!card) {
    throw new Error(`Asset card not found: ${assetId}`);
  }

  const statuses = services.compliance.checkAllProfiles(card);
  const crosswalk = services.crosswalk.getCrosswalk(card, profiles);

  let context = `## Asset: ${card.metadata.name}\n\n`;
  context += services.cards.formatCard(card);
  context += "\n\n---\n\n## Compliance Status\n\n";

  for (const status of statuses) {
    context += services.compliance.formatComplianceStatus(status);
    context += "\n\n";
  }

  context += "---\n\n## Cross-Framework Mapping\n\n";
  context += services.crosswalk.formatCrosswalk(crosswalk);

  return {
    description: `Compliance review for ${card.metadata.name}`,
    messages: [
      {
        role: "user",
        content: {
          type: "text",
          text: `Review the AI asset "${assetId}" for compliance across the following frameworks: ${profiles.join(", ")}

${context}

For each framework, analyze:
1. Current risk classification and whether it's appropriate
2. Required controls and their implementation status
3. Documentation completeness
4. Specific compliance gaps

Provide:
- Executive summary of compliance posture
- Prioritized list of gaps to address
- Cross-framework considerations (where one fix addresses multiple frameworks)
- Recommended next steps`,
        },
      },
    ],
  };
}

async function riskAssessmentPrompt(
  args: Record<string, string>,
  services: Services,
  config: AIGRCConfig
): Promise<PromptResult> {
  const assetId = args.assetId;

  const card = await services.cards.get(assetId);
  if (!card) {
    throw new Error(`Asset card not found: ${assetId}`);
  }

  const classification = services.classify.classifyMultiJurisdiction(card.riskFactors);

  let context = services.cards.formatCard(card);
  context += "\n\n---\n\n";
  context += services.classify.formatClassification(classification, card.riskFactors);

  return {
    description: `Risk assessment for ${card.metadata.name}`,
    messages: [
      {
        role: "user",
        content: {
          type: "text",
          text: `Perform a comprehensive risk assessment for the AI asset "${assetId}".

${context}

Analyze:
1. Risk factor accuracy - are the declared factors correct?
2. Classification appropriateness - does the risk level match the use case?
3. Potential risks not captured in the current assessment
4. Mitigation recommendations for identified risks
5. Residual risk after mitigations

Consider:
- Technical risks (model failures, data issues)
- Operational risks (misuse, drift)
- Compliance risks (regulatory changes)
- Reputational risks (bias, errors)

Provide a risk matrix and prioritized mitigation plan.`,
        },
      },
    ],
  };
}

async function gapRemediationPrompt(
  args: Record<string, string>,
  services: Services,
  config: AIGRCConfig
): Promise<PromptResult> {
  const assetId = args.assetId;
  const profile = args.profile || config.profiles[0];

  const card = await services.cards.get(assetId);
  if (!card) {
    throw new Error(`Asset card not found: ${assetId}`);
  }

  const analysis = services.compliance.gapAnalysis(card);
  const formattedAnalysis = services.compliance.formatGapAnalysis(analysis);

  return {
    description: `Gap remediation plan for ${card.metadata.name}`,
    messages: [
      {
        role: "user",
        content: {
          type: "text",
          text: `Generate a detailed remediation plan for compliance gaps in "${assetId}".

Primary Framework: ${profile}

${formattedAnalysis}

For each gap, provide:
1. Detailed remediation steps
2. Required resources (people, tools, time)
3. Dependencies on other gaps
4. Acceptance criteria
5. Verification method

Organize the plan by:
- Critical gaps (address immediately)
- High priority (address within 2 weeks)
- Medium priority (address within 1 month)
- Low priority (address within quarter)

Include template content for any missing documentation.`,
        },
      },
    ],
  };
}

async function auditPreparationPrompt(
  args: Record<string, string>,
  services: Services,
  config: AIGRCConfig
): Promise<PromptResult> {
  const profile = args.profile;
  const scope = args.scope || "all";

  const auditPackage = await services.reports.generateAuditPackage(profile);
  const formattedPackage = services.reports.formatAuditPackage(auditPackage);

  return {
    description: `Audit preparation for ${profile}`,
    messages: [
      {
        role: "user",
        content: {
          type: "text",
          text: `Prepare an audit readiness report for ${profile} compliance.

Scope: ${scope}

${formattedPackage}

For each asset in scope, analyze:
1. Current compliance percentage
2. Documentation completeness
3. Control implementation status
4. Evidence availability
5. Risk areas for auditor attention

Generate:
- Executive summary for audit committee
- Detailed findings with evidence references
- Gap remediation plan with priorities
- Pre-audit checklist
- Suggested responses to common auditor questions
- Timeline for achieving full compliance`,
        },
      },
    ],
  };
}

async function generateDocumentationPrompt(
  args: Record<string, string>,
  services: Services,
  config: AIGRCConfig
): Promise<PromptResult> {
  const assetId = args.assetId;
  const documentType = args.documentType;

  const card = await services.cards.get(assetId);
  if (!card) {
    throw new Error(`Asset card not found: ${assetId}`);
  }

  const templates: Record<string, string> = {
    risk_management: `Generate a Risk Management Plan for this AI system that includes:
1. Risk identification methodology
2. Risk analysis and evaluation criteria
3. Risk treatment options
4. Monitoring and review procedures
5. Roles and responsibilities`,

    technical_doc: `Generate Technical Documentation for this AI system that includes:
1. System architecture and components
2. Data inputs and outputs
3. Model specifications
4. Performance metrics and thresholds
5. Limitations and known issues`,

    impact_assessment: `Generate an AI Impact Assessment that includes:
1. Purpose and intended use
2. Affected individuals and groups
3. Potential benefits and risks
4. Mitigation measures
5. Monitoring and evaluation plan`,
  };

  const template = templates[documentType] || templates.risk_management;

  return {
    description: `Generate ${documentType} for ${card.metadata.name}`,
    messages: [
      {
        role: "user",
        content: {
          type: "text",
          text: `Generate compliance documentation for "${assetId}".

Document Type: ${documentType}

Asset Details:
${services.cards.formatCard(card)}

${template}

Format the document according to ${config.profiles[0]} requirements.
Include all mandatory sections and placeholder text where specific information is needed.`,
        },
      },
    ],
  };
}

async function securityReviewPrompt(
  args: Record<string, string>,
  services: Services,
  config: AIGRCConfig
): Promise<PromptResult> {
  const assetId = args.assetId;

  const card = await services.cards.get(assetId);
  if (!card) {
    throw new Error(`Asset card not found: ${assetId}`);
  }

  const status = await services.redTeam.getStatus(assetId);
  const findings = await services.redTeam.getFindings(assetId);

  let context = services.cards.formatCard(card);
  context += "\n\n---\n\n";
  context += services.redTeam.formatStatus(status);
  context += "\n\n---\n\n";
  context += services.redTeam.formatFindings(findings);

  return {
    description: `Security review for ${card.metadata.name}`,
    messages: [
      {
        role: "user",
        content: {
          type: "text",
          text: `Review the security posture of "${assetId}" based on red team findings.

${context}

Analyze:
1. Critical vulnerabilities and their business impact
2. Attack patterns and potential exploit chains
3. Constraint violations and their implications
4. Effectiveness of current security controls
5. Comparison to industry best practices

Provide:
- Executive summary of security posture
- Prioritized remediation roadmap
- Recommendations for constraint updates
- Suggested additional red team scenarios
- Security architecture improvements`,
        },
      },
    ],
  };
}
