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

  function targetSkillPath(skillName: string): string {
    return path.join(workspace.root, '.skills', skillName);
  }

  async function expectSynced(skillName: string): Promise<void> {
    expect(await fs.pathExists(path.join(targetSkillPath(skillName), 'SKILL.md'))).toBe(true);
  }

  async function expectNotSynced(skillName: string): Promise<void> {
    expect(await fs.pathExists(targetSkillPath(skillName))).toBe(false);
  }

  it('should copy skills to the default target directory', async () => {
    const result = await execCli(['sync'], {
      cwd: workspace.root,
    });

    expect(result.exitCode).toBe(0);
    await expectSynced('python-expert');
    await expectSynced('react-patterns');

    const agentsContent = await fs.readFile(workspace.agentsFile, 'utf-8');
    expect(agentsContent).toContain('## Project Context');
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

  it('should reject removed sync configuration fields', async () => {
    const configPath = path.join(workspace.root, 'skillz.json');
    const config = (await fs.readJson(configPath)) as Config & {
      syncMode?: string;
      targets: Array<Config['targets'][number] & { template?: string }>;
    };
    config.syncMode = 'prompt';
    config.targets[0].template = 'default';
    await fs.writeJson(configPath, config, { spaces: 2 });

    const result = await execCli(['sync'], {
      cwd: workspace.root,
    });

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain('removed config fields are no longer supported');
    expect(result.stderr).toContain('syncMode');
    expect(result.stderr).toContain('targets[0].template');
  });

  it('should detect and sync changed skills', async () => {
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

    const copiedSkill = await fs.readFile(
      path.join(targetSkillPath('python-expert'), 'SKILL.md'),
      'utf-8'
    );
    expect(copiedSkill).toContain('New content here.');
  });

  it('should support --dry-run mode', async () => {
    const result = await execCli(['sync', '--dry-run'], {
      cwd: workspace.root,
    });

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('Dry run');
    await expectNotSynced('python-expert');
    await expectNotSynced('react-patterns');
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
    expect(result.stderr).not.toContain('Error');
    expect(result.stderr).not.toContain('Failed');
    await expectNotSynced('sandbox-test');
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
    await expectNotSynced('sandbox-local');
    await expectSynced('sandbox-remote');
    await expectSynced('python-expert');
    await expectSynced('react-patterns');
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

Root skill content.
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

# Nested Skill
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
    await expectSynced('root-skill');
    await expectNotSynced('nested-skill');
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
    await expectSynced('python-expert');
    await expectNotSynced('react-patterns');

    const cachePath = path.join(workspace.root, '.skillz-cache.json');
    const cache = (await fs.readJson(cachePath)) as CacheFile;
    expect(cache.skills['python-expert']).toBeDefined();
    expect(cache.skills['react-patterns']).toBeUndefined();
  });

  it('should remove stale target skills when the current skill set becomes empty', async () => {
    await execCli(['sync'], {
      cwd: workspace.root,
    });

    await expectSynced('python-expert');
    await expectSynced('react-patterns');

    const configPath = path.join(workspace.root, 'skillz.json');
    const config = (await fs.readJson(configPath)) as Config;
    config.skillDirectories = [
      {
        localPath: '.claude/skills',
        include: [],
      },
    ];
    config.additionalSkills = [];
    await fs.writeJson(configPath, config, { spaces: 2 });

    const result = await execCli(['sync'], {
      cwd: workspace.root,
    });

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('No skills found');
    expect(result.stdout).toContain('Continuing sync with empty skill set');
    expect(result.stdout).toContain('removed skill(s)');

    await expectNotSynced('python-expert');
    await expectNotSynced('react-patterns');

    const cachePath = path.join(workspace.root, '.skillz-cache.json');
    expect(await fs.pathExists(cachePath)).toBe(true);
    const cache = (await fs.readJson(cachePath)) as CacheFile;
    expect(Object.keys(cache.skills)).toEqual([]);
  });

  it('should sync only specified skills with --only flag', async () => {
    const result = await execCli(['sync', '--only', 'python-expert'], {
      cwd: workspace.root,
    });

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('Filtering to 1 skill(s): python-expert');

    await expectSynced('python-expert');
    await expectNotSynced('react-patterns');

    const cachePath = path.join(workspace.root, '.skillz-cache.json');
    const cache = (await fs.readJson(cachePath)) as CacheFile;
    expect(cache.skills['python-expert']).toBeDefined();
    expect(cache.skills['react-patterns']).toBeUndefined();
  });

  it('should sync multiple skills with multiple --only flags', async () => {
    const result = await execCli(
      ['sync', '--only', 'python-expert', '--only', 'react-patterns', '--verbose'],
      {
        cwd: workspace.root,
      }
    );

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('Filtering to 2 skill(s): python-expert, react-patterns');

    await expectSynced('python-expert');
    await expectSynced('react-patterns');

    const cachePath = path.join(workspace.root, '.skillz-cache.json');
    const cache = (await fs.readJson(cachePath)) as CacheFile;
    expect(cache.skills['python-expert']).toBeDefined();
    expect(cache.skills['react-patterns']).toBeDefined();
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
    await expectSynced('python-expert');
    await expectSynced('react-patterns');
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
    config.ignore = ['*.never'];
    await fs.writeJson(configPath, config, { spaces: 2 });

    const configChangeResult = await execCli(['sync', '--verbose'], {
      cwd: workspace.root,
    });

    expect(configChangeResult.exitCode).toBe(0);
    expect(configChangeResult.stdout).toContain('configuration changed');
    expect(configChangeResult.stdout).toContain(
      'Configuration file (skillz.json) has been modified'
    );

    const cachePath = path.join(workspace.root, '.skillz-cache.json');
    const cache = (await fs.readJson(cachePath)) as CacheFile;
    expect(cache.configHash).toBeDefined();
    expect(typeof cache.configHash).toBe('string');
  });

  it('should cache config hash and detect subsequent config changes', async () => {
    await execCli(['sync'], {
      cwd: workspace.root,
    });

    const cachePath = path.join(workspace.root, '.skillz-cache.json');
    const cache1 = (await fs.readJson(cachePath)) as CacheFile;
    const originalConfigHash = cache1.configHash;
    expect(originalConfigHash).toBeDefined();

    const configPath = path.join(workspace.root, 'skillz.json');
    const config = (await fs.readJson(configPath)) as Config;
    config.ignore = ['*.experimental'];
    await fs.writeJson(configPath, config, { spaces: 2 });

    const result = await execCli(['sync'], {
      cwd: workspace.root,
    });
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('configuration changed');

    const cache2 = (await fs.readJson(cachePath)) as CacheFile;
    expect(cache2.configHash).toBeDefined();
    expect(cache2.configHash).not.toBe(originalConfigHash);
  });

  it('should sync when both config and skills change', async () => {
    await execCli(['sync'], {
      cwd: workspace.root,
    });

    const configPath = path.join(workspace.root, 'skillz.json');
    const config = (await fs.readJson(configPath)) as Config;
    config.ignore = ['*.never'];
    await fs.writeJson(configPath, config, { spaces: 2 });

    const pythonSkillPath = path.join(workspace.skillsDir, 'python-expert', 'SKILL.md');
    let skillContent = await fs.readFile(pythonSkillPath, 'utf-8');
    skillContent += '\n\n## Additional Content\n\nNew content added.';
    await fs.writeFile(pythonSkillPath, skillContent);

    const result = await execCli(['sync', '--verbose'], {
      cwd: workspace.root,
    });

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('configuration changed');
    expect(result.stdout).toContain('modified');
  });

  it('should respect --force flag and bypass config change detection', async () => {
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
