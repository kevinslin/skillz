import { z } from 'zod';

/**
 * Schema for Config
 */
export const ConfigSchema = z.object({
  version: z.string(),
  preset: z.enum(['agentsmd', 'aider']).optional(),
  targets: z.array(z.string()).min(1, 'At least one target is required'),
  skillDirectories: z.array(z.string()),
  additionalSkills: z.array(z.string()),
  ignore: z.array(z.string()),
  includeInstructions: z.boolean(),
  autoSync: z.boolean(),
  skillsSectionName: z.string().default('## Additional Instructions'),
});

/**
 * Schema for skill frontmatter
 */
export const SkillFrontmatterSchema = z.object({
  name: z
    .string()
    .min(1, 'Skill name is required')
    .max(64, 'Skill name must be 64 characters or less')
    .regex(/^[a-z0-9- ]+$/, 'Skill name must contain only lowercase letters, numbers, and hyphens'),
  description: z
    .string()
    .min(1, 'Skill description is required')
    .max(1024, 'Skill description must be 1024 characters or less'),
});

/**
 * Schema for cache file
 */
export const CacheFileSchema = z.object({
  version: z.string(),
  lastSync: z.string(),
  targetFile: z.string(),
  skills: z.record(
    z.object({
      hash: z.string(),
      path: z.string(),
      lastModified: z.string(),
    })
  ),
});

/**
 * Validate configuration
 */
export function validateConfig(config: unknown): z.SafeParseReturnType<unknown, unknown> {
  return ConfigSchema.safeParse(config);
}

/**
 * Validate skill frontmatter
 */
export function validateSkillFrontmatter(
  frontmatter: unknown
): z.SafeParseReturnType<unknown, unknown> {
  return SkillFrontmatterSchema.safeParse(frontmatter);
}

/**
 * Validate cache file
 */
export function validateCacheFile(cache: unknown): z.SafeParseReturnType<unknown, unknown> {
  return CacheFileSchema.safeParse(cache);
}

/**
 * Check if skill name is valid
 */
export function isValidSkillName(name: string): boolean {
  return /^[A-Za-z0-9-_\s]+$/.test(name) && name.length > 0 && name.length <= 64;
}

/**
 * Check if skill description is valid
 */
export function isValidSkillDescription(description: string): boolean {
  return description.length > 0 && description.length <= 1024;
}
