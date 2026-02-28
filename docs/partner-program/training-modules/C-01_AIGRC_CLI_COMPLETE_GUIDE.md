# Module C-01: AIGRC CLI Complete Guide

## Mastering Every Command from Installation to Advanced Operations

**Module ID:** C-01
**Tier:** Core Components
**Duration:** 6-8 hours
**Difficulty:** Intermediate
**Prerequisites:** Modules P-01, P-02, P-03 completed
**Last Updated:** 2026-02-16

---

## 1. Module Overview

### 1.1 Purpose & Business Value

The AIGRC CLI is the primary tool for:
- Discovering AI assets in codebases
- Creating and managing Asset Cards
- Running compliance checks
- Generating reports and audit evidence
- Integrating with CI/CD pipelines

**Why This Matters:**
- CLI proficiency enables efficient customer implementations
- Understanding all commands unlocks full platform value
- Troubleshooting skills reduce implementation delays
- CLI knowledge transfers to automation and scripting

### 1.2 Learning Outcomes

By the end of this module, you will be able to:

1. ✓ Execute all 13 CLI commands with appropriate options
2. ✓ Understand output formats and how to interpret them
3. ✓ Configure CLI for different environments
4. ✓ Integrate CLI into scripts and automation
5. ✓ Troubleshoot common CLI issues
6. ✓ Explain CLI capabilities to customers

---

## 2. CLI Architecture

### 2.1 How the CLI Works

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    AIGRC CLI ARCHITECTURE                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  USER INPUT                                                                │
│  ══════════                                                                │
│  $ aigrc scan --output results.json                                        │
│       │                                                                     │
│       ▼                                                                     │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                      AIGRC CLI (@aigrc/cli)                         │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                 │   │
│  │  │   Command   │  │   Option    │  │   Output    │                 │   │
│  │  │   Parser    │  │  Validator  │  │  Formatter  │                 │   │
│  │  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘                 │   │
│  │         │                │                │                         │   │
│  │         └────────────────┼────────────────┘                         │   │
│  │                          │                                          │   │
│  │                          ▼                                          │   │
│  │  ┌─────────────────────────────────────────────────────────────┐   │   │
│  │  │                    AIGRC Core (@aigrc/core)                 │   │   │
│  │  │  ┌───────────┐  ┌───────────┐  ┌───────────┐  ┌──────────┐ │   │   │
│  │  │  │ Detection │  │  Policy   │  │  Schema   │  │ Golden   │ │   │   │
│  │  │  │  Engine   │  │  Engine   │  │ Validator │  │ Thread   │ │   │   │
│  │  │  └───────────┘  └───────────┘  └───────────┘  └──────────┘ │   │   │
│  │  └─────────────────────────────────────────────────────────────┘   │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                          │                                                  │
│                          ▼                                                  │
│  OUTPUT                                                                    │
│  ══════                                                                    │
│  • Terminal display (text, tables)                                         │
│  • File output (JSON, YAML, SARIF, PDF)                                   │
│  • Exit codes (0 = success, 1+ = failure)                                 │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 2.2 Command Categories

| Category | Commands | Purpose |
|----------|----------|---------|
| **Discovery** | `scan`, `detect`, `classify` | Find and categorize AI assets |
| **Documentation** | `asset-card`, `init` | Create and manage Asset Cards |
| **Compliance** | `check`, `policy` | Evaluate compliance status |
| **Reporting** | `report`, `audit` | Generate reports and evidence |
| **Certification** | `certify` | CGA certification |
| **Operations** | `lock` | Governance lock management |

### 2.3 CLI Configuration

The CLI looks for configuration in this order:

1. Command-line arguments (highest priority)
2. Environment variables
3. `.aigrc.yaml` in current directory
4. `.aigrc.yaml` in parent directories (up to git root)
5. `~/.aigrc/config.yaml` (user default)
6. Built-in defaults (lowest priority)

**Configuration File Example:**

```yaml
# .aigrc.yaml
apiVersion: aigrc.io/v1
kind: Config

metadata:
  name: my-project

spec:
  # Scanning configuration
  scan:
    include:
      - "**/*.py"
      - "**/*.js"
      - "**/*.ts"
    exclude:
      - "node_modules/**"
      - "venv/**"
      - ".git/**"
      - "**/*.test.*"

  # Detection configuration
  detect:
    confidence_threshold: 0.7
    include_vendors: true

  # Policy configuration
  policies:
    default: production-standard
    profiles:
      - name: production-standard
        path: ./policies/production.yaml

  # Output configuration
  output:
    default_format: json
    colors: true
    verbose: false

  # Control Plane connection (optional)
  controlPlane:
    endpoint: https://aigos.example.com
    # API key should be in environment variable AIGRC_API_KEY
```

**Environment Variables:**

