# Certified Governed Agent (CGA) Guide

## Overview

The Certified Governed Agent (CGA) system provides a trust framework for AI agents operating in enterprise and multi-agent environments. Similar to how SSL/TLS certificates establish trust between web servers and browsers, CGA certificates establish trust between AI agents.

## Why CGA?

In multi-agent systems and enterprise deployments, you need to answer critical questions:

- **Identity**: Can I trust this agent is who it claims to be?
- **Governance**: Does this agent follow appropriate governance policies?
- **Kill Switch**: Can I stop this agent if something goes wrong?
- **Compliance**: Does this agent meet regulatory requirements?

CGA certificates provide cryptographically verifiable answers to these questions.

## Certification Levels

CGA defines four certification levels, each building on the previous:

| Level | Description | Validity | Use Case |
|-------|-------------|----------|----------|
| **BRONZE** | Basic governance | 30 days | Development, internal tools |
| **SILVER** | Kill switch verified | 90 days | Production, controlled environments |
| **GOLD** | Compliance mapped | 180 days | Enterprise, regulated industries |
| **PLATINUM** | Full governance + audit | 365 days | Critical systems, financial services |

### BRONZE Requirements
- Valid asset card with governance metadata
- Golden Thread hash computed
- Kill switch endpoint declared

### SILVER Requirements
- All BRONZE requirements
- Kill switch live test passed (< 60s response)
- Policy engine in STRICT mode
- Telemetry configured

### GOLD Requirements
- All SILVER requirements
- Compliance framework mapped (EU AI Act, NIST, etc.)
- Capability boundaries enforced
- Audit trail enabled

### PLATINUM Requirements
- All GOLD requirements
- Manual review completed by CGA auditor
- Continuous monitoring active
- Incident response plan documented

## Quick Start

### 1. Ensure Your Agent Has an Asset Card

```yaml
# .aigrc/cards/my-agent.asset.yaml
id: aigrc-2024-abc12345
name: My Customer Support Agent
version: "1.0.0"
created: "2024-01-15T10:00:00Z"
updated: "2024-01-15T10:00:00Z"

ownership:
  owner:
    name: John Smith
    email: john@example.com
    role: AI Engineer

technical:
  type: agent
  framework: langchain
  components:
    - type: llm
      provider: anthropic
      model: claude-3-opus

classification:
  riskLevel: moderate
  riskFactors:
    autonomousDecisions: true
    customerFacing: true
    toolExecution: true
    externalDataAccess: false
    piiProcessing: false
    highStakesDecisions: false

intent:
  purpose: Customer support automation
  operator: Customer Success Team
  businessContext: Handle tier-1 support tickets

governance:
  status: approved
  approvals:
    - name: CISO
      role: Security Approval
      date: "2024-01-14T15:30:00Z"
      email: ciso@example.com
```

### 2. Add Golden Thread (Optional but Recommended)

```yaml
# Add to asset card
golden_thread:
  ticket_id: JIRA-1234
  approved_by: ciso@example.com
  approved_at: "2024-01-14T15:30:00Z"
```

### 3. Run Certification

```bash
# Basic certification (BRONZE)
aigrc certify .aigrc/cards/my-agent.asset.yaml

# Target a specific level
aigrc certify -l SILVER .aigrc/cards/my-agent.asset.yaml

# Dry run (verify without generating certificate)
aigrc certify --dry-run -l GOLD .aigrc/cards/my-agent.asset.yaml

# Output as JSON
aigrc certify -o json .aigrc/cards/my-agent.asset.yaml

# Output as SARIF (for IDE integration)
aigrc certify -o sarif --output-file report.sarif .aigrc/cards/my-agent.asset.yaml
```

### 4. Review Results

On success, the CLI will:
1. Display verification results for each check
2. Generate a certificate file in `.aigrc/certificates/`
3. Return exit code 0

