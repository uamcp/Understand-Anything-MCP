import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getGraph } from "../services/understand.js";
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
        "Checks whether a graph is currently loaded.",
        {},
        async () => {
            const graph = getGraph();
            if (graph) {
                return {
                    content: [{ type: "text", text: "A knowledge graph is currently loaded and active." }]
                };
            } else {
                return {
                    content: [{ type: "text", text: "Knowledge graph not found. Please ask the user to run `npx @egonex/understand-anything` in their project directory to generate it, then run ua_scan again." }]
                };
            }
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
            const graph = getGraph();
            if (!graph) return { content: [{ type: "text", text: "No graph loaded." }] };
            
            const stats = getAggregatedStats(graph);
            
            // Extract top-level directories
            const topDirs = new Set<string>();
            Object.keys(graph.nodes || {}).forEach(nodeId => {
                if (nodeId.startsWith('file:')) {
                    const filePath = nodeId.substring(5);
                    const dir = filePath.split('/')[0];
                    if (dir && !dir.includes('.')) topDirs.add(dir);
                }
            });
            
            const doc = [
                `# Project Onboarding Overview`,
                `\n## Scale and Complexity`,
                `- **Total Nodes (Files/Functions):** ${stats.totalNodes}`,
                `- **Total Dependencies:** ${stats.totalEdges}`,
                `\n## Primary Architecture`,
                `The codebase is primarily structured around these top-level directories:`,
                Array.from(topDirs).map(d => `- **${d}/**`).join('\n') || '- (Flat structure)',
                `\n## How to proceed`,
                `Use the \`ua_architecture_report\` tool to understand module boundaries, and \`ua_impact_analysis\` to see what your changes will affect before making them.`
            ].join('\n');

            return {
                content: [{ type: "text", text: doc }]
            };
        }
    );
}
