# Module 5.8: Production Operations

> **Duration:** 2-3 hours
> **Prerequisites:** All previous Level 5 modules
> **Target Audience:** SREs, Platform Engineers, DevOps

---

## Learning Objectives

By the end of this module, you will be able to:
1. Deploy governed agents to production Kubernetes clusters
2. Configure high availability for governance infrastructure
3. Implement disaster recovery procedures
4. Scale governed agent deployments
5. Conduct chaos engineering tests on governance systems

---

## WHY: Production Readiness

### Production Requirements

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    PRODUCTION REQUIREMENTS                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  AVAILABILITY                                                               │
│  ────────────                                                               │
│  • Governance infrastructure: 99.9% uptime                                  │
│  • Kill switch delivery: 99.99% success rate                                │
│  • Policy engine: Always available (graceful degradation)                   │
│                                                                             │
│  PERFORMANCE                                                                │
│  ───────────                                                                │
│  • Policy check latency: P99 < 2ms                                          │
│  • Kill switch SLA: < 60 seconds                                            │
│  • Identity creation: < 50ms                                                │
│                                                                             │
│  SCALABILITY                                                                │
│  ───────────                                                                │
│  • Support 10,000+ concurrent agents                                        │
│  • Handle 100,000+ policy checks/second                                     │
│  • Store telemetry for 90+ days                                             │
│                                                                             │
│  RESILIENCE                                                                 │
│  ──────────                                                                 │
│  • Survive control plane failures                                           │
│  • Continue operation during upgrades                                       │
│  • Recover from data center failures                                        │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## WHAT: Production Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    PRODUCTION ARCHITECTURE                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                      CONTROL PLANE (HA)                              │   │
│  │                                                                      │   │
│  │   ┌───────────────┐  ┌───────────────┐  ┌───────────────┐          │   │
│  │   │  API Gateway  │  │  API Gateway  │  │  API Gateway  │          │   │
│  │   │   (Zone A)    │  │   (Zone B)    │  │   (Zone C)    │          │   │
│  │   └───────┬───────┘  └───────┬───────┘  └───────┬───────┘          │   │
│  │           │                  │                  │                    │   │
│  │           └──────────────────┼──────────────────┘                    │   │
│  │                              │                                       │   │
│  │                              ▼                                       │   │
│  │   ┌─────────────────────────────────────────────────────────────┐   │   │
│  │   │                    SERVICE MESH                              │   │   │
│  │   │                                                              │   │   │
│  │   │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │   │   │
│  │   │  │ Kill Switch │  │   Policy    │  │  Identity   │         │   │   │
│  │   │  │   Service   │  │   Service   │  │   Service   │         │   │   │
│  │   │  │  (3 pods)   │  │  (5 pods)   │  │  (3 pods)   │         │   │   │
│  │   │  └─────────────┘  └─────────────┘  └─────────────┘         │   │   │
│  │   │                                                              │   │   │
│  │   └─────────────────────────────────────────────────────────────┘   │   │
│  │                              │                                       │   │
│  │                              ▼                                       │   │
│  │   ┌─────────────────────────────────────────────────────────────┐   │   │
│  │   │                    DATA LAYER                                │   │   │
│  │   │                                                              │   │   │
│  │   │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │   │   │
│  │   │  │   Redis     │  │ PostgreSQL  │  │    S3       │         │   │   │
│  │   │  │  (cluster)  │  │  (primary/  │  │ (telemetry) │         │   │   │
│  │   │  │             │  │   replica)  │  │             │         │   │   │
│  │   │  └─────────────┘  └─────────────┘  └─────────────┘         │   │   │
│  │   │                                                              │   │   │
│  │   └─────────────────────────────────────────────────────────────┘   │   │
│  │                                                                      │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                      AGENT CLUSTERS                                  │   │
│  │                                                                      │   │
│  │   ┌───────────────────┐  ┌───────────────────┐                     │   │
│  │   │   Production      │  │   Production      │                     │   │
│  │   │   Cluster A       │  │   Cluster B       │                     │   │
│  │   │                   │  │                   │                     │   │
│  │   │  ┌─────┐ ┌─────┐  │  │  ┌─────┐ ┌─────┐  │                     │   │
│  │   │  │Agent│ │Agent│  │  │  │Agent│ │Agent│  │                     │   │
│  │   │  └─────┘ └─────┘  │  │  └─────┘ └─────┘  │                     │   │
│  │   │  ┌─────┐ ┌─────┐  │  │  ┌─────┐ ┌─────┐  │                     │   │
│  │   │  │Agent│ │Agent│  │  │  │Agent│ │Agent│  │                     │   │
│  │   │  └─────┘ └─────┘  │  │  └─────┘ └─────┘  │                     │   │
│  │   │                   │  │                   │                     │   │
│  │   └───────────────────┘  └───────────────────┘                     │   │
│  │                                                                      │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## HOW: Kubernetes Deployment

