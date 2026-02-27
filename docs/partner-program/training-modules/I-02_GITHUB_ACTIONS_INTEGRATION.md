# Module I-02: GitHub Actions Integration

## Complete CI/CD Setup for Automated AI Governance

**Module ID:** I-02
**Tier:** Integration
**Duration:** 4-5 hours
**Difficulty:** Intermediate
**Prerequisites:** Modules P-01, P-02, C-01, C-03 completed; GitHub experience
**Last Updated:** 2026-02-16

---

## 1. Module Overview

### 1.1 Purpose & Business Value

Integrating AIGRC with GitHub Actions enables:

- **Automated Governance** - Every PR/commit checked for compliance
- **Shift-Left Security** - Catch issues before they reach production
- **Developer Experience** - Immediate feedback in familiar workflows
- **Audit Trails** - Immutable CI/CD logs for compliance evidence
- **Policy Enforcement** - Block merges that violate governance policies

**Why This Matters for Partners:**
- CI/CD integration is essential for enterprise customers
- Automation reduces manual governance overhead
- Demonstrates ROI through developer productivity
- Provides ongoing value beyond initial implementation

### 1.2 Learning Outcomes

By the end of this module, you will be able to:

1. Configure AIGRC GitHub Actions in customer repositories
2. Set up governance gates for pull requests
3. Create custom workflows for different scenarios
4. Troubleshoot common CI/CD issues
5. Optimize workflow performance
6. Integrate with AIGOS Control Plane

---

## 2. GitHub Actions Architecture

### 2.1 How AIGRC Actions Work

```
                    AIGRC GITHUB ACTIONS FLOW
═══════════════════════════════════════════════════════════════════════════════

┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                              │
│  DEVELOPER                                                                  │
│  ═════════                                                                  │
│                                                                              │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐                     │
│  │   Write     │───►│    Push     │───►│  Open PR    │                     │
│  │    Code     │    │   Commit    │    │             │                     │
│  └─────────────┘    └─────────────┘    └──────┬──────┘                     │
│                                               │                             │
└───────────────────────────────────────────────┼─────────────────────────────┘
                                                │
                                                ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                            GITHUB                                            │
│                                                                              │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │                       GITHUB ACTIONS RUNNER                           │  │
│  │                                                                        │  │
│  │  TRIGGER                                                              │  │
│  │  ═══════                                                              │  │
│  │  on: pull_request, push, schedule                                     │  │
│  │         │                                                              │  │
│  │         ▼                                                              │  │
│  │  ┌─────────────────────────────────────────────────────────────────┐  │  │
│  │  │                        AIGRC WORKFLOW                           │  │  │
│  │  │                                                                  │  │  │
│  │  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐        │  │  │
│  │  │  │ Checkout │─►│   Scan   │─►│  Check   │─►│  Report  │        │  │  │
│  │  │  │   Code   │  │  Assets  │  │Compliance│  │ Results  │        │  │  │
│  │  │  └──────────┘  └──────────┘  └──────────┘  └──────────┘        │  │  │
│  │  │                                    │                             │  │  │
│  │  │                                    ▼                             │  │  │
│  │  │                            ┌──────────────┐                      │  │  │
│  │  │                            │  Pass/Fail   │                      │  │  │
│  │  │                            │   Decision   │                      │  │  │
│  │  │                            └──────────────┘                      │  │  │
│  │  │                                                                  │  │  │
│  │  └─────────────────────────────────────────────────────────────────┘  │  │
│  │                              │                                         │  │
│  └──────────────────────────────┼─────────────────────────────────────────┘  │
│                                 │                                            │
│                                 ▼                                            │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │                         PR STATUS CHECK                               │  │
│  │                                                                        │  │
│  │   ✓ All checks passed              OR        ✗ Checks failed         │  │
│  │   → Ready to merge                           → Blocked from merge     │  │
│  │                                                                        │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                       AIGOS CONTROL PLANE (Optional)                        │
│                                                                              │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐                     │
│  │   Receive   │───►│   Update    │───►│   Generate  │                     │
│  │   Results   │    │  Dashboard  │    │   Reports   │                     │
│  └─────────────┘    └─────────────┘    └─────────────┘                     │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 2.2 Available Actions

| Action | Purpose | Typical Trigger |
|--------|---------|-----------------|
| `aigrc/scan-action` | Discover AI assets | push, pull_request |
| `aigrc/check-action` | Run compliance checks | pull_request |
| `aigrc/report-action` | Generate reports | schedule, workflow_dispatch |
| `aigrc/certify-action` | Request CGA certification | release |
| `aigrc/sync-action` | Sync with Control Plane | push (main) |

### 2.3 Workflow Types

```
                        WORKFLOW PATTERNS
═══════════════════════════════════════════════════════════════════════════════

