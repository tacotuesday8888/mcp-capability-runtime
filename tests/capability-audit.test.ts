import assert from "node:assert/strict";
import test from "node:test";

import { auditToolSurface, demoCapabilities, demoServers } from "../src/index.js";
import type { Capability, McpLikeServer } from "../src/index.js";

function cloneDemo(): { servers: McpLikeServer[]; capabilities: Capability[] } {
  return {
    servers: structuredClone(demoServers),
    capabilities: structuredClone(demoCapabilities),
  };
}

test("demo capability surface is semantically valid", () => {
  const audit = auditToolSurface(demoServers, demoCapabilities);

  assert.equal(audit.valid, true);
  assert.deepEqual(audit.issues, []);
});

test("audit reports duplicate server, tool, and capability ids", () => {
  const { servers, capabilities } = cloneDemo();

  servers[1] = { ...servers[1]!, id: servers[0]!.id };
  servers[1]!.tools[0] = { ...servers[1]!.tools[0]!, id: servers[0]!.tools[0]!.id };
  capabilities[1] = { ...capabilities[1]!, id: capabilities[0]!.id };

  const audit = auditToolSurface(servers, capabilities);

  assert.equal(audit.valid, false);
  assert.ok(audit.issues.some((issue) => issue.code === "duplicate-server-id"));
  assert.ok(audit.issues.some((issue) => issue.code === "duplicate-tool-id"));
  assert.ok(audit.issues.some((issue) => issue.code === "duplicate-capability-id"));
});

test("audit reports missing underlying tools and understated risk metadata", () => {
  const { servers, capabilities } = cloneDemo();

  capabilities[0] = {
    ...capabilities[0]!,
    permissionLevel: "read",
    riskLevel: "low",
    underlyingTools: ["db.dropTable", "missing.tool"],
  };

  const audit = auditToolSurface(servers, capabilities);

  assert.equal(audit.valid, false);
  assert.ok(audit.issues.some((issue) => issue.code === "missing-underlying-tool"));
  assert.ok(audit.issues.some((issue) => issue.code === "understated-permission-level"));
  assert.ok(audit.issues.some((issue) => issue.code === "understated-risk-level"));
  assert.match(audit.issues.map((issue) => issue.path).join("\n"), /capabilities\[0\]\.underlyingTools\[1\]/);
});

test("audit reports empty required capability arrays", () => {
  const { servers, capabilities } = cloneDemo();

  capabilities[0] = {
    ...capabilities[0]!,
    requiredContext: [],
    underlyingTools: [],
    proofReturned: [],
    examples: [],
  };

  const audit = auditToolSurface(servers, capabilities);

  assert.equal(audit.valid, false);
  assert.equal(audit.issues.filter((issue) => issue.code === "empty-required-array").length, 4);
});
