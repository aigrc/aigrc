# Module 2.1: CLI Mastery

> **Duration:** 45-60 minutes
> **Level:** Core Skills
> **Prerequisites:** Level 1 complete

---

## Learning Objectives

By the end of this module, you will be able to:
1. Execute all AIGRC CLI commands with appropriate options
2. Perform complete governance workflows from scan to validation
3. Configure CLI behavior for your project
4. Integrate CLI into scripts and automation
5. Troubleshoot common CLI issues

---

## WHY: The Command Line Advantage (10 min)

### When to Use CLI vs Other Tools

| Task | CLI | VS Code | GitHub Action |
|------|-----|---------|---------------|
| Initial setup | ✅ Best | Good | N/A |
| Quick scan | ✅ Best | Good | N/A |
| CI/CD automation | Good | N/A | ✅ Best |
| Real-time feedback | N/A | ✅ Best | N/A |
| Scripting | ✅ Best | N/A | Good |
| Headless servers | ✅ Only option | N/A | N/A |

### CLI Design Philosophy

The AIGRC CLI follows Unix conventions:
- **Composable:** Commands can be piped and combined
- **Scriptable:** Consistent exit codes and JSON output
- **Progressive:** Simple defaults, powerful options

---

## WHAT: Command Reference (15 min)

### Command Categories

```
aigrc
├── Discovery Commands
│   └── scan          # Detect AI/ML frameworks
│
├── Initialization Commands
│   └── init          # Set up governance
│
├── Registration Commands
│   ├── register      # Create asset cards
│   └── classify      # Determine risk level
│
├── Validation Commands
│   ├── validate      # Check configuration
│   └── status        # Show governance summary
│
├── Policy Commands
│   ├── policy lock   # Generate governance.lock
│   ├── policy check  # Validate against policy
│   ├── policy status # Show lock status
│   └── policy diff   # Compare versions
│
└── Compliance Commands
    ├── compliance check       # Check against profiles
    ├── compliance gap-analysis # Generate gap report
    └── compliance crosswalk   # Framework mapping
```

### Exit Codes

| Code | Meaning | Use in Scripts |
|------|---------|----------------|
| 0 | Success | `if aigrc validate; then ...` |
| 1 | Validation failed | Governance issues found |
| 2 | Configuration error | Invalid config file |
| 3 | Runtime error | System/permission issue |

### Output Formats

```bash
# Human-readable (default)
aigrc scan .

# JSON for scripting
aigrc scan . --format json

# SARIF for security tools
aigrc policy check --format sarif
```

---

## HOW: Command Deep Dives (30 min)

### 1. Discovery: `aigrc scan`

**Purpose:** Detect AI/ML frameworks in your codebase

**Basic Usage:**
```bash
aigrc scan .
aigrc scan ./src
aigrc scan /path/to/project
```

**Options:**
```bash
# Include specific file types
aigrc scan . --include "*.py,*.ts"

# Exclude directories
aigrc scan . --exclude "node_modules,dist"

# JSON output
aigrc scan . --format json

# Show only high-confidence
aigrc scan . --confidence high

# Quiet mode (counts only)
aigrc scan . --quiet
```

**Understanding Output:**
```
🔍 Scanning for AI/ML frameworks...

Detections (5 found):
┌──────────────┬────────────────┬─────────────────────────────┐
│ Framework    │ Confidence     │ Location                    │
├──────────────┼────────────────┼─────────────────────────────┤
│ openai       │ high           │ src/ai/chat.ts:5            │
│ langchain    │ high           │ src/agents/assistant.py:1   │
│ transformers │ medium         │ ml/model.py:3               │
│ anthropic    │ high           │ src/claude/client.ts:2      │
│ pytorch      │ low            │ tests/fixtures/model.py:10  │
└──────────────┴────────────────┴─────────────────────────────┘

Summary:
  Total: 5
  High confidence: 3
  Medium confidence: 1
  Low confidence: 1
  Registered: 1
  Unregistered: 4 ⚠️
```

**Scripting Example:**
```bash
# Get count of unregistered assets
UNREGISTERED=$(aigrc scan . --format json | jq '.summary.unregistered')
if [ "$UNREGISTERED" -gt 0 ]; then
  echo "Warning: $UNREGISTERED unregistered AI assets"
fi
```

### 2. Initialization: `aigrc init`

**Purpose:** Set up governance configuration for a project

**Interactive Mode:**
```bash
aigrc init
```

**Non-Interactive Mode:**
```bash
aigrc init \
  --project-name "my-ai-project" \
  --organization "Acme Corp" \
  --default-risk limited \
  --cards-dir ".aigrc/cards"
```

