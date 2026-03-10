import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { createMockWorkspace, MockWorkspace } from '../helpers/workspace.js';
import { execCli } from '../helpers/cli.js';
import type { SkillDirectory, Target } from '../../src/types/index.js';
import fs from 'fs-extra';
import path from 'path';

type SkillsConfig = {
  preset?: string;
  targets: Target[];
  skillDirectories: SkillDirectory[];
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

    const config = (await fs.readJson(path.join(workspace.root, 'skillz.json'))) as SkillsConfig;
    expect(config.preset).toBe('agentsmd');
    expect(config.targets.map((t) => t.destination)).toContain('.skills');
  });

  it('should create skillz.json with custom target directory', async () => {
    const result = await execCli(['init', '--target', 'vendor-skills', '--no-sync'], {
      cwd: workspace.root,
    });

    expect(result.exitCode).toBe(0);

    const config = (await fs.readJson(path.join(workspace.root, 'skillz.json'))) as SkillsConfig;
    expect(config.targets.map((t) => t.destination)).toContain('vendor-skills');
  });

  it('should reject custom targets that look like legacy file paths', async () => {
    const result = await execCli(['init', '--target', 'AGENTS.md', '--no-sync'], {
      cwd: workspace.root,
    });

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain('Legacy file target "AGENTS.md" is no longer supported');
  });

  it('should add .skillz-cache.json and .skills to .gitignore', async () => {
    await execCli(['init', '--preset', 'agentsmd', '--no-sync'], {
      cwd: workspace.root,
    });

    const gitignoreContent = await fs.readFile(path.join(workspace.root, '.gitignore'), 'utf-8');
    expect(gitignoreContent).toContain('.skillz-cache.json');
    expect(gitignoreContent).toContain('.skills');
  });

  it('should add .skills even when .gitignore has similar entries', async () => {
    const gitignorePath = path.join(workspace.root, '.gitignore');
    await fs.writeFile(gitignorePath, '.skills-old\n');

    await execCli(['init', '--preset', 'agentsmd', '--no-sync'], {
      cwd: workspace.root,
    });

    const gitignoreLines = (await fs.readFile(gitignorePath, 'utf-8')).split(/\r?\n/);
    expect(gitignoreLines).toContain('.skills');
    expect(gitignoreLines).toContain('.skills-old');
  });

  it('should run sync by default after init', async () => {
    const result = await execCli(['init', '--preset', 'agentsmd'], {
      cwd: workspace.root,
    });

    expect(result.exitCode).toBe(0);
    expect(await fs.pathExists(path.join(workspace.root, '.skills/python-expert'))).toBe(true);
    expect(await fs.pathExists(path.join(workspace.root, '.skills/react-patterns'))).toBe(true);
  });

  it('should create skillz.json with no targets when no preset or target specified', async () => {
    const result = await execCli(['init', '--no-sync'], {
      cwd: workspace.root,
    });

    expect(result.exitCode).toBe(0);

    const config = (await fs.readJson(path.join(workspace.root, 'skillz.json'))) as SkillsConfig;
    expect(config.targets).toEqual([]);
    expect(config.preset).toBeUndefined();
    expect(config.skillDirectories.map((dir) => dir.localPath)).toContain('.claude/skills');
    expect(result.stdout).toContain('No targets configured');
  });

  it('should not run sync when no targets configured', async () => {
    const result = await execCli(['init'], {
      cwd: workspace.root,
    });

    expect(result.exitCode).toBe(0);
    expect(await fs.pathExists(path.join(workspace.root, '.skillz-cache.json'))).toBe(false);
    expect(result.stdout).toContain('No targets configured');
  });

  it('should create skillz.json with cursor preset', async () => {
    const result = await execCli(['init', '--preset', 'cursor', '--no-sync'], {
      cwd: workspace.root,
    });

    expect(result.exitCode).toBe(0);

    const config = (await fs.readJson(path.join(workspace.root, 'skillz.json'))) as SkillsConfig;
    expect(config.preset).toBe('cursor');
    expect(config.targets.map((t) => t.destination)).toContain('.skills');
  });

  it('should create skillz.json with claude preset', async () => {
    const result = await execCli(['init', '--preset', 'claude', '--no-sync'], {
      cwd: workspace.root,
    });

    expect(result.exitCode).toBe(0);

    const config = (await fs.readJson(path.join(workspace.root, 'skillz.json'))) as SkillsConfig;
    expect(config.preset).toBe('claude');
    expect(config.targets.map((t) => t.destination)).toContain('.skills');
  });

  it('should create skillz.json with aider preset', async () => {
    const result = await execCli(['init', '--preset', 'aider', '--no-sync'], {
      cwd: workspace.root,
    });

    expect(result.exitCode).toBe(0);

    const config = (await fs.readJson(path.join(workspace.root, 'skillz.json'))) as SkillsConfig;
    expect(config.preset).toBe('aider');
    expect(config.targets.map((t) => t.destination)).toContain('.skills');
  });

  it('should include global skills directory with --global-skills flag', async () => {
    const result = await execCli(['init', '--preset', 'agentsmd', '--global-skills', '--no-sync'], {
      cwd: workspace.root,
    });

    expect(result.exitCode).toBe(0);

    const config = (await fs.readJson(path.join(workspace.root, 'skillz.json'))) as SkillsConfig;
    const homeDir = process.env.HOME || '~';
    const globalSkillsPath = path.join(homeDir, '.claude/skills');

    expect(config.skillDirectories.map((dir) => dir.localPath)).toContain('.claude/skills');
    expect(config.skillDirectories.map((dir) => dir.localPath)).toContain(globalSkillsPath);
  });

  it('should combine --global-skills with different presets', async () => {
    const result = await execCli(['init', '--preset', 'aider', '--global-skills', '--no-sync'], {
      cwd: workspace.root,
    });

    expect(result.exitCode).toBe(0);

    const config = (await fs.readJson(path.join(workspace.root, 'skillz.json'))) as SkillsConfig;
    const homeDir = process.env.HOME || '~';
    const globalSkillsPath = path.join(homeDir, '.claude/skills');

    expect(config.preset).toBe('aider');
    expect(config.targets.map((t) => t.destination)).toContain('.skills');
    expect(config.skillDirectories.map((dir) => dir.localPath)).toContain(globalSkillsPath);
  });

  it('should allow init in subdirectory even when parent has skillz.json', async () => {
    await execCli(['init', '--preset', 'agentsmd', '--no-sync'], {
      cwd: workspace.root,
    });

    const parentConfigPath = path.join(workspace.root, 'skillz.json');
    expect(await fs.pathExists(parentConfigPath)).toBe(true);

    const subDir = path.join(workspace.root, 'subproject');
    await fs.ensureDir(subDir);
    await fs.ensureDir(path.join(subDir, '.claude/skills'));

    const result = await execCli(['init', '--preset', 'cursor', '--no-sync'], {
      cwd: subDir,
    });

    expect(result.exitCode).toBe(0);

    const subConfig = (await fs.readJson(path.join(subDir, 'skillz.json'))) as SkillsConfig;
    expect(subConfig.preset).toBe('cursor');
    expect(subConfig.targets.map((t) => t.destination)).toContain('.skills');

    const parentConfig = (await fs.readJson(parentConfigPath)) as SkillsConfig;
    expect(parentConfig.preset).toBe('agentsmd');
    expect(parentConfig.targets.map((t) => t.destination)).toContain('.skills');
  });
});
