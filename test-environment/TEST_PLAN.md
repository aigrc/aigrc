# AIGRC CLI Test Plan

## Overview

This document provides a comprehensive test plan for the AIGRC CLI multi-jurisdiction compliance tools.

---

## 1. Environment Setup

### Prerequisites

- Node.js >= 18.0.0
- pnpm >= 8.0.0
- Git

### Setup Steps

```bash
# 1. Navigate to the aigrc directory
cd aigrc

# 2. Install dependencies
pnpm install

# 3. Build all packages
pnpm run build

# 4. Navigate to test environment
cd test-environment

# 5. Create config file for testing
cat > .aigrc.yaml << 'EOF'
profiles:
  - eu-ai-act
  - us-omb-m24
  - nist-ai-rmf
  - iso-42001
outputDir: .aigrc
stackProfiles: true
EOF

# 6. Verify CLI is available (use node directly on Windows)
node ../packages/cli/dist/aigrc.js --version
# Expected: 0.1.0

# Alternatively, run the setup script:
# Bash: ./setup.sh
# PowerShell: .\setup.ps1
```

### Test Assets

The `assets/` directory contains four test asset cards:

| Asset File                               | Risk Level   | Use Case                          |
| ---------------------------------------- | ------------ | --------------------------------- |
| `high-risk-agent.asset.yaml`             | High         | Autonomous customer support agent |
| `limited-risk-chatbot.asset.yaml`        | Limited      | FAQ chatbot                       |
| `minimal-risk-classifier.asset.yaml`     | Minimal      | Internal document classifier      |
| `unacceptable-risk-biometric.asset.yaml` | Unacceptable | Prohibited biometric system       |

---

## 2. Core Command Tests

### 2.1 Scan Command

Detects AI/ML frameworks in a codebase.

```bash
# Define CLI alias for convenience
alias aigrc="node ../packages/cli/dist/aigrc.js"

# Test 1: Scan current directory
aigrc scan .
# Expected: Lists detected frameworks, file types, and suggests risk factors

# Test 2: Scan with JSON output
aigrc scan . --output json
# Expected: JSON output with detections array

# Test 3: Scan specific path
aigrc scan ../packages
# Expected: Detects TypeScript-based AI code patterns
```

### 2.2 Init Command

Initializes AIGRC configuration.

```bash
# Test 1: Initialize in test directory
aigrc init
# Expected: Creates .aigrc.yaml and .aigrc/ directory

# Test 2: Initialize with specific profiles
aigrc init --profiles eu-ai-act us-omb-m24
# Expected: Creates config with specified profiles
```

### 2.3 Validate Command

Validates asset card YAML files.

```bash
# Test 1: Validate high-risk asset
aigrc validate assets/high-risk-agent.asset.yaml
# Expected: "Valid" with asset summary

# Test 2: Validate all assets in directory
aigrc validate assets/*.yaml
# Expected: Validation results for each file

# Test 3: Validate with verbose output
aigrc validate assets/high-risk-agent.asset.yaml --verbose
# Expected: Detailed schema validation output
```

### 2.4 Status Command

Shows governance status of assets.

```bash
# Test 1: Show status of single asset
aigrc status assets/high-risk-agent.asset.yaml
# Expected: Displays risk level, governance status, approvals

# Test 2: Show status with profiles
aigrc status assets/high-risk-agent.asset.yaml --profiles eu-ai-act
# Expected: Shows EU AI Act specific classification
```

### 2.5 Register Command

Registers new assets interactively.

```bash
# Test 1: Register new asset (interactive)
aigrc register
# Expected: Prompts for name, description, risk factors
# Follow prompts to create a new asset card

# Test 2: Register with output path
aigrc register --output assets/new-asset.yaml
# Expected: Creates asset at specified path
```

---

## 3. Multi-Jurisdiction Compliance Commands

### 3.1 Compliance Command

Manages compliance profiles.

