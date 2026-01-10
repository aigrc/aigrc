/**
 * CGA A2A HTTP Middleware
 *
 * Middleware for automatic CGA verification in HTTP frameworks.
 * @see SPEC-CGA-001 Section 7 for A2A specification
 */

import { CGATokenVerifier, type CGATokenVerifierOptions, type TokenVerificationResult } from './token';
import { TrustPolicyEvaluator, type A2ATrustPolicy, type CGAClaims, type TrustEvaluationResult } from './trust-policy';

/**
 * Options for A2A middleware
 */
export interface A2AMiddlewareOptions {
  /** Token verifier options */
  tokenVerifier: CGATokenVerifierOptions;
  /** Trust policy for evaluation */
  trustPolicy: A2ATrustPolicy;
  /** Header name for CGA token (default: X-AIGOS-Token) */
  headerName?: string;
  /** Whether to allow requests without CGA token (based on policy) */
  allowWithoutToken?: boolean;
  /** Custom action extractor from request */
  actionExtractor?: (req: unknown) => string;
  /** Custom organization extractor from claims */
  organizationExtractor?: (claims: CGAClaims) => string | undefined;
  /** Custom error handler */
  onError?: (error: A2AMiddlewareError) => void;
  /** Custom success handler */
  onSuccess?: (result: A2AVerificationSuccess) => void;
}

/**
 * Middleware error
 */
export interface A2AMiddlewareError {
  code: A2AErrorCode;
  message: string;
  statusCode: number;
  details?: Record<string, unknown>;
}

/**
 * Error codes
 */
export type A2AErrorCode =
  | 'MISSING_TOKEN'
  | 'INVALID_TOKEN'
  | 'TOKEN_EXPIRED'
  | 'CERTIFICATE_EXPIRED'
  | 'CERTIFICATE_REVOKED'
  | 'UNTRUSTED_ISSUER'
  | 'INSUFFICIENT_LEVEL'
  | 'MISSING_COMPLIANCE'
  | 'POLICY_VIOLATION'
  | 'HEALTH_CHECK_FAILED';

/**
 * Successful verification result
 */
export interface A2AVerificationSuccess {
  claims: CGAClaims;
  trustResult: TrustEvaluationResult;
  tokenResult: TokenVerificationResult;
}

/**
 * A2A Middleware
 *
 * Provides HTTP middleware for CGA-based A2A authentication.
 *
 * @example
 * ```typescript
 * // Express
 * const middleware = new A2AMiddleware(options);
 * app.use('/api', middleware.express());
 *
 * // Fastify
 * fastify.addHook('onRequest', middleware.fastify());
 *
 * // Generic
 * const result = await middleware.verify(token, 'users.read');
 * ```
 */
export class A2AMiddleware {
  private verifier: CGATokenVerifier;
  private evaluator: TrustPolicyEvaluator;
  private options: Required<A2AMiddlewareOptions>;

  constructor(options: A2AMiddlewareOptions) {
    this.verifier = new CGATokenVerifier(options.tokenVerifier);
    this.evaluator = new TrustPolicyEvaluator(options.trustPolicy);
    this.options = {
      tokenVerifier: options.tokenVerifier,
      trustPolicy: options.trustPolicy,
      headerName: options.headerName ?? 'X-AIGOS-Token',
      allowWithoutToken: options.allowWithoutToken ?? false,
      actionExtractor: options.actionExtractor ?? this.defaultActionExtractor,
      organizationExtractor: options.organizationExtractor ?? this.defaultOrganizationExtractor,
      onError: options.onError ?? (() => {}),
      onSuccess: options.onSuccess ?? (() => {}),
    };
  }

  /**
   * Verify a CGA token for a given action
   */
  async verify(
    token: string | null,
    action: string,
    sourceOrganization?: string
  ): Promise<{ success: true; result: A2AVerificationSuccess } | { success: false; error: A2AMiddlewareError }> {
    // If no token provided
    if (!token) {
      // Check if policy allows without token
      const trustResult = this.evaluator.evaluate(null, { action, source_organization: sourceOrganization });
      if (trustResult.trusted) {
        return {
          success: true,
          result: {
            claims: null as unknown as CGAClaims,
            trustResult,
            tokenResult: { valid: false, warnings: [] },
          },
        };
      }

      return {
        success: false,
        error: {
          code: 'MISSING_TOKEN',
          message: 'CGA token required but not provided',
          statusCode: 401,
        },
      };
    }

    // Verify token
    const tokenResult = await this.verifier.verify(token);
    if (!tokenResult.valid) {
      return {
        success: false,
        error: this.tokenErrorToMiddlewareError(tokenResult),
      };
    }

    // Map token claims to CGAClaims for trust evaluation
    const cgaClaims = this.mapTokenClaimsToCGAClaims(tokenResult.claims!);
    const org = sourceOrganization ?? this.options.organizationExtractor(cgaClaims);

    // Evaluate trust policy
    const trustResult = this.evaluator.evaluate(cgaClaims, {
      action,
      source_organization: org,
    });

    if (!trustResult.trusted) {
      return {
        success: false,
        error: this.trustErrorToMiddlewareError(trustResult),
      };
    }

    return {
      success: true,
      result: {
        claims: cgaClaims,
        trustResult,
        tokenResult,
      },
    };
  }

