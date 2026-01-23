# Module 3.3: I2E Pipeline (Intent-to-Enforcement)

> **Duration:** 60-75 minutes
> **Level:** Advanced
> **Prerequisites:** Level 1 complete, Module 3.2 recommended

---

## Learning Objectives

By the end of this module, you will be able to:
1. Explain the I2E (Intent-to-Enforcement) pipeline and its role in policy enforcement
2. Understand the AIR (AIGRC Intermediate Representation) schema
3. Create and manage governance.lock files for policy pinning
4. Configure supply chain firewall for IDE, CI/CD, and runtime enforcement
5. Implement end-to-end policy enforcement across the development lifecycle

---

## Overview (5 min)

The I2E Pipeline bridges the gap between policy intent (what governance teams write) and policy enforcement (what developers experience). It transforms human-readable policies into machine-enforceable constraints that block non-compliant code before it reaches production.

**The Pipeline:**
```
Intent (Policy Documents) → AIR (Compiled Constraints) → Enforcement (IDE/CI/Runtime)
```

---

## WHY: From Intent to Enforcement (15 min)

### The Policy Enforcement Gap

**Traditional Governance:**
```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  Governance     │     │   Developers    │     │   Production    │
│  writes policy  │────▶│   ignore it     │────▶│   Non-compliant │
│  documents      │     │   (no tooling)  │     │   AI deployed   │
└─────────────────┘     └─────────────────┘     └─────────────────┘

        ✓ Intent                ✗ No Enforcement              ✗ Violation
```

**With I2E Pipeline:**
```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  Governance     │     │   Developers    │     │   Production    │
│  writes policy  │────▶│   get real-time │────▶│   Only compliant│
│  documents      │     │   enforcement   │     │   AI deployed   │
└─────────────────┘     └─────────────────┘     └─────────────────┘
        │                        ▲
        │    ┌───────────────────┘
        │    │
        ▼    │
┌─────────────────┐
│  I2E Pipeline   │
│  ├─ Bridge      │
│  ├─ AIR         │
│  └─ Firewall    │
└─────────────────┘
```

### Real-World Scenario

**Before I2E:**
- Policy: "Only use approved AI vendors (OpenAI, Anthropic)"
- Developer: Uses Cohere API (not on approved list)
- Discovery: 6 months later during audit
- Cost: Remediation, potential regulatory exposure

**After I2E:**
- Policy: Same
- Developer: Tries to use Cohere API
- IDE: 🚫 "Blocked: Cohere not in allowed_vendors"
- CI/CD: 🚫 Build fails with policy violation
- Result: Compliant from day one

### The Value Chain

| Stage | Without I2E | With I2E |
|-------|-------------|----------|
| Policy Creation | PDF, Word docs | YAML profiles + governance.lock |
| Policy Distribution | Email, wiki | Version-controlled with code |
| Policy Awareness | Hope developers read it | Real-time IDE warnings |
| Policy Enforcement | Manual audits | Automated CI/CD gates |
| Policy Compliance | Reactive | Proactive |

---

## WHAT: I2E Architecture (20 min)

### The Three Components

```
┌─────────────────────────────────────────────────────────────────────┐
│                         I2E PIPELINE                                │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─────────────┐      ┌─────────────┐      ┌─────────────────────┐ │
│  │  I2E BRIDGE │      │     AIR     │      │   I2E FIREWALL      │ │
│  │             │      │             │      │                     │ │
│  │ Document    │─────▶│ Intermediate│─────▶│ ┌─────┐ ┌─────┐     │ │
│  │ Ingestion   │      │ Represent-  │      │ │ IDE │ │CI/CD│     │ │
│  │             │      │ ation       │      │ └─────┘ └─────┘     │ │
│  │ Constraint  │      │             │      │ ┌─────────────┐     │ │
│  │ Extraction  │      │ governance  │      │ │  Runtime    │     │ │
│  │             │      │    .lock    │      │ └─────────────┘     │ │
│  └─────────────┘      └─────────────┘      └─────────────────────┘ │
│                                                                     │
│  @aigrc/i2e-bridge    @aigrc/core          @aigrc/i2e-firewall     │
└─────────────────────────────────────────────────────────────────────┘
```

