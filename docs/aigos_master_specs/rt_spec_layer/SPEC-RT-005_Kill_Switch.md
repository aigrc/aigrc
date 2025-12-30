# SPEC-RT-005: Kill Switch Specification

## Document Information

| Field | Value |
|-------|-------|
| **Spec ID** | SPEC-RT-005 |
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
| SPEC-RT-002 | Identity Manager | Identity revocation on termination |
| SPEC-RT-003 | Policy Engine | Emergency policy override |

### Optional Specifications

| Spec ID | Name | Enhancement |
|---------|------|-------------|
| SPEC-RT-004 | Telemetry Emitter | Emit termination events |

---

## Abstract

The Kill Switch provides a mechanism for immediate remote termination of AI agents. When activated, running agents must stop all operations within 60 seconds. This capability is critical for enterprise governance, enabling CISOs and security teams to halt rogue agents, contain incidents, and maintain control over autonomous AI systems.

---

## 1. Introduction

### 1.1 Purpose

The Kill Switch answers the critical security question:

> **"Can we stop this AI agent immediately if something goes wrong?"**

Without a kill switch, autonomous AI agents pose significant risk:
- A rogue agent could continue harmful operations
- Compromised agents could exfiltrate data
- Budget runaway could incur massive costs
- Regulatory violations could escalate

### 1.2 The Kill Switch Analogy

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                           THE KILL SWITCH ANALOGY                                        │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                         │
│   INDUSTRIAL ROBOT                          AI AGENT                                    │
│   ────────────────                          ────────                                    │
│                                                                                         │
│   ┌─────────────────────┐                  ┌─────────────────────┐                     │
│   │                     │                  │                     │                     │
│   │   🤖 Robot Arm      │                  │   🤖 AI Agent       │                     │
│   │                     │                  │                     │                     │
│   │   Operating...      │                  │   Operating...      │                     │
│   │                     │                  │                     │                     │
│   └──────────┬──────────┘                  └──────────┬──────────┘                     │
│              │                                        │                                │
│              │ Emergency!                             │ Emergency!                     │
│              ▼                                        ▼                                │
│   ┌─────────────────────┐                  ┌─────────────────────┐                     │
│   │                     │                  │                     │                     │
│   │   🔴 E-STOP Button  │                  │   🔴 Kill Switch    │                     │
│   │                     │                  │      Command        │                     │
│   │   Physical button   │                  │   Remote signal     │                     │
│   │   on factory floor  │                  │   via SSE/polling   │                     │
│   │                     │                  │                     │                     │
│   └──────────┬──────────┘                  └──────────┬──────────┘                     │
│              │                                        │                                │
│              ▼                                        ▼                                │
│   ┌─────────────────────┐                  ┌─────────────────────┐                     │
│   │                     │                  │                     │                     │
│   │   Robot STOPS       │                  │   Agent STOPS       │                     │
│   │   immediately       │                  │   within 60 seconds │                     │
│   │                     │                  │                     │                     │
│   └─────────────────────┘                  └─────────────────────┘                     │
│                                                                                         │
│   ⏱️ Response: < 100ms                     ⏱️ Response: < 60s                          │
│                                                                                         │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

### 1.3 Design Principles

1. **Fail-Safe** — If uncertain, STOP the agent
2. **Eventually Consistent** — Commands may be delayed but will arrive
3. **Hierarchical** — Kill parent, children die automatically
4. **Auditable** — Every termination is logged with reason
5. **Non-Bypassable** — Agent code cannot disable the kill switch

### 1.4 Scope

This specification defines:

- Kill switch command format
- Delivery mechanisms (SSE, polling, push)
- Agent termination behavior
- Cascading termination for child agents
- Local-first fallback

This specification does NOT define:

- Admin UI for triggering kill switch
- Integration with SIEM systems
- Specific alerting configurations

---

## 2. Architecture

