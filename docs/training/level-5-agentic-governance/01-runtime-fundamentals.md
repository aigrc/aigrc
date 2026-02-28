# Module 5.1: Runtime Governance Fundamentals

> **Duration:** 2-3 hours
> **Prerequisites:** Level 1-3, Level 4.1 Developer Track
> **Lab Environment:** Python 3.10+, AIGOS SDK

---

## Learning Objectives

By the end of this module, you will be able to:
1. Explain the difference between static and kinetic governance
2. Create a RuntimeIdentity with Golden Thread verification
3. Initialize and configure the PolicyEngine
4. Implement capability checks before agent actions
5. Build your first fully governed agent from scratch

---

## WHY: The Runtime Governance Gap

### The Problem with Static Governance

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    STATIC vs KINETIC GOVERNANCE                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  STATIC (AIGRC)                          KINETIC (AIGOS)                    │
│  ──────────────                          ──────────────                     │
│                                                                             │
│  ┌─────────────────────┐                 ┌─────────────────────┐           │
│  │                     │                 │                     │           │
│  │   Asset Card:       │                 │   Runtime Agent:    │           │
│  │   "Can use          │      VS         │   Actually calling  │           │
│  │    web_search"      │                 │   ANY tool it wants │           │
│  │                     │                 │                     │           │
│  └─────────────────────┘                 └─────────────────────┘           │
│                                                                             │
│  Documentation says X                     Agent does Y                      │
│                                                                             │
│  ═══════════════════════════════════════════════════════════════════════   │
│                                                                             │
│  WITH AIGOS:                                                                │
│  ┌─────────────────────┐                 ┌─────────────────────┐           │
│  │                     │    ENFORCED     │                     │           │
│  │   Asset Card:       │ ═══════════════>│   Runtime Agent:    │           │
│  │   "Can use          │   Policy Engine │   ONLY web_search   │           │
│  │    web_search"      │   blocks other  │   allowed, others   │           │
│  │                     │   tools         │   DENIED            │           │
│  └─────────────────────┘                 └─────────────────────┘           │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Real-World Consequences

| Without Runtime Governance | With AIGOS |
|---------------------------|------------|
| Agent calls tools not in asset card | Every tool call verified |
| No way to stop runaway agent | Kill switch terminates in < 60s |
| Child agents inherit all capabilities | Capability decay enforced |
| No proof of what agent actually did | Complete audit trail |
| Compliance is "trust me" | Compliance is cryptographically proven |

---

## WHAT: Core Runtime Components

### The AIGOS Governance Layer

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         RUNTIME GOVERNANCE STACK                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌───────────────────────────────────────────────────────────────────────┐ │
│  │                        IDENTITY MANAGER                                │ │
│  │  • Instance ID (UUID)           • Golden Thread Hash                  │ │
│  │  • Asset Card Reference         • Operating Mode                       │ │
│  │  • Lineage (parent/children)    • Capabilities Manifest               │ │
│  └───────────────────────────────────────────────────────────────────────┘ │
│                                      │                                      │
│                                      ▼                                      │
│  ┌───────────────────────────────────────────────────────────────────────┐ │
│  │                         POLICY ENGINE                                  │ │
│  │  • Capability checks (< 2ms)    • Resource allowlists                 │ │
│  │  • Budget tracking              • Deny lists                           │ │
│  │  • Custom validators            • Hot reload support                   │ │
│  └───────────────────────────────────────────────────────────────────────┘ │
│                                      │                                      │
│                                      ▼                                      │
│  ┌───────────────────────────────────────────────────────────────────────┐ │
│  │                       TELEMETRY EMITTER                                │ │
│  │  • Policy decisions             • Violations                          │ │
│  │  • Budget consumption           • Agent lifecycle                      │ │
│  └───────────────────────────────────────────────────────────────────────┘ │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility | Performance Target |
|-----------|---------------|-------------------|
| **Identity Manager** | Who is this agent? | Startup < 50ms |
| **Policy Engine** | What can this agent do? | Check < 2ms |
| **Telemetry Emitter** | What did this agent do? | 0ms (async) |
| **Golden Thread** | Why is this agent authorized? | Offline verification |

