import { loadConfig } from '../core/config.js';
import { scanAllSkillDirectories } from '../core/skill-scanner.js';
import { loadCache, saveCache, updateCache } from '../core/cache-manager.js';
import { detectChanges, hasChanges, summarizeChanges } from '../core/change-detector.js';
import { writeTargetFile } from '../core/target-manager.js';
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

interface SyncOptions {
  dryRun?: boolean;
  force?: boolean;
  verbose?: boolean;
  only?: string[];
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

  // Scan skills
  const spin = spinner('Scanning skill directories...').start();
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
  const cache = await loadCache(cwd);

  // Detect changes if not forcing and cache exists
  if (!options.force && cache) {
    const changes = detectChanges(filteredSkills, cache);

    if (!hasChanges(changes)) {
      success('All skills are up to date');
      return;
    }

    const summary = summarizeChanges(changes);

    info('Changes detected:');
    if (summary.new > 0) info(`  ${summary.new} new skill(s)`);
    if (summary.modified > 0) info(`  ${summary.modified} modified skill(s)`);
    if (summary.removed > 0) info(`  ${summary.removed} removed skill(s)`);

    if (options.verbose) {
      for (const change of changes) {
        if (change.type !== 'unchanged') {
          debug(
            `  ${formatChangeType(change.type)} ${formatSkillName(change.skill?.name || 'unknown')}`
          );
        }
      }
    }
  } else if (!cache) {
    info('No cache found, syncing all skills');
  } else {
    info('Force mode: syncing all skills');
  }

  // Dry run mode
  if (options.dryRun) {
    info('Dry run mode: no files will be modified');
    info(`Would sync ${filteredSkills.length} skill(s) to ${config.targets.length} target(s)`);
    return;
  }

  // Sync to all targets
  const syncSpin = spinner('Syncing skills to targets...').start();

  try {
    for (const target of config.targets) {
      await writeTargetFile(target, filteredSkills, config, cwd);
      debug(`Updated ${target}`);
    }

    syncSpin.succeed(`Synced to ${config.targets.length} target file(s)`);
  } catch (err) {
    syncSpin.fail('Failed to sync');
    throw err;
  }

  // Update cache only if we have targets
  if (config.targets.length > 0) {
    const newCache = updateCache(filteredSkills, config.targets[0]);
    await saveCache(newCache, cwd);
    debug('Updated cache');
  } else {
    debug('No targets configured, skipping cache update');
  }

  success(`Successfully synced ${filteredSkills.length} skill(s)`);
}
