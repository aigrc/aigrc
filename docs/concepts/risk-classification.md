# Risk Classification Deep Dive

Understanding how AIGRC classifies AI systems by risk level and what it means for your organization.

## Overview

AIGRC uses a risk-based approach to AI governance, classifying systems into four levels based on their potential impact. This classification drives compliance requirements, documentation needs, and oversight levels.

## The Four Risk Levels

### Minimal Risk

**Definition:** AI systems with negligible potential for harm or rights impact.

**Characteristics:**
- Internal use only
- No autonomous decision-making
- No direct customer interaction
- No processing of sensitive data
- Low-stakes outcomes

**Examples:**
- Internal analytics dashboards
- Code completion tools (internal)
- Log analysis systems
- Development/testing tools
- Spell checkers

**Requirements:**
- Basic documentation recommended
- No mandatory compliance measures
- Optional transparency measures

**Risk Score:** 0-2 points

---

### Limited Risk

**Definition:** AI systems with transparency obligations but limited potential harm.

**Characteristics:**
- Customer-facing interactions
- Content generation
- Users should know they're interacting with AI
- No high-stakes decisions

**Examples:**
- Customer support chatbots
- Content generation tools
- Recommendation systems (non-critical)
- Virtual assistants
- Automated email responses

**Requirements:**
- Transparency disclosure required
- Users must be informed of AI interaction
- Basic documentation
- Periodic review recommended

**Risk Score:** 3-5 points

---

### High Risk

**Definition:** AI systems that significantly impact rights, safety, or important decisions.

**Characteristics:**
- Autonomous decisions affecting individuals
- Processing of personal data
- High-stakes outcomes
- Safety-critical applications
- Access to sensitive systems

**Examples:**
- Credit scoring systems
- Hiring/recruitment tools
- Insurance underwriting
- Medical diagnosis assistance
- Educational assessment
- Fraud detection with enforcement
- Access control systems

**Requirements:**
- Conformity assessment
- Risk management system
- Data governance measures
- Technical documentation
- Human oversight mechanisms
- Logging and traceability
- Accuracy and robustness testing
- Cybersecurity measures

**Risk Score:** 6-8 points

---

### Unacceptable Risk

**Definition:** AI systems that pose clear threats to safety, rights, or democratic values.

**Characteristics:**
- Manipulation or deception
- Exploitation of vulnerabilities
- Mass surveillance
- Social scoring
- Prohibited biometric uses

**Examples:**
- Social credit scoring
- Real-time biometric surveillance (public spaces)
- Subliminal manipulation systems
- Exploitation of vulnerable groups
- Emotion recognition in workplace/education (certain contexts)

**Requirements:**
- **Prohibited** - Cannot be deployed
- Immediate remediation required
- May require system shutdown

**Risk Score:** 9+ points

## Risk Factors

AIGRC evaluates six key risk factors to determine classification:

### 1. Autonomous Decisions

**Question:** Does the AI make decisions without human review?

| Value | Points | Description |
|-------|--------|-------------|
| `false` | 0 | Human reviews all decisions |
| `true` | 2 | AI makes final decisions |

**Why it matters:** Autonomous decisions remove human oversight and accountability, increasing potential for harm from errors or bias.

**Examples of autonomous decisions:**
- Automatic loan approvals/denials
- Automated content moderation with immediate effect
- Self-driving vehicle decisions
- Automated trading execution

---

### 2. Customer Facing

**Question:** Does the AI interact directly with customers/end-users?

| Value | Points | Description |
|-------|--------|-------------|
| `false` | 0 | Internal use only |
| `true` | 1 | Direct customer interaction |

**Why it matters:** Customer-facing AI requires transparency and can directly impact user experience and trust.

**Examples:**
- Chatbots and virtual assistants
- Personalized recommendations
- Customer service automation
- User-facing content generation

---

### 3. Tool Execution

**Question:** Can the AI execute tools, functions, or take actions?

| Value | Points | Description |
|-------|--------|-------------|
| `false` | 0 | Information only |
| `true` | 2 | Can execute actions |

**Why it matters:** Tool execution gives AI agency to affect systems, data, or real-world outcomes beyond just providing information.

**Examples:**
- AI agents with function calling
- Automated workflows
- Database modifications
- API integrations
- File system access

---

### 4. External Data Access

**Question:** Does the AI access external data sources or APIs?

| Value | Points | Description |
|-------|--------|-------------|
| `false` | 0 | Uses only provided context |
| `true` | 1 | Accesses external sources |

**Why it matters:** External data access introduces dependencies, potential data leakage, and third-party risk.

**Examples:**
- Web search integration
- Database queries
- Third-party API calls
- Real-time data feeds

---

### 5. PII Processing

**Question:** Does the AI process personally identifiable information?

| Value | Points | Description |
|-------|--------|-------------|
| `"no"` | 0 | No personal data |
| `"unknown"` | 1 | Unclear or possible |
| `"yes"` | 2 | Processes personal data |

**Why it matters:** PII processing triggers data protection requirements and increases privacy risk.

**Types of PII:**
- Names and contact information
- Financial data
- Health information
- Biometric data
- Location data
- Behavioral data

---

### 6. High-Stakes Decisions

**Question:** Do the AI's outputs affect important life decisions?

| Value | Points | Description |
|-------|--------|-------------|
| `false` | 0 | Low-impact decisions |
| `true` | 3 | Affects major life decisions |

**Why it matters:** High-stakes decisions have significant, potentially irreversible impacts on individuals.

**Examples of high-stakes domains:**
- Employment and hiring
- Credit and lending
- Insurance
- Education and assessment
- Healthcare
- Legal proceedings
- Housing

