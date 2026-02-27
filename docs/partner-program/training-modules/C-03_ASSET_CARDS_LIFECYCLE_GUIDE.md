# Module C-03: Asset Cards - From Creation to Lifecycle Management

## Complete Guide to Documenting, Managing, and Governing AI Assets

**Module ID:** C-03
**Tier:** Core Components
**Duration:** 5-6 hours
**Difficulty:** Intermediate
**Prerequisites:** Modules P-01, P-02, P-03, C-01 completed
**Last Updated:** 2026-02-16

---

## 1. Module Overview

### 1.1 Purpose & Business Value

Asset Cards are the foundational documentation artifacts in AIGRC/AIGOS. They serve as the "source of truth" for AI governance by:

- **Documenting** every AI system's purpose, capabilities, and limitations
- **Classifying** risk levels according to regulatory frameworks
- **Tracking** ownership, approvals, and compliance status
- **Enabling** automated governance through machine-readable metadata
- **Providing** audit evidence for regulatory inspections

**Why This Matters for Partners:**
- Asset Cards are what customers interact with most frequently
- Quality Asset Cards determine compliance success
- Partners must guide customers through proper Asset Card creation
- Lifecycle management ensures ongoing governance health

### 1.2 Learning Outcomes

By the end of this module, you will be able to:

1. Explain the Asset Card schema in complete detail
2. Create Asset Cards for all AI system types
3. Implement proper lifecycle management procedures
4. Configure Asset Cards for different risk levels
5. Troubleshoot common Asset Card issues
6. Guide customers through Asset Card best practices

---

## 2. Asset Card Architecture

### 2.1 What is an Asset Card?

```
                         ASSET CARD CONCEPTUAL MODEL
═══════════════════════════════════════════════════════════════════════════════

┌─────────────────────────────────────────────────────────────────────────────┐
│                              ASSET CARD                                      │
│                                                                              │
│  "A structured, machine-readable document that captures all governance-     │
│   relevant information about an AI system in a single artifact"             │
│                                                                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                         METADATA SECTION                             │    │
│  │  • API version, kind, name, version                                  │    │
│  │  • Creation date, last modified, status                              │    │
│  │  • Labels and annotations for organization                           │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                    │                                         │
│                                    ▼                                         │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                           SPEC SECTION                               │    │
│  │                                                                       │    │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌────────────┐  │    │
│  │  │ Description │  │Classification│  │  Technical  │  │ Governance │  │    │
│  │  │   & Purpose │  │  & Risk     │  │   Details   │  │  Controls  │  │    │
│  │  └─────────────┘  └─────────────┘  └─────────────┘  └────────────┘  │    │
│  │                                                                       │    │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌────────────┐  │    │
│  │  │  Data &     │  │  Assessments│  │   Contacts  │  │ Compliance │  │    │
│  │  │  Training   │  │  & Audits   │  │  & Owners   │  │  Evidence  │  │    │
│  │  └─────────────┘  └─────────────┘  └─────────────┘  └────────────┘  │    │
│  │                                                                       │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                    │                                         │
│                                    ▼                                         │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                          STATUS SECTION                              │    │
│  │  • Current compliance state (auto-populated by AIGRC)                │    │
│  │  • Golden Thread hash                                                │    │
│  │  • Last check timestamp, next review date                            │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 2.2 Asset Card File Structure

```
project-root/
├── .aigrc/
│   └── cards/                     # Optional: centralized location
│       ├── hiring-model.asset-card.yaml
│       └── chatbot.asset-card.yaml
├── src/
│   └── ml/
│       ├── hiring/
│       │   ├── model.py
│       │   └── hiring-model.asset-card.yaml  # Co-located with code
│       └── sentiment/
│           ├── analyzer.py
│           └── sentiment-analyzer.asset-card.yaml
└── .aigrc.yaml
```

**Naming Conventions:**

| Pattern | Example | When to Use |
|---------|---------|-------------|
| `{asset-name}.asset-card.yaml` | `hiring-model.asset-card.yaml` | Standard naming |
| `{asset-name}.asset-card.yml` | `chatbot.asset-card.yml` | Alternative extension |
| Co-located | Same directory as code | Preferred for code ownership |
| Centralized | `.aigrc/cards/` directory | Large organizations |

### 2.3 Schema Version History

| Version | Date | Key Changes |
|---------|------|-------------|
| `aigrc.io/v1` | 2026-01 | Initial release |
| `aigrc.io/v1beta1` | 2025-10 | Beta schema |

**Always use `apiVersion: aigrc.io/v1`** for production Asset Cards.

---

## 3. Complete Asset Card Schema Reference

### 3.1 Full Schema with All Fields

```yaml
# ═══════════════════════════════════════════════════════════════════════════
# ASSET CARD COMPLETE SCHEMA REFERENCE
# Version: aigrc.io/v1
# ═══════════════════════════════════════════════════════════════════════════

# ─────────────────────────────────────────────────────────────────────────────
# SECTION 1: API Version and Kind (REQUIRED)
# ─────────────────────────────────────────────────────────────────────────────
apiVersion: aigrc.io/v1        # Schema version - DO NOT CHANGE
kind: AssetCard                # Resource type - always "AssetCard"

# ─────────────────────────────────────────────────────────────────────────────
# SECTION 2: Metadata (REQUIRED)
# ─────────────────────────────────────────────────────────────────────────────
metadata:
  # Unique identifier for this asset (REQUIRED)
  # Rules:
  #   - Must be lowercase
  #   - Must start with a letter
  #   - Can contain letters, numbers, hyphens
  #   - Max 63 characters
  #   - Must be unique within organization
  name: hiring-predictor

  # Human-readable display name (optional)
  displayName: Hiring Prediction Model

  # Semantic version (REQUIRED)
  # Format: MAJOR.MINOR.PATCH
  version: "2.1.0"

  # Brief description (REQUIRED, max 256 chars)
  description: >-
    Machine learning model that predicts candidate suitability for
    open positions based on resume analysis and role requirements.

  # ISO 8601 timestamps (auto-populated if using CLI)
  createdAt: "2026-01-15T09:00:00Z"
  updatedAt: "2026-02-16T14:30:00Z"

  # Lifecycle status (REQUIRED)
  # Values: draft, active, deprecated, archived
  status: active

  # Namespace for multi-tenant environments (optional)
  namespace: hr-technology

  # Labels for categorization and filtering (optional)
  labels:
    department: human-resources
    business-unit: talent-acquisition
    cost-center: CC-1234
    environment: production
    team: hr-tech

  # Annotations for additional metadata (optional)
  annotations:
    # Internal references
    jira-project: HR-AI
    confluence-page: https://wiki.acme.com/hr/ai-models

    # Tool integrations
    datadog-dashboard: hiring-model-prod
    pagerduty-service: HR-AI-PROD

    # Custom metadata
    model-registry-id: hrm-001

