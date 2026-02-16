import { defineConfig } from "tsup";

export default defineConfig({
  entry: {
    index: "src/index.ts",
    "identity/index": "src/identity/index.ts",
    "policy/index": "src/policy/index.ts",
    "telemetry/index": "src/telemetry/index.ts",
    "kill-switch/index": "src/kill-switch/index.ts",
    "capability/index": "src/capability/index.ts",
    "a2a/index": "src/a2a/index.ts",
    "license/index": "src/license/index.ts",
  },
  format: ["esm"],
  dts: {
    compilerOptions: {
      composite: false,
    },
  },
  sourcemap: true,
  clean: true,
  splitting: false,
  treeshake: true,
  external: [
    "@opentelemetry/api",
    "@opentelemetry/sdk-node",
  ],
});
