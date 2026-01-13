# SPEC-PRT-003: Governance Token Protocol

## Document Information

| Field | Value |
|-------|-------|
| **Spec ID** | SPEC-PRT-003 |
| **Version** | 1.0.0-draft |
| **Status** | Draft |
| **Category** | Protocol |
| **Last Updated** | 2025-12-30 |
| **Authors** | S.Maitland Davies |
| **License** | Apache 2.0 |

---

## Dependencies

### Required Specifications

| Spec ID | Name | Why Required |
|---------|------|--------------|
| SPEC-RT-002 | Identity Manager | Source of identity claims |
| SPEC-PRT-001 | Golden Thread Protocol | Hash computation |
| SPEC-RT-005 | Kill Switch | Kill switch status claim |

### Dependent Specifications

| Spec ID | Name | Relationship |
|---------|------|--------------|
| SPEC-RT-007 | Sidecar Proxy | Token validation at network layer |
| SPEC-ADP-001 | Adapter Interface | Token injection in frameworks |

---

## Abstract

This specification defines the **Governance Token Protocol**—a cryptographic credential format and exchange mechanism that enables **Agent-to-Agent (A2A) trust** in multi-agent systems. When Agent A requests services from Agent B, they exchange Governance Tokens proving each is compliant, authorized, and under governance control. This protocol is the foundation for the **Zero-UI Economy** where agents transact without human intermediation.

---

## 1. Introduction

### 1.1 The Problem

In multi-agent systems, agents must answer three questions before trusting each other:

1. **Identity** — Who is this agent?
2. **Authority** — What is it authorized to do?
3. **Governance** — Is it under control? Can it be stopped?

Without a standard protocol, each agent framework implements ad-hoc trust—or worse, no trust at all. This creates:

- **Rogue Agent Risk** — Malicious agents impersonate legitimate ones
- **Capability Laundering** — Agents bypass restrictions via intermediaries
- **Audit Gaps** — No record of which agents collaborated
- **Kill Switch Bypass** — Terminated agents continue via proxy

### 1.2 The Solution: Governance Tokens

A **Governance Token** is a signed, short-lived credential that proves:

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                          GOVERNANCE TOKEN: PROOF OF GOVERNANCE                           │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                         │
│   "I am Agent X, authorized by Ticket Y, operating at Risk Level Z,                    │
│    with these capabilities, and I can be killed via channel W."                         │
│                                                                                         │
│   ┌─────────────────────────────────────────────────────────────────────────────────┐  │
│   │  GOVERNANCE TOKEN                                                                │  │
│   │                                                                                  │  │
│   │  Identity Claims:                                                                │  │
│   │    • instance_id: 550e8400-e29b-41d4-a716-446655440000                          │  │
│   │    • asset_id: fin-agent-001                                                     │  │
│   │    • asset_name: Financial Analysis Agent                                        │  │
│   │                                                                                  │  │
│   │  Governance Claims:                                                              │  │
│   │    • risk_level: high                                                            │  │
│   │    • golden_thread_hash: sha256:7d865e959b24...                                 │  │
│   │    • golden_thread_verified: true                                                │  │
│   │    • ticket_id: FIN-1234                                                         │  │
│   │                                                                                  │  │
│   │  Control Claims:                                                                 │  │
│   │    • kill_switch_enabled: true                                                   │  │
│   │    • kill_switch_channel: wss://ks.aigos.dev/org-123                            │  │
│   │    • mode: NORMAL                                                                │  │
│   │                                                                                  │  │
│   │  Capability Claims:                                                              │  │
│   │    • capabilities_hash: sha256:abc123...                                         │  │
│   │    • allowed_tools: [web_search, database_read]                                  │  │
│   │    • generation_depth: 0                                                         │  │
│   │                                                                                  │  │
│   │  Metadata:                                                                       │  │
│   │    • issued_at: 2025-01-15T10:30:00Z                                            │  │
│   │    • expires_at: 2025-01-15T10:35:00Z                                           │  │
│   │    • issuer: aigos-runtime                                                       │  │
│   │                                                                                  │  │
│   │  Signature: [RSA-SHA256 or ECDSA-P256]                                          │  │
│   │                                                                                  │  │
│   └─────────────────────────────────────────────────────────────────────────────────┘  │
│                                                                                         │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

### 1.3 The AIGOS Handshake

When agents communicate, they perform a **mutual authentication handshake**:

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                              THE AIGOS HANDSHAKE                                         │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                         │
│   Agent A (Requester)                                     Agent B (Provider)            │
│   ───────────────────                                     ──────────────────            │
│                                                                                         │
│   1. Generate Token A                                                                   │
│      ┌───────────────┐                                                                  │
│      │ Sign claims   │                                                                  │
│      │ with A's key  │                                                                  │
│      └───────┬───────┘                                                                  │
│              │                                                                          │
│              ▼                                                                          │
│   2. Send Request + Token A                                                             │
│      ─────────────────────────────────────────────────────▶                            │
│              │                                              │                           │
│              │                                              ▼                           │
│              │                                    3. Verify Token A                     │
│              │                                       ├── Check signature                │
│              │                                       ├── Check expiration               │
│              │                                       ├── Check risk level               │
│              │                                       ├── Check kill switch              │
│              │                                       └── Policy decision:               │
│              │                                           "Do I serve this agent?"       │
│              │                                              │                           │
│              │                                              ▼                           │
│              │                                    4. Generate Token B                   │
│              │                                       ┌───────────────┐                  │
│              │                                       │ Sign claims   │                  │
│              │                                       │ with B's key  │                  │
│              │                                       └───────┬───────┘                  │
│              │                                               │                          │
│   5. Receive Response + Token B                              │                          │
│      ◀─────────────────────────────────────────────────────────                        │
│              │                                                                          │
│              ▼                                                                          │
│   6. Verify Token B                                                                     │
│      ├── Check signature                                                                │
│      ├── Check B's governance                                                           │
│      └── Trust established                                                              │
│                                                                                         │
│   ════════════════════════════════════════════════════════════════════════════════════ │
│                                                                                         │
│   RESULT: Both agents have cryptographic proof of mutual governance compliance          │
│                                                                                         │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

