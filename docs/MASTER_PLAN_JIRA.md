# AIGRC/AIGOS Master Implementation Plan - JIRA Ready

**Date:** 2025-12-30
**Version:** 2.0 (Updated based on Reconciliation Analysis)
**Status:** Active

---

## Document Purpose

This master plan provides JIRA-ready Epics and User Stories based on:
1. The AIGOS specification suite (FMT, PRT, RT, CLI, LIC layers)
2. Current codebase implementation status
3. Reconciliation gap analysis

Each Epic and Story is formatted for direct import into JIRA with:
- Story points (using Fibonacci: 1, 2, 3, 5, 8, 13)
- Acceptance criteria
- Dependencies
- Risk levels

---

## Epic Overview

| Epic ID | Epic Name | Priority | Status | Est. Points |
|---------|-----------|----------|--------|-------------|
| AIGOS-E1 | Core Foundation Completion | P0 | 60% Done | 21 |
| AIGOS-E2 | Configuration & Policy System | P0 | 40% Done | 34 |
| AIGOS-E3 | Golden Thread Protocol | P0 | 25% Done | 21 |
| AIGOS-E4 | Identity Manager | P0 | Not Started | 34 |
| AIGOS-E5 | Policy Engine (The Bouncer) | P0 | Not Started | 55 |
| AIGOS-E6 | Telemetry Emitter | P1 | Not Started | 34 |
| AIGOS-E7 | Kill Switch | P1 | Not Started | 55 |
| AIGOS-E8 | Capability Decay | P1 | Not Started | 34 |
| AIGOS-E9 | Governance Token (A2A) | P2 | Not Started | 55 |
| AIGOS-E10 | CLI Enhancements | P1 | 75% Done | 21 |
| AIGOS-E11 | License Validation | P2 | Not Started | 21 |
| AIGOS-E12 | Integration & Testing | P1 | Partial | 34 |

**Total Estimated Points:** 419

---

# EPIC: AIGOS-E1 - Core Foundation Completion

**Description:** Complete the foundational schemas, types, and data structures that the runtime system builds upon.

**Priority:** P0 (Critical Path)
**Current Status:** 60% Complete
**Estimated Points:** 21
**Dependencies:** None
**Risk Level:** LOW

---

## User Stories

### AIGOS-101: Add RuntimeIdentity Zod Schema

**As a** developer building runtime governance
**I want** a validated RuntimeIdentity schema
**So that** all identity data is type-safe and validated

**Story Points:** 3

**Acceptance Criteria:**
- [ ] Create `RuntimeIdentitySchema` in @aigrc/core/schemas
- [ ] Include all required fields: instance_id, asset_id, asset_name, asset_version
- [ ] Include golden_thread object with ticket_id, approved_by, approved_at
- [ ] Include lineage object with parent_instance_id, generation_depth, ancestor_chain
- [ ] Include capabilities_manifest reference
- [ ] Include operating mode enum: NORMAL, SANDBOX, RESTRICTED
- [ ] Add JSDoc documentation for all fields
- [ ] Export from @aigrc/core main entry point

**Technical Notes:**
```typescript
const RuntimeIdentitySchema = z.object({
  instance_id: z.string().uuid(),
  asset_id: z.string().min(1),
  asset_name: z.string().min(1),
  asset_version: z.string().regex(/^\d+\.\d+\.\d+/),
  golden_thread_hash: z.string().regex(/^sha256:[a-f0-9]{64}$/),
  golden_thread: GoldenThreadSchema,
  risk_level: RiskLevelSchema,
  lineage: LineageSchema,
  capabilities_manifest: CapabilitiesManifestSchema,
  created_at: z.string().datetime(),
  verified: z.boolean(),
  mode: z.enum(['NORMAL', 'SANDBOX', 'RESTRICTED'])
});
```

**Labels:** schema, core, foundation

---

### AIGOS-102: Add CapabilitiesManifest Zod Schema

**As a** developer implementing capability controls
**I want** a validated CapabilitiesManifest schema
**So that** agent permissions are consistently structured

**Story Points:** 3

**Acceptance Criteria:**
- [ ] Create `CapabilitiesManifestSchema` in @aigrc/core/schemas
- [ ] Include allowed_tools and denied_tools arrays
- [ ] Include allowed_domains and denied_domains arrays (regex patterns)
- [ ] Include budget fields: max_cost_per_session, max_cost_per_day, max_tokens_per_call
- [ ] Include spawning fields: may_spawn_children, max_child_depth
- [ ] Include custom extensibility object
- [ ] Add validation for domain regex patterns
- [ ] Export from @aigrc/core main entry point

**Labels:** schema, core, foundation

---

### AIGOS-103: Add KillSwitchCommand Zod Schema

**As a** developer implementing kill switch
**I want** a validated KillSwitchCommand schema
**So that** termination commands are properly structured and validated

**Story Points:** 2

**Acceptance Criteria:**
- [ ] Create `KillSwitchCommandSchema` in @aigrc/core/schemas
- [ ] Include command type enum: TERMINATE, PAUSE, RESUME
- [ ] Include target fields: instance_id (optional), asset_id (optional), organization (optional)
- [ ] Include signature field for cryptographic verification
- [ ] Include timestamp for replay prevention
- [ ] Include unique command_id
- [ ] Include reason field for audit
- [ ] Export from @aigrc/core main entry point

**Labels:** schema, core, kill-switch

---

### AIGOS-104: Add GovernanceTokenPayload Zod Schema

**As a** developer implementing A2A authentication
**I want** a validated GovernanceTokenPayload schema
**So that** JWT token claims are type-safe

**Story Points:** 3

**Acceptance Criteria:**
- [ ] Create `GovernanceTokenPayloadSchema` in @aigrc/core/schemas
- [ ] Include standard JWT claims: iss, sub, aud, exp, iat, nbf, jti
- [ ] Include aigos.identity claims
- [ ] Include aigos.governance claims
- [ ] Include aigos.control claims
- [ ] Include aigos.capabilities claims
- [ ] Include aigos.lineage claims
- [ ] Export from @aigrc/core main entry point

**Labels:** schema, core, a2a

---

### AIGOS-105: Add Risk Level Utility Functions

**As a** developer working with risk levels
**I want** utility functions for risk level operations
**So that** I can compare and map risk levels consistently

**Story Points:** 2

**Acceptance Criteria:**
- [ ] Create `compareRiskLevels(a, b)` returning -1, 0, 1
- [ ] Create `isRiskLevelAtLeast(level, threshold)` boolean check
- [ ] Create `getRiskLevelOrdinal(level)` returning 0-3
- [ ] Create `getMaxRiskLevel(levels[])` returning highest
- [ ] Create `mapToEuAiActCategory(level)` for regulatory mapping
- [ ] Add unit tests for all functions
- [ ] Export from @aigrc/core

**Labels:** utility, core, risk

---

### AIGOS-106: Add LineageSchema for Agent Hierarchy

**As a** developer tracking agent spawning
**I want** a Lineage schema
**So that** parent-child relationships are properly tracked

**Story Points:** 2

**Acceptance Criteria:**
- [ ] Create `LineageSchema` in @aigrc/core/schemas
- [ ] Include parent_instance_id (nullable for root)
- [ ] Include generation_depth (0 for root)
- [ ] Include ancestor_chain array of instance_ids
- [ ] Include spawned_at timestamp
- [ ] Include root_instance_id for tracing
- [ ] Export from @aigrc/core

**Labels:** schema, core, lineage

---

### AIGOS-107: Extend AssetCard Schema for Runtime Fields

**As a** developer using asset cards at runtime
**I want** runtime-specific fields in the Asset Card
**So that** governance configuration is complete

**Story Points:** 3

**Acceptance Criteria:**
- [ ] Add optional `runtime` section to AssetCardSchema
- [ ] Include policy_path reference
- [ ] Include verification_failure_mode: SANDBOX | FAIL
- [ ] Include telemetry_enabled boolean
- [ ] Include kill_switch configuration
- [ ] Maintain backward compatibility
- [ ] Update schema version to 1.1

**Labels:** schema, core, asset-card

---

### AIGOS-108: Add Schema Test Suite

**As a** developer maintaining schemas
**I want** comprehensive schema tests
**So that** schema changes don't break consumers

**Story Points:** 3

**Acceptance Criteria:**
- [ ] Add tests for all new schemas in @aigrc/core
- [ ] Test valid data parsing
- [ ] Test invalid data rejection with proper errors
- [ ] Test edge cases (optional fields, defaults)
- [ ] Add conformance tests for spec requirements
- [ ] Achieve 100% coverage of schema files

**Labels:** testing, core, schemas

---

# EPIC: AIGOS-E2 - Configuration & Policy System

