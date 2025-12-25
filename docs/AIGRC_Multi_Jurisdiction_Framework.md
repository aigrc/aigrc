# AIGRC Multi-Jurisdiction Compliance Framework
## Extending the Toolchain for Global AI Governance

---

# Executive Summary

The AIGRC toolchain (VS Code Extension, CLI, GitHub Action) currently focuses on EU AI Act compliance. To become the universal standard for AI governance, it must support a modular, extensible framework that accommodates any regulatory regime—international, national, state, and local—while mapping to industry standards like NIST AI RMF, ISO 42001, OWASP CycloneDX, and IEEE.

**Recommended Approach:** Implement a **Compliance Profile Architecture** that separates core governance logic from jurisdiction-specific rules, enabling users to "plug in" regulatory requirements as declarative policy modules.

---

# Part I: The Regulatory Landscape

## 1.1 Current & Emerging AI Regulations

| Jurisdiction | Regulation | Status | Key Requirements |
|--------------|------------|--------|------------------|
| **European Union** | EU AI Act | In force (Aug 2024) | Risk classification, conformity assessment, transparency |
| **United States (Federal)** | EO 14110 + OMB M-24-10/M-24-18 | In force | AI inventory, impact assessment, safety/rights-impacting designation |
| **United States (State)** | Colorado AI Act | Effective Feb 2026 | High-risk AI disclosure, impact assessments |
| **United States (State)** | NYC Local Law 144 | In force | Automated employment decision bias audits |
| **United States (State)** | California AB 2013 (Proposed) | Pending | AI transparency requirements |
| **Canada** | AIDA (Bill C-27) | Pending | High-impact AI systems, impact assessments |
| **United Kingdom** | UK AI Safety | Framework | Risk-proportionate, sector-specific guidance |
| **China** | AIGC Measures + Algorithm Recommendations | In force | Algorithm registration, content labeling |
| **Singapore** | Model AI Governance Framework | Framework | Risk-based, voluntary adoption |
| **Brazil** | AI Bill (PL 2338/2023) | Pending | Risk classification, rights protection |
| **Japan** | AI Business Guidelines | Framework | Voluntary, sector-specific |

## 1.2 Industry Standards & Frameworks

| Standard | Issuing Body | Purpose | AIGRC Relevance |
|----------|--------------|---------|-----------------|
| **NIST AI RMF** | NIST | Risk management framework | Risk profiles, trustworthiness characteristics |
| **ISO/IEC 42001** | ISO | AI management system | Certification requirements, continuous improvement |
| **ISO/IEC 23894** | ISO | AI risk management | Risk identification, assessment, treatment |
| **OWASP CycloneDX** | OWASP | AI/ML BOM | Supply chain transparency, dependency tracking |
| **IEEE 7000** | IEEE | Ethical system design | Value-based design process |
| **OECD AI Principles** | OECD | International policy | Foundational principles for national laws |
| **Model Cards** | Google/HuggingFace | Model documentation | Transparency, intended use disclosure |

## 1.3 US Federal Requirements (OMB M-24-10/M-24-18)

The US federal government has established specific requirements through OMB memoranda:

**M-24-10 (March 2024) - Agency Use of AI:**
- Designate Chief AI Officers (CAIOs)
- Inventory all AI use cases
- Classify AI as "safety-impacting" or "rights-impacting"
- Implement minimum risk management practices
- Complete AI impact assessments
- Provide transparency and human oversight

**M-24-18 (October 2024) - AI Acquisition:**
- Risk management for procured AI
- Rights-impacting and safety-impacting AI requirements
- Generative AI and biometric AI provisions
- Data management and model security
- Vendor transparency requirements

**Key Classifications:**
- **Safety-impacting AI:** AI whose output affects safety of human life, infrastructure, environment
- **Rights-impacting AI:** AI whose output affects civil rights, civil liberties, or privacy

---

# Part II: Architecture Design

