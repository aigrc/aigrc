# Module 5.4: Agent-to-Agent Trust (A2A)

> **Duration:** 2-3 hours
> **Prerequisites:** Module 5.1, Module 5.3
> **Target Audience:** Senior Developers, Security Engineers, Architects

---

## Learning Objectives

By the end of this module, you will be able to:
1. Explain why agent-to-agent trust is critical for multi-agent systems
2. Implement governance token generation and verification
3. Build the AIGOS handshake protocol for mutual authentication
4. Configure inbound and outbound trust policies
5. Handle cross-organization agent communication securely

---

## WHY: The A2A Trust Problem

### Untrusted Agent Communication

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    WITHOUT A2A TRUST                                         │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Agent A                              Agent B                               │
│  ────────                             ────────                              │
│  "I'm a high-risk agent"              "Are you governed?"                   │
│  "I have kill switch"       ???       "What's your risk level?"             │
│  "My budget is $100"                  "Can I trust you?"                    │
│                                                                             │
│                                                                             │
│  PROBLEMS:                                                                  │
│  ─────────                                                                  │
│  • Agent B has no way to verify Agent A's claims                           │
│  • Agent A could lie about its governance status                           │
│  • No mutual authentication                                                 │
│  • Malicious agent could impersonate governed agent                        │
│  • No audit trail of cross-agent communication                             │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                    WITH A2A TRUST (AIGOS HANDSHAKE)                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Agent A                              Agent B                               │
│  ────────                             ────────                              │
│  1. Generate Governance Token         4. Verify Token signature             │
│     (JWT with claims)                    Check issuer, expiry               │
│                                          Validate claims                    │
│  2. Send request +          ────────►                                       │
│     X-AIGOS-Token header              5. If valid:                          │
│                                          - Check inbound policy             │
│  3. Await response          ◄────────    - Generate response token          │
│                                          - Send response                    │
│  6. Verify response token                                                   │
│     Mutual auth complete!                                                   │
│                                                                             │
│  BENEFITS:                                                                  │
│  ─────────                                                                  │
│  • Cryptographic proof of governance status                                 │
│  • Mutual authentication (both sides verify)                                │
│  • Claims are signed, cannot be forged                                      │
│  • Policy-based access control                                              │
│  • Complete audit trail                                                     │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Use Cases for A2A Trust

| Scenario | Why Trust Matters |
|----------|------------------|
| **Multi-org collaboration** | Verify external agents meet your standards |
| **Agent marketplace** | Ensure third-party agents are governed |
| **Hierarchical systems** | Parent verifies child governance |
| **Service mesh** | Agents verify each other in microservices |
| **Audit & compliance** | Prove all communication was authenticated |

---

## WHAT: Governance Token Protocol

