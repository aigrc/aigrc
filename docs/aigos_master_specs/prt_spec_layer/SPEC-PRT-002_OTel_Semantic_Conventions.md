# SPEC-PRT-002: OpenTelemetry Semantic Conventions

## Document Information

| Field | Value |
|-------|-------|
| **Spec ID** | SPEC-PRT-002 |
| **Version** | 1.0.0-draft |
| **Status** | Draft |
| **Category** | Protocol |
| **Last Updated** | 2025-12-29 |
| **Authors** | GovOS Team |
| **License** | Apache 2.0 |

---

## Dependencies

### Required Specifications

| Spec ID | Name | Why Required |
|---------|------|--------------|
| SPEC-RT-004 | Telemetry Emitter | Emits spans using these conventions |

### External Standards

| Standard | Version | URL |
|----------|---------|-----|
| OpenTelemetry Semantic Conventions | 1.25.0 | https://opentelemetry.io/docs/specs/semconv/ |
| OpenTelemetry Trace Specification | 1.0 | https://opentelemetry.io/docs/specs/otel/trace/ |

---

## Abstract

This specification defines the OpenTelemetry semantic conventions for AIGOS governance telemetry. It establishes a standard vocabulary for span names, attribute names, and attribute values used in governance observability. Following these conventions ensures interoperability with OTel-compatible backends and enables standardized dashboards and alerting.

---

## 1. Introduction

### 1.1 Purpose

Semantic conventions provide:

1. **Consistency** — Same attribute names across all implementations
2. **Interoperability** — Works with any OTel-compatible backend
3. **Queryability** — Predictable attribute names for dashboards/alerts
4. **Comparability** — Metrics can be aggregated across organizations

### 1.2 Namespace

All AIGOS governance attributes use the `aigos.` namespace prefix:

```
aigos.{category}.{attribute}

Examples:
aigos.identity.instance_id
aigos.decision.result
aigos.violation.severity
```

### 1.3 Attribute Types

| OTel Type | Usage |
|-----------|-------|
| `string` | Most attributes |
| `int` | Counts, depths, limits |
| `double` | Costs, percentages, durations |
| `bool` | Flags (verified, dry_run) |
| `string[]` | Lists (tools, domains) |

---

## 2. Resource Attributes

Resource attributes are set once at SDK initialization and apply to all spans.

### 2.1 Standard Resource Attributes

| Attribute | Type | Required | Description |
|-----------|------|----------|-------------|
| `service.name` | string | Yes | Name of the AI agent service |
| `service.version` | string | Yes | Version of the agent |
| `service.namespace` | string | No | Namespace (e.g., "production") |

### 2.2 AIGOS Resource Attributes

| Attribute | Type | Required | Description |
|-----------|------|----------|-------------|
| `aigos.sdk.name` | string | Yes | SDK name (`@aigos/runtime` or `aigos-python`) |
| `aigos.sdk.version` | string | Yes | SDK version |
| `aigos.organization.id` | string | No | Organization identifier |
| `aigos.environment` | string | No | Environment (`production`, `staging`, `development`) |

### 2.3 Example Resource

```yaml
Resource:
  service.name: "financial-analysis-agent"
  service.version: "1.2.0"
  service.namespace: "production"
  aigos.sdk.name: "@aigos/runtime"
  aigos.sdk.version: "1.0.0"
  aigos.organization.id: "org-acme-corp"
  aigos.environment: "production"
```

---

## 3. Identity Attributes

Attributes describing agent identity, present on all governance spans.

### 3.1 Core Identity

| Attribute | Type | Required | Description |
|-----------|------|----------|-------------|
| `aigos.instance_id` | string | Yes | Unique instance identifier (UUID) |
| `aigos.asset_id` | string | Yes | Asset Card identifier |
| `aigos.asset_name` | string | Yes | Human-readable asset name |
| `aigos.asset_version` | string | No | Asset version |

### 3.2 Classification

| Attribute | Type | Required | Description |
|-----------|------|----------|-------------|
| `aigos.risk_level` | string | Yes | Risk classification |
| `aigos.identity.verified` | bool | Yes | Golden Thread verification status |
| `aigos.identity.mode` | string | Yes | Operating mode |

**Allowed values for `aigos.risk_level`:**
- `minimal`
- `limited`
- `high`
- `unacceptable`

**Allowed values for `aigos.identity.mode`:**
- `NORMAL`
- `SANDBOX`
- `RESTRICTED`

### 3.3 Lineage

