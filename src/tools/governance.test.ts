import { describe, it, expect, vi, beforeEach } from 'vitest';
import { registerGovernanceTools } from './governance.js';
import axios from 'axios';
import { validateLicense } from '../services/license.js';
import { readRules, evaluateRules } from '../services/rules.js';

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
    evaluateRules: vi.fn()
}));

const mockServer = {
    tool: vi.fn(),
    server: {
        elicitInput: vi.fn()
    }
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
            data: { impacted: ['src/foo.ts', 'src/bar.ts'] } // small blast radius
        });
        (readRules as any).mockResolvedValue([]); // No rules

        const result = await toolHandler({ target: 'src/core/db.ts' });
        expect(result.isError).toBeUndefined();
        expect(result.content[0].text).toContain('[APPROVED] Risk level: LOW');
    });

    it('Precheck escalating to elicitation', async () => {
        const toolHandler = mockServer.tool.mock.calls.find((c: any) => c[0] === 'ua_precheck')![3];
        (validateLicense as any).mockResolvedValue({ tier: 'Pro' });
        
        (axios.post as any).mockResolvedValue({
            data: { impacted: new Array(51).fill('src/file.ts') } // massive blast radius -> HIGH risk
        });
        (readRules as any).mockResolvedValue([]); // No rules
        
        mockServer.server.elicitInput.mockResolvedValue({
            content: { confirm: 'i understand and proceed', reason: 'urgent fix' }
        });

        const result = await toolHandler({ target: 'src/core/db.ts' });
        expect(result.isError).toBeUndefined();
        expect(result.content[0].text).toContain('[APPROVED] User authorized the high-risk change');
        expect(mockServer.server.elicitInput).toHaveBeenCalled();
    });

    it('Precheck on critical-path target with <=10 impacted returns MEDIUM risk and DOES elicit', async () => {
        const toolHandler = mockServer.tool.mock.calls.find((c: any) => c[0] === 'ua_precheck')![3];
        (validateLicense as any).mockResolvedValue({ tier: 'Pro' });
        
        (axios.post as any).mockResolvedValue({
            data: { impacted: ['src/foo.ts', 'src/bar.ts'] } // small blast radius, <= 10
        });
        (readRules as any).mockResolvedValue([]); // No rules
        
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
