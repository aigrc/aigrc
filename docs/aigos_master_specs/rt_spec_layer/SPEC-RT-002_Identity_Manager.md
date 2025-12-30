# SPEC-RT-002: Identity Manager Specification

## Document Information

| Field | Value |
|-------|-------|
| **Spec ID** | SPEC-RT-002 |
| **Version** | 1.0.0-draft |
| **Status** | Draft |
| **Layer** | Layer 3: Kinetic Governance |
| **Parent Spec** | KINETIC_GOVERNANCE_OVERVIEW.md |
| **Last Updated** | 2025-12-29 |
| **Authors** | GovOS Team |
| **License** | Apache 2.0 |

---

## Dependencies

### Required Specifications

| Spec ID | Name | Why Required |
|---------|------|--------------|
| SPEC-FMT-002 | Asset Card Schema | Identity references `asset_id` from Asset Card |
| SPEC-PRT-001 | Golden Thread Protocol | Hash computation and verification |

### Optional Specifications

| Spec ID | Name | Enhancement |
|---------|------|-------------|
| SPEC-RT-004 | Telemetry Emitter | Emit identity creation spans |
| SPEC-RT-005 | Kill Switch | Identity revocation |
| SPEC-RT-006 | Capability Decay | Lineage-based permission inheritance |

---

## Abstract

The Identity Manager is responsible for establishing and managing the cryptographic identity of AI agents at runtime. It creates `RuntimeIdentity` objects that link running agent instances to their static governance artifacts (Asset Cards) through the Golden Thread protocol, enabling verification that agents are authorized to operate and tracking parent-child relationships in multi-agent systems.

---

## 1. Introduction

### 1.1 Purpose

The Identity Manager answers the fundamental governance question: **"Who is this agent, and is it authorized to run?"**

In static governance, we document AI systems with Asset Cards. But documentation alone cannot prove that a running agent instance corresponds to an approved asset. The Identity Manager bridges this gap by:

1. Creating cryptographic identities for agent instances
2. Verifying authorization through Golden Thread hashes
3. Tracking lineage when agents spawn child agents
4. Providing identity context to other runtime components

### 1.2 Scope

This specification defines:

- The `RuntimeIdentity` data structure
- The `IdentityManager` class interface
- Identity lifecycle (creation, verification, propagation)
- Lineage tracking for multi-agent systems
- Error handling and fallback modes

This specification does NOT define:

- Golden Thread hash computation (see SPEC-PRT-001)
- Asset Card format (see SPEC-FMT-002)
- Policy enforcement based on identity (see SPEC-RT-003)

### 1.3 Terminology

| Term | Definition |
|------|------------|
| **RuntimeIdentity** | The cryptographic identity of a running agent instance |
| **Instance ID** | Unique identifier for this specific runtime instance |
| **Asset ID** | Reference to the Asset Card defining this agent type |
| **Golden Thread Hash** | Cryptographic proof linking runtime to business authorization |
| **Lineage** | The parent-child relationship chain of spawned agents |
| **Generation Depth** | How many levels of spawning separate this agent from the root |

---

## 2. Architecture

