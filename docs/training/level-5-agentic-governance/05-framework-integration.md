# Module 5.5: Framework Integration

> **Duration:** 2-3 hours
> **Prerequisites:** Module 5.1, Module 5.3
> **Target Audience:** ML Engineers, AI Developers

---

## Learning Objectives

By the end of this module, you will be able to:
1. Add AIGOS governance to LangChain agents
2. Integrate governance with CrewAI crews
3. Wrap AutoGen agents with governance
4. Build custom framework adapters
5. Handle framework-specific governance patterns

---

## WHY: Framework Integration Challenges

### The Integration Problem

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    FRAMEWORK INTEGRATION CHALLENGE                           │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  EXISTING AGENTS                          GOVERNANCE REQUIREMENTS           │
│  ───────────────                          ───────────────────────           │
│                                                                             │
│  ┌─────────────────┐                      ┌─────────────────────┐          │
│  │   LangChain     │                      │  • Identity          │          │
│  │   Agent         │       HOW TO         │  • Policy checks     │          │
│  │                 │  ────────────────►   │  • Kill switch       │          │
│  │  - Tools        │     COMBINE?         │  • Telemetry         │          │
│  │  - Memory       │                      │  • Capability decay  │          │
│  │  - Callbacks    │                      │  • A2A trust         │          │
│  └─────────────────┘                      └─────────────────────┘          │
│                                                                             │
│  CHALLENGE:                                                                 │
│  • Frameworks have their own execution patterns                             │
│  • Tools are invoked internally by the framework                            │
│  • Need to intercept without breaking functionality                         │
│  • Must be non-intrusive (minimal code changes)                             │
│                                                                             │
│  SOLUTION: ADAPTERS                                                         │
│  ──────────────────                                                         │
│  Wrap framework components with governance layer                            │
│  • Tool wrappers check permissions before execution                         │
│  • Callbacks emit telemetry                                                 │
│  • Lifecycle hooks manage identity and kill switch                          │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Supported Frameworks

| Framework | Adapter | Governance Pattern |
|-----------|---------|-------------------|
| **LangChain** | `aigos.adapters.langchain` | Tool wrappers + callbacks |
| **CrewAI** | `aigos.adapters.crewai` | Agent/Crew wrappers |
| **AutoGen** | `aigos.adapters.autogen` | Agent wrappers |
| **Custom** | `aigos.adapters.base` | Base adapter class |

---

## WHAT: Adapter Architecture

### Adapter Design Pattern

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        ADAPTER ARCHITECTURE                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                      YOUR APPLICATION                                │   │
│  │                                                                      │   │
│  │   agent = GovernedLangChainAgent(                                   │   │
│  │       base_agent=langchain_agent,                                   │   │
│  │       governance=governance_config,                                 │   │
│  │   )                                                                 │   │
│  │   result = await agent.invoke(...)                                  │   │
│  │                                                                      │   │
│  └───────────────────────────────┬─────────────────────────────────────┘   │
│                                  │                                          │
│                                  ▼                                          │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                      AIGOS ADAPTER LAYER                             │   │
│  │                                                                      │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐              │   │
│  │  │   Identity   │  │   Policy     │  │  Telemetry   │              │   │
│  │  │   Manager    │  │   Engine     │  │  Emitter     │              │   │
│  │  └──────────────┘  └──────────────┘  └──────────────┘              │   │
│  │                                                                      │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐              │   │
│  │  │ Kill Switch  │  │  Capability  │  │    Tool      │              │   │
│  │  │  Listener    │  │    Decay     │  │  Wrappers    │              │   │
│  │  └──────────────┘  └──────────────┘  └──────────────┘              │   │
│  │                                                                      │   │
│  └───────────────────────────────┬─────────────────────────────────────┘   │
│                                  │                                          │
│                                  ▼                                          │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                      FRAMEWORK LAYER                                 │   │
│  │                                                                      │   │
│  │   LangChain Agent / CrewAI Crew / AutoGen Agent                     │   │
│  │   (Original functionality preserved)                                 │   │
│  │                                                                      │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## HOW: LangChain Integration

### Step 1: Install Adapter

```bash
pip install aigos-langchain
```

### Step 2: Basic LangChain Agent with Governance

