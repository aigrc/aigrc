# Level 5: Agentic Governance (AIGOS Runtime)

> **Duration:** 8-12 hours (full track) or modular (2-3 hours per module)
> **Prerequisites:** Level 1-3 complete, Level 4.1 (Developer Track) recommended
> **Target Audience:** Senior Developers, ML Engineers, SREs, Platform Engineers, Security Architects

---

## Overview

Level 5 bridges the gap between **static governance** (AIGRC - documentation, CI/CD gates) and **kinetic governance** (AIGOS - runtime enforcement). This track teaches you to build, deploy, and operate governed AI agents that enforce policies in real-time.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    THE GOVERNANCE CONTINUUM                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   AIGRC (Static)                              AIGOS (Kinetic)               │
│   ─────────────                               ───────────────               │
│   Levels 1-4                                  Level 5                       │
│                                                                             │
│   ┌─────────┐   ┌─────────┐   ┌─────────┐   ┌─────────┐   ┌─────────┐     │
│   │ DESIGN  │ → │ DEVELOP │ → │  BUILD  │ → │ DEPLOY  │ → │ OPERATE │     │
│   └─────────┘   └─────────┘   └─────────┘   └─────────┘   └─────────┘     │
│                                                                             │
│   Asset Cards   IDE Checks    CI/CD Gates   Identity      Policy Engine    │
│   Risk Class    Code Lens     Golden Thread  Creation      Kill Switch     │
│   Policies      Validation    governance.lock Verification  Telemetry      │
│                                                                             │
│   "What SHOULD happen"                       "What IS happening"           │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Why Level 5 Matters

### The Governance Paradox

Traditional AI governance creates documentation that describes intended behavior. But:

> **Documentation describes what SHOULD happen.**
> **Runtime shows what IS happening.**

Without runtime enforcement:
- Agents can exceed their authorized capabilities
- Kill switches don't exist (agents run forever)
- Multi-agent systems escalate privileges
- No audit trail of actual decisions
- Compliance is aspirational, not proven

### What You'll Learn

After completing Level 5, you will be able to:

1. **Build** governed agents with cryptographic identity and policy enforcement
2. **Implement** kill switches with < 60 second response time
3. **Design** multi-agent hierarchies with capability decay
4. **Secure** agent-to-agent communication with governance tokens
5. **Integrate** governance into LangChain, CrewAI, AutoGen, and custom agents
6. **Monitor** agent behavior with governance-specific observability
7. **Harden** agent deployments against attacks
8. **Operate** governed agents in production at scale

---

## Module Overview

| Module | Duration | Focus Area | Key Skills |
|--------|----------|------------|------------|
| **5.1 Runtime Fundamentals** | 2-3 hrs | Identity, Policy Engine, Golden Thread | Build first governed agent |
| **5.2 Kill Switch Operations** | 1.5-2 hrs | Remote termination, SRE procedures | Operate kill switches |
| **5.3 Multi-Agent Architecture** | 2-3 hrs | Hierarchies, capability decay, spawning | Design agent systems |
| **5.4 Agent-to-Agent Trust** | 2-3 hrs | Governance tokens, A2A handshake | Secure agent communication |
| **5.5 Framework Integration** | 2-3 hrs | LangChain, CrewAI, AutoGen adapters | Add governance to existing agents |
| **5.6 Observability & Debugging** | 1.5-2 hrs | OTel, dashboards, tracing | Debug governance issues |
| **5.7 Security Hardening** | 1.5-2 hrs | Attack vectors, penetration testing | Secure agent deployments |
| **5.8 Production Operations** | 2-3 hrs | Scaling, failover, disaster recovery | Run agents in production |

---

## Learning Path

### Recommended Order

