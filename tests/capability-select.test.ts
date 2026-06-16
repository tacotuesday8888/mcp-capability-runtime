import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import test from "node:test";

import {
  demoCapabilities,
  renderCapabilitySelectionReport,
  selectCapabilities,
} from "../src/index.js";

test("selects read-scoped incident capabilities with a dry-run receipt", () => {
  const report = selectCapabilities(demoCapabilities, {
    task: "Investigate checkout 500s from the last 30 minutes before editing code",
    context: ["service=checkout", "timeWindow=30m", "symptom=500"],
  });

  assert.equal(report.task, "Investigate checkout 500s from the last 30 minutes before editing code");
  assert.equal(report.maxPermissionLevel, "read");
  assert.equal(report.maxRiskLevel, "medium");
  assert.equal(report.consideredCapabilityCount, 8);
  assert.equal(report.selected[0]?.capabilityId, "triage-production-incident");
  assert.ok(report.selected[0]?.score && report.selected[0].score > 0);
  assert.deepEqual(report.selected[0]?.missingContext, []);
  assert.ok(report.selected[0]?.proofReturned.includes("trace id"));
  assert.ok(report.exposedToolCount > 0);
  assert.ok(report.selectedEstimatedTokens > 0);

  const blockedIds = report.blocked.map((blocked) => blocked.capabilityId);

  assert.ok(blockedIds.includes("prepare-code-change"));
  assert.ok(blockedIds.includes("merge-reviewed-pull-request"));
});

test("blocks capabilities that exceed the permission or risk ceiling", () => {
  const report = selectCapabilities(demoCapabilities, {
    task: "Merge reviewed pull request after CI is green",
    context: ["pull request id", "green check summary", "approval record"],
    maxPermissionLevel: "write",
    maxRiskLevel: "medium",
  });

  assert.equal(report.selected.some((selection) => selection.capabilityId === "merge-reviewed-pull-request"), false);

  const mergeBlock = report.blocked.find((blocked) => blocked.capabilityId === "merge-reviewed-pull-request");

  assert.ok(mergeBlock);
  assert.ok(mergeBlock.reasons.some((reason) => reason.code === "permission-exceeds-limit"));
  assert.ok(mergeBlock.reasons.some((reason) => reason.code === "risk-exceeds-limit"));
});

test("reports missing context separately from policy blocks", () => {
  const report = selectCapabilities(demoCapabilities, {
    task: "Investigate checkout 500s",
    context: ["service=checkout"],
  });

  const triage = report.blocked.find((blocked) => blocked.capabilityId === "triage-production-incident");

  assert.ok(triage);
  assert.deepEqual(triage.missingContext, ["time window", "symptom or trace id"]);
  assert.ok(triage.reasons.some((reason) => reason.code === "missing-context"));
});

test("does not satisfy required context from weak token overlap", () => {
  const report = selectCapabilities(demoCapabilities, {
    task: "Investigate checkout 500s",
    context: ["service=checkout", "timeWindow=30m", "id=123"],
  });

  assert.equal(
    report.selected.some((selection) => selection.capabilityId === "triage-production-incident"),
    false,
  );

  const triage = report.blocked.find((blocked) => blocked.capabilityId === "triage-production-incident");

  assert.ok(triage);
  assert.deepEqual(triage.missingContext, ["symptom or trace id"]);
});

test("orders selected capabilities deterministically and respects limit", () => {
  const report = selectCapabilities(demoCapabilities, {
    task: "Find checkout code and open issues before preparing a code change",
    context: ["repository name", "service area", "keyword=checkout", "incident keywords"],
    limit: 2,
  });

  assert.deepEqual(
    report.selected.map((selection) => selection.capabilityId),
    ["inspect-source-context", "inspect-work-items"],
  );

  const limitedReport = selectCapabilities(demoCapabilities, {
    task: "Find checkout code and open issues before preparing a code change",
    context: ["repository name", "service area", "keyword=checkout", "incident keywords"],
    limit: 1,
  });
  const overLimit = limitedReport.blocked.find((blocked) =>
    blocked.reasons.some((reason) => reason.code === "over-limit"),
  );

  assert.ok(overLimit);
  assert.equal(overLimit.capabilityId, "inspect-work-items");
});

