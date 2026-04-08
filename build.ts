import { build } from "esbuild";

await build({
  entryPoints: ["src/cli/index.ts"],
  bundle: true,
  platform: "node",
  target: "node24",
  format: "esm",
  outfile: "dist/cli/index.js",
  banner: {
    js: "#!/usr/bin/env node",
  },
  packages: "external",
});
