# A2A B2B Procurement Extension Design Specification

**Version:** 1.0.0
**Status:** Draft
**Author:** AIGOS Architecture Team
**Date:** 2025-02-15

---

## Executive Summary

This specification extends the AIGOS Agent-to-Agent (A2A) Governance Token Protocol to support Business-to-Business (B2B) procurement use cases. It enables autonomous AI agents to engage in commercial transactions, negotiate contracts, and execute purchases on behalf of enterprises while maintaining full governance, accountability, and audit trails.

---

## 1. Introduction

### 1.1 Purpose

The A2A B2B Procurement Extension enables:
- Autonomous agent-to-agent commercial transactions
- Multi-party procurement negotiations
- Smart contract execution with governance guardrails
- Enterprise-grade audit trails for agent commerce
- Vendor-agnostic federation of agent marketplaces

### 1.2 Scope

This specification covers:
- Extended JWT claims for procurement authority
- Procurement capability delegation model
- Transaction authorization protocol
- Multi-party negotiation framework
- Settlement and reconciliation

### 1.3 Relationship to Base A2A Protocol

This extension builds on `SPEC-PRT-003` (AIGOS Governance Token) and `AIGOS-E9` (A2A Authentication). All base A2A requirements apply, with additional claims and flows for procurement.

---

## 2. Procurement Authority Model

### 2.1 Procurement Capability Claims

Extended AIGOS token claims for procurement authority:

```typescript
interface ProcurementAuthorityClaims {
  // Budget authority
  budget: {
    currency: string;                    // ISO 4217 currency code
    max_single_transaction: number;      // Maximum per-transaction
    max_daily_total: number;             // Daily spending limit
    max_weekly_total: number;            // Weekly spending limit
    requires_approval_above: number;     // Threshold for human approval
    approved_categories: string[];       // Approved spend categories
    blocked_vendors: string[];           // Blocked vendor identifiers
  };

  // Contract authority
  contracts: {
    may_sign_contracts: boolean;         // Can bind organization legally
    max_contract_duration_days: number;  // Maximum contract length
    max_contract_value: number;          // Maximum total contract value
    requires_legal_review_above: number; // Threshold for legal review
    allowed_contract_types: string[];    // SaaS, perpetual, etc.
  };

  // Negotiation authority
  negotiation: {
    may_negotiate: boolean;              // Can engage in price negotiation
    max_discount_request: number;        // Maximum discount % to request
    may_counter_offer: boolean;          // Can make counter-offers
    max_negotiation_rounds: number;      // Maximum back-and-forth
    escalation_contact: string;          // Human escalation point
  };

  // Approval chain
  approvals: {
    auto_approve_below: number;          // Auto-approve threshold
    approval_chain: ApprovalLevel[];     // Required approvers by tier
    emergency_approver: string;          // Emergency override contact
  };
}

interface ApprovalLevel {
  threshold: number;                     // Spending threshold
  approver_role: string;                 // Required approver role
  approver_id?: string;                  // Specific approver (optional)
  timeout_hours: number;                 // Approval timeout
  escalation_action: "auto_reject" | "escalate" | "notify";
}
```

### 2.2 Procurement Token Structure

```typescript
interface ProcurementToken extends GovernanceTokenPayload {
  aigos: {
    // ... base A2A claims

    procurement: {
      authority: ProcurementAuthorityClaims;
      organization: {
        legal_name: string;
        tax_id: string;
        billing_address: Address;
        procurement_contact: Contact;
      };
      context: {
        requisition_id?: string;         // Internal requisition number
        project_code?: string;           // Budget project code
        cost_center: string;             // Cost center for allocation
        department: string;              // Requesting department
      };
    };
  };
}
```

---

## 3. Transaction Authorization Protocol

### 3.1 Transaction Flow

```
┌─────────────┐         ┌─────────────┐         ┌─────────────┐
│  Buyer      │         │  Vendor     │         │  Governance │
│  Agent      │         │  Agent      │         │  Service    │
└──────┬──────┘         └──────┬──────┘         └──────┬──────┘
       │                       │                       │
       │  1. Discovery Request │                       │
       │──────────────────────>│                       │
       │                       │                       │
       │  2. Catalog Response  │                       │
       │<──────────────────────│                       │
       │                       │                       │
       │  3. Quote Request     │                       │
       │──────────────────────>│                       │
       │                       │                       │
       │  4. Quote Response    │                       │
       │<──────────────────────│                       │
       │                       │                       │
       │  5. Authorization Request                     │
       │───────────────────────────────────────────────>
       │                       │                       │
       │  6. Authorization Grant/Deny                  │
       │<───────────────────────────────────────────────
       │                       │                       │
       │  7. Purchase Order    │                       │
       │──────────────────────>│                       │
       │                       │                       │
       │  8. Order Confirmation│                       │
       │<──────────────────────│                       │
       │                       │                       │
       │  9. Settlement Report │                       │
       │───────────────────────────────────────────────>
       │                       │                       │
```

