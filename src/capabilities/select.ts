import type {
  Capability,
  CapabilityBlockReason,
  BlockedCapabilitySelection,
  CapabilitySelection,
  SelectedCapability,
  CapabilitySelectionReport,
  CapabilitySelectionRequest,
} from "../types.js";
import { estimatePromptTokens } from "../tax-meter/estimate.js";
import {
  comparePermissionLevels,
  compareRiskLevels,
  isPermissionAllowed,
  isRiskAllowed,
} from "./policy.js";

const defaultLimit = 5;
const defaultMaxPermissionLevel = "read";
const defaultMaxRiskLevel = "medium";
const genericContextTokens = new Set(["id", "name", "relevant", "when"]);

const stopWords = new Set([
  "a",
  "an",
  "and",
  "are",
  "as",
  "be",
  "before",
  "by",
  "for",
  "from",
  "in",
  "into",
  "is",
  "it",
  "of",
  "on",
  "or",
  "the",
  "to",
  "use",
  "when",
  "with",
]);

export function selectCapabilities(
  capabilities: Capability[],
  request: CapabilitySelectionRequest,
): CapabilitySelectionReport {
  const maxPermissionLevel = request.maxPermissionLevel ?? defaultMaxPermissionLevel;
  const maxRiskLevel = request.maxRiskLevel ?? defaultMaxRiskLevel;
  const limit = normalizeLimit(request.limit);
  const providedContext = request.context ?? [];
  const requestTokens = tokenize(request.task);
  const scored = capabilities
    .map((capability) => scoreCapability(capability, requestTokens, providedContext))
    .sort(compareSelectionCandidates);
  const eligible = scored.filter((candidate) => candidate.reasons.length === 0 && candidate.selection.score > 0);
  const selectedCandidates = eligible.slice(0, limit);
  const selected = selectedCandidates.map((candidate) => candidate.selection);
  const selectedIds = new Set(selected.map((selection) => selection.capabilityId));
  const blocked = scored
    .filter((candidate) => !selectedIds.has(candidate.selection.capabilityId))
    .map((candidate) =>
      toBlockedSelection(
        candidate.selection,
        candidate.reasons.length > 0
          ? candidate.reasons
          : [
              {
                code: "over-limit" as const,
                message: `not selected because the request limit is ${limit}`,
              },
            ],
      ),
    );
  const exposedUnderlyingTools = uniqueSorted(selected.flatMap((selection) => selection.underlyingTools));
  const surface = {
    mode: "selected-surface" as const,
    task: request.task,
    capabilities: selectedCandidates.map((candidate) => toSelectedCapability(candidate.capability)),
  };
  const selectedEstimatedTokens = surface.capabilities.reduce(
    (total, capability) => total + estimateSelectedCapabilitySurfaceTokens(capability),
    0,
  );
  const receipt = {
    mode: "selection-receipt" as const,
    task: request.task,
    providedContext,
    maxPermissionLevel,
    maxRiskLevel,
    limit,
    selectedCapabilityIds: selected.map((selection) => selection.capabilityId),
    selected,
    blocked,
    exposedUnderlyingTools,
    exposedToolCount: exposedUnderlyingTools.length,
    selectedEstimatedTokens,
    toolsExecuted: false as const,
  };

  return {
    mode: "selection",
    task: request.task,
    providedContext,
    maxPermissionLevel,
    maxRiskLevel,
    limit,
    consideredCapabilityCount: capabilities.length,
    selected,
    blocked,
    exposedUnderlyingTools,
    exposedToolCount: exposedUnderlyingTools.length,
    selectedEstimatedTokens,
    surface,
    receipt,
  };

  function scoreCapability(
    capability: Capability,
    tokens: string[],
    context: string[],
  ): {
    capability: Capability;
    selection: CapabilitySelection;
    reasons: CapabilityBlockReason[];
  } {
    const capabilityTokens = new Set(tokenize(capabilitySearchText(capability)));
    const matchedTerms = uniqueSorted(tokens.filter((token) => capabilityTokens.has(token)));
    const missingContext = capability.requiredContext.filter((required) => !contextMatches(required, context));
    const matchedContext = capability.requiredContext.filter((required) => !missingContext.includes(required));
    const score = weightedTaskScore(capability, tokens) + matchedContext.length * 4;
    const reasons: CapabilityBlockReason[] = [];

    if (!isPermissionAllowed(capability.permissionLevel, maxPermissionLevel)) {
      reasons.push({
        code: "permission-exceeds-limit",
        message: `${capability.permissionLevel} permission exceeds request ceiling ${maxPermissionLevel}`,
      });
    }

    if (!isRiskAllowed(capability.riskLevel, maxRiskLevel)) {
      reasons.push({
        code: "risk-exceeds-limit",
        message: `${capability.riskLevel} risk exceeds request ceiling ${maxRiskLevel}`,
      });
    }

    if (missingContext.length > 0) {
      reasons.push({
        code: "missing-context",
        message: `missing required context: ${missingContext.join(", ")}`,
      });
    }

    if (matchedTerms.length === 0) {
      reasons.push({
        code: "no-task-match",
        message: "no task terms matched this capability",
      });
    }

    return {
      capability,
      selection: {
        capabilityId: capability.id,
        title: capability.title,
        score,
        permissionLevel: capability.permissionLevel,
        riskLevel: capability.riskLevel,
        matchedTerms,
        matchedContext,
        missingContext,
        underlyingTools: capability.underlyingTools,
        proofReturned: capability.proofReturned,
      },
      reasons,
    };
  }
}

