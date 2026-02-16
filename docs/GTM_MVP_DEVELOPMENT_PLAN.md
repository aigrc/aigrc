# AIGOS GTM-Ready MVP Development Plan

**Document Version:** 1.0
**Created:** January 28, 2026
**Target Completion:** Weekend Sprint (Jan 31 - Feb 2, 2026)
**Status:** ACTIVE

---

## Executive Summary

This document outlines the prioritized development plan to achieve a **Go-To-Market (GTM) Ready MVP** for AIGOS - the commercial AI governance platform. The MVP focuses on delivering a multi-tenant SaaS offering that enables enterprises to govern AI agents at runtime.

### MVP Definition

**AIGOS GTM MVP** = Functional multi-tenant platform that demonstrates:
1. **Agent Registration & Identity** - Agents can register and receive governance identity
2. **Policy Enforcement** - Real-time capability checking at runtime
3. **Kill Switch** - Remote agent termination capability
4. **Observability** - Governance telemetry and dashboards
5. **Multi-Tenancy** - Isolated tenant environments with billing hooks
6. **AIGRC Integration** - Seamless connection to static governance layer

### Success Criteria

| Metric | Target |
|--------|--------|
| Agent registration time | < 5 seconds |
| Policy check latency | < 2ms P99 |
| Kill switch execution | < 60 seconds |
| Tenant isolation | 100% data separation |
| Uptime during demo | 99.9% |

---

## Part 1: JIRA Epic Structure

### Epic Overview

| Epic ID | Epic Name | Priority | Points | Sprint |
|---------|-----------|----------|--------|--------|
| **AIGOS-MVP-E1** | Platform Foundation | P0 | 21 | Sprint 1 |
| **AIGOS-MVP-E2** | Multi-Tenancy Infrastructure | P0 | 34 | Sprint 1 |
| **AIGOS-MVP-E3** | Agent Identity & Registration | P0 | 21 | Sprint 1 |
| **AIGOS-MVP-E4** | Policy Engine Service | P0 | 34 | Sprint 2 |
| **AIGOS-MVP-E5** | Kill Switch Service | P0 | 21 | Sprint 2 |
| **AIGOS-MVP-E6** | Telemetry & Observability | P1 | 21 | Sprint 2 |
| **AIGOS-MVP-E7** | AIGRC Bridge Integration | P1 | 13 | Sprint 3 |
| **AIGOS-MVP-E8** | Dashboard & Admin UI | P1 | 21 | Sprint 3 |
| **AIGOS-MVP-E9** | SDK & Developer Experience | P1 | 13 | Sprint 3 |
| **AIGOS-MVP-E10** | Demo & GTM Readiness | P0 | 8 | Sprint 3 |

**Total Story Points:** 207
**Sprint Duration:** 1 day each (Weekend intensive)

---

## Part 2: Detailed Epic Breakdown

### AIGOS-MVP-E1: Platform Foundation
**Priority:** P0 | **Points:** 21 | **Sprint:** 1

#### User Stories

| Story ID | Title | Points | Acceptance Criteria |
|----------|-------|--------|---------------------|
| E1-S1 | Create @aigos/platform-api package | 5 | Package structure, tsconfig, build working |
| E1-S2 | Set up Fastify HTTP server | 3 | Health endpoint, graceful shutdown, CORS |
| E1-S3 | Configure PostgreSQL with Drizzle ORM | 5 | Connection pooling, migrations, schema types |
| E1-S4 | Set up Redis for caching/pubsub | 3 | Connection, health check, pubsub channels |
| E1-S5 | Implement structured logging | 2 | Pino logger, request tracing, log levels |
| E1-S6 | Create Docker Compose for local dev | 3 | Postgres, Redis, API all running |

#### Technical Requirements
```
Dependencies:
- fastify ^4.26.0
- drizzle-orm ^0.29.0
- @fastify/cors, @fastify/helmet
- ioredis ^5.3.0
- pino ^8.17.0

Database: PostgreSQL 15+
Cache: Redis 7+
```

---

### AIGOS-MVP-E2: Multi-Tenancy Infrastructure
**Priority:** P0 | **Points:** 34 | **Sprint:** 1

#### User Stories

| Story ID | Title | Points | Acceptance Criteria |
|----------|-------|--------|---------------------|
| E2-S1 | Design tenant schema and migrations | 5 | tenants, tenant_members, api_keys tables |
| E2-S2 | Implement tenant context middleware | 5 | Extract tenant from JWT/API key, inject context |
| E2-S3 | Create tenant isolation layer | 8 | Row-level security, query scoping |
| E2-S4 | Implement API key management | 5 | Generate, rotate, revoke keys |
| E2-S5 | Add rate limiting per tenant | 3 | Redis-based, configurable limits |
| E2-S6 | Create tenant onboarding flow | 5 | Self-service signup, initial setup |
| E2-S7 | Implement usage metering | 3 | Track API calls, agent registrations |

