import path from 'path';
import type { Config, DetectedConfig } from '../types/index.js';
import { getDefaultConfig, saveConfig, inferConfig } from '../core/config.js';
import { info, success, warning, error } from '../utils/logger.js';
import { fileExists, safeReadFile, safeWriteFile } from '../utils/fs-helpers.js';
import { detectEnvironments, type DetectedEnvironment } from '../core/environment-detector.js';
import { confirm, select, editInEditor, isInteractive } from '../utils/prompts.js';

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
  let detectedEnv: DetectedEnvironment | null = null;

  // Skip detection if explicit preset or target is provided
  const skipDetection = !!(options.preset || options.target);

  // Detect environment if no explicit options and running interactively
  if (!skipDetection && isInteractive()) {
    const environments = await detectEnvironments(cwd);

    if (environments.length > 0) {
      detectedEnv = await handleEnvironmentDetection(environments);

      if (detectedEnv) {
        info(`Using detected environment: ${detectedEnv.name}`);
        config = getDefaultConfig(detectedEnv.preset);
      } else {
        info('Skipping environment detection, using default configuration');
        config = getDefaultConfig();
      }
    } else {
      info('No known environments detected, using default configuration');
      config = getDefaultConfig();
    }
  } else {
    // Use explicit preset or default
    if (options.preset) {
      config = getDefaultConfig(options.preset);
      info(`Using preset: ${options.preset}`);
    } else {
      config = getDefaultConfig();
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

  // Allow user to edit config before saving (if interactive)
  if (isInteractive() && detectedEnv) {
    config = await confirmOrEditConfig(config);
  }

  // Save configuration
  await saveConfig(config, cwd);
  success('Created configuration file: skillz.json');
  success('Configuration:');
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

/**
 * Handle environment detection with interactive prompts
 */
async function handleEnvironmentDetection(
  environments: DetectedEnvironment[]
): Promise<DetectedEnvironment | null> {
  if (environments.length === 0) {
    return null;
  }

  // Single environment detected
  if (environments.length === 1) {
    const env = environments[0];
    info(`Detected ${env.name} environment (${env.description})`);
    info(`Preset: ${env.preset}`);
    info(`Targets: ${env.targets.join(', ')}`);

    const shouldUse = await confirm('Use this environment configuration?', true);
    return shouldUse ? env : null;
  }

  // Multiple environments detected - let user choose
  info(`Multiple environments detected:`);
  environments.forEach((env, idx) => {
    info(`  ${idx + 1}. ${env.name} - ${env.description}`);
  });

  const selectedValue = await select('Select an environment:', [
    ...environments.map((env) => ({
      label: `${env.name} (${env.preset})`,
      value: env.id,
    })),
    { label: 'Skip detection', value: 'skip' },
  ]);

  if (selectedValue === 'skip') {
    return null;
  }

  return environments.find((env) => env.id === selectedValue) || null;
}

/**
 * Allow user to confirm or edit configuration
 */
async function confirmOrEditConfig(config: Config): Promise<Config> {
  info('\nConfiguration preview:');
  console.log(JSON.stringify(config, null, 2));

  const action = await select('\nWhat would you like to do?', [
    { label: 'Accept and continue', value: 'accept' },
    { label: 'Edit in $EDITOR', value: 'edit' },
    { label: 'Cancel', value: 'cancel' },
  ]);

  if (action === 'cancel') {
    info('Initialization cancelled');
    process.exit(0);
  }

  if (action === 'edit') {
    try {
      const editedJson = await editInEditor(JSON.stringify(config, null, 2));
      const editedConfig = JSON.parse(editedJson) as Config;

      // Validate the edited config
      const { validateConfig } = await import('../utils/validation.js');
      const validation = validateConfig(editedConfig);

      if (!validation.success) {
        error('Invalid configuration after editing:');
        error(JSON.stringify(validation.error.errors, null, 2));
        const retry = await confirm('Would you like to edit again?', true);
        if (retry) {
          return confirmOrEditConfig(editedConfig);
        }
        process.exit(1);
      }

      success('Configuration updated successfully');
      return editedConfig;
    } catch (err) {
      error(`Failed to edit configuration: ${(err as Error).message}`);
      const retry = await confirm('Would you like to try again?', true);
      if (retry) {
        return confirmOrEditConfig(config);
      }
      process.exit(1);
    }
  }

  return config;
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
