import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import axios from "axios";
import { config } from "../config.js";
import { validateLicense } from "../services/license.js";
import { getGraph } from "../services/understand.js";
import { readRules, readRulesConfig, evaluateRules, createStarterRules, UARule } from "../services/rules.js";
import { computeRisk } from "../services/risk.js";
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

            // 1. Call backend for impact analysis (with isPrecheck=true to track Free tier 10/day limit)
            let impactResult;
            try {
                const response = await axios.post(`${config.apiUrl}/analyze/impact-analysis`, 
                    { data: { target, graph, isPrecheck: true } },
                    { headers: { 'x-license-key': config.licenseKey || 'free' } }
                );
                impactResult = response.data;
            } catch (error: any) {
                if (error.response?.status === 429) {
                    return { content: [{ type: "text", text: `[BLOCKED] ${error.response.data.detail}` }], isError: true };
                }
                return { content: [{ type: "text", text: `Backend analysis failed: ${error.message}` }], isError: true };
            }

            const impactedFiles = impactResult.impacted || [];
            let riskLevel = 'LOW';
            const riskFactors: string[] = [];

            // Default heuristics
            if (impactedFiles.length > 50) {
                riskLevel = 'HIGH';
                riskFactors.push(`Massive blast radius (${impactedFiles.length} files impacted).`);
            } else if (impactedFiles.length > 10) {
                riskLevel = 'MEDIUM';
                riskFactors.push(`Moderate blast radius (${impactedFiles.length} files impacted).`);
            }

            const projectPath = config.projectPath;
            let customCriticalPaths: string[] | undefined;
            let rules: UARule[] = [];

            if (projectPath && license.tier === 'Pro') {
                const rulesConfig = await readRulesConfig(projectPath);
                rules = rulesConfig.rules || [];
                customCriticalPaths = rulesConfig.criticalPaths;
            }

            // Use shared risk service
            const allFilesToCheck = [target, ...impactedFiles];
            
            try {
                const riskResult = computeRisk(graph, allFilesToCheck, rules, customCriticalPaths);
                riskLevel = riskResult.riskLevel;
                riskFactors.push(...riskResult.riskFactors);
            } catch (e: any) {
                return { content: [{ type: "text", text: `[BLOCKED] ${e.message}` }], isError: true };
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
            throw new Error('This tool requires a Pro tier license.');
        }

        const projectPath = config.projectPath;
        if (!projectPath) {
            throw new Error('UA_PROJECT_PATH is not configured.');
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
            result = evaluateRules(graph, rules);
        } catch (e: any) {
            return {
                content: [{ type: "text" as const, text: `Knowledge graph not loaded — please run the Understand-Anything scanner first.` }]
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