### 1.4 Design Principles

1. **Short-Lived** — Tokens expire in minutes, not days
2. **Self-Contained** — No external lookup required to validate
3. **Mutual** — Both parties prove governance, not just requester
4. **Auditable** — Tokens can be logged for forensic analysis
5. **Kill-Switch Aware** — Tokens prove agent can be terminated

### 1.5 Scope

This specification defines:

- Governance Token format (JWT-based)
- Token generation and signing
- Token validation rules
- The AIGOS Handshake protocol
- Trust policies for A2A interaction
- Integration with existing specs

---

## 2. Token Format

### 2.1 Structure

Governance Tokens use JWT (JSON Web Token) format:

```
base64url(header).base64url(payload).base64url(signature)
```

### 2.2 Header

```json
{
  "alg": "ES256",
  "typ": "AIGOS-GOV+jwt",
  "kid": "agent-550e8400-e29b-41d4-a716-446655440000"
}
```

| Field | Type | Description |
|-------|------|-------------|
| `alg` | string | Signing algorithm (ES256, RS256) |
| `typ` | string | Token type (MUST be `AIGOS-GOV+jwt`) |
| `kid` | string | Key identifier for signature verification |

### 2.3 Payload (Claims)

```json
{
  "iss": "aigos-runtime",
  "sub": "550e8400-e29b-41d4-a716-446655440000",
  "aud": "aigos-agents",
  "iat": 1736935800,
  "exp": 1736936100,
  "nbf": 1736935800,
  "jti": "tok_abc123def456",
  
  "aigos": {
    "version": "1.0",
    
    "identity": {
      "instance_id": "550e8400-e29b-41d4-a716-446655440000",
      "asset_id": "fin-agent-001",
      "asset_name": "Financial Analysis Agent",
      "asset_version": "1.2.0",
      "organization_id": "org-123"
    },
    
    "governance": {
      "risk_level": "high",
      "golden_thread": {
        "hash": "sha256:7d865e959b2466918c9863afca942d0fb89d7c9ac0c99bafc3749504ded97730",
        "verified": true,
        "ticket_id": "FIN-1234",
        "ticket_system": "jira"
      },
      "mode": "NORMAL",
      "policy_hash": "sha256:def456..."
    },
    
    "control": {
      "kill_switch": {
        "enabled": true,
        "channel": "wss://ks.aigos.dev/org-123",
        "protocol": "sse"
      },
      "paused": false,
      "termination_pending": false
    },
    
    "capabilities": {
      "hash": "sha256:cap789...",
      "tools": ["web_search", "database_read", "send_email"],
      "max_budget_usd": 10.00,
      "can_spawn": true,
      "max_child_depth": 2
    },
    
    "lineage": {
      "generation_depth": 0,
      "parent_instance_id": null,
      "root_instance_id": "550e8400-e29b-41d4-a716-446655440000"
    }
  }
}
```

### 2.4 Claim Definitions

#### Standard JWT Claims

| Claim | Type | Required | Description |
|-------|------|----------|-------------|
| `iss` | string | Yes | Issuer (always `aigos-runtime`) |
| `sub` | string | Yes | Subject (instance_id) |
| `aud` | string | Yes | Audience (always `aigos-agents`) |
| `iat` | number | Yes | Issued at (Unix timestamp) |
| `exp` | number | Yes | Expiration (Unix timestamp) |
| `nbf` | number | Yes | Not before (Unix timestamp) |
| `jti` | string | Yes | Unique token ID |

#### Identity Claims (`aigos.identity`)

| Claim | Type | Required | Description |
|-------|------|----------|-------------|
| `instance_id` | string | Yes | Runtime instance UUID |
| `asset_id` | string | Yes | Asset Card ID |
| `asset_name` | string | Yes | Human-readable name |
| `asset_version` | string | Yes | Semantic version |
| `organization_id` | string | No | Organization identifier |

#### Governance Claims (`aigos.governance`)

| Claim | Type | Required | Description |
|-------|------|----------|-------------|
| `risk_level` | enum | Yes | minimal/limited/high/unacceptable |
| `golden_thread.hash` | string | No | Golden Thread hash |
| `golden_thread.verified` | boolean | Yes | Whether GT was verified |
| `golden_thread.ticket_id` | string | No | Authorization ticket |
| `golden_thread.ticket_system` | string | No | jira/azure_devops/github |
| `mode` | enum | Yes | NORMAL/SANDBOX/RESTRICTED |
| `policy_hash` | string | No | Hash of active policy |