**What It Creates:**
```
.aigrc/
├── aigrc.yaml          # Project configuration
└── cards/              # Asset cards directory
```

**Configuration File:**
```yaml
# .aigrc/aigrc.yaml
version: "1.0"

project:
  name: my-ai-project
  organization: Acme Corp
  description: AI-powered customer service platform

defaults:
  risk_level: limited
  require_asset_cards: true

paths:
  cards: .aigrc/cards
  governance_lock: governance.lock
  policies: policies/
```

### 3. Registration: `aigrc register`

**Purpose:** Create asset cards for detected AI systems

**Interactive Mode:**
```bash
aigrc register
```

**Register Specific Detection:**
```bash
aigrc register --detection openai
```

**Batch Registration:**
```bash
# Register all detections with defaults
aigrc register --all --defaults
```

**With Specific Values:**
```bash
aigrc register \
  --name "Customer Chatbot" \
  --risk limited \
  --owner "ai-team@company.com" \
  --detection openai
```

**Generated Asset Card:**
```yaml
# .aigrc/cards/customer-chatbot.asset.yaml
asset_id: customer-chatbot
name: Customer Chatbot
description: AI-powered customer support
version: 1.0.0

ownership:
  owner: ai-team@company.com
  team: AI Platform Team

technical:
  frameworks:
    - name: openai
      version: "^4.0.0"
  source_files:
    - src/ai/chat.ts

risk_classification:
  level: limited
  rationale: Customer-facing AI interaction
  eu_ai_act_category: limited_risk

data:
  input_types:
    - customer_inquiries
  pii_processed: false

transparency:
  disclosure_required: true
  disclosure_text: "Powered by AI"

created_at: 2026-01-09T15:00:00Z
```

### 4. Classification: `aigrc classify`

**Purpose:** Determine appropriate risk level for an AI system

**Interactive Classification:**
```bash
aigrc classify
```

**Classify Specific Asset:**
```bash
aigrc classify --asset customer-chatbot
```

**The Classification Flow:**
```
? What is the primary function of this AI system?
  > Customer service automation

? Does this system make or influence decisions about:
  [ ] Employment decisions
  [ ] Credit or financial decisions
  [ ] Educational assessment
  [ ] Law enforcement
  [ ] Migration or asylum
  [x] None of the above

? Does this system:
  [x] Interact directly with users (chatbot, voice)
  [ ] Generate synthetic content (text, images, audio)
  [ ] Perform biometric processing
  [ ] None of the above

Classification Result:
  Risk Level: LIMITED
  EU AI Act Category: limited_risk
  Required Controls:
    - Transparency disclosure to users
    - AI-generated content labeling
```

### 5. Validation: `aigrc validate`

**Purpose:** Check configuration and asset cards for issues

**Basic Validation:**
```bash
aigrc validate
```

**Validate Specific Card:**
```bash
aigrc validate --card customer-chatbot.asset.yaml
```

**Strict Mode:**
```bash
aigrc validate --strict
```

**Validation Output:**
```
🔍 Validating AIGRC configuration...

Configuration (.aigrc/aigrc.yaml):
  ✅ Schema valid
  ✅ Required fields present
  ✅ Paths exist

Asset Cards (3 files):
  ✅ customer-chatbot.asset.yaml
  ⚠️ fraud-detector.asset.yaml
     - Missing: data.governance section (required for high-risk)
     - Missing: human_oversight details
  ✅ doc-classifier.asset.yaml

Governance Coverage:
  Detected frameworks: 5
  Registered assets: 3
  Coverage: 60%

Validation Result: ⚠️ WARNINGS
  Errors: 0
  Warnings: 2

Run with --strict to treat warnings as errors.
```

### 6. Status: `aigrc status`

**Purpose:** Show overall governance summary

```bash
aigrc status
```

**Output:**
```
AIGRC Status: my-ai-project
═══════════════════════════════════════════════════════════

Configuration: ✅ Valid
Governance Lock: ✅ Valid (expires in 28 days)

Asset Summary:
┌─────────────────────────┬──────────┬─────────┬────────────┐
│ Asset                   │ Risk     │ Valid   │ Status     │
├─────────────────────────┼──────────┼─────────┼────────────┤
│ customer-chatbot        │ limited  │ ✅      │ Compliant  │
│ fraud-detector          │ high     │ ⚠️      │ 2 warnings │
│ doc-classifier          │ minimal  │ ✅      │ Compliant  │
└─────────────────────────┴──────────┴─────────┴────────────┘

Risk Distribution:
  Minimal: 1 (33%)
  Limited: 1 (33%)
  High: 1 (33%)
  Unacceptable: 0

Unregistered Detections (2):
  - pytorch (ml/experiments/test.py)
  - huggingface (ml/research/bert.py)

Compliance:
  EU AI Act: 85% compliant
  NIST AI RMF: 72% compliant

Actions Required:
  1. Register 2 unregistered detections
  2. Fix 2 warnings in fraud-detector asset
  3. Add data governance to high-risk assets
```

