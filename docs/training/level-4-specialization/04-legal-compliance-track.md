# Track 4.4: Legal & Compliance Specialization

> **Duration:** 2-2.5 hours
> **Prerequisites:** Level 1, Level 3.2 (Multi-Jurisdiction Compliance)
> **Target Audience:** General Counsel, Compliance Officers, Privacy Officers, Legal Operations

---

## Learning Objectives

By the end of this track, you will be able to:
1. Interpret AI regulations and translate them to governance requirements
2. Build compliance programs using AIGRC tooling
3. Conduct legal risk assessments for AI systems
4. Manage regulatory filings and documentation
5. Advise business stakeholders on AI governance requirements

---

## Module 1: Regulatory Landscape Overview (30 min)

### Global AI Regulation Map

```
┌─────────────────────────────────────────────────────────────────┐
│                  AI REGULATORY LANDSCAPE 2026                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  BINDING LEGISLATION                                            │
│  ───────────────────                                            │
│  ● EU AI Act                    Enforceable Feb 2025+           │
│  ● US OMB M-24-10               Federal agencies, active        │
│  ● China AI Regulations         Active, evolving                │
│  ● Canada AIDA                  Proposed                        │
│  ● Brazil AI Bill               Proposed                        │
│                                                                 │
│  STANDARDS & FRAMEWORKS                                         │
│  ──────────────────────                                         │
│  ● NIST AI RMF                  Voluntary, influential          │
│  ● ISO 42001                    Certification available         │
│  ● IEEE Standards               Technical specifications        │
│  ● OECD AI Principles           Policy guidance                 │
│                                                                 │
│  SECTOR-SPECIFIC                                                │
│  ───────────────                                                │
│  ● FDA AI/ML (Healthcare)       Binding in scope                │
│  ● SEC AI Guidance (Finance)    Emerging                        │
│  ● EEOC AI Hiring (HR)          Enforcement active              │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### EU AI Act Deep Dive

**Compliance Timeline:**
```
2024 Feb - Act enters into force
2024 Aug - Prohibited AI banned (6 months)
2025 Aug - GPAI rules apply (12 months)
2026 Aug - Most rules apply (24 months)
2027 Aug - Full enforcement (36 months)
```

**Risk Categories → AIGRC Mapping:**

| EU AI Act Category | AIGRC Risk Level | Requirements |
|-------------------|------------------|--------------|
| Unacceptable | `unacceptable` | Prohibited |
| High-Risk (Annex III) | `high` | Conformity assessment, registration |
| Limited Risk | `limited` | Transparency obligations |
| Minimal Risk | `minimal` | Voluntary codes |

**AIGRC Asset Card → EU AI Act Fields:**
```yaml
# Asset card EU AI Act compliance section
eu_ai_act:
  category: limited_risk  # or high_risk, minimal_risk

  # For high-risk systems:
  annex_iii_category: "1(a)"  # Biometric identification
  conformity_assessment:
    status: pending
    body: "TÜV Rheinland"
    target_date: 2026-06-01

  # Registration (high-risk only)
  eu_database_registration:
    required: true
    registration_id: "AI-2026-00123"
    registration_date: 2026-03-15

  # Transparency (all AI)
  transparency:
    disclosure_method: "UI badge + terms of service"
    disclosure_text: "AI-generated content"
```

### Penalty Framework

```
┌─────────────────────────────────────────────────────────────────┐
│                    EU AI ACT PENALTIES                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Violation Type                    Maximum Penalty              │
│  ──────────────                    ───────────────              │
│  Prohibited AI practices           €35M or 7% global revenue    │
│  Non-compliance (high-risk)        €15M or 3% global revenue    │
│  Incorrect information             €7.5M or 1% global revenue   │
│                                                                 │
│  SME Penalties: Lower of fixed amount or % revenue              │
│                                                                 │
│  AIGRC RISK MITIGATION VALUE                                    │
│  ─────────────────────────────                                  │
│  ● Documented compliance reduces penalty severity               │
│  ● Good faith efforts considered in enforcement                 │
│  ● Audit trail demonstrates due diligence                       │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Module 2: Compliance Program Design (30 min)

### Building an AI Compliance Program

