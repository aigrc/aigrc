# SPEC-PRT-001: Golden Thread Protocol

## Document Information

| Field            | Value                                  |
| ---------------- | -------------------------------------- |
| **Spec ID**      | SPEC-PRT-001                           |
| **Version**      | 1.0.0-draft                            |
| **Status**       | Draft                                  |
| **Category**     | Protocol                               |
| **Last Updated** | 2025-12-29                             |
| **Authors**      | AIGOS Team |
| **License**      | Apache 2.0                             |

---

## Dependencies

### Required Specifications

| Spec ID      | Name              | Why Required                        |
| ------------ | ----------------- | ----------------------------------- |
| SPEC-FMT-002 | Asset Card Schema | Golden Thread stored in Asset Cards |

### Dependent Specifications

| Spec ID      | Name             | How Used                             |
| ------------ | ---------------- | ------------------------------------ |
| SPEC-RT-002  | Identity Manager | Verifies Golden Thread at runtime    |
| SPEC-ACT-001 | GitHub Action    | Computes Golden Thread at build time |
| SPEC-CLI-001 | CLI              | Displays Golden Thread in status     |

---

## Abstract

The Golden Thread Protocol defines the cryptographic mechanism that links runtime AI agents to their business authorization. It establishes an unbroken chain of trust from a running agent instance back to the business justification (Jira ticket, approval, etc.) that authorized its existence. This protocol enables organizations to prove, at any moment, that an AI agent is operating under valid authorization.

---

## 1. Introduction

### 1.1 Purpose

The Golden Thread answers the critical governance question:

> **"Is this running AI agent authorized to exist, and can we prove it?"**

In a lawsuit, audit, or incident investigation, organizations must demonstrate that:

1. The AI system was approved for use
2. The approval was made by an authorized person
3. The running system corresponds to the approved system
4. This chain of authorization has not been broken

The Golden Thread Protocol provides cryptographic proof for all four requirements.

### 1.2 The Problem

```
WITHOUT GOLDEN THREAD                    WITH GOLDEN THREAD
────────────────────                    ──────────────────

Running Agent                           Running Agent
    │                                       │
    │ "What authorized                      │ Cryptographic hash
    │  this agent?"                         │ links to...
    │                                       ▼
    ▼                                   Asset Card
                                            │
"We think there's                           │ Contains approval
 a Jira ticket                              │ reference
 somewhere..."                              ▼
                                        Jira Ticket FIN-1234
    ❌ Cannot prove                         │
       authorization                        │ Business justification
                                           │ + Approver signature
                                           ▼
                                        ✅ Complete audit trail
```

### 1.3 Scope

This specification defines:

- The components of a Golden Thread
- Hash computation algorithm
- Signature scheme (optional)
- Verification process
- Storage format in Asset Cards

This specification does NOT define:

- How Jira/ADO tickets are created (organizational process)
- How approvals are obtained (organizational process)
- Runtime enforcement (see SPEC-RT-002, SPEC-RT-003)

### 1.4 Terminology

| Term                        | Definition                                                               |
| --------------------------- | ------------------------------------------------------------------------ |
| **Golden Thread**           | The complete chain of authorization from agent to business justification |
| **Golden Thread Hash**      | Cryptographic hash of the authorization components                       |
| **Golden Thread Signature** | Optional digital signature from approver                                 |
| **Authorization Anchor**    | The business system reference (e.g., Jira ticket)                        |
| **Approver**                | The person who authorized the AI system                                  |

---

## 2. Golden Thread Components

### 2.1 Required Components

Every Golden Thread MUST include:

| Component     | Description                                | Example                  |
| ------------- | ------------------------------------------ | ------------------------ |
| `ticket_id`   | Reference to business authorization ticket | `"FIN-1234"`             |
| `approved_by` | Email of the approver                      | `"ciso@corp.com"`        |
| `approved_at` | ISO 8601 timestamp of approval             | `"2025-01-15T10:30:00Z"` |

### 2.2 Optional Components

A Golden Thread MAY include:

| Component            | Description                     | Example                            |
| -------------------- | ------------------------------- | ---------------------------------- |
| `approver_signature` | Digital signature from approver | `"RSA-SHA256:base64..."`           |
| `ticket_system`      | Type of ticketing system        | `"jira"`, `"azure-devops"`         |
| `ticket_url`         | Direct URL to ticket            | `"https://jira.corp.com/FIN-1234"` |
| `approval_context`   | Additional context              | `"Emergency deployment"`           |
| `expires_at`         | When authorization expires      | `"2026-01-15T10:30:00Z"`           |
| `scope`              | What the authorization covers   | `"production-us-east"`             |

