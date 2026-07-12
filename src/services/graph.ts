export interface KnowledgeGraph {
    nodes?: Array<{ id: string; [key: string]: any }>;
    edges?: Array<{ source: string; target: string; [key: string]: any }>;
    files?: Record<string, { imports?: string[], [key: string]: any }>;
}

/**
 * Normalizes graph access to get all outgoing edges (dependencies) for a target node.
 */
function getOutgoingEdges(graph: any, target: string): string[] {
    if (!graph) return [];
    const deps = new Set<string>();
    
    if (Array.isArray(graph.edges)) {
        for (const edge of graph.edges) {
            if (edge.source === target) {
                deps.add(edge.target);
            }
        }
    } else if (graph.files && graph.files[target] && Array.isArray(graph.files[target].imports)) {
        for (const imp of graph.files[target].imports) {
            deps.add(imp);
        }
    }
    
    return Array.from(deps);
}

/**
 * Normalizes graph access to get all incoming edges (callers/reverse dependencies) for a target node.
 */
function getIncomingEdges(graph: any, target: string): string[] {
    if (!graph) return [];
    const revDeps = new Set<string>();
    
    if (Array.isArray(graph.edges)) {
        for (const edge of graph.edges) {
            if (edge.target === target) {
                revDeps.add(edge.source);
            }
        }
    } else if (graph.files) {
        for (const [fileId, fileData] of Object.entries(graph.files)) {
            const data = fileData as any;
            if (Array.isArray(data.imports) && data.imports.includes(target)) {
                revDeps.add(fileId);
            }
        }
    }
    
    return Array.from(revDeps);
}

/**
 * Returns 1-hop neighbors (both incoming and outgoing).
 */
export function getOneHopNeighbors(graph: any, target: string): { incoming: string[]; outgoing: string[] } {
    return {
        incoming: getIncomingEdges(graph, target),
        outgoing: getOutgoingEdges(graph, target)
    };
}

/**
 * Returns callers up to maxHops (default 2).
 */
export function getCallers(graph: any, target: string, maxHops: number = 2): string[] {
    const visited = new Set<string>();
    const result = new Set<string>();
    
    let currentLevel = [target];
    
    for (let hop = 0; hop < maxHops; hop++) {
        const nextLevel = new Set<string>();
        for (const node of currentLevel) {
            if (visited.has(node)) continue;
            visited.add(node);
            
            const callers = getIncomingEdges(graph, node);
            for (const caller of callers) {
                result.add(caller);
                nextLevel.add(caller);
            }
        }
        currentLevel = Array.from(nextLevel);
        if (currentLevel.length === 0) break;
    }
    
    return Array.from(result);
}

/**
 * Returns all reverse dependencies recursively (impact analysis).
 */
export function getImpactAnalysis(graph: any, target: string): string[] {
    const result = new Set<string>();
    const queue = [target];
    
    while (queue.length > 0) {
        const node = queue.shift()!;
        const callers = getIncomingEdges(graph, node);
        
        for (const caller of callers) {
            if (!result.has(caller)) {
                result.add(caller);
                queue.push(caller);
            }
        }
    }
    
    return Array.from(result);
}

/**
 * Returns aggregated stats for graph summaries.
 */
export function getAggregatedStats(graph: any): { totalNodes: number; totalEdges: number } {
    let totalNodes = 0;
    let totalEdges = 0;
    
    if (graph) {
        if (Array.isArray(graph.nodes)) {
            totalNodes = graph.nodes.length;
        } else if (graph.files) {
            totalNodes = Object.keys(graph.files).length;
        }
        
        if (Array.isArray(graph.edges)) {
            totalEdges = graph.edges.length;
        } else if (graph.files) {
            for (const fileData of Object.values(graph.files)) {
                const data = fileData as any;
                if (Array.isArray(data.imports)) {
                    totalEdges += data.imports.length;
                }
            }
        }
    }
    
    return { totalNodes, totalEdges };
}
