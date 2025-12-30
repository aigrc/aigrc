# SPEC-CLI-001: Command Line Interface Specification

## Document Information

| Field | Value |
|-------|-------|
| **Spec ID** | SPEC-CLI-001 |
| **Version** | 1.0.0-draft |
| **Status** | Draft |
| **Layer** | Layer 2: Static Governance |
| **Package** | `@aigrc/cli` |
| **Last Updated** | 2025-12-29 |
| **Authors** | GovOS Team |
| **License** | Apache 2.0 |

---

## Abstract

This specification defines the AIGRC Command Line Interface (`aigrc`), the primary developer tool for static governance operations. The CLI provides commands for scanning codebases, creating Asset Cards, validating governance artifacts, and checking status—all from the terminal.

---

## 1. Introduction

### 1.1 Purpose

The CLI enables developers to:

1. **Scan** — Detect AI assets in codebases
2. **Initialize** — Bootstrap `.aigrc` directory structure
3. **Validate** — Check Asset Cards and policies
4. **Status** — View governance posture
5. **Generate** — Create Golden Thread hashes

### 1.2 Design Principles

- **Developer-First** — Fast, non-blocking, informative
- **Git-Native** — Works with version control workflows
- **Non-Invasive** — No code modification required
- **Cross-Platform** — Works on macOS, Linux, Windows

---

## 2. Installation

### 2.1 npm

```bash
npm install -g @aigrc/cli
```

### 2.2 Homebrew (macOS/Linux)

```bash
brew install aigrc/tap/aigrc
```

### 2.3 Binary Download

```bash
# macOS
curl -L https://github.com/aigrc/aigrc/releases/latest/download/aigrc-darwin-arm64 -o aigrc
chmod +x aigrc
sudo mv aigrc /usr/local/bin/

# Linux
curl -L https://github.com/aigrc/aigrc/releases/latest/download/aigrc-linux-amd64 -o aigrc
chmod +x aigrc
sudo mv aigrc /usr/local/bin/
```

---

## 3. Commands

### 3.1 Command Overview

| Command | Description |
|---------|-------------|
| `aigrc init` | Initialize `.aigrc` directory |
| `aigrc scan` | Scan codebase for AI assets |
| `aigrc validate` | Validate Asset Cards and policies |
| `aigrc status` | Show governance status |
| `aigrc hash` | Compute Golden Thread hash |
| `aigrc version` | Show version information |

---

### 3.2 aigrc init

Initialize `.aigrc` directory structure.

```bash
aigrc init [options]

Options:
  --force, -f     Overwrite existing configuration
  --minimal       Create minimal configuration only
  --template <t>  Use template (minimal | standard | enterprise)
  --help, -h      Show help

Examples:
  aigrc init
  aigrc init --template enterprise
  aigrc init --force
```

**Output:**
```
Creating .aigrc structure...
  ✓ Created .aigrc.yaml
  ✓ Created .aigrc/cards/
  ✓ Created .aigrc/policies/
  ✓ Created .aigrc/policies/default.yaml
  ✓ Updated .gitignore

AIGRC initialized successfully!

Next steps:
  1. Run 'aigrc scan' to detect AI assets
  2. Review generated Asset Cards in .aigrc/cards/
  3. Customize policies in .aigrc/policies/
```

---

### 3.3 aigrc scan

Scan codebase for AI assets and generate Asset Cards.

```bash
aigrc scan [path] [options]

Arguments:
  path            Directory to scan (default: current directory)

Options:
  --output, -o    Output directory for cards (default: .aigrc/cards)
  --format        Output format (yaml | json)
  --dry-run       Show what would be created without writing
  --include       Include patterns (glob)
  --exclude       Exclude patterns (glob)
  --min-confidence  Minimum detection confidence (0-1, default: 0.7)
  --frameworks    Specific frameworks to detect (comma-separated)
  --verbose, -v   Verbose output
  --help, -h      Show help

Examples:
  aigrc scan
  aigrc scan src/
  aigrc scan --dry-run
  aigrc scan --frameworks langchain,openai
  aigrc scan --exclude "**/*.test.ts"
```

**Output:**
```
Scanning for AI assets in ./src...

Detected Frameworks:
  • langchain (0.1.0) - 95% confidence
  • openai (1.12.0) - 98% confidence
  • anthropic (0.18.0) - 92% confidence

Found 3 AI assets:

  1. src/agents/financial_agent.py:45
     ├── Type: agent
     ├── Framework: langchain
     ├── Risk: high (estimated)
     └── Card: .aigrc/cards/financial-agent.yaml [NEW]

  2. src/services/chat.py:12
     ├── Type: service
     ├── Framework: openai
     ├── Risk: limited (estimated)
     └── Card: .aigrc/cards/chat-service.yaml [NEW]

  3. src/tools/embedding.py:8
     ├── Type: tool
     ├── Framework: openai
     ├── Risk: minimal (estimated)
     └── Card: .aigrc/cards/embedding-tool.yaml [NEW]

Generated 3 Asset Cards in .aigrc/cards/

Run 'aigrc validate' to check the generated cards.
```

---

### 3.4 aigrc validate

Validate Asset Cards and policies.

