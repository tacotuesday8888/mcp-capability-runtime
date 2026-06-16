#!/usr/bin/env node

import {
  ToolSurfaceValidationError,
  computeTaxMeter,
  demoCapabilities,
  demoServers,
  isPermissionLevel,
  isRiskLevel,
  loadToolSurfaceFile,
  createDemoInvocationReceipt,
  discoverMcpToolSurface,
  loadMcpDiscoveryConfigFile,
  renderCapabilitySelectionReport,
  renderDemoReceiptReport,
  renderDemoWalkthroughReport,
  renderMcpDiscoveryReport,
  renderTaxMeterReport,
  selectCapabilities,
} from "./index.js";

function printHelp(): void {
  console.log(
    [
      "Usage: mcp-capability-runtime <command> [options]",
      "",
      "Commands:",
      "  tax        Run the tax meter. Defaults to the built-in demo fixture.",
      "  select     Select a task-scoped capability surface and print a dry-run selection report.",
      "  discover   Normalize a caller-supplied local MCP tools/list transcript without calling tools.",
      "  demo:walkthrough",
      "             Show the staged local demo from raw tools to planned capability routes.",
      "  demo:receipt",
      "             Show a deterministic local fixture receipt for the incident-triage capability.",
      "  demo:tax   Alias for tax --demo.",
      "",
      "Tax options:",
      "  --demo           Use the built-in 10-server demo fixture.",
      "  --input <file>   Read a static MCP-like tool surface JSON file.",
      "",
      "Select options:",
      "  --task <text>              Required task text.",
      "  --context <text>           Provided context. Can be repeated.",
      "  --max-permission <level>   read, write, execute, or admin. Defaults to read.",
      "  --max-risk <level>         low, medium, or high. Defaults to medium.",
      "  --limit <count>            Maximum selected capabilities. Defaults to 5.",
      "  --json                     Print a stable JSON selection report.",
      "",
      "Receipt options:",
      "  --json                     Print a stable JSON local receipt.",
      "",
      "Discover options:",
      "  --config <file>            Read a caller-supplied local MCP discovery transcript.",
      "  --json                     Print raw-only surface JSON for tax --input.",
      "  -h, --help       Show this help.",
    ].join("\n"),
  );
}

type SurfaceOptions = { mode: "demo" } | { mode: "input"; inputFile: string };

type CliOptions =
  | ({ command: "tax" } & SurfaceOptions)
  | { command: "demo:walkthrough" }
  | { command: "demo:receipt"; json: boolean }
  | { command: "discover"; configFile: string; json: boolean }
  | ({
      command: "select";
      task: string;
      context: string[];
      maxPermissionLevel?: "read" | "write" | "execute" | "admin";
      maxRiskLevel?: "low" | "medium" | "high";
      limit?: number;
      json: boolean;
    } & SurfaceOptions);

function parseArgs(argv: string[]): CliOptions | "help" {
  const [command = "tax", ...rest] = argv;

  if (command === "--help" || command === "-h" || command === "help") {
    return "help";
  }

  if (command === "demo:tax") {
    if (rest.length > 0) {
      throw new ToolSurfaceValidationError(["demo:tax does not accept extra arguments; use tax --input <file>"]);
    }

    return { command: "tax", mode: "demo" };
  }

  if (command === "demo:walkthrough") {
    if (rest.length > 0) {
      throw new ToolSurfaceValidationError(["demo:walkthrough does not accept extra arguments"]);
    }

    return { command: "demo:walkthrough" };
  }

  if (command === "demo:receipt") {
    return parseDemoReceiptArgs(rest);
  }

  if (command === "discover") {
    return parseDiscoverArgs(rest);
  }

  if (command === "select") {
    return parseSelectArgs(rest);
  }

  if (command !== "tax") {
    throw new ToolSurfaceValidationError([`unknown command: ${command}`]);
  }

  return { command: "tax", ...parseSurfaceArgs(rest) };
}

function parseDemoReceiptArgs(rest: string[]): CliOptions {
  let json = false;

  for (const arg of rest) {
    if (arg === "--json") {
      json = true;
      continue;
    }

    throw new ToolSurfaceValidationError([`unknown option for demo:receipt: ${arg}`]);
  }

  return { command: "demo:receipt", json };
}

function parseDiscoverArgs(rest: string[]): CliOptions {
  let configFile: string | undefined;
  let json = false;

  for (let index = 0; index < rest.length; index += 1) {
    const arg = rest[index];

    if (arg === "--config") {
      configFile = readOptionValue(rest, index, "--config");
      index += 1;
      continue;
    }

    if (arg === "--json") {
      json = true;
      continue;
    }

    throw new ToolSurfaceValidationError([`unknown option for discover: ${arg ?? ""}`]);
  }

  if (configFile === undefined) {
    throw new ToolSurfaceValidationError(["discover requires --config <file>"]);
  }

  return { command: "discover", configFile, json };
}

function parseSurfaceArgs(rest: string[]): SurfaceOptions {
  let mode: "demo" | "input" = "demo";
  let inputFile: string | undefined;
  let sawDemo = false;
  let sawInput = false;

  for (let index = 0; index < rest.length; index += 1) {
    const arg = rest[index];

    if (arg === "--demo") {
      sawDemo = true;
      mode = "demo";
      continue;
    }

    if (arg === "--input") {
      sawInput = true;
      const next = rest[index + 1];

      if (next === undefined || next.startsWith("-")) {
        throw new ToolSurfaceValidationError(["--input requires a file path"]);
      }

      inputFile = next;
      mode = "input";
      index += 1;
      continue;
    }

    throw new ToolSurfaceValidationError([`unknown option: ${arg ?? ""}`]);
  }

  if (sawDemo && sawInput) {
    throw new ToolSurfaceValidationError(["choose either --demo or --input <file>, not both"]);
  }

  if (mode === "input" && inputFile === undefined) {
    throw new ToolSurfaceValidationError(["--input requires a file path"]);
  }

  return inputFile === undefined ? { mode: "demo" } : { mode: "input", inputFile };
}

