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
    await execCli(['init', '--preset', 'agentsmd', '--no-sync'], {
      cwd: workspace.root,
    });
  });

  afterEach(async () => {
    await workspace.cleanup();
  });

  it('should sync skills to the default preset target directory', async () => {
    const result = await execCli(['sync'], {
      cwd: workspace.root,
    });

    expect(result.exitCode).toBe(0);
    expect(await syncedSkillNames(workspace.root)).toEqual(['python-expert', 'react-patterns']);
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

  it('should detect and sync only changed skills', async () => {
    await execCli(['sync'], {
      cwd: workspace.root,
    });

    const pythonSkillPath = path.join(workspace.skillsDir, 'python-expert', 'SKILL.md');
    let skillContent = await fs.readFile(pythonSkillPath, 'utf-8');
    skillContent += '\n\n## New Section\n\nNew content here.';
    await fs.writeFile(pythonSkillPath, skillContent);

    const result = await execCli(['sync', '--verbose'], {
      cwd: workspace.root,
    });

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('modified');

    const copiedSkillPath = path.join(workspace.root, '.skills/python-expert/SKILL.md');
    expect(await fs.readFile(copiedSkillPath, 'utf-8')).toContain('New content here.');
  });

  it('should support --dry-run mode', async () => {
    const result = await execCli(['sync', '--dry-run'], {
      cwd: workspace.root,
    });

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('Dry run');
    expect(await fs.pathExists(path.join(workspace.root, '.skills'))).toBe(false);
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
    expect(await syncedSkillNames(workspace.root)).toEqual(['python-expert', 'react-patterns']);
  });

  it('should apply ignore patterns per skillDirectory', async () => {
    const localIgnoredDir = path.join(workspace.skillsDir, 'sandbox-local');
    await fs.ensureDir(localIgnoredDir);
    await fs.writeFile(
      path.join(localIgnoredDir, 'SKILL.md'),
      `---
name: sandbox-local
description: Skill ignored only in the first configured directory
---
`
    );

    const secondarySkillsDir = path.join(workspace.root, '.claude', 'more-skills');
    const secondaryMatchingDir = path.join(secondarySkillsDir, 'sandbox-remote');
    await fs.ensureDir(secondaryMatchingDir);
    await fs.writeFile(
      path.join(secondaryMatchingDir, 'SKILL.md'),
      `---
name: sandbox-remote
description: Skill should still sync from second configured directory
---
`
    );

    const configPath = path.join(workspace.root, 'skillz.json');
    const config = (await fs.readJson(configPath)) as Config;
    config.ignore = [];
    config.skillDirectories = [
      { localPath: '.claude/skills', ignore: ['sandbox-*'] },
      { localPath: '.claude/more-skills' },
    ];
    config.additionalSkills = [];
    await fs.writeJson(configPath, config, { spaces: 2 });

    const result = await execCli(['sync'], {
      cwd: workspace.root,
    });

    expect(result.exitCode).toBe(0);
    expect(await syncedSkillNames(workspace.root)).toEqual([
      'python-expert',
      'react-patterns',
      'sandbox-remote',
    ]);
  });

  it('should error when syncFromRoot skill directory lacks SKILL.md', async () => {
    const configPath = path.join(workspace.root, 'skillz.json');
    const config = (await fs.readJson(configPath)) as Config;
    config.skillDirectories = [{ localPath: '.claude/skills', syncFromRoot: true }];
    await fs.writeJson(configPath, config, { spaces: 2 });

    const result = await execCli(['sync'], {
      cwd: workspace.root,
    });

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain('SKILL.md');
    expect(result.stderr).toContain('syncFromRoot');
  });

  it('should sync skill from root when syncFromRoot is enabled', async () => {
    const rootSkillDir = path.join(workspace.root, 'root-skill');
    await fs.ensureDir(rootSkillDir);
    await fs.writeFile(
      path.join(rootSkillDir, 'SKILL.md'),
      `---
name: root-skill
description: Root-level skill directory
---

# Root Skill
`
    );

    const nestedSkillDir = path.join(rootSkillDir, 'nested-skill');
    await fs.ensureDir(nestedSkillDir);
    await fs.writeFile(
      path.join(nestedSkillDir, 'SKILL.md'),
      `---
name: nested-skill
description: Nested skill that should be ignored
---
`
    );

    const configPath = path.join(workspace.root, 'skillz.json');
    const config = (await fs.readJson(configPath)) as Config;
    config.skillDirectories = [{ localPath: 'root-skill', syncFromRoot: true }];
    config.additionalSkills = [];
    await fs.writeJson(configPath, config, { spaces: 2 });

    const result = await execCli(['sync'], {
      cwd: workspace.root,
    });

    expect(result.exitCode).toBe(0);
    expect(await syncedSkillNames(workspace.root)).toEqual(['root-skill']);
  });

  it('should sync only skills listed in skillDirectories include', async () => {
    const configPath = path.join(workspace.root, 'skillz.json');
    const config = (await fs.readJson(configPath)) as Config;
    config.skillDirectories = [
      {
        localPath: '.claude/skills',
        include: ['python-expert'],
      },
    ];
    config.additionalSkills = [];
    await fs.writeJson(configPath, config, { spaces: 2 });

    const result = await execCli(['sync'], {
      cwd: workspace.root,
    });

    expect(result.exitCode).toBe(0);
    expect(await syncedSkillNames(workspace.root)).toEqual(['python-expert']);

    const cache = (await fs.readJson(path.join(workspace.root, '.skillz-cache.json'))) as CacheFile;
    expect(cache.skills['python-expert']).toBeDefined();
    expect(cache.skills['react-patterns']).toBeUndefined();
  });

  it('should sync only specified skills with --only flag', async () => {
    const result = await execCli(['sync', '--only', 'python-expert'], {
      cwd: workspace.root,
    });

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('Filtering to 1 skill(s): python-expert');
    expect(await syncedSkillNames(workspace.root)).toEqual(['python-expert']);
  });

  it('should error when --only specifies non-existent skill', async () => {
    const result = await execCli(['sync', '--only', 'non-existent-skill'], {
      cwd: workspace.root,
    });

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain('No matching skills found');
  });

  it('should resolve skillz.json from parent directories', async () => {
    const nestedDir = path.join(workspace.root, 'nested', 'inner');
    await fs.ensureDir(nestedDir);

    const result = await execCli(['sync'], {
      cwd: nestedDir,
    });

    expect(result.exitCode).toBe(0);
    expect(await syncedSkillNames(workspace.root)).toEqual(['python-expert', 'react-patterns']);
  });

  it('should detect config changes and trigger sync', async () => {
    await execCli(['sync'], {
      cwd: workspace.root,
    });

    const noChangeResult = await execCli(['sync'], {
      cwd: workspace.root,
    });
    expect(noChangeResult.exitCode).toBe(0);
    expect(noChangeResult.stdout).toContain('All skills are up to date');

    const configPath = path.join(workspace.root, 'skillz.json');
    const config = (await fs.readJson(configPath)) as Config;
    config.ignore = ['*.experimental'];
    await fs.writeJson(configPath, config, { spaces: 2 });

    const configChangeResult = await execCli(['sync', '--verbose'], {
      cwd: workspace.root,
    });

    expect(configChangeResult.exitCode).toBe(0);
    expect(configChangeResult.stdout).toContain('configuration changed');
    expect(configChangeResult.stdout).toContain(
      'Configuration file (skillz.json) has been modified'
    );
  });

  it('should respect --force flag and bypass change detection', async () => {
    await execCli(['sync'], {
      cwd: workspace.root,
    });

    const noChangeResult = await execCli(['sync'], {
      cwd: workspace.root,
    });
    expect(noChangeResult.stdout).toContain('All skills are up to date');

    const forceResult = await execCli(['sync', '--force'], {
      cwd: workspace.root,
    });

    expect(forceResult.exitCode).toBe(0);
    expect(forceResult.stdout).toContain('Force mode');
    expect(forceResult.stdout).not.toContain('All skills are up to date');
  });
});

async function syncedSkillNames(root: string, target = '.skills'): Promise<string[]> {
  const targetDir = path.join(root, target);
  if (!(await fs.pathExists(targetDir))) {
    return [];
  }

  const entries = await fs.readdir(targetDir);
  return entries.sort();
}
