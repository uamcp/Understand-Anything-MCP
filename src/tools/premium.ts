import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getGraph } from "../services/understand.js";
import { getCallers, getImpactAnalysis } from "../services/graph.js";
import { validateLicense } from "../services/license.js";
import { READONLY } from "../utils/annotations.js";

export function registerPremiumTools(server: McpServer) {
    server.tool(
        "ua_find_callers",
        "Find all callers of a specific function or file up to a certain depth. Helps trace execution paths.",
        {
            target: z.string().describe("Required. The target file or function ID (e.g., 'src/api/handler.ts' or 'func:processData')."),
            maxDepth: z.number().optional().describe("Optional. Maximum search depth. Defaults to 2 (max 3).")
        },
        READONLY,
        async ({ target, maxDepth }) => {
            const license = await validateLicense();
            if (license.tier !== 'Pro' && license.tier !== 'Team') {
                return { content: [{ type: "text", text: "This tool requires a Pro tier license." }], isError: true };
            }

            const graph = getGraph();
            if (!graph) return { content: [{ type: "text", text: "No graph loaded." }] };

            const callers = getCallers(graph, target, maxDepth || 2);
            return {
                content: [{ type: "text", text: `Callers of ${target} (Depth ${maxDepth || 2}):\n- ${callers.join('\n- ') || 'None found'}` }]
            };
        }
    );

    server.tool(
        "ua_impact_analysis",
        "Analyze the downstream impact of changing a specific file. Returns a list of files that depend on it.",
        {
            target: z.string().describe("Required. The file being modified (e.g., 'src/core/types.ts').")
        },
        READONLY,
        async ({ target }) => {
            const license = await validateLicense();
            if (license.tier !== 'Pro' && license.tier !== 'Team') {
                return { content: [{ type: "text", text: "This tool requires a Pro tier license." }], isError: true };
            }

            const graph = getGraph();
            if (!graph) return { content: [{ type: "text", text: "No graph loaded." }] };

            const impacted = getImpactAnalysis(graph, target);
            return {
                content: [{ type: "text", text: `Impact Analysis for ${target}:\nFiles potentially affected:\n- ${impacted.join('\n- ') || 'None'}` }]
            };
        }
    );
}
