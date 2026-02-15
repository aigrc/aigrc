# @aigos/sdk

> Unified SDK for AIGOS - AI Governance Operating System

The primary TypeScript SDK for building governed AI agents with enterprise-grade compliance, observability, and control.

## Features

- **`createGovernedAgent()`** - Factory for creating governed agents with automatic Control Plane integration
- **`@guard` Decorator** - Method-level governance enforcement with policy checking
- **Control Plane Client** - Registration, heartbeat, policy sync, and kill-switch
- **Telemetry** - OpenTelemetry-compatible observability with tracing and metrics
- **Kill Switch** - Real-time agent termination via SSE/polling
- **HITL Integration** - Human-in-the-loop approval workflows
- **Capability Decay** - Automatic permission reduction for child agents

## Installation

```bash
npm install @aigos/sdk
# or
pnpm add @aigos/sdk
# or
yarn add @aigos/sdk
```

## Quick Start

```typescript
import { createGovernedAgent, guard, setAgent } from "@aigos/sdk";

// Create a governed agent
const agent = await createGovernedAgent({
  name: "order-processor",
  version: "1.0.0",
  controlPlane: "https://cp.aigos.io",
  apiKey: process.env.AIGOS_API_KEY,
  capabilities: {
    tools: ["database:read", "database:write", "api:call"],
  },
  telemetry: {
    enabled: true,
    endpoint: "https://otel.aigos.io/v1/traces",
  },
});

// Check permissions before actions
const result = await agent.checkPermission("database:write", "orders");
if (result.allowed) {
  // Perform the action
}

// Graceful shutdown
await agent.shutdown();
```

## Using the @guard Decorator

Apply governance at the method level:

```typescript
import { guard, setAgent } from "@aigos/sdk";

class OrderService {
  @guard({ action: "database:write", resource: "orders" })
  async createOrder(data: OrderData) {
    // Only executes if permission is granted
    return db.orders.create(data);
  }

  @guard({
    action: "pii:access",
    requireApproval: true,
    approvalTimeoutMs: 300000 // 5 minutes
  })
  async accessUserPII(userId: string) {
    // Requires HITL approval before execution
    return db.users.findById(userId);
  }
}

// Attach agent to service instance
const service = new OrderService();
setAgent(service, agent);

// Now methods are governed
await service.createOrder({ item: "widget", quantity: 1 });
```

## Functional Guard

For functional programming style:

```typescript
import { withGuard } from "@aigos/sdk";

const guardedFetch = withGuard(
  agent,
  { action: "api:call", resource: "external" },
  async (url: string) => {
    return fetch(url);
  }
);

const response = await guardedFetch("https://api.example.com/data");
```

## Control Plane Integration

The SDK automatically handles:

- **Registration** - Agents register on startup
- **Heartbeat** - Periodic health checks (30s default)
- **Policy Sync** - Fetch latest policies from Control Plane
- **Kill Switch** - Subscribe to real-time termination commands
- **Telemetry** - Report actions, decisions, and errors

```typescript
// Access the Control Plane client directly
const policies = await agent.client.fetchPolicies();

// Check connection status
if (agent.client.isConnected) {
  console.log("Connected to Control Plane");
}
```

## Spawning Child Agents

Create child agents with automatic capability decay:

```typescript
const childAgent = await agent.spawn({
  name: "order-processor-worker",
  // Capabilities are automatically reduced (80% by default)
});

// Child has reduced permissions
const result = await childAgent.checkPermission("database:write");
// May return { allowed: false } due to decay
```

## HITL (Human-in-the-Loop) Approval

Request human approval for sensitive operations:

```typescript
const approval = await agent.requestApproval({
  action: "delete:user",
  resource: "user-123",
  context: {
    reason: "GDPR deletion request",
    requestedBy: "admin@company.com",
  },
  timeoutMs: 300000, // 5 minutes
  fallback: "deny", // Deny if timeout
  priority: "high",
});

if (approval.approved) {
  console.log(`Approved by ${approval.approvedBy}`);
  // Proceed with deletion
}
```

## Telemetry

Built-in observability with OpenTelemetry compatibility:

```typescript
import { createTelemetryManager } from "@aigos/sdk/telemetry";

const telemetry = createTelemetryManager(
  {
    enabled: true,
    endpoint: "https://otel.aigos.io/v1/traces",
    samplingRate: 0.1, // 10% sampling
  },
  agent.identity
);

// Record custom events
telemetry.recordAction("order:created", { orderId: "123" });
telemetry.recordMetric("order:value", 99.99);

// Create spans for tracing
const span = telemetry.startSpan("process-order");
try {
  // ... processing ...
  span.setStatus("OK");
} catch (error) {
  span.setStatus("ERROR", error.message);
  telemetry.recordError(error);
} finally {
  span.end();
}
```

## Type Exports

The SDK re-exports all types from `@aigrc/core`:

```typescript
import type {
  RuntimeIdentity,
  GoldenThread,
  PolicyFile,
  CapabilitiesManifest,
  OperatingMode,
  Lineage,
} from "@aigos/sdk";
```

## Configuration Reference

### GovernedAgentConfig

| Option | Type | Description |
|--------|------|-------------|
| `name` | `string` | Agent name (required) |
| `version` | `string` | Semantic version |
| `controlPlane` | `string` | Control Plane URL |
| `apiKey` | `string` | API key for auth |
| `capabilities` | `Partial<CapabilitiesManifest>` | Initial capabilities |
| `policies` | `PolicyFile[]` | Initial policies |
| `mode` | `OperatingMode` | NORMAL, SANDBOX, RESTRICTED |
| `parent` | `{ instanceId, capabilities }` | Parent agent for spawn |
| `telemetry` | `boolean \| TelemetryConfig` | Enable telemetry |
| `killSwitch` | `KillSwitchConfig` | Kill switch config |
| `goldenThread` | `GoldenThread` | Business authorization |

### GuardOptions

| Option | Type | Description |
|--------|------|-------------|
| `action` | `string` | Action to check (required) |
| `resource` | `string` | Resource being accessed |
| `requireApproval` | `boolean` | Require HITL approval |
| `approvalTimeoutMs` | `number` | Approval timeout |
| `approvalFallback` | `"deny" \| "allow"` | Timeout behavior |
| `permissionCheck` | `(context) => boolean` | Custom checker |

## License

Apache-2.0

## Related Packages

- [@aigrc/core](https://www.npmjs.com/package/@aigrc/core) - Core schemas and utilities
- [@aigrc/cli](https://www.npmjs.com/package/@aigrc/cli) - Command-line tools
- [@aigrc/mcp](https://www.npmjs.com/package/@aigrc/mcp) - MCP server for AI assistants
