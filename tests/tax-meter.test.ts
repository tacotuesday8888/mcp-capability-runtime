import assert from "node:assert/strict";
import test from "node:test";

import {
  computeTaxMeter,
  demoCapabilities,
  demoServers,
  estimatePromptTokens,
  flattenTools,
} from "../src/index.js";

test("demo fixture exposes ten MCP-like developer servers", () => {
  assert.equal(demoServers.length, 10);

  const tools = flattenTools(demoServers);

  assert.equal(tools.length, 40);
  assert.ok(tools.some((tool) => tool.duplicateGroup === "incident-evidence-search"));
  assert.ok(tools.some((tool) => tool.noisy));
  assert.ok(tools.some((tool) => tool.riskLevel === "high"));
});

test("cleaned capability surface is smaller and keeps proof metadata", () => {
  assert.equal(demoCapabilities.length, 8);
  assert.ok(demoCapabilities.length < flattenTools(demoServers).length);

  for (const capability of demoCapabilities) {
    assert.ok(capability.id.length > 0);
    assert.ok(capability.intent.length > 0);
    assert.ok(capability.whenToUse.length > 0);
    assert.ok(capability.requiredContext.length > 0);
    assert.ok(capability.underlyingTools.length > 0);
    assert.ok(capability.proofReturned.length > 0);
    assert.ok(capability.examples.length > 0);
  }
});

test("tax meter reports count, token, risk, noise, and duplicate reductions", () => {
  const report = computeTaxMeter(demoServers, demoCapabilities);

  assert.equal(report.mode, "comparison");
  assert.equal(report.rawToolCount, 40);
  assert.equal(report.capabilityCount, 8);
  assert.equal(report.riskyRawToolCount, 9);
  assert.equal(report.riskyCapabilityCount, 1);
  assert.equal(report.noisyRawToolCount, 8);
  assert.equal(report.duplicateToolGroups.length, 5);
  assert.equal(report.toolCountReductionPercent, 80);
  assert.ok(report.rawEstimatedTokens > report.capabilityEstimatedTokens);
  assert.ok(report.tokenReductionPercent > 50);
  assert.ok(report.riskyExposureReductionPercent > 80);
});

test("token heuristic is deterministic and treats empty text as zero", () => {
  assert.equal(estimatePromptTokens(""), 0);
  assert.equal(estimatePromptTokens("search logs by trace id"), 6);
  assert.equal(estimatePromptTokens(["search logs", "trace:id"]), 5);
});
