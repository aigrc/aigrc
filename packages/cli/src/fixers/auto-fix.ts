// ─────────────────────────────────────────────────────────────────
// AUTO-FIX LOGIC (AIG-98)
// Automatically fix common issues in asset cards
// ─────────────────────────────────────────────────────────────────

import type { AssetCard } from "@aigrc/core";

/**
 * Auto-fix result
 */
export interface AutoFixResult {
  fixed: boolean;
  fixedFields: string[];
  card: AssetCard;
}

/**
 * Automatically fix common issues in asset cards
 */
export function autoFixAssetCard(card: AssetCard): AutoFixResult {
  const fixedFields: string[] = [];
  const fixedCard = JSON.parse(JSON.stringify(card)) as AssetCard;

  // Fix missing or invalid dates
  if (!fixedCard.metadata?.createdAt) {
    if (!fixedCard.metadata) {
      fixedCard.metadata = {
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        version: "1.0.0",
      };
    } else {
      fixedCard.metadata.createdAt = new Date().toISOString();
    }
    fixedFields.push("metadata.createdAt");
  } else if (!isValidISODate(fixedCard.metadata.createdAt)) {
    fixedCard.metadata.createdAt = normalizeDate(fixedCard.metadata.createdAt);
    fixedFields.push("metadata.createdAt (format)");
  }

  if (!fixedCard.metadata?.updatedAt) {
    if (!fixedCard.metadata) {
      fixedCard.metadata = {
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        version: "1.0.0",
      };
    } else {
      fixedCard.metadata.updatedAt = new Date().toISOString();
    }
    fixedFields.push("metadata.updatedAt");
  } else if (!isValidISODate(fixedCard.metadata.updatedAt)) {
    fixedCard.metadata.updatedAt = normalizeDate(fixedCard.metadata.updatedAt);
    fixedFields.push("metadata.updatedAt (format)");
  }

  // Fix missing version
  if (!fixedCard.metadata?.version) {
    if (!fixedCard.metadata) {
      fixedCard.metadata = {
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        version: "1.0.0",
      };
    } else {
      fixedCard.metadata.version = "1.0.0";
    }
    fixedFields.push("metadata.version");
  }

  // Fix risk level mapping
  if (fixedCard.classification?.riskLevel) {
    const normalized = normalizeRiskLevel(fixedCard.classification.riskLevel);
    if (normalized !== fixedCard.classification.riskLevel) {
      fixedCard.classification.riskLevel = normalized;
      fixedFields.push("classification.riskLevel");
    }
  }

  // Fix PII processing field (convert boolean to "yes"/"no"/"unknown")
  if (fixedCard.classification?.riskFactors?.piiProcessing !== undefined) {
    const pii = fixedCard.classification.riskFactors.piiProcessing;
    if (typeof pii === "boolean") {
      fixedCard.classification.riskFactors.piiProcessing = pii ? "yes" : "no";
      fixedFields.push("classification.riskFactors.piiProcessing");
    }
  }

  // Fix missing ID
  if (!fixedCard.id) {
    fixedCard.id = generateId(fixedCard.name);
    fixedFields.push("id");
  }

  // Fix missing name
  if (!fixedCard.name) {
    fixedCard.name = "Unnamed Asset";
    fixedFields.push("name");
  }

  // Fix missing description
  if (!fixedCard.description) {
    fixedCard.description = "No description provided";
    fixedFields.push("description");
  }

  // Fix missing classification
  if (!fixedCard.classification) {
    fixedCard.classification = {
      riskLevel: "minimal",
      riskFactors: {
        autonomousDecisions: false,
        customerFacing: false,
        toolExecution: false,
        externalDataAccess: false,
        piiProcessing: "unknown",
        highStakesDecisions: false,
      },
    };
    fixedFields.push("classification");
  }

  // Fix missing risk factors
  if (!fixedCard.classification.riskFactors) {
    fixedCard.classification.riskFactors = {
      autonomousDecisions: false,
      customerFacing: false,
      toolExecution: false,
      externalDataAccess: false,
      piiProcessing: "unknown",
      highStakesDecisions: false,
    };
    fixedFields.push("classification.riskFactors");
  }

  return {
    fixed: fixedFields.length > 0,
    fixedFields,
    card: fixedCard,
  };
}

/**
 * Check if a date string is valid ISO 8601 format
 */
function isValidISODate(dateStr: string): boolean {
  const iso8601Regex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?$/;
  if (!iso8601Regex.test(dateStr)) {
    return false;
  }
  const date = new Date(dateStr);
  return !isNaN(date.getTime());
}

/**
 * Normalize date to ISO 8601 format
 */
function normalizeDate(dateStr: string): string {
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) {
    return new Date().toISOString();
  }
  return date.toISOString();
}

/**
 * Normalize risk level to valid values
 */
function normalizeRiskLevel(level: string): string {
  const normalized = level.toLowerCase().trim();
  const validLevels = ["minimal", "limited", "high", "unacceptable"];

  if (validLevels.includes(normalized)) {
    return normalized;
  }

  // Map common variations
  const mappings: Record<string, string> = {
    low: "minimal",
    medium: "limited",
    critical: "unacceptable",
    extreme: "unacceptable",
    none: "minimal",
  };

  return mappings[normalized] || "minimal";
}

/**
 * Generate a simple ID from name
 */
function generateId(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .substring(0, 50);
}
