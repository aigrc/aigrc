# Sprint 3 CLI Enhancements

This document describes the CLI enhancements implemented in Sprint 3 (Epic AIG-10).

## Implemented Stories

### AIG-99: Complete Exit Code Coverage (2 pts) ✓

**Location:** `src/utils/exit-codes.ts`

Added comprehensive exit code coverage:

```typescript
enum ExitCode {
  SUCCESS = 0,
  GENERAL_ERROR = 1,
  INVALID_ARGUMENTS = 2,
  VALIDATION_ERRORS = 3,
  FILE_NOT_FOUND = 4,
  PERMISSION_DENIED = 5
}
```

All CLI commands now use proper exit codes for error handling.

### AIG-97: Add SARIF Output Format (5 pts) ✓

**Location:** `src/formatters/sarif.ts`

Added SARIF 2.1.0 compliant output format for validation results.

**Usage:**
```bash
# Output SARIF to stdout
aigrc validate --format sarif

# Output SARIF to file
aigrc validate --format sarif --output-file results.sarif

# Validate all cards with SARIF output
aigrc validate --all --format sarif --output-file validation.sarif
```

**SARIF Features:**
- Full SARIF 2.1.0 compliance
- Includes artifact locations
- Maps validation errors to SARIF results
- Supports both text, JSON, and SARIF output formats

### AIG-98: Add --fix Auto-Correct (5 pts) ✓

**Location:** `src/fixers/auto-fix.ts`

Added automatic fixing of common issues in asset cards.

**Usage:**
```bash
# Fix issues and save changes
aigrc validate --fix

# Preview fixes without saving
aigrc validate --fix --dry-run

# Fix all cards in directory
aigrc validate --all --fix
```

**Auto-fix Capabilities:**
- Missing or invalid dates (createdAt, updatedAt)
- Missing version field
- Risk level normalization (e.g., "low" → "minimal", "medium" → "limited")
- PII processing field conversion (boolean → "yes"/"no"/"unknown")
- Missing required fields (id, name, description, classification)

### AIG-100: Add Golden Thread Status (3 pts) ✓

**Location:** `src/commands/status.ts`

Enhanced status command to show Golden Thread information.

**Usage:**
```bash
aigrc status
```

**Output:**
```
Golden Thread:
  My AI Agent
    Hash: sha256:7d865e959b2466918c9863afca942d0fb89d7c9ac0c99bafc3749504ded97730
    Status: ✓ Verified
    Signature: ✓ RSA-SHA256
```

**Features:**
- Shows Golden Thread hash for each card
- Verifies hash integrity
- Displays signature status if present
- Only shows cards that have Golden Thread components

### AIG-101: Version Enhancements (3 pts) ✓

**Location:** `src/commands/version.ts`

Added enhanced version command with detailed package information.

**Usage:**
```bash
# Human-readable output
aigrc version

# JSON output
aigrc version --json
```

**Output (Text):**
```
AIGRC Version Information
──────────────────────────────────────────────────

aigrc CLI: 0.1.0
@aigrc/core: 0.1.0
Node.js: v20.10.0
Platform: darwin arm64
```

**Output (JSON):**
```json
{
  "cli": "0.1.0",
  "core": "0.1.0",
  "node": "20.10.0",
  "platform": "darwin",
  "arch": "arm64"
}
```

### AIG-102: Hash Command Enhancements (3 pts) ✓

**Location:** `src/commands/hash.ts`

Simplified hash command output for better usability.

**Usage:**
```bash
# Compute hash (simple output)
aigrc hash .aigrc/cards/my-agent.yaml
# Output: sha256:7d865e959b2466918c9863afca942d0fb89d7c9ac0c99bafc3749504ded97730

# Verify hash
aigrc hash --verify .aigrc/cards/my-agent.yaml
# Output: ✓ Golden Thread hash verified
```

**Changes:**
- Simplified text output (just the hash for compute mode)
- Clear verification messages
- Removed verbose output for cleaner UX
- JSON output still available with `--output json`

## Updated Commands

### validate

Enhanced with new options:

```bash
aigrc validate [path]
  -s, --strict              Fail on warnings as well as errors
  -o, --output <format>     Output format (text, json, sarif)
  -a, --all                 Validate all cards in the cards directory
  --fix                     Automatically fix common issues
  --dry-run                 Preview fixes without saving (requires --fix)
  --output-file <path>      Write output to file instead of stdout
```

**Examples:**
```bash
# Validate with auto-fix
aigrc validate my-card.yaml --fix

# Preview fixes
aigrc validate my-card.yaml --fix --dry-run

# Validate all with SARIF output
aigrc validate --all --format sarif --output-file results.sarif

# Fix all cards
aigrc validate --all --fix
```

## File Structure

```
packages/cli/src/
├── commands/
│   ├── hash.ts            # Enhanced hash command (AIG-102)
│   ├── validate.ts        # Enhanced with SARIF + --fix (AIG-97, AIG-98, AIG-99)
│   ├── status.ts          # Enhanced with Golden Thread (AIG-100)
│   ├── version.ts         # New version command (AIG-101)
│   └── ...
├── formatters/
│   ├── sarif.ts           # SARIF 2.1.0 formatter (AIG-97)
│   └── text.ts            # Enhanced text formatter
├── fixers/
│   └── auto-fix.ts        # Auto-fix logic (AIG-98)
└── utils/
    ├── exit-codes.ts      # Exit code constants (AIG-99)
    └── ...
```

## Testing

To test the new features:

```bash
# Build the CLI
cd packages/cli
npm run build

# Test exit codes
aigrc validate non-existent.yaml
echo $?  # Should be 4 (FILE_NOT_FOUND)

# Test SARIF output
aigrc validate --all --format sarif

# Test auto-fix
aigrc validate my-card.yaml --fix --dry-run

# Test Golden Thread status
aigrc status

# Test version command
aigrc version
aigrc version --json

# Test hash command
aigrc hash .aigrc/cards/my-card.yaml
aigrc hash --verify .aigrc/cards/my-card.yaml
```

## Story Points Summary

| Story | Points | Status |
|-------|--------|--------|
| AIG-97: SARIF Output | 5 | ✓ Complete |
| AIG-98: Auto-Fix | 5 | ✓ Complete |
| AIG-99: Exit Codes | 2 | ✓ Complete |
| AIG-100: Golden Thread Status | 3 | ✓ Complete |
| AIG-101: Version Enhancements | 3 | ✓ Complete |
| AIG-102: Hash Command | 3 | ✓ Complete |
| **Total** | **21** | **All Complete** |

## Integration Notes

All enhancements are backward compatible with existing CLI functionality. The new features can be used independently or in combination:

```bash
# Example: Fix all cards and output SARIF
aigrc validate --all --fix --format sarif --output-file results.sarif

# Example: Validate with auto-fix and check status
aigrc validate --all --fix
aigrc status
```
