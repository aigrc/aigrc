# AIGRC MCP Server Specification

## Version 3.0.0

### Document Status: Draft for Engineering Review

### Codename: "The Governance Oracle"

---

## Revision History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | Nov 2025 | Initial MCP specification |
| 2.0.0 | Dec 2025 | Multi-jurisdiction compliance, Red Team integration |
| 3.0.0 | Dec 2025 | Golden Thread (Jira), SSE transport with auth, Checkpoint acceleration, Value-First positioning |

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Architecture](#2-architecture)
3. [Protocol Compliance](#3-protocol-compliance)
4. [Transport Support](#4-transport-support)
5. [Authentication](#5-authentication)
6. [Server Capabilities](#6-server-capabilities)
7. [Tools](#7-tools)
   - 7.1 [Value-First Tools](#71-value-first-tools)
   - 7.2 [Golden Thread Tools](#72-golden-thread-tools)
   - 7.3 [Checkpoint Acceleration Tools](#73-checkpoint-acceleration-tools)
   - 7.4 [Core Governance Tools](#74-core-governance-tools)
   - 7.5 [Multi-Jurisdiction Compliance Tools](#75-multi-jurisdiction-compliance-tools)
   - 7.6 [Red Team Integration Tools](#76-red-team-integration-tools)
   - 7.7 [Database Governance Tools](#77-database-governance-tools)
   - 7.8 [Report Generation Tools](#78-report-generation-tools)
8. [Resources](#8-resources)
9. [Prompts](#9-prompts)
10. [Artifact Format Specification](#10-artifact-format-specification)
11. [Configuration](#11-configuration)
12. [Security Considerations](#12-security-considerations)
13. [Implementation Plan](#13-implementation-plan)
14. [Package Structure](#14-package-structure)
15. [API Examples](#15-api-examples)
16. [References](#16-references)

---

## 1. Executive Summary

### 1.1 Purpose

The AIGRC MCP Server enables AI assistants and LLM-powered development tools to interact with AI governance data through a standardized protocol. It serves as a **Governance Oracle**—an always-available expert that AI assistants can consult on behalf of developers.

### 1.2 Value-First Philosophy

This specification embeds the **Value-First** principle: governance is delivered as an invisible byproduct of developer value. The primary interface emphasizes tools that help developers ship better code; compliance artifacts are generated automatically.

**Developer Experience:** "Help me deploy this faster" → Gets deployment readiness + governance artifacts

**NOT:** "You must comply with governance" → Resistance and workarounds

### 1.3 Strategic Goals

| Goal | Description |
|------|-------------|
| **Enable AI-Assisted Governance** | Allow LLMs to help users manage AI compliance conversationally |
| **Provide Governance Context** | Give AI assistants access to asset cards, policies, and risk data |
| **Automate Compliance Tasks** | Enable automated scanning, validation, and artifact generation |
| **Support Multi-Jurisdiction Compliance** | Handle EU AI Act, US OMB M-24, NIST AI RMF, ISO 42001, and custom profiles |
| **Integrate Red Team Verification** | Expose security testing capabilities to AI assistants |
| **Accelerate Checkpoints** | Pre-generate artifacts that satisfy GitHub/GitLab/CI gates |
| **Establish Golden Thread** | Cryptographically link AI assets to business intent (Jira/ADO) |

### 1.4 Use Cases

| Use Case | Example Query | Primary Tools |
|----------|---------------|---------------|
| Deployment Readiness | "Am I ready to deploy this?" | `get_deployment_readiness`, `preview_checkpoint_issues` |
| Business Linkage | "Link this to my Jira ticket" | `link_business_intent`, `get_business_context` |
| Checkpoint Prep | "What's blocking my PR?" | `preview_checkpoint_issues`, `generate_checkpoint_artifacts` |
| Compliance Q&A | "What's our risk under EU AI Act?" | `classify_risk`, `check_compliance` |
| Asset Discovery | "Find all high-risk AI in our codebase" | `scan_directory`, `get_asset_cards` |
| Cost Estimation | "How much will this model cost to run?" | `estimate_api_costs` |
| Security Check | "What vulnerabilities were found?" | `get_redteam_status`, `get_redteam_findings` |
| Audit Support | "Generate compliance report for auditors" | `generate_compliance_report`, `generate_audit_package` |

---

## 2. Architecture

### 2.1 Universal Core / Transport Adapters

The AIGRC MCP Server follows a **"Universal Core, Bespoke Shell"** architecture. The governance logic is platform-agnostic; transport adapters handle platform-specific integration.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              MCP Clients                                     │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │   Claude    │  │   Cursor    │  │   Lovable   │  │   Replit    │        │
│  │   Desktop   │  │   (VSX)     │  │   (SSE)     │  │   (Ext)     │        │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘        │
└─────────┼────────────────┼────────────────┼────────────────┼────────────────┘
          │                │                │                │
          │           Transport Layer (stdio / SSE / WebSocket)
          │                │                │                │
┌─────────┴────────────────┴────────────────┴────────────────┴────────────────┐
│                        AIGRC MCP Server                                      │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │                      Transport Adapters                                │  │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                 │  │
│  │  │    stdio     │  │     SSE      │  │  WebSocket   │                 │  │
│  │  │  (Desktop)   │  │   (Cloud)    │  │  (Real-time) │                 │  │
│  │  └──────────────┘  └──────────────┘  └──────────────┘                 │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │                      Authentication Layer                              │  │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                 │  │
│  │  │   API Key    │  │   OAuth 2.0  │  │ Enterprise   │                 │  │
│  │  │  (Dev/Test)  │  │    (Prod)    │  │    SSO       │                 │  │
│  │  └──────────────┘  └──────────────┘  └──────────────┘                 │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │                      Protocol Layer                                    │  │
│  │  • JSON-RPC 2.0 handling    • Request/Response management              │  │
│  │  • Capability negotiation    • Subscription management                 │  │
│  │  • Tenant context injection  • Rate limiting                           │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │                      Service Layer                                     │  │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐    │  │
│  │  │ Scanner  │ │  Cards   │ │ Golden   │ │Checkpoint│ │ Classify │    │  │
│  │  │ Service  │ │ Service  │ │ Thread   │ │ Service  │ │ Service  │    │  │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘    │  │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐    │  │
│  │  │Compliance│ │ Profile  │ │Crosswalk │ │ RedTeam  │ │ Reports  │    │  │
│  │  │ Service  │ │ Service  │ │ Service  │ │ Service  │ │ Service  │    │  │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘    │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │                         @aigrc/core                                    │  │
│  │  • Detection Engine     • Risk Classification    • Golden Thread       │  │
│  │  • Asset Card Schema    • Profile Loader         • Control Evaluator   │  │
│  │  • Artifact Generator   • Checkpoint Validator   • Policy Engine       │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │                        @aigrc/profiles                                 │  │
│  │  • EU AI Act    • US OMB M-24    • NIST AI RMF    • ISO 42001         │  │
│  │  • Colorado     • NYC LL144      • CycloneDX      • Custom Profiles   │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
          │                │                │                │
          ▼                ▼                ▼                ▼
    ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐
    │  Local   │    │  AIGOS   │    │   Jira   │    │  GitHub  │
    │  Files   │    │  Cloud   │    │   API    │    │   API    │
    └──────────┘    └──────────┘    └──────────┘    └──────────┘
```

### 2.2 Component Overview

| Component | Responsibility |
|-----------|----------------|
| **Transport Adapters** | stdio (Desktop), SSE (Cloud), WebSocket (Real-time) |
| **Authentication Layer** | API Key, OAuth 2.0, Enterprise SSO |
| **Protocol Layer** | MCP protocol handling, JSON-RPC, tenant context |
| **Scanner Service** | File scanning, framework detection |
| **Cards Service** | Asset card CRUD operations |
| **Golden Thread Service** | Jira/ADO integration, business intent linking |
| **Checkpoint Service** | Checkpoint validation, artifact generation |
| **Classify Service** | Multi-jurisdiction risk classification |
| **Compliance Service** | Control evaluation, gap analysis |
| **Profile Service** | Compliance profile management |
| **Crosswalk Service** | Cross-framework mapping |
| **RedTeam Service** | Red team findings integration |
| **Reports Service** | Compliance reports, audit summaries |

### 2.3 Deployment Modes

| Mode | Transport | Auth | Use Case |
|------|-----------|------|----------|
| **Local (Desktop)** | stdio | None (process isolation) | Claude Desktop, Cursor, VS Code |
| **Cloud (Hosted)** | SSE | OAuth 2.0 / API Key | Lovable, Bolt.new, web clients |
| **Enterprise (Air-Gap)** | stdio/SSE | Enterprise SSO | On-premise deployments |
| **Embedded** | In-process | N/A | CI/CD pipelines, GitHub Actions |

---

## 3. Protocol Compliance

### 3.1 MCP Version

Implements MCP Protocol version **2024-11-05** (latest stable).

### 3.2 Required Protocol Methods

```typescript
// Initialization
"initialize" → ServerCapabilities
"initialized" → void

// Tools
"tools/list" → Tool[]
"tools/call" → CallToolResult

// Resources
"resources/list" → Resource[]
"resources/read" → ResourceContent[]
"resources/subscribe" → void
"resources/unsubscribe" → void

// Prompts
"prompts/list" → Prompt[]
"prompts/get" → GetPromptResult

// Lifecycle
"ping" → void
"notifications/cancelled" → void
"notifications/resources/updated" → void
```

---

## 4. Transport Support

### 4.1 Transport Matrix

| Transport | Status | Primary Use | Authentication |
|-----------|--------|-------------|----------------|
| **stdio** | Primary | Desktop apps (Claude, Cursor, VS Code) | None (process isolation) |
| **SSE** | Production | Cloud platforms (Lovable, Bolt, Replit) | API Key / OAuth 2.0 |
| **WebSocket** | Planned | Real-time notifications, Red Team updates | OAuth 2.0 |

### 4.2 stdio Transport

Standard input/output transport for local process communication.

```typescript
interface StdioTransportConfig {
  mode: "stdio";
  // No additional configuration required
  // Authentication handled by OS process isolation
}
```

### 4.3 SSE Transport

Server-Sent Events transport for cloud-hosted deployment.

**Endpoint:** `https://mcp.aigrc.dev/sse`

```typescript
interface SSETransportConfig {
  mode: "sse";
  endpoint: string;                    // e.g., "https://mcp.aigrc.dev/sse"
  
  // Connection settings
  reconnectInterval: number;           // Default: 5000ms
  maxReconnectAttempts: number;        // Default: 10
  heartbeatInterval: number;           // Default: 30000ms
  
  // Tenant isolation
  tenantExtraction: {
    method: "header" | "token_claim" | "query_param";
    headerName?: string;               // e.g., "X-AIGRC-Tenant-ID"
    claimPath?: string;                // e.g., "tenant_id"
    paramName?: string;                // e.g., "tenant"
  };
  
  // Rate limiting
  rateLimits: {
    connectionPerTenant: number;       // Default: 10
    requestsPerMinute: number;         // Default: 120
    toolCallsPerHour: number;          // Default: 1000
  };
}
```

**SSE Message Format:**

```
event: message
data: {"jsonrpc":"2.0","id":1,"result":{...}}

event: ping
data: {"timestamp":"2025-12-27T10:30:00Z"}

event: resource_updated
data: {"uri":"aigrc://redteam/customer-bot/findings"}
```

### 4.4 WebSocket Transport (Planned)

Full-duplex communication for real-time updates.

```typescript
interface WebSocketTransportConfig {
  mode: "websocket";
  endpoint: string;                    // e.g., "wss://mcp.aigrc.dev/ws"
  
  // Subscriptions
  supportedSubscriptions: [
    "redteam.findings",
    "compliance.status",
    "checkpoint.results"
  ];
}
```

---

## 5. Authentication

### 5.1 Authentication Strategy

AIGRC implements a **layered authentication strategy** to balance developer experience with enterprise security requirements.

| Tier | Method | Use Case | Token Lifetime |
|------|--------|----------|----------------|
| **Development** | API Key | Local testing, sandbox environments | 90 days |
| **Production** | OAuth 2.0 Client Credentials | Production deployments | 1 hour (refresh) |
| **Enterprise** | SSO (SAML/OIDC) | Enterprise integrations | Session-based |

### 5.2 API Key Authentication

For development and sandbox environments.

**Request Header:**
```
X-AIGRC-API-Key: aigrc_sk_test_abc123...
```

**Key Format:**
```
aigrc_sk_{environment}_{random_32_bytes_base64}

Environments: test, live
Example: aigrc_sk_test_a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6
```

**Key Metadata (stored server-side):**
```json
{
  "keyId": "key_abc123",
  "tenantId": "tenant_xyz789",
  "environment": "test",
  "scopes": ["read", "write"],
  "createdAt": "2025-12-01T00:00:00Z",
  "expiresAt": "2025-03-01T00:00:00Z",
  "lastUsedAt": "2025-12-27T10:30:00Z",
  "rateLimits": {
    "requestsPerMinute": 60,
    "toolCallsPerHour": 500
  }
}
```

### 5.3 OAuth 2.0 Authentication

For production deployments using Client Credentials grant.

**Token Request:**
```http
POST /oauth/token HTTP/1.1
Host: auth.aigrc.dev
Content-Type: application/x-www-form-urlencoded

grant_type=client_credentials
&client_id=client_abc123
&client_secret=secret_xyz789
&scope=aigrc:read aigrc:write
```

**Token Response:**
```json
{
  "access_token": "eyJhbGciOiJSUzI1NiIs...",
  "token_type": "Bearer",
  "expires_in": 3600,
  "scope": "aigrc:read aigrc:write"
}
```

**JWT Claims:**
```json
{
  "iss": "https://auth.aigrc.dev",
  "sub": "client_abc123",
  "aud": "https://mcp.aigrc.dev",
  "exp": 1735300200,
  "iat": 1735296600,
  "tenant_id": "tenant_xyz789",
  "scopes": ["aigrc:read", "aigrc:write"],
  "features": ["golden_thread", "redteam"]
}
```

**Available Scopes:**

| Scope | Description |
|-------|-------------|
| `aigrc:read` | Read asset cards, compliance status, reports |
| `aigrc:write` | Create/update asset cards, trigger scans |
| `aigrc:admin` | Manage profiles, tenant settings |
| `aigrc:redteam` | Access red team features |
| `jira:read` | Read Jira tickets for Golden Thread |
| `jira:write` | Write Entity Properties to Jira |

### 5.4 Enterprise SSO

For enterprise customers requiring SSO integration.

**Supported Providers:**
- Okta (SAML 2.0, OIDC)
- Azure Active Directory (SAML 2.0, OIDC)
- Google Workspace (OIDC)
- Custom SAML 2.0 IdP

**Configuration:**
```json
{
  "sso": {
    "provider": "okta",
    "domain": "company.okta.com",
    "clientId": "0oa...",
    "issuer": "https://company.okta.com/oauth2/default",
    "jitProvisioning": true,
    "defaultRole": "developer",
    "groupMapping": {
      "AIGRC-Admins": "admin",
      "AIGRC-Developers": "developer",
      "AIGRC-Viewers": "viewer"
    }
  }
}
```

### 5.5 Authentication Flow by Platform

| Platform | Recommended Auth | Configuration |
|----------|------------------|---------------|
| **Claude Desktop** | None (stdio) | Local process, no network auth |
| **Cursor/VS Code** | None (stdio) | Local process, no network auth |
| **Lovable** | OAuth 2.0 | Native MCP OAuth support |
| **Replit** | API Key | Store in Replit Secrets |
| **AIGOS Dashboard** | Enterprise SSO | Full SSO integration |
| **GitHub Actions** | API Key | Store in GitHub Secrets |

---

## 6. Server Capabilities

### 6.1 Capability Declaration

```json
{
  "capabilities": {
    "tools": {
      "listChanged": true
    },
    "resources": {
      "subscribe": true,
      "listChanged": true
    },
    "prompts": {
      "listChanged": true
    },
    "logging": {}
  },
  "serverInfo": {
    "name": "aigrc-mcp",
    "version": "3.0.0"
  },
  "extensions": {
    "goldenThread": true,
    "checkpointAcceleration": true,
    "multiJurisdiction": true,
    "redTeamIntegration": true,
    "profileStacking": true,
    "bidirectionalJiraSync": true
  }
}
```

### 6.2 Feature Flags

Features can be enabled/disabled per tenant:

```typescript
interface TenantFeatures {
  goldenThread: boolean;           // Jira/ADO integration
  redTeam: boolean;                // Red team capabilities
  checkpointAcceleration: boolean; // Checkpoint prep tools
  multiJurisdiction: boolean;      // Multi-profile compliance
  databaseGovernance: boolean;     // Supabase/Postgres triggers
  customProfiles: boolean;         // Custom compliance profiles
}
```

---

## 7. Tools

Tools are organized by function, with Value-First tools presented as the primary interface.

### 7.1 Value-First Tools

These tools lead with developer value; governance is the byproduct.

---

#### Tool: `get_deployment_readiness`

Check if an asset is ready for deployment (Value-First framing of compliance check).

**Input Schema:**
```json
{
  "type": "object",
  "properties": {
    "assetId": {
      "type": "string",
      "description": "Asset to check (or 'all' for workspace)"
    },
    "targetEnvironment": {
      "type": "string",
      "enum": ["development", "staging", "production"],
      "default": "production"
    },
    "directory": {
      "type": "string",
      "default": "."
    }
  },
  "required": ["assetId"]
}
```

**Output:**
```json
{
  "content": [
    {
      "type": "text",
      "text": "## Deployment Readiness: customer-chatbot\n\n**Status: READY WITH WARNINGS** ✅⚠️\n\n### Checklist\n- ✅ Asset registered with owner\n- ✅ Linked to business ticket (PROJ-1234)\n- ✅ Risk classification complete (HIGH)\n- ⚠️ Compliance at 85% (target: 80%)\n- ✅ No critical security findings\n\n### Warnings\n- Missing monitoring documentation (recommended for HIGH risk)\n\n### Next Steps\n1. Optional: Add monitoring docs to reach 100%\n2. Ready to deploy to production"
    }
  ]
}
```

---

#### Tool: `get_blockers`

Identify what's blocking a PR or deployment (Value-First framing of gap analysis).

**Input Schema:**
```json
{
  "type": "object",
  "properties": {
    "directory": {
      "type": "string",
      "default": "."
    },
    "context": {
      "type": "string",
      "enum": ["pr", "deployment", "audit"],
      "default": "pr",
      "description": "What are we trying to unblock?"
    }
  }
}
```

**Output:**
```json
{
  "content": [
    {
      "type": "text",
      "text": "## PR Blockers\n\n### 🚫 Blocking Issues (2)\n\n1. **Missing Golden Thread** - `recommendation-engine`\n   - Fix: Run `aigrc link PROJ-5678`\n   - Time: ~2 minutes\n\n2. **Unregistered AI Detected** - `src/utils/classifier.py`\n   - Fix: Run `aigrc register`\n   - Time: ~5 minutes\n\n### ⚠️ Warnings (1)\n- Compliance below 80% for `customer-bot` (currently 75%)\n\n### Estimated Time to Clear: ~10 minutes"
    }
  ]
}
```

---

#### Tool: `estimate_api_costs`

Estimate API costs for AI operations (pure developer value).

**Input Schema:**
```json
{
  "type": "object",
  "properties": {
    "assetId": {
      "type": "string",
      "description": "Asset to estimate costs for"
    },
    "usage": {
      "type": "object",
      "properties": {
        "requestsPerDay": { "type": "number" },
        "avgInputTokens": { "type": "number" },
        "avgOutputTokens": { "type": "number" }
      }
    },
    "directory": {
      "type": "string",
      "default": "."
    }
  },
  "required": ["assetId"]
}
```

**Output:**
```json
{
  "content": [
    {
      "type": "text",
      "text": "## Cost Estimate: customer-chatbot\n\n**Model:** gpt-4o (detected from code)\n\n### Monthly Projection\n| Metric | Value |\n|--------|-------|\n| Requests | 30,000 |\n| Input Tokens | 15M |\n| Output Tokens | 3M |\n| **Estimated Cost** | **$525/month** |\n\n### Cost Optimization Tips\n- Consider gpt-4o-mini for simple queries (-60% cost)\n- Enable response caching for repeated queries\n\n*Governance note: Cost tracked in asset card for CFO reporting*"
    }
  ]
}
```

---

#### Tool: `check_security_risks`

Check for security risks in AI implementation (developer value).

**Input Schema:**
```json
{
  "type": "object",
  "properties": {
    "assetId": {
      "type": "string",
      "description": "Asset to check"
    },
    "includeRedTeam": {
      "type": "boolean",
      "default": true,
      "description": "Include red team findings if available"
    },
    "directory": {
      "type": "string",
      "default": "."
    }
  },
  "required": ["assetId"]
}
```

---

### 7.2 Golden Thread Tools

Tools for linking AI assets to business intent via Jira/ADO integration.

---

#### Tool: `link_business_intent`

Link an AI asset to a Jira/ADO ticket, establishing the Golden Thread.

**Input Schema:**
```json
{
  "type": "object",
  "properties": {
    "assetId": {
      "type": "string",
      "description": "Asset to link"
    },
    "ticketId": {
      "type": "string",
      "description": "Jira/ADO ticket ID (e.g., 'PROJ-1234')"
    },
    "ticketSystem": {
      "type": "string",
      "enum": ["jira", "ado", "linear"],
      "default": "jira"
    },
    "relationship": {
      "type": "string",
      "enum": ["implements", "addresses", "enables", "supports"],
      "default": "implements",
      "description": "How the asset relates to the ticket"
    },
    "syncMode": {
      "type": "string",
      "enum": ["one-time", "bidirectional"],
      "default": "bidirectional",
      "description": "Whether to sync governance status back to Jira"
    },
    "directory": {
      "type": "string",
      "default": "."
    }
  },
  "required": ["assetId", "ticketId"]
}
```

**Output:**
```json
{
  "content": [
    {
      "type": "text",
      "text": "## Golden Thread Established ✅\n\n**Asset:** customer-chatbot\n**Ticket:** PROJ-1234\n**Relationship:** implements\n\n### Verification\n- ✅ Ticket exists and is active\n- ✅ Golden Thread ID generated: `GT-a1b2c3d4e5f6`\n- ✅ Entity Property written to Jira\n\n### Jira Integration\nGovernance status will sync to Jira. Project managers can now see:\n- Linked AI assets on ticket PROJ-1234\n- Compliance status in Jira sidebar\n- JQL searchable: `issue.property[aigrc-governance].status`"
    }
  ],
  "isError": false,
  "_meta": {
    "goldenThreadId": "GT-a1b2c3d4e5f6",
    "ticketValidated": true,
    "jiraEntityPropertyWritten": true
  }
}
```

---

#### Tool: `get_business_context`

Retrieve business context from linked Jira/ADO ticket.

**Input Schema:**
```json
{
  "type": "object",
  "properties": {
    "assetId": {
      "type": "string",
      "description": "Asset to get context for"
    },
    "directory": {
      "type": "string",
      "default": "."
    }
  },
  "required": ["assetId"]
}
```

**Output:**
```json
{
  "content": [
    {
      "type": "text",
      "text": "## Business Context: customer-chatbot\n\n### Linked Ticket: PROJ-1234\n| Field | Value |\n|-------|-------|\n| Summary | Implement AI-powered customer support |\n| Status | In Progress |\n| Assignee | Jane Developer |\n| Epic | Customer Experience Improvements |\n| Sprint | Sprint 24 |\n\n### Business Owner\n- **Name:** Product Team\n- **Approval Status:** Approved\n- **Approved Date:** 2025-12-15\n\n### Golden Thread\n- **ID:** GT-a1b2c3d4e5f6\n- **Created:** 2025-12-20\n- **Last Verified:** 2025-12-27\n- **Integrity:** ✅ Valid"
    }
  ]
}
```

---

#### Tool: `sync_governance_to_jira`

Manually trigger sync of governance status to Jira Entity Properties.

**Input Schema:**
```json
{
  "type": "object",
  "properties": {
    "assetId": {
      "type": "string",
      "description": "Asset to sync (or 'all')"
    },
    "forceSync": {
      "type": "boolean",
      "default": false,
      "description": "Force sync even if recently synced"
    },
    "directory": {
      "type": "string",
      "default": "."
    }
  },
  "required": ["assetId"]
}
```

**Output:**
```json
{
  "content": [
    {
      "type": "text",
      "text": "## Jira Sync Complete ✅\n\n**Assets Synced:** 3\n\n| Asset | Ticket | Status |\n|-------|--------|--------|\n| customer-chatbot | PROJ-1234 | ✅ Synced |\n| recommendation-engine | PROJ-1235 | ✅ Synced |\n| fraud-detector | PROJ-1236 | ✅ Synced |\n\n### Entity Properties Updated\nProject managers can now query in Jira:\n```\nissue.property[aigrc-governance].compliancePercentage >= 80\n```"
    }
  ]
}
```

---

#### Tool: `validate_golden_thread`

Validate integrity of Golden Thread linkage.

**Input Schema:**
```json
{
  "type": "object",
  "properties": {
    "assetId": {
      "type": "string",
      "description": "Asset to validate"
    },
    "directory": {
      "type": "string",
      "default": "."
    }
  },
  "required": ["assetId"]
}
```

**Output:**
```json
{
  "content": [
    {
      "type": "text",
      "text": "## Golden Thread Validation: customer-chatbot\n\n### Status: ⚠️ WARNING\n\n| Check | Status | Details |\n|-------|--------|----------|\n| Link Exists | ✅ | Linked to PROJ-1234 |\n| Ticket Valid | ✅ | Ticket exists in Jira |\n| Hash Integrity | ✅ | Cryptographic hash valid |\n| Ticket Status | ⚠️ | Ticket marked 'Done' |\n| Last Sync | ✅ | 2 hours ago |\n\n### Recommendations\n- Ticket PROJ-1234 is closed. Consider:\n  - Linking to a maintenance ticket\n  - Archiving the asset if no longer maintained"
    }
  ]
}
```

---

### 7.3 Checkpoint Acceleration Tools

Tools for preparing code to pass GitHub/GitLab/CI checkpoints.

---

#### Tool: `preview_checkpoint_issues`

Preview what a checkpoint will flag before pushing.

**Input Schema:**
```json
{
  "type": "object",
  "properties": {
    "directory": {
      "type": "string",
      "default": "."
    },
    "targetCheckpoint": {
      "type": "string",
      "enum": ["github-app", "gitlab-webhook", "ci-gate"],
      "default": "github-app"
    },
    "checkpointConfig": {
      "type": "object",
      "properties": {
        "requireGoldenThread": { "type": "boolean", "default": true },
        "minCompliancePercentage": { "type": "number", "default": 80 },
        "failOnHighRisk": { "type": "boolean", "default": true },
        "failOnUnregistered": { "type": "boolean", "default": true },
        "profiles": {
          "type": "array",
          "items": { "type": "string" }
        }
      }
    }
  }
}
```

**Output:**
```json
{
  "content": [
    {
      "type": "text",
      "text": "## Checkpoint Preview: github-app\n\n### Verdict: WOULD FAIL 🚫\n\n### Blocking Issues (2)\n\n1. **Unregistered AI Detected**\n   - File: `src/ml/classifier.py`\n   - Framework: scikit-learn (HIGH confidence)\n   - Fix: `aigrc register --file src/ml/classifier.py`\n   - Auto-fixable: ✅ Yes\n\n2. **Missing Golden Thread**\n   - Asset: `recommendation-engine`\n   - Fix: `aigrc link PROJ-XXXX`\n   - Auto-fixable: ❌ No (requires ticket ID)\n\n### Warnings (1)\n- `customer-chatbot` compliance at 75% (threshold: 80%)\n\n### Quick Fix\nRun `aigrc checkpoint-fix` to auto-resolve fixable issues."
    }
  ],
  "isError": false,
  "_meta": {
    "wouldPass": false,
    "blockers": [
      {
        "assetId": null,
        "file": "src/ml/classifier.py",
        "issue": "unregistered_ai",
        "autoFixable": true
      },
      {
        "assetId": "recommendation-engine",
        "issue": "missing_golden_thread",
        "autoFixable": false
      }
    ],
    "warnings": ["customer-chatbot:compliance_below_threshold"]
  }
}
```

---

#### Tool: `generate_checkpoint_artifacts`

Auto-generate missing artifacts to pass checkpoints.

**Input Schema:**
```json
{
  "type": "object",
  "properties": {
    "directory": {
      "type": "string",
      "default": "."
    },
    "assetId": {
      "type": "string",
      "description": "Specific asset (or omit for all)"
    },
    "artifactTypes": {
      "type": "array",
      "items": {
        "type": "string",
        "enum": [
          "asset_card",
          "ai_impact_assessment",
          "risk_management_plan",
          "technical_documentation",
          "human_oversight_procedures",
          "testing_report"
        ]
      },
      "description": "Specific artifacts to generate (default: all missing)"
    },
    "dryRun": {
      "type": "boolean",
      "default": false,
      "description": "Preview without creating files"
    }
  }
}
```

**Output:**
```json
{
  "content": [
    {
      "type": "text",
      "text": "## Artifacts Generated ✅\n\n### Created (3)\n| Artifact | Asset | Path |\n|----------|-------|------|\n| Asset Card | classifier | `.aigrc/cards/classifier.aigrc.yaml` |\n| Impact Assessment | customer-chatbot | `.aigrc/artifacts/customer-chatbot/impact-assessment.md` |\n| Risk Plan | customer-chatbot | `.aigrc/artifacts/customer-chatbot/risk-plan.md` |\n\n### Could Not Generate (1)\n| Artifact | Asset | Reason |\n|----------|-------|--------|\n| Testing Report | fraud-detector | Requires manual test results |\n\n### Checkpoint Status\n**Before:** WOULD FAIL\n**After:** WOULD PASS ✅"
    }
  ]
}
```

---

#### Tool: `prepare_for_checkpoint`

Comprehensive checkpoint readiness report with action plan.

**Input Schema:**
```json
{
  "type": "object",
  "properties": {
    "directory": {
      "type": "string",
      "default": "."
    },
    "targetCheckpoint": {
      "type": "string",
      "enum": ["github-app", "gitlab-webhook", "ci-gate"],
      "default": "github-app"
    }
  }
}
```

**Output:**
```json
{
  "content": [
    {
      "type": "text",
      "text": "## Checkpoint Readiness Report\n\n### Overall Status: NEEDS WORK 🔧\n\n**Readiness Score:** 65/100\n\n### Summary\n| Metric | Current | Required |\n|--------|---------|----------|\n| Assets Detected | 4 | - |\n| Assets Registered | 3 | 4 |\n| With Golden Thread | 2 | 4 |\n| Avg Compliance | 78% | 80% |\n\n### Action Plan (Priority Order)\n\n1. **Register undetected AI** (~5 min)\n   ```bash\n   aigrc register --file src/ml/classifier.py\n   ```\n\n2. **Link to Jira tickets** (~10 min)\n   ```bash\n   aigrc link recommendation-engine PROJ-1235\n   aigrc link classifier PROJ-1240\n   ```\n\n3. **Generate missing artifacts** (~2 min)\n   ```bash\n   aigrc generate-artifacts --asset customer-chatbot\n   ```\n\n### Estimated Time to Pass: ~17 minutes"
    }
  ]
}
```

---

#### Tool: `check_policy`

Real-time policy query for governance decisions during development.

**Input Schema:**
```json
{
  "type": "object",
  "properties": {
    "action": {
      "type": "string",
      "enum": [
        "use_library",
        "use_model",
        "access_pii",
        "call_external_api",
        "deploy_to_production",
        "process_financial_data"
      ],
      "description": "Action being considered"
    },
    "context": {
      "type": "object",
      "properties": {
        "library": { "type": "string" },
        "model": { "type": "string" },
        "dataType": { "type": "string" },
        "endpoint": { "type": "string" },
        "environment": { "type": "string" }
      }
    },
    "directory": {
      "type": "string",
      "default": "."
    }
  },
  "required": ["action", "context"]
}
```

**Output:**
```json
{
  "content": [
    {
      "type": "text",
      "text": "## Policy Check: use_model\n\n**Model:** gpt-4o\n**Verdict:** ✅ ALLOWED\n\n### Policy Details\n- Model is on approved list\n- No data residency restrictions violated\n- Cost tier: Standard\n\n### Conditions\n- Must log all API calls for audit\n- Must not use for employment decisions without human review\n\n### Alternative Models (if needed)\n- claude-3-5-sonnet (approved, lower cost)\n- gpt-4o-mini (approved, 60% lower cost)"
    }
  ],
  "_meta": {
    "allowed": true,
    "conditions": ["audit_logging", "human_review_for_employment"],
    "alternatives": ["claude-3-5-sonnet", "gpt-4o-mini"]
  }
}
```

---

### 7.4 Core Governance Tools

Standard governance operations (retained from v2.0).

---

#### Tool: `scan_directory`

Scan a directory for AI/ML frameworks.

**Input Schema:**
```json
{
  "type": "object",
  "properties": {
    "directory": {
      "type": "string",
      "description": "Directory path to scan"
    },
    "exclude": {
      "type": "array",
      "items": { "type": "string" },
      "default": ["node_modules", ".git", "dist", "__pycache__"]
    },
    "include": {
      "type": "array",
      "items": { "type": "string" },
      "description": "Patterns to include"
    }
  },
  "required": ["directory"]
}
```

---

#### Tool: `get_asset_cards`

List all registered asset cards.

**Input Schema:**
```json
{
  "type": "object",
  "properties": {
    "directory": {
      "type": "string",
      "default": "."
    },
    "riskLevel": {
      "type": "string",
      "enum": ["minimal", "limited", "high", "unacceptable"]
    },
    "profile": {
      "type": "string",
      "description": "Filter by classification from specific profile"
    },
    "hasGoldenThread": {
      "type": "boolean",
      "description": "Filter by Golden Thread status"
    }
  }
}
```

---

#### Tool: `get_asset_card`

Get details of a specific asset card.

**Input Schema:**
```json
{
  "type": "object",
  "properties": {
    "id": {
      "type": "string",
      "description": "Asset card ID or name"
    },
    "directory": {
      "type": "string",
      "default": "."
    },
    "includeCompliance": {
      "type": "boolean",
      "default": true
    },
    "includeGoldenThread": {
      "type": "boolean",
      "default": true
    },
    "includeRedTeam": {
      "type": "boolean",
      "default": false
    }
  },
  "required": ["id"]
}
```

---

#### Tool: `create_asset_card`

Create a new asset card with multi-jurisdiction support.

**Input Schema:**
```json
{
  "type": "object",
  "properties": {
    "name": {
      "type": "string",
      "description": "Asset name"
    },
    "description": {
      "type": "string"
    },
    "type": {
      "type": "string",
      "enum": ["api_client", "framework", "agent", "model", "pipeline"]
    },
    "framework": {
      "type": "string",
      "description": "Primary AI framework"
    },
    "owner": {
      "type": "object",
      "properties": {
        "name": { "type": "string" },
        "email": { "type": "string" }
      },
      "required": ["name", "email"]
    },
    "riskFactors": {
      "type": "object",
      "properties": {
        "autonomousDecisions": { "type": "boolean" },
        "customerFacing": { "type": "boolean" },
        "toolExecution": { "type": "boolean" },
        "externalDataAccess": { "type": "boolean" },
        "piiProcessing": { "type": "string", "enum": ["yes", "no", "unknown"] },
        "highStakesDecisions": { "type": "boolean" },
        "affectsSafety": { "type": "boolean" },
        "affectsRights": { "type": "boolean" },
        "domain": {
          "type": "string",
          "enum": ["employment", "education", "credit", "healthcare", "critical_infrastructure", "law_enforcement", "general"]
        }
      }
    },
    "goldenThread": {
      "type": "object",
      "properties": {
        "ticketId": { "type": "string" },
        "ticketSystem": { "type": "string", "enum": ["jira", "ado", "linear"] },
        "relationship": { "type": "string" }
      }
    },
    "directory": {
      "type": "string",
      "default": "."
    }
  },
  "required": ["name", "owner"]
}
```

---

#### Tool: `validate_asset_cards`

Validate all asset cards against active compliance profiles.

**Input Schema:**
```json
{
  "type": "object",
  "properties": {
    "directory": {
      "type": "string",
      "default": "."
    },
    "profiles": {
      "type": "array",
      "items": { "type": "string" }
    },
    "strict": {
      "type": "boolean",
      "default": false
    },
    "includeGoldenThread": {
      "type": "boolean",
      "default": true,
      "description": "Validate Golden Thread integrity"
    }
  }
}
```

---

#### Tool: `classify_risk`

Classify risk level across multiple jurisdictions.

**Input Schema:**
```json
{
  "type": "object",
  "properties": {
    "autonomousDecisions": { "type": "boolean" },
    "customerFacing": { "type": "boolean" },
    "toolExecution": { "type": "boolean" },
    "externalDataAccess": { "type": "boolean" },
    "piiProcessing": { "type": "string", "enum": ["yes", "no", "unknown"] },
    "highStakesDecisions": { "type": "boolean" },
    "affectsSafety": { "type": "boolean" },
    "affectsRights": { "type": "boolean" },
    "domain": {
      "type": "string",
      "enum": ["employment", "education", "credit", "healthcare", "critical_infrastructure", "law_enforcement", "general"]
    },
    "profiles": {
      "type": "array",
      "items": { "type": "string" },
      "description": "Profiles to classify against (default: all active)"
    }
  }
}
```

---

### 7.5 Multi-Jurisdiction Compliance Tools

Tools for managing compliance across regulatory frameworks (retained from v2.0).

---

#### Tool: `list_compliance_profiles`

List available compliance profiles.

**Input Schema:**
```json
{
  "type": "object",
  "properties": {
    "type": {
      "type": "string",
      "enum": ["regulation", "standard", "internal", "all"],
      "default": "all"
    },
    "jurisdiction": {
      "type": "string",
      "description": "Filter by jurisdiction (e.g., 'US', 'EU')"
    }
  }
}
```

---

#### Tool: `add_compliance_profile`

Add a compliance profile to the workspace.

**Input Schema:**
```json
{
  "type": "object",
  "properties": {
    "profileId": {
      "type": "string",
      "description": "Profile ID (e.g., 'us-omb-m24')"
    },
    "directory": {
      "type": "string",
      "default": "."
    }
  },
  "required": ["profileId"]
}
```

---

#### Tool: `get_active_profiles`

Get currently active compliance profiles.

**Input Schema:**
```json
{
  "type": "object",
  "properties": {
    "directory": {
      "type": "string",
      "default": "."
    }
  }
}
```

---

#### Tool: `check_compliance`

Check asset compliance against specific profiles.

**Input Schema:**
```json
{
  "type": "object",
  "properties": {
    "assetId": {
      "type": "string",
      "description": "Asset to check (or 'all')"
    },
    "profiles": {
      "type": "array",
      "items": { "type": "string" }
    },
    "directory": {
      "type": "string",
      "default": "."
    }
  },
  "required": ["assetId"]
}
```

---

#### Tool: `get_crosswalk`

Get cross-framework classification mapping.

**Input Schema:**
```json
{
  "type": "object",
  "properties": {
    "assetId": {
      "type": "string"
    },
    "profiles": {
      "type": "array",
      "items": { "type": "string" }
    },
    "directory": {
      "type": "string",
      "default": "."
    }
  },
  "required": ["assetId"]
}
```

---

#### Tool: `generate_artifact`

Generate compliance artifact from template.

**Input Schema:**
```json
{
  "type": "object",
  "properties": {
    "assetId": {
      "type": "string"
    },
    "artifactType": {
      "type": "string",
      "enum": [
        "ai_impact_assessment",
        "risk_management_plan",
        "technical_documentation",
        "human_oversight_procedures",
        "testing_report",
        "equity_assessment",
        "notice_and_explanation",
        "nist_risk_profile",
        "cyclonedx_ml_bom"
      ]
    },
    "profile": {
      "type": "string",
      "description": "Profile template to use"
    },
    "format": {
      "type": "string",
      "enum": ["markdown", "json", "yaml"],
      "default": "markdown"
    },
    "directory": {
      "type": "string",
      "default": "."
    }
  },
  "required": ["assetId", "artifactType"]
}
```

---

#### Tool: `gap_analysis`

Perform gap analysis across all profiles.

**Input Schema:**
```json
{
  "type": "object",
  "properties": {
    "assetId": {
      "type": "string",
      "description": "Asset to analyze (or 'all')"
    },
    "profiles": {
      "type": "array",
      "items": { "type": "string" }
    },
    "directory": {
      "type": "string",
      "default": "."
    }
  }
}
```

---

### 7.6 Red Team Integration Tools

Tools for security verification (retained from v2.0).

---

#### Tool: `get_redteam_status`

Get red team verification status for an asset.

**Input Schema:**
```json
{
  "type": "object",
  "properties": {
    "assetId": {
      "type": "string"
    },
    "directory": {
      "type": "string",
      "default": "."
    }
  },
  "required": ["assetId"]
}
```

---

#### Tool: `get_redteam_findings`

Get detailed red team findings.

**Input Schema:**
```json
{
  "type": "object",
  "properties": {
    "assetId": {
      "type": "string"
    },
    "severity": {
      "type": "string",
      "enum": ["critical", "high", "medium", "low", "all"],
      "default": "all"
    },
    "status": {
      "type": "string",
      "enum": ["open", "remediated", "accepted", "in_progress", "all"],
      "default": "all"
    },
    "directory": {
      "type": "string",
      "default": "."
    }
  },
  "required": ["assetId"]
}
```

---

#### Tool: `trigger_redteam_scan`

Trigger a red team scan (requires AIGOS connection).

**Input Schema:**
```json
{
  "type": "object",
  "properties": {
    "assetId": {
      "type": "string"
    },
    "vectors": {
      "type": "array",
      "items": {
        "type": "string",
        "enum": [
          "prompt_injection",
          "memory_manipulation",
          "tool_hijacking",
          "capability_escalation",
          "context_poisoning",
          "goal_manipulation",
          "multi_agent_exploitation",
          "encoding_bypass"
        ]
      }
    },
    "environment": {
      "type": "string",
      "enum": ["sandbox", "staging"],
      "default": "sandbox"
    },
    "directory": {
      "type": "string",
      "default": "."
    }
  },
  "required": ["assetId"]
}
```

---

#### Tool: `verify_constraint`

Verify a specific asset card constraint.

**Input Schema:**
```json
{
  "type": "object",
  "properties": {
    "assetId": {
      "type": "string"
    },
    "constraint": {
      "type": "string",
      "description": "Constraint to verify (e.g., 'humanApprovalRequired.data_export')"
    },
    "directory": {
      "type": "string",
      "default": "."
    }
  },
  "required": ["assetId", "constraint"]
}
```

---

#### Tool: `update_finding_status`

Update the status of a red team finding.

**Input Schema:**
```json
{
  "type": "object",
  "properties": {
    "findingId": {
      "type": "string"
    },
    "status": {
      "type": "string",
      "enum": ["open", "in_progress", "remediated", "accepted", "false_positive"]
    },
    "notes": {
      "type": "string"
    },
    "evidence": {
      "type": "string",
      "description": "Path to remediation evidence"
    },
    "directory": {
      "type": "string",
      "default": "."
    }
  },
  "required": ["findingId", "status"]
}
```

---

### 7.7 Database Governance Tools

Tools for managing database-level governance (NEW in v3.0).

---

#### Tool: `generate_database_triggers`

Generate governance triggers for Supabase/PostgreSQL.

**Input Schema:**
```json
{
  "type": "object",
  "properties": {
    "targetDatabase": {
      "type": "string",
      "enum": ["supabase", "postgres", "planetscale"],
      "default": "supabase"
    },
    "governanceLevel": {
      "type": "string",
      "enum": ["basic", "standard", "enterprise"],
      "default": "standard",
      "description": "basic: audit log only, standard: + PII detection, enterprise: + data classification"
    },
    "outputPath": {
      "type": "string",
      "default": ".aigrc/database/governance.sql"
    }
  }
}
```

**Output:**
```json
{
  "content": [
    {
      "type": "text",
      "text": "## Database Governance Script Generated\n\n**Target:** Supabase (PostgreSQL)\n**Level:** Standard\n\n### Components Created\n1. `aigos_audit_log` table - Immutable audit trail\n2. `check_ai_safety()` function - PII/secret detection\n3. RLS policies for audit log protection\n\n### Installation\n```sql\n-- Run in Supabase SQL Editor\n\\i .aigrc/database/governance.sql\n```\n\n### Verification\nAfter installation, run:\n```sql\nSELECT * FROM aigos_audit_log WHERE event_type = 'SYSTEM_INIT';\n```"
    }
  ]
}
```

---

#### Tool: `validate_database_governance`

Validate existing database governance setup.

**Input Schema:**
```json
{
  "type": "object",
  "properties": {
    "connectionString": {
      "type": "string",
      "description": "Database connection string (or use AIGRC_DATABASE_URL env)"
    },
    "checks": {
      "type": "array",
      "items": {
        "type": "string",
        "enum": ["audit_log", "triggers", "rls_policies", "encryption"]
      },
      "default": ["audit_log", "triggers", "rls_policies"]
    }
  }
}
```

---

### 7.8 Report Generation Tools

Tools for generating reports (retained from v2.0).

---

#### Tool: `generate_compliance_report`

Generate a comprehensive compliance report.

**Input Schema:**
```json
{
  "type": "object",
  "properties": {
    "directory": {
      "type": "string",
      "default": "."
    },
    "format": {
      "type": "string",
      "enum": ["markdown", "json", "html", "pdf"],
      "default": "markdown"
    },
    "profiles": {
      "type": "array",
      "items": { "type": "string" }
    },
    "includeRedTeam": {
      "type": "boolean",
      "default": true
    },
    "includeGoldenThread": {
      "type": "boolean",
      "default": true
    },
    "includeRecommendations": {
      "type": "boolean",
      "default": true
    }
  }
}
```

---

#### Tool: `generate_audit_package`

Generate a complete audit package for a specific framework.

**Input Schema:**
```json
{
  "type": "object",
  "properties": {
    "profile": {
      "type": "string",
      "description": "Profile to generate audit package for"
    },
    "assetId": {
      "type": "string",
      "description": "Specific asset (or 'all')"
    },
    "outputDir": {
      "type": "string",
      "description": "Output directory"
    },
    "includeEvidence": {
      "type": "boolean",
      "default": true,
      "description": "Include evidence artifacts"
    },
    "directory": {
      "type": "string",
      "default": "."
    }
  },
  "required": ["profile"]
}
```

---

## 8. Resources

### 8.1 Core Resources

#### Resource: `aigrc://cards`

List of all asset cards with classifications and Golden Thread status.

**URI:** `aigrc://cards`

**Subscribable:** Yes (for new card notifications)

---

#### Resource: `aigrc://cards/{id}`

Individual asset card with full data.

**URI Template:** `aigrc://cards/{id}`

---

#### Resource: `aigrc://config`

AIGRC configuration including active profiles.

**URI:** `aigrc://config`

---

### 8.2 Golden Thread Resources

#### Resource: `aigrc://golden-thread/{assetId}`

Golden Thread status and linked business context.

**URI Template:** `aigrc://golden-thread/{assetId}`

**Returns:**
```json
{
  "contents": [
    {
      "uri": "aigrc://golden-thread/customer-chatbot",
      "mimeType": "application/json",
      "text": "{\"goldenThreadId\":\"GT-a1b2c3d4\",\"ticketId\":\"PROJ-1234\",\"ticketSystem\":\"jira\",\"relationship\":\"implements\",\"lastVerified\":\"2025-12-27T10:30:00Z\",\"integrityValid\":true}"
    }
  ]
}
```

---

### 8.3 Checkpoint Resources

#### Resource: `aigrc://checkpoint-status`

Current checkpoint readiness for the workspace.

**URI:** `aigrc://checkpoint-status`

**Subscribable:** Yes (for status changes)

---

#### Resource: `aigrc://checkpoint-status/{checkpoint}`

Status for a specific checkpoint type.

**URI Template:** `aigrc://checkpoint-status/{checkpoint}`

**Checkpoints:** `github-app`, `gitlab-webhook`, `ci-gate`

---

### 8.4 Compliance Resources

#### Resource: `aigrc://profiles`

List of available compliance profiles.

**URI:** `aigrc://profiles`

---

#### Resource: `aigrc://profiles/{id}`

Individual profile details.

**URI Template:** `aigrc://profiles/{id}`

---

#### Resource: `aigrc://compliance/{assetId}`

Compliance status for an asset across all profiles.

**URI Template:** `aigrc://compliance/{assetId}`

---

#### Resource: `aigrc://crosswalk/{assetId}`

Cross-framework mapping for an asset.

**URI Template:** `aigrc://crosswalk/{assetId}`

---

### 8.5 Red Team Resources

#### Resource: `aigrc://redteam/{assetId}`

Red team status and findings.

**URI Template:** `aigrc://redteam/{assetId}`

**Subscribable:** Yes (for new findings)

---

#### Resource: `aigrc://redteam/{assetId}/findings`

All findings for an asset.

**URI Template:** `aigrc://redteam/{assetId}/findings`

---

#### Resource: `aigrc://redteam/{assetId}/findings/{findingId}`

Individual finding details.

**URI Template:** `aigrc://redteam/{assetId}/findings/{findingId}`

---

### 8.6 Policy Resources

#### Resource: `aigrc://policy`

Current policy configuration for the tenant.

**URI:** `aigrc://policy`

---

#### Resource: `aigrc://policy/approved-models`

List of approved AI models.

**URI:** `aigrc://policy/approved-models`

---

#### Resource: `aigrc://policy/approved-libraries`

List of approved AI libraries.

**URI:** `aigrc://policy/approved-libraries`

---

## 9. Prompts

### 9.1 Value-First Prompts

#### Prompt: `deployment_review`

Review an asset for deployment readiness.

**Arguments:**
```json
{
  "assetId": {
    "description": "Asset to review",
    "required": true
  },
  "environment": {
    "description": "Target environment (development/staging/production)",
    "required": false
  }
}
```

**Template:**
```
Review the AI asset "{assetId}" for deployment to {environment}.

Asset Card:
{asset_card_content}

Golden Thread:
{golden_thread_status}

Compliance Status:
{compliance_status}

Security Findings:
{redteam_summary}

Provide:
1. Clear GO/NO-GO recommendation
2. Any blocking issues that must be resolved
3. Warnings that should be addressed but aren't blocking
4. Estimated time to resolve any issues
```

---

### 9.2 Compliance Prompts

#### Prompt: `compliance_review`

Review an asset for multi-jurisdiction compliance.

**Arguments:**
```json
{
  "assetId": {
    "description": "Asset to review",
    "required": true
  },
  "profiles": {
    "description": "Specific profiles (comma-separated)",
    "required": false
  }
}
```

**Template:**
```
Review the AI asset "{assetId}" for compliance across frameworks:
{profiles_or_default}

For each framework, analyze:
1. Current risk classification
2. Required controls and their status
3. Missing documentation artifacts
4. Cross-framework equivalences

Asset Card:
{asset_card_content}

Compliance Status:
{compliance_status}

Provide:
- Summary of classification across frameworks
- Prioritized list of gaps (with effort estimates)
- Recommendations that satisfy multiple frameworks
- Timeline for achieving compliance
```

---

#### Prompt: `risk_assessment`

Perform multi-jurisdiction risk assessment.

**Arguments:**
```json
{
  "systemDescription": {
    "description": "Description of the AI system",
    "required": true
  },
  "jurisdictions": {
    "description": "Target jurisdictions (e.g., 'US,EU')",
    "required": false
  }
}
```

---

#### Prompt: `security_review`

Review asset security based on red team findings.

**Arguments:**
```json
{
  "assetId": {
    "description": "Asset to review",
    "required": true
  }
}
```

---

#### Prompt: `audit_preparation`

Prepare for multi-framework compliance audit.

**Arguments:**
```json
{
  "profile": {
    "description": "Primary framework being audited",
    "required": true
  },
  "scope": {
    "description": "Audit scope (all/high-risk/specific asset)",
    "required": false
  }
}
```

---

#### Prompt: `generate_documentation`

Generate compliance documentation.

**Arguments:**
```json
{
  "assetId": {
    "description": "Asset to document",
    "required": true
  },
  "documentType": {
    "description": "Type of document",
    "required": true
  },
  "profile": {
    "description": "Framework template",
    "required": false
  }
}
```

---

## 10. Artifact Format Specification

### 10.1 Asset Card Format (v3.0)

Asset cards use the `.aigrc.yaml` extension and follow this schema:

```yaml
# .aigrc/cards/customer-chatbot.aigrc.yaml
apiVersion: aigrc.dev/v1
kind: AssetCard
metadata:
  name: customer-chatbot
  namespace: production
  labels:
    risk-level: high
    team: customer-experience
    profiles: eu-ai-act,us-omb-m24
  annotations:
    aigrc.dev/created-by: jane@company.com
    aigrc.dev/created-at: "2025-12-20T10:00:00Z"
spec:
  # Basic Information
  type: agent                    # api_client | framework | agent | model | pipeline
  description: "AI-powered customer support chatbot"
  framework: langchain
  version: "1.2.0"
  
  # Ownership
  owner:
    name: Jane Developer
    email: jane@company.com
    team: Customer Experience
  
  # Golden Thread (Business Intent)
  goldenThread:
    ticketId: PROJ-1234
    ticketSystem: jira
    relationship: implements
    goldenThreadId: GT-a1b2c3d4e5f6
    lastVerified: "2025-12-27T10:30:00Z"
  
  # Risk Factors
  riskFactors:
    autonomousDecisions: true
    customerFacing: true
    toolExecution: true
    externalDataAccess: true
    piiProcessing: "yes"
    highStakesDecisions: false
    affectsSafety: false
    affectsRights: true
    principalBasisForDecision: false
    domain: general
  
  # Multi-Jurisdiction Classifications (auto-populated)
  classifications:
    eu-ai-act:
      level: HIGH
      score: 8
      reasons:
        - "Autonomous decisions"
        - "PII processing"
        - "Customer-facing"
      requiredArtifacts:
        - ai_impact_assessment
        - risk_management_plan
        - technical_documentation
    us-omb-m24:
      level: RIGHTS-IMPACTING
      reasons:
        - "Affects individual rights"
      requiredArtifacts:
        - ai_impact_assessment
        - equity_assessment
        - notice_and_explanation
  
  # Required Artifacts (presence verified at checkpoint)
  artifacts:
    - type: ai_impact_assessment
      path: .aigrc/artifacts/customer-chatbot/impact-assessment.md
      generatedAt: "2025-12-20T14:00:00Z"
      requiredBy:
        - eu-ai-act
        - us-omb-m24
    - type: risk_management_plan
      path: .aigrc/artifacts/customer-chatbot/risk-plan.md
      generatedAt: "2025-12-22T09:00:00Z"
      requiredBy:
        - eu-ai-act
  
  # Compliance Status (computed)
  compliance:
    overall:
      percentage: 85
      status: partial
    byProfile:
      eu-ai-act:
        percentage: 85
        missingControls:
          - art-9-monitoring
      us-omb-m24:
        percentage: 100
        missingControls: []
  
  # Model Configuration
  model:
    provider: openai
    name: gpt-4o
    version: "2024-08-06"
    deployment: cloud
  
  # Constraints (for red team verification)
  constraints:
    humanApprovalRequired:
      data_export: true
      financial_transactions: true
    dataRetention:
      maxDays: 30
      piiMasking: true
    rateLimits:
      requestsPerMinute: 100
      tokensPerDay: 1000000
```

### 10.2 Directory Structure

```
.aigrc/
├── config.yaml                 # Workspace configuration
├── cards/
│   ├── customer-chatbot.aigrc.yaml
│   ├── recommendation-engine.aigrc.yaml
│   └── fraud-detector.aigrc.yaml
├── artifacts/
│   ├── customer-chatbot/
│   │   ├── impact-assessment.md
│   │   ├── risk-plan.md
│   │   └── testing-report.md
│   └── recommendation-engine/
│       └── impact-assessment.md
├── database/
│   └── governance.sql          # Supabase triggers
├── reports/
│   ├── compliance-2025-12-27.md
│   └── audit-package-eu-ai-act/
└── .cache/                     # Local cache (gitignored)
```

### 10.3 Checkpoint Validation Schema

The checkpoint validates the following structure:

```typescript
interface CheckpointValidation {
  // Layer 1: Detection
  detection: {
    passed: boolean;
    aiFrameworksFound: string[];
    highConfidenceDetections: number;
  };
  
  // Layer 2: Registration
  registration: {
    passed: boolean;
    unregisteredAssets: string[];
    orphanedCards: string[];
  };
  
  // Layer 3: Golden Thread
  goldenThread: {
    passed: boolean;
    assetsWithoutTickets: string[];
    invalidTicketLinks: string[];
    staleLinks: string[];           // Ticket closed/deleted
  };
  
  // Layer 4: Risk Classification
  risk: {
    passed: boolean;
    highRiskAssets: string[];
    unacceptableRiskAssets: string[];
  };
  
  // Layer 5: Compliance
  compliance: {
    passed: boolean;
    belowThreshold: Array<{
      assetId: string;
      profile: string;
      percentage: number;
      required: number;
    }>;
    missingArtifacts: Array<{
      assetId: string;
      artifactType: string;
      requiredBy: string[];
    }>;
  };
  
  // Final Result
  verdict: "PASS" | "WARN" | "FAIL";
  blockers: string[];
  warnings: string[];
}
```

---

## 11. Configuration

### 11.1 Claude Desktop Configuration

```json
{
  "mcpServers": {
    "aigrc": {
      "command": "npx",
      "args": ["@aigrc/mcp"],
      "env": {
        "AIGRC_WORKSPACE": "/path/to/workspace",
        "AIGRC_LOG_LEVEL": "info",
        "AIGRC_PROFILES": "eu-ai-act,us-omb-m24,nist-ai-rmf"
      }
    }
  }
}
```

### 11.2 VS Code / Cursor Configuration

```json
{
  "mcp.servers": {
    "aigrc": {
      "command": "npx",
      "args": ["@aigrc/mcp"],
      "workspaceFolder": "${workspaceFolder}",
      "env": {
        "AIGRC_PROFILES": "eu-ai-act,us-omb-m24"
      }
    }
  }
}
```

### 11.3 Lovable Configuration (SSE)

In Lovable Settings → Connectors → Personal Connectors:

```
Server Name: AIGRC Governance
Server URL: https://mcp.aigrc.dev/sse
Auth Type: OAuth
```

### 11.4 Replit Configuration

In `.replit` file:

```toml
[env]
AIGRC_API_KEY = "${AIGRC_API_KEY}"
AIGRC_PROFILES = "eu-ai-act,us-omb-m24"
```

In Replit Secrets:
```
AIGRC_API_KEY=aigrc_sk_live_xxxxx
```

### 11.5 Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `AIGRC_WORKSPACE` | `.` | Default workspace directory |
| `AIGRC_CARDS_DIR` | `.aigrc/cards` | Asset cards directory |
| `AIGRC_LOG_LEVEL` | `info` | Log level (debug, info, warn, error) |
| `AIGRC_CACHE_TTL` | `300` | Cache TTL in seconds |
| `AIGRC_PROFILES` | `eu-ai-act` | Comma-separated default profiles |
| `AIGRC_REDTEAM_ENABLED` | `false` | Enable red team integration |
| `AIGOS_API_URL` | - | AIGOS platform API URL |
| `AIGOS_API_KEY` | - | AIGOS API key |
| `AIGRC_JIRA_ENABLED` | `false` | Enable Jira integration |
| `AIGRC_DATABASE_URL` | - | Database connection for validation |

---

## 12. Security Considerations

### 12.1 File System Access

The MCP server requires file system access for:
- Reading source files for scanning
- Reading/writing asset cards
- Reading configuration and profile files
- Reading red team findings

**Mitigations:**
- Restrict to workspace directory
- Validate all paths (no path traversal)
- Read-only mode option for sensitive environments

### 12.2 Authentication Security

**API Keys:**
- 90-day expiration enforced
- Keys hashed in storage (bcrypt)
- Rate limiting per key
- Audit logging of key usage

**OAuth 2.0:**
- Short-lived tokens (1 hour)
- Refresh token rotation
- Scope-based access control
- Token revocation support

**Enterprise SSO:**
- SAML assertions validated
- JIT provisioning with role mapping
- Session timeout enforcement

### 12.3 Multi-Tenant Isolation

- Tenant context injected at protocol layer
- All data queries filtered by tenant ID
- No cross-tenant resource access
- Separate encryption keys per tenant (enterprise)

### 12.4 Jira Integration Security

- OAuth tokens stored encrypted
- Tokens never exposed to MCP clients
- Jira API calls proxied through AIGOS backend
- Entity Properties limited to governance data only

### 12.5 Red Team Integration

- API key required for red team features
- All operations logged
- Sandbox-only execution by default
- Explicit production opt-in
- Findings encrypted at rest

### 12.6 Sensitive Data Handling

Asset cards and findings may contain:
- Owner names and emails
- System descriptions
- Compliance gaps and risks

**Mitigations:**
- No transmission outside authorized endpoints
- Logging excludes PII and vulnerability details
- Cards and findings stored with appropriate permissions

---

## 13. Implementation Plan

### 13.1 Phase Overview

| Phase | Timeline | Deliverables |
|-------|----------|--------------|
| **Phase 1** | Weeks 1-3 | Golden Thread tools, SSE transport with auth, Checkpoint acceleration tools |
| **Phase 2** | Weeks 4-5 | Lovable/Replit integration, Database governance tools |
| **Phase 3** | Week 6 | Value-First refinement, Documentation, Testing |
| **Phase 4** | Weeks 7-8 | Enterprise SSO, Production hardening |

### 13.2 Phase 1: Critical Foundation (Weeks 1-3)

**Week 1:**
- [ ] Golden Thread tools (`link_business_intent`, `get_business_context`, `validate_golden_thread`)
- [ ] SSE transport skeleton with API Key auth
- [ ] Jira OAuth proxy in AIGOS backend

**Week 2:**
- [ ] Checkpoint acceleration tools (`preview_checkpoint_issues`, `generate_checkpoint_artifacts`)
- [ ] Multi-tenancy architecture (tenant context injection)
- [ ] Entity Properties write to Jira

**Week 3:**
- [ ] `check_policy` tool for real-time queries
- [ ] OAuth 2.0 Client Credentials flow
- [ ] SSE deployment to `mcp.aigrc.dev`

### 13.3 Phase 2: Platform Integration (Weeks 4-5)

**Week 4:**
- [ ] Lovable MCP integration testing
- [ ] Database governance tools (`generate_database_triggers`)
- [ ] Value-First tools (`get_deployment_readiness`, `get_blockers`)

**Week 5:**
- [ ] Replit extension wrapper
- [ ] End-to-end checkpoint flow validation
- [ ] `sync_governance_to_jira` automation

### 13.4 Phase 3: Refinement (Week 6)

- [ ] Tool naming/alias refinement
- [ ] Developer-focused documentation
- [ ] Integration test suite
- [ ] Performance optimization

### 13.5 Phase 4: Enterprise (Weeks 7-8)

- [ ] Enterprise SSO (Okta, Azure AD)
- [ ] Air-gap deployment support
- [ ] Production security audit
- [ ] Load testing

---

## 14. Package Structure

```
packages/mcp/
├── package.json
├── tsconfig.json
├── tsup.config.ts
├── src/
│   ├── index.ts                    # Entry point
│   ├── server.ts                   # MCP server setup
│   ├── transport/
│   │   ├── stdio.ts                # stdio adapter
│   │   ├── sse.ts                  # SSE adapter
│   │   └── websocket.ts            # WebSocket adapter (future)
│   ├── auth/
│   │   ├── api-key.ts              # API Key validation
│   │   ├── oauth.ts                # OAuth 2.0 handling
│   │   └── sso.ts                  # Enterprise SSO
│   ├── protocol/
│   │   ├── handler.ts              # JSON-RPC handler
│   │   ├── tenant.ts               # Tenant context
│   │   └── subscriptions.ts        # Resource subscriptions
│   ├── tools/
│   │   ├── index.ts                # Tool registry
│   │   ├── value-first/
│   │   │   ├── deployment-readiness.ts
│   │   │   ├── blockers.ts
│   │   │   ├── cost-estimate.ts
│   │   │   └── security-risks.ts
│   │   ├── golden-thread/
│   │   │   ├── link.ts
│   │   │   ├── context.ts
│   │   │   ├── sync.ts
│   │   │   └── validate.ts
│   │   ├── checkpoint/
│   │   │   ├── preview.ts
│   │   │   ├── generate.ts
│   │   │   ├── prepare.ts
│   │   │   └── policy.ts
│   │   ├── core/
│   │   │   ├── scan.ts
│   │   │   ├── cards.ts
│   │   │   └── classify.ts
│   │   ├── compliance/
│   │   │   ├── profiles.ts
│   │   │   ├── check.ts
│   │   │   ├── crosswalk.ts
│   │   │   ├── gap-analysis.ts
│   │   │   └── artifacts.ts
│   │   ├── redteam/
│   │   │   ├── status.ts
│   │   │   ├── findings.ts
│   │   │   ├── trigger.ts
│   │   │   └── verify.ts
│   │   ├── database/
│   │   │   ├── triggers.ts
│   │   │   └── validate.ts
│   │   └── reports/
│   │       ├── compliance.ts
│   │       └── audit.ts
│   ├── resources/
│   │   ├── index.ts
│   │   ├── cards.ts
│   │   ├── golden-thread.ts
│   │   ├── checkpoint.ts
│   │   ├── profiles.ts
│   │   ├── compliance.ts
│   │   ├── redteam.ts
│   │   └── policy.ts
│   ├── prompts/
│   │   ├── index.ts
│   │   ├── value-first.ts
│   │   ├── compliance.ts
│   │   ├── security.ts
│   │   └── audit.ts
│   ├── services/
│   │   ├── scanner.ts
│   │   ├── cards.ts
│   │   ├── golden-thread.ts
│   │   ├── checkpoint.ts
│   │   ├── profiles.ts
│   │   ├── compliance.ts
│   │   ├── crosswalk.ts
│   │   ├── redteam.ts
│   │   ├── database.ts
│   │   ├── jira.ts
│   │   └── reports.ts
│   └── integrations/
│       ├── jira/
│       │   ├── client.ts
│       │   ├── entity-properties.ts
│       │   └── oauth.ts
│       ├── ado/
│       │   └── client.ts
│       └── aigos/
│           └── client.ts
└── bin/
    └── aigrc-mcp.ts                # CLI entry
```

---

## 15. API Examples

### 15.1 Linking Business Intent

**Request:**
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/call",
  "params": {
    "name": "link_business_intent",
    "arguments": {
      "assetId": "customer-chatbot",
      "ticketId": "PROJ-1234",
      "ticketSystem": "jira",
      "relationship": "implements",
      "syncMode": "bidirectional"
    }
  }
}
```

**Response:**
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "content": [
      {
        "type": "text",
        "text": "## Golden Thread Established ✅\n\n**Asset:** customer-chatbot\n**Ticket:** PROJ-1234\n**Golden Thread ID:** GT-a1b2c3d4e5f6\n\n✅ Ticket validated\n✅ Entity Property written to Jira\n✅ Bidirectional sync enabled"
      }
    ],
    "isError": false
  }
}
```

### 15.2 Checkpoint Preview

**Request:**
```json
{
  "jsonrpc": "2.0",
  "id": 2,
  "method": "tools/call",
  "params": {
    "name": "preview_checkpoint_issues",
    "arguments": {
      "directory": ".",
      "targetCheckpoint": "github-app",
      "checkpointConfig": {
        "requireGoldenThread": true,
        "minCompliancePercentage": 80,
        "profiles": ["eu-ai-act", "us-omb-m24"]
      }
    }
  }
}
```

### 15.3 Policy Check

**Request:**
```json
{
  "jsonrpc": "2.0",
  "id": 3,
  "method": "tools/call",
  "params": {
    "name": "check_policy",
    "arguments": {
      "action": "use_model",
      "context": {
        "model": "gpt-4o",
        "dataType": "pii"
      }
    }
  }
}
```

**Response:**
```json
{
  "jsonrpc": "2.0",
  "id": 3,
  "result": {
    "content": [
      {
        "type": "text",
        "text": "## Policy Check: use_model\n\n**Model:** gpt-4o\n**Verdict:** ✅ ALLOWED (with conditions)\n\n### Conditions\n- Must enable audit logging\n- Must not use for automated employment decisions\n\n### Alternative Models\n- claude-3-5-sonnet (approved, similar capability)\n- gpt-4o-mini (approved, lower cost)"
      }
    ],
    "_meta": {
      "allowed": true,
      "conditions": ["audit_logging_required", "no_employment_automation"],
      "alternatives": ["claude-3-5-sonnet", "gpt-4o-mini"]
    }
  }
}
```

---

## 16. References

- [MCP Specification](https://spec.modelcontextprotocol.io/)
- [MCP TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk)
- [Atlassian Jira Cloud REST API](https://developer.atlassian.com/cloud/jira/platform/rest/v3/)
- [Atlassian OAuth 2.0 (3LO)](https://developer.atlassian.com/cloud/jira/platform/oauth-2-3lo-apps/)
- [Jira Entity Properties](https://developer.atlassian.com/cloud/jira/platform/jira-entity-properties/)
- [EU AI Act Mapping](../concepts/eu-ai-act-mapping.md)
- [US OMB M-24 Compliance](../concepts/us-omb-m24-mapping.md)
- [NIST AI Risk Management Framework](https://www.nist.gov/itl/ai-risk-management-framework)
- [GovOS Value-First Strategy](../GovOS_Value_First_Strategy_Vision.docx)

---

## Appendix A: Tool Summary Matrix

| Tool | Category | Primary Use | Auth Required |
|------|----------|-------------|---------------|
| `get_deployment_readiness` | Value-First | Check if ready to deploy | Read |
| `get_blockers` | Value-First | Identify PR blockers | Read |
| `estimate_api_costs` | Value-First | Cost estimation | Read |
| `check_security_risks` | Value-First | Security check | Read |
| `link_business_intent` | Golden Thread | Link to Jira | Write + Jira |
| `get_business_context` | Golden Thread | Get ticket context | Read + Jira |
| `sync_governance_to_jira` | Golden Thread | Sync to Jira | Write + Jira |
| `validate_golden_thread` | Golden Thread | Validate linkage | Read + Jira |
| `preview_checkpoint_issues` | Checkpoint | Preview checkpoint | Read |
| `generate_checkpoint_artifacts` | Checkpoint | Generate artifacts | Write |
| `prepare_for_checkpoint` | Checkpoint | Readiness report | Read |
| `check_policy` | Checkpoint | Policy query | Read |
| `scan_directory` | Core | Scan for AI | Read |
| `get_asset_cards` | Core | List assets | Read |
| `get_asset_card` | Core | Get asset | Read |
| `create_asset_card` | Core | Create asset | Write |
| `validate_asset_cards` | Core | Validate cards | Read |
| `classify_risk` | Core | Risk classification | Read |
| `list_compliance_profiles` | Compliance | List profiles | Read |
| `add_compliance_profile` | Compliance | Add profile | Write |
| `get_active_profiles` | Compliance | Get active | Read |
| `check_compliance` | Compliance | Check compliance | Read |
| `get_crosswalk` | Compliance | Cross-framework map | Read |
| `generate_artifact` | Compliance | Generate docs | Write |
| `gap_analysis` | Compliance | Gap analysis | Read |
| `get_redteam_status` | Red Team | Get status | Read + RedTeam |
| `get_redteam_findings` | Red Team | Get findings | Read + RedTeam |
| `trigger_redteam_scan` | Red Team | Trigger scan | Write + RedTeam |
| `verify_constraint` | Red Team | Verify constraint | Read + RedTeam |
| `update_finding_status` | Red Team | Update finding | Write + RedTeam |
| `generate_database_triggers` | Database | Generate SQL | Write |
| `validate_database_governance` | Database | Validate setup | Read |
| `generate_compliance_report` | Reports | Generate report | Read |
| `generate_audit_package` | Reports | Generate audit | Read |

---

*End of Specification*

**Document Version:** 3.0.0
**Last Updated:** December 27, 2025
**Status:** Draft for Engineering Review
