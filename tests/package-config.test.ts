import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

interface PackageJson {
  main: string;
  types: string;
  exports: Record<string, { import: string; types: string }>;
  bin: Record<string, string>;
  scripts: Record<string, string>;
  engines: { node: string };
  devDependencies: Record<string, string>;
}

function readPackageJson(): PackageJson {
  return JSON.parse(readFileSync("package.json", "utf8")) as PackageJson;
}

test("package config builds before packing and checks publish contents", () => {
  const packageJson = readPackageJson();

  assert.equal(packageJson.scripts.prepack, "npm run build");
  assert.equal(packageJson.scripts["pack:check"], "npm --cache ./.npm-cache pack --dry-run --json");
  assert.match(packageJson.scripts["demo:select"] ?? "", /select --demo/);
  assert.match(packageJson.scripts["demo:select"] ?? "", /--task/);
  assert.equal(packageJson.engines.node, ">=22");
});

test("package config avoids drifting latest dev dependencies", () => {
  const packageJson = readPackageJson();

  assert.deepEqual(Object.entries(packageJson.devDependencies).filter(([, version]) => version === "latest"), []);
});

test("package entry points target built runtime files", () => {
  const packageJson = readPackageJson();

  assert.equal(packageJson.main, "./dist/src/index.js");
  assert.equal(packageJson.types, "./dist/src/index.d.ts");
  assert.equal(packageJson.exports["."]?.import, "./dist/src/index.js");
  assert.equal(packageJson.exports["."]?.types, "./dist/src/index.d.ts");
  assert.equal(packageJson.bin["mcp-capability-runtime"], "./dist/src/cli.js");
});
