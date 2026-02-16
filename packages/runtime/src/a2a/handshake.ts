/**
 * A2A Handshake Protocol (AIGOS-903, AIGOS-904)
 *
 * Implements the AIGOS mutual authentication handshake between agents.
 * - Client side: Include token in request, validate response token
 * - Server side: Validate incoming token, include response token
 */

import type { RuntimeIdentity, GovernanceTokenPayload } from "@aigrc/core";

import type {
  TokenGenerator,
  TokenValidator,
  HandshakeResult,
  A2ARequestContext,
  A2AEvent,
  A2AEventHandler,
} from "./types.js";

import { A2A_HEADERS, A2A_PROTOCOL_VERSION } from "./types.js";
import { InboundPolicyChecker, OutboundPolicyChecker } from "./policy.js";

// ─────────────────────────────────────────────────────────────────
// HANDSHAKE HANDLER
// ─────────────────────────────────────────────────────────────────

/**
 * A2A Handshake Handler
 *
 * Handles both inbound and outbound AIGOS handshakes.
 */
export class A2AHandshakeHandler {
  private identity: RuntimeIdentity;
  private tokenGenerator: TokenGenerator;
  private tokenValidator: TokenValidator;
  private inboundPolicy: InboundPolicyChecker;
  private outboundPolicy: OutboundPolicyChecker;
  private eventHandlers: A2AEventHandler[] = [];

  // State providers (injected)
  private killSwitchStateProvider: () => {
    enabled: boolean;
    channel: "sse" | "polling" | "file";
  };
  private pausedStateProvider: () => boolean;
  private terminationPendingStateProvider: () => boolean;

  constructor(config: {
    identity: RuntimeIdentity;
    tokenGenerator: TokenGenerator;
    tokenValidator: TokenValidator;
    inboundPolicy: InboundPolicyChecker;
    outboundPolicy: OutboundPolicyChecker;
    killSwitchStateProvider?: () => {
      enabled: boolean;
      channel: "sse" | "polling" | "file";
    };
    pausedStateProvider?: () => boolean;
    terminationPendingStateProvider?: () => boolean;
  }) {
    this.identity = config.identity;
    this.tokenGenerator = config.tokenGenerator;
    this.tokenValidator = config.tokenValidator;
    this.inboundPolicy = config.inboundPolicy;
    this.outboundPolicy = config.outboundPolicy;

    this.killSwitchStateProvider =
      config.killSwitchStateProvider ??
      (() => ({ enabled: true, channel: "sse" as const }));
    this.pausedStateProvider = config.pausedStateProvider ?? (() => false);
    this.terminationPendingStateProvider =
      config.terminationPendingStateProvider ?? (() => false);
  }

  /**
   * Handle an inbound handshake request
   *
   * This is called when another agent makes a request to this agent.
   * Returns a HandshakeResult with the validated identity and response token.
   */
  async handleInbound(context: A2ARequestContext): Promise<HandshakeResult> {
    this.emitEvent({
      type: "handshake.started",
      timestamp: new Date().toISOString(),
      instanceId: this.identity.instance_id,
      direction: "inbound",
    });

    // Extract token from request headers
    const tokenHeader = context.headers[A2A_HEADERS.TOKEN];
    const token = Array.isArray(tokenHeader) ? tokenHeader[0] : tokenHeader;

    if (!token) {
      // Check if policy requires a token
      if (this.inboundPolicy.getPolicy().requireToken) {
        return this.inboundFailure("MISSING_CLAIMS", "AIGOS token required");
      }
      // No token but not required - allow without validation
      return {
        success: true,
        responseToken: await this.generateResponseToken(),
      };
    }

    // Validate the incoming token
    const validationResult = await this.tokenValidator.validate(token);

    if (!validationResult.valid) {
      return this.inboundFailure(
        validationResult.errorCode ?? "INVALID_FORMAT",
        validationResult.errorMessage ?? "Token validation failed"
      );
    }

    const inboundIdentity = validationResult.payload!;

    // Check inbound policy
    const policyResult = await this.inboundPolicy.check(inboundIdentity, context);

    if (!policyResult.allowed) {
      return {
        success: false,
        errorCode: "POLICY_VIOLATION",
        errorMessage: policyResult.reason ?? "Inbound policy violation",
        policyViolations: [policyResult],
      };
    }

    // Generate response token
    const responseToken = await this.generateResponseToken(inboundIdentity.sub);

    this.emitEvent({
      type: "handshake.completed",
      timestamp: new Date().toISOString(),
      instanceId: this.identity.instance_id,
      direction: "inbound",
      peerInstanceId: inboundIdentity.aigos.identity.instance_id,
      peerAssetId: inboundIdentity.aigos.identity.asset_id,
    });

    return {
      success: true,
      inboundIdentity,
      responseToken,
    };
  }