#### Database Schema
```sql
-- tenants table
CREATE TABLE tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(63) UNIQUE NOT NULL,
  plan_tier VARCHAR(50) DEFAULT 'free',
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- api_keys table
CREATE TABLE api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id),
  key_hash VARCHAR(64) NOT NULL,
  key_prefix VARCHAR(12) NOT NULL,
  name VARCHAR(255),
  scopes TEXT[] DEFAULT '{}',
  environment VARCHAR(10) DEFAULT 'test',
  rate_limit_rpm INTEGER DEFAULT 60,
  expires_at TIMESTAMPTZ,
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON api_keys
  USING (tenant_id = current_setting('app.tenant_id')::uuid);
```

---

### AIGOS-MVP-E3: Agent Identity & Registration
**Priority:** P0 | **Points:** 21 | **Sprint:** 1

#### User Stories

| Story ID | Title | Points | Acceptance Criteria |
|----------|-------|--------|---------------------|
| E3-S1 | Design agent registration schema | 3 | agents, agent_capabilities tables |
| E3-S2 | Implement POST /agents/register endpoint | 5 | Validate input, create identity, return JWT |
| E3-S3 | Create RuntimeIdentity JWT generation | 5 | Claims: agent_id, tenant_id, capabilities, golden_thread |
| E3-S4 | Implement agent heartbeat mechanism | 3 | Track active agents, last_seen |
| E3-S5 | Add agent deregistration | 2 | Clean shutdown, status update |
| E3-S6 | Create GET /agents endpoint | 3 | List agents with filters, pagination |

#### API Specification
```yaml
POST /v1/agents/register:
  request:
    name: string (required)
    asset_card_id: string (optional, links to AIGRC)
    capabilities:
      tools: string[]
      domains: string[]
      max_budget: number
    metadata: object
  response:
    agent_id: uuid
    identity_token: jwt
    expires_at: iso8601

GET /v1/agents:
  query:
    status: active|inactive|terminated
    page: number
    limit: number
  response:
    agents: Agent[]
    total: number
    page: number
```

#### RuntimeIdentity JWT Claims
```typescript
interface RuntimeIdentityClaims {
  // Standard JWT claims
  iss: "aigos.dev";
  sub: string;        // agent_id
  aud: string;        // tenant_id
  exp: number;
  iat: number;
  jti: string;        // unique token id

  // AIGOS claims
  "aigos:version": "1.0";
  "aigos:capabilities": {
    tools: string[];
    domains: string[];
    max_budget: number;
  };
  "aigos:golden_thread"?: {
    hash: string;
    ticket_id: string;
    verified: boolean;
  };
  "aigos:lineage"?: {
    parent_id: string;
    depth: number;
  };
}
```

---

### AIGOS-MVP-E4: Policy Engine Service
**Priority:** P0 | **Points:** 34 | **Sprint:** 2

#### User Stories

| Story ID | Title | Points | Acceptance Criteria |
|----------|-------|--------|---------------------|
| E4-S1 | Design policy schema and storage | 5 | policies, policy_rules tables |
| E4-S2 | Implement policy CRUD endpoints | 5 | Create, read, update, delete policies |
| E4-S3 | Create policy evaluation engine | 8 | < 2ms P99, short-circuit evaluation |
| E4-S4 | Implement POST /policies/check endpoint | 5 | Real-time permission checking |
| E4-S5 | Add capability verification | 3 | Tool, domain, budget checks |
| E4-S6 | Implement policy caching | 3 | Redis cache with TTL |
| E4-S7 | Create policy inheritance | 5 | Tenant → Agent → Action hierarchy |

#### Policy Check API
```yaml
POST /v1/policies/check:
  headers:
    Authorization: Bearer {identity_token}
  request:
    action: string (required)
    resource: string (required)
    context:
      tool?: string
      domain?: string
      estimated_cost?: number
  response:
    allowed: boolean
    reason?: string
    matched_rule?: string
    budget_remaining?: number
    latency_ms: number
```

#### Policy Evaluation Chain
```
1. Kill Switch Check (O(1)) → If active, DENY immediately
2. Capability Check (O(n)) → Verify tool/domain in capabilities
3. Budget Check (O(1)) → Verify budget not exceeded
4. Domain Pattern Check (O(m)) → Regex domain validation
5. Custom Rules (O(r)) → Tenant-specific rules
```

