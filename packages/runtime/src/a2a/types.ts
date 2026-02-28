/**
 * A2A Governance Token Types (AIGOS-E9)
 *
 * SPEC-PRT-003: Agent-to-Agent Mutual Authentication
 *
 * This module defines types for:
 * - JWT token generation and validation
 * - AIGOS handshake protocol
 * - Inbound/Outbound A2A policies
 * - HTTP middleware interfaces
 */

import type {
  RuntimeIdentity,
  RiskLevel,
  OperatingMode,
  GovernanceTokenPayload,
  GovernanceTokenIdentityClaims,
  GovernanceTokenGovernanceClaims,
  GovernanceTokenControlClaims,
  GovernanceTokenCapabilityClaims,
  GovernanceTokenLineageClaims,
} from "@aigrc/core";

// ─────────────────────────────────────────────────────────────────
// TOKEN CONFIGURATION
// ─────────────────────────────────────────────────────────────────

/**
 * Supported JWT signing algorithms
 */
export type SigningAlgorithm = "ES256" | "RS256" | "HS256";

/**
 * Key types for token signing/verification
 * Using globalThis.CryptoKey for cross-environment compatibility
 */
export interface SigningKey {
  /** Key identifier (kid) */
  kid: string;
  /** Algorithm for this key */
  alg: SigningAlgorithm;
  /** Private key for signing (PEM or JWK format, or CryptoKey object) */
  privateKey?: unknown | string;
  /** Public key for verification (PEM or JWK format, or CryptoKey object) */
  publicKey?: unknown | string;
  /** Secret for HMAC (HS256) */
  secret?: string;
}

/**
 * Token generation configuration
 */
export interface TokenGeneratorConfig {
  /** Signing key configuration */
  signingKey: SigningKey;
  /** Default token TTL in seconds (default: 300 = 5 minutes) */
  defaultTtlSeconds: number;
  /** Issuer claim value (default: "aigos-runtime") */
  issuer: string;
  /** Default audience claim */
  defaultAudience: string | string[];
  /** Include control claims in token */
  includeControlClaims: boolean;
  /** Include capability hash in token */
  includeCapabilityHash: boolean;
}

/**
 * Token validation configuration
 */
export interface TokenValidatorConfig {
  /** JWKS endpoint for key discovery */
  jwksEndpoint?: string;
  /** Trusted public keys (keyed by kid) */
  trustedKeys: Map<string, SigningKey>;
  /** Maximum allowed clock skew in seconds */
  maxClockSkewSeconds: number;
  /** Required issuer value */
  requiredIssuer: string;
  /** Required audience values */
  requiredAudience: string[];
  /** Validate control claims (paused, termination_pending) */
  validateControlClaims: boolean;
  /** Reject paused agents */
  rejectPausedAgents: boolean;
  /** Reject agents pending termination */
  rejectTerminationPending: boolean;
}

// ─────────────────────────────────────────────────────────────────
// TOKEN GENERATION
// ─────────────────────────────────────────────────────────────────

/**
 * Options for generating a governance token
 */
export interface GenerateTokenOptions {
  /** Identity to generate token for */
  identity: RuntimeIdentity;
  /** Target audience(s) */
  audience?: string | string[];
  /** Custom TTL in seconds */
  ttlSeconds?: number;
  /** Kill switch state */
  killSwitch?: {
    enabled: boolean;
    channel: "sse" | "polling" | "file";
  };
  /** Whether agent is currently paused */
  paused?: boolean;
  /** Whether termination is pending */
  terminationPending?: boolean;
}

/**
 * Generated token result
 */
export interface GeneratedToken {
  /** Encoded JWT string */
  token: string;
  /** Decoded payload */
  payload: GovernanceTokenPayload;
  /** Token ID (jti) */
  jti: string;
  /** Expiration timestamp (Unix epoch) */
  expiresAt: number;
  /** Issued at timestamp (Unix epoch) */
  issuedAt: number;
}

// ─────────────────────────────────────────────────────────────────
// TOKEN VALIDATION
// ─────────────────────────────────────────────────────────────────

