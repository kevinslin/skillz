#!/usr/bin/env node

import { Command } from 'commander';
import { initCommand } from './commands/init.js';
import { syncCommand } from './commands/sync.js';
import { listCommand } from './commands/list.js';
import { createCommand } from './commands/create.js';

// Types for command options
type InitOptions = {
  preset?: string;
  target?: string;
  additionalSkills?: string[];
  globalSkills?: boolean;
  sync?: boolean;
  template?: string;
  includeInstructions?: boolean;
};

type SyncOptions = {
  dryRun?: boolean;
  force?: boolean;
  verbose?: boolean;
  only?: string[];
};

type ListOptions = {
  format?: 'table' | 'json' | 'markdown';
  syncedOnly?: boolean;
  unsyncedOnly?: boolean;
};

type CreateOptions = {
  path?: string;
  skillVersion?: string;
  interactive?: boolean;
};

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
  .action(async (options: InitOptions) => {
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
  .action(async (options: SyncOptions) => {
    try {
      await syncCommand(options);
    } catch (error) {
      console.error('Error:', (error as Error).message);
      process.exit(1);
    }
  });

// List command
program
  .command('list')
  .description('Display available skills')
  .option('--format <type>', 'Output format: table, json, or markdown', 'table')
  .option('--synced-only', 'Show only skills that have been synced')
  .option('--unsynced-only', 'Show only skills that have not been synced')
  .action(async (options: ListOptions) => {
    try {
      await listCommand(options);
    } catch (error) {
      console.error('Error:', (error as Error).message);
      process.exit(1);
    }
  });

// Create command
program
  .command('create [name] [description]')
  .description('Create a new skill with template')
  .option('-i, --interactive', 'Interactive mode with guided prompts (recommended)')
  .option('--path <directory>', 'Custom directory path (overrides config)')
  .option('--skill-version <semver>', 'Skill version (default: 0.0.0)')
  .action(
    async (name: string | undefined, description: string | undefined, options: CreateOptions) => {
      try {
        await createCommand(name, description, options);
      } catch (error) {
        console.error('Error:', (error as Error).message);
        process.exit(1);
      }
    }
  );

program.parse();

// Helper function to collect multiple values
function collect(value: string, previous: string[]): string[] {
  return previous.concat([value]);
}
