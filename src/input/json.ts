import { readFileSync } from "node:fs";

import { auditToolSurface } from "../capabilities/audit.js";
import { isPermissionLevel, isRiskLevel } from "../capabilities/policy.js";
import type { Capability, McpLikeServer, PermissionLevel, RawTool, RiskLevel } from "../types.js";

type JsonRecord = Record<string, unknown>;

export interface ToolSurfaceInput {
  name?: string;
  servers: McpLikeServer[];
  capabilities?: Capability[];
}

export class ToolSurfaceValidationError extends Error {
  readonly issues: string[];

  constructor(issues: string[]) {
    super(["Invalid tool surface input:", ...issues.map((issue) => `- ${issue}`)].join("\n"));
    this.name = "ToolSurfaceValidationError";
    this.issues = issues;
  }
}

export function loadToolSurfaceFile(filePath: string): ToolSurfaceInput {
  let rawJson: string;

  try {
    rawJson = readFileSync(filePath, "utf8");
  } catch (error) {
    throw new ToolSurfaceValidationError([`input file could not be read: ${formatError(error)}`]);
  }

  let parsed: unknown;

  try {
    parsed = JSON.parse(rawJson);
  } catch (error) {
    throw new ToolSurfaceValidationError([`input file is not valid JSON: ${formatError(error)}`]);
  }

  return parseToolSurfaceInput(parsed);
}

export function parseToolSurfaceInput(input: unknown): ToolSurfaceInput {
  if (!isRecord(input)) {
    throw new ToolSurfaceValidationError(["root must be a JSON object"]);
  }

  const issues: string[] = [];
  const name = readOptionalString(input, "name", issues);
  const servers = readServers(input.servers, "servers", issues);
  const capabilities = input.capabilities === undefined ? undefined : readCapabilities(input.capabilities, "capabilities", issues);

  if (input.capabilities !== undefined && capabilities !== undefined && capabilities.length === 0) {
    issues.push("capabilities must be omitted for raw-only mode or contain at least one capability");
  }

  if (issues.length > 0) {
    throw new ToolSurfaceValidationError(issues);
  }

  const audit = auditToolSurface(servers, capabilities);

  if (!audit.valid) {
    throw new ToolSurfaceValidationError(audit.issues.map((issue) => issue.message));
  }

  const surface = {
    servers,
  };

  return {
    ...surface,
    ...(name === undefined ? {} : { name }),
    ...(capabilities === undefined ? {} : { capabilities }),
  };
}

function readServers(value: unknown, path: string, issues: string[]): McpLikeServer[] {
  if (!Array.isArray(value)) {
    issues.push(`${path} must be an array`);
    return [];
  }

  return value.map((serverValue, serverIndex) => {
    const serverPath = `${path}[${serverIndex}]`;

    if (!isRecord(serverValue)) {
      issues.push(`${serverPath} must be an object`);
      return {
        id: "",
        title: "",
        category: "",
        description: "",
        tools: [],
      };
    }

    const id = readRequiredString(serverValue, "id", `${serverPath}.id`, issues);
    const title = readRequiredString(serverValue, "title", `${serverPath}.title`, issues);
    const category = readRequiredString(serverValue, "category", `${serverPath}.category`, issues);
    const description = readRequiredString(serverValue, "description", `${serverPath}.description`, issues);
    const serverShell = { id, title, category, description };
    const tools = readTools(serverValue.tools, `${serverPath}.tools`, serverShell, issues);

    return {
      ...serverShell,
      tools,
    };
  });
}

function readTools(
  value: unknown,
  path: string,
  server: Omit<McpLikeServer, "tools">,
  issues: string[],
): RawTool[] {
  if (!Array.isArray(value)) {
    issues.push(`${path} must be an array`);
    return [];
  }

  return value.map((toolValue, toolIndex) => {
    const toolPath = `${path}[${toolIndex}]`;

    if (!isRecord(toolValue)) {
      issues.push(`${toolPath} must be an object`);
      return emptyTool(server);
    }

    const rawTool = {
      id: readRequiredString(toolValue, "id", `${toolPath}.id`, issues),
      serverId: server.id,
      serverTitle: server.title,
      name: readRequiredString(toolValue, "name", `${toolPath}.name`, issues),
      description: readRequiredString(toolValue, "description", `${toolPath}.description`, issues),
      category: server.category,
      permissionLevel: readPermissionLevel(toolValue.permissionLevel, `${toolPath}.permissionLevel`, issues),
      riskLevel: readRiskLevel(toolValue.riskLevel, `${toolPath}.riskLevel`, issues),
      tags: readOptionalStringArray(toolValue.tags, `${toolPath}.tags`, issues),
    };
    const duplicateGroup = readOptionalString(toolValue, "duplicateGroup", issues, `${toolPath}.duplicateGroup`);
    const noisy = readOptionalBoolean(toolValue, "noisy", issues, `${toolPath}.noisy`);

    return {
      ...rawTool,
      ...(duplicateGroup === undefined ? {} : { duplicateGroup }),
      ...(noisy === undefined ? {} : { noisy }),
    };
  });
}

