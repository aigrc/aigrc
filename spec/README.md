<div align="center">

# 📐 The AIGRC Specification

**The open standard for AI governance infrastructure.**

</div>

---

## Overview

The AIGRC specification defines what governance artifacts AI systems must carry, how those artifacts are structured, when governance enforcement must occur, and what a third party may legitimately verify about a system that claims AIGRC conformance.

AIGRC is organized as a **family of four standard documents** (STD-001 through STD-004), supported by **component-level technical specifications** that define individual protocols, formats, and runtime behaviors.

---

## The Standard

The four standard documents constitute the AIGRC Standard. Each addresses a distinct layer of governance infrastructure.

| Document | Title | Status | Description |
|----------|-------|--------|-------------|
| [**AIGRC-STD-001**](AIGRC-STD-001.md) | The Standard Charter | 📙 DRAFT v0.1.0 | Foundational specification: axioms, definitions, governance model, conformance framework, relationship to existing standards |
| **AIGRC-STD-002** | Core Schema Library | 🔨 BUILDING | Canonical data structures — AI Asset Card schema, risk taxonomy, policy primitive types, governance configuration |
| **AIGRC-STD-003** | Multi-Jurisdiction Regulatory Mapping | 📋 SPECIFIED | Mappings between AIGRC policy primitives and regulatory frameworks (EU AI Act, NIST AI RMF, ISO 42001, SR 11-7, etc.) |
| **AIGRC-STD-004** | Conformance and Certification Levels | 📋 SPECIFIED | BRONZE / SILVER / GOLD / PLATINUM conformance tiers, Certification Authority architecture |

> **⚠ Draft Status:** AIGRC-STD-001 is published as a DRAFT (v0.1.0). No conformance claims should be based on specifications at version 0.x.x. The specification is open for community review, critique, and contribution.

---

## Foundational Axioms

The entire specification is built on three empirical observations about how AI governance fails:

### Axiom I — Verification Asymmetry
The cost of verifying governance conformance is lowest at creation and increases by at least one order of magnitude at each subsequent lifecycle stage. Governance infrastructure **must** be embedded at creation time.

### Axiom II — The Golden Thread
Every AI system deployed in a governed environment **must** be cryptographically linked to the specific business intent that authorized its creation. An agent without a Golden Thread is an orphan.

### Axiom III — Runtime Physics
Static analysis is insufficient governance for autonomous agents. Governance **must** include a runtime enforcement layer that constrains AI behavior in real time.

---

## Component Specifications

Below the standard documents, component-level specs define the technical details of individual protocols, formats, and runtime behaviors. These are the building blocks that tools implement.

### Governance Artifacts

| Spec | Title | Status | Implemented By |
|------|-------|--------|----------------|
| [Asset Cards](asset-cards.md) | AI Asset Card schema and lifecycle | 📗 Stable | `@aigrc/core`, `@aigrc/cli` |
| [Model Cards](model-cards.md) | Model documentation standard | 📗 Stable | `@aigrc/core` |
| [Data Cards](data-cards.md) | Dataset governance documentation | 📗 Stable | `@aigrc/core` |

### Protocols

| Spec | Title | Status | Implemented By |
|------|-------|--------|----------------|
| [Golden Thread](golden-thread.md) | Business intent traceability protocol | 📙 Draft | `@aigrc/core` |
| [Governance Token](governance-token.md) | Runtime governance token protocol | 📙 Draft | `@aigrc/i2e-firewall` |
| [OTel Conventions](otel-conventions.md) | OpenTelemetry semantic conventions for governance | 📙 Draft | `@aigrc/sdk` |

### Policy & Enforcement

| Spec | Title | Status | Implemented By |
|------|-------|--------|----------------|
| [Policy Bindings](policy-bindings.md) | Policy-to-asset attachment protocol | 📙 Draft | `@aigrc/i2e-bridge` |
| [Kill Switch](kill-switch.md) | Emergency agent termination protocol | 📙 Draft | `@aigrc/i2e-firewall` |

### Records & Evidence