## 2.1 Compliance Profile Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         AIGRC CORE FRAMEWORK                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    UNIVERSAL GOVERNANCE ENGINE                       │   │
│  │                                                                       │   │
│  │  • Asset Detection                                                    │   │
│  │  • Asset Card Schema (base)                                           │   │
│  │  • Golden Thread Linking                                              │   │
│  │  • Approval Workflows                                                 │   │
│  │  • Artifact Generation                                                │   │
│  │  • Audit Trail                                                        │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                     │                                       │
│                                     ▼                                       │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    COMPLIANCE PROFILE LOADER                         │   │
│  │                                                                       │   │
│  │  • Reads profile YAML/JSON from /profiles directory                   │   │
│  │  • Validates profile schema                                           │   │
│  │  • Merges multiple profiles (e.g., EU + ISO + Internal)               │   │
│  │  • Resolves conflicts (strictest wins)                                │   │
│  │  • Caches compiled rules                                              │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                     │                                       │
│         ┌───────────────────────────┼───────────────────────────┐          │
│         │                           │                           │          │
│         ▼                           ▼                           ▼          │
│  ┌─────────────┐           ┌─────────────┐           ┌─────────────┐       │
│  │ Regulation  │           │  Standard   │           │  Internal   │       │
│  │  Profiles   │           │  Profiles   │           │  Profiles   │       │
│  │             │           │             │           │             │       │
│  │ • EU AI Act │           │ • NIST RMF  │           │ • Company   │       │
│  │ • OMB M-24  │           │ • ISO 42001 │           │   Policy    │       │
│  │ • Colorado  │           │ • CycloneDX │           │ • Industry  │       │
│  │ • NYC LL144 │           │ • IEEE 7000 │           │   Vertical  │       │
│  │ • UK AI     │           │ • Model Card│           │ • Customer  │       │
│  │ • China AIGC│           │             │           │   Specific  │       │
│  └─────────────┘           └─────────────┘           └─────────────┘       │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

## 2.2 Compliance Profile Schema

Each compliance profile is a declarative YAML file that defines:

