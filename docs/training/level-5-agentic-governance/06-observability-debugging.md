# Module 5.6: Observability & Debugging

> **Duration:** 1.5-2 hours
> **Prerequisites:** Module 5.1
> **Target Audience:** SREs, Platform Engineers, Developers

---

## Learning Objectives

By the end of this module, you will be able to:
1. Set up OpenTelemetry collection for governed agents
2. Build governance-specific Grafana dashboards
3. Create alert rules for governance violations
4. Debug policy violations and capability issues
5. Investigate governance incidents

---

## WHY: Governance Observability

### Traditional APM vs Governance Observability

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                OBSERVABILITY COMPARISON                                      │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  TRADITIONAL APM                          GOVERNANCE OBSERVABILITY          │
│  ───────────────                          ───────────────────────           │
│                                                                             │
│  "Is the service up?"                     "Is the agent governed?"          │
│  "What's the latency?"                    "What decisions were made?"       │
│  "Are there errors?"                      "Were any actions denied?"        │
│  "How much CPU/memory?"                   "What budget was consumed?"       │
│                                                                             │
│  METRICS:                                 METRICS:                          │
│  • Request rate                           • Policy check count              │
│  • Error rate                             • Violation count                 │
│  • Latency percentiles                    • Policy check latency            │
│  • Resource utilization                   • Budget consumption              │
│                                                                             │
│  TRACES:                                  TRACES:                           │
│  • HTTP requests                          • Governance decisions            │
│  • Database queries                       • Kill switch commands            │
│  • External API calls                     • Agent lifecycle events          │
│                                                                             │
│  LOGS:                                    LOGS:                             │
│  • Application logs                       • Policy violations               │
│  • Error stack traces                     • Capability denials              │
│  • Debug information                      • A2A trust evaluations           │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### What You Need to See

| Question | Telemetry Required |
|----------|-------------------|
| "Is the agent running?" | Lifecycle events (startup, shutdown) |
| "Is governance enforced?" | Policy check counts, decision outcomes |
| "Any policy violations?" | Violation events with details |
| "Budget status?" | Budget consumption metrics |
| "Agent lineage?" | Parent/child relationships |
| "Kill switch working?" | Command receipt, execution timing |

---

## WHAT: AIGOS Telemetry Architecture

### OpenTelemetry Integration

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    TELEMETRY ARCHITECTURE                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  GOVERNED AGENTS                                                            │
│  ───────────────                                                            │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                         │
│  │   Agent 1   │  │   Agent 2   │  │   Agent 3   │                         │
│  │  Telemetry  │  │  Telemetry  │  │  Telemetry  │                         │
│  │   Emitter   │  │   Emitter   │  │   Emitter   │                         │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘                         │
│         │                │                │                                 │
│         └────────────────┼────────────────┘                                 │
│                          │                                                  │
│                          ▼                                                  │
│  ┌───────────────────────────────────────────────────────────────────────┐ │
│  │                    OTEL COLLECTOR                                      │ │
│  │                                                                        │ │
│  │   Receivers ──► Processors ──► Exporters                              │ │
│  │   (OTLP)        (batch,        (Prometheus,                           │ │
│  │                  filter)        Jaeger, etc)                          │ │
│  └───────────────────────────────────────────────────────────────────────┘ │
│                          │                                                  │
│          ┌───────────────┼───────────────┐                                 │
│          │               │               │                                  │
│          ▼               ▼               ▼                                  │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐                          │
│  │ Prometheus  │ │   Jaeger    │ │    Loki     │                          │
│  │  (metrics)  │ │  (traces)   │ │   (logs)    │                          │
│  └──────┬──────┘ └──────┬──────┘ └──────┬──────┘                          │
│         │               │               │                                  │
│         └───────────────┼───────────────┘                                  │
│                         │                                                   │
│                         ▼                                                   │
│  ┌───────────────────────────────────────────────────────────────────────┐ │
│  │                       GRAFANA                                          │ │
│  │   Dashboards  │  Alerts  │  Explore                                   │ │
│  └───────────────────────────────────────────────────────────────────────┘ │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### AIGOS Span Types

