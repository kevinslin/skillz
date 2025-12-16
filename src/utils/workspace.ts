import path from 'path';
import { fileExists } from './fs-helpers.js';
import { debug } from './logger.js';

const CONFIG_FILE = 'skillz.json';

/**
 * Walk up from a starting directory until a skillz config is found.
 */
export async function findSkillzProjectRoot(startDir: string): Promise<string | null> {
  let currentDir = path.resolve(startDir);

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const configPath = path.join(currentDir, CONFIG_FILE);
    if (await fileExists(configPath)) {
      return currentDir;
    }

    const parentDir = path.dirname(currentDir);
    if (parentDir === currentDir) {
      return null;
    }

    currentDir = parentDir;
  }
}

interface EnsureCwdResult {
  cwd: string;
  foundConfig: boolean;
  changed: boolean;
}

/**
 * Ensure the process is running from the directory that contains skillz.json.
 * If no config is found while walking up the tree, the original cwd is preserved.
 */
export async function ensureSkillzProjectCwd(startDir = process.cwd()): Promise<EnsureCwdResult> {
  const root = await findSkillzProjectRoot(startDir);
  debug(`found root ${root}`);

  if (root) {
    const changed = root !== path.resolve(startDir);
    if (changed) {
      process.chdir(root);
    }
    return { cwd: root, foundConfig: true, changed };
  }

  return { cwd: startDir, foundConfig: false, changed: false };
}
