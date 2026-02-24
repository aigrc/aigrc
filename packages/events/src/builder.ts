import type { GovernanceEvent } from "./schemas/event-envelope";
import type { GoldenThreadRef } from "./schemas/golden-thread-ref";
import type { EventSource } from "./schemas/source";
import type {
  SourceTool,
  IdentityType,
  Environment,
  EventType,
  Criticality,
} from "./schemas/enums";
import type { ValidationError } from "./schemas/responses";
import type {
  AssetEventPayload,
  ScanEventPayload,
  ClassificationEventPayload,
  ComplianceEventPayload,
  EnforcementEventPayload,
  LifecycleEventPayload,
  PolicyEventPayload,
  AuditEventPayload,
} from "./schemas/payloads";

import { computeEventId } from "./event-id";
import type { StandardIdComponents, HighFrequencyIdComponents } from "./event-id";
import { computeEventHash } from "./event-hash";
import { AigrcEventValidator } from "./validator";
import {
  SPEC_VERSION,
  SCHEMA_VERSION,
  EVENT_TYPE_CATEGORY_MAP,
  DEFAULT_CRITICALITY_MAP,
  isHighFrequencyTool,
} from "./constants";

// ─────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────

/**
 * Configuration for the GovernanceEventBuilder.
 * The source context is set once and reused across all events.
 */
export interface BuilderConfig {
  source: {
    tool: SourceTool;
    version: string;
    orgId: string;
    instanceId: string;
    identity: { type: IdentityType; subject: string };
    environment: Environment;
  };
}

/**
 * Common parameters for all event factory methods.
 * goldenThread is REQUIRED — never optional.
 */
export interface BaseEventParams {
  /** Target AI asset identifier */
  assetId: string;
  /** Business authorization reference — required on every event */
  goldenThread: GoldenThreadRef;
  /** Override default criticality for this event type */
  criticality?: Criticality;
  /** ISO 8601 timestamp (defaults to now) */
  timestamp?: string | Date;
  /** Groups related events (e.g., all events from one CI run) */
  correlationId?: string;
  /** ID of a causally related parent event */
  parentEventId?: string;
  /** Hash of the previous event for this asset (chain linking) */
  previousHash?: string;
}

/** Parameters for Asset events (§5.1) */
export interface AssetEventParams extends BaseEventParams {
  data: AssetEventPayload;
}

/** Parameters for Scan events (§5.2) */
export interface ScanEventParams extends BaseEventParams {
  data: ScanEventPayload;
}

/** Parameters for Classification events (§5.3) */
export interface ClassificationEventParams extends BaseEventParams {
  data: ClassificationEventPayload;
}

/** Parameters for Compliance events (§5.4) */
export interface ComplianceEventParams extends BaseEventParams {
  data: ComplianceEventPayload;
}

/** Parameters for Enforcement events (§5.5) */
export interface EnforcementEventParams extends BaseEventParams {
  data: EnforcementEventPayload;
}

/** Parameters for Lifecycle events (§5.6) */
export interface LifecycleEventParams extends BaseEventParams {
  data: LifecycleEventPayload;
}

/** Parameters for Policy events (§5.7) */
export interface PolicyEventParams extends BaseEventParams {
  data: PolicyEventPayload;
}

/** Parameters for Audit events (§5.8) */
export interface AuditEventParams extends BaseEventParams {
  data: AuditEventPayload;
}

// ─────────────────────────────────────────────────────────────────
// ERROR
// ─────────────────────────────────────────────────────────────────

/**
 * Thrown when the builder produces an event that fails validation.
 * Carries the full list of validation errors.
 */
export class GovernanceEventValidationError extends Error {
  public readonly errors: ValidationError[];

  constructor(errors: ValidationError[], message?: string) {
    const msg =
      message ?? `Event validation failed: ${errors.map((e) => e.code).join(", ")}`;
    super(msg);
    this.name = "GovernanceEventValidationError";
    this.errors = errors;
  }
}

// ─────────────────────────────────────────────────────────────────
// BUILDER
// ─────────────────────────────────────────────────────────────────

