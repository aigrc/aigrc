# Module 1.2: Risk Classification

> **Duration:** 30-45 minutes
> **Level:** Foundations
> **Prerequisites:** Module 1.1

---

## Learning Objectives

By the end of this module, you will be able to:
1. Apply the 4-tier risk classification model to AI systems
2. Map AI use cases to EU AI Act risk categories
3. Identify the governance requirements for each risk level
4. Classify real-world AI systems correctly

---

## Overview (5 min)

Not all AI systems carry the same risk. A recommendation engine for movies is fundamentally different from an AI that approves mortgage applications. This module teaches you to classify AI systems accurately so you can apply appropriate governance controls.

---

## WHY: Risk-Based Governance (15 min)

### The Problem with One-Size-Fits-All

**Scenario A:** Company applies same governance to all AI
- Result: Low-risk systems delayed for months
- Developers bypass governance entirely
- Shadow AI increases

**Scenario B:** Company has no governance
- Result: High-risk systems deployed without controls
- Regulatory exposure grows
- Incident response is reactive

**The Solution:** Risk-proportionate governance
- Minimal oversight for low-risk systems
- Intensive controls for high-risk systems
- Clear classification criteria

### The Cost of Misclassification

| Misclassification | Consequence |
|-------------------|-------------|
| High-risk treated as minimal | Regulatory penalties, safety incidents |
| Minimal-risk treated as high | Wasted resources, slow innovation |
| Unknown risk level | Uncontrolled exposure |

---

## WHAT: The 4-Tier Risk Model (20 min)

### Risk Classification Framework

```
┌─────────────────────────────────────────────────────────────────┐
│                    UNACCEPTABLE RISK                            │
│                    (Prohibited)                                  │
│   Social scoring, real-time biometric ID, manipulation          │
├─────────────────────────────────────────────────────────────────┤
│                      HIGH RISK                                   │
│                    (Strict Requirements)                         │
│   Safety components, employment, credit, law enforcement        │
├─────────────────────────────────────────────────────────────────┤
│                     LIMITED RISK                                 │
│                  (Transparency Obligations)                      │
│   Chatbots, emotion recognition, deepfake detection             │
├─────────────────────────────────────────────────────────────────┤
│                     MINIMAL RISK                                 │
│                    (No Specific Obligations)                     │
│   Spam filters, game AI, recommendation engines                 │
└─────────────────────────────────────────────────────────────────┘
```

### Tier 1: Minimal Risk

**Definition:** AI systems that pose negligible risk to fundamental rights or safety.

**Examples:**
- Spam email filters
- Product recommendation engines
- Video game AI
- Search result ranking
- Auto-complete in text editors

**Governance Requirements:**
- ✅ Optional documentation
- ✅ No mandatory controls
- ✅ Best practice: Register in asset inventory

**AIGRC Asset Card:**
```yaml
risk_classification:
  level: minimal
  rationale: "Internal document classification with no impact on individuals"
  eu_ai_act_category: minimal_risk
```

### Tier 2: Limited Risk

**Definition:** AI systems with specific transparency requirements.

**Examples:**
- Customer service chatbots
- Emotion recognition systems
- Content generation (text, image, audio)
- Deepfake/synthetic content

**Governance Requirements:**
- ⚠️ **Transparency disclosure** - Users must know they're interacting with AI
- ⚠️ **Content labeling** - AI-generated content must be identified
- ✅ Documentation recommended

**AIGRC Asset Card:**
```yaml
risk_classification:
  level: limited
  rationale: "Customer-facing chatbot requires transparency disclosure"
  eu_ai_act_category: limited_risk
  transparency_measures:
    - disclosure_presented: true
    - disclosure_text: "You are chatting with an AI assistant"
```

### Tier 3: High Risk

**Definition:** AI systems that significantly affect fundamental rights, safety, or important decisions.

**High-Risk Categories (EU AI Act Annex III):**

| Category | Examples |
|----------|----------|
| **Biometrics** | Facial recognition, fingerprint matching |
| **Critical Infrastructure** | Energy grid management, water systems |
| **Education** | Exam scoring, student assessment |
| **Employment** | Resume screening, interview analysis |
| **Essential Services** | Credit scoring, insurance pricing |
| **Law Enforcement** | Risk assessment, evidence evaluation |
| **Migration** | Visa processing, border control |
| **Justice** | Sentencing recommendations |
| **Democratic Processes** | Voter influence, political ads |

**Governance Requirements:**
- 🔴 **Risk management system** - Documented and maintained
- 🔴 **Data governance** - Training data quality assured
- 🔴 **Technical documentation** - Comprehensive system docs
- 🔴 **Record keeping** - Automatic logging of decisions
- 🔴 **Transparency** - Information for users and authorities
- 🔴 **Human oversight** - Humans can intervene/override
- 🔴 **Accuracy & robustness** - Performance validation
- 🔴 **Cybersecurity** - Protection against manipulation

**AIGRC Asset Card:**
```yaml
risk_classification:
  level: high
  rationale: "Employment decision support system - Annex III category"
  eu_ai_act_category: high_risk_annex_iii
  high_risk_requirements:
    risk_management: true
    data_governance: true
    technical_documentation: true
    record_keeping: true
    transparency: true
    human_oversight: true
    accuracy_robustness: true
    cybersecurity: true
```

### Tier 4: Unacceptable Risk (Prohibited)

**Definition:** AI systems that pose an unacceptable risk to fundamental rights and are banned.

