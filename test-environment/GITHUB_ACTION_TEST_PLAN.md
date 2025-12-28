# AIGRC GitHub Action Test Plan

## Overview

This document provides a comprehensive test plan for the AIGRC GitHub Action (`@aigrc/github-action`). The action provides CI/CD integration for AI governance, scanning repositories for AI/ML frameworks and validating compliance.

**Action Version:** 0.1.0

---

## 1. Environment Setup

### Prerequisites

- GitHub repository with Actions enabled
- Node.js >= 18.0.0 (for local testing)
- pnpm >= 8.0.0 (for building)
- `act` CLI tool (optional, for local testing)

### Local Build

```bash
# 1. Navigate to the aigrc monorepo
cd aigrc

# 2. Install dependencies and build
pnpm install
pnpm run build

# 3. Verify action entry point
ls packages/github-action/dist/index.js
```

### Test Repository Setup

Create a test repository with the following structure:

```bash
mkdir -p test-repo/.aigrc/cards
cd test-repo

# Initialize git
git init

# Create AI code file
cat > agent.py << 'EOF'
import openai
from langchain import LLMChain
from anthropic import Anthropic

client = openai.OpenAI()
response = client.chat.completions.create(
    model="gpt-4",
    messages=[{"role": "user", "content": "Hello"}]
)
EOF

# Create TypeScript AI code
cat > assistant.ts << 'EOF'
import Anthropic from '@anthropic-ai/sdk';
import { OpenAI } from 'openai';

const client = new Anthropic();
EOF

# Create high-risk asset card
cat > .aigrc/cards/high-risk-agent.yaml << 'EOF'
name: high-risk-agent
version: "1.0.0"
status: active
owner:
  name: Test User
  email: test@example.com
description: High-risk autonomous customer support agent
technical:
  type: agent
  framework: openai
  models:
    - gpt-4
classification:
  riskLevel: high
  riskFactors:
    autonomousDecisions: true
    customerFacing: true
    toolExecution: true
    externalDataAccess: true
    piiProcessing: "yes"
    highStakesDecisions: false
governance:
  approvals:
    - approver: Legal Team
      date: "2024-01-15"
      status: approved
EOF

# Create minimal-risk asset card
cat > .aigrc/cards/minimal-risk-classifier.yaml << 'EOF'
name: minimal-risk-classifier
version: "1.0.0"
status: active
owner:
  name: Test User
  email: test@example.com
description: Internal document classifier
technical:
  type: model
  framework: pytorch
classification:
  riskLevel: minimal
  riskFactors:
    autonomousDecisions: false
    customerFacing: false
    toolExecution: false
    externalDataAccess: false
    piiProcessing: "no"
    highStakesDecisions: false
EOF

# Create .aigrc.yaml config
cat > .aigrc.yaml << 'EOF'
version: "1.0"
profiles:
  - eu-ai-act
cardsDirectory: .aigrc/cards
EOF

# Commit files
git add -A
git commit -m "Initial commit with AI assets"
```

---

## 2. Workflow Configuration Tests

### 2.1 Basic Workflow

Create `.github/workflows/aigrc.yml`:

```yaml
name: AIGRC Governance Check

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  governance:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: AIGRC Scan
        uses: aigrc/aigrc-action@v0.1.0
        with:
          directory: '.'
```

### 2.2 Full Configuration Workflow

```yaml
name: AIGRC Full Governance

on:
  pull_request:
    branches: [main]

jobs:
  governance:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      pull-requests: write

    steps:
      - uses: actions/checkout@v4

      - name: AIGRC Governance Check
        id: aigrc
        uses: aigrc/aigrc-action@v0.1.0
        with:
          directory: '.'
          fail-on-high-risk: 'true'
          fail-on-unregistered: 'true'
          validate-cards: 'true'
          create-pr-comment: 'true'
          github-token: ${{ secrets.GITHUB_TOKEN }}

      - name: Check outputs
        run: |
          echo "Detections: ${{ steps.aigrc.outputs.detections-count }}"
          echo "Risk Level: ${{ steps.aigrc.outputs.risk-level }}"
          echo "Cards Valid: ${{ steps.aigrc.outputs.cards-valid }}"
```

