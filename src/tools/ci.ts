import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from 'zod';
import { requireTier } from '../services/license.js';
// removed
import { getGraph } from "../services/understand.js";

export function parseDiff(diffText: string): string[] {
    const changedFiles = new Set<string>();
    const lines = diffText.split('\n');
    for (const line of lines) {
        if (line.startsWith('+++ b/')) {
            changedFiles.add(line.substring(6).trim());
        } else if (line.startsWith('--- a/')) {
            const oldPath = line.substring(6).trim();
            if (oldPath !== '/dev/null') {
                changedFiles.add(oldPath);
            }
        } else if (line.startsWith('rename from ')) {
            changedFiles.add(line.substring(12).trim());
        } else if (line.startsWith('rename to ')) {
            changedFiles.add(line.substring(10).trim());
        }
    }
    return Array.from(changedFiles);
}
import { config } from "../config.js";
import axios from "axios";

import { readRulesConfig } from "../services/rules.js";

export function registerCiTools(server: McpServer) {
  server.tool(
    'ua_ci_check',
    'Analyzes PR diff impact using the graph. Enforces custom rules if .ua-rules.json is present. (Pro tier only)',
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
        
        let rules: any[] = [];
        if (config.projectPath) {
            const rulesConfig = await readRulesConfig(config.projectPath);
            rules = rulesConfig.rules || [];
        }

        const response = await axios.post(`${config.apiUrl}/analyze/ci-check`, {
            data: { changedFiles, graph, rules }
        }, config.licenseKey ? {
            headers: { "x-license-key": config.licenseKey }
        } : {});

        return {
          content: [{ type: 'text', text: JSON.stringify({ 
              analyzed_files: changedFiles, 
              impact_level: response.data.riskLevel, 
              risk_factors: response.data.riskFactors,
              impacted: response.data.impacted 
          }, null, 2) }],
        };
      } catch (error: any) {
        if (error.response?.status === 429 || error.response?.status === 401 || error.response?.status === 403) {
            return {
              content: [{ type: 'text', text: `[BLOCKED] Analysis failed: ${error.response.data.detail}` }],
              isError: true,
            };
        }
        return {
          content: [{ type: 'text', text: `WARNING: Backend analysis failed (${error.message}). Cannot fully determine risk, allowing by default.` }],
          isError: false,
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
          return {
              content: [{ type: "text", text: "ua_validate_graph requires a Pro tier license." }],
              isError: true,
          };
      }
      try {
        const response = await axios.post(`${config.apiUrl}/analyze/validate-graph`, {
            data: { graphData }
        }, config.licenseKey ? {
            headers: { "x-license-key": config.licenseKey }
        } : {});

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
