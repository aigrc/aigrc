# SPEC-RT-006: Capability Decay Specification

## Document Information

| Field | Value |
|-------|-------|
| **Spec ID** | SPEC-RT-006 |
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
| SPEC-RT-002 | Identity Manager | Lineage tracking and capability propagation |
| SPEC-RT-003 | Policy Engine | Enforces capability boundaries |
| SPEC-FMT-003 | Policy Schema | Defines spawning rules |

### Optional Specifications

| Spec ID | Name | Enhancement |
|---------|------|-------------|
| SPEC-RT-004 | Telemetry Emitter | Emit spawn events |

---

## Abstract

Capability Decay enforces the rule that child agents MUST have equal or fewer capabilities than their parent. When agents spawn sub-agents, permissions can only decrease—never increase. This prevents privilege escalation attacks where a malicious or buggy agent creates children with more power than itself, containing the blast radius of any individual agent compromise.

---

## 1. Introduction

### 1.1 Purpose

Capability Decay answers the critical security question:

> **"Can an agent create a child with more power than itself?"**

The answer must always be **NO**.

### 1.2 The Problem: Privilege Escalation

Without Capability Decay, agents could:

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                    PRIVILEGE ESCALATION WITHOUT CAPABILITY DECAY                         │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                         │
│   Parent Agent                                                                          │
│   ┌─────────────────────────────┐                                                       │
│   │ Capabilities:               │                                                       │
│   │ • web_search ✓              │                                                       │
│   │ • database_read ✓           │                                                       │
│   │ • shell_exec ✗              │  ← No shell access                                    │
│   └─────────────┬───────────────┘                                                       │
│                 │                                                                       │
│                 │ Spawns child with elevated permissions                                │
│                 ▼                                                                       │
│   Child Agent (DANGEROUS!)                                                              │
│   ┌─────────────────────────────┐                                                       │
│   │ Capabilities:               │                                                       │
│   │ • web_search ✓              │                                                       │
│   │ • database_read ✓           │                                                       │
│   │ • shell_exec ✓              │  ← Has shell access! ESCALATION!                      │
│   │ • file_write ✓              │  ← Has file write! ESCALATION!                        │
│   └─────────────────────────────┘                                                       │
│                                                                                         │
│   ❌ SECURITY VIOLATION: Child has capabilities parent doesn't have                     │
│                                                                                         │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

### 1.3 The Solution: Capability Decay

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                          CAPABILITY DECAY ENFORCEMENT                                    │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                         │
│   Root Agent (Generation 0)                                                             │
│   ┌─────────────────────────────┐                                                       │
│   │ Capabilities:               │                                                       │
│   │ • web_search ✓              │                                                       │
│   │ • database_read ✓           │                                                       │
│   │ • send_email ✓              │                                                       │
│   │ • spawn_children ✓          │                                                       │
│   └─────────────┬───────────────┘                                                       │
│                 │                                                                       │
│                 │ Spawns child (capabilities DECAY)                                     │
│                 ▼                                                                       │
│   Child Agent (Generation 1)                                                            │
│   ┌─────────────────────────────┐                                                       │
│   │ Capabilities:               │                                                       │
│   │ • web_search ✓              │  ✓ Same as parent                                     │
│   │ • database_read ✓           │  ✓ Same as parent                                     │
│   │ • send_email ✗              │  ✗ REMOVED (decay rule)                               │
│   │ • spawn_children ✓          │                                                       │
│   └─────────────┬───────────────┘                                                       │
│                 │                                                                       │
│                 │ Spawns grandchild (capabilities DECAY further)                        │
│                 ▼                                                                       │
│   Grandchild Agent (Generation 2)                                                       │
│   ┌─────────────────────────────┐                                                       │
│   │ Capabilities:               │                                                       │
│   │ • web_search ✓              │  ✓ Same as parent                                     │
│   │ • database_read ✗           │  ✗ REMOVED (decay rule)                               │
│   │ • spawn_children ✗          │  ✗ Cannot spawn (max depth)                           │
│   └─────────────────────────────┘                                                       │
│                                                                                         │
│   ✅ SECURE: Each generation has ≤ capabilities of its parent                           │
│                                                                                         │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

