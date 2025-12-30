#!/usr/bin/env node
/**
 * JIRA Import Script for AIGRC/AIGOS Master Plan
 *
 * This script creates all Epics and User Stories in JIRA
 *
 * Usage:
 *   Set environment variables:
 *     JIRA_EMAIL=your-email@example.com
 *     JIRA_API_TOKEN=your-api-token
 *
 *   Run:
 *     node scripts/jira-import.js
 */

const https = require('https');

// Configuration
const JIRA_HOST = 'aigos.atlassian.net';
const PROJECT_KEY = 'AIG';
const API_TOKEN = process.env.JIRA_API_TOKEN;
const EMAIL = process.env.JIRA_EMAIL;

if (!API_TOKEN || !EMAIL) {
  console.error('Please set JIRA_EMAIL and JIRA_API_TOKEN environment variables');
  process.exit(1);
}

const AUTH = Buffer.from(`${EMAIL}:${API_TOKEN}`).toString('base64');

// Epic and Story definitions
const EPICS = [
  {
    id: 'AIGOS-E1',
    summary: 'Core Foundation Completion',
    description: `Complete the foundational schemas, types, and data structures that the runtime system builds upon.

**Priority:** P0 (Critical Path)
**Current Status:** 60% Complete
**Estimated Points:** 21
**Dependencies:** None
**Risk Level:** LOW`,
    priority: 'Highest',
    labels: ['foundation', 'core', 'P0'],
  },
  {
    id: 'AIGOS-E2',
    summary: 'Configuration & Policy System',
    description: `Implement .aigrc file format discovery, loading, validation, and policy management per SPEC-FMT-001 and SPEC-FMT-003.

**Priority:** P0 (Critical Path)
**Current Status:** 40% Complete
**Estimated Points:** 34
**Dependencies:** AIGOS-E1
**Risk Level:** LOW`,
    priority: 'Highest',
    labels: ['config', 'policy', 'P0'],
  },
  {
    id: 'AIGOS-E3',
    summary: 'Golden Thread Protocol',
    description: `Implement the Golden Thread protocol (SPEC-PRT-001) for cryptographic linking from runtime agents to business authorization.

**Priority:** P0 (Critical Path)
**Current Status:** 25% Complete (linking exists, hash missing)
**Estimated Points:** 21
**Dependencies:** AIGOS-E1
**Risk Level:** LOW`,
    priority: 'Highest',
    labels: ['golden-thread', 'protocol', 'crypto', 'P0'],
  },
  {
    id: 'AIGOS-E4',
    summary: 'Identity Manager',
    description: `Implement the Identity Manager (SPEC-RT-002) to establish cryptographic identity of AI agents at runtime.

**Priority:** P0 (Critical Path)
**Current Status:** Not Started
**Estimated Points:** 34
**Dependencies:** AIGOS-E1, AIGOS-E2, AIGOS-E3
**Risk Level:** LOW-MEDIUM`,
    priority: 'Highest',
    labels: ['identity', 'runtime', 'P0'],
  },
  {
    id: 'AIGOS-E5',
    summary: 'Policy Engine (The Bouncer)',
    description: `Implement the Policy Engine (SPEC-RT-003) for real-time permission evaluation with <2ms P99 latency.

**Priority:** P0 (Critical Path)
**Current Status:** Not Started
**Estimated Points:** 55
**Dependencies:** AIGOS-E1, AIGOS-E2, AIGOS-E4
**Risk Level:** MEDIUM`,
    priority: 'Highest',
    labels: ['policy-engine', 'runtime', 'performance', 'P0'],
  },
  {
    id: 'AIGOS-E6',
    summary: 'Telemetry Emitter',
    description: `Implement the Telemetry Emitter (SPEC-RT-004) for OpenTelemetry traces with semantic conventions (SPEC-PRT-002).

**Priority:** P1 (High Priority)
**Current Status:** Not Started
**Estimated Points:** 34
**Dependencies:** AIGOS-E4, AIGOS-E5
**Risk Level:** LOW`,
    priority: 'High',
    labels: ['telemetry', 'otel', 'observability', 'P1'],
  },
  {
    id: 'AIGOS-E7',
    summary: 'Kill Switch',
    description: `Implement the Kill Switch (SPEC-RT-005) for remote termination of agents within 60 seconds.

**Priority:** P1 (High Priority)
**Current Status:** Not Started
**Estimated Points:** 55
**Dependencies:** AIGOS-E4
**Risk Level:** MEDIUM-HIGH`,
    priority: 'High',
    labels: ['kill-switch', 'safety', 'runtime', 'P1'],
  },
  {
    id: 'AIGOS-E8',
    summary: 'Capability Decay',
    description: `Implement Capability Decay (SPEC-RT-006) to enforce that child capabilities are a subset of parent capabilities.

**Priority:** P1 (High Priority)
**Current Status:** Not Started
**Estimated Points:** 34
**Dependencies:** AIGOS-E4, AIGOS-E5
**Risk Level:** LOW-MEDIUM`,
    priority: 'High',
    labels: ['capability-decay', 'security', 'runtime', 'P1'],
  },
  {
    id: 'AIGOS-E9',
    summary: 'Governance Token (A2A)',
    description: `Implement the Governance Token Protocol (SPEC-PRT-003) for Agent-to-Agent mutual authentication.

**Priority:** P2 (Medium Priority)
**Current Status:** Not Started
**Estimated Points:** 55
**Dependencies:** AIGOS-E4, AIGOS-E5, AIGOS-E7, AIGOS-E8
**Risk Level:** MEDIUM`,
    priority: 'Medium',
    labels: ['a2a', 'token', 'authentication', 'P2'],
  },
  {
    id: 'AIGOS-E10',
    summary: 'CLI Enhancements',
    description: `Complete CLI implementation per SPEC-CLI-001, including missing commands and output formats.

**Priority:** P1 (High Priority)
**Current Status:** 75% Complete
**Estimated Points:** 21
**Dependencies:** AIGOS-E3
**Risk Level:** LOW`,
    priority: 'High',
    labels: ['cli', 'developer-experience', 'P1'],
  },
  {
    id: 'AIGOS-E11',
    summary: 'License Validation',
    description: `Implement JWT-based license key validation (SPEC-LIC-001) for paid tier feature gating.

**Priority:** P2 (Medium Priority)
**Current Status:** Not Started
**Estimated Points:** 21
**Dependencies:** AIGOS-E1
**Risk Level:** LOW`,
    priority: 'Medium',
    labels: ['license', 'jwt', 'P2'],
  },
  {
    id: 'AIGOS-E12',
    summary: 'Integration & Testing',
    description: `Ensure all components integrate properly with comprehensive testing and documentation.

**Priority:** P1 (High Priority)
**Current Status:** Partial
**Estimated Points:** 34
**Dependencies:** All previous epics
**Risk Level:** LOW`,
    priority: 'High',
    labels: ['testing', 'integration', 'documentation', 'P1'],
  },
];

