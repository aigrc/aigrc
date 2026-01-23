# Track 4.3: CISO & Security Leader Specialization

> **Duration:** 2-2.5 hours
> **Prerequisites:** Level 1, Level 3.2 (Multi-Jurisdiction)
> **Target Audience:** CISOs, Security Directors, Risk Officers, Security Architects

---

## Learning Objectives

By the end of this track, you will be able to:
1. Assess and manage AI-specific security risks
2. Establish AI governance policies aligned with enterprise security
3. Integrate AIGRC into security operations and incident response
4. Conduct AI security audits and compliance assessments
5. Build AI security awareness programs for the organization

---

## Module 1: AI Security Risk Landscape (30 min)

### The CISO's AI Challenge

```
┌─────────────────────────────────────────────────────────────────┐
│                    AI SECURITY RISK MATRIX                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│                        IMPACT                                   │
│                  Low      Med      High                         │
│              ┌────────┬────────┬────────┐                       │
│         High │  Med   │  High  │ CRIT   │ ← Shadow AI           │
│   LIKELIHOOD ├────────┼────────┼────────┤   Data leakage        │
│         Med  │  Low   │  Med   │  High  │ ← Prompt injection    │
│              ├────────┼────────┼────────┤   Model poisoning     │
│         Low  │  Info  │  Low   │  Med   │ ← Regulatory fine     │
│              └────────┴────────┴────────┘   Reputation damage   │
│                                                                 │
│  Without governance: Most risks in HIGH/CRITICAL zone           │
│  With AIGRC: Risks systematically mitigated                     │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### AI-Specific Threat Categories

| Threat Category | Description | AIGRC Mitigation |
|-----------------|-------------|------------------|
| **Shadow AI** | Unauthorized AI usage | Detection engine finds all AI |
| **Data Leakage** | Sensitive data to AI vendors | Policy constraints on vendors |
| **Prompt Injection** | Malicious prompt attacks | Runtime guardrails |
| **Model Poisoning** | Compromised training data | Supply chain firewall |
| **Regulatory Non-Compliance** | Fines and penalties | Multi-jurisdiction profiles |
| **Explainability Gaps** | Cannot explain AI decisions | Documentation requirements |

### Shadow AI: The Hidden Risk

**Discovery Statistics (typical enterprise):**
```
Before AIGRC Scan:
  Known AI systems: 5

After AIGRC Scan:
  Detected AI systems: 47

  Breakdown:
  - Production systems: 12
  - Development/staging: 18
  - Individual developer tools: 17

Shadow AI rate: 89% UNKNOWN
```

**`aigrc scan` reveals:**
- Which teams use AI
- What vendors are called
- Where data flows
- What's undocumented

---

## Module 2: Policy Framework Design (30 min)

### Enterprise AI Security Policy Structure

```
┌─────────────────────────────────────────────────────────────────┐
│                 AI POLICY HIERARCHY                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ENTERPRISE POLICY (Board-approved)                             │
│  ─────────────────────────────────                              │
│  "All AI systems must be registered and risk-assessed"         │
│                     │                                           │
│                     ▼                                           │
│  SECURITY STANDARDS (CISO-owned)                                │
│  ─────────────────────────────                                  │
│  "High-risk AI requires security review"                        │
│  "Only approved vendors permitted"                              │
│                     │                                           │
│                     ▼                                           │
│  GOVERNANCE.LOCK (Technical enforcement)                        │
│  ───────────────────────────────────────                        │
│  constraints:                                                   │
│    allowed_vendors: [openai, anthropic]                         │
│    max_risk_level: high                                         │
│                     │                                           │
│                     ▼                                           │
│  ASSET CARDS (Individual systems)                               │
│  ─────────────────────────────────                              │
│  Per-system documentation                                       │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Sample governance.lock for Security

