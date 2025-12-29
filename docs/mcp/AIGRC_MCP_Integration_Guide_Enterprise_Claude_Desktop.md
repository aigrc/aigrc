# AIGRC MCP Integration Guide
## Enterprise Integration for Claude Desktop & Cursor IDE

**Document Version:** 2.0  
**Last Updated:** December 28, 2025  
**Classification:** Internal - Technical Documentation  
**Maintainer:** AI Governance, Safety & Reliability Team

---

## Document Control

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2025-09-15 | AIGRC Team | Initial release |
| 2.0 | 2025-12-28 | AIGRC Team | Enterprise-grade revision with expanded troubleshooting, security guidance, and architecture details |

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Introduction & Background](#2-introduction--background)
3. [Architecture Overview](#3-architecture-overview)
4. [System Requirements & Prerequisites](#4-system-requirements--prerequisites)
5. [Part 1: Claude Desktop Integration](#5-part-1-claude-desktop-integration)
6. [Part 2: Cursor IDE Integration](#6-part-2-cursor-ide-integration)
7. [Configuration Reference](#7-configuration-reference)
8. [Asset Card Specification](#8-asset-card-specification)
9. [Security Considerations](#9-security-considerations)
10. [Verification & Testing](#10-verification--testing)
11. [Troubleshooting Guide](#11-troubleshooting-guide)
12. [Performance Optimization](#12-performance-optimization)
13. [Migration & Upgrades](#13-migration--upgrades)
14. [Example Workflows](#14-example-workflows)
15. [Support & Escalation](#15-support--escalation)
16. [Appendices](#16-appendices)

---

## 1. Executive Summary

### 1.1 Purpose

This document provides comprehensive, step-by-step instructions for integrating the AIGRC (AI Governance, Risk & Compliance) MCP Server with Claude Desktop and Cursor IDE. The integration enables AI governance capabilities directly within developer workflows, supporting compliance checking, risk assessment, and policy enforcement for AI systems.

### 1.2 Audience

This guide is intended for:

- **Platform Engineers** responsible for developer tooling infrastructure
- **DevOps/MLOps Teams** implementing CI/CD pipelines for AI systems
- **AI/ML Engineers** building and deploying AI assets
- **Compliance Officers** requiring audit and governance capabilities
- **Security Teams** enforcing AI safety policies

### 1.3 Key Outcomes

Upon successful completion of this guide, you will have:

1. A fully functional AIGRC MCP server integrated with Claude Desktop and/or Cursor IDE
2. The ability to perform AI governance checks directly from your development environment
3. Access to 26 governance tools covering deployment readiness, compliance, and risk assessment
4. Configured compliance profiles for frameworks such as EU AI Act and NIST AI RMF
5. Optional Golden Thread integration with Jira or Azure DevOps for traceability

### 1.4 Time Estimate

| Task | Estimated Time |
|------|----------------|
| Prerequisites verification | 15-30 minutes |
| Claude Desktop integration | 10-15 minutes |
| Cursor IDE integration | 10-15 minutes |
| Testing & verification | 20-30 minutes |
| **Total (single platform)** | **45-75 minutes** |
| **Total (both platforms)** | **60-90 minutes** |

---

## 2. Introduction & Background

### 2.1 What is AIGRC?

**AIGRC** (AI Governance, Risk & Compliance) is an enterprise-grade platform for managing AI systems throughout their lifecycle. It provides:

- **Asset Registry**: Centralized inventory of all AI systems with metadata
- **Compliance Management**: Automated checks against regulatory frameworks (EU AI Act, NIST AI RMF, ISO 42001)
- **Risk Assessment**: Classification and tracking of AI system risks
- **Policy Enforcement**: Guardrails and gates for AI deployments
- **Audit Trail**: Complete history of governance decisions and changes
- **Golden Thread**: Traceability from business intent to deployed system

### 2.2 What is MCP (Model Context Protocol)?

The **Model Context Protocol** is an open standard that enables AI assistants to securely interact with external tools and data sources. MCP provides:

- **Standardized Communication**: Uniform interface between AI models and tools
- **Tool Discovery**: Dynamic enumeration of available capabilities
- **Secure Execution**: Sandboxed execution environment for tool calls
- **Context Sharing**: Efficient passing of relevant information between components

MCP operates on a client-server architecture where:
- **MCP Client**: The AI assistant (Claude, Cursor AI, etc.)
- **MCP Server**: The tool provider (AIGRC in this case)

### 2.3 Why Integrate AIGRC with Development Tools?

Integrating AIGRC with Claude Desktop and Cursor IDE enables **"shift-left" governance**, bringing compliance and risk checks directly into the developer workflow:

| Traditional Approach | Integrated Approach |
|---------------------|---------------------|
| Governance checks at deployment | Governance checks during development |
| Separate compliance tools | In-IDE governance assistance |
| Manual documentation | AI-assisted artifact generation |
| Reactive issue detection | Proactive issue prevention |
| Siloed governance team | Embedded governance support |

**Business Value:**
- Reduce governance-related deployment delays by up to 70%
- Identify compliance gaps before code review
- Automate generation of required governance artifacts
- Provide developers with real-time guidance on AI regulations

### 2.4 Supported Compliance Frameworks

AIGRC supports the following regulatory and industry frameworks out of the box:

| Framework | Profile ID | Description |
|-----------|------------|-------------|
| EU AI Act | `eu-ai-act` | European Union Artificial Intelligence Act requirements |
| NIST AI RMF | `nist-rmf` | NIST AI Risk Management Framework |
| ISO 42001 | `iso-42001` | AI Management System Standard |
| IEEE 7000 | `ieee-7000` | Model Process for Addressing Ethical Concerns |
| SOC 2 AI | `soc2-ai` | AI-specific SOC 2 controls |
| Custom | `custom-*` | Organization-specific policies |

---

## 3. Architecture Overview

### 3.1 System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           DEVELOPER WORKSTATION                             │
│  ┌───────────────────────────────────┐  ┌─────────────────────────────────┐│
│  │        CLAUDE DESKTOP             │  │          CURSOR IDE             ││
│  │  ┌─────────────────────────────┐  │  │  ┌───────────────────────────┐  ││
│  │  │     Claude AI Assistant     │  │  │  │    Cursor AI Assistant    │  ││
│  │  │  (Natural Language Interface)│  │  │  │   (Code-Aware Context)    │  ││
│  │  └──────────────┬──────────────┘  │  │  └─────────────┬─────────────┘  ││
│  │                 │ MCP Protocol     │  │               │ MCP Protocol    ││
│  │                 ▼                  │  │               ▼                 ││
│  │  ┌─────────────────────────────┐  │  │  ┌───────────────────────────┐  ││
│  │  │       MCP Client Layer      │  │  │  │      MCP Client Layer     │  ││
│  │  │  (JSON-RPC over stdio)      │  │  │  │   (JSON-RPC over stdio)   │  ││
│  │  └──────────────┬──────────────┘  │  │  └─────────────┬─────────────┘  ││
│  └─────────────────┼──────────────────┘  └───────────────┼─────────────────┘│
│                    │                                      │                  │
│                    └──────────────┬───────────────────────┘                  │
│                                   │                                          │
│                                   ▼                                          │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │                        AIGRC MCP SERVER                                │  │
│  │  ┌─────────────────────────────────────────────────────────────────┐  │  │
│  │  │                      Tool Handler Layer                          │  │  │
│  │  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌────────────┐ │  │  │
│  │  │  │ Deployment  │ │  Blocker    │ │ Compliance  │ │   Policy   │ │  │  │
│  │  │  │  Readiness  │ │  Detection  │ │   Checks    │ │   Engine   │ │  │  │
│  │  │  └─────────────┘ └─────────────┘ └─────────────┘ └────────────┘ │  │  │
│  │  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌────────────┐ │  │  │
│  │  │  │ Checkpoint  │ │    Risk     │ │   Golden    │ │   Cost     │ │  │  │
│  │  │  │   Manager   │ │ Assessment  │ │   Thread    │ │ Estimator  │ │  │  │
│  │  │  └─────────────┘ └─────────────┘ └─────────────┘ └────────────┘ │  │  │
│  │  └─────────────────────────────────────────────────────────────────┘  │  │
│  │                                   │                                    │  │
│  │                                   ▼                                    │  │
│  │  ┌─────────────────────────────────────────────────────────────────┐  │  │
│  │  │                    Asset Card Registry                          │  │  │
│  │  │           (.aigrc/cards/*.yaml - Local File System)             │  │  │
│  │  └─────────────────────────────────────────────────────────────────┘  │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      │ (Optional External Integrations)
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         EXTERNAL SERVICES (Optional)                        │
│  ┌─────────────────────┐  ┌─────────────────────┐  ┌─────────────────────┐ │
│  │        JIRA         │  │   Azure DevOps      │  │   AIGRC Central     │ │
│  │  (Golden Thread)    │  │  (Golden Thread)    │  │   (Enterprise)      │ │
│  └─────────────────────┘  └─────────────────────┘  └─────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 3.2 Component Descriptions

#### 3.2.1 AIGRC MCP Server

The AIGRC MCP Server is a Node.js application that implements the Model Context Protocol specification. It:

- **Listens** on standard input/output (stdio) for JSON-RPC messages
- **Exposes** 26 governance tools organized into functional categories
- **Reads** asset card definitions from the local `.aigrc/cards/` directory
- **Executes** governance checks against configured compliance profiles
- **Integrates** (optionally) with external systems for traceability

#### 3.2.2 Asset Cards

Asset Cards are YAML files that describe AI systems under governance. Each card contains:

- **Metadata**: Name, description, version, ownership
- **Technical Details**: Model type, framework, entrypoint, dependencies
- **Classification**: Risk level, regulatory category, data sensitivity
- **Governance State**: Current status, required approvals, checkpoint history

#### 3.2.3 Compliance Profiles

Compliance Profiles define the rules and checks for a given regulatory framework. They specify:

- **Required Artifacts**: Documentation that must exist
- **Mandatory Approvals**: Sign-offs required at each stage
- **Technical Controls**: Security and safety requirements
- **Prohibited Patterns**: Configurations or uses that are disallowed

### 3.3 Communication Flow

```
┌─────────────┐                    ┌─────────────┐                    ┌─────────────┐
│    User     │                    │   Claude/   │                    │   AIGRC     │
│  (Developer)│                    │   Cursor    │                    │ MCP Server  │
└──────┬──────┘                    └──────┬──────┘                    └──────┬──────┘
       │                                  │                                  │
       │  1. "Check if my-agent          │                                  │
       │      is deployment ready"        │                                  │
       │─────────────────────────────────>│                                  │
       │                                  │                                  │
       │                                  │  2. tools/call                   │
       │                                  │     get_deployment_readiness     │
       │                                  │     {asset: "my-agent"}          │
       │                                  │─────────────────────────────────>│
       │                                  │                                  │
       │                                  │                                  │  3. Load asset
       │                                  │                                  │     card from
       │                                  │                                  │     .aigrc/cards/
       │                                  │                                  │
       │                                  │                                  │  4. Execute
       │                                  │                                  │     compliance
       │                                  │                                  │     checks
       │                                  │                                  │
       │                                  │  5. {                            │
       │                                  │       status: "blocked",         │
       │                                  │       blockers: [...],           │
       │                                  │       score: 65                  │
       │                                  │     }                            │
       │                                  │<─────────────────────────────────│
       │                                  │                                  │
       │  6. Natural language response:   │                                  │
       │     "Your agent has 3 blockers   │                                  │
       │      preventing deployment..."   │                                  │
       │<─────────────────────────────────│                                  │
       │                                  │                                  │
```

### 3.4 Data Flow Security

All communication between components follows these security principles:

1. **Local-Only by Default**: MCP communication uses stdio, never network
2. **No Credentials in Transit**: API tokens are read from environment variables, not passed through MCP
3. **Read-Only Asset Cards**: MCP server reads but does not modify local files
4. **Sandboxed Execution**: Tools operate within the configured workspace directory only

---

## 4. System Requirements & Prerequisites

### 4.1 Hardware Requirements

| Component | Minimum | Recommended |
|-----------|---------|-------------|
| CPU | 2 cores | 4+ cores |
| RAM | 4 GB | 8+ GB |
| Storage | 500 MB free | 2+ GB free |
| Network | Not required* | Broadband for external integrations |

*Network is only required for Golden Thread integrations (Jira/Azure DevOps)

### 4.2 Software Requirements

#### 4.2.1 Node.js

**Required Version:** Node.js 18.0.0 or later (LTS recommended)

**Verification:**
```bash
# Check if Node.js is installed and verify version
node --version
# Expected output: v18.x.x or v20.x.x or higher
```

**Installation (if not present):**

**Windows:**
1. Download installer from https://nodejs.org/
2. Run installer, accepting defaults
3. Restart any open terminals

**macOS:**
```bash
# Using Homebrew (recommended)
brew install node

# Or download from https://nodejs.org/
```

**Linux (Ubuntu/Debian):**
```bash
# Using NodeSource repository (recommended for latest LTS)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verify installation
node --version
npm --version
```

**Linux (RHEL/CentOS/Fedora):**
```bash
# Using NodeSource repository
curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -
sudo dnf install -y nodejs
```

#### 4.2.2 pnpm (Package Manager)

**Required Version:** pnpm 8.0.0 or later

**Verification:**
```bash
pnpm --version
# Expected output: 8.x.x or higher
```

**Installation:**
```bash
# Using npm (works on all platforms)
npm install -g pnpm

# Alternative: Using corepack (Node.js 16.10+)
corepack enable
corepack prepare pnpm@latest --activate
```

#### 4.2.3 AIGRC MCP Package

**Status Check:** Ensure the package is built before proceeding.

```bash
# Navigate to AIGRC installation directory
cd /path/to/aigrc

# Install dependencies
pnpm install

# Build the MCP package
pnpm run build

# Verify the binary exists
ls -la packages/mcp/dist/bin/aigrc-mcp.js
# Should show the file with execute permissions
```

**Expected Build Output:**
```
packages/mcp/dist/
├── bin/
│   └── aigrc-mcp.js        # Main executable (required)
├── lib/
│   ├── tools/              # Tool implementations
│   ├── resources/          # Resource handlers
│   └── index.js            # Entry point
└── types/                  # TypeScript definitions
```

#### 4.2.4 Claude Desktop

**Supported Versions:** Claude Desktop 1.0.0 or later

**Download:**
- **Windows/macOS:** https://claude.ai/download
- **Linux:** Available via AppImage or .deb package

**Installation Verification:**
1. Launch Claude Desktop
2. Sign in with your Anthropic account
3. Confirm you can start a new conversation

#### 4.2.5 Cursor IDE

**Supported Versions:** Cursor 0.40.0 or later

**Download:** https://cursor.sh/

**Installation Verification:**
1. Launch Cursor
2. Open a project folder
3. Confirm AI features are accessible (Cmd/Ctrl + K or Cmd/Ctrl + L)

### 4.3 Pre-Flight Checklist

Before proceeding, verify all prerequisites are met:

```bash
#!/bin/bash
# pre-flight-check.sh - Run this script to verify all prerequisites

echo "=== AIGRC MCP Integration Pre-Flight Check ==="
echo ""

# Check Node.js
echo -n "Node.js: "
if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version)
    NODE_MAJOR=$(echo $NODE_VERSION | cut -d'.' -f1 | tr -d 'v')
    if [ "$NODE_MAJOR" -ge 18 ]; then
        echo "✓ $NODE_VERSION"
    else
        echo "✗ $NODE_VERSION (requires v18+)"
    fi
else
    echo "✗ Not installed"
fi

# Check pnpm
echo -n "pnpm: "
if command -v pnpm &> /dev/null; then
    echo "✓ $(pnpm --version)"
else
    echo "✗ Not installed"
fi

# Check AIGRC build
echo -n "AIGRC MCP binary: "
AIGRC_BIN="${AIGRC_PATH:-./packages/mcp/dist/bin/aigrc-mcp.js}"
if [ -f "$AIGRC_BIN" ]; then
    echo "✓ Found at $AIGRC_BIN"
else
    echo "✗ Not found (run 'pnpm run build')"
fi

echo ""
echo "=== Pre-Flight Check Complete ==="
```

**Save and run:**
```bash
chmod +x pre-flight-check.sh
./pre-flight-check.sh
```

### 4.4 Obtaining the AIGRC MCP Server

If you don't have the AIGRC package yet:

**Option 1: Internal Package Registry (Enterprise)**
```bash
# If your organization hosts AIGRC internally
npm install @yourorg/aigrc-mcp --registry=https://npm.yourcompany.com
```

**Option 2: Git Clone (Development)**
```bash
git clone https://github.com/yourorg/aigrc.git
cd aigrc
pnpm install
pnpm run build
```

**Option 3: Pre-Built Binary (Enterprise Distribution)**
Contact your AI Governance team for the approved distribution method.

---

## 5. Part 1: Claude Desktop Integration

### 5.1 Overview

Claude Desktop integration enables natural language interaction with AIGRC governance tools. Developers can ask questions like "Is my-agent ready for deployment?" and receive comprehensive governance assessments.

### 5.2 Step 1: Locate Configuration File

Claude Desktop stores its configuration in a platform-specific location.

#### Windows

**Path:**
```
%APPDATA%\Claude\claude_desktop_config.json
```

**Typical expanded path:**
```
C:\Users\<username>\AppData\Roaming\Claude\claude_desktop_config.json
```

**How to access:**
1. Press `Win + R` to open Run dialog
2. Type `%APPDATA%\Claude` and press Enter
3. Look for `claude_desktop_config.json`

**Create directory if missing:**
```powershell
# PowerShell
New-Item -ItemType Directory -Force -Path "$env:APPDATA\Claude"
```

#### macOS

**Path:**
```
~/Library/Application Support/Claude/claude_desktop_config.json
```

**How to access:**
1. Open Finder
2. Press `Cmd + Shift + G`
3. Enter `~/Library/Application Support/Claude`
4. Look for `claude_desktop_config.json`

**Create directory if missing:**
```bash
mkdir -p ~/Library/Application\ Support/Claude
```

#### Linux

**Path:**
```
~/.config/Claude/claude_desktop_config.json
```

**How to access:**
```bash
cd ~/.config/Claude
ls -la
```

**Create directory if missing:**
```bash
mkdir -p ~/.config/Claude
```

### 5.3 Step 2: Determine AIGRC Binary Path

You need the **absolute path** to the AIGRC MCP binary.

**Find the path:**
```bash
# Navigate to your AIGRC installation
cd /path/to/aigrc

# Get the absolute path
pwd
# Example output: /home/user/projects/aigrc

# The binary path will be:
# /home/user/projects/aigrc/packages/mcp/dist/bin/aigrc-mcp.js
```

**Path formats by platform:**

| Platform | Example Path |
|----------|--------------|
| Windows | `C:/Users/username/aigrc/packages/mcp/dist/bin/aigrc-mcp.js` |
| macOS | `/Users/username/aigrc/packages/mcp/dist/bin/aigrc-mcp.js` |
| Linux | `/home/username/aigrc/packages/mcp/dist/bin/aigrc-mcp.js` |

> **Important (Windows):** Use forward slashes (`/`) in the JSON configuration, not backslashes (`\`).

### 5.4 Step 3: Configure Claude Desktop

Edit (or create) the `claude_desktop_config.json` file with the following content:

#### Minimal Configuration

```json
{
  "mcpServers": {
    "aigrc": {
      "command": "node",
      "args": [
        "/absolute/path/to/aigrc/packages/mcp/dist/bin/aigrc-mcp.js"
      ],
      "env": {
        "AIGRC_WORKSPACE": "/absolute/path/to/your/project"
      }
    }
  }
}
```

#### Recommended Configuration

```json
{
  "mcpServers": {
    "aigrc": {
      "command": "node",
      "args": [
        "/absolute/path/to/aigrc/packages/mcp/dist/bin/aigrc-mcp.js"
      ],
      "env": {
        "AIGRC_WORKSPACE": "/absolute/path/to/your/project",
        "AIGRC_CARDS_DIR": ".aigrc/cards",
        "AIGRC_PROFILES": "eu-ai-act",
        "AIGRC_LOG_LEVEL": "info"
      }
    }
  }
}
```

#### Full Configuration with External Integrations

```json
{
  "mcpServers": {
    "aigrc": {
      "command": "node",
      "args": [
        "/absolute/path/to/aigrc/packages/mcp/dist/bin/aigrc-mcp.js"
      ],
      "env": {
        "AIGRC_WORKSPACE": "/absolute/path/to/your/project",
        "AIGRC_CARDS_DIR": ".aigrc/cards",
        "AIGRC_PROFILES": "eu-ai-act,nist-rmf",
        "AIGRC_LOG_LEVEL": "info",
        "AIGRC_REDTEAM_ENABLED": "false",
        "JIRA_API_URL": "https://yourcompany.atlassian.net",
        "JIRA_API_TOKEN": "your-jira-api-token",
        "ADO_ORG_URL": "https://dev.azure.com/yourorg",
        "ADO_API_TOKEN": "your-ado-pat-token"
      }
    }
  }
}
```

#### Windows-Specific Example

```json
{
  "mcpServers": {
    "aigrc": {
      "command": "node",
      "args": [
        "C:/Users/jsmith/aigrc/packages/mcp/dist/bin/aigrc-mcp.js"
      ],
      "env": {
        "AIGRC_WORKSPACE": "C:/Users/jsmith/projects/my-ai-project",
        "AIGRC_PROFILES": "eu-ai-act",
        "AIGRC_LOG_LEVEL": "info"
      }
    }
  }
}
```

#### macOS-Specific Example

```json
{
  "mcpServers": {
    "aigrc": {
      "command": "node",
      "args": [
        "/Users/jsmith/aigrc/packages/mcp/dist/bin/aigrc-mcp.js"
      ],
      "env": {
        "AIGRC_WORKSPACE": "/Users/jsmith/projects/my-ai-project",
        "AIGRC_PROFILES": "eu-ai-act",
        "AIGRC_LOG_LEVEL": "info"
      }
    }
  }
}
```

### 5.5 Step 4: Validate Configuration

Before restarting Claude Desktop, validate your JSON:

**Online Validator:**
- https://jsonlint.com/

**Command Line (if jq is installed):**
```bash
# macOS/Linux
cat ~/.config/Claude/claude_desktop_config.json | jq .

# Windows (PowerShell with jq)
Get-Content "$env:APPDATA\Claude\claude_desktop_config.json" | jq .
```

**Common JSON Errors:**
- Missing commas between properties
- Trailing commas after last property
- Unescaped backslashes in Windows paths (use `/` instead)
- Missing quotes around string values

### 5.6 Step 5: Restart Claude Desktop

A simple window close does not restart the MCP server. You must fully quit the application.

**Windows:**
1. Right-click Claude icon in system tray
2. Select "Quit" or "Exit"
3. Verify in Task Manager that no Claude processes remain
4. Relaunch Claude Desktop

**macOS:**
1. Click Claude in menu bar
2. Select "Quit Claude" (or press `Cmd + Q`)
3. Verify in Activity Monitor that no Claude processes remain
4. Relaunch Claude Desktop from Applications

**Linux:**
1. Close Claude Desktop window
2. Check for running processes:
   ```bash
   pgrep -f claude
   # If processes exist, kill them:
   pkill -f claude
   ```
3. Relaunch Claude Desktop

### 5.7 Step 6: Verify MCP Integration

After restarting Claude Desktop:

1. **Look for MCP Indicator**: A small icon or indicator should appear showing MCP servers are connected

2. **Test Tool Discovery**:
   ```
   What AI governance tools do you have available?
   ```
   
   **Expected Response:** Claude should list AIGRC tools including:
   - `get_deployment_readiness`
   - `get_blockers`
   - `check_policy`
   - `check_compliance`
   - `gap_analysis`
   - And 21 additional tools (26 total)

3. **Test Resource Access**:
   ```
   What AI assets are registered in my workspace?
   ```

4. **Test Prompt Access**:
   ```
   Show me the pre-PR governance check prompt
   ```

### 5.8 Troubleshooting Claude Desktop Integration

If integration fails, see [Section 11: Troubleshooting Guide](#11-troubleshooting-guide) for detailed diagnostics.

---

## 6. Part 2: Cursor IDE Integration

### 6.1 Overview

Cursor IDE integration brings AIGRC governance tools directly into your coding environment. This enables seamless governance checks while writing and reviewing AI system code.

### 6.2 Step 1: Locate Configuration File

Cursor stores MCP configuration in a platform-specific location.

#### Windows

**Path:**
```
%APPDATA%\Cursor\mcp.json
```

**Typical expanded path:**
```
C:\Users\<username>\AppData\Roaming\Cursor\mcp.json
```

**How to access:**
```powershell
# PowerShell - Navigate to directory
cd "$env:APPDATA\Cursor"

# Create directory if it doesn't exist
New-Item -ItemType Directory -Force -Path "$env:APPDATA\Cursor"
```

#### macOS

**Path:**
```
~/Library/Application Support/Cursor/mcp.json
```

**How to access:**
```bash
cd ~/Library/Application\ Support/Cursor

# Create directory if it doesn't exist
mkdir -p ~/Library/Application\ Support/Cursor
```

#### Linux

**Path:**
```
~/.config/Cursor/mcp.json
```

**How to access:**
```bash
cd ~/.config/Cursor

# Create directory if it doesn't exist
mkdir -p ~/.config/Cursor
```

### 6.3 Step 2: Configure AIGRC MCP Server

Create or edit `mcp.json`:

#### Minimal Configuration

```json
{
  "mcpServers": {
    "aigrc": {
      "command": "node",
      "args": [
        "/absolute/path/to/aigrc/packages/mcp/dist/bin/aigrc-mcp.js"
      ],
      "env": {
        "AIGRC_WORKSPACE": "${workspaceFolder}"
      }
    }
  }
}
```

#### Recommended Configuration

```json
{
  "mcpServers": {
    "aigrc": {
      "command": "node",
      "args": [
        "/absolute/path/to/aigrc/packages/mcp/dist/bin/aigrc-mcp.js"
      ],
      "env": {
        "AIGRC_WORKSPACE": "${workspaceFolder}",
        "AIGRC_CARDS_DIR": ".aigrc/cards",
        "AIGRC_PROFILES": "eu-ai-act,nist-rmf",
        "AIGRC_LOG_LEVEL": "info"
      }
    }
  }
}
```

> **Note:** The `${workspaceFolder}` variable is dynamically replaced with the currently open project folder in Cursor.

#### Full Configuration with External Integrations

```json
{
  "mcpServers": {
    "aigrc": {
      "command": "node",
      "args": [
        "/absolute/path/to/aigrc/packages/mcp/dist/bin/aigrc-mcp.js"
      ],
      "env": {
        "AIGRC_WORKSPACE": "${workspaceFolder}",
        "AIGRC_CARDS_DIR": ".aigrc/cards",
        "AIGRC_PROFILES": "eu-ai-act,nist-rmf,iso-42001",
        "AIGRC_LOG_LEVEL": "info",
        "AIGRC_REDTEAM_ENABLED": "true",
        "JIRA_API_URL": "https://yourcompany.atlassian.net",
        "JIRA_API_TOKEN": "your-jira-api-token",
        "ADO_ORG_URL": "https://dev.azure.com/yourorg",
        "ADO_API_TOKEN": "your-ado-pat-token"
      }
    }
  }
}
```

### 6.4 Step 3: Restart Cursor

1. Close all Cursor windows
2. Ensure no Cursor processes are running:
   ```bash
   # macOS/Linux
   pgrep -f cursor
   
   # If processes exist:
   pkill -f cursor
   ```
3. Relaunch Cursor
4. Open your AI project folder

### 6.5 Step 4: Verify Integration

1. **Open AI Chat**: Press `Cmd + L` (macOS) or `Ctrl + L` (Windows/Linux)

2. **Test MCP Connection**:
   ```
   @aigrc What tools do you have for AI governance?
   ```
   
   > **Note:** The `@aigrc` prefix explicitly routes the query to the AIGRC MCP server.

3. **Test with Project Context**:
   ```
   @aigrc Check the deployment readiness of all assets in this project
   ```

4. **Test Inline Governance**:
   While viewing an AI system file, ask:
   ```
   @aigrc What governance requirements apply to this code?
   ```

### 6.6 Cursor-Specific Features

Cursor's code-aware context enables additional capabilities:

| Feature | Command | Description |
|---------|---------|-------------|
| File Context | `@aigrc Review this file for governance issues` | Analyzes currently open file |
| Selection Context | Select code, then `@aigrc What are the risks here?` | Analyzes selected code |
| Project Scan | `@aigrc Scan project for ungoverned AI assets` | Discovers potential assets |
| Inline Fix | `@aigrc Generate compliance artifact for this function` | Creates documentation |

---

## 7. Configuration Reference

### 7.1 Environment Variables

The following environment variables control AIGRC MCP Server behavior:

| Variable | Type | Required | Default | Description |
|----------|------|----------|---------|-------------|
| `AIGRC_WORKSPACE` | Path | Yes | `.` | Root directory for governance operations. All asset cards and configuration are resolved relative to this path. |
| `AIGRC_CARDS_DIR` | Relative Path | No | `.aigrc/cards` | Directory containing asset card YAML files, relative to `AIGRC_WORKSPACE`. |
| `AIGRC_PROFILES` | CSV String | No | `eu-ai-act` | Comma-separated list of compliance profile IDs to activate. |
| `AIGRC_LOG_LEVEL` | Enum | No | `info` | Logging verbosity. Options: `debug`, `info`, `warn`, `error`. |
| `AIGRC_REDTEAM_ENABLED` | Boolean | No | `false` | Enable adversarial testing features. Requires enterprise license. |
| `AIGRC_CACHE_TTL` | Integer | No | `300` | Seconds to cache asset card data in memory. |
| `AIGRC_STRICT_MODE` | Boolean | No | `false` | Fail on any warning (not just errors). |

### 7.2 External Integration Variables

These variables enable Golden Thread traceability features:

#### Jira Integration

| Variable | Type | Required | Default | Description |
|----------|------|----------|---------|-------------|
| `JIRA_API_URL` | URL | Conditional* | - | Base URL of your Jira instance (e.g., `https://company.atlassian.net`). |
| `JIRA_API_TOKEN` | String | Conditional* | - | API token for Jira authentication. Generate at https://id.atlassian.com/manage-profile/security/api-tokens |
| `JIRA_USER_EMAIL` | Email | Conditional* | - | Email associated with the API token. |
| `JIRA_PROJECT_KEY` | String | No | - | Default Jira project for linking (e.g., `AIGOV`). |

*Required if using `link_business_intent` or `get_business_context` tools with Jira.

#### Azure DevOps Integration

| Variable | Type | Required | Default | Description |
|----------|------|----------|---------|-------------|
| `ADO_ORG_URL` | URL | Conditional* | - | Azure DevOps organization URL (e.g., `https://dev.azure.com/yourorg`). |
| `ADO_API_TOKEN` | String | Conditional* | - | Personal Access Token (PAT) with Work Items read/write scope. |
| `ADO_PROJECT` | String | No | - | Default Azure DevOps project name. |

*Required if using Golden Thread tools with Azure DevOps.

### 7.3 Compliance Profile Reference

| Profile ID | Framework | Version | Description |
|------------|-----------|---------|-------------|
| `eu-ai-act` | EU AI Act | 2024 | European Union AI regulatory requirements |
| `nist-rmf` | NIST AI RMF | 1.0 | NIST AI Risk Management Framework |
| `iso-42001` | ISO 42001 | 2023 | AI Management System standard |
| `ieee-7000` | IEEE 7000 | 2021 | Ethical design process |
| `soc2-ai` | SOC 2 | 2024 | AI-specific trust services criteria |
| `hipaa-ai` | HIPAA | 2024 | Healthcare AI requirements |
| `finra-ai` | FINRA | 2024 | Financial services AI guidance |
| `custom` | Custom | - | Organization-specific (requires configuration) |

**Combining Profiles:**
```json
"AIGRC_PROFILES": "eu-ai-act,nist-rmf,soc2-ai"
```

When multiple profiles are active, the **most restrictive** requirement applies.

### 7.4 Log Level Details

| Level | Output | Use Case |
|-------|--------|----------|
| `debug` | All messages including internal state | Development/troubleshooting |
| `info` | Normal operational messages | Production recommended |
| `warn` | Warnings and errors only | Quiet operation |
| `error` | Errors only | Minimal logging |

**Example Debug Output:**
```
[DEBUG] Loading asset card: .aigrc/cards/my-agent.yaml
[DEBUG] Parsed asset: my-agent (type: agent, risk: high)
[DEBUG] Active profiles: eu-ai-act, nist-rmf
[INFO] AIGRC MCP Server started (workspace: /path/to/project)
[DEBUG] Tool call: get_deployment_readiness {asset: "my-agent"}
[DEBUG] Executing 12 checks against eu-ai-act profile
[INFO] Deployment readiness check complete (score: 65, blockers: 3)
```

---

## 8. Asset Card Specification

### 8.1 Overview

Asset Cards are YAML documents that describe AI systems under governance. They serve as the central metadata repository for each AI asset, capturing technical details, classification, ownership, and governance state.

### 8.2 Directory Structure

```
your-project/
├── .aigrc/
│   ├── cards/
│   │   ├── my-agent.yaml
│   │   ├── recommendation-engine.yaml
│   │   └── fraud-detector.yaml
│   ├── profiles/
│   │   └── custom-profile.yaml    (optional)
│   └── config.yaml                (optional)
├── src/
│   └── ...
└── package.json
```

### 8.3 Asset Card Schema

#### Minimal Asset Card

```yaml
# .aigrc/cards/my-agent.yaml
apiVersion: aigrc.io/v1
kind: AssetCard
name: my-agent
description: A brief description of the AI system

technical:
  type: agent
  model: gpt-4

ownership:
  team: ai-team
  owner: owner@company.com
```

#### Complete Asset Card

```yaml
# .aigrc/cards/my-agent.yaml
# AIGRC Asset Card - Full Specification
# Version: 2.0

# === METADATA ===
apiVersion: aigrc.io/v1          # Required: API version (always aigrc.io/v1)
kind: AssetCard                  # Required: Resource type (always AssetCard)
name: my-agent                   # Required: Unique identifier (lowercase, hyphenated)
description: |                   # Required: Human-readable description
  An intelligent agent that processes customer inquiries 
  and routes them to appropriate departments.

# === VERSION CONTROL ===
version: 1.2.0                   # Optional: Semantic version of the asset
labels:                          # Optional: Key-value labels for organization
  environment: production
  department: customer-service
  cost-center: CC-1234
annotations:                     # Optional: Non-identifying metadata
  last-review: "2025-12-15"
  reviewer: jane.smith@company.com

# === TECHNICAL SPECIFICATION ===
technical:
  type: agent                    # Required: agent | model | pipeline | system
  framework: langchain           # Optional: Development framework
  model: gpt-4                   # Required: Primary model identifier
  modelVersion: gpt-4-turbo-2024-04-09  # Optional: Specific model version
  entrypoint: src/agent/main.py  # Optional: Main code entrypoint
  
  # Runtime configuration
  runtime:
    language: python             # Optional: Primary programming language
    version: "3.11"              # Optional: Language version
    container: python:3.11-slim  # Optional: Container image
    
  # Resource requirements
  resources:
    cpu: 2                       # Optional: CPU cores
    memory: 4Gi                  # Optional: Memory limit
    gpu: false                   # Optional: GPU required
    
  # Dependencies
  dependencies:                  # Optional: External dependencies
    - openai>=1.0.0
    - langchain>=0.1.0
    - pydantic>=2.0.0
    
  # API integrations
  integrations:                  # Optional: External API dependencies
    - name: openai
      type: llm-provider
      required: true
    - name: pinecone
      type: vector-db
      required: false

# === CLASSIFICATION ===
classification:
  riskLevel: high                # Required: minimal | limited | high | unacceptable
  
  # EU AI Act classification
  euAiAct:
    category: high-risk          # Required if eu-ai-act profile: high-risk | limited-risk | minimal-risk
    useCase: customer-service    # Optional: Specific use case category
    prohibitedUse: false         # Required if high-risk: Is this a prohibited use?
    
  # Data sensitivity
  dataSensitivity:
    pii: true                    # Optional: Handles personal data
    phi: false                   # Optional: Handles health data
    pci: false                   # Optional: Handles payment data
    classified: false            # Optional: Handles classified data
    
  # Impact assessment
  impact:
    safety: low                  # Optional: Safety impact (low | medium | high | critical)
    rights: medium               # Optional: Rights impact
    environment: low             # Optional: Environmental impact

# === OWNERSHIP ===
ownership:
  team: ai-platform-team         # Required: Owning team identifier
  owner: john.doe@company.com    # Required: Primary owner email
  
  # Additional contacts
  contacts:
    technical: jane.smith@company.com      # Optional: Technical lead
    compliance: legal@company.com          # Optional: Compliance contact
    security: security@company.com         # Optional: Security contact
    
  # Organizational hierarchy
  organization:
    division: Technology                   # Optional: Division name
    department: AI Platform                # Optional: Department name
    costCenter: CC-5678                    # Optional: Cost center code

# === GOVERNANCE STATE ===
governance:
  status: in-review              # Required: draft | in-review | approved | deployed | deprecated
  
  # Checkpoint history
  checkpoints:                   # Optional: Completed governance checkpoints
    - name: design
      status: passed
      date: "2025-11-01"
      approver: jane.smith@company.com
    - name: development
      status: passed
      date: "2025-11-15"
      approver: john.doe@company.com
    - name: pre-production
      status: pending
      
  # Required approvals
  approvals:                     # Optional: Required sign-offs
    - role: technical-lead
      status: approved
      approver: jane.smith@company.com
      date: "2025-11-20"
    - role: compliance-officer
      status: pending
    - role: security-reviewer
      status: pending
      
  # Governance artifacts
  artifacts:                     # Optional: Required documentation
    - type: impact-assessment
      status: complete
      location: docs/impact-assessment.md
    - type: model-card
      status: complete
      location: docs/model-card.md
    - type: data-sheet
      status: draft
      location: docs/data-sheet.md

# === BUSINESS INTENT (Golden Thread) ===
intent:
  linked: true                   # Required: Is business intent linked?
  
  # Jira integration
  jira:
    project: AIGOV               # Optional: Jira project key
    epic: AIGOV-123              # Optional: Parent epic
    stories:                     # Optional: Related stories
      - AIGOV-124
      - AIGOV-125
      
  # Azure DevOps integration
  azureDevOps:
    project: AI-Governance       # Optional: ADO project
    workItems:                   # Optional: Related work items
      - 12345
      - 12346

# === MONITORING & OPERATIONS ===
operations:
  monitoring:
    enabled: true                # Optional: Is monitoring active?
    dashboard: https://grafana.company.com/d/my-agent
    alerts:
      - name: high-latency
        threshold: 5000ms
      - name: error-rate
        threshold: 1%
        
  # Incident response
  incidents:
    runbook: docs/runbook.md     # Optional: Incident response runbook
    escalation:                  # Optional: Escalation path
      - level: 1
        contact: on-call@company.com
        sla: 30m
      - level: 2
        contact: ai-platform-lead@company.com
        sla: 2h

# === AUDIT HISTORY ===
audit:
  created: "2025-10-01T10:00:00Z"      # Optional: Creation timestamp
  createdBy: john.doe@company.com      # Optional: Creator
  lastModified: "2025-12-15T14:30:00Z" # Optional: Last modification
  lastModifiedBy: jane.smith@company.com
  
  # Change log
  changelog:                           # Optional: Recent changes
    - date: "2025-12-15"
      change: Updated model to gpt-4-turbo
      author: jane.smith@company.com
    - date: "2025-11-20"
      change: Added monitoring configuration
      author: ops@company.com
```

### 8.4 Field Reference

#### Required Fields

| Field | Type | Description |
|-------|------|-------------|
| `apiVersion` | String | Always `aigrc.io/v1` |
| `kind` | String | Always `AssetCard` |
| `name` | String | Unique identifier (lowercase, hyphenated) |
| `description` | String | Human-readable description |
| `technical.type` | Enum | `agent`, `model`, `pipeline`, or `system` |
| `technical.model` | String | Primary model identifier |
| `classification.riskLevel` | Enum | `minimal`, `limited`, `high`, or `unacceptable` |
| `ownership.team` | String | Owning team identifier |
| `ownership.owner` | Email | Primary owner email |
| `governance.status` | Enum | `draft`, `in-review`, `approved`, `deployed`, or `deprecated` |
| `intent.linked` | Boolean | Whether business intent is linked |

#### Conditional Fields

| Field | Condition | Description |
|-------|-----------|-------------|
| `classification.euAiAct.category` | Profile includes `eu-ai-act` | EU AI Act risk category |
| `classification.euAiAct.prohibitedUse` | Category is `high-risk` | Prohibited use flag |

### 8.5 Validation Rules

The AIGRC MCP server validates asset cards on load:

1. **Schema Validation**: All required fields must be present
2. **Type Validation**: Field values must match expected types
3. **Reference Validation**: Referenced files must exist
4. **Uniqueness**: Asset names must be unique within workspace
5. **Profile Compliance**: Cards must satisfy active profile requirements

**Validation Errors:**
```
ERROR: Asset card validation failed for 'my-agent.yaml'
  - Missing required field: classification.riskLevel
  - Invalid enum value for governance.status: 'active' (expected: draft|in-review|approved|deployed|deprecated)
  - Referenced artifact not found: docs/impact-assessment.md
```

---

## 9. Security Considerations

### 9.1 Credential Management

#### API Token Security

**DO:**
- Store API tokens in environment variables
- Use secret management tools (HashiCorp Vault, AWS Secrets Manager)
- Rotate tokens regularly (recommended: every 90 days)
- Use tokens with minimal required permissions

**DO NOT:**
- Commit API tokens to version control
- Store tokens in configuration files
- Share tokens between environments
- Use personal tokens for shared integrations

#### Secure Configuration Example

**macOS/Linux - Using .env file:**
```bash
# Create .env file (add to .gitignore)
cat > ~/.aigrc-secrets << 'EOF'
export JIRA_API_TOKEN="your-jira-token"
export ADO_API_TOKEN="your-ado-token"
EOF

# Secure the file
chmod 600 ~/.aigrc-secrets

# Source before running AIGRC
source ~/.aigrc-secrets
```

**Windows - Using environment variables:**
```powershell
# Set environment variables (user-level)
[System.Environment]::SetEnvironmentVariable("JIRA_API_TOKEN", "your-token", "User")
[System.Environment]::SetEnvironmentVariable("ADO_API_TOKEN", "your-token", "User")
```

### 9.2 File System Security

#### Workspace Isolation

The AIGRC MCP server operates within the configured workspace directory. Ensure:

1. **Workspace Permissions**: Read access is sufficient for most operations
2. **Card Directory**: `.aigrc/cards/` should be readable by the MCP server process
3. **No Write Access Required**: MCP server does not modify files (read-only by design)

#### Recommended Permissions

```bash
# Linux/macOS
chmod 755 .aigrc
chmod 755 .aigrc/cards
chmod 644 .aigrc/cards/*.yaml
```

### 9.3 Network Security

#### Local-Only Operation

By default, the AIGRC MCP server:
- Communicates only via stdio (no network)
- Does not bind to any ports
- Does not make outbound connections (unless Golden Thread is configured)

#### External Integration Security

If using Jira or Azure DevOps integration:

1. **TLS Required**: All connections use HTTPS
2. **Certificate Validation**: Standard certificate chain validation applies
3. **Proxy Support**: Configure via standard environment variables:
   ```bash
   export HTTPS_PROXY=http://proxy.company.com:8080
   export NO_PROXY=localhost,127.0.0.1
   ```

### 9.4 Data Privacy

#### Asset Card Contents

Asset cards may contain sensitive information:
- Team names and email addresses
- Internal system architecture details
- Security classifications

**Recommendations:**
1. Add `.aigrc/` to your project's `.gitignore` if cards contain sensitive data
2. Use separate card repositories for different sensitivity levels
3. Implement access controls at the repository level

#### Audit Logging

Enable audit logging for compliance:
```json
"env": {
  "AIGRC_LOG_LEVEL": "info",
  "AIGRC_AUDIT_LOG": "/var/log/aigrc/audit.log"
}
```

### 9.5 Security Checklist

Before deploying AIGRC integration:

- [ ] API tokens stored in environment variables (not config files)
- [ ] Configuration files excluded from version control (if containing secrets)
- [ ] Workspace directory permissions reviewed
- [ ] Audit logging enabled (for enterprise environments)
- [ ] Token rotation schedule established
- [ ] Proxy configuration reviewed (for corporate networks)
- [ ] Asset cards reviewed for sensitive data exposure

---

## 10. Verification & Testing

### 10.1 Integration Test Suite

After completing setup, run through this verification checklist:

#### Basic Connectivity Tests

| # | Test | Command | Expected Result |
|---|------|---------|-----------------|
| 1 | Server starts | Start Claude/Cursor | No errors in logs |
| 2 | Tools enumeration | "What AIGRC tools are available?" | List of 26 tools |
| 3 | Resources enumeration | "What AIGRC resources are available?" | Asset card resources |
| 4 | Prompts enumeration | "What AIGRC prompts are available?" | 5 governance prompts |

#### Value-First Tool Tests

| # | Test | Command | Expected Result |
|---|------|---------|-----------------|
| 5 | Deployment readiness | "Check if {asset} is deployment ready" | Status, score, blockers |
| 6 | Get blockers | "What governance blockers exist?" | List of blocking issues |
| 7 | Cost estimation | "Estimate API costs for {asset}" | Cost breakdown |
| 8 | Security risks | "Check security risks for {asset}" | Risk assessment |

#### Checkpoint Tool Tests

| # | Test | Command | Expected Result |
|---|------|---------|-----------------|
| 9 | Preview issues | "Preview checkpoint issues for {asset}" | Upcoming blockers |
| 10 | Generate artifacts | "Generate checkpoint artifacts for {asset}" | Artifact list |
| 11 | Prepare checkpoint | "Prepare {asset} for design checkpoint" | Preparation status |

#### Policy Tool Tests

| # | Test | Command | Expected Result |
|---|------|---------|-----------------|
| 12 | Check policy | "Check policy compliance for {asset}" | Policy status |
| 13 | Link intent | "Link {asset} to JIRA-123" | Linkage confirmation |
| 14 | Get context | "Get business context for {asset}" | Intent details |

#### Compliance Tool Tests

| # | Test | Command | Expected Result |
|---|------|---------|-----------------|
| 15 | Compliance check | "Check EU AI Act compliance for {asset}" | Compliance status |
| 16 | Gap analysis | "Perform gap analysis for {asset}" | Gap list |
| 17 | Crosswalk | "Map {asset} controls across frameworks" | Crosswalk matrix |

### 10.2 Manual Test Script

```bash
#!/bin/bash
# aigrc-integration-test.sh
# Run manual tests to verify AIGRC MCP integration

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
NC='\033[0m' # No Color

echo "=== AIGRC MCP Integration Test ==="
echo ""

# Test 1: Check if AIGRC binary exists and runs
echo -n "Test 1: AIGRC binary executable... "
AIGRC_BIN="${AIGRC_BIN:-./packages/mcp/dist/bin/aigrc-mcp.js}"
if node "$AIGRC_BIN" --help &>/dev/null; then
    echo -e "${GREEN}PASS${NC}"
else
    echo -e "${RED}FAIL${NC}"
    exit 1
fi

# Test 2: Check for asset cards
echo -n "Test 2: Asset cards exist... "
CARDS_DIR="${AIGRC_CARDS_DIR:-.aigrc/cards}"
CARD_COUNT=$(find "$CARDS_DIR" -name "*.yaml" 2>/dev/null | wc -l)
if [ "$CARD_COUNT" -gt 0 ]; then
    echo -e "${GREEN}PASS${NC} ($CARD_COUNT cards found)"
else
    echo -e "${RED}FAIL${NC} (no cards in $CARDS_DIR)"
fi

# Test 3: Validate asset card YAML
echo -n "Test 3: Asset cards valid YAML... "
YAML_VALID=true
for card in "$CARDS_DIR"/*.yaml; do
    if ! python3 -c "import yaml; yaml.safe_load(open('$card'))" 2>/dev/null; then
        YAML_VALID=false
        echo -e "${RED}FAIL${NC} ($card has invalid YAML)"
        break
    fi
done
if [ "$YAML_VALID" = true ]; then
    echo -e "${GREEN}PASS${NC}"
fi

echo ""
echo "=== Integration Test Complete ==="
```

### 10.3 Expected Tool Count

The AIGRC MCP server provides **26 tools** across these categories:

| Category | Tools | Count |
|----------|-------|-------|
| Deployment | `get_deployment_readiness`, `get_blockers` | 2 |
| Cost | `estimate_api_costs`, `get_cost_breakdown` | 2 |
| Security | `check_security_risks`, `get_vulnerabilities` | 2 |
| Checkpoint | `preview_checkpoint_issues`, `generate_checkpoint_artifacts`, `prepare_for_checkpoint` | 3 |
| Policy | `check_policy`, `enforce_policy`, `get_policy_violations` | 3 |
| Intent | `link_business_intent`, `get_business_context`, `validate_intent` | 3 |
| Compliance | `check_compliance`, `gap_analysis`, `crosswalk` | 3 |
| Risk | `assess_risk`, `classify_risk`, `get_risk_factors` | 3 |
| Artifact | `generate_model_card`, `generate_data_sheet`, `generate_impact_assessment` | 3 |
| Registry | `list_assets`, `get_asset` | 2 |
| **Total** | | **26** |

### 10.4 Expected Prompt Count

The AIGRC MCP server provides **5 prompts**:

| Prompt | Description |
|--------|-------------|
| `pre_pr_governance_check` | Comprehensive pre-PR governance review |
| `checkpoint_preparation` | Prepare asset for governance checkpoint |
| `compliance_review` | Full compliance review against active profiles |
| `risk_assessment` | Complete risk assessment and classification |
| `deployment_readiness` | Deployment readiness evaluation |

---

## 11. Troubleshooting Guide

### 11.1 Diagnostic Methodology

When troubleshooting integration issues, follow this systematic approach:

```
┌─────────────────────────────────────────────────────────────────────┐
│                    TROUBLESHOOTING FLOWCHART                        │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  1. Server Starting?                                                │
│     │                                                               │
│     ├─ NO  → Check Node.js installation                            │
│     │        Check binary path                                      │
│     │        Check file permissions                                 │
│     │                                                               │
│     └─ YES                                                          │
│         │                                                           │
│         ▼                                                           │
│  2. Tools Appearing?                                                │
│     │                                                               │
│     ├─ NO  → Check config file syntax                              │
│     │        Check config file location                             │
│     │        Full restart (not just window close)                   │
│     │                                                               │
│     └─ YES                                                          │
│         │                                                           │
│         ▼                                                           │
│  3. Assets Found?                                                   │
│     │                                                               │
│     ├─ NO  → Check AIGRC_WORKSPACE path                            │
│     │        Check AIGRC_CARDS_DIR path                             │
│     │        Check .aigrc/cards/ exists with YAML files             │
│     │                                                               │
│     └─ YES                                                          │
│         │                                                           │
│         ▼                                                           │
│  4. Tools Working?                                                  │
│     │                                                               │
│     ├─ NO  → Check asset card YAML validity                        │
│     │        Check required fields present                          │
│     │        Enable debug logging                                   │
│     │                                                               │
│     └─ YES → Integration successful!                                │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 11.2 Common Issues and Solutions

#### Issue: Server Not Starting

**Symptoms:**
- No MCP indicator in Claude Desktop
- No response to AIGRC queries
- Error in application logs

**Diagnostic Steps:**

1. **Verify binary exists:**
   ```bash
   ls -la /path/to/aigrc/packages/mcp/dist/bin/aigrc-mcp.js
   ```

2. **Run binary directly to see errors:**
   ```bash
   node /path/to/aigrc/packages/mcp/dist/bin/aigrc-mcp.js
   ```

3. **Check Node.js version:**
   ```bash
   node --version
   # Must be v18.0.0 or higher
   ```

**Solutions:**

| Cause | Solution |
|-------|----------|
| Binary not found | Rebuild: `cd aigrc && pnpm run build` |
| Node.js too old | Upgrade Node.js to v18+ |
| Permission denied | `chmod +x /path/to/aigrc-mcp.js` |
| Module not found | `cd aigrc && pnpm install` |

#### Issue: Tools Not Appearing

**Symptoms:**
- Claude/Cursor starts normally
- AIGRC tools not listed
- "No tools available" response

**Diagnostic Steps:**

1. **Verify config file location:**
   ```bash
   # macOS - Claude
   cat ~/Library/Application\ Support/Claude/claude_desktop_config.json
   
   # macOS - Cursor
   cat ~/Library/Application\ Support/Cursor/mcp.json
   ```

2. **Validate JSON syntax:**
   ```bash
   cat config.json | python3 -m json.tool
   ```

3. **Confirm full application restart:**
   ```bash
   # macOS
   pgrep -f claude
   pgrep -f cursor
   # Should show no processes before restart
   ```

**Solutions:**

| Cause | Solution |
|-------|----------|
| Invalid JSON | Fix syntax errors (use jsonlint.com) |
| Wrong config location | Use correct platform-specific path |
| App not fully restarted | Kill all processes, then restart |
| Backslashes in Windows paths | Use forward slashes: `C:/path` not `C:\path` |

#### Issue: "Asset Not Found" Errors

**Symptoms:**
- Tools appear and respond
- Specific asset queries fail
- Error: "Asset 'xxx' not found"

**Diagnostic Steps:**

1. **Check workspace path:**
   ```bash
   echo $AIGRC_WORKSPACE
   ls -la $AIGRC_WORKSPACE/.aigrc/cards/
   ```

2. **Verify card file exists:**
   ```bash
   ls -la .aigrc/cards/my-agent.yaml
   ```

3. **Validate YAML syntax:**
   ```bash
   python3 -c "import yaml; yaml.safe_load(open('.aigrc/cards/my-agent.yaml'))"
   ```

**Solutions:**

| Cause | Solution |
|-------|----------|
| Wrong workspace path | Update `AIGRC_WORKSPACE` in config |
| Cards directory missing | Create `.aigrc/cards/` directory |
| Invalid YAML | Fix YAML syntax (use yamllint) |
| Wrong file extension | Use `.yaml` not `.yml` |

#### Issue: Golden Thread Integration Failing

**Symptoms:**
- `link_business_intent` fails
- "Connection refused" or "401 Unauthorized"

**Diagnostic Steps:**

1. **Verify environment variables:**
   ```bash
   echo $JIRA_API_URL
   echo $JIRA_API_TOKEN  # Should show value (don't share!)
   ```

2. **Test API connectivity:**
   ```bash
   curl -u "email@company.com:$JIRA_API_TOKEN" \
     "$JIRA_API_URL/rest/api/3/myself"
   ```

**Solutions:**

| Cause | Solution |
|-------|----------|
| Token not set | Add token to environment variables |
| Token expired | Generate new token, update config |
| Wrong URL | Verify Jira/ADO URL format |
| Network blocked | Check firewall/proxy settings |

### 11.3 Error Reference

| Error Code | Message | Cause | Solution |
|------------|---------|-------|----------|
| `AIGRC-001` | Configuration file not found | Config file missing | Create config file at correct location |
| `AIGRC-002` | Invalid JSON in configuration | Syntax error | Validate JSON with linter |
| `AIGRC-003` | Asset card not found | Card file missing or wrong path | Check AIGRC_CARDS_DIR setting |
| `AIGRC-004` | Asset card validation failed | Invalid YAML or missing fields | Fix card per schema |
| `AIGRC-005` | Profile not found | Unknown profile ID | Use valid profile from reference |
| `AIGRC-006` | External integration failed | API error | Check credentials and connectivity |
| `AIGRC-007` | Permission denied | File system permissions | Check file/directory permissions |
| `AIGRC-008` | Rate limit exceeded | Too many API calls | Wait and retry |

### 11.4 Collecting Debug Information

When escalating issues, collect the following:

```bash
#!/bin/bash
# collect-debug-info.sh

echo "=== AIGRC Debug Information ==="
echo "Date: $(date)"
echo ""

echo "=== System Info ==="
uname -a
echo ""

echo "=== Node.js Version ==="
node --version
npm --version
echo ""

echo "=== AIGRC Environment ==="
env | grep AIGRC
echo ""

echo "=== Configuration File ==="
# Claude Desktop
if [ -f ~/Library/Application\ Support/Claude/claude_desktop_config.json ]; then
    echo "Claude config:"
    cat ~/Library/Application\ Support/Claude/claude_desktop_config.json | \
        sed 's/TOKEN.*"/TOKEN":"[REDACTED]"/g'
fi

# Cursor
if [ -f ~/Library/Application\ Support/Cursor/mcp.json ]; then
    echo "Cursor config:"
    cat ~/Library/Application\ Support/Cursor/mcp.json | \
        sed 's/TOKEN.*"/TOKEN":"[REDACTED]"/g'
fi
echo ""

echo "=== Asset Cards ==="
ls -la .aigrc/cards/ 2>/dev/null || echo "No cards directory found"
echo ""

echo "=== AIGRC Server Test ==="
node ./packages/mcp/dist/bin/aigrc-mcp.js --version 2>&1
```

---

## 12. Performance Optimization

### 12.1 Cache Configuration

The AIGRC MCP server caches asset card data to improve response times.

**Configuration:**
```json
"env": {
  "AIGRC_CACHE_TTL": "300"
}
```

| Setting | Effect | Recommendation |
|---------|--------|----------------|
| `60` | Aggressive caching | Development (frequent card changes) |
| `300` | Balanced (default) | Normal usage |
| `3600` | Conservative | Production (stable cards) |

### 12.2 Workspace Scope

Limiting workspace scope improves performance:

**Wide Scope (slower):**
```json
"AIGRC_WORKSPACE": "/home/user"
```

**Narrow Scope (faster):**
```json
"AIGRC_WORKSPACE": "/home/user/projects/my-ai-project"
```

### 12.3 Profile Selection

Each active profile adds compliance checks. Use only required profiles:

**Optimal:**
```json
"AIGRC_PROFILES": "eu-ai-act"
```

**Suboptimal (slower):**
```json
"AIGRC_PROFILES": "eu-ai-act,nist-rmf,iso-42001,ieee-7000,soc2-ai"
```

### 12.4 Logging Impact

Higher log levels consume more resources:

| Level | Performance Impact |
|-------|-------------------|
| `error` | Minimal |
| `warn` | Low |
| `info` | Low (recommended) |
| `debug` | High (development only) |

---

## 13. Migration & Upgrades

### 13.1 Version Compatibility

| AIGRC Version | MCP Protocol | Node.js | Claude Desktop | Cursor |
|---------------|--------------|---------|----------------|--------|
| 1.x | 1.0 | 16+ | 1.0+ | 0.30+ |
| 2.x | 2.0 | 18+ | 1.2+ | 0.40+ |
| 3.x (planned) | 2.1 | 20+ | TBD | TBD |

### 13.2 Upgrade Procedure

1. **Backup current configuration:**
   ```bash
   cp ~/.config/Claude/claude_desktop_config.json ~/.config/Claude/claude_desktop_config.json.bak
   ```

2. **Update AIGRC package:**
   ```bash
   cd /path/to/aigrc
   git pull origin main
   pnpm install
   pnpm run build
   ```

3. **Review migration notes:**
   ```bash
   cat CHANGELOG.md | head -100
   ```

4. **Update configuration if required:**
   - Check for new environment variables
   - Check for deprecated settings

5. **Restart applications:**
   - Full quit and restart Claude Desktop
   - Full quit and restart Cursor

6. **Verify integration:**
   - Run test suite from Section 10

### 13.3 Rollback Procedure

If upgrade fails:

1. **Restore configuration:**
   ```bash
   cp ~/.config/Claude/claude_desktop_config.json.bak ~/.config/Claude/claude_desktop_config.json
   ```

2. **Checkout previous version:**
   ```bash
   cd /path/to/aigrc
   git checkout v1.x.x  # Previous version tag
   pnpm install
   pnpm run build
   ```

3. **Restart applications**

---

## 14. Example Workflows

### 14.1 Pre-PR Governance Check

**Scenario:** Before submitting a PR for an AI agent, verify all governance requirements are met.

**Conversation:**
```
Developer: Hey Claude, I'm about to submit a PR for my-recommendation-engine. 
          Can you check if there are any governance blockers?

Claude: I'll check the governance status for my-recommendation-engine.

[Tool Call: get_blockers(asset="my-recommendation-engine")]

Based on my analysis, your AI asset has 3 blockers preventing deployment:

1. **Missing Impact Assessment** (Critical)
   - EU AI Act requires documented impact assessment for high-risk systems
   - Action: Create docs/impact-assessment.md using the generate_impact_assessment tool

2. **Pending Security Review** (Critical)
   - Approval from security-reviewer role is required
   - Action: Request review from security@company.com

3. **Incomplete Model Card** (Major)
   - Model card missing performance metrics section
   - Action: Update docs/model-card.md with accuracy, latency, and fairness metrics

Would you like me to generate the missing impact assessment document?
```

### 14.2 Checkpoint Preparation

**Scenario:** Preparing an AI system for the design checkpoint.

**Conversation:**
```
Developer: I need to prepare my-fraud-detector for the design checkpoint.
          What do I need to do?

Claude: I'll analyze your asset and the design checkpoint requirements.

[Tool Call: prepare_for_checkpoint(asset="my-fraud-detector", checkpoint="design")]

Here's your design checkpoint preparation status:

**Status: 60% Ready**

✅ Completed:
- Business intent linked (AIGOV-456)
- Risk classification documented (High)
- Data sources identified

⚠️ In Progress:
- Technical architecture (draft exists, needs review)

❌ Not Started:
- Bias assessment methodology
- Explainability approach documentation
- Human oversight mechanisms

**Recommended Next Steps:**
1. Complete technical architecture review with jane.smith@company.com
2. I can help draft the bias assessment methodology - would you like me to generate a template?
3. Document human oversight approach per EU AI Act Article 14

Estimated time to checkpoint readiness: 3-5 days
```

### 14.3 Compliance Gap Analysis

**Scenario:** Understanding compliance gaps against EU AI Act.

**Conversation:**
```
Developer: Review my-customer-agent for EU AI Act compliance and tell me 
          what gaps I need to address.

Claude: I'll perform a comprehensive EU AI Act compliance analysis.

[Tool Call: gap_analysis(asset="my-customer-agent", profile="eu-ai-act")]

**EU AI Act Compliance Report: my-customer-agent**

**Overall Compliance Score: 72%**

**Classification:** High-Risk (Customer Service AI - Article 6)

**Compliance Gaps:**

| Requirement | Article | Status | Gap |
|-------------|---------|--------|-----|
| Risk Management | Art. 9 | ⚠️ Partial | Missing ongoing monitoring plan |
| Data Governance | Art. 10 | ✅ Compliant | - |
| Technical Documentation | Art. 11 | ❌ Non-compliant | No technical file maintained |
| Record Keeping | Art. 12 | ⚠️ Partial | Logs exist but retention unclear |
| Transparency | Art. 13 | ⚠️ Partial | Users not notified of AI interaction |
| Human Oversight | Art. 14 | ❌ Non-compliant | No override mechanism documented |
| Accuracy & Robustness | Art. 15 | ⚠️ Partial | Missing adversarial testing results |

**Priority Actions:**
1. 🔴 Create technical documentation file (required before deployment)
2. 🔴 Implement and document human override mechanism
3. 🟡 Add AI disclosure to user interface
4. 🟡 Establish log retention policy (minimum 6 months)
5. 🟢 Run adversarial tests and document results

Would you like me to generate templates for any of these requirements?
```

### 14.4 Multi-Asset Risk Assessment

**Scenario:** Assessing risk across all AI assets in a project.

**Conversation:**
```
Developer: Perform a risk assessment for all AI assets in this project.

Claude: I'll scan the workspace and assess all registered AI assets.

[Tool Call: list_assets()]
[Tool Call: assess_risk(asset="recommendation-engine")]
[Tool Call: assess_risk(asset="fraud-detector")]
[Tool Call: assess_risk(asset="chatbot")]

**Portfolio Risk Assessment**

| Asset | Type | Risk Level | Top Risk Factor | Score |
|-------|------|------------|-----------------|-------|
| fraud-detector | Agent | 🔴 High | Financial decisions | 85/100 |
| recommendation-engine | Model | 🟡 Medium | User profiling | 62/100 |
| chatbot | Agent | 🟢 Low | Limited scope | 28/100 |

**Portfolio Summary:**
- Total Assets: 3
- High Risk: 1 (33%)
- Medium Risk: 1 (33%)
- Low Risk: 1 (33%)

**Key Findings:**

1. **fraud-detector** requires enhanced governance due to:
   - Direct impact on customer financial outcomes
   - Regulatory scrutiny (FTC, CFPB)
   - Potential for discriminatory outcomes

2. **recommendation-engine** moderate risk due to:
   - User behavior profiling
   - Potential filter bubble effects
   - GDPR implications for EU users

3. **chatbot** low risk but monitor for:
   - Scope creep into high-risk functions
   - Customer service quality metrics

**Recommended Actions:**
- Prioritize fraud-detector governance before production deployment
- Schedule quarterly risk reassessment for all assets
```

---

## 15. Support & Escalation

### 15.1 Self-Service Resources

| Resource | Location | Description |
|----------|----------|-------------|
| Documentation | `/docs/` in AIGRC repo | Full reference documentation |
| FAQ | `/docs/faq.md` | Common questions and answers |
| Release Notes | `/CHANGELOG.md` | Version history and changes |
| Examples | `/examples/` | Sample configurations and cards |

### 15.2 Support Channels

| Channel | Use Case | Response Time |
|---------|----------|---------------|
| Slack: #aigrc-support | General questions | 4 hours (business) |
| Email: aigrc@company.com | Formal requests | 1 business day |
| Jira: AIGRC project | Bug reports, features | Per SLA |
| On-call: PagerDuty | Production incidents | 30 minutes |

### 15.3 Escalation Path

```
Level 1: Self-Service
    ↓ (unresolved after 4 hours)
Level 2: #aigrc-support Slack channel
    ↓ (unresolved after 1 business day)
Level 3: Email aigrc@company.com with debug info
    ↓ (critical blocker)
Level 4: Page on-call via PagerDuty
```

### 15.4 Information to Include in Support Requests

When requesting support, include:

1. **Environment Details:**
   - Operating system and version
   - Node.js version
   - AIGRC version
   - Claude Desktop / Cursor version

2. **Configuration:**
   - Sanitized config file (remove tokens)
   - Environment variables (names only, not values)

3. **Error Information:**
   - Full error message
   - Steps to reproduce
   - Expected vs actual behavior

4. **Debug Output:**
   - Logs with `AIGRC_LOG_LEVEL=debug`
   - Output from diagnostic script

---

## 16. Appendices

### Appendix A: Complete Configuration Template

```json
{
  "mcpServers": {
    "aigrc": {
      "command": "node",
      "args": [
        "/path/to/aigrc/packages/mcp/dist/bin/aigrc-mcp.js"
      ],
      "env": {
        "AIGRC_WORKSPACE": "/path/to/project",
        "AIGRC_CARDS_DIR": ".aigrc/cards",
        "AIGRC_PROFILES": "eu-ai-act,nist-rmf",
        "AIGRC_LOG_LEVEL": "info",
        "AIGRC_CACHE_TTL": "300",
        "AIGRC_STRICT_MODE": "false",
        "AIGRC_REDTEAM_ENABLED": "false",
        "JIRA_API_URL": "https://company.atlassian.net",
        "JIRA_API_TOKEN": "",
        "JIRA_USER_EMAIL": "user@company.com",
        "JIRA_PROJECT_KEY": "AIGOV",
        "ADO_ORG_URL": "https://dev.azure.com/company",
        "ADO_API_TOKEN": "",
        "ADO_PROJECT": "AI-Governance"
      }
    }
  }
}
```

### Appendix B: Minimal Asset Card Template

```yaml
apiVersion: aigrc.io/v1
kind: AssetCard
name: asset-name
description: Brief description

technical:
  type: agent
  model: gpt-4

classification:
  riskLevel: high

ownership:
  team: team-name
  owner: owner@company.com

governance:
  status: draft

intent:
  linked: false
```

### Appendix C: Tool Reference Quick Reference

| Tool | Purpose | Key Parameters |
|------|---------|----------------|
| `get_deployment_readiness` | Check if asset can deploy | `asset` |
| `get_blockers` | List governance blockers | `asset` (optional) |
| `estimate_api_costs` | Estimate operational costs | `asset` |
| `check_security_risks` | Security risk assessment | `asset` |
| `preview_checkpoint_issues` | Pre-checkpoint analysis | `asset`, `checkpoint` |
| `generate_checkpoint_artifacts` | Create required docs | `asset`, `checkpoint` |
| `prepare_for_checkpoint` | Full checkpoint prep | `asset`, `checkpoint` |
| `check_policy` | Policy compliance check | `asset`, `policy` |
| `link_business_intent` | Link to Jira/ADO | `asset`, `ticket_id` |
| `get_business_context` | Get linked intent | `asset` |
| `check_compliance` | Framework compliance | `asset`, `profile` |
| `gap_analysis` | Identify compliance gaps | `asset`, `profile` |
| `crosswalk` | Map across frameworks | `asset`, `profiles` |

### Appendix D: Glossary

| Term | Definition |
|------|------------|
| **Asset Card** | YAML document describing an AI system under governance |
| **Checkpoint** | Governance gate in the AI development lifecycle |
| **Compliance Profile** | Set of rules for a regulatory framework |
| **Golden Thread** | Traceability from business intent to deployed system |
| **MCP** | Model Context Protocol - standard for AI tool integration |
| **Red Team** | Adversarial testing of AI systems |
| **RMF** | Risk Management Framework (NIST) |
| **Workspace** | Root directory for AIGRC operations |

---

## Document Revision History

| Date | Version | Changes | Author |
|------|---------|---------|--------|
| 2025-12-28 | 2.0 | Complete enterprise revision | AIGRC Team |
| 2025-09-15 | 1.0 | Initial release | AIGRC Team |

---

**End of Document**

*For the latest version of this document, refer to the AIGRC documentation repository.*
