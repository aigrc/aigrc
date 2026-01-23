# Module 1.3: Quick Start with AIGRC

> **Duration:** 30 minutes
> **Level:** Foundations
> **Prerequisites:** Modules 1.1, 1.2

---

## Learning Objectives

By the end of this module, you will be able to:
1. Install AIGRC tools (CLI, VS Code extension)
2. Perform your first AI asset scan
3. Initialize governance in a project
4. Create your first asset card
5. Validate governance configuration

---

## Overview (5 min)

This hands-on module takes you from zero to governed AI in 15 minutes. You'll install the tools, scan a project, and create your first asset card. By the end, you'll have a working governance setup.

---

## WHY: From Theory to Practice (5 min)

### The Governance Gap

After Modules 1.1 and 1.2, you understand:
- Why AI governance matters
- How to classify AI systems

But knowing isn't doing. This module bridges that gap:

```
Knowledge          →          Action

"AI needs governance"    "Here's how to govern it"
"Risk classification"    "Here's how to classify"
"Documentation needed"   "Here's the asset card"
```

### What You'll Build

By the end of this module:
```
your-project/
├── .aigrc/
│   ├── aigrc.yaml          # Project configuration
│   └── cards/
│       └── my-asset.yaml   # Your first asset card
├── src/
│   └── (your AI code)
└── governance.lock         # Policy enforcement (optional)
```

---

## WHAT: The AIGRC Toolkit (10 min)

### Available Tools

| Tool | Purpose | Install |
|------|---------|---------|
| **CLI** | Command-line governance | `npm install -g @aigrc/cli` |
| **VS Code** | IDE integration | VS Code Marketplace |
| **GitHub Action** | CI/CD enforcement | GitHub Marketplace |
| **MCP Server** | AI assistant integration | `npm install -g @aigrc/mcp` |

### Core Concepts

**Asset Card:** A YAML file documenting an AI system
```yaml
# .aigrc/cards/my-chatbot.asset.yaml
asset_id: my-chatbot
name: Customer Support Chatbot
risk_classification:
  level: limited
  rationale: Customer-facing AI requires transparency
```

**Configuration:** Project-level governance settings
```yaml
# .aigrc/aigrc.yaml
version: "1.0"
project:
  name: my-project
  organization: my-company
```

**Governance Lock:** Policy enforcement file
```yaml
# governance.lock
version: "1.0"
constraints:
  allowed_vendors: [openai, anthropic]
  max_risk_level: high
```

---

## HOW: Step-by-Step Setup (15 min)

### Step 1: Install the CLI

```bash
# Using npm
npm install -g @aigrc/cli

# Verify installation
aigrc --version
# Output: @aigrc/cli 0.2.0
```

### Step 2: Scan Your Project

Navigate to any project with AI/ML code:

```bash
cd your-project

# Run a scan
aigrc scan .
```

**Expected Output:**
```
🔍 Scanning for AI/ML frameworks...

Detections (3 found):
┌──────────────┬────────────────┬─────────────────────────────┐
│ Framework    │ Confidence     │ Location                    │
├──────────────┼────────────────┼─────────────────────────────┤
│ openai       │ high           │ src/services/ai.ts:5        │
│ langchain    │ high           │ src/agents/assistant.py:1   │
│ transformers │ medium         │ ml/model.py:3               │
└──────────────┴────────────────┴─────────────────────────────┘

Summary:
  Frameworks detected: 3
  Registered assets: 0
  Unregistered: 3 ⚠️

Run 'aigrc init' to initialize governance.
```

### Step 3: Initialize Governance

```bash
aigrc init
```

**Interactive Setup:**
```
Welcome to AIGRC! Let's set up governance for your project.

? Project name: my-ai-project
? Organization: Acme Corp
? Default risk classification: limited
? Asset cards directory: .aigrc/cards

✅ Created .aigrc/aigrc.yaml
✅ Created .aigrc/cards/ directory

Next steps:
  1. Run 'aigrc register' to create asset cards
  2. Run 'aigrc validate' to check configuration
```

### Step 4: Register an Asset

```bash
aigrc register
```

**Interactive Registration:**
```
? Which detection do you want to register?
> ● openai (src/services/ai.ts)
  ○ langchain (src/agents/assistant.py)
  ○ transformers (ml/model.py)

? Asset name: Customer AI Service
? Description: AI-powered customer query handling
? Risk level:
  ○ minimal
  ● limited
  ○ high
  ○ unacceptable

? Owner: ai-team@acme.com
? Data processed: Customer inquiries (no PII)

✅ Created .aigrc/cards/customer-ai-service.asset.yaml
```

### Step 5: View Your Asset Card

```bash
cat .aigrc/cards/customer-ai-service.asset.yaml
```

