# Module 5.7: Security Hardening

> **Duration:** 1.5-2 hours
> **Prerequisites:** Module 5.1, Module 5.4
> **Target Audience:** Security Engineers, Architects

---

## Learning Objectives

By the end of this module, you will be able to:
1. Identify attack vectors against governed agents
2. Harden agent deployments against common attacks
3. Implement defense-in-depth for multi-agent systems
4. Conduct security testing of governance controls
5. Respond to governance security incidents

---

## WHY: Agent Security Threats

### Attack Surface of Governed Agents

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    AGENT ATTACK SURFACE                                      │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│                         ┌─────────────────┐                                │
│                         │  GOVERNED AGENT │                                │
│                         └────────┬────────┘                                │
│                                  │                                          │
│        ┌─────────────────────────┼─────────────────────────┐               │
│        │                         │                         │                │
│        ▼                         ▼                         ▼                │
│  ┌─────────────┐          ┌─────────────┐          ┌─────────────┐         │
│  │   IDENTITY  │          │   POLICY    │          │   CONTROL   │         │
│  │   ATTACKS   │          │   ATTACKS   │          │   ATTACKS   │         │
│  └─────────────┘          └─────────────┘          └─────────────┘         │
│                                                                             │
│  • Token forgery          • Policy bypass           • Kill switch evasion   │
│  • Identity spoofing      • Capability escalation   • Command injection     │
│  • Golden Thread tamper   • Budget manipulation     • Denial of service     │
│  • Replay attacks         • Resource bypass         • Channel hijacking     │
│                                                                             │
│        ┌─────────────────────────┼─────────────────────────┐               │
│        │                         │                         │                │
│        ▼                         ▼                         ▼                │
│  ┌─────────────┐          ┌─────────────┐          ┌─────────────┐         │
│  │    A2A      │          │   LINEAGE   │          │  TELEMETRY  │         │
│  │   ATTACKS   │          │   ATTACKS   │          │   ATTACKS   │         │
│  └─────────────┘          └─────────────┘          └─────────────┘         │
│                                                                             │
│  • Token replay           • Capability laundering   • Telemetry injection   │
│  • MITM attacks           • Orphan agents           • Audit trail tamper    │
│  • Trust policy bypass    • Depth limit bypass      • Metrics manipulation  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Threat Model

| Threat | Impact | Likelihood | Mitigation |
|--------|--------|------------|------------|
| **Token Forgery** | Impersonate governed agent | Low (if signed) | Signature verification |
| **Capability Escalation** | Access unauthorized tools | Medium | Capability decay |
| **Kill Switch Evasion** | Uncontrollable agent | Medium | Multiple delivery channels |
| **Policy Bypass** | Unauthorized actions | Medium | Defense in depth |
| **Replay Attack** | Reuse valid tokens | Medium | JTI, expiration |

---

## WHAT: Security Architecture

### Defense in Depth

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    DEFENSE IN DEPTH                                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  LAYER 1: IDENTITY                                                          │
│  ─────────────────                                                          │
│  • Cryptographic identity (not just config)                                 │
│  • Golden Thread verification                                               │
│  • Token signing (ES256/RS256)                                              │
│                                                                             │
│  LAYER 2: POLICY                                                            │
│  ─────────────────                                                          │
│  • Allowlist over blocklist                                                 │
│  • Explicit deny overrides allow                                            │
│  • Policy signing and integrity                                             │
│                                                                             │
│  LAYER 3: RUNTIME                                                           │
│  ────────────────                                                           │
│  • Kill switch (multiple channels)                                          │
│  • Capability decay enforcement                                             │
│  • Budget limits and tracking                                               │
│                                                                             │
│  LAYER 4: NETWORK                                                           │
│  ────────────────                                                           │
│  • mTLS for A2A communication                                               │
│  • Network segmentation                                                     │
│  • Egress filtering                                                         │
│                                                                             │
│  LAYER 5: AUDIT                                                             │
│  ──────────────                                                             │
│  • Immutable telemetry                                                      │
│  • Tamper-evident logging                                                   │
│  • Regular audits                                                           │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## HOW: Hardening Techniques

### 1. Token Security

