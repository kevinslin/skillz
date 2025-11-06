import type { Skill, Config, ManagedSection, TargetContent } from '../types/index.js';
import { safeReadFile, safeWriteFile } from '../utils/fs-helpers.js';
import { renderSkills } from './template-engine.js';

const BEGIN_MARKER = '<!-- BEGIN SKILLZ MANAGED SECTION - DO NOT EDIT MANUALLY -->';
const END_MARKER = '<!-- END SKILLZ MANAGED SECTION -->';

/**
 * Extract managed section from content
 */
export function extractManagedSection(content: string): ManagedSection | null {
  const beginIndex = content.indexOf(BEGIN_MARKER);
  const endIndex = content.indexOf(END_MARKER);

  if (beginIndex === -1 || endIndex === -1) {
    return null;
  }

  const sectionContent = content.substring(beginIndex, endIndex + END_MARKER.length);

  // Extract metadata from HTML comments
  const lastSyncMatch = sectionContent.match(/<!-- Last synced: (.+?) -->/);
  const sourcesMatch = sectionContent.match(/<!-- Source: (.+?) -->/);

  return {
    startLine: content.substring(0, beginIndex).split('\n').length - 1,
    endLine: content.substring(0, endIndex + END_MARKER.length).split('\n').length,
    content: sectionContent,
    metadata: {
      lastSync: lastSyncMatch ? lastSyncMatch[1] : '',
      sources: sourcesMatch ? sourcesMatch[1].split(', ') : [],
    },
  };
}

/**
 * Replace managed section in content
 */
export function replaceManagedSection(content: string, newSection: string): string {
  const managedSection = extractManagedSection(content);

  if (!managedSection) {
    // No existing section, append to end
    return content.trim() + '\n\n' + newSection + '\n';
  }

  // Replace existing section
  const before = content.substring(0, content.indexOf(BEGIN_MARKER));
  const after = content.substring(content.indexOf(END_MARKER) + END_MARKER.length);

  return before + newSection + after;
}

/**
 * Create managed section
 */
export async function createManagedSection(skills: Skill[], config: Config, cwd: string): Promise<string> {
  const lastSync = new Date().toISOString();
  const sources = [...config.skillDirectories, ...config.additionalSkills].join(', ');

  const skillsContent = await renderSkills(skills, config, cwd);

  return `${BEGIN_MARKER}
<!-- Last synced: ${lastSync} -->
<!-- Source: ${sources} -->

${skillsContent}
${END_MARKER}`;
}

/**
 * Read target file
 */
export async function readTargetFile(filePath: string): Promise<TargetContent> {
  const fullContent = await safeReadFile(filePath);
  const managedSection = fullContent ? extractManagedSection(fullContent) : null;

  return {
    fullContent,
    managedSection,
    hasManualEdits: false, // TODO: Implement manual edit detection
  };
}

/**
 * Write target file
 */
export async function writeTargetFile(
  filePath: string,
  skills: Skill[],
  config: Config,
  cwd: string
): Promise<void> {
  const targetContent = await readTargetFile(filePath);
  const newSection = await createManagedSection(skills, config, cwd);
  const updatedContent = replaceManagedSection(targetContent.fullContent, newSection);

  await safeWriteFile(filePath, updatedContent);
}
