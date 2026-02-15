# SPEC-CGA-001: Certified Governed Agent Framework

> **Status:** DRAFT
> **Version:** 1.0.0
> **Last Updated:** January 9, 2026
> **Authors:** AIGOS Team
> **Depends On:** SPEC-RT-001, SPEC-RT-002, SPEC-PRT-001, SPEC-PRT-002

---

## Executive Summary

The **Certified Governed Agent (CGA)** framework establishes a trust infrastructure for AI agents, transforming self-attested governance claims into third-party verified attestations. This specification defines the certificate schema, certification levels, verification processes, and integration with existing AIGOS components.

### Key Design Decision: Hybrid CA Architecture

The CA infrastructure follows a **hybrid model**:

| Component | Location | Rationale |
|-----------|----------|-----------|
| **Local Verification Engine** | Integrated with CLI/SDK | Fast validation, offline capability, no network dependency for verification |
| **Self-Certification (BRONZE)** | Integrated with CLI | Developer self-service, CI/CD integration, no external dependency |
| **Hosted CA Service** | Separate Platform | Third-party trust, certificate registry, revocation infrastructure |
| **Enterprise CA** | Customer-deployed | Data sovereignty, air-gapped environments, custom policies |

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        CGA ARCHITECTURE OVERVIEW                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    INTEGRATED COMPONENTS                             │   │
│  │                    (Ships with AIGRC tools)                          │   │
│  │                                                                      │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐              │   │
│  │  │  Verification │  │    Local     │  │  Certificate │              │   │
│  │  │    Engine     │  │ Self-Certify │  │    Cache     │              │   │
│  │  │              │  │   (BRONZE)   │  │              │              │   │
│  │  └──────────────┘  └──────────────┘  └──────────────┘              │   │
│  │                                                                      │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                    │                                        │
│                                    │ Optional Connection                    │
│                                    ▼                                        │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    HOSTED CA PLATFORM                                │   │
│  │                    (cga.aigos.io - Separate Service)                 │   │
│  │                                                                      │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐              │   │
│  │  │ Certificate  │  │  Revocation  │  │ Transparency │              │   │
│  │  │   Registry   │  │   Service    │  │     Log      │              │   │
│  │  └──────────────┘  └──────────────┘  └──────────────┘              │   │
│  │                                                                      │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐              │   │
│  │  │  Automated   │  │   Auditor    │  │   Billing    │              │   │
│  │  │  Verification│  │  Integration │  │   & Quotas   │              │   │
│  │  └──────────────┘  └──────────────┘  └──────────────┘              │   │
│  │                                                                      │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                    │                                        │
│                                    │ Enterprise Option                      │
│                                    ▼                                        │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    ENTERPRISE CA                                     │   │
│  │                    (Customer-deployed)                               │   │
│  │                                                                      │   │
│  │  • Air-gapped environments                                          │   │
│  │  • Custom certification policies                                    │   │
│  │  • Data sovereignty requirements                                    │   │
│  │  • Cross-signs with Hosted CA for external trust                    │   │
│  │                                                                      │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Table of Contents