On failure, the CLI will:
1. Display which checks failed
2. Provide guidance on how to fix issues
3. Return exit code 3

## CLI Reference

```
aigrc certify [options] [asset-card]

Arguments:
  asset-card                  Path to agent asset card

Options:
  -l, --level <level>         Target certification level (BRONZE, SILVER, GOLD, PLATINUM)
  -o, --output <format>       Output format (text, json, sarif)
  -c, --config <path>         Path to runtime config file
  --output-file <path>        Write output to file instead of stdout
  --dry-run                   Verify only, do not generate certificate
  -v, --verbose               Show detailed check output
  --organization-id <id>      Organization ID for certificate
  --organization-name <name>  Organization name for certificate
  -h, --help                  Display help
```

## Verification Checks

The CGA verification engine performs the following checks:

### Identity Checks
- `identity.asset_card_valid` - Validates asset card schema
- `identity.golden_thread_hash` - Verifies Golden Thread cryptographic hash

### Kill Switch Checks
- `kill_switch.endpoint_declared` - Verifies kill switch endpoint is configured
- `kill_switch.live_test` - Performs live test of kill switch (SILVER+)

### Policy Engine Checks
- `policy_engine.strict_mode` - Verifies policy engine is in STRICT mode (SILVER+)

### Compliance Checks
- `compliance.framework_mapped` - Verifies compliance framework mapping (GOLD+)

## Certificate Format

CGA certificates follow a standard YAML format:

```yaml
apiVersion: aigos.io/v1
kind: CGACertificate
metadata:
  id: cga-20240115-my-agent-bronze
  version: 1
  schema_version: "1.0.0"
spec:
  agent:
    id: my-agent
    version: "1.0.0"
    organization:
      id: example-org
      name: Example Organization
    golden_thread:
      hash: sha256:abc123...
      algorithm: SHA-256
  certification:
    level: BRONZE
    issuer:
      id: example-org
      name: Example Organization
    issued_at: "2024-01-15T10:00:00Z"
    expires_at: "2024-02-14T10:00:00Z"
    renewal:
      auto_renew: false
      grace_period_days: 14
  governance:
    kill_switch:
      status: VERIFIED
      verified_at: "2024-01-15T10:00:00Z"
    policy_engine:
      status: VERIFIED
      verified_at: "2024-01-15T10:00:00Z"
    golden_thread:
      status: VERIFIED
      verified_at: "2024-01-15T10:00:00Z"
signature:
  algorithm: ES256
  key_id: self-signed-key-1
  value: BASE64_ENCODED_SIGNATURE
```

## A2A Trust Integration

CGA certificates are designed to work with the A2A (Agent-to-Agent) protocol for mutual authentication:

```typescript
import { cga } from '@aigrc/core';

// Create trust policy
const policy: cga.A2ATrustPolicy = {
  minimum_level: 'SILVER',
  action_requirements: {
    'file:write': { minimum_level: 'GOLD' },
    'network:external': { minimum_level: 'SILVER' },
  },
  trusted_cas: [
    { issuer_id: 'cga.aigos.io', public_key: '...' }
  ],
};

// Evaluate trust for incoming request
const evaluator = new cga.TrustPolicyEvaluator(policy);
const result = evaluator.evaluate(incomingAgentClaims, requestedAction);

if (result.allowed) {
  // Proceed with request
} else {
  // Deny with reason
  console.log(`Denied: ${result.reason}`);
}
```

## Middleware Integration

For HTTP-based agent communication, use the A2A middleware:

```typescript
import express from 'express';
import { cga } from '@aigrc/core';

const app = express();

// Add CGA verification middleware
app.use(cga.createA2AMiddleware({
  trustPolicy: {
    minimum_level: 'BRONZE',
    action_requirements: {},
  },
  // Optional: Custom token verifier
  verifier: new cga.CGATokenVerifier({
    trustedIssuers: ['cga.aigos.io', 'self-signed'],
    publicKeys: { /* ... */ },
  }),
}));

// Protected routes
app.post('/api/agent-action', (req, res) => {
  // req.cgaVerified contains verification result
  const { claims, level } = req.cgaVerified;
  // ...
});
```

