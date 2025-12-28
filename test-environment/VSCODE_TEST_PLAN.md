# AIGRC VS Code Extension Test Plan

## Overview

This document provides a comprehensive test plan for the AIGRC VS Code extension (`aigrc-vscode`). The extension provides IDE integration for AI governance, including asset detection, validation, and compliance management.

---

## 1. Environment Setup

### Prerequisites

- VS Code version >= 1.85.0
- Node.js >= 18.0.0
- pnpm >= 8.0.0
- AIGRC monorepo built

### Installation Methods

#### Method 1: Development Mode (Recommended for Testing)

```bash
# 1. Navigate to the aigrc monorepo
cd aigrc

# 2. Install dependencies and build
pnpm install
pnpm run build

# 3. Open VS Code in the extension directory
code packages/vscode

# 4. Press F5 to launch Extension Development Host
# This opens a new VS Code window with the extension loaded
```

#### Method 2: Package and Install (.vsix)

```bash
# 1. Navigate to vscode package
cd packages/vscode

# 2. Package the extension
pnpm run package
# Creates: aigrc-vscode-0.1.0.vsix

# 3. Install in VS Code
code --install-extension aigrc-vscode-0.1.0.vsix

# 4. Restart VS Code
```

#### Method 3: Install from Marketplace (Future)

```bash
# When published to VS Code Marketplace
code --install-extension aigrc.aigrc-vscode
```

### Test Workspace Setup

```bash
# Create a test workspace with AI code
mkdir -p ~/aigrc-test-workspace
cd ~/aigrc-test-workspace

# Create a Python file with AI imports
cat > ai_agent.py << 'EOF'
import openai
from langchain import LLMChain
from anthropic import Anthropic

client = openai.OpenAI()
response = client.chat.completions.create(
    model="gpt-4",
    messages=[{"role": "user", "content": "Hello"}]
)
EOF

# Create a TypeScript file with AI imports
cat > assistant.ts << 'EOF'
import Anthropic from '@anthropic-ai/sdk';
import { OpenAI } from 'openai';

const anthropic = new Anthropic();
const openai = new OpenAI();
EOF

# Create .aigrc directory structure
mkdir -p .aigrc/cards

# Create a sample asset card
cat > .aigrc/cards/test-agent.yaml << 'EOF'
name: test-agent
version: "1.0.0"
status: active
owner:
  name: Test User
  email: test@example.com
description: Test AI agent for VS Code extension testing
technical:
  type: agent
  framework: openai
  models:
    - gpt-4
classification:
  riskLevel: limited
  riskFactors:
    autonomousDecisions: false
    customerFacing: true
    toolExecution: false
    externalDataAccess: true
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

# Open in VS Code
code .
```

---

## 2. Extension Activation Tests

### 2.1 Activation Events

The extension activates on these events:
- `workspaceContains:**/*.py`
- `workspaceContains:**/*.ts`
- `workspaceContains:**/*.js`
- `workspaceContains:.aigrc.yaml`

| Test ID | Test Case | Steps | Expected Result |
|---------|-----------|-------|-----------------|
| ACT-01 | Activate on Python file | Open workspace with .py file | Extension activates, "AIGRC extension is now active" in Output |
| ACT-02 | Activate on TypeScript file | Open workspace with .ts file | Extension activates |
| ACT-03 | Activate on JavaScript file | Open workspace with .js file | Extension activates |
| ACT-04 | Activate on .aigrc.yaml | Open workspace with .aigrc.yaml | Extension activates |
| ACT-05 | No activation | Open workspace with only .txt files | Extension does NOT activate |

### 2.2 Initialization Detection

| Test ID | Test Case | Steps | Expected Result |
|---------|-----------|-------|-----------------|
| INIT-01 | Detect initialized workspace | Open workspace with .aigrc.yaml | "aigrc.initialized" context set to true |
| INIT-02 | Detect uninitialized workspace | Open workspace without .aigrc.yaml | "aigrc.initialized" context set to false |
| INIT-03 | Tree view visibility | Open initialized workspace | "AI Assets" tree view visible in Explorer |
| INIT-04 | Tree view hidden | Open uninitialized workspace | "AI Assets" tree view not visible |

