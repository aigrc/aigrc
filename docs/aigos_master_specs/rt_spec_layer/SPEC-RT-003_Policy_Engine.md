# SPEC-RT-003: Policy Engine Specification

## Document Information

| Field | Value |
|-------|-------|
| **Spec ID** | SPEC-RT-003 |
| **Version** | 1.0.0-draft |
| **Status** | Draft |
| **Layer** | Layer 3: Kinetic Governance |
| **Parent Spec** | KINETIC_GOVERNANCE_OVERVIEW.md |
| **Last Updated** | 2025-12-29 |
| **Authors** | GovOS Team |
| **License** | Apache 2.0 |

---

## Dependencies

### Required Specifications

| Spec ID | Name | Why Required |
|---------|------|--------------|
| SPEC-RT-002 | Identity Manager | Policy Engine uses RuntimeIdentity.capabilities_manifest |
| SPEC-FMT-003 | Policy Schema | Defines policy file format |

### Optional Specifications

| Spec ID | Name | Enhancement |
|---------|------|-------------|
| SPEC-RT-004 | Telemetry Emitter | Emit policy decision traces |
| SPEC-RT-005 | Kill Switch | Emergency policy override |
| SPEC-RT-006 | Capability Decay | Child capability enforcement |

---

## Abstract

The Policy Engine (also called "The Bouncer") is responsible for evaluating whether runtime actions are permitted based on the agent's capabilities and organizational policies. It operates in the hot path of agent execution, making permission decisions in under 2 milliseconds using in-memory policy evaluation. The Policy Engine enforces capability boundaries, resource restrictions, and budget limits defined in `.aigrc/policies/` files.

---

## 1. Introduction

### 1.1 Purpose

The Policy Engine answers the runtime governance question:

> **"Is this action allowed for this agent right now?"**

While the Identity Manager establishes *who* the agent is, the Policy Engine enforces *what* the agent can do. Every tool call, API request, or resource access passes through the Policy Engine for evaluation.

### 1.2 The Bouncer Analogy

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                              THE BOUNCER PATTERN                                         │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                         │
│   NIGHTCLUB                                   AI AGENT                                  │
│   ─────────                                   ────────                                  │
│                                                                                         │
│   Person approaches door                      Action requested                          │
│         │                                           │                                   │
│         ▼                                           ▼                                   │
│   ┌───────────┐                               ┌───────────┐                            │
│   │  Bouncer  │                               │  Policy   │                            │
│   │           │                               │  Engine   │                            │
│   └─────┬─────┘                               └─────┬─────┘                            │
│         │                                           │                                   │
│   Checks:                                     Checks:                                   │
│   • On guest list?                            • In allowed_tools?                       │
│   • Dress code?                               • Resource in allowed_domains?            │
│   • Cover charge paid?                        • Budget not exceeded?                    │
│   • VIP status?                               • Kill switch active?                     │
│         │                                           │                                   │
│         ▼                                           ▼                                   │
│   ┌─────┴─────┐                               ┌─────┴─────┐                            │
│   │           │                               │           │                            │
│   ▼           ▼                               ▼           ▼                            │
│ ALLOWED    DENIED                           ALLOWED    DENIED                          │
│ (enter)    (turned away)                    (execute)  (AigosPolicyViolation)          │
│                                                                                         │
│   Response time: ~2 seconds                  Response time: < 2ms                       │
│                                                                                         │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

### 1.3 Scope

This specification defines:

- Policy evaluation algorithm
- Permission check interface
- Policy file loading
- Dry-run mode
- Performance requirements

This specification does NOT define:

- Policy file format (see SPEC-FMT-003)
- Capability propagation (see SPEC-RT-006)
- Kill switch mechanism (see SPEC-RT-005)

### 1.4 Terminology

| Term | Definition |
|------|------------|
| **Policy** | A set of rules defining what actions are permitted |
| **Capability** | A specific permission (e.g., "may call web_search") |
| **Permission Check** | The evaluation of whether an action is allowed |
| **Hot Path** | The critical execution path where latency matters |
| **Dry-Run Mode** | Log-only enforcement (no blocking) |

