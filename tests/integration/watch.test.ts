import { spawn, ChildProcessWithoutNullStreams } from 'child_process';
import path from 'path';
import fs from 'fs-extra';
import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { createMockWorkspace, MockWorkspace } from '../helpers/workspace.js';
import { execCli } from '../helpers/cli.js';

const cliPath = path.join(process.cwd(), 'dist/cli.js');
/**
 * Timeout for the watch integration test suite.
 */
const WATCH_TEST_TIMEOUT_MS = 20000;
/**
 * Polling interval used to validate the --interval option.
 */
const WATCH_INTERVAL_MS = 500;
/**
 * Polling interval used for rapid change debounce testing.
 */
const FAST_WATCH_INTERVAL_MS = 100;
/**
 * Default timeout for waiting on watcher output.
 */
const DEFAULT_WAIT_TIMEOUT_MS = 5000;
/**
 * Extended timeout for waiting on a sync to complete.
 */
const SYNC_WAIT_TIMEOUT_MS = 10000;
/**
 * Sleep interval for polling watcher output in tests.
 */
const OUTPUT_POLL_INTERVAL_MS = 50;
/**
 * Additional settle time to ensure debounced syncs have either fired or expired.
 */
const WATCH_SETTLE_MS = 2500;

interface WatchProcess {
  child: ChildProcessWithoutNullStreams;
  output: { stdout: string; stderr: string };
  waitForOutput: (
    matcher: (stdout: string, stderr: string) => boolean,
    timeoutMs?: number
  ) => Promise<void>;
  stop: () => Promise<number>;
}