### Component 1: I2E Bridge (@aigrc/i2e-bridge)

**Purpose:** Ingest policy documents and extract enforceable constraints

**Input Sources:**
- PDF policy documents
- Word documents (.docx)
- Markdown policies
- YAML/JSON policy definitions

**Extraction Process:**
```
┌────────────────────────────────────────────────────────────────────┐
│                    POLICY DOCUMENT                                 │
│                                                                    │
│  "All AI systems must use only approved vendors:                   │
│   OpenAI, Anthropic, or Azure OpenAI. Models from                  │
│   other providers require explicit security review."               │
│                                                                    │
└──────────────────────────────┬─────────────────────────────────────┘
                               │
                               ▼ Constraint Extraction
                               │
┌──────────────────────────────┴─────────────────────────────────────┐
│                    EXTRACTED CONSTRAINT                            │
│                                                                    │
│  allowed_vendors: [openai, anthropic, azure-openai]                │
│  requires_approval: [*]  # All others need review                  │
│                                                                    │
└────────────────────────────────────────────────────────────────────┘
```

**Key Functions:**
```typescript
import { extractConstraints, ingestDocument } from '@aigrc/i2e-bridge';

// Ingest a policy PDF
const constraints = await ingestDocument('./policies/ai-governance.pdf');

// Extract from multiple sources
const allConstraints = await extractConstraints([
  './policies/security.pdf',
  './policies/data-handling.yaml',
  './policies/vendor-approved.md'
]);
```

### Component 2: AIR Schema (AIGRC Intermediate Representation)

**Purpose:** Structured format for compiled policy constraints

**AIR Categories:**

| Category | Constraints | Example |
|----------|-------------|---------|
| **Registry** | allowed_vendors, allowed_models, blocked_vendors, allowed_regions | `allowed_vendors: [openai, anthropic]` |
| **Runtime** | pii_filter, toxicity_filter, max_tokens, rate_limits | `pii_filter: enabled` |
| **Build** | require_golden_thread, require_asset_card, require_approval | `require_asset_card: true` |

**AIR Schema Structure:**
```yaml
# AIR - AIGRC Intermediate Representation
air:
  version: "1.0"
  generated_at: "2026-01-09T14:30:00Z"

  registry:
    allowed_vendors:
      - openai
      - anthropic
      - azure-openai
    blocked_vendors:
      - unapproved-vendor
    allowed_models:
      - gpt-4
      - gpt-4-turbo
      - claude-3-opus
      - claude-3-sonnet
    blocked_models:
      - gpt-3.5-turbo  # Deprecated
    allowed_regions:
      - us
      - eu

  runtime:
    pii_filter: enabled
    toxicity_filter: enabled
    data_retention_days: 30
    max_tokens_per_request: 4000
    rate_limit_per_minute: 100

  build:
    require_golden_thread: true
    require_asset_card: true
    require_risk_classification: true
    max_risk_level: high  # Block unacceptable
    require_approval_for:
      - high_risk
      - new_vendor
```

### Component 3: governance.lock

**Purpose:** Pin policy version to code version

**Why "Lock"?**
- Like package-lock.json for dependencies
- Ensures reproducible policy enforcement
- Enables audit trail (which policy version was in effect)
- Prevents policy drift

**governance.lock Structure:**
```yaml
# governance.lock - DO NOT EDIT MANUALLY
version: "1.0"
generated_at: "2026-01-09T14:30:00Z"
expires_at: "2026-02-09T14:30:00Z"  # Force refresh after 30 days

policy_hash: "sha256:abc123..."  # Integrity verification

policy_sources:
  - uri: "./policies/ai-governance.pdf"
    hash: "sha256:def456..."
  - uri: "./policies/vendor-approved.yaml"
    hash: "sha256:ghi789..."

constraints:
  # Compiled AIR constraints
  registry:
    allowed_vendors: [openai, anthropic, azure-openai]
    allowed_models: [gpt-4, gpt-4-turbo, claude-3-opus]
    allowed_regions: [us, eu]
  runtime:
    pii_filter: enabled
    toxicity_filter: enabled
  build:
    require_asset_card: true
    require_risk_classification: true

signatures:
  - signer: "policy-team@acme.com"
    algorithm: ES256
    signature: "base64..."
    signed_at: "2026-01-09T14:30:00Z"
```

