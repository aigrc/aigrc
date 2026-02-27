# Module CP-02: Control Plane Deployment Guide

## Complete Infrastructure Setup for AIGOS Enterprise Dashboard

**Module ID:** CP-02
**Tier:** Control Plane
**Duration:** 8-10 hours
**Difficulty:** Advanced
**Prerequisites:** Modules P-01, P-02, C-01, C-03 completed; Docker/Kubernetes experience
**Last Updated:** 2026-02-16

---

## 1. Module Overview

### 1.1 Purpose & Business Value

The AIGOS Control Plane is the enterprise dashboard that provides:

- **Centralized Visibility** - Single view of all AI assets across the organization
- **Real-time Compliance** - Continuous monitoring of governance status
- **Executive Reporting** - Dashboard and reports for leadership
- **Policy Management** - Centralized policy distribution
- **Audit Evidence** - Immutable audit trails and export capabilities
- **CGA Certification** - Certificate Authority for Certified Governed Agents

**Why This Matters for Partners:**
- Control Plane deployment is a key customer deliverable
- Proper setup ensures customer success and retention
- Understanding architecture enables troubleshooting
- Partners must configure for customer environments

### 1.2 Learning Outcomes

By the end of this module, you will be able to:

1. Deploy the AIGOS Control Plane in multiple configurations
2. Configure authentication, networking, and storage
3. Integrate with customer identity providers
4. Set up monitoring and alerting
5. Perform upgrades and maintenance
6. Troubleshoot common deployment issues

---

## 2. Control Plane Architecture

### 2.1 System Overview

```
                    AIGOS CONTROL PLANE ARCHITECTURE
═══════════════════════════════════════════════════════════════════════════════

┌─────────────────────────────────────────────────────────────────────────────┐
│                              EXTERNAL ACCESS                                 │
│                                                                              │
│    Web Browser          CLI Clients          CI/CD Pipelines                │
│         │                    │                     │                        │
│         └────────────────────┼─────────────────────┘                        │
│                              │                                               │
│                              ▼                                               │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │                         LOAD BALANCER                                  │  │
│  │                    (nginx / cloud LB / ingress)                       │  │
│  │                           :443 (HTTPS)                                │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                              │                                               │
└──────────────────────────────┼───────────────────────────────────────────────┘
                               │
┌──────────────────────────────┼───────────────────────────────────────────────┐
│                              ▼                          CONTROL PLANE        │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │                         API GATEWAY                                    │  │
│  │              (Authentication, Rate Limiting, Routing)                 │  │
│  │                                                                        │  │
│  │  Endpoints:                                                           │  │
│  │    /api/v1/*        - REST API                                        │  │
│  │    /graphql         - GraphQL API                                     │  │
│  │    /ws              - WebSocket (real-time updates)                   │  │
│  │    /auth/*          - Authentication (OAuth, SAML)                    │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                              │                                               │
│         ┌────────────────────┼────────────────────┐                         │
│         │                    │                    │                         │
│         ▼                    ▼                    ▼                         │
│  ┌─────────────┐      ┌─────────────┐      ┌─────────────┐                 │
│  │   WEB UI    │      │  API SERVER │      │  CA SERVICE │                 │
│  │  (React)    │      │  (Node.js)  │      │ (Signing)   │                 │
│  │             │      │             │      │             │                 │
│  │  Dashboard  │      │  Business   │      │  CGA Certs  │                 │
│  │  Reports    │      │  Logic      │      │  OCSP       │                 │
│  │  Admin      │      │  Workflows  │      │  Signing    │                 │
│  └─────────────┘      └──────┬──────┘      └─────────────┘                 │
│                              │                                               │
│         ┌────────────────────┼────────────────────┐                         │
│         │                    │                    │                         │
│         ▼                    ▼                    ▼                         │
│  ┌─────────────┐      ┌─────────────┐      ┌─────────────┐                 │
│  │  POSTGRES   │      │    REDIS    │      │    MINIO    │                 │
│  │  (Primary)  │      │   (Cache)   │      │  (Storage)  │                 │
│  │             │      │             │      │             │                 │
│  │  Asset Data │      │  Sessions   │      │  Reports    │                 │
│  │  Audit Logs │      │  Cache      │      │  Evidence   │                 │
│  │  Users      │      │  Pub/Sub    │      │  Backups    │                 │
│  └─────────────┘      └─────────────┘      └─────────────┘                 │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘

COMMUNICATION FLOW
─────────────────────────────────────────────────────────────────────────────

  1. CLI/Browser → Load Balancer → API Gateway
  2. API Gateway authenticates request (JWT/Session)
  3. API Gateway routes to appropriate service
  4. Service processes request, interacts with data stores
  5. Response returns through same path
  6. WebSocket for real-time dashboard updates
```

### 2.2 Component Summary

| Component | Purpose | Technology | Port |
|-----------|---------|------------|------|
| **API Gateway** | Auth, routing, rate limiting | Express/Fastify | 3000 |
| **Web UI** | Dashboard interface | React/Next.js | 3001 |
| **API Server** | Business logic | Node.js | 3002 |
| **CA Service** | Certificate authority | Node.js | 3003 |
| **PostgreSQL** | Primary database | PostgreSQL 15+ | 5432 |
| **Redis** | Cache, sessions, pub/sub | Redis 7+ | 6379 |
| **MinIO** | Object storage | MinIO | 9000 |

### 2.3 Deployment Models

