import type { Capability, DuplicateToolGroup, McpLikeServer, RawTool, TaxMeterReport } from "../types.js";
import { isRisky } from "../capabilities/policy.js";
import { estimatePromptTokens } from "./estimate.js";

export function flattenTools(servers: McpLikeServer[]): RawTool[] {
  return servers.flatMap((server) => server.tools);
}

export function computeTaxMeter(servers: McpLikeServer[], capabilities?: Capability[]): TaxMeterReport {
  const tools = flattenTools(servers);
  const duplicateToolGroups = findDuplicateToolGroups(tools);
  const rawEstimatedTokens = tools.reduce((total, rawTool) => total + estimateRawToolTokens(rawTool), 0);
  const riskyRawToolCount = tools.filter((tool) => isRisky(tool.permissionLevel, tool.riskLevel)).length;
  const baseReport = {
    rawToolCount: tools.length,
    rawEstimatedTokens,
    riskyRawToolCount,
    noisyRawToolCount: tools.filter((tool) => tool.noisy === true).length,
    duplicateRawToolCount: duplicateToolGroups.reduce((total, group) => total + group.tools.length, 0),
    duplicateToolGroups,
  };

  if (capabilities === undefined || capabilities.length === 0) {
    return {
      mode: "raw-only",
      ...baseReport,
      capabilityCount: null,
      capabilityEstimatedTokens: null,
      riskyCapabilityCount: null,
      toolCountReductionPercent: null,
      tokenReductionPercent: null,
      riskyExposureReductionPercent: null,
    };
  }

  const capabilityEstimatedTokens = capabilities.reduce(
    (total, capability) => total + estimateCapabilityTokens(capability),
    0,
  );
  const riskyCapabilityCount = capabilities.filter((capability) =>
    isRisky(capability.permissionLevel, capability.riskLevel),
  ).length;

  return {
    mode: "comparison",
    ...baseReport,
    capabilityCount: capabilities.length,
    capabilityEstimatedTokens,
    riskyCapabilityCount,
    toolCountReductionPercent: percentReduction(tools.length, capabilities.length),
    tokenReductionPercent: percentReduction(rawEstimatedTokens, capabilityEstimatedTokens),
    riskyExposureReductionPercent: percentReduction(riskyRawToolCount, riskyCapabilityCount),
  };
}

function estimateRawToolTokens(tool: RawTool): number {
  return estimatePromptTokens([
    tool.id,
    tool.serverTitle,
    tool.category,
    tool.name,
    tool.description,
    tool.permissionLevel,
    tool.riskLevel,
    ...tool.tags,
  ]);
}

function estimateCapabilityTokens(capability: Capability): number {
  return estimatePromptTokens([
    capability.id,
    capability.title,
    capability.description,
    capability.intent,
    capability.whenToUse,
    capability.permissionLevel,
    capability.riskLevel,
    ...capability.requiredContext,
    ...capability.underlyingTools,
    ...capability.proofReturned,
    ...capability.examples,
  ]);
}

function findDuplicateToolGroups(tools: RawTool[]): DuplicateToolGroup[] {
  const groups = new Map<string, string[]>();

  for (const tool of tools) {
    if (!tool.duplicateGroup) {
      continue;
    }

    const existing = groups.get(tool.duplicateGroup) ?? [];
    existing.push(tool.id);
    groups.set(tool.duplicateGroup, existing);
  }

  return [...groups.entries()]
    .filter(([, groupedTools]) => groupedTools.length > 1)
    .map(([group, groupedTools]) => ({
      group,
      tools: [...groupedTools].sort(),
    }))
    .sort((left, right) => left.group.localeCompare(right.group));
}

function percentReduction(before: number, after: number): number {
  if (before <= 0) {
    return 0;
  }

  return Math.round(((before - after) / before) * 100);
}
