# AIGRC MCP Server Test Plan

## Overview

This document provides a comprehensive test plan for the AIGRC MCP (Model Context Protocol) Server (`@aigrc/mcp`). The MCP server enables AI assistants (Claude, etc.) to interact with AIGRC governance tools through a standardized protocol.

**Server Version:** 2.0.0

---

## 1. Environment Setup

### Prerequisites

- Node.js >= 18.0.0
- pnpm >= 8.0.0
- Claude Desktop (for integration testing) or MCP Inspector
- AIGRC monorepo built

### Installation

```bash
# 1. Navigate to the aigrc monorepo
cd aigrc

# 2. Install dependencies and build
pnpm install
pnpm run build

# 3. Verify MCP server binary
node packages/mcp/dist/bin/aigrc-mcp.js --help

# Or via npx (if published)
npx @aigrc/mcp --help
```

### Test Workspace Setup

```bash
# Create test workspace
mkdir -p ~/mcp-test-workspace/.aigrc/cards
cd ~/mcp-test-workspace

# Create sample asset cards
cat > .aigrc/cards/high-risk-agent.yaml << 'EOF'
name: high-risk-agent
version: "1.0.0"
status: active
owner:
  name: Test User
  email: test@example.com
description: High-risk autonomous customer support agent
technical:
  type: agent
  framework: openai
  models:
    - gpt-4
classification:
  riskLevel: high
  riskFactors:
    autonomousDecisions: true
    customerFacing: true
    toolExecution: true
    externalDataAccess: true
    piiProcessing: "yes"
    highStakesDecisions: false
governance:
  approvals:
    - approver: Legal Team
      date: "2024-01-15"
      status: approved
EOF

cat > .aigrc/cards/minimal-risk-classifier.yaml << 'EOF'
name: minimal-risk-classifier
version: "1.0.0"
status: active
owner:
  name: Test User
  email: test@example.com
description: Internal document classifier
technical:
  type: model
  framework: pytorch
classification:
  riskLevel: minimal
  riskFactors:
    autonomousDecisions: false
    customerFacing: false
    toolExecution: false
    externalDataAccess: false
    piiProcessing: "no"
    highStakesDecisions: false
EOF

# Create Python file with AI imports for scanning
cat > agent.py << 'EOF'
import openai
from langchain import LLMChain
from anthropic import Anthropic

client = openai.OpenAI()
EOF

# Create .aigrc.yaml config
cat > .aigrc.yaml << 'EOF'
version: "1.0"
profiles:
  - eu-ai-act
  - us-omb-m24
stackProfiles: true
redTeamEnabled: true
EOF
```

### Claude Desktop Configuration

Add to Claude Desktop config (`~/Library/Application Support/Claude/claude_desktop_config.json` on macOS or `%APPDATA%\Claude\claude_desktop_config.json` on Windows):

```json
{
  "mcpServers": {
    "aigrc": {
      "command": "node",
      "args": ["/path/to/aigrc/packages/mcp/dist/bin/aigrc-mcp.js"],
      "env": {
        "AIGRC_WORKSPACE": "/path/to/mcp-test-workspace",
        "AIGRC_PROFILES": "eu-ai-act,us-omb-m24",
        "AIGRC_RED_TEAM": "true",
        "AIGRC_LOG_LEVEL": "info"
      }
    }
  }
}
```

### MCP Inspector Setup (Alternative)

```bash
# Install MCP Inspector
npm install -g @anthropic-ai/mcp-inspector

# Run server with inspector
mcp-inspector node packages/mcp/dist/bin/aigrc-mcp.js
```

---

## 2. Server Startup Tests

### 2.1 Basic Startup

| Test ID | Test Case | Command | Expected Result |
|---------|-----------|---------|-----------------|
| START-01 | Start server | `node packages/mcp/dist/bin/aigrc-mcp.js` | Server starts, outputs version to stderr |
| START-02 | Version info | Server startup | "AIGRC MCP Server v2.0.0 started" |
| START-03 | Workspace path | Set AIGRC_WORKSPACE | Shows configured workspace path |
| START-04 | Profiles loaded | Set AIGRC_PROFILES | Shows active profiles list |
| START-05 | Red team status | Set AIGRC_RED_TEAM=true | Shows "Red Team: enabled" |