```bash
# Test 1: List available profiles
aigrc compliance list
# Expected: Lists eu-ai-act, us-omb-m24, nist-ai-rmf, iso-42001

# Test 2: Show profile details
aigrc compliance show eu-ai-act
# Expected: Shows profile controls, artifact templates, risk levels

# Test 3: Show profile with verbose
aigrc compliance show eu-ai-act --verbose
# Expected: Full profile details including crosswalk mappings

# Test 4: Set active profiles
aigrc compliance set eu-ai-act nist-ai-rmf
# Expected: Updates .aigrc.yaml with specified profiles
```

### 3.2 Classify Command

Classifies assets against profiles.

```bash
# Test 1: Classify high-risk asset against EU AI Act
aigrc classify assets/high-risk-agent.asset.yaml --profiles eu-ai-act
# Expected: Risk level "HIGH", required controls listed

# Test 2: Classify against all profiles
aigrc classify assets/high-risk-agent.asset.yaml --all
# Expected: Shows risk level mapping for each profile

# Test 3: Classify and update asset card
aigrc classify assets/high-risk-agent.asset.yaml --all --update
# Expected: Updates asset card with jurisdiction classifications

# Test 4: Classify with JSON output
aigrc classify assets/limited-risk-chatbot.asset.yaml --profiles eu-ai-act --output json
# Expected: JSON with mapped risk level and requirements

# Test 5: Classify minimal risk asset
aigrc classify assets/minimal-risk-classifier.asset.yaml --all
# Expected: "MINIMAL" across most profiles, fewer requirements
```

### 3.3 Check Command

Checks compliance status.

```bash
# Test 1: Check high-risk asset against EU AI Act
aigrc check assets/high-risk-agent.asset.yaml --profiles eu-ai-act
# Expected: Control status table, compliance percentage, gaps

# Test 2: Check against multiple profiles
aigrc check assets/high-risk-agent.asset.yaml --profiles eu-ai-act us-omb-m24
# Expected: Separate status for each profile

# Test 3: Check with profile stacking
aigrc check assets/high-risk-agent.asset.yaml --profiles eu-ai-act us-omb-m24 --stack
# Expected: Combined "strictest wins" result

# Test 4: Check with verbose output
aigrc check assets/high-risk-agent.asset.yaml --profiles eu-ai-act --verbose
# Expected: Detailed control-by-control status

# Test 5: Check with JSON output
aigrc check assets/high-risk-agent.asset.yaml --profiles eu-ai-act --output json
# Expected: JSON with controls, gaps, percentage

# Test 6: Check limited-risk asset
aigrc check assets/limited-risk-chatbot.asset.yaml --profiles eu-ai-act
# Expected: Fewer required controls, higher compliance %
```

### 3.4 Generate Command

Generates compliance artifact templates.

```bash
# Test 1: Generate required artifacts for EU AI Act
aigrc generate assets/high-risk-agent.asset.yaml --profile eu-ai-act
# Expected: Creates risk-management-plan.md, technical-documentation.md

# Test 2: Generate specific template
aigrc generate assets/high-risk-agent.asset.yaml --profile eu-ai-act --template risk-management-plan
# Expected: Creates only risk-management-plan.md

# Test 3: Generate all artifacts
aigrc generate assets/high-risk-agent.asset.yaml --profile eu-ai-act --all
# Expected: Creates all EU AI Act templates

# Test 4: Generate with custom output directory
aigrc generate assets/high-risk-agent.asset.yaml --profile eu-ai-act --output-dir ./compliance-docs
# Expected: Creates artifacts in ./compliance-docs/eu-ai-act/

# Test 5: Generate with force overwrite
aigrc generate assets/high-risk-agent.asset.yaml --profile eu-ai-act --force
# Expected: Overwrites existing files

# Test 6: Generate for NIST AI RMF
aigrc generate assets/high-risk-agent.asset.yaml --profile nist-ai-rmf
# Expected: Creates NIST profile YAML and playbook
```

### 3.5 Report Command

Generates compliance reports.