#### Control Claims (`aigos.control`)

| Claim | Type | Required | Description |
|-------|------|----------|-------------|
| `kill_switch.enabled` | boolean | Yes | Whether kill switch is active |
| `kill_switch.channel` | string | No | Kill switch endpoint |
| `kill_switch.protocol` | string | No | sse/websocket/polling |
| `paused` | boolean | Yes | Whether agent is paused |
| `termination_pending` | boolean | Yes | Whether termination is queued |

#### Capability Claims (`aigos.capabilities`)

| Claim | Type | Required | Description |
|-------|------|----------|-------------|
| `hash` | string | Yes | Hash of full capabilities manifest |
| `tools` | string[] | No | Allowed tool names (summary) |
| `max_budget_usd` | number | No | Maximum budget per session |
| `can_spawn` | boolean | Yes | Whether agent can create children |
| `max_child_depth` | number | No | Maximum generation depth |

#### Lineage Claims (`aigos.lineage`)

| Claim | Type | Required | Description |
|-------|------|----------|-------------|
| `generation_depth` | number | Yes | 0 for root, 1+ for children |
| `parent_instance_id` | string | No | Parent's instance ID |
| `root_instance_id` | string | Yes | Root ancestor's instance ID |

---

## 3. Token Lifecycle

### 3.1 Generation

```typescript
interface GovernanceTokenGenerator {
  /**
   * Generate a Governance Token from RuntimeIdentity.
   * 
   * @param identity - The agent's runtime identity
   * @param options - Generation options
   * @returns Signed JWT string
   */
  generate(
    identity: RuntimeIdentity,
    options?: TokenGenerationOptions
  ): Promise<string>;
}

interface TokenGenerationOptions {
  /** Token lifetime in seconds (default: 300 = 5 minutes) */
  ttl_seconds?: number;
  
  /** Include full capability list (default: false, just hash) */
  include_capabilities?: boolean;
  
  /** Target audience (for scoped tokens) */
  target_agent?: string;
  
  /** Additional custom claims */
  custom_claims?: Record<string, unknown>;
}
```

### 3.2 Generation Algorithm

```
1. Collect claims from RuntimeIdentity
       │
       ├── identity.* from RuntimeIdentity
       ├── governance.* from RuntimeIdentity
       ├── control.* from KillSwitch status
       ├── capabilities.* from CapabilitiesManifest
       └── lineage.* from RuntimeIdentity.lineage
       │
       ▼
2. Set temporal claims
       │
       ├── iat = now()
       ├── nbf = now()
       └── exp = now() + ttl_seconds
       │
       ▼
3. Generate unique jti
       │
       └── jti = "tok_" + random(24)
       │
       ▼
4. Compute capability hash
       │
       └── hash = SHA256(canonicalize(capabilities_manifest))
       │
       ▼
5. Sign token
       │
       ├── Load private key for this agent
       └── Sign with ES256 or RS256
       │
       ▼
6. Return JWT string
```

### 3.3 Implementation

```typescript
class GovernanceTokenGenerator implements IGovernanceTokenGenerator {
  constructor(
    private readonly privateKey: CryptoKey,
    private readonly keyId: string
  ) {}
  
  async generate(
    identity: RuntimeIdentity,
    options: TokenGenerationOptions = {}
  ): Promise<string> {
    const now = Math.floor(Date.now() / 1000);
    const ttl = options.ttl_seconds || 300; // 5 minutes default
    
    const payload: GovernanceTokenPayload = {
      // Standard claims
      iss: 'aigos-runtime',
      sub: identity.instance_id,
      aud: 'aigos-agents',
      iat: now,
      nbf: now,
      exp: now + ttl,
      jti: `tok_${randomBytes(12).toString('hex')}`,
      
      // AIGOS claims
      aigos: {
        version: '1.0',
        
        identity: {
          instance_id: identity.instance_id,
          asset_id: identity.asset_id,
          asset_name: identity.asset_name,
          asset_version: identity.asset_version,
          organization_id: identity.organization_id,
        },
        
        governance: {
          risk_level: identity.risk_level,
          golden_thread: {
            hash: identity.golden_thread_hash,
            verified: identity.verified,
            ticket_id: identity.golden_thread?.jira_ticket,
            ticket_system: identity.golden_thread?.ticket_system,
          },
          mode: identity.mode,
          policy_hash: this.computePolicyHash(identity.policy),
        },
        
        control: {
          kill_switch: {
            enabled: identity.kill_switch_enabled,
            channel: identity.kill_switch_channel,
            protocol: identity.kill_switch_protocol,
          },
          paused: identity.paused || false,
          termination_pending: identity.termination_pending || false,
        },
        
        capabilities: {
          hash: this.computeCapabilitiesHash(identity.capabilities_manifest),
          tools: options.include_capabilities
            ? identity.capabilities_manifest.allowed_tools
            : undefined,
          max_budget_usd: identity.capabilities_manifest.budget?.session_limit_usd,
          can_spawn: identity.capabilities_manifest.spawning?.may_spawn_children || false,
          max_child_depth: identity.capabilities_manifest.spawning?.max_child_depth,
        },
        
        lineage: {
          generation_depth: identity.lineage.generation_depth,
          parent_instance_id: identity.lineage.parent_instance_id,
          root_instance_id: identity.lineage.root_instance_id || identity.instance_id,
        },
      },
    };
    
    // Sign and return
    return this.signJwt(payload);
  }
  
  private async signJwt(payload: GovernanceTokenPayload): Promise<string> {
    const header = {
      alg: 'ES256',
      typ: 'AIGOS-GOV+jwt',
      kid: this.keyId,
    };
    
    const encodedHeader = base64url(JSON.stringify(header));
    const encodedPayload = base64url(JSON.stringify(payload));
    const signingInput = `${encodedHeader}.${encodedPayload}`;
    
    const signature = await crypto.subtle.sign(
      { name: 'ECDSA', hash: 'SHA-256' },
      this.privateKey,
      new TextEncoder().encode(signingInput)
    );
    
    const encodedSignature = base64url(signature);
    return `${signingInput}.${encodedSignature}`;
  }
  
  private computeCapabilitiesHash(manifest: CapabilitiesManifest): string {
    const canonical = JSON.stringify(manifest, Object.keys(manifest).sort());
    return `sha256:${sha256(canonical)}`;
  }
}
```

