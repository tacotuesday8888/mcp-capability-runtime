# Roadmap

This repo is still using a temporary name. Naming research comes later; do not treat `mcp-capability-runtime` as the final brand.

## v0.2: Static External Surfaces

- GitHub Actions CI for install, typecheck, lint, tests, and CLI demos.
- Read-only JSON input for non-demo MCP-like tool surfaces.
- Validation errors that point to malformed fields.
- Documentation for the external input path.

## v0.3: Real MCP Adapter

- Inspect configured MCP servers without executing their tools.
- Produce the same raw tool-surface shape used by the v0.2 JSON path.
- Keep authentication, OAuth, and production-grade transport hardening out of scope until the adapter contract is clear.

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