**Description:** Implement .aigrc file format discovery, loading, validation, and policy management per SPEC-FMT-001 and SPEC-FMT-003.

**Priority:** P0 (Critical Path)
**Current Status:** 40% Complete
**Estimated Points:** 34
**Dependencies:** AIGOS-E1
**Risk Level:** LOW

---

## User Stories

### AIGOS-201: Implement Configuration Discovery Algorithm

**As a** developer using AIGRC in a project
**I want** automatic config file discovery
**So that** I don't have to specify config path manually

**Story Points:** 5

**Acceptance Criteria:**
- [ ] Search current directory for .aigrc.yaml
- [ ] Search parent directories up to filesystem root
- [ ] Search home directory (~/.aigrc.yaml) as fallback
- [ ] Merge configurations (child overrides parent)
- [ ] Cache discovered config for session
- [ ] Support AIGRC_CONFIG_PATH environment variable override
- [ ] Add unit tests for discovery algorithm
- [ ] Handle circular symlinks gracefully

**Technical Notes:**
```typescript
async function discoverConfig(startDir: string): Promise<AIGRCConfig> {
  const configFiles = await findConfigFiles(startDir);
  return mergeConfigs(configFiles);
}
```

**Labels:** config, core, discovery

---

### AIGOS-202: Implement PolicyFile Zod Schema

**As a** developer writing policies
**I want** a validated policy schema
**So that** policy files are correctly structured

**Story Points:** 5

**Acceptance Criteria:**
- [ ] Create `PolicyFileSchema` matching SPEC-FMT-003
- [ ] Include version, name, extends fields
- [ ] Include applies_to with asset/risk matchers
- [ ] Include capabilities (allowed_tools, denied_tools)
- [ ] Include resources (allowed_domains, denied_domains)
- [ ] Include models (allowed_models, denied_models)
- [ ] Include budget (session, daily, monthly limits)
- [ ] Include schedule (hours, days, blackout windows)
- [ ] Include spawning rules
- [ ] Include data handling rules
- [ ] Include mode (dry_run, fail_open, strict, verbose)
- [ ] Add comprehensive validation tests

**Labels:** schema, policy, config

---

### AIGOS-203: Implement Policy Inheritance (extends)

**As a** developer organizing policies
**I want** policy inheritance via extends
**So that** I can create policy hierarchies

**Story Points:** 5

**Acceptance Criteria:**
- [ ] Parse extends field from policy file
- [ ] Load parent policy recursively
- [ ] Limit recursion depth to 5 (prevent cycles)
- [ ] Merge policies following spec rules:
  - denied_* arrays are unioned (not replaced)
  - Scalars from child override parent
  - Objects are deep merged
- [ ] Detect and error on circular extends
- [ ] Add unit tests for inheritance scenarios

**Labels:** policy, inheritance, config

---

### AIGOS-204: Implement Policy Selection Algorithm

**As a** runtime system
**I want** automatic policy selection
**So that** the correct policy applies to each agent

**Story Points:** 5

**Acceptance Criteria:**
- [ ] Implement selection order:
  1. Load default.yaml
  2. Load {NODE_ENV}.yaml if exists
  3. Load {risk_level}.yaml if exists
  4. Load asset-specific policy if configured
- [ ] Merge policies in selection order
- [ ] Support AIGRC_ENV environment variable
- [ ] Cache merged policy per asset_id
- [ ] Add integration tests for selection

**Labels:** policy, selection, config

---

### AIGOS-205: Implement Asset Card Loader

**As a** runtime system
**I want** to load asset cards from .aigrc/cards/
**So that** governance metadata is available at startup

**Story Points:** 3