---

## 4. Token Validation

### 4.1 Validator Interface

```typescript
interface GovernanceTokenValidator {
  /**
   * Validate a Governance Token.
   * 
   * @param token - JWT string
   * @param options - Validation options
   * @returns Validation result with parsed claims
   */
  validate(
    token: string,
    options?: TokenValidationOptions
  ): Promise<TokenValidationResult>;
}

interface TokenValidationOptions {
  /** Require specific risk level or lower */
  max_risk_level?: RiskLevel;
  
  /** Require kill switch to be enabled */
  require_kill_switch?: boolean;
  
  /** Require verified Golden Thread */
  require_golden_thread?: boolean;
  
  /** Require specific capabilities */
  require_capabilities?: string[];
  
  /** Maximum acceptable generation depth */
  max_generation_depth?: number;
  
  /** Custom validation function */
  custom_validator?: (claims: AigosClaims) => boolean;
}

interface TokenValidationResult {
  valid: boolean;
  claims?: GovernanceTokenPayload;
  error?: TokenValidationError;
}

type TokenValidationError =
  | { code: 'INVALID_SIGNATURE'; message: string }
  | { code: 'EXPIRED'; message: string; expired_at: number }
  | { code: 'NOT_YET_VALID'; message: string; valid_from: number }
  | { code: 'INVALID_ISSUER'; message: string }
  | { code: 'INVALID_AUDIENCE'; message: string }
  | { code: 'RISK_TOO_HIGH'; message: string; risk_level: string }
  | { code: 'KILL_SWITCH_DISABLED'; message: string }
  | { code: 'GOLDEN_THREAD_MISSING'; message: string }
  | { code: 'CAPABILITY_MISSING'; message: string; missing: string[] }
  | { code: 'GENERATION_TOO_DEEP'; message: string; depth: number }
  | { code: 'AGENT_PAUSED'; message: string }
  | { code: 'TERMINATION_PENDING'; message: string }
  | { code: 'CUSTOM_VALIDATION_FAILED'; message: string };
```

### 4.2 Validation Algorithm

```
1. Parse JWT structure
       │
       ├── Split by '.'
       ├── Decode header, payload, signature
       └── Parse JSON
       │
       ├── Parse error → INVALID_FORMAT
       │
       ▼
2. Verify signature
       │
       ├── Get kid from header
       ├── Load public key for kid
       ├── Verify signature
       │
       ├── Signature invalid → INVALID_SIGNATURE
       │
       ▼
3. Check temporal validity
       │
       ├── now < nbf → NOT_YET_VALID
       ├── now > exp → EXPIRED
       │
       ▼
4. Check standard claims
       │
       ├── iss != 'aigos-runtime' → INVALID_ISSUER
       ├── aud != 'aigos-agents' → INVALID_AUDIENCE
       │
       ▼
5. Check control claims
       │
       ├── paused == true → AGENT_PAUSED
       ├── termination_pending == true → TERMINATION_PENDING
       │
       ▼
6. Apply validation options
       │
       ├── max_risk_level: Compare ordinal
       ├── require_kill_switch: Check enabled
       ├── require_golden_thread: Check verified
       ├── require_capabilities: Check tools array
       ├── max_generation_depth: Compare depth
       ├── custom_validator: Call function
       │
       ▼
7. Return result
       │
       ├── All passed → { valid: true, claims }
       └── Any failed → { valid: false, error }
```

### 4.3 Implementation

