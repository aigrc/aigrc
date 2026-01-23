# Module 2.2: VS Code Extension

> **Duration:** 30-45 minutes
> **Level:** Core Skills
> **Prerequisites:** Level 1 complete, Module 2.1 recommended

---

## Learning Objectives

By the end of this module, you will be able to:
1. Install and configure the AIGRC VS Code extension
2. Use the AI Assets tree view to navigate governance
3. Leverage code lens and diagnostics for real-time feedback
4. Apply quick fixes for policy violations
5. Configure extension settings for your workflow

---

## WHY: IDE-First Governance (10 min)

### The Developer Experience Gap

**Without IDE Integration:**
```
Developer writes AI code
        ↓
Commits and pushes
        ↓
CI/CD fails (policy violation)
        ↓
Developer confused, checks logs
        ↓
Finds violation, fixes, pushes again
        ↓
Repeat...

Time wasted: 15-30 minutes per violation
```

**With VS Code Extension:**
```
Developer writes AI code
        ↓
Real-time warning appears
        ↓
Quick fix applied
        ↓
Code is compliant before commit

Time wasted: 0 minutes
```

### Extension Capabilities

| Feature | Benefit |
|---------|---------|
| **Tree View** | See all AI assets at a glance |
| **Code Lens** | Quick actions above AI imports |
| **Diagnostics** | Real-time warnings in Problems panel |
| **Quick Fixes** | One-click remediation |
| **File Watcher** | Auto-scan on file changes |

---

## WHAT: Extension Features (10 min)

### 1. AI Assets Tree View

```
AIGRC
├── 📦 Registered Assets (3)
│   ├── 🟢 customer-chatbot (limited)
│   ├── 🟡 fraud-detector (high) ⚠️
│   └── 🟢 doc-classifier (minimal)
│
├── ⚠️ Unregistered Detections (2)
│   ├── pytorch (ml/model.py)
│   └── huggingface (ml/bert.py)
│
└── 📋 Governance Status
    ├── Coverage: 60%
    └── Policy: Valid ✅
```

### 2. Code Lens

Above AI imports, you'll see actionable links:

```python
# 👁️ View Asset Card | 📝 Edit Card | 🏷️ Classify
import openai

# ⚠️ Unregistered | 📝 Register | 🏷️ Classify
from langchain import LLM
```

### 3. Diagnostics

In the Problems panel:

```
⚠️ Warning: Vendor 'cohere' not in allowed_vendors (line 5)
   src/ai/embeddings.ts

ℹ️ Info: Asset 'fraud-detector' missing human_oversight details
   .aigrc/cards/fraud-detector.asset.yaml
```

### 4. Quick Fixes

Right-click on a diagnostic:
- Replace with approved vendor
- Register this AI system
- Suppress this warning
- Request approval

---

## HOW: Setup and Usage (20 min)

### Step 1: Install Extension

**From VS Code:**
1. Open Extensions (Ctrl+Shift+X / Cmd+Shift+X)
2. Search "AIGRC"
3. Click Install

**From Marketplace:**
```bash
code --install-extension aigrc.aigrc-vscode
```

### Step 2: Open a Project

1. Open a folder with AI/ML code
2. Wait for activation (automatic for .py, .ts, .js files)
3. Look for AIGRC in the Activity Bar

### Step 3: Initial Scan

**Automatic:** Extension scans on workspace open if `aigrc.autoScan` is enabled

**Manual:**
1. Open Command Palette (Ctrl+Shift+P / Cmd+Shift+P)
2. Type "AIGRC: Scan Workspace"
3. Press Enter

### Step 4: Explore Tree View

Click the AIGRC icon in the Activity Bar:

```
AIGRC
├── 📦 Registered Assets
│   └── Click to view asset card
│
├── ⚠️ Unregistered Detections
│   └── Click to navigate to code
│
└── 📋 Governance Status
    └── Click to open status panel
```

**Context Menu Actions:**
- Right-click asset → "Validate Asset Card"
- Right-click detection → "Register This Asset"
- Right-click status → "Run Full Scan"

### Step 5: Use Code Lens

Navigate to a file with AI imports:

```python
# When you see:
# 📝 Register | 🏷️ Classify
import openai

# Click "Register" to open registration wizard
# Click "Classify" to determine risk level
```

