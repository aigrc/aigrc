# Module 3.1: MCP Server Integration

> **Duration:** 45-60 minutes
> **Level:** Advanced
> **Prerequisites:** Level 1 complete, Level 2.1 (CLI) recommended

---

## Learning Objectives

By the end of this module, you will be able to:
1. Explain the Model Context Protocol (MCP) and its role in AI governance
2. Configure AIGRC MCP server for Claude Desktop and other AI assistants
3. Use MCP tools for governance operations (scan, classify, validate)
4. Leverage MCP resources and prompts for governance workflows
5. Troubleshoot common MCP integration issues

---

## Overview (5 min)

The Model Context Protocol (MCP) enables AI assistants like Claude to interact with external tools and data. The AIGRC MCP server exposes all governance capabilities to AI assistants, enabling governance-aware AI development.

**What this unlocks:**
- Claude can scan projects for AI assets
- AI assistants can classify risk and suggest controls
- Governance checks during AI-assisted development
- Natural language governance queries

---

## WHY: AI-Assisted Governance (15 min)

### The Challenge

Developers increasingly use AI assistants for coding:
- GitHub Copilot for code completion
- Claude for architecture decisions
- ChatGPT for debugging

**But these AI assistants are governance-blind:**
- They suggest AI integrations without risk assessment
- They don't know your organization's policies
- They can't validate compliance requirements

### The Solution: Governance-Aware AI

```
Traditional Development          Governance-Aware Development
─────────────────────────       ────────────────────────────

Developer: "Add OpenAI"          Developer: "Add OpenAI"
AI: "Here's the code"            AI: "I'll check governance first..."
                                     "This will be LIMITED risk"
[No risk assessment]                 "Transparency required"
[No documentation]                   "Creating asset card..."
[No policy check]                    "Here's compliant code"
```

### MCP: The Enabler

The Model Context Protocol provides:

| Capability | Governance Use |
|------------|----------------|
| **Tools** | Execute governance commands (scan, classify) |
| **Resources** | Access asset cards, policies, profiles |
| **Prompts** | Guided governance workflows |
| **Sampling** | AI-generated compliance suggestions |

### Value Proposition

| Stakeholder | Benefit |
|-------------|---------|
| **Developers** | Governance happens automatically during development |
| **Compliance** | Every AI interaction is governance-aware |
| **Security** | Policy enforcement at the point of creation |
| **Leadership** | Reduced shadow AI risk |

---

## WHAT: MCP Architecture (15 min)

### How MCP Works

```
┌──────────────────┐     MCP Protocol      ┌──────────────────┐
│   AI Assistant   │◄────────────────────►│  AIGRC MCP Server │
│   (Claude, etc)  │     JSON-RPC 2.0      │                   │
└──────────────────┘                       └────────┬──────────┘
                                                    │
                                           ┌────────┴────────┐
                                           │                 │
                                    ┌──────┴───┐      ┌──────┴───┐
                                    │ @aigrc/  │      │ Project  │
                                    │  core    │      │  Files   │
                                    └──────────┘      └──────────┘
```

### AIGRC MCP Server Components

#### 1. Transport Layers

| Transport | Use Case | Command |
|-----------|----------|---------|
| **Stdio** | Claude Desktop, local | `aigrc-mcp` |
| **HTTP/SSE** | Cloud IDEs, web apps | `aigrc-mcp-http` |

#### 2. Available Tools

| Tool | Purpose | Example Use |
|------|---------|-------------|
| `scan_directory` | Detect AI frameworks | "Scan this project for AI" |
| `get_asset_cards` | List registered assets | "Show me all AI assets" |
| `create_asset_card` | Generate asset card | "Create a card for this chatbot" |
| `validate_asset_card` | Check card validity | "Is this asset card valid?" |
| `classify_risk` | Determine risk level | "What risk level is this?" |
| `compliance_check` | Check against profiles | "Are we EU AI Act compliant?" |
| `compliance_crosswalk` | Compare frameworks | "Map NIST to ISO 42001" |
| `generate_report` | Create compliance report | "Generate gap analysis" |
| `golden_thread_link` | Link to Jira/tickets | "Link to Jira AIG-123" |

