/**
 * A2A HTTP Middleware (AIGOS-908, AIGOS-909)
 *
 * Provides easy-to-use middleware for HTTP clients and servers
 * to handle A2A authentication automatically.
 */

import type { RuntimeIdentity, GovernanceTokenPayload } from "@aigrc/core";

import type {
  TokenGenerator,
  TokenValidator,
  A2ARequest,
  A2AResponse,
  ClientMiddlewareConfig,
  ServerMiddlewareConfig,
  HandshakeResult,
  A2AEvent,
  A2AEventHandler,
} from "./types.js";

import { A2A_HEADERS, A2A_PROTOCOL_VERSION } from "./types.js";
import {
  InboundPolicyChecker,
  OutboundPolicyChecker,
  DEFAULT_INBOUND_POLICY,
  DEFAULT_OUTBOUND_POLICY,
} from "./policy.js";

// ─────────────────────────────────────────────────────────────────
// CLIENT MIDDLEWARE
// ─────────────────────────────────────────────────────────────────

/**
 * A2A Client Middleware
 *
 * Wraps fetch/HTTP clients to automatically handle AIGOS token
 * generation and response validation.
 */
export class A2AClientMiddleware {
  private tokenGenerator: TokenGenerator;
  private tokenValidator?: TokenValidator;
  private policy: OutboundPolicyChecker;
  private customHeaders: Record<string, string>;
  private identity: RuntimeIdentity;
  private eventHandlers: A2AEventHandler[] = [];

  // State providers
  private killSwitchStateProvider: () => {
    enabled: boolean;
    channel: "sse" | "polling" | "file";
  };
  private pausedStateProvider: () => boolean;
  private terminationPendingStateProvider: () => boolean;

  constructor(
    identity: RuntimeIdentity,
    config: ClientMiddlewareConfig,
    stateProviders?: {
      killSwitchStateProvider?: () => {
        enabled: boolean;
        channel: "sse" | "polling" | "file";
      };
      pausedStateProvider?: () => boolean;
      terminationPendingStateProvider?: () => boolean;
    }
  ) {
    this.identity = identity;
    this.tokenGenerator = config.tokenGenerator;
    this.tokenValidator = config.tokenValidator;
    this.policy = new OutboundPolicyChecker(
      config.policy,
      identity.instance_id
    );
    this.customHeaders = config.customHeaders ?? {};

    this.killSwitchStateProvider =
      stateProviders?.killSwitchStateProvider ??
      (() => ({ enabled: true, channel: "sse" as const }));
    this.pausedStateProvider =
      stateProviders?.pausedStateProvider ?? (() => false);
    this.terminationPendingStateProvider =
      stateProviders?.terminationPendingStateProvider ?? (() => false);
  }

  /**
   * Wrap a fetch request with A2A authentication
   */
  async fetch(
    input: string | URL | Request,
    init?: globalThis.RequestInit
  ): Promise<globalThis.Response> {
    const url = typeof input === "string" ? input : input.toString();

    // Parse domain
    let domain: string;
    try {
      const urlObj = new URL(url);
      domain = urlObj.hostname;
    } catch {
      throw new Error(`Invalid URL: ${url}`);
    }

    // Pre-flight check
    const preFlightResult = this.policy.checkPreFlight({
      url,
      domain,
    });

    if (!preFlightResult.allowed) {
      throw new A2AError(
        "POLICY_VIOLATION",
        preFlightResult.reason ?? "Outbound request blocked by policy"
      );
    }

    // Generate token
    const generated = await this.tokenGenerator.generate({
      identity: this.identity,
      audience: domain,
      killSwitch: this.killSwitchStateProvider(),
      paused: this.pausedStateProvider(),
      terminationPending: this.terminationPendingStateProvider(),
    });

    // Prepare headers
    const headers = new Headers(init?.headers);
    headers.set(A2A_HEADERS.TOKEN, generated.token);
    headers.set(A2A_HEADERS.PROTOCOL_VERSION, A2A_PROTOCOL_VERSION);
    headers.set(A2A_HEADERS.REQUEST_ID, generated.jti);

    // Add custom headers
    for (const [key, value] of Object.entries(this.customHeaders)) {
      headers.set(key, value);
    }

    // Make the request
    const response = await fetch(input, {
      ...init,
      headers,
    });

    // Validate response token if configured
    if (this.tokenValidator && this.policy.getPolicy().validateResponseTokens) {
      const responseToken = response.headers.get(A2A_HEADERS.TOKEN);

      if (responseToken) {
        const validationResult = await this.tokenValidator.validate(
          responseToken
        );

        if (!validationResult.valid) {
          throw new A2AError(
            validationResult.errorCode ?? "INVALID_FORMAT",
            validationResult.errorMessage ?? "Response token validation failed"
          );
        }

        // Check target policy
        const targetResult = await this.policy.checkTarget(
          { url, domain, targetIdentity: validationResult.payload },
          validationResult.payload!
        );

        if (!targetResult.allowed) {
          throw new A2AError(
            targetResult.code ?? "POLICY_VIOLATION",
            targetResult.reason ?? "Target policy violation"
          );
        }
      }
    }

    return response;
  }