| Variable | Purpose | Example |
|----------|---------|---------|
| `AIGRC_API_KEY` | Authentication token | `aig_xxx...` |
| `AIGRC_ENDPOINT` | Control Plane URL | `https://aigos.example.com` |
| `AIGRC_LOG_LEVEL` | Logging verbosity | `debug`, `info`, `warn`, `error` |
| `AIGRC_CONFIG` | Custom config path | `/path/to/.aigrc.yaml` |
| `AIGRC_NO_COLOR` | Disable colored output | `true` |

---

## 3. Command Reference

### 3.1 aigrc init

**Purpose:** Initialize AIGRC in a directory.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  COMMAND: aigrc init                                                        │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  SYNOPSIS                                                                  │
│  ════════                                                                  │
│  aigrc init [options]                                                      │
│                                                                             │
│  DESCRIPTION                                                               │
│  ═══════════                                                               │
│  Initializes AIGRC in the current directory by:                            │
│  • Creating .aigrc.yaml configuration file                                 │
│  • Creating .aigrc/ directory for local data                               │
│  • Setting up initial configuration                                        │
│                                                                             │
│  OPTIONS                                                                   │
│  ═══════                                                                   │
│  --template <name>    Use a configuration template                         │
│                       Values: minimal, standard, enterprise                │
│                       Default: standard                                    │
│                                                                             │
│  --force              Overwrite existing configuration                     │
│                                                                             │
│  --no-gitignore       Don't add .aigrc/ to .gitignore                     │
│                                                                             │
│  -y, --yes            Skip confirmation prompts                            │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Usage Examples:**

```bash
# Basic initialization
aigrc init

# Use enterprise template
aigrc init --template enterprise

# Force reinitialize
aigrc init --force

# Non-interactive (for scripts)
aigrc init -y --template standard
```

**Expected Output:**

```
Initializing AIGRC...

✓ Created .aigrc.yaml
✓ Created .aigrc/ directory
✓ Added .aigrc/ to .gitignore

AIGRC initialized successfully!

Next steps:
  1. Run 'aigrc scan' to discover AI assets
  2. Run 'aigrc asset-card init' to document found assets
  3. Run 'aigrc check' to verify compliance
```

**Verification:**

```bash
# Verify initialization
ls -la .aigrc*

# Expected:
# .aigrc.yaml (configuration file)
# .aigrc/ (local data directory)
```

---

### 3.2 aigrc scan

**Purpose:** Discover AI/ML components in a codebase.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  COMMAND: aigrc scan                                                        │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  SYNOPSIS                                                                  │
│  ════════                                                                  │
│  aigrc scan [path] [options]                                               │
│                                                                             │
│  DESCRIPTION                                                               │
│  ═══════════                                                               │
│  Scans directory for AI/ML components by analyzing:                        │
│  • Import statements (torch, tensorflow, sklearn, etc.)                    │
│  • Model loading patterns                                                  │
│  • API calls (OpenAI, Anthropic, etc.)                                     │
│  • Configuration files (model configs, pipelines)                          │
│  • Docker/requirements files                                               │
│                                                                             │
│  ARGUMENTS                                                                 │
│  ═════════                                                                 │
│  [path]               Directory to scan (default: current directory)       │
│                                                                             │
│  OPTIONS                                                                   │
│  ═══════                                                                   │
│  -r, --recursive      Scan subdirectories (default: true)                  │
│                                                                             │
│  -o, --output <file>  Write results to file                               │
│                       Supports: .json, .yaml, .csv                         │
│                                                                             │
│  -f, --format <fmt>   Output format                                        │
│                       Values: text, json, yaml, table, csv                 │
│                       Default: text                                        │
│                                                                             │
│  --include <pattern>  Include glob patterns                                │
│                       Example: --include "**/*.py"                         │
│                                                                             │
│  --exclude <pattern>  Exclude glob patterns                                │
│                       Example: --exclude "test/**"                         │
│                                                                             │
│  --include-vendors    Include third-party AI services                     │
│                                                                             │
│  --min-confidence <n> Minimum detection confidence (0-1)                   │
│                       Default: 0.5                                         │
│                                                                             │
│  --show-evidence      Display detection evidence                           │
│                                                                             │
│  -v, --verbose        Verbose output                                       │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Usage Examples:**

```bash
# Basic scan of current directory
aigrc scan

# Scan specific directory
aigrc scan ./ml-models

# Output to JSON file
aigrc scan --output results/scan.json

# Table format for review
aigrc scan --format table

# Include third-party APIs
aigrc scan --include-vendors

# High confidence only
aigrc scan --min-confidence 0.8

# Verbose with evidence
aigrc scan -v --show-evidence
```

**Expected Output (text format):**

