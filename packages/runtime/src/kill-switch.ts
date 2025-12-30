import {
  type KillSwitchCommand,
  type RuntimeIdentity,
  KillSwitchCommandSchema,
} from "@aigrc/core";

// ─────────────────────────────────────────────────────────────────
// KILL SWITCH (SPEC-RT-005)
// Remote termination control for AI agents
// ─────────────────────────────────────────────────────────────────

/** Kill switch state */
export type KillSwitchState = "ACTIVE" | "PAUSED" | "TERMINATED";

/** Kill switch channel configuration */
export interface KillSwitchConfig {
  /** Channel type: SSE, polling, or file-based */
  channel: "sse" | "polling" | "file";
  /** Endpoint URL for SSE/polling */
  endpoint?: string;
  /** Polling interval in milliseconds */
  pollIntervalMs?: number;
  /** File path for file-based channel */
  filePath?: string;
  /** Callback when state changes */
  onStateChange?: (state: KillSwitchState, command?: KillSwitchCommand) => void;
  /** Callback for command verification */
  verifyCommand?: (command: KillSwitchCommand) => boolean;
}

/** Kill switch handler interface */
export interface KillSwitchHandler {
  /** Current state */
  readonly state: KillSwitchState;
  /** Start listening for commands */
  start(): void;
  /** Stop listening (doesn't change state) */
  stop(): void;
  /** Process a command directly */
  processCommand(command: KillSwitchCommand): boolean;
  /** Check if agent should continue running */
  shouldContinue(): boolean;
  /** Get the last command that changed state */
  getLastCommand(): KillSwitchCommand | undefined;
}

/** Processed commands for replay prevention */
const processedCommands = new Set<string>();

/**
 * Creates a kill switch handler for an agent.
 *
 * The kill switch allows remote termination or pausing of agents
 * for safety and compliance purposes.
 *
 * @param identity The agent's runtime identity
 * @param config Kill switch configuration
 * @returns Kill switch handler
 */
export function createKillSwitch(
  identity: RuntimeIdentity,
  config: KillSwitchConfig
): KillSwitchHandler {
  let state: KillSwitchState = "ACTIVE";
  let lastCommand: KillSwitchCommand | undefined;
  let pollingTimer: ReturnType<typeof setInterval> | null = null;
  let abortController: AbortController | null = null;

  const verifyCommand = config.verifyCommand ?? defaultVerifyCommand;

  function processCommand(command: KillSwitchCommand): boolean {
    // Validate command schema
    try {
      KillSwitchCommandSchema.parse(command);
    } catch {
      console.error("[KillSwitch] Invalid command format");
      return false;
    }

    // Check for replay attacks
    if (processedCommands.has(command.command_id)) {
      console.warn("[KillSwitch] Duplicate command rejected:", command.command_id);
      return false;
    }

    // Verify command signature
    if (!verifyCommand(command)) {
      console.error("[KillSwitch] Command verification failed");
      return false;
    }

    // Check if command applies to this agent
    if (!commandApplies(command, identity)) {
      return false;
    }

    // Mark as processed
    processedCommands.add(command.command_id);
    lastCommand = command;

    // Apply command
    const newState = applyCommand(command, state);
    if (newState !== state) {
      state = newState;
      config.onStateChange?.(state, command);
      console.log(`[KillSwitch] State changed to ${state}: ${command.reason}`);
    }

    return true;
  }

  function start(): void {
    if (config.channel === "sse" && config.endpoint) {
      startSSE(config.endpoint);
    } else if (config.channel === "polling" && config.endpoint) {
      startPolling(config.endpoint, config.pollIntervalMs ?? 5000);
    } else if (config.channel === "file" && config.filePath) {
      startFileWatch(config.filePath);
    }
  }

  function stop(): void {
    if (pollingTimer) {
      clearInterval(pollingTimer);
      pollingTimer = null;
    }
    if (abortController) {
      abortController.abort();
      abortController = null;
    }
  }

  function startSSE(endpoint: string): void {
    // In real implementation, would use EventSource
    // For now, just log the intention
    console.log(`[KillSwitch] SSE channel would connect to: ${endpoint}`);
  }

  function startPolling(endpoint: string, intervalMs: number): void {
    pollingTimer = setInterval(async () => {
      try {
        // In real implementation, would fetch from endpoint
        console.log(`[KillSwitch] Polling: ${endpoint}`);
      } catch (err) {
        console.error("[KillSwitch] Polling error:", err);
      }
    }, intervalMs);
  }

  function startFileWatch(filePath: string): void {
    // In real implementation, would use fs.watch
    console.log(`[KillSwitch] File watch would monitor: ${filePath}`);
  }

  return {
    get state() {
      return state;
    },
    start,
    stop,
    processCommand,
    shouldContinue() {
      return state === "ACTIVE";
    },
    getLastCommand() {
      return lastCommand;
    },
  };
}

/**
 * Default command verification (signature check placeholder)
 */
function defaultVerifyCommand(command: KillSwitchCommand): boolean {
  // In real implementation, would verify cryptographic signature
  // For now, just check that signature exists
  return !!command.signature && command.signature.length > 0;
}

/**
 * Checks if a command applies to a specific agent
 */
function commandApplies(
  command: KillSwitchCommand,
  identity: RuntimeIdentity
): boolean {
  // Check specific instance targeting
  if (command.instance_id) {
    return command.instance_id === identity.instance_id;
  }

  // Check asset targeting
  if (command.asset_id) {
    return command.asset_id === identity.asset_id;
  }

  // Check organization targeting (if implemented)
  if (command.organization) {
    // Would check against identity's organization
    return true; // Placeholder
  }

  // Global command (no specific target)
  return true;
}

/**
 * Applies a command and returns the new state
 */
function applyCommand(
  command: KillSwitchCommand,
  currentState: KillSwitchState
): KillSwitchState {
  switch (command.type) {
    case "TERMINATE":
      return "TERMINATED";
    case "PAUSE":
      return currentState === "TERMINATED" ? "TERMINATED" : "PAUSED";
    case "RESUME":
      return currentState === "TERMINATED" ? "TERMINATED" : "ACTIVE";
    default:
      return currentState;
  }
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

/**
 * Clears processed command history (for testing)
 */
export function clearProcessedCommands(): void {
  processedCommands.clear();
}