**Generated Asset Card:**
```yaml
asset_id: customer-ai-service
name: Customer AI Service
description: AI-powered customer query handling
version: 1.0.0

ownership:
  owner: ai-team@acme.com
  team: AI Platform Team

technical:
  frameworks:
    - name: openai
      version: "^4.0.0"
  source_files:
    - src/services/ai.ts

risk_classification:
  level: limited
  rationale: Customer-facing AI service
  eu_ai_act_category: limited_risk

data:
  input_types:
    - customer_inquiries
  pii_processed: false

transparency:
  disclosure_required: true
  disclosure_text: "This response is generated by AI"

created_at: 2026-01-09T14:30:00Z
updated_at: 2026-01-09T14:30:00Z
```

### Step 6: Validate Configuration

```bash
aigrc validate
```

**Validation Output:**
```
🔍 Validating AIGRC configuration...

Configuration:
  ✅ .aigrc/aigrc.yaml is valid

Asset Cards:
  ✅ customer-ai-service.asset.yaml - valid

Coverage:
  Detected frameworks: 3
  Registered assets: 1
  Coverage: 33%

Recommendations:
  ⚠️ Register remaining 2 detections for full coverage
  ⚠️ Consider adding governance.lock for policy enforcement
```

### Step 7: Check Status

```bash
aigrc status
```

**Status Output:**
```
AIGRC Status: my-ai-project

Configuration: ✅ Valid
Asset Cards: 1 registered

┌─────────────────────────┬──────────┬─────────┬────────────┐
│ Asset                   │ Risk     │ Valid   │ Status     │
├─────────────────────────┼──────────┼─────────┼────────────┤
│ customer-ai-service     │ limited  │ ✅      │ Registered │
└─────────────────────────┴──────────┴─────────┴────────────┘

Unregistered Detections:
  - langchain (src/agents/assistant.py)
  - transformers (ml/model.py)
```

---

## Practice Lab (10 min)

### Exercise 1: First Governance Setup

1. Create a new directory: `mkdir aigrc-lab && cd aigrc-lab`
2. Create a sample AI file:
   ```bash
   mkdir src
   echo 'import openai' > src/ai.py
   echo 'from langchain import LLM' > src/agent.py
   ```
3. Run through all 7 steps above
4. Verify your `.aigrc/` directory structure

### Exercise 2: VS Code Extension

1. Install the AIGRC VS Code extension
2. Open your lab project
3. Look for:
   - AI Assets panel in the sidebar
   - Code lens above AI imports
   - Diagnostics for unregistered assets

---

## Knowledge Check

1. **What command discovers AI frameworks in your project?**
   - a) `aigrc discover`
   - b) `aigrc scan` ✓
   - c) `aigrc find`
   - d) `aigrc detect`

2. **Where are asset cards stored by default?**
   - a) `./assets/`
   - b) `./.aigrc/cards/` ✓
   - c) `./governance/`
   - d) `./ai-assets/`

3. **What does `aigrc init` create?**
   - a) Only asset cards
   - b) Configuration and directory structure ✓
   - c) Only governance.lock
   - d) CI/CD pipeline

4. **Coverage percentage measures:**
   - a) Code test coverage
   - b) Registered vs detected assets ✓
   - c) Documentation completeness
   - d) Risk assessment completion

---

## Key Takeaways

1. **5 commands to remember:** `scan`, `init`, `register`, `validate`, `status`
2. **Asset cards are YAML** - Human-readable, version-controlled
3. **Configuration lives in `.aigrc/`** - Standard location for all governance
4. **Start with scan** - Discover before you document
5. **Iterate** - Register assets incrementally, not all at once

---

## Command Reference

| Command | Purpose |
|---------|---------|
| `aigrc scan <dir>` | Detect AI frameworks |
| `aigrc init` | Initialize governance |
| `aigrc register` | Create asset card interactively |
| `aigrc validate` | Check configuration validity |
| `aigrc status` | Show governance summary |
| `aigrc classify` | Determine risk level |

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| `aigrc: command not found` | Run `npm install -g @aigrc/cli` |
| No detections found | Ensure project has AI imports (openai, langchain, etc.) |
| Validation fails | Check YAML syntax in asset cards |
| VS Code not showing assets | Reload window or check activation |

---

## Next Steps

**Congratulations!** You've completed Level 1: Foundations.

Choose your next path:
- [Level 2: Core Skills](../level-2-core-skills/) - Deep dive into CLI, VS Code, GitHub Actions
- [Level 3: Advanced](../level-3-advanced/) - MCP, Multi-Jurisdiction, I2E Pipeline
- [Level 4: Specialization](../level-4-specialization/) - Role-specific training

---

*Module 1.3 - AIGRC Training Program v1.0*