| Span Name | Purpose | Key Attributes |
|-----------|---------|----------------|
| `aigos.governance.identity` | Agent startup | instance_id, asset_id, mode |
| `aigos.governance.decision` | Policy check | tool, resource, allowed, latency |
| `aigos.governance.violation` | Denied action | tool, reason, policy_rule |
| `aigos.governance.budget` | Cost tracking | amount, total, limit |
| `aigos.governance.terminate` | Agent shutdown | reason, cascade |
| `aigos.governance.spawn` | Child creation | parent_id, child_id |

---

## HOW: Setting Up Observability

### Step 1: OTel Collector Configuration

```yaml
# otel-collector-config.yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317
      http:
        endpoint: 0.0.0.0:4318

processors:
  batch:
    timeout: 1s
    send_batch_size: 1024

  # Filter out non-governance spans if needed
  filter/governance:
    spans:
      include:
        match_type: regexp
        span_names:
          - "aigos\\..*"

  # Add resource attributes
  resource:
    attributes:
      - key: service.namespace
        value: aigos
        action: upsert

exporters:
  prometheus:
    endpoint: "0.0.0.0:8889"
    namespace: aigos
    const_labels:
      environment: production

  jaeger:
    endpoint: jaeger:14250
    tls:
      insecure: true

  loki:
    endpoint: http://loki:3100/loki/api/v1/push
    labels:
      attributes:
        instance_id: ""
        asset_id: ""

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [batch, resource]
      exporters: [jaeger]

    metrics:
      receivers: [otlp]
      processors: [batch, resource]
      exporters: [prometheus]

    logs:
      receivers: [otlp]
      processors: [batch, resource]
      exporters: [loki]
```

### Step 2: Docker Compose Setup

```yaml
# docker-compose.observability.yaml
version: '3.8'

services:
  otel-collector:
    image: otel/opentelemetry-collector-contrib:latest
    command: ["--config=/etc/otel-collector-config.yaml"]
    volumes:
      - ./otel-collector-config.yaml:/etc/otel-collector-config.yaml
    ports:
      - "4317:4317"   # OTLP gRPC
      - "4318:4318"   # OTLP HTTP
      - "8889:8889"   # Prometheus metrics

  prometheus:
    image: prom/prometheus:latest
    volumes:
      - ./prometheus.yaml:/etc/prometheus/prometheus.yml
    ports:
      - "9090:9090"

  jaeger:
    image: jaegertracing/all-in-one:latest
    ports:
      - "16686:16686"  # UI
      - "14250:14250"  # gRPC

  loki:
    image: grafana/loki:latest
    ports:
      - "3100:3100"

  grafana:
    image: grafana/grafana:latest
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
    volumes:
      - ./grafana/dashboards:/var/lib/grafana/dashboards
      - ./grafana/provisioning:/etc/grafana/provisioning
    ports:
      - "3000:3000"
    depends_on:
      - prometheus
      - jaeger
      - loki
```

### Step 3: Prometheus Configuration

```yaml
# prometheus.yaml
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'otel-collector'
    static_configs:
      - targets: ['otel-collector:8889']

  - job_name: 'governed-agents'
    static_configs:
      - targets: ['agent1:8888', 'agent2:8888']
```

### Step 4: Grafana Dashboard

