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
    // Initialize config
    await execCli(['init', '--preset', 'agentsmd', '--no-sync'], {
      cwd: workspace.root,
    });
  });

  afterEach(async () => {
    await workspace.cleanup();
  });

  it('should sync skills to AGENTS.md', async () => {
    const result = await execCli(['sync'], {
      cwd: workspace.root,
    });

    expect(result.exitCode).toBe(0);

    const agentsContent = await fs.readFile(workspace.agentsFile, 'utf-8');
    expect(agentsContent).toContain('## Additional Instructions');
    expect(agentsContent).toContain('python-expert');
    expect(agentsContent).toContain('react-patterns');
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

  it('should preserve content outside managed section', async () => {
    await execCli(['sync'], {
      cwd: workspace.root,
    });

    const updatedContent = await fs.readFile(workspace.agentsFile, 'utf-8');
    expect(updatedContent).toContain('My Project Agents');
    expect(updatedContent).toContain('Project Context');
    expect(updatedContent).toContain('## Additional Instructions');
  });

  it('should detect and sync only changed skills', async () => {
    // First sync
    await execCli(['sync'], {
      cwd: workspace.root,
    });

    // Modify one skill
    const pythonSkillPath = path.join(workspace.skillsDir, 'python-expert', 'SKILL.md');
    let skillContent = await fs.readFile(pythonSkillPath, 'utf-8');
    skillContent += '\n\n## New Section\n\nNew content here.';
    await fs.writeFile(pythonSkillPath, skillContent);

    // Second sync with verbose
    const result = await execCli(['sync', '--verbose'], {
      cwd: workspace.root,
    });

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('modified');
  });

  it('should support --dry-run mode', async () => {
    const originalContent = await fs.readFile(workspace.agentsFile, 'utf-8');

    // Delete cache to simulate fresh state
    const cachePath = path.join(workspace.root, '.skillz-cache.json');
    if (await fs.pathExists(cachePath)) {
      await fs.remove(cachePath);
    }

    const result = await execCli(['sync', '--dry-run'], {
      cwd: workspace.root,
    });

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('Dry run');

    // File should not be modified
    const afterContent = await fs.readFile(workspace.agentsFile, 'utf-8');
    expect(afterContent).toBe(originalContent);
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
    // CLI outputs progress to stderr, which is normal - just check no errors occurred
    expect(result.stderr).not.toContain('Error');
    expect(result.stderr).not.toContain('Failed');

    const agentsContent = await fs.readFile(workspace.agentsFile, 'utf-8');
    expect(agentsContent).not.toContain('sandbox-test');
  });

  it('should sync only specified skills with --only flag', async () => {
    const result = await execCli(['sync', '--only', 'python-expert'], {
      cwd: workspace.root,
    });

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('Filtering to 1 skill(s): python-expert');

    const agentsContent = await fs.readFile(workspace.agentsFile, 'utf-8');
    expect(agentsContent).toContain('## Additional Instructions');
    expect(agentsContent).toContain('python-expert');
    // Should NOT contain react-patterns since we filtered to only python-expert
    expect(agentsContent).not.toContain('react-patterns');

    // Check cache only has python-expert (since we filtered to only sync that one)
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

    const agentsContent = await fs.readFile(workspace.agentsFile, 'utf-8');
    expect(agentsContent).toContain('python-expert');
    expect(agentsContent).toContain('react-patterns');

    // Check cache has both skills
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

    const agentsContent = await fs.readFile(workspace.agentsFile, 'utf-8');
    expect(agentsContent).toContain('python-expert');
    expect(agentsContent).toContain('react-patterns');
  });

  it('should detect config changes and trigger sync', async () => {
    // First sync
    await execCli(['sync'], {
      cwd: workspace.root,
    });

    // Verify initial sync with "All skills are up to date"
    const noChangeResult = await execCli(['sync'], {
      cwd: workspace.root,
    });
    expect(noChangeResult.exitCode).toBe(0);
    expect(noChangeResult.stdout).toContain('All skills are up to date');

    // Modify config (change section name)
    const configPath = path.join(workspace.root, 'skillz.json');
    const config = (await fs.readJson(configPath)) as Config;
    config.skillsSectionName = '## Custom Skills Section';
    await fs.writeJson(configPath, config, { spaces: 2 });

    // Sync again - should detect config change
    const configChangeResult = await execCli(['sync', '--verbose'], {
      cwd: workspace.root,
    });

    expect(configChangeResult.exitCode).toBe(0);
    expect(configChangeResult.stdout).toContain('configuration changed');
    expect(configChangeResult.stdout).toContain(
      'Configuration file (skillz.json) has been modified'
    );

    // Verify cache was updated with new configHash
    const cachePath = path.join(workspace.root, '.skillz-cache.json');
    const cache = (await fs.readJson(cachePath)) as CacheFile;
    expect(cache.configHash).toBeDefined();
    expect(typeof cache.configHash).toBe('string');
  });

  it('should cache config hash and detect subsequent config changes', async () => {
    // First sync
    await execCli(['sync'], {
      cwd: workspace.root,
    });

    // Read cache to verify configHash is stored
    const cachePath = path.join(workspace.root, '.skillz-cache.json');
    const cache1 = (await fs.readJson(cachePath)) as CacheFile;
    const originalConfigHash = cache1.configHash;
    expect(originalConfigHash).toBeDefined();

    // Modify config - add an ignore pattern
    const configPath = path.join(workspace.root, 'skillz.json');
    const config = (await fs.readJson(configPath)) as Config;
    config.ignore = ['*.experimental'];
    await fs.writeJson(configPath, config, { spaces: 2 });

    // Sync - should detect change
    const result = await execCli(['sync'], {
      cwd: workspace.root,
    });
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('configuration changed');

    // Verify configHash changed in cache
    const cache2 = (await fs.readJson(cachePath)) as CacheFile;
    expect(cache2.configHash).toBeDefined();
    expect(cache2.configHash).not.toBe(originalConfigHash);
  });

  it('should sync when both config and skills change', async () => {
    // First sync
    await execCli(['sync'], {
      cwd: workspace.root,
    });

    // Modify both config and a skill
    const configPath = path.join(workspace.root, 'skillz.json');
    const config = (await fs.readJson(configPath)) as Config;
    config.skillsSectionName = '## Available Skills';
    await fs.writeJson(configPath, config, { spaces: 2 });

    const pythonSkillPath = path.join(workspace.skillsDir, 'python-expert', 'SKILL.md');
    let skillContent = await fs.readFile(pythonSkillPath, 'utf-8');
    skillContent += '\n\n## Additional Content\n\nNew content added.';
    await fs.writeFile(pythonSkillPath, skillContent);

    // Sync with verbose - should report both changes
    const result = await execCli(['sync', '--verbose'], {
      cwd: workspace.root,
    });

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('configuration changed');
    expect(result.stdout).toContain('modified');
  });

  it('should respect --force flag and bypass config change detection', async () => {
    // First sync
    await execCli(['sync'], {
      cwd: workspace.root,
    });

    // Second sync with no changes - should exit early
    const noChangeResult = await execCli(['sync'], {
      cwd: workspace.root,
    });
    expect(noChangeResult.stdout).toContain('All skills are up to date');

    // Force sync - should bypass all checks
    const forceResult = await execCli(['sync', '--force'], {
      cwd: workspace.root,
    });
    expect(forceResult.exitCode).toBe(0);
    expect(forceResult.stdout).toContain('Force mode');
    expect(forceResult.stdout).not.toContain('All skills are up to date');
  });

  it('should use relative paths by default', async () => {
    const result = await execCli(['sync'], {
      cwd: workspace.root,
    });

    expect(result.exitCode).toBe(0);

    const agentsContent = await fs.readFile(workspace.agentsFile, 'utf-8');
    // Relative paths should not start with /
    expect(agentsContent).toContain('.claude/skills/python-expert/SKILL.md');
    expect(agentsContent).toContain('.claude/skills/react-patterns/SKILL.md');
    expect(agentsContent).not.toContain(workspace.root);
  });

  it('should use absolute paths with --path-style absolute', async () => {
    const result = await execCli(['sync', '--path-style', 'absolute'], {
      cwd: workspace.root,
    });

    expect(result.exitCode).toBe(0);

    const agentsContent = await fs.readFile(workspace.agentsFile, 'utf-8');
    // Absolute paths should contain the full path
    expect(agentsContent).toContain(
      path.join(workspace.root, '.claude/skills/python-expert/SKILL.md')
    );
    expect(agentsContent).toContain(
      path.join(workspace.root, '.claude/skills/react-patterns/SKILL.md')
    );
  });

  it('should use absolute paths with pathStyle in config', async () => {
    // Update config to use absolute paths
    const configPath = path.join(workspace.root, 'skillz.json');
    const config = (await fs.readJson(configPath)) as Config;
    config.pathStyle = 'absolute';
    await fs.writeJson(configPath, config, { spaces: 2 });

    const result = await execCli(['sync'], {
      cwd: workspace.root,
    });

    expect(result.exitCode).toBe(0);

    const agentsContent = await fs.readFile(workspace.agentsFile, 'utf-8');
    // Absolute paths should contain the full path
    expect(agentsContent).toContain(
      path.join(workspace.root, '.claude/skills/python-expert/SKILL.md')
    );
  });

  it('should allow CLI flag to override config pathStyle', async () => {
    // Set config to absolute
    const configPath = path.join(workspace.root, 'skillz.json');
    const config = (await fs.readJson(configPath)) as Config;
    config.pathStyle = 'absolute';
    await fs.writeJson(configPath, config, { spaces: 2 });

    // But use relative via CLI flag
    const result = await execCli(['sync', '--path-style', 'relative'], {
      cwd: workspace.root,
    });

    expect(result.exitCode).toBe(0);

    const agentsContent = await fs.readFile(workspace.agentsFile, 'utf-8');
    // Should use relative paths (CLI override)
    expect(agentsContent).toContain('.claude/skills/python-expert/SKILL.md');
    expect(agentsContent).not.toContain(workspace.root);
  });

  it('should accept shorthand path style values', async () => {
    // Test 'rel' shorthand
    const relResult = await execCli(['sync', '--path-style', 'rel'], {
      cwd: workspace.root,
    });
    expect(relResult.exitCode).toBe(0);
    let agentsContent = await fs.readFile(workspace.agentsFile, 'utf-8');
    expect(agentsContent).toContain('.claude/skills/python-expert/SKILL.md');

    // Test 'abs' shorthand
    const absResult = await execCli(['sync', '--path-style', 'abs'], {
      cwd: workspace.root,
    });
    expect(absResult.exitCode).toBe(0);
    agentsContent = await fs.readFile(workspace.agentsFile, 'utf-8');
    expect(agentsContent).toContain(
      path.join(workspace.root, '.claude/skills/python-expert/SKILL.md')
    );
  });

  it('should error with invalid path style value', async () => {
    const result = await execCli(['sync', '--path-style', 'invalid'], {
      cwd: workspace.root,
    });

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain('Invalid path style');
    expect(result.stderr).toContain('invalid');
  });

  it('should trigger sync when pathStyle config changes', async () => {
    // First sync with default (relative)
    await execCli(['sync'], {
      cwd: workspace.root,
    });

    // Verify no changes detected
    const noChangeResult = await execCli(['sync'], {
      cwd: workspace.root,
    });
    expect(noChangeResult.stdout).toContain('All skills are up to date');

    // Change pathStyle in config
    const configPath = path.join(workspace.root, 'skillz.json');
    const config = (await fs.readJson(configPath)) as Config;
    config.pathStyle = 'absolute';
    await fs.writeJson(configPath, config, { spaces: 2 });

    // Sync again - should detect config change
    const result = await execCli(['sync', '--verbose'], {
      cwd: workspace.root,
    });

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('configuration changed');
  });

  describe('template option', () => {
    it('should use readme template from CLI', async () => {
      const result = await execCli(['sync', '--template', 'readme'], {
        cwd: workspace.root,
      });

      expect(result.exitCode).toBe(0);

      const content = await fs.readFile(workspace.agentsFile, 'utf-8');
      // README template should not have instructional text
      expect(content).not.toContain('You now have access to Skills');
      expect(content).toContain('Available Skills');
      expect(content).toContain('python-expert');
      expect(content).toContain('react-patterns');
    });

    it('should use default template (with instructions)', async () => {
      const result = await execCli(['sync', '--template', 'default'], {
        cwd: workspace.root,
      });

      expect(result.exitCode).toBe(0);

      const content = await fs.readFile(workspace.agentsFile, 'utf-8');
      // Default template should have full instructions
      expect(content).toContain('You now have access to Skills');
      expect(content).toContain('How to Use Skills');
      expect(content).toContain('Available Skills');
    });

    it('should use custom template file', async () => {
      const templatePath = path.join(workspace.root, 'custom.hbs');
      await fs.writeFile(
        templatePath,
        '{{sectionName}}\n\nCustom template: {{skills.length}} skills found'
      );

      const result = await execCli(['sync', '--template', './custom.hbs'], {
        cwd: workspace.root,
      });

      expect(result.exitCode).toBe(0);

      const content = await fs.readFile(workspace.agentsFile, 'utf-8');
      expect(content).toContain('Custom template: 2 skills found');
    });

    it('should error on invalid template name', async () => {
      const result = await execCli(['sync', '--template', 'invalid'], {
        cwd: workspace.root,
      });

      expect(result.exitCode).toBe(1);
      expect(result.stderr).toContain('Invalid template');
      expect(result.stderr).toContain('invalid');
    });

    it('should support template in config file', async () => {
      const configPath = path.join(workspace.root, 'skillz.json');
      const config = (await fs.readJson(configPath)) as Config;
      config.template = 'readme';
      await fs.writeJson(configPath, config, { spaces: 2 });

      const result = await execCli(['sync'], {
        cwd: workspace.root,
      });

      expect(result.exitCode).toBe(0);

      const content = await fs.readFile(workspace.agentsFile, 'utf-8');
      expect(content).not.toContain('You now have access to Skills');
    });

    it('should allow CLI to override config template', async () => {
      const configPath = path.join(workspace.root, 'skillz.json');
      const config = (await fs.readJson(configPath)) as Config;
      config.template = 'readme';
      await fs.writeJson(configPath, config, { spaces: 2 });

      const result = await execCli(['sync', '--template', 'default'], {
        cwd: workspace.root,
      });

      expect(result.exitCode).toBe(0);

      const content = await fs.readFile(workspace.agentsFile, 'utf-8');
      // Should use default template (CLI override)
      expect(content).toContain('You now have access to Skills');
    });
  });
});
