/**
 * I2E Supply Chain Firewall - Code Scanners
 *
 * Scanners analyze source code to detect AI/ML vendor and model usage,
 * then validate detected usage against AIR constraints.
 *
 * @module @aigrc/i2e-firewall/scanners
 */

import { readFile } from "fs/promises";
import { glob } from "glob";
import path from "path";
import type { AIR } from "@aigrc/core";
import type {
  DetectedUsage,
  ScanResult,
  Violation,
  FirewallConfig,
} from "../types";
import {
  ConstraintChecker,
  createConstraintChecker,
} from "../checkers";

// ─────────────────────────────────────────────────────────────────
// DETECTION PATTERNS
// ─────────────────────────────────────────────────────────────────

interface DetectionPattern {
  /** Pattern name for identification */
  name: string;
  /** Regex pattern to match */
  pattern: RegExp;
  /** Type of usage this pattern detects */
  type: DetectedUsage["type"];
  /** Function to extract the value from match */
  extractValue: (match: RegExpMatchArray) => string;
  /** File extensions this pattern applies to */
  fileExtensions?: string[];
  /** Base confidence for this pattern */
  confidence: number;
}

/**
 * Known vendor patterns for detection
 */
const VENDOR_PATTERNS: DetectionPattern[] = [
  // OpenAI
  {
    name: "openai-import-ts",
    pattern: /from\s+['"]openai['"]/g,
    type: "import",
    extractValue: () => "openai",
    fileExtensions: [".ts", ".tsx", ".js", ".jsx", ".mjs"],
    confidence: 0.95,
  },
  {
    name: "openai-require",
    pattern: /require\s*\(\s*['"]openai['"]\s*\)/g,
    type: "import",
    extractValue: () => "openai",
    fileExtensions: [".js", ".cjs"],
    confidence: 0.95,
  },
  {
    name: "openai-python",
    pattern: /(?:from\s+openai|import\s+openai)/g,
    type: "import",
    extractValue: () => "openai",
    fileExtensions: [".py"],
    confidence: 0.95,
  },
  // Anthropic
  {
    name: "anthropic-import-ts",
    pattern: /from\s+['"]@anthropic-ai\/sdk['"]/g,
    type: "import",
    extractValue: () => "anthropic",
    fileExtensions: [".ts", ".tsx", ".js", ".jsx", ".mjs"],
    confidence: 0.95,
  },
  {
    name: "anthropic-python",
    pattern: /(?:from\s+anthropic|import\s+anthropic)/g,
    type: "import",
    extractValue: () => "anthropic",
    fileExtensions: [".py"],
    confidence: 0.95,
  },
  // Google/Vertex AI
  {
    name: "google-genai-ts",
    pattern: /from\s+['"]@google\/generative-ai['"]/g,
    type: "import",
    extractValue: () => "google",
    fileExtensions: [".ts", ".tsx", ".js", ".jsx", ".mjs"],
    confidence: 0.95,
  },
  {
    name: "google-vertexai-python",
    pattern: /from\s+google\.cloud\s+import\s+aiplatform/g,
    type: "import",
    extractValue: () => "google",
    fileExtensions: [".py"],
    confidence: 0.95,
  },
  // Azure OpenAI
  {
    name: "azure-openai-ts",
    pattern: /from\s+['"]@azure\/openai['"]/g,
    type: "import",
    extractValue: () => "azure",
    fileExtensions: [".ts", ".tsx", ".js", ".jsx", ".mjs"],
    confidence: 0.95,
  },
  // AWS Bedrock
  {
    name: "aws-bedrock-ts",
    pattern: /from\s+['"]@aws-sdk\/client-bedrock['"]/g,
    type: "import",
    extractValue: () => "aws",
    fileExtensions: [".ts", ".tsx", ".js", ".jsx", ".mjs"],
    confidence: 0.95,
  },
  {
    name: "aws-bedrock-runtime-ts",
    pattern: /from\s+['"]@aws-sdk\/client-bedrock-runtime['"]/g,
    type: "import",
    extractValue: () => "aws",
    fileExtensions: [".ts", ".tsx", ".js", ".jsx", ".mjs"],
    confidence: 0.95,
  },
  // Cohere
  {
    name: "cohere-ts",
    pattern: /from\s+['"]cohere-ai['"]/g,
    type: "import",
    extractValue: () => "cohere",
    fileExtensions: [".ts", ".tsx", ".js", ".jsx", ".mjs"],
    confidence: 0.95,
  },
  {
    name: "cohere-python",
    pattern: /(?:from\s+cohere|import\s+cohere)/g,
    type: "import",
    extractValue: () => "cohere",
    fileExtensions: [".py"],
    confidence: 0.95,
  },
  // Hugging Face
  {
    name: "huggingface-ts",
    pattern: /from\s+['"]@huggingface\/inference['"]/g,
    type: "import",
    extractValue: () => "huggingface",
    fileExtensions: [".ts", ".tsx", ".js", ".jsx", ".mjs"],
    confidence: 0.95,
  },
  {
    name: "huggingface-python",
    pattern: /from\s+transformers\s+import/g,
    type: "import",
    extractValue: () => "huggingface",
    fileExtensions: [".py"],
    confidence: 0.9,
  },
  // Replicate
  {
    name: "replicate-ts",
    pattern: /from\s+['"]replicate['"]/g,
    type: "import",
    extractValue: () => "replicate",
    fileExtensions: [".ts", ".tsx", ".js", ".jsx", ".mjs"],
    confidence: 0.95,
  },
  // Mistral
  {
    name: "mistral-ts",
    pattern: /from\s+['"]@mistralai\/mistralai['"]/g,
    type: "import",
    extractValue: () => "mistral",
    fileExtensions: [".ts", ".tsx", ".js", ".jsx", ".mjs"],
    confidence: 0.95,
  },
];

/**
 * Known model patterns for detection
 */
const MODEL_PATTERNS: DetectionPattern[] = [
  // OpenAI models
  {
    name: "gpt-4-model",
    pattern: /["'](gpt-4(?:-turbo|-vision|-\d+)?(?:-preview)?)['"]/g,
    type: "model",
    extractValue: (match) => match[1],
    confidence: 0.9,
  },
  {
    name: "gpt-3.5-model",
    pattern: /["'](gpt-3\.5-turbo(?:-\d+)?)['"]/g,
    type: "model",
    extractValue: (match) => match[1],
    confidence: 0.9,
  },
  {
    name: "o1-model",
    pattern: /["'](o1(?:-mini|-preview)?)['"]/g,
    type: "model",
    extractValue: (match) => match[1],
    confidence: 0.9,
  },
  // Anthropic models
  {
    name: "claude-model",
    pattern: /["'](claude-(?:3(?:-5)?-(?:opus|sonnet|haiku)|2(?:\.\d)?|instant)(?:-\d+)?)['"]/g,
    type: "model",
    extractValue: (match) => match[1],
    confidence: 0.9,
  },
  // Google models
  {
    name: "gemini-model",
    pattern: /["'](gemini-(?:pro|ultra|nano)(?:-\d+(?:\.\d+)?)?(?:-vision)?)['"]/g,
    type: "model",
    extractValue: (match) => match[1],
    confidence: 0.9,
  },
  // Mistral models
  {
    name: "mistral-model",
    pattern: /["'](mistral-(?:tiny|small|medium|large)(?:-\d+)?)['"]/g,
    type: "model",
    extractValue: (match) => match[1],
    confidence: 0.9,
  },
  // Llama models
  {
    name: "llama-model",
    pattern: /["'](llama-?(?:2|3)(?:-\d+b)?(?:-chat)?)['"]/gi,
    type: "model",
    extractValue: (match) => match[1].toLowerCase(),
    confidence: 0.85,
  },
];

// ─────────────────────────────────────────────────────────────────
// SCANNER IMPLEMENTATION
// ─────────────────────────────────────────────────────────────────

/**
 * Scan a single file for AI/ML usage
 */
export async function scanFile(
  filePath: string,
  checker?: ConstraintChecker
): Promise<{ usages: DetectedUsage[]; violations: Violation[] }> {
  const usages: DetectedUsage[] = [];
  const violations: Violation[] = [];
  const ext = path.extname(filePath).toLowerCase();

  let content: string;
  try {
    content = await readFile(filePath, "utf-8");
  } catch {
    return { usages, violations };
  }

  const lines = content.split("\n");

  // Scan for vendor patterns
  for (const pattern of VENDOR_PATTERNS) {
    if (pattern.fileExtensions && !pattern.fileExtensions.includes(ext)) {
      continue;
    }

    for (let lineNum = 0; lineNum < lines.length; lineNum++) {
      const line = lines[lineNum];
      const regex = new RegExp(pattern.pattern.source, pattern.pattern.flags);
      let match: RegExpExecArray | null;

      while ((match = regex.exec(line)) !== null) {
        const value = pattern.extractValue(match);
        const usage: DetectedUsage = {
          type: "vendor",
          value,
          file: filePath,
          line: lineNum + 1,
          column: match.index + 1,
          snippet: line.trim().substring(0, 100),
          confidence: pattern.confidence,
        };
        usages.push(usage);

        // Check against constraints if checker provided
        if (checker) {
          const result = checker.checkVendor(value);
          if (!result.passed) {
            for (const v of result.violations) {
              violations.push({
                ...v,
                file: filePath,
                line: lineNum + 1,
                column: match.index + 1,
              });
            }
          }
        }
      }
    }
  }

  // Scan for model patterns
  for (const pattern of MODEL_PATTERNS) {
    if (pattern.fileExtensions && !pattern.fileExtensions.includes(ext)) {
      continue;
    }

    for (let lineNum = 0; lineNum < lines.length; lineNum++) {
      const line = lines[lineNum];
      const regex = new RegExp(pattern.pattern.source, pattern.pattern.flags);
      let match: RegExpExecArray | null;

      while ((match = regex.exec(line)) !== null) {
        const value = pattern.extractValue(match);
        const usage: DetectedUsage = {
          type: "model",
          value,
          file: filePath,
          line: lineNum + 1,
          column: match.index + 1,
          snippet: line.trim().substring(0, 100),
          confidence: pattern.confidence,
        };
        usages.push(usage);

        // Check against constraints if checker provided
        if (checker) {
          const result = checker.checkModel(value);
          if (!result.passed) {
            for (const v of result.violations) {
              violations.push({
                ...v,
                file: filePath,
                line: lineNum + 1,
                column: match.index + 1,
              });
            }
          }
        }
      }
    }
  }

  return { usages, violations };
}

/**
 * Scan a directory for AI/ML usage
 */
export async function scanDirectory(
  directory: string,
  air: AIR,
  config?: Partial<FirewallConfig>
): Promise<ScanResult> {
  const startTime = Date.now();
  const checker = createConstraintChecker(air);

  const mergedConfig = {
    includePatterns: ["**/*.ts", "**/*.js", "**/*.py", "**/*.java"],
    excludePatterns: ["**/node_modules/**", "**/dist/**", "**/.git/**"],
    ...config,
  };

  // Find all matching files
  const files: string[] = [];
  for (const pattern of mergedConfig.includePatterns!) {
    const matches = await glob(pattern, {
      cwd: directory,
      ignore: mergedConfig.excludePatterns,
      absolute: true,
    });
    files.push(...matches);
  }

  // Deduplicate files
  const uniqueFiles = [...new Set(files)];

  const allUsages: DetectedUsage[] = [];
  const allViolations: Violation[] = [];
  let filesWithViolations = 0;

  // Scan each file
  for (const filePath of uniqueFiles) {
    const { usages, violations } = await scanFile(filePath, checker);
    allUsages.push(...usages);
    allViolations.push(...violations);
    if (violations.length > 0) {
      filesWithViolations++;
    }
  }

  // Filter violations by severity if configured
  const filteredViolations =
    mergedConfig.minSeverity === "error"
      ? allViolations.filter((v) => v.severity === "error")
      : allViolations;

  const hasBlockingViolations = filteredViolations.some(
    (v) => v.severity === "error"
  );
  const hasWarnings = filteredViolations.some((v) => v.severity === "warning");

  return {
    passed: !hasBlockingViolations && (!mergedConfig.failOnWarnings || !hasWarnings),
    target: {
      type: "directory",
      path: directory,
    },
    detectedUsages: allUsages,
    violations: filteredViolations,
    filesScanned: uniqueFiles.length,
    filesWithViolations,
    durationMs: Date.now() - startTime,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Scan a project (directory with governance.lock)
 */
export async function scanProject(
  projectPath: string,
  air: AIR,
  config?: Partial<FirewallConfig>
): Promise<ScanResult> {
  const result = await scanDirectory(projectPath, air, config);
  result.target.type = "project";
  return result;
}

// ─────────────────────────────────────────────────────────────────
// CODE SCANNER CLASS
// ─────────────────────────────────────────────────────────────────

/**
 * Code scanner for detecting AI/ML usage and validating against AIR
 */
export class CodeScanner {
  private readonly checker: ConstraintChecker;
  private readonly config: FirewallConfig;

  constructor(air: AIR, config?: Partial<FirewallConfig>) {
    this.checker = createConstraintChecker(air);
    this.config = {
      lockFilePath: "governance.lock",
      failOnWarnings: false,
      minSeverity: "warning",
      includePatterns: ["**/*.ts", "**/*.js", "**/*.py", "**/*.java"],
      excludePatterns: ["**/node_modules/**", "**/dist/**", "**/.git/**"],
      languages: ["typescript", "javascript", "python"],
      generateSarif: false,
      showAlternatives: true,
      ...config,
    };
  }

  /**
   * Scan a single file
   */
  async scanFile(filePath: string): Promise<ScanResult> {
    const startTime = Date.now();
    const { usages, violations } = await scanFile(filePath, this.checker);

    return {
      passed: violations.filter((v) => v.severity === "error").length === 0,
      target: { type: "file", path: filePath },
      detectedUsages: usages,
      violations,
      filesScanned: 1,
      filesWithViolations: violations.length > 0 ? 1 : 0,
      durationMs: Date.now() - startTime,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Scan a directory
   */
  async scanDirectory(directory: string): Promise<ScanResult> {
    return scanDirectory(directory, this.checker.getAIR(), this.config);
  }

  /**
   * Scan a project
   */
  async scanProject(projectPath: string): Promise<ScanResult> {
    return scanProject(projectPath, this.checker.getAIR(), this.config);
  }

  /**
   * Get the constraint checker
   */
  getChecker(): ConstraintChecker {
    return this.checker;
  }

  /**
   * Get the configuration
   */
  getConfig(): FirewallConfig {
    return this.config;
  }
}

/**
 * Create a code scanner
 */
export function createCodeScanner(
  air: AIR,
  config?: Partial<FirewallConfig>
): CodeScanner {
  return new CodeScanner(air, config);
}