```bash
aigrc validate [path] [options]

Arguments:
  path            Path to validate (card, policy, or directory)

Options:
  --strict        Treat warnings as errors
  --fix           Auto-fix issues where possible
  --schema        Validate against specific schema version
  --format        Output format (text | json | sarif)
  --output, -o    Write results to file
  --help, -h      Show help

Examples:
  aigrc validate
  aigrc validate .aigrc/cards/
  aigrc validate .aigrc/cards/my-agent.yaml
  aigrc validate --strict
  aigrc validate --format sarif --output results.sarif
```

**Output:**
```
Validating AIGRC artifacts...

Asset Cards:
  ✓ financial-agent.yaml - Valid
  ✓ chat-service.yaml - Valid
  ✗ embedding-tool.yaml - 1 error, 1 warning

Policies:
  ✓ default.yaml - Valid
  ✓ production.yaml - Valid

Errors:
  embedding-tool.yaml:
    • Line 12: Missing required field 'owner.email'

Warnings:
  embedding-tool.yaml:
    • Line 8: Risk level 'minimal' may be underestimated for embedding service

Summary: 1 error(s), 1 warning(s)

Run 'aigrc validate --fix' to auto-fix issues.
```

---

### 3.5 aigrc status

Show governance status overview.

```bash
aigrc status [options]

Options:
  --format        Output format (table | json | markdown)
  --verbose, -v   Show detailed information
  --filter        Filter by status (all | valid | invalid | draft)
  --help, -h      Show help

Examples:
  aigrc status
  aigrc status --format json
  aigrc status --verbose
```

**Output:**
```
AIGRC Status

Configuration:
  ✓ .aigrc.yaml found
  ✓ Version: 1.0

Asset Inventory:
┌─────────────────────┬──────────┬───────────┬───────────────┬──────────┐
│ Asset               │ Type     │ Risk      │ Golden Thread │ Status   │
├─────────────────────┼──────────┼───────────┼───────────────┼──────────┤
│ financial-agent     │ agent    │ high      │ ✓ FIN-1234    │ active   │
│ chat-service        │ service  │ limited   │ ✓ CHAT-567    │ active   │
│ embedding-tool      │ tool     │ minimal   │ ✗ missing     │ draft    │
└─────────────────────┴──────────┴───────────┴───────────────┴──────────┘

Risk Distribution:
  minimal:  1 (33%)
  limited:  1 (33%)
  high:     1 (33%)

Governance Score: 67%
  ✓ 2/3 assets have Golden Thread
  ✓ 3/3 assets have valid cards
  ✗ 1/3 assets missing owner info
```

---

### 3.6 aigrc hash

Compute Golden Thread hash.

```bash
aigrc hash [options]

Options:
  --ticket-id     Jira/ADO ticket ID (required)
  --approved-by   Approver email (required)
  --approved-at   Approval timestamp (default: now)
  --sign          Sign with private key
  --key           Path to private key for signing
  --output, -o    Write to Asset Card
  --help, -h      Show help

Examples:
  aigrc hash --ticket-id FIN-1234 --approved-by ciso@corp.com
  aigrc hash --ticket-id FIN-1234 --approved-by ciso@corp.com --sign
  aigrc hash --ticket-id FIN-1234 --approved-by ciso@corp.com --output .aigrc/cards/my-agent.yaml
```

**Output:**
```
Computing Golden Thread hash...

Input:
  ticket_id:   FIN-1234
  approved_by: ciso@corp.com
  approved_at: 2025-01-15T10:30:00Z

Canonical String:
  approved_at=2025-01-15T10:30:00Z|approved_by=ciso@corp.com|ticket_id=FIN-1234

Hash:
  sha256:7d865e959b2466918c9863afca942d0fb89d7c9ac0c99bafc3749504ded97730

Add to Asset Card:
  golden_thread:
    ticket_id: FIN-1234
    approved_by: ciso@corp.com
    approved_at: "2025-01-15T10:30:00Z"
    hash: "sha256:7d865e959b2466918c9863afca942d0fb89d7c9ac0c99bafc3749504ded97730"
```

---

## 4. Exit Codes

| Code | Meaning |
|------|---------|
| 0 | Success |
| 1 | General error |
| 2 | Invalid arguments |
| 3 | Validation errors found |
| 4 | File not found |
| 5 | Permission denied |

---

## 5. Configuration

### 5.1 Environment Variables

| Variable | Description |
|----------|-------------|
| `AIGRC_CONFIG` | Path to .aigrc.yaml |
| `AIGRC_LOG_LEVEL` | Log level (debug, info, warn, error) |
| `AIGRC_NO_COLOR` | Disable colored output |
| `AIGRC_JSON` | Output in JSON format |

### 5.2 Global Configuration

```yaml
# ~/.aigrc/config.yaml (user-level)
defaults:
  scan:
    min_confidence: 0.8
    exclude:
      - node_modules
      - .git
  validate:
    strict: false
```

---

## 6. Implementation Requirements

### 6.1 MUST (Required)

The CLI MUST:

1. Implement `init`, `scan`, `validate`, `status` commands
2. Support YAML output for Asset Cards
3. Return appropriate exit codes
4. Work without network connectivity
5. Support `--help` for all commands

### 6.2 SHOULD (Recommended)

The CLI SHOULD:

1. Support JSON output format
2. Provide colored terminal output
3. Show progress for long operations
4. Support glob patterns for include/exclude

---

## Appendix A: Changelog

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0-draft | 2025-12-29 | Initial draft |
