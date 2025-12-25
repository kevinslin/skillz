import type { Skill, Config, ManagedSection, TargetContent, Target } from '../types/index.js';
import {
  safeReadFile,
  safeWriteFile,
  pathExists,
  symlinkDirectory,
  ensureDir,
} from '../utils/fs-helpers.js';
import { debug } from '../utils/logger.js';
import { renderSkills } from './template-engine.js';
import path from 'path';

/**
 * Find all occurrences of a section name in content
 */
function findSectionOccurrences(content: string, sectionName: string): number[] {
  const lines = content.split('\n');
  const occurrences: number[] = [];

  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim() === sectionName.trim()) {
      occurrences.push(i);
    }
  }

  return occurrences;
}

/**
 * Validate that section name appears at most once
 */
export function validateNoDuplicateSections(content: string, sectionName: string): void {
  const occurrences = findSectionOccurrences(content, sectionName);

  if (occurrences.length > 1) {
    throw new Error(
      `Section "${sectionName}" appears ${occurrences.length} times in the target file (lines: ${occurrences.map((n) => n + 1).join(', ')}). ` +
        `Please manually remove duplicate sections or choose a different skillsSectionName in skillz.json.`
    );
  }
}

/**
 * Extract managed section from content based on section name
 * Returns everything from the section heading to EOF
 */
export function extractManagedSection(content: string, sectionName: string): ManagedSection | null {
  const lines = content.split('\n');
  let startLine = -1;

  // Find the section heading
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim() === sectionName.trim()) {
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
export function replaceManagedSection(
  content: string,
  newSection: string,
  sectionName: string
): string {
  const managedSection = extractManagedSection(content, sectionName);
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
export async function readTargetFile(
  filePath: string,
  sectionName: string
): Promise<TargetContent> {
  const fullContent = await safeReadFile(filePath);
  const managedSection = fullContent ? extractManagedSection(fullContent, sectionName) : null;

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
  const targetContent = await readTargetFile(target.name, config.skillsSectionName);
  debug(`reading target file from ${target.name}`);
  // Validate no duplicate sections before writing
  validateNoDuplicateSections(targetContent.fullContent, config.skillsSectionName);

  const newSection = await createManagedSection(skills, target, config, cwd);
  const updatedContent = replaceManagedSection(
    targetContent.fullContent,
    newSection,
    config.skillsSectionName
  );

  await safeWriteFile(target.name, updatedContent);
}

/**
 * Format error message for symlink conflicts
 */
function formatConflictsError(
  conflicts: Array<{ target: string; skill: string; path: string }>
): string {
  const lines = [
    'Cannot sync: destination conflicts detected',
    '',
    'The following skill symlinks cannot be created because paths already exist:',
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
 * Validate symlink targets for conflicts before creating any symlinks
 */
export async function validateSymlinkTargets(
  targets: Target[],
  skills: Skill[],
  cwd: string
): Promise<void> {
  const conflicts: Array<{ target: string; skill: string; path: string }> = [];

  for (const target of targets) {
    const targetDir = path.resolve(cwd, target.name);

    for (const skill of skills) {
      const destPath = path.join(targetDir, skill.name);

      // Check if path exists (file, directory, or symlink)
      if (await pathExists(destPath)) {
        conflicts.push({
          target: target.name,
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
 * Create symlinks for skills to target directory
 */
export async function symlinkSkillsToTarget(
  target: Target,
  skills: Skill[],
  cwd: string
): Promise<void> {
  const targetDir = path.resolve(cwd, target.name);

  // Ensure target directory exists
  await ensureDir(targetDir);

  // Create symlink for each skill
  for (const skill of skills) {
    const sourcePath = path.resolve(cwd, skill.path);
    const destPath = path.join(targetDir, skill.name); // Flattened

    await symlinkDirectory(sourcePath, destPath);
  }
}
