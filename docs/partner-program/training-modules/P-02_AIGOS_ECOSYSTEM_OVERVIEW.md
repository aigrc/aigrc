# Module P-02: Understanding the AIGOS Ecosystem

## Complete Guide to AIGOS Architecture, Components, and Data Flow

**Module ID:** P-02
**Tier:** Prerequisites
**Duration:** 2-3 hours
**Difficulty:** Beginner
**Prerequisites:** Module P-01 completed
**Last Updated:** 2026-02-16

---

## 1. Module Overview

### 1.1 Purpose & Business Value

Before implementing AIGOS/AIGRC for customers, you must understand:
- How all components fit together
- What data flows where
- Which components are required vs. optional
- How the system creates compliance evidence

**Why This Matters:**
- Proper architecture decisions prevent rework
- Understanding data flow enables troubleshooting
- Component knowledge enables right-sizing solutions
- Clear mental model improves customer communication

### 1.2 Learning Outcomes

By the end of this module, you will be able to:

1. ✓ Explain the AIGOS ecosystem to technical and non-technical audiences
2. ✓ Identify all major components and their purposes
3. ✓ Trace data flow from AI detection to compliance reporting
4. ✓ Determine which components a customer needs
5. ✓ Understand the relationship between AIGRC and AIGOS

---

## 2. The Big Picture

### 2.1 What Problem Does AIGOS Solve?

