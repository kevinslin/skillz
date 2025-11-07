import matter from 'gray-matter';
import path from 'path';
import type { Skill, ValidationResult } from '../types/index.js';
import { safeReadFile, getFileStats } from '../utils/fs-helpers.js';
import {
  validateSkillFrontmatter,
  isValidSkillName,
  isValidSkillDescription,
} from '../utils/validation.js';
import { calculateSkillHash } from '../utils/hash.js';

/**
 * Parse a skill from its SKILL.md file
 */
export async function parseSkill(skillPath: string): Promise<Skill> {
  const skillFile = path.join(skillPath, 'SKILL.md');
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
    path: skillPath,
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
 */
export function validateSkill(skill: Skill): ValidationResult {
  const errors: Array<{ field: string; message: string; value?: unknown }> = [];
  const warnings: Array<{ field: string; message: string; value?: unknown }> = [];

  // Validate name
  if (!isValidSkillName(skill.name)) {
    errors.push({
      field: 'name',
      message:
        'Skill name must contain only lowercase letters, numbers, and hyphens, and be 64 characters or less',
      value: skill.name,
    });
  }

  // Validate description
  if (!isValidSkillDescription(skill.description)) {
    errors.push({
      field: 'description',
      message: 'Skill description must be between 1 and 1024 characters',
      value: skill.description,
    });
  }

  // Check for required fields
  if (!skill.name) {
    errors.push({
      field: 'name',
      message: 'Skill name is required',
    });
  }

  if (!skill.description) {
    errors.push({
      field: 'description',
      message: 'Skill description is required',
    });
  }

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
