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

## v0.4: Task-Scoped Capability Selector

Acceptance criteria:

- Add a public selector API that takes task text, context, permission ceiling, risk ceiling, and limit.
- Default to a conservative `read` permission ceiling and `medium` risk ceiling.
- Select only capabilities that match the task, satisfy required context, and fit the permission/risk policy.
- Return blocked capabilities with reasons such as missing context, permission limit, risk limit, no task match, or over-limit.
- Return a dry-run receipt with selected IDs, expected proof, exposed underlying tools, and selected prompt-token estimate.
- Add a CLI command that runs selection against the demo or an external JSON input with capabilities.
- Add JSON selection report output for automation.
- Keep the implementation deterministic, local, and free of real tool execution.

Still out of scope for v0.4:

- live MCP routing
- real tool execution
- LLM planning
- production sandboxing
- end-to-end incident-to-PR automation

## v0.5: Surface And Receipt Split

- Separate the agent-facing selected capability surface from the developer-facing selection receipt.
- Keep selected surfaces focused on capability contract fields, without exposing blocked tool details.
- Keep receipts deterministic and local, with selected IDs, selected decision details, blocked reasons, exposed selected tools, token estimate, and `toolsExecuted: false`.
- Add launch checks for checked-in demo output and external selector input.

## v0.6: Invocation Planning And Walkthrough

- Turn selection receipts into local invocation plans for one selected capability.
- Prove which selected raw tool routes are allowed before anything executes.
- Reject blocked capabilities, stale receipts, missing tools, and tools outside the selected capability.
- Add a one-command walkthrough that shows raw tools, selected capabilities, planned routes, and blocked write action.
- Keep `toolsExecuted: false`.

## v0.7: Local Receipts And Proof

- Record local simulated invocation receipts from deterministic fixture results.
- Show what the agent saw, selected, attempted, changed, and proved.
- Reject invalid plans, unplanned tool results, duplicate results, missing results, failed results, and missing proof.
- Keep the first executable receipt local and deterministic.

## v0.8: Read-Only MCP Discovery

- Inspect configured MCP servers without executing their tools.
- Produce the same raw tool-surface shape used by the JSON path.
- Keep authentication, OAuth, and production-grade transport hardening out of scope until the adapter contract is clear.

## v0.9: Incident-To-PR Runner

- Build the flagship demo path: 10 MCP servers, one production incident, one clean PR.
- Use fake local developer tools first.
- Add real integrations only after the capability contract is stable.

## Naming Research

Before any final name is chosen, check collisions across GitHub, npm, PyPI, crates.io, domains, trademarks, and protocol names. Avoid `ACP`, `XCP`, `Agent OS`, generic `agent.json`, or anything that lightly rebrands MCP.