PATTERN 1: PR GATE (Most Common)
─────────────────────────────────────────────────────────────────────────────

  Trigger: pull_request
  Purpose: Block non-compliant PRs from merging
  Checks:
    • Asset Cards valid
    • No HIGH risk assets without documentation
    • Compliance score above threshold

  ┌─────┐  ┌─────────────────┐  ┌─────────────────┐
  │ PR  │─►│ Governance Gate │─►│ Merge Allowed?  │
  │     │  │                 │  │                 │
  └─────┘  │  ✓ Pass → Allow │  │  ✓ Yes / ✗ No  │
           │  ✗ Fail → Block │  │                 │
           └─────────────────┘  └─────────────────┘


PATTERN 2: CONTINUOUS MONITORING
─────────────────────────────────────────────────────────────────────────────

  Trigger: push (to main/master)
  Purpose: Update governance status on every change
  Checks:
    • Full scan
    • Sync to Control Plane
    • Generate Golden Thread

  ┌──────┐  ┌─────────────────┐  ┌─────────────────┐
  │ Push │─►│  Full Scan &    │─►│  Sync to        │
  │ main │  │  Check          │  │  Control Plane  │
  └──────┘  └─────────────────┘  └─────────────────┘


PATTERN 3: SCHEDULED AUDIT
─────────────────────────────────────────────────────────────────────────────

  Trigger: schedule (cron)
  Purpose: Regular compliance reports
  Output:
    • Compliance report
    • Gap analysis
    • Trend data

  ┌─────────┐  ┌─────────────────┐  ┌─────────────────┐
  │ Daily   │─►│  Generate       │─►│  Upload to      │
  │ 2:00 AM │  │  Reports        │  │  Artifacts      │
  └─────────┘  └─────────────────┘  └─────────────────┘


PATTERN 4: RELEASE CERTIFICATION
─────────────────────────────────────────────────────────────────────────────

  Trigger: release
  Purpose: CGA certification for releases
  Checks:
    • All requirements met
    • Request certificate
    • Attach to release

  ┌─────────┐  ┌─────────────────┐  ┌─────────────────┐
  │ Release │─►│  Certify        │─►│  Attach Cert    │
  │ Created │  │  CGA Level      │  │  to Release     │
  └─────────┘  └─────────────────┘  └─────────────────┘
```

---

## 3. Quick Start Setup

### 3.1 Minimum Viable Workflow

Create this file in your repository:

```yaml
# .github/workflows/aigrc.yml

name: AI Governance Check

on:
  pull_request:
    branches: [main, master]
  push:
    branches: [main, master]

jobs:
  governance:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install AIGRC CLI
        run: npm install -g @aigrc/cli

      - name: Run Governance Check
        run: aigrc check --ci --fail-on high
```

### 3.2 Full Featured Workflow

```yaml
# .github/workflows/aigrc-full.yml

name: AI Governance

on:
  pull_request:
    branches: [main, master, develop]
    types: [opened, synchronize, reopened]
  push:
    branches: [main, master]
  schedule:
    # Daily at 2 AM UTC
    - cron: '0 2 * * *'
  workflow_dispatch:
    inputs:
      report_type:
        description: 'Report type to generate'
        required: false
        default: 'compliance'
        type: choice
        options:
          - compliance
          - inventory
          - executive
          - gap

# Required permissions
permissions:
  contents: read
  pull-requests: write
  issues: read
  checks: write

# Environment variables
env:
  AIGRC_LOG_LEVEL: info
  NODE_VERSION: '20'

