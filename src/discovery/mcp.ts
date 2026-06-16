import { readFileSync } from "node:fs";

import { auditToolSurface } from "../capabilities/audit.js";
import { ToolSurfaceValidationError } from "../input/json.js";
import type { ToolSurfaceInput } from "../input/json.js";
import type { McpLikeServer, PermissionLevel, RawTool, RiskLevel } from "../types.js";

type JsonRecord = Record<string, unknown>;

export interface McpDiscoveryConfig {
  name?: string;
  servers: McpDiscoveryServerConfig[];
}

export interface McpDiscoveryServerConfig {
  id: string;
  title: string;
  category: string;
  description: string;
  toolsList: McpToolsListPage[];
}

export interface McpToolsListPage {
  cursor?: string;
  nextCursor?: string;
  tools: McpDiscoveredTool[];
}

export interface McpDiscoveredTool {
  name: string;
  title?: string;
  description: string;
  inputSchema: JsonRecord;
  outputSchema?: unknown;
  annotations?: McpToolAnnotations;
  execution?: unknown;
  icons?: unknown;
  _meta?: JsonRecord;
}

export interface McpToolAnnotations {
  readOnlyHint?: boolean;
  destructiveHint?: boolean;
  idempotentHint?: boolean;
  openWorldHint?: boolean;
  title?: string;
}

export type McpDiscoveryIssueCode =
  | "cursor-mismatch"
  | "dangling-next-cursor"
  | "duplicate-cursor"
  | "duplicate-tool-id"
  | "invalid-tool-surface";

export interface McpDiscoveryIssue {
  code: McpDiscoveryIssueCode;
  path: string;
  message: string;
}

export interface McpDiscoveryMetadata {
  toolId: string;
  serverId: string;
  mcpName: string;
  title?: string;
  inputSchema?: unknown;
  outputSchema?: unknown;
  annotations?: McpToolAnnotations;
  execution?: unknown;
  icons?: unknown;
  _meta?: JsonRecord;
  policySource: "mcp-annotations-conservative" | "conservative-default";
}

export interface McpDiscoveryReport {
  mode: "mcp-discovery";
  source: "tools-list-transcript";
  surface: ToolSurfaceInput;
  metadata: McpDiscoveryMetadata[];
  issues: McpDiscoveryIssue[];
  toolsExecuted: false;
}

export function loadMcpDiscoveryConfigFile(filePath: string): McpDiscoveryConfig {
  let rawJson: string;

  try {
    rawJson = readFileSync(filePath, "utf8");
  } catch (error) {
    throw new ToolSurfaceValidationError([`discovery config could not be read: ${formatError(error)}`]);
  }

  let parsed: unknown;

  try {
    parsed = JSON.parse(rawJson);
  } catch (error) {
    throw new ToolSurfaceValidationError([`discovery config is not valid JSON: ${formatError(error)}`]);
  }

  return parseMcpDiscoveryConfig(parsed);
}

export function parseMcpDiscoveryConfig(input: unknown): McpDiscoveryConfig {
  if (!isRecord(input)) {
    throw new ToolSurfaceValidationError(["root must be a JSON object"]);
  }

  const issues: string[] = [];
  const name = readOptionalString(input, "name", issues);
  const servers = readServers(input.servers, "servers", issues);

  if (issues.length > 0) {
    throw new ToolSurfaceValidationError(issues);
  }

  return {
    ...(name === undefined ? {} : { name }),
    servers,
  };
}

