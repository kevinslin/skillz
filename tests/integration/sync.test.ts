import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { createMockWorkspace, MockWorkspace } from '../helpers/workspace.js';
import { execCli } from '../helpers/cli.js';
import type { Config, CacheFile } from '../../src/types/index.js';
import fs from 'fs-extra';
import path from 'path';

describe('sync command', () => {
  let workspace: MockWorkspace;

  beforeEach(async () => {
    workspace = await createMockWorkspace();
    // Initialize config
    await execCli(['init', '--preset', 'agentsmd', '--no-sync'], {
      cwd: workspace.root,
    });
  });

  afterEach(async () => {
    await workspace.cleanup();
  });

  it('should sync skills to AGENTS.md', async () => {
    const result = await execCli(['sync'], {
      cwd: workspace.root,
    });

    expect(result.exitCode).toBe(0);

    const agentsContent = await fs.readFile(workspace.agentsFile, 'utf-8');
    expect(agentsContent).toContain('## Additional Instructions');
    expect(agentsContent).toContain('python-expert');
    expect(agentsContent).toContain('react-patterns');
  });

  it('should create cache file after sync', async () => {
    await execCli(['sync'], {
      cwd: workspace.root,
    });

    const cachePath = path.join(workspace.root, '.skillz-cache.json');
    expect(await fs.pathExists(cachePath)).toBe(true);

    const cache = (await fs.readJson(cachePath)) as CacheFile;
    expect(cache.skills['python-expert']).toBeDefined();
    expect(cache.skills['react-patterns']).toBeDefined();
  });

  it('should preserve content outside managed section', async () => {
    await execCli(['sync'], {
      cwd: workspace.root,
    });

    const updatedContent = await fs.readFile(workspace.agentsFile, 'utf-8');
    expect(updatedContent).toContain('My Project Agents');
    expect(updatedContent).toContain('Project Context');
    expect(updatedContent).toContain('## Additional Instructions');
  });

  it('should detect and sync only changed skills', async () => {
    // First sync
    await execCli(['sync'], {
      cwd: workspace.root,
    });

    // Modify one skill
    const pythonSkillPath = path.join(workspace.skillsDir, 'python-expert', 'SKILL.md');
    let skillContent = await fs.readFile(pythonSkillPath, 'utf-8');
    skillContent += '\n\n## New Section\n\nNew content here.';
    await fs.writeFile(pythonSkillPath, skillContent);

    // Second sync with verbose
    const result = await execCli(['sync', '--verbose'], {
      cwd: workspace.root,
    });

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('modified');
  });

  it('should support --dry-run mode', async () => {
    const originalContent = await fs.readFile(workspace.agentsFile, 'utf-8');

    // Delete cache to simulate fresh state
    const cachePath = path.join(workspace.root, '.skillz-cache.json');
    if (await fs.pathExists(cachePath)) {
      await fs.remove(cachePath);
    }

    const result = await execCli(['sync', '--dry-run'], {
      cwd: workspace.root,
    });

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('Dry run');

    // File should not be modified
    const afterContent = await fs.readFile(workspace.agentsFile, 'utf-8');
    expect(afterContent).toBe(originalContent);
  });

  it('should respect glob ignore patterns from config', async () => {
    const ignoredDir = path.join(workspace.skillsDir, 'sandbox.test');
    await fs.ensureDir(ignoredDir);
    await fs.writeFile(
      path.join(ignoredDir, 'SKILL.md'),
      `---
name: sandbox-test
description: Skill used to verify *.test ignore patterns
---
`
    );

    const configPath = path.join(workspace.root, 'skillz.json');
    const config = (await fs.readJson(configPath)) as Config;
    config.ignore = ['*.test'];
    await fs.writeJson(configPath, config, { spaces: 2 });

    const result = await execCli(['sync'], {
      cwd: workspace.root,
    });

    expect(result.exitCode).toBe(0);
    // CLI outputs progress to stderr, which is normal - just check no errors occurred
    expect(result.stderr).not.toContain('Error');
    expect(result.stderr).not.toContain('Failed');

    const agentsContent = await fs.readFile(workspace.agentsFile, 'utf-8');
    expect(agentsContent).not.toContain('sandbox-test');
  });
});