```
AI Asset Discovery Report
═══════════════════════════════════════════════════════════════════════════════

Scanning: /path/to/project
Duration: 2.3s
Files scanned: 1,247

SUMMARY
───────────────────────────────────────────────────────────────────────────────
Total AI Assets Found: 7
  With Asset Cards:    2
  Requiring Cards:     5

RISK DISTRIBUTION
───────────────────────────────────────────────────────────────────────────────
  HIGH:     ██████░░░░░░░░░░░░░░  2 (29%)
  LIMITED:  ██████████░░░░░░░░░░  3 (43%)
  MINIMAL:  ████░░░░░░░░░░░░░░░░  2 (28%)

DISCOVERED ASSETS
───────────────────────────────────────────────────────────────────────────────

  #  Name                  Type           Risk      Location
  ─  ────                  ────           ────      ────────
  1  sentiment-model       NLP/Classifier HIGH      src/ml/sentiment.py
  2  hiring-predictor      Classification HIGH      src/ml/hr/predict.py
  3  customer-chatbot      Chatbot        LIMITED   src/bot/main.py
  4  recommendation-v2     Recommender    LIMITED   src/rec/engine.py
  5  price-optimizer       Optimization   LIMITED   src/pricing/model.py
  6  spam-filter           Classification MINIMAL   src/utils/spam.py
  7  image-resizer         Image/Vision   MINIMAL   src/media/resize.py

NEXT STEPS
───────────────────────────────────────────────────────────────────────────────
• Create Asset Cards for HIGH risk assets (priority)
• Run 'aigrc classify' for detailed risk assessment
• Run 'aigrc check' after creating Asset Cards
```

**Expected Output (JSON format):**

```json
{
  "apiVersion": "aigrc.io/v1",
  "kind": "ScanResult",
  "metadata": {
    "timestamp": "2026-02-16T10:30:00Z",
    "path": "/path/to/project",
    "duration_ms": 2300,
    "files_scanned": 1247
  },
  "summary": {
    "total_assets": 7,
    "with_cards": 2,
    "requiring_cards": 5,
    "by_risk": {
      "HIGH": 2,
      "LIMITED": 3,
      "MINIMAL": 2
    }
  },
  "assets": [
    {
      "id": "sentiment-model",
      "name": "sentiment-model",
      "type": "NLP/Classifier",
      "risk_level": "HIGH",
      "location": "src/ml/sentiment.py",
      "confidence": 0.95,
      "has_asset_card": false,
      "detections": [
        {
          "pattern": "transformers.pipeline",
          "line": 15,
          "confidence": 0.95
        }
      ]
    }
  ]
}
```

**Troubleshooting:**

| Issue | Cause | Solution |
|-------|-------|----------|
| No assets found | Wrong directory or excludes too broad | Check path and exclude patterns |
| Too many false positives | Low confidence threshold | Increase `--min-confidence` |
| Missing known assets | File type not included | Add to include patterns |
| Slow scan | Large directory | Add excludes for `node_modules`, etc. |
| Permission denied | File access issues | Check file permissions |

---

### 3.3 aigrc detect

**Purpose:** Deep detection with custom rules.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  COMMAND: aigrc detect                                                      │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  SYNOPSIS                                                                  │
│  ════════                                                                  │
│  aigrc detect [path] [options]                                             │
│                                                                             │
│  DESCRIPTION                                                               │
│  ═══════════                                                               │
│  Performs deep detection using custom rules beyond standard scanning.      │
│  Useful for:                                                               │
│  • Detecting proprietary AI frameworks                                     │
│  • Finding shadow AI (undocumented usage)                                  │
│  • Custom detection patterns                                               │
│                                                                             │
│  OPTIONS                                                                   │
│  ═══════                                                                   │
│  -r, --rules <file>   Custom detection rules file                          │
│                                                                             │
│  -o, --output <file>  Write results to file                               │
│                                                                             │
│  -f, --format <fmt>   Output format (text, json, yaml, sarif)              │
│                                                                             │
│  --ast                Use AST parsing (slower, more accurate)              │
│                                                                             │
│  --semantic           Enable semantic analysis                             │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Custom Rules Example:**

```yaml
# custom-rules.yaml
apiVersion: aigrc.io/v1
kind: DetectionRules

rules:
  - id: proprietary-ml-framework
    name: Internal ML Framework
    description: Detect usage of internal ML framework
    patterns:
      - type: import
        pattern: "from acme_ml import"
      - type: function_call
        pattern: "AcmeModel.predict"
    risk_level: HIGH

  - id: openai-usage
    name: OpenAI API Usage
    patterns:
      - type: import
        pattern: "import openai"
      - type: api_call
        pattern: "openai.ChatCompletion"
    risk_level: LIMITED
```

**Usage:**

```bash
# Use custom rules
aigrc detect --rules ./rules/custom-rules.yaml

# With AST parsing for accuracy
aigrc detect --ast --rules ./rules/custom-rules.yaml

# Output as SARIF for IDE integration
aigrc detect --format sarif --output findings.sarif
```

---