# ─────────────────────────────────────────────────────────────────────────────
# SECTION 3: Specification (REQUIRED)
# ─────────────────────────────────────────────────────────────────────────────
spec:
  # ═══════════════════════════════════════════════════════════════════════════
  # 3.1 CLASSIFICATION (REQUIRED)
  # ═══════════════════════════════════════════════════════════════════════════
  classification:
    # Risk level per EU AI Act (REQUIRED)
    # Values: UNACCEPTABLE, HIGH, LIMITED, MINIMAL
    riskLevel: HIGH

    # Category within risk level (REQUIRED for HIGH risk)
    # EU AI Act Annex III categories:
    #   - biometric-identification
    #   - critical-infrastructure
    #   - education-vocational
    #   - employment-recruitment
    #   - essential-services
    #   - law-enforcement
    #   - migration-asylum
    #   - justice-democracy
    category: employment-recruitment

    # Sub-category for specificity (optional)
    subcategory: candidate-screening

    # Applicable regulatory frameworks (REQUIRED)
    frameworks:
      - name: eu-ai-act
        version: "2024"
        articles:
          - "Article 6"    # Classification
          - "Article 9"    # Risk management
          - "Article 10"   # Data governance
          - "Article 11"   # Technical documentation
          - "Article 14"   # Human oversight

      - name: nist-ai-rmf
        version: "1.0"
        functions:
          - GOVERN
          - MAP
          - MEASURE
          - MANAGE

      - name: iso-42001
        version: "2023"
        clauses:
          - "6.1"   # AI risk assessment
          - "8.1"   # Operational planning

    # Geographic scope (REQUIRED)
    jurisdictions:
      - code: EU
        name: European Union
        primary: true
      - code: US
        name: United States
        states:
          - CA    # California (CCPA/CPRA)
          - NY    # New York (NYC AI Law)
      - code: UK
        name: United Kingdom

    # Classification rationale (REQUIRED for HIGH risk)
    rationale: >-
      This system is classified as HIGH risk under EU AI Act Article 6
      because it is an AI system used for recruitment and screening of
      candidates, which falls under Annex III, Section 4(a). The system
      evaluates candidates' professional qualifications and makes
      recommendations that influence hiring decisions.

    # Date of last classification review
    classifiedAt: "2026-02-01T10:00:00Z"

    # Who performed classification
    classifiedBy:
      name: Sarah Chen
      role: AI Governance Lead
      email: s.chen@acme.com

  # ═══════════════════════════════════════════════════════════════════════════
  # 3.2 TECHNICAL DETAILS (REQUIRED)
  # ═══════════════════════════════════════════════════════════════════════════
  technical:
    # Type of AI system (REQUIRED)
    # Common values:
    #   ML models: classification, regression, clustering, recommendation
    #   NLP: sentiment-analysis, text-generation, translation, summarization
    #   Vision: object-detection, image-classification, facial-recognition
    #   Other: chatbot, agent, ensemble, hybrid
    type: classification

    # Specific model architecture (optional but recommended)
    architecture: gradient-boosting-classifier

    # ML framework used (REQUIRED)
    framework:
      name: scikit-learn
      version: "1.4.0"

    # Additional libraries/dependencies (optional)
    dependencies:
      - name: pandas
        version: "2.1.0"
      - name: numpy
        version: "1.26.0"
      - name: xgboost
        version: "2.0.3"

    # Runtime environment (optional but recommended)
    runtime:
      language: python
      version: "3.11"
      container:
        image: acme/hiring-model
        tag: "2.1.0"
        registry: registry.acme.com

    # Hardware requirements (optional)
    resources:
      cpu:
        request: "500m"
        limit: "2"
      memory:
        request: "1Gi"
        limit: "4Gi"
      gpu:
        required: false

    # Input specification (REQUIRED)
    input:
      description: >-
        Structured candidate data including parsed resume information,
        job requirements, and optional assessment scores.

      format: json

      schema:
        type: object
        properties:
          resume:
            type: object
            description: Parsed resume data
            properties:
              experience_years:
                type: number
                description: Total years of professional experience
              skills:
                type: array
                items:
                  type: string
                description: List of extracted skills
              education_level:
                type: string
                enum: [high_school, bachelors, masters, doctorate]
          job_requirements:
            type: object
            description: Position requirements
          assessment_scores:
            type: object
            description: Optional assessment results

    # Output specification (REQUIRED)
    output:
      description: >-
        Suitability prediction with confidence score and explanation
        factors for human reviewer interpretation.

      format: json

      schema:
        type: object
        properties:
          suitability_score:
            type: number
            minimum: 0
            maximum: 100
            description: Overall suitability percentage
          confidence:
            type: number
            minimum: 0
            maximum: 1
            description: Model confidence in prediction
          recommendation:
            type: string
            enum: [strong_match, potential_match, weak_match, not_recommended]
          explanation:
            type: object
            description: Feature importance for decision

    # Performance metrics (REQUIRED for HIGH risk)
    performance:
      metrics:
        - name: accuracy
          value: 0.87
          dataset: validation-2026-Q1
          measuredAt: "2026-02-01"
        - name: precision
          value: 0.84
          dataset: validation-2026-Q1
          measuredAt: "2026-02-01"
        - name: recall
          value: 0.89
          dataset: validation-2026-Q1
          measuredAt: "2026-02-01"
        - name: f1-score
          value: 0.86
          dataset: validation-2026-Q1
          measuredAt: "2026-02-01"

      # Fairness metrics (REQUIRED for HIGH risk)
      fairness:
        - metric: demographic-parity
          protected_attribute: gender
          value: 0.95
          threshold: 0.8
          status: passing
        - metric: equalized-odds
          protected_attribute: ethnicity
          value: 0.92
          threshold: 0.8
          status: passing

    # Model versioning (optional)
    versioning:
      repository: https://github.com/acme/hr-ai-models
      modelRegistry: https://mlflow.acme.com/models/hiring-predictor
      artifactPath: s3://acme-ml-artifacts/hiring-predictor/v2.1.0

    # Monitoring configuration (recommended for HIGH risk)
    monitoring:
      enabled: true
      provider: datadog
      dashboardUrl: https://app.datadoghq.com/dashboard/hrmodel
      alerts:
        - name: drift-detection
          condition: "feature_drift > 0.1"
          severity: high
        - name: performance-degradation
          condition: "accuracy < 0.80"
          severity: critical

  # ═══════════════════════════════════════════════════════════════════════════
  # 3.3 DATA GOVERNANCE (REQUIRED for HIGH risk)
  # ═══════════════════════════════════════════════════════════════════════════
  data:
    # Training data documentation (REQUIRED for HIGH risk)
    training:
      description: >-
        Historical hiring data from 2020-2025 including anonymized
        candidate resumes, job requirements, and hiring outcomes.

      sources:
        - name: internal-ats
          type: database
          description: Applicant Tracking System historical data
          records: 150000
          timeRange:
            start: "2020-01-01"
            end: "2025-12-31"

        - name: resume-parser
          type: service
          description: Third-party resume parsing API results
          vendor: ResumeParser Inc.

      # Data quality measures (REQUIRED for HIGH risk)
      quality:
        completenessScore: 0.94
        accuracyScore: 0.91
        consistencyScore: 0.89
        lastAssessed: "2026-01-15"
        issues:
          - type: missing-values
            field: education_level
            percentage: 3.2
            mitigation: imputed using job-level median

      # Bias mitigation (REQUIRED for HIGH risk)
      biasMitigation:
        techniques:
          - name: resampling
            description: Balanced training set across protected attributes
          - name: fairness-constraints
            description: Equalized odds constraints during training

        documentation: >-
          Comprehensive bias analysis performed, documented in
          bias-report-2026-Q1.pdf. Resampling and fairness-aware
          training applied to ensure demographic parity.

    # Personal data handling (REQUIRED if processing PII)
    personalData:
      categories:
        - name: professional-history
          description: Work experience and employment history
          legalBasis: legitimate-interest
          retentionPeriod: 24-months

        - name: educational-background
          description: Educational qualifications
          legalBasis: legitimate-interest
          retentionPeriod: 24-months

        - name: contact-information
          description: Name, email (anonymized before model input)
          legalBasis: consent
          retentionPeriod: 12-months

      # Special categories under GDPR Article 9
      specialCategories:
        processed: false
        types: []
        justification: >-
          No special category data (racial origin, political opinions,
          religious beliefs, health data, etc.) is processed by this model.

      # Data subject rights
      dataSubjectRights:
        accessProcess: Submit request via privacy@acme.com
        erasureProcess: Automated within 30 days of request
        portabilityFormat: JSON
        automated-decision-info: >-
          Candidates are informed of AI-assisted screening and can
          request human-only review via careers@acme.com

    # Inference data (what data is processed at runtime)
    inference:
      dataTypes:
        - parsed-resume
        - job-requirements
        - assessment-scores

      logging:
        enabled: true
        retention: 365-days
        includes:
          - input-hash
          - output
          - timestamp
          - request-id
        excludes:
          - raw-resume-text
          - personal-identifiers

  # ═══════════════════════════════════════════════════════════════════════════
  # 3.4 GOVERNANCE CONTROLS (REQUIRED)
  # ═══════════════════════════════════════════════════════════════════════════
  governance:
    # Ownership (REQUIRED)
    ownership:
      # Business owner (REQUIRED)
      businessOwner:
        name: Jennifer Martinez
        role: VP of Talent Acquisition
        email: j.martinez@acme.com
        department: Human Resources

      # Technical owner (REQUIRED)
      technicalOwner:
        name: David Kim
        role: Lead ML Engineer
        email: d.kim@acme.com
        department: HR Technology

      # Responsible team (REQUIRED)
      team:
        name: HR AI Team
        email: hr-ai-team@acme.com
        slack: "#hr-ai-team"
        oncall: https://opsgenie.acme.com/teams/hr-ai

      # Executive sponsor (recommended for HIGH risk)
      executiveSponsor:
        name: Robert Chen
        role: Chief People Officer
        email: r.chen@acme.com

    # Human oversight configuration (REQUIRED for HIGH risk)
    humanOversight:
      # Level of human involvement (REQUIRED)
      # Values:
      #   - human-in-the-loop: Human approves every decision
      #   - human-on-the-loop: Human monitors and can intervene
      #   - human-in-command: Human sets parameters, system executes
      level: human-in-the-loop

      description: >-
        All AI recommendations are reviewed by a human recruiter before
        any candidate communication. The system provides recommendations
        only; final decisions are always made by humans.

      # Override mechanism (REQUIRED)
      overrideMechanism:
        available: true
        process: >-
          Recruiters can override AI recommendations via the ATS interface.
          All overrides are logged with reason codes for quality monitoring.
        documentation: https://wiki.acme.com/hr/ai-override-process

      # Kill switch (REQUIRED for HIGH risk)
      killSwitch:
        available: true
        location: HR Admin Console > AI Settings > Emergency Disable
        authorizedRoles:
          - HR Director
          - VP HR
          - CPO
          - IT Security
        testSchedule: quarterly
        lastTested: "2026-01-15"
        testResult: passed

      # Escalation procedures
      escalation:
        levels:
          - level: 1
            contact: HR AI Team
            email: hr-ai-team@acme.com
            responseTime: 4-hours
          - level: 2
            contact: VP HR Technology
            email: vp-hrtech@acme.com
            responseTime: 2-hours
          - level: 3
            contact: Chief People Officer
            email: cpo@acme.com
            responseTime: 1-hour

    # Approval workflow (REQUIRED for HIGH risk)
    approvals:
      - type: initial-deployment
        status: approved
        approver:
          name: Jennifer Martinez
          role: VP Talent Acquisition
        date: "2026-01-10"
        evidence: https://jira.acme.com/HR-AI-123

      - type: risk-assessment
        status: approved
        approver:
          name: Legal Team
          role: Legal & Compliance
        date: "2026-01-08"
        evidence: https://sharepoint.acme.com/legal/ai-risk-reviews/hr-001

      - type: data-protection
        status: approved
        approver:
          name: Data Protection Office
          role: DPO
        date: "2026-01-05"
        evidence: https://jira.acme.com/DPO-456

    # Review schedule (REQUIRED)
    reviews:
      frequency: quarterly
      nextReview: "2026-05-01"
      lastReview: "2026-02-01"
      reviewers:
        - role: Technical Owner
          required: true
        - role: Business Owner
          required: true
        - role: Legal/Compliance
          required: true
        - role: Data Protection
          required: false

      reviewChecklist:
        - item: Performance metrics within acceptable range
          required: true
        - item: Fairness metrics within thresholds
          required: true
        - item: No significant model drift
          required: true
        - item: Documentation up to date
          required: true
        - item: Incident review completed
          required: false

    # Change management (REQUIRED)
    changeManagement:
      process: >-
        All changes must go through the AI Change Advisory Board (CAB).
        Changes are classified as Minor (config only), Standard (retrain
        same architecture), or Major (architecture change).

      approvalMatrix:
        minor:
          approvers: [Technical Owner]
          leadTime: 1-day
        standard:
          approvers: [Technical Owner, Business Owner]
          leadTime: 1-week
        major:
          approvers: [Technical Owner, Business Owner, Legal, DPO]
          leadTime: 2-weeks

      documentation: https://wiki.acme.com/hr/ai-change-process

  # ═══════════════════════════════════════════════════════════════════════════
  # 3.5 ASSESSMENTS (REQUIRED for HIGH risk)
  # ═══════════════════════════════════════════════════════════════════════════
  assessments:
    # AI Impact Assessment (REQUIRED for HIGH risk under EU AI Act)
    aiImpactAssessment:
      status: completed
      completedAt: "2026-01-08"
      validUntil: "2027-01-08"
      assessor:
        name: Legal & Compliance Team
        type: internal
      documentUrl: https://sharepoint.acme.com/legal/aia/hr-hiring-model-001.pdf
      summary: >-
        Assessment concluded the system poses manageable risks when
        operated with human oversight. Key mitigations include human
        review of all recommendations and quarterly bias audits.
      findings:
        - category: fundamental-rights
          severity: medium
          description: Potential impact on employment rights
          mitigation: Human-in-the-loop for all decisions
          status: mitigated
        - category: discrimination
          severity: high
          description: Risk of indirect discrimination
          mitigation: Bias audits and fairness constraints
          status: mitigated

    # Data Protection Impact Assessment (REQUIRED if processing PII)
    dataProtectionImpactAssessment:
      status: completed
      completedAt: "2026-01-05"
      validUntil: "2027-01-05"
      assessor:
        name: Data Protection Office
        type: internal
      documentUrl: https://sharepoint.acme.com/dpo/dpia/hr-model-001.pdf
      dpoConsulted: true
      dpoOpinion: favorable
      supervisoryAuthorityConsulted: false

    # Third-party audits (REQUIRED for GOLD/PLATINUM CGA)
    audits:
      - type: bias-audit
        status: completed
        auditor:
          name: FairML Auditors Inc.
          type: external
        completedAt: "2026-02-01"
        validUntil: "2027-02-01"
        reportUrl: https://sharepoint.acme.com/audits/fairml-2026-q1.pdf
        findings:
          passed: true
          summary: Model meets fairness criteria across all protected groups

      - type: security-audit
        status: scheduled
        auditor:
          name: SecureAI Partners
          type: external
        scheduledFor: "2026-06-01"

    # Risk assessment (REQUIRED)
    riskAssessment:
      status: completed
      methodology: NIST AI RMF
      completedAt: "2026-01-10"
      nextReview: "2026-04-10"

      identifiedRisks:
        - id: RISK-001
          category: accuracy
          description: Model may make incorrect predictions
          likelihood: medium
          impact: high
          overallRisk: high
          controls:
            - Human review of all recommendations
            - Confidence threshold filtering
          residualRisk: medium

        - id: RISK-002
          category: bias
          description: Model may exhibit demographic bias
          likelihood: medium
          impact: high
          overallRisk: high
          controls:
            - Quarterly bias audits
            - Fairness constraints in training
            - Diverse training data
          residualRisk: low

        - id: RISK-003
          category: privacy
          description: Potential privacy breach of candidate data
          likelihood: low
          impact: high
          overallRisk: medium
          controls:
            - Data anonymization
            - Access controls
            - Encryption at rest and in transit
          residualRisk: low

  # ═══════════════════════════════════════════════════════════════════════════
  # 3.6 COMPLIANCE EVIDENCE (AUTO-POPULATED BY AIGRC)
  # ═══════════════════════════════════════════════════════════════════════════
  compliance:
    # Current compliance status (auto-populated)
    status: partial
    score: 78
    lastChecked: "2026-02-16T10:30:00Z"

    # Framework-specific compliance
    frameworks:
      - name: eu-ai-act
        status: partial
        score: 75
        gaps:
          - article: Article 17
            requirement: Quality management system
            status: in-progress
            remediation: QMS documentation in progress
            dueDate: "2026-03-15"

      - name: nist-ai-rmf
        status: compliant
        score: 92
        lastAssessed: "2026-02-01"

    # Certification status
    certification:
      level: SILVER
      issuedAt: "2026-02-01"
      expiresAt: "2027-02-01"
      certificateId: CGA-2026-HR-001
      verificationUrl: https://cga.aigos.io/verify/CGA-2026-HR-001

  # ═══════════════════════════════════════════════════════════════════════════
  # 3.7 CONTACTS & SUPPORT (REQUIRED)
  # ═══════════════════════════════════════════════════════════════════════════
  contacts:
    # Primary contact for questions
    primary:
      name: David Kim
      role: Lead ML Engineer
      email: d.kim@acme.com
      phone: "+1-555-0123"

    # Support channels
    support:
      email: hr-ai-support@acme.com
      slack: "#hr-ai-support"
      ticketSystem: https://jira.acme.com/servicedesk/hr-ai

    # Incident response
    incidents:
      email: hr-ai-incidents@acme.com
      oncall: https://opsgenie.acme.com/teams/hr-ai
      escalation: See governance.humanOversight.escalation

    # Vendor contacts (if applicable)
    vendors:
      - name: ResumeParser Inc.
        contact: support@resumeparser.com
        sla: https://contracts.acme.com/resumeparser/sla

  # ═══════════════════════════════════════════════════════════════════════════
  # 3.8 DOCUMENTATION LINKS (RECOMMENDED)
  # ═══════════════════════════════════════════════════════════════════════════
  documentation:
    # Technical documentation
    technical:
      architecture: https://wiki.acme.com/hr/ai/architecture
      api: https://api-docs.acme.com/hr-ai/v2
      deployment: https://wiki.acme.com/hr/ai/deployment
      monitoring: https://wiki.acme.com/hr/ai/monitoring

    # User documentation
    user:
      guide: https://wiki.acme.com/hr/ai/user-guide
      training: https://learn.acme.com/hr-ai-training
      faq: https://wiki.acme.com/hr/ai/faq

    # Governance documentation
    governance:
      riskAssessment: https://sharepoint.acme.com/risk/hr-ai-001
      dataGovernance: https://wiki.acme.com/data/hr-ai
      changeManagement: https://wiki.acme.com/hr/ai-change-process