### 2.2 Configuration

| Test ID | Test Case | Environment Variables | Expected Result |
|---------|-----------|----------------------|-----------------|
| CFG-01 | Default config | None | Uses current directory as workspace |
| CFG-02 | Custom workspace | `AIGRC_WORKSPACE=/path` | Uses specified workspace |
| CFG-03 | Single profile | `AIGRC_PROFILES=eu-ai-act` | Loads single profile |
| CFG-04 | Multiple profiles | `AIGRC_PROFILES=eu-ai-act,us-omb-m24` | Loads multiple profiles |
| CFG-05 | Red team disabled | `AIGRC_RED_TEAM=false` | Red team tools not available |
| CFG-06 | Red team enabled | `AIGRC_RED_TEAM=true` | Red team tools available |
| CFG-07 | Log level debug | `AIGRC_LOG_LEVEL=debug` | Verbose logging |
| CFG-08 | Log level silent | `AIGRC_LOG_LEVEL=silent` | Minimal output |

---

## 3. Tools Tests

### 3.1 Core Tools

#### scan_directory

| Test ID | Test Case | Input | Expected Result |
|---------|-----------|-------|-----------------|
| TOOL-SCAN-01 | Scan workspace | `{"directory": "."}` | Returns detected frameworks |
| TOOL-SCAN-02 | Scan with exclude | `{"directory": ".", "exclude": ["node_modules"]}` | Excludes specified patterns |
| TOOL-SCAN-03 | Scan specific path | `{"directory": "./src"}` | Scans only specified directory |
| TOOL-SCAN-04 | Scan empty directory | `{"directory": "./empty"}` | Returns empty detections |
| TOOL-SCAN-05 | Invalid path | `{"directory": "/nonexistent"}` | Returns error |

**Example Tool Call:**
```json
{
  "name": "scan_directory",
  "arguments": {
    "directory": ".",
    "exclude": ["node_modules", ".git"]
  }
}
```

#### get_asset_cards

| Test ID | Test Case | Input | Expected Result |
|---------|-----------|-------|-----------------|
| TOOL-CARDS-01 | List all cards | `{}` | Returns all asset cards |
| TOOL-CARDS-02 | Filter by risk | `{"riskLevel": "high"}` | Returns only high-risk cards |
| TOOL-CARDS-03 | Filter by type | `{"type": "agent"}` | Returns only agent-type cards |
| TOOL-CARDS-04 | Filter by framework | `{"framework": "openai"}` | Returns OpenAI framework cards |
| TOOL-CARDS-05 | No cards found | `{"riskLevel": "unacceptable"}` | Returns empty list |

#### get_asset_card

| Test ID | Test Case | Input | Expected Result |
|---------|-----------|-------|-----------------|
| TOOL-CARD-01 | Get by ID | `{"id": "high-risk-agent"}` | Returns full card details |
| TOOL-CARD-02 | Include compliance | `{"id": "high-risk-agent", "includeCompliance": true}` | Includes compliance status |
| TOOL-CARD-03 | Include red team | `{"id": "high-risk-agent", "includeRedTeam": true}` | Includes red team findings |
| TOOL-CARD-04 | Card not found | `{"id": "nonexistent"}` | Returns error "Asset card not found" |

#### create_asset_card

| Test ID | Test Case | Input | Expected Result |
|---------|-----------|-------|-----------------|
| TOOL-CREATE-01 | Create minimal card | Full valid input | Card created, returns ID |
| TOOL-CREATE-02 | Auto-classification | Create with risk factors | Risk level auto-calculated |
| TOOL-CREATE-03 | Missing required field | Omit `name` | Returns validation error |
| TOOL-CREATE-04 | Invalid risk factor | Invalid enum value | Returns validation error |

