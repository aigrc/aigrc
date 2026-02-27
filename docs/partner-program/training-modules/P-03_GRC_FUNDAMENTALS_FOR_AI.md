# Module P-03: GRC Fundamentals for AI Systems

## Essential Governance, Risk, and Compliance Knowledge for AI Practitioners

**Module ID:** P-03
**Tier:** Prerequisites
**Duration:** 4-5 hours
**Difficulty:** Beginner-Intermediate
**Prerequisites:** Module P-02 completed
**Last Updated:** 2026-02-16

---

## 1. Module Overview

### 1.1 Purpose & Business Value

AI governance is not just about technology—it's about applying proven GRC (Governance, Risk, and Compliance) principles to a new domain. This module ensures you understand:

- The regulatory landscape driving AI governance requirements
- How traditional GRC maps to AI-specific challenges
- Key frameworks (EU AI Act, NIST AI RMF, ISO 42001)
- Risk classification methodologies
- Compliance evidence requirements

**Why This Matters:**
- Customers buy AI governance to meet regulatory requirements
- Partners who understand regulations can position value effectively
- Proper risk classification prevents over/under-governance
- Audit readiness is the ultimate success metric

### 1.2 Target Audience

| Role | Relevance | Focus Areas |
|------|-----------|-------------|
| GRC Consultant | Required | All sections |
| Technical Consultant | Required | Risk classification, frameworks |
| Project Manager | Recommended | Regulatory timelines, compliance |
| Sales/Pre-sales | Recommended | Business drivers, value proposition |

### 1.3 Learning Outcomes

By the end of this module, you will be able to:

1. ✓ Explain why AI requires specialized governance
2. ✓ Describe the EU AI Act risk classification system
3. ✓ Map NIST AI RMF functions to customer activities
4. ✓ Identify high-risk AI systems in any organization
5. ✓ Explain compliance requirements to technical and non-technical stakeholders
6. ✓ Create a basic compliance roadmap for a customer

---

## 2. Why AI Needs Specialized Governance

### 2.1 The AI Governance Imperative

Traditional software governance doesn't address AI's unique characteristics:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│           TRADITIONAL SOFTWARE vs. AI SYSTEMS                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  TRADITIONAL SOFTWARE                    AI/ML SYSTEMS                      │
│  ════════════════════                    ═════════════                      │
│                                                                             │
│  Deterministic                           Probabilistic                      │
│  "Given input X, always output Y"        "Given input X, likely output Y"  │
│                                                                             │
│  Explicitly programmed                   Learned from data                  │
│  "If condition then action"              "Patterns discovered in training" │
│                                                                             │
│  Predictable behavior                    Emergent behavior                  │
│  "We know what it will do"               "It may surprise us"              │
│                                                                             │
│  Static once deployed                    Can drift over time               │
│  "Tested and released"                   "Model degradation possible"      │
│                                                                             │
│  Easy to audit                           Hard to explain                    │
│  "Read the code"                         "Black box problem"               │
│                                                                             │
│  ───────────────────────────────────────────────────────────────────────── │
│                                                                             │
│  GOVERNANCE IMPLICATIONS:                                                   │
│                                                                             │
│  ┌───────────────────────────────────────────────────────────────────────┐ │
│  │  AI systems require:                                                  │ │
│  │  • Continuous monitoring (not just deployment testing)               │ │
│  │  • Bias detection and mitigation                                     │ │
│  │  • Explainability mechanisms                                         │ │
│  │  • Human oversight capabilities                                      │ │
│  │  • Emergency stop (kill switch) functionality                        │ │
│  │  • Data governance throughout lifecycle                              │ │
│  └───────────────────────────────────────────────────────────────────────┘ │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 2.2 Real-World AI Governance Failures

Understanding failures helps explain why governance matters:

| Incident | Year | What Happened | Governance Gap |
|----------|------|---------------|----------------|
| Amazon Hiring AI | 2018 | Discriminated against women | No bias testing |
| Healthcare Algorithm | 2019 | Systematically disadvantaged Black patients | No demographic analysis |
| Facial Recognition Arrests | 2020 | Wrong people arrested | No accuracy requirements |
| Chatbot Manipulation | 2023 | Tricked into harmful outputs | No guardrails |
| Deepfake Election | 2024 | Synthetic media affected election | No provenance tracking |

