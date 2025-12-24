import path from 'path';
import { loadConfig } from '../core/config.js';
import { scanAllSkillDirectories } from '../core/skill-scanner.js';
import { info, error } from '../utils/logger.js';
import { ensureSkillzProjectCwd } from '../utils/workspace.js';

export async function infoCommand(): Promise<void> {
  const { cwd } = await ensureSkillzProjectCwd();

  // Load configuration
  const config = await loadConfig(cwd);
  if (!config) {
    error('No configuration file found. Run `skillz init` first.');
    process.exit(1);
  }

  // Scan skills
  const skills = await scanAllSkillDirectories(config);

  // Display information
  const configPath = path.join(cwd, 'skillz.json');

  console.log('');
  info(`Configuration: ${configPath}`);
  console.log('');

  if (config.targets.length === 0) {
    info('Targets: (none)');
  } else {
    info(`Targets (${config.targets.length}):`);
    for (const target of config.targets) {
      console.log(`  - ${target.name}`);
    }
  }

  console.log('');
  info(`Skills: ${skills.length}`);
  console.log('');
}
