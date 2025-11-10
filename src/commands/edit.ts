import { spawn } from 'child_process';
import { loadConfig } from '../core/config.js';
import { scanAllSkillDirectories } from '../core/skill-scanner.js';
import { error, info, success, spinner } from '../utils/logger.js';
import { syncCommand } from './sync.js';
import type { Config } from '../types/index.js';
import path from 'path';
import { promisify } from 'util';
import { exec } from 'child_process';

const execAsync = promisify(exec);

interface EditOptions {
  editor?: string;
}

/**
 * Check if a command exists in the system PATH
 */
async function commandExists(command: string): Promise<boolean> {
  try {
    const cmd = process.platform === 'win32' ? 'where' : 'which';
    await execAsync(`${cmd} ${command}`);
    return true;
  } catch {
    return false;
  }
}

/**
 * Normalize skill name for matching (case-insensitive, handle hyphens/underscores)
 */
function normalizeSkillName(name: string): string {
  return name.toLowerCase().replace(/[_\s]/g, '-');
}

/**
 * Determine which editor to use
 */
function resolveEditor(options: EditOptions, config: Config): string {
  // Priority: --editor flag > config.defaultEditor > $EDITOR > fallback to 'vi'
  return options.editor || config.defaultEditor || process.env.EDITOR || 'vi';
}

/**
 * Determine what to open based on the editor
 * VSCode/Cursor: open the skill folder
 * Others: open SKILL.md file
 */
function getPathToOpen(skillPath: string, editorCommand: string): string {
  const editorName = path.basename(editorCommand).toLowerCase();

  // For VS Code and Cursor, open the folder
  if (editorName.includes('code') || editorName.includes('cursor')) {
    return skillPath;
  }

  // For other editors, open the SKILL.md file
  return path.join(skillPath, 'SKILL.md');
}

/**
 * Spawn editor and wait for it to close
 */
function openEditor(editorCommand: string, filePath: string): Promise<number> {
  return new Promise((resolve, reject) => {
    const editorProcess = spawn(editorCommand, [filePath], {
      stdio: 'inherit',
      shell: true,
    });

    editorProcess.on('exit', (code) => {
      resolve(code || 0);
    });

    editorProcess.on('error', (err) => {
      reject(err);
    });
  });
}

/**
 * Edit command implementation
 */
export async function editCommand(skillName: string, options: EditOptions): Promise<void> {
  const cwd = process.cwd();

  // Load configuration
  const config = await loadConfig(cwd);
  if (!config) {
    error('No configuration file found. Run `skillz init` first.');
    process.exit(1);
  }

  // Scan skills
  const spin = spinner('Scanning skill directories...').start();
  const skills = await scanAllSkillDirectories(config);
  spin.succeed(`Found ${skills.length} skill(s)`);

  if (skills.length === 0) {
    error('No skills found. Make sure your skill directories contain SKILL.md files.');
    process.exit(1);
  }

  // Find the skill (case-insensitive, handle hyphens/underscores)
  const normalizedInput = normalizeSkillName(skillName);
  const matchingSkill = skills.find((skill) => normalizeSkillName(skill.name) === normalizedInput);

  if (!matchingSkill) {
    error(`Skill "${skillName}" not found.`);
    info('Available skills:');
    skills.forEach((skill) => {
      info(`  - ${skill.name}`);
    });
    process.exit(1);
  }

  // Resolve which editor to use
  const editorCommand = resolveEditor(options, config);

  // Validate that the editor exists
  const editorName = editorCommand.split(' ')[0]; // Handle cases like "code --wait"
  const editorExists = await commandExists(editorName);

  if (!editorExists) {
    error(`Editor "${editorName}" not found.`);
    error('Make sure the editor is installed and available in your PATH.');
    error(
      'You can set a default editor in skillz.json or use the --editor flag to specify a different editor.'
    );
    process.exit(1);
  }

  // Determine what to open (folder or SKILL.md file)
  const pathToOpen = getPathToOpen(matchingSkill.path, editorCommand);

  info(`Opening ${matchingSkill.name} in ${editorName}...`);

  try {
    // Open the editor and wait for it to close
    const exitCode = await openEditor(editorCommand, pathToOpen);

    if (exitCode !== 0) {
      error(`Editor exited with code ${exitCode}`);
      process.exit(exitCode);
    }

    success('Editor closed successfully');

    // Auto-sync after edit if configured
    if (config.autoSyncAfterEdit !== false) {
      // Default to true if not set
      info('Running sync...');
      await syncCommand({ verbose: false });
    }
  } catch (err) {
    error(`Failed to open editor: ${(err as Error).message}`);
    process.exit(1);
  }
}
