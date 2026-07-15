const VALID_PREFIXES = new Set([
  "file", "func", "class", "module", "concept",
  "config", "document", "service", "table", "endpoint",
  "pipeline", "schema", "resource",
  "domain", "flow", "step",
]);

const TYPE_TO_PREFIX: Record<string, string> = {
  file: "file",
  function: "func",
  class: "class",
  module: "module",
  concept: "concept",
  config: "config",
  document: "document",
  service: "service",
  table: "table",
  endpoint: "endpoint",
  pipeline: "pipeline",
  schema: "schema",
  resource: "resource",
  domain: "domain",
  flow: "flow",
  step: "step",
};

function stripToValidPrefix(id: string): { prefix: string | null; path: string } {
  let remaining = id;

  while (true) {
    const colonIdx = remaining.indexOf(":");
    if (colonIdx <= 0) break;

    const segment = remaining.slice(0, colonIdx);
    if (VALID_PREFIXES.has(segment)) {
      const rest = remaining.slice(colonIdx + 1);
      const innerColonIdx = rest.indexOf(":");
      if (innerColonIdx > 0 && VALID_PREFIXES.has(rest.slice(0, innerColonIdx))) {
        remaining = rest;
        continue;
      }
      return { prefix: segment, path: rest };
    }
    remaining = remaining.slice(colonIdx + 1);
  }

  return { prefix: null, path: remaining };
}

export type NodeType = 'file' | 'func' | 'class';
export type Complexity = 'simple' | 'moderate' | 'complex';

export function normalizeNodeId(
  id: string,
  defaultType: NodeType = 'file'
): string {
  const trimmed = id.trim();
  if (!trimmed) return trimmed;

  // Adapt the @uamcp/core logic which expects a node object.
  // Here we just use defaultType, ensuring 'func' maps to 'function' for the lookup.
  const expectedPrefix = TYPE_TO_PREFIX[defaultType === 'func' ? 'function' : defaultType] || "file";
  const { prefix, path } = stripToValidPrefix(trimmed);

  if (prefix) {
    return `${prefix}:${path}`;
  }

  // No valid prefix found — bare path
  if (expectedPrefix) {
    return `${expectedPrefix}:${path}`;
  }

  return trimmed;
}

export function validateComplexity(complexity: string): Complexity {
    const validComplexities: Complexity[] = ['simple', 'moderate', 'complex'];
    if (validComplexities.includes(complexity as Complexity)) {
        return complexity as Complexity;
    }
    throw new Error(`Invalid complexity: ${complexity}. Must be simple, moderate, or complex.`);
}
