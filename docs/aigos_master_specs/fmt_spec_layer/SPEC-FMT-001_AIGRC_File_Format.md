# SPEC-FMT-001: .aigrc File Format Specification

## Document Information

| Field | Value |
|-------|-------|
| **Spec ID** | SPEC-FMT-001 |
| **Version** | 1.0.0-draft |
| **Status** | Draft |
| **Category** | Format |
| **Last Updated** | 2025-12-29 |
| **Authors** | GovOS Team |
| **License** | Apache 2.0 |

---

## Dependencies

### Required Specifications

None. This is a foundational specification.

### Dependent Specifications

| Spec ID | Name | How Used |
|---------|------|----------|
| SPEC-FMT-002 | Asset Card Schema | Stored in .aigrc/cards/ |
| SPEC-FMT-003 | Policy Schema | Stored in .aigrc/policies/ |
| SPEC-CLI-001 | CLI | Reads/writes .aigrc directory |
| SPEC-RT-002 | Identity Manager | Loads from .aigrc/cards/ |
| SPEC-RT-003 | Policy Engine | Loads from .aigrc/policies/ |

---

## Abstract

This specification defines the `.aigrc` directory structure and `.aigrc.yaml` configuration file format used by AIGRC and AIGOS tools. The `.aigrc` directory serves as the local-first, Git-native storage for all AI governance artifacts including Asset Cards, policies, signatures, and keys.

---

## 1. Introduction

### 1.1 Purpose

The `.aigrc` format provides:

1. **Local-First Storage** — All governance data stored in the repository
2. **Git-Native Workflow** — Track changes, review in PRs, audit history
3. **Tool Interoperability** — Common format for CLI, IDE, CI/CD, Runtime
4. **Human Readable** — YAML format for easy inspection and editing
5. **Machine Processable** — Strict schema for programmatic access

### 1.2 Design Principles

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                              .AIGRC DESIGN PRINCIPLES                                    │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                         │
│   1. LOCAL-FIRST                                                                        │
│      • No cloud dependency for core functionality                                       │
│      • Works offline, air-gapped environments                                           │
│      • Cloud is optional enhancement, not requirement                                   │
│                                                                                         │
│   2. GIT-NATIVE                                                                         │
│      • Version controlled with code                                                     │
│      • Changes visible in pull requests                                                 │
│      • Full audit trail via git history                                                 │
│                                                                                         │
│   3. CONVENTION OVER CONFIGURATION                                                      │
│      • Sensible defaults                                                                │
│      • Zero-config quick start                                                          │
│      • Override only when needed                                                        │
│                                                                                         │
│   4. SEPARATION OF CONCERNS                                                             │
│      • Cards describe WHAT (assets)                                                     │
│      • Policies describe RULES (permissions)                                            │
│      • Config describes HOW (tool behavior)                                             │
│                                                                                         │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

### 1.3 Scope

This specification defines:

- Directory structure and naming conventions
- `.aigrc.yaml` configuration file format
- File discovery and loading rules
- Signature and key storage

This specification does NOT define:

- Asset Card content (see SPEC-FMT-002)
- Policy content (see SPEC-FMT-003)
- Tool-specific behavior (see tool specs)

---

## 2. Directory Structure

### 2.1 Standard Layout

```
project-root/
├── .aigrc.yaml              # Root configuration file
├── .aigrc/                  # Governance artifacts directory
│   ├── cards/               # Asset Cards
│   │   ├── my-agent.yaml
│   │   ├── data-pipeline.yaml
│   │   └── ml-model.yaml
│   ├── policies/            # Policy files
│   │   ├── default.yaml
│   │   ├── production.yaml
│   │   └── development.yaml
│   ├── profiles/            # Jurisdiction profiles
│   │   ├── eu-ai-act.yaml
│   │   └── us-omb.yaml
│   ├── signatures/          # Cryptographic signatures
│   │   ├── my-agent.yaml.sig
│   │   └── production.yaml.sig
│   └── keys/                # Public keys (never private!)
│       └── approvers.yaml
└── src/                     # Application source code
```

