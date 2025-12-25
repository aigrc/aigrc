import { readFileSync, readdirSync, statSync, existsSync } from "fs";
import { join, extname, relative } from "path";
import type {
  ScanOptions,
  ScanResult,
  DetectionResult,
  ScanSummary,
  ScanError,
  ScanProgressCallback,
  ConfidenceLevel,
  FrameworkCategory,
  DetectionStrategy,
} from "./types";
import { getAllPatterns, initializePatterns, isRegistryInitialized } from "./patterns";
import { matchPatterns } from "./strategies/pattern-matcher";
import { analyzeImports } from "./strategies/import-analyzer";
import { scanFileExtension, MODEL_EXTENSIONS } from "./strategies/file-scanner";
import { detectAnnotations } from "./strategies/annotation-detector";
import { inferRiskFactors } from "./risk-inference";

// ─────────────────────────────────────────────────────────────────
// DEFAULT CONFIGURATION
// ─────────────────────────────────────────────────────────────────

const DEFAULT_IGNORE_PATTERNS = [
  "node_modules",
  "__pycache__",
  ".git",
  "dist",
  "build",
  ".next",
  ".nuxt",
  "venv",
  ".venv",
  "env",
  ".env",
  ".aigrc",
  "*.min.js",
  "*.bundle.js",
  "*.map",
  "coverage",
  ".pytest_cache",
  ".mypy_cache",
  ".tox",
  "egg-info",
];

const DEFAULT_CODE_EXTENSIONS = [
  ".py",
  ".js",
  ".ts",
  ".jsx",
  ".tsx",
  ".mjs",
  ".cjs",
];

// ─────────────────────────────────────────────────────────────────
// MAIN SCAN FUNCTION
// ─────────────────────────────────────────────────────────────────

export async function scan(
  options: ScanOptions,
  onProgress?: ScanProgressCallback
): Promise<ScanResult> {
  const startTime = Date.now();
  const detections: DetectionResult[] = [];
  const errors: ScanError[] = [];
  let scannedFiles = 0;
  let skippedFiles = 0;

  // Ensure patterns are initialized
  if (!isRegistryInitialized()) {
    initializePatterns();
  }

  const resolvedOptions = resolveOptions(options);
  const files = collectFiles(resolvedOptions);
  const totalFiles = files.length;

  for (const filePath of files) {
    if (resolvedOptions.maxFiles && scannedFiles >= resolvedOptions.maxFiles) {
      break;
    }

    if (onProgress) {
      onProgress({
        totalFiles,
        scannedFiles,
        currentFile: relative(resolvedOptions.directory, filePath),
        detections: detections.length,
      });
    }

    try {
      const fileDetections = await scanFile(filePath, resolvedOptions);
      detections.push(...fileDetections);
      scannedFiles++;

      // Early exit on high-confidence match
      if (
        resolvedOptions.earlyExit &&
        fileDetections.some((d) => d.confidence === "high")
      ) {
        break;
      }
    } catch (error) {
      errors.push({
        filePath,
        error: error instanceof Error ? error.message : String(error),
        recoverable: true,
      });
      skippedFiles++;
    }
  }

  // Deduplicate detections
  const uniqueDetections = deduplicateDetections(detections);

  // Create summary
  const summary = createSummary(uniqueDetections);

  // Infer risk factors
  const inferredRiskFactors = inferRiskFactors(uniqueDetections);

  // Suggest technical details
  const suggestedTechnical = suggestTechnical(uniqueDetections, summary);

  return {
    detections: uniqueDetections,
    summary,
    inferredRiskFactors,
    suggestedTechnical,
    scannedFiles,
    skippedFiles,
    duration: Date.now() - startTime,
    errors: errors.length > 0 ? errors : undefined,
  };
}

// ─────────────────────────────────────────────────────────────────
// SYNCHRONOUS SCAN (for CLI/scripts)
// ─────────────────────────────────────────────────────────────────