---

## 2. Architecture

### 2.1 Component Diagram

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                              POLICY ENGINE ARCHITECTURE                                  │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                         │
│   ┌───────────────────────────────────────────────────────────────────────────────┐    │
│   │                              PolicyEngine                                      │    │
│   │                                                                                │    │
│   │   ┌─────────────────────────────────────────────────────────────────────────┐ │    │
│   │   │                         checkPermission()                                │ │    │
│   │   │                                                                          │ │    │
│   │   │   Input: { action, resource, params, context }                          │ │    │
│   │   │                                                                          │ │    │
│   │   │   ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                  │ │    │
│   │   │   │ Kill Switch  │  │ Capability   │  │  Resource    │                  │ │    │
│   │   │   │    Check     │→ │    Check     │→ │    Check     │→ ...             │ │    │
│   │   │   └──────────────┘  └──────────────┘  └──────────────┘                  │ │    │
│   │   │                                                                          │ │    │
│   │   │   Output: ALLOWED | DENIED + reason                                     │ │    │
│   │   └─────────────────────────────────────────────────────────────────────────┘ │    │
│   │                                                                                │    │
│   │   ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐           │    │
│   │   │   PolicyLoader   │  │   BudgetTracker  │  │  ViolationLogger │           │    │
│   │   │                  │  │                  │  │                  │           │    │
│   │   │  • Load YAML     │  │  • Track costs   │  │  • Log decisions │           │    │
│   │   │  • Hot reload    │  │  • Check limits  │  │  • Emit events   │           │    │
│   │   │  • Verify sigs   │  │  • Reset daily   │  │  • Alert on deny │           │    │
│   │   └──────────────────┘  └──────────────────┘  └──────────────────┘           │    │
│   │                                                                                │    │
│   └───────────────────────────────────────────────────────────────────────────────┘    │
│                                                                                         │
│   INPUTS                                                                                │
│   ──────                                                                                │
│   ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐                    │
│   │ RuntimeIdentity │    │  Policy Files   │    │  Kill Switch    │                    │
│   │ (capabilities)  │    │ (.aigrc/policies)│    │  Status         │                    │
│   └─────────────────┘    └─────────────────┘    └─────────────────┘                    │
│                                                                                         │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

### 2.2 Evaluation Order

Permission checks are evaluated in a specific order for efficiency:

```
1. KILL SWITCH CHECK           [O(1)] - Immediate termination if active
       │
       ▼ (not active)
2. CAPABILITY CHECK            [O(n)] - Is action in allowed_tools?
       │
       ▼ (allowed)
3. DENY LIST CHECK             [O(n)] - Is action in denied_tools?
       │
       ▼ (not denied)
4. RESOURCE ALLOW CHECK        [O(n)] - Does resource match allowed_domains?
       │
       ▼ (allowed)
5. RESOURCE DENY CHECK         [O(n)] - Does resource match denied_domains?
       │
       ▼ (not denied)
6. BUDGET CHECK                [O(1)] - Is budget exceeded?
       │
       ▼ (within budget)
7. CUSTOM CHECKS               [O(k)] - Any custom policy rules
       │
       ▼ (passed)
8. ALLOWED ✓
```

**Short-circuit behavior**: Evaluation stops at the first DENY. This ensures minimal latency for blocked requests.

---

## 3. Policy Loading

### 3.1 Policy File Location

Policies are loaded from `.aigrc/policies/`:

```
.aigrc/
├── policies/
│   ├── default.yaml           # Default policy for all assets
│   ├── production.yaml        # Production environment policy
│   ├── development.yaml       # Development environment policy
│   └── high-risk.yaml         # Policy for high-risk assets
└── cards/
    └── fin-agent.yaml         # Asset Card references policy
```

### 3.2 Policy Selection

Policy is selected in this order:

1. **Explicit reference** in Asset Card (`policy: production.yaml`)
2. **Risk-level match** (`high-risk.yaml` for high-risk assets)
3. **Environment match** (`production.yaml` if `ENV=production`)
4. **Default** (`default.yaml`)

### 3.3 Policy File Format

```yaml
# .aigrc/policies/production.yaml
version: "1.0"
name: "Production Policy"
description: "Restrictive policy for production AI agents"

# Capability rules
capabilities:
  # Allowed tools/actions
  allowed_tools:
    - web_search
    - calculator
    - database_read
    
  # Explicitly denied tools (overrides allowed)
  denied_tools:
    - shell_exec
    - file_write
    - admin_commands

# Resource access rules
resources:
  # Allowed domain patterns (regex)
  allowed_domains:
    - "^https://api\\.company\\.com/.*"
    - "^https://.*\\.wikipedia\\.org/.*"
    
  # Denied domain patterns (overrides allowed)
  denied_domains:
    - ".*\\.gov$"
    - ".*\\.mil$"
    - "^https?://localhost.*"

# Budget limits
budget:
  max_cost_per_session: 10.00    # USD
  max_cost_per_day: 100.00       # USD
  max_tokens_per_call: 4096
  max_calls_per_minute: 60

# Agent spawning rules
spawning:
  may_spawn_children: true
  max_child_depth: 2
  child_capability_mode: "decay"  # decay | explicit | inherit

# Operating mode
mode:
  dry_run: false                  # Log only, don't block
  fail_open: false                # Allow if policy evaluation fails
  
# Signature (optional, for policy integrity)
signature: "RSA-SHA256:MIIB..."
```

### 3.4 Policy Hot Reload

The Policy Engine SHOULD support hot reload for policy updates:

```typescript
// Watch for policy changes
policyEngine.watchPolicies('.aigrc/policies/', (event) => {
  console.log(`Policy ${event.file} ${event.type}`);
  // Reload happens automatically
});
```

---

## 4. Permission Check Interface

### 4.1 TypeScript Interface

```typescript
/**
 * Enforces runtime governance policies.
 */
interface IPolicyEngine {
  /**
   * Checks if an action is permitted.
   * 
   * @param request - The permission check request
   * @returns The permission decision
   * @throws AgentTerminatedException if kill switch is active
   */
  checkPermission(request: PermissionRequest): Promise<PermissionResult>;

  /**
   * Records cost incurred by an action.
   * 
   * @param cost - The cost in USD
   */
  recordCost(cost: number): void;

  /**
   * Gets current budget status.
   */
  getBudgetStatus(): BudgetStatus;

  /**
   * Reloads policies from disk.
   */
  reloadPolicies(): Promise<void>;

  /**
   * Sets dry-run mode.
   */
  setDryRun(enabled: boolean): void;

  /**
   * Checks if engine is in dry-run mode.
   */
  isDryRun(): boolean;
}

interface PermissionRequest {
  /** The action being requested (e.g., "tool_call", "api_request") */
  action: string;
  
  /** The specific tool or API (e.g., "web_search", "https://api.com") */
  resource: string;
  
  /** Additional parameters for context */
  params?: Record<string, unknown>;
  
  /** Estimated cost of this action (USD) */
  estimated_cost?: number;
  
  /** Estimated tokens for this action */
  estimated_tokens?: number;
}

interface PermissionResult {
  /** Whether the action is allowed */
  allowed: boolean;
  
  /** If denied, why */
  reason?: string;
  
  /** Which check denied (for debugging) */
  denied_by?: 'kill_switch' | 'capability' | 'resource' | 'budget' | 'custom';
  
  /** Evaluation time in milliseconds */
  evaluation_time_ms: number;
  
  /** Whether this was a dry-run evaluation */
  dry_run: boolean;
  
  /** Recommendations if denied */
  recommendations?: string[];
}

interface BudgetStatus {
  /** Cost incurred this session */
  session_cost: number;
  
  /** Cost incurred today */
  daily_cost: number;
  
  /** Maximum allowed per session */
  session_limit: number | null;
  
  /** Maximum allowed per day */
  daily_limit: number | null;
  
  /** Remaining session budget */
  session_remaining: number | null;
  
  /** Remaining daily budget */
  daily_remaining: number | null;
}
```