### Step 1: Namespace and RBAC

```yaml
# namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: aigos
  labels:
    istio-injection: enabled  # Service mesh

---
# rbac.yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: governed-agent
  namespace: aigos

---
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: governed-agent-role
  namespace: aigos
rules:
  # Read governance config
  - apiGroups: [""]
    resources: ["configmaps", "secrets"]
    verbs: ["get", "list", "watch"]
  # No pod creation (agents can't spawn outside governance)
  # No service account impersonation

---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: governed-agent-binding
  namespace: aigos
subjects:
  - kind: ServiceAccount
    name: governed-agent
roleRef:
  kind: Role
  name: governed-agent-role
  apiGroup: rbac.authorization.k8s.io
```

### Step 2: Agent Deployment

```yaml
# governed-agent-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: research-agent
  namespace: aigos
  labels:
    app: research-agent
    aigos.io/governed: "true"
spec:
  replicas: 3
  selector:
    matchLabels:
      app: research-agent
  template:
    metadata:
      labels:
        app: research-agent
        aigos.io/governed: "true"
      annotations:
        # Prometheus scraping
        prometheus.io/scrape: "true"
        prometheus.io/port: "8888"
        prometheus.io/path: "/metrics"
    spec:
      serviceAccountName: governed-agent

      # Security context
      securityContext:
        runAsNonRoot: true
        runAsUser: 1000
        fsGroup: 1000

      containers:
        - name: agent
          image: acme-corp/research-agent:1.0.0
          imagePullPolicy: Always

          # Resource limits (prevent runaway)
          resources:
            requests:
              memory: "256Mi"
              cpu: "100m"
            limits:
              memory: "1Gi"
              cpu: "500m"

          # Security
          securityContext:
            allowPrivilegeEscalation: false
            readOnlyRootFilesystem: true
            capabilities:
              drop:
                - ALL

          # Environment
          env:
            - name: AIGOS_INSTANCE_ID
              valueFrom:
                fieldRef:
                  fieldPath: metadata.name
            - name: AIGOS_CONTROL_PLANE_URL
              value: "https://control.aigos.internal"
            - name: AIGOS_OTEL_ENDPOINT
              value: "otel-collector.aigos:4317"

          # Governance config
          volumeMounts:
            - name: governance-config
              mountPath: /etc/aigos
              readOnly: true
            - name: asset-card
              mountPath: /etc/aigos/cards
              readOnly: true
            - name: private-key
              mountPath: /etc/aigos/keys
              readOnly: true

          # Health checks
          livenessProbe:
            httpGet:
              path: /health/live
              port: 8888
            initialDelaySeconds: 10
            periodSeconds: 10
          readinessProbe:
            httpGet:
              path: /health/ready
              port: 8888
            initialDelaySeconds: 5
            periodSeconds: 5

          # Ports
          ports:
            - containerPort: 8080
              name: http
            - containerPort: 8888
              name: metrics

      volumes:
        - name: governance-config
          configMap:
            name: governance-lock
        - name: asset-card
          configMap:
            name: research-agent-asset-card
        - name: private-key
          secret:
            secretName: agent-signing-key

      # Pod distribution
      affinity:
        podAntiAffinity:
          preferredDuringSchedulingIgnoredDuringExecution:
            - weight: 100
              podAffinityTerm:
                labelSelector:
                  matchLabels:
                    app: research-agent
                topologyKey: topology.kubernetes.io/zone

      # Termination grace period (for cleanup)
      terminationGracePeriodSeconds: 60
```

