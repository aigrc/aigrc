import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts", "src/extractors/index.ts", "src/compiler/index.ts"],
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
});
