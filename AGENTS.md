# AGENTS.md

## How To Use This File

This file is the durable project context for Codex. Codex reads `AGENTS.md` before starting work in this repository, so this file should hold the important product decisions, research conclusions, engineering expectations, and safety rules.

Do not store one-off `/goal` prompts in the project as repo context. A `/goal` prompt should be pasted into Codex for a specific run and should point back to this file instead of repeating every detail.

The current folder and temporary repository name is `mcp-capability-runtime`. This is not the final brand.

## Communication

Explain technical choices in plain English. The project owner is not deeply technical.

Work autonomously once a goal is set, but keep decisions pragmatic and safe. If a task asks for broad/full access, still avoid destructive, unrelated, secret-exposing, or irreversible work.

## Product Thesis

MCP made tools callable. This project makes capabilities understandable, selectable, permissioned, runnable, and provable.

MCP is useful, but today it often gives agents a flat pile of tools. This project should turn that pile into a structured capability layer so agents see the right capability at the right time, with clearer permissions and proof of what happened.

The public stance for now:

> A compatible replacement for MCP's flat tool-list experience.

Do not claim that this replaces MCP entirely on day one. The project should work with today's MCP ecosystem while introducing a capability contract that can mature into a protocol/runtime layer.

## Naming Status

Do not choose a final name yet.

Avoid final names or positioning based on:

- `ACP`
- `XCP`
- `Agent OS`
- generic `agent.json`
- anything that lightly rebrands MCP

Before choosing a final name, research collisions across GitHub, npm, PyPI, crates.io, domains, trademarks, and protocol names.

## Target Users

Primary first user:

- AI app developers who already use MCP and feel tool overload, confusing tool choice, risky permissions, and unreliable agent behavior.

Secondary user:

- MCP server authors who want their servers to publish better capability definitions later.

## Conversation And Brainstorm Summary

The initial ambition is very high: create a breakout viral open-source project, potentially in the 100k-star class, not a small MCP utility.

Earlier directions considered:

- better context model,
- trust and permissions,
- agent workflows,
- full platform,
- Agent Context Protocol / ACP,
- Agent OS,
- context replay,
- capability runtime/router.

Important decisions from brainstorming:

- The project should be ambitious but still quickly understandable, cloneable, and shareable.
- The first wedge should not be a huge platform.
- The best path is dual track: compatible with existing MCP servers today, but introducing a stronger capability runtime contract over time.
- Tool overload is the first viral pain.
- Trust, permissions, receipts, and workflow are important long-term pillars, but v1 should prove capability intelligence first.
- The flagship demo should be developer-focused.
- The selected demo story is: `10 MCP servers, one production incident, one clean PR`.
- The demo should be local and reproducible, with no SaaS accounts, API keys, real credentials, or secrets required.
- A full runner is desired eventually, but the first implementation milestone should prove the tax meter and capability surface before building the full incident-to-PR runner.

## Research Conclusions

Do not copy or lightly rebrand existing crowded ideas.

Crowded lanes:

- Generic MCP gateways: Docker MCP Gateway and Composio MCP Gateway already cover routing, credentials, auth, server management, and governance.
- Tool compression or lazy loading alone: Atlassian `mcp-compressor`, FastMCP code mode, pctx, mcporter, Red Hat codemode-lite, and research around dynamic tool gating already address parts of this.
- Pure context persistence: Open Context Protocol already targets persistent context on top of MCP.
- Generic agent OS/workflow protocol: A2A, AG-UI, ACP, OpenWOP, Microsoft Agent Framework, Google ADK, OpenAI Agents SDK, LangGraph, CrewAI, OpenHands, and similar projects occupy parts of that space.
- Pure security tooling: important, but likely more enterprise-heavy and less viral as the first wedge.

The under-owned angle is capability intelligence:

- What should the agent see?
- When should it see it?
- What is it allowed to do?
- What context does it need?
- What proof should it return?

## Strategic Direction

Build two connected pieces:

- Capability runtime: agents operate on structured capabilities instead of raw tool lists.
- MCP compatibility router: existing MCP servers can plug in, while the agent sees a cleaner capability surface.

This is not:

- just another MCP gateway,
- just another MCP compressor,
- just another MCP inspector,
- just another context persistence layer,
- just another agent framework.

The adoption story is compatibility. The replacement story is the capability contract.

## V1 Product Shape

V1 should be practical, local, testable, and demoable. It should not require real SaaS accounts, API keys, secrets, production infrastructure, or a live LLM.

V1 should include:

- MCP tax meter,
- capability model,
- local 10-server MCP-like demo fixture,
- cleaned capability surface,
- framework APIs,
- CLI demo,
- README and launch-ready explanation,
- tests.

Future versions can add:

- full incident-to-PR runner,
- real MCP adapter/router,
- permission receipts,
- replay/proof trail,
- native capability authoring for MCP server authors,
- protocol specification.

