/**
 * A2A Manager (AIGOS-E9)
 *
 * High-level API for managing A2A (agent-to-agent) authentication.
 * Combines token generation, validation, policy enforcement, and handshakes.
 */

import type { RuntimeIdentity, GovernanceTokenPayload } from "@aigrc/core";

import type {
  A2AManagerConfig,
  TokenGenerator,
  TokenValidator,
  GenerateTokenOptions,
  GeneratedToken,
  TokenValidationResult,
  HandshakeResult,
  A2ARequestContext,
  A2AEvent,
  A2AEventHandler,
  InboundA2APolicy,
  OutboundA2APolicy,
  SigningKey,
} from "./types.js";

import { A2A_HEADERS, A2A_PROTOCOL_VERSION, DEFAULT_TOKEN_TTL_SECONDS } from "./types.js";
import { A2ATokenGenerator } from "./token-generator.js";
import { A2ATokenValidator } from "./token-validator.js";
import {
  InboundPolicyChecker,
  OutboundPolicyChecker,
  DEFAULT_INBOUND_POLICY,
  DEFAULT_OUTBOUND_POLICY,
} from "./policy.js";
import { A2AHandshakeHandler } from "./handshake.js";
import { A2AClientMiddleware, A2AServerMiddleware, A2AError } from "./middleware.js";

// ─────────────────────────────────────────────────────────────────
// A2A MANAGER CLASS
// ─────────────────────────────────────────────────────────────────

/**
 * A2A Manager
 *
 * Central management class for all A2A functionality.
 * Provides a simplified API for common A2A operations.
 */
export class A2AManager {
  private identity: RuntimeIdentity;
  private tokenGenerator: A2ATokenGenerator;
  private tokenValidator: A2ATokenValidator;
  private inboundPolicy: InboundPolicyChecker;
  private outboundPolicy: OutboundPolicyChecker;
  private handshakeHandler: A2AHandshakeHandler;
  private eventHandlers: A2AEventHandler[] = [];

  // State providers
  private killSwitchStateProvider: () => {
    enabled: boolean;
    channel: "sse" | "polling" | "file";
  };
  private pausedStateProvider: () => boolean;
  private terminationPendingStateProvider: () => boolean;

  constructor(config: A2AManagerConfig) {
    this.identity = config.identity;

    // Validate signing key
    if (
      !config.tokenGeneratorConfig.signingKey?.secret &&
      !config.tokenGeneratorConfig.signingKey?.privateKey
    ) {
      throw new Error("A2AManager requires a signing key configuration");
    }

    // Create token generator
    this.tokenGenerator = new A2ATokenGenerator({
      signingKey: config.tokenGeneratorConfig.signingKey!,
      defaultTtlSeconds:
        config.tokenGeneratorConfig.defaultTtlSeconds ?? DEFAULT_TOKEN_TTL_SECONDS,
      issuer: config.tokenGeneratorConfig.issuer ?? "aigos-runtime",
      defaultAudience: config.tokenGeneratorConfig.defaultAudience ?? "aigos-agents",
      includeControlClaims: config.tokenGeneratorConfig.includeControlClaims ?? true,
      includeCapabilityHash: config.tokenGeneratorConfig.includeCapabilityHash ?? true,
    });

    // Create token validator
    this.tokenValidator = new A2ATokenValidator({
      trustedKeys: config.tokenValidatorConfig.trustedKeys ?? new Map(),
      jwksEndpoint: config.tokenValidatorConfig.jwksEndpoint,
      maxClockSkewSeconds: config.tokenValidatorConfig.maxClockSkewSeconds ?? 60,
      requiredIssuer: config.tokenValidatorConfig.requiredIssuer ?? "aigos-runtime",
      requiredAudience: config.tokenValidatorConfig.requiredAudience ?? ["aigos-agents"],
      validateControlClaims: config.tokenValidatorConfig.validateControlClaims ?? true,
      rejectPausedAgents: config.tokenValidatorConfig.rejectPausedAgents ?? true,
      rejectTerminationPending: config.tokenValidatorConfig.rejectTerminationPending ?? true,
    });

    // Create policy checkers
    this.inboundPolicy = new InboundPolicyChecker({
      ...DEFAULT_INBOUND_POLICY,
      ...config.inboundPolicy,
    });

    this.outboundPolicy = new OutboundPolicyChecker(
      {
        ...DEFAULT_OUTBOUND_POLICY,
        ...config.outboundPolicy,
      },
      config.identity.instance_id
    );

    // State providers
    this.killSwitchStateProvider =
      config.killSwitchStateProvider ??
      (() => ({ enabled: true, channel: "sse" as const }));
    this.pausedStateProvider = config.pausedStateProvider ?? (() => false);
    this.terminationPendingStateProvider =
      config.terminationPendingStateProvider ?? (() => false);

    // Create handshake handler
    this.handshakeHandler = new A2AHandshakeHandler({
      identity: config.identity,
      tokenGenerator: this.tokenGenerator,
      tokenValidator: this.tokenValidator,
      inboundPolicy: this.inboundPolicy,
      outboundPolicy: this.outboundPolicy,
      killSwitchStateProvider: this.killSwitchStateProvider,
      pausedStateProvider: this.pausedStateProvider,
      terminationPendingStateProvider: this.terminationPendingStateProvider,
    });

    // Forward events from components
    this.tokenGenerator.onEvent((e) => this.emitEvent(e));
    this.tokenValidator.onEvent((e) => this.emitEvent(e));
    this.inboundPolicy.onEvent((e) => this.emitEvent(e));
    this.outboundPolicy.onEvent((e) => this.emitEvent(e));
    this.handshakeHandler.onEvent((e) => this.emitEvent(e));
  }

