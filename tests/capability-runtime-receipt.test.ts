import assert from "node:assert/strict";
import test from "node:test";

import {
  createDemoInvocationReceipt,
  demoCapabilities,
  demoServers,
  planCapabilityInvocation,
  recordCapabilityInvocation,
  selectCapabilities,
} from "../src/index.js";
import type { CapabilityInvocationPlan, CapabilityInvocationToolResult } from "../src/index.js";

const triageResults: CapabilityInvocationToolResult[] = [
  {
    toolId: "error.searchEvents",
    status: "ok",
    summary: "Found 17 checkout 500 events in the last 30 minutes.",
    proof: {
      "event ids": ["evt_checkout_500_001", "evt_checkout_500_017"],
      "log query": "service=checkout status=500 window=30m",
    },
  },
  {
    toolId: "error.getTrace",
    status: "ok",
    summary: "Read the highest-volume checkout trace.",
    proof: {
      "trace id": "trace_checkout_9f12",
    },
  },
  {
    toolId: "deploy.searchLogs",
    status: "ok",
    summary: "Confirmed errors started after the current release reached production.",
    proof: {
      "log query": "service=checkout release=release_2026_06_16_1432 severity=error",
    },
  },
  {
    toolId: "deploy.getStatus",
    status: "ok",
    summary: "Checked production deployment status for checkout.",
    proof: {
      "release id": "release_2026_06_16_1432",
    },
  },
  {
    toolId: "chat.searchIncidentChannel",
    status: "ok",
    summary: "Found the active incident thread and linked evidence.",
    proof: {
      "chat permalink": "https://chat.example.local/incidents/checkout-500s/p/1718541120",
    },
  },
];

test("records a deterministic local invocation receipt", () => {
  const receipt = recordCapabilityInvocation({
    plan: createTriagePlan(),
    source: "local-fixture",
    results: triageResults,
  });

  assert.equal(receipt.mode, "capability-invocation-receipt");
  assert.equal(receipt.valid, true);
  assert.equal(receipt.executionMode, "local-simulated");
  assert.equal(receipt.source, "local-fixture");
  assert.equal(receipt.toolsExecuted, true);
  assert.deepEqual(receipt.issues, []);
  assert.deepEqual(receipt.missingProof, []);
  assert.deepEqual(receipt.changedResources, []);
  assert.deepEqual(receipt.plannedToolIds, [
    "error.searchEvents",
    "error.getTrace",
    "deploy.searchLogs",
    "deploy.getStatus",
    "chat.searchIncidentChannel",
  ]);
  assert.deepEqual(receipt.attemptedToolIds, receipt.plannedToolIds);
  assert.deepEqual(
    receipt.executedToolRoutes.map((route) => [route.toolId, route.status, route.proofReturned]),
    [
      ["error.searchEvents", "ok", ["event ids", "log query"]],
      ["error.getTrace", "ok", ["trace id"]],
      ["deploy.searchLogs", "ok", ["log query"]],
      ["deploy.getStatus", "ok", ["release id"]],
      ["chat.searchIncidentChannel", "ok", ["chat permalink"]],
    ],
  );
  assert.deepEqual(receipt.proof, [
    {
      label: "event ids",
      values: ["evt_checkout_500_001", "evt_checkout_500_017"],
      toolIds: ["error.searchEvents"],
    },
    {
      label: "trace id",
      values: ["trace_checkout_9f12"],
      toolIds: ["error.getTrace"],
    },
    {
      label: "release id",
      values: ["release_2026_06_16_1432"],
      toolIds: ["deploy.getStatus"],
    },
    {
      label: "log query",
      values: [
        "service=checkout status=500 window=30m",
        "service=checkout release=release_2026_06_16_1432 severity=error",
      ],
      toolIds: ["error.searchEvents", "deploy.searchLogs"],
    },
    {
      label: "chat permalink",
      values: ["https://chat.example.local/incidents/checkout-500s/p/1718541120"],
      toolIds: ["chat.searchIncidentChannel"],
    },
  ]);
});

test("refuses to record execution from an invalid invocation plan", () => {
  const selection = selectCapabilities(demoCapabilities, {
    task: "Investigate checkout 500s",
    context: ["service=checkout", "timeWindow=30m", "symptom=500"],
  });
  const invalidPlan = planCapabilityInvocation({
    servers: demoServers,
    capabilities: demoCapabilities,
    receipt: selection.receipt,
    capabilityId: "merge-reviewed-pull-request",
  });

  const receipt = recordCapabilityInvocation({
    plan: invalidPlan,
    source: "local-fixture",
    results: triageResults,
  });

  assert.equal(receipt.valid, false);
  assert.equal(receipt.toolsExecuted, false);
  assert.deepEqual(receipt.attemptedToolIds, []);
  assert.deepEqual(receipt.executedToolRoutes, []);
  assert.deepEqual(receipt.proof, []);
  assert.ok(receipt.issues.some((issue) => issue.code === "invalid-invocation-plan"));
});