## Scoring Algorithm

### Point Calculation

```
Total Score =
  (autonomousDecisions ? 2 : 0) +
  (customerFacing ? 1 : 0) +
  (toolExecution ? 2 : 0) +
  (externalDataAccess ? 1 : 0) +
  (piiProcessing === "yes" ? 2 : piiProcessing === "unknown" ? 1 : 0) +
  (highStakesDecisions ? 3 : 0)
```

**Maximum possible score:** 11 points

### Score to Risk Level Mapping

| Score Range | Risk Level |
|-------------|------------|
| 0-2 | Minimal |
| 3-5 | Limited |
| 6-8 | High |
| 9+ | Unacceptable |

### Classification Logic

```typescript
function classifyRisk(factors: RiskFactors): RiskLevel {
  let score = 0;

  if (factors.autonomousDecisions) score += 2;
  if (factors.customerFacing) score += 1;
  if (factors.toolExecution) score += 2;
  if (factors.externalDataAccess) score += 1;
  if (factors.piiProcessing === "yes") score += 2;
  else if (factors.piiProcessing === "unknown") score += 1;
  if (factors.highStakesDecisions) score += 3;

  // Special case: high-stakes + autonomous = minimum high risk
  if (factors.highStakesDecisions && factors.autonomousDecisions) {
    return score >= 9 ? "unacceptable" : "high";
  }

  if (score >= 9) return "unacceptable";
  if (score >= 6) return "high";
  if (score >= 3) return "limited";
  return "minimal";
}
```

## Examples by Classification

### Example 1: Internal Code Assistant

```yaml
riskFactors:
  autonomousDecisions: false    # Developer reviews suggestions
  customerFacing: false         # Internal tool
  toolExecution: false          # Suggests only, doesn't execute
  externalDataAccess: false     # Uses local context
  piiProcessing: "no"           # Code only
  highStakesDecisions: false    # Development aid
```

**Score:** 0 points → **Minimal Risk**

---

### Example 2: Customer Support Chatbot

```yaml
riskFactors:
  autonomousDecisions: false    # Escalates complex issues
  customerFacing: true          # Talks to customers
  toolExecution: false          # Information only
  externalDataAccess: true      # Queries knowledge base
  piiProcessing: "no"           # No personal data stored
  highStakesDecisions: false    # Support queries only
```

**Score:** 2 points → **Minimal Risk** (borderline Limited)

---

### Example 3: AI Sales Agent

```yaml
riskFactors:
  autonomousDecisions: true     # Handles deals independently
  customerFacing: true          # Direct customer contact
  toolExecution: true           # Sends emails, updates CRM
  externalDataAccess: true      # CRM, email, calendar
  piiProcessing: "yes"          # Customer contact info
  highStakesDecisions: false    # Not life-impacting
```

**Score:** 8 points → **High Risk**

---

### Example 4: Loan Approval System

```yaml
riskFactors:
  autonomousDecisions: true     # Auto-approves/denies
  customerFacing: true          # Customer-facing portal
  toolExecution: true           # Updates accounts
  externalDataAccess: true      # Credit bureaus
  piiProcessing: "yes"          # Financial data
  highStakesDecisions: true     # Affects credit access
```

**Score:** 11 points → **Unacceptable Risk**

This system would need human oversight on decisions to reduce risk level.

## Reducing Risk Level

### Mitigation Strategies

| Risk Factor | Mitigation | Effect |
|-------------|------------|--------|
| Autonomous Decisions | Add human-in-the-loop review | -2 points |
| Tool Execution | Require approval for actions | -2 points |
| PII Processing | Anonymize or minimize data | -1 to -2 points |
| High-Stakes | Add appeal process, human review | May cap at "high" |

### Example: Reducing Loan System Risk

**Before (Unacceptable - 11 points):**
- Fully autonomous approvals
- Direct system updates

**After (High - 7 points):**
```yaml
riskFactors:
  autonomousDecisions: false    # Human reviews all decisions
  customerFacing: true
  toolExecution: true
  externalDataAccess: true
  piiProcessing: "yes"
  highStakesDecisions: true
```

Changes made:
- Added mandatory human review for all decisions
- Kept tool execution but with audit logging
- Implemented appeal process

## Ongoing Classification

### When to Reclassify

Re-evaluate classification when:
- Adding new capabilities (e.g., tool execution)
- Changing audience (internal → customer-facing)
- Expanding data access
- Modifying decision autonomy
- Entering new domains

### Continuous Monitoring

```yaml
# Asset card with review schedule
metadata:
  lastClassified: "2024-01-15"
  nextReview: "2024-07-15"
  classificationHistory:
    - date: "2024-01-15"
      level: "limited"
      reason: "Initial classification"
    - date: "2024-06-01"
      level: "high"
      reason: "Added autonomous decision capability"
```

## API Usage

### Programmatic Classification

```typescript
import { classifyRisk } from "@aigrc/core";

const factors = {
  autonomousDecisions: true,
  customerFacing: true,
  toolExecution: false,
  externalDataAccess: true,
  piiProcessing: "no" as const,
  highStakesDecisions: false,
};

const result = classifyRisk(factors);

console.log(result.riskLevel);        // "limited"
console.log(result.reasons);          // ["Autonomous decisions", "Customer facing", ...]
console.log(result.euAiActCategory);  // "Transparency obligations"
console.log(result.requiredArtifacts); // ["transparency_notice", ...]
```

## Next Steps

- [EU AI Act Mapping Guide](./eu-ai-act-mapping.md) - Regulatory alignment
- [Asset Cards](./asset-cards.md) - Documenting classifications
- [Detection Engine](../guides/detection-engine.md) - Automatic risk inference