| Attribute | Type | Required | Description |
|-----------|------|----------|-------------|
| `aigos.lineage.parent_instance_id` | string | No | Parent's instance ID (null for root) |
| `aigos.lineage.root_instance_id` | string | No | Root agent's instance ID |
| `aigos.lineage.generation_depth` | int | Yes | Generations from root (0 = root) |

### 3.4 Golden Thread

| Attribute | Type | Required | Description |
|-----------|------|----------|-------------|
| `aigos.golden_thread.hash` | string | No | Golden Thread hash |
| `aigos.golden_thread.ticket_id` | string | No | Jira/ADO ticket ID |
| `aigos.golden_thread.approved_by` | string | No | Approver email |

---

## 4. Span Types and Attributes

### 4.1 Identity Span

**Span Name:** `aigos.governance.identity`

Emitted when an agent identity is created.

| Attribute | Type | Required | Description |
|-----------|------|----------|-------------|
| `aigos.identity.instance_id` | string | Yes | New instance ID |
| `aigos.identity.asset_id` | string | Yes | Asset ID |
| `aigos.identity.verified` | bool | Yes | Verification result |
| `aigos.identity.mode` | string | Yes | Operating mode |
| `aigos.identity.verification_time_ms` | double | No | Verification duration |
| `aigos.identity.golden_thread_hash` | string | No | Computed hash |

**Example:**
```yaml
Span:
  name: "aigos.governance.identity"
  kind: INTERNAL
  status: OK
  attributes:
    aigos.instance_id: "550e8400-e29b-41d4-a716-446655440000"
    aigos.asset_id: "fin-agent-001"
    aigos.identity.verified: true
    aigos.identity.mode: "NORMAL"
    aigos.identity.verification_time_ms: 12.5
    aigos.identity.golden_thread_hash: "sha256:7d865e..."
    aigos.lineage.generation_depth: 0
```

---

### 4.2 Decision Span

**Span Name:** `aigos.governance.decision`

Emitted for every policy permission check.

| Attribute | Type | Required | Description |
|-----------|------|----------|-------------|
| `aigos.decision.action` | string | Yes | Action being checked |
| `aigos.decision.resource` | string | No | Resource being accessed |
| `aigos.decision.result` | string | Yes | Decision result |
| `aigos.decision.reason` | string | No | Reason for decision |
| `aigos.decision.denied_by` | string | No | Which check denied |
| `aigos.decision.evaluation_time_ms` | double | Yes | Evaluation duration |
| `aigos.decision.dry_run` | bool | Yes | Whether dry-run mode |

**Allowed values for `aigos.decision.result`:**
- `ALLOWED` — Permission granted
- `DENIED` — Permission denied
- `WOULD_DENY` — Would deny (dry-run mode)

**Allowed values for `aigos.decision.denied_by`:**
- `kill_switch`
- `capability`
- `resource`
- `budget`
- `rate_limit`
- `schedule`
- `custom`

**Example:**
```yaml
Span:
  name: "aigos.governance.decision"
  kind: INTERNAL
  status: OK
  attributes:
    aigos.instance_id: "550e8400-e29b-41d4-a716-446655440000"
    aigos.decision.action: "tool_call"
    aigos.decision.resource: "web_search"
    aigos.decision.result: "ALLOWED"
    aigos.decision.evaluation_time_ms: 0.8
    aigos.decision.dry_run: false
```

---

### 4.3 Violation Span

**Span Name:** `aigos.governance.violation`

Emitted when a permission is denied.

| Attribute | Type | Required | Description |
|-----------|------|----------|-------------|
| `aigos.violation.action` | string | Yes | Attempted action |
| `aigos.violation.resource` | string | No | Attempted resource |
| `aigos.violation.reason` | string | Yes | Denial reason |
| `aigos.violation.denied_by` | string | Yes | Which check denied |
| `aigos.violation.severity` | string | Yes | Violation severity |

**Allowed values for `aigos.violation.severity`:**
- `warning` — Policy would deny but didn't (dry-run)
- `error` — Standard policy violation
- `critical` — Severe violation (e.g., kill switch bypass attempt)

**Example:**
```yaml
Span:
  name: "aigos.governance.violation"
  kind: INTERNAL
  status: ERROR
  attributes:
    aigos.instance_id: "550e8400-e29b-41d4-a716-446655440000"
    aigos.violation.action: "shell_exec"
    aigos.violation.resource: "rm -rf /"
    aigos.violation.reason: "Action in denied_tools"
    aigos.violation.denied_by: "capability"
    aigos.violation.severity: "critical"
```

