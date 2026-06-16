import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
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
  files: string[];
  repository?: { type: string; url: string };
  bugs?: { url: string };
  homepage?: string;
}

interface PackedFile {
  path: string;
}

interface PackManifest {
  files: PackedFile[];
}

function readPackageJson(): PackageJson {
  return JSON.parse(readFileSync("package.json", "utf8")) as PackageJson;
}

test("package config builds before packing and checks publish contents", () => {
  const packageJson = readPackageJson();

  assert.equal(packageJson.scripts.prepack, "npm run build");
  assert.equal(packageJson.scripts["pack:check"], "npm --cache ./.npm-cache pack --dry-run --json");
  assert.deepEqual(packageJson.files, ["dist/src", "README.md", "docs", "examples", "LICENSE"]);
  assert.match(packageJson.scripts["demo:select"] ?? "", /select --demo/);
  assert.match(packageJson.scripts["demo:select"] ?? "", /--task/);
  assert.match(packageJson.scripts["example:select"] ?? "", /select --input examples\/minimal-tool-surface\.json/);
  assert.match(packageJson.scripts["demo:walkthrough"] ?? "", /demo:walkthrough/);
  assert.match(packageJson.scripts["demo:receipt"] ?? "", /demo:receipt/);
  assert.match(packageJson.scripts["demo:receipt:json"] ?? "", /demo:receipt --json/);
  assert.match(packageJson.scripts["demo:discover"] ?? "", /discover --config examples\/mcp-discovery-config\.json/);
  assert.match(packageJson.scripts["demo:discover:json"] ?? "", /discover --config examples\/mcp-discovery-config\.json --json/);
  assert.equal(packageJson.engines.node, ">=22");
  assert.equal(packageJson.repository?.url, "git+https://github.com/tacotuesday8888/mcp-capability-runtime.git");
  assert.equal(packageJson.bugs?.url, "https://github.com/tacotuesday8888/mcp-capability-runtime/issues");
  assert.equal(packageJson.homepage, "https://github.com/tacotuesday8888/mcp-capability-runtime#readme");
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

test("package dry-run includes runtime planner and receipt artifacts", () => {
  const result = spawnSync("npm", ["--cache", "./.npm-cache", "--ignore-scripts", "pack", "--dry-run", "--json"], {
    cwd: process.cwd(),
    encoding: "utf8",
  });

  assert.equal(result.status, 0, result.stderr);

  const jsonStart = result.stdout.indexOf("[");
  const jsonEnd = result.stdout.lastIndexOf("]");

  assert.ok(jsonStart >= 0);
  assert.ok(jsonEnd > jsonStart);

  const manifest = JSON.parse(result.stdout.slice(jsonStart, jsonEnd + 1)) as PackManifest[];
  const paths = new Set(manifest[0]?.files.map((file) => file.path) ?? []);

  for (const path of [
    "README.md",
    "LICENSE",
    "docs/invocation-planner.md",
    "docs/invocation-receipts.md",
    "docs/mcp-discovery.md",
    "examples/mcp-discovery-config.json",
    "examples/mcp-discovery-output.json",
    "examples/mcp-discovery-output.txt",
    "examples/demo-receipt-output.json",
    "examples/demo-receipt-output.txt",
    "examples/demo-walkthrough-output.txt",
    "dist/src/discovery/mcp.js",
    "dist/src/runtime/receipt.js",
    "dist/src/demo/receipt.js",
    "dist/src/runtime/plan.js",
    "dist/src/demo/walkthrough.js",
  ]) {
    assert.ok(paths.has(path), `${path} missing from package dry-run`);
  }
});