## Flagship Demo Vision

The flagship story is:

> 10 MCP servers, one production incident, one clean PR.

The local demo should imitate recognizable developer tools:

- error tracking or logs,
- issue tracker,
- source repository,
- documentation,
- database or query tool,
- browser testing,
- deployment status,
- chat/status update,
- package/dependency information,
- pull request output.

The full long-term demo flow:

1. Run the MCP tax meter against the raw 10-server setup.
2. Show raw tool count, estimated prompt/token cost, risky/noisy tools, broad permissions, and why the agent would be overwhelmed.
3. Show the cleaned capability surface with fewer capabilities, clearer intent, permission/risk labels, required context, and proof returned.
4. Run an incident-to-PR workflow.
5. Produce a receipt showing what the runner saw, used, changed, and proved.

The first milestone should implement steps 1-3 well. Do not overbuild steps 4-5 until the foundation is solid.

## Core Domain Model

A capability should include at least:

- `id`
- `title`
- `description`
- `intent`
- `whenToUse`
- `requiredContext`
- `permissionLevel`
- `riskLevel`
- `underlyingTools`
- `proofReturned`
- `examples`

The tax meter should compare at least:

- raw tools exposed,
- estimated token cost of raw tool descriptions,
- capability count,
- estimated token cost of the capability surface,
- risky tools exposed,
- risky capabilities exposed,
- noisy or duplicate tools,
- reduction percentage.

Framework APIs should allow another developer to import and use:

- capability definitions,
- local fixtures,
- tax meter,
- report renderer,
- receipt/proof types where applicable.

## Engineering Defaults

Prefer TypeScript unless the repository already establishes a different stack. TypeScript is a good fit because MCP and AI app developers commonly work in Node/TypeScript.

Use npm unless another package manager already exists.

Keep the code small, deterministic, readable, and easy to clone.

Prefer simple pure functions for the first slice.

Use minimal dependencies. Add a dependency only when it clearly reduces complexity.

Prefer a maintainable structure similar to:

```text
.
├── AGENTS.md
├── README.md
├── package.json
├── src/
│   ├── index.ts
│   ├── cli.ts
│   ├── capabilities/
│   ├── tax-meter/
│   └── demo/
├── tests/
├── examples/
└── docs/
```

## V1 Non-Goals

Do not build these in the first milestone:

- real OAuth,
- real SaaS integrations,
- real MCP network transports,
- production-grade sandboxing,
- full LLM planning engine,
- full incident-to-PR runner,
- final protocol spec,
- final brand/name.

## README Expectations

The README should open with:

> A compatible replacement for MCP's flat tool-list experience.

Explain in plain English:

- MCP exposes tools.
- Too many tools overwhelm agents.
- This project turns tool piles into capabilities.
- Capabilities are easier for agents to choose, safer to permission, and easier for developers to debug.

Include:

- the thesis line,
- quickstart commands,
- MCP tax meter example output,
- benchmark table,
- local 10-server demo explanation,
- compatibility path,
- v1 scope,
- out-of-scope items,
- long-term protocol/runtime vision,
- clear statement that the final name is not chosen yet.

## Verification Expectations

Before saying work is done, verify with the best available method:

- run unit tests,
- run type checks,
- run lint if configured,
- run the local demo CLI,
- inspect generated artifacts if any,
- check that no secrets or local machine config were committed.

If a verification cannot be run, say exactly why.

## Safety With Broad Access

Even if the user grants full access, stay inside this project folder except for normal Git, GitHub, and package-manager operations needed for this repository.

Do not modify:

- other projects,
- home directory config,
- global machine settings,
- credentials,
- keychains,
- shell profiles,
- unrelated files.

Do not run:

- `rm -rf`,
- `git reset --hard`,
- force-push,
- history rewrite,
- unmerged branch deletion,
- credential deletion,
- production-key changes,
- broad `chmod` or `chown`,
- destructive cleanup.

Do not print or commit:

- secrets,
- tokens,
- `.env` files,
- private keys,
- certificates,
- private local config.

If an unsafe action would be needed, skip it and document the exact next step.

## Git And GitHub

This is intended to become a public open-source repository.

Before committing or pushing:

- run `git status`,
- inspect the diff,
- stage only intended files,
- check for secrets,
- use a clear commit message.

Do not force-push, rewrite history, delete unmerged/shared branches, or expose secrets.

## Product Voice

Be bold, but accurate.

Good framing:

- "MCP made tools callable. This makes capabilities usable."
- "Stop handing agents a pile of tools."
- "Turn MCP servers into a capability runtime."
- "Compatible with today's MCP servers; designed for tomorrow's agent capabilities."

Avoid:

- claiming to replace MCP entirely on day one,
- pretending this is a finished standard,
- choosing a name too early,
- copying existing gateway/compressor/context projects,
- overpromising production security.