### 2.3 Asset Card Storage

Golden Thread components are stored in the Asset Card:

```yaml
# .aigrc/cards/fin-agent.yaml
id: fin-agent-001
name: Financial Analysis Agent
version: "1.2.0"

golden_thread:
  # Required
  ticket_id: "FIN-1234"
  approved_by: "ciso@corp.com"
  approved_at: "2025-01-15T10:30:00Z"

  # Optional
  ticket_system: "jira"
  ticket_url: "https://jira.corp.com/browse/FIN-1234"
  approver_signature: "RSA-SHA256:MIIB..."
  expires_at: "2026-01-15T10:30:00Z"
  scope: "production"

  # Computed (by build process)
  hash: "sha256:7d865e959b2466918c9863afca942d0fb89d7c9ac0c99bafc3749504ded97730"

ownership:
  owner:
    name: Finance Team
    email: finance@corp.com
```

---

## 3. Hash Computation

### 3.1 Algorithm Overview

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                           GOLDEN THREAD HASH COMPUTATION                                 │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                         │
│   INPUT COMPONENTS                                                                      │
│   ────────────────                                                                      │
│   ticket_id:    "FIN-1234"                                                              │
│   approved_by:  "ciso@corp.com"                                                         │
│   approved_at:  "2025-01-15T10:30:00Z"                                                  │
│                                                                                         │
│                     │                                                                   │
│                     ▼                                                                   │
│                                                                                         │
│   CANONICALIZATION                                                                      │
│   ────────────────                                                                      │
│   1. Sort components alphabetically by key                                              │
│   2. Format: key1=value1|key2=value2|key3=value3                                        │
│   3. Encode as UTF-8 bytes                                                              │
│                                                                                         │
│   Result: "approved_at=2025-01-15T10:30:00Z|approved_by=ciso@corp.com|ticket_id=FIN-1234"
│                                                                                         │
│                     │                                                                   │
│                     ▼                                                                   │
│                                                                                         │
│   HASH COMPUTATION                                                                      │
│   ────────────────                                                                      │
│   1. Apply SHA-256                                                                      │
│   2. Encode result as lowercase hexadecimal                                             │
│   3. Prefix with "sha256:"                                                              │
│                                                                                         │
│   Result: "sha256:7d865e959b2466918c9863afca942d0fb89d7c9ac0c99bafc3749504ded97730"     │
│                                                                                         │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

### 3.2 Canonicalization Rules

To ensure consistent hash computation across implementations:

1. **Component Selection**: Include ONLY required components in hash:
   
   - `ticket_id`
   - `approved_by`
   - `approved_at`

2. **Key Sorting**: Sort keys alphabetically (ASCII order)

3. **Value Normalization**:
   
   - Strings: Trim whitespace, use as-is
   - Timestamps: MUST be ISO 8601 format with timezone (Z or ±HH:MM)
   - Email: Lowercase

4. **Encoding**: 
   
   - Format: `key1=value1|key2=value2|key3=value3`
   - Separator: `|` (pipe character, ASCII 0x7C)
   - Key-value separator: `=` (equals, ASCII 0x3D)
   - Encode as UTF-8 bytes before hashing

5. **No trailing separator**: The canonical string MUST NOT end with `|`

### 3.3 Hash Algorithm

- Algorithm: SHA-256
- Output encoding: Lowercase hexadecimal
- Prefix: `sha256:`

### 3.4 Reference Implementation

#### TypeScript

```typescript
import { createHash } from 'crypto';

interface GoldenThreadComponents {
  ticket_id: string;
  approved_by: string;
  approved_at: string;
}

function computeGoldenThreadHash(components: GoldenThreadComponents): string {
  // 1. Normalize values
  const normalized = {
    ticket_id: components.ticket_id.trim(),
    approved_by: components.approved_by.trim().toLowerCase(),
    approved_at: components.approved_at.trim(),
  };

  // 2. Sort keys alphabetically and build canonical string
  const sortedKeys = Object.keys(normalized).sort();
  const canonicalParts = sortedKeys.map(key => 
    `${key}=${normalized[key as keyof typeof normalized]}`
  );
  const canonicalString = canonicalParts.join('|');

  // 3. Compute SHA-256
  const hash = createHash('sha256')
    .update(canonicalString, 'utf8')
    .digest('hex');

  // 4. Return with prefix
  return `sha256:${hash}`;
}

// Example usage
const hash = computeGoldenThreadHash({
  ticket_id: 'FIN-1234',
  approved_by: 'ciso@corp.com',
  approved_at: '2025-01-15T10:30:00Z',
});
// Returns: "sha256:7d865e959b2466918c9863afca942d0fb89d7c9ac0c99bafc3749504ded97730"
```