# ─────────────────────────────────────────────────────────────────────────────
# SECTION 4: Status (AUTO-POPULATED BY AIGRC - DO NOT EDIT MANUALLY)
# ─────────────────────────────────────────────────────────────────────────────
status:
  # Golden Thread hash linking this card to governance evidence
  goldenThread:
    hash: sha256:a1b2c3d4e5f6...
    algorithm: sha256
    computedAt: "2026-02-16T10:30:00Z"
    includes:
      - asset-card
      - policies
      - check-results

  # Last validation result
  validation:
    status: valid
    timestamp: "2026-02-16T10:30:00Z"
    warnings:
      - "assessments.audits[1].status is 'scheduled' - ensure completion by due date"

  # Sync status with Control Plane
  sync:
    controlPlane: https://aigos.acme.com
    lastSync: "2026-02-16T10:30:00Z"
    status: synced
```

---

## 4. Asset Card Templates by Risk Level

### 4.1 HIGH Risk Template

Use this template for systems in EU AI Act Annex III categories:

```yaml
apiVersion: aigrc.io/v1
kind: AssetCard

metadata:
  name: ""              # REQUIRED: unique identifier
  version: "1.0.0"      # REQUIRED
  description: ""       # REQUIRED
  status: draft

spec:
  classification:
    riskLevel: HIGH           # REQUIRED
    category: ""              # REQUIRED: Annex III category
    frameworks:
      - name: eu-ai-act
        version: "2024"
    jurisdictions:
      - code: EU
        primary: true
    rationale: ""             # REQUIRED: why HIGH risk

  technical:
    type: ""                  # REQUIRED
    framework:
      name: ""
      version: ""
    input:
      description: ""         # REQUIRED
    output:
      description: ""         # REQUIRED
    performance:
      metrics: []             # REQUIRED
      fairness: []            # REQUIRED for HIGH risk

  data:
    training:
      description: ""         # REQUIRED
      sources: []             # REQUIRED
      quality: {}             # REQUIRED
      biasMitigation: {}      # REQUIRED
    personalData:
      categories: []          # REQUIRED if PII

  governance:
    ownership:
      businessOwner: {}       # REQUIRED
      technicalOwner: {}      # REQUIRED
      team: {}                # REQUIRED
    humanOversight:
      level: ""               # REQUIRED
      overrideMechanism: {}   # REQUIRED
      killSwitch: {}          # REQUIRED
    approvals: []             # REQUIRED
    reviews:
      frequency: quarterly    # REQUIRED

  assessments:
    aiImpactAssessment:
      status: pending         # MUST be completed
    riskAssessment:
      status: pending         # MUST be completed

  contacts:
    primary: {}               # REQUIRED
