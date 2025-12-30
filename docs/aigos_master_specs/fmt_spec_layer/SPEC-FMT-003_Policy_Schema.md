# SPEC-FMT-003: Policy Schema Specification

## Document Information

| Field | Value |
|-------|-------|
| **Spec ID** | SPEC-FMT-003 |
| **Version** | 1.0.0-draft |
| **Status** | Draft |
| **Category** | Format |
| **Last Updated** | 2025-12-29 |
| **Authors** | GovOS Team |
| **License** | Apache 2.0 |

---

## Dependencies

### Required Specifications

| Spec ID | Name | Why Required |
|---------|------|--------------|
| SPEC-FMT-001 | .aigrc File Format | Policies stored in .aigrc/policies/ |

### Dependent Specifications

| Spec ID | Name | How Used |
|---------|------|----------|
| SPEC-RT-003 | Policy Engine | Loads and evaluates policies |
| SPEC-RT-006 | Capability Decay | Uses policy for child restrictions |

---

## Abstract

This specification defines the schema for AIGRC policy files stored in `.aigrc/policies/`. Policy files define what AI agents are permitted to do, including allowed tools, resource access patterns, budget limits, and spawning rules. The Policy Engine (SPEC-RT-003) loads these files at runtime to enforce governance rules.

---

## 1. Introduction

### 1.1 Purpose

Policy files answer the governance question:

> **"What is this agent allowed to do?"**

While Asset Cards describe *what* an AI asset *is*, policies describe *what* it *may do*. This separation allows:

- Reusable policies across multiple assets
- Environment-specific rules (dev vs prod)
- Centralized policy management
- Clear separation of identity and authorization

### 1.2 Policy Hierarchy

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                              POLICY HIERARCHY                                            │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                         │
│   MOST RESTRICTIVE (applied last, overrides all)                                        │
│   ──────────────────────────────────────────────                                        │
│                                                                                         │
│   ┌─────────────────────────────────────────┐                                          │
│   │         Asset-Specific Policy            │  Referenced in Asset Card               │
│   │         (my-agent.policy.yaml)           │  policy: "my-agent.policy.yaml"         │
│   └─────────────────────────────────────────┘                                          │
│                       │                                                                 │
│                       ▼                                                                 │
│   ┌─────────────────────────────────────────┐                                          │
│   │         Risk-Level Policy                │  Matched by risk_level                  │
│   │         (high-risk.yaml)                 │  Applies to all "high" risk assets      │
│   └─────────────────────────────────────────┘                                          │
│                       │                                                                 │
│                       ▼                                                                 │
│   ┌─────────────────────────────────────────┐                                          │
│   │         Environment Policy               │  Matched by NODE_ENV                    │
│   │         (production.yaml)                │  or AIGRC_ENV                           │
│   └─────────────────────────────────────────┘                                          │
│                       │                                                                 │
│                       ▼                                                                 │
│   ┌─────────────────────────────────────────┐                                          │
│   │         Default Policy                   │  Always loaded first                    │
│   │         (default.yaml)                   │  Base permissions                       │
│   └─────────────────────────────────────────┘                                          │
│                                                                                         │
│   LEAST RESTRICTIVE (applied first, base layer)                                        │
│                                                                                         │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

### 1.3 Scope

This specification defines:

- Policy file structure and fields
- Capability rules (allowed/denied tools)
- Resource rules (allowed/denied domains)
- Budget limits
- Spawning rules
- Policy inheritance and merging

---

## 2. Policy File Structure

### 2.1 Complete Schema