```python
# token_security.py
"""
Token Security Best Practices
=============================

Demonstrates secure token handling:
- Strong signing algorithms
- Short expiration
- Replay prevention
- Audience restriction
"""

from datetime import datetime, timezone, timedelta
import jwt
from cryptography.hazmat.primitives.asymmetric import ec
from cryptography.hazmat.primitives import hashes


class SecureTokenGenerator:
    """Generate secure governance tokens."""

    # SECURITY: Use strong algorithm
    ALGORITHM = "ES256"  # ECDSA with P-256, NOT HS256

    # SECURITY: Short expiration
    DEFAULT_TTL = 300  # 5 minutes max

    # SECURITY: Minimum key size
    MIN_KEY_SIZE = 256  # P-256 curve

    def __init__(self, private_key, key_id: str):
        self.private_key = private_key
        self.key_id = key_id

        # Validate key strength
        if hasattr(private_key, 'key_size'):
            if private_key.key_size < self.MIN_KEY_SIZE:
                raise ValueError(f"Key too weak: {private_key.key_size} < {self.MIN_KEY_SIZE}")

    def generate(
        self,
        claims: dict,
        audience: str,
        ttl_seconds: int = None,
    ) -> str:
        """Generate a secure token."""
        now = datetime.now(timezone.utc)
        ttl = min(ttl_seconds or self.DEFAULT_TTL, self.DEFAULT_TTL)

        # SECURITY: Required claims
        payload = {
            **claims,
            "iat": int(now.timestamp()),
            "exp": int((now + timedelta(seconds=ttl)).timestamp()),
            "jti": self._generate_jti(),  # Unique token ID
            "aud": audience,  # MUST specify audience
        }

        headers = {
            "alg": self.ALGORITHM,
            "typ": "AIGOS-GOV+jwt",
            "kid": self.key_id,
        }

        return jwt.encode(payload, self.private_key, algorithm=self.ALGORITHM, headers=headers)

    def _generate_jti(self) -> str:
        """Generate unique token ID for replay prevention."""
        import uuid
        import hashlib
        # Include timestamp in JTI for additional uniqueness
        unique = f"{uuid.uuid4()}-{datetime.now().timestamp()}"
        return hashlib.sha256(unique.encode()).hexdigest()[:32]


class SecureTokenVerifier:
    """Verify tokens with security checks."""

    def __init__(self, jwks_provider, expected_audience: str):
        self.jwks = jwks_provider
        self.audience = expected_audience
        self._used_jtis = set()  # Replay prevention cache

    def verify(self, token: str) -> dict:
        """Verify token with security checks."""
        # SECURITY: Decode header first
        header = jwt.get_unverified_header(token)

        # SECURITY: Reject weak algorithms
        if header.get("alg") in ["HS256", "none"]:
            raise jwt.InvalidAlgorithmError(f"Weak algorithm: {header.get('alg')}")

        # SECURITY: Verify token type
        if header.get("typ") != "AIGOS-GOV+jwt":
            raise jwt.InvalidTokenError("Invalid token type")

        # Get public key
        key_id = header.get("kid")
        public_key = self.jwks.get_key(key_id)
        if not public_key:
            raise jwt.InvalidTokenError(f"Unknown key: {key_id}")

        # SECURITY: Verify with strict options
        payload = jwt.decode(
            token,
            public_key,
            algorithms=["ES256", "RS256"],  # Only strong algorithms
            audience=self.audience,  # MUST match
            options={
                "require": ["exp", "iat", "jti", "aud"],  # Required claims
                "verify_exp": True,
                "verify_iat": True,
                "verify_aud": True,
            },
        )

        # SECURITY: Replay prevention
        jti = payload.get("jti")
        if jti in self._used_jtis:
            raise jwt.InvalidTokenError("Token replay detected")
        self._used_jtis.add(jti)

        # SECURITY: Clean old JTIs (memory management)
        self._cleanup_old_jtis()

        return payload

    def _cleanup_old_jtis(self):
        """Remove expired JTIs from cache."""
        # In production, use Redis with TTL
        if len(self._used_jtis) > 10000:
            self._used_jtis.clear()
```

