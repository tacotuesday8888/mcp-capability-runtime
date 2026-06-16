# MCP Discovery

v0.8 adds a read-only MCP discovery foundation.

In this release, discovery means:

- read a caller-supplied local saved `tools/list` transcript
- normalize MCP tool metadata into the same raw-only tool surface used by `tax --input`
- infer conservative permission and risk labels from MCP annotations
- return `toolsExecuted: false`

It does not start MCP server processes, open network transports, authenticate to SaaS, read user home app configs, or call `tools/call`.

## Run The Demo

```bash
npm run demo:discover
npm run demo:discover:json
```

`demo:discover` prints a readable summary. `demo:discover:json` prints raw-only surface JSON that can be saved and passed to `tax --input`.

```bash
npm run build
node dist/src/cli.js discover --config examples/mcp-discovery-config.json --json > /tmp/discovered-surface.json
node dist/src/cli.js tax --input /tmp/discovered-surface.json
```

## Config Shape

The config is a local transcript of MCP `tools/list` pages:

```json
{
  "name": "local MCP discovery transcript",
  "servers": [
    {
      "id": "local-logs",
      "title": "Local Logs MCP",
      "category": "error tracking and logs",
      "description": "Project-local transcript of read-only log discovery metadata.",
      "toolsList": [
        {
          "tools": [
            {
              "name": "search_events",
              "description": "Search recent checkout error events.",
              "inputSchema": {
                "type": "object",
                "properties": {
                  "service": {
                    "type": "string"
                  }
                }
              },
              "annotations": {
                "readOnlyHint": true
              }
            }
          ],
          "nextCursor": "next-page"
        }
      ]
    }
  ]
}
```

Each discovered raw tool ID is namespaced as:

```text
serverId.toolName
```

That keeps tools with the same MCP name on different servers distinct.

## Annotation Policy

MCP annotations are hints, not proof. The normalizer treats them conservatively:

- `destructiveHint: true` becomes `admin` permission and `high` risk
- `readOnlyHint: true` becomes `read` permission and `medium` risk
- `openWorldHint: true` is preserved as metadata and tags non-read-only defaults as open-world
- missing annotations default to `admin` permission and `high` risk, and mark the tool as noisy

The result is a starting raw surface for the tax meter, not a security boundary.

## Framework API

```ts
import {
  discoverMcpToolSurface,
  loadMcpDiscoveryConfigFile,
} from "mcp-capability-runtime";

const config = loadMcpDiscoveryConfigFile("examples/mcp-discovery-config.json");
const report = discoverMcpToolSurface(config);

console.log(report.toolsExecuted); // false
console.log(report.surface.servers.flatMap((server) => server.tools));
```

The full report includes:

- `mode: "mcp-discovery"`
- `source: "tools-list-transcript"`
- normalized raw-only `surface`
- developer metadata for discovered schemas and annotations
- deterministic issues such as duplicate normalized tool IDs
- `toolsExecuted: false`

## Boundary

This is not a real MCP client yet. It is the compatibility foundation: prove that MCP `tools/list` metadata can become the same raw tool surface already used by tax, selection, planning, and receipts.

Future work can add live read-only stdio discovery after the transcript contract is stable.