```
THE CHALLENGE
═════════════════════════════════════════════════════════════════════════════

Organizations are deploying AI everywhere:

┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐
│  Customer   │  │   HR Hiring │  │   Medical   │  │   Fraud     │
│  Chatbots   │  │   Screening │  │  Diagnosis  │  │  Detection  │
└─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘

But they can't answer critical questions:

  ❓ Where is AI being used in our organization?
  ❓ Which AI systems are high-risk?
  ❓ Are we compliant with EU AI Act?
  ❓ Can we prove our AI is governed during an audit?
  ❓ How do we stop an AI that goes wrong?

THE SOLUTION: AIGOS
═════════════════════════════════════════════════════════════════════════════

AIGOS provides "Kinetic Governance" - active, continuous AI oversight:

┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│  ✓ DISCOVER    - Find all AI systems automatically                        │
│  ✓ DOCUMENT    - Create governance records (Asset Cards)                  │
│  ✓ ASSESS      - Classify by risk level                                   │
│  ✓ ENFORCE     - Block non-compliant AI from deploying                    │
│  ✓ MONITOR     - Real-time governance for running AI                      │
│  ✓ EVIDENCE    - Continuous audit trail                                   │
│  ✓ RESPOND     - Kill switch for emergencies                              │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 2.2 AIGRC vs. AIGOS: Understanding the Relationship

This is a common point of confusion. Let's clarify:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    AIGRC vs. AIGOS RELATIONSHIP                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  AIGRC (AI Governance, Risk, and Compliance)                               │
│  ═════════════════════════════════════════════                             │
│  The "what" - core governance capabilities                                  │
│                                                                             │
│  • Open-source libraries and tools                                         │
│  • Detection engine, policy engine, schemas                                │
│  • CLI, VS Code extension, GitHub Actions                                  │
│  • Can be used standalone (no cloud required)                              │
│                                                                             │
│  Think of it as: The engine and components                                 │
│                                                                             │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                             │
│  AIGOS (AI Governance Operating System)                                    │
│  ════════════════════════════════════════                                   │
│  The "how" - complete operational platform                                  │
│                                                                             │
│  • Control Plane (Dashboard, API, Analytics)                               │
│  • Certificate Authority (CGA certification)                               │
│  • Runtime governance (real-time policy enforcement)                       │
│  • Enterprise features (SSO, audit, reporting)                             │
│                                                                             │
│  Think of it as: The complete vehicle, ready to drive                      │
│                                                                             │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                             │
│  RELATIONSHIP:                                                              │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                         AIGOS Platform                              │   │
│  │  ┌───────────────────────────────────────────────────────────────┐  │   │
│  │  │                        AIGRC Core                             │  │   │
│  │  │  (Detection, Policies, Asset Cards, CLI, Integrations)       │  │   │
│  │  └───────────────────────────────────────────────────────────────┘  │   │
│  │  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────┐  │   │
│  │  │  Control Plane  │  │  CA Service     │  │  Runtime            │  │   │
│  │  │  (Dashboard)    │  │  (CGA Certs)    │  │  (Live Governance)  │  │   │
│  │  └─────────────────┘  └─────────────────┘  └─────────────────────┘  │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  AIGRC is the core that AIGOS wraps with enterprise capabilities           │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Simple Analogy:**
- **AIGRC** = Engine, wheels, brakes, steering (core mechanical parts)
- **AIGOS** = Complete car with dashboard, GPS, seat warmers, automatic emergency braking

---

## 3. System Architecture

### 3.1 Complete Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         AIGOS COMPLETE ARCHITECTURE                         │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  LAYER 1: DEVELOPMENT (Where code is written)                              │
│  ═══════════════════════════════════════════════════════════════════════   │
│                                                                             │
│  ┌──────────────────┐    ┌──────────────────┐    ┌──────────────────┐      │
│  │   Developer's    │    │   AI Notebooks   │    │   AI/ML Team's   │      │
│  │   VS Code        │    │   (Jupyter)      │    │   Repository     │      │
│  └────────┬─────────┘    └────────┬─────────┘    └────────┬─────────┘      │
│           │                       │                       │                 │
│           │ AIGRC VS Code Ext     │                       │ .asset-card.yaml│
│           │ (real-time feedback)  │                       │ files           │
│           │                       │                       │                 │
│  ─────────┴───────────────────────┴───────────────────────┴─────────────── │
│                                                                             │
│  LAYER 2: CI/CD (Where code is integrated)                                 │
│  ═══════════════════════════════════════════════════════════════════════   │
│                                                                             │
│  ┌───────────────────────────────────────────────────────────────────────┐ │
│  │                        GitHub / GitLab                                │ │
│  │  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐   │ │
│  │  │   Pre-commit    │───▶│   GitHub        │───▶│   Deployment    │   │ │
│  │  │   Hook          │    │   Actions       │    │   Pipeline      │   │ │
│  │  │   (AIGRC)       │    │   (AIGRC Check) │    │                 │   │ │
│  │  └─────────────────┘    └────────┬────────┘    └─────────────────┘   │ │
│  └──────────────────────────────────┼────────────────────────────────────┘ │
│                                     │                                       │
│                              scan results,                                  │
│                              compliance data,                               │
│                              asset card updates                             │
│                                     │                                       │
│                                     ▼                                       │
│  LAYER 3: CONTROL PLANE (Where governance is managed)                      │
│  ═══════════════════════════════════════════════════════════════════════   │
│                                                                             │
│  ┌───────────────────────────────────────────────────────────────────────┐ │
│  │                    AIGOS Control Plane                                │ │
│  │                                                                       │ │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌────────────┐│ │
│  │  │  Dashboard   │  │   API        │  │   Audit      │  │  Reports   ││ │
│  │  │  (React UI)  │  │   Gateway    │  │   Service    │  │  Service   ││ │
│  │  └──────────────┘  └──────────────┘  └──────────────┘  └────────────┘│ │
│  │                                                                       │ │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌────────────┐│ │
│  │  │  Policy      │  │   Asset      │  │   CA         │  │  Identity  ││ │
│  │  │  Service     │  │   Registry   │  │   Service    │  │  Service   ││ │
│  │  └──────────────┘  └──────────────┘  └──────────────┘  └────────────┘│ │
│  └───────────────────────────────────────────────────────────────────────┘ │
│                                     │                                       │
│                              policies,                                      │
│                              certificates,                                  │
│                              configuration                                  │
│                                     │                                       │
│                                     ▼                                       │
│  LAYER 4: RUNTIME (Where AI actually runs)                                 │
│  ═══════════════════════════════════════════════════════════════════════   │
│                                                                             │
│  ┌───────────────────────────────────────────────────────────────────────┐ │
│  │                    Production Environment                             │ │
│  │                                                                       │ │
│  │  ┌─────────────────────────────────────────────────────────────────┐ │ │
│  │  │                    AIGOS Runtime SDK                            │ │ │
│  │  │  ┌───────────┐  ┌───────────┐  ┌───────────┐  ┌───────────┐    │ │ │
│  │  │  │ Identity  │  │  Policy   │  │   Kill    │  │ Telemetry │    │ │ │
│  │  │  │ Manager   │  │  Engine   │  │  Switch   │  │  Emitter  │    │ │ │
│  │  │  └───────────┘  └───────────┘  └───────────┘  └───────────┘    │ │ │
│  │  └─────────────────────────────────────────────────────────────────┘ │ │
│  │                                                                       │ │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐ │ │
│  │  │   AI        │  │   AI        │  │   AI        │  │   AI        │ │ │
│  │  │  Agent 1    │  │  Agent 2    │  │  Agent 3    │  │  Agent N    │ │ │
│  │  │  (CGA Cert) │  │  (CGA Cert) │  │  (CGA Cert) │  │  (CGA Cert) │ │ │
│  │  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘ │ │
│  └───────────────────────────────────────────────────────────────────────┘ │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 3.2 Component Inventory

| Component | Package | Purpose | Required? |
|-----------|---------|---------|-----------|
| **AIGRC Core** | `@aigrc/core` | Schemas, detection, policies | Yes |
| **AIGRC CLI** | `@aigrc/cli` | Command-line interface | Yes |
| **VS Code Extension** | `aigrc.vscode-aigrc` | IDE integration | Recommended |
| **GitHub Action** | `aigrc/governance-action` | CI/CD integration | Recommended |
| **MCP Server** | `@aigrc/mcp` | AI assistant governance | Optional |
| **Control Plane** | `@aigrc/control-plane` | Web dashboard | Optional |
| **CA Service** | `@aigrc/ca-service` | Certificate Authority | For CGA |
| **Runtime** | `@aigrc/runtime` | Live governance | For agents |

---

## 4. Core Concepts

### 4.1 Asset Cards

**What:** A YAML document that describes an AI system's identity, capabilities, and governance metadata.

**Why:** Without Asset Cards, there's no source of truth about what AI exists and how it's governed.

**Analogy:** Like a passport for an AI system - identifies who it is, what it can do, and where it can go.

```yaml
# Example Asset Card
apiVersion: aigrc.io/v1
kind: AssetCard