**Example Tool Call:**
```json
{
  "name": "create_asset_card",
  "arguments": {
    "name": "new-test-agent",
    "description": "Test agent for MCP testing",
    "type": "agent",
    "framework": "openai",
    "owner": {
      "name": "Test User",
      "email": "test@example.com"
    },
    "riskFactors": {
      "autonomousDecisions": true,
      "customerFacing": true,
      "toolExecution": false,
      "externalDataAccess": true,
      "piiProcessing": "unknown",
      "highStakesDecisions": false
    }
  }
}
```

#### validate_asset_card

| Test ID | Test Case | Input | Expected Result |
|---------|-----------|-------|-----------------|
| TOOL-VAL-01 | Validate valid card | `{"id": "high-risk-agent"}` | "Status: Valid" |
| TOOL-VAL-02 | Validate invalid card | Create invalid card, validate | "Status: Invalid" with errors |
| TOOL-VAL-03 | Card not found | `{"id": "nonexistent"}` | "Asset card not found" error |

#### classify_risk

| Test ID | Test Case | Input | Expected Result |
|---------|-----------|-------|-----------------|
| TOOL-CLASS-01 | High risk factors | All true risk factors | Returns "high" risk level |
| TOOL-CLASS-02 | Minimal risk factors | All false risk factors | Returns "minimal" risk level |
| TOOL-CLASS-03 | Multi-jurisdiction | Include multiple profiles | Returns classification for each |
| TOOL-CLASS-04 | With domain | Include domain: "healthcare" | Adjusts classification |

**Example Tool Call:**
```json
{
  "name": "classify_risk",
  "arguments": {
    "autonomousDecisions": true,
    "customerFacing": true,
    "toolExecution": true,
    "externalDataAccess": true,
    "piiProcessing": "yes",
    "highStakesDecisions": true,
    "profiles": ["eu-ai-act", "us-omb-m24"]
  }
}
```

### 3.2 Compliance Tools

#### compliance_check

| Test ID | Test Case | Input | Expected Result |
|---------|-----------|-------|-----------------|
| TOOL-COMP-01 | Check single profile | `{"assetId": "high-risk-agent", "profile": "eu-ai-act"}` | Returns compliance percentage |
| TOOL-COMP-02 | Check all profiles | `{"assetId": "high-risk-agent"}` | Returns all profile statuses |
| TOOL-COMP-03 | Stacked profiles | `{"assetId": "...", "stack": true}` | Returns combined "strictest" |
| TOOL-COMP-04 | List gaps | Check non-compliant asset | Returns gap list |

#### compliance_crosswalk

| Test ID | Test Case | Input | Expected Result |
|---------|-----------|-------|-----------------|
| TOOL-CROSS-01 | Generate crosswalk | `{"assetId": "high-risk-agent"}` | Returns control mapping table |
| TOOL-CROSS-02 | Specific profiles | `{"profiles": ["eu-ai-act", "nist-ai-rmf"]}` | Shows mapping between specified |

### 3.3 Report Tools

#### generate_report

| Test ID | Test Case | Input | Expected Result |
|---------|-----------|-------|-----------------|
| TOOL-RPT-01 | Gap analysis | `{"assetId": "...", "type": "gap"}` | Returns markdown gap report |
| TOOL-RPT-02 | Crosswalk report | `{"assetId": "...", "type": "crosswalk"}` | Returns crosswalk table |
| TOOL-RPT-03 | Audit report | `{"assetId": "...", "type": "audit"}` | Returns full audit report |
| TOOL-RPT-04 | JSON format | `{"format": "json"}` | Returns JSON instead of markdown |

### 3.4 Red Team Tools (When Enabled)

#### redteam_assess

| Test ID | Test Case | Input | Expected Result |
|---------|-----------|-------|-----------------|
| TOOL-RT-01 | Assess asset | `{"assetId": "high-risk-agent"}` | Returns vulnerability assessment |
| TOOL-RT-02 | Disabled | Set AIGRC_RED_TEAM=false | Tool not available |

