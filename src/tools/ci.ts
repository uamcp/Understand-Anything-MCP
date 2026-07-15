
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from 'zod';
import { requireTier } from '../services/license.js';
import axios from 'axios';
import { config } from '../config.js';

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
        const response = await axios.post(`${config.apiUrl}/analyze/ci-check`, 
          { data: { pr_diff, graph } },
          { headers: { 'x-license-key': config.licenseKey } }
        );
        return {
          content: [{ type: 'text', text: JSON.stringify(response.data, null, 2) }],
        };
      } catch (error: any) {
         return {
          content: [{ type: 'text', text: `Backend analysis failed: ${error.response?.data?.detail || error.message}` }],
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
        const response = await axios.post(`${config.apiUrl}/analyze/validate-graph`, 
          { data: { graphData } },
          { headers: { 'x-license-key': config.licenseKey } }
        );
        return {
          content: [{ type: 'text', text: JSON.stringify(response.data, null, 2) }],
        };
      } catch (error: any) {
        return {
          content: [{ type: 'text', text: `Validation failed: ${error.response?.data?.detail || error.message}` }],
          isError: true,
        };
      }
    }
  );
}