  /**
   * Prepare an outbound request
   *
   * This is called when this agent wants to make a request to another agent.
   * Returns headers to include in the request.
   */
  async prepareOutbound(targetUrl: string): Promise<{
    headers: Record<string, string>;
    preFlight: { allowed: boolean; reason?: string };
  }> {
    this.emitEvent({
      type: "handshake.started",
      timestamp: new Date().toISOString(),
      instanceId: this.identity.instance_id,
      direction: "outbound",
      targetUrl,
    });

    // Parse target domain
    let domain: string;
    try {
      const url = new URL(targetUrl);
      domain = url.hostname;
    } catch {
      domain = targetUrl;
    }

    // Check pre-flight policy
    const preFlightResult = this.outboundPolicy.checkPreFlight({
      url: targetUrl,
      domain,
    });

    if (!preFlightResult.allowed) {
      return {
        headers: {},
        preFlight: {
          allowed: false,
          reason: preFlightResult.reason,
        },
      };
    }

    // Generate outbound token
    const generated = await this.tokenGenerator.generate({
      identity: this.identity,
      audience: domain,
      killSwitch: this.killSwitchStateProvider(),
      paused: this.pausedStateProvider(),
      terminationPending: this.terminationPendingStateProvider(),
    });

    return {
      headers: {
        [A2A_HEADERS.TOKEN]: generated.token,
        [A2A_HEADERS.PROTOCOL_VERSION]: A2A_PROTOCOL_VERSION,
        [A2A_HEADERS.REQUEST_ID]: generated.jti,
      },
      preFlight: { allowed: true },
    };
  }

  /**
   * Validate an outbound response
   *
   * This is called after receiving a response from another agent.
   * Validates the response token and checks outbound policy.
   */
  async validateOutboundResponse(
    targetUrl: string,
    responseHeaders: Record<string, string | string[] | undefined>
  ): Promise<HandshakeResult> {
    // Extract response token
    const tokenHeader = responseHeaders[A2A_HEADERS.TOKEN];
    const token = Array.isArray(tokenHeader) ? tokenHeader[0] : tokenHeader;

    if (!token) {
      // No response token - check if validation is required
      if (this.outboundPolicy.getPolicy().validateResponseTokens) {
        return this.outboundFailure(
          "MISSING_CLAIMS",
          "Response token required but not provided"
        );
      }
      return { success: true };
    }

    // Validate the response token
    const validationResult = await this.tokenValidator.validate(token);

    if (!validationResult.valid) {
      return this.outboundFailure(
        validationResult.errorCode ?? "INVALID_FORMAT",
        validationResult.errorMessage ?? "Response token validation failed"
      );
    }

    const responseIdentity = validationResult.payload!;

    // Parse target domain
    let domain: string;
    try {
      const url = new URL(targetUrl);
      domain = url.hostname;
    } catch {
      domain = targetUrl;
    }

    // Check outbound policy against response identity
    const policyResult = await this.outboundPolicy.checkTarget(
      {
        url: targetUrl,
        domain,
        targetIdentity: responseIdentity,
      },
      responseIdentity
    );

    if (!policyResult.allowed) {
      return {
        success: false,
        errorCode: "POLICY_VIOLATION",
        errorMessage: policyResult.reason ?? "Outbound policy violation",
        policyViolations: [policyResult],
      };
    }

    this.emitEvent({
      type: "handshake.completed",
      timestamp: new Date().toISOString(),
      instanceId: this.identity.instance_id,
      direction: "outbound",
      peerInstanceId: responseIdentity.aigos.identity.instance_id,
      peerAssetId: responseIdentity.aigos.identity.asset_id,
    });

    return {
      success: true,
      inboundIdentity: responseIdentity,
    };
  }

  /**
   * Update identity (e.g., after mode change)
   */
  updateIdentity(identity: RuntimeIdentity): void {
    this.identity = identity;
  }

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

  private async generateResponseToken(
    requestingAgent?: string
  ): Promise<string> {
    const generated = await this.tokenGenerator.generate({
      identity: this.identity,
      audience: requestingAgent ?? "aigos-agents",
      killSwitch: this.killSwitchStateProvider(),
      paused: this.pausedStateProvider(),
      terminationPending: this.terminationPendingStateProvider(),
    });
    return generated.token;
  }

  private inboundFailure(
    errorCode: string,
    errorMessage: string
  ): HandshakeResult {
    this.emitEvent({
      type: "handshake.failed",
      timestamp: new Date().toISOString(),
      instanceId: this.identity.instance_id,
      direction: "inbound",
      errorCode,
      errorMessage,
    });

    return {
      success: false,
      errorCode: errorCode as HandshakeResult["errorCode"],
      errorMessage,
    };
  }

  private outboundFailure(
    errorCode: string,
    errorMessage: string
  ): HandshakeResult {
    this.emitEvent({
      type: "handshake.failed",
      timestamp: new Date().toISOString(),
      instanceId: this.identity.instance_id,
      direction: "outbound",
      errorCode,
      errorMessage,
    });

    return {
      success: false,
      errorCode: errorCode as HandshakeResult["errorCode"],
      errorMessage,
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
}

// ─────────────────────────────────────────────────────────────────
// FACTORY FUNCTION
// ─────────────────────────────────────────────────────────────────

/**
 * Create an A2A handshake handler
 */
export function createHandshakeHandler(config: {
  identity: RuntimeIdentity;
  tokenGenerator: TokenGenerator;
  tokenValidator: TokenValidator;
  inboundPolicy: InboundPolicyChecker;
  outboundPolicy: OutboundPolicyChecker;
  killSwitchStateProvider?: () => {
    enabled: boolean;
    channel: "sse" | "polling" | "file";
  };
  pausedStateProvider?: () => boolean;
  terminationPendingStateProvider?: () => boolean;
}): A2AHandshakeHandler {
  return new A2AHandshakeHandler(config);
}
