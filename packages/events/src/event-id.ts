import { EVENT_ID_PREFIX, EVENT_ID_HEX_LENGTH, EVENT_ID_PATTERN } from "./constants";

// eslint-disable-next-line @typescript-eslint/no-require-imports
const crypto = require("crypto");

// ─────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────

/**
 * Components for standard-frequency event ID computation.
 * Used by: CLI, VS Code, GitHub Action, MCP Server, I2E Bridge, Platform
 */
export interface StandardIdComponents {
  orgId: string;
  tool: string;
  type: string;
  assetId: string;
  timestamp: string | Date;
}

/**
 * Components for high-frequency event ID computation.
 * Used by: Runtime SDK, I2E Firewall
 */
export interface HighFrequencyIdComponents {
  instanceId: string;
  type: string;
  assetId: string;
  timestamp: string | Date;
  localSeq: number;
}

// ─────────────────────────────────────────────────────────────────
// TIMESTAMP FLOORING
// ─────────────────────────────────────────────────────────────────

/**
 * Floor a timestamp to 10ms precision for standard-frequency deduplication.
 * Example: 2025-01-15T10:30:00.123Z → 1736934600120
 */
export function floorTimestamp10ms(timestamp: string | Date): number {
  const ms = typeof timestamp === "string" ? new Date(timestamp).getTime() : timestamp.getTime();
  return Math.floor(ms / 10) * 10;
}

/**
 * Floor a timestamp to 1ms precision for high-frequency deduplication.
 * Example: 2025-01-15T10:30:00.123Z → 1736934600123
 */
export function floorTimestamp1ms(timestamp: string | Date): number {
  const ms = typeof timestamp === "string" ? new Date(timestamp).getTime() : timestamp.getTime();
  return Math.floor(ms);
}

// ─────────────────────────────────────────────────────────────────
// EVENT ID COMPUTATION (§4.1)
// ─────────────────────────────────────────────────────────────────

function isHighFrequencyComponents(
  components: StandardIdComponents | HighFrequencyIdComponents
): components is HighFrequencyIdComponents {
  return "instanceId" in components && "localSeq" in components;
}

/**
 * Compute a deterministic event ID per EVT-001 §4.1.
 *
 * **Standard path** (CLI, VS Code, GitHub Action, MCP Server, I2E Bridge, Platform):
 *   `sha256(orgId:tool:type:assetId:floor10ms(timestamp))` → `evt_` + first 32 hex chars
 *
 * **High-frequency path** (Runtime SDK, I2E Firewall):
 *   `sha256(instanceId:type:assetId:floor1ms(timestamp):localSeq)` → `evt_` + first 32 hex chars
 *
 * IDs are **never random UUIDs**. Same inputs always produce the same ID.
 */
export function computeEventId(
  components: StandardIdComponents | HighFrequencyIdComponents
): string {
  let input: string;

  if (isHighFrequencyComponents(components)) {
    const flooredTs = floorTimestamp1ms(components.timestamp);
    input = [
      components.instanceId,
      components.type,
      components.assetId,
      String(flooredTs),
      String(components.localSeq),
    ].join(":");
  } else {
    const flooredTs = floorTimestamp10ms(components.timestamp);
    input = [
      components.orgId,
      components.tool,
      components.type,
      components.assetId,
      String(flooredTs),
    ].join(":");
  }

  const hash: string = crypto.createHash("sha256").update(input).digest("hex");
  return EVENT_ID_PREFIX + hash.substring(0, EVENT_ID_HEX_LENGTH);
}

// ─────────────────────────────────────────────────────────────────
// VALIDATION
// ─────────────────────────────────────────────────────────────────

/**
 * Validates an event ID matches the expected format: `evt_{32 hex chars}`
 */
export function isValidEventId(id: string): boolean {
  return EVENT_ID_PATTERN.test(id);
}
