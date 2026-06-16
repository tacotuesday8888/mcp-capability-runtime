import type {
  CapabilityInvocationPlan,
  CapabilityInvocationReceipt,
  CapabilityInvocationReceiptIssue,
  CapabilityInvocationReceiptRequest,
  CapabilityInvocationToolResult,
  CapabilityProofEntry,
  CapabilityToolExecution,
  CapabilityToolRoute,
} from "../types.js";

export function recordCapabilityInvocation(request: CapabilityInvocationReceiptRequest): CapabilityInvocationReceipt {
  const source = request.source ?? "caller-supplied";

  if (!request.plan.valid) {
    return invalidPlanReceipt(request.plan, source);
  }

  const resultByToolId = new Map<string, CapabilityInvocationToolResult>();
  const duplicateToolIds = new Set<string>();
  const unplannedToolIds: string[] = [];
  const plannedToolIds = request.plan.allowedToolRoutes.map((route) => route.toolId);
  const plannedToolIdSet = new Set(plannedToolIds);

  for (const result of request.results) {
    if (!plannedToolIdSet.has(result.toolId)) {
      unplannedToolIds.push(result.toolId);
      continue;
    }

    if (resultByToolId.has(result.toolId)) {
      duplicateToolIds.add(result.toolId);
      continue;
    }

    resultByToolId.set(result.toolId, result);
  }

  const issues: CapabilityInvocationReceiptIssue[] = [];

  for (const toolId of uniqueInOrder(unplannedToolIds)) {
    issues.push({
      code: "unplanned-tool-result",
      path: `results.${toolId}`,
      message: `tool ${toolId} returned a result but is not part of the invocation plan`,
    });
  }

  for (const toolId of [...duplicateToolIds].sort((left, right) => left.localeCompare(right))) {
    issues.push({
      code: "duplicate-tool-result",
      path: `results.${toolId}`,
      message: `tool ${toolId} returned more than one result`,
    });
  }

  const executedToolRoutes = request.plan.allowedToolRoutes.map((route) => {
    const result = resultByToolId.get(route.toolId);

    if (result === undefined) {
      issues.push({
        code: "missing-tool-result",
        path: `results.${route.toolId}`,
        message: `planned tool ${route.toolId} did not return a result`,
      });

      return toMissingExecution(route);
    }

    if (result.status === "error") {
      issues.push({
        code: "tool-execution-failed",
        path: `results.${route.toolId}.status`,
        message: `planned tool ${route.toolId} returned an error result`,
      });
    }

    return toToolExecution(route, result, request.plan.proofRequired);
  });

  const proof = collectProof(request.plan.proofRequired, request.plan.allowedToolRoutes, resultByToolId);
  const missingProof = request.plan.proofRequired.filter(
    (label) => proof.find((entry) => entry.label === label) === undefined,
  );

  for (const label of missingProof) {
    issues.push({
      code: "missing-required-proof",
      path: `proof.${label}`,
      message: `required proof "${label}" was not returned by any planned tool result`,
    });
  }

  const attemptedToolIds = [
    ...request.plan.allowedToolRoutes
      .map((route) => route.toolId)
      .filter((toolId) => resultByToolId.has(toolId)),
    ...uniqueInOrder(unplannedToolIds),
  ];
  const sortedIssues = issues.sort(compareIssues);
  const changedResources = collectChangedResources(request.plan.allowedToolRoutes, resultByToolId);

  return {
    mode: "capability-invocation-receipt",
    valid: sortedIssues.length === 0,
    task: request.plan.task,
    capabilityId: request.plan.capabilityId,
    executionMode: "local-simulated",
    source,
    plannedToolIds,
    attemptedToolIds,
    executedToolRoutes,
    proof,
    missingProof,
    changedResources,
    issues: sortedIssues,
    toolsExecuted: resultByToolId.size > 0 || unplannedToolIds.length > 0,
  };
}

function invalidPlanReceipt(
  plan: CapabilityInvocationPlan,
  source: CapabilityInvocationReceipt["source"],
): CapabilityInvocationReceipt {
  const issues =
    plan.issues.length === 0
      ? [
          {
            code: "invalid-invocation-plan" as const,
            path: "plan.valid",
            message: "invocation plan is invalid",
          },
        ]
      : plan.issues.map((issue, index) => ({
          code: "invalid-invocation-plan" as const,
          path: `plan.issues.${index}`,
          message: issue.message,
        }));

  return {
    mode: "capability-invocation-receipt",
    valid: false,
    task: plan.task,
    capabilityId: plan.capabilityId,
    executionMode: "local-simulated",
    source,
    plannedToolIds: plan.requestedToolIds,
    attemptedToolIds: [],
    executedToolRoutes: [],
    proof: [],
    missingProof: plan.proofRequired,
    changedResources: [],
    issues,
    toolsExecuted: false,
  };
}

function toMissingExecution(route: CapabilityToolRoute): CapabilityToolExecution {
  return {
    ...route,
    status: "missing",
    summary: "No local result was supplied for this planned tool.",
    proofReturned: [],
  };
}

function toToolExecution(
  route: CapabilityToolRoute,
  result: CapabilityInvocationToolResult,
  proofRequired: string[],
): CapabilityToolExecution {
  return {
    ...route,
    status: result.status,
    summary: result.summary,
    proofReturned: proofLabelsReturned(result, proofRequired),
    ...(result.errorMessage === undefined ? {} : { errorMessage: result.errorMessage }),
  };
}

function collectProof(
  proofRequired: string[],
  routes: CapabilityToolRoute[],
  resultByToolId: Map<string, CapabilityInvocationToolResult>,
): CapabilityProofEntry[] {
  const entries: CapabilityProofEntry[] = [];

  for (const label of proofRequired) {
    const values: string[] = [];
    const toolIds: string[] = [];

    for (const route of routes) {
      const result = resultByToolId.get(route.toolId);
      if (result?.status === "error") {
        continue;
      }

      const proofValues = proofValueToStrings(result?.proof?.[label]);

      if (proofValues.length === 0) {
        continue;
      }

      values.push(...proofValues);
      toolIds.push(route.toolId);
    }

    if (values.length > 0) {
      entries.push({ label, values: uniqueInOrder(values), toolIds });
    }
  }

  return entries;
}

function proofLabelsReturned(result: CapabilityInvocationToolResult, proofRequired: string[]): string[] {
  if (result.status === "error") {
    return [];
  }

  return proofRequired.filter((label) => proofValueToStrings(result.proof?.[label]).length > 0);
}

function collectChangedResources(
  routes: CapabilityToolRoute[],
  resultByToolId: Map<string, CapabilityInvocationToolResult>,
): string[] {
  return uniqueInOrder(
    routes.flatMap((route) => resultByToolId.get(route.toolId)?.changedResources ?? []).filter((resource) => {
      return resource.trim().length > 0;
    }),
  );
}

function proofValueToStrings(value: string | string[] | undefined): string[] {
  if (value === undefined) {
    return [];
  }

  const values = Array.isArray(value) ? value : [value];
  return values.filter((candidate) => candidate.trim().length > 0);
}

function uniqueInOrder(values: string[]): string[] {
  return [...new Set(values)];
}

function compareIssues(left: CapabilityInvocationReceiptIssue, right: CapabilityInvocationReceiptIssue): number {
  return (
    left.path.localeCompare(right.path) ||
    left.code.localeCompare(right.code) ||
    left.message.localeCompare(right.message)
  );
}
