import * as core from "@actions/core";
import * as github from "@actions/github";
import * as path from "path";
import * as fs from "fs";
import {
  scan,
  initializePatterns,
  loadAssetCard,
  validateAssetCard,
  classifyRisk,
  suggestAssetCard,
  type ScanResult,
  type AssetCard,
  type ClassificationResult,
} from "@aigrc/core";
import {
  loadGovernanceLock,
  scanDirectory,
  generateSarifReport,
  type ScanResult as PolicyScanResult,
} from "@aigrc/i2e-firewall";
import {
  createActionBuilder,
  buildScanEvents,
  buildCardEvents,
  buildPolicyEvents,
  pushAllEvents,
  buildPrGoldenThread,
  buildOrphanGoldenThread,
  type PolicyResultForPush,
} from "./event-push.js";

// ─────────────────────────────────────────────────────────────────
// MAIN ACTION
// ─────────────────────────────────────────────────────────────────

async function run(): Promise<void> {
  try {
    // Get inputs
    const directory = core.getInput("directory") || ".";
    const governanceLockPath = core.getInput("governance-lock") || "governance.lock";
    const checkPolicy = core.getBooleanInput("check-policy");
    const failOnViolations = core.getBooleanInput("fail-on-violations");
    const failOnWarnings = core.getBooleanInput("fail-on-warnings");
    const uploadSarif = core.getBooleanInput("upload-sarif");
    const failOnHighRisk = core.getBooleanInput("fail-on-high-risk");
    const failOnUnregistered = core.getBooleanInput("fail-on-unregistered");
    const validateCards = core.getBooleanInput("validate-cards");
    const createPrComment = core.getBooleanInput("create-pr-comment");
    const githubToken = core.getInput("github-token");

    const workspacePath = process.env.GITHUB_WORKSPACE || process.cwd();
    const scanPath = path.resolve(workspacePath, directory);
    const fullLockPath = path.resolve(scanPath, governanceLockPath);

    core.info(`AIGRC: Scanning ${scanPath}`);

    // Initialize pattern registry
    initializePatterns();

    // Run scan
    core.startGroup("Scanning for AI/ML frameworks");
    const scanResult = await scan({
      directory: scanPath,
      ignorePatterns: ["node_modules", ".git", "dist", "build", "__pycache__", ".venv", "vendor"],
    });
    core.endGroup();

    core.info(`Scanned ${scanResult.scannedFiles} files`);
    core.info(`Found ${scanResult.detections.length} AI/ML framework detections`);

    // Set outputs
    core.setOutput("detections-count", scanResult.detections.length);
    core.setOutput("high-confidence-count", scanResult.summary.byConfidence.high);
    core.setOutput("scan-results", JSON.stringify(scanResult));

    // Load and validate asset cards
    const cardsDir = path.join(scanPath, ".aigrc", "cards");
    const cardResults = await validateAssetCards(cardsDir, validateCards);

    core.setOutput("cards-count", cardResults.cards.length);
    core.setOutput("cards-valid", cardResults.allValid);

    // Determine highest risk level
    const highestRisk = determineHighestRisk(cardResults.cards);
    core.setOutput("risk-level", highestRisk);

    // ─────────────────────────────────────────────────────────────────
    // POLICY CHECKING (AIG-149, AIG-150)
    // ─────────────────────────────────────────────────────────────────
    let policyResult: PolicyScanResult | undefined;
    let governanceLockValid = false;

    if (checkPolicy) {
      core.startGroup("Checking policy violations");

      // Load governance.lock
      const lockResult = await loadGovernanceLock(fullLockPath);

      if (!lockResult.valid || !lockResult.air) {
        core.warning(`governance.lock not valid: ${lockResult.errors.join(", ")}`);
        core.setOutput("governance-lock-valid", false);
        core.setOutput("policy-passed", false);
        core.setOutput("policy-violations", 0);
        core.setOutput("policy-errors", 0);
        core.setOutput("policy-warnings", 0);
      } else {
        governanceLockValid = true;
        core.setOutput("governance-lock-valid", true);

        // Show warnings about expiring lock
        for (const warning of lockResult.warnings) {
          core.warning(warning);
        }

        // Scan for policy violations
        policyResult = await scanDirectory(scanPath, lockResult.air, {
          includePatterns: ["**/*.ts", "**/*.js", "**/*.py", "**/*.tsx", "**/*.jsx"],
          excludePatterns: ["**/node_modules/**", "**/dist/**", "**/.git/**", "**/build/**"],
          failOnWarnings,
        });

        const errorCount = policyResult.violations.filter((v) => v.severity === "error").length;
        const warningCount = policyResult.violations.filter((v) => v.severity === "warning").length;

        core.setOutput("policy-violations", policyResult.violations.length);
        core.setOutput("policy-errors", errorCount);
        core.setOutput("policy-warnings", warningCount);
        core.setOutput("policy-passed", policyResult.passed);

        core.info(`Policy violations: ${policyResult.violations.length} (${errorCount} errors, ${warningCount} warnings)`);
        core.info(`Policy check: ${policyResult.passed ? "PASSED" : "FAILED"}`);

        // Log violations
        if (policyResult.violations.length > 0) {
          for (const violation of policyResult.violations.slice(0, 20)) {
            const location = violation.file ? `${violation.file}:${violation.line}` : "unknown";
            if (violation.severity === "error") {
              core.error(violation.message, {
                file: violation.file,
                startLine: violation.line,
                startColumn: violation.column,
              });
            } else {
              core.warning(violation.message, {
                file: violation.file,
                startLine: violation.line,
                startColumn: violation.column,
              });
            }
          }

          if (policyResult.violations.length > 20) {
            core.info(`... and ${policyResult.violations.length - 20} more violations`);
          }
        }

        // Generate and upload SARIF report
        if (uploadSarif && policyResult.violations.length > 0) {
          const sarifPath = path.join(scanPath, "aigrc-policy-results.sarif");
          const sarifReport = generateSarifReport(policyResult, {
            baseDir: scanPath,
            toolVersion: "1.0.0",
          });

          fs.writeFileSync(sarifPath, JSON.stringify(sarifReport, null, 2));
          core.setOutput("sarif-path", sarifPath);
          core.info(`SARIF report written to ${sarifPath}`);
        }
      }

      core.endGroup();
    }

    // ─────────────────────────────────────────────────────────────────
    // AIGOS EVENT PUSH (AIG-218)
    // ─────────────────────────────────────────────────────────────────
    const pushEnabled = core.getInput("push") === "true";
    const pushOn = core.getInput("push-on") || "pr";
    const aigosApiUrl = core.getInput("aigos-api-url") || process.env.AIGOS_API_URL;
    const aigosApiKey = process.env.AIGRC_API_KEY || process.env.AIGOS_API_KEY;
    const aigosOrgId = core.getInput("aigos-org-id") || process.env.AIGOS_ORG_ID || "org-default";

    if (pushEnabled && aigosApiUrl && aigosApiKey) {
      const shouldPush = shouldPushEvents(pushOn);

      if (shouldPush) {
        core.startGroup("Pushing governance events to AIGOS");
        try {
          const builder = createActionBuilder(aigosOrgId);
          const prNumber = github.context.payload.pull_request?.number;
          const { owner, repo } = github.context.repo;
          const correlationId = prNumber
            ? `corr_pr_${prNumber}_governance_check`
            : `corr_run_${process.env.GITHUB_RUN_ID || "local"}`;

          const goldenThread = prNumber
            ? buildPrGoldenThread(owner, repo, prNumber)
            : buildOrphanGoldenThread();

          // Build all governance events
          const allEvents = [
            ...buildScanEvents(scanResult, builder, goldenThread, correlationId),
            ...buildCardEvents(cardResults.cards, builder, goldenThread, correlationId),
            ...(policyResult
              ? buildPolicyEvents(
                  {
                    passed: policyResult.passed,
                    violations: policyResult.violations.map((v) => ({
                      rule: (v as any).rule || "policy-violation",
                      severity: v.severity,
                      message: v.message,
                      file: v.file,
                      line: v.line,
                    })),
                  },
                  builder,
                  goldenThread,
                  correlationId,
                )
              : []),
          ];

          core.info(`Built ${allEvents.length} governance events`);

          const pushResult = await pushAllEvents(
            allEvents,
            aigosApiUrl,
            aigosApiKey,
            aigosOrgId,
          );

          core.setOutput("push-status", "success");
          core.setOutput("push-accepted", pushResult.accepted);
          core.setOutput("push-rejected", pushResult.rejected);
          core.setOutput("aigos-dashboard-url", `${aigosApiUrl.replace("/v1", "")}/orgs/${aigosOrgId}`);
          core.info(`AIGOS: ${pushResult.accepted} events accepted, ${pushResult.rejected} rejected`);

          if (pushResult.warnings.length > 0) {
            for (const w of pushResult.warnings) {
              core.warning(`AIGOS: ${w}`);
            }
          }
        } catch (error) {
          core.setOutput("push-status", "failed");
          core.setOutput("push-accepted", 0);
          core.setOutput("push-rejected", 0);
          core.warning(`AIGOS push failed: ${error instanceof Error ? error.message : String(error)}`);
        }
        core.endGroup();
      } else {
        core.setOutput("push-status", "skipped");
        core.info(`AIGOS push skipped (push-on: ${pushOn}, event: ${github.context.eventName})`);
      }
    } else if (pushEnabled) {
      core.setOutput("push-status", "skipped");
      core.warning("AIGOS push enabled but aigos-api-url or AIGRC_API_KEY not configured");
    }

    // Log summary
    logSummary(scanResult, cardResults, highestRisk, policyResult);

    // Create PR comment if enabled
    if (createPrComment && github.context.eventName === "pull_request" && githubToken) {
      await createComment(githubToken, scanResult, cardResults, highestRisk, policyResult);
    }

    // Determine if action should fail
    let shouldFail = false;
    let failReason = "";

    // Policy violations check
    if (checkPolicy && policyResult && !policyResult.passed && failOnViolations) {
      shouldFail = true;
      const errorCount = policyResult.violations.filter((v) => v.severity === "error").length;
      failReason = `Policy violations detected: ${errorCount} errors`;
    }

    if (failOnHighRisk && (highestRisk === "high" || highestRisk === "unacceptable")) {
      shouldFail = true;
      failReason = `High-risk AI assets detected (${highestRisk})`;
    }

    if (failOnUnregistered && scanResult.detections.length > 0 && cardResults.cards.length === 0) {
      shouldFail = true;
      failReason = `AI frameworks detected but no asset cards found`;
    }

    if (!cardResults.allValid) {
      shouldFail = true;
      failReason = `Invalid asset cards detected`;
    }

    if (shouldFail) {
      core.setFailed(failReason);
    }
  } catch (error) {
    if (error instanceof Error) {
      core.setFailed(error.message);
    } else {
      core.setFailed("An unexpected error occurred");
    }
  }
}

