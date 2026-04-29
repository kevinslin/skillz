import { loadConfig } from '../core/config.js';
import { scanAllSkillDirectories } from '../core/skill-scanner.js';
import { loadCache, saveCache, updateCache } from '../core/cache-manager.js';
import { detectChanges, hasChanges, summarizeChanges } from '../core/change-detector.js';
import { validateSkillTargets, copySkillsToTarget } from '../core/skill-target-manager.js';
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
import type { Config } from '../types/index.js';

interface SyncOptions {
  dryRun?: boolean;
  force?: boolean;
  verbose?: boolean;
  only?: string[];
}

interface SyncContext {
  cwd?: string;
  config?: Config;
}

export async function syncCommand(options: SyncOptions, context: SyncContext = {}): Promise<void> {
  if (options.verbose) {
    setVerbose(true);
  }

  const cwd = context.cwd ?? (await ensureSkillzProjectCwd()).cwd;

  // Load configuration
  const config = context.config ? { ...context.config } : await loadConfig(cwd);
  if (!config) {
    error('No configuration file found. Run `skillz init` first.');
    process.exit(1);
  }

  // Scan skills
  const spin = spinner('Scanning skill directories...\n').start();
  const skills = await scanAllSkillDirectories(config);
  spin.succeed(`Found ${skills.length} skill(s)`);

  // Load cache
  debug(`loading cache from ${cwd}`);
  const cache = await loadCache(cwd);

  if (skills.length === 0) {
    warning('No skills found. Make sure your skill directories contain SKILL.md files.');
    if (!cache) {
      return;
    }
    info('Continuing sync with empty skill set to clear stale target output');
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

    if (config.targets.length > 0) {
      info(`Would copy ${filteredSkills.length} skill(s) to ${config.targets.length} target(s):`);
      for (const target of config.targets) {
        info(`  → ${target.destination}/`);
        for (const skill of filteredSkills) {
          info(`    - ${skill.name}`);
        }
      }
    }

    return;
  }

  if (config.targets.length > 0) {
    const validationSpin = spinner('Validating targets...\n').start();

    try {
      // Get cached skill relativePaths to skip validation for managed copies
      const cachedSkillPaths = cache ? new Set(Object.keys(cache.skills)) : new Set<string>();
      await validateSkillTargets(config.targets, filteredSkills, cwd, cachedSkillPaths);
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
      info(`Copying ${filteredSkills.length} skills to ${target.destination}`);
      await copySkillsToTarget(target, filteredSkills, cwd, skills);
      debug(`Copied ${filteredSkills.length} skills to ${target.destination}`);
    }

    syncSpin.succeed(`Synced to ${config.targets.length} target(s)`);
  } catch (err) {
    syncSpin.fail('Failed to sync');
    throw err;
  }

  // Update cache after successful target sync
  if (config.targets.length > 0) {
    const newCache = updateCache(filteredSkills, config.targets[0].destination, config);
    await saveCache(newCache, cwd);
    debug('Updated cache');
  } else {
    debug('No targets configured, skipping cache update');
  }

  success(`Successfully synced ${filteredSkills.length} skill(s)`);
}