```yaml
# profiles/regulations/us-omb-m24.yaml
apiVersion: aigrc.dev/v1
kind: ComplianceProfile
metadata:
  id: us-omb-m24
  name: "US OMB M-24-10/M-24-18"
  version: "1.0.0"
  jurisdiction:
    type: national
    country: US
    scope: federal-agencies
  effectiveDate: "2024-03-28"
  authority: "Office of Management and Budget"
  references:
    - url: "https://whitehouse.gov/wp-content/uploads/2024/03/M-24-10.pdf"
      title: "M-24-10 Memorandum"
    - url: "https://whitehouse.gov/wp-content/uploads/2024/10/M-24-18.pdf"
      title: "M-24-18 Memorandum"

spec:
  # Risk Classification System
  riskClassification:
    levels:
      - id: safety-impacting
        name: "Safety-Impacting AI"
        description: "AI whose output serves as a principal basis for a decision or action that could impact safety"
        criteria:
          - domain: ["critical_infrastructure", "healthcare", "transportation", "defense"]
          - autonomyLevel: ["autonomous", "supervisory"]
          - impactsSafety: true
        
      - id: rights-impacting
        name: "Rights-Impacting AI"
        description: "AI whose output serves as a principal basis for a decision or action that could impact rights"
        criteria:
          - domain: ["employment", "education", "credit", "housing", "benefits", "law_enforcement"]
          - affectsIndividuals: true
          - autonomyLevel: ["autonomous", "supervisory", "assisted"]
        
      - id: general
        name: "General AI"
        description: "AI not classified as safety-impacting or rights-impacting"
        criteria:
          - default: true

  # Required Artifacts by Risk Level
  requiredArtifacts:
    safety-impacting:
      - type: ai_impact_assessment
        template: templates/omb-impact-assessment.md
        required: true
        deadline: before_deployment
        
      - type: risk_mitigation_plan
        template: templates/omb-risk-mitigation.md
        required: true
        
      - type: human_oversight_documentation
        required: true
        
      - type: independent_evaluation
        required: true
        description: "Independent evaluation of AI performance"
        
      - type: ongoing_monitoring_plan
        required: true
        
    rights-impacting:
      - type: ai_impact_assessment
        template: templates/omb-impact-assessment.md
        required: true
        
      - type: equity_assessment
        required: true
        description: "Assessment of algorithmic discrimination risks"
        
      - type: notice_and_explanation
        required: true
        description: "Notice to affected individuals"
        
      - type: appeal_process
        required: true
        description: "Human review and remedy process"
        
      - type: data_quality_documentation
        required: true

  # Questions for Classification Wizard
  classificationQuestions:
    - id: affects_safety
      question: "Does this AI's output serve as a principal basis for decisions affecting human safety?"
      hint: "Consider impacts on life, health, physical safety, critical infrastructure"
      type: boolean
      weight: 10
      maps_to: safety-impacting
      
    - id: affects_rights
      question: "Does this AI's output serve as a principal basis for decisions affecting individual rights?"
      hint: "Consider employment, education, credit, housing, benefits, law enforcement"
      type: boolean
      weight: 10
      maps_to: rights-impacting
      
    - id: domain
      question: "What domain does this AI operate in?"
      type: select
      options:
        - value: employment
          label: "Employment (hiring, performance, termination)"
          elevates_to: rights-impacting
        - value: education
          label: "Education (admissions, grading, assessment)"
          elevates_to: rights-impacting
        - value: credit
          label: "Credit/Finance (lending, insurance, scoring)"
          elevates_to: rights-impacting
        - value: healthcare
          label: "Healthcare (diagnosis, treatment, triage)"
          elevates_to: safety-impacting
        - value: critical_infrastructure
          label: "Critical Infrastructure"
          elevates_to: safety-impacting
        - value: law_enforcement
          label: "Law Enforcement"
          elevates_to: [rights-impacting, safety-impacting]
        - value: general
          label: "General/Internal Use"
          
    - id: autonomy_level
      question: "What level of autonomy does this AI have?"
      type: select
      options:
        - value: informational
          label: "Informational only (no decisions)"
        - value: advisory
          label: "Advisory (recommends, human decides)"
        - value: assisted
          label: "Assisted (acts with human approval)"
        - value: autonomous
          label: "Autonomous (acts without human approval)"
          elevates_by: 5

  # Compliance Controls
  controls:
    - id: omb-5c-i
      name: "AI Impact Assessment"
      description: "Complete assessment before deploying safety/rights-impacting AI"
      reference: "M-24-10 Section 5(c)(i)"
      applies_to: [safety-impacting, rights-impacting]
      verification:
        type: artifact_exists
        artifact: ai_impact_assessment
        
    - id: omb-5c-ii
      name: "Real-World Testing"
      description: "Test AI in conditions that match intended use environment"
      reference: "M-24-10 Section 5(c)(ii)"
      applies_to: [safety-impacting, rights-impacting]
      verification:
        type: field_populated
        field: testing.realWorldValidation
        
    - id: omb-5c-iii
      name: "Independent Evaluation"
      description: "Obtain independent evaluation of AI performance"
      reference: "M-24-10 Section 5(c)(iii)"
      applies_to: [safety-impacting, rights-impacting]
      verification:
        type: artifact_exists
        artifact: independent_evaluation
        
    - id: omb-5c-iv
      name: "Ongoing Monitoring"
      description: "Monitor AI performance and risks continuously"
      reference: "M-24-10 Section 5(c)(iv)"
      applies_to: [safety-impacting, rights-impacting]
      verification:
        type: field_populated
        field: governance.monitoringPlan
        
    - id: omb-5c-v-a
      name: "Human Consideration"
      description: "Ensure human consideration before relying on AI for adverse decisions"
      reference: "M-24-10 Section 5(c)(v)(A)"
      applies_to: [rights-impacting]
      verification:
        type: field_value
        field: governance.humanOversight
        expected: true
        
    - id: omb-5c-v-d
      name: "Adverse Decision Notice"
      description: "Notify affected individuals of AI's role in adverse decisions"
      reference: "M-24-10 Section 5(c)(v)(D)"
      applies_to: [rights-impacting]
      verification:
        type: artifact_exists
        artifact: notice_and_explanation

  # Export Mappings to Other Standards
  crosswalk:
    nist-ai-rmf:
      safety-impacting: "High"
      rights-impacting: "High"
      general: "Context-dependent"
      
    iso-42001:
      safety-impacting: "Requires certification consideration"
      rights-impacting: "Requires certification consideration"
      
    eu-ai-act:
      safety-impacting: "high"
      rights-impacting: "high"
      general: "minimal or limited"

  # Report Templates
  reports:
    - id: ai-inventory
      name: "Federal AI Use Case Inventory"
      description: "Annual inventory required by EO 13960 and M-24-10"
      template: templates/omb-inventory.json
      format: json
      
    - id: caio-certification
      name: "CAIO Annual Certification"
      description: "Chief AI Officer certification of compliance"
      template: templates/omb-caio-cert.md
      format: markdown
```

