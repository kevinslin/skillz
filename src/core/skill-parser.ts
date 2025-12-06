import matter from 'gray-matter';
import path from 'path';
import type { Skill, ValidationResult } from '../types/index.js';
import { safeReadFile, getFileStats } from '../utils/fs-helpers.js';
import { validateSkillFrontmatter } from '../utils/validation.js';
import { calculateSkillHash } from '../utils/hash.js';

/**
 * Parse a skill from its SKILL.md file
 */
export async function parseSkill(skillPath: string): Promise<Skill> {
  const resolvedSkillPath = path.resolve(skillPath);
  const skillFile = path.join(resolvedSkillPath, 'SKILL.md');
  const content = await safeReadFile(skillFile);

  if (!content) {
    throw new Error(`SKILL.md not found at ${skillFile}`);
  }

  // Parse frontmatter
  const { data: frontmatter, content: body } = matter(content);

  // Validate frontmatter
  const validation = validateSkillFrontmatter(frontmatter);
  if (!validation.success) {
    throw new Error(
      `Invalid skill frontmatter in ${skillFile}: ${JSON.stringify(validation.error.errors)}`
    );
  }

  // Get file stats
  const stats = await getFileStats(skillFile);
  const lastModified = stats ? stats.mtime : new Date();

  // Create skill object
  const skill: Skill = {
    name: frontmatter.name as string,
    description: frontmatter.description as string,
    path: resolvedSkillPath,
    content: body.trim(),
    frontmatter: frontmatter as Record<string, unknown>,
    lastModified,
    hash: '', // Will be calculated below
  };

  // Calculate hash
  skill.hash = calculateSkillHash(skill);

  return skill;
}

/**
 * Validate a skill
 * Note: Name and description are already validated by Zod schema in parseSkill
 * This function only checks for additional warnings
 */
export function validateSkill(skill: Skill): ValidationResult {
  const errors: Array<{ field: string; message: string; value?: unknown }> = [];
  const warnings: Array<{ field: string; message: string; value?: unknown }> = [];

  // Warnings
  if (skill.content.length === 0) {
    warnings.push({
      field: 'content',
      message: 'Skill has no content',
    });
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}
