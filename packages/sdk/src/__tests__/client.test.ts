/**
 * @aigos/sdk - Control Plane Client Tests
 *
 * Unit tests for the Control Plane client
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createControlPlaneClient, ControlPlaneClientImpl } from '../client/index.js';
import type { RuntimeIdentity } from '@aigrc/core';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('ControlPlaneClient', () => {
  const mockIdentity: RuntimeIdentity = {
    instance_id: 'test-instance-123',
    asset_id: 'aigrc-2024-test',
    asset_name: 'test-agent',
    asset_version: '1.0.0',
    golden_thread_hash: 'sha256:' + '0'.repeat(64),
    golden_thread: {
      ticket_id: 'GT-123',
      approved_by: 'approver@test.com',
      approved_at: '2024-01-01T00:00:00Z',
    },
    risk_level: 'limited',
    lineage: {
      parent_instance_id: null,
      generation_depth: 0,
      ancestor_chain: [],
      root_instance_id: 'test-instance-123',
      spawned_at: '2024-01-01T00:00:00Z',
    },
    capabilities_manifest: {
      allowed_tools: ['database:read'],
      denied_tools: [],
      allowed_domains: [],
      denied_domains: [],
      may_spawn_children: false,
      max_child_depth: 0,
      capability_mode: 'decay',
    },
    created_at: '2024-01-01T00:00:00Z',
    verified: false,
    mode: 'NORMAL',
  };

  beforeEach(() => {
    mockFetch.mockReset();
  });

  describe('createControlPlaneClient', () => {
    it('should create client with correct configuration', () => {
      const client = createControlPlaneClient({
        endpoint: 'https://cp.aigos.io',
        apiKey: 'test-key',
        identity: mockIdentity,
      });

      expect(client).toBeDefined();
      expect(client.isConnected).toBe(false);
    });

    it('should handle missing endpoint gracefully', () => {
      const client = createControlPlaneClient({
        identity: mockIdentity,
      });

      expect(client).toBeDefined();
    });
  });

  describe('register', () => {
    it('should register agent with Control Plane', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          instanceId: 'test-instance-123',
        }),
      });

      const client = createControlPlaneClient({
        endpoint: 'https://cp.aigos.io',
        apiKey: 'test-key',
        identity: mockIdentity,
      });

      const result = await client.register();

      expect(result.success).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://cp.aigos.io/api/v1/agents/register',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Authorization': 'Bearer test-key',
            'Content-Type': 'application/json',
          }),
        })
      );
    });

    it('should handle registration failure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
      });

      const client = createControlPlaneClient({
        endpoint: 'https://cp.aigos.io',
        apiKey: 'invalid-key',
        identity: mockIdentity,
      });

      await expect(client.register())
        .rejects.toThrow('Registration failed');
    });

    it('should handle network errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const client = createControlPlaneClient({
        endpoint: 'https://cp.aigos.io',
        apiKey: 'test-key',
        identity: mockIdentity,
      });

      await expect(client.register())
        .rejects.toThrow('Network error');
    });
  });

  describe('requestHITL', () => {
    it('should request human approval', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          approved: true,
          approvedBy: 'admin@test.com',
          approvedAt: '2024-01-01T00:00:00Z',
        }),
      });

      const client = createControlPlaneClient({
        endpoint: 'https://cp.aigos.io',
        apiKey: 'test-key',
        identity: mockIdentity,
      });

      const result = await client.requestHITL({
        action: 'database:delete',
        resource: 'users',
        reason: 'Bulk cleanup operation',
        timeout: 300000,
      });

      expect(result.approved).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://cp.aigos.io/api/v1/hitl/request',
        expect.objectContaining({
          method: 'POST',
        })
      );
    });

    it('should handle approval timeout', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          approved: false,
          timedOut: true,
        }),
      });

      const client = createControlPlaneClient({
        endpoint: 'https://cp.aigos.io',
        apiKey: 'test-key',
        identity: mockIdentity,
      });

      const result = await client.requestHITL({
        action: 'admin:deploy',
        timeout: 5000,
      });

      expect(result.approved).toBe(false);
      expect(result.timedOut).toBe(true);
    });

    it('should apply fallback when offline', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network offline'));

      const client = createControlPlaneClient({
        endpoint: 'https://cp.aigos.io',
        apiKey: 'test-key',
        identity: mockIdentity,
      });

      const result = await client.requestHITL({
        action: 'database:read',
        fallback: 'allow',
      });

      // Should return based on fallback
      expect(result.timedOut).toBe(true);
      expect(result.approved).toBe(true);
    });
  });

  describe('subscribeKillSwitch', () => {
    it('should subscribe to kill switch commands', () => {
      const client = createControlPlaneClient({
        endpoint: 'https://cp.aigos.io',
        apiKey: 'test-key',
        identity: mockIdentity,
      });

      const handler = vi.fn();
      const unsubscribe = client.subscribeKillSwitch(handler);

      expect(typeof unsubscribe).toBe('function');
    });

    it('should unsubscribe from kill switch', () => {
      const client = createControlPlaneClient({
        endpoint: 'https://cp.aigos.io',
        apiKey: 'test-key',
        identity: mockIdentity,
      });

      const handler = vi.fn();
      const unsubscribe = client.subscribeKillSwitch(handler);

      // Should not throw
      expect(() => unsubscribe()).not.toThrow();
    });
  });

  describe('disconnect', () => {
    it('should disconnect from Control Plane', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      });

      const client = createControlPlaneClient({
        endpoint: 'https://cp.aigos.io',
        apiKey: 'test-key',
        identity: mockIdentity,
      });

      // Register first
      await client.register();

      // Then disconnect
      await client.disconnect();

      expect(client.isConnected).toBe(false);
    });
  });

  describe('heartbeat', () => {
    it('should send heartbeat to maintain connection', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      });

      const client = createControlPlaneClient({
        endpoint: 'https://cp.aigos.io',
        apiKey: 'test-key',
        identity: mockIdentity,
        heartbeatInterval: 100, // Short interval for testing
      });

      await client.register();

      // Wait for at least one heartbeat
      await new Promise(resolve => setTimeout(resolve, 150));

      // Should have called endpoint multiple times (register + heartbeat)
      expect(mockFetch.mock.calls.length).toBeGreaterThanOrEqual(2);

      await client.disconnect();
    });
  });
});
