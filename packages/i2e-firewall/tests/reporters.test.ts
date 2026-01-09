/**
 * I2E Supply Chain Firewall - Reporter Tests
 */

import { describe, it, expect } from "vitest";
import {
  generateSarifReport,
  generateSarifReportString,
  generateJsonReport,
  generateTextReport,
  createReporter,
  Reporter,
} from "../src/reporters";
import type { ScanResult, Violation } from "../src/types";

// Helper to create a test scan result
function createTestScanResult(violations: Violation[] = []): ScanResult {
  return {
    passed: violations.filter((v) => v.severity === "error").length === 0,
    target: { type: "directory", path: "/test/project" },
    detectedUsages: [
      {
        type: "vendor",
        value: "openai",
        file: "/test/project/src/index.ts",
        line: 1,
        column: 1,
        confidence: 0.95,
      },
    ],
    violations,
    filesScanned: 10,
    filesWithViolations: violations.length > 0 ? 1 : 0,
    durationMs: 150,
    timestamp: "2024-01-15T10:00:00.000Z",
  };
}

// Helper to create a test violation
function createTestViolation(
  type: Violation["type"] = "unapproved_vendor",
  severity: Violation["severity"] = "error"
): Violation {
  return {
    id: "test-violation-1",
    type,
    severity,
    message: `Test violation: ${type}`,
    description: "This is a test violation",
    file: "/test/project/src/index.ts",
    line: 5,
    column: 10,
    violatingValue: "testvendor",
    alternatives: ["openai", "anthropic"],
    ruleId: `test-${type}`,
    helpUri: "https://docs.aigrc.dev/test",
  };
}

describe("generateSarifReport", () => {
  it("should generate valid SARIF 2.1.0 structure", () => {
    const scanResult = createTestScanResult([createTestViolation()]);
    const sarif = generateSarifReport(scanResult);

    expect(sarif.$schema).toBe("https://json.schemastore.org/sarif-2.1.0.json");
    expect(sarif.version).toBe("2.1.0");
    expect(sarif.runs).toHaveLength(1);
    expect(sarif.runs[0].tool.driver.name).toBe("AIGRC Supply Chain Firewall");
  });

  it("should include violations as results", () => {
    const violations = [
      createTestViolation("blocked_vendor", "error"),
      createTestViolation("unapproved_model", "warning"),
    ];
    const scanResult = createTestScanResult(violations);
    const sarif = generateSarifReport(scanResult);

    expect(sarif.runs[0].results).toHaveLength(2);
    expect(sarif.runs[0].results[0].level).toBe("error");
    expect(sarif.runs[0].results[1].level).toBe("warning");
  });

  it("should extract unique rules from violations", () => {
    const violations = [
      createTestViolation("blocked_vendor", "error"),
      createTestViolation("blocked_vendor", "error"),
      createTestViolation("unapproved_model", "warning"),
    ];
    const scanResult = createTestScanResult(violations);
    const sarif = generateSarifReport(scanResult);

    // Should only have 2 unique rules
    expect(sarif.runs[0].tool.driver.rules).toHaveLength(2);
  });

  it("should include location information", () => {
    const scanResult = createTestScanResult([createTestViolation()]);
    const sarif = generateSarifReport(scanResult);

    const result = sarif.runs[0].results[0];
    expect(result.locations).toHaveLength(1);
    expect(result.locations![0].physicalLocation.region?.startLine).toBe(5);
    expect(result.locations![0].physicalLocation.region?.startColumn).toBe(10);
  });

  it("should normalize paths to forward slashes", () => {
    const violation = createTestViolation();
    violation.file = "C:\\test\\project\\src\\index.ts";
    const scanResult = createTestScanResult([violation]);
    const sarif = generateSarifReport(scanResult);

    const uri = sarif.runs[0].results[0].locations![0].physicalLocation.artifactLocation.uri;
    expect(uri).not.toContain("\\");
  });

  it("should set execution status based on scan result", () => {
    const passingResult = createTestScanResult([]);
    const failingResult = createTestScanResult([createTestViolation()]);

    const passingSarif = generateSarifReport(passingResult);
    const failingSarif = generateSarifReport(failingResult);

    expect(passingSarif.runs[0].invocations![0].executionSuccessful).toBe(true);
    expect(failingSarif.runs[0].invocations![0].executionSuccessful).toBe(false);
  });
});

