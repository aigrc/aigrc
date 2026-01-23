# Module 5.3: Multi-Agent Architecture

> **Duration:** 2-3 hours
> **Prerequisites:** Module 5.1, Module 5.2
> **Target Audience:** Senior Developers, Architects, ML Engineers

---

## Learning Objectives

By the end of this module, you will be able to:
1. Design governed multi-agent hierarchies with proper lineage
2. Implement capability decay to prevent privilege escalation
3. Build parent-child agent spawning with automatic governance
4. Create swarm architectures with coordinated governance
5. Handle cascading termination and state management

---

## WHY: The Multi-Agent Governance Challenge

### The Problem: Uncontrolled Agent Spawning

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    WITHOUT CAPABILITY DECAY                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Root Agent (Full Capabilities)                                             │
│  ├── Tools: [web_search, execute_code, send_email, access_db]              │
│  │                                                                          │
│  │   Spawns "helper" agent...                                              │
│  │                                                                          │
│  └── Child Agent (Inherits ALL capabilities!) ⚠️                           │
│      ├── Tools: [web_search, execute_code, send_email, access_db]          │
│      │                                                                      │
│      │   Spawns another "helper"...                                        │
│      │                                                                      │
│      └── Grandchild Agent (Still has execute_code!) ⚠️⚠️                   │
│          └── Can execute arbitrary code despite being 2 levels deep!       │
│                                                                             │
│  PROBLEM: Capability laundering through spawning                            │
│  ATTACK:  Create child to bypass parent's restrictions                      │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                    WITH CAPABILITY DECAY                                     │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Root Agent                                                                 │
│  ├── Tools: [web_search, execute_code, send_email, access_db]              │
│  ├── Budget: $100                                                           │
│  │                                                                          │
│  │   Spawns child with EXPLICIT capabilities only                          │
│  │                                                                          │
│  └── Child Agent                                                            │
│      ├── Tools: [web_search] ✅  (subset of parent)                        │
│      ├── Budget: $10 ✅  (≤ parent)                                        │
│      │                                                                      │
│      │   Spawns grandchild...                                              │
│      │                                                                      │
│      └── Grandchild Agent                                                   │
│          ├── Tools: [web_search] ✅  (subset of child ⊆ parent)            │
│          ├── Budget: $5 ✅  (≤ child ≤ parent)                             │
│          └── Cannot request execute_code (not in lineage)                   │
│                                                                             │
│  RULE: capabilities(child) ⊆ capabilities(parent)                           │
│  ENFORCED: At spawn time AND runtime                                        │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Why Multi-Agent?

| Use Case | Architecture | Governance Challenge |
|----------|--------------|---------------------|
| **Task Decomposition** | Coordinator + Workers | Workers shouldn't exceed coordinator |
| **Parallel Processing** | Swarm of identical agents | Budget must be divided |
| **Specialized Roles** | Different agent types | Each type needs different capabilities |
| **Hierarchical Reasoning** | Manager → Supervisor → Worker | Each level should have less authority |

---

## WHAT: Multi-Agent Governance Concepts

### Agent Lineage

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         AGENT LINEAGE MODEL                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                         ROOT AGENT                                   │   │
│  │  instance_id: "root-001"                                            │   │
│  │  generation_depth: 0                                                 │   │
│  │  parent_instance_id: null                                           │   │
│  │  root_instance_id: "root-001" (self)                                │   │
│  └────────────────────────────┬────────────────────────────────────────┘   │
│                               │                                             │
│              ┌────────────────┴────────────────┐                           │
│              │                                 │                            │
│              ▼                                 ▼                            │
│  ┌───────────────────────┐      ┌───────────────────────┐                  │
│  │     CHILD AGENT A     │      │     CHILD AGENT B     │                  │
│  │  instance_id: "a-001" │      │  instance_id: "b-001" │                  │
│  │  generation_depth: 1  │      │  generation_depth: 1  │                  │
│  │  parent: "root-001"   │      │  parent: "root-001"   │                  │
│  │  root: "root-001"     │      │  root: "root-001"     │                  │
│  └───────────┬───────────┘      └───────────────────────┘                  │
│              │                                                              │
│              ▼                                                              │
│  ┌───────────────────────┐                                                 │
│  │   GRANDCHILD AGENT    │                                                 │
│  │  instance_id: "aa-01" │                                                 │
│  │  generation_depth: 2  │                                                 │
│  │  parent: "a-001"      │                                                 │
│  │  root: "root-001"     │                                                 │
│  └───────────────────────┘                                                 │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Capability Decay Modes

