import { UARule, evaluateRules } from './rules.js';

export function computeRisk(graph: any, changedFiles: string[], impactedFiles: string[], rules: UARule[], customCriticalPaths?: string[]) {
    let riskLevel = 'LOW';
    const riskFactors: string[] = [];
    const allFiles = Array.from(new Set([...changedFiles, ...impactedFiles]));

    // Critical-path checks
    const criticalPatterns = customCriticalPaths || ["auth", "payment", "migration", "schema"];
    const matchedCriticals = new Set<string>();
    for (const file of allFiles) {
        for (const pat of criticalPatterns) {
            if (file.toLowerCase().includes(pat.toLowerCase())) {
                matchedCriticals.add(pat);
            }
        }
    }

    if (matchedCriticals.size > 0) {
        riskLevel = 'MEDIUM';
        riskFactors.push(`Change touches a critical-path file (${Array.from(matchedCriticals).join(', ')})`);
    }

    // Blast radius thresholds - evaluate AFTER critical paths to ensure HIGH overrides MEDIUM
    if (impactedFiles.length > 50) {
        riskLevel = 'HIGH';
        riskFactors.push(`Massive blast radius (${impactedFiles.length} downstream files impacted).`);
    } else if (impactedFiles.length > 10) {
        if (matchedCriticals.size > 0) {
            riskLevel = 'HIGH';
            riskFactors.push(`Critical path change with large blast radius (${impactedFiles.length} downstream files impacted).`);
        } else {
            if (riskLevel !== 'HIGH') riskLevel = 'MEDIUM';
            riskFactors.push(`Large blast radius (${impactedFiles.length} downstream files impacted).`);
        }
    }
    
    // Pro tier: Rules evaluation
    if (rules && rules.length > 0) {
        let evalResult;
        try {
            evalResult = evaluateRules(graph, rules);
        } catch (e: any) {
            throw new Error(`Rule evaluation failed: ${e.message}`);
        }
        
        // Filter violations to see if our target or its impacted files are involved
        const relevantViolations = evalResult.violations.filter(v => changedFiles.some(f => v.violating_files.includes(f)));
        
        if (relevantViolations.length > 0) {
            riskLevel = 'HIGH'; // Rule violations are always HIGH risk
            for (const v of relevantViolations) {
                riskFactors.push(`RULE VIOLATION [${v.rule_id}]: ${v.description}`);
            }
        }
    }

    return {
        riskLevel,
        riskFactors
    };
}
