import { Command } from "commander";
import chalk from "chalk";
import ora from "ora";
import { existsSync, mkdirSync, writeFileSync, readFileSync, readdirSync } from "fs";
import { join, basename } from "path";
import YAML from "yaml";
import { loadAssetCard, type AssetCard } from "@aigrc/core";
import { printHeader, printSubheader, printSuccess, printError, printInfo } from "../utils/output.js";

// ─────────────────────────────────────────────────────────────────
// REPORT COMMAND
// ─────────────────────────────────────────────────────────────────

interface GapOptions {
  profiles?: string[];
  output?: string;
  format?: "md" | "json" | "yaml";
}

interface CrosswalkOptions {
  profiles?: string[];
  output?: string;
  format?: "md" | "json" | "yaml";
}

interface AuditOptions {
  profile?: string;
  output?: string;
  includeAssets?: string[];
}

const PROFILE_NAMES: Record<string, string> = {
  "eu-ai-act": "EU AI Act",
  "us-omb-m24": "US OMB M-24",
  "nist-ai-rmf": "NIST AI RMF",
  "iso-42001": "ISO/IEC 42001",
};

const RISK_MAPPINGS: Record<string, Record<string, string>> = {
  "eu-ai-act": { minimal: "minimal", limited: "limited", high: "high", unacceptable: "unacceptable" },
  "us-omb-m24": { minimal: "neither", limited: "neither", high: "rights-impacting", unacceptable: "safety-impacting" },
  "nist-ai-rmf": { minimal: "minimal", limited: "low", high: "high", unacceptable: "critical" },
  "iso-42001": { minimal: "low", limited: "medium", high: "high", unacceptable: "critical" },
};

const CONTROL_CROSSWALK: Record<string, Record<string, string[]>> = {
  risk_management: {
    "eu-ai-act": ["eu-art-9"],
    "us-omb-m24": ["us-aia"],
    "nist-ai-rmf": ["nist-govern", "nist-manage"],
    "iso-42001": ["iso-a6"],
  },
  human_oversight: {
    "eu-ai-act": ["eu-art-14"],
    "us-omb-m24": ["us-human-oversight"],
    "nist-ai-rmf": ["nist-govern"],
    "iso-42001": ["iso-a8"],
  },
  transparency: {
    "eu-ai-act": ["eu-art-13", "eu-art-50"],
    "us-omb-m24": ["us-notice"],
    "nist-ai-rmf": ["nist-govern"],
    "iso-42001": ["iso-a7"],
  },
  testing: {
    "eu-ai-act": ["eu-art-15"],
    "us-omb-m24": ["us-safety-testing"],
    "nist-ai-rmf": ["nist-measure"],
    "iso-42001": ["iso-a9"],
  },
  data_governance: {
    "eu-ai-act": ["eu-art-10"],
    "nist-ai-rmf": ["nist-map"],
    "iso-42001": ["iso-a8"],
  },
};

export const reportCommand = new Command("report")
  .description("Generate compliance reports")
  .addCommand(
    new Command("gap")
      .description("Generate gap analysis report")
      .argument("[assetPath]", "Path to asset card (or all in .aigrc/cards)")
      .option("-p, --profiles <profiles...>", "Profile IDs to analyze")
      .option("-o, --output <file>", "Output file path")
      .option("-f, --format <format>", "Format (md, json, yaml)", "md")
      .action(async (assetPath: string | undefined, options: GapOptions) => {
        await generateGapReport(assetPath, options);
      })
  )
  .addCommand(
    new Command("crosswalk")
      .description("Generate cross-framework mapping report")
      .argument("<assetPath>", "Path to asset card")
      .option("-p, --profiles <profiles...>", "Profile IDs to include")
      .option("-o, --output <file>", "Output file path")
      .option("-f, --format <format>", "Format (md, json, yaml)", "md")
      .action(async (assetPath: string, options: CrosswalkOptions) => {
        await generateCrosswalkReport(assetPath, options);
      })
  )
  .addCommand(
    new Command("audit")
      .description("Generate audit package")
      .option("-p, --profile <profile>", "Profile ID", "eu-ai-act")
      .option("-o, --output <dir>", "Output directory")
      .option("--include-assets <assets...>", "Specific asset card paths")
      .action(async (options: AuditOptions) => {
        await generateAuditPackage(options);
      })
  );