```
                        DEPLOYMENT MODELS
═══════════════════════════════════════════════════════════════════════════════

┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                              │
│  MODEL 1: DOCKER COMPOSE (Development/Small)                                │
│  ═════════════════════════════════════════════                              │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                     Single Docker Host                               │    │
│  │                                                                       │    │
│  │    ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐         │    │
│  │    │ API │ │ Web │ │ CA  │ │ PG  │ │Redis│ │MinIO│ │nginx│         │    │
│  │    └─────┘ └─────┘ └─────┘ └─────┘ └─────┘ └─────┘ └─────┘         │    │
│  │                                                                       │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                              │
│  Use Cases:                                                                 │
│    • Development/testing                                                    │
│    • POC deployments                                                        │
│    • Small organizations (<50 AI assets)                                    │
│                                                                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  MODEL 2: KUBERNETES (Production/Enterprise)                                │
│  ════════════════════════════════════════════                               │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                     Kubernetes Cluster                               │    │
│  │                                                                       │    │
│  │  ┌─────────────────────────────────────────────────────────────┐    │    │
│  │  │ Namespace: aigos-system                                      │    │    │
│  │  │                                                               │    │    │
│  │  │  Deployments:      StatefulSets:     Services:               │    │    │
│  │  │  ├─ api (3 pods)   ├─ postgres       ├─ api-svc             │    │    │
│  │  │  ├─ web (2 pods)   ├─ redis          ├─ web-svc             │    │    │
│  │  │  ├─ ca  (2 pods)   └─ minio          └─ ingress             │    │    │
│  │  │  └─ worker (3)                                                │    │    │
│  │  │                                                               │    │    │
│  │  │  ConfigMaps:       Secrets:          PVCs:                   │    │    │
│  │  │  ├─ aigos-config   ├─ db-creds       ├─ postgres-data       │    │    │
│  │  │  └─ nginx-config   ├─ ca-keys        ├─ redis-data          │    │    │
│  │  │                    └─ tls-certs      └─ minio-data          │    │    │
│  │  └─────────────────────────────────────────────────────────────┘    │    │
│  │                                                                       │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                              │
│  Use Cases:                                                                 │
│    • Production deployments                                                 │
│    • High availability requirements                                         │
│    • Large organizations (50+ AI assets)                                    │
│                                                                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  MODEL 3: CLOUD-MANAGED (AWS/Azure/GCP)                                     │
│  ═══════════════════════════════════════                                    │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                     Cloud Provider                                   │    │
│  │                                                                       │    │
│  │  Compute:           Managed Services:    Storage:                   │    │
│  │  ├─ EKS/AKS/GKE    ├─ RDS PostgreSQL    ├─ S3/Blob/GCS           │    │
│  │  │  (App pods)      ├─ ElastiCache      └─ EBS/Managed Disks      │    │
│  │  │                  └─ Cloud LB                                     │    │
│  │  │                                                                   │    │
│  │  Identity:          Monitoring:          Secrets:                   │    │
│  │  ├─ Cognito/        ├─ CloudWatch/       ├─ Secrets Manager/       │    │
│  │  │  Azure AD/       │  Azure Monitor/    │  Key Vault/             │    │
│  │  │  Cloud IAM       │  Cloud Monitoring  │  Secret Manager         │    │
│  │  │                  │                                               │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                              │
│  Use Cases:                                                                 │
│    • Enterprise production                                                  │
│    • Managed infrastructure preference                                      │
│    • Cloud-native organizations                                             │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Deployment Prerequisites

### 3.1 Hardware Requirements

| Deployment | CPU | Memory | Storage | Network |
|------------|-----|--------|---------|---------|
| **Development** | 4 cores | 8 GB | 50 GB SSD | 100 Mbps |
| **POC/Small** | 8 cores | 16 GB | 100 GB SSD | 1 Gbps |
| **Production** | 16+ cores | 32+ GB | 500+ GB SSD | 10 Gbps |
| **Enterprise** | 32+ cores | 64+ GB | 1+ TB SSD | 10+ Gbps |

### 3.2 Software Requirements

| Component | Minimum Version | Recommended |
|-----------|----------------|-------------|
| Docker | 24.0+ | 25.0+ |
| Docker Compose | 2.20+ | 2.24+ |
| Kubernetes | 1.27+ | 1.29+ |
| Helm | 3.12+ | 3.14+ |
| Node.js | 20 LTS | 20 LTS |
| PostgreSQL | 15+ | 16 |
| Redis | 7.0+ | 7.2+ |

### 3.3 Network Requirements

```
                         NETWORK REQUIREMENTS
═══════════════════════════════════════════════════════════════════════════════

INBOUND PORTS (External)
─────────────────────────────────────────────────────────────────────────────
  Port    Protocol   Source              Purpose
  ────    ────────   ──────              ───────
  443     HTTPS      Internet/VPN        Web UI & API access
  80      HTTP       Internet/VPN        Redirect to HTTPS

INTERNAL PORTS (Between services)
─────────────────────────────────────────────────────────────────────────────
  Port    Service         Purpose
  ────    ───────         ───────
  3000    API Gateway     Main API endpoint
  3001    Web UI          Static frontend
  3002    API Server      Business logic
  3003    CA Service      Certificate operations
  5432    PostgreSQL      Database
  6379    Redis           Cache/sessions
  9000    MinIO           Object storage
  9001    MinIO Console   Admin interface

OUTBOUND (From Control Plane)
─────────────────────────────────────────────────────────────────────────────
  Port    Protocol   Destination          Purpose
  ────    ────────   ───────────          ───────
  443     HTTPS      IDP (Okta/Azure AD)  Authentication
  443     HTTPS      SMTP Relay           Email notifications
  443     HTTPS      Monitoring           Telemetry (optional)
  443     HTTPS      Package registries   Updates (optional)

FIREWALL RULES EXAMPLE (iptables)
─────────────────────────────────────────────────────────────────────────────
  # Allow HTTPS
  -A INPUT -p tcp --dport 443 -j ACCEPT

  # Allow internal network
  -A INPUT -s 10.0.0.0/8 -j ACCEPT

  # Drop all other inbound
  -A INPUT -j DROP
```

### 3.4 DNS & TLS Requirements

```yaml
# Required DNS records
dns_records:
  - name: aigos.customer.com          # Main application
    type: A
    value: <load_balancer_ip>

  - name: api.aigos.customer.com      # API endpoint (optional)
    type: CNAME
    value: aigos.customer.com

  - name: ca.aigos.customer.com       # CA endpoint (optional)
    type: CNAME
    value: aigos.customer.com

# TLS Certificate requirements
tls:
  type: X.509
  key_size: 2048 (minimum) / 4096 (recommended)
  signature: SHA256 or SHA384
  validity: 1 year (recommended)
  san:
    - aigos.customer.com
    - api.aigos.customer.com
    - ca.aigos.customer.com

  # Options:
  # 1. Customer-provided certificate
  # 2. Let's Encrypt (automated)
  # 3. Self-signed (development only)
```

---

## 4. Docker Compose Deployment

### 4.1 Quick Start

```bash
# Step 1: Clone the AIGOS repository
git clone https://github.com/pangolabs/aigos-control-plane.git
cd aigos-control-plane

# Step 2: Copy environment template
cp .env.example .env

# Step 3: Edit environment variables
nano .env

# Step 4: Generate secrets
./scripts/generate-secrets.sh

# Step 5: Start the stack
docker compose up -d

# Step 6: Verify deployment
docker compose ps
docker compose logs -f

# Step 7: Initialize database
docker compose exec api npm run db:migrate
docker compose exec api npm run db:seed

# Step 8: Access the application
# Open https://localhost (or configured hostname)
# Default admin: admin@example.com / ChangeMe123!
```

### 4.2 Docker Compose Configuration

```yaml
# docker-compose.yml
version: '3.8'

