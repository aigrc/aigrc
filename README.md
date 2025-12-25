# AIGRC - AI Governance, Risk, Compliance

A comprehensive toolkit for managing AI governance in your codebase. Detect AI/ML frameworks, register assets, classify risk levels, and ensure compliance with regulations like the EU AI Act.

## Why AIGRC?

As AI becomes embedded in software, organizations need to:
- **Know what AI they're using** - Detect frameworks across codebases
- **Assess risk levels** - Classify systems by potential impact
- **Meet compliance requirements** - Align with EU AI Act and other regulations
- **Maintain documentation** - Keep governance artifacts up to date

AIGRC automates this process with tools for every stage of development.

## Features

- **Detection Engine** - Automatically identifies 30+ AI/ML frameworks
- **Risk Classification** - Maps to EU AI Act risk categories
- **Asset Cards** - Structured YAML files for governance metadata
- **Golden Thread** - Links assets to documentation and artifacts
- **Multi-tool Support** - CLI, VS Code extension, GitHub Action

## Quick Start

### Install

```bash
npm install -g @aigrc/cli
```

### Scan Your Project

```bash
aigrc scan
```

### Initialize Governance

```bash
aigrc init
```

This creates an asset card with risk classification based on detected frameworks.

## Tools

| Tool | Purpose | Install |
|------|---------|---------|
| [@aigrc/cli](./packages/cli) | Command-line interface | `npm i -g @aigrc/cli` |
| [aigrc-vscode](./packages/vscode) | VS Code extension | VS Code Marketplace |
| [@aigrc/github-action](./packages/github-action) | CI/CD integration | GitHub Actions |
| [@aigrc/core](./packages/core) | Core library | `npm i @aigrc/core` |

## Documentation

### Getting Started
- [Quick Start](./docs/getting-started/quick-start.md) - Get running in 5 minutes
- [Installation](./docs/getting-started/installation.md) - Detailed setup guide

### Guides
- [CLI Guide](./docs/guides/cli.md) - Complete command reference
- [VS Code Extension](./docs/guides/vscode-extension.md) - IDE integration
- [GitHub Action](./docs/guides/github-action.md) - CI/CD workflows
- [Detection Engine](./docs/guides/detection-engine.md) - How detection works

## Supported Frameworks

### Python
OpenAI, Anthropic, LangChain, LlamaIndex, CrewAI, AutoGen, PyTorch, TensorFlow, Keras, Transformers, scikit-learn, spaCy

### JavaScript/TypeScript
OpenAI SDK, Anthropic SDK, Vercel AI SDK, LangChain.js, TensorFlow.js, Brain.js, Hugging Face

### Model Files
`.pt`, `.pth`, `.safetensors`, `.onnx`, `.h5`, `.keras`, `.pb`, `.gguf`, `.ggml`, `.bin`, `.mlmodel`

## Risk Classification

AIGRC classifies AI assets into four risk levels aligned with the EU AI Act:

| Level | Description | Example |
|-------|-------------|---------|
| **Minimal** | Low impact, internal use | Analytics dashboards |
| **Limited** | Transparency obligations | Chatbots, content generation |
| **High** | Significant oversight required | Credit scoring, hiring tools |
| **Unacceptable** | Prohibited uses | Social scoring, manipulation |

Risk is determined by factors like:
- Autonomous decision-making
- Customer-facing usage
- Tool/function execution
- External data access
- PII processing
- High-stakes decisions

## Example Asset Card

```yaml
# .aigrc/cards/customer-support-bot.yaml
id: asset-abc123
name: Customer Support Bot
version: "1.0"
description: AI-powered customer support chatbot using GPT-4

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

## GitHub Action

Add AI governance checks to your CI/CD:

```yaml
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

## Project Structure

```
packages/
├── core/           # Core library with detection, classification, schemas
├── cli/            # Command-line interface
├── vscode/         # VS Code extension
├── github-action/  # GitHub Action
├── mcp/            # Model Context Protocol server (planned)
└── sdk/            # Language SDKs (planned)
```

## Development

### Prerequisites
- Node.js 18+
- pnpm 8+

### Setup

```bash
# Clone repository
git clone https://github.com/aigrc/aigrc.git
cd aigrc

# Install dependencies
pnpm install

# Build all packages
pnpm run build

# Run tests
pnpm run test

# Type check
pnpm run typecheck
```

### Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests and type checks
5. Submit a pull request

## License

MIT

## Links

- [GitHub Repository](https://github.com/aigrc/aigrc)
- [Issue Tracker](https://github.com/aigrc/aigrc/issues)
- [Documentation](./docs)
