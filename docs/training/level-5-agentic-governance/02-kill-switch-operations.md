# Module 5.2: Kill Switch Operations

> **Duration:** 1.5-2 hours
> **Prerequisites:** Module 5.1 Runtime Fundamentals
> **Target Audience:** SREs, Platform Engineers, Security Operations

---

## Learning Objectives

By the end of this module, you will be able to:
1. Explain why kill switches are essential for AI agent governance
2. Implement kill switch listeners using SSE, WebSocket, and polling
3. Handle TERMINATE, PAUSE, and RESUME commands correctly
4. Design cascading termination for multi-agent systems
5. Build operational runbooks for kill switch incidents

---

## WHY: The Need for Remote Termination

### The Runaway Agent Problem

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    WITHOUT KILL SWITCH                                       │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Time 0:00    Agent deployed with bug                                       │
│               ┌────────────────┐                                            │
│               │  Agent starts  │                                            │
│               └───────┬────────┘                                            │
│                       │                                                     │
│  Time 0:05    Bug causes infinite loop                                      │
│               ┌────────────────┐                                            │
│               │  Agent loops   │ ←── Burning $$, making bad decisions       │
│               └───────┬────────┘                                            │
│                       │                                                     │
│  Time 0:30    Team notices problem                                          │
│               ┌────────────────┐                                            │
│               │  "How do we    │ ←── No remote access                       │
│               │   stop it?"    │                                            │
│               └───────┬────────┘                                            │
│                       │                                                     │
│  Time 2:00    Finally kill container/process manually                       │
│               ┌────────────────┐                                            │
│               │  $500 spent    │ ←── Damage already done                    │
│               │  Bad data sent │                                            │
│               └────────────────┘                                            │
│                                                                             │
│  RESULT: 2+ hours of uncontrolled execution                                │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                    WITH KILL SWITCH                                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Time 0:00    Agent deployed with bug                                       │
│               ┌────────────────┐                                            │
│               │  Agent starts  │                                            │
│               │  Kill switch   │ ←── Listener active                        │
│               │  listener ON   │                                            │
│               └───────┬────────┘                                            │
│                       │                                                     │
│  Time 0:05    Bug causes infinite loop                                      │
│               ┌────────────────┐                                            │
│               │  Agent loops   │ ←── Still burning $$                       │
│               └───────┬────────┘                                            │
│                       │                                                     │
│  Time 0:30    Team notices, clicks "TERMINATE"                              │
│               ┌────────────────┐                                            │
│               │  Command sent  │ ←── SSE delivery < 5s                      │
│               └───────┬────────┘                                            │
│                       │                                                     │
│  Time 0:31    Agent receives, verifies, shuts down                          │
│               ┌────────────────┐                                            │
│               │  TERMINATED    │ ←── Clean shutdown < 30s                   │
│               │  $5 spent      │                                            │
│               └────────────────┘                                            │
│                                                                             │
│  RESULT: < 60 seconds from command to termination                           │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Kill Switch SLA

| Phase | Target | Maximum |
|-------|--------|---------|
| Command issuance | < 100ms | 500ms |
| Delivery to agent | < 5s | 30s |
| Signature verification | < 10ms | 50ms |
| Agent shutdown | < 30s | 60s |
| **Total** | **< 35s** | **< 60s** |

---

## WHAT: Kill Switch Architecture

### Command Types

| Command | Effect | Reversible |
|---------|--------|------------|
| **TERMINATE** | Permanent shutdown, cleanup | No |
| **PAUSE** | Suspend execution, maintain state | Yes |
| **RESUME** | Reactivate paused agent | N/A |

