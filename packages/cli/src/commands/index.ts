// ─────────────────────────────────────────────────────────────────
// CLI Commands - Re-exports
// ─────────────────────────────────────────────────────────────────

// Core commands
export { scanCommand } from "./scan.js";
export { initCommand } from "./init.js";
export { registerCommand } from "./register.js";
export { validateCommand } from "./validate.js";
export { statusCommand } from "./status.js";
export { hashCommand } from "./hash.js";
export { versionCommand } from "./version.js";

// Control Plane sync commands
export { pushCommand } from "./push.js";
export { projectsCommand } from "./projects.js";

// CGA certification commands
export { certifyCommand } from "./certify.js";

// Multi-jurisdiction compliance commands
export { complianceCommand } from "./compliance.js";
export { classifyCommand } from "./classify.js";
export { checkCommand } from "./check.js";
export { generateCommand } from "./generate.js";
export { reportCommand } from "./report.js";

// I2E Policy Bridge commands
export { policyCommand } from "./policy.js";

// Governance Event commands
export { eventsCommand } from "./events.js";
export { pullCommand } from "./pull.js";
