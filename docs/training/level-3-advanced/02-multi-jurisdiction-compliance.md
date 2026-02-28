# Module 3.2: Multi-Jurisdiction Compliance

> **Duration:** 45-60 minutes
> **Level:** Advanced
> **Prerequisites:** Level 1 complete, Module 3.1 recommended

---

## Learning Objectives

By the end of this module, you will be able to:
1. Understand the global AI regulatory landscape and key frameworks
2. Configure and apply compliance profiles for different jurisdictions
3. Perform gap analysis across multiple regulatory frameworks
4. Generate crosswalk reports mapping requirements between standards
5. Create custom compliance profiles for organization-specific policies

---

## Overview (5 min)

Organizations operating globally face a patchwork of AI regulations. The EU AI Act, NIST AI RMF, ISO 42001, and emerging state/local laws each have different requirements. AIGRC's multi-jurisdiction compliance framework helps you navigate this complexity with unified profiles and automated gap analysis.

---

## WHY: The Compliance Maze (15 min)

### The Global Regulatory Landscape

```
                    ┌────────────────────────────────────────┐
                    │         GLOBAL AI REGULATIONS          │
                    └────────────────────────────────────────┘
                                       │
        ┌──────────────────────────────┼──────────────────────────────┐
        │                              │                              │
   ┌────┴────┐                   ┌─────┴─────┐                  ┌─────┴─────┐
   │   EU    │                   │    US     │                  │   APAC    │
   └────┬────┘                   └─────┬─────┘                  └─────┬─────┘
        │                              │                              │
   ┌────┴────┐              ┌──────────┼──────────┐           ┌───────┼───────┐
   │ AI Act  │              │          │          │           │       │       │
   │ GDPR    │         Federal     States      Local      China   Japan   Singapore
   └─────────┘              │          │          │           │       │       │
                        OMB M-24   Colorado   NYC LL144    PIPL    APPI   PDPA
                        NIST RMF   California               AI Law
```

### Key Regulations

| Jurisdiction | Regulation | Status | Key Requirements |
|--------------|------------|--------|------------------|
| **EU** | AI Act | In Force | Risk classification, documentation |
| **EU** | GDPR | In Force | Data protection, automated decisions |
| **US Federal** | NIST AI RMF | Voluntary | Risk management framework |
| **US Federal** | OMB M-24-10 | Required for Fed | Federal AI governance |
| **Colorado** | AI Act | 2026 | High-risk AI disclosure |
| **NYC** | Local Law 144 | In Force | Bias audits for hiring AI |
| **ISO** | 42001:2023 | Standard | AI management system |

### The Multi-Jurisdiction Challenge

**Scenario:** Your company operates in the US and EU, uses AI for:
- Customer service (EU + US customers)
- HR resume screening (US employees)
- Fraud detection (all markets)

**Requirements:**
- EU AI Act (customer service = limited risk, fraud = possibly high risk)
- NYC LL144 (resume screening = bias audit required)
- NIST AI RMF (voluntary but expected)
- ISO 42001 (customer requirement)

**Without AIGRC:**
- Manual tracking of 50+ requirements
- Duplicate documentation
- Conflicting interpretations
- Audit preparation nightmare

**With AIGRC:**
- Unified compliance profile
- Automated gap analysis
- Cross-framework mapping
- Audit-ready reports

---

## WHAT: Compliance Framework Architecture (15 min)

### Compliance Profiles

A compliance profile is a structured definition of a regulatory framework's requirements.

```yaml
# Structure of a compliance profile
profile:
  id: eu-ai-act
  name: EU AI Act
  version: "2024.1"
  jurisdiction: EU

requirements:
  - id: req-001
    title: Risk Classification
    description: Classify AI system by risk level
    applies_to:
      risk_levels: [high, limited]
    controls:
      - control-rc-001

controls:
  - id: control-rc-001
    title: Document Risk Level
    description: Record risk classification in asset card
    validation:
      field: risk_classification.level
      required: true
```

### Profile Composition

Multiple profiles can be applied simultaneously:

