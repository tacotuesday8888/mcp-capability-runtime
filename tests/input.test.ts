import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import test from "node:test";

import {
  ToolSurfaceValidationError,
  computeTaxMeter,
  loadToolSurfaceFile,
  parseToolSurfaceInput,
} from "../src/index.js";

test("external JSON input normalizes server metadata onto tools", () => {
  const surface = parseToolSurfaceInput({
    name: "test surface",
    servers: [
      {
        id: "logs",
        title: "Logs",
        category: "runtime logs",
        description: "Read logs.",
        tools: [
          {
            id: "logs.search",
            name: "searchLogs",
            description: "Search logs by trace id.",
            permissionLevel: "read",
            riskLevel: "medium",
          },
        ],
      },
    ],
    capabilities: [
      {
        id: "inspect-runtime",
        title: "Inspect Runtime",
        description: "Inspect runtime evidence.",
        intent: "Find incident evidence.",
        whenToUse: "Use for read-only triage.",
        requiredContext: ["trace id"],
        permissionLevel: "read",
        riskLevel: "medium",
        underlyingTools: ["logs.search"],
        proofReturned: ["query"],
        examples: ["Find the failing trace."],
      },
    ],
  });

  assert.equal(surface.name, "test surface");
  assert.equal(surface.servers[0]?.tools[0]?.serverId, "logs");
  assert.equal(surface.servers[0]?.tools[0]?.serverTitle, "Logs");
  assert.equal(surface.servers[0]?.tools[0]?.category, "runtime logs");
  assert.deepEqual(surface.servers[0]?.tools[0]?.tags, []);

  const report = computeTaxMeter(surface.servers, surface.capabilities);

  assert.equal(report.rawToolCount, 1);
  assert.equal(report.capabilityCount, 1);
});

test("external JSON input validates malformed values with useful paths", () => {
  assert.throws(
    () =>
      parseToolSurfaceInput({
        servers: [
          {
            id: "logs",
            title: "Logs",
            category: "runtime logs",
            description: "Read logs.",
            tools: [
              {
                id: "logs.search",
                name: "searchLogs",
                description: "Search logs.",
                permissionLevel: "root",
                riskLevel: "spicy",
              },
            ],
          },
        ],
        capabilities: [],
      }),
    (error: unknown) => {
      assert.ok(error instanceof ToolSurfaceValidationError);
      const validationError = error as ToolSurfaceValidationError;
      assert.match(validationError.message, /servers\[0\]\.tools\[0\]\.permissionLevel/);
      assert.match(validationError.message, /servers\[0\]\.tools\[0\]\.riskLevel/);
      return true;
    },
  );
});

test("external JSON file can be loaded and measured", () => {
  const surface = loadToolSurfaceFile("examples/minimal-tool-surface.json");
  const report = computeTaxMeter(surface.servers, surface.capabilities);

  assert.equal(surface.servers.length, 2);
  assert.equal(report.rawToolCount, 4);
  assert.equal(report.capabilityCount, 1);
  assert.equal(report.riskyRawToolCount, 1);
  assert.equal(report.noisyRawToolCount, 1);
  assert.equal(report.duplicateToolGroups.length, 1);
});

test("CLI can run the tax meter against an external JSON file", () => {
  const result = spawnSync(process.execPath, ["dist/src/cli.js", "tax", "--input", "examples/minimal-tool-surface.json"], {
    cwd: process.cwd(),
    encoding: "utf8",
  });

  assert.equal(result.status, 0);
  assert.match(result.stdout, /MCP Capability Runtime Tax Meter/);
  assert.match(result.stdout, /Raw MCP-like surface\s+4 tools/);
  assert.match(result.stdout, /Capability surface\s+1 capabilities/);
  assert.equal(result.stderr, "");
});

test("CLI rejects conflicting demo and input options", () => {
  const result = spawnSync(
    process.execPath,
    ["dist/src/cli.js", "tax", "--demo", "--input", "examples/minimal-tool-surface.json"],
    {
      cwd: process.cwd(),
      encoding: "utf8",
    },
  );

  assert.equal(result.status, 1);
  assert.match(result.stderr, /choose either --demo or --input/);
});
