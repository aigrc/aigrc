/**
 * Manual Policy Extractor
 *
 * Extracts policy constraints from manually authored YAML/JSON files.
 * This is the primary way to define constraints without document parsing.
 *
 * @module @aigrc/i2e-bridge/extractors/manual
 */

import { readFile } from "fs/promises";
import * as yaml from "yaml";
import { z } from "zod";
import {
  BaseDocumentExtractor,
  computeContentHash,
  createSuccessResult,
  createErrorResult,
} from "./base";
import type {
  PolicySourceInput,
  PolicySourceType,
  ExtractionResult,
  ExtractedConstraint,
  ConstraintCategory,
  ConstraintType,
} from "../types";

// ─────────────────────────────────────────────────────────────────
// MANUAL CONSTRAINT FILE SCHEMA
// Schema for manually authored constraint files
// ─────────────────────────────────────────────────────────────────

const ManualConstraintSchema = z.object({
  /** Constraint type */
  type: z.string(),
  /** Constraint value */
  value: z.unknown(),
  /** Optional notes */
  notes: z.string().optional(),
  /** Source reference (e.g., "Corporate AI Policy v2, Section 3.1") */
  sourceReference: z.string().optional(),
});

const ManualConstraintFileSchema = z.object({
  /** Schema version */
  version: z.literal("1.0").optional().default("1.0"),
  /** Policy name/title */
  name: z.string().optional(),
  /** Policy description */
  description: z.string().optional(),
  /** Registry constraints */
  registry: z.object({
    allowed_vendors: z.array(z.union([z.string(), ManualConstraintSchema])).optional(),
    blocked_vendors: z.array(z.union([z.string(), ManualConstraintSchema])).optional(),
    allowed_regions: z.array(z.union([z.string(), ManualConstraintSchema])).optional(),
    blocked_regions: z.array(z.union([z.string(), ManualConstraintSchema])).optional(),
    allowed_models: z.array(z.union([z.string(), ManualConstraintSchema])).optional(),
    blocked_models: z.array(z.union([z.string(), ManualConstraintSchema])).optional(),
    max_model_parameters: z.number().positive().optional(),
  }).optional(),
  /** Runtime constraints */
  runtime: z.object({
    pii_filter: z.object({
      enabled: z.boolean(),
      action: z.enum(["redact", "block", "warn", "audit"]).optional(),
      filter_types: z.array(z.string()).optional(),
    }).optional(),
    toxicity_filter: z.object({
      enabled: z.boolean(),
      threshold: z.number().min(0).max(1).optional(),
      action: z.enum(["block", "warn", "audit"]).optional(),
    }).optional(),
    data_retention_days: z.number().int().min(0).optional(),
    watermark_enabled: z.boolean().optional(),
    logging_level: z.enum(["none", "errors", "all"]).optional(),
    max_tokens_per_request: z.number().int().positive().optional(),
    max_cost_per_day_usd: z.number().positive().optional(),
    kill_switch_enabled: z.boolean().optional(),
  }).optional(),
  /** Build constraints */
  build: z.object({
    require_golden_thread: z.boolean().optional(),
    require_asset_card: z.boolean().optional(),
    require_risk_classification: z.boolean().optional(),
    require_model_card: z.boolean().optional(),
    require_security_review: z.boolean().optional(),
    security_review_risk_levels: z.array(z.enum(["high", "unacceptable"])).optional(),
    block_on_failure: z.boolean().optional(),
    generate_sarif: z.boolean().optional(),
    allowed_environments: z.array(z.string()).optional(),
    required_approvals: z.array(z.object({
      role: z.string(),
      count: z.number().int().positive().optional(),
    })).optional(),
  }).optional(),
  /** Custom metadata */
  metadata: z.record(z.unknown()).optional(),
});

export type ManualConstraintFile = z.infer<typeof ManualConstraintFileSchema>;

/**
 * Manual Policy Extractor
 *
 * Extracts constraints from manually authored YAML/JSON policy files.
 */
export class ManualExtractor extends BaseDocumentExtractor {
  name = "manual";
  supportedTypes: PolicySourceType[] = ["manual"];

  isAvailable(): boolean {
    return true; // Always available
  }

