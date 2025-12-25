import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { createMockWorkspace, MockWorkspace } from '../helpers/workspace.js';
import { execCli } from '../helpers/cli.js';
import fs from 'fs-extra';
import path from 'path';

type SkillsConfig = {
  version: string;
  targets: Array<{ name: string; syncMode?: string }>;
  skillDirectories: string[];
  additionalSkills: string[];
  ignore: string[];
  skillsSectionName?: string;
};

describe('symlink sync mode', () => {
  let workspace: MockWorkspace;

  beforeEach(async () => {
    workspace = await createMockWorkspace();
  });

  afterEach(async () => {
    await workspace.cleanup();
  });

  it('should symlink skills to target directory', async () => {
    // Create config with symlink target
    const config: SkillsConfig = {
      version: '1.0',
      targets: [{ name: '.skills', syncMode: 'symlink' }],
      skillDirectories: ['.claude/skills'],
      additionalSkills: [],
      ignore: [],
    };

    await fs.writeJson(path.join(workspace.root, 'skillz.json'), config, { spaces: 2 });

    const result = await execCli(['sync'], { cwd: workspace.root });

    expect(result.exitCode).toBe(0);

    // Verify symlinks exist
    const pythonLink = path.join(workspace.root, '.skills/python-expert');
    const reactLink = path.join(workspace.root, '.skills/react-patterns');

    expect(await fs.pathExists(pythonLink)).toBe(true);
    expect(await fs.pathExists(reactLink)).toBe(true);

    // Verify they're symlinks pointing to correct location
    const pythonStat = await fs.lstat(pythonLink);
    expect(pythonStat.isSymbolicLink()).toBe(true);

    const reactStat = await fs.lstat(reactLink);
    expect(reactStat.isSymbolicLink()).toBe(true);
  });

  it('should abort with error when conflicts exist', async () => {
    const config: SkillsConfig = {
      version: '1.0',
      targets: [{ name: '.skills', syncMode: 'symlink' }],
      skillDirectories: ['.claude/skills'],
      additionalSkills: [],
      ignore: [],
    };

    await fs.writeJson(path.join(workspace.root, 'skillz.json'), config, { spaces: 2 });

    // Create conflicting directory
    const conflictDir = path.join(workspace.root, '.skills/python-expert');
    await fs.ensureDir(conflictDir);
    await fs.writeFile(path.join(conflictDir, 'fake.txt'), 'conflict');

    const result = await execCli(['sync'], { cwd: workspace.root });

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain('destination conflicts detected');
    expect(result.stderr).toContain('python-expert');

    // Verify NO symlinks were created (abort before any operations)
    const reactLink = path.join(workspace.root, '.skills/react-patterns');
    const reactLinkExists = await fs.pathExists(reactLink);

    // If it exists, verify it's not a symlink (it's the old conflict directory)
    if (reactLinkExists) {
      const stat = await fs.lstat(reactLink);
      expect(stat.isSymbolicLink()).toBe(false);
    }
  });

  it('should list all conflicts in error message', async () => {
    const config: SkillsConfig = {
      version: '1.0',
      targets: [{ name: '.skills', syncMode: 'symlink' }],
      skillDirectories: ['.claude/skills'],
      additionalSkills: [],
      ignore: [],
    };

    await fs.writeJson(path.join(workspace.root, 'skillz.json'), config, { spaces: 2 });

    // Create multiple conflicts
    await fs.ensureDir(path.join(workspace.root, '.skills/python-expert'));
    await fs.ensureDir(path.join(workspace.root, '.skills/react-patterns'));

    const result = await execCli(['sync'], { cwd: workspace.root });

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain('python-expert');
    expect(result.stderr).toContain('react-patterns');
    expect(result.stderr).toContain('destination conflicts detected');
  });

  it('should skip cache for symlink targets', async () => {
    const config: SkillsConfig = {
      version: '1.0',
      targets: [{ name: '.skills', syncMode: 'symlink' }],
      skillDirectories: ['.claude/skills'],
      additionalSkills: [],
      ignore: [],
    };

    await fs.writeJson(path.join(workspace.root, 'skillz.json'), config, { spaces: 2 });

    await execCli(['sync'], { cwd: workspace.root });

    // Verify cache file was NOT created
    const cachePath = path.join(workspace.root, '.skillz-cache.json');
    expect(await fs.pathExists(cachePath)).toBe(false);
  });

  it('should support mixed targets (some prompt, some symlink)', async () => {
    const config: SkillsConfig = {
      version: '1.0',
      targets: [
        { name: 'AGENTS.md', syncMode: 'prompt' },
        { name: '.skills', syncMode: 'symlink' },
      ],
      skillDirectories: ['.claude/skills'],
      additionalSkills: [],
      ignore: [],
      skillsSectionName: '## Additional Instructions',
    };

    await fs.writeJson(path.join(workspace.root, 'skillz.json'), config, { spaces: 2 });

    const result = await execCli(['sync'], { cwd: workspace.root });

    expect(result.exitCode).toBe(0);

    // Verify prompt target was written
    const agentsContent = await fs.readFile(workspace.agentsFile, 'utf-8');
    expect(agentsContent).toContain('## Additional Instructions');
    expect(agentsContent).toContain('python-expert');

    // Verify symlinks were created
    const pythonLink = path.join(workspace.root, '.skills/python-expert');
    expect(await fs.pathExists(pythonLink)).toBe(true);

    const stat = await fs.lstat(pythonLink);
    expect(stat.isSymbolicLink()).toBe(true);

    // Verify cache was created (for prompt target)
    const cachePath = path.join(workspace.root, '.skillz-cache.json');
    expect(await fs.pathExists(cachePath)).toBe(true);
  });

  it('should respect --dry-run for symlink mode', async () => {
    const config: SkillsConfig = {
      version: '1.0',
      targets: [{ name: '.skills', syncMode: 'symlink' }],
      skillDirectories: ['.claude/skills'],
      additionalSkills: [],
      ignore: [],
    };

    await fs.writeJson(path.join(workspace.root, 'skillz.json'), config, { spaces: 2 });

    const result = await execCli(['sync', '--dry-run'], { cwd: workspace.root });

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('Dry run mode');
    expect(result.stdout).toContain('Would symlink');
    expect(result.stdout).toContain('.skills/');

    // Verify NO symlinks were created
    const skillsDir = path.join(workspace.root, '.skills');
    expect(await fs.pathExists(skillsDir)).toBe(false);
  });

  it('should create target directory if it does not exist', async () => {
    const config: SkillsConfig = {
      version: '1.0',
      targets: [{ name: 'some/nested/skills', syncMode: 'symlink' }],
      skillDirectories: ['.claude/skills'],
      additionalSkills: [],
      ignore: [],
    };

    await fs.writeJson(path.join(workspace.root, 'skillz.json'), config, { spaces: 2 });

    const result = await execCli(['sync'], { cwd: workspace.root });

    expect(result.exitCode).toBe(0);

    // Verify directory was created
    const targetDir = path.join(workspace.root, 'some/nested/skills');
    expect(await fs.pathExists(targetDir)).toBe(true);

    // Verify symlinks were created inside
    const pythonLink = path.join(targetDir, 'python-expert');
    expect(await fs.pathExists(pythonLink)).toBe(true);
  });

  it('should detect broken symlinks as conflicts', async () => {
    const config: SkillsConfig = {
      version: '1.0',
      targets: [{ name: '.skills', syncMode: 'symlink' }],
      skillDirectories: ['.claude/skills'],
      additionalSkills: [],
      ignore: [],
    };

    await fs.writeJson(path.join(workspace.root, 'skillz.json'), config, { spaces: 2 });

    // Create broken symlink
    const skillsDir = path.join(workspace.root, '.skills');
    await fs.ensureDir(skillsDir);
    const brokenLink = path.join(skillsDir, 'python-expert');
    await fs.symlink('/nonexistent/path', brokenLink);

    const result = await execCli(['sync'], { cwd: workspace.root });

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain('destination conflicts detected');
    expect(result.stderr).toContain('python-expert');
  });

  it('should handle multiple skill directories without name conflicts', async () => {
    // Create a second skill directory with different skill
    const secondSkillDir = path.join(workspace.root, '.claude/more-skills');
    const webSkillDir = path.join(secondSkillDir, 'web-expert');
    await fs.ensureDir(webSkillDir);
    await fs.writeFile(
      path.join(webSkillDir, 'SKILL.md'),
      `---
name: web-expert
description: Expert in web development
---

Web development best practices.`
    );

    const config: SkillsConfig = {
      version: '1.0',
      targets: [{ name: '.skills', syncMode: 'symlink' }],
      skillDirectories: ['.claude/skills', '.claude/more-skills'],
      additionalSkills: [],
      ignore: [],
    };

    await fs.writeJson(path.join(workspace.root, 'skillz.json'), config, { spaces: 2 });

    const result = await execCli(['sync'], { cwd: workspace.root });

    expect(result.exitCode).toBe(0);

    // Verify all three skills are symlinked
    const pythonLink = path.join(workspace.root, '.skills/python-expert');
    const reactLink = path.join(workspace.root, '.skills/react-patterns');
    const webLink = path.join(workspace.root, '.skills/web-expert');

    expect(await fs.pathExists(pythonLink)).toBe(true);
    expect(await fs.pathExists(reactLink)).toBe(true);
    expect(await fs.pathExists(webLink)).toBe(true);
  });
});