#### redteam_findings

| Test ID | Test Case | Input | Expected Result |
|---------|-----------|-------|-----------------|
| TOOL-RTF-01 | Get findings | `{"assetId": "high-risk-agent"}` | Returns findings list |
| TOOL-RTF-02 | No findings | New asset | Returns empty findings |

---

## 4. Resources Tests

### 4.1 List Resources

| Test ID | Test Case | Expected Result |
|---------|-----------|-----------------|
| RES-01 | List all resources | Returns profiles, cards, compliance data |
| RES-02 | Profile resources | `aigrc://profile/eu-ai-act` available |
| RES-03 | Card resources | `aigrc://card/{id}` for each card |

### 4.2 Read Resources

| Test ID | Resource URI | Expected Result |
|---------|--------------|-----------------|
| RES-READ-01 | `aigrc://profile/eu-ai-act` | Returns EU AI Act profile details |
| RES-READ-02 | `aigrc://profile/us-omb-m24` | Returns US OMB M-24 profile |
| RES-READ-03 | `aigrc://card/high-risk-agent` | Returns asset card content |
| RES-READ-04 | `aigrc://compliance/high-risk-agent` | Returns compliance status |
| RES-READ-05 | Invalid URI | Returns error |

---

## 5. Prompts Tests

### 5.1 List Prompts

| Test ID | Test Case | Expected Result |
|---------|-----------|-----------------|
| PROMPT-01 | List all prompts | Returns available governance prompts |

### 5.2 Get Prompt

| Test ID | Prompt Name | Expected Result |
|---------|-------------|-----------------|
| PROMPT-GET-01 | `governance_guidance` | Returns governance guidance prompt |
| PROMPT-GET-02 | `risk_assessment` | Returns risk assessment prompt |
| PROMPT-GET-03 | With arguments | Customizes prompt with args |
| PROMPT-GET-04 | Unknown prompt | Returns error |

---

## 6. Integration Tests with Claude

### 6.1 Basic Conversation Flow

```
User: What AI assets are registered in this project?

Expected Claude behavior:
1. Calls get_asset_cards tool
2. Returns formatted list of assets with risk levels
```

### 6.2 Risk Classification Flow

```
User: I'm building an AI agent that will make autonomous decisions
      about customer refunds. What's the risk level?

Expected Claude behavior:
1. Calls classify_risk with appropriate factors
2. Returns multi-jurisdiction classification
3. Explains requirements for each framework
```

### 6.3 Compliance Check Flow

```
User: Is our high-risk-agent compliant with EU AI Act?

Expected Claude behavior:
1. Calls compliance_check for EU AI Act
2. Returns compliance percentage
3. Lists gaps and remediation steps
```

### 6.4 Report Generation Flow

```
User: Generate a gap analysis report for our AI portfolio

Expected Claude behavior:
1. Calls get_asset_cards to list all assets
2. Calls generate_report for each or aggregated
3. Returns formatted markdown report
```

### 6.5 Asset Creation Flow

```
User: Help me register a new AI model for internal use

Expected Claude behavior:
1. Asks clarifying questions about risk factors
2. Calls create_asset_card with gathered info
3. Returns confirmation with card ID and risk level
```

---

## 7. Error Handling Tests

| Test ID | Error Scenario | Expected Result |
|---------|----------------|-----------------|
| ERR-01 | Unknown tool | `{"isError": true, "content": "Unknown tool: ..."}` |
| ERR-02 | Missing required args | Validation error with details |
| ERR-03 | File system error | Graceful error, doesn't crash server |
| ERR-04 | Invalid JSON input | Parse error returned |
| ERR-05 | Timeout handling | Long operations handle gracefully |

---

## 8. Performance Tests