---

## 3. Input Parameter Tests

### 3.1 Directory Input

| Test ID | Input | Expected Result |
|---------|-------|-----------------|
| IN-DIR-01 | `directory: '.'` | Scans repository root |
| IN-DIR-02 | `directory: 'src'` | Scans only src/ directory |
| IN-DIR-03 | `directory: './packages/core'` | Scans specific package |
| IN-DIR-04 | `directory: 'nonexistent'` | Fails with "directory not found" |

### 3.2 Fail Conditions

| Test ID | Input | Scenario | Expected Result |
|---------|-------|----------|-----------------|
| IN-FAIL-01 | `fail-on-high-risk: 'true'` | Has high-risk asset | Action fails |
| IN-FAIL-02 | `fail-on-high-risk: 'true'` | Only minimal risk | Action passes |
| IN-FAIL-03 | `fail-on-high-risk: 'false'` | Has high-risk asset | Action passes |
| IN-FAIL-04 | `fail-on-unregistered: 'true'` | AI code, no cards | Action fails |
| IN-FAIL-05 | `fail-on-unregistered: 'true'` | AI code with cards | Action passes |
| IN-FAIL-06 | `fail-on-unregistered: 'false'` | AI code, no cards | Action passes |

### 3.3 Validation Input

| Test ID | Input | Scenario | Expected Result |
|---------|-------|----------|-----------------|
| IN-VAL-01 | `validate-cards: 'true'` | Valid cards | Action passes |
| IN-VAL-02 | `validate-cards: 'true'` | Invalid card schema | Action fails |
| IN-VAL-03 | `validate-cards: 'false'` | Invalid card schema | Action passes (no validation) |

### 3.4 PR Comment Input

| Test ID | Input | Context | Expected Result |
|---------|-------|---------|-----------------|
| IN-PR-01 | `create-pr-comment: 'true'` | Pull request event | Comment created on PR |
| IN-PR-02 | `create-pr-comment: 'true'` | Push event | No comment (skipped) |
| IN-PR-03 | `create-pr-comment: 'false'` | Pull request | No comment created |
| IN-PR-04 | `create-pr-comment: 'true'` | No github-token | Warning, no comment |

---

## 4. Output Tests

### 4.1 Output Values

| Test ID | Output | Test Case | Expected Value |
|---------|--------|-----------|----------------|
| OUT-01 | `detections-count` | Repository with AI code | Number > 0 |
| OUT-02 | `detections-count` | Repository without AI code | 0 |
| OUT-03 | `high-confidence-count` | Has high-confidence detections | Number > 0 |
| OUT-04 | `scan-results` | Any scan | Valid JSON string |
| OUT-05 | `cards-count` | Has asset cards | Number of cards |
| OUT-06 | `cards-count` | No .aigrc/cards directory | 0 |
| OUT-07 | `cards-valid` | All cards valid | 'true' |
| OUT-08 | `cards-valid` | Has invalid card | 'false' |
| OUT-09 | `risk-level` | Has high-risk asset | 'high' |
| OUT-10 | `risk-level` | Only minimal assets | 'minimal' |
| OUT-11 | `risk-level` | Has unacceptable | 'unacceptable' |

### 4.2 Using Outputs in Workflow

```yaml
- name: AIGRC Check
  id: aigrc
  uses: aigrc/aigrc-action@v0.1.0

- name: Conditional on risk
  if: steps.aigrc.outputs.risk-level == 'high'
  run: echo "High risk detected, additional review required"

- name: Parse scan results
  run: |
    echo '${{ steps.aigrc.outputs.scan-results }}' | jq '.detections[]'
```

---

## 5. Scan Detection Tests

### 5.1 Framework Detection

