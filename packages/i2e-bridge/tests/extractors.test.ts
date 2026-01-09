/**
 * I2E Policy Bridge - Extractor Tests
 *
 * Tests for document extractors: Manual, PDF, DOCX, URL
 */

import { describe, it, expect, beforeEach } from "vitest";
import { writeFile, mkdir, rm } from "fs/promises";
import path from "path";
import {
  ManualExtractor,
  PdfExtractor,
  DocxExtractor,
  UrlExtractor,
  extractorRegistry,
  ExtractorRegistry,
  computeContentHash,
} from "../src/index";

const TEST_DIR = path.join(process.cwd(), "packages/i2e-bridge/tests/.test-fixtures");

describe("ManualExtractor", () => {
  let extractor: ManualExtractor;

  beforeEach(() => {
    extractor = new ManualExtractor();
  });

  it("should be always available", () => {
    expect(extractor.isAvailable()).toBe(true);
  });

  it("should support manual source type", () => {
    expect(extractor.supportedTypes).toContain("manual");
    expect(extractor.supports("manual")).toBe(true);
    expect(extractor.supports("pdf")).toBe(false);
  });

  it("should extract content from YAML file", async () => {
    // Create test YAML file
    await mkdir(TEST_DIR, { recursive: true });
    const testFile = path.join(TEST_DIR, "test-policy.yaml");
    const content = `
version: "1.0"
name: "Test Policy"
registry:
  allowed_vendors:
    - openai
    - anthropic
runtime:
  pii_filter:
    enabled: true
`;
    await writeFile(testFile, content);

    const result = await extractor.extract({
      type: "manual",
      uri: testFile,
    });

    expect(result.success).toBe(true);
    expect(result.content).toContain("Test Policy");
    expect(result.contentHash).toMatch(/^sha256:[a-f0-9]{64}$/);

    // Cleanup
    await rm(TEST_DIR, { recursive: true, force: true });
  });

  it("should parse constraints from manual file", async () => {
    await mkdir(TEST_DIR, { recursive: true });
    const testFile = path.join(TEST_DIR, "constraints.yaml");
    const content = `
version: "1.0"
name: "Corporate AI Policy"
registry:
  allowed_vendors:
    - openai
    - anthropic
  blocked_models:
    - "gpt-3.5-turbo"
runtime:
  pii_filter:
    enabled: true
    action: redact
  data_retention_days: 30
build:
  require_golden_thread: true
  require_asset_card: true
`;
    await writeFile(testFile, content);

    const result = await extractor.parseConstraintFile({
      type: "manual",
      uri: testFile,
    });

    expect(result.success).toBe(true);
    expect(result.constraints.length).toBeGreaterThan(0);

    // Check vendor constraints
    const vendorConstraints = result.constraints.filter(c => c.type === "allowed_vendor");
    expect(vendorConstraints.length).toBe(2);

    // Check runtime constraints
    const piiConstraint = result.constraints.find(c => c.type === "pii_filter");
    expect(piiConstraint).toBeDefined();
    expect(piiConstraint?.confidence).toBe(1.0);

    // Check build constraints
    const goldenThread = result.constraints.find(c => c.type === "require_golden_thread");
    expect(goldenThread).toBeDefined();

    // Cleanup
    await rm(TEST_DIR, { recursive: true, force: true });
  });

  it("should return error for non-existent file", async () => {
    const result = await extractor.extract({
      type: "manual",
      uri: "/non/existent/file.yaml",
    });

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });

  it("should return error for invalid YAML", async () => {
    await mkdir(TEST_DIR, { recursive: true });
    const testFile = path.join(TEST_DIR, "invalid.yaml");
    await writeFile(testFile, "this is: not: valid: yaml: {{{}}}");

    const result = await extractor.parseConstraintFile({
      type: "manual",
      uri: testFile,
    });

    expect(result.success).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);

    await rm(TEST_DIR, { recursive: true, force: true });
  });
});

