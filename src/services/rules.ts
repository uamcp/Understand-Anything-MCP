import fs from 'fs/promises';
import path from 'path';
import { minimatch } from 'minimatch';

export interface UARule {
    id: string;
    description: string;
    severity: 'error' | 'warning';
    from_pattern?: string;
    to_pattern?: string;
    requires_path_through?: string;
    for_pattern?: string;
}

export interface UARulesConfig {
    rules: UARule[];
}

export interface Violation {
    rule_id: string;
    description: string;
    severity: 'error' | 'warning';
    violating_files: string[];
}

export interface RuleEvaluationResult {
    violations: Violation[];
    warnings: Violation[];
    passed: string[];
}

const RULES_FILE = '.ua-rules.json';

export async function readRules(projectPath: string): Promise<UARule[]> {
    try {
        const fullPath = path.join(projectPath, RULES_FILE);
        const data = await fs.readFile(fullPath, 'utf-8');
        const config = JSON.parse(data) as UARulesConfig;
        return config.rules || [];
    } catch (error: any) {
        if (error.code === 'ENOENT') {
            return [];
        }
        console.error('Failed to parse .ua-rules.json', error);
        return [];
    }
}

export function createStarterRules(): string {
    return `{
  // Understand-Anything Architectural Rules
  // Define constraints that agents and developers must respect.
  "rules": [
    {
      "id": "no-ui-db-import",
      "description": "UI layer must never import database layer directly",
      "from_pattern": "src/ui/**",
      "to_pattern": "src/db/**",
      "severity": "error"
    },
    {
      "id": "auth-required-for-payments",
      "description": "Payment modules must always be reachable from auth",
      "requires_path_through": "src/auth/**",
      "for_pattern": "src/payments/**",
      "severity": "error"
    }
  ]
}`;
}

export function evaluateRules(graph: any, rules: UARule[]): RuleEvaluationResult {
    const result: RuleEvaluationResult = {
        violations: [],
        warnings: [],
        passed: []
    };

    if (!rules || rules.length === 0) return result;

    const files = graph.files || {};
    const fileIds = Object.keys(files);

    for (const rule of rules) {
        let isViolated = false;
        const violatingFiles = new Set<string>();

        if (rule.from_pattern && rule.to_pattern) {
            // Direct import check
            for (const fileId of fileIds) {
                if (minimatch(fileId, rule.from_pattern)) {
                    const imports = files[fileId].imports || [];
                    for (const imp of imports) {
                        if (minimatch(imp, rule.to_pattern)) {
                            violatingFiles.add(fileId);
                            isViolated = true;
                        }
                    }
                }
            }
        } else if (rule.for_pattern && rule.requires_path_through) {
            // Reachability check (must have ancestor matching requires_path_through)
            // Build adjacency list for reverse reachability (who imports who)
            const incomingEdges: Record<string, string[]> = {};
            for (const [src, data] of Object.entries(files) as [string, any][]) {
                const imports = data.imports || [];
                for (const target of imports) {
                    if (!incomingEdges[target]) incomingEdges[target] = [];
                    incomingEdges[target].push(src);
                }
            }

            for (const fileId of fileIds) {
                if (minimatch(fileId, rule.for_pattern)) {
                    // Check if there's a path from any node matching requires_path_through to fileId
                    // We search backwards from fileId
                    let hasPath = false;
                    const visited = new Set<string>();
                    const queue = [fileId];

                    while (queue.length > 0) {
                        const current = queue.shift()!;
                        if (minimatch(current, rule.requires_path_through)) {
                            hasPath = true;
                            break;
                        }
                        visited.add(current);
                        const callers = incomingEdges[current] || [];
                        for (const caller of callers) {
                            if (!visited.has(caller)) {
                                queue.push(caller);
                            }
                        }
                    }

                    if (!hasPath) {
                        violatingFiles.add(fileId);
                        isViolated = true;
                    }
                }
            }
        }

        if (isViolated) {
            const violation: Violation = {
                rule_id: rule.id,
                description: rule.description,
                severity: rule.severity || 'error',
                violating_files: Array.from(violatingFiles)
            };
            if (violation.severity === 'error') {
                result.violations.push(violation);
            } else {
                result.warnings.push(violation);
            }
        } else {
            result.passed.push(rule.id);
        }
    }

    return result;
}
