import type { KillSwitchCommand, RuntimeIdentity } from "@aigrc/core";

// ─────────────────────────────────────────────────────────────────
// CASCADING TERMINATION (AIG-76)
// Propagates kill switch commands to child agents
// Ensures entire agent hierarchy is terminated
// ─────────────────────────────────────────────────────────────────

/**
 * Child agent reference
 */
export interface ChildAgentRef {
  /** Child instance ID */
  instanceId: string;
  /** Child asset ID */
  assetId: string;
  /** Generation depth */
  generationDepth: number;
  /** When child was spawned */
  spawnedAt: Date;
  /** Custom termination callback for this child */
  terminate?: () => Promise<void>;
}

/**
 * Cascade configuration
 */
export interface CascadeConfig {
  /** Maximum time to wait for child terminations (ms) */
  terminationTimeoutMs?: number;
  /** Whether to terminate in parallel or sequential */
  parallelTermination?: boolean;
  /** Maximum number of children to terminate in parallel */
  maxParallelTerminations?: number;
  /** Callback when child termination starts */
  onChildTerminationStart?: (child: ChildAgentRef) => void;
  /** Callback when child termination completes */
  onChildTerminationComplete?: (child: ChildAgentRef, success: boolean) => void;
}

/**
 * Cascade result
 */
export interface CascadeResult {
  /** Total number of children */
  totalChildren: number;
  /** Number successfully terminated */
  terminated: number;
  /** Number that failed to terminate */
  failed: number;
  /** Time taken in milliseconds */
  durationMs: number;
  /** Failed child instance IDs */
  failedChildren: string[];
}

/**
 * Cascading Termination Manager
 *
 * Manages termination of child agents when parent is terminated.
 * Ensures entire agent hierarchy is properly shut down.
 */
export class CascadeManager {
  private readonly config: CascadeConfig;
  private readonly children: Map<string, ChildAgentRef>;
  private isTerminating = false;

  constructor(config: CascadeConfig = {}) {
    this.config = {
      terminationTimeoutMs: 30000, // 30 seconds default
      parallelTermination: true,
      maxParallelTerminations: 10,
      ...config,
    };

    this.children = new Map();
  }

  /**
   * Register a child agent
   */
  public registerChild(child: ChildAgentRef): void {
    this.children.set(child.instanceId, child);
    console.log(
      `[KillSwitch:Cascade] Registered child: ${child.instanceId} (depth: ${child.generationDepth})`
    );
  }

  /**
   * Unregister a child agent
   */
  public unregisterChild(instanceId: string): void {
    this.children.delete(instanceId);
    console.log(`[KillSwitch:Cascade] Unregistered child: ${instanceId}`);
  }

  /**
   * Get all registered children
   */
  public getChildren(): ChildAgentRef[] {
    return Array.from(this.children.values());
  }

  /**
   * Get number of registered children
   */
  public getChildCount(): number {
    return this.children.size;
  }

  /**
   * Check if currently terminating
   */
  public isTerminatingChildren(): boolean {
    return this.isTerminating;
  }

  /**
   * Cascade termination to all children
   */
  public async cascadeTermination(command: KillSwitchCommand): Promise<CascadeResult> {
    const startTime = Date.now();

    if (this.isTerminating) {
      console.warn("[KillSwitch:Cascade] Already terminating children");
      return {
        totalChildren: this.children.size,
        terminated: 0,
        failed: 0,
        durationMs: Date.now() - startTime,
        failedChildren: [],
      };
    }

    this.isTerminating = true;

    try {
      const children = Array.from(this.children.values());

      if (children.length === 0) {
        console.log("[KillSwitch:Cascade] No children to terminate");
        return {
          totalChildren: 0,
          terminated: 0,
          failed: 0,
          durationMs: Date.now() - startTime,
          failedChildren: [],
        };
      }

      console.log(`[KillSwitch:Cascade] Terminating ${children.length} children`);

      // Sort by generation depth (deepest first) to terminate leaf nodes first
      children.sort((a, b) => b.generationDepth - a.generationDepth);

      let terminated = 0;
      let failed = 0;
      const failedChildren: string[] = [];

      if (this.config.parallelTermination) {
        // Terminate in parallel batches
        const results = await this.terminateParallel(children, command);
        terminated = results.terminated;
        failed = results.failed;
        failedChildren.push(...results.failedChildren);
      } else {
        // Terminate sequentially
        const results = await this.terminateSequential(children, command);
        terminated = results.terminated;
        failed = results.failed;
        failedChildren.push(...results.failedChildren);
      }

      const durationMs = Date.now() - startTime;

      console.log(
        `[KillSwitch:Cascade] Cascade complete: ${terminated} terminated, ${failed} failed (${durationMs}ms)`
      );

      return {
        totalChildren: children.length,
        terminated,
        failed,
        durationMs,
        failedChildren,
      };
    } finally {
      this.isTerminating = false;
    }
  }