```

### 4.2 LIMITED Risk Template

Use for systems with transparency obligations:

```yaml
apiVersion: aigrc.io/v1
kind: AssetCard

metadata:
  name: ""
  version: "1.0.0"
  description: ""
  status: draft

spec:
  classification:
    riskLevel: LIMITED
    category: ""
    frameworks:
      - name: eu-ai-act
        version: "2024"
    jurisdictions:
      - code: EU
        primary: true

  technical:
    type: ""
    framework:
      name: ""
      version: ""
    input:
      description: ""
    output:
      description: ""

  governance:
    ownership:
      businessOwner: {}
      technicalOwner: {}
      team: {}
    humanOversight:
      level: human-on-the-loop    # Can be lighter
    reviews:
      frequency: semi-annually

  # Transparency requirements
  transparency:
    userNotification:
      required: true
      method: ""              # How users are informed
      content: ""             # What they're told
    disclosures:
      - type: ai-generated-content
        location: ""
        method: ""

  contacts:
    primary: {}
```

### 4.3 MINIMAL Risk Template

Use for low-risk AI systems:

```yaml
apiVersion: aigrc.io/v1
kind: AssetCard

metadata:
  name: ""
  version: "1.0.0"
  description: ""
  status: draft

spec:
  classification:
    riskLevel: MINIMAL
    category: general-purpose
    frameworks:
      - name: eu-ai-act
        version: "2024"

  technical:
    type: ""
    framework:
      name: ""
      version: ""
    input:
      description: ""
    output:
      description: ""

  governance:
    ownership:
      businessOwner: {}
      technicalOwner: {}
    reviews:
      frequency: annually

  contacts:
    primary: {}
