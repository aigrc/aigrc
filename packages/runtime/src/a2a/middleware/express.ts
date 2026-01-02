/**
 * Express Middleware - SPEC-PRT-003
 *
 * Middleware for automatic A2A authentication with Express.js.
 */

import type {
  IGovernanceTokenGenerator,
  TokenGenerationInput,
  TokenGenerationOptions,
  GovernanceTokenPayload,
} from "../token/generator.js";
import type {
  IGovernanceTokenValidator,
  TokenValidationOptions,
} from "../token/validator.js";
import type { IA2AInboundPolicy } from "../policy/inbound.js";
import {
  AIGOS_TOKEN_HEADER,
  AIGOS_PROTOCOL_VERSION_HEADER,
  AIGOS_PROTOCOL_VERSION,
} from "../handshake/client.js";

/**
 * Express-compatible request type
 */
export interface AigosExpressRequest {
  headers: Record<string, string | string[] | undefined>;
  method?: string;
  url?: string;
  path?: string;
  aigos?: {
    valid: boolean;
    payload?: GovernanceTokenPayload;
    error?: string;
  };
}

/**
 * Express-compatible response type
 */
export interface AigosExpressResponse {
  status(code: number): this;
  json(body: unknown): this;
  setHeader(name: string, value: string): this;
  set(name: string, value: string): this;
  headersSent?: boolean;
}

/**
 * Express-compatible next function
 */
export type AigosExpressNextFunction = (error?: unknown) => void;

/**
 * Express middleware function type
 */
export type AigosExpressMiddleware = (
  req: AigosExpressRequest,
  res: AigosExpressResponse,
  next: AigosExpressNextFunction
) => void | Promise<void>;

/**
 * Configuration for Express middleware
 */
export interface ExpressMiddlewareConfig {
  /** Token generator for response tokens */
  tokenGenerator: IGovernanceTokenGenerator;
  /** Token validator for incoming tokens */
  tokenValidator: IGovernanceTokenValidator;
  /** Input for generating response tokens */
  tokenInput: TokenGenerationInput;
  /** Options for token generation */
  tokenOptions?: TokenGenerationOptions;
  /** Options for validating incoming tokens */
  validationOptions?: TokenValidationOptions;
  /** Optional inbound policy */
  inboundPolicy?: IA2AInboundPolicy;
  /** Paths to skip authentication (supports glob patterns) */
  skipPaths?: string[];
  /** Custom error handler */
  onError?: (error: AigosAuthError, req: AigosExpressRequest) => void;
  /** Callback for successful authentication */
  onAuthenticated?: (payload: GovernanceTokenPayload, req: AigosExpressRequest) => void;
}

/**
 * Authentication error type
 */
export interface AigosAuthError {
  code: string;
  message: string;
  httpStatus: number;
}

/**
 * Check if path should be skipped
 */
function shouldSkipPath(path: string, skipPaths: string[]): boolean {
  for (const pattern of skipPaths) {
    if (pattern === path) return true;
    if (pattern.endsWith("*")) {
      const prefix = pattern.slice(0, -1);
      if (path.startsWith(prefix)) return true;
    }
  }
  return false;
}

/**
 * Get header value (handles arrays)
 */
function getHeader(
  headers: Record<string, string | string[] | undefined>,
  name: string
): string | undefined {
  const value = headers[name.toLowerCase()] ?? headers[name];
  return Array.isArray(value) ? value[0] : value;
}

/**
 * Creates an Express middleware for AIGOS authentication
 */