```
                    ┌─────────────────────┐
                    │  5.1 Runtime        │
                    │  Fundamentals       │
                    └──────────┬──────────┘
                               │
              ┌────────────────┼────────────────┐
              ▼                ▼                ▼
    ┌─────────────────┐ ┌─────────────┐ ┌─────────────────┐
    │ 5.2 Kill Switch │ │ 5.3 Multi-  │ │ 5.4 A2A Trust   │
    │ Operations      │ │ Agent Arch  │ │                 │
    └────────┬────────┘ └──────┬──────┘ └────────┬────────┘
             │                 │                  │
             └────────────────┬┴──────────────────┘
                              ▼
                    ┌─────────────────────┐
                    │  5.5 Framework      │
                    │  Integration        │
                    └──────────┬──────────┘
                               │
              ┌────────────────┼────────────────┐
              ▼                ▼                ▼
    ┌─────────────────┐ ┌─────────────┐ ┌─────────────────┐
    │ 5.6 Observ-     │ │ 5.7 Security│ │ 5.8 Production  │
    │ ability         │ │ Hardening   │ │ Operations      │
    └─────────────────┘ └─────────────┘ └─────────────────┘
```

### By Role

| Role | Essential Modules | Optional |
|------|-------------------|----------|
| **Senior Developer** | 5.1, 5.3, 5.4, 5.5 | 5.6, 5.7 |
| **ML Engineer** | 5.1, 5.3, 5.5 | 5.4, 5.6 |
| **SRE/Platform** | 5.1, 5.2, 5.6, 5.8 | 5.7 |
| **Security Engineer** | 5.1, 5.4, 5.7 | 5.2, 5.6 |
| **Architect** | All modules | - |

---

## Labs Overview

Each module includes hands-on implementation labs. Here's what you'll build:

### Lab Progression

```
LAB 1: Single Governed Agent
├── Create RuntimeIdentity
├── Initialize PolicyEngine
├── Enforce capability checks
└── Emit governance telemetry

LAB 2: Kill Switch Implementation
├── Set up SSE listener
├── Handle TERMINATE command
├── Handle PAUSE/RESUME
└── Graceful shutdown

LAB 3: Parent-Child Hierarchy
├── Parent agent with full capabilities
├── Spawn child with decayed capabilities
├── Verify capability subset
└── Cascading termination

LAB 4: Multi-Agent Swarm
├── Coordinator agent
├── Worker agents (3+)
├── Task distribution
└── Collective governance

LAB 5: A2A Trust Network
├── Agent A with governance token
├── Agent B with verification
├── Mutual authentication
└── Cross-organization trust

LAB 6: Framework Integration
├── LangChain agent with AIGOS
├── CrewAI crew with governance
├── AutoGen agents with policies
└── Custom framework adapter

LAB 7: Governance Dashboard
├── OTel collector setup
├── Grafana dashboards
├── Alert rules
└── Incident investigation

LAB 8: Security Scenarios
├── Capability escalation attack
├── Token replay attack
├── Policy bypass attempt
└── Kill switch evasion

LAB 9: Production Deployment
├── Kubernetes deployment
├── High availability setup
├── Disaster recovery
└── Chaos engineering
```

---

## Technical Prerequisites

### Required Knowledge

- Python 3.10+ or TypeScript/Node.js 18+
- Async programming (asyncio, Promises)
- Basic cryptography (hashing, signatures, JWT)
- Docker and containerization
- REST APIs and HTTP

### Recommended Knowledge

- OpenTelemetry basics
- Kubernetes fundamentals
- One AI agent framework (LangChain, CrewAI, or AutoGen)
- Message queues (for A2A scenarios)

### Environment Setup

```bash
# Clone the AIGOS SDK
git clone https://github.com/aigrc/aigos-python.git
cd aigos-python

# Create virtual environment
python -m venv venv
source venv/bin/activate  # or `venv\Scripts\activate` on Windows

# Install dependencies
pip install -e ".[dev]"

# Verify installation
python -c "from aigos import GovernedAgent; print('AIGOS ready')"
```

---

## Core Concepts Reference

