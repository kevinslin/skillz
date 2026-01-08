import path from 'path';
import chokidar from 'chokidar';
import { loadConfig } from '../core/config.js';
import { ensureSkillzProjectCwd } from '../utils/workspace.js';
import { resolveHome, fileExists } from '../utils/fs-helpers.js';
import { info, success, warning, error } from '../utils/logger.js';
import { syncCommand } from './sync.js';

interface WatchOptions {
  interval?: string;
}

/**
 * Default polling interval for the watch command in milliseconds.
 */
const DEFAULT_POLL_INTERVAL_MS = 1000;
/**
 * Debounce delay for change bursts in milliseconds.
 */
const DEBOUNCE_MS = 2000;

/**
 * Watch configured skill directories and auto-sync on changes.
 */
export async function watchCommand(options: WatchOptions): Promise<void> {
  const { cwd } = await ensureSkillzProjectCwd();

  const config = await loadConfig(cwd);
  if (!config) {
    error('No configuration file found. Run `skillz init` first.');
    process.exit(1);
  }

  const interval = parseInterval(options.interval);
  if (!interval) {
    error(`Invalid interval: "${options.interval}". Must be a positive integer.`);
    process.exit(1);
  }

  const watchRoots = [...config.skillDirectories, ...config.additionalSkills];
  if (watchRoots.length === 0) {
    error('No skill directories configured to watch.');
    process.exit(1);
  }

  const resolvedRoots = await resolveWatchRoots(watchRoots, cwd);
  if (resolvedRoots.length === 0) {
    error('No existing skill directories to watch.');
    process.exit(1);
  }

  let debounceTimer: NodeJS.Timeout | null = null;
  let hasPendingChange = false;
  let isSyncing = false;
  let pendingSync = false;

  const watcher = chokidar.watch(resolvedRoots, {
    ignoreInitial: true,
    usePolling: true,
    interval,
  });

  watcher.on('ready', () => {
    const directoryLabel = resolvedRoots.length === 1 ? 'directory' : 'directories';
    info(`Watching ${resolvedRoots.length} ${directoryLabel} for changes.`);
    info(`Polling interval: ${interval}ms, debounce: ${DEBOUNCE_MS}ms.`);
    info('Press Ctrl+C to stop.');
  });

  watcher.on('all', (eventName, changedPath) => {
    const label = `${eventName} ${path.basename(changedPath)}`;
    scheduleSync(label);
  });

  watcher.on('error', (err) => {
    const message = err instanceof Error ? err.message : String(err);
    error(`Watcher error: ${message}`);
    process.exit(1);
  });

  const scheduleSync = (label: string) => {
    if (!hasPendingChange) {
      info(`Change detected (${label}). Waiting ${DEBOUNCE_MS}ms before syncing...`);
    }
    hasPendingChange = true;

    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }

    debounceTimer = setTimeout(() => {
      hasPendingChange = false;
      debounceTimer = null;
      void runSync();
    }, DEBOUNCE_MS);
  };

  const runSync = async () => {
    if (isSyncing) {
      pendingSync = true;
      return;
    }

    isSyncing = true;
    info('Syncing skills...');
    try {
      await syncCommand({});
      success('Sync complete');
    } catch (err) {
      error(`Sync failed: ${(err as Error).message}`);
      await watcher.close();
      process.exit(1);
    } finally {
      isSyncing = false;
    }

    if (pendingSync) {
      pendingSync = false;
      info('Changes detected during sync. Running another sync...');
      await runSync();
    }
  };

  const shutdown = async (signal: string) => {
    info(`Stopping watcher (${signal}).`);
    await watcher.close();
    process.exit(0);
  };

  process.on('SIGINT', () => {
    void shutdown('SIGINT');
  });

  process.on('SIGTERM', () => {
    void shutdown('SIGTERM');
  });
}

function parseInterval(value: string | undefined): number | null {
  if (!value) {
    return DEFAULT_POLL_INTERVAL_MS;
  }

  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return null;
  }

  return parsed;
}

async function resolveWatchRoots(roots: string[], cwd: string): Promise<string[]> {
  const resolved: string[] = [];
  const seen = new Set<string>();

  for (const root of roots) {
    const resolvedRoot = resolveWatchRoot(root, cwd);
    if (seen.has(resolvedRoot)) {
      continue;
    }
    seen.add(resolvedRoot);

    if (await fileExists(resolvedRoot)) {
      resolved.push(resolvedRoot);
    } else {
      warning(`Skill directory not found: ${resolvedRoot}`);
    }
  }

  return resolved;
}

function resolveWatchRoot(root: string, cwd: string): string {
  const expanded = resolveHome(root);
  if (path.isAbsolute(expanded)) {
    return expanded;
  }
  return path.resolve(cwd, expanded);
}
