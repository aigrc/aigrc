# AIGRC-EVT-001: Governance Event Architecture

**Version:** 0.1.0
**Status:** Draft
**Authors:** AIGRC Core Team
**Created:** 2026-02-24
**Package:** `@aigrc/events`

---

## 1. Purpose & Scope

AIGRC-EVT-001 defines the **Governance Event Architecture** — the structured data format, identity scheme, integrity mechanism, delivery channels, and validation rules for all governance events flowing between AIGRC developer tools and the AIGOS control plane.

Every action that changes an AI asset's governance state (creation, scanning, classification, compliance evaluation, enforcement decision, lifecycle transition, policy change, or audit) produces a **GovernanceEvent**. These events form an immutable, tamper-evident audit trail.

### 1.1 Goals

- **Unified schema** — One envelope format for all 31 event types across 8 governance domains
- **Deterministic identity** — Same event never gets two different IDs; duplicate detection is built-in
- **Tamper evidence** — SHA-256 canonical hashing; daily Merkle root checkpoints
- **Bidirectional feedback** — Push an event, receive policy violations, compliance gaps, warnings, and suggestions
- **Tool agnostic** — CLI, VS Code, GitHub Action, MCP Server, Runtime SDK, I2E Bridge, I2E Firewall all use the same schema

### 1.2 Non-Goals

- Real-time streaming protocol (WebSocket channel is Phase 2)
- Cross-organization event federation
- Event schema versioning/migration tooling

---

## 2. Conformance

An implementation conforms to EVT-001 if it:

1. Produces events matching the GovernanceEvent envelope (§3)
2. Computes deterministic event IDs per §4
3. Computes SHA-256 hashes per §13
4. Includes a valid GoldenThreadRef on every event
5. Passes all validation checks in §10

---

## 3. Event Envelope

Every GovernanceEvent contains exactly **17 fields** grouped into 7 concerns:

### 3.1 Identity (3 fields)

| Field | Type | Required | Format |
|-------|------|----------|--------|
| `id` | string | Yes | `evt_[a-f0-9]{32}` — deterministic, never random |
| `specVersion` | string | Yes | Literal `"1.0"` |
| `schemaVersion` | string | Yes | `aigrc-events@{semver}` (e.g., `aigrc-events@0.1.0`) |

### 3.2 Classification (3 fields)

| Field | Type | Required | Values |
|-------|------|----------|--------|
| `type` | string | Yes | One of 31 event types (see §5) |
| `category` | string | Yes | One of 8 categories: `asset`, `scan`, `classification`, `compliance`, `enforcement`, `lifecycle`, `policy`, `audit` |
| `criticality` | string | Yes | `normal`, `high`, or `critical` |

### 3.3 Provenance (3 fields)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `source` | object | Yes | Producer tool metadata (see §8) |
| `orgId` | string | Yes | Organization identifier |
| `assetId` | string | Yes | AI asset identifier |

### 3.4 Temporality (2 fields)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `producedAt` | string | Yes | ISO 8601 timestamp, set by producer |
| `receivedAt` | string | No | ISO 8601 timestamp, **server-set only** — producers must NOT set this |

### 3.5 Accountability (1 field)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `goldenThread` | object | Yes | Business authorization reference — either LinkedThread or OrphanDeclaration (see §6) |

### 3.6 Integrity (3 fields)

| Field | Type | Required | Format |
|-------|------|----------|--------|
| `hash` | string | Yes | `sha256:[a-f0-9]{64}` — computed over canonical form (see §13) |
| `previousHash` | string | No | Hash of the previous event for this asset (chain linking) |
| `signature` | string | No | HMAC or asymmetric signature (SILVER+ conformance) |

### 3.7 Chain Linking (2 fields)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `parentEventId` | string | No | ID of a causally related parent event |
| `correlationId` | string | No | Groups related events (e.g., all events from one CI run) |

### 3.8 Payload (1 field)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `data` | object | Yes | Category-specific payload — must contain at least one field |

---

## 4. Deterministic Event Identity