```typescript
class GovernanceTokenValidator implements IGovernanceTokenValidator {
  private readonly keyStore: PublicKeyStore;
  private readonly clockSkewSeconds = 30;
  
  async validate(
    token: string,
    options: TokenValidationOptions = {}
  ): Promise<TokenValidationResult> {
    // 1. Parse JWT
    const parts = token.split('.');
    if (parts.length !== 3) {
      return { valid: false, error: { code: 'INVALID_FORMAT', message: 'Invalid JWT structure' } };
    }
    
    let header: TokenHeader;
    let payload: GovernanceTokenPayload;
    
    try {
      header = JSON.parse(base64urlDecode(parts[0]));
      payload = JSON.parse(base64urlDecode(parts[1]));
    } catch {
      return { valid: false, error: { code: 'INVALID_FORMAT', message: 'Invalid JSON' } };
    }
    
    // 2. Verify signature
    const publicKey = await this.keyStore.getKey(header.kid);
    if (!publicKey) {
      return { valid: false, error: { code: 'INVALID_SIGNATURE', message: 'Unknown key ID' } };
    }
    
    const signingInput = `${parts[0]}.${parts[1]}`;
    const signature = base64urlDecode(parts[2]);
    
    const signatureValid = await crypto.subtle.verify(
      { name: 'ECDSA', hash: 'SHA-256' },
      publicKey,
      signature,
      new TextEncoder().encode(signingInput)
    );
    
    if (!signatureValid) {
      return { valid: false, error: { code: 'INVALID_SIGNATURE', message: 'Signature verification failed' } };
    }
    
    // 3. Check temporal validity
    const now = Math.floor(Date.now() / 1000);
    
    if (payload.nbf && now < payload.nbf - this.clockSkewSeconds) {
      return {
        valid: false,
        error: { code: 'NOT_YET_VALID', message: 'Token not yet valid', valid_from: payload.nbf },
      };
    }
    
    if (now > payload.exp + this.clockSkewSeconds) {
      return {
        valid: false,
        error: { code: 'EXPIRED', message: 'Token expired', expired_at: payload.exp },
      };
    }
    
    // 4. Check standard claims
    if (payload.iss !== 'aigos-runtime') {
      return { valid: false, error: { code: 'INVALID_ISSUER', message: `Invalid issuer: ${payload.iss}` } };
    }
    
    if (payload.aud !== 'aigos-agents') {
      return { valid: false, error: { code: 'INVALID_AUDIENCE', message: `Invalid audience: ${payload.aud}` } };
    }
    
    // 5. Check control claims
    const control = payload.aigos.control;
    
    if (control.paused) {
      return { valid: false, error: { code: 'AGENT_PAUSED', message: 'Agent is paused' } };
    }
    
    if (control.termination_pending) {
      return { valid: false, error: { code: 'TERMINATION_PENDING', message: 'Agent termination pending' } };
    }
    
    // 6. Apply validation options
    const gov = payload.aigos.governance;
    const caps = payload.aigos.capabilities;
    const lineage = payload.aigos.lineage;
    
    // Risk level check
    if (options.max_risk_level) {
      const riskOrder = { minimal: 0, limited: 1, high: 2, unacceptable: 3 };
      if (riskOrder[gov.risk_level] > riskOrder[options.max_risk_level]) {
        return {
          valid: false,
          error: { code: 'RISK_TOO_HIGH', message: `Risk ${gov.risk_level} exceeds max ${options.max_risk_level}`, risk_level: gov.risk_level },
        };
      }
    }
    
    // Kill switch check
    if (options.require_kill_switch && !control.kill_switch.enabled) {
      return { valid: false, error: { code: 'KILL_SWITCH_DISABLED', message: 'Kill switch not enabled' } };
    }
    
    // Golden Thread check
    if (options.require_golden_thread && !gov.golden_thread.verified) {
      return { valid: false, error: { code: 'GOLDEN_THREAD_MISSING', message: 'Golden Thread not verified' } };
    }
    
    // Capabilities check
    if (options.require_capabilities && caps.tools) {
      const missing = options.require_capabilities.filter(c => !caps.tools!.includes(c));
      if (missing.length > 0) {
        return {
          valid: false,
          error: { code: 'CAPABILITY_MISSING', message: `Missing capabilities: ${missing.join(', ')}`, missing },
        };
      }
    }
    
    // Generation depth check
    if (options.max_generation_depth !== undefined) {
      if (lineage.generation_depth > options.max_generation_depth) {
        return {
          valid: false,
          error: { code: 'GENERATION_TOO_DEEP', message: `Depth ${lineage.generation_depth} exceeds max ${options.max_generation_depth}`, depth: lineage.generation_depth },
        };
      }
    }
    
    // Custom validator
    if (options.custom_validator && !options.custom_validator(payload.aigos)) {
      return { valid: false, error: { code: 'CUSTOM_VALIDATION_FAILED', message: 'Custom validation failed' } };
    }
    
    // 7. Success
    return { valid: true, claims: payload };
  }
}
```

---

## 5. The AIGOS Handshake Protocol

### 5.1 Protocol Overview

The handshake is a **mutual authentication** protocol where both agents prove governance compliance.

### 5.2 HTTP Integration

Governance Tokens are transmitted via HTTP headers:

```http
POST /api/analyze HTTP/1.1
Host: agent-b.example.com
Content-Type: application/json
X-AIGOS-Token: eyJhbGciOiJFUzI1NiIs...
X-AIGOS-Protocol-Version: 1.0

{"query": "Analyze Q4 financials"}
```

Response:

```http
HTTP/1.1 200 OK
Content-Type: application/json
X-AIGOS-Token: eyJhbGciOiJFUzI1NiIs...
X-AIGOS-Request-Token-Valid: true

{"analysis": "..."}
```

### 5.3 Headers