---

### AIGOS-MVP-E5: Kill Switch Service
**Priority:** P0 | **Points:** 21 | **Sprint:** 2

#### User Stories

| Story ID | Title | Points | Acceptance Criteria |
|----------|-------|--------|---------------------|
| E5-S1 | Design kill switch command schema | 3 | commands table, audit log |
| E5-S2 | Implement POST /kill-switch/trigger | 5 | Issue termination command |
| E5-S3 | Create SSE endpoint for agents | 5 | Real-time command streaming |
| E5-S4 | Implement command verification | 3 | Signature validation, replay prevention |
| E5-S5 | Add cascading termination | 3 | Terminate agent + all children |
| E5-S6 | Create kill switch dashboard widget | 2 | Quick terminate button |

#### Kill Switch API
```yaml
POST /v1/kill-switch/trigger:
  headers:
    Authorization: Bearer {admin_token}
  request:
    agent_id: uuid (required)
    reason: string (required)
    cascade: boolean (default: true)
    command: TERMINATE | PAUSE | RESUME
  response:
    command_id: uuid
    status: pending | delivered | acknowledged
    issued_at: iso8601

GET /v1/kill-switch/stream:
  headers:
    Authorization: Bearer {identity_token}
  response: # SSE stream
    event: kill-switch
    data: { command_id, command, issued_at, signature }
```

#### SLA Requirements
- Command issuance → Agent receipt: < 5 seconds
- Agent receipt → Termination complete: < 55 seconds
- **Total SLA: < 60 seconds**

---

### AIGOS-MVP-E6: Telemetry & Observability
**Priority:** P1 | **Points:** 21 | **Sprint:** 2

#### User Stories

| Story ID | Title | Points | Acceptance Criteria |
|----------|-------|--------|---------------------|
| E6-S1 | Implement OpenTelemetry SDK integration | 5 | Traces, metrics, logs |
| E6-S2 | Create telemetry ingestion endpoint | 5 | POST /v1/telemetry, batch support |
| E6-S3 | Set up Grafana dashboards | 5 | Policy checks, agent activity, errors |
| E6-S4 | Implement governance event logging | 3 | Audit trail for all decisions |
| E6-S5 | Add alerting rules | 3 | Kill switch, policy violations, errors |

#### Telemetry Event Schema
```typescript
interface GovernanceEvent {
  event_id: string;
  event_type:
    | "agent.registered"
    | "agent.terminated"
    | "policy.checked"
    | "policy.violated"
    | "kill_switch.triggered"
    | "budget.exceeded";
  tenant_id: string;
  agent_id: string;
  timestamp: string;
  data: Record<string, unknown>;
  trace_id?: string;
  span_id?: string;
}
```

---

### AIGOS-MVP-E7: AIGRC Bridge Integration
**Priority:** P1 | **Points:** 13 | **Sprint:** 3

#### User Stories

| Story ID | Title | Points | Acceptance Criteria |
|----------|-------|--------|---------------------|
| E7-S1 | Import @aigrc/core as dependency | 2 | Schemas, validation working |
| E7-S2 | Implement asset card sync | 5 | Fetch cards from AIGRC, cache |
| E7-S3 | Create Golden Thread verification | 3 | Verify hash on registration |
| E7-S4 | Add compliance status check | 3 | Query AIGRC for compliance |

#### Integration Points
```
AIGRC → AIGOS:
1. Asset Cards: Risk classification, capabilities, constraints
2. Golden Thread: Cryptographic business authorization
3. Compliance Status: EU AI Act, NIST, ISO 42001 status
4. Policy Constraints: I2E compiled policies

AIGOS → AIGRC:
1. Runtime Telemetry: Agent behavior, decisions
2. Violations: Policy violations for compliance reporting
3. Agent Registry: Active agents linked to asset cards
```

---

### AIGOS-MVP-E8: Dashboard & Admin UI
**Priority:** P1 | **Points:** 21 | **Sprint:** 3

#### User Stories

| Story ID | Title | Points | Acceptance Criteria |
|----------|-------|--------|---------------------|
| E8-S1 | Create dashboard shell with navigation | 3 | Header, sidebar, routing |
| E8-S2 | Implement agent list view | 5 | Table with status, actions |
| E8-S3 | Create agent detail page | 5 | Identity, capabilities, activity |
| E8-S4 | Add policy management UI | 5 | CRUD policies, rule editor |
| E8-S5 | Implement tenant settings page | 3 | API keys, members, billing |

