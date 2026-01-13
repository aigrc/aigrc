# AIGOS Kinetic Governance Overview

## Document Information

| Field | Value |
|-------|-------|
| **Spec ID** | AIGOS-L3-OVERVIEW |
| **Version** | 1.0.0-draft |
| **Status** | Draft |
| **Layer** | Layer 3: Kinetic Governance |
| **Last Updated** | 2025-12-29 |
| **Authors** | Saye Maitalnd Davies |
| **License** | Apache 2.0 |

---

## Abstract

This document provides an architectural overview of AIGOS Kinetic Governance—the runtime enforcement layer of the AI Governance Operating System. While AIGRC (Layer 2) governs what AI systems *should* do through documentation and CI/CD gates, AIGOS (Layer 3) verifies what AI systems *actually* do at runtime through identity verification, policy enforcement, telemetry, and remote control.

---

## 1. Introduction

### 1.1 The Governance Paradox

Static governance creates a fundamental paradox:

> **Static governance documents intent. Runtime behavior may diverge.**

An AI agent may be perfectly documented with an Asset Card classifying it as "Limited Risk" with restrictions on tool usage. But at runtime, nothing prevents that agent from:

- Executing tools it shouldn't have access to
- Accessing domains outside its approved scope
- Spawning child agents with elevated permissions
- Continuing to operate after authorization is revoked

Kinetic Governance solves this by enforcing governance rules at runtime.

### 1.2 The Governance Continuum

AIGOS completes the Governance Continuum:

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                           THE GOVERNANCE CONTINUUM                                       │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                         │
│   DESIGN        DEVELOP        BUILD          DEPLOY         OPERATE                   │
│   ──────        ───────        ─────          ──────         ───────                   │
│                                                                                         │
│   ┌─────────┐   ┌─────────┐   ┌─────────┐   ┌─────────┐   ┌─────────┐                 │
│   │   MCP   │   │  IDE +  │   │ GitHub  │   │  Asset  │   │ Runtime │                 │
│   │ Server  │ → │   CLI   │ → │ Action  │ → │Registry │ → │   SDK   │                 │
│   └─────────┘   └─────────┘   └─────────┘   └─────────┘   └─────────┘                 │
│                                                                                         │
│   "What's        "What AI      "Is it         "Is it        "Is it                     │
│    allowed?"      exists?"      compliant?"    approved?"    behaving?"                │
│                                                                                         │
│   ◄──────────── AIGRC (Static) ────────────►  ◄─── AIGOS (Kinetic) ──►                │
│                                                                                         │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

### 1.3 Design Philosophy

AIGOS follows three core principles:

1. **Verification Over Trust**
   - Don't trust that agents follow rules—verify they do
   - Cryptographic proof of authorization (Golden Thread)
   - Real-time telemetry of governance decisions

2. **Minimal Latency Impact**
   - Policy checks MUST complete in < 2ms
   - Telemetry MUST be non-blocking (async)
   - No network calls in the hot path

3. **Graceful Degradation**
   - Dry-run mode for building trust
   - Configurable fail-open vs fail-secure
   - Clear error messages for policy violations

---

## 2. Architecture