```

### 4.4 Third-Party/Vendor AI Template

Use for external AI services (OpenAI, Anthropic, etc.):

```yaml
apiVersion: aigrc.io/v1
kind: AssetCard

metadata:
  name: ""
  version: "1.0.0"
  description: ""
  status: draft
  labels:
    vendor: true

spec:
  classification:
    riskLevel: ""
    category: ""
    # Inherit risk from vendor + use case
    vendorRiskInheritance: true

  technical:
    type: vendor-api

    # Vendor information (REQUIRED)
    vendor:
      name: ""                    # e.g., "OpenAI"
      product: ""                 # e.g., "GPT-4"
      version: ""
      apiEndpoint: ""

      # Vendor compliance claims
      compliance:
        soc2: true
        iso27001: true
        gdpr: true

      # Vendor documentation
      documentation:
        termsOfService: ""
        privacyPolicy: ""
        dpa: ""                   # Data Processing Agreement
        modelCard: ""             # Vendor's model documentation

    # How you use the vendor API
    integration:
      type: api-call              # api-call, sdk, embedded
      authentication: api-key
      dataResidency: us-east-1

    input:
      description: ""
      # What data do you send to vendor?
      sensitiveData:
        pii: false
        confidential: false

    output:
      description: ""

  data:
    # Data sent to vendor
    vendorDataSharing:
      description: ""
      categories: []
      retentionByVendor: ""       # Vendor's stated retention
      optOutAvailable: false

  governance:
    ownership:
      businessOwner: {}
      technicalOwner: {}

    # Vendor management
    vendorManagement:
      contractExpiry: ""
      reviewSchedule: quarterly
      riskAssessment:
        lastPerformed: ""
        nextDue: ""

      # Vendor requirements
      requirements:
        dpaInPlace: true
        slaAgreed: true
        exitStrategy: true

    # You still need human oversight
    humanOversight:
      level: human-on-the-loop

  contacts:
    primary: {}
    vendor:
      name: ""
      contact: ""
```

---

## 5. Asset Card Lifecycle

### 5.1 Lifecycle States

```
                         ASSET CARD LIFECYCLE
═══════════════════════════════════════════════════════════════════════════════

┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                              │
│  DRAFT ──────► ACTIVE ──────► DEPRECATED ──────► ARCHIVED                   │
│    │              │                │                                         │
│    │              │                │                                         │
│    │              ▼                ▼                                         │
│    │         ┌────────┐      ┌──────────┐                                   │
│    │         │REVIEWED│      │ SUNSET   │                                   │
│    │         └────────┘      └──────────┘                                   │
│    │              │                                                          │
│    │              ▼                                                          │
│    └─────► (return to DRAFT if major changes needed)                        │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘

STATE DEFINITIONS
─────────────────────────────────────────────────────────────────────────────

  DRAFT         Asset Card being created or undergoing major revision
                • Not yet approved for production
                • May have incomplete sections
                • Not subject to compliance checks

  ACTIVE        Production Asset Card
                • Fully approved
                • Subject to compliance checks
                • Linked to running system
                • Golden Thread enabled

  DEPRECATED    Being phased out
                • Still operational but scheduled for retirement
                • No new implementations
                • Migration plan required

  ARCHIVED      No longer in use
                • Historical record only
                • System decommissioned
                • Retained for audit purposes

TRANSITIONS
─────────────────────────────────────────────────────────────────────────────

  DRAFT → ACTIVE       Requires: All required fields, approvals, risk assessment
  ACTIVE → ACTIVE      Version bump (minor changes)
  ACTIVE → DRAFT       Major revision needed
  ACTIVE → DEPRECATED  Retirement initiated
  DEPRECATED → ARCHIVED System decommissioned
```

### 5.2 Lifecycle Operations

#### 5.2.1 Creating a New Asset Card

```bash
# Method 1: Interactive wizard
aigrc asset-card init --wizard

# Method 2: From template
aigrc asset-card init --template high-risk --name hiring-predictor

# Method 3: From existing JSON/YAML
aigrc asset-card init --from-file asset-data.yaml

# Method 4: Batch from scan results
aigrc scan --output scan-results.json
aigrc asset-card init --batch --input scan-results.json
```

**Wizard Flow:**

```
Asset Card Creation Wizard
═══════════════════════════════════════════════════════════════════════════════

Step 1 of 8: Basic Information
─────────────────────────────────────────────────────────────────────────────
? Asset name (unique identifier): hiring-predictor
? Display name: Hiring Prediction Model
? Version: 1.0.0
? Brief description: ML model predicting candidate suitability

Step 2 of 8: Classification
─────────────────────────────────────────────────────────────────────────────
? Risk level:
  ❯ HIGH     - Annex III systems (employment, credit, etc.)
    LIMITED  - Systems with transparency obligations
    MINIMAL  - Low-risk general purpose

? Category (HIGH risk): employment-recruitment
? Primary jurisdiction: EU

Step 3 of 8: Technical Details
─────────────────────────────────────────────────────────────────────────────
? Type of AI system: classification
? ML Framework: scikit-learn
? Framework version: 1.4.0

Step 4 of 8: Ownership
─────────────────────────────────────────────────────────────────────────────
? Business owner name: Jennifer Martinez
? Business owner email: j.martinez@acme.com
? Technical owner name: David Kim
? Technical owner email: d.kim@acme.com
? Team name: HR AI Team
? Team email: hr-ai-team@acme.com

Step 5 of 8: Data
─────────────────────────────────────────────────────────────────────────────
? Does this system process personal data? Yes
? Training data description: Historical hiring data 2020-2025
? Number of training records: 150000

Step 6 of 8: Human Oversight
─────────────────────────────────────────────────────────────────────────────
? Oversight level:
  ❯ human-in-the-loop   - Human approves every decision
    human-on-the-loop   - Human monitors and can intervene
    human-in-command    - Human sets parameters

? Is a kill switch available? Yes

Step 7 of 8: Assessments
─────────────────────────────────────────────────────────────────────────────
? AI Impact Assessment status:
  ❯ pending
    in-progress
    completed

Step 8 of 8: Review
─────────────────────────────────────────────────────────────────────────────

