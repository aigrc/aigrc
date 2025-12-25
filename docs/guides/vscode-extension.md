# VS Code Extension Guide

Complete guide for the AIGRC VS Code extension.

## Overview

The AIGRC VS Code extension brings AI governance directly into your development workflow with:

- **Tree View** - See all AI assets in the Explorer sidebar
- **Code Lens** - Risk information displayed in asset card files
- **Diagnostics** - Real-time validation and warnings
- **Commands** - Scan, initialize, and manage assets from VS Code

## Installation

### From Marketplace

1. Open VS Code
2. Press `Ctrl+Shift+X` (Windows/Linux) or `Cmd+Shift+X` (macOS)
3. Search for "AIGRC"
4. Click **Install**

### From Command Line

```bash
code --install-extension aigrc.aigrc-vscode
```

## Features

### AI Assets Tree View

The extension adds an "AI Assets" view to the Explorer sidebar, showing all registered assets:

```
AI ASSETS
├── 🔴 Fraud Detection Model (unacceptable)
│   └── High-risk AI system
├── 🟠 Customer Support Bot (high)
│   └── Transparency obligations
├── 🟡 Analytics Service (limited)
│   └── Limited risk
└── 🟢 Internal Tools (minimal)
    └── Minimal risk
```

**Features:**
- Color-coded risk level icons
- Click to open asset card file
- Sorted by risk level (highest first)
- Auto-refreshes when cards change
- Rich tooltips with full details

### Code Lens

When viewing asset card YAML files, Code Lens provides inline information:

```yaml
# 🟡 Risk Level: LIMITED | 🇪🇺 EU AI Act: Transparency obligations | ✓ Validate
# ⚠ Risk Factors: Customer-Facing, External Data

id: asset-abc123
name: Customer Support Bot
version: "1.0"
...
```

**Code Lens Actions:**
- Click risk level for details
- Click "Validate" to check the card
- View active risk factors at a glance

### Diagnostics

Real-time validation and warnings appear in the Problems panel:

| Severity | Example |
|----------|---------|
| Error | "Missing required field: ownership.owner.email" |
| Error | "Unacceptable risk level: Review required" |
| Warning | "High risk level detected. EU AI Act: High-risk AI system" |
| Info | "Missing description field (recommended)" |

Diagnostics update automatically when you:
- Save an asset card file
- Create a new asset card
- Run a scan

### Commands

Access via Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`):

| Command | Description |
|---------|-------------|
| `AIGRC: Scan Workspace for AI Assets` | Scan codebase for AI/ML frameworks |
| `AIGRC: Initialize in Workspace` | Initialize AIGRC with asset card |
| `AIGRC: Show Status` | Display governance status panel |
| `AIGRC: Validate Asset Card` | Validate all asset cards |
| `AIGRC: Create Asset Card` | Create new asset card interactively |

#### Scan Workspace

Scans your project for AI/ML frameworks and shows results:

1. Press `Ctrl+Shift+P`
2. Type "AIGRC: Scan"
3. Press Enter

Results display in a WebView panel with:
- Summary statistics
- Detected frameworks table
- Inferred risk factors
- Option to create asset card

#### Initialize

Sets up AIGRC in your workspace:

1. Scans for AI frameworks
2. Prompts for asset details
3. Creates `.aigrc.yaml` and asset card
4. Enables the AI Assets tree view

#### Create Asset Card

Interactive wizard for creating new asset cards:

1. Enter asset name
2. Add description (optional)
3. Select asset type
4. Choose primary framework
5. Enter owner details
6. Select risk factors
7. Card is created and opened

## Configuration

### Settings

Configure in VS Code Settings (`Ctrl+,`):

```json
{
  // Automatically scan workspace when opened
  "aigrc.autoScan": true,

  // Show inline warnings for AI code
  "aigrc.showInlineWarnings": true,

  // Directory for asset cards
  "aigrc.cardsDirectory": ".aigrc/cards"
}
```

### Settings Reference

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `aigrc.autoScan` | boolean | `true` | Scan workspace automatically on open |
| `aigrc.showInlineWarnings` | boolean | `true` | Show diagnostics for AI detections |
| `aigrc.cardsDirectory` | string | `.aigrc/cards` | Path to asset cards directory |

## Workflows

### New Project Setup

1. Open your project in VS Code
2. Run `AIGRC: Initialize in Workspace`
3. Follow the prompts to create your first asset card
4. View your assets in the AI Assets tree view

### Adding a New AI Component

1. Run `AIGRC: Scan Workspace` to detect the new framework
2. Run `AIGRC: Create Asset Card`
3. Fill in the asset details
4. Review the generated risk classification

### Reviewing AI Governance

1. Open the AI Assets tree view in Explorer
2. Click on any asset to view its card
3. Review Code Lens for risk information
4. Check the Problems panel for issues
5. Run `AIGRC: Validate Asset Card` for full validation

### Before Committing

1. Run `AIGRC: Validate Asset Card`
2. Fix any errors in the Problems panel
3. Review high-risk assets
4. Commit with confidence

## Keyboard Shortcuts

You can add custom keyboard shortcuts in `keybindings.json`:

```json
[
  {
    "key": "ctrl+shift+a s",
    "command": "aigrc.scan"
  },
  {
    "key": "ctrl+shift+a v",
    "command": "aigrc.validateCard"
  },
  {
    "key": "ctrl+shift+a c",
    "command": "aigrc.createCard"
  }
]
```

## Workspace Recommendations

Add to `.vscode/extensions.json` to recommend the extension:

```json
{
  "recommendations": [
    "aigrc.aigrc-vscode"
  ]
}
```

## Troubleshooting

### Extension Not Activating

The extension activates when:
- Workspace contains `.py`, `.ts`, or `.js` files
- Workspace contains `.aigrc.yaml`

Check the Output panel (View > Output > select "AIGRC") for logs.

### Tree View Not Showing

The AI Assets tree view only appears when:
- AIGRC is initialized (`aigrc.initialized` context is true)
- At least one asset card exists

Run `AIGRC: Initialize in Workspace` to set up.

### Diagnostics Not Updating

Try:
1. Save the file
2. Run `AIGRC: Validate Asset Card`
3. Reload window (`Ctrl+Shift+P` > "Developer: Reload Window")

### Scan Not Finding Frameworks

Ensure:
- Files aren't in excluded directories (node_modules, dist, etc.)
- File extensions are supported (.py, .ts, .js, .tsx, .jsx)
- Patterns are using correct import syntax

## Integration with Other Tools

### GitLens

Asset cards are regular YAML files, so GitLens will show:
- Who created/modified the card
- Change history
- Blame annotations

### YAML Extension

Install the YAML extension for:
- Syntax highlighting
- Schema validation
- Auto-completion

### Prettier

Format asset cards with Prettier:

```json
// .prettierrc
{
  "overrides": [
    {
      "files": ".aigrc/cards/*.yaml",
      "options": {
        "tabWidth": 2,
        "singleQuote": false
      }
    }
  ]
}
```

## Next Steps

- [CLI Guide](./cli.md) - Command-line reference
- [GitHub Action Guide](./github-action.md) - CI/CD integration
- [Detection Engine Guide](./detection-engine.md) - How detection works
