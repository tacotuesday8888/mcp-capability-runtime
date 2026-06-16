A compatible replacement for MCP's flat tool-list experience.

MCP made tools callable. This project makes capabilities understandable, selectable, permissioned, runnable, and provable.

Today an agent can receive a flat pile of tools from many MCP servers. Some tools are useful, some are duplicates, and some are risky actions the agent should not see until the moment is right. This project turns that pile into a smaller capability surface: clearer choices, clearer permissions, and clearer proof of what happened.

The current repository name, `mcp-capability-runtime`, is temporary. The final name is not chosen yet.

## Quickstart

Requires Node.js 22 or newer.

```bash
npm install
npm test
npm run demo:walkthrough
npm run demo:receipt
npm run demo:receipt:json
npm run demo:tax
npm run demo:select
npm run example:tax
npm run example:select
npm run raw:tax
npm run pack:check
```

The walkthrough, selector, receipt demo, external JSON examples, and package dry-run are local and deterministic. They do not need SaaS accounts, API keys, real credentials, a live LLM, real MCP transports, or real production tool execution.

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

Run the one-command walkthrough first if you want the staged story:

```bash
npm run demo:walkthrough
```

It shows the raw 40-tool tax, the cleaned 8-capability surface, the selected incident-triage capability, the allowed local invocation plan, a deterministic local proof receipt, and a blocked write action. The receipt records fake local fixture results only; it does not execute real MCP tools.

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

Selected capabilities    1 of 8 (~99 prompt tokens, 5 underlying tools)
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

By default, selection is conservative: permission is capped at `read`, risk is capped at `medium`, and no tools run. The machine-readable result now separates two views:

- `surface`: the agent-facing capability surface for the current task
- `receipt`: the developer-facing audit trail explaining selected decision details, blocking, exposed tools, token estimate, and the fact that no tools ran

See [docs/capability-selector.md](docs/capability-selector.md) for selector options and JSON selection report output.

## Invocation Planning

Selection says what the agent should see. Invocation planning says which selected tools are routeable for one selected capability.

```ts
import {
  demoCapabilities,
  demoServers,
  planCapabilityInvocation,
  selectCapabilities,
} from "mcp-capability-runtime";

const selected = selectCapabilities(demoCapabilities, {
  task: "Investigate checkout 500s",
  context: ["service=checkout", "timeWindow=30m", "symptom=500"],
});

const plan = planCapabilityInvocation({
  servers: demoServers,
  capabilities: demoCapabilities,
  receipt: selected.receipt,
  capabilityId: "triage-production-incident",
});

console.log(plan.allowedToolRoutes.map((route) => route.toolId));
console.log(plan.toolsExecuted); // false
```

The planner rejects blocked capabilities, stale receipts, missing tools, and tool IDs outside the selected capability. It is still a local guardrail and routing plan, not production sandboxing and not real MCP execution.

## Local Invocation Receipts

Invocation planning says which routes are allowed. Local receipt recording says what supplied fixture results proved.

```bash
npm run demo:receipt
npm run demo:receipt:json
```

The v0.7 receipt demo records deterministic fake results for `triage-production-incident`. It returns the planned tool IDs, attempted tool IDs, per-tool result summaries, required proof values, missing proof, changed resources, typed issues, and `toolsExecuted: true`.

```ts
import {
  createDemoInvocationReceipt,
  recordCapabilityInvocation,
  demoInvocationToolResults,
} from "mcp-capability-runtime";

const demoReceipt = createDemoInvocationReceipt();
console.log(demoReceipt.proof.map((entry) => entry.label));

// Use the CapabilityInvocationPlan from the planning step above.
const receipt = recordCapabilityInvocation({
  plan,
  source: "local-fixture",
  results: demoInvocationToolResults,
});
```

`recordCapabilityInvocation` is pure. It validates caller-supplied local results against a valid invocation plan. It rejects invalid plans, unplanned tool results, duplicate tool results, missing planned tool results, failed tool results, and missing required proof. It does not call tools, open network transports, authenticate to SaaS, or sandbox production actions.

See [docs/invocation-receipts.md](docs/invocation-receipts.md) for the receipt contract and failure behavior.

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
  createDemoInvocationReceipt,
  computeTaxMeter,
  demoCapabilities,
  demoServers,
  planCapabilityInvocation,
  renderTaxMeterReport,
  selectCapabilities,
} from "mcp-capability-runtime";

const report = computeTaxMeter(demoServers, demoCapabilities);
const selected = selectCapabilities(demoCapabilities, {
  task: "Investigate checkout 500s",
  context: ["service=checkout", "timeWindow=30m", "symptom=500"],
});

console.log(renderTaxMeterReport(report));
console.log(selected.surface.capabilities.map((capability) => capability.id));
console.log(selected.receipt.selectedCapabilityIds);
const plan = planCapabilityInvocation({
  servers: demoServers,
  capabilities: demoCapabilities,
  receipt: selected.receipt,
  capabilityId: "triage-production-incident",
});
console.log(plan.allowedToolRoutes);
console.log(createDemoInvocationReceipt().proof);
```

Public exports include:

- capability and raw tool types
- the local 10-server demo fixture
- the cleaned capability surface
- semantic capability surface audit
- task-scoped capability selection with separate surface and receipt outputs
- capability invocation planning
- local simulated invocation receipt recording
- staged local walkthrough renderer
- prompt token estimation
- tax-meter calculation
- text report rendering
- external JSON input parsing and validation

## Compatibility Path

This is not a rejection of MCP. The adoption path is compatibility with today's MCP ecosystem while introducing a stronger capability contract above raw tools.

V1 uses a fake MCP-like local fixture so the core idea is easy to clone, run, and inspect. V0.2 added a static JSON input path so developers can measure non-demo tool surfaces without editing source code. V0.3 tightened that path with raw-only input, package checks, and semantic capability audits. V0.4 added task-scoped selection so a caller can expose only the capabilities that match a task, context, and permission policy. V0.5 separates the selected agent-facing surface from the developer-facing receipt. V0.6 adds a local invocation planner so selected capabilities can be converted into routeable tool plans without executing anything. V0.7 records local simulated invocation receipts from deterministic fixture results. Future versions can add read-only MCP discovery and then the fake incident-to-PR runner.

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
- separate selected surface and developer receipt outputs
- capability invocation planner
- local simulated invocation receipts
- one-command staged demo walkthrough

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

See [docs/roadmap.md](docs/roadmap.md) for the next milestones: read-only MCP discovery, the incident-to-PR runner, and naming research.

## Long-Term Direction

The long-term direction is a capability runtime where agents see the right capability at the right time, with explicit permissions, required context, and proof returned.

The practical wedge is simple: stop handing agents a pile of tools. Turn MCP servers into a capability runtime.
