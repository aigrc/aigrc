# SPEC-RT-004: Telemetry Emitter Specification

## Document Information

| Field | Value |
|-------|-------|
| **Spec ID** | SPEC-RT-004 |
| **Version** | 1.0.0-draft |
| **Status** | Draft |
| **Layer** | Layer 3: Kinetic Governance |
| **Parent Spec** | KINETIC_GOVERNANCE_OVERVIEW.md |
| **Last Updated** | 2025-12-29 |
| **Authors** | GovOS Team |
| **License** | Apache 2.0 |

---

## Dependencies

### Required Specifications

| Spec ID | Name | Why Required |
|---------|------|--------------|
| SPEC-PRT-002 | OTel Semantic Conventions | Defines attribute names and span structure |
| SPEC-RT-002 | Identity Manager | Provides identity context for spans |

### Optional Specifications

| Spec ID | Name | Enhancement |
|---------|------|-------------|
| SPEC-RT-003 | Policy Engine | Emits decision events |
| SPEC-RT-005 | Kill Switch | Emits termination events |

---

## Abstract

The Telemetry Emitter is responsible for emitting OpenTelemetry traces for governance events. Unlike traditional APM telemetry (latency, errors), governance telemetry captures *what decisions were made* and *why*. This enables "Governance Observability"—the ability to understand, in real-time, how AI agents are behaving relative to policy.

---

## 1. Introduction

### 1.1 Purpose

The Telemetry Emitter answers the operational question:

> **"What governance decisions are being made, and can I see them in real-time?"**

Traditional observability tools show *performance* (latency, throughput, errors). Governance Observability shows *behavior* (permissions granted, violations detected, budgets consumed).

### 1.2 Governance Observability

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                    TRADITIONAL APM vs GOVERNANCE OBSERVABILITY                           │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                         │
│   TRADITIONAL APM                          GOVERNANCE OBSERVABILITY                     │
│   ───────────────                          ────────────────────────                     │
│                                                                                         │
│   "How fast is it?"                        "Is it following the rules?"                │
│                                                                                         │
│   Metrics:                                 Metrics:                                     │
│   • Request latency                        • Permissions granted/denied                 │
│   • Error rate                             • Policy violations                          │
│   • Throughput                             • Budget consumption                         │
│   • CPU/Memory                             • Tool invocations                           │
│                                                                                         │
│   Alerts:                                  Alerts:                                      │
│   • P99 > 500ms                            • Violation rate > 5%                        │
│   • Error rate > 1%                        • Budget 80% consumed                        │
│   • Memory > 80%                           • Unauthorized tool attempt                  │
│                                                                                         │
│   Dashboard:                               Dashboard:                                   │
│   • Latency heatmap                        • Permission decision timeline               │
│   • Error distribution                     • Violation breakdown by policy              │
│   • Service map                            • Agent lineage tree                         │
│                                                                                         │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

### 1.3 Design Principles

1. **Non-Blocking** — Telemetry MUST NOT slow down agent operations
2. **OTel Native** — Use OpenTelemetry, not proprietary formats
3. **Customer-Owned** — Export to customer's collectors, not our servers
4. **Structured** — Consistent schema for automated processing
5. **Opt-In Verbose** — Minimal by default, detailed when needed

### 1.4 Scope

This specification defines:

- Telemetry Emitter interface
- Span structure for governance events
- Integration with OTel SDK
- Buffering and export behavior

This specification does NOT define:

- Semantic conventions (see SPEC-PRT-002)
- Specific dashboard layouts
- Alerting rules

---

## 2. Architecture

