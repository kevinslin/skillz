import chalk from 'chalk';
import ora, { Ora } from 'ora';
import Table from 'cli-table3';

let verboseMode = false;
let quietMode = false;

/**
 * Set verbose mode
 */
export function setVerbose(enabled: boolean): void {
  verboseMode = enabled;
}

/**
 * Set quiet mode
 */
export function setQuiet(enabled: boolean): void {
  quietMode = enabled;
}

/**
 * Log info message (blue)
 */
export function info(message: string): void {
  if (!quietMode) {
    console.log(chalk.blue('ℹ'), message);
  }
}

/**
 * Log success message (green)
 */
export function success(message: string): void {
  if (!quietMode) {
    console.log(chalk.green('✔'), message);
  }
}

/**
 * Log warning message (yellow)
 */
export function warning(message: string): void {
  if (!quietMode) {
    console.log(chalk.yellow('⚠'), message);
  }
}

/**
 * Log error message (red)
 */
export function error(message: string): void {
  console.error(chalk.red('✖'), message);
}

/**
 * Log debug message (gray, only in verbose mode)
 */
export function debug(message: string): void {
  if (verboseMode && !quietMode) {
    console.log(chalk.gray('•'), message);
  }
}

/**
 * Create a spinner
 */
export function spinner(text: string): Ora {
  return ora({
    text,
    color: 'cyan',
    spinner: 'dots',
  });
}

/**
 * Create a table
 */
export function createTable(head: string[]): Table.Table {
  return new Table({
    head: head.map((h) => chalk.cyan(h)),
    style: {
      head: [],
      border: ['gray'],
    },
  });
}

/**
 * Format file path for display
 */
export function formatPath(filePath: string): string {
  return chalk.dim(filePath);
}

/**
 * Format skill name for display
 */
export function formatSkillName(name: string): string {
  return chalk.bold(name);
}

/**
 * Format change type for display
 */
export function formatChangeType(type: 'new' | 'modified' | 'removed' | 'unchanged'): string {
  switch (type) {
    case 'new':
      return chalk.green('NEW');
    case 'modified':
      return chalk.yellow('MODIFIED');
    case 'removed':
      return chalk.red('REMOVED');
    case 'unchanged':
      return chalk.gray('UP-TO-DATE');
    default:
      return type;
  }
}