**For Registered Assets:**
```python
# When you see:
# 👁️ View Card | ✏️ Edit | ✅ Compliant
import openai

# Click "View Card" to see asset YAML
# Click "Edit" to modify in editor
```

### Step 6: Handle Diagnostics

When you see a warning:

```typescript
import Cohere from 'cohere-ai';  // 🔴 Squiggly underline
```

1. Hover to see the issue:
   ```
   Vendor 'cohere' not in allowed_vendors
   Approved alternatives: openai, anthropic
   ```

2. Click the lightbulb (or Ctrl+.) for quick fixes:
   - Replace with 'openai'
   - Replace with 'anthropic'
   - Request vendor approval
   - Suppress warning for this file

### Step 7: Policy Violations

When `governance.lock` exists:

1. **Real-time checking:** Violations appear as you type
2. **Problems panel:** All violations listed
3. **Quick navigation:** Click to jump to violation

```
PROBLEMS
├── Errors (1)
│   └── Vendor 'cohere' blocked by policy (src/ai/embed.ts:5)
│
└── Warnings (2)
    ├── Asset 'chatbot' missing transparency disclosure
    └── Model 'gpt-3.5-turbo' deprecated
```

### Step 8: Commands

Open Command Palette (Ctrl+Shift+P) and type "AIGRC":

| Command | Description |
|---------|-------------|
| AIGRC: Scan Workspace | Run full detection scan |
| AIGRC: Initialize | Set up governance |
| AIGRC: Show Status | Open status panel |
| AIGRC: Validate All | Validate all asset cards |
| AIGRC: Create Asset Card | Register new asset |
| AIGRC: Check Policy | Run policy compliance check |

---

## Configuration (5 min)

### Settings

Open Settings (Ctrl+,) and search "aigrc":

| Setting | Default | Description |
|---------|---------|-------------|
| `aigrc.autoScan` | `true` | Scan on workspace open |
| `aigrc.showInlineWarnings` | `true` | Show inline diagnostics |
| `aigrc.cardsDirectory` | `.aigrc/cards` | Asset cards location |
| `aigrc.governanceLockPath` | `governance.lock` | Policy lock location |
| `aigrc.showPolicyViolations` | `true` | Show policy violations |

### settings.json Example

```json
{
  "aigrc.autoScan": true,
  "aigrc.showInlineWarnings": true,
  "aigrc.cardsDirectory": ".aigrc/cards",
  "aigrc.governanceLockPath": "governance.lock",
  "aigrc.showPolicyViolations": true
}
```

### Workspace Settings

For project-specific settings, use `.vscode/settings.json`:

```json
{
  "aigrc.cardsDirectory": "governance/assets",
  "aigrc.autoScan": false
}
```

---

## Practice Lab (10 min)

### Exercise 1: Extension Setup

1. Install the AIGRC VS Code extension
2. Open a project with AI code
3. Observe automatic scan
4. Explore the tree view

### Exercise 2: Code Lens Workflow

1. Navigate to an AI import
2. Click "Register" in code lens
3. Complete registration wizard
4. Verify asset appears in tree view

### Exercise 3: Quick Fix

1. Add a non-compliant import:
   ```python
   from cohere import Client
   ```
2. Observe the diagnostic
3. Use quick fix to replace with approved vendor
4. Verify warning disappears

---

## Knowledge Check

1. **The AI Assets tree view shows:**
   - a) Only registered assets
   - b) Registered assets and unregistered detections ✓
   - c) Only unregistered detections
   - d) File structure only

2. **Code lens appears:**
   - a) In the terminal
   - b) Above AI imports ✓
   - c) In the status bar
   - d) In notifications

3. **Quick fixes are accessed by:**
   - a) Right-clicking only
   - b) Keyboard shortcut only
   - c) Lightbulb icon or Ctrl+. ✓
   - d) Command palette only

4. **To disable auto-scan:**
   - a) Uninstall the extension
   - b) Set `aigrc.autoScan: false` ✓
   - c) Delete the config file
   - d) Close VS Code

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Extension not activating | Check for .py/.ts/.js files |
| Tree view empty | Run manual scan |
| Diagnostics not showing | Check `showInlineWarnings` setting |
| Code lens missing | Check language is supported |

---

## Next Module

[Module 2.3: GitHub Actions →](./03-github-actions.md)

---

*Module 2.2 - AIGRC Training Program v1.0*