### Token Structure (JWT)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                     GOVERNANCE TOKEN (JWT)                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  HEADER                                                                     │
│  ──────                                                                     │
│  {                                                                          │
│    "alg": "ES256",           // Signing algorithm                          │
│    "typ": "AIGOS-GOV+jwt",   // Token type identifier                      │
│    "kid": "org-001-key-1"    // Key ID for verification                    │
│  }                                                                          │
│                                                                             │
│  PAYLOAD (Claims)                                                           │
│  ────────────────                                                           │
│  {                                                                          │
│    // Standard JWT claims                                                   │
│    "iss": "urn:aigos:org:acme-corp",      // Issuer (organization)         │
│    "sub": "agent-001",                     // Subject (instance ID)         │
│    "aud": "urn:aigos:org:partner-inc",    // Audience (target org)         │
│    "iat": 1704792000,                      // Issued at                     │
│    "exp": 1704792300,                      // Expires (5 min TTL)           │
│    "jti": "unique-token-id",               // Unique ID (replay prevention)│
│                                                                             │
│    // Identity claims                                                       │
│    "aigos_identity": {                                                      │
│      "instance_id": "agent-001-abc123",                                    │
│      "asset_id": "research-agent-v1",                                      │
│      "asset_name": "Research Assistant",                                   │
│      "asset_version": "1.2.0",                                             │
│      "organization_id": "acme-corp"                                        │
│    },                                                                       │
│                                                                             │
│    // Governance claims                                                     │
│    "aigos_governance": {                                                    │
│      "risk_level": "limited",                                              │
│      "golden_thread": {                                                    │
│        "hash": "sha256:abc123...",                                         │
│        "verified": true,                                                   │
│        "ticket_id": "AI-2026-0042"                                         │
│      },                                                                     │
│      "mode": "NORMAL",                                                      │
│      "policy_hash": "sha256:def456..."                                     │
│    },                                                                       │
│                                                                             │
│    // Control claims                                                        │
│    "aigos_control": {                                                       │
│      "kill_switch": {                                                       │
│        "enabled": true,                                                    │
│        "channel": "sse",                                                   │
│        "endpoint": "https://control.acme.com/agents/agent-001"             │
│      },                                                                     │
│      "paused": false,                                                       │
│      "termination_pending": false                                          │
│    },                                                                       │
│                                                                             │
│    // Capability claims                                                     │
│    "aigos_capabilities": {                                                  │
│      "hash": "sha256:cap789...",                                           │
│      "tools": ["web_search", "summarize"],                                 │
│      "max_budget_usd": 10.0,                                               │
│      "can_spawn": true,                                                    │
│      "max_child_depth": 2                                                  │
│    },                                                                       │
│                                                                             │
│    // Lineage claims                                                        │
│    "aigos_lineage": {                                                       │
│      "generation_depth": 0,                                                │
│      "parent_instance_id": null,                                           │
│      "root_instance_id": "agent-001-abc123"                                │
│    }                                                                        │
│  }                                                                          │
│                                                                             │
│  SIGNATURE                                                                  │
│  ─────────                                                                  │
│  ECDSA-SHA256(header + "." + payload, private_key)                         │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### The AIGOS Handshake

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         AIGOS HANDSHAKE PROTOCOL                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  CLIENT AGENT                                    SERVER AGENT               │
│  ────────────                                    ────────────               │
│                                                                             │
│  ┌─────────────────────┐                                                   │
│  │ 1. Generate token   │                                                   │
│  │    with claims      │                                                   │
│  └──────────┬──────────┘                                                   │
│             │                                                               │
│             │  HTTP Request                                                 │
│             │  POST /api/analyze                                            │
│             │  X-AIGOS-Token: eyJhbGciOi...                                │
│             │  Content-Type: application/json                               │
│             │  {"query": "..."}                                             │
│             │                                                               │
│             ▼                                                               │
│                                    ┌─────────────────────────────────┐     │
│                                    │ 2. Extract token from header    │     │
│                                    │ 3. Verify signature (JWKS)      │     │
│                                    │ 4. Validate claims:             │     │
│                                    │    - Not expired                │     │
│                                    │    - Issuer trusted             │     │
│                                    │    - Audience matches           │     │
│                                    │ 5. Check inbound policy:        │     │
│                                    │    - Risk level acceptable?     │     │
│                                    │    - Kill switch required?      │     │
│                                    │    - Organization trusted?      │     │
│                                    │ 6. Process request              │     │
│                                    │ 7. Generate response token      │     │
│                                    └──────────────┬──────────────────┘     │
│                                                   │                         │
│             │  HTTP Response                      │                         │
│             │  200 OK                             │                         │
│             │  X-AIGOS-Token: eyJhbGciOi...      │                         │
│             │  {"result": "..."}                  │                         │
│             │                             ◄───────┘                         │
│             ▼                                                               │
│  ┌─────────────────────┐                                                   │
│  │ 8. Verify response  │                                                   │
│  │    token            │                                                   │
│  │ 9. Mutual auth      │                                                   │
│  │    complete!        │                                                   │
│  └─────────────────────┘                                                   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## HOW: Implementing A2A Trust

