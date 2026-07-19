import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function run() {
    console.log("Starting MCP Server process...");
    
    // We need to set UA_PROJECT_PATH and create a dummy .ua/knowledge-graph.json so it doesn't crash
    const dummyPath = path.join(__dirname, "dummy-project");
    fs.mkdirSync(path.join(dummyPath, ".ua"), { recursive: true });
    fs.writeFileSync(path.join(dummyPath, ".ua", "knowledge-graph.json"), JSON.stringify({nodes:[], edges:[], files:{}}));

    const transport = new StdioClientTransport({
        command: "node",
        args: [path.join(__dirname, "..", "dist", "index.js")],
        env: {
            ...process.env,
            UA_PROJECT_PATH: dummyPath,
            UA_LICENSE_KEY: "anonymous"
        }
    });

    const client = new Client({
        name: "test-client",
        version: "1.0.0"
    }, {
        capabilities: {}
    });

    await client.connect(transport);
    console.log("Connected to MCP Server");

    const toolsResult = await client.listTools();
    console.log(`Fetched ${toolsResult.tools.length} tools`);

    const serverCard = {
        serverInfo: {
            name: "Understand-Anything-MCP",
            version: "1.0.0"
        },
        tools: toolsResult.tools
    };

    const outDir = path.join(__dirname, "..", ".well-known", "mcp");
    fs.mkdirSync(outDir, { recursive: true });
    fs.writeFileSync(path.join(outDir, "server-card.json"), JSON.stringify(serverCard, null, 2));
    console.log("Wrote server-card.json");

    await transport.close();
}

run().catch(console.error);
