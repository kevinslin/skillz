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
 * Compute skill path based on path style
 */
function computeSkillPath(
  skillPath: string,
  targetPath: string,
  pathStyle: 'relative' | 'absolute',
  cwd: string
): string {
  const skillFilePath = path.resolve(skillPath, 'SKILL.md');

  if (pathStyle === 'absolute') {
    return skillFilePath;
  }

  // Relative mode: compute path from target file directory to skill file
  const targetDir = path.dirname(
    path.isAbsolute(targetPath) ? targetPath : path.join(cwd, targetPath)
  );

  // Check for cross-drive scenario on Windows
  if (process.platform === 'win32') {
    const targetDrive = path.parse(targetDir).root;
    const skillDrive = path.parse(skillFilePath).root;

    if (targetDrive !== skillDrive) {
      // Fall back to absolute path for cross-drive references
      console.warn(
        `Warning: Skill "${skillPath}" and target "${targetPath}" are on different drives. ` +
          `Using absolute path instead of relative.`
      );
      return skillFilePath;
    }
  }

  return path.relative(targetDir, skillFilePath);
}

/**
 * Render skills with config
 */
export async function renderSkills(
  skills: Skill[],
  config: Config,
  cwd?: string,
  targetPath?: string
): Promise<string> {
  const basePath = cwd || process.cwd();
  const pathStyle = config.pathStyle || 'relative';

  // Use custom template if specified, otherwise use default
  let templatePath = getDefaultTemplatePath();
  if (config.customTemplate) {
    // Resolve custom template path relative to cwd
    templatePath = path.isAbsolute(config.customTemplate)
      ? config.customTemplate
      : path.join(basePath, config.customTemplate);
  }

  const data: TemplateData = {
    skills: skills.map((skill) => {
      // If targetPath is provided, compute relative/absolute path
      // Otherwise fall back to absolute (for backward compatibility)
      const skillPath = targetPath
        ? computeSkillPath(skill.path, targetPath, pathStyle, basePath)
        : path.resolve(skill.path, 'SKILL.md');

      return {
        name: skill.name,
        description: skill.description,
        path: skillPath,
      };
    }),
    lastSync: new Date().toISOString(),
    sources: config.skillDirectories,
    sectionName: config.skillsSectionName,
  };

  return await renderTemplate(templatePath, data);
}