### Delivery Mechanisms

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    DELIVERY MECHANISMS                                       │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  1. SSE (Server-Sent Events) - PREFERRED                                    │
│  ──────────────────────────────────────                                     │
│  ┌─────────────┐          ┌─────────────┐                                  │
│  │   Control   │ ──SSE──► │   Agent     │  Real-time, low latency          │
│  │   Plane     │          │   Listener  │  Recommended for cloud           │
│  └─────────────┘          └─────────────┘                                  │
│                                                                             │
│  2. WebSocket - ALTERNATIVE                                                 │
│  ───────────────────────────                                                │
│  ┌─────────────┐          ┌─────────────┐                                  │
│  │   Control   │ ◄──WS──► │   Agent     │  Bidirectional, heartbeat        │
│  │   Plane     │          │   Listener  │  Good for interactive            │
│  └─────────────┘          └─────────────┘                                  │
│                                                                             │
│  3. Polling - FALLBACK                                                      │
│  ─────────────────────                                                      │
│  ┌─────────────┐          ┌─────────────┐                                  │
│  │   Control   │ ◄─HTTP─► │   Agent     │  Every 30s, simple               │
│  │   Plane     │   poll   │   Poller    │  Fallback when others fail       │
│  └─────────────┘          └─────────────┘                                  │
│                                                                             │
│  4. Local File - AIR-GAPPED                                                 │
│  ──────────────────────────                                                 │
│  ┌─────────────┐          ┌─────────────┐                                  │
│  │  kill.cmd   │ ◄─read─► │   Agent     │  File-based, no network          │
│  │  (file)     │          │   Watcher   │  For air-gapped environments     │
│  └─────────────┘          └─────────────┘                                  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Command Structure

```python
@dataclass
class KillSwitchCommand:
    """Kill switch command structure."""

    # Command identification
    command_id: str              # Unique ID (UUIDv4)
    command_type: Literal["TERMINATE", "PAUSE", "RESUME"]

    # Target identification
    target_instance_id: str      # Specific agent instance
    target_asset_id: Optional[str] = None  # All instances of asset

    # Authorization
    issued_by: str               # Who issued the command
    issued_at: datetime          # When issued (ISO 8601)

    # Security
    signature: str               # RSA-SHA256 or ECDSA signature
    signature_algorithm: str     # "RS256" or "ES256"

    # Execution parameters
    reason: str                  # Human-readable reason
    cascade: bool = True         # Terminate children too
    grace_period_seconds: int = 30  # Time for cleanup

    # Replay prevention
    expires_at: datetime         # Command expiration
    nonce: str                   # One-time use token
```

---

## HOW: Implementing Kill Switch

### Step 1: SSE Listener Implementation

