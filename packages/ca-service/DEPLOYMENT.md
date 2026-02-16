# CGA Certificate Authority - Deployment Guide

This guide covers deploying the CGA Certificate Authority service to production.

## Overview

The CGA CA Service provides:
- Certificate signing for AI agent governance
- OCSP (Online Certificate Status Protocol) for real-time revocation checking
- Live verification of agent governance capabilities
- Auto-renewal of expiring certificates

## Prerequisites

- Node.js 18+ or Docker
- Secure key encryption password (from HSM or secure vault)
- Domain configured (e.g., cga.aigos.io)
- TLS certificate for HTTPS

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `CA_PORT` | HTTP port | `3000` |
| `CA_HOST` | Bind address | `0.0.0.0` |
| `CA_DB_PATH` | Database file path | `./data/cga-ca.db` |
| `CA_KEY_PASSWORD` | Key encryption password | (required in production) |
| `CA_ISSUER_ID` | CA issuer identifier | `cga.aigos.io` |
| `CA_ISSUER_NAME` | CA issuer display name | `AIGOS CGA Certificate Authority` |
| `CA_CORS_ORIGINS` | Allowed origins (comma-separated) | `*` |
| `CA_LOG_LEVEL` | Log level (debug/info/warn/error) | `info` |

## Deployment Options

### Option 1: Docker Compose (Recommended for simple deployments)

```bash
# Set production secrets
export CA_KEY_PASSWORD="your-secure-password-from-vault"
export CA_ISSUER_ID="cga.yourdomain.com"

# Start service
docker-compose up -d

# Check logs
docker-compose logs -f
```

### Option 2: Docker with External Database Volume

```bash
# Create data volume
docker volume create cga-ca-data

# Run container
docker run -d \
  --name cga-ca-service \
  -p 3000:3000 \
  -v cga-ca-data:/app/data \
  -e CA_KEY_PASSWORD="your-secure-password" \
  -e CA_ISSUER_ID="cga.yourdomain.com" \
  -e CA_ISSUER_NAME="Your CGA Certificate Authority" \
  aigrc/ca-service:latest
```

### Option 3: Kubernetes

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: cga-ca-service
  labels:
    app: cga-ca-service
spec:
  replicas: 2
  selector:
    matchLabels:
      app: cga-ca-service
  template:
    metadata:
      labels:
        app: cga-ca-service
    spec:
      containers:
        - name: ca-service
          image: aigrc/ca-service:latest
          ports:
            - containerPort: 3000
          env:
            - name: CA_KEY_PASSWORD
              valueFrom:
                secretKeyRef:
                  name: ca-secrets
                  key: key-password
            - name: CA_ISSUER_ID
              value: "cga.yourdomain.com"
            - name: CA_DB_PATH
              value: "/data/cga-ca.db"
          volumeMounts:
            - name: data
              mountPath: /data
          livenessProbe:
            httpGet:
              path: /api/v1/health
              port: 3000
            initialDelaySeconds: 5
            periodSeconds: 10
          readinessProbe:
            httpGet:
              path: /api/v1/health
              port: 3000
            initialDelaySeconds: 5
            periodSeconds: 5
      volumes:
        - name: data
          persistentVolumeClaim:
            claimName: cga-ca-data
---
apiVersion: v1
kind: Service
metadata:
  name: cga-ca-service
spec:
  selector:
    app: cga-ca-service
  ports:
    - port: 80
      targetPort: 3000
  type: ClusterIP
```

### Option 4: Node.js Direct

```bash
# Install dependencies
pnpm install

# Build
pnpm build

# Set environment
export CA_KEY_PASSWORD="your-secure-password"
export CA_ISSUER_ID="cga.yourdomain.com"
export NODE_ENV=production

# Start
node dist/bin/server.js
```

## TLS/HTTPS Configuration

In production, always use HTTPS. Options:

1. **Reverse Proxy (Recommended)**: Use nginx, Caddy, or cloud load balancer
2. **Cloud Provider**: Use AWS ALB, GCP Load Balancer, or Cloudflare
3. **Ingress Controller**: For Kubernetes deployments

### Example nginx configuration:

```nginx
server {
    listen 443 ssl http2;
    server_name cga.yourdomain.com;

    ssl_certificate /etc/ssl/certs/cga.crt;
    ssl_certificate_key /etc/ssl/private/cga.key;

    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

## Security Considerations

### Key Management

1. **Never store CA_KEY_PASSWORD in plaintext**
   - Use environment variables from secure vault (HashiCorp Vault, AWS Secrets Manager)
   - In Kubernetes, use Secrets with encryption at rest

2. **Backup the database file**
   - Contains CA signing keys (encrypted)
   - Contains certificate registry
   - Implement regular backup schedule

3. **Key Rotation**
   - Rotate CA signing key periodically
   - Use `/api/v1/keys/rotate` endpoint

### Network Security

1. **Firewall Rules**
   - Allow inbound traffic only on HTTPS (443)
   - Restrict admin endpoints to internal network

2. **Rate Limiting**
   - Configure rate limiting at load balancer
   - Recommended: 100 req/min for certificate operations

### Monitoring

1. **Health Checks**
   - `/api/v1/health` - Basic health check
   - `/api/v1/info` - Service information

2. **Metrics**
   - Monitor certificate signing rate
   - Monitor OCSP response times
   - Track revocation events

3. **Logging**
   - Structured JSON logs (pino)
   - Ship to centralized logging (ELK, Datadog)
   - Set appropriate log level in production

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/` | GET | Service info |
| `/api/v1/health` | GET | Health check |
| `/api/v1/info` | GET | Detailed service info |
| `/api/v1/certificates/sign` | POST | Sign a CGA certificate |
| `/api/v1/certificates/verify` | POST | Verify a certificate |
| `/api/v1/certificates/:id` | GET | Get certificate by ID |
| `/api/v1/certificates/:id/revoke` | POST | Revoke a certificate |
| `/api/v1/ocsp` | POST | OCSP request |
| `/api/v1/keys/public` | GET | Get CA public key |

## Troubleshooting

### Common Issues

1. **"No active CA signing key found"**
   - The server generates a key on first startup
   - Ensure CA_DB_PATH is writable

2. **Connection refused**
   - Check CA_PORT and CA_HOST settings
   - Verify firewall rules

3. **Certificate verification fails**
   - Ensure certificate was signed by this CA
   - Check certificate expiration

### Support

- GitHub Issues: https://github.com/aigrc/aigrc/issues
- Documentation: https://aigos.io/docs/cga
