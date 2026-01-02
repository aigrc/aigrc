// @aigos/runtime - Runtime Governance Layer
// Implements SPEC-RT-002, SPEC-RT-003, and SPEC-RT-005

// Identity management
export * from "./identity.js";

// Kill switch
export * from "./kill-switch.js";

// Runtime context
export * from "./context.js";

// Telemetry
export * from "./telemetry.js";

// Golden Thread verification
export * from "./verification.js";

// Guard decorator API
export * from "./guard.js";

// Policy Engine (The Bouncer) - SPEC-RT-003
export * from "./policy-engine.js";

// Capability Decay - SPEC-RT-006
export * from "./capability-decay.js";

// A2A (Agent-to-Agent) Authentication - SPEC-PRT-003
export * from "./a2a/index.js";

// License Validation - AIG-11
export * from "./license/index.js";
