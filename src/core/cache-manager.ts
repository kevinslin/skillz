import path from 'path';
import type { CacheFile, Skill } from '../types/index.js';
import { safeReadFile, safeWriteFile, fileExists } from '../utils/fs-helpers.js';
import { validateCacheFile } from '../utils/validation.js';

const CACHE_FILE = '.skillz-cache.json';

/**
 * Load cache file
 */
export async function loadCache(cwd: string): Promise<CacheFile | null> {
  const cachePath = path.join(cwd, CACHE_FILE);

  if (!(await fileExists(cachePath))) {
    return null;
  }

  const content = await safeReadFile(cachePath);
  if (!content) {
    return null;
  }

  try {
    const cache = JSON.parse(content);
    const validation = validateCacheFile(cache);

    if (!validation.success) {
      // Return empty cache if invalid
      return null;
    }

    return cache as CacheFile;
  } catch {
    return null;
  }
}

/**
 * Save cache file
 */
export async function saveCache(cache: CacheFile, cwd: string): Promise<void> {
  const validation = validateCacheFile(cache);

  if (!validation.success) {
    throw new Error(`Invalid cache: ${JSON.stringify(validation.error.errors)}`);
  }

  const cachePath = path.join(cwd, CACHE_FILE);
  const content = JSON.stringify(cache, null, 2);
  await safeWriteFile(cachePath, content);
}

/**
 * Update cache with skills
 */
export function updateCache(skills: Skill[], targetFile: string): CacheFile {
  const cache: CacheFile = {
    version: '1.0',
    lastSync: new Date().toISOString(),
    targetFile,
    skills: {},
  };

  for (const skill of skills) {
    cache.skills[skill.name] = {
      hash: skill.hash,
      path: skill.path,
      lastModified: skill.lastModified.toISOString(),
    };
  }

  return cache;
}

/**
 * Get empty cache
 */
export function getEmptyCache(targetFile: string): CacheFile {
  return {
    version: '1.0',
    lastSync: new Date().toISOString(),
    targetFile,
    skills: {},
  };
}