### 2.2 Directory Purposes

| Directory | Purpose | File Types |
|-----------|---------|------------|
| `.aigrc/cards/` | Asset Card storage | `.yaml`, `.yml` |
| `.aigrc/policies/` | Policy definitions | `.yaml`, `.yml` |
| `.aigrc/profiles/` | Jurisdiction profiles | `.yaml`, `.yml` |
| `.aigrc/signatures/` | Detached signatures | `.sig` |
| `.aigrc/keys/` | Public key storage | `.yaml`, `.pem` |

### 2.3 File Naming Conventions

| Convention | Rule | Example |
|------------|------|---------|
| Asset Cards | `{asset-id}.yaml` | `customer-bot.yaml` |
| Policies | `{environment}.yaml` or `{name}.yaml` | `production.yaml` |
| Profiles | `{jurisdiction-code}.yaml` | `eu-ai-act.yaml` |
| Signatures | `{original-file}.sig` | `customer-bot.yaml.sig` |

**Naming Rules:**

1. Use lowercase with hyphens (kebab-case)
2. No spaces or special characters
3. Extension MUST be `.yaml` or `.yml`
4. Maximum filename length: 100 characters

---

## 3. Configuration File (.aigrc.yaml)

### 3.1 Location

The `.aigrc.yaml` file MUST be in the repository root directory.

### 3.2 Schema

```yaml
# .aigrc.yaml - AIGRC Configuration File
# Version: 1.0

# Schema version (required)
version: "1.0"

# Project metadata (optional)
project:
  name: "My AI Project"
  description: "AI-powered application"
  organization: "Acme Corp"

# Directory configuration (optional, defaults shown)
directories:
  cards: ".aigrc/cards"
  policies: ".aigrc/policies"
  profiles: ".aigrc/profiles"
  signatures: ".aigrc/signatures"
  keys: ".aigrc/keys"

# Scan configuration (optional)
scan:
  include:
    - "src/**"
    - "lib/**"
    - "app/**"
  exclude:
    - "node_modules"
    - "dist"
    - "build"
    - ".git"
    - "__pycache__"
    - ".venv"
    - "*.test.ts"
    - "*.spec.ts"
    - "*.test.py"
    - "test_*.py"
  max_depth: 10

# Validation configuration (optional)
validation:
  strict: false
  require_description: true
  require_owner: true
  require_golden_thread: false
  allowed_risk_levels:
    - minimal
    - limited
    - high
  # Blocked means CI will fail if detected
  blocked_risk_levels:
    - unacceptable

# Runtime configuration (optional)
runtime:
  identity:
    verify_on_startup: true
    verification_failure_mode: "SANDBOX"  # SANDBOX | FAIL
    max_generation_depth: 5
    allow_unverified: false
  policy:
    default_policy: "default.yaml"
    dry_run: false
    fail_open: false
  telemetry:
    enabled: true
    endpoint: null  # Uses OTEL_EXPORTER_OTLP_ENDPOINT env var
    service_name: "aigrc"

# Integration configuration (optional)
integrations:
  jira:
    enabled: false
    base_url: null
    project_key: null
  azure_devops:
    enabled: false
    organization: null
    project: null
  github:
    enabled: true
    create_pr_comments: true

# License configuration (optional, for paid tiers)
license:
  key: null  # Or set via AIGRC_LICENSE_KEY env var
  # key_file: ".aigrc/license.key"  # Alternative: file path
```

### 3.3 Minimal Configuration

A minimal `.aigrc.yaml` requires only the version:

```yaml
version: "1.0"
```

All other fields use defaults.

### 3.4 Environment Variable Overrides

Configuration can be overridden via environment variables:

| Config Path | Environment Variable |
|-------------|---------------------|
| `runtime.policy.dry_run` | `AIGRC_DRY_RUN=true` |
| `runtime.telemetry.endpoint` | `OTEL_EXPORTER_OTLP_ENDPOINT` |
| `license.key` | `AIGRC_LICENSE_KEY` |
| `integrations.jira.base_url` | `AIGRC_JIRA_URL` |

