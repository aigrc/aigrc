/**
 * @aigrc/i2e-bridge - I2E Policy Bridge
 *
 * The Intent-to-Enforcement (I2E) Policy Bridge transforms governance policy
 * from static documentation into executable infrastructure. It handles document
 * ingestion, constraint extraction, and policy compilation.
 *
 * @module @aigrc/i2e-bridge
 *
 * @example
 * ```typescript
 * import { ManualExtractor, PolicyCompiler } from "@aigrc/i2e-bridge";
 *
 * // Extract constraints from a manual policy file
 * const extractor = new ManualExtractor();
 * const result = await extractor.parseConstraintFile({
 *   type: "manual",
 *   uri: "./policy.yaml"
 * });
 *
 * // Compile into AIR and governance.lock
 * const compiler = new PolicyCompiler();
 * const compilation = await compiler.compile([{
 *   source: { type: "manual", uri: "./policy.yaml" },
 *   extraction: { ... },
 *   constraints: result.constraints
 * }]);
 *
 * if (compilation.success) {
 *   const lock = await compiler.createLock(compilation.air);
 *   console.log("Policy compiled successfully!");
 * }
 * ```
 */

// Types
export * from "./types";

// Extractors
export {
  BaseDocumentExtractor,
  ExtractorRegistry,
  extractorRegistry,
  computeContentHash,
  createSuccessResult,
  createErrorResult,
  ManualExtractor,
  PdfExtractor,
  pdfExtractor,
  DocxExtractor,
  docxExtractor,
  UrlExtractor,
  urlExtractor,
} from "./extractors";

// Compiler
export {
  PolicyCompiler,
  createCompiler,
  detectConflicts,
  resolveConflict,
  mergeConstraints,
} from "./compiler";

// Re-export AIR and governance.lock types from core
export type {
  AIR,
  AIRPolicySource,
  AIRRegistryConstraints,
  AIRRuntimeConstraints,
  AIRBuildConstraints,
  GovernanceLock,
} from "@aigrc/core";