### 1.4 The Mathematical Rule

```
∀ child, parent: capabilities(child) ⊆ capabilities(parent)
```

In plain English: **A child's capabilities must be a subset of (or equal to) its parent's capabilities.**

---

## 2. Decay Modes

### 2.1 Mode: Decay (Default)

Child capabilities are automatically reduced based on decay rules.

```yaml
spawning:
  child_capability_mode: "decay"
  decay_rules:
    # Remove these capabilities from children
    remove_from_children:
      - send_email
      - external_api_call
      - spawn_children  # At max_child_depth
    
    # Reduce these budgets
    budget_decay:
      max_cost_per_session: 0.5  # 50% of parent
      max_cost_per_day: 0.5
```

### 2.2 Mode: Explicit

Child capabilities are only what's explicitly granted (intersection with parent).

```yaml
spawning:
  child_capability_mode: "explicit"
  child_capabilities:
    allowed_tools:
      - web_search  # Only this tool
    # These are intersected with parent's capabilities
```

### 2.3 Mode: Inherit (Not Recommended)

Child has same capabilities as parent. **Use with extreme caution.**

```yaml
spawning:
  child_capability_mode: "inherit"  # DANGER
  # Child gets exact same capabilities as parent
  # Only use for trusted, controlled scenarios
```

---

## 3. Enforcement Rules

### 3.1 Tool/Action Enforcement

```typescript
function validateChildCapabilities(
  parent: RuntimeIdentity,
  childRequest: SpawnRequest
): ValidationResult {
  const parentTools = new Set(parent.capabilities_manifest.allowed_tools);
  const childTools = new Set(childRequest.capabilities.allowed_tools);
  
  // Check: child tools ⊆ parent tools
  for (const tool of childTools) {
    if (!parentTools.has(tool) && !parentTools.has('*')) {
      return {
        valid: false,
        reason: `Child requested tool '${tool}' not in parent capabilities`,
        violation: 'PRIVILEGE_ESCALATION',
      };
    }
  }
  
  return { valid: true };
}
```

### 3.2 Resource/Domain Enforcement

```typescript
function validateChildResources(
  parent: RuntimeIdentity,
  childRequest: SpawnRequest
): ValidationResult {
  // Child's allowed_domains must be subset of parent's
  const parentAllowed = parent.capabilities_manifest.allowed_domains;
  const childAllowed = childRequest.capabilities.allowed_domains;
  
  for (const childPattern of childAllowed) {
    // Check if child pattern is covered by any parent pattern
    if (!isCoveredByPatterns(childPattern, parentAllowed)) {
      return {
        valid: false,
        reason: `Child domain pattern '${childPattern}' not covered by parent`,
        violation: 'PRIVILEGE_ESCALATION',
      };
    }
  }
  
  // Child's denied_domains should include parent's denied_domains
  // (can add more denies, but cannot remove parent's denies)
  const parentDenied = new Set(parent.capabilities_manifest.denied_domains);
  const childDenied = new Set(childRequest.capabilities.denied_domains);
  
  for (const denied of parentDenied) {
    if (!childDenied.has(denied)) {
      // Automatically add parent's denies to child
      childRequest.capabilities.denied_domains.push(denied);
    }
  }
  
  return { valid: true };
}
```

### 3.3 Budget Enforcement

```typescript
function validateChildBudget(
  parent: RuntimeIdentity,
  childRequest: SpawnRequest
): ValidationResult {
  const parentBudget = parent.capabilities_manifest;
  const childBudget = childRequest.capabilities;
  
  // Child budget limits cannot exceed parent's
  if (parentBudget.max_cost_per_session !== null) {
    if (childBudget.max_cost_per_session === null ||
        childBudget.max_cost_per_session > parentBudget.max_cost_per_session) {
      return {
        valid: false,
        reason: 'Child budget exceeds parent budget',
        violation: 'BUDGET_ESCALATION',
      };
    }
  }
  
  // Apply decay factor
  const decayFactor = 0.5;  // From config
  if (childBudget.max_cost_per_session === null) {
    childBudget.max_cost_per_session = 
      parentBudget.max_cost_per_session! * decayFactor;
  }
  
  return { valid: true };
}
```

