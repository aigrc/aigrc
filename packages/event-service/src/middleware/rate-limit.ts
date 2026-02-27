/**
 * Rate Limiting Middleware for Event Service
 *
 * Per-org, per-channel sliding window rate limiting.
 * Follows the pattern from packages/mcp/src/auth/index.ts.
 *
 * Per EVT-001 §12.6:
 * - Sync: 100 events/min per org
 * - Batch: 10 requests/min per org
 * - Critical events are exempt from rate limits
 */

import type { Request, Response, NextFunction } from "express";
import type { AuthenticatedRequest } from "./auth.js";

// ─────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────

export interface RateLimitConfig {
  /** Maximum requests per window (e.g., 100 for sync, 10 for batch) */
  limit: number;
  /** Window duration in milliseconds (default: 60_000 = 1 minute) */
  windowMs?: number;
  /** Whether critical events bypass rate limits (default: true) */
  criticalExempt?: boolean;
  /** Key prefix for differentiating sync vs batch (default: "default") */
  channel?: string;
}

interface WindowState {
  /** Number of requests in the current window */
  count: number;
  /** Window start timestamp (ms) */
  windowStart: number;
}

// ─────────────────────────────────────────────────────────────────
// STATE
// ─────────────────────────────────────────────────────────────────

/**
 * In-memory rate limit state.
 * Key: "{channel}:{orgId}"
 * In production, replace with Redis for multi-instance support.
 */
const rateLimitState = new Map<string, WindowState>();

/**
 * Reset all rate limit state. Used for testing.
 */
export function resetRateLimitState(): void {
  rateLimitState.clear();
}

// ─────────────────────────────────────────────────────────────────
// MIDDLEWARE
// ─────────────────────────────────────────────────────────────────

/**
 * Express middleware for per-org sliding window rate limiting.
 *
 * On each request:
 * 1. Checks if critical event (body.criticality === "critical") and exempts if configured
 * 2. Looks up org's window state, resets if window expired
 * 3. If over limit: returns 429 with Retry-After and X-RateLimit-* headers
 * 4. Otherwise: increments count, sets X-RateLimit-* headers, calls next()
 */
export function eventRateLimit(config: RateLimitConfig) {
  const {
    limit,
    windowMs = 60_000,
    criticalExempt = true,
    channel = "default",
  } = config;

  return (req: Request, res: Response, next: NextFunction): void => {
    // Check for critical event exemption
    if (criticalExempt) {
      const body = req.body as Record<string, unknown> | undefined;
      if (body && body.criticality === "critical") {
        next();
        return;
      }
    }

    // Determine rate limit key from auth
    const authReq = req as AuthenticatedRequest;
    const orgId = authReq.auth?.orgId ?? req.ip ?? "anonymous";
    const key = `${channel}:${orgId}`;

    const now = Date.now();

    // Get or create window state
    let state = rateLimitState.get(key);
    if (!state) {
      state = { count: 0, windowStart: now };
      rateLimitState.set(key, state);
    }

    // Reset window if expired
    if (now - state.windowStart >= windowMs) {
      state.count = 0;
      state.windowStart = now;
    }

    // Calculate remaining and reset time
    const windowResetMs = state.windowStart + windowMs;
    const retryAfterSec = Math.ceil((windowResetMs - now) / 1000);

    // Check if over limit
    if (state.count >= limit) {
      res.set("Retry-After", String(retryAfterSec));
      res.set("X-RateLimit-Limit", String(limit));
      res.set("X-RateLimit-Remaining", "0");
      res.set("X-RateLimit-Reset", String(Math.ceil(windowResetMs / 1000)));

      res.status(429).json({
        error: "rate_limit_exceeded",
        message: `Rate limit of ${limit} requests per ${windowMs / 1000}s exceeded`,
        retryAfter: retryAfterSec,
      });
      return;
    }

    // Increment and set headers
    state.count++;

    res.set("X-RateLimit-Limit", String(limit));
    res.set(
      "X-RateLimit-Remaining",
      String(limit - state.count),
    );
    res.set(
      "X-RateLimit-Reset",
      String(Math.ceil(windowResetMs / 1000)),
    );

    next();
  };
}