  /**
   * Create a wrapped fetch function
   */
  createFetch(): (input: string | URL | Request, init?: globalThis.RequestInit) => Promise<globalThis.Response> {
    return (input: string | URL | Request, init?: globalThis.RequestInit) =>
      this.fetch(input, init);
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
}

// ─────────────────────────────────────────────────────────────────
// SERVER MIDDLEWARE
// ─────────────────────────────────────────────────────────────────

/**
 * A2A Server Middleware
 *
 * Validates incoming AIGOS tokens and generates response tokens.
 * Can be integrated with Express, Fastify, or any HTTP framework.
 */
export class A2AServerMiddleware {
  private tokenValidator: TokenValidator;
  private tokenGenerator: TokenGenerator;
  private policy: InboundPolicyChecker;
  private excludePaths: Set<string>;
  private identity: RuntimeIdentity;
  private eventHandlers: A2AEventHandler[] = [];

  // State providers
  private killSwitchStateProvider: () => {
    enabled: boolean;
    channel: "sse" | "polling" | "file";
  };
  private pausedStateProvider: () => boolean;
  private terminationPendingStateProvider: () => boolean;

  // Custom error handler
  private onError?: (error: HandshakeResult, req: A2ARequest) => A2AResponse;

  constructor(
    identity: RuntimeIdentity,
    config: ServerMiddlewareConfig,
    stateProviders?: {
      killSwitchStateProvider?: () => {
        enabled: boolean;
        channel: "sse" | "polling" | "file";
      };
      pausedStateProvider?: () => boolean;
      terminationPendingStateProvider?: () => boolean;
    }
  ) {
    this.identity = identity;
    this.tokenValidator = config.tokenValidator;
    this.tokenGenerator = config.tokenGenerator;
    this.policy = new InboundPolicyChecker(config.policy);
    this.excludePaths = new Set(config.excludePaths ?? []);
    this.onError = config.onError;

    this.killSwitchStateProvider =
      stateProviders?.killSwitchStateProvider ??
      (() => ({ enabled: true, channel: "sse" as const }));
    this.pausedStateProvider =
      stateProviders?.pausedStateProvider ?? (() => false);
    this.terminationPendingStateProvider =
      stateProviders?.terminationPendingStateProvider ?? (() => false);
  }

  /**
   * Process an incoming request
   *
   * Returns the validated identity and response headers,
   * or an error response if validation fails.
   */
  async processRequest(req: A2ARequest): Promise<{
    success: boolean;
    identity?: GovernanceTokenPayload;
    responseHeaders: Record<string, string>;
    errorResponse?: A2AResponse;
  }> {
    // Check if path is excluded
    const path = new URL(req.url, "http://localhost").pathname;
    if (this.excludePaths.has(path)) {
      return {
        success: true,
        responseHeaders: {},
      };
    }

    // Extract token
    const tokenHeader = req.headers[A2A_HEADERS.TOKEN];
    const token = Array.isArray(tokenHeader) ? tokenHeader[0] : tokenHeader;

    // Check if token is required
    if (!token) {
      if (this.policy.getPolicy().requireToken) {
        const errorResult: HandshakeResult = {
          success: false,
          errorCode: "MISSING_CLAIMS",
          errorMessage: "AIGOS token required",
        };

        if (this.onError) {
          return {
            success: false,
            responseHeaders: {},
            errorResponse: this.onError(errorResult, req),
          };
        }

        return {
          success: false,
          responseHeaders: {},
          errorResponse: {
            status: 401,
            headers: { "Content-Type": "application/json" },
            body: {
              error: "AIGOS_TOKEN_REQUIRED",
              message: "AIGOS token required",
            },
          },
        };
      }

      // No token but not required
      return {
        success: true,
        responseHeaders: await this.generateResponseHeaders(),
      };
    }

    // Validate token
    const validationResult = await this.tokenValidator.validate(token);

    if (!validationResult.valid) {
      const errorResult: HandshakeResult = {
        success: false,
        errorCode: validationResult.errorCode,
        errorMessage: validationResult.errorMessage,
      };

      if (this.onError) {
        return {
          success: false,
          responseHeaders: {},
          errorResponse: this.onError(errorResult, req),
        };
      }

      return {
        success: false,
        responseHeaders: {},
        errorResponse: {
          status: 401,
          headers: { "Content-Type": "application/json" },
          body: {
            error: validationResult.errorCode,
            message: validationResult.errorMessage,
          },
        },
      };
    }

    const inboundIdentity = validationResult.payload!;

    // Check inbound policy
    const context = {
      headers: req.headers,
      method: req.method,
      path,
      timestamp: new Date(),
    };

    const policyResult = await this.policy.check(inboundIdentity, context);

    if (!policyResult.allowed) {
      const errorResult: HandshakeResult = {
        success: false,
        errorCode: "POLICY_VIOLATION",
        errorMessage: policyResult.reason,
        policyViolations: [policyResult],
      };

      if (this.onError) {
        return {
          success: false,
          responseHeaders: {},
          errorResponse: this.onError(errorResult, req),
        };
      }

      return {
        success: false,
        responseHeaders: {},
        errorResponse: {
          status: 403,
          headers: { "Content-Type": "application/json" },
          body: {
            error: policyResult.code,
            message: policyResult.reason,
          },
        },
      };
    }

    // Generate response headers
    const responseHeaders = await this.generateResponseHeaders(
      inboundIdentity.sub
    );

    return {
      success: true,
      identity: inboundIdentity,
      responseHeaders,
    };
  }

