import { config } from './src/config.js';
import { registerGovernanceTools } from './src/tools/governance.js';

config.apiUrl = 'http://localhost:8000';
config.licenseKey = '';
config.projectPath = process.cwd();

const mockServer: any = {
    server: {
        elicitInput: async () => ({ content: { confirm: 'yes', reason: 'test' } }),
        getClientCapabilities: () => ({ elicitation: true })
    },
    tool: (name: string, desc: string, schema: any, handler: any) => {
        if (name === "ua_precheck") {
            (global as any).uaPrecheckHandler = handler;
        }
    }
};

async function runSmokeTest() {
    console.log("Setting up Free Tier smoke test...");
    registerGovernanceTools(mockServer);
    
    const handler = (global as any).uaPrecheckHandler;
    
    for (let i = 1; i <= 11; i++) {
        console.log(`\n--- Calling ua_precheck iteration ${i} ---`);
        try {
            const result = await handler({ target: 'src/core/db.ts' });
            if (result.isError) {
                console.log(`[Result] ERROR:`, result.content[0].text);
            } else {
                console.log(`[Result] SUCCESS:`, result.content[0].text.substring(0, 100).replace(/\n/g, ' ') + '...');
            }
        } catch (e: any) {
            console.log(`[Exception]`, e.message);
        }
    }
}

runSmokeTest().catch(console.error);
