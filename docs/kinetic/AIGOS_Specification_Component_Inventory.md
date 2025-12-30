# AIGOS/AIGRC Specification & Component Inventory

## Complete Technical Roadmap

---

# Executive Summary

Based on the unified strategy (Open Standard → Static Governance → Kinetic Governance → Sustainability), this document catalogs every specification document and software component required, organized by:

1. **Layer** — Which value proposition layer it serves
2. **Tier** — Which pricing tier unlocks it (Community/Professional/Enterprise)
3. **Status** — Exists, In Progress, or Not Started
4. **Priority** — P0 (Critical Path), P1 (High Value), P2 (Important), P3 (Nice to Have)

---

# Part I: Specification Documents

## 1.1 Complete Specification Inventory

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                         SPECIFICATION DOCUMENT MAP                                       │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                         │
│   LAYER 1: OPEN STANDARD                                                                │
│   ──────────────────────                                                                │
│   SPEC-STD-001   .aigrc File Format Specification              ⬜ Not Started   P0     │
│   SPEC-STD-002   Asset Card Schema (JSON Schema)               ✅ Exists        P0     │
│   SPEC-STD-003   Golden Thread Protocol                        ⬜ Not Started   P0     │
│   SPEC-STD-004   OTel Semantic Conventions for AI Governance   ⬜ Not Started   P1     │
│   SPEC-STD-005   Multi-Jurisdiction Profile Schema             🟡 In Progress   P1     │
│                                                                                         │
│   LAYER 2: STATIC GOVERNANCE (AIGRC)                                                    │
│   ──────────────────────────────────                                                    │
│   SPEC-CLI-001   CLI Command Reference                         ✅ Exists        P0     │
│   SPEC-DET-001   Detection Engine Specification                ✅ Exists        P0     │
│   SPEC-CLS-001   Risk Classification Algorithm                 ✅ Exists        P0     │
│   SPEC-MCP-001   MCP Server Specification (Levels 1-3)         ✅ Exists        P0     │
│   SPEC-MCP-002   MCP Server Specification (Level 4 - Runtime)  ⬜ Not Started   P1     │
│   SPEC-ACT-001   GitHub Action Specification                   ✅ Exists        P0     │
│   SPEC-VSC-001   VS Code Extension Specification               ⬜ Not Started   P1     │
│                                                                                         │
│   LAYER 3: KINETIC GOVERNANCE (AIGOS)                                                   │
│   ───────────────────────────────────                                                   │
│   SPEC-RT-001    Runtime SDK Core Specification                ✅ Exists        P0     │
│   SPEC-RT-002    Identity Manager Specification                ⬜ Not Started   P0     │
│   SPEC-RT-003    Policy Engine Specification                   ⬜ Not Started   P0     │
│   SPEC-RT-004    Kill Switch Protocol                          ⬜ Not Started   P1     │
│   SPEC-RT-005    Capability Decay Algorithm                    ⬜ Not Started   P1     │
│   SPEC-RT-006    Framework Adapter Interface                   ⬜ Not Started   P1     │
│   SPEC-RT-007    Sidecar Proxy Specification                   ⬜ Not Started   P2     │
│                                                                                         │
│   LAYER 4: SUSTAINABILITY                                                               │
│   ───────────────────────                                                               │
│   SPEC-ENV-001   Carbon Attribution Model                      ⬜ Not Started   P2     │
│   SPEC-ENV-002   Efficiency Scoring Algorithm                  ⬜ Not Started   P2     │
│   SPEC-ENV-003   Lifecycle Status Definitions                  ⬜ Not Started   P2     │
│                                                                                         │
│   MONETIZATION & LICENSING                                                              │
│   ────────────────────────                                                              │
│   SPEC-LIC-001   License Key Format & Validation               ⬜ Not Started   P0     │
│   SPEC-LIC-002   Feature Gating Matrix                         ⬜ Not Started   P0     │
│   SPEC-CLD-001   AIGOS Cloud API Specification                 ⬜ Not Started   P2     │
│                                                                                         │
└─────────────────────────────────────────────────────────────────────────────────────────┘

Legend: ✅ Exists  🟡 In Progress  ⬜ Not Started
```

## 1.2 Specification Details

### SPEC-STD-001: .aigrc File Format Specification

**Priority:** P0 | **Status:** Not Started | **Tier:** Community

**Purpose:** Define the canonical file format for AI governance metadata. This is the foundation of the open standard.

**Contents Required:**

```yaml
1. Introduction
   - Purpose and scope
   - Relationship to Asset Cards
   - Versioning strategy

2. File Structure
   - Directory layout (.aigrc/)
   - File naming conventions
   - Required vs optional files

3. Configuration File (.aigrc.yaml)
   - Schema definition
   - Registry configuration
   - Policy references
   - Golden Thread settings

