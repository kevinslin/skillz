import path from 'path';
import inquirer from 'inquirer';
import { loadConfig } from '../core/config.js';
import type { Config } from '../types/index.js';
import { info, success, error as logError } from '../utils/logger.js';
import { fileExists, ensureDir, safeWriteFile, resolveHome } from '../utils/fs-helpers.js';
import { SkillFrontmatterSchema } from '../utils/validation.js';
import {
  generateInteractiveSkillContent,
  type InteractiveAnswers,
} from '../core/skill-template-generator.js';

interface CreateOptions {
  path?: string;
  skillVersion?: string;
  interactive?: boolean;
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
 * Helper to prompt for multiple list items
 */
async function promptForListItems(itemType: string): Promise<string[]> {
  const items: string[] = [];
  let addMore = true;

  while (addMore) {
    const { item } = await inquirer.prompt([
      {
        type: 'input',
        name: 'item',
        message: `  ${itemType} ${items.length + 1}:`,
        validate: (input: string) => {
          if (!input || input.trim().length === 0) {
            return `${itemType} cannot be empty`;
          }
          return true;
        },
      },
    ]);

    items.push(item);

    const { more } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'more',
        message: `  Add another ${itemType}?`,
        default: false,
      },
    ]);

    addMore = more;
  }

  return items;
}

/**
 * Shared logic to write skill to directory
 */
async function writeSkillToDirectory(
  name: string,
  content: string,
  config: Config,
  options: CreateOptions,
  cwd: string
): Promise<void> {
  // Determine target directory
  let targetDir: string;
  if (options.path) {
    const resolvedPath = resolveHome(options.path);
    targetDir = path.isAbsolute(resolvedPath) ? resolvedPath : path.join(cwd, resolvedPath);
  } else {
    if (!config.skillDirectories || config.skillDirectories.length === 0) {
      logError('No skill directories configured in skillz.json');
      logError('Add at least one directory to skillDirectories array or use --path option');
      process.exit(1);
    }
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

  // Write SKILL.md
  await safeWriteFile(skillFilePath, content);

  success(`Created skill '${normalizedName}'`);
  success(`  Location: ${skillPath}`);
  success(`  File: ${skillFilePath}`);
  info('');
  info('Next steps:');
  info('  1. Review and edit the SKILL.md file as needed');
  info('  2. Run `skillz sync` to sync the skill to your targets');
}

/**
 * Run interactive skill creation with guided prompts
 */
async function runInteractiveCreate(options: CreateOptions): Promise<void> {
  const cwd = process.cwd();

  // Load config first
  const configPath = path.join(cwd, 'skillz.json');
  if (!(await fileExists(configPath))) {
    logError('No skillz.json found in current directory');
    logError('Run `skillz init` first to initialize the project');
    process.exit(1);
  }

  const config = await loadConfig(cwd);
  if (!config) {
    logError('Failed to load skillz.json');
    process.exit(1);
  }

  info('Creating a new skill interactively...\n');

  // Main prompts
  const answers = (await inquirer.prompt([
    {
      type: 'input',
      name: 'name',
      message: 'Skill name:',
      validate: (input: string) => {
        if (!input || input.trim().length === 0) {
          return 'Skill name is required';
        }
        const normalized = normalizeSkillName(input);
        if (normalized.length === 0) {
          return 'Skill name must contain at least one alphanumeric character';
        }
        return true;
      },
    },
    {
      type: 'input',
      name: 'description',
      message: 'Brief description (max 100 chars):',
      validate: (input: string) => {
        if (!input || input.trim().length === 0) {
          return 'Description is required';
        }
        if (input.length > 100) {
          return 'Description must be 100 characters or less';
        }
        return true;
      },
    },
    {
      type: 'editor',
      name: 'purpose',
      message: 'Detailed purpose (optional, opens editor - press Enter to skip):',
      default: '',
      waitUserInput: false,
    },
    {
      type: 'input',
      name: 'tags',
      message: 'Tags (comma-separated, optional):',
      filter: (input: string) => {
        if (!input || input.trim().length === 0) return undefined;
        return input
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean);
      },
    },
    {
      type: 'checkbox',
      name: 'sections',
      message: 'Include sections:',
      choices: [
        { name: 'Capabilities', value: 'capabilities', checked: true },
        { name: 'Guidelines', value: 'guidelines', checked: true },
        { name: 'Examples (placeholder)', value: 'examples', checked: true },
        { name: 'Anti-patterns (placeholder)', value: 'antipatterns', checked: false },
      ],
      validate: (choices: string[]) => {
        if (choices.length === 0) {
          return 'Select at least one section';
        }
        return true;
      },
    },
  ])) as InteractiveAnswers;

  // Follow-up prompts for selected sections
  if (answers.sections.includes('capabilities')) {
    info('\nAdd capabilities (what this skill can help with):');
    answers.capabilities = await promptForListItems('capability');
  }

  if (answers.sections.includes('guidelines')) {
    info('\nAdd guidelines (rules/best practices to follow):');
    answers.guidelines = await promptForListItems('guideline');
  }

  // Show preview
  info('\n--- Skill Preview ---');
  info(`Name: ${answers.name}`);
  info(`Description: ${answers.description}`);
  if (answers.purpose) info(`Purpose: ${answers.purpose.substring(0, 50)}...`);
  if (answers.tags) info(`Tags: ${answers.tags.join(', ')}`);
  info(`Sections: ${answers.sections.join(', ')}`);
  if (answers.capabilities) info(`Capabilities: ${answers.capabilities.length} items`);
  if (answers.guidelines) info(`Guidelines: ${answers.guidelines.length} items`);
  info('');

  // Confirm
  const { confirmed } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'confirmed',
      message: 'Create skill with this configuration?',
      default: true,
    },
  ]);

  if (!confirmed) {
    info('Skill creation cancelled');
    return;
  }

  // Generate content
  const content = generateInteractiveSkillContent(answers, options.skillVersion || '0.0.0');

  // Write skill file
  await writeSkillToDirectory(answers.name, content, config, options, cwd);
}

/**
 * Create command - generates a new skill directory with SKILL.md
 */
export async function createCommand(
  name: string | undefined,
  description: string | undefined,
  options: CreateOptions
): Promise<void> {
  // Interactive mode
  if (options.interactive || (!name && !description)) {
    await runInteractiveCreate(options);
    return;
  }

  // Validate required args for non-interactive mode
  if (!name || !description) {
    logError('Name and description are required in non-interactive mode');
    logError('Use --interactive flag for guided skill creation');
    process.exit(1);
  }

  // Original non-interactive implementation
  const cwd = process.cwd();

  // Validate inputs
  validateFrontmatter(name, description);

  // Validate version if provided, otherwise use default
  if (options.skillVersion) {
    validateVersion(options.skillVersion);
  }
  const version = options.skillVersion || '0.0.0';

  // Load configuration
  const configPath = path.join(cwd, 'skillz.json');
  if (!(await fileExists(configPath))) {
    logError('No skillz.json found in current directory');
    logError('Run `skillz init` first to initialize the project');
    process.exit(1);
  }

  const config = await loadConfig(cwd);

  if (!config) {
    logError('Failed to load skillz.json');
    process.exit(1);
  }

  // Generate and write skill
  const content = generateSkillContent(name, description, version);
  await writeSkillToDirectory(name, content, config, options, cwd);
}
