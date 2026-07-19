#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { initializeUnderstand } from "./services/understand.js";
import { validateLicense } from "./services/license.js";
import { registerCoreTools } from "./tools/core.js";
import { registerPremiumTools } from "./tools/premium.js";
import { registerGovernanceTools } from "./tools/governance.js";
import { registerCiTools } from "./tools/ci.js";

async function main() {
    console.error("Initializing Understand-Anything MCP Server...");
    
    // Start license validation in the background
    validateLicense().then(license => {
        console.error(`License Tier: ${license.tier}`);
    }).catch(e => console.error("License validation background failed", e));

    // Initialize understand graph in background or don't block
    initializeUnderstand().catch(e => console.error("Initialize understand failed", e));

    // Create server instance
    const server = new McpServer({
        name: "ua-mcp",
        version: "1.2.13"
    }, {
        instructions: "This server provides tools to analyze and enforce architectural rules in the user's project using the Understand-Anything knowledge graph. ALWAYS run ua_precheck early in the process to check for architectural violations before making changes. Use ua_rules to read rules, and ua_rules_check to validate planned changes."
    });

    // Register tools
    registerCoreTools(server);
    registerPremiumTools(server);
    registerGovernanceTools(server);
    registerCiTools(server);

    // Start server
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error("Understand-Anything MCP Server running on stdio");
}

main().catch(error => {
    console.error("Failed to start server:", error);
    process.exit(1);
});