```yaml
# .aigrc/policies/production.yaml

# Schema version (required)
version: "1.0"

# Policy metadata (required)
name: "Production Policy"
description: "Restrictive policy for production AI agents"

# Policy inheritance (optional)
extends: "default.yaml"

# What risk levels this policy applies to (optional)
applies_to:
  risk_levels:
    - high
    - limited
  # OR specific assets
  assets:
    - fin-agent-001
    - customer-bot

# Capability rules (required)
capabilities:
  # Allowed tools/actions (whitelist)
  allowed_tools:
    - web_search
    - calculator
    - database_read
    - send_email
  
  # Denied tools/actions (blacklist, overrides allowed)
  denied_tools:
    - shell_exec
    - file_write
    - file_delete
    - admin_commands
    - code_execution

# Resource access rules (required)
resources:
  # Allowed domain patterns (regex)
  allowed_domains:
    - "^https://api\\.company\\.com/.*"
    - "^https://.*\\.wikipedia\\.org/.*"
    - "^https://api\\.openai\\.com/.*"
  
  # Denied domain patterns (regex, overrides allowed)
  denied_domains:
    - ".*\\.gov$"
    - ".*\\.mil$"
    - "^https?://localhost.*"
    - "^https?://127\\.0\\.0\\.1.*"
    - "^https?://10\\..*"
    - "^https?://192\\.168\\..*"

# Model access rules (optional)
models:
  # Allowed models
  allowed_models:
    - "gpt-4o"
    - "gpt-4o-mini"
    - "claude-sonnet-4-20250514"
    - "claude-haiku"
  
  # Denied models
  denied_models:
    - "gpt-4-base"  # Unrestricted base model

# Budget limits (optional, null = unlimited)
budget:
  # Maximum cost per session
  max_cost_per_session: 10.00  # USD
  
  # Maximum cost per day
  max_cost_per_day: 100.00  # USD
  
  # Maximum cost per month
  max_cost_per_month: 1000.00  # USD
  
  # Maximum tokens per LLM call
  max_tokens_per_call: 4096
  
  # Maximum calls per minute (rate limiting)
  max_calls_per_minute: 60
  
  # Maximum concurrent operations
  max_concurrent_operations: 5

# Time-based rules (optional)
schedule:
  # Allowed operating hours (timezone: UTC unless specified)
  allowed_hours:
    start: "06:00"
    end: "22:00"
    timezone: "America/New_York"
  
  # Allowed days of week (0=Sunday, 6=Saturday)
  allowed_days: [1, 2, 3, 4, 5]  # Monday-Friday only
  
  # Maintenance windows (agent paused)
  blackout_windows:
    - start: "2025-12-31T23:00:00Z"
      end: "2025-01-01T06:00:00Z"
      reason: "New Year maintenance"

# Agent spawning rules (optional)
spawning:
  # Whether agent may spawn children
  may_spawn_children: true
  
  # Maximum generation depth
  max_child_depth: 2
  
  # Capability mode for children
  # - decay: Children have ≤ parent capabilities
  # - explicit: Children have only explicitly granted capabilities
  # - inherit: Children have same capabilities (not recommended)
  child_capability_mode: "decay"
  
  # Specific capabilities children may NOT have
  child_denied_capabilities:
    - send_email
    - external_api_call

# Data handling rules (optional)
data:
  # Whether PII processing is allowed
  allow_pii_processing: false
  
  # Data classification levels allowed
  allowed_data_classifications:
    - public
    - internal
  
  # Denied data classifications
  denied_data_classifications:
    - confidential
    - restricted
    - top_secret
  
  # Data retention rules
  retention:
    max_session_log_days: 30
    max_conversation_history: 100  # messages

# Operating mode (optional)
mode:
  # Dry-run mode (log only, don't block)
  dry_run: false
  
  # Fail-open (allow if policy evaluation fails)
  fail_open: false
  
  # Strict mode (treat warnings as errors)
  strict: true
  
  # Verbose logging
  verbose_logging: false

# Custom rules (extensible)
custom:
  require_human_approval_for_financial: true
  max_transaction_amount: 10000
  allowed_currencies: ["USD", "EUR", "GBP"]

# Signature (optional, for policy integrity)
signature:
  algorithm: "RSA-SHA256"
  signer: "ciso@corp.com"
  timestamp: "2025-01-15T10:30:00Z"
  value: "MIIB..."
```

### 2.2 Minimal Policy