---

## 3. Command Tests

### 3.1 Scan Command (`aigrc.scan`)

| Test ID | Test Case | Steps | Expected Result |
|---------|-----------|-------|-----------------|
| SCAN-01 | Run scan command | Cmd+Shift+P > "AIGRC: Scan Workspace for AI Assets" | Scan completes, shows notification with results |
| SCAN-02 | Auto-scan on open | Open workspace with aigrc.autoScan=true | Scan runs automatically |
| SCAN-03 | No auto-scan | Set aigrc.autoScan=false, open workspace | No automatic scan |
| SCAN-04 | Scan detects frameworks | Scan workspace with AI imports | Detections shown: OpenAI, LangChain, Anthropic |
| SCAN-05 | Scan empty workspace | Scan workspace without AI code | "No AI frameworks detected" message |

### 3.2 Init Command (`aigrc.init`)

| Test ID | Test Case | Steps | Expected Result |
|---------|-----------|-------|-----------------|
| INIT-CMD-01 | Initialize new workspace | Run "AIGRC: Initialize in Workspace" | Creates .aigrc.yaml and .aigrc/ directory |
| INIT-CMD-02 | Initialize already initialized | Run init in initialized workspace | Warning: "Workspace already initialized" or prompts to overwrite |
| INIT-CMD-03 | Verify config created | Check filesystem after init | .aigrc.yaml exists with default config |

### 3.3 Status Command (`aigrc.showStatus`)

| Test ID | Test Case | Steps | Expected Result |
|---------|-----------|-------|-----------------|
| STAT-01 | Show status | Run "AIGRC: Show Status" | Information panel shows asset count, risk levels |
| STAT-02 | Status with assets | Run status in workspace with asset cards | Lists all registered assets with risk levels |
| STAT-03 | Status without assets | Run status in workspace without cards | Shows "No assets registered" |

### 3.4 Validate Command (`aigrc.validateCard`)

| Test ID | Test Case | Steps | Expected Result |
|---------|-----------|-------|-----------------|
| VAL-01 | Validate valid card | Open valid .yaml asset card, run "AIGRC: Validate Asset Card" | "Asset card is valid" notification |
| VAL-02 | Validate invalid card | Open malformed YAML, run validate | Error notification with validation issues |
| VAL-03 | Validate non-card file | Open non-asset YAML, run validate | Appropriate error message |
| VAL-04 | Validate from tree view | Right-click asset in tree view > Validate | Validation runs on selected asset |

### 3.5 Create Card Command (`aigrc.createCard`)

| Test ID | Test Case | Steps | Expected Result |
|---------|-----------|-------|-----------------|
| CREATE-01 | Create new card | Run "AIGRC: Create Asset Card" | Opens input prompts for asset details |
| CREATE-02 | Fill card wizard | Complete all prompts in wizard | New .yaml file created in .aigrc/cards/ |
| CREATE-03 | Cancel creation | Start wizard, press Escape | No file created |
| CREATE-04 | Create with scan data | After scan, run create card | Pre-fills detected framework info |

---

## 4. UI Component Tests

### 4.1 Asset Tree View

| Test ID | Test Case | Steps | Expected Result |
|---------|-----------|-------|-----------------|
| TREE-01 | Tree view loads | Open initialized workspace | Tree view shows in Explorer sidebar |
| TREE-02 | Assets listed | Workspace has asset cards | Each card appears as tree item |
| TREE-03 | Risk level icons | View tree with various risk assets | Correct icons: green (minimal), yellow (limited), orange (high), red (unacceptable) |
| TREE-04 | Expand asset | Click expand on asset | Shows asset details (framework, owner, etc.) |
| TREE-05 | Refresh tree | Click refresh button | Tree reloads from disk |
| TREE-06 | Open asset card | Double-click asset in tree | Opens .yaml file in editor |
| TREE-07 | Collapse all | Click "Collapse All" button | All tree nodes collapsed |