function readCapabilities(value: unknown, path: string, issues: string[]): Capability[] {
  if (!Array.isArray(value)) {
    issues.push(`${path} must be an array`);
    return [];
  }

  return value.map((capabilityValue, capabilityIndex) => {
    const capabilityPath = `${path}[${capabilityIndex}]`;

    if (!isRecord(capabilityValue)) {
      issues.push(`${capabilityPath} must be an object`);
      return emptyCapability();
    }

    return {
      id: readRequiredString(capabilityValue, "id", `${capabilityPath}.id`, issues),
      title: readRequiredString(capabilityValue, "title", `${capabilityPath}.title`, issues),
      description: readRequiredString(capabilityValue, "description", `${capabilityPath}.description`, issues),
      intent: readRequiredString(capabilityValue, "intent", `${capabilityPath}.intent`, issues),
      whenToUse: readRequiredString(capabilityValue, "whenToUse", `${capabilityPath}.whenToUse`, issues),
      requiredContext: readRequiredStringArray(
        capabilityValue.requiredContext,
        `${capabilityPath}.requiredContext`,
        issues,
      ),
      permissionLevel: readPermissionLevel(capabilityValue.permissionLevel, `${capabilityPath}.permissionLevel`, issues),
      riskLevel: readRiskLevel(capabilityValue.riskLevel, `${capabilityPath}.riskLevel`, issues),
      underlyingTools: readRequiredStringArray(
        capabilityValue.underlyingTools,
        `${capabilityPath}.underlyingTools`,
        issues,
      ),
      proofReturned: readRequiredStringArray(capabilityValue.proofReturned, `${capabilityPath}.proofReturned`, issues),
      examples: readRequiredStringArray(capabilityValue.examples, `${capabilityPath}.examples`, issues),
    };
  });
}

function readRequiredString(record: JsonRecord, key: string, path: string, issues: string[]): string {
  const value = record[key];

  if (typeof value !== "string" || value.trim().length === 0) {
    issues.push(`${path} must be a non-empty string`);
    return "";
  }

  return value;
}

function readOptionalString(
  record: JsonRecord,
  key: string,
  issues: string[],
  path: string = key,
): string | undefined {
  const value = record[key];

  if (value === undefined) {
    return undefined;
  }

  if (typeof value !== "string" || value.trim().length === 0) {
    issues.push(`${path} must be a non-empty string when provided`);
    return undefined;
  }

  return value;
}

function readRequiredStringArray(value: unknown, path: string, issues: string[]): string[] {
  if (!Array.isArray(value)) {
    issues.push(`${path} must be an array of strings`);
    return [];
  }

  return value.map((item, index) => {
    if (typeof item !== "string" || item.trim().length === 0) {
      issues.push(`${path}[${index}] must be a non-empty string`);
      return "";
    }

    return item;
  });
}

function readOptionalStringArray(value: unknown, path: string, issues: string[]): string[] {
  if (value === undefined) {
    return [];
  }

  return readRequiredStringArray(value, path, issues);
}

function readOptionalBoolean(record: JsonRecord, key: string, issues: string[], path: string): boolean | undefined {
  const value = record[key];

  if (value === undefined) {
    return undefined;
  }

  if (typeof value !== "boolean") {
    issues.push(`${path} must be a boolean when provided`);
    return undefined;
  }

  return value;
}

function readPermissionLevel(value: unknown, path: string, issues: string[]): PermissionLevel {
  if (typeof value === "string" && isPermissionLevel(value)) {
    return value;
  }

  issues.push(`${path} must be one of: read, write, execute, admin`);
  return "read";
}

function readRiskLevel(value: unknown, path: string, issues: string[]): RiskLevel {
  if (typeof value === "string" && isRiskLevel(value)) {
    return value;
  }

  issues.push(`${path} must be one of: low, medium, high`);
  return "low";
}

function emptyTool(server: Omit<McpLikeServer, "tools">): RawTool {
  return {
    id: "",
    serverId: server.id,
    serverTitle: server.title,
    name: "",
    description: "",
    category: server.category,
    permissionLevel: "read",
    riskLevel: "low",
    tags: [],
  };
}

function emptyCapability(): Capability {
  return {
    id: "",
    title: "",
    description: "",
    intent: "",
    whenToUse: "",
    requiredContext: [],
    permissionLevel: "read",
    riskLevel: "low",
    underlyingTools: [],
    proofReturned: [],
    examples: [],
  };
}

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function formatError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