### 3.4 aigrc classify

**Purpose:** Classify AI assets by risk level.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  COMMAND: aigrc classify                                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  SYNOPSIS                                                                  │
│  ════════                                                                  │
│  aigrc classify [options]                                                  │
│                                                                             │
│  DESCRIPTION                                                               │
│  ═══════════                                                               │
│  Classifies discovered assets according to regulatory frameworks:          │
│  • EU AI Act risk tiers (Unacceptable, High, Limited, Minimal)            │
│  • NIST AI RMF categories                                                  │
│  • Custom classification schemes                                           │
│                                                                             │
│  OPTIONS                                                                   │
│  ═══════                                                                   │
│  -i, --input <file>   Scan results file (default: use last scan)          │
│                                                                             │
│  --framework <name>   Classification framework                             │
│                       Values: eu-ai-act, nist-ai-rmf, custom               │
│                       Default: eu-ai-act                                   │
│                                                                             │
│  --interactive        Interactive classification wizard                    │
│                                                                             │
│  -o, --output <file>  Write classifications to file                        │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Usage Examples:**

```bash
# Classify using EU AI Act
aigrc classify --framework eu-ai-act

# Interactive mode (asks questions)
aigrc classify --interactive

# From specific scan results
aigrc classify --input results/scan.json
```

**Interactive Mode Example:**

```
AI Asset Classification
═══════════════════════════════════════════════════════════════════════════════

Classifying: hiring-predictor
───────────────────────────────────────────────────────────────────────────────

? Does this system make or influence decisions about:
  ❯ Employment, recruitment, or HR decisions
    Education or vocational training
    Access to essential services (credit, housing, benefits)
    Law enforcement or justice
    Healthcare or medical diagnosis
    None of the above

Selected: Employment, recruitment, or HR decisions

? Is this system used in the European Union or for EU citizens?
  ❯ Yes
    No
    Unsure

Classification Result:
  Risk Level: HIGH
  Category: Employment (Annex III, Section 4)
  Rationale: AI systems used for recruitment, screening, or making
             decisions affecting employment are classified as high-risk
             under EU AI Act.

Requirements:
  ✓ Risk management system required
  ✓ Data governance required
  ✓ Technical documentation required
  ✓ Human oversight required
  ✓ Logging required

Continue to next asset? (Y/n)
```

---

### 3.5 aigrc asset-card

**Purpose:** Manage Asset Cards.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  COMMAND: aigrc asset-card                                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  SYNOPSIS                                                                  │
│  ════════                                                                  │
│  aigrc asset-card <subcommand> [options]                                   │
│                                                                             │
│  SUBCOMMANDS                                                               │
│  ═══════════                                                               │
│  init        Create a new Asset Card                                       │
│  validate    Validate Asset Card against schema                            │
│  show        Display Asset Card details                                    │
│  update      Update existing Asset Card                                    │
│  list        List all Asset Cards in directory                            │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### 3.5.1 aigrc asset-card init

```bash
# Basic initialization
aigrc asset-card init

# With template
aigrc asset-card init --template high-risk

# Non-interactive from JSON
aigrc asset-card init --from-json asset-data.json

# Interactive wizard
aigrc asset-card init --wizard

# Batch initialization from scan results
aigrc asset-card init --batch --input scan-results.json
```

**Template Options:**

| Template | Use Case |
|----------|----------|
| `minimal` | Quick documentation, low-risk systems |
| `standard` | Most systems |
| `high-risk` | High-risk systems requiring full documentation |
| `vendor` | Third-party AI services |

**Interactive Wizard Example:**

```
Asset Card Creation Wizard
═══════════════════════════════════════════════════════════════════════════════

Basic Information
─────────────────────────────────────────────────────────────────────────────

? Asset name: hiring-predictor
? Version: 2.1.0
? Description: ML model predicting candidate suitability for positions

Classification
─────────────────────────────────────────────────────────────────────────────

? Risk level: (Use arrow keys)
  ❯ HIGH
    LIMITED
    MINIMAL

? Category: Employment/Recruitment

Ownership
─────────────────────────────────────────────────────────────────────────────

? Owning team: HR Technology
? Contact email: hr-tech@acme.com
? Technical owner: Sarah Chen

Technical Details
─────────────────────────────────────────────────────────────────────────────

? ML Framework: scikit-learn
? Model type: gradient-boosting-classifier
? Input data description: Parsed resume data
? Output data description: Suitability score (0-100)

Creating Asset Card...

✓ Created hiring-predictor.asset-card.yaml

Next steps:
  1. Review and edit the Asset Card
  2. Run 'aigrc asset-card validate'
  3. Commit to version control
```

#### 3.5.2 aigrc asset-card validate

```bash
# Validate specific card
aigrc asset-card validate hiring-predictor.asset-card.yaml

# Validate all cards in directory
aigrc asset-card validate --all

# Validate against specific schema version
aigrc asset-card validate --schema-version v1.1

# Strict validation (warnings are errors)
aigrc asset-card validate --strict
```

