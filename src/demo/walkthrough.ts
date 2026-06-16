import { selectCapabilities } from "../capabilities/select.js";
import { planCapabilityInvocation } from "../runtime/plan.js";
import { computeTaxMeter } from "../tax-meter/tax-meter.js";
import type { CapabilitySelectionReport } from "../types.js";
import { demoCapabilities, demoServers } from "./fixture.js";

export function renderDemoWalkthroughReport(): string {
  const tax = computeTaxMeter(demoServers, demoCapabilities);
  const triage = selectCapabilities(demoCapabilities, {
    task: "Investigate checkout 500s from the last 30 minutes",
    context: ["service=checkout", "timeWindow=30m", "symptom=500"],
  });
  const triagePlan = planCapabilityInvocation({
    servers: demoServers,
    capabilities: demoCapabilities,
    receipt: triage.receipt,
    capabilityId: "triage-production-incident",
  });
  const source = selectCapabilities(demoCapabilities, {
    task: "Find checkout code and open issues before preparing a code change",
    context: ["repository name", "service area", "keyword=checkout", "incident keywords"],
    limit: 2,
  });
  const blockedWrite = selectCapabilities(demoCapabilities, {
    task: "Prepare checkout code change and open pull request",
    context: ["branch name", "file paths", "patch summary", "linked issue"],
  });
  const writeBlock = blockedWrite.blocked.find((blocked) => blocked.capabilityId === "prepare-code-change");

  return [
    "MCP Capability Runtime Walkthrough",
    "==================================",
    "",
    "Story                    10 MCP-like servers, one production incident, staged capability exposure",
    "",
    "1. Measure the MCP tax",
    `- raw tools: ${tax.rawToolCount} (~${tax.rawEstimatedTokens} prompt tokens)`,
    `- capabilities: ${tax.capabilityCount} (~${tax.capabilityEstimatedTokens} prompt tokens)`,
    `- reductions: ${tax.toolCountReductionPercent}% fewer entries, ${tax.tokenReductionPercent}% fewer tokens, ${tax.riskyExposureReductionPercent}% fewer risky entries`,
    "",
    "2. Select the first safe incident capability",
    `- task: ${triage.task}`,
    `- selected surface: ${selectedIds(triage)}`,
    `- agent-facing surface: ${triage.surface.capabilities.length} capability (~${triage.selectedEstimatedTokens} prompt tokens)`,
    `- invocation plan: ${triagePlan.allowedToolRoutes.length} routeable tools; toolsExecuted=${triagePlan.toolsExecuted}`,
    `- routeable tools: ${triagePlan.allowedToolRoutes.map((route) => route.toolId).join(", ")}`,
    `- proof required: ${triagePlan.proofRequired.join("; ")}`,
    "",
    "3. Add source and work-item context",
    `- task: ${source.task}`,
    `- selected surface: ${selectedIds(source)}`,
    `- exposed tools: ${source.exposedUnderlyingTools.join(", ")}`,
    `- toolsExecuted=${source.receipt.toolsExecuted}`,
    "",
    "4. Keep risky action blocked until permission changes",
    `- task: ${blockedWrite.task}`,
    "- policy: permission <= read, risk <= medium",
    `- prepare-code-change: ${writeBlock?.reasons.map((reason) => reason.message).join("; ") ?? "not blocked"}`,
    `- selected surface: ${selectedIds(blockedWrite)}`,
    `- toolsExecuted=${blockedWrite.receipt.toolsExecuted}`,
    "",
    "Receipt boundary",
    "- selected surfaces are task-scoped",
    "- invocation plans route only tools exposed by the selected capability receipt",
    "- no real MCP servers, SaaS accounts, credentials, or tools were used",
  ].join("\n");
}

function selectedIds(report: CapabilitySelectionReport): string {
  return report.selected.map((selection) => selection.capabilityId).join(", ") || "none";
}
