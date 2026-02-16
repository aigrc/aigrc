/**
 * A2A Module (AIGOS-E9)
 *
 * Agent-to-Agent Governance Token Protocol implementation.
 * Provides JWT-based mutual authentication between AI agents.
 *
 * @example
 * ```typescript
 * import {
 *   createA2AManager,
 *   createTokenGenerator,
 *   createTokenValidator,
 *   A2A_HEADERS,
 * } from '@aigos/runtime/a2a';
 *
 * // Create A2A manager
 * const a2aManager = createA2AManager({
 *   identity: runtimeIdentity,
 *   tokenGeneratorConfig: {
 *     signingKey: {
 *       kid: 'my-key-1',
 *       alg: 'HS256',
 *       secret: process.env.A2A_SECRET,
 *     },
 *   },
 *   tokenValidatorConfig: {
 *     trustedKeys: new Map([
 *       ['partner-key-1', { kid: 'partner-key-1', alg: 'HS256', secret: '...' }],
 *     ]),
 *   },
 *   inboundPolicy: {
 *     requireToken: true,
 *     maxRiskLevel: 'high',
 *   },
 *   outboundPolicy: {
 *     includeToken: true,
 *     validateResponseTokens: true,
 *   },
 * });
 *
 * // Generate a token
 * const { token } = await a2aManager.generateToken();
 *
 * // Validate incoming token
 * const result = await a2aManager.validateToken(incomingToken);
 *
 * // Create fetch with A2A auth
 * const a2aFetch = a2aManager.createA2AFetch();
 * const response = await a2aFetch('https://partner-agent.com/api');
 * ```
 *
 * @packageDocumentation
 */

// ─────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────

export type {
  // Configuration
  SigningAlgorithm,
  SigningKey,
  TokenGeneratorConfig,
  TokenValidatorConfig,
  A2AManagerConfig,
  ClientMiddlewareConfig,
  ServerMiddlewareConfig,

  // Token operations
  GenerateTokenOptions,
  GeneratedToken,
  TokenValidationResult,
  TokenValidationErrorCode,
  TokenValidationWarning,

  // Policies
  InboundA2APolicy,
  OutboundA2APolicy,
  InboundPolicyCheck,
  OutboundPolicyCheck,
  PolicyCheckResult,
  OutboundTarget,

  // Handshake
  A2ARequestContext,
  HandshakeResult,

  // HTTP
  A2ARequest,
  A2AResponse,
  MiddlewareHandler,

  // Events
  A2AEventType,
  A2AEvent,
  A2AEventHandler,
  BaseA2AEvent,
  TokenGeneratedEvent,
  TokenValidatedEvent,
  TokenValidationFailedEvent,
  HandshakeStartedEvent,
  HandshakeCompletedEvent,
  HandshakeFailedEvent,
  PolicyCheckedEvent,
  PolicyViolatedEvent,

  // Interfaces
  TokenGenerator,
  TokenValidator,
} from "./types.js";

// ─────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────

export {
  A2A_HEADERS,
  A2A_PROTOCOL_VERSION,
  JWT_TYPE,
  DEFAULT_TOKEN_TTL_SECONDS,
  DEFAULT_MAX_CLOCK_SKEW_SECONDS,
} from "./types.js";

// ─────────────────────────────────────────────────────────────────
// TOKEN GENERATOR
// ─────────────────────────────────────────────────────────────────

export { A2ATokenGenerator, createTokenGenerator } from "./token-generator.js";

// ─────────────────────────────────────────────────────────────────
// TOKEN VALIDATOR
// ─────────────────────────────────────────────────────────────────

export { A2ATokenValidator, createTokenValidator } from "./token-validator.js";

// ─────────────────────────────────────────────────────────────────
// POLICIES
// ─────────────────────────────────────────────────────────────────

export {
  InboundPolicyChecker,
  OutboundPolicyChecker,
  DEFAULT_INBOUND_POLICY,
  DEFAULT_OUTBOUND_POLICY,
  createInboundPolicyChecker,
  createOutboundPolicyChecker,
} from "./policy.js";

// ─────────────────────────────────────────────────────────────────
// HANDSHAKE
// ─────────────────────────────────────────────────────────────────

export { A2AHandshakeHandler, createHandshakeHandler } from "./handshake.js";

// ─────────────────────────────────────────────────────────────────
// MIDDLEWARE
// ─────────────────────────────────────────────────────────────────

export {
  A2AClientMiddleware,
  A2AServerMiddleware,
  A2AError,
  createClientMiddleware,
  createServerMiddleware,
} from "./middleware.js";

// ─────────────────────────────────────────────────────────────────
// A2A MANAGER (Main API)
// ─────────────────────────────────────────────────────────────────

export { A2AManager, createA2AManager } from "./a2a-manager.js";
