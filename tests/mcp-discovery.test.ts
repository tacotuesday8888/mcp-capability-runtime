import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import test from "node:test";

import {
  ToolSurfaceValidationError,
  computeTaxMeter,
  discoverMcpToolSurface,
  loadMcpDiscoveryConfigFile,
  parseMcpDiscoveryConfig,
  renderMcpDiscoveryReport,
} from "../src/index.js";

test("normalizes MCP tools/list transcript pages into a raw-only tool surface", () => {
  const report = discoverMcpToolSurface(
    parseMcpDiscoveryConfig({
      name: "local discovery",
      servers: [
        {
          id: "logs",
          title: "Logs MCP",
          category: "runtime logs",
          description: "Read-only log tools.",
          toolsList: [
            {
              tools: [
                {
                  name: "search",
                  title: "Search Logs",
                  description: "Search production logs by service and trace.",
                  inputSchema: { type: "object", properties: { service: { type: "string" } } },
                  annotations: { readOnlyHint: true },
                },
              ],
              nextCursor: "page-2",
            },
            {
              cursor: "page-2",
              tools: [
                {
                  name: "tail",
                  title: "Tail Logs",
                  inputSchema: { type: "object", additionalProperties: false },
                  annotations: { openWorldHint: true },
                },
              ],
            },
          ],
        },
        {
          id: "repo",
          title: "Repo MCP",
          category: "source repository",
          description: "Repository metadata tools.",
          toolsList: [
            {
              tools: [
                {
                  name: "search",
                  title: "Search Code",
                  description: "Search repository files.",
                  inputSchema: { type: "object", properties: { query: { type: "string" } } },
                  annotations: { readOnlyHint: true },
                  outputSchema: { type: "object", properties: { paths: { type: "array" } } },
                  _meta: { source: "fixture" },
                },
                {
                  name: "delete_branch",
                  title: "Delete Branch",
                  description: "Delete a branch.",
                  inputSchema: { type: "object", properties: { branch: { type: "string" } } },
                  annotations: { destructiveHint: true },
                },
              ],
            },
          ],
        },
      ],
    }),
  );

  assert.equal(report.mode, "mcp-discovery");
  assert.equal(report.source, "tools-list-transcript");
  assert.equal(report.toolsExecuted, false);
  assert.deepEqual(report.issues, []);
  assert.equal(report.surface.name, "local discovery");
  assert.equal(report.surface.capabilities, undefined);
  assert.deepEqual(
    report.surface.servers.flatMap((server) => server.tools.map((tool) => tool.id)),
    ["logs.search", "logs.tail", "repo.search", "repo.delete_branch"],
  );
  assert.equal(report.surface.servers[0]?.tools[0]?.permissionLevel, "read");
  assert.equal(report.surface.servers[0]?.tools[0]?.riskLevel, "medium");
  assert.equal(report.surface.servers[0]?.tools[1]?.description, "Tail Logs");
  assert.equal(report.surface.servers[0]?.tools[1]?.permissionLevel, "admin");
  assert.equal(report.surface.servers[0]?.tools[1]?.riskLevel, "high");
  assert.equal(report.surface.servers[1]?.tools[1]?.permissionLevel, "admin");
  assert.equal(report.surface.servers[1]?.tools[1]?.riskLevel, "high");
  assert.deepEqual(report.metadata.map((metadata) => metadata.toolId), [
    "logs.search",
    "logs.tail",
    "repo.search",
    "repo.delete_branch",
  ]);
  assert.deepEqual(report.metadata[0]?.inputSchema, {
    type: "object",
    properties: { service: { type: "string" } },
  });
  assert.deepEqual(report.metadata[2]?.outputSchema, { type: "object", properties: { paths: { type: "array" } } });
  assert.deepEqual(report.metadata[2]?._meta, { source: "fixture" });

  const tax = computeTaxMeter(report.surface.servers, report.surface.capabilities);
  assert.equal(tax.mode, "raw-only");
  assert.equal(tax.rawToolCount, 4);
  assert.equal(tax.riskyRawToolCount, 2);
});