| Mode | Behavior | Use Case |
|------|----------|----------|
| **DECAY** (Default) | Auto-reduce based on rules | General spawning |
| **EXPLICIT** | Only what's explicitly granted | Security-sensitive |
| **INHERIT** | Same as parent | Testing only (dangerous) |

### Decay Rules

```python
# Mathematical rule:
# ∀ child, parent: capabilities(child) ⊆ capabilities(parent)

# Enforcement:
child.allowed_tools    ⊆ parent.allowed_tools
child.allowed_resources ⊆ parent.allowed_resources
child.budget           ≤ parent.budget_remaining
child.generation_depth  = parent.generation_depth + 1
child.generation_depth ≤ max_generation_depth  # Configurable limit
```

---

## HOW: Building Multi-Agent Systems

### Step 1: Parent Agent with Spawning

```python
# multi_agent.py
"""
Multi-Agent Architecture with Capability Decay
==============================================

Demonstrates:
1. Parent agent spawning governed children
2. Capability decay enforcement
3. Lineage tracking
4. Cascading termination
5. Budget allocation
"""

import asyncio
from datetime import datetime
from typing import List, Optional, Set
from dataclasses import dataclass, field
from enum import Enum


class DecayMode(Enum):
    DECAY = "decay"        # Auto-reduce based on rules
    EXPLICIT = "explicit"  # Only what's explicitly granted
    INHERIT = "inherit"    # Same as parent (dangerous)


@dataclass
class CapabilityManifest:
    """Defines what an agent can do."""
    allowed_tools: Set[str] = field(default_factory=set)
    denied_tools: Set[str] = field(default_factory=set)
    allowed_resources: Set[str] = field(default_factory=set)
    denied_resources: Set[str] = field(default_factory=set)
    max_budget_usd: float = 0.0
    can_spawn: bool = True
    max_children: int = 10
    max_generation_depth: int = 3


@dataclass
class AgentLineage:
    """Tracks agent family relationships."""
    instance_id: str
    asset_id: str
    generation_depth: int
    parent_instance_id: Optional[str]
    root_instance_id: str
    children: List[str] = field(default_factory=list)


class CapabilityDecayEngine:
    """
    Enforces capability decay when spawning children.

    Core rule: capabilities(child) ⊆ capabilities(parent)
    """

    @staticmethod
    def validate_child_capabilities(
        parent_caps: CapabilityManifest,
        requested_caps: CapabilityManifest,
        mode: DecayMode = DecayMode.EXPLICIT,
    ) -> tuple[bool, Optional[str], CapabilityManifest]:
        """
        Validate and compute child capabilities.

        Returns:
            (valid, error_message, effective_capabilities)
        """
        if mode == DecayMode.INHERIT:
            # Inherit mode - child gets same as parent
            # WARNING: This is dangerous and should only be used in testing
            return (True, None, parent_caps)

        # Validate tools subset
        invalid_tools = requested_caps.allowed_tools - parent_caps.allowed_tools
        if invalid_tools:
            return (
                False,
                f"Tools not in parent capabilities: {invalid_tools}",
                None,
            )

        # Validate resources subset
        # (In production, use pattern matching for glob patterns)
        invalid_resources = requested_caps.allowed_resources - parent_caps.allowed_resources
        if invalid_resources:
            return (
                False,
                f"Resources not in parent capabilities: {invalid_resources}",
                None,
            )

        # Validate budget
        if requested_caps.max_budget_usd > parent_caps.max_budget_usd:
            return (
                False,
                f"Budget {requested_caps.max_budget_usd} exceeds parent's {parent_caps.max_budget_usd}",
                None,
            )

        # Check spawn permission
        if not parent_caps.can_spawn:
            return (False, "Parent cannot spawn children", None)

        if mode == DecayMode.DECAY:
            # Auto-decay: Apply default reductions
            effective = CapabilityManifest(
                allowed_tools=requested_caps.allowed_tools & parent_caps.allowed_tools,
                denied_tools=parent_caps.denied_tools | requested_caps.denied_tools,
                allowed_resources=requested_caps.allowed_resources & parent_caps.allowed_resources,
                denied_resources=parent_caps.denied_resources | requested_caps.denied_resources,
                max_budget_usd=min(
                    requested_caps.max_budget_usd,
                    parent_caps.max_budget_usd * 0.5,  # 50% decay by default
                ),
                can_spawn=parent_caps.max_generation_depth > 1,  # Can spawn if depth allows
                max_children=min(requested_caps.max_children, parent_caps.max_children // 2),
                max_generation_depth=parent_caps.max_generation_depth - 1,
            )
        else:  # EXPLICIT
            # Explicit: Use exactly what's requested (already validated)
            effective = CapabilityManifest(
                allowed_tools=requested_caps.allowed_tools,
                denied_tools=parent_caps.denied_tools | requested_caps.denied_tools,
                allowed_resources=requested_caps.allowed_resources,
                denied_resources=parent_caps.denied_resources | requested_caps.denied_resources,
                max_budget_usd=requested_caps.max_budget_usd,
                can_spawn=requested_caps.can_spawn and parent_caps.max_generation_depth > 1,
                max_children=requested_caps.max_children,
                max_generation_depth=parent_caps.max_generation_depth - 1,
            )

        return (True, None, effective)


class GovernedAgent:
    """A governed agent that can spawn governed children."""

    def __init__(
        self,
        asset_id: str,
        instance_id: str,
        capabilities: CapabilityManifest,
        lineage: AgentLineage,
    ):
        self.asset_id = asset_id
        self.instance_id = instance_id
        self.capabilities = capabilities
        self.lineage = lineage

        # Runtime state
        self._running = False
        self._children: List['GovernedAgent'] = []
        self._budget_spent = 0.0

    async def start(self) -> None:
        """Start the agent."""
        print(f"🚀 Starting agent {self.instance_id}")
        print(f"   Asset: {self.asset_id}")
        print(f"   Generation: {self.lineage.generation_depth}")
        print(f"   Parent: {self.lineage.parent_instance_id or 'None (root)'}")
        print(f"   Tools: {self.capabilities.allowed_tools}")
        print(f"   Budget: ${self.capabilities.max_budget_usd:.2f}")
        print(f"   Can spawn: {self.capabilities.can_spawn}")
        self._running = True

    async def spawn(
        self,
        child_asset_id: str,
        requested_capabilities: CapabilityManifest,
        decay_mode: DecayMode = DecayMode.EXPLICIT,
    ) -> 'GovernedAgent':
        """
        Spawn a governed child agent.

        The child's capabilities are validated and decayed
        to ensure they're a subset of the parent's.
        """
        print(f"\n👶 Spawning child agent...")
        print(f"   Requested asset: {child_asset_id}")
        print(f"   Requested tools: {requested_capabilities.allowed_tools}")
        print(f"   Requested budget: ${requested_capabilities.max_budget_usd:.2f}")
        print(f"   Decay mode: {decay_mode.value}")

        # Check if we can spawn
        if not self.capabilities.can_spawn:
            raise PermissionError("This agent cannot spawn children")

        if len(self._children) >= self.capabilities.max_children:
            raise PermissionError(
                f"Maximum children ({self.capabilities.max_children}) reached"
            )

        if self.lineage.generation_depth >= self.capabilities.max_generation_depth:
            raise PermissionError(
                f"Maximum generation depth ({self.capabilities.max_generation_depth}) reached"
            )

        # Validate and compute child capabilities
        valid, error, effective_caps = CapabilityDecayEngine.validate_child_capabilities(
            parent_caps=self.capabilities,
            requested_caps=requested_capabilities,
            mode=decay_mode,
        )

        if not valid:
            print(f"   ❌ Spawn denied: {error}")
            raise PermissionError(f"Capability decay violation: {error}")

        # Deduct budget from parent
        if effective_caps.max_budget_usd > 0:
            self.capabilities.max_budget_usd -= effective_caps.max_budget_usd

        # Generate child instance ID
        child_instance_id = f"{self.instance_id}-child-{len(self._children) + 1}"

        # Create child lineage
        child_lineage = AgentLineage(
            instance_id=child_instance_id,
            asset_id=child_asset_id,
            generation_depth=self.lineage.generation_depth + 1,
            parent_instance_id=self.instance_id,
            root_instance_id=self.lineage.root_instance_id,
        )

        # Create child agent
        child = GovernedAgent(
            asset_id=child_asset_id,
            instance_id=child_instance_id,
            capabilities=effective_caps,
            lineage=child_lineage,
        )

        # Track child
        self._children.append(child)
        self.lineage.children.append(child_instance_id)

        print(f"   ✅ Child spawned: {child_instance_id}")
        print(f"   Effective tools: {effective_caps.allowed_tools}")
        print(f"   Effective budget: ${effective_caps.max_budget_usd:.2f}")

        # Start child
        await child.start()

        return child

    async def terminate(self, reason: str, cascade: bool = True) -> None:
        """
        Terminate this agent and optionally its children.

        Cascading termination is the default and recommended.
        """
        print(f"\n💀 Terminating agent {self.instance_id}")
        print(f"   Reason: {reason}")
        print(f"   Cascade: {cascade}")

        # Terminate children first (depth-first)
        if cascade and self._children:
            print(f"   Terminating {len(self._children)} children...")
            for child in self._children:
                await child.terminate(
                    reason=f"Parent cascade: {reason}",
                    cascade=True,
                )

        # Cleanup this agent
        self._running = False
        self._children = []

        print(f"   ✅ Agent {self.instance_id} terminated")

    @property
    def budget_remaining(self) -> float:
        """Get remaining budget."""
        return self.capabilities.max_budget_usd - self._budget_spent


async def demo_parent_child():
    """Demonstrate parent-child spawning with capability decay."""

    print("=" * 70)
    print("DEMO: Parent-Child Agent Hierarchy")
    print("=" * 70)

    # Create root agent with full capabilities
    root_caps = CapabilityManifest(
        allowed_tools={"web_search", "execute_code", "send_email", "read_file"},
        allowed_resources={"https://*", "file://*"},
        max_budget_usd=100.0,
        can_spawn=True,
        max_children=5,
        max_generation_depth=3,
    )

    root_lineage = AgentLineage(
        instance_id="root-001",
        asset_id="coordinator-agent",
        generation_depth=0,
        parent_instance_id=None,
        root_instance_id="root-001",
    )

    root = GovernedAgent(
        asset_id="coordinator-agent",
        instance_id="root-001",
        capabilities=root_caps,
        lineage=root_lineage,
    )

    await root.start()

    # Spawn a child with subset of capabilities
    print("\n" + "-" * 70)
    print("Spawning research child (subset of parent capabilities)")
    print("-" * 70)

    research_caps = CapabilityManifest(
        allowed_tools={"web_search", "read_file"},  # Subset
        allowed_resources={"https://wikipedia.org/*", "https://arxiv.org/*"},
        max_budget_usd=20.0,  # Less than parent
        can_spawn=True,
        max_children=2,
    )

    research_child = await root.spawn(
        child_asset_id="research-worker",
        requested_capabilities=research_caps,
    )

    # Try to spawn a child with INVALID capabilities (should fail)
    print("\n" + "-" * 70)
    print("Attempting to spawn child with INVALID capabilities (should fail)")
    print("-" * 70)

    invalid_caps = CapabilityManifest(
        allowed_tools={"web_search", "launch_missiles"},  # Not in parent!
        max_budget_usd=10.0,
    )

    try:
        await root.spawn(
            child_asset_id="invalid-worker",
            requested_capabilities=invalid_caps,
        )
    except PermissionError as e:
        print(f"   🚫 Correctly rejected: {e}")

    # Spawn grandchild from child
    print("\n" + "-" * 70)
    print("Spawning grandchild from research child")
    print("-" * 70)

    grandchild_caps = CapabilityManifest(
        allowed_tools={"web_search"},  # Subset of child (which is subset of parent)
        allowed_resources={"https://wikipedia.org/*"},
        max_budget_usd=5.0,
        can_spawn=False,  # Can't spawn further
    )

    grandchild = await research_child.spawn(
        child_asset_id="focused-researcher",
        requested_capabilities=grandchild_caps,
    )

    # Demonstrate cascading termination
    print("\n" + "-" * 70)
    print("Cascading termination from root")
    print("-" * 70)

    await root.terminate(reason="Demo complete", cascade=True)


async def demo_swarm():
    """Demonstrate swarm architecture with coordinator."""

    print("\n" + "=" * 70)
    print("DEMO: Swarm Architecture")
    print("=" * 70)

    # Create coordinator
    coordinator_caps = CapabilityManifest(
        allowed_tools={"web_search", "summarize", "coordinate"},
        allowed_resources={"https://*"},
        max_budget_usd=50.0,
        can_spawn=True,
        max_children=10,
        max_generation_depth=2,  # Only one level of workers
    )

    coordinator_lineage = AgentLineage(
        instance_id="coordinator-001",
        asset_id="swarm-coordinator",
        generation_depth=0,
        parent_instance_id=None,
        root_instance_id="coordinator-001",
    )

    coordinator = GovernedAgent(
        asset_id="swarm-coordinator",
        instance_id="coordinator-001",
        capabilities=coordinator_caps,
        lineage=coordinator_lineage,
    )

    await coordinator.start()

    # Spawn multiple workers
    print("\n" + "-" * 70)
    print("Spawning 3 worker agents")
    print("-" * 70)

    workers = []
    for i in range(3):
        worker_caps = CapabilityManifest(
            allowed_tools={"web_search"},  # Workers can only search
            allowed_resources={"https://*"},
            max_budget_usd=10.0,  # Split budget among workers
            can_spawn=False,  # Workers can't spawn
        )

        worker = await coordinator.spawn(
            child_asset_id=f"search-worker-{i+1}",
            requested_capabilities=worker_caps,
        )
        workers.append(worker)

    print(f"\n✅ Swarm created with {len(workers)} workers")
    print(f"   Coordinator budget remaining: ${coordinator.budget_remaining:.2f}")

    # Terminate swarm
    print("\n" + "-" * 70)
    print("Terminating swarm")
    print("-" * 70)

    await coordinator.terminate(reason="Swarm task complete", cascade=True)


if __name__ == "__main__":
    asyncio.run(demo_parent_child())
    asyncio.run(demo_swarm())
```