const STORIES = [
  // Epic 1: Core Foundation
  {
    epicId: 'AIGOS-E1',
    summary: 'Add RuntimeIdentity Zod Schema',
    storyPoints: 3,
    description: `**As a** developer building runtime governance
**I want** a validated RuntimeIdentity schema
**So that** all identity data is type-safe and validated

**Acceptance Criteria:**
- [ ] Create RuntimeIdentitySchema in @aigrc/core/schemas
- [ ] Include all required fields: instance_id, asset_id, asset_name, asset_version
- [ ] Include golden_thread object with ticket_id, approved_by, approved_at
- [ ] Include lineage object with parent_instance_id, generation_depth, ancestor_chain
- [ ] Include capabilities_manifest reference
- [ ] Include operating mode enum: NORMAL, SANDBOX, RESTRICTED
- [ ] Add JSDoc documentation for all fields
- [ ] Export from @aigrc/core main entry point`,
    labels: ['schema', 'core', 'foundation'],
  },
  {
    epicId: 'AIGOS-E1',
    summary: 'Add CapabilitiesManifest Zod Schema',
    storyPoints: 3,
    description: `**As a** developer implementing capability controls
**I want** a validated CapabilitiesManifest schema
**So that** agent permissions are consistently structured

**Acceptance Criteria:**
- [ ] Create CapabilitiesManifestSchema in @aigrc/core/schemas
- [ ] Include allowed_tools and denied_tools arrays
- [ ] Include allowed_domains and denied_domains arrays (regex patterns)
- [ ] Include budget fields: max_cost_per_session, max_cost_per_day, max_tokens_per_call
- [ ] Include spawning fields: may_spawn_children, max_child_depth
- [ ] Include custom extensibility object
- [ ] Add validation for domain regex patterns
- [ ] Export from @aigrc/core main entry point`,
    labels: ['schema', 'core', 'foundation'],
  },
  {
    epicId: 'AIGOS-E1',
    summary: 'Add KillSwitchCommand Zod Schema',
    storyPoints: 2,
    description: `**As a** developer implementing kill switch
**I want** a validated KillSwitchCommand schema
**So that** termination commands are properly structured and validated

**Acceptance Criteria:**
- [ ] Create KillSwitchCommandSchema in @aigrc/core/schemas
- [ ] Include command type enum: TERMINATE, PAUSE, RESUME
- [ ] Include target fields: instance_id (optional), asset_id (optional), organization (optional)
- [ ] Include signature field for cryptographic verification
- [ ] Include timestamp for replay prevention
- [ ] Include unique command_id
- [ ] Include reason field for audit
- [ ] Export from @aigrc/core main entry point`,
    labels: ['schema', 'core', 'kill-switch'],
  },
  {
    epicId: 'AIGOS-E1',
    summary: 'Add GovernanceTokenPayload Zod Schema',
    storyPoints: 3,
    description: `**As a** developer implementing A2A authentication
**I want** a validated GovernanceTokenPayload schema
**So that** JWT token claims are type-safe

**Acceptance Criteria:**
- [ ] Create GovernanceTokenPayloadSchema in @aigrc/core/schemas
- [ ] Include standard JWT claims: iss, sub, aud, exp, iat, nbf, jti
- [ ] Include aigos.identity claims
- [ ] Include aigos.governance claims
- [ ] Include aigos.control claims
- [ ] Include aigos.capabilities claims
- [ ] Include aigos.lineage claims
- [ ] Export from @aigrc/core main entry point`,
    labels: ['schema', 'core', 'a2a'],
  },
  {
    epicId: 'AIGOS-E1',
    summary: 'Add Risk Level Utility Functions',
    storyPoints: 2,
    description: `**As a** developer working with risk levels
**I want** utility functions for risk level operations
**So that** I can compare and map risk levels consistently

**Acceptance Criteria:**
- [ ] Create compareRiskLevels(a, b) returning -1, 0, 1
- [ ] Create isRiskLevelAtLeast(level, threshold) boolean check
- [ ] Create getRiskLevelOrdinal(level) returning 0-3
- [ ] Create getMaxRiskLevel(levels[]) returning highest
- [ ] Create mapToEuAiActCategory(level) for regulatory mapping
- [ ] Add unit tests for all functions
- [ ] Export from @aigrc/core`,
    labels: ['utility', 'core', 'risk'],
  },
  {
    epicId: 'AIGOS-E1',
    summary: 'Add LineageSchema for Agent Hierarchy',
    storyPoints: 2,
    description: `**As a** developer tracking agent spawning
**I want** a Lineage schema
**So that** parent-child relationships are properly tracked

**Acceptance Criteria:**
- [ ] Create LineageSchema in @aigrc/core/schemas
- [ ] Include parent_instance_id (nullable for root)
- [ ] Include generation_depth (0 for root)
- [ ] Include ancestor_chain array of instance_ids
- [ ] Include spawned_at timestamp
- [ ] Include root_instance_id for tracing
- [ ] Export from @aigrc/core`,
    labels: ['schema', 'core', 'lineage'],
  },
  {
    epicId: 'AIGOS-E1',
    summary: 'Extend AssetCard Schema for Runtime Fields',
    storyPoints: 3,
    description: `**As a** developer using asset cards at runtime
**I want** runtime-specific fields in the Asset Card
**So that** governance configuration is complete

**Acceptance Criteria:**
- [ ] Add optional runtime section to AssetCardSchema
- [ ] Include policy_path reference
- [ ] Include verification_failure_mode: SANDBOX | FAIL
- [ ] Include telemetry_enabled boolean
- [ ] Include kill_switch configuration
- [ ] Maintain backward compatibility
- [ ] Update schema version to 1.1`,
    labels: ['schema', 'core', 'asset-card'],
  },
  {
    epicId: 'AIGOS-E1',
    summary: 'Add Schema Test Suite',
    storyPoints: 3,
    description: `**As a** developer maintaining schemas
**I want** comprehensive schema tests
**So that** schema changes don't break consumers

**Acceptance Criteria:**
- [ ] Add tests for all new schemas in @aigrc/core
- [ ] Test valid data parsing
- [ ] Test invalid data rejection with proper errors
- [ ] Test edge cases (optional fields, defaults)
- [ ] Add conformance tests for spec requirements
- [ ] Achieve 100% coverage of schema files`,
    labels: ['testing', 'core', 'schemas'],
  },

  // Epic 2: Configuration & Policy System
  {
    epicId: 'AIGOS-E2',
    summary: 'Implement Configuration Discovery Algorithm',
    storyPoints: 5,
    description: `**As a** developer using AIGRC in a project
**I want** automatic config file discovery
**So that** I don't have to specify config path manually

**Acceptance Criteria:**
- [ ] Search current directory for .aigrc.yaml
- [ ] Search parent directories up to filesystem root
- [ ] Search home directory (~/.aigrc.yaml) as fallback
- [ ] Merge configurations (child overrides parent)
- [ ] Cache discovered config for session
- [ ] Support AIGRC_CONFIG_PATH environment variable override
- [ ] Add unit tests for discovery algorithm
- [ ] Handle circular symlinks gracefully`,
    labels: ['config', 'core', 'discovery'],
  },
  {
    epicId: 'AIGOS-E2',
    summary: 'Implement PolicyFile Zod Schema',
    storyPoints: 5,
    description: `**As a** developer writing policies
**I want** a validated policy schema
**So that** policy files are correctly structured

**Acceptance Criteria:**
- [ ] Create PolicyFileSchema matching SPEC-FMT-003
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
- [ ] Add comprehensive validation tests`,
    labels: ['schema', 'policy', 'config'],
  },
  {
    epicId: 'AIGOS-E2',
    summary: 'Implement Policy Inheritance (extends)',
    storyPoints: 5,
    description: `**As a** developer organizing policies
**I want** policy inheritance via extends
**So that** I can create policy hierarchies

**Acceptance Criteria:**
- [ ] Parse extends field from policy file
- [ ] Load parent policy recursively
- [ ] Limit recursion depth to 5 (prevent cycles)
- [ ] Merge policies following spec rules:
  - denied_* arrays are unioned (not replaced)
  - Scalars from child override parent
  - Objects are deep merged
- [ ] Detect and error on circular extends
- [ ] Add unit tests for inheritance scenarios`,
    labels: ['policy', 'inheritance', 'config'],
  },
  {
    epicId: 'AIGOS-E2',
    summary: 'Implement Policy Selection Algorithm',
    storyPoints: 5,
    description: `**As a** runtime system
**I want** automatic policy selection
**So that** the correct policy applies to each agent

**Acceptance Criteria:**
- [ ] Implement selection order:
  1. Load default.yaml
  2. Load {NODE_ENV}.yaml if exists
  3. Load {risk_level}.yaml if exists
  4. Load asset-specific policy if configured
- [ ] Merge policies in selection order
- [ ] Support AIGRC_ENV environment variable
- [ ] Cache merged policy per asset_id
- [ ] Add integration tests for selection`,
    labels: ['policy', 'selection', 'config'],
  },
  {
    epicId: 'AIGOS-E2',
    summary: 'Implement Asset Card Loader',
    storyPoints: 3,
    description: `**As a** runtime system
**I want** to load asset cards from .aigrc/cards/
**So that** governance metadata is available at startup

**Acceptance Criteria:**
- [ ] Scan .aigrc/cards/*.yaml on startup
- [ ] Validate each card against schema
- [ ] Create in-memory index by asset_id
- [ ] Support lazy loading for large card sets
- [ ] Emit warnings for invalid cards (don't fail)
- [ ] Add file watcher for hot reload (optional)`,
    labels: ['asset-card', 'loader', 'config'],
  },
  {
    epicId: 'AIGOS-E2',
    summary: 'Implement Domain Pattern Compiler',
    storyPoints: 3,
    description: `**As a** policy engine
**I want** pre-compiled regex patterns for domains
**So that** domain matching is fast (<0.1ms)

**Acceptance Criteria:**
- [ ] Compile allowed_domains patterns on policy load
- [ ] Compile denied_domains patterns on policy load
- [ ] Cache compiled patterns per policy
- [ ] Support wildcard expansion (*, prefix_*)
- [ ] Handle invalid regex gracefully with errors
- [ ] Add performance tests (< 0.1ms per match)`,
    labels: ['policy', 'performance', 'regex'],
  },
  {
    epicId: 'AIGOS-E2',
    summary: 'Add .aigrc.yaml Runtime Section',
    storyPoints: 3,
    description: `**As a** developer configuring runtime governance
**I want** a runtime section in .aigrc.yaml
**So that** runtime settings are centralized

**Acceptance Criteria:**
- [ ] Add runtime section to .aigrc.yaml schema
- [ ] Include identity configuration (verification_failure_mode)
- [ ] Include policy configuration (default_policy, fail_open)
- [ ] Include telemetry configuration (enabled, endpoint)
- [ ] Include kill_switch configuration (enabled, channel, endpoint)
- [ ] Update config loader to parse runtime section
- [ ] Add validation for runtime settings`,
    labels: ['config', 'runtime', 'schema'],
  },
  {
    epicId: 'AIGOS-E2',
    summary: 'Add Integration Configuration Section',
    storyPoints: 3,
    description: `**As a** developer integrating with ticket systems
**I want** an integrations section in .aigrc.yaml
**So that** Jira/ADO/GitHub links are configured

**Acceptance Criteria:**
- [ ] Add integrations section to .aigrc.yaml schema
- [ ] Include Jira configuration (url, project_key)
- [ ] Include Azure DevOps configuration (organization, project)
- [ ] Include GitHub configuration (owner, repo)
- [ ] Update config loader to parse integrations
- [ ] Add validation for URLs and required fields`,
    labels: ['config', 'integrations'],
  },
  {
    epicId: 'AIGOS-E2',
    summary: 'Add Environment Variable Overrides',
    storyPoints: 2,
    description: `**As a** developer deploying to different environments
**I want** environment variable overrides
**So that** I can configure without changing files

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
- [ ] Add to documentation`,
    labels: ['config', 'environment'],
  },

  // Epic 3: Golden Thread Protocol
  {
    epicId: 'AIGOS-E3',
    summary: 'Implement Canonical String Computation',
    storyPoints: 3,
    description: `**As a** governance system
**I want** canonical string computation for Golden Thread
**So that** hashes are deterministic and verifiable

**Acceptance Criteria:**
- [ ] Implement canonical string format: approved_at={ISO8601}|approved_by={email}|ticket_id={id}
- [ ] Fields sorted alphabetically (approved_at, approved_by, ticket_id)
- [ ] Use pipe (|) as delimiter
- [ ] Use equals (=) for key-value pairs
- [ ] Normalize timestamp to UTC ISO 8601
- [ ] Add unit tests with spec test vectors

**Test Vector:**
Input: ticket_id=FIN-1234, approved_by=ciso@corp.com, approved_at=2025-01-15T10:30:00Z
Output: "approved_at=2025-01-15T10:30:00Z|approved_by=ciso@corp.com|ticket_id=FIN-1234"`,
    labels: ['golden-thread', 'protocol', 'core'],
  },
  {
    epicId: 'AIGOS-E3',
    summary: 'Implement SHA-256 Hash Generation',
    storyPoints: 3,
    description: `**As a** governance system
**I want** SHA-256 hash generation for Golden Thread
**So that** authorization links are cryptographically secure

**Acceptance Criteria:**
- [ ] Use crypto.subtle (WebCrypto API) for hash
- [ ] Output format: sha256:{hex}
- [ ] 64 lowercase hex characters after prefix
- [ ] Pass spec test vector:
  - Input: FIN-1234 | ciso@corp.com | 2025-01-15T10:30:00Z
  - Output: sha256:7d865e959b2466918c9863afca942d0fb89d7c9ac0c99bafc3749504ded97730
- [ ] Export computeGoldenThreadHash() function
- [ ] Add comprehensive unit tests`,
    labels: ['golden-thread', 'crypto', 'core'],
  },
  {
    epicId: 'AIGOS-E3',
    summary: 'Implement Hash Verification',
    storyPoints: 2,
    description: `**As a** runtime identity manager
**I want** to verify Golden Thread hashes
**So that** I can detect tampering

**Acceptance Criteria:**
- [ ] Implement verifyGoldenThreadHash(card, hash) function
- [ ] Recompute hash from asset card components
- [ ] Use constant-time comparison for security
- [ ] Return { verified: boolean, computed: string, expected: string }
- [ ] Log verification failures
- [ ] Add unit tests for valid and invalid cases`,
    labels: ['golden-thread', 'verification', 'security'],
  },
  {
    epicId: 'AIGOS-E3',
    summary: 'Implement Signature Verification (Optional)',
    storyPoints: 5,
    description: `**As a** enterprise user
**I want** cryptographic signature verification
**So that** approvals are non-repudiable

**Acceptance Criteria:**
- [ ] Support RSA-SHA256 signatures
- [ ] Support ECDSA P-256 signatures
- [ ] Parse signature format: {ALGORITHM}:{BASE64_SIGNATURE}
- [ ] Load public keys from .aigrc/keys/ directory
- [ ] Verify signature over canonical string
- [ ] Return verification result with details
- [ ] Gracefully handle missing signatures (optional feature)`,
    labels: ['golden-thread', 'crypto', 'enterprise'],
  },
  {
    epicId: 'AIGOS-E3',
    summary: 'Add Golden Thread Component Extraction',
    storyPoints: 2,
    description: `**As a** identity manager
**I want** to extract Golden Thread components from Asset Cards
**So that** I can compute hashes at runtime

**Acceptance Criteria:**
- [ ] Extract ticket_id from asset card
- [ ] Extract approved_by from asset card (or owner.email)
- [ ] Extract approved_at from asset card
- [ ] Validate all required components present
- [ ] Return structured GoldenThreadComponents object
- [ ] Handle missing components with clear error`,
    labels: ['golden-thread', 'asset-card'],
  },
  {
    epicId: 'AIGOS-E3',
    summary: 'Add Golden Thread Schema to Asset Card',
    storyPoints: 2,
    description: `**As a** asset card author
**I want** a golden_thread section in asset cards
**So that** authorization metadata is captured

**Acceptance Criteria:**
- [ ] Add optional golden_thread section to AssetCardSchema
- [ ] Include ticket_id, approved_by, approved_at fields
- [ ] Include hash field
- [ ] Include signature field (optional)
- [ ] Validate ticket_id format
- [ ] Validate email format for approved_by
- [ ] Validate ISO8601 for approved_at
- [ ] Validate hash format if present`,
    labels: ['golden-thread', 'schema', 'asset-card'],
  },
  {
    epicId: 'AIGOS-E3',
    summary: 'Add CLI Hash Command',
    storyPoints: 3,
    description: `**As a** developer
**I want** an aigrc hash command
**So that** I can compute Golden Thread hashes

**Acceptance Criteria:**
- [ ] Add aigrc hash <card-path> command
- [ ] Compute hash from asset card
- [ ] Output format: sha256:7d865e...
- [ ] Support --json output
- [ ] Support --verify flag to verify existing hash
- [ ] Return exit code 0 if valid, 3 if mismatch
- [ ] Add help text and examples`,
    labels: ['cli', 'golden-thread'],
  },
  {
    epicId: 'AIGOS-E3',
    summary: 'Add Golden Thread Conformance Tests',
    storyPoints: 1,
    description: `**As a** spec implementer
**I want** conformance tests for Golden Thread
**So that** the implementation matches the spec exactly

**Acceptance Criteria:**
- [ ] Test all spec test vectors
- [ ] Test edge cases (special characters, timezones)
- [ ] Test hash format validation
- [ ] Test signature verification (if implemented)
- [ ] Document conformance level achieved`,
    labels: ['testing', 'golden-thread', 'conformance'],
  },

  // Epic 4: Identity Manager
  {
    epicId: 'AIGOS-E4',
    summary: 'Create @aigos/runtime Package Structure',
    storyPoints: 3,
    description: `**As a** developer building runtime governance
**I want** a dedicated runtime package
**So that** runtime components are organized

**Acceptance Criteria:**
- [ ] Create packages/runtime directory
- [ ] Add package.json with @aigos/runtime name
- [ ] Add tsconfig.json extending root
- [ ] Add tsup.config.ts for bundling
- [ ] Create src/ directory structure (identity/, policy/, telemetry/, kill-switch/, capability-decay/, a2a/)
- [ ] Add to pnpm-workspace.yaml
- [ ] Add to turbo.json pipeline`,
    labels: ['infrastructure', 'runtime', 'setup'],
  },
  {
    epicId: 'AIGOS-E4',
    summary: 'Implement RuntimeIdentity Creation',
    storyPoints: 5,
    description: `**As a** AI agent starting up
**I want** a RuntimeIdentity created
**So that** I have cryptographic identity

**Acceptance Criteria:**
- [ ] Generate UUIDv4 instance_id using crypto.randomUUID()
- [ ] Load Asset Card from configPath
- [ ] Extract asset_id, asset_name, asset_version from card
- [ ] Set created_at to current ISO8601 timestamp
- [ ] Initialize mode to NORMAL
- [ ] Initialize verified to false (until verified)
- [ ] Return frozen RuntimeIdentity object
- [ ] Log identity creation event`,
    labels: ['identity', 'runtime', 'core'],
  },
  {
    epicId: 'AIGOS-E4',
    summary: 'Implement Golden Thread Verification',
    storyPoints: 5,
    description: `**As a** runtime identity manager
**I want** to verify Golden Thread on startup
**So that** unverified agents are sandboxed

**Acceptance Criteria:**
- [ ] Compute hash from Asset Card components
- [ ] Compare with stored hash (if present)
- [ ] Set identity.verified = true if match
- [ ] Set identity.mode based on verification_failure_mode:
  - SANDBOX: mode = SANDBOX, continue
  - FAIL: throw error, prevent startup
- [ ] Log verification result
- [ ] Return verification details`,
    labels: ['identity', 'golden-thread', 'verification'],
  },
  {
    epicId: 'AIGOS-E4',
    summary: 'Implement Lineage Tracking',
    storyPoints: 5,
    description: `**As a** child agent
**I want** lineage tracking
**So that** my ancestry is known

**Acceptance Criteria:**
- [ ] For root agents: generation_depth = 0, parent_instance_id = null, ancestor_chain = [], root_instance_id = instance_id
- [ ] For child agents: generation_depth = parent.generation_depth + 1, parent_instance_id = parent.instance_id, ancestor_chain = [...parent.ancestor_chain, parent.instance_id], root_instance_id = parent.root_instance_id
- [ ] Validate generation_depth < max_child_depth
- [ ] Reject if depth exceeded`,
    labels: ['identity', 'lineage', 'spawning'],
  },
  {
    epicId: 'AIGOS-E4',
    summary: 'Implement Capabilities Loading',
    storyPoints: 5,
    description: `**As a** runtime identity manager
**I want** to load capabilities from policy
**So that** agent permissions are known

**Acceptance Criteria:**
- [ ] Load policy file using policy selection algorithm
- [ ] Extract capabilities section
- [ ] Merge with Asset Card constraints (if any)
- [ ] For child agents: apply Capability Decay
- [ ] Create CapabilitiesManifest object
- [ ] Attach to RuntimeIdentity
- [ ] Cache for performance`,
    labels: ['identity', 'capabilities', 'policy'],
  },
  {
    epicId: 'AIGOS-E4',
    summary: 'Implement Operating Mode Management',
    storyPoints: 3,
    description: `**As a** runtime system
**I want** operating mode transitions
**So that** agent behavior reflects governance state

**Acceptance Criteria:**
- [ ] Implement mode enum: NORMAL, SANDBOX, RESTRICTED
- [ ] NORMAL: Full capabilities
- [ ] SANDBOX: Limited capabilities, log-only denials
- [ ] RESTRICTED: Minimal capabilities, strict enforcement
- [ ] Support mode transitions via API
- [ ] Emit telemetry on mode changes
- [ ] Prevent invalid transitions (e.g., RESTRICTED → NORMAL without auth)`,
    labels: ['identity', 'mode', 'runtime'],
  },
  {
    epicId: 'AIGOS-E4',
    summary: 'Add @guard Decorator API',
    storyPoints: 5,
    description: `**As a** developer protecting functions
**I want** a @guard decorator
**So that** governance checks are easy to add

**Acceptance Criteria:**
- [ ] Create @guard(action: string) TypeScript decorator
- [ ] Intercept function calls
- [ ] Call policy engine with action and context
- [ ] If denied: throw GovernanceError
- [ ] If allowed: proceed with original function
- [ ] Support async functions
- [ ] Pass function arguments as context`,
    labels: ['identity', 'decorator', 'api'],
  },
  {
    epicId: 'AIGOS-E4',
    summary: 'Add Identity Manager Tests',
    storyPoints: 3,
    description: `**As a** developer maintaining identity manager
**I want** comprehensive tests
**So that** identity creation is reliable

**Acceptance Criteria:**
- [ ] Test identity creation for root agents
- [ ] Test identity creation for child agents
- [ ] Test Golden Thread verification pass/fail
- [ ] Test verification_failure_mode handling
- [ ] Test lineage tracking
- [ ] Test capabilities loading
- [ ] Test mode transitions
- [ ] Achieve 90%+ coverage`,
    labels: ['testing', 'identity'],
  },

  // Epic 5: Policy Engine
  {
    epicId: 'AIGOS-E5',
    summary: 'Implement Core Policy Check Function',
    storyPoints: 5,
    description: `**As a** runtime governance system
**I want** a central permission check function
**So that** all actions are validated

**Acceptance Criteria:**
- [ ] Create checkPermission(identity, action, resource?, context?) function
- [ ] Return PolicyDecision: { allowed: boolean, reason?: string, code?: string }
- [ ] Support action strings (e.g., 'call_api', 'read_file')
- [ ] Support optional resource for domain checks
- [ ] Support optional context for custom checks
- [ ] Log all decisions`,
    labels: ['policy-engine', 'core', 'permission'],
  },
  {
    epicId: 'AIGOS-E5',
    summary: 'Implement Evaluation Chain (Short-Circuit)',
    storyPoints: 8,
    description: `**As a** policy engine
**I want** short-circuit evaluation
**So that** denials return immediately

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
- [ ] Support skip flags for testing`,
    labels: ['policy-engine', 'evaluation', 'performance'],
  },
  {
    epicId: 'AIGOS-E5',
    summary: 'Implement Kill Switch Check',
    storyPoints: 3,
    description: `**As a** policy engine
**I want** kill switch as first check
**So that** terminated agents are blocked immediately

**Acceptance Criteria:**
- [ ] Check global kill switch state
- [ ] Check instance-specific termination
- [ ] Check asset-specific termination
- [ ] Return DENY with code 'TERMINATED' if killed
- [ ] Return DENY with code 'PAUSED' if paused
- [ ] O(1) time complexity (hash lookup)`,
    labels: ['policy-engine', 'kill-switch'],
  },
  {
    epicId: 'AIGOS-E5',
    summary: 'Implement Capability Check',
    storyPoints: 5,
    description: `**As a** policy engine
**I want** capability validation
**So that** actions are limited to allowed tools

**Acceptance Criteria:**
- [ ] Check action against allowed_tools array
- [ ] Check action against denied_tools array
- [ ] denied_tools takes precedence over allowed_tools
- [ ] Support wildcard matching (*, prefix_*)
- [ ] Return DENY with code 'CAPABILITY_DENIED'
- [ ] Log denied capabilities`,
    labels: ['policy-engine', 'capabilities'],
  },
  {
    epicId: 'AIGOS-E5',
    summary: 'Implement Resource Domain Checks',
    storyPoints: 5,
    description: `**As a** policy engine
**I want** domain pattern matching
**So that** external resources are controlled

**Acceptance Criteria:**
- [ ] Match resource against allowed_domains patterns
- [ ] Match resource against denied_domains patterns
- [ ] Deny-overrides-allow precedence
- [ ] Use pre-compiled regex for performance
- [ ] Return DENY with code 'RESOURCE_DENIED'
- [ ] Support URL parsing for domain extraction`,
    labels: ['policy-engine', 'domains', 'regex'],
  },
  {
    epicId: 'AIGOS-E5',
    summary: 'Implement Budget Check',
    storyPoints: 8,
    description: `**As a** policy engine
**I want** budget validation
**So that** cost limits are enforced

**Acceptance Criteria:**
- [ ] Track session_cost accumulator
- [ ] Track daily_cost accumulator (with daily reset)
- [ ] Track monthly_cost accumulator (with monthly reset)
- [ ] Check against max_cost_per_session
- [ ] Check against max_cost_per_day
- [ ] Check against max_cost_per_month
- [ ] Support rate limiting (calls per minute)
- [ ] Thread-safe updates (atomic operations)
- [ ] Return DENY with code 'BUDGET_EXCEEDED'`,
    labels: ['policy-engine', 'budget', 'cost'],
  },
  {
    epicId: 'AIGOS-E5',
    summary: 'Implement Custom Checks',
    storyPoints: 5,
    description: `**As a** policy engine
**I want** extensible custom checks
**So that** policies can have custom rules

**Acceptance Criteria:**
- [ ] Support registering custom check functions
- [ ] Pass action, resource, context to custom checks
- [ ] Aggregate results from all custom checks
- [ ] Return first DENY from custom checks
- [ ] Document custom check API`,
    labels: ['policy-engine', 'extensibility'],
  },
  {
    epicId: 'AIGOS-E5',
    summary: 'Implement Dry-Run Mode',
    storyPoints: 3,
    description: `**As a** developer rolling out policies
**I want** dry-run mode
**So that** I can test policies without enforcement

**Acceptance Criteria:**
- [ ] Check policy mode: dry_run setting
- [ ] If dry_run: always return allowed = true
- [ ] But record what would have been denied
- [ ] Mark telemetry as dry_run: true
- [ ] Return would_deny: true in decision
- [ ] Log would-be denials clearly`,
    labels: ['policy-engine', 'dry-run', 'testing'],
  },
  {
    epicId: 'AIGOS-E5',
    summary: 'Implement Policy Engine Caching',
    storyPoints: 5,
    description: `**As a** policy engine
**I want** caching for performance
**So that** repeated checks are fast

**Acceptance Criteria:**
- [ ] Cache compiled regex patterns
- [ ] Cache policy lookups by asset_id
- [ ] Cache capability sets as Set<string>
- [ ] Invalidate cache on policy reload
- [ ] Memory limit for cache (< 25MB total)
- [ ] LRU eviction for cache`,
    labels: ['policy-engine', 'performance', 'caching'],
  },
  {
    epicId: 'AIGOS-E5',
    summary: 'Add Policy Engine Performance Tests',
    storyPoints: 3,
    description: `**As a** developer ensuring performance
**I want** latency benchmarks
**So that** <2ms P99 is maintained

**Acceptance Criteria:**
- [ ] Benchmark single permission check
- [ ] Target: < 2ms P99
- [ ] Benchmark pattern matching
- [ ] Target: < 0.1ms per pattern
- [ ] Benchmark with 100+ policies
- [ ] Run benchmarks in CI
- [ ] Alert on regression`,
    labels: ['policy-engine', 'performance', 'testing'],
  },
  {
    epicId: 'AIGOS-E5',
    summary: 'Add Policy Engine Unit Tests',
    storyPoints: 5,
    description: `**As a** developer maintaining policy engine
**I want** comprehensive tests
**So that** evaluation is reliable

**Acceptance Criteria:**
- [ ] Test each check type independently
- [ ] Test short-circuit behavior
- [ ] Test deny-overrides-allow
- [ ] Test budget tracking
- [ ] Test dry-run mode
- [ ] Test edge cases
- [ ] Achieve 95%+ coverage`,
    labels: ['policy-engine', 'testing'],
  },

  // Epic 6: Telemetry Emitter
  {
    epicId: 'AIGOS-E6',
    summary: 'Integrate OpenTelemetry SDK',
    storyPoints: 5,
    description: `**As a** telemetry emitter
**I want** OTel SDK integration
**So that** traces are standards-compliant

**Acceptance Criteria:**
- [ ] Add @opentelemetry/sdk-trace-node dependency
- [ ] Add @opentelemetry/exporter-trace-otlp-http dependency
- [ ] Initialize TracerProvider on startup
- [ ] Configure BatchSpanProcessor
- [ ] Configure OTLP exporter (HTTP or gRPC)
- [ ] Set resource attributes (service.name, aigos.sdk.version)
- [ ] Support graceful shutdown`,
    labels: ['telemetry', 'otel', 'setup'],
  },
  {
    epicId: 'AIGOS-E6',
    summary: 'Implement Semantic Convention Constants',
    storyPoints: 3,
    description: `**As a** telemetry emitter
**I want** constant definitions for semantic conventions
**So that** attribute names are consistent

**Acceptance Criteria:**
- [ ] Create constants for all aigos.* attributes
- [ ] Namespace: AIGOS_ATTR.* or similar
- [ ] Include all attributes from SPEC-PRT-002
- [ ] Document each attribute`,
    labels: ['telemetry', 'semantic-conventions'],
  },
  {
    epicId: 'AIGOS-E6',
    summary: 'Implement emitIdentity()',
    storyPoints: 3,
    description: `**As a** AI agent starting up
**I want** identity trace emitted
**So that** startup is observable

**Acceptance Criteria:**
- [ ] Emit span: aigos.governance.identity
- [ ] Include all identity attributes
- [ ] Include risk level
- [ ] Include verification status
- [ ] Include mode
- [ ] 100% sampling for identity spans
- [ ] Non-blocking (< 0.1ms)`,
    labels: ['telemetry', 'identity'],
  },
  {
    epicId: 'AIGOS-E6',
    summary: 'Implement emitDecision()',
    storyPoints: 3,
    description: `**As a** policy engine
**I want** decision traces emitted
**So that** permission checks are observable

**Acceptance Criteria:**
- [ ] Emit span: aigos.governance.decision
- [ ] Include action, resource
- [ ] Include decision result (ALLOWED/DENIED/WOULD_DENY)
- [ ] Include reason if denied
- [ ] Include duration_ms
- [ ] 10-100% sampling (configurable)
- [ ] Non-blocking (< 0.1ms)`,
    labels: ['telemetry', 'decision'],
  },
  {
    epicId: 'AIGOS-E6',
    summary: 'Implement emitViolation()',
    storyPoints: 3,
    description: `**As a** policy engine
**I want** violation traces emitted
**So that** denials are highly visible

**Acceptance Criteria:**
- [ ] Emit span: aigos.governance.violation
- [ ] Include violation code
- [ ] Include severity (warning/error/critical)
- [ ] Include action and resource
- [ ] Include full context
- [ ] 100% sampling (all violations)
- [ ] Non-blocking (< 0.1ms)`,
    labels: ['telemetry', 'violation'],
  },
  {
    epicId: 'AIGOS-E6',
    summary: 'Implement emitBudget()',
    storyPoints: 3,
    description: `**As a** budget tracker
**I want** budget traces emitted
**So that** cost is observable

**Acceptance Criteria:**
- [ ] Emit span: aigos.governance.budget
- [ ] Include cost_incurred
- [ ] Include session_total
- [ ] Include daily_total
- [ ] Include budget_remaining
- [ ] 10-100% sampling (configurable)
- [ ] Non-blocking (< 0.1ms)`,
    labels: ['telemetry', 'budget'],
  },
  {
    epicId: 'AIGOS-E6',
    summary: 'Implement emitTerminate()',
    storyPoints: 3,
    description: `**As a** agent shutting down
**I want** termination trace emitted
**So that** shutdown is observable

**Acceptance Criteria:**
- [ ] Emit span: aigos.governance.terminate
- [ ] Include termination source (kill_switch, budget_exceeded, policy_violation, graceful)
- [ ] Include final budget totals
- [ ] Include session duration
- [ ] 100% sampling
- [ ] Blocking allowed (flush before exit)`,
    labels: ['telemetry', 'terminate'],
  },
  {
    epicId: 'AIGOS-E6',
    summary: 'Implement emitSpawn()',
    storyPoints: 3,
    description: `**As a** parent agent
**I want** spawn traces emitted
**So that** child creation is observable

**Acceptance Criteria:**
- [ ] Emit span: aigos.governance.spawn
- [ ] Include parent_instance_id
- [ ] Include child_instance_id
- [ ] Include generation_depth
- [ ] Include capability_mode (decay/explicit/inherit)
- [ ] 100% sampling
- [ ] Non-blocking (< 0.1ms)`,
    labels: ['telemetry', 'spawn'],
  },
  {
    epicId: 'AIGOS-E6',
    summary: 'Implement No-Op Telemetry',
    storyPoints: 2,
    description: `**As a** developer with telemetry disabled
**I want** zero overhead
**So that** performance is not impacted

**Acceptance Criteria:**
- [ ] Check telemetry_enabled flag
- [ ] If disabled: return immediately from all emit* methods
- [ ] Zero allocations when disabled
- [ ] Zero network calls when disabled
- [ ] Document how to disable`,
    labels: ['telemetry', 'performance'],
  },
  {
    epicId: 'AIGOS-E6',
    summary: 'Implement Metrics (Counters, Gauges)',
    storyPoints: 5,
    description: `**As a** operations team
**I want** metrics for monitoring
**So that** I can alert on anomalies

**Acceptance Criteria:**
- [ ] Counter: aigos.decisions.total (by result)
- [ ] Counter: aigos.violations.total (by code)
- [ ] Counter: aigos.spawns.total
- [ ] Counter: aigos.terminations.total (by source)
- [ ] Gauge: aigos.budget.session_used
- [ ] Gauge: aigos.budget.daily_used
- [ ] Gauge: aigos.agents.active
- [ ] Histogram: aigos.decision.duration`,
    labels: ['telemetry', 'metrics'],
  },
  {
    epicId: 'AIGOS-E6',
    summary: 'Add Telemetry Tests',
    storyPoints: 3,
    description: `**As a** developer maintaining telemetry
**I want** comprehensive tests
**So that** spans are correct

**Acceptance Criteria:**
- [ ] Test each emit* method
- [ ] Verify attribute presence
- [ ] Verify attribute values
- [ ] Test no-op mode
- [ ] Test sampling rates
- [ ] Mock OTel SDK for unit tests`,
    labels: ['telemetry', 'testing'],
  },

  // Epic 7: Kill Switch
  {
    epicId: 'AIGOS-E7',
    summary: 'Implement SSE Listener (Primary)',
    storyPoints: 8,
    description: `**As a** kill switch
**I want** SSE listener
**So that** termination commands are received in real-time

**Acceptance Criteria:**
- [ ] Connect to SSE endpoint on startup
- [ ] Parse AIGOS kill switch event format
- [ ] Handle connection drops with reconnect
- [ ] Exponential backoff for reconnects
- [ ] Log all received commands
- [ ] Support custom endpoint configuration
- [ ] Handle malformed events gracefully`,
    labels: ['kill-switch', 'sse', 'transport'],
  },
  {
    epicId: 'AIGOS-E7',
    summary: 'Implement Polling Listener (Fallback)',
    storyPoints: 5,
    description: `**As a** kill switch
**I want** polling fallback
**So that** termination works without SSE

**Acceptance Criteria:**
- [ ] Poll endpoint every 30 seconds
- [ ] Parse JSON command response
- [ ] Track last command ID to avoid duplicates
- [ ] Switch from SSE if SSE fails repeatedly
- [ ] Support custom poll interval configuration
- [ ] Low resource usage`,
    labels: ['kill-switch', 'polling', 'transport'],
  },
  {
    epicId: 'AIGOS-E7',
    summary: 'Implement Local File Listener (Air-Gapped)',
    storyPoints: 3,
    description: `**As a** air-gapped deployment
**I want** local file listener
**So that** termination works offline

**Acceptance Criteria:**
- [ ] Watch configured file path for changes
- [ ] Parse JSON command from file
- [ ] Support append-only command log
- [ ] Clear processed commands
- [ ] Use file polling (no fsnotify requirement)`,
    labels: ['kill-switch', 'file', 'transport'],
  },
  {
    epicId: 'AIGOS-E7',
    summary: 'Implement TERMINATE Command Handler',
    storyPoints: 5,
    description: `**As a** kill switch
**I want** TERMINATE command handling
**So that** agents can be fully stopped

**Acceptance Criteria:**
- [ ] Parse TERMINATE command
- [ ] Verify signature before processing
- [ ] Set identity mode to TERMINATED
- [ ] Emit aigos.governance.terminate span
- [ ] Flush telemetry buffer
- [ ] Close all connections
- [ ] Call registered shutdown hooks
- [ ] Exit process with code 0`,
    labels: ['kill-switch', 'terminate'],
  },
  {
    epicId: 'AIGOS-E7',
    summary: 'Implement PAUSE Command Handler',
    storyPoints: 3,
    description: `**As a** kill switch
**I want** PAUSE command handling
**So that** agents can be suspended

**Acceptance Criteria:**
- [ ] Parse PAUSE command
- [ ] Verify signature before processing
- [ ] Set identity mode to PAUSED
- [ ] Policy engine returns DENY for all actions
- [ ] Keep connections alive
- [ ] Wait for RESUME
- [ ] Emit pause telemetry`,
    labels: ['kill-switch', 'pause'],
  },
  {
    epicId: 'AIGOS-E7',
    summary: 'Implement RESUME Command Handler',
    storyPoints: 3,
    description: `**As a** kill switch
**I want** RESUME command handling
**So that** paused agents can continue

**Acceptance Criteria:**
- [ ] Parse RESUME command
- [ ] Verify signature before processing
- [ ] Set identity mode back to NORMAL
- [ ] Policy engine resumes normal evaluation
- [ ] Emit resume telemetry
- [ ] Only valid after PAUSE`,
    labels: ['kill-switch', 'resume'],
  },
  {
    epicId: 'AIGOS-E7',
    summary: 'Implement Signature Verification',
    storyPoints: 8,
    description: `**As a** kill switch
**I want** command signature verification
**So that** only authorized commands execute

**Acceptance Criteria:**
- [ ] Load organization public key
- [ ] Verify RSA-SHA256 or ECDSA P-256 signature
- [ ] Signature covers: command_id, type, target, timestamp
- [ ] Reject invalid signatures with error log
- [ ] Reject unsigned commands
- [ ] Support key rotation via JWKS`,
    labels: ['kill-switch', 'security', 'crypto'],
  },
  {
    epicId: 'AIGOS-E7',
    summary: 'Implement Replay Prevention',
    storyPoints: 5,
    description: `**As a** kill switch
**I want** replay prevention
**So that** old commands can't be replayed

**Acceptance Criteria:**
- [ ] Validate command_id uniqueness
- [ ] Store seen command_ids (with TTL)
- [ ] Validate timestamp within 5 minutes
- [ ] Reject replayed commands
- [ ] Log replay attempts as violations`,
    labels: ['kill-switch', 'security'],
  },
  {
    epicId: 'AIGOS-E7',
    summary: 'Implement Cascading Termination',
    storyPoints: 8,
    description: `**As a** parent agent
**I want** child termination on my termination
**So that** all descendants stop

**Acceptance Criteria:**
- [ ] Track spawned child instance_ids
- [ ] On parent TERMINATE: send TERMINATE to all children
- [ ] Wait for children to terminate (with timeout)
- [ ] Log cascade progress
- [ ] Handle unreachable children
- [ ] Emit cascade telemetry`,
    labels: ['kill-switch', 'cascade', 'lineage'],
  },
  {
    epicId: 'AIGOS-E7',
    summary: 'Verify <60s SLA',
    storyPoints: 5,
    description: `**As a** operations team
**I want** <60s termination SLA
**So that** rogue agents are stopped quickly

**Acceptance Criteria:**
- [ ] Measure time from command issue to process exit
- [ ] Target: < 36 seconds (P95)
- [ ] Maximum: 60 seconds (P99)
- [ ] Include network latency, processing, shutdown
- [ ] Document SLA in configuration
- [ ] Add SLA monitoring metrics`,
    labels: ['kill-switch', 'sla', 'performance'],
  },
  {
    epicId: 'AIGOS-E7',
    summary: 'Add Kill Switch Tests',
    storyPoints: 5,
    description: `**As a** developer maintaining kill switch
**I want** comprehensive tests
**So that** termination is reliable

**Acceptance Criteria:**
- [ ] Test each command type
- [ ] Test signature verification
- [ ] Test replay prevention
- [ ] Test cascade termination
- [ ] Test transport fallback
- [ ] Test connection recovery
- [ ] Integration tests with mock server`,
    labels: ['kill-switch', 'testing'],
  },

  // Epic 8: Capability Decay
  {
    epicId: 'AIGOS-E8',
    summary: 'Implement Decay Mode (Default)',
    storyPoints: 8,
    description: `**As a** parent agent
**I want** automatic capability decay
**So that** children have reduced permissions

**Acceptance Criteria:**
- [ ] Apply decay factor to budgets (e.g., 0.5x parent budget)
- [ ] Reduce max_child_depth by 1
- [ ] Keep allowed_tools as subset
- [ ] Keep allowed_domains as subset
- [ ] Add parent's denied_tools to child
- [ ] Add parent's denied_domains to child
- [ ] Support configurable decay factors`,
    labels: ['capability-decay', 'decay-mode'],
  },
  {
    epicId: 'AIGOS-E8',
    summary: 'Implement Explicit Mode',
    storyPoints: 5,
    description: `**As a** parent agent
**I want** explicit capability grants
**So that** children only get specified permissions

**Acceptance Criteria:**
- [ ] Require explicit capability specification
- [ ] Validate each capability against parent
- [ ] Reject if any capability exceeds parent
- [ ] No automatic inheritance
- [ ] Clear error messages for violations`,
    labels: ['capability-decay', 'explicit-mode'],
  },
  {
    epicId: 'AIGOS-E8',
    summary: 'Implement Inherit Mode',
    storyPoints: 3,
    description: `**As a** parent agent
**I want** capability inheritance
**So that** children match parent (with warning)

**Acceptance Criteria:**
- [ ] Copy parent capabilities exactly
- [ ] Emit warning (not recommended)
- [ ] Log inherit mode usage
- [ ] Still increment generation_depth
- [ ] Still enforce max_child_depth`,
    labels: ['capability-decay', 'inherit-mode'],
  },
  {
    epicId: 'AIGOS-E8',
    summary: 'Implement Tool Subset Validation',
    storyPoints: 5,
    description: `**As a** capability decay system
**I want** tool subset validation
**So that** children can't exceed parent tools

**Acceptance Criteria:**
- [ ] child_tools ⊆ parent_tools
- [ ] Handle wildcard expansion
- [ ] Handle tool prefixes
- [ ] Return detailed error on violation
- [ ] O(n) time complexity`,
    labels: ['capability-decay', 'validation'],
  },
  {
    epicId: 'AIGOS-E8',
    summary: 'Implement Domain Subset Validation',
    storyPoints: 5,
    description: `**As a** capability decay system
**I want** domain subset validation
**So that** children can't access more domains

**Acceptance Criteria:**
- [ ] child_domains covered by parent_domains
- [ ] Pattern subset checking for regex
- [ ] child_denied_domains ⊇ parent_denied_domains
- [ ] Return detailed error on violation
- [ ] Handle complex regex patterns`,
    labels: ['capability-decay', 'validation', 'regex'],
  },
  {
    epicId: 'AIGOS-E8',
    summary: 'Implement Budget Limit Validation',
    storyPoints: 3,
    description: `**As a** capability decay system
**I want** budget limit validation
**So that** children can't exceed parent budget

**Acceptance Criteria:**
- [ ] child_budget ≤ parent_budget
- [ ] Per-session, per-day, per-month
- [ ] Handle null (unlimited) cases
- [ ] Return detailed error on violation`,
    labels: ['capability-decay', 'validation', 'budget'],
  },
  {
    epicId: 'AIGOS-E8',
    summary: 'Implement Depth Limit Validation',
    storyPoints: 2,
    description: `**As a** capability decay system
**I want** depth limit validation
**So that** spawning chains are limited

**Acceptance Criteria:**
- [ ] child_depth < parent's max_child_depth
- [ ] Return error if depth exceeded
- [ ] Log depth violations
- [ ] Suggest increasing limit if needed`,
    labels: ['capability-decay', 'validation', 'depth'],
  },
  {
    epicId: 'AIGOS-E8',
    summary: 'Add Capability Decay Tests',
    storyPoints: 5,
    description: `**As a** developer maintaining capability decay
**I want** comprehensive tests
**So that** privilege escalation is prevented

**Acceptance Criteria:**
- [ ] Test each decay mode
- [ ] Test tool subset validation
- [ ] Test domain subset validation
- [ ] Test budget validation
- [ ] Test depth validation
- [ ] Test edge cases
- [ ] Test violation scenarios
- [ ] Achieve 95%+ coverage`,
    labels: ['capability-decay', 'testing'],
  },

  // Epic 9: Governance Token (A2A)
  {
    epicId: 'AIGOS-E9',
    summary: 'Implement Token Generation',
    storyPoints: 8,
    description: `**As a** AI agent
**I want** to generate governance tokens
**So that** I can prove my governance to other agents

**Acceptance Criteria:**
- [ ] Generate JWT with AIGOS-GOV+jwt type
- [ ] Include all identity claims
- [ ] Include all governance claims
- [ ] Include all control claims
- [ ] Include all capability claims
- [ ] Include all lineage claims
- [ ] Sign with ES256 or RS256
- [ ] Short TTL (5 minutes default)
- [ ] Include unique jti (JWT ID)`,
    labels: ['a2a', 'token', 'jwt'],
  },
  {
    epicId: 'AIGOS-E9',
    summary: 'Implement Token Validation',
    storyPoints: 8,
    description: `**As a** AI agent receiving requests
**I want** to validate incoming tokens
**So that** I can trust the requester

**Acceptance Criteria:**
- [ ] Verify JWT signature
- [ ] Verify not expired (exp claim)
- [ ] Verify not before (nbf claim)
- [ ] Verify issuer (iss claim)
- [ ] Verify audience (aud claim)
- [ ] Extract and validate all aigos claims
- [ ] Check control claims (paused, termination_pending)
- [ ] Return validation result with details`,
    labels: ['a2a', 'token', 'validation'],
  },
  {
    epicId: 'AIGOS-E9',
    summary: 'Implement AIGOS Handshake (Request)',
    storyPoints: 8,
    description: `**As a** AI agent calling another agent
**I want** to perform AIGOS handshake
**So that** we mutually authenticate

**Acceptance Criteria:**
- [ ] Generate token before request
- [ ] Include X-AIGOS-Token header
- [ ] Include X-AIGOS-Protocol-Version header
- [ ] Validate response token
- [ ] Abort if validation fails
- [ ] Retry with fresh token on expiry
- [ ] Log handshake events`,
    labels: ['a2a', 'handshake', 'client'],
  },
  {
    epicId: 'AIGOS-E9',
    summary: 'Implement AIGOS Handshake (Response)',
    storyPoints: 5,
    description: `**As a** AI agent receiving requests
**I want** to complete AIGOS handshake
**So that** I prove my governance too

**Acceptance Criteria:**
- [ ] Extract token from request header
- [ ] Validate incoming token
- [ ] Apply inbound A2A policy
- [ ] Generate response token
- [ ] Include X-AIGOS-Token in response
- [ ] Reject if inbound policy violated`,
    labels: ['a2a', 'handshake', 'server'],
  },
  {
    epicId: 'AIGOS-E9',
    summary: 'Implement Inbound A2A Policy',
    storyPoints: 5,
    description: `**As a** AI agent receiving requests
**I want** inbound trust policy
**So that** I control who can call me

**Acceptance Criteria:**
- [ ] Load inbound policy from config
- [ ] Check max_risk_level requirement
- [ ] Check kill_switch_required flag
- [ ] Check golden_thread_verified_required flag
- [ ] Check min_generation_depth
- [ ] Check blocked_organizations list
- [ ] Check trusted_organizations list
- [ ] Return DENY if requirements not met`,
    labels: ['a2a', 'policy', 'inbound'],
  },
  {
    epicId: 'AIGOS-E9',
    summary: 'Implement Outbound A2A Policy',
    storyPoints: 5,
    description: `**As a** AI agent making requests
**I want** outbound trust policy
**So that** I control who I call

**Acceptance Criteria:**
- [ ] Load outbound policy from config
- [ ] Validate target before request
- [ ] Check max_risk_level requirement
- [ ] Check kill_switch_required flag
- [ ] Check blocked_domains list
- [ ] Abort request if requirements not met`,
    labels: ['a2a', 'policy', 'outbound'],
  },
  {
    epicId: 'AIGOS-E9',
    summary: 'Implement Token Claims Validation',
    storyPoints: 5,
    description: `**As a** token validator
**I want** claim-level validation
**So that** token data is correct

**Acceptance Criteria:**
- [ ] Validate identity claim structure
- [ ] Validate governance claim values
- [ ] Validate control claim booleans
- [ ] Validate capability hash matches
- [ ] Validate lineage chain validity
- [ ] Return specific errors for each check`,
    labels: ['a2a', 'token', 'claims'],
  },
  {
    epicId: 'AIGOS-E9',
    summary: 'Implement HTTP Client Middleware',
    storyPoints: 5,
    description: `**As a** developer making A2A calls
**I want** middleware for A2A auth
**So that** integration is easy

**Acceptance Criteria:**
- [ ] Create fetch/axios middleware
- [ ] Automatically add token headers
- [ ] Automatically validate response tokens
- [ ] Handle token refresh
- [ ] Configurable per-request override
- [ ] TypeScript types`,
    labels: ['a2a', 'middleware', 'dx'],
  },
  {
    epicId: 'AIGOS-E9',
    summary: 'Implement HTTP Server Middleware',
    storyPoints: 5,
    description: `**As a** developer serving A2A requests
**I want** middleware for A2A validation
**So that** integration is easy

**Acceptance Criteria:**
- [ ] Create Express/Fastify middleware
- [ ] Extract and validate incoming tokens
- [ ] Apply inbound policy
- [ ] Add identity to request context
- [ ] Generate response token
- [ ] Reject unauthorized requests`,
    labels: ['a2a', 'middleware', 'dx'],
  },
  {
    epicId: 'AIGOS-E9',
    summary: 'Add A2A Tests',
    storyPoints: 5,
    description: `**As a** developer maintaining A2A
**I want** comprehensive tests
**So that** mutual authentication works

**Acceptance Criteria:**
- [ ] Test token generation
- [ ] Test token validation
- [ ] Test handshake flow
- [ ] Test policy enforcement
- [ ] Test error cases
- [ ] Integration tests with mock servers
- [ ] Achieve 90%+ coverage`,
    labels: ['a2a', 'testing'],
  },

  // Epic 10: CLI Enhancements
  {
    epicId: 'AIGOS-E10',
    summary: 'Add SARIF Output Format',
    storyPoints: 5,
    description: `**As a** developer using IDEs
**I want** SARIF output from validate
**So that** issues appear in my editor

**Acceptance Criteria:**
- [ ] Add --format sarif option to validate command
- [ ] Generate SARIF 2.1.0 compliant output
- [ ] Include rule definitions for each check
- [ ] Include result locations with file/line
- [ ] Include severity levels
- [ ] Support output to file
- [ ] Test with VS Code SARIF viewer`,
    labels: ['cli', 'sarif', 'ide'],
  },
  {
    epicId: 'AIGOS-E10',
    summary: 'Add --fix Auto-Correct',
    storyPoints: 5,
    description: `**As a** developer fixing issues
**I want** --fix option
**So that** simple issues are auto-corrected

**Acceptance Criteria:**
- [ ] Add --fix option to validate command
- [ ] Auto-fix: missing required fields with defaults
- [ ] Auto-fix: date format normalization
- [ ] Auto-fix: risk level mapping
- [ ] Report what was fixed
- [ ] Don't auto-fix semantic issues
- [ ] Dry-run with --fix --dry-run`,
    labels: ['cli', 'auto-fix'],
  },
  {
    epicId: 'AIGOS-E10',
    summary: 'Complete Exit Code Coverage',
    storyPoints: 2,
    description: `**As a** CI pipeline
**I want** distinct exit codes
**So that** I can handle each case

**Acceptance Criteria:**
- [ ] Exit 0: Success
- [ ] Exit 1: General error
- [ ] Exit 2: Invalid arguments
- [ ] Exit 3: Validation errors found
- [ ] Exit 4: File not found
- [ ] Exit 5: Permission denied
- [ ] Document exit codes
- [ ] Test each exit code`,
    labels: ['cli', 'exit-codes'],
  },
  {
    epicId: 'AIGOS-E10',
    summary: 'Add Golden Thread Status to status command',
    storyPoints: 3,
    description: `**As a** developer checking governance
**I want** Golden Thread status in aigrc status
**So that** I see verification state

**Acceptance Criteria:**
- [ ] Show hash presence/absence
- [ ] Show verification status
- [ ] Show signature presence (if any)
- [ ] Color code status (green/yellow/red)
- [ ] Include in JSON output`,
    labels: ['cli', 'status', 'golden-thread'],
  },
  {
    epicId: 'AIGOS-E10',
    summary: 'Add aigrc version Enhancements',
    storyPoints: 3,
    description: `**As a** developer troubleshooting
**I want** detailed version info
**So that** I can report issues accurately

**Acceptance Criteria:**
- [ ] Show CLI version
- [ ] Show @aigrc/core version
- [ ] Show Node.js version
- [ ] Show npm/pnpm version
- [ ] Show OS/platform
- [ ] Show --json format
- [ ] Check for updates (optional)`,
    labels: ['cli', 'version'],
  },
  {
    epicId: 'AIGOS-E10',
    summary: 'Add aigrc hash Command',
    storyPoints: 3,
    description: `**As a** developer
**I want** an aigrc hash command
**So that** I can compute Golden Thread hashes

**Acceptance Criteria:**
- [ ] Add aigrc hash <card-path> command
- [ ] Compute hash from asset card
- [ ] Output format: sha256:7d865e...
- [ ] Support --json output
- [ ] Support --verify flag to verify existing hash
- [ ] Return exit code 0 if valid, 3 if mismatch
- [ ] Add help text and examples`,
    labels: ['cli', 'golden-thread'],
  },

  // Epic 11: License Validation
  {
    epicId: 'AIGOS-E11',
    summary: 'Implement JWT License Parsing',
    storyPoints: 3,
    description: `**As a** license validator
**I want** JWT parsing
**So that** license keys are decoded

**Acceptance Criteria:**
- [ ] Parse JWT header (alg, typ, kid)
- [ ] Parse JWT payload
- [ ] Don't validate signature yet
- [ ] Handle malformed JWTs gracefully
- [ ] Return structured license object`,
    labels: ['license', 'jwt', 'parsing'],
  },
  {
    epicId: 'AIGOS-E11',
    summary: 'Implement License Signature Verification',
    storyPoints: 5,
    description: `**As a** license validator
**I want** signature verification
**So that** license keys are authentic

**Acceptance Criteria:**
- [ ] Support RS256 algorithm
- [ ] Support ES256 algorithm
- [ ] Load public key from configuration
- [ ] Support key rotation via JWKS
- [ ] Verify signature before trusting claims
- [ ] Return verification status`,
    labels: ['license', 'jwt', 'security'],
  },
  {
    epicId: 'AIGOS-E11',
    summary: 'Implement License Claims Validation',
    storyPoints: 3,
    description: `**As a** license validator
**I want** claims validation
**So that** licenses are current and valid

**Acceptance Criteria:**
- [ ] Check issuer (iss = https://license.aigos.dev)
- [ ] Check audience (aud = aigrc)
- [ ] Check expiration (exp)
- [ ] Apply 14-day grace period
- [ ] Validate tier claim
- [ ] Validate features array
- [ ] Validate limits object`,
    labels: ['license', 'claims', 'validation'],
  },
  {
    epicId: 'AIGOS-E11',
    summary: 'Implement Feature Gating',
    storyPoints: 5,
    description: `**As a** feature system
**I want** feature checks
**So that** paid features are gated

**Acceptance Criteria:**
- [ ] Create isFeatureEnabled(feature) function
- [ ] Check features array from license
- [ ] Check tier for implicit features
- [ ] Default to community tier if no license
- [ ] Gate Kill Switch to Professional+
- [ ] Gate Capability Decay to Professional+
- [ ] Gate Multi-Jurisdiction to Professional+
- [ ] Gate SSO to Enterprise`,
    labels: ['license', 'features', 'gating'],
  },
  {
    epicId: 'AIGOS-E11',
    summary: 'Implement Limit Enforcement',
    storyPoints: 3,
    description: `**As a** usage tracker
**I want** limit enforcement
**So that** usage is within license

**Acceptance Criteria:**
- [ ] Track agent count
- [ ] Track asset count
- [ ] Track user count (if applicable)
- [ ] Check against license limits
- [ ] Return limit exceeded errors
- [ ] Default limits for community tier`,
    labels: ['license', 'limits', 'enforcement'],
  },
  {
    epicId: 'AIGOS-E11',
    summary: 'Add License Tests',
    storyPoints: 2,
    description: `**As a** developer maintaining licensing
**I want** comprehensive tests
**So that** licensing works correctly

**Acceptance Criteria:**
- [ ] Test JWT parsing
- [ ] Test signature verification
- [ ] Test claims validation
- [ ] Test feature gating
- [ ] Test limit enforcement
- [ ] Test grace period
- [ ] Test community tier defaults`,
    labels: ['license', 'testing'],
  },

  // Epic 12: Integration & Testing
  {
    epicId: 'AIGOS-E12',
    summary: 'Create Integration Test Suite',
    storyPoints: 8,
    description: `**As a** developer ensuring quality
**I want** integration tests
**So that** components work together

**Acceptance Criteria:**
- [ ] Test Identity → Policy Engine integration
- [ ] Test Policy Engine → Telemetry integration
- [ ] Test Kill Switch → Identity integration
- [ ] Test Capability Decay → Identity integration
- [ ] Test A2A → Identity integration
- [ ] Test CLI → Core integration
- [ ] End-to-end governance flow test
- [ ] Run in CI pipeline`,
    labels: ['testing', 'integration'],
  },
  {
    epicId: 'AIGOS-E12',
    summary: 'Create Conformance Test Suite',
    storyPoints: 8,
    description: `**As a** spec implementer
**I want** conformance tests
**So that** implementation matches spec

**Acceptance Criteria:**
- [ ] Test all SPEC-PRT-001 requirements
- [ ] Test all SPEC-RT-002 requirements
- [ ] Test all SPEC-RT-003 requirements
- [ ] Test all SPEC-RT-004 requirements
- [ ] Test all SPEC-RT-005 requirements
- [ ] Test all SPEC-RT-006 requirements
- [ ] Test all SPEC-CLI-001 requirements
- [ ] Generate conformance report`,
    labels: ['testing', 'conformance', 'specs'],
  },
  {
    epicId: 'AIGOS-E12',
    summary: 'Add Performance Benchmarks',
    storyPoints: 5,
    description: `**As a** developer ensuring performance
**I want** benchmarks
**So that** latency requirements are met

**Acceptance Criteria:**
- [ ] Benchmark policy check latency (target: < 2ms P99)
- [ ] Benchmark telemetry emit latency (target: < 0.1ms)
- [ ] Benchmark pattern matching (target: < 0.1ms)
- [ ] Benchmark identity creation (target: < 10ms)
- [ ] Run benchmarks in CI
- [ ] Alert on regression`,
    labels: ['testing', 'performance', 'benchmarks'],
  },
  {
    epicId: 'AIGOS-E12',
    summary: 'Update Documentation',
    storyPoints: 5,
    description: `**As a** developer using AIGRC/AIGOS
**I want** updated documentation
**So that** I can use new features

**Acceptance Criteria:**
- [ ] Update README with new features
- [ ] Document runtime API
- [ ] Document policy file format
- [ ] Document A2A protocol usage
- [ ] Add examples for each component
- [ ] Update architecture diagrams
- [ ] Add troubleshooting guide`,
    labels: ['documentation'],
  },
  {
    epicId: 'AIGOS-E12',
    summary: 'Create Migration Guide',
    storyPoints: 3,
    description: `**As a** developer upgrading
**I want** migration guide
**So that** I can upgrade smoothly

**Acceptance Criteria:**
- [ ] Document breaking changes
- [ ] Document new features
- [ ] Document configuration changes
- [ ] Provide upgrade script (if needed)
- [ ] List deprecated features
- [ ] Provide timeline for deprecations`,
    labels: ['documentation', 'migration'],
  },
  {
    epicId: 'AIGOS-E12',
    summary: 'Add SDK Examples',
    storyPoints: 5,
    description: `**As a** developer integrating AIGOS
**I want** example code
**So that** I can get started quickly

**Acceptance Criteria:**
- [ ] TypeScript example: Basic identity
- [ ] TypeScript example: @guard decorator
- [ ] TypeScript example: Policy evaluation
- [ ] TypeScript example: Telemetry
- [ ] TypeScript example: A2A communication
- [ ] Python example: Basic integration
- [ ] Add to examples/ directory`,
    labels: ['documentation', 'examples'],
  },
];