/**
 * Constructs valid, immutable GovernanceEvent objects.
 *
 * Each factory method (one per event type) accepts typed parameters,
 * computes the deterministic ID and SHA-256 hash, validates the result,
 * and returns a frozen GovernanceEvent.
 *
 * @example
 * ```typescript
 * const builder = new GovernanceEventBuilder({
 *   source: {
 *     tool: "cli",
 *     version: "0.4.2",
 *     orgId: "org-pangolabs",
 *     instanceId: "inst-001",
 *     identity: { type: "api-key", subject: "dev@pangolabs.cloud" },
 *     environment: "production",
 *   },
 * });
 *
 * const event = builder.assetCreated({
 *   assetId: "aigrc-2024-a1b2c3d4",
 *   goldenThread: { type: "linked", system: "jira", ref: "AIG-199", ... },
 *   data: { cardId: "card-001", cardVersion: "1.0.0", assetType: "agent", riskLevel: "high" },
 * });
 * ```
 */
export class GovernanceEventBuilder {
  private readonly source: EventSource;
  private readonly validator: AigrcEventValidator;

  constructor(config: BuilderConfig) {
    this.source = {
      tool: config.source.tool,
      version: config.source.version,
      orgId: config.source.orgId,
      instanceId: config.source.instanceId,
      identity: config.source.identity,
      environment: config.source.environment,
    };
    this.validator = new AigrcEventValidator();
  }

  // ─── Asset Events (§5.1) ──────────────────────────────────────

  assetCreated(params: AssetEventParams): GovernanceEvent {
    return this.buildEvent("aigrc.asset.created", params);
  }

  assetUpdated(params: AssetEventParams): GovernanceEvent {
    return this.buildEvent("aigrc.asset.updated", params);
  }

  assetRegistered(params: AssetEventParams): GovernanceEvent {
    return this.buildEvent("aigrc.asset.registered", params);
  }

  assetRetired(params: AssetEventParams): GovernanceEvent {
    return this.buildEvent("aigrc.asset.retired", params);
  }

  assetDiscovered(params: AssetEventParams): GovernanceEvent {
    return this.buildEvent("aigrc.asset.discovered", params);
  }

  // ─── Scan Events (§5.2) ───────────────────────────────────────

  scanStarted(params: ScanEventParams): GovernanceEvent {
    return this.buildEvent("aigrc.scan.started", params);
  }

  scanCompleted(params: ScanEventParams): GovernanceEvent {
    return this.buildEvent("aigrc.scan.completed", params);
  }

  scanFinding(params: ScanEventParams): GovernanceEvent {
    return this.buildEvent("aigrc.scan.finding", params);
  }

  // ─── Classification Events (§5.3) ─────────────────────────────

  classificationApplied(params: ClassificationEventParams): GovernanceEvent {
    return this.buildEvent("aigrc.classification.applied", params);
  }

  classificationChanged(params: ClassificationEventParams): GovernanceEvent {
    return this.buildEvent("aigrc.classification.changed", params);
  }

  classificationDisputed(params: ClassificationEventParams): GovernanceEvent {
    return this.buildEvent("aigrc.classification.disputed", params);
  }

  // ─── Compliance Events (§5.4) ─────────────────────────────────

  complianceEvaluated(params: ComplianceEventParams): GovernanceEvent {
    return this.buildEvent("aigrc.compliance.evaluated", params);
  }

  compliancePassed(params: ComplianceEventParams): GovernanceEvent {
    return this.buildEvent("aigrc.compliance.passed", params);
  }

  complianceFailed(params: ComplianceEventParams): GovernanceEvent {
    return this.buildEvent("aigrc.compliance.failed", params);
  }

  complianceGap(params: ComplianceEventParams): GovernanceEvent {
    return this.buildEvent("aigrc.compliance.gap", params);
  }

  // ─── Enforcement Events (§5.5) ────────────────────────────────

  enforcementDecision(params: EnforcementEventParams): GovernanceEvent {
    return this.buildEvent("aigrc.enforcement.decision", params);
  }

  enforcementViolation(params: EnforcementEventParams): GovernanceEvent {
    return this.buildEvent("aigrc.enforcement.violation", params);
  }

  enforcementOverride(params: EnforcementEventParams): GovernanceEvent {
    return this.buildEvent("aigrc.enforcement.override", params);
  }

  enforcementKillswitch(params: EnforcementEventParams): GovernanceEvent {
    return this.buildEvent("aigrc.enforcement.killswitch", params);
  }

  // ─── Lifecycle Events (§5.6) ──────────────────────────────────

  lifecycleOrphanDeclared(params: LifecycleEventParams): GovernanceEvent {
    return this.buildEvent("aigrc.lifecycle.orphan.declared", params);
  }

  lifecycleOrphanResolved(params: LifecycleEventParams): GovernanceEvent {
    return this.buildEvent("aigrc.lifecycle.orphan.resolved", params);
  }