---

### 4.4 Budget Span

**Span Name:** `aigos.governance.budget`

Emitted when cost is incurred.

| Attribute | Type | Required | Description |
|-----------|------|----------|-------------|
| `aigos.budget.cost` | double | Yes | Cost of this operation (USD) |
| `aigos.budget.currency` | string | Yes | Currency code |
| `aigos.budget.operation` | string | Yes | What incurred the cost |
| `aigos.budget.session_total` | double | Yes | Total session cost so far |
| `aigos.budget.daily_total` | double | Yes | Total daily cost so far |
| `aigos.budget.session_limit` | double | No | Session budget limit |
| `aigos.budget.daily_limit` | double | No | Daily budget limit |
| `aigos.budget.session_remaining` | double | No | Remaining session budget |
| `aigos.budget.daily_remaining` | double | No | Remaining daily budget |
| `aigos.budget.tokens_used` | int | No | Tokens used (if LLM call) |

**Example:**
```yaml
Span:
  name: "aigos.governance.budget"
  kind: INTERNAL
  status: OK
  attributes:
    aigos.instance_id: "550e8400-e29b-41d4-a716-446655440000"
    aigos.budget.cost: 0.05
    aigos.budget.currency: "USD"
    aigos.budget.operation: "llm_inference"
    aigos.budget.session_total: 2.35
    aigos.budget.daily_total: 15.20
    aigos.budget.session_limit: 10.0
    aigos.budget.daily_limit: 100.0
    aigos.budget.session_remaining: 7.65
    aigos.budget.tokens_used: 1500
```

---

### 4.5 Terminate Span

**Span Name:** `aigos.governance.terminate`

Emitted when agent terminates.

| Attribute | Type | Required | Description |
|-----------|------|----------|-------------|
| `aigos.terminate.reason` | string | Yes | Why agent terminated |
| `aigos.terminate.source` | string | Yes | What triggered termination |
| `aigos.terminate.initiated_by` | string | No | Who initiated (for kill switch) |
| `aigos.terminate.command_id` | string | No | Kill switch command ID |
| `aigos.terminate.graceful` | bool | Yes | Whether shutdown was graceful |
| `aigos.terminate.uptime_seconds` | double | No | Agent uptime before termination |

**Allowed values for `aigos.terminate.source`:**
- `kill_switch` — Remote kill switch command
- `budget_exceeded` — Budget limit reached
- `policy_violation` — Unrecoverable policy violation
- `graceful` — Normal shutdown
- `error` — Unhandled error
- `parent_terminated` — Parent agent terminated (cascade)

**Example:**
```yaml
Span:
  name: "aigos.governance.terminate"
  kind: INTERNAL
  status: OK
  attributes:
    aigos.instance_id: "550e8400-e29b-41d4-a716-446655440000"
    aigos.terminate.reason: "Kill switch activated by CISO"
    aigos.terminate.source: "kill_switch"
    aigos.terminate.initiated_by: "ciso@corp.com"
    aigos.terminate.command_id: "cmd-123e4567-e89b"
    aigos.terminate.graceful: true
    aigos.terminate.uptime_seconds: 3600.5
```

---

### 4.6 Spawn Span

**Span Name:** `aigos.governance.spawn`

Emitted when a child agent is created.

| Attribute | Type | Required | Description |
|-----------|------|----------|-------------|
| `aigos.spawn.parent_instance_id` | string | Yes | Parent's instance ID |
| `aigos.spawn.child_instance_id` | string | Yes | Child's instance ID |
| `aigos.spawn.child_asset_id` | string | Yes | Child's asset ID |
| `aigos.spawn.generation_depth` | int | Yes | Child's generation depth |
| `aigos.spawn.capability_mode` | string | Yes | How capabilities were inherited |
| `aigos.spawn.capabilities_decayed` | bool | Yes | Whether decay was applied |
| `aigos.spawn.tools_granted` | string[] | No | Tools granted to child |
| `aigos.spawn.tools_removed` | string[] | No | Tools removed by decay |

**Allowed values for `aigos.spawn.capability_mode`:**
- `decay`
- `explicit`
- `inherit`

**Example:**
```yaml
Span:
  name: "aigos.governance.spawn"
  kind: INTERNAL
  status: OK
  attributes:
    aigos.instance_id: "550e8400-e29b-41d4-a716-446655440000"
    aigos.spawn.parent_instance_id: "550e8400-e29b-41d4-a716-446655440000"
    aigos.spawn.child_instance_id: "661f9511-f30c-52e5-b827-557766551111"
    aigos.spawn.child_asset_id: "research-agent"
    aigos.spawn.generation_depth: 1
    aigos.spawn.capability_mode: "decay"
    aigos.spawn.capabilities_decayed: true
    aigos.spawn.tools_removed: ["send_email"]
```

