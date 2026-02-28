# @aigrc/core

## 3.1.0

### Patch Changes

- 422adc4: feat(events): Governance Event Architecture — Sprints 1-5

  **@aigrc/events** (first publish):
  - GovernanceEventBuilder with 31 factory methods across 8 event categories
  - AigosClient SDK with Sync/Batch push, listEvents, getEvent, listAssets, healthCheck
  - EventBuffer for best-effort batched push with auto-flush
  - Zod schemas for event envelope, golden thread, source, and all data payloads
  - Deterministic event ID generation and SHA-256 hashing
  - SQL migrations for governance_events and integrity_checkpoints tables

  **@aigrc/event-service** (first publish):
  - Express event ingestion service with POST /v1/events (Sync) and POST /v1/events/batch (Batch)
  - GET /v1/events, GET /v1/events/:id, GET /v1/assets, GET /v1/assets/:assetId/events
  - PolicyEvaluator with 7 built-in rules and BRONZE/SILVER/GOLD conformance targets
  - Daily Merkle root integrity checkpoints (binary hash tree, sentinel root)
  - Rate limiting, auth middleware, CORS, Helmet security headers

  **@aigrc/cli**:
  - New `events push` command for pushing governance events to AIGOS
  - New `events list` command for querying events from the event-service
  - New `pull` command for syncing data from the control plane
  - New `push` command for syncing asset cards to the control plane

  **@aigrc/mcp**:
  - Event push integration: tool-to-event mapping with inline compliance feedback
  - Non-blocking push after scan, create_asset_card, validate, classify_risk tools