1. [Terminology](#1-terminology)
2. [Certificate Schema](#2-certificate-schema)
3. [Certification Levels](#3-certification-levels)
4. [Verification Engine](#4-verification-engine)
5. [CA Infrastructure](#5-ca-infrastructure)
6. [Certification Process](#6-certification-process)
7. [A2A Integration](#7-a2a-integration)
8. [CLI Integration](#8-cli-integration)
9. [SDK Integration](#9-sdk-integration)
10. [Security Considerations](#10-security-considerations)
11. [Deployment Models](#11-deployment-models)

---

## 1. Terminology

| Term | Definition |
|------|------------|
| **CGA** | Certified Governed Agent - An agent with verified governance attestations |
| **CGA Certificate** | Cryptographically signed document attesting to an agent's governance posture |
| **CA** | Certification Authority - Entity that issues and manages CGA certificates |
| **Verification Engine** | Component that validates governance controls against certification requirements |
| **Attestation** | Verified claim about a specific governance control |
| **Trust Policy** | Configuration defining which CGA levels and CAs an agent trusts |
| **OCSP** | Online Certificate Status Protocol - Real-time revocation checking |
| **CRL** | Certificate Revocation List - Periodic list of revoked certificates |
| **Transparency Log** | Append-only log of all certificate operations for auditability |

---

## 2. Certificate Schema

### 2.1 CGA Certificate Structure

```yaml
# CGA Certificate v1.0
# File: *.cga.yaml or embedded in governance token
apiVersion: aigos.io/v1
kind: CGACertificate
metadata:
  # Unique certificate identifier
  id: "cga-20260109-acme-research-agent-v2"

  # Certificate versioning
  version: 1
  schema_version: "1.0.0"

spec:
  # ═══════════════════════════════════════════════════════════════════════
  # SECTION 1: AGENT IDENTITY
  # Binds certificate to specific agent instance
  # ═══════════════════════════════════════════════════════════════════════
  agent:
    # Canonical agent identifier (from asset card)
    id: "urn:aigos:agent:acme-corp:research-agent-v2"

    # Semantic version of the agent
    version: "2.1.0"

    # Organization that owns the agent
    organization:
      id: "urn:aigos:org:acme-corp"
      name: "Acme Corporation"
      domain: "acme-corp.com"

    # Golden Thread binding
    golden_thread:
      hash: "sha256:e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
      algorithm: "SHA-256"
      asset_card_version: "1.0.0"

    # Public key for token verification
    public_key:
      algorithm: "ES256"
      jwk:
        kty: "EC"
        crv: "P-256"
        x: "..."
        y: "..."
      key_id: "acme-research-agent-v2-2026-01"

  # ═══════════════════════════════════════════════════════════════════════
  # SECTION 2: CERTIFICATION METADATA
  # Information about the certification itself
  # ═══════════════════════════════════════════════════════════════════════
  certification:
    # Certification level achieved
    level: "GOLD"  # BRONZE | SILVER | GOLD | PLATINUM

    # Issuing CA
    issuer:
      id: "urn:aigos:ca:pangolabs"
      name: "AIGOS Public CA"
      url: "https://cga.aigos.io"

    # Validity period
    issued_at: "2026-01-09T10:00:00Z"
    expires_at: "2026-07-09T10:00:00Z"  # 6 months default

    # Renewal information
    renewal:
      url: "https://cga.aigos.io/renew/cga-20260109-acme-research-agent-v2"
      auto_renew: true
      grace_period_days: 14

    # Certificate chain for verification
    certificate_chain:
      - "https://cga.aigos.io/certs/intermediate-2026.pem"
      - "https://cga.aigos.io/certs/root.pem"

  # ═══════════════════════════════════════════════════════════════════════
  # SECTION 3: GOVERNANCE ATTESTATIONS
  # Verified governance controls
  # ═══════════════════════════════════════════════════════════════════════
  governance:
    # Kill Switch attestation
    kill_switch:
      status: "VERIFIED"  # VERIFIED | NOT_VERIFIED | NOT_APPLICABLE
      verified_at: "2026-01-08T15:30:00Z"

      # Measured SLA
      sla:
        target_ms: 60000
        measured_ms: 45230
        percentile: "p99"

      # Verified delivery channels
      channels:
        - type: "SSE"
          endpoint: "https://api.acme-corp.com/governance/kill-switch/stream"
          verified: true
        - type: "POLLING"
          endpoint: "https://api.acme-corp.com/governance/kill-switch/poll"
          interval_ms: 30000
          verified: true
        - type: "LOCAL_FILE"
          path: "/var/run/aigos/kill-switch"
          verified: true

      # Test results
      test_results:
        total_tests: 12
        passed: 12
        failed: 0
        last_test: "2026-01-08T15:30:00Z"

    # Policy Engine attestation
    policy_engine:
      status: "VERIFIED"
      verified_at: "2026-01-08T14:00:00Z"

      # Performance metrics
      latency:
        target_ms: 2
        measured_p50_ms: 0.8
        measured_p99_ms: 1.6

      # Policy configuration
      policy:
        version: "1.2.0"
        hash: "sha256:abc123..."
        rules_count: 47

      # Enforcement mode
      enforcement: "STRICT"  # STRICT | PERMISSIVE | AUDIT_ONLY

    # Golden Thread attestation
    golden_thread:
      status: "VERIFIED"
      verified_at: "2026-01-08T13:00:00Z"

      # Hash verification
      hash:
        algorithm: "SHA-256"
        value: "sha256:e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
        verified: true

      # Signature verification
      signature:
        algorithm: "ES256"
        verified: true
        signer: "urn:aigos:org:acme-corp"

    # Capability Bounds attestation
    capability_bounds:
      status: "VERIFIED"
      verified_at: "2026-01-08T12:00:00Z"

      # Decay configuration
      decay:
        mode: "EXPLICIT"  # EXPLICIT | PROPORTIONAL | NONE
        verified: true

      # Hierarchy limits
      hierarchy:
        max_generation_depth: 3
        verified: true

      # Declared capabilities
      capabilities:
        - "llm:query"
        - "web:search"
        - "file:read"
        max_budget_usd: 100.00

    # Telemetry attestation
    telemetry:
      status: "VERIFIED"
      verified_at: "2026-01-08T11:00:00Z"

      # Protocol verification
      protocol: "OTLP"
      endpoint: "https://telemetry.acme-corp.com/v1/traces"

      # Retention policy
      retention:
        traces_days: 90
        metrics_days: 365
        logs_days: 30

      # Required spans verified
      required_spans:
        - "aigos.governance.decision"
        - "aigos.governance.violation"
        - "aigos.kill_switch.check"

  # ═══════════════════════════════════════════════════════════════════════
  # SECTION 4: COMPLIANCE ATTESTATIONS
  # Regulatory framework mappings
  # ═══════════════════════════════════════════════════════════════════════
  compliance:
    frameworks:
      - framework: "EU_AI_ACT"
        status: "COMPLIANT"
        risk_category: "HIGH"
        articles_addressed:
          - article: 9
            title: "Risk Management System"
            evidence: "Asset card risk_factors section"
          - article: 10
            title: "Data and Data Governance"
            evidence: "Data lineage in golden_thread"
          - article: 11
            title: "Technical Documentation"
            evidence: "Asset card + compliance artifacts"
          - article: 12
            title: "Record-keeping"
            evidence: "Telemetry retention policy"
          - article: 13
            title: "Transparency"
            evidence: "Asset card transparency section"
          - article: 14
            title: "Human Oversight"
            evidence: "Kill switch SLA verification"
          - article: 15
            title: "Accuracy, Robustness, Cybersecurity"
            evidence: "Security posture verification"
        conformity_declaration:
          url: "https://acme-corp.com/ai/conformity/research-agent-v2"
          hash: "sha256:def456..."

      - framework: "NIST_AI_RMF"
        status: "ALIGNED"
        functions_addressed:
          - function: "GOVERN"
            subcategories: ["GV-1", "GV-2", "GV-3"]
          - function: "MAP"
            subcategories: ["MP-1", "MP-2"]
          - function: "MEASURE"
            subcategories: ["ME-1", "ME-2", "ME-3"]
          - function: "MANAGE"
            subcategories: ["MG-1", "MG-2", "MG-3"]
        maturity_level: 3

      - framework: "ISO_42001"
        status: "CERTIFIED"
        clauses_addressed: [5, 6, 7, 8, 9, 10]
        certification_body: "TÜV Rheinland"
        certificate_number: "AI-2026-12345"

  # ═══════════════════════════════════════════════════════════════════════
  # SECTION 5: SECURITY POSTURE
  # Security verification results
  # ═══════════════════════════════════════════════════════════════════════
  security:
    # Penetration testing
    pentest:
      last_test: "2025-12-15"
      provider: "SecureAI Labs"
      scope: ["kill_switch", "policy_engine", "a2a_tokens", "api_endpoints"]
      findings:
        critical: 0
        high: 0
        medium: 2
        low: 5
      remediation_status: "COMPLETE"

    # Vulnerability management
    vulnerabilities:
      scan_date: "2026-01-08"
      open: 0
      accepted_risk: 2
      accepted_risk_details:
        - id: "CVE-2025-12345"
          severity: "LOW"
          justification: "Not exploitable in deployment context"
          expires: "2026-04-08"

    # Security controls
    controls:
      token_signing: "ES256"
      token_encryption: "A256GCM"
      key_rotation_days: 90
      mTLS_required: true

  # ═══════════════════════════════════════════════════════════════════════
  # SECTION 6: OPERATIONAL HEALTH
  # Real-time operational metrics (updated periodically)
  # ═══════════════════════════════════════════════════════════════════════
  operational:
    # Availability metrics
    availability:
      uptime_30d_percent: 99.97
      last_outage: "2025-11-15T03:00:00Z"
      mttr_minutes: 12

    # Governance metrics
    governance_health:
      policy_violations_30d: 0
      kill_switch_tests_30d: 30
      kill_switch_tests_passed: 30

    # Last health check
    health_check:
      timestamp: "2026-01-09T09:55:00Z"
      status: "HEALTHY"
      checks:
        - name: "kill_switch_reachable"
          status: "PASS"
        - name: "policy_engine_responsive"
          status: "PASS"
        - name: "telemetry_flowing"
          status: "PASS"

# ═══════════════════════════════════════════════════════════════════════════
# CRYPTOGRAPHIC SIGNATURE
# Signs the entire certificate
# ═══════════════════════════════════════════════════════════════════════════
signature:
  algorithm: "ES256"
  key_id: "aigos-ca-intermediate-2026-01"
  value: "MEUCIQDxK...base64..."

  # Timestamp from trusted timestamping authority
  timestamp:
    authority: "https://timestamp.digicert.com"
    value: "MIIEpAYJKoZIhvcNAQcCoIIElTCCBJECAQMx..."
```

### 2.2 Compact Certificate Format

For embedding in tokens and bandwidth-constrained scenarios:

```yaml
# Compact CGA Certificate (embedded in JWT)
apiVersion: aigos.io/v1
kind: CGACertificateCompact
spec:
  id: "cga-20260109-acme-research-agent-v2"
  agent_id: "urn:aigos:agent:acme-corp:research-agent-v2"
  level: "GOLD"
  issuer: "urn:aigos:ca:pangolabs"
  issued_at: "2026-01-09T10:00:00Z"
  expires_at: "2026-07-09T10:00:00Z"
  golden_thread_hash: "sha256:e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"

  # Governance summary (booleans for space efficiency)
  gov:
    ks: true   # kill_switch verified
    pe: true   # policy_engine verified
    gt: true   # golden_thread verified
    cb: true   # capability_bounds verified
    tm: true   # telemetry verified

  # Compliance summary
  compliance: ["EU_AI_ACT:HIGH", "NIST_AI_RMF:3", "ISO_42001"]

  # Full certificate URL for detailed verification
  full_cert_url: "https://cga.aigos.io/certs/cga-20260109-acme-research-agent-v2"

signature:
  alg: "ES256"
  kid: "aigos-ca-2026-01"
  sig: "MEUCIQDx..."
```

---

## 3. Certification Levels

### 3.1 Level Definitions

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                     CERTIFICATION LEVEL PYRAMID                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│                            ┌───────────┐                                    │
│                            │ PLATINUM  │  Third-party audit                 │
│                            │           │  Penetration tested                │
│                            │    ◆◆◆◆   │  SLA verified                      │
│                            └─────┬─────┘  Continuous monitoring             │
│                                  │                                          │
│                         ┌────────┴────────┐                                 │
│                         │      GOLD       │  Compliance mapped              │
│                         │                 │  Full audit trail               │
│                         │      ◆◆◆        │  Security scan                  │
│                         └────────┬────────┘                                 │
│                                  │                                          │
│                    ┌─────────────┴─────────────┐                            │
│                    │          SILVER           │  Kill switch tested        │
│                    │                           │  Policy engine active      │
│                    │           ◆◆              │  Telemetry verified        │
│                    └─────────────┬─────────────┘                            │
│                                  │                                          │
│          ┌───────────────────────┴───────────────────────┐                  │
│          │                    BRONZE                      │                  │
│          │                                                │  Asset card valid│
│          │                     ◆                          │  Golden thread   │
│          │                                                │  Self-attested   │
│          └────────────────────────────────────────────────┘                  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 3.2 Level Requirements Matrix

| Requirement | BRONZE | SILVER | GOLD | PLATINUM |
|-------------|--------|--------|------|----------|
| **Identity** |
| Valid asset card | ✓ | ✓ | ✓ | ✓ |
| Golden Thread hash | ✓ | ✓ | ✓ | ✓ |
| Golden Thread signature | - | ✓ | ✓ | ✓ |
| Organization verified | - | - | ✓ | ✓ |
| **Kill Switch** |
| Endpoint declared | ✓ | ✓ | ✓ | ✓ |
| Live test passed | - | ✓ | ✓ | ✓ |
| SLA < 60s verified | - | - | ✓ | ✓ |
| Multi-channel verified | - | - | - | ✓ |
| **Policy Engine** |
| Policy declared | ✓ | ✓ | ✓ | ✓ |
| Enforcement mode STRICT | - | ✓ | ✓ | ✓ |
| Latency < 2ms verified | - | - | ✓ | ✓ |
| **Capability Bounds** |
| Capabilities declared | ✓ | ✓ | ✓ | ✓ |
| Decay mode configured | - | ✓ | ✓ | ✓ |
| Hierarchy limits enforced | - | - | ✓ | ✓ |
| **Telemetry** |
| OTLP endpoint declared | ✓ | ✓ | ✓ | ✓ |
| Required spans verified | - | ✓ | ✓ | ✓ |
| Retention policy verified | - | - | ✓ | ✓ |
| **Compliance** |
| Self-declared risk level | ✓ | ✓ | ✓ | ✓ |
| Framework mapping | - | - | ✓ | ✓ |
| Conformity declaration | - | - | ✓ | ✓ |
| Third-party audit | - | - | - | ✓ |
| **Security** |
| Basic security controls | ✓ | ✓ | ✓ | ✓ |
| Vulnerability scan | - | - | ✓ | ✓ |
| Penetration test | - | - | - | ✓ |
| Zero critical/high vulns | - | - | - | ✓ |
| **Operational** |
| Health endpoint | ✓ | ✓ | ✓ | ✓ |
| Continuous monitoring | - | - | - | ✓ |
| Uptime SLA verified | - | - | - | ✓ |
| **Certification Process** |
| Self-certification | ✓ | - | - | - |
| Automated verification | - | ✓ | ✓ | - |
| Manual review | - | - | - | ✓ |
| **Validity Period** |
| Certificate duration | 30 days | 90 days | 180 days | 365 days |
| Renewal | Manual | Auto | Auto | Auto + Review |

### 3.3 Level Upgrade Path

```
BRONZE ──────────────────────────────────────────────────────────► SILVER
  │                                                                   │
  │  Requirements to upgrade:                                         │
  │  1. Enable kill switch with live endpoint                        │
  │  2. Configure policy engine in STRICT mode                       │
  │  3. Enable telemetry with required spans                         │
  │  4. Pass automated verification tests                            │
  │                                                                   │
  │  Command: aigrc certify upgrade --target silver                  │
  │                                                                   │
SILVER ──────────────────────────────────────────────────────────► GOLD
  │                                                                   │
  │  Requirements to upgrade:                                         │
  │  1. Verify kill switch SLA < 60 seconds                          │
  │  2. Verify policy engine latency < 2ms                           │
  │  3. Map to at least one compliance framework                     │
  │  4. Complete vulnerability scan with no critical/high            │
  │  5. Organization domain verification                             │
  │                                                                   │
  │  Command: aigrc certify upgrade --target gold                    │
  │                                                                   │
GOLD ────────────────────────────────────────────────────────────► PLATINUM
  │                                                                   │
  │  Requirements to upgrade:                                         │
  │  1. Complete third-party security audit                          │
  │  2. Complete penetration test                                    │
  │  3. Verify multi-channel kill switch                             │
  │  4. Enable continuous monitoring                                 │
  │  5. Manual review by CA                                          │
  │                                                                   │
  │  Command: aigrc certify upgrade --target platinum                │
  │           (triggers manual review process)                       │
  │                                                                   │
```

---

## 4. Verification Engine

### 4.1 Architecture

The Verification Engine is **integrated into the AIGRC tools** and runs locally:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      VERIFICATION ENGINE (Local)                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    VERIFICATION ORCHESTRATOR                         │   │
│  │                                                                      │   │
│  │  Input: Agent configuration (asset card, runtime config)            │   │
│  │  Output: Verification report + Certificate (if passed)              │   │
│  │                                                                      │   │
│  └──────────────────────────────┬──────────────────────────────────────┘   │
│                                 │                                           │
│         ┌───────────────────────┼───────────────────────┐                   │
│         │                       │                       │                   │
│         ▼                       ▼                       ▼                   │
│  ┌─────────────┐         ┌─────────────┐         ┌─────────────┐           │
│  │  Identity   │         │  Governance │         │  Compliance │           │
│  │  Verifier   │         │  Verifier   │         │  Verifier   │           │
│  │             │         │             │         │             │           │
│  │ • Asset card│         │ • Kill sw.  │         │ • Framework │           │
│  │ • Golden th.│         │ • Policy    │         │   mapping   │           │
│  │ • Org verify│         │ • Telemetry │         │ • Artifact  │           │
│  │ • Key valid │         │ • Caps      │         │   verify    │           │
│  └─────────────┘         └─────────────┘         └─────────────┘           │
│         │                       │                       │                   │
│         └───────────────────────┼───────────────────────┘                   │
│                                 │                                           │
│                                 ▼                                           │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                      LIVE TEST EXECUTOR                              │   │
│  │                                                                      │   │
│  │  • Kill switch live test (sends test command, measures response)    │   │
│  │  • Policy engine benchmark (measures latency)                       │   │
│  │  • Telemetry flow verification (checks spans arrive)                │   │
│  │                                                                      │   │
│  └──────────────────────────────┬──────────────────────────────────────┘   │
│                                 │                                           │
│                                 ▼                                           │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                      CERTIFICATE GENERATOR                           │   │
│  │                                                                      │   │
│  │  Self-sign (BRONZE) or Submit to CA (SILVER+)                       │   │
│  │                                                                      │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 4.2 Verification Checks

```typescript
// packages/core/src/cga/verification-engine.ts

interface VerificationResult {
  check: string;
  status: 'PASS' | 'FAIL' | 'SKIP' | 'WARN';
  message: string;
  evidence?: Record<string, unknown>;
  duration_ms?: number;
}

interface VerificationReport {
  agent_id: string;
  timestamp: string;
  target_level: CGALevel;
  achieved_level: CGALevel | null;
  checks: VerificationResult[];
  summary: {
    total: number;
    passed: number;
    failed: number;
    skipped: number;
    warnings: number;
  };
  certificate?: CGACertificate;
}

// Verification check implementations
const VERIFICATION_CHECKS: Record<string, VerificationCheck> = {
  // Identity checks
  'identity.asset_card_valid': {
    levels: ['BRONZE', 'SILVER', 'GOLD', 'PLATINUM'],
    async verify(ctx: VerificationContext): Promise<VerificationResult> {
      const assetCard = await ctx.loadAssetCard();
      const validation = AssetCardSchema.safeParse(assetCard);
      return {
        check: 'identity.asset_card_valid',
        status: validation.success ? 'PASS' : 'FAIL',
        message: validation.success
          ? 'Asset card schema validation passed'
          : `Asset card validation failed: ${validation.error.message}`,
        evidence: { errors: validation.error?.errors }
      };
    }
  },

  'identity.golden_thread_hash': {
    levels: ['BRONZE', 'SILVER', 'GOLD', 'PLATINUM'],
    async verify(ctx: VerificationContext): Promise<VerificationResult> {
      const computed = await ctx.computeGoldenThreadHash();
      const declared = ctx.assetCard.golden_thread?.hash;
      return {
        check: 'identity.golden_thread_hash',
        status: computed === declared ? 'PASS' : 'FAIL',
        message: computed === declared
          ? 'Golden Thread hash matches'
          : 'Golden Thread hash mismatch',
        evidence: { computed, declared }
      };
    }
  },

  'identity.golden_thread_signature': {
    levels: ['SILVER', 'GOLD', 'PLATINUM'],
    async verify(ctx: VerificationContext): Promise<VerificationResult> {
      const signature = ctx.assetCard.golden_thread?.signature;
      if (!signature) {
        return { check: 'identity.golden_thread_signature', status: 'FAIL', message: 'No signature found' };
      }
      const isValid = await ctx.verifySignature(signature);
      return {
        check: 'identity.golden_thread_signature',
        status: isValid ? 'PASS' : 'FAIL',
        message: isValid ? 'Signature verified' : 'Signature verification failed'
      };
    }
  },

  // Kill Switch checks
  'kill_switch.endpoint_declared': {
    levels: ['BRONZE', 'SILVER', 'GOLD', 'PLATINUM'],
    async verify(ctx: VerificationContext): Promise<VerificationResult> {
      const endpoint = ctx.runtimeConfig.kill_switch?.endpoint;
      return {
        check: 'kill_switch.endpoint_declared',
        status: endpoint ? 'PASS' : 'FAIL',
        message: endpoint ? `Endpoint: ${endpoint}` : 'No kill switch endpoint declared'
      };
    }
  },

  'kill_switch.live_test': {
    levels: ['SILVER', 'GOLD', 'PLATINUM'],
    async verify(ctx: VerificationContext): Promise<VerificationResult> {
      const start = Date.now();
      try {
        // Send test kill switch command
        const response = await ctx.sendKillSwitchTest();
        const duration = Date.now() - start;

        return {
          check: 'kill_switch.live_test',
          status: response.acknowledged ? 'PASS' : 'FAIL',
          message: response.acknowledged
            ? `Kill switch responded in ${duration}ms`
            : 'Kill switch did not acknowledge test command',
          evidence: { duration_ms: duration, response },
          duration_ms: duration
        };
      } catch (error) {
        return {
          check: 'kill_switch.live_test',
          status: 'FAIL',
          message: `Kill switch test failed: ${error.message}`,
          duration_ms: Date.now() - start
        };
      }
    }
  },

  'kill_switch.sla_verified': {
    levels: ['GOLD', 'PLATINUM'],
    async verify(ctx: VerificationContext): Promise<VerificationResult> {
      // Run multiple tests to get p99 latency
      const latencies: number[] = [];
      for (let i = 0; i < 10; i++) {
        const start = Date.now();
        await ctx.sendKillSwitchTest();
        latencies.push(Date.now() - start);
      }

      latencies.sort((a, b) => a - b);
      const p99 = latencies[Math.floor(latencies.length * 0.99)];
      const slaTarget = 60000; // 60 seconds

      return {
        check: 'kill_switch.sla_verified',
        status: p99 < slaTarget ? 'PASS' : 'FAIL',
        message: p99 < slaTarget
          ? `P99 latency ${p99}ms is within ${slaTarget}ms SLA`
          : `P99 latency ${p99}ms exceeds ${slaTarget}ms SLA`,
        evidence: { p99_ms: p99, target_ms: slaTarget, all_latencies: latencies }
      };
    }
  },

  // Policy Engine checks
  'policy_engine.strict_mode': {
    levels: ['SILVER', 'GOLD', 'PLATINUM'],
    async verify(ctx: VerificationContext): Promise<VerificationResult> {
      const mode = ctx.runtimeConfig.policy_engine?.enforcement_mode;
      return {
        check: 'policy_engine.strict_mode',
        status: mode === 'STRICT' ? 'PASS' : 'FAIL',
        message: mode === 'STRICT'
          ? 'Policy engine in STRICT mode'
          : `Policy engine in ${mode} mode, STRICT required`
      };
    }
  },

  'policy_engine.latency_verified': {
    levels: ['GOLD', 'PLATINUM'],
    async verify(ctx: VerificationContext): Promise<VerificationResult> {
      // Benchmark policy checks
      const latencies: number[] = [];
      for (let i = 0; i < 100; i++) {
        const start = performance.now();
        await ctx.runPolicyCheck({ action: 'test', resource: 'benchmark' });
        latencies.push(performance.now() - start);
      }

      latencies.sort((a, b) => a - b);
      const p99 = latencies[Math.floor(latencies.length * 0.99)];
      const target = 2; // 2ms

      return {
        check: 'policy_engine.latency_verified',
        status: p99 < target ? 'PASS' : 'FAIL',
        message: p99 < target
          ? `P99 latency ${p99.toFixed(2)}ms within ${target}ms target`
          : `P99 latency ${p99.toFixed(2)}ms exceeds ${target}ms target`,
        evidence: { p99_ms: p99, target_ms: target }
      };
    }
  },

  // Compliance checks
  'compliance.framework_mapped': {
    levels: ['GOLD', 'PLATINUM'],
    async verify(ctx: VerificationContext): Promise<VerificationResult> {
      const mappings = ctx.assetCard.compliance?.frameworks || [];
      return {
        check: 'compliance.framework_mapped',
        status: mappings.length > 0 ? 'PASS' : 'FAIL',
        message: mappings.length > 0
          ? `Mapped to ${mappings.length} framework(s): ${mappings.join(', ')}`
          : 'No compliance framework mappings found',
        evidence: { frameworks: mappings }
      };
    }
  },

  // Security checks
  'security.vulnerability_scan': {
    levels: ['GOLD', 'PLATINUM'],
    async verify(ctx: VerificationContext): Promise<VerificationResult> {
      const scan = ctx.securityReport?.vulnerability_scan;
      if (!scan) {
        return { check: 'security.vulnerability_scan', status: 'FAIL', message: 'No vulnerability scan report' };
      }

      const hasCritical = scan.critical > 0 || scan.high > 0;
      return {
        check: 'security.vulnerability_scan',
        status: hasCritical ? 'FAIL' : 'PASS',
        message: hasCritical
          ? `Found ${scan.critical} critical and ${scan.high} high vulnerabilities`
          : `Scan passed: ${scan.medium} medium, ${scan.low} low findings`,
        evidence: scan
      };
    }
  },

  'security.pentest_complete': {
    levels: ['PLATINUM'],
    async verify(ctx: VerificationContext): Promise<VerificationResult> {
      const pentest = ctx.securityReport?.pentest;
      if (!pentest) {
        return { check: 'security.pentest_complete', status: 'FAIL', message: 'No penetration test report' };
      }

      // Check pentest is recent (within 12 months)
      const testDate = new Date(pentest.date);
      const oneYearAgo = new Date();
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

      const isRecent = testDate > oneYearAgo;
      const noHighFindings = pentest.critical === 0 && pentest.high === 0;

      return {
        check: 'security.pentest_complete',
        status: isRecent && noHighFindings ? 'PASS' : 'FAIL',
        message: !isRecent
          ? 'Penetration test older than 12 months'
          : !noHighFindings
          ? `${pentest.critical} critical, ${pentest.high} high findings remain`
          : `Pentest by ${pentest.provider} passed`,
        evidence: pentest
      };
    }
  }
};
```

### 4.3 Live Test Protocol

```typescript
// Kill Switch Live Test Protocol
interface KillSwitchTestProtocol {
  // Test command structure
  command: {
    type: 'TEST';
    test_id: string;
    timestamp: string;
    signature: string;  // Signed by verification engine
  };

  // Expected response
  response: {
    test_id: string;
    acknowledged: boolean;
    received_at: string;
    agent_id: string;
    signature: string;  // Signed by agent
  };

  // Test execution
  async execute(config: KillSwitchConfig): Promise<KillSwitchTestResult> {
    const testId = crypto.randomUUID();
    const command = this.createTestCommand(testId);

    // Try all configured channels
    const results: ChannelTestResult[] = [];

    for (const channel of config.channels) {
      const start = Date.now();
      try {
        const response = await this.sendToChannel(channel, command);
        results.push({
          channel: channel.type,
          success: response.acknowledged && response.test_id === testId,
          latency_ms: Date.now() - start,
          response
        });
      } catch (error) {
        results.push({
          channel: channel.type,
          success: false,
          latency_ms: Date.now() - start,
          error: error.message
        });
      }
    }

    return {
      test_id: testId,
      timestamp: new Date().toISOString(),
      channels_tested: results.length,
      channels_passed: results.filter(r => r.success).length,
      results,
      overall_success: results.some(r => r.success)
    };
  }
}
```

---

## 5. CA Infrastructure

### 5.1 Hosted CA Platform (cga.aigos.io)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    HOSTED CA PLATFORM ARCHITECTURE                           │
│                         (cga.aigos.io)                                       │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌───────────────────────────────────────────────────────────────────────┐ │
│  │                         API GATEWAY                                    │ │
│  │  • Rate limiting  • Authentication  • Request routing                 │ │
│  └───────────────────────────────────────────────────────────────────────┘ │
│                                    │                                        │
│         ┌──────────────────────────┼──────────────────────────┐            │
│         │                          │                          │            │
│         ▼                          ▼                          ▼            │
│  ┌─────────────────┐      ┌─────────────────┐      ┌─────────────────┐    │
│  │  Certification  │      │   Certificate   │      │   Revocation    │    │
│  │     Service     │      │    Registry     │      │    Service      │    │
│  │                 │      │                 │      │                 │    │
│  │ • Submit cert   │      │ • Public lookup │      │ • OCSP responder│    │
│  │ • Verification  │      │ • Search/filter │      │ • CRL generation│    │
│  │ • Renewal       │      │ • Download cert │      │ • Suspension    │    │
│  └────────┬────────┘      └────────┬────────┘      └────────┬────────┘    │
│           │                        │                        │              │
│           └────────────────────────┼────────────────────────┘              │
│                                    │                                        │
│                                    ▼                                        │
│  ┌───────────────────────────────────────────────────────────────────────┐ │
│  │                      CERTIFICATE DATABASE                              │ │
│  │                                                                        │ │
│  │  • Certificates (active, expired, revoked)                            │ │
│  │  • Organization records                                               │ │
│  │  • Verification history                                               │ │
│  │  • Audit logs                                                         │ │
│  └───────────────────────────────────────────────────────────────────────┘ │
│                                    │                                        │
│                                    ▼                                        │
│  ┌───────────────────────────────────────────────────────────────────────┐ │
│  │                     TRANSPARENCY LOG                                   │ │
│  │                                                                        │ │
│  │  • Append-only log of all certificate operations                      │ │
│  │  • Merkle tree for integrity verification                             │ │
│  │  • Public audit interface                                             │ │
│  └───────────────────────────────────────────────────────────────────────┘ │
│                                    │                                        │
│                                    ▼                                        │
│  ┌───────────────────────────────────────────────────────────────────────┐ │
│  │                  CONTINUOUS MONITORING                                 │ │
│  │                                                                        │ │
│  │  • Periodic health checks for certified agents                        │ │
│  │  • Kill switch test execution                                         │ │
│  │  • Violation detection and alerting                                   │ │
│  │  • Automatic suspension on policy violation                           │ │
│  └───────────────────────────────────────────────────────────────────────┘ │
│                                                                             │
│  ┌───────────────────────────────────────────────────────────────────────┐ │
│  │                     HSM / KEY MANAGEMENT                               │ │
│  │                                                                        │ │
│  │  • Root CA key (offline, air-gapped)                                  │ │
│  │  • Intermediate CA keys (HSM-protected)                               │ │
│  │  • Key ceremony procedures                                            │ │
│  └───────────────────────────────────────────────────────────────────────┘ │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 5.2 CA API Specification

```yaml
# OpenAPI 3.0 specification for CGA CA API
openapi: 3.0.0
info:
  title: AIGOS CGA Certification Authority API
  version: 1.0.0
  description: API for managing Certified Governed Agent certificates

servers:
  - url: https://cga.aigos.io/api/v1
    description: Production CA

paths:
  # Certificate submission
  /certificates/submit:
    post:
      summary: Submit agent for certification
      requestBody:
        content:
          application/json:
            schema:
              type: object
              properties:
                target_level:
                  type: string
                  enum: [BRONZE, SILVER, GOLD, PLATINUM]
                asset_card:
                  $ref: '#/components/schemas/AssetCard'
                verification_report:
                  $ref: '#/components/schemas/VerificationReport'
                organization_token:
                  type: string
                  description: JWT proving organization ownership
      responses:
        '202':
          description: Certification request accepted
          content:
            application/json:
              schema:
                type: object
                properties:
                  request_id: { type: string }
                  status: { type: string, enum: [PENDING, PROCESSING] }
                  estimated_completion: { type: string, format: date-time }

  # Certificate lookup
  /certificates/{certificate_id}:
    get:
      summary: Get certificate by ID
      parameters:
        - name: certificate_id
          in: path
          required: true
          schema: { type: string }
        - name: format
          in: query
          schema:
            type: string
            enum: [full, compact, pem]
            default: full
      responses:
        '200':
          description: Certificate found
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/CGACertificate'
        '404':
          description: Certificate not found

  # Certificate search
  /certificates/search:
    get:
      summary: Search certificates
      parameters:
        - name: organization
          in: query
          schema: { type: string }
        - name: level
          in: query
          schema:
            type: string
            enum: [BRONZE, SILVER, GOLD, PLATINUM]
        - name: compliance_framework
          in: query
          schema: { type: string }
        - name: valid_only
          in: query
          schema: { type: boolean, default: true }
      responses:
        '200':
          description: Search results
          content:
            application/json:
              schema:
                type: object
                properties:
                  total: { type: integer }
                  certificates:
                    type: array
                    items:
                      $ref: '#/components/schemas/CGACertificateCompact'

  # Revocation check (OCSP)
  /ocsp:
    post:
      summary: Check certificate revocation status
      requestBody:
        content:
          application/ocsp-request:
            schema:
              type: string
              format: binary
      responses:
        '200':
          description: OCSP response
          content:
            application/ocsp-response:
              schema:
                type: string
                format: binary

  # Certificate Revocation List
  /crl:
    get:
      summary: Get Certificate Revocation List
      responses:
        '200':
          description: CRL in PEM format
          content:
            application/x-pem-file:
              schema:
                type: string

  # Transparency log
  /transparency/log:
    get:
      summary: Get transparency log entries
      parameters:
        - name: start
          in: query
          schema: { type: integer }
        - name: end
          in: query
          schema: { type: integer }
      responses:
        '200':
          description: Log entries
          content:
            application/json:
              schema:
                type: object
                properties:
                  entries:
                    type: array
                    items:
                      $ref: '#/components/schemas/TransparencyLogEntry'
                  tree_head:
                    $ref: '#/components/schemas/MerkleTreeHead'

  # Renewal
  /certificates/{certificate_id}/renew:
    post:
      summary: Renew certificate
      parameters:
        - name: certificate_id
          in: path
          required: true
          schema: { type: string }
      requestBody:
        content:
          application/json:
            schema:
              type: object
              properties:
                verification_report:
                  $ref: '#/components/schemas/VerificationReport'
      responses:
        '200':
          description: Renewal successful
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/CGACertificate'

  # Revocation
  /certificates/{certificate_id}/revoke:
    post:
      summary: Revoke certificate
      security:
        - organization_auth: []
      parameters:
        - name: certificate_id
          in: path
          required: true
          schema: { type: string }
      requestBody:
        content:
          application/json:
            schema:
              type: object
              properties:
                reason:
                  type: string
                  enum: [KEY_COMPROMISE, AFFILIATION_CHANGED, SUPERSEDED,
                         CESSATION_OF_OPERATION, PRIVILEGE_WITHDRAWN]
                effective_date:
                  type: string
                  format: date-time
      responses:
        '200':
          description: Certificate revoked

components:
  schemas:
    CGACertificate:
      # Full certificate schema (see Section 2.1)
      type: object

    CGACertificateCompact:
      # Compact certificate schema (see Section 2.2)
      type: object

    VerificationReport:
      type: object
      properties:
        agent_id: { type: string }
        timestamp: { type: string, format: date-time }
        target_level: { type: string }
        checks:
          type: array
          items:
            type: object
            properties:
              check: { type: string }
              status: { type: string, enum: [PASS, FAIL, SKIP, WARN] }
              message: { type: string }
              evidence: { type: object }

    TransparencyLogEntry:
      type: object
      properties:
        index: { type: integer }
        timestamp: { type: string, format: date-time }
        operation: { type: string, enum: [ISSUE, RENEW, REVOKE, SUSPEND] }
        certificate_id: { type: string }
        hash: { type: string }

    MerkleTreeHead:
      type: object
      properties:
        tree_size: { type: integer }
        timestamp: { type: string, format: date-time }
        root_hash: { type: string }
        signature: { type: string }

  securitySchemes:
    organization_auth:
      type: http
      scheme: bearer
      bearerFormat: JWT
```

### 5.3 Enterprise CA Deployment

For organizations requiring on-premise CA:

```yaml
# Enterprise CA Helm Chart values
# helm install aigos-ca aigos/cga-enterprise-ca -f values.yaml

replicaCount: 3

image:
  repository: ghcr.io/aigos/cga-enterprise-ca
  tag: "1.0.0"

# HSM configuration
hsm:
  enabled: true
  provider: "aws-cloudhsm"  # or "azure-keyvault", "hashicorp-vault", "thales-luna"
  config:
    cluster_id: "cluster-xxxxx"
    region: "us-east-1"

# Database
database:
  type: "postgresql"
  host: "cga-db.internal"
  name: "cga_certificates"
  ssl: true

# Cross-signing with public CA (optional)
crossSign:
  enabled: true
  publicCA: "https://cga.aigos.io"
  # Certificates signed by Enterprise CA can be trusted by
  # anyone who trusts the public CA

# Trust anchors
trustAnchors:
  # Additional CAs to trust
  - name: "Corporate PKI"
    certificate: |
      -----BEGIN CERTIFICATE-----
      ...
      -----END CERTIFICATE-----

# Monitoring
monitoring:
  enabled: true
  prometheus:
    enabled: true
  alerting:
    slack_webhook: "https://hooks.slack.com/..."

# Backup
backup:
  enabled: true
  schedule: "0 2 * * *"  # Daily at 2 AM
  retention: 90
  destination: "s3://cga-backups/enterprise-ca/"
```

---

## 6. Certification Process

### 6.1 Self-Certification (BRONZE)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    BRONZE SELF-CERTIFICATION FLOW                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Developer Machine (Local)                                                  │
│  ════════════════════════                                                   │
│                                                                             │
│  1. Run verification     ┌──────────────────────────────────────────────┐  │
│     $ aigrc certify      │  Verification Engine                         │  │
│                          │                                              │  │
│                          │  ✓ Asset card valid                          │  │
│                          │  ✓ Golden Thread hash matches                │  │
│                          │  ✓ Kill switch endpoint declared             │  │
│                          │  ✓ Policy declared                           │  │
│                          │  ✓ Telemetry endpoint declared               │  │
│                          │                                              │  │
│                          │  Result: PASS for BRONZE                     │  │
│                          └──────────────────────────────────────────────┘  │
│                                          │                                  │
│  2. Generate certificate                 ▼                                  │
│                          ┌──────────────────────────────────────────────┐  │
│                          │  Local Certificate Generator                 │  │
│                          │                                              │  │
│                          │  • Generate certificate from template        │  │
│                          │  • Sign with organization key                │  │
│                          │  • Set 30-day validity                       │  │
│                          │                                              │  │
│                          └──────────────────────────────────────────────┘  │
│                                          │                                  │
│  3. Store certificate                    ▼                                  │
│                          ┌──────────────────────────────────────────────┐  │
│                          │  .aigrc/certificates/                        │  │
│                          │    └── agent-v2.cga.yaml                     │  │
│                          │                                              │  │
│                          │  Certificate stored locally                  │  │
│                          │  Can be embedded in governance tokens        │  │
│                          └──────────────────────────────────────────────┘  │
│                                                                             │
│  No network required. Self-signed. Valid for internal use.                  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 6.2 Automated Certification (SILVER/GOLD)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    SILVER/GOLD CERTIFICATION FLOW                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Developer Machine                          Hosted CA (cga.aigos.io)        │
│  ════════════════                           ════════════════════════        │
│                                                                             │
│  1. Run verification                                                        │
│     $ aigrc certify --level silver                                          │
│            │                                                                │
│            ▼                                                                │
│     ┌─────────────────┐                                                     │
│     │ Local           │                                                     │
│     │ Verification    │                                                     │
│     │ (all SILVER     │                                                     │
│     │  checks)        │                                                     │
│     └────────┬────────┘                                                     │
│              │                                                              │
│  2. Submit to CA       ─────────────────────────────────►                   │
│              │                                           │                  │
│              │         ┌─────────────────────────────────┴───────────────┐  │
│              │         │  CA Verification Service                        │  │
│              │         │                                                 │  │
│              │         │  1. Validate organization token                 │  │
│              │         │  2. Verify local verification report           │  │
│              │         │  3. Run independent live tests:                │  │
│              │         │     • Kill switch test from CA                 │  │
│              │         │     • Telemetry flow verification              │  │
│              │         │  4. Check no existing violations               │  │
│              │         │                                                 │  │
│              │         └─────────────────────────────────┬───────────────┘  │
│              │                                           │                  │
│  3. Receive certificate ◄─────────────────────────────────                  │
│              │                                                              │
│              ▼                                                              │
│     ┌─────────────────┐                                                     │
│     │ Store locally + │                                                     │
│     │ Registered in   │                                                     │
│     │ public registry │                                                     │
│     └─────────────────┘                                                     │
│                                                                             │
│  Certificate is:                                                            │
│  • Signed by CA (third-party trust)                                         │
│  • Publicly discoverable                                                    │
│  • Revocation-checkable                                                     │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 6.3 Manual Review Certification (PLATINUM)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    PLATINUM CERTIFICATION FLOW                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Phase 1: Automated Verification (Same as GOLD)                             │
│  ══════════════════════════════════════════════                             │
│  $ aigrc certify --level platinum                                           │
│  → All GOLD checks pass                                                     │
│  → Submitted to CA                                                          │
│                                                                             │
│  Phase 2: Documentation Review                                              │
│  ═════════════════════════════                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  Required Documentation:                                             │   │
│  │                                                                      │   │
│  │  □ Third-party penetration test report (< 12 months)                │   │
│  │  □ Third-party security audit report                                │   │
│  │  □ Compliance conformity declaration                                │   │
│  │  □ Incident response plan                                           │   │
│  │  □ Business continuity plan                                         │   │
│  │  □ Data processing agreement (if applicable)                        │   │
│  │                                                                      │   │
│  │  Upload via: https://cga.aigos.io/platinum/submit                   │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  Phase 3: CA Review                                                         │
│  ══════════════════                                                         │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  CA Reviewer Actions:                                                │   │
│  │                                                                      │   │
│  │  1. Review penetration test findings                                │   │
│  │  2. Verify security audit scope covers AIGOS controls               │   │
│  │  3. Validate compliance declarations                                │   │
│  │  4. Check organization reputation/history                           │   │
│  │  5. Conduct interview (optional, for first-time PLATINUM)           │   │
│  │                                                                      │   │
│  │  Timeline: 5-10 business days                                       │   │
│  │                                                                      │   │
│  │  Outcomes:                                                           │   │
│  │  • APPROVED → Certificate issued                                    │   │
│  │  • NEEDS_INFO → Request additional documentation                    │   │
│  │  • DENIED → Explanation provided, can re-apply                      │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  Phase 4: Continuous Monitoring                                             │
│  ══════════════════════════════                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  PLATINUM certificates include:                                      │   │
│  │                                                                      │   │
│  │  • Daily kill switch health checks from CA                          │   │
│  │  • Weekly compliance posture verification                           │   │
│  │  • Real-time violation monitoring                                   │   │
│  │  • Automatic suspension on SLA breach                               │   │
│  │                                                                      │   │
│  │  Monitoring endpoint required:                                      │   │
│  │  https://your-agent.com/.well-known/aigos-health                    │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 7. A2A Integration

### 7.1 CGA-Enhanced Governance Token

```typescript
// CGA claims embedded in governance token
interface CGAEnhancedGovernanceToken {
  // Standard JWT claims
  iss: string;      // Issuing agent ID
  sub: string;      // Subject (same as iss for self-issued)
  aud: string;      // Target agent ID
  iat: number;      // Issued at
  exp: number;      // Expiration
  jti: string;      // Unique token ID

  // AIGOS governance claims
  aigos: {
    type: 'AIGOS-GOV+jwt';
    version: '1.0';
    risk_level: string;
    capabilities: string[];
    kill_switch: boolean;
    golden_thread: string;
  };

  // CGA attestation (the enhancement)
  cga: {
    // Certificate reference
    certificate_id: string;
    certificate_url: string;  // For full cert retrieval

    // Key claims from certificate (for quick validation)
    level: 'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM';
    issuer: string;           // CA that issued cert
    expires_at: string;       // Certificate expiration

    // Governance verification summary
    verified: {
      kill_switch: boolean;
      policy_engine: boolean;
      golden_thread: boolean;
      capability_bounds: boolean;
      telemetry: boolean;
    };

    // Compliance summary
    compliance: string[];     // e.g., ["EU_AI_ACT:HIGH", "NIST:3"]

    // Operational health snapshot
    health: {
      uptime_30d: number;
      violations_30d: number;
      last_health_check: string;
    };
  };
}
```

### 7.2 CGA-Aware Trust Policy

```yaml
# Trust policy with CGA requirements
apiVersion: aigos.io/v1
kind: A2ATrustPolicy
metadata:
  name: production-cga-policy

spec:
  # Default CGA requirements
  default:
    require_cga: true
    minimum_level: SILVER

  # Trusted CAs
  trusted_cas:
    - id: "urn:aigos:ca:pangolabs"
      name: "AIGOS Public CA"
      trust_level: FULL

    - id: "urn:aigos:ca:enterprise:acme"
      name: "Acme Enterprise CA"
      trust_level: FULL
      # Cross-signed by public CA
      cross_signed_by: "urn:aigos:ca:pangolabs"

  # Action-specific requirements
  actions:
    # Financial actions require PLATINUM
    - pattern: "financial:*"
      require_cga: true
      minimum_level: PLATINUM
      require_compliance:
        - "SOX"
        - "PCI_DSS"
      require_pentest: true
      max_violations_30d: 0

    # PII access requires GOLD+
    - pattern: "pii:*"
      require_cga: true
      minimum_level: GOLD
      require_compliance:
        - "GDPR"

    # Read-only actions allow BRONZE
    - pattern: "read:*"
      require_cga: true
      minimum_level: BRONZE

  # Organization-specific overrides
  organizations:
    - id: "urn:aigos:org:trusted-partner"
      # Trusted partner can use SILVER for all actions
      minimum_level: SILVER
      skip_compliance_check: true

  # Revocation checking
  revocation:
    check_ocsp: true
    check_crl: true
    crl_cache_hours: 24
    fail_open: false  # Reject if revocation check fails

  # Health requirements
  health:
    require_recent_health_check: true
    max_health_check_age_hours: 24
    min_uptime_30d: 99.0
    max_violations_30d: 5
```

### 7.3 CGA Token Verification Flow

```typescript
// packages/core/src/cga/token-verifier.ts

class CGATokenVerifier {
  constructor(
    private trustPolicy: A2ATrustPolicy,
    private certCache: CGACertificateCache,
    private ocspClient: OCSPClient,
    private crlCache: CRLCache
  ) {}

  async verifyToken(
    token: string,
    context: VerificationContext
  ): Promise<CGAVerificationResult> {
    // 1. Decode token (without verification first)
    const decoded = jwt.decode(token, { complete: true });
    if (!decoded) {
      return { valid: false, error: 'Invalid token format' };
    }

    const payload = decoded.payload as CGAEnhancedGovernanceToken;

    // 2. Check if CGA is required
    const cgaRequired = this.isCGARequired(payload, context);
    if (cgaRequired && !payload.cga) {
      return { valid: false, error: 'CGA attestation required but not present' };
    }

    if (payload.cga) {
      // 3. Verify CGA issuer is trusted
      const ca = this.trustPolicy.trusted_cas.find(
        ca => ca.id === payload.cga.issuer
      );
      if (!ca) {
        return { valid: false, error: `Untrusted CA: ${payload.cga.issuer}` };
      }

      // 4. Check CGA level meets requirements
      const requiredLevel = this.getRequiredLevel(payload, context);
      if (!this.levelMeetsRequirement(payload.cga.level, requiredLevel)) {
        return {
          valid: false,
          error: `CGA level ${payload.cga.level} below required ${requiredLevel}`
        };
      }

      // 5. Check certificate expiration
      const expiresAt = new Date(payload.cga.expires_at);
      if (expiresAt < new Date()) {
        return { valid: false, error: 'CGA certificate expired' };
      }

      // 6. Check revocation status
      if (this.trustPolicy.revocation.check_ocsp) {
        const ocspResult = await this.ocspClient.check(payload.cga.certificate_id);
        if (ocspResult.status === 'REVOKED') {
          return { valid: false, error: 'CGA certificate revoked' };
        }
      }

      // 7. Verify compliance requirements
      const complianceResult = this.checkComplianceRequirements(
        payload.cga.compliance,
        context
      );
      if (!complianceResult.satisfied) {
        return {
          valid: false,
          error: `Missing compliance: ${complianceResult.missing.join(', ')}`
        };
      }

      // 8. Check operational health
      if (this.trustPolicy.health.require_recent_health_check) {
        const healthCheckAge = Date.now() - new Date(payload.cga.health.last_health_check).getTime();
        const maxAge = this.trustPolicy.health.max_health_check_age_hours * 60 * 60 * 1000;
        if (healthCheckAge > maxAge) {
          return { valid: false, error: 'Health check too old' };
        }
      }

      if (payload.cga.health.uptime_30d < this.trustPolicy.health.min_uptime_30d) {
        return {
          valid: false,
          error: `Uptime ${payload.cga.health.uptime_30d}% below ${this.trustPolicy.health.min_uptime_30d}%`
        };
      }

      // 9. Fetch and verify full certificate (for high-security actions)
      if (this.requiresFullCertVerification(context)) {
        const fullCert = await this.certCache.get(payload.cga.certificate_url);
        const certValid = await this.verifyFullCertificate(fullCert, payload);
        if (!certValid) {
          return { valid: false, error: 'Full certificate verification failed' };
        }
      }
    }

    // 10. Verify token signature
    const publicKey = await this.getAgentPublicKey(payload.iss);
    try {
      jwt.verify(token, publicKey, { algorithms: ['ES256'] });
    } catch (e) {
      return { valid: false, error: `Token signature invalid: ${e.message}` };
    }

    // All checks passed
    return {
      valid: true,
      claims: payload,
      cga_level: payload.cga?.level || null,
      trust_level: this.calculateTrustLevel(payload)
    };
  }

  private calculateTrustLevel(payload: CGAEnhancedGovernanceToken): TrustLevel {
    if (!payload.cga) return 'NONE';

    const levelScores = { BRONZE: 1, SILVER: 2, GOLD: 3, PLATINUM: 4 };
    const baseScore = levelScores[payload.cga.level];

    // Adjust for operational health
    let healthAdjustment = 0;
    if (payload.cga.health.violations_30d > 0) healthAdjustment -= 1;
    if (payload.cga.health.uptime_30d >= 99.9) healthAdjustment += 0.5;

    const finalScore = Math.max(0, baseScore + healthAdjustment);

    if (finalScore >= 3.5) return 'HIGHEST';
    if (finalScore >= 2.5) return 'HIGH';
    if (finalScore >= 1.5) return 'MEDIUM';
    if (finalScore >= 0.5) return 'LOW';
    return 'NONE';
  }
}
```

---

## 8. CLI Integration

### 8.1 Certification Commands

```bash
# ═══════════════════════════════════════════════════════════════════════════
# AIGRC CLI - CGA Commands
# ═══════════════════════════════════════════════════════════════════════════

# Check current certification status
$ aigrc certify status
┌──────────────────────────────────────────────────────────────────────────┐
│  CERTIFICATION STATUS                                                     │
├──────────────────────────────────────────────────────────────────────────┤
│  Agent: urn:aigos:agent:acme-corp:research-agent-v2                      │
│  Current Level: SILVER                                                    │
│  Certificate ID: cga-20260109-acme-research-agent-v2                     │
│  Issued: 2026-01-09                                                       │
│  Expires: 2026-04-09 (89 days remaining)                                 │
│  Issuer: AIGOS Public CA (urn:aigos:ca:pangolabs)                        │
│                                                                          │
│  Governance Attestations:                                                │
│    ✓ Kill Switch     VERIFIED                                            │
│    ✓ Policy Engine   VERIFIED                                            │
│    ✓ Golden Thread   VERIFIED                                            │
│    ✓ Capability Bounds VERIFIED                                          │
│    ✓ Telemetry       VERIFIED                                            │
│                                                                          │
│  Operational Health:                                                     │
│    Uptime (30d): 99.97%                                                  │
│    Violations (30d): 0                                                   │
│    Last Health Check: 2026-01-09 09:55:00 UTC                            │
└──────────────────────────────────────────────────────────────────────────┘

# Run certification for a specific level
$ aigrc certify --level gold
Running GOLD certification checks...

Identity Checks:
  ✓ Asset card valid
  ✓ Golden Thread hash matches
  ✓ Golden Thread signature verified
  ✓ Organization verified (acme-corp.com)

Kill Switch Checks:
  ✓ Endpoint declared
  ✓ Live test passed (3 channels)
  ✓ SLA verified (P99: 45,230ms < 60,000ms)

Policy Engine Checks:
  ✓ STRICT mode enabled
  ✓ Latency verified (P99: 1.6ms < 2ms)

Compliance Checks:
  ✓ Framework mapped: EU_AI_ACT, NIST_AI_RMF
  ✓ Conformity declaration found

Security Checks:
  ✓ Vulnerability scan: 0 critical, 0 high

═══════════════════════════════════════════════════════════════════════════
GOLD CERTIFICATION: PASSED
═══════════════════════════════════════════════════════════════════════════

Submitting to CA...
Certificate issued: cga-20260109-acme-research-agent-v2-gold
Stored at: .aigrc/certificates/research-agent-v2.cga.yaml
Public URL: https://cga.aigos.io/certs/cga-20260109-acme-research-agent-v2-gold

# Verify a certificate
$ aigrc certify verify cga-20260109-acme-research-agent-v2
Verifying certificate...

Certificate Details:
  ID: cga-20260109-acme-research-agent-v2
  Agent: urn:aigos:agent:acme-corp:research-agent-v2
  Level: GOLD
  Issuer: AIGOS Public CA

Verification:
  ✓ Signature valid
  ✓ Certificate not expired (expires 2026-07-09)
  ✓ Certificate not revoked (OCSP check)
  ✓ Issuer trusted

Certificate is VALID

# Renew certificate
$ aigrc certify renew
Running renewal verification...
All checks passed.
Submitting renewal request...
Certificate renewed.
New expiration: 2026-07-09

# Upgrade certification level
$ aigrc certify upgrade --target platinum
Checking PLATINUM requirements...

Additional requirements for PLATINUM:
  ✗ Penetration test report required
  ✗ Third-party security audit required
  ✗ Multi-channel kill switch (only 2 channels verified)

Please provide the following:
  1. Upload pentest report: aigrc certify upload --type pentest <file>
  2. Upload audit report: aigrc certify upload --type audit <file>
  3. Configure additional kill switch channel

Run 'aigrc certify upgrade --target platinum' again after completing requirements.

# List trusted CAs
$ aigrc certify ca list
Trusted Certification Authorities:

  1. AIGOS Public CA
     ID: urn:aigos:ca:pangolabs
     URL: https://cga.aigos.io
     Root Cert: https://cga.aigos.io/certs/root.pem
     Status: Active
     Trust: BUILT-IN

  2. Acme Enterprise CA
     ID: urn:aigos:ca:enterprise:acme
     URL: https://ca.acme-corp.com
     Status: Active
     Trust: USER-CONFIGURED
     Cross-signed by: AIGOS Public CA

# Add trusted CA
$ aigrc certify ca add --id "urn:aigos:ca:partner" --url "https://ca.partner.com"
Fetching CA certificate...
Verifying cross-signature...
CA added to trusted list.

# Check agent's CGA before communicating
$ aigrc a2a check-trust urn:aigos:agent:partner:their-agent
Checking trust for: urn:aigos:agent:partner:their-agent

Certificate Found:
  ID: cga-20260105-partner-their-agent
  Level: SILVER
  Issuer: Partner Enterprise CA (cross-signed by AIGOS Public CA)
  Expires: 2026-04-05

Trust Policy Check:
  Required Level: SILVER ✓
  Compliance: Not required for this action ✓
  Revocation: Not revoked ✓
  Health: 99.95% uptime, 0 violations ✓

TRUST ESTABLISHED - Safe to communicate
```

### 8.2 Configuration

```yaml
# .aigrc/config.yaml - CGA configuration

# Certification settings
certification:
  # Organization identity for signing
  organization:
    id: "urn:aigos:org:acme-corp"
    domain: "acme-corp.com"
    signing_key: ".aigrc/keys/org-signing-key.pem"

  # Default target level for 'aigrc certify'
  default_level: SILVER

  # Auto-renewal settings
  auto_renew:
    enabled: true
    days_before_expiry: 14

  # CA configuration
  ca:
    # Primary CA for submission
    primary: "https://cga.aigos.io"

    # Additional trusted CAs
    trusted:
      - id: "urn:aigos:ca:enterprise:acme"
        url: "https://ca.acme-corp.internal"
        certificate: ".aigrc/ca-certs/acme-enterprise-ca.pem"

# Trust policy for A2A
trust_policy:
  require_cga: true
  minimum_level: SILVER

  # Action-specific requirements
  actions:
    "financial:*":
      minimum_level: PLATINUM
    "pii:*":
      minimum_level: GOLD
      require_compliance: ["GDPR"]

  # Revocation checking
  revocation:
    check_ocsp: true
    fail_open: false
```

---

## 9. SDK Integration

### 9.1 TypeScript SDK

```typescript
// packages/sdk/src/cga/index.ts

import { CGACertificate, CGALevel, VerificationReport } from '@aigrc/core';

/**
 * CGA SDK for programmatic certification management
 */
export class CGAClient {
  constructor(private config: CGAClientConfig) {}

  /**
   * Run certification verification for an agent
   */
  async verify(options: VerifyOptions): Promise<VerificationReport> {
    const engine = new VerificationEngine(this.config);
    return engine.verify({
      assetCardPath: options.assetCardPath,
      targetLevel: options.level,
      runtimeConfig: options.runtimeConfig
    });
  }

  /**
   * Submit for certification (SILVER+)
   */
  async certify(options: CertifyOptions): Promise<CGACertificate> {
    // Run local verification first
    const report = await this.verify({
      assetCardPath: options.assetCardPath,
      level: options.level,
      runtimeConfig: options.runtimeConfig
    });

    if (!report.passed) {
      throw new CertificationError('Verification failed', report);
    }

    // For BRONZE, self-sign locally
    if (options.level === 'BRONZE') {
      return this.selfSign(report, options);
    }

    // For SILVER+, submit to CA
    const caClient = new CAClient(this.config.ca);
    return caClient.submitCertification({
      targetLevel: options.level,
      verificationReport: report,
      organizationToken: await this.getOrganizationToken()
    });
  }

  /**
   * Load and validate a CGA certificate
   */
  async loadCertificate(path: string): Promise<CGACertificate> {
    const content = await fs.readFile(path, 'utf-8');
    const cert = yaml.parse(content) as CGACertificate;

    // Validate signature
    const isValid = await this.verifyCertificateSignature(cert);
    if (!isValid) {
      throw new InvalidCertificateError('Certificate signature invalid');
    }

    return cert;
  }

  /**
   * Check if a certificate is valid and not revoked
   */
  async checkCertificate(certId: string): Promise<CertificateStatus> {
    // Check local cache first
    const cached = this.certCache.get(certId);
    if (cached && !cached.needsRevalidation()) {
      return cached.status;
    }

    // Check OCSP
    if (this.config.revocation.checkOcsp) {
      const ocspResult = await this.ocspClient.check(certId);
      if (ocspResult.status === 'REVOKED') {
        return { valid: false, reason: 'REVOKED', revokedAt: ocspResult.revokedAt };
      }
    }

    // Check CRL
    if (this.config.revocation.checkCrl) {
      const crl = await this.crlCache.getCurrent();
      if (crl.contains(certId)) {
        return { valid: false, reason: 'REVOKED' };
      }
    }

    return { valid: true };
  }

  /**
   * Generate a CGA-enhanced governance token
   */
  async generateToken(options: TokenOptions): Promise<string> {
    const certificate = await this.loadCertificate(options.certificatePath);

    const tokenGenerator = new CGATokenGenerator({
      certificate,
      privateKey: await this.loadPrivateKey(options.privateKeyPath)
    });

    return tokenGenerator.generate({
      targetAgent: options.targetAgent,
      action: options.action,
      ttlSeconds: options.ttlSeconds || 300
    });
  }

  /**
   * Verify a CGA-enhanced governance token
   */
  async verifyToken(token: string, context?: VerificationContext): Promise<TokenVerificationResult> {
    const verifier = new CGATokenVerifier({
      trustPolicy: this.config.trustPolicy,
      certCache: this.certCache,
      ocspClient: this.ocspClient,
      crlCache: this.crlCache
    });

    return verifier.verify(token, context);
  }
}

// Usage example
const cga = new CGAClient({
  ca: { url: 'https://cga.aigos.io' },
  organization: {
    id: 'urn:aigos:org:acme-corp',
    signingKeyPath: '.aigrc/keys/org-signing-key.pem'
  },
  trustPolicy: await loadTrustPolicy('.aigrc/trust-policy.yaml'),
  revocation: { checkOcsp: true, checkCrl: true }
});

// Certify an agent
const cert = await cga.certify({
  assetCardPath: './assets/research-agent.asset.yaml',
  level: 'GOLD',
  runtimeConfig: await loadRuntimeConfig()
});

console.log(`Certified at level ${cert.spec.certification.level}`);
console.log(`Certificate ID: ${cert.metadata.id}`);

// Generate token for A2A communication
const token = await cga.generateToken({
  certificatePath: '.aigrc/certificates/research-agent.cga.yaml',
  privateKeyPath: '.aigrc/keys/agent-private-key.pem',
  targetAgent: 'urn:aigos:agent:partner:their-agent',
  action: 'data:read'
});

// Verify incoming token
const result = await cga.verifyToken(incomingToken, {
  action: 'data:read',
  resource: 'customer-data'
});

if (result.valid) {
  console.log(`Token from ${result.claims.iss} is valid`);
  console.log(`CGA Level: ${result.cga_level}`);
  console.log(`Trust Level: ${result.trust_level}`);
} else {
  console.error(`Token rejected: ${result.error}`);
}
```

### 9.2 Python SDK

```python
# aigrc-python/aigrc/cga/client.py

from dataclasses import dataclass
from typing import Optional
from pathlib import Path

from aigrc.cga.verification import VerificationEngine, VerificationReport
from aigrc.cga.certificate import CGACertificate, CGALevel
from aigrc.cga.token import CGATokenGenerator, CGATokenVerifier


@dataclass
class CGAClientConfig:
    ca_url: str = "https://cga.aigos.io"
    organization_id: Optional[str] = None
    signing_key_path: Optional[Path] = None
    trust_policy_path: Optional[Path] = None
    check_ocsp: bool = True
    check_crl: bool = True


class CGAClient:
    """
    CGA SDK for programmatic certification management.

    Example:
        >>> client = CGAClient(CGAClientConfig(
        ...     organization_id="urn:aigos:org:acme-corp",
        ...     signing_key_path=Path(".aigrc/keys/org-signing-key.pem")
        ... ))
        >>>
        >>> # Certify an agent
        >>> cert = await client.certify(
        ...     asset_card_path=Path("./assets/research-agent.asset.yaml"),
        ...     level=CGALevel.GOLD
        ... )
        >>> print(f"Certified at level {cert.spec.certification.level}")
    """

    def __init__(self, config: CGAClientConfig):
        self.config = config
        self._verification_engine = VerificationEngine()
        self._ca_client = CAClient(config.ca_url) if config.ca_url else None
        self._cert_cache: dict[str, CGACertificate] = {}

    async def verify(
        self,
        asset_card_path: Path,
        level: CGALevel,
        runtime_config: Optional[dict] = None
    ) -> VerificationReport:
        """
        Run certification verification for an agent.

        Args:
            asset_card_path: Path to the agent's asset card
            level: Target certification level
            runtime_config: Optional runtime configuration for live tests

        Returns:
            VerificationReport with all check results
        """
        return await self._verification_engine.verify(
            asset_card_path=asset_card_path,
            target_level=level,
            runtime_config=runtime_config
        )

    async def certify(
        self,
        asset_card_path: Path,
        level: CGALevel,
        runtime_config: Optional[dict] = None
    ) -> CGACertificate:
        """
        Submit for certification.

        For BRONZE level, generates self-signed certificate locally.
        For SILVER+, submits to the configured CA.

        Args:
            asset_card_path: Path to the agent's asset card
            level: Target certification level
            runtime_config: Optional runtime configuration

        Returns:
            Issued CGACertificate

        Raises:
            CertificationError: If verification fails
        """
        # Run verification
        report = await self.verify(asset_card_path, level, runtime_config)

        if not report.passed:
            raise CertificationError(
                f"Verification failed: {report.summary.failed} checks failed",
                report=report
            )

        # BRONZE: self-sign locally
        if level == CGALevel.BRONZE:
            return await self._self_sign(report)

        # SILVER+: submit to CA
        if not self._ca_client:
            raise ConfigurationError("CA URL required for SILVER+ certification")

        return await self._ca_client.submit_certification(
            target_level=level,
            verification_report=report,
            organization_token=await self._get_organization_token()
        )

    async def load_certificate(self, path: Path) -> CGACertificate:
        """Load and validate a CGA certificate from file."""
        import yaml

        content = path.read_text()
        cert_data = yaml.safe_load(content)
        cert = CGACertificate.from_dict(cert_data)

        # Validate signature
        if not await self._verify_certificate_signature(cert):
            raise InvalidCertificateError("Certificate signature invalid")

        return cert

    async def check_certificate(self, cert_id: str) -> CertificateStatus:
        """Check if a certificate is valid and not revoked."""
        # Check OCSP if enabled
        if self.config.check_ocsp:
            ocsp_result = await self._check_ocsp(cert_id)
            if ocsp_result.status == "REVOKED":
                return CertificateStatus(
                    valid=False,
                    reason="REVOKED",
                    revoked_at=ocsp_result.revoked_at
                )

        # Check CRL if enabled
        if self.config.check_crl:
            crl = await self._get_crl()
            if cert_id in crl:
                return CertificateStatus(valid=False, reason="REVOKED")

        return CertificateStatus(valid=True)

    def generate_token(
        self,
        certificate: CGACertificate,
        private_key: bytes,
        target_agent: str,
        action: str,
        ttl_seconds: int = 300
    ) -> str:
        """Generate a CGA-enhanced governance token."""
        generator = CGATokenGenerator(certificate, private_key)
        return generator.generate(
            target_agent=target_agent,
            action=action,
            ttl_seconds=ttl_seconds
        )

    async def verify_token(
        self,
        token: str,
        context: Optional[VerificationContext] = None
    ) -> TokenVerificationResult:
        """Verify a CGA-enhanced governance token."""
        verifier = CGATokenVerifier(
            trust_policy=self._load_trust_policy(),
            cert_cache=self._cert_cache,
            ocsp_checker=self._check_ocsp if self.config.check_ocsp else None
        )
        return await verifier.verify(token, context)


# Convenience functions
async def certify_agent(
    asset_card_path: str,
    level: str = "SILVER",
    ca_url: str = "https://cga.aigos.io"
) -> CGACertificate:
    """
    Quick certification of an agent.

    Example:
        >>> cert = await certify_agent(
        ...     "./assets/my-agent.asset.yaml",
        ...     level="GOLD"
        ... )
    """
    client = CGAClient(CGAClientConfig(ca_url=ca_url))
    return await client.certify(
        Path(asset_card_path),
        CGALevel[level.upper()]
    )


def verify_cga_token(token: str, trust_policy_path: str = None) -> TokenVerificationResult:
    """
    Quick token verification.

    Example:
        >>> result = verify_cga_token(incoming_token)
        >>> if result.valid:
        ...     print(f"Trusted agent at {result.cga_level} level")
    """
    import asyncio

    client = CGAClient(CGAClientConfig(
        trust_policy_path=Path(trust_policy_path) if trust_policy_path else None
    ))
    return asyncio.run(client.verify_token(token))
```

---

## 10. Security Considerations

### 10.1 Threat Model

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           CGA THREAT MODEL                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  THREAT 1: Certificate Forgery                                              │
│  ═══════════════════════════════                                            │
│  Attack: Attacker creates fake certificate claiming GOLD level              │
│  Mitigation:                                                                │
│    • Certificates signed by CA private key (HSM-protected)                 │
│    • Verification requires CA public key (pinned in tools)                 │
│    • Transparency log detects unauthorized issuance                        │
│                                                                             │
│  THREAT 2: Replay Attack                                                    │
│  ═══════════════════════════                                                │
│  Attack: Attacker replays old valid token after certificate revoked        │
│  Mitigation:                                                                │
│    • Tokens include certificate expiration                                 │
│    • OCSP checking for real-time revocation                                │
│    • Short token TTL (default 5 minutes)                                   │
│    • Token JTI prevents replay within validity window                      │
│                                                                             │
│  THREAT 3: Key Compromise                                                   │
│  ═════════════════════════                                                  │
│  Attack: Agent private key stolen, attacker issues tokens                  │
│  Mitigation:                                                                │
│    • Certificate revocation immediately invalidates tokens                 │
│    • Organization can revoke certificate via API                           │
│    • Key rotation recommended every 90 days                                │
│    • HSM recommended for production agents                                 │
│                                                                             │
│  THREAT 4: CA Compromise                                                    │
│  ════════════════════════                                                   │
│  Attack: CA private key stolen, attacker issues certificates               │
│  Mitigation:                                                                │
│    • Root CA key offline, air-gapped                                       │
│    • Intermediate CA keys in HSM                                           │
│    • Certificate transparency log                                          │
│    • Key ceremony with multiple custodians                                 │
│    • Cross-signing with other CAs for detection                            │
│                                                                             │
│  THREAT 5: Verification Bypass                                              │
│  ═════════════════════════════                                              │
│  Attack: Agent claims GOLD but actually fails verification                 │
│  Mitigation:                                                                │
│    • CA performs independent verification tests                            │
│    • Continuous monitoring for PLATINUM                                    │
│    • Certificate suspension on detected violations                         │
│    • Kill switch tests from CA infrastructure                              │
│                                                                             │
│  THREAT 6: Downgrade Attack                                                 │
│  ═════════════════════════                                                  │
│  Attack: Attacker tricks verifier into accepting lower level              │
│  Mitigation:                                                                │
│    • Trust policy enforced by verifier                                     │
│    • Level requirement embedded in action context                          │
│    • Audit log of trust decisions                                          │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 10.2 Key Management

```yaml
# Key management requirements by certification level

BRONZE:
  agent_key:
    algorithm: ES256
    storage: file_system
    rotation: optional
  signing:
    self_signed: true

SILVER:
  agent_key:
    algorithm: ES256
    storage: encrypted_file
    encryption: AES-256-GCM
    rotation: 180_days
  ca_signed: true

GOLD:
  agent_key:
    algorithm: ES256
    storage: [hsm, encrypted_file]
    rotation: 90_days
  organization_key:
    algorithm: ES256
    storage: hsm_recommended
  ca_signed: true

PLATINUM:
  agent_key:
    algorithm: ES256
    storage: hsm_required
    rotation: 90_days
    backup: secure_offline
  organization_key:
    algorithm: ES256
    storage: hsm_required
  ca_signed: true
  key_ceremony: required
```

### 10.3 Audit Requirements

```yaml
# Audit logging requirements

events_to_log:
  # Certification events
  - event: certification_requested
    fields: [agent_id, target_level, timestamp, requestor]
  - event: certification_issued
    fields: [certificate_id, agent_id, level, expires_at, issuer]
  - event: certification_renewed
    fields: [certificate_id, previous_expires, new_expires]
  - event: certification_revoked
    fields: [certificate_id, reason, revoked_by, effective_date]

  # Verification events
  - event: verification_started
    fields: [agent_id, target_level, timestamp]
  - event: verification_check_result
    fields: [check_name, status, evidence_hash]
  - event: verification_completed
    fields: [agent_id, achieved_level, passed, failed]

  # Token events
  - event: token_generated
    fields: [token_jti, issuer, audience, action, expires_at]
  - event: token_verified
    fields: [token_jti, issuer, result, cga_level]
  - event: token_rejected
    fields: [token_jti, issuer, reason]

  # Trust events
  - event: trust_decision
    fields: [source_agent, target_agent, action, decision, cga_level]

retention:
  default: 365_days
  compliance:
    EU_AI_ACT: 10_years
    SOX: 7_years
    HIPAA: 6_years
```

---

## 11. Deployment Models

### 11.1 Model Comparison

| Model | BRONZE | SILVER | GOLD | PLATINUM | Best For |
|-------|--------|--------|------|----------|----------|
| **Self-Service** | ✓ | - | - | - | Development, testing |
| **Public CA** | ✓ | ✓ | ✓ | ✓ | Most organizations |
| **Enterprise CA** | ✓ | ✓ | ✓ | ✓ | Large enterprises, regulated industries |
| **Hybrid** | ✓ | ✓ | ✓ | ✓ | Multi-cloud, complex environments |

### 11.2 Self-Service (BRONZE Only)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        SELF-SERVICE DEPLOYMENT                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                      Developer Machine                               │   │
│  │                                                                      │   │
│  │  $ aigrc certify --level bronze                                     │   │
│  │                                                                      │   │
│  │  1. Local verification engine runs                                  │   │
│  │  2. Self-signed certificate generated                               │   │
│  │  3. Certificate stored in .aigrc/certificates/                      │   │
│  │                                                                      │   │
│  │  No network required. No CA dependency.                             │   │
│  │                                                                      │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  Trust Model:                                                               │
│  • BRONZE certificates trusted within same organization                    │
│  • Not trusted by external parties (no third-party attestation)            │
│  • Suitable for internal development and testing                           │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 11.3 Public CA (Recommended)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        PUBLIC CA DEPLOYMENT                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Organization Network              │           AIGOS Cloud                  │
│  ══════════════════               │           ════════════                  │
│                                    │                                        │
│  ┌──────────────┐                 │    ┌──────────────────────────────┐   │
│  │   Agents     │────────────────────►│  cga.aigos.io               │   │
│  │              │   HTTPS              │                              │   │
│  │  • Submit    │◄────────────────────│  • Certificate Registry      │   │
│  │  • Renew     │                      │  • OCSP Responder            │   │
│  │  • Verify    │                      │  • Transparency Log          │   │
│  └──────────────┘                      │  • Continuous Monitoring     │   │
│                                        │                              │   │
│  Trust anchored to:                    │  99.9% SLA                   │   │
│  cga.aigos.io root cert               └──────────────────────────────┘   │
│  (bundled in AIGRC tools)                                                   │
│                                                                             │
│  Benefits:                                                                  │
│  • No infrastructure to manage                                             │
│  • Globally trusted certificates                                           │
│  • Built-in monitoring and revocation                                      │
│  • Pay-per-certificate pricing                                             │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 11.4 Enterprise CA

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        ENTERPRISE CA DEPLOYMENT                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Organization Data Center                                                   │
│  ══════════════════════════════════════════════════════════════            │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    Enterprise CA Cluster                             │   │
│  │                                                                      │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                 │   │
│  │  │   CA Pod 1  │  │   CA Pod 2  │  │   CA Pod 3  │                 │   │
│  │  │             │  │             │  │             │                 │   │
│  │  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘                 │   │
│  │         └────────────────┼────────────────┘                         │   │
│  │                          │                                          │   │
│  │                    ┌─────┴─────┐                                    │   │
│  │                    │    HSM    │  (CloudHSM / Vault)                │   │
│  │                    │           │                                    │   │
│  │                    │  Root Key │                                    │   │
│  │                    │  Int Key  │                                    │   │
│  │                    └───────────┘                                    │   │
│  │                                                                      │   │
│  │  ┌─────────────────────────────────────────────────────────────┐   │   │
│  │  │                    PostgreSQL Cluster                        │   │   │
│  │  │  • Certificates  • Audit logs  • Revocation list            │   │   │
│  │  └─────────────────────────────────────────────────────────────┘   │   │
│  │                                                                      │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                    │                                        │
│                                    │ Cross-sign (optional)                  │
│                                    ▼                                        │
│                          ┌─────────────────┐                                │
│                          │  cga.aigos.io   │                                │
│                          │  (Public trust) │                                │
│                          └─────────────────┘                                │
│                                                                             │
│  Benefits:                                                                  │
│  • Data sovereignty - certificates never leave your network                │
│  • Air-gapped deployment option                                            │
│  • Custom certification policies                                           │
│  • Integration with existing PKI                                           │
│  • Cross-sign with public CA for external trust                            │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 11.5 Hybrid Model

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          HYBRID DEPLOYMENT                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌───────────────────────────────┐    ┌───────────────────────────────┐   │
│  │     Internal Agents           │    │     External Agents           │   │
│  │     (Enterprise CA)           │    │     (Public CA)               │   │
│  │                               │    │                               │   │
│  │  • HR chatbot                 │    │  • Customer service bot       │   │
│  │  • Internal research agent    │    │  • Partner integration agent  │   │
│  │  • DevOps automation          │    │  • Public API agent           │   │
│  │                               │    │                               │   │
│  │  Certified by:                │    │  Certified by:                │   │
│  │  Enterprise CA                │    │  cga.aigos.io                 │   │
│  │  (air-gapped)                 │    │  (public trust)               │   │
│  │                               │    │                               │   │
│  └───────────────┬───────────────┘    └───────────────┬───────────────┘   │
│                  │                                    │                    │
│                  │    ┌────────────────────────┐      │                    │
│                  └───►│   Trust Federation     │◄─────┘                    │
│                       │                        │                           │
│                       │  • Enterprise CA cross-│                           │
│                       │    signed by Public CA │                           │
│                       │  • Unified trust policy│                           │
│                       │  • Central audit log   │                           │
│                       │                        │                           │
│                       └────────────────────────┘                           │
│                                                                             │
│  Internal agents can communicate with external agents because:              │
│  • Enterprise CA is cross-signed by Public CA                              │
│  • Both trust the Public CA root                                           │
│  • Trust policy allows cross-CA communication                              │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Appendix A: Implementation Roadmap

| Phase | Deliverables | Dependencies |
|-------|--------------|--------------|
| **Phase 1** | Certificate schema, Verification engine, CLI `aigrc certify` (BRONZE) | Core AIGRC packages |
| **Phase 2** | CA API specification, Hosted CA MVP (SILVER), SDK integration | Phase 1 |
| **Phase 3** | GOLD certification, Continuous monitoring, OCSP/CRL | Phase 2 |
| **Phase 4** | PLATINUM certification, Enterprise CA helm chart, Cross-signing | Phase 3 |
| **Phase 5** | Transparency log, Third-party auditor integrations, Insurance partnerships | Phase 4 |

---

## Appendix B: Pricing Model (Hosted CA)

| Tier | Certificates | Levels | Price |
|------|--------------|--------|-------|
| **Free** | 5 | BRONZE only | $0/month |
| **Starter** | 25 | BRONZE, SILVER | $99/month |
| **Professional** | 100 | All levels | $499/month |
| **Enterprise** | Unlimited | All levels + SLA | Custom |

---

## Appendix C: Related Specifications

- SPEC-RT-001: Runtime Identity and Policy Engine
- SPEC-RT-002: Kill Switch and Control Plane
- SPEC-PRT-001: Asset Card Schema
- SPEC-PRT-002: Golden Thread Verification
- SPEC-A2A-001: Agent-to-Agent Trust Protocol

---

*Document Version: 1.0.0*
*Created: January 9, 2026*
*Classification: PUBLIC*
