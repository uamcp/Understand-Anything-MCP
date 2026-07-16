import { describe, it, expect, vi, beforeEach } from 'vitest';
import { registerCiTools } from './ci.js';
import axios from 'axios';
import * as licenseService from '../services/license.js';

vi.mock('axios');
vi.mock('../services/license.js', () => ({
  requireTier: vi.fn()
}));
vi.mock('../services/understand.js', () => ({
  getGraph: vi.fn().mockReturnValue({})
}));

const mockServer = {
  tool: vi.fn()
};

describe('CI Tools', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    registerCiTools(mockServer as any);
  });

  describe('ua_ci_check', () => {
    it('throws when requireTier returns false', async () => {
      const toolHandler = mockServer.tool.mock.calls.find((c: any) => c[0] === 'ua_ci_check')![3];
      (licenseService.requireTier as any).mockResolvedValue(false);
      const result = await toolHandler({ pr_diff: '+++ b/test.txt' });
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('requires a Pro tier license');
    });

    it('succeeds when requireTier returns true', async () => {
      const toolHandler = mockServer.tool.mock.calls.find((c: any) => c[0] === 'ua_ci_check')![3];
      (licenseService.requireTier as any).mockResolvedValue(true);
      (axios.post as any).mockResolvedValue({
        data: {
          impacted: ['test.txt']
        }
      });
      const result = await toolHandler({ pr_diff: '+++ b/test.txt' });
      expect(result.content).toBeDefined();
      expect(result.content[0].text).toContain('test.txt');
    });
  });

  describe('ua_validate_graph', () => {
    it('throws when requireTier returns false', async () => {
      const toolHandler = mockServer.tool.mock.calls.find((c: any) => c[0] === 'ua_validate_graph')![3];
      (licenseService.requireTier as any).mockResolvedValue(false);
      const result = await toolHandler({ graphData: '{}' });
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('requires a Pro tier license');
    });

    it('succeeds when requireTier returns true', async () => {
      const toolHandler = mockServer.tool.mock.calls.find((c: any) => c[0] === 'ua_validate_graph')![3];
      vi.mocked(licenseService.requireTier).mockResolvedValue(true);
      (axios.post as any).mockResolvedValue({
        data: {
          valid_nodes: 5,
          invalid_nodes: 0,
          errors: []
        }
      });
      
      const result = await toolHandler({ graphData: '{}' });
      expect(result.content).toBeDefined();
      expect(result.content[0].text).toContain('valid_nodes');
    });
  });
});
