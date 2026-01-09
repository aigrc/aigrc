/**
 * I2E Policy Bridge - Document Extractors
 *
 * Document extractors for the Policy Bridge. These extractors handle
 * different document formats and extract text for constraint analysis.
 *
 * @module @aigrc/i2e-bridge/extractors
 */

export * from "./base";
export * from "./manual";
export * from "./pdf";
export * from "./docx";
export * from "./url";

// Re-export types
export type {
  DocumentExtractor,
  PolicySourceInput,
  PolicySourceType,
  ExtractionResult,
} from "../types";