### Component 4: I2E Firewall (@aigrc/i2e-firewall)

**Purpose:** Enforce constraints across development lifecycle

**Enforcement Points:**

```
┌────────────────────────────────────────────────────────────────────┐
│                    ENFORCEMENT TIMELINE                            │
│                                                                    │
│   DEVELOPMENT         BUILD              DEPLOY        RUNTIME    │
│   ──────────          ─────              ──────        ───────    │
│                                                                    │
│   ┌─────────┐     ┌─────────┐       ┌─────────┐    ┌─────────┐   │
│   │   IDE   │     │  CI/CD  │       │ Pre-    │    │ Runtime │   │
│   │ Diag-   │────▶│  Gate   │──────▶│ Deploy  │───▶│ Guard   │   │
│   │ nostics │     │         │       │ Check   │    │         │   │
│   └─────────┘     └─────────┘       └─────────┘    └─────────┘   │
│                                                                    │
│   Real-time        Build fails      Blocks         Request-time   │
│   warnings         on violation     rollout        enforcement    │
│                                                                    │
└────────────────────────────────────────────────────────────────────┘
```

**Firewall Capabilities:**

| Checker | What It Detects |
|---------|-----------------|
| **Vendor Checker** | Unapproved AI vendors in imports |
| **Model Checker** | Blocked or unapproved model IDs |
| **Region Checker** | Data processing in blocked regions |
| **Code Scanner** | AI/ML framework usage patterns |

**SARIF Output:**

The firewall generates SARIF (Static Analysis Results Interchange Format) for GitHub Security integration:

```json
{
  "$schema": "https://json.schemastore.org/sarif-2.1.0.json",
  "version": "2.1.0",
  "runs": [{
    "tool": {
      "driver": {
        "name": "AIGRC Supply Chain Firewall",
        "version": "0.1.0"
      }
    },
    "results": [{
      "ruleId": "unapproved_vendor",
      "level": "error",
      "message": {
        "text": "Vendor 'cohere' is not in allowed_vendors list"
      },
      "locations": [{
        "physicalLocation": {
          "artifactLocation": { "uri": "src/ai/service.ts" },
          "region": { "startLine": 5 }
        }
      }]
    }]
  }]
}
```

---

## HOW: Implementation Guide (25 min)

### Step 1: Generate governance.lock

```bash
# From policy documents
aigrc policy lock --sources ./policies/

# From compliance profiles
aigrc policy lock --profile eu-ai-act,nist-ai-rmf

# Combined
aigrc policy lock --sources ./policies/ --profile eu-ai-act
```

**Output:**
```
🔒 Generating governance.lock...

Policy Sources:
  ✅ ./policies/ai-governance.pdf (extracted 12 constraints)
  ✅ ./policies/vendor-list.yaml (extracted 3 constraints)

Compliance Profiles:
  ✅ eu-ai-act (added 8 constraints)
  ✅ nist-ai-rmf (added 5 constraints)

Constraint Summary:
  Registry: 4 constraints
  Runtime: 3 constraints
  Build: 5 constraints

✅ Generated governance.lock
   Hash: sha256:abc123...
   Expires: 2026-02-09

Next: Run 'aigrc policy check' to validate your codebase
```

### Step 2: Check Policy Compliance

```bash
aigrc policy check
```

