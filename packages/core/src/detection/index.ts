// ─────────────────────────────────────────────────────────────────
// DETECTION ENGINE - Public API
// ─────────────────────────────────────────────────────────────────

// Types
export type {
  DetectionResult,
  ScanOptions,
  ScanResult,
  ScanSummary,
  ScanProgress,
  ScanProgressCallback,
  ScanError,
  PatternDefinition,
  PatternRule,
  PatternRuleType,
  PatternLanguage,
  RiskImplication,
  AssetCardSuggestion,
  ConfidenceLevel,
  DetectionStrategy,
  FrameworkCategory,
} from "./types";

// Zod schemas
export { ConfidenceLevelSchema, DetectionStrategySchema, FrameworkCategorySchema } from "./types";

// Main scan functions
export { scan, scanSync } from "./scanner";

// Risk inference
export { inferRiskFactors, applyImplicationChains } from "./risk-inference";

// Asset card suggestion
export { suggestAssetCard } from "./asset-suggestion";

// Pattern registry
export {
  registerPattern,
  getPattern,
  getAllPatterns,
  getPatternsByCategory,
  getPatternsByLanguage,
  clearRegistry,
  isRegistryInitialized,
  createImplication,
  initializePatterns,
  resetPatterns,
} from "./patterns";

// Individual pattern sets (for reference/extension)
export { pythonPatterns } from "./patterns/python";
export { javascriptPatterns } from "./patterns/javascript";
export { modelFilePatterns } from "./patterns/model-files";
export { riskIndicatorPatterns } from "./patterns/risk-indicators";

// Strategies (for advanced usage)
export { matchPatterns } from "./strategies/pattern-matcher";
export { analyzeImports } from "./strategies/import-analyzer";
export { scanFileExtension, isModelFile, MODEL_EXTENSIONS } from "./strategies/file-scanner";
export { detectAnnotations } from "./strategies/annotation-detector";