Event IDs are **never random UUIDs**. They are computed deterministically so the same logical event always produces the same ID, enabling deduplication at the database level.

### 4.1 Standard-Frequency Path

Used by: CLI, VS Code, GitHub Action, MCP Server, I2E Bridge, Platform

```
id = "evt_" + sha256(orgId + ":" + tool + ":" + type + ":" + assetId + ":" + floor10ms(timestamp))[0:32]
```

Timestamp is floored to 10ms precision to absorb minor timing jitter.

### 4.2 High-Frequency Path

Used by: Runtime SDK, I2E Firewall

```
id = "evt_" + sha256(instanceId + ":" + type + ":" + assetId + ":" + floor1ms(timestamp) + ":" + localSeq)[0:32]
```

Uses 1ms precision and a local sequence counter for sub-millisecond disambiguation.

### 4.3 Format

```
evt_[a-f0-9]{32}
```

Always lowercase hex. Total length: 36 characters (4 prefix + 32 hex).

---

## 5. Event Type Taxonomy

31 event types organized into 8 governance domains:

### 5.1 Asset Events (5)

| Type | Default Criticality | Payload |
|------|-------------------|---------|
| `aigrc.asset.created` | normal | AssetEventPayload |
| `aigrc.asset.updated` | normal | AssetEventPayload (with `changes[]`) |
| `aigrc.asset.registered` | normal | AssetEventPayload |
| `aigrc.asset.retired` | normal | AssetEventPayload |
| `aigrc.asset.discovered` | **high** | AssetEventPayload |

### 5.2 Scan Events (3)

| Type | Default Criticality | Payload |
|------|-------------------|---------|
| `aigrc.scan.started` | normal | ScanEventPayload |
| `aigrc.scan.completed` | normal | ScanEventPayload |
| `aigrc.scan.finding` | normal | ScanEventPayload |

### 5.3 Classification Events (3)

| Type | Default Criticality | Payload |
|------|-------------------|---------|
| `aigrc.classification.applied` | normal | ClassificationEventPayload |
| `aigrc.classification.changed` | **high** | ClassificationEventPayload |
| `aigrc.classification.disputed` | normal | ClassificationEventPayload |

### 5.4 Compliance Events (4)

| Type | Default Criticality | Payload |
|------|-------------------|---------|
| `aigrc.compliance.evaluated` | normal | ComplianceEventPayload |
| `aigrc.compliance.passed` | normal | ComplianceEventPayload |
| `aigrc.compliance.failed` | **high** | ComplianceEventPayload |
| `aigrc.compliance.gap` | normal | ComplianceEventPayload |

### 5.5 Enforcement Events (4)

| Type | Default Criticality | Payload |
|------|-------------------|---------|
| `aigrc.enforcement.decision` | normal | EnforcementEventPayload |
| `aigrc.enforcement.violation` | **high** | EnforcementEventPayload |
| `aigrc.enforcement.override` | **high** | EnforcementEventPayload |
| `aigrc.enforcement.killswitch` | **critical** | EnforcementEventPayload |

### 5.6 Lifecycle Events (6)

| Type | Default Criticality | Payload |
|------|-------------------|---------|
| `aigrc.lifecycle.orphan.declared` | normal | LifecycleEventPayload |
| `aigrc.lifecycle.orphan.resolved` | normal | LifecycleEventPayload |
| `aigrc.lifecycle.orphan.overdue` | **high** | LifecycleEventPayload |
| `aigrc.lifecycle.decay.warned` | **high** | LifecycleEventPayload |
| `aigrc.lifecycle.decay.expired` | **high** | LifecycleEventPayload |
| `aigrc.lifecycle.decay.renewed` | normal | LifecycleEventPayload |

### 5.7 Policy Events (3)

| Type | Default Criticality | Payload |
|------|-------------------|---------|
| `aigrc.policy.compiled` | normal | PolicyEventPayload |
| `aigrc.policy.published` | normal | PolicyEventPayload |
| `aigrc.policy.deprecated` | normal | PolicyEventPayload |