### Step 2: Running the Demo

```bash
python multi_agent.py
```

**Expected Output:**

```
======================================================================
DEMO: Parent-Child Agent Hierarchy
======================================================================
🚀 Starting agent root-001
   Asset: coordinator-agent
   Generation: 0
   Parent: None (root)
   Tools: {'read_file', 'execute_code', 'send_email', 'web_search'}
   Budget: $100.00
   Can spawn: True

----------------------------------------------------------------------
Spawning research child (subset of parent capabilities)
----------------------------------------------------------------------

👶 Spawning child agent...
   Requested asset: research-worker
   Requested tools: {'read_file', 'web_search'}
   Requested budget: $20.00
   Decay mode: explicit
   ✅ Child spawned: root-001-child-1
   Effective tools: {'read_file', 'web_search'}
   Effective budget: $20.00
🚀 Starting agent root-001-child-1
   Asset: research-worker
   Generation: 1
   Parent: root-001
   Tools: {'read_file', 'web_search'}
   Budget: $20.00
   Can spawn: True

----------------------------------------------------------------------
Attempting to spawn child with INVALID capabilities (should fail)
----------------------------------------------------------------------

👶 Spawning child agent...
   Requested asset: invalid-worker
   Requested tools: {'launch_missiles', 'web_search'}
   Requested budget: $10.00
   Decay mode: explicit
   ❌ Spawn denied: Tools not in parent capabilities: {'launch_missiles'}
   🚫 Correctly rejected: Capability decay violation: Tools not in parent capabilities: {'launch_missiles'}

----------------------------------------------------------------------
Spawning grandchild from research child
----------------------------------------------------------------------

👶 Spawning child agent...
   Requested asset: focused-researcher
   Requested tools: {'web_search'}
   Requested budget: $5.00
   Decay mode: explicit
   ✅ Child spawned: root-001-child-1-child-1
   Effective tools: {'web_search'}
   Effective budget: $5.00
🚀 Starting agent root-001-child-1-child-1
   Asset: focused-researcher
   Generation: 2
   Parent: root-001-child-1
   Tools: {'web_search'}
   Budget: $5.00
   Can spawn: False

----------------------------------------------------------------------
Cascading termination from root
----------------------------------------------------------------------

💀 Terminating agent root-001
   Reason: Demo complete
   Cascade: True
   Terminating 1 children...

💀 Terminating agent root-001-child-1
   Reason: Parent cascade: Demo complete
   Cascade: True
   Terminating 1 children...

💀 Terminating agent root-001-child-1-child-1
   Reason: Parent cascade: Parent cascade: Demo complete
   Cascade: True
   ✅ Agent root-001-child-1-child-1 terminated
   ✅ Agent root-001-child-1 terminated
   ✅ Agent root-001-child-1 terminated
```

