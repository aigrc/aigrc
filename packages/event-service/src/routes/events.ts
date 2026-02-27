/**
 * Event Ingestion Routes
 *
 * Implements EVT-001 §12 delivery channels:
 * - POST /events     — Sync channel (single event)
 * - POST /events/batch — Batch channel (multiple events)
 * - GET  /health     — Health check
 */

import { Router } from "express";
import { GovernanceEventSchema, verifyEventHash } from "@aigrc/events";
import { z } from "zod";
import type { EventStore } from "../services/event-store.js";
import type { AuthenticatedRequest } from "../middleware/auth.js";
import type { PolicyEvaluator } from "../services/policy-evaluator.js";

// ─────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────

const MAX_BATCH_SIZE = 1000;

// ─────────────────────────────────────────────────────────────────
// ROUTER FACTORY
// ─────────────────────────────────────────────────────────────────

export interface EventRouterConfig {
  /** Event store instance for persistence */
  eventStore: EventStore;
  /** Policy evaluator instance (optional — no evaluation if not provided) */
  policyEvaluator?: PolicyEvaluator;
}

/**
 * Create the event ingestion router.
 *
 * Mounts:
 * - POST /events       — Sync channel
 * - POST /events/batch — Batch channel
 * - GET  /health       — Health check
 */
