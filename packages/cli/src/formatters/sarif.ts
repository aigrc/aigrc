// ─────────────────────────────────────────────────────────────────
// SARIF OUTPUT FORMATTER (AIG-97)
// Generate SARIF 2.1.0 compliant output for validation results
// ─────────────────────────────────────────────────────────────────

import type { AssetCard } from "@aigrc/core";

/**
 * SARIF 2.1.0 types
 */
export interface SarifLog {
  version: "2.1.0";
  $schema: string;
  runs: SarifRun[];
}

export interface SarifRun {
  tool: SarifTool;
  results: SarifResult[];
  artifacts?: SarifArtifact[];
}

export interface SarifTool {
  driver: SarifDriver;
}

export interface SarifDriver {
  name: string;
  version: string;
  informationUri?: string;
  rules?: SarifRule[];
}

export interface SarifRule {
  id: string;
  name?: string;
  shortDescription?: SarifMessage;
  fullDescription?: SarifMessage;
  help?: SarifMessage;
  defaultConfiguration?: {
    level: "warning" | "error" | "note";
  };
}

export interface SarifResult {
  ruleId: string;
  level: "warning" | "error" | "note" | "none";
  message: SarifMessage;
  locations?: SarifLocation[];
  properties?: Record<string, unknown>;
}

export interface SarifMessage {
  text: string;
}

export interface SarifLocation {
  physicalLocation?: {
    artifactLocation: {
      uri: string;
      uriBaseId?: string;
    };
    region?: {
      startLine?: number;
      startColumn?: number;
      endLine?: number;
      endColumn?: number;
    };
  };
}

export interface SarifArtifact {
  location: {
    uri: string;
  };
  length?: number;
  mimeType?: string;
}

/**
 * Validation result for SARIF formatting
 */
export interface ValidationResult {
  path: string;
  card?: AssetCard;
  validation: {
    valid: boolean;
    errors: string[];
  };
}

/**
 * Generate SARIF 2.1.0 output from validation results
 */
export function formatSarif(
  results: ValidationResult[],
  version = "0.1.0"
): SarifLog {
  const sarifResults: SarifResult[] = [];
  const artifacts: SarifArtifact[] = [];
  const seenPaths = new Set<string>();

  for (const result of results) {
    // Add artifact if not seen
    if (!seenPaths.has(result.path)) {
      seenPaths.add(result.path);
      artifacts.push({
        location: {
          uri: result.path,
        },
        mimeType: "application/x-yaml",
      });
    }

    // Add results for each error
    if (!result.validation.valid) {
      for (const error of result.validation.errors) {
        sarifResults.push({
          ruleId: "AIGRC001",
          level: "error",
          message: {
            text: error,
          },
          locations: [
            {
              physicalLocation: {
                artifactLocation: {
                  uri: result.path,
                },
              },
            },
          ],
          properties: {
            cardId: result.card?.id,
            cardName: result.card?.name,
          },
        });
      }
    } else {
      // Add success result
      sarifResults.push({
        ruleId: "AIGRC001",
        level: "none",
        message: {
          text: "Asset card validation passed",
        },
        locations: [
          {
            physicalLocation: {
              artifactLocation: {
                uri: result.path,
              },
            },
          },
        ],
        properties: {
          cardId: result.card?.id,
          cardName: result.card?.name,
          riskLevel: result.card?.classification?.riskLevel,
        },
      });
    }
  }

  const sarif: SarifLog = {
    version: "2.1.0",
    $schema:
      "https://raw.githubusercontent.com/oasis-tcs/sarif-spec/master/Schemata/sarif-schema-2.1.0.json",
    runs: [
      {
        tool: {
          driver: {
            name: "AIGRC",
            version,
            informationUri: "https://github.com/aigrc/aigrc",
            rules: [
              {
                id: "AIGRC001",
                name: "AssetCardValidation",
                shortDescription: {
                  text: "Asset card must be valid according to AIGRC schema",
                },
                fullDescription: {
                  text: "Validates asset cards against AIGRC compliance requirements including risk classification, ownership, and regulatory framework mappings.",
                },
                help: {
                  text: "Ensure your asset card includes all required fields and follows the AIGRC schema. Run 'aigrc validate --help' for more information.",
                },
                defaultConfiguration: {
                  level: "error",
                },
              },
            ],
          },
        },
        results: sarifResults,
        artifacts,
      },
    ],
  };

  return sarif;
}

/**
 * Convert SARIF log to JSON string
 */
export function sarifToJson(sarif: SarifLog, pretty = true): string {
  return JSON.stringify(sarif, null, pretty ? 2 : 0);
}
