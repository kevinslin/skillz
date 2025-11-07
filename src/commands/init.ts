import path from 'path';
import type { Config, DetectedConfig } from '../types/index.js';
import { getDefaultConfig, saveConfig, inferConfig, detectExistingConfig } from '../core/config.js';
import { info, success, warning } from '../utils/logger.js';
import { fileExists, safeReadFile, safeWriteFile } from '../utils/fs-helpers.js';

interface InitOptions {
  preset?: string;
  target?: string;
  additionalSkills?: string[];
  globalSkills?: boolean;
  sync?: boolean;
  template?: string;
  includeInstructions?: boolean;
}

export async function initCommand(options: InitOptions): Promise<void> {
  const cwd = process.cwd();

  // Check if already initialized
  const configPath = path.join(cwd, 'skillz.json');
  if (await fileExists(configPath)) {
    warning('Configuration file already exists at skillz.json');
    warning('Remove it first or use `skillz config` to modify settings');
    process.exit(1);
  }

  info('Initializing skillz...');

  // Generate config based on preset or options
  let config: Config;

  // if existing config, print and exit
  const existingConfig = await detectExistingConfig(cwd);
  if (existingConfig) {
    info('Existing configuration detected:');
    success(JSON.stringify(existingConfig, null, 2));
    process.exit(0);
  }

  if (options.preset) {
    config = getDefaultConfig(options.preset);
    info(`Using preset: ${options.preset}`);
  } else {
    config = getDefaultConfig();
  }

  // Override with command line options
  if (options.target) {
    config.targets = [options.target];
  }

  if (options.additionalSkills) {
    config.additionalSkills = options.additionalSkills;
  }

  if (options.globalSkills) {
    const globalSkillsDir = path.join(process.env.HOME || '~', '.claude/skills');
    if (!config.skillDirectories.includes(globalSkillsDir)) {
      config.skillDirectories.push(globalSkillsDir);
    }
  }

  if (options.includeInstructions !== undefined) {
    config.includeInstructions = options.includeInstructions;
  }

  // Only infer targets if a preset was specified but no explicit target given
  // This allows users to init without any targets for skill management only
  if (options.preset && !options.target && !config.targets.length) {
    const detected: DetectedConfig = await inferConfig(cwd);
    if (detected.targets.length > 0) {
      info(`Detected existing target files: ${detected.targets.join(', ')}`);
      config.targets = detected.targets;
    }
  }

  // Infer skill directories if not specified
  if (!config.skillDirectories.length && !config.additionalSkills.length) {
    const detected: DetectedConfig = await inferConfig(cwd);
    if (detected.skillDirectories.length > 0) {
      info(`Detected existing skill directories: ${detected.skillDirectories.join(', ')}`);
      config.additionalSkills = detected.skillDirectories;
    }
  }

  // Save configuration
  await saveConfig(config, cwd);
  success('Created configuration file: skillz.json');
  success('Previewing configuration...');
  success(JSON.stringify(config, null, 2));

  // Add .skillz-cache.json to .gitignore
  await addToGitignore(cwd);

  // Run initial sync only if targets are configured and --no-sync is not specified
  // Commander converts --no-sync to options.sync = false
  if (config.targets.length > 0 && options.sync !== false) {
    info('Running initial sync...');
    const { syncCommand } = await import('./sync.js');
    await syncCommand({});
  } else if (config.targets.length === 0) {
    info('No targets configured. Use `skillz create` and `skillz list` to manage skills.');
    info('Add targets later with `skillz config targets --add <file>` to enable syncing.');
  } else {
    info('Skipping initial sync (use `skillz sync` to sync skills)');
  }

  success('Initialization complete!');
}

async function addToGitignore(cwd: string): Promise<void> {
  const gitignorePath = path.join(cwd, '.gitignore');
  const cacheEntry = '.skillz-cache.json';

  let gitignoreContent = '';
  if (await fileExists(gitignorePath)) {
    gitignoreContent = await safeReadFile(gitignorePath);
  }

  if (!gitignoreContent.includes(cacheEntry)) {
    const newContent = gitignoreContent
      ? `${gitignoreContent.trim()}\n${cacheEntry}\n`
      : `${cacheEntry}\n`;
    await safeWriteFile(gitignorePath, newContent);
    success('Added .skillz-cache.json to .gitignore');
  }
}