Preview:
┌─────────────────────────────────────────────────────────────────────────┐
│ Asset Card: hiring-predictor v1.0.0                                      │
│ Risk: HIGH (employment-recruitment)                                      │
│ Status: draft                                                            │
│ Business Owner: Jennifer Martinez                                        │
│ Technical Owner: David Kim                                               │
│ Assessments: AI Impact Assessment (pending)                              │
└─────────────────────────────────────────────────────────────────────────┘

? Create Asset Card? Yes

✓ Created hiring-predictor.asset-card.yaml

Next steps:
  1. Complete remaining sections (assessments, data governance)
  2. Run 'aigrc asset-card validate hiring-predictor'
  3. Update status to 'active' after approvals
  4. Commit to version control
```

#### 5.2.2 Validating Asset Cards

```bash
# Validate single card
aigrc asset-card validate hiring-predictor.asset-card.yaml

# Validate all cards in directory
aigrc asset-card validate --all

# Strict mode (warnings become errors)
aigrc asset-card validate --strict

# Validate against specific policy
aigrc asset-card validate --policy enterprise-strict

# JSON output for automation
aigrc asset-card validate --format json
```

**Validation Output:**

```
Asset Card Validation: hiring-predictor.asset-card.yaml
═══════════════════════════════════════════════════════════════════════════════

SCHEMA VALIDATION
─────────────────────────────────────────────────────────────────────────────
  ✓ PASS  Valid YAML syntax
  ✓ PASS  Schema version: aigrc.io/v1
  ✓ PASS  All required fields present
  ✓ PASS  Field types correct

RISK-LEVEL REQUIREMENTS (HIGH)
─────────────────────────────────────────────────────────────────────────────
  ✓ PASS  Classification rationale provided
  ✓ PASS  Human oversight configured
  ✓ PASS  Kill switch documented
  ✓ PASS  Data governance section complete
  ✗ FAIL  AI Impact Assessment not completed (status: pending)
  ✗ FAIL  Risk assessment not completed (status: pending)

CONTENT VALIDATION
─────────────────────────────────────────────────────────────────────────────
  ✓ PASS  Risk level consistent with category
  ✓ PASS  Ownership information complete
  ✓ PASS  Contact information valid
  ⚠ WARN  Next review date not set

POLICY COMPLIANCE (production-standard)
─────────────────────────────────────────────────────────────────────────────
  ✓ PASS  23/25 policy rules
  ✗ FAIL  AIGRC-POL-015: HIGH risk systems must have completed AIA
  ✗ FAIL  AIGRC-POL-018: HIGH risk systems must have risk assessment

SUMMARY
─────────────────────────────────────────────────────────────────────────────
  Status:   INVALID
  Passed:   26
  Failed:   4
  Warnings: 1

  Exit Code: 1

REQUIRED ACTIONS:
  1. Complete AI Impact Assessment
  2. Complete Risk Assessment
  3. Set governance.reviews.nextReview date
```

#### 5.2.3 Updating Asset Cards

```bash
# Interactive update
aigrc asset-card update hiring-predictor --wizard

# Update specific field
aigrc asset-card update hiring-predictor \
  --set "metadata.version=2.0.0" \
  --set "spec.technical.framework.version=1.5.0"

# Update from file (merge)
aigrc asset-card update hiring-predictor --from-file updates.yaml

# Bump version automatically
aigrc asset-card update hiring-predictor --bump minor

# Update status
aigrc asset-card update hiring-predictor --set "metadata.status=active"
```

#### 5.2.4 Version Management

```
                      VERSION MANAGEMENT
═══════════════════════════════════════════════════════════════════════════════

SEMANTIC VERSIONING
─────────────────────────────────────────────────────────────────────────────

  MAJOR.MINOR.PATCH
    │     │     │
    │     │     └── Bug fixes, documentation updates, no behavior change
    │     │
    │     └──────── New features, non-breaking changes, retraining
    │
    └────────────── Breaking changes, architecture change, new risk level


WHEN TO BUMP VERSIONS
─────────────────────────────────────────────────────────────────────────────

  PATCH (1.0.0 → 1.0.1)
    • Documentation corrections
    • Contact information updates
    • Typo fixes
    • Metadata adjustments

  MINOR (1.0.0 → 1.1.0)
    • Model retrained (same architecture)
    • New features added
    • Performance improvements
    • New data sources
    • Framework version updates

  MAJOR (1.0.0 → 2.0.0)
    • Architecture change
    • Risk level change
    • Breaking API changes
    • New classification category
    • Significant scope change
```

#### 5.2.5 Deprecation & Archival

```bash
# Mark as deprecated
aigrc asset-card update hiring-predictor --set "metadata.status=deprecated"

# Add deprecation notice
aigrc asset-card update hiring-predictor \
  --set "metadata.annotations.deprecation-notice=Use hiring-predictor-v3 instead" \
  --set "metadata.annotations.sunset-date=2026-06-01"

# Archive (after decommissioning)
aigrc asset-card update hiring-predictor --set "metadata.status=archived"

# Move to archive directory (optional)
mv hiring-predictor.asset-card.yaml .aigrc/archive/
```

---

## 6. Asset Card Workflows

### 6.1 New AI System Workflow

```
                    NEW AI SYSTEM WORKFLOW
═══════════════════════════════════════════════════════════════════════════════

PHASE 1: DISCOVERY
─────────────────────────────────────────────────────────────────────────────

  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
  │   Develop   │───►│  Scan for   │───►│  Classify   │
  │  AI System  │    │    AI       │    │   Risk      │
  └─────────────┘    └─────────────┘    └─────────────┘

  Commands:
  $ aigrc scan ./src --format table
  $ aigrc classify --interactive


PHASE 2: DOCUMENTATION
─────────────────────────────────────────────────────────────────────────────

  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
  │   Create    │───►│  Complete   │───►│  Validate   │
  │ Asset Card  │    │  Sections   │    │    Card     │
  └─────────────┘    └─────────────┘    └─────────────┘

  Commands:
  $ aigrc asset-card init --wizard
  $ aigrc asset-card validate --strict


PHASE 3: ASSESSMENTS (HIGH RISK)
─────────────────────────────────────────────────────────────────────────────

  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
  │    Risk     │───►│  AI Impact  │───►│    DPIA     │
  │ Assessment  │    │ Assessment  │    │(if needed)  │
  └─────────────┘    └─────────────┘    └─────────────┘

  Update Asset Card with assessment results:
  $ aigrc asset-card update --from-file assessment-results.yaml


PHASE 4: APPROVAL
─────────────────────────────────────────────────────────────────────────────

  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
  │  Technical  │───►│  Business   │───►│   Legal/    │
  │   Review    │    │   Review    │    │ Compliance  │
  └─────────────┘    └─────────────┘    └─────────────┘

  Record approvals:
  $ aigrc asset-card update --add-approval "technical" "David Kim" "2026-02-16"


PHASE 5: ACTIVATION
─────────────────────────────────────────────────────────────────────────────

  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
  │   Final     │───►│   Set to    │───►│   Commit    │
  │ Validation  │    │   Active    │    │  & Deploy   │
  └─────────────┘    └─────────────┘    └─────────────┘

  Commands:
  $ aigrc asset-card validate --strict
  $ aigrc asset-card update --set "metadata.status=active"
  $ git add *.asset-card.yaml && git commit -m "Add hiring-predictor asset card"
  $ aigrc check --ci