## 2.3 Profile Composition (Stacking)

Users can stack multiple profiles to create comprehensive compliance:

```yaml
# .aigrc/config.yaml
compliance:
  profiles:
    # Regulations (mandatory for user's jurisdiction)
    - us-omb-m24          # US Federal agencies
    - colorado-ai-act     # Colorado-specific
    
    # Standards (voluntary or customer-required)
    - nist-ai-rmf         # Risk management framework
    - iso-42001           # Certification prep
    - cyclonedx-ml-bom    # Supply chain
    
    # Internal (company-specific)
    - internal/acme-corp-policy
    
  # Profile resolution strategy
  resolution:
    conflictStrategy: strictest  # Take most restrictive requirement
    
  # Jurisdictional applicability
  applicability:
    primaryJurisdiction: US
    operatingRegions: [US, EU, UK]
    customerRequirements:
      - nist-ai-rmf  # Customer requires NIST compliance
```

## 2.4 Extended Asset Card Schema

The base Asset Card schema extends to accommodate multi-jurisdiction requirements:

```typescript
interface AIAssetCard {
  // ... existing fields ...
  
  // NEW: Multi-jurisdiction compliance
  compliance: {
    // Active profiles for this asset
    activeProfiles: string[];  // ["us-omb-m24", "nist-ai-rmf", "iso-42001"]
    
    // Risk classifications per jurisdiction
    classifications: {
      [profileId: string]: {
        level: string;          // e.g., "safety-impacting", "high", "limited"
        reasons: string[];
        classifiedAt: string;
        classifiedBy: string;
        nextReview: string;
      };
    };
    
    // Control status per profile
    controlStatus: {
      [profileId: string]: {
        [controlId: string]: {
          status: 'compliant' | 'non-compliant' | 'not-applicable' | 'pending';
          evidence?: string;    // Path to evidence artifact
          notes?: string;
          verifiedAt?: string;
          verifiedBy?: string;
        };
      };
    };
    
    // Cross-mapped classifications
    crosswalk: {
      euAiAct?: 'prohibited' | 'high' | 'limited' | 'minimal';
      ombM24?: 'safety-impacting' | 'rights-impacting' | 'general';
      nistRmf?: 'high' | 'medium' | 'low';
      iso42001?: 'certification-required' | 'recommended' | 'optional';
    };
    
    // Jurisdictional applicability
    applicability: {
      primaryJurisdiction: string;
      operatingRegions: string[];
      dataResidency: string[];
      userLocations: string[];
    };
  };
  
  // NEW: Extended risk factors for different frameworks
  riskFactors: {
    // Common factors (existing)
    autonomousDecisions: boolean;
    customerFacing: boolean;
    toolExecution: boolean;
    externalDataAccess: boolean;
    piiProcessing: 'yes' | 'no' | 'unknown';
    highStakesDecisions: boolean;
    
    // OMB M-24 specific
    affectsSafety: boolean;
    affectsRights: boolean;
    principalBasisForDecision: boolean;
    
    // NIST AI RMF specific
    trustworthinessCharacteristics: {
      valid: boolean;
      reliable: boolean;
      safe: boolean;
      secure: boolean;
      accountable: boolean;
      transparent: boolean;
      explainable: boolean;
      privacyEnhanced: boolean;
      fair: boolean;
    };
    
    // ISO 42001 specific
    aimsApplicable: boolean;  // AI Management System
    
    // Supply chain (CycloneDX)
    supplyChainRisks: {
      thirdPartyModels: boolean;
      externalTrainingData: boolean;
      cloudDeployment: boolean;
    };
  };
}
```

