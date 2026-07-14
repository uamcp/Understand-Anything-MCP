import { normalizeNodeId as coreNormalizeNodeId } from '@uamcp/core';

export type NodeType = 'file' | 'func' | 'class';
export type Complexity = 'simple' | 'moderate' | 'complex';

export function normalizeNodeId(id: string, defaultType: NodeType = 'file'): string {
    return coreNormalizeNodeId(id, defaultType);
}

export function validateComplexity(complexity: string): Complexity {
    const validComplexities: Complexity[] = ['simple', 'moderate', 'complex'];
    if (validComplexities.includes(complexity as Complexity)) {
        return complexity as Complexity;
    }
    throw new Error(`Invalid complexity: ${complexity}. Must be simple, moderate, or complex.`);
}