describe('watch command', () => {
  let workspace: MockWorkspace;

  beforeEach(async () => {
    jest.setTimeout(WATCH_TEST_TIMEOUT_MS);
    workspace = await createMockWorkspace();
  });

  afterEach(async () => {
    await workspace.cleanup();
  });

  it('should error when configuration is missing', async () => {
    const result = await execCli(['watch'], {
      cwd: workspace.root,
    });

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain('No configuration file found');
  });

  it('should honor --interval option', async () => {
    await execCli(['init', '--preset', 'agentsmd', '--no-sync'], {
      cwd: workspace.root,
    });

    const watchProcess = spawnWatch(
      ['watch', '--interval', WATCH_INTERVAL_MS.toString()],
      workspace.root
    );

    await watchProcess.waitForOutput((stdout) => stdout.includes('Polling interval: 500ms'));

    const exitCode = await watchProcess.stop();
    expect(exitCode).toBe(0);
  });

  it('should debounce rapid changes into a single sync', async () => {
    await execCli(['init', '--preset', 'agentsmd', '--no-sync'], {
      cwd: workspace.root,
    });

    const watchProcess = spawnWatch(
      ['watch', '--interval', FAST_WATCH_INTERVAL_MS.toString()],
      workspace.root
    );
    await watchProcess.waitForOutput((stdout) => stdout.includes('Watching'));

    const skillPath = path.join(workspace.skillsDir, 'python-expert', 'SKILL.md');
    const original = await fs.readFile(skillPath, 'utf-8');
    await fs.writeFile(skillPath, `${original}\n\n# Change one\n`);
    await fs.writeFile(skillPath, `${original}\n\n# Change two\n`);

    await watchProcess.waitForOutput(
      (stdout) => stdout.includes('Sync complete'),
      SYNC_WAIT_TIMEOUT_MS
    );

    const syncCount = countOccurrences(watchProcess.output.stdout, 'Syncing skills...');
    expect(syncCount).toBe(1);

    const exitCode = await watchProcess.stop();
    expect(exitCode).toBe(0);
  });

  it(
    'should sync on skillz.json changes and refresh watched directories',
    async () => {
      await execCli(['init', '--preset', 'agentsmd', '--no-sync'], {
        cwd: workspace.root,
      });

      const extraSkillsDir = path.join(workspace.root, 'extra-skills');
      const extraSkillDir = path.join(extraSkillsDir, 'config-added-skill');
      await fs.ensureDir(extraSkillDir);
      await fs.writeFile(
        path.join(extraSkillDir, 'SKILL.md'),
        `---
name: config-added-skill
description: Added through skillz.json updates
---

# Config Added Skill

This skill is used to validate config-driven watcher refreshes.
`
      );

      const watchProcess = spawnWatch(
        ['watch', '--interval', FAST_WATCH_INTERVAL_MS.toString()],
        workspace.root
      );
      await watchProcess.waitForOutput((stdout) => stdout.includes('Watching'));

      const configPath = path.join(workspace.root, 'skillz.json');
      const config = (await fs.readJson(configPath)) as Record<string, unknown>;
      config.additionalSkills = ['extra-skills'];
      await fs.writeJson(configPath, config, { spaces: 2 });

      await watchProcess.waitForOutput(
        (stdout) => countOccurrences(stdout, 'Sync complete') >= 1,
        SYNC_WAIT_TIMEOUT_MS
      );

      await sleep(WATCH_SETTLE_MS);
      const syncCountAfterConfig = countOccurrences(
        watchProcess.output.stdout,
        'Syncing skills...'
      );

      const extraSkillPath = path.join(extraSkillDir, 'SKILL.md');
      const original = await fs.readFile(extraSkillPath, 'utf-8');
      await fs.writeFile(extraSkillPath, `${original}\n## Updated Content\n`);

      await watchProcess.waitForOutput(
        (stdout) => countOccurrences(stdout, 'Syncing skills...') > syncCountAfterConfig,
        SYNC_WAIT_TIMEOUT_MS
      );

      const syncedExtraSkillPath = path.join(
        workspace.root,
        '.skills',
        'config-added-skill',
        'SKILL.md'
      );
      await expect(fs.pathExists(syncedExtraSkillPath)).resolves.toBe(true);

      config.additionalSkills = [];
      await fs.writeJson(configPath, config, { spaces: 2 });

      const syncCountAfterExtraSkillEdit = countOccurrences(
        watchProcess.output.stdout,
        'Syncing skills...'
      );
      await watchProcess.waitForOutput(
        (stdout) => countOccurrences(stdout, 'Syncing skills...') > syncCountAfterExtraSkillEdit,
        SYNC_WAIT_TIMEOUT_MS
      );

      await sleep(WATCH_SETTLE_MS);
      await expect(fs.pathExists(path.dirname(syncedExtraSkillPath))).resolves.toBe(false);

      const syncCountAfterRemoval = countOccurrences(
        watchProcess.output.stdout,
        'Syncing skills...'
      );
      await fs.writeFile(extraSkillPath, `${original}\n## Updated Content\n## Removed Content\n`);
      await sleep(WATCH_SETTLE_MS);
      expect(countOccurrences(watchProcess.output.stdout, 'Syncing skills...')).toBe(
        syncCountAfterRemoval
      );

      const exitCode = await watchProcess.stop();
      expect(exitCode).toBe(0);
    },
    WATCH_TEST_TIMEOUT_MS
  );
});

function spawnWatch(args: string[], cwd: string): WatchProcess {
  const output = { stdout: '', stderr: '' };

  const child = spawn('node', [cliPath, ...args], {
    cwd,
    env: { ...process.env, NO_COLOR: '1' },
  });

  child.stdout.on('data', (data: Buffer) => {
    output.stdout += data.toString();
  });

  child.stderr.on('data', (data: Buffer) => {
    output.stderr += data.toString();
  });

  const waitForOutput = (
    matcher: (stdout: string, stderr: string) => boolean,
    timeoutMs = DEFAULT_WAIT_TIMEOUT_MS
  ) =>
    new Promise<void>((resolve, reject) => {
      const start = Date.now();
      const timer = setInterval(() => {
        if (matcher(output.stdout, output.stderr)) {
          clearInterval(timer);
          resolve();
          return;
        }

        if (Date.now() - start > timeoutMs) {
          clearInterval(timer);
          reject(new Error('Timed out waiting for watch output'));
        }
      }, OUTPUT_POLL_INTERVAL_MS);
    });

  const stop = () =>
    new Promise<number>((resolve) => {
      if (child.exitCode !== null) {
        resolve(child.exitCode);
        return;
      }

      child.once('close', (code) => {
        resolve(code ?? 0);
      });

      child.kill('SIGINT');
    });

  return { child, output, waitForOutput, stop };
}

function countOccurrences(text: string, needle: string): number {
  if (!text) {
    return 0;
  }
  return text.split(needle).length - 1;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