**Key Insight:** Every failure could have been prevented with proper governance:
- Asset documentation
- Risk assessment
- Bias testing
- Human oversight
- Monitoring

### 2.3 Business Drivers for AI Governance

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    WHY CUSTOMERS BUY AI GOVERNANCE                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  DRIVER 1: REGULATORY COMPLIANCE                                           │
│  ══════════════════════════════════                                        │
│  • EU AI Act enforcement begins August 2026                                │
│  • Penalties up to €35M or 7% global revenue                              │
│  • US states passing AI laws                                               │
│  • Sector-specific requirements (healthcare, finance)                      │
│                                                                             │
│  "We must comply or face significant penalties"                            │
│                                                                             │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                             │
│  DRIVER 2: RISK MANAGEMENT                                                 │
│  ══════════════════════════════                                            │
│  • AI failures can cause reputational damage                               │
│  • Legal liability for discriminatory decisions                            │
│  • Operational risk from AI errors                                         │
│  • Third-party AI vendor risk                                              │
│                                                                             │
│  "We need to know and manage our AI risks"                                 │
│                                                                             │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                             │
│  DRIVER 3: TRUST & BRAND                                                   │
│  ══════════════════════════                                                │
│  • Customers want to know AI is being used responsibly                     │
│  • Investors asking about AI ethics                                        │
│  • ESG reporting includes AI governance                                    │
│  • Competitive differentiation                                             │
│                                                                             │
│  "We want to be seen as responsible AI users"                              │
│                                                                             │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                             │
│  DRIVER 4: OPERATIONAL EXCELLENCE                                          │
│  ═════════════════════════════════                                         │
│  • Know what AI exists in the organization                                 │
│  • Avoid duplicate/conflicting AI projects                                 │
│  • Standardize AI practices                                                │
│  • Enable safe AI innovation                                               │
│                                                                             │
│  "We want to scale AI safely and efficiently"                              │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. The Regulatory Landscape

### 3.1 Global AI Regulation Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    GLOBAL AI REGULATION MAP (2026)                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  BINDING REGULATIONS (Must Comply)                                         │
│  ═════════════════════════════════                                         │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  EUROPEAN UNION                                                     │   │
│  │  ────────────────                                                   │   │
│  │  EU AI Act (2024)                                                   │   │
│  │  • Risk-based approach                                              │   │
│  │  • Prohibits certain AI uses                                        │   │
│  │  • High-risk system requirements                                    │   │
│  │  • Transparency obligations                                         │   │
│  │  • Enforcement: Aug 2026 (most provisions)                          │   │
│  │  • Scope: Anyone selling to or in EU                                │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  CHINA                                                              │   │
│  │  ─────                                                              │   │
│  │  Multiple AI regulations:                                           │   │
│  │  • Algorithm Recommendation (2022)                                  │   │
│  │  • Deep Synthesis (2023)                                            │   │
│  │  • Generative AI (2023)                                             │   │
│  │  • Scope: China market                                              │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  BRAZIL                                                             │   │
│  │  ──────                                                             │   │
│  │  AI Framework Law (In progress)                                     │   │
│  │  • Similar to EU AI Act                                             │   │
│  │  • Risk-based classification                                        │   │
│  │  • Expected 2026                                                    │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                             │
│  VOLUNTARY FRAMEWORKS (Best Practice)                                      │
│  ═══════════════════════════════════                                       │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  UNITED STATES                                                      │   │
│  │  ─────────────                                                      │   │
│  │  NIST AI RMF (2023)                                                 │   │
│  │  • Voluntary framework                                              │   │
│  │  • Widely adopted                                                   │   │
│  │  • Four functions: Govern, Map, Measure, Manage                     │   │
│  │  • State laws emerging (Colorado, California)                       │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  INTERNATIONAL                                                      │   │
│  │  ─────────────                                                      │   │
│  │  ISO/IEC 42001 (2023)                                               │   │
│  │  • AI Management System certification                               │   │
│  │  • Based on ISO management system standards                         │   │
│  │  • Growing adoption                                                 │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 3.2 EU AI Act Deep Dive

The EU AI Act is the most comprehensive AI regulation globally. Understanding it is essential.

