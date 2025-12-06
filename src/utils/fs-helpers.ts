import fs from 'fs/promises';
import path from 'path';
import { constants } from 'fs';
import os from 'os';

/**
 * Safely read a file, returning empty string if it doesn't exist
 */
export async function safeReadFile(filePath: string): Promise<string> {
  const resolvedFilePath = resolveHome(filePath);
  try {
    return await fs.readFile(resolvedFilePath, 'utf-8');
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return '';
    }
    if ((error as NodeJS.ErrnoException).code === 'EACCES') {
      throw new Error(`Permission denied reading file: ${resolvedFilePath}`);
    }
    throw error;
  }
}

/**
 * Safely write a file with atomic operation
 */
export async function safeWriteFile(filePath: string, content: string): Promise<void> {
  const resolvedFilePath = resolveHome(filePath);
  try {
    // Ensure parent directory exists
    const dir = path.dirname(resolvedFilePath);
    await ensureDir(dir);

    // Write to temp file first
    const tempPath = `${resolvedFilePath}.tmp`;
    await fs.writeFile(tempPath, content, 'utf-8');

    // Atomic rename
    await fs.rename(tempPath, resolvedFilePath);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'EACCES') {
      throw new Error(`Permission denied writing file: ${resolvedFilePath}`);
    }
    throw error;
  }
}

/**
 * Check if a file exists
 */
export async function fileExists(filePath: string): Promise<boolean> {
  const resolvedFilePath = resolveHome(filePath);
  try {
    await fs.access(resolvedFilePath, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

/**
 * Ensure a directory exists, creating it if necessary
 */
export async function ensureDir(dirPath: string): Promise<void> {
  try {
    const resolvedDirPath = resolveHome(dirPath);
    await fs.mkdir(resolvedDirPath, { recursive: true });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'EEXIST') {
      throw error;
    }
  }
}

/**
 * Resolve home directory (~) in path
 */
export function resolveHome(filePath: string): string {
  if (filePath.startsWith('~/') || filePath === '~') {
    return path.join(os.homedir(), filePath.slice(1));
  }
  return filePath;
}

/**
 * Check if a directory contains a SKILL.md file
 */
export async function isSkillDirectory(dirPath: string): Promise<boolean> {
  const resolvedDirPath = resolveHome(dirPath);
  const skillFile = path.join(resolvedDirPath, 'SKILL.md');
  return fileExists(skillFile);
}

/**
 * Read all directories in a path
 */
export async function readDirectories(dirPath: string): Promise<string[]> {
  try {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });
    return entries
      .filter((entry) => entry.isDirectory())
      .map((entry) => path.join(dirPath, entry.name));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return [];
    }
    throw error;
  }
}

/**
 * Get file stats
 */
export async function getFileStats(filePath: string) {
  try {
    return await fs.stat(filePath);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return null;
    }
    throw error;
  }
}

/**
 * Copy file
 */
export async function copyFile(src: string, dest: string): Promise<void> {
  await fs.copyFile(src, dest);
}

/**
 * Delete file
 */
export async function deleteFile(filePath: string): Promise<void> {
  try {
    await fs.unlink(filePath);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
      throw error;
    }
  }
}
