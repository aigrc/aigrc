import { defineConfig } from "tsup";

export default defineConfig({
  entry: {
    index: "src/index.ts",
    "client/index": "src/client/index.ts",
    "decorators/index": "src/decorators/index.ts",
    "telemetry/index": "src/telemetry/index.ts",
  },
  format: ["cjs", "esm"],
  dts: {
    compilerOptions: {
      composite: false,
      incremental: false,
    },
  },
  splitting: false,
  sourcemap: true,
  clean: true,
  treeshake: true,
  minify: false,
  external: ["@opentelemetry/api"],
});
