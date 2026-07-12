import { z } from 'zod';
import { requireTier } from '../services/license.js';
import axios from 'axios';
import { config } from '../config.js';

export const ciToolSchema = {
  name: 'ua_ci_check',
  description: 'Analyzes PR diff impact using the graph. (Pro tier only)',
  inputSchema: {
    type: 'object',
    properties: {
      pr_diff: {
        type: 'string',
        description: 'The Git diff of the Pull Request.'
      }
    },
    required: ['pr_diff'],
  },
};

export async function handleCiCheck(args: any) {
  const { pr_diff } = args;

  if (!(await requireTier('Pro'))) {
    throw new Error('This tool requires a Pro tier license.');
  }

  try {
    const response = await axios.post(`${config.apiUrl}/analyze/ci-check`, 
      { data: { pr_diff } },
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

export const validateGraphSchema = {
  name: 'ua_validate_graph',
  description: 'Validate the knowledge graph structure (Pro tier only)',
  inputSchema: {
    type: 'object',
    properties: {
      graphData: {
        type: 'string',
        description: 'The JSON string of the graph data to validate'
      }
    },
    required: ['graphData'],
  },
};

export async function handleValidateGraph(args: any) {
  const { graphData } = args;

  if (!(await requireTier('Pro'))) {
    throw new Error('This tool requires a Pro tier license.');
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