test("normalizes invalid public API limits to a conservative default", () => {
  const report = selectCapabilities(demoCapabilities, {
    task: "Investigate checkout 500s",
    context: ["service=checkout", "timeWindow=30m", "symptom=500"],
    limit: -1,
  });

  assert.equal(report.limit, 5);
  assert.equal(report.selected[0]?.capabilityId, "triage-production-incident");
});

test("estimates selected tokens from the full selected capability metadata", () => {
  const report = selectCapabilities(demoCapabilities, {
    task: "Investigate checkout 500s",
    context: ["service=checkout", "timeWindow=30m", "symptom=500"],
  });

  assert.equal(report.selectedEstimatedTokens, 110);
});

test("renders a readable selector report", () => {
  const report = selectCapabilities(demoCapabilities, {
    task: "Investigate checkout 500s",
    context: ["service=checkout", "time window", "symptom=500"],
  });

  const rendered = renderCapabilitySelectionReport(report);

  assert.match(rendered, /MCP Capability Runtime Selector/);
  assert.match(rendered, /Selected capabilities/);
  assert.match(rendered, /triage-production-incident/);
  assert.match(rendered, /Dry-run receipt/);
});

test("CLI can run task-scoped selection against the demo surface", () => {
  const result = spawnSync(
    process.execPath,
    [
      "dist/src/cli.js",
      "select",
      "--demo",
      "--task",
      "Investigate checkout 500s",
      "--context",
      "service=checkout",
      "--context",
      "timeWindow=30m",
      "--context",
      "symptom=500",
    ],
    {
      cwd: process.cwd(),
      encoding: "utf8",
    },
  );

  assert.equal(result.status, 0);
  assert.match(result.stdout, /MCP Capability Runtime Selector/);
  assert.match(result.stdout, /triage-production-incident/);
  assert.equal(result.stderr, "");
});

test("CLI can print a stable JSON selection receipt", () => {
  const result = spawnSync(
    process.execPath,
    [
      "dist/src/cli.js",
      "select",
      "--demo",
      "--task",
      "Investigate checkout 500s",
      "--context",
      "service=checkout",
      "--context",
      "timeWindow=30m",
      "--context",
      "symptom=500",
      "--json",
    ],
    {
      cwd: process.cwd(),
      encoding: "utf8",
    },
  );

  assert.equal(result.status, 0);

  const parsed = JSON.parse(result.stdout) as { selected: Array<{ capabilityId: string }> };

  assert.equal(parsed.selected[0]?.capabilityId, "triage-production-incident");
  assert.equal(result.stderr, "");
});

test("JSON receipt does not expose tools for blocked capabilities", () => {
  const result = spawnSync(
    process.execPath,
    [
      "dist/src/cli.js",
      "select",
      "--demo",
      "--task",
      "Investigate checkout 500s",
      "--context",
      "service=checkout",
      "--context",
      "timeWindow=30m",
      "--context",
      "symptom=500",
      "--json",
    ],
    {
      cwd: process.cwd(),
      encoding: "utf8",
    },
  );

  assert.equal(result.status, 0);

  const parsed = JSON.parse(result.stdout) as {
    blocked: Array<{ capabilityId: string; underlyingTools?: string[]; proofReturned?: string[] }>;
  };
  const blockedMerge = parsed.blocked.find((blocked) => blocked.capabilityId === "merge-reviewed-pull-request");

  assert.ok(blockedMerge);
  assert.equal(blockedMerge.underlyingTools, undefined);
  assert.equal(blockedMerge.proofReturned, undefined);
  assert.doesNotMatch(result.stdout, /pr\.merge/);
});
