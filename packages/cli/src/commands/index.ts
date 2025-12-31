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

// Multi-jurisdiction compliance commands
export { complianceCommand } from "./compliance.js";
export { classifyCommand } from "./classify.js";
export { checkCommand } from "./check.js";
export { generateCommand } from "./generate.js";
export { reportCommand } from "./report.js";
