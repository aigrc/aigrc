import {
  type KillSwitchCommand,
  type RuntimeIdentity,
  KillSwitchCommandSchema,
} from "@aigrc/core";
import type { KillSwitchListener } from "./kill-switch/listener.js";
import { SSEListener } from "./kill-switch/sse.js";
import { PollingListener } from "./kill-switch/polling.js";
import { FileListener } from "./kill-switch/file.js";
import { CommandExecutor, type KillSwitchState } from "./kill-switch/commands.js";
import { SignatureVerifier, type PublicKeyConfig } from "./kill-switch/signature.js";
import { getGlobalReplayGuard, resetGlobalReplayGuard, type ReplayPreventionConfig } from "./kill-switch/replay.js";
import { CascadeManager, shouldCascade, type ChildAgentRef } from "./kill-switch/cascade.js";

// ─────────────────────────────────────────────────────────────────
// KILL SWITCH (SPEC-RT-005)
// Remote termination control for AI agents
// Unified interface integrating all kill switch components
// ─────────────────────────────────────────────────────────────────

/**
 * Kill switch channel configuration
 */
export interface KillSwitchConfig {
  /** Channel type: SSE, polling, or file-based */
  channel: "sse" | "polling" | "file";
  /** Endpoint URL for SSE/polling */
  endpoint?: string;
  /** Polling interval in milliseconds */
  pollIntervalMs?: number;
  /** File path for file-based channel */
  filePath?: string;
  /** Request headers for HTTP channels */
  headers?: Record<string, string>;
  /** Trusted public keys for signature verification */
  trustedKeys?: PublicKeyConfig[];
  /** Whether to require signatures (false = development mode) */
  requireSignature?: boolean;
  /** Replay prevention configuration */
  replayPrevention?: ReplayPreventionConfig;
  /** Callback when state changes */
  onStateChange?: (state: KillSwitchState, command?: KillSwitchCommand) => void;
  /** Callback for command verification (custom logic) */
  verifyCommand?: (command: KillSwitchCommand) => boolean;
  /** Callback before termination (for cleanup) */
  onBeforeTerminate?: (command: KillSwitchCommand) => void | Promise<void>;
  /** Whether to allow resuming from PAUSED state */
  allowResume?: boolean;
}

/**
 * Kill switch handler interface
 */
export interface KillSwitchHandler {
  /** Current state */
  readonly state: KillSwitchState;
  /** Start listening for commands */
  start(): void;
  /** Stop listening (doesn't change state) */
  stop(): void;
  /** Process a command directly */
  processCommand(command: KillSwitchCommand): Promise<boolean>;
  /** Check if agent should continue running */
  shouldContinue(): boolean;
  /** Get the last command that changed state */
  getLastCommand(): KillSwitchCommand | undefined;
  /** Register a child agent for cascading termination */
  registerChild(child: ChildAgentRef): void;
  /** Unregister a child agent */
  unregisterChild(instanceId: string): void;
  /** Get cascade manager */
  getCascadeManager(): CascadeManager;
}

/**
 * Creates a kill switch handler for an agent.
 *
 * The kill switch allows remote termination or pausing of agents
 * for safety and compliance purposes.
 *
 * Features:
 * - Multiple transport options (SSE, polling, file)
 * - Cryptographic signature verification
 * - Replay attack prevention
 * - Cascading termination to child agents
 * - State management (ACTIVE, PAUSED, TERMINATED)
 *
 * @param identity The agent's runtime identity
 * @param config Kill switch configuration
 * @returns Kill switch handler
 */