| Test ID | Test Case | Acceptance Criteria |
|---------|-----------|---------------------|
| PERF-01 | Server startup | < 500ms to ready |
| PERF-02 | Tool listing | < 50ms |
| PERF-03 | Simple tool call | < 200ms |
| PERF-04 | Scan 100 files | < 2s |
| PERF-05 | Full report generation | < 5s |
| PERF-06 | Concurrent tool calls | Handles 10 parallel |

---

## 9. Protocol Compliance Tests

### 9.1 MCP Specification Compliance

| Test ID | Requirement | Test |
|---------|-------------|------|
| MCP-01 | JSON-RPC 2.0 format | All responses valid JSON-RPC |
| MCP-02 | Tool schema valid | All tool schemas valid JSON Schema |
| MCP-03 | Resource URIs valid | All URIs follow `aigrc://` scheme |
| MCP-04 | Error format | Errors include code and message |

### 9.2 Capability Negotiation

| Test ID | Test Case | Expected Result |
|---------|-----------|-----------------|
| CAP-01 | List capabilities | Returns tools, resources, prompts |
| CAP-02 | Resource subscription | `subscribe: true` in capabilities |

---

## 10. Test Checklist

- [ ] **Server Startup**
  - [ ] START-01 through START-05
  - [ ] CFG-01 through CFG-08

- [ ] **Core Tools**
  - [ ] scan_directory: TOOL-SCAN-01 through TOOL-SCAN-05
  - [ ] get_asset_cards: TOOL-CARDS-01 through TOOL-CARDS-05
  - [ ] get_asset_card: TOOL-CARD-01 through TOOL-CARD-04
  - [ ] create_asset_card: TOOL-CREATE-01 through TOOL-CREATE-04
  - [ ] validate_asset_card: TOOL-VAL-01 through TOOL-VAL-03
  - [ ] classify_risk: TOOL-CLASS-01 through TOOL-CLASS-04

- [ ] **Compliance Tools**
  - [ ] compliance_check: TOOL-COMP-01 through TOOL-COMP-04
  - [ ] compliance_crosswalk: TOOL-CROSS-01 through TOOL-CROSS-02

- [ ] **Report Tools**
  - [ ] generate_report: TOOL-RPT-01 through TOOL-RPT-04

- [ ] **Red Team Tools**
  - [ ] TOOL-RT-01, TOOL-RT-02
  - [ ] TOOL-RTF-01, TOOL-RTF-02

- [ ] **Resources**
  - [ ] RES-01 through RES-03
  - [ ] RES-READ-01 through RES-READ-05

- [ ] **Prompts**
  - [ ] PROMPT-01 through PROMPT-GET-04

- [ ] **Claude Integration**
  - [ ] Basic conversation flow
  - [ ] Risk classification flow
  - [ ] Compliance check flow
  - [ ] Report generation flow
  - [ ] Asset creation flow

- [ ] **Error Handling**
  - [ ] ERR-01 through ERR-05

- [ ] **Performance**
  - [ ] PERF-01 through PERF-06

- [ ] **Protocol Compliance**
  - [ ] MCP-01 through MCP-04
  - [ ] CAP-01, CAP-02

---

## 11. Debugging Tips

### Enable Debug Logging

```bash
AIGRC_LOG_LEVEL=debug node packages/mcp/dist/bin/aigrc-mcp.js
```

### Test with MCP Inspector

```bash
# Install inspector
npm install -g @anthropic-ai/mcp-inspector

# Run with inspector UI
mcp-inspector node packages/mcp/dist/bin/aigrc-mcp.js
```

### Manual JSON-RPC Testing

```bash
# Send request via stdin
echo '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}' | \
  node packages/mcp/dist/bin/aigrc-mcp.js
```

### Claude Desktop Logs

```bash
# macOS
tail -f ~/Library/Logs/Claude/mcp*.log

# Windows
Get-Content "$env:APPDATA\Claude\logs\mcp*.log" -Wait
```

---

## 12. Known Issues & Limitations

1. Server uses stdio transport only (no HTTP/WebSocket yet)
2. Red team features require explicit enablement
3. Large workspaces may have slow initial scan
4. Profile stacking uses "strictest wins" logic only