```yaml
# governance.lock - Security-focused configuration
version: "1.0"
generated_at: "2026-01-09T12:00:00Z"
policy_hash: "sha256:abc123..."

constraints:
  registry:
    # Approved vendors only
    allowed_vendors:
      - openai
      - anthropic
      - azure  # Azure OpenAI

    # Blocked for security reasons
    blocked_vendors:
      - unknown  # No anonymous APIs

    # Approved models
    allowed_models:
      - gpt-4
      - gpt-4-turbo
      - claude-3-opus
      - claude-3-sonnet

    # Blocked models
    blocked_models:
      - gpt-3.5-turbo  # Deprecated, security concerns

    # Geographic restrictions (data sovereignty)
    allowed_regions:
      - us
      - eu
    blocked_regions:
      - cn
      - ru

  runtime:
    # Data protection
    pii_filter: true

    # Content safety
    toxicity_filter: true

    # Data retention
    data_retention_days: 90

  build:
    # Mandatory documentation
    require_asset_card: true
    require_risk_classification: true
    require_golden_thread: true

    # Risk ceiling
    max_risk_level: high  # Block unacceptable risk

# Cryptographic signature
signatures:
  - signer: ciso@company.com
    algorithm: ES256
    signature: "..."
    timestamp: "2026-01-09T12:00:00Z"

# Force refresh
expires_at: "2026-04-09T12:00:00Z"
```

### Vendor Risk Assessment Matrix

| Vendor | SOC 2 | ISO 27001 | Data Location | Risk Rating |
|--------|-------|-----------|---------------|-------------|
| OpenAI | ✅ | ✅ | US (option for EU) | Medium |
| Anthropic | ✅ | ✅ | US | Medium |
| Azure OpenAI | ✅ | ✅ | Customer choice | Low |
| Google Vertex AI | ✅ | ✅ | Customer choice | Low |
| Hugging Face | ⚠️ | ❌ | Varies | High |
| Self-hosted | N/A | N/A | Customer control | Varies |

---

## Module 3: Security Operations Integration (30 min)

### SIEM Integration

**AIGRC → SIEM Data Flow:**
```
┌──────────┐    SARIF     ┌──────────┐    Alerts    ┌──────────┐
│  AIGRC   │ ──────────►  │   SIEM   │ ──────────►  │  SOC     │
│  CI/CD   │              │ (Splunk/ │              │  Team    │
│          │              │  Elastic)│              │          │
└──────────┘              └──────────┘              └──────────┘
     │                          │
     │  Violations              │  Correlation
     │  Detections              │  Prioritization
     │  Risk levels             │  Alerting
```

**Splunk Integration:**
```bash
# Export AIGRC results for SIEM ingestion
aigrc scan . --format json | \
  jq '.detections[] | {
    timestamp: .timestamp,
    asset_id: .asset_id,
    vendor: .vendor,
    risk_level: .risk_level,
    source_file: .location.file
  }' >> /var/log/aigrc/detections.json
```

**Alert Rules (example):**
```yaml
# Splunk alert: Unapproved AI vendor detected
search: index=aigrc violation_type="unapproved_vendor"
alert_condition: count > 0
severity: high
action: page_oncall_security
```

### Incident Response Integration

**AI Security Incident Playbook:**

```
┌─────────────────────────────────────────────────────────────────┐
│             AI SECURITY INCIDENT RESPONSE                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  DETECTION                                                      │
│  ─────────                                                      │
│  1. AIGRC CI/CD flags violation                                 │
│  2. SIEM correlates with other signals                          │
│  3. SOC creates incident ticket                                 │
│                                                                 │
│  CONTAINMENT                                                    │
│  ───────────                                                    │
│  1. Identify affected asset via asset card                      │
│  2. Contact owner (from asset card)                             │
│  3. Disable AI endpoint if needed                               │
│                                                                 │
│  INVESTIGATION                                                  │
│  ─────────────                                                  │
│  1. Review Golden Thread for changes                            │
│  2. Check git history for policy changes                        │
│  3. Analyze data exposure scope                                 │
│                                                                 │
│  RECOVERY                                                       │
│  ────────                                                       │
│  1. Fix violation (replace vendor, update config)               │
│  2. Update asset card                                           │
│  3. Verify with `aigrc validate`                                │
│                                                                 │
│  LESSONS LEARNED                                                │
│  ───────────────                                                │
│  1. Update policies if needed                                   │
│  2. Add to training materials                                   │
│  3. Improve detection rules                                     │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Vulnerability Management

**AI-Specific Vulnerability Categories:**

| Category | Example | Detection | Response |
|----------|---------|-----------|----------|
| Vendor CVE | OpenAI SDK vulnerability | Dependabot + AIGRC | Patch immediately |
| Model Deprecation | GPT-3.5 end-of-life | governance.lock update | Migrate to approved model |
| Data Exposure | PII sent to AI | Runtime logging | Incident response |
| Policy Drift | New AI without registration | AIGRC scan | Register and assess |

---

## Module 4: Audit and Compliance (30 min)

### Audit Preparation Checklist

```markdown
## AI Governance Audit Preparation