jobs:
  # ═══════════════════════════════════════════════════════════════════════════
  # JOB 1: SCAN - Discover AI assets
  # ═══════════════════════════════════════════════════════════════════════════
  scan:
    name: Scan for AI Assets
    runs-on: ubuntu-latest
    outputs:
      assets_found: ${{ steps.scan.outputs.assets_found }}
      high_risk_count: ${{ steps.scan.outputs.high_risk_count }}

    steps:
      - name: Checkout code
        uses: actions/checkout@v4
        with:
          fetch-depth: 0  # Full history for better analysis

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'

      - name: Install AIGRC CLI
        run: npm install -g @aigrc/cli

      - name: Run AI Asset Scan
        id: scan
        run: |
          # Run scan and capture output
          aigrc scan --format json --output scan-results.json

          # Extract metrics for job outputs
          ASSETS_FOUND=$(jq '.summary.total_assets' scan-results.json)
          HIGH_RISK=$(jq '.summary.by_risk.HIGH // 0' scan-results.json)

          echo "assets_found=$ASSETS_FOUND" >> $GITHUB_OUTPUT
          echo "high_risk_count=$HIGH_RISK" >> $GITHUB_OUTPUT

          # Display summary
          echo "## AI Asset Scan Results" >> $GITHUB_STEP_SUMMARY
          echo "" >> $GITHUB_STEP_SUMMARY
          echo "| Metric | Value |" >> $GITHUB_STEP_SUMMARY
          echo "|--------|-------|" >> $GITHUB_STEP_SUMMARY
          echo "| Total Assets | $ASSETS_FOUND |" >> $GITHUB_STEP_SUMMARY
          echo "| High Risk | $HIGH_RISK |" >> $GITHUB_STEP_SUMMARY

      - name: Upload scan results
        uses: actions/upload-artifact@v4
        with:
          name: scan-results
          path: scan-results.json
          retention-days: 30

  # ═══════════════════════════════════════════════════════════════════════════
  # JOB 2: VALIDATE - Validate Asset Cards
  # ═══════════════════════════════════════════════════════════════════════════
  validate:
    name: Validate Asset Cards
    runs-on: ubuntu-latest
    needs: scan
    if: needs.scan.outputs.assets_found > 0

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}

      - name: Install AIGRC CLI
        run: npm install -g @aigrc/cli

      - name: Validate all Asset Cards
        id: validate
        run: |
          # Run validation
          if ! aigrc asset-card validate --all --format json > validation.json 2>&1; then
            echo "validation_failed=true" >> $GITHUB_OUTPUT
            echo "## Asset Card Validation Failed" >> $GITHUB_STEP_SUMMARY
            echo "" >> $GITHUB_STEP_SUMMARY
            echo '```json' >> $GITHUB_STEP_SUMMARY
            cat validation.json >> $GITHUB_STEP_SUMMARY
            echo '```' >> $GITHUB_STEP_SUMMARY
            exit 1
          fi

          echo "## Asset Card Validation Passed" >> $GITHUB_STEP_SUMMARY

      - name: Upload validation results
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: validation-results
          path: validation.json
          retention-days: 30

  # ═══════════════════════════════════════════════════════════════════════════
  # JOB 3: CHECK - Run compliance checks
  # ═══════════════════════════════════════════════════════════════════════════
  compliance-check:
    name: Compliance Check
    runs-on: ubuntu-latest
    needs: [scan, validate]
    if: always() && needs.scan.result == 'success'

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}

      - name: Install AIGRC CLI
        run: npm install -g @aigrc/cli

      - name: Run compliance check
        id: check
        run: |
          # Run compliance check
          aigrc check --ci --format json --output compliance.json || true

          # Extract score
          SCORE=$(jq '.summary.score // 0' compliance.json)
          PASSED=$(jq '.summary.passed // 0' compliance.json)
          FAILED=$(jq '.summary.failed // 0' compliance.json)

          echo "score=$SCORE" >> $GITHUB_OUTPUT

          # Summary
          echo "## Compliance Check Results" >> $GITHUB_STEP_SUMMARY
          echo "" >> $GITHUB_STEP_SUMMARY
          echo "**Score: $SCORE/100**" >> $GITHUB_STEP_SUMMARY
          echo "" >> $GITHUB_STEP_SUMMARY
          echo "| Status | Count |" >> $GITHUB_STEP_SUMMARY
          echo "|--------|-------|" >> $GITHUB_STEP_SUMMARY
          echo "| Passed | $PASSED |" >> $GITHUB_STEP_SUMMARY
          echo "| Failed | $FAILED |" >> $GITHUB_STEP_SUMMARY

          # Fail if score below threshold
          if [ "$SCORE" -lt 70 ]; then
            echo "::error::Compliance score ($SCORE) is below threshold (70)"
            exit 1
          fi

      - name: Generate SARIF report
        run: |
          aigrc check --format sarif --output aigrc.sarif || true

      - name: Upload SARIF to GitHub Security
        uses: github/codeql-action/upload-sarif@v3
        if: always()
        with:
          sarif_file: aigrc.sarif
          category: aigrc

      - name: Upload compliance results
        uses: actions/upload-artifact@v4
        with:
          name: compliance-results
          path: compliance.json
          retention-days: 30

  # ═══════════════════════════════════════════════════════════════════════════
  # JOB 4: COMMENT - Post PR comment with results
  # ═══════════════════════════════════════════════════════════════════════════
  pr-comment:
    name: Post PR Comment
    runs-on: ubuntu-latest
    needs: [scan, validate, compliance-check]
    if: github.event_name == 'pull_request' && always()

    steps:
      - name: Download all artifacts
        uses: actions/download-artifact@v4

      - name: Generate PR comment
        id: comment
        run: |
          # Build comment body
          cat << 'EOF' > comment.md
          ## AI Governance Report

          ### Scan Results
          EOF

          if [ -f "scan-results/scan-results.json" ]; then
            ASSETS=$(jq '.summary.total_assets' scan-results/scan-results.json)
            HIGH=$(jq '.summary.by_risk.HIGH // 0' scan-results/scan-results.json)
            echo "- **Total AI Assets:** $ASSETS" >> comment.md
            echo "- **High Risk Assets:** $HIGH" >> comment.md
          fi

          echo "" >> comment.md
          echo "### Compliance Status" >> comment.md

          if [ -f "compliance-results/compliance.json" ]; then
            SCORE=$(jq '.summary.score // 0' compliance-results/compliance.json)
            if [ "$SCORE" -ge 90 ]; then
              echo "**Score: $SCORE/100** :white_check_mark:" >> comment.md
            elif [ "$SCORE" -ge 70 ]; then
              echo "**Score: $SCORE/100** :warning:" >> comment.md
            else
              echo "**Score: $SCORE/100** :x:" >> comment.md
            fi
          fi

          echo "" >> comment.md
          echo "---" >> comment.md
          echo "*Generated by AIGRC GitHub Action*" >> comment.md

      - name: Post comment to PR
        uses: marocchino/sticky-pull-request-comment@v2
        with:
          path: comment.md
          header: aigrc-report

  # ═══════════════════════════════════════════════════════════════════════════
  # JOB 5: SYNC - Sync to Control Plane (main branch only)
  # ═══════════════════════════════════════════════════════════════════════════
  sync-control-plane:
    name: Sync to Control Plane
    runs-on: ubuntu-latest
    needs: [scan, compliance-check]
    if: github.ref == 'refs/heads/main' && github.event_name == 'push'

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}

      - name: Install AIGRC CLI
        run: npm install -g @aigrc/cli

      - name: Download artifacts
        uses: actions/download-artifact@v4

      - name: Sync to Control Plane
        env:
          AIGRC_API_KEY: ${{ secrets.AIGRC_API_KEY }}
          AIGRC_ENDPOINT: ${{ secrets.AIGRC_ENDPOINT }}
        run: |
          # Configure CLI
          aigrc config set endpoint "$AIGRC_ENDPOINT"

          # Sync scan results
          aigrc sync --input scan-results/scan-results.json

          echo "## Control Plane Sync Complete" >> $GITHUB_STEP_SUMMARY
          echo "" >> $GITHUB_STEP_SUMMARY
          echo "Results synced to: $AIGRC_ENDPOINT" >> $GITHUB_STEP_SUMMARY

  # ═══════════════════════════════════════════════════════════════════════════
  # JOB 6: REPORT - Generate reports (scheduled/manual only)
  # ═══════════════════════════════════════════════════════════════════════════
  generate-report:
    name: Generate Report
    runs-on: ubuntu-latest
    if: github.event_name == 'schedule' || github.event_name == 'workflow_dispatch'

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}

      - name: Install AIGRC CLI
        run: npm install -g @aigrc/cli

      - name: Generate compliance report
        run: |
          REPORT_TYPE="${{ github.event.inputs.report_type || 'compliance' }}"
          DATE=$(date +%Y%m%d)

          aigrc report $REPORT_TYPE \
            --format html \
            --output "report-${REPORT_TYPE}-${DATE}.html"

          aigrc report $REPORT_TYPE \
            --format json \
            --output "report-${REPORT_TYPE}-${DATE}.json"

      - name: Upload reports
        uses: actions/upload-artifact@v4
        with:
          name: governance-reports
          path: report-*
          retention-days: 90
