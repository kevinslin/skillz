import path from 'path';
import { fileExists } from '../utils/fs-helpers.js';
import type { Target } from '../types/index.js';

/**
 * Represents a detected development environment
 */
export interface DetectedEnvironment {
  id: string;
  name: string;
  description: string;
  preset: 'agentsmd' | 'aider' | 'cursor' | 'claude';
  markers: string[];
  targets: Target[];
  skillDirectories: string[];
}

/**
 * All supported development environments
 */
export const ENVIRONMENTS: DetectedEnvironment[] = [
  {
    id: 'codex',
    name: 'Codex',
    description: 'Codex-style AGENTS.md workspace',
    preset: 'agentsmd',
    markers: ['AGENTS.md'],
    targets: [{ destination: 'AGENTS.md' }],
    skillDirectories: ['.claude/skills'],
  },
  {
    id: 'cursor',
    name: 'Cursor',
    description: 'Cursor IDE with .cursor/rules',
    preset: 'cursor',
    markers: ['.cursor/rules'],
    targets: [{ destination: '.cursor/rules/skills.mdc' }],
    skillDirectories: ['.claude/skills'],
  },
  {
    id: 'claude',
    name: 'Claude Code',
    description: 'Claude Code with CLAUDE.md',
    preset: 'claude',
    markers: ['CLAUDE.md', '.claude/CLAUDE.md'],
    targets: [{ destination: 'CLAUDE.md' }],
    skillDirectories: ['.claude/skills'],
  },
  {
    id: 'aider',
    name: 'Aider',
    description: 'Aider conventions file',
    preset: 'aider',
    markers: ['.aider/conventions.md'],
    targets: [{ destination: '.aider/conventions.md' }],
    skillDirectories: ['.claude/skills'],
  },
];

/**
 * Detect all matching environments in the current directory
 */
export async function detectEnvironments(cwd: string): Promise<DetectedEnvironment[]> {
  const detected: DetectedEnvironment[] = [];

  for (const env of ENVIRONMENTS) {
    const hasMarker = await hasAnyMarker(cwd, env.markers);
    if (hasMarker) {
      detected.push(env);
    }
  }

  return detected;
}

/**
 * Check if any marker file exists in the directory
 */
async function hasAnyMarker(cwd: string, markers: string[]): Promise<boolean> {
  for (const marker of markers) {
    const markerPath = path.join(cwd, marker);
    if (await fileExists(markerPath)) {
      return true;
    }
  }
  return false;
}

/**
 * Get the primary detected environment (first match)
 */
export async function detectPrimaryEnvironment(cwd: string): Promise<DetectedEnvironment | null> {
  const detected = await detectEnvironments(cwd);
  return detected.length > 0 ? detected[0] : null;
}

/**
 * Get environment by preset name
 */
export function getEnvironmentByPreset(preset: string): DetectedEnvironment | undefined {
  return ENVIRONMENTS.find((env) => env.preset === preset);
}
