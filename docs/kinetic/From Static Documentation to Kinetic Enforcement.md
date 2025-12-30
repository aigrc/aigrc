From **Static Documentation** to **Kinetic Enforcement**.

The following specification defines the **AIGOS Runtime SDK (`@aigos/runtime`)**. This is the operational nervous system of our platform. It is designed to be embedded directly into the agentic loop, providing identity, boundaries, and a "Kill Switch" without introducing unacceptable latency.

This document serves as the **Level 4 Technical Specification** for the Engineering Team.

---

# **AIGOS Runtime SDK Specification**

**Artifact ID:** SPEC-RT-2025-001 **Version:** 1.0.0-DRAFT **Status:** **APPROVED FOR ENGINEERING** **Classification:** Internal // Do Not Distribute

---

## **1\. Executive Summary & Design Philosophy**

### **1.1 Purpose**

The AIGOS Runtime SDK addresses the "Governance Paradox": the gap between what an AI is *documented* to do (Static Asset Card) and what it *actually* does in production.

It allows organizations to answer the CISO's three questions:

1. **Identity:** "Who is this agent, and who authorized it?" (The Golden Thread)  
2. **Boundary:** "Is this specific action allowed right now?" (Policy Enforcement)  
3. **Control:** "Can we stop it immediately if it goes rogue?" (The Kill Switch)

### **1.2 Design Principles (The Physics)**

1. **Zero-Latency Default:** Policy checks must occur **locally** within the SDK memory space. No synchronous API calls to the AIGOS Cloud during the hot path (inference loop). Target overhead: **\< 5ms**.  
2. **Fail-Secure:** If the AIGOS Cloud is unreachable, the SDK defaults to the last known "Safe Configuration" or enters a "Restricted Mode" (configurable).  
3. **Commodity Transport:** We do not reinvent telemetry. We emit standard **OpenTelemetry (OTel)** spans. We integrate with existing pipeliness (Datadog, Splunk, Honeycomb).  
4. **Framework Agnostic:** The core logic is pure Python/Node.js, with thin adapters for LangChain, AutoGen, and CrewAI.

---

## **2\. Architecture Overview**

The SDK sits inside the application container, wrapping the Agent Loop.

Code snippet  
graph TD  
    subgraph "Agent Container / Runtime"  
        A\[Agent Core Logic\] \--\>|Request Action| B(AIGOS SDK Interceptor)  
        B \--\>|Check Policy| C{Local Policy Engine}  
        C \--\>|Allowed| D\[Execute Action\]  
        C \--\>|Blocked| E\[Raise GovernanceException\]  
          
        B \--\>|Emit Telemetry| F\[OTel Exporter\]  
        G\[Heartbeat / Kill Switch\] \--\>|Poll/SSE| H\[AIGOS Control Plane\]  
    end  
      
    subgraph "External Systems"  
        H \--\>|Push Config/Revocation| G  
        F \--\>|Traces/Logs| I\[Customer Observability Stack\]  
        I \--\>|Alerts| J\[SOC / CISO\]  
    end

---

## **3\. Core Modules Specification**

### **3.1 Module: Identity Manager (`IdentityContext`)**

**Purpose:** Establishes the cryptographic provenance of the running agent. It links the runtime instance back to the Static Asset Card and the Business Requirement (Jira/ADO).

**Data Structure:** `RuntimeIdentity`

JSON  
{  
  "instance\_id": "uuid-v4-generated-at-startup",  
  "asset\_id": "aird-2025-fin-agent-v2",  
  "golden\_thread\_hash": "sha256(jira\_ticket\_id \+ approval\_timestamp \+ approver\_signature)",  
  "lineage": {  
    "parent\_instance\_id": "null (if root)",  
    "generation\_depth": 0  
  },  
  "capabilities\_manifest": \["tool:calculator", "tool:search\_internal", "scope:read\_only"\]  
}

**Behavior:**

* On initialization, the SDK must validate the `asset_id` against the local `.aigos/` configuration.  
* If `golden_thread_hash` is missing or invalid, the SDK defaults to `UNVERIFIED` mode (logs warning, restricts high-risk actions).

### **3.2 Module: Policy Engine (`Guardrails`)**

**Purpose:** The "Bouncer." Enforces static rules against dynamic actions.

**Capability Decay Logic:** As per the Agile Governance framework, this module enforces inheritance rules. If an agent spawns a child agent, the SDK ensures the child's permissions are a **subset** of the parent's.

**API Contract:**

Python  
def check\_permission(action\_type: str, resource: str, params: dict) \-\> bool:  
    """  
    Evaluates action against local policy.  
    Returns True if allowed, raises AigosPolicyViolation if blocked.  
    """

**Enforcement Logic:**

1. **Allowlist Check:** Is `action_type` in `capabilities_manifest`?  
2. **Parameter Scanning:** Does `resource` match allowed domains/paths? (e.g., regex check on URLs).  
3. **Budget Check:** Has the session exceeded `max_tokens` or `max_cost`?  
4. **Kill Switch Check:** Is the global `revocation_token` active?