**Acceptance Criteria:**
- [ ] Scan .aigrc/cards/*.yaml on startup
- [ ] Validate each card against schema
- [ ] Create in-memory index by asset_id
- [ ] Support lazy loading for large card sets
- [ ] Emit warnings for invalid cards (don't fail)
- [ ] Add file watcher for hot reload (optional)

**Labels:** asset-card, loader, config

---

### AIGOS-206: Implement Domain Pattern Compiler

**As a** policy engine
**I want** pre-compiled regex patterns for domains
**So that** domain matching is fast (<0.1ms)

**Story Points:** 3

**Acceptance Criteria:**
- [ ] Compile allowed_domains patterns on policy load
- [ ] Compile denied_domains patterns on policy load
- [ ] Cache compiled patterns per policy
- [ ] Support wildcard expansion (*, prefix_*)
- [ ] Handle invalid regex gracefully with errors
- [ ] Add performance tests (< 0.1ms per match)

**Labels:** policy, performance, regex

---

### AIGOS-207: Add .aigrc.yaml Runtime Section

**As a** developer configuring runtime governance
**I want** a runtime section in .aigrc.yaml
**So that** runtime settings are centralized

**Story Points:** 3

**Acceptance Criteria:**
- [ ] Add runtime section to .aigrc.yaml schema:
  ```yaml
  runtime:
    identity:
      verification_failure_mode: SANDBOX
    policy:
      default_policy: default.yaml
      fail_open: false
    telemetry:
      enabled: true
      endpoint: https://otel.example.com
    kill_switch:
      enabled: true
      channel: sse
      endpoint: https://ks.example.com
  ```
- [ ] Update config loader to parse runtime section
- [ ] Add validation for runtime settings

**Labels:** config, runtime, schema

---

### AIGOS-208: Add Integration Configuration Section

**As a** developer integrating with ticket systems
**I want** an integrations section in .aigrc.yaml
**So that** Jira/ADO/GitHub links are configured

**Story Points:** 3

**Acceptance Criteria:**
- [ ] Add integrations section to .aigrc.yaml schema:
  ```yaml
  integrations:
    jira:
      url: https://company.atlassian.net
      project_key: AIGOS
    azure_devops:
      organization: company
      project: aigos
    github:
      owner: company
      repo: aigos
  ```
- [ ] Update config loader to parse integrations
- [ ] Add validation for URLs and required fields

**Labels:** config, integrations

---

### AIGOS-209: Add Environment Variable Overrides

**As a** developer deploying to different environments
**I want** environment variable overrides
**So that** I can configure without changing files

**Story Points:** 2

**Acceptance Criteria:**
- [ ] Support AIGRC_* environment variables
- [ ] Document all supported variables:
  - AIGRC_CONFIG_PATH
  - AIGRC_POLICY_DIR
  - AIGRC_ENV
  - AIGRC_TELEMETRY_ENDPOINT
  - AIGRC_KILL_SWITCH_ENDPOINT
  - AIGRC_LOG_LEVEL
- [ ] Env vars override file config
- [ ] Add to documentation

**Labels:** config, environment

---

# EPIC: AIGOS-E3 - Golden Thread Protocol

**Description:** Implement the Golden Thread protocol (SPEC-PRT-001) for cryptographic linking from runtime agents to business authorization.

**Priority:** P0 (Critical Path)
**Current Status:** 25% Complete (linking exists, hash missing)
**Estimated Points:** 21
**Dependencies:** AIGOS-E1
**Risk Level:** LOW

---

## User Stories

### AIGOS-301: Implement Canonical String Computation

**As a** governance system
**I want** canonical string computation for Golden Thread
**So that** hashes are deterministic and verifiable

**Story Points:** 3

**Acceptance Criteria:**
- [ ] Implement canonical string format:
  `approved_at={ISO8601}|approved_by={email}|ticket_id={id}`
- [ ] Fields sorted alphabetically (approved_at, approved_by, ticket_id)
- [ ] Use pipe (|) as delimiter
- [ ] Use equals (=) for key-value pairs
- [ ] Normalize timestamp to UTC ISO 8601
- [ ] Add unit tests with spec test vectors

**Test Vector:**
```
Input: ticket_id=FIN-1234, approved_by=ciso@corp.com, approved_at=2025-01-15T10:30:00Z
Output: "approved_at=2025-01-15T10:30:00Z|approved_by=ciso@corp.com|ticket_id=FIN-1234"
```

**Labels:** golden-thread, protocol, core

---

### AIGOS-302: Implement SHA-256 Hash Generation

**As a** governance system
**I want** SHA-256 hash generation for Golden Thread
**So that** authorization links are cryptographically secure

**Story Points:** 3

**Acceptance Criteria:**
- [ ] Use crypto.subtle (WebCrypto API) for hash
- [ ] Output format: `sha256:{hex}`
- [ ] 64 lowercase hex characters after prefix
- [ ] Pass spec test vector:
  ```
  Input: FIN-1234 | ciso@corp.com | 2025-01-15T10:30:00Z
  Output: sha256:7d865e959b2466918c9863afca942d0fb89d7c9ac0c99bafc3749504ded97730
  ```
- [ ] Export `computeGoldenThreadHash()` function
- [ ] Add comprehensive unit tests

**Labels:** golden-thread, crypto, core

---

### AIGOS-303: Implement Hash Verification

**As a** runtime identity manager
**I want** to verify Golden Thread hashes
**So that** I can detect tampering

**Story Points:** 2

**Acceptance Criteria:**
- [ ] Implement `verifyGoldenThreadHash(card, hash)` function
- [ ] Recompute hash from asset card components
- [ ] Use constant-time comparison for security
- [ ] Return { verified: boolean, computed: string, expected: string }
- [ ] Log verification failures
- [ ] Add unit tests for valid and invalid cases

**Labels:** golden-thread, verification, security

---

### AIGOS-304: Implement Signature Verification (Optional)

**As a** enterprise user
**I want** cryptographic signature verification
**So that** approvals are non-repudiable

**Story Points:** 5

**Acceptance Criteria:**
- [ ] Support RSA-SHA256 signatures
- [ ] Support ECDSA P-256 signatures
- [ ] Parse signature format: `{ALGORITHM}:{BASE64_SIGNATURE}`
- [ ] Load public keys from .aigrc/keys/ directory
- [ ] Verify signature over canonical string
- [ ] Return verification result with details
- [ ] Gracefully handle missing signatures (optional feature)

**Labels:** golden-thread, crypto, enterprise

---

### AIGOS-305: Add Golden Thread Component Extraction

**As a** identity manager
**I want** to extract Golden Thread components from Asset Cards
**So that** I can compute hashes at runtime

**Story Points:** 2

**Acceptance Criteria:**
- [ ] Extract ticket_id from asset card
- [ ] Extract approved_by from asset card (or owner.email)
- [ ] Extract approved_at from asset card
- [ ] Validate all required components present
- [ ] Return structured GoldenThreadComponents object
- [ ] Handle missing components with clear error

**Labels:** golden-thread, asset-card

---

### AIGOS-306: Add Golden Thread Schema to Asset Card

**As a** asset card author
**I want** a golden_thread section in asset cards
**So that** authorization metadata is captured

**Story Points:** 2

**Acceptance Criteria:**
- [ ] Add optional golden_thread section to AssetCardSchema:
  ```yaml
  golden_thread:
    ticket_id: FIN-1234
    approved_by: ciso@corp.com
    approved_at: 2025-01-15T10:30:00Z
    hash: sha256:7d865e959b...
    signature: RSA-SHA256:base64...
  ```
- [ ] Validate ticket_id format
- [ ] Validate email format for approved_by
- [ ] Validate ISO8601 for approved_at
- [ ] Validate hash format if present

**Labels:** golden-thread, schema, asset-card

---

### AIGOS-307: Add CLI Hash Command

**As a** developer
**I want** an `aigrc hash` command
**So that** I can compute Golden Thread hashes

**Story Points:** 3

**Acceptance Criteria:**
- [ ] Add `aigrc hash <card-path>` command
- [ ] Compute hash from asset card
- [ ] Output format: `sha256:7d865e...`
- [ ] Support --json output
- [ ] Support --verify flag to verify existing hash
- [ ] Return exit code 0 if valid, 3 if mismatch
- [ ] Add help text and examples

**Example:**
```bash
$ aigrc hash .aigrc/cards/my-ai-agent.yaml
sha256:7d865e959b2466918c9863afca942d0fb89d7c9ac0c99bafc3749504ded97730

$ aigrc hash --verify .aigrc/cards/my-ai-agent.yaml
✓ Golden Thread hash verified
```

**Labels:** cli, golden-thread

---

### AIGOS-308: Add Golden Thread Conformance Tests

**As a** spec implementer
**I want** conformance tests for Golden Thread
**So that** the implementation matches the spec exactly

**Story Points:** 1

**Acceptance Criteria:**
- [ ] Test all spec test vectors
- [ ] Test edge cases (special characters, timezones)
- [ ] Test hash format validation
- [ ] Test signature verification (if implemented)
- [ ] Document conformance level achieved

**Labels:** testing, golden-thread, conformance

---

# EPIC: AIGOS-E4 - Identity Manager

**Description:** Implement the Identity Manager (SPEC-RT-002) to establish cryptographic identity of AI agents at runtime.

**Priority:** P0 (Critical Path)
**Current Status:** Not Started
**Estimated Points:** 34
**Dependencies:** AIGOS-E1, AIGOS-E2, AIGOS-E3
**Risk Level:** LOW-MEDIUM

---

## User Stories

### AIGOS-401: Create @aigos/runtime Package Structure

**As a** developer building runtime governance
**I want** a dedicated runtime package
**So that** runtime components are organized

**Story Points:** 3

**Acceptance Criteria:**
- [ ] Create packages/runtime directory
- [ ] Add package.json with @aigos/runtime name
- [ ] Add tsconfig.json extending root
- [ ] Add tsup.config.ts for bundling
- [ ] Create src/ directory structure:
  - src/identity/
  - src/policy/
  - src/telemetry/
  - src/kill-switch/
  - src/capability-decay/
  - src/a2a/
- [ ] Add to pnpm-workspace.yaml
- [ ] Add to turbo.json pipeline

**Labels:** infrastructure, runtime, setup

---

### AIGOS-402: Implement RuntimeIdentity Creation

**As a** AI agent starting up
**I want** a RuntimeIdentity created
**So that** I have cryptographic identity

**Story Points:** 5

**Acceptance Criteria:**
- [ ] Generate UUIDv4 instance_id using crypto.randomUUID()
- [ ] Load Asset Card from configPath
- [ ] Extract asset_id, asset_name, asset_version from card
- [ ] Set created_at to current ISO8601 timestamp
- [ ] Initialize mode to NORMAL
- [ ] Initialize verified to false (until verified)
- [ ] Return frozen RuntimeIdentity object
- [ ] Log identity creation event

**TypeScript API:**
```typescript
async function createRuntimeIdentity(options: {
  assetCardPath: string;
  parentIdentity?: RuntimeIdentity;
}): Promise<RuntimeIdentity>
```

**Labels:** identity, runtime, core

---

### AIGOS-403: Implement Golden Thread Verification

**As a** runtime identity manager
**I want** to verify Golden Thread on startup
**So that** unverified agents are sandboxed

**Story Points:** 5

**Acceptance Criteria:**
- [ ] Compute hash from Asset Card components
- [ ] Compare with stored hash (if present)
- [ ] Set identity.verified = true if match
- [ ] Set identity.mode based on verification_failure_mode:
  - SANDBOX: mode = SANDBOX, continue
  - FAIL: throw error, prevent startup
- [ ] Log verification result
- [ ] Return verification details

**Labels:** identity, golden-thread, verification

---

### AIGOS-404: Implement Lineage Tracking

**As a** child agent
**I want** lineage tracking
**So that** my ancestry is known

**Story Points:** 5

**Acceptance Criteria:**
- [ ] For root agents:
  - generation_depth = 0
  - parent_instance_id = null
  - ancestor_chain = []
  - root_instance_id = instance_id
- [ ] For child agents:
  - generation_depth = parent.generation_depth + 1
  - parent_instance_id = parent.instance_id
  - ancestor_chain = [...parent.ancestor_chain, parent.instance_id]
  - root_instance_id = parent.root_instance_id
- [ ] Validate generation_depth < max_child_depth
- [ ] Reject if depth exceeded

**Labels:** identity, lineage, spawning

---

### AIGOS-405: Implement Capabilities Loading

**As a** runtime identity manager
**I want** to load capabilities from policy
**So that** agent permissions are known

**Story Points:** 5

**Acceptance Criteria:**
- [ ] Load policy file using policy selection algorithm
- [ ] Extract capabilities section
- [ ] Merge with Asset Card constraints (if any)
- [ ] For child agents: apply Capability Decay
- [ ] Create CapabilitiesManifest object
- [ ] Attach to RuntimeIdentity
- [ ] Cache for performance

**Labels:** identity, capabilities, policy

---

### AIGOS-406: Implement Operating Mode Management

**As a** runtime system
**I want** operating mode transitions
**So that** agent behavior reflects governance state

**Story Points:** 3

**Acceptance Criteria:**
- [ ] Implement mode enum: NORMAL, SANDBOX, RESTRICTED
- [ ] NORMAL: Full capabilities
- [ ] SANDBOX: Limited capabilities, log-only denials
- [ ] RESTRICTED: Minimal capabilities, strict enforcement
- [ ] Support mode transitions via API
- [ ] Emit telemetry on mode changes
- [ ] Prevent invalid transitions (e.g., RESTRICTED → NORMAL without auth)

**Labels:** identity, mode, runtime

---

### AIGOS-407: Add @guard Decorator API

**As a** developer protecting functions
**I want** a @guard decorator
**So that** governance checks are easy to add

**Story Points:** 5

**Acceptance Criteria:**
- [ ] Create @guard(action: string) TypeScript decorator
- [ ] Intercept function calls
- [ ] Call policy engine with action and context
- [ ] If denied: throw GovernanceError
- [ ] If allowed: proceed with original function
- [ ] Support async functions
- [ ] Pass function arguments as context

**TypeScript API:**
```typescript
class MyAgent {
  @guard('call_api')
  async callExternalAPI(url: string) {
    // Only executes if policy allows 'call_api' action
  }
}
```

**Labels:** identity, decorator, api

---

### AIGOS-408: Add Identity Manager Tests

**As a** developer maintaining identity manager
**I want** comprehensive tests
**So that** identity creation is reliable

**Story Points:** 3

**Acceptance Criteria:**
- [ ] Test identity creation for root agents
- [ ] Test identity creation for child agents
- [ ] Test Golden Thread verification pass/fail
- [ ] Test verification_failure_mode handling
- [ ] Test lineage tracking
- [ ] Test capabilities loading
- [ ] Test mode transitions
- [ ] Achieve 90%+ coverage

**Labels:** testing, identity

---

# EPIC: AIGOS-E5 - Policy Engine (The Bouncer)

**Description:** Implement the Policy Engine (SPEC-RT-003) for real-time permission evaluation with <2ms P99 latency.

**Priority:** P0 (Critical Path)
**Current Status:** Not Started
**Estimated Points:** 55
**Dependencies:** AIGOS-E1, AIGOS-E2, AIGOS-E4
**Risk Level:** MEDIUM

---

## User Stories

### AIGOS-501: Implement Core Policy Check Function

**As a** runtime governance system
**I want** a central permission check function
**So that** all actions are validated

**Story Points:** 5

**Acceptance Criteria:**
- [ ] Create `checkPermission(identity, action, resource?, context?)` function
- [ ] Return PolicyDecision: { allowed: boolean, reason?: string, code?: string }
- [ ] Support action strings (e.g., 'call_api', 'read_file')
- [ ] Support optional resource for domain checks
- [ ] Support optional context for custom checks
- [ ] Log all decisions

**TypeScript API:**
```typescript
interface PolicyDecision {
  allowed: boolean;
  reason?: string;
  code?: string;
  checked_at: string;
  duration_ms: number;
}

async function checkPermission(
  identity: RuntimeIdentity,
  action: string,
  resource?: string,
  context?: Record<string, unknown>
): Promise<PolicyDecision>
```

**Labels:** policy-engine, core, permission

---

### AIGOS-502: Implement Evaluation Chain (Short-Circuit)

**As a** policy engine
**I want** short-circuit evaluation
**So that** denials return immediately

**Story Points:** 8

**Acceptance Criteria:**
- [ ] Implement evaluation order per SPEC-RT-003:
  1. Kill Switch Check [O(1)]
  2. Capability Check [O(n)]
  3. Deny List Check [O(n)]
  4. Resource Allow Check [O(n)]
  5. Resource Deny Check [O(n)]
  6. Budget Check [O(1)]
  7. Custom Checks [O(k)]
- [ ] Return immediately on first DENY
- [ ] Track which check denied for telemetry
- [ ] Support skip flags for testing

**Labels:** policy-engine, evaluation, performance

---

### AIGOS-503: Implement Kill Switch Check

**As a** policy engine
**I want** kill switch as first check
**So that** terminated agents are blocked immediately

**Story Points:** 3

**Acceptance Criteria:**
- [ ] Check global kill switch state
- [ ] Check instance-specific termination
- [ ] Check asset-specific termination
- [ ] Return DENY with code 'TERMINATED' if killed
- [ ] Return DENY with code 'PAUSED' if paused
- [ ] O(1) time complexity (hash lookup)

**Labels:** policy-engine, kill-switch

---

### AIGOS-504: Implement Capability Check

**As a** policy engine
**I want** capability validation
**So that** actions are limited to allowed tools

**Story Points:** 5

**Acceptance Criteria:**
- [ ] Check action against allowed_tools array
- [ ] Check action against denied_tools array
- [ ] denied_tools takes precedence over allowed_tools
- [ ] Support wildcard matching (*, prefix_*)
- [ ] Return DENY with code 'CAPABILITY_DENIED'
- [ ] Log denied capabilities

**Labels:** policy-engine, capabilities

---

### AIGOS-505: Implement Resource Domain Checks

**As a** policy engine
**I want** domain pattern matching
**So that** external resources are controlled

**Story Points:** 5

**Acceptance Criteria:**
- [ ] Match resource against allowed_domains patterns
- [ ] Match resource against denied_domains patterns
- [ ] Deny-overrides-allow precedence
- [ ] Use pre-compiled regex for performance
- [ ] Return DENY with code 'RESOURCE_DENIED'
- [ ] Support URL parsing for domain extraction

**Labels:** policy-engine, domains, regex

---

### AIGOS-506: Implement Budget Check

**As a** policy engine
**I want** budget validation
**So that** cost limits are enforced

**Story Points:** 8

**Acceptance Criteria:**
- [ ] Track session_cost accumulator
- [ ] Track daily_cost accumulator (with daily reset)
- [ ] Track monthly_cost accumulator (with monthly reset)
- [ ] Check against max_cost_per_session
- [ ] Check against max_cost_per_day
- [ ] Check against max_cost_per_month
- [ ] Support rate limiting (calls per minute)
- [ ] Thread-safe updates (atomic operations)
- [ ] Return DENY with code 'BUDGET_EXCEEDED'

**Labels:** policy-engine, budget, cost

---

### AIGOS-507: Implement Custom Checks

**As a** policy engine
**I want** extensible custom checks
**So that** policies can have custom rules

**Story Points:** 5

**Acceptance Criteria:**
- [ ] Support registering custom check functions
- [ ] Pass action, resource, context to custom checks
- [ ] Aggregate results from all custom checks
- [ ] Return first DENY from custom checks
- [ ] Document custom check API

**TypeScript API:**
```typescript
type CustomCheck = (
  identity: RuntimeIdentity,
  action: string,
  resource?: string,
  context?: Record<string, unknown>
) => PolicyDecision | null;

policyEngine.registerCustomCheck('my-check', myCustomCheck);
```

**Labels:** policy-engine, extensibility

---

### AIGOS-508: Implement Dry-Run Mode

**As a** developer rolling out policies
**I want** dry-run mode
**So that** I can test policies without enforcement

**Story Points:** 3

**Acceptance Criteria:**
- [ ] Check policy mode: dry_run setting
- [ ] If dry_run: always return allowed = true
- [ ] But record what would have been denied
- [ ] Mark telemetry as dry_run: true
- [ ] Return would_deny: true in decision
- [ ] Log would-be denials clearly

**Labels:** policy-engine, dry-run, testing

---

### AIGOS-509: Implement Policy Engine Caching

**As a** policy engine
**I want** caching for performance
**So that** repeated checks are fast

**Story Points:** 5

**Acceptance Criteria:**
- [ ] Cache compiled regex patterns
- [ ] Cache policy lookups by asset_id
- [ ] Cache capability sets as Set<string>
- [ ] Invalidate cache on policy reload
- [ ] Memory limit for cache (< 25MB total)
- [ ] LRU eviction for cache

**Labels:** policy-engine, performance, caching

---

### AIGOS-510: Add Policy Engine Performance Tests

**As a** developer ensuring performance
**I want** latency benchmarks
**So that** <2ms P99 is maintained

**Story Points:** 3

**Acceptance Criteria:**
- [ ] Benchmark single permission check
- [ ] Target: < 2ms P99
- [ ] Benchmark pattern matching
- [ ] Target: < 0.1ms per pattern
- [ ] Benchmark with 100+ policies
- [ ] Run benchmarks in CI
- [ ] Alert on regression

**Labels:** policy-engine, performance, testing

---

### AIGOS-511: Add Policy Engine Unit Tests

**As a** developer maintaining policy engine
**I want** comprehensive tests
**So that** evaluation is reliable

**Story Points:** 5

**Acceptance Criteria:**
- [ ] Test each check type independently
- [ ] Test short-circuit behavior
- [ ] Test deny-overrides-allow
- [ ] Test budget tracking
- [ ] Test dry-run mode
- [ ] Test edge cases
- [ ] Achieve 95%+ coverage

**Labels:** policy-engine, testing

---

# EPIC: AIGOS-E6 - Telemetry Emitter

**Description:** Implement the Telemetry Emitter (SPEC-RT-004) for OpenTelemetry traces with semantic conventions (SPEC-PRT-002).

**Priority:** P1 (High Priority)
**Current Status:** Not Started
**Estimated Points:** 34
**Dependencies:** AIGOS-E4, AIGOS-E5
**Risk Level:** LOW

---

## User Stories

### AIGOS-601: Integrate OpenTelemetry SDK

**As a** telemetry emitter
**I want** OTel SDK integration
**So that** traces are standards-compliant

**Story Points:** 5

**Acceptance Criteria:**
- [ ] Add @opentelemetry/sdk-trace-node dependency
- [ ] Add @opentelemetry/exporter-trace-otlp-http dependency
- [ ] Initialize TracerProvider on startup
- [ ] Configure BatchSpanProcessor
- [ ] Configure OTLP exporter (HTTP or gRPC)
- [ ] Set resource attributes (service.name, aigos.sdk.version)
- [ ] Support graceful shutdown

**Labels:** telemetry, otel, setup

---

### AIGOS-602: Implement Semantic Convention Constants

**As a** telemetry emitter
**I want** constant definitions for semantic conventions
**So that** attribute names are consistent

**Story Points:** 3

**Acceptance Criteria:**
- [ ] Create constants for all aigos.* attributes
- [ ] Namespace: AIGOS_ATTR.* or similar
- [ ] Include all attributes from SPEC-PRT-002:
  - aigos.instance_id
  - aigos.asset_id
  - aigos.asset_name
  - aigos.risk_level
  - aigos.identity.verified
  - aigos.decision.result
  - aigos.violation.severity
  - etc.
- [ ] Document each attribute

**Labels:** telemetry, semantic-conventions

---

### AIGOS-603: Implement emitIdentity()

**As a** AI agent starting up
**I want** identity trace emitted
**So that** startup is observable

**Story Points:** 3

**Acceptance Criteria:**
- [ ] Emit span: aigos.governance.identity
- [ ] Include all identity attributes
- [ ] Include risk level
- [ ] Include verification status
- [ ] Include mode
- [ ] 100% sampling for identity spans
- [ ] Non-blocking (< 0.1ms)

**Labels:** telemetry, identity

---

### AIGOS-604: Implement emitDecision()

**As a** policy engine
**I want** decision traces emitted
**So that** permission checks are observable

**Story Points:** 3

**Acceptance Criteria:**
- [ ] Emit span: aigos.governance.decision
- [ ] Include action, resource
- [ ] Include decision result (ALLOWED/DENIED/WOULD_DENY)
- [ ] Include reason if denied
- [ ] Include duration_ms
- [ ] 10-100% sampling (configurable)
- [ ] Non-blocking (< 0.1ms)

**Labels:** telemetry, decision

---

### AIGOS-605: Implement emitViolation()

**As a** policy engine
**I want** violation traces emitted
**So that** denials are highly visible

**Story Points:** 3

**Acceptance Criteria:**
- [ ] Emit span: aigos.governance.violation
- [ ] Include violation code
- [ ] Include severity (warning/error/critical)
- [ ] Include action and resource
- [ ] Include full context
- [ ] 100% sampling (all violations)
- [ ] Non-blocking (< 0.1ms)

**Labels:** telemetry, violation

---

### AIGOS-606: Implement emitBudget()

**As a** budget tracker
**I want** budget traces emitted
**So that** cost is observable

**Story Points:** 3

**Acceptance Criteria:**
- [ ] Emit span: aigos.governance.budget
- [ ] Include cost_incurred
- [ ] Include session_total
- [ ] Include daily_total
- [ ] Include budget_remaining
- [ ] 10-100% sampling (configurable)
- [ ] Non-blocking (< 0.1ms)

**Labels:** telemetry, budget

---

### AIGOS-607: Implement emitTerminate()

**As a** agent shutting down
**I want** termination trace emitted
**So that** shutdown is observable

**Story Points:** 3

**Acceptance Criteria:**
- [ ] Emit span: aigos.governance.terminate
- [ ] Include termination source:
  - kill_switch
  - budget_exceeded
  - policy_violation
  - graceful
- [ ] Include final budget totals
- [ ] Include session duration
- [ ] 100% sampling
- [ ] Blocking allowed (flush before exit)

**Labels:** telemetry, terminate

---

### AIGOS-608: Implement emitSpawn()

**As a** parent agent
**I want** spawn traces emitted
**So that** child creation is observable

**Story Points:** 3

**Acceptance Criteria:**
- [ ] Emit span: aigos.governance.spawn
- [ ] Include parent_instance_id
- [ ] Include child_instance_id
- [ ] Include generation_depth
- [ ] Include capability_mode (decay/explicit/inherit)
- [ ] 100% sampling
- [ ] Non-blocking (< 0.1ms)

**Labels:** telemetry, spawn

---

### AIGOS-609: Implement No-Op Telemetry

**As a** developer with telemetry disabled
**I want** zero overhead
**So that** performance is not impacted

**Story Points:** 2

**Acceptance Criteria:**
- [ ] Check telemetry_enabled flag
- [ ] If disabled: return immediately from all emit* methods
- [ ] Zero allocations when disabled
- [ ] Zero network calls when disabled
- [ ] Document how to disable

**Labels:** telemetry, performance

---

### AIGOS-610: Implement Metrics (Counters, Gauges)

**As a** operations team
**I want** metrics for monitoring
**So that** I can alert on anomalies

**Story Points:** 5

**Acceptance Criteria:**
- [ ] Counter: aigos.decisions.total (by result)
- [ ] Counter: aigos.violations.total (by code)
- [ ] Counter: aigos.spawns.total
- [ ] Counter: aigos.terminations.total (by source)
- [ ] Gauge: aigos.budget.session_used
- [ ] Gauge: aigos.budget.daily_used
- [ ] Gauge: aigos.agents.active
- [ ] Histogram: aigos.decision.duration

**Labels:** telemetry, metrics

---

### AIGOS-611: Add Telemetry Tests

**As a** developer maintaining telemetry
**I want** comprehensive tests
**So that** spans are correct

**Story Points:** 3

**Acceptance Criteria:**
- [ ] Test each emit* method
- [ ] Verify attribute presence
- [ ] Verify attribute values
- [ ] Test no-op mode
- [ ] Test sampling rates
- [ ] Mock OTel SDK for unit tests

**Labels:** telemetry, testing

---

# EPIC: AIGOS-E7 - Kill Switch

**Description:** Implement the Kill Switch (SPEC-RT-005) for remote termination of agents within 60 seconds.

**Priority:** P1 (High Priority)
**Current Status:** Not Started
**Estimated Points:** 55
**Dependencies:** AIGOS-E4
**Risk Level:** MEDIUM-HIGH

---

## User Stories

### AIGOS-701: Implement SSE Listener (Primary)

**As a** kill switch
**I want** SSE listener
**So that** termination commands are received in real-time

**Story Points:** 8

**Acceptance Criteria:**
- [ ] Connect to SSE endpoint on startup
- [ ] Parse AIGOS kill switch event format
- [ ] Handle connection drops with reconnect
- [ ] Exponential backoff for reconnects
- [ ] Log all received commands
- [ ] Support custom endpoint configuration
- [ ] Handle malformed events gracefully

**Labels:** kill-switch, sse, transport

---

### AIGOS-702: Implement Polling Listener (Fallback)

**As a** kill switch
**I want** polling fallback
**So that** termination works without SSE

**Story Points:** 5

**Acceptance Criteria:**
- [ ] Poll endpoint every 30 seconds
- [ ] Parse JSON command response
- [ ] Track last command ID to avoid duplicates
- [ ] Switch from SSE if SSE fails repeatedly
- [ ] Support custom poll interval configuration
- [ ] Low resource usage

**Labels:** kill-switch, polling, transport

---

### AIGOS-703: Implement Local File Listener (Air-Gapped)

**As a** air-gapped deployment
**I want** local file listener
**So that** termination works offline

**Story Points:** 3

**Acceptance Criteria:**
- [ ] Watch configured file path for changes
- [ ] Parse JSON command from file
- [ ] Support append-only command log
- [ ] Clear processed commands
- [ ] Use file polling (no fsnotify requirement)

**Labels:** kill-switch, file, transport

---

### AIGOS-704: Implement TERMINATE Command Handler

**As a** kill switch
**I want** TERMINATE command handling
**So that** agents can be fully stopped

**Story Points:** 5

**Acceptance Criteria:**
- [ ] Parse TERMINATE command
- [ ] Verify signature before processing
- [ ] Set identity mode to TERMINATED
- [ ] Emit aigos.governance.terminate span
- [ ] Flush telemetry buffer
- [ ] Close all connections
- [ ] Call registered shutdown hooks
- [ ] Exit process with code 0

**Labels:** kill-switch, terminate

---

### AIGOS-705: Implement PAUSE Command Handler

**As a** kill switch
**I want** PAUSE command handling
**So that** agents can be suspended

**Story Points:** 3

**Acceptance Criteria:**
- [ ] Parse PAUSE command
- [ ] Verify signature before processing
- [ ] Set identity mode to PAUSED
- [ ] Policy engine returns DENY for all actions
- [ ] Keep connections alive
- [ ] Wait for RESUME
- [ ] Emit pause telemetry

**Labels:** kill-switch, pause

---

### AIGOS-706: Implement RESUME Command Handler

**As a** kill switch
**I want** RESUME command handling
**So that** paused agents can continue

**Story Points:** 3

**Acceptance Criteria:**
- [ ] Parse RESUME command
- [ ] Verify signature before processing
- [ ] Set identity mode back to NORMAL
- [ ] Policy engine resumes normal evaluation
- [ ] Emit resume telemetry
- [ ] Only valid after PAUSE

**Labels:** kill-switch, resume

---

### AIGOS-707: Implement Signature Verification

**As a** kill switch
**I want** command signature verification
**So that** only authorized commands execute

**Story Points:** 8

**Acceptance Criteria:**
- [ ] Load organization public key
- [ ] Verify RSA-SHA256 or ECDSA P-256 signature
- [ ] Signature covers: command_id, type, target, timestamp
- [ ] Reject invalid signatures with error log
- [ ] Reject unsigned commands
- [ ] Support key rotation via JWKS

**Labels:** kill-switch, security, crypto

---

### AIGOS-708: Implement Replay Prevention

**As a** kill switch
**I want** replay prevention
**So that** old commands can't be replayed

**Story Points:** 5

**Acceptance Criteria:**
- [ ] Validate command_id uniqueness
- [ ] Store seen command_ids (with TTL)
- [ ] Validate timestamp within 5 minutes
- [ ] Reject replayed commands
- [ ] Log replay attempts as violations

**Labels:** kill-switch, security

---

### AIGOS-709: Implement Cascading Termination

**As a** parent agent
**I want** child termination on my termination
**So that** all descendants stop

**Story Points:** 8

**Acceptance Criteria:**
- [ ] Track spawned child instance_ids
- [ ] On parent TERMINATE: send TERMINATE to all children
- [ ] Wait for children to terminate (with timeout)
- [ ] Log cascade progress
- [ ] Handle unreachable children
- [ ] Emit cascade telemetry

**Labels:** kill-switch, cascade, lineage

---

### AIGOS-710: Verify <60s SLA

**As a** operations team
**I want** <60s termination SLA
**So that** rogue agents are stopped quickly

**Story Points:** 5

**Acceptance Criteria:**
- [ ] Measure time from command issue to process exit
- [ ] Target: < 36 seconds (P95)
- [ ] Maximum: 60 seconds (P99)
- [ ] Include network latency, processing, shutdown
- [ ] Document SLA in configuration
- [ ] Add SLA monitoring metrics

**Labels:** kill-switch, sla, performance

---

### AIGOS-711: Add Kill Switch Tests

**As a** developer maintaining kill switch
**I want** comprehensive tests
**So that** termination is reliable

**Story Points:** 5

**Acceptance Criteria:**
- [ ] Test each command type
- [ ] Test signature verification
- [ ] Test replay prevention
- [ ] Test cascade termination
- [ ] Test transport fallback
- [ ] Test connection recovery
- [ ] Integration tests with mock server

**Labels:** kill-switch, testing

---

# EPIC: AIGOS-E8 - Capability Decay

**Description:** Implement Capability Decay (SPEC-RT-006) to enforce that child capabilities are a subset of parent capabilities.

**Priority:** P1 (High Priority)
**Current Status:** Not Started
**Estimated Points:** 34
**Dependencies:** AIGOS-E4, AIGOS-E5
**Risk Level:** LOW-MEDIUM

---

## User Stories

### AIGOS-801: Implement Decay Mode (Default)

**As a** parent agent
**I want** automatic capability decay
**So that** children have reduced permissions

**Story Points:** 8

**Acceptance Criteria:**
- [ ] Apply decay factor to budgets (e.g., 0.5x parent budget)
- [ ] Reduce max_child_depth by 1
- [ ] Keep allowed_tools as subset
- [ ] Keep allowed_domains as subset
- [ ] Add parent's denied_tools to child
- [ ] Add parent's denied_domains to child
- [ ] Support configurable decay factors

**Labels:** capability-decay, decay-mode

---

### AIGOS-802: Implement Explicit Mode

**As a** parent agent
**I want** explicit capability grants
**So that** children only get specified permissions

**Story Points:** 5

**Acceptance Criteria:**
- [ ] Require explicit capability specification
- [ ] Validate each capability against parent
- [ ] Reject if any capability exceeds parent
- [ ] No automatic inheritance
- [ ] Clear error messages for violations

**Labels:** capability-decay, explicit-mode

---

### AIGOS-803: Implement Inherit Mode

**As a** parent agent
**I want** capability inheritance
**So that** children match parent (with warning)

**Story Points:** 3

**Acceptance Criteria:**
- [ ] Copy parent capabilities exactly
- [ ] Emit warning (not recommended)
- [ ] Log inherit mode usage
- [ ] Still increment generation_depth
- [ ] Still enforce max_child_depth

**Labels:** capability-decay, inherit-mode

---

### AIGOS-804: Implement Tool Subset Validation

**As a** capability decay system
**I want** tool subset validation
**So that** children can't exceed parent tools

**Story Points:** 5

**Acceptance Criteria:**
- [ ] child_tools ⊆ parent_tools
- [ ] Handle wildcard expansion
- [ ] Handle tool prefixes
- [ ] Return detailed error on violation
- [ ] O(n) time complexity

**Labels:** capability-decay, validation

---

### AIGOS-805: Implement Domain Subset Validation

**As a** capability decay system
**I want** domain subset validation
**So that** children can't access more domains

**Story Points:** 5

**Acceptance Criteria:**
- [ ] child_domains covered by parent_domains
- [ ] Pattern subset checking for regex
- [ ] child_denied_domains ⊇ parent_denied_domains
- [ ] Return detailed error on violation
- [ ] Handle complex regex patterns

**Labels:** capability-decay, validation, regex

---

### AIGOS-806: Implement Budget Limit Validation

**As a** capability decay system
**I want** budget limit validation
**So that** children can't exceed parent budget

**Story Points:** 3

**Acceptance Criteria:**
- [ ] child_budget ≤ parent_budget
- [ ] Per-session, per-day, per-month
- [ ] Handle null (unlimited) cases
- [ ] Return detailed error on violation

**Labels:** capability-decay, validation, budget

---

### AIGOS-807: Implement Depth Limit Validation

**As a** capability decay system
**I want** depth limit validation
**So that** spawning chains are limited

**Story Points:** 2

**Acceptance Criteria:**
- [ ] child_depth < parent's max_child_depth
- [ ] Return error if depth exceeded
- [ ] Log depth violations
- [ ] Suggest increasing limit if needed

**Labels:** capability-decay, validation, depth

---

### AIGOS-808: Add Capability Decay Tests

**As a** developer maintaining capability decay
**I want** comprehensive tests
**So that** privilege escalation is prevented

**Story Points:** 5

**Acceptance Criteria:**
- [ ] Test each decay mode
- [ ] Test tool subset validation
- [ ] Test domain subset validation
- [ ] Test budget validation
- [ ] Test depth validation
- [ ] Test edge cases
- [ ] Test violation scenarios
- [ ] Achieve 95%+ coverage

**Labels:** capability-decay, testing

---

# EPIC: AIGOS-E9 - Governance Token (A2A)

**Description:** Implement the Governance Token Protocol (SPEC-PRT-003) for Agent-to-Agent mutual authentication.

**Priority:** P2 (Medium Priority)
**Current Status:** Not Started
**Estimated Points:** 55
**Dependencies:** AIGOS-E4, AIGOS-E5, AIGOS-E7, AIGOS-E8
**Risk Level:** MEDIUM

---

## User Stories

### AIGOS-901: Implement Token Generation

**As a** AI agent
**I want** to generate governance tokens
**So that** I can prove my governance to other agents

**Story Points:** 8

**Acceptance Criteria:**
- [ ] Generate JWT with AIGOS-GOV+jwt type
- [ ] Include all identity claims
- [ ] Include all governance claims
- [ ] Include all control claims
- [ ] Include all capability claims
- [ ] Include all lineage claims
- [ ] Sign with ES256 or RS256
- [ ] Short TTL (5 minutes default)
- [ ] Include unique jti (JWT ID)

**Labels:** a2a, token, jwt

---

### AIGOS-902: Implement Token Validation

**As a** AI agent receiving requests
**I want** to validate incoming tokens
**So that** I can trust the requester

**Story Points:** 8

**Acceptance Criteria:**
- [ ] Verify JWT signature
- [ ] Verify not expired (exp claim)
- [ ] Verify not before (nbf claim)
- [ ] Verify issuer (iss claim)
- [ ] Verify audience (aud claim)
- [ ] Extract and validate all aigos claims
- [ ] Check control claims (paused, termination_pending)
- [ ] Return validation result with details

**Labels:** a2a, token, validation

---

### AIGOS-903: Implement AIGOS Handshake (Request)

**As a** AI agent calling another agent
**I want** to perform AIGOS handshake
**So that** we mutually authenticate

**Story Points:** 8

**Acceptance Criteria:**
- [ ] Generate token before request
- [ ] Include X-AIGOS-Token header
- [ ] Include X-AIGOS-Protocol-Version header
- [ ] Validate response token
- [ ] Abort if validation fails
- [ ] Retry with fresh token on expiry
- [ ] Log handshake events

**Labels:** a2a, handshake, client

---

### AIGOS-904: Implement AIGOS Handshake (Response)

**As a** AI agent receiving requests
**I want** to complete AIGOS handshake
**So that** I prove my governance too

**Story Points:** 5

**Acceptance Criteria:**
- [ ] Extract token from request header
- [ ] Validate incoming token
- [ ] Apply inbound A2A policy
- [ ] Generate response token
- [ ] Include X-AIGOS-Token in response
- [ ] Reject if inbound policy violated

**Labels:** a2a, handshake, server

---

### AIGOS-905: Implement Inbound A2A Policy

**As a** AI agent receiving requests
**I want** inbound trust policy
**So that** I control who can call me

**Story Points:** 5

**Acceptance Criteria:**
- [ ] Load inbound policy from config
- [ ] Check max_risk_level requirement
- [ ] Check kill_switch_required flag
- [ ] Check golden_thread_verified_required flag
- [ ] Check min_generation_depth
- [ ] Check blocked_organizations list
- [ ] Check trusted_organizations list
- [ ] Return DENY if requirements not met

**Labels:** a2a, policy, inbound

---

### AIGOS-906: Implement Outbound A2A Policy

**As a** AI agent making requests
**I want** outbound trust policy
**So that** I control who I call

**Story Points:** 5

**Acceptance Criteria:**
- [ ] Load outbound policy from config
- [ ] Validate target before request
- [ ] Check max_risk_level requirement
- [ ] Check kill_switch_required flag
- [ ] Check blocked_domains list
- [ ] Abort request if requirements not met

**Labels:** a2a, policy, outbound

---

### AIGOS-907: Implement Token Claims Validation

**As a** token validator
**I want** claim-level validation
**So that** token data is correct

**Story Points:** 5

**Acceptance Criteria:**
- [ ] Validate identity claim structure
- [ ] Validate governance claim values
- [ ] Validate control claim booleans
- [ ] Validate capability hash matches
- [ ] Validate lineage chain validity
- [ ] Return specific errors for each check

**Labels:** a2a, token, claims

---

### AIGOS-908: Implement HTTP Client Middleware

**As a** developer making A2A calls
**I want** middleware for A2A auth
**So that** integration is easy

**Story Points:** 5

**Acceptance Criteria:**
- [ ] Create fetch/axios middleware
- [ ] Automatically add token headers
- [ ] Automatically validate response tokens
- [ ] Handle token refresh
- [ ] Configurable per-request override
- [ ] TypeScript types

**Labels:** a2a, middleware, dx

---

### AIGOS-909: Implement HTTP Server Middleware

**As a** developer serving A2A requests
**I want** middleware for A2A validation
**So that** integration is easy

**Story Points:** 5

**Acceptance Criteria:**
- [ ] Create Express/Fastify middleware
- [ ] Extract and validate incoming tokens
- [ ] Apply inbound policy
- [ ] Add identity to request context
- [ ] Generate response token
- [ ] Reject unauthorized requests

**Labels:** a2a, middleware, dx

---

### AIGOS-910: Add A2A Tests

**As a** developer maintaining A2A
**I want** comprehensive tests
**So that** mutual authentication works

**Story Points:** 5

**Acceptance Criteria:**
- [ ] Test token generation
- [ ] Test token validation
- [ ] Test handshake flow
- [ ] Test policy enforcement
- [ ] Test error cases
- [ ] Integration tests with mock servers
- [ ] Achieve 90%+ coverage

**Labels:** a2a, testing

---

# EPIC: AIGOS-E10 - CLI Enhancements

**Description:** Complete CLI implementation per SPEC-CLI-001, including missing commands and output formats.

**Priority:** P1 (High Priority)
**Current Status:** 75% Complete
**Estimated Points:** 21
**Dependencies:** AIGOS-E3
**Risk Level:** LOW

---

## User Stories

### AIGOS-1001: Add `aigrc hash` Command

**As a** developer
**I want** `aigrc hash` command
**So that** I can compute Golden Thread hashes

**Story Points:** 3

**Description:** Implement the hash command as detailed in AIGOS-307. Cross-reference that story for full acceptance criteria.

**Labels:** cli, golden-thread

---

### AIGOS-1002: Add SARIF Output Format

**As a** developer using IDEs
**I want** SARIF output from validate
**So that** issues appear in my editor

**Story Points:** 5

**Acceptance Criteria:**
- [ ] Add --format sarif option to validate command
- [ ] Generate SARIF 2.1.0 compliant output
- [ ] Include rule definitions for each check
- [ ] Include result locations with file/line
- [ ] Include severity levels
- [ ] Support output to file
- [ ] Test with VS Code SARIF viewer

**Labels:** cli, sarif, ide

---

### AIGOS-1003: Add --fix Auto-Correct

**As a** developer fixing issues
**I want** --fix option
**So that** simple issues are auto-corrected

**Story Points:** 5

**Acceptance Criteria:**
- [ ] Add --fix option to validate command
- [ ] Auto-fix: missing required fields with defaults
- [ ] Auto-fix: date format normalization
- [ ] Auto-fix: risk level mapping
- [ ] Report what was fixed
- [ ] Don't auto-fix semantic issues
- [ ] Dry-run with --fix --dry-run

**Labels:** cli, auto-fix

---

### AIGOS-1004: Complete Exit Code Coverage

**As a** CI pipeline
**I want** distinct exit codes
**So that** I can handle each case

**Story Points:** 2

**Acceptance Criteria:**
- [ ] Exit 0: Success
- [ ] Exit 1: General error
- [ ] Exit 2: Invalid arguments
- [ ] Exit 3: Validation errors found
- [ ] Exit 4: File not found
- [ ] Exit 5: Permission denied
- [ ] Document exit codes
- [ ] Test each exit code

**Labels:** cli, exit-codes

---

### AIGOS-1005: Add Golden Thread Status to `status`

**As a** developer checking governance
**I want** Golden Thread status in `aigrc status`
**So that** I see verification state

**Story Points:** 3

**Acceptance Criteria:**
- [ ] Show hash presence/absence
- [ ] Show verification status
- [ ] Show signature presence (if any)
- [ ] Color code status (green/yellow/red)
- [ ] Include in JSON output

**Labels:** cli, status, golden-thread

---

### AIGOS-1006: Add `aigrc version` Enhancements

**As a** developer troubleshooting
**I want** detailed version info
**So that** I can report issues accurately

**Story Points:** 3

**Acceptance Criteria:**
- [ ] Show CLI version
- [ ] Show @aigrc/core version
- [ ] Show Node.js version
- [ ] Show npm/pnpm version
- [ ] Show OS/platform
- [ ] Show --json format
- [ ] Check for updates (optional)

**Labels:** cli, version

---

# EPIC: AIGOS-E11 - License Validation

**Description:** Implement JWT-based license key validation (SPEC-LIC-001) for paid tier feature gating.

**Priority:** P2 (Medium Priority)
**Current Status:** Not Started
**Estimated Points:** 21
**Dependencies:** AIGOS-E1
**Risk Level:** LOW

---

## User Stories

### AIGOS-1101: Implement JWT License Parsing

**As a** license validator
**I want** JWT parsing
**So that** license keys are decoded

**Story Points:** 3

**Acceptance Criteria:**
- [ ] Parse JWT header (alg, typ, kid)
- [ ] Parse JWT payload
- [ ] Don't validate signature yet
- [ ] Handle malformed JWTs gracefully
- [ ] Return structured license object

**Labels:** license, jwt, parsing

---

### AIGOS-1102: Implement License Signature Verification

**As a** license validator
**I want** signature verification
**So that** license keys are authentic

**Story Points:** 5

**Acceptance Criteria:**
- [ ] Support RS256 algorithm
- [ ] Support ES256 algorithm
- [ ] Load public key from configuration
- [ ] Support key rotation via JWKS
- [ ] Verify signature before trusting claims
- [ ] Return verification status

**Labels:** license, jwt, security

---

### AIGOS-1103: Implement License Claims Validation

**As a** license validator
**I want** claims validation
**So that** licenses are current and valid

**Story Points:** 3

**Acceptance Criteria:**
- [ ] Check issuer (iss = https://license.aigos.dev)
- [ ] Check audience (aud = aigrc)
- [ ] Check expiration (exp)
- [ ] Apply 14-day grace period
- [ ] Validate tier claim
- [ ] Validate features array
- [ ] Validate limits object

**Labels:** license, claims, validation

---

### AIGOS-1104: Implement Feature Gating

**As a** feature system
**I want** feature checks
**So that** paid features are gated

**Story Points:** 5

**Acceptance Criteria:**
- [ ] Create `isFeatureEnabled(feature)` function
- [ ] Check features array from license
- [ ] Check tier for implicit features
- [ ] Default to community tier if no license
- [ ] Gate Kill Switch to Professional+
- [ ] Gate Capability Decay to Professional+
- [ ] Gate Multi-Jurisdiction to Professional+
- [ ] Gate SSO to Enterprise

**Labels:** license, features, gating

---

### AIGOS-1105: Implement Limit Enforcement

**As a** usage tracker
**I want** limit enforcement
**So that** usage is within license

**Story Points:** 3

**Acceptance Criteria:**
- [ ] Track agent count
- [ ] Track asset count
- [ ] Track user count (if applicable)
- [ ] Check against license limits
- [ ] Return limit exceeded errors
- [ ] Default limits for community tier

**Labels:** license, limits, enforcement

---

### AIGOS-1106: Add License Tests

**As a** developer maintaining licensing
**I want** comprehensive tests
**So that** licensing works correctly

**Story Points:** 2

**Acceptance Criteria:**
- [ ] Test JWT parsing
- [ ] Test signature verification
- [ ] Test claims validation
- [ ] Test feature gating
- [ ] Test limit enforcement
- [ ] Test grace period
- [ ] Test community tier defaults

**Labels:** license, testing

---

# EPIC: AIGOS-E12 - Integration & Testing

**Description:** Ensure all components integrate properly with comprehensive testing and documentation.

**Priority:** P1 (High Priority)
**Current Status:** Partial
**Estimated Points:** 34
**Dependencies:** All previous epics
**Risk Level:** LOW

---

## User Stories

### AIGOS-1201: Create Integration Test Suite

**As a** developer ensuring quality
**I want** integration tests
**So that** components work together

**Story Points:** 8

**Acceptance Criteria:**
- [ ] Test Identity → Policy Engine integration
- [ ] Test Policy Engine → Telemetry integration
- [ ] Test Kill Switch → Identity integration
- [ ] Test Capability Decay → Identity integration
- [ ] Test A2A → Identity integration
- [ ] Test CLI → Core integration
- [ ] End-to-end governance flow test
- [ ] Run in CI pipeline

**Labels:** testing, integration

---

### AIGOS-1202: Create Conformance Test Suite

**As a** spec implementer
**I want** conformance tests
**So that** implementation matches spec

**Story Points:** 8

**Acceptance Criteria:**
- [ ] Test all SPEC-PRT-001 requirements
- [ ] Test all SPEC-RT-002 requirements
- [ ] Test all SPEC-RT-003 requirements
- [ ] Test all SPEC-RT-004 requirements
- [ ] Test all SPEC-RT-005 requirements
- [ ] Test all SPEC-RT-006 requirements
- [ ] Test all SPEC-CLI-001 requirements
- [ ] Generate conformance report

**Labels:** testing, conformance, specs

---

### AIGOS-1203: Add Performance Benchmarks

**As a** developer ensuring performance
**I want** benchmarks
**So that** latency requirements are met

**Story Points:** 5

**Acceptance Criteria:**
- [ ] Benchmark policy check latency (target: < 2ms P99)
- [ ] Benchmark telemetry emit latency (target: < 0.1ms)
- [ ] Benchmark pattern matching (target: < 0.1ms)
- [ ] Benchmark identity creation (target: < 10ms)
- [ ] Run benchmarks in CI
- [ ] Alert on regression

**Labels:** testing, performance, benchmarks

---

### AIGOS-1204: Update Documentation

**As a** developer using AIGRC/AIGOS
**I want** updated documentation
**So that** I can use new features

**Story Points:** 5

**Acceptance Criteria:**
- [ ] Update README with new features
- [ ] Document runtime API
- [ ] Document policy file format
- [ ] Document A2A protocol usage
- [ ] Add examples for each component
- [ ] Update architecture diagrams
- [ ] Add troubleshooting guide

**Labels:** documentation

---

### AIGOS-1205: Create Migration Guide

**As a** developer upgrading
**I want** migration guide
**So that** I can upgrade smoothly

**Story Points:** 3

**Acceptance Criteria:**
- [ ] Document breaking changes
- [ ] Document new features
- [ ] Document configuration changes
- [ ] Provide upgrade script (if needed)
- [ ] List deprecated features
- [ ] Provide timeline for deprecations

**Labels:** documentation, migration

---

### AIGOS-1206: Add SDK Examples

**As a** developer integrating AIGOS
**I want** example code
**So that** I can get started quickly

**Story Points:** 5

**Acceptance Criteria:**
- [ ] TypeScript example: Basic identity
- [ ] TypeScript example: @guard decorator
- [ ] TypeScript example: Policy evaluation
- [ ] TypeScript example: Telemetry
- [ ] TypeScript example: A2A communication
- [ ] Python example: Basic integration
- [ ] Add to examples/ directory

**Labels:** documentation, examples

---

# Appendix: Priority Matrix

## P0 (Critical Path - Must Complete First)

| Epic | Stories | Total Points |
|------|---------|--------------|
| AIGOS-E1 | 8 stories | 21 |
| AIGOS-E2 | 9 stories | 34 |
| AIGOS-E3 | 8 stories | 21 |
| AIGOS-E4 | 8 stories | 34 |
| AIGOS-E5 | 11 stories | 55 |

**P0 Total: 165 points**

## P1 (High Priority - Complete Second)

| Epic | Stories | Total Points |
|------|---------|--------------|
| AIGOS-E6 | 11 stories | 34 |
| AIGOS-E7 | 11 stories | 55 |
| AIGOS-E8 | 8 stories | 34 |
| AIGOS-E10 | 6 stories | 21 |
| AIGOS-E12 | 6 stories | 34 |

**P1 Total: 178 points**

## P2 (Medium Priority - Complete Third)

| Epic | Stories | Total Points |
|------|---------|--------------|
| AIGOS-E9 | 10 stories | 55 |
| AIGOS-E11 | 6 stories | 21 |

**P2 Total: 76 points**

---

# Appendix: Dependency Graph

```
AIGOS-E1 (Core Foundation)
    │
    ├──→ AIGOS-E2 (Config & Policy)
    │       │
    │       └──→ AIGOS-E4 (Identity Manager)
    │               │
    │               ├──→ AIGOS-E5 (Policy Engine)
    │               │       │
    │               │       ├──→ AIGOS-E6 (Telemetry)
    │               │       │
    │               │       └──→ AIGOS-E8 (Capability Decay)
    │               │               │
    │               │               └──→ AIGOS-E9 (A2A)
    │               │
    │               └──→ AIGOS-E7 (Kill Switch)
    │                       │
    │                       └──→ AIGOS-E9 (A2A)
    │
    ├──→ AIGOS-E3 (Golden Thread)
    │       │
    │       └──→ AIGOS-E10 (CLI Enhancements)
    │
    └──→ AIGOS-E11 (License Validation)

AIGOS-E12 (Integration & Testing) depends on all others
```

---

# Appendix: Risk Assessment

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Performance regression | HIGH | MEDIUM | Continuous benchmarking, latency budgets |
| Security vulnerability | CRITICAL | LOW | Security review, input validation, crypto best practices |
| Specification ambiguity | MEDIUM | LOW | Clarify with spec authors, document assumptions |
| Integration complexity | MEDIUM | MEDIUM | Start minimal (Level 1), iterate |
| Breaking changes | HIGH | LOW | Semantic versioning, deprecation periods |

---

**Document End**

*Generated: 2025-12-30*
*Total Epics: 12*
*Total User Stories: 102*
*Total Estimated Points: 419*
