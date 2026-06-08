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
