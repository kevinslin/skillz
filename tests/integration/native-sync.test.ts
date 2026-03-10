import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { createMockWorkspace, MockWorkspace } from '../helpers/workspace.js';
import { execCli } from '../helpers/cli.js';
import fs from 'fs-extra';
import path from 'path';

const EXIT_CODE_SUCCESS = 0;
const EXIT_CODE_FAILURE = 1;
const JSON_INDENTATION_SPACES = 2;

type SkillsConfig = {
  version: string;
  targets: Array<{ destination: string; deleteExistingFromTarget?: boolean; syncMode?: string }>;
  skillDirectories: Array<{ localPath: string; remotePath?: string }>;
  additionalSkills: string[];
  ignore: string[];
  syncMode?: string;
};

describe('native-only sync', () => {
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
      targets: [{ destination: '.skills' }],
      skillDirectories: [{ localPath: '.claude/skills' }],
      additionalSkills: [],
      ignore: [],
    };

    await writeConfig(workspace.root, config);

    const result = await execCli(['sync'], { cwd: workspace.root });

    expect(result.exitCode).toBe(EXIT_CODE_SUCCESS);
    expect(await fs.pathExists(path.join(workspace.root, '.skills/python-expert'))).toBe(true);
    expect(await fs.pathExists(path.join(workspace.root, '.skills/react-patterns'))).toBe(true);
  });

  it('should abort with error when conflicts exist', async () => {
    const config: SkillsConfig = {
      version: '2.0',
      targets: [{ destination: '.skills' }],
      skillDirectories: [{ localPath: '.claude/skills' }],
      additionalSkills: [],
      ignore: [],
    };

    await writeConfig(workspace.root, config);

    const conflictDir = path.join(workspace.root, '.skills/python-expert');
    await fs.ensureDir(conflictDir);
    await fs.writeFile(path.join(conflictDir, 'fake.txt'), 'conflict');

    const result = await execCli(['sync'], { cwd: workspace.root });

    expect(result.exitCode).toBe(EXIT_CODE_FAILURE);
    expect(result.stderr).toContain('destination conflicts detected');
    expect(result.stderr).toContain('python-expert');
    expect(await fs.pathExists(path.join(workspace.root, '.skills/react-patterns'))).toBe(false);
  });

  it('should list all conflicts in error message', async () => {
    const config: SkillsConfig = {
      version: '2.0',
      targets: [{ destination: '.skills' }],
      skillDirectories: [{ localPath: '.claude/skills' }],
      additionalSkills: [],
      ignore: [],
    };

    await writeConfig(workspace.root, config);

    await fs.ensureDir(path.join(workspace.root, '.skills/python-expert'));
    await fs.ensureDir(path.join(workspace.root, '.skills/react-patterns'));

    const result = await execCli(['sync'], { cwd: workspace.root });

    expect(result.exitCode).toBe(EXIT_CODE_FAILURE);
    expect(result.stderr).toContain('python-expert');
    expect(result.stderr).toContain('react-patterns');
  });

  it('should remove pre-existing skills when deleteExistingFromTarget is set', async () => {
    const config: SkillsConfig = {
      version: '2.0',
      targets: [{ destination: '.skills', deleteExistingFromTarget: true }],
      skillDirectories: [{ localPath: '.claude/skills' }, { localPath: '.skills' }],
      additionalSkills: [],
      ignore: ['obsolete-*'],
    };

    await writeConfig(workspace.root, config);

    const obsoleteDir = path.join(workspace.root, '.skills/obsolete-skill');
    await fs.ensureDir(obsoleteDir);
    await fs.writeFile(
      path.join(obsoleteDir, 'SKILL.md'),
      `---
name: obsolete-skill
description: Old skill that should be removed
---
`
    );

    const result = await execCli(['sync'], { cwd: workspace.root });

    expect(result.exitCode).toBe(EXIT_CODE_SUCCESS);
    expect(await fs.pathExists(obsoleteDir)).toBe(false);
    expect(await fs.pathExists(path.join(workspace.root, '.skills/python-expert'))).toBe(true);
  });

  it('should create cache for target directories', async () => {
    const config: SkillsConfig = {
      version: '2.0',
      targets: [{ destination: '.skills' }],
      skillDirectories: [{ localPath: '.claude/skills' }],
      additionalSkills: [],
      ignore: [],
    };

    await writeConfig(workspace.root, config);
    await execCli(['sync'], { cwd: workspace.root });

    expect(await fs.pathExists(path.join(workspace.root, '.skillz-cache.json'))).toBe(true);
  });

  it('should detect changes and re-copy when upstream skill changes', async () => {
    const config: SkillsConfig = {
      version: '2.0',
      targets: [{ destination: '.skills' }],
      skillDirectories: [{ localPath: '.claude/skills' }],
      additionalSkills: [],
      ignore: [],
    };

    await writeConfig(workspace.root, config);
    await execCli(['sync'], { cwd: workspace.root });

    const copiedSkillPath = path.join(workspace.root, '.skills/python-expert/SKILL.md');
    const originalContent = await fs.readFile(copiedSkillPath, 'utf-8');

    const sourceSkillPath = path.join(workspace.root, '.claude/skills/python-expert/SKILL.md');
    await fs.writeFile(sourceSkillPath, `${originalContent}\n\nNew content added!`);

    const result = await execCli(['sync'], { cwd: workspace.root });

    expect(result.exitCode).toBe(EXIT_CODE_SUCCESS);
    expect(await fs.readFile(copiedSkillPath, 'utf-8')).toContain('New content added!');
  });

  it('should not re-copy when skills have not changed', async () => {
    const config: SkillsConfig = {
      version: '2.0',
      targets: [{ destination: '.skills' }],
      skillDirectories: [{ localPath: '.claude/skills' }],
      additionalSkills: [],
      ignore: [],
    };

    await writeConfig(workspace.root, config);
    await execCli(['sync'], { cwd: workspace.root });

    const result = await execCli(['sync'], { cwd: workspace.root });

    expect(result.exitCode).toBe(EXIT_CODE_SUCCESS);
    expect(result.stdout).toContain('All skills are up to date');
  });

  it('should reject legacy file targets in config', async () => {
    const config: SkillsConfig = {
      version: '2.0',
      targets: [{ destination: 'AGENTS.md' }],
      skillDirectories: [{ localPath: '.claude/skills' }],
      additionalSkills: [],
      ignore: [],
    };

    await writeConfig(workspace.root, config);

    const result = await execCli(['sync'], { cwd: workspace.root });

    expect(result.exitCode).toBe(EXIT_CODE_FAILURE);
    expect(result.stderr).toContain('Legacy file target "AGENTS.md" is no longer supported');
  });

  it('should reject prompt sync mode in config', async () => {
    const config: SkillsConfig = {
      version: '2.0',
      targets: [{ destination: '.skills', syncMode: 'prompt' }],
      skillDirectories: [{ localPath: '.claude/skills' }],
      additionalSkills: [],
      ignore: [],
    };

    await writeConfig(workspace.root, config);

    const result = await execCli(['sync'], { cwd: workspace.root });

    expect(result.exitCode).toBe(EXIT_CODE_FAILURE);
    expect(result.stderr).toContain('Prompt mode is no longer supported');
  });

  it('should respect --dry-run', async () => {
    const config: SkillsConfig = {
      version: '2.0',
      targets: [{ destination: '.skills' }],
      skillDirectories: [{ localPath: '.claude/skills' }],
      additionalSkills: [],
      ignore: [],
    };

    await writeConfig(workspace.root, config);

    const result = await execCli(['sync', '--dry-run'], { cwd: workspace.root });

    expect(result.exitCode).toBe(EXIT_CODE_SUCCESS);
    expect(result.stdout).toContain('Dry run mode');
    expect(result.stdout).toContain('Would copy');
    expect(await fs.pathExists(path.join(workspace.root, '.skills'))).toBe(false);
  });

  it('should create target directory if it does not exist', async () => {
    const config: SkillsConfig = {
      version: '2.0',
      targets: [{ destination: 'some/nested/skills' }],
      skillDirectories: [{ localPath: '.claude/skills' }],
      additionalSkills: [],
      ignore: [],
    };

    await writeConfig(workspace.root, config);

    const result = await execCli(['sync'], { cwd: workspace.root });

    expect(result.exitCode).toBe(EXIT_CODE_SUCCESS);
    expect(await fs.pathExists(path.join(workspace.root, 'some/nested/skills/python-expert'))).toBe(
      true
    );
  });

  it('should handle multiple skill directories without name conflicts', async () => {
    const secondSkillDir = path.join(workspace.root, '.claude/more-skills');
    const webSkillDir = path.join(secondSkillDir, 'web-expert');
    await fs.ensureDir(webSkillDir);
    await fs.writeFile(
      path.join(webSkillDir, 'SKILL.md'),
      `---
name: web-expert
description: Expert in web development
---
`
    );

    const config: SkillsConfig = {
      version: '2.0',
      targets: [{ destination: '.skills' }],
      skillDirectories: [{ localPath: '.claude/skills' }, { localPath: '.claude/more-skills' }],
      additionalSkills: [],
      ignore: [],
    };

    await writeConfig(workspace.root, config);

    const result = await execCli(['sync'], { cwd: workspace.root });

    expect(result.exitCode).toBe(EXIT_CODE_SUCCESS);
    expect(await fs.pathExists(path.join(workspace.root, '.skills/web-expert'))).toBe(true);
  });

  it('should remove stale skills with deleteExistingFromTarget', async () => {
    await fs.remove(path.join(workspace.root, '.claude/skills/python-expert'));

    await fs.ensureDir(path.join(workspace.root, '.claude/skills/test-skill'));
    await fs.writeFile(
      path.join(workspace.root, '.claude/skills/test-skill/SKILL.md'),
      `---
name: test-skill
description: Test skill
---
`
    );

    const config: SkillsConfig = {
      version: '2.0',
      targets: [{ destination: '.skills', deleteExistingFromTarget: true }],
      skillDirectories: [{ localPath: '.claude/skills' }],
      additionalSkills: [],
      ignore: [],
    };

    await writeConfig(workspace.root, config);
    await execCli(['sync'], { cwd: workspace.root });

    expect(await fs.pathExists(path.join(workspace.root, '.skills/test-skill'))).toBe(true);
    expect(await fs.pathExists(path.join(workspace.root, '.skills/react-patterns'))).toBe(true);

    await fs.remove(path.join(workspace.root, '.claude/skills/test-skill'));

    const result = await execCli(['sync'], { cwd: workspace.root });

    expect(result.exitCode).toBe(EXIT_CODE_SUCCESS);
    expect(await fs.pathExists(path.join(workspace.root, '.skills/test-skill'))).toBe(false);
    expect(await fs.pathExists(path.join(workspace.root, '.skills/react-patterns'))).toBe(true);
  });

  it('should warn about duplicate skill names in different source directories', async () => {
    await fs.ensureDir(path.join(workspace.root, '.claude/skills/test-dup'));
    await fs.writeFile(
      path.join(workspace.root, '.claude/skills/test-dup/SKILL.md'),
      `---
name: test-dup
description: Backend test
---
`
    );

    await fs.ensureDir(path.join(workspace.root, '.claude/more-skills/test-dup'));
    await fs.writeFile(
      path.join(workspace.root, '.claude/more-skills/test-dup/SKILL.md'),
      `---
name: test-dup
description: Frontend test
---
`
    );

    const config: SkillsConfig = {
      version: '2.0',
      targets: [{ destination: '.skills' }],
      skillDirectories: [{ localPath: '.claude/skills' }, { localPath: '.claude/more-skills' }],
      additionalSkills: [],
      ignore: [],
    };

    await writeConfig(workspace.root, config);

    const result = await execCli(['sync'], { cwd: workspace.root });

    expect(result.exitCode).toBe(EXIT_CODE_SUCCESS);
    expect(await fs.pathExists(path.join(workspace.root, '.skills/test-dup'))).toBe(true);
    expect(result.stdout + result.stderr).toContain('Duplicate skill');
  });
});

async function writeConfig(root: string, config: SkillsConfig): Promise<void> {
  await fs.writeJson(path.join(root, 'skillz.json'), config, {
    spaces: JSON_INDENTATION_SPACES,
  });
}