---

## HOW: Building Your First Governed Agent

### Step 1: Project Setup

```bash
# Create project directory
mkdir governed-agent-lab
cd governed-agent-lab

# Create virtual environment
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# Install AIGOS SDK
pip install aigos-sdk

# Create project structure
mkdir -p src/.aigrc/cards
touch src/agent.py
touch src/.aigrc/aigrc.yaml
touch governance.lock
```

### Step 2: Create Asset Card

```yaml
# src/.aigrc/cards/research-agent.asset.yaml
asset_id: research-agent-v1
name: Research Assistant Agent
description: An AI agent that searches the web and summarizes findings
version: 1.0.0

ownership:
  owner: ai-team@company.com
  team: AI Platform

technical:
  frameworks:
    - name: aigos
      version: "^1.0.0"
  source_files:
    - src/agent.py

risk_classification:
  level: limited
  rationale: |
    Web search agent with read-only access to public information.
    No access to internal systems or PII.
  eu_ai_act_category: limited_risk

# CRITICAL: Capabilities manifest
capabilities:
  allowed_tools:
    - web_search
    - summarize
    - read_file
  denied_tools:
    - write_file
    - execute_code
    - send_email
  allowed_resources:
    - "https://*.wikipedia.org/*"
    - "https://*.arxiv.org/*"
    - "https://api.openai.com/*"
  denied_resources:
    - "https://*.internal.company.com/*"
    - "file://*"
  budget:
    max_usd: 10.00
    max_tokens: 100000

# Golden Thread - Business Authorization
golden_thread:
  ticket_id: "AI-2026-0042"
  ticket_system: jira
  ticket_url: "https://jira.company.com/browse/AI-2026-0042"
  approved_by: ciso@company.com
  approved_at: "2026-01-09T10:00:00Z"
  scope: "Research agent for public web search"

transparency:
  disclosure_required: true
  disclosure_text: "Results generated by AI research assistant"

created_at: "2026-01-09T10:00:00Z"
updated_at: "2026-01-09T10:00:00Z"
```

### Step 3: Create governance.lock

```yaml
# governance.lock
version: "1.0"
generated_at: "2026-01-09T10:00:00Z"
policy_hash: "sha256:a1b2c3d4..."

constraints:
  registry:
    allowed_vendors:
      - openai
      - anthropic
    blocked_vendors: []
    allowed_models:
      - gpt-4
      - gpt-4-turbo
      - claude-3-opus
    blocked_models:
      - gpt-3.5-turbo

  runtime:
    require_identity: true
    require_golden_thread: true
    max_budget_usd: 100.00
    max_tokens_per_request: 10000

  build:
    require_asset_card: true
    require_risk_classification: true
    max_risk_level: high

expires_at: "2026-04-09T10:00:00Z"
```

### Step 4: Implement the Governed Agent

