# Capability Selector

The selector is the proof that the capability surface is not only smaller than raw tools, but also task-scoped.

In plain English: instead of handing an agent every capability up front, the selector asks, "For this task, with this context, and under this permission limit, what should the agent see now?"

## Run It

```bash
npm run demo:select
```

Or pass the command directly:

```bash
npm run build
node dist/src/cli.js select --demo \
  --task "Investigate checkout 500s from the last 30 minutes" \
  --context service=checkout \
  --context timeWindow=30m \
  --context symptom=500
```

Run the same selector against the external JSON example:

```bash
npm run example:select
```

## Conservative Defaults

The selector defaults to:

- `--max-permission read`
- `--max-risk medium`
- `--limit 5`

That means write, execute, admin, and high-risk capabilities are not selected unless the caller explicitly raises the ceiling.

## Surface And Receipt

The JSON output separates two concerns:

- `surface`: the agent-facing capabilities for this task. It contains capability contract fields such as `description`, `intent`, `whenToUse`, `requiredContext`, permission, risk, proof, and examples. It does not expose blocked capability tools.
- `receipt`: the developer-facing audit trail. It contains selected IDs, selected decision details, blocked reasons, exposed underlying tools for selected capabilities, selected prompt-token estimate, and `toolsExecuted: false`.

The older top-level fields remain for now so early callers can migrate gradually.

## What The Text Report Shows

The text report shows:

- selected capabilities
- matched task terms
- missing required context
- capabilities blocked by permission or risk policy
- expected proof returned by selected capabilities
- estimated prompt-token cost of the selected surface
- exposed underlying tool IDs
- a dry-run note confirming no tools were executed

For machine-readable output:

```bash
node dist/src/cli.js select --demo \
  --task "Investigate checkout 500s" \
  --context service=checkout \
  --context timeWindow=30m \
  --context symptom=500 \
  --json
```

The JSON selection report is deterministic and local. It is not a runtime proof trail yet; it includes the first selection receipt that shows what the runtime would expose before any tool execution exists.

That receipt can now feed `planCapabilityInvocation`, which builds a local invocation plan for one selected capability. The planner checks that a capability was selected and that every requested tool belongs to that selected capability and was exposed by the receipt. It still returns `toolsExecuted: false`.

## Scope

This selector does not call an LLM, execute tools, connect to real MCP transports, or authenticate to SaaS services. It uses deterministic keyword and context matching so the behavior is easy to inspect and test.

Future versions can replace or augment the scoring policy, but the contract should stay centered on the same questions: what the agent should see, what it may do, what context is missing, and what proof it should return.
