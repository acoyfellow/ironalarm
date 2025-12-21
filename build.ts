/// <reference types="node" />
import { build } from "esbuild";
import * as fs from "fs";
import { execSync } from "child_process";

const dist = "./dist";

// Clean dist
if (fs.existsSync(dist)) {
  fs.rmSync(dist, { recursive: true });
}
fs.mkdirSync(dist);

// Build ESM
await build({
  entryPoints: ["src/index.ts"],
  outfile: "dist/index.mjs",
  format: "esm",
  target: "esnext",
  bundle: false,
  sourcemap: true,
});

// Build CJS
await build({
  entryPoints: ["src/index.ts"],
  outfile: "dist/index.js",
  format: "cjs",
  target: "esnext",
  bundle: false,
  sourcemap: true,
});

// Generate TypeScript definitions using tsc
execSync("tsc --project tsconfig.build.json", {
  stdio: "inherit",
});

// Move generated .d.ts to expected location
if (fs.existsSync("dist/src/index.d.ts")) {
  fs.renameSync("dist/src/index.d.ts", "dist/index.d.ts");
  if (fs.existsSync("dist/src")) {
    fs.rmSync("dist/src", { recursive: true });
  }
}

console.log("✓ Build complete: dist/index.mjs, dist/index.js, dist/index.d.ts");