```python
# src/agent.py
"""
Research Agent with AIGOS Runtime Governance
============================================

This agent demonstrates:
1. RuntimeIdentity creation with Golden Thread
2. PolicyEngine initialization and capability checks
3. Telemetry emission for governance observability
4. Proper error handling for denied actions
"""

import asyncio
from datetime import datetime
from typing import Optional
from aigos import (
    GovernedAgent,
    RuntimeIdentity,
    PolicyEngine,
    TelemetryEmitter,
    GoldenThread,
    CapabilityManifest,
    PolicyDecision,
    GovernanceViolation,
)
from aigos.exceptions import (
    CapabilityDeniedError,
    ResourceDeniedError,
    BudgetExceededError,
    GoldenThreadVerificationError,
)


class ResearchAgent:
    """A governed research agent that searches and summarizes."""

    def __init__(
        self,
        asset_card_path: str,
        governance_lock_path: str,
    ):
        self.asset_card_path = asset_card_path
        self.governance_lock_path = governance_lock_path

        # Core governance components (initialized in start())
        self.identity: Optional[RuntimeIdentity] = None
        self.policy: Optional[PolicyEngine] = None
        self.telemetry: Optional[TelemetryEmitter] = None

        # Agent state
        self._running = False
        self._budget_spent = 0.0

    async def start(self) -> None:
        """
        Initialize the governed agent.

        This is where the magic happens:
        1. Create RuntimeIdentity from asset card
        2. Verify Golden Thread (business authorization)
        3. Load PolicyEngine from governance.lock
        4. Start telemetry emission
        """
        print("🚀 Starting governed agent...")

        # Step 1: Create RuntimeIdentity
        print("  📋 Loading asset card...")
        self.identity = await RuntimeIdentity.from_asset_card(
            self.asset_card_path
        )
        print(f"  ✅ Identity created: {self.identity.instance_id}")
        print(f"     Asset ID: {self.identity.asset_id}")
        print(f"     Mode: {self.identity.mode}")

        # Step 2: Verify Golden Thread
        print("  🔗 Verifying Golden Thread...")
        golden_thread = self.identity.golden_thread

        if not golden_thread.verified:
            # Golden Thread verification failed - enter SANDBOX mode
            print(f"  ⚠️  Golden Thread verification failed!")
            print(f"     Reason: {golden_thread.verification_error}")
            print(f"     Entering SANDBOX mode (restricted capabilities)")
            self.identity.mode = "SANDBOX"
        else:
            print(f"  ✅ Golden Thread verified")
            print(f"     Ticket: {golden_thread.ticket_id}")
            print(f"     Approved by: {golden_thread.approved_by}")
            print(f"     Hash: {golden_thread.hash[:16]}...")

        # Step 3: Load PolicyEngine
        print("  📜 Loading policy engine...")
        self.policy = await PolicyEngine.load(
            self.governance_lock_path,
            identity=self.identity,
        )
        print(f"  ✅ Policy loaded")
        print(f"     Allowed tools: {self.identity.capabilities.allowed_tools}")
        print(f"     Budget limit: ${self.identity.capabilities.budget.max_usd}")

        # Step 4: Start Telemetry
        print("  📊 Starting telemetry...")
        self.telemetry = TelemetryEmitter(
            identity=self.identity,
            endpoint="http://localhost:4317",  # OTel collector
        )
        await self.telemetry.emit_startup()
        print(f"  ✅ Telemetry active")

        self._running = True
        print("✅ Agent started successfully!")
        print("=" * 60)

    async def can(self, tool: str, resource: Optional[str] = None) -> PolicyDecision:
        """
        Check if an action is permitted.

        This is the core governance check that runs before EVERY action.
        Target: < 2ms latency
        """
        decision = await self.policy.check(
            tool=tool,
            resource=resource,
            budget_spent=self._budget_spent,
        )

        # Log the decision
        await self.telemetry.emit_decision(decision)

        return decision

    async def execute(self, tool: str, **kwargs) -> dict:
        """
        Execute an action with governance enforcement.

        Pattern:
        1. Check permission
        2. If denied, raise error (don't execute)
        3. If allowed, execute and track budget
        4. Emit telemetry
        """
        resource = kwargs.get("url") or kwargs.get("path")

        # Step 1: Check permission
        decision = await self.can(tool, resource)

        if not decision.allowed:
            # Step 2: Denied - emit violation and raise
            await self.telemetry.emit_violation(
                GovernanceViolation(
                    tool=tool,
                    resource=resource,
                    reason=decision.reason,
                    policy_rule=decision.matched_rule,
                )
            )

            if decision.reason == "capability_denied":
                raise CapabilityDeniedError(
                    f"Tool '{tool}' not in allowed_tools. "
                    f"Allowed: {self.identity.capabilities.allowed_tools}"
                )
            elif decision.reason == "resource_denied":
                raise ResourceDeniedError(
                    f"Resource '{resource}' blocked by policy. "
                    f"Matched deny rule: {decision.matched_rule}"
                )
            elif decision.reason == "budget_exceeded":
                raise BudgetExceededError(
                    f"Budget exceeded. Spent: ${self._budget_spent:.2f}, "
                    f"Limit: ${self.identity.capabilities.budget.max_usd}"
                )
            else:
                raise GovernanceViolation(decision.reason)

        # Step 3: Allowed - execute
        result = await self._do_execute(tool, **kwargs)

        # Step 4: Track budget
        if "cost" in result:
            self._budget_spent += result["cost"]
            await self.telemetry.emit_budget(
                spent=result["cost"],
                total=self._budget_spent,
            )

        return result

    async def _do_execute(self, tool: str, **kwargs) -> dict:
        """Actually execute the tool (implementation details)."""

        if tool == "web_search":
            # Simulated web search
            query = kwargs.get("query", "")
            print(f"  🔍 Searching: {query}")
            return {
                "results": [f"Result for: {query}"],
                "cost": 0.01,
            }

        elif tool == "summarize":
            text = kwargs.get("text", "")
            print(f"  📝 Summarizing {len(text)} chars...")
            return {
                "summary": f"Summary of: {text[:50]}...",
                "cost": 0.02,
            }

        elif tool == "read_file":
            path = kwargs.get("path", "")
            print(f"  📄 Reading: {path}")
            return {
                "content": f"Contents of {path}",
                "cost": 0.001,
            }

        else:
            raise ValueError(f"Unknown tool: {tool}")

    async def stop(self) -> None:
        """Gracefully stop the agent."""
        print("\n🛑 Stopping agent...")

        # Emit shutdown telemetry
        await self.telemetry.emit_shutdown(
            reason="graceful",
            budget_spent=self._budget_spent,
        )

        self._running = False
        print("✅ Agent stopped")


async def main():
    """Demonstrate the governed agent."""

    # Create agent
    agent = ResearchAgent(
        asset_card_path=".aigrc/cards/research-agent.asset.yaml",
        governance_lock_path="governance.lock",
    )

    try:
        # Start with governance initialization
        await agent.start()

        # Test 1: Allowed action
        print("\n📋 Test 1: web_search (ALLOWED)")
        try:
            result = await agent.execute(
                "web_search",
                query="AIGRC governance framework",
                url="https://en.wikipedia.org/wiki/AI_governance"
            )
            print(f"  ✅ Success: {result}")
        except Exception as e:
            print(f"  ❌ Failed: {e}")

        # Test 2: Another allowed action
        print("\n📋 Test 2: summarize (ALLOWED)")
        try:
            result = await agent.execute(
                "summarize",
                text="AIGRC is a framework for AI governance..."
            )
            print(f"  ✅ Success: {result}")
        except Exception as e:
            print(f"  ❌ Failed: {e}")

        # Test 3: Denied action (tool not in allowed_tools)
        print("\n📋 Test 3: send_email (DENIED - not in allowed_tools)")
        try:
            result = await agent.execute(
                "send_email",
                to="someone@example.com",
                body="Hello!"
            )
            print(f"  ✅ Success: {result}")
        except CapabilityDeniedError as e:
            print(f"  🚫 Correctly denied: {e}")

        # Test 4: Denied resource
        print("\n📋 Test 4: web_search internal site (DENIED - blocked resource)")
        try:
            result = await agent.execute(
                "web_search",
                query="secrets",
                url="https://internal.company.com/secrets"
            )
            print(f"  ✅ Success: {result}")
        except ResourceDeniedError as e:
            print(f"  🚫 Correctly denied: {e}")

        # Show budget
        print(f"\n💰 Budget spent: ${agent._budget_spent:.3f}")
        print(f"   Budget remaining: ${agent.identity.capabilities.budget.max_usd - agent._budget_spent:.3f}")

    finally:
        await agent.stop()


if __name__ == "__main__":
    asyncio.run(main())
```