export function scanSync(
  options: ScanOptions,
  onProgress?: ScanProgressCallback
): ScanResult {
  const startTime = Date.now();
  const detections: DetectionResult[] = [];
  const errors: ScanError[] = [];
  let scannedFiles = 0;
  let skippedFiles = 0;

  // Ensure patterns are initialized
  if (!isRegistryInitialized()) {
    initializePatterns();
  }

  const resolvedOptions = resolveOptions(options);
  const files = collectFiles(resolvedOptions);
  const totalFiles = files.length;

  for (const filePath of files) {
    if (resolvedOptions.maxFiles && scannedFiles >= resolvedOptions.maxFiles) {
      break;
    }

    if (onProgress) {
      onProgress({
        totalFiles,
        scannedFiles,
        currentFile: relative(resolvedOptions.directory, filePath),
        detections: detections.length,
      });
    }

    try {
      const fileDetections = scanFileSync(filePath, resolvedOptions);
      detections.push(...fileDetections);
      scannedFiles++;

      if (
        resolvedOptions.earlyExit &&
        fileDetections.some((d) => d.confidence === "high")
      ) {
        break;
      }
    } catch (error) {
      errors.push({
        filePath,
        error: error instanceof Error ? error.message : String(error),
        recoverable: true,
      });
      skippedFiles++;
    }
  }

  const uniqueDetections = deduplicateDetections(detections);
  const summary = createSummary(uniqueDetections);
  const inferredRiskFactors = inferRiskFactors(uniqueDetections);
  const suggestedTechnical = suggestTechnical(uniqueDetections, summary);

  return {
    detections: uniqueDetections,
    summary,
    inferredRiskFactors,
    suggestedTechnical,
    scannedFiles,
    skippedFiles,
    duration: Date.now() - startTime,
    errors: errors.length > 0 ? errors : undefined,
  };
}

// ─────────────────────────────────────────────────────────────────
// HELPER FUNCTIONS
// ─────────────────────────────────────────────────────────────────

interface ResolvedScanOptions {
  directory: string;
  recursive: boolean;
  extensions: string[];
  ignorePatterns: string[];
  strategies: DetectionStrategy[];
  maxFileSize: number;
  maxFiles: number;
  earlyExit: boolean;
  respectGitignore: boolean;
  customPatterns: ScanOptions["customPatterns"];
}

function resolveOptions(options: ScanOptions): ResolvedScanOptions {
  return {
    directory: options.directory,
    recursive: options.recursive ?? true,
    extensions: options.extensions ?? [...DEFAULT_CODE_EXTENSIONS, ...MODEL_EXTENSIONS],
    ignorePatterns: options.ignorePatterns ?? DEFAULT_IGNORE_PATTERNS,
    strategies: options.strategies ?? [
      "pattern_match",
      "import_analysis",
      "file_extension",
      "annotation",
    ],
    maxFileSize: options.maxFileSize ?? 1024 * 1024, // 1MB default
    maxFiles: options.maxFiles ?? 10000,
    earlyExit: options.earlyExit ?? false,
    respectGitignore: options.respectGitignore ?? true,
    customPatterns: options.customPatterns ?? [],
  };
}

function collectFiles(options: ResolvedScanOptions): string[] {
  const files: string[] = [];
  const gitignorePatterns = options.respectGitignore
    ? loadGitignore(options.directory)
    : [];

  function walk(dir: string): void {
    let entries;
    try {
      entries = readdirSync(dir, { withFileTypes: true });
    } catch {
      return; // Skip directories we can't read
    }

    for (const entry of entries) {
      const fullPath = join(dir, entry.name);
      const relativePath = relative(options.directory, fullPath);

      // Check ignore patterns
      if (shouldIgnore(relativePath, entry.name, options.ignorePatterns, gitignorePatterns)) {
        continue;
      }

      if (entry.isDirectory() && options.recursive) {
        walk(fullPath);
      } else if (entry.isFile()) {
        const ext = extname(entry.name).toLowerCase();
        if (options.extensions.some((e) => e.toLowerCase() === ext)) {
          // Check file size
          try {
            const stats = statSync(fullPath);
            if (stats.size <= options.maxFileSize) {
              files.push(fullPath);
            }
          } catch {
            // Skip files we can't stat
          }
        }
      }
    }
  }

  if (existsSync(options.directory)) {
    const stat = statSync(options.directory);
    if (stat.isDirectory()) {
      walk(options.directory);
    } else if (stat.isFile()) {
      files.push(options.directory);
    }
  }

  return files;
}

function shouldIgnore(
  relativePath: string,
  name: string,
  ignorePatterns: string[],
  gitignorePatterns: string[]
): boolean {
  const allPatterns = [...ignorePatterns, ...gitignorePatterns];

  for (const pattern of allPatterns) {
    // Direct name match
    if (name === pattern || relativePath === pattern) {
      return true;
    }

    // Check if path contains pattern
    if (relativePath.includes(pattern)) {
      return true;
    }

    // Glob-like matching
    if (pattern.includes("*")) {
      const regexPattern = pattern
        .replace(/\./g, "\\.")
        .replace(/\*/g, ".*");
      try {
        const regex = new RegExp(regexPattern);
        if (regex.test(name) || regex.test(relativePath)) {
          return true;
        }
      } catch {
        // Invalid pattern, skip
      }
    }
  }

  return false;
}

function loadGitignore(directory: string): string[] {
  const gitignorePath = join(directory, ".gitignore");
  if (!existsSync(gitignorePath)) {
    return [];
  }

  try {
    const content = readFileSync(gitignorePath, "utf-8");
    return content
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith("#"));
  } catch {
    return [];
  }
}