| Header | Direction | Description |
|--------|-----------|-------------|
| `X-AIGOS-Token` | Request & Response | JWT Governance Token |
| `X-AIGOS-Protocol-Version` | Request | Protocol version (1.0) |
| `X-AIGOS-Request-Token-Valid` | Response | Whether request token was valid |
| `X-AIGOS-Request-Token-Error` | Response | Error code if invalid |

### 5.4 Handshake Flow Implementation

```typescript
class AigosHandshake {
  private readonly generator: GovernanceTokenGenerator;
  private readonly validator: GovernanceTokenValidator;
  private readonly identity: RuntimeIdentity;
  private readonly policy: A2APolicy;
  
  /**
   * Execute handshake as requester (Agent A).
   */
  async executeAsRequester(
    request: HttpRequest,
    targetUrl: string
  ): Promise<HandshakeResult> {
    // 1. Generate our token
    const ourToken = await this.generator.generate(this.identity);
    
    // 2. Add to request
    request.headers.set('X-AIGOS-Token', ourToken);
    request.headers.set('X-AIGOS-Protocol-Version', '1.0');
    
    // 3. Send request
    const response = await fetch(targetUrl, request);
    
    // 4. Validate response token (if present)
    const theirToken = response.headers.get('X-AIGOS-Token');
    
    if (theirToken) {
      const validation = await this.validator.validate(theirToken, this.policy.outbound);
      
      if (!validation.valid) {
        return {
          success: false,
          error: `Provider agent failed validation: ${validation.error?.code}`,
          response: null,
        };
      }
      
      return {
        success: true,
        response,
        providerClaims: validation.claims,
      };
    }
    
    // No token = ungoverned agent
    if (this.policy.require_governed_providers) {
      return {
        success: false,
        error: 'Provider agent is not AIGOS-governed',
        response: null,
      };
    }
    
    return { success: true, response, providerClaims: null };
  }
  
  /**
   * Execute handshake as provider (Agent B).
   */
  async executeAsProvider(
    request: HttpRequest
  ): Promise<ProviderHandshakeResult> {
    // 1. Extract requester token
    const theirToken = request.headers.get('X-AIGOS-Token');
    
    if (!theirToken) {
      if (this.policy.require_governed_requesters) {
        return {
          allowed: false,
          error: 'Requester is not AIGOS-governed',
          responseHeaders: {
            'X-AIGOS-Request-Token-Valid': 'false',
            'X-AIGOS-Request-Token-Error': 'MISSING_TOKEN',
          },
        };
      }
      
      // Allow ungoverned requesters
      return { allowed: true, requesterClaims: null, responseHeaders: {} };
    }
    
    // 2. Validate requester token
    const validation = await this.validator.validate(theirToken, this.policy.inbound);
    
    if (!validation.valid) {
      return {
        allowed: false,
        error: `Requester failed validation: ${validation.error?.code}`,
        responseHeaders: {
          'X-AIGOS-Request-Token-Valid': 'false',
          'X-AIGOS-Request-Token-Error': validation.error!.code,
        },
      };
    }
    
    // 3. Generate our token for response
    const ourToken = await this.generator.generate(this.identity);
    
    return {
      allowed: true,
      requesterClaims: validation.claims,
      responseHeaders: {
        'X-AIGOS-Token': ourToken,
        'X-AIGOS-Request-Token-Valid': 'true',
      },
    };
  }
}
```

---

## 6. Trust Policies

### 6.1 A2A Policy Schema

```yaml
# .aigrc/policies/a2a-trust.yaml

# Inbound: Requirements for agents calling us
inbound:
  # Require all requesters to be governed
  require_governed: true
  
  # Maximum risk level we'll accept requests from
  max_risk_level: high
  
  # Require kill switch for requesters
  require_kill_switch: true
  
  # Require verified Golden Thread
  require_golden_thread: false
  
  # Maximum generation depth
  max_generation_depth: 3
  
  # Blocked asset IDs
  blocked_assets:
    - rogue-agent-001
  
  # Blocked organizations
  blocked_organizations:
    - org-malicious

# Outbound: Requirements for agents we call
outbound:
  # Require providers to be governed
  require_governed: false
  
  # Maximum risk level of providers we'll use
  max_risk_level: high
  
  # Require kill switch for providers
  require_kill_switch: false
  
  # Trusted organizations (skip other checks)
  trusted_organizations:
    - org-partner-corp
```

### 6.2 Policy Evaluation

```typescript
interface A2APolicy {
  inbound: A2ADirectionPolicy;
  outbound: A2ADirectionPolicy;
}

interface A2ADirectionPolicy {
  require_governed?: boolean;
  max_risk_level?: RiskLevel;
  require_kill_switch?: boolean;
  require_golden_thread?: boolean;
  max_generation_depth?: number;
  blocked_assets?: string[];
  blocked_organizations?: string[];
  trusted_organizations?: string[];
}

function evaluateA2APolicy(
  claims: AigosClaims,
  policy: A2ADirectionPolicy
): PolicyDecision {
  // Trusted org = allow immediately
  if (policy.trusted_organizations?.includes(claims.identity.organization_id)) {
    return { allowed: true, reason: 'Trusted organization' };
  }
  
  // Blocked checks
  if (policy.blocked_assets?.includes(claims.identity.asset_id)) {
    return { allowed: false, reason: 'Asset is blocked' };
  }
  
  if (policy.blocked_organizations?.includes(claims.identity.organization_id)) {
    return { allowed: false, reason: 'Organization is blocked' };
  }
  
  // Convert to TokenValidationOptions and delegate
  const validationOptions: TokenValidationOptions = {
    max_risk_level: policy.max_risk_level,
    require_kill_switch: policy.require_kill_switch,
    require_golden_thread: policy.require_golden_thread,
    max_generation_depth: policy.max_generation_depth,
  };
  
  // ... validation logic
}
```