**Expected Output:**

```
Validating: hiring-predictor.asset-card.yaml
═══════════════════════════════════════════════════════════════════════════════

Schema Validation
─────────────────────────────────────────────────────────────────────────────
✓ Valid YAML syntax
✓ Schema version: aigrc.io/v1
✓ Required fields present
✓ Field types correct

Content Validation
─────────────────────────────────────────────────────────────────────────────
✓ Risk level consistent with category
✓ Ownership information complete
✓ Technical details sufficient

Warnings
─────────────────────────────────────────────────────────────────────────────
⚠ assessments.ai_impact_assessment status is "pending"
⚠ governance.next_review date is in the past

Result: VALID (2 warnings)
```

#### 3.5.3 aigrc asset-card show

```bash
# Show specific card
aigrc asset-card show hiring-predictor

# JSON output
aigrc asset-card show hiring-predictor --format json

# Show specific sections
aigrc asset-card show hiring-predictor --section governance
```

#### 3.5.4 aigrc asset-card list

```bash
# List all cards
aigrc asset-card list

# Table format
aigrc asset-card list --format table

# Filter by risk level
aigrc asset-card list --risk-level HIGH
```

**Expected Output:**

```
Asset Cards in /path/to/project
═══════════════════════════════════════════════════════════════════════════════

  Name                    Version   Risk      Status     Last Updated
  ─────────────────────   ───────   ─────     ──────     ────────────
  hiring-predictor        2.1.0     HIGH      Valid      2026-02-15
  sentiment-model         1.5.2     HIGH      Valid      2026-02-14
  customer-chatbot        3.0.1     LIMITED   Warning    2026-02-10
  recommendation-engine   2.0.0     LIMITED   Valid      2026-02-08
  spam-filter             1.0.0     MINIMAL   Valid      2026-01-20

Total: 5 Asset Cards
  Valid: 4
  Warnings: 1
  Invalid: 0
```

---

### 3.6 aigrc check

**Purpose:** Run compliance checks.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  COMMAND: aigrc check                                                       │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  SYNOPSIS                                                                  │
│  ════════                                                                  │
│  aigrc check [path] [options]                                              │
│                                                                             │
│  DESCRIPTION                                                               │
│  ═══════════                                                               │
│  Runs compliance checks against policies. This is the core command         │
│  for CI/CD integration and ongoing governance.                             │
│                                                                             │
│  ARGUMENTS                                                                 │
│  ═════════                                                                 │
│  [path]               Path to check (default: current directory)           │
│                                                                             │
│  OPTIONS                                                                   │
│  ═══════                                                                   │
│  -p, --policy <name>  Policy profile to use                                │
│                       Default: from .aigrc.yaml or "default"               │
│                                                                             │
│  --framework <name>   Compliance framework                                 │
│                       Values: eu-ai-act, nist-ai-rmf, iso-42001, all       │
│                                                                             │
│  --fail-on <level>    Exit with error if issues at level                  │
│                       Values: critical, high, medium, low, any             │
│                       Default: critical                                    │
│                                                                             │
│  -o, --output <file>  Write results to file                               │
│                                                                             │
│  -f, --format <fmt>   Output format                                        │
│                       Values: text, json, sarif, junit, html               │
│                       Default: text                                        │
│                                                                             │
│  --ci                 CI mode (optimized output, strict exit codes)        │
│                                                                             │
│  --fix                Attempt to auto-fix issues where possible            │
│                                                                             │
│  -v, --verbose        Verbose output with recommendations                  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Usage Examples:**

```bash
# Basic compliance check
aigrc check

# Check specific directory
aigrc check ./ml-models

# Use specific policy
aigrc check --policy production-strict

# Check against EU AI Act
aigrc check --framework eu-ai-act

# CI mode (for pipelines)
aigrc check --ci --fail-on high

# Output SARIF for IDE
aigrc check --format sarif --output compliance.sarif

# Verbose with fix suggestions
aigrc check -v

# Auto-fix where possible
aigrc check --fix
```

**Expected Output:**

