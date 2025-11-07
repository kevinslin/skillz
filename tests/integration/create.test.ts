import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { createMockWorkspace, MockWorkspace } from '../helpers/workspace.js';
import { execCli } from '../helpers/cli.js';
import fs from 'fs-extra';
import path from 'path';
import matter from 'gray-matter';

describe('create command', () => {
  let workspace: MockWorkspace;

  beforeEach(async () => {
    workspace = await createMockWorkspace();
  });

  afterEach(async () => {
    await workspace.cleanup();
  });

  it('should create a new skill with valid name and description', async () => {
    // Initialize config first
    await execCli(['init', '--preset', 'agentsmd', '--no-sync'], {
      cwd: workspace.root,
    });

    // Create skill
    const result = await execCli(['create', 'test-skill', 'A test skill'], {
      cwd: workspace.root,
    });

    expect(result.exitCode).toBe(0);

    // Verify skill directory was created
    const skillPath = path.join(workspace.root, '.claude/skills/test-skill');
    expect(await fs.pathExists(skillPath)).toBe(true);

    // Verify SKILL.md was created
    const skillFilePath = path.join(skillPath, 'SKILL.md');
    expect(await fs.pathExists(skillFilePath)).toBe(true);

    // Verify content
    const content = await fs.readFile(skillFilePath, 'utf-8');
    const parsed = matter(content);

    expect(parsed.data.name).toBe('test-skill');
    expect(parsed.data.description).toBe('A test skill');
    expect(parsed.data.version).toBe('0.0.0');
  });

  it('should normalize skill names with underscores', async () => {
    await execCli(['init', '--preset', 'agentsmd', '--no-sync'], {
      cwd: workspace.root,
    });

    const result = await execCli(['create', 'bake_cake', 'Bake a cake'], {
      cwd: workspace.root,
    });

    expect(result.exitCode).toBe(0);

    // Should create directory with hyphens
    const skillPath = path.join(workspace.root, '.claude/skills/bake-cake');
    expect(await fs.pathExists(skillPath)).toBe(true);

    // But frontmatter should preserve original name
    const skillFilePath = path.join(skillPath, 'SKILL.md');
    const content = await fs.readFile(skillFilePath, 'utf-8');
    const parsed = matter(content);

    expect(parsed.data.name).toBe('bake_cake');
  });

  it('should normalize skill names with mixed case', async () => {
    await execCli(['init', '--preset', 'agentsmd', '--no-sync'], {
      cwd: workspace.root,
    });

    const result = await execCli(['create', 'BakeCake', 'Bake a cake'], {
      cwd: workspace.root,
    });

    expect(result.exitCode).toBe(0);

    // Should create directory in lowercase
    const skillPath = path.join(workspace.root, '.claude/skills/bakecake');
    expect(await fs.pathExists(skillPath)).toBe(true);
  });

  it('should handle skill names with multiple underscores', async () => {
    await execCli(['init', '--preset', 'agentsmd', '--no-sync'], {
      cwd: workspace.root,
    });

    const result = await execCli(['create', 'foo__bar__baz', 'Multiple underscores'], {
      cwd: workspace.root,
    });

    expect(result.exitCode).toBe(0);

    // Should collapse multiple hyphens
    const skillPath = path.join(workspace.root, '.claude/skills/foo-bar-baz');
    expect(await fs.pathExists(skillPath)).toBe(true);
  });

  it('should error when no config exists', async () => {
    const result = await execCli(['create', 'test-skill', 'A test skill'], {
      cwd: workspace.root,
    });

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain('skillz.json');
  });

  it('should error when skill already exists', async () => {
    await execCli(['init', '--preset', 'agentsmd', '--no-sync'], {
      cwd: workspace.root,
    });

    // Create skill first time
    await execCli(['create', 'test-skill', 'A test skill'], {
      cwd: workspace.root,
    });

    // Try to create again
    const result = await execCli(['create', 'test-skill', 'Another description'], {
      cwd: workspace.root,
    });

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain('already exists');
  });

  it('should respect --path option to override directory', async () => {
    await execCli(['init', '--preset', 'agentsmd', '--no-sync'], {
      cwd: workspace.root,
    });

    // Create custom directory
    const customDir = path.join(workspace.root, 'custom-skills');
    await fs.ensureDir(customDir);

    const result = await execCli(
      ['create', 'custom-skill', 'Custom location', '--path', 'custom-skills'],
      {
        cwd: workspace.root,
      }
    );

    expect(result.exitCode).toBe(0);

    // Should create in custom directory
    const skillPath = path.join(customDir, 'custom-skill');
    expect(await fs.pathExists(skillPath)).toBe(true);

    const skillFilePath = path.join(skillPath, 'SKILL.md');
    expect(await fs.pathExists(skillFilePath)).toBe(true);
  });

  it('should respect --skill-version option', async () => {
    await execCli(['init', '--preset', 'agentsmd', '--no-sync'], {
      cwd: workspace.root,
    });

    const result = await execCli(
      ['create', 'versioned-skill', 'With custom version', '--skill-version', '1.2.3'],
      {
        cwd: workspace.root,
      }
    );

    expect(result.exitCode).toBe(0);

    const skillFilePath = path.join(workspace.root, '.claude/skills/versioned-skill/SKILL.md');
    const content = await fs.readFile(skillFilePath, 'utf-8');
    const parsed = matter(content);

    expect(parsed.data.version).toBe('1.2.3');
  });

  it('should error with invalid version format', async () => {
    await execCli(['init', '--preset', 'agentsmd', '--no-sync'], {
      cwd: workspace.root,
    });

    const result = await execCli(
      ['create', 'bad-version', 'Invalid version', '--skill-version', 'invalid'],
      {
        cwd: workspace.root,
      }
    );

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain('semver');
  });

  it('should error with empty skill name', async () => {
    await execCli(['init', '--preset', 'agentsmd', '--no-sync'], {
      cwd: workspace.root,
    });

    const result = await execCli(['create', '', 'Empty name'], {
      cwd: workspace.root,
    });

    expect(result.exitCode).toBe(1);
  });

  it('should error with empty description', async () => {
    await execCli(['init', '--preset', 'agentsmd', '--no-sync'], {
      cwd: workspace.root,
    });

    const result = await execCli(['create', 'test-skill', ''], {
      cwd: workspace.root,
    });

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain('Skill description is required');
  });

  it('should handle descriptions with quotes', async () => {
    await execCli(['init', '--preset', 'agentsmd', '--no-sync'], {
      cwd: workspace.root,
    });

    const result = await execCli(['create', 'quoted', 'A "quoted" description'], {
      cwd: workspace.root,
    });

    expect(result.exitCode).toBe(0);

    const skillFilePath = path.join(workspace.root, '.claude/skills/quoted/SKILL.md');
    const content = await fs.readFile(skillFilePath, 'utf-8');
    const parsed = matter(content);

    expect(parsed.data.description).toBe('A "quoted" description');
  });

  it('should create nested directory structure if needed', async () => {
    await execCli(['init', '--preset', 'agentsmd', '--no-sync'], {
      cwd: workspace.root,
    });

    // Use absolute path to a nested location
    const nestedPath = path.join(workspace.root, 'my/nested/skills');

    const result = await execCli(
      ['create', 'nested-skill', 'Nested location', '--path', 'my/nested/skills'],
      {
        cwd: workspace.root,
      }
    );

    expect(result.exitCode).toBe(0);

    const skillPath = path.join(nestedPath, 'nested-skill');
    expect(await fs.pathExists(skillPath)).toBe(true);

    const skillFilePath = path.join(skillPath, 'SKILL.md');
    expect(await fs.pathExists(skillFilePath)).toBe(true);
  });

  it('should error when skillDirectories is empty', async () => {
    // Create config with empty skillDirectories
    await execCli(['init', '--preset', 'agentsmd', '--no-sync'], {
      cwd: workspace.root,
    });

    // Manually edit config to have empty skillDirectories
    const configPath = path.join(workspace.root, 'skillz.json');
    const config = await fs.readJson(configPath);
    config.skillDirectories = [];
    await fs.writeJson(configPath, config);

    const result = await execCli(['create', 'test-skill', 'Test'], {
      cwd: workspace.root,
    });

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain('No skill directories configured');
  });

  it('should generate correct SKILL.md format', async () => {
    await execCli(['init', '--preset', 'agentsmd', '--no-sync'], {
      cwd: workspace.root,
    });

    await execCli(['create', 'bake_cake', 'bake delicious apple cake'], {
      cwd: workspace.root,
    });

    const skillFilePath = path.join(workspace.root, '.claude/skills/bake-cake/SKILL.md');
    const content = await fs.readFile(skillFilePath, 'utf-8');

    // Verify exact format from user's example
    expect(content).toContain('---\n');
    expect(content).toContain('name: bake_cake');
    expect(content).toContain('description: bake delicious apple cake');
    expect(content).toContain('version: 0.0.0');
    expect(content).toContain('---\n\n');
  });

  it('should handle tilde (~) in config skillDirectories', async () => {
    await execCli(['init', '--preset', 'agentsmd', '--no-sync'], {
      cwd: workspace.root,
    });

    // Manually edit config to use ~ path
    const configPath = path.join(workspace.root, 'skillz.json');
    const config = await fs.readJson(configPath);
    config.skillDirectories = ['~/.test-skills'];
    await fs.writeJson(configPath, config);

    const result = await execCli(['create', 'tilde-test', 'Testing tilde expansion'], {
      cwd: workspace.root,
    });

    expect(result.exitCode).toBe(0);

    // Should expand ~ to home directory
    const homeDir = require('os').homedir();
    const skillPath = path.join(homeDir, '.test-skills/tilde-test');
    expect(await fs.pathExists(skillPath)).toBe(true);

    const skillFilePath = path.join(skillPath, 'SKILL.md');
    expect(await fs.pathExists(skillFilePath)).toBe(true);

    // Clean up
    await fs.remove(path.join(homeDir, '.test-skills'));
  });

  it('should handle tilde (~) in --path option', async () => {
    await execCli(['init', '--preset', 'agentsmd', '--no-sync'], {
      cwd: workspace.root,
    });

    const result = await execCli(
      ['create', 'tilde-path', 'Testing tilde in path', '--path', '~/.test-skills-path'],
      {
        cwd: workspace.root,
      }
    );

    expect(result.exitCode).toBe(0);

    // Should expand ~ to home directory
    const homeDir = require('os').homedir();
    const skillPath = path.join(homeDir, '.test-skills-path/tilde-path');
    expect(await fs.pathExists(skillPath)).toBe(true);

    const skillFilePath = path.join(skillPath, 'SKILL.md');
    expect(await fs.pathExists(skillFilePath)).toBe(true);

    // Clean up
    await fs.remove(path.join(homeDir, '.test-skills-path'));
  });
});
