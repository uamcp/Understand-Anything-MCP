import { config } from './dist/config.js';
import { registerCITools } from './dist/tools/ci.js';
import { registerGovernanceTools } from './dist/tools/governance.js';

config.apiUrl = 'http://localhost:8000';
config.licenseKey = '';

// mock mcp server
const tools = {};
const mockServer = {
    server: {
        elicitInput: async () => ({ content: { confirm: 'yes', reason: 'test' } }),
        getClientCapabilities: () => ({ elicitation: true })
    },
    tool: (name, desc, schema, handler) => {
        tools[name] = handler;
    }
};

async function run() {
    registerCITools(mockServer);
    registerGovernanceTools(mockServer);
    
    console.log("--- ua_ci_check ---");
    const ci_res = await tools['ua_ci_check']({ pr_diff: 'test' });
    console.log(JSON.stringify(ci_res, null, 2));

    console.log("\n--- ua_validate_graph ---");
    const val_res = await tools['ua_validate_graph']({ graphData: '{}' });
    console.log(JSON.stringify(val_res, null, 2));

    console.log("\n--- ua_precheck ---");
    // governance tools try to load graph from config.projectPath so we need to mock getGraph
    const pre_res = await tools['ua_precheck']({ target: 'test.ts' });
    console.log(JSON.stringify(pre_res, null, 2));
}

run().catch(console.error);