## Programmatic API

### Verification Engine

```typescript
import { cga } from '@aigrc/core';

const engine = new cga.VerificationEngine();

const report = await engine.verify({
  assetCardPath: './my-agent.asset.yaml',
  targetLevel: 'SILVER',
  runtimeConfig: {
    kill_switch: {
      endpoint: 'https://control.example.com/kill',
      timeout_ms: 5000,
    },
  },
});

console.log(`Achieved: ${report.achieved_level}`);
console.log(`Passed: ${report.summary.passed}/${report.summary.total}`);
```

### Certificate Generator

```typescript
import { cga } from '@aigrc/core';

const generator = new cga.CertificateGenerator({
  organizationId: 'my-org',
  organizationName: 'My Organization',
  privateKey: process.env.CGA_PRIVATE_KEY,
  keyId: 'prod-key-1',
});

const certificate = await generator.generate(
  verificationReport,
  'my-agent-id',
  '1.0.0',
  goldenThreadHash
);
```

### Token Operations

```typescript
import { cga } from '@aigrc/core';

// Generate token for A2A communication
const tokenGenerator = new cga.CGATokenGenerator({
  privateKey: process.env.CGA_PRIVATE_KEY,
  keyId: 'prod-key-1',
  issuer: 'my-org',
});

const token = await tokenGenerator.generate({
  agent_id: 'my-agent',
  instance_id: '550e8400-e29b-41d4-a716-446655440000',
  level: 'SILVER',
  // ... other claims
});

// Verify incoming token
const tokenVerifier = new cga.CGATokenVerifier({
  trustedIssuers: ['trusted-org-1', 'trusted-org-2'],
  publicKeys: { /* ... */ },
});

const result = await tokenVerifier.verify(incomingToken);
if (result.valid) {
  console.log(`Agent: ${result.claims.agent_id}, Level: ${result.claims.level}`);
}
```

## Best Practices

### 1. Start with BRONZE
Begin with BRONZE certification during development. This ensures basic governance is in place without requiring production-level infrastructure.

### 2. Implement Kill Switch Early
Even for BRONZE certification, implement a kill switch endpoint. This habit pays off when you need to respond to incidents.

### 3. Use Automated Renewal
For SILVER+ certificates, implement automated renewal to prevent service disruptions.

### 4. Store Certificates Securely
Treat CGA certificates and private keys like TLS certificates. Use secrets management tools.

### 5. Monitor Certificate Expiration
Set up alerts for certificate expiration. The grace period is there for emergencies, not regular operation.

## Troubleshooting

### "Asset card validation failed"
- Ensure your asset card follows the AIGRC schema
- Run `aigrc validate` to see detailed errors
- Check that all required fields are present

### "Kill switch live test failed"
- Verify the kill switch endpoint is accessible
- Check that it responds within the timeout (default: 60s)
- Ensure it returns the expected acknowledgment

### "Golden Thread hash mismatch"
- Regenerate the hash: `aigrc hash --compute`
- Ensure the approval data matches exactly
- Check timestamp format (ISO 8601)

### "Certificate generation failed"
- Ensure private key is valid
- Check organization ID/name are provided
- Verify verification passed the target level

## Related Documentation

- [SPEC-CGA-001: CGA Specification](./aigos_master_specs/SPEC-CGA-001.md)
- [SPEC-PRT-003: Governance Token Specification](./aigos_master_specs/SPEC-PRT-003.md)
- [A2A Trust Policy Reference](./aigos_master_specs/A2A_TRUST_POLICY.md)
- [Golden Thread Protocol](./aigos_master_specs/SPEC-PRT-001.md)

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-01-15 | Initial CGA documentation |
