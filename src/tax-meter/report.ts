import type { TaxMeterReport } from "../types.js";

export function renderTaxMeterReport(report: TaxMeterReport): string {
  const duplicateGroups = report.duplicateToolGroups
    .map((group) => `- ${group.group}: ${group.tools.join(", ")}`)
    .join("\n");

  return [
    "MCP Capability Runtime Tax Meter",
    "================================",
    "",
    `Raw MCP-like surface      ${report.rawToolCount} tools (~${report.rawEstimatedTokens} prompt tokens)`,
    `Capability surface        ${report.capabilityCount} capabilities (~${report.capabilityEstimatedTokens} prompt tokens)`,
    "",
    `Tool count reduction      ${report.toolCountReductionPercent}%`,
    `Token estimate reduction  ${report.tokenReductionPercent}%`,
    `Risky exposure reduction  ${report.riskyExposureReductionPercent}%`,
    "",
    `Risky raw tools           ${report.riskyRawToolCount}`,
    `Risky capabilities        ${report.riskyCapabilityCount}`,
    `Noisy raw tools           ${report.noisyRawToolCount}`,
    `Duplicate raw tools       ${report.duplicateRawToolCount}`,
    "",
    "Duplicate groups",
    duplicateGroups.length > 0 ? duplicateGroups : "- none",
    "",
    "Heuristic: token estimates count word-like chunks in tool and capability metadata, multiply by 1.15,",
    "and add a small structural cost for arrays. This is a deterministic prompt-budget proxy, not a tokenizer.",
  ].join("\n");
}
