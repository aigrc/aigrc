# @aigrc/sdk API Documentation

Complete API reference for the AIGOS SDK.

## Table of Contents

- [Core Functions](#core-functions)
- [Decorators](#decorators)
- [Types](#types)
- [Control Plane Client](#control-plane-client)
- [Telemetry](#telemetry)

---

## Core Functions

### `createGovernedAgent(config: GovernedAgentConfig): Promise<GovernedAgent>`

Creates a new governed agent with full AIGOS runtime capabilities.

#### Parameters

```typescript
interface GovernedAgentConfig {
  // Required
  name: string;

  // Optional - Identity
  version?: string;

  // Optional - Control Plane
  controlPlane?: string;
  apiKey?: string;

  // Optional - Capabilities
  capabilities?: Partial<CapabilitiesManifest>;

  // Optional - Golden Thread
  goldenThread?: GoldenThread;

  // Optional - Kill Switch
  killSwitch?: KillSwitchConfig;

  // Optional - Telemetry
  telemetry?: boolean | TelemetryConfig;

  // Optional - Operating Mode
  mode?: OperatingMode;

  // Optional - Parent Agent (for spawning)
  parent?: {
    instanceId: string;
    capabilities: CapabilitiesManifest;
  };
}
```

#### Returns

```typescript
interface GovernedAgent {
  // Identity
  readonly identity: RuntimeIdentity;
  readonly lineage: Lineage;

  // Control Plane client
  readonly client: ControlPlaneClient;

  // State
  readonly mode: OperatingMode;
  readonly isPaused: boolean;

  // Methods
  checkPermission(action: string, resource?: string): Promise<PermissionResult>;
  requestApproval(request: ApprovalRequest): Promise<ApprovalResult>;
  spawn(config: Partial<GovernedAgentConfig>): Promise<GovernedAgent>;
  shutdown(): Promise<void>;
}
```

#### Example

```typescript
const agent = await createGovernedAgent({
  name: 'my-agent',
  version: '1.0.0',
  capabilities: {
    allowed_tools: ['database:read'],
  },
});
```

---

## Decorators

### `@guard(options: GuardOptions)`

Method decorator that enforces governance on class methods.

#### Parameters

```typescript
interface GuardOptions {
  // Required: The action being performed
  action: string;

  // Optional: The resource being accessed
  // Supports template interpolation: 'users/${userId}'
  resource?: string;

  // Optional: Require HITL approval before execution
  requireApproval?: boolean;

  // Optional: Behavior when agent is offline
  // 'allow' - Allow execution
  // 'deny' - Deny execution (default)
  fallback?: 'allow' | 'deny';
}
```

#### Example

```typescript
class UserService {
  @guard({ action: 'database:read', resource: 'users' })
  async getUsers() {
    return db.users.findAll();
  }

  @guard({
    action: 'database:delete',
    resource: 'users/${userId}',
    requireApproval: true,
  })
  async deleteUser(userId: string) {
    return db.users.delete(userId);
  }
}
```

### `setAgent(instance: object, agent: GovernedAgent): void`

Attaches a governed agent to a class instance for use with `@guard`.

```typescript
const service = new UserService();
setAgent(service, agent);
```

### `getAgent(instance: object): GovernedAgent | undefined`

Retrieves the governed agent from a class instance.

```typescript
const agent = getAgent(service);
if (agent) {
  console.log(agent.identity.instance_id);
}
```

### `withGuard<T extends (...args: any[]) => any>(fn: T, agent: GovernedAgent, options: GuardOptions): T`

Wraps a function with governance (functional alternative to decorator).

```typescript
const unsafeDelete = async (id: string) => {
  return db.delete(id);
};

const safeDelete = withGuard(unsafeDelete, agent, {
  action: 'database:delete',
  resource: 'records',
});

await safeDelete('123'); // Permission checked
```

---

## Types

### `RuntimeIdentity`

The complete identity of a governed agent.

```typescript
interface RuntimeIdentity {
  instance_id: string;          // Unique instance identifier
  asset_id: string;             // AIGRC format: aigrc-YYYY-XXXXXXXX
  asset_name: string;           // Human-readable name
  asset_version: string;        // Semantic version
  golden_thread_hash: string;   // SHA-256 hash of golden thread
  golden_thread: GoldenThread;  // Business authorization
  risk_level: RiskLevel;        // minimal, limited, high, unacceptable
  lineage: Lineage;             // Parent/child relationships
  capabilities_manifest: CapabilitiesManifest;
  created_at: string;           // ISO 8601 timestamp
  verified: boolean;            // Signature verified
  mode: OperatingMode;          // Current operating mode
}
```

### `Lineage`

Tracks parent/child relationships for hierarchical agents.

```typescript
interface Lineage {
  parent_instance_id: string | null;  // Null for root agents
  generation_depth: number;            // 0 for root, increases for children
  ancestor_chain: string[];            // All ancestor instance IDs
  root_instance_id: string;            // Original root agent
  spawned_at: string;                  // ISO 8601 timestamp
}
```

### `CapabilitiesManifest`

Defines what an agent can and cannot do.

```typescript
interface CapabilitiesManifest {
  // Tool permissions
  allowed_tools: string[];      // Allowed actions (supports wildcards)
  denied_tools: string[];       // Denied actions (takes precedence)

  // Network permissions
  allowed_domains: string[];    // Allowed network domains
  denied_domains: string[];     // Blocked network domains

  // Child spawning
  may_spawn_children: boolean;  // Can spawn child agents
  max_child_depth: number;      // Maximum generation depth

  // Capability inheritance
  capability_mode: 'decay' | 'inherit' | 'explicit';

  // Resource limits
  max_cost_per_session?: number;   // USD
  max_cost_per_day?: number;       // USD
  max_tokens_per_call?: number;    // Token limit

  // Custom extensions
  custom?: Record<string, unknown>;
}
```

### `GoldenThread`

Links runtime to business authorization.

```typescript
interface GoldenThread {
  ticket_id: string;        // External ticket ID (e.g., JIRA-123)
  approved_by: string;      // Email of approver
  approved_at: string;      // ISO 8601 timestamp
  hash?: string;            // SHA-256 hash
  signature?: string;       // Cryptographic signature
}
```

### `PermissionResult`

Result of permission checking.

```typescript
interface PermissionResult {
  allowed: boolean;         // Whether action is permitted
  reason?: string;          // Explanation if denied
  policy_id?: string;       // Policy that made the decision
}
```

### `ApprovalRequest`

Request for HITL approval.

```typescript
interface ApprovalRequest {
  action: string;              // Action requiring approval
  resource?: string;           // Resource being accessed
  reason?: string;             // Reason for the action
  context?: Record<string, unknown>;  // Additional context
  timeout?: number;            // Timeout in milliseconds
  fallback?: 'allow' | 'deny'; // Behavior on timeout/offline
}
```

### `ApprovalResult`

Result of HITL approval request.

```typescript
interface ApprovalResult {
  approved: boolean;        // Whether approved
  timedOut?: boolean;       // Whether request timed out
  approvedBy?: string;      // Email of approver
  approvedAt?: string;      // ISO 8601 timestamp
  reason?: string;          // Reason for decision
}
```

### `KillSwitchConfig`

Kill switch configuration.

```typescript
interface KillSwitchConfig {
  enabled?: boolean;                         // Enable kill switch
  onCommand?: (cmd: KillSwitchCommand) => Promise<void>;
}

interface KillSwitchCommand {
  command: 'terminate' | 'pause' | 'resume' | 'restart';
  reason?: string;
  timestamp?: string;
}
```

### `OperatingMode`

Agent operating modes.

```typescript
type OperatingMode =
  | 'NORMAL'       // Standard operation
  | 'DEGRADED'     // Reduced capabilities
  | 'EMERGENCY'    // Emergency operations only
  | 'MAINTENANCE'  // Maintenance mode
  | 'READ_ONLY';   // Read-only operations
```

### `RiskLevel`

EU AI Act risk levels.

```typescript
type RiskLevel =
  | 'minimal'       // Low risk
  | 'limited'       // Limited transparency obligations
  | 'high'          // High-risk requirements
  | 'unacceptable'; // Prohibited
```

---

## Control Plane Client

### `createControlPlaneClient(config): ControlPlaneClient`

Creates a client for communicating with the Control Plane.

```typescript
interface ControlPlaneClientConfig {
  endpoint?: string;
  apiKey?: string;
  identity: RuntimeIdentity;
  heartbeatInterval?: number;  // Default: 30000ms
}

interface ControlPlaneClient {
  readonly isConnected: boolean;

  register(): Promise<RegistrationResult>;
  disconnect(): Promise<void>;
  subscribeKillSwitch(handler: (cmd: KillSwitchCommand) => void): () => void;
  requestHITL(request: ApprovalRequest): Promise<ApprovalResult>;
}
```

---

## Telemetry

### `createTelemetryManager(config, identity): TelemetryManager`

Creates a telemetry manager for observability.

```typescript
interface TelemetryConfig {
  enabled: boolean;
  endpoint?: string;
  batchSize?: number;        // Default: 100
  flushInterval?: number;    // Default: 10000ms
  sampleRate?: number;       // 0-1, default: 1
}

interface TelemetryManager {
  readonly isEnabled: boolean;

  trackPermissionCheck(data: PermissionCheckEvent): void;
  trackHITLRequest(data: HITLEvent): void;
  trackLifecycle(event: 'started' | 'shutdown' | 'paused' | 'resumed'): void;
  trackMetric(name: string, value: number, tags?: Record<string, string>): void;
  trackError(error: Error, context?: Record<string, unknown>): void;

  getQueuedEvents(): TelemetryEvent[];
  flush(): Promise<void>;
}
```

---

## Error Handling

### `GuardError`

Thrown when a guarded method is denied permission.

```typescript
class GuardError extends Error {
  readonly action: string;
  readonly resource?: string;
  readonly reason: string;
}
```

```typescript
try {
  await guardedMethod();
} catch (error) {
  if (error instanceof GuardError) {
    console.log(`Denied: ${error.action} - ${error.reason}`);
  }
}
```
