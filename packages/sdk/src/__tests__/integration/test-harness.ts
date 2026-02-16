/**
 * @aigos/sdk - Integration Test Harness
 *
 * Provides utilities for integration testing governed agents
 * with mock Control Plane, telemetry collection, and assertion helpers.
 */

import { EventEmitter } from 'events';
import type {
  GovernedAgent,
  GovernedAgentConfig,
  PermissionResult,
  ApprovalResult,
  ApprovalRequest,
  KillSwitchCommand,
} from '../../types/index.js';
import type { RuntimeIdentity, GoldenThread } from '@aigrc/core';

/**
 * Mock Control Plane server for integration testing
 */
export class MockControlPlane extends EventEmitter {
  private agents: Map<string, RuntimeIdentity> = new Map();
  private policies: Map<string, PolicyRule[]> = new Map();
  private pendingApprovals: Map<string, ApprovalRequest> = new Map();
  private killSwitchSubscribers: Map<string, (cmd: KillSwitchCommand) => void> = new Map();

  /**
   * Simulated endpoint URL
   */
  readonly endpoint = 'http://localhost:9999';

  /**
   * Valid API keys for testing
   */
  readonly validApiKeys = new Set(['test-api-key', 'integration-key']);

  /**
   * Reset all state
   */
  reset() {
    this.agents.clear();
    this.policies.clear();
    this.pendingApprovals.clear();
    this.killSwitchSubscribers.clear();
  }

  /**
   * Register an agent
   */
  registerAgent(identity: RuntimeIdentity, apiKey: string): { success: boolean; error?: string } {
    if (!this.validApiKeys.has(apiKey)) {
      return { success: false, error: 'Invalid API key' };
    }

    this.agents.set(identity.instance_id, identity);
    this.emit('agent:registered', identity);
    return { success: true };
  }

  /**
   * Check if an agent is registered
   */
  isRegistered(instanceId: string): boolean {
    return this.agents.has(instanceId);
  }

  /**
   * Get all registered agents
   */
  getRegisteredAgents(): RuntimeIdentity[] {
    return Array.from(this.agents.values());
  }

  /**
   * Add a policy rule
   */
  addPolicy(agentId: string, rule: PolicyRule) {
    const rules = this.policies.get(agentId) || [];
    rules.push(rule);
    this.policies.set(agentId, rules);
  }

  /**
   * Evaluate permission against policies
   */
  evaluatePermission(instanceId: string, action: string, resource?: string): PermissionResult {
    const rules = this.policies.get(instanceId) || [];

    for (const rule of rules) {
      if (this.matchesAction(action, rule.action)) {
        if (!resource || !rule.resource || this.matchesResource(resource, rule.resource)) {
          return {
            allowed: rule.effect === 'allow',
            reason: rule.reason,
            policy_id: rule.id,
          };
        }
      }
    }

    // Default: no matching policy, allow
    return { allowed: true };
  }

  private matchesAction(action: string, pattern: string): boolean {
    if (pattern === '*') return true;
    if (pattern.endsWith(':*')) {
      const prefix = pattern.slice(0, -2);
      return action.startsWith(prefix + ':');
    }
    return action === pattern;
  }

  private matchesResource(resource: string, pattern: string): boolean {
    if (pattern === '*') return true;
    return resource === pattern || resource.startsWith(pattern + '/');
  }

