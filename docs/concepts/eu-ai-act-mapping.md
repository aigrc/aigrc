# EU AI Act Mapping Guide

Understanding how AIGRC risk classifications align with the European Union Artificial Intelligence Act.

## Overview

The EU AI Act is the world's first comprehensive legal framework for artificial intelligence, establishing rules based on a risk-based approach. AIGRC's classification system is designed to help organizations assess their AI systems against EU AI Act requirements.

## EU AI Act Structure

The EU AI Act categorizes AI systems into four risk tiers:

```
┌─────────────────────────────────────────────────────────────┐
│                    UNACCEPTABLE RISK                        │
│                      (Prohibited)                            │
├─────────────────────────────────────────────────────────────┤
│                       HIGH RISK                              │
│              (Strict requirements, conformity)               │
├─────────────────────────────────────────────────────────────┤
│                     LIMITED RISK                             │
│               (Transparency obligations)                     │
├─────────────────────────────────────────────────────────────┤
│                     MINIMAL RISK                             │
│                (No specific requirements)                    │
└─────────────────────────────────────────────────────────────┘
```

## AIGRC to EU AI Act Mapping

### Risk Level Correspondence

| AIGRC Level | EU AI Act Category | Legal Basis |
|-------------|-------------------|-------------|
| Minimal | Minimal Risk | Art. 69 (Voluntary codes) |
| Limited | Limited Risk | Art. 50 (Transparency) |
| High | High-Risk AI | Art. 6, Annex III |
| Unacceptable | Prohibited AI | Art. 5 |

## Prohibited AI Systems (Article 5)

### What's Banned

The EU AI Act prohibits AI systems that:

#### 1. Subliminal Manipulation
- Techniques beyond consciousness to distort behavior
- Causes or likely to cause harm

**AIGRC Detection:**
```yaml
# Triggers unacceptable if detected
riskFactors:
  autonomousDecisions: true
  customerFacing: true
  # Combined with manipulation patterns
```

#### 2. Exploitation of Vulnerabilities
- Targets age, disability, or social/economic situation
- Distorts behavior causing harm

**Examples:**
- AI toys manipulating children
- Systems targeting elderly with predatory tactics

#### 3. Social Scoring by Public Authorities
- Evaluating individuals based on social behavior
- Leading to detrimental or disproportionate treatment

**AIGRC Mapping:**
```yaml
riskFactors:
  autonomousDecisions: true
  highStakesDecisions: true
  piiProcessing: "yes"
  # In public authority context → Unacceptable
```

#### 4. Real-Time Remote Biometric Identification
- In publicly accessible spaces
- For law enforcement purposes
- With limited exceptions

#### 5. Biometric Categorization (Sensitive Attributes)
- Inferring race, political opinions, religion, sexual orientation
- From biometric data

#### 6. Untargeted Facial Recognition Databases
- Scraping images from internet/CCTV
- Building facial recognition databases

#### 7. Emotion Recognition in Workplace/Education
- Inferring emotions of workers or students
- With some exceptions

### AIGRC Unacceptable Classification

When AIGRC classifies as "Unacceptable":

```typescript
// Automatic unacceptable triggers
if (
  (factors.highStakesDecisions && factors.autonomousDecisions && factors.piiProcessing === "yes") ||
  (detectedPatterns.includes("biometric_identification")) ||
  (detectedPatterns.includes("social_scoring"))
) {
  return "unacceptable";
}
```

**Required Action:** System cannot be deployed. Immediate remediation required.

## High-Risk AI Systems (Article 6 & Annex III)

### Categories Defined in Annex III

#### 1. Biometrics
- Remote biometric identification (non-real-time)
- Biometric categorization
- Emotion recognition

**AIGRC Mapping:**
```yaml
classification:
  euAiActCategory: "Biometric systems"
  annexIII: "1"
  requirements:
    - "Conformity assessment"
    - "Biometric data protection"
    - "Accuracy testing"
```

#### 2. Critical Infrastructure
- Safety components of critical infrastructure
- Management of water, gas, heating, electricity

**AIGRC Mapping:**
```yaml
classification:
  euAiActCategory: "Critical infrastructure"
  annexIII: "2"
```

#### 3. Education and Training
- Determining access to education
- Assessing learning outcomes
- Detecting prohibited behavior during tests

**AIGRC Mapping:**
```yaml
technical:
  domain: "education"
riskFactors:
  highStakesDecisions: true  # Educational outcomes
  autonomousDecisions: true   # Automated grading
  piiProcessing: "yes"        # Student data
```

#### 4. Employment and Workers
- Recruitment and selection
- Promotion and termination decisions
- Task allocation based on behavior
- Monitoring and evaluation

**AIGRC Mapping:**
```yaml
classification:
  euAiActCategory: "Employment decisions"
  annexIII: "4"
  requirements:
    - "Human oversight"
    - "Non-discrimination testing"
    - "Transparency to candidates"
```

#### 5. Essential Services Access
- Creditworthiness assessment
- Life and health insurance pricing
- Emergency services prioritization