---

## 7. Key Management

### 7.1 Agent Keys

Each AIGOS-governed agent has a keypair:

- **Private Key** — Used to sign outgoing tokens (never shared)
- **Public Key** — Published for token verification

### 7.2 Key Distribution

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                              KEY DISTRIBUTION OPTIONS                                    │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                         │
│   OPTION 1: JWKS Endpoint (Recommended for Cloud)                                       │
│   ───────────────────────────────────────────────                                       │
│                                                                                         │
│   Agent B validates token from Agent A:                                                 │
│                                                                                         │
│   1. Extract kid from token header                                                      │
│   2. Fetch https://keys.aigos.dev/.well-known/jwks.json                                │
│   3. Find key with matching kid                                                         │
│   4. Verify signature                                                                   │
│                                                                                         │
│   ─────────────────────────────────────────────────────────────────────────────────────│
│                                                                                         │
│   OPTION 2: Local Key Bundle (Air-Gapped Environments)                                  │
│   ─────────────────────────────────────────────────────                                 │
│                                                                                         │
│   Keys distributed via:                                                                 │
│   • .aigrc/keys/trusted-agents.json                                                     │
│   • Environment variable AIGOS_TRUSTED_KEYS                                             │
│   • Kubernetes ConfigMap/Secret                                                         │
│                                                                                         │
│   ─────────────────────────────────────────────────────────────────────────────────────│
│                                                                                         │
│   OPTION 3: Organization CA (Enterprise)                                                │
│   ───────────────────────────────────────                                               │
│                                                                                         │
│   Organization runs internal CA:                                                        │
│   • Issues agent certificates                                                           │
│   • Validates via certificate chain                                                     │
│   • Enables cross-org trust via federation                                              │
│                                                                                         │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

### 7.3 JWKS Format

```json
{
  "keys": [
    {
      "kty": "EC",
      "crv": "P-256",
      "kid": "agent-550e8400-e29b-41d4-a716-446655440000",
      "use": "sig",
      "x": "...",
      "y": "..."
    }
  ]
}
```

---

## 8. Integration

### 8.1 Sidecar Proxy Integration

The Sidecar Proxy (SPEC-RT-007) can enforce the handshake at the network layer:

```yaml
# aigos-proxy.yaml
a2a:
  # Inject token on outbound requests
  inject_token: true
  
  # Validate token on inbound requests
  validate_inbound: true
  
  # Policy for A2A trust
  policy: a2a-trust.yaml
  
  # Block requests without valid token
  require_valid_token: true
```

### 8.2 Framework Adapter Integration

```typescript
// In LangChain adapter
class AigosCallbackHandler extends BaseCallbackHandler {
  private readonly handshake: AigosHandshake;
  
  async handleToolStart(tool: Serialized, input: string): Promise<void> {
    // If tool makes external call, inject token
    if (this.isExternalTool(tool)) {
      const token = await this.handshake.generator.generate(this.identity);
      // Token injection handled by underlying HTTP client
    }
  }
}
```

### 8.3 Telemetry Integration

Emit spans for A2A interactions:

```typescript
// On successful handshake
telemetry.emit({
  name: 'aigos.governance.a2a_handshake',
  attributes: {
    'aigos.a2a.direction': 'outbound',
    'aigos.a2a.peer_asset_id': claims.identity.asset_id,
    'aigos.a2a.peer_risk_level': claims.governance.risk_level,
    'aigos.a2a.peer_organization': claims.identity.organization_id,
    'aigos.a2a.result': 'success',
  },
});
```

---

## 9. Security Considerations

### 9.1 Token Theft

**Threat:** Attacker captures token and replays it.

**Mitigations:**
- Short TTL (5 minutes default)
- Token bound to specific interaction (optional `jti` tracking)
- TLS required for all A2A communication

### 9.2 Key Compromise

**Threat:** Agent's private key is stolen.

**Mitigations:**
- Keys stored in secure enclaves where available
- Key rotation support via JWKS
- Kill switch can revoke compromised agent immediately

### 9.3 Capability Laundering

**Threat:** High-risk agent asks low-risk agent to perform action.

**Mitigations:**
- Receiving agent checks `generation_depth`
- Receiving agent checks `root_instance_id` lineage
- Capability hash proves original manifest

### 9.4 Denial of Service

**Threat:** Flood of invalid tokens overwhelms validator.

**Mitigations:**
- Rate limiting at proxy layer
- Signature verification before claim parsing
- Caching of JWKS responses

---

## 10. Examples

### 10.1 Simple A2A Request