### 2.1 Component Overview

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                           @aigos/runtime ARCHITECTURE                                    │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                         │
│   ┌─────────────────────────────────────────────────────────────────────────────────┐  │
│   │                              APPLICATION LAYER                                   │  │
│   │                                                                                  │  │
│   │   ┌──────────────┐    ┌──────────────┐    ┌──────────────┐                      │  │
│   │   │   @guard     │    │ agent.trace  │    │  AigosAgent  │                      │  │
│   │   │  decorator   │    │   _action()  │    │    class     │                      │  │
│   │   └──────┬───────┘    └──────┬───────┘    └──────┬───────┘                      │  │
│   │          │                   │                   │                               │  │
│   └──────────┼───────────────────┼───────────────────┼───────────────────────────────┘  │
│              │                   │                   │                                  │
│              └───────────────────┼───────────────────┘                                  │
│                                  │                                                      │
│   ┌──────────────────────────────┼──────────────────────────────────────────────────┐  │
│   │                              ▼                    CORE LAYER                     │  │
│   │                                                                                  │  │
│   │   ┌──────────────────────────────────────────────────────────────────────────┐  │  │
│   │   │                         SPEC-RT-002                                       │  │  │
│   │   │                      Identity Manager                                     │  │  │
│   │   │                                                                           │  │  │
│   │   │   • RuntimeIdentity creation                                              │  │  │
│   │   │   • Golden Thread verification                                            │  │  │
│   │   │   • Lineage tracking                                                      │  │  │
│   │   └──────────────────────────────────────────────────────────────────────────┘  │  │
│   │                                  │                                              │  │
│   │                                  ▼                                              │  │
│   │   ┌──────────────────────────────────────────────────────────────────────────┐  │  │
│   │   │                         SPEC-RT-003                                       │  │  │
│   │   │                        Policy Engine                                      │  │  │
│   │   │                                                                           │  │  │
│   │   │   • Permission evaluation (< 2ms)           ┌─────────────────────────┐  │  │  │
│   │   │   • Capability checking                     │      SPEC-RT-006        │  │  │  │
│   │   │   • Resource validation              ◄──────│   Capability Decay      │  │  │  │
│   │   │   • Budget enforcement                      │                         │  │  │  │
│   │   │                                             └─────────────────────────┘  │  │  │
│   │   └──────────────────────────────────────────────────────────────────────────┘  │  │
│   │                                  │                                              │  │
│   │              ┌───────────────────┼───────────────────┐                          │  │
│   │              ▼                   ▼                   ▼                          │  │
│   │   ┌──────────────────┐ ┌──────────────────┐ ┌──────────────────┐               │  │
│   │   │   SPEC-RT-004    │ │   SPEC-RT-005    │ │   Policy Loader  │               │  │
│   │   │    Telemetry     │ │   Kill Switch    │ │   (from .aigrc)  │               │  │
│   │   │    Emitter       │ │                  │ │                  │               │  │
│   │   └────────┬─────────┘ └────────┬─────────┘ └──────────────────┘               │  │
│   │            │                    │                                               │  │
│   └────────────┼────────────────────┼───────────────────────────────────────────────┘  │
│                │                    │                                                   │
│                ▼                    ▼                                                   │
│   ┌────────────────────┐ ┌────────────────────┐                                        │
│   │   OTel Collector   │ │   Control Plane    │                                        │
│   │   (Datadog/Grafana)│ │   (SSE/Polling)    │                                        │
│   └────────────────────┘ └────────────────────┘                                        │
│                                                                                         │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

### 2.2 Component Specifications

| Spec ID | Component | Purpose | Priority |
|---------|-----------|---------|----------|
| SPEC-RT-001 | Runtime SDK Overview | This document | — |
| SPEC-RT-002 | Identity Manager | Cryptographic identity and lineage | P0 |
| SPEC-RT-003 | Policy Engine | Permission evaluation | P0 |
| SPEC-RT-004 | Telemetry Emitter | OTel governance traces | P0 |
| SPEC-RT-005 | Kill Switch | Remote termination | P1 |
| SPEC-RT-006 | Capability Decay | Child permission limits | P1 |
| SPEC-RT-007 | Sidecar Proxy | Framework-agnostic deployment | P2 |

### 2.3 Dependency Graph

```
                              SPEC-RT-001
                          Runtime SDK Overview
                                  │
                  ┌───────────────┼───────────────┐
                  │               │               │
                  ▼               ▼               ▼
           ┌───────────┐   ┌───────────┐   ┌───────────┐
           │ SPEC-RT   │   │ SPEC-RT   │   │ SPEC-RT   │
           │ -002      │   │ -003      │   │ -004      │
           │ Identity  │   │ Policy    │   │ Telemetry │
           │ Manager   │   │ Engine    │   │ Emitter   │
           └─────┬─────┘   └─────┬─────┘   └───────────┘
                 │               │               ▲
                 │               │               │
                 │         ┌─────┴─────┐         │
                 │         │           │         │
                 │         ▼           ▼         │
                 │   ┌───────────┐ ┌───────────┐ │
                 │   │ SPEC-RT   │ │ SPEC-RT   │ │
                 │   │ -005      │ │ -006      │ │
                 │   │ Kill      │ │ Capability│ │
                 │   │ Switch    │ │ Decay     │ │
                 │   └───────────┘ └───────────┘ │
                 │                               │
                 └───────────────────────────────┘

   EXTERNAL DEPENDENCIES
   ─────────────────────
   SPEC-FMT-002 (Asset Card) ◄─── SPEC-RT-002
   SPEC-PRT-001 (Golden Thread) ◄─── SPEC-RT-002
   SPEC-PRT-002 (OTel Conventions) ◄─── SPEC-RT-004
```

---

## 3. Data Flow

