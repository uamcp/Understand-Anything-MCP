import { describe, it, expect } from 'vitest';
import { evaluateRules, UARule } from './rules.js';

describe('Rules Service', () => {
    it('correctly passes a valid graph', () => {
        const graph = {
            files: {
                'src/ui/Button.ts': { imports: ['src/utils/math.ts'] },
                'src/db/queries.ts': { imports: [] }
            }
        };
        const rules: UARule[] = [
            {
                id: 'no-ui-db',
                description: 'UI no DB',
                severity: 'error',
                from_pattern: 'src/ui/**',
                to_pattern: 'src/db/**'
            }
        ];
        
        const result = evaluateRules(graph, rules);
        expect(result.violations).toHaveLength(0);
        expect(result.passed).toContain('no-ui-db');
    });

    it('correctly parses and flags a from_pattern violation', () => {
        const graph = {
            files: {
                'src/ui/Button.ts': { imports: ['src/db/queries.ts'] },
                'src/db/queries.ts': { imports: [] }
            }
        };
        const rules: UARule[] = [
            {
                id: 'no-ui-db',
                description: 'UI no DB',
                severity: 'error',
                from_pattern: 'src/ui/**',
                to_pattern: 'src/db/**'
            }
        ];
        
        const result = evaluateRules(graph, rules);
        expect(result.violations).toHaveLength(1);
        expect(result.violations[0].rule_id).toBe('no-ui-db');
        expect(result.violations[0].violating_files).toContain('src/ui/Button.ts');
    });
});