```
┌─────────────────────────────────────────────────────────────────┐
│               AI COMPLIANCE PROGRAM STRUCTURE                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  GOVERNANCE                                                     │
│  ──────────                                                     │
│  Board oversight → Executive sponsor → Compliance committee     │
│                                                                 │
│  POLICIES                                                       │
│  ────────                                                       │
│  Enterprise AI Policy                                           │
│     └── AI Risk Management Policy                               │
│            └── governance.lock (technical enforcement)          │
│                                                                 │
│  PROCESSES                                                      │
│  ─────────                                                      │
│  Risk Assessment → Registration → Monitoring → Reporting        │
│                                                                 │
│  TOOLS                                                          │
│  ─────                                                          │
│  AIGRC CLI → VS Code → GitHub Action → Compliance Reports       │
│                                                                 │
│  PEOPLE                                                         │
│  ──────                                                         │
│  AI Governance Officer + Legal + Security + Engineering         │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Policy Document Templates

**Enterprise AI Policy (Executive Summary):**
```markdown
# Enterprise Artificial Intelligence Policy

## Purpose
This policy establishes requirements for the responsible development,
deployment, and operation of AI systems across [Company Name].

## Scope
All AI and machine learning systems developed or deployed by the company,
including third-party AI services.

## Key Requirements
1. **Registration:** All AI systems must be registered in the AI inventory
2. **Risk Assessment:** Each AI system must have a documented risk classification
3. **Transparency:** AI-generated content must be disclosed
4. **Human Oversight:** High-risk systems require human oversight mechanisms
5. **Documentation:** Technical and governance documentation required

## Roles and Responsibilities
- **AI Governance Committee:** Policy oversight
- **System Owners:** Day-to-day compliance
- **Legal/Compliance:** Regulatory monitoring
- **Engineering:** Technical implementation

## Enforcement
Non-compliance may result in system decommissioning and disciplinary action.

Approved by: [Board/Executive]
Effective Date: [Date]
Review Date: [Annual]
```

### Risk Assessment Framework

**Legal Risk Assessment Matrix:**

| Factor | Weight | Low (1) | Medium (2) | High (3) |
|--------|--------|---------|------------|----------|
| Regulatory Scrutiny | 25% | Minimal risk category | Limited risk | High risk/Annex III |
| Data Sensitivity | 20% | Public data | Business data | PII/Special categories |
| Decision Impact | 20% | Informational | Influential | Determinative |
| Reversibility | 15% | Easily reversible | Moderately reversible | Irreversible |
| Scale | 10% | Internal only | Limited users | Mass deployment |
| Jurisdiction | 10% | Single jurisdiction | Multiple jurisdictions | EU + others |

**Scoring:**
- 1.0-1.5: Minimal legal risk
- 1.6-2.0: Limited legal risk
- 2.1-2.5: Elevated legal risk
- 2.6-3.0: High legal risk

---

## Module 3: Documentation Requirements (30 min)

### Legal Documentation Hierarchy

```
┌─────────────────────────────────────────────────────────────────┐
│              DOCUMENTATION FOR COMPLIANCE                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  LEVEL 1: ENTERPRISE                                            │
│  ───────────────────                                            │
│  • Enterprise AI Policy                                         │
│  • AI Ethics Guidelines                                         │
│  • Data Processing Agreements                                   │
│                                                                 │
│  LEVEL 2: SYSTEM                                                │
│  ───────────────                                                │
│  • Asset Card (AIGRC)                   ← Primary document      │
│  • Technical Documentation                                      │
│  • Risk Assessment Report                                       │
│  • Data Protection Impact Assessment                            │
│                                                                 │
│  LEVEL 3: OPERATIONAL                                           │
│  ────────────────────                                           │
│  • User Instructions                                            │
│  • Incident Reports                                             │
│  • Audit Logs                                                   │
│  • Training Records                                             │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Asset Card: Legal Perspective

**Key Fields for Legal Review:**