### 3.1 Initialization Flow

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                              INITIALIZATION FLOW                                         │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                         │
│   1. Agent Startup                                                                      │
│      │                                                                                  │
│      ▼                                                                                  │
│   2. Load .aigrc/cards/{asset}.yaml                                                     │
│      │                                                                                  │
│      ▼                                                                                  │
│   3. Identity Manager creates RuntimeIdentity                                           │
│      │                                                                                  │
│      ├──► Compute golden_thread_hash                                                    │
│      │    sha256(jira_ticket + approved_at + approver_signature)                        │
│      │                                                                                  │
│      ├──► Verify against Asset Card                                                     │
│      │    If mismatch → SANDBOX mode (restricted)                                       │
│      │                                                                                  │
│      └──► Load capabilities_manifest                                                    │
│           {allowed_tools, denied_domains, max_budget, ...}                              │
│      │                                                                                  │
│      ▼                                                                                  │
│   4. Policy Engine initialized with capabilities                                        │
│      │                                                                                  │
│      ▼                                                                                  │
│   5. Telemetry Emitter sends identity span                                              │
│      │                                                                                  │
│      ▼                                                                                  │
│   6. Kill Switch listener starts (background)                                           │
│      │                                                                                  │
│      ▼                                                                                  │
│   7. Agent ready for operations                                                         │
│                                                                                         │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

### 3.2 Runtime Enforcement Flow

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                           RUNTIME ENFORCEMENT FLOW                                       │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                         │
│   Agent Code                                                                            │
│   ──────────                                                                            │
│   @guard(action="tool_call", resource="web_search")                                     │
│   async def search(query: str):                                                         │
│       ...                                                                               │
│                                                                                         │
│   Execution Flow                                                                        │
│   ──────────────                                                                        │
│                                                                                         │
│   1. @guard intercepts call                                                             │
│      │                                                                                  │
│      ▼                                                                                  │
│   2. Policy Engine evaluates                                                            │
│      │                                                                                  │
│      ├── Check: Kill switch active?                                                     │
│      │   └── If yes → raise AgentTerminatedException                                    │
│      │                                                                                  │
│      ├── Check: Action in allowed_tools?                                                │
│      │   └── If no → log violation, raise AigosPolicyViolation                          │
│      │                                                                                  │
│      ├── Check: Resource matches denied_domains?                                        │
│      │   └── If yes → log violation, raise AigosPolicyViolation                         │
│      │                                                                                  │
│      └── Check: Budget exceeded?                                                        │
│          └── If yes → log violation, raise AigosBudgetExceeded                          │
│      │                                                                                  │
│      ▼                                                                                  │
│   3. Telemetry Emitter records decision                                                 │
│      │                                                                                  │
│      ├── Span: aigos.governance.decision                                                │
│      │   Attributes: asset_id, action, resource, result=ALLOWED                         │
│      │                                                                                  │
│      └── (If violation) Span: aigos.governance.violation                                │
│          Attributes: asset_id, action, resource, reason                                 │
│      │                                                                                  │
│      ▼                                                                                  │
│   4. If ALLOWED: Execute original function                                              │
│      If BLOCKED: Exception propagates to caller                                         │
│                                                                                         │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 4. Integration with Static Governance

### 4.1 The Bridge: .aigrc Files

Static governance (AIGRC) and Kinetic governance (AIGOS) share the same configuration:

```
.aigrc/
├── .aigrc.yaml              # Read by CLI, Action, AND Runtime SDK
├── cards/
│   └── my-agent.yaml        # Asset Card → RuntimeIdentity.asset_id
├── policies/
│   └── production.yaml      # Policy → PolicyEngine.capabilities
└── signatures/
    └── production.yaml.sig  # Signature → verified at startup
```

### 4.2 Golden Thread Continuity

The Golden Thread established at BUILD time is verified at OPERATE time:

```
BUILD TIME (GitHub Action)                 OPERATE TIME (Runtime SDK)
──────────────────────────                 ─────────────────────────

1. Asset Card created                      1. Agent starts
   id: fin-agent-001                          loads fin-agent-001.yaml

2. Jira ticket linked                      2. Identity Manager extracts
   golden_thread:                             golden_thread.jira_ticket
     jira_ticket: FIN-1234
     approved_by: ciso@corp.com
     approved_at: 2025-01-15

3. GitHub Action computes hash             3. SDK recomputes hash
   hash = sha256(FIN-1234 +                   hash' = sha256(FIN-1234 +
          2025-01-15 +                               2025-01-15 +
          signature)                                  signature)

4. Hash stored in .aigrc                   4. SDK verifies hash == hash'
   golden_thread_hash: abc123...              If mismatch → SANDBOX mode
```