---

## Practice Lab: Build a Governed Research Swarm

### Lab Objective

Build a complete research swarm that:
1. Has a coordinator that receives research queries
2. Spawns 3 parallel worker agents for different sources
3. Workers have decayed capabilities (search only)
4. Results are aggregated by coordinator
5. Entire swarm terminates cleanly

### Lab Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         RESEARCH SWARM ARCHITECTURE                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│                      ┌─────────────────────────┐                            │
│                      │      COORDINATOR        │                            │
│                      │  Tools: search,         │                            │
│                      │         summarize,      │                            │
│                      │         aggregate       │                            │
│                      │  Budget: $50            │                            │
│                      └───────────┬─────────────┘                            │
│                                  │                                          │
│              ┌───────────────────┼───────────────────┐                     │
│              │                   │                   │                      │
│              ▼                   ▼                   ▼                      │
│  ┌───────────────────┐ ┌───────────────────┐ ┌───────────────────┐         │
│  │   WIKI WORKER     │ │   ARXIV WORKER    │ │   NEWS WORKER     │         │
│  │  Tools: search    │ │  Tools: search    │ │  Tools: search    │         │
│  │  Budget: $10      │ │  Budget: $10      │ │  Budget: $10      │         │
│  │  Resources:       │ │  Resources:       │ │  Resources:       │         │
│  │   wikipedia.org   │ │   arxiv.org       │ │   news.google.com │         │
│  └───────────────────┘ └───────────────────┘ └───────────────────┘         │
│                                                                             │
│  FLOW:                                                                      │
│  1. User sends query to Coordinator                                         │
│  2. Coordinator spawns 3 specialized workers                                │
│  3. Workers search their respective sources (in parallel)                   │
│  4. Results returned to Coordinator                                         │
│  5. Coordinator aggregates and summarizes                                   │
│  6. Swarm terminates                                                        │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Lab Steps

