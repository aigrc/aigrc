/**
 * @aigrc/core - Certified Governed Agent (CGA) Module
 *
 * This module provides the foundation for CGA certification:
 * - Certificate schema and types
 * - Verification engine
 * - Certificate generation
 * - Trust policy evaluation
 *
 * @see SPEC-CGA-001 for full specification
 * @see PRD-CGA-001 for product requirements
 */

// Certificate schema and types
export {
  CGACertificateSchema,
  CGACertificateCompactSchema,
  CGALevelSchema,
  GovernanceAttestationSchema,
  ComplianceAttestationSchema,
  SecurityPostureSchema,
  OperationalHealthSchema,
  LEVEL_REQUIREMENTS,
  levelMeetsRequirement,
  type CGACertificate,
  type CGACertificateCompact,
  type CGALevel,
  type GovernanceAttestation,
  type ComplianceAttestation,
} from './certificate';

// Verification engine
export {
  VerificationEngine,
  type VerificationResult,
  type VerificationReport,
  type VerificationContext,
  type VerificationCheck,
} from './verification-engine';

// Certificate generation
export {
  CertificateGenerator,
  type CertificateGeneratorOptions,
} from './certificate-generator';

// Kill switch live test protocol
export {
  KillSwitchTestProtocol,
  type KillSwitchChannel,
  type KillSwitchConfig,
  type KillSwitchChannelConfig,
  type KillSwitchTestCommand,
  type KillSwitchTestResponse,
  type KillSwitchTestResult,
  type ChannelTestResult,
} from './kill-switch-test';

// Trust policy
export {
  A2ATrustPolicySchema,
  ActionRequirementSchema,
  OrganizationOverrideSchema,
  TrustedCASchema,
  RevocationConfigSchema,
  HealthConfigSchema,
  TrustPolicyEvaluator,
  type A2ATrustPolicy,
  type CGAClaims,
  type TrustEvaluationResult,
} from './trust-policy';

// Token operations
export {
  CGATokenGenerator,
  CGATokenVerifier,
  CGATokenClaimsSchema,
  createTestToken,
  type CGATokenClaims,
  type CGATokenGeneratorOptions,
  type CGATokenVerifierOptions,
  type TokenGenerationResult,
  type TokenVerificationResult,
} from './token';

// A2A Middleware
export {
  A2AMiddleware,
  createA2AMiddleware,
  type A2AMiddlewareOptions,
  type A2AMiddlewareError,
  type A2AErrorCode,
  type A2AVerificationSuccess,
} from './middleware';