### 3.2 Transaction Authorization Request

```typescript
interface TransactionAuthorizationRequest {
  transaction_id: string;                // Unique transaction ID
  timestamp: string;                     // ISO 8601 timestamp
  buyer: {
    agent_instance_id: string;           // Buyer agent ID
    organization_id: string;             // Buyer organization
    procurement_token: string;           // JWT with procurement claims
  };
  vendor: {
    agent_instance_id?: string;          // Vendor agent ID (if A2A)
    organization_id: string;             // Vendor organization
    verification_token?: string;         // Vendor's governance token
  };
  transaction: {
    type: "purchase" | "subscription" | "service";
    items: TransactionItem[];
    total_amount: number;
    currency: string;
    payment_terms: string;
    delivery_terms?: string;
  };
  governance: {
    risk_assessment: RiskAssessment;
    compliance_checks: ComplianceCheck[];
    approval_requests: ApprovalRequest[];
  };
}

interface TransactionItem {
  sku: string;
  description: string;
  quantity: number;
  unit_price: number;
  category: string;
  vendor_product_id?: string;
}

interface RiskAssessment {
  overall_risk: "low" | "medium" | "high" | "critical";
  factors: RiskFactor[];
  recommendations: string[];
}

interface RiskFactor {
  factor: string;
  severity: "info" | "warning" | "critical";
  details: string;
}
```

### 3.3 Authorization Response

```typescript
interface TransactionAuthorizationResponse {
  transaction_id: string;
  authorization_id: string;              // Unique auth ID for tracking
  status: "approved" | "denied" | "pending_approval" | "escalated";
  timestamp: string;

  approval?: {
    authorized_by: "automatic" | "human" | "policy";
    approver_id?: string;
    authorization_token: string;         // Signed auth token
    valid_until: string;                 // Authorization expiry
    conditions: string[];                // Approval conditions
  };

  denial?: {
    reason_code: string;
    reason_message: string;
    policy_violated?: string;
    remediation_steps?: string[];
  };

  pending?: {
    awaiting_approval_from: string;
    expected_response_by: string;
    escalation_time: string;
  };
}
```

---

## 4. Multi-Party Negotiation Protocol

### 4.1 Negotiation Session

```typescript
interface NegotiationSession {
  session_id: string;
  created_at: string;
  expires_at: string;
  status: "active" | "agreed" | "failed" | "expired" | "withdrawn";

  parties: NegotiationParty[];

  subject: {
    type: "product" | "service" | "contract";
    reference_id: string;
    description: string;
    initial_terms: NegotiationTerms;
  };

  rounds: NegotiationRound[];

  agreement?: {
    final_terms: NegotiationTerms;
    agreed_at: string;
    binding_from: string;
  };
}

interface NegotiationParty {
  role: "buyer" | "vendor" | "mediator";
  agent_id: string;
  organization_id: string;
  authority_level: number;               // 0-100 negotiation authority
  constraints: NegotiationConstraints;
}

interface NegotiationConstraints {
  min_acceptable_price?: number;
  max_acceptable_price?: number;
  required_terms: string[];
  forbidden_terms: string[];
  max_rounds: number;
}

interface NegotiationRound {
  round_number: number;
  timestamp: string;
  proposer: string;                      // Party agent ID
  proposal: NegotiationTerms;
  rationale?: string;
  responses: NegotiationResponse[];
}

interface NegotiationTerms {
  price: number;
  currency: string;
  quantity?: number;
  delivery_date?: string;
  payment_terms: string;
  warranty_terms?: string;
  sla_terms?: string;
  custom_terms: Record<string, unknown>;
}

interface NegotiationResponse {
  responder: string;                     // Party agent ID
  action: "accept" | "counter" | "reject" | "escalate";
  counter_terms?: NegotiationTerms;
  reason?: string;
  timestamp: string;
}
```

### 4.2 Negotiation Protocol Messages

#### PROPOSE

```json
{
  "type": "negotiation.propose",
  "session_id": "neg-123-456",
  "round": 1,
  "proposal": {
    "price": 9500.00,
    "currency": "USD",
    "payment_terms": "net_30",
    "delivery_date": "2025-03-01"
  },
  "rationale": "Volume discount applied based on 100+ unit order",
  "valid_until": "2025-02-20T17:00:00Z"
}
```