### 2.1 Component Diagram

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                           TELEMETRY EMITTER ARCHITECTURE                                 │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                         │
│   AIGOS RUNTIME                                                                         │
│   ─────────────                                                                         │
│                                                                                         │
│   ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                                │
│   │   Identity   │  │    Policy    │  │  Kill Switch │                                │
│   │   Manager    │  │    Engine    │  │              │                                │
│   └──────┬───────┘  └──────┬───────┘  └──────┬───────┘                                │
│          │                 │                 │                                         │
│          │  Events         │  Events         │  Events                                │
│          ▼                 ▼                 ▼                                         │
│   ┌─────────────────────────────────────────────────────────────────────────────────┐ │
│   │                         TELEMETRY EMITTER                                        │ │
│   │                                                                                  │ │
│   │   ┌───────────────┐  ┌───────────────┐  ┌───────────────┐  ┌───────────────┐   │ │
│   │   │ emitIdentity  │  │ emitDecision  │  │ emitViolation │  │ emitTerminate │   │ │
│   │   └───────┬───────┘  └───────┬───────┘  └───────┬───────┘  └───────┬───────┘   │ │
│   │           │                  │                  │                  │            │ │
│   │           └──────────────────┴──────────────────┴──────────────────┘            │ │
│   │                                       │                                          │ │
│   │                                       ▼                                          │ │
│   │                          ┌─────────────────────┐                                 │ │
│   │                          │   Span Builder      │                                 │ │
│   │                          │   (OTel SDK)        │                                 │ │
│   │                          └──────────┬──────────┘                                 │ │
│   │                                     │                                            │ │
│   │                                     ▼                                            │ │
│   │                          ┌─────────────────────┐                                 │ │
│   │                          │   Async Buffer      │                                 │ │
│   │                          │   (BatchSpanProc)   │                                 │ │
│   │                          └──────────┬──────────┘                                 │ │
│   │                                     │                                            │ │
│   └─────────────────────────────────────┼────────────────────────────────────────────┘ │
│                                         │                                              │
│                                         ▼                                              │
│   ┌─────────────────────────────────────────────────────────────────────────────────┐ │
│   │                          OTLP EXPORTER                                           │ │
│   │                          (gRPC or HTTP)                                          │ │
│   └─────────────────────────────────────────────────────────────────────────────────┘ │
│                                         │                                              │
└─────────────────────────────────────────┼──────────────────────────────────────────────┘
                                          │
                                          ▼
                          ┌───────────────────────────────┐
                          │   CUSTOMER'S OTEL COLLECTOR   │
                          │   (Datadog, Grafana, etc.)    │
                          └───────────────────────────────┘
```

### 2.2 Data Flow

```
1. Governance event occurs (e.g., policy decision)
       │
       ▼
2. Component calls TelemetryEmitter.emit*()
       │
       ▼
3. Emitter creates OTel span with governance attributes
       │
       ▼
4. Span added to async buffer (non-blocking)
       │
       ▼
5. BatchSpanProcessor flushes to exporter (background)
       │
       ▼
6. Exporter sends to OTLP endpoint (gRPC/HTTP)
       │
       ▼
7. Customer's collector receives and processes
```

---

## 3. Interface

### 3.1 TypeScript Interface

```typescript
import { Span, SpanContext } from '@opentelemetry/api';

/**
 * Emits governance telemetry via OpenTelemetry.
 */
interface ITelemetryEmitter {
  /**
   * Emits identity creation event.
   * Called when an agent identity is established.
   */
  emitIdentity(event: IdentityEvent): void;

  /**
   * Emits policy decision event.
   * Called for every permission check.
   */
  emitDecision(event: DecisionEvent): void;

  /**
   * Emits policy violation event.
   * Called when a permission is denied.
   */
  emitViolation(event: ViolationEvent): void;

  /**
   * Emits budget consumption event.
   * Called when cost is incurred.
   */
  emitBudget(event: BudgetEvent): void;

  /**
   * Emits agent termination event.
   * Called when kill switch activates or agent shuts down.
   */
  emitTerminate(event: TerminateEvent): void;

  /**
   * Emits agent spawning event.
   * Called when a child agent is created.
   */
  emitSpawn(event: SpawnEvent): void;

  /**
   * Creates a traced action context.
   * Wraps an operation with governance tracing.
   */
  traceAction<T>(
    name: string,
    attributes: Record<string, unknown>,
    fn: () => Promise<T>
  ): Promise<T>;

  /**
   * Flushes pending telemetry.
   * Called before shutdown.
   */
  flush(): Promise<void>;

  /**
   * Shuts down the emitter.
   */
  shutdown(): Promise<void>;

  /**
   * Checks if emitter is enabled.
   */
  isEnabled(): boolean;
}

// Event Types

interface IdentityEvent {
  identity: RuntimeIdentity;
  verified: boolean;
  mode: 'NORMAL' | 'SANDBOX' | 'RESTRICTED';
}

interface DecisionEvent {
  action: string;
  resource: string;
  result: 'ALLOWED' | 'DENIED' | 'WOULD_DENY';
  reason?: string;
  denied_by?: string;
  evaluation_time_ms: number;
  dry_run: boolean;
}

interface ViolationEvent {
  action: string;
  resource: string;
  reason: string;
  denied_by: string;
  severity: 'warning' | 'error' | 'critical';
}

