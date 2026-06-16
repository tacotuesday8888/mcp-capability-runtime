# MCP Tax Meter

The MCP tax meter compares a raw tool surface with a cleaned capability surface.

It reports:

- raw tool count
- capability count
- estimated prompt-token cost for each surface
- risky raw tools
- risky capabilities
- noisy raw tools
- duplicate tool groups
- reduction percentages

When no capability surface is provided, the tax meter runs in raw-only mode. Raw-only mode reports the raw surface and duplicate/noisy/risky tool signals, but it does not invent reduction numbers.

## Run It

Requires Node.js 22 or newer.

Run the built-in demo comparison:

```bash
npm run demo:tax
```

Run a static external comparison:

```bash
npm run example:tax
```

Run a raw-only external surface:

```bash
npm run raw:tax
```

## Token Heuristic

The prompt-token estimate is deterministic and intentionally simple:

1. Join the metadata fields that an agent would usually see.
2. Count word-like chunks and punctuation-like chunks.
3. Multiply by `1.15`.
4. Add a small structural cost for arrays.
5. Round up.

This is not a tokenizer. It is a repeatable prompt-budget proxy that makes the cost of a large raw tool list visible.

## Risk Heuristic

An entry is counted as risky when either condition is true:

- `permissionLevel` is `admin`
- `riskLevel` is `high`

This keeps the first demo easy to understand. Future versions can support richer risk policies.

## Capability Audit

When capabilities are present, the input loader checks more than field names. It audits the capability surface against the raw tools before the tax meter runs.

The audit rejects duplicate IDs, missing `underlyingTools`, empty required capability arrays, and capabilities that understate the highest permission or risk level of the tools they wrap. This matters because the tax meter should compare an honest capability surface, not one that hides dangerous tools behind friendly wording.

## Package Check

`npm run pack:check` runs `npm pack --dry-run --json`. It shows what would be included in the npm package without publishing anything.

## Next Step: Selection

The tax meter measures the full raw surface against the full capability surface. The selector narrows that capability surface for one task under an explicit permission and risk policy.

Run:

```bash
npm run demo:select
```

See [capability-selector.md](./capability-selector.md) for the task-scoped selector and dry-run receipt.
