import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerCoreTools } from "../src/tools/core.js";
import { registerPremiumTools } from "../src/tools/premium.js";
import { registerGovernanceTools } from "../src/tools/governance.js";
import { registerCiTools } from "../src/tools/ci.js";
import fs from "fs";
import path from "path";
import { zodToJsonSchema } from "zod-to-json-schema";
import { z } from "zod";

async function generate() {
    const serverInfo = {
        name: "ua-mcp",
        version: "1.2.13"
    };

    const server = new McpServer(serverInfo);

    registerCoreTools(server);
    registerPremiumTools(server);
    registerGovernanceTools(server);
    registerCiTools(server);

    const registeredTools = (server as any)._registeredTools || {};
    const tools = [];

    for (const [name, tool] of Object.entries(registeredTools)) {
        let schema: any;
        if (name === 'ua_explain') {
            schema = { type: 'object', properties: { target: { type: 'string', description: "Required. The precise file path or module name to explain. Example: 'src/core/db.ts'." } }, required: ['target'] };
        } else if (name === 'ua_find_callers') {
            schema = { type: 'object', properties: { target: { type: 'string', description: "Required. The target file or function ID." }, depth: { type: 'number', description: "Optional. Maximum search depth." } }, required: ['target'] };
        } else if (name === 'ua_impact_analysis') {
            schema = { type: 'object', properties: { target: { type: 'string', description: "Required. The file being modified." } }, required: ['target'] };
        } else if (name === 'ua_precheck') {
            schema = { type: 'object', properties: { target: { type: 'string', description: "Required. The primary file or module you plan to modify." } }, required: ['target'] };
        } else if (name === 'ua_ci_check') {
            schema = { type: 'object', properties: { diff: { type: 'string', description: "Required. The raw git diff string." } }, required: ['diff'] };
        } else if (name === 'ua_validate_graph') {
            schema = { type: 'object', properties: { graphData: { type: 'string', description: "Required. The raw JSON string representation of the knowledge graph to validate." } }, required: ['graphData'] };
        } else {
            schema = { type: 'object', properties: {} };
        }
        const outputSchema = {
            type: 'object',
            properties: {
                content: {
                    type: 'array',
                    items: {
                        type: 'object',
                        properties: {
                            type: { type: 'string', description: 'Content block format type, e.g. text.' },
                            text: { type: 'string', description: 'Execution output text content.' }
                        },
                        required: ['type', 'text']
                    },
                    description: 'Array of result content blocks.'
                },
                isError: { type: 'boolean', description: 'Optional error flag indicating execution status.' }
            },
            required: ['content']
        };
        tools.push({
            name,
            description: (tool as any).description,
            inputSchema: schema,
            outputSchema
        });
    }

    const serverCard = {
        serverInfo: {
            name: "ua-mcp",
            version: "1.2.16"
        },
        tools
    };

    const dir = path.join(process.cwd(), ".well-known", "mcp");
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(path.join(dir, "server-card.json"), JSON.stringify(serverCard, null, 2));
    console.log("Successfully generated .well-known/mcp/server-card.json");
}

generate().catch(console.error);
