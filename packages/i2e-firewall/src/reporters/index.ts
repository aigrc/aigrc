/**
 * I2E Supply Chain Firewall - Reporters
 *
 * Reporters format scan results for various outputs including
 * SARIF (for GitHub Security tab), JSON, and text formats.
 *
 * @module @aigrc/i2e-firewall/reporters
 */

import type { ScanResult, Violation, ViolationSeverity } from "../types";

// ─────────────────────────────────────────────────────────────────
// SARIF TYPES
// Static Analysis Results Interchange Format (SARIF) v2.1.0
// ─────────────────────────────────────────────────────────────────

interface SarifMessage {
  text: string;
}

interface SarifArtifactLocation {
  uri: string;
  uriBaseId?: string;
}

interface SarifRegion {
  startLine: number;
  startColumn?: number;
  endLine?: number;
  endColumn?: number;
}

interface SarifPhysicalLocation {
  artifactLocation: SarifArtifactLocation;
  region?: SarifRegion;
}

interface SarifLocation {
  physicalLocation: SarifPhysicalLocation;
}

interface SarifResult {
  ruleId: string;
  level: "error" | "warning" | "note" | "none";
  message: SarifMessage;
  locations?: SarifLocation[];
  relatedLocations?: SarifLocation[];
  fixes?: SarifFix[];
  properties?: Record<string, unknown>;
}

interface SarifFix {
  description: SarifMessage;
  artifactChanges: SarifArtifactChange[];
}

interface SarifArtifactChange {
  artifactLocation: SarifArtifactLocation;
  replacements: SarifReplacement[];
}

interface SarifReplacement {
  deletedRegion: SarifRegion;
  insertedContent?: { text: string };
}

interface SarifReportingDescriptor {
  id: string;
  name?: string;
  shortDescription?: SarifMessage;
  fullDescription?: SarifMessage;
  helpUri?: string;
  defaultConfiguration?: {
    level: "error" | "warning" | "note" | "none";
  };
  properties?: Record<string, unknown>;
}

interface SarifToolDriver {
  name: string;
  version: string;
  informationUri?: string;
  rules?: SarifReportingDescriptor[];
}

interface SarifTool {
  driver: SarifToolDriver;
}

interface SarifRun {
  tool: SarifTool;
  results: SarifResult[];
  invocations?: Array<{
    executionSuccessful: boolean;
    endTimeUtc?: string;
  }>;
}

interface SarifLog {
  $schema: string;
  version: "2.1.0";
  runs: SarifRun[];
}

// ─────────────────────────────────────────────────────────────────
// SARIF REPORTER
// ─────────────────────────────────────────────────────────────────

const SARIF_SCHEMA = "https://json.schemastore.org/sarif-2.1.0.json";

/**
 * Map violation severity to SARIF level
 */
function severityToSarifLevel(
  severity: ViolationSeverity
): "error" | "warning" | "note" {
  switch (severity) {
    case "error":
      return "error";
    case "warning":
      return "warning";
    case "info":
      return "note";
  }
}

/**
 * Get all unique rule IDs from violations
 */
function extractRules(violations: Violation[]): SarifReportingDescriptor[] {
  const rulesMap = new Map<string, SarifReportingDescriptor>();

  for (const violation of violations) {
    const ruleId = violation.ruleId || violation.type;
    if (!rulesMap.has(ruleId)) {
      rulesMap.set(ruleId, {
        id: ruleId,
        name: violation.type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
        shortDescription: { text: getShortDescription(violation.type) },
        fullDescription: { text: violation.description || violation.message },
        helpUri: violation.helpUri,
        defaultConfiguration: {
          level: severityToSarifLevel(violation.severity),
        },
      });
    }
  }

  return Array.from(rulesMap.values());
}

/**
 * Get short description for rule type
 */
function getShortDescription(type: string): string {
  const descriptions: Record<string, string> = {
    blocked_vendor: "Usage of a blocked AI vendor",
    unapproved_vendor: "Usage of an unapproved AI vendor",
    blocked_model: "Usage of a blocked AI model",
    unapproved_model: "Usage of an unapproved AI model",
    blocked_region: "Data processing in a blocked region",
    unapproved_region: "Data processing in an unapproved region",
    missing_governance_lock: "Missing governance.lock file",
    expired_governance_lock: "Expired governance.lock file",
    constraint_violation: "Generic policy constraint violation",
  };
  return descriptions[type] || "Policy violation";
}

/**
 * Convert a violation to a SARIF result
 */
