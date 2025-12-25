import { defineConfig } from "tsup";

export default defineConfig([
  {
    entry: ["src/index.ts"],
    format: ["esm"],
    dts: {
      compilerOptions: {
        composite: false,
        incremental: false,
      },
    },
    splitting: false,
    sourcemap: true,
    clean: true,
  },
  {
    entry: ["src/bin/aigrc.ts"],
    format: ["esm"],
    splitting: false,
    sourcemap: true,
    banner: {
      js: "#!/usr/bin/env node",
    },
  },
]);