function parseSelectArgs(rest: string[]): CliOptions {
  const surfaceArgs: string[] = [];
  const context: string[] = [];
  let task: string | undefined;
  let maxPermissionLevel: "read" | "write" | "execute" | "admin" | undefined;
  let maxRiskLevel: "low" | "medium" | "high" | undefined;
  let limit: number | undefined;
  let json = false;

  for (let index = 0; index < rest.length; index += 1) {
    const arg = rest[index];

    if (arg === "--demo" || arg === "--input") {
      surfaceArgs.push(arg);

      if (arg === "--input") {
        const next = rest[index + 1];

        if (next !== undefined) {
          surfaceArgs.push(next);
          index += 1;
        }
      }

      continue;
    }

    if (arg === "--task") {
      task = readOptionValue(rest, index, "--task");
      index += 1;
      continue;
    }

    if (arg === "--context") {
      context.push(readOptionValue(rest, index, "--context"));
      index += 1;
      continue;
    }

    if (arg === "--max-permission") {
      const value = readOptionValue(rest, index, "--max-permission");

      if (!isPermissionLevel(value)) {
        throw new ToolSurfaceValidationError(["--max-permission must be one of: read, write, execute, admin"]);
      }

      maxPermissionLevel = value;
      index += 1;
      continue;
    }

    if (arg === "--max-risk") {
      const value = readOptionValue(rest, index, "--max-risk");

      if (!isRiskLevel(value)) {
        throw new ToolSurfaceValidationError(["--max-risk must be one of: low, medium, high"]);
      }

      maxRiskLevel = value;
      index += 1;
      continue;
    }

    if (arg === "--limit") {
      limit = readPositiveInteger(readOptionValue(rest, index, "--limit"), "--limit");
      index += 1;
      continue;
    }

    if (arg === "--json") {
      json = true;
      continue;
    }

    throw new ToolSurfaceValidationError([`unknown option for select: ${arg ?? ""}`]);
  }

  if (task === undefined || task.trim().length === 0) {
    throw new ToolSurfaceValidationError(["select requires --task <text>"]);
  }

  return {
    command: "select",
    ...parseSurfaceArgs(surfaceArgs),
    task,
    context,
    ...(maxPermissionLevel === undefined ? {} : { maxPermissionLevel }),
    ...(maxRiskLevel === undefined ? {} : { maxRiskLevel }),
    ...(limit === undefined ? {} : { limit }),
    json,
  };
}

function readOptionValue(args: string[], index: number, option: string): string {
  const next = args[index + 1];

  if (next === undefined || next.startsWith("-")) {
    throw new ToolSurfaceValidationError([`${option} requires a value`]);
  }

  return next;
}

function readPositiveInteger(value: string, option: string): number {
  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new ToolSurfaceValidationError([`${option} must be a positive integer`]);
  }

  return parsed;
}

function run(argv: string[]): number {
  try {
    const options = parseArgs(argv);

    if (options === "help") {
      printHelp();
      return 0;
    }

    if (options.command === "demo:walkthrough") {
      console.log(renderDemoWalkthroughReport());
      return 0;
    }

    if (options.command === "demo:receipt") {
      console.log(options.json ? JSON.stringify(createDemoInvocationReceipt(), null, 2) : renderDemoReceiptReport());
      return 0;
    }

    if (options.command === "discover") {
      const report = discoverMcpToolSurface(loadMcpDiscoveryConfigFile(options.configFile));

      if (options.json && report.issues.length > 0) {
        throw new ToolSurfaceValidationError([
          "discovery produced issues; fix them before emitting tax-ready surface JSON",
          ...report.issues.map((issue) => `${issue.code} at ${issue.path}: ${issue.message}`),
        ]);
      }

      console.log(options.json ? JSON.stringify(report.surface, null, 2) : renderMcpDiscoveryReport(report));
      return 0;
    }

    const surface =
      options.mode === "demo"
        ? { servers: demoServers, capabilities: demoCapabilities }
        : loadToolSurfaceFile(options.inputFile);

    if (options.command === "tax") {
      console.log(renderTaxMeterReport(computeTaxMeter(surface.servers, surface.capabilities)));
      return 0;
    }

    if (surface.capabilities === undefined) {
      throw new ToolSurfaceValidationError(["select requires a capability surface; raw-only input is not enough"]);
    }

    const report = selectCapabilities(surface.capabilities, {
      task: options.task,
      context: options.context,
      ...(options.maxPermissionLevel === undefined ? {} : { maxPermissionLevel: options.maxPermissionLevel }),
      ...(options.maxRiskLevel === undefined ? {} : { maxRiskLevel: options.maxRiskLevel }),
      ...(options.limit === undefined ? {} : { limit: options.limit }),
    });

    console.log(options.json ? JSON.stringify(report, null, 2) : renderCapabilitySelectionReport(report));
    return 0;
  } catch (error) {
    if (error instanceof ToolSurfaceValidationError) {
      console.error(error.message);
    } else if (error instanceof Error) {
      console.error(error.message);
    } else {
      console.error(String(error));
    }

    return 1;
  }
}

process.exitCode = run(process.argv.slice(2));
