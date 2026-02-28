# AIGOS Partner Lab Exercises

## Hands-On Training Labs for Mixed Technical/Non-Technical Audiences

**Version:** 1.0
**Duration:** 20+ hours of lab exercises
**Environment:** AIGOS Partner Sandbox

---

## Lab Environment Setup

### Prerequisites

All participants need:

- Modern web browser (Chrome, Firefox, Edge)
- Partner Portal credentials
- Slack access for support

**Technical Track Additional:**

- VS Code installed
- Node.js 18+ installed
- Git installed
- Terminal access

### Accessing the Sandbox

```
URL: https://lab.aigos.io/partner
Login: Your partner portal credentials
Duration: Active for 30 days from enrollment
```

---

## Lab Track Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                         LAB PROGRESSION                             │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  FOUNDATION LABS (All Participants)                                 │
│  ┌─────┐  ┌─────┐  ┌─────┐  ┌─────┐                               │
│  │Lab 1│──│Lab 2│──│Lab 3│──│Lab 4│                               │
│  └─────┘  └─────┘  └─────┘  └─────┘                               │
│  First    Asset    Compliance Report                               │
│  Scan     Cards    Checks    Generation                            │
│                                                                     │
│  ─────────────────────────────────────────────────────────────────  │
│                                                                     │
│  BUSINESS TRACK                    TECHNICAL TRACK                  │
│  ┌─────┐  ┌─────┐                 ┌─────┐  ┌─────┐                 │
│  │Lab 5│──│Lab 6│                 │Lab 7│──│Lab 8│                 │
│  └─────┘  └─────┘                 └─────┘  └─────┘                 │
│  Dashboard Discovery              CI/CD    Policy                   │
│  Operations Workshop              Setup    Config                   │
│                                                                     │
│  ─────────────────────────────────────────────────────────────────  │
│                                                                     │
│  ADVANCED LABS (Expert/Master)                                      │
│  ┌─────┐  ┌─────┐  ┌─────┐  ┌─────┐  ┌─────┐  ┌─────┐            │
│  │Lab 9│──│Lab10│──│Lab11│──│Lab12│──│Lab13│──│Lab14│            │
│  └─────┘  └─────┘  └─────┘  └─────┘  └─────┘  └─────┘            │
│  Agentic  Kill    A2A     Enterprise Custom  Multi-               │
│  Runtime  Switch  Trust   Deploy     Detect  Region               │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Foundation Labs (Required for All)

### Lab 1: First AI Discovery Scan

**Audience:** All participants
**Duration:** 60 minutes
**Difficulty:** Beginner

#### Learning Objectives

By the end of this lab, you will be able to:

- Navigate the AIGOS sandbox environment
- Run your first AI asset discovery scan
- Interpret scan results
- Understand risk classification categories

#### Scenario

You are a governance consultant at Acme Corp. The CTO has asked you to inventory all AI systems in their main product repository before an upcoming EU AI Act compliance review.

#### Part 1: Environment Orientation (15 minutes)

**For Browser-Based Participants:**

1. Log into the Partner Sandbox at `https://lab.aigos.io/partner`
2. Navigate to the "Discovery" section in the left menu
3. Observe the sample repositories available:
   - `acme-ml-platform` - Main ML infrastructure
   - `acme-chatbot` - Customer service AI
   - `acme-recommendations` - Product recommendations
   - `acme-hiring-tool` - HR screening system

**For CLI Participants:**

```bash
# Clone the lab environment
git clone https://lab.aigos.io/repos/acme-corp
cd acme-corp

# Verify AIGRC is available
aigrc --version
# Expected: @aigrc/cli version 0.2.0

# List available sample projects
ls -la
```

#### Part 2: Running Your First Scan (20 minutes)

**Browser Interface:**

1. Click "New Scan" button
2. Select repository: `acme-ml-platform`
3. Choose scan depth: "Standard"
4. Click "Start Scan"
5. Wait for completion (typically 30-60 seconds)

**CLI Approach:**