describe("generateSarifReportString", () => {
  it("should generate valid JSON string", () => {
    const scanResult = createTestScanResult([createTestViolation()]);
    const sarifString = generateSarifReportString(scanResult);

    const parsed = JSON.parse(sarifString);
    expect(parsed.$schema).toBe("https://json.schemastore.org/sarif-2.1.0.json");
  });

  it("should support pretty printing", () => {
    const scanResult = createTestScanResult([]);
    const prettyString = generateSarifReportString(scanResult, { pretty: true });
    const compactString = generateSarifReportString(scanResult, { pretty: false });

    expect(prettyString.length).toBeGreaterThan(compactString.length);
    expect(prettyString).toContain("\n");
  });
});

describe("generateJsonReport", () => {
  it("should include summary information", () => {
    const violations = [
      createTestViolation("blocked_vendor", "error"),
      createTestViolation("unapproved_vendor", "warning"),
    ];
    const scanResult = createTestScanResult(violations);
    const report = JSON.parse(generateJsonReport(scanResult));

    expect(report.summary.filesScanned).toBe(10);
    expect(report.summary.totalViolations).toBe(2);
    expect(report.summary.errorCount).toBe(1);
    expect(report.summary.warningCount).toBe(1);
  });

  it("should optionally include detected usages", () => {
    const scanResult = createTestScanResult([]);

    const withUsages = JSON.parse(generateJsonReport(scanResult, { includeUsages: true }));
    const withoutUsages = JSON.parse(generateJsonReport(scanResult, { includeUsages: false }));

    expect(withUsages.detectedUsages).toBeDefined();
    expect(withUsages.detectedUsages).toHaveLength(1);
    expect(withoutUsages.detectedUsages).toBeUndefined();
  });
});

describe("generateTextReport", () => {
  it("should show pass status for clean scan", () => {
    const scanResult = createTestScanResult([]);
    const report = generateTextReport(scanResult, { colors: false });

    expect(report).toContain("Scan passed");
  });

  it("should show fail status for violations", () => {
    const scanResult = createTestScanResult([createTestViolation()]);
    const report = generateTextReport(scanResult, { colors: false });

    expect(report).toContain("Scan failed");
  });

  it("should show alternatives when enabled", () => {
    const scanResult = createTestScanResult([createTestViolation()]);
    const report = generateTextReport(scanResult, { colors: false, showAlternatives: true });

    expect(report).toContain("openai");
    expect(report).toContain("anthropic");
    expect(report).toContain("Approved alternatives");
  });

  it("should show summary when enabled", () => {
    const scanResult = createTestScanResult([createTestViolation()]);
    const report = generateTextReport(scanResult, { colors: false, showSummary: true });

    expect(report).toContain("Files scanned:");
    expect(report).toContain("10");
    expect(report).toContain("Duration:");
  });
});

describe("Reporter", () => {
  it("should generate reports in different formats", () => {
    const reporter = createReporter({ colors: false });
    const scanResult = createTestScanResult([createTestViolation()]);

    const textReport = reporter.text(scanResult);
    const jsonReport = reporter.json(scanResult);
    const sarifReport = reporter.sarif(scanResult);

    expect(textReport).toContain("Scan failed");
    expect(jsonReport).toContain('"passed": false');
    expect(sarifReport.$schema).toBe("https://json.schemastore.org/sarif-2.1.0.json");
  });

  it("should use format option with generate method", () => {
    const reporter = new Reporter({ format: "json" });
    const scanResult = createTestScanResult([]);

    const report = reporter.generate(scanResult);
    const parsed = JSON.parse(report);

    expect(parsed.passed).toBe(true);
  });

  it("should allow overriding format in generate", () => {
    const reporter = new Reporter({ format: "json" });
    const scanResult = createTestScanResult([]);

    const textReport = reporter.generate(scanResult, "text");

    expect(textReport).toContain("Scan passed");
  });
});