  async extract(source: PolicySourceInput): Promise<ExtractionResult> {
    const validationError = this.validateSource(source);
    if (validationError) {
      return createErrorResult(source, validationError);
    }

    try {
      // Read file content
      const content = await readFile(source.uri, "utf-8");
      const contentHash = await computeContentHash(content);

      return createSuccessResult(source, content, contentHash, {
        warnings: [],
        documentMetadata: {
          title: source.title,
        },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return createErrorResult(source, `Failed to read manual policy file: ${message}`);
    }
  }

  /**
   * Parses a manual constraint file and extracts structured constraints
   */
  async parseConstraintFile(source: PolicySourceInput): Promise<{
    success: boolean;
    constraints: ExtractedConstraint[];
    file?: ManualConstraintFile;
    errors: string[];
  }> {
    const extraction = await this.extract(source);
    if (!extraction.success) {
      return {
        success: false,
        constraints: [],
        errors: [extraction.error ?? "Extraction failed"],
      };
    }

    try {
      // Parse as YAML (also supports JSON)
      const parsed = yaml.parse(extraction.content);
      const validated = ManualConstraintFileSchema.parse(parsed);

      // Extract constraints
      const constraints = this.extractConstraintsFromFile(validated, source.uri);

      return {
        success: true,
        constraints,
        file: validated,
        errors: [],
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        constraints: [],
        errors: [`Failed to parse manual policy file: ${message}`],
      };
    }
  }

  /**
   * Extracts constraint objects from a parsed manual file
   */
  private extractConstraintsFromFile(
    file: ManualConstraintFile,
    sourceId: string
  ): ExtractedConstraint[] {
    const constraints: ExtractedConstraint[] = [];
    let constraintIndex = 0;

    const createConstraint = (
      type: ConstraintType,
      category: ConstraintCategory,
      value: unknown,
      sourceText: string,
      notes?: string
    ): ExtractedConstraint => ({
      id: `manual-${sourceId}-${constraintIndex++}`,
      type,
      category,
      value,
      sourceText,
      confidence: 1.0, // Manual constraints have 100% confidence
      sourceId,
      extractionMethod: "manual",
      notes,
    });

    // Extract registry constraints
    if (file.registry) {
      const r = file.registry;

      if (r.allowed_vendors) {
        for (const v of r.allowed_vendors) {
          const value = typeof v === "string" ? v : v.value;
          const notes = typeof v === "object" ? v.notes : undefined;
          constraints.push(createConstraint(
            "allowed_vendor",
            "registry",
            value,
            `Allowed vendor: ${value}`,
            notes
          ));
        }
      }

      if (r.blocked_vendors) {
        for (const v of r.blocked_vendors) {
          const value = typeof v === "string" ? v : v.value;
          const notes = typeof v === "object" ? v.notes : undefined;
          constraints.push(createConstraint(
            "blocked_vendor",
            "registry",
            value,
            `Blocked vendor: ${value}`,
            notes
          ));
        }
      }

      if (r.allowed_regions) {
        for (const v of r.allowed_regions) {
          const value = typeof v === "string" ? v : v.value;
          const notes = typeof v === "object" ? v.notes : undefined;
          constraints.push(createConstraint(
            "allowed_region",
            "registry",
            value,
            `Allowed region: ${value}`,
            notes
          ));
        }
      }

      if (r.blocked_regions) {
        for (const v of r.blocked_regions) {
          const value = typeof v === "string" ? v : v.value;
          const notes = typeof v === "object" ? v.notes : undefined;
          constraints.push(createConstraint(
            "blocked_region",
            "registry",
            value,
            `Blocked region: ${value}`,
            notes
          ));
        }
      }

      if (r.allowed_models) {
        for (const v of r.allowed_models) {
          const value = typeof v === "string" ? v : v.value;
          const notes = typeof v === "object" ? v.notes : undefined;
          constraints.push(createConstraint(
            "allowed_model",
            "registry",
            value,
            `Allowed model: ${value}`,
            notes
          ));
        }
      }

      if (r.blocked_models) {
        for (const v of r.blocked_models) {
          const value = typeof v === "string" ? v : v.value;
          const notes = typeof v === "object" ? v.notes : undefined;
          constraints.push(createConstraint(
            "blocked_model",
            "registry",
            value,
            `Blocked model: ${value}`,
            notes
          ));
        }
      }

      if (r.max_model_parameters !== undefined) {
        constraints.push(createConstraint(
          "max_model_parameters",
          "registry",
          r.max_model_parameters,
          `Max model parameters: ${r.max_model_parameters}`
        ));
      }
    }

    // Extract runtime constraints
    if (file.runtime) {
      const rt = file.runtime;

      if (rt.pii_filter) {
        constraints.push(createConstraint(
          "pii_filter",
          "runtime",
          rt.pii_filter,
          `PII filter: ${rt.pii_filter.enabled ? "enabled" : "disabled"}`
        ));
      }

      if (rt.toxicity_filter) {
        constraints.push(createConstraint(
          "toxicity_filter",
          "runtime",
          rt.toxicity_filter,
          `Toxicity filter: ${rt.toxicity_filter.enabled ? "enabled" : "disabled"}`
        ));
      }

      if (rt.data_retention_days !== undefined) {
        constraints.push(createConstraint(
          "data_retention",
          "runtime",
          rt.data_retention_days,
          `Data retention: ${rt.data_retention_days} days`
        ));
      }

      if (rt.watermark_enabled !== undefined) {
        constraints.push(createConstraint(
          "watermark",
          "runtime",
          rt.watermark_enabled,
          `Watermark: ${rt.watermark_enabled ? "enabled" : "disabled"}`
        ));
      }

      if (rt.logging_level) {
        constraints.push(createConstraint(
          "logging_level",
          "runtime",
          rt.logging_level,
          `Logging level: ${rt.logging_level}`
        ));
      }

      if (rt.max_tokens_per_request !== undefined) {
        constraints.push(createConstraint(
          "max_tokens",
          "runtime",
          rt.max_tokens_per_request,
          `Max tokens per request: ${rt.max_tokens_per_request}`
        ));
      }

      if (rt.max_cost_per_day_usd !== undefined) {
        constraints.push(createConstraint(
          "max_cost",
          "runtime",
          rt.max_cost_per_day_usd,
          `Max cost per day: $${rt.max_cost_per_day_usd}`
        ));
      }

      if (rt.kill_switch_enabled !== undefined) {
        constraints.push(createConstraint(
          "kill_switch",
          "runtime",
          rt.kill_switch_enabled,
          `Kill switch: ${rt.kill_switch_enabled ? "enabled" : "disabled"}`
        ));
      }
    }

    // Extract build constraints
    if (file.build) {
      const b = file.build;

      if (b.require_golden_thread !== undefined) {
        constraints.push(createConstraint(
          "require_golden_thread",
          "build",
          b.require_golden_thread,
          `Require Golden Thread: ${b.require_golden_thread}`
        ));
      }

      if (b.require_asset_card !== undefined) {
        constraints.push(createConstraint(
          "require_asset_card",
          "build",
          b.require_asset_card,
          `Require Asset Card: ${b.require_asset_card}`
        ));
      }

      if (b.require_risk_classification !== undefined) {
        constraints.push(createConstraint(
          "require_risk_classification",
          "build",
          b.require_risk_classification,
          `Require Risk Classification: ${b.require_risk_classification}`
        ));
      }

      if (b.require_model_card !== undefined) {
        constraints.push(createConstraint(
          "require_model_card",
          "build",
          b.require_model_card,
          `Require Model Card: ${b.require_model_card}`
        ));
      }

      if (b.require_security_review !== undefined) {
        constraints.push(createConstraint(
          "require_security_review",
          "build",
          { enabled: b.require_security_review, risk_levels: b.security_review_risk_levels },
          `Require Security Review: ${b.require_security_review}`
        ));
      }

      if (b.block_on_failure !== undefined) {
        constraints.push(createConstraint(
          "block_on_failure",
          "build",
          b.block_on_failure,
          `Block on failure: ${b.block_on_failure}`
        ));
      }

      if (b.generate_sarif !== undefined) {
        constraints.push(createConstraint(
          "generate_sarif",
          "build",
          b.generate_sarif,
          `Generate SARIF: ${b.generate_sarif}`
        ));
      }

      if (b.allowed_environments) {
        for (const env of b.allowed_environments) {
          constraints.push(createConstraint(
            "allowed_environment",
            "build",
            env,
            `Allowed environment: ${env}`
          ));
        }
      }

      if (b.required_approvals) {
        for (const approval of b.required_approvals) {
          constraints.push(createConstraint(
            "required_approval",
            "build",
            approval,
            `Required approval: ${approval.role} (${approval.count ?? 1})`
          ));
        }
      }
    }

    return constraints;
  }
}