// Priority mapping
const PRIORITY_MAP = {
  'Highest': '1',
  'High': '2',
  'Medium': '3',
  'Low': '4',
  'Lowest': '5',
};

// Helper function to make API requests
function makeRequest(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: JIRA_HOST,
      port: 443,
      path: `/rest/api/3${path}`,
      method: method,
      headers: {
        'Authorization': `Basic ${AUTH}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            resolve(data ? JSON.parse(data) : {});
          } catch (e) {
            resolve(data);
          }
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${data}`));
        }
      });
    });

    req.on('error', reject);
    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

// Get project metadata
async function getProjectMeta() {
  console.log('Fetching project metadata...');
  try {
    const project = await makeRequest('GET', `/project/${PROJECT_KEY}`);
    console.log(`Project: ${project.name} (${project.key})`);
    return project;
  } catch (error) {
    console.error('Failed to fetch project:', error.message);
    throw error;
  }
}

// Get issue types
async function getIssueTypes() {
  console.log('Fetching issue types...');
  const meta = await makeRequest('GET', `/issue/createmeta?projectKeys=${PROJECT_KEY}&expand=projects.issuetypes.fields`);
  const project = meta.projects.find(p => p.key === PROJECT_KEY);
  if (!project) {
    throw new Error(`Project ${PROJECT_KEY} not found`);
  }
  const issueTypes = {};
  for (const type of project.issuetypes) {
    issueTypes[type.name.toLowerCase()] = type.id;
  }
  console.log('Issue types:', Object.keys(issueTypes));
  return issueTypes;
}

