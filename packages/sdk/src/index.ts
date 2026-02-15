/**
 * @aigos/sdk - Unified SDK for AI Governance Operating System
 *
 * The primary entry point for developers building governed AI agents.
 * Provides runtime governance, policy enforcement, telemetry, and
 * Control Plane integration.
 *
 * @example
 * ```typescript
 * import { createGovernedAgent, guard, setAgent } from "@aigos/sdk";
 *
 * // Create a governed agent
 * const agent = await createGovernedAgent({
 *   name: "my-agent",
 *   version: "1.0.0",
 *   controlPlane: "https://cp.aigos.io",
 *   apiKey: process.env.AIGOS_API_KEY,
 *   capabilities: {
 *     tools: ["database:read", "api:call"],
 *   },
 * });
 *
 * // Use the @guard decorator for method-level governance
 * class MyService {
 *   @guard({ action: "database:read", resource: "users" })
 *   async getUsers() {
 *     // Only executes if permission granted
 *   }
 * }
 *
 * const service = new MyService();
 * setAgent(service, agent);
 * ```
 *
 * @packageDocumentation
 */

// Core agent factory
export { createGovernedAgent } from "./agent.js";

// Decorators for method-level governance
export {
  guard,
  setAgent,
  getAgent,
  withGuard,
  AGENT_SYMBOL,
} from "./decorators/index.js";

// Control Plane client
export {
  createControlPlaneClient,
  ControlPlaneClientImpl,
} from "./client/index.js";

// Telemetry
export { createTelemetryManager } from "./telemetry/index.js";

// Types - all exported from types module
export type {
  // Agent types
  GovernedAgentConfig,
  GovernedAgent,

  // Control Plane types
  ControlPlaneClient,
  RegistrationResult,

  // Permission types
  PermissionResult,
  ApprovalRequest,
  ApprovalResult,

  // Kill switch types
  KillSwitchConfig,
  KillSwitchCommand,
  KillSwitchCommandType,

  // Telemetry types
  TelemetryConfig,
  TelemetryData,

  // Decorator types
  GuardOptions,
  GuardContext,
  GuardError,
} from "./types/index.js";

// Re-export all @aigrc/core types for convenience
export * from "@aigrc/core";

/**
 * SDK Version
 */
export const VERSION = "0.1.0";

/**
 * SDK Name
 */
export const SDK_NAME = "@aigos/sdk";
