<div align="center">

```
     ▄▄▄       ██▓  ▄████  ██▀███   ▄████▄
    ▒████▄    ▓██▒ ██▒ ▀█▒▓██ ▒ ██▒▒██▀ ▀█
    ▒██  ▀█▄  ▒██▒▒██░▄▄▄░▓██ ░▄█ ▒▒▓█    ▄
    ░██▄▄▄▄██ ░██░░▓█  ██▓▒██▀▀█▄  ▒▓▓▄ ▄██▒
     ▓█   ▓██▒░██░░▒▓███▀▒░██▓ ▒██▒▒ ▓███▀ ░
     ▒▒   ▓▒█░░▓   ░▒   ▒ ░ ▒▓ ░▒▓░░ ░▒ ▒  ░
```

**Governance is a property, not a checkpoint.**

The open specification and developer toolkit for AI governance engineering.

[![npm](https://img.shields.io/npm/v/@aigrc/cli?style=flat-square&label=CLI&color=1a1f4e)](https://www.npmjs.com/package/@aigrc/cli)
[![License](https://img.shields.io/badge/License-Apache_2.0-blue?style=flat-square)](LICENSE)
[![AIGRC Toolchain](https://img.shields.io/badge/AIGOS-Platform-00a89d?style=flat-square)](https://aigrc.dev)
[![Spec](https://img.shields.io/badge/Spec-v1.0_Draft-8b7ec8?style=flat-square)](#specification)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen?style=flat-square)](CONTRIBUTING.md)

[Website](https://aigrc.dev) · [Field Guide](#-field-guide) · [Specification](#-specification) · [Quick Start](#-quick-start) · [Manifesto](MANIFESTO.md)

</div>

---

## The Problem

Most AI governance today is **documentation theater**.

Organizations build AI solutions and agents fast, write compliance documents later, and scramble at audit time. The evidence of what an AI system *actually did* is never collected at the moment of lowest cost — which is creation. We call this the **Truth Tax**: the compounding cost of retroactively verifying AI system behavior.

Three things are true about AI governance that most governance tools ignore:

1. **An agent without a business sponsor is a liability without an owner.** The question isn't whether your agent works. It's whether anyone in your organization *authorized it to exist* and is *accountable if something goes wrong*.

2. **Static analysis fails for systems that reason.** You cannot govern an AI agent the way you govern a database query. Agents make decisions. Enforcement needs to happen at runtime, not at code review.

3. **The people who build agents are now responsible for their behavior.** Governance tools built for separate compliance teams are the wrong tools for this world. Governance needs to live where the work happens.

**AIGRC is the open specification and toolkit that makes governance a property of the agent — embedded at creation, enforced at runtime, traceable to its authorization.**

---

## What This Repo Contains

| Section | What It Is | Who It's For |
|---------|------------|-------------|
| [📚 Field Guide](guide/) | Educational content on AI governance engineering | Everyone |
| [📐 Specification](spec/) | The AIGRC governance specification | Architects, Standards Bodies |
| [🛠️ Developer Toolkit](packages/) | Working CLI, VS Code extension, GitHub Action | Engineers, Developers |
| [🗺️ Roadmaps](roadmaps/) | Role-based learning paths | Career planners |
| [📖 Resources](resources/) | Curated papers, regulations, tools | Researchers, Compliance |

---

## 🛠️ Quick Start

### Install

```bash
npm install -g @aigrc/cli
```

### Scan Your Codebase

```bash
$ aigrc scan

  ╭──────────────────────────────────────────────────╮
  │  AIGRC Scan Results                              │
  │──────────────────────────────────────────────────│
  │                                                  │
  │  Frameworks detected:  3                         │
  │    • openai (Python)     → API Client            │
  │    • langchain (Python)  → Orchestration          │
  │    • anthropic (JS)      → API Client            │
  │                                                  │
  │  Risk Classification:  ⚠️  HIGH                   │
  │    Factors: customer-facing, tool-execution,     │
  │    autonomous-decisions                          │
  │                                                  │
  │  Asset card generated:                           │
  │    .aigrc/cards/my-agent.yaml                    │
  │                                                  │
  ╰──────────────────────────────────────────────────╯
```

### Initialize Governance

```bash
aigrc init        # Create governance configuration
aigrc classify    # Classify risk level (EU AI Act aligned)
aigrc compliance  # Check compliance status
aigrc push        # Push governance artifacts to AIGOS
```

---

## Developer Toolkit

| Tool | Purpose | Status |
|------|---------|--------|
| [`@aigrc/cli`](packages/cli/) | Command-line governance interface | ✅ Shipped |
| [`aigrc-vscode`](packages/vscode/) | VS Code extension — govern in your IDE | ✅ Shipped |
| [`@aigrc/github-action`](packages/github-action/) | CI/CD governance gates | ✅ Shipped |
| [`@aigrc/core`](packages/core/) | Core detection + classification library | ✅ Shipped |
| [`@aigrc/mcp`](packages/mcp/) | Model Context Protocol server | ✅ Shipped |
| [`@aigrc/i2e-bridge`](packages/i2e-bridge/) | Intent-to-Enforcement compiler | 🔨 Alpha |
| [`@aigrc/i2e-firewall`](packages/i2e-firewall/) | Runtime policy enforcement | 🔨 Alpha |
| [`@aigrc/sdk`](packages/sdk/) | Language SDKs (Python, Go) | 📋 Planned |

### Supported Frameworks

<details>
<summary><strong>30+ AI/ML frameworks detected automatically</strong></summary>

**Python:** OpenAI, Anthropic, LangChain, LlamaIndex, CrewAI, AutoGen, PyTorch, TensorFlow, Keras, Transformers, scikit-learn, spaCy

**JavaScript/TypeScript:** OpenAI SDK, Anthropic SDK, Vercel AI SDK, LangChain.js, TensorFlow.js, Brain.js, Hugging Face

**Model Files:** `.pt`, `.pth`, `.safetensors`, `.onnx`, `.h5`, `.keras`, `.pb`, `.gguf`, `.ggml`, `.bin`, `.mlmodel`

</details>

---

## 📚 Field Guide

The AI Governance Field Guide teaches the principles and practice of governing AI systems — not as a compliance exercise, but as an engineering discipline.

| Chapter | Topic | Key Concept |
|---------|-------|-------------|
| [01](guide/01-why-governance.md) | Why Governance Is Broken | Documentation theater vs. structural accountability |
| [02](guide/02-governance-as-property.md) | Governance as a Property | The difference between a checkpoint and a property |
| [03](guide/03-golden-thread.md) | The Golden Thread | Cryptographic link between agents and business authorization |
| [04](guide/04-intent-to-enforcement.md) | Intent to Enforcement | Bridging human-language policy and machine-executable constraint |
| [05](guide/05-orphan-agents.md) | The Orphan Agent Problem | When no one owns the liability |
| [06](guide/06-truth-tax.md) | The Truth Tax | The economics of retroactive verification |
| [07](guide/07-eu-ai-act.md) | EU AI Act Practitioner's Guide | What the regulation actually requires |
| [08](guide/08-risk-classification.md) | Risk Classification in Practice | Beyond checkboxes — how risk tiers work |

---

## 📐 Specification

The AIGRC specification defines the data structures, protocols, and interfaces for AI governance. It is an **open specification under development** — early adopters shape the standard.

| Specification | Purpose | Status |
|---------------|---------|--------|
| [Asset Cards](spec/asset-cards.md) | Structured metadata for AI assets | 📗 Stable |
| [Model Cards](spec/model-cards.md) | Model documentation standard | 📗 Stable |
| [Data Cards](spec/data-cards.md) | Dataset governance documentation | 📗 Stable |
| [Policy Bindings](spec/policy-bindings.md) | Policy-to-asset attachment protocol | 📙 Draft |
| [Golden Thread](spec/golden-thread.md) | Business intent traceability protocol | 📙 Draft |
| [Governance Token](spec/governance-token.md) | Runtime governance token protocol | 📙 Draft |
| [Incident Reports](spec/incident-reports.md) | Governance incident documentation | 📙 Draft |
| [Review Records](spec/review-records.md) | Audit review record schema | 📙 Draft |
| [Test Reports](spec/test-reports.md) | Governance test evidence format | 📙 Draft |
| [OTel Conventions](spec/otel-conventions.md) | OpenTelemetry semantic conventions | 📙 Draft |
| [Kill Switch](spec/kill-switch.md) | Emergency agent termination protocol | 📙 Draft |

> We're developing an open governance specification — and we're inviting the institutions who implement it first to help shape it. [Learn how to contribute →](CONTRIBUTING.md)

---

## Risk Classification

AIGRC classifies AI assets into four risk levels aligned with the **EU AI Act**:

```
  ┌─────────────────────────────────────────────────────────┐
  │                                                         │
  │   🔴  UNACCEPTABLE    Prohibited uses                   │
  │       Social scoring, subliminal manipulation           │
  │                                                         │
  │   🟠  HIGH            Significant oversight required     │
  │       Credit scoring, hiring, law enforcement           │
  │                                                         │
  │   🟡  LIMITED         Transparency obligations          │
  │       Chatbots, content generation, recommendations     │
  │                                                         │
  │   🟢  MINIMAL         Low impact, internal use          │
  │       Analytics, internal tools, research               │
  │                                                         │
  └─────────────────────────────────────────────────────────┘
```

Risk is determined by analyzing: autonomous decision-making, customer-facing usage, tool/function execution, external data access, PII processing, and high-stakes decision authority.

---

## CI/CD Integration

Add governance gates to your pipeline:

```yaml
# .github/workflows/governance.yml
name: AI Governance

on: [push, pull_request]

jobs:
  governance:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: aigrc/aigrc@v1
        with:
          fail-on-high-risk: "true"
          create-pr-comment: "true"
```

---

## 🗺️ Roadmaps

- [AI Governance Engineer](roadmaps/ai-governance-engineer.md) — The emerging role and skill path
- [AIGRC Adoption](roadmaps/aigrc-adoption.md) — Implementation roadmap for organizations
- [Compliance Automation](roadmaps/compliance-automation.md) — From manual to continuous compliance

---

## 📖 Resources

- [Papers](resources/papers.md) — Key academic and industry research
- [Regulations](resources/regulations.md) — EU AI Act, NIST AI RMF, ISO 42001, and more
- [Tools](resources/tools.md) — Other tools in the AI governance space
- [Case Studies](resources/case-studies.md) — Real-world governance implementations

---

## Self-Governing

This repository governs itself with AIGRC. The [`.aigrc/`](.aigrc/) directory contains the project's own asset cards and governance configuration — because governance starts at home.

```bash
$ aigrc status

  Project: aigrc/aigrc
  Status:  ✅ Compliant
  Assets:  8 registered
  Risk:    Minimal (development tooling)
  Thread:  linked → AIGRC-ORG-001
```

---

## Architecture

```
                    ┌─────────────────────────┐
                    │     AIGOS Platform       │
                    │   aigos.dev              │
                    │                          │
                    │  Dashboard · Audit       │
                    │  Compliance · Reports    │
                    └────────────▲────────────┘
                                 │
                           aigrc push
                                 │
  ┌──────────────────────────────┼──────────────────────────────┐
  │                              │                              │
  │  ┌────────────┐   ┌─────────┴────────┐   ┌──────────────┐ │
  │  │  VS Code   │   │    @aigrc/cli     │   │   GitHub      │ │
  │  │ Extension  │   │                   │   │   Action      │ │
  │  └─────┬──────┘   └────────┬──────────┘   └──────┬───────┘ │
  │        │                   │                      │         │
  │        └───────────┬───────┴──────────────────────┘         │
  │                    │                                        │
  │              ┌─────▼──────┐                                 │
  │              │ @aigrc/core │                                 │
  │              │             │                                 │
  │              │ Detection   │     ┌──────────────────┐       │
  │              │ Classify    │────▶│  .aigrc/cards/    │       │
  │              │ Golden      │     │  Asset Cards      │       │
  │              │ Thread      │     └──────────────────┘       │
  │              └─────────────┘                                │
  │                                                             │
  │  ┌──────────────────────┐   ┌───────────────────────────┐  │
  │  │  @aigrc/i2e-bridge   │   │  @aigrc/i2e-firewall      │  │
  │  │                      │   │                           │  │
  │  │  Policy → Compiler   │──▶│  Runtime Enforcement      │  │
  │  │  Intent → Rules      │   │  Guardrails · Kill Switch │  │
  │  └──────────────────────┘   └───────────────────────────┘  │
  │                                                             │
  │                    Developer Toolkit                        │
  └─────────────────────────────────────────────────────────────┘
```

---

## Development

```bash
git clone https://github.com/aigrc/aigrc.git
cd aigrc
pnpm install
pnpm run build
pnpm run test
```

**Prerequisites:** Node.js 18+, pnpm 8+

---

## Contributing

We're building an open governance specification and we welcome contributions from engineers, architects, compliance professionals, and anyone who believes AI systems should be accountable by design.

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

---

## The Manifesto

> *We came from observability. We built the tools that told enterprises what their systems were doing in production — not what they hoped they were doing. Then AI agents arrived, and the gap between organizational intent and system behavior became a chasm.*
>
> [Read the full manifesto →](MANIFESTO.md)

---

<div align="center">

**Built by [PangoLabs](https://pangolabs.io)**

Apache 2.0 · [GitHub](https://github.com/aigrc/aigrc) · [Platform](https://aigos.dev) · [Issues](https://github.com/aigrc/aigrc/issues)

</div>
