# Module 2.3: GitHub Actions Integration

> **Duration:** 45-60 minutes
> **Level:** Core Skills
> **Prerequisites:** Level 1 complete, Module 2.1 recommended

---

## Learning Objectives

By the end of this module, you will be able to:
1. Configure AIGRC GitHub Action for automated governance checks
2. Set up PR gates that enforce policy compliance
3. Generate and upload SARIF reports to GitHub Security
4. Customize action inputs for different enforcement levels
5. Use action outputs in workflow automation

---

## WHY: CI/CD as the Final Gate (10 min)

### Defense in Depth

```
┌─────────────────────────────────────────────────────────────────┐
│                    GOVERNANCE ENFORCEMENT LAYERS                │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   Layer 1: IDE (VS Code)           Layer 2: CI/CD (GitHub)     │
│   ─────────────────────            ────────────────────────     │
│   Real-time warnings               Automated gates              │
│   Quick fixes                      PR blocking                  │
│   Developer education              Audit trail                  │
│                                                                 │
│   ✓ Catches 80% of issues          ✓ Catches remaining 20%     │
│   ✓ Immediate feedback             ✓ Enforces before merge     │
│   ✗ Can be bypassed                ✗ Delayed feedback          │
│                                                                 │
│                Together: 100% enforcement                       │
└─────────────────────────────────────────────────────────────────┘
```

### Why GitHub Actions?

| Benefit | Description |
|---------|-------------|
| **Mandatory** | Cannot be bypassed like IDE checks |
| **Automated** | Runs on every push and PR |
| **Documented** | Creates audit trail |
| **Integrated** | Native GitHub Security integration |
| **Configurable** | Fail on errors, warnings, or both |

---

## WHAT: Action Capabilities (10 min)

### Available Inputs

| Input | Default | Description |
|-------|---------|-------------|
| `directory` | `.` | Directory to scan |
| `governance-lock` | `governance.lock` | Path to policy lock |
| `check-policy` | `true` | Run policy compliance check |
| `fail-on-violations` | `true` | Fail build on policy violations |
| `fail-on-warnings` | `false` | Fail build on warnings too |
| `fail-on-high-risk` | `true` | Fail if high-risk detected |
| `fail-on-unregistered` | `false` | Fail if unregistered AI found |
| `validate-cards` | `true` | Validate asset cards |
| `upload-sarif` | `true` | Upload to GitHub Security |
| `create-pr-comment` | `true` | Comment on PRs |

### Available Outputs

| Output | Description |
|--------|-------------|
| `detections-count` | Number of AI frameworks detected |
| `high-confidence-count` | High-confidence detections |
| `risk-level` | Highest risk level found |
| `cards-valid` | Whether asset cards are valid |
| `cards-count` | Number of asset cards |
| `scan-results` | Full results as JSON |
| `governance-lock-valid` | Policy lock status |
| `policy-violations` | Number of violations |
| `policy-errors` | Blocking errors count |
| `policy-warnings` | Non-blocking warnings |
| `policy-passed` | Whether policy check passed |
| `sarif-path` | Path to SARIF report |

---

## HOW: Implementation Guide (25 min)

### Step 1: Basic Workflow

Create `.github/workflows/aigrc.yml`:

```yaml
name: AI Governance Check

on:
  push:
    branches: [main, master]
  pull_request:
    branches: [main, master]

jobs:
  governance:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: AIGRC Governance Check
        uses: aigrc/github-action@v1
```

This runs with all defaults:
- Scans entire repository
- Checks policy compliance
- Validates asset cards
- Fails on violations
- Uploads SARIF report
- Comments on PRs

### Step 2: Customized Workflow

```yaml
name: AI Governance Check

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

permissions:
  contents: read
  security-events: write  # For SARIF upload
  pull-requests: write    # For PR comments

jobs:
  governance:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: AIGRC Governance Check
        id: aigrc
        uses: aigrc/github-action@v1
        with:
          directory: "./src"
          governance-lock: "governance.lock"
          check-policy: true
          fail-on-violations: true
          fail-on-warnings: false
          fail-on-high-risk: true
          fail-on-unregistered: false
          validate-cards: true
          upload-sarif: true
          create-pr-comment: true
          github-token: ${{ secrets.GITHUB_TOKEN }}

      - name: Print Results
        run: |
          echo "Detections: ${{ steps.aigrc.outputs.detections-count }}"
          echo "Risk Level: ${{ steps.aigrc.outputs.risk-level }}"
          echo "Policy Passed: ${{ steps.aigrc.outputs.policy-passed }}"
```

### Step 3: Strict Enforcement

For maximum enforcement:

```yaml
- name: AIGRC Strict Check
  uses: aigrc/github-action@v1
  with:
    fail-on-violations: true
    fail-on-warnings: true
    fail-on-high-risk: true
    fail-on-unregistered: true
    validate-cards: true
```

### Step 4: Lenient (Audit Mode)

For gradual adoption:

```yaml
- name: AIGRC Audit
  uses: aigrc/github-action@v1
  with:
    fail-on-violations: false
    fail-on-warnings: false
    fail-on-high-risk: false
    fail-on-unregistered: false
    create-pr-comment: true  # Still inform developers
```

### Step 5: SARIF Integration

To see results in GitHub Security tab:

