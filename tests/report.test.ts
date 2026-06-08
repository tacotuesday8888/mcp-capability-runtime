import assert from "node:assert/strict";
import test from "node:test";

import {
  computeTaxMeter,
  demoCapabilities,
  demoServers,
  renderTaxMeterReport,
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