```

### 6.2 Model Update Workflow

```
                    MODEL UPDATE WORKFLOW
═══════════════════════════════════════════════════════════════════════════════

┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                              │
│  START: Model retrained or updated                                          │
│         │                                                                    │
│         ▼                                                                    │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │  STEP 1: Update Asset Card Version                                   │   │
│  │                                                                       │   │
│  │  $ aigrc asset-card update hiring-predictor --bump minor             │   │
│  │                                                                       │   │
│  │  This bumps 2.0.0 → 2.1.0                                            │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│         │                                                                    │
│         ▼                                                                    │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │  STEP 2: Update Technical Details                                    │   │
│  │                                                                       │   │
│  │  Update metrics, framework versions, etc.:                           │   │
│  │  $ aigrc asset-card update hiring-predictor \                        │   │
│  │      --set "spec.technical.framework.version=1.5.0" \                │   │
│  │      --set "spec.technical.performance.metrics[0].value=0.89"        │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│         │                                                                    │
│         ▼                                                                    │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │  STEP 3: Re-validate                                                 │   │
│  │                                                                       │   │
│  │  $ aigrc asset-card validate --strict                                │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│         │                                                                    │
│         ▼                                                                    │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │  STEP 4: Run Compliance Check                                        │   │
│  │                                                                       │   │
│  │  $ aigrc check --ci --fail-on high                                   │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│         │                                                                    │
│         ▼                                                                    │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │  STEP 5: Commit Changes                                              │   │
│  │                                                                       │   │
│  │  $ git add hiring-predictor.asset-card.yaml                          │   │
│  │  $ git commit -m "Update hiring-predictor to v2.1.0"                 │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│         │                                                                    │
│         ▼                                                                    │
│  END: New version deployed with updated governance                          │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 6.3 Quarterly Review Workflow

```bash
#!/bin/bash
# quarterly-review.sh - Asset Card Quarterly Review Script

echo "═══════════════════════════════════════════════════════════════════════"
echo "                    ASSET CARD QUARTERLY REVIEW"
echo "═══════════════════════════════════════════════════════════════════════"

# Step 1: List all Asset Cards due for review
echo ""
echo "Step 1: Finding Asset Cards due for review..."
aigrc asset-card list --due-for-review --format table

# Step 2: Generate compliance report
echo ""
echo "Step 2: Generating compliance report..."
aigrc check --format html --output quarterly-review/compliance-$(date +%Y-Q%q).html

# Step 3: Check for cards with overdue reviews
echo ""
echo "Step 3: Checking for overdue reviews..."
aigrc asset-card list --overdue-review --format json > quarterly-review/overdue.json

# Step 4: Generate executive summary
echo ""
echo "Step 4: Generating executive summary..."
aigrc report executive --period 90d --format pdf \
  --output quarterly-review/executive-summary-$(date +%Y-Q%q).pdf

echo ""
echo "Review materials generated in ./quarterly-review/"
echo ""
echo "Next Steps:"
echo "  1. Review each Asset Card with owners"
echo "  2. Update assessments if expired"
echo "  3. Update review dates: aigrc asset-card update <name> --set 'spec.governance.reviews.lastReview=$(date +%Y-%m-%d)'"
echo "  4. Schedule next review: aigrc asset-card update <name> --set 'spec.governance.reviews.nextReview=<date>'"
```

---

## 7. Common Patterns and Best Practices

### 7.1 Documentation Quality Checklist

| Section | Quality Criteria | Weight |
|---------|-----------------|--------|
| **Description** | Clear, concise, explains purpose | High |
| **Classification** | Rationale documented, frameworks identified | Critical |
| **Technical** | Input/output documented, metrics current | High |
| **Data** | Sources identified, quality measured | Critical |
| **Governance** | Owners identified, reviews scheduled | Critical |
| **Assessments** | All required assessments completed | Critical |
| **Contacts** | All contacts valid and responsive | Medium |

### 7.2 Writing Good Descriptions

**Bad:**
```yaml
description: ML model for HR
```

**Good:**
```yaml
description: >-
  Gradient boosting classifier that predicts candidate-job fit scores
  based on resume analysis and role requirements. Used by recruiters
  during initial screening to prioritize candidate review. Outputs
  suitability score (0-100) with explanation factors.
```

### 7.3 Classification Rationale Examples

**Employment (HIGH):**
```yaml
rationale: >-
  This system is classified as HIGH risk under EU AI Act Article 6(2)
  because it falls within Annex III, Section 4(a): AI systems intended
  to be used for recruitment or selection of natural persons, including
  for screening or filtering job applications, evaluating candidates
  during interviews, and making decisions affecting terms of employment.
```

**Credit Scoring (HIGH):**
```yaml
rationale: >-
  Classified as HIGH risk under EU AI Act Annex III, Section 5(b):
  AI systems used to evaluate creditworthiness of natural persons.
  The system directly influences credit access decisions which can
  significantly affect individuals' financial well-being.
```

**Chatbot (LIMITED):**
```yaml
rationale: >-
  Classified as LIMITED risk under EU AI Act Article 50: AI systems
  that interact directly with natural persons must ensure users are
  informed they are interacting with AI. This customer service chatbot
  requires transparency disclosures but does not fall into HIGH risk
  categories as it does not make consequential decisions.
```

### 7.4 Data Governance Best Practices

```yaml
data:
  training:
    sources:
      # Always document ALL data sources
      - name: internal-ats
        type: database
        description: Historical hiring decisions 2020-2025
        records: 150000
        quality:
          # Quantify data quality
          completeness: 0.94
          accuracy: 0.91
        # Document known issues
        knownIssues:
          - "3.2% missing education levels - imputed"
          - "Pre-2022 data lacks standardized job codes"

    # ALWAYS document bias mitigation for HIGH risk
    biasMitigation:
      performed: true
      techniques:
        - name: resampling
          description: Stratified sampling to balance protected groups
          effectiveness: "Improved demographic parity from 0.72 to 0.95"
        - name: fairness-constraints
          description: Equalized odds constraint during training

      # Document what you checked
      protectedAttributes:
        - gender
        - ethnicity
        - age

      # Document outcomes
      biasTestResults:
        demographicParity: 0.95
        equalizedOdds: 0.92
        thresholdsUsed: 0.8
```

### 7.5 Human Oversight Configuration

```yaml
governance:
  humanOversight:
    # Be specific about the oversight level
    level: human-in-the-loop

    # Explain exactly what this means in practice
    description: >-
      Every AI recommendation is reviewed by a qualified recruiter
      before any action is taken. The AI provides a recommendation
      and explanation, but the human makes the final decision.

    # Document the override process
    overrideMechanism:
      available: true
      process: >-
        Recruiters can override AI recommendations by:
        1. Clicking "Override" in the ATS interface
        2. Selecting a reason code
        3. Providing justification (required for >10 point deviation)
        All overrides are logged and reviewed weekly.

      # Important: document metrics
      metrics:
        overrideRate: 0.12        # 12% of recommendations overridden
        lastMeasured: "2026-02-01"

    # Kill switch is REQUIRED for HIGH risk
    killSwitch:
      available: true

      # Be very specific about location
      location: >-
        HR Admin Console > Settings > AI Features >
        Emergency Controls > Disable Hiring AI

      # Document who can use it
      authorizedRoles:
        - HR Director
        - VP Human Resources
        - Chief People Officer
        - IT Security Team
        - On-Call SRE (emergency only)

      # Prove it works
      testSchedule: quarterly
      lastTested: "2026-01-15"
      testResult: passed
      testDuration: "< 30 seconds to full disable"
```

