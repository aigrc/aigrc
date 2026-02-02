# AI Governance Maturity Methodology (AIGM)
<img width="1289" height="700" alt="image" src="https://github.com/user-attachments/assets/afcce9dc-f39e-4df9-8ae1-a9c561b4e6e3" />

## The AIRegMap Corporate Assessment Framework

**Version:** 1.0  
**Status:** Draft for Public Comment  
**Effective Date:** Q2 2026  
**Maintained By:** S.Maitland Davies for PangoLabs / AIRegMap  
**License:** CC BY 4.0 (Open Methodology)

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Methodology Principles](#2-methodology-principles)
3. [Scope and Applicability](#3-scope-and-applicability)
4. [Assessment Framework](#4-assessment-framework)
5. [Scoring Dimensions](#5-scoring-dimensions)
6. [Indicator Specifications](#6-indicator-specifications)
7. [Weighting Methodology](#7-weighting-methodology)
8. [Industry Adjustments](#8-industry-adjustments)
9. [Incident Impact Model](#9-incident-impact-model)
10. [Maturity Tiers](#10-maturity-tiers)
11. [Data Sources and Evidence](#11-data-sources-and-evidence)
12. [Assessment Process](#12-assessment-process)
13. [Score Calculation](#13-score-calculation)
14. [Standards Alignment](#14-standards-alignment)
15. [Methodology Governance](#15-methodology-governance)
16. [Limitations and Disclaimers](#16-limitations-and-disclaimers)
17. [Appendices](#17-appendices)

---

## 1. Executive Summary

### 1.1 Purpose

The AI Governance Maturity Methodology (AIGM) provides a transparent, reproducible framework for assessing the AI governance posture of organizations. Unlike proprietary ESG-based approaches that treat AI as an addendum to existing frameworks, AIGM is purpose-built to evaluate the unique characteristics of AI systems governance.


### 1.2 Key Differentiators

| Traditional ESG AI Ratings             | AIGM Approach                             |
| -------------------------------------- | ----------------------------------------- |
| Proprietary, opaque methodology        | Open, auditable methodology               |
| AI as subcategory of "Technology Risk" | AI-native assessment framework            |
| Binary compliance checks               | Maturity spectrum with progression paths  |
| Generic across industries              | Industry-specific risk adjustments        |
| Static annual assessments              | Dynamic scoring with incident integration |
| Disconnected from regulations          | Mapped to specific regulatory obligations |

### 1.3 Output

AIGM produces:

1. **Overall Maturity Score** (0-100 scale)
2. **Maturity Tier** (Leader / Advanced / Developing / Emerging / Laggard)
3. **Dimension Scores** (5 pillars, each 0-100)
4. **Regulatory Compliance Posture** (by applicable regulation)
5. **Industry Benchmark Percentile**
6. **Incident-Adjusted Score** (reflecting real-world performance)

### 1.4 Design Philosophy

AIGM is built on the principle that **governance maturity is demonstrated through evidence, not claims**. The methodology emphasizes:

- **Observable behaviors** over stated policies
- **Operational implementation** over documentation
- **Continuous improvement** over point-in-time compliance
- **Proportionality** to AI risk exposure
- **Transparency** in both methodology and results
<img width="1298" height="700" alt="image" src="https://github.com/user-attachments/assets/b3909936-306a-4a04-ba5b-53acace2946c" />
---

## 2. Methodology Principles

### 2.1 Core Principles

#### Principle 1: Transparency

The complete methodology is publicly available. Any organization can understand exactly how scores are calculated and what evidence is weighted.

#### Principle 2: Evidence-Based

Scores are derived from verifiable evidence. Claims without substantiation receive no credit. Self-reported data is weighted lower than independently verified data.

#### Principle 3: AI-Native

The framework addresses AI-specific risks including model drift, training data governance, emergent capabilities, and autonomous system oversight—not just generic technology governance.

#### Principle 4: Proportionality

Organizations deploying high-risk AI systems are held to higher standards than those using AI for low-stakes applications. The framework adjusts expectations based on AI risk exposure.

#### Principle 5: Actionability

Scores are designed to be actionable. Organizations can identify specific gaps and improvement paths, not just receive an opaque rating.

#### Principle 6: Dynamic

Scores evolve based on real-world performance. Incidents, regulatory actions, and remediation efforts are reflected in near-real-time score adjustments.

### 2.2 What AIGM Measures

AIGM assesses an organization's **capability and demonstrated practice** in governing AI systems across their lifecycle:

```
┌─────────────────────────────────────────────────────────────────────────┐
│                      AI SYSTEM LIFECYCLE                                │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│   STRATEGY        DEVELOPMENT       DEPLOYMENT        OPERATIONS        │
│   ┌───────┐       ┌───────┐        ┌───────┐        ┌───────┐         │
│   │Policy │──────▶│Design │───────▶│Release│───────▶│Monitor│         │
│   │Intent │       │Build  │        │Launch │        │Maintain│         │
│   │Ethics │       │Test   │        │Scale  │        │Retire │         │
│   └───────┘       └───────┘        └───────┘        └───────┘         │
│       │               │                │                │              │
│       ▼               ▼                ▼                ▼              │
│   ┌─────────────────────────────────────────────────────────────────┐ │
│   │                    GOVERNANCE LAYER (AIGM SCOPE)                │ │
│   │  • Accountability  • Risk Management  • Compliance  • Oversight │ │
│   └─────────────────────────────────────────────────────────────────┘ │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### 2.3 What AIGM Does NOT Measure

- **Technical AI capability** (model accuracy, performance benchmarks)
- **AI adoption level** (how much AI a company uses)
- **AI innovation** (R&D investment, patent counts)
- **General corporate governance** (board independence, executive compensation)
- **Non-AI technology governance** (cybersecurity, IT operations)

---

## 3. Scope and Applicability

### 3.1 Eligible Organizations

AIGM assessments are applicable to:

| Category                    | Inclusion Criteria                                    |
| --------------------------- | ----------------------------------------------------- |
| **Public Companies**        | Listed on major exchanges (NYSE, NASDAQ, LSE, etc.)   |
| **Large Private Companies** | Revenue >$500M or >1,000 employees                    |
| **AI-Intensive SMEs**       | AI is core to the business model regardless of size   |
| **Government Entities**     | Federal agencies, state/provincial bodies             |
| **Critical Infrastructure** | Healthcare systems, financial institutions, utilities |

### 3.2 AI Scope Definition

An organization's "AI footprint" for AIGM purposes includes:

**In Scope:**

- AI systems developed internally
- AI systems procured from vendors and deployed
- AI embedded in products/services sold to customers
- AI used in internal operations (HR, finance, security)
- AI research and development activities
- Generative AI tools are deployed to employees

**Out of Scope:**

- Traditional rule-based automation (no ML component)
- Basic analytics and business intelligence
- AI systems used by customers on third-party platforms
- Purely theoretical AI research with no deployment path

### 3.3 Jurisdictional Scope

AIGM is a global methodology. Regulatory compliance assessments are jurisdiction-specific based on:

- Organization's headquarters location
- Markets where AI systems are deployed
- Locations of data subjects affected by AI decisions
- Regulatory obligations in each applicable jurisdiction

---

## 4. Assessment Framework

### 4.1 Framework Structure

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         AIGM FRAMEWORK                                  │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│                        OVERALL MATURITY SCORE                           │
│                            (0-100)                                      │
│                               │                                         │
│         ┌─────────┬─────────┬─┴───────┬─────────┬─────────┐           │
│         │         │         │         │         │         │           │
│         ▼         ▼         ▼         ▼         ▼         ▼           │
│    ┌────────┐┌────────┐┌────────┐┌────────┐┌────────┐                 │
│    │POLICY &││GOVERN- ││  RISK  ││TRANSPAR││COMPLI- │                 │
│    │COMMIT- ││  ANCE  ││MANAGE- ││ -ENCY &││ -ANCE  │                 │
│    │ MENT   ││STRUCT- ││ MENT   ││DISCLOS-││POSTURE │                 │
│    │        ││  URE   ││        ││  URE   ││        │                 │
│    │  20%   ││  20%   ││  25%   ││  20%   ││  15%   │                 │
│    └───┬────┘└───┬────┘└───┬────┘└───┬────┘└───┬────┘                 │
│        │         │         │         │         │                       │
│        ▼         ▼         ▼         ▼         ▼                       │
│    ┌────────────────────────────────────────────────┐                 │
│    │              INDICATORS (42 Total)             │                 │
│    │         8-10 indicators per dimension          │                 │
│    └────────────────────────────────────────────────┘                 │
│                               │                                         │
│                               ▼                                         │
│    ┌────────────────────────────────────────────────┐                 │
│    │              ADJUSTMENTS                       │                 │
│    │  • Industry Risk Multiplier                    │                 │
│    │  • Incident Impact Deductions                  │                 │
│    │  • Remediation Credits                         │                 │
│    └────────────────────────────────────────────────┘                 │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### 4.2 Dimension Overview

| Dimension                     | Weight | Focus                     | Key Question                                       |
| ----------------------------- | ------ | ------------------------- | -------------------------------------------------- |
| **Policy & Commitment**       | 20%    | Strategic intent          | "Does leadership prioritize AI governance?"        |
| **Governance Structure**      | 20%    | Organizational capability | "Is there clear accountability and oversight?"     |
| **Risk Management**           | 25%    | Operational controls      | "Are AI risks identified and mitigated?"           |
| **Transparency & Disclosure** | 20%    | External accountability   | "Is AI use communicated responsibly?"              |
| **Compliance Posture**        | 15%    | Regulatory alignment      | "Is the organization prepared for AI regulations?" |

### 4.3 Scoring Logic

Each indicator is scored on a 0-4 scale:

| Score | Level           | Description                                  |
| ----- | --------------- | -------------------------------------------- |
| 0     | **None**        | No evidence of practice                      |
| 1     | **Initial**     | Ad hoc, inconsistent practice                |
| 2     | **Developing**  | Documented but not fully implemented         |
| 3     | **Established** | Consistently implemented across organization |
| 4     | **Optimizing**  | Continuously improved, industry-leading      |

Indicator scores are converted to 0-100 scale: `(Score / 4) × 100`

---

## 5. Scoring Dimensions

### 5.1 Dimension 1: Policy & Commitment (20%)

**Purpose:** Assess the organization's strategic commitment to AI governance at the highest levels.

**Rationale:** Effective AI governance requires tone from the top. Without leadership commitment and clear policy direction, operational controls will be inconsistent and under-resourced.

#### Indicators

| ID   | Indicator                           | Weight | Evidence Sources                                  |
| ---- | ----------------------------------- | ------ | ------------------------------------------------- |
| P1.1 | Published AI Ethics Policy          | 12%    | Website, annual report, policy documents          |
| P1.2 | Board-Level AI Oversight            | 15%    | Proxy statements, board committee charters        |
| P1.3 | C-Suite Accountability              | 15%    | Organizational charts, executive responsibilities |
| P1.4 | AI Principles Specificity           | 10%    | Policy content analysis                           |
| P1.5 | Stakeholder Engagement              | 10%    | Public consultations, advisory boards             |
| P1.6 | Resource Commitment                 | 13%    | Budget disclosures, headcount, investments        |
| P1.7 | Integration with Corporate Strategy | 12%    | Strategic plans, investor communications          |
| P1.8 | Public Commitment Statements        | 13%    | CEO letters, public pledges, industry coalitions  |

#### Scoring Rubric: P1.1 (Published AI Ethics Policy)

| Score | Criteria                                                                                |
| ----- | --------------------------------------------------------------------------------------- |
| 0     | No AI ethics policy publicly available                                                  |
| 1     | Generic technology ethics mention; AI not specifically addressed                        |
| 2     | AI-specific policy exists but lacks detail or implementation guidance                   |
| 3     | Comprehensive AI ethics policy with principles, scope, and implementation               |
| 4     | Industry-leading policy with regular reviews, public version history, stakeholder input |

---

### 5.2 Dimension 2: Governance Structure (20%)

**Purpose:** Assess the organizational structures, roles, and processes that enable AI governance.

**Rationale:** Policy without structure is aspirational. Effective governance requires clear accountability, defined roles, cross-functional coordination, and adequate expertise.

#### Indicators

| ID   | Indicator                        | Weight | Evidence Sources                                 |
| ---- | -------------------------------- | ------ | ------------------------------------------------ |
| G2.1 | Dedicated AI Governance Function | 15%    | Org charts, job postings, LinkedIn profiles      |
| G2.2 | AI Ethics Board/Committee        | 12%    | Committee charters, meeting disclosures          |
| G2.3 | Cross-Functional Coordination    | 12%    | Process documentation, org structure             |
| G2.4 | Clear Roles and Responsibilities | 13%    | RACI matrices, role definitions                  |
| G2.5 | Escalation Pathways              | 10%    | Incident response plans, decision frameworks     |
| G2.6 | External Advisory Mechanisms     | 10%    | Advisory board composition, expert consultations |
| G2.7 | AI Governance Training Programs  | 15%    | Training materials, completion rates             |
| G2.8 | Governance Documentation         | 13%    | Policy repositories, version control             |

#### Scoring Rubric: G2.1 (Dedicated AI Governance Function)

| Score | Criteria                                                                                                  |
| ----- | --------------------------------------------------------------------------------------------------------- |
| 0     | No dedicated AI governance personnel                                                                      |
| 1     | AI governance is part-time responsibility of existing role                                                |
| 2     | Dedicated AI governance role(s) but limited scope or authority                                            |
| 3     | Established AI governance team with clear mandate and authority                                           |
| 4     | Mature AI governance function with executive sponsorship, adequate staffing, and organizational influence |

---

### 5.3 Dimension 3: Risk Management (25%)

**Purpose:** Assess the operational controls for identifying, assessing, mitigating, and monitoring AI risks.

**Rationale:** This is the largest dimension because operational risk management is where governance translates into outcomes. Poor risk management leads to incidents regardless of policy strength.

#### Indicators

| ID   | Indicator                      | Weight | Evidence Sources                                   |
| ---- | ------------------------------ | ------ | -------------------------------------------------- |
| R3.1 | AI System Inventory            | 10%    | System registries, model cards                     |
| R3.2 | Risk Assessment Process        | 12%    | Risk assessment frameworks, documentation          |
| R3.3 | Bias Testing and Mitigation    | 12%    | Fairness metrics, testing reports                  |
| R3.4 | Data Governance for AI         | 10%    | Data lineage, quality controls, consent management |
| R3.5 | Model Validation and Testing   | 12%    | Testing protocols, validation reports              |
| R3.6 | Human Oversight Mechanisms     | 10%    | Human-in-the-loop processes, override capabilities |
| R3.7 | Incident Response Capability   | 12%    | IR plans, tabletop exercises, response metrics     |
| R3.8 | Third-Party AI Risk Management | 10%    | Vendor assessments, contractual controls           |
| R3.9 | Continuous Monitoring          | 12%    | Monitoring dashboards, drift detection, alerting   |

#### Scoring Rubric: R3.1 (AI System Inventory)

| Score | Criteria                                                                                            |
| ----- | --------------------------------------------------------------------------------------------------- |
| 0     | No inventory of AI systems exists                                                                   |
| 1     | Partial inventory; significant gaps; no standard format                                             |
| 2     | Inventory exists but incomplete or not regularly updated                                            |
| 3     | Comprehensive inventory with risk classifications, regularly maintained                             |
| 4     | Real-time inventory with automated discovery, full lifecycle tracking, integrated with risk systems |

#### Scoring Rubric: R3.3 (Bias Testing and Mitigation)

| Score | Criteria                                                                                               |
| ----- | ------------------------------------------------------------------------------------------------------ |
| 0     | No bias testing performed                                                                              |
| 1     | Ad hoc bias testing on some systems; no standard methodology                                           |
| 2     | Bias testing methodology defined but inconsistently applied                                            |
| 3     | Systematic bias testing across high-risk AI systems with documented results                            |
| 4     | Comprehensive fairness program with multiple metrics, ongoing monitoring, public reporting on outcomes |

---

### 5.4 Dimension 4: Transparency & Disclosure (20%)

**Purpose:** Assess the organization's transparency about AI use with customers, regulators, and the public.

**Rationale:** External accountability through disclosure creates pressure for internal rigor. Organizations that hide AI use often have weaker internal governance.

#### Indicators

| ID   | Indicator                           | Weight | Evidence Sources                                    |
| ---- | ----------------------------------- | ------ | --------------------------------------------------- |
| T4.1 | AI Use Disclosure to Users          | 15%    | Product documentation, terms of service, UI notices |
| T4.2 | Algorithmic Transparency            | 12%    | Model cards, system cards, explanations             |
| T4.3 | AI in Annual/Sustainability Reports | 13%    | 10-K filings, sustainability reports                |
| T4.4 | Regulatory Disclosure               | 12%    | SEC filings, regulatory submissions                 |
| T4.5 | Explainability Capabilities         | 13%    | XAI implementations, explanation interfaces         |
| T4.6 | External Audit/Assurance            | 15%    | Third-party audits, attestations, certifications    |
| T4.7 | Incident Disclosure                 | 10%    | Public incident reports, breach notifications       |
| T4.8 | Stakeholder Communication Channels  | 10%    | Feedback mechanisms, complaint processes            |

#### Scoring Rubric: T4.6 (External Audit/Assurance)

| Score | Criteria                                                                                                                  |
| ----- | ------------------------------------------------------------------------------------------------------------------------- |
| 0     | No external audits or assurance on AI systems                                                                             |
| 1     | General IT audits that peripherally cover AI                                                                              |
| 2     | AI-specific audits performed but limited scope or one-time                                                                |
| 3     | Regular AI audits by qualified third parties with published findings                                                      |
| 4     | Comprehensive assurance program including ISO 42001 certification, regular algorithmic audits, public attestation reports |

---

### 5.5 Dimension 5: Compliance Posture (15%)

**Purpose:** Assess preparedness for current and emerging AI regulations.

**Rationale:** Regulatory compliance is a lagging indicator of governance maturity, but proactive compliance preparation demonstrates organizational capability.

#### Indicators

| ID   | Indicator                  | Weight | Evidence Sources                                              |
| ---- | -------------------------- | ------ | ------------------------------------------------------------- |
| C5.1 | Regulatory Monitoring      | 12%    | Regulatory tracking processes, legal/compliance resources     |
| C5.2 | EU AI Act Readiness        | 18%    | Gap assessments, implementation plans                         |
| C5.3 | US State Law Compliance    | 15%    | Compliance programs for Colorado, NYC LL144, etc.             |
| C5.4 | Sector-Specific Compliance | 15%    | Industry-specific AI requirements (healthcare, finance)       |
| C5.5 | Standards Alignment        | 15%    | ISO 42001, NIST AI RMF, IEEE standards adoption               |
| C5.6 | Documentation Readiness    | 13%    | Technical documentation, conformity assessments               |
| C5.7 | Regulatory Engagement      | 12%    | Comment letters, industry working groups, regulatory dialogue |

#### Scoring Rubric: C5.2 (EU AI Act Readiness)

| Score | Criteria                                                                                   |
| ----- | ------------------------------------------------------------------------------------------ |
| 0     | No awareness or preparation for EU AI Act                                                  |
| 1     | Aware of EU AI Act but no formal assessment or preparation                                 |
| 2     | Gap assessment completed; implementation planning underway                                 |
| 3     | Implementation in progress; high-risk systems identified and being addressed               |
| 4     | Full compliance achieved or on track; conformity assessments complete; documentation ready |

**Note:** Score of N/A assigned if organization has no EU market exposure.

---

## 6. Indicator Specifications

### 6.1 Complete Indicator Reference

The following table provides the complete indicator set with scoring guidance:

| ID                                               | Indicator                        | Max Score | Evidence Requirements       | Verification Method      |
| ------------------------------------------------ | -------------------------------- | --------- | --------------------------- | ------------------------ |
| **Dimension 1: Policy & Commitment (20%)**       |                                  |           |                             |                          |
| P1.1                                             | Published AI Ethics Policy       | 4         | Public policy document      | Direct observation       |
| P1.2                                             | Board-Level AI Oversight         | 4         | Proxy, committee charter    | Document review          |
| P1.3                                             | C-Suite Accountability           | 4         | Org chart, responsibilities | Document review          |
| P1.4                                             | AI Principles Specificity        | 4         | Policy content              | Content analysis         |
| P1.5                                             | Stakeholder Engagement           | 4         | Consultation records        | Document review          |
| P1.6                                             | Resource Commitment              | 4         | Budget, headcount           | Disclosure analysis      |
| P1.7                                             | Integration with Strategy        | 4         | Strategic documents         | Document review          |
| P1.8                                             | Public Commitment Statements     | 4         | Public communications       | Direct observation       |
| **Dimension 2: Governance Structure (20%)**      |                                  |           |                             |                          |
| G2.1                                             | Dedicated AI Governance Function | 4         | Org structure, roles        | LinkedIn, job posts      |
| G2.2                                             | AI Ethics Board/Committee        | 4         | Committee charter           | Document review          |
| G2.3                                             | Cross-Functional Coordination    | 4         | Process documents           | Document review          |
| G2.4                                             | Clear Roles and Responsibilities | 4         | RACI, role definitions      | Document review          |
| G2.5                                             | Escalation Pathways              | 4         | IR plans, frameworks        | Document review          |
| G2.6                                             | External Advisory Mechanisms     | 4         | Advisory board info         | Public disclosure        |
| G2.7                                             | AI Governance Training           | 4         | Training programs           | Disclosure, job posts    |
| G2.8                                             | Governance Documentation         | 4         | Documentation practices     | Document review          |
| **Dimension 3: Risk Management (25%)**           |                                  |           |                             |                          |
| R3.1                                             | AI System Inventory              | 4         | System registries           | Self-report, inference   |
| R3.2                                             | Risk Assessment Process          | 4         | Risk frameworks             | Document review          |
| R3.3                                             | Bias Testing and Mitigation      | 4         | Testing reports             | Disclosure, audit        |
| R3.4                                             | Data Governance for AI           | 4         | Data practices              | Document review          |
| R3.5                                             | Model Validation and Testing     | 4         | Testing protocols           | Document review          |
| R3.6                                             | Human Oversight Mechanisms       | 4         | HITL processes              | Product analysis         |
| R3.7                                             | Incident Response Capability     | 4         | IR plans, exercises         | Document review          |
| R3.8                                             | Third-Party AI Risk Management   | 4         | Vendor assessments          | Document review          |
| R3.9                                             | Continuous Monitoring            | 4         | Monitoring systems          | Disclosure, inference    |
| **Dimension 4: Transparency & Disclosure (20%)** |                                  |           |                             |                          |
| T4.1                                             | AI Use Disclosure to Users       | 4         | Product documentation       | Direct observation       |
| T4.2                                             | Algorithmic Transparency         | 4         | Model/system cards          | Public disclosure        |
| T4.3                                             | AI in Annual Reports             | 4         | 10-K, sustainability        | Document review          |
| T4.4                                             | Regulatory Disclosure            | 4         | SEC filings                 | Document review          |
| T4.5                                             | Explainability Capabilities      | 4         | XAI implementations         | Product analysis         |
| T4.6                                             | External Audit/Assurance         | 4         | Audit reports               | Third-party verification |
| T4.7                                             | Incident Disclosure              | 4         | Public incident reports     | Direct observation       |
| T4.8                                             | Stakeholder Communication        | 4         | Feedback mechanisms         | Direct observation       |
| **Dimension 5: Compliance Posture (15%)**        |                                  |           |                             |                          |
| C5.1                                             | Regulatory Monitoring            | 4         | Tracking processes          | Disclosure, inference    |
| C5.2                                             | EU AI Act Readiness              | 4         | Gap assessments             | Self-report, inference   |
| C5.3                                             | US State Law Compliance          | 4         | Compliance programs         | Disclosure, audit        |
| C5.4                                             | Sector-Specific Compliance       | 4         | Industry requirements       | Document review          |
| C5.5                                             | Standards Alignment              | 4         | Certifications, adoption    | Third-party verification |
| C5.6                                             | Documentation Readiness          | 4         | Technical documentation     | Document review          |
| C5.7                                             | Regulatory Engagement            | 4         | Comment letters, groups     | Public records           |

---

## 7. Weighting Methodology

### 7.1 Base Weights

| Dimension                 | Base Weight | Rationale                                          |
| ------------------------- | ----------- | -------------------------------------------------- |
| Policy & Commitment       | 20%         | Foundation, but insufficient alone                 |
| Governance Structure      | 20%         | Enables execution of policy                        |
| Risk Management           | 25%         | Highest weight—operational controls drive outcomes |
| Transparency & Disclosure | 20%         | External accountability mechanism                  |
| Compliance Posture        | 15%         | Important but lagging indicator                    |

### 7.2 Within-Dimension Weights

Indicators within each dimension are weighted based on:

1. **Impact on Outcomes** — Indicators more predictive of real-world performance receive higher weight
2. **Evidence Quality** — Indicators with verifiable evidence receive higher weight
3. **Universality** — Indicators applicable across industries receive higher weight

### 7.3 Weight Adjustments

Weights may be adjusted based on:

| Factor                      | Adjustment                            |
| --------------------------- | ------------------------------------- |
| **High-Risk AI Deployer**   | Risk Management +5%, Compliance +3%   |
| **Consumer-Facing AI**      | Transparency +5%                      |
| **Regulated Industry**      | Compliance +5%                        |
| **AI Developer (sells AI)** | Risk Management +5%, Transparency +3% |

---

## 8. Industry Adjustments

### 8.1 Industry Risk Tiers

Organizations are classified by AI risk exposure:

| Tier                 | Industries                                                                                                              | Risk Multiplier |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------- | --------------- |
| **Tier 1: Critical** | Healthcare (clinical AI), Financial Services (credit/trading), Employment/HR Tech, Law Enforcement, Autonomous Vehicles | 1.2x            |
| **Tier 2: High**     | Insurance, Education (admissions/assessment), Social Media/Content, Legal Tech, Government Services                     | 1.1x            |
| **Tier 3: Standard** | Retail, Manufacturing, Logistics, Telecommunications, Media/Entertainment                                               | 1.0x            |
| **Tier 4: Lower**    | Agriculture, Construction, Hospitality (non-personalization)                                                            | 0.9x            |

### 8.2 Risk Multiplier Application

The Industry Risk Multiplier adjusts the **minimum threshold** for each maturity tier:

```
Adjusted Threshold = Base Threshold × Industry Risk Multiplier
```

**Example:** 

- Base threshold for "Leader" tier = 80
- Healthcare company (Tier 1, 1.2x multiplier)
- Adjusted threshold = 80 × 1.2 = 96

This means healthcare companies must score higher to achieve the same tier designation.

### 8.3 Industry-Specific Indicators

Certain indicators have industry-specific interpretations:

| Indicator              | Financial Services Interpretation                  | Healthcare Interpretation                      |
| ---------------------- | -------------------------------------------------- | ---------------------------------------------- |
| R3.3 Bias Testing      | Fair lending analysis, adverse action explanations | Clinical outcome equity across demographics    |
| C5.4 Sector Compliance | SR 11-7 model risk management, ECOA/FCRA           | FDA AI/ML guidance, HIPAA, clinical validation |
| R3.6 Human Oversight   | Human review of credit denials                     | Clinician oversight of AI recommendations      |

---

## 9. Incident Impact Model

### 9.1 Incident Integration Philosophy

Real-world incidents are the ultimate test of governance effectiveness. AIGM integrates incident data to ensure scores reflect actual performance, not just policy documentation.

### 9.2 Incident Severity Classification

| Severity     | Definition                                                                                         | Examples                                                           | Base Deduction    |
| ------------ | -------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ | ----------------- |
| **Critical** | Regulatory enforcement action >$10M, criminal investigation, widespread physical harm              | FTC consent decree, DOJ investigation, fatalities attributed to AI | -15 to -25 points |
| **High**     | Class action lawsuit, major data breach, significant discrimination finding, regulatory fine <$10M | Bias lawsuit, GDPR fine, EEOC finding                              | -10 to -15 points |
| **Medium**   | Public controversy, customer complaints, minor regulatory action, operational disruption           | Media exposé, complaint spike, warning letter                      | -5 to -10 points  |
| **Low**      | Self-identified issues, minor incidents, quickly remediated                                        | Internal audit finding, isolated customer complaint                | -2 to -5 points   |

### 9.3 Incident Deduction Formula

```
Incident Deduction = Base Deduction × Recency Factor × Response Factor × Repeat Factor
```

**Recency Factor:**
| Time Since Incident | Factor |
|--------------------|--------|
| < 6 months | 1.0 |
| 6-12 months | 0.8 |
| 12-18 months | 0.6 |
| 18-24 months | 0.4 |
| > 24 months | 0.2 |

**Response Factor:**
| Response Quality | Factor |
|-----------------|--------|
| Exemplary (proactive disclosure, full remediation, systemic changes) | 0.5 |
| Good (timely response, adequate remediation) | 0.75 |
| Adequate (eventual compliance, basic remediation) | 1.0 |
| Poor (delayed, incomplete, defensive) | 1.25 |
| None/Denial | 1.5 |

**Repeat Factor:**
| Incident History | Factor |
|-----------------|--------|
| First incident of type | 1.0 |
| Second incident of type | 1.3 |
| Third+ incident of type | 1.5 |

### 9.4 Incident Score Recovery

Organizations can recover from incident deductions through:

| Recovery Action                          | Recovery Credit       |
| ---------------------------------------- | --------------------- |
| Third-party audit completion             | +2 to +5 points       |
| Public remediation report                | +1 to +3 points       |
| Systemic process improvements (verified) | +2 to +5 points       |
| Industry-leading response                | +1 to +3 points       |
| Time passage (clean record)              | +1 point per 6 months |

### 9.5 Incident Cap

Total incident deductions are capped at -40 points to prevent a single catastrophic event from permanently defining an organization's score.

---

## 10. Maturity Tiers

### 10.1 Tier Definitions

| Tier              | Score Range | Description                         | Characteristics                                                                     |
| ----------------- | ----------- | ----------------------------------- | ----------------------------------------------------------------------------------- |
| 🟢 **Leader**     | 80-100      | Best-in-class AI governance         | Comprehensive governance, proactive approach, industry benchmark, minimal incidents |
| 🔵 **Advanced**   | 60-79       | Mature governance with minor gaps   | Strong foundation, most controls in place, active improvement, occasional gaps      |
| 🟡 **Developing** | 40-59       | Basic governance, significant gaps  | Policy exists, partial implementation, reactive approach, noticeable gaps           |
| 🟠 **Emerging**   | 20-39       | Minimal governance, mostly reactive | Limited policy, ad hoc practices, minimal oversight, frequent gaps                  |
| 🔴 **Laggard**    | 0-19        | No meaningful AI governance         | No visible governance, high risk exposure, likely incidents                         |

### 10.2 Tier Distribution Targets

AIGM does not force a distribution, but based on methodology design, expected distribution across Fortune 500:

| Tier       | Expected % | Actual will vary     |
| ---------- | ---------- | -------------------- |
| Leader     | 5-10%      | Top performers       |
| Advanced   | 15-25%     | Above average        |
| Developing | 35-45%     | Average, most common |
| Emerging   | 20-30%     | Below average        |
| Laggard    | 5-15%      | Lowest performers    |

### 10.3 Tier Movement

Organizations can move between tiers based on:

| Trigger                               | Direction | Typical Impact                  |
| ------------------------------------- | --------- | ------------------------------- |
| Governance investments                | ↑ Up      | +5 to +15 points over 12 months |
| Certification achievement (ISO 42001) | ↑ Up      | +8 to +12 points                |
| Major incident                        | ↓ Down    | -10 to -25 points immediately   |
| Regulatory action                     | ↓ Down    | -15 to -25 points               |
| Remediation completion                | ↑ Up      | +5 to +10 points                |

---

## 11. Data Sources and Evidence

### 11.1 Data Source Hierarchy

Evidence is weighted by reliability:

| Tier       | Source Type                 | Weight Modifier | Examples                                             |
| ---------- | --------------------------- | --------------- | ---------------------------------------------------- |
| **Tier 1** | Third-party verified        | 1.0x            | Audit reports, certifications, regulatory filings    |
| **Tier 2** | Official company disclosure | 0.9x            | Annual reports, proxy statements, official policies  |
| **Tier 3** | Public observation          | 0.8x            | Product documentation, website content, job postings |
| **Tier 4** | Self-reported (verified)    | 0.7x            | Company-submitted questionnaire with evidence        |
| **Tier 5** | Self-reported (unverified)  | 0.5x            | Claims without supporting documentation              |
| **Tier 6** | Inference                   | 0.4x            | Analyst estimates, industry benchmarks               |

### 11.2 Primary Data Sources

| Source                            | Data Type                                                 | Update Frequency |
| --------------------------------- | --------------------------------------------------------- | ---------------- |
| **SEC EDGAR**                     | 10-K AI risk disclosures, proxy statements, 8-K incidents | Real-time        |
| **Company Websites**              | AI ethics policies, responsible AI pages, model cards     | Monthly scan     |
| **Annual/Sustainability Reports** | AI sections, governance disclosures                       | Annual           |
| **Job Postings**                  | AI governance roles, compliance positions                 | Weekly scan      |
| **News/Media**                    | Incidents, controversies, announcements                   | Daily monitoring |
| **AIID (AI Incident Database)**   | Verified incident reports                                 | Continuous       |
| **Regulatory Databases**          | Enforcement actions, consent decrees, fines               | Continuous       |
| **Certification Bodies**          | ISO 42001 certifications, SOC 2 attestations              | Quarterly        |
| **Patent Databases**              | AI governance-related IP                                  | Quarterly        |
| **LinkedIn**                      | AI governance team composition, hiring                    | Monthly          |

### 11.3 Evidence Requirements

For each indicator, evidence must meet:

| Criterion        | Requirement                                                        |
| ---------------- | ------------------------------------------------------------------ |
| **Authenticity** | From official source, verifiable link/citation                     |
| **Recency**      | Within 18 months for policies, 12 months for operational practices |
| **Specificity**  | Explicitly addresses the indicator; not inferred                   |
| **Completeness** | Sufficient detail to assess implementation level                   |

### 11.4 Missing Data Handling

| Scenario               | Treatment                                                      |
| ---------------------- | -------------------------------------------------------------- |
| No evidence found      | Score = 0 (absence of evidence treated as absence of practice) |
| Partial evidence       | Score based on available evidence                              |
| Contradictory evidence | Lower score applied; flagged for review                        |
| Self-reported only     | Maximum score = 2 (requires verification for higher)           |

---

## 12. Assessment Process

### 12.1 Assessment Workflow

```
┌─────────────────────────────────────────────────────────────────────────┐
│                      AIGM ASSESSMENT WORKFLOW                           │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│   PHASE 1: DATA COLLECTION (Weeks 1-2)                                 │
│   ┌─────────────────────────────────────────────────────────────────┐  │
│   │ • Automated data gathering from public sources                  │  │
│   │ • Company invitation to provide additional evidence             │  │
│   │ • Incident database query                                       │  │
│   │ • Regulatory filing extraction                                  │  │
│   └─────────────────────────────────────────────────────────────────┘  │
│                              │                                          │
│                              ▼                                          │
│   PHASE 2: INITIAL SCORING (Weeks 2-3)                                 │
│   ┌─────────────────────────────────────────────────────────────────┐  │
│   │ • Indicator-level scoring with evidence citations               │  │
│   │ • Dimension score calculation                                   │  │
│   │ • Industry adjustment application                               │  │
│   │ • Incident impact calculation                                   │  │
│   └─────────────────────────────────────────────────────────────────┘  │
│                              │                                          │
│                              ▼                                          │
│   PHASE 3: QUALITY REVIEW (Week 3)                                     │
│   ┌─────────────────────────────────────────────────────────────────┐  │
│   │ • Peer review of scoring decisions                              │  │
│   │ • Consistency check against comparable companies                │  │
│   │ • Outlier investigation                                         │  │
│   └─────────────────────────────────────────────────────────────────┘  │
│                              │                                          │
│                              ▼                                          │
│   PHASE 4: COMPANY REVIEW (Week 4) — Optional                          │
│   ┌─────────────────────────────────────────────────────────────────┐  │
│   │ • Draft report shared with company                              │  │
│   │ • Opportunity to provide additional evidence                    │  │
│   │ • Factual corrections accepted                                  │  │
│   │ • Scoring methodology not negotiable                            │  │
│   └─────────────────────────────────────────────────────────────────┘  │
│                              │                                          │
│                              ▼                                          │
│   PHASE 5: FINALIZATION (Week 4-5)                                     │
│   ┌─────────────────────────────────────────────────────────────────┐  │
│   │ • Final score calculation                                       │  │
│   │ • Report generation                                             │  │
│   │ • Publication to AIRegMap                                       │  │
│   └─────────────────────────────────────────────────────────────────┘  │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### 12.2 Assessment Frequency

| Assessment Type        | Frequency | Scope                                      |
| ---------------------- | --------- | ------------------------------------------ |
| **Full Assessment**    | Annual    | Complete methodology, all indicators       |
| **Interim Update**     | Quarterly | Material changes, significant incidents    |
| **Incident-Triggered** | As needed | Immediate score impact for major incidents |
| **Company-Requested**  | On demand | Full reassessment (fee-based)              |

### 12.3 Analyst Qualifications

AIGM assessments are conducted by analysts with:

- Understanding of AI/ML systems and risks
- Familiarity with AI governance frameworks (ISO 42001, NIST AI RMF)
- Experience in corporate governance analysis
- Training on AIGM methodology (certification required)

---

## 13. Score Calculation

### 13.1 Calculation Steps

**Step 1: Indicator Scores**

```
For each indicator:
  Raw Score = 0, 1, 2, 3, or 4 based on evidence
  Normalized Score = (Raw Score / 4) × 100
```

**Step 2: Dimension Scores**

```
For each dimension:
  Dimension Score = Σ(Indicator Score × Indicator Weight)
```

**Step 3: Base Overall Score**

```
Base Score = Σ(Dimension Score × Dimension Weight)
         = (Policy × 0.20) + (Governance × 0.20) + (Risk × 0.25) 
           + (Transparency × 0.20) + (Compliance × 0.15)
```

**Step 4: Incident Adjustment**

```
Adjusted Score = Base Score - Total Incident Deductions
```

**Step 5: Industry Adjustment (for Tier Assignment)**

```
Tier Threshold = Base Tier Threshold × Industry Risk Multiplier
Tier = Highest tier where Adjusted Score ≥ Adjusted Threshold
```

### 13.2 Calculation Example

**Company:** TechCorp Inc.  
**Industry:** Financial Services (Tier 1, 1.2x multiplier)

| Dimension                 | Raw Score | Weight | Contribution |
| ------------------------- | --------- | ------ | ------------ |
| Policy & Commitment       | 72        | 20%    | 14.4         |
| Governance Structure      | 68        | 20%    | 13.6         |
| Risk Management           | 75        | 25%    | 18.75        |
| Transparency & Disclosure | 65        | 20%    | 13.0         |
| Compliance Posture        | 80        | 15%    | 12.0         |
| **Base Score**            |           |        | **71.75**    |

**Incident Adjustment:**

- 1 Medium severity incident (6 months ago): -7 points
- Response Quality: Good (0.75 factor)
- Deduction: -7 × 1.0 × 0.75 × 1.0 = -5.25 points

**Final Score:** 71.75 - 5.25 = **66.5**

**Tier Assignment (Financial Services):**

- Leader threshold: 80 × 1.2 = 96
- Advanced threshold: 60 × 1.2 = 72
- Score of 66.5 < 72

**Final Tier:** 🟡 Developing (would be Advanced in standard industry)

---

## 14. Standards Alignment

### 14.1 Framework Mapping

AIGM indicators are mapped to established standards:

| AIGM Indicator           | ISO 42001                 | NIST AI RMF | EU AI Act               |
| ------------------------ | ------------------------- | ----------- | ----------------------- |
| P1.1 AI Ethics Policy    | 5.2 Policy                | Govern 1.1  | Art. 4 (literacy)       |
| P1.2 Board Oversight     | 5.1 Leadership            | Govern 1.2  | Art. 9 (risk mgmt)      |
| G2.1 Governance Function | 5.3 Roles                 | Govern 1.3  | Art. 4, 26              |
| R3.1 AI Inventory        | 6.1.2 AI system inventory | Map 1.1     | Art. 6 (classification) |
| R3.3 Bias Testing        | 8.4 Fairness              | Measure 2.6 | Art. 10 (data), Art. 15 |
| R3.5 Model Validation    | 8.2 Verification          | Measure 2.5 | Art. 9 (testing)        |
| R3.9 Monitoring          | 9.1 Monitoring            | Measure 3.2 | Art. 9(4), Art. 72      |
| T4.1 User Disclosure     | A.8.6 Information         | —           | Art. 13, Art. 52        |
| T4.6 External Audit      | 9.2 Internal audit        | —           | Art. 43 (conformity)    |

### 14.2 ISO 42001 Pathway

Organizations pursuing ISO 42001 certification can use AIGM as a readiness assessment:

| AIGM Score | ISO 42001 Readiness            |
| ---------- | ------------------------------ |
| 80+        | Ready for certification        |
| 60-79      | Minor gaps to address          |
| 40-59      | Significant preparation needed |
| <40        | Major implementation required  |

### 14.3 NIST AI RMF Alignment

AIGM dimensions map to NIST AI RMF functions:

| AIGM Dimension            | NIST AI RMF Function |
| ------------------------- | -------------------- |
| Policy & Commitment       | GOVERN               |
| Governance Structure      | GOVERN               |
| Risk Management           | MAP, MEASURE, MANAGE |
| Transparency & Disclosure | GOVERN, MEASURE      |
| Compliance Posture        | GOVERN, MANAGE       |

---

## 15. Methodology Governance

### 15.1 Methodology Stewardship

The AIGM methodology is maintained by:

- **AIGM Technical Committee** — Methodology development and updates
- **Advisory Board** — External experts providing guidance
- **Public Comment Process** — Stakeholder input on changes

### 15.2 Update Cycle

| Update Type              | Frequency       | Process                                              |
| ------------------------ | --------------- | ---------------------------------------------------- |
| **Major Version** (v2.0) | Every 2-3 years | Full review, public comment, Advisory Board approval |
| **Minor Version** (v1.1) | Annual          | Refinements, clarifications, new indicators          |
| **Patch** (v1.0.1)       | As needed       | Bug fixes, scoring clarifications                    |

### 15.3 Change Management

All methodology changes are:

1. Published in advance with rationale
2. Subject to public comment period (30 days minimum for major changes)
3. Accompanied by transition guidance
4. Applied prospectively (not retroactively penalizing)

### 15.4 Independence and Conflicts

To maintain credibility:

- AIGM assessments are independent of commercial relationships
- Organizations cannot pay for higher scores
- Conflicts of interest are disclosed and managed
- Appeal process available for factual disputes

---

## 16. Limitations and Disclaimers

### 16.1 What AIGM Scores Represent

- **AIGM scores are assessments of observable governance practices**, not guarantees of AI safety
- Scores reflect publicly available information and voluntary disclosures
- Scores are point-in-time assessments that may not reflect recent changes
- Scores are relative measures useful for comparison, not absolute certifications

### 16.2 What AIGM Scores Do NOT Represent

- AIGM does NOT certify that AI systems are safe, fair, or beneficial
- AIGM does NOT replace regulatory compliance assessments
- AIGM does NOT provide legal or investment advice
- AIGM does NOT guarantee future performance or incident-free operation

### 16.3 Data Limitations

- Public data may be incomplete or outdated
- Self-reported data may be biased
- Incident databases may undercount actual incidents
- Smaller organizations may have less public information available

### 16.4 Use Restrictions

AIGM scores may be used for:

- ✅ Research and analysis
- ✅ Benchmarking and comparison
- ✅ Investment screening (as one input among many)
- ✅ Vendor due diligence
- ✅ Internal improvement planning

AIGM scores should NOT be used as:

- ❌ Sole basis for investment decisions
- ❌ Legal compliance certification
- ❌ Guarantee of AI system safety
- ❌ Replacement for independent due diligence

---

## 17. Appendices

### Appendix A: Glossary

| Term             | Definition                                                                                                              |
| ---------------- | ----------------------------------------------------------------------------------------------------------------------- |
| **AI System**    | Machine-based system using machine learning or related techniques to generate outputs affecting real-world environments |
| **High-Risk AI** | AI systems with significant potential for harm, as defined by EU AI Act or equivalent frameworks                        |
| **Maturity**     | The extent to which AI governance practices are systematic, documented, and consistently applied                        |
| **Incident**     | An event where an AI system caused or contributed to harm or regulatory violation                                       |
| **Model Card**   | Documentation describing an AI model's intended use, limitations, and performance characteristics                       |

### Appendix B: Indicator Evidence Examples

**P1.1 — Published AI Ethics Policy**

| Score | Evidence Example                                                                              |
| ----- | --------------------------------------------------------------------------------------------- |
| 4     | Microsoft Responsible AI Standard (public, detailed, versioned, stakeholder input documented) |
| 3     | Google AI Principles (public, comprehensive, but limited implementation detail)               |
| 2     | Company X "AI Ethics Statement" (high-level principles, no implementation guidance)           |
| 1     | General "Technology Ethics" page mentioning AI briefly                                        |
| 0     | No public policy found                                                                        |

**R3.3 — Bias Testing and Mitigation**

| Score | Evidence Example                                                                |
| ----- | ------------------------------------------------------------------------------- |
| 4     | Published fairness metrics, regular testing reports, public bias bounty program |
| 3     | Documented testing methodology, internal reports mentioned in filings           |
| 2     | Job postings for fairness roles, general commitment statements                  |
| 1     | Ad hoc testing mentioned in interviews or articles                              |
| 0     | No evidence of bias testing                                                     |

### Appendix C: Industry Classification

| Industry Group         | Sub-Industries                                  | Risk Tier |
| ---------------------- | ----------------------------------------------- | --------- |
| **Financial Services** | Banking, Insurance, Asset Management, Fintech   | 1         |
| **Healthcare**         | Hospitals, Pharma, Medical Devices, Health Tech | 1         |
| **Technology**         | Software, Cloud, Hardware, AI/ML Providers      | 2         |
| **Consumer**           | Retail, E-commerce, Consumer Goods              | 3         |
| **Industrial**         | Manufacturing, Logistics, Construction          | 3         |
| **Energy**             | Oil & Gas, Utilities, Renewables                | 3         |
| **Telecommunications** | Wireless, Broadband, Media                      | 2         |
| **Government**         | Federal, State, Local, Defense                  | 1         |

### Appendix D: Incident Type Definitions

| Type                    | Definition                                                                 | Examples                                                    |
| ----------------------- | -------------------------------------------------------------------------- | ----------------------------------------------------------- |
| **Bias/Discrimination** | AI system produces systematically unfair outcomes for protected groups     | Hiring algorithm rejecting women, credit denial disparities |
| **Privacy Violation**   | AI system processes personal data without consent or beyond stated purpose | Training on private data, inference of sensitive attributes |
| **Security Breach**     | AI system is compromised or used to enable unauthorized access             | Prompt injection, model extraction, adversarial attacks     |
| **Hallucination Harm**  | AI provides false information causing real-world damage                    | Medical misinformation, legal advice errors                 |
| **Deepfake/Misuse**     | AI-generated synthetic media used for fraud or manipulation                | Voice cloning scams, non-consensual imagery                 |
| **Regulatory Action**   | Government enforcement related to AI use                                   | FTC action, GDPR fine, state AG investigation               |
| **Operational Failure** | AI malfunction causing business or service disruption                      | Trading algorithm errors, service outages                   |
| **Physical Harm**       | AI system contributes to bodily injury or death                            | Autonomous vehicle accidents, robotic injuries              |

### Appendix E: Change Log

| Version | Date    | Changes                |
| ------- | ------- | ---------------------- |
| 1.0     | 2026-02 | Initial public release |

---

## Document Control

| Field             | Value                     |
| ----------------- | ------------------------- |
| **Document ID**   | AIGM-METH-001             |
| **Version**       | 1.0                       |
| **Status**        | Draft for Public Comment  |
| **Author**        | PangoLabs / AIRegMap      |
| **Review Period** | 60 days from publication  |
| **Contact**       | methodology@airegmap.live |

---

*© 2026 PangoLabs. This methodology is released under Creative Commons Attribution 4.0 International License (CC BY 4.0). Organizations may use, adapt, and build upon this methodology with attribution.*