### Step 1: Governance Token Generator

```python
# governance_token.py
"""
Governance Token Implementation
===============================

Implements JWT-based governance tokens for A2A trust.
"""

import json
import time
import uuid
from datetime import datetime, timezone, timedelta
from typing import Optional, Dict, Any
from dataclasses import dataclass, asdict
import jwt
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import ec


@dataclass
class IdentityClaims:
    """Identity claims for governance token."""
    instance_id: str
    asset_id: str
    asset_name: str
    asset_version: str
    organization_id: str


@dataclass
class GovernanceClaims:
    """Governance claims for governance token."""
    risk_level: str  # minimal, limited, high, unacceptable
    golden_thread_hash: str
    golden_thread_verified: bool
    golden_thread_ticket: str
    mode: str  # NORMAL, SANDBOX, RESTRICTED
    policy_hash: str


@dataclass
class ControlClaims:
    """Control claims for governance token."""
    kill_switch_enabled: bool
    kill_switch_channel: str  # sse, websocket, polling
    kill_switch_endpoint: str
    paused: bool
    termination_pending: bool


@dataclass
class CapabilityClaims:
    """Capability claims for governance token."""
    hash: str
    tools: list
    max_budget_usd: float
    can_spawn: bool
    max_child_depth: int


@dataclass
class LineageClaims:
    """Lineage claims for governance token."""
    generation_depth: int
    parent_instance_id: Optional[str]
    root_instance_id: str


class GovernanceTokenGenerator:
    """
    Generates signed governance tokens for A2A communication.

    Tokens are JWTs with AIGOS-specific claims.
    """

    def __init__(
        self,
        private_key_pem: str,
        key_id: str,
        organization_id: str,
        token_ttl_seconds: int = 300,  # 5 minutes default
    ):
        self.private_key = serialization.load_pem_private_key(
            private_key_pem.encode(),
            password=None,
        )
        self.key_id = key_id
        self.organization_id = organization_id
        self.token_ttl = token_ttl_seconds

    def generate(
        self,
        identity: IdentityClaims,
        governance: GovernanceClaims,
        control: ControlClaims,
        capabilities: CapabilityClaims,
        lineage: LineageClaims,
        audience: Optional[str] = None,
    ) -> str:
        """
        Generate a signed governance token.

        Args:
            identity: Agent identity claims
            governance: Governance status claims
            control: Kill switch and control claims
            capabilities: What the agent can do
            lineage: Parent/child relationships
            audience: Target organization (optional)

        Returns:
            Signed JWT string
        """
        now = datetime.now(timezone.utc)
        exp = now + timedelta(seconds=self.token_ttl)

        # Build payload
        payload = {
            # Standard JWT claims
            "iss": f"urn:aigos:org:{self.organization_id}",
            "sub": identity.instance_id,
            "iat": int(now.timestamp()),
            "exp": int(exp.timestamp()),
            "jti": str(uuid.uuid4()),  # Unique token ID

            # AIGOS claims
            "aigos_identity": asdict(identity),
            "aigos_governance": {
                "risk_level": governance.risk_level,
                "golden_thread": {
                    "hash": governance.golden_thread_hash,
                    "verified": governance.golden_thread_verified,
                    "ticket_id": governance.golden_thread_ticket,
                },
                "mode": governance.mode,
                "policy_hash": governance.policy_hash,
            },
            "aigos_control": {
                "kill_switch": {
                    "enabled": control.kill_switch_enabled,
                    "channel": control.kill_switch_channel,
                    "endpoint": control.kill_switch_endpoint,
                },
                "paused": control.paused,
                "termination_pending": control.termination_pending,
            },
            "aigos_capabilities": {
                "hash": capabilities.hash,
                "tools": capabilities.tools,
                "max_budget_usd": capabilities.max_budget_usd,
                "can_spawn": capabilities.can_spawn,
                "max_child_depth": capabilities.max_child_depth,
            },
            "aigos_lineage": asdict(lineage),
        }

        if audience:
            payload["aud"] = f"urn:aigos:org:{audience}"

        # Build headers
        headers = {
            "alg": "ES256",
            "typ": "AIGOS-GOV+jwt",
            "kid": self.key_id,
        }

        # Sign and return
        token = jwt.encode(
            payload,
            self.private_key,
            algorithm="ES256",
            headers=headers,
        )

        return token


class GovernanceTokenVerifier:
    """
    Verifies governance tokens received from other agents.

    Uses JWKS for key discovery.
    """

    def __init__(
        self,
        jwks_url: Optional[str] = None,
        trusted_keys: Optional[Dict[str, str]] = None,
    ):
        self.jwks_url = jwks_url
        self.trusted_keys = trusted_keys or {}
        self._key_cache: Dict[str, Any] = {}

    async def verify(
        self,
        token: str,
        expected_audience: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Verify a governance token.

        Args:
            token: JWT token string
            expected_audience: Expected audience claim

        Returns:
            Decoded payload if valid

        Raises:
            jwt.InvalidTokenError: If verification fails
        """
        # Decode header without verification to get key ID
        header = jwt.get_unverified_header(token)

        if header.get("typ") != "AIGOS-GOV+jwt":
            raise jwt.InvalidTokenError("Not an AIGOS governance token")

        # Get public key for verification
        key_id = header.get("kid")
        public_key = await self._get_public_key(key_id)

        # Verify and decode
        options = {"require": ["exp", "iat", "iss", "sub", "jti"]}

        if expected_audience:
            options["audience"] = f"urn:aigos:org:{expected_audience}"

        payload = jwt.decode(
            token,
            public_key,
            algorithms=["ES256", "RS256"],
            options=options,
        )

        # Validate AIGOS-specific claims
        self._validate_aigos_claims(payload)

        return payload

    async def _get_public_key(self, key_id: str) -> Any:
        """Get public key from JWKS or local cache."""
        if key_id in self._key_cache:
            return self._key_cache[key_id]

        if key_id in self.trusted_keys:
            key = serialization.load_pem_public_key(
                self.trusted_keys[key_id].encode()
            )
            self._key_cache[key_id] = key
            return key

        if self.jwks_url:
            # Fetch from JWKS endpoint
            # (Implementation omitted for brevity)
            pass

        raise jwt.InvalidTokenError(f"Unknown key ID: {key_id}")

    def _validate_aigos_claims(self, payload: Dict[str, Any]) -> None:
        """Validate AIGOS-specific claims."""
        required_claims = [
            "aigos_identity",
            "aigos_governance",
            "aigos_control",
            "aigos_capabilities",
            "aigos_lineage",
        ]

        for claim in required_claims:
            if claim not in payload:
                raise jwt.InvalidTokenError(f"Missing required claim: {claim}")

        # Validate identity
        identity = payload["aigos_identity"]
        if not identity.get("instance_id"):
            raise jwt.InvalidTokenError("Missing instance_id in identity")

        # Validate governance
        governance = payload["aigos_governance"]
        valid_risk_levels = ["minimal", "limited", "high", "unacceptable"]
        if governance.get("risk_level") not in valid_risk_levels:
            raise jwt.InvalidTokenError(f"Invalid risk_level: {governance.get('risk_level')}")

        # Validate control
        control = payload["aigos_control"]
        if not control.get("kill_switch", {}).get("enabled"):
            # Policy decision: require kill switch
            pass  # Could raise or just log warning


@dataclass
class A2ATrustPolicy:
    """Policy for inbound A2A trust decisions."""

    # Risk level requirements
    max_acceptable_risk: str = "high"  # Accept up to high risk

    # Kill switch requirements
    require_kill_switch: bool = True

    # Golden thread requirements
    require_verified_golden_thread: bool = True

    # Organization trust
    trusted_organizations: list = None
    blocked_organizations: list = None

    # Asset trust
    blocked_asset_ids: list = None

    def __post_init__(self):
        self.trusted_organizations = self.trusted_organizations or []
        self.blocked_organizations = self.blocked_organizations or []
        self.blocked_asset_ids = self.blocked_asset_ids or []


class A2ATrustEvaluator:
    """
    Evaluates whether to trust an incoming agent request.

    Uses governance token claims and local policy.
    """

    RISK_LEVELS = ["minimal", "limited", "high", "unacceptable"]

    def __init__(self, policy: A2ATrustPolicy):
        self.policy = policy

    def evaluate(self, claims: Dict[str, Any]) -> tuple[bool, str]:
        """
        Evaluate trust based on token claims and policy.

        Returns:
            (trusted, reason)
        """
        identity = claims["aigos_identity"]
        governance = claims["aigos_governance"]
        control = claims["aigos_control"]

        # Check blocked organizations
        org_id = identity["organization_id"]
        if org_id in self.policy.blocked_organizations:
            return (False, f"Organization {org_id} is blocked")

        # Check blocked assets
        asset_id = identity["asset_id"]
        if asset_id in self.policy.blocked_asset_ids:
            return (False, f"Asset {asset_id} is blocked")

        # Check risk level
        risk_level = governance["risk_level"]
        max_risk_idx = self.RISK_LEVELS.index(self.policy.max_acceptable_risk)
        request_risk_idx = self.RISK_LEVELS.index(risk_level)

        if request_risk_idx > max_risk_idx:
            return (False, f"Risk level {risk_level} exceeds maximum {self.policy.max_acceptable_risk}")

        # Check kill switch
        if self.policy.require_kill_switch:
            if not control.get("kill_switch", {}).get("enabled"):
                return (False, "Kill switch not enabled")

        # Check golden thread
        if self.policy.require_verified_golden_thread:
            golden_thread = governance.get("golden_thread", {})
            if not golden_thread.get("verified"):
                return (False, "Golden thread not verified")

        # Check trusted organizations (if list is non-empty, must be in it)
        if self.policy.trusted_organizations:
            if org_id not in self.policy.trusted_organizations:
                return (False, f"Organization {org_id} not in trusted list")

        return (True, "All checks passed")
```