**Prohibited Systems:**
| System Type | Why Prohibited |
|-------------|----------------|
| **Social scoring** by governments | Undermines human dignity |
| **Exploitation of vulnerabilities** | Targets children, disabled, elderly |
| **Real-time remote biometric ID** in public | Mass surveillance concerns |
| **Subliminal manipulation** | Bypasses conscious choice |
| **Emotion inference** in workplace/education | Privacy violation (with exceptions) |
| **Biometric categorization** by race, religion | Discrimination risk |
| **Facial recognition databases** from scraping | Privacy violation |
| **Predictive policing** based on profiling | Bias and discrimination |

**Governance Requirement:**
- 🚫 **DO NOT DEPLOY** - These systems are illegal under EU AI Act
- 🚫 If identified, must be decommissioned

**AIGRC Asset Card:**
```yaml
risk_classification:
  level: unacceptable
  rationale: "Real-time biometric identification in public spaces"
  eu_ai_act_category: prohibited
  status: BLOCKED
  action_required: "System must not be deployed - prohibited under EU AI Act"
```

---

## HOW: Classification Process (15 min)

### Step 1: Identify the AI System

Ask these questions:
1. What does this AI system do?
2. What decisions does it make or influence?
3. Who or what is affected by its outputs?
4. What data does it process?

### Step 2: Apply the Decision Tree

```
Is the system used for:
├─ Social scoring, subliminal manipulation, or exploiting vulnerabilities?
│  └─ YES → UNACCEPTABLE (Prohibited)
│
├─ Real-time remote biometric identification in public?
│  └─ YES → UNACCEPTABLE (with limited exceptions)
│
├─ Decisions about employment, credit, education, law enforcement,
│  migration, justice, or critical infrastructure?
│  └─ YES → HIGH RISK
│
├─ Interacting with users (chatbot) or generating content?
│  └─ YES → LIMITED RISK
│
└─ None of the above?
   └─ MINIMAL RISK
```

### Step 3: Document Your Classification

Use the AIGRC CLI:

```bash
# Classify an AI asset
aigrc classify --asset my-chatbot

? What is the primary function of this AI system?
> Customer service automation

? Does this system make or influence decisions about:
  - Employment
  - Credit/Financial services
  - Education
  - Law enforcement
> No

? Does this system interact directly with users?
> Yes

Classification Result:
  Risk Level: LIMITED
  EU AI Act Category: limited_risk
  Required Controls: Transparency disclosure
```

### Step 4: Generate Asset Card

```bash
# Create asset card with classification
aigrc register --type chatbot --risk limited

Created: .aigrc/cards/customer-chatbot.asset.yaml
```

---

## Practice Lab (15 min)

### Exercise 1: Classify These Systems

For each system, determine the risk level and explain why:

| System | Your Classification | Rationale |
|--------|---------------------|-----------|
| Spam filter for email | | |
| AI interview scoring | | |
| Product recommendation engine | | |
| Government social credit system | | |
| AI-generated marketing copy | | |
| Autonomous vehicle perception | | |
| Customer support chatbot | | |
| AI resume screener | | |

<details>
<summary>Click for Answers</summary>

| System | Classification | Rationale |
|--------|---------------|-----------|
| Spam filter | **Minimal** | No impact on rights |
| AI interview scoring | **High** | Employment decision |
| Product recommendation | **Minimal** | No significant impact |
| Social credit system | **Unacceptable** | Explicitly prohibited |
| AI marketing copy | **Limited** | Content generation |
| Autonomous vehicle | **High** | Safety-critical |
| Support chatbot | **Limited** | User interaction |
| Resume screener | **High** | Employment decision |

</details>

### Exercise 2: Real-World Classification

Take a real AI system from your organization and:
1. Document its function
2. Apply the decision tree
3. Identify the risk level
4. List the required governance controls

---

## Knowledge Check

1. **An AI that scores job applicants is classified as:**
   - a) Minimal risk
   - b) Limited risk
   - c) High risk ✓
   - d) Unacceptable risk

2. **Which is NOT a prohibited AI system under EU AI Act?**
   - a) Social scoring by governments
   - b) Product recommendations ✓
   - c) Real-time public biometric ID
   - d) Subliminal manipulation

3. **A customer service chatbot requires:**
   - a) No governance
   - b) Transparency disclosure ✓
   - c) Full conformity assessment
   - d) Government approval

4. **High-risk AI systems must have:**
   - a) Only documentation
   - b) Risk management and human oversight ✓
   - c) No specific requirements
   - d) Government operation

---

## Key Takeaways

1. **Risk classification is the foundation** - Everything else depends on accurate classification
2. **Four tiers:** Minimal, Limited, High, Unacceptable
3. **EU AI Act defines categories** - Use Annex III for high-risk identification
4. **Proportionate governance** - More risk = more controls
5. **When in doubt, classify higher** - Can always reclassify down with evidence

---

## Reference: Sample Asset Cards

Located in `aigrc/test-environment/assets/`:

| File | Risk Level | Example |
|------|------------|---------|
| `minimal-risk-classifier.asset.yaml` | Minimal | Document classifier |
| `limited-risk-chatbot.asset.yaml` | Limited | FAQ chatbot |
| `high-risk-agent.asset.yaml` | High | Autonomous support agent |
| `unacceptable-risk-biometric.asset.yaml` | Unacceptable | Prohibited system |

---

## Further Reading

- [EU AI Act Annex III - High-Risk Categories](https://eur-lex.europa.eu/eli/reg/2024/1689)
- AIGRC Documentation: `aigrc/docs/concepts/risk-classification.md`
- AIGRC Documentation: `aigrc/docs/concepts/eu-ai-act-mapping.md`

---

## Next Module

[Module 1.3: Quick Start with AIGRC →](./03-quick-start.md)

---

*Module 1.2 - AIGRC Training Program v1.0*