```python
# langchain_governed.py
"""
LangChain Agent with AIGOS Governance
=====================================

Demonstrates wrapping a LangChain agent with full governance:
- Identity and Golden Thread
- Policy enforcement on tools
- Kill switch integration
- Governance telemetry
"""

from langchain.agents import AgentExecutor, create_react_agent
from langchain.tools import Tool
from langchain_openai import ChatOpenAI
from langchain.prompts import PromptTemplate

from aigos.adapters.langchain import (
    GovernedAgentExecutor,
    GovernedTool,
    GovernanceCallback,
)
from aigos import RuntimeIdentity, PolicyEngine


# Step 1: Create standard LangChain tools
def web_search(query: str) -> str:
    """Search the web for information."""
    return f"Search results for: {query}"

def send_email(to: str, body: str) -> str:
    """Send an email."""
    return f"Email sent to {to}"

def execute_code(code: str) -> str:
    """Execute Python code."""
    return f"Executed: {code}"

# Standard LangChain tools
langchain_tools = [
    Tool(name="web_search", func=web_search, description="Search the web"),
    Tool(name="send_email", func=send_email, description="Send email"),
    Tool(name="execute_code", func=execute_code, description="Run code"),
]

# Step 2: Wrap tools with governance
async def create_governed_agent():
    """Create a LangChain agent with AIGOS governance."""

    # Load governance configuration
    identity = await RuntimeIdentity.from_asset_card(
        ".aigrc/cards/langchain-agent.asset.yaml"
    )

    policy = await PolicyEngine.load("governance.lock")

    # Wrap tools with governance
    governed_tools = []
    for tool in langchain_tools:
        governed_tool = GovernedTool(
            base_tool=tool,
            policy_engine=policy,
            identity=identity,
        )
        governed_tools.append(governed_tool)

    # Create LangChain agent
    llm = ChatOpenAI(model="gpt-4")

    prompt = PromptTemplate.from_template("""
    You are a helpful assistant with the following tools:
    {tools}

    Use this format:
    Question: the input question
    Thought: think about what to do
    Action: the action to take
    Action Input: the input to the action
    Observation: the result
    ... (repeat as needed)
    Final Answer: the final answer

    Question: {input}
    {agent_scratchpad}
    """)

    agent = create_react_agent(llm, governed_tools, prompt)

    # Wrap executor with governance
    executor = GovernedAgentExecutor(
        agent=agent,
        tools=governed_tools,
        identity=identity,
        policy_engine=policy,
        callbacks=[GovernanceCallback(identity)],
        verbose=True,
    )

    return executor


async def main():
    """Run the governed LangChain agent."""

    agent = await create_governed_agent()

    # Start governance (identity, kill switch, etc.)
    await agent.start_governance()

    try:
        # Test 1: Allowed action (web_search)
        print("\n" + "=" * 60)
        print("Test 1: Web search (ALLOWED)")
        print("=" * 60)

        result = await agent.ainvoke({
            "input": "Search for information about AI governance"
        })
        print(f"Result: {result}")

        # Test 2: Denied action (send_email - not in allowed_tools)
        print("\n" + "=" * 60)
        print("Test 2: Send email (DENIED by policy)")
        print("=" * 60)

        try:
            result = await agent.ainvoke({
                "input": "Send an email to test@example.com with subject 'Hello'"
            })
            print(f"Result: {result}")
        except Exception as e:
            print(f"Correctly denied: {e}")

    finally:
        # Stop governance
        await agent.stop_governance()


if __name__ == "__main__":
    import asyncio
    asyncio.run(main())
```

### Step 3: GovernedTool Implementation