### Step 2: HTTP Client with A2A Trust

```python
# a2a_client.py
"""
HTTP Client with AIGOS A2A Trust
================================

Wraps HTTP requests to automatically add governance tokens.
"""

import aiohttp
from typing import Optional, Dict, Any


class A2AHttpClient:
    """
    HTTP client that adds AIGOS governance tokens to requests.

    Usage:
        client = A2AHttpClient(agent)
        response = await client.post("https://other-agent/api", json={...})
    """

    def __init__(
        self,
        agent: 'GovernedAgent',
        verify_response_token: bool = True,
    ):
        self.agent = agent
        self.verify_response = verify_response_token
        self._session: Optional[aiohttp.ClientSession] = None

    async def __aenter__(self):
        self._session = aiohttp.ClientSession()
        return self

    async def __aexit__(self, *args):
        if self._session:
            await self._session.close()

    async def request(
        self,
        method: str,
        url: str,
        target_organization: Optional[str] = None,
        **kwargs,
    ) -> aiohttp.ClientResponse:
        """
        Make HTTP request with AIGOS token.

        Args:
            method: HTTP method
            url: Target URL
            target_organization: Target org for audience claim
            **kwargs: Additional aiohttp arguments

        Returns:
            HTTP response
        """
        # Generate governance token
        token = self.agent.generate_governance_token(
            audience=target_organization
        )

        # Add token to headers
        headers = kwargs.pop("headers", {})
        headers["X-AIGOS-Token"] = token

        # Make request
        async with self._session.request(method, url, headers=headers, **kwargs) as response:
            # Verify response token if present
            if self.verify_response:
                response_token = response.headers.get("X-AIGOS-Token")
                if response_token:
                    await self._verify_response_token(response_token)

            return response

    async def get(self, url: str, **kwargs):
        return await self.request("GET", url, **kwargs)

    async def post(self, url: str, **kwargs):
        return await self.request("POST", url, **kwargs)

    async def _verify_response_token(self, token: str) -> None:
        """Verify the response token from the server."""
        verifier = GovernanceTokenVerifier(
            trusted_keys=self.agent.trusted_keys
        )
        await verifier.verify(token)
```

