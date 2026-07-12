import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import axios from "axios";
import { config } from "../config.js";
import { requireTier } from "../services/license.js";
import { getGraph } from "../services/understand.js";

export function registerPremiumTools(server: McpServer) {
    server.tool(
        "ua_find_callers",
        "Find callers (reverse dependencies) of a specific file or module up to 2 hops (Pro Tier)",
        {
            target: z.string().describe("The file or module to find callers for"),
            maxHops: z.number().optional().describe("Maximum number of hops (default 2, up to 2 hops supported for callers)")
        },
        async ({ target, maxHops }) => {
            if (!(await requireTier('Pro'))) {
                throw new Error('ua_find_callers requires a Pro tier license.');
            }
            const graph = getGraph();
            try {
                const response = await axios.post(`${config.apiUrl}/analyze/find-callers`, 
                    { data: { target, maxHops, graph } },
                    { headers: { 'x-license-key': config.licenseKey } }
                );
                return {
                    content: [{ type: "text", text: `Backend result: ${JSON.stringify(response.data, null, 2)}` }]
                };
            } catch (error: any) {
                return {
                    content: [{ type: "text", text: `Backend analysis failed: ${error.response?.data?.detail || error.message}` }],
                    isError: true,
                };
            }
        }
    );

    server.tool(
        "ua_impact_analysis",
        "Analyze the impact of changing a file by finding all transitive reverse dependencies (Pro Tier)",
        {
            target: z.string().describe("The file or module to analyze for impact")
        },
        async ({ target }) => {
            if (!(await requireTier('Pro'))) {
                throw new Error('ua_impact_analysis requires a Pro tier license.');
            }
            const graph = getGraph();
            try {
                const response = await axios.post(`${config.apiUrl}/analyze/impact-analysis`, 
                    { data: { target, graph } },
                    { headers: { 'x-license-key': config.licenseKey } }
                );
                return {
                    content: [{ type: "text", text: `Backend result: ${JSON.stringify(response.data, null, 2)}` }]
                };
            } catch (error: any) {
                return {
                    content: [{ type: "text", text: `Backend analysis failed: ${error.response?.data?.detail || error.message}` }],
                    isError: true,
                };
            }
        }
    );
}
