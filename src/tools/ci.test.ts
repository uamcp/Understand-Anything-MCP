import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handleCiCheck, handleValidateGraph } from './ci.js';
import * as licenseService from '../services/license.js';
import axios from 'axios';

// Mock the dependencies
vi.mock('../services/license.js', () => ({
  requireTier: vi.fn(),
}));

vi.mock('axios');

describe('CI Tools', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('handleCiCheck', () => {
    it('throws when requireTier returns false', async () => {
      (licenseService.requireTier as any).mockResolvedValue(false);
      await expect(handleCiCheck({ pr_diff: '+++ b/test.txt' })).rejects.toThrow('This tool requires a Pro tier license.');
    });

    it('succeeds when requireTier returns true', async () => {
      (licenseService.requireTier as any).mockResolvedValue(true);
      (axios.post as any).mockResolvedValue({
        data: {
          analyzed_files: ['test.txt']
        }
      });
      const result = await handleCiCheck({ pr_diff: '+++ b/test.txt' });
      expect(result.content).toBeDefined();
      expect(result.content[0].text).toContain('test.txt');
    });
  });

  describe('handleValidateGraph', () => {
    it('throws when requireTier returns false', async () => {
      (licenseService.requireTier as any).mockResolvedValue(false);
      await expect(handleValidateGraph({ graphData: '{}' })).rejects.toThrow('This tool requires a Pro tier license.');
    });

    it('succeeds when requireTier returns true', async () => {
      (licenseService.requireTier as any).mockResolvedValue(true);
      (axios.post as any).mockResolvedValue({
        data: {
          message: 'Graph validated successfully'
        }
      });
      const result = await handleValidateGraph({ graphData: '{}' });
      expect(result.content).toBeDefined();
      expect(result.content[0].text).toContain('Graph validated successfully');
    });
  });
});
