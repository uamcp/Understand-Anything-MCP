
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from 'zod';
import { requireTier } from '../services/license.js';
import { getImpactAnalysis } from "../services/graph.js";
import { normalizeNodeId, validateComplexity } from "../services/validation.js";
import { parseDiff } from "../cli.js";
import { getGraph } from "../services/understand.js";

export function registerCiTools(server: McpServer) {
  server.tool(
    'ua_ci_check',
    'Analyzes PR diff impact using the graph. (Pro tier only)',
    {
      pr_diff: z.string().describe('The Git diff of the Pull Request.')
    },
    async ({ pr_diff }) => {
      if (!(await requireTier('Pro'))) {
        return { content: [{ type: 'text', text: 'This tool requires a Pro tier license.' }], isError: true };
      }

      const graph = getGraph();
      if (!graph) {
          return { content: [{ type: 'text', text: 'No knowledge graph is loaded.' }], isError: true };
      }

      try {
        const changedFiles = parseDiff(pr_diff);
        const impactedFiles = Array.from(new Set(
            changedFiles.flatMap(file => getImpactAnalysis(graph, file))
        ));

        // Note: Full risk escalation (critical-path rules) is handled by the cli.ts gateway, 
        // this tool provides the raw impact overview for the agent's context.
        return {
          content: [{ type: 'text', text: JSON.stringify({ 
              analyzed_files: changedFiles, 
              impact_level: impactedFiles.length > 5 ? "HIGH" : "LOW", 
              impacted: impactedFiles 
          }, null, 2) }],
        };
      } catch (error: any) {
         return {
          content: [{ type: 'text', text: `Analysis failed: ${error.message}` }],
          isError: true,
        };
      }
    }
  );

  server.tool(
    'ua_validate_graph',
    'Validate the knowledge graph structure (Pro tier only)',
    {
      graphData: z.string().describe('The JSON string of the graph data to validate')
    },
    async ({ graphData }) => {
      if (!(await requireTier('Pro'))) {
        return { content: [{ type: 'text', text: 'This tool requires a Pro tier license.' }], isError: true };
      }

      try {
        const graph = JSON.parse(graphData);
        let valid_nodes = 0;
        let invalid_nodes = 0;
        const errors: string[] = [];

        if (Array.isArray(graph.nodes)) {
            for (const node of graph.nodes) {
                try {
                    if (!node.id) throw new Error("Node is missing id");
                    normalizeNodeId(node.id);
                    if (node.complexity) validateComplexity(node.complexity);
                    valid_nodes++;
                } catch (e: any) {
                    invalid_nodes++;
                    errors.push(e.message);
                }
            }
        }

        return {
          content: [{ type: 'text', text: JSON.stringify({ 
              valid_nodes, 
              invalid_nodes, 
              errors: errors.slice(0, 5) 
          }, null, 2) }],
        };
      } catch (error: any) {
        return {
          content: [{ type: 'text', text: `Validation failed: ${error.message}` }],
          isError: true,
        };
      }
    }
  );
}