```typescript
// Agent A calls Agent B's API
const agentA = new AigosRuntime({ assetId: 'research-agent' });
const handshake = agentA.getHandshake();

const response = await handshake.executeAsRequester(
  new Request('https://agent-b.corp.com/api/analyze', {
    method: 'POST',
    body: JSON.stringify({ query: 'Market trends' }),
  }),
  'https://agent-b.corp.com/api/analyze'
);

if (response.success) {
  console.log('Provider risk level:', response.providerClaims?.aigos.governance.risk_level);
  const data = await response.response.json();
}
```

### 10.2 Provider Validation

```typescript
// Agent B's API handler
app.post('/api/analyze', async (req, res) => {
  const runtime = getAigosRuntime();
  const handshake = runtime.getHandshake();
  
  const result = await handshake.executeAsProvider(req);
  
  if (!result.allowed) {
    res.status(403).json({ error: result.error });
    return;
  }
  
  // Set response headers
  Object.entries(result.responseHeaders).forEach(([k, v]) => {
    res.setHeader(k, v);
  });
  
  // Process request
  const analysis = await analyze(req.body.query);
  res.json({ analysis });
});
```

---

## 11. Implementation Requirements

### 11.1 MUST (Required)

Implementations MUST:

1. Use ES256 or RS256 for token signing
2. Include all required claims in tokens
3. Validate signature before parsing claims
4. Reject expired tokens
5. Check `paused` and `termination_pending` claims
6. Support token TTL of at least 60 seconds

### 11.2 SHOULD (Recommended)

Implementations SHOULD:

1. Default to 5-minute token TTL
2. Support JWKS for key distribution
3. Cache validated tokens briefly (< 30 seconds)
4. Emit telemetry for A2A interactions
5. Support mutual authentication

### 11.3 MAY (Optional)

Implementations MAY:

1. Support certificate-based authentication
2. Implement token binding to specific requests
3. Support offline/air-gapped key distribution
4. Implement token refresh without full regeneration

---

## 12. Conformance Levels

### Level 1: Basic A2A

- Generate and sign Governance Tokens
- Validate tokens from other agents
- Basic risk level checking

### Level 2: Full Handshake

- Mutual authentication (both parties prove governance)
- A2A trust policy support
- Kill switch and Golden Thread verification

### Level 3: Enterprise A2A

- JWKS-based key distribution
- Organization-level trust policies
- Certificate chain validation
- Full telemetry integration

---

## Appendix A: JSON Schema

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$id": "https://aigrc.dev/schemas/governance-token.json",
  "title": "Governance Token Payload",
  "type": "object",
  "required": ["iss", "sub", "aud", "iat", "exp", "jti", "aigos"],
  "properties": {
    "iss": { "type": "string", "const": "aigos-runtime" },
    "sub": { "type": "string", "format": "uuid" },
    "aud": { "type": "string", "const": "aigos-agents" },
    "iat": { "type": "integer" },
    "exp": { "type": "integer" },
    "nbf": { "type": "integer" },
    "jti": { "type": "string" },
    "aigos": {
      "type": "object",
      "required": ["version", "identity", "governance", "control", "capabilities", "lineage"],
      "properties": {
        "version": { "type": "string" },
        "identity": {
          "type": "object",
          "required": ["instance_id", "asset_id", "asset_name", "asset_version"],
          "properties": {
            "instance_id": { "type": "string", "format": "uuid" },
            "asset_id": { "type": "string" },
            "asset_name": { "type": "string" },
            "asset_version": { "type": "string" },
            "organization_id": { "type": "string" }
          }
        },
        "governance": {
          "type": "object",
          "required": ["risk_level", "golden_thread", "mode"],
          "properties": {
            "risk_level": { "enum": ["minimal", "limited", "high", "unacceptable"] },
            "golden_thread": {
              "type": "object",
              "required": ["verified"],
              "properties": {
                "hash": { "type": "string" },
                "verified": { "type": "boolean" },
                "ticket_id": { "type": "string" },
                "ticket_system": { "type": "string" }
              }
            },
            "mode": { "enum": ["NORMAL", "SANDBOX", "RESTRICTED"] },
            "policy_hash": { "type": "string" }
          }
        },
        "control": {
          "type": "object",
          "required": ["kill_switch", "paused", "termination_pending"],
          "properties": {
            "kill_switch": {
              "type": "object",
              "required": ["enabled"],
              "properties": {
                "enabled": { "type": "boolean" },
                "channel": { "type": "string" },
                "protocol": { "type": "string" }
              }
            },
            "paused": { "type": "boolean" },
            "termination_pending": { "type": "boolean" }
          }
        },
        "capabilities": {
          "type": "object",
          "required": ["hash", "can_spawn"],
          "properties": {
            "hash": { "type": "string" },
            "tools": { "type": "array", "items": { "type": "string" } },
            "max_budget_usd": { "type": "number" },
            "can_spawn": { "type": "boolean" },
            "max_child_depth": { "type": "integer" }
          }
        },
        "lineage": {
          "type": "object",
          "required": ["generation_depth", "root_instance_id"],
          "properties": {
            "generation_depth": { "type": "integer", "minimum": 0 },
            "parent_instance_id": { "type": ["string", "null"] },
            "root_instance_id": { "type": "string" }
          }
        }
      }
    }
  }
}
```

---

## Appendix B: Changelog

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0-draft | 2025-12-30 | Initial draft |