```python
# aigos/adapters/langchain/tool.py
"""
Governed Tool Wrapper for LangChain
===================================

Wraps LangChain tools to add permission checks before execution.
"""

from langchain.tools import BaseTool
from typing import Any, Optional
from pydantic import Field

from aigos import PolicyEngine, RuntimeIdentity, TelemetryEmitter
from aigos.exceptions import CapabilityDeniedError


class GovernedTool(BaseTool):
    """
    LangChain tool wrapper that enforces governance.

    Before each tool invocation:
    1. Check if tool is allowed
    2. Check resource permissions (if applicable)
    3. Check budget
    4. Emit telemetry
    """

    base_tool: BaseTool
    policy_engine: PolicyEngine
    identity: RuntimeIdentity
    telemetry: Optional[TelemetryEmitter] = None

    class Config:
        arbitrary_types_allowed = True

    @property
    def name(self) -> str:
        return self.base_tool.name

    @property
    def description(self) -> str:
        return self.base_tool.description

    def _run(self, *args, **kwargs) -> Any:
        """Synchronous execution with governance."""
        # Check permission
        decision = self.policy_engine.check_sync(
            tool=self.name,
            resource=kwargs.get("url") or kwargs.get("path"),
        )

        if not decision.allowed:
            if self.telemetry:
                self.telemetry.emit_violation_sync(
                    tool=self.name,
                    reason=decision.reason,
                )
            raise CapabilityDeniedError(
                f"Tool '{self.name}' denied: {decision.reason}"
            )

        # Emit decision telemetry
        if self.telemetry:
            self.telemetry.emit_decision_sync(decision)

        # Execute base tool
        return self.base_tool._run(*args, **kwargs)

    async def _arun(self, *args, **kwargs) -> Any:
        """Async execution with governance."""
        # Check permission
        decision = await self.policy_engine.check(
            tool=self.name,
            resource=kwargs.get("url") or kwargs.get("path"),
        )

        if not decision.allowed:
            if self.telemetry:
                await self.telemetry.emit_violation(
                    tool=self.name,
                    reason=decision.reason,
                )
            raise CapabilityDeniedError(
                f"Tool '{self.name}' denied: {decision.reason}"
            )

        # Emit decision telemetry
        if self.telemetry:
            await self.telemetry.emit_decision(decision)

        # Execute base tool
        return await self.base_tool._arun(*args, **kwargs)
```

---

## HOW: CrewAI Integration

### Step 1: Install Adapter

```bash
pip install aigos-crewai
```

### Step 2: Governed CrewAI Crew

```python
# crewai_governed.py
"""
CrewAI Crew with AIGOS Governance
=================================

Demonstrates governing a CrewAI crew:
- Crew-level governance (coordinator)
- Agent-level capability decay
- Task-level permission checks
"""

from crewai import Agent, Task, Crew, Process
from aigos.adapters.crewai import (
    GovernedCrew,
    GovernedAgent,
    governance_config,
)


# Step 1: Define governed agents
researcher = GovernedAgent(
    role="Senior Research Analyst",
    goal="Uncover cutting-edge developments in AI governance",
    backstory="You are an expert researcher...",
    verbose=True,

    # AIGOS governance config
    governance=governance_config(
        asset_id="researcher-agent",
        allowed_tools=["web_search", "read_file"],
        max_budget_usd=5.0,
        risk_level="minimal",
    ),
)

writer = GovernedAgent(
    role="Technical Writer",
    goal="Create clear documentation from research",
    backstory="You are a skilled technical writer...",
    verbose=True,

    # AIGOS governance config
    governance=governance_config(
        asset_id="writer-agent",
        allowed_tools=["write_file", "summarize"],
        max_budget_usd=3.0,
        risk_level="minimal",
    ),
)

# Step 2: Define tasks
research_task = Task(
    description="Research the latest developments in AI governance frameworks",
    agent=researcher,
    expected_output="A comprehensive research report",
)

writing_task = Task(
    description="Write a summary document based on the research",
    agent=writer,
    expected_output="A clear summary document",
)

# Step 3: Create governed crew
crew = GovernedCrew(
    agents=[researcher, writer],
    tasks=[research_task, writing_task],
    process=Process.sequential,
    verbose=True,

    # Crew-level governance (acts as coordinator)
    governance=governance_config(
        asset_id="research-crew",
        instance_id="crew-001",
        allowed_tools=["web_search", "read_file", "write_file", "summarize"],
        max_budget_usd=20.0,  # Total budget for crew
        risk_level="limited",
        can_spawn=True,  # Can create agent instances
        max_children=5,
    ),
)


async def main():
    """Run the governed crew."""

    # Initialize governance
    await crew.start_governance()

    try:
        # Kick off the crew
        result = crew.kickoff()
        print(f"\nCrew result: {result}")

    finally:
        # Stop governance
        await crew.stop_governance()


if __name__ == "__main__":
    import asyncio
    asyncio.run(main())
```