```python
# kill_switch.py
"""
Kill Switch Implementation
==========================

Implements the kill switch listener with:
- SSE (primary), WebSocket (backup), Polling (fallback)
- Command signature verification
- Graceful shutdown handling
- Cascading termination for children
"""

import asyncio
import hashlib
import json
from datetime import datetime, timezone
from typing import Callable, Optional, Set
from dataclasses import dataclass
from enum import Enum
import aiohttp
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import padding, ec
from cryptography.exceptions import InvalidSignature


class CommandType(Enum):
    TERMINATE = "TERMINATE"
    PAUSE = "PAUSE"
    RESUME = "RESUME"


@dataclass
class KillSwitchCommand:
    command_id: str
    command_type: CommandType
    target_instance_id: str
    target_asset_id: Optional[str]
    issued_by: str
    issued_at: datetime
    signature: str
    signature_algorithm: str
    reason: str
    cascade: bool
    grace_period_seconds: int
    expires_at: datetime
    nonce: str


class KillSwitchListener:
    """
    Kill switch listener for governed agents.

    Supports multiple delivery mechanisms:
    - SSE (Server-Sent Events) - primary
    - WebSocket - backup
    - Polling - fallback

    SLA: < 60 seconds from command to termination
    """

    def __init__(
        self,
        instance_id: str,
        asset_id: str,
        control_plane_url: str,
        public_key_pem: str,
        on_terminate: Optional[Callable] = None,
        on_pause: Optional[Callable] = None,
        on_resume: Optional[Callable] = None,
    ):
        self.instance_id = instance_id
        self.asset_id = asset_id
        self.control_plane_url = control_plane_url
        self.public_key = serialization.load_pem_public_key(
            public_key_pem.encode()
        )

        # Callbacks
        self._on_terminate = on_terminate
        self._on_pause = on_pause
        self._on_resume = on_resume

        # State
        self._running = False
        self._paused = False
        self._processed_commands: Set[str] = set()  # Replay prevention

        # Background tasks
        self._listener_task: Optional[asyncio.Task] = None
        self._fallback_task: Optional[asyncio.Task] = None

    async def start(self) -> None:
        """Start the kill switch listener."""
        print(f"🔴 Starting kill switch listener...")
        print(f"   Instance: {self.instance_id}")
        print(f"   Control plane: {self.control_plane_url}")

        self._running = True

        # Start SSE listener (primary)
        self._listener_task = asyncio.create_task(
            self._sse_listener()
        )

        # Start polling fallback
        self._fallback_task = asyncio.create_task(
            self._polling_fallback()
        )

        print(f"✅ Kill switch listener active")

    async def stop(self) -> None:
        """Stop the kill switch listener."""
        self._running = False

        if self._listener_task:
            self._listener_task.cancel()
        if self._fallback_task:
            self._fallback_task.cancel()

    async def _sse_listener(self) -> None:
        """
        Primary: SSE (Server-Sent Events) listener.

        Maintains persistent connection for real-time commands.
        Reconnects automatically on disconnect.
        """
        sse_url = f"{self.control_plane_url}/agents/{self.instance_id}/commands/stream"

        while self._running:
            try:
                async with aiohttp.ClientSession() as session:
                    async with session.get(
                        sse_url,
                        headers={"Accept": "text/event-stream"},
                    ) as response:
                        print(f"📡 SSE connected to {sse_url}")

                        async for line in response.content:
                            if not self._running:
                                break

                            line = line.decode().strip()

                            # SSE format: data: {...}
                            if line.startswith("data: "):
                                data = line[6:]
                                await self._handle_command_json(data)

            except aiohttp.ClientError as e:
                print(f"⚠️  SSE connection error: {e}")
                if self._running:
                    print(f"   Reconnecting in 5s...")
                    await asyncio.sleep(5)

            except asyncio.CancelledError:
                break

    async def _polling_fallback(self) -> None:
        """
        Fallback: HTTP polling every 30 seconds.

        Used when SSE/WebSocket unavailable.
        Higher latency but guaranteed delivery.
        """
        poll_url = f"{self.control_plane_url}/agents/{self.instance_id}/commands/pending"

        while self._running:
            try:
                await asyncio.sleep(30)  # Poll interval

                async with aiohttp.ClientSession() as session:
                    async with session.get(poll_url) as response:
                        if response.status == 200:
                            commands = await response.json()
                            for cmd in commands:
                                await self._handle_command_json(
                                    json.dumps(cmd)
                                )

            except aiohttp.ClientError as e:
                print(f"⚠️  Polling error: {e}")

            except asyncio.CancelledError:
                break

    async def _handle_command_json(self, data: str) -> None:
        """Parse and handle a command from JSON."""
        try:
            cmd_dict = json.loads(data)
            command = self._parse_command(cmd_dict)
            await self._handle_command(command)

        except json.JSONDecodeError as e:
            print(f"❌ Invalid JSON: {e}")
        except Exception as e:
            print(f"❌ Command handling error: {e}")

    def _parse_command(self, data: dict) -> KillSwitchCommand:
        """Parse command from dictionary."""
        return KillSwitchCommand(
            command_id=data["command_id"],
            command_type=CommandType(data["command_type"]),
            target_instance_id=data["target_instance_id"],
            target_asset_id=data.get("target_asset_id"),
            issued_by=data["issued_by"],
            issued_at=datetime.fromisoformat(data["issued_at"]),
            signature=data["signature"],
            signature_algorithm=data["signature_algorithm"],
            reason=data["reason"],
            cascade=data.get("cascade", True),
            grace_period_seconds=data.get("grace_period_seconds", 30),
            expires_at=datetime.fromisoformat(data["expires_at"]),
            nonce=data["nonce"],
        )

    async def _handle_command(self, command: KillSwitchCommand) -> None:
        """
        Handle a kill switch command.

        Steps:
        1. Check if command is for this agent
        2. Check for replay (already processed)
        3. Check expiration
        4. Verify signature
        5. Execute command
        """
        print(f"\n🚨 Received kill switch command:")
        print(f"   Type: {command.command_type.value}")
        print(f"   From: {command.issued_by}")
        print(f"   Reason: {command.reason}")

        # Step 1: Check target
        if (command.target_instance_id != self.instance_id and
            command.target_instance_id != "*" and
            command.target_asset_id != self.asset_id):
            print(f"   ⏭️  Not for this agent, ignoring")
            return

        # Step 2: Replay prevention
        if command.command_id in self._processed_commands:
            print(f"   ⏭️  Already processed, ignoring replay")
            return

        # Step 3: Check expiration
        now = datetime.now(timezone.utc)
        if command.expires_at < now:
            print(f"   ⏭️  Command expired at {command.expires_at}")
            return

        # Step 4: Verify signature
        if not self._verify_signature(command):
            print(f"   ❌ Invalid signature, rejecting")
            return

        print(f"   ✅ Signature verified")

        # Mark as processed (replay prevention)
        self._processed_commands.add(command.command_id)

        # Step 5: Execute command
        if command.command_type == CommandType.TERMINATE:
            await self._execute_terminate(command)

        elif command.command_type == CommandType.PAUSE:
            await self._execute_pause(command)

        elif command.command_type == CommandType.RESUME:
            await self._execute_resume(command)

    def _verify_signature(self, command: KillSwitchCommand) -> bool:
        """
        Verify command signature.

        Supports RS256 (RSA) and ES256 (ECDSA).
        """
        # Create canonical message for verification
        message = self._canonical_message(command)
        signature_bytes = bytes.fromhex(command.signature)

        try:
            if command.signature_algorithm == "RS256":
                self.public_key.verify(
                    signature_bytes,
                    message.encode(),
                    padding.PKCS1v15(),
                    hashes.SHA256(),
                )
            elif command.signature_algorithm == "ES256":
                self.public_key.verify(
                    signature_bytes,
                    message.encode(),
                    ec.ECDSA(hashes.SHA256()),
                )
            else:
                print(f"   Unknown algorithm: {command.signature_algorithm}")
                return False

            return True

        except InvalidSignature:
            return False

    def _canonical_message(self, command: KillSwitchCommand) -> str:
        """Create canonical message for signature verification."""
        parts = [
            f"command_id={command.command_id}",
            f"command_type={command.command_type.value}",
            f"target_instance_id={command.target_instance_id}",
            f"issued_by={command.issued_by}",
            f"issued_at={command.issued_at.isoformat()}",
            f"nonce={command.nonce}",
        ]
        return "|".join(sorted(parts))

    async def _execute_terminate(self, command: KillSwitchCommand) -> None:
        """Execute TERMINATE command."""
        print(f"\n💀 TERMINATING agent...")
        print(f"   Grace period: {command.grace_period_seconds}s")
        print(f"   Cascade to children: {command.cascade}")

        self._running = False

        # Call cleanup callback
        if self._on_terminate:
            try:
                print(f"   Running cleanup handler...")
                await asyncio.wait_for(
                    self._on_terminate(command),
                    timeout=command.grace_period_seconds,
                )
                print(f"   ✅ Cleanup complete")
            except asyncio.TimeoutError:
                print(f"   ⚠️  Cleanup timed out after {command.grace_period_seconds}s")
            except Exception as e:
                print(f"   ❌ Cleanup error: {e}")

        print(f"💀 Agent terminated")

        # Exit the process
        import sys
        sys.exit(0)

    async def _execute_pause(self, command: KillSwitchCommand) -> None:
        """Execute PAUSE command."""
        print(f"\n⏸️  PAUSING agent...")

        self._paused = True

        if self._on_pause:
            await self._on_pause(command)

        print(f"⏸️  Agent paused - awaiting RESUME")

    async def _execute_resume(self, command: KillSwitchCommand) -> None:
        """Execute RESUME command."""
        if not self._paused:
            print(f"   Agent not paused, ignoring RESUME")
            return

        print(f"\n▶️  RESUMING agent...")

        self._paused = False

        if self._on_resume:
            await self._on_resume(command)

        print(f"▶️  Agent resumed")

    @property
    def is_paused(self) -> bool:
        """Check if agent is paused."""
        return self._paused


class GovernedAgentWithKillSwitch:
    """Example governed agent with kill switch integration."""

    def __init__(self, instance_id: str, asset_id: str):
        self.instance_id = instance_id
        self.asset_id = asset_id

        # Kill switch listener
        self.kill_switch = KillSwitchListener(
            instance_id=instance_id,
            asset_id=asset_id,
            control_plane_url="https://control.aigos.example.com",
            public_key_pem=CONTROL_PLANE_PUBLIC_KEY,
            on_terminate=self._on_terminate,
            on_pause=self._on_pause,
            on_resume=self._on_resume,
        )

        # Agent state
        self._state = {}
        self._children: list = []

    async def start(self) -> None:
        """Start the agent with kill switch."""
        print(f"🚀 Starting governed agent {self.instance_id}...")

        # Start kill switch listener FIRST
        await self.kill_switch.start()

        # Then initialize agent...
        print(f"✅ Agent started")

    async def execute(self, tool: str, **kwargs) -> dict:
        """Execute an action, respecting pause state."""

        # Check if paused
        if self.kill_switch.is_paused:
            raise RuntimeError("Agent is paused - cannot execute actions")

        # Normal execution...
        return {"result": f"Executed {tool}"}

    async def _on_terminate(self, command: KillSwitchCommand) -> None:
        """Handle termination - cleanup and cascade."""
        print(f"   Saving state...")
        await self._save_state()

        print(f"   Notifying coordinator...")
        await self._notify_coordinator("terminated", command.reason)

        # Cascade to children
        if command.cascade and self._children:
            print(f"   Terminating {len(self._children)} children...")
            for child in self._children:
                await child.terminate(reason=f"Parent terminated: {command.reason}")

    async def _on_pause(self, command: KillSwitchCommand) -> None:
        """Handle pause - save state, pause children."""
        print(f"   Saving state for resume...")
        await self._save_state()

        # Pause children
        for child in self._children:
            await child.pause(reason=f"Parent paused: {command.reason}")

    async def _on_resume(self, command: KillSwitchCommand) -> None:
        """Handle resume - restore state, resume children."""
        print(f"   Restoring state...")
        await self._restore_state()

        # Resume children
        for child in self._children:
            await child.resume()

    async def _save_state(self) -> None:
        """Save agent state for recovery."""
        # Implementation: save to Redis, file, etc.
        pass

    async def _restore_state(self) -> None:
        """Restore agent state after pause."""
        pass

    async def _notify_coordinator(self, event: str, reason: str) -> None:
        """Notify coordinator of lifecycle event."""
        pass


# Public key for signature verification (example)
CONTROL_PLANE_PUBLIC_KEY = """
-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA0Z3VS5JJcds3xfn/ygWyG
... (actual key here)
-----END PUBLIC KEY-----
"""
```

