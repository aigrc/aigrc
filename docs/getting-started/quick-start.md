# Quick Start

Get up and running with AIGRC in under 5 minutes.

## What is AIGRC?

AIGRC (AI Governance, Risk, Compliance) is a toolkit that helps you:
- **Detect** AI/ML frameworks in your codebase
- **Register** AI assets with governance metadata
- **Classify** risk levels aligned with EU AI Act
- **Validate** compliance in CI/CD pipelines

## Prerequisites

- Node.js 18+
- pnpm, npm, or yarn

## Installation

### CLI (Recommended for Quick Start)

```bash
# Install globally
npm install -g @aigrc/cli

# Or use npx
npx @aigrc/cli scan
```

### VS Code Extension

Search for "AIGRC" in the VS Code Extensions marketplace, or:

```bash
code --install-extension aigrc.aigrc-vscode
```

## Your First Scan

### 1. Scan Your Codebase

Navigate to your project directory and run:

```bash
aigrc scan
```

This will:
- Scan all source files for AI/ML framework usage
- Detect imports from OpenAI, Anthropic, LangChain, PyTorch, etc.
- Identify model files (.pt, .safetensors, .onnx, etc.)
- Show inferred risk factors

**Example output:**

```
AIGRC - AI Governance, Risk, Compliance
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Scanning: /path/to/your/project

✔ Scanned 156 files

Scan Summary
──────────────────────────────────────────────────
Files Scanned:    156
Detections:       12
High Confidence:  8

Detections
──────────────────────────────────────────────────
  openai          api_client     high    src/api/chat.ts:5
  langchain       framework      high    src/agents/main.py:3
  anthropic       api_client     high    src/api/claude.ts:2
```

### 2. Initialize AIGRC

Create your first asset card:

```bash
aigrc init
```

This interactive command will:
- Run a scan to detect frameworks
- Ask for asset details (name, owner, description)
- Generate an asset card with risk classification
- Create `.aigrc/cards/` directory structure

### 3. View Your Assets

```bash
aigrc status
```

Shows all registered assets with their risk levels:

```
AIGRC Status
──────────────────────────────────────────────────

Config: ✓ .aigrc.yaml
Cards:  ✓ .aigrc/cards

Registered Assets (1)
──────────────────────────────────────────────────

LIMITED (1)

  My AI Assistant
    ID: asset-abc123
    Risk Level: limited
    EU AI Act: Transparency obligations
    Owner: Jane Developer <jane@example.com>
    Risks: Customer-Facing, External Data
```

### 4. Validate Compliance

```bash
aigrc validate
```

Validates all asset cards against the schema and checks for issues.

## What's Next?

- [Installation Guide](./installation.md) - Detailed setup instructions
- [CLI Guide](../guides/cli.md) - All commands and options
- [VS Code Extension](../guides/vscode-extension.md) - IDE integration
- [GitHub Action](../guides/github-action.md) - CI/CD integration
- [Understanding Risk Classification](../concepts/risk-classification.md)

## Example Asset Card

Here's what a generated asset card looks like:

```yaml
# .aigrc/cards/my-ai-assistant.yaml
id: asset-abc123
name: My AI Assistant
version: "1.0"
description: Customer support chatbot using GPT-4

ownership:
  owner:
    name: Jane Developer
    email: jane@example.com

technical:
  type: api_client
  framework: openai

classification:
  riskFactors:
    autonomousDecisions: false
    customerFacing: true
    toolExecution: false
    externalDataAccess: true
    piiProcessing: "no"
    highStakesDecisions: false

metadata:
  createdAt: "2024-01-15T10:30:00Z"
  lastModified: "2024-01-15T10:30:00Z"
```

## Getting Help

- Run `aigrc --help` for command reference
- Report issues at [github.com/aigrc/aigrc/issues](https://github.com/aigrc/aigrc/issues)