```yaml
# Legal review checklist for asset cards

# 1. IDENTIFICATION
asset_id: customer-ai-service       # Unique identifier for contracts
name: Customer AI Service           # Clear, descriptive name
version: 1.2.0                      # Version for change tracking

# 2. OWNERSHIP
ownership:
  owner: ai-team@company.com        # Accountable party
  legal_contact: legal@company.com  # Legal point of contact
  data_controller: Company Inc.     # GDPR data controller

# 3. RISK CLASSIFICATION
risk_classification:
  level: limited                    # AIGRC risk level
  rationale: |                      # Documented reasoning
    Customer-facing chatbot provides general information.
    No decisions affecting legal rights.
  eu_ai_act_category: limited_risk  # EU AI Act mapping

# 4. DATA PROCESSING
data:
  input_types:
    - customer_queries              # What data is processed
  output_types:
    - ai_responses
  pii_processed: false              # Critical for GDPR
  special_categories: false         # Article 9 data
  data_retention_days: 30           # Retention policy

# 5. THIRD PARTIES
technical:
  vendor: openai
  vendor_dpa: true                  # Data Processing Agreement
  subprocessors:                    # Downstream processors
    - name: Microsoft Azure
      location: EU

# 6. TRANSPARENCY
transparency:
  disclosure_required: true
  disclosure_method: UI badge
  disclosure_text: |
    This response is generated by AI. Information provided
    is for general purposes only and should not be relied
    upon for legal, medical, or financial decisions.

# 7. LEGAL AGREEMENTS
contracts:
  terms_of_service: https://company.com/ai-tos
  privacy_policy: https://company.com/privacy
  vendor_agreement: "OpenAI Enterprise Agreement dated 2025-01-15"
```

### Data Protection Impact Assessment (DPIA)

**When Required:**
- High-risk AI processing personal data
- Systematic monitoring
- Automated decision-making with legal effects
- Special category data processing

**AIGRC + DPIA Integration:**
```yaml
# Asset card DPIA section
dpia:
  required: true
  status: completed
  completion_date: 2025-12-01
  next_review: 2026-12-01
  findings:
    - risk: "Potential for biased outcomes"
      mitigation: "Bias testing implemented quarterly"
    - risk: "Data retention beyond necessity"
      mitigation: "30-day automatic deletion"
  approval:
    dpo_approved: true
    dpo_name: "Jane Smith"
    approval_date: 2025-12-15
```

---

## Module 4: Contract and Vendor Management (30 min)

### AI Vendor Due Diligence

**Vendor Assessment Checklist:**

```markdown
## AI Vendor Due Diligence Checklist

### Legal Requirements
- [ ] Data Processing Agreement (DPA) executed
- [ ] Standard Contractual Clauses (international transfers)
- [ ] Security certifications verified (SOC 2, ISO 27001)
- [ ] Insurance coverage adequate

### Compliance Requirements
- [ ] GDPR compliance documented
- [ ] EU AI Act compliance plan
- [ ] Subprocessor list provided
- [ ] Incident notification procedures

### Technical Requirements
- [ ] Data location confirmed
- [ ] Encryption standards verified
- [ ] Access controls documented
- [ ] Audit rights included

### Risk Assessment
- [ ] Vendor risk rating: [Low/Medium/High]
- [ ] Approval level: [Legal/CISO/Executive]
- [ ] Review frequency: [Annual/Semi-annual]
```

### Contract Clauses for AI Services

**Key Provisions:**

```markdown
## AI Service Agreement - Key Provisions

### 1. Data Processing
"Provider shall process Customer Data only as necessary to provide
the AI Services and in accordance with the Data Processing Agreement."

### 2. Training Data
"Provider shall not use Customer Data to train, improve, or develop
Provider's AI models without explicit written consent."

### 3. Output Ownership
"All outputs generated by the AI Services using Customer Data shall
be owned by Customer."

### 4. Transparency
"Provider shall maintain documentation sufficient to explain the
general logic, significance, and envisaged consequences of AI
processing to data subjects."

### 5. Compliance Cooperation
"Provider shall cooperate with Customer's compliance efforts,
including audits, regulatory inquiries, and incident investigations."

### 6. Liability
"Provider shall indemnify Customer for any claims arising from
Provider's non-compliance with applicable AI regulations."

### 7. Termination
"Upon termination, Provider shall delete or return all Customer Data
within [30] days and certify such deletion in writing."
```

### Vendor Governance in AIGRC

