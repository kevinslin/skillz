import path from 'path';
import { loadConfig } from '../core/config.js';
import { info, success, error as logError } from '../utils/logger.js';
import { fileExists, ensureDir, safeWriteFile, resolveHome } from '../utils/fs-helpers.js';
import { SkillFrontmatterSchema } from '../utils/validation.js';

interface CreateOptions {
  path?: string;
  skillVersion?: string;
}

/**
 * Normalizes a skill name for use as a directory name
 * - Converts to lowercase
 * - Replaces underscores and spaces with hyphens
 * - Collapses multiple hyphens into one
 * - Removes special characters
 */
function normalizeSkillName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[_\s]+/g, '-') // Replace underscores and spaces with hyphens
    .replace(/-+/g, '-') // Collapse multiple hyphens
    .replace(/[^a-z0-9-]/g, '') // Remove special characters
    .replace(/^-+|-+$/g, ''); // Trim leading/trailing hyphens
}

/**
 * Validates skill frontmatter using Zod schema
 */
function validateFrontmatter(name: string, description: string): void {
  const result = SkillFrontmatterSchema.safeParse({ name, description });

  if (!result.success) {
    const errorMessages = result.error.errors.map((err) => err.message).join('; ');
    throw new Error(`Invalid skill frontmatter: ${errorMessages}`);
  }

  // Additional check: ensure normalized name is not empty
  const normalized = normalizeSkillName(name);
  if (normalized.length === 0) {
    throw new Error('Skill name must contain at least one alphanumeric character');
  }
}

/**
 * Validates a semantic version string
 */
function validateVersion(version: string): void {
  // Basic semver validation (allows x.y.z format)
  const semverRegex = /^\d+\.\d+\.\d+$/;
  if (!semverRegex.test(version)) {
    throw new Error('Version must be in semver format (e.g., 0.0.0, 1.2.3)');
  }
}

/**
 * Generates SKILL.md frontmatter and content
 */
function generateSkillContent(name: string, description: string, version: string): string {
  // Keep original name format in frontmatter (before normalization)
  return `---
name: ${name}
description: ${description}
version: ${version}
---

`;
}

/**
 * Create command - generates a new skill directory with SKILL.md
 */
export async function createCommand(
  name: string,
  description: string,
  options: CreateOptions
): Promise<void> {
  const cwd = process.cwd();

  // Validate inputs
  validateFrontmatter(name, description);

  // Validate version if provided, otherwise use default
  if (options.skillVersion) {
    validateVersion(options.skillVersion);
  }
  const version = options.skillVersion || '0.0.0';

  // Load configuration
  const configPath = path.join(cwd, '.skills.json');
  if (!(await fileExists(configPath))) {
    logError('No .skills.json found in current directory');
    logError('Run `skillz init` first to initialize the project');
    process.exit(1);
  }

  const config = await loadConfig(cwd);

  if (!config) {
    logError('Failed to load .skills.json');
    process.exit(1);
  }

  // Determine target directory
  let targetDir: string;
  if (options.path) {
    // Use custom path if provided (resolve ~ and make absolute)
    const resolvedPath = resolveHome(options.path);
    targetDir = path.isAbsolute(resolvedPath) ? resolvedPath : path.join(cwd, resolvedPath);
  } else {
    // Use first skill directory from config
    if (!config.skillDirectories || config.skillDirectories.length === 0) {
      logError('No skill directories configured in .skills.json');
      logError('Add at least one directory to skillDirectories array or use --path option');
      process.exit(1);
    }
    // Resolve ~ in config path
    const configPath = resolveHome(config.skillDirectories[0]);
    targetDir = path.isAbsolute(configPath) ? configPath : path.join(cwd, configPath);
  }

  // Normalize skill name for directory
  const normalizedName = normalizeSkillName(name);
  const skillPath = path.join(targetDir, normalizedName);
  const skillFilePath = path.join(skillPath, 'SKILL.md');

  // Check if skill already exists
  if (await fileExists(skillPath)) {
    logError(`Skill '${normalizedName}' already exists at ${skillPath}`);
    logError('Use a different name or remove the existing skill directory');
    process.exit(1);
  }

  info(`Creating skill '${normalizedName}' at ${skillPath}`);

  // Create skill directory
  await ensureDir(skillPath);

  // Generate and write SKILL.md
  const skillContent = generateSkillContent(name, description, version);
  await safeWriteFile(skillFilePath, skillContent);

  success(`Created skill '${normalizedName}'`);
  success(`  Location: ${skillPath}`);
  success(`  File: ${skillFilePath}`);
  info('');
  info('Next steps:');
  info('  1. Edit the SKILL.md file to add instructions');
  info('  2. Run `skillz sync` to sync the skill to your targets');
}
