import readline from 'readline';
import { spawn } from 'child_process';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';

/**
 * Ask a yes/no question and return boolean
 */
export async function confirm(question: string, defaultValue = true): Promise<boolean> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const defaultText = defaultValue ? 'Y/n' : 'y/N';
  const answer = await new Promise<string>((resolve) => {
    rl.question(`${question} [${defaultText}]: `, (answer) => {
      rl.close();
      resolve(answer);
    });
  });

  if (answer === '') {
    return defaultValue;
  }

  return answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes';
}

/**
 * Ask a question and return the answer
 */
export async function question(query: string, defaultValue?: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const defaultText = defaultValue ? ` [${defaultValue}]` : '';
  const answer = await new Promise<string>((resolve) => {
    rl.question(`${query}${defaultText}: `, (answer) => {
      rl.close();
      resolve(answer);
    });
  });

  return answer || defaultValue || '';
}

/**
 * Present a menu and return the selected option
 */
export async function select(
  message: string,
  options: { label: string; value: string }[]
): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  console.log(message);
  options.forEach((opt, idx) => {
    console.log(`  ${idx + 1}. ${opt.label}`);
  });

  const answer = await new Promise<string>((resolve) => {
    rl.question(`Select option (1-${options.length}): `, (answer) => {
      rl.close();
      resolve(answer);
    });
  });

  const index = parseInt(answer, 10) - 1;
  if (index >= 0 && index < options.length) {
    return options[index].value;
  }

  return options[0].value;
}

/**
 * Open text in $EDITOR and return edited content
 */
export async function editInEditor(initialContent: string): Promise<string> {
  const editor = process.env.EDITOR || process.env.VISUAL || 'nano';
  const tmpFile = path.join(os.tmpdir(), `skillz-edit-${Date.now()}.json`);

  // Write initial content to temp file
  await fs.writeFile(tmpFile, initialContent, 'utf-8');

  // Open editor
  await new Promise<void>((resolve, reject) => {
    const child = spawn(editor, [tmpFile], {
      stdio: 'inherit',
    });

    child.on('exit', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Editor exited with code ${code}`));
      }
    });

    child.on('error', (error) => {
      reject(error);
    });
  });

  // Read edited content
  const editedContent = await fs.readFile(tmpFile, 'utf-8');

  // Clean up temp file
  await fs.unlink(tmpFile);

  return editedContent;
}

/**
 * Check if running in an interactive terminal
 */
export function isInteractive(): boolean {
  return process.stdin.isTTY === true;
}
