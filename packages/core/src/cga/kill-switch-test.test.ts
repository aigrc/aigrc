/**
 * CGA Kill Switch Test Protocol Tests
 */

import { describe, it, expect } from 'vitest';
import {
  KillSwitchTestProtocol,
  type KillSwitchConfig,
  type KillSwitchTestResult,
  type ChannelTestResult,
} from './kill-switch-test';

describe('CGA Kill Switch Test Protocol', () => {
  describe('KillSwitchTestProtocol', () => {
    it('should create protocol without options', () => {
      const protocol = new KillSwitchTestProtocol();
      expect(protocol).toBeDefined();
    });

    it('should create protocol with private key', () => {
      const protocol = new KillSwitchTestProtocol({
        privateKey: 'test-private-key',
      });
      expect(protocol).toBeDefined();
    });

    it('should execute test for HTTP polling channel', async () => {
      const protocol = new KillSwitchTestProtocol();
      const config: KillSwitchConfig = {
        channels: [
          {
            type: 'POLLING',
            endpoint: 'http://localhost:3000/kill-switch',
            interval_ms: 1000,
          },
        ],
        timeout_ms: 5000,
      };

      // This will fail because HTTP is not implemented, but should return a result
      const result = await protocol.execute(config);
      expect(result).toBeDefined();
      expect(result.test_id).toBeDefined();
      expect(result.timestamp).toBeDefined();
      expect(result.channels_tested).toBe(1);
      expect(result.results).toHaveLength(1);
    });

    it('should execute test for SSE channel', async () => {
      const protocol = new KillSwitchTestProtocol();
      const config: KillSwitchConfig = {
        channels: [
          {
            type: 'SSE',
            endpoint: 'http://localhost:3000/events',
          },
        ],
      };

      const result = await protocol.execute(config);
      expect(result.channels_tested).toBe(1);
      expect(result.results[0].channel).toBe('SSE');
      // Should fail since SSE is not implemented
      expect(result.results[0].success).toBe(false);
    });

    it('should execute test for WebSocket channel', async () => {
      const protocol = new KillSwitchTestProtocol();
      const config: KillSwitchConfig = {
        channels: [
          {
            type: 'WEBSOCKET',
            endpoint: 'ws://localhost:3000/ws',
          },
        ],
      };

      const result = await protocol.execute(config);
      expect(result.results[0].channel).toBe('WEBSOCKET');
      expect(result.results[0].success).toBe(false);
    });

    it('should execute test for local file channel', async () => {
      const protocol = new KillSwitchTestProtocol();
      const config: KillSwitchConfig = {
        channels: [
          {
            type: 'LOCAL_FILE',
            path: '/tmp/kill-switch',
          },
        ],
      };

      const result = await protocol.execute(config);
      expect(result.results[0].channel).toBe('LOCAL_FILE');
      expect(result.results[0].success).toBe(false);
    });

    it('should test multiple channels', async () => {
      const protocol = new KillSwitchTestProtocol();
      const config: KillSwitchConfig = {
        channels: [
          { type: 'POLLING', endpoint: 'http://localhost:3000/ks' },
          { type: 'SSE', endpoint: 'http://localhost:3000/events' },
          { type: 'WEBSOCKET', endpoint: 'ws://localhost:3000/ws' },
        ],
      };

      const result = await protocol.execute(config);
      expect(result.channels_tested).toBe(3);
      expect(result.results).toHaveLength(3);
    });

    it('should measure latency for each channel', async () => {
      const protocol = new KillSwitchTestProtocol();
      const config: KillSwitchConfig = {
        channels: [
          { type: 'POLLING', endpoint: 'http://localhost:3000/ks' },
        ],
      };

      const result = await protocol.execute(config);
      expect(result.results[0].latency_ms).toBeGreaterThanOrEqual(0);
    });

    it('should include error message on failure', async () => {
      const protocol = new KillSwitchTestProtocol();
      const config: KillSwitchConfig = {
        channels: [
          { type: 'POLLING', endpoint: 'http://localhost:3000/ks' },
        ],
      };

      const result = await protocol.execute(config);
      expect(result.results[0].error).toBeDefined();
    });

    it('should calculate overall success', async () => {
      const protocol = new KillSwitchTestProtocol();
      const config: KillSwitchConfig = {
        channels: [
          { type: 'POLLING', endpoint: 'http://localhost:3000/ks' },
        ],
      };

      const result = await protocol.execute(config);
      expect(typeof result.overall_success).toBe('boolean');
    });

    it('should count passed channels', async () => {
      const protocol = new KillSwitchTestProtocol();
      const config: KillSwitchConfig = {
        channels: [
          { type: 'POLLING', endpoint: 'http://localhost:3000/ks' },
          { type: 'SSE', endpoint: 'http://localhost:3000/events' },
        ],
      };

      const result = await protocol.execute(config);
      expect(result.channels_passed).toBe(
        result.results.filter((r) => r.success).length
      );
    });
  });

  describe('executeMultiple', () => {
    it('should run multiple iterations', async () => {
      const protocol = new KillSwitchTestProtocol();
      const config: KillSwitchConfig = {
        channels: [
          { type: 'POLLING', endpoint: 'http://localhost:3000/ks' },
        ],
        timeout_ms: 1000,
      };

      const result = await protocol.executeMultiple(config, 3);
      expect(result.results).toHaveLength(3);
      expect(result.aggregate.total_tests).toBe(3);
    });

    it('should calculate aggregate statistics', async () => {
      const protocol = new KillSwitchTestProtocol();
      const config: KillSwitchConfig = {
        channels: [
          { type: 'POLLING', endpoint: 'http://localhost:3000/ks' },
        ],
        timeout_ms: 1000,
      };

      const result = await protocol.executeMultiple(config, 3);
      expect(result.aggregate).toBeDefined();
      expect(typeof result.aggregate.passed).toBe('number');
      expect(typeof result.aggregate.failed).toBe('number');
      expect(result.aggregate.passed + result.aggregate.failed).toBe(
        result.aggregate.total_tests
      );
    });

    it('should default to 10 iterations', async () => {
      const protocol = new KillSwitchTestProtocol();
      const config: KillSwitchConfig = {
        channels: [
          { type: 'POLLING', endpoint: 'http://localhost:3000/ks' },
        ],
        timeout_ms: 100,
      };

      const result = await protocol.executeMultiple(config);
      expect(result.results).toHaveLength(10);
    });
  });

  describe('KillSwitchTestResult', () => {
    it('should have correct structure', async () => {
      const protocol = new KillSwitchTestProtocol();
      const config: KillSwitchConfig = {
        channels: [{ type: 'POLLING', endpoint: 'http://localhost:3000/ks' }],
      };

      const result = await protocol.execute(config);

      expect(result.test_id).toBeDefined();
      expect(result.timestamp).toBeDefined();
      expect(typeof result.channels_tested).toBe('number');
      expect(typeof result.channels_passed).toBe('number');
      expect(Array.isArray(result.results)).toBe(true);
      expect(typeof result.overall_success).toBe('boolean');
    });

    it('should have valid timestamp', async () => {
      const protocol = new KillSwitchTestProtocol();
      const config: KillSwitchConfig = {
        channels: [{ type: 'POLLING', endpoint: 'http://localhost:3000/ks' }],
      };

      const result = await protocol.execute(config);
      const timestamp = new Date(result.timestamp);
      expect(timestamp.getTime()).not.toBeNaN();
    });
  });

  describe('ChannelTestResult', () => {
    it('should include channel type', async () => {
      const protocol = new KillSwitchTestProtocol();
      const config: KillSwitchConfig = {
        channels: [{ type: 'SSE', endpoint: 'http://localhost:3000/events' }],
      };

      const result = await protocol.execute(config);
      expect(result.results[0].channel).toBe('SSE');
    });

    it('should include latency measurement', async () => {
      const protocol = new KillSwitchTestProtocol();
      const config: KillSwitchConfig = {
        channels: [{ type: 'POLLING', endpoint: 'http://localhost:3000/ks' }],
      };

      const result = await protocol.execute(config);
      expect(typeof result.results[0].latency_ms).toBe('number');
      expect(result.results[0].latency_ms).toBeGreaterThanOrEqual(0);
    });
  });
});
