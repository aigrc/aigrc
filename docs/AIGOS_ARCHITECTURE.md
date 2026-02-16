# AIGOS End-to-End System Architecture

**Document Version:** 1.0
**Created:** January 28, 2026
**Status:** GTM MVP Architecture

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [Architecture Layers](#2-architecture-layers)
3. [Component Architecture](#3-component-architecture)
4. [Data Flows](#4-data-flows)
5. [Multi-Tenancy Architecture](#5-multi-tenancy-architecture)
6. [AIGRC Integration](#6-aigrc-integration)
7. [Security Architecture](#7-security-architecture)
8. [Deployment Architecture](#8-deployment-architecture)

---

## 1. System Overview

### 1.1 The Governance Continuum

AIGOS operates as the **Kinetic (Runtime) Governance** layer, complementing AIGRC's **Static Governance** layer:

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                         THE GOVERNANCE CONTINUUM                                 │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│   DESIGN      DEVELOP       BUILD        DEPLOY       OPERATE                   │
│     ↓           ↓            ↓            ↓            ↓                        │
│   ┌───┐      ┌───┐        ┌───┐        ┌───┐        ┌───┐                      │
│   │MCP│      │IDE│        │ CI│        │REG│        │RUN│                      │
│   │SRV│      │CLI│        │/CD│        │STR│        │TME│                      │
│   └───┘      └───┘        └───┘        └───┘        └───┘                      │
│     │          │            │            │            │                         │
│   "What's   "What AI    "Is it      "Is it       "Is it                        │
│   allowed?"  exists?"   compliant?" approved?"   behaving?"                    │
│                                                                                  │
│   ├──────────── AIGRC (Static) ────────────┤  ├──── AIGOS (Kinetic) ────────►  │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### 1.2 High-Level System Architecture

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              AIGOS PLATFORM                                      │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  ┌────────────────────────────────────────────────────────────────────────────┐ │
│  │                           EXTERNAL INTERFACES                               │ │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐     │ │
│  │  │ REST API │  │    SSE   │  │WebSocket │  │  Grafana │  │Dashboard │     │ │
│  │  │  /v1/*   │  │  Stream  │  │   (WS)   │  │  Metrics │  │   UI     │     │ │
│  │  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘     │ │
│  └───────┼─────────────┼─────────────┼─────────────┼─────────────┼───────────┘ │
│          │             │             │             │             │              │
│  ┌───────▼─────────────▼─────────────▼─────────────▼─────────────▼───────────┐ │
│  │                         API GATEWAY LAYER                                  │ │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐   │ │
│  │  │ Rate Limiter │  │  Auth/AuthZ  │  │ Tenant Ctx   │  │   Routing    │   │ │
│  │  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘   │ │
│  └───────────────────────────────────────────────────────────────────────────┘ │
│                                       │                                         │
│  ┌────────────────────────────────────▼──────────────────────────────────────┐ │
│  │                          CORE SERVICES LAYER                               │ │
│  │                                                                            │ │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐       │ │
│  │  │   Agent     │  │   Policy    │  │ Kill Switch │  │  Telemetry  │       │ │
│  │  │  Registry   │  │   Engine    │  │   Service   │  │   Service   │       │ │
│  │  │             │  │             │  │             │  │             │       │ │
│  │  │ • Register  │  │ • Evaluate  │  │ • Trigger   │  │ • Ingest    │       │ │
│  │  │ • Heartbeat │  │ • Cache     │  │ • Stream    │  │ • Store     │       │ │
│  │  │ • Lineage   │  │ • Inherit   │  │ • Cascade   │  │ • Query     │       │ │
│  │  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘       │ │
│  │         │                │                │                │               │ │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐       │ │
│  │  │   Tenant    │  │   AIGRC     │  │  Billing    │  │  Alerting   │       │ │
│  │  │  Service    │  │   Bridge    │  │  Service    │  │   Service   │       │ │
│  │  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘       │ │
│  └─────────┼────────────────┼────────────────┼────────────────┼──────────────┘ │
│            │                │                │                │                 │
│  ┌─────────▼────────────────▼────────────────▼────────────────▼──────────────┐ │
│  │                          DATA LAYER                                        │ │
│  │  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐         │ │
│  │  │    PostgreSQL    │  │      Redis       │  │   TimescaleDB    │         │ │
│  │  │                  │  │                  │  │   (Telemetry)    │         │ │
│  │  │  • Tenants       │  │  • Policy Cache  │  │                  │         │ │
│  │  │  • Agents        │  │  • Sessions      │  │  • Events        │         │ │
│  │  │  • Policies      │  │  • Kill Switch   │  │  • Metrics       │         │ │
│  │  │  • API Keys      │  │    Pub/Sub       │  │  • Traces        │         │ │
│  │  └──────────────────┘  └──────────────────┘  └──────────────────┘         │ │
│  └───────────────────────────────────────────────────────────────────────────┘ │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
                                       │
                                       │ AIGRC Integration
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              AIGRC PLATFORM                                      │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐          │
│  │  @aigrc  │  │  @aigrc  │  │  @aigrc  │  │  @aigrc  │  │  @aigrc  │          │
│  │  /core   │  │  /mcp    │  │  /cli    │  │/i2e-*    │  │/dashboard│          │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘  └──────────┘          │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Architecture Layers

### 2.1 Layer Definitions

| Layer | Purpose | Components |
|-------|---------|------------|
| **External Interfaces** | Client communication | REST API, SSE, WebSocket, Dashboard |
| **API Gateway** | Cross-cutting concerns | Auth, Rate Limiting, Tenant Context |
| **Core Services** | Business logic | Agent Registry, Policy Engine, Kill Switch, Telemetry |
| **Support Services** | Auxiliary functions | Tenant, AIGRC Bridge, Billing, Alerting |
| **Data Layer** | Persistence | PostgreSQL, Redis, TimescaleDB |

### 2.2 Package Architecture

```
@aigos/
├── platform-api/          # Main API server
│   ├── src/
│   │   ├── server.ts      # Fastify server setup
│   │   ├── routes/        # API route handlers
│   │   ├── services/      # Business logic
│   │   ├── middleware/    # Auth, tenant, rate limit
│   │   ├── db/            # Drizzle schemas, queries
│   │   └── utils/         # Helpers
│   └── package.json
│
├── sdk/                   # Client SDKs
│   ├── typescript/        # @aigos/sdk
│   └── python/            # aigos-sdk (future)
│
├── dashboard/             # Admin UI
│   ├── src/
│   │   ├── pages/
│   │   ├── components/
│   │   └── hooks/
│   └── package.json
│
└── runtime/               # Agent runtime (existing)
    └── src/
        ├── identity.ts
        ├── policy-engine.ts
        ├── kill-switch.ts
        └── telemetry.ts
```

---

## 3. Component Architecture

### 3.1 Agent Registry Service

```
┌─────────────────────────────────────────────────────────────────┐
│                    AGENT REGISTRY SERVICE                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────────┐    ┌──────────────────┐                   │
│  │  Registration    │    │    Heartbeat     │                   │
│  │    Handler       │    │    Handler       │                   │
│  │                  │    │                  │                   │
│  │  • Validate req  │    │  • Update last   │                   │
│  │  • Check tenant  │    │    seen          │                   │
│  │  • Create agent  │    │  • Update status │                   │
│  │  • Issue JWT     │    │  • Extend TTL    │                   │
│  └────────┬─────────┘    └────────┬─────────┘                   │
│           │                       │                              │
│           ▼                       ▼                              │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │                    Identity Manager                          ││
│  │                                                              ││
│  │  • Generate RuntimeIdentity JWT                              ││
│  │  • Encode capabilities in claims                             ││
│  │  • Include Golden Thread hash                                ││
│  │  • Track lineage (parent_id, depth)                          ││
│  └─────────────────────────────────────────────────────────────┘│
│           │                                                      │
│           ▼                                                      │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │                    Agent Repository                          ││
│  │                                                              ││
│  │  PostgreSQL Tables:                                          ││
│  │  • agents (id, tenant_id, name, status, capabilities...)    ││
│  │  • agent_lineage (agent_id, parent_id, depth)               ││
│  │  • agent_sessions (agent_id, token_jti, expires_at)         ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 3.2 Policy Engine Service

```
┌─────────────────────────────────────────────────────────────────┐
│                     POLICY ENGINE SERVICE                        │
│                     "The Bouncer"                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │                    EVALUATION CHAIN                          ││
│  │                    (Short-Circuit)                           ││
│  │                                                              ││
│  │  ┌─────────┐   ┌─────────┐   ┌─────────┐   ┌─────────┐     ││
│  │  │  Kill   │──▶│Capability│──▶│ Budget  │──▶│ Domain  │     ││
│  │  │ Switch  │   │  Check  │   │  Check  │   │  Check  │     ││
│  │  │  O(1)   │   │  O(n)   │   │  O(1)   │   │  O(m)   │     ││
│  │  └────┬────┘   └────┬────┘   └────┬────┘   └────┬────┘     ││
│  │       │             │             │             │           ││
│  │       ▼             ▼             ▼             ▼           ││
│  │    DENY?         DENY?         DENY?         DENY?         ││
│  │       │             │             │             │           ││
│  │       └─────────────┴─────────────┴─────────────┘           ││
│  │                          │                                   ││
│  │                          ▼                                   ││
│  │                   ┌─────────────┐                           ││
│  │                   │   Custom    │                           ││
│  │                   │   Rules     │                           ││
│  │                   │   O(r)      │                           ││
│  │                   └──────┬──────┘                           ││
│  │                          │                                   ││
│  │                          ▼                                   ││
│  │                   ALLOW / DENY                               ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
│  Performance Requirements:                                       │
│  • P50 latency: < 0.5ms                                         │
│  • P99 latency: < 2ms                                           │
│  • Cache hit ratio: > 95%                                       │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │                    CACHING LAYER                             ││
│  │                                                              ││
│  │  Redis Keys:                                                 ││
│  │  • policy:{tenant_id}:{agent_id} → Compiled policy          ││
│  │  • budget:{tenant_id}:{agent_id}:{period} → Usage           ││
│  │  • killswitch:{tenant_id}:{agent_id} → Active?              ││
│  │                                                              ││
│  │  TTL: 60 seconds (policies), 0 (kill switch - no cache)     ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 3.3 Kill Switch Service

```
┌─────────────────────────────────────────────────────────────────┐
│                    KILL SWITCH SERVICE                           │
│                    SLA: < 60 seconds                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │                   COMMAND FLOW                               ││
│  │                                                              ││
│  │   Admin                                                      ││
│  │     │                                                        ││
│  │     ▼                                                        ││
│  │  ┌──────────────┐                                           ││
│  │  │ POST /kill-  │  1. Validate admin permission             ││
│  │  │ switch/      │  2. Create signed command                  ││
│  │  │ trigger      │  3. Store in DB + Redis                    ││
│  │  └──────┬───────┘  4. Publish to channel                    ││
│  │         │                                                    ││
│  │         ▼                                                    ││
│  │  ┌──────────────┐                                           ││
│  │  │    Redis     │  Channel: killswitch:{tenant_id}          ││
│  │  │   Pub/Sub    │                                           ││
│  │  └──────┬───────┘                                           ││
│  │         │                                                    ││
│  │         ▼ Fan-out to all subscribers                        ││
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      ││
│  │  │  SSE Client  │  │  SSE Client  │  │  SSE Client  │      ││
│  │  │   Agent 1    │  │   Agent 2    │  │   Agent N    │      ││
│  │  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘      ││
│  │         │                 │                 │                ││
│  │         ▼                 ▼                 ▼                ││
│  │      Verify            Verify            Verify             ││
│  │      Signature         Signature         Signature          ││
│  │         │                 │                 │                ││
│  │         ▼                 ▼                 ▼                ││
│  │      Execute           Execute           Execute            ││
│  │      TERMINATE         IGNORE            IGNORE             ││
│  │      (if match)        (no match)        (no match)         ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
│  Command Types:                                                  │
│  • TERMINATE - Immediate shutdown                                │
│  • PAUSE - Suspend operations                                    │
│  • RESUME - Resume after pause                                   │
│                                                                  │
│  Cascade Behavior:                                               │
│  • cascade: true → Terminate agent + all descendants            │
│  • cascade: false → Terminate only target agent                 │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │                  COMMAND STRUCTURE                           ││
│  │                                                              ││
│  │  {                                                           ││
│  │    "command_id": "uuid",                                     ││
│  │    "command": "TERMINATE",                                   ││
│  │    "target_agent_id": "uuid",                                ││
│  │    "cascade": true,                                          ││
│  │    "reason": "Policy violation detected",                    ││
│  │    "issued_by": "admin@company.com",                         ││
│  │    "issued_at": "2026-01-28T12:00:00Z",                      ││
│  │    "signature": "base64-encoded-signature",                  ││
│  │    "nonce": "random-string-for-replay-prevention"            ││
│  │  }                                                           ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 3.4 Telemetry Service

```
┌─────────────────────────────────────────────────────────────────┐
│                    TELEMETRY SERVICE                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │                   INGESTION PIPELINE                         ││
│  │                                                              ││
│  │   Agents (SDK)                                               ││
│  │       │                                                      ││
│  │       ▼                                                      ││
│  │  ┌──────────────┐                                           ││
│  │  │ POST /v1/    │  • Batch events (up to 100)               ││
│  │  │ telemetry    │  • Validate schema                         ││
│  │  │              │  • Inject tenant context                   ││
│  │  └──────┬───────┘                                           ││
│  │         │                                                    ││
│  │         ▼                                                    ││
│  │  ┌──────────────┐                                           ││
│  │  │   Event      │  • Enrich with metadata                   ││
│  │  │   Processor  │  • Detect anomalies                        ││
│  │  │              │  • Trigger alerts                          ││
│  │  └──────┬───────┘                                           ││
│  │         │                                                    ││
│  │         ├──────────────┬──────────────┐                     ││
│  │         ▼              ▼              ▼                     ││
│  │  ┌────────────┐ ┌────────────┐ ┌────────────┐              ││
│  │  │TimescaleDB │ │  Grafana   │ │  Alerting  │              ││
│  │  │  (Store)   │ │ (Metrics)  │ │  (Notify)  │              ││
│  │  └────────────┘ └────────────┘ └────────────┘              ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
│  Event Types:                                                    │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │  agent.registered    │ Agent started                        ││
│  │  agent.terminated    │ Agent stopped                        ││
│  │  policy.checked      │ Permission evaluated                 ││
│  │  policy.violated     │ Action denied                        ││
│  │  policy.allowed      │ Action permitted                     ││
│  │  budget.consumed     │ Budget usage                         ││
│  │  budget.exceeded     │ Budget limit hit                     ││
│  │  kill_switch.received│ Command received                     ││
│  │  kill_switch.executed│ Termination complete                 ││
│  │  error.occurred      │ Runtime error                        ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
│  OpenTelemetry Semantic Conventions:                             │
│  • aigos.agent.id                                                │
│  • aigos.agent.name                                              │
│  • aigos.tenant.id                                               │
│  • aigos.policy.decision                                         │
│  • aigos.policy.latency_ms                                       │
│  • aigos.budget.remaining                                        │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 4. Data Flows

### 4.1 Agent Registration Flow

```
┌─────────┐     ┌─────────┐     ┌─────────┐     ┌─────────┐     ┌─────────┐
│  Agent  │     │   API   │     │ Agent   │     │  AIGRC  │     │   DB    │
│  (SDK)  │     │ Gateway │     │ Registry│     │ Bridge  │     │         │
└────┬────┘     └────┬────┘     └────┬────┘     └────┬────┘     └────┬────┘
     │               │               │               │               │
     │  1. POST /agents/register     │               │               │
     │  {name, asset_card_id, caps}  │               │               │
     │──────────────▶│               │               │               │
     │               │               │               │               │
     │               │ 2. Validate   │               │               │
     │               │    API Key    │               │               │
     │               │    Extract    │               │               │
     │               │    Tenant     │               │               │
     │               │──────────────▶│               │               │
     │               │               │               │               │
     │               │               │ 3. If asset_card_id present   │
     │               │               │──────────────▶│               │
     │               │               │               │               │
     │               │               │               │ 4. Fetch card │
     │               │               │               │    Verify GT  │
     │               │               │◀──────────────│               │
     │               │               │  {card, golden_thread_valid}  │
     │               │               │               │               │
     │               │               │ 5. Create agent record        │
     │               │               │──────────────────────────────▶│
     │               │               │               │               │
     │               │               │ 6. Generate RuntimeIdentity   │
     │               │               │    JWT with claims            │
     │               │               │               │               │
     │               │◀──────────────│               │               │
     │◀──────────────│ 7. {agent_id, identity_token, expires_at}    │
     │               │               │               │               │
     │  8. Store token locally       │               │               │
     │     Start heartbeat           │               │               │
     │     Connect to kill switch    │               │               │
     │               │               │               │               │
```

### 4.2 Policy Check Flow

```
┌─────────┐     ┌─────────┐     ┌─────────┐     ┌─────────┐     ┌─────────┐
│  Agent  │     │   API   │     │ Policy  │     │  Redis  │     │   DB    │
│  (SDK)  │     │ Gateway │     │ Engine  │     │ (Cache) │     │         │
└────┬────┘     └────┬────┘     └────┬────┘     └────┬────┘     └────┬────┘
     │               │               │               │               │
     │  1. POST /policies/check      │               │               │
     │  Authorization: Bearer {jwt}  │               │               │
     │  {action, resource, context}  │               │               │
     │──────────────▶│               │               │               │
     │               │               │               │               │
     │               │ 2. Verify JWT │               │               │
     │               │    Extract    │               │               │
     │               │    agent_id   │               │               │
     │               │──────────────▶│               │               │
     │               │               │               │               │
     │               │               │ 3. Check kill switch          │
     │               │               │──────────────▶│               │
     │               │               │◀──────────────│ (O(1))        │
     │               │               │               │               │
     │               │               │ 4. Load cached policy         │
     │               │               │──────────────▶│               │
     │               │               │◀──────────────│               │
     │               │               │               │               │
     │               │               │ [Cache miss?]                 │
     │               │               │───────────────────────────────▶
     │               │               │◀───────────────────────────────
     │               │               │               │               │
     │               │               │ 5. Evaluate chain             │
     │               │               │    • Capability check         │
     │               │               │    • Budget check             │
     │               │               │    • Domain check             │
     │               │               │    • Custom rules             │
     │               │               │               │               │
     │               │               │ 6. Update budget if allowed   │
     │               │               │──────────────▶│               │
     │               │               │               │               │
     │               │◀──────────────│               │               │
     │◀──────────────│ 7. {allowed, reason, latency_ms}             │
     │               │               │               │               │
     │  8. Execute action if allowed │               │               │
     │     or handle denial          │               │               │
     │               │               │               │               │

Total Latency Target: < 2ms P99
```

### 4.3 Kill Switch Flow

```
┌─────────┐     ┌─────────┐     ┌─────────┐     ┌─────────┐     ┌─────────┐
│  Admin  │     │   API   │     │  Kill   │     │  Redis  │     │ Agents  │
│  (UI)   │     │ Gateway │     │ Switch  │     │ Pub/Sub │     │  (SSE)  │
└────┬────┘     └────┬────┘     └────┬────┘     └────┬────┘     └────┬────┘
     │               │               │               │               │
     │  1. POST /kill-switch/trigger │               │               │
     │  {agent_id, reason, cascade}  │               │               │
     │──────────────▶│               │               │               │
     │               │               │               │               │
     │               │ 2. Verify     │               │               │
     │               │    admin role │               │               │
     │               │──────────────▶│               │               │
     │               │               │               │               │
     │               │               │ 3. Create command             │
     │               │               │    Sign with key              │
     │               │               │    Add nonce                  │
     │               │               │               │               │
     │               │               │ 4. Store in DB (audit)        │
     │               │               │               │               │
     │               │               │ 5. Publish to Redis           │
     │               │               │──────────────▶│               │
     │               │               │               │               │
     │               │               │               │ 6. Fan-out    │
     │               │               │               │──────────────▶│
     │               │               │               │  to all       │
     │               │               │               │  subscribers  │
     │               │               │               │               │
     │               │               │               │     Agents receive:
     │               │               │               │     - Verify signature
     │               │               │               │     - Check target_id
     │               │               │               │     - Execute if match
     │               │               │               │               │
     │               │◀──────────────│               │               │
     │◀──────────────│ 7. {command_id, status: pending}             │
     │               │               │               │               │
     │               │               │               │     8. Agent ACKs
     │               │               │               │◀──────────────│
     │               │               │◀──────────────│               │
     │               │               │               │               │
     │               │               │ 9. Update status: acknowledged│
     │               │               │               │               │

SLA Timeline:
├─ 0s:  Command issued
├─ <1s: Published to Redis
├─ <5s: Delivered to agents via SSE
├─ <60s: Agent terminated + ACK received
```

### 4.4 AIGRC Integration Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        AIGRC ← → AIGOS INTEGRATION                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │                    AIGRC → AIGOS (Inbound)                            │   │
│  │                                                                       │   │
│  │   Asset Cards                 Policies                 Golden Thread  │   │
│  │       │                          │                          │         │   │
│  │       ▼                          ▼                          ▼         │   │
│  │  ┌──────────┐            ┌──────────────┐           ┌──────────────┐ │   │
│  │  │ Risk     │            │ I2E Compiled │           │ Cryptographic│ │   │
│  │  │ Level    │            │ Constraints  │           │ Hash         │ │   │
│  │  │ Caps     │            │              │           │              │ │   │
│  │  │ Metadata │            │ • Vendors    │           │ ticket_id    │ │   │
│  │  └────┬─────┘            │ • Models     │           │ approved_by  │ │   │
│  │       │                  │ • Regions    │           │ approved_at  │ │   │
│  │       │                  └──────┬───────┘           └──────┬───────┘ │   │
│  │       │                         │                          │         │   │
│  │       └─────────────────────────┼──────────────────────────┘         │   │
│  │                                 │                                     │   │
│  │                                 ▼                                     │   │
│  │                    ┌────────────────────────┐                        │   │
│  │                    │     AIGRC Bridge       │                        │   │
│  │                    │                        │                        │   │
│  │                    │  • Sync asset cards    │                        │   │
│  │                    │  • Import policies     │                        │   │
│  │                    │  • Verify Golden Thread│                        │   │
│  │                    │  • Map compliance      │                        │   │
│  │                    └───────────┬────────────┘                        │   │
│  │                                │                                     │   │
│  │                                ▼                                     │   │
│  │                    ┌────────────────────────┐                        │   │
│  │                    │   AIGOS Policy Engine  │                        │   │
│  │                    │                        │                        │   │
│  │                    │  Enforce at runtime    │                        │   │
│  │                    └────────────────────────┘                        │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │                    AIGOS → AIGRC (Outbound)                           │   │
│  │                                                                       │   │
│  │  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐           │   │
│  │  │  Telemetry   │    │  Violations  │    │ Agent Status │           │   │
│  │  │   Events     │    │   Reports    │    │   Registry   │           │   │
│  │  └──────┬───────┘    └──────┬───────┘    └──────┬───────┘           │   │
│  │         │                   │                   │                    │   │
│  │         └───────────────────┼───────────────────┘                    │   │
│  │                             │                                        │   │
│  │                             ▼                                        │   │
│  │                    ┌────────────────────────┐                        │   │
│  │                    │    AIGRC Dashboard     │                        │   │
│  │                    │                        │                        │   │
│  │                    │  • Compliance reports  │                        │   │
│  │                    │  • Audit evidence      │                        │   │
│  │                    │  • Runtime visibility  │                        │   │
│  │                    └────────────────────────┘                        │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 5. Multi-Tenancy Architecture

### 5.1 Isolation Model

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       MULTI-TENANCY ARCHITECTURE                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────────┐│
│  │                        TENANT ISOLATION LAYERS                           ││
│  │                                                                          ││
│  │  Layer 1: API Gateway                                                    ││
│  │  ┌─────────────────────────────────────────────────────────────────────┐││
│  │  │  • API Key validation → tenant_id extraction                        │││
│  │  │  • JWT validation → tenant_id in claims                             │││
│  │  │  • Rate limiting per tenant                                          │││
│  │  │  • Request logging with tenant context                               │││
│  │  └─────────────────────────────────────────────────────────────────────┘││
│  │                                                                          ││
│  │  Layer 2: Application Context                                            ││
│  │  ┌─────────────────────────────────────────────────────────────────────┐││
│  │  │  • TenantContext injected into every request                        │││
│  │  │  • All queries scoped to tenant_id                                   │││
│  │  │  • Redis keys namespaced: {tenant_id}:{key}                         │││
│  │  │  • Pub/Sub channels: killswitch:{tenant_id}                         │││
│  │  └─────────────────────────────────────────────────────────────────────┘││
│  │                                                                          ││
│  │  Layer 3: Database (Row-Level Security)                                  ││
│  │  ┌─────────────────────────────────────────────────────────────────────┐││
│  │  │  SET app.tenant_id = 'uuid';  -- Per connection                     │││
│  │  │                                                                      │││
│  │  │  CREATE POLICY tenant_isolation ON agents                            │││
│  │  │    USING (tenant_id = current_setting('app.tenant_id')::uuid);      │││
│  │  │                                                                      │││
│  │  │  -- Applied to: agents, policies, api_keys, telemetry, etc.         │││
│  │  └─────────────────────────────────────────────────────────────────────┘││
│  │                                                                          ││
│  └─────────────────────────────────────────────────────────────────────────┘│
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────────┐│
│  │                        TENANT DATA MODEL                                 ││
│  │                                                                          ││
│  │  tenants                                                                 ││
│  │  ├── id (PK)                                                            ││
│  │  ├── name                                                                ││
│  │  ├── slug (unique)                                                       ││
│  │  ├── plan_tier (free | starter | professional | enterprise)             ││
│  │  ├── settings (JSONB)                                                    ││
│  │  ├── created_at                                                          ││
│  │  └── updated_at                                                          ││
│  │       │                                                                  ││
│  │       ├── api_keys (1:N)                                                ││
│  │       │   ├── key_hash, key_prefix                                      ││
│  │       │   ├── scopes, rate_limit_rpm                                    ││
│  │       │   └── expires_at, last_used_at                                  ││
│  │       │                                                                  ││
│  │       ├── agents (1:N)                                                  ││
│  │       │   ├── name, status, capabilities                                ││
│  │       │   └── asset_card_id, golden_thread                              ││
│  │       │                                                                  ││
│  │       ├── policies (1:N)                                                ││
│  │       │   ├── name, rules, priority                                     ││
│  │       │   └── applies_to (agent_ids or *)                               ││
│  │       │                                                                  ││
│  │       └── usage_records (1:N)                                           ││
│  │           ├── period, metric, value                                     ││
│  │           └── (for billing)                                              ││
│  │                                                                          ││
│  └─────────────────────────────────────────────────────────────────────────┘│
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────────┐│
│  │                        PLAN TIERS & LIMITS                               ││
│  │                                                                          ││
│  │  ┌──────────┬──────────┬──────────┬──────────┬──────────┐              ││
│  │  │          │   Free   │ Starter  │   Pro    │Enterprise│              ││
│  │  ├──────────┼──────────┼──────────┼──────────┼──────────┤              ││
│  │  │ Agents   │    5     │    25    │   100    │ Unlimited│              ││
│  │  │ Policies │    3     │    10    │    50    │ Unlimited│              ││
│  │  │ API Keys │    2     │     5    │    20    │ Unlimited│              ││
│  │  │ RPM      │   60     │   300    │  1000    │  Custom  │              ││
│  │  │ Retention│  7 days  │ 30 days  │ 90 days  │  1 year  │              ││
│  │  │ SSO      │    ✗     │    ✗     │    ✗     │    ✓     │              ││
│  │  │ SLA      │   None   │   None   │  99.9%   │  99.99%  │              ││
│  │  │ Price    │   $0     │  $99/mo  │ $499/mo  │  Custom  │              ││
│  │  └──────────┴──────────┴──────────┴──────────┴──────────┘              ││
│  │                                                                          ││
│  └─────────────────────────────────────────────────────────────────────────┘│
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 5.2 Tenant Context Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        TENANT CONTEXT PROPAGATION                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   Request                                                                    │
│      │                                                                       │
│      ▼                                                                       │
│   ┌──────────────────────────────────────────────────────────────────────┐  │
│   │  1. API Key Middleware                                                │  │
│   │                                                                       │  │
│   │  const apiKey = request.headers['x-api-key'];                        │  │
│   │  const keyRecord = await validateApiKey(apiKey);                     │  │
│   │  request.tenantId = keyRecord.tenant_id;                             │  │
│   │  request.scopes = keyRecord.scopes;                                  │  │
│   └───────────────────────────────┬──────────────────────────────────────┘  │
│                                   │                                          │
│                                   ▼                                          │
│   ┌──────────────────────────────────────────────────────────────────────┐  │
│   │  2. Tenant Context Middleware                                         │  │
│   │                                                                       │  │
│   │  const tenant = await getTenant(request.tenantId);                   │  │
│   │  request.tenant = {                                                  │  │
│   │    id: tenant.id,                                                    │  │
│   │    slug: tenant.slug,                                                │  │
│   │    plan: tenant.plan_tier,                                           │  │
│   │    limits: getPlanLimits(tenant.plan_tier)                           │  │
│   │  };                                                                   │  │
│   └───────────────────────────────┬──────────────────────────────────────┘  │
│                                   │                                          │
│                                   ▼                                          │
│   ┌──────────────────────────────────────────────────────────────────────┐  │
│   │  3. Database Context                                                  │  │
│   │                                                                       │  │
│   │  // Set RLS context for this connection                              │  │
│   │  await db.execute(sql`SET app.tenant_id = ${request.tenantId}`);     │  │
│   │                                                                       │  │
│   │  // All subsequent queries automatically filtered                     │  │
│   │  const agents = await db.select().from(agents);                      │  │
│   │  // → WHERE tenant_id = {request.tenantId} (implicit)                │  │
│   └───────────────────────────────┬──────────────────────────────────────┘  │
│                                   │                                          │
│                                   ▼                                          │
│   ┌──────────────────────────────────────────────────────────────────────┐  │
│   │  4. Redis Namespace                                                   │  │
│   │                                                                       │  │
│   │  // Keys namespaced by tenant                                        │  │
│   │  const cacheKey = `${request.tenantId}:policy:${agentId}`;           │  │
│   │  const pubsubChannel = `killswitch:${request.tenantId}`;             │  │
│   └──────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 6. AIGRC Integration

### 6.1 Integration Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        AIGRC INTEGRATION ARCHITECTURE                        │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │                         AIGRC PACKAGES                                │   │
│  │                                                                       │   │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐             │   │
│  │  │ @aigrc/  │  │ @aigrc/  │  │ @aigrc/  │  │ @aigrc/  │             │   │
│  │  │  core    │  │   mcp    │  │ i2e-*    │  │dashboard │             │   │
│  │  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘             │   │
│  │       │             │             │             │                    │   │
│  │       │  Schemas    │  MCP API    │  Policies   │  UI                │   │
│  │       │  Detection  │  Tools      │  Firewall   │  Components        │   │
│  │       │  Golden     │  Resources  │             │                    │   │
│  │       │  Thread     │             │             │                    │   │
│  └───────┼─────────────┼─────────────┼─────────────┼────────────────────┘   │
│          │             │             │             │                        │
│          └─────────────┴──────┬──────┴─────────────┘                        │
│                               │                                              │
│                               ▼                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │                         AIGRC BRIDGE                                  │   │
│  │                    (@aigos/platform-api)                              │   │
│  │                                                                       │   │
│  │  ┌────────────────────────────────────────────────────────────────┐  │   │
│  │  │  AssetCardSync                                                  │  │   │
│  │  │                                                                 │  │   │
│  │  │  • fetchAssetCards(tenant_id) → AssetCard[]                    │  │   │
│  │  │  • getAssetCard(asset_card_id) → AssetCard                     │  │   │
│  │  │  • syncFromAIGRC() → void (periodic sync)                      │  │   │
│  │  │                                                                 │  │   │
│  │  │  Caching: Redis with 5-minute TTL                              │  │   │
│  │  └────────────────────────────────────────────────────────────────┘  │   │
│  │                                                                       │   │
│  │  ┌────────────────────────────────────────────────────────────────┐  │   │
│  │  │  GoldenThreadVerifier                                           │  │   │
│  │  │                                                                 │  │   │
│  │  │  • verifyGoldenThread(asset_card) → boolean                    │  │   │
│  │  │  • computeHash(ticket_id, approved_by, approved_at) → string   │  │   │
│  │  │  • checkExpiry(golden_thread) → boolean                        │  │   │
│  │  │                                                                 │  │   │
│  │  │  Uses: @aigrc/core golden-thread module                        │  │   │
│  │  └────────────────────────────────────────────────────────────────┘  │   │
│  │                                                                       │   │
│  │  ┌────────────────────────────────────────────────────────────────┐  │   │
│  │  │  PolicyImporter                                                 │  │   │
│  │  │                                                                 │  │   │
│  │  │  • importFromGovernanceLock(lock_file) → Policy[]              │  │   │
│  │  │  • mapConstraintsToRules(constraints) → PolicyRule[]           │  │   │
│  │  │  • syncPolicies(tenant_id) → void                              │  │   │
│  │  │                                                                 │  │   │
│  │  │  Uses: @aigrc/i2e-firewall for constraint types                │  │   │
│  │  └────────────────────────────────────────────────────────────────┘  │   │
│  │                                                                       │   │
│  │  ┌────────────────────────────────────────────────────────────────┐  │   │
│  │  │  ComplianceChecker                                              │  │   │
│  │  │                                                                 │  │   │
│  │  │  • checkCompliance(agent_id) → ComplianceStatus                │  │   │
│  │  │  • getRequiredArtifacts(risk_level) → string[]                 │  │   │
│  │  │  • generateAuditEvidence(agent_id) → AuditPackage              │  │   │
│  │  │                                                                 │  │   │
│  │  │  Uses: @aigrc/core classification, compliance                  │  │   │
│  │  └────────────────────────────────────────────────────────────────┘  │   │
│  │                                                                       │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 6.2 Data Mapping

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        AIGRC ↔ AIGOS DATA MAPPING                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────────────────────┐    ┌─────────────────────────────┐        │
│  │      AIGRC Asset Card       │    │      AIGOS Agent            │        │
│  ├─────────────────────────────┤    ├─────────────────────────────┤        │
│  │ metadata.name          ─────┼───▶│ name                        │        │
│  │ metadata.namespace     ─────┼───▶│ namespace                   │        │
│  │ metadata.labels.risk   ─────┼───▶│ risk_level                  │        │
│  │                              │    │                             │        │
│  │ spec.type              ─────┼───▶│ type                        │        │
│  │ spec.framework         ─────┼───▶│ framework                   │        │
│  │ spec.version           ─────┼───▶│ version                     │        │
│  │                              │    │                             │        │
│  │ spec.goldenThread.hash ─────┼───▶│ golden_thread_hash          │        │
│  │ spec.goldenThread.      │    │    │ golden_thread_verified      │        │
│  │   ticketId            ─────┼───▶│ ticket_id                   │        │
│  │                              │    │                             │        │
│  │ spec.riskFactors       ─────┼───▶│ risk_factors (JSONB)        │        │
│  │ spec.constraints       ─────┼───▶│ constraints (JSONB)         │        │
│  │                              │    │                             │        │
│  │ spec.classifications   ─────┼───▶│ classifications (JSONB)     │        │
│  │   eu-ai-act.level           │    │   eu_ai_act_level           │        │
│  │   nist.trustworthiness      │    │   nist_trustworthiness      │        │
│  └─────────────────────────────┘    └─────────────────────────────┘        │
│                                                                              │
│  ┌─────────────────────────────┐    ┌─────────────────────────────┐        │
│  │   AIGRC governance.lock     │    │      AIGOS Policy           │        │
│  ├─────────────────────────────┤    ├─────────────────────────────┤        │
│  │ constraints.vendors    ─────┼───▶│ rules[].vendor_allowlist    │        │
│  │ constraints.models     ─────┼───▶│ rules[].model_allowlist     │        │
│  │ constraints.regions    ─────┼───▶│ rules[].region_allowlist    │        │
│  │                              │    │                             │        │
│  │ source.type            ─────┼───▶│ source_type                 │        │
│  │ source.path            ─────┼───▶│ source_path                 │        │
│  │ source.hash            ─────┼───▶│ source_hash                 │        │
│  │                              │    │                             │        │
│  │ expires                ─────┼───▶│ expires_at                  │        │
│  └─────────────────────────────┘    └─────────────────────────────┘        │
│                                                                              │
│  ┌─────────────────────────────┐    ┌─────────────────────────────┐        │
│  │   AIGOS Telemetry Event     │    │      AIGRC Compliance       │        │
│  ├─────────────────────────────┤    ├─────────────────────────────┤        │
│  │ policy.checked         ─────┼───▶│ audit_evidence[]            │        │
│  │ policy.violated        ─────┼───▶│ violation_records[]         │        │
│  │ agent.terminated       ─────┼───▶│ incident_reports[]          │        │
│  │ budget.exceeded        ─────┼───▶│ usage_reports[]             │        │
│  └─────────────────────────────┘    └─────────────────────────────┘        │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 7. Security Architecture

### 7.1 Authentication & Authorization

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        SECURITY ARCHITECTURE                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │                    AUTHENTICATION FLOWS                               │   │
│  │                                                                       │   │
│  │  1. API Key Authentication (M2M)                                      │   │
│  │  ┌─────────────────────────────────────────────────────────────────┐ │   │
│  │  │  Client → API Key Header → Validate → Extract tenant → Proceed  │ │   │
│  │  │                                                                  │ │   │
│  │  │  Format: aigrc_sk_{env}_{32_random_bytes_base64}                │ │   │
│  │  │  Storage: key_hash (SHA-256), key_prefix (first 12 chars)       │ │   │
│  │  └─────────────────────────────────────────────────────────────────┘ │   │
│  │                                                                       │   │
│  │  2. RuntimeIdentity JWT (Agent Auth)                                  │   │
│  │  ┌─────────────────────────────────────────────────────────────────┐ │   │
│  │  │  Agent → Bearer Token → Verify signature → Extract claims       │ │   │
│  │  │                                                                  │ │   │
│  │  │  Claims:                                                         │ │   │
│  │  │  • iss: "aigos.dev"                                             │ │   │
│  │  │  • sub: agent_id                                                │ │   │
│  │  │  • aud: tenant_id                                               │ │   │
│  │  │  • aigos:capabilities: {tools, domains, max_budget}             │ │   │
│  │  │  • aigos:golden_thread: {hash, ticket_id, verified}             │ │   │
│  │  └─────────────────────────────────────────────────────────────────┘ │   │
│  │                                                                       │   │
│  │  3. Admin Authentication (Dashboard)                                  │   │
│  │  ┌─────────────────────────────────────────────────────────────────┐ │   │
│  │  │  User → OAuth/SSO → Session → Admin JWT → Access control        │ │   │
│  │  │                                                                  │ │   │
│  │  │  Roles: owner, admin, member, viewer                            │ │   │
│  │  └─────────────────────────────────────────────────────────────────┘ │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │                    AUTHORIZATION MATRIX                               │   │
│  │                                                                       │   │
│  │  ┌───────────────┬────────┬────────┬────────┬────────┐              │   │
│  │  │ Resource      │ Owner  │ Admin  │ Member │ Agent  │              │   │
│  │  ├───────────────┼────────┼────────┼────────┼────────┤              │   │
│  │  │ Tenant        │ CRUD   │ RU     │ R      │ -      │              │   │
│  │  │ API Keys      │ CRUD   │ CRUD   │ R      │ -      │              │   │
│  │  │ Agents        │ CRUD   │ CRUD   │ RU     │ Self   │              │   │
│  │  │ Policies      │ CRUD   │ CRUD   │ R      │ R      │              │   │
│  │  │ Kill Switch   │ ✓      │ ✓      │ -      │ -      │              │   │
│  │  │ Telemetry     │ R      │ R      │ R      │ Write  │              │   │
│  │  │ Billing       │ CRUD   │ R      │ -      │ -      │              │   │
│  │  └───────────────┴────────┴────────┴────────┴────────┘              │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │                    SECURITY CONTROLS                                  │   │
│  │                                                                       │   │
│  │  • TLS 1.3 for all communications                                    │   │
│  │  • API keys hashed with SHA-256 (never stored plain)                 │   │
│  │  • JWT signed with RS256 (asymmetric)                                │   │
│  │  • Kill switch commands signed + nonce for replay prevention         │   │
│  │  • Rate limiting per tenant (Redis-based)                            │   │
│  │  • Audit logging for all sensitive operations                        │   │
│  │  • Row-level security in PostgreSQL                                  │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 8. Deployment Architecture

### 8.1 Infrastructure Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        DEPLOYMENT ARCHITECTURE                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │                         PRODUCTION (Fly.io)                           │   │
│  │                                                                       │   │
│  │   Internet                                                            │   │
│  │      │                                                                │   │
│  │      ▼                                                                │   │
│  │  ┌──────────────────────────────────────────────────────────────┐    │   │
│  │  │                    Fly.io Edge (Global)                       │    │   │
│  │  │  • Anycast routing                                            │    │   │
│  │  │  • TLS termination                                            │    │   │
│  │  │  • DDoS protection                                            │    │   │
│  │  └──────────────────────────┬───────────────────────────────────┘    │   │
│  │                             │                                         │   │
│  │                             ▼                                         │   │
│  │  ┌──────────────────────────────────────────────────────────────┐    │   │
│  │  │              AIGOS API (Multi-Region)                         │    │   │
│  │  │                                                               │    │   │
│  │  │   ┌─────────┐    ┌─────────┐    ┌─────────┐                  │    │   │
│  │  │   │ Region  │    │ Region  │    │ Region  │                  │    │   │
│  │  │   │  iad    │    │  lhr    │    │  nrt    │                  │    │   │
│  │  │   │ (US)    │    │ (EU)    │    │ (Asia)  │                  │    │   │
│  │  │   │         │    │         │    │         │                  │    │   │
│  │  │   │ 2 VMs   │    │ 2 VMs   │    │ 2 VMs   │                  │    │   │
│  │  │   └────┬────┘    └────┬────┘    └────┬────┘                  │    │   │
│  │  │        │              │              │                        │    │   │
│  │  └────────┼──────────────┼──────────────┼────────────────────────┘    │   │
│  │           │              │              │                             │   │
│  │           └──────────────┼──────────────┘                             │   │
│  │                          │                                            │   │
│  │                          ▼                                            │   │
│  │  ┌──────────────────────────────────────────────────────────────┐    │   │
│  │  │                   DATA LAYER                                  │    │   │
│  │  │                                                               │    │   │
│  │  │  ┌─────────────────┐  ┌─────────────────┐  ┌──────────────┐  │    │   │
│  │  │  │   PostgreSQL    │  │     Redis       │  │  TimescaleDB │  │    │   │
│  │  │  │   (Fly.io)      │  │   (Upstash)     │  │   (Managed)  │  │    │   │
│  │  │  │                 │  │                 │  │              │  │    │   │
│  │  │  │  Primary: iad   │  │  Global replicas│  │  Telemetry   │  │    │   │
│  │  │  │  Replicas: lhr, │  │  Low-latency    │  │  data        │  │    │   │
│  │  │  │           nrt   │  │  pub/sub        │  │              │  │    │   │
│  │  │  └─────────────────┘  └─────────────────┘  └──────────────┘  │    │   │
│  │  │                                                               │    │   │
│  │  └──────────────────────────────────────────────────────────────┘    │   │
│  │                                                                       │   │
│  │  ┌──────────────────────────────────────────────────────────────┐    │   │
│  │  │                   OBSERVABILITY                               │    │   │
│  │  │                                                               │    │   │
│  │  │  ┌─────────────────┐  ┌─────────────────┐  ┌──────────────┐  │    │   │
│  │  │  │    Grafana      │  │    Jaeger       │  │   PagerDuty  │  │    │   │
│  │  │  │   (Metrics)     │  │   (Traces)      │  │   (Alerts)   │  │    │   │
│  │  │  └─────────────────┘  └─────────────────┘  └──────────────┘  │    │   │
│  │  │                                                               │    │   │
│  │  └──────────────────────────────────────────────────────────────┘    │   │
│  │                                                                       │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │                         LOCAL DEVELOPMENT                             │   │
│  │                                                                       │   │
│  │   docker-compose.yml:                                                 │   │
│  │   ┌─────────────────────────────────────────────────────────────┐    │   │
│  │   │  services:                                                   │    │   │
│  │   │    api:                                                      │    │   │
│  │   │      build: .                                                │    │   │
│  │   │      ports: ["3000:3000"]                                   │    │   │
│  │   │      depends_on: [postgres, redis]                          │    │   │
│  │   │                                                              │    │   │
│  │   │    postgres:                                                 │    │   │
│  │   │      image: postgres:15                                      │    │   │
│  │   │      ports: ["5432:5432"]                                   │    │   │
│  │   │                                                              │    │   │
│  │   │    redis:                                                    │    │   │
│  │   │      image: redis:7                                          │    │   │
│  │   │      ports: ["6379:6379"]                                   │    │   │
│  │   │                                                              │    │   │
│  │   │    grafana:                                                  │    │   │
│  │   │      image: grafana/grafana                                  │    │   │
│  │   │      ports: ["3001:3000"]                                   │    │   │
│  │   └─────────────────────────────────────────────────────────────┘    │   │
│  │                                                                       │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 8.2 Environment Configuration

```yaml
# Production Environment
AIGOS_ENV: production
AIGOS_API_URL: https://api.aigos.dev

# Database
DATABASE_URL: postgres://...@aigos-db.fly.dev:5432/aigos
DATABASE_POOL_SIZE: 20
DATABASE_SSL: true

# Redis
REDIS_URL: rediss://...@global-magical-redis.upstash.io:6379

# Auth
JWT_PRIVATE_KEY: /secrets/jwt-private.pem
JWT_PUBLIC_KEY: /secrets/jwt-public.pem
JWT_ISSUER: aigos.dev
JWT_EXPIRY: 1h

# AIGRC Integration
AIGRC_API_URL: https://api.aigrc.dev
AIGRC_SYNC_INTERVAL: 300000  # 5 minutes

# Telemetry
OTEL_EXPORTER_OTLP_ENDPOINT: https://otel.aigos.dev
OTEL_SERVICE_NAME: aigos-api

# Rate Limiting
RATE_LIMIT_ENABLED: true
RATE_LIMIT_WINDOW_MS: 60000
```

---

## Appendix A: Database Schema

```sql
-- Core Tables
CREATE TABLE tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(63) UNIQUE NOT NULL,
  plan_tier VARCHAR(50) DEFAULT 'free',
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
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

CREATE TABLE agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  status VARCHAR(50) DEFAULT 'active',
  asset_card_id VARCHAR(255),
  golden_thread_hash VARCHAR(64),
  golden_thread_verified BOOLEAN DEFAULT false,
  capabilities JSONB DEFAULT '{}',
  risk_level VARCHAR(50),
  classifications JSONB DEFAULT '{}',
  metadata JSONB DEFAULT '{}',
  last_seen_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE agent_lineage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID REFERENCES agents(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES agents(id),
  depth INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  rules JSONB NOT NULL DEFAULT '[]',
  priority INTEGER DEFAULT 0,
  applies_to TEXT[] DEFAULT '{}',  -- agent_ids or ['*']
  source_type VARCHAR(50),  -- 'manual', 'aigrc', 'i2e'
  source_hash VARCHAR(64),
  enabled BOOLEAN DEFAULT true,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE kill_switch_commands (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id),
  target_agent_id UUID REFERENCES agents(id),
  command VARCHAR(50) NOT NULL,  -- TERMINATE, PAUSE, RESUME
  reason TEXT,
  cascade BOOLEAN DEFAULT true,
  issued_by VARCHAR(255) NOT NULL,
  signature TEXT NOT NULL,
  nonce VARCHAR(64) NOT NULL UNIQUE,
  status VARCHAR(50) DEFAULT 'pending',
  acknowledged_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE telemetry_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  agent_id UUID,
  event_type VARCHAR(100) NOT NULL,
  event_data JSONB NOT NULL,
  trace_id VARCHAR(32),
  span_id VARCHAR(16),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_agents_tenant ON agents(tenant_id);
CREATE INDEX idx_agents_status ON agents(tenant_id, status);
CREATE INDEX idx_policies_tenant ON policies(tenant_id);
CREATE INDEX idx_telemetry_tenant_type ON telemetry_events(tenant_id, event_type);
CREATE INDEX idx_telemetry_agent ON telemetry_events(agent_id);
CREATE INDEX idx_telemetry_created ON telemetry_events(created_at DESC);

-- Row Level Security
ALTER TABLE agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE kill_switch_commands ENABLE ROW LEVEL SECURITY;
ALTER TABLE telemetry_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_agents ON agents
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid);

CREATE POLICY tenant_isolation_policies ON policies
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid);

CREATE POLICY tenant_isolation_api_keys ON api_keys
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid);

CREATE POLICY tenant_isolation_kill_switch ON kill_switch_commands
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid);

CREATE POLICY tenant_isolation_telemetry ON telemetry_events
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid);
```

---

## Appendix B: API Reference Summary

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/health` | GET | None | Health check |
| `/v1/tenants` | POST | Admin | Create tenant |
| `/v1/tenants/:id` | GET/PUT | API Key | Get/update tenant |
| `/v1/api-keys` | POST/GET | API Key | Manage API keys |
| `/v1/agents/register` | POST | API Key | Register agent |
| `/v1/agents` | GET | API Key | List agents |
| `/v1/agents/:id` | GET/DELETE | API Key | Get/delete agent |
| `/v1/agents/:id/heartbeat` | POST | JWT | Agent heartbeat |
| `/v1/policies` | CRUD | API Key | Manage policies |
| `/v1/policies/check` | POST | JWT | Check permission |
| `/v1/kill-switch/trigger` | POST | Admin | Trigger kill switch |
| `/v1/kill-switch/stream` | GET | JWT | SSE stream |
| `/v1/telemetry` | POST | JWT | Submit events |
| `/v1/aigrc/asset-cards` | GET | API Key | List asset cards |
| `/v1/aigrc/verify-golden-thread` | POST | API Key | Verify GT |

---

*Document maintained by AIGOS Engineering Team*
*Last updated: January 28, 2026*
