import { Command } from "commander";
import chalk from "chalk";
import ora from "ora";
import { existsSync, mkdirSync, writeFileSync, readFileSync } from "fs";
import { join, dirname } from "path";
import YAML from "yaml";
import { loadAssetCard, type AssetCard } from "@aigrc/core";
import { printHeader, printSubheader, printSuccess, printError, printInfo, printWarning } from "../utils/output.js";

// ─────────────────────────────────────────────────────────────────
// GENERATE COMMAND
// ─────────────────────────────────────────────────────────────────

interface GenerateOptions {
  profile?: string;
  template?: string;
  all?: boolean;
  outputDir?: string;
  force?: boolean;
}

// Artifact templates per profile
const ARTIFACT_TEMPLATES: Record<string, { id: string; name: string; requiredFor: string[]; format: string }[]> = {
  "eu-ai-act": [
    { id: "risk-management-plan", name: "Risk Management Plan", requiredFor: ["high"], format: "md" },
    { id: "technical-documentation", name: "Technical Documentation", requiredFor: ["high"], format: "md" },
    { id: "conformity-declaration", name: "EU Declaration of Conformity", requiredFor: ["high"], format: "md" },
  ],
  "us-omb-m24": [
    { id: "ai-impact-assessment", name: "AI Impact Assessment", requiredFor: ["rights-impacting", "safety-impacting"], format: "md" },
    { id: "equity-assessment", name: "Equity Assessment", requiredFor: ["rights-impacting"], format: "md" },
  ],
  "nist-ai-rmf": [
    { id: "nist-profile", name: "NIST AI RMF Profile", requiredFor: ["moderate", "high", "critical"], format: "yaml" },
    { id: "nist-playbook", name: "NIST AI RMF Playbook", requiredFor: ["high", "critical"], format: "md" },
  ],
  "iso-42001": [
    { id: "aims-policy", name: "AIMS Policy", requiredFor: ["low", "medium", "high", "critical"], format: "md" },
    { id: "aims-manual", name: "AIMS Manual", requiredFor: ["high", "critical"], format: "md" },
    { id: "risk-treatment-plan", name: "Risk Treatment Plan", requiredFor: ["medium", "high", "critical"], format: "md" },
  ],
};

const RISK_MAPPINGS: Record<string, Record<string, string>> = {
  "eu-ai-act": { minimal: "minimal", limited: "limited", high: "high", unacceptable: "unacceptable" },
  "us-omb-m24": { minimal: "neither", limited: "neither", high: "rights-impacting", unacceptable: "safety-impacting" },
  "nist-ai-rmf": { minimal: "minimal", limited: "low", high: "high", unacceptable: "critical" },
  "iso-42001": { minimal: "low", limited: "medium", high: "high", unacceptable: "critical" },
};

const PROFILE_NAMES: Record<string, string> = {
  "eu-ai-act": "EU AI Act",
  "us-omb-m24": "US OMB M-24",
  "nist-ai-rmf": "NIST AI RMF",
  "iso-42001": "ISO/IEC 42001",
};

export const generateCommand = new Command("generate")
  .description("Generate compliance artifacts from templates")
  .argument("<assetPath>", "Path to asset card YAML file")
  .option("-p, --profile <profile>", "Profile ID for templates")
  .option("-t, --template <template>", "Specific template ID to generate")
  .option("-a, --all", "Generate all required artifacts")
  .option("-o, --output-dir <dir>", "Output directory", ".aigrc/artifacts")
  .option("-f, --force", "Overwrite existing files")
  .action(async (assetPath: string, options: GenerateOptions) => {
    await runGenerate(assetPath, options);
  });