#### Step 1: Define Worker Configurations

```python
# lab_swarm.py

WORKER_CONFIGS = [
    {
        "asset_id": "wiki-worker",
        "name": "Wikipedia Researcher",
        "tools": {"web_search"},
        "resources": {"https://*.wikipedia.org/*"},
        "budget": 10.0,
    },
    {
        "asset_id": "arxiv-worker",
        "name": "ArXiv Researcher",
        "tools": {"web_search"},
        "resources": {"https://arxiv.org/*"},
        "budget": 10.0,
    },
    {
        "asset_id": "news-worker",
        "name": "News Researcher",
        "tools": {"web_search"},
        "resources": {"https://news.google.com/*"},
        "budget": 10.0,
    },
]
```

#### Step 2: Implement Research Coordinator

```python
class ResearchCoordinator(GovernedAgent):
    """Coordinator that manages research workers."""

    async def research(self, query: str) -> dict:
        """
        Execute a research query using the swarm.

        1. Spawn workers
        2. Distribute query
        3. Collect results
        4. Aggregate
        5. Cleanup
        """
        print(f"\n🔬 Research query: {query}")

        # Spawn workers
        workers = []
        for config in WORKER_CONFIGS:
            worker_caps = CapabilityManifest(
                allowed_tools=config["tools"],
                allowed_resources=config["resources"],
                max_budget_usd=config["budget"],
                can_spawn=False,
            )

            worker = await self.spawn(
                child_asset_id=config["asset_id"],
                requested_capabilities=worker_caps,
            )
            workers.append((config["name"], worker))

        # Execute searches in parallel
        print(f"\n🔍 Executing parallel searches...")
        tasks = []
        for name, worker in workers:
            task = asyncio.create_task(
                self._worker_search(worker, query, name)
            )
            tasks.append(task)

        results = await asyncio.gather(*tasks, return_exceptions=True)

        # Aggregate results
        print(f"\n📊 Aggregating results...")
        aggregated = {
            "query": query,
            "sources": [],
            "total_results": 0,
        }

        for (name, worker), result in zip(workers, results):
            if isinstance(result, Exception):
                print(f"   ⚠️  {name} failed: {result}")
            else:
                aggregated["sources"].append({
                    "source": name,
                    "results": result,
                })
                aggregated["total_results"] += len(result.get("items", []))

        # Cleanup workers
        print(f"\n🧹 Cleaning up workers...")
        for name, worker in workers:
            await worker.terminate(reason="Task complete", cascade=False)

        return aggregated

    async def _worker_search(
        self,
        worker: GovernedAgent,
        query: str,
        source_name: str,
    ) -> dict:
        """Execute search on a worker."""
        print(f"   🔎 {source_name} searching...")
        # Simulated search
        await asyncio.sleep(0.5)  # Simulate API call
        return {
            "source": source_name,
            "items": [
                {"title": f"Result 1 for {query}", "url": "..."},
                {"title": f"Result 2 for {query}", "url": "..."},
            ],
        }
```

