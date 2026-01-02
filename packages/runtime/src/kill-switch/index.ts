// ─────────────────────────────────────────────────────────────────
// KILL SWITCH MODULE (SPEC-RT-005)
// Remote termination control for AI agents
// ─────────────────────────────────────────────────────────────────

// Transport abstraction
export * from "./listener.js";

// Transports
export * from "./sse.js";
export * from "./polling.js";
export * from "./file.js";

// Command handling
export * from "./commands.js";

// Security
export * from "./signature.js";
export * from "./replay.js";

// Cascading termination
export * from "./cascade.js";