#### Dashboard Pages
```
/dashboard
├── /overview          # Metrics, active agents, recent events
├── /agents            # Agent list, search, filters
│   └── /[id]          # Agent detail, capabilities, terminate
├── /policies          # Policy list, editor
│   └── /[id]          # Policy detail, rules
├── /kill-switch       # Emergency controls
├── /telemetry         # Grafana embed or native charts
└── /settings
    ├── /api-keys      # Key management
    ├── /team          # Member management
    └── /billing       # Usage, plan
```

---

### AIGOS-MVP-E9: SDK & Developer Experience
**Priority:** P1 | **Points:** 13 | **Sprint:** 3

#### User Stories

| Story ID | Title | Points | Acceptance Criteria |
|----------|-------|--------|---------------------|
| E9-S1 | Create @aigos/sdk-typescript package | 5 | Client, types, utilities |
| E9-S2 | Implement @guard decorator | 3 | Policy check before function |
| E9-S3 | Add kill switch listener | 3 | SSE client, graceful shutdown |
| E9-S4 | Write SDK documentation | 2 | Quick start, API reference |

#### SDK Usage Example
```typescript
import { AigosClient, guard } from "@aigos/sdk";

const aigos = new AigosClient({
  apiKey: process.env.AIGOS_API_KEY,
  assetCardId: "my-agent.aigrc.yaml"
});

// Register agent and get identity
const identity = await aigos.register({
  name: "research-assistant",
  capabilities: {
    tools: ["web_search", "file_read"],
    domains: ["*.company.com"],
    maxBudget: 10.00
  }
});

// Use decorator for automatic policy checks
class ResearchAgent {
  @guard({ tool: "web_search" })
  async search(query: string) {
    // Policy check happens automatically
    return await webSearch(query);
  }
}

// Listen for kill switch
aigos.onKillSwitch((command) => {
  console.log("Received kill switch:", command);
  process.exit(0);
});
```

---

### AIGOS-MVP-E10: Demo & GTM Readiness
**Priority:** P0 | **Points:** 8 | **Sprint:** 3

#### User Stories

| Story ID | Title | Points | Acceptance Criteria |
|----------|-------|--------|---------------------|
| E10-S1 | Create demo script and walkthrough | 2 | 10-minute demo flow |
| E10-S2 | Set up demo environment | 3 | Staging with sample data |
| E10-S3 | Prepare marketing collateral | 2 | Screenshots, feature list |
| E10-S4 | Final integration testing | 1 | End-to-end smoke tests |

#### Demo Scenario
```
1. [2 min] Show dashboard with existing agents
2. [2 min] Register new agent via SDK
3. [2 min] Demonstrate policy check flow
4. [2 min] Trigger kill switch, show < 60s termination
5. [2 min] Show telemetry and compliance status
```

---

## Part 3: Sprint Plan

### Sprint 1: Foundation (Saturday Morning)
**Duration:** 4-6 hours
**Goal:** Platform running with multi-tenancy and agent registration

| Epic | Stories | Points | Owner |
|------|---------|--------|-------|
| E1 | E1-S1 through E1-S6 | 21 | Backend |
| E2 | E2-S1 through E2-S7 | 34 | Backend |
| E3 | E3-S1 through E3-S6 | 21 | Backend |

**Sprint 1 Total:** 76 points

**Definition of Done:**
- [ ] Docker compose starts all services
- [ ] Tenant can be created via API
- [ ] Agent can register and receive JWT
- [ ] API keys working with rate limiting

---

### Sprint 2: Core Services (Saturday Afternoon)
**Duration:** 4-6 hours
**Goal:** Policy engine and kill switch operational

| Epic | Stories | Points | Owner |
|------|---------|--------|-------|
| E4 | E4-S1 through E4-S7 | 34 | Backend |
| E5 | E5-S1 through E5-S6 | 21 | Backend |
| E6 | E6-S1 through E6-S5 | 21 | Backend/DevOps |

**Sprint 2 Total:** 76 points

**Definition of Done:**
- [ ] Policy check returns in < 2ms
- [ ] Kill switch terminates agent in < 60s
- [ ] Telemetry events flowing to storage
- [ ] Basic Grafana dashboard visible

---

### Sprint 3: Integration & Polish (Sunday)
**Duration:** 6-8 hours
**Goal:** GTM-ready with UI and demo