**Precedence (highest to lowest):**
1. Environment variables
2. `.aigrc.yaml` values
3. Built-in defaults

---

## 4. File Discovery

### 4.1 Configuration Discovery

Tools MUST search for `.aigrc.yaml` in this order:

1. Current working directory
2. Parent directories (up to filesystem root)
3. User home directory (`~/.aigrc.yaml`) for global defaults

```
/home/user/projects/my-app/src/agents/
                    │
                    ▼
Search: /home/user/projects/my-app/src/agents/.aigrc.yaml
        /home/user/projects/my-app/src/.aigrc.yaml
        /home/user/projects/my-app/.aigrc.yaml  ← Found, use this
        /home/user/projects/.aigrc.yaml
        /home/user/.aigrc.yaml
        /home/.aigrc.yaml
        /.aigrc.yaml
```

### 4.2 Asset Card Discovery

Asset Cards are discovered from the configured cards directory:

```typescript
function discoverAssetCards(configPath: string): AssetCard[] {
  const config = loadConfig(configPath);
  const cardsDir = resolve(dirname(configPath), config.directories.cards);
  
  const files = glob.sync('**/*.{yaml,yml}', { cwd: cardsDir });
  
  return files.map(file => loadAssetCard(join(cardsDir, file)));
}
```

### 4.3 Policy Discovery

Policies are loaded in this order (later overrides earlier):

1. Built-in defaults
2. `default.yaml` in policies directory
3. Environment-specific policy (matching `NODE_ENV` or explicit)
4. Asset-specific policy (referenced in Asset Card)

---

## 5. Schema Definitions

### 5.1 JSON Schema for .aigrc.yaml

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$id": "https://aigrc.dev/schemas/aigrc-config.json",
  "title": "AIGRC Configuration",
  "type": "object",
  "required": ["version"],
  "properties": {
    "version": {
      "type": "string",
      "enum": ["1.0"],
      "description": "Schema version"
    },
    "project": {
      "type": "object",
      "properties": {
        "name": { "type": "string" },
        "description": { "type": "string" },
        "organization": { "type": "string" }
      }
    },
    "directories": {
      "type": "object",
      "properties": {
        "cards": { "type": "string", "default": ".aigrc/cards" },
        "policies": { "type": "string", "default": ".aigrc/policies" },
        "profiles": { "type": "string", "default": ".aigrc/profiles" },
        "signatures": { "type": "string", "default": ".aigrc/signatures" },
        "keys": { "type": "string", "default": ".aigrc/keys" }
      }
    },
    "scan": {
      "type": "object",
      "properties": {
        "include": {
          "type": "array",
          "items": { "type": "string" },
          "default": ["**/*"]
        },
        "exclude": {
          "type": "array",
          "items": { "type": "string" },
          "default": ["node_modules", ".git"]
        },
        "max_depth": {
          "type": "integer",
          "minimum": 1,
          "default": 10
        }
      }
    },
    "validation": {
      "type": "object",
      "properties": {
        "strict": { "type": "boolean", "default": false },
        "require_description": { "type": "boolean", "default": true },
        "require_owner": { "type": "boolean", "default": true },
        "require_golden_thread": { "type": "boolean", "default": false },
        "allowed_risk_levels": {
          "type": "array",
          "items": {
            "type": "string",
            "enum": ["minimal", "limited", "high", "unacceptable"]
          }
        },
        "blocked_risk_levels": {
          "type": "array",
          "items": {
            "type": "string",
            "enum": ["minimal", "limited", "high", "unacceptable"]
          },
          "default": ["unacceptable"]
        }
      }
    },
    "runtime": {
      "type": "object",
      "properties": {
        "identity": {
          "type": "object",
          "properties": {
            "verify_on_startup": { "type": "boolean", "default": true },
            "verification_failure_mode": {
              "type": "string",
              "enum": ["SANDBOX", "FAIL"],
              "default": "SANDBOX"
            },
            "max_generation_depth": { "type": "integer", "default": 5 },
            "allow_unverified": { "type": "boolean", "default": false }
          }
        },
        "policy": {
          "type": "object",
          "properties": {
            "default_policy": { "type": "string", "default": "default.yaml" },
            "dry_run": { "type": "boolean", "default": false },
            "fail_open": { "type": "boolean", "default": false }
          }
        },
        "telemetry": {
          "type": "object",
          "properties": {
            "enabled": { "type": "boolean", "default": true },
            "endpoint": { "type": ["string", "null"] },
            "service_name": { "type": "string", "default": "aigrc" }
          }
        }
      }
    },
    "integrations": {
      "type": "object",
      "properties": {
        "jira": {
          "type": "object",
          "properties": {
            "enabled": { "type": "boolean", "default": false },
            "base_url": { "type": ["string", "null"] },
            "project_key": { "type": ["string", "null"] }
          }
        },
        "azure_devops": {
          "type": "object",
          "properties": {
            "enabled": { "type": "boolean", "default": false },
            "organization": { "type": ["string", "null"] },
            "project": { "type": ["string", "null"] }
          }
        },
        "github": {
          "type": "object",
          "properties": {
            "enabled": { "type": "boolean", "default": true },
            "create_pr_comments": { "type": "boolean", "default": true }
          }
        }
      }
    },
    "license": {
      "type": "object",
      "properties": {
        "key": { "type": ["string", "null"] },
        "key_file": { "type": ["string", "null"] }
      }
    }
  }
}
```

---

## 6. Signatures

### 6.1 Purpose

Signatures provide integrity verification for Asset Cards and Policies, ensuring they haven't been tampered with after approval.

### 6.2 Signature File Format

Signatures are stored as detached files in `.aigrc/signatures/`:

```
# .aigrc/signatures/customer-bot.yaml.sig
-----BEGIN AIGRC SIGNATURE-----
Version: 1.0
File: cards/customer-bot.yaml
Algorithm: RSA-SHA256
Signer: ciso@corp.com
Timestamp: 2025-01-15T10:30:00Z

