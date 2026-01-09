/**
 * I2E Policy Bridge Types
 *
 * Core types for the Intent-to-Enforcement Policy Bridge.
 * These types define the contract between document ingestion,
 * constraint extraction, and policy compilation.
 *
 * @module @aigrc/i2e-bridge/types
 */

import { z } from "zod";
import type { AIR, AIRPolicySource } from "@aigrc/core";

// ─────────────────────────────────────────────────────────────────
// POLICY SOURCE TYPES
// Defines the input documents for policy compilation
// ─────────────────────────────────────────────────────────────────

export type PolicySourceType = "pdf" | "docx" | "url" | "confluence" | "jira" | "manual";

export interface PolicySourceInput {
  /** Type of source */
  type: PolicySourceType;
  /** URI or path to the source */
  uri: string;
  /** Optional title override */
  title?: string;
  /** Optional version */
  version?: string;
  /** Optional metadata */
  metadata?: Record<string, unknown>;
}

// ─────────────────────────────────────────────────────────────────
// EXTRACTION RESULT TYPES
// Results from document text extraction
// ─────────────────────────────────────────────────────────────────

export interface ExtractionResult {
  /** Whether extraction was successful */
  success: boolean;
  /** Extracted text content */
  content: string;
  /** Original source information */
  source: PolicySourceInput;
  /** Content hash (SHA-256) */
  contentHash: string;
  /** When extraction occurred */
  extractedAt: string;
  /** Number of pages/sections */
  pageCount?: number;
  /** Any warnings during extraction */
  warnings: string[];
  /** Error message if extraction failed */
  error?: string;
  /** Document metadata extracted */
  documentMetadata?: {
    title?: string;
    author?: string;
    createdAt?: string;
    modifiedAt?: string;
    pageCount?: number;
  };
}

// ─────────────────────────────────────────────────────────────────
// CONSTRAINT EXTRACTION TYPES
// Raw constraints extracted from policy documents
// ─────────────────────────────────────────────────────────────────

export type ConstraintCategory = "registry" | "runtime" | "build";

export type ConstraintType =
  // Registry constraints
  | "allowed_vendor"
  | "blocked_vendor"
  | "allowed_region"
  | "blocked_region"
  | "allowed_model"
  | "blocked_model"
  | "max_model_parameters"
  // Runtime constraints
  | "pii_filter"
  | "toxicity_filter"
  | "data_retention"
  | "watermark"
  | "logging_level"
  | "max_tokens"
  | "max_cost"
  | "kill_switch"
  | "grounding_check"
  // Build constraints
  | "require_golden_thread"
  | "require_asset_card"
  | "require_risk_classification"
  | "require_model_card"
  | "require_security_review"
  | "block_on_failure"
  | "generate_sarif"
  | "allowed_environment"
  | "required_approval";

/**
 * Raw constraint extracted from a policy document
 */
export interface ExtractedConstraint {
  /** Unique identifier for this constraint */
  id: string;
  /** Type of constraint */
  type: ConstraintType;
  /** Category (registry, runtime, build) */
  category: ConstraintCategory;
  /** Constraint value (type varies by constraint type) */
  value: unknown;
  /** Original text from policy document */
  sourceText: string;
  /** Confidence score (0-1) */
  confidence: number;
  /** Source document this was extracted from */
  sourceId: string;
  /** Page or section number in source */
  sourceLocation?: string;
  /** Extraction method used */
  extractionMethod: "manual" | "pattern" | "llm";
  /** Additional notes or context */
  notes?: string;
}

// ─────────────────────────────────────────────────────────────────
// CONSTRAINT CONFLICT TYPES
// Detected conflicts between constraints
// ─────────────────────────────────────────────────────────────────

export type ConflictSeverity = "error" | "warning" | "info";

export type ConflictResolutionStrategy =
  | "fail"           // Stop compilation with error
  | "first_wins"     // First constraint wins
  | "last_wins"      // Last constraint wins
  | "most_strict"    // Most restrictive wins
  | "manual";        // Requires manual resolution

export interface ConstraintConflict {
  /** Unique identifier for this conflict */
  id: string;
  /** Conflicting constraints */
  constraints: ExtractedConstraint[];
  /** Description of the conflict */
  description: string;
  /** Severity of the conflict */
  severity: ConflictSeverity;
  /** Suggested resolution strategy */
  suggestedResolution: ConflictResolutionStrategy;
  /** Whether this conflict has been resolved */
  resolved: boolean;
  /** Resolution details if resolved */
  resolution?: {
    strategy: ConflictResolutionStrategy;
    winningConstraintId?: string;
    resolvedBy?: string;
    resolvedAt?: string;
    notes?: string;
  };
}

