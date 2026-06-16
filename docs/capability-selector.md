# Capability Selector

The selector is the v0.4 proof that the capability surface is not only smaller than raw tools, but also task-scoped.

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

## Conservative Defaults

The selector defaults to:

- `--max-permission read`
- `--max-risk medium`
- `--limit 5`

That means write, execute, admin, and high-risk capabilities are not selected unless the caller explicitly raises the ceiling.

## What The Receipt Shows

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

The JSON receipt is deterministic and local. It is not a runtime proof trail yet; it is the first selection receipt that shows what the runtime would expose before any tool execution exists.

## Scope

This selector does not call an LLM, execute tools, connect to real MCP transports, or authenticate to SaaS services. It uses deterministic keyword and context matching so the behavior is easy to inspect and test.

Future versions can replace or augment the scoring policy, but the contract should stay centered on the same questions: what the agent should see, what it may do, what context is missing, and what proof it should return.