```

---

## 4. Detailed Configuration

### 4.1 Secrets Configuration

Configure these secrets in your repository (Settings > Secrets and variables > Actions):

| Secret | Description | Required |
|--------|-------------|----------|
| `AIGRC_API_KEY` | Control Plane API key | For sync |
| `AIGRC_ENDPOINT` | Control Plane URL | For sync |
| `SLACK_WEBHOOK_URL` | Slack notifications | Optional |
| `TEAMS_WEBHOOK_URL` | Teams notifications | Optional |

**Setting up secrets:**

```bash
# Using GitHub CLI
gh secret set AIGRC_API_KEY --body "aig_xxx..."
gh secret set AIGRC_ENDPOINT --body "https://aigos.customer.com"
```

### 4.2 Branch Protection Rules

Configure branch protection to require AIGRC checks:

```
Repository Settings > Branches > Branch protection rules

Rule: main (or master)

[x] Require status checks to pass before merging
    [x] Require branches to be up to date before merging
    Status checks that are required:
      - Compliance Check
      - Validate Asset Cards

[x] Require conversation resolution before merging
[x] Do not allow bypassing the above settings
```

### 4.3 Policy Configuration

Create a policy file to control workflow behavior:

```yaml
# .aigrc/ci-policy.yaml
apiVersion: aigrc.io/v1
kind: CIPolicy

metadata:
  name: github-actions-policy