  // ─────────────────────────────────────────────────────────────────
  // TOKEN OPERATIONS
  // ─────────────────────────────────────────────────────────────────

  /**
   * Generate a governance token
   */
  async generateToken(options?: Partial<GenerateTokenOptions>): Promise<GeneratedToken> {
    return this.tokenGenerator.generate({
      identity: this.identity,
      killSwitch: this.killSwitchStateProvider(),
      paused: this.pausedStateProvider(),
      terminationPending: this.terminationPendingStateProvider(),
      ...options,
    });
  }

  /**
   * Validate a governance token
   */
  async validateToken(token: string): Promise<TokenValidationResult> {
    return this.tokenValidator.validate(token);
  }

  /**
   * Add a trusted key for token validation
   */
  addTrustedKey(key: SigningKey): void {
    this.tokenValidator.addTrustedKey(key);
  }

  /**
   * Remove a trusted key
   */
  removeTrustedKey(kid: string): void {
    this.tokenValidator.removeTrustedKey(kid);
  }

  /**
   * Refresh keys from JWKS endpoint
   */
  async refreshKeys(): Promise<void> {
    await this.tokenValidator.refreshKeys?.();
  }

  // ─────────────────────────────────────────────────────────────────
  // HANDSHAKE OPERATIONS
  // ─────────────────────────────────────────────────────────────────

  /**
   * Handle an inbound request (server side)
   */
  async handleInboundRequest(context: A2ARequestContext): Promise<HandshakeResult> {
    return this.handshakeHandler.handleInbound(context);
  }

  /**
   * Prepare headers for an outbound request (client side)
   */
  async prepareOutboundRequest(targetUrl: string): Promise<{
    headers: Record<string, string>;
    allowed: boolean;
    reason?: string;
  }> {
    const result = await this.handshakeHandler.prepareOutbound(targetUrl);
    return {
      headers: result.headers,
      allowed: result.preFlight.allowed,
      reason: result.preFlight.reason,
    };
  }

  /**
   * Validate an outbound response
   */
  async validateOutboundResponse(
    targetUrl: string,
    responseHeaders: Record<string, string | string[] | undefined>
  ): Promise<HandshakeResult> {
    return this.handshakeHandler.validateOutboundResponse(targetUrl, responseHeaders);
  }

  // ─────────────────────────────────────────────────────────────────
  // POLICY OPERATIONS
  // ─────────────────────────────────────────────────────────────────

  /**
   * Update inbound policy
   */
  updateInboundPolicy(updates: Partial<InboundA2APolicy>): void {
    this.inboundPolicy.updatePolicy(updates);
  }

  /**
   * Update outbound policy
   */
  updateOutboundPolicy(updates: Partial<OutboundA2APolicy>): void {
    this.outboundPolicy.updatePolicy(updates);
  }

  /**
   * Get current inbound policy
   */
  getInboundPolicy(): InboundA2APolicy {
    return this.inboundPolicy.getPolicy();
  }

