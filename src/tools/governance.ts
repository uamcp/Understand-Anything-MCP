import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import axios from "axios";
import { config } from "../config.js";
import { validateLicense } from "../services/license.js";
import { getGraph } from "../services/understand.js";
import { readRules, evaluateRules, createStarterRules, UARule } from "../services/rules.js";
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

            // Critical-path checks (Free and Pro)
            const criticalPatterns = ["auth", "payment", "migration", "schema"];
            const allFilesToCheck = [target, ...impactedFiles];
            const matchedCriticals = new Set<string>();
            for (const file of allFilesToCheck) {
                for (const pat of criticalPatterns) {
                    if (file.toLowerCase().includes(pat)) {
                        matchedCriticals.add(pat);
                    }
                }
            }
            if (matchedCriticals.size > 0) {
                if (riskLevel === 'LOW') riskLevel = 'MEDIUM';
                if (impactedFiles.length > 10) riskLevel = 'HIGH';
                riskFactors.push(`Change touches a critical-path file (${Array.from(matchedCriticals).join(', ')})`);
            }

            // Pro tier: Rules evaluation
            if (license.tier === 'Pro') {
                const projectPath = config.projectPath;
                if (projectPath) {
                    const rules = await readRules(projectPath);
                    if (rules.length > 0) {
                        const evalResult = evaluateRules(graph, rules);
                        // Filter violations to see if our target or its impacted files are involved
                        // For simplicity, if the current graph violates rules, we flag it.
                        // Ideally we'd check if the target is in the violating files.
                        const relevantViolations = evalResult.violations.filter(v => v.violating_files.includes(target) || impactedFiles.some((f: string) => v.violating_files.includes(f)));
                        
                        if (relevantViolations.length > 0) {
                            riskLevel = 'HIGH';
                            for (const v of relevantViolations) {
                                riskFactors.push(`RULE VIOLATION [${v.rule_id}]: ${v.description}`);
                            }
                        }
                    }
                }
            }

            // Elicitation for HIGH and MEDIUM risk
            if (riskLevel === 'HIGH' || riskLevel === 'MEDIUM') {
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
        const result = evaluateRules(graph, rules);

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
}
