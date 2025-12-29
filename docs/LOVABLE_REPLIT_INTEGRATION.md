# AIGRC MCP Integration Guide: Lovable, Replit & Cloud Platforms

This guide provides step-by-step instructions for integrating the AIGRC MCP Server with cloud-based AI coding platforms like Lovable, Replit, Bolt, and similar services.

## Overview

Cloud platforms require the **HTTP transport** instead of stdio. AIGRC provides a StreamableHTTP server that:
- Runs on any port (default: 3000)
- Supports CORS for browser-based clients
- Provides session management for stateful interactions
- Includes optional OAuth authentication
- Supports rate limiting

## Part 1: Local Development Setup

### Step 1: Start the HTTP Server

```bash
cd /path/to/aigrc

# Build the package
pnpm run build

# Start the HTTP server
node packages/mcp/dist/bin/aigrc-mcp-http.js --port 3000
```

**Expected output:**
```
AIGRC MCP HTTP Server v3.0.0 started
Listening on http://0.0.0.0:3000
MCP endpoint: http://0.0.0.0:3000/mcp
Health check: http://0.0.0.0:3000/health
Auth: disabled
Mode: stateful
```

### Step 2: Verify Server is Running

```bash
# Check health endpoint
curl http://localhost:3000/health

# Expected response:
# {"status":"healthy","version":"3.0.0","transport":"streamable-http","sessions":0}

# Check server info
curl http://localhost:3000/

# Expected response:
# {"name":"aigrc-mcp","version":"3.0.0","protocol":"2024-11-05",...}
```

### Step 3: Test MCP Protocol

```bash
# Initialize a session
curl -X POST http://localhost:3000/mcp \
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

## Part 2: Lovable Integration

### Option A: Using a Tunnel (ngrok)

For local development with Lovable:

```bash
# Install ngrok
npm install -g ngrok

# Start AIGRC HTTP server
node packages/mcp/dist/bin/aigrc-mcp-http.js --port 3000

# In another terminal, create tunnel
ngrok http 3000
```

ngrok will provide a public URL like `https://abc123.ngrok.io`

### Option B: Deploy to Cloud

Deploy the AIGRC MCP server to a cloud platform:

**Dockerfile:**
```dockerfile
FROM node:20-slim

WORKDIR /app

# Copy built package
COPY packages/mcp/dist ./dist
COPY packages/mcp/package.json ./

# Install production dependencies
RUN npm install --production

# Expose port
EXPOSE 3000

# Start HTTP server
CMD ["node", "dist/bin/aigrc-mcp-http.js", "--port", "3000"]
```

### Lovable Configuration

In Lovable's MCP configuration (if supported), add:

```json
{
  "mcpServers": {
    "aigrc": {
      "transport": "http",
      "url": "https://your-deployed-server.com/mcp",
      "headers": {
        "Authorization": "Bearer YOUR_API_KEY"
      }
    }
  }
}
```

**Note:** Check Lovable's current documentation for MCP configuration syntax.

---

## Part 3: Replit Integration

### Step 1: Create Replit Project

1. Create a new Node.js Repl
2. Upload the built AIGRC MCP package or clone the repo
3. Install dependencies

### Step 2: Configure Replit

Create `.replit` configuration:

```toml
run = "node packages/mcp/dist/bin/aigrc-mcp-http.js --port 3000"

[env]
AIGRC_WORKSPACE = "."
AIGRC_PROFILES = "eu-ai-act"
AIGRC_LOG_LEVEL = "info"

[[ports]]
localPort = 3000
externalPort = 80
```

### Step 3: Start the Server

Click "Run" in Replit. The server will start and be accessible at your Replit URL.

### Step 4: Connect to Replit AI

If Replit supports custom MCP servers, configure:

```
MCP Server URL: https://your-repl.your-username.repl.co/mcp
```

---

## Part 4: Generic Cloud Deployment

### Docker Compose

```yaml
version: '3.8'

services:
  aigrc-mcp:
    build: .
    ports:
      - "3000:3000"
    environment:
      - AIGRC_WORKSPACE=/data
      - AIGRC_PROFILES=eu-ai-act,nist-rmf
      - AIGRC_LOG_LEVEL=info
      - AIGRC_HTTP_AUTH_ENABLED=true
      - AIGRC_HTTP_OAUTH_ISSUER=https://your-auth-provider.com
    volumes:
      - ./data:/data
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
```

### Kubernetes Deployment

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: aigrc-mcp
spec:
  replicas: 2
  selector:
    matchLabels:
      app: aigrc-mcp
  template:
    metadata:
      labels:
        app: aigrc-mcp
    spec:
      containers:
      - name: aigrc-mcp
        image: your-registry/aigrc-mcp:latest
        ports:
        - containerPort: 3000
        env:
        - name: AIGRC_WORKSPACE
          value: "/data"
        - name: AIGRC_PROFILES
          value: "eu-ai-act"
        - name: AIGRC_HTTP_AUTH_ENABLED
          value: "true"
        livenessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 10
          periodSeconds: 30
        resources:
          requests:
            memory: "256Mi"
            cpu: "100m"
          limits:
            memory: "512Mi"
            cpu: "500m"
---
apiVersion: v1
kind: Service
metadata:
  name: aigrc-mcp
spec:
  selector:
    app: aigrc-mcp
  ports:
  - port: 80
    targetPort: 3000
  type: LoadBalancer
