/**
 * Identity Manager (SPEC-RT-002)
 * Establishes and manages cryptographic identity of AI agents at runtime
 */

import {
  loadAssetCard,
  extractGoldenThreadComponents,
  verifyGoldenThreadHashSync,
  RuntimeIdentitySchema,
  type AssetCard,
  type RuntimeIdentity,
  type CapabilitiesManifest,
  type Lineage,
  type OperatingMode,
  type RiskLevel,
} from "@aigrc/core";

import type {
  CreateIdentityOptions,
  VerificationResult,
  SpawnChildOptions,
  ModeTransitionRequest,
  ModeTransitionResult,
  IdentityEvent,
  IdentityEventHandler,
  IdentityManagerConfig,
} from "./types.js";

// ─────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────

/** Default configuration */
const DEFAULT_CONFIG: IdentityManagerConfig = {
  maxSpawnDepth: 5,
  verificationFailureMode: "SANDBOX",
  telemetryEnabled: true,
  eventHandlers: [],
};

/** Mode hierarchy for transition validation */
const MODE_HIERARCHY: Record<OperatingMode, number> = {
  NORMAL: 2,
  SANDBOX: 1,
  RESTRICTED: 0,
};

// ─────────────────────────────────────────────────────────────────
// IDENTITY MANAGER CLASS
// ─────────────────────────────────────────────────────────────────

/**
 * Identity Manager - manages runtime identity lifecycle
 */
export class IdentityManager {
  private config: IdentityManagerConfig;
  private identities: Map<string, RuntimeIdentity> = new Map();

