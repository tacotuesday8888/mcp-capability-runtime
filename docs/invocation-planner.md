# Invocation Planner

The invocation planner is the handoff between selection and future execution.

Selection answers: "What should the agent see for this task?"

Invocation planning answers: "Which raw tool routes are allowed for this selected capability?"

## Run The Walkthrough

```bash
npm run demo:walkthrough
```

The walkthrough is local and deterministic. It shows:

- the raw 40-tool tax
- the cleaned 8-capability surface
- the selected incident-triage capability
- the routeable tool plan for that capability
- a write capability blocked by the default read policy

No real tools run.

## Framework API

```ts
import {
  planCapabilityInvocation,
  selectCapabilities,
} from "mcp-capability-runtime";

const selected = selectCapabilities(capabilities, {
  task: "Investigate checkout 500s",
  context: ["service=checkout", "timeWindow=30m", "symptom=500"],
});

const plan = planCapabilityInvocation({
  servers,
  capabilities,
  receipt: selected.receipt,
  capabilityId: "triage-production-incident",
});
```

The plan includes `allowedToolRoutes`, `proofRequired`, typed `issues`, and `toolsExecuted: false`.

The planner rejects:

- capabilities that were not selected
- requested tools outside the selected capability
- tools not exposed by the selection receipt
- stale or invalid tool surfaces
- missing capabilities or missing tools

This is not production sandboxing. It is the smallest deterministic proof that the runtime can keep raw tool routing scoped to selected capabilities.
