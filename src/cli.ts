#!/usr/bin/env node

import {
  ToolSurfaceValidationError,
  computeTaxMeter,
  demoCapabilities,
  demoServers,
  loadToolSurfaceFile,
  renderTaxMeterReport,
} from "./index.js";

function printHelp(): void {
  console.log(
    [
      "Usage: mcp-capability-runtime tax [--demo | --input <file>]",
      "",
      "Commands:",
      "  tax        Run the tax meter. Defaults to the built-in demo fixture.",
      "  demo:tax   Alias for tax --demo.",
      "",
      "Options:",
      "  --demo           Use the built-in 10-server demo fixture.",
      "  --input <file>   Read a static MCP-like tool surface JSON file.",
      "  -h, --help       Show this help.",
    ].join("\n"),
  );
}

type CliOptions = { mode: "demo" } | { mode: "input"; inputFile: string };

function parseArgs(argv: string[]): CliOptions | "help" {
  const [command = "tax", ...rest] = argv;

  if (command === "--help" || command === "-h" || command === "help") {
    return "help";
  }

  if (command === "demo:tax") {
    if (rest.length > 0) {
      throw new ToolSurfaceValidationError(["demo:tax does not accept extra arguments; use tax --input <file>"]);
    }

    return { mode: "demo" };
  }

  if (command !== "tax") {
    throw new ToolSurfaceValidationError([`unknown command: ${command}`]);
  }

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

    throw new ToolSurfaceValidationError([`unknown option for tax: ${arg ?? ""}`]);
  }

  if (sawDemo && sawInput) {
    throw new ToolSurfaceValidationError(["choose either --demo or --input <file>, not both"]);
  }

  if (mode === "input" && inputFile === undefined) {
    throw new ToolSurfaceValidationError(["--input requires a file path"]);
  }

  return inputFile === undefined ? { mode: "demo" } : { mode: "input", inputFile };
}

function run(argv: string[]): number {
  try {
    const options = parseArgs(argv);

    if (options === "help") {
      printHelp();
      return 0;
    }

    const surface =
      options.mode === "demo"
        ? { servers: demoServers, capabilities: demoCapabilities }
        : loadToolSurfaceFile(options.inputFile);

    console.log(renderTaxMeterReport(computeTaxMeter(surface.servers, surface.capabilities)));
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