### Documentation
- [ ] All AI systems have asset cards
- [ ] Risk classifications documented with rationale
- [ ] Ownership assigned and current
- [ ] Data processing documented

### Technical Controls
- [ ] governance.lock in place and signed
- [ ] CI/CD enforcement active
- [ ] SARIF reports archived
- [ ] Golden Thread integrity verified

### Policy
- [ ] Enterprise AI policy approved
- [ ] Security standards documented
- [ ] Exception process defined
- [ ] Training records available

### Evidence Collection
- [ ] Export all asset cards: `aigrc status --export audit-report.json`
- [ ] Export governance.lock: `cp governance.lock audit-evidence/`
- [ ] Export CI/CD logs: GitHub Actions artifacts
- [ ] Export SARIF history: GitHub Security tab
```

### Compliance Mapping Report

**Generate for Auditors:**
```bash
# Generate comprehensive compliance report
aigrc compliance report \
  --frameworks "eu-ai-act,nist-ai-rmf,iso-42001" \
  --format pdf \
  --output compliance-report-2026-Q1.pdf
```

**Report Contents:**
```
┌─────────────────────────────────────────────────────────────────┐
│               COMPLIANCE ASSESSMENT REPORT                      │
│               Q1 2026 - Acme Corporation                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  EXECUTIVE SUMMARY                                              │
│  Overall Compliance Score: 94%                                  │
│                                                                 │
│  BY FRAMEWORK:                                                  │
│  ┌──────────────────┬─────────┬─────────────────────────┐      │
│  │ Framework        │ Score   │ Status                  │      │
│  ├──────────────────┼─────────┼─────────────────────────┤      │
│  │ EU AI Act        │ 96%     │ ✅ Compliant            │      │
│  │ NIST AI RMF      │ 92%     │ ✅ Compliant            │      │
│  │ ISO 42001        │ 89%     │ ⚠️ Minor gaps          │      │
│  └──────────────────┴─────────┴─────────────────────────┘      │
│                                                                 │
│  ASSET INVENTORY                                                │
│  Total AI Systems: 12                                           │
│  - High Risk: 1 (8%)                                            │
│  - Limited Risk: 3 (25%)                                        │
│  - Minimal Risk: 8 (67%)                                        │
│                                                                 │
│  CONTROL EFFECTIVENESS                                          │
│  - Documentation: 100%                                          │
│  - Automated Enforcement: 100%                                  │
│  - Human Oversight: 92%                                         │
│  - Incident Response: 100%                                      │
│                                                                 │
│  RECOMMENDATIONS                                                │
│  1. Complete ISO 42001 gap remediation (training records)       │
│  2. Add human oversight to credit-scoring system                │
│  3. Update vendor risk assessment for new provider              │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Third-Party Risk Management

**Vendor Assessment with AIGRC:**

```yaml
# Vendor risk assessment checklist
vendor: openai
assessment_date: 2026-01-09

security_controls:
  - control: Data encryption in transit
    status: verified
    evidence: SOC 2 Type II report

  - control: Data encryption at rest
    status: verified
    evidence: SOC 2 Type II report

  - control: Access controls
    status: verified
    evidence: API key authentication

data_handling:
  retention_policy: "Data retained for 30 days"
  data_location: "US and EU"
  subprocessors: ["Azure", "Cloudflare"]

compliance_certifications:
  - SOC 2 Type II
  - ISO 27001
  - GDPR compliant

risk_rating: medium
review_frequency: annual
next_review: 2027-01-09
```

---

## Module 5: Security Awareness Program (15 min)

### Developer Security Training

**AI Security Training Curriculum:**