### Step 2: Cascading Termination

```python
# cascading_termination.py
"""
Cascading Termination
=====================

When a parent agent is terminated, all children must also terminate.
This prevents orphaned agents running without governance.
"""

from typing import List, Optional
import asyncio


class AgentLineage:
    """Manages parent-child relationships for cascading termination."""

    def __init__(self):
        self._parent: Optional['GovernedAgent'] = None
        self._children: List['GovernedAgent'] = []

    def set_parent(self, parent: 'GovernedAgent') -> None:
        """Set this agent's parent."""
        self._parent = parent

    def add_child(self, child: 'GovernedAgent') -> None:
        """Register a child agent."""
        self._children.append(child)
        child.lineage.set_parent(self)

    def remove_child(self, child: 'GovernedAgent') -> None:
        """Unregister a child agent."""
        self._children.remove(child)

    async def cascade_terminate(self, reason: str) -> None:
        """
        Terminate all children recursively.

        Order: depth-first (terminate grandchildren before children)
        """
        # First, cascade to children (they will cascade to grandchildren)
        termination_tasks = []
        for child in self._children:
            task = asyncio.create_task(
                child.terminate(reason=f"Parent cascade: {reason}")
            )
            termination_tasks.append(task)

        # Wait for all children to terminate
        if termination_tasks:
            await asyncio.gather(*termination_tasks, return_exceptions=True)

    async def cascade_pause(self, reason: str) -> None:
        """Pause all children recursively."""
        for child in self._children:
            await child.pause(reason=f"Parent cascade: {reason}")

    async def cascade_resume(self) -> None:
        """Resume all children recursively."""
        for child in self._children:
            await child.resume()
```

