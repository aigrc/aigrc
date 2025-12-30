import { randomUUID } from "crypto";
import {
  type RuntimeIdentity,
  type AssetCard,
  type GoldenThread,
  type Lineage,
  type CapabilitiesManifest,
  type RiskLevel,
  type OperatingMode,
  RuntimeIdentitySchema,
  computeGoldenThreadHashSync,
  extractGoldenThreadComponents,
  createGoldenThreadSync,
} from "@aigrc/core";

// ─────────────────────────────────────────────────────────────────
// RUNTIME IDENTITY (SPEC-RT-002)
// Creates and manages agent runtime identity
// ─────────────────────────────────────────────────────────────────

/** Options for creating a runtime identity */
export interface CreateIdentityOptions {
  /** The asset card for this agent */
  assetCard: AssetCard;
  /** Parent identity for spawned agents (null for root) */
  parentIdentity?: RuntimeIdentity | null;
  /** Override capabilities (otherwise derived from asset card) */
  capabilities?: Partial<CapabilitiesManifest>;
  /** Initial operating mode */
  mode?: OperatingMode;
  /** Whether to verify Golden Thread immediately */
  verifyImmediately?: boolean;
}

/** Result of identity creation */
export interface CreateIdentityResult {
  /** The created identity */
  identity: RuntimeIdentity;
  /** Whether the Golden Thread was verified */
  verified: boolean;
  /** Any warnings during creation */
  warnings: string[];
}

/**
 * Creates a runtime identity for an agent.
 *
 * This establishes the cryptographic identity that will be used
 * for all governance operations during the agent's lifetime.
 *
 * @param options Identity creation options
 * @returns Created identity with verification status
 */
export function createRuntimeIdentity(
  options: CreateIdentityOptions
): CreateIdentityResult {
  const {
    assetCard,
    parentIdentity = null,
    capabilities = {},
    mode = "NORMAL",
    verifyImmediately = true,
  } = options;

  const warnings: string[] = [];
  const instanceId = randomUUID();
  const now = new Date().toISOString();

  // Extract or create Golden Thread
  let goldenThread: GoldenThread;
  let goldenThreadHash: string;
  let verified = false;

  if (assetCard.golden_thread) {
    goldenThread = assetCard.golden_thread;
    if (goldenThread.hash) {
      goldenThreadHash = goldenThread.hash;
    } else {
      // Compute hash if not present
      const components = {
        ticket_id: goldenThread.ticket_id,
        approved_by: goldenThread.approved_by,
        approved_at: goldenThread.approved_at,
      };
      const hashResult = computeGoldenThreadHashSync(components);
      goldenThreadHash = hashResult.hash;
    }
  } else {
    // Try to extract from intent/governance
    const components = extractGoldenThreadComponents(assetCard);
    if (components) {
      goldenThread = createGoldenThreadSync(components);
      goldenThreadHash = goldenThread.hash!;
    } else {
      // No Golden Thread available - create placeholder
      warnings.push("No Golden Thread found in asset card - using placeholder");
      goldenThread = {
        ticket_id: "MISSING",
        approved_by: "unknown@placeholder.local",
        approved_at: now,
      };
      const hashResult = computeGoldenThreadHashSync({
        ticket_id: goldenThread.ticket_id,
        approved_by: goldenThread.approved_by,
        approved_at: goldenThread.approved_at,
      });
      goldenThreadHash = hashResult.hash;
    }
  }

  // Verify Golden Thread if requested
  if (verifyImmediately && goldenThread.ticket_id !== "MISSING") {
    // In real implementation, this would verify against the ticket system
    verified = true; // Placeholder - actual verification would check signature
  }

  // Build lineage
  const lineage: Lineage = createLineage(instanceId, parentIdentity, now);

  // Build capabilities manifest
  const capabilitiesManifest = buildCapabilitiesManifest(
    assetCard,
    parentIdentity,
    capabilities
  );

  // Determine operating mode
  const operatingMode = determineOperatingMode(
    mode,
    verified,
    assetCard,
    parentIdentity
  );

  if (operatingMode !== mode) {
    warnings.push(
      `Operating mode changed from ${mode} to ${operatingMode} due to verification status`
    );
  }

  // Create the identity
  const identity: RuntimeIdentity = {
    instance_id: instanceId,
    asset_id: assetCard.id,
    asset_name: assetCard.name,
    asset_version: assetCard.version,
    golden_thread_hash: goldenThreadHash,
    golden_thread: goldenThread,
    risk_level: assetCard.classification.riskLevel,
    lineage,
    capabilities_manifest: capabilitiesManifest,
    created_at: now,
    verified,
    mode: operatingMode,
  };

  // Validate against schema
  const validated = RuntimeIdentitySchema.parse(identity);

  return {
    identity: validated,
    verified,
    warnings,
  };
}

/**
 * Creates lineage for a new agent
 */
function createLineage(
  instanceId: string,
  parentIdentity: RuntimeIdentity | null,
  now: string
): Lineage {
  if (!parentIdentity) {
    // Root agent
    return {
      parent_instance_id: null,
      generation_depth: 0,
      ancestor_chain: [],
      spawned_at: now,
      root_instance_id: instanceId,
    };
  }

  // Child agent
  return {
    parent_instance_id: parentIdentity.instance_id,
    generation_depth: parentIdentity.lineage.generation_depth + 1,
    ancestor_chain: [
      ...parentIdentity.lineage.ancestor_chain,
      parentIdentity.instance_id,
    ],
    spawned_at: now,
    root_instance_id: parentIdentity.lineage.root_instance_id,
  };
}