```yaml
version: "1.0"
name: "Minimal Policy"

capabilities:
  allowed_tools: ["*"]
  denied_tools: []

resources:
  allowed_domains: ["*"]
  denied_domains: []
```

---

## 3. Field Definitions

### 3.1 Capabilities

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `allowed_tools` | string[] | Yes | Tools/actions the agent may use |
| `denied_tools` | string[] | Yes | Tools/actions explicitly denied |

**Special Values:**

- `"*"` — Wildcard, matches all tools
- `"web_*"` — Prefix wildcard, matches `web_search`, `web_fetch`, etc.

**Evaluation Order:**

1. Check if action matches any `denied_tools` pattern → DENY
2. Check if action matches any `allowed_tools` pattern → ALLOW
3. Otherwise → DENY (default deny)

### 3.2 Resources

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `allowed_domains` | string[] | Yes | Regex patterns for allowed URLs |
| `denied_domains` | string[] | Yes | Regex patterns for denied URLs |

**Pattern Syntax:** ECMAScript regular expressions

**Evaluation Order:**

1. Check if resource matches any `denied_domains` pattern → DENY
2. Check if resource matches any `allowed_domains` pattern → ALLOW
3. Otherwise → DENY (default deny)

### 3.3 Budget

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `max_cost_per_session` | number \| null | null | Max USD per session |
| `max_cost_per_day` | number \| null | null | Max USD per day |
| `max_cost_per_month` | number \| null | null | Max USD per month |
| `max_tokens_per_call` | integer \| null | null | Max tokens per LLM call |
| `max_calls_per_minute` | integer \| null | null | Rate limit |
| `max_concurrent_operations` | integer \| null | null | Concurrency limit |

**Null Values:** `null` means unlimited.

### 3.4 Spawning

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `may_spawn_children` | boolean | true | Can spawn child agents |
| `max_child_depth` | integer | 3 | Maximum generation depth |
| `child_capability_mode` | string | "decay" | How children inherit capabilities |
| `child_denied_capabilities` | string[] | [] | Capabilities children cannot have |

**Child Capability Modes:**

| Mode | Behavior |
|------|----------|
| `decay` | Child capabilities ⊆ parent capabilities |
| `explicit` | Child has only capabilities explicitly granted |
| `inherit` | Child has same capabilities as parent (not recommended) |

---

## 4. Policy Inheritance

### 4.1 Extends Directive

Policies can inherit from other policies:

```yaml
# .aigrc/policies/high-risk.yaml
version: "1.0"
name: "High-Risk Policy"
extends: "production.yaml"

# Override specific fields
capabilities:
  allowed_tools:
    - database_read  # More restrictive than production
  denied_tools:
    - web_search
    - send_email

budget:
  max_cost_per_session: 5.00  # Lower than production
```

### 4.2 Merge Rules

When policies are merged (child extends parent):

| Field Type | Merge Behavior |
|------------|----------------|
| Scalars (string, number, boolean) | Child overrides parent |
| Arrays | Child replaces parent entirely |
| Objects | Deep merge (recursive) |

**Exception:** `denied_*` arrays are **merged** (union), not replaced:

```yaml
# Parent
denied_tools: [shell_exec]

# Child  
denied_tools: [file_write]

# Result
denied_tools: [shell_exec, file_write]  # Union
```

### 4.3 Inheritance Chain

```
base.yaml
    ↓ extends
production.yaml
    ↓ extends
high-risk.yaml
    ↓ extends
fin-agent.policy.yaml
```

**Maximum depth:** 5 levels (to prevent circular references)

---

## 5. Policy Selection

### 5.1 Selection Algorithm