spec:
  # Minimum compliance score to pass
  complianceThreshold: 70

  # Fail workflow if these severities are found
  failOn:
    - critical
    - high

  # Required checks for PRs
  pullRequest:
    requireAssetCards: true
    requireValidSchema: true
    blockOnHighRisk: true
    blockOnMissingDocumentation: true

  # Checks for main branch
  mainBranch:
    syncToControlPlane: true
    generateGoldenThread: true
    enforceAllPolicies: true

  # Excluded paths (won't fail even if issues found)
  excludePaths:
    - "test/**"
    - "examples/**"
    - "docs/**"

  # Allow specific assets to be exempted
  exemptions:
    - assetName: legacy-model
      reason: "Scheduled for deprecation Q3 2026"
      expiresAt: "2026-09-30"
      approvedBy: "security@customer.com"
```

### 4.4 Workflow Customization

#### 4.4.1 Different Checks for Different Branches

```yaml
jobs:
  compliance-check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Determine check level
        id: check-level
        run: |
          if [[ "${{ github.base_ref }}" == "main" ]]; then
            echo "fail_on=high" >> $GITHUB_OUTPUT
            echo "threshold=80" >> $GITHUB_OUTPUT
          elif [[ "${{ github.base_ref }}" == "develop" ]]; then
            echo "fail_on=critical" >> $GITHUB_OUTPUT
            echo "threshold=60" >> $GITHUB_OUTPUT
          else
            echo "fail_on=critical" >> $GITHUB_OUTPUT
            echo "threshold=50" >> $GITHUB_OUTPUT
          fi

      - name: Run compliance check
        run: |
          aigrc check --ci \
            --fail-on ${{ steps.check-level.outputs.fail_on }} \
            --threshold ${{ steps.check-level.outputs.threshold }}
```

#### 4.4.2 Path-Based Triggers

```yaml
on:
  pull_request:
    paths:
      # Only trigger on AI-related changes
      - 'src/ml/**'
      - 'src/ai/**'
      - 'models/**'
      - '**/*.asset-card.yaml'
      - 'policies/**'
    paths-ignore:
      - 'docs/**'
      - '*.md'
      - '.gitignore'
```

#### 4.4.3 Matrix Strategy for Multiple Frameworks

```yaml
jobs:
  compliance-check:
    strategy:
      matrix:
        framework: [eu-ai-act, nist-ai-rmf, iso-42001]
      fail-fast: false

    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Check compliance for ${{ matrix.framework }}
        run: |
          aigrc check --framework ${{ matrix.framework }} \
            --format json \
            --output "compliance-${{ matrix.framework }}.json"

      - name: Upload results
        uses: actions/upload-artifact@v4
        with:
          name: compliance-${{ matrix.framework }}
          path: compliance-${{ matrix.framework }}.json
```

---

## 5. Advanced Workflows

### 5.1 Release Certification Workflow

```yaml
# .github/workflows/release-certification.yml

name: Release Certification

on:
  release:
    types: [created]

jobs:
  certify:
    name: CGA Certification
    runs-on: ubuntu-latest

    steps:
      - name: Checkout code
        uses: actions/checkout@v4
        with:
          ref: ${{ github.event.release.tag_name }}

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install AIGRC CLI
        run: npm install -g @aigrc/cli

      - name: Run full compliance check
        run: |
          aigrc check --ci --fail-on medium

      - name: Request CGA certification
        id: certify
        env:
          AIGRC_API_KEY: ${{ secrets.AIGRC_API_KEY }}
          AIGRC_ENDPOINT: ${{ secrets.AIGRC_ENDPOINT }}
        run: |
          # Request certification
          CERT_RESULT=$(aigrc certify --level SILVER --format json)

          # Extract certificate details
          CERT_ID=$(echo "$CERT_RESULT" | jq -r '.certificateId')
          CERT_LEVEL=$(echo "$CERT_RESULT" | jq -r '.level')
          CERT_URL=$(echo "$CERT_RESULT" | jq -r '.verificationUrl')

          echo "cert_id=$CERT_ID" >> $GITHUB_OUTPUT
          echo "cert_level=$CERT_LEVEL" >> $GITHUB_OUTPUT
          echo "cert_url=$CERT_URL" >> $GITHUB_OUTPUT

          # Save certificate
          echo "$CERT_RESULT" > cga-certificate.json

      - name: Update release with certificate
        uses: softprops/action-gh-release@v1
        with:
          files: cga-certificate.json
          body: |
            ## CGA Certification

            This release has been certified as **${{ steps.certify.outputs.cert_level }}** compliant.

            - **Certificate ID:** `${{ steps.certify.outputs.cert_id }}`
            - **Verification:** ${{ steps.certify.outputs.cert_url }}

            ---
            ${{ github.event.release.body }}
```

### 5.2 Drift Detection Workflow

```yaml
# .github/workflows/drift-detection.yml

name: Governance Drift Detection

on:
  schedule:
    # Run every 6 hours
    - cron: '0 */6 * * *'

