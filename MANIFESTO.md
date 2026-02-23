<div align="center">

# The AIGRC Manifesto

*On building governance that works.*

</div>

---

## Where We Come From

We came from observability.

We built the tools that told enterprises what their systems were doing in production — not what they *hoped* they were doing. Distributed tracing, metric pipelines, and alerting systems. The unsexy infrastructure that prevents outages, catches regressions, and keeps billion-dollar platforms honest.

Then AI solutions and agents arrived.

And the gap between organizational intent and system behavior became a chasm.

---

## What We Saw

We watched enterprises repeat the same pattern:

1. **A developer imports `openai`.** It takes ten minutes to build a prototype. The demo goes well. By Friday, it's in production.

2. **Nobody registers it.** There is no inventory of AI systems. There is no risk assessment. There is no business sponsor who authorized it to exist.

3. **Six months later, an auditor asks.** "What AI do you have? Who approved it? What data does it use? Show me the evidence."

4. **There is no evidence.** Because it was never collected. The developer moved teams. The codebase changed. The model was updated three times. The audit costs more than building the system did.

We call this the **Truth Tax** — the compounding cost of retroactively verifying AI system behavior. And every organization pays it, whether they know it or not.

---

## What We Believe

### 1. Governance is a property, not a checkpoint.

Security isn't something you add at the end. Observability isn't something you bolt on later. And governance isn't a document you write before an audit.

Governance is a *property* of a well-built system — embedded at creation, enforced at runtime, traceable to its authorization. The same way a building has structural integrity by design, not by inspection.

### 2. An agent without a business sponsor is a liability without an owner.

The question is not whether your agent works. It's whether anyone in your organization *authorized it to exist* and is *accountable when something goes wrong*.

Every AI system should trace back to a human decision. Not because regulators require it (though they do). Because accountability requires it.

We call this the **Golden Thread** — the cryptographic link between a running agent and the business intent that authorized it.

### 3. Static analysis fails for systems that reason.

You cannot govern an AI agent the way you govern a database query. Agents make decisions. They execute tools. They spawn sub-agents. They operate with degrees of autonomy that traditional compliance frameworks were never designed to handle.

Governance that only checks code at review time is governance that stops working the moment the system starts running. Enforcement needs to happen at runtime — continuously, automatically, with the power to intervene.

### 4. The people who build agents are now responsible for their behavior.

The old model — where developers build and a separate compliance team governs — doesn't work for AI. The velocity is too high. The surface area is too large. The gap between "what was approved" and "what is deployed" grows by the hour.

Governance tools built for compliance teams are the wrong tools for this world. Governance needs to live where the work happens: in the IDE, in the CI/CD pipeline, in the terminal.

### 5. Open standards beat proprietary lock-in.

AI governance is too important to be owned by a single vendor. The standards need to be open, the tools need to be interoperable, and the specification needs to be shaped by the people who implement it.

We publish our specification openly. We welcome contributions from engineers, architects, compliance professionals, regulators, and anyone who believes AI systems should be accountable by design.

---

## What We're Building

AIGRC is the open specification and developer toolkit that makes governance a property of the agent.

- **Detect** what AI exists in your codebase — automatically.
- **Classify** risk aligned with real regulations (EU AI Act, NIST AI RMF, ISO 42001).
- **Document** with structured Asset Cards at the point of creation.
- **Enforce** policy at runtime — not just at code review.
- **Trace** from a running agent back to the business decision that authorized it.
- **Prove** compliance on demand, with audit-ready evidence.

We're not building a checkbox tool. We're building the infrastructure for AI accountability.

---

## The Hard Truth

Most AI governance today is **documentation theater**. Organizations fill out compliance templates, file them away, and hope nobody asks too many questions.

We're not interested in theater. We're interested in structural accountability — the kind that works at 3 AM when an agent makes a decision no human anticipated, and someone needs to understand what happened and why.

That's the standard we hold ourselves to. That's the standard we're building for.

---

## An Invitation

We don't have all the answers. The field of AI governance engineering is being invented in real time, by the people doing the work.

If you believe AI systems should be accountable by design — not by afterthought — we'd like to build with you.

- Read the [Field Guide](guide/) to understand the principles.
- Try the [Toolkit](packages/) to see it in practice.
- Shape the [Specification](spec/) to make the standard yours.
- Join the conversation on [GitHub Issues](https://github.com/aigrc/aigrc/issues).

---

<div align="center">

*"The best time to implement AI governance was when you built the AI. The second best time is now."*

**[Get started →](README.md#-quick-start)**

Built by [PangoLabs](https://pangolabs.io) · Apache 2.0

</div>