### Step 5: Run and Observe

```bash
# Run the agent
python src/agent.py
```

**Expected Output:**

```
🚀 Starting governed agent...
  📋 Loading asset card...
  ✅ Identity created: 550e8400-e29b-41d4-a716-446655440000
     Asset ID: research-agent-v1
     Mode: NORMAL
  🔗 Verifying Golden Thread...
  ✅ Golden Thread verified
     Ticket: AI-2026-0042
     Approved by: ciso@company.com
     Hash: sha256:a1b2c3d4...
  📜 Loading policy engine...
  ✅ Policy loaded
     Allowed tools: ['web_search', 'summarize', 'read_file']
     Budget limit: $10.0
  📊 Starting telemetry...
  ✅ Telemetry active
✅ Agent started successfully!
============================================================

📋 Test 1: web_search (ALLOWED)
  🔍 Searching: AIGRC governance framework
  ✅ Success: {'results': ['Result for: AIGRC governance framework'], 'cost': 0.01}

📋 Test 2: summarize (ALLOWED)
  📝 Summarizing 42 chars...
  ✅ Success: {'summary': 'Summary of: AIGRC is a framework for AI governance......', 'cost': 0.02}

📋 Test 3: send_email (DENIED - not in allowed_tools)
  🚫 Correctly denied: Tool 'send_email' not in allowed_tools. Allowed: ['web_search', 'summarize', 'read_file']

📋 Test 4: web_search internal site (DENIED - blocked resource)
  🚫 Correctly denied: Resource 'https://internal.company.com/secrets' blocked by policy. Matched deny rule: https://*.internal.company.com/*

💰 Budget spent: $0.030
   Budget remaining: $9.970

🛑 Stopping agent...
✅ Agent stopped
```

