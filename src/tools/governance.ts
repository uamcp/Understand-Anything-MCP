import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import axios from "axios";
import { config } from "../config.js";
import { validateLicense } from "../services/license.js";
import { getGraph } from "../services/understand.js";
import { readRules, readRulesConfig, createStarterRules, UARule } from "../services/rules.js";
import fs from "fs/promises";
import path from "path";

export function registerGovernanceTools(server: McpServer) {
    server.tool(
        "ua_precheck",
        "Pre-flight architectural risk check. Always call this tool before editing any file in the project. MUST be called before modifying any critical systems or refactoring.",
        {
            target: z.string().describe("The primary file or module you plan to modify (e.g. 'src/core/db.ts')")
        },
        async ({ target }) => {
            const license = await validateLicense();
            const graph = getGraph();

            const projectPath = config.projectPath;
            let rules: any[] = [];
            if (projectPath && license.tier === 'Pro') {
                const rulesConfig = await readRulesConfig(projectPath);
                rules = rulesConfig.rules || [];
            }

            let riskLevel = 'LOW';
            let riskFactors: string[] = [];
            let impactedFiles: string[] = [];
            let fallbackToLocal = false;

            if (license.tier === 'Pro') {
                try {
                    const response = await axios.post(`${config.apiUrl}/analyze/ci-check`, 
                        { data: { changedFiles: [target], graph, rules } },
                        { headers: { 'x-license-key': config.licenseKey || 'free' } }
                    );
                    riskLevel = response.data.riskLevel;
                    riskFactors = response.data.riskFactors || [];
                    impactedFiles = response.data.impacted || [];
                } catch (error: any) {
                    if (error.response?.status === 429 || error.response?.status === 401 || error.response?.status === 403) {
                        return { content: [{ type: "text", text: `[BLOCKED] Backend authorization/quota failed: ${error.response.data.detail}` }], isError: true };
                    }
                    console.error("Backend ci-check failed, falling back to local heuristics:", error.message);
                    fallbackToLocal = true;
                }
            } else {
                fallbackToLocal = true;
            }

            if (fallbackToLocal) {
                // Free tier or network failure fallback
                try {
                    const response = await axios.post(`${config.apiUrl}/analyze/impact-analysis`, 
                        { data: { target, graph, isPrecheck: true } },
                        config.licenseKey ? { headers: { 'x-license-key': config.licenseKey } } : {}
                    );
                    impactedFiles = response.data.impacted || [];
                } catch (error: any) {
                    if (error.response?.status === 429) {
                        return { content: [{ type: "text", text: `[BLOCKED] ${error.response.data.detail}` }], isError: true };
                    }
                    // Complete network failure
                    console.error("Backend impact-analysis failed:", error.message);
                    return { content: [{ type: "text", text: `WARNING: Backend analysis failed, proceeding with local analysis only. Risk cannot be fully determined.` }] };
                }

                if (impactedFiles.length > 50) {
                    riskLevel = 'HIGH';
                    riskFactors.push(`Massive blast radius (${impactedFiles.length} files impacted).`);
                } else if (impactedFiles.length > 10) {
                    riskLevel = 'MEDIUM';
                    riskFactors.push(`Moderate blast radius (${impactedFiles.length} files impacted).`);
                }
            }

            // Elicitation for HIGH and MEDIUM risk
            if (riskLevel === 'HIGH' || riskLevel === 'MEDIUM') {
                const clientCapabilities = typeof server.server.getClientCapabilities === 'function' ? server.server.getClientCapabilities() : undefined;
                
                // If client doesn't support interactive prompts, let the agent know to proceed with caution
                if (!clientCapabilities?.elicitation) {
                    return { 
                        content: [{ type: "text", text: `WARNING: Modifying ${target} poses a ${riskLevel} architectural risk.\nRisk Factors:\n${riskFactors.map(f => '- ' + f).join('\n')}\n\n[Client does not support elicitation. Agent: Please note this risk and proceed with caution.]` }]
                    };
                }

                try {
                    const elicitMessage = riskLevel === 'HIGH' 
                        ? `WARNING: Modifying ${target} poses a HIGH architectural risk.\nRisk Factors:\n${riskFactors.map(f => '- ' + f).join('\n')}`
                        : `Warning: Modifying ${target} poses a MEDIUM architectural risk.\nRisk Factors:\n${riskFactors.map(f => '- ' + f).join('\n')}\nType 'I understand and proceed' to continue.`;

                    const confirm = await server.server.elicitInput({
                        mode: "form",
                        message: elicitMessage,
                        requestedSchema: {
                            type: "object",
                            properties: {
                                reason: {
                                    type: "string",
                                    description: "Please provide a brief justification for why you are making this high-risk change."
                                },
                                confirm: {
                                    type: "string",
                                    description: "Type 'I understand and proceed' to continue, or anything else to abort."
                                }
                            },
                            required: ["reason", "confirm"]
                        }
                    });

                    const confirmText = confirm.content?.confirm || '';
                    if (String(confirmText).toLowerCase().trim() === 'i understand and proceed') {
                        return { content: [{ type: "text", text: `[APPROVED] User authorized the ${riskLevel.toLowerCase()}-risk change. Justification: ${confirm.content?.reason}\nImpacted Files: ${impactedFiles.join(', ')}` }] };
                    } else {
                        return { content: [{ type: "text", text: `[ABORTED] User did not authorize the ${riskLevel.toLowerCase()}-risk change.` }] };
                    }
                } catch (e: any) {
                    return { content: [{ type: "text", text: `[BLOCKED] ${riskLevel} risk detected, but elicitation failed or was cancelled: ${e.message}` }], isError: true };
                }
            }

            return {
                content: [{ type: "text", text: `[APPROVED] Risk level: ${riskLevel}.\nImpacted Files: ${impactedFiles.length}\n${riskFactors.join('\n')}` }]
            };
        }
    );

    const handleRules = async () => {
        const license = await validateLicense();
        if (license.tier !== 'Pro') {
            return {
                content: [{ type: "text", text: "This tool requires a Pro tier license." }],
                isError: true,
            };
        }

        const projectPath = config.projectPath;
        if (!projectPath) {
            return {
                content: [{ type: "text", text: "UA_PROJECT_PATH is not configured." }],
                isError: true,
            };
        }

        let rules = await readRules(projectPath);
        if (rules.length === 0) {
            return {
                content: [{ type: "text" as const, text: `No rules found in .ua-rules.json. To get started, create a .ua-rules.json file in the root of your project.` }]
            };
        }

        const graph = getGraph();
        let result;
        try {
            const response = await axios.post(`${config.apiUrl}/analyze/rules-evaluate`, {
                data: {
                    graph,
                    rules
                }
            }, config.licenseKey ? {
                headers: { 'x-license-key': config.licenseKey }
            } : {});
            result = response.data;
        } catch (e: any) {
            return {
                content: [{ type: "text" as const, text: `Backend analysis failed: ${e.message}` }]
            };
        }

        const lines = [];
        lines.push(`## Architectural Rules Audit`);
        lines.push(`Passed: ${result.passed.length}`);
        lines.push(`Violations: ${result.violations.length}`);
        lines.push(`Warnings: ${result.warnings.length}\n`);

        if (result.violations.length > 0) {
            lines.push(`### Violations (Errors)`);
            for (const v of result.violations) {
                lines.push(`- [${v.rule_id}]: ${v.description}`);
                lines.push(`  Files: ${v.violating_files.join(', ')}`);
            }
            lines.push('');
        }

        if (result.warnings.length > 0) {
            lines.push(`### Warnings`);
            for (const v of result.warnings) {
                lines.push(`- [${v.rule_id}]: ${v.description}`);
                lines.push(`  Files: ${v.violating_files.join(', ')}`);
            }
        }

        return {
            content: [{ type: "text" as const, text: lines.join('\n') }]
        };
    };

    server.tool(
        "ua_rules",
        "Evaluates the .ua-rules.json architectural constraints against the current knowledge graph. Generates a full violation report.",
        {},
        handleRules
    );

    server.tool(
        "ua_rules_check",
        "Mid-session continuous audit. Evaluates the .ua-rules.json constraints to ensure recent changes haven't introduced violations.",
        {},
        handleRules
    );

    server.tool(
        "ua_init_rules",
        "Initializes a starter .ua-rules.json file in the workspace if one doesn't already exist.",
        {},
        async () => {
            const projectPath = config.projectPath;
            if (!projectPath) return { content: [{ type: "text", text: "Project path not configured." }], isError: true };
            
            const rulesPath = path.join(projectPath, '.ua-rules.json');
            try {
                await fs.access(rulesPath);
                return { content: [{ type: "text", text: ".ua-rules.json already exists in the project root." }] };
            } catch {
                await fs.writeFile(rulesPath, createStarterRules(), 'utf-8');
                return { content: [{ type: "text", text: "Successfully created .ua-rules.json with starter rules." }] };
            }
        }
    );
}