```yaml
- name: AIGRC Check
  uses: aigrc/github-action@v1
  with:
    upload-sarif: true

# SARIF is automatically uploaded
# View at: Repository → Security → Code scanning alerts
```

**What You'll See:**

```
Security → Code scanning alerts

┌─────────────────────────────────────────────────────────────────┐
│ AIGRC Supply Chain Firewall                                     │
├─────────────────────────────────────────────────────────────────┤
│ ● 2 alerts                                                      │
│                                                                 │
│ ⚠️ unapproved_vendor                                           │
│    Vendor 'cohere' not in allowed_vendors                       │
│    src/ai/embeddings.ts:5                                       │
│                                                                 │
│ ⚠️ blocked_model                                               │
│    Model 'gpt-3.5-turbo' is blocked                            │
│    src/ai/chat.ts:12                                           │
└─────────────────────────────────────────────────────────────────┘
```

### Step 6: PR Comments

When `create-pr-comment: true`:

```markdown
## AIGRC Governance Report

### Summary
- **Detections:** 5 AI/ML frameworks found
- **Registered:** 3 assets
- **Coverage:** 60%
- **Policy Status:** ⚠️ 2 violations

### Violations
| Type | Location | Severity |
|------|----------|----------|
| unapproved_vendor | src/ai/embeddings.ts:5 | Error |
| blocked_model | src/ai/chat.ts:12 | Warning |

### Recommendations
1. Replace `cohere` with an approved vendor (openai, anthropic)
2. Update `gpt-3.5-turbo` to `gpt-4`

---
*AIGRC GitHub Action v1.0.0*
```

### Step 7: Conditional Workflows

Run different checks based on conditions:

```yaml
jobs:
  quick-check:
    if: github.event_name == 'push'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: aigrc/github-action@v1
        with:
          fail-on-violations: false  # Quick feedback

  full-check:
    if: github.event_name == 'pull_request'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: aigrc/github-action@v1
        with:
          fail-on-violations: true   # Block merge
          fail-on-warnings: true
```

### Step 8: Monorepo Configuration

For monorepos with multiple AI projects:

```yaml
jobs:
  governance:
    strategy:
      matrix:
        project: [frontend-ai, backend-ml, data-pipeline]
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: aigrc/github-action@v1
        with:
          directory: ./projects/${{ matrix.project }}
```

### Step 9: Scheduled Audits

Run periodic compliance audits:

```yaml
name: Weekly Governance Audit

on:
  schedule:
    - cron: '0 9 * * 1'  # Every Monday at 9 AM

jobs:
  audit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: AIGRC Audit
        id: audit
        uses: aigrc/github-action@v1
        with:
          fail-on-violations: false

      - name: Create Issue if Violations
        if: steps.audit.outputs.policy-violations > 0
        uses: actions/github-script@v7
        with:
          script: |
            github.rest.issues.create({
              owner: context.repo.owner,
              repo: context.repo.repo,
              title: 'Weekly Governance Audit: Violations Found',
              body: `Found ${${{ steps.audit.outputs.policy-violations }}} policy violations.`
            })
```

---

## Practice Lab (15 min)

### Exercise 1: Basic Setup

1. Create `.github/workflows/aigrc.yml` with basic config
2. Push to repository
3. Open a PR
4. Observe the check status

### Exercise 2: Trigger a Failure

1. Add a governance.lock with restricted vendors
2. Add code that violates the policy
3. Push and observe failure
4. Fix and verify success

### Exercise 3: SARIF Integration

1. Enable SARIF upload
2. Push a violation
3. Navigate to Security tab
4. View the code scanning alert

---

## Knowledge Check

1. **The action fails by default on:**
   - a) Any detection
   - b) Policy violations ✓
   - c) Warnings only
   - d) Nothing

2. **SARIF reports appear in:**
   - a) PR comments only
   - b) Actions logs only
   - c) GitHub Security tab ✓
   - d) Email notifications

3. **To block PRs with unregistered AI:**
   - a) Set `fail-on-violations: true`
   - b) Set `fail-on-unregistered: true` ✓
   - c) Set `validate-cards: true`
   - d) Set `check-policy: true`

4. **Action outputs can be used to:**
   - a) Modify source code
   - b) Create issues or custom logic ✓
   - c) Change action inputs
   - d) Skip other jobs

---

## Workflow Templates

### Minimal
```yaml
uses: aigrc/github-action@v1
```

### Recommended
```yaml
uses: aigrc/github-action@v1
with:
  fail-on-violations: true
  upload-sarif: true
  create-pr-comment: true
```

### Strict
```yaml
uses: aigrc/github-action@v1
with:
  fail-on-violations: true
  fail-on-warnings: true
  fail-on-high-risk: true
  fail-on-unregistered: true
```

### Audit-Only
```yaml
uses: aigrc/github-action@v1
with:
  fail-on-violations: false
  create-pr-comment: true
```

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| SARIF not appearing | Check `security-events: write` permission |
| PR comment missing | Check `pull-requests: write` permission |
| Action not running | Check workflow triggers |
| False positives | Add to `.aigrcignore` |

---

## Next Steps

Congratulations! You've completed Level 2: Core Skills.

**Continue to:**
- [Level 3: Advanced](../level-3-advanced/) - MCP, Multi-Jurisdiction, I2E
- [Level 4: Specialization](../level-4-specialization/) - Role-specific tracks

---

*Module 2.3 - AIGRC Training Program v1.0*
