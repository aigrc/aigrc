# AIGRC MCP Integration Guide: Claude Desktop & Cursor

This guide provides step-by-step instructions for integrating the AIGRC MCP Server with Claude Desktop and Cursor IDE.

## Prerequisites

- Node.js 18+ installed
- AIGRC MCP package built (`pnpm run build`)
- Claude Desktop or Cursor installed

## Part 1: Claude Desktop Integration

### Step 1: Locate Claude Desktop Configuration

**Windows:**
```
%APPDATA%\Claude\claude_desktop_config.json
```

**macOS:**
```
~/Library/Application Support/Claude/claude_desktop_config.json
```

**Linux:**
```
~/.config/Claude/claude_desktop_config.json
```

### Step 2: Configure AIGRC MCP Server

Edit (or create) `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "aigrc": {
      "command": "node",
      "args": [
        "C:/path/to/aigrc/packages/mcp/dist/bin/aigrc-mcp.js"
      ],
      "env": {
        "AIGRC_WORKSPACE": "C:/path/to/your/project",
        "AIGRC_PROFILES": "eu-ai-act",
        "AIGRC_LOG_LEVEL": "info"
      }
    }
  }
}
```

**Replace paths with your actual paths!**

### Step 3: Restart Claude Desktop

1. Completely quit Claude Desktop (not just close the window)
2. Relaunch Claude Desktop
3. Look for the MCP indicator in the chat interface

### Step 4: Verify Integration

In Claude Desktop, try these commands:

```
What AI governance tools do you have available?
```

Claude should respond with a list of AIGRC tools including:
- `get_deployment_readiness`
- `get_blockers`
- `check_policy`
- `prepare_for_checkpoint`
- And more...

### Step 5: Test Core Functionality

**Test 1: Check Deployment Readiness**
```
Check if "my-ai-agent" is ready for deployment
```

**Test 2: Get PR Blockers**
```
What are the AI governance blockers in this project?
```

**Test 3: Estimate API Costs**
```
Estimate the API costs for my AI system
```

**Test 4: Check Compliance**
```
Show me the compliance status for eu-ai-act
```

---

## Part 2: Cursor IDE Integration

### Step 1: Locate Cursor MCP Configuration

Cursor uses the same configuration format as Claude Desktop.

**Windows:**
```
%APPDATA%\Cursor\mcp.json
```

**macOS:**
```
~/Library/Application Support/Cursor/mcp.json
```

### Step 2: Configure AIGRC MCP Server

Create or edit `mcp.json`:

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
        "AIGRC_PROFILES": "eu-ai-act,nist-rmf",
        "AIGRC_LOG_LEVEL": "info"
      }
    }
  }
}
```

### Step 3: Restart Cursor

1. Close all Cursor windows
2. Relaunch Cursor
3. Open your project

### Step 4: Verify Integration

In Cursor's AI chat, ask:

```
@aigrc What tools do you have for AI governance?
```

---

## Testing Checklist

### Basic Connectivity
- [ ] Server starts without errors
- [ ] Tools list is returned (26 tools expected)
- [ ] Resources list is returned
- [ ] Prompts list is returned (5 prompts expected)

### Value-First Tools
- [ ] `get_deployment_readiness` - Returns status for an asset
- [ ] `get_blockers` - Lists PR blockers
- [ ] `estimate_api_costs` - Returns cost estimates
- [ ] `check_security_risks` - Lists security concerns

### Checkpoint Tools
- [ ] `preview_checkpoint_issues` - Shows upcoming issues
- [ ] `generate_checkpoint_artifacts` - Creates artifacts
- [ ] `prepare_for_checkpoint` - Prepares asset for checkpoint

### Policy Tools
- [ ] `check_policy` - Validates policy compliance
- [ ] `link_business_intent` - Links to Jira/ADO tickets
- [ ] `get_business_context` - Retrieves business justification

### Compliance Tools
- [ ] `check_compliance` - Checks against profiles
- [ ] `gap_analysis` - Identifies compliance gaps
- [ ] `crosswalk` - Maps across frameworks

---

## Troubleshooting

### Server Not Starting

**Check logs:**
```bash
# Run manually to see errors
node /path/to/aigrc/packages/mcp/dist/bin/aigrc-mcp.js
```

**Common issues:**
1. Wrong path in configuration
2. Missing Node.js
3. Package not built

### Tools Not Appearing

1. Verify the MCP server is in the config
2. Check Claude/Cursor has been fully restarted
3. Look for error messages in Claude/Cursor developer console

### "Asset Not Found" Errors

Ensure your workspace has `.aigrc/cards/` directory with asset card YAML files:

```yaml
# .aigrc/cards/my-agent.yaml
apiVersion: aigrc.io/v1
kind: AssetCard
name: my-agent
description: My AI agent

technical:
  type: agent
  framework: langchain
  model: gpt-4
  entrypoint: src/agent.py

classification:
  riskLevel: high
  euAiAct:
    category: high-risk

ownership:
  team: ai-team
  owner: owner@company.com

governance:
  status: draft
  approvals: []

intent:
  linked: false
```

---

## Environment Variables Reference

| Variable | Description | Default |
|----------|-------------|---------|
| `AIGRC_WORKSPACE` | Project directory | `.` |
| `AIGRC_CARDS_DIR` | Asset cards directory | `.aigrc/cards` |
| `AIGRC_PROFILES` | Compliance profiles (comma-separated) | `eu-ai-act` |
| `AIGRC_LOG_LEVEL` | Log level: debug, info, warn, error | `info` |
| `AIGRC_REDTEAM_ENABLED` | Enable red team features | `false` |
| `JIRA_API_URL` | Jira API URL for Golden Thread | - |
| `JIRA_API_TOKEN` | Jira API token | - |
| `ADO_ORG_URL` | Azure DevOps org URL | - |
| `ADO_API_TOKEN` | Azure DevOps API token | - |

---

## Example Workflows

### Workflow 1: Pre-PR Governance Check

```
Hey Claude, I'm about to submit a PR for my AI agent.
Can you check if there are any governance blockers?
```

### Workflow 2: Checkpoint Preparation

```
I need to prepare my-agent for the design checkpoint.
What artifacts do I need and what issues should I fix first?
```

### Workflow 3: Compliance Review

```
Review my-agent for EU AI Act compliance and tell me what gaps I need to address.
```

### Workflow 4: Risk Assessment

```
Perform a risk assessment for my-agent and classify it under EU AI Act.
```

---

## Next Steps

Once integration is verified:

1. **Create Asset Cards** - Register your AI assets with `aigrc register`
2. **Configure Profiles** - Set up compliance profiles for your jurisdiction
3. **Set Up Golden Thread** - Connect to Jira/ADO for traceability
4. **Enable Red Team** - Turn on adversarial testing (if licensed)

For more information, see the main [AIGRC Documentation](../README.md).