### Step 3: Control Plane Deployment

```yaml
# control-plane.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: kill-switch-service
  namespace: aigos
spec:
  replicas: 3
  selector:
    matchLabels:
      app: kill-switch-service
  template:
    spec:
      containers:
        - name: service
          image: aigos/kill-switch-service:1.0.0
          resources:
            requests:
              memory: "512Mi"
              cpu: "250m"
            limits:
              memory: "2Gi"
              cpu: "1000m"
          env:
            - name: REDIS_URL
              valueFrom:
                secretKeyRef:
                  name: redis-credentials
                  key: url
          ports:
            - containerPort: 8443
              name: https

---
apiVersion: v1
kind: Service
metadata:
  name: kill-switch-service
  namespace: aigos
spec:
  selector:
    app: kill-switch-service
  ports:
    - port: 443
      targetPort: 8443
      name: https
  type: ClusterIP

---
# HPA for scaling
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: kill-switch-service-hpa
  namespace: aigos
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: kill-switch-service
  minReplicas: 3
  maxReplicas: 10
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 70
```

### Step 4: ConfigMaps and Secrets

```yaml
# governance-lock-configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: governance-lock
  namespace: aigos
data:
  governance.lock: |
    version: "1.0"
    generated_at: "2026-01-09T10:00:00Z"
    policy_hash: "sha256:abc123..."

    constraints:
      registry:
        allowed_vendors: [openai, anthropic]
        allowed_models: [gpt-4, claude-3-opus]
      runtime:
        require_identity: true
        require_golden_thread: true
      build:
        require_asset_card: true
        max_risk_level: high

    expires_at: "2026-04-09T10:00:00Z"

---
# asset-card-configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: research-agent-asset-card
  namespace: aigos
data:
  research-agent.asset.yaml: |
    asset_id: research-agent-v1
    name: Research Assistant
    version: 1.0.0
    # ... full asset card

---
# signing-key-secret.yaml (apply separately, not in git)
apiVersion: v1
kind: Secret
metadata:
  name: agent-signing-key
  namespace: aigos
type: Opaque
data:
  private.pem: <base64-encoded-private-key>
```

---

## HOW: High Availability

### Control Plane HA

```yaml
# redis-cluster.yaml (for kill switch state)
apiVersion: v1
kind: ConfigMap
metadata:
  name: redis-cluster-config
  namespace: aigos
data:
  redis.conf: |
    cluster-enabled yes
    cluster-config-file nodes.conf
    cluster-node-timeout 5000
    appendonly yes

---
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: redis-cluster
  namespace: aigos
spec:
  serviceName: redis-cluster
  replicas: 6  # 3 masters + 3 replicas
  selector:
    matchLabels:
      app: redis-cluster
  template:
    spec:
      containers:
        - name: redis
          image: redis:7-alpine
          command: ["redis-server", "/etc/redis/redis.conf"]
          volumeMounts:
            - name: config
              mountPath: /etc/redis
            - name: data
              mountPath: /data
      volumes:
        - name: config
          configMap:
            name: redis-cluster-config
  volumeClaimTemplates:
    - metadata:
        name: data
      spec:
        accessModes: ["ReadWriteOnce"]
        resources:
          requests:
            storage: 10Gi
```

### Pod Disruption Budget

