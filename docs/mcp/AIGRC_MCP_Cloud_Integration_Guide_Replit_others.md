# AIGRC MCP Integration Guide
## Cloud Platforms: Lovable, Replit, Bolt & HTTP Transport

**Document Version:** 2.0  
**Last Updated:** December 28, 2025  
**Classification:** Internal - Technical Documentation  
**Maintainer:** AI Governance, Safety & Reliability Team

---

## Document Control

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2025-10-01 | AIGRC Team | Initial release |
| 2.0 | 2025-12-28 | AIGRC Team | Enterprise-grade revision with expanded cloud deployment options, security hardening, and comprehensive troubleshooting |

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Introduction & Background](#2-introduction--background)
3. [Architecture Overview](#3-architecture-overview)
4. [System Requirements & Prerequisites](#4-system-requirements--prerequisites)
5. [Part 1: Local Development Setup](#5-part-1-local-development-setup)
6. [Part 2: Tunneling Solutions](#6-part-2-tunneling-solutions)
7. [Part 3: Lovable Integration](#7-part-3-lovable-integration)
8. [Part 4: Replit Integration](#8-part-4-replit-integration)
9. [Part 5: Bolt.new Integration](#9-part-5-boltnew-integration)
10. [Part 6: Generic Cloud Deployment](#10-part-6-generic-cloud-deployment)
11. [Part 7: Container Orchestration](#11-part-7-container-orchestration)
12. [Part 8: Authentication & Authorization](#12-part-8-authentication--authorization)
13. [Part 9: Session Management](#13-part-9-session-management)
14. [Configuration Reference](#14-configuration-reference)
15. [API Reference](#15-api-reference)
16. [Security Hardening](#16-security-hardening)
17. [Monitoring & Observability](#17-monitoring--observability)
18. [Verification & Testing](#18-verification--testing)
19. [Troubleshooting Guide](#19-troubleshooting-guide)
20. [Performance Optimization](#20-performance-optimization)
21. [Example Workflows](#21-example-workflows)
22. [Support & Escalation](#22-support--escalation)
23. [Appendices](#23-appendices)

---

## 1. Executive Summary

### 1.1 Purpose

This document provides comprehensive instructions for integrating the AIGRC (AI Governance, Risk & Compliance) MCP Server with cloud-based AI coding platforms including Lovable, Replit, Bolt.new, and similar services. Unlike desktop applications that use stdio transport, cloud platforms require **HTTP transport** for communication with MCP servers.

### 1.2 Audience

This guide is intended for:

- **Platform Engineers** deploying AIGRC to cloud infrastructure
- **DevOps/SRE Teams** managing production MCP server deployments
- **AI/ML Engineers** using cloud-based development environments
- **Security Teams** hardening MCP server deployments
- **Developers** integrating governance into Lovable, Replit, or Bolt workflows

### 1.3 Key Outcomes

Upon successful completion of this guide, you will have:

1. A fully functional AIGRC MCP HTTP server deployed to your cloud platform of choice
2. Secure tunnel or public endpoint for cloud platform access
3. Authentication configured (OAuth 2.0 or API key)
4. Session management for stateful interactions
5. Monitoring and observability infrastructure
6. Integration with Lovable, Replit, Bolt.new, or similar platforms

### 1.4 HTTP vs. Stdio Transport Comparison

| Aspect | Stdio Transport | HTTP Transport |
|--------|-----------------|----------------|
| **Use Case** | Local desktop apps | Cloud platforms, web apps |
| **Communication** | Standard input/output | HTTP/HTTPS requests |
| **Network Required** | No | Yes |
| **Session Management** | Per-process | Explicit session IDs |
| **Authentication** | OS-level | OAuth/API keys |
| **Scaling** | Single instance | Horizontal scaling possible |
| **Examples** | Claude Desktop, Cursor | Lovable, Replit, Bolt |

### 1.5 Time Estimates

| Task | Estimated Time |
|------|----------------|
| Prerequisites verification | 15-30 minutes |
| Local HTTP server setup | 15-20 minutes |
| Tunnel configuration (ngrok/Cloudflare) | 10-15 minutes |
| Cloud deployment (Docker) | 30-45 minutes |
| Cloud deployment (Kubernetes) | 45-60 minutes |
| Authentication setup | 20-30 minutes |
| Platform integration (Lovable/Replit/Bolt) | 15-30 minutes |
| Testing & verification | 20-30 minutes |
| **Total (local + tunnel)** | **60-90 minutes** |
| **Total (full cloud deployment)** | **2-3 hours** |

---

## 2. Introduction & Background

### 2.1 Why HTTP Transport?

Cloud-based AI coding platforms like Lovable, Replit, and Bolt.new operate in browser environments and cannot directly spawn local processes. They require MCP servers to be accessible via HTTP/HTTPS endpoints.

**Key Differences from Desktop Integration:**

```
Desktop Integration (stdio):
┌─────────────────┐     stdio     ┌─────────────────┐
│  Claude Desktop │ ←──────────→  │   AIGRC MCP     │
│  (Local Process)│               │   (Child Proc)  │
└─────────────────┘               └─────────────────┘

Cloud Integration (HTTP):
┌─────────────────┐    HTTPS     ┌─────────────────┐
│     Lovable     │ ←──────────→  │   AIGRC MCP     │
│  (Browser/Cloud)│              │   HTTP Server   │
└─────────────────┘               └─────────────────┘
        │                               │
        │         Internet              │
        └───────────────────────────────┘
```

### 2.2 AIGRC HTTP Server Capabilities

The AIGRC MCP HTTP server implements the **Streamable HTTP Transport** specification, providing:

| Capability | Description |
|------------|-------------|
| **Streamable HTTP** | Full MCP protocol over HTTP with SSE streaming |
| **Session Management** | Stateful sessions with configurable TTL |
| **CORS Support** | Cross-Origin Resource Sharing for browser clients |
| **Authentication** | OAuth 2.0, API keys, or custom auth handlers |
| **Rate Limiting** | Configurable request and tool call limits |
| **Health Checks** | Kubernetes/Docker compatible health endpoints |
| **Telemetry** | OpenTelemetry-compatible metrics and tracing |
| **Multi-Tenancy** | Tenant isolation via headers |

### 2.3 Supported Cloud Platforms

| Platform | Integration Status | Notes |
|----------|-------------------|-------|
| **Lovable** | ✅ Supported | Via custom MCP server URL |
| **Replit** | ✅ Supported | Deploy as Repl or connect external |
| **Bolt.new** | ✅ Supported | Via custom MCP configuration |
| **StackBlitz** | ⚠️ Experimental | Limited MCP support |
| **CodeSandbox** | ⚠️ Experimental | Requires custom setup |
| **GitHub Codespaces** | ✅ Supported | Port forwarding available |
| **Gitpod** | ✅ Supported | Port forwarding available |

### 2.4 Security Considerations Overview

Exposing an MCP server over HTTP introduces security considerations not present in stdio transport:

| Risk | Mitigation |
|------|------------|
| Unauthorized access | Authentication (OAuth/API key) |
| Man-in-the-middle | TLS/HTTPS encryption |
| Session hijacking | Secure session tokens, short TTL |
| DoS attacks | Rate limiting |
| Data exposure | Audit logging, data minimization |
| CORS exploitation | Strict origin policies |

These are addressed in detail in [Section 16: Security Hardening](#16-security-hardening).

---

## 3. Architecture Overview

### 3.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              CLOUD PLATFORM                                     │
│  ┌───────────────────────────────────────────────────────────────────────────┐ │
│  │                    LOVABLE / REPLIT / BOLT.NEW                            │ │
│  │  ┌─────────────────────────────────────────────────────────────────────┐ │ │
│  │  │                     AI ASSISTANT (Browser)                          │ │ │
│  │  │  ┌─────────────────────────────────────────────────────────────┐   │ │ │
│  │  │  │                    MCP Client Library                        │   │ │ │
│  │  │  │              (Streamable HTTP Transport)                     │   │ │ │
│  │  │  └──────────────────────────┬──────────────────────────────────┘   │ │ │
│  │  └─────────────────────────────┼───────────────────────────────────────┘ │ │
│  └────────────────────────────────┼─────────────────────────────────────────┘ │
└───────────────────────────────────┼───────────────────────────────────────────┘
                                    │
                                    │ HTTPS (TLS 1.3)
                                    │
┌───────────────────────────────────┼───────────────────────────────────────────┐
│                           INTERNET / CDN                                       │
│  ┌────────────────────────────────┼────────────────────────────────────────┐  │
│  │            EDGE / REVERSE PROXY (Cloudflare, nginx, etc.)               │  │
│  │  • TLS termination           • Rate limiting                            │  │
│  │  • DDoS protection           • Geographic routing                       │  │
│  │  • WAF rules                 • Caching (static only)                    │  │
│  └────────────────────────────────┼────────────────────────────────────────┘  │
└───────────────────────────────────┼───────────────────────────────────────────┘
                                    │
                                    │ HTTP/HTTPS (internal)
                                    │
┌───────────────────────────────────┼───────────────────────────────────────────┐
│                        YOUR INFRASTRUCTURE                                     │
│  ┌────────────────────────────────┼────────────────────────────────────────┐  │
│  │                    LOAD BALANCER (Optional)                              │  │
│  │              • Health check routing  • Sticky sessions                  │  │
│  └────────────────────────────────┼────────────────────────────────────────┘  │
│                                   │                                            │
│           ┌───────────────────────┼───────────────────────────────┐           │
│           │                       │                               │           │
│           ▼                       ▼                               ▼           │
│  ┌─────────────────┐    ┌─────────────────┐            ┌─────────────────┐   │
│  │  AIGRC MCP      │    │  AIGRC MCP      │    ...     │  AIGRC MCP      │   │
│  │  HTTP Server    │    │  HTTP Server    │            │  HTTP Server    │   │
│  │  (Instance 1)   │    │  (Instance 2)   │            │  (Instance N)   │   │
│  └────────┬────────┘    └────────┬────────┘            └────────┬────────┘   │
│           │                       │                               │           │
│           └───────────────────────┼───────────────────────────────┘           │
│                                   │                                            │
│                                   ▼                                            │
│  ┌───────────────────────────────────────────────────────────────────────┐   │
│  │                         SHARED SERVICES                                │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  │   │
│  │  │   Redis     │  │  PostgreSQL │  │    Vault    │  │  Telemetry  │  │   │
│  │  │  (Sessions) │  │ (Asset Cards)│  │  (Secrets)  │  │ (Metrics)   │  │   │
│  │  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘  │   │
│  └───────────────────────────────────────────────────────────────────────┘   │
└───────────────────────────────────────────────────────────────────────────────┘
```

### 3.2 Component Descriptions

#### 3.2.1 AIGRC MCP HTTP Server

The HTTP server is a Node.js application that:

- **Listens** on a configurable port (default: 3000)
- **Implements** the MCP Streamable HTTP Transport specification
- **Manages** client sessions with unique identifiers
- **Validates** authentication tokens (OAuth/API key)
- **Enforces** rate limits per client/session
- **Exposes** health and metrics endpoints

#### 3.2.2 Session Store (Redis)

For production deployments with multiple server instances:

- **Stores** session state (conversation context, tool results)
- **Enables** horizontal scaling with shared session state
- **Supports** session expiration via TTL
- **Provides** pub/sub for real-time session updates

#### 3.2.3 Asset Card Storage

Options for asset card storage:

| Option | Use Case | Scaling |
|--------|----------|---------|
| Local filesystem | Development, single instance | Single instance only |
| Shared volume (NFS/EFS) | Small deployments | Limited |
| PostgreSQL | Production, multi-instance | Excellent |
| S3 + cache | Large scale, high availability | Excellent |

#### 3.2.4 Reverse Proxy / Edge

Recommended for production:

- **TLS Termination**: Handle SSL certificates
- **Rate Limiting**: First line of defense
- **DDoS Protection**: Block malicious traffic
- **Caching**: Cache health checks, reduce load
- **Geographic Routing**: Route to nearest server

### 3.3 Request Flow Sequence

```
┌──────────┐          ┌──────────┐          ┌──────────┐          ┌──────────┐
│  Lovable │          │   Edge   │          │  AIGRC   │          │  Redis   │
│  Client  │          │  Proxy   │          │  Server  │          │ Sessions │
└────┬─────┘          └────┬─────┘          └────┬─────┘          └────┬─────┘
     │                      │                     │                     │
     │  1. POST /mcp        │                     │                     │
     │    (initialize)      │                     │                     │
     │─────────────────────>│                     │                     │
     │                      │                     │                     │
     │                      │  2. Forward request │                     │
     │                      │─────────────────────>                     │
     │                      │                     │                     │
     │                      │                     │  3. Create session  │
     │                      │                     │─────────────────────>
     │                      │                     │                     │
     │                      │                     │  4. Session ID      │
     │                      │                     │<─────────────────────
     │                      │                     │                     │
     │                      │  5. Response +      │                     │
     │                      │     Mcp-Session-Id  │                     │
     │                      │<─────────────────────                     │
     │                      │                     │                     │
     │  6. Response +       │                     │                     │
     │     Mcp-Session-Id   │                     │                     │
     │<─────────────────────│                     │                     │
     │                      │                     │                     │
     │  7. POST /mcp        │                     │                     │
     │    (tools/call)      │                     │                     │
     │    + Session-Id      │                     │                     │
     │─────────────────────>│                     │                     │
     │                      │                     │                     │
     │                      │  8. Forward +       │                     │
     │                      │     Session-Id      │                     │
     │                      │─────────────────────>                     │
     │                      │                     │                     │
     │                      │                     │  9. Load session    │
     │                      │                     │─────────────────────>
     │                      │                     │                     │
     │                      │                     │  10. Session data   │
     │                      │                     │<─────────────────────
     │                      │                     │                     │
     │                      │                     │  11. Execute tool   │
     │                      │                     │  (with context)     │
     │                      │                     │                     │
     │                      │  12. Tool result    │                     │
     │                      │<─────────────────────                     │
     │                      │                     │                     │
     │  13. Tool result     │                     │                     │
     │<─────────────────────│                     │                     │
     │                      │                     │                     │
```

### 3.4 Deployment Options Summary

| Option | Complexity | Cost | Scaling | Best For |
|--------|------------|------|---------|----------|
| Local + ngrok | Low | Free tier available | Single user | Development |
| Local + Cloudflare Tunnel | Low | Free | Single user | Development |
| Replit deployment | Low | Free tier available | Limited | Prototyping |
| Docker single instance | Medium | $5-20/mo | Single instance | Small teams |
| Docker Compose | Medium | $20-50/mo | Manual scaling | Small production |
| Kubernetes | High | $50-200+/mo | Auto-scaling | Enterprise |
| Serverless (Lambda/CloudRun) | Medium | Pay-per-use | Auto-scaling | Variable load |

---

## 4. System Requirements & Prerequisites

### 4.1 Software Requirements

#### 4.1.1 Node.js

**Required Version:** Node.js 18.0.0 or later (LTS recommended)

**Verification:**
```bash
node --version
# Expected: v18.x.x or v20.x.x or higher

npm --version
# Expected: 9.x.x or higher
```

**Installation:**

**macOS (Homebrew):**
```bash
brew install node
```

**Ubuntu/Debian:**
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
```

**Windows:**
Download from https://nodejs.org/ and run installer.

#### 4.1.2 pnpm (Optional but Recommended)

```bash
npm install -g pnpm
pnpm --version
# Expected: 8.x.x or higher
```

#### 4.1.3 Docker (for Container Deployments)

**Verification:**
```bash
docker --version
# Expected: Docker version 24.x.x or higher

docker compose version
# Expected: Docker Compose version v2.x.x or higher
```

**Installation:**
- **macOS/Windows:** Docker Desktop from https://docker.com/
- **Linux:** Follow official Docker installation guide

#### 4.1.4 curl (for Testing)

```bash
curl --version
# Should be pre-installed on most systems
```

#### 4.1.5 jq (Optional, for JSON Processing)

```bash
# macOS
brew install jq

# Ubuntu/Debian
sudo apt-get install jq

# Verify
jq --version
```

### 4.2 AIGRC MCP Package

**Verification:**
```bash
# Navigate to AIGRC installation
cd /path/to/aigrc

# Check HTTP binary exists
ls -la packages/mcp/dist/bin/aigrc-mcp-http.js
# Should show file with read/execute permissions

# Verify it runs
node packages/mcp/dist/bin/aigrc-mcp-http.js --help
```

**Building (if not built):**
```bash
cd /path/to/aigrc
pnpm install
pnpm run build

# Verify HTTP server binary
ls packages/mcp/dist/bin/aigrc-mcp-http.js
```

### 4.3 Network Requirements

| Requirement | Development | Production |
|-------------|-------------|------------|
| Outbound HTTPS (443) | Required for tunnels | Required for OAuth |
| Inbound port (3000 default) | Local only | Via load balancer |
| DNS resolution | Required | Required |
| Static IP | Not required | Recommended |
| SSL certificate | Handled by tunnel | Required |

### 4.4 Pre-Flight Checklist

```bash
#!/bin/bash
# pre-flight-http.sh - Verify prerequisites for HTTP deployment

echo "=== AIGRC MCP HTTP Pre-Flight Check ==="
echo ""

# Node.js
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

# npm
echo -n "npm: "
if command -v npm &> /dev/null; then
    echo "✓ $(npm --version)"
else
    echo "✗ Not installed"
fi

# Docker (optional)
echo -n "Docker: "
if command -v docker &> /dev/null; then
    echo "✓ $(docker --version | cut -d' ' -f3 | tr -d ',')"
else
    echo "○ Not installed (optional)"
fi

# curl
echo -n "curl: "
if command -v curl &> /dev/null; then
    echo "✓ Available"
else
    echo "✗ Not installed"
fi

# AIGRC HTTP binary
echo -n "AIGRC HTTP binary: "
AIGRC_HTTP="${AIGRC_PATH:-./packages/mcp/dist/bin/aigrc-mcp-http.js}"
if [ -f "$AIGRC_HTTP" ]; then
    echo "✓ Found"
else
    echo "✗ Not found at $AIGRC_HTTP"
fi

echo ""
echo "=== Pre-Flight Check Complete ==="
```

---

## 5. Part 1: Local Development Setup

### 5.1 Overview

Before deploying to cloud platforms, set up and test the HTTP server locally. This ensures your configuration is correct before adding network complexity.

### 5.2 Step 1: Configure Environment Variables

Create an environment file for local development:

```bash
# Create .env file in AIGRC directory
cat > .env << 'EOF'
# Server Configuration
AIGRC_HTTP_PORT=3000
AIGRC_HTTP_HOST=0.0.0.0

# Workspace Configuration
AIGRC_WORKSPACE=.
AIGRC_CARDS_DIR=.aigrc/cards
AIGRC_PROFILES=eu-ai-act

# Logging
AIGRC_LOG_LEVEL=debug

# Session Configuration
AIGRC_HTTP_STATEFUL=true
AIGRC_HTTP_SESSION_TTL=1800

# Rate Limiting (relaxed for development)
AIGRC_HTTP_REQUESTS_PER_MINUTE=600
AIGRC_HTTP_TOOL_CALLS_PER_HOUR=5000

# Authentication (disabled for local dev)
AIGRC_HTTP_AUTH_ENABLED=false

# CORS (permissive for local dev)
AIGRC_HTTP_CORS_ORIGIN=*
EOF
```

### 5.3 Step 2: Start the HTTP Server

**Option A: Direct Node.js execution**
```bash
cd /path/to/aigrc

# Load environment and start server
source .env
node packages/mcp/dist/bin/aigrc-mcp-http.js
```

**Option B: Using environment variables inline**
```bash
AIGRC_HTTP_PORT=3000 \
AIGRC_WORKSPACE=/path/to/project \
AIGRC_PROFILES=eu-ai-act \
AIGRC_LOG_LEVEL=debug \
node packages/mcp/dist/bin/aigrc-mcp-http.js
```

**Option C: Using npm script (if configured)**
```bash
cd /path/to/aigrc
npm run start:http
```

### 5.4 Expected Startup Output

```
┌────────────────────────────────────────────────────────────────────┐
│                    AIGRC MCP HTTP Server                          │
├────────────────────────────────────────────────────────────────────┤
│  Version:     3.0.0                                               │
│  Protocol:    MCP 2024-11-05                                      │
│  Transport:   Streamable HTTP                                     │
├────────────────────────────────────────────────────────────────────┤
│  Listening:   http://0.0.0.0:3000                                 │
│  MCP Endpoint: http://0.0.0.0:3000/mcp                            │
│  Health:      http://0.0.0.0:3000/health                          │
├────────────────────────────────────────────────────────────────────┤
│  Workspace:   /path/to/project                                    │
│  Profiles:    eu-ai-act                                           │
│  Auth:        disabled                                            │
│  Sessions:    stateful (TTL: 1800s)                               │
│  Rate Limit:  600 req/min, 5000 tools/hr                          │
└────────────────────────────────────────────────────────────────────┘
[2025-12-28T10:00:00.000Z] INFO: Server started successfully
```

### 5.5 Step 3: Verify Server Health

**Health Check:**
```bash
curl http://localhost:3000/health
```

**Expected Response:**
```json
{
  "status": "healthy",
  "version": "3.0.0",
  "transport": "streamable-http",
  "protocol": "2024-11-05",
  "uptime": 42,
  "sessions": {
    "active": 0,
    "total": 0
  },
  "memory": {
    "used": 45678912,
    "total": 134217728
  }
}
```

**Server Info:**
```bash
curl http://localhost:3000/
```

**Expected Response:**
```json
{
  "name": "aigrc-mcp",
  "version": "3.0.0",
  "protocol": "2024-11-05",
  "transport": "streamable-http",
  "capabilities": {
    "tools": true,
    "resources": true,
    "prompts": true,
    "logging": true
  },
  "endpoints": {
    "mcp": "/mcp",
    "health": "/health",
    "sessions": "/sessions",
    "metrics": "/metrics"
  }
}
```

### 5.6 Step 4: Test MCP Protocol

**Initialize Session:**
```bash
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "initialize",
    "params": {
      "protocolVersion": "2024-11-05",
      "capabilities": {
        "roots": { "listChanged": true },
        "sampling": {}
      },
      "clientInfo": {
        "name": "test-client",
        "version": "1.0.0"
      }
    }
  }'
```

**Expected Response:**
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "protocolVersion": "2024-11-05",
    "serverInfo": {
      "name": "aigrc",
      "version": "3.0.0"
    },
    "capabilities": {
      "tools": { "listChanged": true },
      "resources": { "listChanged": true, "subscribe": true },
      "prompts": { "listChanged": true },
      "logging": {}
    }
  }
}
```

**Note:** Save the `Mcp-Session-Id` header from the response for subsequent requests.

**List Tools (with session):**
```bash
SESSION_ID="<session-id-from-init>"

curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -H "Mcp-Session-Id: $SESSION_ID" \
  -d '{
    "jsonrpc": "2.0",
    "id": 2,
    "method": "tools/list",
    "params": {}
  }'
```

### 5.7 Step 5: Test Tool Execution

```bash
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -H "Mcp-Session-Id: $SESSION_ID" \
  -d '{
    "jsonrpc": "2.0",
    "id": 3,
    "method": "tools/call",
    "params": {
      "name": "get_blockers",
      "arguments": {}
    }
  }'
```

**Expected Response:**
```json
{
  "jsonrpc": "2.0",
  "id": 3,
  "result": {
    "content": [
      {
        "type": "text",
        "text": "Found 0 governance blockers in workspace."
      }
    ],
    "isError": false
  }
}
```

### 5.8 Development Server Script

For convenience, create a development startup script:

```bash
#!/bin/bash
# start-dev.sh - Start AIGRC HTTP server for development

set -e

# Configuration
export AIGRC_HTTP_PORT=${AIGRC_HTTP_PORT:-3000}
export AIGRC_HTTP_HOST=${AIGRC_HTTP_HOST:-0.0.0.0}
export AIGRC_WORKSPACE=${AIGRC_WORKSPACE:-.}
export AIGRC_PROFILES=${AIGRC_PROFILES:-eu-ai-act}
export AIGRC_LOG_LEVEL=${AIGRC_LOG_LEVEL:-debug}
export AIGRC_HTTP_AUTH_ENABLED=${AIGRC_HTTP_AUTH_ENABLED:-false}
export AIGRC_HTTP_CORS_ORIGIN=${AIGRC_HTTP_CORS_ORIGIN:-*}

# Navigate to AIGRC directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "Starting AIGRC MCP HTTP Server..."
echo "  Port: $AIGRC_HTTP_PORT"
echo "  Workspace: $AIGRC_WORKSPACE"
echo "  Profiles: $AIGRC_PROFILES"
echo ""

# Start server with auto-restart on crash
while true; do
    node packages/mcp/dist/bin/aigrc-mcp-http.js
    
    echo ""
    echo "Server exited. Restarting in 5 seconds..."
    echo "Press Ctrl+C to stop."
    sleep 5
done
```

**Make executable and run:**
```bash
chmod +x start-dev.sh
./start-dev.sh
```

---

## 6. Part 2: Tunneling Solutions

### 6.1 Overview

Tunneling creates a secure, publicly accessible URL for your local server. This is the fastest way to test cloud platform integrations without deploying to production infrastructure.

### 6.2 Option A: ngrok

#### 6.2.1 Installation

**macOS:**
```bash
brew install ngrok/ngrok/ngrok
```

**Linux:**
```bash
curl -s https://ngrok-agent.s3.amazonaws.com/ngrok.asc | \
  sudo tee /etc/apt/trusted.gpg.d/ngrok.asc >/dev/null && \
  echo "deb https://ngrok-agent.s3.amazonaws.com buster main" | \
  sudo tee /etc/apt/sources.list.d/ngrok.list && \
  sudo apt update && sudo apt install ngrok
```

**Windows:**
```powershell
choco install ngrok
# Or download from https://ngrok.com/download
```

#### 6.2.2 Authentication

```bash
# Sign up at https://ngrok.com and get your auth token
ngrok config add-authtoken YOUR_AUTH_TOKEN
```

#### 6.2.3 Start Tunnel

**Terminal 1 - Start AIGRC Server:**
```bash
cd /path/to/aigrc
node packages/mcp/dist/bin/aigrc-mcp-http.js --port 3000
```

**Terminal 2 - Start ngrok:**
```bash
ngrok http 3000
```

**ngrok Output:**
```
ngrok                                                           (Ctrl+C to quit)

Session Status                online
Account                       Your Name (Plan: Free)
Version                       3.5.0
Region                        United States (us)
Latency                       42ms
Web Interface                 http://127.0.0.1:4040
Forwarding                    https://a1b2c3d4e5f6.ngrok-free.app -> http://localhost:3000

Connections                   ttl     opn     rt1     rt5     p50     p90
                              0       0       0.00    0.00    0.00    0.00
```

#### 6.2.4 Verify Tunnel

```bash
# Replace with your ngrok URL
curl https://a1b2c3d4e5f6.ngrok-free.app/health
```

#### 6.2.5 ngrok Configuration File

For persistent configuration, create `~/.ngrok2/ngrok.yml`:

```yaml
version: "2"
authtoken: YOUR_AUTH_TOKEN
tunnels:
  aigrc:
    proto: http
    addr: 3000
    inspect: true
    bind_tls: true
    host_header: rewrite
```

**Start with config:**
```bash
ngrok start aigrc
```

#### 6.2.6 ngrok Limitations (Free Tier)

| Limitation | Free Tier | Paid Plans |
|------------|-----------|------------|
| Random URL | Yes (changes on restart) | Custom domains available |
| Connections | 40/minute | Higher limits |
| Bandwidth | 1 GB/month | Higher limits |
| Interstitial page | Yes (first request) | Can be disabled |

### 6.3 Option B: Cloudflare Tunnel

Cloudflare Tunnel provides a free, production-grade tunneling solution.

#### 6.3.1 Installation

```bash
# macOS
brew install cloudflared

# Linux (Debian/Ubuntu)
curl -L --output cloudflared.deb https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb
sudo dpkg -i cloudflared.deb

# Windows
# Download from https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/install-and-setup/installation/
```

#### 6.3.2 Quick Tunnel (No Account Required)

```bash
# Start AIGRC server first
node packages/mcp/dist/bin/aigrc-mcp-http.js --port 3000

# In another terminal
cloudflared tunnel --url http://localhost:3000
```

**Output:**
```
2025-12-28T10:00:00Z INF Thank you for trying Cloudflare Tunnel
2025-12-28T10:00:00Z INF Your quick Tunnel has been created! Visit it at (it may take some time to be reachable):
2025-12-28T10:00:00Z INF https://random-words-here.trycloudflare.com
```

#### 6.3.3 Named Tunnel (With Cloudflare Account)

**Setup (one-time):**
```bash
# Login to Cloudflare
cloudflared tunnel login

# Create tunnel
cloudflared tunnel create aigrc-mcp

# Get tunnel credentials file location
# Usually: ~/.cloudflared/<tunnel-id>.json
```

**Configure tunnel:**
```yaml
# ~/.cloudflared/config.yml
tunnel: aigrc-mcp
credentials-file: /path/to/.cloudflared/<tunnel-id>.json

ingress:
  - hostname: aigrc.yourdomain.com
    service: http://localhost:3000
  - service: http_status:404
```

**Start tunnel:**
```bash
cloudflared tunnel run aigrc-mcp
```

#### 6.3.4 Cloudflare Tunnel Benefits

| Feature | Description |
|---------|-------------|
| Free tier | Unlimited bandwidth, no connection limits |
| Custom domains | Use your own domain |
| No port forwarding | Works behind NAT/firewall |
| Auto TLS | HTTPS provided automatically |
| Access policies | Integrate with Cloudflare Access |
| Stable URLs | URL doesn't change between restarts |

### 6.4 Option C: localtunnel

A simple, Node.js-based alternative:

```bash
# Install
npm install -g localtunnel

# Start tunnel
lt --port 3000 --subdomain aigrc-myname
```

**Output:**
```
your url is: https://aigrc-myname.loca.lt
```

### 6.5 Option D: Tailscale Funnel

For users already using Tailscale:

```bash
# Enable funnel (requires Tailscale setup)
tailscale funnel 3000
```

### 6.6 Tunnel Comparison

| Feature | ngrok | Cloudflare | localtunnel | Tailscale |
|---------|-------|------------|-------------|-----------|
| Free tier | ✓ (limited) | ✓ (generous) | ✓ | ✓ |
| Custom domains | Paid | Free (with account) | Limited | With account |
| Stable URL | Paid | ✓ | ✓ (subdomain) | ✓ |
| Auth integration | ✓ | ✓ (Access) | ✗ | ✓ |
| Setup complexity | Low | Medium | Low | Medium |
| Production ready | ✓ | ✓ | ✗ | ✓ |

### 6.7 Tunnel URL for Cloud Platforms

Once your tunnel is running, use the HTTPS URL:

```
# ngrok example
https://a1b2c3d4e5f6.ngrok-free.app/mcp

# Cloudflare example
https://aigrc.yourdomain.com/mcp

# localtunnel example
https://aigrc-myname.loca.lt/mcp
```

---

## 7. Part 3: Lovable Integration

### 7.1 Overview

[Lovable](https://lovable.dev) is an AI-powered full-stack development platform. Integration with AIGRC enables governance checks during AI-assisted development.

### 7.2 Prerequisites

1. ✅ AIGRC HTTP server running (local + tunnel OR cloud deployed)
2. ✅ Public HTTPS URL available
3. ✅ Lovable account with project access
4. ✅ Asset cards created in your workspace

### 7.3 Step 1: Verify Server Accessibility

Before configuring Lovable, confirm your server is accessible:

```bash
# Replace with your actual URL
AIGRC_URL="https://your-server.example.com"

# Health check
curl -s "$AIGRC_URL/health" | jq .

# Should return:
# {
#   "status": "healthy",
#   ...
# }
```

### 7.4 Step 2: Locate Lovable MCP Configuration

> **Note:** Lovable's MCP configuration interface may vary. Check Lovable's current documentation for the exact location.

**Typical locations:**
1. Project Settings → Integrations → MCP Servers
2. Settings → AI Configuration → Custom Tools
3. `.lovable/config.json` in project root

### 7.5 Step 3: Configure AIGRC in Lovable

**Configuration Format (JSON):**
```json
{
  "mcpServers": {
    "aigrc": {
      "transport": "streamable-http",
      "url": "https://your-server.example.com/mcp",
      "headers": {
        "Authorization": "Bearer YOUR_API_KEY",
        "X-AIGRC-Tenant-ID": "your-tenant-id"
      },
      "timeout": 30000,
      "retries": 3
    }
  }
}
```

**Configuration Fields:**

| Field | Required | Description |
|-------|----------|-------------|
| `transport` | Yes | Must be `"streamable-http"` |
| `url` | Yes | Full URL to `/mcp` endpoint |
| `headers.Authorization` | If auth enabled | Bearer token or API key |
| `headers.X-AIGRC-Tenant-ID` | If multi-tenant | Tenant identifier |
| `timeout` | No | Request timeout in ms (default: 30000) |
| `retries` | No | Number of retry attempts (default: 3) |

### 7.6 Step 4: Alternative - Environment-Based Configuration

Some platforms support environment variables:

```bash
# In Lovable project settings or .env
MCP_AIGRC_URL=https://your-server.example.com/mcp
MCP_AIGRC_AUTH_TOKEN=your-api-key
MCP_AIGRC_TENANT_ID=your-tenant-id
```

### 7.7 Step 5: Test Integration in Lovable

Once configured, test in Lovable's AI chat:

```
@aigrc What governance tools do you have available?
```

**Expected Response:**
The AI should list AIGRC tools including:
- `get_deployment_readiness`
- `get_blockers`
- `check_compliance`
- `gap_analysis`
- And 22 more tools...

### 7.8 Step 6: Configure Workspace Mapping

If Lovable projects map to specific AIGRC workspaces:

**Option A: Per-Project Configuration**
```json
{
  "mcpServers": {
    "aigrc": {
      "transport": "streamable-http",
      "url": "https://your-server.example.com/mcp",
      "headers": {
        "X-AIGRC-Workspace": "/projects/my-lovable-project"
      }
    }
  }
}
```

**Option B: Dynamic Workspace (via environment)**
```json
{
  "mcpServers": {
    "aigrc": {
      "transport": "streamable-http",
      "url": "https://your-server.example.com/mcp",
      "headers": {
        "X-AIGRC-Workspace": "${PROJECT_ROOT}"
      }
    }
  }
}
```

### 7.9 Lovable-Specific Use Cases

#### Use Case 1: Pre-Commit Governance Check

```
Before I commit this AI agent code, run a governance check 
and tell me if there are any blockers.
```

#### Use Case 2: Generate Compliance Documentation

```
Generate an EU AI Act impact assessment for the 
recommendation-engine component in this project.
```

#### Use Case 3: Risk Classification

```
Classify this AI feature under EU AI Act risk categories 
and explain the implications.
```

### 7.10 Troubleshooting Lovable Integration

| Issue | Possible Cause | Solution |
|-------|----------------|----------|
| "MCP server not found" | URL incorrect | Verify URL ends with `/mcp` |
| "Connection refused" | Server not running | Check server logs |
| "401 Unauthorized" | Auth token invalid | Regenerate API key |
| "CORS error" | Origin not allowed | Add Lovable origin to CORS |
| "Timeout" | Server overloaded | Increase timeout, check server |
| Tools not appearing | Initialization failed | Check MCP protocol version |

---

## 8. Part 4: Replit Integration

### 8.1 Overview

[Replit](https://replit.com) is a collaborative browser-based IDE. You can either deploy AIGRC directly on Replit or connect to an external server.

### 8.2 Option A: Deploy AIGRC on Replit

#### 8.2.1 Create New Repl

1. Go to https://replit.com
2. Click "Create Repl"
3. Select "Node.js" template
4. Name your Repl (e.g., "aigrc-mcp-server")

#### 8.2.2 Upload AIGRC Package

**Option 1: Clone from Git**
```bash
# In Replit shell
git clone https://github.com/yourorg/aigrc.git
cd aigrc
npm install
npm run build
```

**Option 2: Upload built package**
1. Build AIGRC locally: `pnpm run build`
2. Zip `packages/mcp/dist` folder
3. Upload to Replit and extract

#### 8.2.3 Create .replit Configuration

```toml
# .replit
run = "node packages/mcp/dist/bin/aigrc-mcp-http.js"

[env]
AIGRC_HTTP_PORT = "3000"
AIGRC_HTTP_HOST = "0.0.0.0"
AIGRC_WORKSPACE = "."
AIGRC_PROFILES = "eu-ai-act"
AIGRC_LOG_LEVEL = "info"
AIGRC_HTTP_AUTH_ENABLED = "false"
AIGRC_HTTP_CORS_ORIGIN = "*"

[nix]
channel = "stable-23_11"

[deployment]
run = ["sh", "-c", "node packages/mcp/dist/bin/aigrc-mcp-http.js"]

[[ports]]
localPort = 3000
externalPort = 80
```

#### 8.2.4 Create replit.nix (if needed)

```nix
{ pkgs }: {
  deps = [
    pkgs.nodejs_20
    pkgs.nodePackages.npm
  ];
}
```

#### 8.2.5 Create Asset Cards

Create asset cards in your Replit workspace:

```bash
# In Replit shell
mkdir -p .aigrc/cards

cat > .aigrc/cards/my-agent.yaml << 'EOF'
apiVersion: aigrc.io/v1
kind: AssetCard
name: my-agent
description: AI agent developed in Replit

technical:
  type: agent
  model: gpt-4

classification:
  riskLevel: medium

ownership:
  team: replit-dev
  owner: dev@example.com

governance:
  status: draft

intent:
  linked: false
EOF
```

#### 8.2.6 Start Server

Click the "Run" button in Replit. The server will start and be accessible at:

```
https://your-repl-name.your-username.repl.co
```

#### 8.2.7 Verify Deployment

```bash
# Replace with your Replit URL
curl https://your-repl-name.your-username.repl.co/health
```

### 8.3 Option B: Connect External AIGRC Server to Replit

If you have AIGRC deployed elsewhere (Docker, Kubernetes, etc.):

#### 8.3.1 Configure Replit Environment

In Replit's "Secrets" (environment variables):

```
AIGRC_MCP_URL=https://your-external-server.com/mcp
AIGRC_API_KEY=your-api-key
```

#### 8.3.2 Use in Replit AI

If Replit supports custom MCP servers, configure:

```json
{
  "mcpServers": {
    "aigrc": {
      "transport": "streamable-http",
      "url": "${AIGRC_MCP_URL}",
      "headers": {
        "Authorization": "Bearer ${AIGRC_API_KEY}"
      }
    }
  }
}
```

### 8.4 Replit-Specific Considerations

#### 8.4.1 Always-On (Paid Feature)

Free Replit repls sleep after inactivity. For persistent availability:
- Upgrade to Replit's paid plan for "Always On"
- Or use external deployment (Docker, etc.)

#### 8.4.2 Storage Persistence

Replit storage persists between runs, so asset cards and configuration are preserved.

#### 8.4.3 Resource Limits

| Resource | Free Tier | Hacker Plan |
|----------|-----------|-------------|
| CPU | Shared | Dedicated |
| RAM | 512 MB | 2 GB |
| Storage | 500 MB | 5 GB |
| Always On | No | Yes |

### 8.5 Testing Replit Integration

```bash
# In Replit shell or external terminal
REPLIT_URL="https://your-repl-name.your-username.repl.co"

# Health check
curl "$REPLIT_URL/health"

# Initialize MCP session
curl -X POST "$REPLIT_URL/mcp" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "initialize",
    "params": {
      "protocolVersion": "2024-11-05",
      "capabilities": {},
      "clientInfo": {"name": "test", "version": "1.0"}
    }
  }'
```

---

## 9. Part 5: Bolt.new Integration

### 9.1 Overview

[Bolt.new](https://bolt.new) is an AI-powered web development platform by StackBlitz. Integration enables governance-aware AI assistance.

### 9.2 Prerequisites

1. ✅ Bolt.new account
2. ✅ AIGRC HTTP server accessible via HTTPS
3. ✅ Asset cards configured for your project

### 9.3 Configuration

> **Note:** Bolt.new's MCP configuration may vary. Check current documentation.

**Typical configuration:**
```json
{
  "ai": {
    "mcpServers": {
      "aigrc": {
        "transport": "http",
        "url": "https://your-aigrc-server.com/mcp",
        "headers": {
          "Authorization": "Bearer YOUR_API_KEY"
        }
      }
    }
  }
}
```

### 9.4 WebContainer Considerations

Bolt.new runs code in WebContainers (browser-based Node.js). The AIGRC MCP server must be external since WebContainers can't run long-lived servers.

**Recommended Architecture:**
```
┌─────────────────┐     HTTPS     ┌─────────────────┐
│    Bolt.new     │ ────────────→ │   AIGRC MCP     │
│  (WebContainer) │               │  (External)     │
└─────────────────┘               └─────────────────┘
```

### 9.5 Testing in Bolt.new

After configuration:

```
@aigrc List all governance tools available
```

```
@aigrc Check if customer-chatbot meets EU AI Act requirements
```

---

## 10. Part 6: Generic Cloud Deployment

### 10.1 Overview

For production deployments, deploy AIGRC to cloud infrastructure. This section covers Docker-based deployments to major cloud providers.

### 10.2 Dockerfile

**Production Dockerfile:**
```dockerfile
# Dockerfile
FROM node:20-alpine AS base

# Install dependencies for native modules
RUN apk add --no-cache libc6-compat

WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./
COPY packages/mcp/package.json ./packages/mcp/

# Install production dependencies
RUN npm ci --only=production --ignore-scripts

# Copy built application
COPY packages/mcp/dist ./packages/mcp/dist

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 aigrc
RUN chown -R aigrc:nodejs /app

# Switch to non-root user
USER aigrc

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

# Set environment defaults
ENV NODE_ENV=production
ENV AIGRC_HTTP_PORT=3000
ENV AIGRC_HTTP_HOST=0.0.0.0
ENV AIGRC_LOG_LEVEL=info

# Start server
CMD ["node", "packages/mcp/dist/bin/aigrc-mcp-http.js"]
```

**Multi-stage build (smaller image):**
```dockerfile
# Dockerfile.multistage
FROM node:20-alpine AS builder
WORKDIR /app
COPY . .
RUN npm ci
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 aigrc

COPY --from=builder --chown=aigrc:nodejs /app/packages/mcp/dist ./packages/mcp/dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./

USER aigrc
EXPOSE 3000

ENV NODE_ENV=production
CMD ["node", "packages/mcp/dist/bin/aigrc-mcp-http.js"]
```

### 10.3 Docker Compose

**docker-compose.yml:**
```yaml
version: '3.8'

services:
  aigrc-mcp:
    build:
      context: .
      dockerfile: Dockerfile
    image: aigrc-mcp:latest
    container_name: aigrc-mcp
    restart: unless-stopped
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - AIGRC_HTTP_PORT=3000
      - AIGRC_HTTP_HOST=0.0.0.0
      - AIGRC_WORKSPACE=/data
      - AIGRC_CARDS_DIR=/data/.aigrc/cards
      - AIGRC_PROFILES=eu-ai-act,nist-rmf
      - AIGRC_LOG_LEVEL=info
      - AIGRC_HTTP_AUTH_ENABLED=true
      - AIGRC_HTTP_API_KEY=${AIGRC_API_KEY}
      - AIGRC_HTTP_CORS_ORIGIN=${CORS_ORIGIN:-*}
      - AIGRC_HTTP_REQUESTS_PER_MINUTE=120
      - AIGRC_HTTP_TOOL_CALLS_PER_HOUR=1000
    volumes:
      - aigrc-data:/data
      - ./asset-cards:/data/.aigrc/cards:ro
    healthcheck:
      test: ["CMD", "wget", "--no-verbose", "--tries=1", "--spider", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 10s
    logging:
      driver: json-file
      options:
        max-size: "10m"
        max-file: "3"
    deploy:
      resources:
        limits:
          cpus: '1.0'
          memory: 512M
        reservations:
          cpus: '0.25'
          memory: 256M

volumes:
  aigrc-data:
```

**Start with Docker Compose:**
```bash
# Create .env file
echo "AIGRC_API_KEY=your-secure-api-key" > .env
echo "CORS_ORIGIN=https://lovable.dev,https://replit.com" >> .env

# Start
docker compose up -d

# Check logs
docker compose logs -f aigrc-mcp

# Check health
curl http://localhost:3000/health
```

### 10.4 AWS Deployment

#### 10.4.1 AWS ECS (Fargate)

**Task Definition (task-definition.json):**
```json
{
  "family": "aigrc-mcp",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "256",
  "memory": "512",
  "executionRoleArn": "arn:aws:iam::ACCOUNT:role/ecsTaskExecutionRole",
  "containerDefinitions": [
    {
      "name": "aigrc-mcp",
      "image": "ACCOUNT.dkr.ecr.REGION.amazonaws.com/aigrc-mcp:latest",
      "portMappings": [
        {
          "containerPort": 3000,
          "protocol": "tcp"
        }
      ],
      "environment": [
        {"name": "AIGRC_HTTP_PORT", "value": "3000"},
        {"name": "AIGRC_PROFILES", "value": "eu-ai-act"},
        {"name": "AIGRC_LOG_LEVEL", "value": "info"}
      ],
      "secrets": [
        {
          "name": "AIGRC_HTTP_API_KEY",
          "valueFrom": "arn:aws:secretsmanager:REGION:ACCOUNT:secret:aigrc/api-key"
        }
      ],
      "healthCheck": {
        "command": ["CMD-SHELL", "wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1"],
        "interval": 30,
        "timeout": 5,
        "retries": 3,
        "startPeriod": 10
      },
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/aigrc-mcp",
          "awslogs-region": "REGION",
          "awslogs-stream-prefix": "ecs"
        }
      }
    }
  ]
}
```

#### 10.4.2 AWS Lambda (Serverless)

For serverless deployment, AIGRC provides a Lambda-compatible handler:

```javascript
// lambda.js
const { createLambdaHandler } = require('@aigrc/mcp/lambda');

exports.handler = createLambdaHandler({
  workspace: process.env.AIGRC_WORKSPACE || '/tmp/aigrc',
  profiles: (process.env.AIGRC_PROFILES || 'eu-ai-act').split(','),
});
```

**serverless.yml:**
```yaml
service: aigrc-mcp

provider:
  name: aws
  runtime: nodejs20.x
  region: us-east-1
  memorySize: 512
  timeout: 30
  environment:
    AIGRC_PROFILES: eu-ai-act
    AIGRC_LOG_LEVEL: info

functions:
  mcp:
    handler: lambda.handler
    events:
      - http:
          path: /mcp
          method: post
          cors: true
      - http:
          path: /health
          method: get
          cors: true
```

### 10.5 Google Cloud Platform

#### 10.5.1 Cloud Run

```bash
# Build and push to GCR
gcloud builds submit --tag gcr.io/PROJECT_ID/aigrc-mcp

# Deploy to Cloud Run
gcloud run deploy aigrc-mcp \
  --image gcr.io/PROJECT_ID/aigrc-mcp \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --port 3000 \
  --memory 512Mi \
  --cpu 1 \
  --set-env-vars "AIGRC_PROFILES=eu-ai-act,AIGRC_LOG_LEVEL=info"
```

#### 10.5.2 GKE (Kubernetes)

See [Part 7: Container Orchestration](#11-part-7-container-orchestration) for Kubernetes manifests.

### 10.6 Azure Deployment

#### 10.6.1 Azure Container Instances

```bash
# Create resource group
az group create --name aigrc-rg --location eastus

# Deploy container
az container create \
  --resource-group aigrc-rg \
  --name aigrc-mcp \
  --image your-registry.azurecr.io/aigrc-mcp:latest \
  --dns-name-label aigrc-mcp \
  --ports 3000 \
  --cpu 1 \
  --memory 1 \
  --environment-variables \
    AIGRC_PROFILES=eu-ai-act \
    AIGRC_LOG_LEVEL=info
```

#### 10.6.2 Azure Kubernetes Service (AKS)

See [Part 7: Container Orchestration](#11-part-7-container-orchestration) for Kubernetes manifests.

---

## 11. Part 7: Container Orchestration

### 11.1 Kubernetes Deployment

#### 11.1.1 Namespace

```yaml
# namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: aigrc
  labels:
    app.kubernetes.io/name: aigrc
    app.kubernetes.io/component: governance
```

#### 11.1.2 ConfigMap

```yaml
# configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: aigrc-mcp-config
  namespace: aigrc
data:
  AIGRC_HTTP_PORT: "3000"
  AIGRC_HTTP_HOST: "0.0.0.0"
  AIGRC_PROFILES: "eu-ai-act,nist-rmf"
  AIGRC_LOG_LEVEL: "info"
  AIGRC_HTTP_STATEFUL: "true"
  AIGRC_HTTP_SESSION_TTL: "1800"
  AIGRC_HTTP_REQUESTS_PER_MINUTE: "120"
  AIGRC_HTTP_TOOL_CALLS_PER_HOUR: "1000"
  AIGRC_HTTP_CORS_ORIGIN: "https://lovable.dev,https://replit.com,https://bolt.new"
```

#### 11.1.3 Secret

```yaml
# secret.yaml
apiVersion: v1
kind: Secret
metadata:
  name: aigrc-mcp-secrets
  namespace: aigrc
type: Opaque
stringData:
  AIGRC_HTTP_API_KEY: "your-secure-api-key-here"
  # For OAuth
  # AIGRC_HTTP_OAUTH_CLIENT_SECRET: "oauth-client-secret"
```

#### 11.1.4 Deployment

```yaml
# deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: aigrc-mcp
  namespace: aigrc
  labels:
    app: aigrc-mcp
    app.kubernetes.io/name: aigrc-mcp
    app.kubernetes.io/component: server
spec:
  replicas: 2
  selector:
    matchLabels:
      app: aigrc-mcp
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0
  template:
    metadata:
      labels:
        app: aigrc-mcp
      annotations:
        prometheus.io/scrape: "true"
        prometheus.io/port: "3000"
        prometheus.io/path: "/metrics"
    spec:
      serviceAccountName: aigrc-mcp
      securityContext:
        runAsNonRoot: true
        runAsUser: 1001
        fsGroup: 1001
      containers:
        - name: aigrc-mcp
          image: your-registry/aigrc-mcp:latest
          imagePullPolicy: Always
          ports:
            - name: http
              containerPort: 3000
              protocol: TCP
          envFrom:
            - configMapRef:
                name: aigrc-mcp-config
            - secretRef:
                name: aigrc-mcp-secrets
          env:
            - name: AIGRC_WORKSPACE
              value: "/data"
          volumeMounts:
            - name: asset-cards
              mountPath: /data/.aigrc/cards
              readOnly: true
          resources:
            requests:
              cpu: "100m"
              memory: "256Mi"
            limits:
              cpu: "500m"
              memory: "512Mi"
          livenessProbe:
            httpGet:
              path: /health
              port: http
            initialDelaySeconds: 10
            periodSeconds: 30
            timeoutSeconds: 5
            failureThreshold: 3
          readinessProbe:
            httpGet:
              path: /health
              port: http
            initialDelaySeconds: 5
            periodSeconds: 10
            timeoutSeconds: 5
            failureThreshold: 3
          securityContext:
            allowPrivilegeEscalation: false
            readOnlyRootFilesystem: true
            capabilities:
              drop:
                - ALL
      volumes:
        - name: asset-cards
          configMap:
            name: aigrc-asset-cards
      affinity:
        podAntiAffinity:
          preferredDuringSchedulingIgnoredDuringExecution:
            - weight: 100
              podAffinityTerm:
                labelSelector:
                  matchLabels:
                    app: aigrc-mcp
                topologyKey: kubernetes.io/hostname
```

#### 11.1.5 Service

```yaml
# service.yaml
apiVersion: v1
kind: Service
metadata:
  name: aigrc-mcp
  namespace: aigrc
  labels:
    app: aigrc-mcp
spec:
  type: ClusterIP
  ports:
    - name: http
      port: 80
      targetPort: http
      protocol: TCP
  selector:
    app: aigrc-mcp
```

#### 11.1.6 Ingress

```yaml
# ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: aigrc-mcp
  namespace: aigrc
  annotations:
    kubernetes.io/ingress.class: nginx
    cert-manager.io/cluster-issuer: letsencrypt-prod
    nginx.ingress.kubernetes.io/proxy-body-size: "10m"
    nginx.ingress.kubernetes.io/proxy-read-timeout: "60"
    nginx.ingress.kubernetes.io/proxy-send-timeout: "60"
    # Enable for SSE support
    nginx.ingress.kubernetes.io/proxy-buffering: "off"
spec:
  tls:
    - hosts:
        - aigrc.yourdomain.com
      secretName: aigrc-tls
  rules:
    - host: aigrc.yourdomain.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: aigrc-mcp
                port:
                  number: 80
```

#### 11.1.7 Horizontal Pod Autoscaler

```yaml
# hpa.yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: aigrc-mcp
  namespace: aigrc
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: aigrc-mcp
  minReplicas: 2
  maxReplicas: 10
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 70
    - type: Resource
      resource:
        name: memory
        target:
          type: Utilization
          averageUtilization: 80
  behavior:
    scaleDown:
      stabilizationWindowSeconds: 300
      policies:
        - type: Percent
          value: 10
          periodSeconds: 60
    scaleUp:
      stabilizationWindowSeconds: 0
      policies:
        - type: Percent
          value: 100
          periodSeconds: 15
```

#### 11.1.8 Apply Kubernetes Manifests

```bash
# Create namespace
kubectl apply -f namespace.yaml

# Create config and secrets
kubectl apply -f configmap.yaml
kubectl apply -f secret.yaml

# Deploy
kubectl apply -f deployment.yaml
kubectl apply -f service.yaml
kubectl apply -f ingress.yaml
kubectl apply -f hpa.yaml

# Verify
kubectl get pods -n aigrc
kubectl get svc -n aigrc
kubectl get ingress -n aigrc
```

### 11.2 Helm Chart

For easier management, use a Helm chart:

**Chart.yaml:**
```yaml
apiVersion: v2
name: aigrc-mcp
description: AIGRC MCP HTTP Server
type: application
version: 1.0.0
appVersion: "3.0.0"
```

**values.yaml:**
```yaml
replicaCount: 2

image:
  repository: your-registry/aigrc-mcp
  pullPolicy: Always
  tag: "latest"

service:
  type: ClusterIP
  port: 80

ingress:
  enabled: true
  className: nginx
  annotations:
    cert-manager.io/cluster-issuer: letsencrypt-prod
  hosts:
    - host: aigrc.yourdomain.com
      paths:
        - path: /
          pathType: Prefix
  tls:
    - secretName: aigrc-tls
      hosts:
        - aigrc.yourdomain.com

resources:
  limits:
    cpu: 500m
    memory: 512Mi
  requests:
    cpu: 100m
    memory: 256Mi

autoscaling:
  enabled: true
  minReplicas: 2
  maxReplicas: 10
  targetCPUUtilizationPercentage: 70
  targetMemoryUtilizationPercentage: 80

config:
  profiles: "eu-ai-act,nist-rmf"
  logLevel: "info"
  corsOrigin: "https://lovable.dev,https://replit.com"
  sessionTTL: 1800
  requestsPerMinute: 120
  toolCallsPerHour: 1000

secrets:
  apiKey: ""  # Set via --set secrets.apiKey=xxx
```

**Install chart:**
```bash
helm install aigrc-mcp ./charts/aigrc-mcp \
  --namespace aigrc \
  --create-namespace \
  --set secrets.apiKey="your-api-key"
```

---

## 12. Part 8: Authentication & Authorization

### 12.1 Authentication Options

AIGRC MCP HTTP server supports multiple authentication methods:

| Method | Use Case | Complexity |
|--------|----------|------------|
| API Key | Simple, single-tenant | Low |
| OAuth 2.0 | Enterprise, multi-tenant | High |
| mTLS | High security environments | High |
| Custom | Integration with existing auth | Variable |

### 12.2 API Key Authentication

#### 12.2.1 Configuration

```bash
# Environment variables
export AIGRC_HTTP_AUTH_ENABLED=true
export AIGRC_HTTP_API_KEY=your-secure-api-key-here
```

#### 12.2.2 Client Usage

```bash
curl -X POST https://your-server.com/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -H "X-AIGRC-API-Key: your-secure-api-key-here" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}'
```

**Or with Authorization header:**
```bash
curl -X POST https://your-server.com/mcp \
  -H "Authorization: Bearer your-secure-api-key-here" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}'
```

#### 12.2.3 API Key Best Practices

1. **Use strong, random keys**: At least 32 characters
2. **Rotate regularly**: Every 90 days minimum
3. **Store securely**: Environment variables or secrets manager
4. **Scope appropriately**: Different keys for different environments
5. **Monitor usage**: Log and alert on unusual patterns

**Generate secure API key:**
```bash
# Using OpenSSL
openssl rand -base64 32

# Using Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Using Python
python3 -c "import secrets; print(secrets.token_urlsafe(32))"
```

### 12.3 OAuth 2.0 Authentication

#### 12.3.1 Configuration

```bash
# Enable OAuth
export AIGRC_HTTP_AUTH_ENABLED=true
export AIGRC_HTTP_AUTH_TYPE=oauth

# OAuth provider configuration
export AIGRC_HTTP_OAUTH_ISSUER=https://your-idp.com
export AIGRC_HTTP_OAUTH_AUDIENCE=aigrc-mcp-api
export AIGRC_HTTP_OAUTH_JWKS_URI=https://your-idp.com/.well-known/jwks.json
```

#### 12.3.2 Supported OAuth Providers

| Provider | Issuer URL Example |
|----------|-------------------|
| Auth0 | `https://your-tenant.auth0.com/` |
| Okta | `https://your-org.okta.com/oauth2/default` |
| Azure AD | `https://login.microsoftonline.com/{tenant}/v2.0` |
| Google | `https://accounts.google.com` |
| Keycloak | `https://keycloak.example.com/realms/your-realm` |

#### 12.3.3 Auth0 Example

**Environment:**
```bash
export AIGRC_HTTP_AUTH_ENABLED=true
export AIGRC_HTTP_AUTH_TYPE=oauth
export AIGRC_HTTP_OAUTH_ISSUER=https://your-tenant.auth0.com/
export AIGRC_HTTP_OAUTH_AUDIENCE=https://aigrc-mcp-api
```

**Client token request:**
```bash
# Get access token from Auth0
ACCESS_TOKEN=$(curl -s -X POST "https://your-tenant.auth0.com/oauth/token" \
  -H "Content-Type: application/json" \
  -d '{
    "client_id": "YOUR_CLIENT_ID",
    "client_secret": "YOUR_CLIENT_SECRET",
    "audience": "https://aigrc-mcp-api",
    "grant_type": "client_credentials"
  }' | jq -r '.access_token')

# Use token with AIGRC
curl -X POST https://your-server.com/mcp \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}'
```

#### 12.3.4 JWT Validation

The server validates JWTs by:
1. Checking signature against JWKS
2. Verifying issuer matches configuration
3. Verifying audience matches configuration
4. Checking token expiration
5. Validating required claims (if configured)

### 12.4 Multi-Tenant Authorization

#### 12.4.1 Tenant Isolation

```bash
# Enable multi-tenancy
export AIGRC_HTTP_MULTI_TENANT=true
export AIGRC_HTTP_TENANT_HEADER=X-AIGRC-Tenant-ID
```

**Client usage:**
```bash
curl -X POST https://your-server.com/mcp \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-AIGRC-Tenant-ID: tenant-123" \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}'
```

#### 12.4.2 Tenant-Specific Configuration

Each tenant can have separate:
- Asset card directories
- Compliance profiles
- Rate limits
- Allowed tools

**Example tenant configuration:**
```yaml
# tenants/tenant-123.yaml
id: tenant-123
name: "Acme Corp"
workspace: /data/tenants/tenant-123
profiles:
  - eu-ai-act
  - soc2-ai
rateLimits:
  requestsPerMinute: 60
  toolCallsPerHour: 500
allowedTools:
  - get_deployment_readiness
  - get_blockers
  - check_compliance
```

### 12.5 Role-Based Access Control (RBAC)

#### 12.5.1 Roles

| Role | Description | Tool Access |
|------|-------------|-------------|
| `viewer` | Read-only access | `list_*`, `get_*`, `check_*` |
| `developer` | Standard development | All tools except admin |
| `reviewer` | Compliance review | All tools except write |
| `admin` | Full access | All tools |

#### 12.5.2 Role Configuration

```bash
# Enable RBAC
export AIGRC_HTTP_RBAC_ENABLED=true
export AIGRC_HTTP_RBAC_CLAIM=roles  # JWT claim containing roles
```

**JWT with roles:**
```json
{
  "sub": "user-123",
  "iss": "https://your-idp.com",
  "aud": "aigrc-mcp-api",
  "roles": ["developer", "reviewer"],
  "exp": 1735400000
}
```

---

## 13. Part 9: Session Management

### 13.1 Session Lifecycle

```
┌──────────────────────────────────────────────────────────────────────────┐
│                        SESSION LIFECYCLE                                 │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌─────────────┐    initialize    ┌─────────────┐    tool calls         │
│  │    NEW      │ ───────────────→ │   ACTIVE    │ ←─────────────→ Work  │
│  └─────────────┘                  └──────┬──────┘                        │
│                                          │                               │
│                                          │ TTL expires                   │
│                                          │ or explicit close             │
│                                          ▼                               │
│                                   ┌─────────────┐                        │
│                                   │   EXPIRED   │                        │
│                                   └──────┬──────┘                        │
│                                          │                               │
│                                          │ cleanup                       │
│                                          ▼                               │
│                                   ┌─────────────┐                        │
│                                   │   DELETED   │                        │
│                                   └─────────────┘                        │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

### 13.2 Session Configuration

```bash
# Enable stateful sessions
export AIGRC_HTTP_STATEFUL=true

# Session TTL (seconds) - time since last request
export AIGRC_HTTP_SESSION_TTL=1800  # 30 minutes

# Maximum concurrent sessions per client
export AIGRC_HTTP_MAX_SESSIONS_PER_CLIENT=5

# Session storage backend
export AIGRC_HTTP_SESSION_STORE=memory  # or "redis"

# Redis configuration (if using redis store)
export AIGRC_HTTP_REDIS_URL=redis://localhost:6379
export AIGRC_HTTP_REDIS_KEY_PREFIX=aigrc:session:
```

### 13.3 Session Headers

| Header | Direction | Description |
|--------|-----------|-------------|
| `Mcp-Session-Id` | Response (init) | Session ID assigned by server |
| `Mcp-Session-Id` | Request (subsequent) | Session ID to use |
| `X-AIGRC-Session-TTL` | Response | Remaining TTL in seconds |

### 13.4 Session Management API

**List Sessions:**
```bash
curl https://your-server.com/sessions \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

**Response:**
```json
{
  "sessions": [
    {
      "id": "sess_abc123",
      "clientInfo": {
        "name": "lovable-client",
        "version": "1.0.0"
      },
      "createdAt": "2025-12-28T10:00:00Z",
      "lastAccessedAt": "2025-12-28T10:15:00Z",
      "expiresAt": "2025-12-28T10:45:00Z",
      "toolCalls": 42
    }
  ],
  "count": 1
}
```

**Delete Session:**
```bash
curl -X DELETE https://your-server.com/sessions/sess_abc123 \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

### 13.5 Stateless Mode

For simpler deployments without session tracking:

```bash
export AIGRC_HTTP_STATEFUL=false
```

In stateless mode:
- No session IDs are generated
- Each request is independent
- No conversation context is maintained
- Simpler horizontal scaling

---

## 14. Configuration Reference

### 14.1 Server Configuration

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `AIGRC_HTTP_PORT` | Integer | `3000` | HTTP server port |
| `AIGRC_HTTP_HOST` | String | `0.0.0.0` | Bind address |
| `AIGRC_HTTP_STATEFUL` | Boolean | `true` | Enable session management |
| `AIGRC_HTTP_SESSION_TTL` | Integer | `1800` | Session TTL in seconds |
| `AIGRC_HTTP_SESSION_STORE` | Enum | `memory` | `memory` or `redis` |

### 14.2 Authentication Configuration

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `AIGRC_HTTP_AUTH_ENABLED` | Boolean | `false` | Enable authentication |
| `AIGRC_HTTP_AUTH_TYPE` | Enum | `apikey` | `apikey` or `oauth` |
| `AIGRC_HTTP_API_KEY` | String | - | API key (if apikey auth) |
| `AIGRC_HTTP_OAUTH_ISSUER` | URL | - | OAuth issuer URL |
| `AIGRC_HTTP_OAUTH_AUDIENCE` | String | - | OAuth audience |
| `AIGRC_HTTP_OAUTH_JWKS_URI` | URL | - | JWKS endpoint (auto-discovered if not set) |

### 14.3 Rate Limiting Configuration

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `AIGRC_HTTP_REQUESTS_PER_MINUTE` | Integer | `120` | Max requests per minute per client |
| `AIGRC_HTTP_TOOL_CALLS_PER_HOUR` | Integer | `1000` | Max tool calls per hour per client |
| `AIGRC_HTTP_RATE_LIMIT_WINDOW` | Integer | `60000` | Rate limit window in ms |
| `AIGRC_HTTP_RATE_LIMIT_STORE` | Enum | `memory` | `memory` or `redis` |

### 14.4 CORS Configuration

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `AIGRC_HTTP_CORS_ENABLED` | Boolean | `true` | Enable CORS |
| `AIGRC_HTTP_CORS_ORIGIN` | String | `*` | Allowed origins (comma-separated) |
| `AIGRC_HTTP_CORS_METHODS` | String | `GET,POST,DELETE,OPTIONS` | Allowed methods |
| `AIGRC_HTTP_CORS_HEADERS` | String | `Content-Type,Authorization,Mcp-Session-Id,X-AIGRC-*` | Allowed headers |
| `AIGRC_HTTP_CORS_MAX_AGE` | Integer | `86400` | Preflight cache duration |

### 14.5 Core AIGRC Configuration

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `AIGRC_WORKSPACE` | Path | `.` | Root workspace directory |
| `AIGRC_CARDS_DIR` | Path | `.aigrc/cards` | Asset cards directory |
| `AIGRC_PROFILES` | CSV | `eu-ai-act` | Active compliance profiles |
| `AIGRC_LOG_LEVEL` | Enum | `info` | `debug`, `info`, `warn`, `error` |
| `AIGRC_CACHE_TTL` | Integer | `300` | Asset card cache TTL in seconds |

### 14.6 Telemetry Configuration

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `AIGRC_HTTP_METRICS_ENABLED` | Boolean | `true` | Enable /metrics endpoint |
| `AIGRC_HTTP_METRICS_PATH` | Path | `/metrics` | Metrics endpoint path |
| `AIGRC_OTEL_ENABLED` | Boolean | `false` | Enable OpenTelemetry |
| `AIGRC_OTEL_ENDPOINT` | URL | - | OTLP exporter endpoint |
| `AIGRC_OTEL_SERVICE_NAME` | String | `aigrc-mcp` | Service name for traces |

---

## 15. API Reference

### 15.1 Endpoints Overview

| Endpoint | Method | Auth Required | Description |
|----------|--------|---------------|-------------|
| `/` | GET | No | Server info and capabilities |
| `/health` | GET | No | Health check |
| `/mcp` | POST | Configurable | MCP protocol endpoint |
| `/sessions` | GET | Admin | List active sessions |
| `/sessions/:id` | DELETE | Admin | Delete a session |
| `/metrics` | GET | Configurable | Prometheus metrics |

### 15.2 Server Info

**Request:**
```http
GET / HTTP/1.1
Host: aigrc.example.com
```

**Response:**
```json
{
  "name": "aigrc-mcp",
  "version": "3.0.0",
  "protocol": "2024-11-05",
  "transport": "streamable-http",
  "capabilities": {
    "tools": true,
    "resources": true,
    "prompts": true,
    "logging": true
  },
  "endpoints": {
    "mcp": "/mcp",
    "health": "/health",
    "sessions": "/sessions",
    "metrics": "/metrics"
  },
  "documentation": "https://docs.aigrc.io/mcp"
}
```

### 15.3 Health Check

**Request:**
```http
GET /health HTTP/1.1
Host: aigrc.example.com
```

**Response (Healthy):**
```json
{
  "status": "healthy",
  "version": "3.0.0",
  "transport": "streamable-http",
  "protocol": "2024-11-05",
  "uptime": 86400,
  "sessions": {
    "active": 5,
    "total": 150
  },
  "memory": {
    "used": 67108864,
    "total": 134217728,
    "percent": 50
  },
  "checks": {
    "workspace": "ok",
    "profiles": "ok",
    "redis": "ok"
  }
}
```

**Response (Degraded):**
```json
{
  "status": "degraded",
  "version": "3.0.0",
  "issues": [
    "Redis connection unstable"
  ],
  "checks": {
    "workspace": "ok",
    "profiles": "ok",
    "redis": "degraded"
  }
}
```

### 15.4 MCP Protocol

**Initialize:**
```http
POST /mcp HTTP/1.1
Host: aigrc.example.com
Content-Type: application/json
Accept: application/json, text/event-stream
Authorization: Bearer <token>

{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "initialize",
  "params": {
    "protocolVersion": "2024-11-05",
    "capabilities": {
      "roots": { "listChanged": true },
      "sampling": {}
    },
    "clientInfo": {
      "name": "lovable",
      "version": "1.0.0"
    }
  }
}
```

**Response Headers:**
```
Mcp-Session-Id: sess_abc123def456
X-AIGRC-Session-TTL: 1800
```

**List Tools:**
```http
POST /mcp HTTP/1.1
Host: aigrc.example.com
Content-Type: application/json
Accept: application/json, text/event-stream
Authorization: Bearer <token>
Mcp-Session-Id: sess_abc123def456

{
  "jsonrpc": "2.0",
  "id": 2,
  "method": "tools/list",
  "params": {}
}
```

**Call Tool:**
```http
POST /mcp HTTP/1.1
Host: aigrc.example.com
Content-Type: application/json
Accept: application/json, text/event-stream
Authorization: Bearer <token>
Mcp-Session-Id: sess_abc123def456

{
  "jsonrpc": "2.0",
  "id": 3,
  "method": "tools/call",
  "params": {
    "name": "get_deployment_readiness",
    "arguments": {
      "asset": "my-ai-agent"
    }
  }
}
```

### 15.5 Error Responses

**Authentication Error (401):**
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "error": {
    "code": -32001,
    "message": "Authentication required",
    "data": {
      "type": "AuthenticationError",
      "hint": "Provide Authorization header with valid Bearer token"
    }
  }
}
```

**Rate Limit Error (429):**
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "error": {
    "code": -32002,
    "message": "Rate limit exceeded",
    "data": {
      "type": "RateLimitError",
      "limit": 120,
      "remaining": 0,
      "resetAt": "2025-12-28T10:01:00Z"
    }
  }
}
```

**Session Not Found (404):**
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "error": {
    "code": -32003,
    "message": "Session not found",
    "data": {
      "type": "SessionError",
      "sessionId": "sess_expired123",
      "hint": "Session may have expired. Re-initialize to create a new session."
    }
  }
}
```

---

## 16. Security Hardening

### 16.1 Production Security Checklist

- [ ] **Authentication enabled**: `AIGRC_HTTP_AUTH_ENABLED=true`
- [ ] **HTTPS enforced**: Via reverse proxy with valid TLS certificate
- [ ] **CORS restricted**: Specific origins, not `*`
- [ ] **Rate limiting configured**: Appropriate limits for your use case
- [ ] **Secrets in environment**: Not in code or config files
- [ ] **Non-root container**: Running as non-privileged user
- [ ] **Read-only filesystem**: Container root filesystem read-only
- [ ] **Network policies**: Restrict ingress/egress in Kubernetes
- [ ] **Audit logging enabled**: All requests logged
- [ ] **Regular updates**: Keep dependencies up to date

### 16.2 TLS/HTTPS Configuration

**Option A: Reverse Proxy (Recommended)**

**nginx configuration:**
```nginx
server {
    listen 443 ssl http2;
    server_name aigrc.yourdomain.com;

    # SSL Configuration
    ssl_certificate /etc/letsencrypt/live/aigrc.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/aigrc.yourdomain.com/privkey.pem;
    
    # Modern SSL settings
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    ssl_session_timeout 1d;
    ssl_session_cache shared:SSL:50m;
    ssl_stapling on;
    ssl_stapling_verify on;

    # Security headers
    add_header Strict-Transport-Security "max-age=63072000" always;
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";

    # Rate limiting
    limit_req_zone $binary_remote_addr zone=aigrc_limit:10m rate=10r/s;
    limit_req zone=aigrc_limit burst=20 nodelay;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        
        # WebSocket/SSE support
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        
        # Pass client info
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # SSE support - disable buffering
        proxy_buffering off;
        proxy_cache off;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
}

# Redirect HTTP to HTTPS
server {
    listen 80;
    server_name aigrc.yourdomain.com;
    return 301 https://$server_name$request_uri;
}
```

**Option B: Direct TLS (if needed)**
```bash
export AIGRC_HTTP_TLS_ENABLED=true
export AIGRC_HTTP_TLS_CERT=/path/to/cert.pem
export AIGRC_HTTP_TLS_KEY=/path/to/key.pem
```

### 16.3 CORS Hardening

```bash
# Production CORS - specific origins only
export AIGRC_HTTP_CORS_ORIGIN="https://lovable.dev,https://bolt.new,https://replit.com"

# Restrict methods
export AIGRC_HTTP_CORS_METHODS="GET,POST,OPTIONS"

# Restrict headers
export AIGRC_HTTP_CORS_HEADERS="Content-Type,Authorization,Mcp-Session-Id"

# Disable credentials if not needed
export AIGRC_HTTP_CORS_CREDENTIALS=false
```

### 16.4 Rate Limiting Strategy

| Environment | Requests/min | Tool calls/hr | Notes |
|-------------|--------------|---------------|-------|
| Development | 600 | 5000 | Permissive for testing |
| Staging | 120 | 1000 | Production-like |
| Production | 60-120 | 500-1000 | Based on expected load |
| High-security | 30 | 200 | Strict limits |

### 16.5 Network Security

**Kubernetes Network Policy:**
```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: aigrc-mcp-network-policy
  namespace: aigrc
spec:
  podSelector:
    matchLabels:
      app: aigrc-mcp
  policyTypes:
    - Ingress
    - Egress
  ingress:
    - from:
        - namespaceSelector:
            matchLabels:
              name: ingress-nginx
      ports:
        - protocol: TCP
          port: 3000
  egress:
    # Allow DNS
    - to:
        - namespaceSelector: {}
      ports:
        - protocol: UDP
          port: 53
    # Allow Redis (if used)
    - to:
        - podSelector:
            matchLabels:
              app: redis
      ports:
        - protocol: TCP
          port: 6379
    # Block all other egress
```

### 16.6 Audit Logging

```bash
# Enable audit logging
export AIGRC_HTTP_AUDIT_ENABLED=true
export AIGRC_HTTP_AUDIT_LOG=/var/log/aigrc/audit.log

# Log format (json recommended for parsing)
export AIGRC_HTTP_AUDIT_FORMAT=json
```

**Audit log entry example:**
```json
{
  "timestamp": "2025-12-28T10:15:30.123Z",
  "level": "info",
  "event": "tool_call",
  "sessionId": "sess_abc123",
  "clientIP": "192.168.1.100",
  "userAgent": "lovable-client/1.0.0",
  "method": "tools/call",
  "tool": "get_deployment_readiness",
  "asset": "my-ai-agent",
  "duration": 245,
  "success": true,
  "tenantId": "tenant-123"
}
```

---

## 17. Monitoring & Observability

### 17.1 Prometheus Metrics

The `/metrics` endpoint exposes Prometheus-compatible metrics:

```bash
curl https://your-server.com/metrics
```

**Available Metrics:**

| Metric | Type | Description |
|--------|------|-------------|
| `aigrc_http_requests_total` | Counter | Total HTTP requests |
| `aigrc_http_request_duration_seconds` | Histogram | Request latency |
| `aigrc_mcp_tool_calls_total` | Counter | Total tool calls by tool name |
| `aigrc_mcp_tool_duration_seconds` | Histogram | Tool execution latency |
| `aigrc_sessions_active` | Gauge | Currently active sessions |
| `aigrc_sessions_total` | Counter | Total sessions created |
| `aigrc_rate_limit_hits_total` | Counter | Rate limit exceeded events |
| `aigrc_auth_failures_total` | Counter | Authentication failures |

### 17.2 Prometheus Configuration

**prometheus.yml:**
```yaml
scrape_configs:
  - job_name: 'aigrc-mcp'
    static_configs:
      - targets: ['aigrc-mcp:3000']
    metrics_path: /metrics
    scheme: http
    scrape_interval: 15s
```

### 17.3 Grafana Dashboard

Import the AIGRC dashboard JSON or use these panels:

**Key Panels:**
1. Request rate (requests/second)
2. Error rate (4xx/5xx percentage)
3. Latency percentiles (p50, p95, p99)
4. Tool call distribution
5. Active sessions
6. Rate limit hits
7. Memory usage

### 17.4 Alerting Rules

**Prometheus alerting rules:**
```yaml
groups:
  - name: aigrc-mcp
    rules:
      - alert: AIGRCHighErrorRate
        expr: rate(aigrc_http_requests_total{status=~"5.."}[5m]) / rate(aigrc_http_requests_total[5m]) > 0.05
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: High error rate on AIGRC MCP server

      - alert: AIGRCHighLatency
        expr: histogram_quantile(0.95, rate(aigrc_http_request_duration_seconds_bucket[5m])) > 5
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: High latency on AIGRC MCP server

      - alert: AIGRCRateLimitHits
        expr: rate(aigrc_rate_limit_hits_total[5m]) > 10
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: Frequent rate limit hits on AIGRC MCP server
```

### 17.5 OpenTelemetry Integration

```bash
# Enable OpenTelemetry
export AIGRC_OTEL_ENABLED=true
export AIGRC_OTEL_ENDPOINT=http://otel-collector:4318
export AIGRC_OTEL_SERVICE_NAME=aigrc-mcp
export AIGRC_OTEL_SERVICE_VERSION=3.0.0
```

---

## 18. Verification & Testing

### 18.1 Connectivity Test Suite

```bash
#!/bin/bash
# test-aigrc-http.sh - Comprehensive connectivity tests

AIGRC_URL="${1:-http://localhost:3000}"
API_KEY="${AIGRC_API_KEY:-}"

echo "=== AIGRC HTTP Server Test Suite ==="
echo "Target: $AIGRC_URL"
echo ""

# Test 1: Server info
echo "Test 1: Server Info"
RESPONSE=$(curl -s "$AIGRC_URL/")
if echo "$RESPONSE" | jq -e '.name == "aigrc-mcp"' > /dev/null 2>&1; then
    echo "  ✓ Server info returned correctly"
    echo "  Version: $(echo $RESPONSE | jq -r '.version')"
else
    echo "  ✗ Failed to get server info"
    echo "  Response: $RESPONSE"
fi
echo ""

# Test 2: Health check
echo "Test 2: Health Check"
HEALTH=$(curl -s "$AIGRC_URL/health")
STATUS=$(echo $HEALTH | jq -r '.status')
if [ "$STATUS" = "healthy" ]; then
    echo "  ✓ Server is healthy"
    echo "  Sessions: $(echo $HEALTH | jq -r '.sessions.active')"
else
    echo "  ⚠ Server status: $STATUS"
fi
echo ""

# Test 3: MCP Initialize
echo "Test 3: MCP Initialize"
AUTH_HEADER=""
if [ -n "$API_KEY" ]; then
    AUTH_HEADER="-H \"Authorization: Bearer $API_KEY\""
fi

INIT_RESPONSE=$(curl -s -X POST "$AIGRC_URL/mcp" \
    -H "Content-Type: application/json" \
    -H "Accept: application/json, text/event-stream" \
    $AUTH_HEADER \
    -D /tmp/headers.txt \
    -d '{
        "jsonrpc": "2.0",
        "id": 1,
        "method": "initialize",
        "params": {
            "protocolVersion": "2024-11-05",
            "capabilities": {},
            "clientInfo": {"name": "test", "version": "1.0"}
        }
    }')

if echo "$INIT_RESPONSE" | jq -e '.result.serverInfo' > /dev/null 2>&1; then
    echo "  ✓ MCP initialized successfully"
    SESSION_ID=$(grep -i "mcp-session-id" /tmp/headers.txt | cut -d: -f2 | tr -d ' \r')
    echo "  Session ID: $SESSION_ID"
else
    echo "  ✗ MCP initialization failed"
    echo "  Response: $INIT_RESPONSE"
    exit 1
fi
echo ""

# Test 4: List tools
echo "Test 4: List Tools"
TOOLS_RESPONSE=$(curl -s -X POST "$AIGRC_URL/mcp" \
    -H "Content-Type: application/json" \
    -H "Accept: application/json, text/event-stream" \
    -H "Mcp-Session-Id: $SESSION_ID" \
    $AUTH_HEADER \
    -d '{
        "jsonrpc": "2.0",
        "id": 2,
        "method": "tools/list",
        "params": {}
    }')

TOOL_COUNT=$(echo "$TOOLS_RESPONSE" | jq '.result.tools | length')
if [ "$TOOL_COUNT" -gt 0 ]; then
    echo "  ✓ Tools listed successfully"
    echo "  Tool count: $TOOL_COUNT"
else
    echo "  ✗ Failed to list tools"
fi
echo ""

# Test 5: Call a tool
echo "Test 5: Tool Execution"
TOOL_RESPONSE=$(curl -s -X POST "$AIGRC_URL/mcp" \
    -H "Content-Type: application/json" \
    -H "Accept: application/json, text/event-stream" \
    -H "Mcp-Session-Id: $SESSION_ID" \
    $AUTH_HEADER \
    -d '{
        "jsonrpc": "2.0",
        "id": 3,
        "method": "tools/call",
        "params": {
            "name": "get_blockers",
            "arguments": {}
        }
    }')

if echo "$TOOL_RESPONSE" | jq -e '.result.content' > /dev/null 2>&1; then
    echo "  ✓ Tool executed successfully"
else
    echo "  ✗ Tool execution failed"
    echo "  Response: $TOOL_RESPONSE"
fi
echo ""

echo "=== Test Suite Complete ==="
```

### 18.2 Load Testing

**Using k6:**
```javascript
// load-test.js
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
    stages: [
        { duration: '30s', target: 10 },  // Ramp up
        { duration: '1m', target: 10 },   // Steady state
        { duration: '30s', target: 0 },   // Ramp down
    ],
    thresholds: {
        http_req_duration: ['p(95)<500'],
        http_req_failed: ['rate<0.01'],
    },
};

const BASE_URL = __ENV.AIGRC_URL || 'http://localhost:3000';

export default function () {
    // Health check
    const healthRes = http.get(`${BASE_URL}/health`);
    check(healthRes, {
        'health status 200': (r) => r.status === 200,
        'health is healthy': (r) => JSON.parse(r.body).status === 'healthy',
    });

    // MCP initialize
    const initRes = http.post(
        `${BASE_URL}/mcp`,
        JSON.stringify({
            jsonrpc: '2.0',
            id: 1,
            method: 'initialize',
            params: {
                protocolVersion: '2024-11-05',
                capabilities: {},
                clientInfo: { name: 'k6', version: '1.0' },
            },
        }),
        {
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json, text/event-stream',
            },
        }
    );
    check(initRes, {
        'init status 200': (r) => r.status === 200,
    });

    sleep(1);
}
```

**Run load test:**
```bash
k6 run --env AIGRC_URL=https://your-server.com load-test.js
```

---

## 19. Troubleshooting Guide

### 19.1 Diagnostic Flowchart

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    HTTP SERVER TROUBLESHOOTING                          │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  1. Server Starting?                                                    │
│     │                                                                   │
│     ├─ NO  → Check Node.js version (18+)                               │
│     │        Check port availability                                    │
│     │        Check binary path                                          │
│     │                                                                   │
│     └─ YES                                                              │
│         │                                                               │
│         ▼                                                               │
│  2. Health Check Passing?                                               │
│     │                                                                   │
│     ├─ NO  → Check server logs                                         │
│     │        Check workspace path                                       │
│     │        Check file permissions                                     │
│     │                                                                   │
│     └─ YES                                                              │
│         │                                                               │
│         ▼                                                               │
│  3. External Access Working?                                            │
│     │                                                                   │
│     ├─ NO  → Check firewall rules                                      │
│     │        Check bind address (0.0.0.0)                               │
│     │        Check tunnel/proxy configuration                          │
│     │                                                                   │
│     └─ YES                                                              │
│         │                                                               │
│         ▼                                                               │
│  4. Authentication Working?                                             │
│     │                                                                   │
│     ├─ NO  → Check API key / OAuth configuration                       │
│     │        Check Authorization header format                          │
│     │        Check token expiration                                     │
│     │                                                                   │
│     └─ YES                                                              │
│         │                                                               │
│         ▼                                                               │
│  5. MCP Protocol Working?                                               │
│     │                                                                   │
│     ├─ NO  → Check Content-Type header                                 │
│     │        Check Accept header (include text/event-stream)            │
│     │        Check session ID (after init)                              │
│     │                                                                   │
│     └─ YES → Integration successful!                                    │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### 19.2 Common Issues and Solutions

#### Issue: Server Won't Start

**Symptoms:**
- Error on startup
- Port binding fails
- Module not found

**Diagnostic:**
```bash
# Check port availability
lsof -i :3000
# or
netstat -tlnp | grep 3000

# Check Node.js version
node --version

# Run with debug logging
AIGRC_LOG_LEVEL=debug node packages/mcp/dist/bin/aigrc-mcp-http.js
```

**Solutions:**

| Cause | Solution |
|-------|----------|
| Port in use | Change port or stop conflicting process |
| Node.js too old | Upgrade to v18+ |
| Module not found | Run `npm install` or `pnpm install` |
| Permission denied | Check file permissions, don't run as root |

#### Issue: CORS Errors

**Symptoms:**
- Browser console shows CORS error
- Requests blocked by browser

**Diagnostic:**
```bash
# Test CORS preflight
curl -v -X OPTIONS https://your-server.com/mcp \
  -H "Origin: https://lovable.dev" \
  -H "Access-Control-Request-Method: POST"
```

**Solutions:**

| Cause | Solution |
|-------|----------|
| Origin not allowed | Add origin to `AIGRC_HTTP_CORS_ORIGIN` |
| Headers not allowed | Add headers to `AIGRC_HTTP_CORS_HEADERS` |
| Methods not allowed | Add methods to `AIGRC_HTTP_CORS_METHODS` |

#### Issue: Session Not Found

**Symptoms:**
- "Session not found" error after initial success
- Session ID invalid

**Diagnostic:**
```bash
# Check session exists
curl https://your-server.com/sessions \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

**Solutions:**

| Cause | Solution |
|-------|----------|
| Session expired | Re-initialize, increase TTL |
| Wrong session ID | Use ID from `Mcp-Session-Id` header |
| Server restarted | Sessions lost if using memory store |
| Multiple instances | Use Redis for session storage |

#### Issue: Rate Limit Exceeded

**Symptoms:**
- 429 Too Many Requests
- `RateLimitError` in response

**Diagnostic:**
```bash
# Check rate limit headers
curl -v https://your-server.com/mcp \
  -H "Authorization: Bearer $TOKEN" \
  -d '...' 2>&1 | grep -i "x-ratelimit"
```

**Solutions:**

| Cause | Solution |
|-------|----------|
| Too many requests | Implement backoff, reduce request rate |
| Limits too low | Increase `AIGRC_HTTP_REQUESTS_PER_MINUTE` |
| Shared client IP | Use unique client identifiers |

#### Issue: SSE/Streaming Not Working

**Symptoms:**
- Long polling instead of streaming
- Buffered responses

**Solutions:**

1. **nginx**: Add `proxy_buffering off;`
2. **CloudFlare**: Disable response buffering
3. **AWS ALB**: Use WebSocket-compatible configuration

### 19.3 Debug Mode

Enable verbose logging:
```bash
export AIGRC_LOG_LEVEL=debug
export DEBUG=aigrc:*
```

### 19.4 Collecting Debug Information

```bash
#!/bin/bash
# collect-http-debug.sh

echo "=== AIGRC HTTP Debug Information ==="
echo "Date: $(date -u +"%Y-%m-%dT%H:%M:%SZ")"
echo ""

echo "=== System ==="
uname -a
echo ""

echo "=== Node.js ==="
node --version
npm --version
echo ""

echo "=== Environment (sanitized) ==="
env | grep AIGRC | sed 's/API_KEY=.*/API_KEY=[REDACTED]/' | sed 's/TOKEN=.*/TOKEN=[REDACTED]/'
echo ""

echo "=== Server Health ==="
curl -s http://localhost:3000/health | jq .
echo ""

echo "=== Server Info ==="
curl -s http://localhost:3000/ | jq .
echo ""

echo "=== Active Sessions ==="
curl -s http://localhost:3000/sessions 2>/dev/null | jq . || echo "Requires auth"
echo ""

echo "=== Recent Logs ==="
journalctl -u aigrc-mcp --since "1 hour ago" 2>/dev/null || \
docker logs --since 1h aigrc-mcp 2>/dev/null || \
echo "Logs not available via journalctl or docker"
```

---

## 20. Performance Optimization

### 20.1 Server Tuning

```bash
# Increase Node.js memory limit
export NODE_OPTIONS="--max-old-space-size=1024"

# Enable garbage collection optimization
export NODE_OPTIONS="--max-old-space-size=1024 --optimize-for-size"

# Connection pooling
export AIGRC_HTTP_KEEP_ALIVE=true
export AIGRC_HTTP_KEEP_ALIVE_TIMEOUT=5000
```

### 20.2 Session Store Optimization

**Redis configuration for sessions:**
```bash
# Use Redis for high-traffic deployments
export AIGRC_HTTP_SESSION_STORE=redis
export AIGRC_HTTP_REDIS_URL=redis://localhost:6379
export AIGRC_HTTP_REDIS_KEY_PREFIX=aigrc:sess:

# Redis cluster for HA
export AIGRC_HTTP_REDIS_CLUSTER=true
export AIGRC_HTTP_REDIS_NODES=redis-1:6379,redis-2:6379,redis-3:6379
```

### 20.3 Caching

```bash
# Asset card caching
export AIGRC_CACHE_TTL=300  # 5 minutes

# HTTP response caching (via CDN)
# Cache-Control headers are set automatically for:
# - /health (max-age=5)
# - / (max-age=60)
# - /metrics (max-age=5)
```

### 20.4 Connection Limits

```bash
# Maximum concurrent connections
export AIGRC_HTTP_MAX_CONNECTIONS=1000

# Connection timeout
export AIGRC_HTTP_CONNECTION_TIMEOUT=30000

# Request body size limit
export AIGRC_HTTP_MAX_BODY_SIZE=1mb
```

---

## 21. Example Workflows

### 21.1 Lovable: Pre-Commit Governance Check

**User prompt in Lovable:**
```
Before I commit this code, check if my-recommendation-engine 
has any governance blockers.
```

**AI response (using AIGRC):**
```
I've checked the governance status for my-recommendation-engine:

**Status: 2 Blockers Found**

1. **Missing Data Processing Documentation** (Critical)
   - EU AI Act Article 10 requires documentation of data governance
   - Create: `docs/data-governance.md`

2. **Pending Security Review** (High)
   - Security team approval required before deployment
   - Contact: security@company.com

**Recommended Action:**
Would you like me to generate a data governance documentation template?
```

### 21.2 Replit: Generate Compliance Artifacts

**User prompt:**
```
@aigrc Generate EU AI Act compliance documentation for my chatbot project
```

**AI response:**
```
I'll generate the required EU AI Act documentation for your chatbot.

**Generated Artifacts:**

1. **Technical Documentation** (Article 11)
   Created: `docs/technical-documentation.md`
   - System architecture
   - Data flows
   - Model specifications

2. **Risk Assessment** (Article 9)
   Created: `docs/risk-assessment.md`
   - Risk identification
   - Mitigation measures
   - Residual risk acceptance

3. **Human Oversight Plan** (Article 14)
   Created: `docs/human-oversight.md`
   - Override mechanisms
   - Escalation procedures

Would you like me to walk through any of these documents?
```

### 21.3 Bolt.new: Real-time Compliance Checking

**During development:**
```
@aigrc As I build this AI feature, what compliance requirements 
should I be aware of?
```

**AI response:**
```
Based on your project configuration (EU AI Act, high-risk classification):

**Real-time Compliance Checklist:**

✅ Completed:
- Risk classification documented
- Basic technical documentation exists

⚠️ In Progress:
- Data governance (50% complete)
- Human oversight mechanisms

❌ Required Before Deployment:
- Conformity assessment
- CE marking preparation
- Quality management system

**Tip:** I'll flag any new code that affects compliance status.
```

---

## 22. Support & Escalation

### 22.1 Self-Service Resources

| Resource | Location |
|----------|----------|
| Documentation | `/docs/` in AIGRC repo |
| API Reference | This document, Section 15 |
| FAQ | `/docs/faq.md` |
| Release Notes | `/CHANGELOG.md` |

### 22.2 Support Channels

| Channel | Use Case | Response Time |
|---------|----------|---------------|
| Slack: #aigrc-support | General questions | 4 hours |
| Email: aigrc@company.com | Formal requests | 1 business day |
| Jira: AIGRC project | Bug reports | Per SLA |
| PagerDuty | Production incidents | 30 minutes |

### 22.3 Escalation Path

```
Level 1: Self-Service (Documentation, FAQ)
    ↓
Level 2: #aigrc-support Slack
    ↓
Level 3: Email with debug info
    ↓
Level 4: PagerDuty (production only)
```

---

## 23. Appendices

### Appendix A: Complete Docker Compose Stack

```yaml
version: '3.8'

services:
  aigrc-mcp:
    build: .
    restart: unless-stopped
    ports:
      - "3000:3000"
    environment:
      - AIGRC_HTTP_PORT=3000
      - AIGRC_WORKSPACE=/data
      - AIGRC_PROFILES=eu-ai-act,nist-rmf
      - AIGRC_HTTP_SESSION_STORE=redis
      - AIGRC_HTTP_REDIS_URL=redis://redis:6379
      - AIGRC_HTTP_AUTH_ENABLED=true
      - AIGRC_HTTP_API_KEY=${AIGRC_API_KEY}
    volumes:
      - ./asset-cards:/data/.aigrc/cards:ro
    depends_on:
      - redis
    healthcheck:
      test: ["CMD", "wget", "-q", "--spider", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  redis:
    image: redis:7-alpine
    restart: unless-stopped
    volumes:
      - redis-data:/data
    command: redis-server --appendonly yes

  nginx:
    image: nginx:alpine
    restart: unless-stopped
    ports:
      - "443:443"
      - "80:80"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - ./certs:/etc/nginx/certs:ro
    depends_on:
      - aigrc-mcp

volumes:
  redis-data:
```

### Appendix B: Environment Variables Quick Reference

```bash
# Server
AIGRC_HTTP_PORT=3000
AIGRC_HTTP_HOST=0.0.0.0

# Authentication
AIGRC_HTTP_AUTH_ENABLED=true
AIGRC_HTTP_API_KEY=your-key

# Sessions
AIGRC_HTTP_STATEFUL=true
AIGRC_HTTP_SESSION_TTL=1800
AIGRC_HTTP_SESSION_STORE=redis
AIGRC_HTTP_REDIS_URL=redis://localhost:6379

# Rate Limiting
AIGRC_HTTP_REQUESTS_PER_MINUTE=120
AIGRC_HTTP_TOOL_CALLS_PER_HOUR=1000

# CORS
AIGRC_HTTP_CORS_ORIGIN=https://lovable.dev,https://replit.com

# Core AIGRC
AIGRC_WORKSPACE=/data
AIGRC_PROFILES=eu-ai-act
AIGRC_LOG_LEVEL=info
```

### Appendix C: MCP Protocol Quick Reference

**Initialize:**
```json
{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"client","version":"1.0"}}}
```

**List Tools:**
```json
{"jsonrpc":"2.0","id":2,"method":"tools/list","params":{}}
```

**Call Tool:**
```json
{"jsonrpc":"2.0","id":3,"method":"tools/call","params":{"name":"get_blockers","arguments":{}}}
```

**List Resources:**
```json
{"jsonrpc":"2.0","id":4,"method":"resources/list","params":{}}
```

---

## Document Revision History

| Date | Version | Changes |
|------|---------|---------|
| 2025-12-28 | 2.0 | Enterprise revision |
| 2025-10-01 | 1.0 | Initial release |

---

**End of Document**

*For the latest version, check the AIGRC documentation repository.*
