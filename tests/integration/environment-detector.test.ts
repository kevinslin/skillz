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
    // AGENTS.md already exists in mock workspace
    const detected = await detectEnvironments(workspace.root);

    expect(detected.length).toBeGreaterThan(0);
    const codexEnv = detected.find((env) => env.id === 'codex');
    expect(codexEnv).toBeDefined();
    expect(codexEnv?.preset).toBe('agentsmd');
  });

  it('should detect Cursor environment', async () => {
    await fs.writeFile(path.join(workspace.root, '.cursorrules'), '# Cursor rules');

    const detected = await detectEnvironments(workspace.root);

    const cursorEnv = detected.find((env) => env.id === 'cursor');
    expect(cursorEnv).toBeDefined();
    expect(cursorEnv?.preset).toBe('cursor');
    expect(cursorEnv?.targets).toContain('.cursor/rules/skills.mdc');
  });

  it('should detect Claude environment', async () => {
    await fs.writeFile(path.join(workspace.root, 'CLAUDE.md'), '# Claude instructions');

    const detected = await detectEnvironments(workspace.root);

    const claudeEnv = detected.find((env) => env.id === 'claude');
    expect(claudeEnv).toBeDefined();
    expect(claudeEnv?.preset).toBe('claude');
    expect(claudeEnv?.targets).toContain('CLAUDE.md');
  });

  it('should detect Aider environment', async () => {
    await fs.ensureDir(path.join(workspace.root, '.aider'));
    await fs.writeFile(path.join(workspace.root, '.aider/conventions.md'), '# Conventions');

    const detected = await detectEnvironments(workspace.root);

    const aiderEnv = detected.find((env) => env.id === 'aider');
    expect(aiderEnv).toBeDefined();
    expect(aiderEnv?.preset).toBe('aider');
    expect(aiderEnv?.targets).toContain('.aider/conventions.md');
  });

  it('should detect multiple environments', async () => {
    // Create multiple marker files
    await fs.writeFile(path.join(workspace.root, '.cursorrules'), '# Cursor');
    await fs.writeFile(path.join(workspace.root, 'CLAUDE.md'), '# Claude');

    const detected = await detectEnvironments(workspace.root);

    expect(detected.length).toBeGreaterThanOrEqual(2);
    expect(detected.some((env) => env.id === 'codex')).toBe(true); // AGENTS.md from mock
    expect(detected.some((env) => env.id === 'cursor')).toBe(true);
    expect(detected.some((env) => env.id === 'claude')).toBe(true);
  });

  it('should return primary environment', async () => {
    const primary = await detectPrimaryEnvironment(workspace.root);

    expect(primary).toBeDefined();
    expect(primary?.id).toBe('codex'); // First match in ENVIRONMENTS list
  });

  it('should return null when no environment detected', async () => {
    // Create a clean workspace without any marker files
    const cleanWorkspace = await createMockWorkspace();
    await fs.remove(cleanWorkspace.agentsFile); // Remove AGENTS.md

    const detected = await detectEnvironments(cleanWorkspace.root);
    const primary = await detectPrimaryEnvironment(cleanWorkspace.root);

    expect(detected.length).toBe(0);
    expect(primary).toBeNull();

    await cleanWorkspace.cleanup();
  });

  it('should get environment by preset', () => {
    const codexEnv = getEnvironmentByPreset('agentsmd');
    expect(codexEnv).toBeDefined();
    expect(codexEnv?.id).toBe('codex');

    const cursorEnv = getEnvironmentByPreset('cursor');
    expect(cursorEnv).toBeDefined();
    expect(cursorEnv?.id).toBe('cursor');

    const claudeEnv = getEnvironmentByPreset('claude');
    expect(claudeEnv).toBeDefined();
    expect(claudeEnv?.id).toBe('claude');

    const aiderEnv = getEnvironmentByPreset('aider');
    expect(aiderEnv).toBeDefined();
    expect(aiderEnv?.id).toBe('aider');
  });

  it('should have all required environment metadata', () => {
    ENVIRONMENTS.forEach((env) => {
      expect(env.id).toBeDefined();
      expect(env.name).toBeDefined();
      expect(env.description).toBeDefined();
      expect(env.preset).toBeDefined();
      expect(env.markers).toBeDefined();
      expect(env.markers.length).toBeGreaterThan(0);
      expect(env.targets).toBeDefined();
      expect(env.targets.length).toBeGreaterThan(0);
      expect(env.skillDirectories).toBeDefined();
    });
  });
});