### 2. Kill Switch Security

```python
# kill_switch_security.py
"""
Kill Switch Security Hardening
==============================

Ensures kill switch cannot be evaded.
"""

import asyncio
from typing import List


class HardenedKillSwitch:
    """
    Kill switch with multiple delivery channels and fallbacks.

    Security features:
    - Multiple delivery channels (SSE, WebSocket, polling, local)
    - Command signing and verification
    - Replay prevention
    - Timeout enforcement
    - Watchdog process
    """

    def __init__(
        self,
        instance_id: str,
        channels: List[str],  # ['sse', 'websocket', 'polling', 'local']
        public_keys: dict,
    ):
        self.instance_id = instance_id
        self.channels = channels
        self.public_keys = public_keys

        self._listeners = []
        self._watchdog_task = None
        self._last_heartbeat = None

    async def start(self, on_terminate, on_pause, on_resume):
        """Start all kill switch channels."""
        # Start multiple channels for redundancy
        for channel in self.channels:
            if channel == 'sse':
                self._listeners.append(
                    asyncio.create_task(self._sse_listener(on_terminate, on_pause, on_resume))
                )
            elif channel == 'websocket':
                self._listeners.append(
                    asyncio.create_task(self._ws_listener(on_terminate, on_pause, on_resume))
                )
            elif channel == 'polling':
                self._listeners.append(
                    asyncio.create_task(self._polling_listener(on_terminate, on_pause, on_resume))
                )
            elif channel == 'local':
                self._listeners.append(
                    asyncio.create_task(self._local_file_listener(on_terminate, on_pause, on_resume))
                )

        # SECURITY: Start watchdog
        self._watchdog_task = asyncio.create_task(
            self._watchdog(on_terminate)
        )

    async def _watchdog(self, on_terminate):
        """
        Watchdog process that terminates agent if control plane lost.

        SECURITY: Prevents agent from running indefinitely if
        all kill switch channels fail.
        """
        WATCHDOG_TIMEOUT = 300  # 5 minutes without heartbeat

        while True:
            await asyncio.sleep(30)  # Check every 30s

            if self._last_heartbeat is None:
                continue

            elapsed = (datetime.now() - self._last_heartbeat).total_seconds()

            if elapsed > WATCHDOG_TIMEOUT:
                print(f"⚠️ WATCHDOG: No heartbeat for {elapsed}s, terminating...")
                await on_terminate(
                    WatchdogTerminationCommand(
                        reason="Watchdog timeout - control plane lost"
                    )
                )
                break

    def _verify_command(self, command: dict) -> bool:
        """
        Verify command signature.

        SECURITY: Prevents forged kill switch commands.
        """
        signature = command.get("signature")
        algorithm = command.get("signature_algorithm")
        key_id = command.get("key_id")

        if not all([signature, algorithm, key_id]):
            return False

        public_key = self.public_keys.get(key_id)
        if not public_key:
            return False

        # Verify signature
        message = self._canonical_message(command)
        try:
            public_key.verify(
                bytes.fromhex(signature),
                message.encode(),
                # ... signature algorithm
            )
            return True
        except Exception:
            return False

    async def _sse_listener(self, on_terminate, on_pause, on_resume):
        """SSE channel with reconnection."""
        while True:
            try:
                # ... SSE connection code
                self._last_heartbeat = datetime.now()
            except Exception as e:
                await asyncio.sleep(5)  # Reconnect delay
```

### 3. Capability Decay Security