export function discoverMcpToolSurface(config: McpDiscoveryConfig): McpDiscoveryReport {
  const issues: McpDiscoveryIssue[] = [];
  const metadata: McpDiscoveryMetadata[] = [];
  const seenToolIds = new Set<string>();
  const servers = config.servers.map((serverConfig, serverIndex) => {
    const tools: RawTool[] = [];

    issues.push(...validateCursorChain(serverConfig, serverIndex));

    serverConfig.toolsList.forEach((page, pageIndex) => {
      page.tools.forEach((tool, toolIndex) => {
        const toolId = `${serverConfig.id}.${tool.name}`;
        const path = `servers[${serverIndex}].toolsList[${pageIndex}].tools[${toolIndex}].name`;

        if (seenToolIds.has(toolId)) {
          issues.push({
            code: "duplicate-tool-id",
            path,
            message: `tool ${toolId} was already discovered; duplicate tools are ignored`,
          });
          return;
        }

        seenToolIds.add(toolId);
        tools.push(toRawTool(serverConfig, tool, toolId));
        metadata.push(toMetadata(serverConfig.id, tool, toolId));
      });
    });

    return {
      id: serverConfig.id,
      title: serverConfig.title,
      category: serverConfig.category,
      description: serverConfig.description,
      tools,
    };
  });
  const audit = auditToolSurface(servers);

  for (const issue of audit.issues) {
    issues.push({
      code: "invalid-tool-surface",
      path: issue.path,
      message: issue.message,
    });
  }

  return {
    mode: "mcp-discovery",
    source: "tools-list-transcript",
    surface: {
      ...(config.name === undefined ? {} : { name: config.name }),
      servers,
    },
    metadata,
    issues,
    toolsExecuted: false,
  };
}

export function renderMcpDiscoveryReport(report: McpDiscoveryReport): string {
  const rawToolCount = report.surface.servers.reduce((total, server) => total + server.tools.length, 0);

  return [
    "MCP Capability Runtime Discovery",
    "================================",
    "",
    `Source                   ${report.source}`,
    `Servers discovered       ${report.surface.servers.length}`,
    `Raw tools discovered     ${rawToolCount}`,
    `Issues                   ${report.issues.length}`,
    `toolsExecuted=${report.toolsExecuted}`,
    "",
    "Discovered servers",
    ...report.surface.servers.map((server) => {
      return `- ${server.id}: ${server.tools.length} tools`;
    }),
    "",
    "Boundary",
    "- reads a caller-supplied local tools/list transcript",
    "- normalizes tool metadata into the raw-only tool surface used by tax --input",
    "- no tools/call requests were made; no real MCP tools were called",
  ].join("\n");
}

function readServers(value: unknown, path: string, issues: string[]): McpDiscoveryServerConfig[] {
  if (!Array.isArray(value)) {
    issues.push(`${path} must be an array`);
    return [];
  }

  return value.map((serverValue, serverIndex) => {
    const serverPath = `${path}[${serverIndex}]`;

    if (!isRecord(serverValue)) {
      issues.push(`${serverPath} must be an object`);
      return emptyServer();
    }

    const id = readRequiredString(serverValue, "id", `${serverPath}.id`, issues);
    if (!isMcpIdentifier(id)) {
      issues.push(`${serverPath}.id must contain only letters, numbers, underscores, hyphens, or dots`);
    }

    return {
      id,
      title: readRequiredString(serverValue, "title", `${serverPath}.title`, issues),
      category: readRequiredString(serverValue, "category", `${serverPath}.category`, issues),
      description: readRequiredString(serverValue, "description", `${serverPath}.description`, issues),
      toolsList: readToolsList(serverValue.toolsList, `${serverPath}.toolsList`, issues),
    };
  });
}

function readToolsList(value: unknown, path: string, issues: string[]): McpToolsListPage[] {
  if (!Array.isArray(value) || value.length === 0) {
    issues.push(`${path} must be a non-empty array`);
    return [];
  }

  return value.map((pageValue, pageIndex) => {
    const pagePath = `${path}[${pageIndex}]`;

    if (!isRecord(pageValue)) {
      issues.push(`${pagePath} must be an object`);
      return { tools: [] };
    }

    const cursor = readOptionalString(pageValue, "cursor", issues, `${pagePath}.cursor`);
    const nextCursor = readOptionalString(pageValue, "nextCursor", issues, `${pagePath}.nextCursor`);

    return {
      ...(cursor === undefined ? {} : { cursor }),
      ...(nextCursor === undefined ? {} : { nextCursor }),
      tools: readTools(pageValue.tools, `${pagePath}.tools`, issues),
    };
  });
}

