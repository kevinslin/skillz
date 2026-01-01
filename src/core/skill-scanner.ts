import path from 'path';
import { minimatch } from 'minimatch';
import type { Skill, Config } from '../types/index.js';
import { readDirectories, isSkillDirectory, fileExists, resolveHome } from '../utils/fs-helpers.js';
import { parseSkill, validateSkill } from './skill-parser.js';
import { debug, warning } from '../utils/logger.js';

/**
 * Recursively scan a directory for skills
 */
async function scanDirectoryRecursive(
  directory: string,
  ignore: string[] = [],
  depth: number = 0,
  maxDepth: number = 10
): Promise<string[]> {
  if (depth > maxDepth) {
    debug(`Max depth ${maxDepth} reached at ${directory}`);
    return [];
  }

  const subdirs = await readDirectories(directory);
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
      // Don't recurse into skill directories
      continue;
    }

    // Not a skill directory, recurse into it
    const nestedSkills = await scanDirectoryRecursive(subdir, ignore, depth + 1, maxDepth);
    skillDirs.push(...nestedSkills);
  }

  return skillDirs;
}

/**
 * Scan a directory for skills
 */
export async function scanDirectory(directory: string, ignore: string[] = []): Promise<string[]> {
  const resolvedDir = path.resolve(resolveHome(directory));

  if (!(await fileExists(resolvedDir))) {
    debug(`Directory not found: ${resolvedDir}`);
    return [];
  }

  return await scanDirectoryRecursive(resolvedDir, ignore);
}

/**
 * Scan all skill directories from config
 */
export async function scanAllSkillDirectories(config: Config): Promise<Skill[]> {
  const allDirs = [...config.skillDirectories, ...config.additionalSkills];
  const skills: Skill[] = [];
  const seenPaths = new Set<string>();
  const seenNames = new Set<string>();
  debug(`scanning all skill directories from ${allDirs}`);

  for (const dir of allDirs) {
    const skillDirs = await scanDirectory(dir, config.ignore);
    const resolvedSkillDir = path.resolve(resolveHome(dir));

    for (const skillDir of skillDirs) {
      try {
        const skill = await parseSkill(skillDir);

        // Compute relative path within skillDirectory
        skill.relativePath = path.relative(resolvedSkillDir, skill.path);
        skill.sourceDirectory = dir;

        // Validate skill
        const validation = validateSkill(skill);
        if (!validation.valid) {
          warning(`Invalid skill at ${skillDir}:`);
          validation.errors.forEach((err) => {
            warning(`  - ${err.field}: ${err.message}`);
          });
          continue;
        }

        // Check for duplicate relativePaths (exact same skill)
        if (seenPaths.has(skill.relativePath)) {
          warning(`Duplicate skill at ${skill.relativePath}`);
          continue;
        }

        // Check for duplicate names (would conflict when flattened)
        if (seenNames.has(skill.name)) {
          warning(`Duplicate skill name: ${skill.name} at ${skill.relativePath}`);
          continue;
        }

        seenPaths.add(skill.relativePath);
        seenNames.add(skill.name);
        skills.push(skill);
        debug(`Found skill: ${skill.name} at ${skill.relativePath}`);
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
