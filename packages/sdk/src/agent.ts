/**
 * @aigos/sdk - Governed Agent Factory
 *
 * The primary entry point for creating governed agents with
 * full policy enforcement, telemetry, and Control Plane integration.
 */

import { v4 as uuidv4 } from "uuid";
import type {
  RuntimeIdentity,
  Lineage,
  OperatingMode,
  CapabilitiesManifest,
  GoldenThread,
  RiskLevel,
} from "@aigrc/core";

import type {
  GovernedAgentConfig,
  GovernedAgent,
  PermissionResult,
  ApprovalRequest,
  ApprovalResult,
  KillSwitchCommand,
} from "./types/index.js";

import { createControlPlaneClient } from "./client/index.js";
import { createTelemetryManager, TelemetryManager } from "./telemetry/index.js";

/**
 * Generate a valid asset ID in AIGRC format
 */
function generateAssetId(name: string): string {
  const year = new Date().getFullYear();
  const hash = name
    .split("")
    .reduce((acc, char) => acc + char.charCodeAt(0), 0)
    .toString(16)
    .padStart(8, "0")
    .slice(0, 8);
  return `aigrc-${year}-${hash}`;
}

/**
 * Generate a SHA-256 hash placeholder (in production, use real crypto)
 */
function generateGoldenThreadHash(data: GoldenThread | undefined): string {
  if (!data) {
    // Generate a placeholder hash for agents without golden thread
    const placeholder = "0".repeat(64);
    return `sha256:${placeholder}`;
  }
  // In production, compute actual SHA-256
  const hash = JSON.stringify(data)
    .split("")
    .reduce((acc, char) => ((acc << 5) - acc + char.charCodeAt(0)) | 0, 0);
  const hexHash = Math.abs(hash).toString(16).padStart(64, "0").slice(0, 64);
  return `sha256:${hexHash}`;
}

/**
 * Creates a governed agent with full AIGOS runtime capabilities.
 *
 * @example
 * ```typescript
 * const agent = await createGovernedAgent({
 *   name: "order-processor",
 *   version: "1.0.0",
 *   controlPlane: "https://cp.aigos.io",
 *   apiKey: process.env.AIGOS_API_KEY,
 *   capabilities: {
 *     allowed_tools: ["database:read", "api:call"],
 *   },
 * });
 *
 * // Check permission before action
 * const result = await agent.checkPermission("database:read", "users");
 * if (result.allowed) {
 *   // Perform action
 * }
 *
 * // Graceful shutdown
 * await agent.shutdown();
 * ```
 */