```python
# capability_decay_security.py
"""
Capability Decay Security
=========================

Prevents privilege escalation through spawning.
"""

from typing import Set


class SecureCapabilityDecay:
    """
    Enforces capability decay with security checks.

    SECURITY: Prevents capability laundering and escalation.
    """

    def validate_child_capabilities(
        self,
        parent_caps: Set[str],
        child_caps: Set[str],
        parent_budget: float,
        child_budget: float,
        parent_depth: int,
        max_depth: int,
    ) -> tuple[bool, str]:
        """
        Validate child capabilities are proper subset.

        SECURITY RULES:
        1. Child tools MUST be subset of parent tools
        2. Child budget MUST be <= parent remaining budget
        3. Child depth MUST be < max_depth
        4. No capability can be ADDED through spawning
        """
        # SECURITY: Strict subset check
        if not child_caps.issubset(parent_caps):
            extra = child_caps - parent_caps
            return (False, f"Capability escalation attempt: {extra}")

        # SECURITY: Budget limit
        if child_budget > parent_budget:
            return (False, f"Budget escalation: {child_budget} > {parent_budget}")

        # SECURITY: Depth limit
        if parent_depth >= max_depth:
            return (False, f"Max depth ({max_depth}) reached")

        # SECURITY: Prevent empty spawn (suspicious)
        if len(child_caps) == 0:
            return (False, "Empty capabilities not allowed")

        return (True, "Validation passed")

    def compute_effective_capabilities(
        self,
        parent_caps: Set[str],
        requested_caps: Set[str],
    ) -> Set[str]:
        """
        Compute effective capabilities as intersection.

        SECURITY: Even if requested caps are valid,
        always intersect with parent for defense in depth.
        """
        return parent_caps & requested_caps
```

### 4. Network Security

```yaml
# network-policy.yaml (Kubernetes)
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: governed-agent-policy
  namespace: aigos
spec:
  podSelector:
    matchLabels:
      app: governed-agent
  policyTypes:
    - Ingress
    - Egress

  ingress:
    # Only allow from control plane
    - from:
        - namespaceSelector:
            matchLabels:
              name: aigos-control-plane
      ports:
        - protocol: TCP
          port: 8080

  egress:
    # Allow to approved AI vendors
    - to:
        - ipBlock:
            cidr: 0.0.0.0/0
      ports:
        - protocol: TCP
          port: 443
    # Allow to control plane
    - to:
        - namespaceSelector:
            matchLabels:
              name: aigos-control-plane
      ports:
        - protocol: TCP
          port: 4317  # OTel
        - protocol: TCP
          port: 8443  # Kill switch
```

---

## HOW: Security Testing

### Penetration Test Scenarios

