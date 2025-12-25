import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { createMockWorkspace, MockWorkspace } from '../helpers/workspace.js';
import { execCli } from '../helpers/cli.js';
import fs from 'fs-extra';
import path from 'path';

type SkillsConfig = {
  version: string;
  targets: Array<{ destination: string; syncMode?: string }>;
  skillDirectories: string[];
  additionalSkills: string[];
  ignore: string[];
  skillsSectionName?: string;
};

describe('native sync mode', () => {
  let workspace: MockWorkspace;

  beforeEach(async () => {
    workspace = await createMockWorkspace();
  });

  afterEach(async () => {
    await workspace.cleanup();
  });

  it('should copy skills to target directory', async () => {
    const config: SkillsConfig = {
      version: '2.0',
      targets: [{ destination: '.skills', syncMode: 'native' }],
      skillDirectories: ['.claude/skills'],
      additionalSkills: [],
      ignore: [],
    };

    await fs.writeJson(path.join(workspace.root, 'skillz.json'), config, { spaces: 2 });

    const result = await execCli(['sync'], { cwd: workspace.root });

    expect(result.exitCode).toBe(0);

    // Verify copied directories exist
    const pythonDir = path.join(workspace.root, '.skills/python-expert');
    const reactDir = path.join(workspace.root, '.skills/react-patterns');

    expect(await fs.pathExists(pythonDir)).toBe(true);
    expect(await fs.pathExists(reactDir)).toBe(true);

    // Verify they're real directories, not symlinks
    const pythonStat = await fs.lstat(pythonDir);
    expect(pythonStat.isDirectory()).toBe(true);
    expect(pythonStat.isSymbolicLink()).toBe(false);

    const reactStat = await fs.lstat(reactDir);
    expect(reactStat.isDirectory()).toBe(true);
    expect(reactStat.isSymbolicLink()).toBe(false);

    // Verify SKILL.md files were copied
    expect(await fs.pathExists(path.join(pythonDir, 'SKILL.md'))).toBe(true);
    expect(await fs.pathExists(path.join(reactDir, 'SKILL.md'))).toBe(true);
  });

  it('should abort with error when conflicts exist', async () => {
    const config: SkillsConfig = {
      version: '2.0',
      targets: [{ destination: '.skills', syncMode: 'native' }],
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

    // Verify NO new directories were copied (abort before any operations)
    const reactDir = path.join(workspace.root, '.skills/react-patterns');
    expect(await fs.pathExists(reactDir)).toBe(false);
  });

  it('should list all conflicts in error message', async () => {
    const config: SkillsConfig = {
      version: '2.0',
      targets: [{ destination: '.skills', syncMode: 'native' }],
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

  it('should create cache for native targets', async () => {
    const config: SkillsConfig = {
      version: '2.0',
      targets: [{ destination: '.skills', syncMode: 'native' }],
      skillDirectories: ['.claude/skills'],
      additionalSkills: [],
      ignore: [],
    };

    await fs.writeJson(path.join(workspace.root, 'skillz.json'), config, { spaces: 2 });

    await execCli(['sync'], { cwd: workspace.root });

    // Verify cache file was created
    const cachePath = path.join(workspace.root, '.skillz-cache.json');
    expect(await fs.pathExists(cachePath)).toBe(true);
  });

  it('should detect changes and re-copy when upstream skill changes', async () => {
    const config: SkillsConfig = {
      version: '2.0',
      targets: [{ destination: '.skills', syncMode: 'native' }],
      skillDirectories: ['.claude/skills'],
      additionalSkills: [],
      ignore: [],
    };

    await fs.writeJson(path.join(workspace.root, 'skillz.json'), config, { spaces: 2 });

    // First sync
    await execCli(['sync'], { cwd: workspace.root });

    const copiedSkillPath = path.join(workspace.root, '.skills/python-expert/SKILL.md');
    const originalContent = await fs.readFile(copiedSkillPath, 'utf-8');

    // Modify the source skill
    const sourceSkillPath = path.join(workspace.root, '.claude/skills/python-expert/SKILL.md');
    await fs.writeFile(sourceSkillPath, originalContent + '\n\nNew content added!');

    // Second sync should detect change and re-copy
    const result = await execCli(['sync'], { cwd: workspace.root });

    expect(result.exitCode).toBe(0);

    // Verify the copied skill was updated
    const updatedContent = await fs.readFile(copiedSkillPath, 'utf-8');
    expect(updatedContent).toContain('New content added!');
  });

  it('should not re-copy when skills have not changed', async () => {
    const config: SkillsConfig = {
      version: '2.0',
      targets: [{ destination: '.skills', syncMode: 'native' }],
      skillDirectories: ['.claude/skills'],
      additionalSkills: [],
      ignore: [],
    };

    await fs.writeJson(path.join(workspace.root, 'skillz.json'), config, { spaces: 2 });

    // First sync
    await execCli(['sync'], { cwd: workspace.root });

    // Second sync without changes
    const result = await execCli(['sync'], { cwd: workspace.root });

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('All skills are up to date');
  });

  it('should support mixed targets (some prompt, some native)', async () => {
    const config: SkillsConfig = {
      version: '2.0',
      targets: [
        { destination: 'AGENTS.md', syncMode: 'prompt' },
        { destination: '.skills', syncMode: 'native' },
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

    // Verify native target was copied
    const pythonDir = path.join(workspace.root, '.skills/python-expert');
    expect(await fs.pathExists(pythonDir)).toBe(true);

    const stat = await fs.lstat(pythonDir);
    expect(stat.isDirectory()).toBe(true);
    expect(stat.isSymbolicLink()).toBe(false);

    // Verify cache was created
    const cachePath = path.join(workspace.root, '.skillz-cache.json');
    expect(await fs.pathExists(cachePath)).toBe(true);
  });

  it('should respect --dry-run for native mode', async () => {
    const config: SkillsConfig = {
      version: '2.0',
      targets: [{ destination: '.skills', syncMode: 'native' }],
      skillDirectories: ['.claude/skills'],
      additionalSkills: [],
      ignore: [],
    };

    await fs.writeJson(path.join(workspace.root, 'skillz.json'), config, { spaces: 2 });

    const result = await execCli(['sync', '--dry-run'], { cwd: workspace.root });

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('Dry run mode');
    expect(result.stdout).toContain('Would copy');
    expect(result.stdout).toContain('.skills/');

    // Verify NO directories were copied
    const skillsDir = path.join(workspace.root, '.skills');
    expect(await fs.pathExists(skillsDir)).toBe(false);
  });

  it('should create target directory if it does not exist', async () => {
    const config: SkillsConfig = {
      version: '2.0',
      targets: [{ destination: 'some/nested/skills', syncMode: 'native' }],
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

    // Verify skills were copied inside
    const pythonDir = path.join(targetDir, 'python-expert');
    expect(await fs.pathExists(pythonDir)).toBe(true);
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
      version: '2.0',
      targets: [{ destination: '.skills', syncMode: 'native' }],
      skillDirectories: ['.claude/skills', '.claude/more-skills'],
      additionalSkills: [],
      ignore: [],
    };

    await fs.writeJson(path.join(workspace.root, 'skillz.json'), config, { spaces: 2 });

    const result = await execCli(['sync'], { cwd: workspace.root });

    expect(result.exitCode).toBe(0);

    // Verify all three skills are copied
    const pythonDir = path.join(workspace.root, '.skills/python-expert');
    const reactDir = path.join(workspace.root, '.skills/react-patterns');
    const webDir = path.join(workspace.root, '.skills/web-expert');

    expect(await fs.pathExists(pythonDir)).toBe(true);
    expect(await fs.pathExists(reactDir)).toBe(true);
    expect(await fs.pathExists(webDir)).toBe(true);
  });
});
