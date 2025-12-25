# CLI Guide

Complete reference for the AIGRC command-line interface.

## Overview

The AIGRC CLI provides commands for scanning, initializing, and managing AI governance in your projects.

```bash
aigrc <command> [options]
```

## Commands

### `aigrc scan`

Scan a directory for AI/ML frameworks and generate risk assessments.

```bash
aigrc scan [directory] [options]
```

**Arguments:**

| Argument | Default | Description |
|----------|---------|-------------|
| `directory` | `.` | Directory to scan |

**Options:**

| Option | Short | Default | Description |
|--------|-------|---------|-------------|
| `--output <format>` | `-o` | `text` | Output format: `text`, `json`, `yaml` |
| `--verbose` | `-v` | `false` | Show detailed detection information |
| `--include <patterns...>` | `-i` | - | Include glob patterns |
| `--exclude <patterns...>` | `-e` | - | Exclude glob patterns |
| `--max-depth <depth>` | `-d` | - | Maximum directory depth |
| `--suggest` | `-s` | `false` | Generate asset card suggestion |
| `--no-progress` | - | `false` | Disable progress spinner |

**Examples:**

```bash
# Basic scan of current directory
aigrc scan

# Scan specific directory
aigrc scan ./src

# Scan with JSON output
aigrc scan -o json

# Scan with verbose output
aigrc scan -v

# Generate asset card suggestion
aigrc scan --suggest

# Exclude directories
aigrc scan -e "tests" -e "fixtures"

# Include only specific patterns
aigrc scan -i "**/*.py" -i "**/*.ts"
```

**Output Example:**

```
AIGRC - AI Governance, Risk, Compliance
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Scanning: /home/user/my-project

✔ Scanned 234 files

Scan Summary
──────────────────────────────────────────────────
Files Scanned:    234
Detections:       15
High Confidence:  12
Med Confidence:   3
Low Confidence:   0

Detections
──────────────────────────────────────────────────
Framework       Category       Confidence  Location
──────────────────────────────────────────────────
openai          api_client     high        src/api/chat.ts:5
langchain       framework      high        src/agents/qa.py:3
anthropic       api_client     high        src/api/claude.ts:2
pytorch         ml_framework   high        models/train.py:1
transformers    ml_framework   high        models/inference.py:4

Inferred Risk Factors
──────────────────────────────────────────────────
Autonomous Decisions:    No
Customer Facing:         Unknown
Tool Execution:          Yes
External Data Access:    Yes
PII Processing:          Unknown
High-Stakes Decisions:   No
```

### `aigrc init`

Initialize AIGRC in a project with automatic scanning and asset card generation.

```bash
aigrc init [options]
```

**Options:**

| Option | Short | Default | Description |
|--------|-------|---------|-------------|
| `--force` | `-f` | `false` | Overwrite existing configuration |
| `--skip-scan` | - | `false` | Skip initial scan |
| `--output <format>` | `-o` | `text` | Output format |

**What it does:**

1. Scans the codebase for AI/ML frameworks
2. Prompts for asset information (name, owner, etc.)
3. Creates `.aigrc.yaml` configuration file
4. Creates `.aigrc/cards/` directory
5. Generates initial asset card

**Example:**

```bash
$ aigrc init

AIGRC - AI Governance, Risk, Compliance
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Scanning for AI/ML frameworks...
✔ Found 8 AI framework detections

? Asset name: Customer Support Bot
? Description: AI-powered customer support chatbot
? Owner name: Jane Developer
? Owner email: jane@example.com
? Asset type: API Client
? Primary framework: openai

Creating asset card...
✔ Created .aigrc/cards/customer-support-bot.yaml
✔ Created .aigrc.yaml

AIGRC initialized successfully!
```

### `aigrc register`

Manually register a new AI asset with an interactive wizard.

```bash
aigrc register [options]
```

**Options:**

| Option | Short | Default | Description |
|--------|-------|---------|-------------|
| `--output <format>` | `-o` | `text` | Output format |

**Interactive Prompts:**

1. Asset name (required)
2. Description (optional)
3. Asset type (API Client, Framework, Agent, Model, Pipeline)
4. Primary framework
5. Owner name
6. Owner email
7. Risk factors (multi-select)
8. PII processing (Yes/No/Unknown)

**Example:**

```bash
$ aigrc register

? Asset name: Fraud Detection Model
? Description: ML model for detecting fraudulent transactions
? Asset type: Model
? Primary framework: pytorch
? Owner name: ML Team
? Owner email: ml-team@example.com
? Select applicable risk factors:
  ◉ Autonomous Decisions
  ◯ Customer Facing
  ◯ Tool Execution
  ◉ External Data Access
  ◉ High-Stakes Decisions
? Does this asset process PII? Yes

✔ Created .aigrc/cards/fraud-detection-model.yaml

Risk Classification:
  Level: HIGH
  EU AI Act: High-risk AI system
  Required: Conformity assessment, Risk management system
```

