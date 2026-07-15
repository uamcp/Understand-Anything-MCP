#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import axios from 'axios';
import { config } from './config.js';
import { requireTier } from './services/license.js';
import { computeRisk } from './services/risk.js';
import { readRulesConfig } from './services/rules.js';

// 1. Parse unified diff to extract changed files
function parseDiff(diffText: string): string[] {
    const changedFiles = new Set<string>();
    const lines = diffText.split('\n');
    for (const line of lines) {
        if (line.startsWith('+++ b/')) {
            changedFiles.add(line.substring(6).trim());
        } else if (line.startsWith('--- a/')) {
            // Usually we only care about the new file path in +++ but taking --- a/ as fallback
            const oldPath = line.substring(6).trim();
            if (oldPath !== '/dev/null') {
                changedFiles.add(oldPath);
            }
        } else if (line.startsWith('rename from ')) {
            changedFiles.add(line.substring(12).trim());
        } else if (line.startsWith('rename to ')) {
            changedFiles.add(line.substring(10).trim());
        }
    }
    return Array.from(changedFiles);
}

export async function run() {
    console.log("Understand-Anything CI Gateway");
    
    // Fail-open: License check
    const isPro = await requireTier('Pro');
    if (!isPro) {
        console.warn("⚠️  Pro license required or expired — check skipped, upgrade to enforce this");
        return process.exit(0);
    }

    // Argument parsing
    const diffArg = process.argv.find(arg => arg.startsWith('--pr-diff='));
    let pr_diff = "";

    if (diffArg) {
        const diffInput = diffArg.split('=')[1];
        if (fs.existsSync(diffInput)) {
            pr_diff = fs.readFileSync(diffInput, 'utf-8');
        } else {
            pr_diff = diffInput;
        }
    } else {
        console.error("❌ Usage: npx ua-ci --pr-diff=<path-to-diff-file>");
        return process.exit(2);
    }

    const changedFiles = parseDiff(pr_diff);
    if (changedFiles.length === 0) {
        console.log("✅ No files changed. Approved.");
        return process.exit(0);
    }
    console.log(`Analyzing ${changedFiles.length} changed files...`);

    // Load graph manually (no chokidar)
    const graphPath = path.join(config.projectPath, '.ua/knowledge-graph.json');
    if (!fs.existsSync(graphPath)) {
        console.warn("⚠️  No knowledge graph found. Run `npx @egonex/understand-anything` first. Check skipped.");
        return process.exit(0);
    }
    const graph = JSON.parse(fs.readFileSync(graphPath, 'utf-8'));

    // Load rules
    const rulesConfig = await readRulesConfig(config.projectPath);

    // Hit backend
    let impactResult;
    try {
        const response = await axios.post(`${config.apiUrl}/analyze/ci-check`, 
            { data: { changedFiles, graph } },
            { headers: { 'x-license-key': config.licenseKey } }
        );
        impactResult = response.data;
    } catch (error: any) {
        // Fail-open: Network / backend error
        console.warn(`⚠️  Backend unreachable (${error.message}) — check skipped, this isn't a real approval.`);
        return process.exit(0);
    }

    // Evaluate Risk
    const impactedFiles = impactResult.impacted || [];
    
    let riskLevel = 'LOW';
    const riskFactors: string[] = [];
    
    try {
        const riskResult = computeRisk(graph, changedFiles, impactedFiles, rulesConfig.rules || [], rulesConfig.criticalPaths);
        riskLevel = riskResult.riskLevel;
        riskFactors.push(...riskResult.riskFactors);
    } catch (e: any) {
        console.error(`❌ Check blocked due to internal error: ${e.message}`);
        return process.exit(2);
    }

    if (riskLevel === 'HIGH') {
        console.error(`\n❌ MERGE BLOCKED: High Risk Detected`);
        riskFactors.forEach(factor => console.error(` - ${factor}`));
        return process.exit(1);
    } else if (riskLevel === 'MEDIUM') {
        console.log(`\n⚠️  WARNING: Medium Risk Detected`);
        riskFactors.forEach(factor => console.log(` - ${factor}`));
        console.log("Merge allowed, but manual review is strongly recommended.");
        return process.exit(0);
    } else {
        console.log(`\n✅ Approved. Risk is LOW.`);
        return process.exit(0);
    }
}

import { fileURLToPath } from 'url';
if (process.argv[1] && process.argv[1] === fileURLToPath(import.meta.url)) {
    run().catch(err => {
        console.error("Unhandled error:", err);
        process.exit(2);
    });
}
