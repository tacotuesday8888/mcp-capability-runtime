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

In v0.4, capabilities can be selected for one task without exposing the whole surface.

The selector request includes:

- task text
- provided context
- maximum permission level
- maximum risk level
- result limit

The selector returns a dry-run receipt with:

- selected capability IDs
- blocked capability IDs and reasons
- missing required context
- matched task terms
- expected proof returned
- exposed underlying tool IDs
- estimated prompt-token cost of the selected surface

The default permission ceiling is `read`, and the default risk ceiling is `medium`. That keeps the first selector conservative: write, execute, admin, and high-risk capabilities must be explicitly allowed before they can appear in the selected surface.