### 2.1 Component Diagram

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                           KILL SWITCH ARCHITECTURE                                       │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                         │
│   CONTROL PLANE                                                                         │
│   ─────────────                                                                         │
│                                                                                         │
│   ┌─────────────────────────────────────────────────────────────────────────────────┐  │
│   │                         AIGOS CLOUD (Optional)                                   │  │
│   │                                                                                  │  │
│   │   ┌───────────────┐    ┌───────────────┐    ┌───────────────┐                   │  │
│   │   │  Admin API    │───▶│  Command      │───▶│  SSE/Push     │                   │  │
│   │   │  (trigger)    │    │  Store        │    │  Gateway      │                   │  │
│   │   └───────────────┘    └───────────────┘    └───────────────┘                   │  │
│   │                                                     │                            │  │
│   └─────────────────────────────────────────────────────┼────────────────────────────┘  │
│                                                         │                               │
│                                                         │ SSE/WebSocket/Polling         │
│                                                         ▼                               │
│   DATA PLANE (Agent Runtime)                                                            │
│   ──────────────────────────                                                            │
│                                                                                         │
│   ┌─────────────────────────────────────────────────────────────────────────────────┐  │
│   │                              KILL SWITCH CLIENT                                  │  │
│   │                                                                                  │  │
│   │   ┌───────────────┐    ┌───────────────┐    ┌───────────────┐                   │  │
│   │   │  SSE Listener │    │  Poll Timer   │    │  Local File   │                   │  │
│   │   │  (primary)    │    │  (fallback)   │    │  (offline)    │                   │  │
│   │   └───────┬───────┘    └───────┬───────┘    └───────┬───────┘                   │  │
│   │           │                    │                    │                            │  │
│   │           └────────────────────┴────────────────────┘                            │  │
│   │                                │                                                 │  │
│   │                                ▼                                                 │  │
│   │                    ┌─────────────────────┐                                       │  │
│   │                    │   Command Handler   │                                       │  │
│   │                    │                     │                                       │  │
│   │                    │  • Verify signature │                                       │  │
│   │                    │  • Check target     │                                       │  │
│   │                    │  • Execute action   │                                       │  │
│   │                    └──────────┬──────────┘                                       │  │
│   │                               │                                                  │  │
│   └───────────────────────────────┼──────────────────────────────────────────────────┘  │
│                                   │                                                     │
│                                   ▼                                                     │
│   ┌─────────────────────────────────────────────────────────────────────────────────┐  │
│   │                              AGENT RUNTIME                                       │  │
│   │                                                                                  │  │
│   │   Identity Manager ───▶ Revoke identity                                          │  │
│   │   Policy Engine    ───▶ Block all actions                                        │  │
│   │   Telemetry        ───▶ Emit termination span                                    │  │
│   │   Agent Code       ───▶ Graceful shutdown                                        │  │
│   │                                                                                  │  │
│   └─────────────────────────────────────────────────────────────────────────────────┘  │
│                                                                                         │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

### 2.2 Termination Flow

```
1. Operator triggers kill switch (API, UI, CLI)
       │
       ▼
2. Command signed and stored in Control Plane
       │
       ▼
3. Command delivered to agent(s) via:
   ├── SSE (real-time, preferred)
   ├── WebSocket (real-time, alternative)
   ├── Polling (fallback, every 30s)
   └── Local file (air-gapped, manual)
       │
       ▼
4. Agent's Kill Switch Client receives command
       │
       ▼
5. Verify command signature
       │
       ├── Invalid → Log and ignore
       │
       └── Valid → Continue
       │
       ▼
6. Check if this agent is targeted
       │
       ├── Not targeted → Log and ignore
       │
       └── Targeted → Continue
       │
       ▼
7. Execute termination:
   a. Set kill_switch_active = true
   b. Policy Engine blocks ALL actions
   c. Emit termination telemetry
   d. Notify child agents (cascade)
   e. Graceful shutdown
       │
       ▼
8. Agent process exits
```

---

## 3. Command Format

### 3.1 Kill Switch Command

```typescript
interface KillSwitchCommand {
  /** Unique command ID */
  id: string;
  
  /** Command type */
  type: 'TERMINATE' | 'PAUSE' | 'RESUME';
  
  /** Target specification */
  target: {
    /** Target type */
    type: 'instance' | 'asset' | 'organization' | 'all';
    
    /** Target identifier(s) */
    ids: string[];
  };
  
  /** Why this command was issued */
  reason: string;
  
  /** Who issued the command */
  issued_by: string;
  
  /** When the command was issued */
  issued_at: string;
  
  /** When the command expires (optional) */
  expires_at?: string;
  
  /** Cryptographic signature */
  signature: {
    algorithm: string;
    value: string;
    key_id: string;
  };
}
```

