#!/usr/bin/env node

import { computeTaxMeter, demoCapabilities, demoServers, renderTaxMeterReport } from "./index.js";

function printHelp(): void {
  console.log(
    [
      "Usage: mcp-capability-runtime demo:tax",
      "",
      "Commands:",
      "  demo:tax   Compare the raw 10-server MCP-like tool pile with the cleaned capability surface.",
    ].join("\n"),
  );
}

const command = process.argv[2] ?? "demo:tax";

if (command === "demo:tax") {
  console.log(renderTaxMeterReport(computeTaxMeter(demoServers, demoCapabilities)));
} else if (command === "--help" || command === "-h" || command === "help") {
  printHelp();
} else {
  console.error(`Unknown command: ${command}`);
  printHelp();
  process.exitCode = 1;
}
