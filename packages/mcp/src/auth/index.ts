/**
 * AIGRC MCP Authentication Layer
 *
 * Supports multiple authentication methods:
 * - API Key (development/sandbox)
 * - OAuth 2.0 Bearer Token (production)
 * - Enterprise SSO (via OAuth proxy)
 */

import type { Request, Response, NextFunction } from "express";

export interface AuthInfo {
  type: "api_key" | "oauth" | "none";
  tenantId?: string;
  clientId?: string;
  scopes: string[];
  expiresAt?: number;
  features?: string[];
}

export interface ApiKeyMetadata {
  keyId: string;
  tenantId: string;
  environment: "test" | "live";
  scopes: string[];
  features: string[];
  expiresAt?: number;
  rateLimits: {
    requestsPerMinute: number;
    toolCallsPerHour: number;
  };
}

/**
 * In-memory API key store (would be replaced with database in production)
 */
const apiKeyStore = new Map<string, ApiKeyMetadata>();

/**
 * Register an API key (for testing/development)
 */
export function registerApiKey(key: string, metadata: ApiKeyMetadata): void {
  apiKeyStore.set(key, metadata);
}

/**
 * Validate API key format
 * Format: aigrc_sk_{environment}_{32_bytes_base64}
 */
export function isValidApiKeyFormat(key: string): boolean {
  return /^aigrc_sk_(test|live)_[a-zA-Z0-9]{32,}$/.test(key);
}

/**
 * Get API key metadata
 */
export function getApiKeyMetadata(key: string): ApiKeyMetadata | undefined {
  return apiKeyStore.get(key);
}

/**
 * OAuth token verifier interface
 */
export interface TokenVerifier {
  verifyAccessToken(token: string): Promise<AuthInfo>;
}

/**
 * Create a simple JWT verifier (validates structure, not signature)
 * In production, use ProxyOAuthServerProvider from MCP SDK
 */
