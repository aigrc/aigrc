/**
 * @aigrc/sdk - Type definitions
 *
 * Core types for the AIGOS SDK, extending @aigrc/core types
 * with runtime-specific interfaces.
 */

import type {
  RuntimeIdentity,
  GoldenThread,
  CapabilitiesManifest,
  PolicyFile,
  OperatingMode,
  Lineage,
} from "@aigrc/core";

// Re-export all @aigrc/core types
export * from "@aigrc/core";

/**
 * Configuration for creating a governed agent
 */
export interface GovernedAgentConfig {
  /** Human-readable name for the agent */
  name: string;

  /** Semantic version of the agent */
  version?: string;

  /** Control Plane endpoint URL */
  controlPlane?: string;

  /** API key for Control Plane authentication */
  apiKey?: string;

  /** Agent capabilities manifest */
  capabilities?: Partial<CapabilitiesManifest>;

  /** Initial policies to apply */
  policies?: PolicyFile[];

  /** Operating mode (NORMAL, SANDBOX, RESTRICTED) */
  mode?: OperatingMode;

  /** Parent agent for capability inheritance */
  parent?: {
    instanceId: string;
    capabilities?: CapabilitiesManifest;
  };

  /** Enable telemetry collection */
  telemetry?: boolean | TelemetryConfig;

  /** Kill switch configuration */
  killSwitch?: KillSwitchConfig;

  /** Golden Thread for business authorization */
  goldenThread?: GoldenThread;
}

/**
 * Telemetry configuration
 */
export interface TelemetryConfig {
  /** Enable/disable telemetry */
  enabled: boolean;

  /** OpenTelemetry exporter endpoint */
  endpoint?: string;

  /** Sampling rate (0.0 - 1.0) */
  samplingRate?: number;

  /** Include trace context in logs */
  includeTraceContext?: boolean;

  /** Batch size for telemetry events */
  batchSize?: number;

  /** Flush interval in milliseconds */
  flushIntervalMs?: number;
}

/**
 * Kill switch configuration
 */
export interface KillSwitchConfig {
  /** Enable/disable kill switch listener */
  enabled: boolean;

  /** Transport type for receiving commands */
  transport?: "sse" | "polling" | "websocket";

  /** Polling interval (for polling transport) */
  pollingIntervalMs?: number;

  /** Handler for kill switch commands */
  onCommand?: (command: KillSwitchCommand) => void | Promise<void>;

  /** Graceful shutdown timeout in ms */
  gracefulShutdownMs?: number;
}

/**
 * Kill switch command types
 */
export type KillSwitchCommandType = "terminate" | "pause" | "resume" | "restart";

/**
 * Kill switch command received from Control Plane
 */
export interface KillSwitchCommand {
  /** Command type */
  command: KillSwitchCommandType;

  /** Target agent ID */
  agentId: string;

  /** Reason for the command */
  reason?: string;

  /** User who issued the command */
  issuedBy?: string;

  /** Timestamp when command was issued */
  issuedAt: Date;

  /** Cryptographic signature for verification */
  signature?: string;
}

/**
 * Result of a governed agent creation
 */
export interface GovernedAgent {
  /** Unique runtime identity */
  identity: RuntimeIdentity;

  /** Agent lineage (parent/child relationships) */
  lineage: Lineage;

  /** Control Plane client for API calls */
  client: ControlPlaneClient;

  /** Request approval for an action (HITL) */
  requestApproval: (request: ApprovalRequest) => Promise<ApprovalResult>;

  /** Check if action is permitted by policy */
  checkPermission: (action: string, resource?: string) => Promise<PermissionResult>;

  /** Spawn a child agent with decayed capabilities */
  spawn: (config: Partial<GovernedAgentConfig>) => Promise<GovernedAgent>;

  /** Gracefully shutdown the agent */
  shutdown: () => Promise<void>;

  /** Current operating mode */
  mode: OperatingMode;

  /** Is the agent currently paused? */
  isPaused: boolean;
}

