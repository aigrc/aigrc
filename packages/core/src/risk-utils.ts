/**
 * Risk Level Utility Functions (AIGOS-105)
 * Provides consistent operations for comparing and mapping risk levels
 */

import type { RiskLevel } from "./schemas";

/** Risk level ordinal values for comparison */
const RISK_ORDINALS: Record<RiskLevel, number> = {
  minimal: 0,
  limited: 1,
  high: 2,
  unacceptable: 3,
};

/** EU AI Act category mapping */
const EU_AI_ACT_MAP: Record<RiskLevel, string> = {
  minimal: "minimal_risk",
  limited: "limited_risk",
  high: "high_risk",
  unacceptable: "prohibited",
};

/**
 * Compare two risk levels
 * @returns -1 if a < b, 0 if a == b, 1 if a > b
 */
export function compareRiskLevels(a: RiskLevel, b: RiskLevel): -1 | 0 | 1 {
  const ordA = RISK_ORDINALS[a];
  const ordB = RISK_ORDINALS[b];
  if (ordA < ordB) return -1;
  if (ordA > ordB) return 1;
  return 0;
}

/**
 * Check if a risk level is at least as severe as a threshold
 */
export function isRiskLevelAtLeast(level: RiskLevel, threshold: RiskLevel): boolean {
  return RISK_ORDINALS[level] >= RISK_ORDINALS[threshold];
}

/**
 * Check if a risk level is at most as severe as a threshold
 */
export function isRiskLevelAtMost(level: RiskLevel, threshold: RiskLevel): boolean {
  return RISK_ORDINALS[level] <= RISK_ORDINALS[threshold];
}

/**
 * Get the ordinal value (0-3) of a risk level
 */
export function getRiskLevelOrdinal(level: RiskLevel): number {
  return RISK_ORDINALS[level];
}

/**
 * Get the maximum (most severe) risk level from an array
 */
export function getMaxRiskLevel(levels: RiskLevel[]): RiskLevel {
  if (levels.length === 0) {
    return "minimal";
  }
  return levels.reduce((max, current) =>
    RISK_ORDINALS[current] > RISK_ORDINALS[max] ? current : max
  );
}

/**
 * Get the minimum (least severe) risk level from an array
 */
export function getMinRiskLevel(levels: RiskLevel[]): RiskLevel {
  if (levels.length === 0) {
    return "minimal";
  }
  return levels.reduce((min, current) =>
    RISK_ORDINALS[current] < RISK_ORDINALS[min] ? current : min
  );
}

/**
 * Map an AIGOS risk level to EU AI Act category
 */
export function mapToEuAiActCategory(level: RiskLevel): string {
  return EU_AI_ACT_MAP[level];
}

/**
 * Get all risk levels at or above a threshold
 */
export function getRiskLevelsAtLeast(threshold: RiskLevel): RiskLevel[] {
  const thresholdOrd = RISK_ORDINALS[threshold];
  return (Object.entries(RISK_ORDINALS) as [RiskLevel, number][])
    .filter(([, ord]) => ord >= thresholdOrd)
    .map(([level]) => level);
}

/**
 * Get all risk levels at or below a threshold
 */
export function getRiskLevelsAtMost(threshold: RiskLevel): RiskLevel[] {
  const thresholdOrd = RISK_ORDINALS[threshold];
  return (Object.entries(RISK_ORDINALS) as [RiskLevel, number][])
    .filter(([, ord]) => ord <= thresholdOrd)
    .map(([level]) => level);
}

/**
 * Parse a string to a RiskLevel, returning undefined if invalid
 */
export function parseRiskLevel(value: string): RiskLevel | undefined {
  const normalized = value.toLowerCase();
  if (normalized in RISK_ORDINALS) {
    return normalized as RiskLevel;
  }
  return undefined;
}

/**
 * Check if a value is a valid RiskLevel
 */
export function isValidRiskLevel(value: unknown): value is RiskLevel {
  return typeof value === "string" && value in RISK_ORDINALS;
}
