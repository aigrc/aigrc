import { defineConfig } from "tsup";

export default defineConfig({
  entry: {
    index: "src/index.ts",
    "bin/aigrc-mcp": "bin/aigrc-mcp.ts",
  },
  format: ["esm"],
  dts: false,
  splitting: false,
  sourcemap: true,
  clean: true,
  noExternal: ["glob", "@modelcontextprotocol/sdk"],
  external: ["@aigrc/core"],
  banner: {
    js: "#!/usr/bin/env node",
  },
  shims: true,
  target: "node18",
});