jobs:
  detect-drift:
    name: Detect Governance Drift
    runs-on: ubuntu-latest

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install AIGRC CLI
        run: npm install -g @aigrc/cli

      - name: Download previous scan
        uses: dawidd6/action-download-artifact@v3
        with:
          name: scan-results
          workflow: aigrc-full.yml
          if_no_artifact_found: ignore

      - name: Run new scan
        run: aigrc scan --format json --output current-scan.json

      - name: Compare scans
        id: compare
        run: |
          if [ -f "scan-results.json" ]; then
            # Compare asset counts
            PREV_COUNT=$(jq '.summary.total_assets' scan-results.json)
            CURR_COUNT=$(jq '.summary.total_assets' current-scan.json)

            # Check for new HIGH risk assets
            PREV_HIGH=$(jq '.summary.by_risk.HIGH // 0' scan-results.json)
            CURR_HIGH=$(jq '.summary.by_risk.HIGH // 0' current-scan.json)

            if [ "$CURR_HIGH" -gt "$PREV_HIGH" ]; then
              echo "new_high_risk=true" >> $GITHUB_OUTPUT
              echo "high_risk_delta=$((CURR_HIGH - PREV_HIGH))" >> $GITHUB_OUTPUT
            fi

            if [ "$CURR_COUNT" -ne "$PREV_COUNT" ]; then
              echo "asset_count_changed=true" >> $GITHUB_OUTPUT
            fi
          fi

      - name: Alert on new HIGH risk
        if: steps.compare.outputs.new_high_risk == 'true'
        uses: slackapi/slack-github-action@v1
        with:
          channel-id: ${{ secrets.SLACK_CHANNEL_ID }}
          payload: |
            {
              "text": ":warning: New HIGH risk AI assets detected!",
              "blocks": [
                {
                  "type": "section",
                  "text": {
                    "type": "mrkdwn",
                    "text": "*Governance Alert*\n\n${{ steps.compare.outputs.high_risk_delta }} new HIGH risk AI assets detected in `${{ github.repository }}`."
                  }
                }
              ]
            }
        env:
          SLACK_BOT_TOKEN: ${{ secrets.SLACK_BOT_TOKEN }}

      - name: Create issue for drift
        if: steps.compare.outputs.new_high_risk == 'true'
        uses: actions/github-script@v7
        with:
          script: |
            await github.rest.issues.create({
              owner: context.repo.owner,
              repo: context.repo.repo,
              title: '🚨 New HIGH Risk AI Assets Detected',
              body: `## Governance Drift Alert

            Scheduled scan detected new HIGH risk AI assets that require documentation.

            **Delta:** ${{ steps.compare.outputs.high_risk_delta }} new HIGH risk assets

            ### Required Actions

            1. Review the new assets identified in the scan
            2. Create Asset Cards for each HIGH risk asset
            3. Complete required assessments
            4. Update governance documentation

            ### Details

            See the [workflow run](${{ github.server_url }}/${{ github.repository }}/actions/runs/${{ github.run_id }}) for full scan results.
            `,
              labels: ['governance', 'high-priority', 'automated']
            })
```

### 5.3 Multi-Repository Governance

```yaml
# .github/workflows/org-governance.yml
# Run this in a central governance repository

name: Organization Governance Scan

on:
  schedule:
    - cron: '0 3 * * *'  # Daily at 3 AM
  workflow_dispatch:

jobs:
  scan-repos:
    name: Scan Repositories
    runs-on: ubuntu-latest
    strategy:
      matrix:
        repo:
          - org/ml-service-1
          - org/ml-service-2
          - org/ai-platform
      fail-fast: false

    steps:
      - name: Checkout target repo
        uses: actions/checkout@v4
        with:
          repository: ${{ matrix.repo }}
          token: ${{ secrets.ORG_PAT }}

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install AIGRC CLI
        run: npm install -g @aigrc/cli

      - name: Run scan
        run: |
          REPO_NAME=$(echo "${{ matrix.repo }}" | tr '/' '-')
          aigrc scan --format json --output "scan-${REPO_NAME}.json"
          aigrc check --format json --output "compliance-${REPO_NAME}.json"

      - name: Upload results
        uses: actions/upload-artifact@v4
        with:
          name: results-${{ strategy.job-index }}
          path: "*.json"

  aggregate-results:
    name: Aggregate Results
    needs: scan-repos
    runs-on: ubuntu-latest

    steps:
      - name: Download all results
        uses: actions/download-artifact@v4
        with:
          pattern: results-*
          merge-multiple: true

      - name: Generate organization report
        run: |
          # Aggregate all scan results
          echo "# Organization AI Governance Report" > org-report.md
          echo "" >> org-report.md
          echo "Generated: $(date)" >> org-report.md
          echo "" >> org-report.md

          for scan_file in scan-*.json; do
            REPO=$(echo "$scan_file" | sed 's/scan-//' | sed 's/.json//')
            ASSETS=$(jq '.summary.total_assets' "$scan_file")
            HIGH=$(jq '.summary.by_risk.HIGH // 0' "$scan_file")

            echo "## $REPO" >> org-report.md
            echo "- Assets: $ASSETS" >> org-report.md
            echo "- High Risk: $HIGH" >> org-report.md
            echo "" >> org-report.md
          done

      - name: Upload organization report
        uses: actions/upload-artifact@v4
        with:
          name: org-governance-report
          path: org-report.md
