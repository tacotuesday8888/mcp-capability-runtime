# Capability Contract

This first slice models a capability as the agent-facing surface above raw tools.

A capability answers five plain-English questions:

- What should the agent use this for?
- When should the agent use it?
- What context must the agent provide?
- What is the agent allowed to do?
- What proof should come back?

The TypeScript model is exported from `src/index.ts`.

```ts
interface Capability {
  id: string;
  title: string;
  description: string;
  intent: string;
  whenToUse: string;
  requiredContext: string[];
  permissionLevel: "read" | "write" | "execute" | "admin";
  riskLevel: "low" | "medium" | "high";
  underlyingTools: string[];
  proofReturned: string[];
  examples: string[];
}
```

The current demo maps 40 raw tools into 8 capabilities. The goal is not to hide everything; it is to expose the right intent, permissions, context, and proof instead of exposing every low-level action up front.

## Semantic Audit

In v0.3, the loader treats capability definitions as claims that can be checked against the raw tool surface.

When a capability surface is provided, the audit verifies that:

- server IDs, tool IDs, and capability IDs are unique
- every `underlyingTools` entry points to a real raw tool
- `permissionLevel` is at least as broad as the highest-permission tool the capability wraps
- `riskLevel` is at least as high as the highest-risk tool the capability wraps
- `requiredContext`, `underlyingTools`, `proofReturned`, and `examples` each contain at least one entry

In plain English: a capability can make a pile of tools easier for an agent to choose from, but it cannot pretend a dangerous wrapped tool is safe. If a capability wraps an `admin` or `high` risk tool, the capability must say so.

## Optional In External Input

External JSON input can omit `capabilities`. That raw-only mode is useful when someone wants to measure the current tool-list tax before designing a cleaned surface.

When `capabilities` is omitted, the tax meter reports the raw surface only and skips reduction metrics. When `capabilities` is present, the same contract above is validated before comparison.

## Selection Contract

Capabilities can be selected for one task without exposing the whole surface.

The selector request includes:

- task text
- provided context
- maximum permission level
- maximum risk level
- result limit

The selector returns an agent-facing `surface` with:

- selected capability IDs
- descriptions, intent, and when-to-use guidance
- required context
- permission and risk labels
- expected proof returned
- examples

The selector also returns a developer-facing `receipt` with:

- selected capability IDs
- selected decision details, including scores, matched task terms, required context matches, expected proof, and exposed selected tool IDs
- blocked capability IDs and reasons
- missing required context
- exposed underlying tool IDs for selected capabilities
- estimated prompt-token cost of the selected surface
- `toolsExecuted: false`

The default permission ceiling is `read`, and the default risk ceiling is `medium`. That keeps the first selector conservative: write, execute, admin, and high-risk capabilities must be explicitly allowed before they can appear in the selected surface.

## Invocation Plan Contract

The invocation planner turns a selection receipt into a local routing plan for one selected capability. It does not execute tools.

The planner request includes:

- raw MCP-like servers
- capability definitions
- a selection receipt
- the selected capability ID to invoke
- optional requested tool IDs

The planner returns:

- `mode: "capability-invocation-plan"`
- `valid`
- task and capability ID
- requested tool IDs
- allowed tool routes with tool ID, server ID, server title, permission, and risk
- required proof for the selected capability
- typed issues when a plan is rejected
- `toolsExecuted: false`

The planner rejects blocked capabilities, missing capabilities, missing tools, requested tools outside the selected capability, and tools not exposed by the selection receipt. In plain English: selection decides what the agent may see; planning proves which selected raw tool routes are allowed before anything can run.

## Invocation Receipt Contract

The invocation receipt records local, caller-supplied results for a valid invocation plan. It still does not call real MCP tools.

The receipt request includes:

- a `CapabilityInvocationPlan`
- deterministic local tool results keyed by tool ID
- an optional source label such as `local-fixture`

The receipt returns:

- `mode: "capability-invocation-receipt"`
- `valid`
- task and capability ID
- execution mode and source
- planned and attempted tool IDs
- executed route summaries
- proof values grouped by the capability's required proof labels
- missing proof labels
- changed resources
- typed issues
- `toolsExecuted`

The recorder rejects invalid plans, unplanned tool results, duplicate results, missing planned results, failed tool results, and missing required proof. It ignores unplanned proof so a caller cannot smuggle unrelated tool output into the receipt.

See [invocation-receipts.md](invocation-receipts.md) for examples and the exact boundary.