### Step 3: HTTP Server Middleware

```python
# a2a_server.py
"""
HTTP Server Middleware for AIGOS A2A Trust
==========================================

FastAPI middleware that validates incoming governance tokens.
"""

from fastapi import FastAPI, Request, HTTPException, Depends
from fastapi.responses import JSONResponse
from typing import Optional


app = FastAPI()


class A2AMiddleware:
    """
    Middleware that validates AIGOS governance tokens.

    Extracts token from X-AIGOS-Token header, verifies it,
    and makes claims available to route handlers.
    """

    def __init__(
        self,
        agent: 'GovernedAgent',
        policy: A2ATrustPolicy,
        require_token: bool = True,
    ):
        self.agent = agent
        self.policy = policy
        self.require_token = require_token
        self.verifier = GovernanceTokenVerifier(
            trusted_keys=agent.trusted_keys
        )
        self.evaluator = A2ATrustEvaluator(policy)

    async def __call__(self, request: Request, call_next):
        # Extract token
        token = request.headers.get("X-AIGOS-Token")

        if not token:
            if self.require_token:
                return JSONResponse(
                    status_code=401,
                    content={"error": "Missing X-AIGOS-Token header"},
                )
            # No token, proceed without A2A trust
            return await call_next(request)

        try:
            # Verify token
            claims = await self.verifier.verify(
                token,
                expected_audience=self.agent.organization_id,
            )

            # Evaluate trust
            trusted, reason = self.evaluator.evaluate(claims)

            if not trusted:
                return JSONResponse(
                    status_code=403,
                    content={
                        "error": "A2A trust evaluation failed",
                        "reason": reason,
                    },
                )

            # Add claims to request state
            request.state.aigos_claims = claims
            request.state.aigos_trusted = True

        except Exception as e:
            return JSONResponse(
                status_code=401,
                content={
                    "error": "Token verification failed",
                    "detail": str(e),
                },
            )

        # Process request
        response = await call_next(request)

        # Add response token
        response_token = self.agent.generate_governance_token()
        response.headers["X-AIGOS-Token"] = response_token

        return response


def get_aigos_claims(request: Request) -> Optional[Dict]:
    """Dependency to get AIGOS claims in route handlers."""
    return getattr(request.state, "aigos_claims", None)


# Example usage
@app.post("/api/analyze")
async def analyze(
    request: Request,
    claims: Optional[Dict] = Depends(get_aigos_claims),
):
    """
    Protected endpoint that requires A2A trust.

    The claims contain verified information about the calling agent.
    """
    if claims:
        caller_id = claims["aigos_identity"]["instance_id"]
        caller_risk = claims["aigos_governance"]["risk_level"]
        print(f"Request from {caller_id} (risk: {caller_risk})")

    # Process request...
    return {"result": "analyzed"}
```