// ─────────────────────────────────────────────────────────────────
// POLICY COMPILATION TYPES
// Configuration and results for policy compilation
// ─────────────────────────────────────────────────────────────────

export interface CompilerConfig {
  /** How to handle conflicts */
  conflictResolution: ConflictResolutionStrategy;
  /** Minimum confidence threshold for auto-applying constraints */
  minConfidence: number;
  /** Whether to fail on unresolved conflicts */
  strictMode: boolean;
  /** Default expiration period in days */
  defaultExpirationDays: number;
  /** Organization name */
  organization?: string;
  /** Environment (e.g., "production", "staging") */
  environment?: string;
  /** Custom metadata to include */
  metadata?: Record<string, unknown>;
}

export const DEFAULT_COMPILER_CONFIG: CompilerConfig = {
  conflictResolution: "most_strict",
  minConfidence: 0.7,
  strictMode: true,
  defaultExpirationDays: 30,
};

export interface CompilationResult {
  /** Whether compilation was successful */
  success: boolean;
  /** Compiled AIR document */
  air?: AIR;
  /** Policy sources included */
  sources: AIRPolicySource[];
  /** Constraints that were applied */
  appliedConstraints: ExtractedConstraint[];
  /** Constraints that were skipped (low confidence) */
  skippedConstraints: ExtractedConstraint[];
  /** Detected conflicts */
  conflicts: ConstraintConflict[];
  /** Unresolved conflicts (if any) */
  unresolvedConflicts: ConstraintConflict[];
  /** Compilation warnings */
  warnings: string[];
  /** Compilation errors */
  errors: string[];
  /** Compilation statistics */
  stats: {
    totalConstraints: number;
    appliedConstraints: number;
    skippedConstraints: number;
    totalConflicts: number;
    resolvedConflicts: number;
    compilationTimeMs: number;
  };
}

// ─────────────────────────────────────────────────────────────────
// EXTRACTOR INTERFACE
// Common interface for all document extractors
// ─────────────────────────────────────────────────────────────────

export interface DocumentExtractor {
  /** Name of this extractor */
  name: string;
  /** Supported source types */
  supportedTypes: PolicySourceType[];
  /** Whether this extractor is available (dependencies installed) */
  isAvailable(): boolean;
  /** Extract text from a source */
  extract(source: PolicySourceInput): Promise<ExtractionResult>;
}

// ─────────────────────────────────────────────────────────────────
// CONSTRAINT EXTRACTOR INTERFACE
// Interface for extracting constraints from text
// ─────────────────────────────────────────────────────────────────

export interface ConstraintExtractor {
  /** Name of this extractor */
  name: string;
  /** Extraction method */
  method: "manual" | "pattern" | "llm";
  /** Extract constraints from text */
  extractConstraints(
    text: string,
    sourceId: string,
    options?: {
      minConfidence?: number;
    }
  ): Promise<ExtractedConstraint[]>;
}

// ─────────────────────────────────────────────────────────────────
// ZOD SCHEMAS FOR VALIDATION
// ─────────────────────────────────────────────────────────────────

export const PolicySourceInputSchema = z.object({
  type: z.enum(["pdf", "docx", "url", "confluence", "jira", "manual"]),
  uri: z.string().min(1),
  title: z.string().optional(),
  version: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
});

export const ExtractedConstraintSchema = z.object({
  id: z.string().min(1),
  type: z.string(),
  category: z.enum(["registry", "runtime", "build"]),
  value: z.unknown(),
  sourceText: z.string(),
  confidence: z.number().min(0).max(1),
  sourceId: z.string(),
  sourceLocation: z.string().optional(),
  extractionMethod: z.enum(["manual", "pattern", "llm"]),
  notes: z.string().optional(),
});

export const CompilerConfigSchema = z.object({
  conflictResolution: z.enum(["fail", "first_wins", "last_wins", "most_strict", "manual"]),
  minConfidence: z.number().min(0).max(1),
  strictMode: z.boolean(),
  defaultExpirationDays: z.number().int().positive(),
  organization: z.string().optional(),
  environment: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
});