async function generateGapReport(assetPath: string | undefined, options: GapOptions): Promise<void> {
  printHeader();

  const spinner = ora("Loading assets...").start();

  // Load asset cards
  let cards: { path: string; card: AssetCard }[] = [];

  if (assetPath) {
    try {
      const card = loadAssetCard(assetPath);
      cards.push({ path: assetPath, card });
    } catch (error) {
      spinner.fail("Failed to load asset card");
      printError(error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  } else {
    // Load all cards from .aigrc/cards
    const cardsDir = join(process.cwd(), ".aigrc/cards");
    if (existsSync(cardsDir)) {
      const files = readdirSync(cardsDir).filter((f) => f.endsWith(".yaml") || f.endsWith(".yml"));
      for (const file of files) {
        try {
          const card = loadAssetCard(join(cardsDir, file));
          cards.push({ path: join(cardsDir, file), card });
        } catch {
          // Skip invalid cards
        }
      }
    }
  }

  if (cards.length === 0) {
    spinner.fail("No asset cards found");
    process.exit(1);
  }

  spinner.succeed(`Loaded ${cards.length} asset(s)`);

  // Determine profiles
  const profileIds = options.profiles || loadActiveProfiles();

  // Analyze gaps
  const gaps: {
    assetId: string;
    assetName: string;
    profiles: {
      profileId: string;
      riskLevel: string;
      gaps: { control: string; severity: string }[];
    }[];
  }[] = [];

  for (const { card } of cards) {
    const assetGaps: (typeof gaps)[0] = {
      assetId: card.id,
      assetName: card.name,
      profiles: [],
    };

    for (const profileId of profileIds) {
      const mapping = RISK_MAPPINGS[profileId];
      if (!mapping) continue;

      const mappedLevel = mapping[card.classification.riskLevel] || card.classification.riskLevel;

      // Simplified gap detection
      const gapList: { control: string; severity: string }[] = [];

      // Check if basic governance is in place
      if (card.governance.approvals.length === 0) {
        gapList.push({ control: "Governance Approvals", severity: "high" });
      }
      if (!card.intent.linked) {
        gapList.push({ control: "Golden Thread Link", severity: "medium" });
      }
      if (!card.intent.businessJustification) {
        gapList.push({ control: "Business Justification", severity: "medium" });
      }

      assetGaps.profiles.push({
        profileId,
        riskLevel: mappedLevel,
        gaps: gapList,
      });
    }

    gaps.push(assetGaps);
  }

  // Generate output
  const now = new Date().toISOString().split("T")[0];

  if (options.format === "json") {
    const output = JSON.stringify({ generated: now, gaps }, null, 2);
    if (options.output) {
      writeFileSync(options.output, output, "utf-8");
      printSuccess(`Report saved to: ${options.output}`);
    } else {
      console.log(output);
    }
    return;
  }

  if (options.format === "yaml") {
    const output = YAML.stringify({ generated: now, gaps });
    if (options.output) {
      writeFileSync(options.output, output, "utf-8");
      printSuccess(`Report saved to: ${options.output}`);
    } else {
      console.log(output);
    }
    return;
  }

  // Markdown output
  let md = `# Gap Analysis Report

**Generated:** ${now}
**Assets Analyzed:** ${cards.length}
**Profiles:** ${profileIds.join(", ")}

---

`;

  for (const assetGaps of gaps) {
    md += `## ${assetGaps.assetName}\n\n`;
    md += `**Asset ID:** ${assetGaps.assetId}\n\n`;

    for (const profile of assetGaps.profiles) {
      md += `### ${PROFILE_NAMES[profile.profileId] || profile.profileId}\n\n`;
      md += `**Risk Level:** ${profile.riskLevel}\n\n`;

      if (profile.gaps.length === 0) {
        md += "No gaps identified.\n\n";
      } else {
        md += "| Gap | Severity |\n";
        md += "|-----|----------|\n";
        for (const gap of profile.gaps) {
          md += `| ${gap.control} | ${gap.severity.toUpperCase()} |\n`;
        }
        md += "\n";
      }
    }

    md += "---\n\n";
  }

  if (options.output) {
    writeFileSync(options.output, md, "utf-8");
    printSuccess(`Report saved to: ${options.output}`);
  } else {
    console.log(md);
  }
}

async function generateCrosswalkReport(assetPath: string, options: CrosswalkOptions): Promise<void> {
  printHeader();

  // Load asset card
  if (!existsSync(assetPath)) {
    printError(`Asset card not found: ${assetPath}`);
    process.exit(1);
  }

  let card: AssetCard;
  try {
    card = loadAssetCard(assetPath);
  } catch (error) {
    printError(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }

  // Determine profiles
  const profileIds = options.profiles || Object.keys(RISK_MAPPINGS);

  // Build crosswalk
  const classifications: { profileId: string; profileName: string; riskLevel: string }[] = [];

  for (const profileId of profileIds) {
    const mapping = RISK_MAPPINGS[profileId];
    if (!mapping) continue;

    const mappedLevel = mapping[card.classification.riskLevel] || card.classification.riskLevel;
    classifications.push({
      profileId,
      profileName: PROFILE_NAMES[profileId] || profileId,
      riskLevel: mappedLevel,
    });
  }

  const now = new Date().toISOString().split("T")[0];

  if (options.format === "json") {
    const output = JSON.stringify(
      {
        generated: now,
        asset: { id: card.id, name: card.name },
        aigrcRiskLevel: card.classification.riskLevel,
        classifications,
        controlCrosswalk: CONTROL_CROSSWALK,
      },
      null,
      2
    );
    if (options.output) {
      writeFileSync(options.output, output, "utf-8");
      printSuccess(`Report saved to: ${options.output}`);
    } else {
      console.log(output);
    }
    return;
  }

  if (options.format === "yaml") {
    const output = YAML.stringify({
      generated: now,
      asset: { id: card.id, name: card.name },
      aigrcRiskLevel: card.classification.riskLevel,
      classifications,
      controlCrosswalk: CONTROL_CROSSWALK,
    });
    if (options.output) {
      writeFileSync(options.output, output, "utf-8");
      printSuccess(`Report saved to: ${options.output}`);
    } else {
      console.log(output);
    }
    return;
  }

  // Markdown output
  let md = `# Cross-Framework Mapping Report

**Generated:** ${now}
**Asset:** ${card.name} (${card.id})
**AIGRC Risk Level:** ${card.classification.riskLevel.toUpperCase()}

---

## Risk Level Mapping

| Framework | Risk Level |
|-----------|------------|
`;

  for (const c of classifications) {
    md += `| ${c.profileName} | ${c.riskLevel.toUpperCase()} |\n`;
  }

  md += `
---

## Control Crosswalk

| Category | EU AI Act | US OMB | NIST AI RMF | ISO 42001 |
|----------|-----------|--------|-------------|-----------|
`;

  for (const [category, mappings] of Object.entries(CONTROL_CROSSWALK)) {
    const eu = mappings["eu-ai-act"]?.join(", ") || "-";
    const us = mappings["us-omb-m24"]?.join(", ") || "-";
    const nist = mappings["nist-ai-rmf"]?.join(", ") || "-";
    const iso = mappings["iso-42001"]?.join(", ") || "-";
    md += `| ${category.replace(/_/g, " ")} | ${eu} | ${us} | ${nist} | ${iso} |\n`;
  }

  md += `
---

*This report shows how controls and risk levels map across different regulatory frameworks.*
`;

  if (options.output) {
    writeFileSync(options.output, md, "utf-8");
    printSuccess(`Report saved to: ${options.output}`);
  } else {
    console.log(md);
  }
}

async function generateAuditPackage(options: AuditOptions): Promise<void> {
  printHeader();
  printSubheader("Generating Audit Package");

  const spinner = ora("Collecting assets...").start();

  // Collect asset cards
  let cardPaths: string[] = [];

  if (options.includeAssets && options.includeAssets.length > 0) {
    cardPaths = options.includeAssets;
  } else {
    const cardsDir = join(process.cwd(), ".aigrc/cards");
    if (existsSync(cardsDir)) {
      cardPaths = readdirSync(cardsDir)
        .filter((f) => f.endsWith(".yaml") || f.endsWith(".yml"))
        .map((f) => join(cardsDir, f));
    }
  }

  if (cardPaths.length === 0) {
    spinner.fail("No asset cards found");
    process.exit(1);
  }

  const cards: AssetCard[] = [];
  for (const path of cardPaths) {
    try {
      cards.push(loadAssetCard(path));
    } catch {
      // Skip invalid
    }
  }

  spinner.succeed(`Found ${cards.length} asset(s)`);

  // Create output directory
  const now = new Date().toISOString().split("T")[0];
  const outputDir = options.output || join(process.cwd(), `.aigrc/audit-${now}`);
  mkdirSync(outputDir, { recursive: true });

  // Generate audit package
  const profileId = options.profile || "eu-ai-act";
  const profileName = PROFILE_NAMES[profileId] || profileId;

  // 1. Executive Summary
  const summary = `# Audit Package: ${profileName}

**Generated:** ${now}
**Profile:** ${profileName}
**Total Assets:** ${cards.length}

## Executive Summary

This audit package contains compliance documentation for ${cards.length} AI asset(s) under the ${profileName} framework.

## Assets Included

| Asset Name | Risk Level | Governance Status |
|------------|------------|-------------------|
${cards.map((c) => `| ${c.name} | ${c.classification.riskLevel} | ${c.governance.status} |`).join("\n")}

## Next Steps

1. Review individual asset cards
2. Complete gap analysis
3. Generate required artifacts
4. Obtain necessary approvals
`;

  writeFileSync(join(outputDir, "README.md"), summary, "utf-8");

  // 2. Copy asset cards
  const assetsDir = join(outputDir, "assets");
  mkdirSync(assetsDir, { recursive: true });

  for (const card of cards) {
    const filename = `${card.id}.yaml`;
    writeFileSync(join(assetsDir, filename), YAML.stringify(card, { indent: 2 }), "utf-8");
  }

  // 3. Generate inventory
  const inventory = {
    generated: now,
    profile: profileId,
    totalAssets: cards.length,
    byRiskLevel: {
      minimal: cards.filter((c) => c.classification.riskLevel === "minimal").length,
      limited: cards.filter((c) => c.classification.riskLevel === "limited").length,
      high: cards.filter((c) => c.classification.riskLevel === "high").length,
      unacceptable: cards.filter((c) => c.classification.riskLevel === "unacceptable").length,
    },
    byStatus: {
      draft: cards.filter((c) => c.governance.status === "draft").length,
      approved: cards.filter((c) => c.governance.status === "approved").length,
      production: cards.filter((c) => c.governance.status === "production").length,
    },
    assets: cards.map((c) => ({
      id: c.id,
      name: c.name,
      riskLevel: c.classification.riskLevel,
      status: c.governance.status,
    })),
  };

  writeFileSync(join(outputDir, "inventory.yaml"), YAML.stringify(inventory, { indent: 2 }), "utf-8");

  console.log();
  printSuccess(`Audit package created: ${outputDir}`);
  printInfo(`  - README.md (Executive Summary)`);
  printInfo(`  - inventory.yaml (Asset Inventory)`);
  printInfo(`  - assets/ (${cards.length} asset cards)`);
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