### 3.4 Generation Depth Enforcement

```typescript
function validateGenerationDepth(
  parent: RuntimeIdentity,
  childRequest: SpawnRequest
): ValidationResult {
  const maxDepth = parent.capabilities_manifest.max_child_depth;
  const currentDepth = parent.lineage.generation_depth;
  
  if (currentDepth >= maxDepth) {
    return {
      valid: false,
      reason: `Max generation depth (${maxDepth}) reached`,
      violation: 'DEPTH_EXCEEDED',
    };
  }
  
  // Children at max depth cannot spawn further
  if (currentDepth + 1 >= maxDepth) {
    childRequest.capabilities.may_spawn_children = false;
  }
  
  return { valid: true };
}
```

---

## 4. Interface

### 4.1 TypeScript Interface

```typescript
/**
 * Enforces Capability Decay rules during agent spawning.
 */
interface ICapabilityDecay {
  /**
   * Validates that child capabilities don't exceed parent.
   * 
   * @param parent - Parent agent's identity
   * @param childRequest - Requested capabilities for child
   * @returns Validation result
   */
  validate(
    parent: RuntimeIdentity,
    childRequest: SpawnRequest
  ): ValidationResult;

  /**
   * Applies decay rules to generate child capabilities.
   * 
   * @param parent - Parent agent's identity
   * @param mode - Decay mode (decay, explicit, inherit)
   * @returns Decayed capabilities for child
   */
  applyDecay(
    parent: RuntimeIdentity,
    mode: 'decay' | 'explicit' | 'inherit'
  ): CapabilitiesManifest;

  /**
   * Gets decay rules from configuration.
   */
  getDecayRules(): DecayRules;
}

interface SpawnRequest {
  /** Requested child asset ID */
  asset_id: string;
  
  /** Requested capabilities */
  capabilities: Partial<CapabilitiesManifest>;
}

interface ValidationResult {
  /** Whether validation passed */
  valid: boolean;
  
  /** Reason for failure */
  reason?: string;
  
  /** Type of violation */
  violation?: 'PRIVILEGE_ESCALATION' | 'BUDGET_ESCALATION' | 'DEPTH_EXCEEDED';
  
  /** Adjusted capabilities (if auto-corrected) */
  adjusted_capabilities?: CapabilitiesManifest;
}

interface DecayRules {
  /** Capabilities to remove from children */
  remove_from_children: string[];
  
  /** Budget decay factors (0.0 - 1.0) */
  budget_decay: {
    max_cost_per_session: number;
    max_cost_per_day: number;
    max_tokens_per_call: number;
  };
  
  /** Whether to auto-adjust invalid requests or fail */
  auto_adjust: boolean;
}
```

### 4.2 Python Interface

```python
from dataclasses import dataclass
from typing import Optional, List

@dataclass
class SpawnRequest:
    asset_id: str
    capabilities: dict

@dataclass
class ValidationResult:
    valid: bool
    reason: Optional[str] = None
    violation: Optional[str] = None
    adjusted_capabilities: Optional[dict] = None

class CapabilityDecay:
    def validate(
        self,
        parent: RuntimeIdentity,
        child_request: SpawnRequest
    ) -> ValidationResult:
        """Validates that child capabilities don't exceed parent."""
        ...
    
    def apply_decay(
        self,
        parent: RuntimeIdentity,
        mode: str  # decay | explicit | inherit
    ) -> dict:
        """Applies decay rules to generate child capabilities."""
        ...
    
    def get_decay_rules(self) -> dict:
        """Gets decay rules from configuration."""
        ...
```

---

## 5. Configuration

### 5.1 Policy Configuration