/**
 * Token validation result
 */
export interface TokenValidationResult {
  /** Whether the token is valid */
  valid: boolean;
  /** Decoded payload (if valid) */
  payload?: GovernanceTokenPayload;
  /** Validation error code (if invalid) */
  errorCode?: TokenValidationErrorCode;
  /** Human-readable error message */
  errorMessage?: string;
  /** Warnings that don't invalidate the token */
  warnings?: TokenValidationWarning[];
}

/**
 * Token validation error codes
 */
export type TokenValidationErrorCode =
  | "INVALID_FORMAT"
  | "INVALID_SIGNATURE"
  | "EXPIRED"
  | "NOT_YET_VALID"
  | "INVALID_ISSUER"
  | "INVALID_AUDIENCE"
  | "MISSING_CLAIMS"
  | "INVALID_CLAIMS"
  | "KEY_NOT_FOUND"
  | "PAUSED_AGENT"
  | "TERMINATION_PENDING"
  | "POLICY_VIOLATION";

/**
 * Validation warning
 */
export interface TokenValidationWarning {
  code: string;
  message: string;
}

// ─────────────────────────────────────────────────────────────────
// A2A POLICIES
// ─────────────────────────────────────────────────────────────────

/**
 * Inbound A2A policy - controls who can call this agent
 */
export interface InboundA2APolicy {
  /** Require governance token on all inbound requests */
  requireToken: boolean;
  /** Maximum acceptable risk level */
  maxRiskLevel: RiskLevel;
  /** Require kill switch to be enabled */
  requireKillSwitch: boolean;
  /** Require Golden Thread to be verified */
  requireGoldenThreadVerified: boolean;
  /** Minimum generation depth (0 = any, 1+ = only children) */
  minGenerationDepth: number;
  /** Maximum generation depth */
  maxGenerationDepth: number;
  /** Blocked organizations (deny list) */
  blockedOrganizations: string[];
  /** Trusted organizations (if set, only these are allowed) */
  trustedOrganizations?: string[];
  /** Blocked asset IDs */
  blockedAssets: string[];
  /** Trusted asset IDs (if set, only these are allowed) */
  trustedAssets?: string[];
  /** Required operating modes */
  allowedModes: OperatingMode[];
  /** Custom policy checks */
  customChecks?: InboundPolicyCheck[];
}

/**
 * Custom inbound policy check function
 */
export type InboundPolicyCheck = (
  payload: GovernanceTokenPayload,
  context: A2ARequestContext
) => PolicyCheckResult | Promise<PolicyCheckResult>;

/**
 * Outbound A2A policy - controls who this agent can call
 */
export interface OutboundA2APolicy {
  /** Include governance token on all outbound requests */
  includeToken: boolean;
  /** Maximum risk level of target agents */
  maxTargetRiskLevel: RiskLevel;
  /** Require target to have kill switch enabled */
  requireTargetKillSwitch: boolean;
  /** Require target Golden Thread to be verified */
  requireTargetGoldenThreadVerified: boolean;
  /** Blocked target domains */
  blockedDomains: string[];
  /** Allowed target domains (if set, only these are allowed) */
  allowedDomains?: string[];
  /** Blocked target assets */
  blockedTargetAssets: string[];
  /** Validate response tokens */
  validateResponseTokens: boolean;
  /** Custom policy checks */
  customChecks?: OutboundPolicyCheck[];
}

/**
 * Custom outbound policy check function
 */
export type OutboundPolicyCheck = (
  target: OutboundTarget,
  identity: RuntimeIdentity
) => PolicyCheckResult | Promise<PolicyCheckResult>;

/**
 * Outbound request target
 */
export interface OutboundTarget {
  /** Target URL */
  url: string;
  /** Target domain */
  domain: string;
  /** Target agent identity (from response token) */
  targetIdentity?: GovernanceTokenPayload;
}

/**
 * Policy check result
 */
export interface PolicyCheckResult {
  /** Whether the check passed */
  allowed: boolean;
  /** Reason code */
  code?: string;
  /** Human-readable reason */
  reason?: string;
}

