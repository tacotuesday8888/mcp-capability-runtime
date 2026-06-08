export function estimatePromptTokens(value: string | string[]): number {
  const parts = Array.isArray(value) ? value : [value];
  const text = parts.join("\n").trim();

  if (text.length === 0) {
    return 0;
  }

  const chunks = text.match(/[A-Za-z0-9_.:/-]+|[^\sA-Za-z0-9_.:/-]/g) ?? [];
  const structuralCost = Array.isArray(value) ? Math.max(0, parts.length - 1) : 0;

  return Math.ceil(chunks.length * 1.15) + structuralCost;
}