---

# Part III: Implementation Strategy

## 3.1 Package Structure

```
@aigrc/core
├── src/
│   ├── compliance/
│   │   ├── profile-loader.ts       # Loads and validates profiles
│   │   ├── profile-compiler.ts     # Compiles multiple profiles
│   │   ├── control-evaluator.ts    # Evaluates control compliance
│   │   ├── crosswalk-mapper.ts     # Maps between frameworks
│   │   └── schemas/
│   │       └── profile.schema.json # JSON Schema for profiles
│   │
│   ├── classification/
│   │   ├── classifier.ts           # Risk classification engine
│   │   ├── wizard.ts               # Classification wizard
│   │   └── rules/
│   │       ├── eu-ai-act.ts
│   │       ├── omb-m24.ts
│   │       ├── nist-rmf.ts
│   │       └── index.ts
│   │
│   ├── artifacts/
│   │   ├── generator.ts            # Artifact generation
│   │   └── templates/
│   │       ├── eu-ai-act/
│   │       ├── omb-m24/
│   │       ├── nist-rmf/
│   │       ├── iso-42001/
│   │       └── cyclonedx/
│   │
│   └── reports/
│       ├── compliance-report.ts
│       ├── gap-analysis.ts
│       └── crosswalk-report.ts

@aigrc/profiles                     # Separate package for profiles
├── regulations/
│   ├── eu-ai-act.yaml
│   ├── us-omb-m24.yaml
│   ├── us-colorado-ai-act.yaml
│   ├── us-nyc-ll144.yaml
│   ├── uk-ai-safety.yaml
│   ├── canada-aida.yaml
│   └── china-aigc.yaml
├── standards/
│   ├── nist-ai-rmf.yaml
│   ├── iso-42001.yaml
│   ├── iso-23894.yaml
│   ├── cyclonedx-ml-bom.yaml
│   ├── ieee-7000.yaml
│   └── model-cards.yaml
└── templates/
    ├── omb-impact-assessment.md
    ├── eu-technical-documentation.md
    ├── nist-risk-profile.json
    └── cyclonedx-ml-bom.json
```

## 3.2 CLI Extensions

```bash
# List available compliance profiles
aigrc compliance list
# Output:
# Regulations:
#   eu-ai-act          EU AI Act (Aug 2024)
#   us-omb-m24         US OMB M-24-10/M-24-18 (Mar 2024)
#   us-colorado        Colorado AI Act (Feb 2026)
#   ...
# Standards:
#   nist-ai-rmf        NIST AI Risk Management Framework
#   iso-42001          ISO/IEC 42001 AI Management System
#   ...

# Add profile to project
aigrc compliance add us-omb-m24
aigrc compliance add nist-ai-rmf

# Show active profiles
aigrc compliance status

# Classify asset against all active profiles
aigrc classify --asset customer-agent
# Output:
# Classification Results:
# ┌──────────────────┬───────────────────┬──────────────────────────────────┐
# │ Profile          │ Classification    │ Reasons                          │
# ├──────────────────┼───────────────────┼──────────────────────────────────┤
# │ us-omb-m24       │ rights-impacting  │ Affects employment decisions     │
# │ eu-ai-act        │ high              │ HR domain, autonomous decisions  │
# │ nist-ai-rmf      │ high              │ Elevated risk profile            │
# │ iso-42001        │ cert-recommended  │ Customer-facing, high autonomy   │
# └──────────────────┴───────────────────┴──────────────────────────────────┘

# Check compliance against profiles
aigrc check --profile us-omb-m24
# Output:
# Compliance Check: us-omb-m24
# ┌──────────────┬─────────────┬───────────────────────────────────────────┐
# │ Control      │ Status      │ Details                                   │
# ├──────────────┼─────────────┼───────────────────────────────────────────┤
# │ omb-5c-i     │ ✗ Missing   │ AI Impact Assessment not found            │
# │ omb-5c-ii    │ ✓ Compliant │ Real-world testing documented             │
# │ omb-5c-iii   │ ⏳ Pending  │ Independent evaluation scheduled          │
# │ omb-5c-v-d   │ ✗ Missing   │ Adverse decision notice not configured    │
# └──────────────┴─────────────┴───────────────────────────────────────────┘
# 
# Compliance: 1/4 controls (25%)
# Required Actions:
#   1. Create AI Impact Assessment (template: aigrc generate omb-impact-assessment)
#   2. Configure adverse decision notice in asset card

# Generate required artifacts
aigrc generate omb-impact-assessment --asset customer-agent
aigrc generate nist-risk-profile --asset customer-agent
aigrc generate cyclonedx-ml-bom --asset customer-agent

# Generate gap analysis report
aigrc report gap-analysis --output gap-report.pdf

# Generate cross-framework mapping
aigrc report crosswalk --profiles eu-ai-act,us-omb-m24,nist-ai-rmf
```