```
┌─────────────────────────────────────────────────────────────┐
│                     YOUR AI SYSTEM                          │
└──────────────────────────┬──────────────────────────────────┘
                           │
            ┌──────────────┼──────────────┐
            ▼              ▼              ▼
       ┌─────────┐   ┌─────────┐   ┌─────────┐
       │ EU AI   │   │  NIST   │   │ ISO     │
       │  Act    │   │ AI RMF  │   │ 42001   │
       └────┬────┘   └────┬────┘   └────┬────┘
            │             │             │
            └─────────────┴─────────────┘
                          │
                          ▼
                ┌─────────────────┐
                │ Unified Control │
                │   Requirements  │
                └─────────────────┘
```

### Available Profiles

| Profile | File | Jurisdiction | Focus |
|---------|------|--------------|-------|
| EU AI Act | `eu-ai-act.yaml` | EU | Risk classification, documentation |
| NIST AI RMF | `nist-ai-rmf.yaml` | US | Risk management lifecycle |
| ISO 42001 | `iso-42001.yaml` | International | Management system |
| US OMB M-24 | `us-omb-m24.yaml` | US Federal | Federal agency requirements |

### Gap Analysis

Gap analysis compares your current state against profile requirements:

```
┌─────────────────────────────────────────────────────────────┐
│                      GAP ANALYSIS                           │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Requirement: Risk Management System (EU AI Act Art. 9)    │
│  Status: ⚠️ PARTIAL                                         │
│                                                             │
│  ✅ Risk identification documented                          │
│  ✅ Risk classification complete                            │
│  ❌ Risk mitigation measures missing                        │
│  ❌ Residual risk assessment missing                        │
│                                                             │
│  Gap: 2 of 4 controls not implemented                       │
│  Remediation: Add mitigation measures to asset card         │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Crosswalk Reports

Crosswalk maps requirements between frameworks:

```
┌────────────────────┬────────────────────┬────────────────────┐
│     EU AI Act      │    NIST AI RMF     │     ISO 42001      │
├────────────────────┼────────────────────┼────────────────────┤
│ Art. 9 Risk Mgmt   │ GOVERN 1.1         │ 6.1.1 Risk ID      │
│ Art. 10 Data Gov   │ MAP 1.3            │ 7.2 Data Quality   │
│ Art. 11 Tech Docs  │ GOVERN 4.2         │ 7.5 Documentation  │
│ Art. 12 Logging    │ MEASURE 2.3        │ 9.1 Monitoring     │
│ Art. 13 Transparency│ GOVERN 1.5        │ 7.4 Communication  │
│ Art. 14 Human Over │ GOVERN 1.4         │ 8.1 Operation      │
└────────────────────┴────────────────────┴────────────────────┘
```

---

## HOW: Step-by-Step Implementation (20 min)

### Step 1: View Available Profiles

```bash
aigrc compliance profiles
```

**Output:**
```
Available Compliance Profiles:

┌────────────────┬──────────────────────────────┬────────────┐
│ Profile ID     │ Name                         │ Version    │
├────────────────┼──────────────────────────────┼────────────┤
│ eu-ai-act      │ EU AI Act                    │ 2024.1     │
│ nist-ai-rmf    │ NIST AI Risk Management      │ 1.0        │
│ iso-42001      │ ISO/IEC 42001:2023           │ 2023.1     │
│ us-omb-m24     │ US OMB M-24-10               │ 2024.1     │
└────────────────┴──────────────────────────────┴────────────┘

Use 'aigrc compliance check --profile <id>' to run compliance check.
```

### Step 2: Run Compliance Check

```bash
# Single profile
aigrc compliance check --profile eu-ai-act

# Multiple profiles
aigrc compliance check --profile eu-ai-act,nist-ai-rmf,iso-42001
```

**Output:**
```
🔍 Running compliance check...

Profile: EU AI Act (2024.1)
──────────────────────────────────────────────────────────

Asset: customer-chatbot
  Risk Level: Limited

  Requirements:
    ✅ Art. 50(1) - Transparency disclosure
    ✅ Art. 50(4) - AI-generated content labeling
    ⚠️ Art. 13 - Logging implementation (partial)

  Compliance: 85% (17/20 requirements met)

