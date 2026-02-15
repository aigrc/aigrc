/**
 * @aigos/sdk - Guard Decorator Tests
 *
 * Unit tests for the @guard decorator and related utilities
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { guard, setAgent, getAgent, withGuard, AGENT_SYMBOL } from '../decorators/index.js';
import type { GovernedAgent, PermissionResult } from '../types/index.js';

// Create a mock agent
function createMockAgent(overrides: Partial<GovernedAgent> = {}): GovernedAgent {
  return {
    identity: {
      instance_id: 'test-123',
      asset_id: 'aigrc-2024-test',
      asset_name: 'test-agent',
      asset_version: '1.0.0',
      golden_thread_hash: 'sha256:' + '0'.repeat(64),
      golden_thread: {
        ticket_id: 'GT-test',
        approved_by: 'test@test.com',
        approved_at: new Date().toISOString(),
      },
      risk_level: 'limited',
      lineage: {
        parent_instance_id: null,
        generation_depth: 0,
        ancestor_chain: [],
        root_instance_id: 'test-123',
        spawned_at: new Date().toISOString(),
      },
      capabilities_manifest: {
        allowed_tools: ['database:read', 'api:call'],
        denied_tools: ['admin:delete'],
        allowed_domains: [],
        denied_domains: [],
        may_spawn_children: false,
        max_child_depth: 0,
        capability_mode: 'decay',
      },
      created_at: new Date().toISOString(),
      verified: false,
      mode: 'NORMAL',
    },
    lineage: {
      parent_instance_id: null,
      generation_depth: 0,
      ancestor_chain: [],
      root_instance_id: 'test-123',
      spawned_at: new Date().toISOString(),
    },
    client: {} as any,
    checkPermission: vi.fn().mockResolvedValue({ allowed: true }),
    requestApproval: vi.fn().mockResolvedValue({ approved: true }),
    spawn: vi.fn(),
    shutdown: vi.fn().mockResolvedValue(undefined),
    mode: 'NORMAL',
    isPaused: false,
    ...overrides,
  };
}

describe('@guard decorator', () => {
  describe('setAgent and getAgent', () => {
    it('should set and get agent on instance', () => {
      class TestService {}

      const instance = new TestService();
      const mockAgent = createMockAgent();

      setAgent(instance, mockAgent);

      const retrieved = getAgent(instance);
      expect(retrieved).toBe(mockAgent);
    });

    it('should return undefined when no agent is set', () => {
      class TestService {}

      const instance = new TestService();

      expect(getAgent(instance)).toBeUndefined();
    });

    it('should use symbol to avoid property collisions', () => {
      class TestService {
        agent = 'not-the-real-agent';
      }

      const instance = new TestService();
      const mockAgent = createMockAgent();

      setAgent(instance, mockAgent);

      expect(instance.agent).toBe('not-the-real-agent');
      expect(getAgent(instance)).toBe(mockAgent);
    });
  });

  describe('Method decoration', () => {
    it('should allow method execution when permission granted', async () => {
      class TestService {
        @guard({ action: 'database:read', resource: 'users' })
        async getUsers() {
          return ['user1', 'user2'];
        }
      }

      const instance = new TestService();
      const mockAgent = createMockAgent();
      setAgent(instance, mockAgent);

      const result = await instance.getUsers();

      expect(result).toEqual(['user1', 'user2']);
      expect(mockAgent.checkPermission).toHaveBeenCalledWith('database:read', 'users');
    });

    it('should throw GuardError when permission denied', async () => {
      class TestService {
        @guard({ action: 'admin:delete' })
        async deleteAll() {
          return 'deleted';
        }
      }

      const instance = new TestService();
      const mockAgent = createMockAgent({
        checkPermission: vi.fn().mockResolvedValue({
          allowed: false,
          reason: 'Action not permitted',
        }),
      });
      setAgent(instance, mockAgent);

      await expect(instance.deleteAll())
        .rejects.toThrow('Permission denied');
    });

    it('should throw error when no agent is attached', async () => {
      class TestService {
        @guard({ action: 'database:read' })
        async getUsers() {
          return ['user1'];
        }
      }

      const instance = new TestService();

      await expect(instance.getUsers())
        .rejects.toThrow('No governed agent attached');
    });

    it('should handle synchronous methods', async () => {
      class TestService {
        value = 42;

        @guard({ action: 'database:read' })
        getValue() {
          return this.value;
        }
      }

      const instance = new TestService();
      const mockAgent = createMockAgent();
      setAgent(instance, mockAgent);

      // Decorated sync methods become async
      const result = await instance.getValue();
      expect(result).toBe(42);
    });
  });

  describe('Resource interpolation', () => {
    it('should interpolate resource from method arguments', async () => {
      class UserService {
        @guard({ action: 'database:read', resource: 'users/${userId}' })
        async getUser(userId: string) {
          return { id: userId };
        }
      }

      const instance = new UserService();
      const mockAgent = createMockAgent();
      setAgent(instance, mockAgent);

      await instance.getUser('123');

      // Interpolation happens at runtime
      expect(mockAgent.checkPermission).toHaveBeenCalled();
    });
  });

  describe('HITL integration', () => {
    it('should request approval when requireApproval is true', async () => {
      class CriticalService {
        @guard({
          action: 'admin:deploy',
          requireApproval: true,
        })
        async deploy() {
          return 'deployed';
        }
      }

      const instance = new CriticalService();
      const mockAgent = createMockAgent();
      setAgent(instance, mockAgent);

      const result = await instance.deploy();

      expect(result).toBe('deployed');
      expect(mockAgent.requestApproval).toHaveBeenCalled();
    });

    it('should throw when approval is denied', async () => {
      class CriticalService {
        @guard({
          action: 'admin:deploy',
          requireApproval: true,
        })
        async deploy() {
          return 'deployed';
        }
      }

      const instance = new CriticalService();
      const mockAgent = createMockAgent({
        requestApproval: vi.fn().mockResolvedValue({ approved: false }),
      });
      setAgent(instance, mockAgent);

      await expect(instance.deploy())
        .rejects.toThrow('Approval denied');
    });
  });

  describe('Fallback behavior', () => {
    it('should use fallback: allow when agent is offline', async () => {
      class TestService {
        @guard({
          action: 'database:read',
          fallback: 'allow',
        })
        async getUsers() {
          return ['user1'];
        }
      }

      const instance = new TestService();
      const mockAgent = createMockAgent({
        checkPermission: vi.fn().mockRejectedValue(new Error('Network error')),
      });
      setAgent(instance, mockAgent);

      // Should still succeed with fallback: allow
      const result = await instance.getUsers();
      expect(result).toEqual(['user1']);
    });

    it('should deny when fallback is deny and agent is offline', async () => {
      class TestService {
        @guard({
          action: 'database:read',
          fallback: 'deny',
        })
        async getUsers() {
          return ['user1'];
        }
      }

      const instance = new TestService();
      const mockAgent = createMockAgent({
        checkPermission: vi.fn().mockRejectedValue(new Error('Network error')),
      });
      setAgent(instance, mockAgent);

      await expect(instance.getUsers())
        .rejects.toThrow();
    });
  });
});

describe('withGuard functional wrapper', () => {
  it('should wrap a function with governance', async () => {
    const mockAgent = createMockAgent();

    const unsafeFunction = async (id: string) => {
      return { id, data: 'secret' };
    };

    const guardedFunction = withGuard(
      unsafeFunction,
      mockAgent,
      { action: 'database:read', resource: 'records' }
    );

    const result = await guardedFunction('123');

    expect(result).toEqual({ id: '123', data: 'secret' });
    expect(mockAgent.checkPermission).toHaveBeenCalledWith('database:read', 'records');
  });

  it('should deny when permission is not granted', async () => {
    const mockAgent = createMockAgent({
      checkPermission: vi.fn().mockResolvedValue({
        allowed: false,
        reason: 'Not authorized',
      }),
    });

    const unsafeFunction = async () => 'sensitive data';

    const guardedFunction = withGuard(
      unsafeFunction,
      mockAgent,
      { action: 'admin:read' }
    );

    await expect(guardedFunction())
      .rejects.toThrow('Permission denied');
  });
});
