import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getGraph } from "../services/understand.js";
import { requireTier } from "../services/license.js";
import axios from "axios";
import { config } from "../config.js";
import { readRulesConfig } from "../services/rules.js";
import { READONLY } from "../utils/annotations.js";

// Helper function to extract changed files from a git diff (simplified)
export function parseDiff(diff: string): string[] {
    const files = new Set<string>();
    const lines = diff.split('\n');
    for (const line of lines) {
        if (line.startsWith('+++ b/')) {
            files.add(line.substring(6).trim());
        } else if (line.startsWith('--- a/')) {
            const oldPath = line.substring(6).trim();
            files.add(oldPath);
        }
    }
    return Array.from(files);
}

export function registerCiTools(server: McpServer) {
  server.tool(
    "ua_ci_check",
    "Run a CI-style impact analysis on a PR diff to identify risk factors. Returns affected files, risk level, and potential issues.",
    {
      pr_diff: z.string().describe("Required. The raw git diff string representing the pull request changes. Must contain '+++ b/' or '--- a/' paths.")
    },
    READONLY,
    async ({ pr_diff }) => {
      if (!(await requireTier('Pro'))) {
        return { content: [{ type: 'text', text: 'This tool requires a Pro tier license.' }], isError: true };
      }

      const graph = getGraph();
      if (!graph) {
        return { content: [{ type: 'text', text: 'No knowledge graph loaded. Please run ua_scan.' }], isError: true };
      }

      const changedFiles = parseDiff(pr_diff);
      if (changedFiles.length === 0) {
          return { content: [{ type: 'text', text: 'No changed files detected in diff.' }] };
      }

      const projectPath = config.projectPath;
      let rules: any[] = [];
      if (projectPath) {
          const rulesConfig = await readRulesConfig(projectPath);
          rules = rulesConfig.rules || [];
      }

      try {
        const response = await axios.post(`${config.apiUrl}/analyze/ci-check`, 
          { data: { changedFiles, graph, rules } },
          { headers: { 'x-license-key': config.licenseKey || 'free' } }
        );
        
        return {
          content: [{ type: 'text', text: `CI Check Complete.\nRisk Level: ${response.data.riskLevel}\nImpacted Files: ${response.data.impacted?.length || 0}\nRisk Factors:\n- ${(response.data.riskFactors || []).join('\n- ')}\n` }]
        };
      } catch (error: any) {
         if (error.response?.status === 429 || error.response?.status === 401 || error.response?.status === 403) {
            return { content: [{ type: "text", text: `[BLOCKED] Backend authorization/quota failed: ${error.response.data.detail}` }], isError: true };
         }
         return {
            content: [{ type: 'text', text: `CI Check failed: ${error.message}` }], isError: true
         };
      }
    }
  );

  server.tool(
    "ua_validate_graph",
    "Validate the structural integrity and syntax of the loaded knowledge graph JSON.",
    {
      graphData: z.string().describe("Required. The raw JSON string representation of the knowledge graph to validate.")
    },
    READONLY,
    async ({ graphData }) => {
      if (!(await requireTier('Pro'))) {
        return { content: [{ type: 'text', text: 'This tool requires a Pro tier license.' }], isError: true };
      }

      try {
        const parsed = JSON.parse(graphData);
        if (!parsed.files) {
          return { content: [{ type: 'text', text: 'Invalid graph: missing "files" property' }], isError: true };
        }
        return {
          content: [{ type: 'text', text: 'Graph validation passed.' }]
        };
      } catch (error: any) {
         return {
            content: [{ type: 'text', text: `Graph validation failed: ${error.message}` }], isError: true
         };
      }
    }
  );
}