export function renderCapabilitySelectionReport(report: CapabilitySelectionReport): string {
  return [
    "MCP Capability Runtime Selector",
    "===============================",
    "",
    `Task                     ${report.task}`,
    `Policy                   permission <= ${report.maxPermissionLevel}, risk <= ${report.maxRiskLevel}`,
    `Provided context         ${report.providedContext.length > 0 ? report.providedContext.join("; ") : "none"}`,
    "",
    `Selected capabilities    ${report.selected.length} of ${report.consideredCapabilityCount} (~${report.selectedEstimatedTokens} prompt tokens, ${report.exposedToolCount} underlying tools)`,
    ...renderSelected(report.selected),
    "",
    "Blocked capabilities",
    ...renderBlocked(report.blocked),
    "",
    "Dry-run receipt",
    `- selected ids: ${report.selected.map((selection) => selection.capabilityId).join(", ") || "none"}`,
    `- exposed tools: ${report.exposedUnderlyingTools.join(", ") || "none"}`,
    "- no tools were executed",
  ].join("\n");
}

function renderSelected(selected: CapabilitySelection[]): string[] {
  if (selected.length === 0) {
    return ["- none"];
  }

  return selected.flatMap((selection) => [
    `- ${selection.capabilityId} (${selection.permissionLevel}/${selection.riskLevel}, score ${selection.score})`,
    `  matched: ${selection.matchedTerms.join(", ") || "context only"}`,
    `  proof: ${selection.proofReturned.join("; ")}`,
  ]);
}

function renderBlocked(blocked: BlockedCapabilitySelection[]): string[] {
  if (blocked.length === 0) {
    return ["- none"];
  }

  return blocked.map(
    (selection) =>
      `- ${selection.capabilityId}: ${selection.reasons.map((reason) => reason.message).join("; ")}`,
  );
}

function compareSelectionCandidates(
  left: { selection: CapabilitySelection; reasons: CapabilityBlockReason[] },
  right: { selection: CapabilitySelection; reasons: CapabilityBlockReason[] },
): number {
  return (
    right.selection.score - left.selection.score ||
    comparePermissionLevels(left.selection.permissionLevel, right.selection.permissionLevel) ||
    compareRiskLevels(left.selection.riskLevel, right.selection.riskLevel) ||
    left.selection.capabilityId.localeCompare(right.selection.capabilityId)
  );
}

