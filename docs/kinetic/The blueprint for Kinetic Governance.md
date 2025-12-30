This is the blueprint for **Kinetic Governance**. We are moving beyond "paper compliance" (Static Asset Cards) to "physics compliance" (Runtime Enforcement).

The following specification defines the **AIGOS Runtime SDK (`@aigos/runtime`)**. It is designed to be embedded directly into the agentic loop, providing identity, boundary enforcement, and a "Kill Switch" with **\<5ms latency**.

---

# **AIGOS Runtime SDK Specification**

**Artifact ID:** SPEC-RT-2025-001 **Version:** 1.0.0-DRAFT **Status:** **APPROVED FOR ENGINEERING** **Classification:** Internal // Do Not Distribute

---

## **1\. Executive Summary & Design Philosophy**

### **1.1 The Governance Paradox**

Current AI governance tools (Credo AI, OneTrust) excel at **Static Governance**—documenting what an AI *should* do. Observability tools (Arize, Datadog) excel at **Performance Monitoring**—telling you if the AI is slow or drifting.

Neither solves the core risk: **An agent doing something efficient but unauthorized.**

The AIGOS Runtime SDK fills this gap by answering three specific questions in the hot path:

1. **Identity:** "Who is this agent, and does it trace back to a Jira ticket?" (The Golden Thread)  
2. **Boundary:** "Is this specific action (`refund_user`) allowed for this specific Risk Level (`HIGH`)?"  
3. **Control:** "Can we stop it immediately if it goes rogue?" (The Kill Switch)

### **1.2 Design Principles (The Physics)**

1. **Zero-Latency Default:** Policy checks must occur **locally** within the SDK memory space. No synchronous API calls to the AIGOS Cloud during the inference loop. Target overhead: **\< 5ms**.  
2. **Fail-Secure:** If the AIGOS Cloud is unreachable or the Identity Token is invalid, the SDK defaults to `RESTRICTED_MODE` (read-only, no tool execution).  
3. **Commodity Transport:** We do not build a proprietary logging pipeline. We emit standard **OpenTelemetry (OTel)** spans. We integrate with existing customer stacks (Splunk, Datadog).  
4. **Framework Agnostic:** The core is pure Python/Node.js. We provide "Thin Adapters" for LangChain, AutoGen, and CrewAI.

---

## **2\. Architecture Overview**

The SDK sits inside the application container, wrapping the Agent Loop. It acts as a "Governance Sidecar."

Code snippet  
graph TD  
    subgraph "Agent Container / Runtime"  
        A\[Agent Core Logic\] \--\>|Request Action| B(AIGOS SDK Interceptor)  
        B \--\>|1. Verify Identity| C{Local Policy Engine}  
        C \--\>|Allowed| D\[Execute Action\]  
        C \--\>|Blocked| E\[Raise GovernanceException\]  
          
        B \--\>|2. Emit Telemetry| F\[OTel Exporter\]  
        G\[Heartbeat / Kill Switch\] \--\>|Poll/SSE| H\[AIGOS Control Plane\]  
    end  
      
    subgraph "External Systems"  
        H \--\>|Push Revocation| G  
        F \--\>|Traces/Logs| I\[Customer Observability Stack\]  
        I \--\>|Alerts| J\[SOC / CISO\]  
    end

---

## **3\. Core Modules Specification**

### **3.1 Module: Identity Manager (`IdentityContext`)**

**Purpose:** Establishes the cryptographic provenance of the running agent. Unlike Lakera (which scans inputs), this module validates *Authority*.

**Data Structure:** `RuntimeIdentity`

JSON  
{  
  "instance\_id": "uuid-v4-generated-at-startup",  
  "asset\_id": "aigrc-2025-fin-agent-v2",  
  "golden\_thread\_hash": "sha256(jira\_ticket\_id \+ approval\_timestamp \+ approver\_signature)",  
  "risk\_level": "HIGH",  
  "lineage": {  
    "parent\_instance\_id": "null (if root)",  
    "generation\_depth": 0  
  },  
  "capabilities\_manifest": {  
    "allowed\_tools": \["calculator", "search\_internal"\],  
    "denied\_domains": \["\*.gov", "\*.mil"\],  
    "max\_budget\_per\_session": 50.00  
  }  
}

**Behavior:**

* **Startup Validation:** On initialization, the SDK checks the `asset_id` against the local `.aigos/` policy file.  
* **Golden Thread Enforcement:** If `golden_thread_hash` is missing, the SDK logs a `CRITICAL` warning and forces the agent into `SANDBOX` mode (no external network calls).

### **3.2 Module: Policy Engine (`The Bouncer`)**

**Purpose:** Enforces static rules against dynamic actions. This is where "Capability Decay" is enforced.

**Capability Decay Logic:** If an agent spawns a sub-agent, the SDK intercepts the creation request.

