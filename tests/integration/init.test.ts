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

    const configPath = path.join(workspace.root, 'skillz.json');
    expect(await fs.pathExists(configPath)).toBe(true);

    const config = (await fs.readJson(configPath)) as SkillsConfig;
    expect(config.preset).toBe('agentsmd');
    expect(config.targets).toEqual([{ destination: '.skills', deleteExistingFromTarget: true }]);
  });

  it('should create skillz.json with custom target', async () => {
    const result = await execCli(['init', '--target', '.custom-skills', '--no-sync'], {
      cwd: workspace.root,
    });

    expect(result.exitCode).toBe(0);

    const config = (await fs.readJson(path.join(workspace.root, 'skillz.json'))) as SkillsConfig;
    expect(config.targets.map((t) => t.destination)).toContain('.custom-skills');
  });

  it('should add .skillz-cache.json and .skills to .gitignore', async () => {
    await execCli(['init', '--preset', 'agentsmd', '--no-sync'], {
      cwd: workspace.root,
    });

    const gitignorePath = path.join(workspace.root, '.gitignore');
    const gitignoreContent = await fs.readFile(gitignorePath, 'utf-8');
    expect(gitignoreContent).toContain('.skillz-cache.json');
    expect(gitignoreContent).toContain('.skills');
  });

  it('should add .skills even when .gitignore has similar entries', async () => {
    const gitignorePath = path.join(workspace.root, '.gitignore');
    await fs.writeFile(gitignorePath, '.skills-old\n');

    await execCli(['init', '--preset', 'agentsmd', '--no-sync'], {
      cwd: workspace.root,
    });

    const gitignoreContent = await fs.readFile(gitignorePath, 'utf-8');
    const gitignoreLines = gitignoreContent.split(/\r?\n/);
    expect(gitignoreLines).toContain('.skills');
    expect(gitignoreLines).toContain('.skills-old');
  });

  it('should run sync by default after init', async () => {
    const result = await execCli(['init', '--preset', 'agentsmd'], {
      cwd: workspace.root,
    });

    expect(result.exitCode).toBe(0);

    expect(await fs.pathExists(path.join(workspace.root, '.skills/python-expert/SKILL.md'))).toBe(
      true
    );
    expect(await fs.pathExists(path.join(workspace.root, '.skills/react-patterns/SKILL.md'))).toBe(
      true
    );

    const agentsContent = await fs.readFile(workspace.agentsFile, 'utf-8');
    expect(agentsContent).toContain('## Project Context');
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
    expect(config.skillDirectories.map((dir) => dir.localPath)).toContain('.claude/skills');

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

  it('should create skillz.json with cursor preset', async () => {
    const result = await execCli(['init', '--preset', 'cursor', '--no-sync'], {
      cwd: workspace.root,
    });

    expect(result.exitCode).toBe(0);

    const configPath = path.join(workspace.root, 'skillz.json');
    expect(await fs.pathExists(configPath)).toBe(true);

    const config = (await fs.readJson(configPath)) as SkillsConfig;
    expect(config.preset).toBe('cursor');
    expect(config.targets).toEqual([{ destination: '.skills', deleteExistingFromTarget: true }]);
  });

  it('should create skillz.json with claude preset', async () => {
    const result = await execCli(['init', '--preset', 'claude', '--no-sync'], {
      cwd: workspace.root,
    });

    expect(result.exitCode).toBe(0);

    const configPath = path.join(workspace.root, 'skillz.json');
    expect(await fs.pathExists(configPath)).toBe(true);

    const config = (await fs.readJson(configPath)) as SkillsConfig;
    expect(config.preset).toBe('claude');
    expect(config.targets).toEqual([{ destination: '.skills', deleteExistingFromTarget: true }]);
  });

  it('should create skillz.json with aider preset', async () => {
    const result = await execCli(['init', '--preset', 'aider', '--no-sync'], {
      cwd: workspace.root,
    });

    expect(result.exitCode).toBe(0);

    const configPath = path.join(workspace.root, 'skillz.json');
    expect(await fs.pathExists(configPath)).toBe(true);

    const config = (await fs.readJson(configPath)) as SkillsConfig;
    expect(config.preset).toBe('aider');
    expect(config.targets).toEqual([{ destination: '.skills', deleteExistingFromTarget: true }]);
  });

  it('should include global skills directory with --global-skills flag', async () => {
    const result = await execCli(['init', '--preset', 'agentsmd', '--global-skills', '--no-sync'], {
      cwd: workspace.root,
    });

    expect(result.exitCode).toBe(0);

    const configPath = path.join(workspace.root, 'skillz.json');
    expect(await fs.pathExists(configPath)).toBe(true);

    const config = (await fs.readJson(configPath)) as SkillsConfig;
    expect(config.preset).toBe('agentsmd');

    // Should include both default .claude/skills and global ~/.claude/skills
    expect(config.skillDirectories.map((dir) => dir.localPath)).toContain('.claude/skills');

    // Check for global skills directory (should be HOME/.claude/skills)
    const homeDir = process.env.HOME || '~';
    const globalSkillsPath = path.join(homeDir, '.claude/skills');
    expect(config.skillDirectories.map((dir) => dir.localPath)).toContain(globalSkillsPath);
  });

  it('should combine --global-skills with different presets', async () => {
    const result = await execCli(['init', '--preset', 'aider', '--global-skills', '--no-sync'], {
      cwd: workspace.root,
    });

    expect(result.exitCode).toBe(0);

    const config = (await fs.readJson(path.join(workspace.root, 'skillz.json'))) as SkillsConfig;
    expect(config.preset).toBe('aider');
    expect(config.targets).toEqual([{ destination: '.skills', deleteExistingFromTarget: true }]);

    // Should include global skills directory
    const homeDir = process.env.HOME || '~';
    const globalSkillsPath = path.join(homeDir, '.claude/skills');
    expect(config.skillDirectories.map((dir) => dir.localPath)).toContain(globalSkillsPath);
  });

  it('should allow init in subdirectory even when parent has skillz.json', async () => {
    // First, create skillz.json in the root
    await execCli(['init', '--preset', 'agentsmd', '--no-sync'], {
      cwd: workspace.root,
    });

    // Verify parent config exists
    const parentConfigPath = path.join(workspace.root, 'skillz.json');
    expect(await fs.pathExists(parentConfigPath)).toBe(true);

    // Create a subdirectory
    const subDir = path.join(workspace.root, 'subproject');
    await fs.ensureDir(subDir);

    // Create a subdirectory skills folder
    const subSkillsDir = path.join(subDir, '.claude/skills');
    await fs.ensureDir(subSkillsDir);

    // Init in subdirectory should succeed and create a new config
    const result = await execCli(['init', '--preset', 'cursor', '--no-sync'], {
      cwd: subDir,
    });

    expect(result.exitCode).toBe(0);

    // Verify subdirectory has its own config
    const subConfigPath = path.join(subDir, 'skillz.json');
    expect(await fs.pathExists(subConfigPath)).toBe(true);

    // Verify subdirectory config is different from parent
    const subConfig = (await fs.readJson(subConfigPath)) as SkillsConfig;
    expect(subConfig.preset).toBe('cursor');
    expect(subConfig.targets).toEqual([{ destination: '.skills', deleteExistingFromTarget: true }]);

    // Verify parent config is unchanged
    const parentConfig = (await fs.readJson(parentConfigPath)) as SkillsConfig;
    expect(parentConfig.preset).toBe('agentsmd');
    expect(parentConfig.targets).toEqual([
      { destination: '.skills', deleteExistingFromTarget: true },
    ]);
  });
});