### 3.2 Example Commands

**Terminate Single Instance:**
```json
{
  "id": "cmd-123e4567-e89b-12d3",
  "type": "TERMINATE",
  "target": {
    "type": "instance",
    "ids": ["550e8400-e29b-41d4-a716-446655440000"]
  },
  "reason": "Security incident - potential data exfiltration",
  "issued_by": "ciso@corp.com",
  "issued_at": "2025-01-15T10:30:00Z",
  "signature": {
    "algorithm": "RSA-SHA256",
    "value": "MIIB...",
    "key_id": "key-001"
  }
}
```

**Terminate All Instances of an Asset:**
```json
{
  "id": "cmd-234f5678-f90c-23e4",
  "type": "TERMINATE",
  "target": {
    "type": "asset",
    "ids": ["fin-agent-001"]
  },
  "reason": "Policy violation - unauthorized data access",
  "issued_by": "security-team@corp.com",
  "issued_at": "2025-01-15T10:31:00Z"
}
```

**Pause Organization (Temporary):**
```json
{
  "id": "cmd-345g6789-g01d-34f5",
  "type": "PAUSE",
  "target": {
    "type": "organization",
    "ids": ["org-acme-corp"]
  },
  "reason": "Maintenance window",
  "issued_by": "ops@corp.com",
  "issued_at": "2025-01-15T10:32:00Z",
  "expires_at": "2025-01-15T12:00:00Z"
}
```

---

## 4. Delivery Mechanisms

### 4.1 Server-Sent Events (SSE) — Preferred

Real-time delivery via persistent HTTP connection.

```typescript
// Client-side
const eventSource = new EventSource(
  'https://control.aigos.dev/v1/commands/stream',
  {
    headers: {
      'Authorization': `Bearer ${token}`,
      'X-Agent-Instance-ID': instanceId,
    },
  }
);

eventSource.addEventListener('kill', (event) => {
  const command = JSON.parse(event.data);
  handleKillCommand(command);
});

eventSource.addEventListener('pause', (event) => {
  const command = JSON.parse(event.data);
  handlePauseCommand(command);
});
```

**SSE Reconnection:**
- Auto-reconnect with exponential backoff
- Max backoff: 30 seconds
- Resume from last event ID

### 4.2 Polling — Fallback

For environments where SSE is not available.

```typescript
async function pollForCommands(): Promise<void> {
  while (running) {
    try {
      const response = await fetch(
        'https://control.aigos.dev/v1/commands/pending',
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'X-Agent-Instance-ID': instanceId,
            'X-Last-Command-ID': lastCommandId,
          },
        }
      );
      
      const commands = await response.json();
      for (const command of commands) {
        await handleCommand(command);
        lastCommandId = command.id;
      }
    } catch (error) {
      logger.error('Poll failed', error);
    }
    
    await sleep(30_000);  // Poll every 30 seconds
  }
}
```

### 4.3 Local File — Offline/Air-Gapped

For air-gapped environments without network access.

```
# .aigrc/kill-switch.yaml (watched file)
commands:
  - id: cmd-local-001
    type: TERMINATE
    target:
      type: asset
      ids: ["*"]
    reason: "Manual kill switch activation"
    issued_by: "local-admin"
    issued_at: "2025-01-15T10:30:00Z"
```

**File Watch:**
```typescript
const watcher = fs.watch('.aigrc/kill-switch.yaml', (event) => {
  if (event === 'change') {
    const commands = loadKillSwitchFile();
    processCommands(commands);
  }
});
```

---

## 5. Command Types

### 5.1 TERMINATE

Immediately and permanently stop the agent.

**Behavior:**
1. Set `kill_switch_active = true`
2. Policy Engine rejects ALL permission requests
3. Current operations are interrupted
4. Emit termination telemetry
5. Cascade to child agents
6. Graceful shutdown (max 60s)
7. Process exits

**No Recovery:** Once terminated, agent cannot be resumed.

### 5.2 PAUSE