  constructor(config: Partial<IdentityManagerConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Create a new RuntimeIdentity from an asset card
   * AIGOS-402: RuntimeIdentity Creation
   */
  async createIdentity(options: CreateIdentityOptions): Promise<RuntimeIdentity> {
    // Generate instance ID
    const instanceId = options.instanceId ?? crypto.randomUUID();

    // Load asset card
    const assetCard = loadAssetCard(options.assetCardPath);
    if (!assetCard) {
      throw new IdentityError(
        "ASSET_CARD_NOT_FOUND",
        `Failed to load asset card from: ${options.assetCardPath}`
      );
    }

    // Verify Golden Thread (AIGOS-403)
    let verified = false;
    let verificationResult: VerificationResult | undefined;

    if (!options.skipVerification) {
      verificationResult = this.verifyGoldenThread(assetCard);
      verified = verificationResult.verified;

      if (!verified) {
        if (this.config.verificationFailureMode === "FAIL") {
          throw new IdentityError(
            "VERIFICATION_FAILED",
            `Golden Thread verification failed: ${verificationResult.reason}`
          );
        }
        // SANDBOX mode - continue with reduced permissions
      }
    }

    // Build lineage (AIGOS-404)
    const lineage = this.buildLineage(instanceId, options.parentIdentity);

    // Validate spawn depth
    if (lineage.generation_depth > this.config.maxSpawnDepth) {
      throw new IdentityError(
        "MAX_SPAWN_DEPTH_EXCEEDED",
        `Maximum spawn depth (${this.config.maxSpawnDepth}) exceeded`
      );
    }

    // Determine operating mode
    let mode: OperatingMode = options.mode ?? "NORMAL";
    if (!verified && !options.skipVerification) {
      mode = "SANDBOX";
    }

    // If child agent, cannot have higher mode than parent
    if (options.parentIdentity) {
      const parentModeLevel = MODE_HIERARCHY[options.parentIdentity.mode];
      const requestedModeLevel = MODE_HIERARCHY[mode];
      if (requestedModeLevel > parentModeLevel) {
        mode = options.parentIdentity.mode;
      }
    }

    // Load capabilities manifest (AIGOS-405)
    const capabilities = this.loadCapabilities(assetCard, options.parentIdentity);

    // Build RuntimeIdentity
    const identity: RuntimeIdentity = {
      instance_id: instanceId,
      asset_id: assetCard.id,
      asset_name: assetCard.name,
      asset_version: assetCard.version,
      golden_thread_hash: assetCard.golden_thread?.hash ?? "",
      golden_thread: assetCard.golden_thread ?? {
        ticket_id: assetCard.intent.ticketId ?? "UNKNOWN",
        approved_by: assetCard.governance.approvals[0]?.email ?? "UNKNOWN",
        approved_at: assetCard.governance.approvals[0]?.date ?? new Date().toISOString(),
        hash: "",
      },
      risk_level: assetCard.classification.riskLevel as RiskLevel,
      lineage,
      capabilities_manifest: capabilities,
      created_at: new Date().toISOString(),
      verified,
      mode,
    };

    // Validate against schema
    const parsed = RuntimeIdentitySchema.safeParse(identity);
    if (!parsed.success) {
      throw new IdentityError(
        "INVALID_IDENTITY",
        `RuntimeIdentity validation failed: ${parsed.error.message}`
      );
    }

    // Freeze identity object (immutable)
    const frozenIdentity = Object.freeze(parsed.data as RuntimeIdentity);

    // Store identity
    this.identities.set(instanceId, frozenIdentity);

    // Emit event
    await this.emitEvent({
      type: "identity.created",
      identity: frozenIdentity,
    });

    // Emit verification event
    if (verificationResult) {
      await this.emitEvent({
        type: "identity.verified",
        identity: frozenIdentity,
        result: verificationResult,
      });
    }

    return frozenIdentity;
  }

  /**
   * Verify Golden Thread hash
   * AIGOS-403: Golden Thread Verification
   */
  private verifyGoldenThread(assetCard: AssetCard): VerificationResult {
    const components = extractGoldenThreadComponents(assetCard);

    if (!components) {
      return {
        verified: false,
        computedHash: "",
        reason: "Missing Golden Thread components (ticket_id, approved_by, or approved_at)",
      };
    }

    const expectedHash = assetCard.golden_thread?.hash;
    if (!expectedHash) {
      return {
        verified: false,
        computedHash: "",
        reason: "No hash found in asset card golden_thread section",
      };
    }

    // Verify hash
    const hashResult = verifyGoldenThreadHashSync(components, expectedHash);

    if (!hashResult.verified) {
      return {
        verified: false,
        computedHash: hashResult.computed,
        expectedHash: hashResult.expected,
        reason: hashResult.mismatch_reason ?? "Hash mismatch",
      };
    }

    return {
      verified: true,
      computedHash: hashResult.computed,
      expectedHash: hashResult.expected,
    };
  }

  /**
   * Build lineage for an agent
   * AIGOS-404: Lineage Tracking
   */
  private buildLineage(
    instanceId: string,
    parentIdentity?: RuntimeIdentity
  ): Lineage {
    if (!parentIdentity) {
      // Root agent
      return {
        parent_instance_id: null,
        generation_depth: 0,
        ancestor_chain: [],
        spawned_at: new Date().toISOString(),
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
      spawned_at: new Date().toISOString(),
      root_instance_id: parentIdentity.lineage.root_instance_id,
    };
  }

  /**
   * Load and merge capabilities from asset card and parent
   * AIGOS-405: Capabilities Loading
   */
  private loadCapabilities(
    _assetCard: AssetCard,
    parentIdentity?: RuntimeIdentity
  ): CapabilitiesManifest {
    // Default capabilities for new agents
    const baseCapabilities: CapabilitiesManifest = {
      allowed_tools: ["*"],
      denied_tools: [],
      allowed_domains: ["*"],
      denied_domains: [],
      may_spawn_children: true,
      max_child_depth: this.config.maxSpawnDepth,
      capability_mode: "decay",
    };

    if (!parentIdentity) {
      return baseCapabilities;
    }

    // Apply capability decay for child agents
    const parentCaps = parentIdentity.capabilities_manifest;

    // Child cannot have more than parent (intersection)
    return {
      allowed_tools: this.intersectArrays(
        baseCapabilities.allowed_tools,
        parentCaps.allowed_tools
      ),
      denied_tools: this.unionArrays(
        baseCapabilities.denied_tools,
        parentCaps.denied_tools
      ),
      allowed_domains: this.intersectArrays(
        baseCapabilities.allowed_domains,
        parentCaps.allowed_domains
      ),
      denied_domains: this.unionArrays(
        baseCapabilities.denied_domains,
        parentCaps.denied_domains
      ),
      max_cost_per_session: this.minOptional(
        baseCapabilities.max_cost_per_session,
        parentCaps.max_cost_per_session
      ),
      max_cost_per_day: this.minOptional(
        baseCapabilities.max_cost_per_day,
        parentCaps.max_cost_per_day
      ),
      max_tokens_per_call: this.minOptional(
        baseCapabilities.max_tokens_per_call,
        parentCaps.max_tokens_per_call
      ),
      may_spawn_children:
        baseCapabilities.may_spawn_children && parentCaps.may_spawn_children,
      max_child_depth: Math.min(
        baseCapabilities.max_child_depth,
        parentCaps.max_child_depth
      ),
      capability_mode: parentCaps.capability_mode,
    };
  }

  /**
   * Spawn a child identity
   * AIGOS-404: Lineage Tracking (child spawning)
   */
  async spawnChild(
    parentIdentity: RuntimeIdentity,
    options: SpawnChildOptions
  ): Promise<RuntimeIdentity> {
    // Validate parent can spawn
    if (!parentIdentity.capabilities_manifest.may_spawn_children) {
      throw new IdentityError(
        "SPAWN_NOT_ALLOWED",
        "Parent identity is not allowed to spawn children"
      );
    }

    // Validate depth
    const newDepth = parentIdentity.lineage.generation_depth + 1;
    if (newDepth > parentIdentity.capabilities_manifest.max_child_depth) {
      throw new IdentityError(
        "MAX_SPAWN_DEPTH_EXCEEDED",
        `Spawn would exceed max depth: ${newDepth} > ${parentIdentity.capabilities_manifest.max_child_depth}`
      );
    }

    const childIdentity = await this.createIdentity({
      assetCardPath: options.assetCardPath,
      parentIdentity,
      mode: options.mode,
      instanceId: options.instanceId,
    });

    // Emit spawn event
    await this.emitEvent({
      type: "identity.child_spawned",
      parent: parentIdentity,
      child: childIdentity,
    });

    return childIdentity;
  }

  /**
   * Request a mode transition
   * AIGOS-406: Operating Mode Management
   */
  async requestModeTransition(
    identity: RuntimeIdentity,
    request: ModeTransitionRequest
  ): Promise<ModeTransitionResult> {
    const previousMode = identity.mode;
    const targetMode = request.targetMode;

    // Check if transition is valid
    const currentLevel = MODE_HIERARCHY[previousMode];
    const targetLevel = MODE_HIERARCHY[targetMode];

    // Cannot escalate without authorization
    if (targetLevel > currentLevel) {
      if (!request.authToken) {
        return {
          success: false,
          previousMode,
          currentMode: previousMode,
          reason: "Mode escalation requires authorization token",
        };
      }
      // TODO: Verify auth token
    }

    // Cannot transition RESTRICTED -> NORMAL directly
    if (previousMode === "RESTRICTED" && targetMode === "NORMAL") {
      return {
        success: false,
        previousMode,
        currentMode: previousMode,
        reason: "Cannot transition from RESTRICTED to NORMAL directly",
      };
    }

    // Create new identity with updated mode (identities are immutable)
    const updatedIdentity: RuntimeIdentity = {
      ...identity,
      mode: targetMode,
    };

    // Store updated identity
    this.identities.set(identity.instance_id, Object.freeze(updatedIdentity));

    // Emit event
    await this.emitEvent({
      type: "identity.mode_changed",
      identity: updatedIdentity,
      from: previousMode,
      to: targetMode,
    });

    return {
      success: true,
      previousMode,
      currentMode: targetMode,
    };
  }

  /**
   * Get an identity by instance ID
   */
  getIdentity(instanceId: string): RuntimeIdentity | undefined {
    return this.identities.get(instanceId);
  }

  /**
   * Terminate an identity
   */
  async terminateIdentity(
    identity: RuntimeIdentity,
    reason: string
  ): Promise<void> {
    this.identities.delete(identity.instance_id);

    await this.emitEvent({
      type: "identity.terminated",
      identity,
      reason,
    });
  }

  /**
   * Register an event handler
   */
  onEvent(handler: IdentityEventHandler): void {
    this.config.eventHandlers.push(handler);
  }

  /**
   * Emit an event to all handlers
   */
  private async emitEvent(event: IdentityEvent): Promise<void> {
    for (const handler of this.config.eventHandlers) {
      try {
        await handler(event);
      } catch (error) {
        console.error(`Identity event handler error:`, error);
      }
    }
  }

  // ─────────────────────────────────────────────────────────────────
  // UTILITY METHODS
  // ─────────────────────────────────────────────────────────────────

  private intersectArrays(a: string[], b: string[]): string[] {
    // Handle wildcards
    if (a.includes("*")) return b;
    if (b.includes("*")) return a;

    const setB = new Set(b);
    return a.filter((item) => setB.has(item));
  }

  private unionArrays(a: string[], b: string[]): string[] {
    return [...new Set([...a, ...b])];
  }

  private minOptional(
    a?: number | null,
    b?: number | null
  ): number | null | undefined {
    if (a === undefined || a === null) return b;
    if (b === undefined || b === null) return a;
    return Math.min(a, b);
  }
}

// ─────────────────────────────────────────────────────────────────
// ERROR CLASS
// ─────────────────────────────────────────────────────────────────

/**
 * Identity Manager error with error code
 */
export class IdentityError extends Error {
  constructor(
    public readonly code: string,
    message: string
  ) {
    super(message);
    this.name = "IdentityError";
  }
}

// ─────────────────────────────────────────────────────────────────
// FACTORY FUNCTION
// ─────────────────────────────────────────────────────────────────

/**
 * Create an Identity Manager instance
 */
export function createIdentityManager(
  config?: Partial<IdentityManagerConfig>
): IdentityManager {
  return new IdentityManager(config);
}

// ─────────────────────────────────────────────────────────────────
// STANDALONE FUNCTIONS
// ─────────────────────────────────────────────────────────────────

/**
 * Create a RuntimeIdentity from an asset card
 * Convenience function for one-off identity creation
 */
export async function createRuntimeIdentity(
  options: CreateIdentityOptions
): Promise<RuntimeIdentity> {
  const manager = new IdentityManager();
  return manager.createIdentity(options);
}