export async function createGovernedAgent(
  config: GovernedAgentConfig
): Promise<GovernedAgent> {
  // Generate unique identifiers
  const instanceId = uuidv4();
  const assetId = generateAssetId(config.name);

  // Build lineage from parent (if any)
  const lineage: Lineage = config.parent
    ? {
        parent_instance_id: config.parent.instanceId,
        generation_depth: 1, // TODO: Fetch from parent
        ancestor_chain: [config.parent.instanceId],
        root_instance_id: config.parent.instanceId, // TODO: Fetch from parent
        spawned_at: new Date().toISOString(),
      }
    : {
        parent_instance_id: null,
        generation_depth: 0,
        ancestor_chain: [],
        root_instance_id: instanceId,
        spawned_at: new Date().toISOString(),
      };

  // Default capabilities using @aigrc/core schema
  const capabilities: CapabilitiesManifest = {
    allowed_tools: config.capabilities?.allowed_tools || [],
    denied_tools: config.capabilities?.denied_tools || [],
    allowed_domains: config.capabilities?.allowed_domains || [],
    denied_domains: config.capabilities?.denied_domains || [],
    may_spawn_children: config.capabilities?.may_spawn_children ?? false,
    max_child_depth: config.capabilities?.max_child_depth ?? 0,
    capability_mode: config.capabilities?.capability_mode ?? "decay",
    max_cost_per_session: config.capabilities?.max_cost_per_session,
    max_cost_per_day: config.capabilities?.max_cost_per_day,
    max_tokens_per_call: config.capabilities?.max_tokens_per_call,
    custom: config.capabilities?.custom,
  };

  // Build Golden Thread (placeholder if not provided)
  const goldenThread: GoldenThread = config.goldenThread || {
    ticket_id: `GT-${instanceId.slice(0, 8)}`,
    approved_by: "system@aigos.io", // Must be email format per schema
    approved_at: new Date().toISOString(),
    // hash and signature are optional, computed later
  };

  // Build full runtime identity
  const identity: RuntimeIdentity = {
    instance_id: instanceId,
    asset_id: assetId,
    asset_name: config.name,
    asset_version: config.version || "1.0.0",
    golden_thread_hash: generateGoldenThreadHash(config.goldenThread),
    golden_thread: goldenThread,
    risk_level: "limited" as RiskLevel,
    lineage,
    capabilities_manifest: capabilities,
    created_at: new Date().toISOString(),
    verified: false,
    mode: config.mode || "NORMAL",
  };

  // Initialize Control Plane client
  const client = createControlPlaneClient({
    endpoint: config.controlPlane,
    apiKey: config.apiKey,
    identity,
  });

  // Initialize telemetry (if enabled)
  let telemetry: TelemetryManager | null = null;
  if (config.telemetry) {
    const telemetryConfig =
      typeof config.telemetry === "boolean"
        ? { enabled: config.telemetry }
        : config.telemetry;
    telemetry = createTelemetryManager(telemetryConfig, identity);
  }

  // Track agent state
  let currentMode: OperatingMode = config.mode || "NORMAL";
  let isPaused = false;
  let isShutdown = false;

  // Kill switch handler
  const handleKillSwitch = async (command: KillSwitchCommand) => {
    switch (command.command) {
      case "terminate":
        await shutdown();
        break;
      case "pause":
        isPaused = true;
        break;
      case "resume":
        isPaused = false;
        break;
      case "restart":
        // Trigger restart logic (implementation-specific)
        break;
    }

    // Call custom handler if provided
    if (config.killSwitch?.onCommand) {
      await config.killSwitch.onCommand(command);
    }
  };

  // Subscribe to kill switch if enabled
  let unsubscribeKillSwitch: (() => void) | null = null;
  if (config.killSwitch?.enabled !== false) {
    unsubscribeKillSwitch = client.subscribeKillSwitch(handleKillSwitch);
  }

  // Register with Control Plane if configured
  if (config.controlPlane && config.apiKey) {
    try {
      await client.register();
    } catch (error) {
      console.warn("Failed to register with Control Plane:", error);
      // Continue in offline mode
    }
  }

  /**
   * Check if an action is permitted by the current policies
   */
  const checkPermission = async (
    action: string,
    resource?: string
  ): Promise<PermissionResult> => {
    if (isPaused) {
      return {
        allowed: false,
        reason: "Agent is paused",
      };
    }

    if (isShutdown) {
      return {
        allowed: false,
        reason: "Agent is shutdown",
      };
    }

    // Check against denied_tools first (takes precedence)
    if (capabilities.denied_tools.includes(action)) {
      return {
        allowed: false,
        reason: `Action '${action}' is explicitly denied`,
      };
    }

    // Check against allowed_tools
    const [domain] = action.split(":");
    if (!capabilities.allowed_tools.includes(action)) {
      // Check for wildcard permission
      if (!capabilities.allowed_tools.includes(`${domain}:*`) &&
          !capabilities.allowed_tools.includes("*")) {
        return {
          allowed: false,
          reason: `Action '${action}' not in allowed_tools`,
        };
      }
    }

    // TODO: Fetch policies from Control Plane and evaluate
    // For now, allow if in capabilities
    return {
      allowed: true,
    };
  };

  /**
   * Request human approval for an action
   */
  const requestApproval = async (
    request: ApprovalRequest
  ): Promise<ApprovalResult> => {
    if (!client.isConnected) {
      // Offline mode - apply fallback
      return {
        approved: request.fallback === "allow",
        timedOut: true,
      };
    }

    return client.requestHITL(request);
  };

  /**
   * Spawn a child agent with decayed capabilities
   */
  const spawn = async (
    childConfig: Partial<GovernedAgentConfig>
  ): Promise<GovernedAgent> => {
    // Check if spawning is allowed
    if (!capabilities.may_spawn_children) {
      throw new Error("Agent is not allowed to spawn children");
    }

    if (lineage.generation_depth >= capabilities.max_child_depth) {
      throw new Error(`Maximum spawn depth (${capabilities.max_child_depth}) reached`);
    }

    // Apply capability decay based on mode
    let childCapabilities: Partial<CapabilitiesManifest>;

    if (capabilities.capability_mode === "decay") {
      // 80% decay for numeric limits
      const decayFactor = 0.8;
      childCapabilities = {
        allowed_tools: capabilities.allowed_tools,
        denied_tools: capabilities.denied_tools,
        allowed_domains: capabilities.allowed_domains,
        denied_domains: capabilities.denied_domains,
        max_cost_per_session: capabilities.max_cost_per_session
          ? capabilities.max_cost_per_session * decayFactor
          : undefined,
        max_cost_per_day: capabilities.max_cost_per_day
          ? capabilities.max_cost_per_day * decayFactor
          : undefined,
        may_spawn_children: capabilities.max_child_depth > lineage.generation_depth + 1,
        max_child_depth: capabilities.max_child_depth,
        capability_mode: capabilities.capability_mode,
      };
    } else if (capabilities.capability_mode === "inherit") {
      // Full inheritance
      childCapabilities = { ...capabilities };
    } else {
      // Explicit mode - use provided config or empty
      childCapabilities = childConfig.capabilities || {};
    }

    return createGovernedAgent({
      ...childConfig,
      name: childConfig.name || `${config.name}-child`,
      parent: {
        instanceId,
        capabilities,
      },
      capabilities: {
        ...childCapabilities,
        ...childConfig.capabilities,
      },
      controlPlane: config.controlPlane,
      apiKey: config.apiKey,
    });
  };

  /**
   * Gracefully shutdown the agent
   */
  const shutdown = async (): Promise<void> => {
    if (isShutdown) return;

    isShutdown = true;
    isPaused = true;

    // Unsubscribe from kill switch
    if (unsubscribeKillSwitch) {
      unsubscribeKillSwitch();
    }

    // Flush telemetry
    if (telemetry) {
      await telemetry.flush();
    }

    // Disconnect from Control Plane
    await client.disconnect();
  };

  // Return the governed agent
  return {
    identity,
    lineage,
    client,
    requestApproval,
    checkPermission,
    spawn,
    shutdown,
    get mode() {
      return currentMode;
    },
    get isPaused() {
      return isPaused;
    },
  };
}

// Export for convenience
export type { GovernedAgent, GovernedAgentConfig };