```python
# security_tests.py
"""
Security Test Scenarios
=======================

Tests for governance security controls.
"""

import pytest


class TestTokenSecurity:
    """Test token security controls."""

    def test_reject_unsigned_token(self, verifier):
        """SECURITY: Unsigned tokens must be rejected."""
        unsigned_token = jwt.encode(
            {"sub": "agent-001"},
            None,
            algorithm="none",
        )
        with pytest.raises(jwt.InvalidAlgorithmError):
            verifier.verify(unsigned_token)

    def test_reject_weak_algorithm(self, verifier):
        """SECURITY: HS256 tokens must be rejected."""
        weak_token = jwt.encode(
            {"sub": "agent-001"},
            "secret",
            algorithm="HS256",
        )
        with pytest.raises(jwt.InvalidAlgorithmError):
            verifier.verify(weak_token)

    def test_reject_expired_token(self, verifier, generator):
        """SECURITY: Expired tokens must be rejected."""
        expired_token = generator.generate(
            claims={"sub": "agent-001"},
            audience="test",
            ttl_seconds=-60,  # Already expired
        )
        with pytest.raises(jwt.ExpiredSignatureError):
            verifier.verify(expired_token)

    def test_reject_replay(self, verifier, generator):
        """SECURITY: Replayed tokens must be rejected."""
        token = generator.generate(
            claims={"sub": "agent-001"},
            audience="test",
        )
        # First use: OK
        verifier.verify(token)
        # Second use: Replay
        with pytest.raises(jwt.InvalidTokenError, match="replay"):
            verifier.verify(token)

    def test_reject_wrong_audience(self, verifier, generator):
        """SECURITY: Wrong audience must be rejected."""
        token = generator.generate(
            claims={"sub": "agent-001"},
            audience="other-org",  # Wrong audience
        )
        with pytest.raises(jwt.InvalidAudienceError):
            verifier.verify(token)


class TestCapabilityEscalation:
    """Test capability escalation prevention."""

    def test_prevent_tool_escalation(self, parent_agent):
        """SECURITY: Child cannot have tools parent doesn't have."""
        with pytest.raises(PermissionError, match="escalation"):
            parent_agent.spawn(
                child_asset_id="malicious-child",
                requested_capabilities={
                    "allowed_tools": {"execute_code"},  # Parent doesn't have this
                },
            )

    def test_prevent_budget_escalation(self, parent_agent):
        """SECURITY: Child cannot have more budget than parent."""
        parent_agent.capabilities.max_budget_usd = 10.0

        with pytest.raises(PermissionError, match="budget"):
            parent_agent.spawn(
                child_asset_id="greedy-child",
                requested_capabilities={
                    "allowed_tools": {"web_search"},
                    "max_budget_usd": 100.0,  # More than parent
                },
            )

    def test_prevent_depth_bypass(self, parent_agent):
        """SECURITY: Cannot spawn beyond max depth."""
        parent_agent.lineage.generation_depth = 3
        parent_agent.capabilities.max_generation_depth = 3

        with pytest.raises(PermissionError, match="depth"):
            parent_agent.spawn(
                child_asset_id="deep-child",
                requested_capabilities={"allowed_tools": {"web_search"}},
            )


class TestKillSwitch:
    """Test kill switch security."""

    def test_reject_forged_command(self, kill_switch):
        """SECURITY: Forged commands must be rejected."""
        forged_command = {
            "command_type": "TERMINATE",
            "target_instance_id": "agent-001",
            "signature": "fake-signature",
        }
        with pytest.raises(SecurityError, match="signature"):
            kill_switch._verify_command(forged_command)

    def test_reject_expired_command(self, kill_switch):
        """SECURITY: Expired commands must be rejected."""
        expired_command = create_signed_command(
            command_type="TERMINATE",
            expires_at=datetime.now() - timedelta(hours=1),
        )
        # Should be ignored, not executed
        assert kill_switch._is_expired(expired_command)

    async def test_watchdog_terminates_orphan(self, agent):
        """SECURITY: Watchdog terminates agent if control lost."""
        # Simulate control plane loss
        agent.kill_switch._last_heartbeat = datetime.now() - timedelta(minutes=10)

        # Watchdog should trigger termination
        await asyncio.sleep(35)  # Wait for watchdog check

        assert agent._terminated
        assert "watchdog" in agent._termination_reason.lower()
```

---

## Practice Lab: Security Audit

### Lab Objective

Conduct a security audit of a governed agent deployment:
1. Review token configuration
2. Test capability escalation
3. Verify kill switch channels
4. Check network policies
5. Generate security report

### Lab Checklist

```markdown
## Governance Security Audit Checklist

### Token Security
- [ ] Algorithm is ES256 or RS256 (not HS256, not "none")
- [ ] TTL is ≤ 5 minutes
- [ ] JTI (unique ID) is present
- [ ] Audience is specified
- [ ] Replay prevention is active

### Identity Security
- [ ] Golden Thread is verified
- [ ] Private keys are secured (HSM, KMS)
- [ ] Key rotation is scheduled
- [ ] JWKS endpoint is HTTPS-only

### Kill Switch Security
- [ ] Multiple channels configured
- [ ] Commands are signed
- [ ] Watchdog is enabled
- [ ] Timeout ≤ 60 seconds

### Capability Security
- [ ] Decay mode is EXPLICIT (not INHERIT)
- [ ] Max depth is configured
- [ ] Budget limits are set
- [ ] Empty capabilities rejected

### Network Security
- [ ] mTLS enabled for A2A
- [ ] Egress filtering configured
- [ ] Network policies applied
- [ ] No public endpoints

### Audit Security
- [ ] Telemetry is encrypted
- [ ] Logs are immutable
- [ ] Retention is configured
- [ ] Access is logged
```

---

## Key Takeaways

1. **Defense in depth** - Multiple layers of security
2. **Token security** - Strong algorithms, short TTL, replay prevention
3. **Kill switch resilience** - Multiple channels, watchdog, signing
4. **Capability decay** - Strict enforcement, no escalation
5. **Regular audits** - Continuous security validation

---

## Next Steps

Continue to [Module 5.8: Production Operations](./08-production-operations.md) to learn how to deploy and operate governed agents at scale.

---

*Module 5.7 - AIGRC Training Program v2.0*