#### 3.2.1 Risk Categories

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    EU AI ACT RISK PYRAMID                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│                           ▲                                                 │
│                          /█\                                                │
│                         /███\         UNACCEPTABLE RISK                    │
│                        /█████\        ═══════════════════                  │
│                       /███████\       PROHIBITED                           │
│                      /█████████\                                           │
│                     ───────────────                                        │
│                                       Examples:                            │
│                                       • Social scoring by governments      │
│                                       • Exploitation of vulnerabilities    │
│                                       • Real-time biometric ID (public)    │
│                                       • Emotion recognition at work/school │
│                                                                             │
│                    ▲▲▲▲▲▲▲▲▲▲▲▲▲                                          │
│                   /██████████████\    HIGH RISK                            │
│                  /████████████████\   ═════════                            │
│                 /██████████████████\  STRICT REQUIREMENTS                  │
│                /████████████████████\                                      │
│               ────────────────────────                                     │
│                                       Examples:                            │
│                                       • Recruitment/HR decisions           │
│                                       • Credit scoring                     │
│                                       • Medical diagnosis                  │
│                                       • Law enforcement                    │
│                                       • Education assessment               │
│                                       • Critical infrastructure            │
│                                                                             │
│              ▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲                                       │
│             /██████████████████████\   LIMITED RISK                        │
│            /████████████████████████\  ════════════                        │
│           /██████████████████████████\ TRANSPARENCY REQUIRED               │
│          ──────────────────────────────                                    │
│                                       Examples:                            │
│                                       • Chatbots                           │
│                                       • Emotion recognition (consumer)     │
│                                       • Deepfake generation                │
│                                       • AI-generated content               │
│                                                                             │
│         ▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲                                      │
│        /████████████████████████████\   MINIMAL RISK                       │
│       /██████████████████████████████\  ════════════                       │
│      /████████████████████████████████\ NO REQUIREMENTS                    │
│     ──────────────────────────────────── (Best practice encouraged)        │
│                                                                             │
│                                       Examples:                            │
│                                       • Spam filters                       │
│                                       • AI-enhanced games                  │
│                                       • Inventory management               │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### 3.2.2 High-Risk System Categories (Annex III)

| # | Category | Examples |
|---|----------|----------|
| 1 | Biometric identification | Facial recognition, fingerprint systems |
| 2 | Critical infrastructure | Energy grids, water systems, transport |
| 3 | Education & training | Exam scoring, admission decisions |
| 4 | Employment | Recruitment, performance evaluation, termination |
| 5 | Essential services | Credit scoring, insurance pricing, benefits |
| 6 | Law enforcement | Risk assessment, evidence analysis, profiling |
| 7 | Migration & border | Visa processing, document authentication |
| 8 | Justice | Legal research, sentencing recommendations |

#### 3.2.3 High-Risk Requirements