### 2.1 Component Diagram

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                              IDENTITY MANAGER ARCHITECTURE                               │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                         │
│   ┌───────────────────────────────────────────────────────────────────────────────┐    │
│   │                           IdentityManager                                      │    │
│   │                                                                                │    │
│   │   ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐              │    │
│   │   │    create()     │  │    verify()     │  │   propagate()   │              │    │
│   │   │                 │  │                 │  │                 │              │    │
│   │   │ Creates new     │  │ Verifies Golden │  │ Creates child   │              │    │
│   │   │ RuntimeIdentity │  │ Thread hash     │  │ identity        │              │    │
│   │   └────────┬────────┘  └────────┬────────┘  └────────┬────────┘              │    │
│   │            │                    │                    │                        │    │
│   │            └────────────────────┼────────────────────┘                        │    │
│   │                                 │                                             │    │
│   │                                 ▼                                             │    │
│   │                    ┌────────────────────────┐                                 │    │
│   │                    │    RuntimeIdentity     │                                 │    │
│   │                    │                        │                                 │    │
│   │                    │  • instance_id         │                                 │    │
│   │                    │  • asset_id            │                                 │    │
│   │                    │  • golden_thread_hash  │                                 │    │
│   │                    │  • risk_level          │                                 │    │
│   │                    │  • lineage             │                                 │    │
│   │                    │  • capabilities        │                                 │    │
│   │                    │  • created_at          │                                 │    │
│   │                    │  • verified            │                                 │    │
│   │                    └────────────────────────┘                                 │    │
│   │                                                                                │    │
│   └───────────────────────────────────────────────────────────────────────────────┘    │
│                                                                                         │
│   EXTERNAL DEPENDENCIES                                                                 │
│   ─────────────────────                                                                 │
│                                                                                         │
│   ┌─────────────────┐         ┌─────────────────┐         ┌─────────────────┐          │
│   │   Asset Card    │         │  Golden Thread  │         │   Policy File   │          │
│   │   (.aigrc/      │         │   Protocol      │         │   (.aigrc/      │          │
│   │    cards/*.yaml)│         │   (SPEC-PRT-001)│         │    policies/)   │          │
│   └─────────────────┘         └─────────────────┘         └─────────────────┘          │
│                                                                                         │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

### 2.2 Data Flow

```
1. Agent startup
   │
   ▼
2. IdentityManager.create(assetId, configPath)
   │
   ├──► Load Asset Card from configPath
   │
   ├──► Extract golden_thread fields
   │    (jira_ticket, approved_by, approved_at)
   │
   ├──► Compute golden_thread_hash (SPEC-PRT-001)
   │
   ├──► Compare with stored hash in Asset Card
   │    │
   │    ├── Match → verified = true
   │    │
   │    └── Mismatch → verified = false, mode = SANDBOX
   │
   ├──► Load capabilities_manifest from policy
   │
   └──► Return RuntimeIdentity
   │
   ▼
3. RuntimeIdentity available to Policy Engine, Telemetry, etc.
```

---

## 3. Data Structures

### 3.1 RuntimeIdentity

The core data structure representing an agent's runtime identity.

#### 3.1.1 TypeScript Definition

```typescript
/**
 * The cryptographic identity of a running AI agent instance.
 */
interface RuntimeIdentity {
  /**
   * Unique identifier for this specific runtime instance.
   * Format: UUIDv4
   * Generated fresh on each agent startup.
   */
  instance_id: string;

  /**
   * Reference to the Asset Card defining this agent type.
   * MUST match the `id` field in the Asset Card.
   */
  asset_id: string;

  /**
   * Human-readable name from Asset Card.
   */
  asset_name: string;

  /**
   * Version of the asset from Asset Card.
   */
  asset_version: string;

  /**
   * Cryptographic hash linking this instance to business authorization.
   * Computed per SPEC-PRT-001 Golden Thread Protocol.
   * Format: "sha256:<hex-encoded-hash>"
   */
  golden_thread_hash: string;

  /**
   * The Golden Thread components (for traceability).
   */
  golden_thread: {
    /** Jira/ADO ticket ID (e.g., "FIN-1234") */
    jira_ticket: string;
    /** Email of approver */
    approved_by: string;
    /** ISO 8601 timestamp of approval */
    approved_at: string;
    /** Optional: signature of approval */
    approver_signature?: string;
  };

  /**
   * Risk classification level from Asset Card.
   */
  risk_level: 'minimal' | 'limited' | 'high' | 'unacceptable';

  /**
   * Parent-child relationship information.
   */
  lineage: {
    /** Instance ID of parent agent, or null for root agents */
    parent_instance_id: string | null;
    /** How many generations from root (0 = root) */
    generation_depth: number;
    /** Chain of ancestor instance IDs */
    ancestor_chain: string[];
  };

  /**
   * What this agent is allowed to do (from policy).
   * Loaded from .aigrc/policies/ at startup.
   */
  capabilities_manifest: CapabilitiesManifest;

  /**
   * ISO 8601 timestamp when this identity was created.
   */
  created_at: string;

  /**
   * Whether the Golden Thread hash was successfully verified.
   */
  verified: boolean;

  /**
   * Operating mode based on verification status.
   */
  mode: 'NORMAL' | 'SANDBOX' | 'RESTRICTED';
}
```

#### 3.1.2 CapabilitiesManifest

```typescript
/**
 * Defines what an agent is permitted to do.
 */
interface CapabilitiesManifest {
  /**
   * List of tools/actions the agent may invoke.
   * Empty array means no tools allowed.
   */
  allowed_tools: string[];

  /**
   * List of tools/actions explicitly denied.
   * Takes precedence over allowed_tools.
   */
  denied_tools: string[];

  /**
   * Regex patterns for allowed domains/URLs.
   */
  allowed_domains: string[];

  /**
   * Regex patterns for denied domains/URLs.
   * Takes precedence over allowed_domains.
   */
  denied_domains: string[];

  /**
   * Maximum cost allowed per session (USD).
   * null = unlimited.
   */
  max_cost_per_session: number | null;

  /**
   * Maximum cost allowed per day (USD).
   * null = unlimited.
   */
  max_cost_per_day: number | null;

  /**
   * Maximum tokens per LLM call.
   * null = unlimited.
   */
  max_tokens_per_call: number | null;

  /**
   * Whether the agent may spawn child agents.
   */
  may_spawn_children: boolean;

  /**
   * Maximum generation depth for children.
   * 0 = no children allowed.
   */
  max_child_depth: number;

  /**
   * Custom capability flags (extensible).
   */
  custom: Record<string, boolean | string | number>;
}
```

### 3.2 JSON Schema

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$id": "https://aigrc.dev/schemas/runtime-identity.json",
  "title": "RuntimeIdentity",
  "type": "object",
  "required": [
    "instance_id",
    "asset_id",
    "asset_name",
    "golden_thread_hash",
    "golden_thread",
    "risk_level",
    "lineage",
    "capabilities_manifest",
    "created_at",
    "verified",
    "mode"
  ],
  "properties": {
    "instance_id": {
      "type": "string",
      "format": "uuid"
    },
    "asset_id": {
      "type": "string",
      "minLength": 1
    },
    "asset_name": {
      "type": "string"
    },
    "asset_version": {
      "type": "string"
    },
    "golden_thread_hash": {
      "type": "string",
      "pattern": "^sha256:[a-f0-9]{64}$"
    },
    "golden_thread": {
      "type": "object",
      "required": ["jira_ticket", "approved_by", "approved_at"],
      "properties": {
        "jira_ticket": { "type": "string" },
        "approved_by": { "type": "string", "format": "email" },
        "approved_at": { "type": "string", "format": "date-time" },
        "approver_signature": { "type": "string" }
      }
    },
    "risk_level": {
      "type": "string",
      "enum": ["minimal", "limited", "high", "unacceptable"]
    },
    "lineage": {
      "type": "object",
      "required": ["parent_instance_id", "generation_depth", "ancestor_chain"],
      "properties": {
        "parent_instance_id": { "type": ["string", "null"] },
        "generation_depth": { "type": "integer", "minimum": 0 },
        "ancestor_chain": {
          "type": "array",
          "items": { "type": "string" }
        }
      }
    },
    "capabilities_manifest": {
      "$ref": "#/definitions/CapabilitiesManifest"
    },
    "created_at": {
      "type": "string",
      "format": "date-time"
    },
    "verified": {
      "type": "boolean"
    },
    "mode": {
      "type": "string",
      "enum": ["NORMAL", "SANDBOX", "RESTRICTED"]
    }
  },
  "definitions": {
    "CapabilitiesManifest": {
      "type": "object",
      "properties": {
        "allowed_tools": {
          "type": "array",
          "items": { "type": "string" }
        },
        "denied_tools": {
          "type": "array",
          "items": { "type": "string" }
        },
        "allowed_domains": {
          "type": "array",
          "items": { "type": "string" }
        },
        "denied_domains": {
          "type": "array",
          "items": { "type": "string" }
        },
        "max_cost_per_session": { "type": ["number", "null"] },
        "max_cost_per_day": { "type": ["number", "null"] },
        "max_tokens_per_call": { "type": ["integer", "null"] },
        "may_spawn_children": { "type": "boolean" },
        "max_child_depth": { "type": "integer", "minimum": 0 },
        "custom": { "type": "object" }
      }
    }
  }
}
```

---

## 4. Interfaces

### 4.1 IdentityManager Class

#### 4.1.1 TypeScript Interface

```typescript
/**
 * Manages RuntimeIdentity lifecycle for AI agents.
 */
interface IIdentityManager {
  /**
   * Creates a new RuntimeIdentity for an agent.
   * 
   * @param options - Identity creation options
   * @returns The created RuntimeIdentity
   * @throws IdentityCreationError if Asset Card cannot be loaded
   */
  create(options: IdentityCreateOptions): Promise<RuntimeIdentity>;

  /**
   * Verifies that a RuntimeIdentity's Golden Thread is valid.
   * 
   * @param identity - The identity to verify
   * @returns Verification result with details
   */
  verify(identity: RuntimeIdentity): Promise<VerificationResult>;

  /**
   * Creates a child identity for spawned agents.
   * 
   * @param parentIdentity - The parent agent's identity
   * @param childAssetId - Asset ID for the child agent
   * @returns The child's RuntimeIdentity
   * @throws CapabilityDecayError if child would exceed parent capabilities
   */
  propagate(
    parentIdentity: RuntimeIdentity,
    childAssetId: string
  ): Promise<RuntimeIdentity>;

  /**
   * Gets the current identity (for this agent instance).
   */
  getCurrentIdentity(): RuntimeIdentity | null;

  /**
   * Revokes an identity (called by Kill Switch).
   * 
   * @param instanceId - The instance to revoke
   * @param reason - Why the identity is being revoked
   */
  revoke(instanceId: string, reason: string): Promise<void>;
}

interface IdentityCreateOptions {
  /** Asset ID from Asset Card */
  assetId: string;
  
  /** Path to Asset Card YAML file */
  configPath: string;
  
  /** Optional: Path to policy file (defaults to .aigrc/policies/default.yaml) */
  policyPath?: string;
  
  /** Optional: Parent identity if this is a child agent */
  parentIdentity?: RuntimeIdentity;
  
  /** Optional: Override capabilities (for testing) */
  capabilitiesOverride?: Partial<CapabilitiesManifest>;
}

interface VerificationResult {
  /** Whether verification passed */
  valid: boolean;
  
  /** Verification timestamp */
  verified_at: string;
  
  /** What was checked */
  checks: {
    asset_card_exists: boolean;
    golden_thread_hash_matches: boolean;
    signature_valid: boolean;
    not_expired: boolean;
    not_revoked: boolean;
  };
  
  /** If invalid, why */
  failure_reason?: string;
  
  /** Recommended mode based on verification */
  recommended_mode: 'NORMAL' | 'SANDBOX' | 'RESTRICTED';
}
```

#### 4.1.2 Python Interface

```python
from dataclasses import dataclass
from typing import Optional, Dict, Any
from datetime import datetime

@dataclass
class RuntimeIdentity:
    instance_id: str
    asset_id: str
    asset_name: str
    asset_version: str
    golden_thread_hash: str
    golden_thread: Dict[str, str]
    risk_level: str
    lineage: Dict[str, Any]
    capabilities_manifest: Dict[str, Any]
    created_at: str
    verified: bool
    mode: str

class IdentityManager:
    async def create(
        self,
        asset_id: str,
        config_path: str,
        policy_path: Optional[str] = None,
        parent_identity: Optional[RuntimeIdentity] = None,
    ) -> RuntimeIdentity:
        """Creates a new RuntimeIdentity for an agent."""
        ...
    
    async def verify(
        self,
        identity: RuntimeIdentity
    ) -> VerificationResult:
        """Verifies that a RuntimeIdentity's Golden Thread is valid."""
        ...
    
    async def propagate(
        self,
        parent_identity: RuntimeIdentity,
        child_asset_id: str,
    ) -> RuntimeIdentity:
        """Creates a child identity for spawned agents."""
        ...
    
    def get_current_identity(self) -> Optional[RuntimeIdentity]:
        """Gets the current identity (for this agent instance)."""
        ...
    
    async def revoke(
        self,
        instance_id: str,
        reason: str
    ) -> None:
        """Revokes an identity (called by Kill Switch)."""
        ...
```

### 4.2 Events Emitted

The Identity Manager SHOULD emit events for observability:

| Event | When | Payload |
|-------|------|---------|
| `identity.created` | After create() succeeds | `{ instance_id, asset_id, verified, mode }` |
| `identity.verification.success` | After verify() passes | `{ instance_id, checks }` |
| `identity.verification.failure` | After verify() fails | `{ instance_id, failure_reason }` |
| `identity.propagated` | After propagate() succeeds | `{ parent_id, child_id, generation_depth }` |
| `identity.revoked` | After revoke() | `{ instance_id, reason }` |

### 4.3 Configuration

The Identity Manager reads configuration from `.aigrc.yaml`:

```yaml
# .aigrc.yaml
version: "1.0"

runtime:
  identity:
    # Whether to verify Golden Thread on startup (default: true)
    verify_on_startup: true
    
    # What to do if verification fails
    # Options: SANDBOX (restricted), FAIL (throw error)
    verification_failure_mode: SANDBOX
    
    # Maximum allowed generation depth for child agents
    max_generation_depth: 5
    
    # Whether to allow unverified identities
    allow_unverified: false
    
    # Public key for signature verification (path or inline)
    verification_public_key: .aigrc/keys/public.pem
```

---

## 5. Behavior

### 5.1 Identity Creation Lifecycle

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                           IDENTITY CREATION LIFECYCLE                                    │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                         │
│   1. LOAD ASSET CARD                                                                    │
│      │                                                                                  │
│      ├── Read configPath (.aigrc/cards/{asset}.yaml)                                    │
│      ├── Parse YAML                                                                     │
│      ├── Validate against Asset Card Schema (SPEC-FMT-002)                              │
│      └── Extract: id, name, version, golden_thread, classification                      │
│      │                                                                                  │
│      │  If file not found or invalid:                                                   │
│      │  └── Throw IdentityCreationError                                                 │
│      │                                                                                  │
│      ▼                                                                                  │
│   2. COMPUTE GOLDEN THREAD HASH                                                         │
│      │                                                                                  │
│      ├── Extract components: jira_ticket, approved_by, approved_at                      │
│      ├── Canonicalize (per SPEC-PRT-001)                                                │
│      ├── Compute: sha256(canonical_string)                                              │
│      └── Format: "sha256:<hex>"                                                         │
│      │                                                                                  │
│      ▼                                                                                  │
│   3. VERIFY HASH (if verify_on_startup = true)                                          │
│      │                                                                                  │
│      ├── Compare computed hash with stored hash in Asset Card                           │
│      │   │                                                                              │
│      │   ├── Match → verified = true, mode = NORMAL                                     │
│      │   │                                                                              │
│      │   └── Mismatch → verified = false                                                │
│      │       │                                                                          │
│      │       ├── verification_failure_mode = SANDBOX                                    │
│      │       │   └── mode = SANDBOX, continue                                           │
│      │       │                                                                          │
│      │       └── verification_failure_mode = FAIL                                       │
│      │           └── Throw GoldenThreadVerificationError                                │
│      │                                                                                  │
│      ├── If signature present, verify signature (optional)                              │
│      │                                                                                  │
│      ▼                                                                                  │
│   4. LOAD CAPABILITIES                                                                  │
│      │                                                                                  │
│      ├── Read policy file (.aigrc/policies/*.yaml)                                      │
│      ├── Match policy to asset (by asset_id or risk_level)                              │
│      └── Populate capabilities_manifest                                                 │
│      │                                                                                  │
│      │  If policy not found:                                                            │
│      │  └── Use default restrictive policy                                              │
│      │                                                                                  │
│      ▼                                                                                  │
│   5. CREATE RUNTIME IDENTITY                                                            │
│      │                                                                                  │
│      ├── Generate instance_id (UUIDv4)                                                  │
│      ├── Set created_at (ISO 8601)                                                      │
│      ├── Set lineage (parent_instance_id = null for root)                               │
│      └── Assemble RuntimeIdentity object                                                │
│      │                                                                                  │
│      ▼                                                                                  │
│   6. EMIT EVENT                                                                         │
│      │                                                                                  │
│      └── Emit identity.created event                                                    │
│      │                                                                                  │
│      ▼                                                                                  │
│   7. RETURN                                                                             │
│                                                                                         │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

### 5.2 Lineage Propagation

When an agent spawns a child agent:

```typescript
// Parent agent spawns child
const childIdentity = await identityManager.propagate(
  parentIdentity,
  'research-agent'
);

// Child identity inherits and restricts:
// - generation_depth = parent.generation_depth + 1
// - ancestor_chain = [...parent.ancestor_chain, parent.instance_id]
// - capabilities ⊆ parent.capabilities (Capability Decay)
```

**Rules:**

1. `generation_depth` MUST increment by 1
2. `ancestor_chain` MUST include all ancestors plus parent
3. `capabilities_manifest` MUST be subset of parent (see SPEC-RT-006)
4. If `parent.may_spawn_children = false`, propagation MUST fail
5. If `generation_depth >= max_child_depth`, propagation MUST fail

### 5.3 Operating Modes

| Mode | When | Behavior |
|------|------|----------|
| **NORMAL** | Verification passed | Full capabilities enforced |
| **SANDBOX** | Verification failed (soft fail) | Restricted capabilities, no external access |
| **RESTRICTED** | Kill switch active or revoked | Minimal capabilities, preparing for shutdown |

### 5.4 Error Handling

| Error | Cause | Recovery |
|-------|-------|----------|
| `IdentityCreationError` | Asset Card not found or invalid | Cannot proceed—configuration error |
| `GoldenThreadVerificationError` | Hash mismatch (strict mode) | Cannot proceed—authorization error |
| `CapabilityDecayError` | Child exceeds parent capabilities | Fail spawn, log violation |
| `MaxDepthExceededError` | Child exceeds max_child_depth | Fail spawn, log violation |
| `IdentityRevokedError` | Identity was revoked by kill switch | Shutdown gracefully |

---

## 6. Implementation Requirements

### 6.1 MUST (Required)

Implementations MUST:

1. Generate unique `instance_id` for each identity (UUIDv4)
2. Compute `golden_thread_hash` per SPEC-PRT-001
3. Load `capabilities_manifest` from policy files
4. Track lineage for spawned agents
5. Validate Asset Card against schema before use
6. Return `verified = false` if hash verification fails
7. Increment `generation_depth` for child identities
8. Include all ancestors in `ancestor_chain`

### 6.2 SHOULD (Recommended)

Implementations SHOULD:

1. Cache loaded Asset Cards for performance
2. Emit events for identity lifecycle
3. Support signature verification for Golden Thread
4. Log verification failures with details
5. Provide mode-specific capability restrictions

### 6.3 MAY (Optional)

Implementations MAY:

1. Support multiple signature algorithms (RSA, ECDSA)
2. Implement identity caching across restarts
3. Support external identity providers
4. Provide identity migration tools

---

## 7. Security Considerations

### 7.1 Threat Model

| Threat | Attack Vector | Mitigation |
|--------|---------------|------------|
| Identity spoofing | Forge RuntimeIdentity | Golden Thread hash verification |
| Asset Card tampering | Modify Asset Card YAML | Signature verification |
| Privilege escalation | Child claims more capabilities | Capability Decay enforcement |
| Lineage manipulation | Fake parent identity | Verify parent exists in registry |

### 7.2 Security Requirements

1. `instance_id` MUST be cryptographically random (UUIDv4)
2. `golden_thread_hash` MUST use SHA-256 minimum
3. Signature verification SHOULD use RSA-2048 or ECDSA P-256 minimum
4. Private keys MUST NOT be stored in Asset Cards
5. Verification failures MUST be logged with timestamps

---

## 8. Conformance

### 8.1 Level 1 (Minimal)

- MUST implement `create()` with basic identity fields
- MUST compute `golden_thread_hash`
- MUST load capabilities from policy

### 8.2 Level 2 (Standard)

- MUST satisfy Level 1
- MUST implement `verify()` with hash comparison
- MUST implement `propagate()` with lineage tracking
- MUST enforce `max_child_depth`

### 8.3 Level 3 (Full)

- MUST satisfy Level 2
- MUST implement signature verification
- MUST implement `revoke()`
- MUST emit all specified events

---

## 9. Examples

### 9.1 Creating a Root Identity

```typescript
import { IdentityManager } from '@aigos/runtime';

const identityManager = new IdentityManager();

const identity = await identityManager.create({
  assetId: 'fin-agent-001',
  configPath: '.aigrc/cards/fin-agent-001.yaml',
  policyPath: '.aigrc/policies/production.yaml',
});

console.log(identity);
// {
//   instance_id: "550e8400-e29b-41d4-a716-446655440000",
//   asset_id: "fin-agent-001",
//   asset_name: "Financial Analysis Agent",
//   asset_version: "1.2.0",
//   golden_thread_hash: "sha256:a1b2c3d4...",
//   golden_thread: {
//     jira_ticket: "FIN-1234",
//     approved_by: "ciso@corp.com",
//     approved_at: "2025-01-15T10:30:00Z"
//   },
//   risk_level: "high",
//   lineage: {
//     parent_instance_id: null,
//     generation_depth: 0,
//     ancestor_chain: []
//   },
//   capabilities_manifest: {
//     allowed_tools: ["web_search", "calculator"],
//     denied_domains: ["*.gov", "*.mil"],
//     max_cost_per_session: 10.00,
//     may_spawn_children: true,
//     max_child_depth: 2
//   },
//   created_at: "2025-12-29T15:00:00Z",
//   verified: true,
//   mode: "NORMAL"
// }
```

### 9.2 Spawning a Child Agent

```typescript
// Parent agent spawns a research sub-agent
const childIdentity = await identityManager.propagate(
  parentIdentity,
  'research-agent'
);

console.log(childIdentity.lineage);
// {
//   parent_instance_id: "550e8400-e29b-41d4-a716-446655440000",
//   generation_depth: 1,
//   ancestor_chain: ["550e8400-e29b-41d4-a716-446655440000"]
// }

// Child capabilities are subset of parent (Capability Decay)
console.log(childIdentity.capabilities_manifest);
// {
//   allowed_tools: ["web_search"],  // Reduced from parent
//   may_spawn_children: false,      // Cannot spawn further
//   ...
// }
```

### 9.3 Handling Verification Failure

```typescript
const identity = await identityManager.create({
  assetId: 'legacy-agent',
  configPath: '.aigrc/cards/legacy-agent.yaml',
});

if (!identity.verified) {
  console.warn(`Agent running in ${identity.mode} mode`);
  console.warn('Golden Thread verification failed');
  
  // In SANDBOX mode, certain operations will be blocked
  // by the Policy Engine
}
```

---

## Appendix A: Test Vectors

### A.1 Golden Thread Hash Computation

**Input:**
```yaml
golden_thread:
  jira_ticket: "FIN-1234"
  approved_by: "ciso@corp.com"
  approved_at: "2025-01-15T10:30:00Z"
```

**Canonical String:**
```
FIN-1234|ciso@corp.com|2025-01-15T10:30:00Z
```

**Expected Hash:**
```
sha256:7d865e959b2466918c9863afca942d0fb89d7c9ac0c99bafc3749504ded97730
```

---

## Appendix B: Changelog

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0-draft | 2025-12-29 | Initial draft |