```yaml
# governance.lock vendor constraints
constraints:
  registry:
    # Approved vendors (legal cleared)
    allowed_vendors:
      - openai      # DPA signed 2025-01-15
      - anthropic   # DPA signed 2025-02-20
      - azure       # Enterprise agreement

    # Unapproved vendors
    blocked_vendors:
      - "*"  # Block all others by default

    # Vendor requirements
    vendor_requirements:
      require_dpa: true
      require_soc2: true
      require_gdpr_compliance: true
```

---

## Module 5: Regulatory Filings and Reporting (20 min)

### EU AI Act Registration (High-Risk Systems)

**Required Information:**
```yaml
# EU AI Database Registration Fields
eu_ai_database:
  # Provider Information
  provider_name: "Company Inc."
  provider_address: "123 Main St, City, Country"
  provider_contact: "ai-compliance@company.com"

  # System Information
  system_name: "HR Screening AI"
  system_description: |
    AI system for initial screening of job applications
    based on resume analysis and qualification matching.

  # Classification
  annex_iii_category: "4(a)"  # Employment, workers management
  conformity_assessment:
    procedure: "internal_control"  # or third_party
    date: 2026-03-01

  # Technical Documentation
  intended_purpose: |
    To assist HR teams in initial screening of applications
    by identifying candidates meeting minimum qualifications.

  # Risk Management
  risk_management_system: true
  human_oversight_measures: |
    - All AI recommendations reviewed by HR specialist
    - Override capability for all decisions
    - Weekly bias audits

  # Instructions for Use
  instructions_url: "https://company.com/ai-docs/hr-screening"

  # Member States
  member_states_available:
    - DE
    - FR
    - NL
```

### Compliance Reporting Templates

**Quarterly Compliance Report:**
```markdown
# AI Compliance Report - Q1 2026

## Executive Summary
Overall compliance status: COMPLIANT with minor observations

## Inventory Status
| Category | Count | Compliant | Non-Compliant |
|----------|-------|-----------|---------------|
| High-Risk | 3 | 3 | 0 |
| Limited Risk | 8 | 8 | 0 |
| Minimal Risk | 25 | 25 | 0 |
| **Total** | **36** | **36** | **0** |

## Regulatory Updates
- EU AI Act general purpose AI rules now in effect
- Updated governance.lock to reflect new requirements
- Training updated for all AI system owners

## Findings and Observations
1. [Minor] Two asset cards missing DPIA reference
   - Status: Remediated
   - Owner: Legal team

2. [Minor] Vendor risk assessment overdue for 1 provider
   - Status: In progress
   - Due date: 2026-01-31

## Key Metrics
- Asset card coverage: 100%
- Risk assessments current: 100%
- Training completion: 98%
- Audit findings open: 0 critical, 2 minor

## Next Quarter Priorities
1. Complete ISO 42001 gap assessment
2. Prepare for regulatory examination
3. Update policies for new AI deployments
```

### Regulator Communication

