import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { createMockWorkspace, MockWorkspace } from '../helpers/workspace.js';
import {
  detectEnvironments,
  detectPrimaryEnvironment,
  getEnvironmentByPreset,
  ENVIRONMENTS,
} from '../../src/core/environment-detector.js';
import fs from 'fs-extra';
import path from 'path';

describe('environment-detector', () => {
  let workspace: MockWorkspace;

  beforeEach(async () => {
    workspace = await createMockWorkspace();
  });

  afterEach(async () => {
    await workspace.cleanup();
  });

  it('should detect AGENTS.md environment', async () => {
    const cleanWorkspace = await createMockWorkspace({ skipAgentsMd: true });
    await fs.writeFile(path.join(cleanWorkspace.root, 'AGENTS.md'), '# Existing agents file\n');

    const detected = await detectEnvironments(cleanWorkspace.root);
    const codexEnv = detected.find((env) => env.id === 'codex');

    expect(codexEnv).toBeDefined();
    expect(codexEnv?.preset).toBe('agentsmd');
    expect(codexEnv?.targets.map((t) => t.destination)).toContain('.skills');

    await cleanWorkspace.cleanup();
  });

  it('should detect Cursor environment', async () => {
    const cleanWorkspace = await createMockWorkspace({ skipAgentsMd: true });
    await fs.ensureDir(path.join(cleanWorkspace.root, '.cursor/rules'));
    await fs.writeFile(path.join(cleanWorkspace.root, '.cursorrules'), '# Cursor rules');

    const detected = await detectEnvironments(cleanWorkspace.root);
    const cursorEnv = detected.find((env) => env.id === 'cursor');

    expect(cursorEnv).toBeDefined();
    expect(cursorEnv?.preset).toBe('cursor');
    expect(cursorEnv?.targets.map((t) => t.destination)).toContain('.skills');

    await cleanWorkspace.cleanup();
  });

  it('should detect Claude environment', async () => {
    await fs.writeFile(path.join(workspace.root, 'CLAUDE.md'), '# Claude instructions');

    const detected = await detectEnvironments(workspace.root);
    const claudeEnv = detected.find((env) => env.id === 'claude');

    expect(claudeEnv).toBeDefined();
    expect(claudeEnv?.preset).toBe('claude');
    expect(claudeEnv?.targets.map((t) => t.destination)).toContain('.skills');
  });

  it('should detect Aider environment', async () => {
    await fs.ensureDir(path.join(workspace.root, '.aider'));
    await fs.writeFile(path.join(workspace.root, '.aider/conventions.md'), '# Conventions');

    const detected = await detectEnvironments(workspace.root);
    const aiderEnv = detected.find((env) => env.id === 'aider');

    expect(aiderEnv).toBeDefined();
    expect(aiderEnv?.preset).toBe('aider');
    expect(aiderEnv?.targets.map((t) => t.destination)).toContain('.skills');
  });

  it('should detect multiple environments', async () => {
    await fs.ensureDir(path.join(workspace.root, '.cursor/rules'));
    await fs.writeFile(path.join(workspace.root, 'CLAUDE.md'), '# Claude');

    const detected = await detectEnvironments(workspace.root);

    expect(detected.length).toBeGreaterThanOrEqual(2);
    expect(detected.some((env) => env.id === 'codex')).toBe(true);
    expect(detected.some((env) => env.id === 'cursor')).toBe(true);
    expect(detected.some((env) => env.id === 'claude')).toBe(true);
  });

  it('should return primary environment', async () => {
    const primary = await detectPrimaryEnvironment(workspace.root);

    expect(primary).toBeDefined();
    expect(primary?.id).toBe('codex');
  });

  it('should return null when no environment is detected', async () => {
    const cleanWorkspace = await createMockWorkspace({ skipAgentsMd: true });

    const detected = await detectEnvironments(cleanWorkspace.root);
    const primary = await detectPrimaryEnvironment(cleanWorkspace.root);

    expect(detected.length).toBe(0);
    expect(primary).toBeNull();

    await cleanWorkspace.cleanup();
  });

  it('should get environment by preset', () => {
    expect(getEnvironmentByPreset('agentsmd')?.id).toBe('codex');
    expect(getEnvironmentByPreset('cursor')?.id).toBe('cursor');
    expect(getEnvironmentByPreset('claude')?.id).toBe('claude');
    expect(getEnvironmentByPreset('aider')?.id).toBe('aider');
  });

  it('should have all required environment metadata', () => {
    ENVIRONMENTS.forEach((env) => {
      expect(env.id).toBeDefined();
      expect(env.name).toBeDefined();
      expect(env.description).toBeDefined();
      expect(env.preset).toBeDefined();
      expect(env.markers.length).toBeGreaterThan(0);
      expect(env.targets).toEqual([{ destination: '.skills' }]);
      expect(env.skillDirectories).toBeDefined();
    });
  });
});
