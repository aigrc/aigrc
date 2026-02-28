/**
 * @aigrc/runtime - Runtime Governance System
 *
 * AIGOS Runtime provides:
 * - Identity Manager (SPEC-RT-002): Cryptographic identity for AI agents
 * - Policy Engine (SPEC-RT-003): Real-time permission evaluation
 * - Telemetry Emitter (SPEC-RT-004): OpenTelemetry integration
 * - Kill Switch (SPEC-RT-005): Remote agent termination
 * - Capability Decay (SPEC-RT-006): Child agent permission inheritance
 *
 * @example
 * ```typescript
 * import {
 *   createIdentityManager,
 *   createPolicyEngine,
 *   createTelemetryEmitter,
 *   createKillSwitchReceiver,
 *   createCapabilityDecayManager,
 *   configureGuard,
 *   guard,
 * } from '@aigrc/runtime';
 *
 * // Create managers
 * const identityManager = createIdentityManager();
 * const policyEngine = createPolicyEngine();
 * const telemetry = createTelemetryEmitter({ enabled: true, serviceName: 'my-agent' });
 * const killSwitch = createKillSwitchReceiver({ enabled: true, channel: 'sse' });
 * const capabilityManager = createCapabilityDecayManager();
 *
 * // Initialize telemetry
 * await telemetry.initialize();
 *
 * // Create identity for agent
 * const identity = await identityManager.createIdentity({
 *   assetCardPath: '.aigrc/cards/my-agent.yaml',
 * });
 *
 * // Start kill switch listener
 * await killSwitch.start(identity);
 *
 * // Configure guards with identity and policy engine
 * configureGuard({
 *   identityProvider: () => identity,
 *   policyChecker: async (id, ctx) => {
 *     const decision = policyEngine.checkPermissionSync(id, ctx.action, ctx.resource);
 *     // Emit telemetry
 *     telemetry.emitDecision(id, ctx.action, ctx.resource, decision);
 *     return { allowed: decision.allowed, reason: decision.reason };
 *   },
 * });
 *
 * // Use guards on agent methods
 * class MyAgent {
 *   @guard('call_api')
 *   async callExternalAPI(url: string) {
 *     return fetch(url);
 *   }
 * }
 *
 * // Spawn child agent with decayed capabilities
 * const childCaps = capabilityManager.computeChildCapabilities(identity, {
 *   mode: 'decay',
 *   allowedTools: ['read_file'],
 * });
 * ```
 *
 * @packageDocumentation
 */

// ─────────────────────────────────────────────────────────────────
// IDENTITY MODULE (AIGOS-E4)
// ─────────────────────────────────────────────────────────────────

export {
  // Types
  type RuntimeIdentity,
  type CapabilitiesManifest,
  type Lineage,
  type GoldenThread,
  type RiskLevel,
  type OperatingMode,
  type CreateIdentityOptions,
  type VerificationResult,
  type SpawnChildOptions,
  type ModeTransitionRequest,
  type ModeTransitionResult,
  type IdentityEvent,
  type IdentityEventHandler,
  type IdentityManagerConfig,
  // Classes
  IdentityManager,
  IdentityError,
  // Factory functions
  createIdentityManager,
  createRuntimeIdentity,
  // Guard decorator
  guard,
  configureGuard,
  getCurrentIdentity,
  checkGuard,
  guardAsync,
  GovernanceError,
  type GuardContext,
  type GuardCheckResult,
  type PolicyChecker,
} from "./identity/index.js";

// ─────────────────────────────────────────────────────────────────
// POLICY ENGINE MODULE (AIGOS-E5)
// ─────────────────────────────────────────────────────────────────

export {
  // Types
  type PolicyDecision,
  type DenialStage,
  type BudgetState,
  type BudgetLimits,
  type KillSwitchState,
  type CustomCheck,
  type RegisteredCustomCheck,
  type PolicyEngineConfig,
  type EvaluationContext,
  type PolicyEvent,
  type PolicyEventHandler,
  type PatternCache,
  type CacheStats,
  DENIAL_CODES,
  // Classes
  PolicyEngine,
  // Factory functions
  createPolicyEngine,
} from "./policy/index.js";

// ─────────────────────────────────────────────────────────────────
// TELEMETRY MODULE (AIGOS-E6)
// ─────────────────────────────────────────────────────────────────