#### Step 3: Run the Lab

```python
async def main():
    # Create coordinator
    coordinator = ResearchCoordinator(
        asset_id="research-coordinator",
        instance_id="coord-001",
        capabilities=CapabilityManifest(
            allowed_tools={"web_search", "summarize", "aggregate"},
            allowed_resources={"https://*"},
            max_budget_usd=50.0,
            can_spawn=True,
            max_children=5,
            max_generation_depth=2,
        ),
        lineage=AgentLineage(
            instance_id="coord-001",
            asset_id="research-coordinator",
            generation_depth=0,
            parent_instance_id=None,
            root_instance_id="coord-001",
        ),
    )

    await coordinator.start()

    # Execute research
    results = await coordinator.research("AIGRC governance framework")

    print(f"\n📋 Results: {results}")

    # Terminate coordinator
    await coordinator.terminate(reason="Research complete")


if __name__ == "__main__":
    asyncio.run(main())
```

### Lab Validation Checklist

- [ ] Coordinator starts with full capabilities
- [ ] Each worker gets correct capability subset
- [ ] Workers cannot spawn (can_spawn=False)
- [ ] Budget is properly allocated to workers
- [ ] Parallel searches execute correctly
- [ ] Results are aggregated
- [ ] Workers terminate after task
- [ ] Coordinator terminates cleanly
- [ ] No orphaned agents remain