```bash
# Navigate to sample repository
cd acme-ml-platform

# Run comprehensive scan
aigrc scan --output results/initial-scan.json

# View summary
aigrc scan --format table
```

#### Part 3: Analyzing Results (20 minutes)

**Expected Scan Output:**

```
╔═══════════════════════════════════════════════════════════════════╗
║                    AI ASSET DISCOVERY REPORT                       ║
╠═══════════════════════════════════════════════════════════════════╣
║                                                                    ║
║  Repository: acme-ml-platform                                      ║
║  Scan Date:  2026-02-16T10:30:00Z                                 ║
║  Duration:   45 seconds                                            ║
║                                                                    ║
║  SUMMARY                                                           ║
║  ───────────────────────────────────────────────────────────────  ║
║  Total AI Assets Detected:     7                                   ║
║  With Existing Asset Cards:    2                                   ║
║  Requiring Documentation:      5                                   ║
║                                                                    ║
║  RISK DISTRIBUTION                                                 ║
║  ───────────────────────────────────────────────────────────────  ║
║  ████████░░░░░░░░░░░░  High Risk:     2 (29%)                     ║
║  ██████████████░░░░░░  Limited Risk:  3 (43%)                     ║
║  ██████░░░░░░░░░░░░░░  Minimal Risk:  2 (28%)                     ║
║                                                                    ║
╚═══════════════════════════════════════════════════════════════════╝

DETAILED FINDINGS:

┌──────────────────────┬──────────────┬────────────────┬─────────────┐
│ Asset Name           │ Risk Level   │ Type           │ Status      │
├──────────────────────┼──────────────┼────────────────┼─────────────┤
│ hiring-predictor     │ HIGH         │ Classification │ ⚠ No Card   │
│ medical-triage       │ HIGH         │ Decision       │ ⚠ No Card   │
│ chatbot-intent       │ LIMITED      │ NLP/Chatbot    │ ⚠ No Card   │
│ recommendation-engine│ LIMITED      │ Recommendation │ ✓ Card OK   │
│ sentiment-analyzer   │ LIMITED      │ NLP            │ ⚠ No Card   │
│ spam-filter          │ MINIMAL      │ Classification │ ✓ Card OK   │
│ image-resizer        │ MINIMAL      │ Image Process  │ ⚠ No Card   │
└──────────────────────┴──────────────┴────────────────┴─────────────┘
```

**Discussion Questions:**

1. Why is `hiring-predictor` classified as HIGH risk?
   
   - *Answer: Employment decisions directly impact individuals' fundamental rights*

2. What makes `chatbot-intent` LIMITED risk rather than MINIMAL?
   
   - *Answer: Chatbots interacting with users have transparency obligations*

3. Which assets should be prioritized for documentation?
   
   - *Answer: High-risk assets (hiring-predictor, medical-triage) require immediate attention*

#### Part 4: Risk Classification Exercise (5 minutes)

Review each detected asset and verify the risk classification:

| Asset                 | Detected Risk | Your Assessment | Correct? |
| --------------------- | ------------- | --------------- | -------- |
| hiring-predictor      | HIGH          |                 |          |
| medical-triage        | HIGH          |                 |          |
| chatbot-intent        | LIMITED       |                 |          |
| recommendation-engine | LIMITED       |                 |          |
| sentiment-analyzer    | LIMITED       |                 |          |
| spam-filter           | MINIMAL       |                 |          |
| image-resizer         | MINIMAL       |                 |          |

#### Validation Checklist

- [ ] Successfully logged into sandbox
- [ ] Ran scan on acme-ml-platform
- [ ] Identified 7 AI assets
- [ ] Correctly understood risk levels
- [ ] Identified assets needing documentation

#### Reflection Questions

1. How would you explain these findings to a non-technical compliance officer?
2. What additional information would you need to complete the compliance assessment?
3. Which regulatory framework would drive the priority of these assets?

---

### Lab 2: Creating Asset Cards

**Audience:** All participants
**Duration:** 90 minutes
**Difficulty:** Beginner-Intermediate

