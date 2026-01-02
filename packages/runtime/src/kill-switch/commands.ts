import type { KillSwitchCommand, RuntimeIdentity } from "@aigrc/core";

// ─────────────────────────────────────────────────────────────────
// KILL SWITCH COMMAND HANDLERS (AIG-71, AIG-72, AIG-73)
// Implements TERMINATE, PAUSE, and RESUME command logic
// ─────────────────────────────────────────────────────────────────

/**
 * Kill switch state
 */
export type KillSwitchState = "ACTIVE" | "PAUSED" | "TERMINATED";

/**
 * Result of command application
 */
export interface CommandResult {
  /** Whether the command was successfully applied */
  success: boolean;
  /** Previous state before command */
  previousState: KillSwitchState;
  /** New state after command */
  newState: KillSwitchState;
  /** Error message if command failed */
  error?: string;
  /** Additional metadata */
  metadata?: Record<string, any>;
}

/**
 * Callback invoked when state changes
 */
export type StateChangeCallback = (
  oldState: KillSwitchState,
  newState: KillSwitchState,
  command: KillSwitchCommand
) => void | Promise<void>;

/**
 * Callback invoked before termination
 */
export type TerminationCallback = (command: KillSwitchCommand) => void | Promise<void>;

/**
 * Configuration for command executor
 */
export interface CommandExecutorConfig {
  /** Initial state */
  initialState?: KillSwitchState;
  /** Callback when state changes */
  onStateChange?: StateChangeCallback;
  /** Callback before termination (for cleanup) */
  onBeforeTerminate?: TerminationCallback;
  /** Whether to allow resuming from PAUSED state */
  allowResume?: boolean;
}

/**
 * Command Executor
 *
 * Manages kill switch state and command execution.
 */
export class CommandExecutor {
  private state: KillSwitchState;
  private lastCommand?: KillSwitchCommand;
  private readonly config: CommandExecutorConfig;
  private stateHistory: Array<{
    state: KillSwitchState;
    command: KillSwitchCommand;
    timestamp: Date;
  }> = [];

  constructor(config: CommandExecutorConfig = {}) {
    this.state = config.initialState ?? "ACTIVE";
    this.config = config;
  }

  /**
   * Get current state
   */
  public getState(): KillSwitchState {
    return this.state;
  }

  /**
   * Get last command that changed state
   */
  public getLastCommand(): KillSwitchCommand | undefined {
    return this.lastCommand;
  }

  /**
   * Get state history
   */
  public getStateHistory(): ReadonlyArray<{
    state: KillSwitchState;
    command: KillSwitchCommand;
    timestamp: Date;
  }> {
    return this.stateHistory;
  }

  /**
   * Check if agent should continue running
   */
  public shouldContinue(): boolean {
    return this.state === "ACTIVE";
  }

  /**
   * Check if agent is paused
   */
  public isPaused(): boolean {
    return this.state === "PAUSED";
  }

  /**
   * Check if agent is terminated
   */
  public isTerminated(): boolean {
    return this.state === "TERMINATED";
  }

