import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { createMockWorkspace, MockWorkspace } from '../helpers/workspace.js';
import { execCli } from '../helpers/cli.js';
import type { Config } from '../../src/types/index.js';
import fs from 'fs-extra';
import path from 'path';

describe('edit command', () => {
  let workspace: MockWorkspace;
  const originalEditor = process.env.EDITOR;

  beforeEach(async () => {
    workspace = await createMockWorkspace();
  });

  afterEach(async () => {
    await workspace.cleanup();
    // Restore original EDITOR env var
    if (originalEditor) {
      process.env.EDITOR = originalEditor;
    } else {
      delete process.env.EDITOR;
    }
  });

  it('should error when no config exists', async () => {
    const result = await execCli(['edit', 'python-expert'], {
      cwd: workspace.root,
    });

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain('No configuration file found');
  });

  it('should error when skill does not exist', async () => {
    // Initialize config first
    await execCli(['init', '--preset', 'agentsmd', '--no-sync'], {
      cwd: workspace.root,
    });

    const result = await execCli(['edit', 'non-existent-skill'], {
      cwd: workspace.root,
    });

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain('Skill "non-existent-skill" not found');
  });

  it('should list available skills when skill not found', async () => {
    await execCli(['init', '--preset', 'agentsmd', '--no-sync'], {
      cwd: workspace.root,
    });

    const result = await execCli(['edit', 'invalid-skill'], {
      cwd: workspace.root,
    });

    expect(result.exitCode).toBe(1);
    expect(result.stdout).toContain('Available skills:');
    expect(result.stdout).toContain('python-expert');
    expect(result.stdout).toContain('react-patterns');
  });

  it('should error when editor command is invalid', async () => {
    await execCli(['init', '--preset', 'agentsmd', '--no-sync'], {
      cwd: workspace.root,
    });

    const result = await execCli(['edit', 'python-expert', '--editor', 'nonexistenteditor123'], {
      cwd: workspace.root,
    });

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain('Editor "nonexistenteditor123" not found');
  });

  it('should successfully open editor for existing skill', async () => {
    await execCli(['init', '--preset', 'agentsmd', '--no-sync'], {
      cwd: workspace.root,
    });

    // Use 'cat' as a non-interactive editor for testing
    // cat will just print the file contents and exit immediately
    const result = await execCli(['edit', 'python-expert', '--editor', 'cat'], {
      cwd: workspace.root,
    });

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('Opening python-expert in cat');
    expect(result.stdout).toContain('Editor closed successfully');
  });

  it('should respect --editor flag override', async () => {
    // Set EDITOR env var
    process.env.EDITOR = 'vim';

    // Create config with different default editor
    await execCli(['init', '--preset', 'agentsmd', '--no-sync'], {
      cwd: workspace.root,
    });

    // Manually update config to set defaultEditor
    const configPath = path.join(workspace.root, 'skillz.json');
    const config = (await fs.readJson(configPath)) as Config;
    config.defaultEditor = 'nano';
    await fs.writeJson(configPath, config, { spaces: 2 });

    // Use --editor flag which should override both config and env var
    const result = await execCli(['edit', 'python-expert', '--editor', 'cat'], {
      cwd: workspace.root,
    });

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('Opening python-expert in cat');
  });

  it('should use default editor from config', async () => {
    // Set a different EDITOR env var to ensure config takes precedence
    process.env.EDITOR = 'vim';

    await execCli(['init', '--preset', 'agentsmd', '--no-sync'], {
      cwd: workspace.root,
    });

    // Update config to set defaultEditor to cat
    const configPath = path.join(workspace.root, 'skillz.json');
    const config = (await fs.readJson(configPath)) as Config;
    config.defaultEditor = 'cat';
    await fs.writeJson(configPath, config, { spaces: 2 });

    const result = await execCli(['edit', 'python-expert'], {
      cwd: workspace.root,
    });

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('Opening python-expert in cat');
  });

  it('should fall back to $EDITOR environment variable', async () => {
    // Set EDITOR env var
    process.env.EDITOR = 'cat';

    await execCli(['init', '--preset', 'agentsmd', '--no-sync'], {
      cwd: workspace.root,
    });

    // Don't set defaultEditor in config (it will be set to $EDITOR during init)
    // We need to remove it to test the fallback
    const configPath = path.join(workspace.root, 'skillz.json');
    const config = (await fs.readJson(configPath)) as Config;
    delete config.defaultEditor;
    await fs.writeJson(configPath, config, { spaces: 2 });

    const result = await execCli(['edit', 'python-expert'], {
      cwd: workspace.root,
    });

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('Opening python-expert in cat');
  });

  it('should handle skill names case-insensitively', async () => {
    await execCli(['init', '--preset', 'agentsmd', '--no-sync'], {
      cwd: workspace.root,
    });

    // Try with different case
    const result = await execCli(['edit', 'PYTHON-EXPERT', '--editor', 'cat'], {
      cwd: workspace.root,
    });

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('Opening python-expert in cat');
  });

  it('should handle skill names with underscores', async () => {
    await execCli(['init', '--preset', 'agentsmd', '--no-sync'], {
      cwd: workspace.root,
    });

    // python-expert can be referenced with underscore
    const result = await execCli(['edit', 'python_expert', '--editor', 'cat'], {
      cwd: workspace.root,
    });

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('Opening python-expert in cat');
  });

  it('should auto-sync after edit when autoSyncAfterEdit is true', async () => {
    await execCli(['init', '--preset', 'agentsmd', '--no-sync'], {
      cwd: workspace.root,
    });

    // Ensure autoSyncAfterEdit is true (it's true by default)
    const configPath = path.join(workspace.root, 'skillz.json');
    const config = (await fs.readJson(configPath)) as Config;
    config.autoSyncAfterEdit = true;
    await fs.writeJson(configPath, config, { spaces: 2 });

    const result = await execCli(['edit', 'python-expert', '--editor', 'cat'], {
      cwd: workspace.root,
    });

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('Running sync...');
    expect(result.stdout).toContain('Successfully synced');
  });

  it('should not auto-sync when autoSyncAfterEdit is false', async () => {
    await execCli(['init', '--preset', 'agentsmd', '--no-sync'], {
      cwd: workspace.root,
    });

    // Set autoSyncAfterEdit to false
    const configPath = path.join(workspace.root, 'skillz.json');
    const config = (await fs.readJson(configPath)) as Config;
    config.autoSyncAfterEdit = false;
    await fs.writeJson(configPath, config, { spaces: 2 });

    const result = await execCli(['edit', 'python-expert', '--editor', 'cat'], {
      cwd: workspace.root,
    });

    expect(result.exitCode).toBe(0);
    expect(result.stdout).not.toContain('Running sync...');
  });
});