describe("PdfExtractor", () => {
  let extractor: PdfExtractor;

  beforeEach(() => {
    extractor = new PdfExtractor();
  });

  it("should support pdf source type", () => {
    expect(extractor.supportedTypes).toContain("pdf");
    expect(extractor.supports("pdf")).toBe(true);
  });

  it("should return error for non-existent file", async () => {
    const result = await extractor.extract({
      type: "pdf",
      uri: "/non/existent/file.pdf",
    });

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });

  it("should reject unsupported source types", async () => {
    const result = await extractor.extract({
      type: "docx" as any,
      uri: "/some/file.docx",
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain("does not support");
  });
});

describe("DocxExtractor", () => {
  let extractor: DocxExtractor;

  beforeEach(() => {
    extractor = new DocxExtractor();
  });

  it("should support docx source type", () => {
    expect(extractor.supportedTypes).toContain("docx");
    expect(extractor.supports("docx")).toBe(true);
  });

  it("should return error for non-existent file", async () => {
    const result = await extractor.extract({
      type: "docx",
      uri: "/non/existent/file.docx",
    });

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });
});

describe("UrlExtractor", () => {
  let extractor: UrlExtractor;

  beforeEach(() => {
    extractor = new UrlExtractor();
  });

  it("should be always available", () => {
    expect(extractor.isAvailable()).toBe(true);
  });

  it("should support url source type", () => {
    expect(extractor.supportedTypes).toContain("url");
    expect(extractor.supports("url")).toBe(true);
  });

  it("should extract content from local HTML file", async () => {
    await mkdir(TEST_DIR, { recursive: true });
    const testFile = path.join(TEST_DIR, "test.html");
    const html = `
<!DOCTYPE html>
<html>
<head><title>Test Policy Document</title></head>
<body>
<main>
<h1>AI Governance Policy</h1>
<p>This policy governs the use of AI systems.</p>
<p>All AI systems must be registered before deployment.</p>
</main>
</body>
</html>
`;
    await writeFile(testFile, html);

    const result = await extractor.extract({
      type: "url",
      uri: testFile,
    });

    expect(result.success).toBe(true);
    expect(result.content).toContain("AI Governance Policy");
    expect(result.documentMetadata?.title).toBe("Test Policy Document");

    await rm(TEST_DIR, { recursive: true, force: true });
  });

  it("should return error for invalid URL", async () => {
    const result = await extractor.extract({
      type: "url",
      uri: "not-a-valid-url",
    });

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });
});

describe("ExtractorRegistry", () => {
  it("should register and retrieve extractors", () => {
    const registry = new ExtractorRegistry();
    const manualExtractor = new ManualExtractor();

    registry.register(manualExtractor);

    const retrieved = registry.getExtractor("manual");
    expect(retrieved).toBeDefined();
    expect(retrieved?.name).toBe("manual");
  });

  it("should return null for unsupported types", () => {
    const registry = new ExtractorRegistry();
    const result = registry.getExtractor("confluence");
    expect(result).toBeNull();
  });

  it("should list supported types", () => {
    const registry = new ExtractorRegistry();
    registry.register(new ManualExtractor());
    registry.register(new UrlExtractor());

    const types = registry.getSupportedTypes();
    expect(types).toContain("manual");
    expect(types).toContain("url");
  });
});

describe("computeContentHash", () => {
  it("should compute consistent SHA-256 hash", async () => {
    const content = "Hello, World!";
    const hash1 = await computeContentHash(content);
    const hash2 = await computeContentHash(content);

    expect(hash1).toBe(hash2);
    expect(hash1).toMatch(/^sha256:[a-f0-9]{64}$/);
  });

  it("should compute different hashes for different content", async () => {
    const hash1 = await computeContentHash("Content A");
    const hash2 = await computeContentHash("Content B");

    expect(hash1).not.toBe(hash2);
  });
});