---

## 8. Troubleshooting Asset Cards

### 8.1 Common Validation Errors

| Error | Cause | Solution |
|-------|-------|----------|
| `required field missing: metadata.name` | Name not provided | Add unique name |
| `invalid risk level` | Typo in riskLevel | Use: HIGH, LIMITED, MINIMAL |
| `category required for HIGH risk` | Missing category | Add Annex III category |
| `rationale required for HIGH risk` | Missing classification rationale | Document why HIGH risk |
| `invalid framework reference` | Unknown framework | Use: eu-ai-act, nist-ai-rmf, iso-42001 |
| `owner email invalid format` | Bad email format | Fix email address |
| `duplicate asset name` | Name already used | Use unique name |

### 8.2 Common Content Warnings

| Warning | Meaning | Action |
|---------|---------|--------|
| `next review date in past` | Review overdue | Schedule and update date |
| `assessment expired` | Assessment >1 year old | Re-perform assessment |
| `missing fairness metrics` | HIGH risk without fairness | Add fairness testing |
| `incomplete data governance` | Missing data sections | Document data sources |
| `no kill switch documented` | HIGH risk without kill switch | Add kill switch info |

### 8.3 Debugging Validation

```bash
# Verbose validation output
aigrc asset-card validate --verbose hiring-predictor.asset-card.yaml

# Show schema requirements
aigrc asset-card validate --show-schema HIGH

# Validate specific section only
aigrc asset-card validate --section governance hiring-predictor.asset-card.yaml

# Compare against requirements
aigrc asset-card validate --compare-requirements eu-ai-act hiring-predictor.asset-card.yaml
```

---

## 9. Hands-On Exercises

### Exercise C-03.1: Create a HIGH Risk Asset Card

**Objective:** Create a complete Asset Card for a credit scoring system.

**Time:** 45 minutes

**Scenario:**
Your customer has a machine learning system that evaluates credit applications. Create a complete Asset Card.

**Requirements:**
- Risk Level: HIGH (credit scoring falls under Annex III)
- Framework: XGBoost 2.0
- Input: Credit application data (income, employment, history)
- Output: Credit score (300-850) and recommendation
- Must include all HIGH risk requirements

**Steps:**

```bash
# 1. Create workspace
mkdir exercise-c03
cd exercise-c03

# 2. Initialize AIGRC
aigrc init

# 3. Create Asset Card using wizard
aigrc asset-card init --template high-risk --wizard

# 4. Follow wizard prompts for:
#    - Name: credit-scorer
#    - Risk Level: HIGH
#    - Category: essential-services (credit)
#    - Complete all sections

# 5. Validate
aigrc asset-card validate --strict credit-scorer.asset-card.yaml

# 6. Fix any issues

# 7. Run compliance check
aigrc check -v
```

**Success Criteria:**
- [ ] Asset Card validates without errors
- [ ] All HIGH risk requirements met
- [ ] Classification rationale documented
- [ ] Human oversight configured
- [ ] Kill switch documented
- [ ] Data governance complete

### Exercise C-03.2: Vendor AI Documentation

**Objective:** Document a third-party AI service integration.

**Time:** 30 minutes

**Scenario:**
Your customer uses OpenAI GPT-4 for customer support. Create an Asset Card.

**Steps:**

```bash
# 1. Create Asset Card from vendor template
aigrc asset-card init --template vendor --name customer-support-gpt

# 2. Document:
#    - Vendor: OpenAI
#    - Product: GPT-4
#    - Use case: Customer support responses
#    - Risk assessment: What data is sent to vendor?

# 3. Validate
aigrc asset-card validate customer-support-gpt.asset-card.yaml
```

### Exercise C-03.3: Quarterly Review Simulation

**Objective:** Practice the quarterly review process.

**Time:** 30 minutes

**Steps:**

1. Create 3 Asset Cards with different review dates
2. Run the quarterly review script
3. Update review dates for cards that pass review
4. Document findings for cards that need attention

---

## 10. Knowledge Check

### Quiz: Module C-03

1. What file extension should Asset Cards use?
   - A) `.asset.yaml`
   - B) `.asset-card.yaml`
   - C) `.ai-card.yml`
   - D) `.governance.yaml`

2. Which field is REQUIRED for HIGH risk systems but not MINIMAL?
   - A) `metadata.name`
   - B) `spec.classification.rationale`
   - C) `spec.contacts.primary`
   - D) `metadata.version`

3. What does `human-in-the-loop` mean?
   - A) AI makes all decisions automatically
   - B) Human monitors AI remotely
   - C) Human approves every AI decision
   - D) AI has no human involvement

4. When should you bump the MAJOR version?
   - A) Documentation update
   - B) Model retrained
   - C) Architecture change
   - D) Performance improvement

5. What status indicates an Asset Card is ready for production?
   - A) `draft`
   - B) `ready`
   - C) `active`
   - D) `approved`

**Answers:** 1-B, 2-B, 3-C, 4-C, 5-C

---

## 11. Quick Reference

### Asset Card Field Requirements by Risk Level

| Field | HIGH | LIMITED | MINIMAL |
|-------|:----:|:-------:|:-------:|
| `metadata.name` | ✓ | ✓ | ✓ |
| `metadata.version` | ✓ | ✓ | ✓ |
| `metadata.description` | ✓ | ✓ | ✓ |
| `spec.classification.riskLevel` | ✓ | ✓ | ✓ |
| `spec.classification.category` | ✓ | - | - |
| `spec.classification.rationale` | ✓ | - | - |
| `spec.technical.type` | ✓ | ✓ | ✓ |
| `spec.technical.input` | ✓ | ✓ | - |
| `spec.technical.output` | ✓ | ✓ | - |
| `spec.technical.performance.metrics` | ✓ | - | - |
| `spec.technical.performance.fairness` | ✓ | - | - |
| `spec.data.training` | ✓ | - | - |
| `spec.data.biasMitigation` | ✓ | - | - |
| `spec.governance.ownership` | ✓ | ✓ | ✓ |
| `spec.governance.humanOversight` | ✓ | ✓ | - |
| `spec.governance.humanOversight.killSwitch` | ✓ | - | - |
| `spec.assessments.aiImpactAssessment` | ✓ | - | - |
| `spec.assessments.riskAssessment` | ✓ | - | - |
| `spec.contacts.primary` | ✓ | ✓ | ✓ |

### CLI Quick Reference

```bash
# Create
aigrc asset-card init --wizard
aigrc asset-card init --template <template>
aigrc asset-card init --from-file <file>

# Validate
aigrc asset-card validate <file>
aigrc asset-card validate --all
aigrc asset-card validate --strict

# Update
aigrc asset-card update <name> --set "<path>=<value>"
aigrc asset-card update <name> --bump <major|minor|patch>
aigrc asset-card update <name> --from-file <file>

# View
aigrc asset-card show <name>
aigrc asset-card list
aigrc asset-card list --risk-level HIGH
aigrc asset-card list --due-for-review
```

---

*Module C-03 Complete. Proceed to Module C-04 or CP-01.*
