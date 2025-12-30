# AIGRC/AIGOS Conformance Requirements

## Purpose

This document defines conformance requirements for implementations of AIGRC and AIGOS specifications. Conformance levels allow implementers to claim partial compliance while working toward full implementation.

---

## Normative Language

The key words "MUST", "MUST NOT", "REQUIRED", "SHALL", "SHALL NOT", "SHOULD", "SHOULD NOT", "RECOMMENDED", "MAY", and "OPTIONAL" in all specifications are to be interpreted as described in [RFC 2119](https://www.rfc-editor.org/rfc/rfc2119).

| Term | Meaning |
|------|---------|
| **MUST** / **REQUIRED** / **SHALL** | Absolute requirement |
| **MUST NOT** / **SHALL NOT** | Absolute prohibition |
| **SHOULD** / **RECOMMENDED** | Recommended but may be omitted with good reason |
| **SHOULD NOT** / **NOT RECOMMENDED** | Discouraged but may be done with good reason |
| **MAY** / **OPTIONAL** | Truly optional |

---

## Conformance Levels

### Overview

Each layer defines three conformance levels:

| Level | Name | Description |
|-------|------|-------------|
| **Level 1** | Minimal | Core functionality only |
| **Level 2** | Standard | Core + recommended features |
| **Level 3** | Full | All features including optional |

Implementations MUST satisfy all requirements of a level to claim conformance at that level.

---

## Layer 2: Static Governance (AIGRC)

### Level 1: Minimal Conformance

An implementation claiming AIGRC Level 1 conformance MUST:

| Requirement | Spec Reference |
|-------------|----------------|
| Detect at least 10 AI/ML frameworks | SPEC-DET-001 §3.1 |
| Classify assets into 4 risk levels | SPEC-CLS-001 §2.1 |
| Generate valid Asset Cards | SPEC-FMT-002 §3 |
| Provide `scan` command | SPEC-CLI-001 §4.1 |
| Provide `init` command | SPEC-CLI-001 §4.2 |

### Level 2: Standard Conformance

An implementation claiming AIGRC Level 2 conformance MUST:

| Requirement | Spec Reference |
|-------------|----------------|
| Satisfy all Level 1 requirements | — |
| Detect at least 25 AI/ML frameworks | SPEC-DET-001 §3.2 |
| Compute Golden Thread hash | SPEC-PRT-001 §4 |
| Provide `validate` command | SPEC-CLI-001 §4.3 |
| Provide `status` command | SPEC-CLI-001 §4.4 |
| Implement MCP Policy Tools | SPEC-MCP-001 §6.1 |
| Implement MCP Inventory Tools | SPEC-MCP-001 §6.2 |

### Level 3: Full Conformance

An implementation claiming AIGRC Level 3 conformance MUST:

| Requirement | Spec Reference |
|-------------|----------------|
| Satisfy all Level 2 requirements | — |
| Detect all specified frameworks (30+) | SPEC-DET-001 §3.3 |
| Verify Golden Thread signatures | SPEC-PRT-001 §5 |
| Support multi-jurisdiction profiles | SPEC-PRO-001 |
| Implement MCP Generation Tools | SPEC-MCP-001 §6.3 |
| Implement MCP Validation Tools | SPEC-MCP-001 §6.4 |
| Provide GitHub Action | SPEC-ACT-001 |
| Provide VS Code Extension | SPEC-VSC-001 |

---

## Layer 3: Kinetic Governance (AIGOS)

### Level 1: Minimal Conformance

An implementation claiming AIGOS Level 1 conformance MUST:

| Requirement | Spec Reference |
|-------------|----------------|
| Create RuntimeIdentity on startup | SPEC-RT-002 §4.1 |
| Load policy from .aigrc files | SPEC-RT-003 §3.1 |
| Evaluate basic permission checks | SPEC-RT-003 §4.1 |
| Emit identity trace on startup | SPEC-RT-004 §3.1 |
| Provide @guard decorator (or equivalent) | SPEC-RT-001 §5.1 |

### Level 2: Standard Conformance

An implementation claiming AIGOS Level 2 conformance MUST:

| Requirement | Spec Reference |
|-------------|----------------|
| Satisfy all Level 1 requirements | — |
| Verify Golden Thread hash | SPEC-RT-002 §4.3 |
| Enforce capability boundaries | SPEC-RT-003 §4.2 |
| Emit policy decision traces | SPEC-RT-004 §3.2 |
| Emit violation traces | SPEC-RT-004 §3.3 |
| Support dry-run mode | SPEC-RT-003 §5.1 |
| Meet latency requirements (< 2ms) | SPEC-RT-003 §6.1 |

### Level 3: Full Conformance

An implementation claiming AIGOS Level 3 conformance MUST:

| Requirement | Spec Reference |
|-------------|----------------|
| Satisfy all Level 2 requirements | — |
| Implement Kill Switch | SPEC-RT-005 |
| Implement Capability Decay | SPEC-RT-006 |
| Track agent lineage | SPEC-RT-002 §4.4 |
| Support signed policy files | SPEC-RT-003 §3.3 |
| Emit all OTel semantic conventions | SPEC-PRT-002 |
| Meet kill switch SLA (< 60s) | SPEC-RT-005 §4.1 |

---

## Protocol Conformance

### Golden Thread Protocol (SPEC-PRT-001)

| Level | Requirements |
|-------|--------------|
| **Level 1** | Compute hash from components |
| **Level 2** | Sign hash with RSA/ECDSA |
| **Level 3** | Verify signatures, support key rotation |

### OTel Semantic Conventions (SPEC-PRT-002)

| Level | Requirements |
|-------|--------------|
| **Level 1** | Emit `aigos.governance.identity` spans |
| **Level 2** | Emit `aigos.governance.decision` and `violation` spans |
| **Level 3** | Emit all defined spans, metrics, and attributes |

### License Key Format (SPEC-LIC-001)

| Level | Requirements |
|-------|--------------|
| **Level 1** | Validate JWT signature locally |
| **Level 2** | Check expiration, extract features |
| **Level 3** | Support key rotation, grace periods |

---

## Conformance Claims

### Claiming Conformance

Implementations MAY claim conformance using the following format:

```
"This implementation conforms to AIGRC Level 2 and AIGOS Level 1 
as defined in the AIGRC/AIGOS Specification Suite version 1.0."
```

### Partial Conformance

Implementations that satisfy some but not all requirements of a level MUST NOT claim conformance at that level. They MAY state:

```
"This implementation partially implements AIGRC Level 2, 
satisfying requirements X, Y, Z but not A, B, C."
```

### Conformance Testing

Conformance test suites will be provided for each layer and level. Implementations SHOULD pass all applicable tests before claiming conformance.

---

## Feature Tiers and Conformance

Conformance levels are independent of commercial feature tiers:

| | Community Tier | Professional Tier | Enterprise Tier |
|---|----------------|-------------------|-----------------|
| **AIGRC Level 1** | ✅ | ✅ | ✅ |
| **AIGRC Level 2** | ✅ | ✅ | ✅ |
| **AIGRC Level 3** | Partial | ✅ | ✅ |
| **AIGOS Level 1** | ✅ | ✅ | ✅ |
| **AIGOS Level 2** | ✅ | ✅ | ✅ |
| **AIGOS Level 3** | ❌ | ✅ | ✅ |

Note: Community tier may implement Level 3 features but some (Kill Switch, Capability Decay) are gated to Professional tier.

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2025-12-29 | Initial conformance requirements |
