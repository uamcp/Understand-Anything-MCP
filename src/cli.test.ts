import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import axios from 'axios';
import fs from 'fs';
import { run } from '../src/cli.js';
import { config } from '../src/config.js';

vi.mock('axios');
vi.mock('../src/services/license.js', () => ({
  requireTier: vi.fn().mockResolvedValue(true)
}));
vi.mock('fs', async (importOriginal) => {
  const actual = await importOriginal<typeof import('fs')>();
  return {
    ...actual,
    default: {
      ...actual,
      existsSync: vi.fn(),
      readFileSync: vi.fn(),
    }
  };
});
vi.mock('fs/promises', async (importOriginal) => {
  const actual = await importOriginal<typeof import('fs/promises')>();
  return {
    ...actual,
    default: {
      ...actual,
      readFile: vi.fn().mockResolvedValue(JSON.stringify({ rules: [] }))
    }
  };
});

describe('CI Gateway (cli.ts)', () => {
    let originalArgv: string[];
    let exitSpy: any;
    let consoleLogSpy: any;
    let consoleWarnSpy: any;
    let consoleErrorSpy: any;

    beforeEach(() => {
        originalArgv = [...process.argv];
        process.argv = ['node', 'cli.js', '--pr-diff=test.diff'];
        
        // Mock config
        config.licenseKey = 'pro_key_123';
        config.projectPath = '/mock/project';

        // Mock process.exit
        exitSpy = vi.spyOn(process, 'exit').mockImplementation((code?: number) => {
            throw new Error(`process.exit called with ${code}`);
        });

        consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
        consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
        consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
        
        // Mock fs default behavior
        vi.mocked(fs.existsSync).mockReturnValue(true);
        vi.mocked(fs.readFileSync).mockImplementation((path) => {
            if (path === 'test.diff') return '+++ b/src/test.ts\n--- a/src/old.ts';
            if (path.toString().includes('knowledge-graph.json')) return JSON.stringify({ nodes: {} });
            return '';
        });
    });

    afterEach(() => {
        process.argv = originalArgv;
        vi.restoreAllMocks();
    });

    it('fails open (exit 0) if no pro license is provided', async () => {
        config.licenseKey = 'free';
        await expect(run()).rejects.toThrow('process.exit called with 0');
        expect(consoleWarnSpy).toHaveBeenCalledWith(expect.stringContaining('Pro license required'));
    });

    it('fails open (exit 0) if the backend is unreachable', async () => {
        vi.mocked(axios.post).mockRejectedValueOnce(new Error('Network Error'));
        await expect(run()).rejects.toThrow('process.exit called with 0');
        expect(consoleWarnSpy).toHaveBeenCalledWith(expect.stringContaining('Backend unreachable'));
    });

    it('blocks (exit 1) if high risk is detected via impacted files > 50', async () => {
        // Mock 51 impacted files from backend
        const mockImpacted = Array(51).fill('file.ts').map((f, i) => `${i}_${f}`);
        vi.mocked(axios.post).mockResolvedValueOnce({ data: { impacted: mockImpacted } });
        
        await expect(run()).rejects.toThrow('process.exit called with 1');
        expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('MERGE BLOCKED: High Risk Detected'));
    });
    
    it('approves (exit 0) if risk is low', async () => {
        vi.mocked(axios.post).mockResolvedValueOnce({ data: { impacted: ['just_one_file.ts'] } });
        
        await expect(run()).rejects.toThrow('process.exit called with 0');
        expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Approved. Risk is LOW.'));
    });
});
