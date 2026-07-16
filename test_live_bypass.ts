import { config } from './src/config.js';
import { registerCiTools } from './src/tools/ci.js';
import { registerGovernanceTools } from './src/tools/governance.js';

config.apiUrl = 'http://localhost:8000';
config.licenseKey = ''; // no valid pro key
config.projectPath = process.cwd();

const tools: any = {};
const mockServer: any = {
    server: {
        elicitInput: async () => ({ content: { confirm: 'yes', reason: 'test' } }),
        getClientCapabilities: () => ({ elicitation: true })
    },
    tool: (name: string, desc: string, schema: any, handler: any) => {
        tools[name] = handler;
    }
};

async function run() {
    registerCiTools(mockServer);
    registerGovernanceTools(mockServer);
    
    console.log("--- ua_ci_check ---");
    const ci_res = await tools['ua_ci_check']({ pr_diff: 'test' });
    console.log(JSON.stringify(ci_res, null, 2));

    console.log("\n--- ua_validate_graph ---");
    const val_res = await tools['ua_validate_graph']({ graphData: '{}' });
    console.log(JSON.stringify(val_res, null, 2));

    console.log("\n--- ua_precheck ---");
    const pre_res = await tools['ua_precheck']({ target: 'test.ts' });
    console.log(JSON.stringify(pre_res, null, 2));
}

run().catch(console.error);
