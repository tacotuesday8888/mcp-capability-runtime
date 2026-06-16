A compatible replacement for MCP's flat tool-list experience.

MCP made tools callable. This project makes capabilities understandable, selectable, permissioned, runnable, and provable.

Today an agent can receive a flat pile of tools from many MCP servers. Some tools are useful, some are duplicates, and some are risky actions the agent should not see until the moment is right. This project turns that pile into a smaller capability surface: clearer choices, clearer permissions, and clearer proof of what happened.

The current repository name, `mcp-capability-runtime`, is temporary. The final name is not chosen yet.

## Quickstart

Requires Node.js 22 or newer.

```bash
npm install
npm test
npm run demo:tax
npm run demo:select
npm run example:tax
npm run raw:tax
npm run pack:check
```

The demo, selector, external JSON examples, and package dry-run are local and deterministic. They do not need SaaS accounts, API keys, real credentials, a live LLM, real MCP transports, or real tool execution.

## What The Demo Shows

The local fixture imitates 10 developer-tool servers:

- error tracking and logs
- issue tracker
- source repository
- documentation
- database query
- browser testing
- deployment status
- chat and status update
- package and dependency information
- pull request output

The raw surface exposes 40 fake MCP-like tools, including duplicate search tools, noisy inventory tools, and high-risk admin actions. The cleaned surface exposes 8 capabilities that describe what the agent should do, when to use it, what context it needs, what permission level it needs, and what proof it should return.

## Example Output

```text
MCP Capability Runtime Tax Meter
================================

Raw MCP-like surface      40 tools (~1734 prompt tokens)
Capability surface        8 capabilities (~808 prompt tokens)

Tool count reduction      80%
Token estimate reduction  53%
Risky exposure reduction  89%

Risky raw tools           9
Risky capabilities        1
Noisy raw tools           8
Duplicate raw tools       12

Duplicate groups
- incident-evidence-search: chat.searchIncidentChannel, deploy.searchLogs, error.searchEvents
- release-state: deploy.getStatus, package.lookup, pr.getStatus
- runtime-state-query: db.runReadOnlyQuery, package.auditPackage
- source-evidence-search: docs.searchPages, repo.searchCode
- work-item-search: issue.searchIssues, pr.searchPullRequests
```

## Benchmark

| Surface | Count | Estimated prompt tokens | Risky entries | Notes |
| --- | ---: | ---: | ---: | --- |
| Raw MCP-like tools | 40 tools | 1734 | 9 | Includes duplicate, noisy, and admin-level tools |
| Capability surface | 8 capabilities | 808 | 1 | Groups intent, permissions, context, and proof |
| Reduction | 80% fewer entries | 53% fewer estimated tokens | 89% fewer risky entries | Deterministic local fixture |

The token estimate is a documented heuristic, not a model tokenizer. It is meant to make the tool-list tax visible and repeatable.

## Task-Scoped Selection

The tax meter shows the before/after cost of raw tools versus capabilities. The selector shows what an agent should see for one task right now.

```bash
npm run demo:select
```

Example selector output excerpt:

```text
MCP Capability Runtime Selector
===============================

Task                     Investigate checkout 500s from the last 30 minutes
Policy                   permission <= read, risk <= medium
Provided context         service=checkout; timeWindow=30m; symptom=500

Selected capabilities    1 of 8 (~110 prompt tokens, 5 underlying tools)
- triage-production-incident (read/medium, score 24)
  matched: 30, checkout, investigate, last, minutes
  proof: event ids; trace id; release id; log query; chat permalink

Blocked capabilities
- inspect-work-items: missing required context: incident keywords, repository name
- coordinate-status-update: write permission exceeds request ceiling read; missing required context: incident channel, current impact, next action, evidence links
- ...

Dry-run receipt
- selected ids: triage-production-incident
- exposed tools: chat.searchIncidentChannel, deploy.getStatus, deploy.searchLogs, error.getTrace, error.searchEvents
- no tools were executed
```

By default, selection is conservative: permission is capped at `read`, risk is capped at `medium`, and no tools run. The receipt explains which capabilities were selected, which were blocked, what context is missing, and what proof selected capabilities should return.

See [docs/capability-selector.md](docs/capability-selector.md) for selector options and JSON receipt output.

## External JSON Input

You can run the tax meter against a static, read-only MCP-like tool surface with a proposed capability surface:

```bash
npm run build
node dist/src/cli.js tax --input examples/minimal-tool-surface.json
```

You can also measure a raw-only surface before writing capabilities:

```bash
npm run raw:tax
```

Raw-only reports show the raw tool count, estimated prompt-token cost, risky tools, noisy tools, and duplicate groups. They intentionally skip reduction numbers because there is no cleaned capability surface to compare against.

The input file always contains raw MCP-like servers. The `capabilities` array is optional. When capabilities are provided, the loader validates both the JSON shape and the semantic honesty of the capability surface before running the tax meter. For example, a capability cannot claim `read` permission while wrapping an `admin` tool.

See [docs/external-input.md](docs/external-input.md) for the format and how this evolves toward real MCP server discovery.

## Framework API

```ts
import {
  computeTaxMeter,
  demoCapabilities,
  demoServers,
  renderTaxMeterReport,
  selectCapabilities,
} from "mcp-capability-runtime";

const report = computeTaxMeter(demoServers, demoCapabilities);
const selected = selectCapabilities(demoCapabilities, {
  task: "Investigate checkout 500s",
  context: ["service=checkout", "timeWindow=30m", "symptom=500"],
});

console.log(renderTaxMeterReport(report));
console.log(selected.selected.map((capability) => capability.capabilityId));
```

Public exports include:

- capability and raw tool types
- the local 10-server demo fixture
- the cleaned capability surface
- semantic capability surface audit
- task-scoped capability selection
- prompt token estimation
- tax-meter calculation
- text report rendering
- external JSON input parsing and validation

## Compatibility Path

This is not a rejection of MCP. The adoption path is compatibility with today's MCP ecosystem while introducing a stronger capability contract above raw tools.

V1 uses a fake MCP-like local fixture so the core idea is easy to clone, run, and inspect. V0.2 added a static JSON input path so developers can measure non-demo tool surfaces without editing source code. V0.3 tightened that path with raw-only input, package checks, and semantic capability audits. V0.4 adds task-scoped selection so a caller can expose only the capabilities that match a task, context, and permission policy. Future versions can add a real read-only MCP discovery adapter that reads tool metadata from existing MCP servers and then presents a capability surface to agents.

## V1 Scope

This first slice includes:

- capability model
- local 10-server MCP-like developer fixture
- cleaned capability surface
- MCP tax meter
- framework exports
- CLI demo
- README and docs
- tests
- GitHub Actions CI
- static external JSON input
- raw-only external JSON input
- semantic capability surface audit
- package dry-run check
- task-scoped selector with dry-run receipt

## Out Of Scope For V1

This repo intentionally does not yet include:

- real OAuth
- real SaaS integrations
- real MCP network transports
- production sandboxing
- full LLM planning engine
- full incident-to-PR runner
- final protocol specification
- final brand or name

## Roadmap

See [docs/roadmap.md](docs/roadmap.md) for the next milestones: read-only MCP discovery, capability router, receipts/proof, incident-to-PR runner, and naming research.

## Long-Term Direction

The long-term direction is a capability runtime where agents see the right capability at the right time, with explicit permissions, required context, and proof returned.

The practical wedge is simple: stop handing agents a pile of tools. Turn MCP servers into a capability runtime.