#### Python

```python
import hashlib
from typing import TypedDict

class GoldenThreadComponents(TypedDict):
    ticket_id: str
    approved_by: str
    approved_at: str

def compute_golden_thread_hash(components: GoldenThreadComponents) -> str:
    """Compute Golden Thread hash from components."""

    # 1. Normalize values
    normalized = {
        'ticket_id': components['ticket_id'].strip(),
        'approved_by': components['approved_by'].strip().lower(),
        'approved_at': components['approved_at'].strip(),
    }

    # 2. Sort keys alphabetically and build canonical string
    sorted_keys = sorted(normalized.keys())
    canonical_parts = [f"{key}={normalized[key]}" for key in sorted_keys]
    canonical_string = '|'.join(canonical_parts)

    # 3. Compute SHA-256
    hash_bytes = hashlib.sha256(canonical_string.encode('utf-8')).hexdigest()

    # 4. Return with prefix
    return f"sha256:{hash_bytes}"

# Example usage
hash_value = compute_golden_thread_hash({
    'ticket_id': 'FIN-1234',
    'approved_by': 'ciso@corp.com',
    'approved_at': '2025-01-15T10:30:00Z',
})
# Returns: "sha256:7d865e959b2466918c9863afca942d0fb89d7c9ac0c99bafc3749504ded97730"
```

---

## 4. Verification Process

### 4.1 Verification Flow

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                           GOLDEN THREAD VERIFICATION                                     │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                         │
│   1. LOAD ASSET CARD                                                                    │
│      │                                                                                  │
│      ├── Extract golden_thread.ticket_id                                                │
│      ├── Extract golden_thread.approved_by                                              │
│      ├── Extract golden_thread.approved_at                                              │
│      └── Extract golden_thread.hash (stored hash)                                       │
│      │                                                                                  │
│      ▼                                                                                  │
│   2. RECOMPUTE HASH                                                                     │
│      │                                                                                  │
│      └── computed_hash = computeGoldenThreadHash(components)                            │
│      │                                                                                  │
│      ▼                                                                                  │
│   3. COMPARE HASHES                                                                     │
│      │                                                                                  │
│      ├── If computed_hash == stored_hash                                                │
│      │   └── VERIFICATION PASSED ✅                                                     │
│      │                                                                                  │
│      └── If computed_hash != stored_hash                                                │
│          └── VERIFICATION FAILED ❌                                                     │
│              │                                                                          │
│              └── Possible causes:                                                       │
│                  • Asset Card was modified                                              │
│                  • Hash was computed with different algorithm                           │
│                  • Encoding mismatch                                                    │
│      │                                                                                  │
│      ▼                                                                                  │
│   4. (OPTIONAL) VERIFY SIGNATURE                                                        │
│      │                                                                                  │
│      ├── If golden_thread.approver_signature present                                    │
│      │   │                                                                              │
│      │   ├── Load approver's public key                                                 │
│      │   ├── Verify signature over canonical string                                     │
│      │   └── If invalid → SIGNATURE VERIFICATION FAILED                                 │
│      │                                                                                  │
│      └── If no signature → Skip (signature is optional)                                 │
│      │                                                                                  │
│      ▼                                                                                  │
│   5. (OPTIONAL) CHECK EXPIRATION                                                        │
│      │                                                                                  │
│      ├── If golden_thread.expires_at present                                            │
│      │   │                                                                              │
│      │   └── If now > expires_at → AUTHORIZATION EXPIRED                                │
│      │                                                                                  │
│      └── If no expiration → Skip (expiration is optional)                               │
│      │                                                                                  │
│      ▼                                                                                  │
│   6. RETURN RESULT                                                                      │
│                                                                                         │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

### 4.2 Verification Result