```
┌─────────────────────────────────────────────────────────────────────────────┐
│              HIGH-RISK AI SYSTEM REQUIREMENTS (EU AI Act)                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ARTICLE 9: RISK MANAGEMENT                                                │
│  ═══════════════════════════                                               │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  • Establish risk management system                                 │   │
│  │  • Identify and analyze known/foreseeable risks                     │   │
│  │  • Estimate and evaluate risks                                      │   │
│  │  • Adopt risk mitigation measures                                   │   │
│  │  • Test risk mitigation effectiveness                               │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│  AIGOS Mapping: Asset Card risk_controls section                           │
│                                                                             │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                             │
│  ARTICLE 10: DATA GOVERNANCE                                               │
│  ═══════════════════════════                                               │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  • Training data must be relevant, representative, error-free       │   │
│  │  • Examine for biases                                               │   │
│  │  • Document data characteristics                                    │   │
│  │  • Consider geographic, contextual, behavioral settings            │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│  AIGOS Mapping: Asset Card technical.training_data section                 │
│                                                                             │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                             │
│  ARTICLE 11: TECHNICAL DOCUMENTATION                                       │
│  ═══════════════════════════════════                                       │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  • General description and intended purpose                         │   │
│  │  • System architecture and design specifications                    │   │
│  │  • Description of elements and development process                  │   │
│  │  • Information about training, validation, testing data             │   │
│  │  • Performance metrics and limitations                              │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│  AIGOS Mapping: Complete Asset Card                                        │
│                                                                             │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                             │
│  ARTICLE 12: RECORD-KEEPING (LOGGING)                                      │
│  ════════════════════════════════════                                      │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  • Automatic logging of events                                      │   │
│  │  • Traceability of system functioning                               │   │
│  │  • Retention appropriate to intended purpose                        │   │
│  │  • Minimum standards for logging capabilities                       │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│  AIGOS Mapping: Audit trail, telemetry emitter                             │
│                                                                             │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                             │
│  ARTICLE 13: TRANSPARENCY                                                  │
│  ═════════════════════════                                                 │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  • Instructions for use to deployers                                │   │
│  │  • Information about capabilities and limitations                   │   │
│  │  • Performance characteristics                                      │   │
│  │  • Human oversight measures                                         │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│  AIGOS Mapping: Asset Card description, governance sections                │
│                                                                             │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                             │
│  ARTICLE 14: HUMAN OVERSIGHT                                               │
│  ════════════════════════════                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  • Designed to allow effective oversight by natural persons         │   │
│  │  • Understand capabilities and limitations                          │   │
│  │  • Interpret outputs correctly                                      │   │
│  │  • Decide not to use or override                                    │   │
│  │  • Intervene or interrupt (kill switch)                             │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│  AIGOS Mapping: Human oversight config, kill switch                        │
│                                                                             │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                             │
│  ARTICLE 15: ACCURACY, ROBUSTNESS, CYBERSECURITY                          │
│  ═══════════════════════════════════════════════                          │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  • Appropriate levels of accuracy                                   │   │
│  │  • Resilient to errors and inconsistencies                          │   │
│  │  • Appropriate cybersecurity measures                               │   │
│  │  • Resilient against adversarial attacks                            │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│  AIGOS Mapping: Performance metrics, security configuration               │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### 3.2.4 EU AI Act Timeline

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    EU AI ACT IMPLEMENTATION TIMELINE                        │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  2024          2025          2026          2027          2028              │
│  ════          ════          ════          ════          ════              │
│    │             │             │             │             │               │
│    │             │             │             │             │               │
│  ──┼─────────────┼─────────────┼─────────────┼─────────────┼──────────────│
│    │             │             │             │             │               │
│    ▼             │             │             │             │               │
│  Aug 2024       │             │             │             │               │
│  AI Act         │             │             │             │               │
│  published      │             │             │             │               │
│                 │             │             │             │               │
│                 ▼             │             │             │               │
│              Feb 2025        │             │             │               │
│              Prohibited      │             │             │               │
│              practices       │             │             │               │
│              enforced        │             │             │               │
│                              │             │             │               │
│                              ▼             │             │               │
│                           Aug 2025        │             │               │
│                           GPAI rules      │             │               │
│                           apply           │             │               │
│                                           │             │               │
│                                           ▼             │               │
│                                        Aug 2026        │               │
│                                        ═══════════     │               │
│                                        HIGH-RISK       │               │
│                                        REQUIREMENTS    │               │
│                                        ENFORCED        │               │
│                                        ═══════════     │               │
│                                                        │               │
│                                                        ▼               │
│                                                     Aug 2027           │
│                                                     Annex I            │
│                                                     products           │
│                                                                        │
│  CUSTOMER MESSAGE:                                                     │
│  ══════════════════                                                    │
│  "If you have high-risk AI systems, you need to be compliant          │
│   by August 2026. Starting now gives you 18 months to implement."     │
│                                                                        │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 3.3 NIST AI RMF

The NIST AI Risk Management Framework is the leading US standard.

#### 3.3.1 Four Core Functions

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    NIST AI RMF FOUR FUNCTIONS                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│                         ┌─────────────────┐                                │
│                         │                 │                                │
│                         │     GOVERN      │                                │
│                         │                 │                                │
│                         │  (Cross-cutting)│                                │
│                         └────────┬────────┘                                │
│                                  │                                         │
│         ┌────────────────────────┼────────────────────────┐                │
│         │                        │                        │                │
│         ▼                        ▼                        ▼                │
│  ┌─────────────┐         ┌─────────────┐         ┌─────────────┐          │
│  │             │         │             │         │             │          │
│  │     MAP     │────────▶│   MEASURE   │────────▶│   MANAGE    │          │
│  │             │         │             │         │             │          │
│  └─────────────┘         └─────────────┘         └─────────────┘          │
│                                                                            │
│  ══════════════════════════════════════════════════════════════════════   │
│                                                                            │
│  GOVERN: Culture, accountability, risk tolerances                         │
│  ────────────────────────────────────────────────                         │
│  • Establish AI risk management program                                   │
│  • Define roles and responsibilities                                      │
│  • Set risk tolerance levels                                              │
│  • Integrate with enterprise risk management                              │
│                                                                            │
│  AIGOS Mapping: Policies, governance configuration                        │
│                                                                            │
│  ─────────────────────────────────────────────────────────────────────── │
│                                                                            │
│  MAP: Understand AI context and risks                                     │
│  ───────────────────────────────────                                      │
│  • Identify AI systems and their uses                                     │
│  • Understand context and stakeholders                                    │
│  • Categorize AI systems                                                  │
│  • Identify potential harms                                               │
│                                                                            │
│  AIGOS Mapping: Detection, Asset Cards, risk classification               │
│                                                                            │
│  ─────────────────────────────────────────────────────────────────────── │
│                                                                            │
│  MEASURE: Assess, analyze, and track AI risks                             │
│  ────────────────────────────────────────────                             │
│  • Develop metrics for AI risks                                           │
│  • Test AI systems appropriately                                          │
│  • Track identified risks                                                 │
│  • Analyze impacts of risks                                               │
│                                                                            │
│  AIGOS Mapping: Compliance checks, monitoring, reporting                  │
│                                                                            │
│  ─────────────────────────────────────────────────────────────────────── │
│                                                                            │
│  MANAGE: Prioritize and act on AI risks                                   │
│  ──────────────────────────────────────                                   │
│  • Prioritize risks for action                                            │
│  • Implement risk treatments                                              │
│  • Document risk decisions                                                │
│  • Monitor effectiveness                                                  │
│                                                                            │
│  AIGOS Mapping: Policy enforcement, remediation, audit trail             │
│                                                                            │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### 3.3.2 NIST AI RMF Categories

| Function | Category | Focus |
|----------|----------|-------|
| **GOVERN** | GOVERN 1 | Governance policies and accountability |
| | GOVERN 2 | Organizational culture |
| | GOVERN 3 | Workforce diversity |
| | GOVERN 4 | Organizational viability |
| | GOVERN 5 | Processes and procedures |
| | GOVERN 6 | Stakeholder engagement |
| **MAP** | MAP 1 | Context establishment |
| | MAP 2 | AI categorization |
| | MAP 3 | AI capabilities |
| | MAP 4 | Risks and benefits |
| | MAP 5 | Impacts |
| **MEASURE** | MEASURE 1 | Metrics development |
| | MEASURE 2 | Performance evaluation |
| | MEASURE 3 | Risk tracking |
| | MEASURE 4 | Feedback mechanisms |
| **MANAGE** | MANAGE 1 | Risk prioritization |
| | MANAGE 2 | Risk treatment |
| | MANAGE 3 | Residual risk |
| | MANAGE 4 | Incident response |

### 3.4 ISO/IEC 42001

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    ISO/IEC 42001 OVERVIEW                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  WHAT IS IT?                                                               │
│  ══════════                                                                │
│  An international standard for AI Management Systems (AIMS)                │
│  Based on ISO high-level structure (like ISO 27001, ISO 9001)              │
│  Certifiable by third-party auditors                                       │
│                                                                             │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                             │
│  STRUCTURE (10 Clauses)                                                    │
│  ══════════════════════                                                    │
│                                                                             │
│  4. Context               │ Understand organization's context              │
│  5. Leadership            │ Top management commitment                      │
│  6. Planning              │ Address risks and opportunities                │
│  7. Support               │ Resources, competence, awareness               │
│  8. Operation             │ Plan and control AI processes                  │
│  9. Performance Eval      │ Monitor, measure, analyze, evaluate            │
│  10. Improvement          │ Nonconformity, corrective action, improvement  │
│                                                                             │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                             │
│  KEY REQUIREMENTS                                                          │
│  ════════════════                                                          │
│                                                                             │
│  • AI Policy: Establish and communicate AI policy                          │
│  • AI System Lifecycle: Manage throughout lifecycle                        │
│  • Risk Assessment: Systematic AI risk assessment                          │
│  • Impact Assessment: Assess societal impacts                              │
│  • Third-Party AI: Manage AI from suppliers                               │
│  • Documentation: Maintain documented information                          │
│  • Monitoring: Ongoing monitoring and measurement                          │
│                                                                             │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                             │
│  CERTIFICATION BENEFITS                                                    │
│  ═════════════════════                                                     │
│                                                                             │
│  ✓ Demonstrates commitment to responsible AI                              │
│  ✓ Provides competitive advantage in bids                                 │
│  ✓ May satisfy regulatory requirements                                    │
│  ✓ Builds stakeholder trust                                               │
│  ✓ Integrates with other management systems                               │
│                                                                             │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                             │
│  AIGOS MAPPING                                                             │
│  ═════════════                                                             │
│                                                                             │
│  AIGOS provides evidence for most ISO 42001 requirements:                  │
│  • Asset Cards → Documentation requirements                                │
│  • Policies → AI Policy evidence                                           │
│  • Compliance checks → Risk assessment evidence                            │
│  • Audit trail → Monitoring evidence                                       │
│  • Reports → Management review input                                       │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 4. Risk Classification in Practice

### 4.1 How to Classify AI Systems

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    AI RISK CLASSIFICATION FLOWCHART                         │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  START: Is this an AI system?                                              │
│         │                                                                   │
│         ▼                                                                   │
│  ┌──────────────────────────────────────────┐                              │
│  │ Does it use ML, logic-based, statistical │      NO                      │
│  │ methods to generate outputs?             │─────────▶ Not AI             │
│  └──────────────────┬───────────────────────┘          (different rules)   │
│                     │ YES                                                   │
│                     ▼                                                       │
│  ┌──────────────────────────────────────────┐                              │
│  │ Is it used for prohibited purposes?      │      YES                     │
│  │ (Social scoring, exploitation, etc.)     │─────────▶ UNACCEPTABLE       │
│  └──────────────────┬───────────────────────┘          (prohibited)        │
│                     │ NO                                                    │
│                     ▼                                                       │
│  ┌──────────────────────────────────────────┐                              │
│  │ Is it in Annex III high-risk categories? │      YES                     │
│  │ (Employment, health, credit, etc.)       │─────────▶ HIGH RISK          │
│  └──────────────────┬───────────────────────┘          (full requirements) │
│                     │ NO                                                    │
│                     ▼                                                       │
│  ┌──────────────────────────────────────────┐                              │
│  │ Is it a product covered by EU            │      YES                     │
│  │ harmonization legislation? (Annex I)     │─────────▶ Evaluate per       │
│  └──────────────────┬───────────────────────┘          product rules       │
│                     │ NO                                                    │
│                     ▼                                                       │
│  ┌──────────────────────────────────────────┐                              │
│  │ Does it interact with natural persons?   │      YES                     │
│  │ (Chatbots, emotion detection, etc.)      │─────────▶ LIMITED RISK       │
│  └──────────────────┬───────────────────────┘          (transparency)      │
│                     │ NO                                                    │
│                     ▼                                                       │
│                MINIMAL RISK                                                │
│                (no requirements, best practice)                            │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 4.2 Classification Examples

| System | Category | Risk Level | Rationale |
|--------|----------|------------|-----------|
| Resume screening | Employment | **HIGH** | Affects hiring decisions |
| Customer chatbot | Interaction | **LIMITED** | Interacts with users |
| Spam filter | Operations | **MINIMAL** | No impact on rights |
| Medical diagnosis | Healthcare | **HIGH** | Health decisions |
| Credit scoring | Finance | **HIGH** | Access to services |
| Product recommendations | Commerce | **MINIMAL** | Advisory only |
| Sentiment analysis (HR) | Employment | **HIGH** | Affects workers |
| Sentiment analysis (product) | Analytics | **MINIMAL** | No individual impact |
| Face recognition (employee) | Biometric | **HIGH** | Biometric data |
| Face recognition (social media filter) | Consumer | **LIMITED** | Transparency needed |

### 4.3 Common Classification Mistakes

| Mistake | Why It's Wrong | Correct Approach |
|---------|----------------|------------------|
| "It's just ML, so minimal risk" | Risk depends on USE, not technology | Classify by application |
| "We're using a third-party model" | Deployers are also responsible | Still need to classify |
| "It's only advisory" | High-risk if affects fundamental rights | Consider actual impact |
| "It's internal only" | Employee rights still apply | HR systems are high-risk |
| "We're outside EU" | EU AI Act has extraterritorial reach | Classify if EU customers |

---

## 5. Compliance Evidence Requirements

### 5.1 What Auditors Look For

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    AUDIT EVIDENCE REQUIREMENTS                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  DOCUMENTATION EVIDENCE                                                    │
│  ══════════════════════                                                    │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  ☐ AI system inventory (complete list)                             │   │
│  │  ☐ Risk classification for each system                             │   │
│  │  ☐ Technical documentation (architecture, design)                   │   │
│  │  ☐ Data governance documentation                                    │   │
│  │  ☐ Training data descriptions                                       │   │
│  │  ☐ Human oversight procedures                                       │   │
│  │  ☐ Instructions for use                                             │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│  AIGOS Evidence: Asset Cards, compliance reports                           │
│                                                                             │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                             │
│  PROCESS EVIDENCE                                                          │
│  ════════════════                                                          │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  ☐ Risk management procedures                                       │   │
│  │  ☐ Change management process                                        │   │
│  │  ☐ Incident response procedures                                     │   │
│  │  ☐ Review and approval workflows                                    │   │
│  │  ☐ Training and awareness programs                                  │   │
│  │  ☐ Vendor management processes                                      │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│  AIGOS Evidence: Policy configurations, audit trail                        │
│                                                                             │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                             │
│  TESTING EVIDENCE                                                          │
│  ════════════════                                                          │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  ☐ Bias testing results                                             │   │
│  │  ☐ Performance testing results                                      │   │
│  │  ☐ Security testing results                                         │   │
│  │  ☐ Adversarial testing (if applicable)                              │   │
│  │  ☐ User testing results                                             │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│  AIGOS Evidence: Compliance check history, reports                         │
│                                                                             │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                             │
│  MONITORING EVIDENCE                                                       │
│  ═══════════════════                                                       │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  ☐ System logs                                                      │   │
│  │  ☐ Performance monitoring data                                      │   │
│  │  ☐ Incident records                                                 │   │
│  │  ☐ Drift detection records                                          │   │
│  │  ☐ Human oversight records                                          │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│  AIGOS Evidence: Telemetry, runtime logs, audit trail                     │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 5.2 AIGOS Evidence Generation

| Requirement | AIGOS Feature | Evidence Generated |
|-------------|---------------|-------------------|
| System inventory | Detection scan | JSON/CSV inventory |
| Risk classification | Classification engine | Risk categorization |
| Technical documentation | Asset Cards | YAML documentation |
| Logging | Audit trail | Immutable log entries |
| Compliance assessment | Compliance checks | SARIF reports |
| Monitoring | Control Plane | Dashboard data |
| Human oversight | Kill switch, oversight config | Configuration evidence |

---

## 6. Creating a Compliance Roadmap

### 6.1 Compliance Roadmap Template

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    COMPLIANCE ROADMAP TEMPLATE                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  MONTH 1-2: DISCOVERY                                                      │
│  ════════════════════                                                      │
│  Week 1-2:                                                                 │
│  □ Stakeholder engagement                                                  │
│  □ AI inventory (automated scan)                                           │
│  □ Risk classification                                                     │
│                                                                             │
│  Week 3-4:                                                                 │
│  □ Gap analysis                                                            │
│  □ Prioritization                                                          │
│  □ Project planning                                                        │
│                                                                             │
│  Milestone: Complete AI inventory and gap analysis                         │
│                                                                             │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                             │
│  MONTH 3-4: HIGH-RISK DOCUMENTATION                                        │
│  ═══════════════════════════════════                                       │
│  Week 5-8:                                                                 │
│  □ Create Asset Cards for high-risk systems                                │
│  □ Document data governance                                                │
│  □ Define human oversight procedures                                       │
│  □ Configure policies                                                      │
│                                                                             │
│  Milestone: High-risk systems documented                                   │
│                                                                             │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                             │
│  MONTH 5-6: IMPLEMENTATION                                                 │
│  ═════════════════════════                                                 │
│  Week 9-12:                                                                │
│  □ Deploy Control Plane                                                    │
│  □ Integrate CI/CD pipelines                                               │
│  □ Configure monitoring                                                    │
│  □ Implement audit logging                                                 │
│                                                                             │
│  Milestone: AIGOS platform operational                                     │
│                                                                             │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                             │
│  MONTH 7-8: VALIDATION & TRAINING                                          │
│  ═══════════════════════════════                                           │
│  Week 13-16:                                                               │
│  □ Complete limited-risk documentation                                     │
│  □ Run compliance assessments                                              │
│  □ Address gaps                                                            │
│  □ Train teams                                                             │
│                                                                             │
│  Milestone: Full compliance baseline                                       │
│                                                                             │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                             │
│  ONGOING: MAINTAIN                                                         │
│  ═════════════════                                                         │
│  □ Continuous monitoring                                                   │
│  □ Quarterly reviews                                                       │
│  □ New system onboarding                                                   │
│  □ Policy updates                                                          │
│  □ Training refreshers                                                     │
│                                                                             │
│  Milestone: Sustained compliance                                           │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 6.2 Priority Matrix

| Priority | Criteria | Timeline |
|----------|----------|----------|
| **P0 - Critical** | High-risk systems in production | Immediate (Month 1-2) |
| **P1 - High** | Limited-risk customer-facing | Soon (Month 3-4) |
| **P2 - Medium** | Internal tools, analytics | Later (Month 5-6) |
| **P3 - Low** | Minimal risk systems | Opportunistic |

---

## 7. Hands-On Exercise

### Exercise P-03: Regulatory Analysis

**Objective:** Apply regulatory knowledge to a customer scenario.

**Time:** 60 minutes

**Scenario:**
TechCorp is a US-based healthcare company with EU customers. They have the following AI systems:

1. Patient triage chatbot
2. Medical image analysis for diagnosis
3. HR resume screening
4. Email spam filter
5. Product recommendation engine
6. Fraud detection for billing

**Tasks:**

1. Classify each system by EU AI Act risk level
2. Identify which systems need immediate attention
3. Map to NIST AI RMF functions
4. Create a 6-month compliance roadmap outline

**Deliverable:** Completed classification table and roadmap

**Classification Table:**

| System | EU AI Act Risk | Rationale | Priority |
|--------|----------------|-----------|----------|
| Patient triage | | | |
| Medical imaging | | | |
| HR screening | | | |
| Spam filter | | | |
| Recommendations | | | |
| Fraud detection | | | |

---

## 8. Knowledge Check

### Quiz: Module P-03

1. Which EU AI Act risk category prohibits certain AI uses entirely?
   - A) Minimal
   - B) Limited
   - C) High
   - D) Unacceptable

2. Under EU AI Act, HR recruitment AI is classified as:
   - A) Minimal risk
   - B) Limited risk
   - C) High risk
   - D) Depends on the company size

3. What are the four functions of NIST AI RMF?
   - A) Plan, Do, Check, Act
   - B) Govern, Map, Measure, Manage
   - C) Identify, Protect, Detect, Respond
   - D) Assess, Implement, Monitor, Improve

4. When do EU AI Act high-risk requirements come into force?
   - A) Already in force
   - B) February 2025
   - C) August 2026
   - D) August 2027

5. Which is NOT a high-risk category under Annex III?
   - A) Employment and recruitment
   - B) Credit scoring
   - C) Email filtering
   - D) Law enforcement

**Answers:** 1-D, 2-C, 3-B, 4-C, 5-C

---

## 9. Summary

### Key Takeaways

1. **AI needs specialized governance** due to probabilistic nature, black box problems, and potential for harm
2. **EU AI Act** is the most comprehensive regulation; high-risk requirements enforced August 2026
3. **Risk classification** depends on USE, not technology
4. **NIST AI RMF** provides a voluntary but widely-adopted framework
5. **Evidence** is the ultimate measure of compliance - AIGOS generates it continuously
6. **Compliance is a journey** - start now to meet 2026 deadlines

### Regulatory Quick Reference

| Framework | Type | Scope | Status |
|-----------|------|-------|--------|
| EU AI Act | Binding | EU market | Enforcing 2025-2027 |
| NIST AI RMF | Voluntary | US | Active |
| ISO 42001 | Certifiable | Global | Active |

### What's Next

- **Module C-01:** AIGRC CLI Complete Guide
- **Module C-03:** Asset Cards Lifecycle

---

*Module P-03 Complete. Proceed to Tier 1 Core Components.*
