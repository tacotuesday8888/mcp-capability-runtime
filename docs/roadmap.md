# Roadmap

This repo is still using a temporary name. Naming research comes later; do not treat `mcp-capability-runtime` as the final brand.

## v0.2: Static External Surfaces

- GitHub Actions CI for install, typecheck, lint, tests, and CLI demos.
- Read-only JSON input for non-demo MCP-like tool surfaces.
- Validation errors that point to malformed fields.
- Documentation for the external input path.

## v0.3: Read-Only Discovery Foundation

Acceptance criteria:

- Require Node.js 22 or newer in package metadata and CI.
- Support a raw-only external input file where `capabilities` is optional.
- Add `npm run raw:tax` so users can measure the raw surface before designing capabilities.
- Add `npm run pack:check` so the package contents can be inspected before publishing.
- Audit capability surfaces semantically, not just by JSON shape.
- Reject duplicate server, tool, and capability IDs.
- Reject capabilities that reference missing raw tools.
- Reject capabilities that understate wrapped tool permission or risk.
- Reject empty required capability arrays for context, tools, proof, and examples.
- Keep the next adapter target read-only: inspect configured MCP server metadata and produce the same raw tool-surface shape without executing tools.

Still out of scope for v0.3:

- real OAuth
- real SaaS integrations
- real tool execution
- production-grade transport hardening
- a full MCP router

## v0.4: Capability Router

- Select a smaller capability surface for an agent based on task intent and required context.
- Keep compatibility with existing MCP servers.
- Avoid becoming a generic MCP gateway; the focus remains capability intelligence.

## v0.5: Receipts And Proof

- Return structured receipts showing what the agent saw, selected, and proved.
- Add proof fields that can be checked by developers.
- Keep the first version local and deterministic.

## v0.6: Incident-To-PR Runner

- Build the flagship demo path: 10 MCP servers, one production incident, one clean PR.
- Use fake local developer tools first.
- Add real integrations only after the capability contract is stable.

## Naming Research

Before any final name is chosen, check collisions across GitHub, npm, PyPI, crates.io, domains, trademarks, and protocol names. Avoid `ACP`, `XCP`, `Agent OS`, generic `agent.json`, or anything that lightly rebrands MCP.