  /**
   * Execute a kill switch command
   */
  public async executeCommand(command: KillSwitchCommand): Promise<CommandResult> {
    const previousState = this.state;

    try {
      let newState: KillSwitchState;

      switch (command.type) {
        case "TERMINATE":
          newState = await this.handleTerminate(command);
          break;
        case "PAUSE":
          newState = await this.handlePause(command);
          break;
        case "RESUME":
          newState = await this.handleResume(command);
          break;
        default:
          return {
            success: false,
            previousState,
            newState: previousState,
            error: `Unknown command type: ${(command as any).type}`,
          };
      }

      // Only update state if it changed
      if (newState !== previousState) {
        this.state = newState;
        this.lastCommand = command;

        // Add to history
        this.stateHistory.push({
          state: newState,
          command,
          timestamp: new Date(),
        });

        // Limit history to last 100 entries
        if (this.stateHistory.length > 100) {
          this.stateHistory.shift();
        }

        // Notify state change
        if (this.config.onStateChange) {
          await this.config.onStateChange(previousState, newState, command);
        }

        console.log(
          `[KillSwitch:Commands] State changed: ${previousState} -> ${newState} (${command.type})`
        );
      }

      return {
        success: true,
        previousState,
        newState,
      };
    } catch (error) {
      console.error("[KillSwitch:Commands] Command execution failed:", error);
      return {
        success: false,
        previousState,
        newState: previousState,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Handle TERMINATE command (AIG-71)
   *
   * TERMINATE is irreversible - once terminated, agent cannot resume.
   * Triggers cleanup callbacks before transitioning to TERMINATED state.
   */
  private async handleTerminate(command: KillSwitchCommand): Promise<KillSwitchState> {
    console.log(`[KillSwitch:Commands] TERMINATE: ${command.reason}`);

    // Call termination callback for cleanup
    if (this.config.onBeforeTerminate) {
      try {
        await this.config.onBeforeTerminate(command);
      } catch (error) {
        console.error("[KillSwitch:Commands] Termination callback failed:", error);
        // Continue with termination anyway
      }
    }

    return "TERMINATED";
  }

  /**
   * Handle PAUSE command (AIG-72)
   *
   * PAUSE suspends agent operations but allows resuming later.
   * Cannot pause if already terminated.
   */
  private async handlePause(command: KillSwitchCommand): Promise<KillSwitchState> {
    console.log(`[KillSwitch:Commands] PAUSE: ${command.reason}`);

    // Cannot pause from terminated state
    if (this.state === "TERMINATED") {
      console.warn("[KillSwitch:Commands] Cannot pause terminated agent");
      return "TERMINATED";
    }

    return "PAUSED";
  }

  /**
   * Handle RESUME command (AIG-73)
   *
   * RESUME returns agent to ACTIVE state from PAUSED.
   * Cannot resume from TERMINATED state.
   * Can be disabled via config.
   */
  private async handleResume(command: KillSwitchCommand): Promise<KillSwitchState> {
    console.log(`[KillSwitch:Commands] RESUME: ${command.reason}`);

    // Check if resume is allowed
    if (this.config.allowResume === false) {
      console.warn("[KillSwitch:Commands] Resume is disabled");
      return this.state;
    }

    // Cannot resume from terminated state
    if (this.state === "TERMINATED") {
      console.warn("[KillSwitch:Commands] Cannot resume terminated agent");
      return "TERMINATED";
    }

    return "ACTIVE";
  }

  /**
   * Check if a command applies to a specific agent identity
   */
  public static commandApplies(
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

    // Check organization targeting
    if (command.organization) {
      // Would check against identity's organization
      // For now, treat as applicable (organization-wide kill)
      return true;
    }

    // Global command (no specific target)
    return true;
  }
}

/**
 * Create a termination callback that flushes telemetry
 */
export function createTelemetryFlushCallback(): TerminationCallback {
  return async (command: KillSwitchCommand) => {
    console.log("[KillSwitch:Commands] Flushing telemetry before termination");

    // In a real implementation, this would:
    // 1. Flush pending telemetry events
    // 2. Send final termination event
    // 3. Wait for confirmation (with timeout)

    // Placeholder for telemetry flush
    await new Promise((resolve) => setTimeout(resolve, 100));

    console.log("[KillSwitch:Commands] Telemetry flushed");
  };
}

/**
 * Create a termination callback that performs cleanup
 */
export function createCleanupCallback(
  cleanup: () => void | Promise<void>
): TerminationCallback {
  return async (command: KillSwitchCommand) => {
    console.log("[KillSwitch:Commands] Running cleanup before termination");

    try {
      await cleanup();
      console.log("[KillSwitch:Commands] Cleanup completed");
    } catch (error) {
      console.error("[KillSwitch:Commands] Cleanup failed:", error);
      // Don't throw - termination should proceed
    }
  };
}

/**
 * Combine multiple termination callbacks
 */
export function combineTerminationCallbacks(
  ...callbacks: TerminationCallback[]
): TerminationCallback {
  return async (command: KillSwitchCommand) => {
    for (const callback of callbacks) {
      try {
        await callback(command);
      } catch (error) {
        console.error("[KillSwitch:Commands] Callback failed:", error);
        // Continue with other callbacks
      }
    }
  };
}