```
function selectPolicy(identity: RuntimeIdentity): Policy {
    policies = []
    
    // 1. Always start with default
    policies.push(loadPolicy("default.yaml"))
    
    // 2. Add environment-specific
    env = getenv("AIGRC_ENV") || getenv("NODE_ENV")
    if exists(f"{env}.yaml"):
        policies.push(loadPolicy(f"{env}.yaml"))
    
    // 3. Add risk-level specific
    riskPolicy = findPolicyForRiskLevel(identity.risk_level)
    if riskPolicy:
        policies.push(riskPolicy)
    
    // 4. Add asset-specific (from Asset Card)
    if identity.asset_card.policy:
        policies.push(loadPolicy(identity.asset_card.policy))
    
    // 5. Merge all policies (later overrides earlier)
    return mergePolicies(policies)
}
```

### 5.2 Policy Matching

Policies can declare which assets they apply to:

```yaml
# high-risk.yaml
applies_to:
  risk_levels: [high]

# financial.yaml
applies_to:
  assets:
    - fin-agent-001
    - fin-agent-002
    - credit-scorer
```

---

## 6. JSON Schema

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$id": "https://aigrc.dev/schemas/policy.json",
  "title": "AIGRC Policy",
  "type": "object",
  "required": ["version", "name", "capabilities", "resources"],
  "properties": {
    "version": {
      "type": "string",
      "enum": ["1.0"]
    },
    "name": {
      "type": "string",
      "minLength": 1
    },
    "description": {
      "type": "string"
    },
    "extends": {
      "type": "string",
      "description": "Parent policy filename"
    },
    "applies_to": {
      "type": "object",
      "properties": {
        "risk_levels": {
          "type": "array",
          "items": {
            "type": "string",
            "enum": ["minimal", "limited", "high", "unacceptable"]
          }
        },
        "assets": {
          "type": "array",
          "items": { "type": "string" }
        }
      }
    },
    "capabilities": {
      "type": "object",
      "required": ["allowed_tools", "denied_tools"],
      "properties": {
        "allowed_tools": {
          "type": "array",
          "items": { "type": "string" }
        },
        "denied_tools": {
          "type": "array",
          "items": { "type": "string" }
        }
      }
    },
    "resources": {
      "type": "object",
      "required": ["allowed_domains", "denied_domains"],
      "properties": {
        "allowed_domains": {
          "type": "array",
          "items": { "type": "string" }
        },
        "denied_domains": {
          "type": "array",
          "items": { "type": "string" }
        }
      }
    },
    "models": {
      "type": "object",
      "properties": {
        "allowed_models": {
          "type": "array",
          "items": { "type": "string" }
        },
        "denied_models": {
          "type": "array",
          "items": { "type": "string" }
        }
      }
    },
    "budget": {
      "type": "object",
      "properties": {
        "max_cost_per_session": { "type": ["number", "null"] },
        "max_cost_per_day": { "type": ["number", "null"] },
        "max_cost_per_month": { "type": ["number", "null"] },
        "max_tokens_per_call": { "type": ["integer", "null"] },
        "max_calls_per_minute": { "type": ["integer", "null"] },
        "max_concurrent_operations": { "type": ["integer", "null"] }
      }
    },
    "schedule": {
      "type": "object",
      "properties": {
        "allowed_hours": {
          "type": "object",
          "properties": {
            "start": { "type": "string", "pattern": "^[0-2][0-9]:[0-5][0-9]$" },
            "end": { "type": "string", "pattern": "^[0-2][0-9]:[0-5][0-9]$" },
            "timezone": { "type": "string" }
          }
        },
        "allowed_days": {
          "type": "array",
          "items": { "type": "integer", "minimum": 0, "maximum": 6 }
        },
        "blackout_windows": {
          "type": "array",
          "items": {
            "type": "object",
            "required": ["start", "end"],
            "properties": {
              "start": { "type": "string", "format": "date-time" },
              "end": { "type": "string", "format": "date-time" },
              "reason": { "type": "string" }
            }
          }
        }
      }
    },
    "spawning": {
      "type": "object",
      "properties": {
        "may_spawn_children": { "type": "boolean", "default": true },
        "max_child_depth": { "type": "integer", "minimum": 0, "default": 3 },
        "child_capability_mode": {
          "type": "string",
          "enum": ["decay", "explicit", "inherit"],
          "default": "decay"
        },
        "child_denied_capabilities": {
          "type": "array",
          "items": { "type": "string" }
        }
      }
    },
    "data": {
      "type": "object",
      "properties": {
        "allow_pii_processing": { "type": "boolean", "default": false },
        "allowed_data_classifications": {
          "type": "array",
          "items": { "type": "string" }
        },
        "denied_data_classifications": {
          "type": "array",
          "items": { "type": "string" }
        }
      }
    },
    "mode": {
      "type": "object",
      "properties": {
        "dry_run": { "type": "boolean", "default": false },
        "fail_open": { "type": "boolean", "default": false },
        "strict": { "type": "boolean", "default": false },
        "verbose_logging": { "type": "boolean", "default": false }
      }
    },
    "custom": {
      "type": "object",
      "additionalProperties": true
    },
    "signature": {
      "type": "object",
      "properties": {
        "algorithm": { "type": "string" },
        "signer": { "type": "string" },
        "timestamp": { "type": "string", "format": "date-time" },
        "value": { "type": "string" }
      }
    }
  }
}
```

---

## 7. Examples

### 7.1 Development Policy

```yaml
version: "1.0"
name: "Development Policy"
description: "Permissive policy for local development"

