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
