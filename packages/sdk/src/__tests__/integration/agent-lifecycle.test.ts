/**
 * @aigos/sdk - Agent Lifecycle Integration Tests
 *
 * Tests the full lifecycle of governed agents including
 * creation, permission checking, spawning, and shutdown.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createGovernedAgent } from '../../agent.js';
import {
  createTestScenario,
  AgentAssertions,
  wait,
  type TestScenario,
} from './test-harness.js';

describe('Agent Lifecycle Integration', () => {
  let scenario: TestScenario;

  beforeEach(() => {
    scenario = createTestScenario();
  });

  afterEach(async () => {
    await scenario.cleanup();
  });

  describe('Agent Creation and Registration', () => {
    it('should create agent with unique instance ID', async () => {
      const agent1 = await createGovernedAgent({ name: 'agent-1' });
      const agent2 = await createGovernedAgent({ name: 'agent-2' });

      scenario.registerAgent(agent1);
      scenario.registerAgent(agent2);

      expect(agent1.identity.instance_id).not.toBe(agent2.identity.instance_id);
    });

    it('should generate valid asset ID format', async () => {
      const agent = await createGovernedAgent({ name: 'test-agent' });
      scenario.registerAgent(agent);

      expect(agent.identity.asset_id).toMatch(/^aigrc-\d{4}-[a-f0-9]{8}$/);
    });

    it('should set default capabilities when not provided', async () => {
      const agent = await createGovernedAgent({ name: 'minimal-agent' });
      scenario.registerAgent(agent);

      expect(agent.identity.capabilities_manifest.allowed_tools).toEqual([]);
      expect(agent.identity.capabilities_manifest.denied_tools).toEqual([]);
      expect(agent.identity.capabilities_manifest.may_spawn_children).toBe(false);
    });

    it('should use provided capabilities', async () => {
      const agent = await createGovernedAgent({
        name: 'capable-agent',
        capabilities: {
          allowed_tools: ['database:read', 'api:call'],
          denied_tools: ['admin:delete'],
          may_spawn_children: true,
          max_child_depth: 3,
        },
      });
      scenario.registerAgent(agent);

      expect(agent.identity.capabilities_manifest.allowed_tools).toContain('database:read');
      expect(agent.identity.capabilities_manifest.denied_tools).toContain('admin:delete');
      expect(agent.identity.capabilities_manifest.may_spawn_children).toBe(true);
    });
  });

  describe('Permission Checking', () => {
    it('should allow actions in allowed_tools', async () => {
      const agent = await createGovernedAgent({
        name: 'test-agent',
        capabilities: {
          allowed_tools: ['database:read', 'api:call'],
        },
      });
      scenario.registerAgent(agent);

      await AgentAssertions.assertAllowed(agent, 'database:read');
      await AgentAssertions.assertAllowed(agent, 'api:call');
    });

    it('should deny actions in denied_tools', async () => {
      const agent = await createGovernedAgent({
        name: 'test-agent',
        capabilities: {
          allowed_tools: ['database:*'],
          denied_tools: ['database:drop'],
        },
      });
      scenario.registerAgent(agent);

      await AgentAssertions.assertDenied(agent, 'database:drop');
    });

    it('should support wildcard permissions', async () => {
      const agent = await createGovernedAgent({
        name: 'test-agent',
        capabilities: {
          allowed_tools: ['database:*'],
        },
      });
      scenario.registerAgent(agent);

      await AgentAssertions.assertAllowed(agent, 'database:read');
      await AgentAssertions.assertAllowed(agent, 'database:write');
      await AgentAssertions.assertAllowed(agent, 'database:delete');
    });

    it('should deny unknown actions', async () => {
      const agent = await createGovernedAgent({
        name: 'test-agent',
        capabilities: {
          allowed_tools: ['database:read'],
        },
      });
      scenario.registerAgent(agent);

      await AgentAssertions.assertDenied(agent, 'filesystem:write');
    });
  });

  describe('Child Agent Spawning', () => {
    it('should spawn child agent with correct lineage', async () => {
      const parent = await createGovernedAgent({
        name: 'parent-agent',
        capabilities: {
          may_spawn_children: true,
          max_child_depth: 3,
        },
      });
      scenario.registerAgent(parent);

      const child = await parent.spawn({ name: 'child-agent' });
      scenario.registerAgent(child);

      AgentAssertions.assertIsChildOf(child, parent);
      AgentAssertions.assertLineageDepth(child, 1);
      expect(child.lineage.root_instance_id).toBe(parent.identity.instance_id);
    });

    it('should apply capability decay', async () => {
      const parent = await createGovernedAgent({
        name: 'parent-agent',
        capabilities: {
          may_spawn_children: true,
          max_child_depth: 3,
          capability_mode: 'decay',
          max_cost_per_session: 100,
        },
      });
      scenario.registerAgent(parent);

      const child = await parent.spawn({ name: 'child-agent' });
      scenario.registerAgent(child);

      // 80% of 100 = 80
      expect(child.identity.capabilities_manifest.max_cost_per_session).toBe(80);
    });

    it('should reject spawn when not allowed', async () => {
      const agent = await createGovernedAgent({
        name: 'no-spawn-agent',
        capabilities: {
          may_spawn_children: false,
        },
      });
      scenario.registerAgent(agent);

      await expect(agent.spawn({ name: 'child' }))
        .rejects.toThrow('not allowed to spawn children');
    });

    it('should reject spawn at max depth', async () => {
      const root = await createGovernedAgent({
        name: 'root',
        capabilities: {
          may_spawn_children: true,
          max_child_depth: 1,
        },
      });
      scenario.registerAgent(root);

      const child = await root.spawn({ name: 'child' });
      scenario.registerAgent(child);

      // Child is at depth 1, max is 1, so it cannot spawn
      await expect(child.spawn({ name: 'grandchild' }))
        .rejects.toThrow('Maximum spawn depth');
    });

    it('should maintain ancestor chain', async () => {
      const root = await createGovernedAgent({
        name: 'root',
        capabilities: {
          may_spawn_children: true,
          max_child_depth: 3,
        },
      });
      scenario.registerAgent(root);

      const child = await root.spawn({ name: 'child' });
      scenario.registerAgent(child);

      const grandchild = await child.spawn({ name: 'grandchild' });
      scenario.registerAgent(grandchild);

      expect(grandchild.lineage.ancestor_chain).toHaveLength(2);
      expect(grandchild.lineage.ancestor_chain).toContain(root.identity.instance_id);
      expect(grandchild.lineage.ancestor_chain).toContain(child.identity.instance_id);
    });
  });

  describe('Operating Modes', () => {
    it('should default to NORMAL mode', async () => {
      const agent = await createGovernedAgent({ name: 'test-agent' });
      scenario.registerAgent(agent);

      AgentAssertions.assertMode(agent, 'NORMAL');
    });

    it('should respect provided mode', async () => {
      const agent = await createGovernedAgent({
        name: 'degraded-agent',
        mode: 'DEGRADED',
      });
      scenario.registerAgent(agent);

      AgentAssertions.assertMode(agent, 'DEGRADED');
    });
  });

  describe('Shutdown', () => {
    it('should deny permissions after shutdown', async () => {
      const agent = await createGovernedAgent({
        name: 'test-agent',
        capabilities: {
          allowed_tools: ['database:read'],
        },
      });

      await agent.shutdown();

      await AgentAssertions.assertDenied(agent, 'database:read');
    });

    it('should be idempotent', async () => {
      const agent = await createGovernedAgent({ name: 'test-agent' });

      await agent.shutdown();
      await expect(agent.shutdown()).resolves.toBeUndefined();
    });
  });

  describe('Golden Thread', () => {
    it('should create placeholder golden thread when not provided', async () => {
      const agent = await createGovernedAgent({ name: 'test-agent' });
      scenario.registerAgent(agent);

      expect(agent.identity.golden_thread).toBeDefined();
      expect(agent.identity.golden_thread?.ticket_id).toMatch(/^GT-/);
    });

    it('should use provided golden thread', async () => {
      const agent = await createGovernedAgent({
        name: 'test-agent',
        goldenThread: {
          ticket_id: 'JIRA-123',
          approved_by: 'admin@company.com',
          approved_at: '2024-01-01T00:00:00Z',
        },
      });
      scenario.registerAgent(agent);

      AgentAssertions.assertGoldenThread(agent, {
        ticket_id: 'JIRA-123',
        approved_by: 'admin@company.com',
      });
    });

    it('should generate golden thread hash', async () => {
      const agent = await createGovernedAgent({ name: 'test-agent' });
      scenario.registerAgent(agent);

      expect(agent.identity.golden_thread_hash).toMatch(/^sha256:[a-f0-9]{64}$/);
    });
  });
});