Asset: fraud-detector
  Risk Level: High

  Requirements:
    ✅ Art. 9 - Risk management system
    ❌ Art. 10 - Data governance documentation
    ❌ Art. 11 - Technical documentation
    ✅ Art. 12 - Record keeping
    ⚠️ Art. 13 - Transparency (partial)
    ✅ Art. 14 - Human oversight measures

  Compliance: 60% (12/20 requirements met)

──────────────────────────────────────────────────────────
Overall Compliance: 72%
Critical Gaps: 4
Warnings: 2
```

### Step 3: Generate Gap Analysis Report

```bash
aigrc compliance gap-analysis --profile eu-ai-act --output gap-report.md
```

**Generated Report (gap-report.md):**
```markdown
# EU AI Act Gap Analysis Report

Generated: 2026-01-09
Profile: EU AI Act (2024.1)
Assets Analyzed: 3

## Executive Summary

| Status | Count | Percentage |
|--------|-------|------------|
| Compliant | 12 | 60% |
| Partial | 5 | 25% |
| Non-Compliant | 3 | 15% |

## Critical Gaps

### 1. Data Governance Documentation (Art. 10)

**Affected Assets:** fraud-detector, risk-scorer
**Risk Level:** High
**Requirement:** Document training data characteristics

**Gap:** No data governance section in asset cards

**Remediation Steps:**
1. Add `data.governance` section to asset card
2. Document data sources and quality measures
3. Record bias testing results

**Priority:** High
**Effort:** 2-4 hours per asset

### 2. Technical Documentation (Art. 11)

**Affected Assets:** fraud-detector
**Risk Level:** High
**Requirement:** Comprehensive technical documentation

**Gap:** Missing system architecture and performance metrics

**Remediation Steps:**
1. Create technical documentation template
2. Document model architecture
3. Add performance benchmarks
4. Include testing methodology

**Priority:** High
**Effort:** 1-2 days
```

### Step 4: Generate Crosswalk Report

```bash
aigrc compliance crosswalk --profiles eu-ai-act,nist-ai-rmf,iso-42001
```

**Output:**
```
Cross-Framework Mapping Report
══════════════════════════════════════════════════════════════

┌─────────────────────┬─────────────────────┬─────────────────────┐
│ EU AI Act           │ NIST AI RMF         │ ISO 42001           │
├─────────────────────┼─────────────────────┼─────────────────────┤
│ Art. 9 Risk Mgmt    │ GOVERN 1.1          │ 6.1.1               │
│                     │ MAP 1.1-1.6         │ 6.1.2               │
│                     │ MEASURE 1.1-1.3     │                     │
├─────────────────────┼─────────────────────┼─────────────────────┤
│ Art. 10 Data Gov    │ MAP 1.3             │ 7.2                 │
│                     │ GOVERN 3.2          │ 7.3                 │
├─────────────────────┼─────────────────────┼─────────────────────┤
│ Art. 11 Tech Docs   │ GOVERN 4.2          │ 7.5                 │
│                     │ MAP 2.3             │                     │
├─────────────────────┼─────────────────────┼─────────────────────┤
│ Art. 12 Logging     │ MEASURE 2.3         │ 9.1                 │
│                     │ MEASURE 2.5         │ 9.2                 │
├─────────────────────┼─────────────────────┼─────────────────────┤
│ Art. 14 Human Over  │ GOVERN 1.4          │ 8.1                 │
│                     │ MAP 3.4             │ 5.2                 │
└─────────────────────┴─────────────────────┴─────────────────────┘

Insight: Meeting EU AI Act Art. 9 also satisfies:
  - NIST AI RMF: GOVERN 1.1, MAP 1.1-1.6, MEASURE 1.1-1.3
  - ISO 42001: 6.1.1, 6.1.2

  Efficiency gain: 1 implementation, 3 frameworks covered
```

### Step 5: Configure Project Compliance

```yaml
# .aigrc/aigrc.yaml
version: "1.0"
project:
  name: my-ai-project
  organization: Acme Corp

compliance:
  profiles:
    - eu-ai-act
    - nist-ai-rmf

  # Override settings
  settings:
    eu-ai-act:
      strictness: high
      enforce_high_risk: true
    nist-ai-rmf:
      lifecycle_stage: deploy
