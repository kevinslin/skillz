import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { createMockWorkspace, MockWorkspace } from '../helpers/workspace.js';
import { execCli } from '../helpers/cli.js';
import fs from 'fs-extra';
import path from 'path';

describe('info command', () => {
  let workspace: MockWorkspace;

  beforeEach(async () => {
    workspace = await createMockWorkspace();
  });

  afterEach(async () => {
    await workspace.cleanup();
  });

  it('should display project information', async () => {
    await execCli(['init', '--preset', 'agentsmd', '--no-sync'], {
      cwd: workspace.root,
    });

    const result = await execCli(['info'], {
      cwd: workspace.root,
    });

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('Configuration:');
    expect(result.stdout).toContain('skillz.json');
    expect(result.stdout).toContain('Targets');
    expect(result.stdout).toContain('.skills');
    expect(result.stdout).toContain('Skills: 2');
  });

  it('should display multiple targets', async () => {
    await execCli(['init', '--preset', 'agentsmd', '--no-sync'], {
      cwd: workspace.root,
    });

    const configPath = path.join(workspace.root, 'skillz.json');
    const config = (await fs.readJson(configPath)) as {
      targets: Array<{ destination: string }>;
    };
    config.targets.push({ destination: 'vendor-skills' });
    await fs.writeJson(configPath, config, { spaces: 2 });

    const result = await execCli(['info'], {
      cwd: workspace.root,
    });

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('Targets (2)');
    expect(result.stdout).toContain('.skills');
    expect(result.stdout).toContain('vendor-skills');
  });

  it('should display no targets when none are configured', async () => {
    await execCli(['init', '--no-sync', '--non-interactive'], {
      cwd: workspace.root,
    });

    const result = await execCli(['info'], {
      cwd: workspace.root,
    });

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('Targets: (none)');
  });

  it('should fail when no config exists', async () => {
    const result = await execCli(['info'], {
      cwd: workspace.root,
    });

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain('No configuration file found');
    expect(result.stderr).toContain('Run `skillz init` first');
  });

  it('should migrate legacy string skillDirectories', async () => {
    const configPath = path.join(workspace.root, 'skillz.json');
    await fs.writeJson(
      configPath,
      {
        version: '2.0',
        targets: [],
        skillDirectories: ['.claude/skills'],
        additionalSkills: [],
        ignore: [],
      },
      { spaces: 2 }
    );

    const result = await execCli(['info'], {
      cwd: workspace.root,
    });

    expect(result.exitCode).toBe(0);

    const migrated = (await fs.readJson(configPath)) as {
      skillDirectories: Array<{ localPath: string }>;
    };
    expect(migrated.skillDirectories).toEqual([{ localPath: '.claude/skills' }]);
  });
});
