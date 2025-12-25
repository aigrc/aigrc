# Installation & Setup

Complete installation guide for all AIGRC tools.

## System Requirements

| Requirement | Version |
|-------------|---------|
| Node.js | 18.0.0 or higher |
| npm/pnpm/yarn | Latest recommended |
| Python (optional) | 3.8+ for Python project scanning |
| Git | For version control integration |

## CLI Installation

### Global Installation (Recommended)

```bash
# Using npm
npm install -g @aigrc/cli

# Using pnpm
pnpm add -g @aigrc/cli

# Using yarn
yarn global add @aigrc/cli
```

Verify installation:

```bash
aigrc --version
# Output: @aigrc/cli v0.1.0
```

### Project-Local Installation

For per-project installation (useful for CI/CD):

```bash
# Using npm
npm install --save-dev @aigrc/cli

# Using pnpm
pnpm add -D @aigrc/cli

# Using yarn
yarn add -D @aigrc/cli
```

Add to your `package.json` scripts:

```json
{
  "scripts": {
    "aigrc:scan": "aigrc scan",
    "aigrc:validate": "aigrc validate",
    "aigrc:status": "aigrc status"
  }
}
```

### Using npx (No Installation)

Run without installing:

```bash
npx @aigrc/cli scan
npx @aigrc/cli init
```

## VS Code Extension

### From Marketplace

1. Open VS Code
2. Press `Ctrl+Shift+X` (Windows/Linux) or `Cmd+Shift+X` (macOS)
3. Search for "AIGRC"
4. Click **Install**

### From Command Line

```bash
code --install-extension aigrc.aigrc-vscode
```

### From VSIX File

For offline installation or pre-release versions:

```bash
# Download the .vsix file, then:
code --install-extension aigrc-vscode-0.1.0.vsix
```

### Extension Settings

Configure in VS Code settings (`Ctrl+,`):

| Setting | Default | Description |
|---------|---------|-------------|
| `aigrc.autoScan` | `true` | Automatically scan workspace on open |
| `aigrc.showInlineWarnings` | `true` | Show inline warnings for unregistered AI code |
| `aigrc.cardsDirectory` | `.aigrc/cards` | Directory for asset cards |

Example `settings.json`:

```json
{
  "aigrc.autoScan": true,
  "aigrc.showInlineWarnings": true,
  "aigrc.cardsDirectory": ".aigrc/cards"
}
```

## GitHub Action

### Basic Setup

Add to your workflow file (`.github/workflows/aigrc.yml`):

```yaml
name: AI Governance Check

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  governance-check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: AIGRC Governance Check
        uses: aigrc/aigrc@v1
        with:
          directory: "."
          fail-on-high-risk: "true"
          validate-cards: "true"
          create-pr-comment: "true"
```

### Action Inputs

| Input | Default | Description |
|-------|---------|-------------|
| `directory` | `.` | Directory to scan (relative to workspace) |
| `fail-on-high-risk` | `true` | Fail if high-risk AI assets detected |
| `fail-on-unregistered` | `false` | Fail if AI detected without asset cards |
| `validate-cards` | `true` | Validate all asset cards |
| `create-pr-comment` | `true` | Create PR comment with results |
| `github-token` | `${{ github.token }}` | Token for PR comments |

### Action Outputs

| Output | Description |
|--------|-------------|
| `detections-count` | Number of AI/ML framework detections |
| `high-confidence-count` | Number of high-confidence detections |
| `risk-level` | Highest risk level (minimal/limited/high/unacceptable) |
| `cards-valid` | Whether all asset cards are valid |
| `cards-count` | Number of asset cards found |
| `scan-results` | Full scan results as JSON |

## Core Library (@aigrc/core)

For programmatic usage in your own tools:

```bash
# Using npm
npm install @aigrc/core

# Using pnpm
pnpm add @aigrc/core

# Using yarn
yarn add @aigrc/core
```

### Basic Usage

```typescript
import {
  scan,
  initializePatterns,
  createAssetCard,
  classifyRisk,
  validateAssetCard,
} from "@aigrc/core";

// Initialize detection patterns
initializePatterns();

// Scan a directory
const result = await scan({
  directory: "./src",
  ignorePatterns: ["node_modules", ".git"],
});

console.log(`Found ${result.detections.length} AI frameworks`);

// Create an asset card
const card = createAssetCard({
  name: "My AI Service",
  owner: { name: "Dev Team", email: "team@example.com" },
  technical: { type: "api_client", framework: "openai" },
  riskFactors: {
    autonomousDecisions: false,
    customerFacing: true,
    toolExecution: false,
    externalDataAccess: true,
    piiProcessing: "no",
    highStakesDecisions: false,
  },
});

// Classify risk
const classification = classifyRisk(card.classification.riskFactors);
console.log(`Risk Level: ${classification.riskLevel}`);
```

## Monorepo Setup

For monorepo projects, configure scanning per package:

```bash
# Scan specific package
aigrc scan packages/my-ai-service

# Or configure in .aigrc.yaml
```

Create `.aigrc.yaml` in your root:

```yaml
version: "1.0"
cardsDir: ".aigrc/cards"

scan:
  include:
    - "packages/*/src/**"
    - "apps/*/src/**"
  exclude:
    - "node_modules"
    - "dist"
    - "build"
    - ".git"
    - "__pycache__"
    - ".venv"
```

## Docker

For containerized environments:

```dockerfile
# In your Dockerfile
RUN npm install -g @aigrc/cli

# Or as a multi-stage build
FROM node:20-alpine AS aigrc
RUN npm install -g @aigrc/cli
WORKDIR /app
COPY . .
RUN aigrc validate
```

## Troubleshooting

### Common Issues

**"Command not found: aigrc"**

Ensure global npm/pnpm bin is in your PATH:

```bash
# For npm
export PATH="$PATH:$(npm config get prefix)/bin"

# For pnpm
export PATH="$PATH:$(pnpm config get prefix)/bin"
```

**"Cannot find module '@aigrc/core'"**

Run `npm install` or `pnpm install` in your project.

**VS Code extension not activating**

The extension activates when:
- Workspace contains `.py`, `.ts`, or `.js` files
- Workspace contains `.aigrc.yaml`

Check the Output panel (View > Output > AIGRC) for logs.

**GitHub Action permission errors**

Ensure your workflow has write permissions:

```yaml
permissions:
  contents: read
  pull-requests: write
```

## Next Steps

- [Quick Start](./quick-start.md) - Get running in 5 minutes
- [CLI Guide](../guides/cli.md) - Complete command reference
- [VS Code Extension Guide](../guides/vscode-extension.md) - IDE features
- [GitHub Action Guide](../guides/github-action.md) - CI/CD examples