  /**
   * Express middleware
   */
  express(): (req: ExpressRequest, res: ExpressResponse, next: ExpressNext) => Promise<void> {
    return async (req, res, next) => {
      const token = this.extractToken(req.headers);
      const action = this.options.actionExtractor(req);

      const result = await this.verify(token, action);

      if (!result.success) {
        this.options.onError(result.error);
        res.status(result.error.statusCode).json({
          error: result.error.code,
          message: result.error.message,
          details: result.error.details,
        });
        return;
      }

      // Attach CGA claims to request
      (req as ExpressRequest & { cga?: A2AVerificationSuccess }).cga = result.result;
      this.options.onSuccess(result.result);
      next();
    };
  }

  /**
   * Fastify hook
   */
  fastify(): (req: FastifyRequest, reply: FastifyReply) => Promise<void> {
    return async (req, reply) => {
      const token = this.extractToken(req.headers as Record<string, string | string[] | undefined>);
      const action = this.options.actionExtractor(req);

      const result = await this.verify(token, action);

      if (!result.success) {
        this.options.onError(result.error);
        reply.code(result.error.statusCode).send({
          error: result.error.code,
          message: result.error.message,
          details: result.error.details,
        });
        return;
      }

      // Attach CGA claims to request
      (req as FastifyRequest & { cga?: A2AVerificationSuccess }).cga = result.result;
      this.options.onSuccess(result.result);
    };
  }

  /**
   * Extract token from headers
   */
  private extractToken(headers: Record<string, string | string[] | undefined>): string | null {
    const headerName = this.options.headerName.toLowerCase();
    const value = headers[headerName] || headers[this.options.headerName];

    if (!value) return null;
    if (Array.isArray(value)) return value[0] || null;
    return value;
  }

  /**
   * Default action extractor
   */
  private defaultActionExtractor(req: unknown): string {
    const r = req as { method?: string; path?: string; url?: string };
    const method = (r.method || 'GET').toLowerCase();
    const path = (r.path || r.url || '/').replace(/^\//, '').replace(/\//g, '.');
    return `${method}.${path || 'root'}`;
  }

  /**
   * Default organization extractor
   */
  private defaultOrganizationExtractor(claims: CGAClaims): string | undefined {
    // Extract org from issuer if it contains org info
    return undefined;
  }

  /**
   * Map token claims to CGAClaims
   */
  private mapTokenClaimsToCGAClaims(claims: {
    cga: {
      certificate_id: string;
      level: 'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM';
      issuer: string;
      expires_at: string;
      governance_verified: {
        kill_switch: boolean;
        policy_engine: boolean;
        golden_thread: boolean;
        capability_bounds: boolean;
        telemetry: boolean;
      };
      compliance_frameworks: string[];
      operational_health?: {
        uptime_30d: number;
        violations_30d: number;
        last_health_check?: string;
      };
    };
  }): CGAClaims {
    return {
      certificate_id: claims.cga.certificate_id,
      level: claims.cga.level,
      issuer: claims.cga.issuer,
      expires_at: claims.cga.expires_at,
      governance_verified: claims.cga.governance_verified,
      compliance_frameworks: claims.cga.compliance_frameworks,
      operational_health: claims.cga.operational_health,
    };
  }

  /**
   * Convert token error to middleware error
   */
  private tokenErrorToMiddlewareError(result: TokenVerificationResult): A2AMiddlewareError {
    if (result.error?.includes('expired')) {
      if (result.certificate_status === 'EXPIRED') {
        return {
          code: 'CERTIFICATE_EXPIRED',
          message: 'CGA certificate has expired',
          statusCode: 401,
        };
      }
      return {
        code: 'TOKEN_EXPIRED',
        message: 'Token has expired',
        statusCode: 401,
      };
    }

    if (result.certificate_status === 'REVOKED') {
      return {
        code: 'CERTIFICATE_REVOKED',
        message: 'CGA certificate has been revoked',
        statusCode: 401,
      };
    }

    return {
      code: 'INVALID_TOKEN',
      message: result.error || 'Invalid token',
      statusCode: 401,
    };
  }

  /**
   * Convert trust error to middleware error
   */
  private trustErrorToMiddlewareError(result: TrustEvaluationResult): A2AMiddlewareError {
    if (result.reason?.includes('Untrusted CA')) {
      return {
        code: 'UNTRUSTED_ISSUER',
        message: result.reason,
        statusCode: 403,
      };
    }

    if (result.reason?.includes('below required')) {
      return {
        code: 'INSUFFICIENT_LEVEL',
        message: result.reason,
        statusCode: 403,
        details: { cga_level: result.cga_level },
      };
    }

    if (result.reason?.includes('Missing compliance')) {
      return {
        code: 'MISSING_COMPLIANCE',
        message: result.reason,
        statusCode: 403,
      };
    }

    if (result.reason?.includes('violations')) {
      return {
        code: 'HEALTH_CHECK_FAILED',
        message: result.reason,
        statusCode: 403,
      };
    }

    return {
      code: 'POLICY_VIOLATION',
      message: result.reason || 'Trust policy violation',
      statusCode: 403,
    };
  }
}

// Express types (minimal definitions to avoid external dependency)
interface ExpressRequest {
  headers: Record<string, string | string[] | undefined>;
  method?: string;
  path?: string;
  url?: string;
}

interface ExpressResponse {
  status(code: number): ExpressResponse;
  json(body: unknown): void;
}

type ExpressNext = (err?: unknown) => void;

// Fastify types (minimal definitions to avoid external dependency)
interface FastifyRequest {
  headers: Record<string, string | string[] | undefined>;
  method?: string;
  url?: string;
}

interface FastifyReply {
  code(code: number): FastifyReply;
  send(body: unknown): void;
}

/**
 * Create A2A middleware with default configuration
 */
export function createA2AMiddleware(options: A2AMiddlewareOptions): A2AMiddleware {
  return new A2AMiddleware(options);
}