---

## Deep Dive: RuntimeIdentity

### Identity Structure

```python
@dataclass
class RuntimeIdentity:
    """Cryptographic identity for a governed agent."""

    # Unique instance identifier (UUIDv4)
    instance_id: str

    # Reference to static governance
    asset_id: str
    asset_name: str
    asset_version: str

    # Organization context
    organization_id: str

    # Business authorization proof
    golden_thread: GoldenThread

    # What this agent can do
    capabilities: CapabilityManifest

    # Operating mode
    mode: Literal["NORMAL", "SANDBOX", "RESTRICTED"]

    # Lineage tracking (for multi-agent)
    parent_instance_id: Optional[str] = None
    root_instance_id: Optional[str] = None
    generation_depth: int = 0
    children: List[str] = field(default_factory=list)

    # Timestamps
    created_at: datetime
    expires_at: Optional[datetime] = None
```

### Operating Modes

| Mode | Trigger | Behavior |
|------|---------|----------|
| **NORMAL** | Golden Thread verified | Full capabilities |
| **SANDBOX** | Golden Thread failed | Restricted capabilities, extra logging |
| **RESTRICTED** | External signal | Minimal capabilities, audit mode |

---

## Deep Dive: PolicyEngine

### Check Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         POLICY CHECK FLOW                                    │
│                         Target: < 2ms                                        │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  check(tool="web_search", resource="https://example.com")                   │
│                                                                             │
│  ┌─────────────────┐                                                        │
│  │ 1. Kill Switch  │ ──── Is kill switch active? ──── YES ──► DENY         │
│  └────────┬────────┘                                          (immediate)   │
│           │ NO                                                              │
│           ▼                                                                 │
│  ┌─────────────────┐                                                        │
│  │ 2. Capability   │ ──── Is tool in allowed_tools? ── NO ──► DENY         │
│  └────────┬────────┘                                                        │
│           │ YES                                                             │
│           ▼                                                                 │
│  ┌─────────────────┐                                                        │
│  │ 3. Deny List    │ ──── Is tool in denied_tools? ─── YES ─► DENY         │
│  └────────┬────────┘                                                        │
│           │ NO                                                              │
│           ▼                                                                 │
│  ┌─────────────────┐                                                        │
│  │ 4. Resource     │ ──── Does resource match ──────── NO ──► DENY         │
│  │    Allow        │      allowed_resources?                                │
│  └────────┬────────┘                                                        │
│           │ YES                                                             │
│           ▼                                                                 │
│  ┌─────────────────┐                                                        │
│  │ 5. Resource     │ ──── Does resource match ──────── YES ─► DENY         │
│  │    Deny         │      denied_resources?                                 │
│  └────────┬────────┘                                                        │
│           │ NO                                                              │
│           ▼                                                                 │
│  ┌─────────────────┐                                                        │
│  │ 6. Budget       │ ──── Would this exceed budget? ── YES ─► DENY         │
│  └────────┬────────┘                                                        │
│           │ NO                                                              │
│           ▼                                                                 │
│  ┌─────────────────┐                                                        │
│  │ 7. Custom       │ ──── Custom validators pass? ──── NO ──► DENY         │
│  └────────┬────────┘                                                        │
│           │ YES                                                             │
│           ▼                                                                 │
│       ╔═══════╗                                                             │
│       ║ ALLOW ║                                                             │
│       ╚═══════╝                                                             │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Performance Optimization