metadata:
  name: customer-sentiment-analyzer
  version: 2.1.0
  created: 2026-02-16T10:00:00Z

spec:
  description: |
    Analyzes customer feedback to determine sentiment
    (positive, negative, neutral)

  classification:
    risk_level: LIMITED
    category: emotion-recognition
    eu_ai_act_reference: "Art. 50 - Transparency"

  ownership:
    team: Customer Experience
    contact: cx-team@acme.com

  technical:
    framework: transformers
    model_type: classifier
    input_data: Customer text feedback
    output_data: Sentiment score (0-1) with label

  governance:
    human_oversight:
      required: false
      reason: "Limited risk - advisory only"
    policies:
      - enterprise-ai-policy
    audit_logging: true
```

**Lifecycle:**
```
Created → Validated → Deployed → Monitored → Updated → Deprecated
```

### 4.2 Policies

**What:** Rules that define what AI systems must comply with.

**Why:** Enables automated enforcement of governance requirements.

**Analogy:** Like laws for AI - defines what's allowed and what's prohibited.

```yaml
# Example Policy
apiVersion: aigrc.io/v1
kind: Policy

metadata:
  name: high-risk-requirements

spec:
  rules:
    - id: require-human-oversight
      description: High-risk AI must have human oversight
      condition: classification.risk_level == "HIGH"
      requirement: governance.human_oversight.required == true
      enforcement: block
      message: "High-risk AI systems require human oversight configuration"

    - id: require-impact-assessment
      description: High-risk AI must have completed impact assessment
      condition: classification.risk_level == "HIGH"
      requirement: assessments contains "AI Impact Assessment" with status "completed"
      enforcement: block
      message: "Complete AI Impact Assessment before deployment"