### Step 3: Control Plane API

```python
# control_plane.py (server-side)
"""
Kill Switch Control Plane
=========================

Server-side API for issuing kill switch commands.
Used by operations teams and automated monitoring.
"""

from fastapi import FastAPI, HTTPException
from fastapi.responses import StreamingResponse
from datetime import datetime, timezone, timedelta
import asyncio
import json
import uuid
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import padding

app = FastAPI(title="AIGOS Control Plane")

# In-memory storage (use Redis in production)
pending_commands: dict = {}
agent_connections: dict = {}


@app.post("/agents/{instance_id}/terminate")
async def terminate_agent(
    instance_id: str,
    reason: str,
    issued_by: str,
    cascade: bool = True,
    grace_period: int = 30,
):
    """
    Issue TERMINATE command to an agent.

    Returns immediately - delivery is asynchronous.
    """
    command = create_signed_command(
        command_type="TERMINATE",
        target_instance_id=instance_id,
        issued_by=issued_by,
        reason=reason,
        cascade=cascade,
        grace_period_seconds=grace_period,
    )

    # Queue for delivery
    if instance_id not in pending_commands:
        pending_commands[instance_id] = []
    pending_commands[instance_id].append(command)

    # Push via SSE if connected
    if instance_id in agent_connections:
        await agent_connections[instance_id].put(command)

    return {
        "command_id": command["command_id"],
        "status": "queued",
        "message": f"TERMINATE command queued for {instance_id}",
    }


@app.post("/agents/{instance_id}/pause")
async def pause_agent(instance_id: str, reason: str, issued_by: str):
    """Issue PAUSE command to an agent."""
    command = create_signed_command(
        command_type="PAUSE",
        target_instance_id=instance_id,
        issued_by=issued_by,
        reason=reason,
    )

    if instance_id not in pending_commands:
        pending_commands[instance_id] = []
    pending_commands[instance_id].append(command)

    if instance_id in agent_connections:
        await agent_connections[instance_id].put(command)

    return {"command_id": command["command_id"], "status": "queued"}


@app.post("/agents/{instance_id}/resume")
async def resume_agent(instance_id: str, issued_by: str):
    """Issue RESUME command to an agent."""
    command = create_signed_command(
        command_type="RESUME",
        target_instance_id=instance_id,
        issued_by=issued_by,
        reason="Operator resumed",
    )

    if instance_id not in pending_commands:
        pending_commands[instance_id] = []
    pending_commands[instance_id].append(command)

    if instance_id in agent_connections:
        await agent_connections[instance_id].put(command)

    return {"command_id": command["command_id"], "status": "queued"}


@app.get("/agents/{instance_id}/commands/stream")
async def command_stream(instance_id: str):
    """
    SSE endpoint for real-time command delivery.

    Agents maintain persistent connection here.
    """
    async def event_generator():
        queue = asyncio.Queue()
        agent_connections[instance_id] = queue

        try:
            # Send any pending commands first
            if instance_id in pending_commands:
                for cmd in pending_commands[instance_id]:
                    yield f"data: {json.dumps(cmd)}\n\n"
                pending_commands[instance_id] = []

            # Wait for new commands
            while True:
                command = await queue.get()
                yield f"data: {json.dumps(command)}\n\n"

        finally:
            del agent_connections[instance_id]

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
    )


@app.get("/agents/{instance_id}/commands/pending")
async def get_pending_commands(instance_id: str):
    """
    Polling endpoint for agents that can't use SSE.

    Returns and clears pending commands.
    """
    commands = pending_commands.get(instance_id, [])
    pending_commands[instance_id] = []
    return commands


def create_signed_command(
    command_type: str,
    target_instance_id: str,
    issued_by: str,
    reason: str,
    cascade: bool = True,
    grace_period_seconds: int = 30,
) -> dict:
    """Create a signed kill switch command."""
    now = datetime.now(timezone.utc)

    command = {
        "command_id": str(uuid.uuid4()),
        "command_type": command_type,
        "target_instance_id": target_instance_id,
        "target_asset_id": None,
        "issued_by": issued_by,
        "issued_at": now.isoformat(),
        "reason": reason,
        "cascade": cascade,
        "grace_period_seconds": grace_period_seconds,
        "expires_at": (now + timedelta(minutes=5)).isoformat(),
        "nonce": str(uuid.uuid4()),
        "signature_algorithm": "RS256",
    }

    # Sign the command
    command["signature"] = sign_command(command)

    return command


def sign_command(command: dict) -> str:
    """Sign command with control plane private key."""
    # Create canonical message
    parts = [
        f"command_id={command['command_id']}",
        f"command_type={command['command_type']}",
        f"target_instance_id={command['target_instance_id']}",
        f"issued_by={command['issued_by']}",
        f"issued_at={command['issued_at']}",
        f"nonce={command['nonce']}",
    ]
    message = "|".join(sorted(parts))

    # Sign with private key
    signature = PRIVATE_KEY.sign(
        message.encode(),
        padding.PKCS1v15(),
        hashes.SHA256(),
    )

    return signature.hex()


# Load private key (from secure storage in production)
PRIVATE_KEY = serialization.load_pem_private_key(
    open("/secrets/control-plane-key.pem", "rb").read(),
    password=None,
)
```