| Module | Duration | Topics |
|--------|----------|--------|
| AI Security 101 | 30 min | Threats, risks, OWASP Top 10 for LLMs |
| Secure AI Development | 45 min | Vendor abstraction, secrets management |
| AIGRC Essentials | 30 min | Asset cards, risk classification |
| Incident Response | 30 min | Reporting, containment, recovery |

### Security Champions Program

**AI Security Champion Responsibilities:**
- Review asset cards for security completeness
- Advocate for governance in team
- Escalate security concerns
- Participate in incident response

**Champion Toolkit:**
```bash
# Weekly security check
aigrc scan . --format sarif > security-scan.sarif
aigrc validate --strict
aigrc policy check
```

### Phishing/Social Engineering for AI

**New Attack Vectors:**
- "AI prompt injection" via user input
- Employees sharing secrets with AI chatbots
- Fake "AI model updates" delivering malware

**Detection:**
- Monitor for sensitive data in AI logs
- Review AI assistant usage patterns
- DLP integration with AI endpoints

---

## Module 6: Metrics and Reporting (15 min)

### CISO Dashboard Metrics

```
┌─────────────────────────────────────────────────────────────────┐
│                    AI SECURITY DASHBOARD                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  COVERAGE                          RISK POSTURE                 │
│  ────────                          ────────────                 │
│  Registered: 47/47 (100%)          Critical: 0                  │
│  Documented: 47/47 (100%)          High: 2                      │
│  Risk Assessed: 47/47 (100%)       Medium: 8                    │
│                                    Low: 37                      │
│                                                                 │
│  POLICY COMPLIANCE                 VENDOR DISTRIBUTION          │
│  ─────────────────                 ────────────────────         │
│  Violations (MTD): 3               OpenAI: 45%                  │
│  MTTR: 4.2 hours                   Anthropic: 30%               │
│  Exception Requests: 2             Azure: 20%                   │
│  Approved: 1, Denied: 1            Other: 5%                    │
│                                                                 │
│  TREND (Last 90 Days)                                           │
│  ────────────────────                                           │
│  New AI Systems: +12                                            │
│  Violations: ▼ 40%                                              │
│  Coverage: ▲ 15%                                                │
│  Mean Time to Register: 2.1 days                                │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Board Reporting Template

**Quarterly AI Security Report:**

```markdown
# AI Security Status - Q1 2026

## Risk Summary
- **Overall AI Risk Posture:** MANAGED
- **Regulatory Compliance:** COMPLIANT
- **Incidents:** 0 material incidents

## Key Metrics
| Metric | Target | Actual | Trend |
|--------|--------|--------|-------|
| AI Asset Coverage | 100% | 100% | ✅ |
| Policy Violations | < 5/month | 1 | ✅ |
| Vendor Risk Reviews | 100% | 100% | ✅ |
| Training Completion | 90% | 95% | ✅ |

## Investments
- AIGRC tooling: $XX,XXX (budgeted)
- Training program: $XX,XXX (budgeted)
- Audit preparation: $XX,XXX (budgeted)

## Recommendations
1. Approve ISO 42001 certification project
2. Expand AI security team by 1 FTE
3. Implement runtime guardrails for high-risk systems
```

---

## Practice Lab: Security Assessment

### Scenario

Conduct a security assessment of an AI implementation using AIGRC tools.

### Steps

1. **Discovery**
   ```bash
   aigrc scan . --format json > discovery.json
   ```

2. **Risk Assessment**
   - Review each detection
   - Assign risk classifications
   - Document in asset cards

3. **Policy Review**
   - Review governance.lock
   - Identify gaps
   - Propose updates

4. **Compliance Check**
   ```bash
   aigrc compliance check --framework eu-ai-act
   ```

5. **Report Generation**
   - Create executive summary
   - Document findings
   - Prioritize remediation

---

## Certification Checklist

To earn AIGRC Security Leader Certification:

- [ ] Complete Level 1, Level 3.2, Level 3.3
- [ ] Complete this CISO/Security Track
- [ ] Pass practical assessment:
  - [ ] Design enterprise AI security policy
  - [ ] Conduct AI security assessment
  - [ ] Create incident response playbook
  - [ ] Generate audit-ready compliance report
  - [ ] Present board-level security briefing

---

*Track 4.3 - AIGRC Training Program v1.0*
