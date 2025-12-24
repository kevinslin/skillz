import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { createMockWorkspace, MockWorkspace } from '../helpers/workspace.js';
import { execCli } from '../helpers/cli.js';

describe('info command', () => {
  let workspace: MockWorkspace;

  beforeEach(async () => {
    workspace = await createMockWorkspace();
  });

  afterEach(async () => {
    await workspace.cleanup();
  });

  it('should display project information', async () => {
    // Initialize first
    await execCli(['init', '--preset', 'agentsmd', '--no-sync'], {
      cwd: workspace.root,
    });

    const result = await execCli(['info'], {
      cwd: workspace.root,
    });

    expect(result.exitCode).toBe(0);

    // Check for config location
    expect(result.stdout).toContain('Configuration:');
    expect(result.stdout).toContain('skillz.json');

    // Check for targets
    expect(result.stdout).toContain('Targets');
    expect(result.stdout).toContain('AGENTS.md');

    // Check for skill count
    expect(result.stdout).toContain('Skills: 2');
  });

  it('should display multiple targets', async () => {
    // Initialize first
    await execCli(['init', '--preset', 'agentsmd', '--no-sync'], {
      cwd: workspace.root,
    });

    // Manually add another target
    const { default: fs } = await import('fs-extra');
    const { default: path } = await import('path');
    const configPath = path.join(workspace.root, 'skillz.json');
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const config = await fs.readJson(configPath);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    config.targets.push({ name: 'CLAUDE.md' });
    await fs.writeJson(configPath, config, { spaces: 2 });

    const result = await execCli(['info'], {
      cwd: workspace.root,
    });

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('Targets (2)');
    expect(result.stdout).toContain('AGENTS.md');
    expect(result.stdout).toContain('CLAUDE.md');
  });

  it('should display no targets when none are configured', async () => {
    // Initialize without preset (no targets)
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
});
