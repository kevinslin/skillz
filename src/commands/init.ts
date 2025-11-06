import path from 'path';
import type { Config } from '../types/index.js';
import { getDefaultConfig, saveConfig, detectExistingConfig } from '../core/config.js';
import { info, success, warning } from '../utils/logger.js';
import { fileExists, safeReadFile, safeWriteFile } from '../utils/fs-helpers.js';

interface InitOptions {
  preset?: string;
  target?: string;
  additionalSkills?: string[];
  globalSkills?: boolean;
  noSync?: boolean;
  template?: string;
  includeInstructions?: boolean;
}

export async function initCommand(options: InitOptions): Promise<void> {
  const cwd = process.cwd();

  // Check if already initialized
  const configPath = path.join(cwd, '.skills.json');
  if (await fileExists(configPath)) {
    warning('Configuration file already exists at .skills.json');
    warning('Remove it first or use `skillz config` to modify settings');
    process.exit(1);
  }

  info('Initializing skillz...');

  // Generate config based on preset or options
  let config: Config;

  if (options.preset) {
    config = getDefaultConfig(options.preset);
    info(`Using preset: ${options.preset}`);
  } else {
    // Detect existing configuration
    const detected = await detectExistingConfig(cwd);

    if (detected.targets.length > 0) {
      info(`Detected existing target files: ${detected.targets.join(', ')}`);
    }

    config = getDefaultConfig();

    if (detected.targets.length > 0) {
      config.targets = detected.targets;
    }
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

  // Save configuration
  await saveConfig(config, cwd);
  success('Created configuration file: .skills.json');

  // Add .skillz-cache.json to .gitignore
  await addToGitignore(cwd);

  // Run initial sync unless --no-sync is specified
  if (!options.noSync) {
    info('Running initial sync...');
    const { syncCommand } = await import('./sync.js');
    await syncCommand({});
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