#### Learning Objectives

- Understand Asset Card structure and purpose
- Create a complete Asset Card for a high-risk AI system
- Validate Asset Card compliance
- Link governance evidence to assets

#### Scenario

Following your discovery scan, the compliance team has prioritized the `hiring-predictor` system. You need to create comprehensive documentation for EU AI Act compliance.

#### Part 1: Understanding Asset Card Structure (20 minutes)

**Asset Card Components:**

```yaml
# Asset Card Structure Overview
apiVersion: aigrc.io/v1
kind: AssetCard

metadata:
  # Identity information
  name: system-identifier
  version: semantic-version
  created: timestamp

spec:
  # Classification
  classification:
    risk_level: HIGH | LIMITED | MINIMAL
    category: Category from EU AI Act Annex III

  # Ownership
  ownership:
    team: responsible-team
    contact: email
    data_steward: person

  # Technical Details
  technical:
    framework: pytorch | tensorflow | etc
    model_type: classifier | regressor | etc
    input_data: description
    output_data: description

  # Governance
  governance:
    policies: [list of applicable policies]
    review_frequency: annual | quarterly
    last_review: date

  # Compliance
  compliance:
    frameworks: [EU-AI-ACT, NIST-AI-RMF, etc]
    assessments:
      - type: Impact Assessment
        date: date
        status: completed | pending
```

#### Part 2: Creating Your First Asset Card (40 minutes)

**Step 1: Initialize the Asset Card**

*Browser Interface:*

1. Navigate to "Asset Cards" section
2. Click "Create New"
3. Select template: "High-Risk AI System"
4. Enter base information

*CLI Approach:*

```bash
cd acme-ml-platform/hiring-predictor

# Initialize asset card with wizard
aigrc asset-card init --wizard

# Or create from template
aigrc asset-card init --template high-risk
```

**Step 2: Complete the Asset Card**

Fill in the following information for `hiring-predictor`:

```yaml
apiVersion: aigrc.io/v1
kind: AssetCard

metadata:
  name: hiring-predictor
  version: 2.1.0
  created: 2026-02-16T10:00:00Z
  labels:
    department: hr
    sensitivity: high
    eu-ai-act: annex-iii

spec:
  description: |
    Machine learning model that predicts candidate suitability
    for open positions based on resume analysis and historical
    hiring data.

  classification:
    risk_level: HIGH
    category: employment-recruitment
    eu_ai_act_reference: "Annex III, Section 4(a)"
    justification: |
      This system influences employment decisions which directly
      affect individuals' fundamental rights to work.

  ownership:
    team: HR Technology
    contact: hr-tech@acme.com
    data_steward: Jane Smith
    business_owner: Tom Johnson (VP HR)
    technical_owner: Sarah Chen (ML Lead)

  technical:
    framework: scikit-learn
    model_type: gradient-boosting-classifier
    training_data:
      source: Historical hiring decisions (2018-2025)
      size: 50,000 records
      features: 45 features from resume parsing
    input_data:
      - Resume text (parsed)
      - Job description
      - Required qualifications
    output_data:
      - Suitability score (0-100)
      - Confidence interval
      - Contributing factors
    performance:
      accuracy: 0.82
      precision: 0.79
      recall: 0.85
      last_evaluated: 2026-01-15

  governance:
    policies:
      - enterprise-ai-policy
      - hr-data-policy
      - bias-mitigation-policy
    human_oversight:
      required: true
      oversight_type: human-in-the-loop
      description: |
        All predictions must be reviewed by HR specialist
        before any hiring decision. Model score is advisory only.
    review_frequency: quarterly
    last_review: 2026-01-01
    next_review: 2026-04-01

  compliance:
    frameworks:
      - name: EU-AI-ACT
        status: partial
        gaps:
          - Fundamental rights impact assessment pending
          - Bias audit scheduled for Q2
      - name: NIST-AI-RMF
        status: aligned
        mapping: GOVERN-1.1, MAP-1.1, MEASURE-2.1

  assessments:
    - type: AI Impact Assessment
      status: in-progress
      due_date: 2026-03-15
      owner: compliance@acme.com
    - type: Bias Audit
      status: scheduled
      due_date: 2026-06-01
      owner: external-auditor@firm.com
    - type: Data Protection Impact Assessment
      status: completed
      completion_date: 2025-11-20
      findings: No critical issues

  risk_controls:
    - control: Bias monitoring dashboard
      status: implemented
      effectiveness: high
    - control: Human review requirement
      status: implemented
      effectiveness: high
    - control: Candidate appeal process
      status: implemented
      effectiveness: medium
    - control: Regular retraining with updated data
      status: planned
      target_date: 2026-Q2

  audit_trail:
    logging_enabled: true
    retention_period: 7 years
    log_location: s3://acme-ai-logs/hiring-predictor/
```

