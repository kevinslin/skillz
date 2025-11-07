import { spawn } from 'child_process';
import path from 'path';

export interface CliResult {
  exitCode: number;
  stdout: string;
  stderr: string;
}

export interface CliOptions {
  cwd?: string;
  env?: Record<string, string>;
}

export async function execCli(args: string[], options: CliOptions = {}): Promise<CliResult> {
  // Use relative path from project root
  const cliPath = path.join(process.cwd(), 'dist/cli.js');

  return new Promise((resolve, reject) => {
    const child = spawn('node', [cliPath, ...args], {
      cwd: options.cwd || process.cwd(),
      env: { ...process.env, ...options.env },
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    child.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    child.on('close', (code) => {
      resolve({
        exitCode: code || 0,
        stdout,
        stderr,
      });
    });

    child.on('error', (error) => {
      reject(error);
    });
  });
}