```python
class PolicyEngine:
    """Optimized policy engine for < 2ms checks."""

    def __init__(self):
        # Pre-compiled patterns for O(1) lookups
        self._allowed_tools: Set[str] = set()
        self._denied_tools: Set[str] = set()

        # Compiled regex for resource patterns
        self._allowed_patterns: List[re.Pattern] = []
        self._denied_patterns: List[re.Pattern] = []

        # Cached kill switch state
        self._kill_switch_active: bool = False

    async def check(self, tool: str, resource: Optional[str] = None) -> PolicyDecision:
        """
        Check permission in < 2ms.

        Optimization strategies:
        1. Set lookups (O(1)) for tool checks
        2. Pre-compiled regex for resource patterns
        3. Early exit on first deny
        4. Cached kill switch state
        """
        start = time.perf_counter_ns()

        # 1. Kill switch (cached, O(1))
        if self._kill_switch_active:
            return PolicyDecision(allowed=False, reason="kill_switch_active")

        # 2. Capability check (set lookup, O(1))
        if tool not in self._allowed_tools:
            return PolicyDecision(allowed=False, reason="capability_denied")

        # 3. Deny list check (set lookup, O(1))
        if tool in self._denied_tools:
            return PolicyDecision(allowed=False, reason="tool_denied")

        # 4-5. Resource checks (only if resource provided)
        if resource:
            # Check allow patterns
            allowed = any(p.match(resource) for p in self._allowed_patterns)
            if not allowed:
                return PolicyDecision(allowed=False, reason="resource_not_allowed")

            # Check deny patterns (deny overrides allow)
            denied = any(p.match(resource) for p in self._denied_patterns)
            if denied:
                return PolicyDecision(allowed=False, reason="resource_denied")

        # 6. Budget check
        if self._would_exceed_budget():
            return PolicyDecision(allowed=False, reason="budget_exceeded")

        elapsed_ns = time.perf_counter_ns() - start
        elapsed_ms = elapsed_ns / 1_000_000

        return PolicyDecision(
            allowed=True,
            latency_ms=elapsed_ms,
        )
```

---

## Deep Dive: Golden Thread

### What is Golden Thread?

The Golden Thread is a cryptographic link from a running agent back to its business authorization:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           GOLDEN THREAD                                      │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  BUSINESS LAYER                                                             │
│  ──────────────                                                             │
│  "Agent approved for research use case"                                     │
│  Ticket: AI-2026-0042                                                       │
│  Approved by: CISO                                                          │
│                     │                                                       │
│                     │ Cryptographic Hash                                    │
│                     ▼                                                       │
│  BUILD TIME                                                                 │
│  ──────────                                                                 │
│  GitHub Action computes hash:                                               │
│  sha256(ticket_id|approved_by|approved_at|scope)                           │
│  Stores in asset card                                                       │
│                     │                                                       │
│                     │ Verification                                          │
│                     ▼                                                       │
│  RUNTIME                                                                    │
│  ───────                                                                    │
│  Agent verifies hash matches                                                │
│  If mismatch → SANDBOX mode                                                 │
│  If valid → NORMAL mode                                                     │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Hash Computation

```python
def compute_golden_thread_hash(golden_thread: dict) -> str:
    """
    Compute Golden Thread hash.

    Algorithm: SHA-256
    Canonicalization: Sorted fields with | separator
    """
    # Required fields
    fields = [
        ("approved_at", golden_thread["approved_at"]),
        ("approved_by", golden_thread["approved_by"]),
        ("ticket_id", golden_thread["ticket_id"]),
    ]

    # Optional fields (if present)
    if "scope" in golden_thread:
        fields.append(("scope", golden_thread["scope"]))

    # Sort by field name
    fields.sort(key=lambda x: x[0])

    # Create canonical string
    canonical = "|".join(f"{k}={v}" for k, v in fields)

    # Compute hash
    hash_bytes = hashlib.sha256(canonical.encode()).hexdigest()

    return f"sha256:{hash_bytes}"
```