**AIGRC Mapping:**
```yaml
# Credit scoring example
riskFactors:
  autonomousDecisions: true
  highStakesDecisions: true
  piiProcessing: "yes"
  externalDataAccess: true  # Credit bureaus

classification:
  euAiActCategory: "Credit and insurance"
  annexIII: "5a"
```

#### 6. Law Enforcement
- Risk assessment of offending
- Polygraph and similar tools
- Evidence reliability assessment
- Crime prediction

**AIGRC Mapping:**
```yaml
classification:
  euAiActCategory: "Law enforcement"
  annexIII: "6"
  requirements:
    - "Logging and traceability"
    - "Human oversight mandatory"
```

#### 7. Migration and Border Control
- Polygraphs and similar
- Risk assessment for irregular migration
- Document authenticity verification

#### 8. Justice and Democracy
- Assisting judicial decisions
- Influencing election outcomes

### High-Risk Requirements

For high-risk systems, EU AI Act requires:

| Requirement | Article | AIGRC Artifact |
|-------------|---------|----------------|
| Risk Management System | Art. 9 | `risk_management_plan` |
| Data Governance | Art. 10 | `data_governance_doc` |
| Technical Documentation | Art. 11 | `technical_documentation` |
| Record Keeping | Art. 12 | `logging_specification` |
| Transparency | Art. 13 | `user_instructions` |
| Human Oversight | Art. 14 | `oversight_procedures` |
| Accuracy & Robustness | Art. 15 | `testing_report` |
| Cybersecurity | Art. 15 | `security_assessment` |

**AIGRC Required Artifacts for High-Risk:**

```yaml
classification:
  riskLevel: high
  euAiActCategory: "High-risk AI system"
  requiredArtifacts:
    - risk_management_plan
    - data_governance_doc
    - technical_documentation
    - logging_specification
    - user_instructions
    - oversight_procedures
    - testing_report
    - security_assessment
    - conformity_declaration
```

## Limited Risk (Article 50)

### Transparency Obligations

Limited risk systems must inform users they are interacting with AI:

#### Chatbots and Virtual Assistants
Users must be informed they're communicating with AI unless obvious.

```yaml
classification:
  riskLevel: limited
  euAiActCategory: "Transparency obligations"
  requirements:
    - "Inform users of AI interaction"
```

#### Emotion Recognition / Biometric Categorization
Must inform individuals when these systems are used.

#### AI-Generated Content
- Deep fakes must be labeled
- AI-generated text in public interest matters must be disclosed
- Synthetic audio/video must be machine-readable labeled

**AIGRC Mapping for Content Generation:**

```yaml
technical:
  type: content_generation

classification:
  riskLevel: limited
  euAiActCategory: "AI-generated content"
  requirements:
    - "Content labeling"
    - "Watermarking for synthetic media"
    - "Disclosure for public interest content"
```

### AIGRC Limited Risk Triggers

```yaml
# Triggers limited risk classification
riskFactors:
  customerFacing: true        # User interaction
  autonomousDecisions: false  # Not high-stakes decisions
  highStakesDecisions: false  # Not affecting major life decisions
```

## Minimal Risk

### No Specific Requirements

Most AI systems fall into minimal risk:
- AI in video games
- Spam filters
- Inventory management
- Search engines (basic)

**AIGRC Minimal Classification:**

```yaml
riskFactors:
  autonomousDecisions: false
  customerFacing: false
  toolExecution: false
  externalDataAccess: false
  piiProcessing: "no"
  highStakesDecisions: false

classification:
  riskLevel: minimal
  euAiActCategory: null
  requirements: []
```

### Voluntary Codes of Conduct

Article 69 encourages codes of conduct for minimal-risk AI:
- Environmental sustainability
- Accessibility
- Stakeholder participation
- Diversity in development teams

## General-Purpose AI Models (GPAI)

### Foundation Model Requirements

The EU AI Act includes provisions for GPAI/foundation models:

#### Standard Requirements (All GPAI)
- Technical documentation
- EU copyright law compliance
- Training data summary

#### Systemic Risk Requirements
For models with significant capabilities:
- Model evaluation
- Adversarial testing
- Incident reporting
- Cybersecurity measures

**AIGRC Mapping:**

```yaml
technical:
  type: foundation_model
  framework: "custom_llm"

classification:
  euAiActCategory: "General-purpose AI"
  gpaiTier: "systemic_risk"  # or "standard"
  requirements:
    - "Technical documentation"
    - "Copyright compliance documentation"
    - "Training data summary"
    - "Model evaluation results"
    - "Adversarial testing report"
```

## Compliance Timeline

### Key Dates

| Date | What Applies |
|------|--------------|
| August 2024 | Act enters into force |
| February 2025 | Prohibited AI bans apply |
| August 2025 | GPAI rules apply |
| August 2026 | Most provisions apply |
| August 2027 | High-risk (Annex III) systems |

### AIGRC Compliance Tracking

```yaml
metadata:
  euAiActCompliance:
    applicableDate: "2026-08-01"
    status: "in_progress"
    assessmentDate: "2024-06-15"
    nextReview: "2025-02-01"
    gaps:
      - "Technical documentation incomplete"
      - "Human oversight procedures pending"
```