**Step 3: Validate the Asset Card**

```bash
# Validate against schema
aigrc asset-card validate

# Expected output:
# ✓ Schema validation passed
# ✓ Required fields present
# ✓ Risk classification consistent
# ⚠ Warning: AI Impact Assessment not yet completed
# ⚠ Warning: Bias Audit pending
```

#### Part 3: Compliance Check (20 minutes)

Run a compliance check against EU AI Act requirements:

```bash
# Run compliance check
aigrc check --framework eu-ai-act

# Expected output:
╔═══════════════════════════════════════════════════════════════════╗
║           COMPLIANCE CHECK: hiring-predictor                       ║
║           Framework: EU AI Act                                     ║
╠═══════════════════════════════════════════════════════════════════╣
║                                                                    ║
║  Overall Status: PARTIAL COMPLIANCE                                ║
║  Score: 72/100                                                     ║
║                                                                    ║
║  REQUIREMENTS STATUS                                               ║
║  ───────────────────────────────────────────────────────────────  ║
║  ✓ Art. 6  - Risk Classification documented                       ║
║  ✓ Art. 9  - Risk management system in place                      ║
║  ✓ Art. 10 - Data governance documented                           ║
║  ✓ Art. 11 - Technical documentation present                      ║
║  ✓ Art. 12 - Logging enabled (7 year retention)                   ║
║  ⚠ Art. 13 - Transparency: Partial (need user notification)       ║
║  ✓ Art. 14 - Human oversight configured                           ║
║  ✗ Art. 15 - Accuracy metrics need bias disaggregation            ║
║  ⚠ Art. 27 - FRIA not yet completed                               ║
║                                                                    ║
║  REQUIRED ACTIONS                                                  ║
║  ───────────────────────────────────────────────────────────────  ║
║  1. Complete Fundamental Rights Impact Assessment (Art. 27)       ║
║  2. Add demographic disaggregation to accuracy metrics (Art. 15)  ║
║  3. Implement candidate notification process (Art. 13)            ║
║                                                                    ║
╚═══════════════════════════════════════════════════════════════════╝
```

#### Part 4: Discussion (10 minutes)

**Group Discussion Questions:**

1. What information was most challenging to gather for the Asset Card?
2. How would this documentation help during a regulatory audit?
3. What process would you recommend for keeping Asset Cards current?

#### Validation Checklist

- [ ] Created complete Asset Card for hiring-predictor
- [ ] All required fields populated
- [ ] Validation passed (warnings acceptable)
- [ ] Compliance check completed
- [ ] Identified remediation actions

---

### Lab 3: Running Compliance Checks

**Audience:** All participants
**Duration:** 90 minutes
**Difficulty:** Intermediate

#### Learning Objectives

- Configure compliance profiles for multiple frameworks
- Run automated compliance checks
- Interpret compliance findings
- Generate evidence for audits

#### Scenario

Acme Corp operates in both EU and US markets. You need to assess their AI portfolio against EU AI Act and NIST AI RMF simultaneously.

#### Part 1: Understanding Compliance Profiles (20 minutes)

**Available Compliance Frameworks:**

