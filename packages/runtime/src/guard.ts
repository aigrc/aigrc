import type { RuntimeIdentity, RiskLevel, OperatingMode } from "@aigrc/core";
import { createRuntimeContext, type RuntimeContext, type ActionCheckResult, type RuntimeContextConfig } from "./context.js";

// ─────────────────────────────────────────────────────────────────
// @guard DECORATOR API (AIG-44 / SPEC-RT-003)
// Decorator-based governance enforcement for agent methods
// ─────────────────────────────────────────────────────────────────

/** Policy check result for guard operations */
export interface PolicyCheckResult {
  allowed: boolean;
  reason: string;
}

/** Guard options for decorator */
export interface GuardOptions {
  /** The action being performed (e.g., "read_file", "execute_tool") */
  action?: string;
  /** Required tools for this method */
  requiredTools?: string[];
  /** Required domains for this method */
  requiredDomains?: string[];
  /** Minimum risk level allowed */
  maxRiskLevel?: RiskLevel;
  /** Required operating modes */
  allowedModes?: OperatingMode[];
  /** Custom check function */
  customCheck?: (context: RuntimeContext, args: unknown[]) => PolicyCheckResult | Promise<PolicyCheckResult>;
  /** Whether to throw on denial (default: true) */
  throwOnDeny?: boolean;
  /** Custom error message */
  errorMessage?: string;
}

/** Result of guard check */
export interface GuardResult {
  allowed: boolean;
  reason: string;
  checkResults: PolicyCheckResult[];
}

/** Error thrown when guard denies access */
export class GuardDeniedError extends Error {
  constructor(
    message: string,
    public readonly result: GuardResult,
    public readonly action?: string
  ) {
    super(message);
    this.name = "GuardDeniedError";
  }
}

/** Global context storage for decorated methods */
let _globalContext: RuntimeContext | null = null;

/**
 * Sets the global runtime context for guard decorators.
 * This must be called before using @guard decorated methods.
 */
export function setGuardContext(context: RuntimeContext): void {
  _globalContext = context;
}

/**
 * Gets the current guard context
 */
export function getGuardContext(): RuntimeContext | null {
  return _globalContext;
}

/**
 * Clears the guard context
 */
export function clearGuardContext(): void {
  _globalContext = null;
}

/**
 * Creates a guard context from an identity
 */
export function createGuardContext(identity: RuntimeIdentity): RuntimeContext {
  const config: RuntimeContextConfig = { identity };
  return createRuntimeContext(config);
}

/**
 * @guard decorator for methods that require governance checks.
 *
 * @example
 * ```typescript
 * class MyAgent {
 *   @guard({ action: "read_file", requiredTools: ["filesystem"] })
 *   async readFile(path: string): Promise<string> {
 *     return fs.readFileSync(path, 'utf-8');
 *   }
 *
 *   @guard({ maxRiskLevel: "limited", allowedModes: ["NORMAL"] })
 *   async sensitiveOperation(): Promise<void> {
 *     // ...
 *   }
 * }
 * ```
 */
export function guard(options: GuardOptions = {}): MethodDecorator {
  return function <T>(
    target: object,
    propertyKey: string | symbol,
    descriptor: TypedPropertyDescriptor<T>
  ): TypedPropertyDescriptor<T> | void {
    const originalMethod = descriptor.value as unknown as (...args: unknown[]) => unknown;

    if (typeof originalMethod !== "function") {
      throw new Error(`@guard can only be applied to methods`);
    }

    descriptor.value = async function (this: unknown, ...args: unknown[]): Promise<unknown> {
      const context = _globalContext;

      if (!context) {
        throw new Error(
          "@guard: No runtime context set. Call setGuardContext() before invoking guarded methods."
        );
      }

      // Perform guard checks
      const result = await performGuardChecks(context, options, args);

      if (!result.allowed) {
        if (options.throwOnDeny !== false) {
          const message = options.errorMessage ??
            `Guard denied: ${result.reason} (action: ${options.action ?? propertyKey.toString()})`;
          throw new GuardDeniedError(message, result, options.action);
        }
        return undefined;
      }

      // Call original method
      return originalMethod.apply(this, args);
    } as unknown as T;

    return descriptor;
  };
}

/**
 * Performs all guard checks
 */