// ─────────────────────────────────────────────────────────────────
// ASSET CARD VALIDATION
// ─────────────────────────────────────────────────────────────────

interface CardValidationResult {
  path: string;
  card: AssetCard;
  valid: boolean;
  errors: string[];
  classification: ClassificationResult;
}

interface CardResults {
  cards: CardValidationResult[];
  allValid: boolean;
}

async function validateAssetCards(cardsDir: string, doValidate: boolean): Promise<CardResults> {
  const results: CardValidationResult[] = [];

  if (!fs.existsSync(cardsDir)) {
    core.info("No asset cards directory found");
    return { cards: [], allValid: true };
  }

  core.startGroup("Validating asset cards");

  try {
    const files = fs.readdirSync(cardsDir);
    const yamlFiles = files.filter((f) => f.endsWith(".yaml") || f.endsWith(".yml"));

    for (const file of yamlFiles) {
      const filePath = path.join(cardsDir, file);

      try {
        const card = loadAssetCard(filePath);
        const classification = classifyRisk(card.classification.riskFactors);

        let valid = true;
        let errors: string[] = [];

        if (doValidate) {
          const validation = validateAssetCard(card);
          valid = validation.valid;
          errors = validation.errors || [];
        }

        if (valid) {
          core.info(`  ${file}: Valid (${classification.riskLevel})`);
        } else {
          core.warning(`  ${file}: Invalid - ${errors.join(", ")}`);
        }

        results.push({
          path: filePath,
          card,
          valid,
          errors,
          classification,
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        core.warning(`  ${file}: Parse error - ${message}`);

        results.push({
          path: filePath,
          card: {} as AssetCard,
          valid: false,
          errors: [message],
          classification: { riskLevel: "minimal", reasons: [], euAiActCategory: "", requiredArtifacts: [] },
        });
      }
    }
  } catch (error) {
    core.warning(`Failed to read cards directory: ${error}`);
  }

  core.endGroup();

  const allValid = results.every((r) => r.valid);
  return { cards: results, allValid };
}

// ─────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────

function determineHighestRisk(cards: CardValidationResult[]): string {
  const riskOrder = ["unacceptable", "high", "limited", "minimal"];

  for (const level of riskOrder) {
    if (cards.some((c) => c.classification.riskLevel === level)) {
      return level;
    }
  }

  return "minimal";
}

function logSummary(
  scanResult: ScanResult,
  cardResults: CardResults,
  highestRisk: string,
  policyResult?: PolicyScanResult
): void {
  core.info("");
  core.info("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  core.info("AIGRC Scan Summary");
  core.info("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  core.info(`Files scanned:        ${scanResult.scannedFiles}`);
  core.info(`AI detections:        ${scanResult.detections.length}`);
  core.info(`High confidence:      ${scanResult.summary.byConfidence.high}`);
  core.info(`Asset cards:          ${cardResults.cards.length}`);
  core.info(`Cards valid:          ${cardResults.allValid ? "Yes" : "No"}`);
  core.info(`Highest risk level:   ${highestRisk.toUpperCase()}`);

  // Policy results
  if (policyResult) {
    const errorCount = policyResult.violations.filter((v) => v.severity === "error").length;
    const warningCount = policyResult.violations.filter((v) => v.severity === "warning").length;
    core.info(`Policy violations:    ${policyResult.violations.length} (${errorCount} errors, ${warningCount} warnings)`);
    core.info(`Policy status:        ${policyResult.passed ? "PASSED" : "FAILED"}`);
  }

  core.info("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  // Log detections by framework
  if (scanResult.detections.length > 0) {
    core.info("");
    core.info("Detected Frameworks:");

    const byFramework = new Map<string, number>();
    for (const d of scanResult.detections) {
      byFramework.set(d.framework, (byFramework.get(d.framework) || 0) + 1);
    }

    for (const [framework, count] of byFramework) {
      core.info(`  - ${framework}: ${count} occurrences`);
    }
  }

  // Log card risk levels
  if (cardResults.cards.length > 0) {
    core.info("");
    core.info("Asset Cards:");

    for (const card of cardResults.cards) {
      const riskIcon = getRiskIcon(card.classification.riskLevel);
      core.info(`  ${riskIcon} ${card.card.name}: ${card.classification.riskLevel}`);
    }
  }
}

function getRiskIcon(level: string): string {
  switch (level) {
    case "minimal":
      return "🟢";
    case "limited":
      return "🟡";
    case "high":
      return "🟠";
    case "unacceptable":
      return "🔴";
    default:
      return "⚪";
  }
}

// ─────────────────────────────────────────────────────────────────
// PR COMMENT
// ─────────────────────────────────────────────────────────────────

async function createComment(
  token: string,
  scanResult: ScanResult,
  cardResults: CardResults,
  highestRisk: string,
  policyResult?: PolicyScanResult
): Promise<void> {
  try {
    const octokit = github.getOctokit(token);
    const { owner, repo } = github.context.repo;
    const prNumber = github.context.payload.pull_request?.number;

    if (!prNumber) {
      core.warning("No PR number found, skipping comment");
      return;
    }

    const body = generateCommentBody(scanResult, cardResults, highestRisk, policyResult);

    // Check for existing comment to update
    const { data: comments } = await octokit.rest.issues.listComments({
      owner,
      repo,
      issue_number: prNumber,
    });

    const existingComment = comments.find((c) =>
      c.body?.includes("<!-- aigrc-action-comment -->")
    );

    if (existingComment) {
      await octokit.rest.issues.updateComment({
        owner,
        repo,
        comment_id: existingComment.id,
        body,
      });
      core.info("Updated existing PR comment");
    } else {
      await octokit.rest.issues.createComment({
        owner,
        repo,
        issue_number: prNumber,
        body,
      });
      core.info("Created PR comment");
    }
  } catch (error) {
    core.warning(`Failed to create PR comment: ${error}`);
  }
}

function generateCommentBody(
  scanResult: ScanResult,
  cardResults: CardResults,
  highestRisk: string,
  policyResult?: PolicyScanResult
): string {
  const policyPassed = policyResult ? policyResult.passed : true;
  const statusIcon = getStatusIcon(highestRisk, cardResults.allValid, policyPassed);

  const errorCount = policyResult?.violations.filter((v) => v.severity === "error").length ?? 0;
  const warningCount = policyResult?.violations.filter((v) => v.severity === "warning").length ?? 0;

  let body = `<!-- aigrc-action-comment -->
## ${statusIcon} AIGRC Governance Report

### Summary

| Metric | Value |
|--------|-------|
| Files Scanned | ${scanResult.scannedFiles} |
| AI Detections | ${scanResult.detections.length} |
| High Confidence | ${scanResult.summary.byConfidence.high} |
| Asset Cards | ${cardResults.cards.length} |
| Cards Valid | ${cardResults.allValid ? "✅ Yes" : "❌ No"} |
| Risk Level | ${getRiskIcon(highestRisk)} ${highestRisk.toUpperCase()} |
${policyResult ? `| Policy Violations | ${errorCount > 0 ? "❌" : "✅"} ${policyResult.violations.length} (${errorCount} errors, ${warningCount} warnings) |
| Policy Status | ${policyPassed ? "✅ PASSED" : "❌ FAILED"} |` : ""}

`;

  // Detected frameworks
  if (scanResult.detections.length > 0) {
    body += `### Detected AI/ML Frameworks

| Framework | Category | Count |
|-----------|----------|-------|
`;

    const byFramework = new Map<string, { category: string; count: number }>();
    for (const d of scanResult.detections) {
      const key = d.framework;
      const existing = byFramework.get(key);
      if (existing) {
        existing.count++;
      } else {
        byFramework.set(key, { category: d.category, count: 1 });
      }
    }

    for (const [framework, data] of byFramework) {
      body += `| ${framework} | ${data.category} | ${data.count} |\n`;
    }

    body += "\n";
  }

  // Asset cards
  if (cardResults.cards.length > 0) {
    body += `### Registered Assets

| Asset | Risk Level | EU AI Act Category | Status |
|-------|------------|-------------------|--------|
`;

    for (const card of cardResults.cards) {
      const status = card.valid ? "✅ Valid" : "❌ Invalid";
      const euCategory = card.classification.euAiActCategory || "—";
      body += `| ${card.card.name} | ${getRiskIcon(card.classification.riskLevel)} ${card.classification.riskLevel} | ${euCategory} | ${status} |\n`;
    }

    body += "\n";
  }

  // Inferred risk factors
  const riskFactors = scanResult.inferredRiskFactors;
  if (Object.keys(riskFactors).length > 0) {
    body += `### Inferred Risk Factors

| Factor | Value |
|--------|-------|
`;

    const formatValue = (v: boolean | string | undefined): string => {
      if (v === true || v === "yes") return "⚠️ Yes";
      if (v === false || v === "no") return "✅ No";
      return "❓ Unknown";
    };

    if (riskFactors.autonomousDecisions !== undefined) {
      body += `| Autonomous Decisions | ${formatValue(riskFactors.autonomousDecisions)} |\n`;
    }
    if (riskFactors.customerFacing !== undefined) {
      body += `| Customer Facing | ${formatValue(riskFactors.customerFacing)} |\n`;
    }
    if (riskFactors.toolExecution !== undefined) {
      body += `| Tool Execution | ${formatValue(riskFactors.toolExecution)} |\n`;
    }
    if (riskFactors.externalDataAccess !== undefined) {
      body += `| External Data Access | ${formatValue(riskFactors.externalDataAccess)} |\n`;
    }
    if (riskFactors.piiProcessing !== undefined) {
      body += `| PII Processing | ${formatValue(riskFactors.piiProcessing)} |\n`;
    }
    if (riskFactors.highStakesDecisions !== undefined) {
      body += `| High-Stakes Decisions | ${formatValue(riskFactors.highStakesDecisions)} |\n`;
    }

    body += "\n";
  }

  // Suggestion if no cards
  if (scanResult.detections.length > 0 && cardResults.cards.length === 0) {
    const suggestion = suggestAssetCard(scanResult);

    body += `### Suggested Asset Card

No asset cards are registered for this codebase. Consider creating one:

\`\`\`yaml
name: ${suggestion.name}
description: ${suggestion.description}
technical:
  type: ${suggestion.technical.type}
  framework: ${suggestion.technical.framework}
\`\`\`

Run \`aigrc init\` to generate a full asset card.

`;
  }

  body += `---
*Generated by [AIGRC](https://github.com/aigrc/aigrc) at ${new Date().toISOString()}*`;

  return body;
}

function shouldPushEvents(pushOn: string): boolean {
  const eventName = github.context.eventName;
  switch (pushOn) {
    case "always":
      return true;
    case "never":
      return false;
    case "merge":
      return eventName === "push" && (github.context.ref === "refs/heads/main" || github.context.ref === "refs/heads/master");
    case "pr":
    default:
      return eventName === "pull_request";
  }
}

function getStatusIcon(highestRisk: string, allValid: boolean, policyPassed: boolean = true): string {
  if (!policyPassed) return "❌";
  if (!allValid) return "❌";
  if (highestRisk === "unacceptable") return "🚫";
  if (highestRisk === "high") return "⚠️";
  if (highestRisk === "limited") return "🔶";
  return "✅";
}

// Run the action
run();