MIIB...base64-encoded-signature...
-----END AIGRC SIGNATURE-----
```

### 6.3 Signature Verification

Tools SHOULD verify signatures when present:

```typescript
function verifySignature(filePath: string): SignatureResult {
  const sigPath = getSignaturePath(filePath);
  
  if (!exists(sigPath)) {
    return { verified: false, reason: 'No signature file' };
  }
  
  const signature = loadSignature(sigPath);
  const publicKey = loadPublicKey(signature.signer);
  const fileContent = readFile(filePath);
  
  const valid = crypto.verify(
    signature.algorithm,
    fileContent,
    publicKey,
    signature.value
  );
  
  return { verified: valid, signer: signature.signer };
}
```

---

## 7. Keys

### 7.1 Key Storage

Public keys for signature verification are stored in `.aigrc/keys/`:

```yaml
# .aigrc/keys/approvers.yaml
version: "1.0"
approvers:
  - email: ciso@corp.com
    name: "Chief Information Security Officer"
    algorithm: RSA-SHA256
    public_key: |
      -----BEGIN PUBLIC KEY-----
      MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA...
      -----END PUBLIC KEY-----
    valid_from: "2025-01-01T00:00:00Z"
    valid_until: "2026-01-01T00:00:00Z"
    
  - email: ml-lead@corp.com
    name: "ML Team Lead"
    algorithm: ECDSA-P256
    public_key_file: "ml-lead.pem"  # Reference to .aigrc/keys/ml-lead.pem
```

### 7.2 Key Security

**NEVER store private keys in the `.aigrc` directory.**

Private keys should be stored in:
- Hardware Security Modules (HSM)
- Cloud KMS (AWS KMS, Azure Key Vault, GCP KMS)
- Local secure storage (for development only)

---

## 8. Initialization

### 8.1 aigrc init Command

The `aigrc init` command creates the standard structure:

```bash
$ aigrc init

Creating .aigrc structure...
  ✓ Created .aigrc.yaml
  ✓ Created .aigrc/cards/
  ✓ Created .aigrc/policies/
  ✓ Created .aigrc/policies/default.yaml
  ✓ Updated .gitignore