export function createKillSwitch(
  identity: RuntimeIdentity,
  config: KillSwitchConfig
): KillSwitchHandler {
  // Initialize components
  const commandExecutor = new CommandExecutor({
    initialState: "ACTIVE",
    onStateChange: async (oldState, newState, command) => {
      config.onStateChange?.(newState, command);
    },
    onBeforeTerminate: async (command) => {
      // Cascade termination to children if applicable
      if (shouldCascade(command, identity)) {
        console.log("[KillSwitch] Cascading termination to children");
        await cascadeManager.cascadeTermination(command);
      }

      // Run user callback
      if (config.onBeforeTerminate) {
        await config.onBeforeTerminate(command);
      }
    },
    allowResume: config.allowResume ?? true,
  });

  const signatureVerifier = new SignatureVerifier({
    trustedKeys: config.trustedKeys ?? [],
    requireSignature: config.requireSignature ?? true,
  });

  const replayGuard = getGlobalReplayGuard(config.replayPrevention);

  const cascadeManager = new CascadeManager();

  /**
   * Process a kill switch command
   */
  async function processCommand(command: KillSwitchCommand): Promise<boolean> {
    const startTime = Date.now();

    try {
      // 1. Validate command schema
      try {
        KillSwitchCommandSchema.parse(command);
      } catch (error) {
        console.error("[KillSwitch] Invalid command format:", error);
        return false;
      }

      // 2. Check if command applies to this agent
      if (!commandApplies(command, identity)) {
        console.log("[KillSwitch] Command does not apply to this agent");
        return false;
      }

      // 3. Verify signature
      const sigResult = signatureVerifier.verify(command);
      if (!sigResult.valid) {
        console.error("[KillSwitch] Signature verification failed:", sigResult.error);
        return false;
      }

      // 4. Check for replay attacks
      const replayResult = replayGuard.checkCommand(command);
      if (!replayResult.valid) {
        console.error("[KillSwitch] Replay check failed:", replayResult.error);
        return false;
      }

      // 5. Custom verification
      if (config.verifyCommand && !config.verifyCommand(command)) {
        console.error("[KillSwitch] Custom verification failed");
        return false;
      }

      // 6. Mark as processed
      replayGuard.markProcessed(command);

      // 7. Execute command
      const result = await commandExecutor.executeCommand(command);

      const elapsed = Date.now() - startTime;
      console.log(`[KillSwitch] Command processed in ${elapsed}ms:`, result);

      // Ensure we meet <60s SLA
      if (elapsed > 60000) {
        console.warn(`[KillSwitch] SLA VIOLATION: Command took ${elapsed}ms (>60s)`);
      }

      return result.success;
    } catch (error) {
      console.error("[KillSwitch] Command processing error:", error);
      return false;
    }
  }

  /**
   * Create the listener based on channel type
   */
  let listener: KillSwitchListener;

  const listenerConfig = {
    onCommand: processCommand,
    onError: (error: Error) => {
      console.error("[KillSwitch] Listener error:", error);
    },
    onConnectionChange: (connected: boolean) => {
      console.log(`[KillSwitch] Connection ${connected ? "established" : "lost"}`);
    },
  };

  switch (config.channel) {
    case "sse":
      if (!config.endpoint) {
        throw new Error("SSE channel requires endpoint");
      }
      listener = new SSEListener({
        ...listenerConfig,
        endpoint: config.endpoint,
        headers: config.headers,
      });
      break;

    case "polling":
      if (!config.endpoint) {
        throw new Error("Polling channel requires endpoint");
      }
      listener = new PollingListener({
        ...listenerConfig,
        endpoint: config.endpoint,
        pollIntervalMs: config.pollIntervalMs,
        headers: config.headers,
        instanceId: identity.instance_id,
        assetId: identity.asset_id,
      });
      break;

    case "file":
      if (!config.filePath) {
        throw new Error("File channel requires filePath");
      }
      listener = new FileListener({
        ...listenerConfig,
        filePath: config.filePath,
      });
      break;

    default:
      throw new Error(`Unknown channel type: ${(config as any).channel}`);
  }

  return {
    get state() {
      return commandExecutor.getState();
    },
    start() {
      console.log(`[KillSwitch] Starting ${config.channel} listener`);
      listener.start();
    },
    stop() {
      console.log("[KillSwitch] Stopping listener");
      listener.stop();
    },
    async processCommand(command: KillSwitchCommand): Promise<boolean> {
      return processCommand(command);
    },
    shouldContinue() {
      return commandExecutor.shouldContinue();
    },
    getLastCommand() {
      return commandExecutor.getLastCommand();
    },
    registerChild(child: ChildAgentRef) {
      cascadeManager.registerChild(child);
    },
    unregisterChild(instanceId: string) {
      cascadeManager.unregisterChild(instanceId);
    },
    getCascadeManager() {
      return cascadeManager;
    },
  };
}

/**
 * Checks if a command applies to a specific agent
 */
function commandApplies(command: KillSwitchCommand, identity: RuntimeIdentity): boolean {
  // Check specific instance targeting
  if (command.instance_id) {
    return command.instance_id === identity.instance_id;
  }

  // Check asset targeting
  if (command.asset_id) {
    return command.asset_id === identity.asset_id;
  }

  // Check organization targeting
  if (command.organization) {
    // Would check against identity's organization
    return true; // Placeholder
  }

  // Global command (no specific target)
  return true;
}

/**
 * Creates a kill switch command (for testing/admin use)
 */
export function createKillSwitchCommand(
  type: KillSwitchCommand["type"],
  options: {
    reason: string;
    issuedBy: string;
    instanceId?: string;
    assetId?: string;
    organization?: string;
    signature?: string;
  }
): KillSwitchCommand {
  const { randomUUID } = require("crypto");

  return {
    command_id: randomUUID(),
    type,
    instance_id: options.instanceId,
    asset_id: options.assetId,
    organization: options.organization,
    signature: options.signature ?? "placeholder-signature",
    timestamp: new Date().toISOString(),
    reason: options.reason,
    issued_by: options.issuedBy,
  };
}

// Re-export key types and utilities from sub-modules
export type { KillSwitchState } from "./kill-switch/commands.js";
export type { SignatureAlgorithm, PublicKeyConfig } from "./kill-switch/signature.js";
export type { ChildAgentRef } from "./kill-switch/cascade.js";
export { signCommand, generateKeyPair } from "./kill-switch/signature.js";
export { FileListener } from "./kill-switch/file.js";
export { resetGlobalReplayGuard } from "./kill-switch/replay.js";

/**
 * Clear processed commands (alias for resetGlobalReplayGuard for backwards compatibility)
 * @deprecated Use resetGlobalReplayGuard instead
 */
export function clearProcessedCommands(): void {
  resetGlobalReplayGuard();
}
