import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  computeTaxMeter,
  demoCapabilities,
  demoServers,
  loadToolSurfaceFile,
  renderCapabilitySelectionReport,
  renderDemoWalkthroughReport,
  renderTaxMeterReport,
  selectCapabilities,
} from "../src/index.js";

test("tax meter report renders a stable before and after summary", () => {
  const report = renderTaxMeterReport(computeTaxMeter(demoServers, demoCapabilities));

  assert.match(report, /MCP Capability Runtime Tax Meter/);
  assert.match(report, /Raw MCP-like surface\s+40 tools/);
  assert.match(report, /Capability surface\s+8 capabilities/);
  assert.match(report, /Tool count reduction\s+80%/);
  assert.match(report, /Noisy raw tools\s+8/);
  assert.match(report, /incident-evidence-search/);
  assert.match(report, /Heuristic:/);
});

test("tax meter report renders raw-only surfaces without fake reductions", () => {
  const surface = loadToolSurfaceFile("examples/raw-tool-surface.json");
  const report = renderTaxMeterReport(computeTaxMeter(surface.servers, surface.capabilities));

  assert.match(report, /Raw MCP-like surface\s+4 tools/);
  assert.match(report, /Capability surface\s+not provided/);
  assert.match(report, /No capability surface was provided/);
  assert.doesNotMatch(report, /Tool count reduction\s+\d+%/);
  assert.doesNotMatch(report, /Token estimate reduction\s+\d+%/);
});

test("demo tax output matches the checked-in golden example", () => {
  const expected = readFileSync("examples/demo-tax-output.txt", "utf8").trimEnd();
  const actual = renderTaxMeterReport(computeTaxMeter(demoServers, demoCapabilities));

  assert.equal(actual, expected);
});

test("demo selector output matches the checked-in golden example", () => {
  const expected = readFileSync("examples/demo-select-output.txt", "utf8").trimEnd();
  const actual = renderCapabilitySelectionReport(
    selectCapabilities(demoCapabilities, {
      task: "Investigate checkout 500s from the last 30 minutes",
      context: ["service=checkout", "timeWindow=30m", "symptom=500"],
    }),
  );

  assert.equal(actual, expected);
});

test("demo walkthrough output matches the checked-in golden example", () => {
  const expected = readFileSync("examples/demo-walkthrough-output.txt", "utf8").trimEnd();
  const actual = renderDemoWalkthroughReport();

  assert.equal(actual, expected);
});