| Test ID | File Content | Expected Detections |
|---------|--------------|---------------------|
| DET-01 | `import openai` | OpenAI |
| DET-02 | `from langchain import` | LangChain |
| DET-03 | `import anthropic` | Anthropic |
| DET-04 | `import torch` | PyTorch |
| DET-05 | `import tensorflow` | TensorFlow |
| DET-06 | `from transformers import` | Hugging Face |
| DET-07 | `import { OpenAI } from 'openai'` | OpenAI (JS) |
| DET-08 | `import Anthropic from '@anthropic-ai/sdk'` | Anthropic (JS) |
| DET-09 | `model.pt` file | PyTorch model file |
| DET-10 | `.onnx` file | ONNX model file |

### 5.2 Ignore Patterns

The action automatically ignores:
- `node_modules/`
- `.git/`
- `dist/`
- `build/`
- `__pycache__/`
- `.venv/`
- `vendor/`

| Test ID | Test Case | Expected Result |
|---------|-----------|-----------------|
| IGN-01 | AI code in node_modules | Not detected |
| IGN-02 | AI code in .git | Not detected |
| IGN-03 | AI code in dist | Not detected |
| IGN-04 | AI code in src | Detected |

---

## 6. Asset Card Validation Tests

### 6.1 Valid Cards

| Test ID | Card Content | Expected Result |
|---------|--------------|-----------------|
| CARD-01 | Complete valid card | Valid |
| CARD-02 | Minimal required fields | Valid |
| CARD-03 | All optional fields | Valid |

### 6.2 Invalid Cards

| Test ID | Card Issue | Expected Result |
|---------|------------|-----------------|
| CARD-ERR-01 | Missing `name` | Invalid, error message |
| CARD-ERR-02 | Missing `owner` | Invalid, error message |
| CARD-ERR-03 | Invalid `riskLevel` value | Invalid, error message |
| CARD-ERR-04 | Malformed YAML | Parse error |
| CARD-ERR-05 | Invalid `piiProcessing` enum | Invalid, error message |

---

## 7. PR Comment Tests

### 7.1 Comment Content

| Test ID | Scenario | Expected Content |
|---------|----------|------------------|
| CMT-01 | Basic scan | Summary table with metrics |
| CMT-02 | Detections found | "Detected AI/ML Frameworks" table |
| CMT-03 | Asset cards present | "Registered Assets" table |
| CMT-04 | No cards, AI detected | "Suggested Asset Card" section |
| CMT-05 | Risk factors inferred | "Inferred Risk Factors" table |

### 7.2 Comment Format

Expected PR comment structure:

```markdown
<!-- aigrc-action-comment -->
## [STATUS_ICON] AIGRC Governance Report

### Summary

| Metric | Value |
|--------|-------|
| Files Scanned | X |
| AI Detections | X |
| High Confidence | X |
| Asset Cards | X |
| Cards Valid | Yes/No |
| Risk Level | [ICON] LEVEL |

### Detected AI/ML Frameworks
[Table if detections exist]

### Registered Assets
[Table if cards exist]

### Inferred Risk Factors
[Table if inferred]

### Suggested Asset Card
[If no cards but detections]

---
*Generated by AIGRC at [timestamp]*
```

### 7.3 Comment Update

| Test ID | Test Case | Expected Result |
|---------|-----------|-----------------|
| CMT-UPD-01 | First run on PR | New comment created |
| CMT-UPD-02 | Second run on same PR | Existing comment updated |
| CMT-UPD-03 | Different PR | New comment on new PR |

---

## 8. Risk Level Determination Tests

### 8.1 Risk Level Hierarchy

Risk levels are determined by the highest risk among all cards:

| Cards Present | Expected `risk-level` Output |
|--------------|------------------------------|
| minimal only | `minimal` |
| minimal + limited | `limited` |
| minimal + limited + high | `high` |
| any + unacceptable | `unacceptable` |

### 8.2 Risk Level Icons

| Risk Level | Status Icon | Risk Icon |
|------------|-------------|-----------|
| minimal | `✅` | `🟢` |
| limited | `🔶` | `🟡` |
| high | `⚠️` | `🟠` |
| unacceptable | `🚫` | `🔴` |

---

## 9. Failure Condition Tests

### 9.1 Action Failure Scenarios

