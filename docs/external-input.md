# External JSON Input

The external input path lets users run the tax meter on a static, read-only MCP-like tool surface without editing source code.

This does not authenticate to or execute real MCP servers. It only reads a local JSON file, validates it, normalizes server metadata onto each tool, audits any provided capability surface, and runs the same tax-meter calculation used by the built-in demo.

## Run It

```bash
npm run example:tax
```

Run a raw-only surface before writing capabilities:

```bash
npm run raw:tax
```

Or pass a file directly after building:

```bash
npm run build
node dist/src/cli.js tax --input examples/minimal-tool-surface.json
```

The built-in demo remains available:

```bash
npm run demo:tax
```

## Format

The root JSON object has:

- `name`: optional label for the surface
- `servers`: raw MCP-like servers and their tools
- `capabilities`: optional proposed cleaned capability surface to compare against

Each server has `id`, `title`, `category`, `description`, and `tools`.

Each tool has:

- `id`
- `name`
- `description`
- `permissionLevel`: `read`, `write`, `execute`, or `admin`
- `riskLevel`: `low`, `medium`, or `high`
- `tags`: optional array of strings
- `duplicateGroup`: optional string for duplicate/noisy surface analysis
- `noisy`: optional boolean

Each capability follows the public capability contract in [capability-contract.md](./capability-contract.md).

See [minimal-tool-surface.json](../examples/minimal-tool-surface.json) for a complete example.
See [raw-tool-surface.json](../examples/raw-tool-surface.json) for a raw-only example with no `capabilities` array.

## Use With Selection

When an input file includes capabilities, it can also drive the task-scoped selector:

```bash
npm run example:select
```

Raw-only input is accepted by the tax meter but not by `select`, because selection needs capabilities to choose from.

## Raw-Only Mode

Capabilities are optional because a developer may want to measure the current tool-list tax before designing a cleaned surface.

When `capabilities` is missing, the report runs in raw-only mode. It still shows:

- raw tool count
- estimated prompt-token cost
- risky raw tools
- noisy raw tools
- duplicate raw tools and duplicate groups

It does not show tool count reduction, token reduction, or risky exposure reduction because those numbers require a capability surface to compare against.

## Validation

Malformed input fails before the tax meter runs. Error messages include paths such as:

```text
Invalid tool surface input:
- servers[0].tools[0].permissionLevel must be one of: read, write, execute, admin
- servers[0].tools[0].riskLevel must be one of: low, medium, high
```

When capabilities are provided, the loader also runs the semantic capability surface audit. The audit rejects:

- duplicate server, tool, or capability IDs
- capability `underlyingTools` entries that do not point to real raw tools
- capabilities that understate the highest permission level of the tools they wrap
- capabilities that understate the highest risk level of the tools they wrap
- empty `requiredContext`, `underlyingTools`, `proofReturned`, or `examples` arrays

This keeps the cleaned surface honest. A capability can simplify the agent-facing choice, but it cannot hide that it wraps an admin or high-risk tool.

## Path To Real MCP Discovery

This file format is the bridge between the local fixture, offline MCP discovery transcripts, and future live MCP discovery.

v0.8 adds [MCP discovery](./mcp-discovery.md) for caller-supplied local saved `tools/list` transcript pages. It writes this same raw-only tool-surface JSON shape, so `tax --input` works unchanged.

Live transport discovery remains future work. The target stays read-only: inspect configured MCP server metadata, write this same raw tool-surface JSON, and run the tax meter or selector without executing tools or handling real OAuth. Later, the runtime can replace static files with live discovery and capability routing while preserving the same core questions: what the agent should see, when it should see it, what it may do, what context it needs, and what proof it returns.