### 4.2 Python Interface

```python
from dataclasses import dataclass
from typing import Optional, Dict, Any

@dataclass
class PermissionRequest:
    action: str
    resource: str
    params: Optional[Dict[str, Any]] = None
    estimated_cost: Optional[float] = None
    estimated_tokens: Optional[int] = None

@dataclass  
class PermissionResult:
    allowed: bool
    reason: Optional[str] = None
    denied_by: Optional[str] = None
    evaluation_time_ms: float = 0.0
    dry_run: bool = False
    recommendations: Optional[list[str]] = None

class PolicyEngine:
    async def check_permission(
        self, 
        request: PermissionRequest
    ) -> PermissionResult:
        """Checks if an action is permitted."""
        ...
    
    def record_cost(self, cost: float) -> None:
        """Records cost incurred by an action."""
        ...
    
    def get_budget_status(self) -> BudgetStatus:
        """Gets current budget status."""
        ...
    
    async def reload_policies(self) -> None:
        """Reloads policies from disk."""
        ...
    
    def set_dry_run(self, enabled: bool) -> None:
        """Sets dry-run mode."""
        ...
    
    def is_dry_run(self) -> bool:
        """Checks if engine is in dry-run mode."""
        ...
```

---

## 5. Evaluation Algorithm

### 5.1 Pseudocode

```
function checkPermission(request):
    start_time = now()
    
    // 1. Kill Switch Check
    if killSwitchActive():
        throw AgentTerminatedException("Kill switch activated")
    
    // 2. Capability Check
    if request.action NOT IN capabilities.allowed_tools:
        return DENIED("Action not in allowed_tools", "capability")
    
    // 3. Deny List Check
    if request.action IN capabilities.denied_tools:
        return DENIED("Action in denied_tools", "capability")
    
    // 4. Resource Allow Check (if resource provided)
    if request.resource:
        if NOT matchesAnyPattern(request.resource, resources.allowed_domains):
            return DENIED("Resource not in allowed_domains", "resource")
    
    // 5. Resource Deny Check
    if request.resource:
        if matchesAnyPattern(request.resource, resources.denied_domains):
            return DENIED("Resource in denied_domains", "resource")
    
    // 6. Budget Check
    if request.estimated_cost:
        if session_cost + estimated_cost > budget.max_cost_per_session:
            return DENIED("Session budget exceeded", "budget")
        if daily_cost + estimated_cost > budget.max_cost_per_day:
            return DENIED("Daily budget exceeded", "budget")
    
    // 7. Token Check
    if request.estimated_tokens:
        if estimated_tokens > budget.max_tokens_per_call:
            return DENIED("Token limit exceeded", "budget")
    
    // 8. Rate Limit Check
    if calls_this_minute >= budget.max_calls_per_minute:
        return DENIED("Rate limit exceeded", "budget")
    
    // 9. Custom Checks (extensible)
    for check in custom_checks:
        result = check(request)
        if NOT result.allowed:
            return result
    
    // All checks passed
    elapsed = now() - start_time
    return ALLOWED(evaluation_time_ms=elapsed)

function matchesAnyPattern(resource, patterns):
    for pattern in patterns:
        if regex_match(pattern, resource):
            return true
    return false
```

### 5.2 Pattern Matching

Resource patterns use regular expressions:

| Pattern | Matches | Does Not Match |
|---------|---------|----------------|
| `^https://api\\.company\\.com/.*` | `https://api.company.com/v1/data` | `https://api.other.com/` |
| `.*\\.gov$` | `https://data.gov`, `http://fbi.gov` | `https://gov.io` |
| `^https?://localhost.*` | `http://localhost:3000`, `https://localhost` | `http://localserver` |

