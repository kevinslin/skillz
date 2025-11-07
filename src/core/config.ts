import path from 'path';
import type { Config, DetectedConfig } from '../types/index.js';
import { safeReadFile, safeWriteFile, fileExists } from '../utils/fs-helpers.js';
import { validateConfig } from '../utils/validation.js';

const CONFIG_FILE = '.skills.json';

/**
 * Load configuration from file
 */
export async function loadConfig(cwd: string): Promise<Config | null> {
  const config = await detectExistingConfig(cwd);

  if (!config) {
    return null;
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
    includeInstructions: false,
    autoSync: false,
    skillsSectionName: '## Additional Instructions',
  };

  if (preset === 'agentsmd') {
    return {
      ...baseConfig,
      preset: 'agentsmd',
      targets: ['AGENTS.md'],
    };
  }

  if (preset === 'aider') {
    return {
      ...baseConfig,
      preset: 'aider',
      targets: ['.aider/conventions.md'],
    };
  }

  return {
    ...baseConfig,
    targets: ['AGENTS.md'],
  };
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
  const targets: string[] = [];
  const skillDirectories: string[] = [];

  const potentialTargets = ['AGENTS.md', '.cursorrules', '.aider/conventions.md'];

  for (const target of potentialTargets) {
    const targetPath = path.join(cwd, target);
    if (await fileExists(targetPath)) {
      targets.push(target);
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
