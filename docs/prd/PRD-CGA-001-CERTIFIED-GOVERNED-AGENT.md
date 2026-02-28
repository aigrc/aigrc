# PRD-CGA-001: Certified Governed Agent Framework

> **Status:** DRAFT
> **Version:** 1.0.0
> **Created:** January 9, 2026
> **Product Owner:** TBD
> **Technical Spec:** SPEC-CGA-001

---

## 1. Executive Summary

### Problem Statement

Organizations deploying AI agents face a critical trust gap:

1. **No way to verify governance claims** - When Agent A claims "I have a kill switch," Agent B has no way to verify this is true
2. **B2B AI integration friction** - Partnerships require weeks of manual due diligence on each agent's governance posture
3. **Regulatory compliance burden** - Proving EU AI Act Article 14 (human oversight) compliance requires extensive documentation
4. **Shadow AI proliferation** - Ungoverned agents enter production without oversight

### Solution

The **Certified Governed Agent (CGA)** framework provides:
- Third-party verified attestation of governance controls
- Tiered certification levels (BRONZE → PLATINUM)
- Machine-readable certificates for A2A trust decisions
- Integration with existing AIGOS governance infrastructure

### Business Value

| Metric | Current State | With CGA |
|--------|--------------|----------|
| B2B AI integration time | 8-14 weeks | < 1 day |
| Governance verification | Manual, self-attested | Automated, third-party verified |
| Regulatory audit prep | Weeks of documentation | Certificate + audit trail |
| A2A trust decisions | None (trust everything) | Policy-based, per-interaction |

---

## 2. Target Users & Personas

### Primary Personas

| Persona | Role | Pain Point | CGA Solution |
|---------|------|------------|--------------|
| **Alex** | Platform Engineer | "I need to verify partner agents meet our governance standards before integration" | Trust policy with CGA level requirements |
| **Sarah** | Compliance Officer | "Proving our AI agents comply with EU AI Act takes weeks of documentation" | Certificate as compliance evidence |
| **Marcus** | Security Architect | "I can't trust self-attested governance claims from external agents" | Third-party verified attestations |
| **Priya** | DevOps Lead | "Our CI/CD needs to verify agent governance before deployment" | `aigrc certify` in pipeline |

### Secondary Personas

| Persona | Role | Need |
|---------|------|------|
| **Enterprise CA Admin** | PKI Administrator | Deploy private CA for air-gapped environments |
| **Auditor** | External Auditor | Verify certificate validity and audit trail |
| **Partner Developer** | External Developer | Obtain certification for B2B integration |

---

## 3. User Stories

### Epic: Self-Certification (BRONZE)

| ID | Story | Acceptance Criteria |
|----|-------|---------------------|
| CGA-101 | As a developer, I want to certify my agent locally so I can verify governance before deployment | `aigrc certify` runs verification and generates certificate |
| CGA-102 | As a developer, I want to see which checks pass/fail so I can fix issues | Detailed verification report with evidence |
| CGA-103 | As a CI pipeline, I want to fail builds if certification fails so ungoverned agents don't deploy | Exit code 1 on failure, SARIF output |

### Epic: Hosted CA (SILVER/GOLD)

| ID | Story | Acceptance Criteria |
|----|-------|---------------------|
| CGA-201 | As an organization, I want third-party verification so partners trust our agents | CA performs independent live tests |
| CGA-202 | As a security team, I want to check certificate revocation so we reject compromised agents | OCSP endpoint returns real-time status |
| CGA-203 | As an admin, I want auto-renewal so certificates don't expire unexpectedly | 14-day pre-expiry renewal trigger |

### Epic: A2A Integration

| ID | Story | Acceptance Criteria |
|----|-------|---------------------|
| CGA-301 | As an agent, I want to include CGA in my governance token so receivers can verify my certification | Token includes CGA claims |
| CGA-302 | As an agent, I want to require minimum CGA level for incoming requests so I only trust certified agents | Trust policy enforcement |
| CGA-303 | As a security team, I want different CGA requirements per action so sensitive operations require higher certification | Action-specific trust policies |

### Epic: Enterprise CA

