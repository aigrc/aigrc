import { defineConfig } from "tsup";

export default defineConfig([
  // Main library
  {
    entry: ["src/index.ts"],
    format: ["esm"],
    dts: {
      compilerOptions: {
        composite: false,
        incremental: false,
      },
    },
    sourcemap: true,
    clean: true,
    target: "es2022",
  },
  // Server binary
  {
    entry: ["src/bin/server.ts"],
    format: ["esm"],
    sourcemap: true,
    target: "es2022",
    outDir: "dist/bin",
  },
  // Merkle checkpoint job
  {
    entry: ["src/bin/merkle-job.ts"],
    format: ["esm"],
    sourcemap: true,
    target: "es2022",
    outDir: "dist/bin",
  },
]);
