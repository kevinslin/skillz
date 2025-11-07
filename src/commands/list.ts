import { loadConfig } from '../core/config.js';
import { scanAllSkillDirectories } from '../core/skill-scanner.js';
import { loadCache } from '../core/cache-manager.js';
import { info, error, createTable } from '../utils/logger.js';
import type { Skill } from '../types/index.js';

interface ListOptions {
  format?: 'table' | 'json' | 'markdown';
  syncedOnly?: boolean;
  unsyncedOnly?: boolean;
}

export async function listCommand(options: ListOptions): Promise<void> {
  const cwd = process.cwd();
  const format = options.format || 'table';

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
  switch (format) {
    case 'json':
      outputJson(filteredSkills);
      break;
    case 'markdown':
      outputMarkdown(filteredSkills);
      break;
    case 'table':
    default:
      outputTable(filteredSkills);
      break;
  }
}

function outputTable(skills: Skill[]): void {
  const table = createTable(['Name', 'Description', 'Path']);

  for (const skill of skills) {
    table.push([skill.name, skill.description, skill.path]);
  }

  console.log(table.toString());
  info(`Total: ${skills.length} skill(s)`);
}

function outputMarkdown(skills: Skill[]): void {
  console.log('| Name | Description | Path |');
  console.log('|------|-------------|------|');

  for (const skill of skills) {
    const name = skill.name.replace(/\|/g, '\\|');
    const description = skill.description.replace(/\|/g, '\\|');
    const path = skill.path.replace(/\|/g, '\\|');
    console.log(`| ${name} | ${description} | ${path} |`);
  }

  info(`Total: ${skills.length} skill(s)`);
}

function outputJson(skills: Skill[]): void {
  const output = skills.map((skill) => ({
    name: skill.name,
    description: skill.description,
    path: skill.path,
  }));

  console.log(JSON.stringify(output, null, 2));
}
