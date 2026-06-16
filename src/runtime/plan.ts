import { auditToolSurface } from "../capabilities/audit.js";
import { isPermissionAllowed, isRiskAllowed } from "../capabilities/policy.js";
import { flattenTools } from "../tax-meter/tax-meter.js";
import type {
  CapabilityInvocationPlan,
  CapabilityInvocationPlanIssue,
  CapabilityInvocationPlanRequest,
  CapabilityToolRoute,
  RawTool,
} from "../types.js";

export function planCapabilityInvocation(request: CapabilityInvocationPlanRequest): CapabilityInvocationPlan {
  const audit = auditToolSurface(request.servers, request.capabilities);
  const capability = request.capabilities.find((candidate) => candidate.id === request.capabilityId);
  const toolById = new Map(flattenTools(request.servers).map((tool) => [tool.id, tool]));
  const capabilityWasSelected = capability !== undefined && request.receipt.selectedCapabilityIds.includes(capability.id);
  const selectedDetail = request.receipt.selected.find((selection) => selection.capabilityId === request.capabilityId);
  const requestedToolIds = uniqueInOrder(request.requestedToolIds ?? (capabilityWasSelected ? capability.underlyingTools : []));
  const issues: CapabilityInvocationPlanIssue[] = [];

  for (const issue of audit.issues) {
    issues.push({
      code: "invalid-tool-surface",
      path: issue.path,
      message: issue.message,
    });
  }

  if (capability === undefined) {
    issues.push({
      code: "capability-not-found",
      path: "capabilityId",
      message: `capability ${request.capabilityId} was not found in the current surface`,
    });
  } else if (!capabilityWasSelected) {
    issues.push({
      code: "capability-not-selected",
      path: "receipt.selectedCapabilityIds",
      message: `capability ${capability.id} was not selected by the receipt`,
    });
  }

  if (request.requestedToolIds !== undefined && request.requestedToolIds.length === 0) {
    issues.push({
      code: "empty-tool-request",
      path: "requestedToolIds",
      message: "requestedToolIds must contain at least one tool when provided",
    });
  }

  if (capabilityWasSelected && capability !== undefined) {
    if (selectedDetail === undefined) {
      issues.push({
        code: "receipt-missing-selected-detail",
        path: "receipt.selected",
        message: `receipt is missing selected details for capability ${capability.id}`,
      });
    } else {
      if (selectedDetail.permissionLevel !== capability.permissionLevel) {
        issues.push({
          code: "receipt-policy-mismatch",
          path: "receipt.selected.permissionLevel",
          message: `receipt selected detail says ${selectedDetail.permissionLevel}, but capability ${capability.id} is ${capability.permissionLevel}`,
        });
      }

      if (selectedDetail.riskLevel !== capability.riskLevel) {
        issues.push({
          code: "receipt-risk-mismatch",
          path: "receipt.selected.riskLevel",
          message: `receipt selected detail says ${selectedDetail.riskLevel}, but capability ${capability.id} is ${capability.riskLevel}`,
        });
      }
    }

    if (!isPermissionAllowed(capability.permissionLevel, request.receipt.maxPermissionLevel)) {
      issues.push({
        code: "receipt-policy-mismatch",
        path: "receipt.maxPermissionLevel",
        message: `receipt permission ceiling ${request.receipt.maxPermissionLevel} no longer allows ${capability.permissionLevel} capability ${capability.id}`,
      });
    }

    if (!isRiskAllowed(capability.riskLevel, request.receipt.maxRiskLevel)) {
      issues.push({
        code: "receipt-risk-mismatch",
        path: "receipt.maxRiskLevel",
        message: `receipt risk ceiling ${request.receipt.maxRiskLevel} no longer allows ${capability.riskLevel} capability ${capability.id}`,
      });
    }

    if (request.receipt.toolsExecuted !== false) {
      issues.push({
        code: "receipt-policy-mismatch",
        path: "receipt.toolsExecuted",
        message: "invocation planning requires an unexecuted selection receipt",
      });
    }

    const selectedTools = selectedDetail?.underlyingTools ?? [];
    if (!sameOrderedSet(selectedTools, capability.underlyingTools)) {
      issues.push({
        code: "receipt-policy-mismatch",
        path: "receipt.selected.underlyingTools",
        message: `receipt selected tools do not match current capability ${capability.id}`,
      });
    }

    const selectedProof = selectedDetail?.proofReturned ?? [];
    if (!sameOrderedSet(selectedProof, capability.proofReturned)) {
      issues.push({
        code: "receipt-policy-mismatch",
        path: "receipt.selected.proofReturned",
        message: `receipt selected proof does not match current capability ${capability.id}`,
      });
    }

    const missingContext = capability.requiredContext.filter(
      (requiredContext) => !selectedDetail?.matchedContext.includes(requiredContext),
    );
    if (missingContext.length > 0) {
      issues.push({
        code: "receipt-context-mismatch",
        path: "receipt.selected.matchedContext",
        message: `receipt is missing required context for ${capability.id}: ${missingContext.join(", ")}`,
      });
    }
  }

  for (const toolId of requestedToolIds) {
    if (!toolById.has(toolId)) {
      issues.push({
        code: "tool-not-found",
        path: `requestedToolIds.${toolId}`,
        message: `tool ${toolId} was not found in the current server surface`,
      });
    }

    if (capability !== undefined && !capability.underlyingTools.includes(toolId)) {
      issues.push({
        code: "tool-not-in-capability",
        path: `capabilities.${capability.id}.underlyingTools`,
        message: `tool ${toolId} is not part of capability ${capability.id}`,
      });
    }

    if (!request.receipt.exposedUnderlyingTools.includes(toolId)) {
      issues.push({
        code: "tool-not-exposed",
        path: "receipt.exposedUnderlyingTools",
        message: `tool ${toolId} was not exposed by the selection receipt`,
      });
    }
  }

  const sortedIssues = issues.sort(compareIssues);
  const valid = sortedIssues.length === 0;

  return {
    mode: "capability-invocation-plan",
    valid,
    task: request.receipt.task,
    capabilityId: request.capabilityId,
    requestedToolIds: valid || request.requestedToolIds !== undefined ? requestedToolIds : [],
    allowedToolRoutes: valid ? requestedToolIds.map((toolId) => toToolRoute(requiredTool(toolById, toolId))) : [],
    proofRequired: valid && capability !== undefined ? capability.proofReturned : [],
    issues: sortedIssues,
    toolsExecuted: false,
  };
}