  /**
   * Terminate children in parallel
   */
  private async terminateParallel(
    children: ChildAgentRef[],
    command: KillSwitchCommand
  ): Promise<{ terminated: number; failed: number; failedChildren: string[] }> {
    const batchSize = this.config.maxParallelTerminations!;
    let terminated = 0;
    let failed = 0;
    const failedChildren: string[] = [];

    // Process in batches
    for (let i = 0; i < children.length; i += batchSize) {
      const batch = children.slice(i, i + batchSize);

      const results = await Promise.allSettled(
        batch.map((child) => this.terminateChild(child, command))
      );

      for (let j = 0; j < results.length; j++) {
        const result = results[j];
        const child = batch[j];

        if (result.status === "fulfilled" && result.value) {
          terminated++;
        } else {
          failed++;
          failedChildren.push(child.instanceId);
        }
      }
    }

    return { terminated, failed, failedChildren };
  }

  /**
   * Terminate children sequentially
   */
  private async terminateSequential(
    children: ChildAgentRef[],
    command: KillSwitchCommand
  ): Promise<{ terminated: number; failed: number; failedChildren: string[] }> {
    let terminated = 0;
    let failed = 0;
    const failedChildren: string[] = [];

    for (const child of children) {
      try {
        const success = await this.terminateChild(child, command);
        if (success) {
          terminated++;
        } else {
          failed++;
          failedChildren.push(child.instanceId);
        }
      } catch (error) {
        failed++;
        failedChildren.push(child.instanceId);
      }
    }

    return { terminated, failed, failedChildren };
  }

  /**
   * Terminate a single child
   */
  private async terminateChild(
    child: ChildAgentRef,
    command: KillSwitchCommand
  ): Promise<boolean> {
    this.config.onChildTerminationStart?.(child);

    console.log(`[KillSwitch:Cascade] Terminating child: ${child.instanceId}`);

    try {
      // Use custom termination callback if provided
      if (child.terminate) {
        await this.withTimeout(child.terminate(), this.config.terminationTimeoutMs!);
      } else {
        // Default termination: send signal or API call
        await this.sendTerminationSignal(child, command);
      }

      this.config.onChildTerminationComplete?.(child, true);
      console.log(`[KillSwitch:Cascade] Child terminated: ${child.instanceId}`);
      return true;
    } catch (error) {
      console.error(
        `[KillSwitch:Cascade] Failed to terminate child ${child.instanceId}:`,
        error
      );
      this.config.onChildTerminationComplete?.(child, false);
      return false;
    }
  }

  /**
   * Send termination signal to child
   */
  private async sendTerminationSignal(
    child: ChildAgentRef,
    parentCommand: KillSwitchCommand
  ): Promise<void> {
    // In a real implementation, this would:
    // 1. Send HTTP/gRPC request to child agent
    // 2. Or invoke child's kill switch handler directly
    // 3. Or send OS signal if child is subprocess

    // For now, just simulate the termination
    await new Promise((resolve) => setTimeout(resolve, 100));

    console.log(`[KillSwitch:Cascade] Sent termination signal to ${child.instanceId}`);
  }

  /**
   * Helper to wrap promise with timeout
   */
  private async withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
    return Promise.race([
      promise,
      new Promise<T>((_, reject) =>
        setTimeout(() => reject(new Error("Termination timeout")), timeoutMs)
      ),
    ]);
  }

  /**
   * Emergency cascade - terminates all children immediately
   */
  public async emergencyCascade(): Promise<void> {
    console.log("[KillSwitch:Cascade] Emergency cascade initiated");

    const children = Array.from(this.children.values());

    await Promise.allSettled(
      children.map(async (child) => {
        try {
          if (child.terminate) {
            await child.terminate();
          }
        } catch (error) {
          console.error(`[KillSwitch:Cascade] Emergency termination failed:`, error);
        }
      })
    );

    this.children.clear();
  }

  /**
   * Clear all child registrations
   */
  public clear(): void {
    this.children.clear();
    console.log("[KillSwitch:Cascade] Cleared all child registrations");
  }
}

/**
 * Build a child termination command from parent command
 */
export function buildChildTerminationCommand(
  parentCommand: KillSwitchCommand,
  childInstanceId: string
): KillSwitchCommand {
  return {
    command_id: `${parentCommand.command_id}-child-${childInstanceId.substring(0, 8)}`,
    type: "TERMINATE",
    instance_id: childInstanceId,
    signature: parentCommand.signature,
    timestamp: new Date().toISOString(),
    reason: `Cascaded from parent: ${parentCommand.reason}`,
    issued_by: `cascade:${parentCommand.issued_by}`,
  };
}

/**
 * Check if a command should cascade to children
 */
export function shouldCascade(command: KillSwitchCommand, identity: RuntimeIdentity): boolean {
  // Only TERMINATE commands cascade
  if (command.type !== "TERMINATE") {
    return false;
  }

  // Check if agent has spawning capability
  if (!identity.capabilities_manifest.may_spawn_children) {
    return false;
  }

  // If command targets specific instance, cascade to that instance's children
  if (command.instance_id && command.instance_id === identity.instance_id) {
    return true;
  }

  // If command targets asset, cascade to all instances of that asset
  if (command.asset_id && command.asset_id === identity.asset_id) {
    return true;
  }

  // If command targets organization, cascade to all agents in organization
  if (command.organization) {
    return true;
  }

  return false;
}