---

### 4.7 Action Span

**Span Name:** `aigos.governance.action`

Emitted when tracing a governed action (via `traceAction()`).

| Attribute | Type | Required | Description |
|-----------|------|----------|-------------|
| `aigos.action.name` | string | Yes | Action name |
| `aigos.action.type` | string | No | Action type (llm, tool, api) |
| `aigos.action.status` | string | Yes | Action status |
| `aigos.action.duration_ms` | double | Yes | Action duration |
| `aigos.action.error` | string | No | Error message if failed |

**Allowed values for `aigos.action.status`:**
- `success`
- `failure`
- `timeout`
- `cancelled`

**Example:**
```yaml
Span:
  name: "aigos.governance.action"
  kind: INTERNAL
  status: OK
  attributes:
    aigos.instance_id: "550e8400-e29b-41d4-a716-446655440000"
    aigos.action.name: "llm_inference"
    aigos.action.type: "llm"
    aigos.action.status: "success"
    aigos.action.duration_ms: 850.5
    # Custom attributes passed to traceAction()
    model: "gpt-4"
    prompt_tokens: 150
    completion_tokens: 500
```

---

## 5. Metrics

### 5.1 Counter Metrics

| Metric Name | Type | Unit | Description |
|-------------|------|------|-------------|
| `aigos.decisions.total` | Counter | `{decision}` | Total permission checks |
| `aigos.decisions.allowed` | Counter | `{decision}` | Allowed decisions |
| `aigos.decisions.denied` | Counter | `{decision}` | Denied decisions |
| `aigos.violations.total` | Counter | `{violation}` | Total violations |
| `aigos.spawns.total` | Counter | `{spawn}` | Total child agents spawned |
| `aigos.terminations.total` | Counter | `{termination}` | Total terminations |

### 5.2 Gauge Metrics

| Metric Name | Type | Unit | Description |
|-------------|------|------|-------------|
| `aigos.budget.session_used` | Gauge | `USD` | Current session cost |
| `aigos.budget.daily_used` | Gauge | `USD` | Current daily cost |
| `aigos.agents.active` | Gauge | `{agent}` | Active agent instances |

### 5.3 Histogram Metrics

| Metric Name | Type | Unit | Description |
|-------------|------|------|-------------|
| `aigos.decision.duration` | Histogram | `ms` | Permission check duration |
| `aigos.action.duration` | Histogram | `ms` | Governed action duration |

### 5.4 Metric Attributes

All metrics SHOULD include:

| Attribute | Type | Description |
|-----------|------|-------------|
| `aigos.asset_id` | string | Asset identifier |
| `aigos.risk_level` | string | Risk classification |
| `aigos.environment` | string | Environment |

---

## 6. Span Links

### 6.1 Lineage Links

Spawn spans SHOULD link to parent identity span:

```yaml
Span:
  name: "aigos.governance.spawn"
  links:
    - trace_id: "parent-trace-id"
      span_id: "parent-identity-span-id"
      attributes:
        aigos.link.type: "parent_identity"
```

### 6.2 Decision Chain Links

Violation spans MAY link to triggering decision span:

```yaml
Span:
  name: "aigos.governance.violation"
  links:
    - trace_id: "same-trace-id"
      span_id: "decision-span-id"
      attributes:
        aigos.link.type: "triggering_decision"
```

---

## 7. Status Conventions

### 7.1 Span Status

| Span Type | Success Status | Error Status |
|-----------|----------------|--------------|
| `identity` | `OK` | `ERROR` (verification failed) |
| `decision` | `OK` | N/A (denial is not an error) |
| `violation` | `ERROR` | N/A |
| `budget` | `OK` | `ERROR` (limit exceeded) |
| `terminate` | `OK` | `ERROR` (ungraceful) |
| `spawn` | `OK` | `ERROR` (decay violation) |
| `action` | `OK` | `ERROR` (action failed) |

### 7.2 Status Messages

When status is `ERROR`, include descriptive message:

```yaml
Span:
  status:
    code: ERROR
    message: "Golden Thread verification failed: hash mismatch"
```

---

## 8. Sampling Recommendations

### 8.1 Default Sampling