---

## Practice Lab: Kill Switch Incident Response

### Scenario

A production agent is behaving erratically - making excessive API calls and burning budget. You need to terminate it immediately.

### Lab Setup

```bash
# Terminal 1: Start control plane
uvicorn control_plane:app --port 8000

# Terminal 2: Start governed agent
python governed_agent.py

# Terminal 3: Operations terminal (for issuing commands)
```

### Lab Steps

#### Step 1: Verify Agent is Running

```bash
# Check agent status
curl http://localhost:8000/agents/status

# Expected: Agent instance ID and status
```

#### Step 2: Observe Erratic Behavior

```bash
# Watch agent logs showing excessive API calls
# Notice budget consumption increasing rapidly
```

#### Step 3: Issue PAUSE Command

```bash
# Pause the agent to stop execution
curl -X POST "http://localhost:8000/agents/{instance_id}/pause" \
  -H "Content-Type: application/json" \
  -d '{
    "reason": "Erratic behavior - excessive API calls",
    "issued_by": "ops-team@company.com"
  }'

# Verify agent is paused
curl http://localhost:8000/agents/{instance_id}/status
```

#### Step 4: Investigate

```bash
# Check telemetry for what went wrong
# Review recent decisions and violations
```

#### Step 5: Decide: RESUME or TERMINATE

