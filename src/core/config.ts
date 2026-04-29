import path from 'path';
import type { Config, DetectedConfig, SkillDirectory, Target } from '../types/index.js';
import { safeReadFile, safeWriteFile, fileExists } from '../utils/fs-helpers.js';
import { validateConfig } from '../utils/validation.js';
import { debug, info, success } from '../utils/logger.js';

const CONFIG_FILE = 'skillz.json';
const DEFAULT_TARGET = '.skills';
const REMOVED_CONFIG_FIELDS = ['template', 'pathStyle', 'syncMode', 'skillsSectionName'] as const;
const REMOVED_TARGET_FIELDS = [
  'template',
  'preset',
  'pathStyle',
  'syncMode',
  'skillsSectionName',
] as const;

/**
 * Load configuration from file
 */
export async function loadConfig(cwd: string): Promise<Config | null> {
  let config = await detectExistingConfig(cwd);

  if (!config) {
    return null;
  }

  const removedFields = collectRemovedConfigFields(config);
  if (removedFields.length > 0) {
    throw new Error(
      `Invalid configuration: removed config fields are no longer supported: ${removedFields.join(
        ', '
      )}`
    );
  }

  // Auto-migrate legacy target formats and version 1.0 configs
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

function collectRemovedConfigFields(config: unknown): string[] {
  if (!config || typeof config !== 'object') {
    return [];
  }

  const parsed = config as Record<string, unknown>;
  const removedFields: string[] = [];

  for (const field of REMOVED_CONFIG_FIELDS) {
    if (field in parsed) {
      removedFields.push(field);
    }
  }

  if (Array.isArray(parsed.targets)) {
    parsed.targets.forEach((target, index) => {
      if (!target || typeof target !== 'object') {
        return;
      }

      const targetRecord = target as Record<string, unknown>;
      for (const field of REMOVED_TARGET_FIELDS) {
        if (field in targetRecord) {
          removedFields.push(`targets[${index}].${field}`);
        }
      }
    });
  }

  return removedFields;
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
    version: '2.0',
    targets: [],
    skillDirectories: [{ localPath: '.claude/skills' }],
    additionalSkills: [],
    ignore: [],
    defaultEditor: process.env.EDITOR || 'vi',
    autoSyncAfterEdit: true,
  };

  if (preset === 'agentsmd') {
    return {
      ...baseConfig,
      preset: 'agentsmd',
      targets: [{ destination: DEFAULT_TARGET, deleteExistingFromTarget: true }],
    };
  }

  if (preset === 'aider') {
    return {
      ...baseConfig,
      preset: 'aider',
      targets: [{ destination: DEFAULT_TARGET, deleteExistingFromTarget: true }],
    };
  }

  if (preset === 'cursor') {
    return {
      ...baseConfig,
      preset: 'cursor',
      targets: [{ destination: DEFAULT_TARGET, deleteExistingFromTarget: true }],
    };
  }

  if (preset === 'claude') {
    return {
      ...baseConfig,
      preset: 'claude',
      targets: [{ destination: DEFAULT_TARGET, deleteExistingFromTarget: true }],
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
  debug(`loading config from file: ${configPath}`);
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

  const potentialTargets = [DEFAULT_TARGET];

  for (const target of potentialTargets) {
    const targetPath = path.join(cwd, target);
    if (await fileExists(targetPath)) {
      targets.push({ destination: target });
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
 * Check if config needs migration from legacy targets
 */
export function needsMigration(config: unknown): boolean {
  if (!config || typeof config !== 'object') {
    return false;
  }

  const parsed = config as Record<string, unknown>;

  if (parsed.version === '1.0') {
    return true;
  }

  const needsSkillDirectoryMigration =
    Array.isArray(parsed.skillDirectories) &&
    parsed.skillDirectories.some((dir) => typeof dir === 'string');

  const needsTargetMigration =
    Array.isArray(parsed.targets) &&
    parsed.targets.some((target) => {
      if (typeof target === 'string') {
        return true;
      }

      if (typeof target === 'object' && target !== null) {
        return !('destination' in target) && 'name' in target;
      }

      return false;
    });

  return needsSkillDirectoryMigration || needsTargetMigration;
}

type LegacyNameTarget = Omit<Target, 'destination'> & { name: string };
type LegacyTarget = Target | LegacyNameTarget | string;
type LegacySkillDirectory = SkillDirectory | string;
type LegacyConfig = Omit<Config, 'targets' | 'skillDirectories'> & {
  targets: LegacyTarget[];
  skillDirectories?: LegacySkillDirectory[];
};

function normalizeSkillDirectories(
  skillDirectories: LegacySkillDirectory[] = []
): SkillDirectory[] {
  return skillDirectories.map((dir) => (typeof dir === 'string' ? { localPath: dir } : dir));
}

/**
 * Migrate config from legacy targets to Target[] targets.
 */
export function migrateConfig(config: LegacyConfig): Config {
  const targets = config.targets.map((target) => {
    if (typeof target === 'string') {
      return { destination: target };
    }

    const destination = 'destination' in target ? target.destination : target.name;
    return {
      destination,
      deleteExistingFromTarget: target.deleteExistingFromTarget,
    };
  });

  const skillDirectories = normalizeSkillDirectories(
    Array.isArray(config.skillDirectories) ? config.skillDirectories : []
  );

  const migrated: Config = {
    version: config.version === '1.0' ? '2.0' : config.version,
    targets,
    skillDirectories,
    additionalSkills: config.additionalSkills ?? [],
    ignore: config.ignore ?? [],
    defaultEditor: config.defaultEditor,
    autoSyncAfterEdit: config.autoSyncAfterEdit,
  };

  if (config.preset) {
    migrated.preset = config.preset;
  }

  return migrated;
}