### 5.3 Deny Overrides Allow

When both allow and deny patterns exist, deny takes precedence:

```yaml
resources:
  allowed_domains:
    - ".*"                      # Allow everything
  denied_domains:
    - ".*\\.gov$"               # Except .gov domains
```

Result: All domains allowed except `.gov` domains.

---

## 6. Dry-Run Mode

### 6.1 Purpose

Dry-run mode allows organizations to:

1. Test policies before enforcement
2. Understand what would be blocked
3. Build trust with developers
4. Tune policies based on real usage

### 6.2 Behavior

In dry-run mode:

- All checks are evaluated normally
- Results are logged with full detail
- **Actions are NEVER blocked** (always returns allowed=true)
- Telemetry marks decisions as `dry_run: true`

```typescript
// Enable dry-run mode
policyEngine.setDryRun(true);

// This would be denied, but in dry-run it's allowed
const result = await policyEngine.checkPermission({
  action: 'shell_exec',
  resource: 'rm -rf /',
});

console.log(result);
// {
//   allowed: true,                    // Always true in dry-run
//   reason: "WOULD_DENY: Action in denied_tools",
//   denied_by: "capability",          // What would have denied
//   dry_run: true,
//   evaluation_time_ms: 0.5
// }
```

### 6.3 Dry-Run Telemetry

Dry-run decisions emit special telemetry:

```yaml
# OTel span
name: aigos.governance.decision
attributes:
  aigos.policy.result: "WOULD_DENY"    # Not "DENIED"
  aigos.policy.dry_run: true
  aigos.policy.would_deny_reason: "Action in denied_tools"
```

---

## 7. Performance Requirements

### 7.1 Latency Budget

| Operation | Target | Maximum | Notes |
|-----------|--------|---------|-------|
| Single permission check | < 1ms | 2ms | P99 latency |
| Policy load (cold) | < 50ms | 100ms | Startup only |
| Policy reload (hot) | < 10ms | 20ms | Runtime reload |
| Pattern matching (single) | < 0.1ms | 0.5ms | Regex evaluation |

### 7.2 Memory Budget

| Component | Target | Maximum |
|-----------|--------|---------|
| Compiled patterns (cache) | < 1MB | 5MB |
| Policy configuration | < 100KB | 500KB |
| Budget tracking | < 10KB | 50KB |

### 7.3 Optimization Strategies

1. **Pre-compile regex patterns** on policy load
2. **Cache evaluation results** for repeated requests
3. **Short-circuit evaluation** on first DENY
4. **In-memory policy** (no disk I/O in hot path)
5. **Lock-free budget tracking** where possible

---

## 8. Error Handling

### 8.1 Exception Types

```typescript
/** Thrown when permission is denied */
class AigosPolicyViolation extends Error {
  constructor(
    public readonly action: string,
    public readonly resource: string,
    public readonly reason: string,
    public readonly deniedBy: string
  ) {
    super(`Policy violation: ${reason}`);
  }
}

/** Thrown when kill switch is active */
class AgentTerminatedException extends Error {
  constructor(public readonly reason: string) {
    super(`Agent terminated: ${reason}`);
  }
}

/** Thrown when budget is exceeded */
class AigosBudgetExceeded extends AigosPolicyViolation {
  constructor(
    action: string,
    resource: string,
    public readonly currentCost: number,
    public readonly limit: number
  ) {
    super(action, resource, 'Budget exceeded', 'budget');
  }
}

/** Thrown when policy evaluation fails */
class PolicyEvaluationError extends Error {
  constructor(
    public readonly cause: Error,
    public readonly failOpen: boolean
  ) {
    super(`Policy evaluation failed: ${cause.message}`);
  }
}
```

### 8.2 Fail-Open vs Fail-Secure

```yaml
# Policy configuration
mode:
  fail_open: false    # Default: deny if evaluation fails
```

| Mode | Policy Error Behavior |
|------|----------------------|
| `fail_open: true` | Allow action, log error |
| `fail_open: false` | Deny action, throw PolicyEvaluationError |