// ─────────────────────────────────────────────────────────────────
// HANDSHAKE PROTOCOL
// ─────────────────────────────────────────────────────────────────

/**
 * AIGOS handshake request context
 */
export interface A2ARequestContext {
  /** Incoming HTTP request headers */
  headers: Record<string, string | string[] | undefined>;
  /** Request method */
  method: string;
  /** Request path */
  path: string;
  /** Request source IP (if available) */
  sourceIp?: string;
  /** Request timestamp */
  timestamp: Date;
  /** Custom context data */
  custom?: Record<string, unknown>;
}

/**
 * Handshake result
 */
export interface HandshakeResult {
  /** Whether handshake succeeded */
  success: boolean;
  /** Validated inbound identity */
  inboundIdentity?: GovernanceTokenPayload;
  /** Generated response token */
  responseToken?: string;
  /** Error code if failed */
  errorCode?: TokenValidationErrorCode | "POLICY_VIOLATION";
  /** Error message if failed */
  errorMessage?: string;
  /** Policy violations */
  policyViolations?: PolicyCheckResult[];
}

// ─────────────────────────────────────────────────────────────────
// HTTP MIDDLEWARE TYPES
// ─────────────────────────────────────────────────────────────────

/**
 * HTTP request with AIGOS context
 */
export interface A2ARequest {
  /** Original request headers */
  headers: Record<string, string | string[] | undefined>;
  /** Request method */
  method: string;
  /** Request URL/path */
  url: string;
  /** Validated inbound identity (set by middleware) */
  aigosIdentity?: GovernanceTokenPayload;
  /** Custom request context */
  context?: Record<string, unknown>;
}

/**
 * HTTP response with AIGOS headers
 */
export interface A2AResponse {
  /** Response headers */
  headers: Record<string, string>;
  /** Response status code */
  status: number;
  /** Response body */
  body?: unknown;
}

/**
 * Middleware handler function
 */
export type MiddlewareHandler = (
  req: A2ARequest,
  next: () => Promise<A2AResponse>
) => Promise<A2AResponse>;

/**
 * Client middleware configuration
 */
export interface ClientMiddlewareConfig {
  /** Token generator instance */
  tokenGenerator: TokenGenerator;
  /** Outbound policy */
  policy: OutboundA2APolicy;
  /** Token validator for response validation */
  tokenValidator?: TokenValidator;
  /** Custom headers to include */
  customHeaders?: Record<string, string>;
}

/**
 * Server middleware configuration
 */
export interface ServerMiddlewareConfig {
  /** Token validator instance */
  tokenValidator: TokenValidator;
  /** Token generator for response tokens */
  tokenGenerator: TokenGenerator;
  /** Inbound policy */
  policy: InboundA2APolicy;
  /** Paths to exclude from validation */
  excludePaths?: string[];
  /** Error handler */
  onError?: (error: HandshakeResult, req: A2ARequest) => A2AResponse;
}

// ─────────────────────────────────────────────────────────────────
// A2A EVENTS
// ─────────────────────────────────────────────────────────────────

/**
 * A2A event types
 */
export type A2AEventType =
  | "token.generated"
  | "token.validated"
  | "token.validation_failed"
  | "handshake.started"
  | "handshake.completed"
  | "handshake.failed"
  | "policy.checked"
  | "policy.violated";

/**
 * Base A2A event
 */
export interface BaseA2AEvent {
  type: A2AEventType;
  timestamp: string;
  instanceId: string;
}

/**
 * Token generated event
 */
export interface TokenGeneratedEvent extends BaseA2AEvent {
  type: "token.generated";
  jti: string;
  audience: string | string[];
  expiresAt: number;
}

/**
 * Token validated event
 */
export interface TokenValidatedEvent extends BaseA2AEvent {
  type: "token.validated";
  jti: string;
  issuerInstanceId: string;
  issuerAssetId: string;
}

/**
 * Token validation failed event
 */
