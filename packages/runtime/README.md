# @aigos/runtime

Runtime Governance Layer for AIGOS - Runtime identity, policy enforcement, kill switch, and agent-to-agent authentication.

## Installation

```bash
npm install @aigos/runtime
# or
pnpm add @aigos/runtime
```

## Features

- **Runtime Identity** - Cryptographic identity for AI agents (SPEC-RT-002)
- **Policy Engine** - Capability-based access control (SPEC-RT-003)
- **Kill Switch** - Remote termination and pause control (SPEC-RT-005)
- **Capability Decay** - Automatic capability reduction for child agents (SPEC-RT-006)
- **A2A Authentication** - JWT-based agent-to-agent mutual auth (SPEC-PRT-003)
- **License Validation** - Commercial license management (AIG-11)
- **Telemetry** - OpenTelemetry-based observability

## Quick Start

```typescript
import {
  createRuntimeIdentity,
  createRuntimeContext,
  createKillSwitch,
  createPolicyEngine,
} from "@aigos/runtime";

// 1. Create an asset card (from @aigrc/core)
const assetCard = {
  id: "aigrc-2024-a1b2c3d4",
  name: "My AI Agent",
  version: "1.0.0",
  // ... other required fields
};

// 2. Create runtime identity
const { identity } = createRuntimeIdentity({
  assetCard,
  capabilities: {
    allowed_tools: ["search_*", "read_*"],
    denied_tools: ["delete_*", "admin_*"],
    may_spawn_children: true,
    max_child_depth: 2,
  },
});

// 3. Create policy engine for access control
const policy = createPolicyEngine({
  capabilities: identity.capabilities_manifest,
});

// 4. Check permissions before actions
const result = policy.checkPermissionSync({
  action: "search_documents",
  resource: "/docs",
});

if (result.allowed) {
  // Proceed with action
}
```

## Core APIs

### Runtime Identity

Create and manage cryptographic identities for AI agents.

```typescript
import { createRuntimeIdentity } from "@aigos/runtime";

const { identity, verified } = createRuntimeIdentity({
  assetCard,
  capabilities: {
    allowed_tools: ["*"],
    denied_tools: ["admin_*"],
    may_spawn_children: false,
  },
});

// Identity includes:
// - instance_id: UUID for this runtime instance
// - asset_id: From asset card
// - golden_thread_hash: SHA-256 hash of authorization
// - capabilities_manifest: Permissions
// - lineage: Parent/child relationships
// - mode: NORMAL | SANDBOX | RESTRICTED
```

### Policy Engine

Capability-based access control with wildcard matching.

```typescript
import { createPolicyEngine } from "@aigos/runtime";

const engine = createPolicyEngine({
  capabilities: identity.capabilities_manifest,
  killSwitchActive: false,
  dryRun: false,
});

// Synchronous check (< 2ms P99)
const result = engine.checkPermissionSync({
  action: "read_file",
  resource: "/data/config.json",
});

// Result structure:
// {
//   allowed: boolean,
//   reason?: string,
//   deniedBy?: "kill_switch" | "capability" | "resource" | "budget",
//   evaluationTimeMs: number,
//   dryRun: boolean,
// }

// Async check with custom checks
const asyncResult = await engine.checkPermission({
  action: "api_call",
  resource: "https://api.example.com",
  estimatedCost: 0.01,
});

// Budget tracking
engine.recordCost(0.01);
const budget = engine.getBudgetStatus();
```

### Kill Switch

Remote termination and pause control for agents.

```typescript
import {
  createKillSwitch,
  createKillSwitchCommand,
  clearProcessedCommands,
} from "@aigos/runtime";

const killSwitch = createKillSwitch(identity, {
  channel: "polling", // "sse" | "polling" | "file"
  endpoint: "https://kill-switch.example.com",
  requireSignature: true, // Require signed commands in production
});

// Check if agent should continue
if (!killSwitch.shouldContinue()) {
  // Agent is paused or terminated
  return;
}

// Process commands
const command = createKillSwitchCommand("PAUSE", {
  reason: "Scheduled maintenance",
  issuedBy: "admin@example.com",
});

await killSwitch.processCommand(command);

// States: ACTIVE | PAUSED | TERMINATED
console.log(killSwitch.state);
```

### Capability Decay

Automatic capability reduction when spawning child agents.

```typescript
import {
  createCapabilityDecay,
  extractParentCapabilities,
} from "@aigos/runtime";

const decay = createCapabilityDecay({
  budgetDecayFactor: 0.5, // Children get 50% of parent's budget
  depthDecayFactor: 0.8, // Depth reduction factor
});

const parentCaps = extractParentCapabilities(parentIdentity);
const childCaps = decay.applyDecay(parentCaps, "decay");

// childCaps will have:
// - Same allowed_tools (filtered)
// - Reduced max_cost_per_session
// - Reduced max_child_depth
```