```yaml
# pdb.yaml
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: kill-switch-pdb
  namespace: aigos
spec:
  minAvailable: 2  # At least 2 pods must be available
  selector:
    matchLabels:
      app: kill-switch-service

---
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: governed-agent-pdb
  namespace: aigos
spec:
  maxUnavailable: 1  # Only 1 pod can be down at a time
  selector:
    matchLabels:
      aigos.io/governed: "true"
```

---

## HOW: Disaster Recovery

### Backup Strategy

```yaml
# backup-cronjob.yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: governance-backup
  namespace: aigos
spec:
  schedule: "0 */6 * * *"  # Every 6 hours
  jobTemplate:
    spec:
      template:
        spec:
          containers:
            - name: backup
              image: aigos/backup-tool:1.0.0
              env:
                - name: S3_BUCKET
                  value: "aigos-backups"
              command:
                - /bin/sh
                - -c
                - |
                  # Backup governance.lock
                  kubectl get configmap governance-lock -o yaml > /tmp/governance-lock.yaml
                  aws s3 cp /tmp/governance-lock.yaml s3://$S3_BUCKET/backups/$(date +%Y%m%d)/

                  # Backup asset cards
                  kubectl get configmap -l type=asset-card -o yaml > /tmp/asset-cards.yaml
                  aws s3 cp /tmp/asset-cards.yaml s3://$S3_BUCKET/backups/$(date +%Y%m%d)/

                  # Backup Redis state
                  redis-cli --cluster backup redis-cluster:6379 /tmp/redis-backup
                  aws s3 cp /tmp/redis-backup s3://$S3_BUCKET/backups/$(date +%Y%m%d)/

          restartPolicy: OnFailure
```

### Recovery Runbook

```markdown
# RUNBOOK: Disaster Recovery

## Scenario: Control Plane Failure

### Detection
- Alert: "Kill switch service unavailable"
- Alert: "Policy service unreachable"

### Immediate Actions
1. Check cluster status
   ```bash
   kubectl get pods -n aigos
   kubectl get events -n aigos --sort-by='.lastTimestamp'
   ```

2. Verify data layer
   ```bash
   kubectl exec -it redis-cluster-0 -n aigos -- redis-cli cluster info
   kubectl exec -it postgres-0 -n aigos -- pg_isready
   ```

3. Check network
   ```bash
   kubectl get networkpolicies -n aigos
   kubectl get svc -n aigos
   ```

### Recovery Steps

#### Option A: Single Zone Failure
1. Wait for Kubernetes to reschedule pods (automatic)
2. Verify pods are running in other zones
3. Monitor kill switch delivery times

#### Option B: Full Control Plane Failure
1. Activate DR site
   ```bash
   kubectl config use-context dr-cluster
   kubectl apply -f dr-manifests/
   ```

2. Restore from backup
   ```bash
   # Download latest backup
   aws s3 cp s3://aigos-backups/backups/latest/ /tmp/restore/

   # Apply governance config
   kubectl apply -f /tmp/restore/governance-lock.yaml
   kubectl apply -f /tmp/restore/asset-cards.yaml

   # Restore Redis
   kubectl exec -it redis-cluster-0 -- redis-cli CLUSTER RESET
   # ... restore process
   ```

3. Update DNS to point to DR site

4. Verify agents are connecting
   ```bash
   kubectl logs -l app=kill-switch-service -n aigos --tail=100
   ```

### Agent Behavior During Outage
- Agents continue running with last known policy (cached)
- Kill switch commands will be delayed
- New agents cannot start (identity verification fails)
- Watchdog may terminate long-running agents (if configured)

### Post-Recovery
1. Verify all agents reconnected
2. Check for missed kill switch commands
3. Review telemetry for gaps
4. Update incident report
```

---

## HOW: Chaos Engineering

### Chaos Experiments

