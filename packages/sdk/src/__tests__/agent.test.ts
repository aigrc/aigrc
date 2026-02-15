/**
 * @aigos/sdk - Governed Agent Tests
 *
 * Unit tests for the createGovernedAgent factory function
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createGovernedAgent } from '../agent.js';
import type { GovernedAgentConfig, GovernedAgent } from '../types/index.js';

// Mock the client module
vi.mock('../client/index.js', () => ({
  createControlPlaneClient: vi.fn(() => ({
    register: vi.fn().mockResolvedValue({ success: true }),
    disconnect: vi.fn().mockResolvedValue(undefined),
    subscribeKillSwitch: vi.fn(() => vi.fn()),
    requestHITL: vi.fn().mockResolvedValue({ approved: true }),
    isConnected: true,
  })),
}));

// Mock telemetry module
vi.mock('../telemetry/index.js', () => ({
  createTelemetryManager: vi.fn(() => ({
    flush: vi.fn().mockResolvedValue(undefined),
  })),
}));

describe('createGovernedAgent', () => {
  const baseConfig: GovernedAgentConfig = {
    name: 'test-agent',
    version: '1.0.0',
    controlPlane: 'https://cp.aigos.io',
    apiKey: 'test-api-key',
    capabilities: {
      allowed_tools: ['database:read', 'api:call'],
      denied_tools: ['admin:delete'],
    },
  };

  let agent: GovernedAgent;

  afterEach(async () => {
    if (agent) {
      await agent.shutdown();
    }
  });

  describe('Agent Creation', () => {
    it('should create an agent with valid identity', async () => {
      agent = await createGovernedAgent(baseConfig);

      expect(agent.identity).toBeDefined();
      expect(agent.identity.instance_id).toBeDefined();
      expect(agent.identity.asset_name).toBe('test-agent');
      expect(agent.identity.asset_version).toBe('1.0.0');
    });

    it('should generate valid asset_id in AIGRC format', async () => {
      agent = await createGovernedAgent(baseConfig);

      expect(agent.identity.asset_id).toMatch(/^aigrc-\d{4}-[a-f0-9]{8}$/);
    });

    it('should create root lineage for parent-less agent', async () => {
      agent = await createGovernedAgent(baseConfig);

      expect(agent.lineage.parent_instance_id).toBeNull();
      expect(agent.lineage.generation_depth).toBe(0);
      expect(agent.lineage.ancestor_chain).toHaveLength(0);
      expect(agent.lineage.root_instance_id).toBe(agent.identity.instance_id);
    });

    it('should set default capabilities', async () => {
      agent = await createGovernedAgent({
        name: 'minimal-agent',
      });

      expect(agent.identity.capabilities_manifest.allowed_tools).toEqual([]);
      expect(agent.identity.capabilities_manifest.denied_tools).toEqual([]);
      expect(agent.identity.capabilities_manifest.may_spawn_children).toBe(false);
    });

    it('should use provided capabilities', async () => {
      agent = await createGovernedAgent(baseConfig);

      expect(agent.identity.capabilities_manifest.allowed_tools).toContain('database:read');
      expect(agent.identity.capabilities_manifest.allowed_tools).toContain('api:call');
      expect(agent.identity.capabilities_manifest.denied_tools).toContain('admin:delete');
    });
  });

  describe('Permission Checking', () => {
    it('should allow actions in allowed_tools', async () => {
      agent = await createGovernedAgent(baseConfig);

      const result = await agent.checkPermission('database:read', 'users');
      expect(result.allowed).toBe(true);
    });

    it('should deny actions in denied_tools', async () => {
      agent = await createGovernedAgent(baseConfig);

      const result = await agent.checkPermission('admin:delete');
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('explicitly denied');
    });

    it('should deny actions not in allowed_tools', async () => {
      agent = await createGovernedAgent(baseConfig);

      const result = await agent.checkPermission('filesystem:write');
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('not in allowed_tools');
    });

    it('should deny all permissions when agent is paused', async () => {
      // Create agent with kill switch callback to capture pause
      let pauseCallback: Function | null = null;
      const mockClient = {
        register: vi.fn().mockResolvedValue({ success: true }),
        disconnect: vi.fn().mockResolvedValue(undefined),
        subscribeKillSwitch: vi.fn((cb) => {
          pauseCallback = cb;
          return vi.fn();
        }),
        requestHITL: vi.fn().mockResolvedValue({ approved: true }),
        isConnected: true,
      };

      vi.mocked(await import('../client/index.js')).createControlPlaneClient.mockReturnValue(mockClient as any);

      agent = await createGovernedAgent({
        ...baseConfig,
        killSwitch: { enabled: true },
      });

      // Simulate pause command
      if (pauseCallback) {
        await pauseCallback({ command: 'pause', reason: 'Test pause' });
      }

      const result = await agent.checkPermission('database:read');
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('paused');
    });

    it('should allow wildcard permissions', async () => {
      agent = await createGovernedAgent({
        ...baseConfig,
        capabilities: {
          allowed_tools: ['database:*'],
        },
      });

      const result = await agent.checkPermission('database:write');
      expect(result.allowed).toBe(true);
    });

    it('should allow global wildcard permission', async () => {
      agent = await createGovernedAgent({
        ...baseConfig,
        capabilities: {
          allowed_tools: ['*'],
        },
      });

      const result = await agent.checkPermission('anything:goes');
      expect(result.allowed).toBe(true);
    });
  });

  describe('Child Spawning', () => {
    it('should spawn child agent when allowed', async () => {
      agent = await createGovernedAgent({
        ...baseConfig,
        capabilities: {
          ...baseConfig.capabilities,
          may_spawn_children: true,
          max_child_depth: 3,
        },
      });

      const child = await agent.spawn({ name: 'child-agent' });

      expect(child.identity.asset_name).toBe('child-agent');
      expect(child.lineage.parent_instance_id).toBe(agent.identity.instance_id);
      expect(child.lineage.generation_depth).toBe(1);

      await child.shutdown();
    });

    it('should reject spawn when not allowed', async () => {
      agent = await createGovernedAgent({
        ...baseConfig,
        capabilities: {
          ...baseConfig.capabilities,
          may_spawn_children: false,
        },
      });

      await expect(agent.spawn({ name: 'child' }))
        .rejects.toThrow('not allowed to spawn children');
    });

    it('should reject spawn when max depth reached', async () => {
      agent = await createGovernedAgent({
        ...baseConfig,
        capabilities: {
          ...baseConfig.capabilities,
          may_spawn_children: true,
          max_child_depth: 0,
        },
      });

      await expect(agent.spawn({ name: 'child' }))
        .rejects.toThrow('Maximum spawn depth');
    });

    it('should apply capability decay to child agents', async () => {
      agent = await createGovernedAgent({
        ...baseConfig,
        capabilities: {
          allowed_tools: ['database:read'],
          may_spawn_children: true,
          max_child_depth: 3,
          capability_mode: 'decay',
          max_cost_per_session: 100,
        },
      });

      const child = await agent.spawn({ name: 'child-agent' });

      // 80% decay: 100 * 0.8 = 80
      expect(child.identity.capabilities_manifest.max_cost_per_session).toBe(80);

      await child.shutdown();
    });

    it('should inherit capabilities with inherit mode', async () => {
      agent = await createGovernedAgent({
        ...baseConfig,
        capabilities: {
          allowed_tools: ['database:read'],
          may_spawn_children: true,
          max_child_depth: 3,
          capability_mode: 'inherit',
          max_cost_per_session: 100,
        },
      });

      const child = await agent.spawn({ name: 'child-agent' });

      expect(child.identity.capabilities_manifest.max_cost_per_session).toBe(100);

      await child.shutdown();
    });
  });

  describe('Golden Thread', () => {
    it('should create placeholder golden thread when not provided', async () => {
      agent = await createGovernedAgent(baseConfig);

      expect(agent.identity.golden_thread).toBeDefined();
      expect(agent.identity.golden_thread?.ticket_id).toMatch(/^GT-/);
      expect(agent.identity.golden_thread?.approved_by).toBe('system@aigos.io');
    });

    it('should use provided golden thread', async () => {
      agent = await createGovernedAgent({
        ...baseConfig,
        goldenThread: {
          ticket_id: 'JIRA-123',
          approved_by: 'approver@company.com',
          approved_at: '2024-01-01T00:00:00Z',
        },
      });

      expect(agent.identity.golden_thread?.ticket_id).toBe('JIRA-123');
      expect(agent.identity.golden_thread?.approved_by).toBe('approver@company.com');
    });

    it('should generate golden thread hash', async () => {
      agent = await createGovernedAgent(baseConfig);

      expect(agent.identity.golden_thread_hash).toMatch(/^sha256:[a-f0-9]{64}$/);
    });
  });

  describe('Shutdown', () => {
    it('should gracefully shutdown', async () => {
      agent = await createGovernedAgent(baseConfig);

      await agent.shutdown();

      // After shutdown, permissions should be denied
      const result = await agent.checkPermission('database:read');
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('shutdown');
    });

    it('should be idempotent', async () => {
      agent = await createGovernedAgent(baseConfig);

      await agent.shutdown();
      await expect(agent.shutdown()).resolves.toBeUndefined();
    });
  });

  describe('Operating Modes', () => {
    it('should default to NORMAL mode', async () => {
      agent = await createGovernedAgent(baseConfig);

      expect(agent.mode).toBe('NORMAL');
    });

    it('should respect configured mode', async () => {
      agent = await createGovernedAgent({
        ...baseConfig,
        mode: 'DEGRADED',
      });

      expect(agent.mode).toBe('DEGRADED');
    });
  });
});
