/**
 * CGA A2A Middleware Tests
 */

import { describe, it, expect, vi } from 'vitest';
import {
  A2AMiddleware,
  createA2AMiddleware,
  type A2AMiddlewareOptions,
  type A2AMiddlewareError,
} from './middleware';
import { createTestToken, type CGATokenClaims } from './token';
import { type A2ATrustPolicy } from './trust-policy';

describe('CGA A2A Middleware', () => {
  const basePolicy: A2ATrustPolicy = {
    apiVersion: 'aigos.io/v1',
    kind: 'A2ATrustPolicy',
    spec: {
      default: {
        require_cga: true,
        minimum_level: 'BRONZE',
      },
      trusted_cas: [
        { id: 'self', name: 'Self-signed', trust_level: 'FULL' },
        { id: 'aigos-ca', name: 'AIGOS CA', trust_level: 'FULL' },
      ],
      actions: [
        {
          pattern: 'public.*',
          require_cga: false,
          minimum_level: 'BRONZE',
        },
        {
          pattern: 'admin.*',
          require_cga: true,
          minimum_level: 'GOLD',
        },
      ],
    },
  };

  const defaultOptions: A2AMiddlewareOptions = {
    tokenVerifier: {
      trustedCAs: new Map([
        ['self', 'public-key'],
        ['aigos-ca', 'public-key'],
      ]),
    },
    trustPolicy: basePolicy,
  };

  describe('A2AMiddleware', () => {
    it('should create middleware with options', () => {
      const middleware = new A2AMiddleware(defaultOptions);
      expect(middleware).toBeDefined();
    });

    describe('verify', () => {
      it('should verify valid token', async () => {
        const middleware = new A2AMiddleware(defaultOptions);
        const token = createTestToken();

        const result = await middleware.verify(token, 'users.read');
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.result.claims).toBeDefined();
          expect(result.result.trustResult.trusted).toBe(true);
        }
      });

      it('should reject missing token when required', async () => {
        const middleware = new A2AMiddleware(defaultOptions);

        const result = await middleware.verify(null, 'users.read');
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.code).toBe('MISSING_TOKEN');
          expect(result.error.statusCode).toBe(401);
        }
      });

      it('should allow missing token for public actions', async () => {
        const middleware = new A2AMiddleware(defaultOptions);

        const result = await middleware.verify(null, 'public.health');
        expect(result.success).toBe(true);
      });

      it('should reject expired token', async () => {
        const middleware = new A2AMiddleware(defaultOptions);
        const expiredToken = createTestToken({
          exp: Math.floor(Date.now() / 1000) - 3600,
        });

        const result = await middleware.verify(expiredToken, 'users.read');
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.code).toBe('TOKEN_EXPIRED');
        }
      });

      it('should reject expired certificate', async () => {
        const middleware = new A2AMiddleware(defaultOptions);
        const token = createTestToken({
          cga: {
            certificate_id: 'cga-001',
            level: 'BRONZE',
            issuer: 'self',
            expires_at: new Date(Date.now() - 1000).toISOString(),
            governance_verified: {
              kill_switch: true,
              policy_engine: true,
              golden_thread: true,
              capability_bounds: false,
              telemetry: false,
            },
            compliance_frameworks: [],
          },
        });

        const result = await middleware.verify(token, 'users.read');
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.code).toBe('CERTIFICATE_EXPIRED');
        }
      });

      it('should reject insufficient CGA level', async () => {
        const middleware = new A2AMiddleware(defaultOptions);
        const bronzeToken = createTestToken({
          cga: {
            certificate_id: 'cga-001',
            level: 'BRONZE',
            issuer: 'self',
            expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            governance_verified: {
              kill_switch: true,
              policy_engine: true,
              golden_thread: true,
              capability_bounds: false,
              telemetry: false,
            },
            compliance_frameworks: [],
          },
        });

        // admin.* requires GOLD
        const result = await middleware.verify(bronzeToken, 'admin.users');
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.code).toBe('INSUFFICIENT_LEVEL');
          expect(result.error.statusCode).toBe(403);
        }
      });

      it('should accept sufficient CGA level', async () => {
        const middleware = new A2AMiddleware(defaultOptions);
        const goldToken = createTestToken({
          cga: {
            certificate_id: 'cga-001',
            level: 'GOLD',
            issuer: 'self',
            expires_at: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString(),
            governance_verified: {
              kill_switch: true,
              policy_engine: true,
              golden_thread: true,
              capability_bounds: true,
              telemetry: true,
            },
            compliance_frameworks: ['SOC2'],
          },
        });

        const result = await middleware.verify(goldToken, 'admin.users');
        expect(result.success).toBe(true);
      });

      it('should return trust score in result', async () => {
        const middleware = new A2AMiddleware(defaultOptions);
        const token = createTestToken();

        const result = await middleware.verify(token, 'users.read');
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.result.trustResult.trust_score).toBeGreaterThan(0);
        }
      });
    });

    describe('express middleware', () => {
      it('should create express middleware', () => {
        const middleware = new A2AMiddleware(defaultOptions);
        const expressMiddleware = middleware.express();
        expect(expressMiddleware).toBeInstanceOf(Function);
      });

      it('should pass valid request to next', async () => {
        const middleware = new A2AMiddleware(defaultOptions);
        const expressMiddleware = middleware.express();
        const token = createTestToken();

        const req = {
          headers: { 'x-aigos-token': token },
          method: 'GET',
          path: '/users',
        };
        const res = {
          status: vi.fn().mockReturnThis(),
          json: vi.fn(),
        };
        const next = vi.fn();

        await expressMiddleware(req, res as any, next);

        expect(next).toHaveBeenCalled();
        expect(res.status).not.toHaveBeenCalled();
        expect((req as any).cga).toBeDefined();
      });

      it('should reject invalid request', async () => {
        const middleware = new A2AMiddleware(defaultOptions);
        const expressMiddleware = middleware.express();

        const req = {
          headers: {},
          method: 'GET',
          path: '/users',
        };
        const res = {
          status: vi.fn().mockReturnThis(),
          json: vi.fn(),
        };
        const next = vi.fn();

        await expressMiddleware(req, res as any, next);

        expect(next).not.toHaveBeenCalled();
        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith(
          expect.objectContaining({
            error: 'MISSING_TOKEN',
          })
        );
      });

      it('should extract action from path', async () => {
        const onSuccess = vi.fn();
        const middleware = new A2AMiddleware({
          ...defaultOptions,
          onSuccess,
        });
        const expressMiddleware = middleware.express();
        const token = createTestToken();

        const req = {
          headers: { 'x-aigos-token': token },
          method: 'POST',
          path: '/users/create',
        };

        await expressMiddleware(req, { status: vi.fn().mockReturnThis(), json: vi.fn() } as any, vi.fn());

        expect(onSuccess).toHaveBeenCalled();
      });
    });

    describe('fastify hook', () => {
      it('should create fastify hook', () => {
        const middleware = new A2AMiddleware(defaultOptions);
        const hook = middleware.fastify();
        expect(hook).toBeInstanceOf(Function);
      });

      it('should pass valid request', async () => {
        const middleware = new A2AMiddleware(defaultOptions);
        const hook = middleware.fastify();
        const token = createTestToken();

        const req = {
          headers: { 'x-aigos-token': token },
          method: 'GET',
          url: '/api/users',
        };
        const reply = {
          code: vi.fn().mockReturnThis(),
          send: vi.fn(),
        };

        await hook(req as any, reply as any);

        expect(reply.code).not.toHaveBeenCalled();
        expect((req as any).cga).toBeDefined();
      });

      it('should reject invalid request', async () => {
        const middleware = new A2AMiddleware(defaultOptions);
        const hook = middleware.fastify();

        const req = {
          headers: {},
          method: 'GET',
          url: '/api/users',
        };
        const reply = {
          code: vi.fn().mockReturnThis(),
          send: vi.fn(),
        };

        await hook(req as any, reply as any);

        expect(reply.code).toHaveBeenCalledWith(401);
        expect(reply.send).toHaveBeenCalledWith(
          expect.objectContaining({
            error: 'MISSING_TOKEN',
          })
        );
      });
    });

    describe('custom header', () => {
      it('should use custom header name', async () => {
        const middleware = new A2AMiddleware({
          ...defaultOptions,
          headerName: 'Authorization',
        });
        const token = createTestToken();

        const expressMiddleware = middleware.express();
        const req = {
          headers: { authorization: token },
          method: 'GET',
          path: '/users',
        };
        const res = {
          status: vi.fn().mockReturnThis(),
          json: vi.fn(),
        };
        const next = vi.fn();

        await expressMiddleware(req, res as any, next);

        expect(next).toHaveBeenCalled();
      });
    });

    describe('error callbacks', () => {
      it('should call onError for invalid requests via express', async () => {
        const onError = vi.fn();
        const middleware = new A2AMiddleware({
          ...defaultOptions,
          onError,
        });
        const expressMiddleware = middleware.express();

        const req = {
          headers: {},
          method: 'GET',
          path: '/users',
        };
        const res = {
          status: vi.fn().mockReturnThis(),
          json: vi.fn(),
        };

        await expressMiddleware(req, res as any, vi.fn());

        expect(onError).toHaveBeenCalledWith(
          expect.objectContaining({
            code: 'MISSING_TOKEN',
          })
        );
      });

      it('should call onSuccess for valid requests via express', async () => {
        const onSuccess = vi.fn();
        const middleware = new A2AMiddleware({
          ...defaultOptions,
          onSuccess,
        });
        const expressMiddleware = middleware.express();
        const token = createTestToken();

        const req = {
          headers: { 'x-aigos-token': token },
          method: 'GET',
          path: '/users',
        };
        const res = {
          status: vi.fn().mockReturnThis(),
          json: vi.fn(),
        };

        await expressMiddleware(req, res as any, vi.fn());

        expect(onSuccess).toHaveBeenCalledWith(
          expect.objectContaining({
            claims: expect.any(Object),
            trustResult: expect.any(Object),
          })
        );
      });
    });

    describe('custom action extractor', () => {
      it('should use custom action extractor', async () => {
        const middleware = new A2AMiddleware({
          ...defaultOptions,
          actionExtractor: (req: any) => `custom.${req.customAction}`,
        });
        const token = createTestToken();

        const expressMiddleware = middleware.express();
        const req = {
          headers: { 'x-aigos-token': token },
          customAction: 'test',
        };
        const res = { status: vi.fn().mockReturnThis(), json: vi.fn() };
        const next = vi.fn();

        await expressMiddleware(req, res as any, next);

        expect(next).toHaveBeenCalled();
      });
    });
  });

  describe('createA2AMiddleware', () => {
    it('should create middleware instance', () => {
      const middleware = createA2AMiddleware(defaultOptions);
      expect(middleware).toBeInstanceOf(A2AMiddleware);
    });
  });
});