test("rejects tool results outside the planned route list", () => {
  const receipt = recordCapabilityInvocation({
    plan: createTriagePlan(),
    source: "local-fixture",
    results: [
      ...triageResults,
      {
        toolId: "pr.merge",
        status: "ok",
        summary: "This should never be accepted by a read-only incident receipt.",
        proof: {
          "merge commit sha": "abc123",
        },
      },
    ],
  });

  assert.equal(receipt.valid, false);
  assert.ok(receipt.issues.some((issue) => issue.code === "unplanned-tool-result"));
  assert.ok(receipt.attemptedToolIds.includes("pr.merge"));
  assert.ok(receipt.executedToolRoutes.every((route) => route.toolId !== "pr.merge"));
  assert.deepEqual(
    receipt.proof.flatMap((entry) => entry.values).filter((value) => value === "abc123"),
    [],
  );
});

test("reports duplicate tool results and keeps output order deterministic", () => {
  const receipt = recordCapabilityInvocation({
    plan: createTriagePlan(),
    source: "local-fixture",
    results: [triageResults[0]!, ...triageResults],
  });

  assert.equal(receipt.valid, false);
  assert.ok(receipt.issues.some((issue) => issue.code === "duplicate-tool-result"));
  assert.deepEqual(receipt.attemptedToolIds, [
    "error.searchEvents",
    "error.getTrace",
    "deploy.searchLogs",
    "deploy.getStatus",
    "chat.searchIncidentChannel",
  ]);
});

test("reports missing planned tool results", () => {
  const plan = createTriagePlan(["deploy.getStatus", "error.searchEvents"]);
  const receipt = recordCapabilityInvocation({
    plan,
    source: "local-fixture",
    results: [triageResults[3]!],
  });

  assert.equal(receipt.valid, false);
  assert.ok(receipt.issues.some((issue) => issue.code === "missing-tool-result"));
  assert.ok(receipt.issues.some((issue) => issue.message.includes("error.searchEvents")));
  assert.deepEqual(
    receipt.executedToolRoutes.map((route) => [route.toolId, route.status]),
    [
      ["deploy.getStatus", "ok"],
      ["error.searchEvents", "missing"],
    ],
  );
});

test("reports missing required proof even when every tool returned", () => {
  const receipt = recordCapabilityInvocation({
    plan: createTriagePlan(),
    source: "local-fixture",
    results: triageResults.map((result) =>
      result.toolId === "error.getTrace" ? { ...result, proof: {} } : result,
    ),
  });

  assert.equal(receipt.valid, false);
  assert.deepEqual(receipt.missingProof, ["trace id"]);
  assert.ok(receipt.issues.some((issue) => issue.code === "missing-required-proof"));
});

test("records failed local tool results as attempted and invalid", () => {
  const receipt = recordCapabilityInvocation({
    plan: createTriagePlan(["error.getTrace"]),
    results: [
      {
        toolId: "error.getTrace",
        status: "error",
        summary: "Trace lookup failed in the local fixture.",
        errorMessage: "trace fixture unavailable",
        proof: {
          "event ids": ["evt_checkout_500_001"],
          "trace id": "trace_checkout_9f12",
          "release id": "release_2026_06_16_1432",
          "log query": "service=checkout status=500 window=30m",
          "chat permalink": "https://chat.example.local/incidents/checkout-500s/p/1718541120",
        },
      },
    ],
  });

  assert.equal(receipt.source, "caller-supplied");
  assert.equal(receipt.valid, false);
  assert.equal(receipt.toolsExecuted, true);
  assert.deepEqual(receipt.attemptedToolIds, ["error.getTrace"]);
  assert.equal(receipt.executedToolRoutes[0]?.status, "error");
  assert.equal(receipt.executedToolRoutes[0]?.errorMessage, "trace fixture unavailable");
  assert.deepEqual(receipt.missingProof, ["event ids", "trace id", "release id", "log query", "chat permalink"]);
  assert.ok(receipt.issues.some((issue) => issue.code === "tool-execution-failed"));
  assert.ok(receipt.issues.some((issue) => issue.code === "missing-required-proof"));
});

test("creates the checked-in local demo invocation receipt", () => {
  const receipt = createDemoInvocationReceipt();

  assert.equal(receipt.valid, true);
  assert.equal(receipt.source, "local-fixture");
  assert.equal(receipt.capabilityId, "triage-production-incident");
  assert.deepEqual(receipt.missingProof, []);
});

function createTriagePlan(requestedToolIds?: string[]): CapabilityInvocationPlan {
  const selection = selectCapabilities(demoCapabilities, {
    task: "Investigate checkout 500s from the last 30 minutes",
    context: ["service=checkout", "timeWindow=30m", "symptom=500"],
  });

  return planCapabilityInvocation({
    servers: demoServers,
    capabilities: demoCapabilities,
    receipt: selection.receipt,
    capabilityId: "triage-production-incident",
    ...(requestedToolIds === undefined ? {} : { requestedToolIds }),
  });
}
