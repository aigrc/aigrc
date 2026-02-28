# AIGRC-API-001: AIGOS Governance API Contract

**Version:** 0.1.0 (Draft)
**Status:** Draft
**Authors:** AIGRC Core Team
**Created:** 2026-02-24
**Ticket:** AIG-222 (8 SP)
**Depends On:** AIGRC-EVT-001 (Governance Event Architecture)

---

## Table of Contents

1. [Purpose & Scope](#1-purpose--scope)
2. [Base URL & Versioning](#2-base-url--versioning)
3. [Authentication](#3-authentication)
4. [Multi-Tenant Cell Routing](#4-multi-tenant-cell-routing)
5. [Endpoints](#5-endpoints)
6. [Request/Response Schemas](#6-requestresponse-schemas)
7. [Error Handling](#7-error-handling)
8. [Rate Limiting](#8-rate-limiting)
9. [CORS & Security Headers](#9-cors--security-headers)
10. [Integrity Checkpoints](#10-integrity-checkpoints)
11. [WebSocket Protocol (Phase 2)](#11-websocket-protocol-phase-2)
12. [gRPC Service (Phase 2)](#12-grpc-service-phase-2)
13. [Appendices](#13-appendices)

---

## 1. Purpose & Scope

AIGRC-API-001 defines the **HTTP API contract** for the AIGOS control plane — the centralized governance service that receives, validates, stores, and queries governance events produced by all AIGRC developer tools.

This specification covers:

- **Event ingestion** — Sync and Batch channels for pushing governance events
- **Event retrieval** — Paginated queries over the event ledger with filtering
- **Asset summaries** — Aggregated views derived from the event stream
- **Policy feedback** — Real-time compliance evaluation on the Sync channel
- **Integrity verification** — Merkle root checkpoints for tamper evidence
- **Health monitoring** — Service health and version introspection

### 1.1 Relationship to AIGRC-EVT-001

AIGRC-EVT-001 (Governance Event Architecture) is the **authoritative source** for:

- The GovernanceEvent envelope schema (17 fields across 7 concerns)
- Deterministic event identity computation (standard-frequency and high-frequency paths)
- Event type taxonomy (31 types across 8 governance domains)
- Golden thread reference types (LinkedThread, OrphanDeclaration)
- Canonical hash computation algorithm
- Validation sequence and error codes
- Policy evaluation rules and conformance targets
- Producer buffering strategies

This API contract specifies **how those schemas are transported over HTTP** — the endpoint paths, HTTP methods, request/response shapes, authentication, rate limiting, security headers, and operational concerns.

### 1.2 Implementation Stack

The reference server implementation uses:

| Component | Technology |
|-----------|-----------|
| HTTP framework | Express.js |
| Security headers | Helmet |
| Persistence | Supabase (PostgreSQL + Row-Level Security) |
| Event validation | Zod schemas from `@aigrc/events` package |
| Rate limiting | Sliding window algorithm (in-memory + Redis) |
| Authentication | Bearer tokens with 4 auth flows |

### 1.3 Design Principles

1. **Append-only ledger** — Events are immutable once stored; no UPDATE or DELETE operations exist
2. **Hash chain integrity** — Events link to their predecessors via `previousHash`, forming a tamper-evident chain
3. **Multi-tenant isolation** — Every request is org-scoped via RLS; cross-tenant data access is impossible
4. **Fail-safe validation** — All validation errors are collected (not fail-fast) and returned together
5. **Backward compatibility** — New fields are always additive; existing fields are never removed or renamed

### 1.4 Related Specifications

| Spec ID | Title | Relationship |
|---------|-------|-------------|
| AIGRC-EVT-001 | Governance Event Architecture | Defines event schemas, validation, and business rules implemented by this API |
| SPEC-CGA-001 | Certified Governed Agent Framework | CGA certification levels (BRONZE/SILVER/GOLD) referenced in policy evaluation |

---

## 2. Base URL & Versioning

### 2.1 Base URL

```
https://api.aigos.dev/v1
```

All endpoints are prefixed with `/v1`. The version prefix is part of the URL path and is mandatory.

### 2.2 Environment URLs

| Environment | Base URL |
|-------------|----------|
| Production | `https://api.aigos.dev/v1` |
| Staging | `https://api.staging.aigos.dev/v1` |
| Development | `http://localhost:4100/v1` |

### 2.3 Versioning Strategy

- **Semantic versioning** — The API version follows `MAJOR.MINOR.PATCH`
- **URL-level versioning** — Major version changes result in a new URL prefix (e.g., `/v2`)
- **Backward compatibility** — Within a major version, all changes are backward compatible:
  - New optional fields may be added to request/response bodies
  - New query parameters may be added with defaults preserving existing behavior
  - New endpoints may be added
  - Existing fields are never removed, renamed, or have their type changed
- **Deprecation policy** — Deprecated features carry a `Sunset` header with the removal date; deprecated endpoints return a `Deprecation` header with the deprecation date
- **Minimum support window** — A deprecated major version is supported for at least 12 months after the successor is released

### 2.4 Content Type

All requests and responses use `application/json` with UTF-8 encoding.

```
Content-Type: application/json; charset=utf-8
```

---

## 3. Authentication

All endpoints except `GET /v1/health` require authentication via the `Authorization` header. The API supports four authentication flows, each optimized for a different integration pattern.

### 3.1 API Key (`api-key`)

**Use case:** CLI tools, local development, quick integrations.

```
Authorization: Bearer aigrc_key_a1b2c3d4e5f6...
```

| Property | Value |
|----------|-------|
| Token prefix | `aigrc_key_` |
| Lifetime | Long-lived (until rotated) |
| Scope | Full org access |
| Issued by | AIGOS Dashboard > Settings > API Keys |
| Rotation | Manual; old key is revoked immediately on rotation |

API keys are bound to a specific organization. The `orgId` is extracted from the key's metadata during authentication — it does not need to be passed in the request body.

### 3.2 OAuth 2.0 (`oauth`)

**Use case:** Dashboard web applications, third-party integrations.

```
Authorization: Bearer eyJhbGciOiJSUzI1NiIs...
```

| Property | Value |
|----------|-------|
| Token format | JWT (RS256) |
| Lifetime | 1 hour (access token), 30 days (refresh token) |
| Scope | Configurable: `events:read`, `events:write`, `assets:read`, `admin` |
| Grant types | Authorization Code (PKCE), Client Credentials |
| Token endpoint | `https://auth.aigos.dev/oauth/token` |
| JWKS endpoint | `https://auth.aigos.dev/.well-known/jwks.json` |

OAuth tokens include `orgId` and `scope` claims in the JWT payload. The server validates the token signature against the JWKS endpoint and extracts claims without an additional database lookup.

### 3.3 Agent Token (`agent-token`)

**Use case:** MCP Server (AI agent tool calls), short-lived automated workflows.

```
Authorization: Bearer aigrc_agent_x9y8z7w6...
```

| Property | Value |
|----------|-------|
| Token prefix | `aigrc_agent_` |
| Lifetime | 15 minutes (short-lived) |
| Scope | `events:write` only |
| Issued by | Token exchange from a parent API key or OAuth session |
| Refresh | Not refreshable; a new token must be requested |

Agent tokens are designed for AI agents operating via MCP. They carry minimal privileges and expire quickly to limit blast radius if compromised. An agent token is issued by exchanging a higher-privilege credential:

```
POST /v1/auth/agent-token
Authorization: Bearer aigrc_key_...
Content-Type: application/json

{
  "ttlSeconds": 900,
  "scope": ["events:write"]
}
```

Response:

```json
{
  "token": "aigrc_agent_x9y8z7w6...",
  "expiresAt": "2026-02-24T12:15:00Z",
  "scope": ["events:write"]
}
```

### 3.4 Service Token (`service-token`)

**Use case:** GitHub Action CI/CD pipelines, automated infrastructure.

```
Authorization: Bearer aigrc_svc_m3n4o5p6...
```

| Property | Value |
|----------|-------|
| Token prefix | `aigrc_svc_` |
| Lifetime | Long-lived (until rotated) |
| Scope | `events:write`, `events:read` |
| Issued by | AIGOS Dashboard > Settings > Service Tokens |
| Binding | Optionally bound to a specific repository or CI environment |

Service tokens are intended for unattended CI/CD pipelines. They support optional environment binding: a token bound to `repo:pangolabs/my-agent` and `environment:ci` will be rejected if used from a different context (verified via the `source.environment` field in the event).

### 3.5 Authentication Error Responses

| Status | Error Code | Condition |
|--------|-----------|-----------|
| 401 | `AUTH_INVALID_TOKEN` | Token is missing, malformed, or has an unrecognized prefix |
| 401 | `AUTH_EXPIRED_TOKEN` | Token has expired (agent tokens, OAuth access tokens) |
| 403 | `AUTH_INSUFFICIENT_SCOPE` | Token does not have the required scope for this endpoint |

All authentication errors return the standard error envelope (see [Section 7](#7-error-handling)).

### 3.6 Scope Requirements by Endpoint

| Endpoint | Required Scope |
|----------|---------------|
| `POST /v1/events` | `events:write` |
| `POST /v1/events/batch` | `events:write` |
| `GET /v1/events` | `events:read` |
| `GET /v1/events/:id` | `events:read` |
| `GET /v1/assets` | `assets:read` or `events:read` |
| `GET /v1/assets/:assetId/events` | `events:read` |
| `GET /v1/health` | None (public) |
| `GET /v1/integrity/checkpoints` | `events:read` |

---

## 4. Multi-Tenant Cell Routing

### 4.1 Overview

The AIGOS control plane is a multi-tenant system. Every request is scoped to exactly one organization, identified by `orgId`. Tenant isolation is enforced at multiple layers to prevent cross-tenant data access.

### 4.2 Organization Resolution

The `orgId` is **always extracted from the authentication token**, never from the request body or query parameters (with the exception of read-only query filters that are validated against the token's `orgId`).

```
Token → orgId extraction → RLS policy binding → query execution
```

The resolution flow:

1. **API Key** — `orgId` is stored in the `api_keys` table alongside the key hash
2. **OAuth JWT** — `orgId` is a claim in the JWT payload (`"org_id": "org-pangolabs"`)
3. **Agent Token** — `orgId` is inherited from the parent credential that issued the agent token
4. **Service Token** — `orgId` is stored in the `service_tokens` table

### 4.3 Row-Level Security (RLS)

Supabase enforces Row-Level Security on all tables. The RLS policies ensure that:

- **INSERT** — The `org_id` column of the inserted row must match the authenticated `orgId`
- **SELECT** — Only rows where `org_id` matches the authenticated `orgId` are visible
- **UPDATE** — Not applicable (events are immutable; no UPDATE operations exist)
- **DELETE** — Not applicable (append-only ledger; no DELETE operations exist)

RLS policy (simplified):

```sql
CREATE POLICY "org_isolation" ON governance_events
  USING (org_id = current_setting('app.current_org_id')::text)
  WITH CHECK (org_id = current_setting('app.current_org_id')::text);
```

Before each request, the server sets the session variable:

```sql
SET LOCAL app.current_org_id = 'org-pangolabs';
```

### 4.4 Cell-Level Isolation

Beyond RLS, the architecture supports cell-level isolation for enterprise customers:

| Isolation Level | Description | Availability |
|----------------|-------------|--------------|
| **Shared** | RLS on shared Supabase instance | All tiers |
| **Dedicated schema** | Separate PostgreSQL schema per org | Enterprise |
| **Dedicated instance** | Separate Supabase project per org | Enterprise+ |

Cell routing is transparent to the API consumer. The same API contract applies regardless of isolation level.

### 4.5 Query Parameter Validation

When `orgId` appears as a query parameter (e.g., `GET /v1/events?orgId=...`), the server validates that the query parameter matches the token's `orgId`. A mismatch results in:

```json
{
  "error": {
    "code": "AUTH_INSUFFICIENT_SCOPE",
    "message": "Token orgId does not match requested orgId"
  }
}
```

This prevents a compromised token from being used to probe other organizations' data.

---

## 5. Endpoints

All endpoints below are relative to the base URL (`https://api.aigos.dev/v1`).

### 5.1 POST /v1/events — Sync Channel (Single Event Push)

Pushes a single governance event with immediate policy feedback. This is the primary ingestion endpoint for interactive tools (CLI, VS Code, MCP Server).

#### Request

**Method:** `POST`
**Path:** `/v1/events`
**Authentication:** Required (`events:write`)
**Content-Type:** `application/json`

**Body:** A complete GovernanceEvent object as defined in AIGRC-EVT-001 Section 3.

```json
{
  "id": "evt_a3f8c2e1d94b7f63a2891c04e5d6b7f8",
  "specVersion": "1.0",
  "schemaVersion": "aigrc-events@0.1.0",
  "type": "aigrc.asset.created",
  "category": "asset",
  "criticality": "normal",
  "source": {
    "tool": "cli",
    "version": "0.4.2",
    "orgId": "org-pangolabs",
    "identity": {
      "type": "api-key",
      "subject": "dev@pangolabs.cloud"
    },
    "environment": "production"
  },
  "orgId": "org-pangolabs",
  "assetId": "agent-001",
  "producedAt": "2026-02-24T12:00:00.000Z",
  "goldenThread": {
    "type": "linked",
    "system": "jira",
    "ref": "AIG-199",
    "url": "https://aigos.atlassian.net/browse/AIG-199",
    "status": "active",
    "verifiedAt": "2026-02-24T12:00:00Z"
  },
  "hash": "sha256:a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2",
  "previousHash": "sha256:0000000000000000000000000000000000000000000000000000000000000000",
  "data": {
    "name": "Customer Support Agent",
    "assetType": "agent",
    "riskTier": "medium"
  }
}
```

#### Response (201 Created)

Event accepted and stored. Policy evaluation is included if the event type is eligible (see AIGRC-EVT-001 Section 7.1).

```json
{
  "event": {
    "id": "evt_a3f8c2e1d94b7f63a2891c04e5d6b7f8",
    "hash": "sha256:a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2",
    "receivedAt": "2026-02-24T12:00:01.234Z"
  },
  "policyResult": {
    "evaluated": true,
    "passed": true,
    "bundleId": "bundle-001",
    "violations": [],
    "waivers": []
  },
  "warnings": [],
  "suggestions": [
    {
      "code": "SUGGEST_CORRELATION_ID",
      "message": "Consider adding a correlationId to group related events"
    }
  ]
}
```

#### Response (200 OK — Duplicate)

Event ID already exists with identical content. The server returns the existing event's metadata. This is idempotent — resubmitting the same event is safe.

```json
{
  "event": {
    "id": "evt_a3f8c2e1d94b7f63a2891c04e5d6b7f8",
    "hash": "sha256:a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2",
    "receivedAt": "2026-02-24T12:00:01.234Z"
  },
  "duplicate": true
}
```

#### Error Responses

| Status | Error Code | Condition |
|--------|-----------|-----------|
| 400 | `EVT_VALIDATION_FAILED` | One or more validation checks failed (see AIGRC-EVT-001 Section 10) |
| 401 | `AUTH_INVALID_TOKEN` | Missing or invalid authentication |
| 401 | `AUTH_EXPIRED_TOKEN` | Token has expired |
| 403 | `AUTH_INSUFFICIENT_SCOPE` | Token lacks `events:write` scope |
| 409 | `EVT_DUPLICATE_ID` | Event ID exists but content hash differs (collision) |
| 429 | `RATE_LIMIT_EXCEEDED` | Rate limit exceeded (see [Section 8](#8-rate-limiting)) |

**400 Validation Error Detail:**

```json
{
  "error": {
    "code": "EVT_VALIDATION_FAILED",
    "message": "Event validation failed with 2 errors",
    "details": [
      {
        "code": "EVT_HASH_INVALID",
        "message": "Hash does not match recomputed canonical hash",
        "field": "hash"
      },
      {
        "code": "EVT_ORPHAN_NOTE_TOO_SHORT",
        "message": "OrphanDeclaration remediationNote must be at least 10 characters",
        "field": "goldenThread.remediationNote"
      }
    ]
  }
}
```

**409 Duplicate ID with Hash Mismatch:**

```json
{
  "error": {
    "code": "EVT_DUPLICATE_ID",
    "message": "Event ID exists with a different content hash. This indicates an ID collision.",
    "details": {
      "existingHash": "sha256:existing...",
      "submittedHash": "sha256:submitted..."
    }
  }
}
```

---

### 5.2 POST /v1/events/batch — Batch Channel (Multi-Event Push)

Pushes up to 100 governance events in a single request. Optimized for high-throughput ingestion. Does NOT perform policy evaluation (events are validated and stored only).

#### Request

**Method:** `POST`
**Path:** `/v1/events/batch`
**Authentication:** Required (`events:write`)
**Content-Type:** `application/json`

**Body:**

```json
{
  "events": [
    { /* GovernanceEvent 1 */ },
    { /* GovernanceEvent 2 */ },
    { /* GovernanceEvent 3 */ }
  ]
}
```

| Field | Type | Required | Constraints |
|-------|------|----------|-------------|
| `events` | `GovernanceEvent[]` | Yes | Min: 1, Max: 100 |

#### Response (200 OK)

```json
{
  "accepted": 2,
  "rejected": 1,
  "results": [
    {
      "index": 0,
      "status": "accepted",
      "eventId": "evt_a3f8c2e1d94b7f63a2891c04e5d6b7f8",
      "receivedAt": "2026-02-24T12:00:01.234Z"
    },
    {
      "index": 1,
      "status": "accepted",
      "eventId": "evt_b4c9d3e2f05a8g74b3902d15f6e7c8a9",
      "receivedAt": "2026-02-24T12:00:01.235Z"
    },
    {
      "index": 2,
      "status": "rejected",
      "eventId": "evt_c5d0e4f3a16b9h85c4013e26a7f8d9b0",
      "errors": [
        {
          "code": "EVT_HASH_INVALID",
          "message": "Hash does not match recomputed canonical hash",
          "field": "hash"
        }
      ]
    }
  ],
  "warnings": [
    "Event at index 0 has an orphan golden thread approaching remediation deadline"
  ]
}
```

| Field | Type | Description |
|-------|------|-------------|
| `accepted` | number | Count of events successfully stored |
| `rejected` | number | Count of events that failed validation |
| `results` | array | Per-event result in submission order |
| `results[].index` | number | Zero-based index in the input array |
| `results[].status` | string | `"accepted"`, `"rejected"`, or `"duplicate"` |
| `results[].eventId` | string | Event ID (present for all statuses) |
| `results[].receivedAt` | string | Server-assigned timestamp (accepted events only) |
| `results[].errors` | array | Validation errors (rejected events only) |
| `warnings` | string[] | Non-blocking warnings across the batch |

#### Partial Acceptance

The batch endpoint uses **partial acceptance**: valid events are stored even if other events in the same batch fail validation. This ensures that a single malformed event does not block the entire batch.

#### Error Responses

| Status | Error Code | Condition |
|--------|-----------|-----------|
| 400 | `EVT_VALIDATION_FAILED` | Request-level validation failed (e.g., `events` is not an array) |
| 401 | `AUTH_INVALID_TOKEN` | Missing or invalid authentication |
| 401 | `AUTH_EXPIRED_TOKEN` | Token has expired |
| 403 | `AUTH_INSUFFICIENT_SCOPE` | Token lacks `events:write` scope |
| 413 | `BATCH_TOO_LARGE` | More than 100 events in a single request |
| 429 | `RATE_LIMIT_EXCEEDED` | Rate limit exceeded |

---

### 5.3 GET /v1/events — List Events

Returns a paginated, filtered list of governance events for the authenticated organization.

#### Request

**Method:** `GET`
**Path:** `/v1/events`
**Authentication:** Required (`events:read`)

#### Query Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `orgId` | string | (from token) | Organization ID; must match token's `orgId` |
| `assetId` | string | — | Filter by asset ID (exact match) |
| `type` | string | — | Filter by event type (e.g., `aigrc.asset.created`) |
| `category` | string | — | Filter by category (e.g., `asset`, `scan`, `compliance`) |
| `criticality` | string | — | Filter by criticality (`normal`, `high`, `critical`) |
| `since` | string | — | ISO 8601 timestamp; return events with `receivedAt` after this time |
| `until` | string | — | ISO 8601 timestamp; return events with `receivedAt` before this time |
| `limit` | integer | 20 | Page size; minimum: 1, maximum: 100 |
| `offset` | integer | 0 | Pagination offset; minimum: 0 |

Multiple filters are combined with AND logic.

#### Response (200 OK)

```json
{
  "events": [
    {
      "id": "evt_a3f8c2e1d94b7f63a2891c04e5d6b7f8",
      "specVersion": "1.0",
      "schemaVersion": "aigrc-events@0.1.0",
      "type": "aigrc.asset.created",
      "category": "asset",
      "criticality": "normal",
      "source": { "tool": "cli", "version": "0.4.2" },
      "orgId": "org-pangolabs",
      "assetId": "agent-001",
      "producedAt": "2026-02-24T12:00:00.000Z",
      "receivedAt": "2026-02-24T12:00:01.234Z",
      "goldenThread": { "type": "linked", "system": "jira", "ref": "AIG-199" },
      "hash": "sha256:a1b2c3d4...",
      "data": { "name": "Customer Support Agent" }
    }
  ],
  "total": 42,
  "offset": 0,
  "limit": 20
}
```

| Field | Type | Description |
|-------|------|-------------|
| `events` | `GovernanceEvent[]` | Array of events matching the filters |
| `total` | number | Total number of matching events (across all pages) |
| `offset` | number | Current pagination offset |
| `limit` | number | Current page size |

Events are returned in reverse chronological order (`receivedAt` descending).

#### Error Responses

| Status | Error Code | Condition |
|--------|-----------|-----------|
| 400 | `EVT_VALIDATION_FAILED` | Invalid query parameter (e.g., non-integer `limit`, invalid date format) |
| 401 | `AUTH_INVALID_TOKEN` | Missing or invalid authentication |
| 401 | `AUTH_EXPIRED_TOKEN` | Token has expired |
| 403 | `AUTH_INSUFFICIENT_SCOPE` | Token lacks `events:read` scope |

---

### 5.4 GET /v1/events/:id — Get Single Event

Retrieves a single governance event by its deterministic ID.

#### Request

**Method:** `GET`
**Path:** `/v1/events/:id`
**Authentication:** Required (`events:read`)

#### Path Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | string | Event ID in format `evt_[a-f0-9]{32}` |

#### Response (200 OK)

A complete GovernanceEvent object:

```json
{
  "id": "evt_a3f8c2e1d94b7f63a2891c04e5d6b7f8",
  "specVersion": "1.0",
  "schemaVersion": "aigrc-events@0.1.0",
  "type": "aigrc.asset.created",
  "category": "asset",
  "criticality": "normal",
  "source": {
    "tool": "cli",
    "version": "0.4.2",
    "orgId": "org-pangolabs",
    "identity": {
      "type": "api-key",
      "subject": "dev@pangolabs.cloud"
    },
    "environment": "production"
  },
  "orgId": "org-pangolabs",
  "assetId": "agent-001",
  "producedAt": "2026-02-24T12:00:00.000Z",
  "receivedAt": "2026-02-24T12:00:01.234Z",
  "goldenThread": {
    "type": "linked",
    "system": "jira",
    "ref": "AIG-199",
    "url": "https://aigos.atlassian.net/browse/AIG-199",
    "status": "active",
    "verifiedAt": "2026-02-24T12:00:00Z"
  },
  "hash": "sha256:a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2",
  "previousHash": "sha256:0000000000000000000000000000000000000000000000000000000000000000",
  "parentEventId": null,
  "correlationId": "ci-run-20260224-001",
  "data": {
    "name": "Customer Support Agent",
    "assetType": "agent",
    "riskTier": "medium"
  }
}
```

#### Error Responses

| Status | Error Code | Condition |
|--------|-----------|-----------|
| 401 | `AUTH_INVALID_TOKEN` | Missing or invalid authentication |
| 401 | `AUTH_EXPIRED_TOKEN` | Token has expired |
| 403 | `AUTH_INSUFFICIENT_SCOPE` | Token lacks `events:read` scope |
| 404 | `EVT_NOT_FOUND` | Event does not exist or belongs to a different organization |

**Note:** Events belonging to a different organization return 404 (not 403) to prevent enumeration attacks. The caller cannot distinguish between "event does not exist" and "event belongs to another org."

---

### 5.5 GET /v1/assets — List Asset Summaries

Returns a paginated list of unique asset summaries derived from the event stream. Each summary aggregates metadata from all events for that asset.

#### Request

**Method:** `GET`
**Path:** `/v1/assets`
**Authentication:** Required (`assets:read` or `events:read`)

#### Query Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `orgId` | string | (from token) | Organization ID; must match token's `orgId` |
| `limit` | integer | 20 | Page size; minimum: 1, maximum: 100 |
| `offset` | integer | 0 | Pagination offset; minimum: 0 |

#### Response (200 OK)

```json
{
  "assets": [
    {
      "assetId": "agent-001",
      "lastEventAt": "2026-02-24T12:00:01.234Z",
      "eventCount": 5,
      "latestType": "aigrc.asset.updated"
    },
    {
      "assetId": "model-classifier-v2",
      "lastEventAt": "2026-02-24T11:30:00.000Z",
      "eventCount": 12,
      "latestType": "aigrc.compliance.evaluated"
    }
  ],
  "total": 2,
  "limit": 20,
  "offset": 0
}
```

| Field | Type | Description |
|-------|------|-------------|
| `assets` | `AssetSummary[]` | Array of asset summaries |
| `assets[].assetId` | string | Unique asset identifier |
| `assets[].lastEventAt` | string | ISO 8601 timestamp of the most recent event for this asset |
| `assets[].eventCount` | number | Total number of events for this asset |
| `assets[].latestType` | string | Event type of the most recent event |
| `total` | number | Total number of unique assets |
| `limit` | number | Current page size |
| `offset` | number | Current pagination offset |

Assets are returned in reverse chronological order by `lastEventAt`.

#### Error Responses

| Status | Error Code | Condition |
|--------|-----------|-----------|
| 400 | `EVT_VALIDATION_FAILED` | Invalid query parameter |
| 401 | `AUTH_INVALID_TOKEN` | Missing or invalid authentication |
| 403 | `AUTH_INSUFFICIENT_SCOPE` | Token lacks required scope |

---

### 5.6 GET /v1/assets/:assetId/events — Events for a Specific Asset

Returns a paginated list of governance events for a specific asset. This is equivalent to `GET /v1/events?assetId=:assetId` but provides a cleaner RESTful URL for asset-centric queries.

#### Request

**Method:** `GET`
**Path:** `/v1/assets/:assetId/events`
**Authentication:** Required (`events:read`)

#### Path Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `assetId` | string | Asset identifier |

#### Query Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `type` | string | — | Filter by event type |
| `since` | string | — | ISO 8601 timestamp; return events after this time |
| `limit` | integer | 20 | Page size; minimum: 1, maximum: 100 |
| `offset` | integer | 0 | Pagination offset; minimum: 0 |

#### Response (200 OK)

```json
{
  "events": [
    {
      "id": "evt_a3f8c2e1d94b7f63a2891c04e5d6b7f8",
      "type": "aigrc.asset.created",
      "category": "asset",
      "criticality": "normal",
      "assetId": "agent-001",
      "producedAt": "2026-02-24T12:00:00.000Z",
      "receivedAt": "2026-02-24T12:00:01.234Z",
      "hash": "sha256:a1b2c3d4...",
      "data": { "name": "Customer Support Agent" }
    }
  ],
  "total": 5,
  "offset": 0,
  "limit": 20
}
```

Events are returned in reverse chronological order (`receivedAt` descending).

#### Error Responses

| Status | Error Code | Condition |
|--------|-----------|-----------|
| 400 | `EVT_VALIDATION_FAILED` | Invalid query parameter |
| 401 | `AUTH_INVALID_TOKEN` | Missing or invalid authentication |
| 403 | `AUTH_INSUFFICIENT_SCOPE` | Token lacks `events:read` scope |

**Note:** If the asset has no events (or does not exist), the response is an empty list with `total: 0`, not a 404. Assets are derived from events; there is no standalone asset entity.

---

### 5.7 GET /v1/health — Health Check

Returns the service health status, API version, and registered routes. This endpoint requires no authentication.

#### Request

**Method:** `GET`
**Path:** `/v1/health`
**Authentication:** None required

#### Response (200 OK)

```json
{
  "status": "ok",
  "version": "0.2.0",
  "timestamp": "2026-02-24T12:00:00.000Z"
}
```

| Field | Type | Description |
|-------|------|-------------|
| `status` | string | `"ok"` when the service is healthy |
| `version` | string | Current API server version (semver) |
| `timestamp` | string | ISO 8601 timestamp of the response |

#### Degraded Health

When the service is partially degraded (e.g., database connectivity issues), the endpoint returns:

```json
{
  "status": "degraded",
  "version": "0.2.0",
  "timestamp": "2026-02-24T12:00:00.000Z",
  "checks": {
    "database": "unhealthy",
    "rateLimit": "healthy"
  }
}
```

The HTTP status code remains 200 for degraded health. Monitoring systems should inspect the `status` field. A 503 is returned only when the service is completely unavailable.

---

## 6. Request/Response Schemas

All schemas are defined and validated using Zod in the `@aigrc/events` package. This section provides a schema reference; AIGRC-EVT-001 is the authoritative source for schema semantics.

### 6.1 GovernanceEvent Schema

The core event envelope. See AIGRC-EVT-001 Section 3 for the full 17-field specification.

```typescript
import { z } from "zod";

const GovernanceEventSchema = z.object({
  // Identity (§3.1)
  id: z.string().regex(/^evt_[a-f0-9]{32}$/),
  specVersion: z.literal("1.0"),
  schemaVersion: z.string().regex(/^aigrc-events@\d+\.\d+\.\d+$/),

  // Classification (§3.2)
  type: z.enum([/* 31 event types */]),
  category: z.enum([
    "asset", "scan", "classification", "compliance",
    "enforcement", "lifecycle", "policy", "audit"
  ]),
  criticality: z.enum(["normal", "high", "critical"]),

  // Provenance (§3.3)
  source: EventSourceSchema,
  orgId: z.string().min(1),
  assetId: z.string().min(1),

  // Temporality (§3.4)
  producedAt: z.string().datetime(),
  receivedAt: z.string().datetime().optional(),

  // Accountability (§3.5)
  goldenThread: z.discriminatedUnion("type", [
    LinkedThreadSchema,
    OrphanDeclarationSchema
  ]),

  // Integrity (§3.6)
  hash: z.string().regex(/^sha256:[a-f0-9]{64}$/),
  previousHash: z.string().regex(/^sha256:[a-f0-9]{64}$/).optional(),
  signature: z.string().optional(),

  // Chain Linking (§3.7)
  parentEventId: z.string().regex(/^evt_[a-f0-9]{32}$/).optional().nullable(),
  correlationId: z.string().optional().nullable(),

  // Payload (§3.8)
  data: z.record(z.unknown()).refine(
    (d) => Object.keys(d).length > 0,
    { message: "data must have at least one field" }
  ),
});
```

### 6.2 PushResponse Schema

Returned by `POST /v1/events` (Sync Channel).

```typescript
const PushResponseSchema = z.object({
  event: z.object({
    id: z.string(),
    hash: z.string(),
    receivedAt: z.string().datetime(),
  }),
  duplicate: z.boolean().optional(),
  policyResult: PolicyResultSchema.optional(),
  warnings: z.array(WarningSchema).optional(),
  suggestions: z.array(SuggestionSchema).optional(),
});
```

### 6.3 BatchResponse Schema

Returned by `POST /v1/events/batch` (Batch Channel).

```typescript
const BatchResponseSchema = z.object({
  accepted: z.number().int().min(0),
  rejected: z.number().int().min(0),
  results: z.array(
    z.object({
      index: z.number().int().min(0),
      status: z.enum(["accepted", "rejected", "duplicate"]),
      eventId: z.string(),
      receivedAt: z.string().datetime().optional(),
      errors: z.array(ValidationErrorSchema).optional(),
    })
  ),
  warnings: z.array(z.string()).optional(),
});
```

### 6.4 PolicyResult Schema

```typescript
const PolicyResultSchema = z.object({
  evaluated: z.boolean(),
  passed: z.boolean(),
  bundleId: z.string(),
  violations: z.array(
    z.object({
      ruleId: z.string(),
      severity: z.enum(["blocking", "warning"]),
      description: z.string(),
      remediation: z.string(),
    })
  ),
  waivers: z.array(
    z.object({
      ruleId: z.string(),
      waivedBy: z.string(),
      expiresAt: z.string().datetime(),
      reason: z.string(),
    })
  ),
});
```

### 6.5 EventListResponse Schema

Returned by `GET /v1/events` and `GET /v1/assets/:assetId/events`.

```typescript
const EventListResponseSchema = z.object({
  events: z.array(GovernanceEventSchema),
  total: z.number().int().min(0),
  offset: z.number().int().min(0),
  limit: z.number().int().min(1).max(100),
});
```

### 6.6 AssetListResponse Schema

Returned by `GET /v1/assets`.

```typescript
const AssetSummarySchema = z.object({
  assetId: z.string(),
  lastEventAt: z.string().datetime(),
  eventCount: z.number().int().min(0),
  latestType: z.string(),
});

const AssetListResponseSchema = z.object({
  assets: z.array(AssetSummarySchema),
  total: z.number().int().min(0),
  offset: z.number().int().min(0),
  limit: z.number().int().min(1).max(100),
});
```

### 6.7 HealthResponse Schema

```typescript
const HealthResponseSchema = z.object({
  status: z.enum(["ok", "degraded"]),
  version: z.string(),
  timestamp: z.string().datetime(),
  checks: z.record(z.enum(["healthy", "unhealthy"])).optional(),
});
```

### 6.8 Error Envelope Schema

```typescript
const ErrorEnvelopeSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.union([
      z.array(z.object({
        code: z.string(),
        message: z.string(),
        field: z.string().optional(),
      })),
      z.record(z.unknown()),
    ]).optional(),
  }),
});
```

---

## 7. Error Handling

### 7.1 Error Envelope

All error responses use a standard envelope format:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error description",
    "details": {}
  }
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `error.code` | string | Yes | Machine-readable error code (SCREAMING_SNAKE_CASE) |
| `error.message` | string | Yes | Human-readable description; safe to display to end users |
| `error.details` | object or array | No | Additional context; structure varies by error code |

### 7.2 Error Code Catalog

#### Event Validation Errors

| Code | HTTP Status | Description |
|------|------------|-------------|
| `EVT_VALIDATION_FAILED` | 400 | One or more validation checks failed; `details` is an array of individual errors |
| `EVT_ID_INVALID` | 400 | Event ID does not match format `evt_[a-f0-9]{32}` |
| `EVT_SCHEMA_VERSION_UNKNOWN` | 400 | Unrecognized `schemaVersion` value |
| `EVT_TYPE_INVALID` | 400 | Unknown event type (not one of the 31 defined types) |
| `EVT_CATEGORY_MISMATCH` | 400 | `category` does not match the expected category for this `type` |
| `EVT_GOLDEN_THREAD_MISSING` | 400 | `goldenThread` field is missing |
| `EVT_GOLDEN_THREAD_INVALID` | 400 | `goldenThread` structure is invalid (bad discriminator, missing fields) |
| `EVT_ORPHAN_NOTE_TOO_SHORT` | 400 | OrphanDeclaration `remediationNote` is less than 10 characters |
| `EVT_HASH_MISSING` | 400 | `hash` field is missing |
| `EVT_HASH_FORMAT` | 400 | `hash` does not match format `sha256:[a-f0-9]{64}` |
| `EVT_HASH_MISMATCH` | 400 | Submitted hash does not match the server-recomputed canonical hash |
| `EVT_SIGNATURE_INVALID` | 400 | Cryptographic signature is present but invalid |
| `EVT_RECEIVED_AT_REJECTED` | 400 | Producer attempted to set `receivedAt` (server-only field) |
| `EVT_DATA_EMPTY` | 400 | `data` payload has zero fields |
| `EVT_DUPLICATE_ID` | 409 | Event ID already exists with a different content hash |
| `EVT_INVALID_GOLDEN_THREAD` | 400 | Golden thread reference points to a non-existent or invalid business authorization |

#### Authentication Errors

| Code | HTTP Status | Description |
|------|------------|-------------|
| `AUTH_INVALID_TOKEN` | 401 | Token is missing, malformed, or unrecognized |
| `AUTH_EXPIRED_TOKEN` | 401 | Token has expired |
| `AUTH_INSUFFICIENT_SCOPE` | 403 | Token lacks the required scope for the requested endpoint |

#### Rate Limiting Errors

| Code | HTTP Status | Description |
|------|------------|-------------|
| `RATE_LIMIT_EXCEEDED` | 429 | Request rate exceeds the allowed limit for this endpoint |

#### Policy Errors

| Code | HTTP Status | Description |
|------|------------|-------------|
| `POLICY_EVALUATION_FAILED` | 500 | Internal error during policy evaluation (event is still stored) |

#### Batch Errors

| Code | HTTP Status | Description |
|------|------------|-------------|
| `BATCH_TOO_LARGE` | 413 | Batch exceeds the maximum of 100 events |
| `BATCH_EMPTY` | 400 | Batch contains zero events |

#### General Errors

| Code | HTTP Status | Description |
|------|------------|-------------|
| `INTERNAL_ERROR` | 500 | Unexpected server error; the request should be retried |
| `SERVICE_UNAVAILABLE` | 503 | Service is temporarily unavailable (maintenance, overload) |

### 7.3 Error Aggregation

Validation errors are **collected, not fail-fast**. When multiple validation issues are present, all of them are reported in a single response:

```json
{
  "error": {
    "code": "EVT_VALIDATION_FAILED",
    "message": "Event validation failed with 3 errors",
    "details": [
      { "code": "EVT_HASH_MISMATCH", "message": "...", "field": "hash" },
      { "code": "EVT_ORPHAN_NOTE_TOO_SHORT", "message": "...", "field": "goldenThread.remediationNote" },
      { "code": "EVT_DATA_EMPTY", "message": "...", "field": "data" }
    ]
  }
}
```

### 7.4 Idempotency and Safe Retries

- `POST /v1/events` with an identical event ID and hash returns **200** (not an error)
- `POST /v1/events` with an identical event ID but different hash returns **409**
- All `GET` endpoints are inherently idempotent
- Clients should implement exponential backoff on 429 and 500/503 responses
- The `Retry-After` header on 429 responses indicates the number of seconds to wait

---

## 8. Rate Limiting

### 8.1 Rate Limit Tiers

Rate limits are enforced per authentication token using a **sliding window algorithm**.

| Endpoint | Default Limit | Window | Burst Allowance |
|----------|--------------|--------|-----------------|
| `POST /v1/events` (Sync) | 100 requests/min | 60 seconds | 20 requests |
| `POST /v1/events/batch` (Batch) | 10 requests/min | 60 seconds | 2 requests |
| `GET /v1/events` | 200 requests/min | 60 seconds | 40 requests |
| `GET /v1/events/:id` | 200 requests/min | 60 seconds | 40 requests |
| `GET /v1/assets` | 200 requests/min | 60 seconds | 40 requests |
| `GET /v1/assets/:assetId/events` | 200 requests/min | 60 seconds | 40 requests |
| `GET /v1/health` | 60 requests/min | 60 seconds | 10 requests |
| `GET /v1/integrity/checkpoints` | 60 requests/min | 60 seconds | 10 requests |

### 8.2 Critical Event Exemption

Events with `criticality: "critical"` are **exempt from rate limits** on the Sync Channel (`POST /v1/events`). This ensures that critical governance events (e.g., `aigrc.enforcement.killswitch`, `aigrc.audit.chain.broken`) are never dropped due to rate limiting.

The exemption applies only to the Sync Channel. Batch Channel submissions are always rate-limited regardless of event criticality.

### 8.3 Rate Limit Headers

Every response includes rate limit headers:

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 87
X-RateLimit-Reset: 1708776060
```

| Header | Type | Description |
|--------|------|-------------|
| `X-RateLimit-Limit` | integer | Maximum requests allowed in the current window |
| `X-RateLimit-Remaining` | integer | Remaining requests in the current window |
| `X-RateLimit-Reset` | integer | Unix timestamp (seconds) when the current window resets |

### 8.4 Rate Limit Exceeded Response

```
HTTP/1.1 429 Too Many Requests
Retry-After: 12
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1708776060
Content-Type: application/json

{
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Rate limit exceeded. Retry after 12 seconds.",
    "details": {
      "limit": 100,
      "window": "60s",
      "retryAfter": 12
    }
  }
}
```

### 8.5 Sliding Window Algorithm

The rate limiter uses a sliding window algorithm that provides smoother rate limiting than fixed windows:

1. Divide time into fixed windows (60 seconds)
2. For each request, compute the weighted count: `previous_window_count * overlap_fraction + current_window_count`
3. If the weighted count exceeds the limit, reject with 429
4. Otherwise, increment the current window counter

This prevents burst patterns at window boundaries that fixed-window algorithms allow.

### 8.6 Rate Limit Storage

| Environment | Storage |
|-------------|---------|
| Development | In-memory (Map) |
| Production | Redis (shared across server instances) |

---

## 9. CORS & Security Headers

### 9.1 Security Headers (Helmet)

The server uses Express Helmet to set security headers on all responses:

```typescript
import helmet from "helmet";

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'none'"],
      scriptSrc: ["'none'"],
      styleSrc: ["'none'"],
      imgSrc: ["'none'"],
      connectSrc: ["'self'"],
      fontSrc: ["'none'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'none'"],
      frameSrc: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: true,
  crossOriginOpenerPolicy: { policy: "same-origin" },
  crossOriginResourcePolicy: { policy: "same-origin" },
  dnsPrefetchControl: { allow: false },
  frameguard: { action: "deny" },
  hidePoweredBy: true,
  hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
  ieNoOpen: true,
  noSniff: true,
  referrerPolicy: { policy: "strict-origin-when-cross-origin" },
  xssFilter: true,
}));
```

### 9.2 Response Headers

Every response includes the following security headers:

| Header | Value | Purpose |
|--------|-------|---------|
| `Content-Security-Policy` | `default-src 'none'; connect-src 'self'` | Prevents content injection |
| `Strict-Transport-Security` | `max-age=31536000; includeSubDomains; preload` | Enforces HTTPS |
| `X-Content-Type-Options` | `nosniff` | Prevents MIME sniffing |
| `X-Frame-Options` | `DENY` | Prevents clickjacking |
| `X-XSS-Protection` | `1; mode=block` | Legacy XSS protection |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Controls referrer leakage |
| `X-Powered-By` | (removed) | Hides server technology |

### 9.3 CORS Configuration

```typescript
import cors from "cors";

app.use(cors({
  origin: [
    "https://app.aigos.dev",
    "https://dashboard.aigos.dev",
    "https://staging.aigos.dev",
  ],
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "X-Request-Id",
    "X-Correlation-Id",
  ],
  exposedHeaders: [
    "X-RateLimit-Limit",
    "X-RateLimit-Remaining",
    "X-RateLimit-Reset",
    "X-Request-Id",
  ],
  credentials: true,
  maxAge: 86400,
}));
```

| CORS Property | Value | Description |
|---------------|-------|-------------|
| `origin` | Allowlist | Only AIGOS dashboard origins are allowed |
| `methods` | `GET, POST, OPTIONS` | No PUT, DELETE, or PATCH (append-only API) |
| `credentials` | `true` | Allows cookies for OAuth session management |
| `maxAge` | `86400` | Preflight cache duration (24 hours) |

### 9.4 Request ID Tracking

Every request is assigned a unique request ID for tracing:

- If the client sends `X-Request-Id`, the server echoes it back
- If no `X-Request-Id` is provided, the server generates one (UUIDv4)
- The request ID is included in all log entries and error responses

---

## 10. Integrity Checkpoints

### 10.1 Overview

As specified in AIGRC-EVT-001 Section 13.3, the AIGOS control plane computes daily Merkle root checkpoints for each organization. These checkpoints provide tamper-evident integrity verification over the complete event ledger.

### 10.2 Checkpoint Computation

At UTC midnight, for each organization:

1. Select all events for the completed day (by `receivedAt`)
2. Sort events by `receivedAt` ascending
3. Extract the `hash` field from each event as a leaf node
4. Build a binary Merkle tree over the leaf hashes
5. Store the Merkle root in the `integrity_checkpoints` table
6. Emit an `aigrc.audit.chain.verified` governance event

### 10.3 GET /v1/integrity/checkpoints — Query Checkpoints

#### Request

**Method:** `GET`
**Path:** `/v1/integrity/checkpoints`
**Authentication:** Required (`events:read`)

#### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `orgId` | string | No | Organization ID; must match token's `orgId` |
| `date` | string | No | Date in `YYYY-MM-DD` format; returns the checkpoint for that day |
| `since` | string | No | ISO 8601 date; return checkpoints after this date |
| `until` | string | No | ISO 8601 date; return checkpoints before this date |
| `limit` | integer | No | Page size (default: 20, max: 100) |
| `offset` | integer | No | Pagination offset (default: 0) |

#### Response (200 OK)

Single date query:

```json
{
  "orgId": "org-pangolabs",
  "date": "2026-02-23",
  "merkleRoot": "sha256:f8e7d6c5b4a3928170f6e5d4c3b2a19807f6e5d4c3b2a19807f6e5d4c3b2a198",
  "eventCount": 47,
  "computedAt": "2026-02-24T00:01:23.456Z"
}
```

Date range query:

```json
{
  "checkpoints": [
    {
      "orgId": "org-pangolabs",
      "date": "2026-02-23",
      "merkleRoot": "sha256:f8e7d6c5...",
      "eventCount": 47,
      "computedAt": "2026-02-24T00:01:23.456Z"
    },
    {
      "orgId": "org-pangolabs",
      "date": "2026-02-22",
      "merkleRoot": "sha256:a1b2c3d4...",
      "eventCount": 31,
      "computedAt": "2026-02-23T00:01:12.345Z"
    }
  ],
  "total": 2,
  "offset": 0,
  "limit": 20
}
```

| Field | Type | Description |
|-------|------|-------------|
| `orgId` | string | Organization ID |
| `date` | string | Date of the checkpoint (`YYYY-MM-DD`) |
| `merkleRoot` | string | SHA-256 Merkle root hash of all events for that day |
| `eventCount` | number | Number of events included in the Merkle tree |
| `computedAt` | string | ISO 8601 timestamp when the checkpoint was computed |

#### Error Responses

| Status | Error Code | Condition |
|--------|-----------|-----------|
| 400 | `EVT_VALIDATION_FAILED` | Invalid date format |
| 401 | `AUTH_INVALID_TOKEN` | Missing or invalid authentication |
| 404 | `CHECKPOINT_NOT_FOUND` | No checkpoint exists for the requested date |

---

## 11. WebSocket Protocol (Phase 2)

> **Status:** Draft specification. Not yet implemented.

The WebSocket protocol provides real-time event streaming for high-frequency producers (`runtime-sdk`, `i2e-firewall`) and real-time dashboard consumers.

### 11.1 Connection Handshake

```
GET /v1/events/stream HTTP/1.1
Host: api.aigos.dev
Upgrade: websocket
Connection: Upgrade
Sec-WebSocket-Version: 13
Sec-WebSocket-Protocol: aigrc-events-v1
Authorization: Bearer aigrc_key_...
```

The server validates the Bearer token during the HTTP upgrade request. Invalid or expired tokens result in a 401 response before the WebSocket connection is established.

### 11.2 Authentication

- The `Authorization` header is validated during the upgrade handshake
- All 4 auth flows are supported
- Token refresh is performed via an in-band `auth.refresh` message before the current token expires

### 11.3 Message Format

All WebSocket messages are JSON-encoded text frames:

```json
{
  "type": "event.push",
  "id": "msg_001",
  "payload": { /* GovernanceEvent */ }
}
```

#### Client-to-Server Messages

| Type | Description |
|------|-------------|
| `event.push` | Push a single governance event |
| `event.push.batch` | Push multiple events (max 100) |
| `subscribe` | Subscribe to real-time events (filtered) |
| `unsubscribe` | Unsubscribe from a subscription |
| `auth.refresh` | Refresh authentication token |
| `ping` | Client-initiated keepalive |

#### Server-to-Client Messages

| Type | Description |
|------|-------------|
| `event.ack` | Event accepted acknowledgment |
| `event.nack` | Event rejected with errors |
| `event.notification` | Real-time event notification (for subscribers) |
| `auth.refreshed` | Token refresh confirmation |
| `pong` | Server keepalive response |
| `error` | Protocol-level error |

### 11.4 Subscription Filters

Clients can subscribe to real-time event notifications with filters:

```json
{
  "type": "subscribe",
  "id": "msg_002",
  "payload": {
    "subscriptionId": "sub_001",
    "filters": {
      "assetId": "agent-001",
      "category": ["compliance", "enforcement"],
      "criticality": ["high", "critical"]
    }
  }
}
```

### 11.5 Reconnection Strategy

1. Client maintains a `lastReceivedAt` timestamp
2. On disconnect, client reconnects with exponential backoff (1s, 2s, 4s, 8s, max 30s)
3. On reconnect, client sends a `replay` request with `since: lastReceivedAt` to retrieve missed events
4. Server replays events from the last known position
5. After replay completes, real-time streaming resumes

### 11.6 Keepalive

- Client sends `ping` every 30 seconds
- Server responds with `pong`
- If no `pong` is received within 10 seconds, the client reconnects
- Server disconnects idle connections after 60 seconds of no messages

---

## 12. gRPC Service (Phase 2)

> **Status:** Draft specification. Not yet implemented.

The gRPC service provides high-throughput event ingestion with binary serialization, bidirectional streaming, and strong typing via Protocol Buffers.

### 12.1 Proto Definition (Outline)

```protobuf
syntax = "proto3";

package aigrc.events.v1;

option go_package = "github.com/pangolabs/aigrc/proto/events/v1";

import "google/protobuf/timestamp.proto";
import "google/protobuf/struct.proto";

// GovernanceEventService provides high-throughput governance event
// ingestion and retrieval for the AIGOS control plane.
service GovernanceEventService {
  // PushEvent pushes a single governance event with policy feedback.
  rpc PushEvent(PushEventRequest) returns (PushEventResponse);

  // PushEventBatch pushes multiple events in a single call.
  rpc PushEventBatch(PushEventBatchRequest) returns (PushEventBatchResponse);

  // StreamEvents opens a bidirectional stream for high-frequency producers.
  rpc StreamEvents(stream GovernanceEvent) returns (stream EventAck);

  // ListEvents retrieves events with filtering and pagination.
  rpc ListEvents(ListEventsRequest) returns (ListEventsResponse);

  // GetEvent retrieves a single event by ID.
  rpc GetEvent(GetEventRequest) returns (GovernanceEvent);

  // GetIntegrityCheckpoint retrieves a Merkle root checkpoint.
  rpc GetIntegrityCheckpoint(GetCheckpointRequest) returns (IntegrityCheckpoint);
}

// GovernanceEvent represents a single governance event in the AIGOS system.
message GovernanceEvent {
  string id = 1;
  string spec_version = 2;
  string schema_version = 3;
  string type = 4;
  string category = 5;
  Criticality criticality = 6;
  EventSource source = 7;
  string org_id = 8;
  string asset_id = 9;
  google.protobuf.Timestamp produced_at = 10;
  google.protobuf.Timestamp received_at = 11;
  GoldenThread golden_thread = 12;
  string hash = 13;
  optional string previous_hash = 14;
  optional string signature = 15;
  optional string parent_event_id = 16;
  optional string correlation_id = 17;
  google.protobuf.Struct data = 18;
}

enum Criticality {
  CRITICALITY_UNSPECIFIED = 0;
  CRITICALITY_NORMAL = 1;
  CRITICALITY_HIGH = 2;
  CRITICALITY_CRITICAL = 3;
}

message EventSource {
  string tool = 1;
  string version = 2;
  string org_id = 3;
  optional string instance_id = 4;
  SourceIdentity identity = 5;
  string environment = 6;
}

message SourceIdentity {
  string type = 1;
  string subject = 2;
}

message GoldenThread {
  oneof thread {
    LinkedThread linked = 1;
    OrphanDeclaration orphan = 2;
  }
}

message LinkedThread {
  string system = 1;
  string ref = 2;
  string url = 3;
  string status = 4;
  optional google.protobuf.Timestamp verified_at = 5;
}

message OrphanDeclaration {
  string reason = 1;
  string declared_by = 2;
  google.protobuf.Timestamp declared_at = 3;
  google.protobuf.Timestamp remediation_deadline = 4;
  string remediation_note = 5;
}

message PushEventRequest {
  GovernanceEvent event = 1;
}

message PushEventResponse {
  string event_id = 1;
  string hash = 2;
  google.protobuf.Timestamp received_at = 3;
  bool duplicate = 4;
  optional PolicyResult policy_result = 5;
  repeated Warning warnings = 6;
  repeated Suggestion suggestions = 7;
}

message PushEventBatchRequest {
  repeated GovernanceEvent events = 1;
}

message PushEventBatchResponse {
  int32 accepted = 1;
  int32 rejected = 2;
  repeated BatchResult results = 3;
  repeated string warnings = 4;
}

message BatchResult {
  int32 index = 1;
  string status = 2;
  string event_id = 3;
  optional google.protobuf.Timestamp received_at = 4;
  repeated ValidationError errors = 5;
}

message PolicyResult {
  bool evaluated = 1;
  bool passed = 2;
  string bundle_id = 3;
  repeated PolicyViolation violations = 4;
  repeated PolicyWaiver waivers = 5;
}

message PolicyViolation {
  string rule_id = 1;
  string severity = 2;
  string description = 3;
  string remediation = 4;
}

message PolicyWaiver {
  string rule_id = 1;
  string waived_by = 2;
  google.protobuf.Timestamp expires_at = 3;
  string reason = 4;
}

message Warning {
  string code = 1;
  string message = 2;
}

message Suggestion {
  string code = 1;
  string message = 2;
}

message ValidationError {
  string code = 1;
  string message = 2;
  optional string field = 3;
}

message EventAck {
  string event_id = 1;
  bool accepted = 2;
  optional string error_code = 3;
  optional string error_message = 4;
}

message ListEventsRequest {
  optional string asset_id = 1;
  optional string type = 2;
  optional string category = 3;
  optional Criticality criticality = 4;
  optional google.protobuf.Timestamp since = 5;
  optional google.protobuf.Timestamp until = 6;
  int32 limit = 7;
  int32 offset = 8;
}

message ListEventsResponse {
  repeated GovernanceEvent events = 1;
  int32 total = 2;
  int32 offset = 3;
  int32 limit = 4;
}

message GetEventRequest {
  string id = 1;
}

message GetCheckpointRequest {
  string date = 1;
}

message IntegrityCheckpoint {
  string org_id = 1;
  string date = 2;
  string merkle_root = 3;
  int32 event_count = 4;
  google.protobuf.Timestamp computed_at = 5;
}
```

### 12.2 Authentication

gRPC authentication uses call metadata (equivalent to HTTP headers):

```
grpcurl -H "Authorization: Bearer aigrc_key_..." \
  api.aigos.dev:443 \
  aigrc.events.v1.GovernanceEventService/PushEvent
```

### 12.3 Error Mapping

| HTTP Status | gRPC Status Code |
|------------|-----------------|
| 400 | `INVALID_ARGUMENT` |
| 401 | `UNAUTHENTICATED` |
| 403 | `PERMISSION_DENIED` |
| 404 | `NOT_FOUND` |
| 409 | `ALREADY_EXISTS` |
| 413 | `RESOURCE_EXHAUSTED` |
| 429 | `RESOURCE_EXHAUSTED` |
| 500 | `INTERNAL` |
| 503 | `UNAVAILABLE` |

### 12.4 Performance Targets

| Metric | Target |
|--------|--------|
| Unary RPC latency (p99) | < 50ms |
| Stream throughput | 10,000 events/sec per connection |
| Max concurrent streams | 100 per connection |
| Message size limit | 4 MB |

---

## 13. Appendices

### Appendix A: Complete Error Codes Table

| Code | HTTP | Category | Description |
|------|------|----------|-------------|
| `EVT_VALIDATION_FAILED` | 400 | Validation | Aggregate validation failure |
| `EVT_ID_INVALID` | 400 | Validation | Malformed event ID |
| `EVT_SCHEMA_VERSION_UNKNOWN` | 400 | Validation | Unrecognized schema version |
| `EVT_TYPE_INVALID` | 400 | Validation | Unknown event type |
| `EVT_CATEGORY_MISMATCH` | 400 | Validation | Category/type mismatch |
| `EVT_GOLDEN_THREAD_MISSING` | 400 | Validation | Missing goldenThread field |
| `EVT_GOLDEN_THREAD_INVALID` | 400 | Validation | Invalid goldenThread structure |
| `EVT_INVALID_GOLDEN_THREAD` | 400 | Validation | Invalid business authorization reference |
| `EVT_ORPHAN_NOTE_TOO_SHORT` | 400 | Validation | remediationNote < 10 characters |
| `EVT_HASH_MISSING` | 400 | Validation | Missing hash field |
| `EVT_HASH_FORMAT` | 400 | Validation | Malformed hash format |
| `EVT_HASH_MISMATCH` | 400 | Validation | Hash does not match content |
| `EVT_SIGNATURE_INVALID` | 400 | Validation | Invalid cryptographic signature |
| `EVT_RECEIVED_AT_REJECTED` | 400 | Validation | Producer set receivedAt |
| `EVT_DATA_EMPTY` | 400 | Validation | Empty data payload |
| `EVT_DUPLICATE_ID` | 409 | Validation | ID collision with different hash |
| `EVT_NOT_FOUND` | 404 | Retrieval | Event not found |
| `BATCH_TOO_LARGE` | 413 | Batch | Batch exceeds 100 events |
| `BATCH_EMPTY` | 400 | Batch | Batch contains zero events |
| `AUTH_INVALID_TOKEN` | 401 | Auth | Invalid or missing token |
| `AUTH_EXPIRED_TOKEN` | 401 | Auth | Token has expired |
| `AUTH_INSUFFICIENT_SCOPE` | 403 | Auth | Token lacks required scope |
| `RATE_LIMIT_EXCEEDED` | 429 | Rate Limit | Rate limit exceeded |
| `POLICY_EVALUATION_FAILED` | 500 | Policy | Policy evaluation error |
| `CHECKPOINT_NOT_FOUND` | 404 | Integrity | No checkpoint for date |
| `INTERNAL_ERROR` | 500 | System | Unexpected server error |
| `SERVICE_UNAVAILABLE` | 503 | System | Service temporarily unavailable |

---

### Appendix B: Rate Limit Tiers

#### B.1 Free Tier

| Endpoint | Limit | Window |
|----------|-------|--------|
| `POST /v1/events` | 50 req/min | 60s |
| `POST /v1/events/batch` | 5 req/min | 60s |
| `GET /v1/events` | 100 req/min | 60s |
| `GET /v1/events/:id` | 100 req/min | 60s |
| `GET /v1/assets` | 100 req/min | 60s |
| `GET /v1/assets/:assetId/events` | 100 req/min | 60s |
| `GET /v1/health` | 30 req/min | 60s |
| `GET /v1/integrity/checkpoints` | 30 req/min | 60s |
| **Daily event cap** | **5,000 events/day** | 24h |

#### B.2 Standard Tier

| Endpoint | Limit | Window |
|----------|-------|--------|
| `POST /v1/events` | 100 req/min | 60s |
| `POST /v1/events/batch` | 10 req/min | 60s |
| `GET /v1/events` | 200 req/min | 60s |
| `GET /v1/events/:id` | 200 req/min | 60s |
| `GET /v1/assets` | 200 req/min | 60s |
| `GET /v1/assets/:assetId/events` | 200 req/min | 60s |
| `GET /v1/health` | 60 req/min | 60s |
| `GET /v1/integrity/checkpoints` | 60 req/min | 60s |
| **Daily event cap** | **50,000 events/day** | 24h |

#### B.3 Enterprise Tier

| Endpoint | Limit | Window |
|----------|-------|--------|
| `POST /v1/events` | 500 req/min | 60s |
| `POST /v1/events/batch` | 50 req/min | 60s |
| `GET /v1/events` | 1000 req/min | 60s |
| `GET /v1/events/:id` | 1000 req/min | 60s |
| `GET /v1/assets` | 1000 req/min | 60s |
| `GET /v1/assets/:assetId/events` | 1000 req/min | 60s |
| `GET /v1/health` | 300 req/min | 60s |
| `GET /v1/integrity/checkpoints` | 300 req/min | 60s |
| **Daily event cap** | **Unlimited** | — |

#### B.4 Critical Event Exemption

Applies across all tiers: events with `criticality: "critical"` bypass rate limits on the Sync Channel. This ensures that killswitch activations and audit chain break detections are never throttled.

---

### Appendix C: Example curl Commands

#### C.1 Push a Single Event (Sync Channel)

```bash
curl -X POST https://api.aigos.dev/v1/events \
  -H "Authorization: Bearer aigrc_key_a1b2c3d4e5f6" \
  -H "Content-Type: application/json" \
  -d '{
    "id": "evt_a3f8c2e1d94b7f63a2891c04e5d6b7f8",
    "specVersion": "1.0",
    "schemaVersion": "aigrc-events@0.1.0",
    "type": "aigrc.asset.created",
    "category": "asset",
    "criticality": "normal",
    "source": {
      "tool": "cli",
      "version": "0.4.2",
      "orgId": "org-pangolabs",
      "identity": { "type": "api-key", "subject": "dev@pangolabs.cloud" },
      "environment": "production"
    },
    "orgId": "org-pangolabs",
    "assetId": "agent-001",
    "producedAt": "2026-02-24T12:00:00.000Z",
    "goldenThread": {
      "type": "linked",
      "system": "jira",
      "ref": "AIG-199",
      "url": "https://aigos.atlassian.net/browse/AIG-199",
      "status": "active"
    },
    "hash": "sha256:a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2",
    "data": {
      "name": "Customer Support Agent",
      "assetType": "agent",
      "riskTier": "medium"
    }
  }'
```

#### C.2 Push a Batch of Events

```bash
curl -X POST https://api.aigos.dev/v1/events/batch \
  -H "Authorization: Bearer aigrc_key_a1b2c3d4e5f6" \
  -H "Content-Type: application/json" \
  -d '{
    "events": [
      {
        "id": "evt_a3f8c2e1d94b7f63a2891c04e5d6b7f8",
        "specVersion": "1.0",
        "schemaVersion": "aigrc-events@0.1.0",
        "type": "aigrc.asset.created",
        "category": "asset",
        "criticality": "normal",
        "source": {
          "tool": "github-action",
          "version": "1.0.0",
          "orgId": "org-pangolabs",
          "identity": { "type": "service-token", "subject": "ci-pipeline" },
          "environment": "ci"
        },
        "orgId": "org-pangolabs",
        "assetId": "agent-001",
        "producedAt": "2026-02-24T12:00:00.000Z",
        "goldenThread": {
          "type": "linked",
          "system": "jira",
          "ref": "AIG-199",
          "url": "https://aigos.atlassian.net/browse/AIG-199",
          "status": "active"
        },
        "hash": "sha256:a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2",
        "data": { "name": "Customer Support Agent" }
      },
      {
        "id": "evt_b4c9d3e2f05a8174b3902d15f6e7c8a9",
        "specVersion": "1.0",
        "schemaVersion": "aigrc-events@0.1.0",
        "type": "aigrc.scan.started",
        "category": "scan",
        "criticality": "normal",
        "source": {
          "tool": "github-action",
          "version": "1.0.0",
          "orgId": "org-pangolabs",
          "identity": { "type": "service-token", "subject": "ci-pipeline" },
          "environment": "ci"
        },
        "orgId": "org-pangolabs",
        "assetId": "agent-001",
        "producedAt": "2026-02-24T12:00:01.000Z",
        "goldenThread": {
          "type": "linked",
          "system": "jira",
          "ref": "AIG-199",
          "url": "https://aigos.atlassian.net/browse/AIG-199",
          "status": "active"
        },
        "hash": "sha256:c5d0e4f3a16b9185c4013e26a7f8d9b0c5d0e4f3a16b9185c4013e26a7f8d9b0",
        "data": { "scanType": "governance", "scanner": "aigrc-scan" }
      }
    ]
  }'
```

#### C.3 List Events with Filters

```bash
# List all events for an asset
curl -X GET "https://api.aigos.dev/v1/events?assetId=agent-001&limit=10" \
  -H "Authorization: Bearer aigrc_key_a1b2c3d4e5f6"

# List high-criticality compliance events since a date
curl -X GET "https://api.aigos.dev/v1/events?category=compliance&criticality=high&since=2026-02-01T00:00:00Z" \
  -H "Authorization: Bearer aigrc_key_a1b2c3d4e5f6"

# Paginate through events
curl -X GET "https://api.aigos.dev/v1/events?limit=20&offset=40" \
  -H "Authorization: Bearer aigrc_key_a1b2c3d4e5f6"
```

#### C.4 Get a Single Event

```bash
curl -X GET https://api.aigos.dev/v1/events/evt_a3f8c2e1d94b7f63a2891c04e5d6b7f8 \
  -H "Authorization: Bearer aigrc_key_a1b2c3d4e5f6"
```

#### C.5 List Asset Summaries

```bash
curl -X GET "https://api.aigos.dev/v1/assets?limit=50" \
  -H "Authorization: Bearer aigrc_key_a1b2c3d4e5f6"
```

#### C.6 List Events for a Specific Asset

```bash
curl -X GET "https://api.aigos.dev/v1/assets/agent-001/events?type=aigrc.compliance.evaluated&since=2026-02-01T00:00:00Z" \
  -H "Authorization: Bearer aigrc_key_a1b2c3d4e5f6"
```

#### C.7 Health Check

```bash
curl -X GET https://api.aigos.dev/v1/health
```

#### C.8 Query Integrity Checkpoints

```bash
# Single date
curl -X GET "https://api.aigos.dev/v1/integrity/checkpoints?date=2026-02-23" \
  -H "Authorization: Bearer aigrc_key_a1b2c3d4e5f6"

# Date range
curl -X GET "https://api.aigos.dev/v1/integrity/checkpoints?since=2026-02-01&until=2026-02-24&limit=30" \
  -H "Authorization: Bearer aigrc_key_a1b2c3d4e5f6"
```

#### C.9 Request an Agent Token

```bash
curl -X POST https://api.aigos.dev/v1/auth/agent-token \
  -H "Authorization: Bearer aigrc_key_a1b2c3d4e5f6" \
  -H "Content-Type: application/json" \
  -d '{
    "ttlSeconds": 900,
    "scope": ["events:write"]
  }'
```

---

### Appendix D: Changelog

| Version | Date | Changes |
|---------|------|---------|
| 0.1.0 | 2026-02-24 | Initial draft — Full API contract covering all Sprints 1-5 endpoints: event ingestion (sync + batch), event retrieval, asset summaries, health check, integrity checkpoints. Authentication (4 flows), multi-tenant cell routing, rate limiting, CORS/security headers, error handling. Phase 2 drafts for WebSocket and gRPC. |

---

*This specification is maintained by the AIGRC Core Team. For questions or proposed changes, open an issue referencing AIGRC-API-001.*