```yaml
# .aigrc/policies/production.yaml

spawning:
  # Whether this agent may spawn children
  may_spawn_children: true
  
  # Maximum generations from root
  max_child_depth: 3
  
  # How to calculate child capabilities
  # decay: Automatic reduction based on rules
  # explicit: Only explicitly granted (intersected with parent)
  # inherit: Same as parent (dangerous)
  child_capability_mode: "decay"
  
  # Capabilities children may NEVER have (regardless of parent)
  child_denied_capabilities:
    - shell_exec
    - admin_commands
    - spawn_children  # Optional: prevent grandchildren
  
  # Decay rules (when mode = "decay")
  decay_rules:
    # Remove these from children
    remove_from_children:
      - send_email
      - database_write
    
    # Budget reduction factors
    budget_decay:
      max_cost_per_session: 0.5    # 50% of parent
      max_cost_per_day: 0.5
      max_tokens_per_call: 0.75   # 75% of parent
    
    # Rate limit reduction
    rate_limit_decay:
      max_calls_per_minute: 0.5   # 50% of parent
    
    # Auto-adjust invalid requests (vs fail)
    auto_adjust: true
```

### 5.2 Asset Card Configuration

```yaml
# .aigrc/cards/research-agent.yaml

id: research-agent
name: Research Agent

spawning:
  # This specific asset cannot spawn children
  may_spawn_children: false
```

---

## 6. Behavior

### 6.1 Spawn Flow with Decay

```
1. Parent calls identityManager.propagate(childAssetId)
       │
       ▼
2. Load child's Asset Card
       │
       ▼
3. Determine child's requested capabilities:
   ├── From Asset Card policy reference
   ├── From explicit spawn request
   └── Default to parent's capabilities
       │
       ▼
4. Apply Capability Decay:
   ├── Check generation depth
   ├── Validate tools ⊆ parent tools
   ├── Validate domains ⊆ parent domains
   ├── Apply budget decay factors
   └── Remove denied capabilities
       │
       ├── If invalid AND auto_adjust=true:
       │   └── Auto-correct to valid capabilities
       │
       ├── If invalid AND auto_adjust=false:
       │   └── Throw CapabilityDecayError
       │
       └── If valid:
           └── Continue
       │
       ▼
5. Create child RuntimeIdentity with decayed capabilities
       │
       ▼
6. Emit spawn telemetry
       │
       ▼
7. Return child identity
```

### 6.2 Error Handling

```typescript
class CapabilityDecayError extends Error {
  constructor(
    public readonly violation: string,
    public readonly requestedCapability: string,
    public readonly parentCapability: string | null
  ) {
    super(`Capability Decay violation: ${violation}`);
  }
}

// Usage
try {
  const childIdentity = await identityManager.propagate(
    parentIdentity,
    'research-agent'
  );
} catch (error) {
  if (error instanceof CapabilityDecayError) {
    logger.error('Child spawn blocked', {
      violation: error.violation,
      requested: error.requestedCapability,
      parent_has: error.parentCapability,
    });
    
    // Option 1: Fail the spawn
    throw error;
    
    // Option 2: Retry with reduced capabilities
    const safeCapabilities = capabilityDecay.applyDecay(parentIdentity, 'decay');
    const childIdentity = await identityManager.propagate(
      parentIdentity,
      'research-agent',
      { capabilities: safeCapabilities }
    );
  }
}
```

---

## 7. Examples

### 7.1 Standard Decay

```typescript
// Parent capabilities
const parent: RuntimeIdentity = {
  // ...
  capabilities_manifest: {
    allowed_tools: ['web_search', 'calculator', 'send_email', 'database_read'],
    denied_tools: ['shell_exec'],
    allowed_domains: ['.*'],
    denied_domains: ['\\.gov$'],
    max_cost_per_session: 10.0,
    max_cost_per_day: 100.0,
    may_spawn_children: true,
    max_child_depth: 3,
  },
  lineage: { generation_depth: 0 },
};

// Apply decay
const childCapabilities = capabilityDecay.applyDecay(parent, 'decay');

// Result:
// {
//   allowed_tools: ['web_search', 'calculator', 'database_read'],  // send_email removed
//   denied_tools: ['shell_exec'],
//   allowed_domains: ['.*'],
//   denied_domains: ['\\.gov$'],
//   max_cost_per_session: 5.0,    // 50% decay
//   max_cost_per_day: 50.0,       // 50% decay
//   may_spawn_children: true,
//   max_child_depth: 3,           // Same limit, but child is at depth 1
// }
```

