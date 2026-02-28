# @aigrc/runtime

Runtime Governance System for AI Agents - Identity Manager, Policy Engine ("The Bouncer"), and Runtime Controls.

## Features

- **Identity Manager** (SPEC-RT-002): Cryptographic identity establishment with Golden Thread verification
- **Policy Engine** (SPEC-RT-003): Real-time permission evaluation with <2ms P99 latency target
- **Guard Decorator**: TypeScript decorator for protecting functions with governance checks
- **Capability Decay**: Child agents inherit restricted capabilities from parents
- **Mode Management**: NORMAL, SANDBOX, and RESTRICTED operating modes

## Installation

```bash
pnpm add @aigrc/runtime
```

## Quick Start

```typescript
import {
  createIdentityManager,
  createPolicyEngine,
  configureGuard,
  guard,
} from '@aigrc/runtime';

// Create managers
const identityManager = createIdentityManager({
  maxSpawnDepth: 5,
  verificationFailureMode: 'SANDBOX', // or 'FAIL'
});

const policyEngine = createPolicyEngine({
  dryRun: false, // Set true to log without enforcing
});

// Create identity for your agent
const identity = await identityManager.createIdentity({
  assetCardPath: '.aigrc/cards/my-agent.yaml',
});

// Configure guards
configureGuard({
  identityProvider: () => identity,
  policyChecker: async (id, ctx) => {
    const decision = policyEngine.checkPermissionSync(id, ctx.action, ctx.resource);
    return { allowed: decision.allowed, reason: decision.reason };
  },
});

// Use guards on agent methods
class MyAgent {
  @guard('call_api')
  async callExternalAPI(url: string) {
    return fetch(url);
  }

  @guard('read_file', { resource: (args) => args[0] })
  async readFile(path: string) {
    // Resource is extracted from first argument
    return fs.readFile(path);
  }
}
```

## Identity Manager

The Identity Manager establishes cryptographic identity for AI agents at runtime:

```typescript
const identityManager = createIdentityManager({
  maxSpawnDepth: 5,
  verificationFailureMode: 'SANDBOX', // or 'FAIL'
  telemetryEnabled: true,
});

// Create root identity
const identity = await identityManager.createIdentity({
  assetCardPath: '.aigrc/cards/my-agent.yaml',
});

console.log(identity.instance_id);  // UUID
console.log(identity.verified);     // true if Golden Thread verified
console.log(identity.mode);         // 'NORMAL', 'SANDBOX', or 'RESTRICTED'

// Spawn child agent (with capability decay)
const childIdentity = await identityManager.spawnChild(identity, {
  assetCardPath: '.aigrc/cards/child-agent.yaml',
});

// Request mode transition
const result = await identityManager.requestModeTransition(identity, {
  targetMode: 'RESTRICTED',
  reason: 'Entering maintenance mode',
});
```

## Policy Engine

The Policy Engine evaluates permissions with short-circuit evaluation:

```typescript
const policyEngine = createPolicyEngine({
  dryRun: false,
  defaultAllow: false,
});

// Check permission
const decision = await policyEngine.checkPermission(
  identity,
  'call_api',        // action
  'api.example.com', // resource (optional)
  { cost: 0.01 }     // context (optional)
);

if (!decision.allowed) {
  console.log(`Denied by: ${decision.denied_by}`);
  console.log(`Reason: ${decision.reason}`);
}

// Record cost for budget tracking
policyEngine.recordCost(identity.instance_id, 0.05);

// Register custom check
policyEngine.registerCustomCheck('pii-check', (identity, action, resource) => {
  if (resource?.includes('pii')) {
    return {
      allowed: false,
      code: 'PII_ACCESS',
      reason: 'PII access requires explicit approval',
    };
  }
  return null; // Passed
});

// Kill switch integration
policyEngine.updateKillSwitch('TERMINATE', { instanceId: 'some-agent-id' });
policyEngine.updateKillSwitch('PAUSE', { assetId: 'dangerous-agent' });
```

## Guard Decorator

Protect functions with policy checks:

```typescript
import { guard, guardAsync, checkGuard } from '@aigrc/runtime';

// Using decorator
class MyAgent {
  @guard('expensive_operation', {
    metadata: { cost_tier: 'high' },
  })
  async runExpensiveOperation() {
    // Only executes if allowed
  }
}

// Functional style
const protectedFetch = guardAsync('fetch', async (url: string) => {
  return fetch(url);
}, { resource: (args) => args[0] });

// Manual check
const result = await checkGuard('dangerous_action', {
  resource: 'sensitive-data',
});
if (!result.allowed) {
  console.error(`Action denied: ${result.reason}`);
}
```

## Evaluation Chain

The Policy Engine evaluates in this order (short-circuit on denial):

1. **Kill Switch** [O(1)] - Check if agent is terminated/paused
2. **Mode Check** [O(1)] - RESTRICTED mode limits actions
3. **Capability** [O(n)] - Check allowed/denied tools
4. **Resource Deny** [O(n)] - Check denied domains
5. **Resource Allow** [O(n)] - Check allowed domains
6. **Budget** [O(1)] - Check cost limits
7. **Custom Checks** [O(k)] - User-defined checks

## Events

Subscribe to events for telemetry and monitoring:

```typescript
identityManager.onEvent((event) => {
  switch (event.type) {
    case 'identity.created':
      console.log(`Agent ${event.identity.instance_id} started`);
      break;
    case 'identity.mode_changed':
      console.log(`Mode: ${event.from} -> ${event.to}`);
      break;
  }
});

policyEngine.onEvent((event) => {
  if (event.type === 'policy.denied') {
    console.log(`Denied: ${event.action} - ${event.decision.reason}`);
  }
});
```

## License

Apache-2.0