AIGRC initialized successfully!
```

### 8.2 Generated Files

**`.aigrc.yaml`:**
```yaml
version: "1.0"

project:
  name: "my-project"  # Inferred from directory name
```

**`.aigrc/policies/default.yaml`:**
```yaml
version: "1.0"
name: "Default Policy"
description: "Default governance policy"

capabilities:
  allowed_tools: ["*"]
  denied_tools: []

resources:
  allowed_domains: ["*"]
  denied_domains: []

budget:
  max_cost_per_session: null
  max_cost_per_day: null

mode:
  dry_run: true  # Start in dry-run for safety
```

### 8.3 .gitignore Updates

The init command SHOULD add these patterns to `.gitignore`:

```gitignore
# AIGRC - Do not commit these
.aigrc/keys/*.pem
.aigrc/license.key
```

---

## 9. Implementation Requirements

### 9.1 MUST (Required)

Implementations MUST:

1. Support `.aigrc.yaml` in repository root
2. Support the standard directory structure
3. Use YAML format for all configuration files
4. Validate configuration against JSON Schema
5. Support environment variable overrides
6. Search parent directories for configuration

### 9.2 SHOULD (Recommended)

Implementations SHOULD:

1. Support signature verification when signatures present
2. Provide `init` command for bootstrapping
3. Update `.gitignore` to exclude sensitive files
4. Cache parsed configuration for performance
5. Watch for configuration changes (hot reload)

### 9.3 MAY (Optional)

Implementations MAY:

1. Support alternative configuration locations
2. Support JSON format alongside YAML
3. Support encrypted configuration values
4. Support remote configuration sources

---

## 10. Migration

### 10.1 From Version 0.x

If migrating from pre-1.0 formats:

```bash
$ aigrc migrate

Migrating from v0.x format...
  • Converting .aigrc-config.json → .aigrc.yaml
  • Moving asset cards to .aigrc/cards/
  • Creating default policy

Migration complete!
```

---

## 11. Examples

### 11.1 Minimal Setup

```yaml
# .aigrc.yaml
version: "1.0"
```

```
.aigrc/
└── cards/
    └── my-agent.yaml
```

### 11.2 Production Setup

```yaml
# .aigrc.yaml
version: "1.0"

project:
  name: "Financial Services AI"
  organization: "Acme Financial"

validation:
  strict: true
  require_golden_thread: true
  blocked_risk_levels:
    - high
    - unacceptable

runtime:
  identity:
    verify_on_startup: true
    verification_failure_mode: "FAIL"
  policy:
    default_policy: "production.yaml"
    dry_run: false

integrations:
  jira:
    enabled: true
    base_url: "https://jira.acme.com"
    project_key: "AIGOVERN"

license:
  key_file: ".aigrc/license.key"
```

### 11.3 Development Setup

```yaml
# .aigrc.yaml
version: "1.0"

validation:
  strict: false
  require_golden_thread: false

runtime:
  identity:
    verify_on_startup: false
    allow_unverified: true
  policy:
    default_policy: "development.yaml"
    dry_run: true
```

---

## Appendix A: Default Values

| Path | Default Value |
|------|---------------|
| `directories.cards` | `.aigrc/cards` |
| `directories.policies` | `.aigrc/policies` |
| `directories.profiles` | `.aigrc/profiles` |
| `directories.signatures` | `.aigrc/signatures` |
| `directories.keys` | `.aigrc/keys` |
| `scan.exclude` | `["node_modules", ".git", "dist", "build"]` |
| `scan.max_depth` | `10` |
| `validation.strict` | `false` |
| `validation.blocked_risk_levels` | `["unacceptable"]` |
| `runtime.identity.verify_on_startup` | `true` |
| `runtime.identity.verification_failure_mode` | `"SANDBOX"` |
| `runtime.policy.dry_run` | `false` |
| `runtime.policy.fail_open` | `false` |
| `runtime.telemetry.enabled` | `true` |

---

## Appendix B: Changelog

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0-draft | 2025-12-29 | Initial draft |