// Create an Epic
async function createEpic(epic, issueTypes) {
  const epicTypeId = issueTypes['epic'];
  if (!epicTypeId) {
    throw new Error('Epic issue type not found');
  }

  const body = {
    fields: {
      project: { key: PROJECT_KEY },
      issuetype: { id: epicTypeId },
      summary: `[${epic.id}] ${epic.summary}`,
      description: {
        type: 'doc',
        version: 1,
        content: [
          {
            type: 'paragraph',
            content: [{ type: 'text', text: epic.description }]
          }
        ]
      },
      labels: epic.labels,
    }
  };

  console.log(`Creating Epic: ${epic.summary}`);
  const result = await makeRequest('POST', '/issue', body);
  console.log(`  Created: ${result.key}`);
  return result.key;
}

// Create a Story
async function createStory(story, epicKey, issueTypes) {
  const storyTypeId = issueTypes['story'] || issueTypes['task'];
  if (!storyTypeId) {
    throw new Error('Story/Task issue type not found');
  }

  const body = {
    fields: {
      project: { key: PROJECT_KEY },
      issuetype: { id: storyTypeId },
      summary: story.summary,
      description: {
        type: 'doc',
        version: 1,
        content: [
          {
            type: 'paragraph',
            content: [{ type: 'text', text: story.description }]
          }
        ]
      },
      labels: story.labels,
      // Story points field name varies by JIRA instance
      // customfield_10016: story.storyPoints,  // Common field for story points
    }
  };

  // Link to Epic if we have the field
  if (epicKey) {
    // The Epic Link field varies by JIRA instance
    // body.fields.customfield_10014 = epicKey;  // Common Epic Link field
    body.fields.parent = { key: epicKey };  // For next-gen projects
  }

  console.log(`  Creating Story: ${story.summary}`);
  const result = await makeRequest('POST', '/issue', body);
  console.log(`    Created: ${result.key}`);
  return result.key;
}

// Main function
async function main() {
  console.log('='.repeat(60));
  console.log('AIGRC/AIGOS JIRA Import Script');
  console.log('='.repeat(60));
  console.log('');

  try {
    await getProjectMeta();
    const issueTypes = await getIssueTypes();

    console.log('');
    console.log('Creating Epics and Stories...');
    console.log('-'.repeat(60));

    const epicKeyMap = {};

    // Create all Epics first
    for (const epic of EPICS) {
      const epicKey = await createEpic(epic, issueTypes);
      epicKeyMap[epic.id] = epicKey;
    }

    console.log('');
    console.log('Epics created. Now creating Stories...');
    console.log('-'.repeat(60));

    // Create all Stories
    for (const story of STORIES) {
      const epicKey = epicKeyMap[story.epicId];
      await createStory(story, epicKey, issueTypes);
    }

    console.log('');
    console.log('='.repeat(60));
    console.log('Import Complete!');
    console.log(`Created ${EPICS.length} Epics and ${STORIES.length} Stories`);
    console.log('='.repeat(60));

  } catch (error) {
    console.error('Import failed:', error.message);
    process.exit(1);
  }
}

main();
