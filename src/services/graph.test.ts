import { getOneHopNeighbors, getCallers, getImpactAnalysis, getAggregatedStats } from './graph.js';
import { describe, it, expect } from 'vitest';

describe('Graph Retrieval Algorithms', () => {
    const mockGraphEdges = {
        nodes: [
            { id: 'A' }, { id: 'B' }, { id: 'C' }, { id: 'D' }, { id: 'E' }
        ],
        edges: [
            { source: 'A', target: 'B' },
            { source: 'B', target: 'C' },
            { source: 'C', target: 'D' },
            { source: 'D', target: 'E' },
            { source: 'A', target: 'C' }
        ]
    };

    const mockGraphFiles = {
        files: {
            'A': { imports: ['B', 'C'] },
            'B': { imports: ['C'] },
            'C': { imports: ['D'] },
            'D': { imports: ['E'] },
            'E': { imports: [] }
        }
    };

    it('getOneHopNeighbors works with edges array', () => {
        const result = getOneHopNeighbors(mockGraphEdges, 'B');
        expect(result.incoming).toContain('A');
        expect(result.outgoing).toContain('C');
    });

    it('getOneHopNeighbors works with files record', () => {
        const result = getOneHopNeighbors(mockGraphFiles, 'B');
        expect(result.incoming).toContain('A');
        expect(result.outgoing).toContain('C');
    });

    it('getCallers gets up to 2 hops by default', () => {
        // C is called by A and B. B is called by A.
        // Callers of C: 1 hop -> A, B
        // Callers of C: 2 hop -> Callers of B (A), Callers of A (none)
        const result = getCallers(mockGraphEdges, 'C');
        expect(result).toContain('A');
        expect(result).toContain('B');
        expect(result.length).toBe(2);
    });

    it('getCallers respects maxHops', () => {
        // Callers of D: 1 hop -> C
        // Callers of D: 2 hop -> A, B
        // Callers of D: 3 hop -> A
        const result = getCallers(mockGraphEdges, 'D', 1);
        expect(result).toContain('C');
        expect(result.length).toBe(1);

        const result2 = getCallers(mockGraphEdges, 'D', 2);
        expect(result2).toContain('C');
        expect(result2).toContain('B');
        expect(result2).toContain('A');
    });

    it('getImpactAnalysis gets all reverse dependencies', () => {
        // Impact of E -> D -> C -> B, A
        const result = getImpactAnalysis(mockGraphEdges, 'E');
        expect(result).toContain('D');
        expect(result).toContain('C');
        expect(result).toContain('B');
        expect(result).toContain('A');
        expect(result.length).toBe(4);
    });

    it('getAggregatedStats calculates totals correctly', () => {
        const statsEdges = getAggregatedStats(mockGraphEdges);
        expect(statsEdges.totalNodes).toBe(5);
        expect(statsEdges.totalEdges).toBe(5);

        const statsFiles = getAggregatedStats(mockGraphFiles);
        expect(statsFiles.totalNodes).toBe(5);
        expect(statsFiles.totalEdges).toBe(5);
    });
});
