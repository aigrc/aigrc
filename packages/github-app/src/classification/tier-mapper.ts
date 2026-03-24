// ─────────────────────────────────────────────────────────────────
// PangoGuard — Risk Tier Mapper
// Maps @aigrc/core risk levels to L0-L3 tiers with agentic elevation
// ─────────────────────────────────────────────────────────────────

import type { ClassificationResult, RiskLevel } from "@aigrc/core";
import type {
  RiskTier,
  TierLabel,
  TierClassificationResult,
  AgenticElevation,
} from "../types.js";
import { TIER_MAP } from "../types.js";
import { createLogger } from "../utils/logger.js";

const log = createLogger("tier-mapper");

/** Map from core risk levels to L0-L3 tier numbers */
const RISK_TO_TIER_NUMBER: Record<RiskLevel, number> = {
  minimal: 0,
  limited: 1,
  high: 2,
  unacceptable: 3,
};

/** Map from tier number back to RiskTier */
const NUMBER_TO_TIER: Record<number, RiskTier> = {
  0: "L0",
  1: "L1",
  2: "L2",
  3: "L3",
};

/**
 * Map @aigrc/core's risk classification to L0-L3 tier with agentic elevation.
 *
 * Logic:
 * 1. Map core risk level: minimal→L0, limited→L1, high→L2, unacceptable→L3
 * 2. Apply agentic elevations: sum elevation values from behavioral patterns
 * 3. Clamp final tier at L3 (can't exceed UNACCEPTABLE)
 * 4. Return combined reasons from classification + elevations
 *
 * @param classification - Core classification result
 * @param elevations - Agentic pattern elevations from behavioral detection
 * @returns TierClassificationResult with final tier, base tier, and reasons
 */
export function mapToTier(
  classification: ClassificationResult,
  elevations: AgenticElevation[]
): TierClassificationResult {
  // Step 1: Map core risk level to base tier number
  const baseTierNumber = RISK_TO_TIER_NUMBER[classification.riskLevel];
  const baseTier = NUMBER_TO_TIER[baseTierNumber];

  // Step 2: Calculate total agentic elevation
  const totalElevation = elevations.reduce(
    (sum, e) => sum + e.riskElevation,
    0
  );

  // Step 3: Apply elevation, clamp at L3
  const finalTierNumber = Math.min(baseTierNumber + totalElevation, 3);
  const finalTier = NUMBER_TO_TIER[finalTierNumber];
  const finalLabel = TIER_MAP[finalTier];

  // Step 4: Combine reasons
  const reasons: string[] = [...classification.reasons];

  if (totalElevation > 0) {
    for (const elevation of elevations) {
      reasons.push(
        `+${elevation.riskElevation} tier elevation: ${elevation.indicator}` +
          (elevation.critical ? " [CRITICAL]" : "")
      );
    }
  }

  if (totalElevation > 0) {
    log.info(
      `Risk elevated from ${baseTier} to ${finalTier} (+${totalElevation})`,
      {
        baseTier,
        finalTier,
        totalElevation,
        patterns: elevations.map((e) => e.pattern),
      }
    );
  }

  return {
    tier: finalTier,
    tierLabel: finalLabel,
    baseTier,
    elevatedBy: totalElevation,
    reasons,
  };
}