function readTools(value: unknown, path: string, issues: string[]): McpDiscoveredTool[] {
  if (!Array.isArray(value)) {
    issues.push(`${path} must be an array`);
    return [];
  }

  return value.map((toolValue, toolIndex) => {
    const toolPath = `${path}[${toolIndex}]`;

    if (!isRecord(toolValue)) {
      issues.push(`${toolPath} must be an object`);
      return { name: "", description: "", inputSchema: {} };
    }

    const name = readRequiredString(toolValue, "name", `${toolPath}.name`, issues);
    if (!isMcpIdentifier(name)) {
      issues.push(`${toolPath}.name must contain only letters, numbers, underscores, hyphens, or dots`);
    }

    const title = readOptionalString(toolValue, "title", issues, `${toolPath}.title`);
    const annotations = readAnnotations(toolValue.annotations, `${toolPath}.annotations`, issues);
    const inputSchema = readRequiredRecord(toolValue.inputSchema, `${toolPath}.inputSchema`, issues);
    const _meta = readOptionalRecord(toolValue._meta, `${toolPath}._meta`, issues);
    const description =
      readOptionalString(toolValue, "description", issues, `${toolPath}.description`) ??
      title ??
      annotations?.title ??
      name;

    return {
      name,
      ...(title === undefined ? {} : { title }),
      description,
      inputSchema,
      ...(toolValue.outputSchema === undefined ? {} : { outputSchema: toolValue.outputSchema }),
      ...(annotations === undefined ? {} : { annotations }),
      ...(toolValue.execution === undefined ? {} : { execution: toolValue.execution }),
      ...(toolValue.icons === undefined ? {} : { icons: toolValue.icons }),
      ...(_meta === undefined ? {} : { _meta }),
    };
  });
}

function readAnnotations(value: unknown, path: string, issues: string[]): McpToolAnnotations | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (!isRecord(value)) {
    issues.push(`${path} must be an object when provided`);
    return undefined;
  }

  return {
    ...readOptionalBooleanProperty(value, "readOnlyHint", path, issues),
    ...readOptionalBooleanProperty(value, "destructiveHint", path, issues),
    ...readOptionalBooleanProperty(value, "idempotentHint", path, issues),
    ...readOptionalBooleanProperty(value, "openWorldHint", path, issues),
    ...readOptionalStringProperty(value, "title", path, issues),
  };
}

function readOptionalBooleanProperty(
  record: JsonRecord,
  key: keyof McpToolAnnotations,
  path: string,
  issues: string[],
): Partial<McpToolAnnotations> {
  const value = record[key];

  if (value === undefined) {
    return {};
  }

  if (typeof value !== "boolean") {
    issues.push(`${path}.${key} must be a boolean when provided`);
    return {};
  }

  return { [key]: value };
}

function readOptionalStringProperty(
  record: JsonRecord,
  key: keyof McpToolAnnotations,
  path: string,
  issues: string[],
): Partial<McpToolAnnotations> {
  const value = record[key];

  if (value === undefined) {
    return {};
  }

  if (typeof value !== "string" || value.trim().length === 0) {
    issues.push(`${path}.${key} must be a non-empty string when provided`);
    return {};
  }

  return { [key]: value };
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

function readOptionalRecord(value: unknown, path: string, issues: string[]): JsonRecord | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (!isRecord(value)) {
    issues.push(`${path} must be an object when provided`);
    return undefined;
  }

  return value;
}

function readRequiredRecord(value: unknown, path: string, issues: string[]): JsonRecord {
  if (!isRecord(value)) {
    issues.push(`${path} must be an object`);
    return {};
  }

  return value;
}