### AIGOS Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         GOVERNED AGENT ARCHITECTURE                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                        YOUR AGENT CODE                               │   │
│  │   (LangChain / CrewAI / AutoGen / Custom)                           │   │
│  └───────────────────────────────┬─────────────────────────────────────┘   │
│                                  │                                          │
│                                  ▼                                          │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                      AIGOS GOVERNANCE LAYER                          │   │
│  │                                                                      │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐              │   │
│  │  │   Identity   │  │   Policy     │  │  Telemetry   │              │   │
│  │  │   Manager    │  │   Engine     │  │  Emitter     │              │   │
│  │  └──────────────┘  └──────────────┘  └──────────────┘              │   │
│  │                                                                      │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐              │   │
│  │  │ Kill Switch  │  │  Capability  │  │  Governance  │              │   │
│  │  │  Listener    │  │    Decay     │  │   Tokens     │              │   │
│  │  └──────────────┘  └──────────────┘  └──────────────┘              │   │
│  │                                                                      │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Key Components

| Component | Purpose | Spec Reference |
|-----------|---------|----------------|
| **Identity Manager** | Cryptographic agent identity | SPEC-RT-002 |
| **Policy Engine** | Real-time permission checks (< 2ms) | SPEC-RT-003 |
| **Telemetry Emitter** | Governance observability | SPEC-RT-004 |
| **Kill Switch** | Remote termination (< 60s) | SPEC-RT-005 |
| **Capability Decay** | Privilege escalation prevention | SPEC-RT-006 |
| **Golden Thread** | Business authorization proof | SPEC-PRT-001 |
| **Governance Tokens** | A2A mutual authentication | SPEC-PRT-003 |

---

## Certification

### AIGRC Agentic Governance Specialist

**Requirements:**
- Complete all Level 5 modules
- Pass hands-on assessment:
  - Build governed multi-agent system
  - Implement kill switch with < 60s SLA
  - Design A2A trust network
  - Debug governance violation scenario
  - Deploy to production environment

**Assessment Format:**
- 4-hour practical exam
- Scenario-based challenges
- Live system demonstration

---

## Quick Reference

### Essential Commands

```python
# Initialize governed agent
from aigos import GovernedAgent, RuntimeIdentity, PolicyEngine

identity = RuntimeIdentity.create(
    asset_id="my-agent",
    golden_thread=golden_thread
)

policy = PolicyEngine.load("governance.lock")

agent = GovernedAgent(
    identity=identity,
    policy=policy
)

# Check permission before action
if await agent.can("web_search", resource="https://example.com"):
    result = await agent.execute("web_search", url="https://example.com")

# Spawn governed child
child = await agent.spawn(
    asset_id="child-agent",
    capabilities=["read_file"],  # Subset of parent
    budget_usd=1.0
)

# Handle kill switch
@agent.on_terminate
async def cleanup():
    await save_state()
    await notify_coordinator()
```

### Governance Flow

```
1. STARTUP
   └── Create Identity → Verify Golden Thread → Load Policy → Start Kill Switch Listener

2. RUNTIME
   └── Before Action → Check Permission → Log Decision → Execute or Deny

3. SPAWN
   └── Validate Capabilities ⊆ Parent → Create Child Identity → Propagate Lineage

4. TERMINATE
   └── Receive Command → Verify Signature → Cascade to Children → Cleanup → Exit
```

---

## Module Links

1. [5.1 Runtime Governance Fundamentals](./01-runtime-fundamentals.md)
2. [5.2 Kill Switch Operations](./02-kill-switch-operations.md)
3. [5.3 Multi-Agent Architecture](./03-multi-agent-architecture.md)
4. [5.4 Agent-to-Agent Trust](./04-agent-to-agent-trust.md)
5. [5.5 Framework Integration](./05-framework-integration.md)
6. [5.6 Observability & Debugging](./06-observability-debugging.md)
7. [5.7 Security Hardening](./07-security-hardening.md)
8. [5.8 Production Operations](./08-production-operations.md)

---

*Level 5: Agentic Governance - AIGRC Training Program v2.0*
