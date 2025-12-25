# GitHub Action Guide

Integrate AI governance checks into your CI/CD pipeline with the AIGRC GitHub Action.

## Overview

The AIGRC GitHub Action:
- Scans your codebase for AI/ML frameworks
- Validates asset cards
- Posts governance reports to pull requests
- Fails builds based on configurable conditions

## Quick Start

Add to `.github/workflows/aigrc.yml`:

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
```

## Inputs

| Input | Required | Default | Description |
|-------|----------|---------|-------------|
| `directory` | No | `.` | Directory to scan (relative to workspace) |
| `fail-on-high-risk` | No | `true` | Fail if high/unacceptable risk assets detected |
| `fail-on-unregistered` | No | `false` | Fail if AI detected without asset cards |
| `validate-cards` | No | `true` | Validate all asset cards |
| `create-pr-comment` | No | `true` | Create/update PR comment with results |
| `github-token` | No | `${{ github.token }}` | Token for PR comments |

## Outputs

| Output | Description |
|--------|-------------|
| `detections-count` | Number of AI/ML framework detections |
| `high-confidence-count` | Number of high-confidence detections |
| `risk-level` | Highest risk level: `minimal`, `limited`, `high`, `unacceptable` |
| `cards-valid` | `true` if all asset cards are valid |
| `cards-count` | Number of asset cards found |
| `scan-results` | Full scan results as JSON string |

## Configuration Examples

### Basic Check

Scan and validate without failing:

```yaml
- name: AIGRC Check
  uses: aigrc/aigrc@v1
  with:
    fail-on-high-risk: "false"
    fail-on-unregistered: "false"
```

### Strict Enforcement

Require asset cards for all detected AI:

```yaml
- name: AIGRC Strict Check
  uses: aigrc/aigrc@v1
  with:
    fail-on-high-risk: "true"
    fail-on-unregistered: "true"
    validate-cards: "true"
```

### Monorepo Scan

Scan specific directory:

```yaml
- name: Scan AI Service
  uses: aigrc/aigrc@v1
  with:
    directory: "packages/ai-service"
```

### Multiple Scans

Scan multiple packages separately:

```yaml
jobs:
  governance-check:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        package: [ai-service, ml-pipeline, chatbot]
    steps:
      - uses: actions/checkout@v4

      - name: AIGRC Check - ${{ matrix.package }}
        uses: aigrc/aigrc@v1
        with:
          directory: "packages/${{ matrix.package }}"
```

### Using Outputs

Use action outputs in subsequent steps:

```yaml
- name: AIGRC Check
  id: aigrc
  uses: aigrc/aigrc@v1

- name: Report Results
  run: |
    echo "Detections: ${{ steps.aigrc.outputs.detections-count }}"
    echo "Risk Level: ${{ steps.aigrc.outputs.risk-level }}"
    echo "Cards Valid: ${{ steps.aigrc.outputs.cards-valid }}"

- name: Require Low Risk
  if: steps.aigrc.outputs.risk-level == 'high' || steps.aigrc.outputs.risk-level == 'unacceptable'
  run: |
    echo "::error::High-risk AI assets detected!"
    exit 1
```

### Conditional PR Comment

Only comment on PRs:

```yaml
- name: AIGRC Check
  uses: aigrc/aigrc@v1
  with:
    create-pr-comment: ${{ github.event_name == 'pull_request' }}
```

### Custom Token for Comments

Use a PAT for enhanced permissions:

```yaml
- name: AIGRC Check
  uses: aigrc/aigrc@v1
  with:
    github-token: ${{ secrets.AIGRC_TOKEN }}
```

## PR Comments

When `create-pr-comment` is enabled, the action posts a detailed governance report:

```markdown
## ✅ AIGRC Governance Report

### Summary

| Metric | Value |
|--------|-------|
| Files Scanned | 234 |
| AI Detections | 15 |
| High Confidence | 12 |
| Asset Cards | 2 |
| Cards Valid | ✅ Yes |
| Risk Level | 🟡 LIMITED |