services:
  # ═══════════════════════════════════════════════════════════════════════════
  # REVERSE PROXY / LOAD BALANCER
  # ═══════════════════════════════════════════════════════════════════════════
  nginx:
    image: nginx:1.25-alpine
    container_name: aigos-nginx
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
      - ./nginx/ssl:/etc/nginx/ssl:ro
    depends_on:
      - api
      - web
    networks:
      - aigos-network
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "nginx", "-t"]
      interval: 30s
      timeout: 10s
      retries: 3

  # ═══════════════════════════════════════════════════════════════════════════
  # WEB UI
  # ═══════════════════════════════════════════════════════════════════════════
  web:
    image: ghcr.io/pangolabs/aigos-web:${AIGOS_VERSION:-latest}
    container_name: aigos-web
    environment:
      - NEXT_PUBLIC_API_URL=${API_URL:-http://api:3000}
      - NEXT_PUBLIC_WS_URL=${WS_URL:-ws://api:3000}
    networks:
      - aigos-network
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3001/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  # ═══════════════════════════════════════════════════════════════════════════
  # API SERVER
  # ═══════════════════════════════════════════════════════════════════════════
  api:
    image: ghcr.io/pangolabs/aigos-api:${AIGOS_VERSION:-latest}
    container_name: aigos-api
    environment:
      # Database
      - DATABASE_URL=postgresql://${DB_USER}:${DB_PASSWORD}@postgres:5432/${DB_NAME}

      # Redis
      - REDIS_URL=redis://:${REDIS_PASSWORD}@redis:6379

      # Storage
      - S3_ENDPOINT=http://minio:9000
      - S3_ACCESS_KEY=${MINIO_ROOT_USER}
      - S3_SECRET_KEY=${MINIO_ROOT_PASSWORD}
      - S3_BUCKET=${S3_BUCKET:-aigos-data}

      # Authentication
      - JWT_SECRET=${JWT_SECRET}
      - SESSION_SECRET=${SESSION_SECRET}

      # OAuth (if configured)
      - OAUTH_ISSUER=${OAUTH_ISSUER:-}
      - OAUTH_CLIENT_ID=${OAUTH_CLIENT_ID:-}
      - OAUTH_CLIENT_SECRET=${OAUTH_CLIENT_SECRET:-}

      # Application
      - NODE_ENV=production
      - LOG_LEVEL=${LOG_LEVEL:-info}
      - CORS_ORIGINS=${CORS_ORIGINS:-https://localhost}

    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    networks:
      - aigos-network
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  # ═══════════════════════════════════════════════════════════════════════════
  # CA SERVICE
  # ═══════════════════════════════════════════════════════════════════════════
  ca:
    image: ghcr.io/pangolabs/aigos-ca:${AIGOS_VERSION:-latest}
    container_name: aigos-ca
    environment:
      # Database
      - DATABASE_URL=postgresql://${DB_USER}:${DB_PASSWORD}@postgres:5432/${DB_NAME}

      # Redis
      - REDIS_URL=redis://:${REDIS_PASSWORD}@redis:6379

      # CA Configuration
      - CA_ROOT_KEY_PATH=/secrets/ca-root.key
      - CA_ROOT_CERT_PATH=/secrets/ca-root.crt
      - CA_ISSUER_NAME=${CA_ISSUER_NAME:-AIGOS CA}

      # Signing
      - SIGNING_KEY_PATH=/secrets/signing.key

    volumes:
      - ./secrets/ca:/secrets:ro
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    networks:
      - aigos-network
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3003/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  # ═══════════════════════════════════════════════════════════════════════════
  # POSTGRESQL DATABASE
  # ═══════════════════════════════════════════════════════════════════════════
  postgres:
    image: postgres:16-alpine
    container_name: aigos-postgres
    environment:
      - POSTGRES_USER=${DB_USER}
      - POSTGRES_PASSWORD=${DB_PASSWORD}
      - POSTGRES_DB=${DB_NAME}
    volumes:
      - postgres-data:/var/lib/postgresql/data
      - ./postgres/init:/docker-entrypoint-initdb.d:ro
    networks:
      - aigos-network
    restart: unless-stopped
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${DB_USER} -d ${DB_NAME}"]
      interval: 10s
      timeout: 5s
      retries: 5

  # ═══════════════════════════════════════════════════════════════════════════
  # REDIS CACHE
  # ═══════════════════════════════════════════════════════════════════════════
  redis:
    image: redis:7-alpine
    container_name: aigos-redis
    command: redis-server --requirepass ${REDIS_PASSWORD}
    volumes:
      - redis-data:/data
    networks:
      - aigos-network
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "redis-cli", "-a", "${REDIS_PASSWORD}", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

  # ═══════════════════════════════════════════════════════════════════════════
  # MINIO OBJECT STORAGE
  # ═══════════════════════════════════════════════════════════════════════════
  minio:
    image: minio/minio:latest
    container_name: aigos-minio
    command: server /data --console-address ":9001"
    environment:
      - MINIO_ROOT_USER=${MINIO_ROOT_USER}
      - MINIO_ROOT_PASSWORD=${MINIO_ROOT_PASSWORD}
    volumes:
      - minio-data:/data
    ports:
      - "9001:9001"  # Console (optional, remove in production)
    networks:
      - aigos-network
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:9000/minio/health/live"]
      interval: 30s
      timeout: 10s
      retries: 3

# ═══════════════════════════════════════════════════════════════════════════
# NETWORKS
# ═══════════════════════════════════════════════════════════════════════════
networks:
  aigos-network:
    driver: bridge

# ═══════════════════════════════════════════════════════════════════════════
# VOLUMES
# ═══════════════════════════════════════════════════════════════════════════
volumes:
  postgres-data:
  redis-data:
  minio-data:
```

### 4.3 Environment Configuration

```bash
# .env - Environment Variables

# ═══════════════════════════════════════════════════════════════════════════
# APPLICATION
# ═══════════════════════════════════════════════════════════════════════════
AIGOS_VERSION=1.0.0
NODE_ENV=production
LOG_LEVEL=info

# Public URL (used for CORS, links, etc.)
PUBLIC_URL=https://aigos.customer.com
API_URL=https://aigos.customer.com/api
WS_URL=wss://aigos.customer.com/ws

# ═══════════════════════════════════════════════════════════════════════════
# DATABASE
# ═══════════════════════════════════════════════════════════════════════════
DB_HOST=postgres
DB_PORT=5432
DB_NAME=aigos
DB_USER=aigos
DB_PASSWORD=<GENERATE_STRONG_PASSWORD>

# ═══════════════════════════════════════════════════════════════════════════
# REDIS
# ═══════════════════════════════════════════════════════════════════════════
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=<GENERATE_STRONG_PASSWORD>

# ═══════════════════════════════════════════════════════════════════════════
# OBJECT STORAGE (MINIO)
# ═══════════════════════════════════════════════════════════════════════════
MINIO_ROOT_USER=aigos-admin
MINIO_ROOT_PASSWORD=<GENERATE_STRONG_PASSWORD>
S3_BUCKET=aigos-data

# ═══════════════════════════════════════════════════════════════════════════
# AUTHENTICATION
# ═══════════════════════════════════════════════════════════════════════════
# JWT signing secret (256-bit minimum)
JWT_SECRET=<GENERATE_256_BIT_SECRET>

# Session secret
SESSION_SECRET=<GENERATE_256_BIT_SECRET>

# Session settings
SESSION_MAX_AGE=86400000  # 24 hours in milliseconds

# ═══════════════════════════════════════════════════════════════════════════
# OAUTH/OIDC (Optional - for SSO)
# ═══════════════════════════════════════════════════════════════════════════
# Uncomment and configure for SSO integration
# OAUTH_ENABLED=true
# OAUTH_ISSUER=https://login.microsoftonline.com/{tenant}/v2.0
# OAUTH_CLIENT_ID=<client_id>
# OAUTH_CLIENT_SECRET=<client_secret>
# OAUTH_CALLBACK_URL=https://aigos.customer.com/auth/callback

# ═══════════════════════════════════════════════════════════════════════════
# CA SERVICE
# ═══════════════════════════════════════════════════════════════════════════
CA_ISSUER_NAME=AIGOS CA
CA_VALIDITY_DAYS=365

# ═══════════════════════════════════════════════════════════════════════════
# CORS
# ═══════════════════════════════════════════════════════════════════════════
CORS_ORIGINS=https://aigos.customer.com

# ═══════════════════════════════════════════════════════════════════════════
# EMAIL (Optional)
# ═══════════════════════════════════════════════════════════════════════════
# SMTP_HOST=smtp.example.com
# SMTP_PORT=587
# SMTP_USER=notifications@customer.com
# SMTP_PASSWORD=<smtp_password>
# SMTP_FROM=AIGOS <noreply@customer.com>
```

### 4.4 Secret Generation Script

```bash
#!/bin/bash
# scripts/generate-secrets.sh

set -e

echo "Generating AIGOS secrets..."

# Create secrets directory
mkdir -p ./secrets/ca

# Generate database password
DB_PASSWORD=$(openssl rand -base64 32 | tr -dc 'a-zA-Z0-9' | head -c 32)
echo "DB_PASSWORD=$DB_PASSWORD" >> .env.secrets

# Generate Redis password
REDIS_PASSWORD=$(openssl rand -base64 32 | tr -dc 'a-zA-Z0-9' | head -c 32)
echo "REDIS_PASSWORD=$REDIS_PASSWORD" >> .env.secrets

# Generate MinIO password
MINIO_ROOT_PASSWORD=$(openssl rand -base64 32 | tr -dc 'a-zA-Z0-9' | head -c 32)
echo "MINIO_ROOT_PASSWORD=$MINIO_ROOT_PASSWORD" >> .env.secrets

# Generate JWT secret
JWT_SECRET=$(openssl rand -base64 64 | tr -d '\n')
echo "JWT_SECRET=$JWT_SECRET" >> .env.secrets

# Generate session secret
SESSION_SECRET=$(openssl rand -base64 64 | tr -d '\n')
echo "SESSION_SECRET=$SESSION_SECRET" >> .env.secrets

# Generate CA root key and certificate
openssl genrsa -out ./secrets/ca/ca-root.key 4096
openssl req -new -x509 -days 3650 \
  -key ./secrets/ca/ca-root.key \
  -out ./secrets/ca/ca-root.crt \
  -subj "/C=US/ST=State/L=City/O=Customer/OU=AI Governance/CN=AIGOS Root CA"

# Generate signing key (for JWTs)
openssl ecparam -name prime256v1 -genkey -noout -out ./secrets/ca/signing.key

# Set permissions
chmod 600 ./secrets/ca/*.key
chmod 644 ./secrets/ca/*.crt

echo ""
echo "Secrets generated successfully!"
echo ""
echo "IMPORTANT: Add the contents of .env.secrets to your .env file"
echo "Then delete .env.secrets: rm .env.secrets"
echo ""
echo "CA certificates stored in ./secrets/ca/"
```

### 4.5 NGINX Configuration

```nginx
# nginx/nginx.conf

worker_processes auto;
error_log /var/log/nginx/error.log warn;
pid /var/run/nginx.pid;

events {
    worker_connections 1024;
    use epoll;
    multi_accept on;
}

http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;

    # Logging
    log_format main '$remote_addr - $remote_user [$time_local] "$request" '
                    '$status $body_bytes_sent "$http_referer" '
                    '"$http_user_agent" "$http_x_forwarded_for"';
    access_log /var/log/nginx/access.log main;

    # Performance
    sendfile on;
    tcp_nopush on;
    tcp_nodelay on;
    keepalive_timeout 65;
    types_hash_max_size 2048;

    # Gzip
    gzip on;
    gzip_vary on;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types text/plain text/css text/xml application/json application/javascript
               application/xml application/xml+rss text/javascript;

    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api:10m rate=100r/s;
    limit_req_zone $binary_remote_addr zone=auth:10m rate=10r/s;

    # Upstream definitions
    upstream api_backend {
        server api:3000;
        keepalive 32;
    }

    upstream web_backend {
        server web:3001;
        keepalive 16;
    }

    upstream ca_backend {
        server ca:3003;
        keepalive 8;
    }

    # HTTP -> HTTPS redirect
    server {
        listen 80;
        server_name _;
        return 301 https://$host$request_uri;
    }

    # Main HTTPS server
    server {
        listen 443 ssl http2;
        server_name aigos.customer.com;

        # SSL Configuration
        ssl_certificate /etc/nginx/ssl/tls.crt;
        ssl_certificate_key /etc/nginx/ssl/tls.key;
        ssl_session_timeout 1d;
        ssl_session_cache shared:SSL:50m;
        ssl_session_tickets off;

        # Modern SSL configuration
        ssl_protocols TLSv1.2 TLSv1.3;
        ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384;
        ssl_prefer_server_ciphers off;

        # HSTS
        add_header Strict-Transport-Security "max-age=63072000" always;

        # Security headers
        add_header X-Frame-Options "SAMEORIGIN" always;
        add_header X-Content-Type-Options "nosniff" always;
        add_header X-XSS-Protection "1; mode=block" always;
        add_header Referrer-Policy "strict-origin-when-cross-origin" always;

        # API routes
        location /api/ {
            limit_req zone=api burst=50 nodelay;

            proxy_pass http://api_backend/;
            proxy_http_version 1.1;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_set_header Connection "";
            proxy_connect_timeout 60s;
            proxy_send_timeout 60s;
            proxy_read_timeout 60s;
        }

        # WebSocket
        location /ws {
            proxy_pass http://api_backend/ws;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection "upgrade";
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_read_timeout 3600s;
        }

        # Auth routes (stricter rate limiting)
        location /auth/ {
            limit_req zone=auth burst=5 nodelay;

            proxy_pass http://api_backend/auth/;
            proxy_http_version 1.1;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }

        # CA routes
        location /ca/ {
            proxy_pass http://ca_backend/;
            proxy_http_version 1.1;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }

        # GraphQL (part of API)
        location /graphql {
            limit_req zone=api burst=20 nodelay;

            proxy_pass http://api_backend/graphql;
            proxy_http_version 1.1;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }

        # Health check endpoint (no auth)
        location /health {
            proxy_pass http://api_backend/health;
            proxy_http_version 1.1;
        }

        # Static files (Web UI)
        location / {
            proxy_pass http://web_backend;
            proxy_http_version 1.1;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;

            # Cache static assets
            location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
                proxy_pass http://web_backend;
                proxy_cache_valid 200 1d;
                add_header Cache-Control "public, max-age=86400";
            }
        }
    }
}
```

---

## 5. Kubernetes Deployment

### 5.1 Helm Chart Installation

```bash
# Add AIGOS Helm repository
helm repo add aigos https://charts.aigos.io
helm repo update

# Create namespace
kubectl create namespace aigos-system

# Create secrets
kubectl create secret generic aigos-secrets \
  --namespace aigos-system \
  --from-literal=db-password=$(openssl rand -base64 32) \
  --from-literal=redis-password=$(openssl rand -base64 32) \
  --from-literal=jwt-secret=$(openssl rand -base64 64) \
  --from-literal=session-secret=$(openssl rand -base64 64)

# Create CA secrets
kubectl create secret generic aigos-ca-secrets \
  --namespace aigos-system \
  --from-file=ca-root.key=./secrets/ca/ca-root.key \
  --from-file=ca-root.crt=./secrets/ca/ca-root.crt \
  --from-file=signing.key=./secrets/ca/signing.key

# Install AIGOS
helm install aigos aigos/aigos-control-plane \
  --namespace aigos-system \
  --values values.yaml
```

### 5.2 Helm Values Configuration

```yaml
# values.yaml

# ═══════════════════════════════════════════════════════════════════════════
# GLOBAL
# ═══════════════════════════════════════════════════════════════════════════
global:
  imageRegistry: ghcr.io/pangolabs
  imagePullSecrets: []
  storageClass: ""  # Use cluster default

# ═══════════════════════════════════════════════════════════════════════════
# API SERVER
# ═══════════════════════════════════════════════════════════════════════════
api:
  replicaCount: 3

  image:
    repository: aigos-api
    tag: "1.0.0"
    pullPolicy: IfNotPresent

  resources:
    requests:
      cpu: 500m
      memory: 512Mi
    limits:
      cpu: 2000m
      memory: 2Gi

  autoscaling:
    enabled: true
    minReplicas: 3
    maxReplicas: 10
    targetCPUUtilizationPercentage: 70
    targetMemoryUtilizationPercentage: 80

  podDisruptionBudget:
    enabled: true
    minAvailable: 2

  env:
    LOG_LEVEL: info
    NODE_ENV: production

  # Reference to secrets
  envFrom:
    - secretRef:
        name: aigos-secrets

# ═══════════════════════════════════════════════════════════════════════════
# WEB UI
# ═══════════════════════════════════════════════════════════════════════════
web:
  replicaCount: 2

  image:
    repository: aigos-web
    tag: "1.0.0"
    pullPolicy: IfNotPresent

  resources:
    requests:
      cpu: 100m
      memory: 128Mi
    limits:
      cpu: 500m
      memory: 512Mi

  autoscaling:
    enabled: true
    minReplicas: 2
    maxReplicas: 5
    targetCPUUtilizationPercentage: 80

# ═══════════════════════════════════════════════════════════════════════════
# CA SERVICE
# ═══════════════════════════════════════════════════════════════════════════
ca:
  replicaCount: 2

  image:
    repository: aigos-ca
    tag: "1.0.0"
    pullPolicy: IfNotPresent

  resources:
    requests:
      cpu: 250m
      memory: 256Mi
    limits:
      cpu: 1000m
      memory: 1Gi

  # Mount CA secrets
  volumeMounts:
    - name: ca-secrets
      mountPath: /secrets
      readOnly: true

  volumes:
    - name: ca-secrets
      secret:
        secretName: aigos-ca-secrets

# ═══════════════════════════════════════════════════════════════════════════
# POSTGRESQL
# ═══════════════════════════════════════════════════════════════════════════
postgresql:
  # Set to false if using external database (RDS, Cloud SQL, etc.)
  enabled: true

  auth:
    existingSecret: aigos-secrets
    secretKeys:
      adminPasswordKey: db-password
    database: aigos

  primary:
    persistence:
      enabled: true
      size: 100Gi

    resources:
      requests:
        cpu: 500m
        memory: 1Gi
      limits:
        cpu: 2000m
        memory: 4Gi

  # High availability
  architecture: replication
  readReplicas:
    replicaCount: 2

# External database (if postgresql.enabled: false)
externalDatabase:
  host: ""
  port: 5432
  database: aigos
  existingSecret: aigos-secrets
  existingSecretPasswordKey: db-password

# ═══════════════════════════════════════════════════════════════════════════
# REDIS
# ═══════════════════════════════════════════════════════════════════════════
redis:
  # Set to false if using external Redis (ElastiCache, etc.)
  enabled: true

  auth:
    existingSecret: aigos-secrets
    existingSecretPasswordKey: redis-password

  master:
    persistence:
      enabled: true
      size: 10Gi

    resources:
      requests:
        cpu: 250m
        memory: 256Mi
      limits:
        cpu: 1000m
        memory: 1Gi

  # High availability
  architecture: replication
  replica:
    replicaCount: 2

# ═══════════════════════════════════════════════════════════════════════════
# MINIO (Object Storage)
# ═══════════════════════════════════════════════════════════════════════════
minio:
  # Set to false if using S3, Azure Blob, GCS
  enabled: true

  mode: distributed
  replicas: 4

  persistence:
    enabled: true
    size: 100Gi

  resources:
    requests:
      cpu: 250m
      memory: 512Mi
    limits:
      cpu: 1000m
      memory: 2Gi

# External storage (if minio.enabled: false)
externalStorage:
  type: s3  # s3, azure, gcs
  bucket: aigos-data
  region: us-east-1
  endpoint: ""  # Leave empty for AWS S3
  existingSecret: aigos-storage-secrets

# ═══════════════════════════════════════════════════════════════════════════
# INGRESS
# ═══════════════════════════════════════════════════════════════════════════
ingress:
  enabled: true
  className: nginx  # or: alb, traefik, etc.

  annotations:
    nginx.ingress.kubernetes.io/proxy-body-size: "50m"
    nginx.ingress.kubernetes.io/proxy-read-timeout: "3600"
    nginx.ingress.kubernetes.io/proxy-send-timeout: "3600"
    cert-manager.io/cluster-issuer: letsencrypt-prod

  hosts:
    - host: aigos.customer.com
      paths:
        - path: /
          pathType: Prefix

  tls:
    - secretName: aigos-tls
      hosts:
        - aigos.customer.com

# ═══════════════════════════════════════════════════════════════════════════
# AUTHENTICATION
# ═══════════════════════════════════════════════════════════════════════════
auth:
  # Local authentication (username/password)
  local:
    enabled: true

  # OAuth/OIDC
  oauth:
    enabled: false
    # Uncomment and configure for SSO
    # provider: azure  # azure, okta, google, generic
    # issuer: https://login.microsoftonline.com/{tenant}/v2.0
    # clientId: ""
    # existingSecret: aigos-oauth-secrets
    # existingSecretClientIdKey: client-id
    # existingSecretClientSecretKey: client-secret

  # SAML
  saml:
    enabled: false

# ═══════════════════════════════════════════════════════════════════════════
# MONITORING
# ═══════════════════════════════════════════════════════════════════════════
monitoring:
  # ServiceMonitor for Prometheus
  serviceMonitor:
    enabled: true
    namespace: monitoring
    interval: 30s

  # Grafana dashboards
  grafanaDashboards:
    enabled: true
    namespace: monitoring

# ═══════════════════════════════════════════════════════════════════════════
# BACKUP
# ═══════════════════════════════════════════════════════════════════════════
backup:
  enabled: true
  schedule: "0 2 * * *"  # Daily at 2 AM
  retention: 30  # days

  storage:
    type: s3
    bucket: aigos-backups
    region: us-east-1
    existingSecret: aigos-backup-secrets
```

### 5.3 Kubernetes Manifests (Alternative to Helm)

```yaml
# namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: aigos-system
  labels:
    app.kubernetes.io/name: aigos
    app.kubernetes.io/component: system

---
# configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: aigos-config
  namespace: aigos-system
data:
  NODE_ENV: production
  LOG_LEVEL: info
  PUBLIC_URL: https://aigos.customer.com

---
# deployment-api.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: aigos-api
  namespace: aigos-system
  labels:
    app.kubernetes.io/name: aigos
    app.kubernetes.io/component: api
spec:
  replicas: 3
  selector:
    matchLabels:
      app.kubernetes.io/name: aigos
      app.kubernetes.io/component: api
  template:
    metadata:
      labels:
        app.kubernetes.io/name: aigos
        app.kubernetes.io/component: api
    spec:
      containers:
        - name: api
          image: ghcr.io/pangolabs/aigos-api:1.0.0
          ports:
            - containerPort: 3000
              name: http
          envFrom:
            - configMapRef:
                name: aigos-config
            - secretRef:
                name: aigos-secrets
          resources:
            requests:
              cpu: 500m
              memory: 512Mi
            limits:
              cpu: 2000m
              memory: 2Gi
          livenessProbe:
            httpGet:
              path: /health
              port: 3000
            initialDelaySeconds: 30
            periodSeconds: 10
          readinessProbe:
            httpGet:
              path: /health/ready
              port: 3000
            initialDelaySeconds: 5
            periodSeconds: 5
      affinity:
        podAntiAffinity:
          preferredDuringSchedulingIgnoredDuringExecution:
            - weight: 100
              podAffinityTerm:
                labelSelector:
                  matchLabels:
                    app.kubernetes.io/component: api
                topologyKey: kubernetes.io/hostname

---
# service-api.yaml
apiVersion: v1
kind: Service
metadata:
  name: aigos-api
  namespace: aigos-system
spec:
  type: ClusterIP
  selector:
    app.kubernetes.io/name: aigos
    app.kubernetes.io/component: api
  ports:
    - port: 3000
      targetPort: 3000
      name: http

---
# hpa-api.yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: aigos-api
  namespace: aigos-system
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: aigos-api
  minReplicas: 3
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

---
# pdb-api.yaml
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: aigos-api
  namespace: aigos-system
spec:
  minAvailable: 2
  selector:
    matchLabels:
      app.kubernetes.io/component: api
```

---

## 6. Identity Provider Integration

### 6.1 Azure AD (Entra ID)

```yaml
# Azure AD Configuration
auth:
  oauth:
    enabled: true
    provider: azure

    # Azure AD tenant
    issuer: https://login.microsoftonline.com/{tenant-id}/v2.0

    # App registration
    clientId: <from-azure-portal>
    clientSecret: <from-azure-portal>

    # Callback URL (must be registered in Azure)
    callbackUrl: https://aigos.customer.com/auth/callback

    # Scopes
    scopes:
      - openid
      - profile
      - email
      - offline_access

    # Attribute mapping
    attributeMapping:
      id: oid
      email: email
      name: name
      groups: groups  # Requires Group Claims in Azure

    # Group-to-role mapping
    roleMapping:
      # Azure AD Group ID -> AIGOS Role
      "12345678-1234-1234-1234-123456789012": admin
      "87654321-4321-4321-4321-210987654321": editor
      # Default role for authenticated users
      default: viewer
```

**Azure Portal Setup:**

1. Go to Azure Portal > Azure Active Directory > App Registrations
2. Click "New registration"
3. Configure:
   - Name: `AIGOS Control Plane`
   - Supported account types: `Accounts in this organizational directory only`
   - Redirect URI: `Web` - `https://aigos.customer.com/auth/callback`
4. Note the Application (client) ID
5. Go to Certificates & secrets > New client secret
6. Note the secret value
7. Go to API permissions > Add permission > Microsoft Graph > Delegated:
   - `openid`, `profile`, `email`, `offline_access`
8. (Optional) For group claims: Token configuration > Add groups claim

### 6.2 Okta

```yaml
# Okta Configuration
auth:
  oauth:
    enabled: true
    provider: okta

    # Okta domain
    issuer: https://customer.okta.com/oauth2/default

    # Application credentials
    clientId: <from-okta>
    clientSecret: <from-okta>

    # Callback
    callbackUrl: https://aigos.customer.com/auth/callback

    # Scopes
    scopes:
      - openid
      - profile
      - email
      - groups

    # Attribute mapping
    attributeMapping:
      id: sub
      email: email
      name: name
      groups: groups

    # Role mapping
    roleMapping:
      "AIGOS-Admins": admin
      "AIGOS-Editors": editor
      default: viewer
```

**Okta Setup:**

1. Go to Okta Admin Console > Applications > Create App Integration
2. Select `OIDC - OpenID Connect` and `Web Application`
3. Configure:
   - App name: `AIGOS Control Plane`
   - Sign-in redirect URIs: `https://aigos.customer.com/auth/callback`
   - Sign-out redirect URIs: `https://aigos.customer.com`
   - Assignments: Select appropriate groups
4. Note Client ID and Client Secret
5. Go to Security > API > Authorization Servers > default
6. Note the Issuer URI

### 6.3 Google Workspace

```yaml
# Google Workspace Configuration
auth:
  oauth:
    enabled: true
    provider: google

    # Google OAuth
    issuer: https://accounts.google.com

    # OAuth credentials
    clientId: <from-google-console>
    clientSecret: <from-google-console>

    # Callback
    callbackUrl: https://aigos.customer.com/auth/callback

    # Scopes
    scopes:
      - openid
      - profile
      - email

    # Domain restriction (optional)
    hostedDomain: customer.com

    # Attribute mapping
    attributeMapping:
      id: sub
      email: email
      name: name
```

### 6.4 SAML 2.0 (Generic)

```yaml
# SAML Configuration
auth:
  saml:
    enabled: true

    # Identity Provider
    entryPoint: https://idp.customer.com/saml2/sso
    issuer: https://aigos.customer.com
    cert: |
      -----BEGIN CERTIFICATE-----
      ... IDP certificate ...
      -----END CERTIFICATE-----

    # Service Provider
    callbackUrl: https://aigos.customer.com/auth/saml/callback
    logoutUrl: https://aigos.customer.com/auth/saml/logout

    # Attribute mapping
    attributeMapping:
      id: urn:oid:0.9.2342.19200300.100.1.1
      email: urn:oid:0.9.2342.19200300.100.1.3
      name: urn:oid:2.5.4.3
      groups: urn:oid:1.3.6.1.4.1.5923.1.5.1.1

    # Role mapping
    roleMapping:
      "cn=aigos-admins,ou=groups,dc=customer,dc=com": admin
      "cn=aigos-users,ou=groups,dc=customer,dc=com": viewer
      default: viewer
```

---

## 7. Post-Deployment Configuration

### 7.1 Initial Setup Checklist

```
                    POST-DEPLOYMENT CHECKLIST
═══════════════════════════════════════════════════════════════════════════════

□ VERIFICATION
  □ All services running (docker compose ps / kubectl get pods)
  □ Health endpoints responding (/health returns 200)
  □ Web UI accessible via browser
  □ Login working (local or SSO)

□ SECURITY
  □ TLS certificate valid and trusted
  □ Admin password changed from default
  □ API keys rotated from setup values
  □ Network policies applied (if Kubernetes)
  □ Secrets stored securely (not in git)

□ DATA
  □ Database initialized (migrations run)
  □ Initial admin user created
  □ Organization/tenant configured
  □ Default policies loaded

□ INTEGRATION
  □ SSO working (if configured)
  □ Email notifications working (if configured)
  □ CLI can connect (aigrc --endpoint https://aigos.customer.com)

□ MONITORING
  □ Metrics being collected
  □ Logs aggregated
  □ Alerts configured
  □ Backup jobs scheduled

□ DOCUMENTATION
  □ Access credentials documented (secure location)
  □ Runbook created
  □ Escalation contacts defined
```

### 7.2 Creating Admin User

```bash
# Docker Compose
docker compose exec api npm run cli -- user create \
  --email admin@customer.com \
  --name "Admin User" \
  --role admin \
  --password '<STRONG_PASSWORD>'

# Kubernetes
kubectl exec -it deployment/aigos-api -n aigos-system -- \
  npm run cli -- user create \
  --email admin@customer.com \
  --name "Admin User" \
  --role admin \
  --password '<STRONG_PASSWORD>'
```

### 7.3 Configuring Organization

```bash
# Create organization
docker compose exec api npm run cli -- org create \
  --name "Customer Corp" \
  --slug customer-corp \
  --plan enterprise

# Add domains (for SSO auto-assignment)
docker compose exec api npm run cli -- org add-domain \
  --org customer-corp \
  --domain customer.com \
  --verified true
```

### 7.4 Loading Default Policies

```bash
# Import built-in policies
docker compose exec api npm run cli -- policy import \
  --source built-in \
  --policies eu-ai-act,nist-ai-rmf,iso-42001

# Import custom policies
docker compose exec api npm run cli -- policy import \
  --file /path/to/custom-policies.yaml
```

### 7.5 Connecting CLI Clients

```bash
# On client machines, configure CLI
aigrc config set endpoint https://aigos.customer.com

# Authenticate
aigrc auth login

# This opens browser for OAuth, or prompts for API key

# Verify connection
aigrc status

# Expected output:
# Control Plane: https://aigos.customer.com
# Status: Connected
# Organization: Customer Corp
# User: admin@customer.com
# Role: admin
```

---

## 8. Operations & Maintenance

### 8.1 Monitoring

```yaml
# Prometheus ServiceMonitor
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: aigos
  namespace: monitoring
spec:
  selector:
    matchLabels:
      app.kubernetes.io/name: aigos
  endpoints:
    - port: http
      path: /metrics
      interval: 30s
  namespaceSelector:
    matchNames:
      - aigos-system
```

**Key Metrics:**

| Metric | Description | Alert Threshold |
|--------|-------------|-----------------|
| `aigos_api_request_duration_seconds` | Request latency | p99 > 2s |
| `aigos_api_requests_total` | Request count | Rate spike |
| `aigos_db_connections_active` | DB connections | > 80% pool |
| `aigos_asset_cards_total` | Total Asset Cards | N/A (tracking) |
| `aigos_compliance_score` | Avg compliance | < 70% |

### 8.2 Logging

```yaml
# Fluent Bit configuration for log aggregation
[INPUT]
    Name              tail
    Tag               aigos.*
    Path              /var/log/containers/aigos-*.log
    Parser            docker
    Refresh_Interval  5

[FILTER]
    Name              kubernetes
    Match             aigos.*
    Kube_URL          https://kubernetes.default.svc:443
    Merge_Log         On

[OUTPUT]
    Name              elasticsearch
    Match             aigos.*
    Host              elasticsearch
    Port              9200
    Index             aigos-logs
```

### 8.3 Backup & Recovery

```bash
#!/bin/bash
# backup.sh - Daily backup script

DATE=$(date +%Y%m%d)
BACKUP_DIR=/backups/$DATE

mkdir -p $BACKUP_DIR

# Backup PostgreSQL
docker compose exec -T postgres pg_dump -U aigos aigos | gzip > $BACKUP_DIR/postgres.sql.gz

# Backup MinIO data
docker compose exec -T minio mc mirror /data $BACKUP_DIR/minio/

# Backup configuration
cp -r ./config $BACKUP_DIR/
cp .env $BACKUP_DIR/env.backup

# Upload to S3 (optional)
aws s3 sync $BACKUP_DIR s3://customer-backups/aigos/$DATE/

# Cleanup old backups (keep 30 days)
find /backups -maxdepth 1 -type d -mtime +30 -exec rm -rf {} \;

echo "Backup completed: $BACKUP_DIR"
```

```bash
#!/bin/bash
# restore.sh - Restore from backup

BACKUP_DATE=$1

if [ -z "$BACKUP_DATE" ]; then
  echo "Usage: restore.sh YYYYMMDD"
  exit 1
fi

BACKUP_DIR=/backups/$BACKUP_DATE

# Stop services
docker compose stop api web ca

# Restore PostgreSQL
docker compose exec -T postgres psql -U aigos -c "DROP DATABASE IF EXISTS aigos_restore;"
docker compose exec -T postgres psql -U aigos -c "CREATE DATABASE aigos_restore;"
gunzip -c $BACKUP_DIR/postgres.sql.gz | docker compose exec -T postgres psql -U aigos aigos_restore

# Verify restore before switching
echo "Verify restored database, then run:"
echo "  docker compose exec postgres psql -U aigos -c 'ALTER DATABASE aigos RENAME TO aigos_old;'"
echo "  docker compose exec postgres psql -U aigos -c 'ALTER DATABASE aigos_restore RENAME TO aigos;'"

# Restart services
docker compose start api web ca
```

### 8.4 Upgrades

```bash
#!/bin/bash
# upgrade.sh - Rolling upgrade

NEW_VERSION=$1

if [ -z "$NEW_VERSION" ]; then
  echo "Usage: upgrade.sh VERSION"
  exit 1
fi

echo "Upgrading AIGOS to version $NEW_VERSION"

# Pull new images
docker compose pull

# Update version in .env
sed -i "s/AIGOS_VERSION=.*/AIGOS_VERSION=$NEW_VERSION/" .env

# Rolling restart (one service at a time)
docker compose up -d --no-deps api
sleep 30
docker compose up -d --no-deps web
sleep 10
docker compose up -d --no-deps ca

# Run migrations
docker compose exec api npm run db:migrate

# Verify
docker compose exec api npm run healthcheck

echo "Upgrade complete!"
```

---

## 9. Troubleshooting

### 9.1 Common Issues

| Issue | Symptoms | Solution |
|-------|----------|----------|
| **Database connection failed** | API won't start, connection errors | Check DB_PASSWORD, verify PostgreSQL is running |
| **Redis connection failed** | Session errors, cache misses | Check REDIS_PASSWORD, verify Redis is running |
| **TLS certificate invalid** | Browser security warning | Verify certificate path, check expiration |
| **OAuth callback error** | Login fails with redirect error | Verify callback URL matches IDP config |
| **API 502 Bad Gateway** | Nginx returns 502 | Check API service health, logs |
| **Slow dashboard** | Pages take >5s to load | Check Redis cache, database queries |

### 9.2 Diagnostic Commands

```bash
# Service health
docker compose ps
docker compose logs api --tail 100

# Database connectivity
docker compose exec postgres psql -U aigos -c "SELECT 1"

# Redis connectivity
docker compose exec redis redis-cli -a $REDIS_PASSWORD ping

# API health
curl -s https://aigos.customer.com/health | jq

# Check disk space
docker system df

# Check memory
docker stats --no-stream

# Network debugging
docker compose exec api curl -v http://postgres:5432
```

### 9.3 Log Analysis

```bash
# Find errors in last hour
docker compose logs --since 1h 2>&1 | grep -i error

# Watch real-time logs
docker compose logs -f api

# Export logs for support
docker compose logs > aigos-logs-$(date +%Y%m%d).txt

# Kubernetes pod logs
kubectl logs -l app.kubernetes.io/name=aigos -n aigos-system --tail=100
```

---

## 10. Hands-On Exercises

### Exercise CP-02.1: Docker Compose Deployment

**Objective:** Deploy AIGOS Control Plane using Docker Compose.

**Time:** 60 minutes

**Steps:**

1. Clone repository and configure environment
2. Generate secrets
3. Start the stack
4. Verify all services healthy
5. Create admin user
6. Access dashboard and explore

**Success Criteria:**
- [ ] All containers running
- [ ] Dashboard accessible via HTTPS
- [ ] Can log in as admin
- [ ] CLI can connect

### Exercise CP-02.2: SSO Configuration

**Objective:** Configure OAuth/OIDC authentication.

**Time:** 45 minutes

**Prerequisites:** Access to identity provider (Azure AD, Okta, or Google)

**Steps:**

1. Create application registration in IDP
2. Configure OAuth settings in AIGOS
3. Test login flow
4. Verify role mapping

### Exercise CP-02.3: Kubernetes Deployment

**Objective:** Deploy AIGOS on Kubernetes using Helm.

**Time:** 90 minutes

**Prerequisites:** Kubernetes cluster access, Helm installed

**Steps:**

1. Create namespace and secrets
2. Configure values.yaml
3. Install Helm chart
4. Verify deployment
5. Configure ingress
6. Test external access

---

## 11. Knowledge Check

### Quiz: Module CP-02

1. Which database does AIGOS Control Plane use?
   - A) MySQL
   - B) PostgreSQL
   - C) MongoDB
   - D) SQLite

2. What is the default port for the API server?
   - A) 8080
   - B) 3000
   - C) 5000
   - D) 443

3. Which service handles CGA certification?
   - A) API Server
   - B) Web UI
   - C) CA Service
   - D) Redis

4. What minimum Kubernetes version is required?
   - A) 1.21
   - B) 1.24
   - C) 1.27
   - D) 1.30

5. Which component provides object storage?
   - A) PostgreSQL
   - B) Redis
   - C) MinIO
   - D) Elasticsearch

**Answers:** 1-B, 2-B, 3-C, 4-C, 5-C

---

## 12. Quick Reference

### Docker Compose Commands

```bash
# Start
docker compose up -d

# Stop
docker compose down

# Restart service
docker compose restart api

# View logs
docker compose logs -f [service]

# Execute command
docker compose exec api npm run <command>

# Scale
docker compose up -d --scale api=3
```

### Kubernetes Commands

```bash
# Deploy
helm install aigos aigos/aigos-control-plane -n aigos-system

# Upgrade
helm upgrade aigos aigos/aigos-control-plane -n aigos-system

# Status
kubectl get pods -n aigos-system
kubectl get svc -n aigos-system

# Logs
kubectl logs -l app=aigos-api -n aigos-system

# Shell
kubectl exec -it deployment/aigos-api -n aigos-system -- /bin/sh
```

### Environment Variables Quick Reference

| Variable | Purpose | Required |
|----------|---------|----------|
| `DATABASE_URL` | PostgreSQL connection | Yes |
| `REDIS_URL` | Redis connection | Yes |
| `JWT_SECRET` | JWT signing | Yes |
| `PUBLIC_URL` | External URL | Yes |
| `OAUTH_ISSUER` | SSO issuer | If SSO |
| `SMTP_HOST` | Email server | If email |

---

*Module CP-02 Complete. Proceed to Module CP-03 or I-01.*