```

**Enforcement Levels:**
| Level | Behavior |
|-------|----------|
| `info` | Log only, no action |
| `warn` | Warning message, allow proceed |
| `block` | Prevent action (commit, deploy, etc.) |

### 4.3 Detection Engine

**What:** Automatically finds AI/ML components in code.

**Why:** You can't govern what you can't see.

**How It Works:**
```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         DETECTION ENGINE FLOW                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  INPUT                         PROCESSING                    OUTPUT         │
│  ═════                         ══════════                    ══════         │
│                                                                             │
│  ┌─────────────┐              ┌─────────────┐              ┌─────────────┐ │
│  │   Source    │              │   Pattern   │              │   Found     │ │
│  │   Code      │─────────────▶│   Matching  │─────────────▶│   Assets    │ │
│  └─────────────┘              └─────────────┘              └─────────────┘ │
│                                                                             │
│  Looks at:                    Checks for:                  Reports:        │
│  • Import statements          • ML frameworks              • Asset name    │
│  • Function calls             • Model loading              • Type/category │
│  • Configuration files        • Training code              • Risk level    │
│  • Docker files               • API endpoints              • Location      │
│  • Requirements.txt           • Known patterns             • Confidence    │
│                                                                             │
│  Example matches:                                                           │
│  ─────────────────────────────────────────────────────────────────────────  │
│  import torch                 → PyTorch ML framework                       │
│  model = load_model(...)      → Model loading pattern                      │
│  pipeline("sentiment")        → Transformers NLP pipeline                  │
│  openai.ChatCompletion        → OpenAI API usage                           │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 4.4 Golden Thread

**What:** A cryptographic hash that links an AI system to its governance evidence throughout its lifecycle.

**Why:** Provides tamper-evident proof that governance was in place at every stage.

**Analogy:** Like a chain of custody for evidence - proves nothing was tampered with.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         GOLDEN THREAD CONCEPT                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  STAGE 1: Creation                                                         │
│  ═════════════════                                                         │
│  Asset Card created → Hash: abc123...                                      │
│                                                                             │
│  STAGE 2: Compliance Check                                                 │
│  ═════════════════════════                                                 │
│  Check passed → Hash: abc123... + def456... = ghi789...                    │
│                                                                             │
│  STAGE 3: Deployment                                                       │
│  ═══════════════════                                                       │
│  Deployed → Hash: ghi789... + jkl012... = mno345...                        │
│                                                                             │
│  STAGE 4: Audit                                                            │
│  ═══════════════                                                           │
│  Auditor can verify: "Show me the chain from creation to now"              │
│  abc123 → ghi789 → mno345 ✓ (unbroken chain = governance maintained)       │
│                                                                             │
│  If anyone modified anything without proper process:                        │
│  abc123 → ??? → mno345 ✗ (broken chain = evidence of tampering)            │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 4.5 CGA (Certified Governed Agent)

**What:** A trust certification for AI agents that proves they meet governance requirements.

**Why:** Enables Agent-to-Agent (A2A) trust - agents can verify each other's governance status.

**Certification Levels:**
| Level | Requirements | Use Case |
|-------|--------------|----------|
| **BRONZE** | Basic compliance, asset card | Internal tools |
| **SILVER** | + Human oversight, kill switch | Customer-facing |
| **GOLD** | + Continuous monitoring, audit trail | Regulated industries |
| **PLATINUM** | + Third-party audit, multi-jurisdiction | Critical systems |

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         CGA CERTIFICATION FLOW                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────┐       ┌─────────────┐       ┌─────────────┐              │
│  │   Agent     │       │    AIGOS    │       │    CA       │              │
│  │   Developer │       │    CLI      │       │   Service   │              │
│  └──────┬──────┘       └──────┬──────┘       └──────┬──────┘              │
│         │                     │                     │                      │
│         │  1. aigrc certify   │                     │                      │
│         │────────────────────▶│                     │                      │
│         │                     │                     │                      │
│         │                     │  2. Verify checks   │                      │
│         │                     │  • Asset card ✓     │                      │
│         │                     │  • Policies ✓       │                      │
│         │                     │  • Kill switch ✓    │                      │
│         │                     │                     │                      │
│         │                     │  3. Request cert    │                      │
│         │                     │────────────────────▶│                      │
│         │                     │                     │                      │
│         │                     │                     │  4. Sign cert        │
│         │                     │                     │  (ES256 + expiry)    │
│         │                     │                     │                      │
│         │                     │  5. Return cert     │                      │
│         │                     │◀────────────────────│                      │
│         │                     │                     │                      │
│         │  6. Certificate     │                     │                      │
│         │◀────────────────────│                     │                      │
│         │  (embed in agent)   │                     │                      │
│                                                                             │
│  Agent now has cryptographic proof of governance status                    │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 5. Data Flow

### 5.1 Complete Data Flow Diagram

