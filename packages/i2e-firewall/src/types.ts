/**
 * I2E Supply Chain Firewall Types
 *
 * Core types for the Supply Chain Firewall that enforces AIR constraints
 * across IDE, CI/CD, and runtime environments.
 *
 * @module @aigrc/i2e-firewall/types
 */

import { z } from "zod";
import type { AIR, AIRVendor, AIRModel, AIRRegion } from "@aigrc/core";

// ─────────────────────────────────────────────────────────────────
// VIOLATION TYPES
// Represents a policy violation detected by the firewall
// ─────────────────────────────────────────────────────────────────

export type ViolationSeverity = "error" | "warning" | "info";

export type ViolationType =
  | "blocked_vendor"
  | "unapproved_vendor"
  | "blocked_model"
  | "unapproved_model"
  | "blocked_region"
  | "unapproved_region"
  | "missing_governance_lock"
  | "expired_governance_lock"
  | "constraint_violation";

export interface Violation {
  /** Unique identifier for this violation */
  id: string;
  /** Type of violation */
  type: ViolationType;
  /** Severity level */
  severity: ViolationSeverity;
  /** Human-readable message */
  message: string;
  /** Detailed description */
  description?: string;
  /** Source file where violation was detected */
  file?: string;
  /** Line number in source file */
  line?: number;
  /** Column number in source file */
  column?: number;
  /** End line (for ranges) */
  endLine?: number;
  /** End column (for ranges) */
  endColumn?: number;
  /** The violating value (e.g., vendor ID, model ID) */
  violatingValue?: string;
  /** Approved alternatives if available */
  alternatives?: string[];
  /** Rule ID that was violated */
  ruleId?: string;
  /** Link to documentation */
  helpUri?: string;
}

// ─────────────────────────────────────────────────────────────────
// CHECK RESULT TYPES
// Results from constraint checking operations
// ─────────────────────────────────────────────────────────────────

export interface CheckResult {
  /** Whether the check passed (no violations) */
  passed: boolean;
  /** List of violations detected */
  violations: Violation[];
  /** Warnings (non-blocking) */
  warnings: Violation[];
  /** Info-level messages */
  info: Violation[];
  /** The value that was checked */
  checkedValue: string;
  /** Timestamp of the check */
  timestamp: string;
  /** Duration of check in milliseconds */
  durationMs: number;
}

export interface VendorCheckResult extends CheckResult {
  /** The vendor ID that was checked */
  vendorId: string;
  /** Whether the vendor is approved */
  isApproved: boolean;
  /** Whether the vendor is explicitly blocked */
  isBlocked: boolean;
  /** Matching approved vendor info if found */
  approvedVendor?: AIRVendor;
}

export interface ModelCheckResult extends CheckResult {
  /** The model ID that was checked */
  modelId: string;
  /** The vendor ID associated with the model */
  vendorId?: string;
  /** Whether the model is approved */
  isApproved: boolean;
  /** Whether the model is explicitly blocked */
  isBlocked: boolean;
  /** Matching approved model info if found */
  approvedModel?: AIRModel;
}

export interface RegionCheckResult extends CheckResult {
  /** The region code that was checked */
  regionCode: string;
  /** Whether the region is allowed */
  isAllowed: boolean;
  /** Whether the region is explicitly blocked */
  isBlocked: boolean;
  /** Matching region info if found */
  region?: AIRRegion;
}

// ─────────────────────────────────────────────────────────────────
// SCAN RESULT TYPES
// Results from code/project scanning operations
// ─────────────────────────────────────────────────────────────────

export interface ScanTarget {
  /** Type of target being scanned */
  type: "file" | "directory" | "project" | "package";
  /** Path to the target */
  path: string;
  /** Optional language/framework hint */
  language?: string;
}

export interface DetectedUsage {
  /** Type of AI usage detected */
  type: "vendor" | "model" | "sdk" | "import";
  /** The value detected (vendor ID, model ID, etc.) */
  value: string;
  /** Source file */
  file: string;
  /** Line number */
  line: number;
  /** Column number */
  column: number;
  /** The matched code snippet */
  snippet?: string;
  /** Confidence score (0-1) */
  confidence: number;
}

