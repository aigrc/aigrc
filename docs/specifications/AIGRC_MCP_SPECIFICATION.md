# AIGRC MCP Server Specification

## Version 2.0.0

### Document Status: Draft

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Protocol Compliance](#protocol-compliance)
4. [Server Capabilities](#server-capabilities)
5. [Tools](#tools)
   - [Core Tools](#core-tools)
   - [Multi-Jurisdiction Compliance Tools](#multi-jurisdiction-compliance-tools)
   - [Red Team Integration Tools](#red-team-integration-tools)
6. [Resources](#resources)
7. [Prompts](#prompts)
8. [Configuration](#configuration)
9. [Security Considerations](#security-considerations)
10. [Implementation Plan](#implementation-plan)

---

## Overview

### Purpose

The AIGRC MCP (Model Context Protocol) Server enables AI assistants and LLM-powered tools to interact with AI governance data, perform compliance checks, manage asset cards, and orchestrate security verification through a standardized protocol.

### Goals

1. **Enable AI-Assisted Governance** - Allow LLMs to help users manage AI compliance
2. **Provide Governance Context** - Give AI assistants access to asset cards and risk data
3. **Automate Compliance Tasks** - Enable automated scanning, validation, and reporting
4. **Support Multi-Jurisdiction Compliance** - Handle EU, US, UK, and other regulatory frameworks
5. **Integrate Red Team Verification** - Expose security testing capabilities to AI assistants
6. **Support Multi-Tool Integration** - Work with Claude Desktop, VS Code, and other MCP clients

### Use Cases

| Use Case | Description |
|----------|-------------|
| Compliance Q&A | "What's the risk level of our chatbot under US OMB M-24?" |
| Asset Discovery | "Find all high-risk AI systems in our codebase" |
| Card Generation | "Create an asset card for this new ML model" |
| Multi-Jurisdiction Mapping | "Show me how this asset is classified across EU, US, and NIST frameworks" |
| Gap Analysis | "What compliance gaps do we have for US federal requirements?" |
| Red Team Status | "What vulnerabilities were found in our customer agent?" |
| Audit Support | "Generate a compliance report for all assets across all profiles" |

---

## Architecture

### System Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              MCP Clients                                     │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │   Claude    │  │   VS Code   │  │   AIGOS     │  │   Custom    │        │
│  │   Desktop   │  │   + Cline   │  │  Dashboard  │  │   Clients   │        │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘        │
└─────────┼────────────────┼────────────────┼────────────────┼────────────────┘
          │                │                │                │
          │         MCP Protocol (JSON-RPC over stdio/SSE)
          │                │                │                │
┌─────────┴────────────────┴────────────────┴────────────────┴────────────────┐
│                           AIGRC MCP Server                                   │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │                         Protocol Layer                                 │  │
│  │  • JSON-RPC 2.0 handling    • Request/Response management              │  │
│  │  • Capability negotiation    • Subscription management                 │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │                          Service Layer                                 │  │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐    │  │
│  │  │ Scanner  │ │  Cards   │ │ Classify │ │ Compliance│ │ RedTeam  │    │  │
│  │  │ Service  │ │ Service  │ │ Service  │ │ Service   │ │ Service  │    │  │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘    │  │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐                              │  │
│  │  │ Profile  │ │ Crosswalk│ │ Reports  │                              │  │
│  │  │ Service  │ │ Service  │ │ Service  │                              │  │
│  │  └──────────┘ └──────────┘ └──────────┘                              │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │                           @aigrc/core                                  │  │
│  │  • Detection Engine     • Risk Classification    • Golden Thread       │  │
│  │  • Asset Card Schema    • Profile Loader         • Control Evaluator   │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │                          @aigrc/profiles                               │  │
│  │  • EU AI Act    • US OMB M-24    • NIST AI RMF    • ISO 42001         │  │
│  │  • Colorado     • NYC LL144      • CycloneDX      • Custom Profiles   │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
          │                │                │                │
          ▼                ▼                ▼                ▼
    ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐
    │  Local   │    │  Asset   │    │ Profiles │    │ Red Team │
    │  Files   │    │  Cards   │    │ & Config │    │ Findings │
    └──────────┘    └──────────┘    └──────────┘    └──────────┘
```

### Component Overview

| Component | Responsibility |
|-----------|----------------|
| Protocol Layer | MCP protocol handling, JSON-RPC, transport |
| Scanner Service | File scanning, framework detection |
| Cards Service | Asset card CRUD operations |
| Classify Service | Multi-jurisdiction risk classification |
| Compliance Service | Control evaluation, gap analysis |
| Profile Service | Compliance profile management |
| Crosswalk Service | Cross-framework mapping |
| RedTeam Service | Red team findings integration |
| Reports Service | Compliance reports, audit summaries |

---

## Protocol Compliance

### MCP Version

Implements MCP Protocol version **2024-11-05** (latest stable).

### Transport Support

| Transport | Support | Notes |
|-----------|---------|-------|
| stdio | Primary | Default for Claude Desktop |
| SSE | Supported | For web-based clients, AIGOS dashboard |
| WebSocket | Future | For real-time red team updates |

### Required Protocol Methods

```typescript
// Initialization
"initialize" → ServerCapabilities
"initialized" → void

// Tools
"tools/list" → Tool[]
"tools/call" → CallToolResult

// Resources
"resources/list" → Resource[]
"resources/read" → ResourceContent[]
"resources/subscribe" → void
"resources/unsubscribe" → void

// Prompts
"prompts/list" → Prompt[]
"prompts/get" → GetPromptResult

// Lifecycle
"ping" → void
"notifications/cancelled" → void
"notifications/resources/updated" → void  // For red team findings
```

---

## Server Capabilities

### Capability Declaration

```json
{
  "capabilities": {
    "tools": {
      "listChanged": true
    },
    "resources": {
      "subscribe": true,
      "listChanged": true
    },
    "prompts": {
      "listChanged": true
    },
    "logging": {}
  },
  "serverInfo": {
    "name": "aigrc-mcp",
    "version": "2.0.0"
  },
  "extensions": {
    "multiJurisdiction": true,
    "redTeamIntegration": true,
    "profileStacking": true
  }
}
```

---

## Tools

### Core Tools

#### Tool: `scan_directory`

Scan a directory for AI/ML frameworks.

**Input Schema:**
```json
{
  "type": "object",
  "properties": {
    "directory": {
      "type": "string",
      "description": "Directory path to scan (absolute or relative to workspace)"
    },
    "exclude": {
      "type": "array",
      "items": { "type": "string" },
      "description": "Patterns to exclude from scan",
      "default": ["node_modules", ".git", "dist"]
    },
    "include": {
      "type": "array",
      "items": { "type": "string" },
      "description": "Patterns to include in scan"
    }
  },
  "required": ["directory"]
}
```

---

#### Tool: `get_asset_cards`

List all registered asset cards.

**Input Schema:**
```json
{
  "type": "object",
  "properties": {
    "directory": {
      "type": "string",
      "description": "Workspace directory",
      "default": "."
    },
    "riskLevel": {
      "type": "string",
      "enum": ["minimal", "limited", "high", "unacceptable"],
      "description": "Filter by risk level (EU AI Act)"
    },
    "profile": {
      "type": "string",
      "description": "Filter by classification from specific profile (e.g., 'us-omb-m24')"
    },
    "classification": {
      "type": "string",
      "description": "Filter by classification value (e.g., 'safety-impacting', 'rights-impacting')"
    }
  }
}
```

---

#### Tool: `get_asset_card`

Get details of a specific asset card.

**Input Schema:**
```json
{
  "type": "object",
  "properties": {
    "id": {
      "type": "string",
      "description": "Asset card ID or name"
    },
    "directory": {
      "type": "string",
      "default": "."
    },
    "includeCompliance": {
      "type": "boolean",
      "default": true,
      "description": "Include compliance status for all active profiles"
    },
    "includeRedTeam": {
      "type": "boolean",
      "default": false,
      "description": "Include red team findings"
    }
  },
  "required": ["id"]
}
```

---

#### Tool: `create_asset_card`

Create a new asset card with multi-jurisdiction support.

**Input Schema:**
```json
{
  "type": "object",
  "properties": {
    "name": {
      "type": "string",
      "description": "Asset name"
    },
    "description": {
      "type": "string",
      "description": "Asset description"
    },
    "type": {
      "type": "string",
      "enum": ["api_client", "framework", "agent", "model", "pipeline"],
      "description": "Asset type"
    },
    "framework": {
      "type": "string",
      "description": "Primary AI framework"
    },
    "owner": {
      "type": "object",
      "properties": {
        "name": { "type": "string" },
        "email": { "type": "string" }
      },
      "required": ["name", "email"]
    },
    "riskFactors": {
      "type": "object",
      "properties": {
        "autonomousDecisions": { "type": "boolean" },
        "customerFacing": { "type": "boolean" },
        "toolExecution": { "type": "boolean" },
        "externalDataAccess": { "type": "boolean" },
        "piiProcessing": { "type": "string", "enum": ["yes", "no", "unknown"] },
        "highStakesDecisions": { "type": "boolean" },
        "affectsSafety": { "type": "boolean" },
        "affectsRights": { "type": "boolean" },
        "principalBasisForDecision": { "type": "boolean" }
      }
    },
    "applicability": {
      "type": "object",
      "description": "Jurisdictional applicability",
      "properties": {
        "primaryJurisdiction": { "type": "string" },
        "operatingRegions": { "type": "array", "items": { "type": "string" } },
        "dataResidency": { "type": "array", "items": { "type": "string" } }
      }
    },
    "directory": {
      "type": "string",
      "default": "."
    }
  },
  "required": ["name", "owner"]
}
```

---

#### Tool: `validate_asset_cards`

Validate all asset cards against active compliance profiles.

**Input Schema:**
```json
{
  "type": "object",
  "properties": {
    "directory": {
      "type": "string",
      "default": "."
    },
    "profiles": {
      "type": "array",
      "items": { "type": "string" },
      "description": "Specific profiles to validate against (default: all active)"
    },
    "strict": {
      "type": "boolean",
      "default": false,
      "description": "Treat warnings as errors"
    }
  }
}
```

---

#### Tool: `classify_risk`

Classify risk level across multiple jurisdictions.

**Input Schema:**
```json
{
  "type": "object",
  "properties": {
    "autonomousDecisions": { "type": "boolean" },
    "customerFacing": { "type": "boolean" },
    "toolExecution": { "type": "boolean" },
    "externalDataAccess": { "type": "boolean" },
    "piiProcessing": { "type": "string", "enum": ["yes", "no", "unknown"] },
    "highStakesDecisions": { "type": "boolean" },
    "affectsSafety": { "type": "boolean" },
    "affectsRights": { "type": "boolean" },
    "domain": {
      "type": "string",
      "enum": ["employment", "education", "credit", "healthcare", "critical_infrastructure", "law_enforcement", "general"]
    },
    "profiles": {
      "type": "array",
      "items": { "type": "string" },
      "description": "Profiles to classify against (default: all active)"
    }
  }
}
```

**Output:**
```json
{
  "content": [
    {
      "type": "text",
      "text": "## Multi-Jurisdiction Risk Classification\n\n| Profile | Classification | Reasons |\n|---------|---------------|----------|\n| eu-ai-act | HIGH | Autonomous decisions, PII processing |\n| us-omb-m24 | RIGHTS-IMPACTING | Affects employment decisions |\n| nist-ai-rmf | HIGH | Elevated risk profile |\n| iso-42001 | CERT-RECOMMENDED | Customer-facing, high autonomy |\n\n### Required Artifacts (Union of all profiles)\n- AI Impact Assessment\n- Risk Management Plan\n- Human Oversight Documentation\n- Technical Documentation"
    }
  ]
}
```

---

### Multi-Jurisdiction Compliance Tools

#### Tool: `list_compliance_profiles`

List available compliance profiles.

**Input Schema:**
```json
{
  "type": "object",
  "properties": {
    "type": {
      "type": "string",
      "enum": ["regulation", "standard", "internal", "all"],
      "default": "all",
      "description": "Filter by profile type"
    },
    "jurisdiction": {
      "type": "string",
      "description": "Filter by jurisdiction (e.g., 'US', 'EU', 'UK')"
    }
  }
}
```

**Output:**
```json
{
  "content": [
    {
      "type": "text",
      "text": "## Available Compliance Profiles\n\n### Regulations\n| ID | Name | Jurisdiction | Effective Date |\n|----|------|--------------|----------------|\n| eu-ai-act | EU AI Act | EU | Aug 2024 |\n| us-omb-m24 | OMB M-24-10/M-24-18 | US (Federal) | Mar 2024 |\n| us-colorado | Colorado AI Act | US (State) | Feb 2026 |\n| us-nyc-ll144 | NYC Local Law 144 | US (City) | In Force |\n\n### Standards\n| ID | Name | Type |\n|----|------|------|\n| nist-ai-rmf | NIST AI Risk Management Framework | Framework |\n| iso-42001 | ISO/IEC 42001 AI Management System | Certification |\n| cyclonedx-ml-bom | CycloneDX ML-BOM | Supply Chain |"
    }
  ]
}
```

---

#### Tool: `add_compliance_profile`

Add a compliance profile to the workspace.

**Input Schema:**
```json
{
  "type": "object",
  "properties": {
    "profileId": {
      "type": "string",
      "description": "Profile ID to add (e.g., 'us-omb-m24')"
    },
    "directory": {
      "type": "string",
      "default": "."
    }
  },
  "required": ["profileId"]
}
```

---

#### Tool: `get_active_profiles`

Get currently active compliance profiles for the workspace.

**Input Schema:**
```json
{
  "type": "object",
  "properties": {
    "directory": {
      "type": "string",
      "default": "."
    }
  }
}
```

---

#### Tool: `check_compliance`

Check asset compliance against specific profiles.

**Input Schema:**
```json
{
  "type": "object",
  "properties": {
    "assetId": {
      "type": "string",
      "description": "Asset to check (or 'all' for all assets)"
    },
    "profiles": {
      "type": "array",
      "items": { "type": "string" },
      "description": "Profiles to check against (default: all active)"
    },
    "directory": {
      "type": "string",
      "default": "."
    }
  },
  "required": ["assetId"]
}
```

**Output:**
```json
{
  "content": [
    {
      "type": "text",
      "text": "## Compliance Check: customer-support-bot\n\n### us-omb-m24 (Rights-Impacting)\n| Control | Status | Details |\n|---------|--------|----------|\n| omb-5c-i | ✗ Missing | AI Impact Assessment not found |\n| omb-5c-ii | ✓ Compliant | Real-world testing documented |\n| omb-5c-iii | ⏳ Pending | Independent evaluation scheduled |\n| omb-5c-v-d | ✗ Missing | Adverse decision notice not configured |\n\n**Compliance: 25% (1/4 controls)**\n\n### eu-ai-act (High)\n| Control | Status | Details |\n|---------|--------|----------|\n| art-9 | ✗ Missing | Risk management system not documented |\n| art-13 | ✓ Compliant | Transparency measures in place |\n| art-14 | ✓ Compliant | Human oversight documented |\n\n**Compliance: 67% (2/3 controls)**\n\n### Required Actions\n1. Create AI Impact Assessment (run: `aigrc generate omb-impact-assessment`)\n2. Document risk management system\n3. Configure adverse decision notice"
    }
  ]
}
```

---

#### Tool: `get_crosswalk`

Get cross-framework classification mapping.

**Input Schema:**
```json
{
  "type": "object",
  "properties": {
    "assetId": {
      "type": "string",
      "description": "Asset to map"
    },
    "profiles": {
      "type": "array",
      "items": { "type": "string" },
      "description": "Profiles to include in crosswalk"
    },
    "directory": {
      "type": "string",
      "default": "."
    }
  },
  "required": ["assetId"]
}
```

**Output:**
```json
{
  "content": [
    {
      "type": "text",
      "text": "## Cross-Framework Mapping: customer-support-bot\n\n```\n┌─────────────────┬──────────────┬──────────────┬──────────────┬──────────────┐\n│ Risk Factors    │ EU AI Act    │ OMB M-24     │ NIST RMF     │ ISO 42001    │\n├─────────────────┼──────────────┼──────────────┼──────────────┼──────────────┤\n│ Classification  │ HIGH         │ RIGHTS       │ HIGH         │ CERT-REQ     │\n│ Primary Trigger │ Employment   │ Employment   │ Elevated     │ High autonomy│\n│ Key Controls    │ Art. 9,13,14 │ 5c-i to 5c-v │ MAP, MEASURE │ AIMS clauses │\n└─────────────────┴──────────────┴──────────────┴──────────────┴──────────────┘\n```\n\n### Equivalence Notes\n- EU HIGH ≈ OMB RIGHTS-IMPACTING ≈ NIST HIGH\n- All require conformity/impact assessment\n- All require human oversight mechanisms"
    }
  ]
}
```

---

#### Tool: `generate_artifact`

Generate compliance artifact from template.

**Input Schema:**
```json
{
  "type": "object",
  "properties": {
    "assetId": {
      "type": "string",
      "description": "Asset to generate artifact for"
    },
    "artifactType": {
      "type": "string",
      "enum": [
        "ai_impact_assessment",
        "risk_management_plan",
        "technical_documentation",
        "human_oversight_procedures",
        "testing_report",
        "equity_assessment",
        "notice_and_explanation",
        "nist_risk_profile",
        "cyclonedx_ml_bom"
      ],
      "description": "Type of artifact to generate"
    },
    "profile": {
      "type": "string",
      "description": "Profile template to use (e.g., 'us-omb-m24')"
    },
    "format": {
      "type": "string",
      "enum": ["markdown", "json", "yaml"],
      "default": "markdown"
    },
    "directory": {
      "type": "string",
      "default": "."
    }
  },
  "required": ["assetId", "artifactType"]
}
```

---

#### Tool: `gap_analysis`

Perform gap analysis across all profiles.

**Input Schema:**
```json
{
  "type": "object",
  "properties": {
    "assetId": {
      "type": "string",
      "description": "Asset to analyze (or 'all')"
    },
    "profiles": {
      "type": "array",
      "items": { "type": "string" },
      "description": "Profiles to analyze against"
    },
    "directory": {
      "type": "string",
      "default": "."
    }
  }
}
```

**Output:**
```json
{
  "content": [
    {
      "type": "text",
      "text": "## Gap Analysis Report\n\n### Summary\n| Profile | Compliance | Gaps | Priority |\n|---------|------------|------|----------|\n| us-omb-m24 | 25% | 3 | CRITICAL |\n| eu-ai-act | 67% | 1 | HIGH |\n| nist-ai-rmf | 50% | 2 | MEDIUM |\n\n### Critical Gaps\n1. **AI Impact Assessment** (us-omb-m24, eu-ai-act)\n   - Required by: Section 5(c)(i), Article 9\n   - Status: Missing\n   - Template: `aigrc generate ai_impact_assessment --profile us-omb-m24`\n\n2. **Adverse Decision Notice** (us-omb-m24)\n   - Required by: Section 5(c)(v)(D)\n   - Status: Not configured\n   - Action: Add notice_and_explanation artifact\n\n### Recommendations\n1. Prioritize AI Impact Assessment (satisfies 2 frameworks)\n2. Add risk management documentation\n3. Schedule independent evaluation"
    }
  ]
}
```

---

### Red Team Integration Tools

#### Tool: `get_redteam_status`

Get red team verification status for an asset.

**Input Schema:**
```json
{
  "type": "object",
  "properties": {
    "assetId": {
      "type": "string",
      "description": "Asset to check"
    },
    "directory": {
      "type": "string",
      "default": "."
    }
  },
  "required": ["assetId"]
}
```

**Output:**
```json
{
  "content": [
    {
      "type": "text",
      "text": "## Red Team Status: customer-support-bot\n\n### Last Assessment\n- **Date:** 2025-03-15T10:30:00Z\n- **Duration:** 4 hours\n- **Attack Vectors Tested:** 8/12\n\n### Findings Summary\n| Severity | Count | Status |\n|----------|-------|--------|\n| Critical | 1 | OPEN |\n| High | 2 | Remediated |\n| Medium | 3 | In Progress |\n| Low | 5 | Accepted Risk |\n\n### Open Critical Finding\n**RT-2025-0042: Prompt Injection Bypass**\n- Category: prompt_injection\n- Constraint Violated: humanApprovalRequired.data_export\n- Impact: PII exfiltration possible\n- SLA Deadline: 2025-03-22\n\n### Verification Score\n- Constraints Verified: 7/10 (70%)\n- Controls Tested: 12/15 (80%)\n- Last Full Assessment: 2025-03-15"
    }
  ]
}
```

---

#### Tool: `get_redteam_findings`

Get detailed red team findings.

**Input Schema:**
```json
{
  "type": "object",
  "properties": {
    "assetId": {
      "type": "string",
      "description": "Asset to get findings for"
    },
    "severity": {
      "type": "string",
      "enum": ["critical", "high", "medium", "low", "all"],
      "default": "all"
    },
    "status": {
      "type": "string",
      "enum": ["open", "remediated", "accepted", "in_progress", "all"],
      "default": "all"
    },
    "directory": {
      "type": "string",
      "default": "."
    }
  },
  "required": ["assetId"]
}
```

**Output:**
```json
{
  "content": [
    {
      "type": "text",
      "text": "## Red Team Findings: customer-support-bot\n\n### RT-2025-0042 (CRITICAL - OPEN)\n**Prompt Injection Bypass**\n\n**Classification:**\n- Category: prompt_injection\n- Subcategory: instruction_override\n- Confidence: 95%\n\n**Attack Details:**\n- Vector: User message containing encoded instruction\n- Technique: Base64 encoding bypass\n- Steps:\n  1. Sent encoded payload in user message\n  2. Agent decoded and executed instruction\n  3. Human approval gate bypassed\n  4. Data exported to external endpoint\n\n**Impact:**\n- Constraint Violated: humanApprovalRequired.data_export\n- Data Exposed: Yes\n- Business Impact: PII exfiltration possible\n- EU AI Act Relevance: Article 52 transparency violation\n\n**Evidence:**\n- Trace ID: abc123...\n- Logs: /artifacts/rt-0042/logs.json\n\n**Remediation:**\n- Implement input sanitization before LLM\n- Add output filtering before tool execution\n- Estimated Effort: 2-3 engineering days\n\n**Status:** Open\n**Assigned To:** security-team@company.com\n**SLA Deadline:** 2025-03-22T14:22:33Z"
    }
  ]
}
```

---

#### Tool: `trigger_redteam_scan`

Trigger a red team scan for an asset (requires AIGOS connection).

**Input Schema:**
```json
{
  "type": "object",
  "properties": {
    "assetId": {
      "type": "string",
      "description": "Asset to scan"
    },
    "vectors": {
      "type": "array",
      "items": {
        "type": "string",
        "enum": [
          "prompt_injection",
          "memory_manipulation",
          "tool_hijacking",
          "capability_escalation",
          "context_poisoning",
          "goal_manipulation",
          "multi_agent_exploitation",
          "encoding_bypass"
        ]
      },
      "description": "Specific attack vectors to test (default: all)"
    },
    "environment": {
      "type": "string",
      "enum": ["sandbox", "staging"],
      "default": "sandbox",
      "description": "Environment to run scan in"
    },
    "constraints": {
      "type": "array",
      "items": { "type": "string" },
      "description": "Specific constraints to verify from asset card"
    },
    "directory": {
      "type": "string",
      "default": "."
    }
  },
  "required": ["assetId"]
}
```

---

#### Tool: `verify_constraint`

Verify a specific asset card constraint using red team techniques.

**Input Schema:**
```json
{
  "type": "object",
  "properties": {
    "assetId": {
      "type": "string",
      "description": "Asset containing the constraint"
    },
    "constraint": {
      "type": "string",
      "description": "Constraint to verify (e.g., 'humanApprovalRequired.data_export')"
    },
    "directory": {
      "type": "string",
      "default": "."
    }
  },
  "required": ["assetId", "constraint"]
}
```

---

#### Tool: `update_finding_status`

Update the status of a red team finding.

**Input Schema:**
```json
{
  "type": "object",
  "properties": {
    "findingId": {
      "type": "string",
      "description": "Finding ID (e.g., 'RT-2025-0042')"
    },
    "status": {
      "type": "string",
      "enum": ["open", "in_progress", "remediated", "accepted", "false_positive"]
    },
    "notes": {
      "type": "string",
      "description": "Status update notes"
    },
    "evidence": {
      "type": "string",
      "description": "Path to remediation evidence"
    },
    "directory": {
      "type": "string",
      "default": "."
    }
  },
  "required": ["findingId", "status"]
}
```

---

### Report Generation Tools

#### Tool: `generate_compliance_report`

Generate a comprehensive compliance report.

**Input Schema:**
```json
{
  "type": "object",
  "properties": {
    "directory": {
      "type": "string",
      "default": "."
    },
    "format": {
      "type": "string",
      "enum": ["markdown", "json", "html", "pdf"],
      "default": "markdown"
    },
    "profiles": {
      "type": "array",
      "items": { "type": "string" },
      "description": "Profiles to include (default: all active)"
    },
    "includeRedTeam": {
      "type": "boolean",
      "default": true,
      "description": "Include red team verification status"
    },
    "includeRecommendations": {
      "type": "boolean",
      "default": true
    }
  }
}
```

---

#### Tool: `generate_audit_package`

Generate a complete audit package for a specific framework.

**Input Schema:**
```json
{
  "type": "object",
  "properties": {
    "profile": {
      "type": "string",
      "description": "Profile to generate audit package for"
    },
    "assetId": {
      "type": "string",
      "description": "Specific asset (or 'all')"
    },
    "outputDir": {
      "type": "string",
      "description": "Output directory for audit package"
    },
    "directory": {
      "type": "string",
      "default": "."
    }
  },
  "required": ["profile"]
}
```

---

## Resources

### Core Resources

#### Resource: `aigrc://cards`

List of all asset cards with multi-jurisdiction classifications.

**URI Template:** `aigrc://cards`

---

#### Resource: `aigrc://cards/{id}`

Individual asset card with full compliance data.

**URI Template:** `aigrc://cards/{id}`

---

#### Resource: `aigrc://config`

AIGRC configuration including active profiles.

**URI Template:** `aigrc://config`

---

### Compliance Resources

#### Resource: `aigrc://profiles`

List of available compliance profiles.

**URI Template:** `aigrc://profiles`

---

#### Resource: `aigrc://profiles/{id}`

Individual profile details.

**URI Template:** `aigrc://profiles/{id}`

---

#### Resource: `aigrc://compliance/{assetId}`

Compliance status for an asset across all profiles.

**URI Template:** `aigrc://compliance/{assetId}`

**Returns:**
```json
{
  "contents": [
    {
      "uri": "aigrc://compliance/customer-bot",
      "mimeType": "application/json",
      "text": "{\"profiles\": {\"eu-ai-act\": {\"compliant\": false, \"percentage\": 67}, \"us-omb-m24\": {\"compliant\": false, \"percentage\": 25}}, \"overallCompliance\": false}"
    }
  ]
}
```

---

#### Resource: `aigrc://crosswalk/{assetId}`

Cross-framework mapping for an asset.

**URI Template:** `aigrc://crosswalk/{assetId}`

---

### Red Team Resources

#### Resource: `aigrc://redteam/{assetId}`

Red team status and findings for an asset.

**URI Template:** `aigrc://redteam/{assetId}`

**Subscribable:** Yes (for real-time finding updates)

---

#### Resource: `aigrc://redteam/{assetId}/findings`

All findings for an asset.

**URI Template:** `aigrc://redteam/{assetId}/findings`

---

#### Resource: `aigrc://redteam/{assetId}/findings/{findingId}`

Individual finding details.

**URI Template:** `aigrc://redteam/{assetId}/findings/{findingId}`

---

## Prompts

### Core Prompts

#### Prompt: `compliance_review`

Review an asset for multi-jurisdiction compliance.

**Arguments:**
```json
{
  "assetId": {
    "description": "Asset to review",
    "required": true
  },
  "profiles": {
    "description": "Specific profiles to review against (comma-separated)",
    "required": false
  }
}
```

**Template:**
```
Review the AI asset "{assetId}" for compliance across the following frameworks:
{profiles_or_default}

For each framework, consider:
1. Current risk classification
2. Required controls and their status
3. Missing documentation artifacts
4. Cross-framework equivalences

Asset Card:
{asset_card_content}

Active Profiles:
{active_profiles}

Compliance Status:
{compliance_status}

Provide a comprehensive multi-jurisdiction compliance review with:
- Summary of classification across frameworks
- Prioritized list of gaps (with effort estimates)
- Recommendations that satisfy multiple frameworks simultaneously
- Timeline for achieving compliance
```

---

#### Prompt: `risk_assessment`

Perform multi-jurisdiction risk assessment.

**Arguments:**
```json
{
  "systemDescription": {
    "description": "Description of the AI system",
    "required": true
  },
  "jurisdictions": {
    "description": "Target jurisdictions (e.g., 'US,EU')",
    "required": false
  }
}
```

**Template:**
```
Perform a multi-jurisdiction risk assessment for the following AI system:

{systemDescription}

Target Jurisdictions: {jurisdictions_or_all}

For each applicable framework, determine:
1. Risk classification (EU: minimal/limited/high/unacceptable, US: general/rights/safety-impacting, etc.)
2. Key risk factors driving the classification
3. Required controls and documentation
4. Cross-framework mapping

Consider the following risk factors:
- Domain (employment, healthcare, finance, etc.)
- Autonomy level
- Impact on individuals
- Data sensitivity
- Safety implications

Provide your assessment in a structured format with justification for each classification.
```

---

#### Prompt: `security_review`

Review asset security based on red team findings.

**Arguments:**
```json
{
  "assetId": {
    "description": "Asset to review",
    "required": true
  }
}
```

**Template:**
```
Review the security posture of AI asset "{assetId}" based on red team verification.

Asset Card:
{asset_card_content}

Declared Constraints:
{constraints}

Red Team Findings:
{redteam_findings}

Verification Status:
{verification_status}

Analyze:
1. Which declared constraints have been verified vs. violated
2. Critical security gaps that need immediate attention
3. Pattern analysis of findings (common attack vectors)
4. Alignment between governance artifacts and actual behavior

Provide:
- Executive summary of security posture
- Prioritized remediation roadmap
- Recommendations for constraint updates
- Suggested additional red team scenarios
```

---

#### Prompt: `audit_preparation`

Prepare for multi-framework compliance audit.

**Arguments:**
```json
{
  "profile": {
    "description": "Primary framework being audited",
    "required": true
  },
  "scope": {
    "description": "Audit scope (all, high-risk, specific asset)",
    "required": false
  }
}
```

**Template:**
```
Prepare an audit readiness report for {profile} compliance.

Scope: {scope}

Current Assets:
{assets_summary}

Compliance Status:
{compliance_status_for_profile}

Red Team Verification:
{redteam_summary}

For each asset in scope, provide:
1. Current compliance percentage
2. Documentation completeness
3. Control implementation status
4. Red team verification status
5. Risk areas for auditor attention

Generate:
- Executive summary for audit committee
- Detailed findings with evidence references
- Gap remediation plan with priorities
- Suggested audit timeline
```

---

#### Prompt: `generate_documentation`

Generate compliance documentation.

**Arguments:**
```json
{
  "assetId": {
    "description": "Asset to document",
    "required": true
  },
  "documentType": {
    "description": "Type of document to generate",
    "required": true
  },
  "profile": {
    "description": "Framework template to use",
    "required": false
  }
}
```

---

## Configuration

### Claude Desktop Configuration

Add to `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "aigrc": {
      "command": "npx",
      "args": ["@aigrc/mcp"],
      "env": {
        "AIGRC_WORKSPACE": "/path/to/workspace",
        "AIGRC_LOG_LEVEL": "info",
        "AIGRC_PROFILES": "eu-ai-act,us-omb-m24,nist-ai-rmf",
        "AIGRC_REDTEAM_ENABLED": "true",
        "AIGOS_API_URL": "https://api.aigos.dev"
      }
    }
  }
}
```

### VS Code Configuration

For Cline or similar extensions:

```json
{
  "mcp.servers": {
    "aigrc": {
      "command": "npx",
      "args": ["@aigrc/mcp"],
      "workspaceFolder": "${workspaceFolder}",
      "env": {
        "AIGRC_PROFILES": "eu-ai-act,us-omb-m24"
      }
    }
  }
}
```

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `AIGRC_WORKSPACE` | `.` | Default workspace directory |
| `AIGRC_CARDS_DIR` | `.aigrc/cards` | Asset cards directory |
| `AIGRC_LOG_LEVEL` | `info` | Log level (debug, info, warn, error) |
| `AIGRC_CACHE_TTL` | `300` | Cache TTL in seconds |
| `AIGRC_PROFILES` | `eu-ai-act` | Comma-separated default profiles |
| `AIGRC_REDTEAM_ENABLED` | `false` | Enable red team integration |
| `AIGOS_API_URL` | - | AIGOS platform API URL (for red team) |
| `AIGOS_API_KEY` | - | AIGOS API key |

---

## Security Considerations

### File System Access

The MCP server requires file system access for:
- Reading source files for scanning
- Reading/writing asset cards
- Reading configuration and profile files
- Reading red team findings

**Mitigations:**
- Restrict to workspace directory
- Validate all paths (no path traversal)
- Read-only mode option for sensitive environments

### Red Team Integration

Red team features require additional security:
- AIGOS API authentication
- Sandbox-only execution by default
- Explicit production opt-in
- Kill switch for red team agents

**Mitigations:**
- API key required for red team features
- All red team operations logged
- Rate limiting on scan triggers
- Findings encrypted at rest

### Sensitive Data

Asset cards and findings may contain:
- Owner names and emails
- System descriptions and vulnerabilities
- Compliance gaps and risks

**Mitigations:**
- No transmission outside authorized endpoints
- Logging excludes PII and vulnerability details
- Cards and findings stored with appropriate permissions
- Encryption for red team evidence

---

## Implementation Plan

### Phase 1: Core + Multi-Jurisdiction Foundation (v2.0.0)

**Timeline:** 4 weeks

**Deliverables:**
- [ ] Refactored MCP server with profile support
- [ ] Profile loader and compiler integration
- [ ] `list_compliance_profiles` tool
- [ ] `add_compliance_profile` tool
- [ ] `get_active_profiles` tool
- [ ] `classify_risk` with multi-jurisdiction output
- [ ] Basic crosswalk mapping
- [ ] Resources for profiles and compliance

### Phase 2: Compliance Tools (v2.1.0)

**Timeline:** 3 weeks

**Deliverables:**
- [ ] `check_compliance` tool
- [ ] `gap_analysis` tool
- [ ] `generate_artifact` tool
- [ ] `get_crosswalk` tool
- [ ] Compliance prompts
- [ ] Audit package generation

### Phase 3: Red Team Integration (v2.2.0)

**Timeline:** 3 weeks

**Deliverables:**
- [ ] `get_redteam_status` tool
- [ ] `get_redteam_findings` tool
- [ ] `trigger_redteam_scan` tool (AIGOS integration)
- [ ] `verify_constraint` tool
- [ ] `update_finding_status` tool
- [ ] Red team resources with subscription
- [ ] Security review prompt

### Phase 4: Enterprise Features (v2.3.0)

**Timeline:** 2 weeks

**Deliverables:**
- [ ] SSE transport support
- [ ] Real-time finding notifications
- [ ] Batch operations
- [ ] Custom profile support
- [ ] Advanced reporting

---

## Package Structure

```
packages/mcp/
├── package.json
├── tsconfig.json
├── tsup.config.ts
├── src/
│   ├── index.ts                    # Entry point
│   ├── server.ts                   # MCP server setup
│   ├── protocol/
│   │   ├── handler.ts              # JSON-RPC handler
│   │   ├── transport.ts            # stdio/SSE transport
│   │   └── subscriptions.ts        # Resource subscriptions
│   ├── tools/
│   │   ├── index.ts                # Tool registry
│   │   ├── core/
│   │   │   ├── scan.ts             # scan_directory
│   │   │   ├── cards.ts            # card management
│   │   │   └── classify.ts         # classification
│   │   ├── compliance/
│   │   │   ├── profiles.ts         # profile management
│   │   │   ├── check.ts            # compliance checking
│   │   │   ├── crosswalk.ts        # cross-framework mapping
│   │   │   ├── gap-analysis.ts     # gap analysis
│   │   │   └── artifacts.ts        # artifact generation
│   │   ├── redteam/
│   │   │   ├── status.ts           # red team status
│   │   │   ├── findings.ts         # findings management
│   │   │   ├── trigger.ts          # scan triggers
│   │   │   └── verify.ts           # constraint verification
│   │   └── reports/
│   │       ├── compliance.ts       # compliance reports
│   │       └── audit.ts            # audit packages
│   ├── resources/
│   │   ├── index.ts                # Resource registry
│   │   ├── cards.ts                # Card resources
│   │   ├── profiles.ts             # Profile resources
│   │   ├── compliance.ts           # Compliance resources
│   │   └── redteam.ts              # Red team resources
│   ├── prompts/
│   │   ├── index.ts                # Prompt registry
│   │   ├── compliance.ts           # Compliance prompts
│   │   ├── security.ts             # Security prompts
│   │   └── audit.ts                # Audit prompts
│   └── services/
│       ├── scanner.ts              # Scanner service
│       ├── cards.ts                # Cards service
│       ├── profiles.ts             # Profile service
│       ├── compliance.ts           # Compliance service
│       ├── crosswalk.ts            # Crosswalk service
│       ├── redteam.ts              # Red team service
│       └── reports.ts              # Reports service
└── bin/
    └── aigrc-mcp.ts                # CLI entry
```

---

## API Examples

### Multi-Jurisdiction Classification

**Request:**
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/call",
  "params": {
    "name": "classify_risk",
    "arguments": {
      "autonomousDecisions": true,
      "customerFacing": true,
      "toolExecution": true,
      "piiProcessing": "yes",
      "highStakesDecisions": false,
      "affectsSafety": false,
      "affectsRights": true,
      "domain": "employment",
      "profiles": ["eu-ai-act", "us-omb-m24", "nist-ai-rmf"]
    }
  }
}
```

**Response:**
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "content": [
      {
        "type": "text",
        "text": "## Multi-Jurisdiction Risk Classification\n\n| Profile | Classification | Score | Reasons |\n|---------|---------------|-------|----------|\n| eu-ai-act | HIGH | 8/11 | Employment domain, PII processing, autonomous decisions |\n| us-omb-m24 | RIGHTS-IMPACTING | N/A | Affects individual rights, employment decisions |\n| nist-ai-rmf | HIGH | N/A | Elevated risk profile, customer-facing |\n\n### Required Artifacts (Union)\n- AI Impact Assessment (us-omb-m24, eu-ai-act)\n- Risk Management System (eu-ai-act)\n- Technical Documentation (eu-ai-act)\n- Human Oversight Procedures (all)\n- Equity Assessment (us-omb-m24)\n- Testing Report (all)"
      }
    ],
    "isError": false
  }
}
```

### Checking Red Team Status

**Request:**
```json
{
  "jsonrpc": "2.0",
  "id": 2,
  "method": "tools/call",
  "params": {
    "name": "get_redteam_status",
    "arguments": {
      "assetId": "customer-support-bot"
    }
  }
}
```

---

## References

- [MCP Specification](https://spec.modelcontextprotocol.io/)
- [MCP TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk)
- [AIGRC Core Documentation](../guides/detection-engine.md)
- [EU AI Act Mapping](../concepts/eu-ai-act-mapping.md)
- [Risk Classification Deep Dive](../concepts/risk-classification.md)
- [Multi-Jurisdiction Compliance Framework](../AIGRC_Multi_Jurisdiction_Framework.md)
- [AIGOS Agentic Red Teaming Strategy](../AIGOS_Agentic_Red_Teaming_Strategy.md)
- [Cloud Security Alliance Agentic AI Red Teaming Guide](https://cloudsecurityalliance.org/)