```

### Step 6: Create Custom Profile

For organization-specific policies:

```yaml
# .aigrc/profiles/acme-policy.yaml
profile:
  id: acme-internal
  name: Acme Corp AI Policy
  version: "1.0"
  jurisdiction: Internal

inherits:
  - eu-ai-act  # Build on EU AI Act

requirements:
  - id: acme-001
    title: Security Review Required
    description: All AI systems must pass security review
    applies_to:
      risk_levels: [high, limited]
    controls:
      - id: security-review
        title: Security Review Approval
        validation:
          field: approvals.security_review
          required: true

  - id: acme-002
    title: Data Classification
    description: All training data must be classified
    applies_to:
      risk_levels: [high, limited, minimal]
    controls:
      - id: data-classification
        title: Data Classification Label
        validation:
          field: data.classification
          allowed_values: [public, internal, confidential, restricted]
```

---

## Practice Lab (15 min)

### Exercise 1: Compliance Assessment

1. Run compliance check against EU AI Act
2. Identify the top 3 gaps
3. Generate a gap analysis report
4. Propose remediation steps for each gap

### Exercise 2: Multi-Framework Mapping

1. Run crosswalk for EU AI Act + NIST AI RMF
2. Identify requirements that overlap
3. Calculate efficiency gain (requirements that serve multiple frameworks)

### Exercise 3: Custom Profile

1. Create a custom profile for your organization
2. Add at least 2 custom requirements
3. Run compliance check with your custom profile
4. Verify custom requirements are evaluated

---

## Knowledge Check

1. **A compliance profile defines:**
   - a) How to write code
   - b) Regulatory requirements and controls ✓
   - c) User interface designs
   - d) Database schemas

2. **Gap analysis compares:**
   - a) Two different codebases
   - b) Current state vs required state ✓
   - c) Different AI models
   - d) Development environments

3. **A crosswalk report shows:**
   - a) How to walk across a street
   - b) Mapping between different frameworks ✓
   - c) Network traffic analysis
   - d) Code coverage metrics

4. **Custom profiles can:**
   - a) Only add requirements
   - b) Only remove requirements
   - c) Inherit from and extend other profiles ✓
   - d) Replace the AIGRC system

---

## Key Takeaways

1. **Multiple jurisdictions = multiple requirements** - AIGRC unifies them
2. **Profiles encode regulatory knowledge** - Reusable compliance definitions
3. **Gap analysis shows what's missing** - Prioritized remediation
4. **Crosswalks find efficiency** - One implementation, many frameworks
5. **Custom profiles extend base profiles** - Add organization-specific rules

---

## Compliance Profile Reference

### Profile Locations

| Profile | Location |
|---------|----------|
| EU AI Act | `aigrc/packages/mcp/profiles/eu-ai-act.yaml` |
| NIST AI RMF | `aigrc/packages/mcp/profiles/nist-ai-rmf.yaml` |
| ISO 42001 | `aigrc/packages/mcp/profiles/iso-42001.yaml` |
| US OMB M-24 | `aigrc/packages/mcp/profiles/us-omb-m24.yaml` |
| Custom | `.aigrc/profiles/<name>.yaml` |

### Sample Artifacts

| Artifact | Location |
|----------|----------|
| Conformity Declaration | `test-environment/.aigrc/artifacts/eu-ai-act/conformity-declaration.md` |
| Risk Management Plan | `test-environment/.aigrc/artifacts/eu-ai-act/risk-management-plan.md` |
| Technical Documentation | `test-environment/.aigrc/artifacts/eu-ai-act/technical-documentation.md` |

---

## Further Reading

- Multi-Jurisdiction Framework: `aigrc/docs/aigos_master_specs/AIGRC_Multi_Jurisdiction_Framework.md`
- EU AI Act Mapping: `aigrc/docs/concepts/eu-ai-act-mapping.md`
- Risk Classification: `aigrc/docs/concepts/risk-classification.md`

---

## Next Module

[Module 3.3: I2E Pipeline (Intent-to-Enforcement) →](./03-i2e-pipeline.md)

---

*Module 3.2 - AIGRC Training Program v1.0*