**Output (Passing):**
```
🔍 Checking policy compliance...

governance.lock: ✅ Valid (expires in 30 days)

Scanning codebase...

Vendors Found:
  ✅ openai (src/ai/chat.ts:5) - Allowed
  ✅ anthropic (src/agents/claude.ts:1) - Allowed

Models Found:
  ✅ gpt-4 (src/ai/chat.ts:12) - Allowed
  ✅ claude-3-sonnet (src/agents/claude.ts:8) - Allowed

Build Requirements:
  ✅ Asset cards present
  ✅ Risk classifications complete
  ✅ Golden thread links valid

✅ All policy checks passed
```

**Output (Failing):**
```
🔍 Checking policy compliance...

governance.lock: ✅ Valid

Scanning codebase...

Vendors Found:
  ✅ openai (src/ai/chat.ts:5) - Allowed
  ❌ cohere (src/ai/embeddings.ts:3) - NOT ALLOWED

Models Found:
  ✅ gpt-4 (src/ai/chat.ts:12) - Allowed
  ❌ command-r-plus (src/ai/embeddings.ts:15) - NOT ALLOWED

Violations (2):
┌─────────────────┬───────────────────────────┬──────────┬─────────────────────┐
│ Type            │ Location                  │ Severity │ Message             │
├─────────────────┼───────────────────────────┼──────────┼─────────────────────┤
│ unapproved_ven  │ src/ai/embeddings.ts:3    │ error    │ Vendor 'cohere' not │
│                 │                           │          │ in allowed_vendors  │
├─────────────────┼───────────────────────────┼──────────┼─────────────────────┤
│ unapproved_mod  │ src/ai/embeddings.ts:15   │ error    │ Model 'command-r-p' │
│                 │                           │          │ not in allowed list │
└─────────────────┴───────────────────────────┴──────────┴─────────────────────┘

Approved Alternatives:
  • For embeddings: openai text-embedding-3-large

❌ Policy check failed (2 violations)
Exit code: 1
```

### Step 3: IDE Integration (VS Code)

With the AIGRC VS Code extension:

1. **Real-time diagnostics:**
   ```
   ⚠️ Warning: Vendor 'cohere' not in governance.lock allowed_vendors

   Quick fixes:
   • Replace with approved vendor (openai)
   • Request vendor approval
   • Suppress warning
   ```

2. **Code Actions:**
   - Right-click on violation → "AIGRC: Show approved alternatives"
   - Right-click on violation → "AIGRC: Request vendor approval"

### Step 4: CI/CD Integration (GitHub Actions)

```yaml
# .github/workflows/policy-check.yml
name: Policy Check

on: [push, pull_request]

jobs:
  policy-check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: AIGRC Policy Check
        uses: aigrc/github-action@v1
        with:
          check-policy: true
          fail-on-violations: true
          upload-sarif: true

      - name: Upload SARIF to Security Tab
        if: always()
        uses: github/codeql-action/upload-sarif@v3
        with:
          sarif_file: aigrc-results.sarif
```

### Step 5: Programmatic Enforcement

```typescript
import { loadGovernanceLock, scanDirectory } from '@aigrc/i2e-firewall';

// Load governance.lock
const lock = await loadGovernanceLock('./governance.lock');

// Scan codebase
const result = await scanDirectory('./src', lock.constraints);

if (!result.passed) {
  console.error('Policy violations found:');
  result.violations.forEach(v => {
    console.error(`  ${v.type}: ${v.message} at ${v.file}:${v.line}`);
  });
  process.exit(1);
}

console.log('All policy checks passed!');
```

### Step 6: Refresh and Versioning

```bash
# Check lock status
aigrc policy status

# Output:
# governance.lock Status:
#   Version: 1.0
#   Created: 2026-01-09
#   Expires: 2026-02-09 (21 days remaining)
#   Policy Hash: sha256:abc123...
#   Signature: Valid (policy-team@acme.com)

# Refresh lock (re-extract from sources)
aigrc policy refresh

# Show diff from previous
aigrc policy diff
```

---

## Practice Lab (15 min)

### Exercise 1: Create Your First governance.lock

