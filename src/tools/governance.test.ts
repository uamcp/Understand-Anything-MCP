import { describe, it, expect, vi, beforeEach } from 'vitest';
import { registerGovernanceTools } from './governance.js';
import axios from 'axios';
import { validateLicense } from '../services/license.js';
import { readRules, readRulesConfig, evaluateRules } from '../services/rules.js';

// Mock dependencies
vi.mock('axios');
vi.mock('../services/license.js', () => ({
    validateLicense: vi.fn()
}));
vi.mock('../services/understand.js', () => ({
    getGraph: vi.fn().mockReturnValue({ files: {} })
}));
vi.mock('../services/rules.js', () => ({
    readRules: vi.fn(),
    readRulesConfig: vi.fn(),
    evaluateRules: vi.fn()
}));

const mockServer = {
    server: {
        elicitInput: vi.fn(),
        getClientCapabilities: vi.fn(() => ({
            elicitation: true
        }))
    },
    tool: vi.fn()
};

describe('Governance Tools', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        registerGovernanceTools(mockServer as any);
    });

    it('Free tier precheck exceeding limit', async () => {
        const toolHandler = mockServer.tool.mock.calls.find((c: any) => c[0] === 'ua_precheck')![3];
        (validateLicense as any).mockResolvedValue({ tier: 'Free' });
        
        // Mock 429 response from backend
        (axios.post as any).mockRejectedValue({
            response: {
                status: 429,
                data: { detail: 'Daily ua_precheck limit reached' }
            }
        });

        const result = await toolHandler({ target: 'src/core/db.ts' });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('[BLOCKED] Daily ua_precheck limit reached');
    });

    it('Pro tier precheck succeeding (no violations, low risk)', async () => {
        const toolHandler = mockServer.tool.mock.calls.find((c: any) => c[0] === 'ua_precheck')![3];
        (validateLicense as any).mockResolvedValue({ tier: 'Pro' });
        
        (axios.post as any).mockResolvedValue({
            data: { impacted: ['src/foo.ts', 'src/bar.ts'], riskLevel: 'LOW', riskFactors: [] } // small blast radius
        });
        (readRulesConfig as any).mockResolvedValue({ rules: [] }); // No rules

        const result = await toolHandler({ target: 'src/core/db.ts' });
        expect(result.isError).toBeUndefined();
        expect(result.content[0].text).toContain('[APPROVED] Risk level: LOW');
    });

    it('Precheck escalating to elicitation', async () => {
        const toolHandler = mockServer.tool.mock.calls.find((c: any) => c[0] === 'ua_precheck')![3];
        (validateLicense as any).mockResolvedValue({ tier: 'Free' });
        (axios.post as any).mockResolvedValue({
            data: { impacted: new Array(51).fill('src/file.ts'), riskLevel: 'HIGH', riskFactors: ['Massive blast radius'] } // massive blast radius -> HIGH risk
        });
        (readRulesConfig as any).mockResolvedValue({ rules: [] }); // No rules
        
        mockServer.server.elicitInput.mockResolvedValue({
            content: { confirm: 'i understand and proceed', reason: 'urgent fix' }
        });

        const result = await toolHandler({ target: 'src/core/db.ts' });
        expect(result.isError).toBeUndefined();
        expect(result.content[0].text).toContain('[APPROVED]');
        expect(mockServer.server.elicitInput).toHaveBeenCalled();
    });

    it('Precheck falls back to warning if elicitation not supported', async () => {
        const toolHandler = mockServer.tool.mock.calls.find((c: any) => c[0] === 'ua_precheck')![3];
        (validateLicense as any).mockResolvedValue({ tier: 'Free' });
        (axios.post as any).mockResolvedValue({
            data: { impacted: new Array(51).fill('src/file.ts') }
        });
        (readRulesConfig as any).mockResolvedValue({ rules: [] });
        
        mockServer.server.getClientCapabilities.mockReturnValueOnce({}); // No elicitation

        const result = await toolHandler({ target: 'src/core/db.ts' });
        expect(result.isError).toBeUndefined();
        expect(result.content[0].text).toContain('WARNING:');
        expect(result.content[0].text).toContain('[Client does not support elicitation');
        // Elicit input should NOT have been called for this request since capabilities were missing
        // (Note: we check if it was called because the previous test might leave it if clearAllMocks wasn't working, but clearAllMocks is in beforeEach)
        expect(mockServer.server.elicitInput).not.toHaveBeenCalled();
    });

    it('Precheck on critical-path target with <=10 impacted returns MEDIUM risk and DOES elicit', async () => {
        const toolHandler = mockServer.tool.mock.calls.find((c: any) => c[0] === 'ua_precheck')![3];
        (validateLicense as any).mockResolvedValue({ tier: 'Pro' });
        
        (axios.post as any).mockResolvedValue({
            data: { impacted: ['src/foo.ts', 'src/bar.ts'], riskLevel: 'MEDIUM', riskFactors: ['critical path'] } // small blast radius, <= 10
        });
        (readRulesConfig as any).mockResolvedValue({ rules: [], criticalPaths: ["auth", "payment", "migration", "schema"] }); 
        
        mockServer.server.elicitInput.mockResolvedValue({
            content: { confirm: 'i understand and proceed', reason: 'urgent fix' }
        });

        // The target contains "auth", which is a critical pattern
        const result = await toolHandler({ target: 'src/auth/login.ts' });
        
        expect(result.isError).toBeUndefined();
        expect(result.content[0].text).toContain('[APPROVED] User authorized the medium-risk change');
        expect(mockServer.server.elicitInput).toHaveBeenCalled();
    });
});