export function createJwtVerifier(options: {
  issuer?: string;
  audience?: string;
}): TokenVerifier {
  return {
    async verifyAccessToken(token: string): Promise<AuthInfo> {
      try {
        // Decode JWT (without verification - use jose in production)
        const parts = token.split(".");
        if (parts.length !== 3) {
          throw new Error("Invalid JWT format");
        }

        const payload = JSON.parse(
          Buffer.from(parts[1], "base64url").toString("utf-8")
        );

        // Validate issuer if specified
        if (options.issuer && payload.iss !== options.issuer) {
          throw new Error("Invalid issuer");
        }

        // Validate audience if specified
        if (options.audience && payload.aud !== options.audience) {
          throw new Error("Invalid audience");
        }

        // Check expiration
        if (payload.exp && payload.exp < Date.now() / 1000) {
          throw new Error("Token expired");
        }

        return {
          type: "oauth",
          tenantId: payload.tenant_id,
          clientId: payload.sub,
          scopes: payload.scopes || payload.scope?.split(" ") || [],
          expiresAt: payload.exp,
          features: payload.features || [],
        };
      } catch (error) {
        throw new Error(
          `Token verification failed: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    },
  };
}

/**
 * Authentication configuration
 */
export interface AuthConfig {
  /** Allow unauthenticated requests (for stdio transport) */
  allowAnonymous?: boolean;

  /** API key header name */
  apiKeyHeader?: string;

  /** OAuth token verifier */
  tokenVerifier?: TokenVerifier;

  /** Required scopes for access */
  requiredScopes?: string[];

  /** Resource metadata URL for WWW-Authenticate header */
  resourceMetadataUrl?: string;
}

/**
 * Express middleware for AIGRC authentication
 *
 * Supports:
 * - API Key via X-AIGRC-API-Key header
 * - OAuth Bearer token via Authorization header
 * - Anonymous access if allowAnonymous is true
 */
export function requireAuth(config: AuthConfig = {}) {
  const {
    allowAnonymous = false,
    apiKeyHeader = "x-aigrc-api-key",
    tokenVerifier,
    requiredScopes = [],
  } = config;

  return async (
    req: Request & { auth?: AuthInfo },
    res: Response,
    next: NextFunction
  ) => {
    try {
      // Check for API key first
      const apiKey = req.headers[apiKeyHeader.toLowerCase()] as
        | string
        | undefined;
      if (apiKey) {
        if (!isValidApiKeyFormat(apiKey)) {
          res.status(401).json({
            error: "invalid_api_key",
            error_description: "Invalid API key format",
          });
          return;
        }

        const metadata = getApiKeyMetadata(apiKey);
        if (!metadata) {
          res.status(401).json({
            error: "invalid_api_key",
            error_description: "API key not found",
          });
          return;
        }

        // Check expiration
        if (metadata.expiresAt && metadata.expiresAt < Date.now() / 1000) {
          res.status(401).json({
            error: "expired_api_key",
            error_description: "API key has expired",
          });
          return;
        }

        // Check required scopes
        if (requiredScopes.length > 0) {
          const hasAllScopes = requiredScopes.every((scope) =>
            metadata.scopes.includes(scope)
          );
          if (!hasAllScopes) {
            res.status(403).json({
              error: "insufficient_scope",
              error_description: "API key lacks required scopes",
            });
            return;
          }
        }

        req.auth = {
          type: "api_key",
          tenantId: metadata.tenantId,
          scopes: metadata.scopes,
          features: metadata.features,
        };
        next();
        return;
      }

      // Check for Bearer token
      const authHeader = req.headers.authorization;
      if (authHeader) {
        const [type, token] = authHeader.split(" ");
        if (type?.toLowerCase() !== "bearer" || !token) {
          res.status(401).json({
            error: "invalid_request",
            error_description:
              "Invalid Authorization header format, expected 'Bearer TOKEN'",
          });
          return;
        }

        if (!tokenVerifier) {
          res.status(500).json({
            error: "server_error",
            error_description: "OAuth token verification not configured",
          });
          return;
        }

        const authInfo = await tokenVerifier.verifyAccessToken(token);

        // Check required scopes
        if (requiredScopes.length > 0) {
          const hasAllScopes = requiredScopes.every((scope) =>
            authInfo.scopes.includes(scope)
          );
          if (!hasAllScopes) {
            res.status(403).json({
              error: "insufficient_scope",
              error_description: "Token lacks required scopes",
            });
            return;
          }
        }

        req.auth = authInfo;
        next();
        return;
      }

      // No authentication provided
      if (allowAnonymous) {
        req.auth = { type: "none", scopes: [] };
        next();
        return;
      }

      res.status(401).json({
        error: "unauthorized",
        error_description: "Authentication required",
      });
    } catch (error) {
      res.status(401).json({
        error: "invalid_token",
        error_description:
          error instanceof Error ? error.message : "Token verification failed",
      });
    }
  };
}

/**
 * Extract tenant ID from request
 *
 * Supports extraction from:
 * - Header (X-AIGRC-Tenant-ID)
 * - JWT claim (tenant_id)
 * - Query parameter (tenant)
 */
export function extractTenantId(
  req: Request & { auth?: AuthInfo },
  options: {
    method: "header" | "token_claim" | "query_param";
    headerName?: string;
    paramName?: string;
  }
): string | undefined {
  switch (options.method) {
    case "header":
      return req.headers[
        (options.headerName || "x-aigrc-tenant-id").toLowerCase()
      ] as string | undefined;

    case "token_claim":
      return req.auth?.tenantId;

    case "query_param":
      return req.query[options.paramName || "tenant"] as string | undefined;

    default:
      return undefined;
  }
}

/**
 * Rate limiting state (in-memory, use Redis in production)
 */
const rateLimitState = new Map<
  string,
  {
    requestCount: number;
    toolCallCount: number;
    windowStart: number;
    hourStart: number;
  }
>();

/**
 * Simple rate limiting middleware
 */
export function rateLimit(options: {
  requestsPerMinute: number;
  toolCallsPerHour: number;
}) {
  return (
    req: Request & { auth?: AuthInfo },
    res: Response,
    next: NextFunction
  ) => {
    const key = req.auth?.tenantId || req.ip || "anonymous";
    const now = Date.now();
    const minuteWindow = 60 * 1000;
    const hourWindow = 60 * 60 * 1000;

    let state = rateLimitState.get(key);
    if (!state) {
      state = {
        requestCount: 0,
        toolCallCount: 0,
        windowStart: now,
        hourStart: now,
      };
      rateLimitState.set(key, state);
    }

    // Reset minute window if expired
    if (now - state.windowStart > minuteWindow) {
      state.requestCount = 0;
      state.windowStart = now;
    }

    // Reset hour window if expired
    if (now - state.hourStart > hourWindow) {
      state.toolCallCount = 0;
      state.hourStart = now;
    }

    // Check request limit
    if (state.requestCount >= options.requestsPerMinute) {
      res.status(429).json({
        error: "rate_limit_exceeded",
        error_description: "Too many requests per minute",
        retry_after: Math.ceil(
          (state.windowStart + minuteWindow - now) / 1000
        ),
      });
      return;
    }

    // Increment request count
    state.requestCount++;

    // Add rate limit headers
    res.set("X-RateLimit-Limit", String(options.requestsPerMinute));
    res.set(
      "X-RateLimit-Remaining",
      String(options.requestsPerMinute - state.requestCount)
    );
    res.set(
      "X-RateLimit-Reset",
      String(Math.ceil((state.windowStart + minuteWindow) / 1000))
    );

    next();
  };
}

/**
 * Increment tool call count for rate limiting
 */
export function incrementToolCallCount(tenantId: string): boolean {
  const state = rateLimitState.get(tenantId);
  if (state) {
    state.toolCallCount++;
    // Return false if over limit (would need to be configured per-tenant)
    return state.toolCallCount < 1000;
  }
  return true;
}