async function runGenerate(assetPath: string, options: GenerateOptions): Promise<void> {
  printHeader();

  // Load asset card
  if (!existsSync(assetPath)) {
    printError(`Asset card not found: ${assetPath}`);
    process.exit(1);
  }

  const spinner = ora("Loading asset card...").start();

  let card: AssetCard;
  try {
    card = loadAssetCard(assetPath);
    spinner.succeed(`Loaded: ${card.name}`);
  } catch (error) {
    spinner.fail("Failed to load asset card");
    printError(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }

  // Determine profile
  const profileId = options.profile || loadActiveProfiles()[0];
  const templates = ARTIFACT_TEMPLATES[profileId];

  if (!templates) {
    printError(`Unknown profile: ${profileId}`);
    printInfo(`Available profiles: ${Object.keys(ARTIFACT_TEMPLATES).join(", ")}`);
    process.exit(1);
  }

  // Determine risk level for this profile
  const mapping = RISK_MAPPINGS[profileId];
  const mappedLevel = mapping[card.classification.riskLevel] || card.classification.riskLevel;

  // Determine which templates to generate
  let templatesToGenerate = templates.filter((t) => t.requiredFor.includes(mappedLevel));

  if (options.template) {
    const specific = templates.find((t) => t.id === options.template);
    if (!specific) {
      printError(`Template not found: ${options.template}`);
      printInfo(`Available templates: ${templates.map((t) => t.id).join(", ")}`);
      process.exit(1);
    }
    templatesToGenerate = [specific];
  }

  if (!options.all && !options.template && templatesToGenerate.length === 0) {
    printInfo(`No artifacts required for risk level: ${mappedLevel}`);
    printInfo("Use --all to generate all available templates");
    return;
  }

  if (options.all) {
    templatesToGenerate = templates;
  }

  console.log();
  printSubheader(`Generating Artifacts (${PROFILE_NAMES[profileId]})`);
  console.log();
  printInfo(`Risk Level: ${mappedLevel}`);
  printInfo(`Output Directory: ${options.outputDir}`);
  console.log();

  // Create output directory
  const outputDir = join(process.cwd(), options.outputDir || ".aigrc/artifacts", profileId);
  if (!existsSync(outputDir)) {
    mkdirSync(outputDir, { recursive: true });
  }

  // Generate each template
  let generated = 0;
  let skipped = 0;

  for (const template of templatesToGenerate) {
    const filename = `${template.id}.${template.format}`;
    const outputPath = join(outputDir, filename);

    if (existsSync(outputPath) && !options.force) {
      printWarning(`Skipped (exists): ${filename}`);
      skipped++;
      continue;
    }

    const content = generateTemplateContent(card, profileId, template);
    writeFileSync(outputPath, content, "utf-8");
    printSuccess(`Generated: ${filename}`);
    generated++;
  }

  console.log();
  printInfo(`Generated: ${generated}, Skipped: ${skipped}`);

  if (skipped > 0) {
    printInfo("Use --force to overwrite existing files");
  }
}

function generateTemplateContent(
  card: AssetCard,
  profileId: string,
  template: { id: string; name: string; format: string }
): string {
  const now = new Date().toISOString().split("T")[0];

  if (template.format === "yaml") {
    return generateYamlTemplate(card, profileId, template);
  }

  // Markdown template
  return `# ${template.name}

## Document Information

| Field | Value |
|-------|-------|
| Asset Name | ${card.name} |
| Asset ID | ${card.id} |
| Profile | ${PROFILE_NAMES[profileId]} |
| Generated | ${now} |
| Version | 1.0 |

---

## 1. Overview

${card.description || "No description provided."}

### 1.1 Asset Classification

- **Risk Level:** ${card.classification.riskLevel.toUpperCase()}
- **Asset Type:** ${card.technical.type}
- **Framework:** ${card.technical.framework || "Not specified"}

### 1.2 Ownership

- **Owner:** ${card.ownership.owner.name}
- **Email:** ${card.ownership.owner.email}
- **Team:** ${card.ownership.team || "Not specified"}

---

## 2. ${getSection2Title(template.id)}

${getSection2Content(template.id, card)}

---

## 3. Risk Factors

| Factor | Status |
|--------|--------|
| Autonomous Decisions | ${card.classification.riskFactors.autonomousDecisions ? "Yes" : "No"} |
| Customer Facing | ${card.classification.riskFactors.customerFacing ? "Yes" : "No"} |
| Tool Execution | ${card.classification.riskFactors.toolExecution ? "Yes" : "No"} |
| External Data Access | ${card.classification.riskFactors.externalDataAccess ? "Yes" : "No"} |
| PII Processing | ${card.classification.riskFactors.piiProcessing} |
| High Stakes Decisions | ${card.classification.riskFactors.highStakesDecisions ? "Yes" : "No"} |

---

## 4. Governance Status

- **Status:** ${card.governance.status}
- **Approvals:** ${card.governance.approvals.length}

---

## 5. Next Steps

- [ ] Review and complete all sections
- [ ] Obtain required approvals
- [ ] Update asset card with artifact path
- [ ] Schedule periodic review

---

*This document was auto-generated by AIGRC CLI. Review and customize as needed.*
`;
}

function generateYamlTemplate(
  card: AssetCard,
  profileId: string,
  template: { id: string; name: string }
): string {
  const content = {
    $schema: `https://aigrc.dev/schemas/${template.id}/v1`,
    metadata: {
      assetId: card.id,
      assetName: card.name,
      profile: profileId,
      generated: new Date().toISOString(),
      version: "1.0",
    },
    classification: {
      riskLevel: card.classification.riskLevel,
      riskFactors: card.classification.riskFactors,
    },
    governance: {
      status: card.governance.status,
      approvalCount: card.governance.approvals.length,
    },
    // Profile-specific sections would go here
    implementation: {
      status: "draft",
      completedSections: [],
      pendingSections: ["All sections require review"],
    },
  };

  return YAML.stringify(content, { indent: 2 });
}

function getSection2Title(templateId: string): string {
  const titles: Record<string, string> = {
    "risk-management-plan": "Risk Management",
    "technical-documentation": "Technical Specification",
    "conformity-declaration": "Declaration of Conformity",
    "ai-impact-assessment": "Impact Assessment",
    "equity-assessment": "Equity Analysis",
    "nist-playbook": "Implementation Playbook",
    "aims-policy": "AI Management Policy",
    "aims-manual": "Management System",
    "risk-treatment-plan": "Risk Treatment",
  };
  return titles[templateId] || "Details";
}

function getSection2Content(templateId: string, card: AssetCard): string {
  // Return placeholder content based on template type
  const content: Record<string, string> = {
    "risk-management-plan": `
### 2.1 Risk Identification

*Document identified risks associated with the AI system.*

### 2.2 Risk Analysis

*Analyze the likelihood and impact of identified risks.*

### 2.3 Risk Mitigation

*Define mitigation strategies for each risk.*

### 2.4 Monitoring

*Define ongoing monitoring procedures.*
`,
    "technical-documentation": `
### 2.1 System Architecture

*Describe the technical architecture of the AI system.*

### 2.2 Training Data

*Document training data sources, quality measures, and governance.*

### 2.3 Model Performance

*Document accuracy, robustness, and performance metrics.*

### 2.4 Integration Points

*Document integration with other systems.*
`,
    "ai-impact-assessment": `
### 2.1 Purpose and Scope

*Define the purpose and intended use of the AI system.*

### 2.2 Affected Populations

*Identify populations affected by AI decisions.*

### 2.3 Impact Analysis

*Analyze potential impacts on affected populations.*

### 2.4 Mitigation Measures

*Document measures to mitigate negative impacts.*
`,
  };

  return content[templateId] || `
### 2.1 Purpose

*Define the purpose of this document.*

### 2.2 Scope

*Define the scope and applicability.*

### 2.3 Implementation

*Document implementation details.*
`;
}

function loadActiveProfiles(): string[] {
  const configPath = join(process.cwd(), ".aigrc.yaml");

  if (!existsSync(configPath)) {
    return ["eu-ai-act"];
  }

  try {
    const content = readFileSync(configPath, "utf-8");
    const config = YAML.parse(content);
    return config?.profiles || ["eu-ai-act"];
  } catch {
    return ["eu-ai-act"];
  }
}
