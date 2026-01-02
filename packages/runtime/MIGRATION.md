# Migration Guide

This guide helps you upgrade between versions of `@aigos/runtime`.

## Migrating to v0.2.0

### Breaking Changes

#### 1. Policy Engine API Changes

The `createPolicyEngine` function no longer accepts `defaultEffect` or `rules` options. Instead, use capability-based access control:

**Before (v0.1.x):**
```typescript
const engine = createPolicyEngine({
  defaultEffect: "deny",
  rules: [
    { id: "allow-read", effect: "allow", actions: ["read_*"], resources: ["*"] },
  ],
  capabilities: identity.capabilities_manifest,
});
```

**After (v0.2.0):**
```typescript
const engine = createPolicyEngine({
  capabilities: {
    ...identity.capabilities_manifest,
    allowed_tools: ["read_*"],
    denied_tools: ["admin_*"],
  },
});
```

The policy engine now uses `capabilities.allowed_tools` and `capabilities.denied_tools` for access control. The behavior is:
- If `allowed_tools` is non-empty, only matching actions are allowed
- If `allowed_tools` is empty, all actions are allowed (unless in `denied_tools`)
- Actions in `denied_tools` are always denied

#### 2. checkPermissionSync Signature

The `checkPermissionSync` method now requires a `PermissionRequest` object:

**Before (v0.1.x):**
```typescript
const result = engine.checkPermissionSync("read_file");
```

**After (v0.2.0):**
```typescript
const result = engine.checkPermissionSync({
  action: "read_file",
  resource: "*",
});
```

#### 3. Golden Thread Hash Functions

Hash functions return objects, not just strings:

**Before (v0.1.x):**
```typescript
const hash = computeGoldenThreadHashSync(goldenThread);
const isValid = verifyGoldenThreadHashSync(goldenThread, hash);
```

**After (v0.2.0):**
```typescript
import { computeGoldenThreadHashSync, verifyGoldenThreadHashSync } from "@aigrc/core";

const { hash, canonical_string } = computeGoldenThreadHashSync(goldenThread);
const { verified, computed, expected } = verifyGoldenThreadHashSync(goldenThread, hash);
```

Note: These functions are now in `@aigrc/core`, not `@aigos/runtime`.

#### 4. Capability Manager Replaced

The `createCapabilityManager` function has been replaced with `createCapabilityDecay` and `extractParentCapabilities`:

**Before (v0.1.x):**
```typescript
const manager = createCapabilityManager(identity);
const childCaps = manager.deriveChildCapabilities();
```

**After (v0.2.0):**
```typescript
import { createCapabilityDecay, extractParentCapabilities } from "@aigos/runtime";

const decay = createCapabilityDecay();
const parentCaps = extractParentCapabilities(identity);
const childCaps = decay.applyDecay(parentCaps, "decay");
```

#### 5. A2A Token Generation

Token generation now uses `createGovernanceTokenGenerator` with explicit key configuration:

**Before (v0.1.x):**
```typescript
const generator = createGovernanceToken({
  privateKey,
  keyId: "test-key",
  issuer: "aigos-runtime",
  audience: "aigos-agents",
});

const token = await generator.generate(identity);
```

**After (v0.2.0):**
```typescript
import { createGovernanceTokenGenerator, generateES256KeyPair } from "@aigos/runtime";

const { privateKey, publicKey, keyId } = await generateES256KeyPair();

const generator = createGovernanceTokenGenerator({
  privateKey,
  publicKey,
  keyId,
  issuer: "aigos-runtime",
});

const tokenInput = {
  identity,
  goldenThread: {
    hash: identity.golden_thread_hash,
    verified: identity.verified,
    ticket_id: identity.golden_thread.ticket_id,
  },
  mode: identity.mode,
  killSwitch: { enabled: true, channel: "sse" },
  capabilities: {
    hash: "sha256:...",
    tools: identity.capabilities_manifest.allowed_tools,
    maxBudgetUsd: null,
    canSpawn: identity.capabilities_manifest.may_spawn_children,
    maxChildDepth: identity.capabilities_manifest.max_child_depth,
  },
};

const { token, payload, expiresAt } = await generator.generate(tokenInput, {
  audience: "aigos-agents",
});
```

#### 6. Token Validation Result

Token validation returns an `error` object, not an `errors` array:

**Before (v0.1.x):**
```typescript
const result = await validator.validate(token);
if (!result.valid) {
  console.log(result.errors); // string[]
}
```

**After (v0.2.0):**
```typescript
const result = await validator.validate(token);
if (!result.valid) {
  console.log(result.error?.code);    // TokenValidationErrorCode
  console.log(result.error?.message); // string
}
```

### New Features in v0.2.0

#### License Validation

New license validation module for commercial deployments:

```typescript
import { createLicenseManager, FeatureGate, LimitEnforcer } from "@aigos/runtime";

const manager = createLicenseManager({
  allowOffline: true,
});

await manager.initialize(licenseToken);

// Feature gating
if (manager.isFeatureAllowed("kill_switch").allowed) {
  // Enable kill switch features
}

// Limit enforcement
manager.updateUsage({ agents: 5 });
if (!manager.canAdd("maxAgents").withinLimit) {
  throw new Error("Agent limit exceeded");
}
```

#### Improved Telemetry

Enhanced telemetry with specific event types:

```typescript
import { createTelemetryEmitter } from "@aigos/runtime";

const emitter = createTelemetryEmitter({ serviceName: "my-agent" });

// Specific event types
emitter.emitDecision({ ... });
emitter.emitIdentity({ ... });
emitter.emitViolation({ ... });
emitter.emitKillSwitch({ ... });
```

#### Runtime Context

New unified context for all runtime components:

```typescript
import { createRuntimeContext } from "@aigos/runtime";

const context = createRuntimeContext({
  identity,
  killSwitch: { channel: "polling", endpoint: "..." },
});

// Unified action checking
const result = context.checkAction("read_file", "/path");
```

### Deprecated Features

The following features are deprecated and will be removed in v0.3.0:

- `evaluate()` method on policy engine (use `checkPermissionSync()`)
- `defaultEffect` option in `createPolicyEngine()`
- `rules` option in `createPolicyEngine()`

### Import Changes

Some exports have moved packages:

| Export | Old Location | New Location |
|--------|--------------|--------------|
| `computeGoldenThreadHashSync` | `@aigos/runtime` | `@aigrc/core` |
| `verifyGoldenThreadHashSync` | `@aigos/runtime` | `@aigrc/core` |
| `PolicyFileSchema` | `@aigos/runtime` | `@aigrc/core` |
| `KillSwitchCommandSchema` | `@aigos/runtime` | `@aigrc/core` |
| `RuntimeIdentitySchema` | `@aigos/runtime` | `@aigrc/core` |

Update your imports:

```typescript
// Before
import { computeGoldenThreadHashSync, PolicyFileSchema } from "@aigos/runtime";

// After
import { computeGoldenThreadHashSync, PolicyFileSchema } from "@aigrc/core";
```

## Getting Help

If you encounter issues during migration:

1. Check the [API documentation](./README.md)
2. Review the [examples](./examples/)
3. Open an issue on GitHub