**Inquiry Response Protocol:**
```
┌─────────────────────────────────────────────────────────────────┐
│             REGULATORY INQUIRY RESPONSE                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  RECEIPT (Day 0)                                                │
│  ───────────────                                                │
│  1. Log inquiry in compliance system                            │
│  2. Notify Legal, CISO, and AI Governance Officer               │
│  3. Acknowledge receipt to regulator                            │
│                                                                 │
│  ASSESSMENT (Days 1-3)                                          │
│  ─────────────────────                                          │
│  1. Identify scope of inquiry                                   │
│  2. Gather relevant AIGRC documentation                         │
│  3. Prepare initial response outline                            │
│                                                                 │
│  RESPONSE PREPARATION (Days 4-10)                               │
│  ─────────────────────────────────                              │
│  1. Export asset cards: `aigrc status --export`                 │
│  2. Generate compliance report                                  │
│  3. Compile supporting documentation                            │
│  4. Legal review of response                                    │
│                                                                 │
│  SUBMISSION (Before deadline)                                   │
│  ────────────────────────────                                   │
│  1. Executive approval                                          │
│  2. Submit response                                             │
│  3. Document in compliance system                               │
│                                                                 │
│  FOLLOW-UP                                                      │
│  ─────────                                                      │
│  1. Track any additional requests                               │
│  2. Update policies if needed                                   │
│  3. Report to Board if material                                 │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Module 6: Advisory Role (15 min)

### Advising the Business

**Common Questions and Answers:**

| Business Question | Legal/Compliance Response |
|------------------|---------------------------|
| "Can we use GPT for customer service?" | "Yes, with transparency disclosure and appropriate asset card. Let me review the risk classification." |
| "Our vendor wants to use our data for training" | "No. Standard position is opt-out. Review DPA and update if needed." |
| "How fast can we deploy this AI?" | "Minimal risk: days. Limited risk: 1-2 weeks (documentation). High risk: 1-3 months (conformity assessment)." |
| "Competitor uses AI without all this governance" | "Their risk tolerance differs. Our approach protects against €35M fines and reputational damage." |
| "Do we need to register with EU?" | "Only high-risk systems in Annex III. Let's check the asset card classification." |

### Escalation Matrix

```
┌─────────────────────────────────────────────────────────────────┐
│                  LEGAL ESCALATION MATRIX                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  RISK LEVEL        APPROVER              TIMEFRAME              │
│  ──────────        ────────              ─────────              │
│  Minimal           AI Governance Officer  Self-service          │
│  Limited           Legal Counsel          5 business days       │
│  High              General Counsel        10 business days      │
│  Unacceptable      Board/Executive        Not permitted         │
│                                                                 │
│  SPECIAL CASES                                                  │
│  ─────────────                                                  │
│  New vendor        Legal + Procurement    15 business days      │
│  New jurisdiction  Legal + Local Counsel  30 business days      │
│  Regulatory change Legal + Compliance     As required           │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Building Legal-Engineering Partnership

**Best Practices:**
1. **Embed early** - Involve legal in design phase, not just launch
2. **Speak their language** - Use AIGRC reports, not code reviews
3. **Automate evidence** - CI/CD provides continuous compliance proof
4. **Train together** - Joint training builds mutual understanding
5. **Celebrate wins** - Acknowledge smooth launches and clean audits

---

## Practice Lab: Compliance Assessment

### Scenario

You're reviewing a new AI system for compliance. Complete the legal assessment.

### Materials Provided

```yaml
# Proposed AI System
name: Loan Eligibility Predictor
vendor: openai
purpose: Predict loan eligibility for personal loans
data: Financial history, income, employment
users: Bank loan officers
deployment: EU and US
```

### Tasks

1. **Classify the System**
   - Determine EU AI Act category
   - Assign AIGRC risk level
   - Document rationale

2. **Identify Requirements**
   - List applicable regulations
   - Document obligations
   - Note deadlines

3. **Review Documentation**
   - Draft asset card legal section
   - Identify DPIA need
   - List required contracts

4. **Advise Business**
   - Prepare summary memo
   - Recommend next steps
   - Estimate timeline

---

## Legal Toolkit

### Quick Reference Commands

```bash
# Generate compliance report for legal review
aigrc compliance report --format pdf

# Check specific framework compliance
aigrc compliance check --framework eu-ai-act

# Export all asset cards for audit
aigrc status --export audit-bundle.zip

# Validate all documentation
aigrc validate --strict
```

### Document Templates

Available in `.aigrc/templates/`:
- `dpia-template.md` - Data Protection Impact Assessment
- `vendor-assessment.md` - Vendor Due Diligence
- `compliance-report.md` - Quarterly Compliance Report
- `incident-report.md` - AI Incident Report

### Regulatory Contacts

Keep current contact information for:
- National AI supervisory authorities
- Data protection authorities
- Sector regulators
- External legal counsel

---

## Certification Checklist

To earn AIGRC Legal/Compliance Certification:

- [ ] Complete Level 1 and Level 3.2
- [ ] Complete this Legal/Compliance Track
- [ ] Pass practical assessment:
  - [ ] Classify 5 AI systems under EU AI Act
  - [ ] Draft enterprise AI policy
  - [ ] Complete vendor due diligence assessment
  - [ ] Prepare regulatory response package
  - [ ] Advise on complex deployment scenario

---

*Track 4.4 - AIGRC Training Program v1.0*
