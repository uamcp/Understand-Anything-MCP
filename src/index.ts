import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { initializeUnderstand } from "./services/understand.js";
import { validateLicense } from "./services/license.js";
import { registerCoreTools } from "./tools/core.js";
import { registerPremiumTools } from "./tools/premium.js";
import { registerGovernanceTools } from "./tools/governance.js";
async function main() {
    console.error("Initializing Understand-Anything MCP Server...");
    
    // Validate license first
    const license = await validateLicense();
    console.error(`License Tier: ${license.tier}`);

    // Initialize understand graph
    await initializeUnderstand();

    // Create server instance
    const server = new McpServer({
        name: "Understand-Anything-MCP",
        version: "1.0.0"
    });

    // Register tools
    registerCoreTools(server);
    registerPremiumTools(server);
    registerGovernanceTools(server);

    // Start server
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error("Understand-Anything MCP Server running on stdio");
}

main().catch(error => {
    console.error("Failed to start server:", error);
    process.exit(1);
});