```
Compliance Check Results
═══════════════════════════════════════════════════════════════════════════════

Policy: production-standard
Framework: EU AI Act
Path: /path/to/project
Duration: 1.2s

OVERALL STATUS: ⚠ PARTIAL COMPLIANCE
───────────────────────────────────────────────────────────────────────────────
Score: 78/100
  Passed: 42 checks
  Warnings: 8 checks
  Failed: 3 checks

BY ASSET
───────────────────────────────────────────────────────────────────────────────

  hiring-predictor (HIGH RISK)
  ─────────────────────────────────────────────────────────────────────────────
  Score: 72/100

  ✓ PASS  Asset card present and valid
  ✓ PASS  Risk classification documented
  ✓ PASS  Human oversight configured
  ✗ FAIL  AI Impact Assessment not completed [Art. 27]
  ✗ FAIL  Bias audit not performed within 365 days [Art. 10]
  ⚠ WARN  Training data documentation incomplete [Art. 10]

  Required Actions:
  1. Complete AI Impact Assessment by 2026-03-15
  2. Schedule bias audit
  3. Document training data sources

  sentiment-model (HIGH RISK)
  ─────────────────────────────────────────────────────────────────────────────
  Score: 68/100
  [... similar output ...]

SUMMARY
───────────────────────────────────────────────────────────────────────────────

  CRITICAL  █░░░░░░░░░░░░░░░░░░░  1 issue
  HIGH      ███░░░░░░░░░░░░░░░░░  2 issues
  MEDIUM    ████░░░░░░░░░░░░░░░░  5 issues
  LOW       ██░░░░░░░░░░░░░░░░░░  3 issues

Exit Code: 1 (issues found at 'high' level or above)
```

**SARIF Output (for IDE integration):**

```json
{
  "$schema": "https://raw.githubusercontent.com/oasis-tcs/sarif-spec/master/Schemata/sarif-schema-2.1.0.json",
  "version": "2.1.0",
  "runs": [
    {
      "tool": {
        "driver": {
          "name": "AIGRC",
          "version": "0.2.0",
          "rules": [
            {
              "id": "AIGRC001",
              "name": "ai-impact-assessment-required",
              "shortDescription": {
                "text": "AI Impact Assessment Required"
              }
            }
          ]
        }
      },
      "results": [
        {
          "ruleId": "AIGRC001",
          "level": "error",
          "message": {
            "text": "High-risk AI system requires completed AI Impact Assessment"
          },
          "locations": [
            {
              "physicalLocation": {
                "artifactLocation": {
                  "uri": "hiring-predictor.asset-card.yaml"
                }
              }
            }
          ]
        }
      ]
    }
  ]
}
```

**Exit Codes:**

| Code | Meaning |
|------|---------|
| 0 | All checks passed |
| 1 | Issues found at specified `--fail-on` level |
| 2 | Configuration error |
| 3 | Runtime error |

---

### 3.7 aigrc policy

**Purpose:** Manage policies.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  COMMAND: aigrc policy                                                      │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  SUBCOMMANDS                                                               │
│  ═══════════                                                               │
│  list        List available policies                                       │
│  show        Show policy details                                           │
│  apply       Apply policy to project                                       │
│  validate    Validate policy file                                          │
│  create      Create new policy                                             │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Usage Examples:**

```bash
# List available policies
aigrc policy list

# Show policy details
aigrc policy show production-standard

# Apply policy
aigrc policy apply production-standard

# Validate policy file
aigrc policy validate ./policies/custom.yaml

# Create new policy
aigrc policy create my-policy --from-template enterprise
```

**Policy List Output:**

```
Available Policies
═══════════════════════════════════════════════════════════════════════════════

  Name                    Source      Rules   Enforcement   Status
  ─────────────────────   ──────      ─────   ───────────   ──────
  default                 built-in    15      warn          Active
  production-standard     built-in    28      block         -
  enterprise-strict       built-in    42      block         -
  eu-ai-act-2024         built-in    35      block         -
  nist-ai-rmf            built-in    30      warn          -
  custom-policy          local       12      warn          Active

Active policies: default, custom-policy
```

---

### 3.8 aigrc report

**Purpose:** Generate reports.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  COMMAND: aigrc report                                                      │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  SYNOPSIS                                                                  │
│  ════════                                                                  │
│  aigrc report <type> [options]                                             │
│                                                                             │
│  REPORT TYPES                                                              │
│  ════════════                                                              │
│  inventory     AI asset inventory report                                   │
│  compliance    Compliance status report                                    │
│  executive     Executive summary dashboard                                 │
│  technical     Technical details report                                    │
│  audit         Audit evidence package                                      │
│  gap           Gap analysis report                                         │
│                                                                             │
│  OPTIONS                                                                   │
│  ═══════                                                                   │
│  -o, --output <file>  Output file (default: stdout)                        │
│                                                                             │
│  -f, --format <fmt>   Output format                                        │
│                       Values: text, json, html, pdf, xlsx                  │
│                                                                             │
│  --period <range>     Time period for data                                 │
│                       Examples: 7d, 30d, 90d, 1y, custom                   │
│                                                                             │
│  --framework <name>   Focus on specific framework                          │
│                                                                             │
│  --template <file>    Custom report template                               │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Usage Examples:**

```bash
# Generate inventory report
aigrc report inventory --format xlsx --output reports/inventory.xlsx

# Executive dashboard PDF
aigrc report executive --period 90d --format pdf --output reports/executive.pdf

# Compliance report for EU AI Act
aigrc report compliance --framework eu-ai-act --format html

# Gap analysis
aigrc report gap --framework eu-ai-act --output reports/gaps.json

# Audit evidence package
aigrc report audit --period 1y --output audit-package.zip
```