**Option A: Issue resolved, resume:**
```bash
curl -X POST "http://localhost:8000/agents/{instance_id}/resume" \
  -H "Content-Type: application/json" \
  -d '{"issued_by": "ops-team@company.com"}'
```

**Option B: Issue critical, terminate:**
```bash
curl -X POST "http://localhost:8000/agents/{instance_id}/terminate" \
  -H "Content-Type: application/json" \
  -d '{
    "reason": "Critical: Unable to fix erratic behavior",
    "issued_by": "ops-team@company.com",
    "cascade": true,
    "grace_period": 10
  }'
```

#### Step 6: Verify Termination

```bash
# Check agent is terminated
curl http://localhost:8000/agents/{instance_id}/status
# Expected: 404 or "terminated" status

# Check children also terminated (if cascade=true)
```

### Lab Validation

- [ ] Agent paused within 60 seconds of PAUSE command
- [ ] Agent resumed correctly after RESUME
- [ ] Agent terminated within 60 seconds of TERMINATE
- [ ] Children terminated (cascade)
- [ ] Cleanup handler executed
- [ ] Telemetry shows all events

---

## SRE Runbook: Kill Switch Operations

### Runbook: Emergency Agent Termination

```markdown
# RUNBOOK: Emergency Agent Termination

## Trigger Conditions
- Agent budget exceeded by >200%
- Agent making unauthorized API calls
- Security team requests immediate shutdown
- Customer reports agent misbehavior

## Pre-Flight Checks
1. [ ] Confirm agent instance ID from alerts
2. [ ] Verify you have control plane access
3. [ ] Check if agent has children (cascade impact)
4. [ ] Notify on-call team in Slack #incidents

## Execution Steps

### Step 1: Pause (if time permits)
```bash
curl -X POST "https://control.aigos.company.com/agents/{INSTANCE_ID}/pause" \
  -H "Authorization: Bearer $CONTROL_PLANE_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "reason": "INCIDENT-{NUMBER}: {BRIEF_DESCRIPTION}",
    "issued_by": "{YOUR_EMAIL}"
  }'