```

---

## Part 5: Authentication Setup

### Enable OAuth Authentication

```bash
AIGRC_HTTP_AUTH_ENABLED=true \
AIGRC_HTTP_OAUTH_ISSUER=https://your-auth-provider.com \
AIGRC_HTTP_OAUTH_AUDIENCE=your-api-audience \
node packages/mcp/dist/bin/aigrc-mcp-http.js
```

### API Key Authentication

For simpler setups, use the `X-AIGRC-API-Key` header:

```bash
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -H "X-AIGRC-API-Key: your-secret-key" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}'
```

---

## Testing Checklist

### Connectivity Tests

```bash
# 1. Health check
curl http://YOUR_SERVER/health
# Expected: {"status":"healthy",...}

# 2. Server info
curl http://YOUR_SERVER/
# Expected: {"name":"aigrc-mcp","version":"3.0.0",...}

# 3. MCP Initialize
curl -X POST http://YOUR_SERVER/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test","version":"1.0"}}}'
# Expected: {"jsonrpc":"2.0","id":1,"result":{"serverInfo":{"name":"aigrc","version":"3.0.0"},...}}
```

### Tool Execution Tests

After initialization (save the `Mcp-Session-Id` header):

```bash
SESSION_ID="your-session-id-from-init-response"

# List tools
curl -X POST http://YOUR_SERVER/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -H "Mcp-Session-Id: $SESSION_ID" \
  -d '{"jsonrpc":"2.0","id":2,"method":"tools/list","params":{}}'

# Call a tool
curl -X POST http://YOUR_SERVER/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -H "Mcp-Session-Id: $SESSION_ID" \
  -d '{"jsonrpc":"2.0","id":3,"method":"tools/call","params":{"name":"get_blockers","arguments":{}}}'
```

### Session Management Tests

```bash
# List active sessions
curl http://YOUR_SERVER/sessions
# Expected: {"sessions":[...],"count":N}

# Delete a session
curl -X DELETE http://YOUR_SERVER/sessions/SESSION_ID
# Expected: {"status":"deleted","sessionId":"..."}
```

---

## API Endpoints Reference

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/` | GET | Server information and capabilities |
| `/health` | GET | Health check |
| `/mcp` | POST | MCP protocol endpoint |
| `/sessions` | GET | List active sessions |
| `/sessions/:id` | DELETE | Delete a session |

### Request Headers

| Header | Required | Description |
|--------|----------|-------------|
| `Content-Type` | Yes | `application/json` |
| `Accept` | Yes | `application/json, text/event-stream` |
| `Mcp-Session-Id` | After init | Session identifier |
| `Authorization` | If auth enabled | `Bearer <token>` |
| `X-AIGRC-API-Key` | Optional | API key authentication |
| `X-AIGRC-Tenant-ID` | Optional | Multi-tenant identifier |

---

## Environment Variables Reference

| Variable | Description | Default |
|----------|-------------|---------|
| `AIGRC_HTTP_PORT` | Server port | `3000` |
| `AIGRC_HTTP_HOST` | Bind address | `0.0.0.0` |
| `AIGRC_HTTP_AUTH_ENABLED` | Enable OAuth | `false` |
| `AIGRC_HTTP_OAUTH_ISSUER` | OAuth issuer URL | - |
| `AIGRC_HTTP_OAUTH_AUDIENCE` | OAuth audience | - |
| `AIGRC_HTTP_REQUESTS_PER_MINUTE` | Rate limit | `120` |
| `AIGRC_HTTP_TOOL_CALLS_PER_HOUR` | Tool call limit | `1000` |
| `AIGRC_HTTP_STATEFUL` | Enable sessions | `true` |
| `AIGRC_WORKSPACE` | Project directory | `.` |
| `AIGRC_PROFILES` | Compliance profiles | `eu-ai-act` |

---

## Troubleshooting

### CORS Errors

If you see CORS errors in the browser console:

1. Verify CORS is enabled (default: yes)
2. Check allowed origins in configuration
3. Ensure preflight OPTIONS requests are handled

### Session Not Found

If you get "Session not found" errors:

1. Ensure you're sending the `Mcp-Session-Id` header
2. Sessions expire after 30 minutes of inactivity
3. Use stateless mode (`--stateless`) if sessions are problematic

### Connection Refused

1. Check the server is running: `curl http://localhost:3000/health`
2. Verify firewall allows the port
3. Check the host binding (use `0.0.0.0` for all interfaces)

### Authentication Failures

1. Verify OAuth issuer URL is correct
2. Check token hasn't expired
3. Ensure audience matches configuration

---

## Security Considerations

### Production Deployment

1. **Always enable authentication** in production
2. **Use HTTPS** via a reverse proxy (nginx, Cloudflare, etc.)
3. **Set appropriate rate limits** to prevent abuse
4. **Use environment variables** for secrets, never hardcode
5. **Enable telemetry** for audit logging

### Example nginx Configuration

```nginx
server {
    listen 443 ssl http2;
    server_name aigrc.yourdomain.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # SSE support
        proxy_buffering off;
        proxy_cache off;
    }
}
```

---

## Next Steps

1. **Deploy to your cloud platform** of choice
2. **Configure authentication** for production
3. **Set up monitoring** with the telemetry endpoint
4. **Create asset cards** for your AI systems
5. **Integrate with CI/CD** using the GitHub Action

For more information, see the main [AIGRC Documentation](../README.md).