### Detected AI/ML Frameworks

| Framework | Category | Count |
|-----------|----------|-------|
| openai | api_client | 5 |
| langchain | framework | 3 |
| anthropic | api_client | 2 |

### Registered Assets

| Asset | Risk Level | EU AI Act Category | Status |
|-------|------------|-------------------|--------|
| Customer Bot | 🟡 limited | Transparency obligations | ✅ Valid |
| ML Pipeline | 🟢 minimal | — | ✅ Valid |

### Inferred Risk Factors

| Factor | Value |
|--------|-------|
| Autonomous Decisions | ✅ No |
| Customer Facing | ⚠️ Yes |
| Tool Execution | ✅ No |
| External Data Access | ⚠️ Yes |
```

Comments are updated on subsequent runs rather than creating duplicates.

## Workflow Examples

### Pull Request Workflow

Standard PR workflow with governance check:

```yaml
name: Pull Request

on:
  pull_request:
    branches: [main, develop]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: "20"
      - run: npm ci
      - run: npm test

  governance:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: AIGRC Governance Check
        uses: aigrc/aigrc@v1
        with:
          fail-on-high-risk: "true"
          create-pr-comment: "true"
```

### Release Workflow

Enforce governance before release:

```yaml
name: Release

on:
  push:
    tags:
      - "v*"

jobs:
  governance-gate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: AIGRC Governance Check
        uses: aigrc/aigrc@v1
        with:
          fail-on-high-risk: "true"
          fail-on-unregistered: "true"
          validate-cards: "true"
          create-pr-comment: "false"

  release:
    needs: governance-gate
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      # ... release steps
```

### Scheduled Audit

Run governance audit on schedule:

```yaml
name: Weekly Governance Audit

on:
  schedule:
    - cron: "0 9 * * 1"  # Every Monday at 9 AM

jobs:
  audit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: AIGRC Audit
        id: aigrc
        uses: aigrc/aigrc@v1
        with:
          fail-on-high-risk: "false"
          create-pr-comment: "false"

      - name: Create Issue for High Risk
        if: steps.aigrc.outputs.risk-level == 'high' || steps.aigrc.outputs.risk-level == 'unacceptable'
        uses: actions/github-script@v7
        with:
          script: |
            github.rest.issues.create({
              owner: context.repo.owner,
              repo: context.repo.repo,
              title: 'AI Governance Alert: High-Risk Assets Detected',
              body: `Weekly audit found high-risk AI assets.\n\nRisk Level: ${{ steps.aigrc.outputs.risk-level }}\nDetections: ${{ steps.aigrc.outputs.detections-count }}`,
              labels: ['governance', 'ai-risk']
            })
```

### Branch Protection Integration

Use as a required status check:

1. Add the workflow
2. Go to Settings > Branches > Branch protection rules
3. Enable "Require status checks to pass"
4. Select "governance-check" (or your job name)

## Permissions

Ensure your workflow has necessary permissions:

```yaml
permissions:
  contents: read        # Required for checkout
  pull-requests: write  # Required for PR comments
```

For organization repositories, you may need to configure Actions permissions:
1. Settings > Actions > General
2. Enable "Read and write permissions"

## Troubleshooting

### "Resource not accessible by integration"

Add explicit permissions:

```yaml
permissions:
  contents: read
  pull-requests: write
```

### "No asset cards found"

Ensure:
- `.aigrc/cards/` directory exists
- Cards have `.yaml` or `.yml` extension
- Cards are valid YAML

### "Action not finding files"

Check:
- `directory` input is correct
- Files aren't in `.gitignore`
- Checkout step runs before action

### PR Comment Not Appearing

Verify:
- `create-pr-comment: "true"`
- `github-token` has write access
- Workflow is triggered by `pull_request` event

## Next Steps

- [CLI Guide](./cli.md) - Local development usage
- [VS Code Extension](./vscode-extension.md) - IDE integration
- [Detection Engine Guide](./detection-engine.md) - How detection works
