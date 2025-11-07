import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { createMockWorkspace, MockWorkspace } from '../helpers/workspace.js';
import { execCli } from '../helpers/cli.js';
import fs from 'fs-extra';
import path from 'path';

type SkillsConfig = {
  preset?: string;
  targets: string[];
  skillDirectories: string[];
};

describe('init command', () => {
  let workspace: MockWorkspace;

  beforeEach(async () => {
    workspace = await createMockWorkspace();
  });

  afterEach(async () => {
    await workspace.cleanup();
  });

  it('should create skillz.json with agentsmd preset', async () => {
    const result = await execCli(['init', '--preset', 'agentsmd', '--no-sync'], {
      cwd: workspace.root,
    });

    expect(result.exitCode).toBe(0);

    const configPath = path.join(workspace.root, 'skillz.json');
    expect(await fs.pathExists(configPath)).toBe(true);

    const config = (await fs.readJson(configPath)) as SkillsConfig;
    expect(config.preset).toBe('agentsmd');
    expect(config.targets).toContain('AGENTS.md');
  });

  it('should create skillz.json with custom target', async () => {
    const result = await execCli(['init', '--target', '.cursorrules', '--no-sync'], {
      cwd: workspace.root,
    });

    expect(result.exitCode).toBe(0);

    const config = (await fs.readJson(path.join(workspace.root, 'skillz.json'))) as SkillsConfig;
    expect(config.targets).toContain('.cursorrules');
  });

  it('should add .skillz-cache.json to .gitignore', async () => {
    await execCli(['init', '--preset', 'agentsmd', '--no-sync'], {
      cwd: workspace.root,
    });

    const gitignorePath = path.join(workspace.root, '.gitignore');
    const gitignoreContent = await fs.readFile(gitignorePath, 'utf-8');
    expect(gitignoreContent).toContain('.skillz-cache.json');
  });

  it('should run sync by default after init', async () => {
    const result = await execCli(['init', '--preset', 'agentsmd'], {
      cwd: workspace.root,
    });

    expect(result.exitCode).toBe(0);

    // Check AGENTS.md was updated with managed section
    const agentsContent = await fs.readFile(workspace.agentsFile, 'utf-8');
    expect(agentsContent).toContain('## Additional Instructions');
    expect(agentsContent).toContain('python-expert');
    expect(agentsContent).toContain('react-patterns');
    expect(agentsContent).toMatchSnapshot();
  });

  it('should create skillz.json with no targets when no preset or target specified', async () => {
    const result = await execCli(['init', '--no-sync'], {
      cwd: workspace.root,
    });

    expect(result.exitCode).toBe(0);

    const configPath = path.join(workspace.root, 'skillz.json');
    expect(await fs.pathExists(configPath)).toBe(true);

    const config = (await fs.readJson(configPath)) as SkillsConfig;
    expect(config.targets).toEqual([]);
    expect(config.preset).toBeUndefined();
    expect(config.skillDirectories).toContain('.claude/skills');

    // Output should mention skill management only
    expect(result.stdout).toContain('No targets configured');
    expect(result.stdout).toContain('skillz create');
    expect(result.stdout).toContain('skillz list');
  });

  it('should not run sync when no targets configured', async () => {
    const result = await execCli(['init'], {
      cwd: workspace.root,
    });

    expect(result.exitCode).toBe(0);

    // Should not create cache file since no sync happened
    const cachePath = path.join(workspace.root, '.skillz-cache.json');
    expect(await fs.pathExists(cachePath)).toBe(false);

    // Output should mention no targets
    expect(result.stdout).toContain('No targets configured');
  });
});