```

---

## 6. Notifications & Integrations

### 6.1 Slack Notifications

```yaml
- name: Send Slack notification
  if: failure()
  uses: slackapi/slack-github-action@v1
  with:
    channel-id: ${{ secrets.SLACK_CHANNEL_ID }}
    payload: |
      {
        "text": "AI Governance Check Failed",
        "blocks": [
          {
            "type": "header",
            "text": {
              "type": "plain_text",
              "text": ":x: AI Governance Check Failed"
            }
          },
          {
            "type": "section",
            "fields": [
              {
                "type": "mrkdwn",
                "text": "*Repository:*\n${{ github.repository }}"
              },
              {
                "type": "mrkdwn",
                "text": "*Branch:*\n${{ github.ref_name }}"
              },
              {
                "type": "mrkdwn",
                "text": "*PR:*\n#${{ github.event.pull_request.number }}"
              },
              {
                "type": "mrkdwn",
                "text": "*Author:*\n${{ github.actor }}"
              }
            ]
          },
          {
            "type": "actions",
            "elements": [
              {
                "type": "button",
                "text": {
                  "type": "plain_text",
                  "text": "View Workflow"
                },
                "url": "${{ github.server_url }}/${{ github.repository }}/actions/runs/${{ github.run_id }}"
              }
            ]
          }
        ]
      }
  env:
    SLACK_BOT_TOKEN: ${{ secrets.SLACK_BOT_TOKEN }}
```

### 6.2 Microsoft Teams Notifications

```yaml
- name: Send Teams notification
  if: failure()
  uses: jdcargile/ms-teams-notification@v1.4
  with:
    github-token: ${{ github.token }}
    ms-teams-webhook-uri: ${{ secrets.TEAMS_WEBHOOK_URL }}
    notification-summary: "AI Governance Check Failed"
    notification-color: "dc3545"
    timezone: America/New_York
```

### 6.3 Email Notifications

```yaml
- name: Send email notification
  if: failure()
  uses: dawidd6/action-send-mail@v3
  with:
    server_address: ${{ secrets.SMTP_SERVER }}
    server_port: 587
    username: ${{ secrets.SMTP_USER }}
    password: ${{ secrets.SMTP_PASSWORD }}
    subject: "AI Governance Check Failed - ${{ github.repository }}"
    to: governance-team@customer.com
    from: AIGRC Automation <noreply@customer.com>
    body: |
      AI Governance check failed for ${{ github.repository }}

      Branch: ${{ github.ref_name }}
      Commit: ${{ github.sha }}
      Author: ${{ github.actor }}

      View details: ${{ github.server_url }}/${{ github.repository }}/actions/runs/${{ github.run_id }}
```

---

## 7. Troubleshooting

### 7.1 Common Issues

| Issue | Symptoms | Solution |
|-------|----------|----------|
| **CLI not found** | `aigrc: command not found` | Ensure `npm install -g @aigrc/cli` runs before check |
| **No assets found** | Scan returns 0 assets | Check include/exclude patterns, verify code paths |
| **Authentication failed** | 401/403 errors on sync | Verify `AIGRC_API_KEY` secret is set correctly |
| **Workflow timeout** | Job exceeds time limit | Add caching, reduce scan scope, increase timeout |
| **SARIF upload failed** | CodeQL action errors | Verify SARIF file format, check permissions |

### 7.2 Debugging Workflows

```yaml
# Add debugging steps
- name: Debug - Show environment
  run: |
    echo "Event: ${{ github.event_name }}"
    echo "Ref: ${{ github.ref }}"
    echo "SHA: ${{ github.sha }}"
    env | grep GITHUB_ | sort

- name: Debug - Show file structure
  run: |
    echo "Repository structure:"
    find . -name "*.asset-card.yaml" -o -name ".aigrc*" | head -20

- name: Debug - Verbose scan
  run: |
    AIGRC_LOG_LEVEL=debug aigrc scan -v

- name: Debug - List artifacts
  run: |
    ls -la *.json 2>/dev/null || echo "No JSON files found"
```

### 7.3 Performance Optimization

```yaml
# Caching node_modules
- name: Cache node modules
  uses: actions/cache@v4
  with:
    path: ~/.npm
    key: ${{ runner.os }}-node-${{ hashFiles('**/package-lock.json') }}
    restore-keys: |
      ${{ runner.os }}-node-

# Caching AIGRC data
- name: Cache AIGRC
  uses: actions/cache@v4
  with:
    path: ~/.aigrc
    key: ${{ runner.os }}-aigrc-${{ hashFiles('**/*.asset-card.yaml') }}
    restore-keys: |
      ${{ runner.os }}-aigrc-

