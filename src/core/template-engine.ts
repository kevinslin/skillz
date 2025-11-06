import Handlebars from 'handlebars';
import path from 'path';
import { fileURLToPath } from 'url';
import type { Skill, Config, TemplateData } from '../types/index.js';
import { safeReadFile } from '../utils/fs-helpers.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const templateCache = new Map<string, HandlebarsTemplateDelegate>();

/**
 * Load a template file
 */
async function loadTemplate(templatePath: string): Promise<string> {
  return await safeReadFile(templatePath);
}

/**
 * Get default template based on includeInstructions setting
 */
export function getDefaultTemplatePath(includeInstructions: boolean): string {
  const templateName = includeInstructions ? 'skills-full.hbs' : 'skills-list.hbs';
  return path.join(__dirname, '../templates', templateName);
}

/**
 * Render a template with data
 */
export async function renderTemplate(templatePath: string, data: TemplateData): Promise<string> {
  // Check cache
  let template = templateCache.get(templatePath);

  if (!template) {
    const templateContent = await loadTemplate(templatePath);
    template = Handlebars.compile(templateContent);
    templateCache.set(templatePath, template);
  }

  return template(data);
}

/**
 * Render skills with config
 */
export async function renderSkills(skills: Skill[], config: Config, cwd?: string): Promise<string> {
  const templatePath = getDefaultTemplatePath(config.includeInstructions);
  const basePath = cwd || process.cwd();

  const data: TemplateData = {
    skills: skills.map((skill) => ({
      name: skill.name,
      description: skill.description,
      path: path.relative(basePath, path.join(skill.path, 'SKILL.md')),
      content: config.includeInstructions ? skill.content : undefined,
    })),
    lastSync: new Date().toISOString(),
    sources: config.skillDirectories,
  };

  return await renderTemplate(templatePath, data);
}
