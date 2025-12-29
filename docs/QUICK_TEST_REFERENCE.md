# AIGRC MCP Quick Test Reference

Quick commands to verify your AIGRC MCP integration is working.

## Stdio Transport (Claude Desktop / Cursor)

### Verify Server Starts
```bash
node packages/mcp/dist/bin/aigrc-mcp.js
```

**Expected output:**
```
AIGRC MCP Server v3.0.0 started
Workspace: .
Profiles: eu-ai-act
Red Team: disabled
Telemetry: disabled
Extensions: Value-First, Checkpoint, Golden Thread, Multi-Jurisdiction
```

### Test in Claude Desktop

Ask Claude:
```
What AI governance tools do you have?
```

**Expected:** Claude lists AIGRC tools (26 total)

---

## HTTP Transport (Lovable / Replit / Cloud)

### Start Server
```bash
node packages/mcp/dist/bin/aigrc-mcp-http.js --port 3000
```

### Quick Health Check
```bash
curl http://localhost:3000/health
```

**Expected:**
```json
{"status":"healthy","version":"3.0.0","transport":"streamable-http","sessions":0}
```

### Server Info
```bash
curl http://localhost:3000/
```

**Expected:** JSON with name, version, capabilities, extensions

### Initialize MCP Session
```bash
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test","version":"1.0"}}}'
```

**Expected:** JSON with serverInfo.name = "aigrc"

### List Tools (after init)
```bash
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -H "Mcp-Session-Id: YOUR_SESSION_ID" \
  -d '{"jsonrpc":"2.0","id":2,"method":"tools/list","params":{}}'
```

**Expected:** 26 tools in result.tools array

---

## Tool Quick Tests

### Value-First Tools
| Tool | Purpose | Quick Test |
|------|---------|------------|
| `get_deployment_readiness` | Check if asset is ready | `{"name":"get_deployment_readiness","arguments":{"assetId":"test"}}` |
| `get_blockers` | List PR blockers | `{"name":"get_blockers","arguments":{}}` |
| `estimate_api_costs` | Cost estimates | `{"name":"estimate_api_costs","arguments":{"assetId":"test"}}` |
| `check_security_risks` | Security scan | `{"name":"check_security_risks","arguments":{"assetId":"test"}}` |

### Checkpoint Tools
| Tool | Purpose | Quick Test |
|------|---------|------------|
| `preview_checkpoint_issues` | Preview issues | `{"name":"preview_checkpoint_issues","arguments":{"assetId":"test","checkpoint":"design"}}` |
| `prepare_for_checkpoint` | Prep for review | `{"name":"prepare_for_checkpoint","arguments":{"assetId":"test","checkpoint":"design"}}` |

### Compliance Tools
| Tool | Purpose | Quick Test |
|------|---------|------------|
| `check_compliance` | Check profile | `{"name":"check_compliance","arguments":{"assetId":"test","profile":"eu-ai-act"}}` |
| `gap_analysis` | Find gaps | `{"name":"gap_analysis","arguments":{"assetId":"test"}}` |

---

## Expected Tool Count by Category

| Category | Count |
|----------|-------|
| Value-First | 4 |
| Checkpoint | 3 |
| Policy | 3 |
| Core (scan, create, etc.) | 6 |
| Compliance | 4 |
| Reports | 4 |
| Red Team | 2 |
| **Total** | **26** |

---

## Expected Resources

| Resource | URI |
|----------|-----|
| Asset Cards | `aigrc://cards` |
| Configuration | `aigrc://config` |
| Profiles | `aigrc://profiles` |
| Per-card compliance | `aigrc://compliance/{id}` |
| Per-card crosswalk | `aigrc://crosswalk/{id}` |

---

## Expected Prompts

| Prompt | Description |
|--------|-------------|
| `compliance_review` | Full compliance review |
| `risk_assessment` | Risk classification |
| `gap_remediation` | Gap fix plan |
| `audit_preparation` | Audit prep |
| `generate_documentation` | Doc generation |

---

## Common Issues

| Symptom | Cause | Fix |
|---------|-------|-----|
| "Server not initialized" | Missing init call | Send initialize first |
| "Session not found" | Wrong/missing session ID | Use Mcp-Session-Id header |
| "Not Acceptable" | Missing Accept header | Add `Accept: application/json, text/event-stream` |
| "Asset not found" | No card in .aigrc/cards | Create asset card YAML |
| Empty tools list | Server not initialized | Complete handshake |

---

## Environment Variable Quick Reference

```bash
# Minimum config
export AIGRC_WORKSPACE=/path/to/project
export AIGRC_PROFILES=eu-ai-act

# With Golden Thread
export JIRA_API_URL=https://company.atlassian.net
export JIRA_API_TOKEN=your-token
export JIRA_PROJECT=AI

# With Red Team
export AIGRC_REDTEAM_ENABLED=true
export AIGOS_API_URL=https://aigos-api.example.com
export AIGOS_API_KEY=your-key

# HTTP server specific
export AIGRC_HTTP_PORT=3000
export AIGRC_HTTP_AUTH_ENABLED=true
```