---

### 3.9 aigrc audit

**Purpose:** Generate audit trails and evidence.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  COMMAND: aigrc audit                                                       │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  SYNOPSIS                                                                  │
│  ════════                                                                  │
│  aigrc audit [options]                                                     │
│                                                                             │
│  DESCRIPTION                                                               │
│  ═══════════                                                               │
│  Generates immutable audit evidence including:                             │
│  • Asset card change history                                               │
│  • Compliance check results                                                │
│  • Policy enforcement actions                                              │
│  • Golden thread hashes                                                    │
│                                                                             │
│  SUBCOMMANDS                                                               │
│  ═══════════                                                               │
│  export      Export audit evidence package                                 │
│  verify      Verify audit trail integrity                                  │
│  show        Show audit entries                                            │
│                                                                             │
│  OPTIONS                                                                   │
│  ═══════                                                                   │
│  --since <date>       Start date (ISO format)                              │
│  --until <date>       End date (ISO format)                                │
│  --asset <name>       Filter by asset                                      │
│  -o, --output <file>  Output file                                          │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Usage Examples:**

```bash
# Export audit package
aigrc audit export --since 2026-01-01 --output audit-q1.zip

# Verify audit integrity
aigrc audit verify --since 2026-01-01

# Show recent audit entries
aigrc audit show --since 2026-02-01

# Filter by asset
aigrc audit show --asset hiring-predictor
```

---

### 3.10 aigrc certify

**Purpose:** Run CGA (Certified Governed Agent) certification.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  COMMAND: aigrc certify                                                     │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  SYNOPSIS                                                                  │
│  ════════                                                                  │
│  aigrc certify [path] [options]                                            │
│                                                                             │
│  DESCRIPTION                                                               │
│  ═══════════                                                               │
│  Runs CGA certification process to verify agent meets governance           │
│  requirements for a specific certification level.                          │
│                                                                             │
│  OPTIONS                                                                   │
│  ═══════                                                                   │
│  -l, --level <level>  Target certification level                           │
│                       Values: BRONZE, SILVER, GOLD, PLATINUM               │
│                       Default: BRONZE                                      │
│                                                                             │
│  -o, --output <fmt>   Output format                                        │
│                       Values: text, json, sarif                            │
│                                                                             │
│  --ca-endpoint <url>  Certificate Authority endpoint                       │
│                       Default: from config or public CA                    │
│                                                                             │
│  --dry-run            Check requirements without requesting cert           │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Certification Levels:**

| Level | Requirements |
|-------|--------------|
| **BRONZE** | Asset Card, basic compliance |
| **SILVER** | + Human oversight, kill switch |
| **GOLD** | + Continuous monitoring, full audit trail |
| **PLATINUM** | + Third-party audit, multi-jurisdiction |

**Usage Examples:**

```bash
# Check BRONZE requirements
aigrc certify --level BRONZE --dry-run

# Request SILVER certification
aigrc certify --level SILVER

# Custom CA endpoint
aigrc certify --level GOLD --ca-endpoint https://ca.company.com
```

---

### 3.11 aigrc lock

**Purpose:** Manage governance locks.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  COMMAND: aigrc lock                                                        │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  SYNOPSIS                                                                  │
│  ════════                                                                  │
│  aigrc lock [options]                                                      │
│                                                                             │
│  DESCRIPTION                                                               │
│  ═══════════                                                               │
│  Creates a governance lock file that captures the current state            │
│  of all governance artifacts, creating an immutable snapshot.              │
│                                                                             │
│  SUBCOMMANDS                                                               │
│  ═══════════                                                               │
│  create      Create new governance lock                                    │
│  verify      Verify lock integrity                                         │
│  show        Show lock details                                             │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Usage:**

```bash
# Create governance lock
aigrc lock create --output .governance.lock

# Verify lock
aigrc lock verify

# Show lock contents
aigrc lock show
```

---

## 4. Integration Patterns

### 4.1 CI/CD Integration

```bash
#!/bin/bash
# ci-governance-check.sh

set -e

# Run governance check in CI mode
aigrc check --ci --fail-on high --format sarif --output governance.sarif

# Upload SARIF to GitHub (if using GitHub Actions)
if [ -n "$GITHUB_ACTIONS" ]; then
  echo "::set-output name=sarif_file::governance.sarif"
fi

echo "Governance check completed successfully"
```

### 4.2 Pre-commit Hook

```bash
#!/bin/bash
# .git/hooks/pre-commit

# Run quick governance check
aigrc check --ci --fail-on critical

if [ $? -ne 0 ]; then
  echo "Governance check failed. Please fix issues before committing."
  exit 1
fi
```