export function createAigosExpressMiddleware(
  config: ExpressMiddlewareConfig
): AigosExpressMiddleware {
  const {
    tokenGenerator,
    tokenValidator,
    tokenInput,
    tokenOptions,
    validationOptions,
    inboundPolicy,
    skipPaths = [],
    onError,
    onAuthenticated,
  } = config;

  return async function aigosMiddleware(
    req: AigosExpressRequest,
    res: AigosExpressResponse,
    next: AigosExpressNextFunction
  ): Promise<void> {
    const path = req.path ?? req.url ?? "";

    // Skip authentication for configured paths
    if (shouldSkipPath(path, skipPaths)) {
      return next();
    }

    // Check protocol version
    const protocolVersion = getHeader(req.headers, AIGOS_PROTOCOL_VERSION_HEADER);
    if (protocolVersion && protocolVersion !== AIGOS_PROTOCOL_VERSION) {
      const error: AigosAuthError = {
        code: "PROTOCOL_VERSION_MISMATCH",
        message: `Unsupported protocol version: ${protocolVersion}`,
        httpStatus: 400,
      };
      onError?.(error, req);
      res.status(400).json({ error: error.code, message: error.message });
      return;
    }

    // Get and validate incoming token
    const incomingToken = getHeader(req.headers, AIGOS_TOKEN_HEADER);
    if (!incomingToken) {
      const error: AigosAuthError = {
        code: "MISSING_TOKEN",
        message: "Request did not include AIGOS token header",
        httpStatus: 401,
      };
      onError?.(error, req);
      res.status(401).json({ error: error.code, message: error.message });
      return;
    }

    // Validate token
    const validationResult = await tokenValidator.validate(
      incomingToken,
      validationOptions
    );

    if (!validationResult.valid) {
      const error: AigosAuthError = {
        code: validationResult.error?.code ?? "VALIDATION_FAILED",
        message: validationResult.error?.message ?? "Token validation failed",
        httpStatus: validationResult.error?.code === "EXPIRED" ? 401 : 403,
      };
      onError?.(error, req);
      res.status(error.httpStatus).json({ error: error.code, message: error.message });
      return;
    }

    const callerPayload = validationResult.payload!;

    // Apply inbound policy if configured
    if (inboundPolicy) {
      const policyDecision = await inboundPolicy.evaluate(callerPayload);
      if (!policyDecision.allowed) {
        const error: AigosAuthError = {
          code: "POLICY_DENIED",
          message: policyDecision.reason ?? "Inbound policy denied request",
          httpStatus: 403,
        };
        onError?.(error, req);
        res.status(403).json({ error: error.code, message: error.message });
        return;
      }
    }

    // Attach caller payload to request
    req.aigos = {
      valid: true,
      payload: callerPayload,
    };

    // Call authentication callback
    onAuthenticated?.(callerPayload, req);

    // Generate response token and set headers
    const { token: responseToken } = await tokenGenerator.generate(
      tokenInput,
      tokenOptions
    );

    // Use set() if available (Express), otherwise setHeader() (Node http)
    const setHeader = res.set?.bind(res) ?? res.setHeader?.bind(res);
    if (setHeader) {
      setHeader(AIGOS_TOKEN_HEADER, responseToken);
      setHeader(AIGOS_PROTOCOL_VERSION_HEADER, AIGOS_PROTOCOL_VERSION);
    }

    next();
  };
}

/**
 * Creates a simple token validation middleware (no response token)
 */
export function createAigosValidationMiddleware(
  tokenValidator: IGovernanceTokenValidator,
  validationOptions?: TokenValidationOptions,
  inboundPolicy?: IA2AInboundPolicy
): AigosExpressMiddleware {
  return async function aigosValidationMiddleware(
    req: AigosExpressRequest,
    res: AigosExpressResponse,
    next: AigosExpressNextFunction
  ): Promise<void> {
    const incomingToken = getHeader(req.headers, AIGOS_TOKEN_HEADER);
    if (!incomingToken) {
      res.status(401).json({ error: "MISSING_TOKEN", message: "AIGOS token required" });
      return;
    }

    const result = await tokenValidator.validate(incomingToken, validationOptions);
    if (!result.valid) {
      res.status(401).json({ error: result.error?.code, message: result.error?.message });
      return;
    }

    if (inboundPolicy) {
      const decision = await inboundPolicy.evaluate(result.payload!);
      if (!decision.allowed) {
        res.status(403).json({ error: "POLICY_DENIED", message: decision.reason });
        return;
      }
    }

    req.aigos = { valid: true, payload: result.payload };
    next();
  };
}

/**
 * Creates an optional authentication middleware (doesn't fail if no token)
 */
export function createAigosOptionalMiddleware(
  tokenValidator: IGovernanceTokenValidator,
  validationOptions?: TokenValidationOptions
): AigosExpressMiddleware {
  return async function aigosOptionalMiddleware(
    req: AigosExpressRequest,
    res: AigosExpressResponse,
    next: AigosExpressNextFunction
  ): Promise<void> {
    const incomingToken = getHeader(req.headers, AIGOS_TOKEN_HEADER);
    if (!incomingToken) {
      req.aigos = { valid: false, error: "No token provided" };
      return next();
    }

    const result = await tokenValidator.validate(incomingToken, validationOptions);
    if (result.valid) {
      req.aigos = { valid: true, payload: result.payload };
    } else {
      req.aigos = { valid: false, error: result.error?.message };
    }

    next();
  };
}