function capabilitySearchText(capability: Capability): string {
  return [
    capability.id,
    capability.title,
    capability.description,
    capability.intent,
    capability.whenToUse,
    ...capability.requiredContext,
    ...capability.proofReturned,
    ...capability.examples,
  ].join(" ");
}

function weightedTaskScore(capability: Capability, requestTokens: string[]): number {
  const fields = [
    { weight: 5, tokens: new Set(tokenize(`${capability.id} ${capability.title}`)) },
    { weight: 4, tokens: new Set(tokenize(`${capability.intent} ${capability.whenToUse}`)) },
    { weight: 3, tokens: new Set(tokenize(capability.description)) },
    { weight: 2, tokens: new Set(tokenize(capability.examples.join(" "))) },
    { weight: 1, tokens: new Set(tokenize([...capability.requiredContext, ...capability.proofReturned].join(" "))) },
  ];

  return requestTokens.reduce((total, token) => {
    const bestWeight = fields.reduce((best, field) => (field.tokens.has(token) ? Math.max(best, field.weight) : best), 0);

    return total + bestWeight;
  }, 0);
}

function contextMatches(requiredContext: string, providedContext: string[]): boolean {
  const requiredOptions = requiredContext
    .split(/\s+or\s+/i)
    .map((option) => contextTokens(option))
    .filter((tokens) => tokens.length > 0);

  return providedContext.some((provided) => {
    const normalizedProvided = normalize(provided);
    const providedTokens = new Set(contextTokens(provided));

    return requiredOptions.some(
      (requiredTokens) =>
        normalizedProvided.includes(requiredTokens.join(" ")) ||
        requiredTokens.every((token) => providedTokens.has(token)),
    );
  });
}

function estimateSelectedCapabilitySurfaceTokens(capability: SelectedCapability): number {
  return estimatePromptTokens([
    capability.id,
    capability.title,
    capability.description,
    capability.intent,
    capability.whenToUse,
    capability.permissionLevel,
    capability.riskLevel,
    ...capability.requiredContext,
    ...capability.proofReturned,
    ...capability.examples,
  ]);
}

function tokenize(value: string): string[] {
  return uniqueSorted(
    value
      .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
      .toLowerCase()
      .match(/[a-z0-9]+/g)
      ?.filter((token) => token.length > 1 && !stopWords.has(token)) ?? [],
  );
}

function normalize(value: string): string {
  return tokenize(value).join(" ");
}

function contextTokens(value: string): string[] {
  return tokenize(value).filter((token) => !genericContextTokens.has(token));
}

function uniqueSorted(values: string[]): string[] {
  return [...new Set(values)].sort((left, right) => left.localeCompare(right));
}

function normalizeLimit(value: number | undefined): number {
  if (value === undefined || !Number.isInteger(value) || !Number.isFinite(value) || value <= 0) {
    return defaultLimit;
  }

  return value;
}

function toBlockedSelection(
  selection: CapabilitySelection,
  reasons: CapabilityBlockReason[],
): BlockedCapabilitySelection {
  return {
    capabilityId: selection.capabilityId,
    title: selection.title,
    score: selection.score,
    permissionLevel: selection.permissionLevel,
    riskLevel: selection.riskLevel,
    matchedTerms: selection.matchedTerms,
    matchedContext: selection.matchedContext,
    missingContext: selection.missingContext,
    reasons,
  };
}

function toSelectedCapability(capability: Capability): SelectedCapability {
  return {
    id: capability.id,
    title: capability.title,
    description: capability.description,
    intent: capability.intent,
    whenToUse: capability.whenToUse,
    requiredContext: capability.requiredContext,
    permissionLevel: capability.permissionLevel,
    riskLevel: capability.riskLevel,
    proofReturned: capability.proofReturned,
    examples: capability.examples,
  };
}