export interface ScanResult {
  /** Whether the scan passed (no blocking violations) */
  passed: boolean;
  /** Target that was scanned */
  target: ScanTarget;
  /** AI usages detected */
  detectedUsages: DetectedUsage[];
  /** All violations found */
  violations: Violation[];
  /** Files scanned */
  filesScanned: number;
  /** Files with violations */
  filesWithViolations: number;
  /** Scan duration in milliseconds */
  durationMs: number;
  /** Timestamp */
  timestamp: string;
}

// ─────────────────────────────────────────────────────────────────
// GOVERNANCE LOCK VALIDATION
// ─────────────────────────────────────────────────────────────────

export interface GovernanceLockValidation {
  /** Whether the lock file is valid */
  valid: boolean;
  /** Whether the lock file exists */
  exists: boolean;
  /** Whether the lock file has expired */
  expired: boolean;
  /** Whether the signature is valid (if signed) */
  signatureValid?: boolean;
  /** Path to the lock file */
  path?: string;
  /** Errors encountered */
  errors: string[];
  /** Warnings */
  warnings: string[];
  /** The parsed AIR if valid */
  air?: AIR;
}

// ─────────────────────────────────────────────────────────────────
// FIREWALL CONFIGURATION
// ─────────────────────────────────────────────────────────────────

export interface FirewallConfig {
  /** Path to governance.lock file */
  lockFilePath?: string;
  /** Whether to fail on warnings */
  failOnWarnings?: boolean;
  /** Minimum severity to report */
  minSeverity?: ViolationSeverity;
  /** File patterns to scan */
  includePatterns?: string[];
  /** File patterns to exclude */
  excludePatterns?: string[];
  /** Languages to scan for */
  languages?: string[];
  /** Whether to generate SARIF output */
  generateSarif?: boolean;
  /** Output directory for reports */
  outputDir?: string;
  /** Whether to show approved alternatives */
  showAlternatives?: boolean;
}

export const DEFAULT_FIREWALL_CONFIG: FirewallConfig = {
  lockFilePath: "governance.lock",
  failOnWarnings: false,
  minSeverity: "warning",
  includePatterns: ["**/*.ts", "**/*.js", "**/*.py", "**/*.java"],
  excludePatterns: ["**/node_modules/**", "**/dist/**", "**/.git/**"],
  languages: ["typescript", "javascript", "python"],
  generateSarif: false,
  showAlternatives: true,
};

// ─────────────────────────────────────────────────────────────────
// ZOD SCHEMAS
// ─────────────────────────────────────────────────────────────────

export const ViolationSchema = z.object({
  id: z.string(),
  type: z.enum([
    "blocked_vendor",
    "unapproved_vendor",
    "blocked_model",
    "unapproved_model",
    "blocked_region",
    "unapproved_region",
    "missing_governance_lock",
    "expired_governance_lock",
    "constraint_violation",
  ]),
  severity: z.enum(["error", "warning", "info"]),
  message: z.string(),
  description: z.string().optional(),
  file: z.string().optional(),
  line: z.number().optional(),
  column: z.number().optional(),
  endLine: z.number().optional(),
  endColumn: z.number().optional(),
  violatingValue: z.string().optional(),
  alternatives: z.array(z.string()).optional(),
  ruleId: z.string().optional(),
  helpUri: z.string().optional(),
});

export const FirewallConfigSchema = z.object({
  lockFilePath: z.string().optional(),
  failOnWarnings: z.boolean().optional(),
  minSeverity: z.enum(["error", "warning", "info"]).optional(),
  includePatterns: z.array(z.string()).optional(),
  excludePatterns: z.array(z.string()).optional(),
  languages: z.array(z.string()).optional(),
  generateSarif: z.boolean().optional(),
  outputDir: z.string().optional(),
  showAlternatives: z.boolean().optional(),
});