```bash
# Test 1: Generate gap analysis report
aigrc report assets/high-risk-agent.asset.yaml --type gap
# Expected: Markdown report with gaps, severity, remediation steps

# Test 2: Generate crosswalk report
aigrc report assets/high-risk-agent.asset.yaml --type crosswalk
# Expected: Control mapping table across profiles

# Test 3: Generate audit report
aigrc report assets/high-risk-agent.asset.yaml --type audit
# Expected: Comprehensive audit-ready report

# Test 4: Generate report with output path
aigrc report assets/high-risk-agent.asset.yaml --type gap --output ./reports/gap-analysis.md
# Expected: Saves report to specified path

# Test 5: Generate report with specific profiles
aigrc report assets/high-risk-agent.asset.yaml --type gap --profiles eu-ai-act us-omb-m24
# Expected: Gap report for specified profiles only

# Test 6: Generate JSON report
aigrc report assets/high-risk-agent.asset.yaml --type gap --format json
# Expected: JSON format report
```

---

## 4. End-to-End Test Scenarios

### Scenario 1: New AI Project Onboarding

Goal: Register a new AI asset and establish baseline compliance.

```bash
# Step 1: Scan the codebase
aigrc scan .

# Step 2: Initialize AIGRC
aigrc init --profiles eu-ai-act us-omb-m24

# Step 3: Register the asset
aigrc register --output assets/my-new-agent.yaml

# Step 4: Validate the asset card
aigrc validate assets/my-new-agent.yaml

# Step 5: Classify against all profiles
aigrc classify assets/my-new-agent.yaml --all --update

# Step 6: Check initial compliance
aigrc check assets/my-new-agent.yaml --stack

# Step 7: Generate required artifacts
aigrc generate assets/my-new-agent.yaml --all

# Step 8: Generate gap report
aigrc report assets/my-new-agent.yaml --type gap --output gap-report.md
```

### Scenario 2: Multi-Jurisdiction Compliance Audit

Goal: Prepare an existing high-risk asset for regulatory audit.

```bash
# Step 1: Check compliance against all relevant profiles
aigrc check assets/high-risk-agent.asset.yaml \
  --profiles eu-ai-act us-omb-m24 nist-ai-rmf iso-42001 \
  --stack --verbose

# Step 2: Generate crosswalk report (shows control equivalencies)
aigrc report assets/high-risk-agent.asset.yaml \
  --type crosswalk \
  --output reports/control-crosswalk.md

# Step 3: Generate detailed audit report
aigrc report assets/high-risk-agent.asset.yaml \
  --type audit \
  --profiles eu-ai-act us-omb-m24 \
  --output reports/audit-report.md

# Step 4: Generate all required artifacts
aigrc generate assets/high-risk-agent.asset.yaml \
  --profile eu-ai-act --all --output-dir compliance/eu
aigrc generate assets/high-risk-agent.asset.yaml \
  --profile us-omb-m24 --all --output-dir compliance/us
```

### Scenario 3: Risk Level Escalation

Goal: An asset's risk level has increased - update compliance.

```bash
# Step 1: Re-classify with all profiles
aigrc classify assets/limited-risk-chatbot.asset.yaml --all

# Step 2: (Manually edit asset card to increase riskLevel to "high")

# Step 3: Check new compliance requirements
aigrc check assets/limited-risk-chatbot.asset.yaml --profiles eu-ai-act --verbose

# Step 4: Generate newly required artifacts
aigrc generate assets/limited-risk-chatbot.asset.yaml --profile eu-ai-act

# Step 5: Generate gap report for new requirements
aigrc report assets/limited-risk-chatbot.asset.yaml --type gap
```

### Scenario 4: Compare Risk Across Jurisdictions

Goal: Understand how an asset is classified differently across frameworks.

```bash
# Step 1: Classify minimal-risk asset against all profiles
aigrc classify assets/minimal-risk-classifier.asset.yaml --all

# Step 2: Classify limited-risk asset
aigrc classify assets/limited-risk-chatbot.asset.yaml --all

# Step 3: Classify high-risk asset
aigrc classify assets/high-risk-agent.asset.yaml --all

# Step 4: Generate comparative report
aigrc report assets/high-risk-agent.asset.yaml --type crosswalk

# Expected observations:
# - AIGRC "minimal" → EU "minimal", US "neither", NIST "minimal", ISO "low"
# - AIGRC "limited" → EU "limited", US "neither", NIST "low", ISO "medium"
# - AIGRC "high" → EU "high", US "rights-impacting", NIST "high", ISO "high"
```