### 4.2 Code Lens Provider

| Test ID | Test Case | Steps | Expected Result |
|---------|-----------|-------|-----------------|
| LENS-01 | Code lens on asset card | Open .aigrc/cards/*.yaml file | Code lens appears above `name:` field |
| LENS-02 | Validate lens action | Click "Validate" code lens | Runs validation, shows result |
| LENS-03 | Risk level lens | Open asset card | Shows risk level in code lens |
| LENS-04 | No lens on non-asset | Open regular .yaml file | No AIGRC code lens shown |

### 4.3 Diagnostics Provider

| Test ID | Test Case | Steps | Expected Result |
|---------|-----------|-------|-----------------|
| DIAG-01 | Invalid schema warning | Open asset card with missing required field | Diagnostic warning underlines issue |
| DIAG-02 | Valid card no warnings | Open valid asset card | No diagnostic warnings |
| DIAG-03 | Real-time updates | Edit asset card, introduce error | Warning appears without manual validation |
| DIAG-04 | Problems panel | View Problems panel (Cmd+Shift+M) | AIGRC diagnostics listed |
| DIAG-05 | Quick fix suggestions | Hover over diagnostic | Quick fix options available |

### 4.4 File System Watcher

| Test ID | Test Case | Steps | Expected Result |
|---------|-----------|-------|-----------------|
| WATCH-01 | Detect file changes | Modify .py/.ts/.js file externally | Diagnostics update |
| WATCH-02 | New AI file added | Add new file with AI imports | Tree view updates |
| WATCH-03 | Asset card modified | Edit asset card externally | Tree view refreshes |

---

## 5. Configuration Tests

### 5.1 Extension Settings

Access via: File > Preferences > Settings > Extensions > AIGRC

| Test ID | Setting | Test Steps | Expected Result |
|---------|---------|------------|-----------------|
| CFG-01 | `aigrc.autoScan` | Set to false, reopen workspace | No auto-scan on open |
| CFG-02 | `aigrc.autoScan` | Set to true, reopen workspace | Scan runs on open |
| CFG-03 | `aigrc.showInlineWarnings` | Set to false | No inline diagnostics shown |
| CFG-04 | `aigrc.showInlineWarnings` | Set to true | Inline warnings appear |
| CFG-05 | `aigrc.cardsDirectory` | Set to custom path | Extension uses custom path for cards |
| CFG-06 | Default cards directory | Leave default | Uses `.aigrc/cards` |

---

## 6. Integration Tests

### 6.1 Full Workflow: New Project

```
1. Open empty folder in VS Code
2. Create ai_code.py with: import openai
3. Verify extension activates
4. Run "AIGRC: Scan Workspace"
   - Expected: Detects OpenAI framework
5. Run "AIGRC: Initialize in Workspace"
   - Expected: Creates .aigrc.yaml
6. Run "AIGRC: Create Asset Card"
   - Expected: Wizard prompts for details
7. Fill wizard with test data
   - Expected: Card created in .aigrc/cards/
8. Verify tree view shows new asset
9. Open card, verify code lens appears
10. Run "AIGRC: Show Status"
    - Expected: Shows 1 asset with correct risk level
```

### 6.2 Full Workflow: Existing Project

```
1. Clone repository with existing .aigrc setup
2. Open in VS Code
3. Verify extension activates
4. Verify tree view shows existing assets
5. Verify diagnostics run on asset cards
6. Modify an asset card
7. Verify diagnostics update
8. Run validation
9. Check Problems panel
```

### 6.3 Multi-Root Workspace

| Test ID | Test Case | Steps | Expected Result |
|---------|-----------|-------|-----------------|
| MULTI-01 | Multiple folders | Open multi-root workspace | Extension works in each folder |
| MULTI-02 | Mixed initialized | One folder with .aigrc, one without | Tree shows assets from initialized folder |
| MULTI-03 | Scan all folders | Run scan | Scans all workspace folders |

---

## 7. Error Handling Tests

| Test ID | Error Scenario | Steps | Expected Result |
|---------|----------------|-------|-----------------|
| ERR-01 | Corrupted YAML | Open malformed .aigrc.yaml | Graceful error, suggests fix |
| ERR-02 | Missing @aigrc/core | Remove core dependency | Clear error message |
| ERR-03 | Permission denied | Read-only .aigrc directory | Error on write operations |
| ERR-04 | Large workspace | Open workspace with 10k+ files | Scan completes (may be slow) |
| ERR-05 | No workspace | Open VS Code without folder | Commands disabled or show message |

---

## 8. Performance Tests

| Test ID | Test Case | Acceptance Criteria |
|---------|-----------|---------------------|
| PERF-01 | Extension activation | < 500ms |
| PERF-02 | Scan small project (100 files) | < 2s |
| PERF-03 | Scan medium project (1000 files) | < 10s |
| PERF-04 | Tree view load | < 200ms |
| PERF-05 | Diagnostics update | < 100ms after file change |
| PERF-06 | Memory usage | < 100MB additional |

---

## 9. Accessibility Tests

| Test ID | Test Case | Steps | Expected Result |
|---------|-----------|-------|-----------------|
| A11Y-01 | Keyboard navigation | Navigate tree view with keyboard | All items accessible |
| A11Y-02 | Screen reader | Use VS Code with screen reader | Tree items announced correctly |
| A11Y-03 | High contrast theme | Switch to high contrast | All UI elements visible |
| A11Y-04 | Command palette | Search AIGRC commands | All commands discoverable |

---

## 10. Test Checklist

- [ ] **Activation**
  - [ ] ACT-01: Python file activation
  - [ ] ACT-02: TypeScript file activation
  - [ ] ACT-03: JavaScript file activation
  - [ ] ACT-04: .aigrc.yaml activation
  - [ ] ACT-05: No false activation

- [ ] **Commands**
  - [ ] SCAN-01 through SCAN-05
  - [ ] INIT-CMD-01 through INIT-CMD-03
  - [ ] STAT-01 through STAT-03
  - [ ] VAL-01 through VAL-04
  - [ ] CREATE-01 through CREATE-04

- [ ] **UI Components**
  - [ ] TREE-01 through TREE-07
  - [ ] LENS-01 through LENS-04
  - [ ] DIAG-01 through DIAG-05
  - [ ] WATCH-01 through WATCH-03

- [ ] **Configuration**
  - [ ] CFG-01 through CFG-06

- [ ] **Integration**
  - [ ] Full workflow: New project
  - [ ] Full workflow: Existing project
  - [ ] Multi-root workspace

- [ ] **Error Handling**
  - [ ] ERR-01 through ERR-05

- [ ] **Performance**
  - [ ] PERF-01 through PERF-06

---

## 11. Known Issues & Limitations

1. Tree view only refreshes on explicit refresh or file change events
2. Large workspaces may experience slow initial scan
3. Multi-root workspace support is limited to first folder for some features

---

## 12. Debugging Tips

### View Extension Logs

1. Open Output panel (View > Output)
2. Select "AIGRC" from dropdown
3. View extension logs

### Debug Mode

1. Open extension in VS Code
2. Set breakpoints in TypeScript files
3. Press F5 to launch Extension Development Host
4. Trigger commands to hit breakpoints

### Common Issues

| Issue | Solution |
|-------|----------|
| Extension not activating | Check activation events, verify file types exist |
| Tree view empty | Check .aigrc/cards directory exists and contains .yaml files |
| Commands not appearing | Reload VS Code window (Cmd+Shift+P > "Reload Window") |
| Diagnostics not updating | Check "Show Inline Warnings" setting |