  /**
   * Request HITL approval
   */
  async requestApproval(instanceId: string, request: ApprovalRequest): Promise<string> {
    const requestId = `req-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    this.pendingApprovals.set(requestId, request);
    this.emit('approval:requested', { requestId, instanceId, request });
    return requestId;
  }

  /**
   * Get pending approval requests
   */
  getPendingApprovals(): Map<string, ApprovalRequest> {
    return new Map(this.pendingApprovals);
  }

  /**
   * Approve a pending request
   */
  approveRequest(requestId: string, approvedBy: string = 'test@test.com'): ApprovalResult {
    if (!this.pendingApprovals.has(requestId)) {
      return { approved: false, reason: 'Request not found' };
    }

    this.pendingApprovals.delete(requestId);
    const result: ApprovalResult = {
      approved: true,
      approvedBy,
      approvedAt: new Date().toISOString(),
    };
    this.emit('approval:approved', { requestId, result });
    return result;
  }

  /**
   * Reject a pending request
   */
  rejectRequest(requestId: string, reason: string = 'Rejected by test'): ApprovalResult {
    this.pendingApprovals.delete(requestId);
    const result: ApprovalResult = {
      approved: false,
      reason,
    };
    this.emit('approval:rejected', { requestId, result });
    return result;
  }

  /**
   * Subscribe to kill switch commands
   */
  subscribeKillSwitch(instanceId: string, handler: (cmd: KillSwitchCommand) => void): () => void {
    this.killSwitchSubscribers.set(instanceId, handler);
    return () => {
      this.killSwitchSubscribers.delete(instanceId);
    };
  }

  /**
   * Send kill switch command to an agent
   */
  sendKillSwitchCommand(instanceId: string, command: KillSwitchCommand) {
    const handler = this.killSwitchSubscribers.get(instanceId);
    if (handler) {
      handler(command);
      this.emit('killswitch:sent', { instanceId, command });
    }
  }

  /**
   * Send kill switch command to all agents
   */
  sendKillSwitchToAll(command: KillSwitchCommand) {
    for (const [instanceId, handler] of this.killSwitchSubscribers) {
      handler(command);
      this.emit('killswitch:sent', { instanceId, command });
    }
  }
}

/**
 * Policy rule for testing
 */
export interface PolicyRule {
  id: string;
  action: string;
  resource?: string;
  effect: 'allow' | 'deny';
  reason?: string;
}

/**
 * Telemetry collector for testing
 */
export class TelemetryCollector {
  private events: TelemetryEvent[] = [];

  /**
   * Record a telemetry event
   */
  record(event: TelemetryEvent) {
    this.events.push({
      ...event,
      timestamp: event.timestamp || new Date().toISOString(),
    });
  }

  /**
   * Get all recorded events
   */
  getEvents(): TelemetryEvent[] {
    return [...this.events];
  }

  /**
   * Get events of a specific type
   */
  getEventsByType(type: string): TelemetryEvent[] {
    return this.events.filter(e => e.type === type);
  }

  /**
   * Get events for a specific agent
   */
  getEventsByAgent(instanceId: string): TelemetryEvent[] {
    return this.events.filter(e => e.instanceId === instanceId);
  }

  /**
   * Clear all events
   */
  clear() {
    this.events = [];
  }

  /**
   * Assert that a specific event was recorded
   */
  assertEventRecorded(type: string, predicate?: (event: TelemetryEvent) => boolean): boolean {
    const events = this.getEventsByType(type);
    if (events.length === 0) return false;
    if (!predicate) return true;
    return events.some(predicate);
  }

  /**
   * Get event count
   */
  get count(): number {
    return this.events.length;
  }
}

/**
 * Telemetry event for testing
 */
export interface TelemetryEvent {
  type: string;
  instanceId: string;
  assetId?: string;
  timestamp?: string;
  data: Record<string, unknown>;
}

/**
 * Test assertions for governed agents
 */
export const AgentAssertions = {
  /**
   * Assert that permission is allowed
   */
  async assertAllowed(agent: GovernedAgent, action: string, resource?: string): Promise<void> {
    const result = await agent.checkPermission(action, resource);
    if (!result.allowed) {
      throw new Error(`Expected permission ${action}${resource ? `:${resource}` : ''} to be allowed, but was denied: ${result.reason}`);
    }
  },

  /**
   * Assert that permission is denied
   */
  async assertDenied(agent: GovernedAgent, action: string, resource?: string): Promise<void> {
    const result = await agent.checkPermission(action, resource);
    if (result.allowed) {
      throw new Error(`Expected permission ${action}${resource ? `:${resource}` : ''} to be denied, but was allowed`);
    }
  },

  /**
   * Assert agent is in specific mode
   */
  assertMode(agent: GovernedAgent, expectedMode: string): void {
    if (agent.mode !== expectedMode) {
      throw new Error(`Expected agent mode to be ${expectedMode}, but was ${agent.mode}`);
    }
  },

  /**
   * Assert agent is paused
   */
  assertPaused(agent: GovernedAgent): void {
    if (!agent.isPaused) {
      throw new Error('Expected agent to be paused, but was not');
    }
  },

  /**
   * Assert agent is not paused
   */
  assertNotPaused(agent: GovernedAgent): void {
    if (agent.isPaused) {
      throw new Error('Expected agent to not be paused, but was');
    }
  },

  /**
   * Assert golden thread matches
   */
  assertGoldenThread(agent: GovernedAgent, expected: Partial<GoldenThread>): void {
    const actual = agent.identity.golden_thread;
    if (expected.ticket_id && actual?.ticket_id !== expected.ticket_id) {
      throw new Error(`Expected ticket_id ${expected.ticket_id}, got ${actual?.ticket_id}`);
    }
    if (expected.approved_by && actual?.approved_by !== expected.approved_by) {
      throw new Error(`Expected approved_by ${expected.approved_by}, got ${actual?.approved_by}`);
    }
  },

  /**
   * Assert lineage depth
   */
  assertLineageDepth(agent: GovernedAgent, expectedDepth: number): void {
    if (agent.lineage.generation_depth !== expectedDepth) {
      throw new Error(`Expected lineage depth ${expectedDepth}, got ${agent.lineage.generation_depth}`);
    }
  },

  /**
   * Assert agent is a child of parent
   */
  assertIsChildOf(child: GovernedAgent, parent: GovernedAgent): void {
    if (child.lineage.parent_instance_id !== parent.identity.instance_id) {
      throw new Error(`Expected child to have parent ${parent.identity.instance_id}, but has ${child.lineage.parent_instance_id}`);
    }
  },
};

/**
 * Test scenario builder for complex integration tests
 */
export class TestScenario {
  private controlPlane: MockControlPlane;
  private telemetry: TelemetryCollector;
  private agents: GovernedAgent[] = [];

  constructor() {
    this.controlPlane = new MockControlPlane();
    this.telemetry = new TelemetryCollector();
  }

  /**
   * Get the mock Control Plane
   */
  getControlPlane(): MockControlPlane {
    return this.controlPlane;
  }

  /**
   * Get the telemetry collector
   */
  getTelemetry(): TelemetryCollector {
    return this.telemetry;
  }

  /**
   * Register an agent for cleanup
   */
  registerAgent(agent: GovernedAgent) {
    this.agents.push(agent);
  }

  /**
   * Setup policies for testing
   */
  setupPolicies(instanceId: string, rules: PolicyRule[]) {
    for (const rule of rules) {
      this.controlPlane.addPolicy(instanceId, rule);
    }
  }

  /**
   * Simulate network failure
   */
  simulateNetworkFailure() {
    // In real implementation, this would make the mock Control Plane reject connections
    this.controlPlane.emit('network:failure');
  }

  /**
   * Simulate network recovery
   */
  simulateNetworkRecovery() {
    this.controlPlane.emit('network:recovery');
  }

  /**
   * Wait for a specific event
   */
  async waitForEvent(eventName: string, timeout: number = 5000): Promise<unknown> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Timeout waiting for event: ${eventName}`));
      }, timeout);

      this.controlPlane.once(eventName, (data) => {
        clearTimeout(timer);
        resolve(data);
      });
    });
  }

  /**
   * Cleanup all resources
   */
  async cleanup() {
    for (const agent of this.agents) {
      await agent.shutdown();
    }
    this.agents = [];
    this.controlPlane.reset();
    this.telemetry.clear();
  }
}

/**
 * Create a test scenario
 */
export function createTestScenario(): TestScenario {
  return new TestScenario();
}

/**
 * Wait for a specified duration
 */
export function wait(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Retry a function until it succeeds or times out
 */
export async function retry<T>(
  fn: () => Promise<T>,
  options: { maxAttempts?: number; delay?: number } = {}
): Promise<T> {
  const { maxAttempts = 3, delay = 100 } = options;
  let lastError: Error | undefined;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      if (attempt < maxAttempts) {
        await wait(delay);
      }
    }
  }

  throw lastError;
}