function toRawTool(server: McpDiscoveryServerConfig, tool: McpDiscoveredTool, toolId: string): RawTool {
  const policy = inferPolicy(tool.annotations);

  return {
    id: toolId,
    serverId: server.id,
    serverTitle: server.title,
    name: tool.name,
    description: tool.description,
    category: server.category,
    permissionLevel: policy.permissionLevel,
    riskLevel: policy.riskLevel,
    tags: policy.tags,
    ...(policy.noisy ? { noisy: true } : {}),
  };
}

function toMetadata(serverId: string, tool: McpDiscoveredTool, toolId: string): McpDiscoveryMetadata {
  const policy = inferPolicy(tool.annotations);

  return {
    toolId,
    serverId,
    mcpName: tool.name,
    ...(tool.title === undefined ? {} : { title: tool.title }),
    ...(tool.inputSchema === undefined ? {} : { inputSchema: tool.inputSchema }),
    ...(tool.outputSchema === undefined ? {} : { outputSchema: tool.outputSchema }),
    ...(tool.annotations === undefined ? {} : { annotations: tool.annotations }),
    ...(tool.execution === undefined ? {} : { execution: tool.execution }),
    ...(tool.icons === undefined ? {} : { icons: tool.icons }),
    ...(tool._meta === undefined ? {} : { _meta: tool._meta }),
    policySource: policy.policySource,
  };
}

function inferPolicy(annotations: McpToolAnnotations | undefined): {
  permissionLevel: PermissionLevel;
  riskLevel: RiskLevel;
  tags: string[];
  noisy: boolean;
  policySource: McpDiscoveryMetadata["policySource"];
} {
  const tags = ["mcp", "discovered"];

  if (annotations?.destructiveHint === true) {
    return {
      permissionLevel: "admin",
      riskLevel: "high",
      tags: [...tags, "destructive"],
      noisy: false,
      policySource: "mcp-annotations-conservative",
    };
  }

  if (annotations?.readOnlyHint === true) {
    return {
      permissionLevel: "read",
      riskLevel: "medium",
      tags: [...tags, "read-only"],
      noisy: false,
      policySource: "mcp-annotations-conservative",
    };
  }

  return {
    permissionLevel: "admin",
    riskLevel: "high",
    tags: annotations?.openWorldHint === true ? [...tags, "open-world"] : tags,
    noisy: annotations === undefined,
    policySource: "conservative-default",
  };
}

function validateCursorChain(server: McpDiscoveryServerConfig, serverIndex: number): McpDiscoveryIssue[] {
  const issues: McpDiscoveryIssue[] = [];
  const seenCursors = new Set<string>();

  for (const [pageIndex, page] of server.toolsList.entries()) {
    const pagePath = `servers[${serverIndex}].toolsList[${pageIndex}]`;

    if (page.cursor !== undefined) {
      if (seenCursors.has(page.cursor)) {
        issues.push({
          code: "duplicate-cursor",
          path: `${pagePath}.cursor`,
          message: `cursor ${page.cursor} was already used in this server transcript`,
        });
      }

      seenCursors.add(page.cursor);
    }

    const nextPage = server.toolsList[pageIndex + 1];
    if (page.nextCursor !== undefined && nextPage === undefined) {
      issues.push({
        code: "dangling-next-cursor",
        path: `${pagePath}.nextCursor`,
        message: `nextCursor ${page.nextCursor} does not have a following transcript page`,
      });
      continue;
    }

    if (page.nextCursor !== undefined && nextPage?.cursor !== page.nextCursor) {
      issues.push({
        code: "cursor-mismatch",
        path: `${pagePath}.nextCursor`,
        message: `nextCursor ${page.nextCursor} does not match following page cursor ${nextPage?.cursor ?? "none"}`,
      });
    }
  }

  return issues;
}

function emptyServer(): McpDiscoveryServerConfig {
  return {
    id: "",
    title: "",
    category: "",
    description: "",
    toolsList: [],
  };
}

function isMcpIdentifier(value: string): boolean {
  return /^[A-Za-z0-9_.-]{1,128}$/.test(value);
}

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function formatError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
