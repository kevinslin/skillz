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
 * Get default template path
 */
export function getDefaultTemplatePath(): string {
  return path.join(__dirname, '../templates', 'skills-list.hbs');
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
  const basePath = cwd || process.cwd();

  // Use custom template if specified, otherwise use default
  let templatePath = getDefaultTemplatePath();
  if (config.customTemplate) {
    // Resolve custom template path relative to cwd
    templatePath = path.isAbsolute(config.customTemplate)
      ? config.customTemplate
      : path.join(basePath, config.customTemplate);
  }

  const data: TemplateData = {
    skills: skills.map((skill) => ({
      name: skill.name,
      description: skill.description,
      path: path.resolve(skill.path, 'SKILL.md'),
    })),
    lastSync: new Date().toISOString(),
    sources: config.skillDirectories,
    sectionName: config.skillsSectionName,
  };

  return await renderTemplate(templatePath, data);
}
