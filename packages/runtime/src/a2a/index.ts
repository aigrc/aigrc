/**
 * A2A (Agent-to-Agent) Module - SPEC-PRT-003
 *
 * Implements the Governance Token Protocol for secure agent-to-agent communication.
 *
 * Features:
 * - JWT-based governance tokens with AIGOS claims
 * - Mutual authentication handshake
 * - Inbound/outbound trust policies
 * - HTTP middleware for fetch and Express
 */

// Token generation and validation
export * from "./token/index.js";

// Handshake protocol
export * from "./handshake/index.js";

// Trust policies
export * from "./policy/index.js";

// HTTP middleware
export * from "./middleware/index.js";