interface BudgetEvent {
  cost: number;
  currency: string;
  session_total: number;
  daily_total: number;
  session_limit: number | null;
  daily_limit: number | null;
  operation: string;
}

interface TerminateEvent {
  reason: string;
  source: 'kill_switch' | 'budget_exceeded' | 'policy_violation' | 'graceful';
  initiated_by?: string;
}

interface SpawnEvent {
  parent_instance_id: string;
  child_instance_id: string;
  child_asset_id: string;
  generation_depth: number;
  capability_mode: string;
}
```

### 3.2 Python Interface

```python
from dataclasses import dataclass
from typing import Optional, Callable, TypeVar, Awaitable
from datetime import datetime

T = TypeVar('T')

@dataclass
class IdentityEvent:
    identity: RuntimeIdentity
    verified: bool
    mode: str

@dataclass
class DecisionEvent:
    action: str
    resource: str
    result: str  # ALLOWED | DENIED | WOULD_DENY
    reason: Optional[str] = None
    denied_by: Optional[str] = None
    evaluation_time_ms: float = 0.0
    dry_run: bool = False

@dataclass
class ViolationEvent:
    action: str
    resource: str
    reason: str
    denied_by: str
    severity: str  # warning | error | critical

class TelemetryEmitter:
    def emit_identity(self, event: IdentityEvent) -> None:
        """Emits identity creation event."""
        ...
    
    def emit_decision(self, event: DecisionEvent) -> None:
        """Emits policy decision event."""
        ...
    
    def emit_violation(self, event: ViolationEvent) -> None:
        """Emits policy violation event."""
        ...
    
    def emit_budget(self, event: BudgetEvent) -> None:
        """Emits budget consumption event."""
        ...
    
    def emit_terminate(self, event: TerminateEvent) -> None:
        """Emits agent termination event."""
        ...
    
    def emit_spawn(self, event: SpawnEvent) -> None:
        """Emits agent spawning event."""
        ...
    
    async def trace_action(
        self,
        name: str,
        attributes: dict,
        fn: Callable[[], Awaitable[T]]
    ) -> T:
        """Creates a traced action context."""
        ...
    
    async def flush(self) -> None:
        """Flushes pending telemetry."""
        ...
    
    async def shutdown(self) -> None:
        """Shuts down the emitter."""
        ...
    
    def is_enabled(self) -> bool:
        """Checks if emitter is enabled."""
        ...
```

---

## 4. Span Structure

### 4.1 Governance Span Types

| Span Name | When Emitted | Key Attributes |
|-----------|--------------|----------------|
| `aigos.governance.identity` | Agent startup | `asset_id`, `verified`, `mode` |
| `aigos.governance.decision` | Every permission check | `action`, `resource`, `result` |
| `aigos.governance.violation` | Permission denied | `action`, `reason`, `severity` |
| `aigos.governance.budget` | Cost incurred | `cost`, `session_total`, `limit` |
| `aigos.governance.terminate` | Agent shutdown | `reason`, `source` |
| `aigos.governance.spawn` | Child agent created | `parent_id`, `child_id`, `depth` |

### 4.2 Common Attributes

All governance spans include:

```yaml
# Resource attributes (set once at startup)
service.name: "my-ai-agent"
service.version: "1.2.0"
aigos.sdk.version: "1.0.0"

# Identity attributes (set for all spans)
aigos.instance_id: "550e8400-e29b-41d4-a716-446655440000"
aigos.asset_id: "fin-agent-001"
aigos.asset_name: "Financial Analysis Agent"
aigos.risk_level: "high"
aigos.generation_depth: 0

# Lineage attributes (if child agent)
aigos.parent_instance_id: "parent-uuid"
aigos.root_instance_id: "root-uuid"
```

### 4.3 Example Spans

**Identity Span:**
```yaml
name: "aigos.governance.identity"
kind: INTERNAL
status: OK
attributes:
  aigos.instance_id: "550e8400-e29b-41d4-a716-446655440000"
  aigos.asset_id: "fin-agent-001"
  aigos.identity.verified: true
  aigos.identity.mode: "NORMAL"
  aigos.identity.golden_thread_hash: "sha256:7d865e..."
  aigos.identity.risk_level: "high"