| Epic | Stories | Points | Owner |
|------|---------|--------|-------|
| E7 | E7-S1 through E7-S4 | 13 | Backend |
| E8 | E8-S1 through E8-S5 | 21 | Frontend |
| E9 | E9-S1 through E9-S4 | 13 | SDK |
| E10 | E10-S1 through E10-S4 | 8 | All |

**Sprint 3 Total:** 55 points

**Definition of Done:**
- [ ] AIGRC asset cards sync working
- [ ] Dashboard shows all key views
- [ ] SDK published and documented
- [ ] Demo script rehearsed and working

---

## Part 4: Technical Architecture Decisions

### Technology Stack

| Component | Technology | Rationale |
|-----------|------------|-----------|
| API Framework | Fastify | Performance, TypeScript, plugins |
| Database | PostgreSQL 15 | RLS, JSONB, proven reliability |
| Cache | Redis 7 | Pub/sub for kill switch, caching |
| ORM | Drizzle | Type-safe, lightweight, fast |
| Auth | jose (JWT) | Standard, well-tested |
| Telemetry | OpenTelemetry | Industry standard |
| Dashboard | React + Radix | Matches existing @aigrc/dashboard |
| Deployment | Docker + Fly.io | Fast iteration, global edge |

### Multi-Tenancy Model

**Approach:** Shared database with Row-Level Security (RLS)

**Rationale:**
- Faster to implement than schema-per-tenant
- PostgreSQL RLS provides strong isolation
- Easier operations and migrations
- Suitable for MVP scale

**Data Isolation:**
```sql
-- Set tenant context per request
SET app.tenant_id = 'tenant-uuid';

-- RLS policies enforce isolation
CREATE POLICY tenant_isolation ON agents
  USING (tenant_id = current_setting('app.tenant_id')::uuid);
```

### Authentication Flow

```
1. Tenant Admin → API Key or OAuth → Admin JWT
2. Admin JWT → POST /agents/register → Identity JWT
3. Identity JWT → Policy checks, Kill switch listener
4. Identity JWT → Telemetry submission
```

---

## Part 5: Risk Mitigation

| Risk | Impact | Mitigation |
|------|--------|------------|
| Time constraint | High | Pre-built components, parallel work |
| Database performance | Medium | Connection pooling, query optimization |
| Kill switch latency | High | Redis pub/sub, SSE keep-alive |
| Integration complexity | Medium | Start with AIGRC read-only |
| Demo failure | High | Staging environment, backup plan |

---

## Part 6: Post-MVP Roadmap

### Week 1 Post-Launch
- Production hardening
- Additional compliance profiles
- Improved error handling

### Month 1
- Python SDK
- Capability decay enforcement
- A2A (Agent-to-Agent) trust

### Quarter 1
- Enterprise SSO (SAML, OIDC)
- On-premise deployment option
- SOC 2 Type II preparation

---

## Appendix A: API Endpoint Summary

```
# Platform
GET  /health
GET  /v1/info

# Tenants
POST /v1/tenants
GET  /v1/tenants/:id
PUT  /v1/tenants/:id

# API Keys
POST /v1/api-keys
GET  /v1/api-keys
DELETE /v1/api-keys/:id

# Agents
POST /v1/agents/register
GET  /v1/agents
GET  /v1/agents/:id
DELETE /v1/agents/:id
POST /v1/agents/:id/heartbeat

# Policies
POST /v1/policies
GET  /v1/policies
GET  /v1/policies/:id
PUT  /v1/policies/:id
DELETE /v1/policies/:id
POST /v1/policies/check

# Kill Switch
POST /v1/kill-switch/trigger
GET  /v1/kill-switch/stream (SSE)
GET  /v1/kill-switch/commands

# Telemetry
POST /v1/telemetry
GET  /v1/telemetry/events

# AIGRC Bridge
GET  /v1/aigrc/asset-cards
POST /v1/aigrc/verify-golden-thread
GET  /v1/aigrc/compliance/:assetId
```

---

## Appendix B: Environment Variables

```bash
# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/aigos
DATABASE_POOL_SIZE=20

# Redis
REDIS_URL=redis://localhost:6379

# Auth
JWT_SECRET=your-secret-key
JWT_ISSUER=aigos.dev
JWT_EXPIRY=1h

# AIGRC Integration
AIGRC_API_URL=https://api.aigrc.dev
AIGRC_API_KEY=aigrc_sk_live_xxx

# Telemetry
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4317

# Rate Limiting
DEFAULT_RATE_LIMIT_RPM=60
DEFAULT_RATE_LIMIT_RPH=1000
```

---

*Document maintained by AIGOS Engineering Team*
*Last updated: January 28, 2026*