4. Policy Files (.aigrc/policies/*.yaml)
   - Policy schema
   - Rule syntax
   - Inheritance model

5. Signing & Verification
   - Signature format
   - Key management
   - Verification algorithm

6. Extensibility
   - Custom fields
   - Profile extensions
   - Vendor namespaces
```

**Deliverable:** `spec/AIGRC_FILE_FORMAT_SPEC.md`

---

### SPEC-STD-003: Golden Thread Protocol

**Priority:** P0 | **Status:** Not Started | **Tier:** Community

**Purpose:** Define the cryptographic linking mechanism that connects runtime agents to business authorization.

**Contents Required:**

```yaml
1. Conceptual Model
   - What is the Golden Thread?
   - Traceability chain diagram
   - Trust boundaries

2. Hash Computation
   - Input components (ticket_id, approver, timestamp, etc.)
   - Algorithm (SHA-256)
   - Canonicalization rules

3. Signature Scheme
   - Key types supported (RSA, ECDSA)
   - Signing authority hierarchy
   - Certificate requirements

4. Verification Flow
   - At build time (GitHub Action)
   - At runtime (SDK)
   - Failure modes and recovery

5. Integration Points
   - Jira integration
   - Azure DevOps integration
   - Custom ticketing systems

6. Security Considerations
   - Key rotation
   - Revocation
   - Audit logging
```

**Deliverable:** `spec/GOLDEN_THREAD_PROTOCOL_SPEC.md`

---

### SPEC-STD-004: OTel Semantic Conventions for AI Governance

**Priority:** P1 | **Status:** Not Started | **Tier:** Community

**Purpose:** Define standard attribute names and span structures for governance telemetry, enabling interoperability across observability tools.

**Contents Required:**

```yaml
1. Namespace Definition
   - aigos.* namespace registration
   - Relationship to existing OTel conventions

2. Resource Attributes
   - aigos.asset.id
   - aigos.asset.name
   - aigos.asset.version
   - aigos.asset.risk_level
   - aigos.asset.golden_thread

3. Span Attributes (Common)
   - aigos.instance_id
   - aigos.lineage.parent_id
   - aigos.lineage.depth

4. Span Types
   - aigos.governance.identity_check
   - aigos.governance.policy_decision
   - aigos.governance.violation
   - aigos.governance.kill_switch
   - aigos.governance.capability_decay

5. Metrics
   - aigos.policy.decisions (counter)
   - aigos.policy.violations (counter)
   - aigos.policy.latency (histogram)
   - aigos.agents.active (gauge)

6. Environmental Attributes (Layer 4)
   - aigos.environmental.estimated_co2_grams
   - aigos.environmental.inference_provider
   - aigos.environmental.region
   - aigos.environmental.model_efficiency_score

7. Compliance Mapping
   - How attributes map to EU AI Act requirements
   - Audit trail generation from spans
```

**Deliverable:** `spec/OTEL_SEMANTIC_CONVENTIONS_SPEC.md`

---

### SPEC-RT-002: Identity Manager Specification

**Priority:** P0 | **Status:** Not Started | **Tier:** Community

**Purpose:** Define how runtime agents establish and verify their governance identity.

**Contents Required:**

```yaml
1. RuntimeIdentity Data Structure
   - Full schema definition
   - Required vs optional fields
   - Validation rules

2. Identity Lifecycle
   - Creation (at agent startup)
   - Verification (against .aigrc files)
   - Propagation (to child agents)
   - Expiration/renewal

3. Golden Thread Integration
   - Hash verification algorithm
   - Fallback behavior (unverified mode)
   - Logging requirements

4. Lineage Tracking
   - Parent-child relationships
   - Generation depth limits
   - Orphan detection

5. API Definition
   - IdentityManager class interface
   - Methods: create(), verify(), propagate()
   - Events emitted

6. Security Model
   - What identity protects against
   - Trust assumptions
   - Attack surface
```

**Deliverable:** `spec/IDENTITY_MANAGER_SPEC.md`

---

### SPEC-RT-003: Policy Engine Specification

**Priority:** P0 | **Status:** Not Started | **Tier:** Community (basic) / Professional (advanced)

**Purpose:** Define the "Bouncer" logic that enforces boundaries at runtime.

**Contents Required:**

```yaml
1. Policy Model
   - Capabilities (allowed_tools, allowed_domains, etc.)
   - Restrictions (denied_domains, max_budget, etc.)
   - Conditions (time-based, context-based)

2. Evaluation Algorithm
   - Check order (kill switch → capabilities → restrictions)
   - Short-circuit logic
   - Performance requirements (< 2ms)

3. Capability Decay (Professional)
   - Inheritance rules
   - Subset enforcement
   - Escalation handling

4. Policy Loading
   - From .aigrc files
   - Hot reload support
   - Signature verification

5. API Definition
   - PolicyEngine class interface
   - check_permission(action, resource, params)
   - evaluate_capability_decay(parent, child)

6. Dry Run Mode
   - Log-only enforcement
   - Metrics emission
   - Gradual rollout support

7. Error Handling
   - AigosPolicyViolation exception
   - Violation categorization
   - Recovery options
```

**Deliverable:** `spec/POLICY_ENGINE_SPEC.md`

---

### SPEC-RT-004: Kill Switch Protocol

**Priority:** P1 | **Status:** Not Started | **Tier:** Professional

**Purpose:** Define the remote termination mechanism for rogue agents.

**Contents Required:**

```yaml
1. Command Structure
   - TERMINATE command payload
   - RESTRICT command payload (reduce capabilities)
   - RESUME command payload

2. Transport Mechanisms
   - Server-Sent Events (SSE) for enterprise
   - Short polling (60s) for standard
   - Webhook callbacks

3. Authentication
   - Signature verification
   - Authority levels (org admin, asset owner)
   - Replay prevention (nonce, timestamp)

4. Execution Flow
   - Signal receipt
   - Verification
   - Grace period (5s)
   - Forced termination

5. Fail-Safe Behavior
   - Network unavailable scenarios
   - Invalid signal handling
   - Logging requirements

6. API Definition
   - ControlSocket class interface
   - Methods: listen(), acknowledge(), terminate()
   - Integration with PolicyEngine
```

**Deliverable:** `spec/KILL_SWITCH_PROTOCOL_SPEC.md`

---

### SPEC-LIC-001: License Key Format & Validation

**Priority:** P0 | **Status:** Not Started | **Tier:** N/A (Infrastructure)

**Purpose:** Define the offline-capable license key system that unlocks Professional/Enterprise features.

**Contents Required:**

```yaml
1. Key Format
   - JWT structure
   - Claims: tier, org_id, expires_at, features[]
   - Signing algorithm (RS256)

2. Key Generation
   - Generation process
   - Validity periods (annual)
   - Renewal flow

3. Validation Algorithm
   - Signature verification (local)
   - Expiration checking
   - Feature extraction

4. Public Key Distribution
   - Embedded in SDK
   - Key rotation strategy
   - Multi-key support (for rotation)

5. Offline Operation
   - No network requirement
   - Grace period for expired keys
   - Air-gapped environment support

6. SDK Integration
   - LicenseManager class
   - Feature gating API
   - Degradation behavior
```

**Deliverable:** `spec/LICENSE_KEY_SPEC.md`

---

### SPEC-LIC-002: Feature Gating Matrix

**Priority:** P0 | **Status:** Not Started | **Tier:** N/A (Infrastructure)

**Purpose:** Definitive list of which features are available in which tier.

**Contents Required:**

```yaml
Feature Gating Matrix:

| Feature                      | Community | Professional | Enterprise |
|------------------------------|-----------|--------------|------------|
| Detection Engine             | ✅        | ✅           | ✅         |
| Risk Classification          | ✅        | ✅           | ✅         |
| Asset Cards                  | ✅        | ✅           | ✅         |
| CLI (all commands)           | ✅        | ✅           | ✅         |
| GitHub Action (basic)        | ✅        | ✅           | ✅         |
| MCP Server (L1-3)            | ✅        | ✅           | ✅         |
| OTel Export                  | ✅        | ✅           | ✅         |
| Identity Manager             | ✅        | ✅           | ✅         |
| Policy Engine (basic)        | ✅        | ✅           | ✅         |
| Dry Run Mode                 | ✅        | ✅           | ✅         |
| Single Jurisdiction (EU)     | ✅        | ✅           | ✅         |
| Multi-Jurisdiction           | ❌        | ✅           | ✅         |
| Kill Switch                  | ❌        | ✅           | ✅         |
| Capability Decay             | ❌        | ✅           | ✅         |
| Signed Policy Files          | ❌        | ✅           | ✅         |
| Grafana Dashboards           | ❌        | ✅           | ✅         |
| Framework Adapters           | ❌        | ✅           | ✅         |
| MCP Server (L4 - Runtime)    | ❌        | ✅           | ✅         |
| Carbon Attribution           | ❌        | ✅           | ✅         |
| AIGOS Cloud Access           | ❌        | ❌           | ✅         |
| SSO/SAML Integration         | ❌        | ❌           | ✅         |
| Custom Adapter Development   | ❌        | ❌           | ✅         |
| Sidecar Deployment           | ❌        | ❌           | ✅         |
| Priority Support             | ❌        | ❌           | ✅         |
```

**Deliverable:** `spec/FEATURE_GATING_MATRIX.md`

---

# Part II: Software Components

## 2.1 Complete Component Inventory

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                         SOFTWARE COMPONENT MAP                                           │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                         │
│   LAYER 1: OPEN STANDARD (Apache 2.0)                                                   │
│   ───────────────────────────────────                                                   │
│                                                                                         │
│   @aigrc/schemas                       JSON Schema definitions      ⬜ Not Started  P0  │
│   └── asset-card.schema.json           Asset Card schema            ✅ Exists       P0  │
│   └── policy.schema.json               Policy file schema           ⬜ Not Started  P0  │
│   └── config.schema.json               .aigrc.yaml schema           ⬜ Not Started  P0  │
│   └── profile.schema.json              Jurisdiction profile schema  🟡 In Progress  P1  │
│                                                                                         │
│   LAYER 2: STATIC GOVERNANCE (AIGRC)                                                    │
│   ──────────────────────────────────                                                    │
│                                                                                         │
│   @aigrc/core                          Core library                 🟡 In Progress  P0  │
│   └── detection/                       Framework detection          🟡 In Progress  P0  │
│   └── classification/                  Risk classification          🟡 In Progress  P0  │
│   └── golden-thread/                   Golden Thread utilities      ⬜ Not Started  P0  │
│   └── license/                         License validation           ⬜ Not Started  P0  │
│   └── schemas/                         Schema validation            ⬜ Not Started  P0  │
│                                                                                         │
│   @aigrc/cli                           Command-line interface       🟡 In Progress  P0  │
│   └── commands/scan                    Scan command                 🟡 In Progress  P0  │
│   └── commands/init                    Init command                 🟡 In Progress  P0  │
│   └── commands/validate                Validate command             ⬜ Not Started  P0  │
│   └── commands/status                  Status command               ⬜ Not Started  P0  │
│   └── commands/export                  Audit export (Pro)           ⬜ Not Started  P1  │
│                                                                                         │
│   @aigrc/mcp-server                    MCP Server                   ⬜ Not Started  P0  │
│   └── tools/policy                     Policy query tools (L1)      ⬜ Not Started  P0  │
│   └── tools/inventory                  Inventory tools (L2)         ⬜ Not Started  P0  │
│   └── tools/generation                 Generation tools (L3)        ⬜ Not Started  P1  │
│   └── tools/runtime                    Runtime tools (L4, Pro)      ⬜ Not Started  P1  │
│                                                                                         │
│   @aigrc/github-action                 GitHub Action                🟡 In Progress  P0  │
│   └── scan                             PR scanning                  🟡 In Progress  P0  │
│   └── gate                             Deployment gating            ⬜ Not Started  P0  │
│   └── sign                             Policy signing (Pro)         ⬜ Not Started  P1  │
│                                                                                         │
│   @aigrc/vscode                        VS Code Extension            ⬜ Not Started  P1  │
│   └── detection-panel                  Real-time detection          ⬜ Not Started  P1  │
│   └── card-editor                      Asset Card editing           ⬜ Not Started  P1  │
│   └── status-bar                       Governance status            ⬜ Not Started  P1  │
│                                                                                         │
│   @aigrc/profiles                      Jurisdiction profiles        ⬜ Not Started  P1  │
│   └── eu-ai-act/                       EU AI Act profile            🟡 In Progress  P0  │
│   └── us-omb/                          US OMB M-24-10 profile       ⬜ Not Started  P1  │
│   └── nist-ai-rmf/                     NIST AI RMF profile          ⬜ Not Started  P1  │
│   └── iso-42001/                       ISO 42001 profile            ⬜ Not Started  P2  │
│                                                                                         │
│   LAYER 3: KINETIC GOVERNANCE (AIGOS)                                                   │
│   ───────────────────────────────────                                                   │
│                                                                                         │
│   @aigos/runtime                       Runtime SDK (TypeScript)     ⬜ Not Started  P0  │
│   └── identity/                        Identity Manager             ⬜ Not Started  P0  │
│       └── RuntimeIdentity              Identity data structure      ⬜ Not Started  P0  │
│       └── IdentityManager              Identity lifecycle           ⬜ Not Started  P0  │
│       └── LineageTracker               Parent-child tracking        ⬜ Not Started  P1  │
│   └── policy/                          Policy Engine                ⬜ Not Started  P0  │
│       └── PolicyEngine                 Rule evaluation              ⬜ Not Started  P0  │
│       └── CapabilityDecay              Inheritance logic (Pro)      ⬜ Not Started  P1  │
│       └── PolicyLoader                 Config loading               ⬜ Not Started  P0  │
│   └── telemetry/                       Telemetry Emitter            ⬜ Not Started  P0  │
│       └── GovernanceTracer             OTel span creation           ⬜ Not Started  P0  │
│       └── MetricsEmitter               Prometheus metrics           ⬜ Not Started  P1  │
│   └── control/                         Kill Switch (Pro)            ⬜ Not Started  P1  │
│       └── ControlSocket                SSE/polling receiver         ⬜ Not Started  P1  │
│       └── CommandHandler               Termination logic            ⬜ Not Started  P1  │
│   └── decorators/                      Developer API                ⬜ Not Started  P0  │
│       └── guard                        @guard decorator             ⬜ Not Started  P0  │
│       └── trace                        Tracing context              ⬜ Not Started  P0  │
│   └── license/                         License Manager              ⬜ Not Started  P0  │
│       └── LicenseManager               JWT validation               ⬜ Not Started  P0  │
│       └── FeatureGate                  Feature checking             ⬜ Not Started  P0  │
│                                                                                         │
│   aigos-runtime-python                 Runtime SDK (Python)         ⬜ Not Started  P0  │
│   └── (mirrors TypeScript structure)                                                    │
│                                                                                         │
│   @aigos/adapters                      Framework Adapters (Pro)     ⬜ Not Started  P1  │
│   └── langchain/                       LangChain adapter            ⬜ Not Started  P1  │
│   └── autogen/                         AutoGen adapter              ⬜ Not Started  P2  │
│   └── crewai/                          CrewAI adapter               ⬜ Not Started  P2  │
│   └── semantic-kernel/                 Semantic Kernel adapter      ⬜ Not Started  P2  │
│                                                                                         │
│   @aigos/sidecar                       Sidecar Proxy (Enterprise)   ⬜ Not Started  P2  │
│   └── proxy/                           HTTP proxy                   ⬜ Not Started  P2  │
│   └── Dockerfile                       Container image              ⬜ Not Started  P2  │
│   └── helm/                            Kubernetes deployment        ⬜ Not Started  P2  │
│                                                                                         │
│   LAYER 4: SUSTAINABILITY                                                               │
│   ───────────────────────                                                               │
│                                                                                         │
│   @aigos/carbon                        Carbon Attribution (Pro)     ⬜ Not Started  P2  │
│   └── estimator/                       CO2 estimation               ⬜ Not Started  P2  │
│   └── providers/                       Provider carbon data         ⬜ Not Started  P2  │
│   └── lifecycle/                       Asset lifecycle status       ⬜ Not Started  P2  │
│                                                                                         │
│   OBSERVABILITY & DASHBOARDS                                                            │
│   ──────────────────────────                                                            │
│                                                                                         │
│   @aigos/dashboards                    Pre-built dashboards (Pro)   ⬜ Not Started  P1  │
│   └── grafana/                         Grafana JSON                 ⬜ Not Started  P1  │
│       └── governance-overview.json     Main dashboard               ⬜ Not Started  P1  │
│       └── violations.json              Violations dashboard         ⬜ Not Started  P1  │
│       └── golden-thread.json           Traceability dashboard       ⬜ Not Started  P1  │
│       └── carbon.json                  Environmental dashboard      ⬜ Not Started  P2  │
│   └── datadog/                         Datadog dashboards           ⬜ Not Started  P2  │
│   └── alerts/                          Alert rule templates         ⬜ Not Started  P1  │
│                                                                                         │
│   AIGOS CLOUD (Enterprise)                                                              │
│   ────────────────────────                                                              │
│                                                                                         │
│   aigos-cloud-api                      Cloud API Backend            ⬜ Not Started  P2  │
│   └── policy-management/               Policy CRUD                  ⬜ Not Started  P2  │
│   └── team-management/                 Team/org management          ⬜ Not Started  P2  │
│   └── kill-switch-console/             Kill switch UI               ⬜ Not Started  P2  │
│   └── audit-retention/                 Log storage                  ⬜ Not Started  P2  │
│                                                                                         │
│   aigos-cloud-ui                       Cloud Web UI                 ⬜ Not Started  P2  │
│   └── policy-editor/                   Visual policy editor         ⬜ Not Started  P2  │
│   └── dashboard/                       Aggregate view               ⬜ Not Started  P2  │
│   └── settings/                        SSO, billing                 ⬜ Not Started  P2  │
│                                                                                         │
└─────────────────────────────────────────────────────────────────────────────────────────┘

Legend: ✅ Exists  🟡 In Progress  ⬜ Not Started
```

## 2.2 Component Dependency Graph

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                         COMPONENT DEPENDENCY GRAPH                                       │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                         │
│                              @aigrc/schemas                                             │
│                                    │                                                    │
│                    ┌───────────────┼───────────────┐                                   │
│                    │               │               │                                   │
│                    ▼               ▼               ▼                                   │
│              @aigrc/core    @aigrc/profiles   @aigos/runtime                           │
│                    │               │               │                                   │
│         ┌─────────┼─────────┐     │     ┌─────────┼─────────┐                         │
│         │         │         │     │     │         │         │                         │
│         ▼         ▼         ▼     │     ▼         ▼         ▼                         │
│   @aigrc/cli  @aigrc/mcp  @aigrc/ │  @aigos/   @aigos/  @aigos/                       │
│               server     github-  │  adapters  carbon   dashboards                    │
│                          action   │                                                    │
│         │         │         │     │     │                                              │
│         │         │         │     │     │                                              │
│         └─────────┴─────────┴─────┴─────┘                                              │
│                          │                                                             │
│                          ▼                                                             │
│                   @aigrc/vscode                                                        │
│                                                                                         │
│                          │                                                             │
│                          ▼                                                             │
│               aigos-cloud-api (optional)                                               │
│                          │                                                             │
│                          ▼                                                             │
│               aigos-cloud-ui (optional)                                                │
│                                                                                         │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

---

# Part III: Implementation Phases

## 3.1 Phase 0: Foundation (Weeks 1-4)

**Goal:** Establish the open standard and core infrastructure.

### Specifications to Complete

| Spec ID      | Name                   | Owner     | Deliverable                           |
| ------------ | ---------------------- | --------- | ------------------------------------- |
| SPEC-STD-001 | .aigrc File Format     | Architect | `spec/AIGRC_FILE_FORMAT_SPEC.md`      |
| SPEC-STD-003 | Golden Thread Protocol | Architect | `spec/GOLDEN_THREAD_PROTOCOL_SPEC.md` |
| SPEC-LIC-001 | License Key Format     | Architect | `spec/LICENSE_KEY_SPEC.md`            |
| SPEC-LIC-002 | Feature Gating Matrix  | Product   | `spec/FEATURE_GATING_MATRIX.md`       |

### Components to Build

| Package        | Component                 | Priority | Est. Effort |
| -------------- | ------------------------- | -------- | ----------- |
| @aigrc/schemas | All JSON schemas          | P0       | 1 week      |
| @aigrc/core    | License validation module | P0       | 3 days      |
| @aigrc/core    | Golden Thread utilities   | P0       | 1 week      |
| @aigrc/core    | Schema validation         | P0       | 3 days      |

### Exit Criteria

- [ ] All P0 specs reviewed and approved
- [ ] @aigrc/schemas published to npm
- [ ] License key generation working locally
- [ ] Golden Thread hash computation verified

---

## 3.2 Phase 1: Static Governance Complete (Weeks 5-10)

**Goal:** Ship functional AIGRC toolchain (CLI, GitHub Action, MCP Server L1-2).

### Specifications to Complete

| Spec ID      | Name             | Owner     | Deliverable                     |
| ------------ | ---------------- | --------- | ------------------------------- |
| SPEC-MCP-001 | MCP Server L1-3  | Architect | ✅ Already exists                |
| SPEC-RT-002  | Identity Manager | Architect | `spec/IDENTITY_MANAGER_SPEC.md` |
| SPEC-RT-003  | Policy Engine    | Architect | `spec/POLICY_ENGINE_SPEC.md`    |

### Components to Build

| Package              | Component             | Priority | Est. Effort |
| -------------------- | --------------------- | -------- | ----------- |
| @aigrc/cli           | All commands complete | P0       | 2 weeks     |
| @aigrc/mcp-server    | Level 1-2 tools       | P0       | 2 weeks     |
| @aigrc/github-action | Scan + gate           | P0       | 1 week      |
| @aigrc/profiles      | EU AI Act profile     | P0       | 1 week      |

### Exit Criteria

- [ ] `npx @aigrc/cli scan` works on real projects
- [ ] MCP Server responds to Claude Desktop
- [ ] GitHub Action blocks high-risk PRs
- [ ] All Community tier features functional

---

## 3.3 Phase 2: Kinetic Governance Core (Weeks 11-18)

**Goal:** Ship @aigos/runtime with Identity, Policy, and Telemetry.

### Specifications to Complete

| Spec ID      | Name                      | Owner     | Deliverable                              |
| ------------ | ------------------------- | --------- | ---------------------------------------- |
| SPEC-STD-004 | OTel Semantic Conventions | Architect | `spec/OTEL_SEMANTIC_CONVENTIONS_SPEC.md` |
| SPEC-RT-004  | Kill Switch Protocol      | Architect | `spec/KILL_SWITCH_PROTOCOL_SPEC.md`      |
| SPEC-RT-005  | Capability Decay          | Architect | `spec/CAPABILITY_DECAY_SPEC.md`          |

### Components to Build

| Package              | Component             | Priority | Est. Effort |
| -------------------- | --------------------- | -------- | ----------- |
| @aigos/runtime       | Identity Manager      | P0       | 2 weeks     |
| @aigos/runtime       | Policy Engine (basic) | P0       | 2 weeks     |
| @aigos/runtime       | GovernanceTracer      | P0       | 1 week      |
| @aigos/runtime       | Decorators (@guard)   | P0       | 1 week      |
| aigos-runtime-python | Python SDK            | P0       | 2 weeks     |

### Exit Criteria

- [ ] `@aigos/runtime` published to npm
- [ ] `aigos` published to PyPI
- [ ] OTel spans visible in Jaeger
- [ ] @guard decorator blocks unauthorized actions
- [ ] Dry-run mode working

---

## 3.4 Phase 3: Professional Tier (Weeks 19-26)

**Goal:** Complete Professional tier features for monetization launch.

### Specifications to Complete

| Spec ID      | Name                        | Owner     | Deliverable                       |
| ------------ | --------------------------- | --------- | --------------------------------- |
| SPEC-RT-006  | Framework Adapter Interface | Architect | `spec/ADAPTER_INTERFACE_SPEC.md`  |
| SPEC-ENV-001 | Carbon Attribution Model    | Architect | `spec/CARBON_ATTRIBUTION_SPEC.md` |

### Components to Build

| Package           | Component             | Priority | Est. Effort |
| ----------------- | --------------------- | -------- | ----------- |
| @aigos/runtime    | Kill Switch           | P1       | 2 weeks     |
| @aigos/runtime    | Capability Decay      | P1       | 1 week      |
| @aigrc/mcp-server | Level 4 runtime tools | P1       | 2 weeks     |
| @aigrc/profiles   | US OMB, NIST profiles | P1       | 2 weeks     |
| @aigos/adapters   | LangChain adapter     | P1       | 2 weeks     |
| @aigos/dashboards | Grafana templates     | P1       | 1 week      |
| @aigos/carbon     | Basic estimation      | P2       | 2 weeks     |

### Exit Criteria

- [ ] Kill Switch terminates agent within 60s
- [ ] Professional license key unlocks features
- [ ] LangChain adapter working
- [ ] Grafana dashboard importable
- [ ] Multi-jurisdiction classification working

---

## 3.5 Phase 4: Enterprise & Cloud (Weeks 27-40)

**Goal:** Launch Enterprise tier with AIGOS Cloud.

### Specifications to Complete

| Spec ID      | Name            | Owner     | Deliverable                    |
| ------------ | --------------- | --------- | ------------------------------ |
| SPEC-RT-007  | Sidecar Proxy   | Architect | `spec/SIDECAR_PROXY_SPEC.md`   |
| SPEC-CLD-001 | AIGOS Cloud API | Architect | `spec/AIGOS_CLOUD_API_SPEC.md` |

### Components to Build

| Package         | Component           | Priority | Est. Effort |
| --------------- | ------------------- | -------- | ----------- |
| @aigos/sidecar  | Proxy + Helm charts | P2       | 4 weeks     |
| @aigos/adapters | AutoGen, CrewAI     | P2       | 3 weeks     |
| aigos-cloud-api | Policy management   | P2       | 4 weeks     |
| aigos-cloud-ui  | Web dashboard       | P2       | 6 weeks     |
| @aigrc/vscode   | VS Code extension   | P1       | 4 weeks     |

### Exit Criteria

- [ ] AIGOS Cloud accessible
- [ ] SSO integration working
- [ ] Sidecar deployable to Kubernetes
- [ ] VS Code extension in marketplace

---

# Part IV: Package Structure (Monorepo)

## 4.1 Recommended Directory Layout

```
aigrc/                                    # Root monorepo
├── .github/
│   └── workflows/
│       ├── ci.yaml                       # Build + test all packages
│       ├── release.yaml                  # npm/PyPI publishing
│       └── docs.yaml                     # Documentation deployment
│
├── spec/                                 # Specification documents
│   ├── AIGRC_FILE_FORMAT_SPEC.md
│   ├── GOLDEN_THREAD_PROTOCOL_SPEC.md
│   ├── OTEL_SEMANTIC_CONVENTIONS_SPEC.md
│   ├── IDENTITY_MANAGER_SPEC.md
│   ├── POLICY_ENGINE_SPEC.md
│   ├── KILL_SWITCH_PROTOCOL_SPEC.md
│   ├── CAPABILITY_DECAY_SPEC.md
│   ├── LICENSE_KEY_SPEC.md
│   ├── FEATURE_GATING_MATRIX.md
│   └── ...
│
├── packages/                             # TypeScript packages
│   ├── schemas/                          # @aigrc/schemas
│   │   ├── src/
│   │   │   ├── asset-card.schema.json
│   │   │   ├── policy.schema.json
│   │   │   ├── config.schema.json
│   │   │   └── profile.schema.json
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── core/                             # @aigrc/core
│   │   ├── src/
│   │   │   ├── detection/
│   │   │   ├── classification/
│   │   │   ├── golden-thread/
│   │   │   ├── license/
│   │   │   └── index.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── cli/                              # @aigrc/cli
│   │   ├── src/
│   │   │   ├── commands/
│   │   │   └── index.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── mcp-server/                       # @aigrc/mcp-server
│   │   ├── src/
│   │   │   ├── tools/
│   │   │   ├── resources/
│   │   │   └── index.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── github-action/                    # @aigrc/github-action
│   │   ├── src/
│   │   ├── action.yaml
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── profiles/                         # @aigrc/profiles
│   │   ├── eu-ai-act/
│   │   ├── us-omb/
│   │   ├── nist-ai-rmf/
│   │   └── package.json
│   │
│   ├── vscode/                           # @aigrc/vscode
│   │   ├── src/
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── runtime/                          # @aigos/runtime
│   │   ├── src/
│   │   │   ├── identity/
│   │   │   │   ├── RuntimeIdentity.ts
│   │   │   │   ├── IdentityManager.ts
│   │   │   │   └── LineageTracker.ts
│   │   │   ├── policy/
│   │   │   │   ├── PolicyEngine.ts
│   │   │   │   ├── CapabilityDecay.ts
│   │   │   │   └── PolicyLoader.ts
│   │   │   ├── telemetry/
│   │   │   │   ├── GovernanceTracer.ts
│   │   │   │   └── MetricsEmitter.ts
│   │   │   ├── control/
│   │   │   │   ├── ControlSocket.ts
│   │   │   │   └── CommandHandler.ts
│   │   │   ├── decorators/
│   │   │   │   ├── guard.ts
│   │   │   │   └── trace.ts
│   │   │   ├── license/
│   │   │   │   ├── LicenseManager.ts
│   │   │   │   └── FeatureGate.ts
│   │   │   └── index.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── adapters/                         # @aigos/adapters
│   │   ├── langchain/
│   │   ├── autogen/
│   │   ├── crewai/
│   │   └── package.json
│   │
│   ├── carbon/                           # @aigos/carbon
│   │   ├── src/
│   │   └── package.json
│   │
│   ├── dashboards/                       # @aigos/dashboards
│   │   ├── grafana/
│   │   ├── datadog/
│   │   ├── alerts/
│   │   └── package.json
│   │
│   └── sidecar/                          # @aigos/sidecar
│       ├── proxy/
│       ├── Dockerfile
│       ├── helm/
│       └── package.json
│
├── python/                               # Python packages
│   └── aigos-runtime/                    # aigos (PyPI)
│       ├── aigos/
│       │   ├── identity/
│       │   ├── policy/
│       │   ├── telemetry/
│       │   ├── control/
│       │   ├── decorators/
│       │   └── __init__.py
│       ├── pyproject.toml
│       └── setup.py
│
├── cloud/                                # AIGOS Cloud (Enterprise)
│   ├── api/                              # aigos-cloud-api
│   │   ├── src/
│   │   └── package.json
│   └── ui/                               # aigos-cloud-ui
│       ├── src/
│       └── package.json
│
├── docs/                                 # Documentation
│   ├── getting-started/
│   ├── concepts/
│   ├── learning-paths/
│   ├── guides/
│   ├── reference/
│   └── tutorials/
│
├── examples/                             # Example projects
│   ├── basic-agent/
│   ├── langchain-governed/
│   └── enterprise-deployment/
│
├── package.json                          # Root workspace config
├── pnpm-workspace.yaml
├── turbo.json
├── tsconfig.json
└── README.md
```

---

# Part V: Priority Summary

## 5.1 P0 Items (Critical Path to Revenue)

| Type          | Item                   | Reason                      |
| ------------- | ---------------------- | --------------------------- |
| **Spec**      | .aigrc File Format     | Foundation of open standard |
| **Spec**      | Golden Thread Protocol | Core differentiator         |
| **Spec**      | License Key Format     | Enables monetization        |
| **Spec**      | Feature Gating Matrix  | Defines tiers               |
| **Spec**      | Identity Manager       | Runtime SDK foundation      |
| **Spec**      | Policy Engine          | Runtime SDK foundation      |
| **Component** | @aigrc/schemas         | Everything depends on it    |
| **Component** | @aigrc/core (complete) | Everything depends on it    |
| **Component** | @aigrc/cli (complete)  | Primary user interface      |
| **Component** | @aigrc/mcp-server L1-2 | "Governance Oracle"         |
| **Component** | @aigrc/github-action   | CI/CD integration           |
| **Component** | @aigos/runtime (core)  | Kinetic governance          |
| **Component** | aigos-runtime-python   | Python ecosystem            |

## 5.2 P1 Items (High Value, Post-Launch)

| Type          | Item                          | Reason                    |
| ------------- | ----------------------------- | ------------------------- |
| **Spec**      | OTel Semantic Conventions     | Observability standard    |
| **Spec**      | Kill Switch Protocol          | Professional tier feature |
| **Component** | @aigrc/profiles (multi)       | Enterprise sales enabler  |
| **Component** | @aigos/runtime (Pro features) | Monetization              |
| **Component** | @aigos/adapters/langchain     | Ecosystem adoption        |
| **Component** | @aigos/dashboards/grafana     | Immediate value           |
| **Component** | @aigrc/vscode                 | Developer experience      |
| **Component** | @aigrc/mcp-server L3-4        | Full MCP spec             |

## 5.3 P2 Items (Important, Phase 4)

| Type          | Item                     | Reason                 |
| ------------- | ------------------------ | ---------------------- |
| **Spec**      | Carbon Attribution Model | ESG positioning        |
| **Spec**      | Sidecar Proxy            | Enterprise deployment  |
| **Spec**      | AIGOS Cloud API          | Enterprise tier        |
| **Component** | @aigos/sidecar           | Framework independence |
| **Component** | @aigos/carbon            | Sustainability layer   |
| **Component** | aigos-cloud-api          | Enterprise tier        |
| **Component** | aigos-cloud-ui           | Enterprise tier        |
| **Component** | @aigos/adapters (others) | Ecosystem breadth      |

---

# Part VI: Success Metrics

## 6.1 Phase 0-1 (Foundation + Static)

| Metric                             | Target    |
| ---------------------------------- | --------- |
| @aigrc/cli npm downloads           | 500/month |
| GitHub Action marketplace installs | 100       |
| MCP Server user test sessions      | 50        |
| Community GitHub stars             | 250       |

## 6.2 Phase 2-3 (Kinetic + Professional)

| Metric                        | Target      |
| ----------------------------- | ----------- |
| @aigos/runtime npm downloads  | 1,000/month |
| aigos PyPI downloads          | 2,000/month |
| Professional tier conversions | 25 orgs     |
| Monthly recurring revenue     | $12,500     |

## 6.3 Phase 4 (Enterprise)

| Metric                        | Target  |
| ----------------------------- | ------- |
| Enterprise tier conversions   | 10 orgs |
| AIGOS Cloud active orgs       | 15      |
| Monthly recurring revenue     | $50,000 |
| AIGOS Certified badges issued | 5       |

---

*AIGOS/AIGRC Specification & Component Inventory v1.0 | December 2025*