### Step 3: GovernedCrew Implementation

```python
# aigos/adapters/crewai/crew.py
"""
Governed Crew Wrapper for CrewAI
================================

Wraps CrewAI Crew to add:
- Crew-level identity (acts as coordinator)
- Agent capability decay from crew to agents
- Budget allocation and tracking
- Kill switch for entire crew
"""

from crewai import Crew
from typing import List, Optional

from aigos import RuntimeIdentity, PolicyEngine, KillSwitchListener
from .agent import GovernedAgent


class GovernedCrew(Crew):
    """
    CrewAI Crew with AIGOS governance.

    The crew acts as the "coordinator" in multi-agent terms:
    - Crew has capabilities
    - Agent capabilities must be subset of crew
    - Budget is allocated from crew to agents
    """

    def __init__(
        self,
        agents: List[GovernedAgent],
        governance: dict,
        **kwargs,
    ):
        super().__init__(agents=agents, **kwargs)

        self.governance_config = governance
        self._identity: Optional[RuntimeIdentity] = None
        self._policy: Optional[PolicyEngine] = None
        self._kill_switch: Optional[KillSwitchListener] = None

    async def start_governance(self) -> None:
        """Initialize crew-level governance."""
        print(f"🚀 Starting governance for crew...")

        # Create crew identity
        self._identity = await RuntimeIdentity.create(
            asset_id=self.governance_config["asset_id"],
            instance_id=self.governance_config.get("instance_id"),
            capabilities=self.governance_config,
        )

        # Load policy
        self._policy = await PolicyEngine.load("governance.lock")

        # Validate agent capabilities (capability decay)
        await self._validate_agent_capabilities()

        # Start kill switch listener
        self._kill_switch = KillSwitchListener(
            instance_id=self._identity.instance_id,
            on_terminate=self._on_terminate,
        )
        await self._kill_switch.start()

        # Start governance for each agent
        for agent in self.agents:
            if isinstance(agent, GovernedAgent):
                await agent.start_governance(
                    parent_identity=self._identity,
                    parent_policy=self._policy,
                )

        print(f"✅ Crew governance active")

    async def _validate_agent_capabilities(self) -> None:
        """Ensure agent capabilities are subset of crew."""
        crew_tools = set(self.governance_config.get("allowed_tools", []))
        crew_budget = self.governance_config.get("max_budget_usd", 0)

        for agent in self.agents:
            if not isinstance(agent, GovernedAgent):
                continue

            agent_config = agent.governance

            # Check tools
            agent_tools = set(agent_config.get("allowed_tools", []))
            invalid_tools = agent_tools - crew_tools
            if invalid_tools:
                raise ValueError(
                    f"Agent '{agent.role}' has tools not in crew: {invalid_tools}"
                )

            # Check budget
            agent_budget = agent_config.get("max_budget_usd", 0)
            if agent_budget > crew_budget:
                raise ValueError(
                    f"Agent '{agent.role}' budget ${agent_budget} exceeds crew ${crew_budget}"
                )

    async def stop_governance(self) -> None:
        """Stop crew governance."""
        print(f"🛑 Stopping crew governance...")

        # Stop agent governance
        for agent in self.agents:
            if isinstance(agent, GovernedAgent):
                await agent.stop_governance()

        # Stop kill switch
        if self._kill_switch:
            await self._kill_switch.stop()

        print(f"✅ Crew governance stopped")

    async def _on_terminate(self, command) -> None:
        """Handle kill switch termination."""
        print(f"💀 Crew termination requested: {command.reason}")

        # Terminate all agents
        for agent in self.agents:
            if isinstance(agent, GovernedAgent):
                await agent.terminate(reason=f"Crew cascade: {command.reason}")
```

---

## HOW: AutoGen Integration

### Step 1: Install Adapter

```bash
pip install aigos-autogen
```

### Step 2: Governed AutoGen Agents