```json
{
  "dashboard": {
    "title": "AIGOS Governance Dashboard",
    "panels": [
      {
        "title": "Active Agents",
        "type": "stat",
        "targets": [
          {
            "expr": "count(aigos_agent_status{status=\"running\"})",
            "legendFormat": "Active"
          }
        ]
      },
      {
        "title": "Policy Decisions (5m)",
        "type": "timeseries",
        "targets": [
          {
            "expr": "sum(rate(aigos_policy_decisions_total[5m])) by (outcome)",
            "legendFormat": "{{outcome}}"
          }
        ]
      },
      {
        "title": "Violations by Type",
        "type": "piechart",
        "targets": [
          {
            "expr": "sum(aigos_violations_total) by (reason)",
            "legendFormat": "{{reason}}"
          }
        ]
      },
      {
        "title": "Policy Check Latency",
        "type": "timeseries",
        "targets": [
          {
            "expr": "histogram_quantile(0.99, sum(rate(aigos_policy_check_duration_seconds_bucket[5m])) by (le))",
            "legendFormat": "p99"
          },
          {
            "expr": "histogram_quantile(0.50, sum(rate(aigos_policy_check_duration_seconds_bucket[5m])) by (le))",
            "legendFormat": "p50"
          }
        ]
      },
      {
        "title": "Budget Consumption",
        "type": "gauge",
        "targets": [
          {
            "expr": "sum(aigos_budget_spent_usd) / sum(aigos_budget_limit_usd) * 100",
            "legendFormat": "% Used"
          }
        ]
      },
      {
        "title": "Agent Lineage",
        "type": "nodeGraph",
        "targets": [
          {
            "expr": "aigos_agent_lineage",
            "format": "table"
          }
        ]
      }
    ]
  }
}
```

### Step 5: Alert Rules

```yaml
# alerting-rules.yaml
groups:
  - name: aigos-governance
    rules:
      # High violation rate
      - alert: HighViolationRate
        expr: sum(rate(aigos_violations_total[5m])) > 10
        for: 2m
        labels:
          severity: warning
        annotations:
          summary: "High governance violation rate"
          description: "More than 10 violations/second for 2 minutes"

      # Policy check latency SLA breach
      - alert: PolicyCheckLatencySLA
        expr: histogram_quantile(0.99, sum(rate(aigos_policy_check_duration_seconds_bucket[5m])) by (le)) > 0.002
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Policy check latency exceeds 2ms SLA"
          description: "P99 policy check latency is above 2ms"

      # Kill switch delivery SLA breach
      - alert: KillSwitchDelaySLA
        expr: aigos_kill_switch_delivery_seconds > 30
        for: 0m
        labels:
          severity: critical
        annotations:
          summary: "Kill switch delivery exceeds 30s"
          description: "Kill switch command took {{ $value }}s to deliver"

      # Agent without kill switch
      - alert: AgentMissingKillSwitch
        expr: aigos_agent_status{kill_switch_enabled="false"} == 1
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "Agent running without kill switch"
          description: "Agent {{ $labels.instance_id }} has no kill switch"

      # Budget exhaustion warning
      - alert: BudgetExhaustionWarning
        expr: (aigos_budget_spent_usd / aigos_budget_limit_usd) > 0.8
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Agent budget 80% consumed"
          description: "Agent {{ $labels.instance_id }} has used 80% of budget"

      # Unverified Golden Thread
      - alert: UnverifiedGoldenThread
        expr: aigos_agent_status{golden_thread_verified="false"} == 1
        for: 1m
        labels:
          severity: warning
        annotations:
          summary: "Agent with unverified Golden Thread"
          description: "Agent {{ $labels.instance_id }} running in SANDBOX mode"
```

---

## HOW: Debugging Governance Issues

### Common Issues and Investigation

#### Issue 1: Capability Denied

**Symptom:** Agent fails with "capability denied" error

**Investigation Steps:**
```bash
# 1. Check the violation in traces
# Open Jaeger, search for:
# service: governed-agent
# operation: aigos.governance.violation

# 2. Look at the span attributes:
# - tool: what tool was denied
# - reason: why it was denied
# - policy_rule: which rule blocked it

# 3. Check the asset card
cat .aigrc/cards/my-agent.asset.yaml | grep -A 10 capabilities

# 4. Compare with governance.lock
cat governance.lock | grep -A 10 allowed_tools
```

**Resolution:**
- Add tool to allowed_tools in asset card
- Or, verify agent is using correct asset card

#### Issue 2: Resource Blocked

**Symptom:** Agent can't access a URL/path