Temporarily suspend agent operations.

**Behavior:**
1. Set `agent_paused = true`
2. Policy Engine rejects new requests (returns `PAUSED`)
3. Current operations complete (timeout: 30s)
4. Agent remains running but idle
5. Does NOT cascade to children (optional)

**Recovery:** RESUME command re-enables operations.

### 5.3 RESUME

Resume a paused agent.

**Behavior:**
1. Verify agent is currently paused
2. Set `agent_paused = false`
3. Policy Engine resumes normal operation
4. Log resume event

---

## 6. Cascading Termination

### 6.1 Parent-Child Relationship

When a parent agent is terminated, all descendants MUST also terminate.

```
Parent (terminated)
    │
    ├── Child A (cascaded termination)
    │       │
    │       └── Grandchild A1 (cascaded termination)
    │
    └── Child B (cascaded termination)
            │
            ├── Grandchild B1 (cascaded termination)
            └── Grandchild B2 (cascaded termination)
```

### 6.2 Cascade Mechanism

**Option 1: Control Plane Cascade**
- Control plane issues commands to all descendants
- Requires lineage tracking in control plane

**Option 2: Agent-Side Cascade**
- Parent notifies children directly before shutdown
- Works in local-first mode

```typescript
async function handleTerminate(command: KillSwitchCommand): Promise<void> {
  // 1. Terminate self
  this.killSwitchActive = true;
  
  // 2. Notify children
  for (const childId of this.childInstanceIds) {
    await this.notifyChild(childId, {
      type: 'TERMINATE',
      reason: `Parent ${this.instanceId} terminated: ${command.reason}`,
      parent_command_id: command.id,
    });
  }
  
  // 3. Wait for children to acknowledge (max 10s)
  await this.waitForChildrenTermination(10_000);
  
  // 4. Shutdown self
  await this.shutdown();
}
```

---

## 7. Interface

### 7.1 TypeScript Interface

```typescript
interface IKillSwitch {
  /**
   * Starts the kill switch listener.
   */
  start(): Promise<void>;

  /**
   * Stops the kill switch listener.
   */
  stop(): Promise<void>;

  /**
   * Checks if kill switch is currently active.
   */
  isActive(): boolean;

  /**
   * Checks if agent is currently paused.
   */
  isPaused(): boolean;

  /**
   * Manually triggers local kill switch (for testing).
   */
  triggerLocal(reason: string): Promise<void>;

  /**
   * Registers callback for termination events.
   */
  onTerminate(callback: (reason: string) => void): void;

  /**
   * Registers callback for pause events.
   */
  onPause(callback: (reason: string) => void): void;

  /**
   * Registers callback for resume events.
   */
  onResume(callback: () => void): void;

  /**
   * Gets the last received command.
   */
  getLastCommand(): KillSwitchCommand | null;
}
```

### 7.2 Python Interface

```python
from typing import Callable, Optional
from dataclasses import dataclass

class KillSwitch:
    async def start(self) -> None:
        """Starts the kill switch listener."""
        ...
    
    async def stop(self) -> None:
        """Stops the kill switch listener."""
        ...
    
    def is_active(self) -> bool:
        """Checks if kill switch is currently active."""
        ...
    
    def is_paused(self) -> bool:
        """Checks if agent is currently paused."""
        ...
    
    async def trigger_local(self, reason: str) -> None:
        """Manually triggers local kill switch."""
        ...
    
    def on_terminate(self, callback: Callable[[str], None]) -> None:
        """Registers callback for termination events."""
        ...
    
    def on_pause(self, callback: Callable[[str], None]) -> None:
        """Registers callback for pause events."""
        ...
    
    def on_resume(self, callback: Callable[[], None]) -> None:
        """Registers callback for resume events."""
        ...
```

---

## 8. Security

### 8.1 Command Signing

All kill switch commands MUST be cryptographically signed:

```typescript
function verifyCommand(command: KillSwitchCommand): boolean {
  const publicKey = loadPublicKey(command.signature.key_id);
  
  // Canonicalize command (excluding signature)
  const canonical = canonicalize({
    id: command.id,
    type: command.type,
    target: command.target,
    reason: command.reason,
    issued_by: command.issued_by,
    issued_at: command.issued_at,
    expires_at: command.expires_at,
  });
  
  return crypto.verify(
    command.signature.algorithm,
    Buffer.from(canonical),
    publicKey,
    Buffer.from(command.signature.value, 'base64')
  );
}
```