export interface TokenValidationFailedEvent extends BaseA2AEvent {
  type: "token.validation_failed";
  errorCode: TokenValidationErrorCode;
  errorMessage: string;
}

/**
 * Handshake started event
 */
export interface HandshakeStartedEvent extends BaseA2AEvent {
  type: "handshake.started";
  direction: "inbound" | "outbound";
  targetUrl?: string;
}

/**
 * Handshake completed event
 */
export interface HandshakeCompletedEvent extends BaseA2AEvent {
  type: "handshake.completed";
  direction: "inbound" | "outbound";
  peerInstanceId: string;
  peerAssetId: string;
}

/**
 * Handshake failed event
 */
export interface HandshakeFailedEvent extends BaseA2AEvent {
  type: "handshake.failed";
  direction: "inbound" | "outbound";
  errorCode: string;
  errorMessage: string;
}

/**
 * Policy checked event
 */
export interface PolicyCheckedEvent extends BaseA2AEvent {
  type: "policy.checked";
  direction: "inbound" | "outbound";
  peerInstanceId?: string;
  allowed: boolean;
}

/**
 * Policy violated event
 */
export interface PolicyViolatedEvent extends BaseA2AEvent {
  type: "policy.violated";
  direction: "inbound" | "outbound";
  violationCode: string;
  violationMessage: string;
}

/**
 * Union of all A2A events
 */
export type A2AEvent =
  | TokenGeneratedEvent
  | TokenValidatedEvent
  | TokenValidationFailedEvent
  | HandshakeStartedEvent
  | HandshakeCompletedEvent
  | HandshakeFailedEvent
  | PolicyCheckedEvent
  | PolicyViolatedEvent;

/**
 * A2A event handler
 */
export type A2AEventHandler = (event: A2AEvent) => void | Promise<void>;

// ─────────────────────────────────────────────────────────────────
// INTERFACES
// ─────────────────────────────────────────────────────────────────

/**
 * Token generator interface
 */
export interface TokenGenerator {
  /** Generate a governance token */
  generate(options: GenerateTokenOptions): Promise<GeneratedToken>;
  /** Get the signing key ID */
  getKeyId(): string;
}

/**
 * Token validator interface
 */
export interface TokenValidator {
  /** Validate a governance token */
  validate(token: string): Promise<TokenValidationResult>;
  /** Refresh keys from JWKS endpoint */
  refreshKeys?(): Promise<void>;
}

/**
 * A2A manager configuration
 */
export interface A2AManagerConfig {
  /** This agent's identity */
  identity: RuntimeIdentity;
  /** Token generator configuration */
  tokenGeneratorConfig: Partial<TokenGeneratorConfig>;
  /** Token validator configuration */
  tokenValidatorConfig: Partial<TokenValidatorConfig>;
  /** Inbound policy */
  inboundPolicy: Partial<InboundA2APolicy>;
  /** Outbound policy */
  outboundPolicy: Partial<OutboundA2APolicy>;
  /** Kill switch state provider */
  killSwitchStateProvider?: () => { enabled: boolean; channel: "sse" | "polling" | "file" };
  /** Paused state provider */
  pausedStateProvider?: () => boolean;
  /** Termination pending state provider */
  terminationPendingStateProvider?: () => boolean;
}

// ─────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────

/**
 * AIGOS HTTP header names
 */
export const A2A_HEADERS = {
  /** Token header */
  TOKEN: "X-AIGOS-Token",
  /** Protocol version header */
  PROTOCOL_VERSION: "X-AIGOS-Protocol-Version",
  /** Request ID header */
  REQUEST_ID: "X-AIGOS-Request-ID",
} as const;

/**
 * Current protocol version
 */
export const A2A_PROTOCOL_VERSION = "1.0";

/**
 * JWT type header value
 */
export const JWT_TYPE = "AIGOS-GOV+jwt";

/**
 * Default token TTL in seconds
 */
export const DEFAULT_TOKEN_TTL_SECONDS = 300; // 5 minutes

/**
 * Maximum allowed clock skew in seconds
 */
export const DEFAULT_MAX_CLOCK_SKEW_SECONDS = 60;
