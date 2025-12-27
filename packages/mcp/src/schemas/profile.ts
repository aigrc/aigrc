/**
 * Profile Schema Definitions
 *
 * Zod schemas for compliance profile YAML files.
 */

import { z } from "zod";

/**
 * Control definition within a compliance profile
 */
export const ControlDefinitionSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string(),
  applicableRiskLevels: z.array(z.string()),
  required: z.boolean(),
  category: z.string(),
  // Cross-framework control mappings
  crosswalkIds: z.record(z.string(), z.array(z.string())).optional(),
});

export type ControlDefinition = z.infer<typeof ControlDefinitionSchema>;

/**
 * Artifact template definition
 */
export const ArtifactTemplateSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string(),
  format: z.enum(["markdown", "yaml", "json", "pdf"]),
  requiredFor: z.array(z.string()),
  templatePath: z.string().optional(),
});

export type ArtifactTemplate = z.infer<typeof ArtifactTemplateSchema>;

/**
 * Risk level mapping from AIGRC standard levels to profile-specific levels
 */
export const RiskLevelMappingSchema = z.record(z.string(), z.string());

export type RiskLevelMapping = z.infer<typeof RiskLevelMappingSchema>;

/**
 * Full compliance profile schema
 */
export const ComplianceProfileSchema = z.object({
  // Identification
  id: z.string().min(1),
  name: z.string().min(1),
  version: z.string(),
  jurisdiction: z.string(),
  description: z.string(),
  effectiveDate: z.string().optional(),

  // Risk levels supported by this profile
  riskLevels: z.array(z.string()),

  // Mapping from AIGRC levels (minimal/limited/high/unacceptable) to profile levels
  riskLevelMapping: RiskLevelMappingSchema.optional(),

  // Controls required by this profile
  controls: z.array(ControlDefinitionSchema),

  // Artifact templates
  artifactTemplates: z.array(ArtifactTemplateSchema),

  // NIST trustworthiness characteristics tracked by this profile
  trustworthinessCharacteristics: z.array(z.string()).optional(),

  // Profile metadata
  sourceDocument: z.string().optional(),
  sourceUrl: z.string().url().optional(),
});

export type ComplianceProfile = z.infer<typeof ComplianceProfileSchema>;

/**
 * Validate a profile object against the schema
 */
export function validateProfile(
  data: unknown
): { valid: true; profile: ComplianceProfile } | { valid: false; errors: string[] } {
  const result = ComplianceProfileSchema.safeParse(data);
  if (result.success) {
    return { valid: true, profile: result.data };
  }
  return {
    valid: false,
    errors: result.error.errors.map((e) => `${e.path.join(".")}: ${e.message}`),
  };
}