function toToolRoute(tool: RawTool): CapabilityToolRoute {
  return {
    toolId: tool.id,
    toolName: tool.name,
    serverId: tool.serverId,
    serverTitle: tool.serverTitle,
    category: tool.category,
    permissionLevel: tool.permissionLevel,
    riskLevel: tool.riskLevel,
  };
}

function requiredTool(toolById: Map<string, RawTool>, toolId: string): RawTool {
  const tool = toolById.get(toolId);

  if (tool === undefined) {
    throw new Error(`tool ${toolId} was not found after validation`);
  }

  return tool;
}

function compareIssues(left: CapabilityInvocationPlanIssue, right: CapabilityInvocationPlanIssue): number {
  return (
    left.path.localeCompare(right.path) ||
    left.code.localeCompare(right.code) ||
    left.message.localeCompare(right.message)
  );
}

function uniqueInOrder(values: string[]): string[] {
  return [...new Set(values)];
}

function sameOrderedSet(left: string[], right: string[]): boolean {
  const leftSorted = [...left].sort((leftValue, rightValue) => leftValue.localeCompare(rightValue));
  const rightSorted = [...right].sort((leftValue, rightValue) => leftValue.localeCompare(rightValue));

  return leftSorted.length === rightSorted.length && leftSorted.every((value, index) => value === rightSorted[index]);
}