## Practical Mapping Examples

### Example 1: Customer Service Chatbot

**System:** AI chatbot for customer inquiries

**AIGRC Classification:**
```yaml
riskFactors:
  autonomousDecisions: false
  customerFacing: true
  toolExecution: false
  externalDataAccess: true
  piiProcessing: "no"
  highStakesDecisions: false

classification:
  riskLevel: limited
  euAiActCategory: "Transparency obligations"
```

**EU AI Act Requirements:**
- Inform users they're talking to AI
- No conformity assessment needed

---

### Example 2: Resume Screening Tool

**System:** AI that filters job applications

**AIGRC Classification:**
```yaml
riskFactors:
  autonomousDecisions: true   # Auto-rejects candidates
  customerFacing: false
  toolExecution: true         # Updates ATS
  externalDataAccess: true    # LinkedIn, background checks
  piiProcessing: "yes"        # Candidate data
  highStakesDecisions: true   # Employment decisions

classification:
  riskLevel: high
  euAiActCategory: "Employment decisions"
  annexIII: "4a"
```

**EU AI Act Requirements:**
- Full conformity assessment
- Risk management system
- Non-discrimination testing
- Human oversight for rejections
- Transparency to candidates
- Data governance documentation

---

### Example 3: Fraud Detection System

**System:** Real-time transaction fraud detection

**AIGRC Classification:**
```yaml
riskFactors:
  autonomousDecisions: true   # Blocks transactions
  customerFacing: true        # Affects customer transactions
  toolExecution: true         # Blocks/flags transactions
  externalDataAccess: true    # Transaction networks
  piiProcessing: "yes"        # Financial data
  highStakesDecisions: false  # Financial, but not life-critical

classification:
  riskLevel: high
  euAiActCategory: "Essential private services"
```

**EU AI Act Requirements:**
- Technical documentation
- Accuracy testing
- False positive monitoring
- Appeal mechanism for blocked transactions

---

### Example 4: AI Image Generator

**System:** Generates images from text prompts

**AIGRC Classification:**
```yaml
riskFactors:
  autonomousDecisions: false
  customerFacing: true
  toolExecution: false
  externalDataAccess: false
  piiProcessing: "no"
  highStakesDecisions: false

classification:
  riskLevel: limited
  euAiActCategory: "AI-generated content"
```

**EU AI Act Requirements:**
- Machine-readable labeling of generated content
- Watermarking for synthetic media
- Disclosure obligations for certain uses

## Documentation Templates

### High-Risk System Documentation

AIGRC provides templates for required documentation:

```
.aigrc/
├── cards/
│   └── my-high-risk-system.yaml
└── artifacts/
    ├── risk-management-plan.md
    ├── data-governance.md
    ├── technical-documentation.md
    ├── human-oversight-procedures.md
    ├── testing-report.md
    └── conformity-declaration.md
```

### Artifact Linking (Golden Thread)

```yaml
# In asset card
goldenThread:
  riskManagement:
    document: "./artifacts/risk-management-plan.md"
    lastUpdated: "2024-06-01"
    version: "1.2"

  technicalDocumentation:
    document: "./artifacts/technical-documentation.md"
    lastUpdated: "2024-05-15"
    version: "2.0"

  conformityAssessment:
    status: "completed"
    date: "2024-06-10"
    body: "Notified Body XYZ"
    certificate: "./artifacts/conformity-certificate.pdf"
```

## API Reference

### Getting EU AI Act Category

```typescript
import { classifyRisk } from "@aigrc/core";

const result = classifyRisk({
  autonomousDecisions: true,
  customerFacing: true,
  toolExecution: true,
  externalDataAccess: true,
  piiProcessing: "yes",
  highStakesDecisions: true,
});

console.log(result.euAiActCategory);
// "High-risk AI system"

console.log(result.requiredArtifacts);
// [
//   "risk_management_plan",
//   "data_governance_doc",
//   "technical_documentation",
//   "logging_specification",
//   "user_instructions",
//   "oversight_procedures",
//   "testing_report",
//   "security_assessment"
// ]
```

### Checking Compliance Gaps

```typescript
import { checkCompliance } from "@aigrc/core";

const gaps = checkCompliance(assetCard);

console.log(gaps);
// {
//   missing: ["risk_management_plan", "testing_report"],
//   outdated: ["technical_documentation"],
//   compliant: ["data_governance_doc", "oversight_procedures"]
// }
```

## Resources

### Official EU AI Act Resources
- [EU AI Act Full Text](https://eur-lex.europa.eu/eli/reg/2024/1689)
- [European Commission AI Act Page](https://digital-strategy.ec.europa.eu/en/policies/regulatory-framework-ai)

### AIGRC Resources
- [Risk Classification Deep Dive](./risk-classification.md)
- [Asset Cards Guide](./asset-cards.md)
- [Golden Thread Documentation](./golden-thread.md)

## Next Steps

- Review your AI systems against this mapping
- Run `aigrc scan` to detect AI usage
- Run `aigrc init` to create asset cards
- Identify high-risk systems requiring conformity assessment
- Create required documentation artifacts
- Set up compliance monitoring with GitHub Action