```

### Step 2: Verify Pause
```bash
curl "https://control.aigos.company.com/agents/{INSTANCE_ID}/status"
# Expected: {"status": "paused"}
```

### Step 3: Terminate (if needed)
```bash
curl -X POST "https://control.aigos.company.com/agents/{INSTANCE_ID}/terminate" \
  -H "Authorization: Bearer $CONTROL_PLANE_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "reason": "INCIDENT-{NUMBER}: {BRIEF_DESCRIPTION}",
    "issued_by": "{YOUR_EMAIL}",
    "cascade": true,
    "grace_period": 30
  }'
```

### Step 4: Verify Termination
```bash
# Check telemetry for termination event
# Verify no more API calls from agent
# Confirm children terminated
```

## Post-Incident
1. [ ] Update incident ticket
2. [ ] Collect telemetry for RCA
3. [ ] Notify stakeholders
4. [ ] Schedule post-mortem if needed

## Escalation
- If command not delivered in 60s: Page infrastructure team
- If agent doesn't terminate: Contact platform engineering
- If cascade fails: Manual child termination required
```

### Runbook: Kill Switch Health Check

```markdown
# RUNBOOK: Kill Switch Health Check (Daily)

## Purpose
Verify kill switch infrastructure is operational.

## Steps

### 1. Check Control Plane
```bash
curl https://control.aigos.company.com/health
# Expected: {"status": "healthy", "version": "1.x.x"}
```

### 2. Check SSE Connectivity
```bash
# From test agent, verify SSE connection maintained
curl https://control.aigos.company.com/agents/test-agent/commands/stream \
  --max-time 5
# Expected: Connection established (no timeout)
```

### 3. Test Command Delivery (Staging)
```bash
# Issue test PAUSE to staging agent
curl -X POST "https://control.aigos.company.com/agents/staging-test/pause" \
  -d '{"reason": "Health check", "issued_by": "automation"}'

# Verify delivery time < 5s in telemetry
```

### 4. Verify Metrics
- Kill switch command latency P99 < 5s
- SSE connection count = expected agent count
- Command queue depth = 0 (no stuck commands)

## Alert Thresholds
- Command latency > 30s: PAGE
- SSE disconnections > 10%: WARN
- Failed commands > 0: INVESTIGATE
```

---

## Knowledge Check

1. **What is the SLA for kill switch termination?**
   - a) < 10 seconds
   - b) < 60 seconds ✓
   - c) < 5 minutes
   - d) < 1 hour

2. **Which delivery mechanism is preferred?**
   - a) Polling
   - b) WebSocket
   - c) SSE (Server-Sent Events) ✓
   - d) Email

3. **What happens when a parent agent is terminated with cascade=true?**
   - a) Only parent terminates
   - b) Children are orphaned
   - c) Children also terminate ✓
   - d) Children are adopted by root

4. **Why are commands signed?**
   - a) For encryption
   - b) To prevent unauthorized termination ✓
   - c) For compression
   - d) For logging

5. **What does PAUSE do differently than TERMINATE?**
   - a) Nothing, they're the same
   - b) PAUSE is reversible, TERMINATE is permanent ✓
   - c) PAUSE is faster
   - d) PAUSE kills children

---

## Key Takeaways

1. **Kill switch is mandatory** - Every governed agent must have remote termination capability
2. **< 60 second SLA** - Commands must be delivered and executed quickly
3. **Multiple delivery mechanisms** - SSE primary, polling fallback
4. **Commands are signed** - Cryptographic verification prevents unauthorized termination
5. **Cascade is default** - Parent termination should terminate children
6. **Runbooks are essential** - Document procedures for operations teams

---

## Next Steps

Continue to [Module 5.3: Multi-Agent Architecture](./03-multi-agent-architecture.md) to learn how to design governed agent hierarchies with capability decay.

---

*Module 5.2 - AIGRC Training Program v2.0*