### 5.8 Audit Events (3)

| Type | Default Criticality | Payload |
|------|-------------------|---------|
| `aigrc.audit.report.generated` | normal | AuditEventPayload |
| `aigrc.audit.chain.verified` | normal | AuditEventPayload |
| `aigrc.audit.chain.broken` | **critical** | AuditEventPayload |

---

## 6. Golden Thread Reference

Every event MUST include a `goldenThread` field linking it to business authorization. This is a discriminated union on the `type` field.

### 6.1 LinkedThread

Active business authorization exists:

```json
{
  "type": "linked",
  "system": "jira",
  "ref": "AIG-199",
  "url": "https://aigos.atlassian.net/browse/AIG-199",
  "status": "active",
  "verifiedAt": "2026-02-24T12:00:00Z"
}
```

Fields: `system` (string), `ref` (string), `url` (valid URL), `status` (`active` | `completed` | `cancelled` | `unknown`), `verifiedAt` (optional datetime).

### 6.2 OrphanDeclaration

No business authorization yet — the asset is operating without formal approval:

```json
{
  "type": "orphan",
  "reason": "discovery",
  "declaredBy": "dev@pangolabs.cloud",
  "declaredAt": "2026-02-24T12:00:00Z",
  "remediationDeadline": "2026-03-10T12:00:00Z",
  "remediationNote": "Will link to AIG-200 once sprint begins and work is assigned"
}
```

Fields: `reason` (`discovery` | `pre-authorization` | `legacy-migration` | `emergency-deploy`), `declaredBy` (string), `declaredAt` (datetime), `remediationDeadline` (datetime), `remediationNote` (string, min 10 chars).

---

## 8. Producer Tools

Eight tool types can produce governance events:

| Tool | Frequency | ID Path | Description |
|------|-----------|---------|-------------|
| `cli` | Standard | orgId | AIGRC command-line interface |
| `vscode` | Standard | orgId | VS Code extension |
| `github-action` | Standard | orgId | GitHub Action integration |
| `mcp-server` | Standard | orgId | MCP Server (AI agent tool) |
| `i2e-bridge` | Standard | orgId | I2E Bridge connector |
| `platform` | Standard | orgId | AIGOS platform itself |
| `runtime-sdk` | **High** | instanceId | Runtime policy enforcement |
| `i2e-firewall` | **High** | instanceId | I2E Firewall inline decisions |

### 8.1 EventSource Object

```json
{
  "tool": "cli",
  "version": "0.4.2",
  "orgId": "org-pangolabs",
  "instanceId": "inst-001",
  "identity": {
    "type": "api-key",
    "subject": "dev@pangolabs.cloud"
  },
  "environment": "production"
}
```

Identity types: `api-key`, `oauth`, `agent-token`, `service-token`.
Environments: `development`, `staging`, `production`, `ci`.

---

## 10. Validation

### 10.1 Validation Sequence

Events are validated in order. All errors are collected (not fail-fast):

1. Structural validation (Zod schema parse)
2. `id` format: `evt_[a-f0-9]{32}`
3. `schemaVersion` format: `aigrc-events@{semver}`
4. `type` is one of 31 known types
5. `category` matches `type` per EVENT_TYPE_CATEGORY_MAP
6. `goldenThread` is present
7. `goldenThread` is valid LinkedThread or OrphanDeclaration
8. OrphanDeclaration `remediationNote` >= 10 characters
9. `hash` format: `sha256:[a-f0-9]{64}`
10. `hash` matches recomputed canonical hash
11. `receivedAt` NOT set by producer
12. `data` has at least one field

### 10.2 Error Codes

