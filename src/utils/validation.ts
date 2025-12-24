import { z } from 'zod';

/**
 * Schema for Target
 */
export const TargetSchema = z.object({
  name: z.string().min(1, 'Target name is required'),
  template: z.string().optional(),
  preset: z.enum(['agentsmd', 'aider', 'cursor', 'claude']).optional(),
  pathStyle: z.enum(['relative', 'absolute']).optional(),
});

/**
 * Schema for Config
 */
export const ConfigSchema = z.object({
  version: z.string(),
  preset: z.enum(['agentsmd', 'aider', 'cursor', 'claude']).optional(),
  targets: z.array(TargetSchema), // Allow empty array for skill management only
  skillDirectories: z.array(z.string()),
  additionalSkills: z.array(z.string()),
  ignore: z.array(z.string()),
  skillsSectionName: z.string().default('## Additional Instructions'),
  defaultEditor: z.string().optional(),
  autoSyncAfterEdit: z.boolean().optional(),
  template: z.string().optional(),
  pathStyle: z.enum(['relative', 'absolute']).optional().default('relative'),
});

/**
 * Schema for skill frontmatter
 */
export const SkillFrontmatterSchema = z.object({
  name: z
    .string()
    .min(1, 'Skill name is required')
    .max(64, 'Skill name must be 64 characters or less')
    .regex(
      /^[A-Za-z0-9-_\s]+$/,
      'Skill name must contain only letters, numbers, hyphens, underscores, and spaces'
    ),
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
  configHash: z.string(),
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