test("reports duplicate normalized tool ids without calling tools", () => {
  const report = discoverMcpToolSurface(
    parseMcpDiscoveryConfig({
      servers: [
        {
          id: "logs",
          title: "Logs MCP",
          category: "runtime logs",
          description: "Read-only log tools.",
          toolsList: [
            {
              tools: [
                { name: "search", description: "Search logs.", inputSchema: { type: "object" } },
                { name: "search", description: "Search logs again.", inputSchema: { type: "object" } },
              ],
            },
          ],
        },
      ],
    }),
  );

  assert.equal(report.toolsExecuted, false);
  assert.equal(report.surface.servers[0]?.tools.length, 1);
  assert.deepEqual(report.issues, [
    {
      code: "duplicate-tool-id",
      path: "servers[0].toolsList[0].tools[1].name",
      message: "tool logs.search was already discovered; duplicate tools are ignored",
    },
  ]);
});

test("validates discovery config shape with useful paths", () => {
  assert.throws(
    () =>
      parseMcpDiscoveryConfig({
        servers: [
          {
            id: "bad server id",
            title: "Bad",
            category: "bad",
            description: "Bad config.",
            toolsList: [{ tools: [{ name: "bad tool name", inputSchema: null }] }],
          },
        ],
      }),
    (error: unknown) => {
      assert.ok(error instanceof ToolSurfaceValidationError);
      assert.match(error.message, /servers\[0\]\.id/);
      assert.match(error.message, /servers\[0\]\.toolsList\[0\]\.tools\[0\]\.name/);
      assert.match(error.message, /servers\[0\]\.toolsList\[0\]\.tools\[0\]\.inputSchema/);
      return true;
    },
  );
});

test("reports invalid pagination and duplicate server ids as discovery issues", () => {
  const report = discoverMcpToolSurface(
    parseMcpDiscoveryConfig({
      servers: [
        {
          id: "logs",
          title: "Logs MCP",
          category: "runtime logs",
          description: "Read-only log tools.",
          toolsList: [
            {
              tools: [{ name: "search", description: "Search logs.", inputSchema: { type: "object" } }],
              nextCursor: "expected-next",
            },
            {
              cursor: "wrong-next",
              tools: [{ name: "tail", description: "Tail logs.", inputSchema: { type: "object" } }],
            },
            {
              cursor: "wrong-next",
              tools: [{ name: "explain", description: "Explain logs.", inputSchema: { type: "object" } }],
              nextCursor: "missing-page",
            },
          ],
        },
        {
          id: "logs",
          title: "Duplicate Logs MCP",
          category: "runtime logs",
          description: "Duplicate server.",
          toolsList: [
            {
              tools: [{ name: "other", description: "Other logs.", inputSchema: { type: "object" } }],
            },
          ],
        },
      ],
    }),
  );

  assert.deepEqual(
    report.issues.map((issue) => issue.code),
    ["cursor-mismatch", "duplicate-cursor", "dangling-next-cursor", "invalid-tool-surface"],
  );
  assert.equal(report.toolsExecuted, false);
});

test("loads the example discovery config and renders a stable report", () => {
  const config = loadMcpDiscoveryConfigFile("examples/mcp-discovery-config.json");
  const report = discoverMcpToolSurface(config);
  const rendered = renderMcpDiscoveryReport(report);

  assert.equal(report.surface.servers.length, 2);
  assert.equal(report.surface.servers[0]?.tools.length, 2);
  assert.match(rendered, /MCP Capability Runtime Discovery/);
  assert.match(rendered, /toolsExecuted=false/);
  assert.match(rendered, /no real MCP tools were called/);
});

test("CLI prints discovered raw-only surface JSON", () => {
  const result = spawnSync(
    process.execPath,
    ["dist/src/cli.js", "discover", "--config", "examples/mcp-discovery-config.json", "--json"],
    {
      cwd: process.cwd(),
      encoding: "utf8",
    },
  );

  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stderr, "");

  const surface = JSON.parse(result.stdout) as { servers: Array<{ tools: Array<{ id: string }> }> };
  assert.deepEqual(
    surface.servers.flatMap((server) => server.tools.map((tool) => tool.id)),
    ["local-logs.search_events", "local-logs.get_trace", "local-repo.search_code", "local-repo.delete_branch"],
  );
});

test("CLI refuses tax-ready JSON when discovery has issues", () => {
  const result = spawnSync(
    process.execPath,
    ["dist/src/cli.js", "discover", "--config", "examples/mcp-discovery-invalid-config.json", "--json"],
    {
      cwd: process.cwd(),
      encoding: "utf8",
    },
  );

  assert.equal(result.status, 1);
  assert.equal(result.stdout, "");
  assert.match(result.stderr, /discovery produced issues/);
  assert.match(result.stderr, /duplicate-tool-id/);
});