```python
# autogen_governed.py
"""
AutoGen Agents with AIGOS Governance
====================================

Demonstrates governing AutoGen agents:
- AssistantAgent with governance
- UserProxyAgent with governance
- Group chat with capability controls
"""

from autogen import AssistantAgent, UserProxyAgent, GroupChat, GroupChatManager
from aigos.adapters.autogen import (
    GovernedAssistantAgent,
    GovernedUserProxyAgent,
    GovernedGroupChat,
)


# Step 1: Create governed assistant
assistant = GovernedAssistantAgent(
    name="AI_Assistant",
    system_message="You are a helpful AI assistant.",
    llm_config={"model": "gpt-4"},

    # AIGOS governance
    governance={
        "asset_id": "autogen-assistant",
        "allowed_tools": ["web_search", "analyze"],
        "max_budget_usd": 5.0,
        "risk_level": "minimal",
    },
)

# Step 2: Create governed user proxy
user_proxy = GovernedUserProxyAgent(
    name="User",
    human_input_mode="NEVER",
    code_execution_config={"use_docker": False},

    # AIGOS governance
    governance={
        "asset_id": "autogen-user-proxy",
        "allowed_tools": ["execute_code"],  # Only code execution
        "max_budget_usd": 2.0,
        "risk_level": "limited",  # Higher risk due to code execution
    },
)

# Step 3: Create governed group chat
group_chat = GovernedGroupChat(
    agents=[assistant, user_proxy],
    messages=[],
    max_round=10,

    # Group-level governance
    governance={
        "asset_id": "autogen-group",
        "instance_id": "group-001",
        "allowed_tools": ["web_search", "analyze", "execute_code"],
        "max_budget_usd": 10.0,
        "risk_level": "limited",
    },
)

manager = GroupChatManager(
    groupchat=group_chat,
    llm_config={"model": "gpt-4"},
)


async def main():
    """Run governed AutoGen conversation."""

    # Start governance
    await group_chat.start_governance()

    try:
        # Initiate chat
        await user_proxy.a_initiate_chat(
            manager,
            message="Research AI governance frameworks and summarize findings",
        )

    finally:
        # Stop governance
        await group_chat.stop_governance()


if __name__ == "__main__":
    import asyncio
    asyncio.run(main())
```

---

## HOW: Custom Framework Adapter

### Building Your Own Adapter

```python
# custom_adapter.py
"""
Custom Framework Adapter Template
=================================

Template for creating AIGOS adapters for custom frameworks.
"""

from abc import ABC, abstractmethod
from typing import Any, Optional, List
from aigos import RuntimeIdentity, PolicyEngine, KillSwitchListener, TelemetryEmitter


class BaseGovernanceAdapter(ABC):
    """
    Base class for framework adapters.

    Implement this for your custom framework.
    """

    def __init__(self, governance_config: dict):
        self.config = governance_config
        self._identity: Optional[RuntimeIdentity] = None
        self._policy: Optional[PolicyEngine] = None
        self._kill_switch: Optional[KillSwitchListener] = None
        self._telemetry: Optional[TelemetryEmitter] = None

    async def start_governance(self) -> None:
        """Initialize governance components."""
        # Create identity
        self._identity = await RuntimeIdentity.create(
            asset_id=self.config["asset_id"],
            capabilities=self.config,
        )

        # Load policy
        self._policy = await PolicyEngine.load(
            self.config.get("governance_lock", "governance.lock")
        )

        # Start kill switch
        self._kill_switch = KillSwitchListener(
            instance_id=self._identity.instance_id,
            on_terminate=self._on_terminate,
            on_pause=self._on_pause,
            on_resume=self._on_resume,
        )
        await self._kill_switch.start()

        # Start telemetry
        self._telemetry = TelemetryEmitter(identity=self._identity)
        await self._telemetry.emit_startup()

        # Framework-specific initialization
        await self._initialize_framework()

    async def stop_governance(self) -> None:
        """Stop governance components."""
        await self._telemetry.emit_shutdown()
        await self._kill_switch.stop()
        await self._cleanup_framework()

    async def check_permission(self, tool: str, resource: str = None) -> bool:
        """Check if an action is permitted."""
        decision = await self._policy.check(tool=tool, resource=resource)
        await self._telemetry.emit_decision(decision)
        return decision.allowed

    @abstractmethod
    async def _initialize_framework(self) -> None:
        """Framework-specific initialization."""
        pass

    @abstractmethod
    async def _cleanup_framework(self) -> None:
        """Framework-specific cleanup."""
        pass

    @abstractmethod
    async def _on_terminate(self, command) -> None:
        """Handle termination in framework-specific way."""
        pass

    @abstractmethod
    async def _on_pause(self, command) -> None:
        """Handle pause in framework-specific way."""
        pass

    @abstractmethod
    async def _on_resume(self, command) -> None:
        """Handle resume in framework-specific way."""
        pass


class CustomFrameworkAdapter(BaseGovernanceAdapter):
    """
    Example adapter for a hypothetical custom framework.

    Replace with your framework's specifics.
    """

    def __init__(self, framework_agent, governance_config: dict):
        super().__init__(governance_config)
        self.framework_agent = framework_agent

    async def _initialize_framework(self) -> None:
        """Hook into framework's execution."""
        # Example: Wrap tools
        original_tools = self.framework_agent.tools
        self.framework_agent.tools = [
            self._wrap_tool(tool) for tool in original_tools
        ]

    def _wrap_tool(self, tool):
        """Wrap a tool with governance checks."""
        original_func = tool.func

        async def governed_func(*args, **kwargs):
            # Check permission
            if not await self.check_permission(tool.name):
                raise PermissionError(f"Tool {tool.name} not permitted")
            return await original_func(*args, **kwargs)

        tool.func = governed_func
        return tool

    async def _cleanup_framework(self) -> None:
        """Restore original tools."""
        pass

    async def _on_terminate(self, command) -> None:
        """Stop the framework agent."""
        await self.framework_agent.stop()

    async def _on_pause(self, command) -> None:
        """Pause the framework agent."""
        self.framework_agent.pause()

    async def _on_resume(self, command) -> None:
        """Resume the framework agent."""
        self.framework_agent.resume()
```