/**
 * Builds capabilities manifest for an agent
 */
function buildCapabilitiesManifest(
  assetCard: AssetCard,
  parentIdentity: RuntimeIdentity | null,
  overrides: Partial<CapabilitiesManifest>
): CapabilitiesManifest {
  // Start with asset card constraints
  const baseCapabilities: CapabilitiesManifest = {
    allowed_tools: [],
    denied_tools: [],
    allowed_domains: [],
    denied_domains: [],
    max_cost_per_session: assetCard.constraints?.runtime?.maxCostPerRequestUsd ?? null,
    max_cost_per_day: null,
    max_tokens_per_call: assetCard.constraints?.runtime?.maxTokensPerRequest ?? null,
    may_spawn_children: false,
    max_child_depth: 0,
    capability_mode: "decay",
  };

  // If there's a parent, apply capability decay
  if (parentIdentity) {
    const parentCaps = parentIdentity.capabilities_manifest;

    // Capability decay: child cannot exceed parent
    if (parentCaps.capability_mode === "decay") {
      baseCapabilities.allowed_tools = parentCaps.allowed_tools;
      baseCapabilities.denied_tools = parentCaps.denied_tools;
      baseCapabilities.allowed_domains = parentCaps.allowed_domains;
      baseCapabilities.denied_domains = parentCaps.denied_domains;

      // Reduce limits for child
      if (parentCaps.max_cost_per_session) {
        baseCapabilities.max_cost_per_session = parentCaps.max_cost_per_session * 0.5;
      }
      if (parentCaps.max_child_depth > 0) {
        baseCapabilities.max_child_depth = parentCaps.max_child_depth - 1;
        baseCapabilities.may_spawn_children = baseCapabilities.max_child_depth > 0;
      }
    } else if (parentCaps.capability_mode === "inherit") {
      // Direct inheritance
      Object.assign(baseCapabilities, parentCaps);
    }
    // "explicit" mode: use baseCapabilities as-is
  }

  // Apply overrides
  return {
    ...baseCapabilities,
    ...overrides,
  };
}

/**
 * Determines the operating mode based on verification status
 */
function determineOperatingMode(
  requestedMode: OperatingMode,
  verified: boolean,
  assetCard: AssetCard,
  parentIdentity: RuntimeIdentity | null
): OperatingMode {
  // If parent is restricted, child must be restricted
  if (parentIdentity?.mode === "RESTRICTED") {
    return "RESTRICTED";
  }

  // If verification failed, use configured failure mode
  if (!verified) {
    const failureMode = assetCard.runtime?.verification_failure_mode ?? "SANDBOX";
    if (failureMode === "FAIL") {
      return "RESTRICTED";
    }
    return "SANDBOX";
  }

  // High risk requires at minimum SANDBOX
  if (assetCard.classification.riskLevel === "high" && requestedMode === "NORMAL") {
    return "SANDBOX";
  }

  // Unacceptable risk is always RESTRICTED
  if (assetCard.classification.riskLevel === "unacceptable") {
    return "RESTRICTED";
  }

  return requestedMode;
}

/**
 * Validates that a runtime identity is still valid
 */
export function validateIdentity(identity: RuntimeIdentity): {
  valid: boolean;
  issues: string[];
} {
  const issues: string[] = [];

  // Check schema validity
  try {
    RuntimeIdentitySchema.parse(identity);
  } catch (e) {
    issues.push(`Schema validation failed: ${e}`);
  }

  // Check lineage consistency
  if (identity.lineage.generation_depth > 0 && !identity.lineage.parent_instance_id) {
    issues.push("Non-root agent missing parent_instance_id");
  }

  if (identity.lineage.generation_depth !== identity.lineage.ancestor_chain.length) {
    issues.push("Lineage depth doesn't match ancestor chain length");
  }

  // Check Golden Thread
  if (!identity.verified && identity.mode === "NORMAL") {
    issues.push("Unverified identity should not be in NORMAL mode");
  }

  return {
    valid: issues.length === 0,
    issues,
  };
}

/**
 * Creates a child identity from a parent
 */
export function spawnChildIdentity(
  parentIdentity: RuntimeIdentity,
  childAssetCard: AssetCard,
  options: Partial<CreateIdentityOptions> = {}
): CreateIdentityResult {
  // Check if parent can spawn
  if (!parentIdentity.capabilities_manifest.may_spawn_children) {
    throw new Error("Parent identity cannot spawn children");
  }

  if (parentIdentity.capabilities_manifest.max_child_depth <= 0) {
    throw new Error("Maximum spawn depth reached");
  }

  return createRuntimeIdentity({
    assetCard: childAssetCard,
    parentIdentity,
    ...options,
  });
}

/**
 * Gets the risk level ordinal for comparisons
 */
function getRiskOrdinal(level: RiskLevel): number {
  const ordinals: Record<RiskLevel, number> = {
    minimal: 0,
    limited: 1,
    high: 2,
    unacceptable: 3,
  };
  return ordinals[level];
}