---

## Practice Lab: Build a Complete Governed Agent

### Lab Objective

Build a governed "Code Review Agent" that:
1. Reads source files (allowed)
2. Analyzes code patterns (allowed)
3. Cannot write files (denied)
4. Cannot access internal URLs (denied)
5. Has a $5.00 budget limit

### Lab Steps

#### Step 1: Create the Asset Card

Create `.aigrc/cards/code-review-agent.asset.yaml`:

```yaml
asset_id: code-review-agent-v1
name: Code Review Assistant
description: Reviews code for quality and security issues
version: 1.0.0

ownership:
  owner: dev-tools@company.com
  team: Developer Experience

technical:
  frameworks:
    - name: aigos
      version: "^1.0.0"

risk_classification:
  level: minimal
  rationale: Read-only code analysis, no execution capability

capabilities:
  allowed_tools:
    - read_file
    - analyze_code
    - list_files
    - get_file_info
  denied_tools:
    - write_file
    - execute_code
    - delete_file
    - send_notification
  allowed_resources:
    - "file://./src/**"
    - "file://./tests/**"
  denied_resources:
    - "file://./.env"
    - "file://./secrets/**"
    - "https://*"
  budget:
    max_usd: 5.00
    max_tokens: 50000

golden_thread:
  ticket_id: "DEV-2026-0101"
  approved_by: engineering-lead@company.com
  approved_at: "2026-01-09T14:00:00Z"
  scope: "Code review for src/ and tests/ directories"
```

#### Step 2: Implement the Agent

Create `code_review_agent.py` with:
- RuntimeIdentity initialization
- PolicyEngine with the capabilities above
- Methods for each allowed tool
- Proper error handling for denied actions

#### Step 3: Test Scenarios

Write tests for:
1. ✅ Read allowed file (`src/main.py`)
2. ✅ Analyze code in allowed directory
3. ❌ Attempt to write file (should deny)
4. ❌ Attempt to read `.env` (should deny)
5. ❌ Attempt to access external URL (should deny)

#### Step 4: Verify Telemetry

Check that all actions emit proper telemetry:
- Startup event with identity
- Decision events for each check
- Violation events for denied actions
- Shutdown event

### Lab Validation

Your agent passes if:
- [ ] All 5 test scenarios behave correctly
- [ ] Golden Thread verification succeeds
- [ ] Budget tracking works
- [ ] Telemetry events are emitted
- [ ] Denied actions raise appropriate exceptions

---

## Knowledge Check

1. **What happens if Golden Thread verification fails?**
   - a) Agent crashes
   - b) Agent enters SANDBOX mode ✓
   - c) Agent runs normally
   - d) Agent is deleted

2. **What is the target latency for policy checks?**
   - a) < 100ms
   - b) < 10ms
   - c) < 2ms ✓
   - d) < 0.1ms

3. **In what order are policy checks performed?**
   - a) Budget → Capability → Resource
   - b) Kill Switch → Capability → Deny List → Resource → Budget ✓
   - c) Resource → Budget → Capability
   - d) Random order

4. **What does RuntimeIdentity.mode indicate?**
   - a) Debug vs Release build
   - b) Test vs Production environment
   - c) Level of capability restriction based on verification ✓
   - d) Network connectivity status

5. **Which component is responsible for "What can this agent do?"**
   - a) Identity Manager
   - b) Policy Engine ✓
   - c) Telemetry Emitter
   - d) Golden Thread

---

## Key Takeaways

1. **Static governance isn't enough** - Runtime enforcement is essential for real compliance
2. **Identity is cryptographic** - Golden Thread links runtime to business authorization
3. **Policy checks must be fast** - < 2ms target, use optimized data structures
4. **Deny by default** - If not explicitly allowed, it's denied
5. **Telemetry is mandatory** - You can't prove compliance without audit trail

---

## Next Steps

Continue to [Module 5.2: Kill Switch Operations](./02-kill-switch-operations.md) to learn how to implement remote agent termination with < 60 second SLA.

---

*Module 5.1 - AIGRC Training Program v2.0*
