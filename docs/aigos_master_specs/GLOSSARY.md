# AIGRC/AIGOS Glossary

## Purpose

This glossary defines terminology used across all AIGRC and AIGOS specifications. When a term is used in any specification, it carries the meaning defined here unless explicitly stated otherwise.

---

## Core Concepts

### AI Asset
An AI system, model, agent, or component that is subject to governance. Examples include:
- LLM API clients
- Trained models
- AI agents
- ML pipelines
- AI-powered features

### Asset Card
A YAML file containing governance metadata for an AI Asset. Asset Cards are stored in the `.aigrc/cards/` directory and follow the Asset Card Schema (SPEC-FMT-002).

### Golden Thread
The cryptographic chain of trust that links a runtime AI agent to its business authorization. The Golden Thread connects:
- Runtime instance → Asset Card → Jira/ADO ticket → Business approval

### Governance Continuum
The complete lifecycle of AI governance spanning five phases:
1. **DESIGN** — Policy queries via MCP Server
2. **DEVELOP** — Detection and classification via IDE/CLI
3. **BUILD** — Validation and gating via CI/CD
4. **DEPLOY** — Registration and approval via Asset Registry
5. **OPERATE** — Runtime enforcement via SDK

### Static Governance (AIGRC)
Governance activities that occur before runtime: detection, classification, documentation, and CI/CD gating. Implemented by the `@aigrc/*` packages.

### Kinetic Governance (AIGOS)
Governance activities that occur during runtime: identity verification, policy enforcement, telemetry, and kill switch. Implemented by the `@aigos/*` packages.

---

## Architecture Terms

### Governance Oracle
The pattern where AI coding assistants (Cursor, Claude, etc.) consult governance policies automatically via MCP, making governance invisible to developers.

### Local-First
The architectural principle that governance data and policies are stored locally (in Git) rather than requiring cloud connectivity. Cloud is optional for enhanced features.

### Value-First
The strategic principle that governance tools must provide immediate developer value (faster workflows, better code) before surfacing compliance benefits.

---

## Risk Classification

### Risk Level
One of four categories aligned with the EU AI Act:

| Level | Score | Description |
|-------|-------|-------------|
| **Minimal** | 0-2 | Low impact, internal use |
| **Limited** | 3-5 | Transparency obligations required |
| **High** | 6-8 | Significant oversight required |
| **Unacceptable** | 9+ | Prohibited uses |

### Risk Factors
The six factors evaluated to determine Risk Level:

| Factor | Points | Description |
|--------|--------|-------------|
| `autonomousDecisions` | 0 or 2 | AI makes final decisions without human review |
| `customerFacing` | 0 or 1 | AI interacts directly with customers |
| `toolExecution` | 0 or 2 | AI can execute tools, functions, or actions |
| `externalDataAccess` | 0 or 1 | AI accesses external data sources or APIs |
| `piiProcessing` | 0, 1, or 2 | AI processes personally identifiable information |
| `highStakesDecisions` | 0 or 3 | AI outputs affect important life decisions |

---

## Runtime Concepts

### Runtime Identity
The cryptographic identity of an AI agent at runtime, containing:
- `instance_id` — Unique identifier for this running instance
- `asset_id` — Reference to the Asset Card
- `golden_thread_hash` — Cryptographic proof of authorization
- `capabilities_manifest` — What this agent is allowed to do

### Policy Engine
The component that evaluates whether a runtime action is permitted based on the agent's capabilities and organizational policies. Also called "The Bouncer."

### Capability Decay
The rule that child agents MUST have equal or fewer capabilities than their parent. Permissions can only decrease through agent spawning, never increase.

### Kill Switch
The mechanism for remote termination of AI agents. Allows CISOs to stop rogue agents within 60 seconds.

### Telemetry Emitter
The component that emits OpenTelemetry spans for governance events (not performance metrics). Enables "Governance Observability."

---

## Protocol Terms

### MCP (Model Context Protocol)
The protocol enabling AI assistants to call tools and access resources. Originally developed by Anthropic. AIGRC implements an MCP server for governance operations.

### OTel (OpenTelemetry)
The open standard for observability (traces, metrics, logs). AIGOS uses OTel for governance telemetry with the `aigos.governance.*` namespace.

### SSE (Server-Sent Events)
The transport protocol used for real-time kill switch commands in enterprise deployments.

---

## File Format Terms

### .aigrc Directory
The directory containing all AIGRC governance artifacts:
```
.aigrc/
├── .aigrc.yaml          # Configuration file
├── cards/               # Asset Cards
│   └── *.yaml
├── policies/            # Policy files
│   └── *.yaml
└── signatures/          # Cryptographic signatures
    └── *.sig
```

### .aigrc.yaml
The root configuration file for AIGRC in a repository.

### Policy File
A YAML file defining governance rules (allowed models, denied domains, budget limits, etc.).

---

## Conformance Terms

### MUST / MUST NOT
Absolute requirements. Implementations that do not satisfy these are non-conformant.

### SHOULD / SHOULD NOT
Recommended practices. Implementations may omit these with good reason but should understand implications.

### MAY
Optional features. Implementations can include or omit these freely.

### Conformance Level
The degree to which an implementation satisfies specification requirements:
- **Level 1: Minimal** — Core features only
- **Level 2: Standard** — Core + recommended features
- **Level 3: Full** — All features including optional

---

## Stakeholder Terms

### Developer
The primary user of AIGRC tools. Writes code, uses IDE extensions, runs CLI commands.

### CISO (Chief Information Security Officer)
The stakeholder responsible for security and compliance. Primary user of dashboards, kill switch, audit reports.

### Auditor
External party who examines governance artifacts for compliance. Consumes audit packages and evidence.

### Regulator
Government body enforcing AI regulations (EU AI Act, etc.). Examines compliance documentation.

---

## Package Terms

### @aigrc/core
The core TypeScript library containing detection, classification, schemas, and Golden Thread utilities.

### @aigrc/cli
The command-line interface for scanning, initializing, and validating governance.

### @aigrc/mcp
The MCP server implementation enabling governance-aware AI assistants.

### @aigos/runtime
The runtime SDK for Kinetic Governance (TypeScript). Contains Identity Manager, Policy Engine, Telemetry Emitter, and Kill Switch.

### aigos (Python)
The Python SDK equivalent of @aigos/runtime.

---

## Abbreviations

| Abbreviation | Meaning |
|--------------|---------|
| AIGRC | AI Governance, Risk, and Compliance |
| AIGOS | AI Governance Operating System |
| ADO | Azure DevOps |
| API | Application Programming Interface |
| CI/CD | Continuous Integration / Continuous Deployment |
| CLI | Command Line Interface |
| CNCF | Cloud Native Computing Foundation |
| GRC | Governance, Risk, and Compliance |
| IDE | Integrated Development Environment |
| JWT | JSON Web Token |
| LLM | Large Language Model |
| MCP | Model Context Protocol |
| ML | Machine Learning |
| OTel | OpenTelemetry |
| OTLP | OpenTelemetry Protocol |
| PII | Personally Identifiable Information |
| SDK | Software Development Kit |
| SSE | Server-Sent Events |
| VS Code | Visual Studio Code |

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2025-12-29 | Initial glossary |
