/**
 * @aigrc/ca-service - CGA Certificate Authority Service
 *
 * Hosted Certificate Authority for Certified Governed Agents.
 * Provides certificate signing, verification, OCSP, and renewal services.
 *
 * @see SPEC-CGA-001 for CGA specification
 */

// Database
export { CADatabase } from "./db/client.js";
export type {
  CertificateRecord,
  RevocationRecord,
  VerificationHistoryRecord,
  AuditLogRecord,
  CAKeyRecord,
} from "./db/client.js";
export { SCHEMA_VERSION, CREATE_TABLES, MIGRATIONS } from "./db/schema.js";

// Services
export { SigningService } from "./services/signing.js";
export type {
  SigningServiceOptions,
  SigningResult,
  KeyGenerationResult,
} from "./services/signing.js";

export { OCSPService } from "./services/ocsp.js";
export type {
  OCSPServiceOptions,
  OCSPRequest,
  OCSPResponse,
  SingleResponse,
} from "./services/ocsp.js";
export { OCSPResponseStatus, CertificateStatus } from "./services/ocsp.js";

export { RenewalService } from "./services/renewal.js";
export type {
  RenewalConfig,
  RenewalResult,
  RenewalServiceOptions,
} from "./services/renewal.js";

export { LiveVerificationService } from "./services/live-verification.js";
export type {
  LiveVerificationConfig,
  VerificationTarget,
  LiveVerificationResult,
  LiveVerificationServiceOptions,
} from "./services/live-verification.js";

// API
export { createAPIRouter } from "./api/routes.js";
export type { APIRouterOptions } from "./api/routes.js";
