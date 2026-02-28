# @aigrc/sdk

> The unified SDK for building governed AI agents with the AI Governance Operating System (AIGOS)

[![npm version](https://img.shields.io/npm/v/@aigrc/sdk.svg)](https://www.npmjs.com/package/@aigrc/sdk)
[![License](https://img.shields.io/badge/license-Apache--2.0-blue.svg)](LICENSE)

## Overview

`@aigrc/sdk` provides everything you need to build AI agents with built-in governance, policy enforcement, and compliance. It integrates seamlessly with the AIGOS Control Plane for centralized management, HITL (Human-in-the-Loop) approvals, and kill switch capabilities.

### Key Features

- 🛡️ **Policy Enforcement** - Declarative permission checking with capability manifests
- 🔗 **Golden Thread Protocol** - Cryptographic linking to business authorization
- 👤 **HITL Integration** - Request human approval for sensitive operations
- ⚡ **Kill Switch** - Remote termination and control capabilities
- 🌳 **Hierarchical Agents** - Spawn child agents with capability decay
- 📊 **Telemetry** - Built-in observability and audit logging
- 🎯 **Decorator Support** - Method-level governance with `@guard`

## Installation

```bash
npm install @aigrc/sdk
# or
pnpm add @aigrc/sdk
# or
yarn add @aigrc/sdk
```

## Quick Start

### Basic Agent

```typescript
import { createGovernedAgent } from '@aigrc/sdk';

// Create a governed agent
const agent = await createGovernedAgent({
  name: 'order-processor',
  version: '1.0.0',

  // Define what this agent can do
  capabilities: {
    allowed_tools: ['database:read', 'api:orders:*'],
    denied_tools: ['admin:*'],
    max_cost_per_session: 10.00,
  },
});

// Check permission before action
const result = await agent.checkPermission('database:read', 'orders');
if (result.allowed) {
  // Perform the action
}

// Graceful shutdown
await agent.shutdown();
```

### Using the @guard Decorator

```typescript
import { createGovernedAgent, guard, setAgent } from '@aigrc/sdk';

class UserService {
  @guard({ action: 'database:read', resource: 'users' })
  async getUsers() {
    return await db.query('SELECT * FROM users');
  }

  @guard({ action: 'admin:delete', requireApproval: true })
  async deleteAllUsers() {
    // Requires HITL approval before executing
  }
}

const agent = await createGovernedAgent({ ... });
const service = new UserService();
setAgent(service, agent);

// This will check permission automatically
const users = await service.getUsers();
```

### Control Plane Integration

```typescript
const agent = await createGovernedAgent({
  name: 'production-worker',
  version: '1.0.0',

  // Connect to Control Plane
  controlPlane: 'https://cp.aigos.io',
  apiKey: process.env.AIGOS_API_KEY,

  // Enable kill switch
  killSwitch: {
    enabled: true,
    onCommand: async (cmd) => {
      console.log(`Received: ${cmd.command}`);
    },
  },

  // Enable telemetry
  telemetry: true,

  // Link to business authorization
  goldenThread: {
    ticket_id: 'JIRA-456',
    approved_by: 'security@company.com',
    approved_at: '2024-01-01T00:00:00Z',
  },
});
```

## API Reference

### `createGovernedAgent(config)`

Creates a new governed agent instance.

#### Config Options

| Option | Type | Required | Description |
|--------|------|----------|-------------|
| `name` | `string` | Yes | Agent name |
| `version` | `string` | No | Semantic version (default: "1.0.0") |
| `controlPlane` | `string` | No | Control Plane URL |
| `apiKey` | `string` | No | API key for Control Plane |
| `capabilities` | `CapabilitiesManifest` | No | Capability restrictions |
| `goldenThread` | `GoldenThread` | No | Business authorization |
| `killSwitch` | `KillSwitchConfig` | No | Kill switch settings |
| `telemetry` | `boolean \| TelemetryConfig` | No | Telemetry settings |
| `mode` | `OperatingMode` | No | Operating mode |
| `parent` | `ParentConfig` | No | Parent agent for spawning |

#### CapabilitiesManifest

```typescript
interface CapabilitiesManifest {
  allowed_tools: string[];      // Actions agent can perform
  denied_tools: string[];       // Explicitly denied actions
  allowed_domains: string[];    // Allowed network domains
  denied_domains: string[];     // Blocked network domains
  may_spawn_children: boolean;  // Can spawn child agents
  max_child_depth: number;      // Maximum spawn depth
  capability_mode: 'decay' | 'inherit' | 'explicit';
  max_cost_per_session?: number;
  max_cost_per_day?: number;
  max_tokens_per_call?: number;
}
```

### `guard(options)`

Decorator for method-level governance.

```typescript
@guard({
  action: 'database:read',      // Required: action to check
  resource: 'users/${userId}',  // Optional: resource (supports interpolation)
  requireApproval: false,       // Optional: require HITL approval
  fallback: 'deny',             // Optional: behavior when offline
})
```

### `setAgent(instance, agent)`

Attaches a governed agent to a class instance.

```typescript
const service = new MyService();
setAgent(service, agent);
```

### `getAgent(instance)`

Retrieves the governed agent from a class instance.

```typescript
const agent = getAgent(service);
```

### `withGuard(fn, agent, options)`

Functional wrapper for governance (non-decorator alternative).

```typescript
const guardedFn = withGuard(
  myFunction,
  agent,
  { action: 'database:read' }
);
```

## Capability Decay

When spawning child agents, capabilities decay based on the `capability_mode`:

### Decay Mode (Default)
- Numeric limits reduced by 20% per generation
- Tools inherited from parent
- Spawn depth limited by `max_child_depth`

### Inherit Mode
- Full capability inheritance
- Same limits as parent

### Explicit Mode
- Child must specify all capabilities
- No automatic inheritance

```typescript
// Parent with $100 cost limit
const parent = await createGovernedAgent({
  capabilities: {
    may_spawn_children: true,
    max_child_depth: 3,
    capability_mode: 'decay',
    max_cost_per_session: 100,
  },
});

// Child gets $80 limit (100 * 0.8)
const child = await parent.spawn({ name: 'child' });

// Grandchild gets $64 limit (80 * 0.8)
const grandchild = await child.spawn({ name: 'grandchild' });
```

## Golden Thread Protocol

The Golden Thread creates an unbroken link from runtime actions to business authorization:

```
┌─────────────────────┐
│   Business Request  │  ← Jira/ServiceNow ticket
└──────────┬──────────┘
           │
┌──────────▼──────────┐
│  Security Approval  │  ← approved_by, approved_at
└──────────┬──────────┘
           │
┌──────────▼──────────┐
│   Agent Instance    │  ← instance_id, golden_thread_hash
└──────────┬──────────┘
           │
┌──────────▼──────────┐
│   Runtime Actions   │  ← Audit log with full traceability
└─────────────────────┘
```

```typescript
const agent = await createGovernedAgent({
  goldenThread: {
    ticket_id: 'JIRA-123',
    approved_by: 'security@company.com',
    approved_at: '2024-01-01T00:00:00Z',
    signature: 'sha256:...',  // Optional cryptographic signature
  },
});
```

## HITL (Human-in-the-Loop)

Request human approval for sensitive operations:

```typescript
const approval = await agent.requestApproval({
  action: 'database:delete',
  resource: 'production/users',
  reason: 'Quarterly cleanup of inactive accounts',
  context: {
    affected_records: 5000,
    reversible: true,
  },
  timeout: 300000,  // 5 minutes
  fallback: 'deny', // Deny if offline/timeout
});

if (approval.approved) {
  // Proceed with operation
} else {
  // Handle denial
}
```

## Kill Switch

The kill switch provides remote control capabilities:

```typescript
const agent = await createGovernedAgent({
  killSwitch: {
    enabled: true,
    onCommand: async (command) => {
      switch (command.command) {
        case 'pause':
          // Agent paused, checkPermission returns false
          break;
        case 'resume':
          // Agent resumed
          break;
        case 'terminate':
          // Agent shutting down
          break;
        case 'restart':
          // Trigger restart logic
          break;
      }
    },
  },
});
```

## Operating Modes

| Mode | Description |
|------|-------------|
| `NORMAL` | Standard operation with full capabilities |
| `SANDBOX` | Isolated sandbox mode for testing/development |
| `RESTRICTED` | Restricted mode with limited capabilities |

## Examples

See the `examples/` directory for complete examples:

- `basic-agent.ts` - Simple agent with permission checking
- `guard-decorator.ts` - Using @guard for method-level governance
- `child-spawning.ts` - Hierarchical agents with capability decay
- `golden-thread.ts` - Golden Thread Protocol integration
- `langchain-integration.ts` - LangChain agent governance
- `control-plane-integration.ts` - Full Control Plane integration

Run examples with:

```bash
npx tsx examples/basic-agent.ts
```

## License

Apache-2.0 - See [LICENSE](LICENSE) for details.

## Related Packages

- `@aigrc/core` - Core schemas and types
- `@aigrc/cli` - Command-line interface
- `@aigrc/mcp` - Model Context Protocol server

## Support

- 📖 [Documentation](https://docs.aigos.dev)
- 💬 [Discord Community](https://discord.gg/aigos)
- 🐛 [Issue Tracker](https://github.com/aigrc/aigrc/issues)