## 3.3 VS Code Extension Updates

```typescript
// New commands in VS Code extension
interface ComplianceCommands {
  // Profile management
  'aigrc.compliance.selectProfiles': () => Promise<void>;
  'aigrc.compliance.showStatus': () => Promise<void>;
  
  // Classification
  'aigrc.classify.multiJurisdiction': (assetId: string) => Promise<ClassificationResult[]>;
  
  // Control tracking
  'aigrc.controls.showDashboard': () => Promise<void>;
  'aigrc.controls.markComplete': (controlId: string, evidence?: string) => Promise<void>;
  
  // Artifact generation
  'aigrc.generate.artifact': (templateId: string) => Promise<void>;
  
  // Reports
  'aigrc.report.gapAnalysis': () => Promise<void>;
  'aigrc.report.crosswalk': () => Promise<void>;
}

// New views in VS Code sidebar
// - Compliance Profiles (tree view of active profiles)
// - Control Status (checklist of controls with status)
// - Required Artifacts (list with generation buttons)
// - Cross-Framework Mapping (visualization of how classifications map)
```

## 3.4 GitHub Action Updates

```yaml
# .github/workflows/aigrc.yml
name: AIGRC Compliance Check

on: [push, pull_request]

jobs:
  compliance:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: AIGRC Compliance Check
        uses: aigrc/action@v1
        with:
          # Specify compliance profiles to check against
          profiles: |
            us-omb-m24
            nist-ai-rmf
            iso-42001
            
          # Fail conditions
          fail-on-missing-artifacts: true
          fail-on-unclassified: true
          fail-on-non-compliant-controls: true
          
          # Control compliance threshold
          min-compliance-percentage: 80
          
          # Generate reports
          generate-reports: true
          report-formats: json,markdown
          
      - name: Upload Compliance Report
        uses: actions/upload-artifact@v4
        with:
          name: compliance-report
          path: .aigrc/reports/
```

---

# Part IV: Standards Crosswalk

## 4.1 Risk Level Mapping Matrix

