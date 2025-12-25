// ─────────────────────────────────────────────────────────────────
// PATTERN REGISTRY EXPORTS
// ─────────────────────────────────────────────────────────────────

export {
  registerPattern,
  getPattern,
  getAllPatterns,
  getPatternsByCategory,
  getPatternsByLanguage,
  clearRegistry,
  isRegistryInitialized,
  createImplication,
} from "./registry";

export { registerPythonPatterns, pythonPatterns } from "./python";
export { registerJavaScriptPatterns, javascriptPatterns } from "./javascript";
export { registerModelFilePatterns, modelFilePatterns } from "./model-files";
export { registerRiskIndicatorPatterns, riskIndicatorPatterns } from "./risk-indicators";

// ─────────────────────────────────────────────────────────────────
// INITIALIZE ALL PATTERNS
// ─────────────────────────────────────────────────────────────────

let initialized = false;

export function initializePatterns(): void {
  if (initialized) {
    return;
  }

  const { registerPythonPatterns } = require("./python");
  const { registerJavaScriptPatterns } = require("./javascript");
  const { registerModelFilePatterns } = require("./model-files");
  const { registerRiskIndicatorPatterns } = require("./risk-indicators");

  registerPythonPatterns();
  registerJavaScriptPatterns();
  registerModelFilePatterns();
  registerRiskIndicatorPatterns();

  initialized = true;
}

export function resetPatterns(): void {
  const { clearRegistry } = require("./registry");
  clearRegistry();
  initialized = false;
}