| Framework   | Version | Scope                 | Key Requirements                             |
| ----------- | ------- | --------------------- | -------------------------------------------- |
| EU AI Act   | 2024    | All AI systems        | Risk-based, high-risk focus                  |
| NIST AI RMF | 1.0     | US federal/voluntary  | Four functions: Govern, Map, Measure, Manage |
| ISO 42001   | 2023    | AI management system  | Certification standard                       |
| SOC 2 + AI  | 2025    | Service organizations | Trust criteria + AI controls                 |

**Creating a Multi-Framework Profile:**

```yaml
# File: compliance-profiles/acme-multi.yaml
apiVersion: aigrc.io/v1
kind: ComplianceProfile

metadata:
  name: acme-enterprise
  description: Combined EU and US compliance requirements

spec:
  frameworks:
    - name: eu-ai-act
      version: "2024"
      enforcement: strict
      applies_to:
        risk_levels: [HIGH, LIMITED]
        jurisdictions: [EU, UK]

    - name: nist-ai-rmf
      version: "1.0"
      enforcement: advisory
      applies_to:
        all: true

  custom_rules:
    - id: acme-001
      name: require-human-review-high-risk
      description: All high-risk predictions require human review
      condition: "asset.risk_level == 'HIGH'"
      requirement: "asset.governance.human_oversight.required == true"
      enforcement: block

    - id: acme-002
      name: require-bias-audit-annual
      description: Annual bias audit for classification systems
      condition: "asset.technical.model_type contains 'classifier'"
      requirement: "asset.assessments contains bias_audit within 365 days"
      enforcement: warn
```

#### Part 2: Running Multi-Framework Checks (30 minutes)

**Step 1: Apply Compliance Profile**

```bash
# Apply the multi-framework profile
aigrc policy apply acme-enterprise

# Verify profile is active
aigrc policy list --active
```

**Step 2: Run Portfolio-Wide Check**

```bash
# Check all assets in repository
aigrc check --all --output results/compliance-report.json

# View summary
aigrc check --all --format summary
```

**Expected Output:**

```
╔═══════════════════════════════════════════════════════════════════╗
║               PORTFOLIO COMPLIANCE SUMMARY                         ║
║               Profile: acme-enterprise                             ║
║               Date: 2026-02-16                                     ║
╠═══════════════════════════════════════════════════════════════════╣
║                                                                    ║
║  OVERALL COMPLIANCE SCORE                                          ║
║  ███████████████████░░░░░░░░░░  68%                               ║
║                                                                    ║
║  BY FRAMEWORK                                                      ║
║  ───────────────────────────────────────────────────────────────  ║
║  EU AI Act:    ██████████████░░░░░░░░░░░░  58%                    ║
║  NIST AI RMF:  ███████████████████░░░░░░░  78%                    ║
║                                                                    ║
║  BY ASSET                                                          ║
║  ───────────────────────────────────────────────────────────────  ║
║  hiring-predictor      HIGH    ████████████░░░░  72%  ⚠ 3 issues  ║
║  medical-triage        HIGH    ██████████░░░░░░  55%  ✗ 5 issues  ║
║  chatbot-intent        LIMITED █████████████████  85%  ⚠ 1 issue  ║
║  recommendation-engine LIMITED ██████████████░░░  75%  ⚠ 2 issues ║
║  sentiment-analyzer    LIMITED █████████████░░░░  70%  ⚠ 2 issues ║
║  spam-filter           MINIMAL ██████████████████  90%  ✓ OK      ║
║  image-resizer         MINIMAL ████████████████░░  80%  ⚠ 1 issue ║
║                                                                    ║
║  CRITICAL FINDINGS (Blocking)                                      ║
║  ───────────────────────────────────────────────────────────────  ║
║  1. medical-triage: Missing mandatory human oversight              ║
║  2. medical-triage: No technical documentation                     ║
║  3. medical-triage: Audit logging not configured                   ║
║                                                                    ║
║  WARNINGS (Non-Blocking)                                           ║
║  ───────────────────────────────────────────────────────────────  ║
║  1. 4 assets missing bias audit within required timeframe         ║
║  2. 2 assets have incomplete FRIA documentation                   ║
║  3. 3 assets need transparency notification updates               ║
║                                                                    ║
╚═══════════════════════════════════════════════════════════════════╝
```