| Spec | Title | Status | Implemented By |
|------|-------|--------|----------------|
| [Incident Reports](incident-reports.md) | Governance incident documentation | 📙 Draft | `@aigrc/core` |
| [Review Records](review-records.md) | Audit review record schema | 📙 Draft | `@aigrc/core` |
| [Test Reports](test-reports.md) | Governance test evidence format | 📙 Draft | `@aigrc/core` |

---

## Conformance Levels

AIGRC defines four conformance levels. Each is a superset of all lower levels.

```
  ┌─────────────────────────────────────────────────────────────────────┐
  │                                                                     │
  │   🏆  PLATINUM      Full third-party monitoring                     │
  │       Continuous verification · Public attestation                  │
  │       → Critical infrastructure, sovereign AI                       │
  │                                                                     │
  │   🥇  GOLD          CA-verified + periodic audit                    │
  │       Regulatory mapping applied · CGA certificate                  │
  │       → High-risk AI, enterprise procurement                        │
  │                                                                     │
  │   🥈  SILVER        CA-verified                                     │
  │       Runtime enforcement · Kill Switch · Independent review        │
  │       → Production systems, consequential AI                        │
  │                                                                     │
  │   🥉  BRONZE        Self-attestation                                │
  │       Asset Cards · Risk classification · Golden Thread documented  │
  │       → Internal tooling, development, initial posture              │
  │                                                                     │
  └─────────────────────────────────────────────────────────────────────┘
```

See [AIGRC-STD-001 §8](AIGRC-STD-001.md#8-conformance-and-implementation-claims) for the full conformance framework.

---

## Relationship to Existing Frameworks

AIGRC does not compete with established governance frameworks. It implements them.

| Framework | AIGRC's Role |
|-----------|-------------|
| **NIST AI RMF** | Provides the technical infrastructure that fulfills GOVERN, MAP, MEASURE, and MANAGE functions |
| **ISO/IEC 42001** | Provides the tooling that ISO 42001 management system processes operate through |
| **EU AI Act** | Addresses Articles 9, 12, 13, 14 obligations through runtime enforcement, audit stream, Asset Cards, and Kill Switch |
| **SR 11-7** | Model documentation, independent validation, and monitoring correspond to Asset Cards, CGA certification, and runtime audit |

See [AIGRC-STD-001 §7](AIGRC-STD-001.md#7-relationship-to-existing-frameworks) for the complete positioning.

---

## Detailed Technical Specifications

The component specifications above are summaries. The full technical specifications with implementation details live in [`docs/aigos_master_specs/`](../docs/aigos_master_specs/):

| Layer | Specs | Description |
|-------|-------|-------------|
| [CLI Layer](../docs/aigos_master_specs/cli_spec_layer/) | SPEC-CLI-001 | CLI command interface behavior |
| [Format Layer](../docs/aigos_master_specs/fmt_spec_layer/) | SPEC-FMT-001, FMT-003 | File formats — .aigrc YAML, policy schema |
| [Protocol Layer](../docs/aigos_master_specs/prt_spec_layer/) | SPEC-PRT-001, PRT-002, PRT-003 | Golden Thread, OTel conventions, Governance Token |
| [Runtime Layer](../docs/aigos_master_specs/rt_spec_layer/) | SPEC-RT-002 through RT-006 | Identity Manager, Policy Engine, Telemetry, Kill Switch, Capability Decay |
| [License Layer](../docs/aigos_master_specs/lic_spec_layer/) | SPEC-LIC-001 | License key format and validation |

---

## Contributing to the Specification

The AIGRC specification is developed openly. Contributions include:

- **Reviewing drafts** — Read the specs and file issues for ambiguities or contradictions
- **Proposing changes** — Submit PRs against spec documents with supporting rationale
- **Regulatory mapping** — Add or correct jurisdiction mappings in STD-003
- **Implementation reports** — Share your experience implementing AIGRC (including failures)
- **Scholarly critique** — Rigorous analysis of design decisions is a contribution of the highest value

Specification changes follow a 30-day comment period and require TSC review. See [CONTRIBUTING.md](../CONTRIBUTING.md#specification-contributions) for the full process.

---

<div align="center">

*The authoritative version of each specification is always the most recent at `aigrc.dev/spec`.*

*Comments and corrections: `spec@aigrc.dev`*

**[← Back to README](../README.md)**

</div>