```yaml
# chaos-experiments.yaml (using Chaos Mesh)
apiVersion: chaos-mesh.org/v1alpha1
kind: PodChaos
metadata:
  name: kill-service-pod-failure
  namespace: aigos
spec:
  action: pod-kill
  mode: one
  selector:
    namespaces:
      - aigos
    labelSelectors:
      app: kill-switch-service
  scheduler:
    cron: "@every 24h"

---
apiVersion: chaos-mesh.org/v1alpha1
kind: NetworkChaos
metadata:
  name: control-plane-latency
  namespace: aigos
spec:
  action: delay
  mode: all
  selector:
    namespaces:
      - aigos
    labelSelectors:
      app: kill-switch-service
  delay:
    latency: "100ms"
    jitter: "50ms"
  duration: "5m"
  scheduler:
    cron: "@every 12h"

---
apiVersion: chaos-mesh.org/v1alpha1
kind: StressChaos
metadata:
  name: policy-service-cpu-stress
  namespace: aigos
spec:
  mode: one
  selector:
    namespaces:
      - aigos
    labelSelectors:
      app: policy-service
  stressors:
    cpu:
      workers: 2
      load: 80
  duration: "10m"
```

### Chaos Test Scenarios

```python
# chaos_tests.py
"""
Chaos Engineering Tests for Governance
======================================

Tests system behavior under failure conditions.
"""

import asyncio
import pytest
from datetime import datetime, timedelta


class TestControlPlaneFailure:
    """Test behavior when control plane is unavailable."""

    async def test_agents_continue_during_outage(self, agent, control_plane):
        """Agents should continue with cached policy."""
        # Start agent
        await agent.start()
        assert agent.is_running

        # Kill control plane
        await control_plane.stop()

        # Agent should still work (cached policy)
        result = await agent.execute("web_search", query="test")
        assert result is not None

        # But new capabilities shouldn't be granted
        # (policy refresh fails)

    async def test_kill_switch_delayed_delivery(self, agent, control_plane):
        """Kill switch should work when control plane recovers."""
        await agent.start()
        await control_plane.stop()

        # Queue kill command (won't deliver)
        command_id = await queue_kill_command(agent.instance_id)

        # Restore control plane
        await control_plane.start()

        # Command should now deliver
        await asyncio.sleep(30)
        assert not agent.is_running

    async def test_watchdog_terminates_orphan(self, agent, control_plane):
        """Watchdog should terminate agent if control plane lost too long."""
        agent.watchdog_timeout = 60  # 1 minute for test

        await agent.start()
        await control_plane.stop()

        # Wait for watchdog
        await asyncio.sleep(90)

        assert not agent.is_running
        assert "watchdog" in agent.termination_reason


class TestNetworkPartition:
    """Test behavior during network partition."""

    async def test_agent_isolated_from_telemetry(self, agent, otel_collector):
        """Agent should buffer telemetry during partition."""
        await agent.start()

        # Partition telemetry
        await otel_collector.partition()

        # Execute actions (telemetry buffered)
        for _ in range(10):
            await agent.execute("web_search", query="test")

        # Restore connectivity
        await otel_collector.restore()

        # Telemetry should flush
        await asyncio.sleep(5)
        metrics = await otel_collector.get_metrics()
        assert metrics["decision_count"] >= 10


class TestHighLoad:
    """Test behavior under high load."""

    async def test_policy_latency_under_load(self, agent):
        """Policy checks should stay under 2ms under load."""
        await agent.start()

        latencies = []

        # Parallel policy checks
        async def check_policy():
            start = datetime.now()
            await agent.policy.check("web_search")
            latency = (datetime.now() - start).total_seconds() * 1000
            latencies.append(latency)

        # 1000 concurrent checks
        await asyncio.gather(*[check_policy() for _ in range(1000)])

        # P99 should be under 2ms
        latencies.sort()
        p99 = latencies[int(len(latencies) * 0.99)]
        assert p99 < 2.0, f"P99 latency {p99}ms exceeds 2ms SLA"
```

---

## HOW: Operational Procedures

### Deployment Checklist

