import { z } from "zod";
import type { RiskFactors, Technical } from "../schemas";

// ─────────────────────────────────────────────────────────────────
// CONFIDENCE LEVELS
// ─────────────────────────────────────────────────────────────────

export const ConfidenceLevelSchema = z.enum(["high", "medium", "low"]);
export type ConfidenceLevel = z.infer<typeof ConfidenceLevelSchema>;

// ─────────────────────────────────────────────────────────────────
// DETECTION STRATEGY TYPES
// ─────────────────────────────────────────────────────────────────

export const DetectionStrategySchema = z.enum([
  "pattern_match",
  "import_analysis",
  "file_extension",
  "annotation",
]);
export type DetectionStrategy = z.infer<typeof DetectionStrategySchema>;

// ─────────────────────────────────────────────────────────────────
// FRAMEWORK CATEGORY
// ─────────────────────────────────────────────────────────────────

export const FrameworkCategorySchema = z.enum([
  "llm_provider",
  "framework",
  "agent_framework",
  "ml_framework",
  "ml_ops",
  "model_file",
]);
export type FrameworkCategory = z.infer<typeof FrameworkCategorySchema>;

// ─────────────────────────────────────────────────────────────────
// RISK IMPLICATION
// ─────────────────────────────────────────────────────────────────

export interface RiskImplication {
  factor: keyof RiskFactors;
  value: boolean | "yes" | "no" | "unknown";
  reason: string;
}

// ─────────────────────────────────────────────────────────────────
// PATTERN DEFINITION
// ─────────────────────────────────────────────────────────────────

export type PatternRuleType = "regex" | "literal" | "import" | "decorator";
export type PatternLanguage = "python" | "javascript" | "typescript" | "any";

export interface PatternRule {
  type: PatternRuleType;
  pattern: string;
  confidence: ConfidenceLevel;
  description?: string;
}

export interface PatternDefinition {
  id: string;
  name: string;
  category: FrameworkCategory;
  language: PatternLanguage;
  patterns: PatternRule[];
  implies: RiskImplication[];
  version?: string;
  documentation?: string;
}

// ─────────────────────────────────────────────────────────────────
// DETECTION RESULT
// ─────────────────────────────────────────────────────────────────

export interface DetectionResult {
  filePath: string;
  line: number;
  column?: number;
  match: string;
  matchContext?: string;
  registryCard: string;
  framework: string;
  category: FrameworkCategory;
  confidence: ConfidenceLevel;
  strategy: DetectionStrategy;
  implies: RiskImplication[];
  metadata?: Record<string, unknown>;
}

// ─────────────────────────────────────────────────────────────────
// SCAN OPTIONS
// ─────────────────────────────────────────────────────────────────

export interface ScanOptions {
  directory: string;
  recursive?: boolean;
  extensions?: string[];
  ignorePatterns?: string[];
  strategies?: DetectionStrategy[];
  maxFileSize?: number;
  maxFiles?: number;
  earlyExit?: boolean;
  respectGitignore?: boolean;
  customPatterns?: PatternDefinition[];
}

export interface ScanProgress {
  totalFiles: number;
  scannedFiles: number;
  currentFile: string;
  detections: number;
}

export type ScanProgressCallback = (progress: ScanProgress) => void;

// ─────────────────────────────────────────────────────────────────
// SCAN RESULT
// ─────────────────────────────────────────────────────────────────

export interface ScanSummary {
  totalDetections: number;
  byFramework: Record<string, number>;
  byCategory: Record<FrameworkCategory, number>;
  byConfidence: Record<ConfidenceLevel, number>;
  primaryFramework?: string;
  primaryCategory?: FrameworkCategory;
}

export interface ScanError {
  filePath: string;
  error: string;
  recoverable: boolean;
}

export interface ScanResult {
  detections: DetectionResult[];
  summary: ScanSummary;
  inferredRiskFactors: Partial<RiskFactors>;
  suggestedTechnical: Partial<Technical>;
  scannedFiles: number;
  skippedFiles: number;
  duration: number;
  errors?: ScanError[];
}

// ─────────────────────────────────────────────────────────────────
// ASSET CARD SUGGESTION
// ─────────────────────────────────────────────────────────────────

export interface AssetCardSuggestion {
  name: string;
  description: string;
  technical: {
    type: Technical["type"];
    framework: string;
    components: Array<{
      type: string;
      provider?: string;
      model?: string;
    }>;
    sourceFiles: string[];
  };
  riskFactors: Partial<RiskFactors>;
  confidence: ConfidenceLevel;
  basedOn: string[];
}
