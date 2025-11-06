import { describe, it, expect, beforeAll, jest } from '@jest/globals';
import path from 'path';
import fs from 'fs-extra';
import { createMockWorkspace } from '../helpers/workspace.js';

const mockSpinner = {
  start: () => ({
    succeed: jest.fn(),
    fail: jest.fn(),
  }),
};

jest.unstable_mockModule('../../src/utils/logger.js', () => ({
  __esModule: true,
  debug: jest.fn(),
  warning: jest.fn(),
  info: jest.fn(),
  success: jest.fn(),
  error: jest.fn(),
  spinner: () => mockSpinner,
  formatSkillName: (value: string) => value,
  formatChangeType: (value: string) => value,
  setVerbose: jest.fn(),
}));

let scanDirectory: typeof import('../../src/core/skill-scanner.js').scanDirectory;

beforeAll(async () => {
  ({ scanDirectory } = await import('../../src/core/skill-scanner.js'));
});

describe('scanDirectory ignore patterns', () => {
  it('treats ignore patterns as globs and skips matching directories', async () => {
    const workspace = await createMockWorkspace();
    try {
      const ignoredDir = path.join(workspace.skillsDir, 'experimental.test');
      await fs.ensureDir(ignoredDir);
      await fs.writeFile(
        path.join(ignoredDir, 'SKILL.md'),
        `---
name: experimental-test
description: Experimental skill used for testing ignore globs
---
`
      );

      const result = await scanDirectory(workspace.skillsDir, ['*.test']);

      expect(result.some((dir) => dir.endsWith('experimental.test'))).toBe(false);
      expect(result.length).toBeGreaterThan(0);
    } finally {
      await workspace.cleanup();
    }
  });
});