### 4.3 Scripting Example

```bash
#!/bin/bash
# batch-process.sh

# Process multiple repositories
for repo in /path/to/repos/*/; do
  echo "Processing: $repo"
  cd "$repo"

  # Initialize if needed
  if [ ! -f ".aigrc.yaml" ]; then
    aigrc init -y
  fi

  # Scan and create reports
  aigrc scan --output "reports/scan-$(date +%Y%m%d).json"
  aigrc check --output "reports/compliance-$(date +%Y%m%d).json"

  cd -
done
```

---

## 5. Troubleshooting

### 5.1 Common Issues

| Issue | Cause | Solution |
|-------|-------|----------|
| `aigrc: command not found` | Not in PATH | Reinstall or check npm global directory |
| `Configuration not found` | No .aigrc.yaml | Run `aigrc init` |
| `Schema validation failed` | Invalid Asset Card | Run `aigrc asset-card validate` |
| `Network error` | Can't reach Control Plane | Check endpoint and API key |
| `Permission denied` | File access | Check file permissions |
| `Out of memory` | Large repository | Increase Node.js memory: `NODE_OPTIONS=--max-old-space-size=4096` |

### 5.2 Debug Mode

```bash
# Enable debug logging
export AIGRC_LOG_LEVEL=debug
aigrc scan

# Or inline
AIGRC_LOG_LEVEL=debug aigrc scan
```

### 5.3 Getting Help

```bash
# General help
aigrc --help

# Command-specific help
aigrc scan --help
aigrc asset-card --help

# Version info
aigrc --version
```

---

## 6. Hands-On Exercises

### Exercise C-01.1: Complete Workflow

**Objective:** Execute a complete governance workflow.

**Time:** 45 minutes

**Steps:**

1. Create a new directory with sample Python ML code
2. Initialize AIGRC
3. Run a scan
4. Create Asset Cards for discovered assets
5. Run compliance check
6. Generate a report

```bash
# Step 1: Setup
mkdir exercise-c01
cd exercise-c01

# Create sample ML file
cat > ml_model.py << 'EOF'
import torch
from transformers import pipeline

class SentimentAnalyzer:
    def __init__(self):
        self.model = pipeline("sentiment-analysis")

    def analyze(self, text):
        return self.model(text)
EOF

# Step 2: Initialize
aigrc init

# Step 3: Scan
aigrc scan --format table

# Step 4: Create Asset Card
aigrc asset-card init --wizard

# Step 5: Compliance check
aigrc check -v

# Step 6: Generate report
aigrc report compliance --format html --output compliance-report.html
```

### Exercise C-01.2: CI/CD Simulation

**Objective:** Simulate CI/CD governance gate.

**Time:** 30 minutes

**Steps:**

1. Create a failing scenario (missing Asset Card)
2. Run check with `--fail-on high`
3. Fix the issue
4. Run check again

---

## 7. Knowledge Check

### Quiz: Module C-01

1. Which command discovers AI assets in code?
   - A) `aigrc detect`
   - B) `aigrc scan`
   - C) `aigrc find`
   - D) `aigrc search`

2. What output format is used for IDE integration?
   - A) JSON
   - B) YAML
   - C) SARIF
   - D) XML

3. Which option makes `aigrc check` fail on high-severity issues?
   - A) `--strict`
   - B) `--fail-on high`
   - C) `--error-level high`
   - D) `--exit-on high`

4. How do you create an Asset Card interactively?
   - A) `aigrc asset-card new`
   - B) `aigrc asset-card init --wizard`
   - C) `aigrc asset-card create --interactive`
   - D) `aigrc create-card`

5. What is the exit code when `aigrc check` finds issues?
   - A) 0
   - B) 1
   - C) -1
   - D) 255

**Answers:** 1-B, 2-C, 3-B, 4-B, 5-B

---

## 8. Quick Reference

### Command Cheat Sheet

```bash
# DISCOVERY
aigrc scan                           # Discover AI assets
aigrc detect --rules custom.yaml     # Custom detection
aigrc classify --interactive         # Risk classification

# DOCUMENTATION
aigrc init                           # Initialize project
aigrc asset-card init --wizard       # Create Asset Card
aigrc asset-card validate            # Validate cards
aigrc asset-card list                # List all cards

# COMPLIANCE
aigrc check                          # Run compliance check
aigrc check --ci --fail-on high      # CI mode
aigrc policy list                    # List policies
aigrc policy apply enterprise        # Apply policy

# REPORTING
aigrc report inventory               # Asset inventory
aigrc report compliance              # Compliance report
aigrc report executive --format pdf  # Executive dashboard
aigrc audit export                   # Export audit trail

# CERTIFICATION
aigrc certify --level SILVER         # CGA certification
aigrc lock create                    # Governance lock
```

---

*Module C-01 Complete. Proceed to Module C-02 or C-03.*