| Code | Condition |
|------|-----------|
| `EVT_ID_INVALID` | Malformed event ID |
| `EVT_SCHEMA_VERSION_UNKNOWN` | Unrecognized schema version |
| `EVT_TYPE_INVALID` | Unknown event type |
| `EVT_CATEGORY_MISMATCH` | Category doesn't match type |
| `EVT_GOLDEN_THREAD_MISSING` | No goldenThread field |
| `EVT_GOLDEN_THREAD_INVALID` | Invalid goldenThread structure |
| `EVT_ORPHAN_NOTE_TOO_SHORT` | remediationNote < 10 chars |
| `EVT_HASH_MISSING` | No hash field |
| `EVT_HASH_FORMAT` | Malformed hash |
| `EVT_HASH_INVALID` | Hash doesn't match content |
| `EVT_SIGNATURE_INVALID` | Invalid cryptographic signature |
| `EVT_RECEIVED_AT_REJECTED` | Producer attempted to set receivedAt |
| `EVT_DATA_EMPTY` | Empty data payload |
| `EVT_DUPLICATE` | Event ID already exists |
| `EVT_RATE_LIMITED` | Rate limit exceeded |

---

## 12. Delivery Channels

### 12.1 Sync Channel

**`POST /v1/events`** — Single event push with immediate feedback.

- Request: GovernanceEvent JSON
- Response: PushResponse (accepted/rejected + policy feedback)
- Status: 201 Created, 200 OK (duplicate), 400 Bad Request, 401 Unauthorized, 429 Rate Limited

### 12.2 Batch Channel

**`POST /v1/events/batch`** — Multi-event push for high-throughput.

- Request: Array of GovernanceEvent (max 1000)
- Response: BatchResponse (per-event accepted/rejected/duplicate counts)
- Status: 200 OK, 400 Bad Request, 413 Payload Too Large (>1000), 429 Rate Limited

### 12.3 Stream Channel (Phase 2)

**`WebSocket /v1/events/stream`** — Persistent connection for runtime-sdk and i2e-firewall.

### 12.4 Channel Selection

| Condition | Channel |
|-----------|---------|
| Critical event | Always Sync |
| Single event | Sync |
| Multiple events | Batch |
| runtime-sdk / i2e-firewall | Stream (Phase 2, falls back to Batch) |

### 12.5 PushResponse

```json
{
  "status": "accepted",
  "eventId": "evt_a3f8c2e1d94b7f63a2891c04e5d6b7f8",
  "receivedAt": "2026-02-24T12:00:01Z",
  "policyResult": {
    "evaluated": true,
    "passed": false,
    "bundleId": "bundle-001",
    "violations": [...],
    "waivers": [...]
  },
  "warnings": [...],
  "suggestions": [...]
}
```

### 12.6 Rate Limiting

| Channel | Limit | Burst |
|---------|-------|-------|
| Sync | 100 events/min | 20 events |
| Batch | 10 requests/min | 2 requests |

Critical events are exempt from rate limits. 429 responses include `Retry-After` header.

---

## 13. Integrity

### 13.1 Per-Event Hashing

Canonical form computation:
1. Remove fields: `hash`, `signature`, `receivedAt`
2. Sort all object keys alphabetically at every nesting level
3. Serialize to compact JSON (no whitespace)
4. UTF-8 encode
5. SHA-256 hash
6. Format: `sha256:{64 lowercase hex characters}`

### 13.2 Hash Verification

Recompute the canonical hash and compare with constant-time string comparison (prevents timing attacks).

### 13.3 Daily Merkle Root (Phase 2)

At UTC midnight, for each organization:
1. Select all events for the completed day
2. Sort by `received_at`
3. Compute leaf hashes from each event's `hash` field
4. Build binary Merkle tree
5. Store root in `integrity_checkpoints` table
6. Emit `aigrc.audit.chain.verified` event

---

## Appendix A: Reference Implementation

The reference implementation is the `@aigrc/events` npm package in the AIGRC monorepo at `packages/events/`.

## Appendix B: Full Event Type Taxonomy

See §5 for the complete 31-type taxonomy with default criticality levels and payload types.

## Appendix C: Validation Error Codes

See §10.2 for the complete 15-code error catalog.

---

## Changelog

| Version | Date | Changes |
|---------|------|---------|
| 0.1.0 | 2026-02-24 | Initial draft — envelope, identity, taxonomy, validation, hashing |