---

## Practice Lab: Cross-Organization A2A Trust

### Lab Objective

Build a system where:
1. Organization A has a research agent
2. Organization B has a data analysis agent
3. Research agent calls analysis agent with A2A trust
4. Both agents verify each other's governance status

### Lab Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    CROSS-ORGANIZATION A2A TRUST                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ORGANIZATION A                           ORGANIZATION B                    │
│  ──────────────                           ──────────────                    │
│                                                                             │
│  ┌─────────────────────┐                  ┌─────────────────────┐          │
│  │   Research Agent    │                  │   Analysis Agent    │          │
│  │                     │                  │                     │          │
│  │   Instance: ra-001  │ ──── A2A ─────► │   Instance: aa-001  │          │
│  │   Risk: limited     │     Trust       │   Risk: minimal     │          │
│  │   Kill switch: ON   │                  │   Kill switch: ON   │          │
│  │                     │ ◄─── Mutual ──── │                     │          │
│  │   Org: acme-corp    │     Auth        │   Org: partner-inc  │          │
│  └─────────────────────┘                  └─────────────────────┘          │
│                                                                             │
│  KEY EXCHANGE:                                                              │
│  • Org A publishes JWKS at https://acme-corp.com/.well-known/aigos-jwks    │
│  • Org B publishes JWKS at https://partner-inc.com/.well-known/aigos-jwks  │
│  • Both agents fetch and cache partner's public keys                        │
│                                                                             │
│  TRUST POLICY (Org B - Analysis Agent):                                     │
│  • trusted_organizations: ["acme-corp"]                                     │
│  • max_acceptable_risk: "limited"                                           │
│  • require_kill_switch: true                                                │
│  • require_verified_golden_thread: true                                     │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Lab Steps