This is the most important diagram for understanding how everything connects:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    AIGOS COMPLETE DATA FLOW                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ══════════════════════════════════════════════════════════════════════    │
│  PHASE 1: DISCOVERY (Finding AI)                                           │
│  ══════════════════════════════════════════════════════════════════════    │
│                                                                             │
│  ┌─────────────┐      ┌─────────────┐      ┌─────────────┐                │
│  │   Source    │      │   AIGRC     │      │   Scan      │                │
│  │   Code      │─────▶│   scan      │─────▶│   Results   │                │
│  │   (.py,.js) │      │   command   │      │   (JSON)    │                │
│  └─────────────┘      └─────────────┘      └──────┬──────┘                │
│                                                    │                        │
│                                                    ▼                        │
│  ══════════════════════════════════════════════════════════════════════    │
│  PHASE 2: DOCUMENTATION (Creating Asset Cards)                             │
│  ══════════════════════════════════════════════════════════════════════    │
│                                                                             │
│  ┌─────────────┐      ┌─────────────┐      ┌─────────────┐                │
│  │   Scan      │      │   AIGRC     │      │   Asset     │                │
│  │   Results   │─────▶│ asset-card  │─────▶│   Cards     │                │
│  │             │      │   init      │      │   (.yaml)   │                │
│  └─────────────┘      └─────────────┘      └──────┬──────┘                │
│                                                    │                        │
│                                                    ▼                        │
│  ══════════════════════════════════════════════════════════════════════    │
│  PHASE 3: COMPLIANCE (Checking Against Policies)                           │
│  ══════════════════════════════════════════════════════════════════════    │
│                                                                             │
│  ┌─────────────┐      ┌─────────────┐      ┌─────────────┐                │
│  │   Asset     │      │   Policy    │      │   AIGRC     │                │
│  │   Cards     │─────▶│   Rules     │─────▶│   check     │                │
│  │             │      │   (.yaml)   │      │   command   │                │
│  └─────────────┘      └─────────────┘      └──────┬──────┘                │
│                                                    │                        │
│                                                    ▼                        │
│                                             ┌─────────────┐                │
│                                             │  Compliance │                │
│                                             │  Results    │                │
│                                             │  (SARIF/JSON│                │
│                                             └──────┬──────┘                │
│                                                    │                        │
│                      ┌─────────────────────────────┼───────────────────┐   │
│                      │                             │                   │   │
│                      ▼                             ▼                   ▼   │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐      │
│  │   VS Code   │  │   GitHub    │  │   Control   │  │   Terminal  │      │
│  │   Problems  │  │   PR Check  │  │   Plane     │  │   Output    │      │
│  │   Panel     │  │   Status    │  │   Dashboard │  │             │      │
│  └─────────────┘  └─────────────┘  └──────┬──────┘  └─────────────┘      │
│                                           │                               │
│                                           ▼                               │
│  ══════════════════════════════════════════════════════════════════════   │
│  PHASE 4: REPORTING & AUDIT                                               │
│  ══════════════════════════════════════════════════════════════════════   │
│                                                                            │
│  ┌─────────────┐      ┌─────────────┐      ┌─────────────┐               │
│  │   Control   │      │   Report    │      │   Audit     │               │
│  │   Plane     │─────▶│   Generator │─────▶│   Package   │               │
│  │   Data      │      │             │      │   (ZIP/PDF) │               │
│  └─────────────┘      └─────────────┘      └─────────────┘               │
│                                                                            │
│  ══════════════════════════════════════════════════════════════════════   │
│  PHASE 5: RUNTIME (For Live AI Agents)                                    │
│  ══════════════════════════════════════════════════════════════════════   │
│                                                                            │
│  ┌─────────────┐      ┌─────────────┐      ┌─────────────┐               │
│  │   Certified │      │   Runtime   │      │   Control   │               │
│  │   Agent     │◀────▶│   SDK       │◀────▶│   Plane     │               │
│  │   (w/CGA)   │      │             │      │             │               │
│  └─────────────┘      └─────────────┘      └─────────────┘               │
│        │                    │                                             │
│        │                    │                                             │
│        ▼                    ▼                                             │
│  ┌─────────────┐      ┌─────────────┐                                    │
│  │   Policy    │      │   Kill      │                                    │
│  │   Decisions │      │   Switch    │                                    │
│  │   (allow/   │      │   (stop if  │                                    │
│  │    deny)    │      │    needed)  │                                    │
│  └─────────────┘      └─────────────┘                                    │
│                                                                            │
└────────────────────────────────────────────────────────────────────────────┘
```

### 5.2 Data Artifacts

| Artifact | Format | Created By | Used By | Stored In |
|----------|--------|------------|---------|-----------|
| Scan Results | JSON | `aigrc scan` | Asset card creation | Local file / Control Plane |
| Asset Cards | YAML | Developer / `aigrc init` | Compliance checks | Git repository |
| Policies | YAML | Governance team | Compliance checks | Git / Control Plane |
| Compliance Results | SARIF/JSON | `aigrc check` | Dashboard, IDE | Git / Control Plane |
| Audit Log | JSON | All operations | Audit, reports | Control Plane DB |
| CGA Certificate | JWT | CA Service | Agent verification | Agent / Control Plane |
| Telemetry | OTLP | Runtime SDK | Monitoring | Observability platform |

---

## 6. Deployment Patterns

### 6.1 Pattern 1: CLI-Only (Minimal)

**Best for:** Small teams, getting started, PoC

```
┌─────────────────────────────────────────────────────────────────┐
│                    CLI-ONLY DEPLOYMENT                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────┐     ┌──────────┐     ┌──────────┐               │
│  │Developer │────▶│ AIGRC    │────▶│  Git     │               │
│  │          │     │ CLI      │     │  Repo    │               │
│  └──────────┘     └──────────┘     └──────────┘               │
│                                                                 │
│  Components:                                                    │
│  • AIGRC CLI (local install)                                   │
│  • Asset cards in Git                                          │
│  • Policies in Git                                             │
│                                                                 │
│  Limitations:                                                   │
│  • No central dashboard                                        │
│  • No CI/CD integration                                        │
│  • Manual compliance checks                                    │
│  • Limited audit trail                                         │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 6.2 Pattern 2: CI/CD Integration (Standard)

**Best for:** Development teams, automated pipelines

```
┌─────────────────────────────────────────────────────────────────┐
│                    CI/CD INTEGRATION                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────┐     ┌──────────┐     ┌──────────┐               │
│  │Developer │────▶│ Git Push │────▶│ GitHub   │               │
│  │ (VS Code)│     │          │     │ Actions  │               │
│  └──────────┘     └──────────┘     └────┬─────┘               │
│       │                                 │                       │
│       │ Pre-commit                      │ AIGRC Check          │
│       │ (aigrc)                         │                       │
│       │                                 ▼                       │
│       │                          ┌──────────┐                  │
│       │                          │ Pass/Fail│                  │
│       │                          │ Status   │                  │
│       │                          └──────────┘                  │
│                                                                 │
│  Components:                                                    │
│  • AIGRC CLI                                                   │
│  • VS Code Extension                                           │
│  • GitHub Action / GitLab CI                                   │
│  • Pre-commit hooks                                            │
│                                                                 │
│  Benefits:                                                      │
│  • Automated checks on every commit/PR                         │
│  • Prevents non-compliant code from merging                   │
│  • Consistent enforcement                                      │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 6.3 Pattern 3: Full Platform (Enterprise)

**Best for:** Large organizations, regulated industries, multiple teams

```
┌─────────────────────────────────────────────────────────────────┐
│                    FULL ENTERPRISE DEPLOYMENT                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  DEVELOPMENT LAYER                                              │
│  ─────────────────                                              │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐                     │
│  │ VS Code  │  │ Jupyter  │  │  Other   │                     │
│  │ + AIGRC  │  │ + checks │  │  IDEs    │                     │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘                     │
│       │             │             │                             │
│       └─────────────┼─────────────┘                             │
│                     │                                           │
│                     ▼                                           │
│  CI/CD LAYER                                                   │
│  ──────────────                                                 │
│  ┌─────────────────────────────────────────────────┐           │
│  │              GitHub / GitLab                     │           │
│  │  ┌─────────┐  ┌─────────┐  ┌─────────┐         │           │
│  │  │Pre-Commit│  │Actions │  │Deploy   │         │           │
│  │  │ Hooks   │  │Pipeline │  │Gates    │         │           │
│  │  └─────────┘  └─────────┘  └─────────┘         │           │
│  └────────────────────┬────────────────────────────┘           │
│                       │                                         │
│                       ▼                                         │
│  CONTROL PLANE                                                  │
│  ─────────────                                                  │
│  ┌─────────────────────────────────────────────────┐           │
│  │           AIGOS Control Plane                   │           │
│  │  ┌─────────┐  ┌─────────┐  ┌─────────┐         │           │
│  │  │Dashboard│  │ API GW  │  │  Audit  │         │           │
│  │  └─────────┘  └─────────┘  └─────────┘         │           │
│  │  ┌─────────┐  ┌─────────┐  ┌─────────┐         │           │
│  │  │ CA Svc  │  │Policy   │  │Reports  │         │           │
│  │  └─────────┘  └─────────┘  └─────────┘         │           │
│  └────────────────────┬────────────────────────────┘           │
│                       │                                         │
│                       ▼                                         │
│  RUNTIME LAYER                                                  │
│  ─────────────                                                  │
│  ┌─────────────────────────────────────────────────┐           │
│  │           Production Environment                 │           │
│  │  ┌─────────────────────────────────────────────┐│           │
│  │  │         AIGOS Runtime SDK                   ││           │
│  │  └─────────────────────────────────────────────┘│           │
│  │  ┌───────┐  ┌───────┐  ┌───────┐  ┌───────┐   │           │
│  │  │Agent 1│  │Agent 2│  │Agent 3│  │Agent N│   │           │
│  │  │ CGA   │  │ CGA   │  │ CGA   │  │ CGA   │   │           │
│  │  └───────┘  └───────┘  └───────┘  └───────┘   │           │
│  └─────────────────────────────────────────────────┘           │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 7. Customer Scoping Guide

### 7.1 Questions to Determine Requirements

| Question | Determines | Options |
|----------|------------|---------|
| How many AI systems? | Scale | Small (<10), Medium (10-50), Large (50+) |
| High-risk systems? | Compliance depth | None, Some, Many |
| Live AI agents? | Runtime needs | No, Planned, Yes |
| Audit requirements? | Evidence needs | Basic, Detailed, Regulated |
| Multi-team? | Control Plane | Not needed, Recommended, Required |
| Multi-region? | Architecture | Single, Multi |

### 7.2 Component Selection Matrix

| Scenario | CLI | VS Code | CI/CD | Control Plane | CA | Runtime |
|----------|-----|---------|-------|---------------|----| --------|
| PoC / Evaluation | ✓ | Optional | | | | |
| Small Dev Team | ✓ | ✓ | ✓ | | | |
| Enterprise Dev | ✓ | ✓ | ✓ | ✓ | | |
| Regulated Industry | ✓ | ✓ | ✓ | ✓ | | |
| AI Agents in Prod | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |

---

## 8. Knowledge Check

### Quiz: Module P-02

1. What is the relationship between AIGRC and AIGOS?
   - A) They are the same thing
   - B) AIGRC is the core, AIGOS wraps it with enterprise features
   - C) AIGOS is the core, AIGRC wraps it
   - D) They are competitors