# Parallel jobs
jobs:
  scan:
    runs-on: ubuntu-latest
    # ...

  check:
    runs-on: ubuntu-latest
    needs: scan
    # ...

  # These run in parallel after check
  report:
    runs-on: ubuntu-latest
    needs: check
    # ...

  notify:
    runs-on: ubuntu-latest
    needs: check
    # ...
```

---

## 8. Hands-On Exercises

### Exercise I-02.1: Basic PR Gate Setup

**Objective:** Configure a basic governance gate for pull requests.

**Time:** 30 minutes

**Steps:**

1. Create a new branch in a test repository
2. Add the basic AIGRC workflow
3. Add a sample AI asset and Asset Card
4. Open a PR and observe the check
5. Configure branch protection to require the check

```bash
# Create test repository
mkdir aigrc-test && cd aigrc-test
git init

# Create sample AI code
cat > ml_model.py << 'EOF'
import torch
from transformers import pipeline

class SentimentAnalyzer:
    def __init__(self):
        self.model = pipeline("sentiment-analysis")
EOF

# Create Asset Card
cat > sentiment-analyzer.asset-card.yaml << 'EOF'
apiVersion: aigrc.io/v1
kind: AssetCard
metadata:
  name: sentiment-analyzer
  version: "1.0.0"
  description: Sentiment analysis using transformers
  status: draft
spec:
  classification:
    riskLevel: LIMITED
  technical:
    type: sentiment-analysis
  governance:
    ownership:
      technicalOwner:
        name: Developer
        email: dev@example.com
  contacts:
    primary:
      name: Developer
      email: dev@example.com
EOF

# Add workflow
mkdir -p .github/workflows
# (Copy the basic workflow from section 3.1)

# Commit and push
git add .
git commit -m "Add AIGRC governance workflow"
git push -u origin main
```

### Exercise I-02.2: Full Pipeline with Notifications

**Objective:** Implement a complete governance pipeline with Slack notifications.

**Time:** 45 minutes

**Prerequisites:**
- Slack workspace with incoming webhook configured
- Repository with write access

**Steps:**

1. Set up Slack webhook as repository secret
2. Add the full featured workflow
3. Configure notification steps
4. Test by introducing a compliance failure
5. Verify notification is received

### Exercise I-02.3: Multi-Framework Compliance

**Objective:** Run compliance checks against multiple regulatory frameworks.

**Time:** 30 minutes

**Steps:**

1. Configure matrix strategy for multiple frameworks
2. Run parallel compliance checks
3. Aggregate results
4. Generate comparison report

---

## 9. Knowledge Check

### Quiz: Module I-02

1. Which GitHub Actions trigger runs on every PR?
   - A) `on: push`
   - B) `on: pull_request`
   - C) `on: schedule`
   - D) `on: release`

2. What secret is required for Control Plane sync?
   - A) `GITHUB_TOKEN`
   - B) `AIGRC_API_KEY`
   - C) `NODE_AUTH_TOKEN`
   - D) `NPM_TOKEN`

3. Which format integrates with GitHub Security tab?
   - A) JSON
   - B) HTML
   - C) SARIF
   - D) XML

4. What does `--fail-on high` do?
   - A) Only runs on high-priority PRs
   - B) Fails if HIGH severity issues found
   - C) Enables high-performance mode
   - D) Raises priority of check

5. Which job type runs on a schedule?
   - A) `on: pull_request`
   - B) `on: push`
   - C) `on: schedule` with cron
   - D) `on: workflow_dispatch`

**Answers:** 1-B, 2-B, 3-C, 4-B, 5-C

---

## 10. Quick Reference

### Workflow Templates

```yaml
# Minimal PR gate
on: [pull_request]
jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm i -g @aigrc/cli && aigrc check --ci

# Full pipeline
on:
  pull_request:
  push:
    branches: [main]
  schedule:
    - cron: '0 2 * * *'
```

### CLI Commands for CI

```bash
# Scan with CI output
aigrc scan --ci --format json --output scan.json

# Check with threshold
aigrc check --ci --fail-on high --threshold 70

# Generate SARIF
aigrc check --format sarif --output results.sarif

# Sync to Control Plane
aigrc sync --input scan.json
```

### Useful GitHub Actions

| Action | Purpose |
|--------|---------|
| `actions/checkout@v4` | Clone repository |
| `actions/setup-node@v4` | Install Node.js |
| `actions/upload-artifact@v4` | Save artifacts |
| `actions/download-artifact@v4` | Retrieve artifacts |
| `github/codeql-action/upload-sarif@v3` | Security tab integration |
| `marocchino/sticky-pull-request-comment@v2` | PR comments |

---

*Module I-02 Complete. You have completed the Integration tier modules.*
