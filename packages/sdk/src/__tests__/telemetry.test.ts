/**
 * @aigos/sdk - Telemetry Tests
 *
 * Unit tests for the telemetry manager
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createTelemetryManager, TelemetryManager } from '../telemetry/index.js';
import type { RuntimeIdentity } from '@aigrc/core';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('TelemetryManager', () => {
  const mockIdentity: RuntimeIdentity = {
    instance_id: 'test-instance-123',
    asset_id: 'aigrc-2024-test',
    asset_name: 'test-agent',
    asset_version: '1.0.0',
    golden_thread_hash: 'sha256:' + '0'.repeat(64),
    golden_thread: {
      ticket_id: 'GT-123',
      approved_by: 'test@test.com',
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

  let telemetry: TelemetryManager;

  beforeEach(() => {
    mockFetch.mockReset();
    mockFetch.mockResolvedValue({ ok: true });
  });

  afterEach(async () => {
    if (telemetry) {
      await telemetry.flush();
    }
  });

  describe('createTelemetryManager', () => {
    it('should create telemetry manager when enabled', () => {
      telemetry = createTelemetryManager(
        { enabled: true },
        mockIdentity
      );

      expect(telemetry).toBeDefined();
      expect(telemetry.isEnabled).toBe(true);
    });

    it('should disable when enabled is false', () => {
      telemetry = createTelemetryManager(
        { enabled: false },
        mockIdentity
      );

      expect(telemetry.isEnabled).toBe(false);
    });

    it('should use provided endpoint', () => {
      telemetry = createTelemetryManager(
        { enabled: true, endpoint: 'https://telemetry.aigos.io' },
        mockIdentity
      );

      expect(telemetry).toBeDefined();
    });
  });

  describe('event tracking', () => {
    it('should track permission check events', () => {
      telemetry = createTelemetryManager(
        { enabled: true },
        mockIdentity
      );

      telemetry.trackPermissionCheck({
        action: 'database:read',
        resource: 'users',
        allowed: true,
      });

      const events = telemetry.getQueuedEvents();
      expect(events.length).toBe(1);
      expect(events[0].type).toBe('permission_check');
      expect(events[0].data.action).toBe('database:read');
    });

    it('should track HITL request events', () => {
      telemetry = createTelemetryManager(
        { enabled: true },
        mockIdentity
      );

      telemetry.trackHITLRequest({
        action: 'admin:deploy',
        approved: true,
        responseTime: 5000,
      });

      const events = telemetry.getQueuedEvents();
      expect(events.length).toBe(1);
      expect(events[0].type).toBe('hitl_request');
    });

    it('should track agent lifecycle events', () => {
      telemetry = createTelemetryManager(
        { enabled: true },
        mockIdentity
      );

      telemetry.trackLifecycle('started');
      telemetry.trackLifecycle('shutdown');

      const events = telemetry.getQueuedEvents();
      expect(events.length).toBe(2);
      expect(events[0].data.event).toBe('started');
      expect(events[1].data.event).toBe('shutdown');
    });

    it('should include agent identity in all events', () => {
      telemetry = createTelemetryManager(
        { enabled: true },
        mockIdentity
      );

      telemetry.trackPermissionCheck({
        action: 'test',
        allowed: true,
      });

      const events = telemetry.getQueuedEvents();
      expect(events[0].instanceId).toBe('test-instance-123');
      expect(events[0].assetId).toBe('aigrc-2024-test');
    });

    it('should not queue events when disabled', () => {
      telemetry = createTelemetryManager(
        { enabled: false },
        mockIdentity
      );

      telemetry.trackPermissionCheck({
        action: 'test',
        allowed: true,
      });

      const events = telemetry.getQueuedEvents();
      expect(events.length).toBe(0);
    });
  });

  describe('flush', () => {
    it('should send queued events to endpoint', async () => {
      telemetry = createTelemetryManager(
        { enabled: true, endpoint: 'https://telemetry.aigos.io' },
        mockIdentity
      );

      telemetry.trackPermissionCheck({
        action: 'database:read',
        allowed: true,
      });

      await telemetry.flush();

      expect(mockFetch).toHaveBeenCalledWith(
        'https://telemetry.aigos.io/events',
        expect.objectContaining({
          method: 'POST',
          body: expect.any(String),
        })
      );
    });

    it('should clear queue after successful flush', async () => {
      telemetry = createTelemetryManager(
        { enabled: true, endpoint: 'https://telemetry.aigos.io' },
        mockIdentity
      );

      telemetry.trackPermissionCheck({
        action: 'test',
        allowed: true,
      });

      await telemetry.flush();

      const events = telemetry.getQueuedEvents();
      expect(events.length).toBe(0);
    });

    it('should retain events on flush failure', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      telemetry = createTelemetryManager(
        { enabled: true, endpoint: 'https://telemetry.aigos.io' },
        mockIdentity
      );

      telemetry.trackPermissionCheck({
        action: 'test',
        allowed: true,
      });

      await telemetry.flush();

      // Events should be retained for retry
      const events = telemetry.getQueuedEvents();
      expect(events.length).toBe(1);
    });

    it('should not attempt flush when disabled', async () => {
      telemetry = createTelemetryManager(
        { enabled: false },
        mockIdentity
      );

      await telemetry.flush();

      expect(mockFetch).not.toHaveBeenCalled();
    });
  });

  describe('batching', () => {
    it('should auto-flush when batch size is reached', async () => {
      telemetry = createTelemetryManager(
        {
          enabled: true,
          endpoint: 'https://telemetry.aigos.io',
          batchSize: 3,
        },
        mockIdentity
      );

      telemetry.trackPermissionCheck({ action: 'test1', allowed: true });
      telemetry.trackPermissionCheck({ action: 'test2', allowed: true });

      // Not flushed yet
      expect(mockFetch).not.toHaveBeenCalled();

      telemetry.trackPermissionCheck({ action: 'test3', allowed: true });

      // Wait for async flush
      await new Promise(resolve => setTimeout(resolve, 50));

      // Should have auto-flushed
      expect(mockFetch).toHaveBeenCalled();
    });
  });

  describe('metrics', () => {
    it('should track custom metrics', () => {
      telemetry = createTelemetryManager(
        { enabled: true },
        mockIdentity
      );

      telemetry.trackMetric('token_usage', 1500, { model: 'gpt-4' });
      telemetry.trackMetric('latency_ms', 250, { operation: 'database_query' });

      const events = telemetry.getQueuedEvents();
      expect(events.length).toBe(2);
      expect(events[0].type).toBe('metric');
      expect(events[0].data.name).toBe('token_usage');
      expect(events[0].data.value).toBe(1500);
    });

    it('should track errors', () => {
      telemetry = createTelemetryManager(
        { enabled: true },
        mockIdentity
      );

      const error = new Error('Something went wrong');
      telemetry.trackError(error, { context: 'permission_check' });

      const events = telemetry.getQueuedEvents();
      expect(events.length).toBe(1);
      expect(events[0].type).toBe('error');
      expect(events[0].data.message).toBe('Something went wrong');
    });
  });

  describe('sampling', () => {
    it('should respect sample rate', () => {
      telemetry = createTelemetryManager(
        {
          enabled: true,
          sampleRate: 0, // 0% sampling = no events
        },
        mockIdentity
      );

      // Track many events
      for (let i = 0; i < 100; i++) {
        telemetry.trackPermissionCheck({ action: `test${i}`, allowed: true });
      }

      // With 0% sample rate, no events should be queued
      const events = telemetry.getQueuedEvents();
      expect(events.length).toBe(0);
    });

    it('should sample 100% by default', () => {
      telemetry = createTelemetryManager(
        { enabled: true },
        mockIdentity
      );

      telemetry.trackPermissionCheck({ action: 'test', allowed: true });

      const events = telemetry.getQueuedEvents();
      expect(events.length).toBe(1);
    });
  });
});