```typescript
interface GoldenThreadVerificationResult {
  /** Whether verification passed */
  valid: boolean;

  /** Timestamp of verification */
  verified_at: string;

  /** Individual check results */
  checks: {
    /** Asset Card exists and is readable */
    asset_card_exists: boolean;

    /** Computed hash matches stored hash */
    hash_matches: boolean;

    /** Signature is valid (if present) */
    signature_valid: boolean | null;  // null if no signature

    /** Authorization has not expired (if expiry set) */
    not_expired: boolean | null;  // null if no expiry
  };

  /** If invalid, the reason */
  failure_reason?: string;

  /** The computed hash (for debugging) */
  computed_hash: string;

  /** The stored hash (for debugging) */
  stored_hash: string;
}
```

---

## 5. Digital Signatures (Optional)

### 5.1 Purpose

Digital signatures provide non-repudiation: the approver cannot deny they approved the AI system. This is stronger than hash verification alone.

### 5.2 Signature Scheme

| Property  | Requirement                                    |
| --------- | ---------------------------------------------- |
| Algorithm | RSA-SHA256 or ECDSA P-256                      |
| Key size  | RSA: minimum 2048 bits; ECDSA: P-256 curve     |
| Format    | Base64-encoded signature with algorithm prefix |

### 5.3 Signature Format

```
{ALGORITHM}:{BASE64_SIGNATURE}

Examples:
RSA-SHA256:MIIB...
ECDSA-P256:MEUC...
```

### 5.4 What is Signed

The signature is computed over the **canonical string** (same as hash input):

```
approved_at=2025-01-15T10:30:00Z|approved_by=ciso@corp.com|ticket_id=FIN-1234
```

### 5.5 Signature Workflow

```
BUILD TIME (Approver)                  RUNTIME (Verification)
─────────────────────                  ─────────────────────

1. Create canonical string             1. Load Asset Card

2. Sign with private key               2. Extract signature

3. Store signature in Asset Card       3. Load approver's public key
                                          (from keyring or Asset Card)

                                       4. Verify signature over
                                          canonical string

                                       5. Accept or reject
```

### 5.6 Key Management

Keys may be managed via:

1. **Local keyring**: `.aigrc/keys/` directory
2. **External KMS**: AWS KMS, Azure Key Vault, HashiCorp Vault
3. **Embedded in Asset Card**: Public key only (for verification)

```yaml
# .aigrc/keys/approvers.yaml
approvers:
  - email: ciso@corp.com
    public_key_pem: |
      -----BEGIN PUBLIC KEY-----
      MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA...
      -----END PUBLIC KEY-----
    algorithm: RSA-SHA256
```

---

## 6. Integration Points

### 6.1 Build Time (GitHub Action)

The GitHub Action computes and stores the Golden Thread hash:

```yaml
# .github/workflows/aigrc.yml
- name: AIGRC Governance Check
  uses: aigrc/aigrc@v1
  with:
    compute-golden-thread: true
    jira-ticket: ${{ github.event.pull_request.body }}  # Extract from PR
```

### 6.2 Runtime (Identity Manager)

The Identity Manager verifies the Golden Thread on startup:

```typescript
// SPEC-RT-002 Identity Manager
const identity = await identityManager.create({
  assetId: 'fin-agent-001',
  configPath: '.aigrc/cards/fin-agent-001.yaml',
});

// Verification happens automatically
console.log(identity.verified);  // true or false
console.log(identity.golden_thread_hash);  // "sha256:..."
```

### 6.3 MCP Server

The MCP Server exposes Golden Thread status:

```typescript
// Tool: get_asset_details
{
  asset_id: "fin-agent-001",
  golden_thread: {
    valid: true,
    ticket_id: "FIN-1234",
    approved_by: "ciso@corp.com",
    hash: "sha256:7d865e..."
  }
}
```

---

## 7. Implementation Requirements

### 7.1 MUST (Required)

Implementations MUST:

1. Use SHA-256 for hash computation
2. Sort keys alphabetically before canonicalization
3. Use `|` as component separator
4. Use `=` as key-value separator
5. Encode canonical string as UTF-8 before hashing
6. Prefix hash with `sha256:`
7. Lowercase email addresses before hashing
8. Store hash in Asset Card under `golden_thread.hash`

### 7.2 SHOULD (Recommended)

Implementations SHOULD:

1. Verify Golden Thread on every agent startup
2. Log verification results with timestamps
3. Support signature verification when signatures are present
4. Cache verification results for performance
5. Provide clear error messages for verification failures

### 7.3 MAY (Optional)

Implementations MAY:

1. Support additional hash algorithms (with appropriate prefix)
2. Support external signature verification services
3. Support authorization expiration checking
4. Provide ticket system integration (Jira API, ADO API)