**Investigation Steps:**
```bash
# 1. Check violation details
# In Grafana, filter logs by:
# {instance_id="agent-001"} | json | reason="resource_denied"

# 2. Check resource patterns
cat .aigrc/cards/my-agent.asset.yaml | grep -A 10 allowed_resources

# 3. Test pattern matching
python -c "
import re
pattern = 'https://*.wikipedia.org/*'
url = 'https://en.wikipedia.org/wiki/AI'
regex = pattern.replace('.', '\\.').replace('*', '.*')
print(f'Match: {bool(re.match(regex, url))}')
"
```

#### Issue 3: Budget Exceeded

**Symptom:** Actions failing with budget errors

**Investigation Steps:**
```bash
# 1. Check current budget status
curl http://localhost:8888/metrics | grep aigos_budget

# 2. Look at budget consumption history in Grafana
# Panel: Budget Consumption
# Query: sum(aigos_budget_spent_usd) by (instance_id)

# 3. Identify high-cost operations
# In Jaeger, search spans:
# operation: aigos.governance.budget
# Sort by: span.attributes.amount DESC
```

#### Issue 4: Golden Thread Verification Failed

**Symptom:** Agent running in SANDBOX mode

**Investigation Steps:**
```bash
# 1. Check identity span
# In Jaeger:
# operation: aigos.governance.identity
# Look at: golden_thread.verified, golden_thread.error

# 2. Verify Golden Thread fields
cat .aigrc/cards/my-agent.asset.yaml | grep -A 10 golden_thread

# 3. Recompute hash locally
python -c "
import hashlib
fields = [
    'approved_at=2026-01-09T10:00:00Z',
    'approved_by=ciso@company.com',
    'ticket_id=AI-2026-0042',
]
canonical = '|'.join(sorted(fields))
hash = hashlib.sha256(canonical.encode()).hexdigest()
print(f'sha256:{hash}')
"

# 4. Compare with stored hash
```

### Debug Logging

```python
# Enable debug logging for governance
import logging

logging.getLogger("aigos").setLevel(logging.DEBUG)
logging.getLogger("aigos.policy").setLevel(logging.DEBUG)
logging.getLogger("aigos.identity").setLevel(logging.DEBUG)

# Or via environment variable
# AIGOS_LOG_LEVEL=debug python agent.py
```

---

## Practice Lab: Debug a Governance Incident

### Lab Scenario

An agent is intermittently failing with policy violations. You need to:
1. Set up observability
2. Reproduce the issue
3. Investigate using traces and logs
4. Identify root cause
5. Implement fix

### Lab Setup

```bash
# Start observability stack
docker-compose -f docker-compose.observability.yaml up -d

# Wait for services
sleep 30

# Verify
curl http://localhost:9090/-/healthy  # Prometheus
curl http://localhost:16686/          # Jaeger UI
curl http://localhost:3000/           # Grafana
```

### Lab Steps

1. **Start the problematic agent**
2. **Trigger the issue** (specific actions)
3. **Open Grafana** - Look at violation dashboard
4. **Open Jaeger** - Search for violation traces
5. **Identify the root cause** from span attributes
6. **Fix the configuration**
7. **Verify fix** - No more violations

### Lab Validation

- [ ] OTel Collector receiving telemetry
- [ ] Grafana showing governance metrics
- [ ] Jaeger showing governance traces
- [ ] Alerts firing on violations
- [ ] Root cause identified
- [ ] Fix verified

---

## Key Takeaways

1. **Governance observability ≠ APM** - Different questions, different telemetry
2. **OpenTelemetry standard** - Use OTel for interoperability
3. **Span attributes matter** - Include all governance context
4. **Alert on violations** - Proactive vs reactive debugging
5. **Trace lineage** - Understand multi-agent relationships

---

## Next Steps

Continue to [Module 5.7: Security Hardening](./07-security-hardening.md) to learn how to secure governed agents against attacks.

---

*Module 5.6 - AIGRC Training Program v2.0*