```
┌─────────────────┬──────────────┬──────────────┬──────────────┬──────────────┐
│ Risk Factors    │ EU AI Act    │ OMB M-24     │ NIST RMF     │ ISO 42001    │
├─────────────────┼──────────────┼──────────────┼──────────────┼──────────────┤
│ HR/Employment   │ HIGH         │ RIGHTS       │ HIGH         │ CERT-REQ     │
│ Credit/Finance  │ HIGH         │ RIGHTS       │ HIGH         │ CERT-REQ     │
│ Healthcare      │ HIGH         │ SAFETY       │ HIGH         │ CERT-REQ     │
│ Critical Infra  │ HIGH         │ SAFETY       │ HIGH         │ CERT-REQ     │
│ Law Enforcement │ HIGH         │ BOTH         │ HIGH         │ CERT-REQ     │
│ Biometric ID    │ HIGH/PROHIB  │ RIGHTS       │ HIGH         │ CERT-REQ     │
│ Customer-facing │ LIMITED      │ Context      │ MEDIUM       │ RECOMMENDED  │
│ Internal tools  │ MINIMAL      │ GENERAL      │ LOW          │ OPTIONAL     │
│ Autonomous      │ +1 level     │ +SAFETY/RIGHTS│ +1 level    │ +review      │
│ PII Processing  │ +1 level     │ +RIGHTS      │ +1 level     │ +controls    │
└─────────────────┴──────────────┴──────────────┴──────────────┴──────────────┘
```

## 4.2 CycloneDX AI/ML BOM Integration

```json
{
  "$schema": "http://cyclonedx.org/schema/bom-1.5.schema.json",
  "bomFormat": "CycloneDX",
  "specVersion": "1.5",
  "version": 1,
  "metadata": {
    "component": {
      "type": "machine-learning-model",
      "name": "customer-support-agent",
      "version": "1.0.0",
      "bom-ref": "aigrc-2025-a3f7b2c1"
    }
  },
  "components": [
    {
      "type": "machine-learning-model",
      "name": "gpt-4-turbo",
      "version": "2024-01-01",
      "supplier": {
        "name": "OpenAI"
      },
      "modelCard": {
        "modelParameters": {
          "approach": {
            "type": "supervised"
          }
        },
        "considerations": {
          "users": ["internal-support-team"],
          "useCases": ["customer-inquiry-classification"]
        }
      }
    },
    {
      "type": "framework",
      "name": "langchain",
      "version": "0.1.0"
    }
  ],
  "dependencies": [
    {
      "ref": "aigrc-2025-a3f7b2c1",
      "dependsOn": ["gpt-4-turbo", "langchain"]
    }
  ],
  "properties": [
    {
      "name": "aigrc:classification:eu-ai-act",
      "value": "high"
    },
    {
      "name": "aigrc:classification:omb-m24",
      "value": "rights-impacting"
    },
    {
      "name": "aigrc:golden-thread:ticket",
      "value": "PROJ-1234"
    }
  ]
}
```

## 4.3 NIST AI RMF Profile Export

```json
{
  "profile": {
    "id": "aigrc-2025-a3f7b2c1-nist-profile",
    "assetId": "aigrc-2025-a3f7b2c1",
    "assetName": "customer-support-agent",
    "generatedAt": "2025-12-25T00:00:00Z",
    "framework": "NIST AI RMF 1.0"
  },
  "govern": {
    "policies": {
      "hasAIPolicy": true,
      "policyReference": "PROJ-1234"
    },
    "accountability": {
      "owner": "john.smith@company.com",
      "team": "Platform Engineering"
    },
    "riskTolerance": "medium"
  },
  "map": {
    "context": {
      "intendedPurpose": "Customer support automation",
      "stakeholders": ["customers", "support-team", "compliance"],
      "operatingEnvironment": "production-cloud"
    },
    "riskProfile": "HIGH",
    "riskFactors": [
      "customer-facing",
      "autonomous-decisions",
      "pii-processing"
    ]
  },
  "measure": {
    "trustworthiness": {
      "valid": {"assessed": true, "score": 0.85},
      "reliable": {"assessed": true, "score": 0.90},
      "safe": {"assessed": true, "score": 0.80},
      "secure": {"assessed": true, "score": 0.88},
      "accountable": {"assessed": true, "score": 0.95},
      "transparent": {"assessed": true, "score": 0.75},
      "explainable": {"assessed": true, "score": 0.70},
      "privacyEnhanced": {"assessed": true, "score": 0.82},
      "fair": {"assessed": true, "score": 0.78}
    },
    "metrics": {
      "accuracy": 0.92,
      "latencyP99": "150ms"
    }
  },
  "manage": {
    "controls": [
      {
        "id": "human-oversight",
        "status": "implemented",
        "evidence": ".aigrc/artifacts/human-oversight-plan.md"
      },
      {
        "id": "monitoring",
        "status": "implemented",
        "evidence": "datadog-dashboard-url"
      }
    ],
    "incidents": [],
    "nextReview": "2026-06-25"
  }
}
```

