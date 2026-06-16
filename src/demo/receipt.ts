import { selectCapabilities } from "../capabilities/select.js";
import { planCapabilityInvocation } from "../runtime/plan.js";
import { recordCapabilityInvocation } from "../runtime/receipt.js";
import type { CapabilityInvocationReceipt, CapabilityInvocationToolResult } from "../types.js";
import { demoCapabilities, demoServers } from "./fixture.js";

export const demoInvocationToolResults: CapabilityInvocationToolResult[] = [
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

export function createDemoInvocationReceipt(): CapabilityInvocationReceipt {
  const selection = selectCapabilities(demoCapabilities, {
    task: "Investigate checkout 500s from the last 30 minutes",
    context: ["service=checkout", "timeWindow=30m", "symptom=500"],
  });
  const plan = planCapabilityInvocation({
    servers: demoServers,
    capabilities: demoCapabilities,
    receipt: selection.receipt,
    capabilityId: "triage-production-incident",
  });

  return recordCapabilityInvocation({
    plan,
    source: "local-fixture",
    results: demoInvocationToolResults,
  });
}

export function renderDemoReceiptReport(): string {
  const receipt = createDemoInvocationReceipt();

  return [
    "MCP Capability Runtime Local Receipt",
    "====================================",
    "",
    `Task                     ${receipt.task}`,
    `Capability               ${receipt.capabilityId}`,
    `Execution mode           ${receipt.executionMode} (${receipt.source})`,
    `Receipt valid            ${receipt.valid ? "yes" : "no"}`,
    `Tools executed           ${receipt.toolsExecuted ? "yes" : "no"}`,
    `Changed resources        ${receipt.changedResources.length === 0 ? "none" : receipt.changedResources.join(", ")}`,
    "",
    "Planned tool routes",
    ...receipt.executedToolRoutes.map((route) => {
      return `- ${route.toolId} via ${route.serverTitle}/${route.toolName}: ${route.status}`;
    }),
    "",
    "Proof returned",
    ...receipt.proof.map((entry) => `- ${entry.label}: ${entry.values.join(", ")}`),
    "",
    "Receipt boundary",
    "- records supplied local fixture results",
    "- rejects invalid plans, unplanned tools, duplicate results, missing results, failed results, and missing proof",
    "- no real MCP servers, SaaS accounts, credentials, network transports, or production tools were used",
  ].join("\n");
}