/**
 * Control Plane client interface
 */
export interface ControlPlaneClient {
  /** Register the agent with Control Plane */
  register: () => Promise<RegistrationResult>;

  /** Send heartbeat to Control Plane */
  heartbeat: () => Promise<void>;

  /** Fetch latest policies */
  fetchPolicies: () => Promise<PolicyFile[]>;

  /** Report telemetry data */
  reportTelemetry: (data: TelemetryData) => Promise<void>;

  /** Subscribe to kill switch commands */
  subscribeKillSwitch: (handler: (cmd: KillSwitchCommand) => void) => () => void;

  /** Request HITL approval */
  requestHITL: (request: ApprovalRequest) => Promise<ApprovalResult>;

  /** Connection status */
  isConnected: boolean;

  /** Disconnect from Control Plane */
  disconnect: () => Promise<void>;
}

/**
 * Agent registration result
 */
export interface RegistrationResult {
  /** Assigned agent ID */
  agentId: string;

  /** Authentication token for subsequent requests */
  authToken: string;

  /** Initial policies assigned */
  policies: PolicyFile[];

  /** Registration timestamp */
  registeredAt: Date;
}

/**
 * Permission check result
 */
export interface PermissionResult {
  /** Is the action allowed? */
  allowed: boolean;

  /** Reason for decision */
  reason?: string;

  /** Matched policy rule (if any) */
  matchedRule?: string;

  /** Required approvals (if HITL needed) */
  requiresApproval?: boolean;
}

/**
 * HITL approval request
 */
export interface ApprovalRequest {
  /** Action being requested */
  action: string;

  /** Resource being acted upon */
  resource?: string;

  /** Additional context for approver */
  context?: Record<string, unknown>;

  /** Timeout in milliseconds */
  timeoutMs?: number;

  /** Fallback behavior if timeout (deny/allow) */
  fallback?: "deny" | "allow";

  /** Priority level */
  priority?: "low" | "medium" | "high" | "critical";
}

/**
 * HITL approval result
 */
export interface ApprovalResult {
  /** Was the request approved? */
  approved: boolean;

  /** Approver information */
  approvedBy?: string;

  /** Approval timestamp */
  approvedAt?: Date;

  /** Comments from approver */
  comments?: string;

  /** Golden Thread reference for audit */
  goldenThread?: GoldenThread;

  /** Did the request timeout? */
  timedOut?: boolean;
}

/**
 * Telemetry data payload
 */
export interface TelemetryData {
  /** Event type */
  type: "action" | "decision" | "error" | "metric";

  /** Event name */
  name: string;

  /** Event timestamp */
  timestamp: Date;

  /** Trace context */
  traceId?: string;
  spanId?: string;

  /** Event attributes */
  attributes?: Record<string, unknown>;

  /** Golden Thread correlation */
  goldenThreadId?: string;
}

/**
 * Guard decorator options
 */
export interface GuardOptions {
  /** Action name for policy checking */
  action: string;

  /** Resource being accessed */
  resource?: string;

  /** Require HITL approval */
  requireApproval?: boolean;

  /** Approval timeout in ms */
  approvalTimeoutMs?: number;

  /** Fallback if approval times out */
  approvalFallback?: "deny" | "allow";

  /** Custom permission checker */
  permissionCheck?: (context: GuardContext) => boolean | Promise<boolean>;
}

/**
 * Guard execution context
 */
export interface GuardContext {
  /** Agent identity */
  agent: GovernedAgent;

  /** Method being guarded */
  methodName: string;

  /** Method arguments */
  args: unknown[];

  /** Target object */
  target: unknown;

  /** Action being performed */
  action: string;

  /** Resource being accessed */
  resource?: string;
}

/**
 * Guard error thrown when action is denied
 */
export class GuardError extends Error {
  constructor(
    message: string,
    public readonly action: string,
    public readonly resource?: string,
    public readonly reason?: string
  ) {
    super(message);
    this.name = "GuardError";
  }
}