export {
  // Types
  type TelemetryConfig,
  type DecisionResult,
  type ViolationSeverity,
  type TerminationSource,
  // Semantic conventions
  AIGOS_ATTR,
  SPAN_NAMES,
  METRIC_NAMES,
  AIGOS_INSTANCE_ID,
  AIGOS_ASSET_ID,
  AIGOS_ASSET_NAME,
  AIGOS_ASSET_VERSION,
  AIGOS_RISK_LEVEL,
  AIGOS_IDENTITY_VERIFIED,
  AIGOS_MODE,
  AIGOS_GOLDEN_THREAD_HASH,
  AIGOS_TICKET_ID,
  AIGOS_APPROVED_BY,
  AIGOS_PARENT_INSTANCE_ID,
  AIGOS_ROOT_INSTANCE_ID,
  AIGOS_GENERATION_DEPTH,
  AIGOS_MAX_CHILD_DEPTH,
  AIGOS_DECISION_RESULT,
  AIGOS_DECISION_ACTION,
  AIGOS_DECISION_RESOURCE,
  AIGOS_DECISION_REASON,
  AIGOS_DECISION_CODE,
  AIGOS_DECISION_DENIED_BY,
  AIGOS_DECISION_DURATION_MS,
  AIGOS_DECISION_DRY_RUN,
  AIGOS_VIOLATION_CODE,
  AIGOS_VIOLATION_SEVERITY,
  AIGOS_VIOLATION_MESSAGE,
  AIGOS_BUDGET_COST_INCURRED,
  AIGOS_BUDGET_SESSION_TOTAL,
  AIGOS_BUDGET_DAILY_TOTAL,
  AIGOS_BUDGET_SESSION_REMAINING,
  AIGOS_BUDGET_DAILY_REMAINING,
  AIGOS_BUDGET_LIMIT_TYPE,
  AIGOS_TERMINATE_SOURCE,
  AIGOS_TERMINATE_SESSION_DURATION_S,
  AIGOS_TERMINATE_FINAL_SESSION_COST,
  AIGOS_TERMINATE_FINAL_DAILY_COST,
  AIGOS_SPAWN_CHILD_INSTANCE_ID,
  AIGOS_SPAWN_CHILD_ASSET_ID,
  AIGOS_SPAWN_CAPABILITY_MODE,
  AIGOS_KILL_SWITCH_COMMAND,
  AIGOS_KILL_SWITCH_COMMAND_ID,
  AIGOS_KILL_SWITCH_TIMESTAMP,
  AIGOS_KILL_SWITCH_ISSUER,
  SPAN_NAME_IDENTITY,
  SPAN_NAME_DECISION,
  SPAN_NAME_VIOLATION,
  SPAN_NAME_BUDGET,
  SPAN_NAME_TERMINATE,
  SPAN_NAME_SPAWN,
  SPAN_NAME_KILL_SWITCH,
  METRIC_DECISIONS_TOTAL,
  METRIC_VIOLATIONS_TOTAL,
  METRIC_SPAWNS_TOTAL,
  METRIC_TERMINATIONS_TOTAL,
  METRIC_BUDGET_SESSION_USED,
  METRIC_BUDGET_DAILY_USED,
  METRIC_AGENTS_ACTIVE,
  METRIC_DECISION_DURATION,
  // Classes
  TelemetryEmitter,
  // Factory functions
  createTelemetryEmitter,
} from "./telemetry/index.js";

// ─────────────────────────────────────────────────────────────────
// KILL SWITCH MODULE (AIGOS-E7)
// ─────────────────────────────────────────────────────────────────

export {
  // Types
  type KillSwitchCommand,
  type KillSwitchChannelType,
  type ConnectionState,
  type KillSwitchConfig,
  type KillSwitchTerminateHandler,
  type KillSwitchPauseHandler,
  type KillSwitchResumeHandler,
  type KillSwitchEventType,
  type KillSwitchEvent,
  type KillSwitchEventHandler,
  type KillSwitchConnectedEvent,
  type KillSwitchDisconnectedEvent,
  type KillSwitchReconnectingEvent,
  type KillSwitchCommandReceivedEvent,
  type KillSwitchCommandVerifiedEvent,
  type KillSwitchCommandExecutedEvent,
  type KillSwitchCommandFailedEvent,
  type KillSwitchVerificationFailedEvent,
  type KillSwitchErrorEvent,
  type CommandExecutionResult,
  type CommandVerificationResult,
  type ChannelListener,
  // Classes
  KillSwitchReceiver,
  KillSwitchError,
  // Factory functions
  createKillSwitchReceiver,
  executeKillSwitch,
} from "./kill-switch/index.js";