#### 3. Available Resources

| Resource URI | Content |
|--------------|---------|
| `aigrc://assets/{id}` | Individual asset card |
| `aigrc://config` | Project configuration |
| `aigrc://profiles/{name}` | Compliance profile |
| `aigrc://governance-lock` | Policy constraints |

#### 4. Available Prompts

| Prompt | Purpose |
|--------|---------|
| `classify_ai_system` | Guided risk classification |
| `create_asset_card` | Step-by-step card creation |
| `compliance_review` | Compliance assessment workflow |
| `red_team_assessment` | Security review prompt |

---

## HOW: Setup and Usage (20 min)

### Step 1: Install MCP Server

```bash
# Install globally
npm install -g @aigrc/mcp

# Verify installation
aigrc-mcp --version
# Output: @aigrc/mcp 3.0.0
```

### Step 2: Configure Claude Desktop

Edit Claude Desktop configuration:

**macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows:** `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "aigrc": {
      "command": "aigrc-mcp",
      "args": [],
      "env": {
        "AIGRC_WORKSPACE": "/path/to/your/project"
      }
    }
  }
}
```

### Step 3: Restart Claude Desktop

1. Quit Claude Desktop completely
2. Reopen Claude Desktop
3. Look for the AIGRC tools in the tools menu (🔧)

### Step 4: Test the Integration

In Claude Desktop, try:

```
"Please scan my project for AI frameworks"
```

**Expected Response:**
```
I'll scan your project using the AIGRC tools.

[Tool: scan_directory]

Found 3 AI/ML framework detections:
- openai (high confidence) at src/ai/chat.ts:5
- langchain (high confidence) at src/agents/research.py:1
- transformers (medium confidence) at ml/model.py:3

Would you like me to:
1. Create asset cards for these detections?
2. Classify their risk levels?
3. Check compliance with a specific framework?
```

### Step 5: Using Tools Through Claude

#### Classify Risk

```
"What risk level would a customer service chatbot be?"
```

Claude will use `classify_risk` tool:
```
Based on the classification criteria:

Risk Level: LIMITED

Rationale:
- Customer-facing AI interaction
- No decisions affecting fundamental rights
- Transparency disclosure required

EU AI Act Requirements:
- Must disclose AI nature to users
- Should be labeled as AI-generated content
```

#### Create Asset Card

```
"Create an asset card for our OpenAI integration"
```

Claude will use `create_asset_card` tool:
```
I've created an asset card at .aigrc/cards/openai-integration.asset.yaml

Key details:
- Risk Level: Limited
- Owner: (please specify)
- Frameworks: OpenAI GPT-4

Would you like me to:
1. Fill in the owner information?
2. Add data processing details?
3. Generate transparency disclosure text?
```

#### Compliance Check

```
"Check if we're compliant with EU AI Act"
```

Claude will use `compliance_check` tool:
```
EU AI Act Compliance Assessment:

✅ All high-risk requirements documented
⚠️ 2 limited-risk assets missing transparency disclosure
❌ 1 asset missing risk classification

Recommendations:
1. Add disclosure text to customer-chatbot asset
2. Add disclosure text to support-bot asset
3. Classify ml-classifier asset

Would you like me to help fix these issues?
```

### Step 6: HTTP Server for Cloud IDEs

For Replit, Cursor, or other cloud environments:

```bash
# Start HTTP server
aigrc-mcp-http --port 3000

# Server running at http://localhost:3000
```

Configure your IDE to connect to `http://localhost:3000/sse`.

---

## Practice Lab (15 min)

### Exercise 1: Claude Desktop Setup