#### Part 3: Deep Dive on Critical Finding (25 minutes)

Focus on the worst-performing asset: `medical-triage`

```bash
# Get detailed findings for specific asset
aigrc check medical-triage --verbose

# Output:
╔═══════════════════════════════════════════════════════════════════╗
║           DETAILED COMPLIANCE REPORT: medical-triage               ║
╠═══════════════════════════════════════════════════════════════════╣
║                                                                    ║
║  CRITICAL ISSUES (Must Fix)                                        ║
║  ═══════════════════════════════════════════════════════════════  ║
║                                                                    ║
║  Issue 1: Missing Human Oversight Configuration                    ║
║  ────────────────────────────────────────────────────────────────  ║
║  Framework: EU AI Act, Article 14                                  ║
║  Severity: CRITICAL                                                ║
║  Status: BLOCKING                                                  ║
║                                                                    ║
║  Description:                                                      ║
║  High-risk AI systems must have appropriate human oversight        ║
║  measures. The medical-triage system affects health decisions      ║
║  and requires human-in-the-loop or human-on-the-loop oversight.   ║
║                                                                    ║
║  Current State:                                                    ║
║  spec.governance.human_oversight: NOT CONFIGURED                   ║
║                                                                    ║
║  Required Action:                                                  ║
║  Add human oversight configuration to asset card:                  ║
║  ```yaml                                                           ║
║  governance:                                                       ║
║    human_oversight:                                                ║
║      required: true                                                ║
║      oversight_type: human-in-the-loop                            ║
║      description: Medical professional reviews all triage results ║
║  ```                                                               ║
║                                                                    ║
║  Evidence Required:                                                ║
║  - Process documentation showing human review workflow             ║
║  - Training records for reviewing personnel                        ║
║  - Audit logs showing human review actions                        ║
║                                                                    ║
║  ═══════════════════════════════════════════════════════════════  ║
║                                                                    ║
║  Issue 2: No Technical Documentation                               ║
║  [Additional details...]                                           ║
║                                                                    ║
╚═══════════════════════════════════════════════════════════════════╝
```

#### Part 4: Generate Audit-Ready Report (15 minutes)

```bash
# Generate formal compliance report
aigrc report compliance \
  --format pdf \
  --framework eu-ai-act \
  --output reports/eu-ai-act-assessment.pdf

# Generate evidence package
aigrc audit export \
  --since 2025-01-01 \
  --output evidence/audit-package.zip
```

**Report Structure:**

1. Executive Summary
2. Methodology
3. Scope and Assets
4. Framework Requirements Mapping
5. Detailed Findings by Asset
6. Remediation Recommendations
7. Evidence Index
8. Appendices

#### Validation Checklist

- [ ] Created multi-framework compliance profile
- [ ] Ran portfolio-wide compliance check
- [ ] Analyzed critical findings in detail
- [ ] Generated audit-ready report
- [ ] Exported evidence package

---

### Lab 4: Report Generation

**Audience:** All participants
**Duration:** 60 minutes
**Difficulty:** Beginner-Intermediate

#### Learning Objectives

- Generate different report types for different audiences
- Customize report templates
- Schedule automated reporting
- Export data for external tools

#### Scenario

You need to prepare three reports:

1. Executive dashboard for the board
2. Technical summary for the AI/ML team
3. Detailed audit trail for compliance

#### Part 1: Executive Dashboard Report (20 minutes)

*Browser Interface:*

1. Navigate to "Reports" section
2. Select "Executive Dashboard"
3. Configure date range: Last 90 days
4. Select metrics: Risk overview, Compliance trend, Top issues
5. Export as PDF

*CLI Approach:*

