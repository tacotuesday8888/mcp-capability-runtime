# External JSON Input

The v0.2 input path lets users run the tax meter on a static, read-only MCP-like tool surface without editing source code.

This does not discover, authenticate to, or execute real MCP servers. It only reads a local JSON file, validates it, normalizes server metadata onto each tool, and runs the same tax-meter calculation used by the built-in demo.

## Run It

```bash
npm run example:tax
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
- `capabilities`: the proposed cleaned capability surface to compare against

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

## Validation

Malformed input fails before the tax meter runs. Error messages include paths such as:

```text
Invalid tool surface input:
- servers[0].tools[0].permissionLevel must be one of: read, write, execute, admin
- servers[0].tools[0].riskLevel must be one of: low, medium, high
```

## Path To Real MCP Discovery

This file format is the bridge between the local fixture and real MCP discovery.

Near-term, an adapter can inspect real MCP servers and write this same JSON shape as a read-only snapshot. Later, the runtime can replace static files with live discovery and capability routing while preserving the same core questions: what the agent should see, when it should see it, what it may do, what context it needs, and what proof it returns.
