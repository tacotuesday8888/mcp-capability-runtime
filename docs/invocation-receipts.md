# Invocation Receipts

Invocation receipts are the v0.7 proof boundary.

Selection answers: "What should the agent see?"

Invocation planning answers: "Which raw tool routes are allowed?"

Invocation receipt recording answers: "What supplied local results came back, and did they satisfy the required proof?"

## Run The Demo

```bash
npm run demo:receipt
npm run demo:receipt:json
```

The demo is local and deterministic. It records fake fixture results for `triage-production-incident` and returns:

- planned tool IDs
- attempted tool IDs
- executed local fixture routes
- per-tool result summaries
- proof values in capability proof order
- missing proof labels
- changed resources
- typed receipt issues
- `toolsExecuted: true`

No real MCP servers, SaaS accounts, credentials, network transports, or production tools are used.

## Framework API

```ts
import {
  demoInvocationToolResults,
  recordCapabilityInvocation,
} from "mcp-capability-runtime";

const receipt = recordCapabilityInvocation({
  plan,
  source: "local-fixture",
  results: demoInvocationToolResults,
});
```

`recordCapabilityInvocation` is a pure function. It does not call tools. The caller supplies local results, and the function validates those results against the invocation plan.

## Validation Rules

The receipt is invalid when:

- the invocation plan is invalid
- a result is supplied for a tool outside the plan
- a planned tool returns more than one result
- a planned tool does not return a result
- a planned tool returns `status: "error"`
- required proof is missing or blank

The receipt keeps deterministic order:

- planned and executed routes follow `plan.allowedToolRoutes`
- proof entries follow `plan.proofRequired`
- unplanned tool proof is ignored and never copied into the receipt

## Changed Resources

The read-only incident demo returns `changedResources: []`.

The type allows caller-supplied local results to report changed resources later, but v0.7 does not run write tools and does not build the incident-to-PR runner.

## Boundary

This is not production sandboxing, not real MCP execution, and not a full workflow engine. It is the smallest local proof that a capability runtime can connect selected capability context, allowed routes, attempted local results, and returned proof in one receipt.