### 7.2 Explicit Mode

```typescript
// Parent wants to spawn a very restricted child
const childCapabilities = capabilityDecay.applyDecay(parent, 'explicit');

// With explicit policy:
const policy = {
  child_capabilities: {
    allowed_tools: ['calculator'],  // Only calculator
  },
};

// Result: Child only has 'calculator' (intersected with parent's capabilities)
```

### 7.3 Blocked Escalation Attempt

```typescript
// Malicious spawn attempt
const childRequest: SpawnRequest = {
  asset_id: 'evil-agent',
  capabilities: {
    allowed_tools: ['web_search', 'shell_exec'],  // shell_exec not in parent!
  },
};

const result = capabilityDecay.validate(parent, childRequest);

// Result:
// {
//   valid: false,
//   reason: "Child requested tool 'shell_exec' not in parent capabilities",
//   violation: 'PRIVILEGE_ESCALATION',
// }
```

---

## 8. Security Considerations

### 8.1 Why Capability Decay Matters

| Scenario | Without Decay | With Decay |
|----------|---------------|------------|
| Compromised parent spawns child | Child can have ANY capabilities | Child limited to ≤ parent |
| Bug causes over-permissioned child | Escalation possible | Escalation blocked |
| Malicious agent tries to elevate | Could spawn super-agent | Blocked by enforcement |
| Agent swarm explosion | Unlimited capability propagation | Contained blast radius |

### 8.2 Attack Prevention

**Attack: Capability Laundering**
```
Agent A (has send_email) → spawns → Agent B (no send_email)
Agent B → spawns → Agent C (requests send_email)

Without proper lineage tracking:
Agent C might get send_email because B "didn't have it to deny"
```

**Defense:** Track root capabilities, not just parent.

```typescript
function validateAgainstLineage(
  childRequest: SpawnRequest,
  lineage: RuntimeIdentity[]
): ValidationResult {
  // Check against ALL ancestors, not just immediate parent
  for (const ancestor of lineage) {
    const result = validate(ancestor, childRequest);
    if (!result.valid) {
      return result;
    }
  }
  return { valid: true };
}
```

---

## 9. Implementation Requirements

### 9.1 MUST (Required)

Implementations MUST:

1. Enforce `capabilities(child) ⊆ capabilities(parent)` for tools
2. Enforce `capabilities(child) ⊆ capabilities(parent)` for domains
3. Prevent budget escalation (child ≤ parent budgets)
4. Enforce `max_child_depth` limits
5. Block spawn attempts that violate decay rules (unless auto_adjust)

### 9.2 SHOULD (Recommended)

Implementations SHOULD:

1. Support all three modes (decay, explicit, inherit)
2. Implement auto_adjust for graceful handling
3. Log all decay decisions for audit
4. Emit telemetry for spawn events
5. Track full lineage for security analysis

### 9.3 MAY (Optional)

Implementations MAY:

1. Support custom decay functions
2. Implement capability negotiation protocols
3. Support dynamic decay rules from control plane
4. Implement time-based capability expiration

---

## 10. Conformance

### 10.1 Level 1 (Minimal)

- MUST enforce tool capability decay
- MUST enforce generation depth limits
- MUST block invalid spawn attempts

### 10.2 Level 2 (Standard)

- MUST satisfy Level 1
- MUST enforce domain capability decay
- MUST enforce budget decay
- MUST support decay and explicit modes
- SHOULD support auto_adjust

### 10.3 Level 3 (Full)

- MUST satisfy Level 2
- MUST track full lineage for validation
- MUST support all three modes
- MUST emit spawn telemetry
- SHOULD support custom decay rules

---

## Appendix A: Changelog

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0-draft | 2025-12-29 | Initial draft |