* *Parent Permissions:* `["read", "write"]`  
* *Child Request:* `["read", "write", "admin"]`  
* *Result:* **BLOCKED**. Child permissions must be a strict subset of the Parent.

**API Contract:**

Python  
def check\_permission(action\_type: str, resource: str, params: dict) \-\> bool:  
    """  
    Evaluates action against local capabilities\_manifest.  
    Returns True if allowed.  
    Raises AigosPolicyViolation if blocked.  
    """

**Enforcement Logic:**

1. **Manifest Check:** Is `action_type` explicitly listed in `allowed_tools`?  
2. **Resource Scanning:** Does `resource` match `denied_domains` regex?  
3. **Kill Switch Check:** Is the `revocation_token` present in the local cache?

### **3.3 Module: Telemetry Emitter (`GovernanceTracer`)**

**Purpose:** Emits high-fidelity "Governance Observability" signals.

**OTel Span Semantic Conventions:** We define a new OTel namespace `aigos.governance`.

* **Span Name:** `aigos.decision` or `aigos.violation`  
* **Attributes:**  
  * `aigos.asset_id`: "aigrc-2025-fin-agent-v2"  
  * `aigos.golden_thread`: "PROJ-1234" (Jira Ticket)  
  * `aigos.policy_result`: "BLOCKED"  
  * `aigos.violation_reason`: "CAPABILITY\_DECAY\_VIOLATION"  
  * `aigos.cost_incurred`: 0.04

**Integration:** The SDK uses the standard `opentelemetry-api`. It does *not* require a proprietary collector. Customers pipe data to their existing Datadog or Honeycomb endpoints.

### **3.4 Module: The Kill Switch (`ControlSocket`)**

**Purpose:** Active Defense. Allows the CISO to terminate an agent remotely within seconds.

**Mechanism:**

* **Protocol:** Server-Sent Events (SSE) for enterprise; Short Polling (60s) for standard.

**Payload:**  
JSON  
{  
  "command": "TERMINATE",  
  "scope": "ASSET\_ID",  
  "target": "aigrc-2025-fin-agent-v2",  
  "reason": "Security Incident SEC-999",  
  "signature": "rsa-signed-by-ciso-key"  
}

*   
* **Action Sequence:**  
  1. SDK receives `TERMINATE`.  
  2. Verifies `signature` against pinned public key.  
  3. Sets global `is_active = False`.  
  4. Next `check_permission()` call raises `AgentTerminatedException`.  
  5. Calls `sys.exit(1)` after 5s grace period.

---

## **4\. Integration Guide (The "How-To")**

### **4.1 Python Native Integration**

We provide a decorator for granular control.

Python  
from aigos import AigosAgent, guard

\# 1\. Initialize Identity (Injects Golden Thread from env)  
agent \= AigosAgent(asset\_id="aigrc-2025-fin-agent")

\# 2\. Wrap Critical Tools  
@guard(action\_type="tool\_execution", risk\_profile="high")  
def execute\_refund(user\_id, amount):  
    \# This code NEVER runs if policy blocks it  
    return bank\_api.refund(user\_id, amount)

\# 3\. Runtime Loop  
while True:  
    agent.ensure\_active() \# Kill Switch Check  
      
    \# ... Agent Logic ...  
      
    \# 4\. Trace Decision  
    with agent.trace\_action("reasoning"):  
        llm.invoke(...)

### **4.2 LangChain Adapter**

We inject a callback handler to intercept tool usage automatically.

Python  
from aigos.adapters.langchain import AigosCallbackHandler

\# The handler acts as the interceptor  
handler \= AigosCallbackHandler(asset\_id="aird-2025-lc-agent")

agent \= initialize\_agent(  
    tools,  
    llm,  
    callbacks=\[handler\] \# AIGOS is now watching  
)

---

## **5\. Security & Integrity**

### **5.1 Anti-Tamper Mechanisms**

* **Policy Signing:** The local `.aigos/policy.json` is signed by the AIGOS CI/CD Action. The SDK verifies this signature at boot. If the developer manually edits the policy file to allow `admin` access, the signature fails, and the agent refuses to start.  
* **Environment Locking:** Critical environment variables (`AIGOS_ASSET_ID`, `AIGOS_ENV`) are locked at process start.

### **5.2 Supply Chain Hardening**

* **Provenance:** The SDK package is signed using Sigstore.  
* **Zero-Dependency Core:** The core logic has *zero* external dependencies to prevent dependency confusion attacks. OTel and LangChain support are provided via optional extras (`pip install aigos[otel]`).

---

## **6\. Performance Specifications**

* **Initialization Time:** \< 50ms (Local config load).  
* **Policy Check Latency:** \< 2ms (In-memory evaluation).  
* **Telemetry Overhead:** Asynchronous batching (standard OTel behavior).  
* **Memory Footprint:** \< 25MB.

**Architect's Note:** This spec effectively "closes the loop." We capture intent in Jira, enforce it in CI/CD, and now verify it in Runtime. This is the **Golden Thread** made code.