```bash
aigrc report executive \
  --period 90d \
  --format pdf \
  --output reports/executive-dashboard.pdf
```

**Sample Executive Report Content:**

```
╔═══════════════════════════════════════════════════════════════════╗
║                 AI GOVERNANCE EXECUTIVE SUMMARY                    ║
║                 Acme Corporation | Q1 2026                         ║
╠═══════════════════════════════════════════════════════════════════╣
║                                                                    ║
║  KEY METRICS                                                       ║
║  ───────────────────────────────────────────────────────────────  ║
║                                                                    ║
║  Total AI Assets:          7        (↑2 from last quarter)        ║
║  High-Risk Systems:        2        (no change)                   ║
║  Compliance Score:         68%      (↑12% from last quarter)      ║
║  Open Issues:              14       (↓8 from last quarter)        ║
║                                                                    ║
║  COMPLIANCE TREND                                                  ║
║  ───────────────────────────────────────────────────────────────  ║
║                                                                    ║
║  100% ┤                                                            ║
║   80% ┤                              ╭────────                     ║
║   60% ┤              ╭───────────────╯                             ║
║   40% ┤    ╭─────────╯                                             ║
║   20% ┤────╯                                                       ║
║    0% ┼────┬────┬────┬────┬────┬────┬────┬────┬────┬────         ║
║       Oct  Nov  Dec  Jan  Feb                                      ║
║                                                                    ║
║  TOP 3 PRIORITIES                                                  ║
║  ───────────────────────────────────────────────────────────────  ║
║  1. Complete medical-triage human oversight configuration         ║
║  2. Finish FRIA for hiring-predictor by March 15                 ║
║  3. Schedule bias audits for 2 systems                           ║
║                                                                    ║
║  REGULATORY READINESS                                              ║
║  ───────────────────────────────────────────────────────────────  ║
║  EU AI Act (Aug 2026):  On Track ✓                                ║
║  NIST AI RMF:           Aligned ✓                                 ║
║                                                                    ║
╚═══════════════════════════════════════════════════════════════════╝
```

#### Part 2: Technical Report (20 minutes)

```bash
aigrc report technical \
  --include model-details \
  --include performance-metrics \
  --include integration-status \
  --format html \
  --output reports/technical-summary.html
```

**Technical Report Sections:**

1. Model inventory with versions
2. Performance metrics dashboard
3. Data lineage diagrams
4. Integration status (CI/CD, IDE)
5. Detection rule coverage
6. API usage statistics

#### Part 3: Audit Trail Report (20 minutes)

```bash
# Generate detailed audit trail
aigrc report audit \
  --since 2026-01-01 \
  --until 2026-02-16 \
  --include all-events \
  --format json \
  --output reports/audit-trail.json

# Generate SARIF for IDE integration
aigrc check --all --format sarif --output reports/findings.sarif
```

**Audit Trail Contents:**

- Asset card changes (who, when, what)
- Compliance check history
- Policy enforcement actions
- User access logs
- Configuration changes

#### Validation Checklist

- [ ] Generated executive dashboard report
- [ ] Generated technical summary report
- [ ] Generated audit trail report
- [ ] Exported in multiple formats (PDF, HTML, JSON, SARIF)

---

## Business Track Labs

### Lab 5: Dashboard Operations

**Audience:** Business Track (GRC Consultants, Compliance Officers)
**Duration:** 90 minutes
**Difficulty:** Intermediate

#### Learning Objectives

- Navigate the Control Plane dashboard
- Configure custom views and alerts
- Manage compliance workflows
- Create scheduled reports

*[Detailed lab content continues with dashboard navigation, alert configuration, workflow management...]*

---

### Lab 6: Customer Discovery Workshop Simulation

**Audience:** Business Track
**Duration:** 120 minutes
**Difficulty:** Intermediate

#### Learning Objectives

- Facilitate a governance discovery workshop
- Gather requirements from stakeholders
- Create maturity assessment
- Develop implementation roadmap

*[Role-play scenario with mock customer stakeholders...]*