---

## 5. Edge Cases & Error Handling

### 5.1 Invalid Asset Card

```bash
# Create invalid asset
echo "invalid: yaml: content" > invalid.yaml

# Test validation
aigrc validate invalid.yaml
# Expected: Error message with validation details
```

### 5.2 Non-Existent File

```bash
aigrc check nonexistent.yaml --profiles eu-ai-act
# Expected: "Asset card not found: nonexistent.yaml"
```

### 5.3 Unknown Profile

```bash
aigrc classify assets/high-risk-agent.asset.yaml --profile unknown-profile
# Expected: "Unknown profile: unknown-profile" with available profiles list
```

### 5.4 Missing Dependencies

```bash
# In a fresh directory without .aigrc.yaml
aigrc check assets/high-risk-agent.asset.yaml
# Expected: Uses default profile (eu-ai-act)
```

---

## 6. Expected Output Examples

### 6.1 Compliance Check Output (Text)

```
╔═══════════════════════════════════════════════════════════════╗
║                      AIGRC - AI Governance                    ║
╚═══════════════════════════════════════════════════════════════╝

✓ Loaded: Customer Support AI Agent

── Compliance Check: Customer Support AI Agent ──

  Profile           Risk Level              Compliant   Score
  ────────────────────────────────────────────────────────────
  EU AI Act         HIGH                    ✗ No        62%
  US OMB M-24       RIGHTS-IMPACTING        ✗ No        50%

⚠ 8 total gap(s) identified. Use --verbose for details.
```

### 6.2 Classify Output

```
╔═══════════════════════════════════════════════════════════════╗
║                      AIGRC - AI Governance                    ║
╚═══════════════════════════════════════════════════════════════╝

✓ Loaded: Customer Support AI Agent

── Classification Results ──

  Profile           AIGRC Level    Mapped Level        Controls
  ────────────────────────────────────────────────────────────────
  EU AI Act         high           HIGH                7 required
  US OMB M-24       high           RIGHTS-IMPACTING    5 required
  NIST AI RMF       high           HIGH                4 required
  ISO 42001         high           HIGH                6 required
```

---

## 7. Cleanup

After testing, clean up generated files:

```bash
# Remove generated artifacts
rm -rf .aigrc/artifacts
rm -rf compliance-docs
rm -rf reports

# Remove test config (optional)
rm .aigrc.yaml
```

---

## 8. Test Checklist

Use this checklist to track test progress:

- [x] **Environment Setup**
  
  - [x] pnpm install succeeds
  - [x] pnpm build succeeds
  - [x] CLI --version works

- [x] **Core Commands**
  
  - [x] scan command runs
  - [x] init creates config
  - [x] validate works for valid YAML
  - [x] validate catches invalid YAML
  - [x] status shows asset info
  - [x] register creates new asset

- [x] **Multi-Jurisdiction Commands**
  
  - [x] compliance list shows profiles
  - [x] compliance show displays profile details
  - [ ] classify maps risk levels correctly
  - [ ] check shows control status
  - [ ] check --stack combines profiles
  - [ ] generate creates artifacts
  - [ ] report gap shows gaps
  - [ ] report crosswalk shows mappings
  - [ ] report audit creates full report

- [ ] **Output Formats**
  
  - [ ] --output json produces valid JSON
  - [ ] --output yaml produces valid YAML
  - [ ] --verbose shows additional detail

- [ ] **Error Handling**
  
  - [ ] Missing file handled gracefully
  - [ ] Invalid YAML shows error
  - [ ] Unknown profile listed alternatives

---

## Notes

- All paths are relative to the `test-environment/` directory
- The `aigrc` command assumes you're in the monorepo with built packages
- Alternative: Use `node ../packages/cli/dist/bin/aigrc.js` directly
