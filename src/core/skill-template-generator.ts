import Handlebars from 'handlebars';
import path from 'path';
import { fileURLToPath } from 'url';
import { readFileSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * User's responses from interactive skill creation prompts
 */
export interface InteractiveAnswers {
  /** Skill name (will be normalized for directory name) */
  name: string;
  /** Brief description (max 100 chars) */
  description: string;
  /** Detailed purpose/context (optional) */
  purpose?: string;
  /** Tags for categorization (optional) */
  tags?: string[];
  /** Selected sections to include */
  sections: string[];
  /** List of capabilities (optional) */
  capabilities?: string[];
  /** List of guidelines (optional) */
  guidelines?: string[];
}

// Register Handlebars helpers
Handlebars.registerHelper('titleCase', (str: string) => {
  return str
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
});

Handlebars.registerHelper('add', (a: number, b: number) => a + b);

/**
 * Generates SKILL.md content from interactive prompt answers.
 *
 * Uses Handlebars template to create structured markdown with:
 * - Frontmatter (name, description, version, optional tags)
 * - Title (auto-capitalized from name)
 * - Purpose section (if provided)
 * - Capabilities section (if provided)
 * - Guidelines section (if provided)
 * - Examples placeholder (if requested)
 * - Anti-patterns placeholder (if requested)
 *
 * @param answers - User's responses from interactive prompts
 * @param version - Semantic version string (default: '0.0.0')
 * @returns Formatted SKILL.md content as string
 */
export function generateInteractiveSkillContent(
  answers: InteractiveAnswers,
  version: string = '0.0.0'
): string {
  const templatePath = path.join(__dirname, '../templates/skill-interactive.hbs');
  const templateSource = readFileSync(templatePath, 'utf-8');
  const template = Handlebars.compile(templateSource);

  const data = {
    name: answers.name,
    description: answers.description,
    version,
    tags: answers.tags && answers.tags.length > 0 ? answers.tags : undefined,
    purpose: answers.purpose?.trim() || undefined,
    capabilities:
      answers.capabilities && answers.capabilities.length > 0 ? answers.capabilities : undefined,
    guidelines:
      answers.guidelines && answers.guidelines.length > 0 ? answers.guidelines : undefined,
    includeExamples: answers.sections.includes('examples'),
    includeAntiPatterns: answers.sections.includes('antipatterns'),
  };

  return template(data);
}
