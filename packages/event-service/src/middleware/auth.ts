/**
 * Authentication Middleware for Event Service
 *
 * Validates Bearer tokens and extracts org_id for downstream use.
 * Follows the pattern from packages/mcp/src/auth/index.ts but simplified
 * for the event ingestion service.
 */

import type { Request, Response, NextFunction } from "express";

// ─────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────

export interface AuthInfo {
  /** Organization ID extracted from the token/key */
  orgId: string;
  /** Authentication method used */
  type: "bearer" | "api-key";
}

/**
 * Extend Express Request with auth info.
 */
export interface AuthenticatedRequest extends Request {
  auth: AuthInfo;
}

export interface AuthConfig {
  /**
   * Function to resolve an API key to an org ID.
   * In production, this queries a database. For testing, use a simple map.
   */
  resolveApiKey?: (key: string) => Promise<string | null>;

  /**
   * Function to resolve a Bearer token to an org ID.
   * In production, this validates a JWT. For testing, use a simple map.
   */
  resolveToken?: (token: string) => Promise<string | null>;
}

// ─────────────────────────────────────────────────────────────────
// MIDDLEWARE
// ─────────────────────────────────────────────────────────────────

/**
 * Express middleware that requires Bearer token or API key authentication.
 *
 * Supports:
 * - Authorization: Bearer <token>
 * - X-API-Key: <key>
 *
 * On success, sets `req.auth = { orgId, type }` for downstream handlers.
 * On failure, returns 401 Unauthorized.
 */
export function requireBearerAuth(config: AuthConfig = {}) {
  const { resolveApiKey, resolveToken } = config;

  return async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      // Check for API key header first
      const apiKey = req.headers["x-api-key"] as string | undefined;
      if (apiKey && resolveApiKey) {
        const orgId = await resolveApiKey(apiKey);
        if (!orgId) {
          res.status(401).json({
            error: "invalid_api_key",
            message: "API key not found or expired",
          });
          return;
        }

        (req as AuthenticatedRequest).auth = { orgId, type: "api-key" };
        next();
        return;
      }

      // Check for Bearer token
      const authHeader = req.headers.authorization;
      if (authHeader) {
        const [scheme, token] = authHeader.split(" ");
        if (scheme?.toLowerCase() !== "bearer" || !token) {
          res.status(401).json({
            error: "invalid_request",
            message:
              "Invalid Authorization header format. Expected: Bearer <token>",
          });
          return;
        }

        if (resolveToken) {
          const orgId = await resolveToken(token);
          if (!orgId) {
            res.status(401).json({
              error: "invalid_token",
              message: "Token is invalid or expired",
            });
            return;
          }

          (req as AuthenticatedRequest).auth = { orgId, type: "bearer" };
          next();
          return;
        }

        // Fallback: extract org from token directly (dev mode)
        // In dev mode, treat the token as the org ID
        (req as AuthenticatedRequest).auth = { orgId: token, type: "bearer" };
        next();
        return;
      }

      // No authentication provided
      res.status(401).json({
        error: "unauthorized",
        message: "Authentication required. Provide Authorization: Bearer <token> or X-API-Key header.",
      });
    } catch (error) {
      res.status(401).json({
        error: "auth_error",
        message:
          error instanceof Error
            ? error.message
            : "Authentication verification failed",
      });
    }
  };
}