### **3.3 Module: Telemetry Emitter (`GovernanceTracer`)**

**Purpose:** Emits "Governance Observability" signals, distinguishing them from standard application logs.

**OTel Span Structure:**

* **Span Name:** `aigos.governance.decision` or `aigos.governance.violation`  
* **Attributes:**  
  * `aigos.asset_id`: "aird-2025-fin-agent-v2"  
  * `aigos.risk_level`: "HIGH"  
  * `aigos.policy_result`: "BLOCKED"  
  * `aigos.violation_type`: "UNAUTHORIZED\_TOOL\_USE"  
  * `aigos.business_context`: "PROJ-1234" (Jira Ticket)

**Integration:** The SDK creates a standard `TracerProvider`. Customers configure the exporter (e.g., OTLP to Datadog) via environment variables.

### **3.4 Module: The Kill Switch (`ControlSocket`)**

**Purpose:** Active Defense. Allows the CISO to terminate an agent remotely.

**Mechanism:**

* **Protocol:** Server-Sent Events (SSE) or Short Polling (configurable interval, default 60s).

**Payload:**  
JSON  
{  
  "command": "TERMINATE",  
  "scope": "ASSET\_ID",  
  "target": "aird-2025-fin-agent-v2",  
  "reason": "Security Incident SEC-999"  
}

*   
* **Action:**  
  1. SDK receives `TERMINATE` signal.  
  2. SDK sets internal `is_active` flag to `False`.  
  3. Next call to `check_permission()` raises `AgentTerminatedException`.  
  4. SDK attempts to gracefully shutdown loops (flush logs, close connections).  
  5. If grace period (5s) expires, SDK calls `sys.exit(1)`.

---

## **4\. Integration Guide (The "How-To")**

### **4.1 Python Integration (Native)**

We provide a Python decorator and context manager for seamless integration.

Python  
from aigos import AigosAgent, guard

\# 1\. Initialize Identity (Injects Golden Thread)  
agent \= AigosAgent(  
    asset\_id="aird-2025-fin-agent",  
    api\_key=os.getenv("AIGOS\_API\_KEY")  
)

\# 2\. Wrap Tools with Governance Guardrails  
@guard(action\_type="tool\_execution", resource="database")  
def query\_customer\_db(query):  
    \# If policy fails, this code NEVER runs.  
    return db.execute(query)

\# 3\. Runtime Loop  
while True:  
    \# 4\. Check Kill Switch before every cycle  
    agent.ensure\_active()   
      
    \# ... Agent Logic ...  
      
    \# 5\. Log Governed Action  
    with agent.trace\_action("reasoning\_step"):  
        response \= llm.generate(...)

### **4.2 LangChain Adapter**

We inject a `GovernanceCallbackHandler` into the LangChain config.

Python  
from aigos.adapters.langchain import AigosCallbackHandler

handler \= AigosCallbackHandler(asset\_id="aird-2025-lc-agent")

\# The handler automatically intercepts tool calls and traces execution  
agent \= initialize\_agent(  
    tools,   
    llm,   
    callbacks=\[handler\]  
)

---

## **5\. Security & Integrity**

### **5.1 Anti-Tamper Mechanisms**

* **Configuration Signing:** The local policy file (`.aigos/policy.json`) is signed by the AIGOS CI/CD Action. The SDK verifies this signature at startup. If the signature is broken (developer tampered with policy), the SDK refuses to boot (Fail-Secure).  
* **Environment Locking:** Critical variables (`AIGOS_ASSET_ID`, `AIGOS_ENV`) are locked at startup and cannot be mutated by the agent code.

### **5.2 Supply Chain Security**

* The SDK package is signed using Sigstore/Cosign.  
* The SDK has zero external dependencies for its core logic (to minimize vulnerability surface area), only optional peer-dependencies for OTel/LangChain.

---

## **6\. Performance Specifications**

* **Initialization Time:** \< 50ms (Local config load).  
* **Policy Check Latency:** \< 2ms (In-memory rule evaluation).  
* **Telemetry Overhead:** Asynchronous batching (standard OTel behavior). Non-blocking.  
* **Memory Footprint:** \< 25MB.

---

## **7\. Next Steps for Engineering**

1. **Scaffold the Repo:** Create `@aigos/runtime` monorepo structure.  
2. **Prototype the "Bouncer":** Build the `check_permission()` function with simple regex rules.  
3. **Build the OTel Exporter:** Verify traces appear in a local Jaeger instance.  
4. **Implement the Kill Switch:** Create a mock Control Plane endpoint and test remote termination.

**Imhotep's Note:** This SDK is the physical manifestation of our "Shift-Left" philosophy. It creates the only thing that matters in a lawsuit or an audit: **Proof of Control.** Build it robust. Build it fast.