export function createEventRouter(config: EventRouterConfig): Router {
  const { eventStore, policyEvaluator } = config;
  const router = Router();

  // ─── POST /events — Sync Channel ────────────────────────────

  router.post("/events", async (req, res) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const orgId = authReq.auth?.orgId;

      if (!orgId) {
        res.status(401).json({
          error: "unauthorized",
          message: "Authentication required",
        });
        return;
      }

      // Validate event against Zod schema
      const parseResult = GovernanceEventSchema.safeParse(req.body);
      if (!parseResult.success) {
        const firstError = parseResult.error.errors[0];
        res.status(400).json({
          error: {
            code: "EVT_SCHEMA_INVALID",
            message: "Event validation failed",
            detail: firstError?.message,
            field: firstError?.path.join("."),
          },
        });
        return;
      }

      const event = parseResult.data;

      // Verify that the event's orgId matches the authenticated org
      if (event.orgId !== orgId) {
        res.status(403).json({
          error: {
            code: "EVT_ORG_MISMATCH",
            message: `Event orgId "${event.orgId}" does not match authenticated org "${orgId}"`,
          },
        });
        return;
      }

      // Reject events with producer-set receivedAt
      if (event.receivedAt) {
        res.status(400).json({
          error: {
            code: "EVT_RECEIVED_AT_SET",
            message: "receivedAt must not be set by the producer. It is assigned server-side.",
          },
        });
        return;
      }

      // Store the event
      const { response, isNew } = await eventStore.store(event, orgId);

      // Run policy evaluation (Sync channel only — §12.5)
      let enrichedResponse: Record<string, unknown> = { ...response };
      if (policyEvaluator && response.status === "accepted") {
        try {
          const evalResult = await policyEvaluator.evaluate(event, orgId);
          if (evalResult) {
            enrichedResponse = {
              ...enrichedResponse,
              policyResult: evalResult.policyResult,
              complianceGaps: evalResult.complianceGaps.length > 0
                ? evalResult.complianceGaps
                : undefined,
              warnings: evalResult.warnings.length > 0
                ? evalResult.warnings
                : undefined,
              suggestions: evalResult.suggestions.length > 0
                ? evalResult.suggestions
                : undefined,
            };
          }
        } catch {
          // Policy evaluation failures are non-fatal — event is still accepted
        }
      }

      // 201 Created for new events, 200 OK for duplicates
      const statusCode = isNew ? 201 : 200;
      res.status(statusCode).json(enrichedResponse);
    } catch (error) {
      res.status(500).json({
        error: {
          code: "EVT_INTERNAL",
          message: error instanceof Error ? error.message : "Internal server error",
        },
      });
    }
  });

  // ─── POST /events/batch — Batch Channel ─────────────────────

  router.post("/events/batch", async (req, res) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const orgId = authReq.auth?.orgId;

      if (!orgId) {
        res.status(401).json({
          error: "unauthorized",
          message: "Authentication required",
        });
        return;
      }

      // Validate that body is an array
      if (!Array.isArray(req.body)) {
        res.status(400).json({
          error: {
            code: "EVT_SCHEMA_INVALID",
            message: "Batch endpoint expects an array of events",
          },
        });
        return;
      }

      const rawEvents = req.body as unknown[];

      // Enforce max batch size
      if (rawEvents.length > MAX_BATCH_SIZE) {
        res.status(413).json({
          error: {
            code: "EVT_BATCH_TOO_LARGE",
            message: `Batch size ${rawEvents.length} exceeds maximum of ${MAX_BATCH_SIZE}`,
          },
        });
        return;
      }

      // Validate and filter events
      const validEvents: import("@aigrc/events").GovernanceEvent[] = [];
      // Use untyped results array since we may include server-side error codes
      // that are outside the SDK's ValidationError enum
      const results: Array<{
        id: string;
        status: "created" | "duplicate" | "rejected";
        receivedAt?: string;
        error?: { code: string; message: string; detail?: string; field?: string };
      }> = [];
      let rejected = 0;

      for (const rawEvent of rawEvents) {
        const parseResult = GovernanceEventSchema.safeParse(rawEvent);
        if (!parseResult.success) {
          rejected++;
          const firstError = parseResult.error.errors[0];
          results.push({
            id: (rawEvent as Record<string, unknown>)?.id as string ?? "unknown",
            status: "rejected",
            error: {
              code: "EVT_SCHEMA_INVALID",
              message: firstError?.message ?? "Validation failed",
              field: firstError?.path.join("."),
            },
          });
          continue;
        }

        const event = parseResult.data;

        // Check org match
        if (event.orgId !== orgId) {
          rejected++;
          results.push({
            id: event.id,
            status: "rejected",
            error: {
              code: "EVT_ORG_MISMATCH",
              message: `Event orgId "${event.orgId}" does not match authenticated org "${orgId}"`,
            },
          });
          continue;
        }

        // Reject events with producer-set receivedAt
        if (event.receivedAt) {
          rejected++;
          results.push({
            id: event.id,
            status: "rejected",
            error: {
              code: "EVT_RECEIVED_AT_REJECTED",
              message: "receivedAt must not be set by the producer",
            },
          });
          continue;
        }

        validEvents.push(event);
      }

      // Store valid events
      if (validEvents.length > 0) {
        const storeResult = await eventStore.storeMany(validEvents, orgId);

        // Merge pre-validation rejections with store results
        res.status(200).json({
          accepted: storeResult.accepted,
          rejected: storeResult.rejected + rejected,
          duplicate: storeResult.duplicate,
          results: [...results, ...storeResult.results],
        });
      } else {
        // All events were rejected during validation
        res.status(200).json({
          accepted: 0,
          rejected,
          duplicate: 0,
          results,
        });
      }
    } catch (error) {
      res.status(500).json({
        error: {
          code: "EVT_INTERNAL",
          message: error instanceof Error ? error.message : "Internal server error",
        },
      });
    }
  });

  // ─── GET /events — List Events ─────────────────────────────

  router.get("/events", async (req, res) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const orgId = authReq.auth?.orgId;

      if (!orgId) {
        res.status(401).json({ error: "unauthorized", message: "Authentication required" });
        return;
      }

      const filters = {
        assetId: req.query.asset_id as string | undefined,
        type: req.query.type as string | undefined,
        criticality: req.query.criticality as string | undefined,
        since: req.query.since as string | undefined,
        limit: req.query.limit ? parseInt(req.query.limit as string, 10) : undefined,
        offset: req.query.offset ? parseInt(req.query.offset as string, 10) : undefined,
      };

      const { events, total } = await eventStore.listEvents(orgId, filters);

      res.status(200).json({
        events,
        total,
        limit: filters.limit ?? 20,
        offset: filters.offset ?? 0,
      });
    } catch (error) {
      res.status(500).json({
        error: {
          code: "EVT_INTERNAL",
          message: error instanceof Error ? error.message : "Internal server error",
        },
      });
    }
  });

  // ─── GET /events/:id — Single Event ──────────────────────────

  router.get("/events/:id", async (req, res) => {
    try {
      const authReq = req as unknown as AuthenticatedRequest;
      const orgId = authReq.auth?.orgId;

      if (!orgId) {
        res.status(401).json({ error: "unauthorized", message: "Authentication required" });
        return;
      }

      const event = await eventStore.findById(req.params.id);

      if (!event) {
        res.status(404).json({
          error: {
            code: "EVT_NOT_FOUND",
            message: `Event ${req.params.id} not found`,
          },
        });
        return;
      }

      // Verify the event belongs to the authenticated org
      if (event.orgId !== orgId) {
        res.status(404).json({
          error: {
            code: "EVT_NOT_FOUND",
            message: `Event ${req.params.id} not found`,
          },
        });
        return;
      }

      res.status(200).json(event);
    } catch (error) {
      res.status(500).json({
        error: {
          code: "EVT_INTERNAL",
          message: error instanceof Error ? error.message : "Internal server error",
        },
      });
    }
  });

  // ─── GET /assets — List Assets ────────────────────────────────

  router.get("/assets", async (req, res) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const orgId = authReq.auth?.orgId;

      if (!orgId) {
        res.status(401).json({ error: "unauthorized", message: "Authentication required" });
        return;
      }

      const pagination = {
        limit: req.query.limit ? parseInt(req.query.limit as string, 10) : undefined,
        offset: req.query.offset ? parseInt(req.query.offset as string, 10) : undefined,
      };

      const { assets, total } = await eventStore.listAssets(orgId, pagination);

      res.status(200).json({
        assets,
        total,
        limit: pagination.limit ?? 20,
        offset: pagination.offset ?? 0,
      });
    } catch (error) {
      res.status(500).json({
        error: {
          code: "EVT_INTERNAL",
          message: error instanceof Error ? error.message : "Internal server error",
        },
      });
    }
  });

  // ─── GET /assets/:assetId/events — Asset Events ──────────────

  router.get("/assets/:assetId/events", async (req, res) => {
    try {
      const authReq = req as unknown as AuthenticatedRequest;
      const orgId = authReq.auth?.orgId;

      if (!orgId) {
        res.status(401).json({ error: "unauthorized", message: "Authentication required" });
        return;
      }

      const filters = {
        type: req.query.type as string | undefined,
        criticality: req.query.criticality as string | undefined,
        since: req.query.since as string | undefined,
        limit: req.query.limit ? parseInt(req.query.limit as string, 10) : undefined,
        offset: req.query.offset ? parseInt(req.query.offset as string, 10) : undefined,
      };

      const { events, total } = await eventStore.getAssetEvents(
        orgId,
        req.params.assetId,
        filters,
      );

      res.status(200).json({
        events,
        total,
        limit: filters.limit ?? 20,
        offset: filters.offset ?? 0,
      });
    } catch (error) {
      res.status(500).json({
        error: {
          code: "EVT_INTERNAL",
          message: error instanceof Error ? error.message : "Internal server error",
        },
      });
    }
  });

  // ─── GET /health — Health Check ─────────────────────────────

  router.get("/health", (_req, res) => {
    res.status(200).json({
      status: "ok",
      service: "aigrc-event-service",
      version: "0.2.0",
      timestamp: new Date().toISOString(),
    });
  });

  return router;
}