#### Step 1: Generate Key Pairs

```python
# generate_keys.py
from cryptography.hazmat.primitives.asymmetric import ec
from cryptography.hazmat.primitives import serialization

def generate_key_pair(org_id: str):
    """Generate ECDSA key pair for an organization."""
    private_key = ec.generate_private_key(ec.SECP256R1())

    # Save private key
    private_pem = private_key.private_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PrivateFormat.PKCS8,
        encryption_algorithm=serialization.NoEncryption(),
    )
    with open(f"{org_id}_private.pem", "wb") as f:
        f.write(private_pem)

    # Save public key
    public_pem = private_key.public_key().public_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PublicFormat.SubjectPublicKeyInfo,
    )
    with open(f"{org_id}_public.pem", "wb") as f:
        f.write(public_pem)

    print(f"Generated keys for {org_id}")

# Generate for both organizations
generate_key_pair("acme-corp")
generate_key_pair("partner-inc")
```

#### Step 2: Create Research Agent (Org A)

```python
# research_agent.py (Organization A)
import asyncio

class ResearchAgent(GovernedAgent):
    """Research agent that calls external analysis service."""

    def __init__(self):
        super().__init__(
            asset_id="research-agent-v1",
            instance_id="ra-001",
            organization_id="acme-corp",
            # ... other config
        )

        # Load private key for token generation
        with open("acme-corp_private.pem") as f:
            self.private_key_pem = f.read()

        # Load partner's public key for response verification
        with open("partner-inc_public.pem") as f:
            self.trusted_keys = {
                "partner-inc-key-1": f.read()
            }

        self.token_generator = GovernanceTokenGenerator(
            private_key_pem=self.private_key_pem,
            key_id="acme-corp-key-1",
            organization_id="acme-corp",
        )

    def generate_governance_token(self, audience: str = None) -> str:
        """Generate token for outbound requests."""
        return self.token_generator.generate(
            identity=IdentityClaims(
                instance_id=self.instance_id,
                asset_id=self.asset_id,
                asset_name="Research Assistant",
                asset_version="1.0.0",
                organization_id="acme-corp",
            ),
            governance=GovernanceClaims(
                risk_level="limited",
                golden_thread_hash=self.golden_thread.hash,
                golden_thread_verified=True,
                golden_thread_ticket="AI-2026-0042",
                mode="NORMAL",
                policy_hash="sha256:abc...",
            ),
            control=ControlClaims(
                kill_switch_enabled=True,
                kill_switch_channel="sse",
                kill_switch_endpoint="https://control.acme-corp.com/agents/ra-001",
                paused=False,
                termination_pending=False,
            ),
            capabilities=CapabilityClaims(
                hash="sha256:cap...",
                tools=["web_search", "summarize"],
                max_budget_usd=10.0,
                can_spawn=True,
                max_child_depth=2,
            ),
            lineage=LineageClaims(
                generation_depth=0,
                parent_instance_id=None,
                root_instance_id="ra-001",
            ),
            audience=audience,
        )

    async def analyze_with_partner(self, data: dict) -> dict:
        """Call partner's analysis service with A2A trust."""
        async with A2AHttpClient(self) as client:
            response = await client.post(
                "https://api.partner-inc.com/analyze",
                target_organization="partner-inc",
                json=data,
            )
            return await response.json()
```

