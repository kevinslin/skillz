import path from 'path';
import type { Config, DetectedConfig, Target } from '../types/index.js';
import { safeReadFile, safeWriteFile, fileExists } from '../utils/fs-helpers.js';
import { validateConfig } from '../utils/validation.js';
import { info } from 'console';
import { success } from '../utils/logger.js';

const CONFIG_FILE = 'skillz.json';

/**
 * Load configuration from file
 */
export async function loadConfig(cwd: string): Promise<Config | null> {
  let config = await detectExistingConfig(cwd);

  if (!config) {
    return null;
  }

  // Auto-migrate old string[] format to Target[] format
  if (needsMigration(config)) {
    info('Migrating skillz.json to new target format...');
    config = migrateConfig(config);
    await saveConfig(config, cwd);
    success('Configuration migrated successfully');
  }

  const validation = validateConfig(config);

  if (!validation.success) {
    throw new Error(`Invalid configuration: ${JSON.stringify(validation.error.errors)}`);
  }

  return config;
}

/**
 * Save configuration to file
 */
export async function saveConfig(config: Config, cwd: string): Promise<void> {
  const validation = validateConfig(config);

  if (!validation.success) {
    throw new Error(`Invalid configuration: ${JSON.stringify(validation.error.errors)}`);
  }

  const configPath = path.join(cwd, CONFIG_FILE);
  const content = JSON.stringify(config, null, 2);
  await safeWriteFile(configPath, content);
}

/**
 * Get default configuration based on preset
 */
export function getDefaultConfig(preset?: string): Config {
  const baseConfig: Config = {
    version: '1.0',
    targets: [],
    skillDirectories: ['.claude/skills'],
    additionalSkills: [],
    ignore: [],
    skillsSectionName: '## Additional Instructions',
    defaultEditor: process.env.EDITOR || 'vi',
    autoSyncAfterEdit: true,
    template: 'default',
    pathStyle: 'relative',
  };

  if (preset === 'agentsmd') {
    return {
      ...baseConfig,
      preset: 'agentsmd',
      targets: [{ name: 'AGENTS.md' }],
    };
  }

  if (preset === 'aider') {
    return {
      ...baseConfig,
      preset: 'aider',
      targets: [{ name: '.aider/conventions.md' }],
    };
  }

  if (preset === 'cursor') {
    return {
      ...baseConfig,
      preset: 'cursor',
      targets: [{ name: '.cursor/rules/skills.mdc' }],
    };
  }

  if (preset === 'claude') {
    return {
      ...baseConfig,
      preset: 'claude',
      targets: [{ name: 'CLAUDE.md' }],
    };
  }

  // No preset: return empty targets for skill management only
  return baseConfig;
}

/**
 * Read existing configuration in directory if present
 */
export async function detectExistingConfig(cwd: string): Promise<Config | null> {
  const configPath = path.join(cwd, CONFIG_FILE);
  const exists = await fileExists(configPath);

  if (!exists) {
    return null;
  }

  const content = await safeReadFile(configPath);
  if (!content) {
    return null;
  }

  try {
    return JSON.parse(content) as Config;
  } catch (error) {
    throw new Error(`Failed to parse config file: ${(error as Error).message}`);
  }
}

/**
 * Infer configuration details from existing files and directories
 */
export async function inferConfig(cwd: string): Promise<DetectedConfig> {
  const targets: Target[] = [];
  const skillDirectories: string[] = [];

  const potentialTargets = [
    'AGENTS.md',
    '.cursorrules',
    '.cursor/rules/skills.mdc',
    'CLAUDE.md',
    '.claude/CLAUDE.md',
    '.aider/conventions.md',
  ];

  for (const target of potentialTargets) {
    const targetPath = path.join(cwd, target);
    if (await fileExists(targetPath)) {
      targets.push({ name: target });
    }
  }

  const potentialSkillDirs = [
    '.claude/skills',
    path.join(process.env.HOME || '~', '.claude/skills'),
  ];

  for (const dir of potentialSkillDirs) {
    const resolvedDir = dir.startsWith('~') ? dir : path.join(cwd, dir);
    if (await fileExists(resolvedDir)) {
      skillDirectories.push(dir);
    }
  }

  return {
    targets,
    skillDirectories,
  };
}

/**
 * Update a specific config value
 */
export async function updateConfig(cwd: string, key: string, value: unknown): Promise<void> {
  const config = await loadConfig(cwd);

  if (!config) {
    throw new Error('No configuration file found. Run `skillz init` first.');
  }

  // Update the config
  (config as unknown as Record<string, unknown>)[key] = value;

  await saveConfig(config, cwd);
}

/**
 * Check if config needs migration from string[] to Target[]
 */
export function needsMigration(config: unknown): boolean {
  if (!config || typeof config !== 'object') {
    return false;
  }

  const parsed = config as Record<string, unknown>;

  // Check if targets is an array
  if (!Array.isArray(parsed.targets)) {
    return false;
  }

  // If empty array, no migration needed
  if (parsed.targets.length === 0) {
    return false;
  }

  // Check if first element is a string (old format)
  return typeof parsed.targets[0] === 'string';
}

/**
 * Migrate config from string[] targets to Target[] targets
 */
export function migrateConfig(config: Config): Config {
  const targets = config.targets.map((target) => {
    // If already a Target object, return as-is
    if (typeof target === 'object' && target !== null && 'name' in target) {
      return target;
    }

    // Convert string to Target object
    return { name: target as unknown as string };
  });

  return {
    ...config,
    targets,
  };
}

/**
 * Resolve template for a target (target-specific > global > default)
 */
export function resolveTargetTemplate(target: Target, config: Config): string {
  return target.template ?? config.template ?? 'default';
}

/**
 * Resolve pathStyle for a target (target-specific > global > default)
 */
export function resolveTargetPathStyle(target: Target, config: Config): 'relative' | 'absolute' {
  return target.pathStyle ?? config.pathStyle ?? 'relative';
}

/**
 * Resolve preset for a target (target-specific > global)
 */
export function resolveTargetPreset(
  target: Target,
  config: Config
): 'agentsmd' | 'aider' | 'cursor' | 'claude' | undefined {
  return target.preset ?? config.preset;
}

/**
 * Resolve syncMode for a target (target-specific > global > default)
 */
export function resolveTargetSyncMode(target: Target, config: Config): 'prompt' | 'symlink' {
  return target.syncMode ?? config.syncMode ?? 'prompt';
}