### A2A Authentication

JWT-based agent-to-agent authentication.

```typescript
import {
  createGovernanceTokenGenerator,
  createGovernanceTokenValidator,
  generateES256KeyPair,
} from "@aigos/runtime";

// Generate key pair
const { privateKey, publicKey, keyId } = await generateES256KeyPair();

// Create token generator
const generator = createGovernanceTokenGenerator({
  privateKey,
  publicKey,
  keyId,
  issuer: "aigos-runtime",
});

// Generate token for A2A calls
const tokenInput = {
  identity,
  goldenThread: {
    hash: identity.golden_thread_hash,
    verified: true,
    ticket_id: identity.golden_thread.ticket_id,
  },
  mode: identity.mode,
  killSwitch: { enabled: true, channel: "sse" },
  capabilities: {
    hash: "sha256:...",
    tools: identity.capabilities_manifest.allowed_tools,
    maxBudgetUsd: 100,
    canSpawn: true,
    maxChildDepth: 2,
  },
};

const { token, expiresAt } = await generator.generate(tokenInput, {
  audience: "target-agent",
  ttlSeconds: 300,
});

// Validate incoming tokens
const validator = createGovernanceTokenValidator();
validator.addPublicKey(keyId, publicKey);

const result = await validator.validate(token);
if (result.valid) {
  const claims = result.payload.aigos;
  // Access identity, governance, capabilities claims
}
```

### Runtime Context

Unified context for all runtime components.

```typescript
import { createRuntimeContext } from "@aigos/runtime";

const context = createRuntimeContext({
  identity,
  killSwitch: {
    channel: "polling",
    endpoint: "https://kill-switch.example.com",
    requireSignature: false,
  },
});

// Check actions via context
const result = context.checkAction("read_file", "/data/file.txt");

// Access components
context.identity; // RuntimeIdentity
context.killSwitch?.shouldContinue(); // boolean
```

### License Validation

Commercial license management with feature gating.

```typescript
import {
  createLicenseManager,
  FeatureGate,
  LimitEnforcer,
} from "@aigos/runtime";

const manager = createLicenseManager({
  allowOffline: true,
  refreshIntervalMs: 3600000, // 1 hour
});

// Initialize with license token
await manager.initialize(licenseToken);

// Check features
const featureResult = manager.isFeatureAllowed("kill_switch");
if (!featureResult.allowed) {
  console.log(`Feature requires: ${featureResult.requiredTier}`);
}

// Check limits
manager.updateUsage({ agents: 5, assets: 10 });
const limitResult = manager.checkLimit("maxAgents");
if (!limitResult.withinLimit) {
  console.log(`Limit exceeded: ${limitResult.current}/${limitResult.limit}`);
}

// Standalone feature gate
const gate = new FeatureGate();
gate.isFeatureAllowed("asset_cards"); // { allowed: true, tier: "community" }

// Standalone limit enforcer
const enforcer = new LimitEnforcer();
enforcer.updateUsage({ agents: 3 });
enforcer.canAdd("maxAgents"); // { withinLimit: true, ... }
```

### Telemetry

OpenTelemetry-based observability.

```typescript
import { createTelemetryEmitter } from "@aigos/runtime";

const emitter = createTelemetryEmitter({
  serviceName: "my-agent",
  endpoint: "https://otel-collector.example.com",
});

// Emit policy decisions
emitter.emitDecision({
  instance_id: identity.instance_id,
  action: "read_file",
  resource: "/data/file.txt",
  effect: "allow",
  matched_rule: "allow-read",
  duration_ms: 1.5,
});

// Emit identity events
emitter.emitIdentity({
  event: "created",
  identity,
});

// Emit violations
emitter.emitViolation({
  instance_id: identity.instance_id,
  type: "capability",
  action: "admin_delete",
  resource: "/system",
  details: "Action denied by capability manifest",
});
```

## TypeScript Types

All types are exported for use in your TypeScript projects:

```typescript
import type {
  RuntimeIdentity,
  CapabilitiesManifest,
  Lineage,
  IPolicyEngine,
  PermissionRequest,
  PermissionResult,
  IKillSwitch,
  KillSwitchState,
  IGovernanceTokenGenerator,
  IGovernanceTokenValidator,
  TokenValidationResult,
  LicenseManager,
  FeatureGateResult,
  LimitCheckResult,
} from "@aigos/runtime";
```

## Performance

The runtime is optimized for low-latency operation:

- **Policy checks**: < 2ms P99 latency
- **Identity creation**: > 1000 ops/sec
- **Golden Thread hash**: > 10,000 ops/sec
- **Capability decay**: > 10,000 ops/sec

## License

MIT
