import { loadConfig, resolveTargetSyncMode } from '../core/config.js';
import { scanAllSkillDirectories } from '../core/skill-scanner.js';
import { loadCache, saveCache, updateCache } from '../core/cache-manager.js';
import { detectChanges, hasChanges, summarizeChanges } from '../core/change-detector.js';
import {
  writeTargetFile,
  validateNativeTargets,
  copySkillsToTarget,
} from '../core/target-manager.js';
import {
  info,
  success,
  warning,
  error,
  spinner,
  formatSkillName,
  formatChangeType,
  debug,
  setVerbose,
} from '../utils/logger.js';
import { ensureSkillzProjectCwd } from '../utils/workspace.js';
import { calculateConfigHash, hashesMatch } from '../utils/hash.js';

interface SyncOptions {
  dryRun?: boolean;
  force?: boolean;
  verbose?: boolean;
  only?: string[];
  pathStyle?: string;
  template?: string;
}

export async function syncCommand(options: SyncOptions): Promise<void> {
  if (options.verbose) {
    setVerbose(true);
  }

  const { cwd } = await ensureSkillzProjectCwd();

  // Load configuration
  const config = await loadConfig(cwd);
  if (!config) {
    error('No configuration file found. Run `skillz init` first.');
    process.exit(1);
  }

  // Handle --path-style option
  if (options.pathStyle) {
    // Normalize shorthand values
    const normalizedStyle = options.pathStyle.toLowerCase();
    if (normalizedStyle === 'rel') {
      config.pathStyle = 'relative';
    } else if (normalizedStyle === 'abs') {
      config.pathStyle = 'absolute';
    } else if (normalizedStyle === 'relative' || normalizedStyle === 'absolute') {
      config.pathStyle = normalizedStyle as 'relative' | 'absolute';
    } else {
      error(
        `Invalid path style: "${options.pathStyle}". Must be one of: relative, absolute, rel, abs`
      );
      process.exit(1);
    }
    debug(`Using path style from CLI: ${config.pathStyle}`);
  } else if (config.pathStyle) {
    debug(`Using path style from config: ${config.pathStyle}`);
  } else {
    debug('Using default path style: relative');
  }

  // Handle --template option
  if (options.template) {
    config.template = options.template;
    debug(`Using template from CLI: ${config.template}`);
  } else if (config.template) {
    debug(`Using template from config: ${config.template}`);
  } else {
    debug('Using default template');
  }

  // Scan skills
  const spin = spinner('Scanning skill directories...\n').start();
  const skills = await scanAllSkillDirectories(config);
  spin.succeed(`Found ${skills.length} skill(s)`);

  if (skills.length === 0) {
    warning('No skills found. Make sure your skill directories contain SKILL.md files.');
    return;
  }

  // Filter to --only skills if specified
  let filteredSkills = skills;
  if (options.only && options.only.length > 0) {
    filteredSkills = skills.filter((skill) => options.only!.includes(skill.name));
    info(`Filtering to ${filteredSkills.length} skill(s): ${options.only.join(', ')}`);

    if (filteredSkills.length === 0) {
      error('No matching skills found');
      process.exit(1);
    }
  }

  // Load cache
  debug(`loading cache from ${cwd}`);
  const cache = await loadCache(cwd);

  // Detect changes if not forcing and cache exists
  if (!options.force && cache && cache !== null) {
    // Check if config has changed
    const currentConfigHash = calculateConfigHash(config);
    const configChanged = !hashesMatch(currentConfigHash, cache.configHash);

    // Check if skills have changed
    const changes = detectChanges(filteredSkills, cache);
    const skillsChanged = hasChanges(changes);

    // Exit early only if neither config nor skills changed
    if (!configChanged && !skillsChanged) {
      success('All skills are up to date');
      return;
    }

    // Report what changed
    const changeReasons: string[] = [];
    if (configChanged) {
      changeReasons.push('configuration changed');
      if (options.verbose) {
        debug('  Configuration file (skillz.json) has been modified');
      }
    }

    if (skillsChanged) {
      const summary = summarizeChanges(changes);
      if (summary.new > 0) changeReasons.push(`${summary.new} new skill(s)`);
      if (summary.modified > 0) changeReasons.push(`${summary.modified} modified skill(s)`);
      if (summary.removed > 0) changeReasons.push(`${summary.removed} removed skill(s)`);

      if (options.verbose) {
        for (const change of changes) {
          if (change.type !== 'unchanged') {
            debug(
              `  ${formatChangeType(change.type)} ${formatSkillName(change.skill?.name || 'unknown')}`
            );
          }
        }
      }
    }

    info(`Changes detected: ${changeReasons.join(', ')}`);
  } else if (!cache) {
    info('No cache found, syncing all skills');
  } else {
    info('Force mode: syncing all skills');
  }

  // Dry run mode
  if (options.dryRun) {
    info('Dry run mode: no files will be modified');

    const promptTargets = config.targets.filter(
      (t) => resolveTargetSyncMode(t, config) === 'prompt'
    );
    const nativeTargets = config.targets.filter(
      (t) => resolveTargetSyncMode(t, config) === 'native'
    );

    if (promptTargets.length > 0) {
      info(
        `Would sync ${filteredSkills.length} skill(s) to ${promptTargets.length} file target(s)`
      );
    }

    if (nativeTargets.length > 0) {
      info(
        `Would copy ${filteredSkills.length} skill(s) to ${nativeTargets.length} directory target(s):`
      );
      for (const target of nativeTargets) {
        info(`  → ${target.destination}/`);
        for (const skill of filteredSkills) {
          info(`    - ${skill.name}`);
        }
      }
    }

    return;
  }

  // Validate native targets upfront (abort early if conflicts)
  const nativeTargets = config.targets.filter((t) => resolveTargetSyncMode(t, config) === 'native');

  if (nativeTargets.length > 0) {
    const validationSpin = spinner('Validating native targets...\n').start();

    try {
      // Get cached skill names to skip validation for managed copies
      const cachedSkillNames = cache ? new Set(Object.keys(cache.skills)) : new Set<string>();
      await validateNativeTargets(nativeTargets, filteredSkills, cwd, cachedSkillNames);
      validationSpin.succeed('No conflicts detected');
    } catch (err) {
      validationSpin.fail('Validation failed');
      error((err as Error).message);
      process.exit(1);
    }
  }

  // Sync to all targets
  const syncSpin = spinner('Syncing skills to targets...\n').start();

  try {
    for (const target of config.targets) {
      const syncMode = resolveTargetSyncMode(target, config);

      if (syncMode === 'native') {
        await copySkillsToTarget(target, filteredSkills, cwd);
        debug(`Copied ${filteredSkills.length} skills to ${target.destination}`);
      } else {
        await writeTargetFile(target, filteredSkills, config, cwd);
        debug(`Updated ${target.destination}`);
      }
    }

    syncSpin.succeed(`Synced to ${config.targets.length} target(s)`);
  } catch (err) {
    syncSpin.fail('Failed to sync');
    throw err;
  }

  // Update cache for both prompt and native mode targets
  if (config.targets.length > 0) {
    const newCache = updateCache(filteredSkills, config.targets[0].destination, config);
    await saveCache(newCache, cwd);
    debug('Updated cache');
  } else {
    debug('No targets configured, skipping cache update');
  }

  success(`Successfully synced ${filteredSkills.length} skill(s)`);
}
