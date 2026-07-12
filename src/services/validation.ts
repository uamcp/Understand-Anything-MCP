export type NodeType = 'file' | 'func' | 'class';
export type Complexity = 'simple' | 'moderate' | 'complex';

export function normalizeNodeId(id: string, defaultType: NodeType = 'file'): string {
    const prefixes = ['file:', 'func:', 'class:'];
    for (const prefix of prefixes) {
        if (id.startsWith(prefix)) {
            return id;
        }
    }
    return `${defaultType}:${id}`;
}

export function validateComplexity(complexity: string): Complexity {
    const validComplexities: Complexity[] = ['simple', 'moderate', 'complex'];
    if (validComplexities.includes(complexity as Complexity)) {
        return complexity as Complexity;
    }
    throw new Error(`Invalid complexity: ${complexity}. Must be simple, moderate, or complex.`);
}