### 8.2 Key Management

- Signing keys stored in HSM or secure KMS
- Public keys distributed with SDK or fetched from control plane
- Key rotation supported via `key_id` field
- Multiple keys can be active simultaneously

### 8.3 Replay Prevention

Commands include:

- Unique `id` (checked against seen commands)
- `issued_at` timestamp (reject if > 1 hour old)
- Optional `expires_at` for time-limited commands

```typescript
function isValidCommand(command: KillSwitchCommand): boolean {
  // Check not seen before
  if (seenCommandIds.has(command.id)) {
    return false;
  }
  
  // Check not too old
  const issuedAt = new Date(command.issued_at);
  const maxAge = 60 * 60 * 1000;  // 1 hour
  if (Date.now() - issuedAt.getTime() > maxAge) {
    return false;
  }
  
  // Check not expired
  if (command.expires_at) {
    const expiresAt = new Date(command.expires_at);
    if (Date.now() > expiresAt.getTime()) {
      return false;
    }
  }
  
  return true;
}
```

---

## 9. Performance Requirements

### 9.1 SLA: < 60 Seconds

From command issuance to agent termination: **< 60 seconds**.

| Phase | Target | Maximum |
|-------|--------|---------|
| Command creation & signing | < 100ms | 500ms |
| Control plane storage | < 100ms | 500ms |
| Delivery to agent | < 5s | 30s |
| Command verification | < 10ms | 100ms |
| Agent shutdown | < 30s | 60s |
| **Total** | **< 36s** | **< 91s** |

### 9.2 Availability

- SSE connection: 99.9% uptime
- Polling fallback: automatic on SSE failure
- Local file: always available

---

## 10. Configuration

### 10.1 Runtime Configuration

```yaml
# .aigrc.yaml
runtime:
  kill_switch:
    # Enable/disable kill switch
    enabled: true
    
    # Control plane endpoint
    endpoint: "https://control.aigos.dev"
    
    # Delivery mechanism preference
    delivery: "sse"  # sse | websocket | polling
    
    # Polling interval (if using polling)
    poll_interval_seconds: 30
    
    # Local kill switch file path
    local_file: ".aigrc/kill-switch.yaml"
    
    # Graceful shutdown timeout
    shutdown_timeout_seconds: 60
    
    # Whether to cascade to children
    cascade_to_children: true
```

---

## 11. Examples

### 11.1 Basic Integration

```typescript
const killSwitch = new KillSwitch(config);

// Register handlers
killSwitch.onTerminate((reason) => {
  logger.error(`Kill switch activated: ${reason}`);
  gracefulShutdown();
});

killSwitch.onPause((reason) => {
  logger.warn(`Agent paused: ${reason}`);
  pauseOperations();
});

// Start listening
await killSwitch.start();

// In policy engine hot path
if (killSwitch.isActive()) {
  throw new AgentTerminatedException('Kill switch active');
}

if (killSwitch.isPaused()) {
  throw new AgentPausedException('Agent is paused');
}
```

### 11.2 Testing Kill Switch

```typescript
// In test environment
const killSwitch = new KillSwitch({ ...config, enabled: true });

// Manually trigger for testing
await killSwitch.triggerLocal('Test termination');

// Verify agent stopped
expect(agent.isRunning()).toBe(false);
```

---

## 12. Conformance

### 12.1 Level 1 (Minimal)

- MUST support local file-based kill switch
- MUST terminate within 60 seconds
- MUST block all operations when active

### 12.2 Level 2 (Standard)

- MUST satisfy Level 1
- MUST support remote delivery (SSE or polling)
- MUST verify command signatures
- MUST emit telemetry on termination

### 12.3 Level 3 (Full)

- MUST satisfy Level 2
- MUST support PAUSE/RESUME commands
- MUST cascade to child agents
- MUST support multiple delivery mechanisms
- MUST implement replay prevention

---

## Appendix A: Changelog

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0-draft | 2025-12-29 | Initial draft |