| ID | Story | Acceptance Criteria |
|----|-------|---------------------|
| CGA-401 | As an enterprise, I want to run my own CA so certificates never leave my network | Helm chart deploys functional CA |
| CGA-402 | As an enterprise, I want cross-signing with public CA so external partners trust our certificates | Cross-sign workflow documented |

---

## 4. MVP Definition

### Phase 1: Foundation (MVP)

**Scope:** Local certification and self-service BRONZE

| Component | In MVP | Rationale |
|-----------|--------|-----------|
| Certificate schema (Zod) | ✓ | Foundation for everything |
| Verification engine | ✓ | Core value proposition |
| CLI `aigrc certify` | ✓ | Developer entry point |
| BRONZE self-certification | ✓ | Immediate value, no infra needed |
| Local certificate storage | ✓ | Works offline |
| Verification report | ✓ | Actionable feedback |

**Out of MVP:**
- Hosted CA infrastructure
- OCSP/CRL revocation
- A2A token integration
- Enterprise CA

### Phase 2: Hosted CA

**Scope:** Third-party certification (SILVER/GOLD)

| Component | Description |
|-----------|-------------|
| CA API | Submit, renew, revoke endpoints |
| Certificate registry | Public lookup and search |
| OCSP responder | Real-time revocation checks |
| Automated verification | CA-initiated live tests |
| SILVER certification | Automated verification |
| GOLD certification | + Compliance mapping |

### Phase 3: A2A Integration

**Scope:** Trust establishment between agents

| Component | Description |
|-----------|-------------|
| CGA-enhanced tokens | Embed CGA claims in governance tokens |
| Trust policy CGA rules | Require CGA level per action |
| SDK integration | TypeScript + Python verification |
| Revocation checking | OCSP/CRL in token verification |

### Phase 4: Enterprise & PLATINUM

**Scope:** Enterprise deployment and highest certification

| Component | Description |
|-----------|-------------|
| Enterprise CA Helm chart | On-premise deployment |
| Cross-signing | Federated trust |
| PLATINUM certification | Manual review process |
| Continuous monitoring | CA-initiated health checks |

---

## 5. Success Metrics

### Phase 1 (MVP)

| Metric | Target | Measurement |
|--------|--------|-------------|
| CLI adoption | 100+ `aigrc certify` runs/month | Telemetry |
| Certification success rate | > 80% on first attempt | CLI analytics |
| Time to first certificate | < 5 minutes | User testing |
| Documentation satisfaction | > 4/5 rating | Survey |

### Phase 2 (Hosted CA)

| Metric | Target | Measurement |
|--------|--------|-------------|
| SILVER+ certificates issued | 50 in first quarter | CA metrics |
| Certificate lookup latency | < 100ms p99 | APM |
| OCSP response time | < 50ms p99 | APM |
| Renewal success rate | > 99% | CA metrics |

### Phase 3 (A2A Integration)

| Metric | Target | Measurement |
|--------|--------|-------------|
| A2A interactions using CGA | 1000+/month | Token analytics |
| Trust policy adoption | 20+ organizations | Registry |
| False rejection rate | < 0.1% | Support tickets |

### Long-term

| Metric | Target | Measurement |
|--------|--------|-------------|
| B2B integration time reduction | 90% (14 weeks → 1 day) | Customer interviews |
| Audit prep time reduction | 75% | Customer interviews |
| Enterprise CA deployments | 10+ | Sales data |

---

## 6. Competitive Positioning

### Market Position

```
                    IDENTITY ONLY              GOVERNANCE + IDENTITY
                         │                              │
    Traditional PKI ─────┼──────────────────────────────┤
    (DigiCert, SSL.com)  │                              │
                         │                              │
    Emerging AI Trust ───┼────────────────────┐         │
    (DigiCert 2026)      │                    │         │
                         │                    │         │
    AI Governance ───────┼────────────────────┼─────────┼───── AIGOS CGA
    Native               │                    │         │
                         │                    │         │
                         │              Model signing   │
                         │              Agent identity  │
                         │                              │
                         │                    Kill switch verification
                         │                    Policy engine attestation
                         │                    Capability bounds
                         │                    Compliance mapping
                         │                    Operational health
```