async function performGuardChecks(
  context: RuntimeContext,
  options: GuardOptions,
  args: unknown[]
): Promise<GuardResult> {
  const checkResults: PolicyCheckResult[] = [];

  // Check action if specified
  if (options.action) {
    const actionResult = context.checkAction(options.action, "*");
    const policyResult: PolicyCheckResult = {
      allowed: actionResult.allowed,
      reason: actionResult.reason,
    };
    checkResults.push(policyResult);
    if (!actionResult.allowed) {
      return {
        allowed: false,
        reason: `Action '${options.action}' denied: ${actionResult.reason}`,
        checkResults,
      };
    }
  }

  // Check required tools
  if (options.requiredTools) {
    for (const tool of options.requiredTools) {
      const toolAllowed = context.checkTool(tool);
      const policyResult: PolicyCheckResult = {
        allowed: toolAllowed,
        reason: toolAllowed ? "Tool allowed" : "Tool denied",
      };
      checkResults.push(policyResult);
      if (!toolAllowed) {
        return {
          allowed: false,
          reason: `Tool '${tool}' denied`,
          checkResults,
        };
      }
    }
  }

  // Check required domains
  if (options.requiredDomains) {
    for (const domain of options.requiredDomains) {
      const domainAllowed = context.checkDomain(domain);
      const policyResult: PolicyCheckResult = {
        allowed: domainAllowed,
        reason: domainAllowed ? "Domain allowed" : "Domain denied",
      };
      checkResults.push(policyResult);
      if (!domainAllowed) {
        return {
          allowed: false,
          reason: `Domain '${domain}' denied`,
          checkResults,
        };
      }
    }
  }

  // Check risk level
  if (options.maxRiskLevel) {
    const riskOrdinal = getRiskOrdinal(context.identity.risk_level);
    const maxOrdinal = getRiskOrdinal(options.maxRiskLevel);
    if (riskOrdinal > maxOrdinal) {
      const result: PolicyCheckResult = {
        allowed: false,
        reason: `Risk level ${context.identity.risk_level} exceeds maximum ${options.maxRiskLevel}`,
      };
      checkResults.push(result);
      return {
        allowed: false,
        reason: result.reason,
        checkResults,
      };
    }
  }

  // Check operating mode
  if (options.allowedModes && options.allowedModes.length > 0) {
    if (!options.allowedModes.includes(context.identity.mode)) {
      const result: PolicyCheckResult = {
        allowed: false,
        reason: `Operating mode ${context.identity.mode} not in allowed modes: ${options.allowedModes.join(", ")}`,
      };
      checkResults.push(result);
      return {
        allowed: false,
        reason: result.reason,
        checkResults,
      };
    }
  }

  // Run custom check
  if (options.customCheck) {
    const customResult = await options.customCheck(context, args);
    checkResults.push(customResult);
    if (!customResult.allowed) {
      return {
        allowed: false,
        reason: `Custom check failed: ${customResult.reason}`,
        checkResults,
      };
    }
  }

  return {
    allowed: true,
    reason: "All checks passed",
    checkResults,
  };
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

/**
 * Functional version of guard for non-decorator usage.
 *
 * @example
 * ```typescript
 * const result = await guardCheck(context, {
 *   action: "read_file",
 *   requiredTools: ["filesystem"],
 * });
 * if (!result.allowed) {
 *   throw new Error(result.reason);
 * }
 * ```
 */
export async function guardCheck(
  context: RuntimeContext,
  options: GuardOptions,
  args: unknown[] = []
): Promise<GuardResult> {
  return performGuardChecks(context, options, args);
}

/**
 * Higher-order function that wraps a function with guard checks.
 *
 * @example
 * ```typescript
 * const guardedReadFile = withGuard(
 *   async (path: string) => fs.readFileSync(path, 'utf-8'),
 *   { action: "read_file", requiredTools: ["filesystem"] }
 * );
 *
 * const content = await guardedReadFile(context, "/path/to/file");
 * ```
 */
export function withGuard<T extends (...args: unknown[]) => unknown>(
  fn: T,
  options: GuardOptions
): (context: RuntimeContext, ...args: Parameters<T>) => Promise<ReturnType<T>> {
  return async (context: RuntimeContext, ...args: Parameters<T>): Promise<ReturnType<T>> => {
    const result = await performGuardChecks(context, options, args);

    if (!result.allowed) {
      if (options.throwOnDeny !== false) {
        throw new GuardDeniedError(
          options.errorMessage ?? `Guard denied: ${result.reason}`,
          result,
          options.action
        );
      }
      return undefined as ReturnType<T>;
    }

    return fn(...args) as ReturnType<T>;
  };
}

/**
 * Creates a guarded scope where all operations use the provided context.
 *
 * @example
 * ```typescript
 * await guardedScope(context, async () => {
 *   await myGuardedMethod();
 *   await anotherGuardedMethod();
 * });
 * ```
 */
export async function guardedScope<T>(
  context: RuntimeContext,
  fn: () => T | Promise<T>
): Promise<T> {
  const previousContext = _globalContext;
  try {
    _globalContext = context;
    return await fn();
  } finally {
    _globalContext = previousContext;
  }
}
