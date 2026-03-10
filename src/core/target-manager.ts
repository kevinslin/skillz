import fs from 'fs/promises';
import path from 'path';
import type { Skill, Target } from '../types/index.js';
import {
  pathExists,
  copyDirectory,
  ensureDir,
  readDirectories,
  isSkillDirectory,
  resolveHome,
} from '../utils/fs-helpers.js';
import { info } from '../utils/logger.js';

/**
 * Resolve a directory path relative to cwd, expanding home when needed.
 */
function resolveDirectoryPath(directory: string, cwd: string): string {
  return path.resolve(cwd, resolveHome(directory));
}

/**
 * Remove skill directories in a target that are not part of the current skill set.
 */
async function removeStaleSkillsFromTarget(targetDir: string, skills: Skill[]): Promise<void> {
  const activeSkillNames = new Set(skills.map((s) => s.name));
  const entries = await readDirectories(targetDir);

  for (const entry of entries) {
    if (!(await isSkillDirectory(entry))) {
      continue;
    }

    const dirName = path.basename(entry);
    if (activeSkillNames.has(dirName)) {
      continue;
    }

    info(`removing stale skill from target: ${entry}`);
    await fs.rm(entry, { recursive: true, force: true });
  }
}

function formatConflictsError(
  conflicts: Array<{ target: string; skill: string; path: string }>
): string {
  const lines = [
    'Cannot sync: destination conflicts detected',
    '',
    'The following skill directories cannot be copied because paths already exist:',
    '',
  ];

  for (const c of conflicts) {
    lines.push(`  • ${c.skill} → ${c.path} (target: ${c.target})`);
  }

  lines.push('');
  lines.push('Please remove or rename conflicting files/directories and try again.');

  return lines.join('\n');
}

/**
 * Validate native targets for conflicts before copying any skills
 * Skips validation for skills that are already in cache (managed by us)
 */
export async function validateNativeTargets(
  targets: Target[],
  skills: Skill[],
  cwd: string,
  cachedSkills: Set<string> = new Set()
): Promise<void> {
  const conflicts: Array<{ target: string; skill: string; path: string }> = [];

  for (const target of targets) {
    const targetDir = resolveDirectoryPath(target.destination, cwd);

    if (await pathExists(targetDir)) {
      const targetStat = await fs.lstat(targetDir);
      if (!targetStat.isDirectory()) {
        throw new Error(
          `Target destination must be a directory: ${target.destination}\nUpdate skillz.json to use a directory target such as ".skills".`
        );
      }
    }

    for (const skill of skills) {
      const destPath = path.join(targetDir, skill.name);

      if (cachedSkills.has(skill.relativePath)) {
        continue;
      }

      if (await pathExists(destPath)) {
        if (await isSkillDirectory(destPath)) {
          continue;
        }

        conflicts.push({
          target: target.destination,
          skill: skill.name,
          path: destPath,
        });
      }
    }
  }

  if (conflicts.length > 0) {
    throw new Error(formatConflictsError(conflicts));
  }
}

/**
 * Copy skills to target directory (native mode)
 */
export async function copySkillsToTarget(
  target: Target,
  skills: Skill[],
  cwd: string,
  cleanupSkills: Skill[] = skills
): Promise<void> {
  const targetDir = resolveDirectoryPath(target.destination, cwd);

  await ensureDir(targetDir);

  if (target.deleteExistingFromTarget) {
    info(`Removing stale skills from target: ${targetDir}`);
    await removeStaleSkillsFromTarget(targetDir, cleanupSkills);
  }

  for (const skill of skills) {
    const sourcePath = path.resolve(cwd, skill.path);
    const destPath = path.join(targetDir, skill.name);

    if (path.resolve(sourcePath) === path.resolve(destPath)) {
      continue;
    }

    if (await pathExists(destPath)) {
      await fs.rm(destPath, { recursive: true, force: true });
    }

    await copyDirectory(sourcePath, destPath);
  }
}
