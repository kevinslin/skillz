import path from 'path';
import { minimatch } from 'minimatch';
import type { Skill, Config } from '../types/index.js';
import { readDirectories, isSkillDirectory, fileExists, resolveHome } from '../utils/fs-helpers.js';
import { parseSkill, validateSkill } from './skill-parser.js';
import { debug, warning } from '../utils/logger.js';

/**
 * Scan a directory for skills
 */
export async function scanDirectory(directory: string, ignore: string[] = []): Promise<string[]> {
  const resolvedDir = path.resolve(resolveHome(directory));

  if (!(await fileExists(resolvedDir))) {
    debug(`Directory not found: ${resolvedDir}`);
    return [];
  }

  const subdirs = await readDirectories(resolvedDir);
  const skillDirs: string[] = [];

  for (const subdir of subdirs) {
    const dirName = path.basename(subdir);

    // Check if directory name matches any ignore pattern
    const shouldIgnore = ignore.some((pattern) => {
      try {
        return minimatch(dirName, pattern, { dot: true });
      } catch (error) {
        warning(`Invalid ignore pattern "${pattern}": ${(error as Error).message}`);
        return false;
      }
    });

    if (shouldIgnore) {
      debug(`Ignoring directory: ${dirName}`);
      continue;
    }

    // Check if it's a skill directory
    if (await isSkillDirectory(subdir)) {
      skillDirs.push(subdir);
    }
  }

  return skillDirs;
}

/**
 * Scan all skill directories from config
 */
export async function scanAllSkillDirectories(config: Config): Promise<Skill[]> {
  const allDirs = [...config.skillDirectories, ...config.additionalSkills];
  const skills: Skill[] = [];
  const seenNames = new Set<string>();
  debug(`scanning all skill directories from ${allDirs}`);

  for (const dir of allDirs) {
    const skillDirs = await scanDirectory(dir, config.ignore);

    for (const skillDir of skillDirs) {
      try {
        const skill = await parseSkill(skillDir);

        // Validate skill
        const validation = validateSkill(skill);
        if (!validation.valid) {
          warning(`Invalid skill at ${skillDir}:`);
          validation.errors.forEach((err) => {
            warning(`  - ${err.field}: ${err.message}`);
          });
          continue;
        }

        // Check for duplicates
        if (seenNames.has(skill.name)) {
          warning(`Duplicate skill name: ${skill.name} at ${skillDir}`);
          continue;
        }

        seenNames.add(skill.name);
        skills.push(skill);
        debug(`Found skill: ${skill.name} at ${skillDir}`);
      } catch (error) {
        warning(`Failed to parse skill at ${skillDir}: ${(error as Error).message}`);
      }
    }
  }

  return skills;
}

/**
 * Find a skill by name
 */
export function findSkillByName(skills: Skill[], name: string): Skill | null {
  return skills.find((skill) => skill.name === name) || null;
}