#### COUNTER

```json
{
  "type": "negotiation.counter",
  "session_id": "neg-123-456",
  "round": 1,
  "in_response_to": "proposal_round_1",
  "counter_proposal": {
    "price": 8800.00,
    "currency": "USD",
    "payment_terms": "net_30",
    "delivery_date": "2025-03-01"
  },
  "rationale": "Requesting additional discount based on long-term relationship",
  "valid_until": "2025-02-21T17:00:00Z"
}
```

#### ACCEPT

```json
{
  "type": "negotiation.accept",
  "session_id": "neg-123-456",
  "round": 2,
  "accepted_terms": {
    "price": 9000.00,
    "currency": "USD",
    "payment_terms": "net_30",
    "delivery_date": "2025-03-01"
  },
  "binding_commitment": true,
  "authorization_token": "eyJ..."
}
```

---

## 5. Vendor Discovery and Federation

### 5.1 Vendor Registry Protocol

```typescript
interface VendorRegistration {
  vendor_id: string;                     // Unique vendor identifier
  organization: {
    legal_name: string;
    dba_name?: string;
    jurisdiction: string;
    tax_id: string;
    duns_number?: string;
  };

  capabilities: {
    product_categories: string[];
    service_categories: string[];
    geographic_regions: string[];
    certifications: Certification[];
  };

  commerce: {
    accepts_a2a_transactions: boolean;
    supported_currencies: string[];
    payment_methods: string[];
    contract_types: string[];
    min_order_value?: number;
  };

  governance: {
    governance_token_endpoint: string;   // JWKS endpoint
    a2a_endpoint: string;                // A2A API endpoint
    supported_protocols: string[];
    compliance_certifications: string[];
  };
}

interface VendorDiscoveryRequest {
  search_criteria: {
    categories?: string[];
    keywords?: string[];
    certifications?: string[];
    regions?: string[];
    min_rating?: number;
  };
  buyer_requirements: {
    budget_range?: { min: number; max: number };
    delivery_timeline?: string;
    required_certifications?: string[];
  };
  pagination: {
    limit: number;
    offset: number;
  };
}
```

### 5.2 Federation Model

```
┌─────────────────────────────────────────────────────────────────┐
│                     AIGOS Federation Layer                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐         │
│  │   Vendor    │    │   Vendor    │    │   Vendor    │         │
│  │  Registry A │    │  Registry B │    │  Registry C │         │
│  │  (Cloud X)  │    │ (Enterprise)│    │(Marketplace)│         │
│  └──────┬──────┘    └──────┬──────┘    └──────┬──────┘         │
│         │                  │                  │                  │
│         └──────────────────┴──────────────────┘                  │
│                            │                                      │
│                    ┌───────┴───────┐                             │
│                    │  Federation   │                             │
│                    │    Gateway    │                             │
│                    └───────┬───────┘                             │
│                            │                                      │
│              ┌─────────────┼─────────────┐                       │
│              │             │             │                       │
│         ┌────┴────┐   ┌────┴────┐   ┌────┴────┐                │
│         │ Buyer   │   │ Buyer   │   │ Buyer   │                │
│         │ Agent 1 │   │ Agent 2 │   │ Agent 3 │                │
│         └─────────┘   └─────────┘   └─────────┘                │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

---

## 6. Settlement and Reconciliation

### 6.1 Settlement Report

```typescript
interface SettlementReport {
  settlement_id: string;
  period: {
    start: string;
    end: string;
  };

  transactions: SettledTransaction[];

  totals: {
    transaction_count: number;
    total_value: number;
    currency: string;
    fees: number;
    net_amount: number;
  };

  reconciliation: {
    status: "reconciled" | "pending" | "disputed";
    discrepancies: Discrepancy[];
    audit_hash: string;                  // Hash of all transaction hashes
  };

  signatures: {
    buyer_signature: string;
    vendor_signature: string;
    timestamp: string;
  };
}

interface SettledTransaction {
  transaction_id: string;
  authorization_id: string;
  purchase_order_id: string;
  invoice_id?: string;

  amount: number;
  currency: string;
  settlement_date: string;

  status: "settled" | "pending" | "disputed" | "reversed";

  audit_trail: {
    governance_decisions: string[];
    approval_chain: string[];
    transaction_hash: string;
  };
}
```

### 6.2 Audit Trail Requirements

Every procurement transaction MUST generate an immutable audit trail:

```typescript
interface ProcurementAuditEntry {
  entry_id: string;
  timestamp: string;
  transaction_id: string;