```

**Decision Span:**
```yaml
name: "aigos.governance.decision"
kind: INTERNAL
status: OK
attributes:
  aigos.instance_id: "550e8400-e29b-41d4-a716-446655440000"
  aigos.decision.action: "tool_call"
  aigos.decision.resource: "web_search"
  aigos.decision.result: "ALLOWED"
  aigos.decision.evaluation_time_ms: 0.8
  aigos.decision.dry_run: false
```

**Violation Span:**
```yaml
name: "aigos.governance.violation"
kind: INTERNAL
status: ERROR
attributes:
  aigos.instance_id: "550e8400-e29b-41d4-a716-446655440000"
  aigos.violation.action: "shell_exec"
  aigos.violation.resource: "rm -rf /"
  aigos.violation.reason: "Action in denied_tools"
  aigos.violation.denied_by: "capability"
  aigos.violation.severity: "critical"
```

---

## 5. Configuration

### 5.1 Runtime Configuration

```yaml
# .aigrc.yaml
runtime:
  telemetry:
    # Enable/disable telemetry
    enabled: true
    
    # OTLP endpoint (uses env var if not set)
    endpoint: null  # Falls back to OTEL_EXPORTER_OTLP_ENDPOINT
    
    # Service name for spans
    service_name: "my-ai-agent"
    
    # Sampling rate (0.0-1.0)
    sampling_rate: 1.0
    
    # Which events to emit
    emit_decisions: true
    emit_violations: true
    emit_budget: true
    emit_spawn: true
    
    # Verbosity level
    # minimal: Only violations and errors
    # standard: Decisions, violations, budget
    # verbose: Everything including debug info
    verbosity: "standard"
    
    # Batch settings
    batch_size: 512
    batch_timeout_ms: 5000
```

### 5.2 Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `OTEL_EXPORTER_OTLP_ENDPOINT` | OTLP collector endpoint | `http://localhost:4317` |
| `OTEL_SERVICE_NAME` | Service name | `"aigrc"` |
| `AIGRC_TELEMETRY_ENABLED` | Enable telemetry | `true` |
| `AIGRC_TELEMETRY_SAMPLING_RATE` | Sampling rate | `1.0` |

---

## 6. Performance Requirements

### 6.1 Non-Blocking Requirement

Telemetry emission MUST be non-blocking:

```typescript
// CORRECT: Non-blocking
emitDecision(event: DecisionEvent): void {
  // Add to async buffer, return immediately
  this.buffer.add(this.buildSpan(event));
  // DO NOT await anything here
}

// INCORRECT: Blocking
async emitDecision(event: DecisionEvent): Promise<void> {
  // This would block the hot path!
  await this.exporter.export(this.buildSpan(event));
}
```

### 6.2 Latency Budget

| Operation | Target | Maximum |
|-----------|--------|---------|
| `emit*()` call | < 0.1ms | 0.5ms |
| Buffer add | < 0.05ms | 0.1ms |
| Background flush | N/A (async) | N/A |

### 6.3 Memory Budget

| Component | Target | Maximum |
|-----------|--------|---------|
| Span buffer | < 5MB | 10MB |
| Pending spans | < 1000 | 5000 |

### 6.4 Backpressure Handling

When buffer is full:

1. **Level 1**: Log warning, continue (drop oldest)
2. **Level 2**: Log error, sample at 50%
3. **Level 3**: Log critical, sample at 10%
4. **Level 4**: Disable telemetry, alert

```typescript
if (this.buffer.size >= this.maxBufferSize) {
  this.logger.warn('Telemetry buffer full, dropping oldest spans');
  this.buffer.dropOldest(100);
}
```

---

## 7. Integration

### 7.1 OTel SDK Integration

```typescript
import { NodeSDK } from '@opentelemetry/sdk-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-grpc';
import { BatchSpanProcessor } from '@opentelemetry/sdk-trace-base';
import { Resource } from '@opentelemetry/resources';

function createTelemetryEmitter(config: TelemetryConfig): TelemetryEmitter {
  const exporter = new OTLPTraceExporter({
    url: config.endpoint || process.env.OTEL_EXPORTER_OTLP_ENDPOINT,
  });
  
  const processor = new BatchSpanProcessor(exporter, {
    maxQueueSize: config.batch_size || 512,
    scheduledDelayMillis: config.batch_timeout_ms || 5000,
  });
  
  const sdk = new NodeSDK({
    resource: new Resource({
      'service.name': config.service_name,
      'aigos.sdk.version': SDK_VERSION,
    }),
    spanProcessor: processor,
  });
  
  sdk.start();
  
  return new TelemetryEmitter(sdk, config);
}
```

