import fs from 'fs/promises';
import path from 'path';
import type { Skill, Config, ManagedSection, TargetContent, Target } from '../types/index.js';
import {
  safeReadFile,
  safeWriteFile,
  pathExists,
  copyDirectory,
  ensureDir,
  readDirectories,
  isSkillDirectory,
  resolveHome,
} from '../utils/fs-helpers.js';
import { debug, info } from '../utils/logger.js';
import { renderSkills } from './template-engine.js';

export const SKILLS_SECTION_NAME = '## Skills';

function validateManagedSectionHeading(content: string): void {
  const firstContentLine = content.split('\n').find((line) => line.trim().length > 0);

  if (firstContentLine?.trim() !== SKILLS_SECTION_NAME) {
    throw new Error(`Prompt templates must start with "${SKILLS_SECTION_NAME}".`);
  }
}

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

/**
 * Find all occurrences of the managed skills section in content
 */
function findSkillsSectionOccurrences(content: string): number[] {
  const lines = content.split('\n');
  const occurrences: number[] = [];

  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim() === SKILLS_SECTION_NAME) {
      occurrences.push(i);
    }
  }

  return occurrences;
}

/**
 * Validate that the managed skills section appears at most once
 */
export function validateNoDuplicateSkillsSections(content: string): void {
  const occurrences = findSkillsSectionOccurrences(content);

  if (occurrences.length > 1) {
    throw new Error(
      `Section "${SKILLS_SECTION_NAME}" appears ${occurrences.length} times in the target file (lines: ${occurrences.map((n) => n + 1).join(', ')}). ` +
        `Please manually remove duplicate sections.`
    );
  }
}

/**
 * Extract managed skills section from content
 * Returns everything from the section heading to EOF
 */
export function extractManagedSection(content: string): ManagedSection | null {
  const lines = content.split('\n');
  let startLine = -1;

  // Find the section heading
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim() === SKILLS_SECTION_NAME) {
      startLine = i;
      break;
    }
  }

  if (startLine === -1) {
    return null;
  }

  // Extract from section to end of file
  const sectionLines = lines.slice(startLine);
  const sectionContent = sectionLines.join('\n');

  return {
    startLine,
    endLine: lines.length,
    content: sectionContent,
    metadata: {
      lastSync: '',
      sources: [],
    },
  };
}

/**
 * Replace managed section in content
 * Replaces everything from the section heading to EOF, or appends if not found
 */
export function replaceManagedSection(content: string, newSection: string): string {
  const managedSection = extractManagedSection(content);
  if (!managedSection) {
    // No existing section, append to end
    const trimmedContent = content.trim();
    return trimmedContent + (trimmedContent ? '\n\n' : '') + newSection + '\n';
  }

  // Replace existing section (from section heading to EOF)
  const lines = content.split('\n');
  const before = lines.slice(0, managedSection.startLine).join('\n');
  const trimmedBefore = before.trim();

  return trimmedBefore + (trimmedBefore ? '\n\n' : '') + newSection + '\n';
}

/**
 * Create managed section content
 */
export async function createManagedSection(
  skills: Skill[],
  target: Target,
  config: Config,
  cwd: string
): Promise<string> {
  return await renderSkills(skills, target, config, cwd);
}

/**
 * Read target file
 */
export async function readTargetFile(filePath: string): Promise<TargetContent> {
  const fullContent = await safeReadFile(filePath);
  const managedSection = fullContent ? extractManagedSection(fullContent) : null;

  return {
    fullContent,
    managedSection,
    hasManualEdits: false, // TODO: Implement manual edit detection
  };
}

/**
 * Write target file
 */
export async function writeTargetFile(
  target: Target,
  skills: Skill[],
  config: Config,
  cwd: string
): Promise<void> {
  const targetContent = await readTargetFile(target.destination);
  debug(`reading target file from ${target.destination}`);
  // Validate no duplicate sections before writing
  validateNoDuplicateSkillsSections(targetContent.fullContent);

  const newSection = await createManagedSection(skills, target, config, cwd);
  validateManagedSectionHeading(newSection);
  const updatedContent = replaceManagedSection(targetContent.fullContent, newSection);

  await safeWriteFile(target.destination, updatedContent);
}

/**
 * Format error message for native mode conflicts
 */
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

    for (const skill of skills) {
      const destPath = path.join(targetDir, skill.name);

      // Skip if this skill is in cache (managed by us, safe to overwrite)
      if (cachedSkills.has(skill.relativePath)) {
        continue;
      }

      // Check if path exists (file, directory, or symlink)
      if (await pathExists(destPath)) {
        // Skill directories can always be overwritten (managed by us)
        if (await isSkillDirectory(destPath)) {
          continue;
        }

        // Non-skill paths are conflicts (don't overwrite user files/dirs)
        conflicts.push({
          target: target.destination,
          skill: skill.name,
          path: destPath,
        });
      }
    }
  }

  if (conflicts.length > 0) {
    const errorMsg = formatConflictsError(conflicts);
    throw new Error(errorMsg);
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

  // Ensure target directory exists
  await ensureDir(targetDir);

  if (target.deleteExistingFromTarget) {
    info(`Removing stale skills from target: ${targetDir}`);
    await removeStaleSkillsFromTarget(targetDir, cleanupSkills);
  }

  // Copy each skill directory
  for (const skill of skills) {
    const sourcePath = path.resolve(cwd, skill.path);
    const destPath = path.join(targetDir, skill.name);

    if (path.resolve(sourcePath) === path.resolve(destPath)) {
      continue;
    }

    // Remove existing directory if it exists (for updates)
    if (await pathExists(destPath)) {
      await fs.rm(destPath, { recursive: true, force: true });
    }

    await copyDirectory(sourcePath, destPath);
  }
}