  /**
   * Create Express middleware
   */
  createExpressMiddleware(): (
    req: Express.Request,
    res: Express.Response,
    next: () => void
  ) => Promise<void> {
    return async (req, res, next) => {
      const a2aReq: A2ARequest = {
        headers: req.headers as Record<string, string | string[] | undefined>,
        method: req.method,
        url: req.url,
      };

      const result = await this.processRequest(a2aReq);

      if (!result.success && result.errorResponse) {
        res.status(result.errorResponse.status);
        for (const [key, value] of Object.entries(
          result.errorResponse.headers
        )) {
          res.setHeader(key, value);
        }
        res.json(result.errorResponse.body);
        return;
      }

      // Add response headers
      for (const [key, value] of Object.entries(result.responseHeaders)) {
        res.setHeader(key, value);
      }

      // Attach identity to request
      if (result.identity) {
        (req as Express.Request & { aigosIdentity?: GovernanceTokenPayload }).aigosIdentity =
          result.identity;
      }

      next();
    };
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

  private async generateResponseHeaders(
    requestingAgent?: string
  ): Promise<Record<string, string>> {
    const generated = await this.tokenGenerator.generate({
      identity: this.identity,
      audience: requestingAgent ?? "aigos-agents",
      killSwitch: this.killSwitchStateProvider(),
      paused: this.pausedStateProvider(),
      terminationPending: this.terminationPendingStateProvider(),
    });

    return {
      [A2A_HEADERS.TOKEN]: generated.token,
      [A2A_HEADERS.PROTOCOL_VERSION]: A2A_PROTOCOL_VERSION,
    };
  }
}

// ─────────────────────────────────────────────────────────────────
// ERROR CLASS
// ─────────────────────────────────────────────────────────────────

/**
 * A2A Error
 */
export class A2AError extends Error {
  code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = "A2AError";
    this.code = code;
  }
}

// ─────────────────────────────────────────────────────────────────
// TYPE DECLARATIONS
// ─────────────────────────────────────────────────────────────────

declare namespace Express {
  interface Request {
    headers: Record<string, string | string[] | undefined>;
    method: string;
    url: string;
  }
  interface Response {
    status(code: number): Response;
    setHeader(name: string, value: string): void;
    json(body: unknown): void;
  }
}

// ─────────────────────────────────────────────────────────────────
// FACTORY FUNCTIONS
// ─────────────────────────────────────────────────────────────────

/**
 * Create an A2A client middleware
 */
export function createClientMiddleware(
  identity: RuntimeIdentity,
  config: ClientMiddlewareConfig,
  stateProviders?: {
    killSwitchStateProvider?: () => {
      enabled: boolean;
      channel: "sse" | "polling" | "file";
    };
    pausedStateProvider?: () => boolean;
    terminationPendingStateProvider?: () => boolean;
  }
): A2AClientMiddleware {
  return new A2AClientMiddleware(identity, config, stateProviders);
}

/**
 * Create an A2A server middleware
 */
export function createServerMiddleware(
  identity: RuntimeIdentity,
  config: ServerMiddlewareConfig,
  stateProviders?: {
    killSwitchStateProvider?: () => {
      enabled: boolean;
      channel: "sse" | "polling" | "file";
    };
    pausedStateProvider?: () => boolean;
    terminationPendingStateProvider?: () => boolean;
  }
): A2AServerMiddleware {
  return new A2AServerMiddleware(identity, config, stateProviders);
}