  lifecycleOrphanOverdue(params: LifecycleEventParams): GovernanceEvent {
    return this.buildEvent("aigrc.lifecycle.orphan.overdue", params);
  }

  lifecycleDecayWarned(params: LifecycleEventParams): GovernanceEvent {
    return this.buildEvent("aigrc.lifecycle.decay.warned", params);
  }

  lifecycleDecayExpired(params: LifecycleEventParams): GovernanceEvent {
    return this.buildEvent("aigrc.lifecycle.decay.expired", params);
  }

  lifecycleDecayRenewed(params: LifecycleEventParams): GovernanceEvent {
    return this.buildEvent("aigrc.lifecycle.decay.renewed", params);
  }

  // ─── Policy Events (§5.7) ─────────────────────────────────────

  policyCompiled(params: PolicyEventParams): GovernanceEvent {
    return this.buildEvent("aigrc.policy.compiled", params);
  }

  policyPublished(params: PolicyEventParams): GovernanceEvent {
    return this.buildEvent("aigrc.policy.published", params);
  }

  policyDeprecated(params: PolicyEventParams): GovernanceEvent {
    return this.buildEvent("aigrc.policy.deprecated", params);
  }

  // ─── Audit Events (§5.8) ──────────────────────────────────────

  auditReportGenerated(params: AuditEventParams): GovernanceEvent {
    return this.buildEvent("aigrc.audit.report.generated", params);
  }

  auditChainVerified(params: AuditEventParams): GovernanceEvent {
    return this.buildEvent("aigrc.audit.chain.verified", params);
  }

  auditChainBroken(params: AuditEventParams): GovernanceEvent {
    return this.buildEvent("aigrc.audit.chain.broken", params);
  }

  // ─── Internal Build Logic ─────────────────────────────────────

  /**
   * Core build method shared by all 31 factory methods.
   *
   * 1. Resolves type, category, criticality
   * 2. Sets specVersion, schemaVersion, producedAt, source
   * 3. Computes deterministic ID (standard or high-frequency)
   * 4. Computes SHA-256 canonical hash
   * 5. Validates via AigrcEventValidator
   * 6. Returns frozen GovernanceEvent
   */
  private buildEvent(type: EventType, params: BaseEventParams & { data: Record<string, unknown> }): GovernanceEvent {
    const category = EVENT_TYPE_CATEGORY_MAP[type];
    const criticality = params.criticality ?? DEFAULT_CRITICALITY_MAP[type];
    const producedAt =
      params.timestamp instanceof Date
        ? params.timestamp.toISOString()
        : params.timestamp ?? new Date().toISOString();

    // Compute deterministic event ID
    const id = this.computeId(type, params.assetId, producedAt);

    // Assemble the event (without hash — computed next)
    const eventWithoutHash: Record<string, unknown> = {
      id,
      specVersion: SPEC_VERSION,
      schemaVersion: SCHEMA_VERSION,
      type,
      category,
      criticality,
      source: this.source,
      orgId: this.source.orgId,
      assetId: params.assetId,
      producedAt,
      goldenThread: params.goldenThread,
      data: params.data,
    };

    // Add optional fields
    if (params.correlationId) {
      eventWithoutHash.correlationId = params.correlationId;
    }
    if (params.parentEventId) {
      eventWithoutHash.parentEventId = params.parentEventId;
    }
    if (params.previousHash) {
      eventWithoutHash.previousHash = params.previousHash;
    }

    // Compute SHA-256 hash over canonical form
    const { hash } = computeEventHash(eventWithoutHash);
    const event = { ...eventWithoutHash, hash };

    // Validate the assembled event
    const result = this.validator.validate(event);
    if (!result.valid) {
      throw new GovernanceEventValidationError(result.errors);
    }

    // Return immutable event
    return Object.freeze(event) as GovernanceEvent;
  }

  /**
   * Compute deterministic event ID based on tool frequency class.
   */
  private computeId(type: EventType, assetId: string, timestamp: string): string {
    if (isHighFrequencyTool(this.source.tool)) {
      return computeEventId({
        instanceId: this.source.instanceId,
        type,
        assetId,
        timestamp,
        localSeq: 0, // Default seq; high-frequency callers should manage their own seq
      } as HighFrequencyIdComponents);
    }

    return computeEventId({
      orgId: this.source.orgId,
      tool: this.source.tool,
      type,
      assetId,
      timestamp,
    } as StandardIdComponents);
  }
}
