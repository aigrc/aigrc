# @aigos/runtime Examples

This directory contains example code demonstrating how to use the `@aigos/runtime` package.

## Examples

### 1. Basic Agent (`basic-agent.ts`)

A simple example showing how to create an AI agent with:
- Runtime identity creation
- Policy-based access control
- Kill switch integration

```bash
npx ts-node examples/basic-agent.ts
```

### 2. A2A Authentication (`a2a-authentication.ts`)

Demonstrates secure agent-to-agent communication using:
- JWT-based governance tokens
- Key pair generation
- Token generation and validation
- Validation failure handling

```bash
npx ts-node examples/a2a-authentication.ts
```

### 3. Capability Decay (`capability-decay.ts`)

Shows how capabilities are automatically reduced when spawning child agents:
- Parent-child agent relationships
- Automatic budget reduction
- Depth-based capability decay
- Lineage tracking

```bash
npx ts-node examples/capability-decay.ts
```

### 4. License Gating (`license-gating.ts`)

Demonstrates the license validation system:
- Feature gating by tier
- Usage limit enforcement
- License manager integration
- Tier comparison

```bash
npx ts-node examples/license-gating.ts
```

## Running Examples

1. Make sure you have the package built:

```bash
cd packages/runtime
pnpm build
```

2. Run an example:

```bash
npx ts-node examples/<example-name>.ts
```

Or compile and run:

```bash
npx tsc examples/<example-name>.ts --outDir dist-examples
node dist-examples/<example-name>.js
```

## Prerequisites

- Node.js 18+
- TypeScript 5+
- `@aigos/runtime` and `@aigrc/core` packages installed

## Example Output

### Basic Agent

```
🚀 Starting Document Search Agent...

✅ Identity created:
   Instance ID: a1b2c3d4-...
   Asset ID: aigrc-2024-a1b2c3d4
   Risk Level: limited
   Mode: NORMAL
   Golden Thread Verified: true

✅ Kill switch initialized
   State: ACTIVE

📋 Simulating agent operations...

✅ ALLOWED: search_documents on /docs
❌ DENIED: delete_file on /docs/report.pdf
   Reason: Action "delete_file" is in denied_tools
   Denied by: capability
```

### A2A Authentication

```
🔐 A2A Authentication Example

📋 Setting up Agent A (Requester)...
✅ Agent A initialized: Research Agent

📋 Setting up Agent B (Receiver)...
✅ Agent B initialized: Data Analysis Agent

🤝 Performing A2A Handshake...
1️⃣  Agent A generates governance token...
2️⃣  Agent A sends request to Agent B...
3️⃣  Agent B validates the token...
   ✅ Token is VALID!
```

## Learn More

- [API Documentation](../README.md)
- [Migration Guide](../MIGRATION.md)
- [AIGOS Specifications](https://github.com/pangolabs/aigos)