capabilities:
  allowed_tools: ["*"]
  denied_tools:
    - production_deploy
    - delete_database

resources:
  allowed_domains: ["*"]
  denied_domains:
    - ".*\\.prod\\.company\\.com$"

budget:
  max_cost_per_session: 1.00
  max_cost_per_day: 10.00

mode:
  dry_run: true
  verbose_logging: true
```

### 7.2 Production Policy

```yaml
version: "1.0"
name: "Production Policy"
description: "Restrictive policy for production"

capabilities:
  allowed_tools:
    - web_search
    - database_read
    - send_notification
  denied_tools:
    - shell_exec
    - file_write
    - code_execution

resources:
  allowed_domains:
    - "^https://api\\.company\\.com/.*"
    - "^https://api\\.openai\\.com/.*"
  denied_domains:
    - "^https?://localhost.*"
    - ".*\\.internal\\..*"

budget:
  max_cost_per_session: 10.00
  max_cost_per_day: 100.00
  max_tokens_per_call: 4096
  max_calls_per_minute: 30

schedule:
  allowed_hours:
    start: "06:00"
    end: "23:00"
    timezone: "UTC"

spawning:
  may_spawn_children: true
  max_child_depth: 2
  child_capability_mode: "decay"

mode:
  dry_run: false
  fail_open: false
  strict: true
```

### 7.3 High-Risk Policy

```yaml
version: "1.0"
name: "High-Risk Policy"
extends: "production.yaml"

applies_to:
  risk_levels: [high]

capabilities:
  allowed_tools:
    - database_read  # Only read access
  denied_tools:
    - web_search
    - send_email
    - external_api

budget:
  max_cost_per_session: 5.00
  max_cost_per_day: 25.00

spawning:
  may_spawn_children: false

data:
  allow_pii_processing: false
  denied_data_classifications:
    - confidential
    - restricted
```

---

## 8. Implementation Requirements

### 8.1 MUST (Required)

Implementations MUST:

1. Validate policies against JSON Schema
2. Implement deny-overrides-allow for capabilities and resources
3. Support policy inheritance via `extends`
4. Merge `denied_*` arrays as union
5. Enforce budget limits when specified

### 8.2 SHOULD (Recommended)

Implementations SHOULD:

1. Support wildcard patterns (`*`, `prefix_*`)
2. Cache compiled regex patterns
3. Support signature verification
4. Log policy evaluation decisions
5. Support hot reload of policies

### 8.3 MAY (Optional)

Implementations MAY:

1. Support external policy sources (API, database)
2. Support policy versioning beyond filename
3. Support custom rule plugins
4. Support schedule-based rules

---

## Appendix A: Changelog

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0-draft | 2025-12-29 | Initial draft |