2. What is an Asset Card?
   - A) A credit card for AI purchases
   - B) A YAML document describing an AI system's governance metadata
   - C) A dashboard widget
   - D) A type of policy

3. What does the Detection Engine do?
   - A) Finds bugs in code
   - B) Automatically identifies AI/ML components in source code
   - C) Blocks malicious AI
   - D) Generates reports

4. What is the purpose of the Golden Thread?
   - A) To make reports look nice
   - B) To provide tamper-evident proof of governance throughout AI lifecycle
   - C) To connect to the internet
   - D) To encrypt data

5. Which deployment pattern requires the Control Plane?
   - A) CLI-Only
   - B) CI/CD Integration
   - C) Full Enterprise
   - D) All of them

**Answers:** 1-B, 2-B, 3-B, 4-B, 5-C

---

## 9. Summary

### Key Takeaways

1. **AIGRC** is the core technology; **AIGOS** is the complete platform
2. **Asset Cards** are the foundation - every AI system needs one
3. **Policies** enable automated enforcement of governance rules
4. **Data flows** from code → detection → documentation → compliance → audit
5. **Deployment patterns** scale from CLI-only to full enterprise
6. **Customer needs** determine which components to implement

### What's Next

- **Module P-03:** GRC Fundamentals for AI Systems
- **Module C-01:** AIGRC CLI - Complete Guide (deep dive into CLI operations)

---

*Module P-02 Complete. Proceed to Module P-03 or C-01.*