---

## 9. Integration with Other Components

### 9.1 Identity Manager Integration

```typescript
// Policy Engine reads capabilities from RuntimeIdentity
const identity = await identityManager.create({...});
const policyEngine = new PolicyEngine({
  capabilities: identity.capabilities_manifest,
  mode: identity.mode,  // NORMAL, SANDBOX, RESTRICTED
});
```

### 9.2 Kill Switch Integration

```typescript
// Kill Switch can override Policy Engine
killSwitch.onTerminate((reason) => {
  policyEngine.setKillSwitchActive(true, reason);
});

// checkPermission() will throw AgentTerminatedException
```

### 9.3 Telemetry Integration

```typescript
// Policy Engine emits decisions to Telemetry Emitter
policyEngine.on('decision', (decision) => {
  telemetryEmitter.emitDecision(decision);
});

policyEngine.on('violation', (violation) => {
  telemetryEmitter.emitViolation(violation);
});
```

---

## 10. Implementation Requirements

### 10.1 MUST (Required)

Implementations MUST:

1. Complete permission checks in under 2ms (P99)
2. Implement all 6 core check types (kill switch, capability, deny list, resource allow, resource deny, budget)
3. Support regex patterns for domain matching
4. Implement deny-overrides-allow precedence
5. Provide synchronous check API for hot path
6. Thread-safe budget tracking

### 10.2 SHOULD (Recommended)

Implementations SHOULD:

1. Pre-compile regex patterns on load
2. Support dry-run mode
3. Emit telemetry events for decisions
4. Support hot reload of policies
5. Cache repeated permission checks
6. Log all denials with context

### 10.3 MAY (Optional)

Implementations MAY:

1. Support custom check plugins
2. Implement probabilistic rate limiting
3. Support external policy services
4. Implement policy inheritance

---

## 11. Examples

### 11.1 Basic Permission Check

```typescript
const policyEngine = new PolicyEngine({
  capabilities: identity.capabilities_manifest,
});

// Allowed action
const result1 = await policyEngine.checkPermission({
  action: 'web_search',
  resource: 'https://api.company.com/search',
});
console.log(result1.allowed);  // true

// Denied action
const result2 = await policyEngine.checkPermission({
  action: 'shell_exec',
  resource: 'rm -rf /',
});
console.log(result2.allowed);  // false
console.log(result2.reason);   // "Action in denied_tools"
```

### 11.2 Using the @guard Decorator

```typescript
import { guard } from '@aigos/runtime';

class MyAgent {
  @guard({ action: 'tool_call', resource: 'web_search' })
  async search(query: string): Promise<string> {
    // This method is automatically protected
    // If denied, AigosPolicyViolation is thrown
    return await webSearch(query);
  }
  
  @guard({ action: 'api_call' })
  async callApi(url: string): Promise<Response> {
    // Resource is inferred from url parameter
    return await fetch(url);
  }
}
```

### 11.3 Budget Tracking

```typescript
// Before expensive operation
const status = policyEngine.getBudgetStatus();
if (status.session_remaining !== null && status.session_remaining < 1.0) {
  console.warn('Low budget remaining');
}

// After operation
policyEngine.recordCost(0.50);  // Record $0.50 spent
```

---

## 12. Conformance

### 12.1 Level 1 (Minimal)

- MUST implement `checkPermission()`
- MUST implement capability check (allowed_tools)
- MUST meet latency requirement (< 2ms)

### 12.2 Level 2 (Standard)

- MUST satisfy Level 1
- MUST implement all 6 core checks
- MUST implement dry-run mode
- MUST emit telemetry events

### 12.3 Level 3 (Full)

- MUST satisfy Level 2
- MUST support signed policies
- MUST support hot reload
- MUST support custom check plugins

---

## Appendix A: Policy Schema

See SPEC-FMT-003 for complete policy file schema.

---

## Appendix B: Changelog

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0-draft | 2025-12-29 | Initial draft |
