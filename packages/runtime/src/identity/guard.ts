/**
 * @guard Decorator (AIGOS-407)
 * TypeScript decorator for protecting functions with governance checks
 */

import type { RuntimeIdentity } from "@aigrc/core";

// ─────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────

/**
 * Context passed to the policy check
 */
export interface GuardContext {
  /** The action being performed */
  action: string;
  /** The resource being accessed (optional) */
  resource?: string;
  /** The arguments passed to the function */
  args: unknown[];
  /** Additional metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Result of a guard check
 */
export interface GuardCheckResult {
  /** Whether the action is allowed */
  allowed: boolean;
  /** Reason for denial (if not allowed) */
  reason?: string;
  /** Error code */
  code?: string;
}

/**
 * Policy checker function type
 */
export type PolicyChecker = (
  identity: RuntimeIdentity,
  context: GuardContext
) => GuardCheckResult | Promise<GuardCheckResult>;

/**
 * Governance error thrown when guard check fails
 */
export class GovernanceError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly action: string,
    public readonly identity: RuntimeIdentity
  ) {
    super(message);
    this.name = "GovernanceError";
  }
}

// ─────────────────────────────────────────────────────────────────
// GLOBAL CONFIGURATION
// ─────────────────────────────────────────────────────────────────

/** Global identity provider */
let globalIdentityProvider: (() => RuntimeIdentity | undefined) | undefined;

/** Global policy checker */
let globalPolicyChecker: PolicyChecker | undefined;

/**
 * Configure the guard decorator with identity provider and policy checker
 */
export function configureGuard(options: {
  identityProvider: () => RuntimeIdentity | undefined;
  policyChecker: PolicyChecker;
}): void {
  globalIdentityProvider = options.identityProvider;
  globalPolicyChecker = options.policyChecker;
}

/**
 * Get the current identity
 */
export function getCurrentIdentity(): RuntimeIdentity | undefined {
  return globalIdentityProvider?.();
}

// ─────────────────────────────────────────────────────────────────
// GUARD DECORATOR
// ─────────────────────────────────────────────────────────────────

/**
 * Guard decorator for protecting methods with governance checks
 *
 * @example
 * ```typescript
 * class MyAgent {
 *   @guard('call_api')
 *   async callExternalAPI(url: string) {
 *     // Only executes if policy allows 'call_api' action
 *   }
 *
 *   @guard('read_file', { resource: (args) => args[0] })
 *   async readFile(path: string) {
 *     // Resource is extracted from first argument
 *   }
 * }
 * ```
 */
export function guard(
  action: string,
  options?: {
    /** Extract resource from arguments */
    resource?: (args: unknown[]) => string | undefined;
    /** Additional metadata to include */
    metadata?: Record<string, unknown>;
  }
): MethodDecorator {
  return function (
    _target: object,
    propertyKey: string | symbol,
    descriptor: PropertyDescriptor
  ): PropertyDescriptor {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: unknown[]): Promise<unknown> {
      // Get identity
      const identity = globalIdentityProvider?.();
      if (!identity) {
        throw new GovernanceError(
          "NO_IDENTITY",
          "No runtime identity available for governance check",
          action,
          undefined as unknown as RuntimeIdentity
        );
      }

      // Build context
      const context: GuardContext = {
        action,
        resource: options?.resource?.(args),
        args,
        metadata: {
          ...options?.metadata,
          methodName: String(propertyKey),
        },
      };

      // Check policy
      if (!globalPolicyChecker) {
        throw new GovernanceError(
          "NO_POLICY_CHECKER",
          "No policy checker configured for governance checks",
          action,
          identity
        );
      }

      const result = await globalPolicyChecker(identity, context);

      if (!result.allowed) {
        throw new GovernanceError(
          result.code ?? "DENIED",
          result.reason ?? `Action '${action}' denied by policy`,
          action,
          identity
        );
      }

      // Execute original method
      return originalMethod.apply(this, args);
    };

    return descriptor;
  };
}

// ─────────────────────────────────────────────────────────────────
// GUARD FUNCTION (for non-decorator usage)
// ─────────────────────────────────────────────────────────────────

/**
 * Check if an action is allowed
 * Use this when decorators are not available
 *
 * @example
 * ```typescript
 * const result = await checkGuard('call_api', { resource: 'https://api.example.com' });
 * if (!result.allowed) {
 *   console.error(`Action denied: ${result.reason}`);
 *   return;
 * }
 * // Proceed with action
 * ```
 */
export async function checkGuard(
  action: string,
  options?: {
    resource?: string;
    metadata?: Record<string, unknown>;
  }
): Promise<GuardCheckResult> {
  const identity = globalIdentityProvider?.();
  if (!identity) {
    return {
      allowed: false,
      code: "NO_IDENTITY",
      reason: "No runtime identity available",
    };
  }

  if (!globalPolicyChecker) {
    return {
      allowed: false,
      code: "NO_POLICY_CHECKER",
      reason: "No policy checker configured",
    };
  }

  const context: GuardContext = {
    action,
    resource: options?.resource,
    args: [],
    metadata: options?.metadata,
  };

  return globalPolicyChecker(identity, context);
}

/**
 * Wrap an async function with a guard check
 * Use this for functional-style guard protection
 *
 * @example
 * ```typescript
 * const protectedFetch = guardAsync('fetch_url', async (url: string) => {
 *   return fetch(url);
 * }, { resource: (args) => args[0] });
 *
 * // Will throw GovernanceError if denied
 * await protectedFetch('https://api.example.com/data');
 * ```
 */
export function guardAsync<TArgs extends unknown[], TResult>(
  action: string,
  fn: (...args: TArgs) => Promise<TResult>,
  options?: {
    resource?: (args: TArgs) => string | undefined;
    metadata?: Record<string, unknown>;
  }
): (...args: TArgs) => Promise<TResult> {
  return async (...args: TArgs): Promise<TResult> => {
    const identity = globalIdentityProvider?.();
    if (!identity) {
      throw new GovernanceError(
        "NO_IDENTITY",
        "No runtime identity available",
        action,
        undefined as unknown as RuntimeIdentity
      );
    }

    if (!globalPolicyChecker) {
      throw new GovernanceError(
        "NO_POLICY_CHECKER",
        "No policy checker configured",
        action,
        identity
      );
    }

    const context: GuardContext = {
      action,
      resource: options?.resource?.(args),
      args,
      metadata: options?.metadata,
    };

    const result = await globalPolicyChecker(identity, context);

    if (!result.allowed) {
      throw new GovernanceError(
        result.code ?? "DENIED",
        result.reason ?? `Action '${action}' denied`,
        action,
        identity
      );
    }

    return fn(...args);
  };
}