| Span Type | Recommended Sampling |
|-----------|---------------------|
| `identity` | 100% (always) |
| `violation` | 100% (always) |
| `terminate` | 100% (always) |
| `spawn` | 100% (always) |
| `decision` (denied) | 100% |
| `decision` (allowed) | 10-100% |
| `budget` | 10-100% |
| `action` | 10-100% |

### 8.2 Head-Based Sampling

For high-volume environments:

```typescript
// Sample 10% of allowed decisions, 100% of denials
const sampler = new ParentBasedSampler({
  root: new TraceIdRatioBasedSampler(0.1),
});

// Override for violations
span.setAttribute('sampling.priority', 1);  // Always sample
```

---

## 9. Implementation Requirements

### 9.1 MUST (Required)

Implementations MUST:

1. Use the `aigos.` namespace prefix for all attributes
2. Include core identity attributes on all spans
3. Use the specified span names
4. Use the allowed values for enum attributes
5. Set span status appropriately

### 9.2 SHOULD (Recommended)

Implementations SHOULD:

1. Include all specified attributes for each span type
2. Emit metrics alongside traces
3. Use span links for lineage
4. Apply sampling recommendations

### 9.3 MAY (Optional)

Implementations MAY:

1. Add custom attributes with `aigos.custom.` prefix
2. Emit additional span types for custom events
3. Use baggage for cross-process propagation

---

## 10. Examples

### 10.1 Complete Identity Span

```json
{
  "name": "aigos.governance.identity",
  "kind": "SPAN_KIND_INTERNAL",
  "startTimeUnixNano": "1704067200000000000",
  "endTimeUnixNano": "1704067200015000000",
  "status": { "code": "STATUS_CODE_OK" },
  "attributes": [
    { "key": "aigos.instance_id", "value": { "stringValue": "550e8400-e29b-41d4-a716-446655440000" } },
    { "key": "aigos.asset_id", "value": { "stringValue": "fin-agent-001" } },
    { "key": "aigos.asset_name", "value": { "stringValue": "Financial Analysis Agent" } },
    { "key": "aigos.risk_level", "value": { "stringValue": "high" } },
    { "key": "aigos.identity.verified", "value": { "boolValue": true } },
    { "key": "aigos.identity.mode", "value": { "stringValue": "NORMAL" } },
    { "key": "aigos.identity.verification_time_ms", "value": { "doubleValue": 12.5 } },
    { "key": "aigos.identity.golden_thread_hash", "value": { "stringValue": "sha256:7d865e959b2466918c9863afca942d0fb89d7c9ac0c99bafc3749504ded97730" } },
    { "key": "aigos.lineage.generation_depth", "value": { "intValue": "0" } }
  ]
}
```

### 10.2 Complete Decision Span

```json
{
  "name": "aigos.governance.decision",
  "kind": "SPAN_KIND_INTERNAL",
  "startTimeUnixNano": "1704067200100000000",
  "endTimeUnixNano": "1704067200100800000",
  "status": { "code": "STATUS_CODE_OK" },
  "attributes": [
    { "key": "aigos.instance_id", "value": { "stringValue": "550e8400-e29b-41d4-a716-446655440000" } },
    { "key": "aigos.decision.action", "value": { "stringValue": "tool_call" } },
    { "key": "aigos.decision.resource", "value": { "stringValue": "web_search" } },
    { "key": "aigos.decision.result", "value": { "stringValue": "ALLOWED" } },
    { "key": "aigos.decision.evaluation_time_ms", "value": { "doubleValue": 0.8 } },
    { "key": "aigos.decision.dry_run", "value": { "boolValue": false } }
  ]
}
```

---

## Appendix A: Quick Reference

### Span Names

```
aigos.governance.identity
aigos.governance.decision
aigos.governance.violation
aigos.governance.budget
aigos.governance.terminate
aigos.governance.spawn
aigos.governance.action
```

### Common Attributes

```
aigos.instance_id
aigos.asset_id
aigos.asset_name
aigos.risk_level
aigos.lineage.generation_depth
```

### Enum Values

```
aigos.risk_level: minimal | limited | high | unacceptable
aigos.identity.mode: NORMAL | SANDBOX | RESTRICTED
aigos.decision.result: ALLOWED | DENIED | WOULD_DENY
aigos.violation.severity: warning | error | critical
aigos.terminate.source: kill_switch | budget_exceeded | policy_violation | graceful | error | parent_terminated
aigos.spawn.capability_mode: decay | explicit | inherit
```

---

## Appendix B: Changelog

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0-draft | 2025-12-29 | Initial draft |