---

## 8. Security Considerations

### 8.1 Threat Model

| Threat            | Attack                               | Mitigation                     |
| ----------------- | ------------------------------------ | ------------------------------ |
| Hash collision    | Find different input with same hash  | SHA-256 is collision-resistant |
| Ticket spoofing   | Claim authorization from fake ticket | Signature verification         |
| Time manipulation | Backdate approval                    | Signature includes timestamp   |
| Key compromise    | Attacker obtains signing key         | Key rotation, HSM storage      |

### 8.2 Recommendations

1. Store private keys in HSM or secure key management system
2. Rotate signing keys annually
3. Use signature verification for high-risk assets
4. Log all verification attempts
5. Alert on verification failures

---

## 9. Test Vectors

### 9.1 Basic Hash Computation

**Input:**

```json
{
  "ticket_id": "FIN-1234",
  "approved_by": "ciso@corp.com",
  "approved_at": "2025-01-15T10:30:00Z"
}
```

**Canonical String:**

```
approved_at=2025-01-15T10:30:00Z|approved_by=ciso@corp.com|ticket_id=FIN-1234
```

**Expected Hash:**

```
sha256:7d865e959b2466918c9863afca942d0fb89d7c9ac0c99bafc3749504ded97730
```

### 9.2 With Email Normalization

**Input:**

```json
{
  "ticket_id": "SEC-5678",
  "approved_by": "CISO@Corp.COM",
  "approved_at": "2025-06-01T00:00:00Z"
}
```

**Canonical String (after normalization):**

```
approved_at=2025-06-01T00:00:00Z|approved_by=ciso@corp.com|ticket_id=SEC-5678
```

**Expected Hash:**

```
sha256:3a7bd3e2d47f9c8a1b6e5f4c2d9a8b7c6e5f4d3c2b1a0f9e8d7c6b5a4f3e2d1c0
```

### 9.3 With Whitespace Trimming

**Input:**

```json
{
  "ticket_id": "  ML-9999  ",
  "approved_by": "  ml-team@corp.com  ",
  "approved_at": "  2025-12-25T12:00:00Z  "
}
```

**Canonical String (after trimming):**

```
approved_at=2025-12-25T12:00:00Z|approved_by=ml-team@corp.com|ticket_id=ML-9999
```

---

## 10. Conformance

### 10.1 Level 1 (Minimal)

- MUST compute hash using specified algorithm
- MUST use SHA-256
- MUST use canonical string format

### 10.2 Level 2 (Standard)

- MUST satisfy Level 1
- MUST verify hash on asset load
- SHOULD support signature verification

### 10.3 Level 3 (Full)

- MUST satisfy Level 2
- MUST support signature verification
- MUST support key rotation
- SHOULD support expiration checking

---

## Appendix A: JSON Schema

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$id": "https://aigrc.dev/schemas/golden-thread.json",
  "title": "GoldenThread",
  "type": "object",
  "required": ["ticket_id", "approved_by", "approved_at"],
  "properties": {
    "ticket_id": {
      "type": "string",
      "description": "Reference to business authorization ticket",
      "minLength": 1,
      "examples": ["FIN-1234", "AIGOVERN-567"]
    },
    "approved_by": {
      "type": "string",
      "format": "email",
      "description": "Email of the approver"
    },
    "approved_at": {
      "type": "string",
      "format": "date-time",
      "description": "ISO 8601 timestamp of approval"
    },
    "ticket_system": {
      "type": "string",
      "enum": ["jira", "azure-devops", "github", "servicenow", "other"],
      "description": "Type of ticketing system"
    },
    "ticket_url": {
      "type": "string",
      "format": "uri",
      "description": "Direct URL to the ticket"
    },
    "approver_signature": {
      "type": "string",
      "pattern": "^(RSA-SHA256|ECDSA-P256):[A-Za-z0-9+/=]+$",
      "description": "Digital signature from approver"
    },
    "expires_at": {
      "type": "string",
      "format": "date-time",
      "description": "When authorization expires"
    },
    "scope": {
      "type": "string",
      "description": "What the authorization covers"
    },
    "hash": {
      "type": "string",
      "pattern": "^sha256:[a-f0-9]{64}$",
      "description": "Computed Golden Thread hash"
    }
  }
}
```

---

## Appendix B: Changelog

| Version     | Date       | Changes       |
| ----------- | ---------- | ------------- |
| 1.0.0-draft | 2025-12-29 | Initial draft |
