import path from 'path';
import type { Config, DetectedConfig, SkillDirectory, Target } from '../types/index.js';
import { safeReadFile, safeWriteFile, fileExists } from '../utils/fs-helpers.js';
import { validateConfig } from '../utils/validation.js';
import { debug, info, success } from '../utils/logger.js';

const CONFIG_FILE = 'skillz.json';
const DEFAULT_TARGET_DIRECTORY = '.skills';
const LEGACY_FILE_TARGETS = new Set([
  'AGENTS.md',
  '.cursorrules',
  '.cursor/rules/skills.mdc',
  'CLAUDE.md',
  '.claude/CLAUDE.md',
  '.aider/conventions.md',
]);
const FILE_TARGET_PATTERN = /\.(md|mdc|txt)$/i;
const UNSUPPORTED_SYNC_MODE_MESSAGE =
  'Prompt mode is no longer supported. Update your targets to directories such as ".skills" and remove syncMode/template/pathStyle settings.';

type RawTarget =
  | Target
  | {
      name?: string;
      destination?: string;
      preset?: Target['preset'];
      syncMode?: string;
      deleteExistingFromTarget?: boolean;
      template?: string;
      pathStyle?: string;
    }
  | string;

type RawSkillDirectory = SkillDirectory | string;

type RawConfig = {
  version?: string;
  preset?: Config['preset'];
  targets?: RawTarget[];
  skillDirectories?: RawSkillDirectory[];
  additionalSkills?: unknown;
  ignore?: unknown;
  defaultEditor?: unknown;
  autoSyncAfterEdit?: unknown;
  syncMode?: string;
  template?: string;
  pathStyle?: string;
  skillsSectionName?: string;
};

/**
 * Load configuration from file
 */
export async function loadConfig(cwd: string): Promise<Config | null> {
  const rawConfig = await detectExistingConfig(cwd);

  if (!rawConfig) {
    return null;
  }

  const config = normalizeConfig(rawConfig);
  const validation = validateConfig(config);

  if (!validation.success) {
    throw new Error(`Invalid configuration: ${JSON.stringify(validation.error.errors)}`);
  }

  if (JSON.stringify(rawConfig) !== JSON.stringify(config)) {
    info('Migrating skillz.json to native-only config...');
    await saveConfig(config, cwd);
    success('Configuration migrated successfully');
  }

  return config;
}

/**
 * Save configuration to file
 */
export async function saveConfig(config: Config, cwd: string): Promise<void> {
  const normalizedConfig = normalizeConfig(config);
  const validation = validateConfig(normalizedConfig);

  if (!validation.success) {
    throw new Error(`Invalid configuration: ${JSON.stringify(validation.error.errors)}`);
  }

  const configPath = path.join(cwd, CONFIG_FILE);
  const content = JSON.stringify(normalizedConfig, null, 2);
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
      targets: [{ destination: DEFAULT_TARGET_DIRECTORY }],
    };
  }

  if (preset === 'aider') {
    return {
      ...baseConfig,
      preset: 'aider',
      targets: [{ destination: DEFAULT_TARGET_DIRECTORY }],
    };
  }

  if (preset === 'cursor') {
    return {
      ...baseConfig,
      preset: 'cursor',
      targets: [{ destination: DEFAULT_TARGET_DIRECTORY }],
    };
  }

  if (preset === 'claude') {
    return {
      ...baseConfig,
      preset: 'claude',
      targets: [{ destination: DEFAULT_TARGET_DIRECTORY }],
    };
  }

  return baseConfig;
}

/**
 * Read existing raw configuration in directory if present
 */
export async function detectExistingConfig(cwd: string): Promise<RawConfig | null> {
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
    return JSON.parse(content) as RawConfig;
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

  const potentialTargets = [DEFAULT_TARGET_DIRECTORY];

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

  (config as unknown as Record<string, unknown>)[key] = value;

  await saveConfig(config, cwd);
}

function normalizeConfig(rawConfig: unknown): Config {
  if (!rawConfig || typeof rawConfig !== 'object') {
    throw new Error('Invalid configuration: expected an object');
  }

  const parsed = rawConfig as RawConfig;

  if (parsed.syncMode && parsed.syncMode !== 'native') {
    throw new Error(UNSUPPORTED_SYNC_MODE_MESSAGE);
  }

  return {
    version: parsed.version === '1.0' ? '2.0' : parsed.version ?? '2.0',
    preset: parsed.preset,
    targets: normalizeTargets(parsed.targets),
    skillDirectories: normalizeSkillDirectories(parsed.skillDirectories),
    additionalSkills: normalizeStringArray(parsed.additionalSkills),
    ignore: normalizeStringArray(parsed.ignore),
    defaultEditor:
      typeof parsed.defaultEditor === 'string' ? parsed.defaultEditor : process.env.EDITOR || 'vi',
    autoSyncAfterEdit:
      typeof parsed.autoSyncAfterEdit === 'boolean' ? parsed.autoSyncAfterEdit : true,
  };
}

function normalizeTargets(targets: RawTarget[] | undefined): Target[] {
  if (!Array.isArray(targets)) {
    return [];
  }

  return targets.map((target) => {
    if (typeof target === 'string') {
      return buildTarget(target, undefined, undefined);
    }

    const targetObject = target as Record<string, unknown>;
    const destination =
      typeof targetObject.destination === 'string'
        ? targetObject.destination
        : typeof targetObject.name === 'string'
          ? targetObject.name
          : '';
    const syncMode =
      typeof targetObject.syncMode === 'string' ? targetObject.syncMode : undefined;
    const preset =
      targetObject.preset === 'agentsmd' ||
      targetObject.preset === 'aider' ||
      targetObject.preset === 'cursor' ||
      targetObject.preset === 'claude'
        ? targetObject.preset
        : undefined;
    const deleteExistingFromTarget =
      typeof targetObject.deleteExistingFromTarget === 'boolean'
        ? targetObject.deleteExistingFromTarget
        : undefined;

    if (syncMode && syncMode !== 'native') {
      throw new Error(UNSUPPORTED_SYNC_MODE_MESSAGE);
    }

    return buildTarget(destination, preset, deleteExistingFromTarget);
  });
}

function normalizeSkillDirectories(skillDirectories: RawSkillDirectory[] = []): SkillDirectory[] {
  return skillDirectories.map((dir) => (typeof dir === 'string' ? { localPath: dir } : dir));
}

function buildTarget(
  destination: string,
  preset: Target['preset'],
  deleteExistingFromTarget: boolean | undefined
): Target {
  if (!destination) {
    throw new Error('Invalid configuration: target destination is required');
  }

  if (isLegacyFileTarget(destination)) {
    throw new Error(
      `Legacy file target "${destination}" is no longer supported. Update the target to a directory such as "${DEFAULT_TARGET_DIRECTORY}".`
    );
  }

  return {
    destination,
    preset,
    deleteExistingFromTarget,
  };
}

function normalizeStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string')
    : [];
}

function isLegacyFileTarget(destination: string): boolean {
  const normalized = destination.replaceAll('\\', '/').replace(/\/+$/, '');
  const basename = path.posix.basename(normalized);
  return LEGACY_FILE_TARGETS.has(normalized) || FILE_TARGET_PATTERN.test(basename);
}
