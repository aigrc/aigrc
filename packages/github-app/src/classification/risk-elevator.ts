// ─────────────────────────────────────────────────────────────────
// PangoGuard — Risk Elevation Utilities
// Helper functions for agentic risk elevation calculations
// ─────────────────────────────────────────────────────────────────

import type { AgenticElevation, RiskTier } from "../types.js";

/**
 * Calculate the maximum risk tier after applying all elevations.
 */
export function calculateElevatedTier(
  baseTier: RiskTier,
  elevations: AgenticElevation[]
): RiskTier {
  const tierOrder: RiskTier[] = ["L0", "L1", "L2", "L3"];
  const baseIndex = tierOrder.indexOf(baseTier);
  const totalElevation = elevations.reduce((sum, e) => sum + e.riskElevation, 0);
  const finalIndex = Math.min(baseIndex + totalElevation, 3);
  return tierOrder[finalIndex];
}

/**
 * Check if any elevation is marked as critical.
 */
export function hasCriticalElevation(elevations: AgenticElevation[]): boolean {
  return elevations.some((e) => e.critical);
}

/**
 * Get the total elevation value.
 */
export function getTotalElevation(elevations: AgenticElevation[]): number {
  return elevations.reduce((sum, e) => sum + e.riskElevation, 0);
}

/**
 * Group elevations by pattern type.
 */
export function groupElevationsByPattern(
  elevations: AgenticElevation[]
): Map<string, AgenticElevation[]> {
  const grouped = new Map<string, AgenticElevation[]>();

  for (const elevation of elevations) {
    const existing = grouped.get(elevation.pattern) ?? [];
    existing.push(elevation);
    grouped.set(elevation.pattern, existing);
  }

  return grouped;
}