| Test ID | Configuration | Scenario | Expected Result |
|---------|--------------|----------|-----------------|
| FAIL-01 | `fail-on-high-risk: true` | unacceptable risk | Action fails |
| FAIL-02 | `fail-on-high-risk: true` | high risk | Action fails |
| FAIL-03 | `fail-on-high-risk: true` | limited risk | Action passes |
| FAIL-04 | `fail-on-unregistered: true` | 5 detections, 0 cards | Action fails |
| FAIL-05 | `fail-on-unregistered: true` | 5 detections, 3 cards | Action passes |
| FAIL-06 | `validate-cards: true` | Invalid card | Action fails |

### 9.2 Failure Messages

| Condition | Expected Message |
|-----------|------------------|
| High risk detected | "High-risk AI assets detected (high)" |
| Unacceptable detected | "High-risk AI assets detected (unacceptable)" |
| Unregistered AI | "AI frameworks detected but no asset cards found" |
| Invalid cards | "Invalid asset cards detected" |

---

## 10. Integration Tests

### 10.1 End-to-End: New Repository

```yaml
# Test workflow for new repo without AIGRC
name: E2E New Repo

on: push

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: AIGRC Check (should detect unregistered)
        uses: aigrc/aigrc-action@v0.1.0
        with:
          fail-on-unregistered: 'false'  # Don't fail for test

      # Verify outputs
      - name: Verify detections
        run: |
          if [ "${{ steps.aigrc.outputs.detections-count }}" -gt 0 ]; then
            echo "AI frameworks detected as expected"
          fi
```

### 10.2 End-to-End: Compliant Repository

```yaml
# Test workflow for compliant repo
name: E2E Compliant Repo

on: push

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: AIGRC Check (should pass)
        uses: aigrc/aigrc-action@v0.1.0
        with:
          fail-on-high-risk: 'true'
          fail-on-unregistered: 'true'
          validate-cards: 'true'

      # Should reach here if compliant
      - name: Compliance verified
        run: echo "Repository is AIGRC compliant"
```

### 10.3 End-to-End: Pull Request

```yaml
# Test workflow for PR
name: E2E Pull Request

on:
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    permissions:
      pull-requests: write

    steps:
      - uses: actions/checkout@v4

      - name: AIGRC Check
        uses: aigrc/aigrc-action@v0.1.0
        with:
          create-pr-comment: 'true'
          github-token: ${{ secrets.GITHUB_TOKEN }}

      # Verify comment was created (manual check)
```

---

## 11. Local Testing with `act`

### 11.1 Install act

```bash
# macOS
brew install act

# Linux
curl https://raw.githubusercontent.com/nektos/act/master/install.sh | sudo bash

# Windows
choco install act-cli
```

### 11.2 Run Tests Locally

```bash
# Navigate to test repository
cd test-repo

# Create workflow file
mkdir -p .github/workflows
cat > .github/workflows/test.yml << 'EOF'
name: Test AIGRC
on: push
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: AIGRC
        uses: ./path/to/aigrc/packages/github-action
EOF

# Run with act
act push --secret GITHUB_TOKEN=fake_token

# Run specific job
act push -j test
```

---

## 12. Error Handling Tests

| Test ID | Error Scenario | Expected Behavior |
|---------|----------------|-------------------|
| ERR-01 | Invalid directory | Fails with clear message |
| ERR-02 | No read permission | Fails with permission error |
| ERR-03 | Corrupted YAML card | Warning logged, continues |
| ERR-04 | Missing github-token for PR comment | Warning, skips comment |
| ERR-05 | GitHub API rate limit | Warning, continues scan |
| ERR-06 | Large repository (10k+ files) | Completes (may be slow) |

---

## 13. Performance Tests

| Test ID | Test Case | Acceptance Criteria |
|---------|-----------|---------------------|
| PERF-01 | Small repo (100 files) | < 30s total |
| PERF-02 | Medium repo (1000 files) | < 60s total |
| PERF-03 | Large repo (5000 files) | < 120s total |
| PERF-04 | Many asset cards (50+) | < 30s validation |