### Differentiation

| Capability | DigiCert (2026) | AIGOS CGA |
|------------|-----------------|-----------|
| Agent identity | ✓ | ✓ |
| Model signing | ✓ | Via Golden Thread |
| Kill switch verification | - | ✓ (live test) |
| Policy engine attestation | - | ✓ |
| Capability bounds | - | ✓ |
| A2A trust policies | - | ✓ |
| Operational health | - | ✓ |
| AI-specific compliance | Emerging | ✓ (EU AI Act, NIST) |

---

## 7. Pricing Strategy

### Hosted CA (cga.aigos.io)

| Tier | Certificates | Levels | Price | Target |
|------|--------------|--------|-------|--------|
| **Free** | 5 | BRONZE only | $0/mo | Developers, evaluation |
| **Starter** | 25 | BRONZE, SILVER | $99/mo | Small teams |
| **Professional** | 100 | All levels | $499/mo | Mid-market |
| **Enterprise** | Unlimited | All + SLA | Custom | Enterprise |

### Enterprise CA License

| Model | Description | Price |
|-------|-------------|-------|
| **Annual License** | On-premise CA deployment | $25,000/year |
| **Cross-signing** | Federation with public CA | $5,000/year add-on |
| **Support** | 24/7 SLA | $10,000/year add-on |

---

## 8. Go-to-Market Strategy

### Phase 1 Launch (MVP)

| Channel | Activity |
|---------|----------|
| Documentation | CGA getting started guide, CLI reference |
| Blog | "Introducing Certified Governed Agents" |
| Community | Discord/Slack announcement |
| Existing users | Email to AIGRC users |

### Phase 2 Launch (Hosted CA)

| Channel | Activity |
|---------|----------|
| Website | cga.aigos.io landing page |
| Webinar | "Trust at AI Speed: CGA Deep Dive" |
| Partners | Integration with existing B2B partnerships |
| Press | Press release on third-party AI certification |

### Phase 3+ Launch

| Channel | Activity |
|---------|----------|
| Enterprise sales | Direct outreach to regulated industries |
| Analyst briefings | Gartner, Forrester coverage |
| Conference | AIGOS Summit presentation |
| Certification program | "CGA Certified Organization" badge |

---

## 9. Dependencies

### Technical Dependencies

| Dependency | Status | Blocker? |
|------------|--------|----------|
| @aigrc/core package | Released | No |
| Asset card schema | Released | No |
| Golden Thread | Released | No |
| Governance tokens | Released | No |
| Kill switch runtime | In development | Phase 1 only needs schema |
| Policy engine runtime | In development | Phase 1 only needs schema |

### External Dependencies

| Dependency | Description | Mitigation |
|------------|-------------|------------|
| HSM provider | For hosted CA key storage | AWS CloudHSM, Azure Key Vault |
| Domain | cga.aigos.io | Reserve now |
| SSL certificate | For CA endpoints | DigiCert/Let's Encrypt |

---

## 10. Risks & Mitigations

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Low adoption of BRONZE | Medium | High | Strong CLI UX, CI/CD integration |
| Hosted CA reliability | Low | Critical | Multi-region, 99.9% SLA design |
| DigiCert competition | Medium | Medium | Focus on governance (not just identity) |
| Regulatory changes | Low | Medium | Modular compliance framework |
| Key compromise | Very Low | Critical | HSM, key ceremony, revocation |

---

## 11. Open Questions

| Question | Owner | Due Date |
|----------|-------|----------|
| Should BRONZE certificates be publicly discoverable? | Product | TBD |
| What's the minimum viable PLATINUM process? | Product + Legal | TBD |
| Partnership with existing CA (DigiCert/SSL.com)? | Business Dev | TBD |
| WebTrust audit for hosted CA? | Compliance | TBD |

---

## Appendix A: Related Documents

- **Technical Spec:** SPEC-CGA-001-CERTIFIED-GOVERNED-AGENT.md
- **A2A Spec:** SPEC-RT-002 (Governance Tokens)
- **Training:** Level 5.4 Agent-to-Agent Trust

---

*Document Version: 1.0.0*
*Last Updated: January 9, 2026*