---

## Practice Lab: Governed LangChain Research Agent

### Lab Objective

Build a complete LangChain agent with:
1. Multiple governed tools
2. Policy-based restrictions
3. Budget tracking
4. Kill switch integration
5. Telemetry emission

### Lab Asset Card

```yaml
# .aigrc/cards/langchain-research-agent.asset.yaml
asset_id: langchain-research-agent
name: LangChain Research Agent
description: Research agent with web search and summarization
version: 1.0.0

ownership:
  owner: ai-team@company.com

technical:
  frameworks:
    - name: langchain
      version: "^0.1.0"
    - name: aigos
      version: "^1.0.0"

risk_classification:
  level: limited
  rationale: Web access for research purposes

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
  budget:
    max_usd: 5.00

golden_thread:
  ticket_id: "AI-2026-0100"
  approved_by: ciso@company.com
  approved_at: "2026-01-09T10:00:00Z"
```

### Lab Validation

- [ ] Agent initializes with governance
- [ ] web_search tool works (allowed)
- [ ] summarize tool works (allowed)
- [ ] send_email is blocked (not in allowed_tools)
- [ ] execute_code is blocked (not in allowed_tools)
- [ ] Internal URLs are blocked (denied_resources)
- [ ] Budget is tracked
- [ ] Kill switch terminates agent
- [ ] Telemetry is emitted

---

## Knowledge Check

1. **How do LangChain tools get governed?**
   - a) By modifying LangChain source
   - b) By wrapping tools with GovernedTool ✓
   - c) By using a custom LLM
   - d) By environment variables

2. **In CrewAI, who acts as the coordinator?**
   - a) The first agent
   - b) The last agent
   - c) The Crew itself ✓
   - d) The Task

3. **What happens if an agent tool is not in crew's allowed_tools?**
   - a) It's automatically added
   - b) Validation error at startup ✓
   - c) It's silently ignored
   - d) Runtime error

4. **Why wrap tools instead of modifying the framework?**
   - a) It's faster
   - b) Non-intrusive, preserves functionality ✓
   - c) It's required by law
   - d) Tools can't be modified

---

## Key Takeaways

1. **Use adapters** - Don't modify frameworks, wrap them
2. **Tool wrappers** - Intercept tool calls for permission checks
3. **Callbacks** - Use framework callbacks for telemetry
4. **Capability decay** - Crew/Group capabilities limit member agents
5. **Kill switch** - Must work with framework's execution model

---

## Next Steps

Continue to [Module 5.6: Observability & Debugging](./06-observability-debugging.md) to learn how to monitor governed agents with OpenTelemetry.

---

*Module 5.5 - AIGRC Training Program v2.0*
