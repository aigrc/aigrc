/**
 * CGA Verification Engine Tests
 */

import { describe, it, expect } from 'vitest';
import {
  VerificationEngine,
  type VerificationResult,
  type VerificationReport,
} from './verification-engine';

describe('CGA Verification Engine', () => {
  describe('VerificationEngine', () => {
    it('should create engine with default checks', () => {
      const engine = new VerificationEngine();
      expect(engine).toBeDefined();
    });

    it('should run verification for BRONZE level', async () => {
      const engine = new VerificationEngine();
      const report = await engine.verify({
        assetCardPath: './test-asset.yaml',
        targetLevel: 'BRONZE',
      });

      expect(report).toBeDefined();
      expect(report.target_level).toBe('BRONZE');
      expect(report.timestamp).toBeDefined();
      expect(report.checks).toBeInstanceOf(Array);
      expect(report.summary).toBeDefined();
      expect(report.summary.total).toBeGreaterThan(0);
    });

    it('should run verification for SILVER level', async () => {
      const engine = new VerificationEngine();
      const report = await engine.verify({
        assetCardPath: './test-asset.yaml',
        targetLevel: 'SILVER',
      });

      expect(report.target_level).toBe('SILVER');
      // SILVER has more checks than BRONZE
      expect(report.summary.total).toBeGreaterThanOrEqual(3);
    });

    it('should run verification for GOLD level', async () => {
      const engine = new VerificationEngine();
      const report = await engine.verify({
        assetCardPath: './test-asset.yaml',
        targetLevel: 'GOLD',
      });

      expect(report.target_level).toBe('GOLD');
      // GOLD has compliance checks
      const complianceCheck = report.checks.find((c) =>
        c.check.startsWith('compliance')
      );
      expect(complianceCheck).toBeDefined();
    });

    it('should run verification for PLATINUM level', async () => {
      const engine = new VerificationEngine();
      const report = await engine.verify({
        assetCardPath: './test-asset.yaml',
        targetLevel: 'PLATINUM',
      });

      expect(report.target_level).toBe('PLATINUM');
      expect(report.summary.total).toBeGreaterThanOrEqual(5);
    });

    it('should include identity checks for all levels', async () => {
      const engine = new VerificationEngine();
      const report = await engine.verify({
        assetCardPath: './test-asset.yaml',
        targetLevel: 'BRONZE',
      });

      const identityChecks = report.checks.filter((c) =>
        c.check.startsWith('identity')
      );
      expect(identityChecks.length).toBeGreaterThan(0);
    });

    it('should include kill switch checks', async () => {
      const engine = new VerificationEngine();
      const report = await engine.verify({
        assetCardPath: './test-asset.yaml',
        targetLevel: 'BRONZE',
      });

      const killSwitchChecks = report.checks.filter((c) =>
        c.check.startsWith('kill_switch')
      );
      expect(killSwitchChecks.length).toBeGreaterThan(0);
    });

    it('should calculate correct summary', async () => {
      const engine = new VerificationEngine();
      const report = await engine.verify({
        assetCardPath: './test-asset.yaml',
        targetLevel: 'SILVER',
      });

      const { summary } = report;
      expect(summary.total).toBe(
        summary.passed + summary.failed + summary.skipped + summary.warnings
      );
    });

    it('should achieve target level when all checks pass', async () => {
      const engine = new VerificationEngine();
      const report = await engine.verify({
        assetCardPath: './test-asset.yaml',
        targetLevel: 'BRONZE',
      });

      // Default checks return PASS, so we should achieve the level
      expect(report.achieved_level).toBe('BRONZE');
    });

    it('should accept runtime config', async () => {
      const engine = new VerificationEngine();
      const report = await engine.verify({
        assetCardPath: './test-asset.yaml',
        targetLevel: 'SILVER',
        runtimeConfig: {
          kill_switch: {
            endpoint: 'https://agent.example.com/ks',
          },
        },
      });

      expect(report).toBeDefined();
    });
  });

  describe('VerificationResult', () => {
    it('should have correct status values', async () => {
      const engine = new VerificationEngine();
      const report = await engine.verify({
        assetCardPath: './test-asset.yaml',
        targetLevel: 'BRONZE',
      });

      for (const check of report.checks) {
        expect(['PASS', 'FAIL', 'SKIP', 'WARN']).toContain(check.status);
        expect(check.check).toBeDefined();
        expect(check.message).toBeDefined();
      }
    });
  });

  describe('VerificationReport', () => {
    it('should have valid timestamp', async () => {
      const engine = new VerificationEngine();
      const report = await engine.verify({
        assetCardPath: './test-asset.yaml',
        targetLevel: 'BRONZE',
      });

      const timestamp = new Date(report.timestamp);
      expect(timestamp.getTime()).not.toBeNaN();
      expect(timestamp.getTime()).toBeLessThanOrEqual(Date.now());
    });

    it('should include achieved level or null', async () => {
      const engine = new VerificationEngine();
      const report = await engine.verify({
        assetCardPath: './test-asset.yaml',
        targetLevel: 'SILVER',
      });

      if (report.achieved_level !== null) {
        expect(['BRONZE', 'SILVER', 'GOLD', 'PLATINUM']).toContain(
          report.achieved_level
        );
      }
    });
  });
});