---

## Advanced Patterns

### Pattern 1: Dynamic Worker Pool

```python
class DynamicWorkerPool:
    """
    Pool that spawns/terminates workers based on demand.

    - Minimum workers always running
    - Scale up for high demand
    - Scale down when idle
    """

    def __init__(self, coordinator: GovernedAgent, min_workers: int = 2, max_workers: int = 10):
        self.coordinator = coordinator
        self.min_workers = min_workers
        self.max_workers = max_workers
        self._workers: List[GovernedAgent] = []
        self._task_queue: asyncio.Queue = asyncio.Queue()

    async def scale_up(self, count: int = 1) -> None:
        """Add workers to the pool."""
        for _ in range(count):
            if len(self._workers) >= self.max_workers:
                break
            worker = await self.coordinator.spawn(...)
            self._workers.append(worker)

    async def scale_down(self, count: int = 1) -> None:
        """Remove idle workers from the pool."""
        for _ in range(count):
            if len(self._workers) <= self.min_workers:
                break
            worker = self._workers.pop()
            await worker.terminate(reason="Scale down")
```

### Pattern 2: Hierarchical Task Decomposition

```python
class TaskDecomposer(GovernedAgent):
    """
    Agent that recursively decomposes tasks.

    Root -> Managers -> Supervisors -> Workers

    Each level has progressively fewer capabilities.
    """

    async def decompose(self, task: dict, depth: int = 0) -> dict:
        if self._is_atomic(task) or depth >= self.capabilities.max_generation_depth:
            # Execute directly
            return await self._execute(task)

        # Decompose into subtasks
        subtasks = self._split_task(task)

        # Spawn sub-agents with decayed capabilities
        results = []
        for subtask in subtasks:
            child = await self.spawn(
                child_asset_id=f"decomposer-level-{depth+1}",
                requested_capabilities=self._decay_for_subtask(subtask),
            )
            result = await child.decompose(subtask, depth + 1)
            results.append(result)
            await child.terminate(reason="Subtask complete")

        return self._merge_results(results)
```