---

# Part V: Implementation Roadmap

## Phase 1: Foundation (Q1 2026)

| Week | Deliverable |
|------|-------------|
| 1-2 | Design profile schema (JSON Schema + TypeScript types) |
| 3-4 | Implement profile loader and validator |
| 5-6 | Create EU AI Act profile (refactor existing logic) |
| 7-8 | Create OMB M-24-10/M-24-18 profile |
| 9-10 | Implement profile stacking and conflict resolution |
| 11-12 | Update CLI with `compliance` subcommands |

**Milestone:** Two regulatory profiles (EU + US Federal) working with stacking

## Phase 2: Standards Integration (Q2 2026)

| Week | Deliverable |
|------|-------------|
| 1-2 | Create NIST AI RMF profile |
| 3-4 | Create ISO 42001 profile |
| 5-6 | Implement CycloneDX ML-BOM export |
| 7-8 | Build crosswalk mapping engine |
| 9-10 | Update VS Code extension with compliance views |
| 11-12 | Update GitHub Action with profile support |

**Milestone:** Four frameworks (EU, US, NIST, ISO) + CycloneDX export

## Phase 3: Expansion (Q3 2026)

| Week | Deliverable |
|------|-------------|
| 1-4 | Add state-level profiles (Colorado, NYC, California) |
| 5-8 | Add international profiles (UK, Canada, Singapore) |
| 9-10 | Build profile contribution guide for community |
| 11-12 | Create profile validation/testing framework |

**Milestone:** 10+ jurisdictions, community contribution pathway

## Phase 4: Enterprise (Q4 2026)

| Week | Deliverable |
|------|-------------|
| 1-4 | Custom internal profile support |
| 5-8 | Compliance dashboard in AIGOS |
| 9-10 | Audit package generation (multi-framework) |
| 11-12 | Certification preparation reports |

**Milestone:** Enterprise-ready multi-jurisdiction compliance platform

---

# Part VI: Community Contribution Model

## 6.1 Profile Contribution Process

```
1. Fork @aigrc/profiles repository
2. Create profile in YAML following schema
3. Add required documentation:
   - Regulatory/standard source references
   - Effective dates and jurisdictional scope
   - Classification criteria with citations
   - Control mappings with references
4. Add test cases for classification logic
5. Submit PR with completed checklist
6. Review by maintainers + legal advisory
7. Merge and publish to profile registry
```

## 6.2 Profile Quality Criteria

- [ ] Valid against JSON Schema
- [ ] All controls reference source documents
- [ ] Classification questions have clear mapping
- [ ] Artifact templates are complete
- [ ] Cross-framework mappings are accurate
- [ ] At least 5 test cases for classification
- [ ] Documentation includes effective dates
- [ ] Legal review for regulated frameworks

---

# Conclusion

The multi-jurisdiction compliance framework transforms AIGRC from an EU-focused tool into a universal AI governance standard. By separating core governance logic from jurisdiction-specific rules through declarative compliance profiles, AIGRC can:

1. **Adapt to any regulatory environment** — New regulations are added as profiles, not code changes
2. **Support multiple frameworks simultaneously** — Stack EU, US, NIST, ISO requirements for comprehensive compliance
3. **Enable community contribution** — Experts in each jurisdiction can contribute profiles
4. **Provide unified reporting** — Single dashboard showing compliance across all applicable frameworks
5. **Future-proof the architecture** — New regulations don't require architectural changes

The key insight: **Governance logic is universal; compliance requirements are jurisdiction-specific.** By embracing this separation, AIGRC becomes the foundational layer for AI governance worldwide.

---

*AIGRC Multi-Jurisdiction Compliance Framework v1.0 | December 2025*
