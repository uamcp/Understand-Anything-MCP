import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getGraph, forceScan } from "../services/understand.js";
import { getAggregatedStats, getOneHopNeighbors } from "../services/graph.js";

export function registerCoreTools(server: McpServer) {
    server.tool(
        "ua_status",
        "Get the status of Understand-Anything MCP",
        {},
        async () => {
            const graph = getGraph();
            return {
                content: [{ type: "text", text: `Status: OK. Graph loaded: ${!!graph}` }]
            };
        }
    );

    server.tool(
        "ua_scan",
        "Scan the workspace and update the knowledge graph",
        {},
        async () => {
            await forceScan();
            return {
                content: [{ type: "text", text: "Scan completed and knowledge graph reloaded successfully." }]
            };
        }
    );

    server.tool(
        "ua_graph_summary",
        "Get a summary of the knowledge graph",
        {},
        async () => {
            const graph = getGraph();
            if (!graph) {
                return { content: [{ type: "text", text: "No graph loaded." }] };
            }
            const stats = getAggregatedStats(graph);
            return {
                content: [{ type: "text", text: `Graph has ${stats.totalNodes} nodes and ${stats.totalEdges} edges.` }]
            };
        }
    );

    server.tool(
        "ua_architecture_report",
        "Generate an architecture report based on the knowledge graph",
        {},
        async () => {
            const graph = getGraph();
            if (!graph || !graph.files) return { content: [{ type: "text", text: "No graph loaded." }] };
            
            const directories: Record<string, number> = {};
            for (const file of Object.keys(graph.files)) {
                const dir = file.substring(0, file.lastIndexOf('/')) || '/';
                directories[dir] = (directories[dir] || 0) + 1;
            }
            
            const sortedDirs = Object.entries(directories).sort((a, b) => b[1] - a[1]);
            const report = sortedDirs.map(([dir, count]) => `- ${dir}: ${count} files`).join('\n');
            
            return {
                content: [{ type: "text", text: `Architecture Report (Module Groupings):\n\n${report}` }]
            };
        }
    );

    server.tool(
        "ua_dependency_report",
        "Generate a dependency report based on the knowledge graph",
        {},
        async () => {
            const graph = getGraph();
            if (!graph || !graph.files) return { content: [{ type: "text", text: "No graph loaded." }] };
            
            const fanIn: Record<string, number> = {};
            for (const [file, data] of Object.entries(graph.files)) {
                if (Array.isArray((data as any).imports)) {
                    for (const imp of (data as any).imports) {
                        fanIn[imp] = (fanIn[imp] || 0) + 1;
                    }
                }
            }
            
            const sortedFanIn = Object.entries(fanIn).sort((a, b) => b[1] - a[1]).slice(0, 10);
            const report = sortedFanIn.map(([file, count]) => `- ${file}: Depended on by ${count} files`).join('\n');
            const stats = getAggregatedStats(graph);
            
            return {
                content: [{ type: "text", text: `Dependency Report:\nTotal edges: ${stats.totalEdges}\n\nMost Depended-On Files:\n${report}` }]
            };
        }
    );

    server.tool(
        "ua_explain",
        "Explain a specific part of the codebase",
        {
            target: z.string().describe("The file or module to explain")
        },
        async ({ target }) => {
            const graph = getGraph();
            if (!graph) {
                return { content: [{ type: "text", text: "No graph loaded." }] };
            }
            const neighbors = getOneHopNeighbors(graph, target);
            return {
                content: [{ type: "text", text: `Explanation for ${target}.\n\nIncoming dependencies (Callers):\n- ${neighbors.incoming.join('\n- ') || 'None'}\n\nOutgoing dependencies (Callees):\n- ${neighbors.outgoing.join('\n- ') || 'None'}` }]
            };
        }
    );

    server.tool(
        "ua_onboarding_doc",
        "Generate an onboarding document for the project",
        {},
        async () => {
            return {
                content: [{ type: "text", text: "Onboarding document (stubbed)." }]
            };
        }
    );
}