function violationToSarifResult(
  violation: Violation,
  baseDir?: string
): SarifResult {
  const result: SarifResult = {
    ruleId: violation.ruleId || violation.type,
    level: severityToSarifLevel(violation.severity),
    message: { text: violation.message },
  };

  if (violation.file) {
    let uri = violation.file;
    if (baseDir && uri.startsWith(baseDir)) {
      uri = uri.slice(baseDir.length).replace(/^[/\\]/, "");
    }
    // Normalize to forward slashes for SARIF
    uri = uri.replace(/\\/g, "/");

    result.locations = [
      {
        physicalLocation: {
          artifactLocation: { uri },
          region: {
            startLine: violation.line || 1,
            startColumn: violation.column,
            endLine: violation.endLine,
            endColumn: violation.endColumn,
          },
        },
      },
    ];
  }

  if (violation.alternatives && violation.alternatives.length > 0) {
    result.properties = {
      alternatives: violation.alternatives,
      violatingValue: violation.violatingValue,
    };
  }

  return result;
}

/**
 * Generate a SARIF report from scan results
 */
export function generateSarifReport(
  scanResult: ScanResult,
  options?: {
    baseDir?: string;
    toolVersion?: string;
  }
): SarifLog {
  const violations = scanResult.violations;
  const rules = extractRules(violations);

  const sarifLog: SarifLog = {
    $schema: SARIF_SCHEMA,
    version: "2.1.0",
    runs: [
      {
        tool: {
          driver: {
            name: "AIGRC Supply Chain Firewall",
            version: options?.toolVersion || "0.1.0",
            informationUri: "https://github.com/pangolabs/aigrc",
            rules,
          },
        },
        results: violations.map((v) =>
          violationToSarifResult(v, options?.baseDir)
        ),
        invocations: [
          {
            executionSuccessful: scanResult.passed,
            endTimeUtc: scanResult.timestamp,
          },
        ],
      },
    ],
  };

  return sarifLog;
}

/**
 * Generate SARIF report as JSON string
 */
export function generateSarifReportString(
  scanResult: ScanResult,
  options?: {
    baseDir?: string;
    toolVersion?: string;
    pretty?: boolean;
  }
): string {
  const report = generateSarifReport(scanResult, options);
  return options?.pretty
    ? JSON.stringify(report, null, 2)
    : JSON.stringify(report);
}

// ─────────────────────────────────────────────────────────────────
// JSON REPORTER
// ─────────────────────────────────────────────────────────────────

export interface JsonReportOptions {
  includeUsages?: boolean;
  pretty?: boolean;
}

/**
 * Generate a JSON report from scan results
 */
export function generateJsonReport(
  scanResult: ScanResult,
  options?: JsonReportOptions
): string {
  const report: Record<string, unknown> = {
    passed: scanResult.passed,
    summary: {
      filesScanned: scanResult.filesScanned,
      filesWithViolations: scanResult.filesWithViolations,
      totalViolations: scanResult.violations.length,
      errorCount: scanResult.violations.filter((v) => v.severity === "error")
        .length,
      warningCount: scanResult.violations.filter((v) => v.severity === "warning")
        .length,
      infoCount: scanResult.violations.filter((v) => v.severity === "info")
        .length,
    },
    target: scanResult.target,
    violations: scanResult.violations,
    durationMs: scanResult.durationMs,
    timestamp: scanResult.timestamp,
  };

  if (options?.includeUsages) {
    report.detectedUsages = scanResult.detectedUsages;
  }

  return options?.pretty
    ? JSON.stringify(report, null, 2)
    : JSON.stringify(report);
}

// ─────────────────────────────────────────────────────────────────
// TEXT REPORTER
// ─────────────────────────────────────────────────────────────────

export interface TextReportOptions {
  colors?: boolean;
  showAlternatives?: boolean;
  showSummary?: boolean;
}

/**
 * ANSI color codes for terminal output
 */