1. Install `@aigrc/mcp` globally
2. Configure Claude Desktop with your project path
3. Restart Claude Desktop
4. Ask Claude to scan your project
5. Verify the scan results match `aigrc scan` CLI output

### Exercise 2: Interactive Governance

Using Claude Desktop:

1. Ask: "What AI frameworks are in this project?"
2. Ask: "Create an asset card for the OpenAI integration"
3. Ask: "What's the risk level of this chatbot?"
4. Ask: "Check compliance with NIST AI RMF"
5. Ask: "Generate a gap analysis report"

### Exercise 3: Troubleshooting

If tools aren't appearing:
1. Check Claude Desktop logs
2. Verify `aigrc-mcp --version` works
3. Confirm config.json syntax is valid
4. Try running `aigrc-mcp` directly to see errors

---

## Advanced Configuration

### Environment Variables

| Variable | Purpose | Default |
|----------|---------|---------|
| `AIGRC_WORKSPACE` | Project directory | Current directory |
| `AIGRC_LOG_LEVEL` | Logging verbosity | `info` |
| `AIGRC_PROFILE` | Default compliance profile | None |

### Authentication (Enterprise)

For multi-user environments:

```json
{
  "mcpServers": {
    "aigrc": {
      "command": "aigrc-mcp",
      "env": {
        "AIGRC_AUTH_TOKEN": "${AIGRC_TOKEN}",
        "AIGRC_ORG_ID": "acme-corp"
      }
    }
  }
}
```

### Custom Prompts

Add organization-specific prompts:

```yaml
# .aigrc/prompts/custom-review.yaml
name: security_review
description: Security-focused AI review
template: |
  Review this AI system for security considerations:
  - Data handling practices
  - API key management
  - Input validation
  - Output filtering
```

---

## Knowledge Check

1. **MCP stands for:**
   - a) Machine Control Protocol
   - b) Model Context Protocol ✓
   - c) Multi-Cloud Platform
   - d) Managed Compliance Program

2. **The AIGRC MCP server exposes governance via:**
   - a) REST API only
   - b) GraphQL only
   - c) Tools, Resources, and Prompts ✓
   - d) Command line only

3. **To use MCP with Claude Desktop, you configure:**
   - a) Environment variables only
   - b) claude_desktop_config.json ✓
   - c) A browser extension
   - d) The AIGRC CLI

4. **The `scan_directory` MCP tool is equivalent to:**
   - a) `aigrc init`
   - b) `aigrc scan` ✓
   - c) `aigrc validate`
   - d) `aigrc register`

---

## Key Takeaways

1. **MCP makes AI assistants governance-aware** - No more blind AI suggestions
2. **Two transports:** Stdio for local, HTTP for cloud
3. **Tools mirror CLI commands** - Same capabilities, conversational interface
4. **Resources expose governance data** - Asset cards, policies, profiles
5. **Configuration is per-project** - Set AIGRC_WORKSPACE appropriately

---

## Troubleshooting Reference

| Issue | Cause | Solution |
|-------|-------|----------|
| Tools not showing | Config error | Check JSON syntax |
| "Server not found" | Path incorrect | Use absolute path to aigrc-mcp |
| Scan returns empty | Wrong workspace | Set AIGRC_WORKSPACE |
| HTTP connection fails | Firewall | Check port 3000 is open |
| Slow responses | Large project | Use specific directory paths |

---

## Further Reading

- MCP Specification: `aigrc/docs/AIGRC_MCP_SPECIFICATION_v3.md`
- Claude Desktop Guide: `aigrc/docs/CLAUDE_CURSOR_INTEGRATION.md`
- Cloud IDE Guide: `aigrc/docs/LOVABLE_REPLIT_INTEGRATION.md`
- MCP Test Plan: `aigrc/test-environment/MCP_SERVER_TEST_PLAN.md`

---

## Next Module

[Module 3.2: Multi-Jurisdiction Compliance →](./02-multi-jurisdiction-compliance.md)

---

*Module 3.1 - AIGRC Training Program v1.0*