---

## 5. Developer API

### 5.1 TypeScript SDK

```typescript
import { AigosAgent, guard } from '@aigos/runtime';

// Initialize agent with identity
const agent = new AigosAgent({
  assetId: 'fin-agent-001',
  configPath: '.aigrc/cards/fin-agent-001.yaml',
});

// Method 1: Decorator
class MyAgent {
  @guard({ action: 'tool_call', resource: 'web_search' })
  async search(query: string): Promise<string> {
    return await webSearch(query);
  }
}

// Method 2: Manual check
async function processRequest(req: Request) {
  const allowed = await agent.checkPermission({
    action: 'api_call',
    resource: 'https://api.example.com',
  });
  
  if (!allowed) {
    throw new Error('Permission denied by governance policy');
  }
  
  // ... proceed
}

// Method 3: Tracing context
await agent.traceAction('llm_inference', { model: 'gpt-4' }, async () => {
  const result = await openai.chat.completions.create({...});
  return result;
});
```

### 5.2 Python SDK

```python
from aigos import AigosAgent, guard

# Initialize agent with identity
agent = AigosAgent(
    asset_id='fin-agent-001',
    config_path='.aigrc/cards/fin-agent-001.yaml',
)

# Method 1: Decorator
@guard(action='tool_call', resource='web_search')
async def search(query: str) -> str:
    return await web_search(query)

# Method 2: Manual check
async def process_request(req: Request):
    allowed = await agent.check_permission(
        action='api_call',
        resource='https://api.example.com',
    )
    
    if not allowed:
        raise AigosPolicyViolation('Permission denied')
    
    # ... proceed

# Method 3: Context manager
async with agent.trace_action('llm_inference', model='gpt-4'):
    result = await openai.chat.completions.create(...)
```

---

## 6. Performance Requirements

### 6.1 Latency Budgets

| Operation | Target | Maximum | Notes |
|-----------|--------|---------|-------|
| Initialization | < 50ms | 100ms | Config load + identity creation |
| Policy check | < 2ms | 5ms | In-memory evaluation |
| Telemetry emit | 0ms (async) | — | Non-blocking |
| Kill switch poll | N/A | 60s | Background thread |

### 6.2 Memory Footprint

| Component | Target | Maximum |
|-----------|--------|---------|
| Runtime SDK total | < 25MB | 50MB |
| Policy cache | < 5MB | 10MB |
| Telemetry buffer | < 10MB | 20MB |

### 6.3 Benchmark Comparison

```
LLM inference time:     500-2000ms
Network roundtrip:      50-200ms
Policy check (AIGOS):   1-2ms        ← 0.1-0.4% overhead
Telemetry emit:         0ms (async)  ← No overhead
```

---

## 7. Conformance

See [CONFORMANCE.md](../CONFORMANCE.md) for AIGOS conformance levels.

| Level | Requirements Summary |
|-------|---------------------|
| **Level 1** | Identity, basic policy, identity trace |
| **Level 2** | Golden Thread verification, decision traces, dry-run |
| **Level 3** | Kill switch, capability decay, all OTel conventions |

---

## 8. Security Considerations

### 8.1 Threat Model

| Threat | Mitigation |
|--------|------------|
| Policy tampering | Signed policy files (RSA/ECDSA) |
| Identity spoofing | Golden Thread hash verification |
| Privilege escalation | Capability Decay (children ⊆ parent) |
| Rogue agent | Kill Switch (< 60s termination) |
| Telemetry interception | TLS for OTLP export |

### 8.2 Trust Boundaries

```
TRUSTED                              UNTRUSTED
────────                              ─────────
.aigrc files (signed)                 Agent code (may be buggy)
Golden Thread hash                    User inputs
Kill Switch commands (signed)         External APIs
AIGOS SDK (verified)                  LLM outputs
```

---

## 9. Related Specifications

| Spec | Relationship |
|------|--------------|
| SPEC-FMT-002 | Asset Card Schema (identity source) |
| SPEC-PRT-001 | Golden Thread Protocol (hash computation) |
| SPEC-PRT-002 | OTel Semantic Conventions (telemetry format) |
| SPEC-MCP-001 | MCP Server (runtime status tools) |
| SPEC-INT-001 | Static to Kinetic Bridge |

---

## Appendix A: Changelog

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0-draft | 2025-12-29 | Initial draft |