const colors = {
  reset: "\x1b[0m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  gray: "\x1b[90m",
  bold: "\x1b[1m",
  green: "\x1b[32m",
};

/**
 * Apply color if enabled
 */
function colorize(
  text: string,
  color: keyof typeof colors,
  enabled: boolean
): string {
  if (!enabled) return text;
  return `${colors[color]}${text}${colors.reset}`;
}

/**
 * Get severity icon
 */
function getSeverityIcon(severity: ViolationSeverity, useColors: boolean): string {
  switch (severity) {
    case "error":
      return colorize("✖", "red", useColors);
    case "warning":
      return colorize("⚠", "yellow", useColors);
    case "info":
      return colorize("ℹ", "blue", useColors);
  }
}

/**
 * Generate a text report from scan results
 */
export function generateTextReport(
  scanResult: ScanResult,
  options?: TextReportOptions
): string {
  const useColors = options?.colors ?? true;
  const showAlternatives = options?.showAlternatives ?? true;
  const showSummary = options?.showSummary ?? true;

  const lines: string[] = [];

  // Header
  if (scanResult.passed) {
    lines.push(
      colorize("✓ Scan passed", "green", useColors) +
        colorize(` - No policy violations found`, "gray", useColors)
    );
  } else {
    lines.push(
      colorize("✖ Scan failed", "red", useColors) +
        colorize(` - Policy violations detected`, "gray", useColors)
    );
  }
  lines.push("");

  // Violations grouped by file
  const violationsByFile = new Map<string, Violation[]>();
  for (const violation of scanResult.violations) {
    const file = violation.file || "(unknown)";
    if (!violationsByFile.has(file)) {
      violationsByFile.set(file, []);
    }
    violationsByFile.get(file)!.push(violation);
  }

  for (const [file, violations] of violationsByFile) {
    lines.push(colorize(file, "bold", useColors));

    for (const violation of violations) {
      const icon = getSeverityIcon(violation.severity, useColors);
      const location = violation.line
        ? `:${violation.line}${violation.column ? `:${violation.column}` : ""}`
        : "";

      lines.push(
        `  ${icon} ${violation.message}` +
          colorize(` [${violation.type}]`, "gray", useColors) +
          (location ? colorize(location, "gray", useColors) : "")
      );

      if (
        showAlternatives &&
        violation.alternatives &&
        violation.alternatives.length > 0
      ) {
        lines.push(
          colorize(
            `    → Approved alternatives: ${violation.alternatives.join(", ")}`,
            "gray",
            useColors
          )
        );
      }
    }
    lines.push("");
  }

  // Summary
  if (showSummary) {
    const errorCount = scanResult.violations.filter(
      (v) => v.severity === "error"
    ).length;
    const warningCount = scanResult.violations.filter(
      (v) => v.severity === "warning"
    ).length;

    lines.push(colorize("─".repeat(50), "gray", useColors));
    lines.push(
      `${colorize("Files scanned:", "gray", useColors)} ${scanResult.filesScanned}`
    );
    lines.push(
      `${colorize("Files with issues:", "gray", useColors)} ${scanResult.filesWithViolations}`
    );
    lines.push(
      `${colorize("Errors:", "gray", useColors)} ${colorize(String(errorCount), errorCount > 0 ? "red" : "green", useColors)}`
    );
    lines.push(
      `${colorize("Warnings:", "gray", useColors)} ${colorize(String(warningCount), warningCount > 0 ? "yellow" : "green", useColors)}`
    );
    lines.push(
      `${colorize("Duration:", "gray", useColors)} ${scanResult.durationMs}ms`
    );
  }

  return lines.join("\n");
}

// ─────────────────────────────────────────────────────────────────
// REPORTER CLASS
// ─────────────────────────────────────────────────────────────────

export type ReportFormat = "sarif" | "json" | "text";

export interface ReporterOptions {
  format: ReportFormat;
  baseDir?: string;
  toolVersion?: string;
  colors?: boolean;
  showAlternatives?: boolean;
  includeUsages?: boolean;
  pretty?: boolean;
}

/**
 * Unified reporter for generating scan reports
 */
export class Reporter {
  constructor(private readonly options: Partial<ReporterOptions> = {}) {}

  /**
   * Generate a report in the specified format
   */
  generate(
    scanResult: ScanResult,
    format?: ReportFormat
  ): string {
    const reportFormat = format || this.options.format || "text";

    switch (reportFormat) {
      case "sarif":
        return generateSarifReportString(scanResult, {
          baseDir: this.options.baseDir,
          toolVersion: this.options.toolVersion,
          pretty: this.options.pretty ?? true,
        });

      case "json":
        return generateJsonReport(scanResult, {
          includeUsages: this.options.includeUsages,
          pretty: this.options.pretty ?? true,
        });

      case "text":
        return generateTextReport(scanResult, {
          colors: this.options.colors ?? true,
          showAlternatives: this.options.showAlternatives ?? true,
          showSummary: true,
        });
    }
  }

  /**
   * Generate SARIF report
   */
  sarif(scanResult: ScanResult): SarifLog {
    return generateSarifReport(scanResult, {
      baseDir: this.options.baseDir,
      toolVersion: this.options.toolVersion,
    });
  }

  /**
   * Generate JSON report
   */
  json(scanResult: ScanResult): string {
    return generateJsonReport(scanResult, {
      includeUsages: this.options.includeUsages,
      pretty: this.options.pretty ?? true,
    });
  }

  /**
   * Generate text report
   */
  text(scanResult: ScanResult): string {
    return generateTextReport(scanResult, {
      colors: this.options.colors ?? true,
      showAlternatives: this.options.showAlternatives ?? true,
      showSummary: true,
    });
  }
}

/**
 * Create a reporter instance
 */
export function createReporter(options?: Partial<ReporterOptions>): Reporter {
  return new Reporter(options);
}