### 7.2 Collector Configuration

Example OpenTelemetry Collector config for governance data:

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
    timeout: 5s
    send_batch_size: 512
  
  # Filter to governance spans only
  filter:
    spans:
      include:
        match_type: regexp
        span_names:
          - "aigos\\.governance\\..*"

exporters:
  # To Grafana Cloud
  otlp/grafana:
    endpoint: "otlp-gateway-prod-us-central-0.grafana.net:443"
    headers:
      Authorization: "Basic ${GRAFANA_CLOUD_API_KEY}"
  
  # To local Jaeger
  jaeger:
    endpoint: "jaeger:14250"

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [batch, filter]
      exporters: [otlp/grafana, jaeger]
```

---

## 8. Disabled Mode

### 8.1 When Disabled

If telemetry is disabled (`enabled: false`), the emitter:

1. Returns immediately from all `emit*()` calls
2. Does not initialize OTel SDK
3. Uses minimal memory (no buffers)
4. `traceAction()` executes function without tracing

```typescript
class NoOpTelemetryEmitter implements ITelemetryEmitter {
  emitIdentity(event: IdentityEvent): void { /* no-op */ }
  emitDecision(event: DecisionEvent): void { /* no-op */ }
  emitViolation(event: ViolationEvent): void { /* no-op */ }
  
  async traceAction<T>(
    name: string,
    attributes: Record<string, unknown>,
    fn: () => Promise<T>
  ): Promise<T> {
    return fn();  // Just execute, no tracing
  }
  
  isEnabled(): boolean { return false; }
}
```

---

## 9. Implementation Requirements

### 9.1 MUST (Required)

Implementations MUST:

1. Use OpenTelemetry SDK for span creation
2. Be completely non-blocking in `emit*()` methods
3. Support disabling via configuration
4. Emit spans with the `aigos.governance.*` prefix
5. Include identity attributes on all spans
6. Implement graceful shutdown with flush

### 9.2 SHOULD (Recommended)

Implementations SHOULD:

1. Use BatchSpanProcessor for efficiency
2. Implement backpressure handling
3. Support sampling configuration
4. Include verbosity levels
5. Log telemetry errors without crashing

### 9.3 MAY (Optional)

Implementations MAY:

1. Support multiple exporters
2. Implement custom span processors
3. Support span links for agent lineage
4. Emit metrics in addition to traces

---

## 10. Examples

### 10.1 Basic Usage

```typescript
const emitter = new TelemetryEmitter(config);

// Emit identity on startup
emitter.emitIdentity({
  identity,
  verified: true,
  mode: 'NORMAL',
});

// Emit decision for each permission check
const result = await policyEngine.checkPermission(request);
emitter.emitDecision({
  action: request.action,
  resource: request.resource,
  result: result.allowed ? 'ALLOWED' : 'DENIED',
  reason: result.reason,
  evaluation_time_ms: result.evaluation_time_ms,
  dry_run: result.dry_run,
});

// If violation
if (!result.allowed) {
  emitter.emitViolation({
    action: request.action,
    resource: request.resource,
    reason: result.reason!,
    denied_by: result.denied_by!,
    severity: 'error',
  });
}
```

### 10.2 Traced Action

```typescript
// Wrap an operation with governance tracing
const result = await emitter.traceAction(
  'llm_inference',
  { model: 'gpt-4', prompt_tokens: 100 },
  async () => {
    return await openai.chat.completions.create({...});
  }
);
```

### 10.3 Shutdown

```typescript
// Before process exit
process.on('SIGTERM', async () => {
  await emitter.flush();
  await emitter.shutdown();
  process.exit(0);
});
```

---

## 11. Conformance

### 11.1 Level 1 (Minimal)

- MUST emit `aigos.governance.identity` on startup
- MUST be non-blocking
- MUST support disable configuration

### 11.2 Level 2 (Standard)

- MUST satisfy Level 1
- MUST emit `aigos.governance.decision` spans
- MUST emit `aigos.governance.violation` spans
- MUST implement `traceAction()`

### 11.3 Level 3 (Full)

- MUST satisfy Level 2
- MUST emit all span types
- MUST support sampling
- MUST implement backpressure handling
- MUST follow all OTel semantic conventions (SPEC-PRT-002)

---

## Appendix A: Changelog

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0-draft | 2025-12-29 | Initial draft |
