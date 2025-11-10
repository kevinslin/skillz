import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { createMockWorkspace, MockWorkspace } from '../helpers/workspace.js';
import { execCli } from '../helpers/cli.js';
import fs from 'fs-extra';
import path from 'path';

describe('list command', () => {
  let workspace: MockWorkspace;

  beforeEach(async () => {
    workspace = await createMockWorkspace();
  });

  afterEach(async () => {
    await workspace.cleanup();
  });

  it('should list skills in table format by default', async () => {
    // Initialize first
    await execCli(['init', '--preset', 'agentsmd', '--no-sync'], {
      cwd: workspace.root,
    });

    const result = await execCli(['list'], {
      cwd: workspace.root,
    });

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('python-expert');
    expect(result.stdout).toContain('react-patterns');
    expect(result.stdout).toContain('Total: 2 skill(s)');
  });

  it('should list skills in JSON format', async () => {
    await execCli(['init', '--preset', 'agentsmd', '--no-sync'], {
      cwd: workspace.root,
    });

    const result = await execCli(['list', '--format', 'json'], {
      cwd: workspace.root,
    });

    expect(result.exitCode).toBe(0);

    const output = JSON.parse(result.stdout) as Array<{
      name: string;
      description: string;
      path: string;
    }>;
    expect(Array.isArray(output)).toBe(true);
    expect(output.length).toBe(2);

    const names = output.map((s) => s.name);
    expect(names).toContain('python-expert');
    expect(names).toContain('react-patterns');

    // Check structure
    expect(output[0]).toHaveProperty('name');
    expect(output[0]).toHaveProperty('description');
    expect(output[0]).toHaveProperty('path');
  });

  it('should list skills in markdown format', async () => {
    await execCli(['init', '--preset', 'agentsmd', '--no-sync'], {
      cwd: workspace.root,
    });

    const result = await execCli(['list', '--format', 'markdown'], {
      cwd: workspace.root,
    });

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('| Name | Description | Path |');
    expect(result.stdout).toContain('|------|-------------|------|');
    expect(result.stdout).toContain('python-expert');
    expect(result.stdout).toContain('react-patterns');
  });

  it('should show only synced skills with --synced-only', async () => {
    await execCli(['init', '--preset', 'agentsmd', '--no-sync'], {
      cwd: workspace.root,
    });

    // Initially no skills are synced (no cache exists)
    const beforeSync = await execCli(['list', '--synced-only'], {
      cwd: workspace.root,
    });

    expect(beforeSync.exitCode).toBe(0);
    expect(beforeSync.stdout).toContain('No skills found matching the filter criteria');

    // Now sync
    await execCli(['sync'], {
      cwd: workspace.root,
    });

    // After sync, both skills should appear
    const afterSync = await execCli(['list', '--synced-only'], {
      cwd: workspace.root,
    });

    expect(afterSync.exitCode).toBe(0);
    expect(afterSync.stdout).toContain('python-expert');
    expect(afterSync.stdout).toContain('react-patterns');
    expect(afterSync.stdout).toContain('Total: 2 skill(s)');
  });

  it('should show only unsynced skills with --unsynced-only', async () => {
    await execCli(['init', '--preset', 'agentsmd', '--no-sync'], {
      cwd: workspace.root,
    });

    // Initially all skills are unsynced (no cache exists, so all skills are considered unsynced)
    const beforeSync = await execCli(['list', '--unsynced-only'], {
      cwd: workspace.root,
    });

    expect(beforeSync.exitCode).toBe(0);
    expect(beforeSync.stdout).toContain('python-expert');
    expect(beforeSync.stdout).toContain('react-patterns');
    expect(beforeSync.stdout).toContain('Total: 2 skill(s)');

    // After sync, no skills should be unsynced
    await execCli(['sync'], {
      cwd: workspace.root,
    });

    const afterSync = await execCli(['list', '--unsynced-only'], {
      cwd: workspace.root,
    });

    expect(afterSync.exitCode).toBe(0);
    expect(afterSync.stdout).toContain('No skills found matching the filter criteria');
  });

  it('should handle empty skill directories gracefully', async () => {
    // Create empty workspace
    const emptyRoot = await fs.mkdtemp(path.join(workspace.root, 'empty-'));
    await fs.ensureDir(path.join(emptyRoot, '.claude', 'skills'));

    await execCli(['init', '--preset', 'agentsmd', '--no-sync'], {
      cwd: emptyRoot,
    });

    const result = await execCli(['list'], {
      cwd: emptyRoot,
    });

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('No skills found');
  });

  it('should fail when no config exists', async () => {
    const result = await execCli(['list'], {
      cwd: workspace.root,
    });

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain('No configuration file found');
    expect(result.stderr).toContain('Run `skillz init` first');
  });
});