// ─────────────────────────────────────────────────────────────────
// CAPABILITY DECAY MODULE (AIGOS-E8)
// ─────────────────────────────────────────────────────────────────

export {
  // Types
  type CapabilityMode,
  type CapabilityDecayConfig,
  type SpawnCapabilityOptions,
  type CapabilityValidationResult,
  type CapabilityWarning,
  type CapabilityError,
  type CapabilityEventType,
  type CapabilityEvent,
  type CapabilityEventHandler,
  type CapabilityComputedEvent,
  type CapabilityValidatedEvent,
  type CapabilityEscalationDeniedEvent,
  type CapabilityDecayAppliedEvent,
  type CapabilityComparison,
  // Classes
  CapabilityDecayManager,
  // Factory functions
  createCapabilityDecayManager,
} from "./capability/index.js";

// ─────────────────────────────────────────────────────────────────
// A2A MODULE (AIGOS-E9)
// ─────────────────────────────────────────────────────────────────

export {
  // Types
  type SigningAlgorithm,
  type SigningKey,
  type TokenGeneratorConfig,
  type TokenValidatorConfig,
  type A2AManagerConfig,
  type ClientMiddlewareConfig,
  type ServerMiddlewareConfig,
  type GenerateTokenOptions,
  type GeneratedToken,
  type TokenValidationResult,
  type TokenValidationErrorCode,
  type TokenValidationWarning,
  type InboundA2APolicy,
  type OutboundA2APolicy,
  type InboundPolicyCheck,
  type OutboundPolicyCheck,
  type PolicyCheckResult,
  type OutboundTarget,
  type A2ARequestContext,
  type HandshakeResult,
  type A2ARequest,
  type A2AResponse,
  type MiddlewareHandler,
  type A2AEventType,
  type A2AEvent,
  type A2AEventHandler,
  type TokenGenerator,
  type TokenValidator,
  // Constants
  A2A_HEADERS,
  A2A_PROTOCOL_VERSION,
  JWT_TYPE,
  DEFAULT_TOKEN_TTL_SECONDS,
  DEFAULT_MAX_CLOCK_SKEW_SECONDS,
  // Classes
  A2ATokenGenerator,
  A2ATokenValidator,
  InboundPolicyChecker,
  OutboundPolicyChecker,
  A2AHandshakeHandler,
  A2AClientMiddleware,
  A2AServerMiddleware,
  A2AManager,
  A2AError,
  // Factory functions
  createTokenGenerator,
  createTokenValidator,
  createInboundPolicyChecker,
  createOutboundPolicyChecker,
  createHandshakeHandler,
  createClientMiddleware,
  createServerMiddleware,
  createA2AManager,
  // Default policies
  DEFAULT_INBOUND_POLICY,
  DEFAULT_OUTBOUND_POLICY,
} from "./a2a/index.js";

// ─────────────────────────────────────────────────────────────────
// LICENSE MODULE (AIGOS-E11)
// ─────────────────────────────────────────────────────────────────

export {
  // Types
  type LicenseTier,
  type FeatureId,
  type LicenseLimits,
  type LicensePayload,
  type LicenseValidationResult,
  type LicenseErrorCode,
  type LicenseWarning,
  type FeatureCheckResult,
  type LimitCheckResult,
  type UsageState,
  type LicenseManagerConfig,
  type LicenseEventType,
  type LicenseEvent,
  type LicenseEventHandler,
  // Constants
  TIER_FEATURES,
  TIER_LIMITS,
  DEFAULT_LICENSE_ISSUER,
  DEFAULT_LICENSE_AUDIENCE,
  DEFAULT_GRACE_PERIOD_DAYS,
  LICENSE_JWT_TYPE,
  // Classes
  LicenseManager,
  // Factory functions
  createLicenseManager,
} from "./license/index.js";
