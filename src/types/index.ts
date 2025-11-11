/**
 * Represents a Claude Agent Skill
 */
export interface Skill {
  name: string;
  description: string;
  path: string;
  content: string;
  frontmatter: Record<string, unknown>;
  lastModified: Date;
  hash: string;
}

/**
 * Configuration for skillz CLI
 */
export interface Config {
  version: string;
  preset?: 'agentsmd' | 'aider' | 'cursor' | 'claude';
  targets: string[];
  skillDirectories: string[];
  additionalSkills: string[];
  ignore: string[];
  includeInstructions: boolean;
  autoSync: boolean;
  skillsSectionName: string;
}

/**
 * Cache file structure for tracking skill state
 */
export interface CacheFile {
  version: string;
  lastSync: string;
  targetFile: string;
  skills: Record<string, SkillCacheEntry>;
}

/**
 * Individual skill cache entry
 */
export interface SkillCacheEntry {
  hash: string;
  path: string;
  lastModified: string;
}

/**
 * Managed section extracted from target file
 */
export interface ManagedSection {
  startLine: number;
  endLine: number;
  content: string;
  metadata: {
    lastSync: string;
    sources: string[];
  };
}

/**
 * Types of changes detected in skills
 */
export type ChangeType = 'new' | 'modified' | 'removed' | 'unchanged';

/**
 * Represents a change in a skill
 */
export interface SkillChange {
  skill: Skill | null;
  type: ChangeType;
  oldHash?: string;
  newHash?: string;
}

/**
 * Summary of changes detected
 */
export interface ChangeSummary {
  new: number;
  modified: number;
  removed: number;
  unchanged: number;
  total: number;
}

/**
 * Validation result for skills or config
 */
export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

/**
 * Validation error
 */
export interface ValidationError {
  field: string;
  message: string;
  value?: unknown;
}

/**
 * Validation warning
 */
export interface ValidationWarning {
  field: string;
  message: string;
  value?: unknown;
}

/**
 * Detected configuration during init
 */
export interface DetectedConfig {
  targets: string[];
  skillDirectories: string[];
}

/**
 * Target file content structure
 */
export interface TargetContent {
  fullContent: string;
  managedSection: ManagedSection | null;
  hasManualEdits: boolean;
}

/**
 * CLI result for testing
 */
export interface CliResult {
  exitCode: number;
  stdout: string;
  stderr: string;
}

/**
 * Template data for rendering skills
 */
export interface TemplateData {
  skills: Array<{
    name: string;
    description: string;
    path: string;
    content?: string;
  }>;
  lastSync: string;
  sources: string[];
  sectionName: string;
}