### 7. Policy Commands

**Generate governance.lock:**
```bash
aigrc policy lock --sources ./policies/ --profile eu-ai-act
```

**Check policy compliance:**
```bash
aigrc policy check
```

**Show lock status:**
```bash
aigrc policy status
```

**Compare with previous:**
```bash
aigrc policy diff --previous governance.lock.bak
```

---

## Practice Lab (15 min)

### Exercise 1: Full Workflow

Complete this workflow in order:

```bash
# 1. Create test directory
mkdir aigrc-cli-lab && cd aigrc-cli-lab

# 2. Create sample AI files
mkdir -p src/ai src/agents
echo 'import openai' > src/ai/chat.py
echo 'from langchain import LLM' > src/agents/assistant.py
echo 'from anthropic import Anthropic' > src/ai/claude.py

# 3. Scan
aigrc scan .

# 4. Initialize
aigrc init --project-name "CLI Lab" --organization "Training"

# 5. Register all assets
aigrc register --all --defaults

# 6. Validate
aigrc validate

# 7. Status
aigrc status
```

### Exercise 2: JSON Scripting

Create a script that:
1. Scans the project
2. Checks if coverage is below 80%
3. Lists unregistered assets

```bash
#!/bin/bash
RESULT=$(aigrc scan . --format json)
COVERAGE=$(echo $RESULT | jq '.summary.coverage')
UNREGISTERED=$(echo $RESULT | jq -r '.detections[] | select(.registered == false) | .framework')

if (( $(echo "$COVERAGE < 80" | bc -l) )); then
  echo "⚠️ Coverage is below 80%: $COVERAGE%"
  echo "Unregistered assets:"
  echo "$UNREGISTERED"
  exit 1
fi
```

### Exercise 3: Policy Enforcement

```bash
# 1. Create a policy file
cat > policies/vendor-policy.yaml << EOF
allowed_vendors:
  - openai
  - anthropic
blocked_vendors:
  - cohere
require_asset_card: true
EOF

# 2. Generate lock
aigrc policy lock --sources ./policies/

# 3. Add violation
echo 'from cohere import Client' > src/ai/embeddings.py

# 4. Check (should fail)
aigrc policy check

# 5. Fix and re-check
rm src/ai/embeddings.py
aigrc policy check
```

---

## Knowledge Check

1. **To get JSON output from scan:**
   - a) `aigrc scan --json`
   - b) `aigrc scan --format json` ✓
   - c) `aigrc scan -j`
   - d) `aigrc scan | json`

2. **Exit code 1 means:**
   - a) Success
   - b) Validation/governance issues found ✓
   - c) Configuration error
   - d) Permission denied

3. **To register all detections with defaults:**
   - a) `aigrc register *`
   - b) `aigrc register --batch`
   - c) `aigrc register --all --defaults` ✓
   - d) `aigrc register -a`

4. **governance.lock is generated by:**
   - a) `aigrc init`
   - b) `aigrc validate`
   - c) `aigrc policy lock` ✓
   - d) `aigrc register`

---

## Configuration Reference

### Environment Variables

| Variable | Purpose | Default |
|----------|---------|---------|
| `AIGRC_CONFIG` | Config file path | `.aigrc/aigrc.yaml` |
| `AIGRC_LOG_LEVEL` | Logging verbosity | `info` |
| `AIGRC_NO_COLOR` | Disable colors | `false` |
| `AIGRC_JSON` | Default to JSON output | `false` |

### .aigrcignore

Exclude files from scanning:

```gitignore
# .aigrcignore
node_modules/
dist/
*.test.ts
*.spec.py
__pycache__/
```

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| `command not found` | Run `npm install -g @aigrc/cli` |
| `Config not found` | Run `aigrc init` first |
| Slow scans | Add large directories to `.aigrcignore` |
| False positives | Add patterns to `.aigrcignore` |
| Permission denied | Check file permissions |

---

## Next Module

[Module 2.2: VS Code Extension →](./02-vscode-extension.md)

---

*Module 2.1 - AIGRC Training Program v1.0*
