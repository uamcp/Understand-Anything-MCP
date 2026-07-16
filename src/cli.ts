#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import axios from 'axios';
import { config } from './config.js';
import { requireTier } from './services/license.js';
import { readRulesConfig } from './services/rules.js';

import { parseDiff } from './tools/ci.js';

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

    // Evaluate Risk using backend
    let riskLevel = 'LOW';
    let riskFactors: string[] = [];
    
    try {
        const response = await axios.post(`${config.apiUrl}/analyze/ci-check`, {
            data: {
                changedFiles,
                graph,
                rules: rulesConfig.rules || []
            }
        }, config.licenseKey ? {
            headers: { 'x-license-key': config.licenseKey }
        } : {});
        
        riskLevel = response.data.riskLevel;
        riskFactors = response.data.riskFactors || [];
    } catch (e: any) {
        if (e.response?.status === 401) {
            console.warn(`⚠️  Invalid or expired license — check skipped`);
        } else {
            console.warn(`⚠️  Warning: Failed to reach Understand-Anything backend. Check skipped. Error: ${e.message}`);
        }
        // Fallback for network error / 500 error: exit 0 to prevent pipeline stall, with warning
        return process.exit(0);
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

if (process.argv[1]) {
    run().catch(err => {
        console.error("Unhandled error:", err);
        process.exit(2);
    });
}