  event_type:
    | "transaction.initiated"
    | "authorization.requested"
    | "authorization.granted"
    | "authorization.denied"
    | "negotiation.round"
    | "negotiation.agreed"
    | "order.placed"
    | "order.confirmed"
    | "settlement.completed"
    | "dispute.raised"
    | "dispute.resolved";

  actors: {
    agent_id: string;
    organization_id: string;
    human_id?: string;                   // If human-in-the-loop
  };

  data: {
    before_state?: unknown;
    after_state?: unknown;
    decision_rationale?: string;
  };

  governance: {
    policy_evaluated: string[];
    constraints_checked: string[];
    approval_level: string;
  };

  cryptographic: {
    entry_hash: string;
    previous_hash: string;
    signature: string;
  };
}
```

---

## 7. Security Considerations

### 7.1 Procurement Token Security

- Procurement tokens MUST have shorter lifetimes than standard A2A tokens (max 1 hour)
- High-value transactions MUST require fresh token issuance
- Tokens MUST be bound to specific transaction contexts
- Multi-factor authorization REQUIRED above configurable thresholds

### 7.2 Transaction Non-Repudiation

- All transaction messages MUST be cryptographically signed
- Complete message chains MUST be preserved
- Timestamping MUST use trusted time sources
- Settlement MUST include mutual signatures

### 7.3 Rate Limiting

- Procurement APIs MUST implement per-organization rate limits
- Anomaly detection SHOULD flag unusual transaction patterns
- Kill switch MUST be able to halt all procurement activity

---

## 8. Compliance Mappings

### 8.1 SOX Compliance

| Requirement | Implementation |
|-------------|----------------|
| Segregation of duties | Approval chains with role requirements |
| Authorization controls | Tiered spending limits |
| Audit trails | Immutable audit entries with hashing |
| Change management | Governance policy versioning |

### 8.2 GDPR Considerations

- Vendor data minimization in transaction records
- Right to erasure balanced with audit requirements
- Data processing agreements as contract terms

### 8.3 PCI-DSS (if payment data involved)

- Payment details MUST NOT appear in governance tokens
- Settlement references external payment processors
- Tokenization of payment instruments

---

## 9. Implementation Guidelines

### 9.1 Minimum Viable Implementation

1. Extend A2A tokens with `procurement` claims
2. Implement transaction authorization endpoint
3. Create audit trail storage
4. Build basic settlement reporting

### 9.2 Full Implementation

1. Complete negotiation protocol
2. Vendor federation
3. Multi-party contracts
4. Advanced analytics and anomaly detection
5. Integration with ERP/procurement systems

### 9.3 Integration Points

| System | Integration Method |
|--------|-------------------|
| SAP Ariba | REST API webhook |
| Coupa | Event streaming |
| Oracle Procurement | SOAP/REST adapter |
| Custom ERP | AIGOS SDK |

---

## 10. Future Considerations

### 10.1 Smart Contract Integration

- Blockchain-based escrow for high-value transactions
- Automated milestone-based payments
- Decentralized dispute resolution

### 10.2 AI-Powered Optimization

- Spend analytics and recommendations
- Vendor performance prediction
- Dynamic negotiation strategies

### 10.3 Cross-Border Commerce

- Multi-currency settlement
- Tax and tariff calculation
- Export control compliance

---

## Appendix A: JWT Claim Examples

### A.1 Complete Procurement Token

```json
{
  "iss": "aigos-procurement",
  "sub": "agent-procurement-001",
  "aud": "vendor-marketplace",
  "exp": 1739721600,
  "iat": 1739718000,
  "jti": "proc-token-abc123",
  "aigos": {
    "identity": {
      "instance_id": "550e8400-e29b-41d4-a716-446655440000",
      "asset_id": "procurement-agent-v1",
      "risk_level": "limited"
    },
    "governance": {
      "golden_thread": {
        "hash": "sha256:abcd1234..."
      }
    },
    "procurement": {
      "authority": {
        "budget": {
          "currency": "USD",
          "max_single_transaction": 50000,
          "max_daily_total": 200000,
          "requires_approval_above": 25000,
          "approved_categories": ["software", "cloud_services", "consulting"]
        },
        "contracts": {
          "may_sign_contracts": true,
          "max_contract_duration_days": 365,
          "max_contract_value": 100000
        },
        "negotiation": {
          "may_negotiate": true,
          "max_discount_request": 25,
          "max_negotiation_rounds": 5
        }
      },
      "organization": {
        "legal_name": "Acme Corporation",
        "tax_id": "XX-1234567",
        "cost_center": "IT-CLOUD-001"
      }
    }
  }
}
```

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2025-02-15 | Initial specification |

---

*This specification is part of the AIGOS/AIGRC specification suite.*