---

## 14. Test Checklist

- [ ] **Input Parameters**
  - [ ] IN-DIR-01 through IN-DIR-04
  - [ ] IN-FAIL-01 through IN-FAIL-06
  - [ ] IN-VAL-01 through IN-VAL-03
  - [ ] IN-PR-01 through IN-PR-04

- [ ] **Outputs**
  - [ ] OUT-01 through OUT-11

- [ ] **Detection**
  - [ ] DET-01 through DET-10
  - [ ] IGN-01 through IGN-04

- [ ] **Asset Card Validation**
  - [ ] CARD-01 through CARD-03
  - [ ] CARD-ERR-01 through CARD-ERR-05

- [ ] **PR Comments**
  - [ ] CMT-01 through CMT-05
  - [ ] CMT-UPD-01 through CMT-UPD-03

- [ ] **Failure Conditions**
  - [ ] FAIL-01 through FAIL-06

- [ ] **End-to-End**
  - [ ] New repository
  - [ ] Compliant repository
  - [ ] Pull request with comment

- [ ] **Error Handling**
  - [ ] ERR-01 through ERR-06

- [ ] **Performance**
  - [ ] PERF-01 through PERF-04

---

## 15. Sample Workflows

### 15.1 Minimal Configuration

```yaml
name: AIGRC
on: [push, pull_request]
jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: aigrc/aigrc-action@v0.1.0
```

### 15.2 Strict Governance

```yaml
name: AIGRC Strict
on:
  pull_request:
    branches: [main, production]
jobs:
  governance:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      pull-requests: write
    steps:
      - uses: actions/checkout@v4
      - uses: aigrc/aigrc-action@v0.1.0
        with:
          fail-on-high-risk: 'true'
          fail-on-unregistered: 'true'
          validate-cards: 'true'
          create-pr-comment: 'true'
          github-token: ${{ secrets.GITHUB_TOKEN }}
```

### 15.3 Monorepo Configuration

```yaml
name: AIGRC Monorepo
on: push
jobs:
  check-packages:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        package: [core, api, worker]
    steps:
      - uses: actions/checkout@v4
      - uses: aigrc/aigrc-action@v0.1.0
        with:
          directory: 'packages/${{ matrix.package }}'
```

### 15.4 Scheduled Audit

```yaml
name: AIGRC Weekly Audit
on:
  schedule:
    - cron: '0 9 * * 1'  # Every Monday at 9 AM
jobs:
  audit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: aigrc/aigrc-action@v0.1.0
        id: aigrc
      - name: Create Issue if High Risk
        if: steps.aigrc.outputs.risk-level == 'high' || steps.aigrc.outputs.risk-level == 'unacceptable'
        uses: actions/github-script@v7
        with:
          script: |
            github.rest.issues.create({
              owner: context.repo.owner,
              repo: context.repo.repo,
              title: 'AIGRC: High Risk AI Assets Detected',
              body: 'Weekly audit found high-risk assets. Review required.'
            })
```

---

## 16. Debugging Tips

### View Action Logs

In GitHub Actions UI:
1. Go to repository > Actions tab
2. Click on workflow run
3. Expand "AIGRC" step to see logs

### Debug Mode

Add to workflow:
```yaml
- uses: aigrc/aigrc-action@v0.1.0
  env:
    ACTIONS_STEP_DEBUG: 'true'
```

### Local Debugging

```bash
# Clone action
cd packages/github-action

# Run directly (simulating GitHub Actions)
INPUT_DIRECTORY=. \
INPUT_FAIL_ON_HIGH_RISK=false \
INPUT_VALIDATE_CARDS=true \
node dist/index.js
```

---

## 17. Known Issues & Limitations

1. PR comments require `pull-requests: write` permission
2. Comment update uses marker `<!-- aigrc-action-comment -->` to find existing
3. Large repositories may timeout on free-tier runners
4. Binary model files (`.pt`, `.onnx`) are detected by extension only
5. Nested `.aigrc/cards` directories not supported (only root level)