### `aigrc status`

Show the current AIGRC status and registered assets.

```bash
aigrc status [options]
```

**Options:**

| Option | Short | Default | Description |
|--------|-------|---------|-------------|
| `--output <format>` | `-o` | `text` | Output format: `text`, `json` |

**Example:**

```bash
$ aigrc status

AIGRC Status
──────────────────────────────────────────────────

Config: ✓ .aigrc.yaml
Cards:  ✓ .aigrc/cards

Registered Assets (3)
──────────────────────────────────────────────────

HIGH (1)

  Fraud Detection Model
    ID: asset-def456
    Risk Level: high
    EU AI Act: High-risk AI system
    Owner: ML Team <ml-team@example.com>
    Risks: Autonomous, External Data, High-Stakes, PII

LIMITED (1)

  Customer Support Bot
    ID: asset-abc123
    Risk Level: limited
    EU AI Act: Transparency obligations
    Owner: Jane Developer <jane@example.com>
    Risks: Customer-Facing, External Data

MINIMAL (1)

  Internal Analytics
    ID: asset-ghi789
    Risk Level: minimal
    Owner: Data Team <data@example.com>
    Risks: None

──────────────────────────────────────────────────
Total: 3 | Minimal: 1 | Limited: 1 | High: 1 | Unacceptable: 0

⚠ High-risk assets detected. Review compliance requirements.
```

### `aigrc validate`

Validate asset cards against compliance requirements.

```bash
aigrc validate [path] [options]
```

**Arguments:**

| Argument | Default | Description |
|----------|---------|-------------|
| `path` | `.aigrc/cards` | Path to asset card or cards directory |

**Options:**

| Option | Short | Default | Description |
|--------|-------|---------|-------------|
| `--strict` | `-s` | `false` | Fail on warnings as well as errors |
| `--output <format>` | `-o` | `text` | Output format: `text`, `json` |
| `--all` | `-a` | `true` | Validate all cards in directory |

**Example:**

```bash
$ aigrc validate

AIGRC - AI Governance, Risk, Compliance
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✔ Validating customer-support-bot.yaml...
✔ Validating fraud-detection-model.yaml...
✗ Validating broken-card.yaml...

Validation Summary
──────────────────────────────────────────────────

✓ customer-support-bot.yaml
    Risk Level: limited

✓ fraud-detection-model.yaml
    Risk Level: high
    EU AI Act: High-risk AI system

✗ broken-card.yaml
    Error: Missing required field: ownership.owner.email
    Error: Invalid risk factor value: piiProcessing must be yes, no, or unknown

──────────────────────────────────────────────────
Total: 3 | Valid: 2 | Invalid: 1
```

## Global Options

These options work with all commands:

| Option | Description |
|--------|-------------|
| `--help` | Show help for command |
| `--version` | Show version number |

## Exit Codes

| Code | Meaning |
|------|---------|
| `0` | Success |
| `1` | Error or validation failure |

## Configuration File

Create `.aigrc.yaml` in your project root:

```yaml
version: "1.0"
cardsDir: ".aigrc/cards"

scan:
  include:
    - "src/**"
    - "lib/**"
  exclude:
    - "node_modules"
    - "dist"
    - "build"
    - ".git"
    - "__pycache__"
    - ".venv"
    - "*.test.ts"
    - "*.spec.ts"

validation:
  strict: false
  requireDescription: true
  requireOwner: true
```

## Scripting & Automation

### JSON Output for Scripts

```bash
# Get scan results as JSON
aigrc scan -o json > scan-results.json

# Parse with jq
aigrc scan -o json | jq '.detections | length'

# Get status as JSON
aigrc status -o json | jq '.cards[].riskLevel'
```

### CI/CD Integration

```bash
#!/bin/bash

# Scan and fail on high-risk detections
aigrc scan -o json > results.json
HIGH_RISK=$(jq '.summary.byConfidence.high' results.json)

if [ "$HIGH_RISK" -gt 0 ]; then
  echo "High-risk AI detections found!"
  exit 1
fi

# Validate all cards
aigrc validate --strict
```

### Pre-commit Hook

Add to `.husky/pre-commit` or `.git/hooks/pre-commit`:

```bash
#!/bin/sh
aigrc validate --strict
```

## Next Steps

- [VS Code Extension Guide](./vscode-extension.md) - IDE integration
- [GitHub Action Guide](./github-action.md) - CI/CD workflows
- [Detection Engine Guide](./detection-engine.md) - How detection works
