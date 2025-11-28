import { loadConfig } from '../core/config.js';
import { scanAllSkillDirectories } from '../core/skill-scanner.js';
import { loadCache } from '../core/cache-manager.js';
import { info, error } from '../utils/logger.js';
import { ensureSkillzProjectCwd } from '../utils/workspace.js';
import type { Skill } from '../types/index.js';

interface ListOptions {
  format?: 'json' | 'markdown';
  style?: 'long';
  syncedOnly?: boolean;
  unsyncedOnly?: boolean;
}

export async function listCommand(options: ListOptions): Promise<void> {
  const { cwd } = await ensureSkillzProjectCwd();
  const format = options.format || 'markdown';

  // Load configuration
  const config = await loadConfig(cwd);
  if (!config) {
    error('No configuration file found. Run `skillz init` first.');
    process.exit(1);
  }

  // Scan skills
  const skills = await scanAllSkillDirectories(config);

  if (skills.length === 0) {
    info('No skills found.');
    return;
  }

  // Filter by sync status if requested
  let filteredSkills = skills;
  if (options.syncedOnly || options.unsyncedOnly) {
    const cache = await loadCache(cwd);
    const syncedNames = new Set(cache ? Object.keys(cache.skills) : []);

    if (options.syncedOnly) {
      filteredSkills = skills.filter((skill) => syncedNames.has(skill.name));
    } else if (options.unsyncedOnly) {
      filteredSkills = skills.filter((skill) => !syncedNames.has(skill.name));
    }
  }

  if (filteredSkills.length === 0) {
    info('No skills found matching the filter criteria.');
    return;
  }

  // Output in requested format
  const isLong = options.style === 'long';
  switch (format) {
    case 'json':
      outputJson(filteredSkills, isLong);
      break;
    case 'markdown':
    default:
      outputMarkdown(filteredSkills, isLong);
      break;
  }
}

function outputMarkdown(skills: Skill[], isLong: boolean): void {
  for (const skill of skills) {
    const normalizedDescription = skill.description.replace(/\s+/g, ' ').trim();
    const descriptionSnippet = normalizedDescription.slice(0, 100);
    const truncatedDescription =
      normalizedDescription.length > 100 ? `${descriptionSnippet}…` : descriptionSnippet;
    const outputDescription = truncatedDescription || 'No description provided';

    if (isLong) {
      console.log(`- ${skill.name} (${skill.path}): ${outputDescription}`);
    } else {
      console.log(`- ${skill.name}: ${outputDescription}`);
    }
  }
  info(`Total: ${skills.length} skill(s)`);
}

function outputJson(skills: Skill[], isLong: boolean): void {
  const output = skills.map((skill) => {
    const base = {
      name: skill.name,
      description: skill.description,
    };
    if (isLong) {
      return { ...base, path: skill.path };
    }
    return base;
  });

  console.log(JSON.stringify(output, null, 2));
}