### Pattern 3: Fault-Tolerant Swarm

```python
class FaultTolerantSwarm:
    """
    Swarm that handles worker failures gracefully.

    - Monitors worker health
    - Respawns failed workers
    - Redistributes failed tasks
    """

    async def monitor_workers(self) -> None:
        """Monitor and respawn failed workers."""
        while self._running:
            for worker in list(self._workers):
                if not worker._running:
                    print(f"⚠️  Worker {worker.instance_id} failed, respawning...")
                    self._workers.remove(worker)

                    # Respawn with same config
                    new_worker = await self.coordinator.spawn(
                        child_asset_id=worker.asset_id,
                        requested_capabilities=worker.capabilities,
                    )
                    self._workers.append(new_worker)

            await asyncio.sleep(5)  # Check every 5 seconds
```

---

## Knowledge Check

1. **What does capability decay ensure?**
   - a) Children have more capabilities than parents
   - b) Children have equal capabilities to parents
   - c) Children have subset of parent capabilities ✓
   - d) Children have no capabilities

2. **What is generation_depth?**
   - a) The complexity of the task
   - b) How many levels down from the root agent ✓
   - c) The number of tools available
   - d) The budget amount

3. **In EXPLICIT decay mode, what happens to requested capabilities?**
   - a) They are automatically expanded
   - b) They are used exactly as requested (if valid) ✓
   - c) They are reduced by 50%
   - d) They are ignored

4. **What happens during cascading termination?**
   - a) Only the parent terminates
   - b) Only children terminate
   - c) Parent and all descendants terminate ✓
   - d) Random agents terminate

5. **Why should workers typically have can_spawn=False?**
   - a) To save memory
   - b) To prevent unlimited agent creation ✓
   - c) Workers don't need capabilities
   - d) It's faster

---

## Key Takeaways

1. **Capability decay is mandatory** - Children must have ≤ parent capabilities
2. **Track lineage** - Know parent, root, and generation depth
3. **Budget flows down** - Deduct from parent when spawning
4. **Cascade by default** - Parent termination should terminate children
5. **Limit depth** - Set max_generation_depth to prevent runaway spawning

---

## Next Steps

Continue to [Module 5.4: Agent-to-Agent Trust](./04-agent-to-agent-trust.md) to learn how agents authenticate and trust each other using governance tokens.

---

*Module 5.3 - AIGRC Training Program v2.0*