```markdown
## Pre-Deployment Checklist

### Configuration
- [ ] governance.lock is valid and signed
- [ ] Asset cards for all agents exist
- [ ] Signing keys are rotated (if needed)
- [ ] Policy constraints are correct

### Infrastructure
- [ ] Control plane is healthy (all pods running)
- [ ] Redis cluster is healthy
- [ ] OTel collector is receiving data
- [ ] Alerts are configured

### Testing
- [ ] Staging deployment successful
- [ ] Integration tests passed
- [ ] Chaos tests passed
- [ ] Load tests passed

### Rollout
- [ ] Canary deployment first
- [ ] Monitor for 15 minutes
- [ ] No violations or errors
- [ ] Proceed with full rollout

### Post-Deployment
- [ ] All agents reporting
- [ ] Telemetry flowing
- [ ] No anomalies in dashboards
- [ ] Update runbooks if needed
```

### Upgrade Procedure

```markdown
## RUNBOOK: Governance Infrastructure Upgrade

### Pre-Upgrade
1. Notify stakeholders
2. Create backup
3. Verify DR readiness

### Upgrade Steps

1. **Upgrade control plane** (rolling)
   ```bash
   kubectl set image deployment/kill-switch-service \
     service=aigos/kill-switch-service:1.1.0 \
     -n aigos
   kubectl rollout status deployment/kill-switch-service -n aigos
   ```

2. **Upgrade policy service** (rolling)
   ```bash
   kubectl set image deployment/policy-service \
     service=aigos/policy-service:1.1.0 \
     -n aigos
   kubectl rollout status deployment/policy-service -n aigos
   ```

3. **Upgrade governance.lock** (if schema changed)
   ```bash
   kubectl apply -f new-governance-lock.yaml -n aigos
   ```

4. **Upgrade agents** (rolling, canary)
   ```bash
   # Canary first
   kubectl patch deployment research-agent -n aigos \
     -p '{"spec":{"template":{"metadata":{"labels":{"canary":"true"}}}}}'

   # Monitor canary
   sleep 900  # 15 minutes

   # Full rollout
   kubectl set image deployment/research-agent \
     agent=acme-corp/research-agent:1.1.0 \
     -n aigos
   ```

### Rollback
If issues detected:
```bash
kubectl rollout undo deployment/research-agent -n aigos
kubectl rollout undo deployment/kill-switch-service -n aigos
```

### Post-Upgrade
1. Verify all agents healthy
2. Check telemetry
3. Run smoke tests
4. Update documentation
```

---

## Practice Lab: Production Deployment

### Lab Objective

Deploy a governed agent to a production-like Kubernetes cluster with:
1. High availability control plane
2. Proper RBAC and security
3. Monitoring and alerting
4. Chaos testing

### Lab Steps

1. **Set up Kubernetes cluster** (minikube or kind)
2. **Deploy control plane** with HA
3. **Deploy governed agent**
4. **Configure monitoring**
5. **Run chaos experiments**
6. **Execute disaster recovery drill**

### Lab Validation

- [ ] Control plane survives pod failure
- [ ] Kill switch works under network latency
- [ ] Agents continue during control plane outage
- [ ] Watchdog terminates orphaned agents
- [ ] Backup and restore successful
- [ ] Monitoring dashboards working
- [ ] Alerts fire correctly

---

## Key Takeaways

1. **HA is mandatory** - Single points of failure are unacceptable
2. **Defense in depth** - Multiple layers of resilience
3. **Chaos engineering** - Test failures before they happen
4. **Runbooks** - Document everything for operations
5. **Graceful degradation** - Agents should survive control plane failures

---

## Certification: AIGRC Agentic Governance Specialist

Completing all Level 5 modules qualifies you for the certification exam.

**Exam Format:**
- 4-hour practical assessment
- Build governed multi-agent system
- Handle incident scenarios
- Demonstrate production readiness

---

*Module 5.8 - AIGRC Training Program v2.0*
