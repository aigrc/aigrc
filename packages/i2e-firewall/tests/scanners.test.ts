/**
 * I2E Supply Chain Firewall - Scanner Tests
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { writeFile, mkdir, rm } from "fs/promises";
import path from "path";
import { scanFile, CodeScanner, createCodeScanner } from "../src/scanners";
import { createConstraintChecker } from "../src/checkers";
import type { AIR } from "@aigrc/core";

const TEST_DIR = path.join(process.cwd(), "packages/i2e-firewall/tests/.test-fixtures");

// Helper to create a minimal AIR for testing
function createTestAIR(overrides: Partial<AIR["registry"]> = {}): AIR {
  return {
    version: "1.0",
    id: "test-air-id",
    name: "Test AIR",
    policy_sources: [],
    registry: {
      allowed_vendors: [],
      blocked_vendors: [],
      allowed_regions: [],
      blocked_regions: [],
      allowed_models: [],
      blocked_models: [],
      require_vendor_approval: true,
      require_model_approval: true,
      unknown_vendor_behavior: "request_approval",
      unknown_model_behavior: "request_approval",
      ...overrides,
    },
    runtime: {
      data_retention_days: 90,
      watermark_enabled: false,
      logging_level: "all",
      human_approval_required: [],
    },
    build: {
      require_golden_thread: true,
      require_asset_card: true,
      require_risk_classification: true,
      require_model_card: false,
      require_security_review: false,
      security_review_risk_levels: ["high", "unacceptable"],
      require_governance_lock: true,
      require_lock_signature: false,
      block_on_failure: true,
      generate_sarif: true,
      required_approvals: [],
      allowed_environments: ["development", "staging", "production"],
    },
    metadata: {
      generated_at: new Date().toISOString(),
      generated_by: "test",
      compiler_version: "1.0.0",
      tags: [],
    },
    signatures: [],
  };
}

describe("scanFile", () => {
  beforeEach(async () => {
    await mkdir(TEST_DIR, { recursive: true });
  });

  afterEach(async () => {
    await rm(TEST_DIR, { recursive: true, force: true });
  });

  it("should detect OpenAI import in TypeScript", async () => {
    const testFile = path.join(TEST_DIR, "openai-test.ts");
    await writeFile(
      testFile,
      `import OpenAI from "openai";
const client = new OpenAI();
`
    );

    const { usages, violations } = await scanFile(testFile);

    expect(usages).toHaveLength(1);
    expect(usages[0].type).toBe("vendor");
    expect(usages[0].value).toBe("openai");
    expect(usages[0].line).toBe(1);
    expect(usages[0].confidence).toBeGreaterThan(0.9);
  });

  it("should detect Anthropic import in TypeScript", async () => {
    const testFile = path.join(TEST_DIR, "anthropic-test.ts");
    await writeFile(
      testFile,
      `import Anthropic from "@anthropic-ai/sdk";
const client = new Anthropic();
`
    );

    const { usages } = await scanFile(testFile);

    expect(usages).toHaveLength(1);
    expect(usages[0].value).toBe("anthropic");
  });

  it("should detect model IDs in code", async () => {
    const testFile = path.join(TEST_DIR, "models-test.ts");
    await writeFile(
      testFile,
      `const response = await client.chat.completions.create({
  model: "gpt-4-turbo",
  messages: []
});
`
    );

    const { usages } = await scanFile(testFile);

    expect(usages.some((u) => u.type === "model" && u.value === "gpt-4-turbo")).toBe(true);
  });

  it("should detect Claude models", async () => {
    const testFile = path.join(TEST_DIR, "claude-test.ts");
    await writeFile(
      testFile,
      `const message = await anthropic.messages.create({
  model: "claude-3-opus-20240229",
  max_tokens: 1024,
  messages: []
});
`
    );

    const { usages } = await scanFile(testFile);

    expect(usages.some((u) => u.type === "model" && u.value.startsWith("claude-3"))).toBe(true);
  });

  it("should detect Python imports", async () => {
    const testFile = path.join(TEST_DIR, "openai-test.py");
    await writeFile(
      testFile,
      `from openai import OpenAI
client = OpenAI()
`
    );

    const { usages } = await scanFile(testFile);

    expect(usages).toHaveLength(1);
    expect(usages[0].value).toBe("openai");
  });

  it("should report violations when checker is provided", async () => {
    const testFile = path.join(TEST_DIR, "blocked-test.ts");
    await writeFile(
      testFile,
      `import OpenAI from "openai";
const client = new OpenAI();
`
    );

    const air = createTestAIR({
      blocked_vendors: ["openai"],
    });
    const checker = createConstraintChecker(air);

    const { usages, violations } = await scanFile(testFile, checker);

    expect(usages).toHaveLength(1);
    expect(violations).toHaveLength(1);
    expect(violations[0].type).toBe("blocked_vendor");
    expect(violations[0].file).toBe(testFile);
  });

  it("should report unapproved vendors when not in allowed list", async () => {
    const testFile = path.join(TEST_DIR, "unapproved-test.ts");
    await writeFile(
      testFile,
      `import OpenAI from "openai";
`
    );

    const air = createTestAIR({
      allowed_vendors: [{ id: "anthropic", status: "approved" }],
    });
    const checker = createConstraintChecker(air);

    const { violations } = await scanFile(testFile, checker);

    expect(violations).toHaveLength(1);
    expect(violations[0].type).toBe("unapproved_vendor");
  });

  it("should return empty results for non-existent file", async () => {
    const { usages, violations } = await scanFile("/non/existent/file.ts");

    expect(usages).toHaveLength(0);
    expect(violations).toHaveLength(0);
  });

  it("should detect multiple vendors in same file", async () => {
    const testFile = path.join(TEST_DIR, "multi-vendor.ts");
    await writeFile(
      testFile,
      `import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";

const openai = new OpenAI();
const anthropic = new Anthropic();
`
    );

    const { usages } = await scanFile(testFile);

    expect(usages.filter((u) => u.type === "vendor")).toHaveLength(2);
    expect(usages.some((u) => u.value === "openai")).toBe(true);
    expect(usages.some((u) => u.value === "anthropic")).toBe(true);
  });
});

describe("CodeScanner", () => {
  beforeEach(async () => {
    await mkdir(TEST_DIR, { recursive: true });
  });

  afterEach(async () => {
    await rm(TEST_DIR, { recursive: true, force: true });
  });

  it("should scan a single file", async () => {
    const testFile = path.join(TEST_DIR, "single.ts");
    await writeFile(testFile, `import OpenAI from "openai";`);

    const air = createTestAIR({
      allowed_vendors: [{ id: "openai", status: "approved" }],
    });
    const scanner = createCodeScanner(air);

    const result = await scanner.scanFile(testFile);

    expect(result.passed).toBe(true);
    expect(result.filesScanned).toBe(1);
    expect(result.detectedUsages).toHaveLength(1);
  });

  it("should scan a directory", async () => {
    await writeFile(path.join(TEST_DIR, "file1.ts"), `import OpenAI from "openai";`);
    await writeFile(path.join(TEST_DIR, "file2.ts"), `import Anthropic from "@anthropic-ai/sdk";`);

    const air = createTestAIR({
      allowed_vendors: [
        { id: "openai", status: "approved" },
        { id: "anthropic", status: "approved" },
      ],
    });
    const scanner = createCodeScanner(air);

    const result = await scanner.scanDirectory(TEST_DIR);

    expect(result.passed).toBe(true);
    expect(result.filesScanned).toBe(2);
    expect(result.detectedUsages).toHaveLength(2);
  });

  it("should report violations in directory scan", async () => {
    await writeFile(path.join(TEST_DIR, "file1.ts"), `import OpenAI from "openai";`);

    const air = createTestAIR({
      blocked_vendors: ["openai"],
    });
    const scanner = createCodeScanner(air);

    const result = await scanner.scanDirectory(TEST_DIR);

    expect(result.passed).toBe(false);
    expect(result.violations).toHaveLength(1);
    expect(result.filesWithViolations).toBe(1);
  });

  it("should respect exclude patterns", async () => {
    await mkdir(path.join(TEST_DIR, "node_modules"), { recursive: true });
    await writeFile(path.join(TEST_DIR, "src.ts"), `import OpenAI from "openai";`);
    await writeFile(path.join(TEST_DIR, "node_modules", "lib.ts"), `import OpenAI from "openai";`);

    const air = createTestAIR();
    const scanner = createCodeScanner(air, {
      excludePatterns: ["**/node_modules/**"],
    });

    const result = await scanner.scanDirectory(TEST_DIR);

    // Should only scan src.ts, not node_modules/lib.ts
    expect(result.filesScanned).toBe(1);
  });

  it("should return config and checker", () => {
    const air = createTestAIR();
    const scanner = new CodeScanner(air, { failOnWarnings: true });

    expect(scanner.getChecker()).toBeDefined();
    expect(scanner.getConfig().failOnWarnings).toBe(true);
  });
});