---

## Technical Track Labs

### Lab 7: CI/CD Integration Setup

**Audience:** Technical Track
**Duration:** 120 minutes
**Difficulty:** Intermediate-Advanced

#### Learning Objectives

- Configure GitHub Actions integration
- Set up pre-commit hooks
- Implement branch protection rules
- Configure MCP server for AI assistants

*[Detailed technical implementation steps...]*

---

### Lab 8: Policy Configuration

**Audience:** Technical Track
**Duration:** 90 minutes
**Difficulty:** Advanced

#### Learning Objectives

- Write custom detection rules
- Configure policy enforcement levels
- Create exception workflows
- Test policy effectiveness

*[Policy schema deep-dive and custom rule creation...]*

---

## Advanced Labs (Expert/Master)

### Lab 9: Agentic Runtime Configuration

**Audience:** Expert/Master certification candidates
**Duration:** 180 minutes
**Difficulty:** Advanced

*[Complete runtime setup with identity manager, policy engine, telemetry...]*

### Lab 10: Kill Switch Operations

**Audience:** Expert/Master certification candidates
**Duration:** 120 minutes
**Difficulty:** Advanced

*[Emergency stop procedures, testing, verification...]*

### Lab 11: A2A Trust Protocol

**Audience:** Expert/Master certification candidates
**Duration:** 180 minutes
**Difficulty:** Expert

*[Agent-to-agent token exchange, trust establishment...]*

### Lab 12: Enterprise Deployment

**Audience:** Master certification candidates
**Duration:** 240 minutes
**Difficulty:** Expert

*[High availability, multi-region, security hardening...]*

### Lab 13: Custom Detection Rules

**Audience:** Expert/Master certification candidates
**Duration:** 180 minutes
**Difficulty:** Advanced

*[AST parsing, semantic analysis, custom rule development...]*

### Lab 14: Multi-Region Compliance

**Audience:** Master certification candidates
**Duration:** 240 minutes
**Difficulty:** Expert

*[Geographic compliance, data residency, cross-border considerations...]*

---

## Capstone Projects

### Business Track Capstone: Mock Implementation Proposal

**Duration:** 1 week
**Deliverable:** Complete customer proposal with implementation plan

**Scenario:**
You are responding to an RFP from a healthcare company with 12 AI systems, 4 of which are high-risk. They need EU AI Act compliance by August 2026.

**Requirements:**

1. Discovery findings summary
2. Gap analysis
3. Implementation timeline
4. Resource plan
5. Budget estimate
6. Risk register
7. Success metrics

### Technical Track Capstone: End-to-End Integration

**Duration:** 1 week
**Deliverable:** Working integration in sandbox environment

**Requirements:**

1. Configure CI/CD pipeline with governance gates
2. Set up IDE integration
3. Create custom detection rules
4. Configure MCP server
5. Implement monitoring dashboard
6. Document architecture

### Delivery Track Capstone: Training Program Design

**Duration:** 1 week
**Deliverable:** Customer training curriculum and materials

**Requirements:**

1. Role-based training paths
2. Hands-on exercises
3. Assessment criteria
4. Ongoing support plan
5. Success metrics

---

## Lab Support

### Getting Help

| Resource             | Access             | Response Time |
| -------------------- | ------------------ | ------------- |
| Lab FAQ              | Partner Portal     | Immediate     |
| Slack: #partner-labs | partners.slack.com | < 4 hours     |
| Office Hours         | Wednesdays 2pm ET  | Live          |
| Support Ticket       | Partner Portal     | 24 hours      |

### Common Issues

**Issue:** Scan not detecting AI assets
**Solution:** Ensure you're in the correct directory and have read permissions

**Issue:** Compliance check fails with authentication error
**Solution:** Verify your API token is set: `export AIGRC_TOKEN=your-token`

**Issue:** Report generation timeout
**Solution:** For large portfolios, use `--async` flag and retrieve later

---

*For lab environment issues, contact: labs@aigos.io*