#### Step 3: Create Analysis Agent (Org B)

```python
# analysis_agent.py (Organization B)
from fastapi import FastAPI

app = FastAPI()

# Configure A2A trust policy
policy = A2ATrustPolicy(
    max_acceptable_risk="limited",
    require_kill_switch=True,
    require_verified_golden_thread=True,
    trusted_organizations=["acme-corp"],
)

# Create analysis agent
analysis_agent = AnalysisAgent(
    asset_id="analysis-agent-v1",
    instance_id="aa-001",
    organization_id="partner-inc",
)

# Add A2A middleware
app.middleware("http")(
    A2AMiddleware(
        agent=analysis_agent,
        policy=policy,
        require_token=True,
    )
)

@app.post("/analyze")
async def analyze(
    request: Request,
    claims = Depends(get_aigos_claims),
):
    """Protected analysis endpoint."""
    # Claims are verified at this point
    caller = claims["aigos_identity"]["organization_id"]
    print(f"Trusted request from {caller}")

    # Process analysis...
    return {"analysis": "complete"}
```

#### Step 4: Test the Integration

```python
# test_a2a.py
import asyncio

async def test_cross_org_a2a():
    """Test cross-organization A2A trust."""

    # Create research agent
    research_agent = ResearchAgent()
    await research_agent.start()

    # Call partner's analysis service
    try:
        result = await research_agent.analyze_with_partner({
            "data": "test data for analysis"
        })
        print(f"✅ A2A trust successful: {result}")

    except Exception as e:
        print(f"❌ A2A trust failed: {e}")

    finally:
        await research_agent.stop()

if __name__ == "__main__":
    asyncio.run(test_cross_org_a2a())
```

### Lab Validation

- [ ] Research agent generates valid governance token
- [ ] Analysis agent verifies token signature
- [ ] Trust policy correctly evaluates claims
- [ ] Request succeeds with mutual authentication
- [ ] Response includes response token
- [ ] Blocked organization is rejected
- [ ] Missing kill switch is rejected (if required)
- [ ] Expired token is rejected

---

## Knowledge Check

1. **What is the purpose of the X-AIGOS-Token header?**
   - a) For encryption
   - b) For carrying governance claims ✓
   - c) For session management
   - d) For rate limiting

2. **What claim type indicates the agent's risk level?**
   - a) aigos_identity
   - b) aigos_governance ✓
   - c) aigos_control
   - d) aigos_capabilities

3. **Why is the response token important?**
   - a) For encryption
   - b) For mutual authentication ✓
   - c) For caching
   - d) For logging

4. **What does the 'jti' claim prevent?**
   - a) Token expiration
   - b) Token replay attacks ✓
   - c) Signature verification
   - d) Key rotation

5. **When should an agent reject an A2A request?**
   - a) When risk level exceeds policy
   - b) When kill switch is not enabled (if required)
   - c) When organization is blocked
   - d) All of the above ✓

---

## Key Takeaways

1. **A2A trust is mandatory** for multi-agent systems across organizations
2. **Governance tokens are JWTs** with AIGOS-specific claims
3. **Mutual authentication** - both parties verify each other
4. **Policy-based trust** - configurable rules for acceptance
5. **Audit trail** - every A2A interaction is logged and verifiable

---

## Next Steps

Continue to [Module 5.5: Framework Integration](./05-framework-integration.md) to learn how to add AIGOS governance to LangChain, CrewAI, and AutoGen agents.

---

*Module 5.4 - AIGRC Training Program v2.0*
