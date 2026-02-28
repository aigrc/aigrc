/**
 * @aigrc/sdk - Guard Decorator
 *
 * Method-level governance enforcement using TypeScript decorators.
 * Automatically checks permissions before method execution.
 */

import type {
  GuardOptions,
  GuardContext,
  GuardError,
  GovernedAgent,
  PermissionResult,
} from "../types/index.js";

// Symbol for storing agent reference on class instances
const AGENT_SYMBOL = Symbol("@aigrc/agent");

/**
 * Guard decorator for method-level governance enforcement.
 *
 * @example
 * ```typescript
 * class OrderProcessor {
 *   [AGENT_SYMBOL]: GovernedAgent;
 *
 *   @guard({ action: "database:write", resource: "orders" })
 *   async createOrder(data: OrderData) {
 *     // This method will only execute if permission is granted
 *   }
 *
 *   @guard({ action: "pii:access", requireApproval: true })
 *   async accessUserPII(userId: string) {
 *     // This requires HITL approval before execution
 *   }
 * }
 *
 * // Set the agent on the instance
 * const processor = new OrderProcessor();
 * setAgent(processor, agent);
 * ```
 */
export function guard(options: GuardOptions) {
  return function (
    target: unknown,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: unknown[]) {
      // Get agent from instance
      const agent = (this as Record<symbol, GovernedAgent>)[AGENT_SYMBOL];

      if (!agent) {
        throw new GuardErrorImpl(
          "No agent attached to instance. Use setAgent() to attach a governed agent.",
          options.action,
          options.resource
        );
      }

      // Build guard context
      const context: GuardContext = {
        agent,
        methodName: propertyKey,
        args,
        target: this,
        action: options.action,
        resource: options.resource,
      };

      // Check custom permission if provided
      if (options.permissionCheck) {
        const allowed = await options.permissionCheck(context);
        if (!allowed) {
          throw new GuardErrorImpl(
            `Permission denied by custom check for action '${options.action}'`,
            options.action,
            options.resource,
            "Custom permission check returned false"
          );
        }
      }

      // Check agent permission
      const result = await agent.checkPermission(
        options.action,
        options.resource
      );

      if (!result.allowed) {
        throw new GuardErrorImpl(
          `Permission denied for action '${options.action}'`,
          options.action,
          options.resource,
          result.reason
        );
      }

      // Request HITL approval if required
      if (options.requireApproval || result.requiresApproval) {
        const approval = await agent.requestApproval({
          action: options.action,
          resource: options.resource,
          context: {
            methodName: propertyKey,
            args: args.map((arg) =>
              typeof arg === "object" ? "[object]" : String(arg)
            ),
          },
          timeoutMs: options.approvalTimeoutMs,
          fallback: options.approvalFallback || "deny",
        });

        if (!approval.approved) {
          throw new GuardErrorImpl(
            `HITL approval denied for action '${options.action}'`,
            options.action,
            options.resource,
            approval.comments || (approval.timedOut ? "Approval timed out" : undefined)
          );
        }
      }

      // Execute original method
      return originalMethod.apply(this, args);
    };

    return descriptor;
  };
}

/**
 * Set the governed agent on a class instance
 */
export function setAgent<T extends object>(
  instance: T,
  agent: GovernedAgent
): void {
  (instance as Record<symbol, GovernedAgent>)[AGENT_SYMBOL] = agent;
}

/**
 * Get the governed agent from a class instance
 * @returns The governed agent or undefined if not set
 */
export function getAgent<T extends object>(instance: T): GovernedAgent | undefined {
  return (instance as Record<symbol, GovernedAgent>)[AGENT_SYMBOL] ?? undefined;
}

/**
 * Implementation of GuardError
 */
class GuardErrorImpl extends Error implements GuardError {
  public readonly action: string;
  public readonly resource?: string;
  public readonly reason?: string;

  constructor(
    message: string,
    action: string,
    resource?: string,
    reason?: string
  ) {
    super(message);
    this.name = "GuardError";
    this.action = action;
    this.resource = resource;
    this.reason = reason;
  }
}

/**
 * Higher-order function version of guard for functional programming style
 *
 * @example
 * ```typescript
 * const guardedFn = withGuard(
 *   agent,
 *   { action: "api:call", resource: "external" },
 *   async (url: string) => {
 *     return fetch(url);
 *   }
 * );
 *
 * const result = await guardedFn("https://api.example.com");
 * ```
 */
export function withGuard<T extends (...args: unknown[]) => unknown>(
  agent: GovernedAgent,
  options: GuardOptions,
  fn: T
): T {
  return (async (...args: Parameters<T>) => {
    // Check permission
    const result = await agent.checkPermission(options.action, options.resource);

    if (!result.allowed) {
      throw new GuardErrorImpl(
        `Permission denied for action '${options.action}'`,
        options.action,
        options.resource,
        result.reason
      );
    }

    // Request approval if required
    if (options.requireApproval || result.requiresApproval) {
      const approval = await agent.requestApproval({
        action: options.action,
        resource: options.resource,
        timeoutMs: options.approvalTimeoutMs,
        fallback: options.approvalFallback || "deny",
      });

      if (!approval.approved) {
        throw new GuardErrorImpl(
          `HITL approval denied for action '${options.action}'`,
          options.action,
          options.resource,
          approval.comments
        );
      }
    }

    return fn(...args);
  }) as T;
}

// Export the agent symbol for advanced use cases
export { AGENT_SYMBOL };

// Re-export types
export type { GuardOptions, GuardContext, GuardError };
