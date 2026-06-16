import type {
  Capability,
  McpLikeServer,
  PermissionLevel,
  RiskLevel,
  ToolSurfaceAuditIssue,
  ToolSurfaceAuditReport,
} from "../types.js";
import { comparePermissionLevels, compareRiskLevels } from "./policy.js";

export function auditToolSurface(servers: McpLikeServer[], capabilities: Capability[] = []): ToolSurfaceAuditReport {
  const issues: ToolSurfaceAuditIssue[] = [];
  const toolsById = new Map<string, { permissionLevel: PermissionLevel; riskLevel: RiskLevel }>();

  collectDuplicateIds(
    servers.map((server, index) => ({ id: server.id, path: `servers[${index}].id` })),
    "duplicate-server-id",
    "server id",
    issues,
  );

  collectDuplicateIds(
    capabilities.map((capability, index) => ({ id: capability.id, path: `capabilities[${index}].id` })),
    "duplicate-capability-id",
    "capability id",
    issues,
  );

  const toolRefs = servers.flatMap((server, serverIndex) =>
    server.tools.map((tool, toolIndex) => ({
      id: tool.id,
      path: `servers[${serverIndex}].tools[${toolIndex}].id`,
      permissionLevel: tool.permissionLevel,
      riskLevel: tool.riskLevel,
    })),
  );

  collectDuplicateIds(toolRefs, "duplicate-tool-id", "tool id", issues);

  for (const tool of toolRefs) {
    if (!toolsById.has(tool.id)) {
      toolsById.set(tool.id, {
        permissionLevel: tool.permissionLevel,
        riskLevel: tool.riskLevel,
      });
    }
  }

  for (const [capabilityIndex, capability] of capabilities.entries()) {
    auditRequiredArray(capability.requiredContext, `capabilities[${capabilityIndex}].requiredContext`, issues);
    auditRequiredArray(capability.underlyingTools, `capabilities[${capabilityIndex}].underlyingTools`, issues);
    auditRequiredArray(capability.proofReturned, `capabilities[${capabilityIndex}].proofReturned`, issues);
    auditRequiredArray(capability.examples, `capabilities[${capabilityIndex}].examples`, issues);
    auditUnderlyingTools(capability, capabilityIndex, toolsById, issues);
  }

  return {
    valid: issues.length === 0,
    issues,
  };
}

function auditUnderlyingTools(
  capability: Capability,
  capabilityIndex: number,
  toolsById: Map<string, { permissionLevel: PermissionLevel; riskLevel: RiskLevel }>,
  issues: ToolSurfaceAuditIssue[],
): void {
  let highestPermission: PermissionLevel | undefined;
  let highestRisk: RiskLevel | undefined;

  for (const [toolIndex, toolId] of capability.underlyingTools.entries()) {
    const tool = toolsById.get(toolId);

    if (!tool) {
      issues.push({
        code: "missing-underlying-tool",
        path: `capabilities[${capabilityIndex}].underlyingTools[${toolIndex}]`,
        message: `capabilities[${capabilityIndex}].underlyingTools[${toolIndex}] references missing tool "${toolId}"`,
      });
      continue;
    }

    highestPermission =
      highestPermission === undefined || comparePermissionLevels(tool.permissionLevel, highestPermission) > 0
        ? tool.permissionLevel
        : highestPermission;
    highestRisk =
      highestRisk === undefined || compareRiskLevels(tool.riskLevel, highestRisk) > 0 ? tool.riskLevel : highestRisk;
  }

  if (
    highestPermission !== undefined &&
    comparePermissionLevels(capability.permissionLevel, highestPermission) < 0
  ) {
    issues.push({
      code: "understated-permission-level",
      path: `capabilities[${capabilityIndex}].permissionLevel`,
      message: `capabilities[${capabilityIndex}].permissionLevel "${capability.permissionLevel}" understates wrapped tool permission "${highestPermission}"`,
    });
  }

  if (highestRisk !== undefined && compareRiskLevels(capability.riskLevel, highestRisk) < 0) {
    issues.push({
      code: "understated-risk-level",
      path: `capabilities[${capabilityIndex}].riskLevel`,
      message: `capabilities[${capabilityIndex}].riskLevel "${capability.riskLevel}" understates wrapped tool risk "${highestRisk}"`,
    });
  }
}

function auditRequiredArray(value: string[], path: string, issues: ToolSurfaceAuditIssue[]): void {
  if (value.length > 0) {
    return;
  }

  issues.push({
    code: "empty-required-array",
    path,
    message: `${path} must contain at least one entry`,
  });
}

function collectDuplicateIds(
  refs: Array<{ id: string; path: string }>,
  code: "duplicate-server-id" | "duplicate-tool-id" | "duplicate-capability-id",
  label: string,
  issues: ToolSurfaceAuditIssue[],
): void {
  const seen = new Map<string, string>();

  for (const ref of refs) {
    const firstPath = seen.get(ref.id);

    if (firstPath) {
      issues.push({
        code,
        path: ref.path,
        message: `${ref.path} duplicates ${label} "${ref.id}" first declared at ${firstPath}`,
      });
      continue;
    }

    seen.set(ref.id, ref.path);
  }
}
