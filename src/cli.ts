#!/usr/bin/env node

import { Command } from 'commander';
import { initCommand } from './commands/init.js';
import { syncCommand } from './commands/sync.js';

const program = new Command();

program
  .name('skillz')
  .description('A CLI tool to sync Claude Agent Skills across different LLM tools')
  .version('0.1.0');

// Init command
program
  .command('init')
  .description('Initialize skillz in the current directory')
  .option('--preset <name>', 'Use a preset configuration (agentsmd, aider)')
  .option('--target <file>', 'Specify custom target file path')
  .option('--additional-skills <path>', 'Add additional skill directories', collect, [])
  .option('--global-skills', 'Include global ~/.claude/skills/ directory')
  .option('--no-sync', 'Skip initial sync after initialization')
  .option('--template <path>', 'Custom template for skill formatting')
  .option('--include-instructions', 'Include full skill instructions')
  .action(async (options) => {
    try {
      await initCommand(options);
    } catch (error) {
      console.error('Error:', (error as Error).message);
      process.exit(1);
    }
  });

// Sync command
program
  .command('sync')
  .description('Synchronize skills from source directories to target files')
  .option('--dry-run', 'Show what would be synced without making changes')
  .option('--force', 'Overwrite target even if no changes detected')
  .option('--verbose', 'Show detailed operation logs')
  .option('--only <skill-name>', 'Sync only specific skill(s)', collect, [])
  .action(async (options) => {
    try {
      await syncCommand(options);
    } catch (error) {
      console.error('Error:', (error as Error).message);
      process.exit(1);
    }
  });

program.parse();

// Helper function to collect multiple values
function collect(value: string, previous: string[]): string[] {
  return previous.concat([value]);
}