1. Create a policy file:
   ```yaml
   # policies/vendor-policy.yaml
   allowed_vendors:
     - openai
     - anthropic
   blocked_models:
     - gpt-3.5-turbo
   require_asset_card: true
   ```

2. Generate governance.lock:
   ```bash
   aigrc policy lock --sources ./policies/
   ```

3. View the generated lock:
   ```bash
   cat governance.lock
   ```

### Exercise 2: Trigger a Violation

1. Add a non-compliant import:
   ```typescript
   // src/test.ts
   import Cohere from 'cohere-ai';
   ```

2. Run policy check:
   ```bash
   aigrc policy check
   ```

3. Observe the violation output

4. Fix by replacing with approved vendor

### Exercise 3: CI/CD Setup

1. Create GitHub Actions workflow (see Step 4)
2. Push a branch with a violation
3. Observe PR check failure
4. Fix and verify PR check passes

---

## Knowledge Check

1. **I2E stands for:**
   - a) Intent to Execution
   - b) Intent to Enforcement ✓
   - c) Integration to Encryption
   - d) Input to Evaluation

2. **governance.lock is similar to:**
   - a) .gitignore
   - b) package-lock.json ✓
   - c) .env
   - d) Dockerfile

3. **AIR (AIGRC Intermediate Representation) includes:**
   - a) Only vendor restrictions
   - b) Registry, Runtime, and Build constraints ✓
   - c) Only build requirements
   - d) Only runtime limits

4. **The I2E Firewall enforces policies at:**
   - a) Only runtime
   - b) Only CI/CD
   - c) IDE, CI/CD, and Runtime ✓
   - d) Only IDE

5. **SARIF output is used for:**
   - a) Database storage
   - b) GitHub Security integration ✓
   - c) User authentication
   - d) API documentation

---

## Key Takeaways

1. **I2E bridges policy and code** - No more ignored documents
2. **governance.lock pins policy** - Like package-lock for governance
3. **AIR is the intermediate format** - Machine-readable constraints
4. **Firewall enforces everywhere** - IDE, CI/CD, runtime
5. **SARIF integrates with GitHub** - Native security tab integration

---

## Architecture Reference

### Package Dependencies

```
@aigrc/core
    ↑
    ├── @aigrc/i2e-bridge (Document → AIR)
    │
    └── @aigrc/i2e-firewall (AIR → Enforcement)
            ↑
            ├── @aigrc/cli (CLI commands)
            ├── @aigrc/github-action (CI/CD)
            └── aigrc-vscode (IDE)
```

### Command Reference

| Command | Purpose |
|---------|---------|
| `aigrc policy lock` | Generate governance.lock |
| `aigrc policy check` | Validate against lock |
| `aigrc policy status` | Show lock status |
| `aigrc policy refresh` | Regenerate lock |
| `aigrc policy diff` | Show changes |

---

## Troubleshooting

| Issue | Cause | Solution |
|-------|-------|----------|
| "governance.lock not found" | Not generated | Run `aigrc policy lock` |
| "governance.lock expired" | Past expiry date | Run `aigrc policy refresh` |
| "Invalid signature" | Lock modified | Re-sign or regenerate |
| False positives | Pattern mismatch | Add to `.aigrcignore` |
| Slow scans | Large codebase | Use specific directories |

---

## Further Reading

- Policy Schema Spec: `aigrc/docs/aigos_master_specs/fmt_spec_layer/SPEC-FMT-003_Policy_Schema.md`
- AIR Schema: `@aigrc/core/src/air/`
- Firewall Package: `aigrc/packages/i2e-firewall/`
- Bridge Package: `aigrc/packages/i2e-bridge/`

---

## Congratulations!

You've completed Level 3: Advanced. You now understand:
- MCP Server integration for AI-assisted governance
- Multi-jurisdiction compliance across regulatory frameworks
- I2E Pipeline for policy enforcement

**Next Steps:**
- [Level 4: Specialization Tracks](../level-4-specialization/) - Role-specific deep dives
- Practice with real projects
- Consider AIGRC certification

---

*Module 3.3 - AIGRC Training Program v1.0*
