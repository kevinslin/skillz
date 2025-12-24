import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { createMockWorkspace, MockWorkspace } from '../helpers/workspace.js';
import { execCli } from '../helpers/cli.js';
import type { Target } from '../../src/types/index.js';
import fs from 'fs-extra';
import path from 'path';

type SkillsConfig = {
  preset?: string;
  targets: Target[];
  skillDirectories: string[];
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
    expect(config.targets.map((t) => t.name)).toContain('AGENTS.md');
  });

  it('should create skillz.json with custom target', async () => {
    const result = await execCli(['init', '--target', '.cursorrules', '--no-sync'], {
      cwd: workspace.root,
    });

    expect(result.exitCode).toBe(0);

    const config = (await fs.readJson(path.join(workspace.root, 'skillz.json'))) as SkillsConfig;
    expect(config.targets.map((t) => t.name)).toContain('.cursorrules');
  });

  it('should add .skillz-cache.json to .gitignore', async () => {
    await execCli(['init', '--preset', 'agentsmd', '--no-sync'], {
      cwd: workspace.root,
    });

    const gitignorePath = path.join(workspace.root, '.gitignore');
    const gitignoreContent = await fs.readFile(gitignorePath, 'utf-8');
    expect(gitignoreContent).toContain('.skillz-cache.json');
  });

  it('should run sync by default after init', async () => {
    const result = await execCli(['init', '--preset', 'agentsmd'], {
      cwd: workspace.root,
    });

    expect(result.exitCode).toBe(0);

    // Check AGENTS.md was updated with managed section
    const agentsContent = await fs.readFile(workspace.agentsFile, 'utf-8');
    const normalizedContent = agentsContent.replaceAll(workspace.root, '<workspace>');

    expect(normalizedContent).toContain('## Additional Instructions');
    expect(normalizedContent).toContain('python-expert');
    expect(normalizedContent).toContain('react-patterns');
    expect(normalizedContent).toMatchSnapshot();
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
    expect(config.skillDirectories).toContain('.claude/skills');

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
    expect(config.targets.map((t) => t.name)).toContain('.cursor/rules/skills.mdc');
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
    expect(config.targets.map((t) => t.name)).toContain('CLAUDE.md');
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
    expect(config.targets.map((t) => t.name)).toContain('.aider/conventions.md');
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
    expect(config.skillDirectories).toContain('.claude/skills');

    // Check for global skills directory (should be HOME/.claude/skills)
    const homeDir = process.env.HOME || '~';
    const globalSkillsPath = path.join(homeDir, '.claude/skills');
    expect(config.skillDirectories).toContain(globalSkillsPath);
  });

  it('should combine --global-skills with different presets', async () => {
    const result = await execCli(['init', '--preset', 'aider', '--global-skills', '--no-sync'], {
      cwd: workspace.root,
    });

    expect(result.exitCode).toBe(0);

    const config = (await fs.readJson(path.join(workspace.root, 'skillz.json'))) as SkillsConfig;
    expect(config.preset).toBe('aider');
    expect(config.targets.map((t) => t.name)).toContain('.aider/conventions.md');

    // Should include global skills directory
    const homeDir = process.env.HOME || '~';
    const globalSkillsPath = path.join(homeDir, '.claude/skills');
    expect(config.skillDirectories).toContain(globalSkillsPath);
  });

  it('should save custom template path with --template flag', async () => {
    // Create a custom template file
    const templatePath = path.join(workspace.root, 'custom-template.hbs');
    await fs.writeFile(
      templatePath,
      `# Custom Skills

{{#each skills}}
- [{{name}}]({{path}}): {{description}}
{{/each}}
`
    );

    const result = await execCli(
      ['init', '--preset', 'agentsmd', '--template', './custom-template.hbs', '--no-sync'],
      {
        cwd: workspace.root,
      }
    );

    expect(result.exitCode).toBe(0);

    const config = (await fs.readJson(path.join(workspace.root, 'skillz.json'))) as SkillsConfig & {
      template?: string;
    };
    expect(config.template).toBe('./custom-template.hbs');
  });

  it('should use custom template when syncing', async () => {
    // Create a custom template file
    const templatePath = path.join(workspace.root, 'custom-template.hbs');
    await fs.writeFile(
      templatePath,
      `# Custom Skills List

{{#each skills}}
* **{{name}}** - {{description}}
{{/each}}

Last synced: {{lastSync}}
`
    );

    // Init with custom template
    await execCli(
      ['init', '--preset', 'agentsmd', '--template', './custom-template.hbs', '--no-sync'],
      {
        cwd: workspace.root,
      }
    );

    // Run sync
    const syncResult = await execCli(['sync'], {
      cwd: workspace.root,
    });

    expect(syncResult.exitCode).toBe(0);

    // Verify the AGENTS.md file contains the custom template format
    const agentsContent = await fs.readFile(workspace.agentsFile, 'utf-8');
    expect(agentsContent).toContain('# Custom Skills List');
    expect(agentsContent).toContain('* **python-expert**');
    expect(agentsContent).toContain('* **react-patterns**');
    expect(agentsContent).toContain('Last synced:');
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
    expect(subConfig.targets.map((t) => t.name)).toContain('.cursor/rules/skills.mdc');

    // Verify parent config is unchanged
    const parentConfig = (await fs.readJson(parentConfigPath)) as SkillsConfig;
    expect(parentConfig.preset).toBe('agentsmd');
    expect(parentConfig.targets.map((t) => t.name)).toContain('AGENTS.md');
  });
});