async function scanFile(
  filePath: string,
  options: ResolvedScanOptions
): Promise<DetectionResult[]> {
  return scanFileSync(filePath, options);
}

function scanFileSync(
  filePath: string,
  options: ResolvedScanOptions
): DetectionResult[] {
  const detections: DetectionResult[] = [];
  const ext = extname(filePath).toLowerCase();
  const patterns = [...getAllPatterns(), ...(options.customPatterns ?? [])];

  // File extension strategy (for model files)
  if (
    options.strategies.includes("file_extension") &&
    MODEL_EXTENSIONS.some((e) => e.toLowerCase() === ext)
  ) {
    const extensionDetections = scanFileExtension(filePath);
    detections.push(...extensionDetections);
  }

  // For code files, read content and apply other strategies
  if (DEFAULT_CODE_EXTENSIONS.some((e) => e.toLowerCase() === ext)) {
    const content = readFileSync(filePath, "utf-8");
    const lines = content.split("\n");

    // Import analysis strategy
    if (options.strategies.includes("import_analysis")) {
      const importDetections = analyzeImports(filePath, content, patterns);
      detections.push(...importDetections);
    }

    // Pattern matching strategy
    if (options.strategies.includes("pattern_match")) {
      const patternDetections = matchPatterns(filePath, lines, patterns);
      detections.push(...patternDetections);
    }

    // Annotation detection strategy
    if (options.strategies.includes("annotation")) {
      const annotationDetections = detectAnnotations(filePath, lines, patterns);
      detections.push(...annotationDetections);
    }
  }

  return detections;
}

function deduplicateDetections(detections: DetectionResult[]): DetectionResult[] {
  const seen = new Map<string, DetectionResult>();

  for (const detection of detections) {
    const key = `${detection.filePath}:${detection.line}:${detection.registryCard}`;
    const existing = seen.get(key);

    // Keep higher confidence detection
    if (!existing || confidenceRank(detection.confidence) > confidenceRank(existing.confidence)) {
      seen.set(key, detection);
    }
  }

  return Array.from(seen.values());
}

function confidenceRank(level: ConfidenceLevel): number {
  const ranks: Record<ConfidenceLevel, number> = { high: 3, medium: 2, low: 1 };
  return ranks[level];
}

function createSummary(detections: DetectionResult[]): ScanSummary {
  const byFramework: Record<string, number> = {};
  const byCategory: Record<FrameworkCategory, number> = {
    llm_provider: 0,
    framework: 0,
    agent_framework: 0,
    ml_framework: 0,
    ml_ops: 0,
    model_file: 0,
  };
  const byConfidence: Record<ConfidenceLevel, number> = {
    high: 0,
    medium: 0,
    low: 0,
  };

  for (const detection of detections) {
    byFramework[detection.framework] = (byFramework[detection.framework] || 0) + 1;
    byCategory[detection.category]++;
    byConfidence[detection.confidence]++;
  }

  // Determine primary framework (most detections, weighted by confidence)
  let primaryFramework: string | undefined;
  let maxScore = 0;

  for (const [framework] of Object.entries(byFramework)) {
    const frameworkDetections = detections.filter((d) => d.framework === framework);
    const score = frameworkDetections.reduce(
      (sum, d) => sum + confidenceRank(d.confidence),
      0
    );
    if (score > maxScore) {
      maxScore = score;
      primaryFramework = framework;
    }
  }

  // Determine primary category
  let primaryCategory: FrameworkCategory | undefined;
  let maxCategoryCount = 0;

  for (const [cat, count] of Object.entries(byCategory)) {
    if (count > maxCategoryCount) {
      maxCategoryCount = count;
      primaryCategory = cat as FrameworkCategory;
    }
  }

  return {
    totalDetections: detections.length,
    byFramework,
    byCategory,
    byConfidence,
    primaryFramework,
    primaryCategory,
  };
}

function suggestTechnical(
  detections: DetectionResult[],
  summary: ScanSummary
): ScanResult["suggestedTechnical"] {
  // Determine type based on category
  const typeMap: Record<
    FrameworkCategory,
    "model" | "agent" | "api_client" | "framework" | "pipeline"
  > = {
    llm_provider: "api_client",
    framework: "framework",
    agent_framework: "agent",
    ml_framework: "model",
    ml_ops: "pipeline",
    model_file: "model",
  };

  const sourceFiles = [...new Set(detections.map((d) => d.filePath))];

  return {
    type: typeMap[summary.primaryCategory ?? "framework"],
    framework: summary.primaryFramework,
    sourceFiles,
  };
}
