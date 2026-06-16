import assert from "node:assert/strict";
import test from "node:test";

import {
  demoCapabilities,
  demoServers,
  loadToolSurfaceFile,
  planCapabilityInvocation,
  selectCapabilities,
} from "../src/index.js";

test("plans selected capability routes without executing tools", () => {
  const selection = selectCapabilities(demoCapabilities, {
    task: "Investigate checkout 500s",
    context: ["service=checkout", "timeWindow=30m", "symptom=500"],
  });

  const plan = planCapabilityInvocation({
    servers: demoServers,
    capabilities: demoCapabilities,
    receipt: selection.receipt,
    capabilityId: "triage-production-incident",
  });

  assert.equal(plan.mode, "capability-invocation-plan");
  assert.equal(plan.valid, true);
  assert.equal(plan.toolsExecuted, false);
  assert.deepEqual(plan.issues, []);
  assert.deepEqual(
    plan.allowedToolRoutes.map((route) => route.toolId),
    [
      "error.searchEvents",
      "error.getTrace",
      "deploy.searchLogs",
      "deploy.getStatus",
      "chat.searchIncidentChannel",
    ],
  );
  assert.equal(plan.allowedToolRoutes[0]?.serverTitle, "Error Tracker");
  assert.ok(plan.proofRequired.includes("trace id"));
});

test("preserves explicit requested tool order", () => {
  const selection = selectCapabilities(demoCapabilities, {
    task: "Investigate checkout 500s",
    context: ["service=checkout", "timeWindow=30m", "symptom=500"],
  });

  const plan = planCapabilityInvocation({
    servers: demoServers,
    capabilities: demoCapabilities,
    receipt: selection.receipt,
    capabilityId: "triage-production-incident",
    requestedToolIds: ["deploy.getStatus", "error.searchEvents"],
  });

  assert.equal(plan.valid, true);
  assert.deepEqual(
    plan.allowedToolRoutes.map((route) => route.toolId),
    ["deploy.getStatus", "error.searchEvents"],
  );
});

test("rejects invocation planning for a blocked capability", () => {
  const selection = selectCapabilities(demoCapabilities, {
    task: "Investigate checkout 500s",
    context: ["service=checkout", "timeWindow=30m", "symptom=500"],
  });

  const plan = planCapabilityInvocation({
    servers: demoServers,
    capabilities: demoCapabilities,
    receipt: selection.receipt,
    capabilityId: "merge-reviewed-pull-request",
  });

  assert.equal(plan.valid, false);
  assert.deepEqual(plan.allowedToolRoutes, []);
  assert.deepEqual(plan.requestedToolIds, []);
  assert.deepEqual(plan.proofRequired, []);
  assert.ok(plan.issues.some((issue) => issue.code === "capability-not-selected"));
  assert.equal(plan.toolsExecuted, false);
});

test("rejects requested tools outside the selected capability", () => {
  const selection = selectCapabilities(demoCapabilities, {
    task: "Investigate checkout 500s",
    context: ["service=checkout", "timeWindow=30m", "symptom=500"],
  });

  const plan = planCapabilityInvocation({
    servers: demoServers,
    capabilities: demoCapabilities,
    receipt: selection.receipt,
    capabilityId: "triage-production-incident",
    requestedToolIds: ["pr.merge"],
  });

  assert.equal(plan.valid, false);
  assert.deepEqual(plan.allowedToolRoutes, []);
  assert.ok(plan.issues.some((issue) => issue.code === "tool-not-in-capability"));
  assert.ok(plan.issues.some((issue) => issue.code === "tool-not-exposed"));
});

test("rejects an explicit empty tool request", () => {
  const selection = selectCapabilities(demoCapabilities, {
    task: "Investigate checkout 500s",
    context: ["service=checkout", "timeWindow=30m", "symptom=500"],
  });

  const plan = planCapabilityInvocation({
    servers: demoServers,
    capabilities: demoCapabilities,
    receipt: selection.receipt,
    capabilityId: "triage-production-incident",
    requestedToolIds: [],
  });

  assert.equal(plan.valid, false);
  assert.ok(plan.issues.some((issue) => issue.code === "empty-tool-request"));
  assert.deepEqual(plan.allowedToolRoutes, []);
  assert.deepEqual(plan.proofRequired, []);
});

test("rejects receipts edited to understate selected permission or risk", () => {
  const selection = selectCapabilities(demoCapabilities, {
    task: "Prepare checkout code change and open pull request",
    context: ["branch name", "file paths", "patch summary", "linked issue"],
    maxPermissionLevel: "write",
    maxRiskLevel: "medium",
  });

  const plan = planCapabilityInvocation({
    servers: demoServers,
    capabilities: demoCapabilities,
    receipt: {
      ...selection.receipt,
      maxPermissionLevel: "read",
      selected: selection.receipt.selected.map((selected) =>
        selected.capabilityId === "prepare-code-change"
          ? { ...selected, permissionLevel: "read", riskLevel: "low" }
          : selected,
      ),
    },
    capabilityId: "prepare-code-change",
  });

  assert.equal(plan.valid, false);
  assert.deepEqual(plan.requestedToolIds, []);
  assert.deepEqual(plan.proofRequired, []);
  assert.ok(plan.issues.some((issue) => issue.code === "receipt-policy-mismatch"));
  assert.ok(plan.issues.some((issue) => issue.code === "receipt-risk-mismatch"));
});

test("rejects stale receipts that no longer expose required capability tools", () => {
  const selection = selectCapabilities(demoCapabilities, {
    task: "Investigate checkout 500s",
    context: ["service=checkout", "timeWindow=30m", "symptom=500"],
  });

  const plan = planCapabilityInvocation({
    servers: demoServers,
    capabilities: demoCapabilities,
    receipt: {
      ...selection.receipt,
      exposedUnderlyingTools: selection.receipt.exposedUnderlyingTools.filter((toolId) => toolId !== "deploy.getStatus"),
    },
    capabilityId: "triage-production-incident",
    requestedToolIds: ["deploy.getStatus"],
  });

  assert.equal(plan.valid, false);
  assert.deepEqual(plan.allowedToolRoutes, []);
  assert.ok(plan.issues.some((issue) => issue.code === "tool-not-exposed"));
});

test("plans invocation routes from an external JSON capability surface", () => {
  const surface = loadToolSurfaceFile("examples/minimal-tool-surface.json");

  assert.ok(surface.capabilities);

  const selection = selectCapabilities(surface.capabilities, {
    task: "Investigate checkout logs",
    context: ["service=checkout", "timeWindow=30m", "symptom=500"],
  });
  const plan = planCapabilityInvocation({
    servers: surface.servers,
    capabilities: surface.capabilities,
    receipt: selection.receipt,
    capabilityId: "investigate-checkout-incident",
  });

  assert.equal(plan.valid, true);
  assert.deepEqual(
    plan.allowedToolRoutes.map((route) => route.toolId),
    ["logs.search", "repo.search"],
  );
});