  /**
   * Get current outbound policy
   */
  getOutboundPolicy(): OutboundA2APolicy {
    return this.outboundPolicy.getPolicy();
  }

  // ─────────────────────────────────────────────────────────────────
  // MIDDLEWARE FACTORIES
  // ─────────────────────────────────────────────────────────────────

  /**
   * Create a client middleware for HTTP requests
   */
  createClientMiddleware(): A2AClientMiddleware {
    return new A2AClientMiddleware(
      this.identity,
      {
        tokenGenerator: this.tokenGenerator,
        tokenValidator: this.tokenValidator,
        policy: this.outboundPolicy.getPolicy(),
      },
      {
        killSwitchStateProvider: this.killSwitchStateProvider,
        pausedStateProvider: this.pausedStateProvider,
        terminationPendingStateProvider: this.terminationPendingStateProvider,
      }
    );
  }

  /**
   * Create a server middleware for HTTP requests
   */
  createServerMiddleware(options?: {
    excludePaths?: string[];
    onError?: (error: HandshakeResult, req: { headers: Record<string, string | string[] | undefined>; method: string; url: string }) => {
      status: number;
      headers: Record<string, string>;
      body?: unknown;
    };
  }): A2AServerMiddleware {
    return new A2AServerMiddleware(
      this.identity,
      {
        tokenValidator: this.tokenValidator,
        tokenGenerator: this.tokenGenerator,
        policy: this.inboundPolicy.getPolicy(),
        excludePaths: options?.excludePaths,
        onError: options?.onError,
      },
      {
        killSwitchStateProvider: this.killSwitchStateProvider,
        pausedStateProvider: this.pausedStateProvider,
        terminationPendingStateProvider: this.terminationPendingStateProvider,
      }
    );
  }

  /**
   * Create a wrapped fetch function with A2A authentication
   */
  createA2AFetch(): typeof fetch {
    return this.createClientMiddleware().createFetch();
  }

  // ─────────────────────────────────────────────────────────────────
  // IDENTITY MANAGEMENT
  // ─────────────────────────────────────────────────────────────────

  /**
   * Update the identity (e.g., after mode change)
   */
  updateIdentity(identity: RuntimeIdentity): void {
    this.identity = identity;
    this.handshakeHandler.updateIdentity(identity);
  }

  /**
   * Get current identity
   */
  getIdentity(): RuntimeIdentity {
    return this.identity;
  }

  // ─────────────────────────────────────────────────────────────────
  // EVENT HANDLING
  // ─────────────────────────────────────────────────────────────────

  /**
   * Register an event handler
   */
  onEvent(handler: A2AEventHandler): () => void {
    this.eventHandlers.push(handler);
    return () => {
      const index = this.eventHandlers.indexOf(handler);
      if (index >= 0) {
        this.eventHandlers.splice(index, 1);
      }
    };
  }

  private emitEvent(event: A2AEvent): void {
    for (const handler of this.eventHandlers) {
      try {
        handler(event);
      } catch (error) {
        console.error("A2A event handler error:", error);
      }
    }
  }

  // ─────────────────────────────────────────────────────────────────
  // STATIC UTILITIES
  // ─────────────────────────────────────────────────────────────────

  /**
   * Extract AIGOS headers from a request
   */
  static extractHeaders(
    headers: Record<string, string | string[] | undefined>
  ): {
    token?: string;
    protocolVersion?: string;
    requestId?: string;
  } {
    const getHeader = (name: string): string | undefined => {
      const value = headers[name] ?? headers[name.toLowerCase()];
      return Array.isArray(value) ? value[0] : value;
    };

    return {
      token: getHeader(A2A_HEADERS.TOKEN),
      protocolVersion: getHeader(A2A_HEADERS.PROTOCOL_VERSION),
      requestId: getHeader(A2A_HEADERS.REQUEST_ID),
    };
  }

  /**
   * Check if a request has AIGOS authentication
   */
  static hasA2AAuth(
    headers: Record<string, string | string[] | undefined>
  ): boolean {
    return !!A2AManager.extractHeaders(headers).token;
  }
}

// ─────────────────────────────────────────────────────────────────
// FACTORY FUNCTION
// ─────────────────────────────────────────────────────────────────

/**
 * Create an A2A Manager
 */
export function createA2AManager(config: A2AManagerConfig): A2AManager {
  return new A2AManager(config);
}

// Re-export error class
export { A2AError };
